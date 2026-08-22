"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch, fetchDashboard } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import {
  computeTargetAmount,
  loadBudgetPlan,
  saveBudgetPlan,
  type BudgetPlanData,
  type BudgetPlanItem,
  type BudgetTargetType,
} from "@/lib/budgetPlan";
import { formatMoney } from "@/lib/reports";
import type {
  CategoryEnvelopeMapOut,
  CategoryOut,
  DashboardOut,
  EnvelopeOut,
  SettingsResponse,
  TransactionOut,
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { localizeCategoryName } from "@/lib/categoryCatalog";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";

const DEFAULT_PRIORITY = 5;
const PRIORITY_MIN = 1;
const PRIORITY_MAX = 10;
const PRIORITY_WEIGHTS = [30, 25, 20, 15, 7, 3];
const NONE_ENVELOPE = "none";

const PLANNER_COPY: Record<FloussyLocale, Record<string, string>> = {
  fr: {
    unknownError: "Erreur inconnue",
    requiredName: "Le nom de catégorie est obligatoire.",
    selectCategory: "Choisis une catégorie à ajouter.",
    alreadyAdded: "Déjà ajoutée",
    addDuplicate: "est déjà dans le plan.",
    savePlan: "Enregistrer le plan",
    saving: "Enregistrement...",
    saveSuccess: "Plan enregistré",
    storedSettings: "Plan sauvegardé dans les réglages du compte.",
    storedLocal: "Plan sauvegardé sur cet appareil.",
    saveFailed: "Échec de sauvegarde",
    title: "Planner",
    subtitle: "Construis ton plan budget avec cibles et priorités.",
    advancedConfig: "Configuration avancée",
    advancedBudgetConfig: "Configuration budget avancée",
    advancedDesc: "Ajuste priorités, cibles et repères visuels pour chaque catégorie.",
    equalDistribution: "Répartition égale",
    priorityDistribution: "Répartition par priorité",
    addToEdit: "Ajoute des catégories au plan pour les éditer ici.",
    close: "Fermer",
    loading: "Chargement...",
    summary: "Résumé",
    currentPeriod: "Période actuelle",
    notSaved: "Pas encore enregistré",
    projectedIncome: "Revenu projeté",
    totalTargets: "Total des cibles",
    remainingAllocate: "Reste à allouer",
    spentSoFar: "Déjà dépensé",
    targetWarning: "Attention: tes cibles dépassent le revenu projeté.",
    invalidValues: "Corrige les valeurs invalides avant de sauvegarder.",
    suggestions: "Suggestions",
    suggestionsDesc: "Ajoute vite les catégories manquantes au plan.",
    available: "disponible(s)",
    allIncluded: "Toutes les catégories sont déjà incluses dans le plan.",
    mappedTo: "Reliée à",
    envelopeFallback: "Enveloppe",
    unmapped: "Non mappée",
    add: "Ajouter",
    manualAdd: "Ajout manuel",
    manualDesc: "Crée une nouvelle ligne budget avec type, valeur et priorité.",
    useExisting: "Utiliser une catégorie existante",
    createCategory: "Créer une catégorie",
    category: "Catégorie",
    envelopeOptional: "Enveloppe (optionnel)",
    optional: "Optionnel",
    none: "Aucune",
    newCategoryName: "Nom de la nouvelle catégorie",
    newCategoryPlaceholder: "ex: Courses",
    targetType: "Type de cible",
    fixed: "Fixe",
    percentage: "Pourcentage",
    value: "Valeur",
    priority: "Priorité",
    iconColor: "Icône + couleur",
    categoriesInPlan: "catégories dans le plan",
    overview: "Vue du plan",
    overviewDesc: "Revois les cibles, la progression et les écarts recommandés.",
    startBuilding: "Ajoute des catégories pour commencer ton plan.",
    unknownCategory: "Catégorie inconnue",
    envelopeLabel: "Enveloppe",
    remove: "Retirer",
    target: "Cible",
    spent: "Dépensé",
    gap: "Écart",
    storedInSettings: "Stocké dans les réglages",
    storedLocally: "Stocké localement",
    tableCategory: "Catégorie",
    tableEnvelope: "Enveloppe",
    tableType: "Type",
    tableValue: "Valeur",
    tablePriority: "Priorité",
    tableColor: "Couleur",
    tableIcon: "Icône",
    tableTarget: "Cible",
  },
  en: {
    unknownError: "Unknown error",
    requiredName: "Category name is required.",
    selectCategory: "Select a category to add.",
    alreadyAdded: "Already added",
    addDuplicate: "is already in the plan.",
    savePlan: "Save plan",
    saving: "Saving...",
    saveSuccess: "Plan saved",
    storedSettings: "Budget plan stored in account settings.",
    storedLocal: "Budget plan saved on this device.",
    saveFailed: "Save failed",
    title: "Planner",
    subtitle: "Design your budget plan with targets and priorities.",
    advancedConfig: "Advanced config",
    advancedBudgetConfig: "Advanced budget configuration",
    advancedDesc: "Adjust priorities, targets, and visual cues for every category.",
    equalDistribution: "Equal distribution",
    priorityDistribution: "Priority distribution",
    addToEdit: "Add categories to the plan to edit them here.",
    close: "Close",
    loading: "Loading...",
    summary: "Summary",
    currentPeriod: "Current period",
    notSaved: "Not saved yet",
    projectedIncome: "Projected income",
    totalTargets: "Total targets",
    remainingAllocate: "Remaining to allocate",
    spentSoFar: "Spent so far",
    targetWarning: "Warning: your total targets exceed projected income.",
    invalidValues: "Resolve invalid values before saving.",
    suggestions: "Suggestions",
    suggestionsDesc: "Quickly add categories missing from your plan.",
    available: "available",
    allIncluded: "All categories are already included in your plan.",
    mappedTo: "Mapped to",
    envelopeFallback: "Envelope",
    unmapped: "Unmapped",
    add: "Add",
    manualAdd: "Manual add",
    manualDesc: "Create a new budget line with target type, value, and priority.",
    useExisting: "Use existing category",
    createCategory: "Create new category",
    category: "Category",
    envelopeOptional: "Envelope (optional)",
    optional: "Optional",
    none: "None",
    newCategoryName: "New category name",
    newCategoryPlaceholder: "e.g. Groceries",
    targetType: "Target type",
    fixed: "Fixed",
    percentage: "Percentage",
    value: "Value",
    priority: "Priority",
    iconColor: "Icon + color",
    categoriesInPlan: "categories in plan",
    overview: "Plan overview",
    overviewDesc: "Review targets, progress, and recommended gaps.",
    startBuilding: "Add categories to start building your plan.",
    unknownCategory: "Unknown category",
    envelopeLabel: "Envelope",
    remove: "Remove",
    target: "Target",
    spent: "Spent",
    gap: "Gap",
    storedInSettings: "Stored in settings",
    storedLocally: "Stored locally",
    tableCategory: "Category",
    tableEnvelope: "Envelope",
    tableType: "Type",
    tableValue: "Value",
    tablePriority: "Priority",
    tableColor: "Color",
    tableIcon: "Icon",
    tableTarget: "Target",
  },
  ar: {
    unknownError: "وقع مشكل غير واضح",
    requiredName: "اسم الكاتيغوري ضروري.",
    selectCategory: "اختار كاتيغوري باش تزيد.",
    alreadyAdded: "راه تزادت",
    addDuplicate: "راه داخلة فالبلان.",
    savePlan: "حفظ البلان",
    saving: "كيتسجل...",
    saveSuccess: "تسجل البلان",
    storedSettings: "تسجل البلان فالإعدادات ديال الحساب.",
    storedLocal: "تسجل البلان فهاد الجهاز.",
    saveFailed: "فشل الحفظ",
    title: "البلان",
    subtitle: "بنّي بلان الميزانية بالأهداف والأولويات.",
    advancedConfig: "إعدادات متقدمة",
    advancedBudgetConfig: "إعدادات الميزانية المتقدمة",
    advancedDesc: "بدّل الأولويات والأهداف والإشارات البصرية لكل كاتيغوري.",
    equalDistribution: "توزيع متساوي",
    priorityDistribution: "توزيع حسب الأولوية",
    addToEdit: "زيد الكاتيغوريات للبلان باش تبدلهم من هنا.",
    close: "سد",
    loading: "كيتحمّل...",
    summary: "الملخص",
    currentPeriod: "الفترة الحالية",
    notSaved: "مازال ما تسجلش",
    projectedIncome: "الدخل المتوقع",
    totalTargets: "مجموع الأهداف",
    remainingAllocate: "الباقي للتوزيع",
    spentSoFar: "اللي تصرف دابا",
    targetWarning: "رد بالك: مجموع الأهداف فات الدخل المتوقع.",
    invalidValues: "صلّح القيم الغلط قبل ما تحفظ.",
    suggestions: "اقتراحات",
    suggestionsDesc: "زيد بسرعة الكاتيغوريات اللي ناقصين فالبلان.",
    available: "متوفر",
    allIncluded: "جميع الكاتيغوريات داخلين دابا فالبلان.",
    mappedTo: "مربوطة مع",
    envelopeFallback: "ظرف",
    unmapped: "ما مربوطةش",
    add: "زيد",
    manualAdd: "زيادة يدوية",
    manualDesc: "صاوب سطر جديد فالبلان بالنوع والقيمة والأولوية.",
    useExisting: "استعمل كاتيغوري موجودة",
    createCategory: "صاوب كاتيغوري جديدة",
    category: "الكاتيغوري",
    envelopeOptional: "الظرف (اختياري)",
    optional: "اختياري",
    none: "ما كاينش",
    newCategoryName: "اسم الكاتيغوري الجديدة",
    newCategoryPlaceholder: "مثال: الماكلة",
    targetType: "نوع الهدف",
    fixed: "ثابت",
    percentage: "نسبة",
    value: "القيمة",
    priority: "الأولوية",
    iconColor: "الأيقونة + اللون",
    categoriesInPlan: "كاتيغوريات فالبلان",
    overview: "نظرة على البلان",
    overviewDesc: "راجع الأهداف والتقدم والفارق المقترح.",
    startBuilding: "زيد كاتيغوريات باش تبدا البلان.",
    unknownCategory: "كاتيغوري مجهولة",
    envelopeLabel: "الظرف",
    remove: "حيد",
    target: "الهدف",
    spent: "المصروف",
    gap: "الفارق",
    storedInSettings: "متخزن فالإعدادات",
    storedLocally: "متخزن محلياً",
    tableCategory: "الكاتيغوري",
    tableEnvelope: "الظرف",
    tableType: "النوع",
    tableValue: "القيمة",
    tablePriority: "الأولوية",
    tableColor: "اللون",
    tableIcon: "الأيقونة",
    tableTarget: "الهدف",
  },
};

const toNumber = (value: string | number) => {
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getDefaultRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  return { start, end };
};

const createPlanItem = (
  categoryId: string,
  envelopeId?: string | null,
  overrides: Partial<BudgetPlanItem> = {}
): BudgetPlanItem => ({
  categoryId,
  envelopeId: envelopeId ?? null,
  targetType: "fixed",
  targetValue: 0,
  priority: DEFAULT_PRIORITY,
  color: "",
  icon: "",
  ...overrides,
});

export default function PlannerPage() {
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "planner-page-ar-body");
  const copy = PLANNER_COPY[locale];
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeOut[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [planItems, setPlanItems] = useState<BudgetPlanItem[]>([]);
  const [planSource, setPlanSource] = useState<"settings" | "local" | "none">(
    "none"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [manualMode, setManualMode] = useState<"existing" | "new">("existing");
  const [manualCategoryId, setManualCategoryId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualTargetType, setManualTargetType] =
    useState<BudgetTargetType>("fixed");
  const [manualTargetValue, setManualTargetValue] = useState("0");
  const [manualPriority, setManualPriority] = useState(
    String(DEFAULT_PRIORITY)
  );
  const [manualEnvelopeId, setManualEnvelopeId] = useState("");
  const [manualColor, setManualColor] = useState("");
  const [manualIcon, setManualIcon] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          categoryData,
          envelopeData,
          mappingData,
          transactionData,
          dashboardData,
          settingsData,
        ] = await Promise.all([
          apiFetch<CategoryOut[]>("/categories"),
          apiFetch<EnvelopeOut[]>("/envelopes"),
          apiFetch<CategoryEnvelopeMapOut[]>("/mappings").catch(() => []),
          apiFetch<TransactionOut[]>("/transactions"),
          fetchDashboard(),
          apiFetch<SettingsResponse>("/users/me/settings").catch(() => null),
        ]);

        const mappingMap = mappingData.reduce<Record<string, string>>(
          (acc, item) => ({
            ...acc,
            [item.category_id]: item.envelope_id,
          }),
          {}
        );

        const planPayload = await loadBudgetPlan(settingsData);

        if (!mounted) return;
        setCategories(categoryData);
        setEnvelopes(envelopeData);
        setMappings(mappingMap);
        setTransactions(transactionData);
        setDashboard(dashboardData);
        if (settingsData) setSettings(settingsData);
        if (planPayload.data) {
          setPlanItems(planPayload.data.items);
          setPlanSource(planPayload.source);
        } else {
          setPlanSource(planPayload.source);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : copy.unknownError;
        if (mounted) setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    setPlanItems((prev) =>
      prev.filter((item) => categories.some((cat) => cat.id === item.categoryId))
    );
  }, [categories]);

  const currency = settings?.currency ?? dashboard?.user.currency ?? "MAD";

  const range = dashboard?.current_period ?? getDefaultRange();

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const envelopeMap = useMemo(
    () => new Map(envelopes.map((envelope) => [envelope.id, envelope])),
    [envelopes]
  );

  const planCategorySet = useMemo(
    () => new Set(planItems.map((item) => item.categoryId)),
    [planItems]
  );

  const suggestions = useMemo(
    () => categories.filter((category) => !planCategorySet.has(category.id)),
    [categories, planCategorySet]
  );

  const filteredTransactions = useMemo(() => {
    const start = new Date(range.start);
    const end = new Date(range.end);
    return transactions.filter((tx) => {
      const occurred = new Date(tx.occurred_on);
      return occurred >= start && occurred <= end;
    });
  }, [transactions, range.end, range.start]);

  const projectedIncome = useMemo(
    () =>
      filteredTransactions
        .filter((tx) => tx.type === "income")
        .reduce((acc, tx) => acc + toNumber(tx.amount), 0),
    [filteredTransactions]
  );

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions
      .filter((tx) => tx.type === "expense")
      .forEach((tx) => {
        map.set(tx.category_id, (map.get(tx.category_id) ?? 0) + toNumber(tx.amount));
      });
    return map;
  }, [filteredTransactions]);

  const totalSpent = useMemo(
    () =>
      filteredTransactions
        .filter((tx) => tx.type === "expense")
        .reduce((acc, tx) => acc + toNumber(tx.amount), 0),
    [filteredTransactions]
  );

  const computedTargets = useMemo(() => {
    return planItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.categoryId] = computeTargetAmount(item, projectedIncome);
      return acc;
    }, {});
  }, [planItems, projectedIncome]);

  const totalTarget = useMemo(
    () => planItems.reduce((acc, item) => acc + computedTargets[item.categoryId], 0),
    [planItems, computedTargets]
  );

  const remainingIncome = projectedIncome - totalTarget;

  const hasInvalidValues = planItems.some((item) => {
    const invalidTarget =
      !Number.isFinite(item.targetValue) || toNumber(item.targetValue) < 0;
    const invalidPriority =
      !Number.isFinite(item.priority) ||
      item.priority < PRIORITY_MIN ||
      item.priority > PRIORITY_MAX;
    return invalidTarget || invalidPriority;
  });

  const sortedPlanItems = useMemo(() => {
    return [...planItems].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const nameA = categoryMap.get(a.categoryId)?.name ?? "";
      const nameB = categoryMap.get(b.categoryId)?.name ?? "";
      return nameA.localeCompare(nameB);
    });
  }, [planItems, categoryMap]);

  const updatePlanItem = useCallback(
    (categoryId: string, updates: Partial<BudgetPlanItem>) => {
      setPlanItems((prev) =>
        prev.map((item) =>
          item.categoryId === categoryId ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  const handleAddSuggestion = (categoryId: string) => {
    const envelopeId = mappings[categoryId];
    setPlanItems((prev) => [...prev, createPlanItem(categoryId, envelopeId)]);
  };

  const handleManualAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    let categoryId = manualCategoryId;
    let categoryName = "";

    if (manualMode === "new") {
      const trimmed = manualName.trim();
      if (!trimmed) {
        setError(copy.requiredName);
        return;
      }
      try {
        const created = await apiFetch<CategoryOut>("/categories", {
          method: "POST",
          body: { name: trimmed },
        });
        setCategories((prev) => [created, ...prev]);
        categoryId = created.id;
        categoryName = created.name;
      } catch (err) {
        const message = err instanceof Error ? err.message : copy.unknownError;
        setError(message);
        return;
      }
    } else if (!categoryId) {
      setError(copy.selectCategory);
      return;
    }

    if (!categoryName) {
      categoryName = categoryMap.get(categoryId)?.name ?? "";
    }

    if (planCategorySet.has(categoryId)) {
      toast({
        title: copy.alreadyAdded,
        description: `"${categoryName}" ${copy.addDuplicate}`,
      });
      return;
    }

    const nextItem = createPlanItem(categoryId, manualEnvelopeId || mappings[categoryId], {
      targetType: manualTargetType,
      targetValue: toNumber(manualTargetValue),
      priority: toNumber(manualPriority) || DEFAULT_PRIORITY,
      color: manualColor.trim(),
      icon: manualIcon.trim(),
    });

    setPlanItems((prev) => [...prev, nextItem]);
    setManualCategoryId("");
    setManualName("");
    setManualTargetValue("0");
    setManualPriority(String(DEFAULT_PRIORITY));
    setManualEnvelopeId("");
    setManualColor("");
    setManualIcon("");
  };

  const handleRemoveItem = (categoryId: string) => {
    setPlanItems((prev) => prev.filter((item) => item.categoryId !== categoryId));
  };

  const handleSavePlan = async () => {
    setSaving(true);
    const payload: BudgetPlanData = {
      items: planItems,
      updatedAt: new Date().toISOString(),
    };

    try {
      const result = await saveBudgetPlan(payload);
      setPlanSource(result.storedIn === "settings" ? "settings" : "local");
      toast({
        title: copy.saveSuccess,
        description:
          result.storedIn === "settings"
            ? copy.storedSettings
            : copy.storedLocal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      toast({ title: copy.saveFailed, description: message });
    } finally {
      setSaving(false);
    }
  };

  const applyEqualDistribution = () => {
    if (planItems.length === 0) return;
    const equalValue = Number((100 / planItems.length).toFixed(2));
    setPlanItems((prev) =>
      prev.map((item) => ({
        ...item,
        targetType: "percentage",
        targetValue: equalValue,
      }))
    );
  };

  const applyPriorityDistribution = () => {
    if (planItems.length === 0) return;
    const sorted = [...planItems].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const nameA = categoryMap.get(a.categoryId)?.name ?? "";
      const nameB = categoryMap.get(b.categoryId)?.name ?? "";
      return nameA.localeCompare(nameB);
    });
    const rankMap = new Map<string, number>();
    sorted.forEach((item, index) => {
      rankMap.set(item.categoryId, index);
    });

    const totalWeight = sorted.reduce((acc, item) => {
      const rank = rankMap.get(item.categoryId) ?? 0;
      const weight = PRIORITY_WEIGHTS[rank] ?? 2;
      return acc + weight;
    }, 0);

    setPlanItems((prev) =>
      prev.map((item) => {
        const rank = rankMap.get(item.categoryId) ?? 0;
        const weight = PRIORITY_WEIGHTS[rank] ?? 2;
        const value = Number(((weight / totalWeight) * 100).toFixed(2));
        return { ...item, targetType: "percentage", targetValue: value };
      })
    );
  };

  const tableColumns = useMemo(
    () => [
      {
        key: "category",
        header: copy.tableCategory,
        cell: (row: BudgetPlanItem) => (
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: row.color || "var(--accent)" }}
            />
            <span className="font-medium">
              {categoryMap.get(row.categoryId)
                ? localizeCategoryName(
                    categoryMap.get(row.categoryId)?.name ?? copy.unknownCategory,
                    locale
                  )
                : copy.unknownCategory}
            </span>
          </div>
        ),
      },
      {
        key: "envelope",
        header: copy.tableEnvelope,
        cell: (row: BudgetPlanItem) => (
          <Select
            value={row.envelopeId ?? NONE_ENVELOPE}
            onValueChange={(value) =>
              updatePlanItem(row.categoryId, {
                envelopeId: value === NONE_ENVELOPE ? null : value,
              })
            }
          >
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder={copy.optional} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_ENVELOPE}>{copy.none}</SelectItem>
              {envelopes.map((env) => (
                <SelectItem key={env.id} value={env.id}>
                  {localizeEnvelopeLabel(env.name, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        key: "type",
        header: copy.tableType,
        cell: (row: BudgetPlanItem) => (
          <Select
            value={row.targetType}
            onValueChange={(value) =>
              updatePlanItem(row.categoryId, {
                targetType: value as BudgetTargetType,
              })
            }
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">{copy.fixed}</SelectItem>
              <SelectItem value="percentage">{copy.percentage}</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
      {
        key: "value",
        header: copy.tableValue,
        cell: (row: BudgetPlanItem) => (
          <Input
            type="number"
            min={0}
            step="0.01"
            value={Number.isNaN(row.targetValue) ? "" : row.targetValue}
            onChange={(event) =>
              updatePlanItem(row.categoryId, {
                targetValue: toNumber(event.target.value),
              })
            }
            className="h-9 w-24"
          />
        ),
      },
      {
        key: "priority",
        header: copy.tablePriority,
        cell: (row: BudgetPlanItem) => (
          <Input
            type="number"
            min={PRIORITY_MIN}
            max={PRIORITY_MAX}
            value={Number.isNaN(row.priority) ? "" : row.priority}
            onChange={(event) =>
              updatePlanItem(row.categoryId, {
                priority: Math.round(toNumber(event.target.value)),
              })
            }
            className="h-9 w-20"
          />
        ),
      },
      {
        key: "color",
        header: copy.tableColor,
        cell: (row: BudgetPlanItem) => (
          <Input
            value={row.color ?? ""}
            onChange={(event) =>
              updatePlanItem(row.categoryId, { color: event.target.value })
            }
            placeholder="#F4C95D"
            className="h-9 w-28"
          />
        ),
      },
      {
        key: "icon",
        header: copy.tableIcon,
        cell: (row: BudgetPlanItem) => (
          <Input
            value={row.icon ?? ""}
            onChange={(event) =>
              updatePlanItem(row.categoryId, { icon: event.target.value })
            }
            placeholder="🍜"
            className="h-9 w-20"
          />
        ),
      },
      {
        key: "target",
        header: copy.tableTarget,
        cell: (row: BudgetPlanItem) => (
          <span className="text-sm text-[var(--muted)]">
            {formatMoney(computedTargets[row.categoryId] ?? 0, currency)}
          </span>
        ),
      },
    ],
    [categoryMap, computedTargets, copy.fixed, copy.none, copy.optional, copy.percentage, copy.tableCategory, copy.tableColor, copy.tableEnvelope, copy.tableIcon, copy.tablePriority, copy.tableTarget, copy.tableType, copy.tableValue, copy.unknownCategory, currency, envelopes, updatePlanItem]
  );

  return (
    <div className="flex flex-col gap-8" dir={dir}>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          <div className="flex flex-wrap gap-2">
            <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">{copy.advancedConfig}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>{copy.advancedBudgetConfig}</DialogTitle>
                  <DialogDescription>{copy.advancedDesc}</DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={applyEqualDistribution}>{copy.equalDistribution}</Button>
                  <Button variant="secondary" onClick={applyPriorityDistribution}>{copy.priorityDistribution}</Button>
                </div>
                <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <Table
                    columns={tableColumns}
                    data={sortedPlanItems}
                    getRowKey={(row) => row.categoryId}
                    emptyMessage={copy.addToEdit}
                  />
                </div>
                <DialogFooter className="mt-6">
                  <DialogClose asChild>
                    <Button variant="secondary">{copy.close}</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSavePlan} disabled={saving || hasInvalidValues}>
              {saving ? copy.saving : copy.savePlan}
            </Button>
          </div>
        }
      />

      {loading ? <p className="text-sm text-[var(--muted)]">{copy.loading}</p> : null}
      {error ? (
        <p className="rounded-2xl border border-[var(--error)]/20 bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]">
          {error}
        </p>
      ) : null}

      <Section
        title={copy.summary}
        subtitle={`${copy.currentPeriod}: ${range.start} → ${range.end}`}
        actions={
          <Badge tone="muted">
            {planSource === "settings"
              ? copy.storedInSettings
              : planSource === "local"
              ? copy.storedLocally
              : copy.notSaved}
          </Badge>
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              {copy.projectedIncome}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMoney(projectedIncome, currency)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              {copy.totalTargets}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMoney(totalTarget, currency)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              {copy.remainingAllocate}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMoney(remainingIncome, currency)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              {copy.spentSoFar}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMoney(totalSpent, currency)}
            </p>
          </Card>
        </div>
        {totalTarget > projectedIncome ? (
          <p className="mt-4 rounded-2xl border border-[var(--error)]/30 bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]">
            {copy.targetWarning}
          </p>
        ) : null}
        {hasInvalidValues ? (
          <p className="mt-3 text-sm text-[var(--error)]">
            {copy.invalidValues}
          </p>
        ) : null}
      </Section>

      <Section
        title={copy.suggestions}
        subtitle={copy.suggestionsDesc}
        actions={
          suggestions.length > 0 ? (
            <Badge tone="muted">{suggestions.length} {copy.available}</Badge>
          ) : null
        }
      >
        {suggestions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{copy.allIncluded}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {suggestions.slice(0, 6).map((category) => (
              <Card key={category.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {localizeCategoryName(category.name, locale)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {mappings[category.id]
                      ? `${copy.mappedTo} ${
                          localizeEnvelopeLabel(
                            envelopeMap.get(mappings[category.id])?.name ?? copy.envelopeFallback,
                            locale
                          )
                        }`
                      : copy.unmapped}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddSuggestion(category.id)}
                >
                  {copy.add}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section
        title={copy.manualAdd}
        subtitle={copy.manualDesc}
      >
        <form onSubmit={handleManualAdd} className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={manualMode === "existing" ? "primary" : "secondary"}
              onClick={() => setManualMode("existing")}
            >
              {copy.useExisting}
            </Button>
            <Button
              type="button"
              variant={manualMode === "new" ? "primary" : "secondary"}
              onClick={() => setManualMode("new")}
            >
              {copy.createCategory}
            </Button>
          </div>

          {manualMode === "existing" ? (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>{copy.category}</Label>
                <Select
                  value={manualCategoryId}
                  onValueChange={setManualCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={copy.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {localizeCategoryName(category.name, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{copy.envelopeOptional}</Label>
                <Select
                  value={manualEnvelopeId || NONE_ENVELOPE}
                  onValueChange={(value) =>
                    setManualEnvelopeId(value === NONE_ENVELOPE ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={copy.optional} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_ENVELOPE}>{copy.none}</SelectItem>
                    {envelopes.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {localizeEnvelopeLabel(env.name, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>{copy.newCategoryName}</Label>
                <Input
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                  placeholder={copy.newCategoryPlaceholder}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{copy.envelopeOptional}</Label>
                <Select
                  value={manualEnvelopeId || NONE_ENVELOPE}
                  onValueChange={(value) =>
                    setManualEnvelopeId(value === NONE_ENVELOPE ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={copy.optional} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_ENVELOPE}>{copy.none}</SelectItem>
                    {envelopes.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {localizeEnvelopeLabel(env.name, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label>{copy.targetType}</Label>
              <Select
                value={manualTargetType}
                onValueChange={(value) =>
                  setManualTargetType(value as BudgetTargetType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{copy.fixed}</SelectItem>
                  <SelectItem value="percentage">{copy.percentage}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{copy.value} ({manualTargetType === "fixed" ? currency : "%"})</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={manualTargetValue}
                onChange={(event) => setManualTargetValue(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{copy.priority} (1-10)</Label>
              <Input
                type="number"
                min={PRIORITY_MIN}
                max={PRIORITY_MAX}
                value={manualPriority}
                onChange={(event) => setManualPriority(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{copy.iconColor}</Label>
              <div className="flex gap-2">
                <Input
                  value={manualIcon}
                  onChange={(event) => setManualIcon(event.target.value)}
                  placeholder="🍕"
                />
                <Input
                  value={manualColor}
                  onChange={(event) => setManualColor(event.target.value)}
                  placeholder="#F4C95D"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary">
              {copy.add}
            </Button>
            <Badge tone="muted">
              {planItems.length} {copy.categoriesInPlan}
            </Badge>
          </div>
        </form>
      </Section>

      <Section
        title={copy.overview}
        subtitle={copy.overviewDesc}
      >
        {planItems.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{copy.startBuilding}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedPlanItems.map((item) => {
              const category = categoryMap.get(item.categoryId);
              const envelopeName = item.envelopeId
                ? envelopeMap.get(item.envelopeId)?.name
                : mappings[item.categoryId]
                ? envelopeMap.get(mappings[item.categoryId])?.name
                : null;
              const spent = spentByCategory.get(item.categoryId) ?? 0;
              const target = computedTargets[item.categoryId] ?? 0;
              const progress = target > 0 ? spent / target : 0;
              const gap = Math.max(0, target - spent);
              const overTarget = target > 0 && spent > target;
              return (
                <Card
                  key={item.categoryId}
                  className={
                    overTarget
                      ? "border-[var(--error)]/40 bg-[var(--error-soft)]"
                      : undefined
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {item.icon ? (
                          <span className="text-lg">{item.icon}</span>
                        ) : null}
                        <p className="text-lg font-semibold">
                          {category
                            ? localizeCategoryName(category.name, locale)
                            : copy.unknownCategory}
                        </p>
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.color || "var(--accent)" }}
                        />
                      </div>
                      <p className="text-xs text-[var(--muted)]">
                        {envelopeName
                          ? `${copy.envelopeLabel}: ${localizeEnvelopeLabel(envelopeName, locale)}`
                          : copy.unmapped}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone="muted">
                        {item.targetType === "fixed" ? copy.fixed : "%"} · {copy.priority}{" "}
                        {item.priority}
                      </Badge>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRemoveItem(item.categoryId)}
                      >
                        {copy.remove}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">{copy.target}</span>
                      <span className="font-medium">
                        {formatMoney(target, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">{copy.spent}</span>
                      <span className={overTarget ? "text-[var(--error)]" : ""}>
                        {formatMoney(spent, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">{copy.gap}</span>
                      <span>{formatMoney(gap, currency)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.min(progress * 100, 100)}%`,
                          backgroundColor: overTarget
                            ? "var(--error)"
                            : "var(--accent-strong)",
                        }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
