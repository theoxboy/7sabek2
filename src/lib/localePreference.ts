export const LOCALE_COOKIE_NAME = "floussy_locale";

export type FloussyLocale = "fr" | "en" | "ar";

export const FL_LOCALES: FloussyLocale[] = ["fr", "en", "ar"];

export const FL_LOCALE_LABELS: Record<FloussyLocale, string> = {
  fr: "FR",
  en: "EN",
  ar: "دارجة",
};

export const FL_LOCALE_NATIVE_LABELS: Record<FloussyLocale, string> = {
  fr: "Francais",
  en: "English",
  ar: "العربية المغربية (الدارجة)",
};

export function isSupportedLocale(value: string | null | undefined): value is FloussyLocale {
  return Boolean(value && FL_LOCALES.includes(value as FloussyLocale));
}

export function getLocaleDirection(locale: FloussyLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function readLocaleCookie(cookieString: string): FloussyLocale | null {
  const match = cookieString.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]+)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isSupportedLocale(value) ? value : null;
}

export function buildLocaleCookie(locale: FloussyLocale) {
  const maxAge = 60 * 60 * 24 * 365;
  return `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function persistLocaleCookie(locale: FloussyLocale) {
  if (typeof document === "undefined") return;
  document.cookie = buildLocaleCookie(locale);
}
