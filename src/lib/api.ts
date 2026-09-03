import type { DashboardOut } from "./types";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const isBrowser = typeof window !== "undefined";
const hostname = isBrowser ? window.location.hostname : "127.0.0.1";
const isIpv4Address = (value: string) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value);
const isPrivateIpv4Address = (value: string) =>
  /^10(?:\.\d{1,3}){3}$/.test(value) ||
  /^192\.168(?:\.\d{1,3}){2}$/.test(value) ||
  /^172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/.test(value);
const isLoopbackHost = hostname === "localhost" || hostname === "127.0.0.1";
const isLanHost =
  isLoopbackHost ||
  isPrivateIpv4Address(hostname) ||
  hostname.endsWith(".local") ||
  (/^[a-z0-9-]+$/i.test(hostname) && !isIpv4Address(hostname));
const rawApiBase =
  process.env.NEXT_PUBLIC_API_BASE ?? process.env.NEXT_PUBLIC_API_URL ?? "";
const normalizedApiBase = rawApiBase.trim().replace(/\/+$/, "");
const isDigitalOceanAppHost = hostname.endsWith(".ondigitalocean.app");
const fallbackApiBase = isLanHost
  ? `http://${hostname}:8000`
  : isDigitalOceanAppHost
  ? `${isBrowser ? window.location.origin : `https://${hostname}`}/api`
  : `https://api.${hostname.replace(/^www\\./, "")}`;
export const API_BASE =
  normalizedApiBase.length > 0 ? normalizedApiBase : fallbackApiBase;

type ApiFetchOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
  retryAuth?: boolean;
  suppressAuthRedirect?: boolean;
  timeoutMs?: number;
};

let authRedirectInProgress = false;
let authRefreshInFlight: Promise<boolean> | null = null;
let sessionUnauthorized = false;
let isRefreshing = false;
let refreshQueue: Array<(failed: boolean) => void> = [];
const GET_DEDUPE_TTL_MS = 4_000;
const inFlightGetRequests = new Map<string, Promise<unknown>>();
const recentGetResponses = new Map<string, { expiresAt: number; value: unknown }>();

export function clearGetRequestState() {
  inFlightGetRequests.clear();
  recentGetResponses.clear();
}

export function resetAuthClientState(): void {
  sessionUnauthorized = false;
  authRedirectInProgress = false;
  isRefreshing = false;
  refreshQueue = [];
  clearGetRequestState();
}

function buildGetRequestKey(url: string, headers: Headers): string {
  const actAs = headers.get("x-user-id")?.trim() ?? "";
  return `GET ${url}::actAs=${actAs}`;
}

async function tryRefreshSession(): Promise<boolean> {
  if (authRefreshInFlight) {
    return authRefreshInFlight;
  }
  authRefreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      authRefreshInFlight = null;
    });
  return authRefreshInFlight;
}

type ApiErrorPayload = {
  detail?:
    | string
    | { msg?: string }[]
    | {
        message?: string;
        code?: string;
      };
};

