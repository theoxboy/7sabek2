"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { apiFetch, fetchDashboard } from "@/lib/api";
import type {
  CategoryEnvelopeMapOut,
  CategoryOut,
  DashboardOut,
  EnvelopeOut,
  TransactionOut,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  GlobalTourOverlay,
  useGlobalTour,
  type TourStep,
} from "@/components/tour/GlobalTour";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { TRANSACTIONS_COPY } from "@/lib/translations/translations";
import { useQuickTx } from "@/state/QuickTxContext";
import { mutate } from "swr";
import { TransactionHistoryTable } from "@/components/transactions/TransactionHistoryTable";
import { QuickTxForm } from "@/components/dashboard/QuickTxForm";

type TransactionRow = TransactionOut & {
  category_name?: string;
  envelope_name?: string;
  optimistic?: boolean;
};

type TransactionDraft = {
  id?: string;
  type: "income" | "expense";
  category_id: string;
  amount: string;
  occurred_on: string;
  description: string;
};

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";

const formatLocaleDate = (value: string, locale: FloussyLocale) => {
  if (!value) return value;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  const localeCode =
    locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-CA";
  return parsed.toLocaleDateString(localeCode, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const { openQuickTx } = useQuickTx();
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const headerRef = useRef<HTMLDivElement | null>(null);
  const bulkRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeOut[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  const copy = TRANSACTIONS_COPY[locale];
  const pageDir = getLocaleDirection(locale);
  const periodArrow = pageDir === "rtl" ? "←" : "→";
  const issueParam = searchParams.get("issue");
  const focusTxId = searchParams.get("tx_id");

  // Sync locale
  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    };
  }, []);

  // Fetch all initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [cats, envs, txs, mappingList, dashboardData] = await Promise.all([
        apiFetch<CategoryOut[]>("/categories"),
        apiFetch<EnvelopeOut[]>("/envelopes"),
        apiFetch<TransactionOut[]>("/transactions"),
        apiFetch<CategoryEnvelopeMapOut[]>("/mappings"),
        fetchDashboard(),
      ]);

      const mappingMap = mappingList.reduce<Record<string, string>>(
        (acc, item) => ({
          ...acc,
          [item.category_id]: item.envelope_id,
        }),
        {}
      );

      const categoryLookup = new Map(cats.map((cat) => [cat.id, cat.name]));
      const envelopeLookup = new Map(envs.map((env) => [env.id, env.name]));

      const rows: TransactionRow[] = txs.map((tx) => {
        const categoryName = categoryLookup.get(tx.category_id) ?? "-";
        let envelopeName = "-";
        if (tx.type === "income") {
          envelopeName = copy.cash;
        } else if (mappingMap[tx.category_id]) {
          envelopeName = envelopeLookup.get(mappingMap[tx.category_id]) ?? copy.mapped;
        } else {
          envelopeName = copy.unmapped;
        }
        return {
          ...tx,
          category_name: categoryName,
          envelope_name: envelopeName,
        };
      });

      setCategories(cats);
      setEnvelopes(envs);
      setMappings(mappingMap);
      setTransactions(rows);
      setDashboard(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [copy, locale]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time syncing with other components / pages
  useEffect(() => {
    window.addEventListener("floussy:data-updated", loadData);
    return () => {
      window.removeEventListener("floussy:data-updated", loadData);
    };
  }, [loadData]);

  // Pre-fill history filters if directed from onboarding / anomalies
  useEffect(() => {
    const historyOpenParam = searchParams.get("history_open");
    const duplicatesOpenParam = searchParams.get("duplicates_open");

    if (historyOpenParam === "1") {
      setHistoryOpen(true);
    }
    if (duplicatesOpenParam === "1") {
      setDuplicateOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (issueParam === "salary-duplicate" || issueParam === "salary-amount") {
      setHistoryOpen(true);
    }
  }, [issueParam]);

  // Compute duplicates count to show warning banner at the page level
  const duplicateCount = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((tx) => {
      const descPart = (tx.description ?? "").trim().toLowerCase();
      const key = `${tx.type}|${tx.category_id}|${tx.occurred_on}|${Number(tx.amount).toFixed(2)}|${descPart}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    let duplicates = 0;
    map.forEach((count) => {
      if (count > 1) {
        duplicates += (count - 1);
      }
    });
    return duplicates;
  }, [transactions]);

  // Anomalies guidance alerts
  const notificationIssueGuidance = useMemo(() => {
    if (issueParam === "salary-duplicate") {
      return {
        title:
          locale === "ar"
            ? "تنبيه: السالاير تسجّل أكثر من مرة"
            : locale === "en"
            ? "Anomaly: salary entered more than once"
            : "Anomalie: salaire déclaré plusieurs fois",
        description:
          locale === "ar"
            ? "راجع تاريخ العمليات، وخلي غير تصريح السالاير الصحيح لهاد الدورة."
            : locale === "en"
            ? "Review transaction history and keep only the correct salary entry for this period."
            : "Ouvre l’historique des transactions et garde uniquement la bonne déclaration de salaire pour cette période.",
        action:
          locale === "ar"
            ? "فتح تاريخ العمليات"
            : locale === "en"
            ? "Open history"
            : "Ouvrir l’historique",
      };
    }
    if (issueParam === "salary-missing") {
      return {
        title:
          locale === "ar"
            ? "تنبيه: ما كاين حتى تصريح ديال السالاير فهاد الدورة"
            : locale === "en"
            ? "Anomaly: missing salary in active period"
            : "Anomalie: salaire manquant sur la période active",
        description:
          locale === "ar"
            ? "دخل تصريح دخل جديد بتاريخ داخل الفترة الحالية."
            : locale === "en"
            ? "Create a new income entry dated inside the active period."
            : "Crée une nouvelle opération de revenu avec une date comprise dans la période active.",
        action:
          locale === "ar" ? "إضافة دخل" : locale === "en" ? "Add income" : "Ajouter un revenu",
      };
    }
    if (issueParam === "salary-amount") {
      return {
        title:
          locale === "ar"
            ? "تنبيه: مبلغ السالاير مختلف على المتوقع"
            : locale === "en"
            ? "Anomaly: unusual salary amount"
            : "Anomalie: montant salaire inhabituel",
        description:
          locale === "ar"
            ? "راجع العملية المحددة وعدّل المبلغ إلا كان خطأ، أو عدّل التوقع إذا تبدل السالاير."
            : locale === "en"
            ? "Check the flagged entry and correct the amount if needed, or update expectation if salary changed."
            : "Vérifie l’opération signalée et corrige le montant si nécessaire, ou mets à jour l’attendu si ton salaire a changé.",
        action:
          locale === "ar"
            ? "فتح تاريخ العمليات"
            : locale === "en"
            ? "Open history"
            : "Ouvrir l’historique",
      };
    }
    if (issueParam === "income-reminder") {
      return {
        title:
          locale === "ar"
            ? "تذكير: خاص تصريح دخل"
            : locale === "en"
            ? "Reminder: income declaration pending"
            : "Rappel: revenu à déclarer",
        description:
          locale === "ar"
            ? "دخل المبلغ والتاريخ، وغادي يتطبّق التوزيع التلقائي مباشرة."
            : locale === "en"
            ? "Enter amount and date; automatic distribution will run immediately."
            : "Saisis le montant et la date, la répartition automatique sera appliquée immédiatement.",
        action:
          locale === "ar"
            ? "التركيز على النموذج"
            : locale === "en"
            ? "Focus form"
            : "Aller au formulaire",
      };
    }
    return null;
  }, [issueParam, locale]);

  const activePeriodLabel = useMemo(() => {
    const currentPeriod = dashboard?.current_period;
    if (!currentPeriod?.start || !currentPeriod?.end) return null;
    return `${formatLocaleDate(currentPeriod.start, locale)} ${periodArrow} ${formatLocaleDate(
      currentPeriod.end,
      locale
    )}`;
  }, [dashboard?.current_period, locale, periodArrow]);

  const tourSteps = useMemo<TourStep[]>(() => {
    return [
      {
        title: copy.tourView,
        description: copy.tourViewDesc,
        ref: headerRef,
      },
      {
        title: copy.tourBulk,
        description: copy.tourBulkDesc,
        ref: bulkRef,
      },
      {
        title: copy.tourCreate,
        description: copy.tourCreateDesc,
        ref: formRef,
      },
      {
        title: copy.tourActions,
        description: copy.tourActionsDesc,
        ref: { current: null },
        selector: '[data-tour="transaction-actions"]',
      },
      {
        title: copy.tourPreview,
        description: copy.tourPreviewDesc,
        ref: { current: null },
        selector: '[data-tour="transaction-preview"]',
      },
    ];
  }, [copy]);

  const {
    isActive: tourActive,
    step: tourStep,
    stepIndex: tourStepIndex,
    total: tourTotal,
    goNext,
    goPrevious,
    canGoPrevious,
    skipTour,
  } = useGlobalTour("transactions", tourSteps);

  const handleCategoryMapped = (categoryId: string, envelopeId: string) => {
    setMappings((prev) => ({
      ...prev,
      [categoryId]: envelopeId,
    }));
    loadData();
  };

  const handleEdit = (tx: TransactionRow) => {
    openQuickTx(tx.type, {
      editingId: tx.id,
      type: tx.type,
      category_id: tx.category_id,
      amount: Number(tx.amount).toFixed(2),
      occurred_on: tx.occurred_on,
      description: tx.description ?? "",
    });
    setHistoryOpen(false);
  };

  return (
    <div dir={pageDir} className="relative flex flex-col gap-8">
      {tourActive && tourStep && !loading ? (
        <GlobalTourOverlay
          step={tourStep}
          stepIndex={tourStepIndex}
          total={tourTotal}
          canGoPrevious={canGoPrevious}
          onPrevious={goPrevious}
          onNext={goNext}
          onSkip={skipTour}
        />
      ) : null}

      {/* Cockpit Header Card */}
      <div
        ref={headerRef}
        className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-emerald-50/70 p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)] dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20"
      >
        <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              {copy.quickEntry}
            </div>
            <PageHeader
              title={copy.title}
              subtitle={copy.subtitle}
              className="gap-3"
            />
            <div className="grid gap-3 max-w-xl">
              <div className="rounded-3xl border border-slate-200/80 bg-[var(--surface)]/85 px-4 py-3 backdrop-blur dark:border-slate-800">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {copy.activePeriod}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                  {activePeriodLabel ?? "—"}
                </p>
              </div>
            </div>
          </div>
          <div ref={bulkRef} className="flex flex-wrap items-center justify-start xl:justify-end gap-3">
            <Button asChild variant="secondary" className="rounded-2xl border-white/80 bg-[var(--surface)]/90 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Link href="/transactions/bulk">{copy.bulkEntry}</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Skeletons & Errors */}
      {loading && (
        <div className="grid gap-3">
          {[...Array(6)].map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-10 w-full animate-pulse rounded-2xl bg-[var(--surface-2)]"
            />
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-2xl bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Duplicate alert warning banner */}
      {!loading && duplicateCount > 0 && (
        <Alert tone="warning">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--ink)]">
                {copy.duplicateAlertTitle}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {copy.duplicateAlertDescription(duplicateCount)}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setDuplicateOpen(true)}
            >
              {copy.duplicateAlertAction}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Anomalies issue warning banner */}
      {notificationIssueGuidance && (
        <Alert tone="warning">
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--ink)]">
                {notificationIssueGuidance.title}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {notificationIssueGuidance.description}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => {
                if (issueParam === "salary-duplicate" || issueParam === "salary-amount") {
                  setHistoryOpen(true);
                  return;
                }
                formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {notificationIssueGuidance.action}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Inline QuickTxForm */}
      <div ref={formRef} className="w-full">
        <QuickTxForm
          defaultType={searchParams.get("type") === "income" ? "income" : "expense"}
          bootstrapOptions={
            (searchParams.get("type") || searchParams.get("bootstrap_date") || searchParams.get("bootstrap_amount"))
              ? {
                  type: searchParams.get("type") || undefined,
                  bootstrapDate: searchParams.get("bootstrap_date") || undefined,
                  bootstrapAmount: searchParams.get("bootstrap_amount") || undefined,
                }
              : undefined
          }
          onSuccess={() => {
            mutate("/transactions");
            loadData();
          }}
          isInline={true}
        />
      </div>

      {/* Consultation Card */}
      <div className="rounded-[30px] border border-slate-200/80 bg-[var(--surface)] p-6 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.3)] dark:border-slate-800">
        <h3 className="text-xl font-bold text-[var(--ink)]">
          {locale === "ar" ? "سجل العمليات" : locale === "en" ? "Transaction Ledger" : "Registre des Transactions"}
        </h3>
        <p className="mt-2 text-sm text-[var(--muted)] max-w-md mx-auto">
          {locale === "ar"
            ? "راجع وسير جميع المداخيل والمصاريف ديالك، وعدلها أو مسحها إذا تطلب الأمر."
            : locale === "en"
            ? "Review and manage all your declared incomes and expenses, edit or delete them as needed."
            : "Consultez et gérez l'ensemble de vos revenus et dépenses déclarés. Modifiez ou supprimez vos entrées à tout moment."}
        </p>
        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 font-semibold"
          >
            {copy.openHistory}
          </Button>
        </div>
      </div>

      {/* Transaction History Dialog wrapper */}
      <TransactionHistoryTable
        isOpen={historyOpen}
        setOpen={setHistoryOpen}
        locale={locale}
        transactions={transactions}
        setTransactions={setTransactions}
        categories={categories}
        envelopes={envelopes}
        mappings={mappings}
        loadData={loadData}
        onEdit={handleEdit}
        duplicateOpen={duplicateOpen}
        setDuplicateOpen={setDuplicateOpen}
        focusTxId={focusTxId}
      />
    </div>
  );
}
