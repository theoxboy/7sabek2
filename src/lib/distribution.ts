import { apiFetch } from "@/lib/api";

export type RuleMode = "fixed" | "percent";

export type DistributionRule = {
  id: string;
  target_type: "envelope" | "goal";
  target_id: string;
  mode: "fixed" | "percent" | "fixed_per_period" | "percent_of_income";
  amount?: string | null;
  percent?: string | null;
  rank: number;
  enabled: boolean;
  auto_apply_on_income: boolean;
  created_at: string;
};

export type DistributionRow = {
  id: string;
  targetType: "envelope" | "goal";
  targetId: string;
  name: string;
  mode: "none" | "fixed" | "percent";
  enabled: boolean;
  fixedAmount?: string;
  percent?: string;
  rank: number;
};

export type DistributionSettings = {
  auto_distribution_enabled: boolean;
  auto_sweep_enabled: boolean;
};

export type ApplyDistributionPayload = {
  income_amount?: string;
  use_cash_available?: boolean;
};

export type DistributionSavedRow = {
  target_type: "envelope" | "goal";
  target_id: string;
  mode: "none" | "fixed" | "percent";
  enabled: boolean;
  fixed_amount?: string | null;
  percent?: string | null;
  rank: number;
  name?: string | null;
};

export type DistributionSavedConfig = {
  id: string;
  name: string;
  auto_enabled: boolean;
  percent_mode: "equal" | "ranked";
  rows: DistributionSavedRow[];
  scope_hash?: string | null;
  signature: string;
  source: "onboarding_initial" | "post_onboarding_adjustment";
  version: number;
  effective_from_period_start?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DistributionRebalancePreview = {
  debt_amount: string;
  goals_amount: string;
  morona_amount: string;
  delta_vs_active: {
    debt: string;
    goals: string;
    morona: string;
  };
};

export type DistributionOnboardingStatus = {
  setup_status:
    | "not_started"
    | "draft_opened"
    | "saved_valid"
    | "applied"
    | "invalidated"
    | "legacy_rules_detected";
  eligible_total: number;
  eligible_envelope_names: string[];
  covered_total: number;
  unresolved_total: number;
  unresolved_envelope_names: string[];
  missing_envelope_names: string[];
  scoped_target_ids?: string[];
  scoped_target_keys?: string[];
  scoped_target_names?: string[];
  ignored_non_target_names?: string[];
  missing_current_target_names?: string[];
  unresolved_current_target_names?: string[];
  source: "active_config" | "legacy_rules" | "none";
  active_config?: DistributionSavedConfig | null;
  message: string;
};

export async function getRules(): Promise<DistributionRule[]> {
  return apiFetch<DistributionRule[]>("/distribution/rules");
}

export async function getSettings(): Promise<DistributionSettings> {
  return apiFetch<DistributionSettings>("/users/me/settings");
}

export async function patchSettings(
  payload: Partial<DistributionSettings>
): Promise<DistributionSettings> {
  return apiFetch<DistributionSettings>("/users/me/settings", {
    method: "PATCH",
    body: payload,
  });
}

export async function applyDistribution(
  payload: ApplyDistributionPayload
): Promise<void> {
  await apiFetch("/distribution/apply", {
    method: "POST",
    body: payload,
  });
}

export async function listSavedDistributionConfigs(): Promise<DistributionSavedConfig[]> {
  return apiFetch<DistributionSavedConfig[]>("/distribution/configs");
}

export async function saveDistributionConfig(payload: {
  id?: string;
  name: string;
  auto_enabled: boolean;
  percent_mode: "equal" | "ranked";
  rows: DistributionSavedRow[];
  scope_hash?: string;
}): Promise<DistributionSavedConfig> {
  const request = () =>
    apiFetch<DistributionSavedConfig>("/distribution/configs", {
      method: "POST",
      body: payload,
    });
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      const normalized = message.toLowerCase();
      const isRetryableConflict =
        normalized.includes("conflict") ||
        message.includes("تعذّر حفظ إعداد التوزيع");
      if (!isRetryableConflict || attempt >= 2) {
        throw error;
      }
      const backoffMs = 160 + attempt * 220;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unable to save distribution config");
}

export async function activateDistributionConfig(configId: string): Promise<DistributionSavedConfig> {
  return apiFetch<DistributionSavedConfig>("/distribution/configs/active", {
    method: "PUT",
    body: { config_id: configId },
  });
}

export async function deleteDistributionConfig(configId: string): Promise<void> {
  await apiFetch(`/distribution/configs/${configId}`, {
    method: "DELETE",
  });
}

export async function previewDistributionRebalance(
  configId: string,
  payload: { cut1_pct: number; cut2_pct: number }
): Promise<DistributionRebalancePreview> {
  return apiFetch<DistributionRebalancePreview>(
    `/distribution/configs/${configId}/preview-rebalance`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export async function applyDistributionNextCycle(
  configId: string,
  payload: { cut1_pct: number; cut2_pct: number; effective_from_period_start: string }
): Promise<DistributionSavedConfig> {
  return apiFetch<DistributionSavedConfig>(
    `/distribution/configs/${configId}/apply-next-cycle`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export async function revertDistributionOnboardingBaseline(
  configId: string,
  payload: { effective_from_period_start: string }
): Promise<DistributionSavedConfig> {
  return apiFetch<DistributionSavedConfig>(
    `/distribution/configs/${configId}/revert-onboarding-baseline`,
    {
      method: "POST",
      body: payload,
    }
  );
}

export async function getDistributionOnboardingStatus(payload: {
  eligible_envelope_names: string[];
  eligible_envelope_ids?: string[];
  eligible_envelope_keys?: string[];
  scope_hash?: string;
}): Promise<DistributionOnboardingStatus> {
  return apiFetch<DistributionOnboardingStatus>("/distribution/onboarding-status", {
    method: "POST",
    body: payload,
  });
}

const normalizeRuleMode = (mode: DistributionRule["mode"]): RuleMode => {
  if (mode === "fixed" || mode === "fixed_per_period") return "fixed";
  return "percent";
};

export function buildRowsFromRules(
  rows: DistributionRow[],
  rules: DistributionRule[]
): DistributionRow[] {
  const ruleMap = new Map(
    rules.map((rule) => [`${rule.target_type}:${rule.target_id}`, rule])
  );
  return rows.map((row) => {
    const rule = ruleMap.get(`${row.targetType}:${row.targetId}`);
    if (!rule) return row;
    const mode = normalizeRuleMode(rule.mode);
    return {
      ...row,
      mode,
      enabled: rule.enabled,
      fixedAmount: rule.amount ?? "",
      percent: rule.percent ?? "",
      rank: rule.rank ?? row.rank,
    };
  });
}

export async function upsertRules(draftRows: DistributionRow[]): Promise<void> {
  const existing = await getRules();
  const existingMap = new Map(
    existing.map((rule) => [`${rule.target_type}:${rule.target_id}`, rule])
  );

  for (const row of draftRows) {
    const key = `${row.targetType}:${row.targetId}`;
    const match = existingMap.get(key);
    const mode = row.mode;

    if (mode === "none") {
      if (match) {
        await apiFetch(`/distribution/rules/${match.id}`, { method: "DELETE" });
      }
      continue;
    }

    const payload = {
      target_type: row.targetType,
      target_id: row.targetId,
      mode: mode === "fixed" ? "fixed" : "percent",
      amount: mode === "fixed" ? row.fixedAmount ?? "0" : null,
      percent: mode === "percent" ? row.percent ?? "0" : null,
      rank: row.rank ?? 1,
      enabled: row.enabled,
      auto_apply_on_income: match?.auto_apply_on_income ?? true,
    };

    if (match) {
      await apiFetch(`/distribution/rules/${match.id}`, {
        method: "PATCH",
        body: payload,
      });
    } else {
      await apiFetch("/distribution/rules", {
        method: "POST",
        body: payload,
      });
    }
  }
}
