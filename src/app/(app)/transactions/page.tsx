"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { apiFetch } from "@/lib/api";
import type {
  CategoryEnvelopeMapOut,
  CategoryOut,
  DashboardOut,
  EnvelopeOut,
  DistributionSimulateOut,
  EnvelopePeriodOut,
  TransactionOut,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDeleteTransactionDialog } from "@/components/transactions/ConfirmDeleteTransactionDialog";
import {
  GlobalTourOverlay,
  useGlobalTour,
  type TourStep,
} from "@/components/tour/GlobalTour";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { isInternalIncomeCategory, localizeCategoryName } from "@/lib/categoryCatalog";

const PAGE_SIZES = [10, 20, 50];

const INCOME_KEYWORDS = [
  "salaire",
  "salary",
  "revenu",
  "income",
  "prime",
  "bonus",
  "commission",
  "dividende",
  "dividend",
  "interet",
  "interest",
  "vente",
  "ventes",
  "payroll",
  "pension",
  "allocations",
  "rente",
];
const SALARY_KEYWORDS = [
  "salaire",
  "salary",
  "payroll",
  "wage",
  "paycheck",
  "راتب",
  "salario",
];

type ApiError = {
  detail?: string | { msg?: string }[];
};

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

type CategoryKind = "income" | "expense" | "mixed";
type CategoryOverride = "income" | "expense";

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const APP_DATA_UPDATED_EVENT = "floussy:data-updated";

