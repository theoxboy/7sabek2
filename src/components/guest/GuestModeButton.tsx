"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Info, TriangleAlert, Sparkles } from "lucide-react";

import type { FloussyLocale } from "@/lib/localePreference";
import type { PlatformStatusOut } from "@/lib/types";
import { resolveAnchorToken } from "@/lib/guestAnchor";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

type Placement = "login" | "register" | "landing";

type Props = {
  status: PlatformStatusOut | null;
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
  placement: Placement;
  loading?: boolean;
  onStart: () => void;
  /** Rendered as the enabled button. Keeps each host's own styling. */
  label: string;
  hint?: string;
  className?: string;
  hintClassName?: string;
};

const COPY: Record<
  FloussyLocale,
  { heading: string; ok: string; createAccount: string; fallback: string }
> = {
  fr: {
    heading: "Mode découverte",
    ok: "J’ai compris",
    createAccount: "Créer un compte gratuit",
    fallback: "Le mode découverte est indisponible pour le moment.",
  },
  en: {
    heading: "Discovery mode",
    ok: "Got it",
    createAccount: "Create a free account",
    fallback: "Discovery mode is unavailable right now.",
  },
  ar: {
    heading: "وضع الاكتشاف",
    ok: "فهمت",
    createAccount: "صاوب حساب مجاني",
    fallback: "وضع الاكتشاف ماشي متاح دابا.",
  },
};

/** Resolve the superadmin message for the active locale, falling back to fr → en → ar. */
export function guestModeMessage(
  status: PlatformStatusOut | null,
  locale: FloussyLocale
): string {
  if (!status) return "";
  const byLocale =
    locale === "ar"
      ? status.guest_mode_message_ar
      : locale === "en"
        ? status.guest_mode_message_en
        : status.guest_mode_message_fr;
  return (
    byLocale ||
    status.guest_mode_message_fr ||
    status.guest_mode_message_en ||
    status.guest_mode_message_ar ||
    ""
  ).trim();
}

export function GuestModeButton({
  status,
  locale,
  dir,
  placement,
  loading,
  onStart,
  label,
  hint,
  className,
  hintClassName,
}: Props) {
  const [msgOpen, setMsgOpen] = useState(false);
  const [hasAnchor, setHasAnchor] = useState(false);
  const [preparingEnvelopes, setPreparingEnvelopes] = useState(false);
  const t = COPY[locale] ?? COPY.fr;

  useEffect(() => {
    let active = true;
    resolveAnchorToken()
      .then((tok) => {
        if (active && tok) setHasAnchor(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setPreparingEnvelopes(false);
      return;
    }
    const timer = setTimeout(() => {
      setPreparingEnvelopes(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [loading]);

  // Missing status (offline / old backend) → behave exactly like before.
  const enabled = status?.guest_mode_enabled ?? true;
  const placements = status?.guest_mode_placements ?? ["login", "register"];
  const onThisPlacement = placements.length === 0 || placements.includes(placement);

  if (!onThisPlacement) return null;

  const resumeText =
    locale === "ar"
      ? "استئناف ميزانيتي"
      : locale === "en"
        ? "Resume my budget"
        : "Reprendre mon budget";

  const effectiveLabel = hasAnchor ? resumeText : label;
  const preparingText =
    locale === "ar"
      ? "جاري تحضير ميزانيتك..."
      : locale === "en"
        ? "Preparing your budget..."
        : "Préparation de vos enveloppes...";

  if (enabled) {
    return (
      <div className="flex w-full flex-col items-center gap-2">
        <Button
          type="button"
          onClick={onStart}
          isLoading={loading}
          className={className}
        >
          {loading && preparingEnvelopes ? preparingText : effectiveLabel}
        </Button>
        {hint ? <p className={hintClassName}>{hint}</p> : null}
      </div>
    );
  }

  // Disabled + hidden → nothing at all.
  if ((status?.guest_mode_button ?? "hidden") === "hidden") return null;

  // Disabled + message → keep the button, explain on click.
  const message = guestModeMessage(status, locale) || t.fallback;
  const type = status?.guest_mode_message_type ?? "info";
  const Icon = type === "warning" ? TriangleAlert : type === "soon" ? Sparkles : Info;
  const tone =
    type === "warning"
      ? "var(--warning)"
      : type === "soon"
        ? "var(--accent)"
        : "var(--info, var(--accent))";

  return (
    <>
      <div className="flex w-full flex-col items-center gap-2">
        <Button
          type="button"
          onClick={() => setMsgOpen(true)}
          className={className}
          style={{ opacity: 0.75 }}
        >
          {label}
        </Button>
        {hint ? <p className={hintClassName}>{hint}</p> : null}
      </div>

      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogContent dir={dir} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${tone} 16%, transparent)`, color: tone }}
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </span>
              {t.heading}
            </DialogTitle>
            <DialogDescription className="whitespace-pre-line text-[var(--ink)]">
              {message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3 flex-col gap-2 sm:flex-row sm:justify-end">
            {(status?.guest_mode_fallback_cta ?? true) ? (
              <Button asChild>
                <Link href="/register">{t.createAccount}</Link>
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setMsgOpen(false)}>
              {t.ok}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
