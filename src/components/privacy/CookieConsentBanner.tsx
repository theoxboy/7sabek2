"use client";

import { useCallback, useEffect, useState } from "react";
import { getCookieConsent, hasCookieConsent, setCookieConsent } from "@/lib/cookie-consent";
import { X } from "lucide-react";

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
}: CookieConsentBannerProps): JSX.Element | null {
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
    setCookieConsent({ analytics: true });
    setIsVisible(false);
  }, []);

  const handleRejectNonEssential = useCallback(() => {
    setCookieConsent({ analytics: false });
    setIsVisible(false);
  }, []);

  const handleManagePreferences = useCallback(() => {
    onManagePreferences();
    setIsVisible(false);
  }, [onManagePreferences]);

  if (!isHydrated || !isVisible) {
    return null;
  }

  const isRTL = locale === "ar";

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 p-4 ${isRTL ? "dir-rtl" : "dir-ltr"}`}
      style={{ direction: isRTL ? "rtl" : "ltr" }}
    >
      <div className="mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-lg sm:max-w-lg">
        {/* Header with title and close button */}
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{copy.title}</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="ml-2 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <p className="mb-4 text-xs leading-5 text-gray-600">{copy.description}</p>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handleAcceptAnalytics}
            className="rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {copy.acceptAnalytics}
          </button>
          <button
            onClick={handleRejectNonEssential}
            className="rounded bg-gray-200 px-3 py-2 text-xs font-medium text-gray-900 hover:bg-gray-300 transition-colors"
          >
            {copy.rejectNonEssential}
          </button>
          <button
            onClick={handleManagePreferences}
            className="rounded border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copy.managePreferences}
          </button>
        </div>
      </div>
    </div>
  );
}
