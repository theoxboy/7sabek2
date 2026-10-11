"use client";

import { type CSSProperties, useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  Info,
  Landmark,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Target,
  Trash2,
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
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IssueAlert } from "@/components/ui/IssueAlert";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import {
  PageTour,
} from "@/components/tour/GlobalTour";
import { usePageTour } from "@/components/tour/usePageTour";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
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

const ENVELOPE_THEMES = [
  { accent: "#0f766e", paper: "#f0fdfa", paper2: "#ccfbf1", ink: "#134e4a", darkPaper: "#102b2a", darkPaper2: "#16413f", darkInk: "#d5fffb" },
  { accent: "#b45309", paper: "#fff7ed", paper2: "#fed7aa", ink: "#7c2d12", darkPaper: "#33230f", darkPaper2: "#4a3215", darkInk: "#ffedd5" },
  { accent: "#be123c", paper: "#fff1f2", paper2: "#fecdd3", ink: "#881337", darkPaper: "#35141c", darkPaper2: "#4c1d2a", darkInk: "#ffe4e6" },
  { accent: "#2563eb", paper: "#eff6ff", paper2: "#bfdbfe", ink: "#1e3a8a", darkPaper: "#132342", darkPaper2: "#1d3764", darkInk: "#dbeafe" },
  { accent: "#4f46e5", paper: "#eef2ff", paper2: "#c7d2fe", ink: "#312e81", darkPaper: "#1d1b3f", darkPaper2: "#292766", darkInk: "#e0e7ff" },
  { accent: "#15803d", paper: "#f0fdf4", paper2: "#bbf7d0", ink: "#14532d", darkPaper: "#102d1d", darkPaper2: "#17442a", darkInk: "#dcfce7" },
];


function getEnvelopeBanknotes(amount: number, locale: string) {
  let r = Math.max(0, Math.round(amount));
  const out: number[] = [];
  for (const d of [200, 100, 50, 20]) {
    while (r >= d && out.length < 5) {
      out.push(d);
      r -= d;
    }
  }
  const coin = r >= 10 && out.length < 5;
  out.reverse();
  const mid = out.length > 0 ? ((out.length - 1) / 2).toFixed(1) : "0";
  return {
    notes: out.map((denom, i) => ({
      cls: `eb-note n${denom}`,
      denom,
      i,
      mid,
    })),
    coin,
    nCount: out.length,
    noMoney: out.length === 0 && !coin,
    noMoneyText:
      amount < 0
        ? locale === "ar"
          ? "ناقص"
          : locale === "en"
          ? "overdrawn"
          : "à découvert"
        : locale === "ar"
        ? "خاوي"
        : locale === "en"
        ? "empty"
        : "vide",
  };
}

const getEnvelopeTheme = (value: string) => {
  const score = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ENVELOPE_THEMES[score % ENVELOPE_THEMES.length];
};

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

