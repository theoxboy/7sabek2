import type { Metadata } from "next";
import { cookies } from "next/headers";
import KhatatLflousClient from "./KhatatLflousClient";
import { LOCALE_COOKIE_NAME, isSupportedLocale, type FloussyLocale } from "@/lib/localePreference";

const META_COPY: Record<FloussyLocale, Metadata> = {
  fr: {
    title: "Plan d’argent | Votre compte",
    description: "Guidage, enveloppes et regles intelligentes pour votre plan.",
  },
  en: {
    title: "Money plan | Your account",
    description: "Guidance, envelopes, and smart settings for your plan.",
  },
  ar: {
    title: "خطة الفلوس | حسابك",
    description: "التوجيه، الأظرفة، والإعدادات الذكية ديال الفلوس ديالك.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = isSupportedLocale(cookieLocale) ? cookieLocale : "fr";
  return META_COPY[locale];
}

export default function KhatatLflousPage() {
  return <KhatatLflousClient />;
}
