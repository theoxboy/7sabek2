"use client";

import Link from "next/link";
import { ArrowRight, PieChart } from "lucide-react";

import type { FloussyLocale } from "@/lib/localePreference";
import { guestEvent } from "@/lib/guestAnchorApi";

type Props = {
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
};

const COPY: Record<
  FloussyLocale,
  { eyebrow: string; title: string; body: string; cta: string }
> = {
  fr: {
    eyebrow: "Mode découverte",
    title: "Répartis ton revenu dans tes enveloppes",
    body: "Dis-nous comment ton salaire se partage, et on crée les enveloppes qu'il faut. Tout est gardé si tu crées ton compte plus tard.",
    cta: "Répartir mon revenu",
  },
  en: {
    eyebrow: "Discovery mode",
    title: "Split your income across your envelopes",
    body: "Tell us how your salary is shared out and we create the envelopes for you. Everything is kept if you create your account later.",
    cta: "Split my income",
  },
  ar: {
    eyebrow: "وضع الاكتشاف",
    title: "قسّم دخلك على الأظرفة ديالك",
    body: "قول لينا كيفاش كيتقسم الراتب ديالك، وحنا نصاوبو ليك الأظرفة اللي خاصك. كلشي كيتحفظ إلا صاوبتي حسابك من بعد.",
    cta: "قسّم دخلي",
  },
};

/**
 * Entry point shown on the guest dashboard: the one thing a "Mode Découverte"
 * guest is here to do — split income into envelopes. Links to the money-plan
 * journey, which a guest can now run end to end.
 */
export function GuestDistributionCard({ locale, dir }: Props) {
  const t = COPY[locale] ?? COPY.fr;

  return (
    <div className="mx-auto mb-4 w-full max-w-3xl px-1">
      <Link
        href="/khatat-lflous"
        dir={dir}
        onClick={() => guestEvent("guest_cta_click", { cta: "distribution_card", route: "/dashboard" })}
        className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card,var(--surface))] p-4 transition-colors hover:border-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[var(--accent-soft,rgba(23,199,119,0.14))] text-[var(--accent-strong,var(--accent))]"
        >
          <PieChart className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-[var(--accent-strong,var(--accent))]">
            {t.eyebrow}
          </span>
          <span className="mt-0.5 block text-[15px] font-semibold text-[var(--ink)]">
            {t.title}
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-[var(--muted)]">
            {t.body}
          </span>
        </span>
        <span className="flex flex-none items-center gap-1.5 text-[13px] font-semibold text-[var(--accent-strong,var(--accent))]">
          <span className="hidden sm:inline">{t.cta}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}