function Sparkline({ data }: { data: number[] }) {
  const points = useMemo(() => {
    if (data.length === 0) return [];
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    return data.map((value, index) => ({
      x: (index / Math.max(data.length - 1, 1)) * 100,
      y: 100 - ((value - min) / range) * 100,
    }));
  }, [data]);

  if (points.length === 0) {
    return (
      <div className="h-16 rounded-2xl bg-[var(--surface-2)]" aria-hidden="true" />
    );
  }

  const path = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-16 w-full"
      role="img"
      aria-label="Spending trend"
    >
      <path
        d={path}
        fill="none"
        stroke="var(--accent-strong)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function EnvelopesPage() {
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const currentRef = useRef<HTMLDivElement | null>(null);
  const createRef = useRef<HTMLDivElement | null>(null);
  const advancedRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
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
  const [envelopeFilter, setEnvelopeFilter] = useState<"all" | "rollover_off" | "rollover_on" | "watch" | "fixed" | "flex">("all");
  const [updating, setUpdating] = useState(false);
  const [rolloverUpdatingId, setRolloverUpdatingId] = useState<string | null>(null);
  const [rolloverDialogOpen, setRolloverDialogOpen] = useState(false);
  const [rolloverTarget, setRolloverTarget] = useState<EnvelopeOut | null>(null);
  const [rolloverNextValue, setRolloverNextValue] = useState(false);
  const [bulkRolloverOpen, setBulkRolloverOpen] = useState(false);
  const [bulkRolloverIds, setBulkRolloverIds] = useState<string[]>([]);
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

  const availableAdvancedNames = useMemo(() => {
    return Array.from(
      new Set([...advancedPresetList, ...customEnvelopeList])
    );
  }, [advancedPresetList, customEnvelopeList]);

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
  const goalEnvelopes = useMemo(
    () => sortedEnvelopes.filter((env) => Boolean(env.is_goal)),
    [sortedEnvelopes]
  );
  const debtEnvelopes = useMemo(
    () => sortedEnvelopes.filter((env) => !env.is_goal && isDebtEnvelope(env)),
    [sortedEnvelopes]
  );
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

  const fixedEnvelopeAmounts = useMemo(() => {
    const amounts: Record<string, number> = {};

    (distributionRules ?? []).forEach((rule) => {
      if (rule.target_type === "envelope" && rule.enabled && isFixedMode(rule.mode)) {
        const amount = Number(rule.amount ?? "0");
        if (Number.isFinite(amount) && amount > 0) {
          amounts[rule.target_id] = amount;
        }
      }
    });

    // The saved config carries the user's intended figure; let it win.
    activeSavedEnvelopeFixedRows.forEach((row) => {
      const amount = Number(row.fixed_amount ?? "0");
      if (Number.isFinite(amount) && amount > 0) {
        amounts[row.target_id] = amount;
      }
    });

    return amounts;
  }, [activeSavedEnvelopeFixedRows, distributionRules]);

  const fixedEnvelopeIdSet = useMemo(() => new Set(fixedEnvelopeIds), [fixedEnvelopeIds]);
  const rolloverOffSortedEnvelopes = useMemo(
    () =>
      [...rolloverOffEnvelopes].sort((a, b) => {
        const af = fixedEnvelopeIdSet.has(a.id) ? 0 : 1;
        const bf = fixedEnvelopeIdSet.has(b.id) ? 0 : 1;
        if (af !== bf) return af - bf;
        return a.name.localeCompare(b.name);
      }),
    [rolloverOffEnvelopes, fixedEnvelopeIdSet]
  );
  const rolloverOnSortedEnvelopes = useMemo(
    () =>
      [...rolloverOnEnvelopes].sort((a, b) => {
        const af = fixedEnvelopeIdSet.has(a.id) ? 0 : 1;
        const bf = fixedEnvelopeIdSet.has(b.id) ? 0 : 1;
        if (af !== bf) return af - bf;
        return a.name.localeCompare(b.name);
      }),
    [rolloverOnEnvelopes, fixedEnvelopeIdSet]
  );

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

  const debtInitialRemaining = useMemo(() => {
    let total = 0;
    debtRemainingByName.forEach((amount) => {
      total += amount;
    });
    return total > 0 ? total : null;
  }, [debtRemainingByName]);

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

  const kpis = useMemo(() => {
    let totalBalance = 0;
    let totalAllocated = 0;
    let totalSpent = 0;
    let overdrawnCount = 0;

    envelopes.forEach((env) => {
      const bal = Number(balanceOverrides[env.id] ?? envelopeBalances.get(env.id) ?? 0);
      totalBalance += bal;
      if (bal < 0) overdrawnCount += 1;

      const dbEnv = dashboard?.envelopes.find((item) => item.envelope.id === env.id);
      if (dbEnv) {
        totalAllocated += Number(dbEnv.balance.total_allocations || 0);
        totalSpent += Number(dbEnv.balance.total_spent || 0);
      }
    });

    const spentPct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
    const savingsBal = defaultSavingsEnvelope
      ? Number(balanceOverrides[defaultSavingsEnvelope.id] ?? envelopeBalances.get(defaultSavingsEnvelope.id) ?? 0)
      : 0;

    return {
      totalBalance,
      totalAllocated,
      totalSpent,
      spentPct,
      savingsBal,
      overdrawnCount,
      activeCount: envelopes.length,
    };
  }, [envelopes, balanceOverrides, envelopeBalances, dashboard, defaultSavingsEnvelope]);

  const matchesSearch = useCallback(
    (env: EnvelopeOut) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const localizedName = localizeEnvelopeName(env.name).toLowerCase();
      return env.name.toLowerCase().includes(q) || localizedName.includes(q);
    },
    [searchQuery]
  );

  const matchesFilter = useCallback(
    (env: EnvelopeOut) => {
      if (!matchesSearch(env)) return false;
      if (envelopeFilter === "all") return true;
      if (envelopeFilter === "rollover_off") return !env.rollover_enabled;
      if (envelopeFilter === "rollover_on") return env.rollover_enabled;
      if (envelopeFilter === "fixed") return fixedEnvelopeIdSet.has(env.id);
      if (envelopeFilter === "flex") return !fixedEnvelopeIdSet.has(env.id);
      if (envelopeFilter === "watch") {
        const bal = Number(balanceOverrides[env.id] ?? envelopeBalances.get(env.id) ?? 0);
        if (bal < 0) return true;
        const dbEnv = dashboard?.envelopes.find((item) => item.envelope.id === env.id);
        const alloc = Number(dbEnv?.balance.total_allocations || 0);
        const spent = Number(dbEnv?.balance.total_spent || 0);
        return alloc > 0 && spent / alloc >= 0.9;
      }
      return true;
    },
    [matchesSearch, envelopeFilter, fixedEnvelopeIdSet, balanceOverrides, envelopeBalances, dashboard]
  );

  const filteredRolloverOff = useMemo(
    () => rolloverOffSortedEnvelopes.filter(matchesFilter),
    [rolloverOffSortedEnvelopes, matchesFilter]
  );

  const filteredRolloverOn = useMemo(
    () => rolloverOnSortedEnvelopes.filter(matchesFilter),
    [rolloverOnSortedEnvelopes, matchesFilter]
  );

  const allFilteredEnvelopes = useMemo(
    () => [...filteredRolloverOff, ...filteredRolloverOn],
    [filteredRolloverOff, filteredRolloverOn]
  );



  const sweepEligibleEnvelopes = useMemo(() => {
    return envelopes.filter(
      (env) =>
        !env.is_cash &&
        !env.is_default_savings &&
        !env.is_goal &&
        !env.rollover_enabled
    );
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

  const periodTrend = useMemo(() => {
    if (periods.length === 0) return [] as number[];
    return periods
      .slice()
      .reverse()
      .map((period) => Number(period.closing_balance));
  }, [periods]);

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

  const handleAdvancedNameToggle = (name: string) => {
    setAdvancedSelectedNames((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const handleCreateAdvancedEnvelopes = async () => {
    if (advancedSelectedNames.length === 0 && customEnvelopeList.length === 0) {
      toast({
        title: copy.noSelection,
        description: copy.selectAtLeastOneEnvelope,
      });
      return;
    }

    const selected = new Set(advancedSelectedNames);
    customEnvelopeList.forEach((name) => {
      if (advancedSelectedNames.includes(name)) {
        selected.add(name);
      }
    });
    const names = Array.from(selected);

    const existing = new Set(
      envelopes.map((env) => env.name.trim().toLowerCase())
    );
    const toCreate = names.filter((name) => {
      const normalized = name.trim().toLowerCase();
      if (!normalized) return false;
      if (RESERVED_NAMES.includes(normalized)) return false;
      return !existing.has(normalized);
    });

    if (toCreate.length === 0) {
      toast({
        title: copy.nothingToAdd,
        description: copy.allEnvelopesExist,
      });
      setAdvancedOpen(false);
      return;
    }

    if (isGuest && toCreate.length > guestEnvelopeQuota.remaining) {
      setError(copy.guestEnvelopeCap);
      toast({
        title: copy.addFailed,
        description: copy.guestEnvelopeCap,
        variant: "danger",
      });
      if (!guestEnvelopeCapHitSent) {
        guestEnvelopeCapHitSent = true;
        guestEvent("guest_wall_hit", { wall: "envelopes_cap", route: "/envelopes" });
      }
      return;
    }

    setAdvancedSaving(true);
    setError(null);
    try {
      const created = await Promise.all(
        toCreate.map((name) =>
          apiFetch<EnvelopeOut>("/envelopes", {
            method: "POST",
            body: { name, rollover_enabled: false },
          })
        )
      );
      await loadData();
      setAdvancedOpen(false);
      toast({
        title: copy.addSuccess,
        description: copy.addCreated(created.length),
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
      toast({
        title: copy.addFailed,
        description: message,
        variant: "danger",
      });
    } finally {
      setAdvancedSaving(false);
    }
  };

  const envelopeActivity = useMemo(() => {
    if (!selectedEnvelope) return [];
    return envelopeTransactions
      .slice()
      .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
      .slice(0, 8)
      .map((tx) => {
        const category = categories.find((cat) => cat.id === tx.category_id);
        return {
          ...tx,
          category_name: category?.name ?? "-",
        };
      });
  }, [selectedEnvelope, envelopeTransactions, categories]);

  const handleDeleteEnvelopeActivity = async (transactionId: string) => {
    const ok = window.confirm(copy.deleteActivityConfirm);
    if (!ok) return;

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
    const ok = window.confirm(copy.deleteAllActivityConfirm);
    if (!ok) return;

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

  const renderEnvelopeCard = (env: EnvelopeOut, index: number, isFixedActive = false) => {
    const balance =
      balanceOverrides[env.id] ??
      envelopeBalances.get(env.id) ??
      "0.00";
    const numBalance = Number(balance) || 0;
    const theme = getEnvelopeTheme(env.name);
    const envelopeColor = theme.accent;

    const dashboardEnvelope = dashboard?.envelopes.find(
      (item) => item.envelope.id === env.id
    );
    const allocated = Number(dashboardEnvelope?.balance.total_allocations ?? 0);
    const spent = Number(dashboardEnvelope?.balance.total_spent ?? 0);
    const spendPercent =
      allocated > 0 ? Math.min(Math.max((spent / allocated) * 100, 0), 100) : 0;

    const { notes, coin, noMoney, noMoneyText, nCount } = getEnvelopeBanknotes(numBalance, locale);
    const isDebt = looksLikeDebt(env.name);
    const isGoal = goalByEnvelopeId.has(env.id);

    const postmarkText = isDebt
      ? (locale === "ar" ? "دين" : "DETTE")
      : isGoal
      ? (locale === "ar" ? "هدف" : "OBJECTIF")
      : (locale === "ar" ? "الدار البيضاء · 7SABEK" : "CASABLANCA · 7SABEK");

    return (
      <article
        key={env.id}
        className="sbk-card eb-full relative overflow-hidden flex flex-col justify-between"
        style={{
          ["--c" as any]: envelopeColor,
          ["--n" as any]: nCount,
          minHeight: "310px",
          padding: "16px 18px",
        }}
      >
        {/* Pocket Header with Banknotes */}
        <div className="eb-hd" aria-hidden="true">
          <span className="eb-pm">{postmarkText}</span>
          <div className="eb-clip">
            <div className="eb-notes">
              {notes.map((nt) => (
                <span
                  key={nt.i}
                  className={nt.cls}
                  style={{
                    ["--i" as any]: nt.i,
                    ["--mid" as any]: nt.mid,
                  }}
                />
              ))}
              {coin && <span className="eb-coin" />}
              {noMoney && <span className="eb-miss">{noMoneyText}</span>}
            </div>
          </div>
          <span className="eb-lip" />
        </div>

        {/* Top Title, Badges, and Amount */}
        <div className="relative z-10 pt-24 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "text-base font-bold text-white drop-shadow-sm leading-snug truncate",
                locale === "ar" ? "font-cairo" : "font-manrope"
              )}
              title={localizeEnvelopeName(env.name)}
            >
              {localizeEnvelopeName(env.name)}
            </h3>

            <div className="flex flex-wrap items-center gap-1 shrink-0">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase backdrop-blur-md",
                  env.rollover_enabled
                    ? "bg-white/20 text-white"
                    : "bg-emerald-400/25 text-emerald-100"
                )}
                title={env.rollover_enabled ? copy.rolloverOn : copy.rolloverOff}
              >
                {env.rollover_enabled ? (
                  <>
                    <ArrowUpCircle className="h-3 w-3" />
                    <span>ON</span>
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="h-3 w-3" />
                    <span>OFF</span>
                  </>
                )}
              </span>

              {isFixedActive && (
                <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                  {locale === "ar" ? "ثابت" : "Fixe"}
                </span>
              )}
            </div>
          </div>

          {/* Big Balance Amount */}
          <div className="eb-amt flex items-baseline gap-1 text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
            <span>{formatMoneyWithCurrency(balance)}</span>
          </div>
        </div>

        {/* Bottom Area: Meter Bar & Action buttons (smooth cross-fade on hover/focus) */}
        <div className="relative z-10 mt-4 min-h-[44px]">
          {/* Progress Bar / Budget info */}
          <div className="eb-meter flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-white/90 font-medium">
              <span>
                {allocated > 0
                  ? `${locale === "ar" ? "المصروف" : "Dépensé"} ${formatMoneyWithCurrency(spent)} / ${formatMoneyWithCurrency(allocated)}`
                  : (locale === "ar" ? "بدون ميزانية محددة" : "Sans budget défini")}
              </span>
              {allocated > 0 && (
                <span className="font-bold text-white">{Math.round(spendPercent)}%</span>
              )}
            </div>

            <div role="meter" className="h-1.5 w-full rounded-full bg-white/25 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  spendPercent >= 90 ? "bg-amber-300" : "bg-white"
                )}
                style={{ width: `${spendPercent}%` }}
              />
            </div>
          </div>

          {/* Action buttons (revealed on hover/focus, or static on touch) */}
          <div className="eb-acts flex items-center gap-1.5">
            <button
              type="button"
              className="sbk-act flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
              onClick={() => setSelectedEnvelopeId(env.id)}
              title={copy.viewDetails}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{copy.viewDetails}</span>
            </button>

            <button
              type="button"
              className="sbk-act inline-flex items-center justify-center h-9 w-9 rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
              onClick={() => handleStartCorrection(env)}
              title={copy.correction}
              aria-label={copy.correction}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>

            {!isEnvelopeLocked(env) && (
              <button
                type="button"
                className="sbk-act inline-flex items-center justify-center h-9 w-9 rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
                onClick={() => handleEdit(env)}
                title={copy.rename}
                aria-label={copy.rename}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}

            {!isEnvelopeLocked(env) && (
              <button
                type="button"
                className="sbk-act inline-flex items-center justify-center h-9 w-9 rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
                onClick={() => {
                  setRolloverTarget(env);
                  setRolloverNextValue(!env.rollover_enabled);
                  setRolloverDialogOpen(true);
                }}
                title={env.rollover_enabled ? copy.rolloverOn : copy.rolloverOff}
                aria-label={env.rollover_enabled ? copy.rolloverOn : copy.rolloverOff}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}

            {!isEnvelopeLocked(env) && (
              <button
                type="button"
                className="sbk-act inline-flex items-center justify-center h-9 w-9 rounded-xl text-xs font-bold text-red-200 hover:text-white transition shadow-sm active:scale-95"
                onClick={() => {
                  setDeleteTarget(env);
                  setDeleteOpen(true);
                }}
                title={copy.delete}
                aria-label={copy.delete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  const renderSpecialEnvelopeCard = (
    env: EnvelopeOut,
    kind: "debt" | "goal"
  ) => {
    const balance =
      balanceOverrides[env.id] ??
      envelopeBalances.get(env.id) ??
      "0.00";
    const numBalance = Number(balance) || 0;
    const isGoalKind = kind === "goal";
    const fixedAmount = fixedEnvelopeAmounts[env.id];
    const currentBalance = numBalance;
    const goal = isGoalKind ? goalByEnvelopeId.get(env.id) ?? null : null;
    const goalTarget = goal ? Number(goal.target_amount || "0") : 0;
    const goalProgress = goalTarget > 0 ? Math.max(0, Math.min(1, currentBalance / goalTarget)) : 0;
    const debtOutstanding = isGoalKind ? 0 : lookupDebtRemaining(env.name) ?? debtInitialRemaining ?? 0;
    const debtProgress =
      debtOutstanding > 0 ? Math.max(0, Math.min(1, currentBalance / debtOutstanding)) : 0;
    const progressRatio = isGoalKind ? goalProgress : debtProgress;
    const progressPct = `${(progressRatio * 100).toFixed(0)}%`;
    const monthlyContribution = isGoalKind
      ? Number(goal?.contribution_amount ?? 0) || Number(fixedAmount ?? 0)
      : Number(fixedAmount ?? 0);
    const remainingToHit = isGoalKind
      ? Math.max(0, goalTarget - currentBalance)
      : Math.max(0, debtOutstanding - currentBalance);
    const hasTarget = isGoalKind ? goalTarget > 0 : debtOutstanding > 0;
    const etaMonths =
      hasTarget && monthlyContribution > 0
        ? Math.max(0, Math.ceil(remainingToHit / monthlyContribution))
        : null;
    const etaDate =
      etaMonths !== null
        ? (() => {
            const next = new Date();
            next.setMonth(next.getMonth() + etaMonths);
            return next.toLocaleDateString(LOCALE_TO_BCP47[locale], {
              month: "short",
              year: "numeric",
            });
          })()
        : null;

    const themeColor = isGoalKind ? "#4F46E5" : "#BE123C";
    const { notes, coin, noMoney, noMoneyText, nCount } = getEnvelopeBanknotes(numBalance, locale);

    const postmarkText = isGoalKind
      ? (locale === "ar" ? "هدف · GOAL" : "OBJECTIF")
      : (locale === "ar" ? "دين · DETTE" : "DETTE / CRÉDIT");

    return (
      <article
        key={env.id}
        className="sbk-card eb-full relative overflow-hidden flex flex-col justify-between"
        style={{
          ["--c" as any]: themeColor,
          ["--n" as any]: nCount,
          minHeight: "310px",
          padding: "16px 18px",
        }}
      >
        {/* Pocket Header with Banknotes */}
        <div className="eb-hd" aria-hidden="true">
          <span className="eb-pm">{postmarkText}</span>
          <div className="eb-clip">
            <div className="eb-notes">
              {notes.map((nt) => (
                <span
                  key={nt.i}
                  className={nt.cls}
                  style={{
                    ["--i" as any]: nt.i,
                    ["--mid" as any]: nt.mid,
                  }}
                />
              ))}
              {coin && <span className="eb-coin" />}
              {noMoney && <span className="eb-miss">{noMoneyText}</span>}
            </div>
          </div>
          <span className="eb-lip" />
        </div>

        {/* Top Title, Badges, and Amount */}
        <div className="relative z-10 pt-24 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-white/70">
                {isGoalKind
                  ? (locale === "ar" ? "ظرف هدف" : "Enveloppe Objectif")
                  : (locale === "ar" ? "ظرف دين" : "Enveloppe Dette")}
              </span>
              <h3
                className={cn(
                  "text-base font-bold text-white drop-shadow-sm leading-snug truncate",
                  locale === "ar" ? "font-cairo" : "font-manrope"
                )}
                title={localizeEnvelopeName(env.name)}
              >
                {localizeEnvelopeName(env.name)}
              </h3>
            </div>

            <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
              {isGoalKind ? <Target className="h-3 w-3" /> : <Landmark className="h-3 w-3" />}
            </span>
          </div>

          {/* Big Balance Amount */}
          <div className="eb-amt flex items-baseline gap-1 text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
            <span>{formatMoneyWithCurrency(balance)}</span>
          </div>
        </div>

        {/* Bottom Area: Progress & Actions */}
        <div className="relative z-10 mt-4 min-h-[44px]">
          {/* Progress Bar & Target */}
          <div className="eb-meter flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-white/90 font-medium">
              <span>
                {hasTarget
                  ? `${progressPct} · ${etaDate ? (locale === "ar" ? `توقع: ${etaDate}` : `Estimé : ${etaDate}`) : ""}`
                  : (Number.isFinite(fixedAmount) && fixedAmount > 0
                    ? `${locale === "ar" ? "شهرياً:" : "Mensuel :"} ${formatMoneyWithCurrency(fixedAmount)}`
                    : "")}
              </span>
              <span className="font-bold text-white">{progressPct}</span>
            </div>

            <div role="meter" className="h-1.5 w-full rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round(progressRatio * 100))}%` }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="eb-acts flex items-center gap-1.5">
            <button
              type="button"
              className="sbk-act flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
              onClick={() => {
                if (isGoalKind) {
                  router.push("/goals");
                  return;
                }
                setSelectedEnvelopeId(env.id);
              }}
              title={copy.viewDetails}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{copy.viewDetails}</span>
            </button>
          </div>
        </div>
      </article>
    );
  };
  return (
    <div className="flex flex-col gap-8" dir={pageDir}>
      <PageTour tour={tour} />
      <div ref={headerRef}>
        <PageHeader
          title={copy.pageTitle}
          subtitle={copy.pageSubtitle}
        />
      </div>

      {loading ? <p className="text-sm text-[var(--muted)]">{copy.loading}</p> : null}
      {issue ? <IssueAlert issue={issue} tone="error" /> : null}
      {notificationIssueGuidance ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            {notificationIssueGuidance.title}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {notificationIssueGuidance.description}
          </p>
        </div>
      ) : null}

      <div ref={currentRef}>
        <Section title={copy.currentBalances}>
          {/* Header Quick Actions Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                type="button"
                className="gap-1.5 shadow-sm"
                onClick={() => setBulkRolloverOpen(true)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{copy.collectiveRollover}</span>
              </Button>
              {mounted && (
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  className="gap-1.5 border border-[var(--border)]"
                  onClick={() => setAdvancedOpen(true)}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>{copy.advancedSettings}</span>
                </Button>
              )}
            </div>

            {mounted && (
              <Button
                size="sm"
                type="button"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{copy.addEnvelope}</span>
              </Button>
            )}
          </div>

          {/* 4 KPI Summary Tiles */}
          <div className="env-kpi mb-6" role="group" aria-label="KPIs">
            <div className="sbk-tile">
              <span className="text-xs font-semibold text-[var(--muted)]">
                {copy.totalRemaining}
              </span>
              <b className="text-2xl font-black text-[var(--ink)] tracking-tight">
                {formatMoneyWithCurrency(kpis.totalBalance)}
              </b>
              <span className="text-[11px] text-[var(--muted)]">
                {kpis.activeCount} {locale === "ar" ? "أظرفة نشطة" : "enveloppes actives"}
              </span>
            </div>

            <div className="sbk-tile">
              <span className="text-xs font-semibold text-[var(--muted)]">
                {copy.allocatedBudget}
              </span>
              <b className="text-2xl font-black text-[var(--ink)] tracking-tight">
                {formatMoneyWithCurrency(kpis.totalAllocated)}
              </b>
              <span className="text-[11px] text-[var(--muted)]">
                {locale === "ar" ? "المجموع المخصص" : "Budget total de la période"}
              </span>
            </div>

            <div className="sbk-tile">
              <span className="text-xs font-semibold text-[var(--muted)]">
                {copy.totalSpent}
              </span>
              <b className="text-2xl font-black text-[var(--ink)] tracking-tight">
                {formatMoneyWithCurrency(kpis.totalSpent)}
              </b>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      kpis.spentPct >= 90 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(100, kpis.spentPct)}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-[var(--ink)]">{kpis.spentPct}%</span>
              </div>
            </div>

            <div className="sbk-tile">
              <span className="text-xs font-semibold text-[var(--muted)]">
                {copy.savingsBalance}
              </span>
              <b className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatMoneyWithCurrency(kpis.savingsBal)}
              </b>
              <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                {locale === "ar" ? "وجهة التحويل التلقائي" : "Cible du balayage automatique"}
              </span>
            </div>
          </div>

          {/* Attention Banner if any overdrawn envelope */}
          {kpis.overdrawnCount > 0 && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/80 dark:border-rose-900/50 dark:bg-rose-950/20 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 font-bold">
                  !
                </span>
                <div>
                  <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                    {copy.attentionTitle} · {kpis.overdrawnCount} {locale === "ar" ? "أظرفة برصيد سلبي" : "enveloppe(s) à découvert"}
                  </p>
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    {copy.attentionDesc}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setEnvelopeFilter("watch")}
              >
                {locale === "ar" ? "شوف الأظرفة" : "Voir les enveloppes"}
              </Button>
            </div>
          )}

          {/* Savings Envelope Sweep Highlight */}
          {defaultSavingsEnvelope && (
            <Card className="mb-6 border-emerald-200 bg-gradient-to-br from-emerald-50 via-[var(--surface)] to-teal-50 dark:from-emerald-950/30 dark:via-[var(--surface)] dark:to-teal-950/30">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-emerald-800 dark:text-emerald-300">
                      {locale === "ar" ? "ظرف الادخار" : locale === "en" ? "Savings envelope" : "Enveloppe Épargne"}
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300 bg-[var(--surface)] text-emerald-700 hover:bg-emerald-100"
                          aria-label={locale === "ar" ? "معلومات" : locale === "en" ? "Information" : "Informations"}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {locale === "ar" ? "كيفاش كيخدم التحويل نحو الادخار؟" : locale === "en" ? "How does transfer to savings work?" : "Comment fonctionne le transfert vers l’épargne ?"}
                          </DialogTitle>
                          <DialogDescription>
                            {locale === "ar"
                              ? "فآخر كل فترة، أي ظرف عادي عندو رصيد موجب وماشي rollover كيتحوّل الرصيد ديالو تلقائياً لظرف الادخار."
                              : locale === "en"
                              ? "At the end of each period, any regular envelope with a positive balance and rollover disabled transfers that unused amount to savings."
                              : "À la fin de chaque période, toute enveloppe normale avec un solde positif et rollover désactivé transfère automatiquement ce reliquat vers l’épargne."}
                          </DialogDescription>
                        </DialogHeader>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
                          <li>
                            {locale === "ar"
                              ? "الأظرفة المشمولة: عادية فقط (ماشي Cash، ماشي Épargne، ماشي Goals)."
                              : locale === "en"
                              ? "Included envelopes: regular only (not Cash, not Savings, not Goals)."
                              : "Enveloppes concernées: seulement les enveloppes normales (pas Cash, pas Épargne, pas Goals)."}
                          </li>
                          <li>
                            {locale === "ar"
                              ? "خاص rollover يكون OFF."
                              : locale === "en"
                              ? "Rollover must be OFF."
                              : "Le rollover doit être OFF."}
                          </li>
                          <li>
                            {locale === "ar"
                              ? "غير الرصيد غير المستعمل (الموجب) هو اللي كيتحوّل."
                              : locale === "en"
                              ? "Only unused positive balance is transferred."
                              : "Seul le solde non utilisé (positif) est transféré."}
                          </li>
                        </ul>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="text-sm text-emerald-900/80 dark:text-emerald-200/80">
                    {locale === "ar"
                      ? "هاد الظرف كيتجمع فيه الفائض اللي ما تصرفش من الأظرفة المؤهلة مع نهاية الدورة."
                      : locale === "en"
                      ? "This envelope collects unused surplus from eligible envelopes at cycle end."
                      : "Cette enveloppe reçoit les soldes non utilisés des enveloppes éligibles en fin de période."}
                  </p>
                  <Badge tone="accent">
                    {locale === "ar" ? "الوجهة التلقائية ديال sweep" : locale === "en" ? "Automatic sweep target" : "Destination automatique des sweeps"}
                  </Badge>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  className="self-center"
                  onClick={() => setSelectedEnvelopeId(defaultSavingsEnvelope.id)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{copy.viewDetails}</span>
                </Button>
              </div>
            </Card>
          )}

          {/* Interactive Search & Filter Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 end-2 flex items-center text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {[
                { key: "all", label: copy.filterAll },
                { key: "rollover_off", label: copy.filterRolloverOff },
                { key: "rollover_on", label: copy.filterRolloverOn },
                { key: "watch", label: copy.filterWatch },
                { key: "fixed", label: copy.filterFixed },
                { key: "flex", label: copy.filterFlex },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setEnvelopeFilter(f.key as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition",
                    envelopeFilter === f.key
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--border)]"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Rollover Dialog */}
          {mounted ? (
          <Dialog open={bulkRolloverOpen} onOpenChange={setBulkRolloverOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{copy.bulkRolloverTitle}</DialogTitle>
                <DialogDescription>{copy.bulkRolloverDesc}</DialogDescription>
              </DialogHeader>
              <div className="mt-2 grid gap-2">
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        bulkRolloverIds.length > 0 &&
                        bulkRolloverIds.length ===
                          envelopes.filter((env) => !isEnvelopeLocked(env)).length
                      }
                      onChange={() => {
                        const eligible = envelopes
                          .filter((env) => !isEnvelopeLocked(env))
                          .map((env) => env.id);
                        setBulkRolloverIds((prev) =>
                          prev.length === eligible.length ? [] : eligible
                        );
                      }}
                    />
                    <span className="font-medium text-[var(--ink)]">
                      {copy.selectAll}
                    </span>
                  </label>
                  <Badge tone="muted">
                    {copy.selectedCount(bulkRolloverIds.length)}
                  </Badge>
                </div>
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1 text-sm">
                  {envelopes
                    .filter((env) => !isEnvelopeLocked(env))
                    .map((env) => (
                      <label
                        key={env.id}
                        className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={bulkRolloverIds.includes(env.id)}
                          onChange={() =>
                            setBulkRolloverIds((prev) =>
                              prev.includes(env.id)
                                ? prev.filter((id) => id !== env.id)
                                : [...prev, env.id]
                            )
                          }
                        />
                        <span className="font-medium text-[var(--ink)]">
                          {localizeEnvelopeName(env.name)}
                        </span>
                        <Badge tone={env.rollover_enabled ? "accent" : "muted"}>
                          {env.rollover_enabled ? copy.rolloverOn : copy.rolloverOff}
                        </Badge>
                      </label>
                    ))}
                </div>
              </div>
              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button variant="secondary" type="button">
                    {copy.cancel}
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  isLoading={bulkRolloverLoading}
                  onClick={async () => {
                    await handleBulkRollover(true, bulkRolloverIds);
                    setBulkRolloverOpen(false);
                  }}
                >
                  {copy.enable}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  isLoading={bulkRolloverLoading}
                  onClick={async () => {
                    await handleBulkRollover(false, bulkRolloverIds);
                    setBulkRolloverOpen(false);
                  }}
                >
                  {copy.disable}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}

          {/* Envelopes Banknote Grid */}
          {allFilteredEnvelopes.length === 0 ? (
            searchQuery || envelopeFilter !== "all" ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-[var(--ink)]">{copy.noFilterResults}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setEnvelopeFilter("all");
                  }}
                >
                  {locale === "ar" ? "مسح الفلتر" : "Réinitialiser les filtres"}
                </Button>
              </div>
            ) : (
              <EmptyState
                title={copy.noEnvelopes}
                description={copy.createToStart}
              />
            )
          ) : envelopeFilter !== "all" ? (
            <div className="env-grid">
              {allFilteredEnvelopes.map((env, index) =>
                renderEnvelopeCard(env, index, fixedEnvelopeIdSet.has(env.id))
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {filteredRolloverOff.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                      <p className="text-sm font-bold text-[var(--ink)]">
                        {locale === "ar"
                          ? "الأظرفة اللي كتحوّل الفائض نحو الادخار (Rollover OFF)"
                          : locale === "en"
                          ? "Envelopes sending unused balance to savings (Rollover OFF)"
                          : "Enveloppes qui transfèrent le reliquat vers l’épargne (Rollover OFF)"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--muted)]">
                      {filteredRolloverOff.length} {locale === "ar" ? "أظرفة" : "enveloppes"}
                    </span>
                  </div>

                  <div className="env-grid">
                    {filteredRolloverOff.map((env, index) =>
                      renderEnvelopeCard(env, index, fixedEnvelopeIdSet.has(env.id))
                    )}
                  </div>
                </div>
              )}

              {filteredRolloverOn.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-sky-600" />
                      <p className="text-sm font-bold text-[var(--ink)]">
                        {locale === "ar"
                          ? "الأظرفة اللي كتحافظ على الرصيد للفترة الجاية (Rollover ON)"
                          : locale === "en"
                          ? "Envelopes keeping balance for next period (Rollover ON)"
                          : "Enveloppes qui conservent le solde pour la période suivante (Rollover ON)"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--muted)]">
                      {filteredRolloverOn.length} {locale === "ar" ? "أظرفة" : "enveloppes"}
                    </span>
                  </div>

                  <div className="env-grid">
                    {filteredRolloverOn.map((env, index) =>
                      renderEnvelopeCard(
                        env,
                        index + filteredRolloverOff.length,
                        fixedEnvelopeIdSet.has(env.id)
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      <div ref={createRef}>
        <Section title={copy.createEnvelope}>
        <div className="flex flex-wrap items-center gap-2">
          {mounted ? (
            <Dialog
              open={createOpen}
              onOpenChange={(next) => {
                setCreateOpen(next);
                if (!next) {
                  setNewName("");
                  setNewIsDebt(false);
                  setNewIsDebtManual(false);
                  setError(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button type="button">{copy.addEnvelope}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{copy.newEnvelope}</DialogTitle>
                  <DialogDescription>{copy.addEnvelopeDesc}</DialogDescription>
                  {isGuest ? (
                    <p className="mt-1 text-xs font-semibold text-[var(--accent-strong,#0b8f53)]">
                      {locale === "ar"
                        ? `وضع الاكتشاف: ${envelopes.length}/${GUEST_LIMITS.envelopes} ظرف مستعمل`
                        : locale === "en"
                          ? `Discovery mode: ${envelopes.length}/${GUEST_LIMITS.envelopes} envelopes used`
                          : `Mode découverte : ${envelopes.length}/${GUEST_LIMITS.envelopes} enveloppes créées`}
                    </p>
                  ) : null}
                </DialogHeader>
                <div className="mt-2 grid gap-3">
                  <input
                    value={newName}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNewName(value);
                      if (!newIsDebtManual) setNewIsDebt(looksLikeDebt(value));
                    }}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    placeholder={copy.envelopeNamePlaceholder}
                  />
                  <label className="flex items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={newIsDebt}
                      onChange={(event) => {
                        setNewIsDebt(event.target.checked);
                        setNewIsDebtManual(true);
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent,#0f766e)]"
                    />
                    <span>
                      {copy.isDebtLabel}
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {copy.isDebtHint}
                      </span>
                    </span>
                  </label>
                  {error ? (
                    <p className="text-sm text-[var(--error)]">{error}</p>
                  ) : null}
                </div>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button variant="secondary" type="button">
                      {copy.cancel}
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={handleCreate}
                    isLoading={updating}
                    disabled={isGuest && !guestEnvelopeQuota.allowed}
                  >
                    {isGuest && !guestEnvelopeQuota.allowed
                      ? locale === "ar"
                        ? "بلغت الحد الأقصى (20)"
                        : locale === "en"
                          ? "Limit reached (20)"
                          : "Plafond atteint (20)"
                      : copy.add}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
          {mounted ? (
            <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <DialogTrigger asChild>
                <div ref={advancedRef}>
                  <Button variant="secondary" type="button">
                    {copy.advancedSettings}
                  </Button>
                </div>
              </DialogTrigger>
              <DialogContent>
                <>
                    <DialogHeader>
                      <DialogTitle>{copy.advancedSettingsTitle}</DialogTitle>
                      <DialogDescription>{copy.advancedSettingsDesc}</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3">
                      {localizedPresetPacks.map((pack) => (
                        <label
                          key={pack.key}
                          className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={advancedPackKeys.includes(pack.key)}
                            onChange={() => handleAdvancedPackToggle(pack.key)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-medium text-[var(--ink)]">
                              {pack.label}
                            </span>
                            <span className="text-xs text-[var(--muted)]">
                              {pack.description}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        {copy.quickList}
                      </p>
                      <textarea
                        value={advancedCustomText}
                        onChange={(event) => setAdvancedCustomText(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                        rows={3}
                        placeholder={copy.quickListPlaceholder}
                      />
                    </div>

                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        {copy.suggestedEnvelopes}
                      </p>
                      {advancedPresetList.length === 0 && customEnvelopeList.length === 0 ? (
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          {copy.choosePackOrList}
                        </p>
                      ) : (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {availableAdvancedNames.map((name) => (
                            <label
                              key={name}
                              className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={advancedSelectedNames.includes(name)}
                                onChange={() => handleAdvancedNameToggle(name)}
                              />
                              <span>{name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <DialogFooter className="mt-4">
                      <DialogClose asChild>
                        <Button variant="secondary" type="button">
                          {copy.cancel}
                        </Button>
                      </DialogClose>
                      <Button
                        type="button"
                        onClick={handleCreateAdvancedEnvelopes}
                        isLoading={advancedSaving}
                        disabled={advancedSelectedNames.length === 0}
                      >
                        {copy.add}
                      </Button>
                    </DialogFooter>
                  </>
              </DialogContent>
            </Dialog>
          ) : null}
          {mounted ? (
            <Dialog
              open={deleteOpen}
              onOpenChange={(open) => {
                setDeleteOpen(open);
                if (!open) setDeleteTarget(null);
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{copy.deleteEnvelope}</DialogTitle>
                  <DialogDescription>{copy.deleteEnvelopeDesc}</DialogDescription>
                </DialogHeader>
                {deleteTarget ? (
                  <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)]">
                    {copy.transferFromEnvelope}: <strong>{localizeEnvelopeName(deleteTarget.name)}</strong>.
                  </div>
                ) : null}
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button variant="secondary" type="button">
                      {copy.cancel}
                    </Button>
                  </DialogClose>
                  <Button
                    variant="danger"
                    type="button"
                    onClick={() => {
                      if (deleteTarget) {
                        handleDelete(deleteTarget).finally(() => {
                          setDeleteOpen(false);
                          setDeleteTarget(null);
                        });
                      }
                    }}
                    isLoading={updating}
                    disabled={!deleteTarget}
                  >
                    {copy.delete}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
          {mounted ? (
            <Dialog
              open={correctionOpen}
              onOpenChange={(open) => {
                setCorrectionOpen(open);
              }}
            >
              <DialogContent>
                {correctionStep === 1 ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>{copy.manualCorrection}</DialogTitle>
                      <DialogDescription>{copy.manualCorrectionDesc}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-3 grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
                      <p className="font-medium text-[var(--ink)]">
                        {correctionTarget
                          ? localizeEnvelopeName(correctionTarget.name)
                          : copy.manualCorrection}
                      </p>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-3 py-2">
                        <span className="text-[var(--muted)]">{copy.currentBalance}</span>
                        <span className="font-semibold text-[var(--ink)]">
                          {correctionTarget
                            ? formatMoneyWithCurrency(getEnvelopeBalance(correctionTarget.id))
                            : formatMoneyWithCurrency(0)}
                        </span>
                      </div>
                      <p className="text-[var(--muted)]">
                        {copy.currentBudgetModified}
                      </p>
                    </div>
                    <DialogFooter className="mt-4">
                      <DialogClose asChild>
                        <Button variant="secondary" type="button">
                          {copy.cancel}
                        </Button>
                      </DialogClose>
                      <Button type="button" onClick={handleCorrectionContinue}>
                        {copy.continue}
                      </Button>
                    </DialogFooter>
                  </>
                ) : null}

                {correctionStep === 2 && correctionTarget ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>{copy.newValue}</DialogTitle>
                      <DialogDescription>{copy.newValueDesc}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-3 grid gap-2">
                      <input
                        value={correctionValue}
                        onChange={(event) => setCorrectionValue(event.target.value)}
                        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                        placeholder="0.00"
                      />
                      {correctionError ? (
                        <p className="text-sm text-[var(--error)]">
                          {correctionError}
                        </p>
                      ) : null}
                    </div>
                    <DialogFooter className="mt-4">
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() => setCorrectionStep(1)}
                      >
                        {copy.back}
                      </Button>
                      <Button type="button" onClick={handleCorrectionContinue}>
                        {copy.continue}
                      </Button>
                    </DialogFooter>
                  </>
                ) : null}

                {correctionStep === 3 && correctionTarget ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>{copy.confirmCorrection}</DialogTitle>
                      <DialogDescription>{copy.confirmCorrectionDesc}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--muted)]">{copy.oldValue}</span>
                        <span className="font-semibold">
                          {formatMoneyWithCurrency(getEnvelopeBalance(correctionTarget.id))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--muted)]">{copy.newValue}</span>
                        <span className="font-semibold">
                          {formatMoneyWithCurrency(correctionValue)}
                        </span>
                      </div>
                      {correctionError ? (
                        <p className="text-sm text-[var(--error)]">
                          {correctionError}
                        </p>
                      ) : null}
                    </div>
                    <DialogFooter className="mt-4">
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() => setCorrectionStep(2)}
                      >
                        {copy.back}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleConfirmCorrection}
                        isLoading={correctionSaving}
                      >
                        {copy.confirm}
                      </Button>
                    </DialogFooter>
                  </>
                ) : null}
              </DialogContent>
            </Dialog>
          ) : null}
          {mounted ? (
            <Dialog
              open={renameOpen}
              onOpenChange={(open) => {
                setRenameOpen(open);
                if (!open) {
                  setEditingId(null);
                  setEditingName("");
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{copy.renameEnvelope}</DialogTitle>
                  <DialogDescription>{copy.renameEnvelopeDesc}</DialogDescription>
                </DialogHeader>
                <div className="mt-2 grid gap-3">
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    placeholder={copy.newNamePlaceholder}
                  />
                  {editingCanDebt ? (
                    <label className="flex items-start gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={editingIsDebt}
                        onChange={(event) => setEditingIsDebt(event.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent,#0f766e)]"
                      />
                      <span>
                        {copy.isDebtLabel}
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">
                          {copy.isDebtHint}
                        </span>
                      </span>
                    </label>
                  ) : null}
                  {error ? (
                    <p className="text-sm text-[var(--error)]">{error}</p>
                  ) : null}
                </div>
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button variant="secondary" type="button">
                      {copy.cancel}
                    </Button>
                  </DialogClose>
                  <Button type="button" onClick={handleUpdate} isLoading={updating}>
                    {copy.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </Section>
      </div>

      <Dialog
        open={rolloverDialogOpen}
        onOpenChange={(open) => {
          setRolloverDialogOpen(open);
          if (!open) {
            setRolloverTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.rolloverChangeTitle}</DialogTitle>
            <DialogDescription>
              {copy.rolloverChangeDesc}{" "}
              <span className="font-medium text-[var(--ink)]">
                {rolloverTarget ? localizeEnvelopeName(rolloverTarget.name) : ""}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          {rolloverTarget ? (
            <div className="mt-2 space-y-3 text-sm">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                <p className="font-medium text-[var(--ink)]">
                  {copy.currentState} :{" "}
                  {rolloverTarget.rollover_enabled ? copy.rolloverOn : copy.rolloverOff}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {copy.afterConfirm} :{" "}
                  {rolloverNextValue ? copy.rolloverOn : copy.rolloverOff}
                </p>
              </div>
              <ul className="list-disc space-y-2 pl-5 text-[var(--muted)]">
                {(rolloverNextValue
                  ? copy.rolloverEnableBullets
                  : copy.rolloverDisableBullets
                ).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="text-xs text-[var(--muted)]">
                {copy.rolloverTransferInfo}
              </p>
            </div>
          ) : null}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="secondary" type="button">
                {copy.cancel}
              </Button>
            </DialogClose>
            <Button
              type="button"
              isLoading={rolloverUpdatingId === rolloverTarget?.id}
              disabled={!rolloverTarget}
              onClick={async () => {
                if (!rolloverTarget) return;
                await handleToggleRollover(rolloverTarget, rolloverNextValue);
                setRolloverDialogOpen(false);
                setRolloverTarget(null);
              }}
            >
              {copy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingId ? <div /> : null}

      <Drawer
        open={Boolean(selectedEnvelope)}
        onOpenChange={(open) => {
          if (!open) setSelectedEnvelopeId(null);
        }}
      >
        <DrawerContent className="h-screen overflow-y-auto">
          <style jsx>{`
            @keyframes envelope-detail-rise {
              from {
                opacity: 0;
                transform: translateY(14px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .envelope-detail-enter {
              animation: envelope-detail-rise 420ms ease-out both;
            }

            @media (prefers-reduced-motion: reduce) {
              .envelope-detail-enter {
                animation: none;
              }
            }
          `}</style>
          <DrawerHeader className="envelope-detail-enter">
	            <DrawerTitle>{selectedEnvelope ? localizeEnvelopeName(selectedEnvelope.name) : copy.pageTitle}</DrawerTitle>
	            <p className="text-sm text-[var(--muted)]">
	              {copy.currentBalance}{" "}
	              {formatMoneyWithCurrency(
	                periods[0]?.closing_balance ??
	                  envelopeBalances.get(selectedEnvelope?.id ?? "") ??
	                  "0.00"
              )}
            </p>
          </DrawerHeader>

          <div className="mt-6 space-y-6">
            <div className="envelope-detail-enter" style={{ animationDelay: "60ms" }}>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.trendClosingBalance}
              </p>
              <Sparkline data={periodTrend} />
            </div>

            <div className="envelope-detail-enter" style={{ animationDelay: "120ms" }}>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.periodHistory}
              </p>
              {periodLoading ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{copy.loading}</p>
              ) : periodError ? (
                <p className="mt-2 text-sm text-red-600">{periodError}</p>
              ) : periods.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {copy.noPeriodsYet}
                </p>
              ) : (
                <div className="mt-2 overflow-hidden rounded-2xl border border-[var(--border)]">
	                  <table className="w-full text-start text-sm">
	                    <thead className="bg-[var(--surface-2)] text-xs text-[var(--muted)]">
                      <tr>
                        <th className="px-3 py-2">{copy.period}</th>
                        <th className="px-3 py-2">{copy.allocated}</th>
                        <th className="px-3 py-2">{copy.spent}</th>
                        <th className="px-3 py-2">{copy.closing}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {periods.map((period) => (
                        <tr key={period.id}>
                          <td className="px-3 py-2 text-xs text-[var(--muted)]">
	                            {formatLocalDate(period.period_start, locale)} → {formatLocalDate(period.period_end, locale)}
	                          </td>
	                          <td className="px-3 py-2">
	                            {formatMoneyWithCurrency(period.total_allocations)}
	                          </td>
	                          <td className="px-3 py-2">
	                            {formatMoneyWithCurrency(period.total_spent)}
	                          </td>
	                          <td className="px-3 py-2 font-semibold">
	                            {formatMoneyWithCurrency(period.closing_balance)}
	                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="envelope-detail-enter" style={{ animationDelay: "180ms" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {copy.recentActivity}
                </p>
                <Button
                  size="sm"
                  variant="danger"
                  type="button"
                  onClick={handleDeleteAllEnvelopeActivity}
                  disabled={activityDeletingAll || envelopeActivity.length === 0}
                >
                  {activityDeletingAll ? copy.deleting : copy.deleteAll}
                </Button>
              </div>
              {envelopeActivity.length === 0 ? (
	                <p className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">
	                  {copy.noActivityYet}
	                </p>
              ) : (
                <div className="mt-2 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                  {envelopeActivity.map((tx) => (
                    <div key={tx.id} className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {tx.category_name ?? "-"}
                        </span>
                        <div className="flex items-center gap-2">
	                          <span>{formatMoneyWithCurrency(tx.amount)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() => handleDeleteEnvelopeActivity(tx.id)}
                            disabled={activityDeletingId === tx.id}
                          >
                            {copy.delete}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--muted)]">
	                        {formatLocalDate(tx.occurred_on, locale)} · {tx.description ?? copy.noDescription}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="envelope-detail-enter" style={{ animationDelay: "240ms" }}>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.transferLogs}
              </p>
              {transferLoading ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{copy.loading}</p>
              ) : transferError ? (
                <p className="mt-2 text-sm text-red-600">{transferError}</p>
              ) : transferLogs.length === 0 ? (
	                <p className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">
	                  {copy.noTransfers}
	                </p>
              ) : (
                <div className="mt-2 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                  {transferLogs.map((log) => {
                    const isIncoming = log.to_envelope_id === selectedEnvelope?.id;
                    const targetName =
                      localizeEnvelopeName(envelopeMap.get(log.to_envelope_id) ?? copy.cash);
                    return (
                      <div key={log.id} className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">
                            {isIncoming
                              ? copy.transferFrom(localizeEnvelopeName(log.from_envelope_name))
                              : copy.transferTo(targetName)}
                          </span>
	                          <span>{formatMoneyWithCurrency(log.amount)}</span>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
	                          {formatLocalDate(log.period_start, locale)} → {formatLocalDate(log.period_end, locale)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="envelope-detail-enter" style={{ animationDelay: "300ms" }}>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.manualCorrections}
              </p>
              {adjustmentLoading ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{copy.loading}</p>
              ) : adjustmentError ? (
                <p className="mt-2 text-sm text-red-600">{adjustmentError}</p>
              ) : adjustmentLogs.length === 0 ? (
	                <p className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">
	                  {copy.noCorrections}
	                </p>
              ) : (
                <div className="mt-2 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                  {adjustmentLogs.map((log) => (
                    <div key={log.id} className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {copy.manualCorrectionLabel}
                        </span>
	                        <span>{formatMoneyWithCurrency(log.new_balance)}</span>
                      </div>
                      <p className="text-xs text-[var(--muted)]">
	                        {formatDateTime(log.created_at, locale)} · {formatLocalDate(log.period_start, locale)} →{" "}
	                        {formatLocalDate(log.period_end, locale)}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {copy.previousNewDelta(
	                          formatMoneyWithCurrency(log.previous_balance),
	                          formatMoneyWithCurrency(log.new_balance),
	                          formatMoneyWithCurrency(log.delta)
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
