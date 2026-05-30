export type UserOut = {
  id: string;
  email: string;
  role?: string;
  status?: string;
  must_reset_password?: boolean;
  is_beta_tester?: boolean;
  force_onboarding_v2_review?: boolean;
  force_tour_replay_version?: number;
  has_completed_onboarding_v2?: boolean;
  currency: string;
  sweep_interval_days: number;
  next_sweep_date?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  leaderboard_name?: string | null;
  phone_number?: string | null;
  birth_date?: string | null;
  country?: string | null;
  city?: string | null;
  profile_photo_url?: string | null;
  deleted_at?: string | null;
  suspended_until?: string | null;
  password_reset_requests_total?: number;
  password_reset_last_requested_at?: string | null;
  password_reset_blocked?: boolean;
  password_reset_block_mode?: "none" | "temporary" | "permanent" | string;
  password_reset_blocked_until?: string | null;
  password_reset_block_reason?: string | null;
  password_reset_blocked_at?: string | null;
};

export type PasswordResetBlockOut = {
  status: "ok";
  user_id: string;
  blocked: boolean;
  mode: "none" | "temporary" | "permanent" | string;
  blocked_until?: string | null;
  reason?: string | null;
  blocked_at?: string | null;
};

export type OnboardingV2RecordOut = {
  id: string;
  user_id: string;
  flow_version: string;
  stage: string;
  income_type?: string | null;
  primary_objective?: string | null;
  household_type?: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OnboardingV2AdminRecordOut = OnboardingV2RecordOut & {
  user_email?: string | null;
  user_first_name?: string | null;
  user_last_name?: string | null;
};

export type OnboardingV2AdminRecordListOut = {
  items: OnboardingV2AdminRecordOut[];
};

export type ShiftPilotStateOut = {
  id: string;
  user_id: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UserSessionHistoryOut = {
  id: string;
  status: "active" | "revoked" | "ended";
  source_ip?: string | null;
  user_agent?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_accuracy_m?: number | null;
  geo_label?: string | null;
  ip_blocked?: boolean;
  created_at: string;
  last_seen_at: string;
  ended_at?: string | null;
  revoked_at?: string | null;
};

export type UserSessionHistoryListOut = {
  user_id: string;
  user_email: string;
  sessions: UserSessionHistoryOut[];
};

export type UserSessionActionOut = {
  status: "ok";
  action: "end" | "revoke";
  user_id: string;
  session: UserSessionHistoryOut;
  should_logout: boolean;
};

export type UserSessionBlockIPOut = {
  status: "ok";
  blocked_ip: string;
  already_blocked: boolean;
  affected_active_sessions: number;
  user_id: string;
  session: UserSessionHistoryOut;
  should_logout: boolean;
};

export type BlockedIPOut = {
  id: string;
  ip_address: string;
  reason?: string | null;
  created_at: string;
  blocked_by_user_id?: string | null;
  blocked_by_email?: string | null;
  source_session_id?: string | null;
  source_user_id?: string | null;
  source_user_email?: string | null;
};

export type BlockedIPListOut = {
  items: BlockedIPOut[];
};

export type UnblockIPOut = {
  status: "ok";
  id: string;
  ip_address: string;
};

export type AdminSummaryOut = {
  users: number;
  categories: number;
  envelopes: number;
  transactions: number;
};

export type TopClientOut = {
  user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  income_total: number;
};

export type EnvelopeOut = {
  id: string;
  name: string;
  rollover_enabled: boolean;
  is_default_savings: boolean;
  deletable: boolean;
  is_cash?: boolean;
  is_goal?: boolean;
  created_at?: string;
};

export type CategoryOut = {
  id: string;
  name: string;
  created_at?: string;
};

export type CategoryEnvelopeMapOut = {
  id?: string;
  category_id: string;
  envelope_id: string;
};

export type EnvelopeMovementOut = {
  id: string;
  envelope_period_id: string;
  amount: string;
  created_at?: string;
};

export type TransactionOut = {
  id: string;
  type: "income" | "expense";
  category_id: string;
  amount: string;
  occurred_on: string;
  description?: string | null;
  source?: "manual" | "assistant";
  envelope_movement?: EnvelopeMovementOut | null;
  created_at?: string;
};

export type PeriodBalanceOut = {
  opening_balance: string;
  total_allocations: string;
  total_spent: string;
  closing_balance: string;
  total_movements?: string;
  sweeps_in?: string;
  sweeps_out?: string;
};

export type EnvelopePeriodOut = {
  id: string;
  period_start: string;
  period_end: string;
  opening_balance: string;
  total_allocations: string;
  total_spent: string;
  closing_balance: string;
  swept_at?: string | null;
};

export type EnvelopeTransferLogOut = {
  id: string;
  to_envelope_id: string;
  from_envelope_id: string | null;
  from_envelope_name: string;
  amount: string;
  period_start: string;
  period_end: string;
  created_at: string;
};

export type EnvelopeAdjustmentLogOut = {
  id: string;
  envelope_id: string;
  period_start: string;
  period_end: string;
  previous_balance: string;
  new_balance: string;
  delta: string;
  created_at: string;
};

export type GoalOut = {
  id: string;
  envelope_id: string;
  name: string;
  goal_type: "goal" | "sinking_fund";
  target_amount: string;
  target_date: string | null;
  contribution_amount: string;
  auto_contribute: boolean;
  priority: number;
  current_balance: string;
  created_at: string;
  updated_at: string | null;
};

export type EnvelopeBalanceOut = {
  envelope: EnvelopeOut;
  period_id: string | null;
  balance: PeriodBalanceOut;
};

export type SpendingByCategoryOut = {
  category_id: string;
  category_name: string;
  total: string;
};

export type SpendingByEnvelopeOut = {
  envelope_id: string;
  envelope_name: string;
  total: string;
};

export type TrafficDailyOut = {
  date: string;
  count: number;
};

export type TrafficSummaryOut = {
  total: number;
  previous_total: number;
  daily: TrafficDailyOut[];
  sources: Record<string, number>;
};

export type FinanceDailyOut = {
  date: string;
  income: number;
  expense: number;
};

export type UserGrowthPoint = {
  date: string;
  count: number;
};

export type WeeklyActivePoint = {
  week: string;
  count: number;
};

export type MonthlyFinancePoint = {
  month: string;
  income: number;
  expense: number;
};

export type TransactionDailyPoint = {
  date: string;
  income_count: number;
  expense_count: number;
  total_count: number;
};

export type TopItemOut = {
  name: string;
  total: number;
};

export type ChurnBucketOut = {
  label: string;
  count: number;
};

export type OnboardingActivationOut = {
  total_users: number;
  envelopes: number;
  categories: number;
  transactions: number;
};

export type RolloverUsageOut = {
  on: number;
  off: number;
};

export type PlatformHealthOut = {
  total_users: number;
  users_with_transactions: number;
  active_users_7d: number;
  transactions_7d: number;
  mapped_expense_count_30d: number;
  unmapped_expense_count_30d: number;
  expense_mapping_rate_30d: number;
};

export type PlatformAnalyticsOut = {
  user_growth: UserGrowthPoint[];
  weekly_active: WeeklyActivePoint[];
  monthly_finance: MonthlyFinancePoint[];
  transactions_daily: TransactionDailyPoint[];
  top_categories: TopItemOut[];
  top_envelopes: TopItemOut[];
  churn: ChurnBucketOut[];
  onboarding: OnboardingActivationOut;
  rollover: RolloverUsageOut;
  avg_days_to_first_tx: number;
  health: PlatformHealthOut;
};

export type SweepStatusOut = {
  due: boolean;
  period_start: string;
  period_end: string;
  income_declared: boolean;
  already_swept: boolean;
};

export type SweepBootstrapOut = {
  needs_first_income_declaration: boolean;
  last_income_date?: string | null;
  last_income_amount?: string | null;
  expected_income_amount?: string | null;
  cadence?: string | null;
  interval_days?: number | null;
};

export type DashboardOut = {
  user: UserOut;
  current_period: {
    start: string;
    end: string;
  };
  sweep_status?: SweepStatusOut | null;
  sweep_bootstrap?: SweepBootstrapOut | null;
  net_worth: string;
  cash_balance: string;
  available_to_allocate: string;
  period_income: string;
  period_expenses_mapped: string;
  period_net: string;
  envelopes: EnvelopeBalanceOut[];
  recent_transactions: TransactionOut[];
  spending_by_category: SpendingByCategoryOut[];
  spending_by_envelope: SpendingByEnvelopeOut[];
};

export type DashboardAlertOut = {
  unmapped_categories: number;
  overspent_envelopes: string[];
  sweep_due: boolean;
  current_period?: {
    start: string;
    end: string;
  } | null;
  sweep_status?: SweepStatusOut | null;
};

export type DashboardTrendPointOut = {
  period_start: string;
  period_end: string;
  net_worth: string;
};

export type CashBalanceBreakdownOut = {
  period_id: string | null;
  opening_balance: string;
  total_allocations: string;
  total_movements: string;
  sweeps_out: string;
  sweeps_in: string;
  closing_balance: string;
};

export type DashboardDiagnosticsOut = {
  current_period: {
    start: string;
    end: string;
  };
  cash_balance: string;
  cash_negative: boolean;
  cash_breakdown: CashBalanceBreakdownOut;
};

export type SettingsResponse = {
  currency: string;
  sweep_interval_days: number;
  auto_distribution_enabled: boolean;
  auto_sweep_enabled: boolean;
  next_sweep_date?: string | null;
};

export type AnnouncementItem = {
  id: string;
  label: string;
  enabled: boolean;
  message: string;
  type: string;
  placements: string[];
  start_at?: string | null;
  end_at?: string | null;
  timezone: string;
  recurrence: string;
  roles: string[];
  statuses: string[];
  countries: string[];
};

export type PlatformAnnouncementOut = AnnouncementItem & {
  active: boolean;
};

export type AIGatewayOut = {
  id: string;
  name: string;
  provider: string;
  protocol: string;
  base_url: string;
  api_key: string;
  auth_header: string;
  auth_scheme: string;
  model: string;
  enabled: boolean;
  paths: Record<string, string>;
  extra_headers: Record<string, string>;
  notes: string;
};

export type AIRoutingOut = {
  default_gateway_id: string;
  default_model: string;
  fallback_gateway_ids: string[];
  request_timeout_ms: number;
};

export type PlatformStatusOut = {
  platform_name: string;
  support_email: string;
  guided_tours_enabled: boolean;
  advisor_tab_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  announcement_enabled: boolean;
  announcement_message: string;
  announcement_type: string;
  announcement_active: boolean;
  maintenance_placements: string[];
  announcement_placements: string[];
  announcement_start_at?: string | null;
  announcement_end_at?: string | null;
  announcement_timezone: string;
  announcement_recurrence: string;
  announcement_roles: string[];
  announcement_statuses: string[];
  announcement_countries: string[];
  announcements: PlatformAnnouncementOut[];
  ai_gateways?: AIGatewayOut[];
  ai_routing?: AIRoutingOut;
  account_deletion_grace_days: number;
  features?: {
    passkeys?: boolean;
    [key: string]: boolean | undefined;
  };
};

export type PlatformSettingsOut = {
  platform_name: string;
  support_email: string;
  registration_enabled: boolean;
  advisor_tab_enabled: boolean;
  guided_tours_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  announcement_enabled: boolean;
  announcement_message: string;
  announcement_type: string;
  maintenance_placements: string[];
  announcement_placements: string[];
  announcement_start_at?: string | null;
  announcement_end_at?: string | null;
  announcement_timezone: string;
  announcement_recurrence: string;
  announcement_roles: string[];
  announcement_statuses: string[];
  announcement_countries: string[];
  announcements: AnnouncementItem[];
  ai_gateways: AIGatewayOut[];
  ai_routing: AIRoutingOut;
  rate_limit_login_max: number;
  rate_limit_login_window_minutes: number;
  rate_limit_register_max: number;
  rate_limit_register_window_minutes: number;
  rate_limit_api_max: number;
  rate_limit_api_window_minutes: number;
  default_currency: string;
  default_sweep_interval_days: number;
  password_min_length: number;
  default_auto_distribution_enabled: boolean;
  account_deletion_grace_days: number;
};

export type DistributionConfigItemIn = {
  target_id: string;
  mode: "none" | "fixed" | "percent";
  fixed_amount?: string | null;
  fixed_priority?: number | null;
  percent?: string | null;
  enabled: boolean;
};

export type DistributionConfigItemOut = DistributionConfigItemIn & {
  name: string;
};

export type DistributionConfigOut = {
  auto_enabled: boolean;
  envelopes: DistributionConfigItemOut[];
  goals: DistributionConfigItemOut[];
};

export type DistributionConfigIn = {
  auto_enabled: boolean;
  envelopes: DistributionConfigItemIn[];
  goals: DistributionConfigItemIn[];
};

export type DistributionSimulateItemOut = {
  target_type: "goal" | "envelope";
  target_id: string;
  name: string;
  mode: "fixed" | "percent";
  amount: string;
  fixed_priority?: number | null;
};

export type DistributionSimulateOut = {
  period_start: string;
  period_end: string;
  cash_before: string;
  cash_after: string;
  remaining_after_fixed: string;
  remaining_after_percent: string;
  items: DistributionSimulateItemOut[];
  warnings: string[];
};

export type AdminActivityLogOut = {
  id: number;
  created_at: string;
  actor_email?: string | null;
  actor_ip?: string | null;
  event_type: string;
  status: string;
  message: string;
};

export type BackupRecordOut = {
  id: number;
  created_at: string;
  completed_at?: string | null;
  kind: string;
  status: string;
  mode?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  duration_ms?: number | null;
  actor_email?: string | null;
  actor_ip?: string | null;
  message?: string | null;
};

export type BackupStatusOut = {
  last_scheduled?: BackupRecordOut | null;
  last_snapshot?: BackupRecordOut | null;
  retention_count: number;
  schedule_days: number;
};

export type DistributionApplyOut = {
  run_id: string;
  cash_before: string;
  cash_after: string;
  total_distributed: string;
  warnings: string[];
};

export type IncomeReminderOut = {
  id: string;
  name: string;
  frequency: "monthly" | "bi_monthly" | "bi_weekly" | "weekly" | "one_off";
  day_of_month?: number | null;
  day_of_month_alt?: number | null;
  day_of_week?: number | null;
  due_date?: string | null;
  timezone: string;
  next_due_on?: string | null;
  last_declared_on?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
};


export type SweepOut = {
  id: string;
  amount: string;
  swept_on: string;
  created_at: string;
  from_envelope_id: string;
  from_envelope_name?: string | null;
  to_envelope_id: string;
  to_envelope_name?: string | null;
};

export type SweepPreviewItem = {
  from_envelope_id: string;
  from_envelope_name: string;
  to_envelope_id: string;
  to_envelope_name: string;
  amount: string;
};

export type ReportRange = {
  start: string;
  end: string;
};

export type ReportSummaryOut = {
  range: ReportRange;
  income: string;
  expense: string;
  net: string;
  transactions_count: number;
  top_label?: string | null;
};

export type ReportIncomeExpenseOut = {
  income: string;
  expense: string;
  net: string;
};

export type ReportSpendingByEnvelopeOut = {
  envelope_id: string;
  envelope_name: string;
  total: string;
};

export type ReportSpendingByCategoryOut = {
  category_id: string;
  category_name: string;
  total: string;
};

export type ReportTopLabelOut = {
  label: string;
  total: string;
};

export type GamificationSummaryOut = {
  points_total: number;
  points_weekly: number;
  points_monthly: number;
  current_streak_days: number;
  longest_streak_days: number;
  freeze_tokens: number;
  freeze_pending: boolean;
  freeze_pending_date?: string | null;
  level: number;
  level_label: string;
  level_progress: number;
  next_level_points: number;
  leaderboard_opt_in: boolean;
  display_name: string;
  week_start: string;
  month_start: string;
};

export type LeaderboardEntryOut = {
  rank: number;
  display_name: string;
  points: number;
};

export type LeaderboardOut = {
  period: "weekly" | "monthly" | "lifetime";
  entries: LeaderboardEntryOut[];
  user_rank?: number | null;
  user_points?: number | null;
  opt_in: boolean;
};

export type SuperadminSessionOut = {
  id: string;
  source_ip?: string | null;
  user_agent?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_accuracy_m?: number | null;
  geo_label?: string | null;
  created_at: string;
  last_seen_at: string;
};

export type SuperadminSessionStateOut = {
  current_session_id: string;
  has_conflict: boolean;
  sessions: SuperadminSessionOut[];
};

export type SuperadminSessionHistoryOut = SuperadminSessionOut & {
  status: "active" | "revoked" | "ended";
  ended_at?: string | null;
  revoked_at?: string | null;
};

export type SuperadminSessionHistoryListOut = {
  sessions: SuperadminSessionHistoryOut[];
};

export type ResolveSuperadminSessionOut = {
  status: "ok";
  kept_session_id: string;
  should_logout: boolean;
};

export type EmailCenterStatusOut = {
  enabled: boolean;
  mode: string;
  kill_switch: boolean;
  provider: string;
  mail_from: string;
  test_recipient_email: string;
  allow_bulk_send: boolean;
  allow_user_send: boolean;
  allow_scheduling: boolean;
  allow_salary_reminders: boolean;
  allow_ai_suggestions: boolean;
  templates_enabled: boolean;
  allow_open_tracking: boolean;
  allow_click_tracking: boolean;
};

export type EmailDesignSettingsOut = {
  id: number;
  brand_name: string;
  logo_url: string;
  primary_color: string;
  button_color: string;
  footer_text: string;
  support_email: string;
  created_at: string;
  updated_at?: string | null;
};

export type EmailDeliveryOut = {
  id: string;
  email: string;
  original_recipient_email?: string | null;
  recipient_user_id?: string | null;
  subject: string;
  language: string;
  body_html: string;
  body_text: string;
  status: string;
  provider: string;
  provider_message_id?: string | null;
  note?: string | null;
  error_message?: string | null;
  created_by_admin_id?: string | null;
  sent_at?: string | null;
  failed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type EmailDeliveryHistoryOut = {
  items: EmailDeliveryOut[];
  page: number;
  page_size: number;
  total: number;
};

export type EmailSendPayload = {
  to: string;
  language: "darija" | "fr" | "en" | string;
  subject: string;
  body: string;
  cta_label: string;
  cta_url: string;
};

export type EmailCenterUserSearchOut = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name: string;
  detected_language: "darija" | "fr" | "en" | string;
};

export type EmailCenterUserSearchListOut = {
  items: EmailCenterUserSearchOut[];
};

export type EmailCenterUserPreviewOut = {
  user_id: string;
  email: string;
  display_name: string;
  detected_language: "darija" | "fr" | "en" | string;
  subject: string;
  body_html: string;
  body_text: string;
};

export type EmailCenterSystemStatusOut = {
  enabled: boolean;
  mode: "test_only" | "superadmin_only" | "production" | string;
  kill_switch: boolean;
  unsubscribe_token_ttl_days: number;
  flags: {
    ai_suggestions_enabled: boolean;
    allow_user_send: boolean;
    allow_bulk_send: boolean;
    allow_scheduling: boolean;
    allow_salary_reminders: boolean;
    templates_enabled: boolean;
    allow_open_tracking: boolean;
    allow_click_tracking: boolean;
    recipient_preview_enabled: boolean;
    campaigns_enabled: boolean;
    campaign_test_send_enabled: boolean;
    preferences_enabled: boolean;
    suppression_enabled: boolean;
    delivery_queue_enabled: boolean;
    bulk_require_test_send: boolean;
    bulk_require_dry_run: boolean;
  };
  bulk: {
    bulk_send_enabled: boolean;
    bulk_max_recipients: number;
    require_test_send: boolean;
    require_dry_run: boolean;
    confirmation_text: string;
  };
  queue: {
    delivery_queue_enabled: boolean;
    batch_size: number;
    max_attempts: number;
    retry_delay_minutes: number;
    rate_limit_per_minute: number;
  };
  mail_provider: {
    provider: string;
    from_email: string;
    api_base_configured: boolean;
    token_configured: boolean;
  };
  ai: {
    ai_suggestions_enabled: boolean;
    ai_gateway_configured: boolean;
    ai_default_model_configured: boolean;
    ai_capability: "disabled" | "missing_config" | "ready" | string;
  };
  templates: {
    templates_enabled: boolean;
    templates_count?: number | null;
    active_templates_count?: number | null;
    templates_capability: "disabled" | "ready" | "no_templates" | string;
  };
  campaigns: {
    campaigns_enabled: boolean;
    campaign_drafts_count?: number | null;
    campaign_capability: "disabled" | "ready" | "no_campaigns" | "migration_required" | string;
  };
  database: {
    email_design_settings_table: boolean;
    email_deliveries_table: boolean;
    error?: string | null;
  };
  capabilities: {
    send_test: boolean;
    design_settings: boolean;
    history: boolean;
    user_search: boolean;
    user_preview: boolean;
    send_user: boolean;
    bulk_send: boolean;
    scheduling: boolean;
    salary_reminders: boolean;
    ai_suggestions: boolean;
    templates: boolean;
    recipient_preview: "disabled" | "ready" | string;
    campaigns: "disabled" | "ready" | "no_campaigns" | "migration_required" | string;
    campaign_test_send: "disabled" | "ready" | "blocked_by_kill_switch" | "missing_test_recipient" | string;
    preferences: string;
    suppression: string;
    bulk_send_capability: string;
    queue: string;
  };
  safety: {
    bulk_send_blocked: boolean;
    scheduling_blocked: boolean;
    salary_reminders_blocked: boolean;
    test_recipient_configured: boolean;
    production_send_enabled: boolean;
  };
  stats: {
    total_deliveries: number;
    pending: number;
    sent: number;
    failed: number;
    skipped: number;
    retry: number;
    suppression_count?: number | null;
    active_suppression_count?: number | null;
    pending_deliveries_count: number;
    retry_deliveries_count: number;
    latest_delivery_at?: string | null;
  };
};

export type EmailSuppressionOut = {
  id: string;
  email: string;
  user_id?: string | null;
  category?: string | null;
  reason: string;
  source?: string | null;
  is_active: boolean;
  created_by_admin_id?: string | null;
  created_at: string;
  updated_at: string;
  deactivated_at?: string | null;
};

export type EmailSuppressionListOut = {
  items: EmailSuppressionOut[];
  limit: number;
  offset: number;
  total: number;
};

export type DeliveryQueueStatusOut = {
  pending_count: number;
  retry_count: number;
  failed_count: number;
  sent_today: number;
  next_due_count: number;
  batch_size: number;
  max_attempts: number;
  retry_delay_minutes: number;
  rate_limit_per_minute: number;
};

export type EmailCenterAISuggestRequest = {
  language: "darija" | "fr" | "en" | string;
  tone: "friendly" | "professional" | "motivational" | "short" | string;
  goal: string;
  audience_type: "test" | "single_user" | string;
  user_id?: string;
  cta_url?: string;
  cta_label_hint?: string;
  personalize_with_first_name?: boolean;
};

export type EmailCenterAISuggestResponse = {
  subject: string;
  preview_text: string;
  body: string;
  cta_label: string;
};

export type EmailTemplateOut = {
  id: string;
  key?: string | null;
  name: string;
  category: string;
  language: "darija" | "fr" | "en" | string;
  subject: string;
  preview_text?: string | null;
  body: string;
  cta_label?: string | null;
  cta_url?: string | null;
  is_active: boolean;
  created_by_admin_id?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type EmailTemplateListOut = {
  enabled: boolean;
  items: EmailTemplateOut[];
};

export type EmailCenterAudienceType =
  | "all_users"
  | "incomplete_onboarding"
  | "no_transactions"
  | "no_envelopes"
  | "by_language"
  | "salary_today"
  | "salary_tomorrow";

export type EmailCenterRecipientsPreviewRequest = {
  audience_type: EmailCenterAudienceType;
  language?: "darija" | "fr" | "en" | string;
  template_id?: string;
  subject?: string;
  body?: string;
  cta_label?: string;
  cta_url?: string;
  limit?: number;
};

export type EmailCenterRecipientsPreviewItem = {
  user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name: string;
  detected_language: "darija" | "fr" | "en" | string;
  eligible: boolean;
  reason: string;
  skip_reason?: string | null;
};

export type EmailCenterRecipientsPreviewResponse = {
  enabled: boolean;
  audience_type: EmailCenterAudienceType | string;
  total_matched: number;
  returned_count: number;
  items: EmailCenterRecipientsPreviewItem[];
  warnings: string[];
};

export type EmailCenterPreviewUserEmailRequest = {
  user_id: string;
  template_id?: string;
  subject?: string;
  body?: string;
  cta_label?: string;
  cta_url?: string;
};

export type EmailCenterPreviewUserEmailResponse = {
  user_id: string;
  email: string;
  detected_language: "darija" | "fr" | "en" | string;
  subject: string;
  preview_text: string;
  body_html: string;
  body_text: string;
  cta_label: string;
  cta_url: string;
};

export type EmailCampaignStatus = "draft" | "ready" | "queued" | "archived" | string;
export type EmailCampaignLanguageMode = "auto" | "darija" | "fr" | "en" | string;

export type EmailCampaignOut = {
  id: string;
  title: string;
  type: string;
  status: EmailCampaignStatus;
  audience_type: EmailCenterAudienceType | string;
  audience_filter_json?: Record<string, unknown> | null;
  language_mode: EmailCampaignLanguageMode;
  template_id?: string | null;
  subject_by_language_json?: Record<string, unknown> | null;
  preview_by_language_json?: Record<string, unknown> | null;
  body_by_language_json?: Record<string, unknown> | null;
  cta_label_by_language_json?: Record<string, unknown> | null;
  cta_url?: string | null;
  design_settings_json?: Record<string, unknown> | null;
  estimated_recipient_count?: number | null;
  last_dry_run_at?: string | null;
  last_test_sent_at?: string | null;
  approved_at?: string | null;
  approved_by_admin_id?: string | null;
  sent_at?: string | null;
  send_started_at?: string | null;
  send_finished_at?: string | null;
  total_recipients?: number | null;
  total_sent?: number | null;
  total_failed?: number | null;
  total_skipped?: number | null;
  created_by_admin_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type EmailCampaignListOut = {
  enabled: boolean;
  capability: "disabled" | "ready" | "no_campaigns" | "migration_required" | string;
  items: EmailCampaignOut[];
  limit: number;
  offset: number;
};

export type EmailCampaignCreateRequest = {
  title: string;
  type?: string;
  audience_type: EmailCenterAudienceType | string;
  audience_filter_json?: Record<string, unknown>;
  language_mode: EmailCampaignLanguageMode;
  template_id?: string;
  subject_by_language_json?: Record<string, unknown>;
  preview_by_language_json?: Record<string, unknown>;
  body_by_language_json?: Record<string, unknown>;
  cta_label_by_language_json?: Record<string, unknown>;
  cta_url?: string;
  design_settings_json?: Record<string, unknown>;
  status?: EmailCampaignStatus;
};
