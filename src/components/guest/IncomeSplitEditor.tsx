"use client";

import { useState, useMemo } from "react";
import {
  Minus,
  Plus,
  Undo2,
  Lock,
  Unlock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { GUEST_LIMITS } from "@/lib/guestQuota";
import {
  SPLIT_STEP as STEP,
  buildPresetSplit,
  roundToSplitStep,
  sumSplit,
  type SplitPreset,
} from "@/lib/incomeSplit";
import type { FloussyLocale } from "@/lib/localePreference";

export type SplitEnvelope = { id: string; name: string };

/** Categorical palette for the stacked bar only — decorative, not theme chrome.
 *  16 hues so the guest envelope cap (20) rarely forces a repeat. */
const BAR_COLORS = [
  "#3f7fd6",
  "#d98324",
  "#8b6ad4",
  "#0e9aa8",
  "#12b46c",
  "#d9536a",
  "#6b8e23",
  "#b08900",
  "#5c6bc0",
  "#e07a5f",
  "#2a9d8f",
  "#c65d9c",
  "#7d8597",
  "#3aa0ff",
  "#9c6644",
  "#d4a017",
];
const REST_COLOR = "var(--border-strong, var(--border))";

/** Curated household envelopes offered below the list. The French name is what
 *  we POST — envelopeLocalization handles the display. */
export const SPLIT_SUGGESTIONS: { fr: string; en: string; ar: string }[] = [
  { fr: "Santé", en: "Health", ar: "الصحة" },
  { fr: "Loisirs", en: "Leisure", ar: "الترفيه" },
  { fr: "Restaurants", en: "Restaurants", ar: "المطاعم" },
  { fr: "Shopping", en: "Shopping", ar: "التسوق" },
  { fr: "Factures", en: "Bills", ar: "لفواتير" },
  { fr: "Cadeaux", en: "Gifts", ar: "الهدايا" },
  { fr: "Voyage", en: "Travel", ar: "السفر" },
  { fr: "Abonnements", en: "Subscriptions", ar: "الاشتراكات" },
];

const COPY: Record<
  FloussyLocale,
  {
    left: string;
    overBudget: string;
    allDoneLbl: string;
    allDone: string;
    restToCash: string;
    currency: string;
    presetEqual: string;
    presetEssentials: string;
    presetSave: string;
    recommended: string;
    undo: string;
    decrease: string;
    increase: string;
    locked: string;
    unlocked: string;
    autoBalance: string;
    autoBalanceHint: string;
    addMore: string;
    addTitle: string;
    addPlaceholder: string;
    addButton: string;
    addError: string;
    capReached: string;
  }
> = {
  fr: {
    left: "Reste à répartir",
    overBudget: "Dépassement de",
    allDoneLbl: "Répartition complète",
    allDone: "Tout est réparti à 100%",
    restToCash: "Le reste reste dans Cash.",
    currency: "DH",
    presetEqual: "Égal",
    presetEssentials: "L'essentiel d'abord",
    presetSave: "Épargner plus",
    recommended: "Recommandé",
    undo: "Annuler",
    decrease: "Diminuer",
    increase: "Augmenter",
    locked: "Fixe",
    unlocked: "Flexible",
    autoBalance: "Équilibrer automatiquement",
    autoBalanceHint: "Ajuste les enveloppes flexibles pour atteindre 100%",
    addMore: "+ Ajouter une autre enveloppe (optionnel)",
    addTitle: "Ajouter une enveloppe",
    addPlaceholder: "Ou tape un nom…",
    addButton: "Ajouter",
    addError: "L'ajout a échoué.",
    capReached: `En mode découverte, tu peux créer jusqu'à ${GUEST_LIMITS.envelopes} enveloppes. Crée ton compte pour en avoir autant que tu veux — tes enveloppes actuelles sont gardées.`,
  },
  en: {
    left: "Left to allocate",
    overBudget: "Over budget by",
    allDoneLbl: "Split complete",
    allDone: "100% fully allocated",
    restToCash: "The rest stays in Cash.",
    currency: "DH",
    presetEqual: "Equal",
    presetEssentials: "Essentials first",
    presetSave: "Save more",
    recommended: "Recommended",
    undo: "Undo",
    decrease: "Decrease",
    increase: "Increase",
    locked: "Fixed",
    unlocked: "Flexible",
    autoBalance: "Auto-balance remaining",
    autoBalanceHint: "Adjusts flexible envelopes to reach 100%",
    addMore: "+ Add another envelope (optional)",
    addTitle: "Add an envelope",
    addPlaceholder: "Or type a name…",
    addButton: "Add",
    addError: "Couldn't add it.",
    capReached: `In discovery mode you can create up to ${GUEST_LIMITS.envelopes} envelopes. Create your account for as many as you want — your current envelopes are kept.`,
  },
  ar: {
    left: "باقي تقسمو",
    overBudget: "فائض بـ",
    allDoneLbl: "التقسيم كامل",
    allDone: "الميزانية مقسمة 100%",
    restToCash: "الباقي كيبقى فلكاش.",
    currency: "درهم",
    presetEqual: "بالتساوي",
    presetEssentials: "الضروري أولاً",
    presetSave: "توفير أكثر",
    recommended: "موصى به",
    undo: "رجّع",
    decrease: "نقّص",
    increase: "زيد",
    locked: "ثابت",
    unlocked: "مرن",
    autoBalance: "موازنة أوتوماتيكية",
    autoBalanceHint: "كيقاد الأظرفة المرنة باش تكمل 100%",
    addMore: "+ زيد ظرف آخر (اختياري)",
    addTitle: "زيد ظرف",
    addPlaceholder: "ولا كتب سمية…",
    addButton: "زيد",
    addError: "الزيادة ما نجحاتش.",
    capReached: `ف وضع الاكتشاف تقدر تصاوب حتى ${GUEST_LIMITS.envelopes} ظرف. صاوب حسابك باش يكونو عندك بلا حدود — الأظرفة اللي عندك دابا كتبقى محفوظة.`,
  },
};

type Props = {
  envelopes: SplitEnvelope[];
  /** Controlled: envelope id → percentage (multiples of SPLIT_STEP). */
  pct: Record<string, number>;
  onPctChange: (next: Record<string, number>) => void;
  /** Parent does POST /envelopes and updates `envelopes` + `pct`. */
  onAddEnvelope: (name: string) => Promise<void>;
  addBusy?: boolean;
  addError?: string | null;
  /** Monthly income for the DH preview; 0 or undefined hides amounts. */
  income?: number;
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
  activePreset?: SplitPreset | null;
  onPresetChange?: (p: SplitPreset | null) => void;
  /** Optional one-line explanation shown under the active preset chip. */
  presetDescriptions?: Record<SplitPreset, string>;
  /** When true, the add-envelope inputs are replaced by the cap notice. */
  atEnvelopeCap?: boolean;
  showPresets?: boolean;
  showAdd?: boolean;
  compact?: boolean;
};

export function IncomeSplitEditor({
  envelopes,
  pct,
  onPctChange,
  onAddEnvelope,
  addBusy = false,
  addError = null,
  income = 0,
  locale,
  dir,
  activePreset = null,
  onPresetChange,
  presetDescriptions,
  atEnvelopeCap = false,
  showPresets = true,
  showAdd = true,
  compact = false,
}: Props) {
  const t = COPY[locale] ?? COPY.fr;
  const [manualName, setManualName] = useState("");
  const [addExpanded, setAddExpanded] = useState(false);

  // Default: lock rent/housing by default if found, as rent is almost universally fixed
  const [lockedIds, setLockedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    envelopes.forEach((e) => {
      const n = e.name.trim().toLowerCase();
      if (/(loyer|rent|كراء|logement|housing)/.test(n)) {
        initial.add(e.id);
      }
    });
    return initial;
  });

  /** Snapshot of the split from just before the last preset click, for one-tap undo. */
  const [undoSnapshot, setUndoSnapshot] = useState<{
    pct: Record<string, number>;
    preset: SplitPreset | null;
  } | null>(null);

  const total = sumSplit(pct);
  const left = 100 - total;
  const fmt = (n: number) =>
    Math.round(n).toLocaleString(locale === "ar" ? "ar-MA" : "fr-FR");

  const toggleLock = (id: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setEnvelope = (id: string, value: number) => {
    const capped = Math.max(0, Math.min(100, roundToSplitStep(value)));
    onPctChange({ ...pct, [id]: capped });
    onPresetChange?.(null);
    setUndoSnapshot(null);
  };

  /** Smart Auto-Balance: distribute surplus or deficit across unlocked envelopes in clean 5% steps */
  const autoBalance = () => {
    const lockedSum = envelopes
      .filter((e) => lockedIds.has(e.id))
      .reduce((sum, e) => sum + (pct[e.id] || 0), 0);

    const availablePct = Math.max(0, 100 - lockedSum);
    const unlockedEnvelopes = envelopes.filter((e) => !lockedIds.has(e.id));

    if (unlockedEnvelopes.length === 0) {
      // If all are locked, unlock all and re-distribute
      setLockedIds(new Set());
      return;
    }

    const unlockedIds = unlockedEnvelopes.map((e) => e.id);
    const totalCurrentUnlocked = unlockedIds.reduce(
      (sum, id) => sum + (pct[id] || 0),
      0
    );

    const nextPct: Record<string, number> = { ...pct };

    if (availablePct === 0) {
      unlockedIds.forEach((id) => {
        nextPct[id] = 0;
      });
    } else {
      const ideal = unlockedIds.map((id) => {
        const w = totalCurrentUnlocked > 0 ? pct[id] || 0 : 1;
        return (
          ((w / (totalCurrentUnlocked || unlockedIds.length)) * availablePct) /
          STEP
        );
      });
      const base = ideal.map((n) => Math.floor(n));
      let steps = Math.round(availablePct / STEP) - base.reduce((s, n) => s + n, 0);

      const order = unlockedIds
        .map((_, i) => i)
        .sort((a, b) => ideal[b] - base[b] - (ideal[a] - base[a]));
      for (let k = 0; steps > 0 && k < order.length; k++, steps--) {
        base[order[k]] += 1;
      }

      unlockedIds.forEach((id, i) => {
        nextPct[id] = base[i] * STEP;
      });
    }

    setUndoSnapshot({ pct, preset: activePreset });
    onPctChange(nextPct);
    onPresetChange?.(null);
  };

  const applyPreset = (key: SplitPreset) => {
    if (key === activePreset) return;
    setUndoSnapshot({ pct, preset: activePreset });
    onPctChange(buildPresetSplit(envelopes, key));
    onPresetChange?.(key);
  };

  const undoPreset = () => {
    if (!undoSnapshot) return;
    onPctChange(undoSnapshot.pct);
    onPresetChange?.(undoSnapshot.preset);
    setUndoSnapshot(null);
  };

  const tryAdd = (name: string) => {
    const clean = name.trim();
    if (!clean || addBusy || atEnvelopeCap) return;
    setUndoSnapshot(null);
    void onAddEnvelope(clean).then(() => setManualName(""));
  };

  const present = new Set(envelopes.map((e) => e.name.trim().toLowerCase()));
  const chips = SPLIT_SUGGESTIONS.filter(
    (s) => !present.has(s.fr.toLowerCase())
  );

  return (
    <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`} dir={dir}>
      {/* Summary: Header with Live Balance & Magic Auto-Fit */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
              {left === 0 ? t.allDoneLbl : left > 0 ? t.left : t.overBudget}
            </p>
            <p
              className={`${
                compact ? "text-[1.15rem]" : "text-[1.35rem]"
              } font-black tabular-nums ${
                left === 0
                  ? "text-[var(--accent-strong,#0b8f53)]"
                  : left > 0
                  ? "text-[var(--ink)]"
                  : "text-[var(--error,#c0392b)]"
              }`}
            >
              {left === 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>{t.allDone}</span>
                </span>
              ) : left > 0 ? (
                `${left}%`
              ) : (
                `+${Math.abs(left)}%`
              )}
              {income > 0 ? (
                <span className="ms-2 text-[12px] font-semibold text-[var(--muted)]">
                  ({fmt((income * Math.abs(left)) / 100)} {t.currency})
                </span>
              ) : null}
            </p>
          </div>

          {/* Quick Balance Status Pill */}
          <div className="text-end">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                left === 0
                  ? "bg-[#17C777]/15 text-[#0B8F53]"
                  : left > 0
                  ? "bg-amber-500/15 text-amber-600"
                  : "bg-red-500/15 text-red-600"
              }`}
            >
              {total}% / 100%
            </span>
          </div>
        </div>

        {/* Stacked Proportional Bar */}
        <div
          className="mt-2.5 flex h-2.5 gap-[1.5px] overflow-hidden rounded-full bg-[var(--surface-2)]"
          role="img"
          aria-label={`${total}% allocated`}
        >
          {envelopes.map((e, i) =>
            pct[e.id] ? (
              <span
                key={e.id}
                className="block transition-[width] duration-200"
                style={{
                  width: `${pct[e.id]}%`,
                  background: BAR_COLORS[i % BAR_COLORS.length],
                }}
                title={`${localizeEnvelopeLabel(e.name, locale)} ${pct[e.id]}%`}
              />
            ) : null
          )}
          {left > 0 ? (
            <span
              className="block transition-[width] duration-200"
              style={{ width: `${left}%`, background: REST_COLOR }}
            />
          ) : null}
        </div>

        {/* Magic Auto-Balance Button */}
        {left !== 0 ? (
          <button
            type="button"
            onClick={autoBalance}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft,#e2f7ec)] p-2.5 text-xs font-bold text-[var(--accent-strong,#0b8f53)] shadow-sm transition-all hover:bg-[var(--accent)]/20 active:scale-[0.99]"
          >
            <Sparkles className="h-4 w-4 text-[var(--accent-strong,#0b8f53)] animate-pulse" />
            <span>
              {t.autoBalance} (
              {left > 0 ? `${left}%` : `-${Math.abs(left)}%`})
            </span>
          </button>
        ) : null}
      </div>

      {/* Preset Strategy Buttons */}
      {showPresets ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["essentials", t.presetEssentials, true],
                ["equal", t.presetEqual, false],
                ["save", t.presetSave, false],
              ] as const
            ).map(([key, label, isRec]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                aria-pressed={activePreset === key}
                className={`group relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                  activePreset === key
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
                }`}
              >
                <span>{label}</span>
                {isRec ? (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-extrabold uppercase ${
                      activePreset === key
                        ? "bg-white/20 text-white"
                        : "bg-[#17C777]/20 text-[#0B8F53]"
                    }`}
                  >
                    {t.recommended}
                  </span>
                ) : null}
              </button>
            ))}

            {undoSnapshot ? (
              <button
                type="button"
                onClick={undoPreset}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--ink)]"
              >
                <Undo2 className="h-3.5 w-3.5" />
                {t.undo}
              </button>
            ) : null}
          </div>
          {activePreset && presetDescriptions?.[activePreset] ? (
            <p className="text-[11.5px] font-medium text-[var(--muted)]">
              {presetDescriptions[activePreset]}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Envelope Cards: Clean, Compact & Touch-friendly */}
      <div className="grid gap-2">
        {envelopes.map((e, i) => {
          const label = localizeEnvelopeLabel(e.name, locale);
          const v = pct[e.id] || 0;
          const isLocked = lockedIds.has(e.id);
          const valueInDh = income > 0 ? (income * v) / 100 : 0;

          return (
            <div
              key={e.id}
              className={`flex flex-col gap-2 rounded-2xl border p-3 shadow-sm transition-all ${
                isLocked
                  ? "border-[var(--accent)]/50 bg-[var(--surface)]"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              {/* Top Row: Name, Lock toggle, and Amount in DH + % */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
                  />
                  <span className="truncate text-[13.5px] font-bold text-[var(--ink)]">
                    {label}
                  </span>

                  {/* Lock / Flexible Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleLock(e.id)}
                    aria-label={isLocked ? t.unlocked : t.locked}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold transition-colors ${
                      isLocked
                        ? "border border-[var(--accent)]/40 bg-[var(--accent-soft,#e2f7ec)] text-[var(--accent-strong,#0b8f53)]"
                        : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <Lock className="h-2.5 w-2.5 stroke-[2.5]" />
                        <span>{t.locked}</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-2.5 w-2.5 opacity-60" />
                        <span>{t.unlocked}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Amount in DH and % */}
                <div className="flex flex-none items-baseline gap-1.5 text-end">
                  {income > 0 ? (
                    <span className="text-[14px] font-extrabold tabular-nums text-[var(--ink)]">
                      {fmt(valueInDh)}{" "}
                      <span className="text-[10px] font-bold text-[var(--muted)]">
                        {t.currency}
                      </span>
                    </span>
                  ) : null}
                  <span className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[11.5px] font-extrabold tabular-nums text-[var(--ink)]">
                    {v}%
                  </span>
                </div>
              </div>

              {/* Bottom Row: Stepper Buttons & Slider */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`${t.decrease} ${label}`}
                  disabled={v <= 0}
                  onClick={() => setEnvelope(e.id, v - STEP)}
                  className="grid h-8 w-8 flex-none place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] transition-transform hover:border-[var(--accent)] active:scale-95 disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <div className="relative flex flex-1 items-center">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={STEP}
                    value={v}
                    onChange={(ev) => setEnvelope(e.id, Number(ev.target.value))}
                    aria-label={label}
                    className="h-2 w-full flex-1 cursor-pointer accent-[var(--accent)]"
                  />
                </div>

                <button
                  type="button"
                  aria-label={`${t.increase} ${label}`}
                  disabled={v >= 100}
                  onClick={() => setEnvelope(e.id, v + STEP)}
                  className="grid h-8 w-8 flex-none place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] transition-transform hover:border-[var(--accent)] active:scale-95 disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {left > 0 ? (
        <p className="text-[12px] font-medium text-[var(--muted)]">
          {t.restToCash}
        </p>
      ) : null}

      {/* Collapsible Add Envelope Accordion: Saves massive screen height */}
      {showAdd ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-3">
          <button
            type="button"
            onClick={() => setAddExpanded(!addExpanded)}
            className="flex w-full items-center justify-between text-start text-xs font-bold text-[var(--ink)] transition-colors hover:text-[var(--accent-strong)]"
          >
            <span className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
              <span>{t.addMore}</span>
            </span>
            {addExpanded ? (
              <ChevronUp className="h-4 w-4 text-[var(--muted)]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
            )}
          </button>

          {addExpanded ? (
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              {atEnvelopeCap ? (
                <p className="text-[12px] text-[var(--muted)]">
                  {t.capReached}
                </p>
              ) : (
                <>
                  {chips.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {chips.map((s) => (
                        <button
                          key={s.fr}
                          type="button"
                          disabled={addBusy}
                          onClick={() => tryAdd(s.fr)}
                          className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-strong)] disabled:opacity-40"
                        >
                          + {s[locale] ?? s.fr}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-2.5 flex gap-2">
                    <input
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          tryAdd(manualName);
                        }
                      }}
                      placeholder={t.addPlaceholder}
                      maxLength={40}
                      className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      disabled={addBusy || !manualName.trim()}
                      onClick={() => tryAdd(manualName)}
                      className="flex-none rounded-xl bg-[var(--accent)] px-4 py-1.5 text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                    >
                      {t.addButton}
                    </button>
                  </div>
                  {addError ? (
                    <p className="mt-1.5 text-[12px] text-[var(--error)]">
                      {addError}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Shared add-envelope handler: POST /envelopes, then let the caller merge. */
export async function createSplitEnvelope(
  name: string,
  existing: SplitEnvelope[],
  isGuest: boolean,
  locale: FloussyLocale
): Promise<{ id: string; name: string } | { error: string } | null> {
  const clean = name.trim();
  const t = COPY[locale] ?? COPY.fr;
  if (!clean) return null;
  if (
    existing.some((e) => e.name.trim().toLowerCase() === clean.toLowerCase())
  )
    return null;
  if (isGuest && existing.length >= GUEST_LIMITS.envelopes)
    return { error: t.capReached };
  try {
    const created = await apiFetch<{ id: string; name: string }>("/envelopes", {
      method: "POST",
      body: { name: clean, rollover_enabled: false },
    });
    return { id: created.id, name: created.name };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return {
      error:
        msg.includes("guest_quota") || /\b20\b/.test(msg)
          ? t.capReached
          : t.addError,
    };
  }
}
