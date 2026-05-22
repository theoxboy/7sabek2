"use client";

import { useCallback, useEffect, useState } from "react";
import { getCookieConsent, setCookieConsent } from "@/lib/cookie-consent";
import { X } from "lucide-react";

type Locale = "ar" | "fr" | "en";

const PREFERENCES_MODAL_COPY: Record<Locale, Record<string, string>> = {
  ar: {
    title: "تفضيلات الكوكيز",
    necessaryTitle: "كوكيز ضرورية",
    necessaryDescription: "هادو ضروريين باش يخدم الموقع وما يقدروش يتحيدو.",
    analyticsTitle: "كوكيز التحليلات",
    analyticsDescription:
      "كيعاونونا نفهمو كيفاش كيتستعمل الموقع ونحسنو الأداء والتجربة.",
    saveChoices: "حفظ الاختيارات",
    cancel: "إلغاء",
  },
  fr: {
    title: "Préférences des cookies",
    necessaryTitle: "Cookies nécessaires",
    necessaryDescription:
      "Ils sont indispensables au fonctionnement du site et ne peuvent pas être désactivés.",
    analyticsTitle: "Cookies analytiques",
    analyticsDescription:
      "Ils nous aident à comprendre comment le site est utilisé afin d'améliorer les performances et l'expérience utilisateur.",
    saveChoices: "Enregistrer mes choix",
    cancel: "Annuler",
  },
  en: {
    title: "Cookie Preferences",
    necessaryTitle: "Necessary cookies",
    necessaryDescription:
      "These cookies are required for the website to function properly and cannot be disabled.",
    analyticsTitle: "Analytics cookies",
    analyticsDescription:
      "These cookies help us understand how the site is used so we can improve performance and user experience.",
    saveChoices: "Save my choices",
    cancel: "Cancel",
  },
};

interface CookiePreferencesModalProps {
  isOpen: boolean;
  locale: Locale;
  onClose: () => void;
}

export function CookiePreferencesModal({
  isOpen,
  locale,
  onClose,
}: CookiePreferencesModalProps) {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const copy = PREFERENCES_MODAL_COPY[locale] || PREFERENCES_MODAL_COPY.en;
  const isRTL = locale === "ar";

  useEffect(() => {
    setIsHydrated(true);
    // Load current consent settings
    const consent = getCookieConsent();
    if (consent) {
      setAnalyticsEnabled(consent.analytics);
    }
  }, [isOpen]);

  const handleSaveChoices = useCallback(() => {
    setCookieConsent({ necessary: true, analytics: analyticsEnabled });
    onClose();
  }, [analyticsEnabled, onClose]);

  if (!isHydrated || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className="w-full max-w-sm rounded-lg bg-white shadow-xl"
        style={{ direction: isRTL ? "rtl" : "ltr" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">{copy.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Necessary Cookies Row */}
          <div className="mb-4 flex items-start justify-between">
            <div className={`flex-1 ${isRTL ? "ml-3" : "mr-3"}`}>
              <h3 className="text-sm font-medium text-gray-900">
                {copy.necessaryTitle}
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                {copy.necessaryDescription}
              </p>
            </div>
            <div className="flex-shrink-0">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="h-4 w-4 rounded border-gray-300 bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Analytics Cookies Row */}
          <div className="flex items-start justify-between border-t border-gray-200 pt-4">
            <div className={`flex-1 ${isRTL ? "ml-3" : "mr-3"}`}>
              <h3 className="text-sm font-medium text-gray-900">
                {copy.analyticsTitle}
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                {copy.analyticsDescription}
              </p>
            </div>
            <div className="flex-shrink-0">
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copy.cancel}
          </button>
          <button
            onClick={handleSaveChoices}
            className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {copy.saveChoices}
          </button>
        </div>
      </div>
    </div>
  );
}
