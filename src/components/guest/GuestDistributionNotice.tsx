"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, X } from "lucide-react";

import type { FloussyLocale } from "@/lib/localePreference";
import { guestEvent } from "@/lib/guestAnchorApi";

type Props = {
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
};

const DISMISS_KEY = "7sabek.guest.distribution_notice.dismissed";

const COPY: Record<
  FloussyLocale,
  { title: string; intro: string; missing: string[]; cta: string; stay: string; dismiss: string }
> = {
  fr: {
    title: "Tu règles ta répartition — en mode découverte",
    intro: "Tu peux configurer comment ton revenu se partage entre tes enveloppes. Ce que tu n'as pas sans compte :",
    missing: [
      "les enveloppes proposées automatiquement d'après tes dépenses",
      "une vue complète de ton salaire, de tes revenus et de tes dépenses",
    ],
    cta: "Créer mon compte et tout configurer",
    stay: "Continuer sans compte",
    dismiss: "Fermer",
  },
  en: {
    title: "You're setting up your split — in discovery mode",
    intro: "You can configure how your income is shared across your envelopes. What you don't get without an account:",
    missing: [
      "envelopes suggested automatically from your spending",
      "a complete view of your salary, income and expenses",
    ],
    cta: "Create my account and set it all up",
    stay: "Keep going without an account",
    dismiss: "Dismiss",
  },
  ar: {
    title: "كتعدّل التقسيم ديالك — ف وضع الاكتشاف",
    intro: "تقدر تضبط كيفاش كيتقسم دخلك على الأظرفة ديالك. اللي ما عندكش بلا حساب:",
    missing: [
      "الأظرفة المقترحة أوتوماتيك حسب المصاريف ديالك",
      "نظرة كاملة على الراتب، المداخيل والمصاريف ديالك",
    ],
    cta: "صاوب حسابي وعمّر كلشي",
    stay: "كمّل بلا حساب",
    dismiss: "سدّ",
  },
};

/**
 * Shown at the top of the standalone /distribution page for a guest. The split
 * config itself stays fully usable; this only says what a full account adds
 * (auto envelope suggestions, a complete income view) and offers onboarding —
 * the choice is the guest's.
 */
export function GuestDistributionNotice({ locale, dir }: Props) {
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
  };

  return (
    <div
      dir={dir}
      className="mx-auto mb-5 mt-1 w-full max-w-3xl rounded-2xl border border-[var(--border,#e5e5ea)] bg-[var(--card,#ffffff)] p-4 text-[var(--ink,#111111)]"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[var(--accent-soft,rgba(23,199,119,0.14))] text-[var(--accent-strong,#0b8f53)]"
        >
          <Lock className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{t.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted,#6e6e73)]">{t.intro}</p>
          <ul className="mt-1.5 space-y-1">
            {t.missing.map((m) => (
              <li key={m} className="flex gap-2 text-[13px] text-[var(--muted,#6e6e73)]">
                <span aria-hidden="true" className="text-[var(--accent-strong,#0b8f53)]">•</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/onboarding?from=guest"
              onClick={() =>
                guestEvent("guest_cta_click", { cta: "distribution_notice_onboarding", route: "/distribution" })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent,#12b46c)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
            >
              {t.cta}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-[12px] font-medium text-[var(--muted,#6e6e73)] hover:text-[var(--ink,#111111)]"
            >
              {t.stay}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.dismiss}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[var(--muted,#6e6e73)] hover:bg-[rgba(0,0,0,0.04)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
