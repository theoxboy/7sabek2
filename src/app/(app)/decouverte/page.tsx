"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Cairo } from "next/font/google";
import {
  KeyRound,
  ArrowRight,
  Check,
  Sparkles,
  Wallet,
  Layers,
  Coins,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAppLocale } from "@/lib/appLocale";
import { fetchMe, type AuthUser } from "@/lib/auth";
import { GUEST_PANEL_COPY } from "@/lib/guestPanelCopy";
import { ackRecoveryCode, guestEvent } from "@/lib/guestAnchorApi";
import { readStoredRecoveryCode } from "@/lib/guestSession";
import { markDiscoveryWelcomeSeen } from "@/lib/guestWelcome";
import { detectFragileContext } from "@/lib/guestFragileContext";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { parseAmountInput } from "@/lib/parseAmount";
import { buildPresetSplit, type SplitPreset } from "@/lib/incomeSplit";
import {
  IncomeSplitEditor,
  createSplitEnvelope,
  type SplitEnvelope,
} from "@/components/guest/IncomeSplitEditor";
import type { FloussyLocale } from "@/lib/localePreference";
import { RecoveryCodeVault } from "@/components/guest/RecoveryCodeVault";
import { GuestClaimDialog } from "@/components/guest/GuestGate";
import { Button } from "@/components/ui/Button";
import BrandLogo from "@/components/BrandLogo";

const arabicFont = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"] });

const STEP_ICONS = [Sparkles, Layers, Coins, Wallet, KeyRound];
const STEP_KEY = "7sabek.guest.decouverte_step";
const INCOME_CATEGORY_NAME = "income_general";
const TOTAL = 5;

type ConfigItem = {
  target_id: string;
  name: string;
  mode?: "none" | "fixed" | "percent";
  percent?: string | null;
  enabled?: boolean;
};
type ConfigOut = { envelopes: ConfigItem[]; goals: ConfigItem[] };
type CategoryOut = { id: string; name: string };

type OnbCopy = {
  conceptEyebrow: string;
  conceptTitle: string;
  conceptBullets: string[];
  conceptCaption: string;
  cashLabel: string;
  incomeEyebrow: string;
  incomeTitle: string;
  incomeSub: string;
  incomePlaceholder: string;
  currency: string;
  incomeLater: string;
  splitEyebrow: string;
  splitTitle: string;
  splitSub: string;
  splitKeep: string;
  splitSaving: string;
  presetName: Record<SplitPreset, string>;
  presetDesc: Record<SplitPreset, string>;
  readyEyebrow: string;
  readyTitle: string;
  recap: (income: number, envelopes: number) => string;
  addExpenseHint: string;
  next: string;
  back: string;
  skip: string;
  finish: string;
};

