/**
 * Palier 5 — the fragile contexts where L1 (localStorage / IndexedDB) is
 * actively purged by the browser, so a guest can lose their budget without ever
 * doing anything wrong.
 *
 * The one that matters in practice: Safari on iOS, app NOT installed to the home
 * screen. ITP wipes script-writable storage after 7 days without a visit.
 * Installing the PWA takes the app out of that sweep.
 */

export type FragileContext =
  | { fragile: false }
  | { fragile: true; reason: "safari_ios_not_installed" };

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  } catch {
    /* ignore */
  }
  // iOS Safari exposes this non-standard flag when launched from the home screen.
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function detectFragileContext(): FragileContext {
  if (typeof window === "undefined") return { fragile: false };
  const ua = window.navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac; the touch-points check disambiguates.
    (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
  const isRealSafari =
    /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(ua);

  if (isIOS && isRealSafari && !isStandalone()) {
    return { fragile: true, reason: "safari_ios_not_installed" };
  }
  return { fragile: false };
}
