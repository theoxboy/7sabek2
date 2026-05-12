export type ISODateTime = string;
export type UUID = string;

export type RiskLevel = "low" | "medium" | "high";
export type ProposalType =
  | "safe"
  | "balanced"
  | "debt_first"
  | "goal_first"
  | "stability_first"
  | "catch_up";
export type MainPriority = "stability" | "debt" | "goals" | "recovery";
export type AdvisorMode = "normal" | "degraded" | "blocked";
export type PrimaryAxis = "stability" | "debt_speed" | "goal_progress" | "cash_safety";

export type AllocationBucketsV1 = {
  essentials: number;
  debt_minimums: number;
  debt_extra: number;
  reserve: number;
  sinking_funds: number;
  goals: number;
  flexible: number;
  total_allocated: number;
  unallocated_buffer: number;
};

export type AllocationBreakdownV1 = {
  period_basis: {
    cycle_days: number;
    monthly_reference_amount: number;
    cycle_reference_amount: number;
  };
  monthly: AllocationBucketsV1;
  cycle: AllocationBucketsV1;
  integrity_checks: {
    no_negative_allocations: boolean;
    allocation_sum_valid: boolean;
    minimum_obligations_covered: boolean;
    month_cycle_consistent: boolean;
  };
};

export type ProposalV1 = {
  proposal_id: string;
  proposal_type: ProposalType;
  rank: number;
  is_recommended: boolean;
  title_key?: string | null;
  subtitle_key?: string | null;
  fit_profile_tags: string[];
  allocation: AllocationBreakdownV1;
  impact_summary: {
    monthly_remaining_after_plan: number;
    cycle_remaining_after_plan: number;
    debt_coverage_ratio: number;
    reserve_progress_ratio: number;
    goals_funding_ratio: number;
    sinking_coverage_ratio: number;
  };
  tradeoffs: {
    pros_tags: string[];
    cons_tags: string[];
    tradeoff_tags: string[];
  };
  proposal_warnings: string[];
  risk_signals: {
    risk_level: RiskLevel;
    risk_tags: string[];
  };
  deltas_vs_recommended?: {
    monthly_debt_extra_delta: number;
    monthly_goals_delta: number;
    monthly_reserve_delta: number;
    monthly_flexible_delta: number;
    monthly_sinking_delta: number;
  } | null;
  recommendation_layer: {
    main_priority: MainPriority;
    reason_tags: string[];
    tradeoff_tags: string[];
    recommended_for_tags: string[];
    risk_tags: string[];
  };
  review_details: {
    what_is_protected: string[];
    what_is_limited: string[];
    what_may_be_delayed: string[];
    assumptions_used: string[];
  };
};

export type ApplyPreviewSummaryV1 = {
  proposal_id?: string | null;
  envelopes_impact: {
    create_count: number;
    update_count: number;
    freeze_count: number;
  };
  goals_impact: {
    active_count: number;
    slowed_count: number;
    paused_count: number;
  };
  rules_impact: {
    create_count: number;
    update_count: number;
    disable_count: number;
  };
  reserve_impact: {
    monthly_contribution: number;
    cycle_contribution: number;
    starter_gap_after_apply: number;
  };
  debt_strategy_impact: {
    minimums_covered: boolean;
    focus_enabled: boolean;
    target_debt_id?: string | null;
    monthly_extra_amount: number;
  };
  safety: {
    requires_user_confirmation: true;
    apply_allowed_if_confirmed: boolean;
  };
};

export type AdvisorPreviewResponseV1 = {
  preview_id: UUID;
  engine_version: string;
  generated_at: ISODateTime;
  mode: AdvisorMode;
  degraded_mode: boolean;
  can_recommend_confidently: boolean;
  recommended_proposal_id?: string | null;
  recommendation_reason_tags: string[];
  warnings: string[];
  blocking_issues: string[];
  missing_required_fields: string[];
  data_quality_summary: {
    completeness_score: number;
    reliability_score: number;
  };
  proposal_count: number;
  proposals: ProposalV1[];
  comparison_summary: {
    primary_axis: PrimaryAxis;
    best_for_stability?: string | null;
    best_for_debt_speed?: string | null;
    best_for_goal_progress?: string | null;
    best_for_cash_safety?: string | null;
  };
  apply_preview_summary: ApplyPreviewSummaryV1;
};
