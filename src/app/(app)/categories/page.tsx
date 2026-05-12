"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import type {
  CategoryEnvelopeMapOut,
  CategoryOut,
  EnvelopeOut,
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
import { useToast } from "@/components/ui/Toast";
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
import { getIssueDisplay } from "@/lib/issueMessages";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import {
  getCanonicalCategoryKey,
  isInternalIncomeCategory,
  localizeCategoryName as localizeCatalogCategoryName,
} from "@/lib/categoryCatalog";

const CATEGORY_UI_COPY: Record<FloussyLocale, Record<string, string>> = {
  fr: {
    unknownError: "Erreur inconnue",
    requiredName: "Le nom de catégorie est obligatoire.",
    title: "Categories",
    subtitle: "Mappe les catégories aux enveloppes pour suivre les dépenses proprement.",
    loading: "Chargement...",
    addSection: "Ajouter des catégories",
    individualAdd: "Ajout individuel",
    quickCollective: "Collective rapide",
    advancedSettings: "Paramètres avancés",
    individualAddDesc: "Ajoute des catégories une par une.",
    categoryName: "Nom de la catégorie",
    type: "Type",
    expense: "Dépense",
    income: "Revenu",
    mixed: "Mixte",
    envelopeOptional: "Enveloppe (optionnel)",
    later: "Plus tard",
    add: "Ajouter",
    addedThisSession: "Ajoutées dans cette session",
    addedAppear: "Les catégories ajoutées apparaissent ici.",
    close: "Fermer",
    collectiveDesc: "Choisis un ou plusieurs packs. Tu peux ensuite sélectionner les catégories à ajouter.",
    suggestedCategories: "Catégories proposées",
    choosePack: "Choisis un pack pour voir les catégories.",
    mapLaterLine: "Je ferai le mapping plus tard.",
    cancel: "Annuler",
    addCategories: "Ajouter les catégories",
    continue: "Continuer",
    step2Mapping: "Étape 2 : Mapping",
    step2Desc: "Choisis une enveloppe pour chaque catégorie (optionnel).",
    noNewCategoryToMap: "Aucune nouvelle catégorie à mapper.",
    back: "Retour",
    mapLater: "Mapper plus tard",
    finish: "Terminer",
    listSection: "Liste des catégories",
    categoriesCount: "catégories",
    searchCategories: "Chercher des catégories",
    bulkDelete: "Suppression collective",
    bulkDeleteDesc: "Coche les catégories à supprimer. Cette action est définitive.",
    noCategoryToDelete: "Aucune catégorie à supprimer.",
    selectAll: "Tout sélectionner",
    selected: "sélectionnées",
    deleteSelection: "Supprimer la sélection",
    noCategories: "Aucune catégorie",
    noCategoriesDesc: "Crée ta première catégorie pour commencer le mapping.",
    expenses: "Dépenses",
    incomes: "Revenus",
    noExpenseCategory: "Aucune catégorie de dépense.",
    noIncomeCategory: "Aucune catégorie visible. Les revenus sont gérés automatiquement.",
    auto: "Auto",
    unmapped: "Non mappée",
    save: "Enregistrer",
    rename: "Renommer",
    delete: "Supprimer",
    currentDeleteConfirm: "Supprimer la catégorie",
    noneSelected: "Aucune catégorie sélectionnée.",
    chooseAtLeastOne: "Choisis au moins une catégorie à ajouter.",
    nothingToAdd: "Rien à ajouter.",
    allExist: "Toutes les catégories existent déjà.",
    addSuccess: "Ajout réussi.",
    addFailed: "Ajout échoué.",
    deleteSuccess: "Suppression réussie.",
    deleteFailed: "Suppression échouée.",
    mappingFailed: "Mapping échoué.",
    addedMapped: "Catégories ajoutées et mappées.",
    addedWithoutMapping: "Catégories ajoutées sans mapping.",
  },
  en: {
    unknownError: "Unknown error",
    requiredName: "Category name is required.",
    title: "Categories",
    subtitle: "Map categories to envelopes to track spending accurately.",
    loading: "Loading...",
    addSection: "Add categories",
    individualAdd: "Add one",
    quickCollective: "Quick packs",
    advancedSettings: "Advanced settings",
    individualAddDesc: "Add categories one by one.",
    categoryName: "Category name",
    type: "Type",
    expense: "Expense",
    income: "Income",
    mixed: "Mixed",
    envelopeOptional: "Envelope (optional)",
    later: "Later",
    add: "Add",
    addedThisSession: "Added in this session",
    addedAppear: "New categories appear here.",
    close: "Close",
    collectiveDesc: "Choose one or more packs, then select the categories to add.",
    suggestedCategories: "Suggested categories",
    choosePack: "Choose a pack to see categories.",
    mapLaterLine: "I will map them later.",
    cancel: "Cancel",
    addCategories: "Add categories",
    continue: "Continue",
    step2Mapping: "Step 2: Mapping",
    step2Desc: "Choose an envelope for each category (optional).",
    noNewCategoryToMap: "No new category to map.",
    back: "Back",
    mapLater: "Map later",
    finish: "Finish",
    listSection: "Categories list",
    categoriesCount: "categories",
    searchCategories: "Search categories",
    bulkDelete: "Bulk delete",
    bulkDeleteDesc: "Select categories to delete. This action is permanent.",
    noCategoryToDelete: "No category to delete.",
    selectAll: "Select all",
    selected: "selected",
    deleteSelection: "Delete selection",
    noCategories: "No categories",
    noCategoriesDesc: "Create your first category to start mapping.",
    expenses: "Expenses",
    incomes: "Income",
    noExpenseCategory: "No expense category.",
    noIncomeCategory: "No visible income category. Income is handled automatically.",
    auto: "Auto",
    unmapped: "Unmapped",
    save: "Save",
    rename: "Rename",
    delete: "Delete",
    currentDeleteConfirm: "Delete category",
    noneSelected: "No category selected.",
    chooseAtLeastOne: "Choose at least one category to add.",
    nothingToAdd: "Nothing to add.",
    allExist: "All categories already exist.",
    addSuccess: "Added successfully.",
    addFailed: "Add failed.",
    deleteSuccess: "Deleted successfully.",
    deleteFailed: "Delete failed.",
    mappingFailed: "Mapping failed.",
    addedMapped: "Categories added and mapped.",
    addedWithoutMapping: "Categories added without mapping.",
  },
  ar: {
    unknownError: "وقع مشكل غير واضح",
    requiredName: "اسم الكاتيغوري ضروري.",
    title: "الكاتيغوريات",
    subtitle: "ربط الكاتيغوريات بالأظرفة باش المصاريف يبانو مرتبين وواضحين.",
    loading: "كيتحمّل...",
    addSection: "زيد كاتيغوريات",
    individualAdd: "زيادة بوحدة",
    quickCollective: "باقات سريعين",
    advancedSettings: "إعدادات زايدة",
    individualAddDesc: "زيد الكاتيغوريات وحدة بوحدة.",
    categoryName: "اسم الكاتيغوري",
    type: "النوع",
    expense: "مصروف",
    income: "دخل",
    mixed: "مخلط",
    envelopeOptional: "الظرف (اختياري)",
    later: "من بعد",
    add: "زيد",
    addedThisSession: "تزادو فهاد السيشن",
    addedAppear: "الكاتيغوريات اللي زدتي غادي يبانوا هنا.",
    close: "سد",
    collectiveDesc: "اختار باقة وحدة ولا أكثر، ومن بعد اختار الكاتيغوريات اللي بغيتي تزيد.",
    suggestedCategories: "كاتيغوريات مقترحين",
    choosePack: "اختار باقة باش يبانوا الكاتيغوريات.",
    mapLaterLine: "غادي ندير الربط من بعد.",
    cancel: "إلغاء",
    addCategories: "زيد الكاتيغوريات",
    continue: "كمل",
    step2Mapping: "المرحلة 2: الربط",
    step2Desc: "اختار الظرف المناسب لكل كاتيغوري إلا بغيتي تربطها دابا.",
    noNewCategoryToMap: "ما كاين حتى كاتيغوري جديد باش يتربط.",
    back: "رجوع",
    mapLater: "ربط من بعد",
    finish: "سالي",
    listSection: "لائحة الكاتيغوريات",
    categoriesCount: "كاتيغوريات",
    searchCategories: "قلّب على كاتيغوريات",
    bulkDelete: "حذف جماعي",
    bulkDeleteDesc: "علّم الكاتيغوريات اللي بغيتي تحيد. هاد العملية نهائية.",
    noCategoryToDelete: "ما كاين حتى كاتيغوري للحذف.",
    selectAll: "اختار الكل",
    selected: "محددين",
    deleteSelection: "حيد المحدد",
    noCategories: "ما كايناش كاتيغوريات",
    noCategoriesDesc: "صاوب أول كاتيغوري باش تبدا ترتب المصاريف ديالك.",
    expenses: "المصاريف",
    incomes: "الدخول",
    noExpenseCategory: "ما كاين حتى كاتيغوري ديال المصروف.",
    noIncomeCategory: "ما كايناش فئة دخل ظاهرة. الدخل كيتسير أوتوماتيكياً.",
    auto: "أوتو",
    unmapped: "ما مربوطةش",
    save: "حفظ",
    rename: "بدل الاسم",
    delete: "حيد",
    currentDeleteConfirm: "حذف الكاتيغوري",
    noneSelected: "ما كاين حتى كاتيغوري محدد.",
    chooseAtLeastOne: "اختار على الأقل كاتيغوري وحدة باش تزيد.",
    nothingToAdd: "ما كاين والو باش تزيد.",
    allExist: "جميع الكاتيغوريات راهم موجودين.",
    addSuccess: "تزادت بنجاح.",
    addFailed: "ما قدرناش نزيدوها.",
    deleteSuccess: "تم الحذف بنجاح.",
    deleteFailed: "ما قدرناش نحيدوها.",
    mappingFailed: "الربط فشل.",
    addedMapped: "تزادو الكاتيغوريات وتربطو.",
    addedWithoutMapping: "تزادو الكاتيغوريات وبقا الربط من بعد.",
  },
};

