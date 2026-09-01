"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { FloussyLocale } from "@/lib/localePreference";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";

const DistributionPageContent = dynamic(
  () =>
    import("../beta/onboarding-v2/page").then((module) => module.BetaOnboardingV2PageContent),
  {
    ssr: false,
    loading: () => <DistributionLoadingCard />,
  }
);

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const DISTRIBUTION_INTRO_SEEN_KEY = "floussy.distribution.intro.seen";
const LOADING_COPY: Record<FloussyLocale, { title: string; body: string }> = {
  fr: {
    title: "Préparation de la page Distribution…",
    body: "Encore quelques secondes.",
  },
  en: {
    title: "Preparing Distribution…",
    body: "Just a few seconds.",
  },
  ar: {
    title: "كنوجد صفحة التوزيع ديالك…",
    body: "غير ثواني.",
  },
};

function DistributionLoadingCard() {
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

import { useQuickTx } from "@/state/QuickTxContext";
import { Button } from "@/components/ui/Button";
import { PageTour } from "@/components/tour/GlobalTour";
import { TourIntroDialog } from "@/components/tour/TourIntroDialog";
import { usePageTour } from "@/components/tour/usePageTour";

export default function DistributionClient() {
  const { openQuickTx } = useQuickTx();
  const [locale, setLocale] = useState<FloussyLocale>("fr");

  useEffect(() => {
    const sync = () => setLocale(getBrowserLocalePreference() ?? "fr");
    sync();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, sync);
  }, []);

  const incomeRef = useRef<HTMLButtonElement | null>(null);
  const planRef = useRef<HTMLDivElement | null>(null);
  const { tour, intro } = usePageTour(
    "distribution",
    {
      income: { ref: incomeRef },
      plan: { ref: planRef },
    },
    { autoStart: false }
  );

  const [introOpen, setIntroOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(DISTRIBUTION_INTRO_SEEN_KEY) !== "1";
    } catch {
      return true;
    }
  });

  const markIntroSeen = () => {
    try {
      window.localStorage.setItem(DISTRIBUTION_INTRO_SEEN_KEY, "1");
    } catch {
      /* ignore storage errors */
    }
  };

  const buttonLabel =
    locale === "ar"
      ? "＋ تصريح دخل"
      : locale === "en"
      ? "＋ Log Income"
      : "＋ Déclarer un revenu";

  return (
    <div className="relative min-h-screen">
      <PageTour tour={tour} />
      <TourIntroDialog
        open={introOpen}
        onOpenChange={(next) => {
          setIntroOpen(next);
          if (!next) markIntroSeen();
        }}
        onStart={() => {
          setIntroOpen(false);
          markIntroSeen();
          tour.startTour();
        }}
        content={intro}
      />
      <div className="absolute top-4 right-4 z-50">
        <Button
          ref={incomeRef}
          type="button"
          onClick={() => openQuickTx("income")}
          className="rounded-2xl bg-[var(--accent-strong)] hover:bg-[var(--accent)] text-white shadow-md font-semibold"
        >
          {buttonLabel}
        </Button>
      </div>
      <div ref={planRef}>
        <DistributionPageContent journeyMode="money_plan" />
      </div>
    </div>
  );
}
