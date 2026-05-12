"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import type {
  EnvelopeAdjustmentLogOut,
  EnvelopeOut,
  EnvelopeTransferLogOut,
  SweepOut,
} from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const isProd = process.env.NODE_ENV === "production";

const sanitizeText = (value: string): string =>
  value
    .replace(/[<>"'`]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

const maskLast4 = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.length <= 4) return "****";
  return `${"*".repeat(Math.max(trimmed.length - 4, 4))}${trimmed.slice(-4)}`;
};

const redactInlineSensitive = (value: string): string => {
  return value
    .replace(
      /\b([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})\b/gi,
      (email) => maskLast4(email)
    )
    .replace(
      /\b(\+?[0-9][0-9 \-().]{5,}[0-9])\b/g,
      (phone) => maskLast4(phone.replace(/[^0-9+]/g, ""))
    );
};

const safeErrorMessage = (err: unknown, fallback: string): string => {
  const message = err instanceof Error ? err.message : fallback;
  if (isProd) {
    return fallback;
  }
  return sanitizeText(redactInlineSensitive(message || fallback));
};

const LOGS_COPY: Record<
  FloussyLocale,
  {
    unknownError: string;
    title: string;
    subtitle: string;
    loading: string;
    sweeps: string;
    noSweep: string;
    noSweepDesc: string;
    envelopeFallback: string;
    sweptOn: (date: string) => string;
    transfers: string;
    noTransfer: string;
    noTransferDesc: string;
    adjustments: string;
    noAdjustment: string;
    noAdjustmentDesc: string;
    previousNew: (previous: string, next: string) => string;
    backend: string;
    backendDesc: string;
    refresh: string;
    refreshing: string;
    noBackend: string;
    noBackendDesc: string;
    page: string;
    next: string;
    previous: string;
    genericBackendError: string;
    backendForbidden: string;
  }
> = {
  fr: {
    unknownError: "Erreur inconnue",
    title: "Logs",
    subtitle: "Historique des actions clés enregistrées sur ton compte.",
    loading: "Chargement...",
    sweeps: "Sweeps",
    noSweep: "Aucun sweep",
    noSweepDesc: "Lance un sweep pour voir l’historique ici.",
    envelopeFallback: "Enveloppe",
    sweptOn: (date) => `Sweep du ${date}`,
    transfers: "Transferts d’enveloppes",
    noTransfer: "Aucun transfert",
    noTransferDesc: "Les transferts apparaîtront ici.",
    adjustments: "Corrections manuelles",
    noAdjustment: "Aucune correction",
    noAdjustmentDesc: "Les corrections apparaîtront ici.",
    previousNew: (previous, next) => `Ancien: ${previous} · Nouveau: ${next}`,
    backend: "Logs backend",
    backendDesc: "Dernières lignes du serveur FastAPI (stdout).",
    refresh: "Rafraîchir",
    refreshing: "Chargement...",
    noBackend: "Aucun log",
    noBackendDesc: "Clique sur Rafraîchir pour charger les logs.",
    page: "Page",
    next: "Suivant",
    previous: "Précédent",
    genericBackendError: "Une erreur est survenue. Réessaie plus tard.",
    backendForbidden: "Accès aux logs backend réservé à l’équipe interne.",
  },
  en: {
    unknownError: "Unknown error",
    title: "Logs",
    subtitle: "Timeline of the main actions recorded on your account.",
    loading: "Loading...",
    sweeps: "Sweeps",
    noSweep: "No sweep yet",
    noSweepDesc: "Run a sweep to see history here.",
    envelopeFallback: "Envelope",
    sweptOn: (date) => `Swept on ${date}`,
    transfers: "Envelope transfers",
    noTransfer: "No transfer",
    noTransferDesc: "Transfers will appear here.",
    adjustments: "Manual adjustments",
    noAdjustment: "No adjustment",
    noAdjustmentDesc: "Adjustments will appear here.",
    previousNew: (previous, next) => `Previous: ${previous} · New: ${next}`,
    backend: "Backend logs",
    backendDesc: "Latest lines from the FastAPI server stdout.",
    refresh: "Refresh",
    refreshing: "Loading...",
    noBackend: "No log",
    noBackendDesc: "Click Refresh to load the logs.",
    page: "Page",
    next: "Next",
    previous: "Previous",
    genericBackendError: "Something went wrong. Please try again later.",
    backendForbidden: "Backend logs access is restricted to the internal team.",
  },
  ar: {
    unknownError: "وقع مشكل غير واضح",
    title: "السجلات",
    subtitle: "التاريخ ديال أهم العمليات اللي تسجلات فالحساب ديالك.",
    loading: "كيتحمّل...",
    sweeps: "السوِيبات",
    noSweep: "ما كاين حتى sweep",
    noSweepDesc: "شغّل sweep باش يبان التاريخ هنا.",
    envelopeFallback: "ظرف",
    sweptOn: (date) => `تدار sweep نهار ${date}`,
    transfers: "تحويلات الأظرفة",
    noTransfer: "ما كاين حتى تحويل",
    noTransferDesc: "التحويلات غادي يبانوا هنا.",
    adjustments: "تصحيحات يدوية",
    noAdjustment: "ما كاين حتى تصحيح",
    noAdjustmentDesc: "التصحيحات غادي يبانوا هنا.",
    previousNew: (previous, next) => `قبل: ${previous} · دابا: ${next}`,
    backend: "سجلات الباك",
    backendDesc: "آخر السطور من سيرفر FastAPI.",
    refresh: "عاود حدّث",
    refreshing: "كيتحمّل...",
    noBackend: "ما كاين حتى log",
    noBackendDesc: "ضغط على عاود حدّث باش يبانوا السجلات.",
    page: "الصفحة",
    next: "التالي",
    previous: "السابق",
    genericBackendError: "وقع مشكل. عاود حاول من بعد.",
    backendForbidden: "الولوج لسجلات الباك مخصص غير للفريق الداخلي.",
  },
};

