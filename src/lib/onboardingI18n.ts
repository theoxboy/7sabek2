/**
 * Language of the onboarding and money-plan screens.
 *
 * The screens were written in Darija. Two tools translate them without
 * touching any string the code compares or stores:
 *  - `tx(darija)`: looks a static Darija text up in the dictionary, at the
 *    moment it is displayed. Missing entries fall back to Darija, never throw.
 *  - `t(ar, fr, en)`: for texts built with values (amounts, names, counts).
 *
 * The active locale is the one chosen at sign-up (locale cookie). The page
 * sets it at render time, before questions are built.
 */

import { ONBOARDING_TRANSLATIONS } from "./onboardingTranslations.ts";

export type OnboardingLocale = "fr" | "en" | "ar";

let activeLocale: OnboardingLocale = "ar";

export function setOnboardingLocale(locale: OnboardingLocale): void {
  activeLocale = locale;
}

export function getOnboardingLocale(): OnboardingLocale {
  return activeLocale;
}

export function t(ar: string, fr: string, en: string): string {
  if (activeLocale === "fr") return fr;
  if (activeLocale === "en") return en;
  return ar;
}

export function tx(text: string): string;
export function tx(text: string | undefined): string | undefined;
export function tx(text: string | undefined): string | undefined {
  if (text === undefined || activeLocale === "ar") return text;
  const entry = ONBOARDING_TRANSLATIONS[text.trim()];
  if (!entry) return text;
  return activeLocale === "fr" ? entry.fr : entry.en;
}

/** Whether a static Darija text has a translation (used by tests). */
export function hasOnboardingTranslation(text: string): boolean {
  return Boolean(ONBOARDING_TRANSLATIONS[text.trim()]);
}
