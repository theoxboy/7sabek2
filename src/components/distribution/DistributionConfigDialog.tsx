"use client";

import type { HTMLAttributes } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import type { EnvelopeOut, GoalOut } from "@/lib/types";
import {
  buildRowsFromRules,
  getRules,
  getSettings,
  patchSettings,
  upsertRules,
  type DistributionRow,
  isFixedMode,
  isPercentMode,
} from "@/lib/distribution";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Separator } from "@/components/ui/Separator";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { SortableTableRows } from "@/components/distribution/SortableTableRows";
import { normalizePercentRows } from "@/components/distribution/PercentNormalizer";
import { cn } from "@/lib/cn";
import { GripVertical, Info } from "lucide-react";
import {
  getLocaleDirection,
  type FloussyLocale,
} from "@/lib/localePreference";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";

type DistributionConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig?: SavedDistributionConfig | null;
  onSaveNamedConfig?: (config: SavedDistributionConfig) => Promise<string | void> | string | void;
  onSetActiveConfig?: (configId: string) => void;
  onComplete?: () => void;
  includeGoals?: boolean;
  allowedEnvelopeNames?: string[];
  fixedSelectionExcludedNames?: string[];
  skipExistingFixedPreselection?: boolean;
  hideFixedSelectionStep?: boolean;
  baselineFixedSimulationItems?: Array<{ name: string; amount: number }>;
  simulationBaseAmount?: number | null;
  showRolloverControls?: boolean;
  dynamicPoolAmount?: number;
  rebalanceConfig?: {
    totalPool: number;
    debtAmount: number;
    goalsAmount: number;
    flexAmount: number;
    debtRemainingAmount?: number;
    debtCurrentMonthly?: number;
    goalRemainingAmount?: number;
  } | null;
  onApplyRebalance?: (next: {
    debtAmount: number;
    goalsAmount: number;
    flexAmount: number;
  }) => void;
};

type SimulationItem = {
  name: string;
  amount: number;
};

type SimulationPreview = {
  income: number;
  fixedItems: SimulationItem[];
  percentItems: SimulationItem[];
  totalFixedApplied: number;
  remainderAfterFixed: number;
  remainderAfterPercent: number;
  totalPercent: number;
};

type WizardStep = 1 | 2 | 3 | 4 | 5;

const EMPTY_BASELINE_FIXED_SIMULATION_ITEMS: Array<{ name: string; amount: number }> = [];

type SortHandleProps = HTMLAttributes<HTMLElement> & {
  ref?: (node: HTMLElement | null) => void;
};

export type SavedDistributionConfig = {
  id: string;
  name: string;
  autoEnabled: boolean;
  percentMode?: "equal" | "ranked";
  source?: "onboarding_initial" | "post_onboarding_adjustment";
  rows: DistributionRow[];
  scopeHash?: string | null;
  createdAt: string;
  updatedAt: string;
};

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const LOCALE_TO_BCP47: Record<FloussyLocale, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-MA",
};

const DISTRIBUTION_DIALOG_COPY = {
  fr: {
    unknownError: "Erreur inconnue",
    invalidRolloverDate: "Date de rollover invalide.",
    autoUpdated: "Auto mis à jour",
    autoEnabled: "Répartition automatique activée.",
    autoDisabled: "Répartition automatique désactivée.",
    error: "Erreur",
    unableToSave: "Impossible de sauver.",
    configSaved: "Configuration enregistrée",
    configSavedDesc: (name: string) => `Config "${name}" sauvegardée.`,
    nameRequired: "Nom requis",
    addName: "Ajoute un nom pour enregistrer la configuration.",
    distributionApplied: "Répartition appliquée",
    incomeLabel: (amount: number) => `Revenu ${amount.toFixed(2)}`,
    availableCash: "Cash disponible",
    unableToApply: "Impossible d'appliquer.",
    incomeRequired: "Revenu requis",
    fillIncome: "Renseigne un revenu pour simuler.",
    noPercentRows: "Aucune ligne %",
    noPercentRowsDesc: "Active au moins une règle en % pour répartir.",
    fixedSelectionTitle: "Sélection des fixes",
    fixedSelectionSubtitle: "Choisis les enveloppes à montant fixe pour chaque période.",
    fixedAmountsTitle: "Montants fixes",
    fixedAmountsSubtitle: "Saisis le montant fixe pour chaque enveloppe sélectionnée.",
    percentTitle: "Répartition du reste (%)",
    percentSubtitle: "Choisis le mode : égalité ou classement.",
    simulationTitle: "Simulation",
    simulationSubtitle: "Teste un montant pour voir la répartition. Rien n’est enregistré.",
    configNameTitle: "Nom de la configuration",
    configNameSubtitle: "",
    doneTitle: "Félicitations",
    doneSubtitle: "Vérifie le récapitulatif puis enregistre pour confirmer.",
    bravo: (name: string) => (name ? `Bravo ${name} !` : "Bravo !"),
    equal: "Égalité",
    ranked: "Classement",
    configureDistribution: "Configurer la répartition",
    currentConfigLabel: "Configuration en cours",
    step: "Étape",
    auto: "Auto",
    totalPercent: "Total %",
    backendNormalizes: "Le backend normalisera les % pendant l'exécution.",
    loading: "Chargement…",
    rolloverReminder: "Rappel rollover",
    rolloverStored: "Ces paramètres sont déjà enregistrés dans le système.",
    nextDate: "Prochaine date",
    toDefine: "à définir",
    editRollover: "Modifier le rollover",
    fixedEnvelopes: "Enveloppes à montant fixe",
    envelopesCount: (count: number) => `${count} enveloppe(s)`,
    fixed: "Fixe",
    rolloverOn: "Rollover ON",
    rolloverOff: "Rollover OFF",
    noFixedSelected: "Aucune enveloppe fixe sélectionnée.",
    fixedAmountPerPeriod: "Montant fixe par période",
    amount: "Montant",
    percentAllocation: "Mode de répartition du reste",
    percentAuto: "Le mode sélectionné est appliqué automatiquement.",
    percentEnvelopes: "Enveloppes en %",
    allFixed: "Toutes les enveloppes sont en fixe.",
    priority: (rank: number) => `Priorité #${rank}`,
    equalSplit: "Répartition égalitaire",
    goals: "Objectifs",
    debt: "Dette",
    flex: "Flex",
    localSimulation: "Simulation locale",
    estimateDistribution: "Estime rapidement la répartition avec un revenu donné.",
    optionalIncome: "Revenu (optionnel)",
    income: "Revenu",
    fixedApplied: "Fixes appliqués",
    remainingAfterFixed: "Reste après fixes",
    lines: (count: number) => `${count} ligne(s)`,
    noActiveFixed: "Aucun fixe actif.",
    percentSplit: "Répartition %",
    noActivePercent: "Aucun % actif.",
    unallocated: "Non réparti",
    configNameOptional: "Nom de la configuration (optionnel)",
    ifEmptyAutoName: "Si tu laisses vide, un nom automatique sera créé.",
    customName: "Nom personnalisé",
    monthlyExample: "Ex: Répartition mensuelle",
    editLater: "Tu peux modifier cette configuration plus tard depuis la page Répartition.",
    readyBody:
      "Ce récapitulatif concerne seulement les enveloppes non fixes de cette étape. Les fixes déjà établis avant restent actifs.",
    envelopes: "Enveloppes non fixes",
    totalFixed: "Fixes de cette étape",
    scopeHint: "Ici, on pilote uniquement le reste après les engagements fixes déjà définis.",
    rollover: "Rollover",
    quickTips: "Conseils rapides",
    tip1: "Teste une simulation pour vérifier que le reste correspond à ton budget réel.",
    tip2: "Tu pourras modifier cette configuration plus tard dans Répartition.",
    tip3: "Si tu ajustes les enveloppes, relance une simulation pour valider.",
    fixedCountSummary: (fixedCount: number, percentCount: number) =>
      `Fixes : ${fixedCount} · % : ${percentCount}`,
    percentModeSummary: (mode: string) => `Mode % : ${mode}`,
    rebalanceTitle: "Rééquilibrage dettes/objectifs/morona",
    rebalanceDebtGoalsBoundary: "Limite dettes/objectifs",
    rebalanceGoalsFlexBoundary: "Limite objectifs/morona",
    rebalanceAutoHint:
      "Le rééquilibrage s’applique automatiquement dès que vous changez les seuils.",
    flexAmountToDistribute: "Montant morona à distribuer",
    flexAmountHint:
      "Ce montant se met à jour automatiquement et reste synchronisé avec la réglette dettes/objectifs/morona ci-dessus.",
    onboardingPercentEnvelopesTitle: "Enveloppes flexibles ciblées par la répartition",
    onboardingNoStandaloneFlexible:
      "Aucune enveloppe flexible autonome n'est disponible pour ce réglage.",
    saveAndContinue: "Enregistrer et continuer",
    toSimulation: "Vers simulation",
    toSummary: "Vers résumé",
    reviewSimulation: "Revoir la simulation",
    editSettings: "Modifier les paramètres",
    cancel: "Fermer sans enregistrer",
    back: "Étape précédente",
    next: "Suivant",
    finish: "Terminer",
    fixedTotalInfo: "Ce montant est prélevé en priorité sur tes revenus à chaque déclaration.",
    editRolloverTitle: "Modifier le rollover",
    editRolloverBody: "Mets à jour la prochaine date et la fréquence de rollover.",
    nextRolloverDate: "Prochaine date",
    rolloverFrequency: "Fréquence de rollover",
    chooseFrequency: "Choisir une fréquence",
    everyDays: (days: number) => `Chaque ${days} jours`,
    save: "Enregistrer",
    percentSelectionRequired: "Active au moins une enveloppe en % avant de continuer.",
  },
  en: {
    unknownError: "Unknown error",
    invalidRolloverDate: "Invalid rollover date.",
    autoUpdated: "Auto updated",
    autoEnabled: "Automatic distribution enabled.",
    autoDisabled: "Automatic distribution disabled.",
    error: "Error",
    unableToSave: "Unable to save.",
    configSaved: "Configuration saved",
    configSavedDesc: (name: string) => `Config "${name}" saved.`,
    nameRequired: "Name required",
    addName: "Add a name to save this configuration.",
    distributionApplied: "Distribution applied",
    incomeLabel: (amount: number) => `Income ${amount.toFixed(2)}`,
    availableCash: "Available cash",
    unableToApply: "Unable to apply.",
    incomeRequired: "Income required",
    fillIncome: "Enter an income amount to simulate.",
    noPercentRows: "No % rows",
    noPercentRowsDesc: "Enable at least one % rule to distribute.",
    fixedSelectionTitle: "Fixed envelope selection",
    fixedSelectionSubtitle: "Choose the envelopes that should get a fixed amount each period.",
    fixedAmountsTitle: "Fixed amounts",
    fixedAmountsSubtitle: "Enter the fixed amount for each selected envelope.",
    percentTitle: "Remaining split (%)",
    percentSubtitle: "Choose the mode: equal or ranked.",
    simulationTitle: "Simulation",
    simulationSubtitle: "Test an amount to preview the split. Nothing is saved.",
    configNameTitle: "Configuration name",
    configNameSubtitle: "",
    doneTitle: "Done",
    doneSubtitle: "Review the summary, then save to confirm.",
    bravo: (name: string) => (name ? `Nice ${name}!` : "Nice!"),
    equal: "Equal",
    ranked: "Ranked",
    configureDistribution: "Configure distribution",
    currentConfigLabel: "Current configuration",
    step: "Step",
    auto: "Auto",
    totalPercent: "Total %",
    backendNormalizes: "The backend normalizes percentages on execution.",
    loading: "Loading…",
    rolloverReminder: "Rollover reminder",
    rolloverStored: "These rollover settings are already stored in the system.",
    nextDate: "Next date",
    toDefine: "to define",
    editRollover: "Edit rollover",
    fixedEnvelopes: "Fixed envelopes",
    envelopesCount: (count: number) => `${count} envelope(s)`,
    fixed: "Fixed",
    rolloverOn: "Rollover ON",
    rolloverOff: "Rollover OFF",
    noFixedSelected: "No fixed envelopes selected.",
    fixedAmountPerPeriod: "Fixed amount per period",
    amount: "Amount",
    percentAllocation: "Remaining split mode",
    percentAuto: "The selected mode is applied automatically.",
    percentEnvelopes: "Percentage envelopes",
    allFixed: "All envelopes are fixed.",
    priority: (rank: number) => `Priority #${rank}`,
    equalSplit: "Equal split",
    goals: "Goals",
    debt: "Debt",
    flex: "Flex",
    localSimulation: "Local simulation",
    estimateDistribution: "Quickly estimate the split with a given income.",
    optionalIncome: "Income (optional)",
    income: "Income",
    fixedApplied: "Fixed applied",
    remainingAfterFixed: "Remaining after fixed",
    lines: (count: number) => `${count} row(s)`,
    noActiveFixed: "No active fixed rows.",
    percentSplit: "Percentage split",
    noActivePercent: "No active % rows.",
    unallocated: "Unallocated",
    configNameOptional: "Configuration name (optional)",
    ifEmptyAutoName: "If left blank, an automatic name will be created.",
    customName: "Custom name",
    monthlyExample: "Ex: Monthly split",
    editLater: "You can edit this configuration later from the Distribution page.",
    readyBody:
      "This summary covers only non-fixed envelopes for this step. Fixed commitments configured earlier remain active.",
    envelopes: "Non-fixed envelopes",
    totalFixed: "Fixed in this step",
    scopeHint: "This step only controls the remaining amount after existing fixed commitments.",
    rollover: "Rollover",
    quickTips: "Quick tips",
    tip1: "Run a simulation to check the remainder matches your real budget.",
    tip2: "You can edit this configuration later in Distribution.",
    tip3: "If you adjust envelopes, rerun a simulation to validate.",
    fixedCountSummary: (fixedCount: number, percentCount: number) =>
      `Fixed: ${fixedCount} · %: ${percentCount}`,
    percentModeSummary: (mode: string) => `% mode: ${mode}`,
    rebalanceTitle: "Debt/Goals/Flex rebalance",
    rebalanceDebtGoalsBoundary: "Debt/goals boundary",
    rebalanceGoalsFlexBoundary: "Goals/flex boundary",
    rebalanceAutoHint:
      "Rebalance is applied automatically as soon as you change the thresholds.",
    flexAmountToDistribute: "Flexible amount to distribute",
    flexAmountHint:
      "This amount updates automatically and stays synced with the debt/goals slider above.",
    onboardingPercentEnvelopesTitle: "Flexible envelopes targeted by distribution",
    onboardingNoStandaloneFlexible:
      "No standalone flexible envelopes are available for this setup.",
    saveAndContinue: "Save and continue",
    toSimulation: "To simulation",
    toSummary: "To summary",
    reviewSimulation: "Review simulation",
    editSettings: "Edit settings",
    cancel: "Close without saving",
    back: "Previous step",
    next: "Next",
    finish: "Finish",
    fixedTotalInfo: "This amount is taken first from each declared income.",
    editRolloverTitle: "Edit rollover",
    editRolloverBody: "Update the next date and rollover frequency.",
    nextRolloverDate: "Next date",
    rolloverFrequency: "Rollover frequency",
    chooseFrequency: "Choose frequency",
    everyDays: (days: number) => `Every ${days} days`,
    save: "Save",
    percentSelectionRequired: "Enable at least one percentage envelope before continuing.",
  },
  ar: {
    unknownError: "وقع مشكل غير معروف",
    invalidRolloverDate: "تاريخ الترحيل ما صالحش.",
    autoUpdated: "تبدل الأوتوماتيك",
    autoEnabled: "تفعّل التوزيع الأوتوماتيكي.",
    autoDisabled: "تطفى التوزيع الأوتوماتيكي.",
    error: "مشكلة",
    unableToSave: "ما قدرناش نحفظو.",
    configSaved: "تحفظ الكونفيك",
    configSavedDesc: (name: string) => `تحفظ الكونفيك "${name}".`,
    nameRequired: "الاسم ضروري",
    addName: "زيد اسم باش يتحفظ هاد الكونفيك.",
    distributionApplied: "تطبق التوزيع",
    incomeLabel: (amount: number) => `الدخل ${amount.toFixed(2)}`,
    availableCash: "لكاش المتوفر",
    unableToApply: "ما قدرناش نطبقوه.",
    incomeRequired: "الدخل ضروري",
    fillIncome: "دخل مبلغ الدخل باش نديرو simulation.",
    noPercentRows: "ما كايناش سطور %",
    noPercentRowsDesc: "فعّل على الأقل قاعدة وحدة بالنسبة المئوية.",
    fixedSelectionTitle: "اختيار الثوابت",
    fixedSelectionSubtitle: "اختار الأظرفة اللي خاصهم مبلغ ثابت فكل فترة.",
    fixedAmountsTitle: "المبالغ الثابتة",
    fixedAmountsSubtitle: "دخل المبلغ الثابت لكل ظرف مختار.",
    percentTitle: "توزيع الباقي (%)",
    percentSubtitle: "اختار المود: بالتساوي ولا بالترتيب.",
    simulationTitle: "المحاكاة",
    simulationSubtitle: "جرّب مبلغ وشوف كيفاش غادي يتقسم. والو ما كيتسجل.",
    configNameTitle: "اسم الكونفيك",
    configNameSubtitle: "",
    doneTitle: "واخا",
    doneSubtitle: "راجع الملخص ومن بعد حفظ باش يتأكد الإعداد.",
    bravo: (name: string) => (name ? `برافو ${name}!` : "برافو!"),
    equal: "بالتساوي",
    ranked: "بالترتيب",
    configureDistribution: "إعداد التوزيع",
    currentConfigLabel: "الكونفيك الحالية",
    step: "الخطوة",
    auto: "أوتو",
    totalPercent: "المجموع %",
    backendNormalizes: "الباك كينورماليزي النسب منين كيتطبق التوزيع.",
    loading: "كيتحمّل…",
    rolloverReminder: "تذكير الترحيل",
    rolloverStored: "هاد الإعدادات ديال الترحيل راه متسجلين دابا.",
    nextDate: "التاريخ الجاي",
    toDefine: "خصو يتحدد",
    editRollover: "بدّل الترحيل",
    fixedEnvelopes: "الأظرفة الثابتة",
    envelopesCount: (count: number) => `${count} ظرف`,
    fixed: "ثابت",
    rolloverOn: "الترحيل شعال",
    rolloverOff: "الترحيل طافي",
    noFixedSelected: "ما تختار حتى ظرف ثابت.",
    fixedAmountPerPeriod: "مبلغ ثابت فكل فترة",
    amount: "المبلغ",
    percentAllocation: "طريقة توزيع الباقي",
    percentAuto: "المود اللي مختار هو اللي كيتطبق.",
    percentEnvelopes: "الأظرفة الموزعة بالنسبة",
    allFixed: "كاع الأظرفة ثابتين.",
    priority: (rank: number) => `الأولوية #${rank}`,
    equalSplit: "حصة متساوية",
    goals: "الأهداف",
    debt: "الديون",
    flex: "المرونة",
    localSimulation: "محاكاة محلية",
    estimateDistribution: "قدّر بسرعة التوزيع بدخل معين.",
    optionalIncome: "الدخل (اختياري)",
    income: "الدخل",
    fixedApplied: "الثوابت اللي تطبقو",
    remainingAfterFixed: "الباقي من بعد الثوابت",
    lines: (count: number) => `${count} سطر`,
    noActiveFixed: "ما كاين حتى ثابت مفعّل.",
    percentSplit: "التقسيم %",
    noActivePercent: "ما كاين حتى % مفعّل.",
    unallocated: "ما توزعش",
    configNameOptional: "اسم الكونفيك (اختياري)",
    ifEmptyAutoName: "إلا خليتيه خاوي غادي يتصاوب اسم أوتوماتيكي.",
    customName: "اسم مخصص",
    monthlyExample: "مثال: توزيع شهري",
    editLater: "تقدر تبدل هاد الكونفيك من بعد فصفحة التوزيع.",
    readyBody:
      "هاد الملخص كيهضر غير على الأظرفة غير الثابتة ديال هاد المرحلة. الثوابت اللي تضبطات قبل باقيين خدامين.",
    envelopes: "الأظرفة غير الثابتة",
    totalFixed: "ثوابت هاد المرحلة",
    scopeHint: "فهاد المرحلة كنضبطو غير الباقي من بعد الالتزامات الثابتة اللي متسجلين من قبل.",
    rollover: "الترحيل",
    quickTips: "نصائح سريعة",
    tip1: "دير simulation باش تشوف واش الباقي موافق للميزانية ديالك.",
    tip2: "تقدر تبدل هاد الكونفيك من بعد فالتوزيع.",
    tip3: "إلا بدّلتي الأظرفة، عاود simulation باش تتأكد.",
    fixedCountSummary: (fixedCount: number, percentCount: number) =>
      `الثابت: ${fixedCount} · النسبة: ${percentCount}`,
    percentModeSummary: (mode: string) => `مود %: ${mode}`,
    rebalanceTitle: "توازن الديون/الأهداف/المرونة",
    rebalanceDebtGoalsBoundary: "الحد بين الديون والأهداف",
    rebalanceGoalsFlexBoundary: "الحد بين الأهداف والمرونة",
    rebalanceAutoHint: "التوازن كيتطبق أوتوماتيكياً مباشرة منين كتبدل الحدود.",
    flexAmountToDistribute: "مبلغ المرونة اللي غادي يتوزع",
    flexAmountHint:
      "هاد المبلغ كيتبدل أوتوماتيكياً وكيبقى متزامن مع رݣلة الديون/الأهداف/المرونة لفوق.",
    onboardingPercentEnvelopesTitle: "الأظرفة المرنة اللي غادي يطبّق عليهم التوزيع",
    onboardingNoStandaloneFlexible: "ما لقيناش حتى ظرف مرن مستقل لهاد الإعداد.",
    saveAndContinue: "حفظ وكمّل",
    toSimulation: "مشي للمحاكاة",
    toSummary: "مشي للملخص",
    reviewSimulation: "راجع المحاكاة",
    editSettings: "بدّل الإعدادات",
    cancel: "سد بلا حفظ",
    back: "الخطوة اللي قبل",
    next: "التالي",
    finish: "سالي",
    fixedTotalInfo: "هاد المبلغ كيتقتطع بالأولوية من أي دخل كتصّرح به.",
    editRolloverTitle: "بدّل الترحيل",
    editRolloverBody: "بدّل التاريخ الجاي والتردد ديال الترحيل.",
    nextRolloverDate: "التاريخ الجاي",
    rolloverFrequency: "تردد الترحيل",
    chooseFrequency: "اختار التردد",
    everyDays: (days: number) => `كل ${days} أيام`,
    save: "حفظ",
    percentSelectionRequired: "فعّل على الأقل ظرف واحد بالنسبة المئوية قبل ما تكمل.",
  },
} as const;

