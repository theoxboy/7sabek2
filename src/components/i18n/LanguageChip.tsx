"use client";

import { motion } from "framer-motion";
import type { FloussyLocale } from "@/lib/localePreference";

interface LanguageChipProps {
  locale: FloussyLocale;
  onChangeLocale: (next: FloussyLocale) => void;
  className?: string;
  layoutId?: string;
}

const LANGUAGES: { code: FloussyLocale; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "EN" },
];

export function LanguageChip({
  locale,
  onChangeLocale,
  className = "",
  layoutId = "lang-chip-active-pill",
}: LanguageChipProps) {
  return (
    <div
      className={`lg-chip lg-chip-animated ${className}`.trim()}
      role="group"
      aria-label="Langues"
    >
      {LANGUAGES.map((lang) => {
        const isActive = locale === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            className={isActive ? "on" : ""}
            onClick={(e) => {
              e.preventDefault();
              if (locale !== lang.code) {
                onChangeLocale(lang.code);
              }
            }}
            aria-pressed={isActive}
            lang={lang.code}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="lg-chip-active-pill"
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 32,
                  mass: 0.7,
                }}
              />
            )}
            <span
              style={{
                position: "relative",
                zIndex: 3,
                display: "inline-block",
                transition: "transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)",
                transform: isActive ? "scale(1.03)" : "scale(1)",
              }}
            >
              {lang.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default LanguageChip;
