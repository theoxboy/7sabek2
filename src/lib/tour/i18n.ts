"use client";

import type { FloussyLocale } from "@/lib/localePreference";

/**
 * Chrome strings for the guided-tour overlay and the pre-tour intro dialog
 * (buttons, progress label, the off-screen fallback card). Step and intro
 * copy still come from `src/lib/tour/content.ts` — only the shared furniture
 * is localized here.
 */
export type TourChromeStrings = {
  stepOf: (current: number, total: number) => string;
  guideBadge: string;
  offscreenTitle: string;
  offscreenBody: (direction: "up" | "down") => string;
  recenter: string;
  skip: string;
  back: string;
  next: string;
  finish: string;
  /** Intro dialog */
  introEyebrowFallback: string;
  introStart: string;
  introLater: string;
};

export const TOUR_CHROME: Record<FloussyLocale, TourChromeStrings> = {
  fr: {
    stepOf: (current, total) => `Étape ${current}/${total}`,
    guideBadge: "Guide",
    offscreenTitle: "Étape hors écran",
    offscreenBody: (direction) =>
      `Fais défiler vers le ${direction === "up" ? "haut" : "bas"} pour retrouver l’élément de cette étape.`,
    recenter: "Recentrer l’étape",
    skip: "Passer pour le moment",
    back: "Avant",
    next: "Suivant",
    finish: "Terminer",
    introEyebrowFallback: "Guide 7sabek",
    introStart: "Démarrer le guide",
    introLater: "Plus tard",
  },
  en: {
    stepOf: (current, total) => `Step ${current}/${total}`,
    guideBadge: "Guide",
    offscreenTitle: "Step off-screen",
    offscreenBody: (direction) =>
      `Scroll ${direction} to bring this step's element back into view.`,
    recenter: "Recenter step",
    skip: "Skip for now",
    back: "Back",
    next: "Next",
    finish: "Done",
    introEyebrowFallback: "7sabek guide",
    introStart: "Start the guide",
    introLater: "Later",
  },
  ar: {
    stepOf: (current, total) => `الخطوة ${current}/${total}`,
    guideBadge: "المرشد",
    offscreenTitle: "الخطوة خارج الشاشة",
    offscreenBody: (direction) =>
      `${direction === "up" ? "زيد لفوق" : "نزل لتحت"} باش تلقى العنصر ديال هاد الخطوة.`,
    recenter: "رجّع الخطوة للوسط",
    skip: "تجاوز دابا",
    back: "اللّي قبل",
    next: "اللّي من بعد",
    finish: "سالينا",
    introEyebrowFallback: "دليل 7سابك",
    introStart: "بدا المرشد",
    introLater: "من بعد",
  },
};

export const getTourChrome = (locale: FloussyLocale): TourChromeStrings =>
  TOUR_CHROME[locale] ?? TOUR_CHROME.fr;
