"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, Lock } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAppLocale } from "@/lib/appLocale";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { parseAmountInput } from "@/lib/parseAmount";
import { fetchMe, type AuthUser } from "@/lib/auth";
import { guestEvent } from "@/lib/guestAnchorApi";
import type { FloussyLocale } from "@/lib/localePreference";

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

const COPY: Record<
  FloussyLocale,
  {
    title: string;
    subtitle: string;
    incomeLabel: string;
    incomePlaceholder: string;
    total: string;
    over: string;
    rest: string;
    save: string;
    saving: string;
    saved: string;
    loadError: string;
    saveError: string;
    empty: string;
    noticeTitle: string;
    noticeIntro: string;
    noticeMissing: string[];
    noticeCta: string;
    noticeStay: string;
  }
> = {
  fr: {
    title: "Répartir mon revenu",
    subtitle: "Règle le pourcentage de ton revenu qui va dans chaque enveloppe.",
    incomeLabel: "Revenu à répartir (pour l'aperçu)",
    incomePlaceholder: "ex. 6000",
    total: "Total réparti",
    over: "Tu dépasses 100 %. Réduis quelques enveloppes.",
    rest: "Le reste va dans Cash.",
    save: "Enregistrer ma répartition",
    saving: "Enregistrement…",
    saved: "Répartition enregistrée.",
    loadError: "Impossible de charger tes enveloppes.",
    saveError: "L'enregistrement a échoué.",
    empty: "Tu n'as pas encore d'enveloppes. Crée-en d'abord dans « Enveloppes ».",
    noticeTitle: "En mode découverte",
    noticeIntro: "Tu règles ta répartition ici. Ce que tu n'as pas sans compte :",
    noticeMissing: [
      "les enveloppes proposées automatiquement d'après tes dépenses",
      "une vue complète de ton salaire, de tes revenus et de tes dépenses",
    ],
    noticeCta: "Créer mon compte",
    noticeStay: "Continuer sans compte",
  },
  en: {
    title: "Split my income",
    subtitle: "Set the share of your income that goes into each envelope.",
    incomeLabel: "Income to split (for the preview)",
    incomePlaceholder: "e.g. 6000",
    total: "Total allocated",
    over: "You're over 100%. Lower a few envelopes.",
    rest: "The rest stays in Cash.",
    save: "Save my split",
    saving: "Saving…",
    saved: "Split saved.",
    loadError: "Could not load your envelopes.",
    saveError: "Saving failed.",
    empty: "You have no envelopes yet. Create some first in \"Envelopes\".",
    noticeTitle: "In discovery mode",
    noticeIntro: "You set up your split here. What you don't get without an account:",
    noticeMissing: [
      "envelopes suggested automatically from your spending",
      "a complete view of your salary, income and expenses",
    ],
    noticeCta: "Create my account",
    noticeStay: "Keep going without an account",
  },
  ar: {
    title: "قسّم دخلي",
    subtitle: "حدد النسبة ديال دخلك اللي كتمشي لكل ظرف.",
    incomeLabel: "الدخل اللي غادي تقسم (للمعاينة)",
    incomePlaceholder: "مثلا 6000",
    total: "المجموع المقسّم",
    over: "فوتّي 100٪. نقّص من شي أظرفة.",
    rest: "الباقي كيبقى فلكاش.",
    save: "حفظ التقسيم ديالي",
    saving: "كيتسجّل…",
    saved: "التقسيم تسجّل.",
    loadError: "ما قدرناش نحمّلو الأظرفة ديالك.",
    saveError: "الحفظ ما نجحش.",
    empty: "مازال ما عندكش أظرفة. صاوب شي وحدين ف « الأظرفة ».",
    noticeTitle: "ف وضع الاكتشاف",
    noticeIntro: "كتعدّل التقسيم ديالك هنا. اللي ما عندكش بلا حساب:",
    noticeMissing: [
      "الأظرفة المقترحة أوتوماتيك حسب المصاريف ديالك",
      "نظرة كاملة على الراتب، المداخيل والمصاريف ديالك",
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
  const [envelopes, setEnvelopes] = useState<ConfigItem[]>([]);
  const [percents, setPercents] = useState<Record<string, number>>({});
  const [income, setIncome] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
        const envs = config.envelopes ?? [];
        setEnvelopes(envs);
        const initial: Record<string, number> = {};
        for (const env of envs) {
          initial[env.target_id] =
            env.mode === "percent" && env.enabled && env.percent
              ? Math.round(Number(env.percent))
              : 0;
        }
        setPercents(initial);
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

  const total = useMemo(
    () => Object.values(percents).reduce((sum, v) => sum + (v || 0), 0),
    [percents]
  );
  const incomeValue = parseAmountInput(income) ?? 0;
  const isGuest = Boolean(me?.is_guest);
  const showNotice = isGuest && !noticeDismissed && !noticeStoredDismissed;

  const setEnvelopePercent = (id: string, value: number) => {
    setSaveState("idle");
    setPercents((prev) => ({ ...prev, [id]: Math.max(0, Math.min(100, Math.round(value))) }));
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
    if (total > 100) return;
    setSaveState("saving");
    setErrorMsg(null);
    try {
      await apiFetch<ConfigOut>("/distribution/config", {
        method: "PUT",
        body: {
          auto_enabled: true,
          goals: [],
          envelopes: envelopes.map((env) => {
            const p = percents[env.target_id] || 0;
            return p > 0
              ? { target_id: env.target_id, mode: "percent", percent: String(p), enabled: true }
              : { target_id: env.target_id, mode: "none", enabled: false };
          }),
        },
      });
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : t.saveError);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6" dir={dir}>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-[var(--ink)]">{t.title}</h1>
        <p className="text-sm text-[var(--muted)]">{t.subtitle}</p>
      </header>

      {showNotice ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card,var(--surface))] p-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[var(--accent-soft,rgba(23,199,119,0.14))] text-[var(--accent-strong,var(--accent))]"
            >
              <Lock className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--ink)]">{t.noticeTitle}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--muted)]">{t.noticeIntro}</p>
              <ul className="mt-1.5 space-y-1">
                {t.noticeMissing.map((m) => (
                  <li key={m} className="flex gap-2 text-[13px] text-[var(--muted)]">
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
                    guestEvent("guest_cta_click", {
                      cta: "repartir_notice_onboarding",
                      route: "/repartir",
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
                >
                  {t.noticeCta}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
                <button
                  type="button"
                  onClick={dismissNotice}
                  className="text-[12px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  {t.noticeStay}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {status === "loading" ? (
        <p className="text-sm text-[var(--muted)]">…</p>
      ) : status === "error" ? (
        <p className="rounded-xl bg-[var(--error-soft,#fdecea)] px-3 py-2 text-sm text-[var(--error,#b23b2c)]">
          {t.loadError}
        </p>
      ) : envelopes.length === 0 ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          {t.empty}
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--ink)]">{t.incomeLabel}</span>
            <input
              inputMode="decimal"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder={t.incomePlaceholder}
              className="w-40 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--ink)]"
            />
          </label>

          <div className="flex flex-col divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            {envelopes.map((env) => {
              const p = percents[env.target_id] || 0;
              return (
                <div key={env.target_id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--ink)]">
                      {localizeEnvelopeLabel(env.name, locale)}
                    </span>
                    <span className="text-sm tabular-nums text-[var(--muted)]">
                      {p}%
                      {incomeValue > 0 ? (
                        <span className="ms-2 text-[var(--accent-strong,var(--accent))]">
                          {Math.round((incomeValue * p) / 100)} MAD
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={p}
                    onChange={(e) => setEnvelopePercent(env.target_id, Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--ink)]">{t.total}</span>
              <span
                className={`tabular-nums font-semibold ${
                  total > 100 ? "text-[var(--error,#b23b2c)]" : "text-[var(--ink)]"
                }`}
              >
                {total}%
              </span>
            </div>
            {total > 100 ? (
              <p className="flex items-center gap-1.5 text-[13px] text-[var(--error,#b23b2c)]">
                <Info className="h-3.5 w-3.5" /> {t.over}
              </p>
            ) : total < 100 ? (
              <p className="text-[13px] text-[var(--muted)]">{t.rest}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={total > 100 || saveState === "saving"}
              className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saveState === "saving" ? t.saving : t.save}
            </button>
            {saveState === "saved" ? (
              <span className="text-[13px] font-medium text-[var(--success,#0b8f53)]">{t.saved}</span>
            ) : null}
            {saveState === "error" ? (
              <span className="text-[13px] text-[var(--error,#b23b2c)]">{errorMsg ?? t.saveError}</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
