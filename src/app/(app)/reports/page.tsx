"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiFetch } from "@/lib/api";
import type {
  CategoryEnvelopeMapOut,
  CategoryOut,
  DashboardOut,
  DashboardAlertOut,
  EnvelopeOut,
  EnvelopePeriodOut,
  SettingsResponse,
  SweepOut,
  TransactionOut,
} from "@/lib/types";
import {
  addDays,
  attachEnvelopeIds,
  buildKpis,
  cumulativeSeries,
  filterTransactions,
  formatMoney,
  groupByCategory,
  groupByDay,
  groupByEnvelopeFromMappings,
  startOfYear,
  type FilterState,
} from "@/lib/reports/compute";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ClientOnly } from "@/components/ui/ClientOnly";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportEmptyState } from "@/components/reports/ReportEmptyState";
import { ChartReveal } from "@/components/reports/ChartReveal";
import {
  GlobalTourOverlay,
  useGlobalTour,
  type TourStep,
} from "@/components/tour/GlobalTour";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";
import { localizeCategoryName } from "@/lib/categoryCatalog";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";

const defaultEnd = () => new Date().toISOString().slice(0, 10);
const defaultStart = () => addDays(defaultEnd(), -30);
const REPORTS_PERIOD_STORAGE_KEY = "floussy.reportsPeriod.v1";
const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";

const REPORTS_COPY: Record<
  FloussyLocale,
  {
    title: string;
    subtitle: string;
    exportCsv: string;
    printPdf: string;
    noDataTitle: string;
    noDataDesc: string;
    checklistExpense: string;
    checklistCategories: string;
    checklistMap: string;
    checklistAllocate: string;
    checklistSweep: string;
    filtersTitle: string;
    filtersSubtitle: string;
    range: string;
    start: string;
    end: string;
    envelope: string;
    category: string;
    type: string;
    allEnvelopes: string;
    allCategories: string;
    allTypes: string;
    income: string;
    expense: string;
    mappedOnly: string;
    transfers: string;
    transfersUnavailable: string;
    searchPlaceholder: string;
    noTxRange: string;
    noTxRangeDesc: string;
    last90: string;
    allTime: string;
    keyMetrics: string;
    keyMetricsSubtitle: string;
    netWorth: string;
    cashBalance: string;
    availableToAllocate: string;
    totalIncome: string;
    totalExpense: string;
    unmappedPercent: string;
    transactions: string;
    mappedCategories: string;
    envelopesFunded: string;
    lastActivity: string;
    none: string;
    overview: string;
    spending: string;
    incomeTab: string;
    envelopesTab: string;
    sweepsTab: string;
    quality: string;
    quickActions: string;
    quickActionsSubtitle: string;
    addTransaction: string;
    fixMappings: string;
    runSweep: string;
    selected: string;
    unmapped: string;
    mapped: string;
    categoryFallback: string;
    unknown: string;
    overspent: string;
    due: string;
    clear: string;
    sweepStatus: string;
    sweepDue: string;
    sweepNotRequired: string;
    needsWork: string;
    healthy: string;
    mapNow: string;
    qualityRecommendations: string;
    qualityRecommendationsSubtitle: string;
    reportQuality: string;
    reportQualitySubtitle: string;
    transactionsPreview: string;
    transactionsPreviewSubtitle: string;
    insights: string;
    insightsSubtitle: string;
    unknownError: string;
    overviewCards: Record<string, { title: string; description: string }>;
    empty: Record<string, { title: string; description: string; cta?: string }>;
    tour: Array<{ title: string; description: string }>;
    rangePresets: Array<{ value: string; label: string }>;
    qualityLabels: {
      mappedCategories: string;
      unmappedExpenses: string;
      neverFunded: string;
      sweepDue: string;
      mappedSuffix: string;
      yes: string;
      no: string;
    };
  }
