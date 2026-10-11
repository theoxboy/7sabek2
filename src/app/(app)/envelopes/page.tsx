"use client";

import { type CSSProperties, type ReactNode, useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  AlertTriangle,
  Check,
  Download,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  X,
} from "lucide-react";

import { apiFetch, fetchDashboard } from "@/lib/api";
import { listSavedDistributionConfigs, isFixedMode, type DistributionSavedConfig, type DistributionRule } from "@/lib/distribution";
import type {
  CategoryEnvelopeMapOut,
  CategoryOut,
  DashboardOut,
  EnvelopeOut,
  EnvelopeAdjustmentLogOut,
  EnvelopePeriodOut,
  EnvelopeTransferLogOut,
  GoalOut,
  OnboardingV2RecordOut,
  TransactionOut,
} from "@/lib/types";
import { IssueAlert } from "@/components/ui/IssueAlert";
import {
  PageTour,
} from "@/components/tour/GlobalTour";
import { usePageTour } from "@/components/tour/usePageTour";
import {
  getLocaleDirection,
  type FloussyLocale,
} from "@/lib/localePreference";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { getIssueDisplay } from "@/lib/issueMessages";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { looksLikeDebt } from "@/lib/envelopeDebt";
import { cn } from "@/lib/cn";
import type { AuthUser } from "@/lib/auth";
import { GUEST_LIMITS, checkEnvelopeQuota } from "@/lib/guestQuota";
import { guestEvent } from "@/lib/guestAnchorApi";
import {
  ENV_COPY,
  EnvDrawer,
  EnvModal,
  EnvToastView,
  SEALS_DARK,
  SEALS_LIGHT,
  getBanknotes,
  sealIndex,
  type EnvToast,
} from "./envelopes-ui";

const RESERVED_NAMES = ["cash", "epargnes"];
// Fire the "hit the 20-envelope wall" analytics event at most once per page load.
let guestEnvelopeCapHitSent = false;
const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const LOCALE_TO_BCP47: Record<FloussyLocale, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-MA",
};
const FIXED_ROLLOVER_AUTOFIX_TOAST_ONCE_KEY =
  "floussy:fixed-rollover-autofix-toast-once:v1";
const ENVELOPE_PRESET_PACKS = [
  {
    key: "essentiels",
    envelopeKeys: ["rent", "bills", "groceries", "transport", "health"],
  },
  {
    key: "famille",
    envelopeKeys: ["school", "activities", "childcare", "kids_clothes"],
  },
  {
    key: "style",
    envelopeKeys: ["restaurants", "going_out", "travel", "gifts"],
  },
  {
    key: "epargne",
    envelopeKeys: ["short_savings", "long_savings", "emergencies"],
  },
  {
    key: "dettes",
    envelopeKeys: ["credit", "repayments", "insurance"],
  },
  {
    key: "pro",
    envelopeKeys: ["equipment", "training", "work_travel"],
  },
];

