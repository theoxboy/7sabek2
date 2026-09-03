import { apiFetch, resetAuthClientState } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  must_reset_password: boolean;
  is_beta_tester: boolean;
  /**
   * "Mode Découverte" session: a real user row with no email/password/onboarding.
   * The whole guest UI is driven from this flag plus `protection_level` — there is
   * no parallel route. Absent/false for members. See `src/lib/guestQuota.ts`.
   */
  is_guest?: boolean;
  /** Protection gauge figure (40 / 70 / 100). Only meaningful while `is_guest`. */
  protection_level?: number;
  /** Set once a guest turns into a full account — used to stop forcing onboarding. */
  claimed_at?: string | null;
  /** Guest has confirmed they saved their recovery code (drives protection 70). */
  recovery_code_ack?: boolean;
  force_onboarding_v2_review: boolean;
  force_tour_replay_version: number;
  has_completed_onboarding_v2?: boolean;
  currency: string;
  sweep_interval_days: number;
  next_sweep_date?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  leaderboard_name?: string | null;
  phone_number?: string | null;
  birth_date?: string | null;
  country?: string | null;
  city?: string | null;
  profile_photo_url?: string | null;
};

/** True when the session is a "Mode Découverte" guest rather than a full member. */
export function isGuestUser(user: Pick<AuthUser, "is_guest"> | null | undefined): boolean {
  return Boolean(user?.is_guest);
}

type FetchMeOptions = {
  suppressAuthRedirect?: boolean;
  force?: boolean;
};

const FETCH_ME_CACHE_TTL_MS = 15_000;
const AUTH_SESSION_HINT_KEY = "floussy.auth.session_hint";

let fetchMeCache:
  | {
      user: AuthUser;
      cachedAt: number;
    }
  | null = null;
let fetchMeInFlight: Promise<AuthUser> | null = null;

function shouldReuseFetchMeCache(force = false) {
  if (force || !fetchMeCache) return false;
  return Date.now() - fetchMeCache.cachedAt < FETCH_ME_CACHE_TTL_MS;
}

function looksLikeRateLimitError(message: string) {
  const normalized = message.trim().toLowerCase();
  return normalized.includes("rate limit") || normalized.includes("too many") || normalized.includes("retry");
}

export function hasAuthSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === "1";
}

export function markAuthSessionHint(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_SESSION_HINT_KEY, "1");
}

export function clearAuthSessionHint(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SESSION_HINT_KEY);
}

export async function fetchMe(options: FetchMeOptions = {}): Promise<AuthUser> {
  if (shouldReuseFetchMeCache(options.force)) {
    return fetchMeCache!.user;
  }

  if (fetchMeInFlight) {
    return fetchMeInFlight;
  }

  fetchMeInFlight = apiFetch<AuthUser>("/auth/me", {
    suppressAuthRedirect: options.suppressAuthRedirect ?? false,
  })
    .then((user) => {
      fetchMeCache = { user, cachedAt: Date.now() };
      return user;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "";
      if (fetchMeCache && looksLikeRateLimitError(message)) {
        return fetchMeCache.user;
      }
      throw error;
    })
    .finally(() => {
      fetchMeInFlight = null;
    });

  return fetchMeInFlight;
}

export async function refreshAuthSession(): Promise<AuthUser> {
  return fetchMe({ suppressAuthRedirect: true, force: true });
}

export async function logout(): Promise<void> {
  fetchMeCache = null;
  fetchMeInFlight = null;
  clearAuthSessionHint();
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    resetAuthClientState();
  }
}

export async function requestPasswordReset(
  email: string,
  locale = "fr"
): Promise<{ status: string; message?: string }> {
  return apiFetch<{ status: string; message?: string }>("/auth/password-reset/request", {
    method: "POST",
    body: { email, locale },
    suppressAuthRedirect: true,
  });
}

type ConfirmPasswordResetOptions = {
  superadminCode?: string;
  superadminFirstName?: string;
};

export async function getPasswordResetTokenInfo(
  token: string
): Promise<{ status: string; valid: boolean; requires_superadmin_verification: boolean }> {
  return apiFetch<{
    status: string;
    valid: boolean;
    requires_superadmin_verification: boolean;
  }>("/auth/password-reset/token-info", {
    method: "POST",
    body: { token },
    suppressAuthRedirect: true,
  });
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string,
  options: ConfirmPasswordResetOptions = {}
): Promise<void> {
  await apiFetch("/auth/password-reset/confirm", {
    method: "POST",
    body: {
      token,
      new_password: newPassword,
      superadmin_code: options.superadminCode?.trim() || undefined,
      superadmin_first_name: options.superadminFirstName?.trim() || undefined,
    },
    suppressAuthRedirect: true,
  });
}
