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
const rawApiBase = process.env.NEXT_PUBLIC_API_BASE;
const fallbackApiBase = isLanHost
  ? `http://${hostname}:8000`
  : `https://api.${hostname.replace(/^www\\./, "")}`;
export const API_BASE =
  rawApiBase && rawApiBase.trim().length > 0 ? rawApiBase : fallbackApiBase;

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

export function resetAuthClientState(): void {
  sessionUnauthorized = false;
  authRedirectInProgress = false;
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

function extractErrorMessage(payload: unknown): string {
  if (!payload) {
    return "Request failed";
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as ApiErrorPayload;
        return extractErrorMessage(parsed);
      } catch {
        return payload;
      }
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
    if (Array.isArray(typed.detail)) {
      return typed.detail.map((item) => item.msg ?? "Invalid request").join(", ");
    }
  }

  return "Request failed";
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const method = options.method ?? "GET";
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
    const actAs = window.localStorage.getItem("floussy.superadmin.act_as");
    if (actAs && !headers.has("x-user-id")) {
      headers.set("x-user-id", actAs);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
        const refreshed = await tryRefreshSession();
        if (refreshed) {
          sessionUnauthorized = false;
          return apiFetch<T>(path, { ...options, retryAuth: false });
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
    const message = extractErrorMessage(errorText);
    throw new Error(message || "Request failed");
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
}