const ENVELOPES_COPY = {
  fr: {
    pageTitle: "Enveloppes",
    pageSubtitle:
      "Les soldes reflètent la période en cours.",
    loading: "Chargement...",
    unknownError: "Erreur inconnue",
    guestEnvelopeCap: `En mode découverte, tu peux créer jusqu’à ${GUEST_LIMITS.envelopes} enveloppes. Crée ton compte gratuit pour en avoir autant que tu veux — tes enveloppes actuelles sont gardées.`,
    spendingTrend: "Tendance des dépenses",
    noSelection: "Aucune enveloppe sélectionnée.",
    selectAtLeastOneEnvelope: "Sélectionne au moins une enveloppe.",
    nothingToChange: "Rien à modifier.",
    selectedAlreadySameStatus: "Les enveloppes sélectionnées ont déjà ce statut.",
    bulkUpdateSuccess: (enabled: boolean, count: number) =>
      `Rollover ${enabled ? "activé" : "désactivé"} pour ${count} enveloppe(s).`,
    updateFailed: "Mise à jour échouée.",
    updateSuccess: "Mise à jour réussie.",
    rolloverOffForbiddenProfile:
      "Rollover OFF est interdit pour Dettes, Goals et Dépenses fixes. Ces enveloppes doivent rester en rollover ON.",
    envelopeNameRequired: "Le nom de l'enveloppe est obligatoire.",
    reservedNames: "Cash et Épargne sont des noms réservés.",
    cannotDeleteEnvelope: "Cette enveloppe ne peut pas être supprimée.",
    deleteSuccess: "Suppression réussie.",
    envelopeDeleted: (name: string) => `L'enveloppe \"${name}\" a été supprimée.`,
    validAmount: "Saisis un montant valide (>= 0).",
    correctionApplied: "Correction appliquée.",
    budgetUpdated: "Le budget a été mis à jour.",
    correctionFailed: "Correction échouée.",
    nothingToAdd: "Rien à ajouter.",
    allEnvelopesExist: "Toutes les enveloppes existent déjà.",
    addSuccess: "Ajout réussi.",
    addCreated: (count: number) => `${count} enveloppe(s) ajoutée(s).`,
    addFailed: "Ajout échoué.",
    deleteActivityConfirm: "Supprimer cette activité ?",
    activityDeleted: "L'activité a été supprimée.",
    deleteAllActivityConfirm:
      "Supprimer toutes les activités de cette enveloppe ?",
    allActivitiesDeleted: "Toutes les activités ont été supprimées.",
    currentBalances: "Soldes actuels",
    collectiveRollover: "Rollover collectif",
    selectEnvelopesToEdit: "Sélectionne les enveloppes à modifier.",
    select: "Sélectionner",
    bulkRolloverTitle: "Modifier le rollover en masse ?",
    bulkRolloverDesc: "Cette action mettra à jour toutes les enveloppes modifiables.",
    selectAll: "Tout sélectionner",
    selectedCount: (count: number) => `${count} sélectionnée(s)`,
    rolloverOn: "Rollover activé",
    rolloverOff: "Rollover désactivé",
    cancel: "Annuler",
    enable: "Activer",
    disable: "Désactiver",
    noEnvelopes: "Aucune enveloppe pour l'instant",
    createToStart: "Crée une enveloppe pour commencer ton budget.",
    fixedAmountGroupTitle: "Enveloppes à montant fixe",
    fixedAmountGroupDesc:
      "Ces enveloppes reçoivent un montant fixe depuis ta configuration de répartition.",
    noFixedAmountInSection: "Aucune enveloppe à montant fixe dans cette section.",
    nonFixedAmountGroupTitle: "Enveloppes sans montant fixe",
    nonFixedAmountGroupDesc:
      "Ces enveloppes n’ont pas de montant fixe actif et restent pilotées par le reste du budget.",
    noNonFixedAmountInSection: "Aucune enveloppe sans montant fixe dans cette section.",
    cash: "Cash",
    savings: "Épargne",
    locked: "Verrouillé",
    viewDetails: "Voir détails",
    rename: "Renommer",
    correction: "Correction",
    lockedSuffix: " (verrouillé)",
    delete: "Supprimer",
    createEnvelope: "Créer une enveloppe",
    addEnvelope: "Ajouter une enveloppe",
    newEnvelope: "Nouvelle enveloppe",
    addEnvelopeDesc: "Ajoute une enveloppe pour organiser ton budget.",
    envelopeNamePlaceholder: "Nom de l'enveloppe",
    isDebtLabel: "C'est une dette / un crédit",
    isDebtHint: "Le solde reste d'un mois à l'autre et n'est jamais balayé vers l'épargne.",
    add: "Ajouter",
    advancedSettings: "Paramètres avancés",
    advancedSettingsTitle: "Paramètres avancés",
    advancedSettingsDesc:
      "Choisis des packs ou ajoute une liste rapide d'enveloppes. L'allocation se fait ensuite depuis la page Répartition.",
    quickList: "Ajouter une liste rapide",
    quickListPlaceholder: "Ex: Vacances, Voiture, Animaux",
    suggestedEnvelopes: "Enveloppes proposées",
    choosePackOrList: "Choisis un pack ou ajoute une liste.",
    deleteEnvelope: "Supprimer l'enveloppe",
    deleteEnvelopeDesc:
      "Les transactions et le budget actuel de cette enveloppe seront transférés vers l'enveloppe Cash. Cela consolide les soldes et garde l'historique dans Cash.",
    transferFromEnvelope: "Transfert depuis l'enveloppe",
    manualCorrection: "Correction manuelle",
    manualCorrectionDesc:
      "Cette correction est manuelle. Vérifie bien tes calculs avant de continuer. Tu es responsable des ajustements.",
    currentBudgetModified: "Cette action modifie le budget actuel de l'enveloppe.",
    continue: "Continuer",
    newValue: "Nouvelle valeur",
    newValueDesc: "Modifie le budget actuel de l'enveloppe.",
    back: "Retour",
    confirmCorrection: "Confirmer la correction",
    confirmCorrectionDesc: "Vérifie l'ancienne et la nouvelle valeur.",
    oldValue: "Ancienne valeur",
    confirm: "Confirmer",
    renameEnvelope: "Renommer l'enveloppe",
    renameEnvelopeDesc: "Modifie le nom de ton enveloppe.",
    newNamePlaceholder: "Nouveau nom",
    save: "Sauvegarder",
    rolloverChangeTitle: "Modifier le rollover ?",
    rolloverChangeDesc: "Confirme le changement pour l’enveloppe",
    currentState: "État actuel",
    afterConfirm: "Après confirmation",
    rolloverEnableBullets: [
      "Le solde restant reste dans l’enveloppe et se reporte sur la période suivante.",
      "Les montants continuent de s’accumuler.",
    ],
    rolloverDisableBullets: [
      "Le solde restant sera transféré vers l’enveloppe Cash.",
      "L’enveloppe repassera à 0 au début de la nouvelle période.",
      "Un historique de transfert sera visible dans Cash et dans cette enveloppe.",
    ],
    rolloverTransferInfo:
      "Le transfert se déclenche quand une nouvelle période est créée (prochaine activité).",
    currentBalance: "Solde actuel",
    trendClosingBalance: "Tendance (solde de clôture par période)",
    periodHistory: "Historique des périodes",
    totalRemaining: "Reste total",
    allocatedBudget: "Budget alloué",
    totalSpent: "Total consommé",
    savingsBalance: "Épargne",
    searchPlaceholder: "Chercher une enveloppe...",
    filterAll: "Toutes",
    filterRolloverOff: "Rollover OFF",
    filterRolloverOn: "Rollover ON",
    filterWatch: "À surveiller",
    filterFixed: "Fixes",
    filterFlex: "Flexibles",
    attentionTitle: "À régler",
    attentionDesc: "Enveloppes à découvert : couvre-les avant la clôture.",
    noFilterResults: "Aucune enveloppe ne correspond à ta recherche.",
    noPeriodsYet: "Aucune période pour l'instant. Commence avec une allocation ou une transaction.",
    period: "Période",
    allocated: "Alloué",
    spent: "Dépensé",
    closing: "Clôture",
    recentActivity: "Activité récente",
    deleting: "Suppression...",
    deleteAll: "Supprimer tout",
    noActivityYet: "Aucune activité enregistrée pour l’instant.",
    noBudgetYet: "Aucun budget défini",
    noDescription: "Pas de description",
    transferLogs: "Historique des transferts",
    noTransfers: "Aucun transfert enregistré.",
    transferFrom: (name: string) => `Transfert depuis ${name}`,
    transferTo: (name: string) => `Transfert vers ${name}`,
    manualCorrections: "Corrections manuelles",
    noCorrections: "Aucune correction enregistrée.",
    manualCorrectionLabel: "Correction manuelle",
    previousNewDelta: (previous: string, next: string, delta: string) =>
      `Ancien: ${previous} · Nouveau: ${next} · Delta: ${delta}`,
    packs: {
      essentiels: { label: "Essentiels", description: "Charges fixes et indispensables." },
      famille: { label: "Famille", description: "Vie de famille et enfants." },
      style: { label: "Style de vie", description: "Loisirs et sorties." },
      epargne: { label: "Épargne", description: "Objectifs d'épargne." },
      dettes: { label: "Dettes", description: "Crédits et remboursements." },
      pro: { label: "Pro", description: "Dépenses liées au travail." },
    },
    presetNames: {
      rent: "Loyer",
      bills: "Factures",
      groceries: "Courses",
      transport: "Transport",
      health: "Santé",
      school: "École",
      activities: "Activités",
      childcare: "Garde",
      kids_clothes: "Vêtements enfants",
      restaurants: "Restaurants",
      going_out: "Sorties",
      travel: "Voyage",
      gifts: "Cadeaux",
      short_savings: "Épargne court terme",
      long_savings: "Épargne long terme",
      emergencies: "Urgences",
      credit: "Crédit",
      repayments: "Remboursements",
      insurance: "Assurance",
      equipment: "Matériel",
      training: "Formation",
      work_travel: "Déplacements pro",
    } as Record<string, string>,
  },
  en: {
    pageTitle: "Envelopes",
    pageSubtitle: "Balances reflect the current period.",
    totalRemaining: "Total remaining",
    allocatedBudget: "Allocated budget",
    totalSpent: "Total spent",
    savingsBalance: "Savings",
    searchPlaceholder: "Search an envelope...",
    filterAll: "All",
    filterRolloverOff: "Rollover OFF",
    filterRolloverOn: "Rollover ON",
    filterWatch: "To watch",
    filterFixed: "Fixed",
    filterFlex: "Flexible",
    attentionTitle: "To resolve",
    attentionDesc: "Overdrawn envelopes: cover them before cycle close.",
    noFilterResults: "No envelope matches your search.",
    loading: "Loading...",
    unknownError: "Unknown error",
    guestEnvelopeCap: `In discovery mode you can create up to ${GUEST_LIMITS.envelopes} envelopes. Create your free account for as many as you want — your current envelopes are kept.`,
    spendingTrend: "Spending trend",
    noSelection: "No envelope selected.",
    selectAtLeastOneEnvelope: "Select at least one envelope.",
    nothingToChange: "Nothing to change.",
    selectedAlreadySameStatus: "Selected envelopes already have this status.",
    bulkUpdateSuccess: (enabled: boolean, count: number) =>
      `Rollover ${enabled ? "enabled" : "disabled"} for ${count} envelope(s).`,
    updateFailed: "Update failed.",
    updateSuccess: "Update successful.",
    rolloverOffForbiddenProfile:
      "Rollover OFF is forbidden for Debts, Goals, and Fixed Expenses. These envelopes must stay on rollover ON.",
    envelopeNameRequired: "Envelope name is required.",
    reservedNames: "Cash and Savings are reserved names.",
    cannotDeleteEnvelope: "This envelope cannot be deleted.",
    deleteSuccess: "Deleted successfully.",
    envelopeDeleted: (name: string) => `Envelope \"${name}\" was deleted.`,
    validAmount: "Enter a valid amount (>= 0).",
    correctionApplied: "Correction applied.",
    budgetUpdated: "Budget has been updated.",
    correctionFailed: "Correction failed.",
    nothingToAdd: "Nothing to add.",
    allEnvelopesExist: "All selected envelopes already exist.",
    addSuccess: "Added successfully.",
    addCreated: (count: number) => `${count} envelope(s) added.`,
    addFailed: "Add failed.",
    deleteActivityConfirm: "Delete this activity?",
    activityDeleted: "Activity deleted.",
    deleteAllActivityConfirm: "Delete all activity for this envelope?",
    allActivitiesDeleted: "All activity has been deleted.",
    currentBalances: "Current balances",
    collectiveRollover: "Bulk rollover",
    selectEnvelopesToEdit: "Select envelopes to edit.",
    select: "Select",
    bulkRolloverTitle: "Bulk update rollover?",
    bulkRolloverDesc: "This updates all editable envelopes.",
    selectAll: "Select all",
    selectedCount: (count: number) => `${count} selected`,
    rolloverOn: "Rollover ON",
    rolloverOff: "Rollover OFF",
    cancel: "Cancel",
    enable: "Enable",
    disable: "Disable",
    noEnvelopes: "No envelopes yet",
    createToStart: "Create an envelope to start budgeting.",
    fixedAmountGroupTitle: "Fixed-amount envelopes",
    fixedAmountGroupDesc:
      "These envelopes receive a fixed amount from your active distribution setup.",
    noFixedAmountInSection: "No fixed-amount envelope in this section.",
    nonFixedAmountGroupTitle: "Non-fixed envelopes",
    nonFixedAmountGroupDesc:
      "These envelopes do not have an active fixed amount and are funded by the remaining budget.",
    noNonFixedAmountInSection: "No non-fixed envelope in this section.",
    cash: "Cash",
    savings: "Savings",
    locked: "Locked",
    viewDetails: "View details",
    rename: "Rename",
    correction: "Correction",
    lockedSuffix: " (locked)",
    delete: "Delete",
    createEnvelope: "Create envelope",
    addEnvelope: "Add envelope",
    newEnvelope: "New envelope",
    addEnvelopeDesc: "Add an envelope to organize your budget.",
    envelopeNamePlaceholder: "Envelope name",
    isDebtLabel: "This is a debt / credit",
    isDebtHint: "The balance carries over month to month and is never swept into savings.",
    add: "Add",
    advancedSettings: "Advanced settings",
    advancedSettingsTitle: "Advanced settings",
    advancedSettingsDesc:
      "Choose packs or add a quick envelope list. Allocation happens later from the Distribution page.",
    quickList: "Add a quick list",
    quickListPlaceholder: "Ex: Vacation, Car, Pets",
    suggestedEnvelopes: "Suggested envelopes",
    choosePackOrList: "Choose a pack or add a list.",
    deleteEnvelope: "Delete envelope",
    deleteEnvelopeDesc:
      "Transactions and current budget from this envelope will be transferred into Cash. This keeps balances consolidated and preserves history in Cash.",
    transferFromEnvelope: "Transfer from envelope",
    manualCorrection: "Manual correction",
    manualCorrectionDesc:
      "This correction is manual. Check your numbers before continuing. You are responsible for the adjustment.",
    currentBudgetModified: "This action changes the current envelope budget.",
    continue: "Continue",
    newValue: "New value",
    newValueDesc: "Change the current envelope budget.",
    back: "Back",
    confirmCorrection: "Confirm correction",
    confirmCorrectionDesc: "Review the old and new values.",
    oldValue: "Old value",
    confirm: "Confirm",
    renameEnvelope: "Rename envelope",
    renameEnvelopeDesc: "Change your envelope name.",
    newNamePlaceholder: "New name",
    save: "Save",
    rolloverChangeTitle: "Change rollover?",
    rolloverChangeDesc: "Confirm the change for envelope",
    currentState: "Current state",
    afterConfirm: "After confirmation",
    rolloverEnableBullets: [
      "Remaining balance stays in the envelope and rolls into the next period.",
      "Amounts continue to accumulate.",
    ],
    rolloverDisableBullets: [
      "Remaining balance will be transferred to Cash.",
      "The envelope resets to 0 at the start of the next period.",
      "Transfer history stays visible in Cash and this envelope.",
    ],
    rolloverTransferInfo:
      "The transfer runs when a new period is created (next activity).",
    currentBalance: "Current balance",
    trendClosingBalance: "Trend (closing balance by period)",
    periodHistory: "Period history",
    noPeriodsYet: "No periods yet. Start with an allocation or a transaction.",
    period: "Period",
    allocated: "Allocated",
    spent: "Spent",
    closing: "Closing",
    recentActivity: "Recent activity",
    deleting: "Deleting...",
    deleteAll: "Delete all",
    noActivityYet: "No activity recorded yet.",
    noBudgetYet: "No budget set",
    noDescription: "No description",
    transferLogs: "Transfer logs",
    noTransfers: "No transfers recorded.",
    transferFrom: (name: string) => `Transfer from ${name}`,
    transferTo: (name: string) => `Transfer to ${name}`,
    manualCorrections: "Manual corrections",
    noCorrections: "No corrections recorded.",
    manualCorrectionLabel: "Manual correction",
    previousNewDelta: (previous: string, next: string, delta: string) =>
      `Previous: ${previous} · New: ${next} · Delta: ${delta}`,
    packs: {
      essentiels: { label: "Essentials", description: "Fixed and essential costs." },
      famille: { label: "Family", description: "Family and children life." },
      style: { label: "Lifestyle", description: "Leisure and going out." },
      epargne: { label: "Savings", description: "Savings goals." },
      dettes: { label: "Debt", description: "Credit and repayments." },
      pro: { label: "Work", description: "Work-related expenses." },
    },
    presetNames: {
      rent: "Rent",
      bills: "Bills",
      groceries: "Groceries",
      transport: "Transport",
      health: "Health",
      school: "School",
      activities: "Activities",
      childcare: "Childcare",
      kids_clothes: "Kids clothes",
      restaurants: "Restaurants",
      going_out: "Going out",
      travel: "Travel",
      gifts: "Gifts",
      short_savings: "Short-term savings",
      long_savings: "Long-term savings",
      emergencies: "Emergency fund",
      credit: "Credit",
      repayments: "Repayments",
      insurance: "Insurance",
      equipment: "Equipment",
      training: "Training",
      work_travel: "Work travel",
    } as Record<string, string>,
  },
  ar: {
    pageTitle: "الأظرفة",
    pageSubtitle: "الأرصدة كتعكس الفترة الحالية.",
    totalRemaining: "الباقي الإجمالي",
    allocatedBudget: "الميزانية الموزعة",
    totalSpent: "المصروف الإجمالي",
    savingsBalance: "الادخار",
    searchPlaceholder: "قلب على شي ظرف...",
    filterAll: "الكل",
    filterRolloverOff: "Rollover OFF",
    filterRolloverOn: "Rollover ON",
    filterWatch: "للمراقبة",
    filterFixed: "ثابتة",
    filterFlex: "مرنة",
    attentionTitle: "للتسوية",
    attentionDesc: "أظرفة برصيد سلبي : سوّيها قبل نهاية الدورة.",
    noFilterResults: "حتى ظرف ما كيطابق هاد البحث.",
    loading: "كيتحمّل...",
    unknownError: "وقع مشكل غير معروف",
    guestEnvelopeCap: `ف وضع الاكتشاف تقدر تصاوب حتى ${GUEST_LIMITS.envelopes} ظرف. صاوب حسابك المجاني باش يكونو عندك بلا حدود — الأظرفة اللي عندك دابا كتبقى محفوظة.`,
    spendingTrend: "منحنى الصرف",
    noSelection: "ما كاين حتى ظرف متختار.",
    selectAtLeastOneEnvelope: "اختار على الأقل ظرف واحد.",
    nothingToChange: "ما كاين ما يتبدل.",
    selectedAlreadySameStatus: "الأظرفة اللي مختارة راهم دابا بنفس الحالة.",
    bulkUpdateSuccess: (enabled: boolean, count: number) =>
      `تم ${enabled ? "تفعيل" : "طفي"} الترحيل فـ ${count} ظرف.`,
    updateFailed: "التحديث ما نجحش.",
    updateSuccess: "التحديث نجح.",
    rolloverOffForbiddenProfile:
      "Rollover OFF ممنوع على الديون، الأهداف، والمصاريف الثابتة. هاد الأظرفة خاصها تبقى rollover ON.",
    envelopeNameRequired: "اسم الظرف ضروري.",
    reservedNames: "لكاش والادخار أسماء محجوزة.",
    cannotDeleteEnvelope: "هاد الظرف ما يمكنش يتحيد.",
    deleteSuccess: "الحدف نجح.",
    envelopeDeleted: (name: string) => `تحيّد الظرف \"${name}\".`,
    validAmount: "دخل مبلغ صحيح (>= 0).",
    correctionApplied: "التصحيح تطبّق.",
    budgetUpdated: "تم تحديث الميزانية.",
    correctionFailed: "التصحيح ما نجحش.",
    nothingToAdd: "ما كاين ما يتزاد.",
    allEnvelopesExist: "كاع الأظرفة اللي تختارو راهم موجودين دابا.",
    addSuccess: "الإضافة نجحات.",
    addCreated: (count: number) => `تزادو ${count} ظرف/أظرفة.`,
    addFailed: "الإضافة ما نجحاتش.",
    deleteActivityConfirm: "بغيتي تمسح هاد النشاط؟",
    activityDeleted: "النشاط تحيّد.",
    deleteAllActivityConfirm: "بغيتي تمسح جميع الأنشطة ديال هاد الظرف؟",
    allActivitiesDeleted: "تتحيدو جميع الأنشطة.",
    currentBalances: "الأرصدة الحالية",
    collectiveRollover: "الترحيل الجماعي",
    selectEnvelopesToEdit: "اختار الأظرفة اللي بغيتي تبدل ليهم.",
    select: "اختار",
    bulkRolloverTitle: "بغيتي تبدل الترحيل جماعياً؟",
    bulkRolloverDesc: "هاد العملية غادي تبدل جميع الأظرفة اللي يمكن تعديلها.",
    selectAll: "اختار الكل",
    selectedCount: (count: number) => `${count} مختار`,
    rolloverOn: "الترحيل شاعل",
    rolloverOff: "الترحيل طافي",
    cancel: "إلغاء",
    enable: "فعّل",
    disable: "طفي",
    noEnvelopes: "ما كاين حتى ظرف دابا",
    createToStart: "زيد ظرف باش تبدا تنظم الميزانية.",
    fixedAmountGroupTitle: "أظرفة بمبلغ ثابت",
    fixedAmountGroupDesc:
      "هاد الأظرفة كيوصلها مبلغ ثابت من إعدادات التوزيع الخدامة.",
    noFixedAmountInSection: "ما كاين حتى ظرف بمبلغ ثابت فهاد القسم.",
    nonFixedAmountGroupTitle: "أظرفة بلا مبلغ ثابت",
    nonFixedAmountGroupDesc:
      "هاد الأظرفة ما عندهاش مبلغ ثابت فعّال وكتتغذى من الباقي ديال الميزانية.",
    noNonFixedAmountInSection: "ما كاين حتى ظرف بلا مبلغ ثابت فهاد القسم.",
    cash: "لكاش",
    savings: "الادخار",
    locked: "مقفول",
    viewDetails: "شوف التفاصيل",
    rename: "بدّل الاسم",
    correction: "تصحيح",
    lockedSuffix: " (مقفول)",
    delete: "حيد",
    createEnvelope: "إدارة الأظرفة",
    addEnvelope: "+ ظرف جديد",
    newEnvelope: "ظرف جديد",
    addEnvelopeDesc: "زيد ظرف باش تنظم الميزانية ديالك.",
    envelopeNamePlaceholder: "اسم الظرف",
    isDebtLabel: "هادي دَّين / كريدي",
    isDebtHint: "الرصيد كيبقى من شهر لشهر وما كيتبالاش نحو التوفير.",
    add: "زيد",
    advancedSettings: "إعدادات متقدمة",
    advancedSettingsTitle: "الإعدادات المتقدمة",
    advancedSettingsDesc:
      "اختار packs ولا زيد لائحة سريعة ديال الأظرفة. التوزيع كتديرو من بعد فصفحة التوزيع.",
    quickList: "زيد لائحة سريعة",
    quickListPlaceholder: "مثال: عطلة، طوموبيل، حيوانات",
    suggestedEnvelopes: "الأظرفة المقترحة",
    choosePackOrList: "اختار pack ولا زيد لائحة.",
    deleteEnvelope: "حيد الظرف",
    deleteEnvelopeDesc:
      "المعاملات والميزانية الحالية ديال هاد الظرف غادي يتحولو لظرف لكاش. هكذا كيبقاو الأرصدة مجمّعين والتاريخ محفوظ فلكاش.",
    transferFromEnvelope: "تحويل من الظرف",
    manualCorrection: "تصحيح يدوي",
    manualCorrectionDesc:
      "هاد التصحيح يدوي وكيبدل الرصيد الحالي فقط. راجع الحساب مزيان قبل ما تكمل.",
    currentBudgetModified: "تأكد من الرصيد الحالي ومن الظرف قبل المتابعة.",
    continue: "كمل",
    newValue: "القيمة الجديدة",
    newValueDesc: "بدل الميزانية الحالية ديال الظرف.",
    back: "رجوع",
    confirmCorrection: "أكد التصحيح",
    confirmCorrectionDesc: "راجع القيمة القديمة والجديدة.",
    oldValue: "القيمة القديمة",
    confirm: "أكد",
    renameEnvelope: "بدل اسم الظرف",
    renameEnvelopeDesc: "بدل الاسم ديال الظرف ديالك.",
    newNamePlaceholder: "الاسم الجديد",
    save: "حفظ",
    rolloverChangeTitle: "بغيتي تبدل الترحيل؟",
    rolloverChangeDesc: "أكد التبديل فالظرف",
    currentState: "الحالة الحالية",
    afterConfirm: "من بعد التأكيد",
    rolloverEnableBullets: [
      "الرصيد اللي بقى كيبقى فالظرف وكيتنقل للفترة الجاية.",
      "المبالغ كتبقى كتتجمع.",
    ],
    rolloverDisableBullets: [
      "الرصيد اللي بقى غادي يتحول لظرف لكاش.",
      "الظرف غادي يرجع لـ 0 فبداية الفترة الجاية.",
      "التاريخ ديال التحويل غادي يبقى باين فلكاش وفهاد الظرف.",
    ],
    rolloverTransferInfo:
      "التحويل كيتدار ملي كتتبنى فترة جديدة، يعني مع أول نشاط جديد.",
    currentBalance: "الرصيد الحالي",
    trendClosingBalance: "تطور الرصيد مع الوقت",
    periodHistory: "ملخص الفترات",
    noPeriodsYet: "ما كاينة حتى فترة دابا. بدا بتوزيع ولا معاملة باش يبان التاريخ.",
    period: "الفترة",
    allocated: "المبلغ المخصص",
    spent: "مصروف",
    closing: "الرصيد النهائي",
    recentActivity: "آخر الحركات",
    deleting: "كيتمسح...",
    deleteAll: "مسح الكل",
    noActivityYet: "ما كاين حتى حركة متسجلة فهاد الظرف دابا.",
    noBudgetYet: "ما كايناش ميزانية دابا",
    noDescription: "ما كاين حتى وصف",
    transferLogs: "التحويلات",
    noTransfers: "ما كاين حتى تحويل مرتبط بهاد الظرف.",
    transferFrom: (name: string) => `تحويل من ${name}`,
    transferTo: (name: string) => `تحويل لــ ${name}`,
    manualCorrections: "التصحيحات اليدوية",
    noCorrections: "ما كاين حتى تصحيح يدوي متسجل.",
    manualCorrectionLabel: "تصحيح يدوي",
    previousNewDelta: (previous: string, next: string, delta: string) =>
      `القديم: ${previous} · الجديد: ${next} · الفرق: ${delta}`,
    packs: {
      essentiels: { label: "الأساسيات", description: "المصاريف الثابتة والضرورية." },
      famille: { label: "العائلة", description: "مصاريف العائلة والوليدات." },
      style: { label: "المعيشة", description: "الترفيه والخروجات." },
      epargne: { label: "الادخار", description: "أهداف الادخار." },
      dettes: { label: "الديون", description: "الديون والتسديدات." },
      pro: { label: "الخدمة", description: "مصاريف مرتبطة بالخدمة." },
    },
    presetNames: {
      rent: "الكراء",
      bills: "لفواتير",
      groceries: "الماكلة",
      transport: "التنقل",
      health: "الصحة",
      school: "المدرسة",
      activities: "الأنشطة",
      childcare: "الحضانة",
      kids_clothes: "حوايج الوليدات",
      restaurants: "المطاعم",
      going_out: "الخروجات",
      travel: "السفر",
      gifts: "الهدايا",
      short_savings: "ادخار قريب",
      long_savings: "ادخار بعيد",
      emergencies: "الطوارئ",
      credit: "القرض",
      repayments: "التسديدات",
      insurance: "التأمين",
      equipment: "المعدات",
      training: "التكوين",
      work_travel: "تنقلات الخدمة",
    } as Record<string, string>,
  },
} satisfies Record<FloussyLocale, Record<string, unknown>>;

