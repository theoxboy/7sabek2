"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, KeyRound, Trash2, Copy, Check } from "lucide-react";

import type { FloussyLocale } from "@/lib/localePreference";
import type { AuthUser } from "@/lib/auth";
import { GUEST_PANEL_COPY, protectionLevelOf } from "@/lib/guestPanelCopy";
import { ackRecoveryCode, guestSummary, type GuestSummary } from "@/lib/guestAnchorApi";
import { eraseGuest, readStoredRecoveryCode } from "@/lib/guestSession";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { GuestClaimDialog } from "@/components/guest/GuestGate";

type Props = {
  user: AuthUser;
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
  /** "card" for the dashboard, "full" for the settings page. */
  variant?: "card" | "full";
};

function formatCode(raw: string): string {
  const c = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

export function GuestAccountPanel({ user, locale, dir, variant = "full" }: Props) {
  const t = GUEST_PANEL_COPY[locale] ?? GUEST_PANEL_COPY.fr;
  const level = protectionLevelOf(user);

  const daysTracking = user.guest_created_at
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(user.guest_created_at).getTime()) / 86_400_000
        )
      )
    : 0;

  const [summary, setSummary] = useState<GuestSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    guestSummary().then((s) => {
      if (!cancelled) setSummary(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Palier 3: real numbers once the guest has genuinely used it.
  const palier3 =
    summary && (summary.transaction_count >= 5 || summary.days_tracking >= 7)
      ? t.paliers(
          summary.expense_total,
          summary.days_tracking,
          summary.envelope_count
        )
      : null;
  const intro = palier3 ?? (daysTracking >= 3 ? t.trackingDays(daysTracking) : t.panelIntro);

  const [claimOpen, setClaimOpen] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [codeShown, setCodeShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acking, setAcking] = useState(false);
  const [erasing, setErasing] = useState(false);

  const storedCode = readStoredRecoveryCode();
  const acked = Boolean(user.recovery_code_ack) || level >= 70;

  const handleCopy = async () => {
    if (!storedCode) return;
    try {
      await navigator.clipboard.writeText(formatCode(storedCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleAck = async () => {
    setAcking(true);
    try {
      await ackRecoveryCode();
      window.location.reload();
    } catch {
      setAcking(false);
    }
  };

  const handleErase = async () => {
    setErasing(true);
    try {
      await eraseGuest();
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <section
      dir={dir}
      className="flex flex-col gap-4 rounded-2xl border p-4 sm:p-5"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        color: "var(--ink)",
      }}
    >
      <header className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
          aria-hidden
        >
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold">{t.panelTitle}</h2>
          <p
            className="mt-0.5 text-[13px] leading-snug"
            style={{ color: palier3 ? "var(--ink)" : "var(--muted)", fontWeight: palier3 ? 600 : 400 }}
          >
            {intro}
          </p>
        </div>
      </header>

      {/* Protection gauge */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            {t.gaugeLabel}
          </span>
          <span className="text-sm font-bold" style={{ color: "var(--accent-strong)" }}>
            {level}%
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${level}%`, background: "var(--accent)" }}
          />
        </div>
        <div className="mt-1 grid gap-1.5">
          {t.steps.map((s) => {
            const active = level >= s.level;
            return (
              <div
                key={s.level}
                className="flex items-start gap-2 text-[12.5px]"
                style={{ color: active ? "var(--ink)" : "var(--muted)", opacity: active ? 1 : 0.6 }}
              >
                <span
                  className="mt-[3px] h-2 w-2 shrink-0 rounded-full"
                  style={{ background: active ? "var(--accent)" : "var(--border-strong)" }}
                />
                <span>
                  <b className="font-semibold">{s.name}</b> — {s.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recovery code */}
      {storedCode ? (
        <div
          className="flex flex-col gap-2 rounded-xl p-3"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" style={{ color: "var(--muted)" }} aria-hidden />
            <span className="text-[13px] font-semibold">{t.recoveryTitle}</span>
          </div>
          <p className="text-[12.5px] leading-snug" style={{ color: "var(--muted)" }}>
            {t.recoveryIntro}
          </p>
          {codeShown ? (
            <div className="flex flex-wrap items-center gap-2">
              <code
                className="rounded-lg px-3 py-1.5 text-base font-bold tracking-widest"
                style={{ background: "var(--bg)", border: "1px solid var(--border-strong)", direction: "ltr" }}
              >
                {formatCode(storedCode)}
              </code>
              <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="ms-1">{copied ? t.copied : t.copy}</span>
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={() => setCodeShown(true)} className="self-start">
              {t.reveal}
            </Button>
          )}
          {codeShown &&
            (acked ? (
              <span className="text-[12px] font-semibold" style={{ color: "var(--success)" }}>
                {t.acked}
              </span>
            ) : (
              <Button type="button" size="sm" onClick={handleAck} isLoading={acking} className="self-start">
                {t.ackButton}
              </Button>
            ))}
        </div>
      ) : null}

      {/* Claim */}
      <div className="flex flex-col gap-1">
        <Button type="button" onClick={() => setClaimOpen(true)} className="w-full">
          {t.claimCta}
        </Button>
        <span className="text-center text-[11px]" style={{ color: "var(--muted)" }}>
          {t.claimNote}
        </span>
      </div>

      {/* Erase */}
      {variant === "full" ? (
        <div
          className="flex flex-col gap-1.5 rounded-xl p-3"
          style={{ border: "1px solid var(--error-soft)", background: "var(--error-soft)" }}
        >
          <span className="text-[13px] font-semibold" style={{ color: "var(--error)" }}>
            {t.eraseTitle}
          </span>
          <p className="text-[12px] leading-snug" style={{ color: "var(--ink-2, var(--ink))" }}>
            {t.eraseIntro}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEraseOpen(true)}
            className="self-start"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="ms-1">{t.eraseButton}</span>
          </Button>
        </div>
      ) : null}

      <GuestClaimDialog open={claimOpen} onOpenChange={setClaimOpen} locale={locale} dir={dir} />

      <Dialog open={eraseOpen} onOpenChange={setEraseOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t.eraseConfirmTitle}</DialogTitle>
            <DialogDescription>{t.eraseConfirmBody}</DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="button" onClick={handleErase} isLoading={erasing} className="flex-1">
              {t.eraseConfirm}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEraseOpen(false)}
              className="flex-1"
            >
              {t.eraseCancel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ─── The clickable "Discovery mode" chip + its explainer ──────────────────────

export function GuestModeChip({ locale, dir }: { locale: FloussyLocale; dir: "rtl" | "ltr" }) {
  const t = GUEST_PANEL_COPY[locale] ?? GUEST_PANEL_COPY.fr;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
        style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        {t.chipLabel}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t.explainTitle}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-2.5 text-[13.5px] leading-relaxed" style={{ color: "var(--ink)" }}>
            {t.explainBody.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <Button type="button" onClick={() => setOpen(false)} className="mt-4 w-full">
            {t.explainClose}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
