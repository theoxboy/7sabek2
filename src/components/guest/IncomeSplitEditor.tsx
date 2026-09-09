"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

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

/** Categorical palette for the stacked bar only — decorative, not theme chrome. */
const BAR_COLORS = [
  "#3f7fd6",
  "#d98324",
  "#8b6ad4",
  "#0e9aa8",
  "#12b46c",
  "#d9536a",
  "#6b8e23",
  "#b08900",
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
    allDoneLbl: string;
    allDone: string;
    restToCash: string;
    currency: string;
    presetEqual: string;
    presetEssentials: string;
    presetSave: string;
    addTitle: string;
    addPlaceholder: string;
    addButton: string;
    addError: string;
    capReached: string;
  }
> = {
  fr: {
    left: "Reste à répartir",
    allDoneLbl: "Répartition complète",
    allDone: "Tout est réparti",
    restToCash: "Le reste va dans Cash.",
    currency: "DH",
    presetEqual: "Égal",
    presetEssentials: "L'essentiel d'abord",
    presetSave: "Épargner plus",
    addTitle: "Ajouter une enveloppe",
    addPlaceholder: "Ou tape un nom…",
    addButton: "Ajouter",
    addError: "L'ajout a échoué.",
    capReached: `En mode découverte, tu peux créer jusqu'à ${GUEST_LIMITS.envelopes} enveloppes. Crée ton compte pour en avoir autant que tu veux — tes enveloppes actuelles sont gardées.`,
  },
  en: {
    left: "Left to allocate",
    allDoneLbl: "Split complete",
    allDone: "Everything is allocated",
    restToCash: "The rest goes to Cash.",
    currency: "DH",
    presetEqual: "Equal",
    presetEssentials: "Essentials first",
    presetSave: "Save more",
    addTitle: "Add an envelope",
    addPlaceholder: "Or type a name…",
    addButton: "Add",
    addError: "Couldn't add it.",
    capReached: `In discovery mode you can create up to ${GUEST_LIMITS.envelopes} envelopes. Create your account for as many as you want — your current envelopes are kept.`,
  },
  ar: {
    left: "باقي تقسمو",
    allDoneLbl: "التقسيم كامل",
    allDone: "كلشي مقسّم",
    restToCash: "الباقي كيبقى فلكاش.",
    currency: "درهم",
    presetEqual: "بالتساوي",
    presetEssentials: "الضروري أولاً",
    presetSave: "توفير أكثر",
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
  showPresets = true,
  showAdd = true,
  compact = false,
}: Props) {
  const t = COPY[locale] ?? COPY.fr;
  const [manualName, setManualName] = useState("");

  const total = sumSplit(pct);
  const left = 100 - total;
  const fmt = (n: number) =>
    Math.round(n).toLocaleString(locale === "ar" ? "ar-MA" : "fr-FR");

  const setEnvelope = (id: string, value: number) => {
    const others = total - (pct[id] || 0);
    const capped = Math.max(0, Math.min(100 - others, roundToSplitStep(value)));
    onPctChange({ ...pct, [id]: capped });
    onPresetChange?.(null);
  };

  const applyPreset = (key: SplitPreset) => {
    onPctChange(buildPresetSplit(envelopes, key));
    onPresetChange?.(key);
  };

  const tryAdd = (name: string) => {
    const clean = name.trim();
    if (!clean || addBusy) return;
    void onAddEnvelope(clean).then(() => setManualName(""));
  };

  const present = new Set(envelopes.map((e) => e.name.trim().toLowerCase()));
  const chips = SPLIT_SUGGESTIONS.filter((s) => !present.has(s.fr.toLowerCase()));

  return (
    <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`} dir={dir}>
      {/* summary: left + stacked bar */}
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] font-semibold text-[var(--muted)]">
            {left === 0 ? t.allDoneLbl : t.left}
          </p>
          <p
            className={`${compact ? "text-[1.15rem]" : "text-[1.4rem]"} font-extrabold tabular-nums ${
              left === 0 ? "text-[var(--success)]" : "text-[var(--ink)]"
            }`}
          >
            {left === 0 ? `${t.allDone} ✓` : `${left}%`}
            {income > 0 && left > 0 ? (
              <span className="ms-2 text-[12px] font-semibold text-[var(--muted)]">
                {fmt((income * left) / 100)} {t.currency}
              </span>
            ) : null}
          </p>
        </div>
        <div className="mt-2 flex h-3 gap-[1.5px] overflow-hidden rounded-full bg-[var(--border)]">
          {envelopes.map((e, i) =>
            pct[e.id] ? (
              <span
                key={e.id}
                className="block transition-[width] duration-150"
                style={{ width: `${pct[e.id]}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
                title={`${localizeEnvelopeLabel(e.name, locale)} ${pct[e.id]}%`}
              />
            ) : null
          )}
          {left > 0 ? (
            <span
              className="block transition-[width] duration-150"
              style={{ width: `${left}%`, background: REST_COLOR }}
            />
          ) : null}
        </div>
      </div>

      {showPresets ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["equal", t.presetEqual],
              ["essentials", t.presetEssentials],
              ["save", t.presetSave],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                activePreset === key
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--border-strong,var(--border))] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent-strong,var(--accent))]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {/* envelope rows */}
      <div className="flex flex-col divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {envelopes.map((e, i) => {
          const v = pct[e.id] || 0;
          const cap = 100 - (total - v);
          return (
            <div key={e.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 flex-none rounded-sm"
                  style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--ink)]">
                  {localizeEnvelopeLabel(e.name, locale)}
                </span>
                {income > 0 ? (
                  <>
                    <span className="text-[13.5px] font-bold tabular-nums text-[var(--ink)]">
                      {fmt((income * v) / 100)}
                      <span className="ms-0.5 text-[10px] font-semibold text-[var(--muted)]">
                        {t.currency}
                      </span>
                    </span>
                    <span className="w-8 text-end text-[11px] tabular-nums text-[var(--muted)]">
                      {v}%
                    </span>
                  </>
                ) : (
                  <span className="text-[13.5px] font-bold tabular-nums text-[var(--ink)]">
                    {v}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="-5%"
                  disabled={v <= 0}
                  onClick={() => setEnvelope(e.id, v - STEP)}
                  className="grid h-7 w-7 flex-none place-items-center rounded-lg border border-[var(--border-strong,var(--border))] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-30"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(cap, v)}
                  step={STEP}
                  value={v}
                  onChange={(ev) => setEnvelope(e.id, Number(ev.target.value))}
                  aria-label={localizeEnvelopeLabel(e.name, locale)}
                  className="h-2 flex-1 accent-[var(--accent)]"
                />
                <button
                  type="button"
                  aria-label="+5%"
                  disabled={v >= cap}
                  onClick={() => setEnvelope(e.id, v + STEP)}
                  className="grid h-7 w-7 flex-none place-items-center rounded-lg border border-[var(--border-strong,var(--border))] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-30"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {left > 0 ? (
        <p className="text-[12px] text-[var(--muted)]">{t.restToCash}</p>
      ) : null}

      {showAdd ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong,var(--border))] bg-[var(--surface)] p-3">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ink)]">
            <Plus className="h-3.5 w-3.5 text-[var(--accent-strong,var(--accent))]" />
            {t.addTitle}
          </p>
          {chips.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((s) => (
                <button
                  key={s.fr}
                  type="button"
                  disabled={addBusy}
                  onClick={() => tryAdd(s.fr)}
                  className="rounded-full border border-[var(--border-strong,var(--border))] bg-[var(--surface-2,var(--surface))] px-2.5 py-1 text-[12px] font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent-strong,var(--accent))] disabled:opacity-40"
                >
                  + {s[locale] ?? s.fr}
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex gap-2">
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
              className="min-w-0 flex-1 rounded-lg border border-[var(--border-strong,var(--border))] bg-[var(--surface)] px-3 py-1.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              disabled={addBusy || !manualName.trim()}
              onClick={() => tryAdd(manualName)}
              className="flex-none rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {t.addButton}
            </button>
          </div>
          {addError ? (
            <p className="mt-1.5 text-[12px] text-[var(--error)]">{addError}</p>
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
  if (existing.some((e) => e.name.trim().toLowerCase() === clean.toLowerCase())) return null;
  if (isGuest && existing.length >= GUEST_LIMITS.envelopes) return { error: t.capReached };
  try {
    const created = await apiFetch<{ id: string; name: string }>("/envelopes", {
      method: "POST",
      body: { name: clean, rollover_enabled: false },
    });
    return { id: created.id, name: created.name };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return { error: msg.includes("guest_quota") || /\b20\b/.test(msg) ? t.capReached : t.addError };
  }
}