const TRANSACTIONS_COPY = {
  fr: {
    title: "Transactions",
    subtitle: "Income feeds Cash. Expenses affect mapped envelopes only.",
    quickEntry: "Saisie rapide",
    quickEntryDesc:
      "Enregistre un mouvement en quelques secondes et vérifie son impact avant validation.",
    bulkEntry: "Saisie collective",
    editTransaction: "Edit transaction",
    createTransaction: "Create transaction",
    openHistory: "Ouvrir l'historique",
    type: "Type",
    expense: "Depense",
    income: "Revenu",
    noCategories: "Aucune catégorie disponible. Crée des catégories pour ajouter une transaction.",
    createCategories: "Créer des catégories",
    noIncomeCategories: "Aucune catégorie de revenu disponible.",
    noExpenseCategories: "Aucune catégorie de dépense mappée.",
    createToContinue: "Crée-en pour continuer.",
    mapToContinue: "Mappe les catégories pour continuer.",
    mapInCategories: "Mapper dans Catégories",
    category: "Category",
    incomeCategoryAuto: "Catégorie revenu (auto)",
    salaryCategoryAuto: "Salaire",
    selectCategory: "Select a category",
    noIncomeOption: "No income categories",
    noExpenseOption: "No expense categories",
    amount: "Amount",
    amountHintIncome: "Le revenu sera ajouté à Cash puis réparti selon ta configuration.",
    amountHintExpense: "La dépense touchera uniquement l’enveloppe reliée à cette catégorie.",
    amountHeroIncome: "Montant du revenu",
    amountHeroExpense: "Montant de la dépense",
    date: "Date",
    description: "Description",
    optionalDescription: "Optional description",
    mappedToEnvelope: (name: string) => `Mapped to envelope: ${name}`,
    mappedEnvelope: "Mapped envelope",
    saveChanges: "Save changes",
    cancel: "Cancel",
    history: "Historique des transactions",
    preview: "Aperçu de répartition",
    previewBase: "Basé sur la configuration active.",
    previewAuto: "La répartition automatique s’applique uniquement aux revenus.",
    incomeDateBeforePeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `Ce revenu est daté au ${incomeDate}, donc avant la période active (${start} ${arrow} ${end}). Il sera compté sur une période précédente. Si c'est le salaire de cette période, choisis une date entre ${start} et ${end}.`,
    incomeDateAfterPeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `Ce revenu est daté au ${incomeDate}, donc après la période active (${start} ${arrow} ${end}). Il sera compté sur une période suivante. Si c'est le salaire de cette période, choisis une date entre ${start} et ${end}.`,
    previewFixedLayer: "1) Engagements fixes (onboarding)",
    previewDebtGoalsLayer: "2) Dettes & objectifs",
    previewFlexibleLayer: "3) Reste vers les enveloppes flexibles (configuration)",
    previewNoLayerItems: "Aucune ligne pour cette étape",
    expenseImpact: "Impact de la dépense",
    expenseImpactBase: "Cette opération débite uniquement l’enveloppe liée à la catégorie.",
    expenseImpactSelectCategory: "Choisis une catégorie pour voir l’impact.",
    expenseImpactNotMapped: "Cette catégorie n’est pas liée à une enveloppe.",
    expenseImpactEnvelope: "Enveloppe",
    expenseImpactCurrent: "Solde actuel",
    expenseImpactAfter: "Solde après opération",
    expenseImpactWarning: "Attention: ce montant peut faire passer l’enveloppe sous zéro.",
    livePreviewTitle: "Aperçu en direct",
    livePreviewDescIncome: "Vois comment ce revenu sera réparti avant de l’enregistrer.",
    livePreviewDescExpense: "Vérifie l’effet immédiat de cette dépense sur l’enveloppe liée.",
    activePeriod: "Période active",
    availableCategories: "Catégories disponibles",
    mappedEnvelopeStatus: "Enveloppe liée",
    noMappedEnvelopeStatus: "Aucune enveloppe liée",
    previewEnterAmount: "Saisis un montant pour voir la répartition.",
    previewLoading: "Simulation en cours…",
    noDistributionConfig:
      "Aucune configuration enregistrée. Tout le revenu ira dans l’enveloppe Cash par défaut.",
    createConfig: "Créer une configuration",
    fixed: "Fixe",
    remainsInCash: "Reste en Cash",
    duplicates: "Doublons",
    downloadCsv: "Télécharger CSV",
    historyFilters: "Historique et filtres des transactions.",
    filters: "Filters",
    from: "From",
    to: "To",
    all: "All",
    envelope: "Envelope",
    cash: "Cash",
    unmapped: "Unmapped",
    mapped: "Mapped",
    search: "Search",
    searchPlaceholder: "Search by description or category",
    noTransactions: "No transactions",
    noTransactionsDescription: "Create your first transaction to get started.",
    tableDate: "Date",
    tableType: "Type",
    tableCategory: "Category",
    tableEnvelope: "Envelope",
    tableAmount: "Amount",
    tableDescription: "Description",
    tableActions: "Actions",
    edit: "Edit",
    delete: "Delete",
    rows: "Rows",
    prev: "Prev",
    next: "Next",
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    duplicateTitle: "Transactions en doublon",
    duplicateSubtitle: "Nous conservons la plus ancienne transaction et supprimons le reste.",
    duplicateCount: (count: number) => `${count} doublon(s)`,
    duplicateAlertTitle: "Doublons détectés dans l’historique.",
    duplicateAlertDescription: (count: number) =>
      `${count} transaction(s) en trop ont été repérées. Vérifie-les avant de continuer.`,
    duplicateAlertAction: "Voir les doublons",
    deleteDuplicates: "Supprimer les doublons",
    noDuplicates: "Aucun doublon",
    noDuplicatesDescription: "Tes transactions sont propres.",
    entries: "entrées",
    categoryFallback: "Catégorie",
    envelopeFallback: "Enveloppe",
    kept: "Conservée",
    duplicate: "Doublon",
    duplicateBeforeSave: "Transaction en doublon détectée.",
    duplicateBeforeSaveDescription:
      "Une transaction identique existe déjà avec le même type, la même date, le même montant, la même catégorie et le même commentaire.",
    duplicateBeforeSaveFix: "Corriger cette saisie",
    duplicateBeforeSaveOpenExisting: "Ouvrir l’opération existante",
    addSuccess: "Ajout reussi.",
    addSuccessDescription: "La transaction a ete ajoutee.",
    distributionApplied: "Répartition appliquée.",
    distributionAppliedDescription: "Les enveloppes ont été mises à jour.",
    distributionFailed: "Répartition échouée.",
    transactionDeleted: "Transaction supprimée",
    transactionDeletedDescription: "La transaction a bien été supprimée.",
    duplicatesDeleted: "Doublons supprimés",
    duplicatesDeletedDescription: (count: number) => `${count} doublon(s) supprimé(s).`,
    partialDelete: "Suppression partielle",
    partialDeleteDescription: (success: number, failed: number) =>
      `${success} supprimé(s), ${failed} en erreur.`,
    unknownError: "Unknown error",
    invalidRequest: "Invalid request",
    requestFailed: "Request failed",
    categoryNotMapped:
      "Catégorie non mappée. Associe-la à une enveloppe avant de créer la dépense.",
    pleaseSelectCategory: "Please select a category.",
    amountRequired: "Amount is required.",
    tourView: "Vue transactions",
    tourViewDesc:
      "Retrouve toutes les actions clés pour saisir et suivre tes transactions.",
    tourBulk: "Saisie collective",
    tourBulkDesc: "Importer plusieurs transactions d’un coup depuis un tableau.",
    tourCreate: "Créer une transaction",
    tourCreateDesc: "Saisis une dépense ou un revenu avec la date et la catégorie.",
    tourActions: "Actions rapides",
    tourActionsDesc: "Sauvegarde, annule ou ouvre l’historique des transactions.",
    tourPreview: "Aperçu de répartition",
    tourPreviewDesc: "Visualise comment le revenu sera réparti sur tes enveloppes.",
  },
  en: {
    title: "Transactions",
    subtitle: "Income feeds Cash. Expenses affect mapped envelopes only.",
    quickEntry: "Quick entry",
    quickEntryDesc:
      "Capture a movement in seconds and review its impact before saving.",
    bulkEntry: "Bulk entry",
    editTransaction: "Edit transaction",
    createTransaction: "Create transaction",
    openHistory: "Open history",
    type: "Type",
    expense: "Expense",
    income: "Income",
    noCategories: "No categories available. Create categories before adding a transaction.",
    createCategories: "Create categories",
    noIncomeCategories: "No income categories available.",
    noExpenseCategories: "No mapped expense categories available.",
    createToContinue: "Create some to continue.",
    mapToContinue: "Map categories to continue.",
    mapInCategories: "Map in Categories",
    category: "Category",
    incomeCategoryAuto: "Income category (auto)",
    salaryCategoryAuto: "Salary",
    selectCategory: "Select a category",
    noIncomeOption: "No income categories",
    noExpenseOption: "No expense categories",
    amount: "Amount",
    amountHintIncome: "This income will be added to Cash, then split using your active setup.",
    amountHintExpense: "This expense will affect only the envelope linked to this category.",
    amountHeroIncome: "Income amount",
    amountHeroExpense: "Expense amount",
    date: "Date",
    description: "Description",
    optionalDescription: "Optional description",
    mappedToEnvelope: (name: string) => `Mapped to envelope: ${name}`,
    mappedEnvelope: "Mapped envelope",
    saveChanges: "Save changes",
    cancel: "Cancel",
    history: "Transaction history",
    preview: "Distribution preview",
    previewBase: "Based on the active setup.",
    previewAuto: "Automatic distribution applies to income only.",
    incomeDateBeforePeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `This income is dated ${incomeDate}, which is before the active period (${start} ${arrow} ${end}). It will be counted in a previous cycle. If this is this cycle's salary, pick a date between ${start} and ${end}.`,
    incomeDateAfterPeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `This income is dated ${incomeDate}, which is after the active period (${start} ${arrow} ${end}). It will be counted in the next cycle. If this is this cycle's salary, pick a date between ${start} and ${end}.`,
    previewFixedLayer: "1) Fixed commitments (onboarding)",
    previewDebtGoalsLayer: "2) Debts & goals",
    previewFlexibleLayer: "3) Remaining amount to flexible envelopes (configuration)",
    previewNoLayerItems: "No rows for this stage",
    expenseImpact: "Expense impact",
    expenseImpactBase: "This transaction debits only the envelope mapped to the selected category.",
    expenseImpactSelectCategory: "Select a category to preview impact.",
    expenseImpactNotMapped: "This category is not mapped to any envelope.",
    expenseImpactEnvelope: "Envelope",
    expenseImpactCurrent: "Current balance",
    expenseImpactAfter: "Balance after transaction",
    expenseImpactWarning: "Warning: this amount may push the envelope below zero.",
    livePreviewTitle: "Live preview",
    livePreviewDescIncome: "See how this income will be distributed before saving it.",
    livePreviewDescExpense: "Check the immediate effect of this expense on the linked envelope.",
    activePeriod: "Active period",
    availableCategories: "Available categories",
    mappedEnvelopeStatus: "Linked envelope",
    noMappedEnvelopeStatus: "No linked envelope",
    previewEnterAmount: "Enter an amount to preview distribution.",
    previewLoading: "Running simulation…",
    noDistributionConfig:
      "No saved configuration. All income will go to the Cash envelope by default.",
    createConfig: "Create configuration",
    fixed: "Fixed",
    remainsInCash: "Left in Cash",
    duplicates: "Duplicates",
    downloadCsv: "Download CSV",
    historyFilters: "Transaction history and filters.",
    filters: "Filters",
    from: "From",
    to: "To",
    all: "All",
    envelope: "Envelope",
    cash: "Cash",
    unmapped: "Unmapped",
    mapped: "Mapped",
    search: "Search",
    searchPlaceholder: "Search by description or category",
    noTransactions: "No transactions",
    noTransactionsDescription: "Create your first transaction to get started.",
    tableDate: "Date",
    tableType: "Type",
    tableCategory: "Category",
    tableEnvelope: "Envelope",
    tableAmount: "Amount",
    tableDescription: "Description",
    tableActions: "Actions",
    edit: "Edit",
    delete: "Delete",
    rows: "Rows",
    prev: "Prev",
    next: "Next",
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    duplicateTitle: "Duplicate transactions",
    duplicateSubtitle: "We keep the oldest transaction and remove the rest.",
    duplicateCount: (count: number) => `${count} duplicate(s)`,
    duplicateAlertTitle: "Duplicates detected in history.",
    duplicateAlertDescription: (count: number) =>
      `${count} extra transaction(s) were found. Review them before continuing.`,
    duplicateAlertAction: "Review duplicates",
    deleteDuplicates: "Delete duplicates",
    noDuplicates: "No duplicates",
    noDuplicatesDescription: "Your transactions look clean.",
    entries: "entries",
    categoryFallback: "Category",
    envelopeFallback: "Envelope",
    kept: "Kept",
    duplicate: "Duplicate",
    duplicateBeforeSave: "Duplicate transaction detected.",
    duplicateBeforeSaveDescription:
      "An identical transaction already exists with the same type, date, amount, category, and comment.",
    duplicateBeforeSaveFix: "Fix this entry",
    duplicateBeforeSaveOpenExisting: "Open existing transaction",
    addSuccess: "Added successfully.",
    addSuccessDescription: "The transaction has been added.",
    distributionApplied: "Distribution applied.",
    distributionAppliedDescription: "Envelopes have been updated.",
    distributionFailed: "Distribution failed.",
    transactionDeleted: "Transaction deleted",
    transactionDeletedDescription: "The transaction was removed.",
    duplicatesDeleted: "Duplicates deleted",
    duplicatesDeletedDescription: (count: number) => `${count} duplicate(s) deleted.`,
    partialDelete: "Partial delete",
    partialDeleteDescription: (success: number, failed: number) =>
      `${success} deleted, ${failed} failed.`,
    unknownError: "Unknown error",
    invalidRequest: "Invalid request",
    requestFailed: "Request failed",
    categoryNotMapped:
      "Category not mapped. Link it to an envelope before creating the expense.",
    pleaseSelectCategory: "Please select a category.",
    amountRequired: "Amount is required.",
    tourView: "Transactions view",
    tourViewDesc: "Find the key actions to add and track your transactions.",
    tourBulk: "Bulk entry",
    tourBulkDesc: "Import many transactions at once from a table.",
    tourCreate: "Create a transaction",
    tourCreateDesc: "Add an expense or income with date and category.",
    tourActions: "Quick actions",
    tourActionsDesc: "Save, cancel, or open transaction history quickly.",
    tourPreview: "Distribution preview",
    tourPreviewDesc: "See how this income will be distributed across envelopes.",
  },
  ar: {
    title: "العمليات",
    subtitle: "منين كتسجل دخل، كيزيد فالكاش. ومنين كتسجل مصروف، كينقص من الظرف المرتبط.",
    quickEntry: "تسجيل سريع",
    quickEntryDesc:
      "سجل العملية ديالك بسرعة، وشوف الأثر ديالها قبل ما تحفظها.",
    bulkEntry: "إضافة جماعية",
    editTransaction: "بدّل العملية",
    createTransaction: "زيد عملية",
    openHistory: "حل تاريخ العمليات",
    type: "النوع",
    expense: "مصروف",
    income: "دخل",
    noCategories: "ما كاين حتى فئة دابا. زيد الفئات باش تقدر تزيد عملية.",
    createCategories: "زيد الفئات",
    noIncomeCategories: "ما كايناش فئات ديال الدخل.",
    noExpenseCategories: "ما كايناش فئات ديال المصاريف مربوطة.",
    createToContinue: "زيدهم باش تكمل.",
    mapToContinue: "ربط الفئات باش تكمل.",
    mapInCategories: "ربط فصفحة الفئات",
    category: "الفئة",
    incomeCategoryAuto: "فئة الدخل (تلقائي)",
    salaryCategoryAuto: "سالير",
    selectCategory: "اختار فئة",
    noIncomeOption: "ما كايناش فئات ديال الدخل",
    noExpenseOption: "ما كايناش فئات ديال المصروف",
    amount: "المبلغ",
    amountHintIncome: "هاد الدخل غادي يزيد فالكاش، ومن بعد يتقسم على حساب الخطة الحالية.",
    amountHintExpense: "هاد المصروف غادي ينقص غير من الظرف المرتابط بهاد الفئة.",
    amountHeroIncome: "مبلغ الدخل",
    amountHeroExpense: "مبلغ المصروف",
    date: "التاريخ",
    description: "الوصف",
    optionalDescription: "وصف اختياري",
    mappedToEnvelope: (name: string) => `مربوط بظرف: ${name}`,
    mappedEnvelope: "الظرف المربوط",
    saveChanges: "حفظ التعديلات",
    cancel: "إلغاء",
    history: "تاريخ العمليات",
    preview: "معاينة التوزيع",
    previewBase: "مبني على الإعداد الحالي.",
    previewAuto: "التوزيع التلقائي كيتطبق غير ملي كتسجل دخل.",
    incomeDateBeforePeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `هاد الدخل بتاريخ ${incomeDate}، يعني قبل الفترة النشيطة (${start} ${arrow} ${end}). غادي يتحسب فالدورة اللي قبل. إلى كان هادا دخل هاد الدورة، اختار تاريخ بين ${start} و ${end}.`,
    incomeDateAfterPeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `هاد الدخل بتاريخ ${incomeDate}، يعني من بعد الفترة النشيطة (${start} ${arrow} ${end}). غادي يتحسب فالدورة الجاية. إلى كان هادا دخل هاد الدورة، اختار تاريخ بين ${start} و ${end}.`,
    previewFixedLayer: "1) الالتزامات الثابتة (onboarding)",
    previewDebtGoalsLayer: "2) الديون والأهداف",
    previewFlexibleLayer: "3) الباقي كيمشي للأظرفة المرنة (configuration)",
    previewNoLayerItems: "ما كايناش أسطر فهاد المرحلة",
    expenseImpact: "تأثير المصروف",
    expenseImpactBase: "هاد العملية كتخصم غير من الظرف المربوط بهاد الفئة.",
    expenseImpactSelectCategory: "اختار فئة باش تبان المعاينة.",
    expenseImpactNotMapped: "هاد الفئة ما مربوطة حتى بظرف.",
    expenseImpactEnvelope: "الظرف",
    expenseImpactCurrent: "الرصيد الحالي",
    expenseImpactAfter: "الرصيد من بعد العملية",
    expenseImpactWarning: "انتباه: هاد المبلغ يقدر ينزل الظرف تحت الصفر.",
    livePreviewTitle: "معاينة مباشرة",
    livePreviewDescIncome: "شوف كيفاش غادي يتقسم هاد الدخل قبل ما تسجلو.",
    livePreviewDescExpense: "شوف الأثر ديال هاد المصروف على الظرف المرتابط قبل الحفظ.",
    activePeriod: "الفترة الحالية",
    availableCategories: "الفئات المتوفرة",
    mappedEnvelopeStatus: "الظرف المرتابط",
    noMappedEnvelopeStatus: "ما كاين حتى ظرف مربوط",
    previewEnterAmount: "دخل المبلغ باش تشوف المعاينة.",
    previewLoading: "كنديرو المحاكاة…",
    noDistributionConfig:
      "ما كاين حتى إعداد محفوظ. الدخل كامل غادي يمشي لظرف الكاش بشكل افتراضي.",
    createConfig: "صاوب إعداد",
    fixed: "ثابت",
    remainsInCash: "الباقي فالكاش",
    duplicates: "المكررين",
    downloadCsv: "حمّل CSV",
    historyFilters: "تاريخ العمليات والفلاتر.",
    filters: "الفلاتر",
    from: "من",
    to: "حتى",
    all: "الكل",
    envelope: "الظرف",
    cash: "لكاش",
    unmapped: "ما مربوطش",
    mapped: "مربوط",
    search: "البحث",
    searchPlaceholder: "قلب بالوصف أو الفئة",
    noTransactions: "ما كايناش عمليات",
    noTransactionsDescription: "زيد أول عملية باش تبدا.",
    tableDate: "التاريخ",
    tableType: "النوع",
    tableCategory: "الفئة",
    tableEnvelope: "الظرف",
    tableAmount: "المبلغ",
    tableDescription: "الوصف",
    tableActions: "العمليات",
    edit: "بدّل",
    delete: "حذف",
    rows: "عدد السطور",
    prev: "السابق",
    next: "التالي",
    pageOf: (page: number, total: number) => `الصفحة ${page} من ${total}`,
    duplicateTitle: "عمليات مكررة",
    duplicateSubtitle: "غادي نخليو الأقدم ونحيدو الباقي.",
    duplicateCount: (count: number) => `${count} مكرر`,
    duplicateAlertTitle: "لقينا عمليات مكررين فالتاريخ.",
    duplicateAlertDescription: (count: number) =>
      `كاينين ${count} عمليات زايدين مكررين. راجعهم قبل ما تكمل.`,
    duplicateAlertAction: "شوف المكررين",
    deleteDuplicates: "حيد المكررين",
    noDuplicates: "ما كاين حتى مكرر",
    noDuplicatesDescription: "العمليات ديالك نقيين.",
    entries: "عمليات",
    categoryFallback: "فئة",
    envelopeFallback: "ظرف",
    kept: "تبقات",
    duplicate: "مكرر",
    duplicateBeforeSave: "لقينا عملية مكررة.",
    duplicateBeforeSaveDescription:
      "كاينة عملية بحالها بنفس النوع، التاريخ، المبلغ، الفئة، والتعليق.",
    duplicateBeforeSaveFix: "نرجع نصلح هاد الإدخال",
    duplicateBeforeSaveOpenExisting: "نفتح العملية الموجودة",
    addSuccess: "تزادت العملية بنجاح.",
    addSuccessDescription: "تسجلات العملية.",
    distributionApplied: "تطبق التوزيع.",
    distributionAppliedDescription: "تحدّثات الأظرفة.",
    distributionFailed: "ما تطبقش التوزيع.",
    transactionDeleted: "تم حذف العملية",
    transactionDeletedDescription: "تحيدات العملية بنجاح.",
    duplicatesDeleted: "تم حذف المكررين",
    duplicatesDeletedDescription: (count: number) => `تحيدو ${count} مكرر.`,
    partialDelete: "حذف جزئي",
    partialDeleteDescription: (success: number, failed: number) =>
      `تحيدو ${success} وبقاو ${failed} فيهم مشكل.`,
    unknownError: "وقع مشكل غير متوقع",
    invalidRequest: "الطلب ما صالحش",
    requestFailed: "ما نجحش الطلب",
    categoryNotMapped:
      "هاد الفئة ما مربوطة حتى بظرف. ربطها بظرف باش يتحدث الميزان تلقائياً.",
    pleaseSelectCategory: "اختار فئة.",
    amountRequired: "المبلغ ضروري.",
    tourView: "واجهة العمليات",
    tourViewDesc: "هنا كتلقى الحوايج الرئيسية باش تزيد وتراقب العمليات ديالك.",
    tourBulk: "إضافة جماعية",
    tourBulkDesc: "دخل بزاف ديال العمليات دفعة وحدة من واحد الجدول.",
    tourCreate: "زيد عملية",
    tourCreateDesc: "زيد دخل ولا مصروف مع التاريخ والفئة.",
    tourActions: "أزرار سريعة",
    tourActionsDesc: "سجّل، لغّي، ولا حل تاريخ العمليات بسرعة.",
    tourPreview: "معاينة التوزيع",
    tourPreviewDesc: "شوف كيفاش غادي يتوزع هاد الدخل على الأظرفة.",
  },
} as const;

