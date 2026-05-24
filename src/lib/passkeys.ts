import { apiFetch, API_BASE, type HttpMethod } from "@/lib/api";
import type { PlatformStatusOut } from "@/lib/types";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/typescript-types";

export type PasskeyFeatureStatus = {
  enabled: boolean;
};
export type AuthenticatedPasskeyStatus = {
  enabled: boolean;
  reason: "enabled" | "disabled" | "not_allowed";
};

export type PasskeyCredential = {
  id: string;
  name?: string | null;
  credential_id_masked: string;
  aaguid?: string | null;
  transports?: string[] | null;
  created_at: string;
  last_used_at?: string | null;
};

export type PasskeyRegisterOptions = {
  challenge_id: string;
  options: PublicKeyCredentialCreationOptionsJSON;
};

export type PasskeyLoginOptions = {
  challenge_id: string;
  options: PublicKeyCredentialRequestOptionsJSON;
};

export class PasskeyRequestError extends Error {
  status?: number;
  debugBody?: unknown;

  constructor(message: string, status?: number, debugBody?: unknown) {
    super(message);
    this.name = "PasskeyRequestError";
    this.status = status;
    this.debugBody = debugBody;
  }
}

type ApiErrorPayload = {
  detail?:
    | string
    | { msg?: string }[]
    | {
        message?: string;
      };
};

function extractErrorMessage(payload: unknown): string {
  if (!payload) return "Request failed";
  if (typeof payload === "string") return payload;
  if (typeof payload === "object") {
    const typed = payload as ApiErrorPayload;
    if (typeof typed.detail === "string") return typed.detail;
    if (Array.isArray(typed.detail)) {
      return typed.detail.map((item) => item.msg ?? "Invalid request").join(", ");
    }
    if (
      typed.detail &&
      typeof typed.detail === "object" &&
      typeof typed.detail.message === "string" &&
      typed.detail.message.trim().length > 0
    ) {
      return typed.detail.message;
    }
  }
  return "Request failed";
}

async function passkeySafeFetch<T>(path: string, method: HttpMethod, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    let parsed: unknown = raw;
    if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }
    throw new PasskeyRequestError(extractErrorMessage(parsed), response.status, parsed);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text().catch(() => "");
  if (!text.trim()) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function isPasskeyFeatureDisabledError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("not found") || message.includes("404");
}

export async function getPasskeyFeatureStatus(): Promise<PasskeyFeatureStatus> {
  try {
    const status = await apiFetch<PlatformStatusOut>("/public/platform-status", {
      suppressAuthRedirect: true,
    });
    return {
      enabled: Boolean(status.features?.passkeys),
    };
  } catch {
    return { enabled: false };
  }
}

export async function getAuthenticatedPasskeyStatus(): Promise<AuthenticatedPasskeyStatus> {
  try {
    return await apiFetch<AuthenticatedPasskeyStatus>("/auth/passkeys/status");
  } catch (error) {
    if (isPasskeyFeatureDisabledError(error)) {
      return { enabled: false, reason: "disabled" };
    }
    throw error;
  }
}

export async function getRegisterOptions(): Promise<PasskeyRegisterOptions | null> {
  try {
    return await apiFetch<PasskeyRegisterOptions>("/auth/passkeys/register/options", {
      method: "POST",
      body: {},
    });
  } catch (error) {
    if (isPasskeyFeatureDisabledError(error)) return null;
    throw error;
  }
}

export async function verifyRegistration(payload: {
  challenge_id: string;
  challenge: string;
  credential: RegistrationResponseJSON;
  name?: string;
}): Promise<{ status: string; passkey_id: string; name?: string | null } | null> {
  try {
    return await passkeySafeFetch<{ status: string; passkey_id: string; name?: string | null }>(
      "/auth/passkeys/register/verify",
      "POST",
      payload
    );
  } catch (error) {
    if (isPasskeyFeatureDisabledError(error)) return null;
    throw error;
  }
}

export async function getLoginOptions(email?: string): Promise<PasskeyLoginOptions | null> {
  try {
    return await apiFetch<PasskeyLoginOptions>("/auth/passkeys/login/options", {
      method: "POST",
      body: { email: email?.trim() || undefined },
      suppressAuthRedirect: true,
    });
  } catch (error) {
    if (isPasskeyFeatureDisabledError(error)) return null;
    throw error;
  }
}

export async function verifyLogin(payload: {
  challenge_id: string;
  challenge: string;
  credential: AuthenticationResponseJSON;
  browser?: string;
  os?: string;
  device?: string;
}): Promise<unknown | null> {
  try {
    return await apiFetch<unknown>("/auth/passkeys/login/verify", {
      method: "POST",
      body: payload,
      suppressAuthRedirect: true,
    });
  } catch (error) {
    if (isPasskeyFeatureDisabledError(error)) return null;
    throw error;
  }
}

export async function listPasskeys(): Promise<PasskeyCredential[] | null> {
  try {
    return await apiFetch<PasskeyCredential[]>("/auth/passkeys");
  } catch (error) {
    if (isPasskeyFeatureDisabledError(error)) return null;
    throw error;
  }
}

export async function deletePasskey(id: string): Promise<{ status: string; message?: string } | null> {
  try {
    return await apiFetch<{ status: string; message?: string }>(`/auth/passkeys/${id}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (isPasskeyFeatureDisabledError(error)) return null;
    throw error;
  }
}

export function guessDeviceLabel(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android";
  if (ua.includes("macintosh") || ua.includes("mac os")) return "MacBook";
  if (ua.includes("windows")) return "Windows PC";
  return "This device";
}
