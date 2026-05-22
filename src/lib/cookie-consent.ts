/**
 * Cookie Consent Management Utility
 * Handles storing and retrieving user cookie consent preferences
 * Storage key: "7sabek_cookie_consent_v1"
 */

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  updatedAt: string;
  version: number;
};

const STORAGE_KEY = "7sabek_cookie_consent_v1";
const CURRENT_VERSION = 1;

/**
 * Get the current cookie consent from localStorage
 * Returns null if not set or invalid
 */
export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as unknown;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "necessary" in parsed &&
      "analytics" in parsed &&
      "version" in parsed &&
      "updatedAt" in parsed &&
      (parsed as Record<string, unknown>).necessary === true &&
      typeof (parsed as Record<string, unknown>).analytics === "boolean" &&
      typeof (parsed as Record<string, unknown>).version === "number" &&
      typeof (parsed as Record<string, unknown>).updatedAt === "string"
    ) {
      return parsed as CookieConsent;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Save cookie consent to localStorage
 */
export function setCookieConsent(consent: Omit<CookieConsent, "updatedAt" | "version">): CookieConsent {
  if (typeof window === "undefined") {
    throw new Error("setCookieConsent can only be called in the browser");
  }

  const consentData: CookieConsent = {
    necessary: true,
    analytics: consent.analytics,
    updatedAt: new Date().toISOString(),
    version: CURRENT_VERSION,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
  return consentData;
}

/**
 * Check if user has made a consent choice
 */
export function hasCookieConsent(): boolean {
  return getCookieConsent() !== null;
}

/**
 * Check if analytics consent is granted
 */
export function isAnalyticsConsentGranted(): boolean {
  const consent = getCookieConsent();
  return consent?.analytics === true;
}

/**
 * Clear consent (useful for testing or user reset)
 */
export function clearCookieConsent(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