const formatError = (error: unknown, fallback: string) => {
  if (!error) return fallback;
  if (error instanceof Error) return error.message;
  return String(error);
};

const areArraysEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

const PRESET_PACKS = [
  {
    key: "single",
    label: "Single",
    description: "Essentiels pour une personne seule.",
    categories: [
      "rent",
      "electricity",
      "water",
      "internet",
      "phone",
      "groceries",
      "transport_public",
      "health_generic",
      "entertainment",
      "subscriptions",
      "bills_generic",
    ],
  },
  {
    key: "couple",
    label: "Couple",
    description: "Charges partagees et vie a deux.",
    categories: [
      "rent",
      "housing_generic",
      "groceries",
      "restaurants",
      "transport_public",
      "insurance_other",
      "bills_generic",
      "entertainment",
    ],
  },
  {
    key: "travailleur",
    label: "Travailleur",
    description: "Depenses liees au travail.",
    categories: [
      "business_travel",
      "restaurants",
      "business_tools",
      "freelance_expenses",
      "admin_fees",
      "taxes",
    ],
  },
  {
    key: "enfants",
    label: "Enfants",
    description: "Depenses pour les enfants.",
    categories: [
      "childcare",
      "children_school",
      "children_activities",
      "groceries",
      "shopping",
      "health_consultation",
      "family_support",
    ],
  },
  {
    key: "dependance",
    label: "Dependance",
    description: "Aide aux proches.",
    categories: [
      "family_support",
      "health_consultation",
      "transport_taxi",
      "groceries",
    ],
  },
  {
    key: "marie",
    label: "Marie",
    description: "Depenses de couple/foyer.",
    categories: ["gifts_charity", "family_support", "house_supplies", "travel"],
  },
];