const ONB: Record<FloussyLocale, OnbCopy> = {
  fr: {
    conceptEyebrow: "Comment ça marche",
    conceptTitle: "Ton argent, dans des enveloppes",
    conceptBullets: [
      "Ton revenu arrive dans **Cash** — l'argent pas encore rangé.",
      "Tu le répartis dans des **enveloppes** : Loyer, Courses, Transport… (on t'en a déjà créé 5).",
      "Quand tu dépenses, ça sort de l'enveloppe concernée. Tu vois toujours ce qu'il te reste.",
    ],
    conceptCaption: "Chaque dépense sort de son enveloppe.",
    cashLabel: "Cash",
    incomeEyebrow: "Ton revenu",
    incomeTitle: "Combien tu gagnes par mois ?",
    incomeSub: "Ça nous sert à calculer combien mettre dans chaque enveloppe. Tu pourras le changer.",
    incomePlaceholder: "6000",
    currency: "DH",
    incomeLater: "Je préfère le faire plus tard",
    splitEyebrow: "Ta répartition",
    splitTitle: "On partage ton revenu",
    splitSub: "Choisis un point de départ. Tu ajusteras enveloppe par enveloppe quand tu veux.",
    splitKeep: "Garder la répartition proposée",
    splitSaving: "Enregistrement…",
    presetName: { essentials: "L'essentiel d'abord", equal: "Égal", save: "Épargner plus" },
    presetDesc: {
      essentials: "Plus pour le loyer et les courses, le reste suit.",
      equal: "La même part dans chaque enveloppe.",
      save: "Une bonne part mise de côté chaque mois.",
    },
    readyEyebrow: "Tu es prêt",
    readyTitle: "Ton budget est prêt ✓",
    recap: (i, e) =>
      `${i > 0 ? `${i.toLocaleString("fr-FR")} DH de revenu · ` : ""}${e} enveloppe${e > 1 ? "s" : ""} · répartition enregistrée`,
    addExpenseHint: "Pour ajouter une dépense : le bouton **+** en bas de l'écran.",
    next: "Suivant",
    back: "Précédent",
    skip: "Passer",
    finish: "Aller à mon budget",
  },
  en: {
    conceptEyebrow: "How it works",
    conceptTitle: "Your money, in envelopes",
    conceptBullets: [
      "Your income lands in **Cash** — money not sorted yet.",
      "You split it into **envelopes**: Rent, Groceries, Transport… (we made you 5 already).",
      "When you spend, it comes out of that envelope. You always see what's left.",
    ],
    conceptCaption: "Every expense comes out of its envelope.",
    cashLabel: "Cash",
    incomeEyebrow: "Your income",
    incomeTitle: "How much do you earn a month?",
    incomeSub: "We use it to work out how much goes into each envelope. You can change it.",
    incomePlaceholder: "6000",
    currency: "DH",
    incomeLater: "I'd rather do this later",
    splitEyebrow: "Your split",
    splitTitle: "Splitting your income",
    splitSub: "Pick a starting point. You'll fine-tune envelope by envelope whenever you like.",
    splitKeep: "Keep the suggested split",
    splitSaving: "Saving…",
    presetName: { essentials: "Essentials first", equal: "Equal", save: "Save more" },
    presetDesc: {
      essentials: "More for rent and groceries, the rest follows.",
      equal: "The same share in every envelope.",
      save: "A solid chunk set aside every month.",
    },
    readyEyebrow: "You're ready",
    readyTitle: "Your budget is ready ✓",
    recap: (i, e) =>
      `${i > 0 ? `${i.toLocaleString("en-US")} DH income · ` : ""}${e} envelope${e > 1 ? "s" : ""} · split saved`,
    addExpenseHint: "To add an expense: the **+** button at the bottom of the screen.",
    next: "Next",
    back: "Back",
    skip: "Skip",
    finish: "Go to my budget",
  },
  ar: {
    conceptEyebrow: "كيفاش كتخدم",
    conceptTitle: "فلوسك، فأظرفة",
    conceptBullets: [
      "الدخل ديالك كيوصل لـ **لكاش** — الفلوس اللي مازال ما ترتّباتش.",
      "كتقسمو على **الأظرفة**: الكراء، الماكلة، التنقل… (صاوبنا ليك 5 من قبل).",
      "ملي كتصرف، كيخرج من الظرف المعني. ديما كتشوف شنو باقي ليك.",
    ],
    conceptCaption: "كل مصروف كيخرج من الظرف ديالو.",
    cashLabel: "لكاش",
    incomeEyebrow: "الدخل ديالك",
    incomeTitle: "شحال كتدخّل فالشهر؟",
    incomeSub: "كنستعملوه باش نحسبو شحال ندخّلو لكل ظرف. تقدر تبدلو من بعد.",
    incomePlaceholder: "6000",
    currency: "درهم",
    incomeLater: "نفضّل نديرو من بعد",
    splitEyebrow: "التقسيم ديالك",
    splitTitle: "نقسمو الدخل ديالك",
    splitSub: "اختار نقطة البداية. غادي تعدّل ظرف بظرف ملي بغيتي.",
    splitKeep: "خلّي التقسيم المقترح",
    splitSaving: "كيتسجّل…",
    presetName: { essentials: "الضروري أولاً", equal: "بالتساوي", save: "توفير أكثر" },
    presetDesc: {
      essentials: "كثر للكراء والماكلة، والباقي كيتبع.",
      equal: "نفس الحصة فكل ظرف.",
      save: "حصة مزيانة كتبقى مخبّية كل شهر.",
    },
    readyEyebrow: "واجد",
    readyTitle: "الميزانية ديالك واجدة ✓",
    recap: (i, e) =>
      `${i > 0 ? `${i.toLocaleString("ar-MA")} درهم دخل · ` : ""}${e} ظرف · التقسيم تسجّل`,
    addExpenseHint: "باش تزيد مصروف: بوطون **+** اللي تحت.",
    next: "التالي",
    back: "اللي فات",
    skip: "قفز",
    finish: "مشي للميزانية ديالي",
  },
};

