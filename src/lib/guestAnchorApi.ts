/**
 * Network wrappers for the guest (Mode Découverte) backend contract.
 *
 * Split out of `guestAnchor.ts` so that module stays dependency-free and
 * unit-testable. These routes are specified in the Mode Découverte plan
 * (annexe B.3) and are NOT live on the backend yet — wiring the UI to them
 * waits on the `7sabek` backend repo.
 */

import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import type { DeviceSignals } from "@/lib/guestSignals";

export type GuestCreateResponse = {
  user: AuthUser;
  /** The opaque L1 secret to mirror into every vault. */
  guest_token: string;
  /** One-time recovery code (phase 3 surfaces it; phase 1 just stores it server-side). */
  recovery_code?: string;
};

/**
 * `POST /auth/guest` — create the guest row and set the `gt` cookie.
 * Idempotent: retrying with the same key returns the same user, never a second.
 */
export async function createGuest(
  idempotencyKey: string,
  signals?: DeviceSignals
): Promise<GuestCreateResponse> {
  return apiFetch<GuestCreateResponse>("/auth/guest", {
    method: "POST",
    body: signals && Object.keys(signals).length ? { signals } : {},
    headers: { "Idempotency-Key": idempotencyKey },
    suppressAuthRedirect: true,
  });
}

/**
 * `POST /auth/guest/l2-hint` — bare boolean: might a guest budget live on this
 * device? A `true` routes to the recovery-code flow; it never restores anything.
 */
export async function l2Hint(signals: DeviceSignals): Promise<boolean> {
  try {
    const res = await apiFetch<{ maybe_exists: boolean }>("/auth/guest/l2-hint", {
      method: "POST",
      body: { signals },
      suppressAuthRedirect: true,
    });
    return Boolean(res?.maybe_exists);
  } catch {
    return false;
  }
}

/** `POST /auth/guest/resume` — exchange a mirror token for a fresh session cookie. */
export async function resumeGuest(token: string): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/auth/guest/resume", {
    method: "POST",
    body: { token },
    suppressAuthRedirect: true,
  });
}

/** `POST /auth/guest/recover` — exchange a recovery code for a session (phase 3). */
export async function recoverGuest(recoveryCode: string): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/auth/guest/recover", {
    method: "POST",
    body: { recovery_code: recoveryCode },
    suppressAuthRedirect: true,
  });
}

/** `DELETE /auth/guest` — erase the guest user and all their data, immediately. */
export async function deleteGuestData(): Promise<void> {
  await apiFetch("/auth/guest", { method: "DELETE", suppressAuthRedirect: true });
}

/** `POST /auth/guest/claim` — turn the current guest into a full account (one UPDATE). */
export async function claimGuestAccount(email: string, password: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/guest/claim", {
    method: "POST",
    body: { email, password },
    suppressAuthRedirect: true,
  });
}

/** `POST /auth/guest/ack-recovery` — guest confirms they saved the recovery code (40 → 70). */
export async function ackRecoveryCode(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/guest/ack-recovery", {
    method: "POST",
    suppressAuthRedirect: true,
  });
}

/** `POST /auth/guest/claim-passkey` — finish a passkey-based claim (a passkey is already registered). */
export async function claimGuestWithPasskey(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/guest/claim-passkey", {
    method: "POST",
    suppressAuthRedirect: true,
  });
}

/** Fire one Mode Découverte funnel event. Never throws — analytics must not break a flow. */
export function guestEvent(name: string, meta?: Record<string, unknown>): void {
  void apiFetch("/analytics/guest-event", {
    method: "POST",
    body: { name, meta },
    suppressAuthRedirect: true,
  }).catch(() => {});
}
