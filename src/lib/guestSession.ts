/**
 * Orchestrates the guest ("Mode Découverte") session lifecycle on the client.
 *
 * Two entry points matter:
 *
 * - `startGuestSession()` — the "Essayer sans compte" button. Creates a guest
 *   (once, even with racing tabs) and mirrors its token into every vault.
 * - `resumeGuestFromVaults()` — called when a request 401s. If a mirror token
 *   exists, trade it for a fresh session before the app gives up and redirects
 *   to /login. This is what makes "the data is never lost" true on the web.
 */

import { refreshAuthSession, type AuthUser } from "@/lib/auth";
import {
  claimGuestCreationLock,
  clearAnchorToken,
  newIdempotencyKey,
  persistAnchorToken,
  resolveAnchorToken,
} from "@/lib/guestAnchor";
import {
  createGuest,
  deleteGuestData,
  resumeGuest,
} from "@/lib/guestAnchorApi";

const RECOVERY_CODE_KEY = "7sabek.guest.recovery_code";

let resumeInFlight: Promise<AuthUser | null> | null = null;

function rememberRecoveryCode(code: string | undefined): void {
  if (!code || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECOVERY_CODE_KEY, code);
  } catch {
    /* ignore */
  }
}

/** The recovery code shown to this guest, if we still hold it locally. */
export function readStoredRecoveryCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(RECOVERY_CODE_KEY);
  } catch {
    return null;
  }
}

/**
 * Create a guest and open its session. Safe to call from several tabs at once —
 * the creation lock + idempotency key collapse them to a single guest.
 * Returns the authenticated guest user.
 */
export async function startGuestSession(): Promise<AuthUser> {
  return claimGuestCreationLock(async () => {
    // Another tab may have created the guest while we waited for the lock.
    const existing = await resumeGuestFromVaults();
    if (existing) return existing;

    const { user, guest_token, recovery_code } = await createGuest(newIdempotencyKey());
    await persistAnchorToken(guest_token);
    rememberRecoveryCode(recovery_code);
    return user;
  });
}

/**
 * If a mirror token is stored, exchange it for a fresh session. Returns the
 * resumed user, or `null` when there is nothing to resume (genuine first visit,
 * or the guest was already turned into an account).
 *
 * De-duplicated: concurrent 401s trigger one resume, not a storm.
 */
export async function resumeGuestFromVaults(): Promise<AuthUser | null> {
  if (resumeInFlight) return resumeInFlight;

  resumeInFlight = (async () => {
    const token = await resolveAnchorToken();
    if (!token) return null;
    try {
      const { user } = await resumeGuest(token);
      // Re-seed any vault that had gone missing.
      await persistAnchorToken(token);
      return user;
    } catch {
      // 404 (unknown token) or 409 (already claimed) — stop trying this token.
      return null;
    }
  })().finally(() => {
    resumeInFlight = null;
  });

  return resumeInFlight;
}

/** Wipe this guest and its local anchor. Used by "Effacer mes données". */
export async function eraseGuest(): Promise<void> {
  try {
    await deleteGuestData();
  } finally {
    await clearAnchorToken();
    try {
      window.localStorage.removeItem(RECOVERY_CODE_KEY);
    } catch {
      /* ignore */
    }
  }
}

/**
 * After a successful `POST /auth/guest/claim`, the row is no longer a guest.
 * Drop the local anchor + recovery code and refresh the session snapshot.
 */
export async function finalizeGuestClaim(): Promise<AuthUser> {
  await clearAnchorToken();
  try {
    window.localStorage.removeItem(RECOVERY_CODE_KEY);
  } catch {
    /* ignore */
  }
  return refreshAuthSession();
}
