/**
 * The full-page "Mode Découverte" welcome shown to a guest before the dashboard.
 *
 * - A brand-new guest is always routed there first (mandatory pass-through).
 * - Tapping "Continuer" / acknowledging the code marks it seen (with a
 *   timestamp) so it does not reappear on every navigation.
 * - If the guest still has not secured their budget (no account, recovery code
 *   not acknowledged), the walk-through re-surfaces once every few days — this
 *   is the ongoing "don't lose your budget" nudge.
 * - Uses localStorage (not sessionStorage) so a new tab doesn't re-trigger it,
 *   and the multi-day timer actually works.
 */

const SEEN_AT_KEY = "7sabek.guest.decouverte_seen_at";
const RENUDGE_AFTER_MS = 3 * 86_400_000; // 3 days

function readSeenAt(): number {
  try {
    return Number(window.localStorage.getItem(SEEN_AT_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function markDiscoveryWelcomeSeen(): void {
  try {
    window.localStorage.setItem(SEEN_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function hasSeenDiscoveryWelcome(): boolean {
  return readSeenAt() > 0;
}

/** Whether the guest should be routed to /decouverte right now. */
export function shouldShowDiscoveryWelcome(user: {
  is_guest?: boolean | null;
  claimed_at?: string | null;
  recovery_code_ack?: boolean | null;
}): boolean {
  if (!user.is_guest || user.claimed_at) return false;
  const seenAt = readSeenAt();
  if (seenAt === 0) return true; // never walked through it → mandatory
  if (user.recovery_code_ack) return false; // budget is secured, leave them alone
  // Still unsecured — re-surface the walk-through every few days.
  return Date.now() - seenAt > RENUDGE_AFTER_MS;
}
