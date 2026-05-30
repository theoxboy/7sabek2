"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Cairo } from "next/font/google";

import { apiFetch } from "@/lib/api";
import type {
  CategoryEnvelopeMapOut,
  CategoryOut,
  DashboardOut,
  DashboardTrendPointOut,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
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
} from "recharts";
import { addDays, startOfYear } from "@/lib/reports/compute";
import {
  getLocaleDirection,
  type FloussyLocale,
} from "@/lib/localePreference";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { isInternalIncomeCategory, localizeCategoryName } from "@/lib/categoryCatalog";
import { areToursGloballyDisabled } from "@/lib/tourFlags";

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

function isDebtEnvelopeName(name: string) {
  const normalized = name.trim().toLowerCase();
  return (
    normalized.startsWith("dettes —") ||
    normalized.startsWith("debts —") ||
    normalized.startsWith("الديون") ||
    normalized.includes("dette") ||
    normalized.includes("debt") ||
    normalized.includes("credit") ||
    normalized.includes("قرض")
  );
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
  // Keep SSR and first client render identical to avoid hydration mismatch.
  // Then sync to browser preference after mount.
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [data, setData] = useState<DashboardOut | null>(null);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [manualUnmappedCount, setManualUnmappedCount] = useState(0);
  const [goals, setGoals] = useState<GoalOut[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [cashSplitPreview, setCashSplitPreview] =
    useState<DistributionSimulateOut | null>(null);
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
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [periodRange, setPeriodRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<
    "7d" | "30d" | "90d" | "ytd" | "custom"
  >("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [quickTxSubmitting, setQuickTxSubmitting] = useState(false);
  const [quickTxError, setQuickTxError] = useState<string | null>(null);
  const [quickTxStep, setQuickTxStep] = useState<QuickTxFlowStep>("form");
  const [quickTxDistributionPreview, setQuickTxDistributionPreview] =
    useState<DistributionSimulateOut | null>(null);
  const [quickTxReminderIdsToMark, setQuickTxReminderIdsToMark] = useState<string[]>([]);
  const [quickTxPreferenceBoost, setQuickTxPreferenceBoost] = useState<
    Record<string, number>
  >({});
  const [quickTxDraft, setQuickTxDraft] = useState<QuickTransactionDraft>({
    type: "expense",
    category_id: "",
    amount: "",
    occurred_on: getLocalTodayISO(),
    description: "",
  });
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
  const spendingRef = useRef<HTMLDivElement | null>(null);
  const trendRef = useRef<HTMLDivElement | null>(null);
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
  const quickTxSubmitLockRef = useRef(false);
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

  const loadData = useCallback(async () => {
    const loadSequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = loadSequence;
    if (deferredLoadTimerRef.current) {
      window.clearTimeout(deferredLoadTimerRef.current);
      deferredLoadTimerRef.current = null;
    }
    setLoading(true);
    setError(null);
    try {
      const dash = await apiFetch<DashboardOut>(`/dashboard${periodQuery}`);
      if (loadSequenceRef.current !== loadSequence) return;
      setData(dash);
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
        ]).then((results) => {
          if (loadSequenceRef.current !== loadSequence) return;

          const mappingsResult = results[0];
          const remindersResult = results[1];
          const trendResult = results[2];
          const manualUnmappedResult = results[3];
          const onboardingResult = results[4];

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

  useEffect(() => {
    if (!mounted || !quickTxPreferenceKey) return;
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
  }, [mounted, quickTxPreferenceKey]);

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

  const sweepStatus = data?.sweep_status ?? null;
  const sweepBootstrap = data?.sweep_bootstrap ?? null;
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

  const quickTxCategories = quickTxDraft.type === "income" ? incomeCategories : expenseCategories;
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
    if (expenseCategories.length === 0) return [] as CategoryOut[];
    const nowHour = new Date().getHours();
    const maxPreference = Math.max(
      1,
      ...Object.values(quickTxPreferenceBoost).map((value) => Number(value) || 0)
    );
    const ranked = expenseCategories.map((cat) => {
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
    expenseCategories,
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
    const selectedCategory = expenseCategories.find(
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
  }, [expenseCategories, locale, quickTxDraft.category_id, quickTxDraft.type]);

  const quickTxAmountIsValid = parseAmountInput(quickTxDraft.amount) !== null;
  const quickTxEffectiveCategoryId =
    quickTxDraft.type === "income"
      ? defaultIncomeCategory?.id ?? incomeCategories[0]?.id ?? ""
      : quickTxDraft.category_id;
  const quickTxCanSubmit =
    quickTxAmountIsValid &&
    Boolean(quickTxDraft.occurred_on) &&
    Boolean(quickTxEffectiveCategoryId) &&
    quickTxCategories.length > 0;

  useEffect(() => {
    if (!quickTxOpen) return;
    if (quickTxDraft.type === "income") {
      const fallbackId = defaultIncomeCategory?.id ?? incomeCategories[0]?.id ?? "";
      if (!fallbackId) return;
      if (quickTxDraft.category_id !== fallbackId) {
        setQuickTxDraft((prev) => ({ ...prev, category_id: fallbackId }));
      }
      return;
    }
    if (!quickTxCategories.some((cat) => cat.id === quickTxDraft.category_id)) {
      setQuickTxDraft((prev) => ({
        ...prev,
        category_id: smartExpenseSuggestions[0]?.id ?? quickTxCategories[0]?.id ?? "",
      }));
    }
  }, [
    defaultIncomeCategory,
    incomeCategories,
    quickTxCategories,
    quickTxDraft.category_id,
    quickTxDraft.type,
    quickTxOpen,
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

  const quickTxIncomePeriodWarning = useMemo(() => {
    if (quickTxDraft.type !== "income" || !quickTxDraft.occurred_on || !activePeriod) return null;
    const date = quickTxDraft.occurred_on;
    const start = activePeriod.start;
    const end = activePeriod.end;
    const dateLabel = formatLocaleDate(date, locale);
    const startLabel = formatLocaleDate(start, locale);
    const endLabel = formatLocaleDate(end, locale);
    if (date < start) {
      return copy.quickTxBeforePeriod(dateLabel, startLabel, endLabel, periodArrow);
    }
    if (date >= end) {
      return copy.quickTxAfterPeriod(dateLabel, startLabel, endLabel, periodArrow);
    }
    return null;
  }, [activePeriod, copy, locale, periodArrow, quickTxDraft.occurred_on, quickTxDraft.type]);

  const openQuickTransactionDialog = useCallback(
    (
      type: "income" | "expense",
      options?: {
        bootstrapDate?: string | null;
        bootstrapAmount?: string | null;
        reminderIdsToMark?: string[];
      }
    ) => {
      const today = getLocalTodayISO();
      const fallbackIncomeCategoryId =
        defaultIncomeCategory?.id ?? incomeCategories[0]?.id ?? "";
      const fallbackExpenseCategoryId = expenseCategories[0]?.id ?? "";
      const parsedBootstrapAmount =
        options?.bootstrapAmount ? parseAmountInput(options.bootstrapAmount) : null;
      const bootstrapDate = options?.bootstrapDate ?? null;
      const validBootstrapDate =
        bootstrapDate && bootstrapDate <= today ? bootstrapDate : today;
      setQuickTxError(null);
      setQuickTxReminderIdsToMark(
        type === "income" ? Array.from(new Set(options?.reminderIdsToMark ?? [])) : []
      );
      setQuickTxStep("form");
      setQuickTxDistributionPreview(null);
      setQuickTxDraft({
        type,
        category_id:
          type === "income" ? fallbackIncomeCategoryId : fallbackExpenseCategoryId,
        amount: parsedBootstrapAmount ? parsedBootstrapAmount.toFixed(2) : "",
        occurred_on: validBootstrapDate,
        description: "",
      });
      setQuickTxOpen(true);
    },
    [defaultIncomeCategory?.id, expenseCategories, incomeCategories]
  );

  const handleOpenDistributionFromQuickTx = useCallback(() => {
    if (quickTxDraft.type !== "income") return;
    try {
      sessionStorage.setItem(
        QUICK_TX_INCOME_RESUME_STORAGE_KEY,
        JSON.stringify({
          draft: quickTxDraft,
          reminderIdsToMark: quickTxReminderIdsToMark,
        })
      );
    } catch {
      // ignore
    }
    router.push("/envelopes");
  }, [quickTxDraft, quickTxReminderIdsToMark, router]);

  const handleSubmitQuickTransaction = async () => {
    if (quickTxSubmitLockRef.current) return;
    setQuickTxError(null);
    const amount = parseAmountInput(quickTxDraft.amount);
    if (amount === null) {
      setQuickTxError(copy.quickTxAmountRequired);
      return;
    }
    const effectiveCategoryId = quickTxEffectiveCategoryId;
    if (!effectiveCategoryId) {
      setQuickTxError(copy.quickTxCategoryRequired);
      return;
    }
    if (quickTxDraft.type === "expense" && !mappings[effectiveCategoryId]) {
      setQuickTxError(copy.quickTxNoExpenseCategories);
      return;
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
            occurred_on: quickTxDraft.occurred_on,
          },
        });
        setQuickTxDistributionPreview(preview);
        setQuickTxStep("income_preview");
      } catch (err) {
        setQuickTxError(formatApiError(err, copy.quickTxUnknownError));
      } finally {
        quickTxSubmitLockRef.current = false;
        setQuickTxSubmitting(false);
      }
      return;
    }

    quickTxSubmitLockRef.current = true;
    setQuickTxSubmitting(true);
    try {
      await apiFetch<TransactionOut>("/transactions", {
        method: "POST",
        body: {
          type: quickTxDraft.type,
          category_id: effectiveCategoryId,
          amount: amount.toFixed(2),
          occurred_on: quickTxDraft.occurred_on,
          description: quickTxDraft.description || undefined,
        },
      });
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
      toast({
        title:
          quickTxDraft.type === "income"
            ? copy.quickTxSavedIncome
            : copy.quickTxSavedExpense,
        variant: "success",
      });
      if (quickTxDraft.type === "expense" && quickTxPreferenceKey) {
        setQuickTxPreferenceBoost((prev) => {
          const next = {
            ...prev,
            [effectiveCategoryId]: (prev[effectiveCategoryId] ?? 0) + 1,
          };
          try {
            localStorage.setItem(quickTxPreferenceKey, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
      setQuickTxOpen(false);
      setQuickTxStep("form");
      setQuickTxDistributionPreview(null);
      setQuickTxReminderIdsToMark([]);
      await loadData();
      if (quickTxDraft.type === "income") {
        router.refresh();
      }
    } catch (err) {
      setQuickTxError(formatApiError(err, copy.quickTxUnknownError));
    } finally {
      quickTxSubmitLockRef.current = false;
      setQuickTxSubmitting(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (searchParams.get("quick_tx_resume") !== "income") return;
    try {
      const raw = sessionStorage.getItem(QUICK_TX_INCOME_RESUME_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        draft?: QuickTransactionDraft;
        reminderIdsToMark?: string[];
      };
      if (!parsed?.draft || parsed.draft.type !== "income") return;
      setQuickTxDraft(parsed.draft);
      setQuickTxReminderIdsToMark(
        Array.isArray(parsed.reminderIdsToMark) ? parsed.reminderIdsToMark : []
      );
      setQuickTxStep("form");
      setQuickTxDistributionPreview(null);
      setQuickTxOpen(true);
      sessionStorage.removeItem(QUICK_TX_INCOME_RESUME_STORAGE_KEY);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("quick_tx_resume");
      const nextQuery = next.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    } catch {
      sessionStorage.removeItem(QUICK_TX_INCOME_RESUME_STORAGE_KEY);
    }
  }, [mounted, pathname, router, searchParams]);

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

  const handleQuickTxEnter = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (!quickTxCanSubmit || quickTxSubmitting) return;
    event.preventDefault();
    void handleSubmitQuickTransaction();
  };

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
    if (spendingByEnvelope.length > 0) {
      steps.push({
        title: copy.tourSpendingTitle,
        description: copy.tourSpendingDescription,
        ref: spendingRef,
      });
    }
    if (trendPoints.length > 0) {
      steps.push({
        title: copy.tourTrendTitle,
        description: copy.tourTrendDescription,
        ref: trendRef,
      });
    }
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
      focusEnvelopeRows.find((item) => isDebtEnvelopeName(item.name)) ?? null,
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
    () => new Set(focusEnvelopeRows.filter((item) => isDebtEnvelopeName(item.name)).map((item) => item.id)),
    [focusEnvelopeRows]
  );

  const cashSplitLayerTotals = useMemo(() => {
    const items = cashSplitPreview?.items ?? [];
    const fixed = items
      .filter(
        (item) =>
          item.mode === "fixed" &&
          item.target_type === "envelope" &&
          !debtEnvelopeIdSet.has(item.target_id)
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const debtGoals = items
      .filter(
        (item) =>
          item.mode === "fixed" &&
          (item.target_type === "goal" ||
            (item.target_type === "envelope" && debtEnvelopeIdSet.has(item.target_id)))
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const flexible = items
      .filter((item) => item.mode === "percent")
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
    const totalRules = (cashSplitPreview?.items ?? []).filter((item) => item.mode === "percent").length;
    const coveredRules = (cashSplitPreview?.items ?? []).filter(
      (item) => item.mode === "percent" && Number(item.amount) > 0
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
    const hasPercentRules = (cashSplitPreview?.items ?? []).some((item) => item.mode === "percent");
    if (
      Number(data?.available_to_allocate ?? 0) > 0 &&
      (!cashSplitPreview || !hasPercentRules)
    ) {
      anomalies.push({
        key: "distribution-config",
        text: copy.widgetAnomalyNoConfig,
        href: "/envelopes",
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
      await loadData();
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
    if (!currentPeriod?.end) return;
    setRunningSweep(true);
    try {
      await apiFetch<{ periods_swept: number; sweeps_created: number }>("/sweeps", {
        method: "POST",
        body: { as_of: currentPeriod.end },
      });
      toast({ title: copy.sweepDoneTitle, description: copy.sweepDoneDescription });
      await loadData();
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
        open={quickTxOpen}
	        onOpenChange={(nextOpen) => {
	          if (quickTxSubmitting) return;
	          setQuickTxOpen(nextOpen);
	          if (!nextOpen) {
	            setQuickTxError(null);
              setQuickTxStep("form");
              setQuickTxDistributionPreview(null);
	            setQuickTxReminderIdsToMark([]);
	          }
	        }}
      >
        <DialogContent className="quick-tx-dialog max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 animate-[pulse_2.2s_ease-in-out_infinite]">
                {quickTxDraft.type === "income" ? "＋" : "−"}
              </span>
              {copy.quickTxTitle}
            </DialogTitle>
            <DialogDescription>{copy.quickTxDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 quick-tx-fadein">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span>{copy.quickTxProgressLabel}</span>
                <span>{quickTxCompletion}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${quickTxCompletion}%` }}
                  role="progressbar"
                  aria-label={copy.quickTxProgressLabel}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={quickTxCompletion}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-1">
              <button
                type="button"
                className={`rounded-xl px-3 py-2 text-sm transition ${
                  quickTxDraft.type === "income"
                    ? "bg-[var(--surface)] font-semibold text-emerald-700 shadow-sm quick-tx-tab-active"
                    : "text-[var(--muted)] hover:bg-[var(--surface)]/70 hover:-translate-y-0.5"
                }`}
                onClick={() =>
                  setQuickTxDraft((prev) => ({
                    ...prev,
                    type: "income",
                    category_id:
                      defaultIncomeCategory?.id ?? incomeCategories[0]?.id ?? "",
                  }))
                }
                disabled={quickTxSubmitting}
              >
                {copy.quickTxIncomeTab}
              </button>
              <button
                type="button"
                className={`rounded-xl px-3 py-2 text-sm transition ${
                  quickTxDraft.type === "expense"
                    ? "bg-[var(--surface)] font-semibold text-red-700 shadow-sm quick-tx-tab-active"
                    : "text-[var(--muted)] hover:bg-[var(--surface)]/70 hover:-translate-y-0.5"
                }`}
                onClick={() =>
                  setQuickTxDraft((prev) => ({
                    ...prev,
                    type: "expense",
                    category_id: expenseCategories[0]?.id ?? "",
                  }))
                }
                disabled={quickTxSubmitting}
              >
                {copy.quickTxExpenseTab}
              </button>
            </div>

            {quickTxDraft.type === "expense" && smartExpenseSuggestions.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-xs text-[var(--muted)]">{copy.quickTxSmartCategories}</p>
                <div className="flex flex-wrap gap-2">
                  {smartExpenseSuggestions.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={`quick-tx-chip rounded-full border px-3 py-1 text-xs ${
                        quickTxDraft.category_id === category.id
                          ? "border-emerald-300 bg-[var(--surface-2)] text-emerald-700"
                          : "border-[var(--border)] bg-[var(--surface)]"
                      }`}
                      onClick={() =>
                        setQuickTxDraft((prev) => ({
                          ...prev,
                          category_id: category.id,
                        }))
                      }
                    >
                      {localizeCategoryName(category.name, locale)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="quick-tx-amount">{copy.quickTxAmount}</Label>
              <input
                id="quick-tx-amount"
                value={quickTxDraft.amount}
                onKeyDown={handleQuickTxEnter}
                onChange={(event) =>
                  setQuickTxDraft((prev) => ({ ...prev, amount: event.target.value }))
                }
                placeholder="0.00"
                inputMode="decimal"
                className="h-11 rounded-xl border border-[var(--border)] px-3 text-sm focus:border-emerald-400 focus:outline-none"
                disabled={quickTxSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <p className="text-xs text-[var(--muted)]">{copy.quickTxSuggestedAmounts}</p>
              <div className="flex flex-wrap gap-2">
                {quickTxAmountSuggestions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="quick-tx-chip rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs hover:border-emerald-300 hover:bg-[var(--surface-2)]"
                    onClick={() =>
                      setQuickTxDraft((prev) => ({
                        ...prev,
                        amount: value.toFixed(2),
                      }))
                    }
                    disabled={quickTxSubmitting}
                  >
                    {value} {data?.user.currency ?? "MAD"}
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
                  value={quickTxDraft.occurred_on}
                  onKeyDown={handleQuickTxEnter}
                  lang={locale === "ar" ? "ar-MA" : locale === "fr" ? "fr-FR" : "en-CA"}
                  onChange={(event) =>
                    setQuickTxDraft((prev) => ({
                      ...prev,
                      occurred_on: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-[var(--border)] px-3 text-sm focus:border-emerald-400 focus:outline-none"
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
                  onChange={(event) =>
                    setQuickTxDraft((prev) => ({
                      ...prev,
                      category_id: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm focus:border-emerald-400 focus:outline-none"
                  disabled={quickTxSubmitting || quickTxDraft.type === "income"}
                >
                  <option value="">{copy.quickTxSelectCategory}</option>
                  {quickTxCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {localizeCategoryName(category.name, locale)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {quickTxLastSimilarExpense && quickTxDraft.type === "expense" ? (
              <Alert>
                <AlertDescription className="flex items-center justify-between gap-2">
                  <span>
                    {copy.quickTxLastExpenseLabel}: {formatMoney(quickTxLastSimilarExpense.amount)}{" "}
                    {data?.user.currency ?? "MAD"} ·{" "}
                    {formatLocaleDate(quickTxLastSimilarExpense.occurred_on, locale)}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setQuickTxDraft((prev) => ({
                        ...prev,
                        amount: Number(quickTxLastSimilarExpense.amount).toFixed(2),
                        description: quickTxLastSimilarExpense.description ?? prev.description,
                      }))
                    }
                  >
                    {copy.quickTxUseLastExpense}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {quickTxRecurringSuggestion && quickTxDraft.type === "expense" ? (
              <Alert tone="warning">
                <AlertDescription className="flex items-center justify-between gap-2">
                  <span>
                    {copy.quickTxRecurringHint}: {formatMoney(quickTxRecurringSuggestion.amount)}{" "}
                    {data?.user.currency ?? "MAD"}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setQuickTxDraft((prev) => ({
                        ...prev,
                        amount: quickTxRecurringSuggestion.amount.toFixed(2),
                        description:
                          quickTxRecurringSuggestion.description || prev.description,
                      }))
                    }
                  >
                    {copy.quickTxApplyRecurring}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {quickTxMappedEnvelopeHint ? (
              <Alert>
                <AlertDescription>{quickTxMappedEnvelopeHint}</AlertDescription>
              </Alert>
            ) : null}

            {quickTxAmountAnomalyMessage ? (
              <Alert tone="warning">
                <AlertDescription>{quickTxAmountAnomalyMessage}</AlertDescription>
              </Alert>
            ) : null}

            {quickTxIncomePeriodWarning ? (
              <Alert tone="warning">
                <AlertDescription>{quickTxIncomePeriodWarning}</AlertDescription>
              </Alert>
            ) : null}

            {(quickTxDraft.type === "income" && quickTxCategories.length === 0) ||
            (quickTxDraft.type === "expense" && quickTxCategories.length === 0) ? (
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
                className="h-11 rounded-xl border border-[var(--border)] px-3 text-sm focus:border-emerald-400 focus:outline-none"
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
                      className="quick-tx-chip rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
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
            {quickTxDraft.type === "income" && quickTxStep === "income_preview" ? (
              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                <p className="text-sm font-semibold text-emerald-900">
                  {locale === "ar"
                    ? "معاينة التوزيع قبل تأكيد الدخل"
                    : locale === "en"
                    ? "Distribution preview before income confirmation"
                    : "Aperçu de la répartition avant confirmation du revenu"}
                </p>
                {quickTxDistributionPreview?.items?.length ? (
                  <div className="space-y-2">
                    {quickTxDistributionPreview.items.map((item) => (
                      <div
                        key={`${item.target_type}:${item.target_id}`}
                        className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs"
                      >
                        <span className="text-[var(--ink)]">{item.name}</span>
                        <span className="font-semibold text-emerald-800">
                          {formatMoney(item.amount)} {data?.user.currency ?? "MAD"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted)]">
                    {locale === "ar"
                      ? "ما كايناش قواعد توزيع نشيطة حالياً."
                      : locale === "en"
                      ? "No active distribution rules currently."
                      : "Aucune règle de répartition active pour le moment."}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                if (quickTxDraft.type === "income" && quickTxStep === "income_preview") {
                  setQuickTxStep("form");
                  return;
                }
                setQuickTxOpen(false);
              }}
              disabled={quickTxSubmitting}
            >
              {quickTxDraft.type === "income" && quickTxStep === "income_preview"
                ? locale === "ar"
                  ? "رجوع للتعديل"
                  : locale === "en"
                  ? "Back to edit"
                  : "Retour modification"
                : copy.cancel}
            </Button>
            {quickTxDraft.type === "income" && quickTxStep === "income_preview" ? (
              <Button
                variant="secondary"
                onClick={handleOpenDistributionFromQuickTx}
                disabled={quickTxSubmitting}
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
                  !quickTxCanSubmit
                }
                className="quick-tx-submit"
              >
              {quickTxSubmitting
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

      <div ref={headerRef} className="dashboard-v2__hero">
        <div className="dashboard-v2__hero-content">
          <div className="space-y-2">
            <h1 className={`${titleClass} dashboard-v2__title`}>{copy.title}</h1>
            <p className="text-sm text-[var(--muted)]">
              {copy.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <span className="rounded-full border border-emerald-200 bg-[var(--surface)]/80 px-3 py-1">
              {activePeriod
                ? `${activePeriod.start} ${periodArrow} ${activePeriod.end}`
                : copy.noPeriod}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-700 hover:bg-[var(--surface-2)] hover:text-emerald-800"
              onClick={() => {
                const start =
                  activePeriod?.start ?? getLocalTodayISO();
                const end =
                  activePeriod?.end ?? getLocalTodayISO();
                setPeriodPreset("custom");
                setCustomStart(start);
                setCustomEnd(end);
                setPeriodError(null);
                setPeriodDialogOpen(true);
              }}
            >
              {copy.changePeriod}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-emerald-700 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-800"
            onClick={() => openQuickTransactionDialog("expense")}
          >
            {copy.addExpense}
          </Button>
          <Button
            variant="secondary"
            className="border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-[var(--surface-2)]"
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
            {copy.addIncome}
          </Button>
          {sweepDue ? (
            <Button
              variant="ghost"
              className="border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              onClick={handleRunSweep}
              disabled={runningSweep}
            >
              {runningSweep ? copy.sweepRunning : copy.sweep}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {showTodoSection ? (
        <div ref={todoRef} className="dashboard-attention">
          <Section title={copy.todo} className="dashboard-panel">
            <div className="grid gap-3">
            {needsFirstIncomeDeclaration ? (
              <Alert tone="warning" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <AlertDescription className="space-y-1">
                  <p className="font-medium">{copy.sweepBootstrapTitle}</p>
                  <p>{copy.sweepBootstrapDesc}</p>
                </AlertDescription>
                <div className="flex items-center gap-2">
                  <InfoHint label={copy.sweepBootstrapTitle}>
                    <p>{copy.sweepBootstrapHelp}</p>
                  </InfoHint>
                  <Button
                    variant="secondary"
                    size="sm"
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
              </Alert>
            ) : null}
            {dueIncomeReminders.length > 0 ? (
              <Alert className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <AlertDescription>
                  💰 {copy.incomeDialogDescription(dueIncomeReminders.length)}{" "}
                  {dueIncomeReminders.length <= 2
                    ? `(${dueIncomeReminders
                        .map((reminder) => reminder.name)
                        .join(", ")})`
                    : ""}
                </AlertDescription>
                <div className="flex flex-wrap items-center gap-2">
	                  <Button
	                    variant="secondary"
	                    size="sm"
	                    onClick={() =>
	                      openQuickTransactionDialog("income", {
	                        bootstrapDate: sweepBootstrap?.last_income_date ?? null,
	                        bootstrapAmount:
	                          sweepBootstrap?.last_income_amount ??
	                          sweepBootstrap?.expected_income_amount ??
	                          null,
	                        reminderIdsToMark: dueIncomeReminders.map(
	                          (reminder) => reminder.id
	                        ),
	                      })
	                    }
	                  >
	                    {copy.declareIncome}
	                  </Button>
	                </div>
              </Alert>
            ) : null}
            {unmappedCount > 0 ? (
              <Alert tone="warning" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <AlertDescription className="space-y-1">
                  <p className="font-medium">{copy.categoriesToMap(unmappedCount)}</p>
                  <p>{copy.categoriesToMapDesc}</p>
                </AlertDescription>
                <div className="flex items-center gap-2">
                  <InfoHint label={copy.categoriesToMap(unmappedCount)}>
                    <p>{copy.categoriesToMapHelp}</p>
                  </InfoHint>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/categories">{copy.mapNow}</Link>
                  </Button>
                </div>
              </Alert>
            ) : null}
            {overspentEnvelopes.length > 0 ? (
              <Alert tone="error" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <AlertDescription className="space-y-1">
                  <p className="font-medium">
                    {copy.overspentAlert(
                      overspentEnvelopes.length,
                      overspentEnvelopes.slice(0, 3).join(", ")
                    )}
                  </p>
                  <p>{copy.overspentDesc}</p>
                </AlertDescription>
                <div className="flex items-center gap-2">
                  <InfoHint label={copy.overspentAlert(
                    overspentEnvelopes.length,
                    overspentEnvelopes.slice(0, 3).join(", ")
                  )}>
                    <p>{copy.overspentHelp}</p>
                  </InfoHint>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/envelopes?filter=overspent">{copy.seeAll}</Link>
                  </Button>
                </div>
              </Alert>
            ) : null}
            {sweepDue ? (
              <Alert className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <AlertDescription className="space-y-1">
                  <p className="font-medium">{copy.sweepReady}</p>
                  <p>{copy.sweepReadyDesc}</p>
                </AlertDescription>
                <div className="flex items-center gap-2">
                  <InfoHint label={copy.sweepReady}>
                    <p>{copy.sweepHelp}</p>
                  </InfoHint>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRunSweep}
                    disabled={runningSweep}
                  >
                    {runningSweep ? copy.executing : copy.sweepExecute}
                  </Button>
                </div>
              </Alert>
            ) : !needsFirstIncomeDeclaration &&
              (unmappedCount > 0 || overspentEnvelopes.length > 0) ? (
              <Alert className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <AlertDescription className="space-y-1">
                  <p className="font-medium">{copy.sweepNotDue}</p>
                  <p>{copy.sweepNotDueDesc}</p>
                </AlertDescription>
                <InfoHint label={copy.sweepNotDue}>
                  <p>{copy.sweepHelp}</p>
                </InfoHint>
              </Alert>
            ) : null}
            </div>
          </Section>
        </div>
      ) : null}

      {data && !hideDashboardDetailsUntilFirstIncome ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isKpiStartState ? (
            <div className="sm:col-span-2 xl:col-span-4">
              <Alert className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <AlertDescription className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge tone="muted">
                      {locale === "ar"
                        ? "مازال البداية"
                        : locale === "fr"
                        ? "Mode démarrage"
                        : "Startup mode"}
                    </Badge>
                    <InfoHint
                      label={
                        locale === "ar"
                          ? "توضيح"
                          : locale === "fr"
                          ? "Contexte"
                          : "Context"
                      }
                    >
                      <p>
                        {locale === "ar"
                          ? "معلومات onboarding التقديرية ماشي عمليات مالية فعلية."
                          : locale === "fr"
                          ? "Les estimations onboarding ne sont pas des opérations financières réelles."
                          : "Onboarding estimates are not real financial transactions."}
                      </p>
                    </InfoHint>
                  </div>
                  <p>
                    {locale === "ar"
                      ? "سجّل أول دخل ولا مصروف باش تبان المؤشرات الحقيقية ديال هاد الفترة."
                      : locale === "fr"
                      ? "Ajoute un premier revenu ou une première dépense pour afficher des indicateurs réels sur cette période."
                      : "Add your first income or expense to show real indicators for this period."}
                  </p>
                </AlertDescription>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
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
                    {copy.fabDeclareIncome}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openQuickTransactionDialog("expense")}
                  >
                    {copy.fabDeclareExpense}
                  </Button>
                </div>
              </Alert>
            </div>
          ) : null}
          <div ref={kpiAvailableRef}>
            <Card className="dashboard-kpi-card">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.availableCash}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                <AnimatedNumber
                  value={Number(data.available_to_allocate)}
                  format={formatMoney}
                />
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {isKpiStartState
                  ? locale === "ar"
                    ? "مازال ما كاين حتى دخل فعلي مسجل فهاد الفترة."
                    : locale === "fr"
                    ? "Aucun revenu réel n'est encore enregistré sur cette période."
                    : "No real income has been recorded in this period yet."
                  : copy.notAllocated}
              </p>
            </Card>
          </div>
          <div ref={kpiExpenseRef}>
            <Card className="dashboard-kpi-card">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.periodExpenses}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                <AnimatedNumber value={expenseTotal} format={formatMoney} />
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {locale === "ar"
                  ? `${periodExpenseMappedTransactions.length} عملية مصروف مربوطة`
                  : locale === "fr"
                  ? `${periodExpenseMappedTransactions.length} opération(s) de dépense mappée(s)`
                  : `${periodExpenseMappedTransactions.length} mapped expense transaction(s)`}
                {unmappedCount > 0 ? copy.unmappedSuffix(unmappedCount) : ""}
              </p>
            </Card>
          </div>
          <div ref={kpiIncomeRef}>
            <Card className="dashboard-kpi-card">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.periodIncome}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatMoney(incomeTotal)}
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {locale === "ar"
                  ? `${periodIncomeTransactions.length} عملية دخل فهاد الفترة`
                  : locale === "fr"
                  ? `${periodIncomeTransactions.length} opération(s) de revenu sur la période`
                  : `${periodIncomeTransactions.length} income transaction(s) in period`}
              </p>
            </Card>
          </div>
          <div ref={kpiNetRef}>
            <Card className="dashboard-kpi-card">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.periodNet}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                <AnimatedNumber value={netTotal} format={formatMoney} />
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">{lastActivityLabel}</p>
            </Card>
          </div>
        </section>
      ) : null}

      {!hideDashboardDetailsUntilFirstIncome ? (
        <>
          <div className="dashboard-main-grid">
      <section className="dashboard-main-health grid gap-4">
        <Section
          title={copy.widgetCashSplit}
          className="dashboard-panel"
          actions={
            <div className="flex gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/envelopes">{copy.widgetOpenDistribution}</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sweeps">{copy.widgetOpenSweeps}</Link>
              </Button>
            </div>
          }
        >
          <p className="text-xs text-[var(--muted)]">{copy.widgetCashSplitDesc}</p>
	          <div className="mt-3 grid gap-2 sm:grid-cols-3">
	            <Card className="dashboard-list-card min-w-0">
	              <p className="text-xs text-[var(--muted)]">{copy.widgetPlanDirection}</p>
	              <p className="mt-1 truncate text-sm font-semibold tracking-tight">{planDirectionLabel}</p>
	            </Card>
	            <Card className="dashboard-list-card min-w-0">
	              <p className="text-xs text-[var(--muted)]">{copy.widgetPlanCoverage}</p>
	              <p className="mt-1 truncate text-sm font-semibold tabular-nums tracking-tight">
	                {distributionCoverage.coveredRules}/{distributionCoverage.totalRules}
	              </p>
	            </Card>
	            <Card className="dashboard-list-card min-w-0">
	              <p className="text-xs text-[var(--muted)]">{copy.widgetAutoSweep}</p>
	              <p className="mt-1 truncate text-sm font-semibold tracking-tight">
	                {autoSweepEnabled ? copy.widgetAutoSweepOn : copy.widgetAutoSweepOff}
	              </p>
	            </Card>
	          </div>
          {planRebalance.total > 0 ? (
            <div className="mt-3 rounded-2xl border border-[#e5e7eb] bg-[var(--surface)] p-3">
              <div className="flex h-3 overflow-hidden rounded-full border border-[#e5e7eb]">
                <div className="bg-[#ef4444]" style={{ width: `${planRebalance.debtPct}%` }} />
                <div className="bg-[#6366f1]" style={{ width: `${planRebalance.goalsPct}%` }} />
                <div className="bg-[#22c55e]" style={{ width: `${planRebalance.moronaPct}%` }} />
              </div>
	              <div className="mt-3 grid gap-2 sm:grid-cols-3">
	                <Card className="dashboard-list-card min-w-0">
	                  <p className="text-xs text-[var(--muted)]">{copy.widgetDebt}</p>
	                  <p className="mt-1 truncate text-sm font-semibold tabular-nums tracking-tight">
	                    {formatMoney(planRebalance.debt)}
	                  </p>
	                </Card>
	                <Card className="dashboard-list-card min-w-0">
	                  <p className="text-xs text-[var(--muted)]">{copy.widgetGoals}</p>
	                  <p className="mt-1 truncate text-sm font-semibold tabular-nums tracking-tight">
	                    {formatMoney(planRebalance.goals)}
	                  </p>
	                </Card>
	                <Card className="dashboard-list-card min-w-0">
	                  <p className="text-xs text-[var(--muted)]">{copy.widgetMorona}</p>
	                  <p className="mt-1 truncate text-sm font-semibold tabular-nums tracking-tight">
	                    {formatMoney(planRebalance.morona)}
	                  </p>
	                </Card>
	              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[var(--muted)]">{copy.widgetNoPlan}</p>
          )}
	          <div className="mt-3 grid gap-2 sm:grid-cols-2">
	            <Card className="dashboard-list-card min-w-0">
	              <p className="text-xs text-[var(--muted)]">{copy.widgetFixed}</p>
	              <p className="mt-1 truncate text-lg font-semibold tabular-nums tracking-tight">
	                {formatMoney(cashSplitLayerTotals.fixed)}
	              </p>
	            </Card>
	            <Card className="dashboard-list-card min-w-0">
	              <p className="text-xs text-[var(--muted)]">{copy.widgetCashLeft}</p>
	              <p className="mt-1 truncate text-lg font-semibold tabular-nums tracking-tight">
	                {formatMoney(cashSplitLayerTotals.cashLeft)}
	              </p>
	            </Card>
	          </div>
	        </Section>

        <Section title={copy.widgetRisk} className="dashboard-panel">
          <p className="text-xs text-[var(--muted)]">{copy.widgetRiskDesc}</p>
          <div className="mt-3 grid gap-2">
            {riskEnvelopes.length === 0 ? (
              <EmptyState
                title={copy.noEnvelopeTitle}
                description={copy.noEnvelopeDescription}
              />
            ) : (
              riskEnvelopes.map((item) => (
                <Card key={item.id} className="dashboard-list-card flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatMoney(item.spent)} / {formatMoney(item.allocated)} {copy.spentLabel}
                    </p>
                  </div>
                  <Badge tone={statusMeta(item.status).tone}>{statusMeta(item.status).label}</Badge>
                </Card>
              ))
            )}
          </div>
        </Section>
      </section>

      <section className="dashboard-main-insights grid gap-4">
        <Section title={copy.widgetDebtGoalsPressure} className="dashboard-panel">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="dashboard-list-card">
              <p className="text-xs text-[var(--muted)]">{copy.widgetDebtPressure}</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(debtPressureTotals.monthlyAllocation)}</p>
              <p className="text-xs text-[var(--muted)]">
                {debtPressureTotals.rulesCount > 0
                  ? `${debtPressureTotals.rulesCount} ${
                      locale === "ar" ? "ظرف دين" : locale === "fr" ? "enveloppe(s) dette" : "debt envelope(s)"
                    }`
                  : copy.widgetNoDebt}
              </p>
            </Card>
            <Card className="dashboard-list-card">
              <p className="text-xs text-[var(--muted)]">{copy.widgetGoalsPressure}</p>
              <p className="mt-1 text-lg font-semibold">{goalsCompletionPct.toFixed(1)}%</p>
              <p className="text-xs text-[var(--muted)]">
                {goals.length > 0
                  ? `${formatMoney(goalsPressureTotals.current)} / ${formatMoney(goalsPressureTotals.target)}`
                  : copy.widgetNoGoals}
              </p>
            </Card>
          </div>
        </Section>

        <Section title={copy.widgetAnomalies} className="dashboard-panel">
          <p className="text-xs text-[var(--muted)]">{copy.widgetAnomaliesDesc}</p>
          <div className="mt-3 grid gap-2">
            {systemAnomalies.length === 0 ? (
              <Alert>
                <AlertDescription>
                  {locale === "ar"
                    ? "ما كاين حتى خلل دابا."
                    : locale === "fr"
                    ? "Aucune anomalie détectée."
                    : "No anomaly detected."}
                </AlertDescription>
              </Alert>
            ) : (
              systemAnomalies.map((item) => (
                <Alert key={item.key} tone="warning">
                  <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {item.text}
                      {item.help ? ` — ${item.help}` : ""}
                    </span>
                    <Button asChild variant="secondary" size="sm">
                      <Link href={item.href}>{copy.seeAll}</Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </div>
        </Section>
      </section>

      <div ref={envelopesRef} className="dashboard-main-envelopes">
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
            onValueChange={(value) =>
              setEnvelopeFilter(value as "active" | "overspent" | "near")
            }
          >
            <TabsList>
              <TabsTrigger value="active">{copy.filterActive}</TabsTrigger>
              <TabsTrigger value="overspent">{copy.filterOverspent}</TabsTrigger>
              <TabsTrigger value="near">{copy.filterNear}</TabsTrigger>
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
            <Card className="dashboard-list-card mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{pinnedDebtEnvelope.name}</p>
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
              <div className="text-lg font-semibold">
                {formatMoney(pinnedDebtEnvelope.remaining)} {data?.user.currency ?? "MAD"}
              </div>
            </Card>
          ) : null}
          {topEnvelopes.length === 0 ? (
            <EmptyState
              title={copy.noEnvelopeTitle}
              description={copy.noEnvelopeDescription}
            />
          ) : (
            <div className="grid gap-3">
              {topEnvelopes.map((item) => (
                <Card
                  key={item.id}
                  className="dashboard-list-card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      <Badge tone={statusMeta(item.status).tone}>
                        {statusMeta(item.status).label}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {item.allocated > 0
                        ? `${formatMoney(item.spent)} / ${formatMoney(
                            item.allocated
                          )} ${copy.spentLabel}`
                        : `${copy.spentFallback}: ${formatMoney(item.spent)}`}
                    </p>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatMoney(item.remaining)} {data?.user.currency ?? "MAD"}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div ref={recentRef} className="dashboard-main-recent">
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
            <div className="grid gap-3">
              {recentExpenses.map((tx) => (
                <Card
                  key={tx.id}
                  className="dashboard-list-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {tx.description || copy.expenseFallback}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {resolveCategoryName(tx.category_id)} ·{" "}
                      {resolveEnvelopeName(tx)} · {formatLocaleDate(tx.occurred_on, locale)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="error">{formatMoney(tx.amount)}</Badge>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/transactions">{copy.edit}</Link>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteTarget(tx)}
                    >
                      {copy.delete}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      {spendingByEnvelope.length > 0 ? (
        <div ref={spendingRef} className="dashboard-main-spending">
          <Section title={copy.spendingByEnvelope} className="dashboard-panel">
            <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
              <Card interactive className="dashboard-chart-card">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendingByEnvelope}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total" fill="var(--accent-strong)" radius={6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card interactive className="dashboard-chart-card">
                <div className="divide-y divide-[var(--border)]">
                  {spendingByEnvelope.map((item) => (
                    <div key={item.name} className="flex justify-between py-2 text-sm">
                      <span>{item.name}</span>
                      <span>{formatMoney(item.total)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </Section>
        </div>
      ) : null}

      {trendPoints.length > 0 ? (
        <div ref={trendRef} className="dashboard-main-trend">
          <Section title={copy.netWorthTrend} className="dashboard-panel">
            <Card interactive className="dashboard-chart-card overflow-hidden">
              <div className="h-64 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendPoints} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis
                      dataKey="period"
                      tickFormatter={(value) => formatLocaleDate(String(value), locale)}
                      minTickGap={18}
                    />
                    <YAxis width={48} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="closing"
                      stroke="var(--accent-strong)"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Section>
        </div>
      ) : null}

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
        <Section title={copy.quickActions} className="dashboard-panel relative z-10 mt-8">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openQuickTransactionDialog("expense")}>
              {copy.quickAddExpense}
            </Button>
            <Button asChild variant="secondary">
              <Link href="/envelopes">{copy.quickAllocateCash}</Link>
            </Button>
            {unmappedCount > 0 ? (
              <Button asChild variant="ghost">
                <Link href="/categories">{copy.quickMapCategories}</Link>
              </Button>
            ) : null}
          </div>
        </Section>
      </div>
        </>
      ) : null}

      {mounted
        ? createPortal(
            <div
              ref={fabRef}
              className="fixed bottom-6 right-6 z-50 flex flex-col gap-3"
            >
              <Button
                className="rounded-full bg-emerald-600 px-5 shadow-lg hover:bg-emerald-700"
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
                {copy.fabDeclareIncome}
              </Button>
              <Button
                className="rounded-full bg-red-600 px-5 shadow-lg hover:bg-red-700"
                onClick={() => openQuickTransactionDialog("expense")}
              >
                {copy.fabDeclareExpense}
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
