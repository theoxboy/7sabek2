"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch, fetchDashboard } from "@/lib/api";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import type { DashboardOut, EnvelopeOut } from "@/lib/types";

const ALLOCATE_COPY: Record<
  FloussyLocale,
  {
    unknownError: string;
    title: string;
    subtitle: string;
    loading: string;
    allocation: string;
    targetEnvelope: string;
    selectEnvelope: string;
    amount: string;
    occurredOn: string;
    description: string;
    allocate: string;
    snapshot: string;
    cashBalance: string;
    envelopes: string;
    noData: string;
  }
> = {
  fr: {
    unknownError: "Erreur inconnue",
    title: "Allocation depuis Cash",
    subtitle: "Déplace de l'argent depuis Cash vers une enveloppe cible.",
    loading: "Chargement...",
    allocation: "Allocation",
    targetEnvelope: "Enveloppe cible",
    selectEnvelope: "Choisir une enveloppe",
    amount: "Montant",
    occurredOn: "Date",
    description: "Description",
    allocate: "Allouer",
    snapshot: "Vue dashboard",
    cashBalance: "Solde Cash",
    envelopes: "Enveloppes",
    noData: "Pas encore de données.",
  },
  en: {
    unknownError: "Unknown error",
    title: "Allocate from Cash",
    subtitle: "Move funds from Cash into a target envelope.",
    loading: "Loading...",
    allocation: "Allocation",
    targetEnvelope: "Target envelope",
    selectEnvelope: "Select an envelope",
    amount: "Amount",
    occurredOn: "Occurred on",
    description: "Description",
    allocate: "Allocate",
    snapshot: "Dashboard snapshot",
    cashBalance: "Cash balance",
    envelopes: "Envelopes",
    noData: "No data yet.",
  },
  ar: {
    unknownError: "وقع مشكل غير واضح",
    title: "وزّع من لكاش",
    subtitle: "حرّك الفلوس من لكاش لظرف آخر.",
    loading: "كيتحمّل...",
    allocation: "التحويل",
    targetEnvelope: "الظرف المستهدف",
    selectEnvelope: "اختار ظرف",
    amount: "المبلغ",
    occurredOn: "التاريخ",
    description: "الوصف",
    allocate: "وزّع",
    snapshot: "نظرة على الداشبورد",
    cashBalance: "رصيد لكاش",
    envelopes: "الأظرفة",
    noData: "ما كايناش بيانات دابا.",
  },
};

export default function AllocatePage() {
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "allocate-page-ar-body");
  const copy = ALLOCATE_COPY[locale];
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetEnvelopeId, setTargetEnvelopeId] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  const targetEnvelopes = useMemo(() => {
    if (!dashboard) return [] as EnvelopeOut[];
    return dashboard.envelopes.map((item) => item.envelope).filter((env) => !env.is_cash);
  }, [dashboard]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const dash = await fetchDashboard();
        setDashboard(dash);
        const firstTarget = dash.envelopes.map((item) => item.envelope).find((env) => !env.is_cash);
        if (firstTarget) setTargetEnvelopeId(firstTarget.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : copy.unknownError;
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [copy.unknownError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch(`/envelopes/${targetEnvelopeId}/allocate-from-cash`, {
        method: "POST",
        body: {
          amount,
          occurred_on: occurredOn,
          description: description || undefined,
        },
      });
      const dash = await fetchDashboard();
      setDashboard(dash);
      setAmount("");
      setDescription("");
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    }
  };

  return (
    <div className="flex flex-col gap-8" dir={dir}>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <p className="text-sm text-[var(--muted)]">{copy.subtitle}</p>
      </header>

      {loading ? <p className="text-sm text-[var(--muted)]">{copy.loading}</p> : null}
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-lg font-semibold">{copy.allocation}</h2>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{copy.targetEnvelope}</span>
              <select
                value={targetEnvelopeId}
                onChange={(event) => setTargetEnvelopeId(event.target.value)}
                className="rounded-md border border-[var(--border)] px-3 py-2"
                required
              >
                <option value="" disabled>{copy.selectEnvelope}</option>
                {targetEnvelopes.map((env) => (
                  <option key={env.id} value={env.id}>{env.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{copy.amount}</span>
              <input
                type="text"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="rounded-md border border-[var(--border)] px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{copy.occurredOn}</span>
              <input
                type="date"
                required
                value={occurredOn}
                onChange={(event) => setOccurredOn(event.target.value)}
                className="rounded-md border border-[var(--border)] px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{copy.description}</span>
              <input
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="rounded-md border border-[var(--border)] px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800"
              disabled={!targetEnvelopeId}
            >
              {copy.allocate}
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-lg font-semibold">{copy.snapshot}</h2>
          {dashboard ? (
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase text-[var(--muted)]">{copy.cashBalance}</p>
                <p className="text-xl font-semibold">{dashboard.cash_balance}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--muted)]">{copy.envelopes}</p>
                <div className="mt-2 divide-y divide-[var(--border)] text-sm">
                  {dashboard.envelopes.map((item) => (
                    <div key={item.envelope.id} className="flex items-center justify-between py-2">
                      <span>{localizeEnvelopeLabel(item.envelope.name, locale)}</span>
                      <span className="font-semibold">{item.balance.closing_balance}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">{copy.noData}</p>
          )}
        </div>
      </section>
    </div>
  );
}
