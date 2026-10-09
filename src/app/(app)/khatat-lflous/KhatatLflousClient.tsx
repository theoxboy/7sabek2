"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { FloussyLocale } from "@/lib/localePreference";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";

const MoneyPlanPageContent = dynamic<{ journeyMode?: string }>(
  () =>
    import("../beta/onboarding-v2/page").then(
      (module: any) =>
        module.BetaOnboardingV2PageContent ||
        module.default?.BetaOnboardingV2PageContent ||
        module.default
    ),
  {
    ssr: false,
    loading: () => <MoneyPlanLoadingCard />,
  }
);

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const LOADING_COPY: Record<FloussyLocale, { title: string; body: string }> = {
  fr: {
    title: "Préparation de votre plan…",
    body: "Encore quelques secondes.",
  },
  en: {
    title: "Preparing your plan…",
    body: "Just a few seconds.",
  },
  ar: {
    title: "كنوجد خطة الفلوس ديالك…",
    body: "غير ثواني.",
  },
};

function MoneyPlanLoadingCard() {
  const [locale, setLocale] = useState<FloussyLocale>("fr");

  useEffect(() => {
    const sync = () => setLocale(getBrowserLocalePreference() ?? "fr");
    sync();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, sync);
  }, []);

  const copy = LOADING_COPY[locale];

  return (
    <div className="flex min-h-screen items-center justify-center px-6" dir="auto">
      <div className="rounded-[28px] border border-[#e5e5ea] bg-[var(--surface)] px-6 py-8 text-center shadow-[0_24px_70px_-48px_rgba(0,0,0,0.24)]">
        <p className="text-[15px] font-semibold text-[#111111]">{copy.title}</p>
        <p className="mt-2 text-[14px] text-[#6e6e73]">{copy.body}</p>
      </div>
    </div>
  );
}

export default function KhatatLflousClient() {
  return <MoneyPlanPageContent journeyMode="money_plan" />;
}