async function safeJson<T>(response: Response): Promise<T | null> {
  const text = await response.text().catch(() => "");
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function extractErrorMessage(payload: unknown, status?: number): string {
  if (!payload) {
    return status ? `Erreur serveur (${status})` : "Request failed";
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as ApiErrorPayload;
        return extractErrorMessage(parsed, status);
      } catch {
        // continue
      }
    }

    // Detect HTML responses (e.g., DigitalOcean App Platform, Cloudflare, Nginx, 502/503/504 pages)
    if (
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.startsWith("<html") ||
      trimmed.startsWith("<head") ||
      trimmed.startsWith("<body") ||
      trimmed.includes("via_upstream") ||
      trimmed.includes("App Platform failed") ||
      /<[a-z][\s\S]*>/i.test(trimmed)
    ) {
      if (
        trimmed.includes("503") ||
        status === 503 ||
        trimmed.includes("connection_timed_out") ||
        trimmed.includes("via_upstream")
      ) {
        return "Le serveur ou le service IA est temporairement indisponible (Erreur 503 - Timeout serveur). Veuillez réessayer dans quelques instants.";
      }
      if (trimmed.includes("502") || status === 502) {
        return "Le service est temporairement inaccessible (Erreur 502 - Bad Gateway). Veuillez vérifier la connexion au serveur.";
      }
      if (trimmed.includes("504") || status === 504) {
        return "Délai d'attente dépassé lors de la communication avec le serveur (Erreur 504).";
      }
      if (trimmed.includes("404") || status === 404) {
        return "Ressource demandée introuvable (Erreur 404).";
      }
      return status
        ? `Erreur serveur (${status}) - Service temporairement indisponible`
        : "Le serveur a renvoyé une erreur inattendue. Veuillez réessayer.";
    }

    return payload;
  }

  if (typeof payload === "object") {
    const typed = payload as ApiErrorPayload;
    if (typeof typed.detail === "string") {
      return typed.detail;
    }
    if (
      typed.detail &&
      typeof typed.detail === "object" &&
      !Array.isArray(typed.detail) &&
      typeof typed.detail.message === "string" &&
      typed.detail.message.trim().length > 0
    ) {
      return typed.detail.message;
    }
    // Structured errors that only carry a machine code (e.g. guest quotas):
    // surface the code so callers can map it to their own copy.
    if (
      typed.detail &&
      typeof typed.detail === "object" &&
      !Array.isArray(typed.detail) &&
      typeof (typed.detail as { code?: unknown }).code === "string"
    ) {
      return (typed.detail as { code: string }).code;
    }
    if (Array.isArray(typed.detail)) {
      return typed.detail.map((item) => item.msg ?? "Invalid request").join(", ");
    }
  }

  return status ? `Erreur serveur (${status})` : "Request failed";
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const method = options.method ?? "GET";
  if (method !== "GET") {
    clearGetRequestState();
  }
  const retryAuth = options.retryAuth ?? true;
  const suppressAuthRedirect = options.suppressAuthRedirect ?? false;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const isAuthLogin = path === "/auth/login" && method === "POST";
  const isAuthRegister = path === "/auth/register" && method === "POST";
  const isAuthLoginOrRegister = isAuthLogin || isAuthRegister;
  const isAuthRefresh = path === "/auth/refresh" && method === "POST";
  const isAuthMe = path === "/auth/me" && method === "GET";
  const isAuthLogout = path === "/auth/logout" && method === "POST";
  const isAuthForceReset = path === "/auth/force-reset" && method === "POST";
  const isAuthWebLoginExchange = path === "/auth/web-login-exchange" && method === "POST";
  const isSessionEstablishingAuthCall =
    isAuthLoginOrRegister || isAuthRefresh || isAuthMe || isAuthForceReset || isAuthWebLoginExchange;
  const isSessionCleanupAuthCall = isAuthLogout;
  const isPublicAuthPath =
    (path === "/auth/password-reset/request" ||
      path === "/auth/password-reset/confirm" ||
      path === "/auth/password-reset/token-info") &&
    method === "POST";
  const isPublicApiPath = path.startsWith("/public/");
  const isProtectedAuthCall =
    !isPublicApiPath &&
    !isPublicAuthPath &&
    !isSessionEstablishingAuthCall &&
    !isSessionCleanupAuthCall;

  if (
    isProtectedAuthCall &&
    typeof window !== "undefined" &&
    sessionUnauthorized
  ) {
    if (
      !suppressAuthRedirect &&
      window.location.pathname !== "/login" &&
      !authRedirectInProgress
    ) {
      authRedirectInProgress = true;
      window.location.href = "/login";
    }
    throw new Error("Not authenticated");
  }

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (typeof window !== "undefined" && !path.startsWith("/auth")) {
    const actAs = window.sessionStorage.getItem("floussy.superadmin.act_as");
    if (actAs && !headers.has("x-user-id")) {
      headers.set("x-user-id", actAs);
    }
  }
  const url = `${API_BASE}${path}`;
  const isGetRequest = method === "GET";
  const shouldDedupeGet = isGetRequest;
  const shouldCacheGet = isGetRequest && !path.startsWith("/auth");
  const getRequestKey = shouldDedupeGet ? buildGetRequestKey(url, headers) : null;

  if (shouldDedupeGet && getRequestKey) {
    const now = Date.now();
    if (shouldCacheGet) {
      const cached = recentGetResponses.get(getRequestKey);
      if (cached) {
        if (cached.expiresAt > now) {
          return cached.value as T;
        }
        recentGetResponses.delete(getRequestKey);
      }
    }
    const inFlight = inFlightGetRequests.get(getRequestKey);
    if (inFlight) {
      return inFlight as Promise<T>;
    }
  }

  const executeRequest = async (): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body:
          options.body === undefined
            ? undefined
            : typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body),
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(
          `Network timeout while calling ${path}. API unreachable at ${API_BASE}.`
        );
      }
      throw new Error(`Network error while calling ${path}. API unreachable at ${API_BASE}.`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 401 && isProtectedAuthCall && typeof window !== "undefined") {
        if (retryAuth && !isAuthRefresh) {
          if (isRefreshing) {
            return new Promise<T>((resolve, reject) => {
              refreshQueue.push((failed) => {
                if (failed) {
                  reject(new Error("Not authenticated"));
                } else {
                  resolve(apiFetch<T>(path, { ...options, retryAuth: false }));
                }
              });
            });
          }

          isRefreshing = true;
          try {
            const refreshed = await tryRefreshSession();
            if (refreshed) {
              sessionUnauthorized = false;
              isRefreshing = false;
              const queue = [...refreshQueue];
              refreshQueue = [];
              for (const cb of queue) {
                cb(false);
              }
              return apiFetch<T>(path, { ...options, retryAuth: false });
            } else {
              isRefreshing = false;
              const queue = [...refreshQueue];
              refreshQueue = [];
              for (const cb of queue) {
                cb(true);
              }
            }
          } catch (e) {
            isRefreshing = false;
            const queue = [...refreshQueue];
            refreshQueue = [];
            for (const cb of queue) {
              cb(true);
            }
          }
        }

        // JWT refresh failed. Before giving up, try to re-seed a guest session
        // from a stored anchor token — this is what keeps a guest's data from
        // being lost when the session cookie expires or is cleared.
        if (retryAuth && !isAuthRefresh) {
          try {
            const { resumeGuestFromVaults } = await import("@/lib/guestSession");
            const resumed = await resumeGuestFromVaults();
            if (resumed) {
              sessionUnauthorized = false;
              return apiFetch<T>(path, { ...options, retryAuth: false });
            }
          } catch {
            /* fall through to the normal unauthenticated path */
          }
        }

        // Only lock the session after refresh has failed or is not allowed.
        // This avoids false logouts when several protected requests race and one
        // of them briefly receives a 401 while the session is still recoverable.
        sessionUnauthorized = true;

        if (!suppressAuthRedirect) {
          if (window.location.pathname !== "/login" && !authRedirectInProgress) {
            authRedirectInProgress = true;
            window.location.href = "/login";
          }
        }
      }
      const errorText = await response.text().catch(() => "");
      const message = extractErrorMessage(errorText, response.status);
      throw new Error(message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      if (isSessionEstablishingAuthCall) {
        sessionUnauthorized = false;
      }
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const parsed = await safeJson<T>(response);
      if (isSessionEstablishingAuthCall) {
        sessionUnauthorized = false;
      }
      return (parsed ?? (undefined as T));
    }

    const text = await response.text().catch(() => "");
    if (!text.trim()) {
      if (isSessionEstablishingAuthCall) {
        sessionUnauthorized = false;
      }
      return undefined as T;
    }
    if (isSessionEstablishingAuthCall) {
      sessionUnauthorized = false;
    }
    return text as T;
  };

  if (shouldDedupeGet && getRequestKey) {
    const requestPromise = executeRequest()
      .then((result) => {
        if (shouldCacheGet) {
          recentGetResponses.set(getRequestKey, {
            expiresAt: Date.now() + GET_DEDUPE_TTL_MS,
            value: result,
          });
        }
        return result;
      })
      .finally(() => {
        inFlightGetRequests.delete(getRequestKey);
      });
    inFlightGetRequests.set(getRequestKey, requestPromise);
    return requestPromise as Promise<T>;
  }

  return executeRequest();
}

const ZERO_BALANCE_FIELDS = [
  "opening_balance",
  "total_allocations",
  "total_spent",
  "closing_balance",
  "total_movements",
  "sweeps_in",
  "sweeps_out",
] as const;

/**
 * Fetches /dashboard and, when the user has never declared their first income
 * (sweep_bootstrap.needs_first_income_declaration), zeroes out per-envelope
 * balance fields. The backend currently leaves those fields populated with
 * onboarding-configured/target amounts instead of live period balances in
 * that state, which makes envelopes look funded before any real distribution
 * ran. This only fires pre-first-income; users who already declared income
 * see the response unchanged.
 */
export async function fetchDashboard(
  path = "/dashboard",
  options: ApiFetchOptions = {}
): Promise<DashboardOut> {
  const data = await apiFetch<DashboardOut>(path, options);
  if (data?.sweep_bootstrap?.needs_first_income_declaration && Array.isArray(data.envelopes)) {
    return {
      ...data,
      envelopes: data.envelopes.map((entry) => ({
        ...entry,
        balance: ZERO_BALANCE_FIELDS.reduce(
          (balance, field) =>
            field in balance ? { ...balance, [field]: "0.00" } : balance,
          entry.balance
        ),
      })),
    };
  }
  return data;
}