const PRESET_PACK_TRANSLATIONS: Record<
  string,
  Record<FloussyLocale, { label: string; description: string }>
> = {
  single: {
    fr: { label: "Single", description: "Essentiels pour une personne seule." },
    en: { label: "Single", description: "Essentials for one person." },
    ar: { label: "بوحدك", description: "الأساسيات ديال شخص واحد." },
  },
  couple: {
    fr: { label: "Couple", description: "Charges partagees et vie a deux." },
    en: { label: "Couple", description: "Shared costs and life as a couple." },
    ar: { label: "زوج", description: "مصاريف مشتركة وحياة بجوج." },
  },
  travailleur: {
    fr: { label: "Travailleur", description: "Depenses liees au travail." },
    en: { label: "Worker", description: "Work-related expenses." },
    ar: { label: "الخدمة", description: "مصاريف مرتبطة بالخدمة." },
  },
  enfants: {
    fr: { label: "Enfants", description: "Depenses pour les enfants." },
    en: { label: "Children", description: "Expenses for children." },
    ar: { label: "الأطفال", description: "مصاريف الأطفال." },
  },
  dependance: {
    fr: { label: "Dependance", description: "Aide aux proches." },
    en: { label: "Dependents", description: "Support for relatives." },
    ar: { label: "المقربين", description: "مساعدة للمقربين." },
  },
  marie: {
    fr: { label: "Marie", description: "Depenses de couple/foyer." },
    en: { label: "Household", description: "Household and couple spending." },
    ar: { label: "الدار", description: "مصاريف الدار والزوج." },
  },
};

function localizePresetCategory(name: string, locale: FloussyLocale) {
  return localizeCatalogCategoryName(name, locale);
}

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
  "commissions",
  "pension",
  "pensions",
  "allocation",
  "allocations",
  "rente",
  "rentes",
  "refund",
  "remboursement",
  "راتب",
  "دخل",
  "مكافأة",
  "عمولة",
  "ربح",
  "مبيعات",
  "استرداد",
  "تعويض",
  "فوائد",
  "هبة",
];

type CategoryKind = "income" | "expense" | "mixed";
type CategoryOverride = "income" | "expense";

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const localizeCategoryName = (name: string, locale: FloussyLocale) => {
  return localizeCatalogCategoryName(name, locale);
};

const detectKindFromName = (name: string): CategoryKind => {
  if (isInternalIncomeCategory(name)) return "income";
  const normalized = normalizeName(name);
  return INCOME_KEYWORDS.some((keyword) => normalized.includes(keyword))
    ? "income"
    : "expense";
};

