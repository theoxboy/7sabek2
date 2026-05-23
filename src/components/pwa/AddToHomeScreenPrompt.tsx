"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { COOKIE_CONSENT_UPDATED_EVENT, hasCookieConsent } from "@/lib/cookie-consent";
import { useAppLocale } from "@/lib/appLocale";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type Locale = "ar" | "fr" | "en";
type Platform = "ios" | "android" | "other";

const NEVER_SHOW_KEY = "7sabek_pwa_prompt_never_show_v1";
const DISMISSED_UNTIL_KEY = "7sabek_pwa_prompt_dismissed_until_v1";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 2500;
const CONSENT_WAIT_MS = 3000;

const COPY: Record<
  Locale,
  {
    title: string;
    body: string;
    iosSteps: string;
    androidSteps: string;
    androidInstallButton: string;
    understood: string;
    hideNow: string;
    neverShow: string;
  }
> = {
  ar: {
    title: "خلي 7sabek قريب ليك",
    body: "زيد 7sabek للشاشة الرئيسية وفتحو بحال تطبيق.",
    iosSteps: "فـ Safari ضغط على زر المشاركة، ومن بعد اختار Add to Home Screen.",
    androidSteps: "فـ Chrome ضغط على القائمة ⋮، ومن بعد اختار Add to Home screen.",
    androidInstallButton: "ثبّت 7sabek",
    understood: "فهمت",
    hideNow: "ما تبانش دابا",
    neverShow: "ما تبانش ليا هاد الرسالة مرة أخرى",
  },
  fr: {
    title: "Garde 7sabek à portée de main",
    body: "Ajoute 7sabek à l’écran d’accueil et ouvre-le comme une application.",
    iosSteps: "Sur Safari, appuie sur Partager, puis choisis Ajouter à l’écran d’accueil.",
    androidSteps: "Sur Chrome, ouvre le menu ⋮, puis choisis Ajouter à l’écran d’accueil.",
    androidInstallButton: "Installer 7sabek",
    understood: "Compris",
    hideNow: "Masquer pour le moment",
    neverShow: "Ne plus afficher ce message",
  },
  en: {
    title: "Keep 7sabek close",
    body: "Add 7sabek to your home screen and open it like an app.",
    iosSteps: "In Safari, tap Share, then choose Add to Home Screen.",
    androidSteps: "In Chrome, open the ⋮ menu, then choose Add to Home screen.",
    androidInstallButton: "Install 7sabek",
    understood: "Got it",
    hideNow: "Hide for now",
    neverShow: "Don’t show this message again",
  },
};

function detectPlatform(ua: string): Platform {
  const lowerUA = ua.toLowerCase();
  const iOS = /iphone|ipad|ipod/.test(lowerUA);
  const android = /android/.test(lowerUA);
  if (iOS) return "ios";
  if (android) return "android";
  return "other";
}

function isMobileUA(ua: string): boolean {
  return /iphone|ipad|ipod|android|mobile/i.test(ua.toLowerCase());
}

function getLocaleFromDocument(): Locale {
  if (typeof document === "undefined") return "ar";
  const lang = document.documentElement.lang?.toLowerCase();
  if (lang?.startsWith("fr")) return "fr";
  if (lang?.startsWith("en")) return "en";
  return "ar";
}

