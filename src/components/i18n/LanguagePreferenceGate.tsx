"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";

import {
  FL_LOCALE_LABELS,
  FL_LOCALE_NATIVE_LABELS,
  getLocaleDirection,
  isSupportedLocale,
  persistLocaleCookie,
  readLocaleCookie,
  type FloussyLocale,
} from "@/lib/localePreference";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

const OPEN_LANGUAGE_PICKER_EVENT = "floussy:open-language-picker";
const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const LOCALE_LOCAL_STORAGE_KEY = "floussy_locale_pref";

function applyDocumentLocale(locale: FloussyLocale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = getLocaleDirection(locale);
}

export function openLanguagePicker() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_LANGUAGE_PICKER_EVENT));
}

export function getBrowserLocalePreference(): FloussyLocale | null {
  if (typeof document === "undefined") return null;
  const cookieLocale = readLocaleCookie(document.cookie);
  if (cookieLocale) return cookieLocale;
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(LOCALE_LOCAL_STORAGE_KEY);
    return isSupportedLocale(stored) ? stored : null;
  }
  return null;
}

export function getLocaleBadgeLabel(locale: FloussyLocale | null) {
  return locale ? FL_LOCALE_LABELS[locale] : "LANG";
}

export default function LanguagePreferenceGate() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<FloussyLocale | null>(() => {
    return getBrowserLocalePreference();
  });
  const [manualOpen, setManualOpen] = useState(false);
  const [dismissedAutoPrompt, setDismissedAutoPrompt] = useState(false);

  useEffect(() => {
    if (locale) {
      applyDocumentLocale(locale);
    }
  }, [locale]);

  useEffect(() => {
    const handleOpen = () => setManualOpen(true);
    window.addEventListener(OPEN_LANGUAGE_PICKER_EVENT, handleOpen);
    return () => {
      window.removeEventListener(OPEN_LANGUAGE_PICKER_EVENT, handleOpen);
    };
  }, []);

  const options = useMemo(
    () =>
      (["fr", "en", "ar"] as FloussyLocale[]).map((item) => ({
        value: item,
        label: FL_LOCALE_NATIVE_LABELS[item],
        badge: FL_LOCALE_LABELS[item],
      })),
    []
  );

  const handleSelectLocale = (nextLocale: FloussyLocale) => {
    persistLocaleCookie(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_LOCAL_STORAGE_KEY, nextLocale);
    }
    applyDocumentLocale(nextLocale);
    setLocale(nextLocale);
    setManualOpen(false);
    setDismissedAutoPrompt(false);
    window.dispatchEvent(
      new CustomEvent(LANGUAGE_CHANGED_EVENT, {
        detail: { locale: nextLocale },
      })
    );
  };

  useEffect(() => {
    const handleChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ locale?: string }>;
      const value = customEvent.detail?.locale;
      if (!isSupportedLocale(value)) return;
      setLocale(value);
      applyDocumentLocale(value);
    };
    window.addEventListener(LANGUAGE_CHANGED_EVENT, handleChanged as EventListener);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, handleChanged as EventListener);
    };
  }, []);

  const open = manualOpen || (!dismissedAutoPrompt && pathname === "/" && !locale);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !manualOpen && !locale) {
          setDismissedAutoPrompt(true);
        }
        setManualOpen(nextOpen);
      }}
    >
      <DialogContent className="max-w-md overflow-hidden rounded-[30px] border border-emerald-100/80 bg-[var(--surface)]/95 p-0 text-center shadow-[0_32px_90px_-38px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_48%)] p-6 sm:p-7">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-emerald-100 bg-[var(--surface)] text-emerald-600 shadow-[0_22px_45px_-26px_rgba(16,185,129,0.55)]"
          >
            <Globe className="h-7 w-7" />
          </div>
          <DialogHeader className="mt-4 space-y-2 text-center">
            <DialogTitle className="text-[26px] font-semibold tracking-[-0.02em] text-[#111827]">
              اختار اللغة ديالك
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-6 text-[#6b7280]">
              Choisissez votre langue
              <br />
              Choose your language
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-3">
            {options.map((option) => {
              const active = locale === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelectLocale(option.value)}
                  className={`relative overflow-hidden flex items-center justify-between rounded-[22px] border px-4 py-4 text-left transition-colors ${
                    active
                      ? "border-emerald-400 bg-emerald-50 shadow-[0_18px_34px_-24px_rgba(15,157,116,0.24)]"
                      : "border-[#e5e7eb] bg-[var(--surface)] hover:border-emerald-200"
                  }`}
                >
                  <span className="relative z-10 text-[16px] font-semibold text-[#111827]">
                    {option.label}
                  </span>
                  <span className="relative z-10 rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold text-[#374151]">
                    {option.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-[12px] leading-5 text-[#6b7280]">
            غادي نحفظو الاختيار ديالك فزياراتك الجاية.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
