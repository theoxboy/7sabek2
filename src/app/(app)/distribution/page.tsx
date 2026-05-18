import type { Metadata } from "next";
import { cookies } from "next/headers";
import DistributionClient from "./DistributionClient";
import { LOCALE_COOKIE_NAME, isSupportedLocale, type FloussyLocale } from "@/lib/localePreference";

const META_COPY: Record<FloussyLocale, Metadata> = {
  fr: {
    title: "Distribution | Votre compte",
    description: "Configurer les règles de distribution pour les enveloppes flexibles.",
  },
  en: {
    title: "Distribution | Your account",
    description: "Configure distribution rules for flexible envelopes.",
  },
  ar: {
    title: "التوزيع | حسابك",
    description: "إعداد قواعد توزيع الدخل على الأظرفة المرنة.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = isSupportedLocale(cookieLocale) ? cookieLocale : "fr";
  return META_COPY[locale];
}

export default function DistributionPage() {
  return <DistributionClient />;
}