> = {
  fr: {
    title: "Reports",
    subtitle: "Rends chaque dirham lisible avec des analyses utiles.",
    exportCsv: "Export CSV",
    printPdf: "Print / PDF",
    noDataTitle: "Tes reports ont besoin de plus d’activité",
    noDataDesc: "Complète la checklist pour débloquer les tendances et diagnostics.",
    checklistExpense: "Ajouter une dépense",
    checklistCategories: "Créer des catégories",
    checklistMap: "Mapper les catégories",
    checklistAllocate: "Allouer des budgets",
    checklistSweep: "Lancer un sweep",
    filtersTitle: "Filtres",
    filtersSubtitle: "Contrôle la période, le périmètre et le focus.",
    range: "Période",
    start: "Début",
    end: "Fin",
    envelope: "Enveloppe",
    category: "Catégorie",
    type: "Type",
    allEnvelopes: "Toutes les enveloppes",
    allCategories: "Toutes les catégories",
    allTypes: "Tous les types",
    income: "Revenu",
    expense: "Dépense",
    mappedOnly: "Dépenses mappées seulement",
    transfers: "Inclure les transferts",
    transfersUnavailable: "Les transferts ne sont pas encore disponibles",
    searchPlaceholder: "Cherche dans la description ou la catégorie",
    noTxRange: "Aucune transaction sur cette période",
    noTxRangeDesc: "Essaie une fenêtre plus large pour faire remonter de l’activité.",
    last90: "Voir les 90 derniers jours",
    allTime: "Voir tout l’historique",
    keyMetrics: "Indicateurs clés",
    keyMetricsSubtitle: "Un résumé rapide de la performance.",
    netWorth: "Valeur nette",
    cashBalance: "Solde Cash",
    availableToAllocate: "Disponible à allouer",
    totalIncome: "Total revenus",
    totalExpense: "Total dépenses",
    unmappedPercent: "% non mappé",
    transactions: "Transactions",
    mappedCategories: "Catégories mappées",
    envelopesFunded: "Enveloppes alimentées",
    lastActivity: "Dernière activité",
    none: "Aucune",
    overview: "Vue d’ensemble",
    spending: "Dépenses",
    incomeTab: "Revenus",
    envelopesTab: "Enveloppes",
    sweepsTab: "Sweeps",
    quality: "Qualité",
    quickActions: "Actions rapides",
    quickActionsSubtitle: "Va plus vite avec une navigation directe.",
    addTransaction: "Ajouter une transaction",
    fixMappings: "Corriger les mappings",
    runSweep: "Lancer un sweep",
    selected: "sélectionné(s)",
    unmapped: "Non mappé",
    mapped: "Mappé",
    categoryFallback: "Catégorie",
    unknown: "Inconnu",
    overspent: "Dépassée",
    due: "Dû",
    clear: "OK",
    sweepStatus: "Statut sweep",
    sweepDue: "Un sweep est dû",
    sweepNotRequired: "Aucun sweep requis",
    needsWork: "À corriger",
    healthy: "Sain",
    mapNow: "Mapper maintenant",
    qualityRecommendations: "Recommandations",
    qualityRecommendationsSubtitle: "Actions suggérées pour améliorer la qualité des reports.",
    reportQuality: "Qualité du report",
    reportQualitySubtitle: "Signaux utiles pour garder des reports fiables.",
    transactionsPreview: "Aperçu des transactions",
    transactionsPreviewSubtitle: "Activité récente dans ce filtre.",
    insights: "Insights",
    insightsSubtitle: "Points saillants générés à partir de l’activité.",
    unknownError: "Erreur inconnue",
    overviewCards: {
      pace: { title: "Rythme budget", description: "Dépense réelle vs rythme idéal." },
      spendByEnvelope: { title: "Dépenses par enveloppe", description: "Top enveloppes par dépense." },
      netWorthTrend: { title: "Tendance valeur nette", description: "Tendance du solde global." },
      noActivity: { title: "Aucune activité", description: "Commence par un premier revenu pour voir les tendances." },
      noPace: { title: "Pas encore de rythme", description: "Ajoute une dépense pour comparer réel vs idéal." },
      spendOverTime: { title: "Dépenses dans le temps", description: "Trajectoire des dépenses jour par jour." },
      categoryDistribution: { title: "Répartition par catégorie", description: "Top catégories par dépense." },
      unmappedExpenses: { title: "Dépenses non mappées", description: "Part des dépenses sans règles." },
      unmappedOverTime: { title: "Non mappées dans le temps", description: "Suis le volume des dépenses non mappées." },
      txVolume: { title: "Volume de transactions", description: "Nombre de transactions dans le temps." },
      avgSize: { title: "Montant moyen", description: "Moyenne glissante par jour." },
      heatmap: { title: "Heatmap calendrier", description: "Intensité quotidienne des dépenses." },
      incomeOverTime: { title: "Revenus dans le temps", description: "Tendance des revenus." },
      incomeByCategory: { title: "Revenus par catégorie", description: "Sources principales de revenus." },
      incomeVsExpense: { title: "Revenus vs dépenses", description: "Compare les totaux sur la période." },
      cashflowRadar: { title: "Radar de flux", description: "Équilibre entre revenus et dépenses." },
      savingsGrowth: { title: "Progression épargne", description: "Tendance de l’enveloppe d’épargne." },
      allocationVsSpent: { title: "Alloué vs dépensé", description: "Allocations de la période vs dépenses." },
      envelopeUtilization: { title: "Utilisation enveloppes", description: "Dépense vs alloué en %." },
      envelopeTrend: { title: "Tendance solde enveloppes", description: "Suis les meilleures enveloppes sur plusieurs périodes." },
      envelopesAtRisk: { title: "Enveloppes à risque", description: "Soldes qui demandent de l’attention." },
      sweepImpact: { title: "Impact sweep", description: "Reliquat déplacé vers l’épargne." },
      sweepReadiness: { title: "Préparation sweep", description: "Vérifie que les seaux restent propres." },
    },
    empty: {
      noCategories: { title: "Pas encore de catégories", description: "Crée des catégories pour détailler les dépenses.", cta: "Créer des catégories" },
      noExpenses: { title: "Pas encore de dépenses", description: "Aucune dépense enregistrée.", cta: "Ajouter une dépense" },
      noUnmapped: { title: "Pas de dépense non mappée", description: "Bravo, toutes les dépenses sont mappées." },
      noTransactions: { title: "Aucune transaction", description: "Ajoute des transactions pour débloquer les tendances.", cta: "Ajouter une transaction" },
      noAverages: { title: "Pas encore de moyenne", description: "Crée quelques transactions pour suivre la moyenne.", cta: "Ajouter une transaction" },
      noHeatmap: { title: "Pas encore de heatmap", description: "Ajoute des dépenses pour remplir la heatmap.", cta: "Ajouter une dépense" },
      noIncome: { title: "Pas encore de revenu", description: "Ajoute un revenu pour suivre l’évolution.", cta: "Ajouter un revenu" },
      noSavings: { title: "Pas d’enveloppe épargne", description: "Crée une enveloppe épargne pour suivre sa progression.", cta: "Voir les enveloppes" },
      noAllocations: { title: "Pas encore d’allocations", description: "Alloue des budgets pour voir l’usage des enveloppes.", cta: "Allouer des budgets" },
      noUtilization: { title: "Pas encore d’utilisation", description: "Alloue des budgets pour débloquer ces stats.", cta: "Allouer des budgets" },
      allClear: { title: "Tout est OK", description: "Aucune enveloppe dépassée pour le moment." },
      noMappings: { title: "Les mappings sont bons", description: "Toutes les catégories sont mappées." },
      noRangeData: { title: "Aucune donnée sur cette période", description: "Aucune donnée pour cette plage.", cta: "Ajouter une transaction" },
      noSavingsTrend: { title: "Pas de tendance épargne", description: "L’enveloppe épargne n’a pas de périodes sur cette plage.", cta: "Ajouter une allocation" },
      noTrendData: { title: "Pas de données de tendance", description: "Sélectionne des enveloppes pour charger l’historique.", cta: "Voir les enveloppes" },
      noSweeps: { title: "Pas encore de sweep", description: "Lance un sweep pour voir l’impact des transferts.", cta: "Lancer un sweep" },
    },
    tour: [
      { title: "Reports", description: "Toutes les analyses clés sur ta période." },
      { title: "Filtres", description: "Ajuste la période, l’enveloppe et la vue." },
      { title: "Indicateurs clés", description: "Résumé rapide de la performance." },
      { title: "Analyses visuelles", description: "Explore les graphiques et tendances détaillées." },
      { title: "Actions rapides", description: "Accès direct aux pages d’action." },
    ],
    rangePresets: [
      { value: "7d", label: "7 derniers jours" },
      { value: "30d", label: "30 derniers jours" },
      { value: "90d", label: "90 derniers jours" },
      { value: "ytd", label: "Depuis le début de l’année" },
      { value: "custom", label: "Personnalisé" },
    ],
    qualityLabels: {
      mappedCategories: "Catégories mappées",
      unmappedExpenses: "Dépenses non mappées",
      neverFunded: "Enveloppes jamais alimentées",
      sweepDue: "Sweep dû",
      mappedSuffix: "mappé",
      yes: "Oui",
      no: "Non",
    },
  },
  en: {
    title: "Reports",
    subtitle: "Make every dirham accountable with rich, actionable insights.",
    exportCsv: "Export CSV",
    printPdf: "Print / PDF",
    noDataTitle: "Your reports need more activity",
    noDataDesc: "Complete the checklist to unlock richer trends and diagnostics.",
    checklistExpense: "Add an expense",
    checklistCategories: "Create categories",
    checklistMap: "Map categories",
    checklistAllocate: "Allocate budgets",
    checklistSweep: "Run a sweep",
    filtersTitle: "Filters",
    filtersSubtitle: "Control timeframe, scope, and focus.",
    range: "Range",
    start: "Start",
    end: "End",
    envelope: "Envelope",
    category: "Category",
    type: "Type",
    allEnvelopes: "All envelopes",
    allCategories: "All categories",
    allTypes: "All types",
    income: "Income",
    expense: "Expense",
    mappedOnly: "Mapped expenses only",
    transfers: "Include transfers",
    transfersUnavailable: "Transfers not available yet",
    searchPlaceholder: "Search description or category",
    noTxRange: "No transactions in this range",
    noTxRangeDesc: "Try a wider time window to surface activity.",
    last90: "Show last 90 days",
    allTime: "Show all time",
    keyMetrics: "Key metrics",
    keyMetricsSubtitle: "A fast snapshot of performance.",
    netWorth: "Net worth",
    cashBalance: "Cash balance",
    availableToAllocate: "Available to allocate",
    totalIncome: "Total income",
    totalExpense: "Total expense",
    unmappedPercent: "Unmapped %",
    transactions: "Transactions",
    mappedCategories: "Mapped categories",
    envelopesFunded: "Envelopes funded",
    lastActivity: "Last activity",
    none: "None",
    overview: "Overview",
    spending: "Spending",
    incomeTab: "Income",
    envelopesTab: "Envelopes",
    sweepsTab: "Sweeps",
    quality: "Quality",
    quickActions: "Quick actions",
    quickActionsSubtitle: "Move faster with direct navigation.",
    addTransaction: "Add transaction",
    fixMappings: "Fix mappings",
    runSweep: "Run sweep",
    selected: "selected",
    unmapped: "Unmapped",
    mapped: "Mapped",
    categoryFallback: "Category",
    unknown: "Unknown",
    overspent: "Overspent",
    due: "Due",
    clear: "Clear",
    sweepStatus: "Sweep status",
    sweepDue: "A sweep is due",
    sweepNotRequired: "No sweep required",
    needsWork: "Needs work",
    healthy: "Healthy",
    mapNow: "Map now",
    qualityRecommendations: "Recommendations",
    qualityRecommendationsSubtitle: "Suggested actions to improve report quality.",
    reportQuality: "Report quality",
    reportQualitySubtitle: "Signals to keep reports trustworthy.",
    transactionsPreview: "Transactions preview",
    transactionsPreviewSubtitle: "Recent activity in this filter.",
    insights: "Insights",
    insightsSubtitle: "Automatic highlights from your activity.",
    unknownError: "Unknown error",
    overviewCards: {
      pace: { title: "Budget pace", description: "Actual spending vs ideal pace." },
      spendByEnvelope: { title: "Spending by envelope", description: "Top envelopes by spend." },
      netWorthTrend: { title: "Net worth trend", description: "Trend of your overall balance." },
      noActivity: { title: "No activity", description: "Start with your first income to see cashflow trends." },
      noPace: { title: "No spend pace yet", description: "Add an expense to compare actual vs ideal pace." },
      spendOverTime: { title: "Spending over time", description: "Daily spend trajectory." },
      categoryDistribution: { title: "Category distribution", description: "Top categories by spend." },
      unmappedExpenses: { title: "Unmapped expenses", description: "Share of spend without rules." },
      unmappedOverTime: { title: "Unmapped spend over time", description: "Track the volume of unmapped expenses." },
      txVolume: { title: "Transactions volume", description: "Count of transactions over time." },
      avgSize: { title: "Average transaction size", description: "Rolling average per day." },
      heatmap: { title: "Calendar heatmap", description: "Daily spend intensity in this range." },
      incomeOverTime: { title: "Income over time", description: "Income trend line." },
      incomeByCategory: { title: "Income by category", description: "Top income sources in this range." },
      incomeVsExpense: { title: "Income vs expense", description: "Compare totals for the range." },
      cashflowRadar: { title: "Cashflow radar", description: "Balance between income and expenses." },
      savingsGrowth: { title: "Savings growth", description: "Default savings envelope trend." },
      allocationVsSpent: { title: "Allocation vs spent", description: "Current period allocations compared to spend." },
      envelopeUtilization: { title: "Envelope utilization", description: "Spend vs allocated percentage." },
      envelopeTrend: { title: "Envelope balance trend", description: "Track top envelopes across periods." },
      envelopesAtRisk: { title: "Envelopes at risk", description: "Balances that may need attention." },
      sweepImpact: { title: "Sweep impact", description: "Leftover moved into savings." },
      sweepReadiness: { title: "Sweep readiness", description: "Ensure buckets are kept tidy." },
    },
    empty: {
      noCategories: { title: "No categories yet", description: "Create categories to break down your spend.", cta: "Create categories" },
      noExpenses: { title: "No expenses", description: "No spend recorded yet.", cta: "Add expense" },
      noUnmapped: { title: "No unmapped spend", description: "Great job! All expenses are mapped." },
      noTransactions: { title: "No transactions", description: "Add transactions to unlock volume trends.", cta: "Add transaction" },
      noAverages: { title: "No averages yet", description: "Create a few transactions to track averages.", cta: "Add transaction" },
      noHeatmap: { title: "No spend heatmap yet", description: "Add expenses to populate the heatmap.", cta: "Add expense" },
      noIncome: { title: "No income yet", description: "Add income to track your inflow trend.", cta: "Add income" },
      noSavings: { title: "No savings envelope", description: "Create a savings envelope to track growth.", cta: "Go to envelopes" },
      noAllocations: { title: "No allocations yet", description: "Allocate budgets to see envelope usage.", cta: "Allocate budgets" },
      noUtilization: { title: "No utilization yet", description: "Allocate budgets to unlock utilization stats.", cta: "Allocate budgets" },
      allClear: { title: "All clear", description: "No overspent envelopes right now." },
      noMappings: { title: "Mappings look good", description: "All categories are mapped." },
      noRangeData: { title: "No data for this range", description: "No data for this range.", cta: "Add transaction" },
      noSavingsTrend: { title: "No savings trend", description: "Savings envelope has no periods in range.", cta: "Add allocation" },
      noTrendData: { title: "No trend data", description: "Select envelopes to load balance history.", cta: "View envelopes" },
      noSweeps: { title: "No sweeps yet", description: "Run a sweep to see transfer impact.", cta: "Run sweep" },
    },
    tour: [
      { title: "Reports", description: "All the key analyses on your period." },
      { title: "Filters", description: "Adjust range, envelope, and view." },
      { title: "Key metrics", description: "Quick performance snapshot." },
      { title: "Visual analysis", description: "Explore detailed charts and trends." },
      { title: "Quick actions", description: "Direct access to action pages." },
    ],
    rangePresets: [
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 90 days" },
      { value: "ytd", label: "Year to date" },
      { value: "custom", label: "Custom" },
    ],
    qualityLabels: {
      mappedCategories: "Mapped categories",
      unmappedExpenses: "Unmapped expenses",
      neverFunded: "Envelopes never funded",
      sweepDue: "Sweep due",
      mappedSuffix: "mapped",
      yes: "Yes",
      no: "No",
    },
  },
  ar: {
    title: "التقارير",
    subtitle: "خلي كل درهم يبان مزيان بتقارير مفيدة وقابلة للتصرف.",
    exportCsv: "تصدير CSV",
    printPdf: "طبع / PDF",
    noDataTitle: "التقارير محتاجة نشاط أكثر",
    noDataDesc: "كمّل هاد اللائحة باش تبان ليك trends و diagnostics أقوى.",
    checklistExpense: "زيد مصروف",
    checklistCategories: "زيد أصناف",
    checklistMap: "ربط الأصناف",
    checklistAllocate: "وزّع الميزانيات",
    checklistSweep: "شغّل sweep",
    filtersTitle: "الفلاتر",
    filtersSubtitle: "تحكم فالفترة، النطاق، والتركيز.",
    range: "الفترة",
    start: "البداية",
    end: "النهاية",
    envelope: "الظرف",
    category: "الصنف",
    type: "النوع",
    allEnvelopes: "كل الأظرفة",
    allCategories: "كل الأصناف",
    allTypes: "كل الأنواع",
    income: "دخل",
    expense: "مصروف",
    mappedOnly: "غير المصاريف المربوطة",
    transfers: "دخل التحويلات",
    transfersUnavailable: "التحويلات مازال ما متوفراش",
    searchPlaceholder: "قلب فالوصف ولا الصنف",
    noTxRange: "ما كايناش عمليات فهاد الفترة",
    noTxRangeDesc: "جرب فترة أوسع باش تبان الحركة.",
    last90: "شوف آخر 90 يوم",
    allTime: "شوف التاريخ كامل",
    keyMetrics: "المؤشرات الرئيسية",
    keyMetricsSubtitle: "نظرة سريعة على الأداء.",
    netWorth: "القيمة الصافية",
    cashBalance: "رصيد لكاش",
    availableToAllocate: "المتاح للتوزيع",
    totalIncome: "مجموع الدخل",
    totalExpense: "مجموع المصاريف",
    unmappedPercent: "% غير مربوط",
    transactions: "العمليات",
    mappedCategories: "الأصناف المربوطة",
    envelopesFunded: "الأظرفة الممولة",
    lastActivity: "آخر نشاط",
    none: "والو",
    overview: "نظرة عامة",
    spending: "المصاريف",
    incomeTab: "الدخل",
    envelopesTab: "الأظرفة",
    sweepsTab: "السويبات",
    quality: "الجودة",
    quickActions: "أكشنات سريعة",
    quickActionsSubtitle: "تحرك بسرعة باختصارات مباشرة.",
    addTransaction: "زيد عملية",
    fixMappings: "صلّح الربط",
    runSweep: "شغّل sweep",
    selected: "مختار",
    unmapped: "غير مربوط",
    mapped: "مربوط",
    categoryFallback: "صنف",
    unknown: "غير معروف",
    overspent: "خارج على الحد",
    due: "مستحق",
    clear: "مزيان",
    sweepStatus: "حالة sweep",
    sweepDue: "كاين sweep مستحق",
    sweepNotRequired: "ما كاين حتى sweep ضروري",
    needsWork: "خص الخدمة",
    healthy: "مزيان",
    mapNow: "ربط دابا",
    qualityRecommendations: "التوصيات",
    qualityRecommendationsSubtitle: "أكشنات مقترحة باش تتحسن جودة التقارير.",
    reportQuality: "جودة التقارير",
    reportQualitySubtitle: "إشارات كتعاونك تبقى التقارير موثوقة.",
    transactionsPreview: "معاينة العمليات",
    transactionsPreviewSubtitle: "آخر النشاط فهاد الفلتر.",
    insights: "ملاحظات مهمة",
    insightsSubtitle: "الخلاصات الأوتوماتيكية من النشاط ديالك.",
    unknownError: "وقع مشكل غير معروف",
    overviewCards: {
      pace: { title: "سرعة الميزانية", description: "المصروف الحقيقي مقابل الوتيرة المثالية." },
      spendByEnvelope: { title: "المصاريف حسب الظرف", description: "أكثر الأظرفة صرفاً." },
      netWorthTrend: { title: "تطور القيمة الصافية", description: "الاتجاه ديال الرصيد العام." },
      noActivity: { title: "ما كاين حتى نشاط", description: "بدا بأول دخل باش تبان trends ديال cashflow." },
      noPace: { title: "مازال ما باناش الوتيرة", description: "زيد مصروف باش تقارن الحقيقي بالمثالي." },
      spendOverTime: { title: "المصاريف مع الوقت", description: "كيفاش المصروف كيتحرك نهار بنهار." },
      categoryDistribution: { title: "توزيع الأصناف", description: "أكبر الأصناف حسب المصروف." },
      unmappedExpenses: { title: "المصاريف غير المربوطة", description: "الحصة ديال المصروف بلا قواعد." },
      unmappedOverTime: { title: "المصاريف غير المربوطة مع الوقت", description: "تبع الحجم ديالها عبر الوقت." },
      txVolume: { title: "حجم العمليات", description: "عدد العمليات عبر الوقت." },
      avgSize: { title: "متوسط حجم العملية", description: "المتوسط اليومي المتحرك." },
      heatmap: { title: "خريطة الأيام", description: "شدة المصروف فهاد الفترة." },
      incomeOverTime: { title: "الدخل مع الوقت", description: "تطور الدخل." },
      incomeByCategory: { title: "الدخل حسب الصنف", description: "أكبر مصادر الدخل فهاد الفترة." },
      incomeVsExpense: { title: "الدخل مقابل المصروف", description: "قارن المجاميع ديال الفترة." },
      cashflowRadar: { title: "رادار الكاشفلو", description: "التوازن بين الدخل والمصاريف." },
      savingsGrowth: { title: "نمو الادخار", description: "تطور ظرف الادخار الافتراضي." },
      allocationVsSpent: { title: "الموزع مقابل المصروف", description: "توزيع الفترة مقارنة مع الصرف." },
      envelopeUtilization: { title: "استعمال الأظرفة", description: "المصروف مقارنة مع المخصص بالنسبة." },
      envelopeTrend: { title: "تطور رصيد الأظرفة", description: "تبع أفضل الأظرفة عبر الفترات." },
      envelopesAtRisk: { title: "الأظرفة اللي خاصها انتباه", description: "أرصدة كتحتاج متابعة." },
      sweepImpact: { title: "أثر sweep", description: "الباقي اللي تحوّل للادخار." },
      sweepReadiness: { title: "جاهزية sweep", description: "تأكد باللي السلال باقين منظمين." },
    },
    empty: {
      noCategories: { title: "ما كايناش أصناف دابا", description: "زيد أصناف باش تفصل المصاريف.", cta: "زيد أصناف" },
      noExpenses: { title: "ما كاين حتى مصروف", description: "ما تسجل حتى مصروف دابا.", cta: "زيد مصروف" },
      noUnmapped: { title: "ما كاين حتى مصروف غير مربوط", description: "خدمة نقية، كلشي مربوط." },
      noTransactions: { title: "ما كايناش عمليات", description: "زيد عمليات باش تبان trends.", cta: "زيد عملية" },
      noAverages: { title: "مازال ما كاين حتى متوسط", description: "زيد شوية ديال العمليات باش يتحسب المتوسط.", cta: "زيد عملية" },
      noHeatmap: { title: "مازال ما كايناش heatmap", description: "زيد مصاريف باش تعمر الخريطة.", cta: "زيد مصروف" },
      noIncome: { title: "ما كاين حتى دخل", description: "زيد دخل باش تراقب التطور.", cta: "زيد دخل" },
      noSavings: { title: "ما كاينش ظرف الادخار", description: "زيد ظرف الادخار باش تراقب النمو.", cta: "سير للأظرفة" },
      noAllocations: { title: "ما كايناش توزيعات دابا", description: "وزّع الميزانيات باش يبان استعمال الأظرفة.", cta: "وزّع الميزانيات" },
      noUtilization: { title: "مازال ما كاينش الاستعمال", description: "وزّع الميزانيات باش تبان هاد الإحصائيات.", cta: "وزّع الميزانيات" },
      allClear: { title: "كلشي مزيان", description: "ما كاين حتى ظرف خارج على الحد دابا." },
      noMappings: { title: "الربط مزيان", description: "كل الأصناف مربوطين." },
      noRangeData: { title: "ما كايناش بيانات فهاد الفترة", description: "ما كايناش بيانات فهاد البلاصة.", cta: "زيد عملية" },
      noSavingsTrend: { title: "ما كايناش trend ديال الادخار", description: "ظرف الادخار ما عندوش فترات فهاد النطاق.", cta: "زيد تخصيص" },
      noTrendData: { title: "ما كايناش بيانات ديال التريند", description: "اختار أظرفة باش يتحمل التاريخ ديال الرصيد.", cta: "شوف الأظرفة" },
      noSweeps: { title: "ما كاين حتى sweep", description: "شغّل sweep باش يبان الأثر ديال التحويلات.", cta: "شغّل sweep" },
    },
    tour: [
      { title: "التقارير", description: "جميع التحليلات المهمة ديال هاد الفترة." },
      { title: "الفلاتر", description: "بدل الفترة، الظرف، والواجهة." },
      { title: "المؤشرات الرئيسية", description: "تلخيص سريع للأداء." },
      { title: "التحليلات البصرية", description: "شوف الكرافيات والتطورات بالتفصيل." },
      { title: "أكشنات سريعة", description: "دخول مباشر لصفحات الأكشن." },
    ],
    rangePresets: [
      { value: "7d", label: "آخر 7 أيام" },
      { value: "30d", label: "آخر 30 يوم" },
      { value: "90d", label: "آخر 90 يوم" },
      { value: "ytd", label: "من بداية العام" },
      { value: "custom", label: "مخصص" },
    ],
    qualityLabels: {
      mappedCategories: "الأصناف المربوطة",
      unmappedExpenses: "المصاريف غير المربوطة",
      neverFunded: "أظرفة ما تعمروش",
      sweepDue: "sweep مستحق",
      mappedSuffix: "مربوط",
      yes: "نعم",
      no: "لا",
    },
  },
};

