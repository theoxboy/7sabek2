"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Lock, Minus, Plus } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAppLocale } from "@/lib/appLocale";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { parseAmountInput } from "@/lib/parseAmount";
import { fetchMe, type AuthUser } from "@/lib/auth";
import { guestEvent } from "@/lib/guestAnchorApi";
import { GUEST_LIMITS } from "@/lib/guestQuota";
import type { FloussyLocale } from "@/lib/localePreference";

/** A short curated list of household envelopes to offer below the list. The
 *  French name is what we POST — envelopeLocalization handles the display. */
const SUGGESTED: { fr: string; en: string; ar: string }[] = [
  { fr: "Santé", en: "Health", ar: "الصحة" },
  { fr: "Loisirs", en: "Leisure", ar: "الترفيه" },
  { fr: "Restaurants", en: "Restaurants", ar: "المطاعم" },
  { fr: "Shopping", en: "Shopping", ar: "التسوق" },
  { fr: "Factures", en: "Bills", ar: "لفواتير" },
  { fr: "Cadeaux", en: "Gifts", ar: "الهدايا" },
  { fr: "Voyage", en: "Travel", ar: "السفر" },
  { fr: "Abonnements", en: "Subscriptions", ar: "الاشتراكات" },
];

/** GET/PUT /distribution/config — the split rules, no income required. */
type ConfigItem = {
  target_id: string;
  name: string;
  mode: "none" | "fixed" | "percent";
  percent?: string | null;
  fixed_amount?: string | null;
  fixed_priority?: number | null;
  enabled: boolean;
};
type ConfigOut = { auto_enabled: boolean; envelopes: ConfigItem[]; goals: ConfigItem[] };

type Envelope = { id: string; name: string };

const STEP = 5;

/**
 * Categorical palette for the stacked bar only — decorative, not theme chrome.
 * Picked to stay legible on both the light and dark app grounds.
 */
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

const COPY: Record<
  FloussyLocale,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    incomeLabel: string;
    currency: string;
    left: string;
    leftAmount: (v: string) => string;
    allDone: string;
    allDoneLbl: string;
    restToCash: string;
    presetEqual: string;
    presetEssentials: string;
    presetSave: string;
    save: string;
    saving: string;
    saved: string;
    loadError: string;
    saveError: string;
    empty: string;
    emptyCta: string;
    addTitle: string;
    addManualPlaceholder: string;
    addButton: string;
    addError: string;
    capReached: string;
    noticeSummary: string;
    noticeMissing: string[];
    noticeCta: string;
    noticeStay: string;
  }