export default function CategoriesPage() {
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "categories-page-ar-body");
  const copy = CATEGORY_UI_COPY[locale];
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [profileSignals, setProfileSignals] = useState<{
    hasChildren: boolean;
    hasBusinessActivity: boolean;
  }>({
    hasChildren: false,
    hasBusinessActivity: false,
  });
  const localizedPresetPacks = useMemo(
    () =>
      PRESET_PACKS.map((pack) => ({
        ...pack,
        label: PRESET_PACK_TRANSLATIONS[pack.key]?.[locale]?.label ?? pack.label,
        description:
          PRESET_PACK_TRANSLATIONS[pack.key]?.[locale]?.description ?? pack.description,
        categories: pack.categories,
      })).filter((pack) => {
        if (pack.key === "enfants" && !profileSignals.hasChildren) return false;
        if (pack.key === "travailleur" && !profileSignals.hasBusinessActivity) {
          return false;
        }
        return true;
      }),
    [locale, profileSignals.hasBusinessActivity, profileSignals.hasChildren]
  );
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeOut[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const issue = getIssueDisplay(error, locale);

  const [newName, setNewName] = useState("");
  const [newCategoryType, setNewCategoryType] =
    useState<CategoryOverride>("expense");
  const [newCategoryEnvelopeId, setNewCategoryEnvelopeId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [individualOpen, setIndividualOpen] = useState(false);
  const [createdIndividual, setCreatedIndividual] = useState<CategoryOut[]>([]);

  const [search, setSearch] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);
  const [selectedPackKeys, setSelectedPackKeys] = useState<string[]>([]);
  const [presetCategoryList, setPresetCategoryList] = useState<string[]>([]);
  const [selectedPresetCategories, setSelectedPresetCategories] = useState<
    string[]
  >([]);
  const [presetStep, setPresetStep] = useState<1 | 2>(1);
  const [createdPresetCategories, setCreatedPresetCategories] = useState<
    CategoryOut[]
  >([]);
  const [presetMappings, setPresetMappings] = useState<Record<string, string>>(
    {}
  );
  const [skipMapping, setSkipMapping] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [categoryTypeOverrides, setCategoryTypeOverrides] = useState<
    Record<string, CategoryOverride>
  >({});
  const issueParam = searchParams.get("issue");

  const notificationIssueGuidance = useMemo(() => {
    if (issueParam !== "unmapped-categories") return null;
    return {
      title:
        locale === "ar"
          ? "تنبيه: كاينين فئات ما مربوطةش"
          : locale === "en"
          ? "Action required: unmapped categories"
          : "Action requise: catégories non mappées",
      description:
        locale === "ar"
          ? "ربط كل فئة بالمظروف المناسب باش المصاريف يتحسبو بشكل صحيح."
          : locale === "en"
          ? "Map each category to the correct envelope so expenses are distributed correctly."
          : "Relie chaque catégorie à la bonne enveloppe pour que les dépenses soient réparties correctement.",
    };
  }, [issueParam, locale]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, envs, mappingList, txs, onboardingRecords] = await Promise.all([
        apiFetch<CategoryOut[]>("/categories"),
        apiFetch<EnvelopeOut[]>("/envelopes"),
        apiFetch<CategoryEnvelopeMapOut[]>("/mappings"),
        apiFetch<TransactionOut[]>("/transactions"),
        apiFetch<OnboardingV2RecordOut[]>("/users/me/onboarding-v2-records?limit=1").catch(
          () => [] as OnboardingV2RecordOut[]
        ),
      ]);
      const mappingMap = mappingList.reduce<Record<string, string>>(
        (acc, item) => ({
          ...acc,
          [item.category_id]: item.envelope_id,
        }),
        {}
      );
      setCategories(cats);
      setEnvelopes(envs);
      setMappings(mappingMap);
      setTransactions(txs);
      const payload = onboardingRecords[0]?.payload;
      const answers =
        payload && typeof payload === "object" && "answers" in payload
          ? (payload.answers as Record<string, unknown>)
          : {};
      const incomeType =
        typeof answers.Q0_income_type === "string"
          ? answers.Q0_income_type.trim().toLowerCase()
          : "";
      const hasChildren =
        (typeof answers.E6_has_children === "string" &&
          answers.E6_has_children.toLowerCase() === "yes") ||
        (typeof answers.E6_children_count === "number" &&
          Number(answers.E6_children_count) > 0);
      const hasBusinessFlag = Object.entries(answers).some(([key, rawValue]) => {
        const k = key.toLowerCase();
        if (
          ![
            "business_travel",
            "freelance_expenses",
            "business_expense",
            "business_cost",
            "work_tools",
            "deplacements_pro",
          ].some((token) => k.includes(token))
        ) {
          return false;
        }
        if (typeof rawValue === "number") return rawValue > 0;
        if (typeof rawValue === "boolean") return rawValue;
        if (typeof rawValue === "string") {
          const v = rawValue.trim().toLowerCase();
          return ["yes", "true", "oui", "1"].includes(v) || Number(v) > 0;
        }
        return false;
      });
      setProfileSignals({
        hasChildren,
        hasBusinessActivity:
          ["freelancer", "hirafi", "mixed"].includes(incomeType) || hasBusinessFlag,
      });
    } catch (err) {
      setError(formatError(err, copy.unknownError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      setCategoryTypeOverrides({});
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(
      "floussy_category_type_overrides",
      JSON.stringify(categoryTypeOverrides)
    );
  }, [mounted, categoryTypeOverrides]);

  useEffect(() => {
    if (!presetOpen) {
      setSelectedPackKeys((prev) => (prev.length ? [] : prev));
      setPresetCategoryList((prev) => (prev.length ? [] : prev));
      setSelectedPresetCategories((prev) => (prev.length ? [] : prev));
      setCreatedPresetCategories((prev) => (prev.length ? [] : prev));
      setPresetMappings((prev) =>
        Object.keys(prev).length ? {} : prev
      );
      setPresetStep((prev) => (prev === 1 ? prev : 1));
      setSkipMapping(false);
    }
  }, [presetOpen]);

  useEffect(() => {
    if (!bulkDeleteOpen) {
      setBulkDeleteIds((prev) => (prev.length ? [] : prev));
    }
  }, [bulkDeleteOpen]);

  useEffect(() => {
    if (!individualOpen) {
      setCreatedIndividual((prev) => (prev.length ? [] : prev));
      setNewName("");
      setNewCategoryEnvelopeId("");
    }
  }, [individualOpen]);

  useEffect(() => {
    if (!presetOpen) return;

    if (selectedPackKeys.length === 0) {
      setPresetCategoryList((prev) => (prev.length ? [] : prev));
      setSelectedPresetCategories((prev) => (prev.length ? [] : prev));
      return;
    }

    const next = new Set<string>();
    selectedPackKeys.forEach((key) => {
      const pack = localizedPresetPacks.find((item) => item.key === key);
      pack?.categories.forEach((cat) => next.add(cat));
    });
    const sorted = Array.from(next).sort();
    setPresetCategoryList((prev) => (areArraysEqual(prev, sorted) ? prev : sorted));
    setSelectedPresetCategories((prev) =>
      areArraysEqual(prev, sorted) ? prev : sorted
    );
  }, [localizedPresetPacks, presetOpen, selectedPackKeys]);

  const envelopeMap = useMemo(() => {
    return new Map(
      envelopes.map((env) => [env.id, localizeEnvelopeLabel(env.name, locale)])
    );
  }, [envelopes, locale]);
  const mappableEnvelopes = useMemo(
    () =>
      envelopes.filter(
        (env) => !env.is_cash && !env.is_default_savings && !env.is_goal
      ),
    [envelopes]
  );

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

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories
      .filter((cat) => !isInternalIncomeCategory(cat.name))
      .filter((cat) =>
        term
          ? cat.name.toLowerCase().includes(term) ||
            localizeCategoryName(cat.name, locale).toLowerCase().includes(term)
          : true
      )
      .sort((a, b) =>
        localizeCategoryName(a.name, locale).localeCompare(
          localizeCategoryName(b.name, locale)
        )
      );
  }, [categories, search, locale]);

  const filteredIncomeCategories = useMemo(() => {
    return filteredCategories.filter(
      (cat) => categoryKindById.get(cat.id) === "income"
    );
  }, [filteredCategories, categoryKindById]);

  const filteredExpenseCategories = useMemo(() => {
    return filteredCategories.filter(
      (cat) => categoryKindById.get(cat.id) !== "income"
    );
  }, [filteredCategories, categoryKindById]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = newName.trim();
    if (!trimmed) {
      setError("CATEGORY_NAME_REQUIRED");
      return;
    }

    const optimistic: CategoryOut = {
      id: `temp-${Date.now()}`,
      name: trimmed,
    };
    setCategories((prev) => [optimistic, ...prev]);
    setNewName("");

    try {
      setSaving(true);
      const created = await apiFetch<CategoryOut>("/categories", {
        method: "POST",
        body: { name: trimmed },
      });
      setCategories((prev) =>
        prev.map((cat) => (cat.id === optimistic.id ? created : cat))
      );
      setCreatedIndividual((prev) => [created, ...prev]);
      if (newCategoryEnvelopeId) {
        await apiFetch(`/categories/${created.id}/envelope`, {
          method: "PUT",
          body: { envelope_id: newCategoryEnvelopeId },
        });
        setMappings((prev) => ({
          ...prev,
          [created.id]: newCategoryEnvelopeId,
        }));
      }
      setCategoryTypeOverrides((prev) => ({
        ...prev,
        [created.id]: newCategoryType,
      }));
    } catch (err) {
      setCategories((prev) => prev.filter((cat) => cat.id !== optimistic.id));
      setError(formatError(err, copy.unknownError));
    } finally {
      setSaving(false);
    }
  };

  const handleRename = (cat: CategoryOut) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleTypeOverrideChange = (categoryId: string, value: string) => {
    if (value === "auto") {
      setCategoryTypeOverrides((prev) => {
        if (!prev[categoryId]) return prev;
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
      return;
    }
    if (value === "income" || value === "expense") {
      setCategoryTypeOverrides((prev) => ({
        ...prev,
        [categoryId]: value,
      }));
    }
  };

  const handleSaveRename = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setError("CATEGORY_NAME_REQUIRED");
      return;
    }

    const snapshot = categories;
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === editingId ? { ...cat, name: trimmed } : cat
      )
    );

    try {
      setSaving(true);
      await apiFetch<CategoryOut>(`/categories/${editingId}`, {
        method: "PATCH",
        body: { name: trimmed },
      });
      setEditingId(null);
      setEditingName("");
    } catch (err) {
      setCategories(snapshot);
      setError(formatError(err, copy.unknownError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: CategoryOut) => {
    const localizedCategoryName = localizeCategoryName(cat.name, locale);
    const ok = window.confirm(`${copy.currentDeleteConfirm} "${localizedCategoryName}" ?`);
    if (!ok) return;

    const snapshot = categories;
    setCategories((prev) => prev.filter((item) => item.id !== cat.id));

    try {
      setSaving(true);
      await apiFetch(`/categories/${cat.id}`, { method: "DELETE" });
      await apiFetch(`/categories/${cat.id}/envelope`, { method: "DELETE" }).catch(
        () => null
      );
      setMappings((prev) => {
        const next = { ...prev };
        delete next[cat.id];
        return next;
      });
      toast({
        title: copy.deleteSuccess,
        description: `${copy.title} "${localizedCategoryName}"`,
        variant: "success",
      });
    } catch (err) {
      setCategories(snapshot);
      setError(formatError(err, copy.unknownError));
    } finally {
      setSaving(false);
    }
  };

  const handleMappingChange = async (categoryId: string, envelopeId: string) => {
    setError(null);
    const snapshot = mappings;

    setMappings((prev) => {
      const next = { ...prev };
      if (!envelopeId) {
        delete next[categoryId];
      } else {
        next[categoryId] = envelopeId;
      }
      return next;
    });

    try {
      setSaving(true);
      if (!envelopeId) {
        await apiFetch(`/categories/${categoryId}/envelope`, { method: "DELETE" });
      } else {
        await apiFetch(`/categories/${categoryId}/envelope`, {
          method: "PUT",
          body: { envelope_id: envelopeId },
        });
      }
    } catch (err) {
      setMappings(snapshot);
      setError(formatError(err, copy.unknownError));
    } finally {
      setSaving(false);
    }
  };

  const handlePresetToggle = (key: string) => {
    setSelectedPackKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handlePresetCategoryToggle = (name: string) => {
    setSelectedPresetCategories((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const handleApplyPresets = async () => {
    if (selectedPresetCategories.length === 0) {
      toast({
        title: copy.noneSelected,
        description: copy.chooseAtLeastOne,
      });
      return;
    }

    const existing = new Set(categories.map((cat) => getCanonicalCategoryKey(cat.name)));
    const toCreate = selectedPresetCategories.filter(
      (name) => !existing.has(getCanonicalCategoryKey(name))
    );

    if (toCreate.length === 0) {
      toast({
        title: copy.nothingToAdd,
        description: copy.allExist,
      });
      setPresetOpen(false);
      return;
    }

    setPresetSaving(true);
    setError(null);
    try {
      const created = await Promise.all(
        toCreate.map((name) =>
          apiFetch<CategoryOut>("/categories", {
            method: "POST",
            body: { name },
          })
        )
      );
      setCreatedPresetCategories(created);

      if (skipMapping || created.length === 0) {
        await loadData();
        setPresetOpen(false);
        toast({
          title: copy.addSuccess,
          description: `${toCreate.length} categorie(s) ajoutee(s).`,
          variant: "success",
        });
      } else {
        setPresetStep(2);
      }
    } catch (err) {
      setError(formatError(err, copy.unknownError));
      toast({
        title: copy.addFailed,
        description: formatError(err, copy.unknownError),
        variant: "danger",
      });
    } finally {
      setPresetSaving(false);
    }
  };

  const handleToggleBulkDelete = (categoryId: string) => {
    setBulkDeleteIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleBulkDelete = async () => {
    if (bulkDeleteIds.length === 0) {
      toast({
        title: copy.noneSelected,
        description: copy.bulkDeleteDesc,
      });
      return;
    }

    setBulkDeleting(true);
    setError(null);
    const snapshot = categories;

    setCategories((prev) =>
      prev.filter((cat) => !bulkDeleteIds.includes(cat.id))
    );

    try {
      await Promise.all(
        bulkDeleteIds.map((categoryId) =>
          apiFetch(`/categories/${categoryId}`, { method: "DELETE" })
        )
      );
      await Promise.all(
        bulkDeleteIds.map((categoryId) =>
          apiFetch(`/categories/${categoryId}/envelope`, { method: "DELETE" }).catch(
            () => null
          )
        )
      );
      setMappings((prev) => {
        const next = { ...prev };
        bulkDeleteIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      setBulkDeleteOpen(false);
      toast({
        title: copy.deleteSuccess,
        description: `${bulkDeleteIds.length} categorie(s) supprimee(s).`,
        variant: "success",
      });
    } catch (err) {
      setCategories(snapshot);
      setError(formatError(err, copy.unknownError));
      toast({
        title: copy.deleteFailed,
        description: formatError(err, copy.unknownError),
        variant: "danger",
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleAllBulkDelete = (ids: string[]) => {
    setBulkDeleteIds((prev) =>
      prev.length === ids.length ? [] : ids
    );
  };

  const handlePresetMappingChange = (categoryId: string, envelopeId: string) => {
    setPresetMappings((prev) => ({ ...prev, [categoryId]: envelopeId }));
  };

  const handleFinishPresetMapping = async () => {
    setPresetSaving(true);
    setError(null);
    try {
      const entries = Object.entries(presetMappings).filter(([, envId]) => envId);
      if (entries.length > 0) {
        await Promise.all(
          entries.map(([categoryId, envelopeId]) =>
            apiFetch(`/categories/${categoryId}/envelope`, {
              method: "PUT",
              body: { envelope_id: envelopeId },
            })
          )
        );
      }
      await loadData();
      setPresetOpen(false);
      toast({
        title: copy.addSuccess,
        description: copy.addedMapped,
        variant: "success",
      });
    } catch (err) {
      setError(formatError(err, copy.unknownError));
      toast({
        title: copy.mappingFailed,
        description: formatError(err, copy.unknownError),
        variant: "danger",
      });
    } finally {
      setPresetSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8" dir={dir}>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
      />

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

      <Section title={copy.addSection}>
        <div className="flex flex-wrap items-center gap-2">
          {mounted ? (
            <Dialog open={individualOpen} onOpenChange={setIndividualOpen}>
              <DialogTrigger asChild>
                <Button type="button">{copy.individualAdd}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{copy.individualAdd}</DialogTitle>
                  <DialogDescription>{copy.individualAddDesc}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate} className="flex flex-col gap-3">
                  <input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    placeholder={copy.categoryName}
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-[var(--muted)]">{copy.type}</span>
                      <select
                        value={newCategoryType}
                        onChange={(event) =>
                          setNewCategoryType(event.target.value as CategoryOverride)
                        }
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                      >
                        <option value="expense">{copy.expense}</option>
                        <option value="income">{copy.income}</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="text-[var(--muted)]">{copy.envelopeOptional}</span>
                      <select
                        value={newCategoryEnvelopeId}
                        onChange={(event) =>
                          setNewCategoryEnvelopeId(event.target.value)
                        }
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                      >
                        <option value="">{copy.later}</option>
                        {mappableEnvelopes.map((env) => (
                            <option key={env.id} value={env.id}>
                              {localizeEnvelopeLabel(env.name, locale)}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  <Button type="submit" isLoading={saving}>
                    {copy.add}
                  </Button>
                </form>

                {createdIndividual.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {copy.addedAppear}
                  </p>
                ) : (
                  <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      {copy.addedThisSession}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {createdIndividual.map((cat) => (
                        <li key={cat.id} className="text-[var(--ink)]">
                          {localizeCategoryName(cat.name, locale)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button variant="secondary" type="button">
                      {copy.close}
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}

          {mounted ? (
            <Dialog open={presetOpen} onOpenChange={setPresetOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" type="button">
                  {copy.quickCollective}
                </Button>
              </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>{copy.advancedSettings}</DialogTitle>
                <DialogDescription>{copy.collectiveDesc}</DialogDescription>
              </DialogHeader>

              {presetStep === 1 ? (
                <>
                  <div className="grid gap-3">
                    {localizedPresetPacks.map((pack) => (
                      <label
                        key={pack.key}
                        className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPackKeys.includes(pack.key)}
                          onChange={() => handlePresetToggle(pack.key)}
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
                      {copy.suggestedCategories}
                    </p>
                    {presetCategoryList.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {copy.choosePack}
                      </p>
                    ) : (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {presetCategoryList.map((name) => (
                          <label
                            key={name}
                            className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPresetCategories.includes(name)}
                              onChange={() => handlePresetCategoryToggle(name)}
                            />
                            <span>{localizePresetCategory(name, locale)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={skipMapping}
                        onChange={(event) => setSkipMapping(event.target.checked)}
                      />
                      <span>{copy.mapLaterLine}</span>
                    </label>
                  </div>

                  <DialogFooter className="mt-4">
                    <DialogClose asChild>
                      <Button variant="secondary" type="button">
                        {copy.cancel}
                      </Button>
                    </DialogClose>
                    <Button
                      type="button"
                      onClick={handleApplyPresets}
                      isLoading={presetSaving}
                      disabled={selectedPresetCategories.length === 0}
                    >
                      {skipMapping ? copy.addCategories : copy.continue}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>{copy.step2Mapping}</DialogTitle>
                    <DialogDescription>{copy.step2Desc}</DialogDescription>
                  </DialogHeader>

                  {createdPresetCategories.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      {copy.noNewCategoryToMap}
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {createdPresetCategories.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
                        >
                          <span className="font-medium text-[var(--ink)]">
                            {localizeCategoryName(cat.name, locale)}
                          </span>
                          <select
                            value={presetMappings[cat.id] ?? ""}
                            onChange={(event) =>
                              handlePresetMappingChange(cat.id, event.target.value)
                            }
                            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                          >
                            <option value="">{copy.later}</option>
                            {mappableEnvelopes.map((env) => (
                                <option key={env.id} value={env.id}>
                                  {localizeEnvelopeLabel(env.name, locale)}
                                </option>
                              ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}

                  <DialogFooter className="mt-4">
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setPresetStep(1)}
                    >
                      {copy.back}
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setPresetOpen(false);
                        toast({
                          title: copy.addSuccess,
                          description: copy.addedWithoutMapping,
                          variant: "success",
                        });
                      }}
                    >
                      {copy.mapLater}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleFinishPresetMapping}
                      isLoading={presetSaving}
                    >
                      {copy.finish}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        ) : null}
        </div>
      </Section>

      <Section title={copy.listSection}>
        <Card className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">
                {filteredCategories.length} {copy.categoriesCount}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder={copy.searchCategories}
              />
              {mounted ? (
                <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="danger" type="button">
                      {copy.bulkDelete}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{copy.bulkDelete}</DialogTitle>
                      <DialogDescription>{copy.bulkDeleteDesc}</DialogDescription>
                    </DialogHeader>

                    {filteredCategories.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">
                        {copy.noCategoryToDelete}
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={
                                bulkDeleteIds.length === filteredCategories.length
                              }
                              onChange={() =>
                                toggleAllBulkDelete(
                                  filteredCategories.map((cat) => cat.id)
                                )
                              }
                            />
                            <span className="font-medium text-[var(--ink)]">
                              {copy.selectAll}
                            </span>
                          </label>
                          <Badge tone="muted">
                            {bulkDeleteIds.length} / {filteredCategories.length} {copy.selected}
                          </Badge>
                        </div>

                        {filteredCategories.map((cat) => (
                          <label
                            key={cat.id}
                            className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={bulkDeleteIds.includes(cat.id)}
                              onChange={() => handleToggleBulkDelete(cat.id)}
                            />
                            <span className="font-medium text-[var(--ink)]">
                              {localizeCategoryName(cat.name, locale)}
                            </span>
                            <Badge
                              tone={
                                categoryKindById.get(cat.id) === "income"
                                  ? "accent"
                                  : categoryKindById.get(cat.id) === "mixed"
                                  ? "warning"
                                  : "muted"
                              }
                            >
                              {categoryKindById.get(cat.id) === "income"
                                ? copy.income
                                : categoryKindById.get(cat.id) === "mixed"
                                ? copy.mixed
                                : copy.expense}
                            </Badge>
                          </label>
                        ))}
                      </div>
                    )}

                    <DialogFooter className="mt-4">
                      <DialogClose asChild>
                        <Button variant="secondary" type="button">
                          {copy.cancel}
                        </Button>
                      </DialogClose>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={handleBulkDelete}
                        isLoading={bulkDeleting}
                        disabled={bulkDeleteIds.length === 0}
                      >
                        {copy.deleteSelection}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <EmptyState
              title={copy.noCategories}
              description={copy.noCategoriesDesc}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:border-r md:border-[var(--border)] md:pr-6 md:min-w-0">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    {copy.expenses}
                  </p>
                  <Badge tone="muted">{filteredExpenseCategories.length}</Badge>
                </div>
                {filteredExpenseCategories.length === 0 ? (
                  <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)]">
                    {copy.noExpenseCategory}
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                    {filteredExpenseCategories.map((cat) => {
                      const mappedId = mappings[cat.id];
                      const mappedName = mappedId ? envelopeMap.get(mappedId) : null;
                      return (
                        <div
                          key={cat.id}
                          className="flex flex-col gap-4 px-5 py-6 text-sm leading-relaxed md:flex-row md:items-center md:gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2">
                              <span className="font-medium text-[var(--ink)]">
                                {localizeCategoryName(cat.name, locale)}
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  tone={
                                    categoryKindById.get(cat.id) === "mixed"
                                      ? "warning"
                                      : "muted"
                                  }
                                >
                                  {categoryKindById.get(cat.id) === "mixed"
                                    ? copy.mixed
                                    : copy.expense}
                                </Badge>
                                <select
                                  value={categoryTypeOverrides[cat.id] ?? "auto"}
                                  onChange={(event) =>
                                    handleTypeOverrideChange(
                                      cat.id,
                                      event.target.value
                                    )
                                  }
                                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                                >
                                  <option value="auto">{copy.auto}</option>
                                  <option value="expense">{copy.expense}</option>
                                  <option value="income">{copy.income}</option>
                                </select>
                                {mappedName ? (
                                  <Badge tone="accent">{mappedName}</Badge>
                                ) : (
                                  <Badge tone="muted">{copy.unmapped}</Badge>
                                )}
                              </div>
                            </div>
                            {editingId === cat.id ? (
                              <div className="mt-2 flex flex-col gap-2 md:flex-row">
                                <input
                                  value={editingName}
                                  onChange={(event) =>
                                    setEditingName(event.target.value)
                                  }
                                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                                />
                                <Button size="sm" onClick={handleSaveRename}>
                                  {copy.save}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setEditingId(null)}
                                >
                                  {copy.cancel}
                                </Button>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-2 md:max-w-[260px] md:flex-1 md:justify-end">
                            <select
                              value={mappedId ?? ""}
                              onChange={(event) =>
                                handleMappingChange(cat.id, event.target.value)
                              }
                              className="w-full min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 md:w-full"
                            >
                              <option value="">{copy.unmapped}</option>
                              {mappableEnvelopes.map((env) => (
                                  <option key={env.id} value={env.id}>
                                    {localizeEnvelopeLabel(env.name, locale)}
                                  </option>
                                ))}
                            </select>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => handleRename(cat)}
                            >
                              {copy.rename}
                            </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDelete(cat)}
                              >
                                {copy.delete}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="md:pl-6 md:min-w-0">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    {copy.incomes}
                  </p>
                  <Badge tone="accent">{filteredIncomeCategories.length}</Badge>
                </div>
                {filteredIncomeCategories.length === 0 ? (
                  <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--muted)]">
                    {copy.noIncomeCategory}
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                    {filteredIncomeCategories.map((cat) => {
                      const mappedId = mappings[cat.id];
                      const mappedName = mappedId ? envelopeMap.get(mappedId) : null;
                      return (
                        <div
                          key={cat.id}
                          className="flex flex-col gap-4 px-5 py-6 text-sm leading-relaxed md:flex-row md:items-center md:gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2">
                              <span className="font-medium text-[var(--ink)]">
                                {localizeCategoryName(cat.name, locale)}
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone="accent">{copy.income}</Badge>
                                <select
                                  value={categoryTypeOverrides[cat.id] ?? "auto"}
                                  onChange={(event) =>
                                    handleTypeOverrideChange(
                                      cat.id,
                                      event.target.value
                                    )
                                  }
                                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                                >
                                  <option value="auto">{copy.auto}</option>
                                  <option value="expense">{copy.expense}</option>
                                  <option value="income">{copy.income}</option>
                                </select>
                                {mappedName ? (
                                  <Badge tone="accent">{mappedName}</Badge>
                                ) : (
                                  <Badge tone="muted">{copy.unmapped}</Badge>
                                )}
                              </div>
                            </div>
                            {editingId === cat.id ? (
                              <div className="mt-2 flex flex-col gap-2 md:flex-row">
                                <input
                                  value={editingName}
                                  onChange={(event) =>
                                    setEditingName(event.target.value)
                                  }
                                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                                />
                                <Button size="sm" onClick={handleSaveRename}>
                                  {copy.save}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setEditingId(null)}
                                >
                                  {copy.cancel}
                                </Button>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-2 md:max-w-[260px] md:flex-1 md:justify-end">
                            <select
                              value={mappedId ?? ""}
                              onChange={(event) =>
                                handleMappingChange(cat.id, event.target.value)
                              }
                              className="w-full min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 md:w-full"
                            >
                              <option value="">{copy.unmapped}</option>
                              {mappableEnvelopes.map((env) => (
                                  <option key={env.id} value={env.id}>
                                    {localizeEnvelopeLabel(env.name, locale)}
                                  </option>
                                ))}
                            </select>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              onClick={() => handleRename(cat)}
                            >
                              {copy.rename}
                            </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDelete(cat)}
                              >
                                {copy.delete}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </Section>
    </div>
  );
}
