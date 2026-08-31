"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api";
import { applyDistribution } from "@/lib/distribution";
import { normalizeDigits, parseAmountInput } from "@/lib/parseAmount";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { isInternalIncomeCategory, localizeCategoryName, getCanonicalCategoryKey } from "@/lib/categoryCatalog";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import type { FloussyLocale } from "@/lib/localePreference";
import type { CategoryOut, DashboardOut, TransactionOut, DistributionSimulateOut, IncomeReminderOut } from "@/lib/types";
import { DASHBOARD_COPY } from "@/lib/translations/translations";
import Link from "next/link";
import { addMonths } from "date-fns";
import useSWR, { mutate } from "swr";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";

const QUICK_TX_INCOME_RESUME_STORAGE_KEY = "floussy.quickTx.incomeResume.v1";

// Envelope names are free text the user can edit, so deciding which money
// belongs to the reallocatable pool by substring is unsafe: "flex" alone also
// matches an envelope called "Loisirs flex". Every false positive inflates the
// pool, and the distribution screen then offers more to split than the account
// can actually deliver. Match canonical names instead, and keep debt keywords
// to whole words so a longer name cannot match by accident.
const normalizePoolName = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^(the|le|la|les|al|el)\s+/, "")
    .replace(/[\s_-]+/g, " ")
    .trim();

const FLEXIBILITY_POOL_NAMES = new Set([
  "flexibility",
  "flexibilite",
  "flex",
  "المرونة",
  "المرونه",
  "مرونة",
  "مرونه",
]);

const isFlexibilityPoolEnvelope = (name: string): boolean =>
  FLEXIBILITY_POOL_NAMES.has(normalizePoolName(name));

// Debt envelopes are created under a "Dettes — x" / "الديون — x" convention.
// The bare keywords stay as a fallback for envelopes created before it, but
// only as whole words, so "credit" no longer matches "assurance credit".
const DEBT_POOL_PREFIXES = ["dettes ", "dette ", "الديون ", "دين ", "ديون "];
const DEBT_POOL_WORDS = new Set([
  "dette",
  "dettes",
  "debt",
  "debts",
  "credit",
  "credits",
  "loan",
  "repayment",
  "قرض",
  "دين",
  "ديون",
  "الديون",
]);

