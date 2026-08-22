"use client";

import { useState } from "react";
import { CookieConsentBanner } from "./CookieConsentBanner";
import { CookiePreferencesModal } from "./CookiePreferencesModal";

type Locale = "ar" | "fr" | "en";

interface CookieConsentManagerProps {
  locale: Locale;
}

export function CookieConsentManager({ locale }: CookieConsentManagerProps) {
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  return (
    <>
      <CookieConsentBanner
        locale={locale}
        onManagePreferences={() => setIsPreferencesOpen(true)}
      />
      <CookiePreferencesModal
        isOpen={isPreferencesOpen}
        locale={locale}
        onClose={() => setIsPreferencesOpen(false)}
      />
    </>
  );
}