const parseNumber = (value?: string) => {
  if (!value) return 0;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number) => value.toFixed(2);

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const normalizePercentInput = (value: string) => {
  const cleaned = value.replace(",", ".");
  if (cleaned.trim() === "") return "";
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return "";
  return clampPercent(parsed).toString();
};

const normalizeFixedInput = (value: string) => {
  const cleaned = value.replace(",", ".");
  if (cleaned.trim() === "") return "";
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return "";
  return Math.max(0, parsed).toString();
};

const normalizeDistributionNameKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const distributionNameEquivalentKey = (value: string) => {
  const normalized = normalizeDistributionNameKey(value);
  if (!normalized) return "";
  const aliases: Record<string, string> = {
    nourriture: "food",
    courses: "food",
    food: "food",
    "الماكلة": "food",
    sante: "health",
    santé: "health",
    pharmacie: "health",
    health: "health",
    "الصحة": "health",
    charges: "housing_charges",
    "housing charges": "housing_charges",
    "مصاريف السكن": "housing_charges",
    factures: "bills",
    bills: "bills",
    "لفواتير": "bills",
    "الفواتير": "bills",
    "لفواتير الثابتة": "bills",
    "الفواتير الثابتة": "bills",
    "famille aide": "family_aid",
    "aide famille": "family_aid",
    "famille — aide": "family_aid",
    "famille - aide": "family_aid",
    "مساعدة العائلة": "family_aid",
    loyer: "rent",
    rent: "rent",
    "الكراء": "rent",
    "الدار": "maison",
    "صيانة الدار": "entretien_maison",
    "entretien maison": "entretien_maison",
    "entretien_maison": "entretien_maison",
    "transport public": "public_transport",
    "public transport": "public_transport",
    "النقل العمومي": "public_transport",
    "taxi vtc": "taxi_private",
    "taxi indrive": "taxi_private",
    "تاكسي نقل خاص": "taxi_private",
    "طاكسي اندرايف": "taxi_private",
    "imprevus طوارئ": "emergency_buffer",
    imprevus: "emergency_buffer",
    imprevu: "emergency_buffer",
    urgences: "emergency_buffer",
    urgence: "emergency_buffer",
    emergency: "emergency_buffer",
    emergencies: "emergency_buffer",
    "الطوارئ": "emergency_buffer",
    "طوارئ": "emergency_buffer",
    equilibre: "balance_buffer",
    balance: "balance_buffer",
    "التوازن": "balance_buffer",
    loisirs: "entertainment",
    entertainment: "entertainment",
    "الترفيه": "entertainment",
    restaurants: "restaurants",
    restaurant: "restaurants",
    "المطاعم": "restaurants",
    "مطاعم": "restaurants",
    shopping: "shopping",
    shoping: "shopping",
    "الشوبينغ": "shopping",
    "التسوق": "shopping",
    "المرونة": "flexibility",
    flexibilite: "flexibility",
    flexibility: "flexibility",
    flex: "flexibility",
  };
  return aliases[normalized] ?? normalized;
};

const UUID_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeForMatch = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const AUTO_NAME_KEYWORDS = {
  safety: [
    "imprevus",
    "epargne",
    "securite",
    "tawar",
    "طوار",
    "التوازن",
  ],
  debts: ["dette", "dettes", "credit", "قرض", "الديون"],
  goals: ["objectif", "goal", "objectif principal", "الهدف", "الأهداف"],
};

function buildAutomaticConfigName(
  rows: DistributionRow[],
  mode: "equal" | "ranked",
  now: Date,
  locale: FloussyLocale
): string {
  const enabledRows = rows.filter((row) => row.enabled && row.mode !== "none");
  const scores = { safety: 0, debts: 0, goals: 0 };

  enabledRows.forEach((row) => {
    const name = normalizeForMatch(row.name);
    const weight =
      isFixedMode(row.mode)
        ? Math.max(1, parseNumber(row.fixedAmount))
        : Math.max(1, parseNumber(row.percent));
    if (AUTO_NAME_KEYWORDS.safety.some((keyword) => name.includes(keyword))) {
      scores.safety += weight;
    }
    if (AUTO_NAME_KEYWORDS.debts.some((keyword) => name.includes(keyword))) {
      scores.debts += weight;
    }
    if (AUTO_NAME_KEYWORDS.goals.some((keyword) => name.includes(keyword))) {
      scores.goals += weight;
    }
  });

  const orientationKey =
    scores.debts > scores.goals && scores.debts > scores.safety
      ? "debts"
      : scores.goals > scores.safety
      ? "goals"
      : scores.safety > 0
      ? "safety"
      : "balanced";

  const orientationLabels: Record<
    FloussyLocale,
    Record<"safety" | "debts" | "goals" | "balanced", string>
  > = {
    fr: {
      safety: "Sécurité",
      debts: "Dettes",
      goals: "Objectifs",
      balanced: "Équilibré",
    },
    en: {
      safety: "Safety",
      debts: "Debts",
      goals: "Goals",
      balanced: "Balanced",
    },
    ar: {
      safety: "الأمان",
      debts: "الديون",
      goals: "الأهداف",
      balanced: "متوازن",
    },
  };

  const modeLabels: Record<FloussyLocale, Record<"equal" | "ranked", string>> = {
    fr: { equal: "Égal", ranked: "Classé" },
    en: { equal: "Equal", ranked: "Ranked" },
    ar: { equal: "متساوي", ranked: "مُرتّب" },
  };

  const localeTag = LOCALE_TO_BCP47[locale] ?? "fr-FR";
  const dateLabel = now.toLocaleDateString(localeTag, {
    day: "2-digit",
    month: "short",
  });

  return `${orientationLabels[locale][orientationKey]} · ${modeLabels[locale][mode]} · ${dateLabel}`;
}

