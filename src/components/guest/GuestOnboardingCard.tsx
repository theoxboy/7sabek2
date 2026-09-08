"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, X } from "lucide-react";

import type { FloussyLocale } from "@/lib/localePreference";
import { guestEvent } from "@/lib/guestAnchorApi";

type Props = {
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
};

const DISMISS_KEY = "7sabek.guest.onboarding_card.dismissed";

const COPY: Record<
  FloussyLocale,
  { eyebrow: string; title: string; body: string; cta: string; skip: string; dismiss: string }
> = {
  fr: {
    eyebrow: "Mode découverte",
    title: "Construis ton budget complet",
    body: "Réponds à quelques questions sur ton revenu et tes dépenses : on crée tes enveloppes et on répartit ton argent automatiquement. Tout est gardé si tu crées ton compte ensuite.",
    cta: "Construire mon plan",
    skip: "Plus tard — je veux d'abord explorer",
    dismiss: "Fermer",
  },
  en: {
    eyebrow: "Discovery mode",
    title: "Build your full budget",
    body: "Answer a few questions about your income and spending: we create your envelopes and split your money automatically. Everything is kept if you create your account afterwards.",
    cta: "Build my plan",
    skip: "Later — I want to look around first",
    dismiss: "Dismiss",
  },
  ar: {
    eyebrow: "وضع الاكتشاف",
    title: "بني الميزانية ديالك كاملة",
    body: "جاوب على شي أسئلة على الدخل والمصاريف ديالك: حنا نصاوبو الأظرفة ونقسمو الفلوس أوتوماتيك. كلشي كيتحفظ إلا صاوبتي حسابك من بعد.",
    cta: "بني الخطة ديالي",
    skip: "من بعد — بغيت نتسنى نشوف الأول",
    dismiss: "سدّ",
  },
};

/**
 * Shown on the guest dashboard. The whole point of "distribute your income
 * into envelopes" is the onboarding flow — it is the only tool that asks for
 * the income, names the envelopes and sets the split. Mode Découverte skips it
 * by default; this offers it back as an opt-in, and stays dismissible so the
 * guest keeps full control of the choice.
 */
export function GuestOnboardingCard({ locale, dir }: Props) {
  const t = COPY[locale] ?? COPY.fr;
  const [dismissed, setDismissed] = useState(false);

  const storedDismissed = (() => {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  })();

  if (dismissed || storedDismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    guestEvent("guest_cta_click", { cta: "onboarding_card_dismiss", route: "/dashboard" });
  };

  return (
    <div className="mx-auto mb-4 w-full max-w-3xl px-1">
      <div
        dir={dir}
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card,var(--surface))] p-5"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.dismiss}
          className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2,rgba(0,0,0,0.04))] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[var(--accent-soft,rgba(23,199,119,0.14))] text-[var(--accent-strong,var(--accent))]"
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 pe-8">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-[var(--accent-strong,var(--accent))]">
              {t.eyebrow}
            </span>
            <p className="mt-0.5 text-[16px] font-semibold text-[var(--ink)]">{t.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{t.body}</p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href="/onboarding?from=guest"
                onClick={() =>
                  guestEvent("guest_cta_click", { cta: "onboarding_card", route: "/dashboard" })
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                {t.cta}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="text-[12px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
              >
                {t.skip}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
