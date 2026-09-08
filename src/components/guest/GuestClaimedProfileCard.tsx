"use client";

import { useState } from "react";
import Link from "next/link";
import { UserRound, X } from "lucide-react";

import type { FloussyLocale } from "@/lib/localePreference";
import type { AuthUser } from "@/lib/auth";

type Props = {
  user: AuthUser;
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
};

const DISMISS_KEY = "7sabek.claimed_profile_card.dismissed";

const COPY: Record<
  FloussyLocale,
  { title: string; body: string; cta: string; dismiss: string }
> = {
  fr: {
    title: "Complète ton profil",
    body: "Ton compte est créé et tes enveloppes sont gardées. Ajoute ton prénom et ta photo quand tu veux — ça prend une minute.",
    cta: "Compléter mon profil",
    dismiss: "Fermer",
  },
  en: {
    title: "Finish your profile",
    body: "Your account is created and your envelopes are kept. Add your first name and photo whenever you like — it takes a minute.",
    cta: "Complete my profile",
    dismiss: "Dismiss",
  },
  ar: {
    title: "كمّل البروفيل ديالك",
    body: "الحساب ديالك تصاوب والأظرفة ديالك محفوظين. زيد سميتك وتصويرة ملي بغيتي — كتاخد دقيقة.",
    cta: "نكمّل البروفيل",
    dismiss: "سدّ",
  },
};

/**
 * Shown on the dashboard to someone who turned a "Mode Découverte" guest into a
 * real account: the claim skips onboarding by design, so the profile step
 * (first name, photo) was never asked. Dismissible, once.
 */
export function GuestClaimedProfileCard({ user, locale, dir }: Props) {
  const t = COPY[locale] ?? COPY.fr;
  const [dismissed, setDismissed] = useState(false);

  const storedDismissed = (() => {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  })();

  if (dismissed || storedDismissed || user.first_name) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto mb-4 w-full max-w-3xl px-1">
      <div
        dir={dir}
        className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card,var(--surface))] p-4"
      >
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[var(--accent-soft,rgba(23,199,119,0.14))] text-[var(--accent-strong,var(--accent))]"
        >
          <UserRound className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[var(--ink)]">{t.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{t.body}</p>
          <Link
            href="/settings"
            className="mt-2 inline-block text-[13px] font-semibold text-[var(--accent-strong,var(--accent))] hover:underline"
          >
            {t.cta}
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.dismiss}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2,rgba(0,0,0,0.04))] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