> = {
  fr: {
    eyebrow: "Mode découverte",
    title: "Répartir mon revenu",
    subtitle: "Règle combien va dans chaque enveloppe. Tu peux changer quand tu veux.",
    incomeLabel: "Ton revenu",
    currency: "DH",
    left: "Reste à répartir",
    leftAmount: (v) => `${v} DH pas encore placés`,
    allDone: "Tout est réparti",
    allDoneLbl: "Répartition complète",
    restToCash: "Le reste va dans Cash.",
    presetEqual: "Égal",
    presetEssentials: "L'essentiel d'abord",
    presetSave: "Épargner plus",
    save: "Enregistrer ma répartition",
    saving: "Enregistrement…",
    saved: "Enregistré",
    loadError: "Impossible de charger tes enveloppes.",
    saveError: "L'enregistrement a échoué.",
    empty: "Tu n'as pas encore d'enveloppes à répartir.",
    emptyCta: "Créer mes enveloppes",
    addTitle: "Ajouter une enveloppe",
    addManualPlaceholder: "Ou tape un nom…",
    addButton: "Ajouter",
    addError: "L'ajout a échoué.",
    capReached: `En mode découverte, tu peux créer jusqu'à ${GUEST_LIMITS.envelopes} enveloppes. Crée ton compte pour en avoir autant que tu veux — tes enveloppes actuelles sont gardées.`,
    noticeSummary: "Ce qu'un compte ajoute",
    noticeMissing: [
      "les enveloppes proposées automatiquement d'après tes dépenses",
      "une vue complète de ton salaire, tes revenus et tes dépenses",
    ],
    noticeCta: "Créer mon compte",
    noticeStay: "Continuer sans compte",
  },
  en: {
    eyebrow: "Discovery mode",
    title: "Split my income",
    subtitle: "Set how much goes into each envelope. Change it whenever you like.",
    incomeLabel: "Your income",
    currency: "DH",
    left: "Left to allocate",
    leftAmount: (v) => `${v} DH not placed yet`,
    allDone: "Everything is allocated",
    allDoneLbl: "Split complete",
    restToCash: "The rest goes to Cash.",
    presetEqual: "Equal",
    presetEssentials: "Essentials first",
    presetSave: "Save more",
    save: "Save my split",
    saving: "Saving…",
    saved: "Saved",
    loadError: "Could not load your envelopes.",
    saveError: "Saving failed.",
    empty: "You have no envelopes to split yet.",
    emptyCta: "Create my envelopes",
    addTitle: "Add an envelope",
    addManualPlaceholder: "Or type a name…",
    addButton: "Add",
    addError: "Couldn't add it.",
    capReached: `In discovery mode you can create up to ${GUEST_LIMITS.envelopes} envelopes. Create your account for as many as you want — your current envelopes are kept.`,
    noticeSummary: "What an account adds",
    noticeMissing: [
      "envelopes suggested automatically from your spending",
      "a complete view of your salary, income and expenses",
    ],
    noticeCta: "Create my account",
    noticeStay: "Keep going without an account",
  },
  ar: {
    eyebrow: "وضع الاكتشاف",
    title: "قسّم دخلي",
    subtitle: "حدد شحال كيمشي لكل ظرف. تقدر تبدل فأي وقت.",
    incomeLabel: "الدخل ديالك",
    currency: "درهم",
    left: "باقي تقسمو",
    leftAmount: (v) => `${v} درهم مازال ما تقسموش`,
    allDone: "كلشي مقسّم",
    allDoneLbl: "التقسيم كامل",
    restToCash: "الباقي كيبقى فلكاش.",
    presetEqual: "بالتساوي",
    presetEssentials: "الضروري أولاً",
    presetSave: "توفير أكثر",
    save: "حفظ التقسيم ديالي",
    saving: "كيتسجّل…",
    saved: "تسجّل",
    loadError: "ما قدرناش نحمّلو الأظرفة ديالك.",
    saveError: "الحفظ ما نجحش.",
    empty: "مازال ما عندكش أظرفة باش تقسم.",
    emptyCta: "صاوب الأظرفة ديالي",
    addTitle: "زيد ظرف",
    addManualPlaceholder: "ولا كتب سمية…",
    addButton: "زيد",
    addError: "الزيادة ما نجحاتش.",
    capReached: `ف وضع الاكتشاف تقدر تصاوب حتى ${GUEST_LIMITS.envelopes} ظرف. صاوب حسابك باش يكونو عندك بلا حدود — الأظرفة اللي عندك دابا كتبقى محفوظة.`,
    noticeSummary: "شنو كيزيد ليك الحساب",
    noticeMissing: [
      "الأظرفة مقترحة أوتوماتيك حسب المصاريف ديالك",
      "نظرة كاملة على الراتب، المداخيل والمصاريف",
    ],
    noticeCta: "صاوب حسابي",
    noticeStay: "كمّل بلا حساب",
  },
};

const NOTICE_DISMISS_KEY = "7sabek.guest.repartir_notice.dismissed";

const roundToStep = (n: number) => Math.round(n / STEP) * STEP;
const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + (v || 0), 0);

/** Distribute 100 across envelopes proportionally to weights, in STEP increments,
 *  never exceeding 100 (remainder simply stays in Cash). */
