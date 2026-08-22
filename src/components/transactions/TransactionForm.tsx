"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api";
import { isInternalIncomeCategory, localizeCategoryName } from "@/lib/categoryCatalog";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import type { FloussyLocale } from "@/lib/localePreference";
import type { CategoryOut, DashboardOut, EnvelopeOut, TransactionOut, DistributionSimulateOut } from "@/lib/types";
import { TRANSACTIONS_COPY } from "@/lib/translations/translations";
import { isFixedMode, isPercentMode } from "@/lib/distribution";

type TransactionDraft = {
  id?: string;
  type: "income" | "expense";
  category_id: string;
  amount: string;
  occurred_on: string;
  description: string;
};

interface TransactionFormProps {
  locale: FloussyLocale;
  categories: CategoryOut[];
  envelopes: EnvelopeOut[];
  mappings: Record<string, string>;
  onCategoryMapped: (categoryId: string, envelopeId: string) => void;
  dashboard: DashboardOut | null;
  draft: TransactionDraft;
  setDraft: React.Dispatch<React.SetStateAction<TransactionDraft>>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  loadData: () => Promise<void>;
  setHistoryOpen: (open: boolean) => void;
  transactions: TransactionOut[];
}

const EASTERN_ARABIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

const normalizeDigits = (value: string) =>
  value.replace(/[٠-٩۰-۹]/g, (char) => EASTERN_ARABIC_DIGITS[char] ?? char);

const getNextMonthDatePreview = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();
    const nextMonth = (month + 1) % 12;
    const nextYear = year + Math.floor((month + 1) / 12);
    const lastDayOfNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const targetDay = Math.min(day, lastDayOfNextMonth);
    const nextDate = new Date(nextYear, nextMonth, targetDay);
    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
};

const computeCalendarMonthBounds = (anchorStr: string, occurredStr: string): [string, string] => {
  try {
    const anchor = new Date(anchorStr);
    const occurred = new Date(occurredStr);
    if (isNaN(anchor.getTime()) || isNaN(occurred.getTime())) return ["", ""];
    const anchorDay = anchor.getDate();
    const getMonthStartDate = (mIndex: number): Date => {
      const y = Math.floor(mIndex / 12);
      const m = mIndex % 12;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const d = Math.min(anchorDay, lastDay);
      return new Date(y, m, d);
    };
    const initIndex = occurred.getFullYear() * 12 + occurred.getMonth();
    let mIndex = initIndex;
    const startOfInit = getMonthStartDate(initIndex);
    if (occurred >= startOfInit) {
      mIndex = initIndex;
    } else {
      mIndex = initIndex - 1;
    }
    const pStart = getMonthStartDate(mIndex);
    const pEnd = getMonthStartDate(mIndex + 1);
    const format = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    return [format(pStart), format(pEnd)];
  } catch {
    return ["", ""];
  }
};

