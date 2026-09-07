"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Trash2, AlertTriangle } from "lucide-react";

import type { FloussyLocale } from "@/lib/localePreference";
import type { AuthUser } from "@/lib/auth";
import { GUEST_PANEL_COPY, protectionLevelOf } from "@/lib/guestPanelCopy";
import { ackRecoveryCode, guestSummary, guestEvent, type GuestSummary } from "@/lib/guestAnchorApi";
import { eraseGuest, readStoredRecoveryCode } from "@/lib/guestSession";
import { armPostAckPrompt, consumePostAckFlag, shouldOpenPostAckPrompt } from "@/lib/guestPostAck";
import { detectFragileContext } from "@/lib/guestFragileContext";
import { RecoveryCodeVault } from "@/components/guest/RecoveryCodeVault";
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
  const [acking, setAcking] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [fragile, setFragile] = useState(false);

  useEffect(() => {
    const ctx = detectFragileContext();
    if (ctx.fragile && level < 70) {
      setFragile(true);
      guestEvent("fragile_context_detected", { reason: ctx.reason });
    }
  }, [level]);

  const storedCode = readStoredRecoveryCode();
  const acked = Boolean(user.recovery_code_ack) || level >= 70;

  const handleAck = async () => {
    setAcking(true);
    try {
      await ackRecoveryCode();
      // Surface a dedicated "finish your account" moment after the reload —
      // the guest has just done the mental work of securing their data. The ack
      // button only exists inside this panel (/dashboard or /settings) and the
      // reload stays on that route, so the panel is always mounted to catch it.
      armPostAckPrompt();
      window.location.reload();
    } catch {
      setAcking(false);
    }
  };

  const [postAckOpen, setPostAckOpen] = useState(false);
  const [claimOpenFromPostAck, setClaimOpenFromPostAck] = useState(false);
  // "dismissed" (X / Esc / "Plus tard") vs "advancing" (tapped the CTA) vs still open.
  const postAckOutcomeRef = useRef<"dismissed" | "advancing" | null>(null);

  // Funnel reading note: from `guest_post_ack_prompt_shown`, exactly one of
  //   - `guest_post_ack_prompt_dismissed`  (X / Esc / overlay / "Plus tard")
  //   - the CTA path → `guest_claim_dialog_opened {source:"post_ack"}` then
  //     `guest_post_ack_prompt_converted` OR `claim_abandoned {source:"post_ack"}`
  // A user on the CTA path never emits `_dismissed` — that is by design, not a
  // dropped event.
  useEffect(() => {
    if (shouldOpenPostAckPrompt(consumePostAckFlag(), user)) {
      postAckOutcomeRef.current = null;
      setPostAckOpen(true);
      guestEvent("guest_post_ack_prompt_shown", { protection_level: 70 });
    }
  }, [user.is_guest, user.claimed_at]);

  const [eraseError, setEraseError] = useState<string | null>(null);

  const handleErase = async () => {
    setEraseError(null);
    setErasing(true);
    try {
      await eraseGuest();
      // Only leave once the server confirms the row is gone.
      window.location.href = "/login";
    } catch {
      setEraseError(t.eraseFailed);
      setErasing(false);
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
        <RecoveryCodeVault
          code={storedCode}
          locale={locale}
          dir={dir}
          acked={acked}
          fragile={fragile}
          onAck={handleAck}
          ackLoading={acking}
          onSecured={() => window.location.reload()}
          where={variant === "card" ? "panel_dashboard" : "panel_settings"}
        />
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

      <GuestClaimDialog
        open={claimOpen}
        onOpenChange={setClaimOpen}
        locale={locale}
        dir={dir}
        source={variant === "card" ? "panel_dashboard" : "panel_settings"}
      />

      <Dialog
        open={postAckOpen}
        onOpenChange={(v) => {
          // Fire "dismissed" once, and only for a real dismissal (X / Esc /
          // overlay) — not when the CTA is advancing to the claim dialog, and
          // not a second time after the "Plus tard" button already fired it.
          if (!v && postAckOutcomeRef.current === null) {
            postAckOutcomeRef.current = "dismissed";
            guestEvent("guest_post_ack_prompt_dismissed");
          }
          setPostAckOpen(v);
        }}
      >
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t.postAckTitle}</DialogTitle>
            <DialogDescription>{t.postAckBody}</DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => {
                postAckOutcomeRef.current = "advancing";
                setPostAckOpen(false);
                setClaimOpenFromPostAck(true);
              }}
              className="w-full"
            >
              {t.postAckCta}
            </Button>
            <button
              type="button"
              onClick={() => {
                postAckOutcomeRef.current = "dismissed";
                guestEvent("guest_post_ack_prompt_dismissed");
                setPostAckOpen(false);
              }}
              className="text-center text-[12px] underline"
              style={{ color: "var(--muted)" }}
            >
              {t.postAckLater}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <GuestClaimDialog
        open={claimOpenFromPostAck}
        onOpenChange={setClaimOpenFromPostAck}
        locale={locale}
        dir={dir}
        source="post_ack"
      />


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
          {eraseError && (
            <p className="mt-2 text-xs font-semibold" style={{ color: "var(--error)" }}>
              {eraseError}
            </p>
          )}
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

// ─── Persistent "your budget isn't fully protected yet" pill (Tier 3) ──────────

export function GuestProtectionPill({
  user,
  locale,
}: {
  user: AuthUser;
  locale: FloussyLocale;
}) {
  const t = GUEST_PANEL_COPY[locale] ?? GUEST_PANEL_COPY.fr;
  const router = useRouter();
  const level = protectionLevelOf(user);
  if (level >= 70) return null; // fully protected or better — nothing to nag about

  return (
    <button
      type="button"
      onClick={() => router.push("/settings")}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: "var(--warning-soft)", color: "var(--warning)", border: "1px solid var(--warning)" }}
      title={t.nudgeTitle}
    >
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      {t.pill(level)}
    </button>
  );
}