const isDebtPoolEnvelope = (name: string): boolean => {
  const normalized = normalizePoolName(name);
  if (DEBT_POOL_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  return normalized.split(" ").some((word) => DEBT_POOL_WORDS.has(word));
};

const CATEGORY_TRANSLATIONS_MAP: Record<string, string> = {
  "loisirs": "الترفيه",
  "الترفيه": "loisirs",
  "alimentation": "المأكولات",
  "المأكولات": "alimentation",
  "courses": "المأكولات",
  "groceries": "المأكولات",
  "transport": "النقل",
  "النقل": "transport",
  "sante": "الصحة",
  "الصحة": "sante",
  "abonnements": "لا بونومون",
  "لا بونومون": "abonnements",
  "voyage": "السفر",
  "السفر": "voyage",
  "shopping": "الشوبينغ",
  "الشوبينغ": "shopping",
  "loyer": "الكراء",
  "الكراء": "loyer",
  "rent": "الكراء",
  "cadeaux & dons": "الهدايا والتبرعات",
  "الهدايا والتبرعات": "cadeaux & dons",
  "divers": "مصاريف متنوعة",
  "مصاريف متنوعة": "divers",
  "miscellaneous": "divers",
  "مصاريف أخرى": "divers",
};


type QuickTransactionDraft = {
  type: "income" | "expense";
  category_id: string;
  amount: string;
  occurred_on: string;
  description: string;
};

type QuickTxFlowStep = "form" | "income_preview";

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

const parseIsoDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysBetweenIso = (from: string, to: string) => {
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  if (!fromDate || !toDate) return Number.POSITIVE_INFINITY;
  return Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
};

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const formatMoney = (value: string | number | undefined) => {
  if (value === undefined) return "0.00";
  if (typeof value === "number") return value.toFixed(2);
  return value;
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

function localizeSystemEnvelopeName(name: string, locale: FloussyLocale) {
  if (locale === "ar") {
    const normalized = name.trim().toLowerCase();
    if (["objectif principal", "main goal"].includes(normalized)) return "الهدف الرئيسي";
  }
  return localizeEnvelopeLabel(name, locale);
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

interface QuickTxFormProps {
  defaultType?: "income" | "expense";
  bootstrapOptions?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
  isInline?: boolean;
}

export const QuickTxForm: React.FC<QuickTxFormProps> = ({
  defaultType = "expense",
  bootstrapOptions,
  onSuccess,
  onCancel,
  isInline = false,
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const [locale, setLocale] = useState<FloussyLocale>("fr");
  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    syncLocale();
    window.addEventListener("floussy:locale-changed", syncLocale);
    return () => {
      window.removeEventListener("floussy:locale-changed", syncLocale);
    };
  }, []);

  const { data: categoriesData } = useSWR<CategoryOut[]>("/categories", apiFetch);
  const categories = categoriesData ?? [];

  const { data: transactionsData } = useSWR<TransactionOut[]>("/transactions", apiFetch);
  const transactions = transactionsData ?? [];

  const { data: mappingsData } = useSWR<any[]>("/mappings", apiFetch);
  const mappings = useMemo(() => {
    if (!mappingsData) return {};
    return mappingsData.reduce<Record<string, string>>(
      (acc, item) => ({
        ...acc,
        [item.category_id]: item.envelope_id,
      }),
      {}
    );
  }, [mappingsData]);

  const { data: dashboardData } = useSWR<DashboardOut>("/dashboard", apiFetch);
  const data = dashboardData;

  const loadData = useCallback(async () => {
    await Promise.all([
      mutate("/categories"),
      mutate("/transactions"),
      mutate("/mappings"),
      mutate("/dashboard"),
    ]);
  }, []);

  const copy = DASHBOARD_COPY[locale];
  const periodArrow = locale === "ar" ? "←" : "→";

  const [quickTxDraft, setQuickTxDraft] = useState<QuickTransactionDraft>({
    type: bootstrapOptions?.type ?? defaultType,
    category_id: "",
    amount: "",
    occurred_on: getLocalTodayISO(),
    description: "",
  });

  const [quickTxSubmitting, setQuickTxSubmitting] = useState(false);
  const [quickTxError, setQuickTxError] = useState<string | null>(null);
  const [quickTxStep, setQuickTxStep] = useState<QuickTxFlowStep>("form");
  const [quickTxDistributionPreview, setQuickTxDistributionPreview] = useState<DistributionSimulateOut | null>(null);
  const [quickTxReminderIdsToMark, setQuickTxReminderIdsToMark] = useState<string[]>([]);
  const [quickTxPreferenceBoost, setQuickTxPreferenceBoost] = useState<Record<string, number>>({});
  const [inlineEnvelopeMapping, setInlineEnvelopeMapping] = useState<string>("");
  const [quickTxMode, setQuickTxMode] = useState<"standard" | "magic">("standard");
  const [magicInput, setMagicInput] = useState("");
  const [permanentShift, setPermanentShift] = useState<boolean | null>(null);

  const quickTxSubmitLockRef = useRef(false);
  const quickTxHasInitializedRef = useRef(false);

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

  const incomeCategories = useMemo(
    () =>
      categories.filter((cat) => categoryKindById.get(cat.id) === "income"),
    [categories, categoryKindById]
  );

  const defaultIncomeCategory = useMemo(() => {
    if (incomeCategories.length === 0) return null;
    const salary = incomeCategories.find((cat) => looksLikeSalaryCategory(cat.name));
    return salary ?? incomeCategories[0];
  }, [incomeCategories]);

  const allExpenseCategories = useMemo(
    () =>
      categories.filter((cat) => categoryKindById.get(cat.id) !== "income"),
    [categories, categoryKindById]
  );

  const mappedExpenseCategories = useMemo(
    () =>
      allExpenseCategories.filter((cat) => mappedCategoryIds.has(cat.id)),
    [allExpenseCategories, mappedCategoryIds]
  );

  const [nlpPrediction, setNlpPrediction] = useState<{
    amount: number | null;
    date: string | null;
    description: string;
    category: string | null;
    needs_disambiguation: boolean;
    suggested_categories: string[];
  } | null>(null);
  const [isNlpLoading, setIsNlpLoading] = useState(false);
  const [selectedDisambiguationCategoryName, setSelectedDisambiguationCategoryName] = useState<string | null>(null);

  const [aiWarning, setAiWarning] = useState<{
    explanation: string;
    suggestedCategory: string | null;
    pendingSaveAction: (overrideCategoryId?: string) => Promise<void>;
  } | null>(null);
  const [isAiVerifying, setIsAiVerifying] = useState(false);
  const predictedCategoryNameRef = useRef<string | null>(null);

  // Debounced NLP call
  useEffect(() => {
    if (quickTxMode !== "magic" || !magicInput.trim()) {
      setNlpPrediction(null);
      setSelectedDisambiguationCategoryName(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsNlpLoading(true);
      try {
        const res = await apiFetch<{
          amount: number | null;
          date: string | null;
          description: string;
          category: string | null;
          needs_disambiguation: boolean;
          suggested_categories: string[];
        }>("/nlp/predict", {
          method: "POST",
          body: { text: magicInput },
        });
        setNlpPrediction(res);
        setSelectedDisambiguationCategoryName(null);
      } catch (err) {
        console.error("NLP predict failed:", err);
      } finally {
        setIsNlpLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [magicInput, quickTxMode]);

  // Helper to find an active expense category by canonical name or dictionary translation
  const getActiveCategoryByName = useCallback((catName: string) => {
    if (!catName) return null;
    const normName = catName.trim().toLowerCase();

    // 1. Direct case-insensitive match on category name
    let found = allExpenseCategories.find(
      (c) => c.name.trim().toLowerCase() === normName
    );
    if (found) return found;

    // 2. Translate using mapping dictionary
    const mappedName = CATEGORY_TRANSLATIONS_MAP[normName];
    if (mappedName) {
      const normMapped = mappedName.toLowerCase();
      found = allExpenseCategories.find(
        (c) => c.name.trim().toLowerCase() === normMapped
      );
      if (found) return found;
    }

    // 3. Match via canonical keys
    const canonicalKey = getCanonicalCategoryKey(catName).toLowerCase();
    found = allExpenseCategories.find(
      (c) => getCanonicalCategoryKey(c.name).toLowerCase() === canonicalKey
    );
    if (found) return found;

    // 4. Reverse lookup translation mapping against candidate names
    for (const key in CATEGORY_TRANSLATIONS_MAP) {
      if (CATEGORY_TRANSLATIONS_MAP[key].toLowerCase() === normName) {
        found = allExpenseCategories.find(
          (c) => c.name.trim().toLowerCase() === key.toLowerCase()
        );
        if (found) return found;
      }
    }

    return null;
  }, [allExpenseCategories]);

  // Helper to find fallback category
  const getFallbackCategory = useCallback(() => {
    const fallbackKeywords = ["divers", "miscellaneous", "مصاريف متنوعة", "مصاريف أخرى", "autre", "autres"];
    for (const kw of fallbackKeywords) {
      const matched = allExpenseCategories.find(
        (c) => c.name.toLowerCase().includes(kw) || getCanonicalCategoryKey(c.name).toLowerCase() === "miscellaneous"
      );
      if (matched) return matched;
    }
    return allExpenseCategories[0] || null;
  }, [allExpenseCategories]);

  // Filter suggested categories to only contain active ones
  const activeSuggestedCategories = useMemo(() => {
    if (!nlpPrediction?.suggested_categories) return [];
    return nlpPrediction.suggested_categories.filter((catName) =>
      Boolean(getActiveCategoryByName(catName))
    );
  }, [nlpPrediction, getActiveCategoryByName]);

  // Determine if we need disambiguation (only if more than 1 active option exists)
  const activeNeedsDisambiguation = useMemo(() => {
    if (!nlpPrediction) return false;
    if (nlpPrediction.needs_disambiguation) {
      return activeSuggestedCategories.length > 1;
    }
    return false;
  }, [nlpPrediction, activeSuggestedCategories]);

  // Compute resolved category from prediction (for magic preview)
  const resolvedCategoryName = useMemo(() => {
    if (!nlpPrediction) return null;
    
    if (activeNeedsDisambiguation) {
      return selectedDisambiguationCategoryName && getActiveCategoryByName(selectedDisambiguationCategoryName)
        ? selectedDisambiguationCategoryName
        : null;
    }

    if (activeSuggestedCategories.length === 1) {
      return activeSuggestedCategories[0];
    }

    if (nlpPrediction.category) {
      const matched = getActiveCategoryByName(nlpPrediction.category);
      if (matched) {
        return matched.name;
      }
    }

    // Fallback if no matching category was found
    const fallback = getFallbackCategory();
    return fallback ? fallback.name : null;
  }, [nlpPrediction, activeNeedsDisambiguation, selectedDisambiguationCategoryName, activeSuggestedCategories, getActiveCategoryByName, getFallbackCategory]);

  const resolvedCategoryId = useMemo(() => {
    if (!resolvedCategoryName) return "";
    const matched = getActiveCategoryByName(resolvedCategoryName);
    return matched?.id || "";
  }, [resolvedCategoryName, getActiveCategoryByName]);

  const resolvedDescription = useMemo(() => {
    if (!nlpPrediction) return "";
    let desc = nlpPrediction.description || "";
    if (resolvedCategoryId) {
      desc = desc.replace(/\b(tserkila|tsserkila|tasserkila)\b/gi, "").replace(/\s+/g, " ").trim();
    }
    return desc;
  }, [nlpPrediction, resolvedCategoryId]);

  // Sync NLP prediction with form draft state
  useEffect(() => {
    if (quickTxMode !== "magic" || !nlpPrediction) return;

    let amountVal = nlpPrediction.amount !== null ? String(nlpPrediction.amount) : "";
    let dateVal = nlpPrediction.date || getLocalTodayISO();
    
    setQuickTxDraft((prev) => ({
      ...prev,
      amount: amountVal,
      occurred_on: dateVal,
      description: resolvedDescription,
      category_id: resolvedCategoryId,
    }));
  }, [nlpPrediction, resolvedCategoryId, resolvedDescription, quickTxMode]);

  // Unified category selection with feedback trigger
  const handleCategoryChange = (newCatId: string) => {
    setQuickTxDraft((prev) => {
      let cleanDesc = prev.description;
      if (newCatId) {
        cleanDesc = cleanDesc.replace(/\b(tserkila|tsserkila|tasserkila)\b/gi, "").replace(/\s+/g, " ").trim();
      }
      return {
        ...prev,
        category_id: newCatId,
        description: cleanDesc,
      };
    });

    if (nlpPrediction) {
      const newCatName = categories.find((c) => c.id === newCatId)?.name || "";
      const initialPredicted = predictedCategoryNameRef.current;
      if (initialPredicted && initialPredicted.toLowerCase() !== newCatName.toLowerCase()) {
        apiFetch("/nlp/feedback", {
          method: "POST",
          body: {
            keyword: nlpPrediction.description,
            category_name: newCatName,
          },
        }).catch((err) => console.error("Feedback failed:", err));
      }
    }
  };


  const quickTxCategories = useMemo(() => {
    return quickTxDraft.type === "income" ? incomeCategories : allExpenseCategories;
  }, [quickTxDraft.type, incomeCategories, allExpenseCategories]);

  const quickTxFrequentTxs = useMemo(() => {
    const list = transactions.filter((tx) => tx.type === quickTxDraft.type);
    const counts = new Map<string, { tx: TransactionOut; count: number }>();
    list.forEach((tx) => {
      const key = `${tx.category_id}|${Number(tx.amount).toFixed(2)}|${tx.description || ""}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { tx, count: 1 });
      }
    });
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((item) => item.tx);
  }, [transactions, quickTxDraft.type]);

  const expenseTransactionsSorted = useMemo(
    () =>
      transactions
        .filter((tx) => tx.type === "expense")
        .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)),
    [transactions]
  );

  const expenseTxByCategory = useMemo(() => {
    const map = new Map<string, TransactionOut[]>();
    expenseTransactionsSorted.forEach((tx) => {
      const list = map.get(tx.category_id) ?? [];
      list.push(tx);
      map.set(tx.category_id, list);
    });
    return map;
  }, [expenseTransactionsSorted]);

  const mostRecentExpenseCategoryId = expenseTransactionsSorted[0]?.category_id ?? null;
  const quickTxRefDate = quickTxDraft.occurred_on || getLocalTodayISO();
  const quickTxDraftDate = parseIsoDate(quickTxRefDate);
  const quickTxDraftDay = quickTxDraftDate?.getDay() ?? null;
  const quickTxAmountParsed = parseAmountInput(quickTxDraft.amount);

  const smartExpenseSuggestions = useMemo(() => {
    if (mappedExpenseCategories.length === 0) return [] as CategoryOut[];
    const nowHour = new Date().getHours();
    const maxPreference = Math.max(
      1,
      ...Object.values(quickTxPreferenceBoost).map((value) => Number(value) || 0)
    );
    const ranked = mappedExpenseCategories.map((cat) => {
      const txs = expenseTxByCategory.get(cat.id) ?? [];
      const count7 = txs.filter((tx) => {
        const days = daysBetweenIso(tx.occurred_on, quickTxRefDate);
        return days >= 0 && days <= 7;
      }).length;
      const count30 = txs.filter((tx) => {
        const days = daysBetweenIso(tx.occurred_on, quickTxRefDate);
        return days >= 0 && days <= 30;
      }).length;

      const last = txs[0]?.occurred_on ?? null;
      const recencyDays = last ? daysBetweenIso(last, quickTxRefDate) : Number.POSITIVE_INFINITY;
      const recencyScore = recencyDays === Number.POSITIVE_INFINITY ? 0 : Math.max(0, 1 - recencyDays / 30);

      const dayMatchScore =
        quickTxDraftDay === null || txs.length === 0
          ? 0
          : txs
              .slice(0, 12)
              .filter((tx) => parseIsoDate(tx.occurred_on)?.getDay() === quickTxDraftDay).length /
            Math.max(1, Math.min(12, txs.length));

      const historicalAmounts = txs
        .map((tx) => Number(tx.amount))
        .filter((value) => Number.isFinite(value) && value > 0);
      const medianAmount = median(historicalAmounts);
      const amountCloseness =
        quickTxAmountParsed && medianAmount > 0
          ? Math.max(
              0,
              1 - Math.min(Math.abs(quickTxAmountParsed - medianAmount) / Math.max(medianAmount, 1), 1)
            )
          : 0.5;

      const preferenceScore = (quickTxPreferenceBoost[cat.id] ?? 0) / maxPreference;
      const recentCategoryBoost = mostRecentExpenseCategoryId === cat.id ? 1 : 0;

      const normalizedName = normalizeName(cat.name);
      let contextBoost = 0;
      if (
        (normalizedName.includes("carburant") ||
          normalizedName.includes("transport") ||
          normalizedName.includes("taxi")) &&
        nowHour <= 11
      ) {
        contextBoost = 1;
      } else if (
        (normalizedName.includes("restaurant") ||
          normalizedName.includes("sortie") ||
          normalizedName.includes("shopping")) &&
        nowHour >= 18
      ) {
        contextBoost = 1;
      }

      const score =
        Math.min(1, count30 / 10) * 0.35 +
        Math.min(1, count7 / 4) * 0.2 +
        recencyScore * 0.15 +
        dayMatchScore * 0.1 +
        amountCloseness * 0.1 +
        preferenceScore * 0.05 +
        recentCategoryBoost * 0.03 +
        contextBoost * 0.02;

      return { category: cat, score };
    });

    return ranked
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.category);
  }, [
    mappedExpenseCategories,
    expenseTxByCategory,
    mostRecentExpenseCategoryId,
    quickTxAmountParsed,
    quickTxDraftDay,
    quickTxPreferenceBoost,
    quickTxRefDate,
  ]);

  const quickTxAmountSuggestions = useMemo(() => {
    if (quickTxDraft.type === "income") return [1000, 2500, 5000, 10000];
    if (!quickTxDraft.category_id) return [50, 100, 200, 500];
    const txs = expenseTxByCategory.get(quickTxDraft.category_id) ?? [];
    const amounts = txs
      .map((tx) => Number(tx.amount))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (amounts.length === 0) return [50, 100, 200, 500];

    const frequencies = new Map<number, number>();
    amounts.forEach((value) => {
      const rounded = Number(value.toFixed(2));
      frequencies.set(rounded, (frequencies.get(rounded) ?? 0) + 1);
    });
    const topFrequent = [...frequencies.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([value]) => value);
    const med = median(amounts);
    const last = Number((txs[0]?.amount ?? 0).toString());

    const unique = Array.from(
      new Set(
        [last, ...topFrequent, med]
          .map((value) => Number(value.toFixed(2)))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    );
    return unique.slice(0, 4);
  }, [expenseTxByCategory, quickTxDraft.category_id, quickTxDraft.type]);

  const quickTxLastSimilarExpense = useMemo(() => {
    if (quickTxDraft.type !== "expense") return null;
    if (!quickTxDraft.category_id) return null;
    const txs = expenseTxByCategory.get(quickTxDraft.category_id) ?? [];
    return txs[0] ?? null;
  }, [expenseTxByCategory, quickTxDraft.category_id, quickTxDraft.type]);

  const quickTxRecurringSuggestion = useMemo(() => {
    if (quickTxDraft.type !== "expense" || !quickTxDraft.category_id) return null;
    const txs = expenseTxByCategory.get(quickTxDraft.category_id) ?? [];
    const recent = txs.filter((tx) => {
      const days = daysBetweenIso(tx.occurred_on, quickTxRefDate);
      return days >= 0 && days <= 60;
    });
    if (recent.length < 3) return null;
    const recentAmounts = recent
      .slice(0, 6)
      .map((tx) => Number(tx.amount))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (recentAmounts.length < 3) return null;

    const med = median(recentAmounts);
    const avgAbsDev =
      recentAmounts.reduce((sum, value) => sum + Math.abs(value - med), 0) /
      recentAmounts.length;
    const variability = avgAbsDev / Math.max(med, 1);
    if (variability > 0.35) return null;

    return {
      amount: Number(med.toFixed(2)),
      description: recent[0]?.description ?? "",
    };
  }, [expenseTxByCategory, quickTxDraft.category_id, quickTxDraft.type, quickTxRefDate]);

  const quickTxDescriptionSuggestions = useMemo(() => {
    if (quickTxDraft.type !== "expense") return [] as string[];
    const selectedCategory = allExpenseCategories.find(
      (cat) => cat.id === quickTxDraft.category_id
    );
    if (!selectedCategory) return [] as string[];
    const localizedCategory = localizeCategoryName(selectedCategory.name, locale);
    const suffixes =
      locale === "ar"
        ? ["", "يومي", "بطاقة"]
        : locale === "fr"
        ? ["", "quotidien", "carte"]
        : ["", "regular", "card"];
    return Array.from(
      new Set(
        suffixes
          .map((suffix) => `${localizedCategory}${suffix ? ` ${suffix}` : ""}`.trim())
          .filter(Boolean)
      )
    ).slice(0, 3);
  }, [allExpenseCategories, locale, quickTxDraft.category_id, quickTxDraft.type]);

  const quickTxAmountIsValid = parseAmountInput(quickTxDraft.amount) !== null;
  const quickTxEffectiveCategoryId = quickTxDraft.category_id;

  const isCurrentCategoryMapped = useMemo(() => {
    if (quickTxDraft.type === "income") return true;
    if (!quickTxDraft.category_id) return true;
    return mappedCategoryIds.has(quickTxDraft.category_id);
  }, [quickTxDraft.category_id, quickTxDraft.type, mappedCategoryIds]);

  const quickTxCanSubmit = useMemo(() => {
    return !quickTxSubmitting;
  }, [quickTxSubmitting]);

  const activePeriod = useMemo(() => {
    if (data?.current_period) {
      return {
        start: data.current_period.start,
        end: data.current_period.end,
      };
    }
    return null;
  }, [data]);

  const quickTxPreferenceKey = useMemo(() => {
    if (!data?.user?.id) return null;
    return `floussy.quickTx.expensePreference:${data.user.id}:v1`;
  }, [data?.user?.id]);

  useEffect(() => {
    if (!quickTxPreferenceKey) return;
    try {
      const raw = localStorage.getItem(quickTxPreferenceKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number>;
      const cleaned: Record<string, number> = {};
      Object.entries(parsed).forEach(([categoryId, value]) => {
        if (typeof value === "number" && Number.isFinite(value) && value > 0) {
          cleaned[categoryId] = value;
        }
      });
      setQuickTxPreferenceBoost(cleaned);
    } catch {
      setQuickTxPreferenceBoost({});
    }
  }, [quickTxPreferenceKey]);

  // Handle bootstrap options and resets
  const prevBootstrapOptionsRef = useRef<any>(null);
  const prevDefaultTypeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const bootstrapChanged = JSON.stringify(bootstrapOptions) !== JSON.stringify(prevBootstrapOptionsRef.current);
    const typeChanged = defaultType !== prevDefaultTypeRef.current;

    if (bootstrapChanged || typeChanged || !quickTxHasInitializedRef.current) {
      const today = getLocalTodayISO();
      const fallbackIncomeCategoryId = defaultIncomeCategory?.id ?? incomeCategories[0]?.id ?? "";
      const fallbackExpenseCategoryId =
        smartExpenseSuggestions[0]?.id ??
        mappedExpenseCategories[0]?.id ??
        allExpenseCategories[0]?.id ??
        "";
      const parsedBootstrapAmount = bootstrapOptions?.bootstrapAmount ? parseAmountInput(bootstrapOptions.bootstrapAmount) : null;
      const bootstrapDate = bootstrapOptions?.bootstrapDate ?? null;
      const validBootstrapDate = bootstrapDate && bootstrapDate <= today ? bootstrapDate : today;
      const expectedSalaryDate = getExpectedSalaryDate(data?.current_period?.start, data?.current_period?.end, data?.sweep_status?.income_declared, today);
      const initialDate = (bootstrapOptions?.type ?? defaultType ?? "expense") === "income" ? expectedSalaryDate : validBootstrapDate;

      setQuickTxError(null);
      setQuickTxReminderIdsToMark(
        (bootstrapOptions?.type ?? defaultType ?? "expense") === "income" ? Array.from(new Set(bootstrapOptions?.reminderIdsToMark ?? [])) : []
      );
      setQuickTxStep("form");
      setQuickTxDistributionPreview(null);
      setInlineEnvelopeMapping("");
      setQuickTxMode("standard");
      setMagicInput("");
      setPermanentShift(null);

      if (bootstrapOptions?.editingId) {
        setQuickTxDraft({
          type: bootstrapOptions.type ?? "expense",
          category_id: bootstrapOptions.category_id ?? "",
          amount: bootstrapOptions.amount ?? "",
          occurred_on: bootstrapOptions.occurred_on ?? today,
          description: bootstrapOptions.description ?? "",
        });
      } else {
        setQuickTxDraft({
          type: bootstrapOptions?.type ?? defaultType ?? "expense",
          category_id: (bootstrapOptions?.type ?? defaultType ?? "expense") === "income" ? fallbackIncomeCategoryId : fallbackExpenseCategoryId,
          amount: parsedBootstrapAmount ? parsedBootstrapAmount.toFixed(2) : "",
          occurred_on: initialDate,
          description: "",
        });
      }

      prevBootstrapOptionsRef.current = bootstrapOptions;
      prevDefaultTypeRef.current = defaultType;
      quickTxHasInitializedRef.current = true;
    }
  }, [
    bootstrapOptions,
    defaultType,
    defaultIncomeCategory?.id,
    incomeCategories,
    allExpenseCategories,
    mappedExpenseCategories,
    smartExpenseSuggestions,
    data?.current_period?.start,
    data?.current_period?.end,
    data?.sweep_status?.income_declared
  ]);

  // Auto-select category contextually
  useEffect(() => {
    if (quickTxDraft.type === "income") {
      const currentIsIncome = incomeCategories.some((cat) => cat.id === quickTxDraft.category_id);
      if (!currentIsIncome) {
        const fallbackId = defaultIncomeCategory?.id ?? incomeCategories[0]?.id ?? "";
        if (fallbackId) {
          setQuickTxDraft((prev) => ({ ...prev, category_id: fallbackId }));
        }
      }
      return;
    }
    if (quickTxDraft.category_id && !allExpenseCategories.some((cat) => cat.id === quickTxDraft.category_id)) {
      setQuickTxDraft((prev) => ({
        ...prev,
        category_id: smartExpenseSuggestions[0]?.id ?? mappedExpenseCategories[0]?.id ?? allExpenseCategories[0]?.id ?? "",
      }));
    }
  }, [
    defaultIncomeCategory,
    incomeCategories,
    allExpenseCategories,
    mappedExpenseCategories,
    quickTxDraft.category_id,
    quickTxDraft.type,
    smartExpenseSuggestions,
  ]);

  const quickTxMappedEnvelopeHint = useMemo(() => {
    if (quickTxDraft.type !== "expense" || !quickTxDraft.category_id) return null;
    const mappedEnvelopeId = mappings[quickTxDraft.category_id];
    if (!mappedEnvelopeId) return null;
    const mappedEnvelopeName =
      data?.envelopes.find((item) => item.envelope.id === mappedEnvelopeId)?.envelope.name ??
      "";
    if (!mappedEnvelopeName) return null;
    return copy.quickTxMappedTo(localizeSystemEnvelopeName(mappedEnvelopeName, locale));
  }, [copy, data?.envelopes, locale, mappings, quickTxDraft.category_id, quickTxDraft.type]);

  const quickTxPeriodWarning = useMemo(() => {
    if (!quickTxDraft.occurred_on || !activePeriod) return null;
    const date = quickTxDraft.occurred_on;
    const start = activePeriod.start;
    const end = activePeriod.end;
    const dateLabel = formatLocaleDate(date, locale);
    const startLabel = formatLocaleDate(start, locale);
    const endLabel = formatLocaleDate(end, locale);

    if (date < start) {
      if (quickTxDraft.type === "income") {
        return copy.quickTxBeforePeriod(dateLabel, startLabel, endLabel, periodArrow);
      } else {
        return locale === "ar"
          ? `تنبيه: تاريخ العملية (${dateLabel}) كيرجع لفترة سابقة. هادشي غادي يعاود يحسب الرصيد ديال الفترات اللاحقة.`
          : locale === "fr"
          ? `Attention : la date (${dateLabel}) est dans une période passée. Cela recalculera les soldes des périodes suivantes.`
          : `Warning: the transaction date (${dateLabel}) is in a past period. This will trigger a recalculation of subsequent period balances.`;
      }
    }
    if (date >= end) {
      if (quickTxDraft.type === "income") {
        return copy.quickTxAfterPeriod(dateLabel, startLabel, endLabel, periodArrow);
      } else {
        return locale === "ar"
          ? `تنبيه: تاريخ العملية (${dateLabel}) جاي من بعد الفترة الحالية (${startLabel} ← ${endLabel}).`
          : locale === "fr"
          ? `Attention : la date (${dateLabel}) est après la période actuelle (${startLabel} ← ${endLabel}).`
          : `Warning: the transaction date (${dateLabel}) is after the current period (${startLabel} ← ${endLabel}).`;
      }
    }
    return null;
  }, [activePeriod, copy, locale, periodArrow, quickTxDraft.occurred_on, quickTxDraft.type]);

  const quickTxCompletion = useMemo(() => {
    const checks = [
      quickTxAmountIsValid,
      Boolean(quickTxDraft.occurred_on),
      Boolean(quickTxEffectiveCategoryId),
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [
    quickTxAmountIsValid,
    quickTxEffectiveCategoryId,
    quickTxDraft.occurred_on,
  ]);

  const quickTxAmountAnomalyMessage = useMemo(() => {
    if (
      quickTxDraft.type !== "expense" ||
      !quickTxDraft.category_id ||
      !quickTxAmountParsed
    ) {
      return null;
    }
    const txs = expenseTxByCategory.get(quickTxDraft.category_id) ?? [];
    const values = txs
      .slice(0, 10)
      .map((tx) => Number(tx.amount))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length < 3) return null;
    const usual = median(values);
    if (usual <= 0) return null;
    if (quickTxAmountParsed <= usual * 1.8) return null;
    return copy.quickTxAmountAnomaly(
      formatMoney(quickTxAmountParsed),
      formatMoney(usual)
    );
  }, [
    copy,
    expenseTxByCategory,
    quickTxAmountParsed,
    quickTxDraft.category_id,
    quickTxDraft.type,
  ]);

  const needsFirstIncomeDeclaration = Boolean(
    data?.sweep_bootstrap?.needs_first_income_declaration
  );

  const quickTxIncomeCategoryWarning = useMemo(() => {
    if (quickTxDraft.type !== "income") return null;
    if (!needsFirstIncomeDeclaration) return null;
    if (!quickTxDraft.category_id) return null;
    const cat = categories.find((c) => c.id === quickTxDraft.category_id);
    if (!cat) return null;
    if (!isInternalIncomeCategory(cat.name)) {
      return locale === "ar"
        ? "⚠️ لتفعيل حسابك وميزانيتك، يجب التصريح بالراتب الأساسي (مثل الراتب أو العمل الحر). هذه الفئة لن تقوم بتفعيل الميزانية."
        : locale === "fr"
        ? "⚠️ Pour activer votre compte et votre budget, vous devez déclarer votre revenu principal (comme le salaire ou freelance). Cette catégorie n'activera pas votre budget."
        : "⚠️ To activate your account and budget, you must declare your primary income (like salary or freelance). This category will not activate your budget.";
    }
    return null;
  }, [quickTxDraft.type, quickTxDraft.category_id, needsFirstIncomeDeclaration, categories, locale]);

  const quickTxIncomeExpectedWarning = useMemo(() => {
    if (quickTxDraft.type !== "income") return null;
    if (!quickTxAmountParsed) return null;
    const expectedStr =
      data?.sweep_bootstrap?.expected_income_amount ||
      data?.sweep_bootstrap?.last_income_amount;
    if (!expectedStr) return null;
    const expected = Number(expectedStr);
    if (isNaN(expected) || expected <= 0) return null;
    const currency = data?.user.currency ?? "MAD";
    if (quickTxAmountParsed < expected * 0.5 || quickTxAmountParsed > expected * 2.0) {
      return locale === "ar"
        ? `❓ المبلغ المدخل (${formatMoney(quickTxAmountParsed)} ${currency}) يختلف عن الدخل المتوقع (${formatMoney(expected)} ${currency}). هل أنت متأكد؟`
        : locale === "fr"
        ? `❓ Le montant saisi (${formatMoney(quickTxAmountParsed)} ${currency}) diffère du revenu attendu (${formatMoney(expected)} ${currency}). Confirmez-vous ?`
        : `❓ The entered amount (${formatMoney(quickTxAmountParsed)} ${currency}) differs from your expected income (${formatMoney(expected)} ${currency}). Are you sure?`;
    }
    return null;
  }, [quickTxDraft.type, quickTxAmountParsed, data?.sweep_bootstrap, data?.user.currency, locale]);

  const isEarlyPaydayTriggered = useMemo(() => {
    if (quickTxDraft.type !== "income") return false;
    if (!quickTxDraft.occurred_on || !data?.current_period?.end || !data?.sweep_status?.income_declared) return false;
    if (quickTxDraft.occurred_on >= data.current_period.end) return false;
    const selectedCategoryObj = categories.find(c => c.id === quickTxEffectiveCategoryId);
    if (!selectedCategoryObj) return false;
    return isInternalIncomeCategory(selectedCategoryObj.name);
  }, [quickTxDraft.type, quickTxDraft.occurred_on, data, categories, quickTxEffectiveCategoryId]);

  const quickTxIncomeDateEarlyWarning = useMemo(() => {
    if (quickTxDraft.type !== "income") return null;
    if (isEarlyPaydayTriggered) return null;
    if (!quickTxDraft.occurred_on || !data?.current_period?.end) return null;
    if (quickTxDraft.occurred_on < data.current_period.end) {
      const expectedLabel = formatLocaleDate(data.current_period.end, locale);
      return locale === "ar"
        ? `تنبيه: لقد اخترت تاريخًا قبل تاريخ راتبك المتوقع (${expectedLabel}). قد يؤدي ذلك إلى إنهاء دورتك المالية الحالية مبكرًا وبدء دورة جديدة. من الأفضل تحديد تاريخ راتبك الفعلي.`
        : locale === "fr"
        ? `Attention : vous avez choisi une date antérieure à votre date de salaire attendue (${expectedLabel}). Cela fermera votre période actuelle plus tôt et en commencera une nouvelle. Il est conseillé de mettre la date réelle de votre salaire.`
        : `Warning: you selected a date before your expected salary date (${expectedLabel}). This will close your current period early and start a new one. It is recommended to use your actual salary date.`;
    }
    return null;
  }, [quickTxDraft.type, quickTxDraft.occurred_on, data?.current_period?.end, locale, isEarlyPaydayTriggered]);

  const quickTxPeriodBoundsPreview = useMemo(() => {
    if (quickTxDraft.type !== "income") return null;
    if (!quickTxDraft.occurred_on) return null;
    let pStart = "";
    let pEnd = "";
    if (isEarlyPaydayTriggered) {
      if (permanentShift === null) return null;
      pStart = quickTxDraft.occurred_on;
      if (permanentShift === false) {
        pEnd = data?.current_period?.end || "";
      } else {
        const occurredDate = parseIsoDate(quickTxDraft.occurred_on);
        if (occurredDate) {
          const nextMonthDate = addMonths(occurredDate, 1);
          const yyyy = nextMonthDate.getFullYear();
          const mm = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
          const dd = String(nextMonthDate.getDate()).padStart(2, '0');
          pEnd = `${yyyy}-${mm}-${dd}`;
        }
      }
    } else {
      if (needsFirstIncomeDeclaration) {
        pStart = quickTxDraft.occurred_on;
        pEnd = getNextMonthDatePreview(quickTxDraft.occurred_on);
      } else {
        const anchorDate =
          data?.sweep_bootstrap?.last_income_date ||
          data?.current_period?.start;
        if (anchorDate) {
          const bounds = computeCalendarMonthBounds(anchorDate, quickTxDraft.occurred_on);
          pStart = bounds[0];
          pEnd = bounds[1];
        }
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
  }, [
    quickTxDraft.type,
    quickTxDraft.occurred_on,
    needsFirstIncomeDeclaration,
    data,
    locale,
    isEarlyPaydayTriggered,
    permanentShift
  ]);

  const handleOpenDistributionFromQuickTx = useCallback(() => {
    if (quickTxDraft.type !== "income") return;
    
    let simulatedPoolAmount: number | undefined = undefined;
    if (quickTxDistributionPreview && quickTxDistributionPreview.items) {
      let sum = 0;
      quickTxDistributionPreview.items.forEach((item) => {
        const isGoal = item.target_type === "goal";
        const isDebt = item.target_type === "envelope" && isDebtPoolEnvelope(item.name);
        const isFlex =
          item.target_type === "envelope" && isFlexibilityPoolEnvelope(item.name);

        if (isDebt || isFlex || isGoal) {
          sum += Number(item.amount) || 0;
        }
      });
      if (sum > 0) {
        simulatedPoolAmount = sum;
      }
    }

    try {
      sessionStorage.setItem(
        QUICK_TX_INCOME_RESUME_STORAGE_KEY,
        JSON.stringify({
          draft: quickTxDraft,
          reminderIdsToMark: quickTxReminderIdsToMark,
          dynamicPoolAmount: simulatedPoolAmount,
        })
      );
    } catch {
      // ignore
    }
    router.push("/distribution");
  }, [quickTxDraft, quickTxReminderIdsToMark, router, quickTxDistributionPreview]);

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
      await mutate("/mappings");
      setInlineEnvelopeMapping("");
    } catch (err) {
      toast({
        title: locale === "ar" ? "فشل ربط الفئة" : locale === "fr" ? "Échec de l'association" : "Failed to link category",
        variant: "danger",
      });
    }
  };

  const executeSaveTransaction = async (
    overrideCategoryId?: string,
    overrideAmount?: string,
    overrideOccurredOn?: string,
    overrideDescription?: string
  ) => {
    quickTxSubmitLockRef.current = true;
    setQuickTxSubmitting(true);
    setQuickTxError(null);

    const saveCategoryId = overrideCategoryId || quickTxEffectiveCategoryId;
    const rawAmount = overrideAmount !== undefined ? overrideAmount : quickTxDraft.amount;
    const saveOccurredOn = overrideOccurredOn !== undefined ? overrideOccurredOn : quickTxDraft.occurred_on;
    const saveDescription = overrideDescription !== undefined ? overrideDescription : quickTxDraft.description;

    const amountVal = parseAmountInput(rawAmount);
    if (amountVal === null) {
      quickTxSubmitLockRef.current = false;
      setQuickTxSubmitting(false);
      return;
    }

    try {
      const editingId = bootstrapOptions?.editingId;
      let createdTxId: string | null = null;
      if (editingId) {
        await apiFetch<TransactionOut>(`/transactions/${editingId}`, {
          method: "PATCH",
          body: {
            type: quickTxDraft.type,
            category_id: saveCategoryId,
            amount: amountVal.toFixed(2),
            occurred_on: saveOccurredOn,
            description: saveDescription || undefined,
          },
        });
      } else {
        const created = await apiFetch<TransactionOut>("/transactions", {
          method: "POST",
          body: {
            type: quickTxDraft.type,
            category_id: saveCategoryId,
            amount: amountVal.toFixed(2),
            occurred_on: saveOccurredOn,
            description: saveDescription || undefined,
            permanent_shift: isEarlyPaydayTriggered ? permanentShift : undefined,
          },
        });
        createdTxId = created?.id ?? null;
      }
      if (quickTxDraft.type === "income" && quickTxReminderIdsToMark.length > 0) {
        await Promise.all(
          quickTxReminderIdsToMark.map((reminderId) =>
            apiFetch<IncomeReminderOut>(
              `/income-reminders/${reminderId}/mark-declared`,
              { method: "POST" }
            )
          )
        );
      }
      // The preview step promises the user the split it just showed them, so
      // apply it now that the income is recorded. This is idempotent per
      // transaction: if the account auto-distributes on the server, this call
      // matches the existing run and does nothing — no flag check needed.
      let distributionError: string | null = null;
      let distributionWarnings: string[] = [];
      if (
        quickTxDraft.type === "income" &&
        !editingId &&
        createdTxId &&
        quickTxDistributionPreview
      ) {
        try {
          const applyResult = await applyDistribution({
            transaction_id: createdTxId,
            use_cash_available: false,
          });
          distributionWarnings = applyResult.warnings ?? [];
        } catch (err) {
          distributionError = err instanceof Error ? err.message : String(err);
        }
      }

      if (distributionError) {
        // The income is saved either way; say so plainly and name the part
        // that did not go through, so the split is not silently skipped.
        toast({
          title:
            locale === "ar"
              ? "تسجل الدخل، ولكن التوزيع ما تطبقش"
              : locale === "en"
              ? "Income saved, but the split was not applied"
              : "Revenu enregistré, mais la répartition n'a pas été appliquée",
          description:
            (locale === "ar"
              ? "جرب تطبق التوزيع من صفحة التوزيع. التفاصيل: "
              : locale === "en"
              ? "Apply the distribution from the distribution page. Details: "
              : "Applique la répartition depuis la page de répartition. Détail : ") +
            distributionError,
          variant: "danger",
        });
      } else if (distributionWarnings.length > 0) {
        // Income + split both went through, but the server capped or adjusted
        // something (cash below the declared income, % over 100…). Say so
        // instead of a plain success that hides it.
        toast({
          title:
            locale === "ar"
              ? "تسجل الدخل والتوزيع، مع بعض الملاحظات"
              : locale === "en"
              ? "Income and split saved, with some notes"
              : "Revenu et répartition enregistrés, avec des remarques",
          description: distributionWarnings.join(" · "),
          variant: "default",
        });
      } else {
        toast({
          title:
            quickTxDraft.type === "income"
              ? copy.quickTxSavedIncome
              : copy.quickTxSavedExpense,
          variant: "success",
        });
      }
      if (quickTxDraft.type === "expense" && quickTxPreferenceKey) {
        setQuickTxPreferenceBoost((prev) => {
          const next = {
            ...prev,
            [saveCategoryId]: (prev[saveCategoryId] ?? 0) + 1,
          };
          try {
            localStorage.setItem(quickTxPreferenceKey, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }

      // Reset Draft form values after success
      const freshToday = getLocalTodayISO();
      const freshExpectedSalaryDate = getExpectedSalaryDate(data?.current_period?.start, data?.current_period?.end, data?.sweep_status?.income_declared, freshToday);
      const freshIncomeCategory = defaultIncomeCategory?.id ?? incomeCategories[0]?.id ?? "";
      const freshExpenseCategory =
        smartExpenseSuggestions[0]?.id ??
        mappedExpenseCategories[0]?.id ??
        allExpenseCategories[0]?.id ??
        "";

      setQuickTxDraft({
        type: defaultType,
        category_id: defaultType === "income" ? freshIncomeCategory : freshExpenseCategory,
        amount: "",
        occurred_on: defaultType === "income" ? freshExpectedSalaryDate : freshToday,
        description: "",
      });

      setQuickTxStep("form");
      setQuickTxDistributionPreview(null);
      setQuickTxReminderIdsToMark([]);
      setInlineEnvelopeMapping("");
      setPermanentShift(null);
      setMagicInput("");
      setQuickTxMode("standard");
      predictedCategoryNameRef.current = null;

      await loadData();
      
      onSuccess?.();

      if (quickTxDraft.type === "income") {
        router.refresh();
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("floussy:data-updated"));
      }
    } catch (err) {
      setQuickTxError(
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "detail" in err
          ? String((err as any).detail)
          : copy.quickTxUnknownError
      );
    } finally {
      quickTxSubmitLockRef.current = false;
      setQuickTxSubmitting(false);
      setAiWarning(null);
    }
  };

  const handleSubmitQuickTransaction = async () => {
    // The ref blocks a second submit while one is in flight, and the submitting
    // flag is raised alongside it. Finding the ref engaged while nothing is in
    // flight means the pair has drifted - the ref outlived its request - and
    // obeying it would swallow every later click without a word, leaving a
    // button that looks alive and does nothing. The flag is the honest one, so
    // clear the stale ref and let the submit through.
    if (quickTxSubmitLockRef.current) {
      if (quickTxSubmitting) return;
      quickTxSubmitLockRef.current = false;
    }
    setQuickTxError(null);

    let effectiveAmount = quickTxDraft.amount;
    let effectiveCategoryId = quickTxEffectiveCategoryId;
    let effectiveOccurredOn = quickTxDraft.occurred_on;
    let effectiveDescription = quickTxDraft.description;

    if (quickTxMode === "magic" && quickTxDraft.type === "expense") {
      if (!nlpPrediction || nlpPrediction.amount === null || !resolvedCategoryId) {
        setQuickTxError(
          locale === "ar"
            ? "⚠️ ما قدرناش نحددو المبلغ ولا الفئة من النص ديالك. عافاك تأكد من الكتابة أولاً."
            : locale === "fr"
            ? "⚠️ Impossible de détecter le montant ou la catégorie de votre texte. Veuillez vérifier votre saisie."
            : "⚠️ Unable to detect amount or category from your text. Please verify your input."
        );
        return;
      }
      effectiveAmount = String(nlpPrediction.amount);
      effectiveCategoryId = resolvedCategoryId;
      effectiveOccurredOn = nlpPrediction.date || getLocalTodayISO();
      effectiveDescription = resolvedDescription;

      // Sync React state immediately
      setQuickTxDraft({
        type: "expense",
        amount: effectiveAmount,
        category_id: effectiveCategoryId,
        occurred_on: effectiveOccurredOn,
        description: effectiveDescription,
      });
      predictedCategoryNameRef.current = resolvedCategoryName;

    }

    const rawAmount = effectiveAmount;
    if (!rawAmount || !rawAmount.trim()) {
      setQuickTxError(
        locale === "ar"
          ? "الرجاء إدخال المبلغ."
          : locale === "fr"
          ? "Veuillez saisir un montant."
          : "Please enter an amount."
      );
      return;
    }
    const amount = parseAmountInput(rawAmount);
    if (amount === null) {
      const digitsNormalized = normalizeDigits(rawAmount);
      const cleaned = digitsNormalized.trim().replace(/\s+/g, "").replace(/[^\d,.-]/g, "");
      const parsedNum = Number(cleaned.replace(",", "."));
      if (Number.isFinite(parsedNum) && parsedNum <= 0) {
        setQuickTxError(
          locale === "ar"
            ? "المبلغ يجب أن يكون أكبر من 0."
            : locale === "fr"
            ? "Le montant doit être strictement supérieur à 0."
            : "Amount must be strictly greater than 0."
        );
      } else {
        setQuickTxError(
          locale === "ar"
            ? "الرجاء إدخال مبلغ صالح."
            : locale === "fr"
            ? "Veuillez saisir un montant valide."
            : "Please enter a valid amount."
        );
      }
      return;
    }

    if (!effectiveCategoryId) {
      setQuickTxError(
        locale === "ar"
          ? "يرجى اختيار الفئة."
          : locale === "fr"
          ? "Veuillez sélectionner une catégorie."
          : "Please select a category."
      );
      return;
    }

    if (!effectiveOccurredOn) {
      setQuickTxError(
        locale === "ar"
          ? "يرجى اختيار التاريخ."
          : locale === "fr"
          ? "Veuillez sélectionner une date."
          : "Please select a date."
      );
      return;
    }

    const today = getLocalTodayISO();
    if (effectiveOccurredOn > today) {
      setQuickTxError(
        locale === "ar"
          ? "لا يمكن أن يكون التاريخ في المستقبل."
          : locale === "fr"
          ? "La date ne peut pas être dans le futur."
          : "Date cannot be in the future."
      );
      return;
    }

    const needsFirstIncome = data?.sweep_bootstrap?.needs_first_income_declaration;
    if (needsFirstIncome) {
      if (quickTxDraft.type === "expense") {
        setQuickTxError(
          locale === "ar"
            ? "يرجى التصريح بالدخل الأول أولاً لتفعيل حسابك وتحديد دوراتك المالية."
            : locale === "fr"
            ? "Veuillez déclarer votre premier revenu d'abord afin d'activer votre compte."
            : "Please declare your first income first to activate your account."
        );
        return;
      }
      const selectedCategoryObj = quickTxCategories.find(c => c.id === effectiveCategoryId);
      if (selectedCategoryObj && !isInternalIncomeCategory(selectedCategoryObj.name)) {
        setQuickTxError(
          locale === "ar"
            ? "لتفعيل حسابك, يجب أن يكون دخلك الأول هو دخلك الرئيسي (الراتب, إلخ)."
            : locale === "fr"
            ? "Pour activer votre compte, votre premier revenu doit être votre revenu principal (Salaire, etc.)."
            : "To activate your account, your first income must be your primary income (Salary, etc.)."
        );
        return;
      }
    }

    if (!needsFirstIncome && activePeriod?.start && effectiveOccurredOn < activePeriod.start) {
      setQuickTxError(
        locale === "ar"
          ? `لا يمكن أن يكون تاريخ المعاملة قبل بداية الفترة الحالية (${activePeriod.start}).`
          : locale === "fr"
          ? `La date de la transaction ne peut pas être antérieure au début de la période en cours (${activePeriod.start}).`
          : `The transaction date cannot be before the start of the active period (${activePeriod.start}).`
      );
      return;
    }

    if (quickTxDraft.type === "expense" && !mappings[effectiveCategoryId]) {
      setQuickTxError(
        locale === "ar"
          ? "⚠️ هاد الفئة ما مربوطاش بـ حتى ظرف. استخدم القائمة أعلاه باش تربطها بظرف أولاً, تم قيد المصروف."
          : locale === "fr"
          ? "⚠️ Cette catégorie n'est liée à aucune enveloppe. Utilisez le sélecteur ci-dessus pour l'associer à une enveloppe, puis réessayez."
          : "⚠️ This category is not linked to any envelope. Use the selector above to link it first, then submit."
      );
      return;
    }

    if (isEarlyPaydayTriggered && permanentShift === null) {
      setQuickTxError(
        locale === "ar"
          ? "الرجاء تحديد ما إذا كان تغيير تاريخ الراتب مؤقتًا أو دائمًا."
          : locale === "fr"
          ? "Veuillez préciser si le changement de date de salaire est temporaire ou permanent."
          : "Please specify if the salary date change is temporary or permanent."
      );
      return;
    }

    // AI validation check if it's an expense
    const finalCategoryObj = categories.find(c => c.id === effectiveCategoryId);
    const finalCategoryName = finalCategoryObj ? finalCategoryObj.name : "";
    const needsAiVerification =
      quickTxDraft.type === "expense" &&
      (predictedCategoryNameRef.current === null ||
        predictedCategoryNameRef.current.toLowerCase() !== finalCategoryName.toLowerCase());

    if (needsAiVerification) {
      setIsAiVerifying(true);
      try {
        const availableCategoriesList = allExpenseCategories.map(c => c.name);
        const verifyRes = await apiFetch<{
          is_coherent: boolean;
          explanation: string | null;
          suggested_category: string | null;
        }>("/ai/verify-category", {
          method: "POST",
          body: {
            description: effectiveDescription || finalCategoryName,
            amount: amount,
            selected_category: finalCategoryName,
            available_categories: availableCategoriesList,
          },
        });

        if (!verifyRes.is_coherent) {
          setAiWarning({
            explanation: verifyRes.explanation || "La catégorie sélectionnée semble incohérente avec la description de la dépense.",
            suggestedCategory: verifyRes.suggested_category,
            pendingSaveAction: async (overrideId?: string) => {
              await executeSaveTransaction(
                overrideId || effectiveCategoryId,
                effectiveAmount,
                effectiveOccurredOn,
                effectiveDescription
              );
            },
          });
          setIsAiVerifying(false);
          return;
        }
      } catch (err) {
        console.error("AI Category Verification failed. Performing silent fallback bypass.", err);
      } finally {
        setIsAiVerifying(false);
      }
    }

    if (quickTxDraft.type === "income" && quickTxStep === "form") {
      quickTxSubmitLockRef.current = true;
      setQuickTxSubmitting(true);
      try {
        const preview = await apiFetch<DistributionSimulateOut>("/distribution/simulate", {
          method: "POST",
          body: {
            income_amount: amount.toFixed(2),
            use_cash_available: false,
            occurred_on: effectiveOccurredOn,
          },
        });
        setQuickTxDistributionPreview(preview);
        setQuickTxStep("income_preview");
      } catch (err) {
        setQuickTxError(
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "detail" in err
            ? String((err as any).detail)
            : copy.quickTxUnknownError
        );
      } finally {
        quickTxSubmitLockRef.current = false;
        setQuickTxSubmitting(false);
      }
      return;
    }

    await executeSaveTransaction(
      effectiveCategoryId,
      effectiveAmount,
      effectiveOccurredOn,
      effectiveDescription
    );
  };

  const handleQuickTxEnter = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (!quickTxCanSubmit || quickTxSubmitting) return;
    event.preventDefault();
    void handleSubmitQuickTransaction();
  };

  const handleAmountChange = (val: string) => {
    const converted = normalizeDigits(val);
    let cleaned = converted.replace(/[^\d,.-]/g, "");
    const parts = cleaned.split(/[.,]/);
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }
    setQuickTxDraft((prev) => ({ ...prev, amount: cleaned }));
  };

  const handleCancelClick = () => {
    setQuickTxMode("standard");
    setMagicInput("");
    setQuickTxError(null);
    setQuickTxStep("form");
    setQuickTxDistributionPreview(null);
    setQuickTxReminderIdsToMark([]);
    setInlineEnvelopeMapping("");
    setPermanentShift(null);
    onCancel?.();
  };

  // On the income preview this same button reads "back to edit", but it ran
  // the cancel path, and the modal wires cancel to closing itself - so going
  // back threw the whole entry away and the amount, date and salary-shift
  // choice had to be typed again. Stepping back now only steps back.
  const handleBackOrCancel = () => {
    if (quickTxDraft.type === "income" && quickTxStep === "income_preview") {
      setQuickTxStep("form");
      setQuickTxDistributionPreview(null);
      setQuickTxError(null);
      return;
    }
    handleCancelClick();
  };

  return (
    <div className={`quick-tx-form-container relative w-full transition-all duration-300 ${isInline ? "max-w-xl mx-auto border border-white/70 shadow-lg rounded-3xl p-6 bg-gradient-to-br dark:border-slate-800 " + (quickTxDraft.type === "expense" ? "from-red-50/50 via-rose-50/50 to-orange-50/50 dark:from-slate-900/60 dark:via-rose-950/5 dark:to-orange-950/5" : "from-emerald-50/50 via-teal-50/50 to-cyan-50/50 dark:from-slate-900/60 dark:via-emerald-950/5 dark:to-cyan-950/5") : "bg-transparent p-0"}`}>
      
      {/* Header section (pulse icon + titles) */}
      <div className="mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-[var(--ink)]">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-bold animate-[pulse_2.2s_ease-in-out_infinite] transition-colors duration-300 ${quickTxDraft.type === "expense" ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200" : "bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"}`}>
            {quickTxDraft.type === "income" ? "＋" : "−"}
          </span>
          {copy.quickTxTitle}
        </h3>
        <p className="text-xs text-[var(--muted)] mt-1">{copy.quickTxDescription}</p>
      </div>

      <div className="grid gap-4 quick-tx-fadein">
        {quickTxDraft.type === "income" ? (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 transition-opacity ${quickTxStep !== "income_preview" ? "opacity-100" : "opacity-50"}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${quickTxStep !== "income_preview" ? "bg-emerald-500 text-white shadow-sm" : "bg-emerald-200 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300"}`}>١</div>
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                {locale === "ar" ? "الإدخال" : locale === "en" ? "Input" : "Saisie"}
              </span>
            </div>
            <div className="flex-1 h-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500 ${quickTxStep === "income_preview" ? "w-full" : "w-0"}`} />
            </div>
            <div className={`flex items-center gap-1.5 transition-opacity ${quickTxStep === "income_preview" ? "opacity-100" : "opacity-40"}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${quickTxStep === "income_preview" ? "bg-emerald-500 text-white shadow-sm" : "bg-emerald-100 text-emerald-400 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800"}`}>٢</div>
              <span className={`text-xs font-medium whitespace-nowrap ${quickTxStep === "income_preview" ? "text-emerald-800 dark:text-emerald-300" : "text-[var(--muted)]"}`}>
                {locale === "ar" ? "معاينة التوزيع" : locale === "en" ? "Distribution" : "Répartition"}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>{copy.quickTxProgressLabel}</span>
              <span>{quickTxCompletion}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-400 via-rose-500 to-orange-400 transition-all duration-500"
                style={{ width: `${quickTxCompletion}%` }}
                role="progressbar"
                aria-label={copy.quickTxProgressLabel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={quickTxCompletion}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-1">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm transition ${
              quickTxDraft.type === "income"
                ? "bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 font-semibold text-emerald-800 dark:text-emerald-200 shadow-sm quick-tx-tab-active ring-1 ring-emerald-200 dark:ring-emerald-800"
                : "text-[var(--muted)] hover:bg-[var(--surface)]/70 hover:-translate-y-0.5"
            }`}
            onClick={() => {
              const today = getLocalTodayISO();
              const expectedSalaryDate = getExpectedSalaryDate(data?.current_period?.start, data?.current_period?.end, data?.sweep_status?.income_declared, today);
              setQuickTxDraft((prev) => {
                const nextDate = prev.occurred_on === today ? expectedSalaryDate : prev.occurred_on;
                return {
                  ...prev,
                  type: "income",
                  category_id: defaultIncomeCategory?.id ?? incomeCategories[0]?.id ?? "",
                  occurred_on: nextDate,
                };
              });
            }}
            disabled={quickTxSubmitting}
          >
            {copy.quickTxIncomeTab}
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm transition ${
              quickTxDraft.type === "expense"
                ? "bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-950 dark:to-rose-950 font-semibold text-red-800 dark:text-red-200 shadow-sm quick-tx-tab-active ring-1 ring-red-200 dark:ring-red-800"
                : "text-[var(--muted)] hover:bg-[var(--surface)]/70 hover:-translate-y-0.5"
            }`}
            onClick={() => {
              const today = getLocalTodayISO();
              const expectedSalaryDate = getExpectedSalaryDate(data?.current_period?.start, data?.current_period?.end, data?.sweep_status?.income_declared, today);
              setQuickTxDraft((prev) => {
                const nextDate = prev.occurred_on === expectedSalaryDate ? today : prev.occurred_on;
                return {
                  ...prev,
                  type: "expense",
                  category_id: smartExpenseSuggestions[0]?.id ?? mappedExpenseCategories[0]?.id ?? allExpenseCategories[0]?.id ?? "",
                  occurred_on: nextDate,
                };
              });
            }}
            disabled={quickTxSubmitting}
          >
            {copy.quickTxExpenseTab}
          </button>
        </div>

        {quickTxDraft.type === "expense" && (
          <div className="grid gap-2">
            {quickTxFrequentTxs.length > 0 ? (
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  {locale === "ar" ? "⚡ دائماً بتقيدهم" : locale === "fr" ? "⚡ Fréquents" : "⚡ Frequent"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuickTxMode((m) => m === "magic" ? "standard" : "magic");
                    setMagicInput("");
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                    quickTxMode === "magic"
                      ? "border-violet-400 bg-violet-500 text-white shadow-md"
                      : "border-violet-200 bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                  }`}
                  disabled={quickTxSubmitting}
                >
                  ✨ {locale === "ar" ? "إدخال سحري" : locale === "fr" ? "Saisie Magique" : "Magic Input"}
                </button>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setQuickTxMode((m) => m === "magic" ? "standard" : "magic");
                    setMagicInput("");
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                    quickTxMode === "magic"
                      ? "border-violet-400 bg-violet-500 text-white shadow-md"
                      : "border-violet-200 bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                  }`}
                  disabled={quickTxSubmitting}
                >
                  ✨ {locale === "ar" ? "إدخال سحري" : locale === "fr" ? "Saisie Magique" : "Magic Input"}
                </button>
              </div>
            )}
            {quickTxFrequentTxs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quickTxFrequentTxs.map((tx) => {
                  const catName = categories.find(c => c.id === tx.category_id)?.name ?? "";
                  const isSelected =
                    quickTxDraft.category_id === tx.category_id &&
                    quickTxDraft.amount === Number(tx.amount).toFixed(2) &&
                    (quickTxDraft.description || "") === (tx.description || "");
                  return (
                    <button
                      key={`${tx.category_id}-${tx.amount}-${tx.description}`}
                      type="button"
                      className={`quick-tx-chip inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition-all shadow-sm ${
                        isSelected
                          ? "border-red-400 bg-red-500 text-white scale-105 shadow-md"
                          : "border-red-100 bg-white dark:bg-slate-800 text-red-700 dark:text-red-300 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:shadow"
                      }`}
                      onClick={() => {
                        setQuickTxDraft((prev) => ({
                          ...prev,
                          category_id: tx.category_id,
                          amount: Number(tx.amount).toFixed(2),
                          description: tx.description || "",
                        }));
                        setQuickTxMode("standard");
                      }}
                      disabled={quickTxSubmitting}
                    >
                      {isSelected && <span className="text-[10px]">✓</span>}
                      <span>{localizeCategoryName(catName, locale)}</span>
                      <span className="font-bold">{Number(tx.amount).toLocaleString()}</span>
                      <span className="opacity-60 text-[10px]">{data?.user.currency ?? "MAD"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(quickTxDraft.type !== "income" || quickTxStep === "form") ? (
          <>
            {quickTxMode === "magic" && quickTxDraft.type === "expense" ? (
              <div className="grid gap-4 animate-fadeIn">
                <style>{`
                  @keyframes laser-scan {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                  }
                  .animate-laser-scan {
                    animation: laser-scan 1.5s ease-in-out infinite;
                  }
                  @keyframes text-shine {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                  }
                  .animate-text-shine {
                    background-size: 200% auto;
                    animation: text-shine 2.5s linear infinite;
                  }
                  @keyframes card-fade-in {
                    from { opacity: 0; transform: translateY(10px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                  }
                  .animate-card-fade-in {
                    animation: card-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                  }
                  @keyframes sparkle-pulse {
                    0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
                    50% { transform: scale(1.2) rotate(12deg); opacity: 1; }
                  }
                  .animate-sparkle-pulse {
                    animation: sparkle-pulse 2s ease-in-out infinite;
                  }
                `}</style>

                <div className="relative group">
                  {/* Ambient Glow Aura */}
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 blur-xl opacity-75 group-focus-within:opacity-100 transition duration-500 pointer-events-none" />
                  
                  {/* Prompt Bar Glass Container */}
                  <div className="relative flex items-center rounded-2xl border border-violet-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md transition-all duration-300 focus-within:ring-2 focus-within:ring-violet-500/50 focus-within:border-transparent focus-within:shadow-[0_0_20px_rgba(139,92,246,0.15)] pr-3">
                    <textarea
                      autoFocus
                      rows={2}
                      value={magicInput}
                      onChange={(e) => setMagicInput(e.target.value)}
                      placeholder={
                        locale === "ar"
                          ? "مثال: 50 درهم طاكسي للمدينة، 120 مارجان البارحة..."
                          : locale === "fr"
                          ? "Ex: 50dh taxi pour anfa, 120dh marjane hier..."
                          : "Ex: 50dh taxi for downtown, 120dh groceries yesterday..."
                      }
                      className="w-full rounded-2xl bg-transparent px-4 py-3.5 text-sm focus:outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
                      disabled={quickTxSubmitting}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (nlpPrediction && nlpPrediction.amount !== null && resolvedCategoryId) {
                            setQuickTxDraft((prev) => ({
                              ...prev,
                              amount: String(nlpPrediction.amount),
                              category_id: resolvedCategoryId,
                              occurred_on: nlpPrediction.date || getLocalTodayISO(),
                              description: resolvedDescription,
                            }));
                            predictedCategoryNameRef.current = resolvedCategoryName;
                            setQuickTxMode("standard");
                            setMagicInput("");

                          }
                        }
                      }}
                    />
                    <div className="flex items-center justify-center p-2 text-violet-500 dark:text-violet-400 select-none animate-sparkle-pulse">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" />
                        <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {isNlpLoading && (
                  <div className="space-y-2 py-2">
                    <div className="h-1 w-full bg-violet-100 dark:bg-violet-950/40 rounded-full overflow-hidden relative">
                      <div className="absolute h-full w-1/4 bg-gradient-to-r from-transparent via-violet-500 to-transparent animate-laser-scan" />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="animate-pulse text-sm select-none">✨</span>
                      <span className="text-xs font-semibold bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-600 dark:from-violet-400 dark:via-purple-300 dark:to-indigo-400 bg-clip-text text-transparent animate-text-shine">
                        {locale === "ar" ? "جاري تحليل المعطيات بالذكاء الاصطناعي..." : locale === "fr" ? "Analyse intelligente en cours..." : "AI cognitive analysis in progress..."}
                      </span>
                    </div>
                  </div>
                )}

                {nlpPrediction ? (
                  <div className={`rounded-2xl border p-4 space-y-4 backdrop-blur-md transition-all duration-300 shadow-md ${
                    nlpPrediction.amount !== null && resolvedCategoryId
                      ? "border-violet-200/80 dark:border-violet-800/80 bg-gradient-to-br from-violet-50/50 to-indigo-50/30 dark:from-violet-950/10 dark:to-indigo-950/5"
                      : "border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-slate-50/50 to-slate-100/30 dark:from-slate-900/20 dark:to-slate-900/5"
                  }`}>
                    <div className="flex items-center justify-between border-b border-violet-100/50 dark:border-slate-800/50 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-violet-500 select-none animate-sparkle-pulse">✨</span>
                        <span className="text-xs font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                          {locale === "ar" ? "المعاينة السحرية بالذكاء الاصطناعي" : locale === "fr" ? "Aperçu IA Saisie Magique" : "Magic AI Preview"}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                        {locale === "ar" ? "تلقائي" : locale === "fr" ? "Auto" : "Auto"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Amount Card */}
                      <div 
                        style={{ animationDelay: '0ms' }}
                        className="opacity-0 animate-card-fade-in flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm hover:shadow transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                          <span className="text-xs select-none">💰</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider">
                            {locale === "ar" ? "المبلغ" : locale === "fr" ? "Montant" : "Amount"}
                          </span>
                        </div>
                        <span className={`font-extrabold text-sm tracking-tight ${
                          nlpPrediction.amount !== null 
                            ? "text-red-600 dark:text-red-400 bg-red-500/5 dark:bg-red-500/10 px-2 py-0.5 rounded-lg inline-block w-fit" 
                            : "text-slate-400 dark:text-slate-500 italic text-xs"
                        }`}>
                          {nlpPrediction.amount !== null
                            ? `${nlpPrediction.amount.toLocaleString()} ${data?.user.currency ?? "MAD"}`
                            : (locale === "ar" ? "غير محدد" : locale === "fr" ? "Non détecté" : "Not detected")}
                        </span>
                      </div>

                      {/* Category Card */}
                      <div 
                        style={{ animationDelay: '75ms' }}
                        className="opacity-0 animate-card-fade-in flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm hover:shadow transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                          <span className="text-xs select-none">🏷️</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider">
                            {locale === "ar" ? "الفئة" : locale === "fr" ? "Catégorie" : "Category"}
                          </span>
                        </div>
                        <span className={`font-semibold text-xs truncate max-w-full ${
                          resolvedCategoryName 
                            ? "text-slate-800 dark:text-slate-200 bg-violet-500/5 dark:bg-violet-500/10 px-2 py-0.5 rounded-lg inline-block w-fit" 
                            : "text-slate-400 dark:text-slate-500 italic text-xs"
                        }`}>
                          {resolvedCategoryName
                            ? localizeCategoryName(resolvedCategoryName, locale)
                            : (locale === "ar" ? "غير محدد" : locale === "fr" ? "Non détecté" : "Not detected")}
                        </span>
                      </div>

                      {/* Date Card */}
                      <div 
                        style={{ animationDelay: '150ms' }}
                        className="opacity-0 animate-card-fade-in flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm hover:shadow transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                          <span className="text-xs select-none">📅</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider">
                            {locale === "ar" ? "التاريخ" : locale === "fr" ? "Date" : "Date"}
                          </span>
                        </div>
                        <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                          {nlpPrediction.date ? formatLocaleDate(nlpPrediction.date, locale) : "—"}
                        </span>
                      </div>

                      {/* Description Card */}
                      <div 
                        style={{ animationDelay: '225ms' }}
                        className="opacity-0 animate-card-fade-in flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm hover:shadow transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                          <span className="text-xs select-none">💬</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider">
                            {locale === "ar" ? "الوصف" : locale === "fr" ? "Description" : "Description"}
                          </span>
                        </div>
                        <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 truncate" title={resolvedDescription}>
                          {resolvedDescription || "—"}
                        </span>
                      </div>
                    </div>

                    {activeNeedsDisambiguation && activeSuggestedCategories.length > 0 && (
                      <div className="border-t border-violet-100/50 dark:border-slate-800/80 pt-3 space-y-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1">
                          <span className="select-none">🔍</span>
                          <span>
                            {locale === "ar"
                              ? "اختر الفئة المناسبة:"
                              : locale === "fr"
                              ? "Choisissez la catégorie appropriée :"
                              : "Choose the appropriate category:"}
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {activeSuggestedCategories.map((catName) => {
                            const isSelected = selectedDisambiguationCategoryName === catName;
                            return (
                              <button
                                key={catName}
                                type="button"
                                onClick={() => {
                                  setSelectedDisambiguationCategoryName(catName);
                                  setQuickTxError(null);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5 ${
                                  isSelected
                                    ? "border-violet-500 bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)] scale-[1.03]"
                                    : "border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 hover:shadow-sm"
                                }`}
                              >
                                {isSelected && <span className="text-[10px] font-bold">✓</span>}
                                <span>{localizeCategoryName(catName, locale)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {nlpPrediction.amount !== null && resolvedCategoryId && (
                      <div className="pt-2">
                        <button
                          type="button"
                          className="w-full rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white text-xs font-bold py-3 transition-all duration-200 shadow-md hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] active:scale-[0.98] flex items-center justify-center gap-1.5"
                          onClick={() => {
                            setQuickTxDraft((prev) => ({
                              ...prev,
                              amount: String(nlpPrediction.amount),
                              category_id: resolvedCategoryId,
                              occurred_on: nlpPrediction.date || getLocalTodayISO(),
                              description: resolvedDescription,
                            }));
                            predictedCategoryNameRef.current = resolvedCategoryName;
                            setQuickTxMode("standard");
                            setMagicInput("");
                          }}
                          disabled={quickTxSubmitting}
                        >
                          <span>{locale === "ar" ? "حفظ وتأكيد المصروف" : locale === "fr" ? "Confirmer et remplir" : "Confirm & Fill Form"}</span>
                        </button>
                      </div>
                    )}

                    {(nlpPrediction.amount === null || !resolvedCategoryId) && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-start gap-2">
                        <span className="text-sm select-none">💡</span>
                        <p className="text-xs font-medium leading-relaxed">
                          {locale === "ar"
                            ? "اكتب المبلغ (مثال: 50 درهم) والنوع (مثال: طاكسي) لتفعيل التعبئة التلقائية."
                            : locale === "fr"
                            ? "Précisez le montant (ex: 50dh) et le type (ex: taxi) pour activer le remplissage automatique."
                            : "Add amount (e.g. 50dh) and type (e.g. taxi) to enable auto-fill."}
                        </p>
                      </div>
                    )}
                  </div>
                ) : !isNlpLoading && (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 dark:text-slate-500 bg-slate-500/5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80 p-4">
                    <span className="text-2xl mb-1.5 animate-pulse select-none">✨</span>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {locale === "ar" ? "مساعد الإدخال السحري بالذكاء الاصطناعي" : locale === "fr" ? "Assistant de Saisie Magique IA" : "AI Magic Input Assistant"}
                    </p>
                    <p className="text-[11px] leading-relaxed max-w-[250px] text-slate-400 dark:text-slate-500">
                      {locale === "ar"
                        ? "اكتب وصف مصروفك بالدارجة أو بالفرنسية وسيقوم النظام بتحديد المبلغ والفئة تلقائياً."
                        : locale === "fr"
                        ? "Décrivez votre dépense en français ou en darija. Le système détectera automatiquement le montant et la catégorie."
                        : "Describe your expense in French or Moroccan Darija. The AI will automatically extract the amount and category."}
                    </p>
                  </div>
                )}

                {quickTxError ? (
                  <Alert tone="error">
                    <AlertDescription>{quickTxError}</AlertDescription>
                  </Alert>
                ) : null}

                <button
                  type="button"
                  onClick={() => { setQuickTxMode("standard"); setMagicInput(""); }}
                  className="text-xs text-center text-[var(--muted)] hover:text-[var(--ink)] underline transition-colors"
                >
                  {locale === "ar" ? "← الرجوع للنموذج" : locale === "fr" ? "← Retour au formulaire" : "← Back to form"}
                </button>
              </div>
            ) : null}

            {quickTxMode === "standard" || quickTxDraft.type === "income" ? (
              <>
                {quickTxDraft.type === "expense" && smartExpenseSuggestions.length > 0 && quickTxFrequentTxs.length === 0 ? (
                  <div className="grid gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-500">{copy.quickTxSmartCategories}</p>
                    <div className="flex flex-wrap gap-2">
                      {smartExpenseSuggestions.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className={`quick-tx-chip inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            quickTxDraft.category_id === category.id
                              ? "border-red-400 bg-red-500 text-white shadow-md scale-105"
                              : "border-red-200 bg-white text-red-700 dark:bg-slate-800 dark:text-red-300 hover:border-red-400 hover:bg-red-50 hover:shadow-sm"
                          }`}
                          onClick={() => handleCategoryChange(category.id)}
                        >
                          {quickTxDraft.category_id === category.id && (
                            <span className="text-[10px]">✓</span>
                          )}
                          {localizeCategoryName(category.name, locale)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2 text-center">
                  <Label htmlFor="quick-tx-amount" className={`text-xs font-semibold uppercase tracking-wider ${quickTxDraft.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                    {copy.quickTxAmount}
                  </Label>
                  <div className="relative">
                    <input
                      id="quick-tx-amount"
                      value={quickTxDraft.amount}
                      onKeyDown={handleQuickTxEnter}
                      onChange={(event) => handleAmountChange(event.target.value)}
                      placeholder="0.00"
                      inputMode="decimal"
                      className={`w-full rounded-2xl border-2 bg-white/80 dark:bg-slate-900/80 px-4 py-4 text-center text-4xl font-bold tracking-tight focus:outline-none focus:ring-4 transition-all duration-200 ${
                        Number(quickTxDraft.amount) > 0 
                          ? quickTxDraft.type === "income"
                            ? "border-emerald-400 text-emerald-800 dark:text-emerald-200 focus:ring-emerald-100 dark:focus:ring-emerald-950/30"
                            : "border-red-400 text-red-800 dark:text-red-200 focus:ring-red-100 dark:focus:ring-red-950/30"
                          : "border-slate-200 dark:border-slate-800 text-[var(--muted)] focus:border-slate-300 focus:ring-slate-50"
                      }`}
                      disabled={quickTxSubmitting}
                    />
                    <span className={`pointer-events-none absolute bottom-3 right-4 text-sm font-medium ${quickTxDraft.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                      {data?.user.currency ?? "MAD"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{copy.quickTxSuggestedAmounts}</p>
                  <div className="flex flex-wrap gap-2">
                    {quickTxAmountSuggestions.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`quick-tx-chip inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                          quickTxDraft.type === "expense"
                            ? Number(quickTxDraft.amount) === value
                              ? "border-red-400 bg-red-500 text-white shadow-md"
                              : "border-red-200 bg-white text-red-700 dark:bg-slate-800 dark:text-red-300 hover:border-red-400 hover:bg-red-50 hover:shadow-sm"
                            : Number(quickTxDraft.amount) === value
                            ? "border-emerald-400 bg-emerald-500 text-white shadow-md"
                            : "border-emerald-200 bg-white text-emerald-700 dark:bg-slate-800 dark:text-emerald-300 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm"
                        }`}
                        onClick={() =>
                          setQuickTxDraft((prev) => ({
                            ...prev,
                            amount: value.toFixed(2),
                          }))
                        }
                        disabled={quickTxSubmitting}
                      >
                        {value.toLocaleString()} <span className="ms-1 text-xs font-normal opacity-70">{data?.user.currency ?? "MAD"}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="quick-tx-date">{copy.quickTxDate}</Label>
                    <input
                      id="quick-tx-date"
                      type="date"
                      max={getLocalTodayISO()}
                      value={quickTxDraft.occurred_on}
                      onKeyDown={handleQuickTxEnter}
                      lang={locale === "ar" ? "ar-MA" : locale === "fr" ? "fr-FR" : "en-CA"}
                      onChange={(event) =>
                        setQuickTxDraft((prev) => ({
                          ...prev,
                          occurred_on: event.target.value,
                        }))
                      }
                      className={`h-11 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                        quickTxDraft.type === "expense" 
                          ? "border-red-200 focus:border-red-400 focus:ring-red-100 bg-white/80 dark:bg-slate-900/80 dark:border-slate-800 text-[var(--ink)]" 
                          : "border-[var(--border)] focus:border-emerald-400 focus:ring-emerald-100 bg-white/80 dark:bg-slate-900/80 dark:border-slate-800 text-[var(--ink)]"
                      }`}
                      disabled={quickTxSubmitting}
                    />
                    {quickTxDraft.occurred_on ? (
                      <p className="text-xs text-[var(--muted)]">
                        {copy.quickTxSelectedDateLabel}: {formatLocaleDate(quickTxDraft.occurred_on, locale)}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quick-tx-category">{copy.quickTxCategory}</Label>
                    <select
                      id="quick-tx-category"
                      value={quickTxDraft.category_id}
                      onKeyDown={handleQuickTxEnter}
                      onChange={(event) => handleCategoryChange(event.target.value)}
                      className={`h-11 rounded-xl border focus:ring-2 focus:outline-none transition-colors bg-white/80 dark:bg-slate-900/80 dark:border-slate-800 px-3 text-sm text-[var(--ink)] ${
                        quickTxDraft.type === "income"
                          ? "border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100"
                          : "border-red-200 focus:border-red-400 focus:ring-red-100"
                      }`}
                      disabled={quickTxSubmitting}
                    >
                      <option value="">{copy.quickTxSelectCategory}</option>
                      {quickTxDraft.type === "income" ? (
                        incomeCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {localizeCategoryName(category.name, locale)}
                          </option>
                        ))
                      ) : (
                        <>
                          <optgroup label={locale === "ar" ? "فئات مربوطة بأظرفة" : locale === "fr" ? "Catégories liées aux enveloppes" : "Linked Categories"}>
                            {allExpenseCategories.filter(cat => mappedCategoryIds.has(cat.id)).map((category) => (
                              <option key={category.id} value={category.id}>
                                {localizeCategoryName(category.name, locale)}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label={locale === "ar" ? "فئات غير مربوطة (تتطلب ربط)" : locale === "fr" ? "Catégories non liées (à associer)" : "Unmapped Categories (need linking)"}>
                            {allExpenseCategories.filter(cat => !mappedCategoryIds.has(cat.id)).map((category) => (
                              <option key={category.id} value={category.id}>
                                ⚠️ {localizeCategoryName(category.name, locale)}
                              </option>
                            ))}
                          </optgroup>
                        </>
                      )}
                    </select>
                    {quickTxDraft.type === "income" && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
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
                  </div>
                </div>

                {!isCurrentCategoryMapped && quickTxDraft.category_id && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl space-y-2 animate-fadeIn">
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
                        className="flex-1 h-9 rounded-lg border border-amber-300 bg-white dark:bg-slate-900 px-2.5 text-xs text-amber-900 dark:text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      >
                        <option value="">
                          {locale === "ar" ? "-- اختر ظرفاً --" : locale === "fr" ? "-- Choisir une enveloppe --" : "-- Select an envelope --"}
                        </option>
                        {data?.envelopes.map((env) => (
                          <option key={env.envelope.id} value={env.envelope.id}>
                            {localizeEnvelopeLabel(env.envelope.name, locale)}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        disabled={!inlineEnvelopeMapping}
                        onClick={() => handleMapCategoryInline(quickTxDraft.category_id, inlineEnvelopeMapping)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-lg px-3"
                      >
                        {locale === "ar" ? "ربط" : locale === "fr" ? "Lier" : "Link"}
                      </Button>
                    </div>
                  </div>
                )}

                {quickTxLastSimilarExpense && quickTxDraft.type === "expense" ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/70 dark:bg-red-950/20 dark:border-red-900/30 px-3 py-2.5 text-xs text-red-800 dark:text-red-300 shadow-sm">
                    <span className="flex items-center gap-1.5 text-start">
                      <span className="text-red-400 text-sm">↩</span>
                      <span>
                        {copy.quickTxLastExpenseLabel}: <strong>{formatMoney(quickTxLastSimilarExpense.amount)} {data?.user.currency ?? "MAD"}</strong> · {formatLocaleDate(quickTxLastSimilarExpense.occurred_on, locale)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="rounded-lg border border-red-300 bg-white dark:bg-slate-800 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 transition-colors shrink-0"
                      onClick={() =>
                        setQuickTxDraft((prev) => ({
                          ...prev,
                          amount: Number(quickTxLastSimilarExpense.amount).toFixed(2),
                          description: quickTxLastSimilarExpense.description ?? prev.description,
                        }))
                      }
                    >
                      {copy.quickTxUseLastExpense}
                    </button>
                  </div>
                ) : null}

                {quickTxRecurringSuggestion && quickTxDraft.type === "expense" ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50/80 dark:bg-orange-950/20 dark:border-orange-900/30 px-3 py-2.5 text-xs text-orange-800 dark:text-orange-300 shadow-sm">
                    <span className="flex items-center gap-1.5 text-start">
                      <span className="text-orange-400 text-base">🔁</span>
                      <span className="leading-tight">
                        {copy.quickTxRecurringHint}: <strong>{formatMoney(quickTxRecurringSuggestion.amount)} {data?.user.currency ?? "MAD"}</strong>
                      </span>
                    </span>
                    <button
                      type="button"
                      className="rounded-lg border border-orange-300 bg-white dark:bg-slate-800 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 transition-colors shrink-0"
                      onClick={() =>
                        setQuickTxDraft((prev) => ({
                          ...prev,
                          amount: quickTxRecurringSuggestion.amount.toFixed(2),
                          description: quickTxRecurringSuggestion.description || prev.description,
                        }))
                      }
                    >
                      {copy.quickTxApplyRecurring}
                    </button>
                  </div>
                ) : null}

                {quickTxMappedEnvelopeHint && quickTxDraft.type === "expense" ? (
                  <div className="flex items-center gap-3 rounded-xl border border-red-300 bg-gradient-to-r from-red-50 to-rose-50 dark:from-slate-900 dark:border-red-950/30 px-3 py-3 shadow-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 bg-white dark:bg-slate-800 dark:border-slate-700 text-lg shadow-sm">
                      💸
                    </div>
                    <div className="flex flex-col gap-0.5 text-start">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400">
                        {locale === "ar" ? "الظرف المتأثر" : locale === "en" ? "Envelope debited" : "Enveloppe débitée"}
                      </span>
                      <span className="text-sm font-semibold text-red-800 dark:text-red-300">{quickTxMappedEnvelopeHint}</span>
                    </div>
                  </div>
                ) : null}

                {quickTxAmountAnomalyMessage ? (
                  <Alert tone="warning">
                    <AlertDescription>{quickTxAmountAnomalyMessage}</AlertDescription>
                  </Alert>
                ) : null}

                {quickTxPeriodWarning ? (
                  <Alert tone="warning">
                    <AlertDescription>{quickTxPeriodWarning}</AlertDescription>
                  </Alert>
                ) : null}

                {quickTxIncomeCategoryWarning ? (
                  <Alert tone="warning">
                    <AlertDescription>{quickTxIncomeCategoryWarning}</AlertDescription>
                  </Alert>
                ) : null}

                {quickTxIncomeExpectedWarning ? (
                  <Alert tone="warning">
                    <AlertDescription>{quickTxIncomeExpectedWarning}</AlertDescription>
                  </Alert>
                ) : null}

                {quickTxIncomeDateEarlyWarning ? (
                  <Alert tone="warning">
                    <AlertDescription>{quickTxIncomeDateEarlyWarning}</AlertDescription>
                  </Alert>
                ) : null}

                {isEarlyPaydayTriggered && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-950/30 dark:bg-slate-900/50 space-y-4 text-start">
                    <div className="rounded-lg bg-amber-100/70 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      <h4 className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                        {locale === "ar"
                          ? "⚠️ دخلتي الصالير قبل الوقت المعتاد!"
                          : locale === "fr"
                          ? "⚠️ Salaire reçu plus tôt que prévu !"
                          : "⚠️ Salary received earlier than usual!"}
                      </h4>
                      <p className="text-xs leading-relaxed opacity-90">
                        {locale === "ar"
                          ? `التاريخ الموالف ديال الصالير هو (${formatLocaleDate(data?.current_period?.end || "", locale)}). بما أنك تخلصتي بكري، السيستيم غادي يسد الحساب ديال هاد الشهر دابا، باش يبدا معاك شهر جديد.`
                          : locale === "fr"
                          ? `Votre date de paie habituelle est le (${formatLocaleDate(data?.current_period?.end || "", locale)}). Comme vous avez reçu votre salaire plus tôt, le système va clôturer cette période maintenant pour commencer un nouveau mois avec vous.`
                          : `Your usual salary date is (${formatLocaleDate(data?.current_period?.end || "", locale)}). Since you got paid early, the system will close this month's account now to start a new month with you.`}
                      </p>
                    </div>

                    <Label className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                      {locale === "ar"
                        ? "نوع تغيير تاريخ الراتب:"
                        : locale === "fr"
                        ? "Type de changement de date :"
                        : "Salary date shift type:"}
                    </Label>
                    <div className="grid gap-3">
                      <label className="flex items-start gap-3 text-sm text-[var(--ink)] cursor-pointer">
                        <input
                          type="radio"
                          name="permanentShift"
                          checked={permanentShift === false}
                          onChange={() => setPermanentShift(false)}
                          className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--ink)]">
                            {locale === "ar"
                              ? "تسبيق مؤقت (حالة استثنائية بحال العيد)"
                              : locale === "fr"
                              ? "Avance temporaire (cas exceptionnel comme l'Aïd)"
                              : "Temporary advance (exceptional case like Eid)"}
                          </span>
                          <span className="text-xs text-[var(--muted)] mt-0.5">
                            {locale === "ar"
                              ? "الشهر الماجي غادي نرجع نتخلص فالتاريخ العادي ديالي."
                              : locale === "fr"
                              ? "Le mois prochain, je recevrai mon salaire à ma date habituelle."
                              : "Next month, I will go back to being paid on my usual date."}
                          </span>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 text-sm text-[var(--ink)] cursor-pointer">
                        <input
                          type="radio"
                          name="permanentShift"
                          checked={permanentShift === true}
                          onChange={() => setPermanentShift(true)}
                          className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--ink)]">
                            {locale === "ar"
                              ? "تغيير دائم (تبدل تاريخ الصالير)"
                              : locale === "fr"
                              ? "Changement permanent (la date de salaire a changé)"
                              : "Permanent change (salary date shifted)"}
                          </span>
                          <span className="text-xs text-[var(--muted)] mt-0.5">
                            {locale === "ar"
                              ? "من هنا للقدام غنولي ديما نتخلص فهاد التاريخ الجديد."
                              : locale === "fr"
                              ? "À l'avenir, je recevrai toujours mon salaire à cette nouvelle date."
                              : "From now on, I will always be paid on this new date."}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {quickTxPeriodBoundsPreview ? (
                  <Alert tone="default">
                    <AlertDescription>{quickTxPeriodBoundsPreview}</AlertDescription>
                  </Alert>
                ) : null}

                {quickTxDraft.category_id && quickTxCategories.length === 0 ? (
                  <Alert tone="warning">
                    <AlertDescription className="flex items-center justify-between gap-2">
                      <span>
                        {quickTxDraft.type === "income"
                          ? copy.quickTxNoIncomeCategories
                          : copy.quickTxNoExpenseCategories}
                      </span>
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/categories">{copy.quickMapCategories}</Link>
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="quick-tx-description">{copy.quickTxDescriptionField}</Label>
                  <input
                    id="quick-tx-description"
                    value={quickTxDraft.description}
                    onKeyDown={handleQuickTxEnter}
                    onChange={(event) =>
                      setQuickTxDraft((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder={copy.quickTxDescriptionPlaceholder}
                    className={`h-11 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                      quickTxDraft.type === "expense" 
                        ? "border-red-200 focus:border-red-400 focus:ring-red-100 bg-white/80 dark:bg-slate-900/80 dark:border-slate-800 text-[var(--ink)]" 
                        : "border-[var(--border)] focus:border-emerald-400 focus:ring-emerald-100 bg-white/80 dark:bg-slate-900/80 dark:border-slate-800 text-[var(--ink)]"
                    }`}
                    disabled={quickTxSubmitting}
                  />
                  {quickTxDescriptionSuggestions.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-xs text-[var(--muted)]">
                        {copy.quickTxDescriptionSuggestions}
                      </span>
                      {quickTxDescriptionSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className={`quick-tx-chip rounded-full border px-2 py-1 text-xs transition-all ${
                            quickTxDraft.type === "expense" 
                              ? "border-red-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300" 
                              : "border-[var(--border)] bg-[var(--surface)] hover:border-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-300"
                          }`}
                          onClick={() =>
                            setQuickTxDraft((prev) => ({
                              ...prev,
                              description: suggestion,
                            }))
                          }
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {quickTxError ? (
                  <Alert tone="error">
                    <AlertDescription>{quickTxError}</AlertDescription>
                  </Alert>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {quickTxDraft.type === "income" && quickTxStep === "income_preview" ? (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-white/90 dark:bg-slate-955 px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-0.5 text-start">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                  {locale === "ar" ? "المبلغ المُدخَل" : locale === "en" ? "Amount entered" : "Montant saisi"}
                </span>
                <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                  {Number(quickTxDraft.amount).toLocaleString()} <span className="text-sm font-medium text-emerald-500">{data?.user.currency ?? "MAD"}</span>
                </span>
              </div>
              {quickTxDraft.occurred_on ? (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                    {locale === "ar" ? "التاريخ" : locale === "en" ? "Date" : "Date"}
                  </span>
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{formatLocaleDate(quickTxDraft.occurred_on, locale)}</span>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900/40 dark:to-emerald-950/10 p-4 shadow-sm text-start">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📊</span>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                  {locale === "ar"
                    ? "معاينة التوزيع قبل تأكيد الدخل"
                    : locale === "en"
                    ? "Distribution preview"
                    : "Aperçu de la répartition"}
                </p>
              </div>
              {quickTxDistributionPreview?.items?.length ? (
                <>
                  <div className="space-y-2">
                    {quickTxDistributionPreview.items.map((item, index) => {
                      const total = Number(quickTxDraft.amount) || 1;
                      const pct = Math.min(100, Math.round((Number(item.amount) / total) * 100));
                      return (
                        <div
                          key={`${item.target_type}:${item.target_id}-${index}`}
                          className="rounded-xl border border-emerald-100 bg-white/90 dark:bg-slate-900 dark:border-slate-800 px-3 py-2.5 text-xs shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-[var(--ink)]">{item.name}</span>
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">
                              {formatMoney(item.amount)} {data?.user.currency ?? "MAD"}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="mt-0.5 text-right text-[10px] text-emerald-500 font-medium">{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-3 py-2 mt-3 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    <span>{locale === "ar" ? "💰 المجموع" : locale === "en" ? "💰 Total" : "💰 Total"}</span>
                    <span>{formatMoney(Number(quickTxDraft.amount))} {data?.user.currency ?? "MAD"}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-[var(--muted)] italic">
                  {locale === "ar"
                    ? "ما كايناش قواعد توزيع نشيطة حالياً."
                    : locale === "en"
                    ? "No active distribution rules currently."
                    : "Aucune règle de répartition active pour le moment."}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Sits with the action buttons so it is reachable from every step. The
          other copy of this alert lives inside the form block, which the income
          preview replaces: a save failing there set the message on a node that
          was no longer rendered, so a rejected request looked like a button
          that simply did nothing. */}
      {quickTxError && quickTxDraft.type === "income" && quickTxStep === "income_preview" ? (
        <Alert tone="error" className="mt-4">
          <AlertDescription>{quickTxError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
        {/* Render Cancel button only if not inline OR custom onCancel is provided */}
        {(!isInline || onCancel) && (
          <Button
            variant="secondary"
            onClick={handleBackOrCancel}
            disabled={quickTxSubmitting}
            className="rounded-xl"
          >
            {quickTxDraft.type === "income" && quickTxStep === "income_preview"
              ? locale === "ar"
                ? "رجوع للتعديل"
                : locale === "en"
                ? "Back to edit"
                : "Retour modification"
              : copy.cancel}
          </Button>
        )}
        
        {quickTxDraft.type === "income" && quickTxStep === "income_preview" ? (
          <Button
            variant="secondary"
            onClick={handleOpenDistributionFromQuickTx}
            disabled={quickTxSubmitting}
            className="rounded-xl"
          >
            {locale === "ar"
              ? "بدّل التوزيع"
              : locale === "en"
              ? "Change distribution"
              : "Modifier la répartition"}
          </Button>
        ) : null}
        
        <Button
          onClick={handleSubmitQuickTransaction}
          disabled={
            quickTxSubmitting ||
            isAiVerifying ||
            !quickTxCanSubmit
          }
          className={`quick-tx-submit rounded-xl px-5 py-2 font-semibold transition-colors disabled:opacity-50 focus:outline-none text-white ${quickTxDraft.type === "expense" ? "bg-red-600 hover:bg-red-700 focus:ring-red-400" : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400"}`}
        >
          {isAiVerifying
            ? (locale === "ar"
                ? "جاري التحقق من الفئة..."
                : locale === "fr"
                ? "Vérification de la catégorie..."
                : "Verifying category...")
            : quickTxSubmitting
            ? copy.executing
            : quickTxDraft.type === "income" && quickTxStep === "form"
            ? locale === "ar"
              ? "متابعة"
              : locale === "en"
              ? "Continue"
              : "Continuer"
            : quickTxDraft.type === "income"
            ? copy.quickTxSubmitIncome
            : copy.quickTxSubmitExpense}
        </Button>
      </div>
      {aiWarning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90%] overflow-y-auto">
            <div className="flex items-center gap-3 text-amber-500">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-[var(--ink)]">
                {locale === "ar"
                  ? "تنبيه: عدم تطابق الفئة"
                  : locale === "fr"
                  ? "Alerte : Catégorie potentiellement incorrecte"
                  : "Warning: Category mismatch"}
              </h3>
            </div>

            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {aiWarning.explanation}
            </p>

            {aiWarning.suggestedCategory && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  {locale === "ar"
                    ? "الفئة المقترحة من طرف المساعد الذكي:"
                    : locale === "fr"
                    ? "Catégorie suggérée par le copilote IA :"
                    : "Suggested category by AI copilot:"}
                </p>
                <p className="mt-1 font-bold text-base text-[var(--ink)]">
                  {localizeCategoryName(aiWarning.suggestedCategory, locale)}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {aiWarning.suggestedCategory && (() => {
                const suggestedCatObj = allExpenseCategories.find(
                  (c) => c.name.toLowerCase() === aiWarning.suggestedCategory!.toLowerCase()
                );
                if (suggestedCatObj) {
                  return (
                    <Button
                      type="button"
                      onClick={async () => {
                        const targetId = suggestedCatObj.id;
                        if (!mappings[targetId]) {
                          setQuickTxError(
                            locale === "ar"
                              ? "⚠️ هاد الفئة المقترحة ما مربوطاش بـ حتى ظرف. ربطها أولاً باش تقدر تستخدمها."
                              : locale === "fr"
                              ? "⚠️ La catégorie suggérée n'est liée à aucune enveloppe. Veuillez l'associer à une enveloppe d'abord."
                              : "⚠️ The suggested category is not linked to any envelope. Please link it first."
                          );
                          setAiWarning(null);
                          return;
                        }
                        setQuickTxDraft((prev) => ({
                          ...prev,
                          category_id: targetId,
                        }));
                        await aiWarning.pendingSaveAction(targetId);
                      }}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-2 font-semibold"
                    >
                      {locale === "ar"
                        ? `نعم، استخدم ${localizeCategoryName(aiWarning.suggestedCategory, locale)}`
                        : locale === "fr"
                        ? `Oui, utiliser ${localizeCategoryName(aiWarning.suggestedCategory, locale)}`
                        : `Yes, use ${localizeCategoryName(aiWarning.suggestedCategory, locale)}`}
                    </Button>
                  );
                }
                return null;
              })()}

              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  await aiWarning.pendingSaveAction();
                }}
                className="w-full border-slate-200 dark:border-slate-800 text-[var(--ink)] bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl py-2 font-semibold"
              >
                {locale === "ar"
                  ? "لا، احتفظ بفئتي المحددة"
                  : locale === "fr"
                  ? "Non, conserver ma catégorie"
                  : "No, keep my selected category"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setAiWarning(null)}
                className="w-full text-xs text-[var(--muted)] hover:text-[var(--ink)] py-1"
              >
                {locale === "ar" ? "إلغاء" : locale === "fr" ? "Annuler" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
