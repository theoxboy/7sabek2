"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Cairo } from "next/font/google";
import {
  ShieldCheck,
  KeyRound,
  ArrowRight,
  Check,
  Sparkles,
  Wallet,
  RefreshCw,
} from "lucide-react";

import { useAppLocale } from "@/lib/appLocale";
import { fetchMe, refreshAuthSession, type AuthUser } from "@/lib/auth";
import { GUEST_PANEL_COPY, protectionLevelOf } from "@/lib/guestPanelCopy";
import { ackRecoveryCode, guestEvent } from "@/lib/guestAnchorApi";
import { readStoredRecoveryCode } from "@/lib/guestSession";
import { markDiscoveryWelcomeSeen } from "@/lib/guestWelcome";
import { detectFragileContext } from "@/lib/guestFragileContext";
import { RecoveryCodeVault } from "@/components/guest/RecoveryCodeVault";
import BrandLogo from "@/components/BrandLogo";

const arabicFont = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"] });

const STEP_ICONS = [Sparkles, ShieldCheck, KeyRound];

export default function DiscoveryWelcomePage() {
  const router = useRouter();
  const { locale, dir } = useAppLocale();
  const t = GUEST_PANEL_COPY[locale] ?? GUEST_PANEL_COPY.fr;
  const reduce = useReducedMotion();
  const isAr = locale === "ar";

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

  const [step, setStep] = useState(0);
  const [dirn, setDirn] = useState(1); // slide direction
  const [acking, setAcking] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [fragile, setFragile] = useState(false);

  useEffect(() => {
    const ctx = detectFragileContext();
    if (ctx.fragile && level < 70) {
      setFragile(true);
      guestEvent("fragile_context_detected", { reason: ctx.reason });
    }
  }, [level]);

  const TOTAL = 3;
  const last = step === TOTAL - 1;

  const go = (next: number) => {
    setDirn(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(TOTAL - 1, next)));
  };

  const leave = (fn: () => void) => {
    markDiscoveryWelcomeSeen();
    fn();
  };

  const handleContinue = () => {
    setContinuing(true);
    leave(() => router.replace("/dashboard"));
  };

  const handleAck = async () => {
    setAcking(true);
    try {
      await ackRecoveryCode(); // fires protection_level_changed 40→70 server-side
      await refreshAuthSession();
      leave(() => router.replace("/dashboard"));
    } catch {
      setAcking(false);
    }
  };


  const bullets = [
    { icon: Sparkles, text: t.explainBody[0] },
    { icon: Wallet, text: t.explainBody[1] },
    { icon: KeyRound, text: t.explainBody[2] },
    { icon: RefreshCw, text: t.explainBody[3] },
  ].filter((b) => Boolean(b.text));

  return (
    <div
      dir={dir}
      lang={isAr ? "ar" : undefined}
      className={`dcw-root ${isAr ? arabicFont.className : ""}`.trim()}
    >
      <div className="dcw-bg" aria-hidden="true">
        <span className="dcw-blob dcw-blob-a" />
        <span className="dcw-blob dcw-blob-b" />
      </div>

      <div className="dcw-progress" aria-hidden="true">
        <span style={{ width: `${((step + 1) / TOTAL) * 100}%` }} />
      </div>

      <main className="dcw-shell">
        <div className="dcw-logo">
          <BrandLogo locale={locale} priority />
        </div>

        <div className="dcw-dots" role="tablist" aria-label="steps">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const Ico = STEP_ICONS[i] ?? Sparkles;
            const done = i < step;
            const active = i === step;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => go(i)}
                className={`dcw-dot ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}
              >
                {done ? <Check className="dcw-dot-ic" /> : <Ico className="dcw-dot-ic" />}
              </button>
            );
          })}
        </div>

        <div className="dcw-stage">
            <motion.section
              key={step}
              initial={{ opacity: 0, x: reduce ? 0 : dirn * 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className="dcw-card"
            >
              {step === 0 && (
                <>
                  <span className="dcw-eyebrow">
                    <span className="dcw-sq" />
                    {t.chipLabel}
                  </span>
                  <h1 className="dcw-h1">{t.welcomeTitle}</h1>
                  <p className="dcw-sub">{t.panelIntro}</p>
                  <ul className="dcw-list">
                    {bullets.map((b, i) => {
                      const Ico = b.icon;
                      return (
                        <li key={i} className="dcw-li">
                          <span className="dcw-li-ic" aria-hidden="true">
                            <Ico />
                          </span>
                          <span>{b.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {step === 1 && (
                <>
                  <span className="dcw-eyebrow">
                    <span className="dcw-sq" />
                    {t.gaugeLabel}
                  </span>
                  <h1 className="dcw-h1">{t.welcomeProtectionTitle}</h1>
                  <div className="dcw-gauge">
                    <div className="dcw-gauge-top">
                      <span>{t.gaugeLabel}</span>
                      <span className="dcw-gauge-pct">{level}%</span>
                    </div>
                    <div className="dcw-track">
                      <motion.span
                        className="dcw-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${level}%` }}
                        transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>
                  <ul className="dcw-list dcw-steps">
                    {t.steps.map((s) => {
                      const on = level >= s.level;
                      return (
                        <li key={s.level} className={`dcw-li ${on ? "" : "is-off"}`}>
                          <span className={`dcw-bullet ${on ? "is-on" : ""}`} aria-hidden="true" />
                          <span>
                            <b>{s.name}</b> — {s.desc}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {step === 2 && (
                <>
                  <span className="dcw-eyebrow">
                    <span className="dcw-sq" />
                    {t.recoveryTitle}
                  </span>
                  <h1 className="dcw-h1">{t.recoveryTitle}</h1>

                  {storedCode ? (
                    <RecoveryCodeVault
                      code={storedCode}
                      locale={locale}
                      dir={dir}
                      acked={acked}
                      fragile={fragile}
                      onAck={handleAck}
                      ackLoading={acking}
                      onSecured={() => leave(() => router.replace("/dashboard"))}
                      where="welcome"
                    />
                  ) : (
                    <p className="dcw-sub">{t.welcomeNoCode}</p>
                  )}
                </>
              )}
            </motion.section>
        </div>

        <div className="dcw-nav">
          {step > 0 ? (
            <button type="button" className="dcw-btn dcw-btn-ghost" onClick={() => go(step - 1)}>
              {t.welcomeBack}
            </button>
          ) : (
            <span />
          )}

          {last ? (
            <button
              type="button"
              className="dcw-btn dcw-btn-accent"
              onClick={handleContinue}
              disabled={continuing}
            >
              {t.welcomeContinue}
              <ArrowRight className="dcw-ic dcw-arrow" />
            </button>
          ) : (
            <button type="button" className="dcw-btn dcw-btn-accent" onClick={() => go(step + 1)}>
              {t.welcomeNext}
              <ArrowRight className="dcw-ic dcw-arrow" />
            </button>
          )}
        </div>

        <button type="button" className="dcw-skip" onClick={handleContinue}>
          {t.welcomeSkip}
        </button>
      </main>

      <style jsx global>{`
        .dcw-root {
          --ink: #0a241d;
          --ink-soft: #4e625a;
          --ink-mute: #7c8d86;
          --paper: #f6f8f4;
          --surface: #ffffff;
          --accent: #17c777;
          --accent-deep: #0b8f53;
          --accent-soft: #e2f7ec;
          --sky: #4c7eff;
          --amber: #f2a93b;
          --line: #e3e8df;
          --shadow: 0 1px 2px rgba(10, 36, 29, 0.04), 0 24px 60px -28px rgba(10, 36, 29, 0.28);
          position: relative;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--paper);
          color: var(--ink);
          overflow-x: hidden;
          overflow-y: auto;
          padding: 32px 18px 40px;
        }
        .dcw-root h1 {
          margin: 0;
          letter-spacing: -0.01em;
          text-wrap: balance;
        }
        .dcw-root[dir="rtl"] h1 {
          letter-spacing: 0;
        }
        .dcw-root p {
          margin: 0;
        }

        .dcw-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .dcw-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(64px);
          opacity: 0.5;
        }
        .dcw-blob-a {
          width: 460px;
          height: 460px;
          background: rgba(23, 199, 119, 0.34);
          top: -180px;
          inset-inline-start: -140px;
          animation: dcwDrift1 18s ease-in-out infinite;
        }
        .dcw-blob-b {
          width: 400px;
          height: 400px;
          background: rgba(76, 126, 255, 0.2);
          bottom: -160px;
          inset-inline-end: -120px;
          animation: dcwDrift2 22s ease-in-out infinite;
        }
        @keyframes dcwDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 50px) scale(1.12); }
        }
        @keyframes dcwDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, -40px) scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dcw-blob { animation: none; }
        }

        .dcw-progress {
          position: fixed;
          top: 0;
          inset-inline: 0;
          height: 3px;
          z-index: 20;
          pointer-events: none;
        }
        .dcw-progress > span {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, var(--accent), var(--sky));
          box-shadow: 0 0 12px rgba(23, 199, 119, 0.6);
          transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .dcw-shell {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }
        .dcw-logo :global(img) {
          height: 56px;
          width: auto;
        }

        .dcw-dots {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dcw-dot {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: var(--surface);
          color: var(--ink-mute);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.16s, border-color 0.16s, background 0.16s, color 0.16s;
        }
        .dcw-dot:hover { transform: translateY(-1px); }
        .dcw-dot-ic { width: 15px; height: 15px; }
        .dcw-dot.is-active {
          border-color: var(--accent);
          color: var(--accent-deep);
          background: var(--accent-soft);
        }
        .dcw-dot.is-done {
          border-color: var(--accent);
          background: var(--accent);
          color: #06301f;
        }

        .dcw-stage {
          width: 100%;
          position: relative;
          display: flex;
          align-items: flex-start;
          min-height: 440px;
        }
        @media (max-width: 420px) {
          .dcw-stage { min-height: 500px; }
        }
        .dcw-card {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 26px;
          padding: 26px 22px;
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dcw-eyebrow {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--accent-soft);
          color: var(--accent-deep);
          font-size: 0.76rem;
          font-weight: 700;
          padding: 6px 13px;
          border-radius: 999px;
        }
        .dcw-sq {
          width: 6px;
          height: 6px;
          border-radius: 2px;
          background: var(--accent);
          flex: none;
        }
        .dcw-h1 {
          font-size: clamp(1.5rem, 5.5vw, 1.9rem);
          line-height: 1.15;
          font-weight: 800;
        }
        .dcw-sub {
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--ink-soft);
        }
        .dcw-warn {
          font-size: 0.9rem;
          font-weight: 600;
          line-height: 1.5;
          color: #9a5b00;
          background: #fff6e6;
          border: 1px solid #f4d79a;
          border-radius: 14px;
          padding: 10px 12px;
        }

        .dcw-list {
          list-style: none;
          margin: 4px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dcw-li {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .dcw-li.is-off { color: var(--ink-mute); opacity: 0.7; }
        .dcw-li-ic {
          flex: none;
          width: 30px;
          height: 30px;
          border-radius: 10px;
          background: var(--accent-soft);
          color: var(--accent-deep);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .dcw-li-ic :global(svg) { width: 16px; height: 16px; }
        .dcw-steps .dcw-li { align-items: center; }
        .dcw-bullet {
          flex: none;
          margin-top: 2px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--line);
        }
        .dcw-bullet.is-on { background: var(--accent); }

        .dcw-gauge {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 14px;
        }
        .dcw-gauge-top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--ink-mute);
        }
        .dcw-root[dir="rtl"] .dcw-gauge-top { letter-spacing: 0; }
        .dcw-gauge-pct {
          font-size: 1rem;
          color: var(--accent-deep);
          letter-spacing: 0;
        }
        .dcw-track {
          height: 9px;
          border-radius: 6px;
          background: #edf1ea;
          overflow: hidden;
        }
        .dcw-fill {
          display: block;
          height: 100%;
          border-radius: 6px;
          background: linear-gradient(90deg, var(--accent), var(--accent-deep));
        }

        .dcw-codebox {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 14px;
        }
        .dcw-codewrap {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .dcw-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          direction: ltr;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 8px 14px;
        }
        .dcw-acked {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--accent-deep);
        }

        .dcw-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
          font-weight: 700;
          font-size: 0.92rem;
          border-radius: 13px;
          padding: 11px 20px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: transform 0.16s, box-shadow 0.16s, background 0.16s, border-color 0.16s;
          white-space: nowrap;
        }
        .dcw-btn:hover { transform: translateY(-1px); }
        .dcw-btn:disabled { opacity: 0.6; cursor: default; transform: none; }
        .dcw-btn-sm { padding: 8px 14px; font-size: 0.82rem; }
        .dcw-btn-accent {
          background: var(--accent);
          color: #06301f;
          box-shadow: 0 10px 22px -10px rgba(23, 199, 119, 0.6);
          position: relative;
          overflow: hidden;
        }
        .dcw-btn-accent:hover:not(:disabled) { background: var(--accent-deep); color: #fff; }
        .dcw-btn-accent::after {
          content: "";
          position: absolute;
          top: 0;
          inset-inline-start: -140%;
          width: 60%;
          height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.5), transparent);
          transform: skewX(-18deg);
          transition: inset-inline-start 0.65s ease;
        }
        .dcw-btn-accent:hover:not(:disabled)::after { inset-inline-start: 150%; }
        .dcw-btn-ghost {
          background: var(--surface);
          color: var(--ink);
          border-color: var(--line);
        }
        .dcw-btn-ghost:hover { border-color: var(--ink); }
        .dcw-ic { width: 15px; height: 15px; flex: none; }
        .dcw-root[dir="rtl"] .dcw-arrow { transform: scaleX(-1); }

        .dcw-nav {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .dcw-skip {
          background: none;
          border: none;
          font: inherit;
          font-size: 0.83rem;
          font-weight: 600;
          color: var(--ink-mute);
          cursor: pointer;
          padding: 4px 8px;
        }
        .dcw-skip:hover { color: var(--ink); }
      `}</style>
    </div>
  );
}