const AR_NAME_MAP: Record<string, string> = {
  Nourriture: "الماكلة",
  Santé: "الصحة",
  Charges: "مصاريف السكن",
  Factures: "لفواتير",
  "Entretien maison": "صيانة الدار",
  Maison: "الدار",
  "Famille — Aide": "مساعدة العائلة",
  "Famille - Aide": "مساعدة العائلة",
  Loisirs: "الترفيه",
  Restaurants: "المطاعم",
  Shopping: "التسوق",
  Loyer: "الكراء",
  Carburant: "الوقود",
  "Assurance auto": "تأمين السيارة",
  "Entretien auto": "صيانة السيارة",
  "Imprévus / طوارئ": "الطوارئ",
  "Imprevus / طوارئ": "الطوارئ",
  "Imprévus": "الطوارئ",
  "Imprevus": "الطوارئ",
};

const simulateDistribution = (
  rows: DistributionRow[],
  income: number,
  baselineFixedItemsInput: Array<{ name: string; amount: number }> = []
): SimulationPreview => {
  const activeRows = rows.filter((row) => row.enabled && row.mode !== "none");
  const fixedRows = activeRows
    .filter((row) => isFixedMode(row.mode))
    .sort(
      (left, right) =>
        (left.rank ?? 9999) - (right.rank ?? 9999)
    );
  const percentRows = activeRows
    .filter((row) => isPercentMode(row.mode))
    .sort(
      (left, right) =>
        (left.rank ?? 9999) - (right.rank ?? 9999)
    );

  let remaining = income;
  const fixedItems: SimulationItem[] = [];
  const normalizeName = (value: string) => value.trim().toLowerCase();
  const fixedNameSet = new Set(fixedRows.map((row) => normalizeName(row.name)));
  const baselineFixedItems = baselineFixedItemsInput
    .filter((item) => item.amount > 0 && !fixedNameSet.has(normalizeName(item.name)));

  baselineFixedItems.forEach((item) => {
    if (remaining <= 0) {
      fixedItems.push({ name: item.name, amount: 0 });
      return;
    }
    const applied = Math.min(Math.max(0, item.amount), remaining);
    remaining -= applied;
    fixedItems.push({ name: item.name, amount: applied });
  });

  fixedRows.forEach((row) => {
    if (remaining <= 0) {
      fixedItems.push({ name: row.name, amount: 0 });
      return;
    }
    const amount = Math.max(0, parseNumber(row.fixedAmount));
    const applied = Math.min(amount, remaining);
    remaining -= applied;
    fixedItems.push({ name: row.name, amount: applied });
  });

  const remainderAfterFixed = Math.max(0, remaining);
  const totalPercent = percentRows.reduce(
    (sum, row) => sum + Math.max(0, parseNumber(row.percent)),
    0
  );

  const percentItems: SimulationItem[] = [];
  let remainderAfterPercent = remainderAfterFixed;

  if (remainderAfterFixed > 0 && totalPercent > 0 && percentRows.length > 0) {
    const percentPool =
      totalPercent > 100
        ? remainderAfterFixed
        : (remainderAfterFixed * totalPercent) / 100;
    let allocated = 0;
    percentRows.forEach((row, index) => {
      if (index === percentRows.length - 1) {
        const lastAmount = Math.max(0, percentPool - allocated);
        const roundedLast = Number(lastAmount.toFixed(2));
        percentItems.push({ name: row.name, amount: roundedLast });
        allocated += roundedLast;
        return;
      }
      const rawAmount =
        percentPool * (Math.max(0, parseNumber(row.percent)) / totalPercent);
      const rounded = Number(rawAmount.toFixed(2));
      allocated += rounded;
      percentItems.push({ name: row.name, amount: rounded });
    });
    remainderAfterPercent = Math.max(0, remainderAfterFixed - allocated);
  }

  return {
    income,
    fixedItems,
    percentItems,
    totalFixedApplied: income - remainderAfterFixed,
    remainderAfterFixed,
    remainderAfterPercent,
    totalPercent: Number(totalPercent.toFixed(2)),
  };
};

const areSimulationItemsEqual = (left: SimulationItem[], right: SimulationItem[]) => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].name !== right[index].name) return false;
    if (left[index].amount !== right[index].amount) return false;
  }
  return true;
};

const areSimulationPreviewsEqual = (
  previous: SimulationPreview | null,
  next: SimulationPreview
) => {
  if (!previous) return false;
  return (
    previous.income === next.income &&
    previous.totalFixedApplied === next.totalFixedApplied &&
    previous.remainderAfterFixed === next.remainderAfterFixed &&
    previous.remainderAfterPercent === next.remainderAfterPercent &&
    previous.totalPercent === next.totalPercent &&
    areSimulationItemsEqual(previous.fixedItems, next.fixedItems) &&
    areSimulationItemsEqual(previous.percentItems, next.percentItems)
  );
};

const isDebtLikeEnvelopeName = (name: string) => {
  const normalized = distributionNameEquivalentKey(name);
  return (
    normalized.includes("debt") ||
    normalized.includes("debts") ||
    normalized.includes("dette") ||
    normalized.includes("dettes") ||
    normalized.includes("credit") ||
    normalized.includes("repayment") ||
    normalized.includes("loan") ||
    normalized.includes("قرض") ||
    normalized.includes("دين") ||
    normalized.includes("ديون")
  );
};

const isGoalLikeEnvelopeName = (name: string) => {
  const normalized = distributionNameEquivalentKey(name);
  return (
    normalized.includes("objectif") ||
    normalized.includes("goal") ||
    normalized.includes("goals") ||
    normalized.includes("target") ||
    normalized.includes("hadaf") ||
    normalized.includes("هدف")
  );
};