/** "**bold**" → <b>bold</b>, for the short onboarding bullets. */
function renderMd(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>
  );
}

function readSavedStep(): number {
  try {
    const n = Number(window.localStorage.getItem(STEP_KEY));
    return Number.isFinite(n) ? Math.max(0, Math.min(TOTAL - 1, n)) : 0;
  } catch {
    return 0;
  }
}

export default function DiscoveryWelcomePage() {
  const router = useRouter();
  const { locale, dir } = useAppLocale("fr");
  const t = GUEST_PANEL_COPY[locale] ?? GUEST_PANEL_COPY.fr;
  const o = ONB[locale] ?? ONB.fr;
  const reduce = useReducedMotion();
  const isAr = locale === "ar";

  const [user, setUser] = useState<AuthUser | null>(null);
  const [envs, setEnvs] = useState<SplitEnvelope[]>([]);
  const [pct, setPct] = useState<Record<string, number>>({});
  const [activePreset, setActivePreset] = useState<SplitPreset | null>("essentials");
  const [incomeCatId, setIncomeCatId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then(async (me) => {
        if (cancelled) return;
        if (!me.is_guest) {
          router.replace("/dashboard");
          return;
        }
        setUser(me);
        const [cats, config] = await Promise.all([
          apiFetch<CategoryOut[]>("/categories").catch(() => [] as CategoryOut[]),
          apiFetch<ConfigOut>("/distribution/config").catch(
            () => ({ envelopes: [], goals: [] } as ConfigOut)
          ),
        ]);
        if (cancelled) return;
        setIncomeCatId(cats.find((c) => c.name === INCOME_CATEGORY_NAME)?.id ?? null);
        const list = config.envelopes.map((e) => ({ id: e.target_id, name: e.name }));
        setEnvs(list);
        const existing: Record<string, number> = {};
        let hasExisting = false;
        for (const e of config.envelopes) {
          const item = e as ConfigItem;
          const v =
            item.mode === "percent" && item.enabled && item.percent
              ? Math.max(0, Math.round(Number(item.percent)))
              : 0;
          existing[e.target_id] = v;
          if (v > 0) hasExisting = true;
        }
        setPct(hasExisting ? existing : buildPresetSplit(list, "essentials"));
        setActivePreset(hasExisting ? null : "essentials");
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const storedCode = readStoredRecoveryCode();
  const acked = Boolean(user?.recovery_code_ack);

  const [step, setStep] = useState(0);
  const [dirn, setDirn] = useState(1);
  const [acking, setAcking] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [fragile, setFragile] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [income, setIncome] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [splitSaving, setSplitSaving] = useState(false);
  const incomeLoggedRef = useRef(false);

  useEffect(() => {
    setStep(readSavedStep());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STEP_KEY, String(step));
    } catch {
      /* ignore */
    }
  }, [step]);

  useEffect(() => {
    const ctx = detectFragileContext();
    if (ctx.fragile && !acked) {
      setFragile(true);
      guestEvent("fragile_context_detected", { reason: ctx.reason });
    }
  }, [acked]);

  const incomeValue = parseAmountInput(income) ?? 0;
  const last = step === TOTAL - 1;

  const go = (next: number) => {
    setDirn(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(TOTAL - 1, next)));
  };

  const clearSavedStep = () => {
    try {
      window.localStorage.removeItem(STEP_KEY);
    } catch {
      /* ignore */
    }
  };

  const leave = (fn: () => void) => {
    markDiscoveryWelcomeSeen();
    clearSavedStep();
    fn();
  };

  const handleContinue = () => {
    setContinuing(true);
    void logIncomeIfNeeded();
    leave(() => router.replace("/dashboard"));
  };

  const handleAck = async () => {
    setAcking(true);
    try {
      await logIncomeIfNeeded();
      await ackRecoveryCode(); // fires protection_level_changed 40→70 server-side
      leave(() => router.replace("/dashboard"));
    } catch {
      setAcking(false);
    }
  };

  async function logIncomeIfNeeded() {
    if (incomeLoggedRef.current || incomeValue <= 0 || !incomeCatId) return;
    incomeLoggedRef.current = true;
    try {
      await apiFetch("/transactions", {
        method: "POST",
        body: {
          type: "income",
          category_id: incomeCatId,
          amount: incomeValue.toFixed(2),
          occurred_on: new Date().toISOString().slice(0, 10),
        },
      });
      guestEvent("guest_first_tx", { via: "decouverte" });
    } catch {
      incomeLoggedRef.current = false; // let a later attempt retry
    }
  }

  const handleAddEnv = async (name: string) => {
    setAddBusy(true);
    setAddErr(null);
    const res = await createSplitEnvelope(name, envs, true, locale);
    if (res && "error" in res) {
      setAddErr(res.error);
    } else if (res) {
      setEnvs((prev) => [...prev, res]);
      setPct((prev) => ({ ...prev, [res.id]: 0 }));
      setActivePreset(null);
    }
    setAddBusy(false);
  };

  const saveSplitAndNext = async () => {
    if (splitSaving) return;
    setSplitSaving(true);
    try {
      if (envs.length > 0) {
        await apiFetch("/distribution/config", {
          method: "PUT",
          body: {
            auto_enabled: true,
            goals: [],
            envelopes: envs.map((e) => {
              const p = pct[e.id] || 0;
              return p > 0
                ? { target_id: e.id, mode: "percent", percent: String(p), enabled: true }
                : { target_id: e.id, mode: "none", enabled: false };
            }),
          },
        });
        guestEvent("guest_cta_click", { cta: "decouverte_split_saved", route: "/decouverte" });
      }
    } catch {
      // Non-blocking: they can set the split later from /repartir.
    } finally {
      setSplitSaving(false);
      go(step + 1);
    }
  };

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
                  {[t.explainBody[0], t.explainBody[1], t.explainBody[3]]
                    .filter(Boolean)
                    .map((text, i) => {
                      const Ico = [Sparkles, Wallet, KeyRound][i] ?? Sparkles;
                      return (
                        <li key={i} className="dcw-li">
                          <span className="dcw-li-ic" aria-hidden="true">
                            <Ico />
                          </span>
                          <span>{text}</span>
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
                  {o.conceptEyebrow}
                </span>
                <h1 className="dcw-h1">{o.conceptTitle}</h1>
                <div className="dcw-diagram" aria-hidden="true">
                  <span className="dcw-di-cash">{o.cashLabel}</span>
                  <span className="dcw-di-arrow" />
                  <div className="dcw-di-envs">
                    {(envs.length ? envs.slice(0, 4) : [{ id: "a", name: "Loyer" }, { id: "b", name: "Courses" }, { id: "c", name: "Transport" }]).map((e, i) => (
                      <span key={e.id} style={{ background: `var(--di-${i % 4})` }}>
                        {localizeEnvelopeLabel(e.name, locale)}
                      </span>
                    ))}
                  </div>
                </div>
                <ul className="dcw-list dcw-concept">
                  {o.conceptBullets.map((b, i) => (
                    <li key={i} className="dcw-li">
                      <span className="dcw-li-num" aria-hidden="true">{i + 1}</span>
                      <span>{renderMd(b)}</span>
                    </li>
                  ))}
                </ul>
                <p className="dcw-caption">{o.conceptCaption}</p>
              </>
            )}

            {step === 2 && (
              <>
                <span className="dcw-eyebrow">
                  <span className="dcw-sq" />
                  {o.incomeEyebrow}
                </span>
                <h1 className="dcw-h1">{o.incomeTitle}</h1>
                <p className="dcw-sub">{o.incomeSub}</p>
                <div className="dcw-income">
                  <input
                    inputMode="decimal"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder={o.incomePlaceholder}
                    aria-label={o.incomeTitle}
                    autoFocus
                  />
                  <span>{o.currency}</span>
                </div>
                <button type="button" className="dcw-textlink" onClick={() => go(step + 2)}>
                  {o.incomeLater}
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <span className="dcw-eyebrow">
                  <span className="dcw-sq" />
                  {o.splitEyebrow}
                </span>
                <h1 className="dcw-h1">{o.splitTitle}</h1>
                <p className="dcw-sub">{o.splitSub}</p>
                <IncomeSplitEditor
                  envelopes={envs}
                  pct={pct}
                  onPctChange={setPct}
                  onAddEnvelope={handleAddEnv}
                  addBusy={addBusy}
                  addError={addErr}
                  income={incomeValue}
                  locale={locale}
                  dir={dir}

                  activePreset={activePreset}
                  onPresetChange={setActivePreset}
                  compact
                />
              </>
            )}

            {step === 4 && (
              <>
                <span className="dcw-eyebrow">
                  <span className="dcw-sq" />
                  {o.readyEyebrow}
                </span>
                <h1 className="dcw-h1">{o.readyTitle}</h1>
                <p className="dcw-recap">
                  {o.recap(incomeValue, Math.max(envs.length, 1))}
                </p>

                {storedCode ? (
                  <RecoveryCodeVault
                    code={storedCode}
                    locale={locale}
                    dir={dir}
                    acked={acked}
                    fragile={fragile}
                    onAck={handleAck}
                    ackLoading={acking}
                    onSecured={() => {
                      void logIncomeIfNeeded();
                      leave(() => router.replace("/dashboard"));
                    }}
                    where="welcome"
                  />
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <p className="dcw-sub">{t.welcomeNoCode}</p>
                    <Button type="button" onClick={() => setClaimOpen(true)} className="w-full">
                      {t.claimCta}
                    </Button>
                  </div>
                )}

                <p className="dcw-caption">{renderMd(o.addExpenseHint)}</p>
              </>
            )}
          </motion.section>
        </div>

        <div className="dcw-nav">
          {step > 0 ? (
            <button type="button" className="dcw-btn dcw-btn-ghost" onClick={() => go(step - 1)}>
              {o.back}
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
              {o.finish}
              <ArrowRight className="dcw-ic dcw-arrow" />
            </button>
          ) : step === 3 ? (
            <button
              type="button"
              className="dcw-btn dcw-btn-accent"
              onClick={() => void saveSplitAndNext()}
              disabled={splitSaving}
            >
              {splitSaving ? o.splitSaving : o.next}
              <ArrowRight className="dcw-ic dcw-arrow" />
            </button>
          ) : (
            <button
              type="button"
              className="dcw-btn dcw-btn-accent"
              onClick={() => {
                if (step === 2) void logIncomeIfNeeded();
                go(step + 1);
              }}
            >
              {o.next}
              <ArrowRight className="dcw-ic dcw-arrow" />
            </button>
          )}
        </div>

        {!last && (
          <button type="button" className="dcw-skip" onClick={handleContinue}>
            {o.skip}
          </button>
        )}
      </main>

      <GuestClaimDialog
        open={claimOpen}
        onOpenChange={setClaimOpen}
        locale={locale}
        dir={dir}
        source="decouverte_nocode"
      />

      <style jsx global>{`
        .dcw-root {
          color-scheme: light;
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
          /* App-theme tokens the embedded <RecoveryCodeVault> consumes — pinned
             to the light "paper" palette so it never inherits the dark theme. */
          --bg: #ffffff;
          --surface-2: #eef2ec;
          --border: #e3e8df;
          --border-strong: #cdd8c8;
          --muted: #4e625a;
          --accent-strong: #0b8f53;
          --success: #0b8f53;
          --warning: #9a5b00;
          --warning-soft: #fff6e6;
          --error: #c0392b;
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

        /* ── concept diagram ── */
        .dcw-root {
          --di-0: #4c7eff;
          --di-1: #f2a93b;
          --di-2: #17c777;
          --di-3: #8b6ad4;
        }
        .dcw-diagram {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          margin: 2px 0 6px;
        }
        .dcw-di-cash {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--ink);
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 5px 16px;
        }
        .dcw-di-arrow {
          width: 2px;
          height: 16px;
          background: var(--border-strong);
        }
        .dcw-di-envs {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px;
        }
        .dcw-di-envs span {
          font-size: 0.72rem;
          font-weight: 700;
          color: #06301f;
          border-radius: 8px;
          padding: 4px 10px;
          filter: saturate(0.9);
        }

        .dcw-concept .dcw-li { align-items: flex-start; }
        .dcw-li-num {
          flex: none;
          width: 22px;
          height: 22px;
          border-radius: 7px;
          background: var(--accent-soft);
          color: var(--accent-deep);
          font-size: 0.78rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .dcw-caption {
          font-size: 0.8rem;
          color: var(--ink-mute);
          margin-top: 2px;
        }

        /* ── income field ── */
        .dcw-income {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 10px;
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 20px;
          margin: 4px 0 10px;
        }
        .dcw-income input {
          width: 150px;
          font-family: inherit;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-align: center;
          color: var(--ink);
          background: transparent;
          border: none;
          outline: none;
        }
        .dcw-income span { font-size: 0.9rem; color: var(--ink-mute); font-weight: 600; }

        .dcw-textlink {
          align-self: center;
          background: none;
          border: none;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--ink-mute);
          cursor: pointer;
          padding: 4px 8px;
        }
        .dcw-textlink:hover:not(:disabled) { color: var(--ink); }
        .dcw-textlink:disabled { opacity: 0.5; cursor: default; }

        /* ── split presets ── */
        .dcw-presets {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 4px 0 8px;
        }
        .dcw-preset {
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: start;
          font: inherit;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 14px;
          cursor: pointer;
          transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .dcw-preset:hover:not(:disabled) {
          border-color: var(--accent);
          transform: translateY(-1px);
          box-shadow: var(--shadow);
        }
        .dcw-preset:disabled { opacity: 0.55; cursor: default; }
        .dcw-preset-ic { font-size: 1.4rem; flex: none; }
        .dcw-preset-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .dcw-preset-body b { font-size: 0.92rem; font-weight: 700; color: var(--ink); }
        .dcw-preset-body span { font-size: 0.78rem; color: var(--ink-soft); line-height: 1.4; }
        .dcw-preset-load { font-size: 0.76rem; font-weight: 700; color: var(--accent-deep); flex: none; }
        .dcw-preset .dcw-arrow { color: var(--ink-mute); flex: none; }

        .dcw-recap {
          font-size: 0.82rem;
          color: var(--ink-soft);
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 9px 12px;
          margin-bottom: 4px;
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
