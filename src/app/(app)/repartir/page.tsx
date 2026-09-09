"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Lock } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAppLocale } from "@/lib/appLocale";
import { parseAmountInput } from "@/lib/parseAmount";
import { fetchMe, type AuthUser } from "@/lib/auth";
import { guestEvent } from "@/lib/guestAnchorApi";
import { buildPresetSplit, roundToSplitStep, sumSplit, type SplitPreset } from "@/lib/incomeSplit";
import {
  IncomeSplitEditor,
  createSplitEnvelope,
  type SplitEnvelope,
} from "@/components/guest/IncomeSplitEditor";
import type { FloussyLocale } from "@/lib/localePreference";

/** GET/PUT /distribution/config — the split rules, no income required. */
type ConfigItem = {
  target_id: string;
  name: string;
  mode: "none" | "fixed" | "percent";
  percent?: string | null;
  enabled: boolean;
};
type ConfigOut = { auto_enabled: boolean; envelopes: ConfigItem[]; goals: ConfigItem[] };

const COPY: Record<
  FloussyLocale,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    incomeLabel: string;
    currency: string;
    save: string;
    saving: string;
    saved: string;
    saveError: string;
    loadError: string;
    empty: string;
    emptyCta: string;
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
    save: "Enregistrer ma répartition",
    saving: "Enregistrement…",
    saved: "Enregistré",
    saveError: "L'enregistrement a échoué.",
    loadError: "Impossible de charger tes enveloppes.",
    empty: "Tu n'as pas encore d'enveloppes à répartir.",
    emptyCta: "Créer mes enveloppes",
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
    save: "Save my split",
    saving: "Saving…",
    saved: "Saved",
    saveError: "Saving failed.",
    loadError: "Could not load your envelopes.",
    empty: "You have no envelopes to split yet.",
    emptyCta: "Create my envelopes",
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
    save: "حفظ التقسيم ديالي",
    saving: "كيتسجّل…",
    saved: "تسجّل",
    saveError: "الحفظ ما نجحش.",
    loadError: "ما قدرناش نحمّلو الأظرفة ديالك.",
    empty: "مازال ما عندكش أظرفة باش تقسم.",
    emptyCta: "صاوب الأظرفة ديالي",
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

export default function RepartirPage() {
  const { locale, dir } = useAppLocale("fr");
  const t = COPY[locale] ?? COPY.fr;

  const [me, setMe] = useState<AuthUser | null>(null);
  const [envelopes, setEnvelopes] = useState<SplitEnvelope[]>([]);
  const [pct, setPct] = useState<Record<string, number>>({});
  const [activePreset, setActivePreset] = useState<SplitPreset | null>(null);
  const [income, setIncome] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

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

        // Existing percentages, normalised so the screen never opens in error.
        const raw: Record<string, number> = {};
        for (const e of config.envelopes ?? []) {
          raw[e.target_id] =
            e.mode === "percent" && e.enabled && e.percent ? Math.max(0, Number(e.percent)) : 0;
        }
        const rawTotal = sumSplit(raw);
        let next: Record<string, number>;
        if (rawTotal === 0) {
          next = buildPresetSplit(envs, "essentials");
          setActivePreset("essentials");
        } else if (rawTotal > 100) {
          next = {};
          let running = 0;
          envs.forEach((e, i) => {
            const v =
              i === envs.length - 1
                ? Math.max(0, 100 - running)
                : roundToSplitStep((raw[e.id] / rawTotal) * 100);
            next[e.id] = v;
            running += v;
          });
        } else {
          next = {};
          for (const e of envs) next[e.id] = roundToSplitStep(raw[e.id] ?? 0);
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

  const incomeValue = parseAmountInput(income) ?? 0;
  const isGuest = Boolean(me?.is_guest);
  const showNotice = isGuest && !noticeDismissed && !noticeStoredDismissed;

  const handleAdd = async (name: string) => {
    setAddBusy(true);
    setAddErr(null);
    const res = await createSplitEnvelope(name, envelopes, isGuest, locale);
    if (res && "error" in res) {
      setAddErr(res.error);
    } else if (res) {
      setEnvelopes((prev) => [...prev, res]);
      setPct((prev) => ({ ...prev, [res.id]: 0 }));
      setActivePreset(null);
      setSaveState("idle");
      guestEvent("guest_cta_click", { cta: "repartir_add_envelope", route: "/repartir" });
    }
    setAddBusy(false);
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
    setSaveErr(null);
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
      setSaveErr(err instanceof Error ? err.message : t.saveError);
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
        <p className="mt-2 text-center text-[12.5px] text-[var(--error)]">{saveErr ?? t.saveError}</p>
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
        <p className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--error)]">
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
        <div className="mt-5 gap-6 lg:grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start xl:gap-8">
          <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            {notice}
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2,var(--surface))] p-4">
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
            <div className="hidden lg:block">{saveButton}</div>
          </div>

          <div className="mt-5 lg:mt-0">
            <IncomeSplitEditor
              envelopes={envelopes}
              pct={pct}
              onPctChange={(next) => {
                setPct(next);
                setSaveState("idle");
              }}
              onAddEnvelope={handleAdd}
              addBusy={addBusy}
              addError={addErr}
              income={incomeValue}
              locale={locale}
              dir={dir}

              activePreset={activePreset}
              onPresetChange={setActivePreset}
            />
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--bg)]/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="mx-auto max-w-xl">{saveButton}</div>
          </div>
        </div>
      )}
    </div>
  );
}
