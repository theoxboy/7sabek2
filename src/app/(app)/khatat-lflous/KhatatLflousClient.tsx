"use client";

import dynamic from "next/dynamic";

const MoneyPlanPageContent = dynamic(
  () =>
    import("../beta/onboarding-v2/page").then((module) => module.BetaOnboardingV2PageContent),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center px-6" dir="rtl">
        <div className="rounded-[28px] border border-[#e5e5ea] bg-[var(--surface)] px-6 py-8 text-center shadow-[0_24px_70px_-48px_rgba(0,0,0,0.24)]">
          <p className="text-[15px] font-semibold text-[#111111]">كنوجد خطة الفلوس ديالك…</p>
          <p className="mt-2 text-[14px] text-[#6e6e73]">غير ثواني ونبيّنو ليك مراحل الخطة.</p>
        </div>
      </div>
    ),
  }
);

export default function KhatatLflousClient() {
  return <MoneyPlanPageContent journeyMode="money_plan" />;
}