export default function AddToHomeScreenPrompt() {
  const { locale: appLocale, dir } = useAppLocale("ar");
  const [mounted, setMounted] = useState(false);
  const [canShowByConsent, setCanShowByConsent] = useState(false);
  const [cookieConsentStatus, setCookieConsentStatus] = useState<"accepted" | "missing">("missing");
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [neverShowChecked, setNeverShowChecked] = useState(false);
  const [entered, setEntered] = useState(false);

  const locale: Locale = (appLocale === "fr" || appLocale === "en" || appLocale === "ar"
    ? appLocale
    : getLocaleFromDocument()) as Locale;
  const copy = COPY[locale];
  const isRTL = dir === "rtl";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkConsent = () => {
      const consentAccepted = hasCookieConsent();
      setCookieConsentStatus(consentAccepted ? "accepted" : "missing");
      if (consentAccepted) {
        setCanShowByConsent(true);
      }
    };

    checkConsent();
    const interval = window.setInterval(checkConsent, 1000);
    const consentFallback = window.setTimeout(() => {
      if (!hasCookieConsent()) {
        // Avoid waiting forever when the cookie banner is absent or dismissed without state write.
        setCanShowByConsent(true);
      }
    }, CONSENT_WAIT_MS);
    const onStorage = () => checkConsent();
    const onConsentUpdated = () => checkConsent();
    window.addEventListener("storage", onStorage);
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(consentFallback);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, onConsentUpdated);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const ua = window.navigator.userAgent;
    const detectedPlatform = detectPlatform(ua);
    const standaloneByDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    setPlatform(detectedPlatform);
    setIsStandalone(standaloneByDisplayMode || iosStandalone);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, [mounted]);

  const saveDismissState = useCallback(
    (useNeverShow: boolean) => {
      if (!mounted) return;
      if (useNeverShow) {
        localStorage.setItem(NEVER_SHOW_KEY, "true");
      } else {
        localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + DISMISS_MS));
      }
    },
    [mounted]
  );

  const dismissPrompt = useCallback(() => {
    saveDismissState(neverShowChecked);
    setVisible(false);
  }, [neverShowChecked, saveDismissState]);

  const shouldRender = useMemo(() => {
    if (!mounted || !canShowByConsent) return false;

    const forceByQuery =
      process.env.NODE_ENV === "development" &&
      new URLSearchParams(window.location.search).get("showPwaPrompt") === "1";

    if (isStandalone) return false;

    const ua = window.navigator.userAgent;
    const isMobile = isMobileUA(ua);
    const isIOS = platform === "ios";
    const isAndroid = platform === "android";

    if (!forceByQuery) {
      if (!isMobile) return false;
      if (!isIOS && !isAndroid) return false;
    }

    const neverShow = localStorage.getItem(NEVER_SHOW_KEY) === "true";
    if (neverShow) return false;
    const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) ?? "0");
    if (Number.isFinite(dismissedUntil) && dismissedUntil > Date.now()) return false;

    return true;
  }, [mounted, canShowByConsent, platform, isStandalone]);

  useEffect(() => {
    if (!mounted || process.env.NODE_ENV !== "development") return;
    const ua = window.navigator.userAgent;
    const isMobile = isMobileUA(ua);
    const isIOS = platform === "ios";
    const isAndroid = platform === "android";
    const neverShow = localStorage.getItem(NEVER_SHOW_KEY) === "true";
    const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) ?? "0");
    const forceByQuery = new URLSearchParams(window.location.search).get("showPwaPrompt") === "1";
    const shouldShow = shouldRender;
    const helper = [
      `localStorage.removeItem("${NEVER_SHOW_KEY}")`,
      `localStorage.removeItem("${DISMISSED_UNTIL_KEY}")`,
    ].join("; ");
    console.debug("[PWA Prompt] state", {
      isMounted: mounted,
      isMobile,
      isIOS,
      isAndroid,
      isStandalone,
      neverShow,
      dismissedUntil,
      shouldShow,
      cookieConsentStatus,
      forceByQuery,
    });
    console.debug("[PWA Prompt] clear localStorage helper:", helper);
  }, [mounted, platform, isStandalone, shouldRender, cookieConsentStatus]);

  useEffect(() => {
    if (!shouldRender) {
      setVisible(false);
      setEntered(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [shouldRender]);

  useEffect(() => {
    if (!visible) {
      setEntered(false);
      return;
    }
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissPrompt();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, dismissPrompt]);

  const handleAndroidInstall = useCallback(async () => {
    if (!deferredPrompt) {
      dismissPrompt();
      return;
    }

    await deferredPrompt.prompt();
    const choice = deferredPrompt.userChoice ? await deferredPrompt.userChoice : null;

    if (choice?.outcome === "accepted") {
      setVisible(false);
      return;
    }

    saveDismissState(neverShowChecked);
    setVisible(false);
  }, [deferredPrompt, dismissPrompt, neverShowChecked, saveDismissState]);

  if (!mounted || !visible) return null;

  const showAndroidInstallButton = platform === "android" && Boolean(deferredPrompt);
  const instructions = platform === "ios" ? copy.iosSteps : copy.androidSteps;
  const dialogTitleId = "a2hs-title";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[45] px-4" dir={isRTL ? "rtl" : "ltr"}>
      <div
        role="dialog"
        aria-labelledby={dialogTitleId}
        aria-label={copy.title}
        className={`pointer-events-auto mx-auto w-full max-w-md rounded-2xl border border-[#e5e7eb] bg-[#fcfcff] p-4 shadow-[0_20px_45px_-28px_rgba(47,32,85,0.45)] transition-all duration-200 ease-out ${
          entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <h3 id={dialogTitleId} className="text-base font-semibold text-[#2f2055]">
          {copy.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#374151]">{copy.body}</p>
        <p className="mt-2 text-sm leading-6 text-[#4b5563]">{instructions}</p>

        <label className="mt-4 flex items-start gap-2 text-sm text-[#374151]">
          <input
            type="checkbox"
            checked={neverShowChecked}
            onChange={(event) => setNeverShowChecked(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#2f2055]"
          />
          <span>{copy.neverShow}</span>
        </label>

        <div className="mt-4 flex items-center gap-2">
          {showAndroidInstallButton ? (
            <button
              type="button"
              onClick={handleAndroidInstall}
              className="rounded-lg bg-[#2f2055] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#241844]"
            >
              {copy.androidInstallButton}
            </button>
          ) : (
            <button
              type="button"
              onClick={dismissPrompt}
              className="rounded-lg bg-[#2f2055] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#241844]"
            >
              {copy.understood}
            </button>
          )}
          <button
            type="button"
            onClick={dismissPrompt}
            className="rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#374151] transition-colors hover:bg-[#f9fafb]"
          >
            {copy.hideNow}
          </button>
        </div>
      </div>
    </div>
  );
}