function splitByWeights(ids: string[], weightOf: (id: string) => number): Record<string, number> {
  if (ids.length === 0) return {};
  const total = ids.reduce((s, id) => s + weightOf(id), 0) || ids.length;
  const out: Record<string, number> = {};
  let running = 0;
  ids.forEach((id, i) => {
    if (i === ids.length - 1) {
      out[id] = Math.max(0, Math.min(100 - running, roundToStep((weightOf(id) / total) * 100)));
    } else {
      const v = Math.max(0, Math.min(100 - running, roundToStep((weightOf(id) / total) * 100)));
      out[id] = v;
      running += v;
    }
  });
  return out;
}

/** Rough essential-ness from the raw envelope name, for the presets. */
function essentialWeight(name: string): number {
  const n = name.trim().toLowerCase();
  if (/(loyer|rent|كراء|logement|housing)/.test(n)) return 3;
  if (/(course|food|nourriture|ماكلة|أكل|groc)/.test(n)) return 3;
  if (/(transport|تنقل|carburant|fuel|essence)/.test(n)) return 2;
  if (/(epargne|épargne|saving|ادخار|توفير)/.test(n)) return 2;
  if (/(phone|téléphone|telephone|هاتف|تليفون)/.test(n)) return 1;
  return 1.5;
}
function isSavings(name: string): boolean {
  return /(epargne|épargne|saving|ادخار|توفير)/.test(name.trim().toLowerCase());
}

