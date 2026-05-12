import { apiFetch } from "@/lib/api";
import type { SettingsResponse } from "@/lib/types";

export type BudgetTargetType = "fixed" | "percentage";

export type BudgetPlanItem = {
  categoryId: string;
  envelopeId?: string | null;
  targetType: BudgetTargetType;
  targetValue: number;
  priority: number;
  color?: string;
  icon?: string;
};

export type BudgetPlanData = {
  items: BudgetPlanItem[];
  updatedAt: string;
};

type SettingsWithBudget = SettingsResponse & {
  budgetPlan?: BudgetPlanData;
  budget_plan?: BudgetPlanData;
};

const SETTINGS_KEY = "budgetPlan";
const LEGACY_SETTINGS_KEY = "budget_plan";
const STORAGE_KEY = "floussy_budget_plan";

const toNumber = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const computeTargetAmount = (
  item: BudgetPlanItem,
  projectedIncome: number
) => {
  if (item.targetType === "percentage") {
    return (projectedIncome * toNumber(item.targetValue)) / 100;
  }
  return toNumber(item.targetValue);
};

export const loadBudgetPlan = async (
  providedSettings?: SettingsWithBudget | null
) => {
  if (typeof window === "undefined") {
    return { source: "none" as const, data: null };
  }

  const settings =
    providedSettings === undefined
      ? await apiFetch<SettingsWithBudget>("/users/me/settings").catch(() => null)
      : providedSettings;

  if (settings) {
    const candidate = settings[SETTINGS_KEY] ?? settings[LEGACY_SETTINGS_KEY];
    if (candidate && Array.isArray(candidate.items)) {
      return { source: "settings" as const, data: candidate };
    }
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { source: "local" as const, data: null };
  }

  try {
    const parsed = JSON.parse(raw) as BudgetPlanData;
    if (parsed && Array.isArray(parsed.items)) {
      return { source: "local" as const, data: parsed };
    }
  } catch {
    // Ignore malformed local data.
  }

  return { source: "local" as const, data: null };
};

export const saveBudgetPlan = async (data: BudgetPlanData) => {
  if (typeof window === "undefined") {
    return { storedIn: "none" as const };
  }

  try {
    await apiFetch<SettingsWithBudget>("/users/me/settings", {
      method: "PATCH",
      body: { [SETTINGS_KEY]: data },
    });
    return { storedIn: "settings" as const };
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { storedIn: "local" as const };
  }
};