const SYSTEM_ENVELOPE_NAME_MAP: Record<string, { fr: string; en: string; ar: string }> = {
  cash: { fr: "Cash", en: "Cash", ar: "لكاش" },
  epargne: { fr: "Épargne", en: "Savings", ar: "الادخار" },
  savings: { fr: "Épargne", en: "Savings", ar: "الادخار" },
  dettes: { fr: "Dettes", en: "Debts", ar: "الديون" },
  credit: { fr: "Crédit", en: "Credit", ar: "كريدي" },
  nourriture: { fr: "Nourriture", en: "Food", ar: "الماكلة" },
  sante: { fr: "Santé", en: "Health", ar: "الصحة" },
  charges: { fr: "Charges", en: "Housing costs", ar: "مصاريف السكن" },
  factures: { fr: "Factures", en: "Bills", ar: "لفواتير" },
  loyer: { fr: "Loyer", en: "Rent", ar: "الكراء" },
  loisirs: { fr: "Loisirs", en: "Leisure", ar: "الترفيه" },
  restaurants: { fr: "Restaurants", en: "Restaurants", ar: "المطاعم" },
  shopping: { fr: "Shopping", en: "Shopping", ar: "التسوق" },
  transport_public: { fr: "Transport public", en: "Public transport", ar: "النقل العمومي" },
  taxi_vtc: { fr: "Taxi / VTC", en: "Taxi / Ride-hailing", ar: "تاكسي / نقل خاص" },
  "imprévus": { fr: "Imprévus / طوارئ", en: "Emergency", ar: "الطوارئ" },
  imprevus: { fr: "Imprévus / طوارئ", en: "Emergency", ar: "الطوارئ" },
  famille_aide: { fr: "Famille — Aide", en: "Family — Support", ar: "مساعدة العائلة" },
  flexibilite: { fr: "Flexibilité", en: "Flexibility", ar: "المرونة" },
  flex: { fr: "Flexibilité", en: "Flexibility", ar: "المرونة" },
  equilibre: { fr: "Équilibre", en: "Balance", ar: "التوازن" },
};

const formatMoney = (value: string | number | undefined) => {
  if (value === undefined) return "0.00";
  if (typeof value === "number") return value.toFixed(2);
  return value;
};

const formatMoneyWithCurrency = (value: string | number | undefined) =>
  `${formatMoney(value)} MAD`;

