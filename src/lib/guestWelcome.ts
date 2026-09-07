/**
 * The full-page "Mode Découverte" welcome shown to a guest before the dashboard.
 *
 * It is shown once per tab session, and only while the guest has not yet secured
 * their budget (no account, recovery code not acknowledged). Tapping "Continuer"
 * marks it seen so it does not reappear on every navigation; acknowledging the
 * recovery code clears the underlying reason to show it at all.
 */

const SEEN_FLAG = "7sabek.guest.decouverte_seen";

export function markDiscoveryWelcomeSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function hasSeenDiscoveryWelcome(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_FLAG) === "1";
  } catch {
    return false;
  }
}

/** Whether the guest should be routed to /decouverte right now. */
export function shouldShowDiscoveryWelcome(user: {
  is_guest?: boolean | null;
  claimed_at?: string | null;
  recovery_code_ack?: boolean | null;
}): boolean {
  return (
    Boolean(user.is_guest) &&
    !user.claimed_at &&
    !user.recovery_code_ack &&
    !hasSeenDiscoveryWelcome()
  );
}
