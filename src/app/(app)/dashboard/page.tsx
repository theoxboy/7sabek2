"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Cairo } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";

import { apiFetch, fetchDashboard } from "@/lib/api";
import type {
  CategoryEnvelopeMapOut,
  CategoryOut,
  DashboardOut,
  DashboardTrendPointOut,
  DistributionConfigOut,
  DistributionSimulateOut,
  GoalOut,
  IncomeReminderOut,
  OnboardingV2RecordOut,
  SettingsResponse,
  TransactionOut,
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { InfoHint } from "@/components/ui/InfoHint";
import { Section } from "@/components/ui/Section";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Label } from "@/components/ui/Label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Checkbox } from "@/components/ui/Checkbox";
import { Separator } from "@/components/ui/Separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDeleteTransactionDialog } from "@/components/transactions/ConfirmDeleteTransactionDialog";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  GlobalTourOverlay,
  useGlobalTour,
  type TourStep,
} from "@/components/tour/GlobalTour";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { Wallet, TrendingDown, TrendingUp, Scale, Calendar, ChevronDown, Plus, Sparkles, Layers, Bell, AlertTriangle, CheckCircle2 } from "lucide-react";
import { addDays, startOfYear } from "@/lib/reports/compute";
import {
  getLocaleDirection,
  type FloussyLocale,
} from "@/lib/localePreference";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { isInternalIncomeCategory, localizeCategoryName } from "@/lib/categoryCatalog";
import { areToursGloballyDisabled } from "@/lib/tourFlags";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { useQuickTx } from "@/state/QuickTxContext";
import { isFixedMode, isPercentMode } from "@/lib/distribution";

const formatMoney = (value: string | number | undefined) => {
  if (value === undefined) return "0.00";
  if (typeof value === "number") return value.toFixed(2);
  return value;
};

const getLocalTodayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const toIsoDate = (value: Date | undefined) => {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildIncomeTransactionHref = (options?: {
  bootstrapDate?: string | null;
  bootstrapAmount?: string | null;
}) => {
  const params = new URLSearchParams({ type: "income" });
  if (options?.bootstrapDate) {
    params.set("bootstrap_date", options.bootstrapDate);
  }
  if (options?.bootstrapAmount) {
    params.set("bootstrap_amount", options.bootstrapAmount);
  }
  return `/transactions?${params.toString()}`;
};

function localizeSystemEnvelopeName(name: string, locale: FloussyLocale) {
  if (locale === "ar") {
    const normalized = name.trim().toLowerCase();
    if (["objectif principal", "main goal"].includes(normalized)) return "الهدف الرئيسي";
  }
  return localizeEnvelopeLabel(name, locale);
}


type EnvelopeSpend = {
  name: string;
  total: number;
};
type DraftObjectRecord = Record<string, unknown>;

type ApiError = {
  detail?: string | { msg?: string }[];
};

type QuickTransactionDraft = {
  type: "income" | "expense";
  category_id: string;
  amount: string;
  occurred_on: string;
  description: string;
};

type QuickTxFlowStep = "form" | "income_preview";

const QUICK_TX_INCOME_RESUME_STORAGE_KEY = "floussy.quickTx.incomeResume.v1";

const INCOME_REMINDER_POPUP_ID = "income-reminders";
const PERIOD_STORAGE_KEY = "floussy.dashboardPeriod.v1";
const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const DASHBOARD_INTRO_SEEN_KEY = "floussy.dashboard.intro.seen";
const INCOME_KEYWORDS = [
  "salaire",
  "salary",
  "paie",
  "revenu",
  "income",
  "income_general",
  "income_salary",
  "income_freelance",
  "income_bonus",
  "income_commission",
  "income_refund",
  "income_other",
  "prime",
  "bonus",
  "commission",
  "dividende",
  "dividend",
  "interet",
  "interest",
  "vente",
  "ventes",
  "remboursement",
  "refund",
  "virement",
  "cnss",
  "payroll",
  "pension",
  "allocations",
  "rente",
];
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

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const detectKindFromName = (name: string): "income" | "expense" => {
  if (isInternalIncomeCategory(name)) return "income";
  const normalized = normalizeName(name);
  return INCOME_KEYWORDS.some((keyword) => normalized.includes(keyword))
    ? "income"
    : "expense";
};

const looksLikeSalaryCategory = (name: string) => {
  const normalized = normalizeName(name);
  return SALARY_KEYWORDS.some((keyword) =>
    normalized.includes(normalizeName(keyword))
  );
};

const formatLocaleDate = (value: string, locale: FloussyLocale) => {
  if (!value) return value;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  const localeCode =
    locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-CA";
  return parsed.toLocaleDateString(localeCode, {
    year: "numeric",
    month: locale === "ar" ? "long" : "2-digit",
    day: "2-digit",
  });
};

const formatApiError = (error: unknown, fallback: string) => {
  if (!error) return fallback;
  if (error instanceof Error) return error.message;
  const typed = error as ApiError;
  if (typeof typed.detail === "string") return typed.detail;
  if (Array.isArray(typed.detail)) {
    const text = typed.detail.map((item) => item.msg ?? "").filter(Boolean).join(", ");
    return text || fallback;
  }
  return fallback;
};

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

type DashboardCopy = {
  unknownError: string;
  unknownUpdateError: string;
  invalidPeriod: string;
  incomeDeclaredTitle: string;
  incomeDeclaredDescription: string;
  errorTitle: string;
  deletedTitle: string;
  deletedDescription: string;
  deleteErrorTitle: string;
  sweepDoneTitle: string;
  sweepDoneDescription: string;
  sweepErrorTitle: string;
  tourOverviewTitle: string;
  tourOverviewDescription: string;
  tourTodoTitle: string;
  tourTodoDescription: string;
  tourAvailableTitle: string;
  tourAvailableDescription: string;
  tourExpenseTitle: string;
  tourExpenseDescription: string;
  tourIncomeTitle: string;
  tourIncomeDescription: string;
  tourNetTitle: string;
  tourNetDescription: string;
  tourTopTitle: string;
  tourTopDescription: string;
  tourRecentTitle: string;
  tourRecentDescription: string;
  tourSpendingTitle: string;
  tourSpendingDescription: string;
  tourTrendTitle: string;
  tourTrendDescription: string;
  tourQuickTitle: string;
  tourQuickDescription: string;
  tourFabTitle: string;
  tourFabDescription: string;
  navDashboard: string;
  navDashboardDesc: string;
  navTransactions: string;
  navTransactionsDesc: string;
  navEnvelopes: string;
  navEnvelopesDesc: string;
  navDistribution: string;
  navDistributionDesc: string;
  navGoals: string;
  navGoalsDesc: string;
  navAide: string;
  navAideDesc: string;
  navReports: string;
  navReportsDesc: string;
  navSettings: string;
  navSettingsDesc: string;
  incomeDialogTitle: string;
  incomeDialogDescription: (count: number) => string;
  incomeDialogBody: string;
  toDeclare: string;
  hideReminder: string;
  ignore: string;
  declareNow: string;
  periodTitle: string;
  periodDescription: string;
  preset7: string;
  preset30: string;
  preset90: string;
  presetYtd: string;
  presetCustom: string;
  start: string;
  end: string;
  startPlaceholder: string;
  endPlaceholder: string;
  selectedPeriod: string;
  cancel: string;
  apply: string;
  guideTag: string;
  welcomeTitle: string;
  welcomeDescription: string;
  guideLine1: string;
  guideLine2: string;
  guideLine3: string;
  guideChip1: string;
  guideChip2: string;
  guideChip3: string;
  guideFooter: string;
  skip: string;
  startTour: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  noPeriod: string;
  changePeriod: string;
  addExpense: string;
  addIncome: string;
  sweepRunning: string;
  sweep: string;
  loading: string;
  todo: string;
  sweepBootstrapTitle: string;
  sweepBootstrapDesc: string;
  sweepBootstrapHelp: string;
  sweepBootstrapAction: string;
  declareIncome: string;
  declared: string;
  categoriesToMap: (count: number) => string;
  categoriesToMapDesc: string;
  categoriesToMapHelp: string;
  mapNow: string;
  overspentAlert: (count: number, names: string) => string;
  overspentDesc: string;
  overspentHelp: string;
  seeAll: string;
  sweepReady: string;
  sweepReadyDesc: string;
  sweepExecute: string;
  executing: string;
  sweepNotDue: string;
  sweepNotDueDesc: string;
  sweepHelp: string;
  availableCash: string;
  notAllocated: string;
  periodExpenses: string;
  mappedExpenses: string;
  unmappedSuffix: (count: number) => string;
  periodIncome: string;
  periodNet: string;
  topEnvelopes: string;
  allocateFunds: string;
  viewAllEnvelopes: string;
  filterActive: string;
  filterOverspent: string;
  filterNear: string;
  noEnvelopeTitle: string;
  noEnvelopeDescription: string;
  spentLabel: string;
  spentFallback: string;
  recentExpenses: string;
  noExpensesTitle: string;
  noExpensesDescription: string;
  noRecentTitle: string;
  noRecentDescription: string;
  expenseFallback: string;
  unmapped: string;
  mapped: string;
  edit: string;
  delete: string;
  spendingByEnvelope: string;
  netWorthTrend: string;
  quickActions: string;
  quickAddExpense: string;
  quickAllocateCash: string;
  quickMapCategories: string;
  widgetCashSplit: string;
  widgetCashSplitDesc: string;
  widgetPlanDirection: string;
  widgetPlanCoverage: string;
  widgetAutoSweep: string;
  widgetAutoSweepOn: string;
  widgetAutoSweepOff: string;
  widgetOpenDistribution: string;
  widgetOpenSweeps: string;
  widgetDebt: string;
  widgetGoals: string;
  widgetMorona: string;
  widgetNoPlan: string;
  widgetFixed: string;
  widgetDebtGoals: string;
  widgetFlexible: string;
  widgetCashLeft: string;
  widgetRisk: string;
  widgetRiskDesc: string;
  widgetRiskAllHealthy: string;
  widgetDebtGoalsPressure: string;
  widgetDebtPressure: string;
  widgetGoalsPressure: string;
  widgetNoDebt: string;
  widgetNoGoals: string;
  widgetAnomalies: string;
  widgetAnomaliesDesc: string;
  widgetAnomalyNoConfig: string;
  widgetAnomalyNoConfigHelp: string;
  fabDeclareIncome: string;
  fabDeclareExpense: string;
  quickTxTitle: string;
  quickTxDescription: string;
  quickTxIncomeTab: string;
  quickTxExpenseTab: string;
  quickTxAmount: string;
  quickTxDate: string;
  quickTxCategory: string;
  quickTxDescriptionField: string;
  quickTxDescriptionPlaceholder: string;
  quickTxSelectCategory: string;
  quickTxMappedTo: (name: string) => string;
  quickTxNoIncomeCategories: string;
  quickTxNoExpenseCategories: string;
  quickTxAmountRequired: string;
  quickTxCategoryRequired: string;
  quickTxSavedIncome: string;
  quickTxSavedExpense: string;
  quickTxUnknownError: string;
  quickTxBeforePeriod: (incomeDate: string, start: string, end: string, arrow: string) => string;
  quickTxAfterPeriod: (incomeDate: string, start: string, end: string, arrow: string) => string;
  quickTxSubmitIncome: string;
  quickTxSubmitExpense: string;
  quickTxSuggestedAmounts: string;
  quickTxProgressLabel: string;
  quickTxSelectedDateLabel: string;
  quickTxSmartCategories: string;
  quickTxUseLastExpense: string;
  quickTxLastExpenseLabel: string;
  quickTxRecurringHint: string;
  quickTxApplyRecurring: string;
  quickTxDescriptionSuggestions: string;
  quickTxAmountAnomaly: (amount: string, usual: string) => string;
  tooltipAvailableCash: string;
  tooltipPeriodExpenses: string;
  tooltipPeriodNet: string;
  budgetSummaryTitle: string;
  chartSpent: string;
  chartReserved: string;
  chartFree: string;
  chartTotalResources: string;
  chartTooltipSpent: string;
  chartTooltipReserved: string;
  chartTooltipFree: string;
};

const DASHBOARD_COPY: Record<FloussyLocale, DashboardCopy> = {
  fr: {
    unknownError: "Erreur inconnue",
    unknownUpdateError: "Impossible de mettre à jour.",
    invalidPeriod: "La date de début doit être strictement avant la date de fin.",
    incomeDeclaredTitle: "Revenu déclaré",
    incomeDeclaredDescription: "Le rappel a été mis à jour.",
    errorTitle: "Erreur",
    deletedTitle: "Transaction supprimée",
    deletedDescription: "Le dashboard a été mis à jour.",
    deleteErrorTitle: "Suppression impossible",
    sweepDoneTitle: "Sweep exécuté",
    sweepDoneDescription: "Les soldes ont été mis à jour.",
    sweepErrorTitle: "Sweep impossible",
    tourOverviewTitle: "Vue d’ensemble",
    tourOverviewDescription:
      "Ici tu vois ta période active et les actions rapides pour ajouter des transactions.",
    tourTodoTitle: "À faire maintenant",
    tourTodoDescription:
      "Les alertes importantes pour sécuriser ton budget en priorité.",
    tourAvailableTitle: "Cash disponible",
    tourAvailableDescription:
      "Le montant que tu peux encore allouer à tes enveloppes.",
    tourExpenseTitle: "Dépenses période",
    tourExpenseDescription:
      "Le total dépensé sur la période sélectionnée (mappé).",
    tourIncomeTitle: "Revenus période",
    tourIncomeDescription: "Le total des revenus déclarés sur la période.",
    tourNetTitle: "Net période",
    tourNetDescription: "Le solde net revenus - dépenses sur la période.",
    tourTopTitle: "Top enveloppes",
    tourTopDescription: "Les enveloppes principales et leurs budgets restants.",
    tourRecentTitle: "Dépenses récentes",
    tourRecentDescription:
      "Vérifie tes dernières dépenses pour corriger rapidement si besoin.",
    tourSpendingTitle: "Répartition par enveloppe",
    tourSpendingDescription:
      "Graphique et détails par enveloppe pour mieux analyser.",
    tourTrendTitle: "Tendance du net",
    tourTrendDescription:
      "Visualise l’évolution de ton net sur la période sélectionnée.",
    tourQuickTitle: "Actions rapides",
    tourQuickDescription:
      "Accède en un clic aux actions essentielles pour gérer ton budget.",
    tourFabTitle: "Raccourcis flottants",
    tourFabDescription: "Ajoute un revenu ou une dépense en un seul geste.",
    navDashboard: "Menu latéral — Dashboard",
    navDashboardDesc: "Reviens à ton tableau de bord à tout moment.",
    navTransactions: "Menu latéral — Transactions",
    navTransactionsDesc: "Saisis ou consulte toutes tes transactions.",
    navEnvelopes: "Menu latéral — Envelopes",
    navEnvelopesDesc: "Gère tes enveloppes et leurs budgets.",
    navDistribution: "Menu latéral — Répartition",
    navDistributionDesc: "Alloue ton cash disponible aux enveloppes.",
    navGoals: "Menu latéral — Goals",
    navGoalsDesc: "Planifie tes objectifs et suis ta progression.",
    navAide: "Menu latéral — Aide",
    navAideDesc: "Accède aux guides et explications rapides.",
    navReports: "Menu latéral — Reports",
    navReportsDesc: "Analyse tes tendances et tes rapports.",
    navSettings: "Menu latéral — Settings",
    navSettingsDesc: "Gère ton compte et tes préférences.",
    incomeDialogTitle: "Revenus à déclarer",
    incomeDialogDescription: (count: number) => `${count} revenu(s) à déclarer.`,
    incomeDialogBody:
      "Tu as des rappels en attente. Déclare ton revenu pour garder un suivi correct.",
    toDeclare: "À déclarer",
    hideReminder: "Ne plus afficher ce message",
    ignore: "Ignorer",
    declareNow: "Déclarer maintenant",
    periodTitle: "Choisir une période",
    periodDescription: "Sélectionne une période pour mettre à jour les indicateurs. La date de fin est exclue.",
    preset7: "7 jours",
    preset30: "30 jours",
    preset90: "90 jours",
    presetYtd: "YTD",
    presetCustom: "Personnalisé",
    start: "Début",
    end: "Fin",
    startPlaceholder: "Date de début",
    endPlaceholder: "Date de fin",
    selectedPeriod: "Période sélectionnée (fin exclue)",
    cancel: "Annuler",
    apply: "Appliquer",
    guideTag: "Guide 7sabek",
    welcomeTitle: "Bienvenue sur ton dashboard",
    welcomeDescription:
      "Ce guide t’aide à repérer les zones clés. Chaque page lance son guide une seule fois quand tu la visites.",
    guideLine1: "Dashboard → Transactions → Envelopes.",
    guideLine2: "Répartition → Aide → Reports.",
    guideLine3: "Settings pour finaliser ta configuration.",
    guideChip1: "Couleurs & visuels",
    guideChip2: "Explications courtes",
    guideChip3: "Navigation guidée",
    guideFooter:
      "Des explications rapides et visuelles pour t’accompagner sans t’encombrer.",
    skip: "Passer",
    startTour: "Commencer",
    eyebrow: "Cockpit budget",
    title: "Dashboard",
    subtitle: "Vue globale de tes flux, enveloppes et actions urgentes.",
    noPeriod: "Aucune période",
    changePeriod: "Changer la période",
    addExpense: "+ Ajouter une dépense",
    addIncome: "+ Ajouter un revenu",
    sweepRunning: "Sweep...",
    sweep: "Sweep",
    loading: "Chargement...",
    todo: "À faire maintenant",
    sweepBootstrapTitle: "⏳ Première déclaration de revenu à faire",
    sweepBootstrapDesc:
      "Déclare ton premier revenu après l’onboarding pour démarrer les cycles sur une base réelle.",
    sweepBootstrapHelp:
      "On a déjà préparé une date et un montant d’exemple depuis l’onboarding. Vérifie-les, puis enregistre ton premier revenu pour lancer les cycles.",
    sweepBootstrapAction: "Déclarer le premier revenu",
    declareIncome: "Déclarer revenu",
    declared: "Déclaré",
    categoriesToMap: (count: number) =>
      `⚠️ ${count} catégories à mapper → tes dépenses ne seront pas bien rangées`,
    categoriesToMapDesc: "Relie ces catégories à une enveloppe pour que chaque dépense tombe au bon endroit.",
    categoriesToMapHelp: "Ouvre la page des catégories, puis choisis l’enveloppe correcte pour chaque catégorie non liée.",
    mapNow: "Mapper maintenant",
    overspentAlert: (count: number, names: string) =>
      `🔴 ${count} enveloppes dépassées (${names}${count > 3 ? "..." : ""})`,
    overspentDesc: "Une ou plusieurs enveloppes sont passées sous zéro sur la période en cours.",
    overspentHelp: "Ouvre les enveloppes concernées, puis corrige le budget, déclare une dépense oubliée ou réalloue du cash.",
    seeAll: "Voir tout",
    sweepReady: "✅ Sweep prêt",
    sweepReadyDesc: "La période peut être clôturée maintenant et les soldes concernés seront traités.",
    sweepExecute: "Exécuter le sweep",
    executing: "Exécution...",
    sweepNotDue: "🟡 Sweep : pas encore dû",
    sweepNotDueDesc: "Aucune action de sweep n’est nécessaire pour l’instant.",
    sweepHelp: "Le sweep se déclenche seulement quand la période arrive à sa fin et que le revenu attendu a été déclaré.",
    availableCash: "Cash disponible",
    notAllocated: "argent pas encore alloué",
    periodExpenses: "Dépenses période",
    mappedExpenses: "dépenses mappées",
    unmappedSuffix: (count: number) => ` · ${count} non mappées`,
    periodIncome: "Revenus période",
    periodNet: "Net période",
    topEnvelopes: "Top enveloppes",
    allocateFunds: "Allouer des fonds",
    viewAllEnvelopes: "Voir toutes les enveloppes",
    filterActive: "Actives",
    filterOverspent: "Overspent",
    filterNear: "Proches limite",
    noEnvelopeTitle: "Aucune enveloppe à afficher",
    noEnvelopeDescription: "Ajoute des budgets pour suivre tes enveloppes.",
    spentLabel: "dépensé",
    spentFallback: "Dépensé",
    recentExpenses: "Dépenses récentes",
    noExpensesTitle: "Aucune dépense cette période",
    noExpensesDescription: "Ajoute une dépense pour voir la répartition.",
    noRecentTitle: "Aucune dépense récente",
    noRecentDescription: "Les dernières dépenses apparaîtront ici.",
    expenseFallback: "Dépense",
    unmapped: "Unmapped",
    mapped: "Mapped",
    edit: "Modifier",
    delete: "Supprimer",
    spendingByEnvelope: "Spending by envelope",
    netWorthTrend: "Net worth trend",
    quickActions: "Actions rapides",
    quickAddExpense: "Ajouter dépense",
    quickAllocateCash: "Allouer cash",
    quickMapCategories: "Mapper catégories",
    widgetCashSplit: "Répartition du cash",
    widgetCashSplitDesc: "Simulation sur le cash disponible actuel.",
    widgetPlanDirection: "Direction du plan",
    widgetPlanCoverage: "Couverture distribution",
    widgetAutoSweep: "Sweep auto",
    widgetAutoSweepOn: "Activé",
    widgetAutoSweepOff: "Désactivé",
    widgetOpenDistribution: "Ouvrir Distribution",
    widgetOpenSweeps: "Ouvrir Sweeps",
    widgetDebt: "Dette",
    widgetGoals: "Objectifs",
    widgetMorona: "Morona (dépenses flex)",
    widgetNoPlan: "Aucun plan onboarding détecté.",
    widgetFixed: "Fixes",
    widgetDebtGoals: "Dettes + objectifs",
    widgetFlexible: "Flexible (config)",
    widgetCashLeft: "Reste cash",
    widgetRisk: "Enveloppes à risque",
    widgetRiskDesc: "Priorité aux enveloppes proches ou au-dessus de la limite.",
    widgetRiskAllHealthy: "✅ Toutes les enveloppes sont dans les limites — aucune alerte.",
    widgetDebtGoalsPressure: "Pression dettes & objectifs",
    widgetDebtPressure: "Dettes",
    widgetGoalsPressure: "Objectifs",
    widgetNoDebt: "Aucune enveloppe dette détectée.",
    widgetNoGoals: "Aucun objectif actif.",
    widgetAnomalies: "Anomalies système",
    widgetAnomaliesDesc: "Points à corriger pour éviter les écarts de suivi.",
    widgetAnomalyNoConfig: "Configuration de distribution incomplète ou inactive.",
    widgetAnomalyNoConfigHelp: "Ouvre Distribution et sauvegarde une configuration active.",
    fabDeclareIncome: "Déclarer revenu",
    fabDeclareExpense: "Déclarer dépense",
    quickTxTitle: "Déclarer une opération",
    quickTxDescription:
      "Saisie rapide sans quitter le dashboard. Le revenu alimente le Cash, la dépense débite l’enveloppe liée.",
    quickTxIncomeTab: "Revenu",
    quickTxExpenseTab: "Dépense",
    quickTxAmount: "Montant",
    quickTxDate: "Date",
    quickTxCategory: "Catégorie",
    quickTxDescriptionField: "Description",
    quickTxDescriptionPlaceholder: "Optionnel (ex: courses, salaire...)",
    quickTxSelectCategory: "Choisir une catégorie",
    quickTxMappedTo: (name: string) => `Impact sur l’enveloppe: ${name}`,
    quickTxNoIncomeCategories:
      "Aucune catégorie revenu détectée. Crée une catégorie avant de continuer.",
    quickTxNoExpenseCategories:
      "Aucune catégorie dépense mappée. Mappe une catégorie à une enveloppe pour continuer.",
    quickTxAmountRequired: "Le montant est requis.",
    quickTxCategoryRequired: "La catégorie est requise.",
    quickTxSavedIncome: "Revenu déclaré.",
    quickTxSavedExpense: "Dépense déclarée.",
    quickTxUnknownError: "Impossible d’enregistrer l’opération.",
    quickTxBeforePeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `Ce revenu (${incomeDate}) est avant la période active (${start} ${arrow} ${end}) et sera compté dans la période précédente.`,
    quickTxAfterPeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `Ce revenu (${incomeDate}) est après la période active (${start} ${arrow} ${end}) et sera compté dans la période suivante.`,
    quickTxSubmitIncome: "Enregistrer le revenu",
    quickTxSubmitExpense: "Enregistrer la dépense",
    quickTxSuggestedAmounts: "Montants rapides",
    quickTxProgressLabel: "Progression",
    quickTxSelectedDateLabel: "Date choisie",
    quickTxSmartCategories: "Catégories proposées",
    quickTxUseLastExpense: "Reprendre",
    quickTxLastExpenseLabel: "Dernière dépense similaire",
    quickTxRecurringHint: "Habitude détectée",
    quickTxApplyRecurring: "Appliquer cette habitude",
    quickTxDescriptionSuggestions: "Descriptions suggérées",
    quickTxAmountAnomaly: (amount: string, usual: string) =>
      `Montant inhabituel (${amount}). Montant habituel: ${usual}.`,
    tooltipAvailableCash: "Cash restant disponible non encore alloué aux enveloppes.",
    tooltipPeriodExpenses: "Somme de toutes les dépenses effectuées dans la période active.",
    tooltipPeriodNet: "Revenus totaux moins l'ensemble des dépenses de la période.",
    budgetSummaryTitle: "Résumé du Budget de la Période",
    chartSpent: "Dépensé",
    chartReserved: "Réservé",
    chartFree: "Cash Libre",
    chartTotalResources: "Ressources",
    chartTooltipSpent: "Dépenses réelles effectuées",
    chartTooltipReserved: "Montant alloué aux enveloppes resté non dépensé",
    chartTooltipFree: "Argent disponible non alloué à une enveloppe",
  },
  en: {
    unknownError: "Unknown error",
    unknownUpdateError: "Unable to update.",
    invalidPeriod: "Start date must be strictly before end date.",
    incomeDeclaredTitle: "Income declared",
    incomeDeclaredDescription: "The reminder has been updated.",
    errorTitle: "Error",
    deletedTitle: "Transaction deleted",
    deletedDescription: "The dashboard has been updated.",
    deleteErrorTitle: "Delete failed",
    sweepDoneTitle: "Sweep completed",
    sweepDoneDescription: "Balances have been updated.",
    sweepErrorTitle: "Sweep failed",
    tourOverviewTitle: "Overview",
    tourOverviewDescription:
      "Here you can see the active period and the quick actions to add transactions.",
    tourTodoTitle: "Do now",
    tourTodoDescription: "The key alerts to secure your budget first.",
    tourAvailableTitle: "Available cash",
    tourAvailableDescription: "The amount you can still allocate to envelopes.",
    tourExpenseTitle: "Period spending",
    tourExpenseDescription: "Total mapped spending for the selected period.",
    tourIncomeTitle: "Period income",
    tourIncomeDescription: "Total declared income for the period.",
    tourNetTitle: "Period net",
    tourNetDescription: "Net income minus spending for the period.",
    tourTopTitle: "Top envelopes",
    tourTopDescription: "Your main envelopes and remaining balances.",
    tourRecentTitle: "Recent expenses",
    tourRecentDescription: "Check recent expenses to fix issues quickly.",
    tourSpendingTitle: "Envelope breakdown",
    tourSpendingDescription: "Chart and details by envelope for analysis.",
    tourTrendTitle: "Net trend",
    tourTrendDescription: "See how your net changes over the selected period.",
    tourQuickTitle: "Quick actions",
    tourQuickDescription: "One-click access to the essential budget actions.",
    tourFabTitle: "Floating shortcuts",
    tourFabDescription: "Add income or expense in one tap.",
    navDashboard: "Sidebar — Dashboard",
    navDashboardDesc: "Return to your dashboard anytime.",
    navTransactions: "Sidebar — Transactions",
    navTransactionsDesc: "Enter or review all your transactions.",
    navEnvelopes: "Sidebar — Envelopes",
    navEnvelopesDesc: "Manage your envelopes and budgets.",
    navDistribution: "Sidebar — Distribution",
    navDistributionDesc: "Allocate your available cash to envelopes.",
    navGoals: "Sidebar — Goals",
    navGoalsDesc: "Plan your goals and track progress.",
    navAide: "Sidebar — Help",
    navAideDesc: "Access guides and quick explanations.",
    navReports: "Sidebar — Reports",
    navReportsDesc: "Analyze trends and reports.",
    navSettings: "Sidebar — Settings",
    navSettingsDesc: "Manage your account and preferences.",
    incomeDialogTitle: "Income to declare",
    incomeDialogDescription: (count: number) => `${count} income reminder(s) due.`,
    incomeDialogBody:
      "You have pending reminders. Declare your income to keep tracking accurate.",
    toDeclare: "To declare",
    hideReminder: "Do not show this message again",
    ignore: "Ignore",
    declareNow: "Declare now",
    periodTitle: "Choose a period",
    periodDescription: "Select a period to refresh the indicators. End date is excluded.",
    preset7: "7 days",
    preset30: "30 days",
    preset90: "90 days",
    presetYtd: "YTD",
    presetCustom: "Custom",
    start: "Start",
    end: "End",
    startPlaceholder: "Start date",
    endPlaceholder: "End date",
    selectedPeriod: "Selected period (end excluded)",
    cancel: "Cancel",
    apply: "Apply",
    guideTag: "7sabek guide",
    welcomeTitle: "Welcome to your dashboard",
    welcomeDescription:
      "This guide helps you spot the key areas. Each page launches its guide once when you visit it.",
    guideLine1: "Dashboard → Transactions → Envelopes.",
    guideLine2: "Distribution → Help → Reports.",
    guideLine3: "Settings to finish your setup.",
    guideChip1: "Colors & visuals",
    guideChip2: "Short explanations",
    guideChip3: "Guided navigation",
    guideFooter: "Quick visual explanations to help without clutter.",
    skip: "Skip",
    startTour: "Start",
    eyebrow: "Budget cockpit",
    title: "Dashboard",
    subtitle: "Global view of your flows, envelopes, and urgent actions.",
    noPeriod: "No period selected",
    changePeriod: "Change period",
    addExpense: "+ Add expense",
    addIncome: "+ Add income",
    sweepRunning: "Sweep...",
    sweep: "Sweep",
    loading: "Loading...",
    todo: "Do now",
    sweepBootstrapTitle: "⏳ First income declaration still needed",
    sweepBootstrapDesc:
      "Declare your first income after onboarding so cycles start from a real income event.",
    sweepBootstrapHelp:
      "We already prepared a suggested date and amount from onboarding. Review them, then save the income to activate your cycles.",
    sweepBootstrapAction: "Declare first income",
    declareIncome: "Declare income",
    declared: "Declared",
    categoriesToMap: (count: number) =>
      `⚠️ ${count} categories to map → your spending will stay messy`,
    categoriesToMapDesc: "Link each category to the right envelope so expenses land in the right place.",
    categoriesToMapHelp: "Open categories, then choose an envelope for every category that is still unmapped.",
    mapNow: "Map now",
    overspentAlert: (count: number, names: string) =>
      `🔴 ${count} overspent envelopes (${names}${count > 3 ? "..." : ""})`,
    overspentDesc: "One or more envelopes dropped below zero in the current period.",
    overspentHelp: "Open the affected envelopes, then fix the budget, add the missing expense, or reallocate cash.",
    seeAll: "See all",
    sweepReady: "✅ Sweep ready",
    sweepReadyDesc: "The current period can now be closed and eligible balances will be processed.",
    sweepExecute: "Run sweep",
    executing: "Running...",
    sweepNotDue: "🟡 Sweep: not due yet",
    sweepNotDueDesc: "No sweep action is needed right now.",
    sweepHelp: "A sweep only runs when the period ends and the expected income has been declared.",
    availableCash: "Available cash",
    notAllocated: "not yet allocated",
    periodExpenses: "Period spending",
    mappedExpenses: "mapped spending",
    unmappedSuffix: (count: number) => ` · ${count} unmapped`,
    periodIncome: "Period income",
    periodNet: "Period net",
    topEnvelopes: "Top envelopes",
    allocateFunds: "Allocate funds",
    viewAllEnvelopes: "View all envelopes",
    filterActive: "Active",
    filterOverspent: "Overspent",
    filterNear: "Near limit",
    noEnvelopeTitle: "No envelopes to show",
    noEnvelopeDescription: "Add budgets to track your envelopes.",
    spentLabel: "spent",
    spentFallback: "Spent",
    recentExpenses: "Recent expenses",
    noExpensesTitle: "No expenses this period",
    noExpensesDescription: "Add an expense to see the breakdown.",
    noRecentTitle: "No recent expenses",
    noRecentDescription: "Your latest expenses will appear here.",
    expenseFallback: "Expense",
    unmapped: "Unmapped",
    mapped: "Mapped",
    edit: "Edit",
    delete: "Delete",
    spendingByEnvelope: "Spending by envelope",
    netWorthTrend: "Net worth trend",
    quickActions: "Quick actions",
    quickAddExpense: "Add expense",
    quickAllocateCash: "Allocate cash",
    quickMapCategories: "Map categories",
    widgetCashSplit: "Cash split",
    widgetCashSplitDesc: "Simulation based on currently available cash.",
    widgetPlanDirection: "Plan direction",
    widgetPlanCoverage: "Distribution coverage",
    widgetAutoSweep: "Auto sweep",
    widgetAutoSweepOn: "Enabled",
    widgetAutoSweepOff: "Disabled",
    widgetOpenDistribution: "Open Distribution",
    widgetOpenSweeps: "Open Sweeps",
    widgetDebt: "Debt",
    widgetGoals: "Goals",
    widgetMorona: "Morona (flex spending)",
    widgetNoPlan: "No onboarding plan detected.",
    widgetFixed: "Fixed",
    widgetDebtGoals: "Debts + goals",
    widgetFlexible: "Flexible (config)",
    widgetCashLeft: "Cash left",
    widgetRisk: "At-risk envelopes",
    widgetRiskDesc: "Priority to envelopes near or above limit.",
    widgetRiskAllHealthy: "✅ All envelopes are within limits — no alerts.",
    widgetDebtGoalsPressure: "Debt & goals pressure",
    widgetDebtPressure: "Debts",
    widgetGoalsPressure: "Goals",
    widgetNoDebt: "No debt envelope detected.",
    widgetNoGoals: "No active goals.",
    widgetAnomalies: "System anomalies",
    widgetAnomaliesDesc: "Issues to fix to prevent tracking drift.",
    widgetAnomalyNoConfig: "Distribution configuration is missing or inactive.",
    widgetAnomalyNoConfigHelp: "Open Distribution and save an active configuration.",
    fabDeclareIncome: "Declare income",
    fabDeclareExpense: "Declare expense",
    quickTxTitle: "Declare a transaction",
    quickTxDescription:
      "Quick entry without leaving the dashboard. Income feeds Cash, expense debits the mapped envelope.",
    quickTxIncomeTab: "Income",
    quickTxExpenseTab: "Expense",
    quickTxAmount: "Amount",
    quickTxDate: "Date",
    quickTxCategory: "Category",
    quickTxDescriptionField: "Description",
    quickTxDescriptionPlaceholder: "Optional (ex: groceries, salary...)",
    quickTxSelectCategory: "Select a category",
    quickTxMappedTo: (name: string) => `Envelope impact: ${name}`,
    quickTxNoIncomeCategories:
      "No income category detected. Create one before continuing.",
    quickTxNoExpenseCategories:
      "No mapped expense category found. Map a category to an envelope to continue.",
    quickTxAmountRequired: "Amount is required.",
    quickTxCategoryRequired: "Category is required.",
    quickTxSavedIncome: "Income declared.",
    quickTxSavedExpense: "Expense declared.",
    quickTxUnknownError: "Unable to save this transaction.",
    quickTxBeforePeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `This income (${incomeDate}) is before the active period (${start} ${arrow} ${end}) and will count in the previous cycle.`,
    quickTxAfterPeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `This income (${incomeDate}) is after the active period (${start} ${arrow} ${end}) and will count in the next cycle.`,
    quickTxSubmitIncome: "Save income",
    quickTxSubmitExpense: "Save expense",
    quickTxSuggestedAmounts: "Quick amounts",
    quickTxProgressLabel: "Progress",
    quickTxSelectedDateLabel: "Selected date",
    quickTxSmartCategories: "Suggested categories",
    quickTxUseLastExpense: "Reuse",
    quickTxLastExpenseLabel: "Last similar expense",
    quickTxRecurringHint: "Recurring pattern detected",
    quickTxApplyRecurring: "Apply this pattern",
    quickTxDescriptionSuggestions: "Suggested descriptions",
    quickTxAmountAnomaly: (amount: string, usual: string) =>
      `Unusual amount (${amount}). Usual amount: ${usual}.`,
    tooltipAvailableCash: "Remaining available cash not yet allocated to any envelopes.",
    tooltipPeriodExpenses: "Sum of all expenses made during the active period.",
    tooltipPeriodNet: "Total income minus all expenses in this period.",
    budgetSummaryTitle: "Period Budget Summary",
    chartSpent: "Spent",
    chartReserved: "Reserved",
    chartFree: "Free Cash",
    chartTotalResources: "Resources",
    chartTooltipSpent: "Actual expenses incurred",
    chartTooltipReserved: "Amount allocated to envelopes but not yet spent",
    chartTooltipFree: "Money available and not allocated to any envelope",
  },
  ar: {
    unknownError: "وقع مشكل غير متوقع. عاود المحاولة.",
    unknownUpdateError: "ما قدرناش نحدّثو هاد العملية.",
    invalidPeriod: "تاريخ البداية خاصو يكون قبل بزاف من تاريخ النهاية، ماشي نفس النهار.",
    incomeDeclaredTitle: "تسجّل الدخل",
    incomeDeclaredDescription: "تحدّث التذكير ديال الدخل.",
    errorTitle: "وقع مشكل. عاود المحاولة.",
    deletedTitle: "تم حذف العملية",
    deletedDescription: "تحدّثت لوحة القيادة.",
    deleteErrorTitle: "ما قدرناش نحذفو العملية.",
    sweepDoneTitle: "تم تحويل الفائض.",
    sweepDoneDescription: "تحدّثات الأرصدة.",
    sweepErrorTitle: "ما قدرناش نحولو الفائض.",
    tourOverviewTitle: "نظرة عامة",
    tourOverviewDescription:
      "هنا كتشوف الفترة الحالية والأزرار السريعة باش تزيد العمليات.",
    tourTodoTitle: "شنو خاصك دير دابا",
    tourTodoDescription: "هادشي المستعجل اللي خاصك تعالجو باش يبقى البوجي مضبوط.",
    tourAvailableTitle: "الكاش المتوفر",
    tourAvailableDescription: "هادشي اللي مازال تقدر توزّعو على الأظرفة.",
    tourExpenseTitle: "المصاريف ديال الفترة",
    tourExpenseDescription: "مجموع المصاريف المربوطة فالفترة اللي مختار.",
    tourIncomeTitle: "الدخل ديال الفترة",
    tourIncomeDescription: "مجموع الدخول اللي تسجلات فهاد الفترة.",
    tourNetTitle: "الصافي ديال الفترة",
    tourNetDescription: "الفرق بين الدخل والمصاريف فهاد الفترة.",
    tourTopTitle: "الأظرفة المهمة",
    tourTopDescription: "الأظرفة اللي باينين دابا والباقي فيهم.",
    tourRecentTitle: "آخر العمليات",
    tourRecentDescription: "راجع آخر العمليات باش تصلّح أي حاجة بسرعة.",
    tourSpendingTitle: "تفصيل الصرف حسب الأظرفة",
    tourSpendingDescription: "غرافيك وتفاصيل حسب كل ظرف باش الفهم يكون أوضح.",
    tourTrendTitle: "تطور الصافي",
    tourTrendDescription: "شوف كيفاش كيتبدل الصافي مع الوقت فالفترة المختارة.",
    tourQuickTitle: "إجراءات سريعة",
    tourQuickDescription: "أهم العمليات اللي تقدر ديرها بسرعة.",
    tourFabTitle: "اختصارات سريعة",
    tourFabDescription: "زيد دخل ولا مصروف بضغطة وحدة.",
    navDashboard: "اللائحة الجانبية — لوحة الميزانية",
    navDashboardDesc: "ترجع للوحة الميزانية فاي وقت.",
    navTransactions: "اللائحة الجانبية — العمليات",
    navTransactionsDesc: "زيد ولا راجع جميع العمليات ديالك.",
    navEnvelopes: "اللائحة الجانبية — الأظرفة",
    navEnvelopesDesc: "سيّر الأظرفة والميزانيات ديالهم.",
    navDistribution: "اللائحة الجانبية — التوزيع",
    navDistributionDesc: "وزّع الكاش المتوفر على الأظرفة.",
    navGoals: "اللائحة الجانبية — الأهداف",
    navGoalsDesc: "خطط لأهدافك وتبع التقدم ديالك.",
    navAide: "اللائحة الجانبية — المساعدة",
    navAideDesc: "لقى الشروحات والدلائل بسرعة.",
    navReports: "اللائحة الجانبية — التقارير",
    navReportsDesc: "حلل الترندات والتقارير ديالك.",
    navSettings: "اللائحة الجانبية — الإعدادات",
    navSettingsDesc: "سيّر الحساب والتفضيلات ديالك.",
    incomeDialogTitle: "مداخيل خاصك تصرح بيهم",
    incomeDialogDescription: (count: number) => `عندك ${count} دخل خاصك تصرح به.`,
    incomeDialogBody:
      "عندك تذكيرات باقين. صرّح بالدخل ديالك باش يبقى التتبع مضبوط.",
    toDeclare: "خاصو تصريح",
    hideReminder: "ما تبقاش توريني هاد الرسالة",
    ignore: "تخطي",
    declareNow: "صرّح دابا",
    periodTitle: "اختار الفترة",
    periodDescription: "اختار الفترة اللي بغيتي تحدّث بها المؤشرات. تاريخ النهاية ما كيتحسبش داخل الفترة.",
    preset7: "7 أيام",
    preset30: "30 يوم",
    preset90: "90 يوم",
    presetYtd: "من بداية العام",
    presetCustom: "مخصصة",
    start: "البداية",
    end: "النهاية",
    startPlaceholder: "تاريخ البداية",
    endPlaceholder: "تاريخ النهاية",
    selectedPeriod: "الفترة المختارة (النهاية ما داخلاش)",
    cancel: "إلغاء",
    apply: "تطبيق",
    guideTag: "دليل فلوسي",
    welcomeTitle: "مرحبا بيك فلوحة الميزانية ديالك",
    welcomeDescription:
      "هاد الدليل كيعونك تعرف البلايص المهمة. كل صفحة كتشغل الدليل ديالها غير أول مرة كتدخل ليها.",
    guideLine1: "لوحة الميزانية ← العمليات ← الأظرفة.",
    guideLine2: "التوزيع ← المساعدة ← التقارير.",
    guideLine3: "الإعدادات باش تكمل الضبط ديالك.",
    guideChip1: "ألوان وواجهة واضحة",
    guideChip2: "شروحات قصيرة",
    guideChip3: "تنقل موجه",
    guideFooter: "شروحات سريعة وواضحة باش تعاونك بلا ما تعمر عليك الصفحة.",
    skip: "تخطي",
    startTour: "بدا",
    eyebrow: "قيادة الميزانية",
    title: "لوحة الميزانية",
    subtitle: "نظرة عامة على التدفقات، الأظرفة، والحاجات المستعجلة.",
    noPeriod: "ما كايناش فترة مختارة",
    changePeriod: "بدّل الفترة",
    addExpense: "+ زيد مصروف",
    addIncome: "+ زيد دخل",
    sweepRunning: "كيتنفذ السويب...",
    sweep: "دير السويب",
    loading: "كيتحمّل...",
    todo: "شنو خاصك دير دابا",
    sweepBootstrapTitle: "⏳ باقي خاصك تصرّح بأول دخل",
    sweepBootstrapDesc:
      "صرّح بأول دخل من بعد onboarding باش تبدا الدورات من دخل حقيقي.",
    sweepBootstrapHelp:
      "وجدنا ليك التاريخ والمبلغ اللي جايين من onboarding. راجعهم وعدلهم إلا تبدلو، ومن بعد سجّل أول دخل باش تبدا الدورات.",
    sweepBootstrapAction: "صرّح بأول دخل",
    declareIncome: "صرّح بالدخل",
    declared: "تصرّح به",
    categoriesToMap: (count: number) =>
      `⚠️ عندك ${count} فئات مازال ما مربوطاش`,
    categoriesToMapDesc: "ربط هاد الفئات هو اللي كيخلي كل مصروف يبان فظرفو الصحيح.",
    categoriesToMapHelp: "دخل لصفحة الكاتيغوريات، ومن بعد اختار الظرف المناسب لكل فئة مازال ما تربطاتش.",
    mapNow: "ربط الفئات بالأظرفة دابا",
    overspentAlert: (count: number, names: string) =>
      `🔴 عندك ${count} أظرفة خارجين على الحد (${names}${count > 3 ? "..." : ""})`,
    overspentDesc: "واحد ولا أكثر من الأظرفة نزل تحت الصفر فهاد الفترة.",
    overspentHelp: "دخل للأظرفة المعنيين، ومن بعد صحح الميزانية، ولا زيد المصروف الناقص، ولا وزّع عليهم من الكاش.",
    seeAll: "شوف كاملين",
    sweepReady: "✅ تحويل الفائض واجد",
    sweepReadyDesc: "دابا تقدر تسالي هاد الفترة ويتدار التعامل مع الأرصدة المعنية.",
    sweepExecute: "نفّذ تحويل الفائض",
    executing: "كيتنفذ...",
    sweepNotDue: "🟡 تحويل الفائض: مازال ما وصلش الوقت ديالو",
    sweepNotDueDesc: "دابا ما كاين حتى إجراء خاص بتحويل الفائض.",
    sweepHelp: "تحويل الفائض ما كيتدارش حتى كتوصل نهاية الفترة وكيكون الدخل المتوقع تصرّح به.",
    availableCash: "الكاش المتوفر",
    notAllocated: "فلوس مازال ما توزعاتش",
    periodExpenses: "المصاريف ديال الفترة",
    mappedExpenses: "مصاريف مربوطة",
    unmappedSuffix: (count: number) => ` · ${count} فئات ما مربوطاش`,
    periodIncome: "الدخل ديال الفترة",
    periodNet: "الصافي ديال الفترة",
    topEnvelopes: "الأظرفة المهمة",
    allocateFunds: "وزّع الفلوس",
    viewAllEnvelopes: "شوف جميع الأظرفة",
    filterActive: "شغالين",
    filterOverspent: "خارجين على الحد",
    filterNear: "قريبين للحد",
    noEnvelopeTitle: "ما كاين حتى ظرف يبان هنا",
    noEnvelopeDescription: "زيد الأظرفة ديالك باش تبقى المتابعة واضحة.",
    spentLabel: "المصروف",
    spentFallback: "المصروف",
    recentExpenses: "آخر العمليات",
    noExpensesTitle: "ما كاين حتى مصروف فهاد الفترة",
    noExpensesDescription: "زيد مصروف باش تشوف التوزيع.",
    noRecentTitle: "ما كايناش مصاريف قريبة",
    noRecentDescription: "آخر العمليات غادي يبانوا هنا.",
    expenseFallback: "مصروف",
    unmapped: "ما مربوطش",
    mapped: "مربوط",
    edit: "بدّل",
    delete: "حذف",
    spendingByEnvelope: "تفصيل الصرف حسب الأظرفة",
    netWorthTrend: "تطور الصافي",
    quickActions: "إجراءات سريعة",
    quickAddExpense: "زيد مصروف",
    quickAllocateCash: "وزّع الفلوس",
    quickMapCategories: "ربط الفئات بالأظرفة",
    widgetCashSplit: "توزيع لكاش",
    widgetCashSplitDesc: "محاكاة مبنية على الكاش المتوفر دابا.",
    widgetPlanDirection: "اتجاه الخطة",
    widgetPlanCoverage: "تغطية التوزيع",
    widgetAutoSweep: "تحويل الفائض التلقائي",
    widgetAutoSweepOn: "مفعّل",
    widgetAutoSweepOff: "مطفّي",
    widgetOpenDistribution: "فتح التوزيع",
    widgetOpenSweeps: "فتح تحويلات الفائض",
    widgetDebt: "الديون",
    widgetGoals: "الأهداف",
    widgetMorona: "المرونة (المصاريف)",
    widgetNoPlan: "ما كايناش خطة onboarding دابا.",
    widgetFixed: "الثوابت",
    widgetDebtGoals: "الديون + الأهداف",
    widgetFlexible: "المرونة (config)",
    widgetCashLeft: "الباقي فالكاش",
    widgetRisk: "أظرفة فيها خطر",
    widgetRiskDesc: "أولوية للأظرفة القريبة للحد أو الخارجة عليه.",
    widgetRiskAllHealthy: "✅ جميع الأظرفة فحدودها — ما كاين حتى تحذير.",
    widgetDebtGoalsPressure: "ضغط الديون والأهداف",
    widgetDebtPressure: "الديون",
    widgetGoalsPressure: "الأهداف",
    widgetNoDebt: "ما لقيناش أظرفة ديون.",
    widgetNoGoals: "ما كايناش أهداف مفعلة.",
    widgetAnomalies: "أنوماليات النظام",
    widgetAnomaliesDesc: "نقاط خاصها تصحيح باش التتبع يبقى مضبوط.",
    widgetAnomalyNoConfig: "إعداد التوزيع ناقص ولا ماشي نشط.",
    widgetAnomalyNoConfigHelp: "دخل لصفحة التوزيع وحفظ إعداد نشط.",
    fabDeclareIncome: "صرّح بالدخل",
    fabDeclareExpense: "صرّح بالمصروف",
    quickTxTitle: "صرّح بعملية بسرعة",
    quickTxDescription:
      "دخل العملية مباشرة من لوحة القيادة. الدخل كيمشي للكاش، والمصروف كينقص من الظرف المربوط.",
    quickTxIncomeTab: "دخل",
    quickTxExpenseTab: "مصروف",
    quickTxAmount: "المبلغ",
    quickTxDate: "التاريخ",
    quickTxCategory: "الفئة",
    quickTxDescriptionField: "البيان",
    quickTxDescriptionPlaceholder: "اختياري (مثال: الماكلة، سالير...)",
    quickTxSelectCategory: "اختار فئة",
    quickTxMappedTo: (name: string) => `التأثير على الظرف: ${name}`,
    quickTxNoIncomeCategories:
      "ما لقيناش فئة دخل. زيد فئة دخل قبل ما تكمل.",
    quickTxNoExpenseCategories:
      "ما كايناش فئة مصروف مربوطة. ربط فئة بظرف باش تقدر تكمل.",
    quickTxAmountRequired: "المبلغ ضروري.",
    quickTxCategoryRequired: "الفئة ضرورية.",
    quickTxSavedIncome: "تصرّح بالدخل.",
    quickTxSavedExpense: "تصرّح بالمصروف.",
    quickTxUnknownError: "ما قدرناش نسجلو هاد العملية.",
    quickTxBeforePeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `هاد الدخل (${incomeDate}) قبل الفترة النشيطة (${start} ${arrow} ${end}) وغادي يتحسب فالدورة اللي فاتت.`,
    quickTxAfterPeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `هاد الدخل (${incomeDate}) من بعد الفترة النشيطة (${start} ${arrow} ${end}) وغادي يتحسب فالدورة الجاية.`,
    quickTxSubmitIncome: "حفظ الدخل",
    quickTxSubmitExpense: "حفظ المصروف",
    quickTxSuggestedAmounts: "مبالغ سريعة",
    quickTxProgressLabel: "نسبة الإكمال",
    quickTxSelectedDateLabel: "التاريخ المختار",
    quickTxSmartCategories: "فئات مقترحة",
    quickTxUseLastExpense: "استعمال نفس الشي",
    quickTxLastExpenseLabel: "آخر مصروف مشابه",
    quickTxRecurringHint: "لقينا هاد العملية كتعاود",
    quickTxApplyRecurring: "طبّق هاد العادة",
    quickTxDescriptionSuggestions: "أوصاف مقترحة",
    quickTxAmountAnomaly: (amount: string, usual: string) =>
      `المبلغ غير معتاد (${amount}). المبلغ المعتاد: ${usual}.`,
    tooltipAvailableCash: "الفلوس السائلة اللي باقا ومازال ما تفرقاتش على الأظرفة.",
    tooltipPeriodExpenses: "مجموع كاع المصاريف اللي تقيدو فهاد الفترة.",
    tooltipPeriodNet: "المداخيل كاملة ناقص كاع المصاريف ديال هاد الفترة.",
    budgetSummaryTitle: "ملخص ميزانية الفترة",
    chartSpent: "مخسور",
    chartReserved: "مخصص",
    chartFree: "فلوس حرة",
    chartTotalResources: "الموارد",
    chartTooltipSpent: "المصاريف الحقيقية اللي تخلصات",
    chartTooltipReserved: "المبالغ المخصصة للأظرفة واللي مازال ما تخسراتش",
    chartTooltipFree: "الفلوس اللي باقة ومامخصصة لحتى شي ظرف",
  },
};

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
function DashboardContent() {
  const { openQuickTx } = useQuickTx();
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [data, setData] = useState<DashboardOut | null>(null);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [manualUnmappedCount, setManualUnmappedCount] = useState(0);
  const [goals, setGoals] = useState<GoalOut[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [cashSplitPreview, setCashSplitPreview] =
    useState<DistributionSimulateOut | null>(null);
  // Distribution config is always available (unlike cashSplitPreview which
  // requires available_to_allocate > 0). Used to identify fixed-expense envelopes.
  const [distributionConfig, setDistributionConfig] =
    useState<DistributionConfigOut | null>(null);
  const [latestOnboardingRecord, setLatestOnboardingRecord] =
    useState<OnboardingV2RecordOut | null>(null);
  const [autoSweepEnabled, setAutoSweepEnabled] = useState<boolean | null>(null);
  const [incomeReminders, setIncomeReminders] = useState<IncomeReminderOut[]>([]);
  const [trendPoints, setTrendPoints] = useState<
    { period: string; closing: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dismissedIncomeReminderIds, setDismissedIncomeReminderIds] = useState<
    string[]
  >([]);
  const [incomeReminderDialogOpen, setIncomeReminderDialogOpen] =
    useState(false);
  const [incomeReminderDialogAsked, setIncomeReminderDialogAsked] =
    useState(false);
  const [dontShowIncomeReminder, setDontShowIncomeReminder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransactionOut | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [runningSweep, setRunningSweep] = useState(false);
  const [envelopeFilter, setEnvelopeFilter] = useState<
    "active" | "overspent" | "near"
  >("active");
  const [showAllEnvelopes, setShowAllEnvelopes] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [periodRange, setPeriodRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [currentCycleData, setCurrentCycleData] = useState<DashboardOut | null>(null);
  const currentCycleDataRef = useRef<DashboardOut | null>(null);
  const lastPeriodQueryRef = useRef("");
  const updateCurrentCycleData = useCallback((val: DashboardOut | null) => {
    setCurrentCycleData(val);
    currentCycleDataRef.current = val;
  }, []);


  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<
    "7d" | "30d" | "90d" | "ytd" | "custom"
  >("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [sweepInfoOpen, setSweepInfoOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [introSeen, setIntroSeen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(DASHBOARD_INTRO_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [toursDisabledGlobally, setToursDisabledGlobally] = useState<boolean>(() =>
    areToursGloballyDisabled()
  );
  const headerRef = useRef<HTMLDivElement | null>(null);
  const todoRef = useRef<HTMLDivElement | null>(null);
  const kpiAvailableRef = useRef<HTMLDivElement | null>(null);
  const kpiExpenseRef = useRef<HTMLDivElement | null>(null);
  const kpiIncomeRef = useRef<HTMLDivElement | null>(null);
  const kpiNetRef = useRef<HTMLDivElement | null>(null);
  const envelopesRef = useRef<HTMLDivElement | null>(null);
  const recentRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const quickRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLDivElement | null>(null);
  const navDashboardRef = useRef<HTMLElement | null>(null);
  const navTransactionsRef = useRef<HTMLElement | null>(null);
  const navEnvelopesRef = useRef<HTMLElement | null>(null);
  const navDistributionRef = useRef<HTMLElement | null>(null);
  const navGoalsRef = useRef<HTMLElement | null>(null);
  const navAideRef = useRef<HTMLElement | null>(null);
  const navReportsRef = useRef<HTMLElement | null>(null);
  const navSettingsRef = useRef<HTMLElement | null>(null);
  const loadSequenceRef = useRef(0);
  const deferredLoadTimerRef = useRef<number | null>(null);
  const copy = DASHBOARD_COPY[locale];
  const isPostOnboardingEntry =
    searchParams.get("post_onboarding") === "1" ||
    searchParams.get("post_register") === "1";
  const shouldShowNextStepCard =
    isPostOnboardingEntry ||
    !introSeen ||
    (transactions.length === 0 && (data?.envelopes?.length ?? 0) <= 2);
  const nextStepCopy =
    locale === "ar"
      ? {
          title: "الخطوة الجاية",
          body: "باش تكمل البداية بسرعة، دير هاد 3 خطوات:",
          tx: "زيد أول عملية",
          env: "راجع الأظرفة",
          smart: "كمّل الإعدادات الذكية",
        }
      : locale === "fr"
      ? {
          title: "Prochaine étape",
          body: "Pour bien démarrer après onboarding, fais ces 3 actions:",
          tx: "Ajouter une première opération",
          env: "Revoir les enveloppes",
          smart: "Régler les paramètres intelligents",
        }
      : {
          title: "Next step",
          body: "To complete onboarding cleanly, do these 3 actions:",
          tx: "Add your first transaction",
          env: "Review envelopes",
          smart: "Set smart settings",
        };
  const pageDir = getLocaleDirection(locale);
  const periodArrow = pageDir === "rtl" ? "←" : "→";
  const titleClass = locale === "ar" ? "dashboard-title" : "app-display-font";
  const copyClass = locale === "ar" ? "dashboard-copy" : "";

  const periodQuery = periodRange
    ? `?start=${periodRange.start}&end=${periodRange.end}`
    : "";
  const transactionsQuery = periodQuery
    ? `/transactions${periodQuery}`
    : "/transactions?limit=25";

  const quickTxPreferenceKey = useMemo(() => {
    if (!data?.user?.id) return null;
    return `floussy.quickTx.expensePreference:${data.user.id}:v1`;
  }, [data?.user?.id]);

  const activePeriod = useMemo(() => {
    if (periodRange) return periodRange;
    if (data?.current_period) {
      return {
        start: data.current_period.start,
        end: data.current_period.end,
      };
    }
    return null;
  }, [periodRange, data]);

  const incomeReminderDismissKey = useMemo(() => {
    if (!data?.user?.id) return null;
    return `dismissed:${INCOME_REMINDER_POPUP_ID}:${data.user.id}:v1`;
  }, [data]);

  const computedPeriodRange = useMemo(() => {
    const today = getLocalTodayISO();
    const end = addDays(today, 1);
    if (periodPreset === "7d") return { start: addDays(end, -7), end };
    if (periodPreset === "30d") return { start: addDays(end, -30), end };
    if (periodPreset === "90d") return { start: addDays(end, -90), end };
    if (periodPreset === "ytd") return { start: startOfYear(today), end };
    return { start: customStart || today, end: customEnd || end };
  }, [periodPreset, customStart, customEnd]);

  const loadData = useCallback(async (forceRefreshCurrentCycle = false) => {
    const loadSequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = loadSequence;
    if (deferredLoadTimerRef.current) {
      window.clearTimeout(deferredLoadTimerRef.current);
      deferredLoadTimerRef.current = null;
    }
    setLoading(true);
    setError(null);
    try {
      const isFiltered = Boolean(periodQuery && periodQuery !== "");
      const filterChanged = lastPeriodQueryRef.current !== periodQuery;
      lastPeriodQueryRef.current = periodQuery;

      const shouldFetchCurrentCycle = !currentCycleDataRef.current || forceRefreshCurrentCycle;

      const [dash, currentCycleDash] = await Promise.all([
        fetchDashboard(`/dashboard${periodQuery}`),
        (shouldFetchCurrentCycle && isFiltered) ? fetchDashboard() : Promise.resolve(null),
      ]);

      if (loadSequenceRef.current !== loadSequence) return;
      setData(dash);
      if (isFiltered) {
        if (currentCycleDash) {
          updateCurrentCycleData(currentCycleDash);
        }
      } else {
        updateCurrentCycleData(dash);
      }
      setLoading(false);

      const criticalResults = await Promise.allSettled([
        apiFetch<CategoryOut[]>("/categories"),
        apiFetch<GoalOut[]>("/goals"),
        apiFetch<TransactionOut[]>(transactionsQuery),
        apiFetch<SettingsResponse>("/users/me/settings"),
      ]);

      const catsResult = criticalResults[0];
      const goalsResult = criticalResults[1];
      const txsResult = criticalResults[2];
      const settingsResult = criticalResults[3];

      if (catsResult.status === "fulfilled") {
        setCategories(catsResult.value);
      }
      if (goalsResult.status === "fulfilled") {
        setGoals(goalsResult.value);
      }
      if (txsResult.status === "fulfilled") {
        setTransactions(txsResult.value);
      }
      if (settingsResult.status === "fulfilled") {
        setAutoSweepEnabled(settingsResult.value.auto_sweep_enabled);
      } else {
        setAutoSweepEnabled(null);
      }

      deferredLoadTimerRef.current = window.setTimeout(() => {
        void Promise.allSettled([
          apiFetch<CategoryEnvelopeMapOut[]>("/mappings"),
          apiFetch<IncomeReminderOut[]>("/income-reminders"),
          apiFetch<DashboardTrendPointOut[]>("/dashboard/trend?limit=6"),
          apiFetch<CategoryOut[]>("/categories/unmapped-manual"),
          apiFetch<OnboardingV2RecordOut[]>("/users/me/onboarding-v2-records?limit=1"),
          apiFetch<DistributionConfigOut>("/distribution/config"),
        ]).then((results) => {
          if (loadSequenceRef.current !== loadSequence) return;

          const mappingsResult = results[0];
          const remindersResult = results[1];
          const trendResult = results[2];
          const manualUnmappedResult = results[3];
          const onboardingResult = results[4];
          const distributionConfigResult = results[5];

          if (mappingsResult.status === "fulfilled") {
            const mappingMap = mappingsResult.value.reduce<Record<string, string>>(
              (acc, item) => ({
                ...acc,
                [item.category_id]: item.envelope_id,
              }),
              {}
            );
            setMappings(mappingMap);
          }
          if (remindersResult.status === "fulfilled") {
            setIncomeReminders(remindersResult.value);
          }
          if (trendResult.status === "fulfilled") {
            setTrendPoints(
              trendResult.value.map((point) => ({
                period: point.period_start,
                closing: Number(point.net_worth),
              }))
            );
          }
          if (manualUnmappedResult.status === "fulfilled") {
            setManualUnmappedCount(manualUnmappedResult.value.length);
          }
          if (onboardingResult.status === "fulfilled") {
            setLatestOnboardingRecord(onboardingResult.value[0] ?? null);
          } else {
            setLatestOnboardingRecord(null);
          }
          if (distributionConfigResult.status === "fulfilled") {
            setDistributionConfig(distributionConfigResult.value);
          }
        });
      }, 250);

      try {
        const availableAmount = Number(dash.available_to_allocate ?? 0);
        if (Number.isFinite(availableAmount) && availableAmount > 0) {
          const split = await apiFetch<DistributionSimulateOut>("/distribution/simulate", {
            method: "POST",
            body: {
              income_amount: availableAmount.toFixed(2),
              use_cash_available: false,
            },
          });
          setCashSplitPreview(split);
        } else {
          setCashSplitPreview(null);
        }
      } catch {
        setCashSplitPreview(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [periodQuery, transactionsQuery, copy.unknownError]);

  const handleApplyPeriod = () => {
    const nextRange = computedPeriodRange;
    if (new Date(nextRange.start) >= new Date(nextRange.end)) {
      setPeriodError(copy.invalidPeriod);
      return;
    }
    setPeriodRange(nextRange);
    try {
      localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify(nextRange));
    } catch {
      // ignore
    }
    router.push(`${pathname}?start=${nextRange.start}&end=${nextRange.end}`);
    setPeriodDialogOpen(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (deferredLoadTimerRef.current) {
        window.clearTimeout(deferredLoadTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    };
  }, []);


  useEffect(() => {
    if (!mounted) return;
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    if (startParam && endParam) {
      const sameAsCurrent =
        periodRange?.start === startParam && periodRange?.end === endParam;
      if (!sameAsCurrent) {
        setPeriodRange({ start: startParam, end: endParam });
      }
      try {
        localStorage.setItem(
          PERIOD_STORAGE_KEY,
          JSON.stringify({ start: startParam, end: endParam })
        );
      } catch {
        // ignore
      }
      return;
    }
    try {
      const stored = localStorage.getItem(PERIOD_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { start?: string; end?: string };
      if (parsed?.start && parsed?.end) {
        const sameAsCurrent =
          periodRange?.start === parsed.start && periodRange?.end === parsed.end;
        if (!sameAsCurrent) {
          setPeriodRange({ start: parsed.start, end: parsed.end });
        }
        const sameAsUrl =
          startParam === parsed.start && endParam === parsed.end;
        if (!sameAsUrl) {
          router.replace(
            `${pathname}?start=${parsed.start}&end=${parsed.end}`
          );
        }
      } else {
        localStorage.removeItem(PERIOD_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(PERIOD_STORAGE_KEY);
    }
  }, [mounted, pathname, periodRange?.end, periodRange?.start, router, searchParams]);

  useEffect(() => {
    if (!mounted || !incomeReminderDismissKey) return;
    try {
      const stored =
        localStorage.getItem(incomeReminderDismissKey) ??
        localStorage.getItem("floussy.dismissedIncomeReminders.v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDismissedIncomeReminderIds(parsed);
          localStorage.setItem(
            incomeReminderDismissKey,
            JSON.stringify(parsed)
          );
        } else {
          localStorage.removeItem(incomeReminderDismissKey);
        }
      }
      localStorage.removeItem("floussy.dismissedIncomeReminders.v1");
    } catch {
      localStorage.removeItem(incomeReminderDismissKey);
      localStorage.removeItem("floussy.dismissedIncomeReminders.v1");
    }
  }, [mounted, incomeReminderDismissKey]);

  useEffect(() => {
    if (incomeReminderDialogOpen) {
      setDontShowIncomeReminder(false);
    }
  }, [incomeReminderDialogOpen]);



  const currentPeriod = activePeriod;

  const periodIncomeTransactions = useMemo(() => {
    if (!currentPeriod) return [] as TransactionOut[];
    return transactions.filter(
      (tx) =>
        tx.type === "income" &&
        tx.occurred_on >= currentPeriod.start &&
        tx.occurred_on < currentPeriod.end
    );
  }, [transactions, currentPeriod]);

  const periodExpenseMappedTransactions = useMemo(() => {
    if (!currentPeriod) return [] as TransactionOut[];
    return transactions.filter(
      (tx) =>
        tx.type === "expense" &&
        tx.occurred_on >= currentPeriod.start &&
        tx.occurred_on < currentPeriod.end &&
        Boolean(tx.envelope_movement)
    );
  }, [transactions, currentPeriod]);

  const incomeTotal = Number(data?.period_income ?? 0);
  const expenseTotal = Number(data?.period_expenses_mapped ?? 0);
  const netTotal = Number(data?.period_net ?? 0);
  const kpiHasActivity =
    incomeTotal > 0 || expenseTotal > 0 || periodIncomeTransactions.length > 0 || periodExpenseMappedTransactions.length > 0;
  const isKpiStartState =
    !kpiHasActivity &&
    Number(data?.available_to_allocate ?? 0) === 0 &&
    Number(data?.cash_balance ?? 0) === 0;

  const lastActivityLabel = useMemo(() => {
    if (!kpiHasActivity) {
      if (locale === "ar") return "آخر عملية: ما كايناش";
      if (locale === "fr") return "Dernière opération: aucune";
      return "Last activity: none";
    }
    const latest = [...periodIncomeTransactions, ...periodExpenseMappedTransactions]
      .map((tx) => tx.occurred_on)
      .sort()
      .at(-1);
    if (!latest) {
      if (locale === "ar") return "آخر عملية: ما كايناش";
      if (locale === "fr") return "Dernière opération: aucune";
      return "Last activity: none";
    }
    const formatted = formatLocaleDate(latest, locale);
    if (locale === "ar") return `آخر عملية: ${formatted}`;
    if (locale === "fr") return `Dernière opération: ${formatted}`;
    return `Last activity: ${formatted}`;
  }, [kpiHasActivity, locale, periodExpenseMappedTransactions, periodIncomeTransactions]);

  const unmappedCount = manualUnmappedCount;

  const overspentEnvelopes = useMemo(() => {
    if (!data) return [] as string[];
    return data.envelopes
      .filter((item) => Number(item.balance.closing_balance) < 0)
      .map((item) => localizeSystemEnvelopeName(item.envelope.name, locale));
  }, [data, locale]);

  const sweepStatus = currentCycleData?.sweep_status ?? null;
  const sweepBootstrap = currentCycleData?.sweep_bootstrap ?? null;
  const needsFirstIncomeDeclaration = Boolean(
    sweepBootstrap?.needs_first_income_declaration
  );
  const sweepDue = !needsFirstIncomeDeclaration && Boolean(sweepStatus?.due);
  const bootstrapIncomeHref = useMemo(
    () =>
      buildIncomeTransactionHref({
        bootstrapDate: sweepBootstrap?.last_income_date ?? null,
        bootstrapAmount:
          sweepBootstrap?.last_income_amount ??
          sweepBootstrap?.expected_income_amount ??
          null,
      }),
    [sweepBootstrap]
  );

  const dueIncomeReminders = useMemo(() => {
    const today = getLocalTodayISO();
    return incomeReminders.filter(
      (reminder) =>
        reminder.is_active &&
        reminder.next_due_on &&
        reminder.next_due_on <= today
    );
  }, [incomeReminders]);

  const dueVisibleIncomeReminders = useMemo(
    () =>
      dueIncomeReminders.filter(
        (reminder) => !dismissedIncomeReminderIds.includes(reminder.id)
      ),
    [dueIncomeReminders, dismissedIncomeReminderIds]
  );

  useEffect(() => {
    if (loading || !mounted) return;
    if (!incomeReminderDialogAsked && dueVisibleIncomeReminders.length > 0) {
      setIncomeReminderDialogOpen(true);
      setIncomeReminderDialogAsked(true);
    }
  }, [
    loading,
    mounted,
    incomeReminderDialogAsked,
    dueVisibleIncomeReminders.length,
  ]);


  const persistDismissedReminders = (ids: string[]) => {
    setDismissedIncomeReminderIds(ids);
    if (!incomeReminderDismissKey) return;
    localStorage.setItem(incomeReminderDismissKey, JSON.stringify(ids));
  };

  const handleDismissIncomeReminder = () => {
    if (dontShowIncomeReminder) {
      const newIds = Array.from(
        new Set([
          ...dismissedIncomeReminderIds,
          ...dueVisibleIncomeReminders.map((reminder) => reminder.id),
        ])
      );
      persistDismissedReminders(newIds);
    }
    setIncomeReminderDialogOpen(false);
  };

  const handleGoDeclareIncome = () => {
    const reminderIdsToMark = dueVisibleIncomeReminders.map((reminder) => reminder.id);
    if (dontShowIncomeReminder) {
      const newIds = Array.from(
        new Set([
          ...dismissedIncomeReminderIds,
          ...dueVisibleIncomeReminders.map((reminder) => reminder.id),
        ])
      );
      persistDismissedReminders(newIds);
    }
    setIncomeReminderDialogOpen(false);
    openQuickTransactionDialog("income", {
      bootstrapDate: sweepBootstrap?.last_income_date ?? null,
      bootstrapAmount:
        sweepBootstrap?.last_income_amount ??
        sweepBootstrap?.expected_income_amount ??
        null,
      reminderIdsToMark,
    });
  };

  const spendingByEnvelope = useMemo(() => {
    if (!data) return [] as EnvelopeSpend[];
    return data.spending_by_envelope.map((item) => ({
      name: localizeSystemEnvelopeName(item.envelope_name, locale),
      total: Number(item.total),
    }));
  }, [data, locale]);

  const sortedTrends = useMemo(() => {
    return [...trendPoints].sort((a, b) => a.period.localeCompare(b.period));
  }, [trendPoints]);

  const showTodoSection =
    needsFirstIncomeDeclaration ||
    unmappedCount > 0 ||
    overspentEnvelopes.length > 0 ||
    sweepDue ||
    dueIncomeReminders.length > 0;
  const hideDashboardDetailsUntilFirstIncome = needsFirstIncomeDeclaration;

  const txCountsByCategory = useMemo(() => {
    const counts = new Map<string, { income: number; expense: number }>();
    transactions.forEach((tx) => {
      const current = counts.get(tx.category_id) ?? { income: 0, expense: 0 };
      if (tx.type === "income") current.income += 1;
      if (tx.type === "expense") current.expense += 1;
      counts.set(tx.category_id, current);
    });
    return counts;
  }, [transactions]);

  const categoryKindById = useMemo(() => {
    const map = new Map<string, "income" | "expense" | "mixed">();
    categories.forEach((cat) => {
      const counts = txCountsByCategory.get(cat.id);
      if (counts) {
        const incomeCount = counts.income;
        const expenseCount = counts.expense;
        if (incomeCount > 0 && expenseCount > 0) {
          map.set(
            cat.id,
            incomeCount === expenseCount
              ? "mixed"
              : incomeCount > expenseCount
              ? "income"
              : "expense"
          );
        } else {
          map.set(cat.id, incomeCount > 0 ? "income" : "expense");
        }
      } else {
        map.set(cat.id, detectKindFromName(cat.name));
      }
    });
    return map;
  }, [categories, txCountsByCategory]);

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

  const expenseCategories = useMemo(
    () =>
      categories.filter(
        (cat) =>
          categoryKindById.get(cat.id) !== "income" && mappedCategoryIds.has(cat.id)
      ),
    [categories, categoryKindById, mappedCategoryIds]
  );

  const openQuickTransactionDialog = useCallback(
    (
      type: "income" | "expense",
      options?: {
        bootstrapDate?: string | null;
        bootstrapAmount?: string | null;
        reminderIdsToMark?: string[];
      }
    ) => {
      openQuickTx(type, options);
    },
    [openQuickTx]
  );

  useEffect(() => {
    if (!mounted) return;
    if (searchParams.get("quick_tx_resume") === "income") {
      openQuickTx("income");
    }
  }, [mounted, searchParams, openQuickTx]);

  const tourSteps = useMemo<TourStep[]>(() => {
    const steps: TourStep[] = [
      {
        title: copy.tourOverviewTitle,
        description: copy.tourOverviewDescription,
        ref: headerRef,
      },
    ];
    if (showTodoSection) {
      steps.push({
        title: copy.tourTodoTitle,
        description: copy.tourTodoDescription,
        ref: todoRef,
      });
    }
    if (data) {
      steps.push(
        {
          title: copy.tourAvailableTitle,
          description: copy.tourAvailableDescription,
          ref: kpiAvailableRef,
        },
        {
          title: copy.tourExpenseTitle,
          description: copy.tourExpenseDescription,
          ref: kpiExpenseRef,
        },
        {
          title: copy.tourIncomeTitle,
          description: copy.tourIncomeDescription,
          ref: kpiIncomeRef,
        },
        {
          title: copy.tourNetTitle,
          description: copy.tourNetDescription,
          ref: kpiNetRef,
        }
      );
    }
    steps.push({
      title: copy.tourTopTitle,
      description: copy.tourTopDescription,
      ref: envelopesRef,
    });
    steps.push({
      title: copy.tourRecentTitle,
      description: copy.tourRecentDescription,
      ref: recentRef,
    });
    steps.push({
      title: copy.budgetSummaryTitle,
      description: copy.tourSpendingDescription,
      ref: summaryRef,
    });
    steps.push({
      title: copy.tourQuickTitle,
      description: copy.tourQuickDescription,
      ref: quickRef,
    });
    if (mounted) {
      steps.push({
        title: copy.tourFabTitle,
        description: copy.tourFabDescription,
        ref: fabRef,
      });
    }
    steps.push(
      {
        title: copy.navDashboard,
        description: copy.navDashboardDesc,
        ref: navDashboardRef,
        selector: "[data-tour=\"nav-dashboard\"]",
      },
      {
        title: copy.navTransactions,
        description: copy.navTransactionsDesc,
        ref: navTransactionsRef,
        selector: "[data-tour=\"nav-transactions\"]",
      },
      {
        title: copy.navEnvelopes,
        description: copy.navEnvelopesDesc,
        ref: navEnvelopesRef,
        selector: "[data-tour=\"nav-envelopes\"]",
      },
      {
        title: copy.navDistribution,
        description: copy.navDistributionDesc,
        ref: navDistributionRef,
        selector: "[data-tour=\"nav-distribution\"]",
      },
      {
        title: copy.navGoals,
        description: copy.navGoalsDesc,
        ref: navGoalsRef,
        selector: "[data-tour=\"nav-goals\"]",
      },
      {
        title: copy.navAide,
        description: copy.navAideDesc,
        ref: navAideRef,
        selector: "[data-tour=\"nav-aide\"]",
      },
      {
        title: copy.navReports,
        description: copy.navReportsDesc,
        ref: navReportsRef,
        selector: "[data-tour=\"nav-reports\"]",
      },
      {
        title: copy.navSettings,
        description: copy.navSettingsDesc,
        ref: navSettingsRef,
        selector: "[data-tour=\"nav-settings\"]",
      }
    );
    return steps;
  }, [copy, data, showTodoSection, spendingByEnvelope.length, trendPoints.length, mounted]);

  const {
    isActive: tourActive,
    step: tourStep,
    stepIndex: tourStepIndex,
    total: tourTotal,
    startTour,
    goNext,
    goPrevious,
    canGoPrevious,
    skipTour,
    isDone: tourDone,
  } = useGlobalTour("dashboard", tourSteps, { autoStart: false });

  const handleStartTour = () => {
    if (toursDisabledGlobally) return;
    setIntroOpen(false);
    setIntroSeen(true);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(DASHBOARD_INTRO_SEEN_KEY, "1");
      } catch {
        // Ignore storage write failures.
      }
    }
    startTour();
  };

  const handleSkipIntro = () => {
    setIntroOpen(false);
    setIntroSeen(true);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(DASHBOARD_INTRO_SEEN_KEY, "1");
      } catch {
        // Ignore storage write failures.
      }
    }
  };

  useEffect(() => {
    const sync = () => setToursDisabledGlobally(areToursGloballyDisabled());
    sync();
    if (typeof window === "undefined") return;
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    if (toursDisabledGlobally) {
      setIntroOpen(false);
      return;
    }
    if (tourActive) {
      setIntroOpen(false);
      return;
    }
    setIntroOpen(!tourDone && !introSeen);
  }, [tourActive, tourDone, introSeen, toursDisabledGlobally]);

  useEffect(() => {
    navDashboardRef.current = null;
    navTransactionsRef.current = null;
    navEnvelopesRef.current = null;
    navDistributionRef.current = null;
    navAideRef.current = null;
    navReportsRef.current = null;
    navSettingsRef.current = null;
  }, []);

  const envelopeRows = useMemo(() => {
    if (!data) return [];
    return data.envelopes
      .map((item) => {
        const remaining = Number(item.balance.closing_balance);
        const allocated =
          Number(item.balance.opening_balance) +
          Number(item.balance.total_allocations);
        const spent = Number(item.balance.total_spent);
        const isOverspent = remaining < 0;
        const nearLimit =
          !isOverspent && allocated > 0 && remaining / allocated <= 0.2;
        const isCash = Boolean(item.envelope.is_cash);
        const isSavings = Boolean(item.envelope.is_default_savings);
        const isDebt = Boolean(item.envelope.is_debt);
        const isGoal = Boolean(item.envelope.is_goal);
        const status: "overspent" | "near" | "healthy" =
          isOverspent ? "overspent" : nearLimit ? "near" : "healthy";
        return {
          id: item.envelope.id,
          name: localizeSystemEnvelopeName(item.envelope.name, locale),
          remaining,
          spent,
          allocated,
          isOverspent,
          nearLimit,
          status,
          isCash,
          isSavings,
          isDebt,
          isGoal,
        };
      })
      .sort((a, b) => {
        if (a.isOverspent !== b.isOverspent) {
          return a.isOverspent ? -1 : 1;
        }
        if (a.nearLimit !== b.nearLimit) {
          return a.nearLimit ? -1 : 1;
        }
        if (a.spent !== b.spent) {
          return b.spent - a.spent;
        }
        return a.remaining - b.remaining;
      });
  }, [data, locale]);

  const focusEnvelopeRows = useMemo(
    () => envelopeRows.filter((item) => !item.isCash && !item.isSavings),
    [envelopeRows]
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    const spentVal = expenseTotal;
    const reservedVal = envelopeRows.reduce((sum, env) => sum + Math.max(0, env.remaining), 0);
    const freeVal = Number(data.available_to_allocate || 0);
    const total = spentVal + reservedVal + freeVal;

    if (total === 0) {
      return [
        {
          name: copy.chartFree,
          value: 1,
          percentage: 0,
          color: "var(--border, #cbd5e1)",
          tooltip: copy.chartTooltipFree
        }
      ];
    }

    return [
      {
        name: copy.chartSpent,
        value: spentVal,
        percentage: total > 0 ? (spentVal / total) * 100 : 0,
        color: "var(--accent-error, #ef4444)",
        tooltip: copy.chartTooltipSpent
      },
      {
        name: copy.chartReserved,
        value: reservedVal,
        percentage: total > 0 ? (reservedVal / total) * 100 : 0,
        color: "var(--accent-strong, #6366f1)",
        tooltip: copy.chartTooltipReserved
      },
      {
        name: copy.chartFree,
        value: freeVal,
        percentage: total > 0 ? (freeVal / total) * 100 : 0,
        color: "var(--accent-success, #10b981)",
        tooltip: copy.chartTooltipFree
      }
    ].filter(item => item.value > 0);
  }, [data, expenseTotal, envelopeRows, copy, locale]);

  const totalBudget = useMemo(() => {
    if (!data) return 0;
    const spentVal = expenseTotal;
    const reservedVal = envelopeRows.reduce((sum, env) => sum + Math.max(0, env.remaining), 0);
    const freeVal = Number(data.available_to_allocate || 0);
    return spentVal + reservedVal + freeVal;
  }, [data, expenseTotal, envelopeRows]);

  const topEnvelopes = useMemo(() => {
    let filtered = focusEnvelopeRows;
    if (envelopeFilter === "overspent") {
      filtered = filtered.filter((item) => item.isOverspent);
    }
    if (envelopeFilter === "near") {
      filtered = filtered.filter((item) => item.nearLimit);
    }
    if (envelopeFilter === "active") {
      filtered = filtered.filter((item) => !item.isOverspent);
    }
    return filtered.slice(0, 5);
  }, [focusEnvelopeRows, envelopeFilter]);

  const pinnedDebtEnvelope = useMemo(
    () =>
      focusEnvelopeRows.find((item) => item.isDebt) ?? null,
    [focusEnvelopeRows]
  );

  const statusMeta = (status: "overspent" | "near" | "healthy") => {
    if (locale === "ar") {
      if (status === "overspent") return { tone: "error" as const, label: "خارج الحد" };
      if (status === "near") return { tone: "warning" as const, label: "قريب للحد" };
      return { tone: "success" as const, label: "مريح" };
    }
    if (locale === "fr") {
      if (status === "overspent") return { tone: "error" as const, label: "Dépassée" };
      if (status === "near") return { tone: "warning" as const, label: "Près de la limite" };
      return { tone: "success" as const, label: "Stable" };
    }
    if (status === "overspent") return { tone: "error" as const, label: "Overspent" };
    if (status === "near") return { tone: "warning" as const, label: "Near limit" };
    return { tone: "success" as const, label: "Healthy" };
  };

  const sectionHasOnlyZeroState = useMemo(
    () => focusEnvelopeRows.length > 0 && focusEnvelopeRows.every((item) => item.spent === 0 && item.remaining === 0),
    [focusEnvelopeRows]
  );
  const debtEnvelopeIdSet = useMemo(
    () => new Set(focusEnvelopeRows.filter((item) => item.isDebt).map((item) => item.id)),
    [focusEnvelopeRows]
  );

  const cashSplitLayerTotals = useMemo(() => {
    const items = cashSplitPreview?.items ?? [];
    const fixed = items
      .filter(
        (item) =>
          isFixedMode(item.mode) &&
          item.target_type === "envelope" &&
          !debtEnvelopeIdSet.has(item.target_id)
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const debtGoals = items
      .filter(
        (item) =>
          isFixedMode(item.mode) &&
          (item.target_type === "goal" ||
            (item.target_type === "envelope" && debtEnvelopeIdSet.has(item.target_id)))
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const flexible = items
      .filter((item) => isPercentMode(item.mode))
      .reduce((sum, item) => sum + Number(item.amount), 0);
    return {
      fixed,
      debtGoals,
      flexible,
      cashLeft: Number(cashSplitPreview?.cash_after ?? 0),
    };
  }, [cashSplitPreview, debtEnvelopeIdSet]);

  const riskEnvelopes = useMemo(() => {
    return focusEnvelopeRows
      .filter((item) => item.isOverspent || item.nearLimit)
      .sort((a, b) => {
        if (a.isOverspent !== b.isOverspent) return a.isOverspent ? -1 : 1;
        if (a.allocated === b.allocated) return a.remaining - b.remaining;
        const ratioA = a.allocated > 0 ? a.remaining / a.allocated : 1;
        const ratioB = b.allocated > 0 ? b.remaining / b.allocated : 1;
        return ratioA - ratioB;
      })
      .slice(0, 5);
  }, [focusEnvelopeRows]);

  const debtPressureTotals = useMemo(() => {
    const debtItems = (cashSplitPreview?.items ?? []).filter(
      (item) =>
        item.mode === "fixed" &&
        item.target_type === "envelope" &&
        debtEnvelopeIdSet.has(item.target_id)
    );
    return {
      monthlyAllocation: debtItems.reduce((sum, item) => sum + Number(item.amount), 0),
      rulesCount: debtItems.length,
    };
  }, [cashSplitPreview, debtEnvelopeIdSet]);

  const goalsPressureTotals = useMemo(() => {
    return goals.reduce(
      (acc, goal) => {
        const target = Number(goal.target_amount || 0);
        const current = Number(goal.current_balance || 0);
        acc.target += target;
        acc.current += Math.min(current, target > 0 ? target : current);
        return acc;
      },
      { target: 0, current: 0 }
    );
  }, [goals]);
  const goalsCompletionPct =
    goalsPressureTotals.target > 0
      ? Math.max(0, Math.min(100, (goalsPressureTotals.current / goalsPressureTotals.target) * 100))
      : 0;
  const latestDraftObjects = useMemo(() => {
    const payload = latestOnboardingRecord?.payload;
    if (!payload || typeof payload !== "object") return null;
    const draftObjects = (payload as { draft_objects?: DraftObjectRecord }).draft_objects;
    return draftObjects && typeof draftObjects === "object" ? draftObjects : null;
  }, [latestOnboardingRecord]);

  const contributionPlan = useMemo(() => {
    const value = latestDraftObjects?.contribution_plan_v1;
    return value && typeof value === "object" ? (value as DraftObjectRecord) : null;
  }, [latestDraftObjects]);

  const selectedModeValues = useMemo(() => {
    if (!contributionPlan) return null;
    const selectedMode =
      typeof contributionPlan.selected_mode === "string"
        ? contributionPlan.selected_mode
        : "";
    const modes = Array.isArray(contributionPlan.modes)
      ? (contributionPlan.modes as DraftObjectRecord[])
      : [];
    return (
      modes.find((item) => String(item.mode ?? "") === selectedMode) ??
      (contributionPlan.selected_mode_values as DraftObjectRecord | undefined) ??
      null
    );
  }, [contributionPlan]);

  const planDirectionLabel = useMemo(() => {
    const mode = String(selectedModeValues?.mode ?? contributionPlan?.selected_mode ?? "");
    if (mode === "debt_relief_first") return locale === "ar" ? "تخفيف ضغط الدين" : locale === "fr" ? "Dette d'abord" : "Debt first";
    if (mode === "goal_growth_first") return locale === "ar" ? "تسريع الأهداف" : locale === "fr" ? "Objectifs d'abord" : "Goals first";
    if (mode === "stability_first") return locale === "ar" ? "الاستقرار أولاً" : locale === "fr" ? "Stabilité d'abord" : "Stability first";
    if (mode === "balanced_rebuild") return locale === "ar" ? "توازن من جديد" : locale === "fr" ? "Équilibre" : "Balanced";
    return mode || "-";
  }, [contributionPlan?.selected_mode, locale, selectedModeValues?.mode]);

  const planRebalance = useMemo(() => {
    const debt = Math.max(0, Number(selectedModeValues?.debt_extra_per_cycle ?? 0) || 0);
    const goals = Math.max(0, Number(selectedModeValues?.goal_per_cycle ?? 0) || 0);
    const morona = Math.max(0, Number(selectedModeValues?.living_flex_per_cycle ?? 0) || 0);
    const total = debt + goals + morona;
    return {
      debt,
      goals,
      morona,
      total,
      debtPct: total > 0 ? (debt / total) * 100 : 0,
      goalsPct: total > 0 ? (goals / total) * 100 : 0,
      moronaPct: total > 0 ? (morona / total) * 100 : 0,
    };
  }, [selectedModeValues]);

  const distributionCoverage = useMemo(() => {
    const totalRules = (cashSplitPreview?.items ?? []).filter((item) => isPercentMode(item.mode)).length;
    const coveredRules = (cashSplitPreview?.items ?? []).filter(
      (item) => isPercentMode(item.mode) && Number(item.amount) > 0
    ).length;
    return { coveredRules, totalRules };
  }, [cashSplitPreview]);

  const systemAnomalies = useMemo(() => {
    const anomalies: Array<{ key: string; text: string; href: string; help?: string }> = [];
    if (needsFirstIncomeDeclaration) {
      anomalies.push({
        key: "first-income",
        text: copy.sweepBootstrapTitle,
        href: bootstrapIncomeHref,
      });
    }
    if (unmappedCount > 0) {
      anomalies.push({
        key: "unmapped",
        text: copy.categoriesToMap(unmappedCount),
        href: "/categories",
      });
    }
    if (overspentEnvelopes.length > 0) {
      anomalies.push({
        key: "overspent",
        text: copy.overspentAlert(overspentEnvelopes.length, overspentEnvelopes.slice(0, 2).join(", ")),
        href: "/envelopes?filter=overspent",
      });
    }
    const hasPercentRules = (cashSplitPreview?.items ?? []).some((item) => isPercentMode(item.mode));
    if (
      Number(data?.available_to_allocate ?? 0) > 0 &&
      (!cashSplitPreview || !hasPercentRules)
    ) {
      anomalies.push({
        key: "distribution-config",
        text: copy.widgetAnomalyNoConfig,
        href: "/distribution",
        help: copy.widgetAnomalyNoConfigHelp,
      });
    }
    return anomalies;
  }, [
    bootstrapIncomeHref,
    cashSplitPreview,
    copy,
    data?.available_to_allocate,
    needsFirstIncomeDeclaration,
    overspentEnvelopes,
    unmappedCount,
  ]);

  const recentExpenses = useMemo(() => {
    if (!data) return [];
    return data.recent_transactions
      .filter((tx) => tx.type === "expense")
      .slice(0, 5);
  }, [data]);

  const resolveCategoryName = (categoryId: string) => {
    const name = categories.find((cat) => cat.id === categoryId)?.name;
    return name ? localizeCategoryName(name, locale) : "-";
  };

  const resolveEnvelopeName = (tx: TransactionOut) => {
    if (tx.envelope_movement) return copy.mapped;
    return copy.unmapped;
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiFetch<void>(`/transactions/${id}`, { method: "DELETE" });
      toast({
        title: copy.deletedTitle,
        description: copy.deletedDescription,
      });
      await loadData(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      toast({
        title: copy.deleteErrorTitle,
        description: message,
        variant: "danger",
      });
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const handleRunSweep = async () => {
    const sweepDate = currentCycleData?.current_period?.end;
    if (!sweepDate) return;
    setRunningSweep(true);
    try {
      await apiFetch<{ periods_swept: number; sweeps_created: number }>("/sweeps", {
        method: "POST",
        body: { as_of: sweepDate },
      });
      toast({ title: copy.sweepDoneTitle, description: copy.sweepDoneDescription });
      await loadData(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      toast({ title: copy.sweepErrorTitle, description: message, variant: "danger" });
    } finally {
      setRunningSweep(false);
    }
  };

  return (
    <div
      dir={pageDir}
      data-dashboard-locale={locale}
      style={
        locale === "ar"
          ? {
              fontFamily: `var(--font-cairo), "Cairo", sans-serif`,
            }
          : undefined
      }
      className={`dashboard-v2 flex flex-col gap-8 ${
        locale === "ar" ? `${cairo.className} dashboard-arabic-font ${copyClass}` : ""
      }`}
    >
      <ConfirmDeleteTransactionDialog
        open={Boolean(deleteTarget)}
        loading={deleting}
        transactionType={deleteTarget?.type}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const success = await handleDelete(deleteTarget.id);
          if (success) setDeleteTarget(null);
        }}
      />

      {/* Épargne Automatique (Sweep) Info Dialog */}
      <Dialog open={sweepInfoOpen} onOpenChange={setSweepInfoOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-gradient-to-b from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/5 border border-emerald-100 dark:border-emerald-900/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
              <span className="text-lg">ℹ️</span>
              {locale === "ar" ? "شنو هو التوفير التلقائي؟" : locale === "fr" ? "Qu'est-ce que l'épargne automatique ?" : "What is automatic savings?"}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed mt-2">
              {locale === "ar"
                ? "فاش كيسالي الشهر، أي مبلغ بقا شايط فـ الأظرفة المؤقتة (الأظرفة اللي ماكيرجعش رصيدها تلقائياً للشهر الجاي) كيمشي نيشان لظرف التوفير الرئيسي (Tawfir) باش مايضيعش وباش تكبر الإدخار ديالك."
                : locale === "fr"
                ? "À la fin de chaque période de budget, l'argent qui reste dans vos enveloppes temporaires (sans report automatique du solde) est automatiquement transféré vers votre enveloppe d'Épargne (Tawfir) pour constituer votre réserve."
                : "At the end of each budget period, any remaining money in your temporary envelopes (without automatic rollover) is automatically moved to your default Savings (Tawfir) envelope to grow your reserve."}
            </DialogDescription>
          </DialogHeader>

          {currentCycleData?.envelopes && (() => {
            // Build a set of fixed-expense envelope IDs from the distribution config.
            // We use distributionConfig (always loaded) rather than cashSplitPreview
            // because cashSplitPreview is only available when available_to_allocate > 0.
            // Fixed-mode envelopes are mandatory expenses (rent, bills, etc.) and must
            // never appear as "potential savings" in the sweep projection.
            const fixedDistributionEnvelopeIds = new Set(
              (distributionConfig?.envelopes ?? [])
                .filter((item) => isFixedMode(item.mode) && item.enabled)
                .map((item) => item.target_id)
            );

            // Only include flexible (non-fixed) temporary envelopes in the sweep projection.
            // Excludes: rollover envelopes, system envelopes (savings, cash, goal, debt),
            // and any envelope covered by a fixed distribution rule.
            const affectedEnvelopes = currentCycleData.envelopes.filter(
              (item) =>
                !item.envelope.rollover_enabled &&
                !item.envelope.is_default_savings &&
                !item.envelope.is_cash &&
                !item.envelope.is_goal &&
                !item.envelope.is_debt &&
                !fixedDistributionEnvelopeIds.has(String(item.envelope.id))
            );

            const totalToSweep = affectedEnvelopes.reduce(
              (sum, item) => sum + Math.max(0, Number(item.balance.closing_balance || 0)),
              0
            );

            const savingsEnvelope = currentCycleData.envelopes.find((item) => item.envelope.is_default_savings);
            const currentSavings = savingsEnvelope ? Number(savingsEnvelope.balance.closing_balance || 0) : 0;
            const projectedSavings = currentSavings + totalToSweep;
            const currency = currentCycleData.user.currency || "DH";

            return (
              <div className="space-y-5 mt-4">
                {/* List of Envelopes */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">
                    {locale === "ar" ? "الأظرفة المرنة المتأثرة" : locale === "fr" ? "Enveloppes flexibles concernées" : "Flexible envelopes affected"}
                  </h5>
                  {affectedEnvelopes.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
                      {locale === "ar" ? "لا توجد أظرفة مرنة حاليا." : locale === "fr" ? "Aucune enveloppe flexible active." : "No active flexible envelopes."}
                    </p>
                  ) : (
                    <div className="max-h-[160px] overflow-y-auto pr-1 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                      {affectedEnvelopes.map((item) => (
                        <div key={item.envelope.id} className="flex items-center justify-between text-xs py-2">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {localizeSystemEnvelopeName(item.envelope.name, locale)}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            {Number(item.balance.closing_balance).toLocaleString(locale === "ar" ? "ar-MA" : "fr-FR", { minimumFractionDigits: 2 })} {currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Savings Projection Visual transition */}
                <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/10 p-4 space-y-3">
                  <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>🌱</span>
                    {locale === "ar" ? "توقعات رصيد التوفير (Tawfir)" : locale === "fr" ? "Projection de l'Épargne (Tawfir)" : "Savings Projection (Tawfir)"}
                  </h5>
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-center flex-1">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{locale === "ar" ? "الرصيد الحالي" : locale === "fr" ? "Actuel" : "Current"}</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
                        {currentSavings.toLocaleString(locale === "ar" ? "ar-MA" : "fr-FR", { minimumFractionDigits: 2 })} {currency}
                      </p>
                    </div>

                    <div className="text-emerald-500 font-extrabold text-xl animate-[pulse_1.5s_ease-in-out_infinite]">
                      ➔
                    </div>

                    <div className="text-center flex-1">
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{locale === "ar" ? "الرصيد المتوقع" : locale === "fr" ? "Potentiel" : "Potential"}</p>
                      <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                        {projectedSavings.toLocaleString(locale === "ar" ? "ar-MA" : "fr-FR", { minimumFractionDigits: 2 })} {currency}
                      </p>
                    </div>
                  </div>
                  {totalToSweep > 0 && (
                    <p className="text-[10px] text-center text-emerald-700/80 dark:text-emerald-500/80 italic leading-normal pt-1 border-t border-emerald-100/30">
                      {locale === "ar"
                        ? `هاد المبلغ يقدر يمشي للتوفير فآخر الدورة... إلى ما صرفتيهش من الأظرفة المرنة! 💡`
                        : locale === "fr"
                        ? `Ce montant peut alimenter votre épargne en fin de période... si vous ne le dépensez pas depuis vos enveloppes flexibles ! 💡`
                        : `This amount could go to savings at end of period... if unspent from your flexible envelopes! 💡`}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          <DialogFooter className="mt-4">
            <Button onClick={() => setSweepInfoOpen(false)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-2 text-sm shadow">
              {locale === "ar" ? "فهمت" : locale === "fr" ? "Compris" : "Understood"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={incomeReminderDialogOpen}
        onOpenChange={setIncomeReminderDialogOpen}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{copy.incomeDialogTitle}</DialogTitle>
            <DialogDescription>
              {copy.incomeDialogDescription(dueVisibleIncomeReminders.length)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-[var(--ink)]">
            <p>{copy.incomeDialogBody}</p>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
              {dueVisibleIncomeReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <span className="font-medium">{reminder.name}</span>
                  <Badge tone="muted">
                    {reminder.next_due_on ?? copy.toDeclare}
                  </Badge>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Checkbox
                checked={dontShowIncomeReminder}
                onCheckedChange={(checked) =>
                  setDontShowIncomeReminder(Boolean(checked))
                }
              />
              {copy.hideReminder}
            </label>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={handleDismissIncomeReminder}>
              {copy.ignore}
            </Button>
            <Button onClick={handleGoDeclareIncome}>
              {copy.declareNow}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{copy.periodTitle}</DialogTitle>
            <DialogDescription>
              {copy.periodDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "7d", label: copy.preset7 },
                { value: "30d", label: copy.preset30 },
                { value: "90d", label: copy.preset90 },
                { value: "ytd", label: copy.presetYtd },
                { value: "custom", label: copy.presetCustom },
              ].map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant={periodPreset === preset.value ? "primary" : "secondary"}
                  onClick={() => setPeriodPreset(preset.value as typeof periodPreset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>{copy.start}</Label>
	                <DatePicker
	                  value={customStart ? parseIsoDate(customStart) ?? undefined : undefined}
                  onChange={(date) => {
                    setPeriodPreset("custom");
                    setCustomStart(toIsoDate(date));
                  }}
                  placeholder={copy.startPlaceholder}
                />
              </div>
              <div className="grid gap-2">
                <Label>{copy.end}</Label>
	                <DatePicker
	                  value={customEnd ? parseIsoDate(customEnd) ?? undefined : undefined}
                  onChange={(date) => {
                    setPeriodPreset("custom");
                    setCustomEnd(toIsoDate(date));
                  }}
                  placeholder={copy.endPlaceholder}
                />
              </div>
            </div>
            {periodError ? (
              <Alert tone="error">
                <AlertDescription>{periodError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted)]">
              {copy.selectedPeriod}: {computedPeriodRange.start} {periodArrow}{" "}
              {computedPeriodRange.end}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPeriodDialogOpen(false)}
            >
              {copy.cancel}
            </Button>
            <Button type="button" onClick={handleApplyPeriod}>
              {copy.apply}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={introOpen}
        onOpenChange={(next) => {
          if (!next) {
            handleSkipIntro();
          } else {
            setIntroOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-4xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-0">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-5 px-6 py-7 sm:px-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-emerald-700">
                {copy.guideTag}
              </div>
              <div className="space-y-3">
                <DialogTitle className="text-2xl font-semibold text-[var(--ink)]">
                  {copy.welcomeTitle}
                </DialogTitle>
                <DialogDescription className="text-sm text-[var(--muted)]">
                  {copy.welcomeDescription}
                </DialogDescription>
              </div>
              <div className="grid gap-3 text-sm text-[var(--ink)]">
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-slate-50 px-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-100 text-sm font-semibold text-purple-600">
                    1
                  </span>
                  {copy.guideLine1}
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-slate-50 px-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-100 text-sm font-semibold text-blue-600">
                    2
                  </span>
                  {copy.guideLine2}
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-slate-50 px-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-semibold text-emerald-600">
                    3
                  </span>
                  {copy.guideLine3}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  {copy.guideChip1}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  {copy.guideChip2}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  {copy.guideChip3}
                </span>
              </div>
            </div>
            <div className="relative flex flex-col justify-between gap-4 bg-gradient-to-br from-[var(--surface-2)] via-[var(--surface)] to-[var(--surface-2)] px-6 py-7">
              <div className="grid gap-3">
	                <Image
	                  src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80"
	                  alt=""
	                  width={900}
	                  height={360}
	                  className="h-36 w-full rounded-3xl object-cover shadow-[0_18px_40px_rgba(88,80,236,0.18)]"
	                  sizes="(min-width: 1024px) 360px, 100vw"
	                  loading="eager"
	                />
	                <div className="grid grid-cols-2 gap-3">
	                  <Image
	                    src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=600&q=80"
	                    alt=""
	                    width={600}
	                    height={240}
	                    className="h-20 w-full rounded-2xl object-cover"
	                    sizes="(min-width: 1024px) 170px, 50vw"
	                    loading="lazy"
	                  />
	                  <Image
	                    src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=601&q=80"
	                    alt=""
	                    width={601}
	                    height={240}
	                    className="h-20 w-full rounded-2xl object-cover"
	                    sizes="(min-width: 1024px) 170px, 50vw"
	                    loading="lazy"
	                  />
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 text-xs text-[var(--muted)]">
                {copy.guideFooter}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)]/90 px-6 py-4">
            <button
              type="button"
              onClick={handleSkipIntro}
              className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
            >
              {copy.skip}
            </button>
            <Button onClick={handleStartTour}>{copy.startTour}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {tourActive && tourStep ? (
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

      {loading || !data ? (
        <DashboardSkeleton pageDir={pageDir} locale={locale} copy={copy} />
      ) : (
        <>
          {/* Dashboard Cockpit Redesign */}
          <div ref={headerRef} className="dashboard-cockpit relative overflow-hidden p-6 mb-6">
            {/* Background glowing decorations */}
            <div className="dashboard-cockpit__decorative-glow dashboard-cockpit__decorative-glow--emerald" />
            <div className="dashboard-cockpit__decorative-glow dashboard-cockpit__decorative-glow--indigo" />

            {/* Header section (Title, Period and Main Buttons) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--border)] dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className={`${titleClass} text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--ink)]`}>
                    {copy.title}
                  </h1>
                  {isKpiStartState && (
                    <Badge tone="muted" className="text-[10px] py-0.5 px-2">
                      {locale === "ar" ? "بداية" : locale === "fr" ? "Mode démarrage" : "Startup mode"}
                    </Badge>
                  )}
                </div>
                <p className="text-xs md:text-sm text-[var(--muted)]">
                  {copy.subtitle}
                </p>
              </div>

              {/* Action Buttons & Period Selector */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Period Selector */}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 hover:bg-[var(--surface-2)] px-3.5 py-1.5 text-xs text-[var(--ink)] font-semibold transition-all duration-200 shadow-sm hover:shadow cursor-pointer group select-none dark:border-slate-800"
                  onClick={() => {
                    const start = activePeriod?.start ?? getLocalTodayISO();
                    const end = activePeriod?.end ?? getLocalTodayISO();
                    setPeriodPreset("custom");
                    setCustomStart(start);
                    setCustomEnd(end);
                    setPeriodError(null);
                    setPeriodDialogOpen(true);
                  }}
                >
                  <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="tabular-nums">
                    {activePeriod
                      ? `${formatLocaleDate(activePeriod.start, locale)} ${periodArrow} ${formatLocaleDate(activePeriod.end, locale)}`
                      : copy.noPeriod}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--muted)] group-hover:translate-y-0.5 transition-transform" />
                </button>

                {/* Sweep Button */}
                {sweepDue ? (
                  <Button
                    variant="ghost"
                    className="border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:bg-amber-950/40 text-xs font-semibold px-3 py-1.5 rounded-full"
                    onClick={handleRunSweep}
                    disabled={runningSweep}
                  >
                    {runningSweep ? copy.sweepRunning : copy.sweep}
                  </Button>
                ) : null}

                {/* Quick Add Buttons */}
                <Button
                  className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-600/10 hover:shadow-lg transition-all duration-200 gap-1.5 px-4 py-1.5 rounded-full"
                  onClick={() => openQuickTransactionDialog("expense")}
                >
                  <Plus className="h-4 w-4" />
                  <span>{copy.addExpense}</span>
                </Button>

                <Button
                  variant="secondary"
                  className="border-indigo-200 hover:border-indigo-300 text-indigo-700 hover:bg-indigo-50/50 dark:border-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-950/20 text-xs font-bold gap-1.5 px-4 py-1.5 rounded-full"
                  onClick={() =>
                    openQuickTransactionDialog("income", {
                      bootstrapDate: sweepBootstrap?.last_income_date ?? null,
                      bootstrapAmount:
                        sweepBootstrap?.last_income_amount ??
                        sweepBootstrap?.expected_income_amount ??
                        null,
                    })
                  }
                >
                  <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{copy.addIncome}</span>
                </Button>
              </div>
            </div>

            {/* Three Column Grid (Flows, Envelopes, Attention/Alerts) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
              
              {/* Column 1: Flows Overview (نظرة عامة على التدفقات) */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {locale === "ar" ? "نظرة عامة على التدفقات" : locale === "fr" ? "Flux de la période" : "Flows Overview"}
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* KPI Available Cash */}
                  <div
                    ref={kpiAvailableRef}
                    className="dashboard-cockpit__subcard p-3 relative overflow-hidden border-s-4 border-s-emerald-500 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate">
                        {copy.availableCash}
                      </span>
                      <Wallet className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    </div>
                    <div className="mt-2">
                      <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        <AnimatedNumber value={Number(data.available_to_allocate)} format={formatMoney} />{" "}
                        <span className="text-[10px] font-semibold opacity-75">{data.user.currency}</span>
                      </div>
                      <p className="text-[9px] text-[var(--muted)] mt-0.5 truncate">
                        {isKpiStartState
                          ? locale === "ar" ? "لا يوجد دخل بعد" : locale === "fr" ? "Aucun revenu" : "No income"
                          : copy.notAllocated}
                      </p>
                    </div>
                  </div>

                  {/* KPI Expense */}
                  <div
                    ref={kpiExpenseRef}
                    className="dashboard-cockpit__subcard p-3 relative overflow-hidden border-s-4 border-s-rose-500 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 truncate">
                        {copy.periodExpenses}
                      </span>
                      <TrendingDown className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    </div>
                    <div className="mt-2">
                      <div className="text-base font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                        <AnimatedNumber value={expenseTotal} format={formatMoney} />{" "}
                        <span className="text-[10px] font-semibold opacity-75">{data.user.currency}</span>
                      </div>
                      <p className="text-[9px] text-[var(--muted)] mt-0.5 truncate">
                        {locale === "ar"
                          ? `${periodExpenseMappedTransactions.length} عملية`
                          : locale === "fr"
                          ? `${periodExpenseMappedTransactions.length} op.`
                          : `${periodExpenseMappedTransactions.length} tx.`}
                        {unmappedCount > 0 ? copy.unmappedSuffix(unmappedCount) : ""}
                      </p>
                    </div>
                  </div>

                  {/* KPI Income */}
                  <div
                    ref={kpiIncomeRef}
                    className="dashboard-cockpit__subcard p-3 relative overflow-hidden border-s-4 border-s-indigo-500 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 truncate">
                        {copy.periodIncome}
                      </span>
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    </div>
                    <div className="mt-2">
                      <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        <AnimatedNumber value={incomeTotal} format={formatMoney} />{" "}
                        <span className="text-[10px] font-semibold opacity-75">{data.user.currency}</span>
                      </div>
                      <p className="text-[9px] text-[var(--muted)] mt-0.5 truncate">
                        {locale === "ar"
                          ? `${periodIncomeTransactions.length} مداخيل`
                          : locale === "fr"
                          ? `${periodIncomeTransactions.length} revenu(s)`
                          : `${periodIncomeTransactions.length} income(s)`}
                      </p>
                    </div>
                  </div>

                  {/* KPI Net */}
                  {(() => {
                    const isPositive = netTotal >= 0;
                    const netColorClass = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
                    const borderSideClass = isPositive ? "border-s-emerald-500" : "border-s-rose-500";
                    return (
                      <div
                        ref={kpiNetRef}
                        className={`dashboard-cockpit__subcard p-3 relative overflow-hidden border-s-4 ${borderSideClass} flex flex-col justify-between`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`text-[10px] font-semibold ${netColorClass} flex items-center gap-1 truncate`}>
                            {copy.periodNet}
                          </span>
                          <Scale className={`h-3.5 w-3.5 ${isPositive ? "text-emerald-500" : "text-rose-500"} shrink-0`} />
                        </div>
                        <div className="mt-2">
                          <div className={`text-base font-extrabold ${netColorClass} tabular-nums`}>
                            <AnimatedNumber value={netTotal} format={formatMoney} />{" "}
                            <span className="text-[10px] font-semibold opacity-75">{data.user.currency}</span>
                          </div>
                          <p className="text-[9px] text-[var(--muted)] mt-0.5 truncate">
                            {lastActivityLabel}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Column 2: Envelopes Overview (الأظرفة) */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  {locale === "ar" ? "وضعية الأظرفة" : locale === "fr" ? "Statut des enveloppes" : "Envelopes Status"}
                </h3>

                <div className="dashboard-cockpit__subcard p-4 flex flex-col justify-between flex-1 gap-4">
                  {/* Stats numbers */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {focusEnvelopeRows.filter(e => !e.isOverspent && !e.nearLimit).length}
                      </div>
                      <div className="text-[9px] text-[var(--muted)] mt-0.5 font-medium">
                        {locale === "ar" ? "سليمة" : locale === "fr" ? "Saines" : "Healthy"}
                      </div>
                    </div>
                    <div>
                      <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                        {focusEnvelopeRows.filter(e => e.nearLimit && !e.isOverspent).length}
                      </div>
                      <div className="text-[9px] text-[var(--muted)] mt-0.5 font-medium">
                        {locale === "ar" ? "قريبة للحد" : locale === "fr" ? "Limites" : "Near limit"}
                      </div>
                    </div>
                    <div>
                      <div className="text-base font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                        {focusEnvelopeRows.filter(e => e.isOverspent).length}
                      </div>
                      <div className="text-[9px] text-[var(--muted)] mt-0.5 font-medium">
                        {locale === "ar" ? "تجاوزت" : locale === "fr" ? "Dépassées" : "Overspent"}
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Stacked Progress Bar */}
                  {(() => {
                    const totalEnv = focusEnvelopeRows.length || 1;
                    const healthyCount = focusEnvelopeRows.filter(e => !e.isOverspent && !e.nearLimit).length;
                    const nearCount = focusEnvelopeRows.filter(e => e.nearLimit && !e.isOverspent).length;
                    const overspentCount = focusEnvelopeRows.filter(e => e.isOverspent).length;
                    
                    const healthyPct = (healthyCount / totalEnv) * 100;
                    const nearPct = (nearCount / totalEnv) * 100;
                    const overspentPct = (overspentCount / totalEnv) * 100;

                    return (
                      <div className="space-y-1.5">
                        <div className="envelope-progress-bar-container">
                          {overspentCount > 0 && (
                            <div
                              className="envelope-progress-bar-segment envelope-progress-bar-segment--overspent"
                              style={{ width: `${overspentPct}%` }}
                            />
                          )}
                          {nearCount > 0 && (
                            <div
                              className="envelope-progress-bar-segment envelope-progress-bar-segment--near"
                              style={{ width: `${nearPct}%` }}
                            />
                          )}
                          {healthyCount > 0 && (
                            <div
                              className="envelope-progress-bar-segment envelope-progress-bar-segment--healthy"
                              style={{ width: `${healthyPct}%` }}
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-[var(--muted)]">
                          <span>{focusEnvelopeRows.length} {locale === "ar" ? "أظرفة مفعلة" : locale === "fr" ? "enveloppes actives" : "active envelopes"}</span>
                          <Link href="/envelopes" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                            {copy.viewAllEnvelopes}
                          </Link>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Column 3: Urgent Needs / Attention (الحاجات المستعجلة) */}
              <div ref={todoRef} className="flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
                  <Bell className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                  {locale === "ar" ? "الحاجات المستعجلة" : locale === "fr" ? "Urgent à faire" : "Urgent Needs"}
                </h3>

                <div className={`dashboard-cockpit__subcard p-4 flex flex-col flex-1 gap-3 ${
                  showTodoSection
                    ? "justify-between overflow-y-auto max-h-[190px] sm:max-h-[220px]"
                    : "justify-center items-center min-h-[140px] sm:min-h-[170px]"
                }`}>
                  {showTodoSection ? (
                    <div className="space-y-2">
                      {/* First income reminder */}
                      {needsFirstIncomeDeclaration && (
                        <div className="dashboard-cockpit__alert-item dashboard-cockpit__alert-item--warning flex flex-col gap-1.5">
                          <p className="text-[11px] sm:text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {copy.sweepBootstrapTitle}
                          </p>
                          <div className="flex items-center justify-between gap-2.5">
                            <span className="text-[10px] sm:text-[11px] text-amber-700 dark:text-amber-500 leading-tight">
                              {copy.sweepBootstrapDesc}
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="bg-amber-100 hover:bg-amber-200 border-amber-200 text-amber-900 font-bold shrink-0 text-[10px] sm:text-xs py-1 px-2.5 h-auto rounded-full"
                              onClick={() =>
                                openQuickTransactionDialog("income", {
                                  bootstrapDate: sweepBootstrap?.last_income_date ?? null,
                                  bootstrapAmount:
                                    sweepBootstrap?.last_income_amount ??
                                    sweepBootstrap?.expected_income_amount ??
                                    null,
                                })
                              }
                            >
                              {copy.sweepBootstrapAction}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Due Income Reminders */}
                      {dueIncomeReminders.length > 0 && (
                        <div className="dashboard-cockpit__alert-item dashboard-cockpit__alert-item--info flex flex-col gap-1.5">
                          <p className="text-[11px] sm:text-xs font-bold text-indigo-800 dark:text-indigo-400 flex items-center gap-1.5">
                            💰 {copy.incomeDialogDescription(dueIncomeReminders.length)}
                          </p>
                          <div className="flex items-center justify-between gap-2.5">
                            <span className="text-[10px] sm:text-[11px] text-indigo-700 dark:text-indigo-500 leading-tight truncate max-w-[130px] sm:max-w-none">
                              {dueIncomeReminders.map((reminder) => reminder.name).join(", ")}
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="bg-indigo-100 hover:bg-indigo-200 border-indigo-200 text-indigo-900 font-bold shrink-0 text-[10px] sm:text-xs py-1 px-2.5 h-auto rounded-full"
                              onClick={() =>
                                openQuickTransactionDialog("income", {
                                  bootstrapDate: sweepBootstrap?.last_income_date ?? null,
                                  bootstrapAmount:
                                    sweepBootstrap?.last_income_amount ??
                                    sweepBootstrap?.expected_income_amount ??
                                    null,
                                  reminderIdsToMark: dueIncomeReminders.map((r) => r.id),
                                })
                              }
                            >
                              {copy.declareIncome}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Categories to map */}
                      {unmappedCount > 0 && (
                        <div className="dashboard-cockpit__alert-item dashboard-cockpit__alert-item--warning flex flex-col gap-1.5">
                          <p className="text-[11px] sm:text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {locale === "ar" ? `فئات غير مربوطة (${unmappedCount})` : `Catégories non liées (${unmappedCount})`}
                          </p>
                          <div className="flex items-center justify-between gap-2.5">
                            <span className="text-[10px] sm:text-[11px] text-amber-700 dark:text-amber-500 leading-tight">
                              {copy.categoriesToMapDesc}
                            </span>
                            <Button asChild variant="secondary" size="sm" className="font-bold shrink-0 text-[10px] sm:text-xs py-1 px-2.5 h-auto rounded-full">
                              <Link href="/categories">{copy.mapNow}</Link>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Overspent envelopes */}
                      {overspentEnvelopes.length > 0 && (
                        <div className="dashboard-cockpit__alert-item dashboard-cockpit__alert-item--error flex flex-col gap-1.5">
                          <p className="text-[11px] sm:text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {copy.overspentAlert(overspentEnvelopes.length, overspentEnvelopes.slice(0, 2).join(", "))}
                          </p>
                          <div className="flex items-center justify-between gap-2.5">
                            <span className="text-[10px] sm:text-[11px] text-rose-700 dark:text-rose-500 leading-tight">
                              {copy.overspentDesc}
                            </span>
                            <Button asChild variant="secondary" size="sm" className="font-bold shrink-0 text-[10px] sm:text-xs py-1 px-2.5 h-auto rounded-full">
                              <Link href="/envelopes?filter=overspent">{copy.seeAll}</Link>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Sweep Ready */}
                      {sweepDue && (
                        <div className="dashboard-cockpit__alert-item dashboard-cockpit__alert-item--success flex flex-col gap-1.5">
                          <p className="text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            {copy.sweepReady}
                          </p>
                          <div className="flex items-center justify-between gap-2.5">
                            <span className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-500 leading-tight">
                              {copy.sweepReadyDesc}
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="bg-emerald-100 hover:bg-emerald-200 border-emerald-200 text-emerald-900 font-bold shrink-0 text-[10px] sm:text-xs py-1 px-2.5 h-auto rounded-full"
                              onClick={handleRunSweep}
                              disabled={runningSweep}
                            >
                              {runningSweep ? copy.executing : copy.sweepExecute}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Default Success/Healthy state */
                    <motion.div
                      className="flex flex-col items-center justify-center text-center py-2 px-4 gap-3 w-full h-full select-none"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    >
                      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(16,185,129,0.35)] dark:shadow-none border border-emerald-200/40 dark:border-emerald-800/20 transition-transform hover:scale-105 duration-300">
                        <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">
                          {locale === "ar" ? "كل شيء ممتاز!" : locale === "fr" ? "Tout est sous contrôle !" : "All under control!"}
                        </p>
                        <p className="text-[11px] sm:text-xs text-[var(--muted)] leading-relaxed max-w-[240px]">
                          {locale === "ar" ? "جميع المقاييس سليمة. لا توجد تنبيهات عاجلة." : locale === "fr" ? "Toutes vos enveloppes et transactions sont bien gérées." : "All your envelopes and transactions are well managed."}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

            </div>
          </div>



      {!hideDashboardDetailsUntilFirstIncome ? (
        <>
          {/* Épargne Automatique Countdown Widget */}
          {currentCycleData?.current_period?.end && (() => {
            const today = getLocalTodayISO();
            const diff = daysBetweenIso(today, currentCycleData.current_period.end);
            const daysRemaining = diff >= 0 ? diff : 0;

            // Exclude envelopes with a fixed distribution rule (mandatory expenses).
            // Use distributionConfig (always loaded) not cashSplitPreview (conditional).
            const fixedDistributionEnvelopeIds = new Set(
              (distributionConfig?.envelopes ?? [])
                .filter((item) => isFixedMode(item.mode) && item.enabled)
                .map((item) => item.target_id)
            );

            const affectedEnvelopes = currentCycleData.envelopes.filter(
              (item) =>
                !item.envelope.rollover_enabled &&
                !item.envelope.is_default_savings &&
                !item.envelope.is_cash &&
                !item.envelope.is_goal &&
                !item.envelope.is_debt &&
                !fixedDistributionEnvelopeIds.has(String(item.envelope.id))
            );

            const totalToSweep = affectedEnvelopes.reduce(
              (sum, item) => sum + Math.max(0, Number(item.balance.closing_balance || 0)),
              0
            );

            const savingsEnvelope = currentCycleData.envelopes.find((item) => item.envelope.is_default_savings);
            const currentSavings = savingsEnvelope ? Number(savingsEnvelope.balance.closing_balance || 0) : 0;
            const projectedSavings = currentSavings + totalToSweep;
            const currency = currentCycleData.user.currency || "DH";

            return (
              <motion.div
                className="mb-4 rounded-[24px] border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-cyan-50/60 dark:from-slate-900 dark:via-emerald-950/10 dark:to-cyan-950/10 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 dark:from-emerald-500 dark:to-teal-500 flex items-center justify-center text-white text-xl shadow-[0_8px_16px_-6px_rgba(16,185,129,0.4)] shrink-0">
                    💰
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                      {locale === "ar" ? "توفير تلقائي جاي" : locale === "fr" ? "Épargne automatique à venir" : "Upcoming automatic savings"}
                      <button
                        type="button"
                        onClick={() => setSweepInfoOpen(true)}
                        className="h-5 w-5 inline-flex items-center justify-center rounded-full bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300 transition-colors text-[10px] font-bold"
                        title="Info"
                      >
                        i
                      </button>
                    </h4>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
                      {locale === "ar"
                        ? `ما صرفتيهش من الأظرفة المرنة؟ يمشي للتوفير تلقائياً فآخر الدورة.`
                        : locale === "fr"
                        ? `Ce que vous n'avez pas dépensé dans vos enveloppes flexibles ira automatiquement en épargne.`
                        : `Unspent money from your flexible envelopes automatically goes to savings at period end.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 border-emerald-100/50 dark:border-emerald-900/30 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase font-semibold tracking-wider text-emerald-700/60 dark:text-emerald-500/60">
                      {locale === "ar" ? "الوقت المتبقي" : locale === "fr" ? "Temps restant" : "Time remaining"}
                    </p>
                    <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      {daysRemaining} {locale === "ar" ? "أيام" : locale === "fr" ? (daysRemaining > 1 ? "jours" : "jour") : (daysRemaining > 1 ? "days" : "day")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] uppercase font-semibold tracking-wider text-emerald-700/60 dark:text-emerald-500/60">
                      {locale === "ar" ? "المبلغ المتوقع" : locale === "fr" ? "Épargne projetée" : "Projected savings"}
                    </p>
                    <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                      {projectedSavings.toLocaleString(locale === "ar" ? "ar-MA" : "fr-FR", { minimumFractionDigits: 2 })} {currency}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          <div className="dashboard-main-grid">
          <motion.div
            ref={summaryRef}
            className="dashboard-main-summary flex flex-col gap-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            whileHover={{ scale: 1.01 }}
          >
            <DashboardCharts
              locale={locale}
              chartData={chartData}
              totalBudget={totalBudget}
              spendingByEnvelope={spendingByEnvelope}
              sortedTrends={sortedTrends}
              data={data}
              formatMoney={formatMoney}
              formatLocaleDate={formatLocaleDate}
            />
          </motion.div>

          <motion.section
            className="dashboard-main-health grid gap-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
        <Section
          title={copy.widgetCashSplit}
          className="dashboard-panel"
          actions={
            <div className="flex gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/distribution">{copy.widgetOpenDistribution}</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sweeps">{copy.widgetOpenSweeps}</Link>
              </Button>
            </div>
          }
        >
          {/* Subtitle + meta badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--muted)]">{copy.widgetCashSplitDesc}</p>
            <div className="flex flex-wrap gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "rgba(99,102,241,0.10)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.22)" }}
              >
                <span style={{ width:5, height:5, borderRadius:"50%", background:"#6366f1", display:"inline-block", flexShrink:0 }} />
                {planDirectionLabel}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                style={autoSweepEnabled
                  ? { background:"rgba(16,185,129,0.10)", color:"#059669", border:"1px solid rgba(16,185,129,0.25)" }
                  : { background:"rgba(148,163,184,0.10)", color:"var(--muted)", border:"1px solid rgba(148,163,184,0.22)" }}
              >
                <span style={{ width:5, height:5, borderRadius:"50%", background:autoSweepEnabled ? "#10b981" : "#94a3b8", display:"inline-block", flexShrink:0 }} />
                {copy.widgetAutoSweep}: {autoSweepEnabled ? copy.widgetAutoSweepOn : copy.widgetAutoSweepOff}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tabular-nums"
                style={{ background:"rgba(234,179,8,0.10)", color:"#b45309", border:"1px solid rgba(234,179,8,0.25)" }}
              >
                {copy.widgetPlanCoverage}: {distributionCoverage.coveredRules}/{distributionCoverage.totalRules}
              </span>
            </div>
          </div>

          {/* Main layout: ring chart + breakdown */}
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            {/* SVG Ring / Donut */}
            {(() => {
              const currency = data?.user.currency ?? "MAD";
              const totalCash = Number(cashSplitPreview?.cash_before ?? 0);
              const debtVal = cashSplitLayerTotals.debtGoals;
              const fixedVal = cashSplitLayerTotals.fixed;
              const flexVal = cashSplitLayerTotals.flexible;
              const cashLeftVal = Math.max(0, cashSplitLayerTotals.cashLeft);
              const grandTotal = debtVal + fixedVal + flexVal + cashLeftVal || 1;
              const segments: { pct: number; color: string; label: string }[] = [
                { pct: (debtVal / grandTotal) * 100, color: "#ef4444", label: copy.widgetDebt },
                { pct: (fixedVal / grandTotal) * 100, color: "#f59e0b", label: copy.widgetFixed },
                { pct: (flexVal / grandTotal) * 100, color: "#6366f1", label: copy.widgetMorona },
                { pct: (cashLeftVal / grandTotal) * 100, color: "#10b981", label: copy.widgetCashLeft },
              ];
              const cx = 54; const cy = 54; const r = 42; const sw = 13;
              const circ = 2 * Math.PI * r;
              let offset = 0;
              return (
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="relative" style={{ width:108, height:108 }}>
                    <svg width="108" height="108" viewBox="0 0 108 108">
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth={sw} />
                      {segments.map((seg, i) => {
                        const gapLen = (1.5 / 360) * circ;
                        const segLen = Math.max(0, (seg.pct / 100) * circ - gapLen);
                        const dash = `${segLen} ${circ - segLen}`;
                        const dashOffset = circ * (1 - offset / 100);
                        const el = (
                          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                            stroke={seg.color} strokeWidth={sw}
                            strokeDasharray={dash} strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${cx} ${cy})`}
                            style={{ transition:"stroke-dasharray 0.6s ease" }}
                          />
                        );
                        offset += seg.pct;
                        return el;
                      })}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents:"none" }}>
                      <span className="text-[9px] font-medium text-[var(--muted)]">{currency}</span>
                      <span className="tabular-nums font-bold leading-tight text-[var(--ink)]"
                        style={{ fontSize: totalCash >= 10000 ? "0.7rem" : "0.78rem" }}>
                        {formatMoney(totalCash)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 w-full" style={{ minWidth:110 }}>
                    {segments.map((seg, i) => (
                      <div key={i} className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span style={{ width:7, height:7, borderRadius:"50%", background:seg.color, display:"inline-block", flexShrink:0 }} />
                          <span className="text-[10px] text-[var(--muted)] truncate">{seg.label}</span>
                        </div>
                        <span className="text-[10px] font-semibold tabular-nums text-[var(--ink)] shrink-0">{seg.pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Breakdown rows */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {planRebalance.total > 0 ? (
                <>
                  {/* Segmented bar */}
                  <div className="flex h-2.5 overflow-hidden rounded-full" style={{ background:"rgba(148,163,184,0.14)", gap:"1px" }}>
                    <div className="rounded-l-full transition-all duration-700"
                      style={{ width:`${planRebalance.debtPct}%`, background:"linear-gradient(90deg,#ef4444,#f87171)", minWidth: planRebalance.debtPct > 0 ? 4 : 0 }} />
                    <div className="transition-all duration-700"
                      style={{ width:`${planRebalance.goalsPct}%`, background:"linear-gradient(90deg,#6366f1,#818cf8)", minWidth: planRebalance.goalsPct > 0 ? 4 : 0 }} />
                    <div className="rounded-r-full transition-all duration-700"
                      style={{ width:`${planRebalance.moronaPct}%`, background:"linear-gradient(90deg,#22c55e,#4ade80)", minWidth: planRebalance.moronaPct > 0 ? 4 : 0 }} />
                  </div>
                  {/* Debt / Goals / Flex rows */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    {[
                      { label: copy.widgetDebt,   value: planRebalance.debt,   color:"#ef4444", bg:"rgba(239,68,68,0.07)",   pct: planRebalance.debtPct },
                      { label: copy.widgetGoals,  value: planRebalance.goals,  color:"#6366f1", bg:"rgba(99,102,241,0.07)",  pct: planRebalance.goalsPct },
                      { label: copy.widgetMorona, value: planRebalance.morona, color:"#22c55e", bg:"rgba(34,197,94,0.07)",   pct: planRebalance.moronaPct },
                    ].map((item) => (
                      <div key={item.label}
                        className="flex items-center justify-between rounded-xl px-2.5 py-1.5"
                        style={{ background: item.bg, border:`1px solid ${item.color}22` }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span style={{ width:7, height:7, borderRadius:"50%", background:item.color, display:"inline-block", flexShrink:0, boxShadow:`0 0 0 2px ${item.color}22` }} />
                          <span className="text-xs font-medium text-[var(--ink)] truncate">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ms-2">
                          <span className="text-[10px] tabular-nums font-semibold" style={{ color:item.color }}>{item.pct.toFixed(0)}%</span>
                          <span className="text-xs font-bold tabular-nums text-[var(--ink)]">{formatMoney(item.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-[var(--muted)]">{copy.widgetNoPlan}</p>
              )}

              {/* Fixed + Cash Left */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-0.5 rounded-xl px-3 py-2.5"
                  style={{ background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.2)" }}>
                  <span className="text-[10px] text-[var(--muted)]">{copy.widgetFixed}</span>
                  <span className="text-sm font-bold tabular-nums text-[var(--ink)]">{formatMoney(cashSplitLayerTotals.fixed)}</span>
                </div>
                <div className="flex flex-col gap-0.5 rounded-xl px-3 py-2.5"
                  style={cashSplitLayerTotals.cashLeft > 0
                    ? { background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.22)" }
                    : { background:"rgba(148,163,184,0.08)", border:"1px solid rgba(148,163,184,0.18)" }}>
                  <span className="text-[10px] text-[var(--muted)]">{copy.widgetCashLeft}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: cashSplitLayerTotals.cashLeft > 0 ? "#059669" : "var(--ink)" }}>
                    {formatMoney(cashSplitLayerTotals.cashLeft)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title={copy.widgetRisk} className="dashboard-panel">
          <p className="text-xs text-[var(--muted)]">{copy.widgetRiskDesc}</p>
          <div className="mt-3 grid gap-2">
            {riskEnvelopes.length === 0 ? (
              <Alert>
                <AlertDescription className="text-sm">{copy.widgetRiskAllHealthy}</AlertDescription>
              </Alert>
            ) : (
              riskEnvelopes.map((item) => {
                const meta = statusMeta(item.status);
                const pct = item.allocated > 0
                  ? Math.min(Math.abs(item.spent) / item.allocated, 1.15)
                  : item.isOverspent ? 1.15 : 0;
                const barPct = Math.min(pct * 100, 115);
                const barColor = item.isOverspent
                  ? "var(--accent-error, #ef4444)"
                  : item.nearLimit
                  ? "var(--accent-warning, #f59e0b)"
                  : "var(--accent-success, #10b981)";
                const overage = item.isOverspent ? Math.abs(item.remaining) : null;
                return (
                  <Card key={item.id} className="dashboard-list-card" style={{ overflow: "hidden" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold truncate">{item.name}</p>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </div>
                        <div
                          style={{
                            height: "6px",
                            borderRadius: "3px",
                            background: "var(--border, #e2e8f0)",
                            overflow: "hidden",
                            marginBottom: "6px",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(barPct, 100)}%`,
                              background: barColor,
                              borderRadius: "3px",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          {formatMoney(item.spent)}
                          {" / "}
                          {formatMoney(item.allocated)}
                          {" "}{copy.spentLabel}
                          {overage !== null && (
                            <span style={{ color: "var(--accent-error, #ef4444)", fontWeight: 600, marginInlineStart: "0.4em" }}>
                              (+{formatMoney(overage)})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
          {riskEnvelopes.length > 0 && (
            <div className="mt-3">
              <Button asChild variant="ghost" size="sm">
                <Link href="/envelopes">{copy.viewAllEnvelopes}</Link>
              </Button>
            </div>
          )}
        </Section>
      </motion.section>

      <motion.section
        className="dashboard-main-insights grid gap-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <Section title={copy.widgetDebtGoalsPressure} className="dashboard-panel">
          <div
            className="flex items-stretch gap-0 mt-2 rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            {/* Debt side */}
            <div className="flex-1 flex flex-col justify-center px-3 py-2.5">
              <p className="text-[11px] text-[var(--muted)] font-medium uppercase tracking-wide leading-none mb-1">
                {copy.widgetDebtPressure}
              </p>
              <p className="text-base font-bold tabular-nums leading-tight">
                {formatMoney(debtPressureTotals.monthlyAllocation)}
              </p>
              <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-tight">
                {debtPressureTotals.rulesCount > 0
                  ? `${debtPressureTotals.rulesCount} ${
                      locale === "ar" ? "ظرف دين" : locale === "fr" ? "enveloppe(s)" : "envelope(s)"
                    }`
                  : copy.widgetNoDebt}
              </p>
            </div>

            {/* Divider */}
            <div style={{ width: "1px", background: "var(--border)" }} />

            {/* Goals side */}
            <div className="flex-1 flex flex-col justify-center px-3 py-2.5">
              <p className="text-[11px] text-[var(--muted)] font-medium uppercase tracking-wide leading-none mb-1">
                {copy.widgetGoalsPressure}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p
                  className="text-base font-bold tabular-nums leading-tight"
                  style={{
                    color: goalsCompletionPct >= 80
                      ? "var(--accent-success, #10b981)"
                      : goalsCompletionPct >= 40
                      ? "var(--accent-warning, #f59e0b)"
                      : "var(--ink)",
                  }}
                >
                  {goalsCompletionPct.toFixed(1)}%
                </p>
              </div>
              {goals.length > 0 && (
                <div style={{ height: "4px", borderRadius: "2px", background: "var(--border, #e2e8f0)", overflow: "hidden", margin: "4px 0" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(goalsCompletionPct, 100)}%`,
                      background: goalsCompletionPct >= 80
                        ? "var(--accent-success, #10b981)"
                        : goalsCompletionPct >= 40
                        ? "var(--accent-warning, #f59e0b)"
                        : "var(--accent-strong, #6366f1)",
                      borderRadius: "2px",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              )}
              <p className="text-[11px] text-[var(--muted)] leading-tight">
                {goals.length > 0
                  ? `${formatMoney(goalsPressureTotals.current)} / ${formatMoney(goalsPressureTotals.target)}`
                  : copy.widgetNoGoals}
              </p>
            </div>
          </div>
        </Section>




      </motion.section>

      <motion.div
        ref={envelopesRef}
        className="dashboard-main-envelopes"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Section
          title={copy.topEnvelopes}
          className="dashboard-panel"
          actions={
            <div className="flex gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/envelopes">{copy.allocateFunds}</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/envelopes">{copy.viewAllEnvelopes}</Link>
              </Button>
            </div>
          }
        >
          <Tabs
            value={envelopeFilter}
            onValueChange={(value) => {
              setEnvelopeFilter(value as "active" | "overspent" | "near");
              setShowAllEnvelopes(false);
            }}
          >
            <TabsList>
              <TabsTrigger value="active">
                {copy.filterActive}
                {focusEnvelopeRows.filter((e) => !e.isOverspent).length > 0 && (
                  <span style={{ marginInlineStart: "0.35em", fontSize: "0.68rem", background: "var(--accent-success, #10b981)", color: "#fff", borderRadius: "999px", padding: "0 5px", lineHeight: "1.5", fontWeight: 700, verticalAlign: "middle", display: "inline-block" }}>
                    {focusEnvelopeRows.filter((e) => !e.isOverspent).length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="overspent">
                {copy.filterOverspent}
                {focusEnvelopeRows.filter((e) => e.isOverspent).length > 0 && (
                  <span style={{ marginInlineStart: "0.35em", fontSize: "0.68rem", background: "var(--accent-error, #ef4444)", color: "#fff", borderRadius: "999px", padding: "0 5px", lineHeight: "1.5", fontWeight: 700, verticalAlign: "middle", display: "inline-block" }}>
                    {focusEnvelopeRows.filter((e) => e.isOverspent).length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="near">
                {copy.filterNear}
                {focusEnvelopeRows.filter((e) => e.nearLimit && !e.isOverspent).length > 0 && (
                  <span style={{ marginInlineStart: "0.35em", fontSize: "0.68rem", background: "var(--accent-warning, #f59e0b)", color: "#fff", borderRadius: "999px", padding: "0 5px", lineHeight: "1.5", fontWeight: 700, verticalAlign: "middle", display: "inline-block" }}>
                    {focusEnvelopeRows.filter((e) => e.nearLimit && !e.isOverspent).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Separator className="my-4" />
          {sectionHasOnlyZeroState ? (
            <Alert>
              <AlertDescription>
                {locale === "ar"
                  ? "مازال ما تسجل حتى حركة فهاد الفترة، لذلك الأظرفة باينين بــ 0.00."
                  : locale === "fr"
                  ? "Aucun mouvement n'est encore enregistré sur cette période, les enveloppes restent à 0.00."
                  : "No activity has been recorded in this period yet, so envelopes remain at 0.00."}
              </AlertDescription>
            </Alert>
          ) : null}
          {pinnedDebtEnvelope &&
          !topEnvelopes.some((item) => item.id === pinnedDebtEnvelope.id) ? (
            <div
              className="mb-3 rounded-lg p-3"
              style={{
                background: "rgba(245,158,11,0.06)",
                border: "1px solid var(--accent-warning, #f59e0b)",
                borderInlineStartWidth: "3px",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: "0.8rem" }}>📌</span>
                    <p className="text-sm font-semibold truncate">{pinnedDebtEnvelope.name}</p>
                    <Badge tone="warning">
                      {locale === "ar" ? "دين" : locale === "fr" ? "Dette" : "Debt"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {locale === "ar"
                      ? "مثبّت فالعرض باش يبقى باين فالقرار."
                      : locale === "fr"
                      ? "Épinglé pour rester visible dans la décision."
                      : "Pinned to stay visible in decision view."}
                  </p>
                </div>
                <div
                  className="shrink-0 text-end"
                  style={{ color: pinnedDebtEnvelope.remaining >= 0 ? "var(--accent-success, #10b981)" : "var(--accent-error, #ef4444)" }}
                >
                  <p className="text-base font-bold tabular-nums">{formatMoney(pinnedDebtEnvelope.remaining)}</p>
                  <p className="text-[10px] text-[var(--muted)] leading-tight">{data?.user.currency ?? "MAD"}</p>
                </div>
              </div>
            </div>
          ) : null}
          {topEnvelopes.length === 0 ? (
            <EmptyState
              title={copy.noEnvelopeTitle}
              description={copy.noEnvelopeDescription}
            />
          ) : (
            <>
              <div className="grid gap-2">
                {(showAllEnvelopes ? topEnvelopes : topEnvelopes.slice(0, 2)).map((item) => {
                  const meta = statusMeta(item.status);
                  const pct = item.allocated > 0 ? Math.min(item.spent / item.allocated, 1) : 0;
                  const barPct = pct * 100;
                  const accentColor = item.isOverspent
                    ? "var(--accent-error, #ef4444)"
                    : item.nearLimit
                    ? "var(--accent-warning, #f59e0b)"
                    : "var(--accent-success, #10b981)";
                  const remainingColor = item.remaining >= 0
                    ? "var(--accent-success, #10b981)"
                    : "var(--accent-error, #ef4444)";
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg p-3"
                      style={{
                        background: "var(--surface-raised, var(--surface))",
                        border: "1px solid var(--border)",
                        borderInlineStart: `3px solid ${accentColor}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-sm font-semibold truncate">{item.name}</p>
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </div>
                          {item.allocated > 0 && (
                            <div style={{ height: "5px", borderRadius: "3px", background: "var(--border, #e2e8f0)", overflow: "hidden", marginBottom: "6px" }}>
                              <div style={{ height: "100%", width: `${barPct}%`, background: accentColor, borderRadius: "3px", transition: "width 0.4s ease" }} />
                            </div>
                          )}
                          <p className="text-xs text-[var(--muted)]">
                            {item.allocated > 0
                              ? `${formatMoney(item.spent)} / ${formatMoney(item.allocated)} ${copy.spentLabel}`
                              : `${copy.spentFallback}: ${formatMoney(item.spent)}`}
                          </p>
                        </div>
                        <div className="shrink-0 text-end" style={{ color: remainingColor }}>
                          <p className="text-base font-bold tabular-nums">{formatMoney(item.remaining)}</p>
                          <p className="text-[10px] text-[var(--muted)] leading-tight">{data?.user.currency ?? "MAD"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {topEnvelopes.length > 2 && (
                <button
                  type="button"
                  onClick={() => setShowAllEnvelopes((v) => !v)}
                  className="mt-3 w-full text-center text-xs font-medium py-1.5 rounded-md transition-colors"
                  style={{
                    color: "var(--accent-strong, #6366f1)",
                    background: "var(--surface-raised, transparent)",
                    border: "1px dashed var(--border)",
                  }}
                >
                  {showAllEnvelopes
                    ? (locale === "ar" ? "شوف أقل ▲" : locale === "fr" ? "Voir moins ▲" : "Show less ▲")
                    : (locale === "ar"
                        ? `شوف ${topEnvelopes.length - 2} أكثر ▼`
                        : locale === "fr"
                        ? `Voir ${topEnvelopes.length - 2} de plus ▼`
                        : `Show ${topEnvelopes.length - 2} more ▼`)}
                </button>
              )}
            </>
          )}
        </Section>
      </motion.div>

      <motion.div
        ref={recentRef}
        className="dashboard-main-recent"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        <Section title={copy.recentExpenses} className="dashboard-panel">
          {expenseTotal === 0 ? (
            <EmptyState
              title={copy.noExpensesTitle}
              description={copy.noExpensesDescription}
            />
          ) : recentExpenses.length === 0 ? (
            <EmptyState
              title={copy.noRecentTitle}
              description={copy.noRecentDescription}
            />
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {recentExpenses.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 py-2 first:pt-1 last:pb-1"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate leading-snug">
                      {tx.description || copy.expenseFallback}
                    </p>
                    <p className="text-[11px] text-[var(--muted)] truncate leading-snug mt-0.5">
                      {resolveCategoryName(tx.category_id)}
                      {" \u00b7 "}
                      {resolveEnvelopeName(tx)}
                      {" \u00b7 "}
                      {formatLocaleDate(tx.occurred_on, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: "var(--accent-error, #ef4444)" }}
                    >
                      {formatMoney(tx.amount)}
                    </span>
                    <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Link href="/transactions" title={copy.edit}>&#9999;&#65039;</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title={copy.delete}
                      onClick={() => setDeleteTarget(tx)}
                    >
                      &#128465;&#65039;
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </motion.div>


      </div>

      <div ref={quickRef}>
        {shouldShowNextStepCard ? (
          <Section title={nextStepCopy.title} className="dashboard-panel relative z-10 mt-8">
            <Card className="dashboard-list-card">
              <p className="text-sm text-[var(--muted)]">{nextStepCopy.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/transactions">{nextStepCopy.tx}</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/envelopes">{nextStepCopy.env}</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/khatat-lflous">{nextStepCopy.smart}</Link>
                </Button>
              </div>
            </Card>
          </Section>
        ) : null}


      </div>
        </>
      ) : null}
        </>
      )}

      {mounted
        ? createPortal(
            <div
              ref={fabRef}
              className={`fixed bottom-6 z-50 flex flex-col gap-3 ${
                pageDir === "rtl" ? "left-6" : "right-6"
              }`}
            >
              <Button
                className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 h-12 w-12 sm:w-auto sm:h-auto px-0 sm:px-5 py-0 sm:py-2.5 shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 flex items-center justify-center sm:justify-start gap-2 font-medium text-white"
                onClick={() =>
                  openQuickTransactionDialog("income", {
                    bootstrapDate: sweepBootstrap?.last_income_date ?? null,
                    bootstrapAmount:
                      sweepBootstrap?.last_income_amount ??
                      sweepBootstrap?.expected_income_amount ??
                      null,
                  })
                }
                title={copy.fabDeclareIncome}
                aria-label={copy.fabDeclareIncome}
              >
                <TrendingUp className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">{copy.fabDeclareIncome}</span>
              </Button>
              <Button
                className="rounded-full bg-gradient-to-r from-rose-500 to-red-600 h-12 w-12 sm:w-auto sm:h-auto px-0 sm:px-5 py-0 sm:py-2.5 shadow-lg hover:from-rose-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center sm:justify-start gap-2 font-medium text-white"
                onClick={() => openQuickTransactionDialog("expense")}
                title={copy.fabDeclareExpense}
                aria-label={copy.fabDeclareExpense}
              >
                <TrendingDown className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">{copy.fabDeclareExpense}</span>
              </Button>
            </div>,
            document.body
          )
        : null}
      <style jsx global>{`
        .quick-tx-dialog {
          animation: quickTxDialogFadeIn 220ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .quick-tx-fadein > * {
          animation: quickTxFadeUp 320ms ease both;
        }
        .quick-tx-fadein > *:nth-child(2) {
          animation-delay: 40ms;
        }
        .quick-tx-fadein > *:nth-child(3) {
          animation-delay: 80ms;
        }
        .quick-tx-fadein > *:nth-child(4) {
          animation-delay: 120ms;
        }
        .quick-tx-tab-active {
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.16);
        }
        .quick-tx-chip {
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .quick-tx-chip:hover {
          transform: translateY(-1px) scale(1.03);
          box-shadow: 0 6px 14px rgba(16, 185, 129, 0.16);
        }
        .quick-tx-submit {
          transition: transform 140ms ease, box-shadow 180ms ease;
        }
        .quick-tx-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(16, 185, 129, 0.28);
        }
        .quick-tx-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .quick-tx-dialog,
          .quick-tx-fadein > *,
          .quick-tx-chip,
          .quick-tx-submit {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
        @keyframes quickTxDialogFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes quickTxFadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        [data-dashboard-locale="ar"],
        [data-dashboard-locale="ar"] *,
        .dashboard-arabic-font,
        .dashboard-arabic-font * {
          font-family: "Cairo", sans-serif !important;
          font-optical-sizing: auto;
          font-variation-settings: "slnt" 0;
          letter-spacing: 0 !important;
        }

        [data-dashboard-locale="ar"] svg,
        [data-dashboard-locale="ar"] button svg,
        [data-dashboard-locale="ar"] a svg,
        .dashboard-arabic-font svg,
        .dashboard-arabic-font button svg,
        .dashboard-arabic-font a svg {
          font-family: initial !important;
        }

        [data-dashboard-locale="ar"] .dashboard-title,
        .dashboard-arabic-font .dashboard-title {
          font-family: "Cairo", sans-serif !important;
          font-weight: 800 !important;
          letter-spacing: 0 !important;
        }

        [data-dashboard-locale="ar"] .dashboard-copy,
        [data-dashboard-locale="ar"] .dashboard-copy p,
        [data-dashboard-locale="ar"] .dashboard-copy span,
        [data-dashboard-locale="ar"] .dashboard-copy a,
        [data-dashboard-locale="ar"] .dashboard-copy button,
        [data-dashboard-locale="ar"] .dashboard-copy div,
        [data-dashboard-locale="ar"] .dashboard-copy h2,
        [data-dashboard-locale="ar"] .dashboard-copy h3,
        .dashboard-arabic-font .dashboard-copy,
        .dashboard-arabic-font .dashboard-copy p,
        .dashboard-arabic-font .dashboard-copy span,
        .dashboard-arabic-font .dashboard-copy a,
        .dashboard-arabic-font .dashboard-copy button,
        .dashboard-arabic-font .dashboard-copy div,
        .dashboard-arabic-font .dashboard-copy h2,
        .dashboard-arabic-font .dashboard-copy h3 {
          font-family: "Cairo", sans-serif !important;
          letter-spacing: 0 !important;
        }
      `}</style>
    </div>
  );
}

function DashboardSkeleton({ pageDir, locale, copy }: { pageDir: string; locale: string; copy: any }) {
  const isRtl = pageDir === "rtl";
  return (
    <div className="flex flex-col gap-8">
      {/* Dashboard Cockpit Skeleton */}
      <div className="dashboard-cockpit animate-pulse p-6">
        {/* Header section skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--border)] dark:border-slate-800">
          <div className="space-y-3">
            <div className="h-8 w-48 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="h-4 w-72 rounded-lg bg-[var(--surface-2)] dark:bg-slate-800" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-32 rounded-full bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="h-8 w-28 rounded-full bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="h-8 w-28 rounded-full bg-[var(--surface-2)] dark:bg-slate-800" />
          </div>
        </div>

        {/* Three Column Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          {/* Column 1: Flows skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-36 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm space-y-2 dark:border-slate-800">
                  <div className="h-3 w-16 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  <div className="h-5 w-20 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  <div className="h-2.5 w-24 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Envelopes status skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-36 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm space-y-4 dark:border-slate-800 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="h-5 w-8 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                    <div className="h-2.5 w-12 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-[var(--surface-2)] dark:bg-slate-800" />
                <div className="flex justify-between items-center">
                  <div className="h-2.5 w-20 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  <div className="h-2.5 w-16 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Urgent needs skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-36 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm space-y-3 dark:border-slate-800 flex-1 flex flex-col justify-center items-center">
              <div className="h-10 w-10 rounded-full bg-[var(--surface-2)] dark:bg-slate-800 animate-pulse" />
              <div className="h-3.5 w-28 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
              <div className="h-2.5 w-48 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="dashboard-main-grid">
        {/* Left Column (Circular summary chart & recent expenses) */}
        <div className="flex flex-col gap-4">
          {/* Circular Chart Card Skeleton */}
          <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4 animate-pulse">
            <div className="h-6 w-48 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-6">
              {/* Outer circular indicator skeleton */}
              <div className="relative flex items-center justify-center h-44 w-44 rounded-full border-[18px] border-[var(--surface-2)] dark:border-slate-800">
                <div className="h-24 w-24 rounded-full bg-[var(--surface-2)] dark:bg-slate-800" />
              </div>
              <div className="space-y-3 w-full max-w-[200px]">
                <div className="h-4 w-full rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                <div className="h-4 w-[80%] rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                <div className="h-4 w-[60%] rounded bg-[var(--surface-2)] dark:bg-slate-800" />
              </div>
            </div>
          </div>

          {/* Top Envelopes list skeleton */}
          <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="h-6 w-36 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
              <div className="h-8 w-24 rounded-lg bg-[var(--surface-2)] dark:bg-slate-800" />
            </div>
            <div className="h-10 w-48 rounded-lg bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="space-y-3">
              {[1, 2, 3].map((k) => (
                <div
                  key={k}
                  className="flex items-center justify-between h-14 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4"
                >
                  <div className="space-y-2">
                    <div className="h-4 w-24 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                    <div className="h-3 w-36 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  </div>
                  <div className="h-6 w-20 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Cash Split, Risk, Anomalies) */}
        <div className="flex flex-col gap-4">
          {/* Cash Split Widget Skeleton */}
          <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="h-6 w-36 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
              <div className="h-8 w-28 rounded-lg bg-[var(--surface-2)] dark:bg-slate-800" />
            </div>
            <div className="h-4 w-64 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-12 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
              <div className="h-12 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
              <div className="h-12 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
            </div>
            <div className="h-8 w-full rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
          </div>

          {/* Risk Envelopes Skeleton */}
          <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4 animate-pulse">
            <div className="h-6 w-44 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="h-4 w-56 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="space-y-2">
              {[1, 2].map((r) => (
                <div
                  key={r}
                  className="flex items-center justify-between h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4"
                >
                  <div className="h-4 w-28 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  <div className="h-6 w-16 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
