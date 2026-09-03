/**
 * Route-level gating for "Mode Découverte" guests.
 *
 * A guest can walk the whole app to get a feel for it, but most pages are
 * read-only previews behind a banner that says — in every language — that the
 * feature needs a free account. `guestQuota.ts` owns the per-feature policy;
 * this maps app routes onto it and adds the wording.
 */

import type { FloussyLocale } from "@/lib/localePreference";
import { guestFeatureAccess, type GuestFeatureAccess } from "@/lib/guestQuota";

/** Route prefix → feature key in GUEST_FEATURE_ACCESS. Longest prefix wins. */
const ROUTE_FEATURE: Array<[prefix: string, feature: string]> = [
  ["/dashboard", "dashboard"],
  ["/transactions", "transactions"],
  ["/envelopes", "envelopes"],
  ["/categories", "categories"],
  ["/allocate", "monthly-budget"],
  ["/settings", "theme"],
  ["/aide", "theme"],
  ["/releases", "theme"],
  ["/regulation", "theme"],

  ["/chat", "advisor"],
  ["/advisor", "advisor"],
  ["/reports", "reports"],
  ["/goals", "goals"],
  ["/debts", "debts"],
  ["/salaf", "debts"],
  ["/distribution", "export"],
  ["/planner", "reports"],
  ["/khatat-lflous", "reports"],
  ["/sweeps", "export"],
  ["/rules", "rules"],
  ["/notifications", "notifications"],
  ["/gamification", "gamification"],
  ["/shiftpilot", "reports"],
];

export type GuestRouteState = "open" | "limited" | "locked";

/** How a guest experiences the page at `pathname`. */
export function guestRouteState(pathname: string | null | undefined): GuestRouteState {
  if (!pathname) return "open";
  let feature: string | null = null;
  let best = -1;
  for (const [prefix, key] of ROUTE_FEATURE) {
    if ((pathname === prefix || pathname.startsWith(prefix + "/")) && prefix.length > best) {
      best = prefix.length;
      feature = key;
    }
  }
  if (!feature) return "open";
  const access: GuestFeatureAccess = guestFeatureAccess(feature);
  if (access === "open") return "open";
  // The advisor keeps a small taste (a few messages) → "limited".
  if (feature === "advisor") return "limited";
  return "locked";
}

/** Whether the sidebar entry for `href` should render dimmed + locked for a guest. */
export function isGuestLockedHref(href: string): boolean {
  return guestRouteState(href) === "locked";
}

// ─── Wording (trilingual — always names the app as free) ───────────────────────

export type GuestGateCopy = {
  /** Small pill shown before the headline. */
  eyebrow: string;
  /** The main line. */
  title: string;
  /** One supporting sentence. Always contains the word "free". */
  body: string;
  /** The primary button. */
  cta: string;
  /** A reassurance line under the button. */
  freeNote: string;
  /** Advisor-specific line about the daily allowance (shown on the chat page). */
  advisorLimit: string;
  /** Shown once the guest has used every advisor message for the day. */
  advisorExhausted: string;
};

/** Messages a guest may send to the AI advisor per day. Backend is the authority. */
export const GUEST_ADVISOR_MESSAGES_PER_DAY = 3;

export const GUEST_GATE_COPY: Record<FloussyLocale, GuestGateCopy> = {
  fr: {
    eyebrow: "Mode découverte",
    title: "Cette fonctionnalité est réservée aux comptes",
    body: "Tu peux regarder la page pour te faire une idée, mais pour l’utiliser il faut créer ton compte. 7sabek est 100% gratuit, pour toujours — personne ne paie rien.",
    cta: "Créer mon compte gratuit",
    freeNote: "Gratuit à vie · aucune carte bancaire · tes données déjà là sont gardées",
    advisorLimit: `Mode découverte : ${GUEST_ADVISOR_MESSAGES_PER_DAY} messages par jour avec le conseiller. Crée ton compte gratuit pour un accès sans limite.`,
    advisorExhausted: "Tu as utilisé tes messages du jour avec le conseiller. Crée ton compte gratuit pour continuer sans limite — c’est gratuit.",
  },
  en: {
    eyebrow: "Discovery mode",
    title: "This feature needs an account",
    body: "You can look around the page to get a feel for it, but using it means creating your account. 7sabek is 100% free, forever — nobody pays anything.",
    cta: "Create my free account",
    freeNote: "Free for life · no card · the data you already added is kept",
    advisorLimit: `Discovery mode: ${GUEST_ADVISOR_MESSAGES_PER_DAY} messages a day with the advisor. Create your free account for unlimited access.`,
    advisorExhausted: "You’ve used today’s advisor messages. Create your free account to keep going with no limit — it’s free.",
  },
  ar: {
    eyebrow: "وضع الاكتشاف",
    title: "هاد الخاصية خاصها حساب",
    body: "تقدر تشوف الصفحة باش تاخد فكرة، ولكن باش تستعملها خاصك تصاوب الحساب ديالك. 7sabek مجاني 100% وديما — حتى واحد ما كيخلص والو.",
    cta: "صاوب حسابي المجاني",
    freeNote: "مجاني مدى الحياة · بلا كارط بانكية · البيانات اللي دخلتي كتبقى محفوظة",
    advisorLimit: `وضع الاكتشاف: ${GUEST_ADVISOR_MESSAGES_PER_DAY} ديال الرسائل فاليوم مع المستشار. صاوب حسابك المجاني باش يكون عندك دخول بلا حدود.`,
    advisorExhausted: "صرفتي الرسائل ديال اليوم مع المستشار. صاوب حسابك المجاني باش تكمل بلا حدود — مجاني.",
  },
};