export default function LogsPage() {
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "logs-page-ar-body");
  const copy = LOGS_COPY[locale];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envelopes, setEnvelopes] = useState<EnvelopeOut[]>([]);
  const [sweeps, setSweeps] = useState<SweepOut[]>([]);
  const [transferLogs, setTransferLogs] = useState<EnvelopeTransferLogOut[]>([]);
  const [adjustmentLogs, setAdjustmentLogs] = useState<EnvelopeAdjustmentLogOut[]>([]);
  const [backendLines, setBackendLines] = useState<string[]>([]);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendPage, setBackendPage] = useState(1);
  const [backendHasNextPage, setBackendHasNextPage] = useState(false);
  const [backendForbidden, setBackendForbidden] = useState(false);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const envs = await apiFetch<EnvelopeOut[]>("/envelopes");
        const sweepsPromise = apiFetch<SweepOut[]>("/sweeps").catch(() => []);
        const transfersPromise = Promise.all(
          envs.map((env) => apiFetch<EnvelopeTransferLogOut[]>(`/envelopes/${env.id}/transfer-logs`).catch(() => []))
        ).then((lists) => lists.flat());
        const adjustmentsPromise = Promise.all(
          envs.map((env) => apiFetch<EnvelopeAdjustmentLogOut[]>(`/envelopes/${env.id}/adjustment-logs`).catch(() => []))
        ).then((lists) => lists.flat());

        const [sweepsData, transfersData, adjustmentsData] = await Promise.all([
          sweepsPromise,
          transfersPromise,
          adjustmentsPromise,
        ]);

        setEnvelopes(envs);
        setSweeps([...sweepsData].sort((a, b) => b.created_at.localeCompare(a.created_at)));
        setTransferLogs([...transfersData].sort((a, b) => b.created_at.localeCompare(a.created_at)));
        setAdjustmentLogs([...adjustmentsData].sort((a, b) => b.created_at.localeCompare(a.created_at)));
      } catch (err) {
        setError(safeErrorMessage(err, copy.unknownError));
      } finally {
        setLoading(false);
      }
    };
    void loadLogs();
  }, [copy.unknownError]);

  const envelopeNameById = useMemo(() => new Map(envelopes.map((env) => [env.id, env.name])), [envelopes]);

  const loadBackendLogs = async (targetPage = 1) => {
    if (backendForbidden) return;
    setBackendLoading(true);
    setBackendError(null);
    try {
      const response = await apiFetch<{
        lines: string[];
        pagination?: { has_next_page?: boolean; page?: number };
      }>(`/logs/backend?lines=10&page=${targetPage}`);
      const lines = response.lines ?? [];
      setBackendLines(lines.slice(-10).map((line) => sanitizeText(redactInlineSensitive(line))));
      setBackendHasNextPage(Boolean(response.pagination?.has_next_page));
      setBackendPage(response.pagination?.page ?? targetPage);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.genericBackendError;
      const normalized = message.toLowerCase();
      if (normalized.includes("forbidden") || normalized.includes("403")) {
        setBackendForbidden(true);
        setBackendError(copy.backendForbidden);
      } else {
        setBackendError(safeErrorMessage(err, copy.genericBackendError));
      }
    } finally {
      setBackendLoading(false);
    }
  };

  return (
    <div className="space-y-8" dir={dir}>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      {loading ? <p className="text-sm text-[var(--muted)]">{copy.loading}</p> : null}
      {error ? <p className="rounded-2xl border border-[var(--error)]/20 bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]">{error}</p> : null}

      <Section title={copy.sweeps}>
        {sweeps.length === 0 ? (
          <EmptyState title={copy.noSweep} description={copy.noSweepDesc} />
        ) : (
          <Card className="grid gap-3">
            {sweeps.map((sweep) => (
              <div key={sweep.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{sweep.from_envelope_name ?? copy.envelopeFallback} → {sweep.to_envelope_name ?? copy.envelopeFallback}</p>
                  <p className="text-xs text-[var(--muted)]">{copy.sweptOn(sweep.swept_on)}</p>
                </div>
                <Badge tone="accent">{sweep.amount}</Badge>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section title={copy.transfers}>
        {transferLogs.length === 0 ? (
          <EmptyState title={copy.noTransfer} description={copy.noTransferDesc} />
        ) : (
          <Card className="grid gap-3">
            {transferLogs.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{log.from_envelope_name} → {envelopeNameById.get(log.to_envelope_id) ?? copy.envelopeFallback}</p>
                  <p className="text-xs text-[var(--muted)]">{log.period_start} → {log.period_end}</p>
                </div>
                <Badge tone="muted">{log.amount}</Badge>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section title={copy.adjustments}>
        {adjustmentLogs.length === 0 ? (
          <EmptyState title={copy.noAdjustment} description={copy.noAdjustmentDesc} />
        ) : (
          <Card className="grid gap-3">
            {adjustmentLogs.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{envelopeNameById.get(log.envelope_id) ?? copy.envelopeFallback}</p>
                  <p className="text-xs text-[var(--muted)]">{log.period_start} → {log.period_end}</p>
                  <p className="text-xs text-[var(--muted)]">{copy.previousNew(log.previous_balance, log.new_balance)}</p>
                </div>
                <Badge tone="accent">{log.delta}</Badge>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section title={copy.backend}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">{copy.backendDesc}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadBackendLogs(1)} disabled={backendLoading || backendForbidden}>
            {backendLoading ? copy.refreshing : copy.refresh}
          </Button>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadBackendLogs(Math.max(backendPage - 1, 1))}
            disabled={backendLoading || backendPage <= 1}
          >
            {copy.previous}
          </Button>
          <span className="text-xs text-[var(--muted)]">
            {copy.page} {backendPage}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadBackendLogs(backendPage + 1)}
            disabled={backendLoading || !backendHasNextPage}
          >
            {copy.next}
          </Button>
        </div>
        {backendError ? <p className="rounded-2xl border border-[var(--error)]/20 bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]">{backendError}</p> : null}
        {backendLines.length === 0 ? (
          <EmptyState title={copy.noBackend} description={copy.noBackendDesc} />
        ) : (
          <Card className="h-[360px] overflow-y-auto overscroll-contain bg-black text-green-200">
            <pre className="whitespace-pre-wrap px-4 py-3 font-mono text-xs leading-5">
              {backendLines.map((line, index) => (
                <div key={`${index}-${line.slice(0, 12)}`}>
                  <span className="mr-3 text-green-500/70">{String(index + 1).padStart(3, "0")}</span>
                  <span className="text-green-200">{line}</span>
                </div>
              ))}
            </pre>
          </Card>
        )}
      </Section>
    </div>
  );
}