const formatDateTime = (value: string | undefined, locale: FloussyLocale) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(LOCALE_TO_BCP47[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatLocalDate = (value: string | undefined, locale: FloussyLocale) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(LOCALE_TO_BCP47[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function EnvelopesPage() {
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const currentRef = useRef<HTMLDivElement | null>(null);
  const createRef = useRef<HTMLDivElement | null>(null);
  const advancedRef = useRef<HTMLDivElement | null>(null);
  const [envToast, setEnvToast] = useState<EnvToast | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const toast = useCallback(
    ({ title, description, variant }: { title: string; description?: string; variant?: "success" | "danger" | "default" }) => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      setEnvToast({ id: Date.now(), text: description ? `${title} ${description}` : title, bad: variant === "danger" });
      toastTimerRef.current = window.setTimeout(() => setEnvToast(null), 4200);
    },
    []
  );
  const fetcher = (url: string) => apiFetch<any>(url);

  const { data: dashboardData, error: dashboardError, mutate: mutateDashboard } = useSWR<DashboardOut>("/dashboard", () => fetchDashboard());
  const dashboard = dashboardData ?? null;

  const { data: envelopesData, error: envelopesError, mutate: mutateEnvelopes } = useSWR<EnvelopeOut[]>("/envelopes", fetcher);
  const envelopes = envelopesData ?? [];

  const { data: meData } = useSWR<AuthUser>("/auth/me", fetcher);
  const isGuest = Boolean(meData?.is_guest);
  // How many more envelopes a "Mode Découverte" guest may create before the cap.
  const guestEnvelopeQuota = checkEnvelopeQuota(isGuest ? envelopes.length : 0);

  const { data: categoriesData, error: categoriesError } = useSWR<CategoryOut[]>("/categories", fetcher);
  const categories = categoriesData ?? [];

  const { data: mappingsList, error: mappingsError } = useSWR<CategoryEnvelopeMapOut[]>("/mappings", fetcher);

  const { data: transactionsData, error: transactionsError, mutate: mutateTransactions } = useSWR<TransactionOut[]>("/transactions", fetcher);
  const transactions = transactionsData ?? [];

  const { data: savedConfigsData, mutate: mutateSavedConfigs } = useSWR<DistributionSavedConfig[]>("/distribution/configs", fetcher);
  const savedConfigs = savedConfigsData ?? [];

  const { data: goalsData, mutate: mutateGoals } = useSWR<GoalOut[]>("/goals", fetcher);
  const goals = goalsData ?? [];

  const { data: onboardingRecords } = useSWR<OnboardingV2RecordOut[]>("/users/me/onboarding-v2-records?limit=1", fetcher);
  const onboardingRecord = onboardingRecords?.[0] ?? null;

  const { data: distributionRulesData, mutate: mutateDistributionRules } = useSWR<DistributionRule[]>("/distribution/rules", fetcher);
  const distributionRules = distributionRulesData ?? [];

  const mappings = useMemo(() => {
    if (!mappingsList) return {};
    return mappingsList.reduce<Record<string, string>>(
      (acc, item) => ({
        ...acc,
        [item.category_id]: item.envelope_id,
      }),
      {}
    );
  }, [mappingsList]);

  const [balanceOverrides, setBalanceOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mutateAll = async () => {
    await Promise.all([
      mutateDashboard(),
      mutateEnvelopes(),
      mutateTransactions(),
      mutateSavedConfigs(),
      mutateGoals(),
      mutateDistributionRules(),
    ]);
  };

  const [newName, setNewName] = useState("");
  const [newIsDebt, setNewIsDebt] = useState(false);
  const [newIsDebtManual, setNewIsDebtManual] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingIsDebt, setEditingIsDebt] = useState(false);
  const [editingCanDebt, setEditingCanDebt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [envelopeFilter, setEnvelopeFilter] = useState<"all" | "watch" | "neg" | "off">("all");
  const [updating, setUpdating] = useState(false);
  const [rolloverUpdatingId, setRolloverUpdatingId] = useState<string | null>(null);
  const [rolloverDialogOpen, setRolloverDialogOpen] = useState(false);
  const [rolloverTarget, setRolloverTarget] = useState<EnvelopeOut | null>(null);
  const [rolloverNextValue, setRolloverNextValue] = useState(false);
  const [bulkRolloverOpen, setBulkRolloverOpen] = useState(false);
  const [bulkRolloverLoading, setBulkRolloverLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EnvelopeOut | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionStep, setCorrectionStep] = useState<1 | 2 | 3>(1);
  const [correctionTarget, setCorrectionTarget] = useState<EnvelopeOut | null>(
    null
  );
  const [correctionValue, setCorrectionValue] = useState("");
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [correctionSaving, setCorrectionSaving] = useState(false);

  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(
    null
  );
  const [periods, setPeriods] = useState<EnvelopePeriodOut[]>([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [activityDeletingId, setActivityDeletingId] = useState<string | null>(
    null
  );
  const [activityDeletingAll, setActivityDeletingAll] = useState(false);
  const [transferLogs, setTransferLogs] = useState<EnvelopeTransferLogOut[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [adjustmentLogs, setAdjustmentLogs] = useState<EnvelopeAdjustmentLogOut[]>([]);
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedSaving, setAdvancedSaving] = useState(false);
  const [advancedPackKeys, setAdvancedPackKeys] = useState<string[]>([]);
  const [advancedPresetList, setAdvancedPresetList] = useState<string[]>([]);
  const [advancedSelectedNames, setAdvancedSelectedNames] = useState<string[]>([]);
  const [advancedCustomText, setAdvancedCustomText] = useState("");
  const [mounted, setMounted] = useState(false);
  const [sortBy, setSortBy] = useState<"perso" | "bal" | "pct" | "name">("perso");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"ov" | "tx" | "log">("ov");
  const [quickTarget, setQuickTarget] = useState<EnvelopeOut | null>(null);
  const [quickAmount, setQuickAmount] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  const [rollDraft, setRollDraft] = useState<Record<string, boolean>>({});
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [txDeleteTarget, setTxDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [coveringId, setCoveringId] = useState<string | null>(null);
  const autoFixRunningRef = useRef(false);
  const copy = ENVELOPES_COPY[locale];
  const pageDir = getLocaleDirection(locale);
  const issue = getIssueDisplay(error, locale);
  const issueParam = searchParams.get("issue");
  const notificationIssueGuidance = useMemo(() => {
    if (issueParam !== "overspent-envelopes") return null;
    return {
      title:
        locale === "ar"
          ? "تنبيه: شي أظرفة تجاوزو الميزانية"
          : locale === "en"
          ? "Alert: some envelopes are overspent"
          : "Alerte: des enveloppes sont dépassées",
      description:
        locale === "ar"
          ? "راجع الأظرفة اللي فالناقص وصحّح المصاريف، أو دير تحويل/تصحيح للتوازن."
          : locale === "en"
          ? "Review negative envelopes, then fix expenses or rebalance with transfer/correction."
          : "Vérifie les enveloppes en négatif puis corrige les dépenses, ou rééquilibre via transfert/correction.",
    };
  }, [issueParam, locale]);

  useEffect(() => {
    const syncLocale = () => {
      setLocale(getBrowserLocalePreference() ?? "fr");
    };
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    };
  }, []);

  useEffect(() => {
    const swrLoading =
      !dashboardData && !dashboardError &&
      !envelopesData && !envelopesError &&
      !categoriesData && !categoriesError;
    setLoading(swrLoading);
  }, [dashboardData, dashboardError, envelopesData, envelopesError, categoriesData, categoriesError]);

  useEffect(() => {
    const anyError = dashboardError || envelopesError || categoriesError || mappingsError || transactionsError;
    if (anyError) {
      const message = anyError instanceof Error ? anyError.message : String(anyError);
      setError(message);
    } else {
      setError(null);
    }
  }, [dashboardError, envelopesError, categoriesError, mappingsError, transactionsError]);

  useEffect(() => {
    if (!envelopes || envelopes.length === 0) return;
    let active = true;
    const fetchOverrides = async () => {
      try {
        const periodResults = await Promise.allSettled(
          envelopes.map((env) => apiFetch<EnvelopePeriodOut[]>(`/envelopes/${env.id}/periods`))
        );
        if (!active) return;
        const overrides: Record<string, string> = {};
        periodResults.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value.length > 0) {
            overrides[envelopes[index].id] = result.value[0].closing_balance;
          }
        });
        setBalanceOverrides(overrides);
      } catch (err) {
        console.error("Failed to load period balances", err);
      }
    };
    fetchOverrides();
    return () => {
      active = false;
    };
  }, [envelopes]);

  const loadData = async () => {
    await mutateAll();
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!advancedOpen) {
      setAdvancedPackKeys((prev) => (prev.length ? [] : prev));
      setAdvancedPresetList((prev) => (prev.length ? [] : prev));
      setAdvancedSelectedNames((prev) => (prev.length ? [] : prev));
      setAdvancedCustomText("");
    }
  }, [advancedOpen]);

  useEffect(() => {
    if (!correctionOpen) {
      setCorrectionStep(1);
      setCorrectionTarget(null);
      setCorrectionValue("");
      setCorrectionError(null);
    }
  }, [correctionOpen]);

  const customEnvelopeList = useMemo(() => {
    const raw = advancedCustomText
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return Array.from(new Set(raw));
  }, [advancedCustomText]);

  const localizedPresetPacks = useMemo(
    () =>
      ENVELOPE_PRESET_PACKS.map((pack) => ({
        ...pack,
        label: copy.packs[pack.key as keyof typeof copy.packs].label,
        description: copy.packs[pack.key as keyof typeof copy.packs].description,
        envelopes: pack.envelopeKeys.map((key) => copy.presetNames[key]),
      })),
    [copy]
  );

  const normalizeSystemEnvelopeKey = (rawName: string) => {
    const normalized = rawName
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes("dettes") || normalized.includes("debt") || normalized.includes("الديون")) return "dettes";
    if (normalized === "credit") return "credit";
    if (normalized.includes("famille") && normalized.includes("aide")) return "famille_aide";
    if (normalized.includes("transport public")) return "transport_public";
    if (normalized.includes("taxi") || normalized.includes("vtc")) return "taxi_vtc";
    if (normalized.includes("imprevus") || normalized.includes("urgence") || normalized.includes("emergency")) {
      return "imprevus";
    }
    if (normalized.includes("epargne") || normalized.includes("saving")) return "epargne";
    if (normalized.includes("equilibre") || normalized.includes("balance")) return "equilibre";
    if (normalized.includes("flexibilite") || normalized === "flex" || normalized.includes("merouna")) {
      return "flexibilite";
    }
    if (normalized === "cash") return "cash";
    if (normalized === "nourriture" || normalized === "food") return "nourriture";
    if (normalized === "sante" || normalized === "health") return "sante";
    if (normalized === "charges" || normalized === "housing costs") return "charges";
    if (normalized === "factures" || normalized === "bills") return "factures";
    if (normalized === "loyer" || normalized === "rent") return "loyer";
    if (normalized === "loisirs" || normalized === "leisure") return "loisirs";
    if (normalized === "restaurants") return "restaurants";
    if (normalized === "shopping") return "shopping";
    return normalized;
  };

  const isVirtualStructureEnvelopeName = (name: string) => {
    const key = normalizeSystemEnvelopeKey(name);
    return key === "flexibilite" || key === "equilibre";
  };
  const isDebtEnvelope = (env: EnvelopeOut) => {
    return Boolean(env.is_debt);
  };

  const isRolloverOffForbiddenEnvelope = (env: EnvelopeOut) => {
    const isDebt = isDebtEnvelope(env);
    const isFixedActive = fixedEnvelopeIdSet.has(env.id);
    return Boolean(env.is_goal) || isDebt || isFixedActive;
  };

  const isEnvelopeLocked = (env: EnvelopeOut) =>
    env.is_cash ||
    env.is_default_savings ||
    env.is_goal ||
    env.deletable === false ||
    isVirtualStructureEnvelopeName(env.name);

  const localizeEnvelopeName = (name: string) => {
    const normalizedKey = normalizeSystemEnvelopeKey(name);
    if (normalizedKey === "dettes" && name.includes("—")) {
      const suffix = name.split("—").slice(1).join("—").trim();
      const suffixKey = normalizeSystemEnvelopeKey(suffix);
      const localizedSuffix =
        SYSTEM_ENVELOPE_NAME_MAP[suffixKey]?.[locale] ??
        localizeEnvelopeLabel(suffix, locale);
      if (locale === "ar") return `الديون — ${localizedSuffix}`;
      if (locale === "en") return `Debts — ${localizedSuffix}`;
      return `Dettes — ${localizedSuffix}`;
    }
    const mapped = SYSTEM_ENVELOPE_NAME_MAP[normalizedKey];
    if (mapped) {
      return mapped[locale];
    }
    return localizeEnvelopeLabel(name, locale);
  };

  useEffect(() => {
    if (!advancedOpen) return;

    if (advancedPackKeys.length === 0) {
      setAdvancedPresetList((prev) => (prev.length ? [] : prev));
      return;
    }

    const next = new Set<string>();
    advancedPackKeys.forEach((key) => {
      const pack = localizedPresetPacks.find((item) => item.key === key);
      pack?.envelopes.forEach((name) => next.add(name));
    });
    const sorted = Array.from(next).sort();
    setAdvancedPresetList(sorted);
    setAdvancedSelectedNames((prev) => {
      const prevSet = new Set(prev);
      const nextSet = new Set<string>(sorted);
      customEnvelopeList.forEach((name) => {
        if (prevSet.has(name)) nextSet.add(name);
      });
      return Array.from(nextSet).sort();
    });
  }, [advancedOpen, advancedPackKeys, customEnvelopeList, localizedPresetPacks]);

  const envelopeBalances = useMemo(() => {
    const map = new Map<string, string>();
    dashboard?.envelopes.forEach((item) => {
      map.set(item.envelope.id, item.balance.closing_balance);
    });
    return map;
  }, [dashboard]);

  const getEnvelopeBalance = (envId: string) => {
    return envelopeBalances.get(envId) ?? "0.00";
  };

  const sortedEnvelopes = useMemo(() => {
    const copy = envelopes.filter(
      (env) => !env.is_cash && !env.is_default_savings
    );
    return copy.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }, [envelopes]);
  const standardEnvelopes = useMemo(
    () => sortedEnvelopes.filter((env) => !env.is_goal && !isDebtEnvelope(env)),
    [sortedEnvelopes]
  );
  const rolloverOffEnvelopes = useMemo(
    () => standardEnvelopes.filter((env) => !env.rollover_enabled),
    [standardEnvelopes]
  );
  const rolloverOnEnvelopes = useMemo(
    () => standardEnvelopes.filter((env) => env.rollover_enabled),
    [standardEnvelopes]
  );

  const activeSavedConfig = useMemo(() => {
    return savedConfigs.find((config) => config.is_active) ?? null;
  }, [savedConfigs]);

  const activeSavedEnvelopeFixedRows = useMemo(() => {
    return (activeSavedConfig?.rows ?? []).filter((row) => {
      if (row.target_type !== "envelope") return false;
      if (!row.enabled || !isFixedMode(row.mode)) return false;
      const amount = Number(row.fixed_amount ?? "0");
      return Number.isFinite(amount) && amount > 0;
    });
  }, [activeSavedConfig]);

  // /distribution/apply and /simulate resolve income against the effective
  // distribution_rules table (rewritten on every config save = onboarding
  // baseline + the active config's rows), which is exactly what GET
  // /distribution/rules returns. The singular GET /distribution/config reads a
  // separate distribution_items table that apply/simulate never touch, so it
  // must not drive these badges. Live rules are authoritative; the active saved
  // config's fixed rows are folded in as a safety net for accounts whose rules
  // table predates materialization.
  const fixedEnvelopeIds = useMemo(() => {
    const ids = new Set<string>();

    (distributionRules ?? []).forEach((rule) => {
      if (rule.target_type === "envelope" && rule.enabled && isFixedMode(rule.mode)) {
        const amount = Number(rule.amount ?? "0");
        if (Number.isFinite(amount) && amount > 0) {
          ids.add(rule.target_id);
        }
      }
    });

    activeSavedEnvelopeFixedRows.forEach((row) => ids.add(row.target_id));

    return Array.from(ids);
  }, [activeSavedEnvelopeFixedRows, distributionRules]);

  const fixedEnvelopeIdSet = useMemo(() => new Set(fixedEnvelopeIds), [fixedEnvelopeIds]);
  const goalByEnvelopeId = useMemo(() => {
    const map = new Map<string, GoalOut>();
    goals.forEach((goal) => map.set(goal.envelope_id, goal));
    return map;
  }, [goals]);
  // The onboarding record response exposes only { answers, draft_objects,
  // materialized_state } - there is no top-level `debts` array - so per-debt
  // figures are read straight from the D1/D2/D3 answer fields.
  const debtRemainingByName = useMemo(() => {
    const map = new Map<string, number>();
    const payload = onboardingRecord?.payload as Record<string, unknown> | undefined;
    const answers = (payload?.answers ?? {}) as Record<string, unknown>;
    const rawCount = Number(answers.D1_debt_count ?? 0);
    const count = Number.isFinite(rawCount) ? Math.max(0, Math.min(20, Math.trunc(rawCount))) : 0;
    for (let index = 1; index <= count; index += 1) {
      const name =
        typeof answers[`D2_debt_name_${index}`] === "string"
          ? String(answers[`D2_debt_name_${index}`]).trim().toLowerCase()
          : "";
      const amount = Number(answers[`D3_debt_remaining_amount_${index}`] ?? 0);
      if (!name || !Number.isFinite(amount) || amount <= 0) continue;
      map.set(name, amount);
    }
    return map;
  }, [onboardingRecord]);

  // Debt envelopes are named "الديون — x" / "Dettes — x" after the debt itself.
  const lookupDebtRemaining = useCallback(
    (envelopeName: string): number | null => {
      const withoutPrefix = envelopeName
        .replace(/^\s*(الديون|dettes|dette|debts?)\s*[—–-]\s*/i, "")
        .trim()
        .toLowerCase();
      return (
        debtRemainingByName.get(withoutPrefix) ??
        debtRemainingByName.get(envelopeName.trim().toLowerCase()) ??
        null
      );
    },
    [debtRemainingByName]
  );

  const envelopeMap = useMemo(() => {
    const map = new Map<string, string>();
    envelopes.forEach((env) => {
      map.set(env.id, env.name);
    });
    return map;
  }, [envelopes]);

  const selectedEnvelope = useMemo(() => {
    return envelopes.find((env) => env.id === selectedEnvelopeId) ?? null;
  }, [envelopes, selectedEnvelopeId]);
  const defaultSavingsEnvelope = useMemo(() => {
    return envelopes.find((env) => env.is_default_savings) ?? null;
  }, [envelopes]);

  const envelopeTransactions = useMemo(() => {
    if (!selectedEnvelope) return [];
    const mappedCategories = new Set(
      Object.entries(mappings)
        .filter(([, envelopeId]) => envelopeId === selectedEnvelope.id)
        .map(([categoryId]) => categoryId)
    );

    return transactions.filter((tx) => {
      if (selectedEnvelope.is_cash) {
        return tx.type === "income";
      }
      if (tx.type !== "expense") return false;
      return mappedCategories.has(tx.category_id);
    });
  }, [selectedEnvelope, mappings, transactions]);

  const handleCreate = async () => {
    setError(null);

    const trimmed = newName.trim();
    if (!trimmed) {
      setError("ENVELOPE_NAME_REQUIRED");
      return;
    }
    if (RESERVED_NAMES.includes(trimmed.toLowerCase())) {
      setError("ENVELOPE_NAME_RESERVED");
      return;
    }
    if (isGuest && !guestEnvelopeQuota.allowed) {
      setError(copy.guestEnvelopeCap);
      if (!guestEnvelopeCapHitSent) {
        guestEnvelopeCapHitSent = true;
        guestEvent("guest_wall_hit", { wall: "envelopes_cap", route: "/envelopes" });
      }
      return;
    }

    try {
      setUpdating(true);
      await apiFetch<EnvelopeOut>("/envelopes", {
        method: "POST",
        body: {
          name: trimmed,
          // A debt / credit envelope must roll over so its repayment fund is
          // never swept into savings.
          rollover_enabled: newIsDebt,
          is_debt: newIsDebt,
        },
      });
      setNewName("");
      setNewIsDebt(false);
      setNewIsDebtManual(false);
      await loadData();
      setCreateOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = (env: EnvelopeOut) => {
    setEditingId(env.id);
    setEditingName(env.name);
    setEditingIsDebt(Boolean(env.is_debt));
    setEditingCanDebt(!env.is_goal && !env.is_cash && !env.is_default_savings);
    setRenameOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setError("ENVELOPE_NAME_REQUIRED");
      return;
    }
    // Distinct stored names can translate to one label - "aide famille" and
    // "famille — aide" both display as مساعدة العائلة - and the account then
    // shows two envelopes the user cannot tell apart, only one of which is
    // ever funded. Compare what will actually be on screen, not the raw input.
    const nextLabel = localizeEnvelopeName(trimmed).trim().toLowerCase();
    const clash = envelopes.find(
      (env) =>
        env.id !== editingId &&
        localizeEnvelopeName(env.name).trim().toLowerCase() === nextLabel
    );
    if (clash) {
      setError(
        locale === "ar"
          ? `كاين ظرف آخر كيتسمى "${localizeEnvelopeName(clash.name)}". بدّل السمية باش ما يتخلطوش.`
          : locale === "en"
          ? `Another envelope already shows as "${localizeEnvelopeName(clash.name)}". Pick a different name so the two stay distinguishable.`
          : `Une autre enveloppe s'affiche déjà comme « ${localizeEnvelopeName(clash.name)} ». Choisis un autre nom pour pouvoir les distinguer.`
      );
      return;
    }
    const editingEnvelope = envelopes.find((env) => env.id === editingId);
    const body: Record<string, unknown> = { name: trimmed };
    if (editingCanDebt && editingIsDebt !== Boolean(editingEnvelope?.is_debt)) {
      body.is_debt = editingIsDebt;
      // A debt envelope must roll over — flip it on in the same call so the
      // guard doesn't reject the change.
      if (editingIsDebt && !editingEnvelope?.rollover_enabled) {
        body.rollover_enabled = true;
      }
    }
    try {
      setUpdating(true);
      await apiFetch(`/envelopes/${editingId}`, {
        method: "PATCH",
        body,
      });
      setEditingId(null);
      setEditingName("");
      await loadData();
      setRenameOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleRollover = async (env: EnvelopeOut, nextValue: boolean) => {
    if (isEnvelopeLocked(env)) {
      return;
    }
    if (!nextValue && isRolloverOffForbiddenEnvelope(env)) {
      toast({
        title: copy.updateFailed,
        description: copy.rolloverOffForbiddenProfile,
        variant: "danger",
      });
      return;
    }
    setError(null);
    try {
      setRolloverUpdatingId(env.id);
      await apiFetch(`/envelopes/${env.id}`, {
        method: "PATCH",
        body: { rollover_enabled: nextValue },
      });
      await loadData();
    } catch (err) {
      const raw = err instanceof Error ? err.message : copy.unknownError;
      const message =
        raw.includes("ENVELOPE_ROLLOVER_OFF_FORBIDDEN_FOR_PROFILE")
          ? copy.rolloverOffForbiddenProfile
          : raw;
      setError(message);
    } finally {
      setRolloverUpdatingId(null);
    }
  };

  const handleBulkRollover = async (nextValue: boolean, ids: string[]) => {
    setBulkRolloverLoading(true);
    setError(null);
    try {
      const targets = envelopes.filter(
        (env) =>
          ids.includes(env.id) &&
          !isEnvelopeLocked(env) &&
          (nextValue || !isRolloverOffForbiddenEnvelope(env)) &&
          env.rollover_enabled !== nextValue
      );
      const blockedTargets = envelopes.filter(
        (env) =>
          ids.includes(env.id) &&
          !isEnvelopeLocked(env) &&
          !nextValue &&
          isRolloverOffForbiddenEnvelope(env)
      );

      if (ids.length === 0) {
        toast({
          title: copy.noSelection,
          description: copy.selectAtLeastOneEnvelope,
          variant: "danger",
        });
      } else if (targets.length === 0) {
        toast({
          title: copy.nothingToChange,
          description: copy.selectedAlreadySameStatus,
        });
      } else {
        await Promise.all(
          targets.map((env) =>
            apiFetch(`/envelopes/${env.id}`, {
              method: "PATCH",
              body: { rollover_enabled: nextValue },
            })
          )
        );
        await loadData();
        toast({
          title: copy.updateSuccess,
          description: copy.bulkUpdateSuccess(nextValue, targets.length),
          variant: "success",
        });
        if (blockedTargets.length > 0) {
          toast({
            title: copy.updateFailed,
            description: copy.rolloverOffForbiddenProfile,
            variant: "danger",
          });
        }
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : copy.unknownError;
      const message =
        raw.includes("ENVELOPE_ROLLOVER_OFF_FORBIDDEN_FOR_PROFILE")
          ? copy.rolloverOffForbiddenProfile
          : raw;
      setError(message);
      toast({
        title: copy.updateFailed,
        description: message,
        variant: "danger",
      });
    } finally {
      setBulkRolloverLoading(false);
    }
  };

  const handleDelete = async (env: EnvelopeOut) => {
    if (isEnvelopeLocked(env)) {
      setError("ENVELOPE_CANNOT_DELETE");
      return;
    }

    try {
      setUpdating(true);
      await apiFetch(`/envelopes/${env.id}`, { method: "DELETE" });
      await loadData();
      toast({
        title: copy.deleteSuccess,
        description: copy.envelopeDeleted(localizeEnvelopeName(env.name)),
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  const handleStartCorrection = (env: EnvelopeOut) => {
    setCorrectionTarget(env);
    setCorrectionValue(getEnvelopeBalance(env.id));
    setCorrectionStep(1);
    setCorrectionOpen(true);
  };

  const handleCorrectionContinue = () => {
    if (!correctionTarget) return;
    if (correctionStep === 1) {
      setCorrectionStep(2);
      return;
    }
    if (correctionStep === 2) {
      const next = correctionValue.trim();
      const value = Number(next);
      if (!next || !Number.isFinite(value) || value < 0) {
        setCorrectionError(copy.validAmount);
        return;
      }
      setCorrectionError(null);
      setCorrectionStep(3);
    }
  };

  const handleConfirmCorrection = async () => {
    if (!correctionTarget) return;
    setCorrectionSaving(true);
    setCorrectionError(null);
    try {
      await apiFetch(`/envelopes/${correctionTarget.id}/adjust`, {
        method: "POST",
        body: { new_balance: correctionValue },
      });
      setBalanceOverrides((prev) => ({
        ...prev,
        [correctionTarget.id]: correctionValue,
      }));
      await loadData();
      toast({
        title: copy.correctionApplied,
        description: copy.budgetUpdated,
        variant: "success",
      });
      setCorrectionOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setCorrectionError(message);
      toast({
        title: copy.correctionFailed,
        description: message,
        variant: "danger",
      });
    } finally {
      setCorrectionSaving(false);
    }
  };

  const handleAdvancedPackToggle = (key: string) => {
    setAdvancedPackKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const envelopeActivity = useMemo(() => {
    if (!selectedEnvelope) return [];
    return envelopeTransactions
      .slice()
      .filter((tx) => {
        const start = dashboard?.current_period?.start;
        const end = dashboard?.current_period?.end;
        if (!start || !end) return true;
        return tx.occurred_on >= start && tx.occurred_on <= end;
      })
      .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
      .map((tx) => {
        const category = categories.find((cat) => cat.id === tx.category_id);
        return {
          ...tx,
          category_name: category?.name ?? "-",
        };
      });
  }, [selectedEnvelope, envelopeTransactions, categories, dashboard]);

  const handleDeleteEnvelopeActivity = async (transactionId: string) => {
    setActivityDeletingId(transactionId);
    try {
      await apiFetch(`/transactions/${transactionId}`, { method: "DELETE" });
      await loadData();
      toast({
        title: copy.deleteSuccess,
        description: copy.activityDeleted,
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
      toast({ title: copy.updateFailed, description: message, variant: "danger" });
    } finally {
      setActivityDeletingId(null);
    }
  };

  const handleDeleteAllEnvelopeActivity = async () => {
    if (!selectedEnvelope) return;
    setActivityDeletingAll(true);
    try {
      const ids = envelopeActivity.map((tx) => tx.id);
      await Promise.all(
        ids.map((id) => apiFetch(`/transactions/${id}`, { method: "DELETE" }))
      );
      await loadData();
      toast({
        title: copy.deleteSuccess,
        description: copy.allActivitiesDeleted,
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
      toast({
        title: copy.updateFailed,
        description: message,
        variant: "danger",
      });
    } finally {
      setActivityDeletingAll(false);
    }
  };

  useEffect(() => {
    const loadPeriods = async () => {
      if (!selectedEnvelopeId) {
        setPeriods([]);
        setTransferLogs([]);
        return;
      }
      setPeriodLoading(true);
      setPeriodError(null);
      try {
        const data = await apiFetch<EnvelopePeriodOut[]>(
          `/envelopes/${selectedEnvelopeId}/periods?t=${Date.now()}`
        );
        setPeriods(data);
        if (data.length > 0) {
          setBalanceOverrides((prev) => ({
            ...prev,
            [selectedEnvelopeId]: data[0].closing_balance,
          }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : copy.unknownError;
        setPeriodError(message);
      } finally {
        setPeriodLoading(false);
      }
    };
    loadPeriods();
  }, [selectedEnvelopeId]);

  useEffect(() => {
    const loadTransferLogs = async () => {
      if (!selectedEnvelopeId) {
        setTransferLogs([]);
        return;
      }
      setTransferLoading(true);
      setTransferError(null);
      try {
        const data = await apiFetch<EnvelopeTransferLogOut[]>(
          `/envelopes/${selectedEnvelopeId}/transfer-logs?t=${Date.now()}`
        );
        setTransferLogs(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : copy.unknownError;
        setTransferError(message);
      } finally {
        setTransferLoading(false);
      }
    };
    loadTransferLogs();
  }, [selectedEnvelopeId]);

  useEffect(() => {
    const loadAdjustmentLogs = async () => {
      if (!selectedEnvelopeId) {
        setAdjustmentLogs([]);
        return;
      }
      setAdjustmentLoading(true);
      setAdjustmentError(null);
      try {
        const data = await apiFetch<EnvelopeAdjustmentLogOut[]>(
          `/envelopes/${selectedEnvelopeId}/adjustment-logs?t=${Date.now()}`
        );
        setAdjustmentLogs(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : copy.unknownError;
        setAdjustmentError(message);
      } finally {
        setAdjustmentLoading(false);
      }
    };
    loadAdjustmentLogs();
  }, [selectedEnvelopeId]);

  const { tour } = usePageTour("envelopes", {
    overview: { ref: headerRef },
    balances: { ref: currentRef },
    create: { ref: createRef },
    ...(mounted ? { advanced: { ref: advancedRef } } : {}),
  });

  /* ================================================================== */
  /* Page 11 · Enveloppes — rendu (maquette WebEnvelopes)               */
  /* ================================================================== */

  const t = ENV_COPY[locale];
  const numberLocale = locale === "en" ? "en-US" : "fr-FR";
  const currency = locale === "ar" ? "درهم" : "DH";
  const fmt = (value: number) =>
    `${value < 0 ? "−" : ""}${Math.abs(value)
      .toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .replace(/[  ]/g, " ")} ${currency}`;
  const fmt0 = (value: number) =>
    `${value < 0 ? "−" : ""}${Math.round(Math.abs(value))
      .toLocaleString(numberLocale)
      .replace(/[  ]/g, " ")} ${currency}`;
  const parseAmount = (raw: string) => {
    const cleaned = raw.replace(/[\s  ]/g, "").replace(",", ".");
    return /^-?\d+(\.\d{1,2})?$/.test(cleaned) ? Number(cleaned) : Number.NaN;
  };
  const bcp47 = LOCALE_TO_BCP47[locale];

  // Période en cours : « 28 sept → 27 oct · jour 11 / 30 »
  const periodInfo = (() => {
    const start = dashboard?.current_period?.start;
    const end = dashboard?.current_period?.end;
    if (!start || !end) return null;
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
    const dayMs = 86_400_000;
    const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / dayMs) + 1);
    const today = Math.min(days, Math.max(1, Math.floor((Date.now() - startDate.getTime()) / dayMs) + 1));
    const short = (date: Date) => date.toLocaleDateString(bcp47, { day: "numeric", month: "short" });
    return {
      label: `${short(startDate)} ${locale === "ar" ? "←" : "→"} ${short(endDate)}`,
      endLabel: short(endDate),
      days,
      today,
      timePct: today / days,
      dayToDate: (n: number) => short(new Date(startDate.getTime() + Math.floor(n) * dayMs)),
    };
  })();
  const endLabel = periodInfo?.endLabel ?? "—";

  type EnvKind = "debt" | "goal" | "fixe" | "flex";
  type EnvInfo = {
    env: EnvelopeOut;
    name: string;
    bal: number;
    alloc: number;
    spent: number;
    kind: EnvKind;
    pct: number;
    spend: boolean;
    watch: boolean;
    over: boolean;
    locked: boolean;
    seal: number;
    pace: { text: string; tone: "bad" | "warn" | null } | null;
    meterLabel: string;
    meterPct: number;
    extra: string;
    isNew: boolean;
  };

  const dashboardBalanceById = new Map(
    (dashboard?.envelopes ?? []).map((item) => [item.envelope.id, item.balance] as const)
  );
  const balanceOf = (id: string) => Number(balanceOverrides[id] ?? envelopeBalances.get(id) ?? 0) || 0;
  const cashEnvelope = envelopes.find((env) => env.is_cash) ?? null;
  const cashAvailable = Number(
    dashboard?.available_to_allocate ?? dashboard?.cash_balance ?? (cashEnvelope ? balanceOf(cashEnvelope.id) : 0)
  ) || 0;
  const recentCutoff = Date.now() - 3 * 86_400_000;

  const buildInfo = (env: EnvelopeOut): EnvInfo => {
    const name = localizeEnvelopeName(env.name);
    const bal = balanceOf(env.id);
    const period = dashboardBalanceById.get(env.id);
    const alloc = Number(period?.total_allocations ?? 0) || 0;
    const spent = Number(period?.total_spent ?? 0) || 0;
    const kind: EnvKind = env.is_goal
      ? "goal"
      : isDebtEnvelope(env)
      ? "debt"
      : fixedEnvelopeIdSet.has(env.id)
      ? "fixe"
      : "flex";
    const spend = kind === "fixe" || kind === "flex";
    const goal = kind === "goal" ? goalByEnvelopeId.get(env.id) ?? null : null;
    const target = goal ? Number(goal.target_amount || 0) || 0 : 0;
    const pct = kind === "goal" ? (target > 0 ? bal / target : 0) : alloc > 0 ? spent / alloc : 0;
    const over = spend && pct > 0.9;
    const watch = spend && (bal < 0 || pct > 0.9);

    let pace: EnvInfo["pace"] = null;
    if (spend && alloc > 0) {
      if (bal < 0) pace = { text: t.overdrawn(fmt0(-bal)), tone: "bad" };
      else if (spent <= 0) pace = { text: t.noSpendYet, tone: null };
      else if (bal === 0) pace = { text: t.emptyEnv, tone: "warn" };
      else if (periodInfo) {
        const rate = spent / periodInfo.today;
        const day = periodInfo.today + bal / rate;
        pace =
          day < periodInfo.days
            ? { text: t.emptyOn(periodInfo.dayToDate(day)), tone: "warn" }
            : { text: t.willLast, tone: null };
      }
    }

    let meterLabel: string;
    if (kind === "goal") meterLabel = target > 0 ? t.goalOf(fmt0(bal).replace(` ${currency}`, ""), fmt0(target)) : fmt0(bal);
    else if (kind === "debt") meterLabel = t.setAside(fmt0(alloc));
    else meterLabel = alloc > 0 ? t.spentOf(fmt0(spent).replace(` ${currency}`, ""), fmt0(alloc)) : t.noBudget;

    let extra = "";
    if (kind === "goal" && goal?.target_date && target > 0) {
      const deadline = new Date(`${goal.target_date}T00:00:00`);
      if (!Number.isNaN(deadline.getTime())) {
        const now = new Date();
        const months = Math.max(
          1,
          (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth())
        );
        const need = Math.max(0, target - bal) / months;
        extra = t.goalNeed(
          deadline.toLocaleDateString(bcp47, { month: "long", year: "numeric" }),
          fmt0(need),
          months
        );
      }
    }
    if (kind === "debt") {
      const due = lookupDebtRemaining(env.name);
      if (due && due > 0) extra = t.debtLeft(fmt0(due));
    }

    const createdAt = env.created_at ? new Date(env.created_at).getTime() : 0;
    return {
      env,
      name,
      bal,
      alloc,
      spent,
      kind,
      pct,
      spend,
      watch,
      over,
      locked: isEnvelopeLocked(env),
      seal: sealIndex(env.name),
      pace,
      meterLabel,
      meterPct: Math.round(Math.min(1, Math.max(0, pct)) * 100),
      extra,
      isNew: createdAt > recentCutoff,
    };
  };

  const gridInfos = sortedEnvelopes.map(buildInfo);
  const liveCount = gridInfos.length;
  const watchCount = gridInfos.filter((info) => info.watch).length;
  const negInfos = gridInfos.filter((info) => info.spend && info.bal < 0);
  const inEnvelopes = gridInfos.reduce((sum, info) => sum + info.bal, 0);
  const sweepRows = gridInfos.filter((info) => info.spend && !info.locked);
  const sweepEligible = sweepRows.filter((info) => !info.env.rollover_enabled && info.bal > 0);
  const sweepTotal = sweepEligible.reduce((sum, info) => sum + info.bal, 0);
  const savingsBalance = defaultSavingsEnvelope ? balanceOf(defaultSavingsEnvelope.id) : 0;

  const q = searchQuery.trim().toLowerCase();
  const passes = (info: EnvInfo) =>
    (!q || info.name.toLowerCase().includes(q) || info.env.name.toLowerCase().includes(q)) &&
    (envelopeFilter === "all" ||
      (envelopeFilter === "watch" && info.watch) ||
      (envelopeFilter === "neg" && info.bal < 0) ||
      (envelopeFilter === "off" && info.spend && !info.env.rollover_enabled));
  const sortInfos = (list: EnvInfo[]) => {
    const copyList = [...list];
    if (sortBy === "bal") copyList.sort((a, b) => b.bal - a.bal);
    else if (sortBy === "pct") copyList.sort((a, b) => b.pct - a.pct);
    else if (sortBy === "name") copyList.sort((a, b) => a.name.localeCompare(b.name, bcp47));
    return copyList;
  };
  const shown = gridInfos.filter(passes);
  const sectionDefs: { key: EnvKind; title: string; sub: string; cls: string }[] = [
    { key: "debt", title: t.debts, sub: t.debtsSub, cls: "env-sec is-debt" },
    { key: "goal", title: t.goals, sub: t.goalsSub, cls: "env-sec is-goal" },
    { key: "fixe", title: t.fixed, sub: t.fixedSub, cls: "env-sec" },
    { key: "flex", title: t.flex, sub: t.flexSub, cls: "env-sec" },
  ];
  const sections = sectionDefs
    .map((def) => ({ ...def, items: sortInfos(shown.filter((info) => info.kind === def.key)) }))
    .filter((sec) => sec.items.length > 0);
  const hasEnvelopes = liveCount > 0;
  const isFiltered = Boolean(q) || envelopeFilter !== "all";

  const tone = (value: "bad" | "warn" | null) =>
    value === "bad" ? "var(--dsh-bad-ink)" : value === "warn" ? "var(--dsh-warn-ink)" : "var(--dsh-muted)";
  const sealStyle = (index: number) =>
    ({ "--c-l": SEALS_LIGHT[index], "--c-d": SEALS_DARK[index] }) as CSSProperties;

  /* ---------------- actions ---------------- */

  const todayIso = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };

  const allocateFromCash = async (env: EnvelopeOut, amount: number) => {
    await apiFetch(`/envelopes/${env.id}/allocate-from-cash`, {
      method: "POST",
      body: { amount: amount.toFixed(2), occurred_on: todayIso() },
    });
    setBalanceOverrides((prev) => {
      const next = { ...prev };
      delete next[env.id];
      return next;
    });
    await loadData();
  };

  const coverFromCash = async (info: EnvInfo) => {
    const need = Math.round(-info.bal * 100) / 100;
    if (need <= 0) return;
    setCoveringId(info.env.id);
    try {
      await allocateFromCash(info.env, need);
      toast({ title: `${info.name} : +${fmt(need)}`, variant: "success" });
    } catch (err) {
      toast({ title: copy.updateFailed, description: err instanceof Error ? err.message : copy.unknownError, variant: "danger" });
    } finally {
      setCoveringId(null);
    }
  };

  const openQuick = (env: EnvelopeOut) => {
    setMenuId(null);
    setQuickTarget(env);
    setQuickAmount("");
    setQuickError(null);
  };

  const submitQuick = async () => {
    if (!quickTarget) return;
    const value = parseAmount(quickAmount);
    if (!Number.isFinite(value) || value <= 0) {
      setQuickError(t.amountInvalid);
      return;
    }
    if (value > cashAvailable + 0.001) {
      setQuickError(t.amountTooHigh);
      return;
    }
    setQuickSaving(true);
    setQuickError(null);
    try {
      await allocateFromCash(quickTarget, value);
      toast({ title: `${localizeEnvelopeName(quickTarget.name)} : +${fmt(value)}`, variant: "success" });
      setQuickTarget(null);
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : copy.unknownError);
    } finally {
      setQuickSaving(false);
    }
  };

  const openRoll = (env: EnvelopeOut) => {
    setMenuId(null);
    setRolloverTarget(env);
    setRolloverNextValue(!env.rollover_enabled);
    setRolloverDialogOpen(true);
  };

  const openRename = (env: EnvelopeOut) => {
    setMenuId(null);
    setError(null);
    handleEdit(env);
  };

  const openCorrection = (env: EnvelopeOut) => {
    setMenuId(null);
    handleStartCorrection(env);
    setCorrectionStep(2);
  };

  const openDelete = (env: EnvelopeOut) => {
    setMenuId(null);
    setDeleteTarget(env);
    setDeleteOpen(true);
  };

  const openDetails = (env: EnvelopeOut) => {
    setMenuId(null);
    setDrawerTab("ov");
    setSelectedEnvelopeId(env.id);
  };

  const openRollBulk = () => {
    const draft: Record<string, boolean> = {};
    sweepRows.forEach((info) => {
      draft[info.env.id] = info.env.rollover_enabled;
    });
    setRollDraft(draft);
    setBulkRolloverOpen(true);
  };

  const rollChanges = sweepRows.filter(
    (info) => rollDraft[info.env.id] !== undefined && rollDraft[info.env.id] !== info.env.rollover_enabled
  );

  const applyRollDraft = async () => {
    const toOn = rollChanges.filter((info) => rollDraft[info.env.id]).map((info) => info.env.id);
    const toOff = rollChanges.filter((info) => !rollDraft[info.env.id]).map((info) => info.env.id);
    if (toOn.length) await handleBulkRollover(true, toOn);
    if (toOff.length) await handleBulkRollover(false, toOff);
    setBulkRolloverOpen(false);
  };

  // Packs + liste rapide → noms à créer (les existants sont ignorés)
  const existingNames = new Set(envelopes.map((env) => env.name.trim().toLowerCase()));
  const advRequested = Array.from(
    new Set([
      ...advancedPackKeys.flatMap((key) => localizedPresetPacks.find((pack) => pack.key === key)?.envelopes ?? []),
      ...customEnvelopeList,
    ])
  );
  const advToCreate = advRequested.filter((name) => {
    const normalized = name.trim().toLowerCase();
    return normalized && !RESERVED_NAMES.includes(normalized) && !existingNames.has(normalized);
  });
  const advSkipped = advRequested.filter((name) => existingNames.has(name.trim().toLowerCase()));

  const createNames = async (names: string[]) => {
    if (names.length === 0) return;
    if (isGuest && names.length > guestEnvelopeQuota.remaining) {
      toast({ title: copy.addFailed, description: copy.guestEnvelopeCap, variant: "danger" });
      if (!guestEnvelopeCapHitSent) {
        guestEnvelopeCapHitSent = true;
        guestEvent("guest_wall_hit", { wall: "envelopes_cap", route: "/envelopes" });
      }
      return;
    }
    setAdvancedSaving(true);
    try {
      await Promise.all(
        names.map((name) =>
          apiFetch<EnvelopeOut>("/envelopes", {
            method: "POST",
            body: { name, rollover_enabled: false },
          })
        )
      );
      await loadData();
      setAdvancedOpen(false);
      toast({ title: copy.addSuccess, description: copy.addCreated(names.length), variant: "success" });
    } catch (err) {
      toast({ title: copy.addFailed, description: err instanceof Error ? err.message : copy.unknownError, variant: "danger" });
    } finally {
      setAdvancedSaving(false);
    }
  };

  const addEssentials = () => {
    const pack = localizedPresetPacks.find((item) => item.key === "essentiels");
    if (!pack) return;
    void createNames(pack.envelopes.filter((name) => !existingNames.has(name.trim().toLowerCase())));
  };

  const exportCsv = () => {
    if (!selectedEnvelope) return;
    const rows = [
      ["date", "libelle", "categorie", "montant"],
      ...envelopeActivity.map((tx) => [tx.occurred_on, tx.description ?? "", tx.category_name ?? "", tx.amount]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedEnvelope.name.replace(/[^\p{L}\p{N}]+/gu, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------- morceaux de rendu ---------------- */

  const menuItems = (info: EnvInfo) => {
    const items: { label: string; icon: ReactNode; danger?: boolean; go: () => void }[] = [];
    if (info.kind === "goal") items.push({ label: t.menuGoal, icon: <Target size={16} aria-hidden="true" />, go: () => router.push("/goals") });
    if (!info.locked) items.push({ label: t.menuRename, icon: <Pencil size={16} aria-hidden="true" />, go: () => openRename(info.env) });
    items.push({ label: t.menuFix, icon: <SlidersHorizontal size={16} aria-hidden="true" />, go: () => openCorrection(info.env) });
    if (!info.locked) items.push({ label: t.menuRoll, icon: <RotateCcw size={16} aria-hidden="true" />, go: () => openRoll(info.env) });
    if (!info.locked) items.push({ label: t.menuDelete, icon: <Trash2 size={16} aria-hidden="true" />, danger: true, go: () => openDelete(info.env) });
    return items;
  };

  const renderMenu = (info: EnvInfo, down?: boolean) =>
    menuId === info.env.id ? (
      <div role="menu" className={down ? "env-menu env-menu--down" : "env-menu"}>
        {menuItems(info).map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className={item.danger ? "is-danger" : undefined}
            onClick={item.go}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    ) : null;

  const renderCard = (info: EnvInfo) => {
    const money = getBanknotes(info.bal);
    const showMark = info.spend && info.alloc > 0 && periodInfo;
    const barWidth = info.kind === "debt" ? 100 : info.meterPct;
    return (
      <article
        key={info.env.id}
        className={menuId === info.env.id ? "sbk-card is-menu" : "sbk-card"}
        tabIndex={-1}
        aria-label={info.name}
        style={{ ...sealStyle(info.seal), ["--n" as string]: money.nCount } as CSSProperties}
      >
        <div className="eb-hd" aria-hidden="true">
          <div className="eb-clip">
            <div className="eb-notes">
              {money.notes.map((note) => (
                <span
                  key={note.i}
                  className={note.cls}
                  style={{ ["--i" as string]: note.i, ["--mid" as string]: note.mid } as CSSProperties}
                />
              ))}
              {money.coin ? <span className="eb-coin" /> : null}
              {money.noMoney ? <span className="eb-miss">{info.bal < 0 ? t.negNote : t.emptyNote}</span> : null}
            </div>
          </div>
          <span className="eb-lip" />
        </div>

        <div className="eb-title">
          <h3 title={info.name}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{info.name}</span>
            {info.isNew ? <span className="eb-new">{t.newBadge}</span> : null}
          </h3>
          <span className="eb-amt">{fmt(info.bal)}</span>
        </div>

        <div className="eb-meter">
          <span className="eb-meter__label">{info.meterLabel}</span>
          <span
            role="meter"
            aria-label={info.meterLabel}
            aria-valuenow={info.meterPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="eb-meter__track"
          >
            <span style={{ width: `${barWidth}%`, opacity: info.kind === "debt" ? 0.35 : 1 }} />
            {showMark ? (
              <i title={t.todayMark} style={{ insetInlineStart: `${Math.round(periodInfo.timePct * 100)}%` }} />
            ) : null}
          </span>
        </div>

        <div className="eb-acts">
          <button type="button" className="sbk-act sbk-act--main" onClick={() => openDetails(info.env)}>
            {t.details}
          </button>
          {!info.locked || info.kind === "goal" ? (
            <button type="button" className="sbk-act" title={t.qAlloc} onClick={() => openQuick(info.env)}>
              <Plus size={14} aria-hidden="true" />
              {t.qAllocShort}
            </button>
          ) : null}
          <button
            type="button"
            className="sbk-act sbk-act--icon"
            aria-haspopup="menu"
            aria-expanded={menuId === info.env.id}
            aria-label={t.moreFor(info.name)}
            title={t.moreFor(info.name)}
            onClick={() => setMenuId(menuId === info.env.id ? null : info.env.id)}
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </button>
          {renderMenu(info)}
        </div>
      </article>
    );
  };

  const renderRow = (info: EnvInfo) => {
    const sub = [info.pace?.text ?? "", info.extra].filter(Boolean).join(" · ") ||
      (info.kind === "fixe" ? t.kindFixe(info.env.rollover_enabled) : info.kind === "flex" ? t.kindFlex(info.env.rollover_enabled) : info.kind === "debt" ? t.kindDebt : t.kindGoal);
    return (
      <div key={info.env.id} className={menuId === info.env.id ? "env-row is-menu" : "env-row"} style={sealStyle(info.seal)}>
        <span className="env-ini" aria-hidden="true">{info.name.trim().charAt(0).toUpperCase()}</span>
        <span className="env-row__name">
          <b title={info.name}>{info.name}</b>
          <span style={{ color: tone(info.pace?.tone ?? null) }}>{sub}</span>
        </span>
        <span className="env-row__meter">
          <span>
            {info.meterLabel}
            {info.kind !== "debt" ? ` · ${info.meterPct} %` : ""}
          </span>
          <span className="env-row__track">
            <span className={info.over ? "is-over" : undefined} style={{ width: `${info.kind === "debt" ? 100 : info.meterPct}%` }} />
          </span>
        </span>
        <b className={info.bal < 0 ? "env-row__bal is-neg" : "env-row__bal"}>{fmt(info.bal)}</b>
        <span className="env-row__acts">
          <button type="button" className="env-btn" onClick={() => openDetails(info.env)}>{t.details}</button>
          {!info.locked || info.kind === "goal" ? (
            <button type="button" className="env-btn env-btn--plus" title={t.qAlloc} aria-label={t.qAlloc} onClick={() => openQuick(info.env)}>
              <Plus size={14} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="env-btn env-btn--icon"
            aria-haspopup="menu"
            aria-expanded={menuId === info.env.id}
            aria-label={t.moreFor(info.name)}
            onClick={() => setMenuId(menuId === info.env.id ? null : info.env.id)}
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
          {renderMenu(info, true)}
        </span>
      </div>
    );
  };

  /* ---------------- tiroir détails ---------------- */

  const drawerInfo = selectedEnvelope ? buildInfo(selectedEnvelope) : null;
  const drawerKind = !selectedEnvelope
    ? ""
    : selectedEnvelope.is_cash || selectedEnvelope.is_default_savings
    ? t.kindSys
    : drawerInfo?.kind === "debt"
    ? t.kindDebt
    : drawerInfo?.kind === "goal"
    ? drawerInfo.extra || t.kindGoal
    : drawerInfo?.kind === "fixe"
    ? t.kindFixe(selectedEnvelope.rollover_enabled)
    : t.kindFlex(selectedEnvelope.rollover_enabled);
  const drawerSeal = selectedEnvelope ? sealIndex(selectedEnvelope.name) : 0;
  const chronological = periods.slice(0, 6).reverse();
  const series = chronological.map((period) => Number(period.closing_balance) || 0);
  const sparkMin = Math.min(0, ...series);
  const sparkMax = Math.max(1, ...series);
  const sparkX = (index: number) => (series.length <= 1 ? 260 : 10 + (index * 500) / (series.length - 1));
  const sparkY = (value: number) => 80 - ((value - sparkMin) / (sparkMax - sparkMin || 1)) * 70;
  const monthOf = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(bcp47, { month: "short" });
  const barPeriods = periods.slice(0, 4).reverse();
  const barMax = Math.max(
    1,
    ...barPeriods.map((period) => Math.max(Number(period.total_allocations) || 0, Number(period.total_spent) || 0))
  );
  const drawerBalance = Number(periods[0]?.closing_balance ?? (selectedEnvelope ? balanceOf(selectedEnvelope.id) : 0)) || 0;
  const shortDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(bcp47, { day: "2-digit", month: "2-digit" });
  const periodLabel = (start: string, end: string) => `${shortDate(start)} ${locale === "ar" ? "←" : "→"} ${shortDate(end)}`;

  const closeDrawer = () => setSelectedEnvelopeId(null);

  /* ---------------- rendu ---------------- */

  const quotaUsed = envelopes.length;
  const quotaMax = GUEST_LIMITS.envelopes;
  const quotaWarn = quotaUsed >= quotaMax - 4;
  const quickInfo = quickTarget ? buildInfo(quickTarget) : null;
  const quickValue = parseAmount(quickAmount);
  const quickChips = [
    ...(quickInfo && quickInfo.bal < 0 ? [Math.ceil(-quickInfo.bal)] : []),
    100,
    200,
    500,
  ].filter((value, index, list) => list.indexOf(value) === index);
  const correctionInfo = correctionTarget ? buildInfo(correctionTarget) : null;
  const correctionNew = Number(correctionValue);
  const correctionDelta = correctionInfo && Number.isFinite(correctionNew) ? correctionNew - correctionInfo.bal : 0;
  const rollForbidden = rolloverTarget ? isRolloverOffForbiddenEnvelope(rolloverTarget) : false;
  const issueText = issue ? `${issue.title} ${issue.description}`.trim() : null;

  return (
    <div className="env11" dir={pageDir} onKeyDown={(event) => { if (event.key === "Escape") setMenuId(null); }}>
      <PageTour tour={tour} />

      <header className="env-hdr" ref={headerRef}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <h1>{t.title}</h1>
          <span className="env-sub">
            {t.sub} {periodInfo ? (
              <>
                <b>{periodInfo.label}</b> · {t.dayOf(periodInfo.today, periodInfo.days)}
              </>
            ) : null}
          </span>
        </div>
        <div className="env-act">
          <button type="button" className="env-btn" onClick={openRollBulk}>
            <RotateCcw size={16} aria-hidden="true" />
            {t.rollBulk}
          </button>
          <div ref={advancedRef} style={{ display: "contents" }}>
            <button type="button" className="env-btn" onClick={() => setAdvancedOpen(true)}>
              <SlidersHorizontal size={16} aria-hidden="true" />
              {t.adv}
            </button>
          </div>
          <div ref={createRef} style={{ display: "contents" }}>
            <button
              type="button"
              className="env-btn env-btn--cta"
              onClick={() => {
                setError(null);
                setCreateOpen(true);
              }}
            >
              <Plus size={16} aria-hidden="true" />
              {t.add}
            </button>
          </div>
        </div>
      </header>

      <main className="env-main" ref={currentRef}>
        {isGuest ? (
          <div className={quotaWarn ? "env-quota is-warn" : "env-quota"}>
            <span style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 280px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800 }}>
                <span className="env-dot" style={{ width: 8, height: 8, background: "var(--dsh-brand)" }} />
                {t.guestMode} · {t.quotaText(quotaUsed, quotaMax)}
              </span>
              <span
                role="meter"
                aria-label={t.quotaText(quotaUsed, quotaMax)}
                aria-valuenow={quotaUsed}
                aria-valuemin={0}
                aria-valuemax={quotaMax}
                className="env-quota__bar"
              >
                <span style={{ width: `${Math.min(100, (quotaUsed / quotaMax) * 100)}%` }} />
              </span>
            </span>
            <span style={{ flex: "2 1 320px", fontSize: 14, lineHeight: 1.45 }}>
              {quotaUsed >= quotaMax ? t.quotaMsgFull : quotaWarn ? t.quotaMsgSoon(quotaMax - quotaUsed) : t.quotaMsgOk}
            </span>
            <a href="/register" className="env-btn env-btn--cta" style={{ height: 40 }}>
              {t.createAccount}
            </a>
          </div>
        ) : null}

        {issueText && !createOpen && !renameOpen ? <IssueAlert issue={issue!} tone="error" /> : null}
        {notificationIssueGuidance ? (
          <div className="env-note env-note--warn">
            <b>{notificationIssueGuidance.title}</b> {notificationIssueGuidance.description}
          </div>
        ) : null}

        {loading ? (
          <div className="env-grid" aria-busy="true" aria-label={copy.loading}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="env-skel" />
            ))}
          </div>
        ) : (
          <>
            <div className="env-kpi" role="group" aria-label={t.summary}>
              <button type="button" className="sbk-tile" onClick={() => setEnvelopeFilter("all")}>
                <span className="sbk-tile__label">{t.inEnvelopes}</span>
                <b className="sbk-tile__value">{fmt(inEnvelopes)}</b>
                <span className="sbk-tile__hint">{t.activeCount(liveCount)}</span>
              </button>
              <a href="/allocate" className="sbk-tile">
                <span className="sbk-tile__label">{t.cashToSplit}</span>
                <b className="sbk-tile__value">{fmt(cashAvailable)}</b>
                <span className="sbk-tile__hint">{t.openAllocation}</span>
              </a>
              <button
                type="button"
                aria-pressed={envelopeFilter === "watch"}
                className={
                  envelopeFilter === "watch" ? "sbk-tile is-on" : watchCount > 0 ? "sbk-tile is-warn" : "sbk-tile"
                }
                onClick={() => setEnvelopeFilter(envelopeFilter === "watch" ? "all" : "watch")}
              >
                <span className="sbk-tile__label">{t.toWatch}</span>
                <b className="sbk-tile__value">{watchCount}</b>
                <span className="sbk-tile__hint">{t.toWatchHint}</span>
              </button>
              <button type="button" className="sbk-tile" onClick={() => setClosingOpen(true)}>
                <span className="sbk-tile__label">{t.sweepOn(endLabel)}</span>
                <b className="sbk-tile__value">+{fmt(sweepTotal)}</b>
                <span className="sbk-tile__hint">{t.sweepHint(sweepEligible.length)}</span>
              </button>
            </div>

            {defaultSavingsEnvelope ? (
              <section className="env-sav" aria-label={t.savings}>
                <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 18 }}>{t.savings}</b>
                    <span className="env-sav__pill">{t.sweepTarget}</span>
                    <span className="env-sav__pill">
                      <Lock size={12} aria-hidden="true" />
                      {t.locked}
                    </span>
                  </span>
                  <span className="env-sav__bal">{fmt(savingsBalance)}</span>
                  <span style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.5, maxWidth: 560 }}>{t.sweepExplain}</span>
                </div>
                <div className="env-sav__box">
                  <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>{t.nextSweep(endLabel)}</span>
                  <b style={{ fontSize: 26 }}>+{fmt(sweepTotal)}</b>
                  <span style={{ fontSize: 13, opacity: 0.9 }}>
                    {t.sweepCount(sweepEligible.length, sweepEligible.map((info) => info.name).join(locale === "ar" ? "، " : ", "))}
                  </span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="env-sav__btn env-sav__btn--light" onClick={() => setClosingOpen(true)}>
                      {t.closingPreview}
                    </button>
                    <button type="button" className="env-sav__btn" onClick={() => openDetails(defaultSavingsEnvelope)}>
                      {t.details}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {negInfos.length > 0 ? (
              <section className="env-fix" aria-label={t.toFix}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <b style={{ fontSize: 16, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={16} aria-hidden="true" />
                    {t.toFix}
                  </b>
                  <span style={{ fontSize: 13 }}>{t.toFixSub}</span>
                  <a href="/allocate" style={{ marginInlineStart: "auto", fontSize: 13, fontWeight: 800, color: "inherit" }}>
                    {t.otherWay} {locale === "ar" ? "←" : "→"}
                  </a>
                </span>
                {negInfos.map((info) => {
                  const need = -info.bal;
                  return (
                    <div key={info.env.id} className="env-fix__row" style={sealStyle(info.seal)}>
                      <span className="env-dot env-ini" style={{ width: 10, height: 10 }} aria-hidden="true" />
                      <b style={{ flex: "1 1 140px", fontSize: 15 }}>{info.name}</b>
                      <b style={{ color: "var(--dsh-bad-ink)", fontSize: 15 }}>{fmt(info.bal)}</b>
                      <button
                        type="button"
                        className="env-btn env-btn--cta"
                        disabled={cashAvailable < need || coveringId === info.env.id}
                        aria-busy={coveringId === info.env.id}
                        onClick={() => void coverFromCash(info)}
                      >
                        {coveringId === info.env.id ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                        {t.coverFromCash(fmt0(need))}
                      </button>
                    </div>
                  );
                })}
              </section>
            ) : null}

            <div className="env-bar">
              <span className="env-search">
                <Search size={16} color="var(--dsh-muted)" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label={t.search}
                  placeholder={t.search}
                />
              </span>
              <div className="env-filters" role="tablist" aria-label={t.filters}>
                {(
                  [
                    ["all", t.fAll],
                    ["watch", `${t.fWatch} · ${watchCount}`],
                    ["neg", `${t.fNeg} · ${negInfos.length}`],
                    ["off", t.fOff],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={envelopeFilter === key}
                    onClick={() => setEnvelopeFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="env-tools">
                <label>
                  {t.sortBy}
                  <select
                    className="env-select"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  >
                    <option value="perso">{t.sPerso}</option>
                    <option value="bal">{t.sBal}</option>
                    <option value="pct">{t.sPct}</option>
                    <option value="name">{t.sName}</option>
                  </select>
                </label>
                <span className="env-views" role="group" aria-label={t.viewLabel}>
                  <button type="button" aria-pressed={view === "cards"} title={t.vCards} aria-label={t.vCards} onClick={() => setView("cards")}>
                    <LayoutGrid size={16} aria-hidden="true" />
                  </button>
                  <button type="button" aria-pressed={view === "list"} title={t.vList} aria-label={t.vList} onClick={() => setView("list")}>
                    <List size={16} aria-hidden="true" />
                  </button>
                </span>
              </span>
            </div>

            {!hasEnvelopes ? (
              <div className="env-empty">
                <b>{t.emptyTitle}</b>
                <span>{t.emptyText}</span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <button
                    type="button"
                    className="env-btn env-btn--cta env-btn--lg"
                    onClick={addEssentials}
                    aria-busy={advancedSaving}
                  >
                    {advancedSaving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                    {t.addEssentials}
                  </button>
                  <button type="button" className="env-btn env-btn--soft env-btn--lg" onClick={() => setAdvancedOpen(true)}>
                    {t.otherPacks}
                  </button>
                </div>
              </div>
            ) : sections.length === 0 && isFiltered ? (
              <div className="env-empty" style={{ padding: 26 }}>
                <b style={{ fontSize: 17 }}>{t.noResult}</b>
                <button
                  type="button"
                  className="env-btn env-btn--soft"
                  onClick={() => {
                    setSearchQuery("");
                    setEnvelopeFilter("all");
                  }}
                >
                  {t.reset}
                </button>
              </div>
            ) : null}

            {menuId ? <div className="env-menu-scrim" onClick={() => setMenuId(null)} /> : null}

            {sections.map((sec) => (
              <section key={sec.key} className={sec.cls} aria-label={sec.title}>
                <div className="env-sec__head">
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 320px" }}>
                    <h2>
                      {sec.title} <span>· {sec.items.length}</span>
                    </h2>
                    <span className="env-sec__sub">{sec.sub}</span>
                  </span>
                  <b style={{ fontSize: 15 }}>{fmt(sec.items.reduce((sum, info) => sum + info.bal, 0))}</b>
                </div>
                {view === "cards" ? (
                  <div className="env-grid">{sec.items.map(renderCard)}</div>
                ) : (
                  <div className="env-list">{sec.items.map(renderRow)}</div>
                )}
              </section>
            ))}

            {hasEnvelopes ? <span className="env-hint">{t.tip}</span> : null}
          </>
        )}
      </main>

      {/* ---------------- tiroir : détails d'une enveloppe ---------------- */}
      <EnvDrawer
        open={Boolean(selectedEnvelope)}
        label={selectedEnvelope ? localizeEnvelopeName(selectedEnvelope.name) : t.details}
        onClose={closeDrawer}
        dir={pageDir}
        top={
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="env-drawer__ini" style={sealStyle(drawerSeal)} aria-hidden="true">
                {selectedEnvelope ? localizeEnvelopeName(selectedEnvelope.name).trim().charAt(0).toUpperCase() : ""}
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <b style={{ fontSize: 18 }}>{selectedEnvelope ? localizeEnvelopeName(selectedEnvelope.name) : ""}</b>
                <span style={{ fontSize: 13, color: "var(--dsh-muted)" }}>{drawerKind}</span>
              </span>
              <button type="button" className="env-btn" style={{ height: 38, fontSize: 13, fontWeight: 800 }} onClick={exportCsv}>
                <Download size={14} aria-hidden="true" />
                {t.exportCsv}
              </button>
              <button type="button" data-close className="env-dlg__close" style={{ width: 40, height: 40, background: "var(--dsh-card)" }} onClick={closeDrawer} aria-label={t.close}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="env-tabs" role="tablist" aria-label={selectedEnvelope?.name ?? t.details}>
              {(
                [
                  ["ov", t.tabOv],
                  ["tx", t.tabTx],
                  ["log", t.tabLog],
                ] as const
              ).map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={drawerTab === key} onClick={() => setDrawerTab(key)}>
                  {label}
                </button>
              ))}
            </div>
          </>
        }
      >
        {drawerTab === "ov" ? (
          <>
            <div className="env-panel" style={{ padding: "18px 20px", gap: 10 }}>
              <span className="env-panel__muted">{t.closingNow}</span>
              <span style={{ fontSize: 36, fontWeight: 800, color: drawerBalance < 0 ? "var(--dsh-bad-ink)" : "var(--dsh-ink)" }}>
                {fmt(drawerBalance)}
              </span>
              {drawerInfo?.pace ? (
                <span style={{ fontSize: 13, fontWeight: 700, color: tone(drawerInfo.pace.tone) }}>{drawerInfo.pace.text}</span>
              ) : null}
              {periodLoading ? (
                <div className="env-skel" style={{ height: 90 }} />
              ) : series.length > 0 ? (
                <>
                  <svg
                    viewBox="0 0 520 90"
                    width="100%"
                    height="90"
                    role="img"
                    aria-label={`${t.closingNow} : ${series.map((value) => fmt0(value)).join(", ")}`}
                    style={{ display: "block" }}
                  >
                    <line x1="0" y1={sparkY(0)} x2="520" y2={sparkY(0)} stroke="var(--dsh-line)" strokeWidth="1" />
                    <polyline
                      points={series.map((value, index) => `${sparkX(index)},${sparkY(value).toFixed(1)}`).join(" ")}
                      fill="none"
                      stroke="var(--dsh-brand)"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={sparkX(series.length - 1)}
                      cy={sparkY(series[series.length - 1]).toFixed(1)}
                      r="4.5"
                      fill="var(--dsh-brand)"
                    />
                  </svg>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--dsh-muted)" }}>
                    {chronological.map((period) => (
                      <span key={period.id}>{monthOf(period.period_start)}</span>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            {barPeriods.length > 0 ? (
              <div className="env-panel" style={{ gap: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <b className="env-panel__title" style={{ flex: 1 }}>{t.budgetVsReal}</b>
                  <span className="env-legend"><i style={{ background: "var(--e-chart-a)" }} />{t.colAlloc}</span>
                  <span className="env-legend"><i style={{ background: "var(--e-chart-b)" }} />{t.colSpent}</span>
                </span>
                <div
                  className="env-bars"
                  role="img"
                  aria-label={`${t.budgetVsReal} : ${barPeriods
                    .map((period) => `${monthOf(period.period_start)} ${fmt0(Number(period.total_allocations) || 0)} / ${fmt0(Number(period.total_spent) || 0)}`)
                    .join(" ; ")}`}
                >
                  {barPeriods.map((period) => {
                    const a = Number(period.total_allocations) || 0;
                    const s = Number(period.total_spent) || 0;
                    return (
                      <div key={period.id} className="env-bars__col">
                        <div className="env-bars__plot">
                          <i title={`${t.colAlloc} ${fmt0(a)}`} style={{ height: `${Math.max(1, (a / barMax) * 100)}%`, background: "var(--e-chart-a)" }} />
                          <i title={`${t.colSpent} ${fmt0(s)}`} style={{ height: `${Math.max(1, (s / barMax) * 100)}%`, background: "var(--e-chart-b)" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800 }}>{monthOf(period.period_start)}</span>
                        <span style={{ fontSize: 11, color: s > a ? "var(--dsh-bad-ink)" : "var(--dsh-muted)", textAlign: "center" }}>
                          {Math.round(s).toLocaleString(numberLocale)} / {Math.round(a).toLocaleString(numberLocale)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="env-panel">
              <b className="env-panel__title">{t.periods}</b>
              {periodLoading ? (
                <div className="env-skel" style={{ height: 120 }} />
              ) : periodError ? (
                <span className="env-err">{periodError}</span>
              ) : periods.length === 0 ? (
                <span className="env-panel__empty">{t.noPeriods}</span>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="env-table">
                    <thead>
                      <tr>
                        <th>{t.colPeriod}</th>
                        <th>{t.colAlloc}</th>
                        <th>{t.colSpent}</th>
                        <th>{t.colClose}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((period, index) => {
                        const close = Number(period.closing_balance) || 0;
                        return (
                          <tr key={period.id} style={{ fontWeight: index === 0 ? 800 : 500 }}>
                            <td>
                              {periodLabel(period.period_start, period.period_end)}
                              {index === 0 ? ` ${t.inProgress}` : ""}
                            </td>
                            <td>{Math.round(Number(period.total_allocations) || 0).toLocaleString(numberLocale)}</td>
                            <td>{Math.round(Number(period.total_spent) || 0).toLocaleString(numberLocale)}</td>
                            <td style={{ color: close < 0 ? "var(--dsh-bad-ink)" : undefined }}>
                              {Math.round(close).toLocaleString(numberLocale)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}

        {drawerTab === "tx" ? (
          <div className="env-panel" style={{ gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 6 }}>
              <b className="env-panel__title" style={{ flex: 1 }}>{t.activity}</b>
              {envelopeActivity.length > 0 ? (
                <button
                  type="button"
                  className="env-btn"
                  style={{ height: 32, fontSize: 12, fontWeight: 800, background: "var(--dsh-bad-soft)", color: "var(--dsh-bad-ink)" }}
                  onClick={() => setPurgeOpen(true)}
                >
                  {t.purgeAll}
                </button>
              ) : null}
            </div>
            {envelopeActivity.length === 0 ? <span className="env-panel__empty">{t.noTx}</span> : null}
            {envelopeActivity.map((tx) => {
              const label = tx.description || tx.category_name || "—";
              return (
                <div key={tx.id} className="env-line">
                  <span className="env-line__date">{shortDate(tx.occurred_on)}</span>
                  <span className="env-line__main">
                    <span>{label}</span>
                    <span>{tx.category_name}</span>
                  </span>
                  <b style={{ fontSize: 14, color: tx.type === "income" ? "var(--dsh-brand)" : "var(--dsh-bad-ink)" }}>
                    {tx.type === "income" ? "+" : "−"}
                    {fmt(Math.abs(Number(tx.amount) || 0))}
                  </b>
                  <button
                    type="button"
                    className="env-iconbtn"
                    aria-label={`${t.delete} ${label}`}
                    title={`${t.delete} ${label}`}
                    disabled={activityDeletingId === tx.id}
                    onClick={() => setTxDeleteTarget({ id: tx.id, label })}
                  >
                    {activityDeletingId === tx.id ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 size={15} aria-hidden="true" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        {drawerTab === "log" ? (
          <>
            <div className="env-panel" style={{ gap: 4 }}>
              <b className="env-panel__title" style={{ paddingBottom: 6 }}>{t.transfers}</b>
              {transferLoading ? (
                <div className="env-skel" style={{ height: 80 }} />
              ) : transferError ? (
                <span className="env-err">{transferError}</span>
              ) : transferLogs.length === 0 ? (
                <span className="env-panel__empty">{t.noTransfers}</span>
              ) : (
                transferLogs.map((log) => {
                  const incoming = log.to_envelope_id === selectedEnvelope?.id;
                  const other = incoming
                    ? localizeEnvelopeName(log.from_envelope_name)
                    : localizeEnvelopeName(envelopeMap.get(log.to_envelope_id) ?? copy.cash);
                  const amount = Number(log.amount) || 0;
                  return (
                    <div key={log.id} className="env-line" style={{ flexWrap: "nowrap" }}>
                      <span className="env-line__date">{shortDate(log.period_end)}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                        {incoming ? copy.transferFrom(other) : copy.transferTo(other)}
                      </span>
                      <b style={{ fontSize: 14, color: incoming ? "var(--dsh-brand)" : "var(--dsh-bad-ink)" }}>
                        {incoming ? "+" : "−"}
                        {fmt(Math.abs(amount))}
                      </b>
                    </div>
                  );
                })
              )}
            </div>
            <div className="env-panel" style={{ gap: 4 }}>
              <b className="env-panel__title" style={{ paddingBottom: 6 }}>{t.fixLog}</b>
              {adjustmentLoading ? (
                <div className="env-skel" style={{ height: 80 }} />
              ) : adjustmentError ? (
                <span className="env-err">{adjustmentError}</span>
              ) : adjustmentLogs.length === 0 ? (
                <span className="env-panel__empty">{t.noFix}</span>
              ) : (
                adjustmentLogs.map((log) => {
                  const delta = Number(log.delta) || 0;
                  return (
                    <div key={log.id} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 0", borderTop: "1px solid var(--dsh-line)" }}>
                      <span style={{ display: "flex", gap: 8, fontSize: 13 }}>
                        <b>{copy.manualCorrectionLabel}</b>
                        <span style={{ color: "var(--dsh-muted)" }}>{formatDateTime(log.created_at, locale)}</span>
                      </span>
                      <span style={{ display: "flex", gap: 14, fontSize: 13, flexWrap: "wrap" }}>
                        <span>{t.old} <b>{fmt(Number(log.previous_balance) || 0)}</b></span>
                        <span>{t.nw} <b>{fmt(Number(log.new_balance) || 0)}</b></span>
                        <span style={{ color: delta >= 0 ? "var(--dsh-brand)" : "var(--dsh-bad-ink)" }}>
                          {t.delta} <b>{delta >= 0 ? "+" : "−"}{fmt(Math.abs(delta))}</b>
                        </span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : null}
      </EnvDrawer>

      {/* ---------------- ajouter une enveloppe ---------------- */}
      <EnvModal
        open={createOpen}
        title={t.add}
        onClose={() => {
          setCreateOpen(false);
          setNewName("");
          setNewIsDebt(false);
          setNewIsDebtManual(false);
          setError(null);
        }}
        dir={pageDir}
        closeLabel={t.close}
      >
        <form
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          {isGuest ? (
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--dsh-brand-ink)" }}>
              {t.guestMode} · {t.quotaText(quotaUsed, quotaMax)}
            </span>
          ) : null}
          <label className="env-field">
            <span>{t.name}</span>
            <input
              className="env-input"
              value={newName}
              maxLength={40}
              placeholder={t.namePh}
              onChange={(event) => {
                const value = event.target.value;
                setNewName(value);
                if (!newIsDebtManual) setNewIsDebt(looksLikeDebt(value));
              }}
            />
          </label>
          {newIsDebt && !newIsDebtManual ? (
            <div className="env-note env-note--warn">
              <b>{t.detected}</b> {t.detectedText}
            </div>
          ) : null}
          <div role="radiogroup" aria-label={t.name} className="env-choice-grid">
            {(
              [
                [false, t.normalKind, t.normalKindSub],
                [true, t.debtKind, t.debtKindSub],
              ] as const
            ).map(([value, label, sub]) => (
              <button
                key={String(value)}
                type="button"
                role="radio"
                aria-checked={newIsDebt === value}
                className="env-choice"
                onClick={() => {
                  setNewIsDebt(value);
                  setNewIsDebtManual(true);
                }}
              >
                <b>{label}</b>
                <span>{sub}</span>
              </button>
            ))}
          </div>
          {issueText ? <span role="alert" className="env-err">{issueText}</span> : null}
          <button
            type="submit"
            className="env-btn env-btn--cta env-btn--lg"
            disabled={isGuest && !guestEnvelopeQuota.allowed}
            aria-busy={updating}
          >
            {updating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {isGuest && !guestEnvelopeQuota.allowed ? t.quotaMsgFull : t.create}
          </button>
        </form>
      </EnvModal>

      {/* ---------------- paramètres avancés : packs ---------------- */}
      <EnvModal open={advancedOpen} title={t.adv} onClose={() => setAdvancedOpen(false)} dir={pageDir} wide closeLabel={t.close}>
        <p className="env-dlg__intro">{t.packsIntro}</p>
        <div className="env-packs">
          {localizedPresetPacks.map((pack) => {
            const on = advancedPackKeys.includes(pack.key);
            return (
              <button
                key={pack.key}
                type="button"
                role="checkbox"
                aria-checked={on}
                className="env-choice"
                style={{ gap: 6, padding: 14, borderRadius: 16 }}
                onClick={() => handleAdvancedPackToggle(pack.key)}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="env-box" aria-hidden="true">{on ? <Check size={12} strokeWidth={3} /> : null}</span>
                  <b style={{ fontSize: 15 }}>{pack.label}</b>
                </span>
                <span>{pack.envelopes.join(", ")}</span>
              </button>
            );
          })}
        </div>
        <label className="env-field">
          <span>{t.quickList}</span>
          <textarea
            className="env-input"
            rows={2}
            value={advancedCustomText}
            placeholder={t.quickListPh}
            onChange={(event) => setAdvancedCustomText(event.target.value)}
          />
        </label>
        <div className="env-note">
          <b>{t.advPreview(advToCreate.length)}</b>
          {advSkipped.length > 0 ? (
            <>
              <br />
              <span style={{ color: "var(--dsh-muted)" }}>{t.advSkipped(advSkipped.join(", "))}</span>
            </>
          ) : null}
        </div>
        <button
          type="button"
          className={advToCreate.length === 0 ? "env-btn env-btn--soft env-btn--lg" : "env-btn env-btn--cta env-btn--lg"}
          disabled={advToCreate.length === 0}
          aria-busy={advancedSaving}
          onClick={() => void createNames(advToCreate)}
        >
          {advancedSaving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
          {t.advBtn(advToCreate.length)}
        </button>
      </EnvModal>

      {/* ---------------- rollover collectif ---------------- */}
      <EnvModal open={bulkRolloverOpen} title={t.rollBulk} onClose={() => setBulkRolloverOpen(false)} dir={pageDir} closeLabel={t.close}>
        <p className="env-dlg__intro">{t.rollBulkIntro(endLabel)}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="env-chip"
            onClick={() =>
              setRollDraft(Object.fromEntries(sweepRows.map((info) => [info.env.id, true])))
            }
          >
            {t.allOn}
          </button>
          <button
            type="button"
            className="env-chip"
            onClick={() =>
              setRollDraft(
                Object.fromEntries(
                  sweepRows.map((info) => [info.env.id, isRolloverOffForbiddenEnvelope(info.env)])
                )
              )
            }
          >
            {t.allOff}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {sweepRows.map((info) => {
            const forbidden = isRolloverOffForbiddenEnvelope(info.env);
            const on = rollDraft[info.env.id] ?? info.env.rollover_enabled;
            const changed = on !== info.env.rollover_enabled;
            return (
              <button
                key={info.env.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-disabled={forbidden && on}
                className="env-check-row"
                onClick={() => {
                  if (forbidden && on) return;
                  setRollDraft((prev) => ({ ...prev, [info.env.id]: !on }));
                }}
              >
                <span className="env-box" style={{ width: 22, height: 22 }} aria-hidden="true">
                  {on ? <Check size={12} strokeWidth={3} /> : null}
                </span>
                <span>{info.name}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: forbidden ? "var(--dsh-muted)" : changed ? "var(--dsh-brand)" : "var(--dsh-muted)",
                  }}
                >
                  {forbidden ? t.lockedOn : on ? t.willCarry : t.willSweep}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={rollChanges.length === 0 ? "env-btn env-btn--soft env-btn--lg" : "env-btn env-btn--cta env-btn--lg"}
          disabled={rollChanges.length === 0}
          aria-busy={bulkRolloverLoading}
          onClick={() => void applyRollDraft()}
        >
          {bulkRolloverLoading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
          {t.rbBtn(rollChanges.length)}
        </button>
      </EnvModal>

      {/* ---------------- aperçu de la clôture ---------------- */}
      <EnvModal open={closingOpen} title={t.closingPreview} onClose={() => setClosingOpen(false)} dir={pageDir} wide closeLabel={t.close}>
        <p className="env-dlg__intro">{t.closingIntro(endLabel)}</p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {sweepRows.map((info) => {
            const on = info.env.rollover_enabled;
            const forbidden = isRolloverOffForbiddenEnvelope(info.env);
            const result =
              info.bal < 0 ? t.negCarried : on ? (forbidden ? t.lockedOn : t.carried) : t.swept(fmt(Math.max(0, info.bal)));
            return (
              <div key={info.env.id} className="env-line" style={{ ...sealStyle(info.seal), padding: "10px 0" }}>
                <span className="env-dot env-ini" style={{ width: 10, height: 10 }} aria-hidden="true" />
                <b style={{ flex: "1 1 120px", fontSize: 15 }}>{info.name}</b>
                <span style={{ fontSize: 14, color: "var(--dsh-muted)" }}>{fmt(info.bal)}</span>
                <button
                  type="button"
                  className="env-switch"
                  aria-pressed={on}
                  aria-label={`Rollover ${info.name}`}
                  disabled={(forbidden && on) || rolloverUpdatingId === info.env.id}
                  onClick={() => void handleToggleRollover(info.env, !on)}
                >
                  <span />
                </button>
                <span
                  style={{
                    width: 170,
                    textAlign: "end",
                    fontSize: 13,
                    fontWeight: 800,
                    color: !on && info.bal > 0 ? "var(--dsh-brand)" : "var(--dsh-muted)",
                  }}
                >
                  {result}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "2px solid var(--dsh-ink)", fontSize: 16 }}>
          <b>{t.toSavings}</b>
          <b style={{ color: "var(--dsh-brand)" }}>+{fmt(sweepTotal)}</b>
        </div>
        <span style={{ fontSize: 13, color: "var(--dsh-muted)" }}>{t.sweepExcluded}</span>
      </EnvModal>

      {/* ---------------- allouer depuis Cash ---------------- */}
      <EnvModal
        open={Boolean(quickTarget)}
        title={quickInfo ? `${t.qAlloc} · ${quickInfo.name}` : t.qAlloc}
        onClose={() => setQuickTarget(null)}
        dir={pageDir}
        closeLabel={t.close}
      >
        <form
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
          onSubmit={(event) => {
            event.preventDefault();
            void submitQuick();
          }}
        >
          <p className="env-dlg__intro">{quickInfo ? t.quickHint(quickInfo.name, fmt(cashAvailable)) : ""}</p>
          <label className="env-field">
            <span>{t.amount}</span>
            <input
              className="env-input env-input--big"
              inputMode="decimal"
              value={quickAmount}
              placeholder="0"
              aria-invalid={Boolean(quickError)}
              onChange={(event) => {
                setQuickAmount(event.target.value);
                setQuickError(null);
              }}
            />
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {quickChips.map((value) => (
              <button key={value} type="button" className="env-chip" onClick={() => setQuickAmount(String(value))}>
                {fmt0(value)}
              </button>
            ))}
          </div>
          {quickError ? <span role="alert" className="env-err">{quickError}</span> : null}
          {Number.isFinite(quickValue) && quickValue > 0 ? (
            <span style={{ fontSize: 13, color: "var(--dsh-muted)" }}>
              {t.qPreview(fmt(cashAvailable), fmt(cashAvailable - quickValue))}
            </span>
          ) : null}
          <button type="submit" className="env-btn env-btn--cta env-btn--lg" aria-busy={quickSaving}>
            {quickSaving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {t.qBtn(Number.isFinite(quickValue) && quickValue > 0 ? fmt(quickValue) : fmt0(0))}
          </button>
        </form>
      </EnvModal>

      {/* ---------------- renommer ---------------- */}
      <EnvModal
        open={renameOpen}
        title={copy.renameEnvelope}
        onClose={() => {
          setRenameOpen(false);
          setEditingId(null);
          setEditingName("");
          setError(null);
        }}
        dir={pageDir}
        closeLabel={t.close}
      >
        <form
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
          onSubmit={(event) => {
            event.preventDefault();
            void handleUpdate();
          }}
        >
          <input
            className="env-input"
            value={editingName}
            maxLength={40}
            aria-label={t.name}
            placeholder={copy.newNamePlaceholder}
            onChange={(event) => setEditingName(event.target.value)}
          />
          {editingCanDebt ? (
            <div role="radiogroup" aria-label={t.name} className="env-choice-grid">
              {(
                [
                  [false, t.normalKind, t.normalKindSub],
                  [true, t.debtKind, t.debtKindSub],
                ] as const
              ).map(([value, label, sub]) => (
                <button
                  key={String(value)}
                  type="button"
                  role="radio"
                  aria-checked={editingIsDebt === value}
                  className="env-choice"
                  onClick={() => setEditingIsDebt(value)}
                >
                  <b>{label}</b>
                  <span>{sub}</span>
                </button>
              ))}
            </div>
          ) : null}
          {issueText ? <span role="alert" className="env-err">{issueText}</span> : null}
          <button type="submit" className="env-btn env-btn--cta env-btn--lg" aria-busy={updating}>
            {updating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {t.save}
          </button>
        </form>
      </EnvModal>

      {/* ---------------- correction manuelle ---------------- */}
      <EnvModal open={correctionOpen} title={copy.manualCorrection} onClose={() => setCorrectionOpen(false)} dir={pageDir} closeLabel={t.close}>
        <ol aria-label={t.steps} className="env-steps" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {t.fixSteps.map((label, index) => (
            <li key={label} aria-current={(correctionStep === 3 ? 1 : 0) === index ? "step" : undefined}>
              {label}
            </li>
          ))}
        </ol>
        {correctionStep !== 3 ? (
          <form
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
            onSubmit={(event) => {
              event.preventDefault();
              handleCorrectionContinue();
            }}
          >
            <div className="env-note">
              <b>{correctionInfo?.name}</b> · {copy.currentBalance} : <b>{fmt(correctionInfo?.bal ?? 0)}</b>
            </div>
            <label className="env-field">
              <span>{t.newValue}</span>
              <input
                className="env-input"
                style={{ height: 54, fontSize: 22, fontWeight: 800 }}
                inputMode="decimal"
                value={correctionValue}
                placeholder="0,00"
                aria-invalid={Boolean(correctionError)}
                onChange={(event) => setCorrectionValue(event.target.value.replace(",", "."))}
              />
            </label>
            {correctionError ? <span role="alert" className="env-err">{correctionError}</span> : null}
            <button type="submit" className="env-btn env-btn--cta env-btn--lg">{t.next}</button>
          </form>
        ) : (
          <>
            <div className="env-cmp">
              <div><span>{t.old}</span><b>{fmt(correctionInfo?.bal ?? 0)}</b></div>
              <div><span>{t.nw}</span><b>{fmt(Number.isFinite(correctionNew) ? correctionNew : 0)}</b></div>
              <div style={{ background: correctionDelta >= 0 ? "var(--dsh-brand-soft)" : "var(--dsh-bad-soft)" }}>
                <span>{t.delta}</span>
                <b style={{ color: correctionDelta >= 0 ? "var(--dsh-brand-ink)" : "var(--dsh-bad-ink)" }}>
                  {correctionDelta >= 0 ? "+" : "−"}{fmt(Math.abs(correctionDelta))}
                </b>
              </div>
            </div>
            <p className="env-dlg__intro">{copy.manualCorrectionDesc}</p>
            {correctionError ? <span role="alert" className="env-err">{correctionError}</span> : null}
            <div className="env-row-actions">
              <button type="button" className="env-btn env-btn--soft env-btn--lg" style={{ flex: 1 }} onClick={() => setCorrectionStep(2)}>
                {t.back}
              </button>
              <button
                type="button"
                className="env-btn env-btn--cta env-btn--lg"
                style={{ flex: 2 }}
                aria-busy={correctionSaving}
                onClick={() => void handleConfirmCorrection()}
              >
                {correctionSaving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
                {t.applyFix}
              </button>
            </div>
          </>
        )}
      </EnvModal>

      {/* ---------------- rollover d'une enveloppe ---------------- */}
      <EnvModal
        open={rolloverDialogOpen}
        title={rolloverTarget ? `Rollover · ${localizeEnvelopeName(rolloverTarget.name)}` : "Rollover"}
        onClose={() => {
          setRolloverDialogOpen(false);
          setRolloverTarget(null);
        }}
        dir={pageDir}
        closeLabel={t.close}
      >
        {rolloverTarget && rollForbidden ? <div className="env-note env-note--warn">{t.rollLockedText}</div> : null}
        {rolloverTarget
          ? (
              [
                [true, t.rollOnTitle, copy.rolloverEnableBullets],
                [false, t.rollOffTitle, copy.rolloverDisableBullets],
              ] as const
            ).map(([value, title, bullets]) => (
              <div key={title} className={rolloverTarget.rollover_enabled === value ? "env-roll-opt is-on" : "env-roll-opt"}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b>{title}</b>
                  {rolloverTarget.rollover_enabled === value ? <span className="env-roll-opt__tag">{t.current}</span> : null}
                </span>
                {bullets.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            ))
          : null}
        {rolloverTarget ? <span style={{ fontSize: 13, color: "var(--dsh-muted)" }}>{copy.rolloverTransferInfo}</span> : null}
        {rolloverTarget && !(rollForbidden && rolloverTarget.rollover_enabled) ? (
          <button
            type="button"
            className="env-btn env-btn--cta env-btn--lg"
            aria-busy={rolloverUpdatingId === rolloverTarget.id}
            onClick={async () => {
              await handleToggleRollover(rolloverTarget, rolloverNextValue);
              setRolloverDialogOpen(false);
              setRolloverTarget(null);
            }}
          >
            {rolloverUpdatingId === rolloverTarget.id ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {t.rollSwitchTo(rolloverNextValue)}
          </button>
        ) : null}
      </EnvModal>

      {/* ---------------- supprimer une enveloppe ---------------- */}
      <EnvModal
        open={deleteOpen}
        title={copy.deleteEnvelope}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        dir={pageDir}
        closeLabel={t.close}
      >
        <span style={{ fontSize: 15, lineHeight: 1.55 }}>
          {copy.transferFromEnvelope} : <b>{deleteTarget ? localizeEnvelopeName(deleteTarget.name) : ""}</b>
        </span>
        <div className="env-note env-note--muted">{copy.deleteEnvelopeDesc}</div>
        <div className="env-row-actions">
          <button
            type="button"
            className="env-btn env-btn--soft env-btn--lg"
            onClick={() => {
              setDeleteOpen(false);
              setDeleteTarget(null);
            }}
          >
            {t.cancel}
          </button>
          <button
            type="button"
            className="env-btn env-btn--danger env-btn--lg"
            disabled={!deleteTarget}
            aria-busy={updating}
            onClick={() => {
              if (!deleteTarget) return;
              void handleDelete(deleteTarget).finally(() => {
                setDeleteOpen(false);
                setDeleteTarget(null);
              });
            }}
          >
            {updating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            {t.delete}
          </button>
        </div>
      </EnvModal>

      {/* ---------------- supprimer des dépenses ---------------- */}
      <EnvModal
        open={purgeOpen || Boolean(txDeleteTarget)}
        title={purgeOpen ? t.purgeAll : t.delete}
        onClose={() => {
          setPurgeOpen(false);
          setTxDeleteTarget(null);
        }}
        dir={pageDir}
        closeLabel={t.close}
      >
        <span style={{ fontSize: 15, lineHeight: 1.55 }}>
          {purgeOpen
            ? t.purgeText(envelopeActivity.length, selectedEnvelope ? localizeEnvelopeName(selectedEnvelope.name) : "")
            : t.txDelText(txDeleteTarget?.label ?? "")}
        </span>
        <div className="env-row-actions">
          <button
            type="button"
            className="env-btn env-btn--soft env-btn--lg"
            onClick={() => {
              setPurgeOpen(false);
              setTxDeleteTarget(null);
            }}
          >
            {t.cancel}
          </button>
          <button
            type="button"
            className="env-btn env-btn--danger env-btn--lg"
            aria-busy={activityDeletingAll}
            onClick={async () => {
              if (purgeOpen) {
                setPurgeOpen(false);
                await handleDeleteAllEnvelopeActivity();
              } else if (txDeleteTarget) {
                const id = txDeleteTarget.id;
                setTxDeleteTarget(null);
                await handleDeleteEnvelopeActivity(id);
              }
            }}
          >
            {purgeOpen ? t.purgeAll : t.delete}
          </button>
        </div>
      </EnvModal>

      <EnvToastView toast={envToast} dir={pageDir} />
    </div>
  );
}