export default function RepartirPage() {
  const { locale, dir } = useAppLocale("fr");
  const t = COPY[locale] ?? COPY.fr;

  const [me, setMe] = useState<AuthUser | null>(null);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [pct, setPct] = useState<Record<string, number>>({});
  const [income, setIncome] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [manualName, setManualName] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  const noticeStoredDismissed = (() => {
    try {
      return window.localStorage.getItem(NOTICE_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [user, config] = await Promise.all([
          fetchMe().catch(() => null),
          apiFetch<ConfigOut>("/distribution/config"),
        ]);
        if (cancelled) return;
        setMe(user);
        const envs = (config.envelopes ?? []).map((e) => ({ id: e.target_id, name: e.name }));
        setEnvelopes(envs);

        // Read existing percentages, then normalise: an existing config that
        // does not sum to 100 must not open the screen in an error state.
        const raw: Record<string, number> = {};
        for (const e of config.envelopes ?? []) {
          raw[e.target_id] =
            e.mode === "percent" && e.enabled && e.percent ? Math.max(0, Number(e.percent)) : 0;
        }
        const rawTotal = sum(raw);
        let next: Record<string, number>;
        if (rawTotal === 0) {
          next = splitByWeights(envs.map((e) => e.id), (id) => {
            const env = envs.find((x) => x.id === id);
            return env ? essentialWeight(env.name) : 1;
          });
          setActivePreset("essentials");
        } else if (rawTotal > 100) {
          next = {};
          let running = 0;
          envs.forEach((e, i) => {
            const v =
              i === envs.length - 1
                ? Math.max(0, 100 - running)
                : roundToStep((raw[e.id] / rawTotal) * 100);
            next[e.id] = v;
            running += v;
          });
        } else {
          next = {};
          for (const e of envs) next[e.id] = roundToStep(raw[e.id] ?? 0);
        }
        setPct(next);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = useMemo(() => sum(pct), [pct]);
  const left = 100 - total;
  const incomeValue = parseAmountInput(income) ?? 0;
  const isGuest = Boolean(me?.is_guest);
  const showNotice = isGuest && !noticeDismissed && !noticeStoredDismissed;

  const fmt = useCallback(
    (n: number) => Math.round(n).toLocaleString(locale === "ar" ? "ar-MA" : "fr-FR"),
    [locale]
  );

  /** Set one envelope, hard-capped so the total can never exceed 100. */
  const setEnvelope = (id: string, value: number) => {
    setSaveState("idle");
    setActivePreset(null);
    setPct((prev) => {
      const others = sum(prev) - (prev[id] || 0);
      const capped = Math.max(0, Math.min(100 - others, roundToStep(value)));
      return { ...prev, [id]: capped };
    });
  };

  const applyPreset = (key: "equal" | "essentials" | "save") => {
    const ids = envelopes.map((e) => e.id);
    const nameOf = (id: string) => envelopes.find((e) => e.id === id)?.name ?? "";
    let next: Record<string, number>;
    if (key === "equal") {
      next = splitByWeights(ids, () => 1);
    } else if (key === "save") {
      next = splitByWeights(ids, (id) => (isSavings(nameOf(id)) ? 4 : essentialWeight(nameOf(id))));
    } else {
      next = splitByWeights(ids, (id) => essentialWeight(nameOf(id)));
    }
    setPct(next);
    setActivePreset(key);
    setSaveState("idle");
  };

  const addEnvelope = async (rawName: string) => {
    const name = rawName.trim();
    if (!name || addBusy) return;
    if (
      envelopes.some((e) => e.name.trim().toLowerCase() === name.toLowerCase())
    ) {
      setManualName("");
      return;
    }
    if (isGuest && envelopes.length >= GUEST_LIMITS.envelopes) {
      setAddErr(t.capReached);
      return;
    }
    setAddBusy(true);
    setAddErr(null);
    try {
      const created = await apiFetch<{ id: string; name: string }>("/envelopes", {
        method: "POST",
        body: { name, rollover_enabled: false },
      });
      setEnvelopes((prev) => [...prev, { id: created.id, name: created.name }]);
      setPct((prev) => ({ ...prev, [created.id]: 0 }));
      setManualName("");
      setActivePreset(null);
      setSaveState("idle");
      guestEvent("guest_cta_click", { cta: "repartir_add_envelope", route: "/repartir" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setAddErr(
        msg.includes("guest_quota") || /\b20\b/.test(msg) ? t.capReached : t.addError
      );
    } finally {
      setAddBusy(false);
    }
  };

  const dismissNotice = () => {
    setNoticeDismissed(true);
    try {
      window.localStorage.setItem(NOTICE_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const handleSave = async () => {
    setSaveState("saving");
    setErrorMsg(null);
    try {
      await apiFetch<ConfigOut>("/distribution/config", {
        method: "PUT",
        body: {
          auto_enabled: true,
          goals: [],
          envelopes: envelopes.map((e) => {
            const p = pct[e.id] || 0;
            return p > 0
              ? { target_id: e.id, mode: "percent", percent: String(p), enabled: true }
              : { target_id: e.id, mode: "none", enabled: false };
          }),
        },
      });
      setSaveState("saved");
      guestEvent("guest_cta_click", { cta: "repartir_saved", route: "/repartir" });
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : t.saveError);
    }
  };

  const saveButton = (
    <>
      <button
        type="button"
        onClick={handleSave}
        disabled={saveState === "saving"}
        className={`w-full rounded-xl px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${
          saveState === "saved" ? "bg-[var(--accent-strong,var(--accent))]" : "bg-[var(--accent)]"
        }`}
      >
        {saveState === "saving" ? t.saving : saveState === "saved" ? `${t.saved} ✓` : t.save}
      </button>
      {saveState === "error" ? (
        <p className="mt-2 text-center text-[12.5px] text-[var(--error,#b23b2c)]">
          {errorMsg ?? t.saveError}
        </p>
      ) : null}
    </>
  );

  const notice = showNotice ? (
    <details
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2,var(--surface))] px-3.5 py-3"
      open={noticeOpen}
      onToggle={(e) => setNoticeOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
        <Lock className="h-3.5 w-3.5 flex-none text-[var(--accent-strong,var(--accent))]" />
        {t.noticeSummary}
        <ChevronDown
          className={`ms-auto h-3.5 w-3.5 text-[var(--muted)] transition-transform ${
            noticeOpen ? "rotate-180" : ""
          }`}
        />
      </summary>
      <ul className="mt-2.5 space-y-1 ps-4">
        {t.noticeMissing.map((m) => (
          <li key={m} className="flex gap-2 text-[12.5px] text-[var(--muted)]">
            <span aria-hidden="true" className="text-[var(--accent-strong,var(--accent))]">
              •
            </span>
            <span>{m}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href="/onboarding?from=guest"
          onClick={() =>
            guestEvent("guest_cta_click", { cta: "repartir_notice_onboarding", route: "/repartir" })
          }
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:opacity-90"
        >
          {t.noticeCta}
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
        <button
          type="button"
          onClick={dismissNotice}
          className="text-[12px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
        >
          {t.noticeStay}
        </button>
      </div>
    </details>
  ) : null;

  return (
    <div className="w-full pb-28 lg:pb-10" dir={dir}>
      <header className="flex flex-col gap-1.5">
        {isGuest ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--accent-soft,rgba(23,199,119,0.14))] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--accent-strong,var(--accent))]">
            {t.eyebrow}
          </span>
        ) : null}
        <h1 className="text-2xl font-semibold text-[var(--ink)] sm:text-[1.7rem]">{t.title}</h1>
        <p className="max-w-prose text-sm text-[var(--muted)]">{t.subtitle}</p>
      </header>

      {status === "loading" ? (
        <div className="mt-5 h-56 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-2,var(--surface))]" />
      ) : status === "error" ? (
        <p className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--error,#b23b2c)]">
          {t.loadError}
        </p>
      ) : envelopes.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center">
          <p className="text-sm text-[var(--muted)]">{t.empty}</p>
          <Link
            href="/envelopes"
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {t.emptyCta}
          </Link>
        </div>
      ) : (
        <div className="mt-5 gap-6 lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start xl:gap-8">
          {/* ── aside: summary + presets + save (desktop) ── */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            {notice}

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2,var(--surface))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-[var(--muted)]">
                    {left === 0 ? t.allDoneLbl : t.left}
                  </p>
                  <p
                    className={`text-[1.7rem] font-extrabold leading-tight tabular-nums ${
                      left === 0 ? "text-[var(--success,#0b8f53)]" : "text-[var(--ink)]"
                    }`}
                  >
                    {left === 0 ? `${t.allDone} ✓` : `${left}%`}
                  </p>
                </div>
                {incomeValue > 0 && left > 0 ? (
                  <p className="pt-1 text-end text-[12px] text-[var(--muted)]">
                    <span className="font-bold text-[var(--ink)]">
                      {fmt((incomeValue * left) / 100)}
                    </span>{" "}
                    {t.currency}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 flex h-3 gap-[1.5px] overflow-hidden rounded-full bg-[var(--border)]">
                {envelopes.map((e, i) =>
                  pct[e.id] ? (
                    <span
                      key={e.id}
                      className="block transition-[width] duration-150"
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
                    className="block transition-[width] duration-150"
                    style={{ width: `${left}%`, background: REST_COLOR }}
                  />
                ) : null}
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-dashed border-[var(--border-strong,var(--border))] pt-3">
                <label htmlFor="repartir-income" className="text-[12.5px] text-[var(--muted)]">
                  {t.incomeLabel}
                </label>
                <input
                  id="repartir-income"
                  inputMode="decimal"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="6000"
                  className="w-24 rounded-lg border border-[var(--border-strong,var(--border))] bg-[var(--surface)] px-2.5 py-1.5 text-center text-[13px] font-bold tabular-nums text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
                <span className="text-[12.5px] text-[var(--muted)]">{t.currency}</span>
              </div>
            </div>

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
                      : "border-[var(--border-strong,var(--border))] bg-[var(--surface)] text-[var(--ink-soft,var(--muted))] hover:border-[var(--accent)] hover:text-[var(--accent-strong,var(--accent))]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {left > 0 ? (
              <p className="text-[12.5px] text-[var(--muted)]">{t.restToCash}</p>
            ) : null}

            <div className="hidden lg:block">{saveButton}</div>
          </div>

          {/* ── main: envelope cards + add ── */}
          <div className="mt-5 flex flex-col gap-4 lg:mt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {envelopes.map((e, i) => {
              const v = pct[e.id] || 0;
              const capForThis = 100 - (total - v);
              return (
                <div
                  key={e.id}
                  className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 flex-none rounded-sm"
                      style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[var(--ink)]">
                      {localizeEnvelopeLabel(e.name, locale)}
                    </span>
                    {incomeValue > 0 ? (
                      <>
                        <span className="text-[14px] font-bold tabular-nums text-[var(--ink)]">
                          {fmt((incomeValue * v) / 100)}
                          <span className="ms-0.5 text-[10px] font-semibold text-[var(--muted)]">
                            {t.currency}
                          </span>
                        </span>
                        <span className="w-9 text-end text-[11.5px] tabular-nums text-[var(--muted)]">
                          {v}%
                        </span>
                      </>
                    ) : (
                      <span className="text-[14px] font-bold tabular-nums text-[var(--ink)]">
                        {v}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      aria-label="-5%"
                      disabled={v <= 0}
                      onClick={() => setEnvelope(e.id, v - STEP)}
                      className="grid h-7 w-7 flex-none place-items-center rounded-lg border border-[var(--border-strong,var(--border))] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent-strong,var(--accent))] disabled:opacity-30"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(capForThis, v)}
                      step={STEP}
                      value={v}
                      onChange={(ev) => setEnvelope(e.id, Number(ev.target.value))}
                      aria-label={localizeEnvelopeLabel(e.name, locale)}
                      className="h-2 flex-1 accent-[var(--accent)]"
                    />
                    <button
                      type="button"
                      aria-label="+5%"
                      disabled={v >= capForThis}
                      onClick={() => setEnvelope(e.id, v + STEP)}
                      className="grid h-7 w-7 flex-none place-items-center rounded-lg border border-[var(--border-strong,var(--border))] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent-strong,var(--accent))] disabled:opacity-30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* add an envelope — suggestions + manual */}
          <div className="rounded-xl border border-dashed border-[var(--border-strong,var(--border))] bg-[var(--surface)] p-3.5">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)]">
              <Plus className="h-3.5 w-3.5 text-[var(--accent-strong,var(--accent))]" />
              {t.addTitle}
            </p>
            {(() => {
              const present = new Set(envelopes.map((e) => e.name.trim().toLowerCase()));
              const chips = SUGGESTED.filter((s) => !present.has(s.fr.toLowerCase()));
              return chips.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {chips.map((s) => (
                    <button
                      key={s.fr}
                      type="button"
                      disabled={addBusy}
                      onClick={() => addEnvelope(s.fr)}
                      className="rounded-full border border-[var(--border-strong,var(--border))] bg-[var(--surface-2,var(--surface))] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-soft,var(--ink))] hover:border-[var(--accent)] hover:text-[var(--accent-strong,var(--accent))] disabled:opacity-40"
                    >
                      + {s[locale] ?? s.fr}
                    </button>
                  ))}
                </div>
              ) : null;
            })()}
            <div className="mt-2.5 flex gap-2">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addEnvelope(manualName);
                  }
                }}
                placeholder={t.addManualPlaceholder}
                maxLength={40}
                className="min-w-0 flex-1 rounded-lg border border-[var(--border-strong,var(--border))] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                disabled={addBusy || !manualName.trim()}
                onClick={() => void addEnvelope(manualName)}
                className="flex-none rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                {t.addButton}
              </button>
            </div>
            {addErr ? (
              <p className="mt-2 text-[12px] text-[var(--error,#b23b2c)]">{addErr}</p>
            ) : null}
          </div>
          </div>

          {/* ── mobile sticky save ── */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="mx-auto max-w-xl">{saveButton}</div>
          </div>
        </div>
      )}
    </div>
  );
}
