"use client";

import { useEffect, useState } from "react";

import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";

export const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";

export function useAppLocale(defaultLocale: FloussyLocale = "en") {
  // Keep SSR and first CSR render deterministic to avoid hydration mismatches.
  const [locale, setLocale] = useState<FloussyLocale>(defaultLocale);

  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? defaultLocale);
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, [defaultLocale]);

  return { locale, dir: getLocaleDirection(locale) };
}

export function useForceArabicDocumentFont(enabled: boolean, bodyClassName: string) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;
    const previousLang = root.lang;
    const previousDir = root.dir;
    const previousRootFont = root.style.fontFamily;
    const previousBodyFont = body.style.fontFamily;
    const styleId = `${bodyClassName}-cairo-runtime-style`;

    if (enabled) {
      const existingStyle = document.getElementById(styleId);
      if (!existingStyle) {
        const styleTag = document.createElement("style");
        styleTag.id = styleId;
        styleTag.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap');

          body.${bodyClassName},
          body.${bodyClassName} * {
            font-family: "Cairo", sans-serif !important;
            font-optical-sizing: auto;
            letter-spacing: 0 !important;
          }

          body.${bodyClassName} svg,
          body.${bodyClassName} button svg,
          body.${bodyClassName} a svg {
            font-family: initial !important;
          }
        `;
        document.head.appendChild(styleTag);
      }

      root.lang = "ar";
      root.dir = "rtl";
      root.style.fontFamily = '"Cairo", sans-serif';
      body.style.fontFamily = '"Cairo", sans-serif';
      body.classList.add(bodyClassName);
    } else {
      root.lang = previousLang || "fr";
      root.dir = previousDir || "ltr";
      root.style.fontFamily = '"Cairo", var(--font-cairo), sans-serif';
      body.style.fontFamily = '"Cairo", var(--font-cairo), sans-serif';
      body.classList.remove(bodyClassName);
      const runtimeStyle = document.getElementById(styleId);
      if (runtimeStyle) runtimeStyle.remove();
    }

    return () => {
      root.lang = previousLang || "fr";
      root.dir = previousDir || "ltr";
      root.style.fontFamily = '"Cairo", var(--font-cairo), sans-serif';
      body.style.fontFamily = '"Cairo", var(--font-cairo), sans-serif';
      body.classList.remove(bodyClassName);
      const runtimeStyle = document.getElementById(styleId);
      if (runtimeStyle) runtimeStyle.remove();
    };
  }, [bodyClassName, enabled]);
}