const skeletons = Array.from({ length: 6 }).map((_, idx) => idx);

const groupByWeek = (
  rows: { date: string; income: number; expense: number; count: number; avgSize: number }[]
) => {
  const weekMap = new Map<
    string,
    { income: number; expense: number; count: number; avgSize: number }
  >();
  rows.forEach((row) => {
    const [year, month, day] = row.date.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
    const key = weekStart.toISOString().slice(0, 10);
    const current = weekMap.get(key) ?? {
      income: 0,
      expense: 0,
      count: 0,
      avgSize: 0,
    };
    current.income += row.income;
    current.expense += row.expense;
    current.count += row.count;
    current.avgSize += row.avgSize;
    weekMap.set(key, current);
  });

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, value]) => ({
      date,
      income: value.income,
      expense: value.expense,
      net: value.income - value.expense,
      count: value.count,
      avgSize: value.count ? value.avgSize / value.count : 0,
    }));
};

const buildHeatmapCells = (
  start: string,
  end: string,
  series: { date: string; expense: number }[]
) => {
  const map = new Map(series.map((row) => [row.date, row.expense]));
  const cells: { date: string; value: number }[] = [];
  const [sYear, sMonth, sDay] = start.split("-").map(Number);
  const [eYear, eMonth, eDay] = end.split("-").map(Number);
  const cursor = new Date(Date.UTC(sYear, sMonth - 1, sDay));
  const endDate = new Date(Date.UTC(eYear, eMonth - 1, eDay));
  while (cursor <= endDate) {
    const iso = cursor.toISOString().slice(0, 10);
    cells.push({ date: iso, value: map.get(iso) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cells;
};

const printStyles = `
@media print {
  body { background: white !important; }
  header, nav, .no-print { display: none !important; }
  .print-area { padding: 0 !important; }
  .print-area .report-card {
    box-shadow: none !important;
    border: 1px solid #ddd !important;
  }
}
`;

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const kpiRef = useRef<HTMLDivElement | null>(null);
  const chartsRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const copy = REPORTS_COPY[locale];
  const pageDir = getLocaleDirection(locale);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeOut[]>([]);
  const [mappings, setMappings] = useState<CategoryEnvelopeMapOut[]>([]);
  const [sweeps, setSweeps] = useState<SweepOut[]>([]);
  const [sweepDue, setSweepDue] = useState(false);
  const [periodsByEnvelope, setPeriodsByEnvelope] = useState<
    Record<string, EnvelopePeriodOut[]>
  >({});

  const [rangePreset, setRangePreset] = useState("30d");
  const [customStart, setCustomStart] = useState(defaultStart());
  const [customEnd, setCustomEnd] = useState(defaultEnd());
  const [typeFilter, setTypeFilter] = useState<
    "all" | "income" | "expense"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [envelopeFilter, setEnvelopeFilter] = useState<string | "all">("all");
  const [mappedOnly, setMappedOnly] = useState(false);
  const [includeTransfers, setIncludeTransfers] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("overview");
  const [selectedEnvelopeIds, setSelectedEnvelopeIds] = useState<string[]>([]);
  const [rangeReady, setRangeReady] = useState(false);

  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  useEffect(() => {
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    if (startParam && endParam) {
      setRangePreset("custom");
      setCustomStart(startParam);
      setCustomEnd(endParam);
      setRangeReady(true);
      return;
    }
    try {
      const stored = localStorage.getItem(REPORTS_PERIOD_STORAGE_KEY);
      if (!stored) {
        setRangeReady(true);
        return;
      }
      const parsed = JSON.parse(stored) as { start?: string; end?: string };
      if (parsed?.start && parsed?.end) {
        setRangePreset("custom");
        setCustomStart(parsed.start);
        setCustomEnd(parsed.end);
        router.replace(`${pathname}?start=${parsed.start}&end=${parsed.end}`);
      } else {
        localStorage.removeItem(REPORTS_PERIOD_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(REPORTS_PERIOD_STORAGE_KEY);
    } finally {
      setRangeReady(true);
    }
  }, [pathname, router, searchParams]);

  const range = useMemo(() => {
    const end = defaultEnd();
    if (rangePreset === "7d") return { start: addDays(end, -7), end };
    if (rangePreset === "30d") return { start: addDays(end, -30), end };
    if (rangePreset === "90d") return { start: addDays(end, -90), end };
    if (rangePreset === "ytd") return { start: startOfYear(end), end };
    return { start: customStart, end: customEnd };
  }, [rangePreset, customStart, customEnd]);

  const periodQuery = useMemo(
    () => `?start=${range.start}&end=${range.end}`,
    [range]
  );

  useEffect(() => {
    if (!rangeReady) return;
    try {
      localStorage.setItem(
        REPORTS_PERIOD_STORAGE_KEY,
        JSON.stringify({ start: range.start, end: range.end })
      );
    } catch {
      // ignore
    }
    router.replace(`${pathname}?start=${range.start}&end=${range.end}`);
  }, [range.start, range.end, rangeReady, pathname, router]);

  const filters: FilterState = useMemo(
    () => ({
      start: range.start,
      end: range.end,
      type: typeFilter,
      categoryId: categoryFilter,
      envelopeId: envelopeFilter,
      mappedOnly,
    }),
    [range, typeFilter, categoryFilter, envelopeFilter, mappedOnly]
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const envelopeMap = useMemo(
    () => new Map(envelopes.map((envelope) => [envelope.id, envelope.name])),
    [envelopes]
  );

  const savingsEnvelope = useMemo(
    () => envelopes.find((envelope) => envelope.is_default_savings),
    [envelopes]
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [settingsData, dashboardData, txData, categoryData, envelopeData] =
          await Promise.all([
            apiFetch<SettingsResponse>("/users/me/settings"),
            apiFetch<DashboardOut>(`/dashboard${periodQuery}`),
            apiFetch<TransactionOut[]>("/transactions"),
            apiFetch<CategoryOut[]>("/categories"),
            apiFetch<EnvelopeOut[]>("/envelopes"),
          ]);
        const mappingData = await apiFetch<CategoryEnvelopeMapOut[]>(
          "/mappings"
        ).catch(() => []);

        if (!mounted) return;
        setSettings(settingsData);
        setDashboard(dashboardData);
        setTransactions(txData);
        setCategories(categoryData);
        setEnvelopes(envelopeData);
        setMappings(mappingData);

        const sweepsData = await apiFetch<SweepOut[]>("/sweeps").catch(() => []);
        if (mounted) setSweeps(sweepsData);

        const alerts = await apiFetch<DashboardAlertOut>(
          `/dashboard/alerts${periodQuery}`
        ).catch(() => ({ sweep_due: false, unmapped_categories: 0, overspent_envelopes: [] }));
        if (mounted) setSweepDue(Boolean(alerts.sweep_due));

      } catch (err) {
        const message = err instanceof Error ? err.message : copy.unknownError;
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [periodQuery, copy.unknownError]);

  useEffect(() => {
    if (!savingsEnvelope) return;
    if (periodsByEnvelope[savingsEnvelope.id]) return;

    apiFetch<EnvelopePeriodOut[]>(
      `/envelopes/${savingsEnvelope.id}/periods`
    )
      .then((data) => {
        setPeriodsByEnvelope((prev) => ({
          ...prev,
          [savingsEnvelope.id]: data,
        }));
      })
      .catch(() => null);
  }, [savingsEnvelope, periodsByEnvelope]);

  const transactionsWithEnvelope = useMemo(() => {
    return attachEnvelopeIds(transactions, categories, envelopes, mappings);
  }, [transactions, categories, envelopes, mappings]);

  const transfersAvailable = useMemo(() => {
    return transactions.some((tx) =>
      (tx.description ?? "").toLowerCase().includes("sweep")
    );
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const list = filterTransactions(transactionsWithEnvelope, filters).filter(
      (tx) => {
        if (!includeTransfers) {
          return !tx.description?.toLowerCase().includes("sweep");
        }
        return true;
      }
    );

    if (!search.trim()) return list;
    const needle = search.toLowerCase();
    return list.filter((tx) => {
      const categoryName = categoryMap.get(tx.category_id) ?? "";
      return (
        tx.description?.toLowerCase().includes(needle) ||
        categoryName.toLowerCase().includes(needle)
      );
    });
  }, [
    transactionsWithEnvelope,
    filters,
    includeTransfers,
    search,
    categoryMap,
  ]);

  const dailySeries = useMemo(() => {
    const grouped = groupByDay(filteredTransactions);
    return grouped.length > 60 ? groupByWeek(grouped) : grouped;
  }, [filteredTransactions]);

  const heatmapCells = useMemo(() => {
    return buildHeatmapCells(range.start, range.end, dailySeries);
  }, [range.start, range.end, dailySeries]);

  const unmappedDaily = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions
      .filter((tx) => tx.type === "expense" && !tx.envelopeId)
      .forEach((tx) => {
        const current = map.get(tx.occurred_on) ?? 0;
        const next = current + Number(tx.amount);
        map.set(tx.occurred_on, next);
      });
    return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }));
  }, [filteredTransactions]);

  const spendingByEnvelope = useMemo(() => {
    return groupByEnvelopeFromMappings(filteredTransactions, envelopes);
  }, [filteredTransactions, envelopes]);

  const spendingByCategory = useMemo(() => {
    return groupByCategory(filteredTransactions, categories);
  }, [filteredTransactions, categories]);

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, { categoryId: string; name: string; total: number }>();
    filteredTransactions
      .filter((tx) => tx.type === "income")
      .forEach((tx) => {
        const current = map.get(tx.category_id) ?? {
          categoryId: tx.category_id,
          name: categoryMap.get(tx.category_id) ?? copy.unknown,
          total: 0,
        };
        current.total += Number(tx.amount);
        map.set(tx.category_id, current);
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredTransactions, categoryMap, copy.unknown]);

  const allocatedEnvelopes = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.envelopes
      .filter((item) => Number(item.balance.total_allocations ?? 0) > 0)
      .map((item) => item.envelope.id);
  }, [dashboard]);

  const kpis = useMemo(() => {
    return buildKpis(filteredTransactions, categories, mappings, allocatedEnvelopes);
  }, [filteredTransactions, categories, mappings, allocatedEnvelopes]);

  const hasLowData = kpis.transactionCount < 3 || kpis.totalExpense === 0;

  const insights = useMemo(() => {
    const totalIncome = kpis.totalIncome;
    const totalExpense = kpis.totalExpense;
    const mappedRatio = kpis.mappedRatio;
    const topEnvelope = spendingByEnvelope[0];
    const busiestDay = dailySeries.reduce(
      (acc, row) => (row.expense > acc.total ? { date: row.date, total: row.expense } : acc),
      { date: "", total: 0 }
    );
    const savingsTrend = periodsByEnvelope[savingsEnvelope?.id ?? ""] ?? [];
    const savingsChange =
      savingsTrend.length > 1
        ? Number(savingsTrend[savingsTrend.length - 1].closing_balance ?? 0) -
          Number(savingsTrend[0].closing_balance ?? 0)
        : 0;
    const lowDataInsights =
      locale === "ar"
        ? [
            "زيد أول مصروف باش يبان لك التحليل ديال المصاريف.",
            "ربط الأصناف بالأظرفة باش تشوف الأداء ديال كل ظرف.",
            "وزّع الميزانيات باش تقارن الخطة مع الواقع.",
            "دير أول sweep باش يبقاو الأظرفة منظمين.",
            "زيد على الأقل 3 عمليات باش تبان trends أقوى.",
          ]
        : locale === "fr"
        ? [
            "Ajoute ta première dépense pour débloquer les insights de dépense.",
            "Mappe les catégories aux enveloppes pour voir la performance par enveloppe.",
            "Alloue des budgets pour comparer le plan au réel.",
            "Lance ton premier sweep pour garder les enveloppes propres.",
            "Ajoute au moins 3 transactions pour obtenir de meilleures tendances.",
          ]
        : [
            "Add your first expense to unlock spending insights.",
            "Map categories to envelopes to see envelope performance.",
            "Allocate budgets to compare plan vs actual.",
            "Run your first sweep to keep envelopes tidy.",
            "Add at least 3 transactions for richer trends.",
          ];
    if (hasLowData) return lowDataInsights;

    const localizedInsights: string[] = [];
    localizedInsights.push(
      totalExpense > totalIncome
        ? locale === "ar"
          ? "المصاريف فاتت الدخل فهاد الفترة."
          : locale === "fr"
          ? "Les dépenses ont dépassé les revenus sur cette période."
          : "Spending exceeded income in the selected period."
        : locale === "ar"
        ? "الدخل غطى المصاريف فهاد الفترة."
        : locale === "fr"
        ? "Les revenus ont couvert les dépenses sur cette période."
        : "Income covered spending for the selected period."
    );

    if (topEnvelope) {
      localizedInsights.push(
        locale === "ar"
          ? `أكثر ظرف تصرف هو ${topEnvelope.name} (${topEnvelope.total.toFixed(2)}).`
          : locale === "fr"
          ? `Top dépense par enveloppe : ${topEnvelope.name} (${topEnvelope.total.toFixed(2)}).`
          : `Top envelope spend: ${topEnvelope.name} (${topEnvelope.total.toFixed(2)}).`
      );
    }

    localizedInsights.push(
      locale === "ar"
        ? `المصاريف غير المربوطة كتمثل ${(mappedRatio * 100).toFixed(1)}% من المصروف.`
        : locale === "fr"
        ? `Les dépenses non mappées représentent ${(mappedRatio * 100).toFixed(1)}% des dépenses.`
        : `Unmapped expenses represent ${(mappedRatio * 100).toFixed(1)}% of spend.`
    );

    if (busiestDay.total) {
      localizedInsights.push(
        locale === "ar"
          ? `أعلى نهار فالمصاريف هو ${busiestDay.date} (${busiestDay.total.toFixed(2)}).`
          : locale === "fr"
          ? `Le jour avec le plus de dépenses est ${busiestDay.date} (${busiestDay.total.toFixed(2)}).`
          : `Highest spending day was ${busiestDay.date} (${busiestDay.total.toFixed(2)}).`
      );
    }

    if (typeof savingsChange === "number") {
      localizedInsights.push(
        savingsChange >= 0
          ? locale === "ar"
            ? `الادخار تزاد بـ ${savingsChange.toFixed(2)} فهاد الفترة.`
            : locale === "fr"
            ? `L’épargne a augmenté de ${savingsChange.toFixed(2)} sur cette période.`
            : `Savings grew by ${savingsChange.toFixed(2)} this period.`
          : locale === "ar"
          ? `الادخار نقص بـ ${Math.abs(savingsChange).toFixed(2)} فهاد الفترة.`
          : locale === "fr"
          ? `L’épargne a baissé de ${Math.abs(savingsChange).toFixed(2)} sur cette période.`
          : `Savings declined by ${Math.abs(savingsChange).toFixed(2)} this period.`
      );
    }

    return localizedInsights;
  }, [
    locale,
    hasLowData,
    kpis.totalIncome,
    kpis.totalExpense,
    kpis.mappedRatio,
    spendingByEnvelope,
    dailySeries,
    periodsByEnvelope,
    savingsEnvelope,
  ]);

  const qualityChecks = useMemo(() => {
    const neverAllocated = envelopes.length - allocatedEnvelopes.length;
    const mappedCategoryRatio = kpis.totalCategories
      ? kpis.mappedCategories / kpis.totalCategories
      : 1;
    return [
      {
        label: copy.qualityLabels.mappedCategories,
        value: `${(mappedCategoryRatio * 100).toFixed(1)}% ${copy.qualityLabels.mappedSuffix}`,
        status: mappedCategoryRatio < 0.7 ? "warn" : "good",
      },
      {
        label: copy.qualityLabels.unmappedExpenses,
        value: `${kpis.unmappedSpend.toFixed(2)}`,
        status: kpis.unmappedSpend > 0 ? "warn" : "good",
      },
      {
        label: copy.qualityLabels.neverFunded,
        value: `${neverAllocated}`,
        status: neverAllocated > 0 ? "warn" : "good",
      },
      {
        label: copy.qualityLabels.sweepDue,
        value: sweepDue ? copy.qualityLabels.yes : copy.qualityLabels.no,
        status: sweepDue ? "warn" : "good",
      },
    ];
  }, [
    copy.qualityLabels.mappedCategories,
    copy.qualityLabels.mappedSuffix,
    copy.qualityLabels.neverFunded,
    copy.qualityLabels.no,
    copy.qualityLabels.sweepDue,
    copy.qualityLabels.unmappedExpenses,
    copy.qualityLabels.yes,
    envelopes.length,
    allocatedEnvelopes.length,
    kpis.mappedCategories,
    kpis.totalCategories,
    kpis.unmappedSpend,
    sweepDue,
  ]);

  const unmappedCategories = useMemo(() => {
    const mapped = new Set(mappings.map((mapping) => mapping.category_id));
    return categories.filter((category) => !mapped.has(category.id));
  }, [categories, mappings]);

  const currency = settings?.currency ?? dashboard?.user.currency ?? "MAD";

  const cumulativeExpense = cumulativeSeries(
    dailySeries.map((row) => row.expense)
  );
  const idealLine = dailySeries.length
    ? dailySeries.map((_, idx) => (kpis.totalExpense / dailySeries.length) * (idx + 1))
    : [];

  const utilization = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.envelopes.map((item) => {
      const allocated = Number(item.balance.total_allocations ?? 0);
      const spent = Number(item.balance.total_spent ?? 0);
      return {
        name: item.envelope.name,
        utilization: allocated ? Math.min(100, (spent / allocated) * 100) : 0,
      };
    });
  }, [dashboard]);

  const allocationFallback = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.envelopes
      .map((item) => ({
        name: item.envelope.name,
        allocated: Number(item.balance.total_allocations ?? 0),
      }))
      .filter((item) => item.allocated > 0)
      .sort((a, b) => b.allocated - a.allocated);
  }, [dashboard]);

  const heatmapExpenseMax = Math.max(1, ...heatmapCells.map((cell) => cell.value));

  const handleExport = () => {
    const rows = filteredTransactions.map((tx) => {
      const category = categoryMap.get(tx.category_id) ?? copy.unknown;
      const envelope = tx.envelopeId
        ? envelopeMap.get(tx.envelopeId) ?? copy.unknown
        : copy.unmapped;
      return [
        tx.occurred_on,
        tx.type,
        category,
        envelope,
        tx.amount,
        tx.description ?? "",
      ];
    });

    const csv = [
      ["occurred_on", "type", "category", "envelope", "amount", "description"],
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) =>
            typeof value === "string" && value.includes(",")
              ? `"${value.replace(/"/g, '""')}"`
              : value
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `floussy-report-${range.start}-to-${range.end}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast({
      title: copy.exportCsv,
      description: locale === "ar" ? "تهبطات العمليات المفلترة." : locale === "fr" ? "Les transactions filtrées ont été exportées." : "Your filtered transactions have been exported.",
    });
  };

  const handlePrint = () => window.print();

  const earliestTxDate = useMemo(() => {
    const dates = transactions.map((tx) => tx.occurred_on).sort();
    return dates[0];
  }, [transactions]);

  const handleRangeSuggestion = (preset: "90d" | "all") => {
    if (preset === "90d") {
      setRangePreset("90d");
      return;
    }
    if (earliestTxDate) {
      setCustomStart(earliestTxDate);
      setCustomEnd(defaultEnd());
      setRangePreset("custom");
    }
  };

  const handleEnvelopeToggle = (id: string) => {
    setSelectedEnvelopeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );

    if (!periodsByEnvelope[id]) {
      apiFetch<EnvelopePeriodOut[]>(`/envelopes/${id}/periods`)
        .then((data) => {
          setPeriodsByEnvelope((prev) => ({ ...prev, [id]: data }));
        })
        .catch(() => null);
    }
  };

  const showingEmptyRange =
    !filteredTransactions.length && transactions.length > 0;

  const tourSteps = useMemo<TourStep[]>(
    () => [
      {
        title: copy.tour[0].title,
        description: copy.tour[0].description,
        ref: headerRef,
      },
      {
        title: copy.tour[1].title,
        description: copy.tour[1].description,
        ref: filtersRef,
      },
      {
        title: copy.tour[2].title,
        description: copy.tour[2].description,
        ref: kpiRef,
      },
      {
        title: copy.tour[3].title,
        description: copy.tour[3].description,
        ref: chartsRef,
      },
      {
        title: copy.tour[4].title,
        description: copy.tour[4].description,
        ref: actionsRef,
      },
    ],
    [copy]
  );

  const {
    isActive: tourActive,
    step: tourStep,
    stepIndex: tourStepIndex,
    total: tourTotal,
    goNext,
    goPrevious,
    canGoPrevious,
    skipTour,
  } = useGlobalTour("reports", tourSteps);

  return (
    <div className="flex flex-col gap-8 print-area" dir={pageDir}>
      <style jsx global>{printStyles}</style>

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

      <div ref={headerRef}>
        <PageHeader
          title={copy.title}
          subtitle={copy.subtitle}
          actions={
            <div className="no-print flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleExport}>
                {copy.exportCsv}
              </Button>
              <Button variant="secondary" onClick={handlePrint}>
                {copy.printPdf}
              </Button>
            </div>
          }
        />
      </div>

      {hasLowData ? (
        <Card className="border border-[var(--accent)]/30 bg-[var(--accent-soft)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--accent-strong)]">
                {copy.noDataTitle}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {copy.noDataDesc}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link href="/transactions">{copy.checklistExpense}</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/categories">{copy.checklistCategories}</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/rules">{copy.checklistMap}</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/envelopes">{copy.checklistAllocate}</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/sweeps">{copy.checklistSweep}</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div ref={filtersRef}>
        <Section title={copy.filtersTitle} subtitle={copy.filtersSubtitle}>
        <ClientOnly
          fallback={
            <>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-10 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]"
                  />
                ))}
              </div>
              <div className="mt-4 h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] md:w-72" />
            </>
          }
        >
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="flex flex-col gap-2">
            <Label>{copy.range}</Label>
            <Select value={rangePreset} onValueChange={setRangePreset}>
              <SelectTrigger>
                <SelectValue placeholder={copy.range} />
              </SelectTrigger>
              <SelectContent>
                {copy.rangePresets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{copy.start}</Label>
            <DatePicker
              value={new Date(range.start)}
              onChange={(date) =>
                setCustomStart(date?.toISOString().slice(0, 10) ?? range.start)
              }
              disabled={rangePreset !== "custom"}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{copy.end}</Label>
            <DatePicker
              value={new Date(range.end)}
              onChange={(date) =>
                setCustomEnd(date?.toISOString().slice(0, 10) ?? range.end)
              }
              disabled={rangePreset !== "custom"}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{copy.envelope}</Label>
            <Select value={envelopeFilter} onValueChange={setEnvelopeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={copy.allEnvelopes} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allEnvelopes}</SelectItem>
                {envelopes.map((envelope) => (
                  <SelectItem key={envelope.id} value={envelope.id}>
                    {localizeEnvelopeLabel(envelope.name, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{copy.category}</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder={copy.allCategories} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allCategories}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {localizeCategoryName(category.name, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{copy.type}</Label>
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as "income" | "expense" | "all")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={copy.allTypes} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allTypes}</SelectItem>
                <SelectItem value="income">{copy.income}</SelectItem>
                <SelectItem value="expense">{copy.expense}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={mappedOnly}
              onChange={(event) => setMappedOnly(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            {copy.mappedOnly}
          </label>
          <label
            className={`flex items-center gap-2 text-sm ${
              transfersAvailable
                ? "text-[var(--muted)]"
                : "text-[var(--muted)]/60"
            }`}
            title={!transfersAvailable ? copy.transfersUnavailable : ""}
          >
            <input
              type="checkbox"
              checked={includeTransfers}
              onChange={(event) => setIncludeTransfers(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)]"
              disabled={!transfersAvailable}
            />
            {copy.transfers}
          </label>
          <div className="flex w-full items-center gap-2 md:w-auto">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchPlaceholder}
            />
          </div>
        </div>
        </ClientOnly>
        </Section>
      </div>

      {showingEmptyRange ? (
        <Card className="border border-dashed border-[var(--border)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                {copy.noTxRange}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {copy.noTxRangeDesc}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRangeSuggestion("90d")}
              >
                {copy.last90}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRangeSuggestion("all")}
                disabled={!earliestTxDate}
              >
                {copy.allTime}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {skeletons.map((idx) => (
            <Card key={idx} className="h-24 animate-pulse" />
          ))}
        </div>
      ) : null}
      {error ? (
        <Card className="border border-[var(--error)]/20 bg-[var(--error-soft)]">
          <p className="text-sm text-[var(--error)]">{error}</p>
        </Card>
      ) : null}

      <div ref={kpiRef}>
        <Section title={copy.keyMetrics} subtitle={copy.keyMetricsSubtitle}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {[
            {
              label: copy.netWorth,
              value: dashboard ? Number(dashboard.net_worth) : 0,
              format: (value: number) => formatMoney(value, currency),
            },
            {
              label: copy.cashBalance,
              value: dashboard ? Number(dashboard.cash_balance) : 0,
              format: (value: number) => formatMoney(value, currency),
            },
            {
              label: copy.availableToAllocate,
              value: dashboard ? Number(dashboard.available_to_allocate) : 0,
              format: (value: number) => formatMoney(value, currency),
            },
            {
              label: copy.totalIncome,
              value: kpis.totalIncome,
              format: (value: number) => formatMoney(value, currency),
            },
            {
              label: copy.totalExpense,
              value: kpis.totalExpense,
              format: (value: number) => formatMoney(value, currency),
            },
            {
              label: copy.unmappedPercent,
              value: kpis.mappedRatio * 100,
              format: (value: number) => `${value.toFixed(1)}%`,
            },
          ].map((item) => (
            <Card key={item.label} className="space-y-3 min-h-[120px]" interactive>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {item.label}
              </p>
              <p className="text-2xl font-semibold leading-tight text-[var(--ink)] break-words">
                <AnimatedNumber value={item.value} format={item.format} />
              </p>
            </Card>
          ))}
        </div>

        {hasLowData ? (
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            {[
              {
                label: copy.transactions,
                value: kpis.transactionCount.toString(),
              },
              {
                label: copy.mappedCategories,
                value: `${kpis.mappedCategories}/${kpis.totalCategories}`,
              },
              {
                label: copy.envelopesFunded,
                value: `${kpis.allocatedEnvelopes}/${envelopes.length}`,
              },
              {
                label: copy.lastActivity,
                value: kpis.lastActivity ?? copy.none,
              },
            ].map((item) => (
              <Card key={item.label} className="space-y-1" interactive>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {item.label}
                </p>
                <p className="text-lg font-semibold text-[var(--ink)]">
                  {item.value}
                </p>
              </Card>
            ))}
          </div>
        ) : null}
        </Section>
      </div>

      <div ref={chartsRef}>
        <ClientOnly
          fallback={
            <div className="h-11 w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)]" />
          }
        >
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="no-print">
              <TabsTrigger value="overview">{copy.overview}</TabsTrigger>
              <TabsTrigger value="spending">{copy.spending}</TabsTrigger>
              <TabsTrigger value="income">{copy.incomeTab}</TabsTrigger>
              <TabsTrigger value="envelopes">{copy.envelopesTab}</TabsTrigger>
              <TabsTrigger value="sweeps">{copy.sweepsTab}</TabsTrigger>
              <TabsTrigger value="quality">{copy.quality}</TabsTrigger>
            </TabsList>

          <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCard
              title={copy.overviewCards.spendByEnvelope.title}
              description={copy.overviewCards.spendByEnvelope.description}
            >
              {spendingByEnvelope.length ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={spendingByEnvelope.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={90}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="total"
                          fill="var(--accent)"
                          radius={[8, 8, 8, 8]}
                          isAnimationActive={inView}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : allocationFallback.length ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={allocationFallback.slice(0, 6)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar
                          dataKey="allocated"
                          fill="#0f766e"
                          radius={[8, 8, 8, 8]}
                          isAnimationActive={inView}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noExpenses.title}
                  description={locale === "ar" ? "زيد مصروف باش يبان التوزيع ديال المصاريف." : locale === "fr" ? "Ajoute une dépense pour remplir la ventilation des dépenses." : "Add an expense to populate spending breakdowns."}
                  ctaLabel={copy.empty.noExpenses.cta}
                  href="/transactions"
                  icon="rocket"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.incomeVsExpense.title}
              description={locale === "ar" ? "تطور الفلوس اللي داخلة واللي خارجة." : locale === "fr" ? "Tendance des entrées et sorties d’argent." : "Trend of cash in and out."}
            >
              {dailySeries.length ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={dailySeries}>
                        <defs>
                          <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="income"
                          stroke="#14b8a6"
                          fill="url(#income)"
                          isAnimationActive={inView}
                        />
                        <Area
                          type="monotone"
                          dataKey="expense"
                          stroke="#f97316"
                          fill="url(#expense)"
                          isAnimationActive={inView}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.overviewCards.noActivity.title}
                  description={copy.overviewCards.noActivity.description}
                  ctaLabel={copy.empty.noIncome.cta}
                  href="/transactions"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.pace.title}
              description={copy.overviewCards.pace.description}
            >
              {kpis.totalExpense > 0 ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart
                        data={dailySeries.map((row, idx) => ({
                          date: row.date,
                          actual: cumulativeExpense[idx] ?? 0,
                          ideal: idealLine[idx] ?? 0,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#ef4444"
                          strokeWidth={2}
                          isAnimationActive={inView}
                        />
                        <Line
                          type="monotone"
                          dataKey="ideal"
                          stroke="#64748b"
                          strokeDasharray="4 4"
                          isAnimationActive={inView}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.overviewCards.noPace.title}
                  description={copy.overviewCards.noPace.description}
                  ctaLabel={copy.empty.noExpenses.cta}
                  href="/transactions"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.insights}
              description={copy.insightsSubtitle}
            >
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)]"
                  >
                    {insight}
                  </div>
                ))}
              </div>
            </ReportCard>
          </div>
        </TabsContent>

        <TabsContent value="spending">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCard
              title={copy.overviewCards.spendOverTime.title}
              description={copy.overviewCards.spendOverTime.description}
            >
              {dailySeries.length ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={dailySeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="expense"
                          stroke="#f97316"
                          strokeWidth={2}
                          isAnimationActive={inView}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noExpenses.title}
                  description={copy.empty.noExpenses.description}
                  ctaLabel={copy.empty.noExpenses.cta}
                  href="/transactions"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.categoryDistribution.title}
              description={copy.overviewCards.categoryDistribution.description}
            >
              {spendingByCategory.length ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={spendingByCategory.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar
                          dataKey="total"
                          fill="#f59e0b"
                          radius={[8, 8, 8, 8]}
                          isAnimationActive={inView}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noCategories.title}
                  description={copy.empty.noCategories.description}
                  ctaLabel={copy.empty.noCategories.cta}
                  href="/categories"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.unmappedExpenses.title}
              description={copy.overviewCards.unmappedExpenses.description}
              actions={
                <Button asChild variant="secondary" size="sm">
                  <Link href="/rules">{copy.fixMappings}</Link>
                </Button>
              }
            >
              <ChartReveal>
                {(inView) => (
                  <div className="flex h-full items-center justify-center gap-6">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: copy.unmapped, value: kpis.unmappedSpend },
                            {
                              name: copy.mapped,
                              value: Math.max(0, kpis.totalExpense - kpis.unmappedSpend),
                            },
                          ]}
                          innerRadius={60}
                          outerRadius={80}
                          dataKey="value"
                          isAnimationActive={inView}
                        >
                          {["var(--accent)", "var(--surface-2)"].map((color, index) => (
                            <Cell key={color} fill={color} opacity={index === 0 ? 1 : 0.6} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      <p className="text-sm text-[var(--muted)]">{copy.overviewCards.unmappedExpenses.title}</p>
                      <p className="text-2xl font-semibold">
                        {(kpis.mappedRatio * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {locale === "ar"
                          ? `${formatMoney(kpis.unmappedSpend, currency)} فهاد الفترة.`
                          : locale === "fr"
                          ? `${formatMoney(kpis.unmappedSpend, currency)} sur cette période.`
                          : `${formatMoney(kpis.unmappedSpend, currency)} in this range.`}
                      </p>
                    </div>
                  </div>
                )}
              </ChartReveal>
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.unmappedOverTime.title}
              description={copy.overviewCards.unmappedOverTime.description}
            >
              {unmappedDaily.length ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={unmappedDaily}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar
                          dataKey="amount"
                          fill="#ef4444"
                          radius={[6, 6, 0, 0]}
                          isAnimationActive={inView}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noUnmapped.title}
                  description={copy.empty.noUnmapped.description}
                  icon="alert"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.txVolume.title}
              description={copy.overviewCards.txVolume.description}
            >
              {dailySeries.length ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={dailySeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#0ea5e9"
                          strokeWidth={2}
                          isAnimationActive={inView}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noTransactions.title}
                  description={copy.empty.noTransactions.description}
                  ctaLabel={copy.empty.noTransactions.cta}
                  href="/transactions"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.avgSize.title}
              description={copy.overviewCards.avgSize.description}
            >
              {dailySeries.length ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={dailySeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="avgSize"
                          stroke="#14b8a6"
                          strokeWidth={2}
                          isAnimationActive={inView}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noAverages.title}
                  description={copy.empty.noAverages.description}
                  ctaLabel={copy.empty.noAverages.cta}
                  href="/transactions"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.heatmap.title}
              description={copy.overviewCards.heatmap.description}
            >
              {heatmapCells.length ? (
                <div className="grid grid-cols-7 gap-1">
                  {heatmapCells.map((cell) => (
                    <div
                      key={cell.date}
                      title={`${cell.date} • ${formatMoney(cell.value, currency)}`}
                      className="h-4 w-4 rounded bg-[var(--accent)]"
                      style={{
                        opacity: Math.max(0.12, cell.value / heatmapExpenseMax),
                      }}
                    />
                  ))}
                </div>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noHeatmap.title}
                  description={copy.empty.noHeatmap.description}
                  ctaLabel={copy.empty.noHeatmap.cta}
                  href="/transactions"
                />
              )}
            </ReportCard>
          </div>
        </TabsContent>

        <TabsContent value="income">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCard title={copy.overviewCards.incomeOverTime.title} description={copy.overviewCards.incomeOverTime.description}>
              {dailySeries.length ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={dailySeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="income"
                          stroke="#0f766e"
                          strokeWidth={2}
                          isAnimationActive={inView}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noIncome.title}
                  description={copy.empty.noIncome.description}
                  ctaLabel={copy.empty.noIncome.cta}
                  href="/transactions"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.incomeByCategory.title}
              description={copy.overviewCards.incomeByCategory.description}
            >
              {incomeByCategory.length ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={incomeByCategory.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar
                          dataKey="total"
                          fill="#14b8a6"
                          radius={[8, 8, 8, 8]}
                          isAnimationActive={inView}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noIncome.title}
                  description={copy.empty.noIncome.description}
                  ctaLabel={copy.empty.noIncome.cta}
                  href="/transactions"
                />
              )}
            </ReportCard>

            <ReportCard title={copy.overviewCards.incomeVsExpense.title} description={copy.overviewCards.incomeVsExpense.description}>
              <ChartReveal>
                {(inView) => (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={[{ label: copy.range, income: kpis.totalIncome, expense: kpis.totalExpense }]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="income" fill="#14b8a6" radius={[6, 6, 0, 0]} isAnimationActive={inView} />
                      <Bar dataKey="expense" fill="#f97316" radius={[6, 6, 0, 0]} isAnimationActive={inView} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartReveal>
            </ReportCard>

            <ReportCard title={copy.overviewCards.cashflowRadar.title} description={copy.overviewCards.cashflowRadar.description}>
              <ChartReveal>
                {(inView) => (
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart
                      data={[
                        { metric: copy.income, value: kpis.totalIncome },
                        { metric: copy.expense, value: kpis.totalExpense },
                        { metric: locale === "ar" ? "الصافي" : locale === "fr" ? "Net" : "Net", value: Math.max(0, kpis.netFlow) },
                      ]}
                    >
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis tick={{ fontSize: 10 }} />
                      <Radar dataKey="value" fill="#0f766e" fillOpacity={0.4} isAnimationActive={inView} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </ChartReveal>
            </ReportCard>

            <ReportCard title={copy.overviewCards.savingsGrowth.title} description={copy.overviewCards.savingsGrowth.description}>
              {savingsEnvelope ? (
                <SavingsTrendChart
                  savingsEnvelope={savingsEnvelope}
                  periodsByEnvelope={periodsByEnvelope}
                  rangeStart={range.start}
                  rangeEnd={range.end}
                  copy={copy}
                />
              ) : (
                <ReportEmptyState
                  title={copy.empty.noSavings.title}
                  description={copy.empty.noSavings.description}
                  ctaLabel={copy.empty.noSavings.cta}
                  href="/envelopes"
                />
              )}
            </ReportCard>
          </div>
        </TabsContent>

        <TabsContent value="envelopes">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCard
              title={copy.overviewCards.allocationVsSpent.title}
              description={copy.overviewCards.allocationVsSpent.description}
            >
              {dashboard ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={dashboard.envelopes.map((item) => ({
                          name: item.envelope.name,
                          allocated: Number(item.balance.total_allocations ?? 0),
                          spent: Number(item.balance.total_spent ?? 0),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="allocated" fill="#14b8a6" radius={[6, 6, 0, 0]} isAnimationActive={inView} />
                        <Bar dataKey="spent" fill="#f97316" radius={[6, 6, 0, 0]} isAnimationActive={inView} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noAllocations.title}
                  description={copy.empty.noAllocations.description}
                  ctaLabel={copy.empty.noAllocations.cta}
                  href="/envelopes"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.envelopeUtilization.title}
              description={copy.overviewCards.envelopeUtilization.description}
            >
              {utilization.length ? (
                <ChartReveal>
                  {(inView) => (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={utilization}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                        <Tooltip />
                        <Bar
                          dataKey="utilization"
                          fill="#0ea5e9"
                          radius={[6, 6, 0, 0]}
                          isAnimationActive={inView}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartReveal>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noUtilization.title}
                  description={copy.empty.noUtilization.description}
                  ctaLabel={copy.empty.noUtilization.cta}
                  href="/envelopes"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.envelopeTrend.title}
              description={copy.overviewCards.envelopeTrend.description}
              actions={<Badge tone="muted">{selectedEnvelopeIds.length || 3} {copy.selected}</Badge>}
            >
              <div className="flex flex-wrap gap-2 pb-3">
                {envelopes.slice(0, 6).map((envelope) => (
                  <button
                    key={envelope.id}
                    type="button"
                    onClick={() => handleEnvelopeToggle(envelope.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      selectedEnvelopeIds.includes(envelope.id)
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {localizeEnvelopeLabel(envelope.name, locale)}
                  </button>
                ))}
              </div>
              <EnvelopeTrendChart
                envelopes={envelopes}
                periodsByEnvelope={periodsByEnvelope}
                selected={selectedEnvelopeIds}
                rangeStart={range.start}
                rangeEnd={range.end}
                copy={copy}
              />
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.envelopesAtRisk.title}
              description={copy.overviewCards.envelopesAtRisk.description}
            >
              {dashboard && dashboard.envelopes.length ? (
                <div className="space-y-3">
                  {dashboard.envelopes
                    .filter((item) => Number(item.balance.closing_balance) < 0)
                    .map((item) => (
                      <div
                        key={item.envelope.id}
                        className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-[var(--ink)]">
                            {localizeEnvelopeLabel(item.envelope.name, locale)}
                          </p>
                          <p className="text-xs text-[var(--muted)]">{copy.overspent}</p>
                        </div>
                        <Badge tone="error">
                          {formatMoney(item.balance.closing_balance, currency)}
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <ReportEmptyState
                  title={copy.empty.allClear.title}
                  description={copy.empty.allClear.description}
                  icon="alert"
                />
              )}
            </ReportCard>
          </div>
        </TabsContent>

        <TabsContent value="sweeps">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCard
              title={copy.overviewCards.sweepImpact.title}
              description={copy.overviewCards.sweepImpact.description}
            >
              <SweepImpactChart
                sweeps={sweeps}
                rangeStart={range.start}
                rangeEnd={range.end}
                copy={copy}
              />
              
            </ReportCard>

            <ReportCard
              title={copy.overviewCards.sweepReadiness.title}
              description={copy.overviewCards.sweepReadiness.description}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">{copy.sweepStatus}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {sweepDue ? copy.sweepDue : copy.sweepNotRequired}
                    </p>
                  </div>
                  <Badge tone={sweepDue ? "warning" : "success"}>
                    {sweepDue ? copy.due : copy.clear}
                  </Badge>
                </div>
                <Button asChild variant="secondary">
                  <Link href="/sweeps">{copy.runSweep}</Link>
                </Button>
              </div>
            </ReportCard>
          </div>
        </TabsContent>

        <TabsContent value="quality">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCard
              title={copy.reportQuality}
              description={copy.reportQualitySubtitle}
            >
              <div className="space-y-3">
                {qualityChecks.map((check) => (
                  <div
                    key={check.label}
                    className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">{check.label}</p>
                      <p className="text-xs text-[var(--muted)]">{check.value}</p>
                    </div>
                    <Badge tone={check.status === "warn" ? "warning" : "success"}>
                      {check.status === "warn" ? copy.needsWork : copy.healthy}
                    </Badge>
                  </div>
                ))}
              </div>
            </ReportCard>

            <ReportCard
              title={copy.qualityRecommendations}
              description={copy.qualityRecommendationsSubtitle}
            >
              {unmappedCategories.length ? (
                <div className="space-y-3">
                  {unmappedCategories.slice(0, 3).map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--ink)]">
                          {locale === "ar"
                            ? `ربط ${localizeCategoryName(category.name, locale)}`
                            : locale === "fr"
                            ? `Mapper ${localizeCategoryName(category.name, locale)}`
                            : `Map ${localizeCategoryName(category.name, locale)}`}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {locale === "ar" ? "ربط هاد الصنف بظرف." : locale === "fr" ? "Assigne cette catégorie à une enveloppe." : "Assign this category to an envelope."}
                        </p>
                      </div>
                      <Button asChild variant="secondary" size="sm">
                        <Link href="/rules">{copy.mapNow}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noMappings.title}
                  description={copy.empty.noMappings.description}
                  icon="alert"
                />
              )}
            </ReportCard>

            <ReportCard
              title={copy.transactionsPreview}
              description={copy.transactionsPreviewSubtitle}
            >
              {filteredTransactions.length ? (
                <div className="space-y-2">
                  {filteredTransactions.slice(0, 6).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--ink)]">
                          {localizeCategoryName(
                            categoryMap.get(tx.category_id) ?? copy.categoryFallback,
                            locale
                          )}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {tx.occurred_on} • {tx.type}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        {formatMoney(tx.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <ReportEmptyState
                  title={copy.empty.noRangeData.title}
                  description={copy.empty.noRangeData.description}
                  ctaLabel={copy.empty.noRangeData.cta}
                  href="/transactions"
                />
              )}
            </ReportCard>
          </div>
          </TabsContent>
          </Tabs>
        </ClientOnly>
      </div>

      <div ref={actionsRef}>
        <Section title={copy.quickActions} subtitle={copy.quickActionsSubtitle}>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/transactions">{copy.addTransaction}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/rules">{copy.fixMappings}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/sweeps">{copy.runSweep}</Link>
          </Button>
        </div>
        </Section>
      </div>
    </div>
  );
}

function SavingsTrendChart({
  savingsEnvelope,
  periodsByEnvelope,
  rangeStart,
  rangeEnd,
  copy,
}: {
  savingsEnvelope: EnvelopeOut;
  periodsByEnvelope: Record<string, EnvelopePeriodOut[]>;
  rangeStart: string;
  rangeEnd: string;
  copy: (typeof REPORTS_COPY)[FloussyLocale];
}) {
  const periods = periodsByEnvelope[savingsEnvelope.id] ?? [];
  const series = periods
    .filter((period) => period.period_start >= rangeStart && period.period_end <= rangeEnd)
    .map((period) => ({
      date: period.period_end,
      balance: Number(period.closing_balance ?? period.opening_balance),
    }));

  if (!series.length) {
    return (
      <ReportEmptyState
        title={copy.empty.noSavingsTrend.title}
        description={copy.empty.noSavingsTrend.description}
        ctaLabel={copy.empty.noSavingsTrend.cta}
        href="/envelopes"
      />
    );
  }

  return (
    <ChartReveal>
      {(inView) => (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area
              dataKey="balance"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.2}
              isAnimationActive={inView}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartReveal>
  );
}

function EnvelopeTrendChart({
  envelopes,
  periodsByEnvelope,
  selected,
  rangeStart,
  rangeEnd,
  copy,
}: {
  envelopes: EnvelopeOut[];
  periodsByEnvelope: Record<string, EnvelopePeriodOut[]>;
  selected: string[];
  rangeStart: string;
  rangeEnd: string;
  copy: (typeof REPORTS_COPY)[FloussyLocale];
}) {
  const selectedIds = selected.length ? selected : envelopes.slice(0, 3).map((env) => env.id);
  const dateMap = new Map<string, Record<string, number>>();

  selectedIds.forEach((envelopeId) => {
    const periods = periodsByEnvelope[envelopeId] ?? [];
    periods.forEach((period) => {
      if (period.period_start < rangeStart || period.period_end > rangeEnd) return;
      const key = period.period_end;
      const current = dateMap.get(key) ?? {};
      current[envelopeId] = Number(period.closing_balance ?? period.opening_balance);
      dateMap.set(key, current);
    });
  });

  const series = Array.from(dateMap.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, value]) => ({ date, ...value }));

  if (!series.length) {
    return (
      <ReportEmptyState
        title={copy.empty.noTrendData.title}
        description={copy.empty.noTrendData.description}
        ctaLabel={copy.empty.noTrendData.cta}
        href="/envelopes"
      />
    );
  }

  return (
    <ChartReveal>
      {(inView) => (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            {selectedIds.map((envelopeId, index) => (
              <Line
                key={envelopeId}
                type="monotone"
                dataKey={envelopeId}
                stroke={index % 2 === 0 ? "#0f766e" : "#0ea5e9"}
                strokeWidth={2}
                isAnimationActive={inView}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartReveal>
  );
}

function SweepImpactChart({
  sweeps,
  rangeStart,
  rangeEnd,
  copy,
}: {
  sweeps: SweepOut[];
  rangeStart: string;
  rangeEnd: string;
  copy: (typeof REPORTS_COPY)[FloussyLocale];
}) {
  const map = new Map<string, number>();
  sweeps.forEach((sweep) => {
    if (sweep.swept_on < rangeStart || sweep.swept_on > rangeEnd) return;
    const current = map.get(sweep.swept_on) ?? 0;
    map.set(sweep.swept_on, current + Number(sweep.amount));
  });

  const rows = Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, amount]) => ({ date, amount }));
  const cumulative = cumulativeSeries(rows.map((row) => row.amount));
  const series = rows.map((row, idx) => ({ ...row, cumulative: cumulative[idx] ?? 0 }));

  if (!series.length) {
    return (
      <ReportEmptyState
        title={copy.empty.noSweeps.title}
        description={copy.empty.noSweeps.description}
        ctaLabel={copy.empty.noSweeps.cta}
        href="/sweeps"
      />
    );
  }

  return (
    <ChartReveal>
      {(inView) => (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill="#0ea5e9" isAnimationActive={inView} />
            <Line dataKey="cumulative" stroke="#0f766e" isAnimationActive={inView} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartReveal>
  );
}