const parseAmountInput = (value: string): number | null => {
  const digitsNormalized = normalizeDigits(value);
  const cleaned = digitsNormalized
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;

  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const dotCount = (cleaned.match(/\./g) ?? []).length;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized = cleaned;
  if (commaCount > 0 && dotCount > 0) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    normalized = normalized.split(thousandSep).join("");
    normalized = normalized.replace(decimalSep, ".");
  } else if (commaCount > 0) {
    if (commaCount > 1) {
      normalized = normalized.split(",").join("");
    } else {
      const decimals = cleaned.length - lastComma - 1;
      const shouldTreatAsThousands = decimals === 3;
      normalized = shouldTreatAsThousands
        ? normalized.replace(",", "")
        : normalized.replace(",", ".");
    }
  } else if (dotCount > 0) {
    if (dotCount > 1) {
      normalized = normalized.split(".").join("");
    } else {
      const decimals = cleaned.length - lastDot - 1;
      const shouldTreatAsThousands = decimals === 3;
      normalized = shouldTreatAsThousands
        ? normalized.replace(".", "")
        : normalized;
    }
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const formatLocaleDate = (value: string, locale: FloussyLocale) => {
  if (!value) return value;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  const localeCode =
    locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-CA";
  return parsed.toLocaleDateString(localeCode, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getLocalTodayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getExpectedSalaryDate = (
  currentPeriodStart: string | undefined,
  currentPeriodEnd: string | undefined,
  incomeDeclared: boolean | undefined,
  today: string
): string => {
  if (incomeDeclared === false && currentPeriodStart) {
    return currentPeriodStart;
  }
  if (currentPeriodEnd && today < currentPeriodEnd) {
    return currentPeriodEnd;
  }
  return today;
};

function looksLikeDebtName(name: string) {
  const normalized = name.trim().toLowerCase();
  return (
    normalized.startsWith("dettes —") ||
    normalized.startsWith("det-") ||
    normalized.startsWith("debt-") ||
    normalized.startsWith("debt —")
  );
}

function looksLikeDebtCategoryName(name: string) {
  const normalized = name.trim().toLowerCase();
  return (
    normalized.includes("dette") ||
    normalized.includes("credit") ||
    normalized.includes("remboursement") ||
    normalized.includes("debt") ||
    normalized.includes("loan")
  );
}

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const looksLikeSalaryCategory = (name: string) => {
  const normalized = normalizeName(name);
  const SALARY_KEYWORDS = [
    "salaire",
    "salary",
    "paie",
    "payroll",
    "wage",
    "paycheck",
    "راتب",
    "salario",
  ];
  return SALARY_KEYWORDS.some((keyword) =>
    normalized.includes(normalizeName(keyword))
  );
};

export const TransactionForm: React.FC<TransactionFormProps> = ({
  locale,
  categories,
  envelopes,
  mappings,
  onCategoryMapped,
  dashboard,
  draft,
  setDraft,
  editingId,
  setEditingId,
  loadData,
  setHistoryOpen,
  transactions,
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const copy = TRANSACTIONS_COPY[locale];
  const periodArrow = locale === "ar" ? "←" : "→";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inlineEnvelopeMapping, setInlineEnvelopeMapping] = useState<string>("");

  // Live preview states
  const [incomePreview, setIncomePreview] = useState<DistributionSimulateOut | null>(null);
  const [incomePreviewLoading, setIncomePreviewLoading] = useState(false);
  const [incomePreviewError, setIncomePreviewError] = useState<string | null>(null);
  const [envelopeBalanceOverrides, setEnvelopeBalanceOverrides] = useState<Record<string, number>>({});

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const envelopeMap = useMemo(() => new Map(envelopes.map((e) => [e.id, e.name])), [envelopes]);

  const categoryKindById = useMemo(() => {
    const map = new Map<string, "income" | "expense">();
    categories.forEach((cat) => {
      const isInc = (cat as any).kind === "income" || isInternalIncomeCategory(cat.name) || cat.name.toLowerCase().includes("salaire") || cat.name.toLowerCase().includes("salary") || cat.name.toLowerCase().includes("revenu");
      map.set(cat.id, isInc ? "income" : "expense");
    });
    return map;
  }, [categories]);

  const mappedCategoryIds = useMemo(
    () =>
      new Set(
        Object.entries(mappings)
          .filter(([, envelopeId]) => Boolean(envelopeId))
          .map(([categoryId]) => categoryId)
      ),
    [mappings]
  );

  const defaultIncomeCategory = useMemo(() => {
    const incomeCategories = categories.filter(
      (cat) => categoryKindById.get(cat.id) === "income"
    );
    if (incomeCategories.length === 0) return null;
    const salary = incomeCategories.find((cat) => looksLikeSalaryCategory(cat.name));
    return salary ?? incomeCategories[0];
  }, [categories, categoryKindById]);

  const autoIncomeCategory = useMemo(() => {
    if (defaultIncomeCategory) return defaultIncomeCategory;
    if (draft.category_id) {
      const selected = categories.find((cat) => cat.id === draft.category_id);
      if (selected) return selected;
    }
    return categories[0] ?? null;
  }, [categories, defaultIncomeCategory, draft.category_id]);

  // Fetch balances overrides on load or envelopes change
  useEffect(() => {
    if (envelopes.length === 0) return;
    const fetchOverrides = async () => {
      try {
        const periodResults = await Promise.allSettled(
          envelopes.map((env) => apiFetch<any[]>(`/envelopes/${env.id}/periods`))
        );
        const nextOverrides: Record<string, number> = {};
        periodResults.forEach((result, index) => {
          if (result.status !== "fulfilled" || result.value.length === 0) return;
          const closing = Number(result.value[0].closing_balance);
          if (Number.isFinite(closing)) {
            nextOverrides[envelopes[index].id] = closing;
          }
        });
        setEnvelopeBalanceOverrides(nextOverrides);
      } catch {
        // ignore
      }
    };
    fetchOverrides();
  }, [envelopes]);

  // Live preview for income
  useEffect(() => {
    if (draft.type !== "income") {
      setIncomePreview(null);
      setIncomePreviewError(null);
      setIncomePreviewLoading(false);
      return;
    }
    const parsed = parseAmountInput(draft.amount);
    if (parsed === null) {
      setIncomePreview(null);
      setIncomePreviewError(null);
      setIncomePreviewLoading(false);
      return;
    }

    let active = true;
    setIncomePreviewLoading(true);
    setIncomePreviewError(null);
    const timer = window.setTimeout(async () => {
      try {
        const result = await apiFetch<DistributionSimulateOut>(
          "/distribution/simulate",
          {
            method: "POST",
            body: {
              income_amount: parsed.toFixed(2),
              use_cash_available: false,
              occurred_on: draft.occurred_on || undefined,
            },
          }
        );
        if (!active) return;
        setIncomePreview(result);
      } catch (err) {
        if (!active) return;
        setIncomePreviewError(locale === "ar" ? "فشل محاكاة التوزيع." : "Simulation failed.");
        setIncomePreview(null);
      } finally {
        if (active) {
          setIncomePreviewLoading(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [draft.type, draft.amount, draft.occurred_on, locale]);

  // Prefill occurred_on when dashboard data loads and type is income
  useEffect(() => {
    if (draft.type === "income" && dashboard?.current_period?.end) {
      const today = getLocalTodayISO();
      const expectedSalaryDate = getExpectedSalaryDate(
        dashboard?.current_period?.start,
        dashboard?.current_period?.end,
        dashboard?.sweep_status?.income_declared,
        today
      );
      if (draft.occurred_on === today) {
        setDraft((prev) => ({
          ...prev,
          occurred_on: expectedSalaryDate,
        }));
      }
    }
  }, [
    dashboard?.current_period?.start,
    dashboard?.current_period?.end,
    dashboard?.sweep_status?.income_declared,
    draft.type,
  ]);

  // All expense categories
  const allExpenseCategories = useMemo(
    () =>
      categories.filter((cat) => categoryKindById.get(cat.id) !== "income"),
    [categories, categoryKindById]
  );

  // Mapped categories matching type filter
  const filteredDraftCategories = useMemo(() => {
    return categories.filter((cat) =>
      draft.type === "income"
        ? categoryKindById.get(cat.id) === "income"
        : categoryKindById.get(cat.id) !== "income" &&
          mappedCategoryIds.has(cat.id)
    );
  }, [categories, categoryKindById, draft.type, mappedCategoryIds]);

  const activePeriod = useMemo(() => {
    if (dashboard?.current_period) {
      return {
        start: dashboard.current_period.start,
        end: dashboard.current_period.end,
      };
    }
    return null;
  }, [dashboard]);

  const datePeriodWarning = useMemo(() => {
    if (!draft.occurred_on || !activePeriod) return null;
    const date = draft.occurred_on;
    const start = activePeriod.start;
    const end = activePeriod.end;
    const dateLabel = formatLocaleDate(date, locale);
    const startLabel = formatLocaleDate(start, locale);
    const endLabel = formatLocaleDate(end, locale);

    if (date < start) {
      if (draft.type === "income") {
        return locale === "ar"
          ? `تنبيه: تاريخ الدخل (${dateLabel}) كيرجع لفترة سابقة. هادشي غادي يعاود يحسب الرصيد ديال الفترات اللاحقة.`
          : locale === "fr"
          ? `Attention : la date du revenu (${dateLabel}) est dans une période passée. Cela recalculera les soldes des périodes suivantes.`
          : `Warning: the income date (${dateLabel}) is in a past period. This will trigger a recalculation of subsequent period balances.`;
      } else {
        return locale === "ar"
          ? `تنبيه: تاريخ المصروف (${dateLabel}) كيرجع لفترة سابقة. هادشي غادي يعاود يحسب الرصيد ديال الفترات اللاحقة.`
          : locale === "fr"
          ? `Attention : la date de la dépense (${dateLabel}) est dans une période passée. Cela recalculera les soldes des périodes suivantes.`
          : `Warning: the expense date (${dateLabel}) is in a past period. This will trigger a recalculation of subsequent period balances.`;
      }
    }
    if (date >= end) {
      if (draft.type === "income") {
        return locale === "ar"
          ? `تنبيه: تاريخ الدخل (${dateLabel}) جاي من بعد الفترة الحالية (${startLabel} ← ${endLabel}).`
          : locale === "fr"
          ? `Attention : la date du revenu (${dateLabel}) est après la période actuelle (${startLabel} ← ${endLabel}).`
          : `Warning: the income date (${dateLabel}) is after the current period (${startLabel} ← ${endLabel}).`;
      } else {
        return locale === "ar"
          ? `تنبيه: تاريخ المصروف (${dateLabel}) جاي من بعد الفترة الحالية (${startLabel} ← ${endLabel}).`
          : locale === "fr"
          ? `Attention : la date de la dépense (${dateLabel}) est après la période actuelle (${startLabel} ← ${endLabel}).`
          : `Warning: the expense date (${dateLabel}) is after the current period (${startLabel} ← ${endLabel}).`;
      }
    }
    return null;
  }, [activePeriod, copy, locale, periodArrow, draft.occurred_on, draft.type]);

  const needsFirstIncomeDeclaration = Boolean(
    dashboard?.sweep_bootstrap?.needs_first_income_declaration
  );

  const incomeCategoryWarning = useMemo(() => {
    if (draft.type !== "income") return null;
    if (!needsFirstIncomeDeclaration) return null;
    if (!draft.category_id) return null;
    const cat = categories.find((c) => c.id === draft.category_id);
    if (!cat) return null;
    if (!isInternalIncomeCategory(cat.name)) {
      return locale === "ar"
        ? "⚠️ لتفعيل حسابك وميزانيتك، يجب التصريح بالراتب الأساسي (مثل الراتب أو العمل الحر). هذه الفئة لن تقوم بتفعيل الميزانية."
        : locale === "fr"
        ? "⚠️ Pour activer votre compte et votre budget, vous devez déclarer votre revenu principal (comme le salaire ou freelance). Cette catégorie n'activera pas votre budget."
        : "⚠️ To activate your account and budget, you must declare your primary income (like salary or freelance). This category will not activate your budget.";
    }
    return null;
  }, [draft.type, draft.category_id, needsFirstIncomeDeclaration, categories, locale]);

  const incomeExpectedWarning = useMemo(() => {
    if (draft.type !== "income") return null;
    const amountParsed = parseAmountInput(draft.amount);
    if (!amountParsed) return null;
    const expectedStr =
      dashboard?.sweep_bootstrap?.expected_income_amount ||
      dashboard?.sweep_bootstrap?.last_income_amount;
    if (!expectedStr) return null;
    const expected = Number(expectedStr);
    if (isNaN(expected) || expected <= 0) return null;
    const currency = dashboard?.user.currency ?? "MAD";
    if (amountParsed < expected * 0.5 || amountParsed > expected * 2.0) {
      const formattedEntered = amountParsed.toLocaleString(locale === "ar" ? "ar-MA" : "fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formattedExpected = expected.toLocaleString(locale === "ar" ? "ar-MA" : "fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return locale === "ar"
        ? `❓ المبلغ المدخل (${formattedEntered} ${currency}) يختلف عن الدخل المتوقع (${formattedExpected} ${currency}). هل أنت متأكد؟`
        : locale === "fr"
        ? `❓ Le montant saisi (${formattedEntered} ${currency}) diffère du revenu attendu (${formattedExpected} ${currency}). Confirmez-vous ?`
        : `❓ The entered amount (${formattedEntered} ${currency}) differs from your expected income (${formattedExpected} ${currency}). Are you sure?`;
    }
    return null;
  }, [draft.type, draft.amount, dashboard?.sweep_bootstrap, dashboard?.user.currency, locale]);

  const incomeDateEarlyWarning = useMemo(() => {
    if (draft.type !== "income") return null;
    if (!draft.occurred_on || !dashboard?.current_period?.end) return null;
    if (draft.occurred_on < dashboard.current_period.end) {
      const expectedLabel = formatLocaleDate(dashboard.current_period.end, locale);
      return locale === "ar"
        ? `تنبيه: لقد اخترت تاريخًا قبل تاريخ راتبك المتوقع (${expectedLabel}). قد يؤدي ذلك إلى إنهاء دورتك المالية الحالية مبكرًا وبدء دورة جديدة. من الأفضل تحديد تاريخ راتبك الفعلي.`
        : locale === "fr"
        ? `Attention : vous avez choisi une date antérieure à votre date de salaire attendue (${expectedLabel}). Cela fermera votre période actuelle plus tôt et en commencera une nouvelle. Il est conseillé de mettre la date réelle de votre salaire.`
        : `Warning: you selected a date before your expected salary date (${expectedLabel}). This will close your current period early and start a new one. It is recommended to use your actual salary date.`;
    }
    return null;
  }, [draft.type, draft.occurred_on, dashboard?.current_period?.end, locale]);

  const incomePeriodBoundsPreview = useMemo(() => {
    if (draft.type !== "income") return null;
    if (!draft.occurred_on) return null;
    let pStart = "";
    let pEnd = "";
    if (needsFirstIncomeDeclaration) {
      pStart = draft.occurred_on;
      pEnd = getNextMonthDatePreview(draft.occurred_on);
    } else {
      const anchorDate =
        dashboard?.sweep_bootstrap?.last_income_date ||
        dashboard?.current_period?.start;
      if (anchorDate) {
        const bounds = computeCalendarMonthBounds(anchorDate, draft.occurred_on);
        pStart = bounds[0];
        pEnd = bounds[1];
      }
    }
    if (!pStart || !pEnd) return null;
    const startLabel = formatLocaleDate(pStart, locale);
    const endLabel = formatLocaleDate(pEnd, locale);
    return locale === "ar"
      ? `📅 الدورة المالية القادمة ستكون تلقائياً: من ${startLabel} إلى ${endLabel}`
      : locale === "fr"
      ? `📅 Prochaine période : du ${startLabel} au ${endLabel}`
      : `📅 Next financial period: from ${startLabel} to ${endLabel}`;
  }, [draft.type, draft.occurred_on, needsFirstIncomeDeclaration, dashboard, locale]);

  const activePeriodLabel = useMemo(() => {
    const currentPeriod = dashboard?.current_period;
    if (!currentPeriod?.start || !currentPeriod?.end) return null;
    return `${formatLocaleDate(currentPeriod.start, locale)} ${periodArrow} ${formatLocaleDate(
      currentPeriod.end,
      locale
    )}`;
  }, [dashboard?.current_period, locale, periodArrow]);

  const mappedEnvelopeHint = useMemo(() => {
    if (draft.type !== "expense" || !draft.category_id) return null;
    const mappedId = mappings[draft.category_id];
    if (!mappedId) {
      return copy.categoryNotMapped;
    }
    const name = envelopeMap.get(mappedId);
    return name
      ? copy.mappedToEnvelope(localizeEnvelopeLabel(name, locale))
      : copy.mappedEnvelope;
  }, [draft.category_id, draft.type, mappings, envelopeMap, locale, copy]);

  const expenseImpact = useMemo(() => {
    if (draft.type !== "expense") return null;
    if (!draft.category_id) {
      return {
        state: "no_category" as const,
      };
    }
    const mappedId = mappings[draft.category_id];
    if (!mappedId) {
      return {
        state: "not_mapped" as const,
      };
    }
    const envelopeName = localizeEnvelopeLabel(envelopeMap.get(mappedId) ?? copy.mapped, locale);
    const currentBalance = Number(
      envelopeBalanceOverrides[mappedId] ??
        dashboard?.envelopes.find((item) => item.envelope.id === mappedId)?.balance
          .closing_balance ??
        0
    );
    const amount = parseAmountInput(draft.amount);
    const validAmount = amount ?? 0;
    const afterBalance = currentBalance - validAmount;
    return {
      state: "ready" as const,
      envelopeName,
      currentBalance,
      afterBalance,
      willBeNegative: afterBalance < 0,
      hasAmount: validAmount > 0,
    };
  }, [
    copy,
    dashboard?.envelopes,
    draft.amount,
    draft.category_id,
    draft.type,
    envelopeBalanceOverrides,
    envelopeMap,
    locale,
    mappings,
  ]);

  const isCurrentCategoryMapped = useMemo(() => {
    if (draft.type === "income") return true;
    if (!draft.category_id) return true;
    return mappedCategoryIds.has(draft.category_id);
  }, [draft.category_id, draft.type, mappedCategoryIds]);

  const noCategories = categories.length === 0;
  const noMatchingCategories =
    !noCategories &&
    draft.type === "expense" &&
    filteredDraftCategories.length === 0;

  const amountCardTone =
    draft.type === "income"
      ? "border-emerald-200 bg-emerald-50/80 dark:bg-slate-900/40 dark:border-emerald-950"
      : "border-rose-200 bg-rose-50/80 dark:bg-slate-900/40 dark:border-rose-950";
  const amountInputTone =
    draft.type === "income"
      ? "border-emerald-300 bg-[var(--surface)]/95 text-emerald-950 dark:text-emerald-200 focus:border-emerald-500"
      : "border-rose-300 bg-[var(--surface)]/95 text-rose-950 dark:text-rose-200 focus:border-rose-500";
  const previewCardTone =
    draft.type === "income"
      ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-[var(--surface)] dark:from-slate-900 dark:via-emerald-950/10 dark:to-cyan-950/10"
      : "border-amber-200 bg-gradient-to-br from-amber-50 to-[var(--surface)] dark:from-slate-900 dark:via-rose-950/10 dark:to-orange-950/10";

  const handleCancelEdit = () => {
    setDraft({
      type: "expense",
      amount: "",
      category_id: allExpenseCategories[0]?.id ?? "",
      occurred_on: getLocalTodayISO(),
      description: "",
    });
    setEditingId(null);
  };

  const handleMapCategoryInline = async (categoryId: string, envelopeId: string) => {
    if (!envelopeId) return;
    try {
      await apiFetch(`/categories/${categoryId}/envelope`, {
        method: "PUT",
        body: { envelope_id: envelopeId },
      });
      toast({
        title: locale === "ar" ? "تم ربط الفئة بنجاح" : locale === "fr" ? "Catégorie liée avec succès" : "Category linked successfully",
        variant: "success",
      });
      onCategoryMapped(categoryId, envelopeId);
      setInlineEnvelopeMapping("");
    } catch {
      toast({
        title: locale === "ar" ? "فشل ربط الفئة" : locale === "fr" ? "Échec de l'association" : "Failed to link category",
        variant: "danger",
      });
    }
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Always use the user-selected draft.category_id directly — never override with autoIncomeCategory
    const effectiveCategoryId = draft.category_id;

    // 1. Validate amount
    const rawAmount = draft.amount;
    if (!rawAmount || !rawAmount.trim()) {
      setError(
        locale === "ar"
          ? "الرجاء إدخال المبلغ."
          : locale === "fr"
          ? "Veuillez saisir un montant."
          : "Please enter an amount."
      );
      return;
    }
    const normalizedAmount = parseAmountInput(rawAmount);
    if (normalizedAmount === null) {
      const digitsNormalized = normalizeDigits(rawAmount);
      const cleaned = digitsNormalized.trim().replace(/\s+/g, "").replace(/[^\d,.-]/g, "");
      const parsedNum = Number(cleaned.replace(",", "."));
      if (Number.isFinite(parsedNum) && parsedNum <= 0) {
        setError(
          locale === "ar"
            ? "المبلغ يجب أن يكون أكبر من 0."
            : locale === "fr"
            ? "Le montant doit être strictement supérieur à 0."
            : "Amount must be strictly greater than 0."
        );
      } else {
        setError(
          locale === "ar"
            ? "الرجاء إدخال مبلغ صالح."
            : locale === "fr"
            ? "Veuillez saisir un montant valide."
            : "Please enter a valid amount."
        );
      }
      return;
    }
    const amountForApi = normalizedAmount.toFixed(2);

    // 2. Validate category
    if (!effectiveCategoryId) {
      setError(
        locale === "ar"
          ? "يرجى اختيار الفئة."
          : locale === "fr"
          ? "Veuillez sélectionner une catégorie."
          : "Please select a category."
      );
      return;
    }

    // 3. Validate date
    if (!draft.occurred_on) {
      setError(
        locale === "ar"
          ? "يرجى اختيار التاريخ."
          : locale === "fr"
          ? "Veuillez sélectionner une date."
          : "Please select a date."
      );
      return;
    }

    // 4. Validate future date
    const today = getLocalTodayISO();
    if (draft.occurred_on > today) {
      setError(
        locale === "ar"
          ? "لا يمكن أن يكون التاريخ في المستقبل."
          : locale === "fr"
          ? "La date ne peut pas être dans le futur."
          : "Date cannot be in the future."
      );
      return;
    }

    // 5. Onboarding / First income check
    const needsFirstIncome = dashboard?.sweep_bootstrap?.needs_first_income_declaration;
    if (needsFirstIncome) {
      if (draft.type === "expense") {
        setError(
          locale === "ar"
            ? "يرجى التصريح بالدخل الأول أولاً لتفعيل حسابك وتحديد دوراتك المالية."
            : locale === "fr"
            ? "Veuillez déclarer votre premier revenu d'abord afin d'activer votre compte."
            : "Please declare your first income first to activate your account."
        );
        return;
      }
      // If income, ensure it's a primary category
      const selectedCategoryObj = categories.find(c => c.id === effectiveCategoryId);
      if (selectedCategoryObj && !isInternalIncomeCategory(selectedCategoryObj.name)) {
        setError(
          locale === "ar"
            ? "لتفعيل حسابك، يجب أن يكون دخلك الأول هو دخلك الرئيسي (الراتب، إلخ)."
            : locale === "fr"
            ? "Pour activer votre compte, votre premier revenu doit être votre revenu principal (Salaire, etc.)."
            : "To activate your account, your first income must be your primary income (Salary, etc.)."
        );
        return;
      }
    }

    // 6. Validate past cycle date
    const activePeriod = dashboard?.current_period ? {
      start: dashboard.current_period.start,
      end: dashboard.current_period.end,
    } : null;
    if (!needsFirstIncome && activePeriod?.start && draft.occurred_on < activePeriod.start) {
      setError(
        locale === "ar"
          ? `لا يمكن أن يكون تاريخ المعاملة قبل بداية الفترة الحالية (${activePeriod.start}).`
          : locale === "fr"
          ? `La date de la transaction ne peut pas être antérieure au début de la période en cours (${activePeriod.start}).`
          : `The transaction date cannot be before the start of the active period (${activePeriod.start}).`
      );
      return;
    }

    // 7. Validate mapping for expense
    if (draft.type === "expense" && !mappings[effectiveCategoryId]) {
      setError(copy.categoryNotMapped || "CATEGORY_NOT_MAPPED");
      return;
    }

    // Check for duplicate in frontend
    const buildDuplicateKey = (tx: any) =>
      `${tx.type}|${tx.category_id}|${tx.occurred_on}|${Number(tx.amount).toFixed(2)}|${tx.description ?? ""}`;
    const draftKey = `${draft.type}|${effectiveCategoryId}|${draft.occurred_on}|${amountForApi}|${draft.description}`;
    const isDuplicate = transactions.some(
      (tx) => buildDuplicateKey(tx) === draftKey && tx.id !== editingId
    );
    if (isDuplicate) {
      setError(copy.duplicateBeforeSave);
      toast({
        title: copy.duplicateBeforeSave,
        description: copy.duplicateBeforeSaveDescription,
        variant: "default",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await apiFetch<TransactionOut>(`/transactions/${editingId}`, {
          method: "PATCH",
          body: {
            type: draft.type,
            category_id: effectiveCategoryId,
            amount: amountForApi,
            occurred_on: draft.occurred_on,
            description: draft.description || undefined,
          },
        });
        toast({
          title: locale === "ar" ? "تم تعديل العملية بنجاح" : "Transaction modifiée avec succès",
          variant: "success",
        });
      } else {
        await apiFetch<TransactionOut>("/transactions", {
          method: "POST",
          body: {
            type: draft.type,
            category_id: effectiveCategoryId,
            amount: amountForApi,
            occurred_on: draft.occurred_on,
            description: draft.description || undefined,
          },
        });
        toast({
          title: copy.addSuccess,
          description: copy.addSuccessDescription,
          variant: "success",
        });
      }

      setDraft({
        type: "expense",
        amount: "",
        category_id: allExpenseCategories[0]?.id ?? "",
        occurred_on: getLocalTodayISO(),
        description: "",
      });
      setEditingId(null);
      await loadData();
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("floussy:data-updated"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.unknownError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAmountChange = (val: string) => {
    const converted = normalizeDigits(val);
    let cleaned = converted.replace(/[^\d,.-]/g, "");
    const parts = cleaned.split(/[.,]/);
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }
    setDraft((prev) => ({ ...prev, amount: cleaned }));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
      <form onSubmit={handleFormSubmit} className="grid gap-4">
        <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-[var(--surface)] shadow-[0_24px_60px_-40px_rgba(15,23,42,0.3)]">
          <div
            className={`h-1.5 w-full ${
              draft.type === "income"
                ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-400"
                : "bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300"
            }`}
          />
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {copy.quickEntry}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-[var(--ink)]">
                    {editingId ? copy.editTransaction : copy.createTransaction}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {copy.quickEntryDesc}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="shrink-0"
                >
                  {copy.openHistory}
                </Button>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">{copy.type}</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    aria-pressed={draft.type === "expense"}
                    onClick={() => {
                      const today = getLocalTodayISO();
                      const expectedSalaryDate = getExpectedSalaryDate(
                        dashboard?.current_period?.start,
                        dashboard?.current_period?.end,
                        dashboard?.sweep_status?.income_declared,
                        today
                      );
                      setDraft((prev) => {
                        const nextDate = prev.occurred_on === expectedSalaryDate ? today : prev.occurred_on;
                        return {
                          ...prev,
                          type: "expense",
                          category_id: allExpenseCategories[0]?.id || "",
                          occurred_on: nextDate,
                        };
                      });
                    }}
                    className={`rounded-3xl border px-4 py-3 text-sm font-semibold transition ${
                      draft.type === "expense"
                        ? "border-rose-600 bg-rose-600 text-white shadow-sm"
                        : "border-[var(--border)] bg-[var(--surface)] text-rose-700 hover:border-rose-400"
                    }`}
                  >
                    {copy.expense}
                  </button>
                  <button
                    type="button"
                    aria-pressed={draft.type === "income"}
                    onClick={() => {
                      const today = getLocalTodayISO();
                      const expectedSalaryDate = getExpectedSalaryDate(
                        dashboard?.current_period?.start,
                        dashboard?.current_period?.end,
                        dashboard?.sweep_status?.income_declared,
                        today
                      );
                      setDraft((prev) => {
                        const nextDate = prev.occurred_on === today ? expectedSalaryDate : prev.occurred_on;
                        return {
                          ...prev,
                          type: "income",
                          category_id: defaultIncomeCategory?.id || "",
                          occurred_on: nextDate,
                        };
                      });
                    }}
                    className={`rounded-3xl border px-4 py-3 text-sm font-semibold transition ${
                      draft.type === "income"
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                        : "border-[var(--border)] bg-[var(--surface)] text-emerald-700 hover:border-emerald-400"
                    }`}
                  >
                    {copy.income}
                  </button>
                </div>
              </label>

              <div className={`rounded-[26px] border p-5 shadow-inner ${amountCardTone}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      {copy.amount}
                    </p>
                    <h4 className="mt-1 text-lg font-semibold text-[var(--ink)]">
                      {draft.type === "income" ? copy.amountHeroIncome : copy.amountHeroExpense}
                    </h4>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {draft.type === "income" ? copy.amountHintIncome : copy.amountHintExpense}
                    </p>
                  </div>
                  {activePeriodLabel ? (
                    <Badge tone="muted">
                      {copy.activePeriod}: {activePeriodLabel}
                    </Badge>
                  ) : null}
                </div>
                <input
                  value={draft.amount}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  className={`mt-4 w-full rounded-3xl border px-5 py-4 text-4xl font-semibold tracking-tight shadow-sm outline-none transition placeholder:text-slate-400 md:text-5xl ${amountInputTone}`}
                  placeholder="0.00"
                  inputMode="decimal"
                />
              </div>

              {noCategories ? (
                <Alert>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>{copy.noCategories}</span>
                    <Button asChild variant="secondary" size="sm">
                      <Link href="/categories">{copy.createCategories}</Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : noMatchingCategories ? (
                <Alert>
                  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {draft.type === "income"
                        ? copy.noIncomeCategories
                        : copy.noExpenseCategories}{" "}
                      {draft.type === "income"
                        ? copy.createToContinue
                        : copy.mapToContinue}
                    </span>
                    <Button asChild variant="secondary" size="sm">
                      <Link href="/categories">
                        {draft.type === "income"
                          ? copy.createCategories
                          : copy.mapInCategories}
                      </Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                {/* Always render a category selector for both income and expense */}
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{copy.category}</span>
                  <select
                    value={draft.category_id}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        category_id: event.target.value,
                      }))
                    }
                    className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                    required
                    disabled={noCategories}
                  >
                    <option value="" disabled>
                      {copy.selectCategory}
                    </option>
                    {draft.type === "income" ? (
                      // Income: list only income categories
                      filteredDraftCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {localizeCategoryName(cat.name, locale)}
                        </option>
                      ))
                    ) : (
                      // Expense: mapped first, then unmapped with warning
                      <>
                        <optgroup label={locale === "ar" ? "فئات مربوطة بأظرفة" : locale === "fr" ? "Catégories liées" : "Linked Categories"}>
                          {allExpenseCategories.filter((cat) => mappedCategoryIds.has(cat.id)).map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {localizeCategoryName(cat.name, locale)}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={locale === "ar" ? "فئات غير مربوطة" : locale === "fr" ? "Catégories non liées" : "Unmapped Categories"}>
                          {allExpenseCategories.filter((cat) => !mappedCategoryIds.has(cat.id)).map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              ⚠️ {localizeCategoryName(cat.name, locale)}
                            </option>
                          ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                  {/* Informational note for income — income always lands in cash */}
                  {draft.type === "income" && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <span>💵</span>
                      <span>
                        {locale === "ar"
                          ? "الدخل كيدخل مباشرة للكاش الخاص بيك"
                          : locale === "en"
                          ? "Income goes directly to your cash balance"
                          : "Le revenu va directement dans votre cash"}
                      </span>
                    </p>
                  )}
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{copy.date}</span>
                  <input
                    type="date"
                    max={getLocalTodayISO()}
                    value={draft.occurred_on}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        occurred_on: event.target.value,
                      }))
                    }
                    className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                  />
                </label>
              </div>

              {/* Inline mapping support in main form */}
              {!isCurrentCategoryMapped && draft.category_id && draft.type === "expense" && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl space-y-2 animate-fadeIn">
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                    {locale === "ar"
                      ? "هاد الفئة ما مربوطاش بـ حتى ظرف. باش تقيد هاد المصروف، خاصك تربطها بظرف أولاً:"
                      : locale === "fr"
                      ? "Cette catégorie n'est liée à aucune enveloppe. Pour enregistrer cette dépense, veuillez l'associer à une enveloppe :"
                      : "This category is not linked to any envelope. To log this expense, please associate it with an envelope first:"}
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={inlineEnvelopeMapping}
                      onChange={(e) => setInlineEnvelopeMapping(e.target.value)}
                      className="flex-1 h-10 rounded-xl border border-amber-300 bg-white dark:bg-slate-900 px-3 text-xs text-amber-900 dark:text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="">
                        {locale === "ar" ? "-- اختر ظرفاً --" : locale === "fr" ? "-- Choisir une enveloppe --" : "-- Select an envelope --"}
                      </option>
                      {envelopes.map((env) => (
                        <option key={env.id} value={env.id}>
                          {localizeEnvelopeLabel(env.name, locale)}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      disabled={!inlineEnvelopeMapping}
                      onClick={() => handleMapCategoryInline(draft.category_id, inlineEnvelopeMapping)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-xl px-4"
                    >
                      {locale === "ar" ? "ربط" : locale === "fr" ? "Lier" : "Link"}
                    </Button>
                  </div>
                </div>
              )}

              {datePeriodWarning ? (
                <Alert tone="warning">
                  <AlertDescription>{datePeriodWarning}</AlertDescription>
                </Alert>
              ) : null}

              {incomeCategoryWarning ? (
                <Alert tone="warning">
                  <AlertDescription>{incomeCategoryWarning}</AlertDescription>
                </Alert>
              ) : null}

              {incomeExpectedWarning ? (
                <Alert tone="warning">
                  <AlertDescription>{incomeExpectedWarning}</AlertDescription>
                </Alert>
              ) : null}

              {incomeDateEarlyWarning ? (
                <Alert tone="warning">
                  <AlertDescription>{incomeDateEarlyWarning}</AlertDescription>
                </Alert>
              ) : null}

              {incomePeriodBoundsPreview ? (
                <Alert tone="default">
                  <AlertDescription>{incomePeriodBoundsPreview}</AlertDescription>
                </Alert>
              ) : null}

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">{copy.description}</span>
                <input
                  value={draft.description}
                  data-clarity-mask="true"
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                  placeholder={copy.optionalDescription}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-slate-50 to-[var(--surface)] dark:from-slate-900 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {copy.availableCategories}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--ink)]">
                    {filteredDraftCategories.length}
                  </p>
                </div>
                <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-slate-50 to-[var(--surface)] dark:from-slate-900 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {copy.mappedEnvelopeStatus}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                    {mappedEnvelopeHint ?? copy.noMappedEnvelopeStatus}
                  </p>
                </div>
                <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-slate-50 to-[var(--surface)] dark:from-slate-900 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {copy.activePeriod}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                    {activePeriodLabel ?? "—"}
                  </p>
                </div>
              </div>

              {error ? (
                <Alert tone="error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div data-tour="transaction-actions" className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="submit"
                  isLoading={submitting}
                  disabled={!isCurrentCategoryMapped && draft.type === "expense"}
                  className={`min-w-44 rounded-2xl shadow-sm ${
                    draft.type === "income"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {editingId ? copy.saveChanges : copy.createTransaction}
                </Button>
                {editingId ? (
                  <Button variant="secondary" type="button" onClick={handleCancelEdit}>
                    {copy.cancel}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Live Preview Pane */}
      {draft.type === "income" ? (
        <div data-tour="transaction-preview" className={`grid h-fit gap-4 rounded-[30px] border p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)] sm:sticky sm:top-6 sm:p-6 ${previewCardTone}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {copy.livePreviewTitle}
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--ink)]">
                {copy.preview}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {copy.livePreviewDescIncome}
              </p>
            </div>
            {incomePreview?.period_start ? (
              <Badge tone="muted">
                {incomePreview.period_start} {periodArrow} {incomePreview.period_end}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--muted)]">{copy.previewBase}</p>
            <span className="text-xs font-medium text-emerald-700">
              {copy.previewAuto}
            </span>
          </div>
          {(() => {
            const parsed = parseAmountInput(draft.amount);
            if (parsed === null) {
              return (
                <Alert>
                  <AlertDescription>{copy.previewEnterAmount}</AlertDescription>
                </Alert>
              );
            }
            if (incomePreviewLoading) {
              return (
                <p className="text-xs text-[var(--muted)]">
                  {copy.previewLoading}
                </p>
              );
            }
            if (incomePreviewError) {
              return (
                <Alert tone="error">
                  <AlertDescription>{incomePreviewError}</AlertDescription>
                </Alert>
              );
            }
            if (!incomePreview || incomePreview.items.length === 0) {
              return (
                <Alert tone="error">
                  <AlertDescription className="space-y-2">
                    <span className="block">{copy.noDistributionConfig}</span>
                    <Link href="/envelopes">
                      <Button size="sm" variant="secondary" type="button">
                        {copy.createConfig}
                      </Button>
                    </Link>
                  </AlertDescription>
                </Alert>
              );
            }
            return (
              <div className="grid gap-3 text-sm">
                {(() => {
                  const fixedCommitmentItems = incomePreview.items.filter(
                    (item) =>
                      isFixedMode(item.mode) &&
                      item.target_type !== "goal" &&
                      !looksLikeDebtName(item.name)
                  );
                  const debtGoalItems = incomePreview.items.filter(
                    (item) =>
                      isFixedMode(item.mode) &&
                      (item.target_type === "goal" || looksLikeDebtName(item.name))
                  );
                  const fixedTargetKeys = new Set(
                    incomePreview.items
                      .filter((item) => isFixedMode(item.mode))
                      .map((item) => `${item.target_type}:${item.target_id}`)
                  );
                  const flexibleItems = incomePreview.items.filter(
                    (item) =>
                      isPercentMode(item.mode) &&
                      !fixedTargetKeys.has(`${item.target_type}:${item.target_id}`)
                  );
                  const sections = [
                    {
                      key: "fixed",
                      title: copy.previewFixedLayer,
                      items: fixedCommitmentItems,
                      showPercent: false,
                    },
                    {
                      key: "debt-goals",
                      title: copy.previewDebtGoalsLayer,
                      items: debtGoalItems,
                      showPercent: false,
                    },
                    {
                      key: "flex",
                      title: copy.previewFlexibleLayer,
                      items: flexibleItems,
                      showPercent: true,
                    },
                  ];

                  return sections.map((section) => {
                    return (
                      <div key={section.key} className="grid gap-2">
                        <p className="text-xs font-semibold text-[var(--muted)]">
                          {section.title}
                        </p>
                        {section.items.length === 0 ? (
                          <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)]/80 dark:bg-slate-900 px-3 py-2">
                            <span className="text-xs text-[var(--muted)]">
                              {copy.previewNoLayerItems}
                            </span>
                            <span className="font-semibold">0.00</span>
                          </div>
                        ) : (
                          section.items.map((item) => {
                            const sectionTotal = section.showPercent
                              ? section.items.reduce(
                                  (sum, sectionItem) => sum + Number(sectionItem.amount),
                                  0
                                )
                              : 0;
                            const sharePct =
                              section.showPercent && sectionTotal > 0
                                ? (Number(item.amount) / sectionTotal) * 100
                                : null;
                            return (
                              <div
                                key={`${section.key}-${item.target_type}-${item.target_id}-${item.mode}`}
                                className="flex items-center justify-between rounded-2xl bg-[var(--surface)]/80 dark:bg-slate-900 px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {localizeEnvelopeLabel(item.name, locale)}
                                  </span>
                                  <Badge tone="muted">
                                    {section.showPercent
                                      ? `${(sharePct ?? 0).toFixed(2)}%`
                                      : copy.fixed}
                                  </Badge>
                                </div>
                                <span className="font-semibold">{item.amount}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  });
                })()}
                <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-[var(--surface)]/90 dark:bg-slate-950 px-3 py-3 text-sm">
                  <span className="text-[var(--muted)]">{copy.remainsInCash}</span>
                  <span className="font-semibold">{incomePreview.cash_after}</span>
                </div>
                {incomePreview.warnings.length > 0 ? (
                  <Alert tone="warning">
                    <AlertDescription>
                      {incomePreview.warnings.join(" ")}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            );
          })()}
        </div>
      ) : (
        <div data-tour="transaction-preview" className={`grid h-fit gap-4 rounded-[30px] border p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)] sm:sticky sm:top-6 sm:p-6 ${previewCardTone}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {copy.livePreviewTitle}
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--ink)]">
                {copy.expenseImpact}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {copy.livePreviewDescExpense}
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 dark:bg-slate-900/60 px-4 py-3">
            <p className="text-xs text-[var(--muted)]">{copy.expenseImpactBase}</p>
          </div>
          {expenseImpact?.state === "no_category" ? (
            <Alert>
              <AlertDescription>{copy.expenseImpactSelectCategory}</AlertDescription>
            </Alert>
          ) : null}
          {expenseImpact?.state === "not_mapped" ? (
            <Alert tone="error">
              <AlertDescription>{copy.expenseImpactNotMapped}</AlertDescription>
            </Alert>
          ) : null}
          {expenseImpact?.state === "ready" ? (
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)]/80 dark:bg-slate-900 px-3 py-3">
                <span className="text-[var(--muted)]">{copy.expenseImpactEnvelope}</span>
                <span className="font-medium">{expenseImpact.envelopeName}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)]/80 dark:bg-slate-900 px-3 py-3">
                <span className="text-[var(--muted)]">{copy.expenseImpactCurrent}</span>
                <span className="font-medium">{expenseImpact.currentBalance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)]/80 dark:bg-slate-900 px-3 py-3">
                <span className="text-[var(--muted)]">{copy.expenseImpactAfter}</span>
                <span
                  className={`font-semibold ${
                    expenseImpact.willBeNegative ? "text-[var(--error)]" : ""
                  }`}
                >
                  {expenseImpact.afterBalance.toFixed(2)}
                </span>
              </div>
              {expenseImpact.hasAmount && expenseImpact.willBeNegative ? (
                <Alert tone="warning">
                  <AlertDescription>{copy.expenseImpactWarning}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