function formatError(error: unknown, copy: (typeof TRANSACTIONS_COPY)[FloussyLocale]): string {
  if (!error) {
    return copy.unknownError;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  const typed = error as ApiError;
  if (typeof typed.detail === "string") {
    if (typed.detail === "CATEGORY_NOT_MAPPED") {
      return copy.categoryNotMapped;
    }
    return typed.detail;
  }
  if (Array.isArray(typed.detail)) {
    return typed.detail.map((item) => item.msg ?? copy.invalidRequest).join(", ");
  }
  return copy.requestFailed;
}

function toDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeAmount = (value: string) => {
  const parsed = parseAmountInput(value);
  if (parsed === null) return value.trim();
  return parsed.toFixed(2);
};

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

const DEBT_NAME_MARKERS = [
  "dette",
  "dettes",
  "debt",
  "loan",
  "credit",
  "crédit",
  "دين",
  "ديون",
  "قرض",
];

const looksLikeDebtName = (value: string) => {
  const normalized = normalizeName(value);
  return DEBT_NAME_MARKERS.some((marker) => normalized.includes(normalizeName(marker)));
};

const buildDuplicateKey = (tx: TransactionRow) =>
  [
    tx.type,
    tx.category_id,
    tx.occurred_on,
    normalizeAmount(tx.amount),
    normalizeName(tx.description ?? ""),
  ].join("|");

const buildDraftDuplicateKey = (draft: {
  type: "income" | "expense";
  category_id: string;
  occurred_on: string;
  amount: string;
  description: string;
}) =>
  [
    draft.type,
    draft.category_id,
    draft.occurred_on,
    normalizeAmount(draft.amount),
    normalizeName(draft.description ?? ""),
  ].join("|");

const detectKindFromName = (name: string): CategoryKind => {
  if (isInternalIncomeCategory(name)) return "income";
  const normalized = normalizeName(name);
  return INCOME_KEYWORDS.some((keyword) => normalized.includes(keyword))
    ? "income"
    : "expense";
};

const looksLikeSalaryCategory = (name: string) => {
  const normalized = normalizeName(name);
  return SALARY_KEYWORDS.some((keyword) => normalized.includes(normalizeName(keyword)));
};

function localizeEnvelopeName(
  name: string,
  locale: FloussyLocale,
  copy: (typeof TRANSACTIONS_COPY)[FloussyLocale]
) {
  const normalized = name.trim().toLowerCase();
  if (normalized === "cash") return copy.cash;
  if (normalized === "unmapped") return copy.unmapped;
  if (normalized === "mapped") return copy.mapped;
  return localizeEnvelopeLabel(name, locale);
}

function formatLocaleDate(value: string, locale: FloussyLocale): string {
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
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  // Keep first render deterministic between SSR and client hydration.
  // Real locale preference is synchronized in an effect after mount.
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const bulkRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const incomePreviewRef = useRef<HTMLDivElement | null>(null);
  const bootstrapPrefillKeyRef = useRef<string | null>(null);
  const historyPrefillKeyRef = useRef<string | null>(null);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeOut[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [envelopeBalanceOverrides, setEnvelopeBalanceOverrides] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateConflictTx, setDuplicateConflictTx] = useState<TransactionRow | null>(null);
  const [duplicateProcessing, setDuplicateProcessing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [incomePreview, setIncomePreview] =
    useState<DistributionSimulateOut | null>(null);
  const [incomePreviewLoading, setIncomePreviewLoading] = useState(false);
  const [incomePreviewError, setIncomePreviewError] = useState<string | null>(null);

  const [draft, setDraft] = useState<TransactionDraft>({
    type: "expense",
    category_id: "",
    amount: "",
    occurred_on: "",
    description: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    type: "all" as "all" | "income" | "expense",
    category: "all",
    envelope: "all",
    search: "",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [categoryTypeOverrides, setCategoryTypeOverrides] = useState<
    Record<string, CategoryOverride>
  >({});
  const copy = TRANSACTIONS_COPY[locale];
  const pageDir = getLocaleDirection(locale);
  const periodArrow = pageDir === "rtl" ? "←" : "→";
  const issueParam = searchParams.get("issue");
  const focusTxId = searchParams.get("tx_id");

  const categoryMap = useMemo(() => {
    return new Map(categories.map((cat) => [cat.id, cat.name]));
  }, [categories]);

  const envelopeMap = useMemo(() => {
    return new Map(envelopes.map((env) => [env.id, env.name]));
  }, [envelopes]);

  const incomeAmount = useMemo(() => {
    const parsed = parseAmountInput(draft.amount);
    return {
      parsed: parsed ?? 0,
      valid: parsed !== null,
    };
  }, [draft.amount]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        "floussy_category_type_overrides"
      );
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, CategoryOverride>;
      const cleaned: Record<string, CategoryOverride> = {};
      Object.entries(parsed).forEach(([key, value]) => {
        if (value === "income" || value === "expense") {
          cleaned[key] = value;
        }
      });
      setCategoryTypeOverrides(cleaned);
    } catch {
      try {
        window.localStorage.removeItem("floussy_category_type_overrides");
      } catch {
        // ignore
      }
      setCategoryTypeOverrides({});
    }
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
    setDraft((prev) =>
      prev.occurred_on
        ? prev
        : { ...prev, occurred_on: new Date().toISOString().slice(0, 10) }
    );
  }, []);

  const categoryKindById = useMemo(() => {
    const map = new Map<string, CategoryKind>();
    categories.forEach((cat) => {
      const related = transactions.filter((tx) => tx.category_id === cat.id);
      if (related.length > 0) {
        const incomeCount = related.filter((tx) => tx.type === "income").length;
        const expenseCount = related.filter((tx) => tx.type === "expense").length;
        if (incomeCount > 0 && expenseCount > 0) {
          const kind =
            incomeCount === expenseCount
              ? "mixed"
              : incomeCount > expenseCount
              ? "income"
              : "expense";
          map.set(cat.id, kind);
        } else {
          map.set(cat.id, incomeCount > 0 ? "income" : "expense");
        }
      } else {
        map.set(cat.id, detectKindFromName(cat.name));
      }
    });
    Object.entries(categoryTypeOverrides).forEach(([id, kind]) => {
      map.set(id, kind);
    });
    return map;
  }, [categories, transactions, categoryTypeOverrides]);

  const mappedCategoryIds = useMemo(() => {
    return new Set(
      Object.entries(mappings)
        .filter(([, envelopeId]) => Boolean(envelopeId))
        .map(([categoryId]) => categoryId)
    );
  }, [mappings]);

  const filteredDraftCategories = useMemo(() => {
    return categories.filter((cat) =>
      draft.type === "income"
        ? categoryKindById.get(cat.id) === "income"
        : categoryKindById.get(cat.id) !== "income" &&
          mappedCategoryIds.has(cat.id)
    );
  }, [categories, categoryKindById, draft.type, mappedCategoryIds]);

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

  useEffect(() => {
    if (!draft.category_id) return;
    if (!filteredDraftCategories.some((cat) => cat.id === draft.category_id)) {
      setDraft((prev) => ({ ...prev, category_id: "" }));
    }
  }, [draft.category_id, filteredDraftCategories]);

  useEffect(() => {
    if (draft.type !== "income") return;
    if (!autoIncomeCategory) return;
    if (draft.category_id === autoIncomeCategory.id) return;
    setDraft((prev) => ({ ...prev, category_id: autoIncomeCategory.id }));
  }, [autoIncomeCategory, draft.category_id, draft.type]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [cats, envs, txs, mappingList, dashboardData] = await Promise.all([
        apiFetch<CategoryOut[]>("/categories"),
        apiFetch<EnvelopeOut[]>("/envelopes"),
        apiFetch<TransactionOut[]>("/transactions"),
        apiFetch<CategoryEnvelopeMapOut[]>("/mappings"),
        apiFetch<DashboardOut>("/dashboard"),
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
          envelopeName = localizeEnvelopeName(
            envelopeLookup.get(mappingMap[tx.category_id]) ?? copy.mapped,
            locale,
            copy
          );
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
      const periodResults = await Promise.allSettled(
        envs.map((env) => apiFetch<EnvelopePeriodOut[]>(`/envelopes/${env.id}/periods`))
      );
      const nextOverrides: Record<string, number> = {};
      periodResults.forEach((result, index) => {
        if (result.status !== "fulfilled" || result.value.length === 0) return;
        const closing = Number(result.value[0].closing_balance);
        if (Number.isFinite(closing)) {
          nextOverrides[envs[index].id] = closing;
        }
      });
      setEnvelopeBalanceOverrides(nextOverrides);
      if (cats.length > 0) {
        setDraft((prev) =>
          prev.category_id ? prev : { ...prev, category_id: cats[0].id }
        );
      }
    } catch (err) {
      setError(formatError(err, copy));
    } finally {
      setLoading(false);
    }
  }, [copy, locale]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (editingId) return;
    const nextType = searchParams.get("type");
    const bootstrapDate = searchParams.get("bootstrap_date");
    const bootstrapAmount = searchParams.get("bootstrap_amount");
    const prefillKey = `${nextType ?? ""}|${bootstrapDate ?? ""}|${bootstrapAmount ?? ""}`;
    const shouldApplyBootstrapPrefill =
      bootstrapPrefillKeyRef.current !== prefillKey &&
      (Boolean(bootstrapDate) || Boolean(bootstrapAmount));

    if (nextType === "income" || nextType === "expense") {
      setDraft((prev) => ({
        ...prev,
        type: nextType,
      }));
    }
    if (!shouldApplyBootstrapPrefill) return;

    setDraft((prev) => {
      const nextDraft = { ...prev };
      if (bootstrapDate) {
        const parsedDate = new Date(`${bootstrapDate}T00:00:00`);
        if (!Number.isNaN(parsedDate.getTime())) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (parsedDate <= today) {
            nextDraft.occurred_on = bootstrapDate;
          }
        }
      }
      if (bootstrapAmount) {
        const parsedAmount = parseAmountInput(bootstrapAmount);
        if (parsedAmount !== null) {
          nextDraft.amount = parsedAmount.toFixed(2);
        }
      }
      return nextDraft;
    });
    bootstrapPrefillKeyRef.current = prefillKey;
  }, [editingId, searchParams]);

  useEffect(() => {
    const historyOpenParam = searchParams.get("history_open");
    const duplicatesOpenParam = searchParams.get("duplicates_open");
    const historyTypeParam = searchParams.get("history_type");
    const historyFromParam = searchParams.get("history_from");
    const historyToParam = searchParams.get("history_to");
    const historySearchParam = searchParams.get("history_search");
    const prefillKey = [
      historyOpenParam ?? "",
      duplicatesOpenParam ?? "",
      historyTypeParam ?? "",
      historyFromParam ?? "",
      historyToParam ?? "",
      historySearchParam ?? "",
    ].join("|");

    if (historyPrefillKeyRef.current === prefillKey) return;

    const nextType =
      historyTypeParam === "income" || historyTypeParam === "expense"
        ? historyTypeParam
        : "all";
    const isValidDate = (value: string | null) =>
      Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

    setFilters((prev) => ({
      ...prev,
      type: nextType,
      from: isValidDate(historyFromParam) ? (historyFromParam as string) : prev.from,
      to: isValidDate(historyToParam) ? (historyToParam as string) : prev.to,
      search: historySearchParam ?? prev.search,
    }));
    setPage(1);

    if (historyOpenParam === "1") {
      setHistoryOpen(true);
    }
    if (duplicatesOpenParam === "1") {
      setDuplicateOpen(true);
    }

    historyPrefillKeyRef.current = prefillKey;
  }, [searchParams]);

  useEffect(() => {
    if (issueParam === "salary-duplicate" || issueParam === "salary-amount") {
      setHistoryOpen(true);
    }
  }, [issueParam]);

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
        setIncomePreviewError(formatError(err, copy));
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
  }, [draft.type, draft.amount, draft.occurred_on, copy]);

  const mappedEnvelopeHint = useMemo(() => {
    if (draft.type !== "expense" || !draft.category_id) return null;
    const mappedId = mappings[draft.category_id];
    if (!mappedId) {
      return copy.categoryNotMapped;
    }
    const name = envelopeMap.get(mappedId);
    return name
      ? copy.mappedToEnvelope(localizeEnvelopeName(name, locale, copy))
      : copy.mappedEnvelope;
  }, [draft.category_id, draft.type, mappings, envelopeMap, locale, copy]);

  const incomeDatePeriodWarning = useMemo(() => {
    if (draft.type !== "income" || !draft.occurred_on) return null;
    const activePeriod = dashboard?.current_period;
    if (!activePeriod?.start || !activePeriod?.end) return null;
    const incomeDate = draft.occurred_on;
    const start = activePeriod.start;
    const end = activePeriod.end;
    const incomeDateLabel = formatLocaleDate(incomeDate, locale);
    const startLabel = formatLocaleDate(start, locale);
    const endLabel = formatLocaleDate(end, locale);
    if (incomeDate < start) {
      return copy.incomeDateBeforePeriod(
        incomeDateLabel,
        startLabel,
        endLabel,
        periodArrow
      );
    }
    if (incomeDate > end) {
      return copy.incomeDateAfterPeriod(
        incomeDateLabel,
        startLabel,
        endLabel,
        periodArrow
      );
    }
    return null;
  }, [copy, dashboard?.current_period, draft.occurred_on, draft.type, locale, periodArrow]);

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
    const envelopeName = localizeEnvelopeName(
      envelopeMap.get(mappedId) ?? copy.mapped,
      locale,
      copy
    );
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

  const activePeriodLabel = useMemo(() => {
    const currentPeriod = dashboard?.current_period;
    if (!currentPeriod?.start || !currentPeriod?.end) return null;
    return `${formatLocaleDate(currentPeriod.start, locale)} ${periodArrow} ${formatLocaleDate(
      currentPeriod.end,
      locale
    )}`;
  }, [dashboard?.current_period, locale, periodArrow]);

  const amountCardTone =
    draft.type === "income"
      ? "border-emerald-200 bg-emerald-50/80"
      : "border-rose-200 bg-rose-50/80";
  const amountInputTone =
    draft.type === "income"
      ? "border-emerald-300 bg-[var(--surface)]/95 text-emerald-950 focus:border-emerald-500"
      : "border-rose-300 bg-[var(--surface)]/95 text-rose-950 focus:border-rose-500";
  const previewCardTone =
    draft.type === "income"
      ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-[var(--surface)]"
      : "border-amber-200 bg-gradient-to-br from-amber-50 to-[var(--surface)]";

  const noCategories = categories.length === 0;
  const noMatchingCategories =
    !noCategories &&
    draft.type === "expense" &&
    filteredDraftCategories.length === 0;

  const filteredTransactions = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (filters.type !== "all" && tx.type !== filters.type) return false;
        if (filters.category !== "all" && tx.category_id !== filters.category) {
          return false;
        }
        if (filters.envelope !== "all") {
          const mappedId = mappings[tx.category_id];
          const envelopeName =
            tx.type === "income"
              ? copy.cash
              : mappedId
              ? localizeEnvelopeName(envelopeMap.get(mappedId) ?? copy.mapped, locale, copy)
              : copy.unmapped;
          if (envelopeName !== filters.envelope) return false;
        }
        if (filters.from) {
          const fromDate = toDate(filters.from);
          const txDate = toDate(tx.occurred_on);
          if (fromDate && txDate && txDate < fromDate) return false;
        }
        if (filters.to) {
          const toDateValue = toDate(filters.to);
          const txDate = toDate(tx.occurred_on);
          if (toDateValue && txDate && txDate > toDateValue) return false;
        }
        if (search) {
          const haystack = `${tx.description ?? ""} ${tx.category_name ?? ""}`
            .toLowerCase()
            .trim();
          if (!haystack.includes(search)) return false;
        }
        return true;
      })
      .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  }, [transactions, filters, mappings, envelopeMap, locale, copy]);

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, TransactionRow[]>();
    transactions.forEach((tx) => {
      const key = buildDuplicateKey(tx);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    });
    const sortByCreated = (a: TransactionRow, b: TransactionRow) => {
      if (a.created_at && b.created_at) {
        return a.created_at.localeCompare(b.created_at);
      }
      if (a.occurred_on !== b.occurred_on) {
        return a.occurred_on.localeCompare(b.occurred_on);
      }
      return a.id.localeCompare(b.id);
    };
    return Array.from(map.values())
      .filter((list) => list.length > 1)
      .map((list) => list.slice().sort(sortByCreated))
      .sort((a, b) => b[0].occurred_on.localeCompare(a[0].occurred_on));
  }, [transactions]);

  const duplicateCount = useMemo(
    () => duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0),
    [duplicateGroups]
  );

  const handleDownloadCsv = () => {
    if (filteredTransactions.length === 0) return;
    const headers = [
      "Date",
      "Type",
      "Category",
      "Envelope",
      "Amount",
      "Description",
    ];
    const escapeValue = (value: string) => {
      if (value.includes('"')) {
        value = value.replace(/"/g, '""');
      }
      if (/[",\n]/.test(value)) {
        return `"${value}"`;
      }
      return value;
    };
    const rows = filteredTransactions.map((tx) => [
      tx.occurred_on,
      tx.type,
      tx.category_name ?? "-",
      tx.envelope_name ?? "-",
      tx.amount,
      tx.description ?? "",
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => escapeValue(String(cell))).join(",")),
    ].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const suffix = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `transactions-${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / pageSize)
  );

  const pagedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page, pageSize]);

  const resetForm = () => {
    setDraft((prev) => ({
      ...prev,
      type: "expense",
      amount: "",
      description: "",
      occurred_on: new Date().toISOString().slice(0, 10),
    }));
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const effectiveCategoryId =
      draft.type === "income"
        ? (autoIncomeCategory?.id ?? draft.category_id)
        : draft.category_id;

    if (!effectiveCategoryId) {
      setError(copy.pleaseSelectCategory);
      return;
    }
    if (draft.type === "expense" && !mappings[effectiveCategoryId]) {
      setError(copy.categoryNotMapped);
      return;
    }
    if (!draft.amount) {
      setError(copy.amountRequired);
      return;
    }
    const normalizedAmount = parseAmountInput(draft.amount);
    if (normalizedAmount === null) {
      setError(copy.amountRequired);
      return;
    }
    const amountForApi = normalizedAmount.toFixed(2);
    const draftDuplicateKey = buildDraftDuplicateKey({
      type: draft.type,
      category_id: effectiveCategoryId,
      occurred_on: draft.occurred_on,
      amount: amountForApi,
      description: draft.description,
    });
    const existingDuplicate = transactions.find(
      (tx) => buildDuplicateKey(tx) === draftDuplicateKey && tx.id !== editingId
    );
    if (existingDuplicate) {
      setError(copy.duplicateBeforeSave);
      setDuplicateConflictTx(existingDuplicate);
      toast({
        title: copy.duplicateBeforeSave,
        description: copy.duplicateBeforeSaveDescription,
        variant: "default",
      });
      setHistoryOpen(false);
      return;
    }

    setSubmitting(true);
    const dispatchDataUpdated = () => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(new CustomEvent(APP_DATA_UPDATED_EVENT));
    };

    if (editingId) {
      try {
        const updated = await apiFetch<TransactionOut>(
          `/transactions/${editingId}`,
          {
            method: "PATCH",
            body: {
              type: draft.type,
              category_id: effectiveCategoryId,
              amount: amountForApi,
              occurred_on: draft.occurred_on,
              description: draft.description || undefined,
            },
          }
        );
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.id === editingId
              ? {
                  ...tx,
                  ...updated,
                  category_name: categoryMap.get(updated.category_id) ?? "-",
                }
              : tx
          )
        );
        dispatchDataUpdated();
        resetForm();
      } catch (err) {
        setError(formatError(err, copy));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const optimisticId = `temp-${Date.now()}`;
    const optimisticRow: TransactionRow = {
      id: optimisticId,
      type: draft.type,
      amount: amountForApi,
      occurred_on: draft.occurred_on,
      description: draft.description,
      envelope_movement: null,
      category_id: effectiveCategoryId,
      category_name: categoryMap.get(effectiveCategoryId) ?? "-",
      envelope_name:
        draft.type === "income"
          ? copy.cash
          : mappings[effectiveCategoryId]
          ? localizeEnvelopeName(
              envelopeMap.get(mappings[effectiveCategoryId]) ?? copy.mapped,
              locale,
              copy
            )
          : copy.unmapped,
      optimistic: true,
    };

    setTransactions((prev) => [optimisticRow, ...prev]);

    try {
      const created = await apiFetch<TransactionOut>("/transactions", {
        method: "POST",
        body: {
          type: draft.type,
          category_id: effectiveCategoryId,
          amount: amountForApi,
          occurred_on: draft.occurred_on,
          description: draft.description || undefined,
        },
      });
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === optimisticId
            ? {
                ...tx,
                ...created,
                optimistic: false,
              }
            : tx
        )
      );
      dispatchDataUpdated();
      if (created.type === "income") {
        await loadData();
        router.refresh();
      }
      resetForm();
      toast({
        title: copy.addSuccess,
        description: copy.addSuccessDescription,
        variant: "success",
      });
    } catch (err) {
      setTransactions((prev) => prev.filter((tx) => tx.id !== optimisticId));
      setError(formatError(err, copy));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (transactionId: string): Promise<boolean> => {
    const snapshot = transactions;
    setTransactions((prev) => prev.filter((tx) => tx.id !== transactionId));

    try {
      if (transactionId.startsWith("temp-")) {
        return true;
      }
      setDeleting(true);
      await apiFetch<void>(`/transactions/${transactionId}`, {
        method: "DELETE",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(APP_DATA_UPDATED_EVENT));
      }
      await loadData();
      router.refresh();
      toast({
        title: copy.transactionDeleted,
        description: copy.transactionDeletedDescription,
        variant: "success",
      });
      return true;
    } catch (err) {
      setTransactions(snapshot);
      const message = formatError(err, copy);
      setError(message);
      toast({
        title: copy.unknownError,
        description: message,
        variant: "danger",
      });
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteDuplicates = async () => {
    if (duplicateProcessing) return;
    const groups = duplicateGroups;
    if (groups.length === 0) return;
    setDuplicateProcessing(true);

    try {
      const toRemove = groups.flatMap((group) =>
        group.slice(1).map((tx) => tx.id)
      );
      const tempIds = toRemove.filter((id) => id.startsWith("temp-"));
      const serverIds = toRemove.filter((id) => !id.startsWith("temp-"));

      const results = await Promise.allSettled(
        serverIds.map((id) =>
          apiFetch<void>(`/transactions/${id}`, { method: "DELETE" })
        )
      );

      const successIds = [...tempIds];
      const failedIds: string[] = [];
      results.forEach((result, index) => {
        const id = serverIds[index];
        if (result.status === "fulfilled") {
          successIds.push(id);
        } else {
          failedIds.push(id);
        }
      });

      if (successIds.length > 0) {
        setTransactions((prev) =>
          prev.filter((tx) => !successIds.includes(tx.id))
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(APP_DATA_UPDATED_EVENT));
        }
      }

      if (failedIds.length === 0) {
        toast({
          title: copy.duplicatesDeleted,
          description: copy.duplicatesDeletedDescription(successIds.length),
          variant: "success",
        });
      } else {
        toast({
          title: copy.partialDelete,
          description: copy.partialDeleteDescription(successIds.length, failedIds.length),
          variant: "danger",
        });
      }

      await loadData();
      router.refresh();
    } finally {
      setDuplicateProcessing(false);
    }
  };

  const handleEdit = (tx: TransactionRow) => {
    setEditingId(tx.id);
    setDraft({
      id: tx.id,
      type: tx.type,
      category_id: tx.category_id,
      amount: tx.amount,
      occurred_on: tx.occurred_on,
      description: tx.description ?? "",
    });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleFilterChange = (
    key: keyof typeof filters,
    value: string
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

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
        ref: actionsRef,
      },
      {
        title: copy.tourPreview,
        description: copy.tourPreviewDesc,
        ref: incomePreviewRef,
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
      <div
        ref={headerRef}
        className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-emerald-50/70 p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]"
      >
        <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              {copy.quickEntry}
            </div>
            <PageHeader
              title={copy.title}
              subtitle={copy.subtitle}
              className="gap-3"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200/80 bg-[var(--surface)]/85 px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {copy.type}
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                  {draft.type === "income" ? copy.income : copy.expense}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-[var(--surface)]/85 px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {copy.activePeriod}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                  {activePeriodLabel ?? "—"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-[var(--surface)]/85 px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {copy.livePreviewTitle}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                  {draft.type === "income" ? copy.preview : copy.expenseImpact}
                </p>
              </div>
            </div>
          </div>
          <div ref={bulkRef} className="flex items-center justify-start xl:justify-end">
            <Button asChild variant="secondary" className="rounded-2xl border-white/80 bg-[var(--surface)]/90 shadow-sm">
              <Link href="/transactions/bulk">{copy.bulkEntry}</Link>
            </Button>
          </div>
        </div>
      </div>
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
          if (success) {
            setDeleteTarget(null);
          }
        }}
      />
      <Dialog
        open={Boolean(duplicateConflictTx)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDuplicateConflictTx(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{copy.duplicateBeforeSave}</DialogTitle>
            <DialogDescription>{copy.duplicateBeforeSaveDescription}</DialogDescription>
          </DialogHeader>
          {duplicateConflictTx ? (
            <Card className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50/60 p-4">
              <div className="grid gap-2 text-sm text-[var(--ink)] sm:grid-cols-2">
                <div>
                  <span className="text-[var(--muted)]">{copy.tableDate}: </span>
                  {duplicateConflictTx.occurred_on}
                </div>
                <div>
                  <span className="text-[var(--muted)]">{copy.tableType}: </span>
                  {duplicateConflictTx.type === "income" ? copy.income : copy.expense}
                </div>
                <div>
                  <span className="text-[var(--muted)]">{copy.tableAmount}: </span>
                  {duplicateConflictTx.amount}
                </div>
                <div>
                  <span className="text-[var(--muted)]">{copy.tableCategory}: </span>
                  {duplicateConflictTx.category_name
                    ? localizeCategoryName(duplicateConflictTx.category_name, locale)
                    : "-"}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[var(--muted)]">{copy.tableDescription}: </span>
                  {duplicateConflictTx.description ?? "-"}
                </div>
              </div>
            </Card>
          ) : null}
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDuplicateConflictTx(null)}
            >
              {copy.duplicateBeforeSaveFix}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!duplicateConflictTx) return;
                handleEdit(duplicateConflictTx);
                setHistoryOpen(true);
                setDuplicateConflictTx(null);
              }}
            >
              {copy.duplicateBeforeSaveOpenExisting}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="grid gap-3">
          {[...Array(6)].map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-10 w-full animate-pulse rounded-2xl bg-[var(--surface-2)]"
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {!loading && duplicateCount > 0 ? (
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
      ) : null}
      {notificationIssueGuidance ? (
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
      ) : null}

      <div ref={formRef}>
        <Section
          title={editingId ? copy.editTransaction : copy.createTransaction}
          className="border border-white/80 bg-[var(--surface)]/75 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)] backdrop-blur"
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
            <form onSubmit={handleSubmit} className="grid gap-4">
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
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            type: "expense",
                          }))
                        }
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
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            type: "income",
                          }))
                        }
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
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          amount: event.target.value,
                        }))
                      }
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
                    {draft.type === "income" ? (
                      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                          {copy.availableCategories}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[var(--ink)]">
                          {filteredDraftCategories.length}
                        </p>
                      </div>
                    ) : (
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
                          disabled={noCategories || noMatchingCategories}
                        >
                          <option value="" disabled>
                            {copy.selectCategory}
                          </option>
                          {filteredDraftCategories.length === 0 ? (
                            <option value="" disabled>
                              {copy.noExpenseOption}
                            </option>
                          ) : (
                            filteredDraftCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {localizeCategoryName(cat.name, locale)}
                              </option>
                            ))
                          )}
                        </select>
                      </label>
                    )}

                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{copy.date}</span>
                      <input
                        type="date"
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

                  {incomeDatePeriodWarning ? (
                    <Alert tone="warning">
                      <AlertDescription>{incomeDatePeriodWarning}</AlertDescription>
                    </Alert>
                  ) : null}

                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{copy.description}</span>
                    <input
                      value={draft.description}
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
                    <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-slate-50 to-[var(--surface)] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        {copy.availableCategories}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--ink)]">
                        {filteredDraftCategories.length}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-slate-50 to-[var(--surface)] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        {copy.mappedEnvelopeStatus}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                        {mappedEnvelopeHint ?? copy.noMappedEnvelopeStatus}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-slate-50 to-[var(--surface)] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        {copy.activePeriod}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                        {activePeriodLabel ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div ref={actionsRef} className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="submit"
                      isLoading={submitting}
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

            {draft.type === "income" ? (
              <div
                ref={incomePreviewRef}
                className={`grid h-fit gap-4 rounded-[30px] border p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)] sm:sticky sm:top-6 sm:p-6 ${previewCardTone}`}
              >
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
                  if (!incomeAmount.valid) {
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
                            item.mode === "fixed" &&
                            item.target_type !== "goal" &&
                            !looksLikeDebtName(item.name)
                        );
                        const debtGoalItems = incomePreview.items.filter(
                          (item) =>
                            item.mode === "fixed" &&
                            (item.target_type === "goal" || looksLikeDebtName(item.name))
                        );
                        const fixedTargetKeys = new Set(
                          incomePreview.items
                            .filter((item) => item.mode === "fixed")
                            .map((item) => `${item.target_type}:${item.target_id}`)
                        );
                        const flexibleItems = incomePreview.items.filter(
                          (item) =>
                            item.mode === "percent" &&
                            !fixedTargetKeys.has(`${item.target_type}:${item.target_id}`)
                        );
                        const sections: Array<{
                          key: string;
                          title: string;
                          items: typeof incomePreview.items;
                          showPercent: boolean;
                        }> = [
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
                                <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)]/80 px-3 py-2">
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
                                      className="flex items-center justify-between rounded-2xl bg-[var(--surface)]/80 px-3 py-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {localizeEnvelopeName(item.name, locale, copy)}
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
                      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-[var(--surface)]/90 px-3 py-3 text-sm">
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
              <div className={`grid h-fit gap-4 rounded-[30px] border p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)] sm:sticky sm:top-6 sm:p-6 ${previewCardTone}`}>
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
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3">
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
                    <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)]/80 px-3 py-3">
                      <span className="text-[var(--muted)]">{copy.expenseImpactEnvelope}</span>
                      <span className="font-medium">{expenseImpact.envelopeName}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)]/80 px-3 py-3">
                      <span className="text-[var(--muted)]">{copy.expenseImpactCurrent}</span>
                      <span className="font-medium">{expenseImpact.currentBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)]/80 px-3 py-3">
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
        </Section>
      </div>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 overflow-hidden">
          <div className="flex h-full flex-col">
            <DialogHeader className="border-b border-[var(--border)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <DialogTitle>{copy.title}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={() => setDuplicateOpen(true)}
                    disabled={duplicateCount === 0}
                  >
                    {copy.duplicates} {duplicateCount > 0 ? `(${duplicateCount})` : ""}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={filteredTransactions.length === 0}
                  >
                    {copy.downloadCsv}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)]">
                {copy.historyFilters}
              </p>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
              <Section title={copy.filters}>
                <div className="grid gap-3 md:grid-cols-5">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">{copy.from}</span>
                    <input
                      type="date"
                      value={filters.from}
                      onChange={(event) =>
                        handleFilterChange("from", event.target.value)
                      }
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">{copy.to}</span>
                    <input
                      type="date"
                      value={filters.to}
                      onChange={(event) =>
                        handleFilterChange("to", event.target.value)
                      }
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">{copy.type}</span>
                    <select
                      value={filters.type}
                      onChange={(event) =>
                        handleFilterChange("type", event.target.value)
                      }
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    >
                      <option value="all">{copy.all}</option>
                      <option value="income">{copy.income}</option>
                      <option value="expense">{copy.expense}</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">{copy.category}</span>
                    <select
                      value={filters.category}
                      onChange={(event) =>
                        handleFilterChange("category", event.target.value)
                      }
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    >
                      <option value="all">{copy.all}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {localizeCategoryName(cat.name, locale)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">{copy.envelope}</span>
                    <select
                      value={filters.envelope}
                      onChange={(event) =>
                        handleFilterChange("envelope", event.target.value)
                      }
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    >
                      <option value="all">{copy.all}</option>
                      <option value={copy.cash}>{copy.cash}</option>
                      <option value={copy.unmapped}>{copy.unmapped}</option>
                      {envelopes
                        .filter((env) => !env.is_cash)
                        .map((env) => (
                          <option
                            key={env.id}
                            value={localizeEnvelopeName(env.name, locale, copy)}
                          >
                            {localizeEnvelopeName(env.name, locale, copy)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs text-[var(--muted)]">{copy.search}</span>
                    <input
                      value={filters.search}
                      onChange={(event) =>
                        handleFilterChange("search", event.target.value)
                      }
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                      placeholder={copy.searchPlaceholder}
                    />
                  </label>
                </div>
              </Section>

              <Section title={copy.title}>
                {filteredTransactions.length === 0 ? (
                  <EmptyState
                    title={copy.noTransactions}
                    description={copy.noTransactionsDescription}
                  />
                ) : (
                  <Card className="p-0">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
                          <tr>
                            <th className="px-4 py-3">{copy.tableDate}</th>
                            <th className="px-4 py-3">{copy.tableType}</th>
                            <th className="px-4 py-3">{copy.tableCategory}</th>
                            <th className="px-4 py-3">{copy.tableEnvelope}</th>
                            <th className="px-4 py-3">{copy.tableAmount}</th>
                            <th className="px-4 py-3">{copy.tableDescription}</th>
                            <th className="px-4 py-3 text-right">{copy.tableActions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          <AnimatePresence initial={false}>
                            {pagedTransactions.map((tx) => (
                              <motion.tr
                                key={tx.id}
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className={`transition hover:bg-[var(--surface-2)] ${
                                  tx.optimistic ? "opacity-60" : ""
                                } ${
                                  focusTxId && tx.id === focusTxId
                                    ? "bg-amber-50 ring-1 ring-amber-300"
                                    : ""
                                }`}
                              >
                                <td className="px-4 py-3 font-medium">
                                  {tx.occurred_on}
                                </td>
                                <td className="px-4 py-3 capitalize">
                                  {tx.type === "income" ? copy.income : copy.expense}
                                </td>
                                <td className="px-4 py-3">
                                  {tx.category_name
                                    ? localizeCategoryName(tx.category_name, locale)
                                    : "-"}
                                </td>
                                <td className="px-4 py-3">
                                  {tx.envelope_name
                                    ? localizeEnvelopeName(tx.envelope_name, locale, copy)
                                    : "-"}
                                </td>
                                <td className="px-4 py-3">{tx.amount}</td>
                                <td className="px-4 py-3">
                                  {tx.description ?? "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        handleEdit(tx);
                                        setHistoryOpen(false);
                                      }}
                                    >
                                      {copy.edit}
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => setDeleteTarget(tx)}
                                    >
                                      {copy.delete}
                                    </Button>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--muted)]">{copy.rows}</span>
                        <select
                          value={pageSize}
                          onChange={(event) => {
                            setPageSize(Number(event.target.value));
                            setPage(1);
                          }}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                        >
                          {PAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                          disabled={page === 1}
                        >
                          {copy.prev}
                        </Button>
                        <span className="text-xs text-[var(--muted)]">
                          {copy.pageOf(page, totalPages)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPage((prev) => Math.min(prev + 1, totalPages))
                          }
                          disabled={page === totalPages}
                        >
                          {copy.next}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </Section>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 overflow-hidden">
          <div className="flex h-full flex-col">
            <DialogHeader className="border-b border-[var(--border)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <DialogTitle>{copy.duplicateTitle}</DialogTitle>
                  <p className="text-sm text-[var(--muted)]">
                    {copy.duplicateSubtitle}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="muted">{copy.duplicateCount(duplicateCount)}</Badge>
                  <Button
                    size="sm"
                    variant="danger"
                    type="button"
                    onClick={handleDeleteDuplicates}
                    disabled={duplicateCount === 0 || duplicateProcessing}
                  >
                    {copy.deleteDuplicates}
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
              {duplicateGroups.length === 0 ? (
                <EmptyState
                  title={copy.noDuplicates}
                  description={copy.noDuplicatesDescription}
                />
              ) : (
                <div className="grid gap-4">
                  {duplicateGroups.map((group, index) => {
                    const keeper = group[0];
                    return (
                      <Card key={`${keeper.id}-${index}`} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--ink)]">
                              {keeper.category_name
                                ? localizeCategoryName(keeper.category_name, locale)
                                : copy.categoryFallback}{" "}
                              • {keeper.amount}
                            </p>
                            <p className="text-xs text-[var(--muted)]">
                              {keeper.occurred_on} •{" "}
                              {keeper.type === "income" ? copy.income : copy.expense}
                            </p>
                            <p className="text-xs text-[var(--muted)]">
                              {keeper.description ?? "-"}
                            </p>
                          </div>
                          <Badge tone="muted">{group.length} {copy.entries}</Badge>
                        </div>
                        <div className="grid gap-2">
                          {group.map((tx, idx) => (
                            <div
                              key={tx.id}
                              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${
                                idx === 0
                                  ? "border-emerald-200 bg-emerald-50/60"
                                  : "border-amber-200 bg-amber-50/50"
                              }`}
                            >
                              <div>
                                <p className="font-medium text-[var(--ink)]">
                                  {tx.category_name
                                    ? localizeCategoryName(tx.category_name, locale)
                                    : copy.categoryFallback}{" "}
                                  • {tx.amount}
                                </p>
                                <p className="text-xs text-[var(--muted)]">
                                  {tx.occurred_on} •{" "}
                                  {tx.type === "income" ? copy.income : copy.expense} •{" "}
                                  {tx.envelope_name
                                    ? localizeEnvelopeName(tx.envelope_name, locale, copy)
                                    : copy.envelopeFallback}
                                </p>
                                <p className="text-xs text-[var(--muted)]">
                                  {tx.description ?? "-"}
                                </p>
                              </div>
                              <Badge tone={idx === 0 ? "success" : "warning"}>
                                {idx === 0 ? copy.kept : copy.duplicate}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
