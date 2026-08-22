"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCookieConsent, hasCookieConsent, setCookieConsent } from "@/lib/cookie-consent";
import { X, Cookie, ShieldCheck, Settings2 } from "lucide-react";

type Locale = "ar" | "fr" | "en";

const COOKIE_BANNER_COPY: Record<Locale, Record<string, string>> = {
  ar: {
    title: "الكوكيز والخصوصية",
    description:
      "كنستعملو الكوكيز الضرورية باش يخدم الموقع مزيان، وكوكيز التحليلات باش نحسنو تجربة 7sabek. باستعمالك للموقع، كتوافق على الكوكيز الضرورية، وتقدر تقبل أو ترفض كوكيز التحليلات.",
    acceptAnalytics: "قبول التحليلات",
    rejectNonEssential: "رفض غير الضروري",
    managePreferences: "إدارة التفضيلات",
  },
  fr: {
    title: "Cookies et confidentialité",
    description:
      "Nous utilisons des cookies nécessaires pour assurer le bon fonctionnement du site, ainsi que des cookies d'analyse pour comprendre l'utilisation de 7sabek et améliorer votre expérience.",
    acceptAnalytics: "Accepter les analyses",
    rejectNonEssential: "Refuser le non nécessaire",
    managePreferences: "Gérer mes préférences",
  },
  en: {
    title: "Cookies & Privacy",
    description:
      "We use necessary cookies to make the site work properly, and analytics cookies to understand how 7sabek is used and improve your experience.",
    acceptAnalytics: "Accept analytics",
    rejectNonEssential: "Reject non-essential",
    managePreferences: "Manage preferences",
  },
};

interface CookieConsentBannerProps {
  locale: Locale;
  onManagePreferences: () => void;
}

export function CookieConsentBanner({
  locale,
  onManagePreferences,
}: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const copy = COOKIE_BANNER_COPY[locale] || COOKIE_BANNER_COPY.en;

  useEffect(() => {
    setIsHydrated(true);
    // Only show banner if no consent has been set yet
    if (!hasCookieConsent()) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAnalytics = useCallback(() => {
    setCookieConsent({ necessary: true, analytics: true });
    setIsVisible(false);
  }, []);

  const handleRejectNonEssential = useCallback(() => {
    setCookieConsent({ necessary: true, analytics: false });
    setIsVisible(false);
  }, []);

  const handleManagePreferences = useCallback(() => {
    onManagePreferences();
    setIsVisible(false);
  }, [onManagePreferences]);

  if (!isHydrated) {
    return null;
  }

  const isRTL = locale === "ar";

  // Desktop positioning: floats bottom-left on RTL, bottom-right on LTR
  const positionClasses = isRTL
    ? "sm:left-6 sm:right-auto"
    : "sm:right-6 sm:left-auto";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-[calc(100vw-2rem)] sm:mx-0 sm:max-w-md md:max-w-[460px] ${positionClasses}`}
          style={{ direction: isRTL ? "rtl" : "ltr" }}
        >
          <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_20px_50px_rgba(7,58,52,0.15)] backdrop-blur-md sm:p-6">
            {/* Top decorative glass gradient */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-100/40 blur-2xl" />

            <div className="flex items-start gap-4">
              {/* Floating icon */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/60 shadow-sm">
                <Cookie className="h-6 w-6 animate-pulse" />
              </div>

              <div className="flex-1">
                {/* Header title */}
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {copy.title}
                  </h3>
                  <button
                    onClick={() => setIsVisible(false)}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Description */}
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {copy.description}
                </p>
              </div>
            </div>

            {/* Separator line */}
            <hr className="my-4 border-slate-100" />

            {/* Action buttons */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={handleAcceptAnalytics}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#10b981] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#059669] transition duration-200 shadow-sm shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
              >
                <ShieldCheck className={`h-4 w-4 ${isRTL ? "ml-1.5" : "mr-1.5"}`} />
                {copy.acceptAnalytics}
              </button>
              
              <button
                onClick={handleRejectNonEssential}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-4 py-2.5 text-xs font-bold transition duration-200 active:scale-[0.98] cursor-pointer"
              >
                {copy.rejectNonEssential}
              </button>

              <button
                onClick={handleManagePreferences}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 p-2.5 text-xs font-semibold transition duration-200 active:scale-[0.98] cursor-pointer"
                title={copy.managePreferences}
                aria-label={copy.managePreferences}
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