export function DistributionConfigDialog({
  open,
  onOpenChange,
  initialConfig = null,
  onSaveNamedConfig,
  onSetActiveConfig,
  onComplete,
  includeGoals = true,
  allowedEnvelopeNames,
  fixedSelectionExcludedNames,
  skipExistingFixedPreselection = false,
  hideFixedSelectionStep = false,
  baselineFixedSimulationItems = EMPTY_BASELINE_FIXED_SIMULATION_ITEMS,
  simulationBaseAmount = null,
  showRolloverControls = true,
  dynamicPoolAmount = undefined,
  rebalanceConfig = null,
  onApplyRebalance,
}: DistributionConfigDialogProps) {
  const { toast } = useToast();
  // Keep SSR and first client render identical to avoid hydration mismatch.
  // Then sync to browser preference after mount.
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [rows, setRows] = useState<DistributionRow[]>([]);
  const [envelopeMeta, setEnvelopeMeta] = useState<EnvelopeOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomeInput, setIncomeInput] = useState("");
  const [simulation, setSimulation] = useState<SimulationPreview | null>(null);
  const onboardingSetupOnlyMode = hideFixedSelectionStep;
  const [wizardStep, setWizardStep] = useState<WizardStep>(
    onboardingSetupOnlyMode ? 3 : 1
  );
  const [autoPercentMode, setAutoPercentMode] = useState<"equal" | "ranked">(
    "ranked"
  );
  const autoPercentSignatureRef = useRef<string>("");
  const loadSignatureRef = useRef<string>("");
  const fixedSelectionInitRef = useRef(false);
  const [fixedEnvelopeIds, setFixedEnvelopeIds] = useState<string[]>([]);
  const [rolloverNextLabel, setRolloverNextLabel] = useState("");
  const [rolloverSettingsOpen, setRolloverSettingsOpen] = useState(false);
  const [rolloverDateInput, setRolloverDateInput] = useState("");
  const [rolloverFrequencyInput, setRolloverFrequencyInput] = useState("");
  const [rolloverSettingsError, setRolloverSettingsError] = useState<string | null>(
    null
  );
  const [userName, setUserName] = useState("");
  const [rebalanceCut1Pct, setRebalanceCut1Pct] = useState(34);
  const [rebalanceCut2Pct, setRebalanceCut2Pct] = useState(67);
  const rebalanceAutoApplySignatureRef = useRef<string>("");
  const rebalanceCutsInitializedForOpenRef = useRef(false);
  const rebalanceAutoApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rebalanceDraggingRef = useRef(false);
  const copy = DISTRIBUTION_DIALOG_COPY[locale];
  const pageDir = getLocaleDirection(locale);
  const onboardingSimulationBaseAmount = onboardingSetupOnlyMode
    ? Math.max(0, Number(simulationBaseAmount ?? 0) || 0)
    : 0;
  const simulationInputLabel = onboardingSetupOnlyMode
    ? locale === "ar"
      ? "مبلغ التوزيع"
      : locale === "fr"
      ? "Montant à distribuer"
      : "Amount to distribute"
    : copy.income;
  const simulationSubtitle = onboardingSetupOnlyMode
    ? locale === "ar"
      ? "فكل شهر، نفس المبلغ اللي كيبقى فظرف المرونة هو اللي كيتقسم على هاد الأظرفة المرنة حسب التوزيع اللي اخترتي."
      : locale === "fr"
      ? "Chaque mois, le montant restant dans l’enveloppe flex est celui qui sera réparti sur ces enveloppes selon la règle choisie."
      : "Test the real amount that will enter distribution and see how it will be split. Nothing is saved."
    : copy.estimateDistribution;
  const simulationPlaceholder = onboardingSetupOnlyMode
    ? locale === "ar"
      ? "مبلغ التوزيع"
      : locale === "fr"
      ? "Montant à distribuer"
      : "Amount to distribute"
    : copy.optionalIncome;
  const simulationRequiredTitle = onboardingSetupOnlyMode
    ? locale === "ar"
      ? "مبلغ التوزيع ضروري"
      : locale === "fr"
      ? "Montant à distribuer requis"
      : "Amount to distribute required"
    : copy.incomeRequired;
  const simulationRequiredDescription = onboardingSetupOnlyMode
    ? locale === "ar"
      ? "هاد المحاكاة كتخدم بالمبلغ الثابت ديال هاد المرحلة."
      : locale === "fr"
      ? "Cette simulation utilise le montant fixe de cette étape."
      : "Enter the real amount you want to test in this distribution."
    : copy.fillIncome;

  const isViewingPreset = Boolean(initialConfig);

  const envelopeRows = useMemo(
    () =>
      rows
        .filter((row) => row.targetType === "envelope")
        .sort((left, right) => left.rank - right.rank),
    [rows]
  );
  const fixedEnvelopeSet = useMemo(
    () => new Set(onboardingSetupOnlyMode ? [] : fixedEnvelopeIds),
    [onboardingSetupOnlyMode, fixedEnvelopeIds]
  );
  const normalizedFixedExcludedSet = useMemo(
    () =>
      new Set(
        (fixedSelectionExcludedNames ?? [])
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean)
      ),
    [fixedSelectionExcludedNames]
  );
  const selectableFixedEnvelopeRows = useMemo(
    () =>
      envelopeRows.filter((row) =>
        normalizedFixedExcludedSet.size > 0
          ? !normalizedFixedExcludedSet.has(row.name.trim().toLowerCase())
          : true
      ),
    [envelopeRows, normalizedFixedExcludedSet]
  );
  const fixedEnvelopeRows = useMemo(
    () =>
      onboardingSetupOnlyMode
        ? []
        : selectableFixedEnvelopeRows.filter((row) => fixedEnvelopeSet.has(row.targetId)),
    [onboardingSetupOnlyMode, selectableFixedEnvelopeRows, fixedEnvelopeSet]
  );
  const percentEnvelopeRows = useMemo(
    () =>
      onboardingSetupOnlyMode
        ? envelopeRows.filter(
            (row) =>
              row.enabled &&
              isPercentMode(row.mode) &&
              !isDebtLikeEnvelopeName(row.name)
          )
        : envelopeRows.filter((row) => !fixedEnvelopeSet.has(row.targetId)),
    [onboardingSetupOnlyMode, envelopeRows, fixedEnvelopeSet]
  );
  const goalRows = useMemo(
    () =>
      rows
        .filter((row) => row.targetType === "goal")
        .sort((left, right) => left.rank - right.rank),
    [rows]
  );

  const isHiddenDebtLikeOnboardingRow = useCallback(
    (row: DistributionRow) =>
      onboardingSetupOnlyMode &&
      row.targetType === "envelope" &&
      isDebtLikeEnvelopeName(row.name),
    [onboardingSetupOnlyMode]
  );

  const percentTotal = useMemo(() => {
    return rows
      .filter(
        (row) =>
          row.enabled &&
          isPercentMode(row.mode) &&
          !isHiddenDebtLikeOnboardingRow(row)
      )
      .reduce((sum, row) => sum + parseNumber(row.percent), 0);
  }, [isHiddenDebtLikeOnboardingRow, rows]);
  const fixedTotal = useMemo(() => {
    return rows
      .filter((row) => row.enabled && isFixedMode(row.mode))
      .reduce((sum, row) => sum + parseNumber(row.fixedAmount), 0);
  }, [rows]);

  const percentLimit = 100.01;
  const percentTone = percentTotal > percentLimit ? "error" : "success";
  const percentWarning = percentTotal > percentLimit;
  const getInitials = (value: string) => {
    const parts = value
      .split(/\s+/)
      .map((part) => part.replace(/[^\p{L}\p{N}]+/gu, ""))
      .filter(Boolean);
    if (parts.length === 0) return "E";
    return parts
      .map((part) => Array.from(part)[0] ?? "")
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };
  const getDisplayEnvelopeName = (name: string) => {
    if (locale !== "ar") return name;
    return AR_NAME_MAP[name] ?? name;
  };

  const rolloverOn = useMemo(
    () => envelopeMeta.filter((env) => env.rollover_enabled),
    [envelopeMeta]
  );
  const rolloverOff = useMemo(
    () => envelopeMeta.filter((env) => !env.rollover_enabled),
    [envelopeMeta]
  );
  const effectiveWizardStep: WizardStep =
    onboardingSetupOnlyMode && wizardStep < 3 ? 3 : wizardStep;

  const wizardMeta =
    onboardingSetupOnlyMode && effectiveWizardStep === 3
      ? {
          title: copy.percentTitle,
          subtitle:
            locale === "ar"
              ? "هاد الإعداد غير كيربط قواعد التوزيع بالأظرفة المرنة لهاد المرحلة، بلا ما نرجعو لاختيار الثوابت."
              : locale === "fr"
              ? "Cette étape relie seulement les règles de distribution aux enveloppes flexibles de cette phase, sans repasser par la sélection des fixes."
              : "This step only links distribution rules to the flexible envelopes in this phase, without going back through fixed-envelope selection.",
        }
      : effectiveWizardStep === 1
      ? {
          title: copy.fixedSelectionTitle,
          subtitle: copy.fixedSelectionSubtitle,
        }
      : effectiveWizardStep === 2
      ? {
          title: copy.fixedAmountsTitle,
          subtitle: copy.fixedAmountsSubtitle,
        }
      : effectiveWizardStep === 3
      ? {
          title: copy.percentTitle,
          subtitle: copy.percentSubtitle,
        }
      : effectiveWizardStep === 4
      ? {
          title: copy.simulationTitle,
          subtitle: simulationSubtitle,
        }
      : {
          title: copy.doneTitle,
          subtitle: copy.doneSubtitle,
        };

  const stepFlow: readonly WizardStep[] = onboardingSetupOnlyMode
    ? [3, 4, 5]
    : [1, 2, 3, 4, 5];
  const displayStepIndex = stepFlow.indexOf(effectiveWizardStep) + 1;
  const displayStepTotal = stepFlow.length;
  const stepTitleByStep: Record<WizardStep, string> = {
    1: copy.fixedSelectionTitle,
    2: copy.fixedAmountsTitle,
    3: copy.percentTitle,
    4: copy.simulationTitle,
    5: copy.doneTitle,
  };
  const stepFlowLabels = stepFlow.map((step) => stepTitleByStep[step]);
  const nextButtonLabel =
    effectiveWizardStep === 3
      ? onboardingSetupOnlyMode
        ? copy.saveAndContinue
        : copy.toSimulation
      : effectiveWizardStep === 4
      ? copy.toSummary
      : copy.next;

  const userGreeting = copy.bravo(userName);
  const percentModeLabel = autoPercentMode === "equal" ? copy.equal : copy.ranked;
  const rebalanceTotalPool = dynamicPoolAmount !== undefined
    ? Math.max(0, dynamicPoolAmount)
    : Math.max(0, Number(rebalanceConfig?.totalPool ?? 0) || 0);
  const rebalanceEnabled = onboardingSetupOnlyMode && rebalanceTotalPool > 0 && Boolean(onApplyRebalance);
  const rebalanceDebtPct = Math.max(0, Math.min(100, rebalanceCut1Pct));
  const rebalanceGoalsPct = Math.max(0, Math.min(100, rebalanceCut2Pct - rebalanceCut1Pct));
  const rebalanceFlexPct = Math.max(0, Math.min(100, 100 - rebalanceCut2Pct));
  const rebalanceDebtAmount = Number(((rebalanceTotalPool * rebalanceDebtPct) / 100).toFixed(2));
  const rebalanceGoalsAmount = Number(((rebalanceTotalPool * rebalanceGoalsPct) / 100).toFixed(2));
  const rebalanceFlexAmount = Number(
    Math.max(0, rebalanceTotalPool - rebalanceDebtAmount - rebalanceGoalsAmount).toFixed(2)
  );
  const rebalanceConfigDebtAmount = Math.max(0, Number(rebalanceConfig?.debtAmount ?? 0) || 0);
  const rebalanceConfigGoalsAmount = Math.max(0, Number(rebalanceConfig?.goalsAmount ?? 0) || 0);
  const rebalanceConfigFlexAmount = Math.max(0, Number(rebalanceConfig?.flexAmount ?? 0) || 0);
  const percentPreviewIncome = useMemo(() => {
    if (onboardingSetupOnlyMode) {
      return rebalanceEnabled ? rebalanceFlexAmount : onboardingSimulationBaseAmount;
    }
    const parsed = parseNumber(incomeInput);
    return parsed > 0 ? parsed : null;
  }, [
    incomeInput,
    onboardingSetupOnlyMode,
    onboardingSimulationBaseAmount,
    rebalanceEnabled,
    rebalanceFlexAmount,
  ]);
  const percentPreviewAmountByRowId = useMemo(() => {
    if (!percentPreviewIncome || percentPreviewIncome <= 0) {
      return new Map<string, number>();
    }
    const baselineItems = onboardingSetupOnlyMode
      ? []
      : baselineFixedSimulationItems.map((item) => ({
          name: item.name,
          amount: Math.max(0, Number(item.amount) || 0),
        }));
    const preview = simulateDistribution(rows, percentPreviewIncome, baselineItems);
    const activePercentRows = rows
      .filter(
        (row) =>
          row.enabled &&
          isPercentMode(row.mode) &&
          !isHiddenDebtLikeOnboardingRow(row)
      )
      .sort((left, right) => (left.rank ?? 9999) - (right.rank ?? 9999));
    const map = new Map<string, number>();
    activePercentRows.forEach((row, index) => {
      map.set(row.id, preview.percentItems[index]?.amount ?? 0);
    });
    return map;
  }, [
    baselineFixedSimulationItems,
    isHiddenDebtLikeOnboardingRow,
    onboardingSetupOnlyMode,
    percentPreviewIncome,
    rows,
  ]);
  const formatMonthYearDuration = (months: number) => {
    const safeMonths = Math.max(0, Math.floor(months));
    const years = Math.floor(safeMonths / 12);
    const remainingMonths = safeMonths % 12;
    if (locale === "ar") {
      if (years > 0 && remainingMonths > 0) return `${years} سنة و ${remainingMonths} شهر`;
      if (years > 0) return `${years} سنة`;
      return `${remainingMonths} شهر`;
    }
    if (locale === "fr") {
      if (years > 0 && remainingMonths > 0) return `${years} an(s) et ${remainingMonths} mois`;
      if (years > 0) return `${years} an(s)`;
      return `${remainingMonths} mois`;
    }
    if (years > 0 && remainingMonths > 0) return `${years} year(s) and ${remainingMonths} month(s)`;
    if (years > 0) return `${years} year(s)`;
    return `${remainingMonths} month(s)`;
  };
  const debtRemainingAmount = Math.max(0, Number(rebalanceConfig?.debtRemainingAmount ?? 0) || 0);
  const debtCurrentMonthly = Math.max(0, Number(rebalanceConfig?.debtCurrentMonthly ?? 0) || 0);
  const debtMonthlyTotal = Number((debtCurrentMonthly + rebalanceDebtAmount).toFixed(2));
  const debtEtaMonths =
    debtRemainingAmount <= 0 ? 0 : debtMonthlyTotal > 0 ? Math.max(1, Math.ceil(debtRemainingAmount / debtMonthlyTotal)) : null;
  const debtEtaLabelPrefix =
    locale === "ar" ? "تسديد الدين" : locale === "fr" ? "تصفية الديون" : "Debt payoff";
  const debtEtaUnknownLabel =
    locale === "ar" ? "غير محدد" : locale === "fr" ? "indisponible" : "unavailable";
  const debtEtaLabel =
    debtEtaMonths === 0
      ? `${debtEtaLabelPrefix}: ${formatMonthYearDuration(0)}`
      : debtEtaMonths === null
      ? `${debtEtaLabelPrefix}: ${debtEtaUnknownLabel}`
      : `${debtEtaLabelPrefix}: ${formatMonthYearDuration(debtEtaMonths)}`;
  const goalRemainingAmount = Math.max(0, Number(rebalanceConfig?.goalRemainingAmount ?? 0) || 0);
  const goalsEtaMonths =
    goalRemainingAmount <= 0 ? 0 : rebalanceGoalsAmount > 0 ? Math.max(1, Math.ceil(goalRemainingAmount / rebalanceGoalsAmount)) : null;
  const goalsEtaLabelPrefix =
    locale === "ar" ? "الوصول للهدف" : locale === "fr" ? "Atteinte objectif" : "Goal ETA";
  const goalsEtaUnknownLabel =
    locale === "ar" ? "غير محدد" : locale === "fr" ? "indisponible" : "unavailable";
  const goalsEtaLabel =
    goalsEtaMonths === 0
      ? `${goalsEtaLabelPrefix}: ${formatMonthYearDuration(0)}`
      : goalsEtaMonths === null
      ? `${goalsEtaLabelPrefix}: ${goalsEtaUnknownLabel}`
      : `${goalsEtaLabelPrefix}: ${formatMonthYearDuration(goalsEtaMonths)}`;
  const flexUiImpact =
    rebalanceFlexPct >= 35
      ? locale === "ar"
        ? "راحة شهرية قوية."
        : locale === "fr"
        ? "Confort mensuel fort."
        : "Strong monthly comfort."
      : rebalanceFlexPct >= 20
      ? locale === "ar"
        ? "راحة شهرية متوازنة."
        : locale === "fr"
        ? "Confort mensuel équilibré."
        : "Balanced monthly comfort."
      : locale === "ar"
      ? "مرونة قليلة."
      : locale === "fr"
      ? "Flexibilité réduite."
      : "Lower flexibility.";

  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  const applySavedConfig = (
    baseRows: DistributionRow[],
    preset: SavedDistributionConfig
  ) => {
    const presetMap = new Map(
      preset.rows.map((row) => [`${row.targetType}:${row.targetId}`, row])
    );
    return baseRows.map((row) => {
      const saved = presetMap.get(`${row.targetType}:${row.targetId}`);
      if (!saved) return row;
      return {
        ...row,
        mode: saved.mode,
        enabled: saved.enabled,
        fixedAmount: saved.fixedAmount ?? "",
        percent: saved.percent ?? "",
        rank: saved.rank ?? row.rank,
      };
    });
  };

  const loadConfig = useCallback(async (preset?: SavedDistributionConfig | null) => {
    setLoading(true);
    setError(null);
    setSimulation(null);
    try {
      const envelopes = await apiFetch<EnvelopeOut[]>("/envelopes");
      const goals = includeGoals
        ? await apiFetch<GoalOut[]>("/goals").catch(() => [])
        : [];
      const rules =
        onboardingSetupOnlyMode && !preset
          ? []
          : await getRules().catch(() => []);
      const settings = await getSettings().catch(() => ({
        auto_distribution_enabled: false,
      }));
      setEnvelopeMeta(envelopes);
      const normalizedAllowedEnvelopeNames =
        allowedEnvelopeNames && allowedEnvelopeNames.length > 0
          ? new Set(
              allowedEnvelopeNames
                .map((name) => distributionNameEquivalentKey(name))
                .filter(Boolean)
            )
          : null;
      const baseEnvelopeRows: DistributionRow[] = envelopes
        .filter((item) => !item.is_cash)
        .filter((item) =>
          normalizedAllowedEnvelopeNames
            ? normalizedAllowedEnvelopeNames.has(distributionNameEquivalentKey(item.name))
            : true
        )
        .map((item, index) => ({
          id: `envelope:${item.id}`,
          targetType: "envelope",
          targetId: item.id,
          name: item.name,
          mode: "none",
          enabled: false,
          fixedAmount: "",
          percent: "",
          rank: index + 1,
        }));
      const baseGoalRows: DistributionRow[] = includeGoals
        ? goals.map((goal, index) => ({
            id: `goal:${goal.id}`,
            targetType: "goal",
            targetId: goal.id,
            name: goal.name,
            mode: "none",
            enabled: false,
            fixedAmount: "",
            percent: "",
            rank: index + 1,
          }))
        : [];
      const mapped = buildRowsFromRules(
        [...baseEnvelopeRows, ...baseGoalRows],
        rules
      );
      const merged = preset ? applySavedConfig(mapped, preset) : mapped;
      const fixedBaselineNameSet = new Set(
        baselineFixedSimulationItems
          .filter((item) => Number(item.amount) > 0)
          .map((item) => distributionNameEquivalentKey(item.name))
          .filter(Boolean)
      );
      const onboardingNormalized = onboardingSetupOnlyMode
        ? merged.map((row) =>
            row.targetType === "envelope"
              ? (() => {
                  const normalizedNameKey = distributionNameEquivalentKey(row.name);
                  const lockedFromMorona =
                    isDebtLikeEnvelopeName(row.name) ||
                    isGoalLikeEnvelopeName(row.name) ||
                    fixedBaselineNameSet.has(normalizedNameKey) ||
                    isFixedMode(row.mode) ||
                    parseNumber(row.fixedAmount) > 0;
                  if (lockedFromMorona) {
                    return {
                      ...row,
                      mode: "none" as const,
                      enabled: false,
                      percent: "",
                    };
                  }
                  return {
                    ...row,
                    mode: "percent" as const,
                    enabled: true,
                    fixedAmount: "",
                  };
                })()
              : row
          )
        : merged;
      // Ranks run as one contiguous sequence across both target types:
      // envelopes keep 1..n (the priority shown in the UI) and goals continue
      // after them. Numbering each section from 1 made ranks collide across
      // target types, which scrambled any consumer that sorts rows by rank.
      const envelopesSorted = onboardingNormalized
        .filter((row) => row.targetType === "envelope")
        .sort((left, right) => left.rank - right.rank)
        .map((row, index) => ({ ...row, rank: index + 1 }));
      const orderedGoals = onboardingNormalized
        .filter((row) => row.targetType === "goal")
        .sort((left, right) => left.rank - right.rank)
        .map((row, index) => ({ ...row, rank: envelopesSorted.length + index + 1 }));
      setRows([...envelopesSorted, ...orderedGoals]);
      setAutoEnabled(preset ? preset.autoEnabled : settings.auto_distribution_enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.unknownError);
    } finally {
      setLoading(false);
    }
  }, [
    allowedEnvelopeNames,
    baselineFixedSimulationItems,
    onboardingSetupOnlyMode,
    includeGoals,
    copy.unknownError,
  ]);

  const computeRolloverNextLabel = useCallback((
    dateValue: string,
    frequencyValue: string
  ) => {
    if (dateValue) {
      const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
        ? new Date(`${dateValue}T00:00:00`)
        : new Date(dateValue);
      return Number.isNaN(parsed.getTime())
        ? dateValue
        : parsed.toLocaleDateString(LOCALE_TO_BCP47[locale]);
    }
    const days = Number(frequencyValue);
    if (!Number.isNaN(days) && days > 0) {
      const next = new Date();
      next.setDate(next.getDate() + days);
      return next.toLocaleDateString(LOCALE_TO_BCP47[locale]);
    }
    return "";
  }, [locale]);

  useEffect(() => {
    if (open) {
      const presetId = initialConfig?.id ?? "draft";
      const allowedSignature =
        allowedEnvelopeNames && allowedEnvelopeNames.length > 0
          ? allowedEnvelopeNames.join("|")
          : "all";
      const loadSignature = `${presetId}|${allowedSignature}|${
        includeGoals ? "1" : "0"
      }|${onboardingSetupOnlyMode ? "1" : "0"}`;
      if (loadSignatureRef.current === loadSignature) return;
      loadSignatureRef.current = loadSignature;
      loadConfig(initialConfig);
      setWizardStep(onboardingSetupOnlyMode ? 3 : 1);
      setAutoPercentMode(initialConfig?.percentMode === "equal" ? "equal" : "ranked");
      autoPercentSignatureRef.current = "";
      fixedSelectionInitRef.current = false;
      if (typeof window !== "undefined") {
        const storedDate = window.localStorage.getItem("floussy_rollover_date") || "";
        const storedFrequency =
          window.localStorage.getItem("floussy_rollover_frequency") || "";
        setRolloverDateInput(storedDate);
        setRolloverFrequencyInput(storedFrequency);
        setRolloverNextLabel(
          computeRolloverNextLabel(storedDate, storedFrequency)
        );
      }
    }
  }, [
    open,
    initialConfig,
    computeRolloverNextLabel,
    onboardingSetupOnlyMode,
    loadConfig,
    allowedEnvelopeNames,
    includeGoals,
  ]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetchMe()
      .then((me) => {
        if (!active) return;
        const fullName = [me.first_name, me.last_name].filter(Boolean).join(" ").trim();
        const fallback = me.email ? me.email.split("@")[0] : "";
        setUserName(fullName || fallback);
      })
      .catch(() => {
        if (active) setUserName("");
      });
    return () => {
      active = false;
    };
  }, [open]);

  const resetDialogState = useCallback(() => {
    setSimulation(null);
    setIncomeInput("");
    setRows([]);
    setEnvelopeMeta([]);
    setError(null);
    setWizardStep(onboardingSetupOnlyMode ? 3 : 1);
    setFixedEnvelopeIds([]);
    fixedSelectionInitRef.current = false;
    setRolloverNextLabel("");
    setRolloverSettingsOpen(false);
    setRolloverDateInput("");
    setRolloverFrequencyInput("");
    setRolloverSettingsError(null);
    setUserName("");
  }, [onboardingSetupOnlyMode]);

  const handleClose = () => {
    onOpenChange(false);
  };

  useEffect(() => {
    if (open) return;
    loadSignatureRef.current = "";
    resetDialogState();
  }, [open, resetDialogState]);

  const handleWizardNext = () => {
    setError(null);
    if (onboardingSetupOnlyMode) {
      if (effectiveWizardStep === 3) {
        const hasEnabledPercentRow = rows.some(
          (row) => row.targetType === "envelope" && isPercentMode(row.mode) && row.enabled
        );
        if (!hasEnabledPercentRow) {
          setError(copy.percentSelectionRequired);
          return;
        }
        if (percentWarning) {
          setError(
            locale === "ar"
              ? `المجموع ديال النسب المئوية ديالك هو ${percentTotal.toFixed(2)}%. عفاك ضبطو ل 100% ولا نقصو باش تكمل.`
              : locale === "fr"
              ? `Le total de vos pourcentages est de ${percentTotal.toFixed(2)}%. Veuillez l'ajuster à 100% ou le réduire pour continuer.`
              : `The total of your percentages is ${percentTotal.toFixed(2)}%. Please adjust it to 100% or reduce it to continue.`
          );
          return;
        }
        setWizardStep(4);
        return;
      }
      if (effectiveWizardStep === 4) {
        setWizardStep(5);
      }
      return;
    }

    if (wizardStep === 1) {
      const fixedSet = new Set(fixedEnvelopeIds);
      setRows((prev) =>
        prev.map((row) => {
          if (row.targetType !== "envelope") return row;
          if (fixedSet.has(row.targetId)) {
            return {
              ...row,
              mode: "fixed",
              enabled: true,
              percent: "",
            };
          }
          return {
            ...row,
            mode: "percent",
            enabled: true,
            fixedAmount: "",
          };
        })
      );
      setWizardStep(fixedSet.size === 0 ? 3 : 2);
      return;
    }
    if (wizardStep === 2) {
      setWizardStep(3);
      return;
    }
    if (wizardStep === 3) {
      const hasEnabledPercentRow = rows.some(
        (row) => row.targetType === "envelope" && isPercentMode(row.mode) && row.enabled
      );
      if (!hasEnabledPercentRow) {
        setError(copy.percentSelectionRequired);
        return;
      }
      if (percentWarning) {
        setError(
          locale === "ar"
            ? `المجموع ديال النسب المئوية ديالك هو ${percentTotal.toFixed(2)}%. عفاك ضبطو ل 100% ولا نقصو باش تكمل.`
            : locale === "fr"
            ? `Le total de vos pourcentages est de ${percentTotal.toFixed(2)}%. Veuillez l'ajuster à 100% ou le réduire pour continuer.`
            : `The total of your percentages is ${percentTotal.toFixed(2)}%. Please adjust it to 100% or reduce it to continue.`
        );
        return;
      }
      setWizardStep(4);
      return;
    }
    if (wizardStep === 4) {
      setWizardStep(5);
    }
  };

  const handleWizardBack = () => {
    if (onboardingSetupOnlyMode) {
      setWizardStep((prev) => {
        if (prev <= 3) return 3;
        return (prev - 1) as 3 | 4 | 5;
      });
      return;
    }

    setWizardStep((prev) => {
      if (prev === 1) return 1;
      if (prev === 3 && fixedEnvelopeIds.length === 0) return 1;
      return (prev - 1) as 1 | 2 | 3 | 4 | 5;
    });
  };

  const handleSaveRolloverSettings = () => {
    if (rolloverDateInput) {
      const parsed = /^\d{4}-\d{2}-\d{2}$/.test(rolloverDateInput)
        ? new Date(`${rolloverDateInput}T00:00:00`)
        : new Date(rolloverDateInput);
      if (Number.isNaN(parsed.getTime())) {
        setRolloverSettingsError(copy.invalidRolloverDate);
        return;
      }
    }
    if (typeof window !== "undefined") {
      if (rolloverDateInput) {
        window.localStorage.setItem("floussy_rollover_date", rolloverDateInput);
      } else {
        window.localStorage.removeItem("floussy_rollover_date");
      }
      if (rolloverFrequencyInput) {
        window.localStorage.setItem(
          "floussy_rollover_frequency",
          rolloverFrequencyInput
        );
      } else {
        window.localStorage.removeItem("floussy_rollover_frequency");
      }
    }
    setRolloverNextLabel(
      computeRolloverNextLabel(rolloverDateInput, rolloverFrequencyInput)
    );
    setRolloverSettingsError(null);
    setRolloverSettingsOpen(false);
  };

  const updateRow = (
    targetType: DistributionRow["targetType"],
    targetId: string,
    updates: Partial<DistributionRow>
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.targetType === targetType && row.targetId === targetId
          ? { ...row, ...updates }
          : row
      )
    );
  };

  const handleModeChange = (row: DistributionRow, mode: DistributionRow["mode"]) => {
    if (mode === "none") {
      updateRow(row.targetType, row.targetId, { mode, enabled: false });
      return;
    }
    updateRow(row.targetType, row.targetId, { mode, enabled: true });
  };

  const handleAutoToggle = async (nextValue: boolean) => {
    setAutoEnabled(nextValue);
    setAutoSaving(true);
    try {
      await patchSettings({ auto_distribution_enabled: nextValue });
      toast({
        title: copy.autoUpdated,
        description: nextValue
          ? copy.autoEnabled
          : copy.autoDisabled,
        variant: "success",
      });
    } catch (err) {
      setAutoEnabled((prev) => !prev);
      toast({
        title: copy.error,
        description: err instanceof Error ? err.message : copy.unableToSave,
        variant: "danger",
      });
    } finally {
      setAutoSaving(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    if (percentWarning) {
      toast({
        title: copy.error,
        description:
          locale === "ar"
            ? `المجموع ديال النسب المئوية ديالك هو ${percentTotal.toFixed(2)}%. عفاك ضبطو ل 100% ولا نقصو باش تكمل.`
            : locale === "fr"
            ? `Le total de vos pourcentages est de ${percentTotal.toFixed(2)}%. Veuillez l'ajuster à 100% ou le réduire pour continuer.`
            : `The total of your percentages is ${percentTotal.toFixed(2)}%. Please adjust it to 100% or reduce it to continue.`,
        variant: "danger",
      });
      return;
    }
    const now = new Date();
    const name = buildAutomaticConfigName(rows, autoPercentMode, now, locale);
    const persistedId =
      typeof initialConfig?.id === "string" && UUID_LIKE_PATTERN.test(initialConfig.id)
        ? initialConfig.id
        : "";
    const payload: SavedDistributionConfig = {
      id: persistedId || (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `draft-${Date.now()}`),
      name,
      autoEnabled,
      percentMode: autoPercentMode,
      rows,
      scopeHash: initialConfig?.scopeHash ?? null,
      createdAt: initialConfig?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };

    setSaving(true);
    try {
      if (onSaveNamedConfig) {
        const savedId = await onSaveNamedConfig(payload);
        if (typeof savedId === "string" && savedId.length > 0) {
          onSetActiveConfig?.(savedId);
        }
      } else {
        await upsertRules(rows);
        onSetActiveConfig?.(payload.id);
      }
      onComplete?.();
      toast({
        title: copy.configSaved,
        description: copy.configSavedDesc(name),
        variant: "success",
      });
      handleClose();
    } catch (err) {
      toast({
        title: copy.error,
        description: err instanceof Error ? err.message : copy.unableToSave,
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSimulate = useCallback((silent = false) => {
    const income = onboardingSetupOnlyMode
      ? onboardingSimulationBaseAmount
      : parseNumber(incomeInput);
    if (income <= 0) {
      if (!silent) {
        toast({
          title: simulationRequiredTitle,
          description: simulationRequiredDescription,
          variant: "danger",
        });
      }
      setSimulation(null);
      return;
    }
    const rowsBaselineFixedItems = onboardingSetupOnlyMode
      ? []
      : baselineFixedSimulationItems.map((item) => ({
          name: item.name,
          amount: Math.max(0, Number(item.amount) || 0),
        }));
    const nextSimulation = simulateDistribution(rows, income, rowsBaselineFixedItems);
    setSimulation((previous) =>
      areSimulationPreviewsEqual(previous, nextSimulation) ? previous : nextSimulation
    );
  }, [
    baselineFixedSimulationItems,
    incomeInput,
    onboardingSimulationBaseAmount,
    onboardingSetupOnlyMode,
    rows,
    simulationRequiredDescription,
    simulationRequiredTitle,
    toast,
  ]);

  useEffect(() => {
    if (effectiveWizardStep !== 3) return;
    const percentRows = rows.filter(
      (row) =>
        row.enabled &&
        isPercentMode(row.mode) &&
        !isHiddenDebtLikeOnboardingRow(row)
    );
    const percentSignature = percentRows
      .map((row) => `${row.id}:${row.rank}:${row.mode}:${row.enabled}`)
      .sort()
      .join("|");
    const signature = `${autoPercentMode}:${percentSignature}`;
    if (signature === autoPercentSignatureRef.current) return;
    autoPercentSignatureRef.current = signature;
    if (percentRows.length === 0) return;

    // Tie-break on target type and id so equal ranks can never make the weight
    // order depend on array position: the biggest share must always land on the
    // same row for the same config.
    const ordered =
      autoPercentMode === "ranked"
        ? [...percentRows].sort(
            (a, b) =>
              a.rank - b.rank ||
              a.targetType.localeCompare(b.targetType) ||
              a.id.localeCompare(b.id)
          )
        : percentRows;

    let allocations: number[] = [];
    if (autoPercentMode === "ranked") {
      const totalWeight = ordered.reduce(
        (sum, _, index) => sum + (ordered.length - index),
        0
      );
      allocations = ordered.map((_, index) =>
        Number((((ordered.length - index) / totalWeight) * 100).toFixed(2))
      );
    } else {
      const base = Number((100 / ordered.length).toFixed(2));
      allocations = ordered.map(() => base);
    }

    const sumExceptLast = allocations
      .slice(0, -1)
      .reduce((sum, value) => sum + value, 0);
    if (allocations.length > 0) {
      allocations[allocations.length - 1] = Number(
        (100 - sumExceptLast).toFixed(2)
      );
    }

    const allocationMap = new Map(
      ordered.map((row, index) => [row.id, allocations[index].toFixed(2)])
    );
    setRows((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        const nextPercent = allocationMap.get(row.id);
        if (nextPercent === undefined || row.percent === nextPercent) {
          return row;
        }
        changed = true;
        return { ...row, percent: nextPercent };
      });
      return changed ? next : prev;
    });
  }, [effectiveWizardStep, autoPercentMode, isHiddenDebtLikeOnboardingRow, rows]);

  useEffect(() => {
    if (effectiveWizardStep !== 4) return;
    if (!incomeInput.trim()) {
      setSimulation(null);
      return;
    }
    handleSimulate(true);
  }, [effectiveWizardStep, incomeInput, rows, handleSimulate]);

  useEffect(() => {
    if (!open || onboardingSetupOnlyMode) return;
    if (fixedSelectionInitRef.current) return;
    if (selectableFixedEnvelopeRows.length === 0) return;
    const initialFixed = skipExistingFixedPreselection
      ? []
      : selectableFixedEnvelopeRows
          .filter((row) => isFixedMode(row.mode))
          .map((row) => row.targetId);
    setFixedEnvelopeIds(initialFixed);
    fixedSelectionInitRef.current = true;
  }, [onboardingSetupOnlyMode, open, selectableFixedEnvelopeRows, skipExistingFixedPreselection]);

  useEffect(() => {
    if (!open || !onboardingSetupOnlyMode) return;
    if (onboardingSimulationBaseAmount <= 0) {
      setIncomeInput((prev) => (prev === "" ? prev : ""));
      return;
    }
    const nextIncomeInput = onboardingSimulationBaseAmount.toFixed(2);
    setIncomeInput((prev) => (prev === nextIncomeInput ? prev : nextIncomeInput));
  }, [open, onboardingSetupOnlyMode, onboardingSimulationBaseAmount]);

  useEffect(() => {
    if (!open || !rebalanceEnabled) return;
    if (rebalanceCutsInitializedForOpenRef.current) return;
    if (rebalanceTotalPool <= 0) return;
    const initialDebt = rebalanceConfigDebtAmount;
    const initialGoals = rebalanceConfigGoalsAmount;
    const cut1 = Math.round(Math.max(0, Math.min(100, (initialDebt / rebalanceTotalPool) * 100)));
    const cut2 = Math.round(
      Math.max(
        cut1,
        Math.min(100, ((initialDebt + initialGoals) / rebalanceTotalPool) * 100)
      )
    );
    setRebalanceCut1Pct((prev) => (prev === cut1 ? prev : cut1));
    setRebalanceCut2Pct((prev) => (prev === cut2 ? prev : cut2));
    rebalanceCutsInitializedForOpenRef.current = true;
  }, [
    open,
    rebalanceEnabled,
    rebalanceConfigDebtAmount,
    rebalanceConfigGoalsAmount,
    rebalanceTotalPool,
  ]);

  useEffect(() => {
    if (!open || !rebalanceEnabled || effectiveWizardStep !== 3 || !onApplyRebalance) return;
    const signature = `${rebalanceDebtAmount}|${rebalanceGoalsAmount}|${rebalanceFlexAmount}`;
    if (signature === rebalanceAutoApplySignatureRef.current) return;
    const currentDebtAmount = Number(rebalanceConfigDebtAmount.toFixed(2));
    const currentGoalsAmount = Number(rebalanceConfigGoalsAmount.toFixed(2));
    const currentFlexAmount = Number(rebalanceConfigFlexAmount.toFixed(2));
    const alreadyApplied =
      currentDebtAmount === rebalanceDebtAmount &&
      currentGoalsAmount === rebalanceGoalsAmount &&
      currentFlexAmount === rebalanceFlexAmount;
    if (alreadyApplied) {
      rebalanceAutoApplySignatureRef.current = signature;
      return;
    }
    if (rebalanceAutoApplyTimerRef.current) {
      clearTimeout(rebalanceAutoApplyTimerRef.current);
      rebalanceAutoApplyTimerRef.current = null;
    }
    const debounceMs = rebalanceDraggingRef.current ? 520 : 140;
    rebalanceAutoApplyTimerRef.current = setTimeout(() => {
      rebalanceAutoApplySignatureRef.current = signature;
      onApplyRebalance({
        debtAmount: rebalanceDebtAmount,
        goalsAmount: rebalanceGoalsAmount,
        flexAmount: rebalanceFlexAmount,
      });
      rebalanceAutoApplyTimerRef.current = null;
    }, debounceMs);
  }, [
    open,
    rebalanceEnabled,
    effectiveWizardStep,
    onApplyRebalance,
    rebalanceConfigDebtAmount,
    rebalanceConfigGoalsAmount,
    rebalanceConfigFlexAmount,
    rebalanceDebtAmount,
    rebalanceGoalsAmount,
    rebalanceFlexAmount,
  ]);

  const flushRebalanceApply = useCallback(() => {
    if (!open || !rebalanceEnabled || effectiveWizardStep !== 3 || !onApplyRebalance) return;
    if (rebalanceAutoApplyTimerRef.current) {
      clearTimeout(rebalanceAutoApplyTimerRef.current);
      rebalanceAutoApplyTimerRef.current = null;
    }
    const signature = `${rebalanceDebtAmount}|${rebalanceGoalsAmount}|${rebalanceFlexAmount}`;
    if (signature === rebalanceAutoApplySignatureRef.current) return;
    rebalanceAutoApplySignatureRef.current = signature;
    onApplyRebalance({
      debtAmount: rebalanceDebtAmount,
      goalsAmount: rebalanceGoalsAmount,
      flexAmount: rebalanceFlexAmount,
    });
  }, [
    open,
    rebalanceEnabled,
    effectiveWizardStep,
    onApplyRebalance,
    rebalanceDebtAmount,
    rebalanceGoalsAmount,
    rebalanceFlexAmount,
  ]);

  useEffect(() => {
    if (open) return;
    if (rebalanceAutoApplyTimerRef.current) {
      clearTimeout(rebalanceAutoApplyTimerRef.current);
      rebalanceAutoApplyTimerRef.current = null;
    }
    rebalanceAutoApplySignatureRef.current = "";
    rebalanceCutsInitializedForOpenRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!onboardingSetupOnlyMode && wizardStep === 2 && fixedEnvelopeIds.length === 0) {
      setWizardStep(3);
    }
  }, [onboardingSetupOnlyMode, wizardStep, fixedEnvelopeIds.length]);

  const handleReorder = (
    targetType: DistributionRow["targetType"],
    orderedRows: DistributionRow[]
  ) => {
    const otherRows = rows
      .filter((row) => row.targetType !== targetType)
      .sort((left, right) => left.rank - right.rank);
    const envelopeRows = targetType === "envelope" ? orderedRows : otherRows;
    const goalRows = targetType === "envelope" ? otherRows : orderedRows;
    // Same contiguous sequence as the initial load: envelopes take 1..n and
    // goals continue after, so a drag never produces two rows sharing a rank.
    const reranked = [...envelopeRows, ...goalRows].map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
    setRows(reranked);
  };

  const renderRows = (
    sectionRows: DistributionRow[],
    targetType: DistributionRow["targetType"],
    options: {
      allowedModes: DistributionRow["mode"][];
      inputMode: "fixed" | "percent";
      sortable?: boolean;
      readOnly?: boolean;
    }
  ) => {
    const content = (
      row: DistributionRow,
      handleProps?: SortHandleProps,
      isDragging?: boolean
    ) => (
      <div
        className={cn(
          options.sortable
            ? "grid grid-cols-[0.7fr_1.3fr_1.4fr_1fr_0.5fr]"
            : "grid grid-cols-[1.6fr_1.6fr_1fr_0.6fr]",
          "items-center gap-3 rounded-2xl border border-[var(--border)] px-3 py-2",
          isDragging && "bg-[var(--surface-2)]"
        )}
      >
        {options.sortable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
              {...handleProps}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-[var(--muted)]">
              #{row.rank}
            </span>
          </div>
        ) : null}
        <div className="text-sm font-medium text-[var(--ink)]">
          {getDisplayEnvelopeName(row.name)}
        </div>
        <div className="flex gap-2">
          {options.allowedModes.map((mode) => {
            const isActive =
              row.mode === mode ||
              (isFixedMode(row.mode) && isFixedMode(mode)) ||
              (isPercentMode(row.mode) && isPercentMode(mode));
            return (
              <Button
                key={mode}
                type="button"
                variant={isActive ? "primary" : "secondary"}
                size="sm"
                className={cn(
                  "px-2 text-xs",
                  isActive ? "shadow-none" : "bg-[var(--surface)]"
                )}
                onClick={() => handleModeChange(row, mode)}
              >
                {isFixedMode(mode) ? copy.fixed : isPercentMode(mode) ? "%" : locale === "ar" ? "بلا" : locale === "fr" ? "Aucun" : "None"}
              </Button>
            );
          })}
        </div>
        <Input
          value={
            (options.inputMode === "fixed" && isFixedMode(row.mode)) ||
            (options.inputMode === "percent" && isPercentMode(row.mode))
              ? options.inputMode === "fixed"
                ? row.fixedAmount ?? ""
                : row.percent ?? ""
              : ""
          }
          onChange={(event) => {
            const value = event.target.value;
            if (options.inputMode === "fixed" && isFixedMode(row.mode)) {
              updateRow(row.targetType, row.targetId, {
                fixedAmount: normalizeFixedInput(value),
              });
            }
            if (options.inputMode === "percent" && isPercentMode(row.mode)) {
              updateRow(row.targetType, row.targetId, {
                percent: normalizePercentInput(value),
              });
            }
          }}
          onBlur={() => {
            if (options.inputMode === "fixed" && isFixedMode(row.mode)) {
              const amount = parseNumber(row.fixedAmount);
              updateRow(row.targetType, row.targetId, {
                fixedAmount: amount ? amount.toFixed(2) : "",
              });
            }
            if (options.inputMode === "percent" && isPercentMode(row.mode)) {
              const value = clampPercent(parseNumber(row.percent));
              updateRow(row.targetType, row.targetId, {
                percent: value.toFixed(2),
              });
            }
          }}
        disabled={
          options.readOnly ||
          row.mode === "none" ||
          !(
            (options.inputMode === "fixed" && isFixedMode(row.mode)) ||
            (options.inputMode === "percent" && isPercentMode(row.mode))
          ) ||
          !row.enabled
        }
        placeholder={options.inputMode === "fixed" ? copy.amount : "%"}
      />
        <Switch
          checked={row.enabled && row.mode !== "none"}
          disabled={row.mode === "none"}
          onCheckedChange={(checked) =>
            updateRow(row.targetType, row.targetId, { enabled: checked })
          }
        />
      </div>
    );

    if (!options.sortable) {
      return (
        <div className="grid gap-2">
          {sectionRows.map((row) => (
            <div key={row.id}>{content(row)}</div>
          ))}
        </div>
      );
    }

    return (
      <SortableTableRows
        rows={sectionRows}
        onReorder={(ordered) => handleReorder(targetType, ordered)}
        renderRow={(row, { handleProps, isDragging }) =>
          content(row, handleProps, isDragging)
        }
      />
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden" dir={pageDir}>
        <style jsx>{`
          .rollover-check input {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            opacity: 0;
            cursor: pointer;
            height: 0;
            width: 0;
          }
          .rollover-check {
            display: block;
            position: relative;
            cursor: pointer;
            font-size: 16px;
            user-select: none;
            border: 2px solid #beddd0;
            border-radius: 8px;
            overflow: hidden;
          }
          .rollover-check .checkmark {
            position: relative;
            top: 0;
            left: 0;
            height: 1em;
            width: 1em;
            background-color: #2dc38c;
            border-bottom: 1px solid #2dc38c;
            box-shadow: 0 0 1px #cef1e4, inset 0 -2.5px 3px #62eab8,
              inset 0 3px 3px rgba(0, 0, 0, 0.34);
            border-radius: 6px;
            transition: transform 0.3s ease-in-out;
            display: block;
          }
          .rollover-check input:checked ~ .checkmark {
            transform: translateY(0);
            animation: wipeUp 0.4s ease-in-out forwards;
          }
          .rollover-check input:not(:checked) ~ .checkmark {
            transform: translateY(28px);
            animation: wipeDown 0.4s ease-in-out forwards;
          }
          @keyframes wipeDown {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(28px);
            }
          }
          @keyframes wipeUp {
            0% {
              transform: translateY(28px);
            }
            100% {
              transform: translateY(0px);
            }
          }
          .rollover-check .checkmark:after {
            content: "";
            position: absolute;
            display: none;
          }
          .rollover-check input:checked ~ .checkmark:after {
            display: block;
          }
          .rollover-check .checkmark:before {
            content: "";
            position: absolute;
            left: 7px;
            top: 2px;
            width: 4px;
            height: 8px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
            box-shadow: 0 4px 2px rgba(0, 0, 0, 0.34);
          }
        `}</style>
          <div className="flex h-full flex-col">
          <DialogHeader className="gap-3 border-b border-[var(--border)] px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <DialogTitle>{copy.configureDistribution}</DialogTitle>
                <DialogDescription className="text-sm text-[var(--muted)]">
                  {wizardMeta.subtitle || " "}
                </DialogDescription>
                {isViewingPreset ? (
                  <p className="text-xs text-[var(--muted)]">
                    {copy.currentConfigLabel}:{" "}
                    <span className="font-semibold text-[var(--ink)]">
                      {initialConfig?.name}
                    </span>
                  </p>
                ) : null}
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {copy.step} {displayStepIndex} / {displayStepTotal}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stepFlowLabels.map((label, index) => {
                const isDone = index + 1 < displayStepIndex;
                const isActive = index + 1 === displayStepIndex;
                return (
                  <span
                    key={`${label}-${index}`}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px]",
                      isActive
                        ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-800"
                        : isDone
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                    )}
                  >
                    {index + 1}. {label}
                  </span>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 hidden">
                <span className="text-sm font-medium text-[var(--ink)]">{copy.auto}</span>
                <Switch
                  checked={autoEnabled}
                  disabled={autoSaving}
                  onCheckedChange={handleAutoToggle}
                />
              </div>
              {effectiveWizardStep === 3 ? (
                <Badge tone={percentTone}>
                  {copy.totalPercent} : {percentTotal.toFixed(2)}%
                </Badge>
              ) : null}
            </div>
            {effectiveWizardStep === 3 && percentWarning ? (
              <Alert tone="error" className="mt-2">
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span>
                    {locale === "ar"
                      ? `المجموع ديال النسب المئوية ديالك هو ${percentTotal.toFixed(2)}%. عفاك ضبطو ل 100% ولا نقصو باش تكمل.`
                      : locale === "fr"
                      ? `Le total de vos pourcentages est de ${percentTotal.toFixed(2)}%. Veuillez l'ajuster à 100% ou le réduire pour continuer.`
                      : `The total of your percentages is ${percentTotal.toFixed(2)}%. Please adjust it to 100% or reduce it to continue.`}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                    onClick={() => {
                      setRows((prev) => normalizePercentRows(prev));
                      setError(null);
                    }}
                  >
                    {locale === "ar" ? "ضبط ل 100%" : locale === "fr" ? "Ajuster à 100%" : "Adjust to 100%"}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
            {loading ? (
              <div className="text-sm text-[var(--muted)]">{copy.loading}</div>
            ) : error ? (
              <Alert tone="error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
                <div className="grid gap-6">
                  {!onboardingSetupOnlyMode && effectiveWizardStep === 1 ? (
                    <>
                      {showRolloverControls ? (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                          <p className="text-sm font-semibold text-emerald-900">
                            {copy.rolloverReminder}
                          </p>
                          <p className="text-xs text-emerald-900/70">
                            {copy.rolloverStored}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="success">
                                {copy.rolloverOn}: {rolloverOn.length}
                              </Badge>
                              <Badge tone="muted">
                                {copy.rolloverOff}: {rolloverOff.length}
                              </Badge>
                              <span className="text-emerald-700/80">
                                {copy.nextDate}: {rolloverNextLabel || copy.toDefine}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setRolloverSettingsError(null);
                                setRolloverSettingsOpen(true);
                              }}
                            >
                              {copy.editRollover}
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-[var(--ink)]">
                            {copy.fixedEnvelopes}
                          </h3>
                          <Badge tone="muted">
                            {copy.envelopesCount(selectableFixedEnvelopeRows.length)}
                          </Badge>
                        </div>
                        {selectableFixedEnvelopeRows.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--muted)]">
                            {copy.noFixedSelected}
                          </div>
                        ) : (
                        <div className="grid gap-2">
                          {selectableFixedEnvelopeRows.map((row) => {
                            const checked = fixedEnvelopeSet.has(row.targetId);
                            const meta = envelopeMeta.find((env) => env.id === row.targetId);
                            return (
                              <label
                                key={row.id}
                                className={cn(
                                  "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition",
                                  checked
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-[var(--border)] bg-[var(--surface)] hover:border-emerald-200 hover:bg-emerald-50/40"
                                )}
                              >
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-[var(--ink)]">
                                      {getDisplayEnvelopeName(row.name)}
                                    </span>
                                    {checked ? (
                                      <Badge tone="muted">{copy.fixed}</Badge>
                                    ) : null}
                                  </div>
                                  {meta ? (
                                    <span className="text-[11px] text-gray-500">
                                      {meta.rollover_enabled ? copy.rolloverOn : copy.rolloverOff}
                                    </span>
                                  ) : null}
                                </div>
                                <label className="rollover-check">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setFixedEnvelopeIds((prev) =>
                                        prev.includes(row.targetId)
                                          ? prev.filter((id) => id !== row.targetId)
                                          : [...prev, row.targetId]
                                      );
                                    }}
                                    onClick={(event) => event.stopPropagation()}
                                  />
                                  <span className="checkmark" />
                                </label>
                              </label>
                            );
                          })}
                        </div>
                        )}
                      </div>
                    </>
                  ) : null}

                  {!onboardingSetupOnlyMode && effectiveWizardStep === 2 ? (
                    <>
                      {fixedEnvelopeRows.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--muted)]">
                          {copy.noFixedSelected}
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-[var(--ink)]">
                              {copy.fixedAmountsTitle}
                            </h3>
                            <Badge tone="muted">
                              {copy.envelopesCount(fixedEnvelopeRows.length)}
                            </Badge>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {fixedEnvelopeRows.map((row, index) => {
                              const tone =
                                index % 3 === 0
                                  ? "bg-emerald-100 text-emerald-700"
                                  : index % 3 === 1
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-sky-100 text-sky-700";
                              return (
                                <div
                                  key={row.id}
                                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <span
                                        className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-semibold ${tone}`}
                                      >
                                        {getInitials(getDisplayEnvelopeName(row.name))}
                                      </span>
                                      <div>
                                        <p className="text-sm font-semibold text-[var(--ink)]">
                                          {getDisplayEnvelopeName(row.name)}
                                        </p>
                                        <p className="text-xs text-[var(--muted)]">
                                          {copy.fixedAmountPerPeriod}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge tone="muted">{copy.fixed}</Badge>
                                  </div>
                                  <div className="mt-3 grid gap-2">
                                    <Label className="text-xs">{copy.amount}</Label>
                                    <Input
                                      value={isFixedMode(row.mode) ? row.fixedAmount ?? "" : ""}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        updateRow(row.targetType, row.targetId, {
                                          fixedAmount: normalizeFixedInput(value),
                                        });
                                      }}
                                      onBlur={() => {
                                        const amount = parseNumber(row.fixedAmount);
                                        updateRow(row.targetType, row.targetId, {
                                          fixedAmount: amount ? amount.toFixed(2) : "",
                                        });
                                      }}
                                      placeholder={copy.amount}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}

                  {effectiveWizardStep === 3 ? (
                    <>
                      {rebalanceEnabled ? (
                        <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
                          <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
                          <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-emerald-200/40 blur-2xl" />
	                          <div className="relative">
	                          <div className="flex items-center justify-between gap-2">
	                            <p className="text-sm font-bold text-amber-900">
	                              {copy.rebalanceTitle}
	                            </p>
	                            <span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm">
	                              {formatMoney(rebalanceTotalPool)}
	                            </span>
	                          </div>
                          <div className="mt-4 flex h-3 overflow-hidden rounded-full border border-amber-200 bg-white">
                            <div className="bg-[#ef4444]" style={{ width: `${rebalanceDebtPct}%` }} />
                            <div className="bg-[#6366f1]" style={{ width: `${rebalanceGoalsPct}%` }} />
                            <div className="bg-[#22c55e]" style={{ width: `${rebalanceFlexPct}%` }} />
                          </div>
                          <div className="mt-4 space-y-3">
                            <div>
                              <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-amber-900/80">
	                                <span>{copy.rebalanceDebtGoalsBoundary}</span>
	                                <span>{rebalanceDebtPct.toFixed(0)}%</span>
	                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={rebalanceCut1Pct}
                                onPointerDown={() => {
                                  rebalanceDraggingRef.current = true;
                                }}
                                onPointerUp={() => {
                                  rebalanceDraggingRef.current = false;
                                  flushRebalanceApply();
                                }}
                                onChange={(event) => {
                                  const next = Math.max(0, Math.min(100, Number(event.target.value) || 0));
                                  setRebalanceCut1Pct(next);
                                  if (next > rebalanceCut2Pct) setRebalanceCut2Pct(next);
                                }}
                                className="w-full accent-[#ef4444]"
                              />
                            </div>
                            <div>
                              <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-amber-900/80">
	                                <span>{copy.rebalanceGoalsFlexBoundary}</span>
	                                <span>{rebalanceCut2Pct.toFixed(0)}%</span>
	                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={rebalanceCut2Pct}
                                onPointerDown={() => {
                                  rebalanceDraggingRef.current = true;
                                }}
                                onPointerUp={() => {
                                  rebalanceDraggingRef.current = false;
                                  flushRebalanceApply();
                                }}
                                onChange={(event) => {
                                  const next = Math.max(0, Math.min(100, Number(event.target.value) || 0));
                                  setRebalanceCut2Pct(next);
                                  if (next < rebalanceCut1Pct) setRebalanceCut1Pct(next);
                                }}
                                className="w-full accent-[#6366f1]"
                              />
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className={cn("rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 shadow-sm", pageDir === "rtl" ? "text-right" : "text-left")}>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">{copy.debt}</p>
                              <p className="mt-1 text-[18px] font-black text-rose-900">{formatMoney(rebalanceDebtAmount)}</p>
                              <p className="mt-1 text-[11px] text-rose-700">{debtEtaLabel}</p>
                            </div>
                            <div className={cn("rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-3 shadow-sm", pageDir === "rtl" ? "text-right" : "text-left")}>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">{copy.goals}</p>
                              <p className="mt-1 text-[18px] font-black text-indigo-900">{formatMoney(rebalanceGoalsAmount)}</p>
                              <p className="mt-1 text-[11px] text-indigo-700">{goalsEtaLabel}</p>
                            </div>
                            <div className={cn("rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 shadow-sm", pageDir === "rtl" ? "text-right" : "text-left")}>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">{copy.flex}</p>
                              <p className="mt-1 text-[18px] font-black text-emerald-900">{formatMoney(rebalanceFlexAmount)}</p>
                              <p className="mt-1 text-[11px] text-emerald-700">{flexUiImpact}</p>
                            </div>
                          </div>
	                          <div
	                            className={cn(
	                              "mt-4 rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-[11px] font-medium text-amber-900",
	                              pageDir === "rtl" ? "text-right" : "text-left"
	                            )}
	                          >
	                            {copy.rebalanceAutoHint}
	                          </div>
	                          </div>
	                        </div>
	                      ) : null}

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[var(--ink)]">
                            {copy.percentAllocation}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {copy.percentModeSummary(
                              autoPercentMode === "equal" ? copy.equal : copy.ranked
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAutoPercentMode("equal")}
                            className={cn(
                              "rounded-full px-4 py-2 text-xs font-semibold transition",
                              autoPercentMode === "equal"
                                ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-emerald-50"
                            )}
                          >
                            {copy.equal}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAutoPercentMode("ranked")}
                            className={cn(
                              "rounded-full px-4 py-2 text-xs font-semibold transition",
                              autoPercentMode === "ranked"
                                ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.45)]"
                                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-emerald-50"
                            )}
                          >
                            {copy.ranked}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
	                          <p className="text-xs font-semibold text-emerald-800">
	                            {copy.flexAmountToDistribute}
	                          </p>
	                          <span className="text-sm font-black text-emerald-900">
	                            {formatMoney(percentPreviewIncome ?? 0)}
	                          </span>
	                        </div>
	                        <p className="mt-1 text-[11px] text-emerald-800/80">
	                          {copy.flexAmountHint}
	                        </p>
	                      </div>

                      <div className="grid gap-3">
                        <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-[var(--ink)]">
	                            {onboardingSetupOnlyMode
	                              ? copy.onboardingPercentEnvelopesTitle
	                              : copy.percentEnvelopes}
	                                </h3>
                          <Badge tone="muted">
                            {copy.envelopesCount(percentEnvelopeRows.length)}
                          </Badge>
                        </div>
                        {percentEnvelopeRows.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--muted)]">
	                            {onboardingSetupOnlyMode
	                              ? copy.onboardingNoStandaloneFlexible
	                              : copy.allFixed}
	                          </div>
	                        ) : (
                          <div className="grid gap-3">
                            {autoPercentMode === "ranked" ? (
                              <SortableTableRows
                                rows={percentEnvelopeRows}
                                onReorder={(ordered) =>
                                  handleReorder("envelope", ordered)
                                }
                                renderRow={(row, { handleProps, isDragging }) => {
                                  const value = parseNumber(row.percent);
                                  const amount = percentPreviewAmountByRowId.get(row.id);
                                  const tone =
                                    row.rank % 3 === 1
                                      ? "bg-emerald-100 text-emerald-700"
                                      : row.rank % 3 === 2
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-sky-100 text-sky-700";
                                  return (
                                    <div
                                      className={cn(
                                        "rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition",
                                        isDragging && "bg-emerald-50/60"
                                      )}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                          <span
                                            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-semibold ${tone}`}
                                          >
                                            {getInitials(getDisplayEnvelopeName(row.name))}
                                          </span>
                                          <div>
                                            <p className="text-sm font-semibold text-[var(--ink)]">
                                              {getDisplayEnvelopeName(row.name)}
                                            </p>
                                            <p className="text-xs text-[var(--muted)]">
                                              {copy.priority(row.rank)}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                          <button
                                            type="button"
                                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                                            {...handleProps}
                                          >
                                            <GripVertical className="h-4 w-4" />
                                          </button>
                                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                            {value.toFixed(2)}%
                                          </span>
                                          <span className="text-xs font-semibold text-[var(--ink)]">
                                            {typeof amount === "number"
                                              ? `${formatMoney(amount)} MAD`
                                              : "—"}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                                        <div
                                          className="h-full rounded-full bg-emerald-500 transition-all"
                                          style={{
                                            width: `${Math.min(100, Math.max(0, value))}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                }}
                              />
                            ) : (
                              <div className="grid gap-3 sm:grid-cols-2">
                                {percentEnvelopeRows.map((row, index) => {
                                  const value = parseNumber(row.percent);
                                  const amount = percentPreviewAmountByRowId.get(row.id);
                                  const tone =
                                    index % 3 === 0
                                      ? "bg-emerald-100 text-emerald-700"
                                      : index % 3 === 1
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-sky-100 text-sky-700";
                                  return (
                                    <div
                                      key={row.id}
                                      className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                          <span
                                            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-semibold ${tone}`}
                                          >
                                            {getInitials(getDisplayEnvelopeName(row.name))}
                                          </span>
                                          <div>
                                            <p className="text-sm font-semibold text-[var(--ink)]">
                                              {getDisplayEnvelopeName(row.name)}
                                            </p>
                                            <p className="text-xs text-[var(--muted)]">
                                              {copy.equalSplit}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                            {value.toFixed(2)}%
                                          </span>
                                          <span className="text-xs font-semibold text-[var(--ink)]">
                                            {typeof amount === "number"
                                              ? `${formatMoney(amount)} MAD`
                                              : "—"}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                                        <div
                                          className="h-full rounded-full bg-emerald-500 transition-all"
                                          style={{
                                            width: `${Math.min(100, Math.max(0, value))}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {goalRows.length > 0 ? (
                        <>
                          <Separator />
                          <div className="grid gap-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-[var(--ink)]">
                                {copy.goals}
                              </h3>
                            </div>
                            {renderRows(goalRows, "goal", {
                              allowedModes: ["percent"],
                              inputMode: "percent",
                              sortable: autoPercentMode === "ranked",
                              readOnly: true,
                            })}
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : null}

                  {effectiveWizardStep === 4 ? (
                    <div className="grid gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--ink)]">
                          {copy.localSimulation}
                        </h4>
                        <p className="text-xs text-[var(--muted)]">
                          {simulationSubtitle}
                        </p>
                      </div>
                      {onboardingSetupOnlyMode ? (
                        <div className="rounded-2xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3">
                          <p className="text-[12px] font-semibold text-[#1e3a8a]">
                            {locale === "ar"
                              ? "المبلغ الشهري اللي غادي يتوزع (ثابت فهاد المرحلة)"
                              : locale === "fr"
                              ? "Montant mensuel distribué (figé dans cette étape)"
                              : "Monthly amount distributed (fixed in this step)"}
                          </p>
                          <p className="mt-1 text-[18px] font-semibold text-[#0f172a]">
                            {formatMoney(onboardingSimulationBaseAmount)}
                          </p>
                          <p className="mt-1 text-[12px] text-[#1e3a8a]">
                            {locale === "ar"
                              ? "هاد المبلغ محدد تلقائياً من المرحلة اللي قبل، وما يمكنش تبدلو من هنا."
                              : locale === "fr"
                              ? "Ce montant est défini automatiquement par l’étape précédente et ne peut pas être modifié ici."
                              : "This amount is automatically set by the previous step and cannot be edited here."}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <Label className="text-xs font-medium text-[var(--muted)]">
                            {simulationInputLabel}
                          </Label>
                          <Input
                            value={incomeInput}
                            onChange={(event) => setIncomeInput(event.target.value)}
                            placeholder={simulationPlaceholder}
                          />
                        </div>
                      )}
                      {simulation ? (
                        <div className="grid gap-4">
                          <div className="grid gap-3 sm:grid-cols-3">
                            {(onboardingSetupOnlyMode
                              ? [
                                  {
                                    label: simulationInputLabel,
                                    value: simulation.income,
                                    tone: "bg-emerald-100 text-emerald-700",
                                  },
                                  {
                                    label:
                                      locale === "ar"
                                        ? "المبلغ اللي توزع"
                                        : locale === "fr"
                                        ? "Montant distribué"
                                        : "Distributed amount",
                                    value: Math.max(0, simulation.income - simulation.remainderAfterPercent),
                                    tone: "bg-sky-100 text-sky-700",
                                  },
                                  {
                                    label: copy.unallocated,
                                    value: simulation.remainderAfterPercent,
                                    tone: "bg-amber-100 text-amber-700",
                                  },
                                ]
                              : [
                                  {
                                    label: copy.income,
                                    value: simulation.income,
                                    tone: "bg-emerald-100 text-emerald-700",
                                  },
                                  {
                                    label: copy.fixedApplied,
                                    value: simulation.totalFixedApplied,
                                    tone: "bg-amber-100 text-amber-700",
                                  },
                                  {
                                    label: copy.remainingAfterFixed,
                                    value: simulation.remainderAfterFixed,
                                    tone: "bg-sky-100 text-sky-700",
                                  },
                                ]).map((item) => (
                              <div
                                key={item.label}
                                className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-[var(--muted)]">
                                    {item.label}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.tone}`}
                                  >
                                    {formatMoney(item.value)}
                                  </span>
                                </div>
                                <div className="mt-3 text-lg font-semibold text-[var(--ink)]">
                                  {formatMoney(item.value)}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className={cn("grid gap-4", onboardingSetupOnlyMode ? "lg:grid-cols-1" : "lg:grid-cols-2")}>
                            {!onboardingSetupOnlyMode ? (
                              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-[var(--ink)]">
                                    {copy.fixedAmountsTitle}
                                  </h4>
                                  <Badge tone="muted">
                                    {copy.lines(simulation.fixedItems.length)}
                                  </Badge>
                                </div>
                                <div className="mt-3 grid gap-2 text-sm">
                                  {simulation.fixedItems.length === 0 ? (
                                    <span className="text-xs text-[var(--muted)]">
                                      {copy.noActiveFixed}
                                    </span>
                                  ) : (
                                    simulation.fixedItems.map((item) => {
                                      const ratio =
                                        simulation.income > 0
                                          ? Math.min(
                                              100,
                                              (item.amount / simulation.income) * 100
                                            )
                                          : 0;
                                      return (
                                        <div
                                          key={`fixed-${item.name}`}
                                          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2"
                                        >
                                          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                                            <span>{getDisplayEnvelopeName(item.name)}</span>
                                            <span className="font-semibold text-[var(--ink)]">
                                              {formatMoney(item.amount)}
                                            </span>
                                          </div>
                                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                                            <div
                                              className="h-full rounded-full bg-emerald-500"
                                              style={{ width: `${ratio}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            ) : null}

                            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-[var(--ink)]">
                                  {copy.percentSplit}
                                </h4>
                                <Badge tone="muted">
                                  {copy.lines(simulation.percentItems.length)}
                                </Badge>
                              </div>
                              <div className="mt-3 grid gap-2 text-sm">
                                {simulation.percentItems.length === 0 ? (
                                  <span className="text-xs text-[var(--muted)]">
                                    {copy.noActivePercent}
                                  </span>
                                ) : (
                                  simulation.percentItems.map((item) => {
                                    const ratio =
                                      simulation.income > 0
                                        ? Math.min(
                                            100,
                                            (item.amount / simulation.income) * 100
                                          )
                                        : 0;
                                    return (
                                      <div
                                        key={`percent-${item.name}`}
                                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2"
                                      >
                                        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                                          <span>{getDisplayEnvelopeName(item.name)}</span>
                                          <span className="font-semibold text-[var(--ink)]">
                                            {formatMoney(item.amount)}
                                          </span>
                                        </div>
                                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100">
                                          <div
                                            className="h-full rounded-full bg-sky-500"
                                            style={{ width: `${ratio}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-amber-100 bg-amber-50/70 p-4 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--muted)]">{copy.unallocated}</span>
                              <span className="font-semibold text-[var(--ink)]">
                                {formatMoney(simulation.remainderAfterPercent)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {effectiveWizardStep === 5 ? (
                    <div className="grid gap-6">
                      <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-[radial-gradient(circle_at_top,_#ecfdf5,_#ffffff_70%)] p-6">
                        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-emerald-100/70 blur-2xl" />
                        <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-sky-100/70 blur-2xl" />
                        <div className="relative z-10 grid gap-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                              ✓
                            </span>
                            <div>
                              <p className="text-lg font-semibold text-emerald-900">
                                {userGreeting}
                              </p>
                              <p className="text-sm text-emerald-900/70">
                                {copy.readyBody}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-emerald-100 bg-[var(--surface)] p-4 text-sm shadow-sm">
                              <p className="text-xs text-[var(--muted)]">{copy.envelopes}</p>
                              <p className="mt-1 text-lg font-semibold text-[var(--ink)]">
                                {onboardingSetupOnlyMode ? percentEnvelopeRows.length : envelopeRows.length}
                              </p>
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                {onboardingSetupOnlyMode
                                  ? locale === "ar"
                                    ? `الأظرفة اللي داخلة للتوزيع: ${percentEnvelopeRows.length}`
                                    : locale === "fr"
                                    ? `Enveloppes incluses dans la distribution : ${percentEnvelopeRows.length}`
                                    : `Envelopes included in distribution: ${percentEnvelopeRows.length}`
                                  : copy.fixedCountSummary(
                                      fixedEnvelopeRows.length,
                                      percentEnvelopeRows.length
                                    )}
                              </p>
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                {copy.scopeHint}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-emerald-100 bg-[var(--surface)] p-4 text-sm shadow-sm">
                              <p className="text-xs text-[var(--muted)]">
                                {onboardingSetupOnlyMode ? copy.totalPercent : copy.totalFixed}
                              </p>
                              <p className="mt-1 text-lg font-semibold text-[var(--ink)]">
                                {onboardingSetupOnlyMode ? `${percentTotal.toFixed(2)}%` : fixedTotal.toFixed(2)}
                              </p>
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                {copy.percentModeSummary(percentModeLabel)}
                              </p>
                            </div>
                            {showRolloverControls ? (
                              <div className="rounded-2xl border border-emerald-100 bg-[var(--surface)] p-4 text-sm shadow-sm">
                                <p className="text-xs text-[var(--muted)]">{copy.rollover}</p>
                                <p className="mt-1 text-lg font-semibold text-[var(--ink)]">
                                  {copy.rolloverOn}: {rolloverOn.length} / {copy.rolloverOff}: {rolloverOff.length}
                                </p>
                                <p className="mt-1 text-xs text-[var(--muted)]">
                                  {copy.nextDate}: {rolloverNextLabel || copy.toDefine}
                                </p>
                              </div>
                            ) : null}
                          </div>

                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                            <p className="font-semibold">{copy.quickTips}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-emerald-900/80">
                              <li>{copy.tip1}</li>
                              <li>{copy.tip2}</li>
                              <li>{copy.tip3}</li>
                            </ul>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setWizardStep(4)}
                            >
                              {copy.reviewSimulation}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setWizardStep(onboardingSetupOnlyMode ? 3 : 1)}
                            >
                              {copy.editSettings}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
            )}
          </div>

          <div className="border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={saving}
              >
                {copy.cancel}
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                {effectiveWizardStep > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleWizardBack}
                    disabled={saving}
                  >
                    {copy.back}
                  </Button>
                ) : null}
                {effectiveWizardStep === 2 ? (
                  <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <span>
                      {copy.totalFixed}: {fixedTotal.toFixed(2)}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-[var(--surface)] px-2 py-0.5 text-[11px] text-emerald-700"
                      title={copy.fixedTotalInfo}
                    >
                      <Info className="h-3 w-3" aria-hidden />
                      i
                    </span>
                  </div>
                ) : null}
                {effectiveWizardStep < 5 ? (
                  <Button type="button" onClick={handleWizardNext} disabled={saving || loading}>
                    {nextButtonLabel}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSave}
                    isLoading={saving}
                    disabled={loading}
                  >
                    {copy.finish}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      {showRolloverControls ? (
        <Dialog
          open={rolloverSettingsOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setRolloverSettingsError(null);
            }
            setRolloverSettingsOpen(nextOpen);
          }}
        >
          <DialogContent className="max-w-md" style={{ zIndex: 60 }} dir={pageDir}>
            <DialogHeader>
              <DialogTitle>{copy.editRolloverTitle}</DialogTitle>
              <DialogDescription className="text-xs text-[var(--muted)]">
                {copy.editRolloverBody}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>{copy.nextRolloverDate}</Label>
                <Input
                  type="date"
                  value={rolloverDateInput}
                  onChange={(event) => setRolloverDateInput(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{copy.rolloverFrequency}</Label>
                <select
                  value={rolloverFrequencyInput}
                  onChange={(event) => setRolloverFrequencyInput(event.target.value)}
                  className="h-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                >
                  <option value="">{copy.chooseFrequency}</option>
                  <option value="3">{copy.everyDays(3)}</option>
                  <option value="7">{copy.everyDays(7)}</option>
                  <option value="14">{copy.everyDays(14)}</option>
                  <option value="21">{copy.everyDays(21)}</option>
                  <option value="30">{copy.everyDays(30)}</option>
                </select>
              </div>
              {rolloverSettingsError ? (
                <p className="text-xs text-red-600">{rolloverSettingsError}</p>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRolloverSettingsOpen(false)}
              >
                {copy.cancel}
              </Button>
              <Button type="button" onClick={handleSaveRolloverSettings}>
                {copy.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
