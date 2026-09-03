/**
 * Single source of truth for the "Mode Découverte" (guest) tier.
 *
 * A guest is a real row in `users` with `is_guest = true` — no email, no
 * password, no onboarding. This module owns three things and nothing else:
 *
 * - **Quotas** — how much a guest can create before a soft wall appears
 *   (`GUEST_LIMITS`). These are anti-abuse ceilings, not conversion levers:
 *   a normal household never reaches them.
 * - **Feature gates** — for every app area, whether a guest gets it open,
 *   behind a soft wall, or hidden from navigation (`guestFeatureAccess`).
 * - **Protection level** — the 40 / 70 / 100 figure shown on the protection
 *   gauge, derived purely from what durability the account currently has
 *   (`resolveProtectionLevel`).
 *
 * Keep every guest limit here. UI reads these helpers; it never hard-codes a
 * number. Backend enforces its own copy of the quotas — this is the client
 * mirror so the UI can pre-empt a rejected write with a clear message.
 */

/** Hard ceilings for what a guest may create. Backend enforces the same values. */
export const GUEST_LIMITS = {
  /** Budget envelopes. 5 are proposed on the start screen; 20 is the maximum. */
  envelopes: 20,
  /** AI advisor exchanges — a deliberate taste of the feature, then the wall. */
  advisorExchanges: 3,
} as const;

/** Envelopes pre-filled (at 0 DH) on the guest start screen. A starting point, not a limit. */
export const GUEST_STARTER_ENVELOPE_COUNT = 5;

/** The protection gauge only ever shows one of these three values. */
export type ProtectionLevel = 40 | 70 | 100;

export type QuotaCheck = {
  /** Whether one more of this object may be created right now. */
  allowed: boolean;
  /** How many more may be created before the wall (never negative). */
  remaining: number;
  /** The ceiling this check was measured against. */
  limit: number;
};

/**
 * How a guest experiences a given feature.
 *
 * - `open`      — fully usable, no restriction.
 * - `soft-wall` — usable up to a quota, then an interstitial that keeps the
 *   pending action and offers "Plus tard"; or shown as a greyed preview.
 * - `hidden`    — removed from navigation entirely (no dead entries).
 */
export type GuestFeatureAccess = "open" | "soft-wall" | "hidden";

/**
 * Feature key → guest access. Keys map to app areas, not routes, so a rename of
 * a route does not silently change a gate.
 */
export const GUEST_FEATURE_ACCESS: Record<string, GuestFeatureAccess> = {
  envelopes: "open", // up to GUEST_LIMITS.envelopes
  transactions: "open", // never capped, never blocked
  "monthly-budget": "open",
  dashboard: "open",
  "reste-a-depenser": "open",
  categories: "open", // default catalogue, not editable
  theme: "open",
  language: "open",
  "recovery-code": "open", // guest-only setting
  "clear-data": "open", // guest-only setting, immediate, no grace period

  "history-past-months": "soft-wall", // triggers on first month rollover
  reports: "soft-wall",
  advisor: "soft-wall", // up to GUEST_LIMITS.advisorExchanges
  goals: "soft-wall", // greyed preview — it is a conversion argument
  debts: "soft-wall",
  salaf: "soft-wall",
  export: "soft-wall",
  "multi-device": "soft-wall",

  rules: "hidden",
  sweeps: "hidden",
  notifications: "hidden",
  "salary-reminders": "hidden",
  gamification: "hidden", // needs a public name
  leaderboard: "hidden",
  profile: "hidden", // nothing to fill
  passkeys: "hidden", // moot before an account
  sessions: "hidden",
};

/** Access level for a feature key. Unknown keys default to `open` (fail-open for UI). */
export function guestFeatureAccess(featureKey: string): GuestFeatureAccess {
  return GUEST_FEATURE_ACCESS[featureKey] ?? "open";
}

function toCount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function quotaCheck(current: number | null | undefined, limit: number): QuotaCheck {
  const count = toCount(current);
  const remaining = Math.max(0, limit - count);
  return { allowed: count < limit, remaining, limit };
}

/** Whether a guest may create one more envelope given how many they already have. */
export function checkEnvelopeQuota(currentCount: number | null | undefined): QuotaCheck {
  return quotaCheck(currentCount, GUEST_LIMITS.envelopes);
}

/** Whether a guest may send one more advisor message given how many they have sent. */
export function checkAdvisorQuota(exchangesUsed: number | null | undefined): QuotaCheck {
  return quotaCheck(exchangesUsed, GUEST_LIMITS.advisorExchanges);
}

export type ProtectionInputs = {
  /** Guest has viewed and (claims to have) saved their recovery code. */
  hasRecoveryCode?: boolean | null;
  /** Account has been claimed — email/password or a passkey now exists. */
  hasAccount?: boolean | null;
};

/**
 * The protection gauge figure.
 *
 * - `100` — account claimed. Backed up, recoverable, multi-device. Nothing left to do.
 * - `70`  — recovery code saved. Data can be recovered elsewhere, if the code was kept.
 * - `40`  — anchor only. Data lives on this device; clearing the browser loses it.
 *
 * Deliberately coarse: the gauge describes a real durability state, not a score.
 */
export function resolveProtectionLevel(inputs: ProtectionInputs): ProtectionLevel {
  if (inputs.hasAccount) return 100;
  if (inputs.hasRecoveryCode) return 70;
  return 40;
}

/** Copy key for the gauge caption at a given level — resolved by the i18n layer. */
export function protectionLevelCopyKey(level: ProtectionLevel): string {
  switch (level) {
    case 100:
      return "guest.protection.claimed";
    case 70:
      return "guest.protection.recoveryCode";
    case 40:
    default:
      return "guest.protection.deviceOnly";
  }
}
