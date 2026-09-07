"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, Copy, Check, ArrowRight } from "lucide-react";

import { useAppLocale } from "@/lib/appLocale";
import { fetchMe, refreshAuthSession, type AuthUser } from "@/lib/auth";
import { GUEST_PANEL_COPY, protectionLevelOf } from "@/lib/guestPanelCopy";
import { ackRecoveryCode, guestEvent } from "@/lib/guestAnchorApi";
import { readStoredRecoveryCode } from "@/lib/guestSession";
import { markDiscoveryWelcomeSeen } from "@/lib/guestWelcome";
import { detectFragileContext } from "@/lib/guestFragileContext";
import { Button } from "@/components/ui/Button";
import { GuestClaimDialog } from "@/components/guest/GuestGate";

function formatCode(raw: string): string {
  const c = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

export default function DiscoveryWelcomePage() {
  const router = useRouter();
  const { locale, dir } = useAppLocale();
  const t = GUEST_PANEL_COPY[locale] ?? GUEST_PANEL_COPY.fr;

  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (cancelled) return;
        if (!me.is_guest) {
          router.replace("/dashboard");
          return;
        }
        setUser(me);
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const level = user ? protectionLevelOf(user) : 40;
  const storedCode = readStoredRecoveryCode();
  const acked = Boolean(user?.recovery_code_ack) || level >= 70;

  const [codeShown, setCodeShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acking, setAcking] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [fragile, setFragile] = useState(false);

  useEffect(() => {
    const ctx = detectFragileContext();
    if (ctx.fragile && level < 70) {
      setFragile(true);
      setCodeShown(true);
      guestEvent("fragile_context_detected", { reason: ctx.reason });
    }
  }, [level]);

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

  const goToBudget = () => {
    markDiscoveryWelcomeSeen();
    router.replace("/dashboard");
  };

  const handleAck = async () => {
    setAcking(true);
    try {
      await ackRecoveryCode(); // fires protection_level_changed 40→70 server-side
      await refreshAuthSession();
      markDiscoveryWelcomeSeen();
      router.replace("/dashboard");
    } catch {
      setAcking(false);
    }
  };

  const handleContinue = () => {
    setContinuing(true);
    goToBudget();
  };

  return (
    <div
      dir={dir}
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-5 py-10"
      style={{ color: "var(--ink)" }}
    >
      <header className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
          aria-hidden
        >
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold">{t.welcomeTitle}</h1>
        <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
          {t.panelIntro}
        </p>
      </header>

      {/* What discovery mode is */}
      <div
        className="flex flex-col gap-2.5 rounded-2xl border p-4 text-[13.5px] leading-relaxed"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {t.explainBody.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {/* Protection gauge */}
      <div
        className="flex flex-col gap-3 rounded-2xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
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
        <div className="grid gap-1.5">
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
          className="flex flex-col gap-2 rounded-2xl p-4"
          style={{
            background: fragile ? "var(--warning-soft)" : "var(--surface-2)",
            border: `1px solid ${fragile ? "var(--warning)" : "var(--border)"}`,
          }}
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" style={{ color: "var(--muted)" }} aria-hidden />
            <span className="text-[13px] font-semibold">{t.recoveryTitle}</span>
          </div>
          {fragile && (
            <p className="text-[12.5px] font-semibold leading-snug" style={{ color: "var(--warning)" }}>
              {t.fragileWarning}
            </p>
          )}
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
          {codeShown && !acked && (
            <Button type="button" size="sm" onClick={handleAck} isLoading={acking} className="self-start">
              {t.ackButton}
            </Button>
          )}
          {acked && (
            <span className="text-[12px] font-semibold" style={{ color: "var(--success)" }}>
              {t.acked}
            </span>
          )}
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={handleContinue} isLoading={continuing} className="w-full">
          <span>{t.welcomeContinue}</span>
          <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" aria-hidden />
        </Button>
        <button
          type="button"
          onClick={() => {
            guestEvent("guest_claim_dialog_opened", {
              source: "decouverte_intro",
              method_shown: "unknown",
            });
            setClaimOpen(true);
          }}
          className="text-center text-[12.5px] font-semibold underline"
          style={{ color: "var(--accent-strong)" }}
        >
          {t.claimCta}
        </button>
        <span className="text-center text-[11px]" style={{ color: "var(--muted)" }}>
          {t.claimNote}
        </span>
      </div>

      <GuestClaimDialog
        open={claimOpen}
        onOpenChange={setClaimOpen}
        locale={locale}
        dir={dir}
        source="decouverte_intro"
      />
    </div>
  );
}
