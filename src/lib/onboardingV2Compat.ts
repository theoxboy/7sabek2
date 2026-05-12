export type OnboardingAnswerValue =
  | string
  | string[]
  | Record<string, unknown>
  | Array<Record<string, unknown>>;

export type OnboardingAnswers = Record<string, OnboardingAnswerValue>;
export type JsonRecord = Record<string, unknown>;
export type JourneyMode = "onboarding" | "money_plan";
export type OnboardingProgressSubview =
  | "question"
  | "journey_ready"
  | "financial_review"
  | "expense_review"
  | "distribution_review";

export type OnboardingProgressSnapshot = {
  flow_stage?: "collect_user" | "intro" | "questions";
  step_index?: number;
  current_question_id?: string | null;
  journey_mode?: JourneyMode;
  step_id?: string | null;
  subview?: OnboardingProgressSubview;
  modal_state?: unknown;
  review_context?: Record<string, unknown> | null;
};

export type OnboardingRecordStage = "completed" | "review" | "in_progress";
export type OnboardingWorkflowPhase =
  | "collecting"
  | "planning"
  | "ready_for_apply"
  | "completed";

type ProgressNormalizationContext = {
  answers?: OnboardingAnswers | null;
  draftObjects?: JsonRecord | null;
  storedStage?: OnboardingRecordStage | null;
};

export const MODERN_OBJECTIVES_KEY = "F1_objectives_v1";
export const MODERN_PRIORITY_PROFILE_KEY = "F1_priority_profile_v1";
export const MODERN_ENVELOPE_PREFERENCES_KEY = "E11_envelope_preferences_v1";

const LEGACY_OBJECTIVES_KEY = "Q0b_primary_objective";

const MONEY_PLAN_QUESTION_IDS = new Set([
  "F0_financial_summary",
  "F1_interactive_guidance",
  "E11_envelope_setup",
  "E11b_distribution_setup",
  "E12_smart_settings",
]);
const MONEY_PLAN_REVIEW_STEP_ID = "E12_smart_settings";

const LEGACY_MONEY_PLAN_QUESTION_IDS = new Set([
  "D2_debt_preferences",
  "D3_debt_summary",
  "G2_goal_preferences",
  "Q0a_envelope_bridge_message",
  "Q0b_primary_objective",
  "Q0c_objective_intro_message",
  "E7_lifestyle",
  "E8_envelope_granularity",
  "E10_keep_suggestions",
]);

const VALID_PROGRESS_SUBVIEWS = new Set<OnboardingProgressSubview>([
  "question",
  "journey_ready",
  "financial_review",
  "expense_review",
  "distribution_review",
]);

type RawOnboardingProgressSubview =
  | OnboardingProgressSubview
  | "ready"
  | "rollover_config"
  | "sweep_setup"
  | "completion";

const LEGACY_FINAL_REVIEW_SUBVIEWS = new Set<RawOnboardingProgressSubview>([
  "ready",
  "rollover_config",
  "sweep_setup",
  "completion",
]);

function asRecord(value: unknown): JsonRecord | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return null;
}

function readString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function readOptionalString(value: unknown): string | null {
  const normalized = readString(value);
  return normalized || null;
}

function readStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => readString(item))
      .filter((item) => item.length > 0);
    return Array.from(new Set(items));
  }
  const single = readOptionalString(value);
  return single ? [single] : [];
}

function parseLocalizedPositiveNumber(value: string): number {
  const raw = value.trim().replace(/\s+/g, "");
  if (!raw) return 0;

  const hasDot = raw.includes(".");
  const hasComma = raw.includes(",");
  let normalized = raw;

  if (hasDot && hasComma) {
    const lastDot = raw.lastIndexOf(".");
    const lastComma = raw.lastIndexOf(",");
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandsSep = decimalSep === "." ? "," : ".";
    normalized = raw.split(thousandsSep).join("");
    if (decimalSep === ",") {
      normalized = normalized.replace(",", ".");
    }
  } else if (hasDot) {
    if (/^-?\d{1,3}(\.\d{3})+([.,]\d+)?$/.test(raw)) {
      normalized = raw.replace(/\./g, "");
    }
  } else if (hasComma) {
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) {
      normalized = raw.replace(/,/g, "");
    } else {
      normalized = raw.replace(",", ".");
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getPriorityProfileRecord(answers: OnboardingAnswers): JsonRecord {
  return asRecord(answers[MODERN_PRIORITY_PROFILE_KEY]) ?? {};
}

function getEnvelopePreferencesRecord(answers: OnboardingAnswers): JsonRecord {
  return asRecord(answers[MODERN_ENVELOPE_PREFERENCES_KEY]) ?? {};
}

function withPriorityProfileValue(
  answers: OnboardingAnswers,
  field: "debt_priority" | "goal_priority" | "living_priority",
  value: string | null
): OnboardingAnswers {
  const next: OnboardingAnswers = { ...answers };
  const profile = { ...getPriorityProfileRecord(next) };
  if (value) {
    profile[field] = value;
  } else {
    delete profile[field];
  }
  if (Object.keys(profile).length > 0) {
    next[MODERN_PRIORITY_PROFILE_KEY] = profile;
  } else {
    delete next[MODERN_PRIORITY_PROFILE_KEY];
  }
  delete next.P1_priority_profile;
  delete next.P1_debt_priority;
  delete next.P1_goal_priority;
  delete next.P1_living_priority;
  return next;
}

function withEnvelopePreferencesValue(
  answers: OnboardingAnswers,
  field: "lifestyle_margin_level" | "selected_suggestion_slugs",
  value: string | string[] | null
): OnboardingAnswers {
  const next: OnboardingAnswers = { ...answers };
  const preferences = { ...getEnvelopePreferencesRecord(next) };
  if (field === "lifestyle_margin_level") {
    const normalized = typeof value === "string" ? readOptionalString(value) : null;
    if (normalized) {
      preferences[field] = normalized;
    } else {
      delete preferences[field];
    }
  } else {
    const normalized = Array.isArray(value) ? Array.from(new Set(value.filter(Boolean))) : [];
    if (normalized.length > 0) {
      preferences[field] = normalized;
    } else {
      delete preferences[field];
    }
  }
  if (Object.keys(preferences).length > 0) {
    next[MODERN_ENVELOPE_PREFERENCES_KEY] = preferences;
  } else {
    delete next[MODERN_ENVELOPE_PREFERENCES_KEY];
  }
  delete next.E7_lifestyle;
  delete next.E8_envelope_granularity;
  delete next.E10_keep_suggestions;
  return next;
}

function inferJourneyModeFromStepId(stepId: string | null): JourneyMode | null {
  if (!stepId) return null;
  if (MONEY_PLAN_QUESTION_IDS.has(stepId) || LEGACY_MONEY_PLAN_QUESTION_IDS.has(stepId)) {
    return "money_plan";
  }
  return "onboarding";
}

function inferReviewContext(
  subview: OnboardingProgressSubview | null,
  journeyMode: JourneyMode | null,
  raw: JsonRecord
): Record<string, unknown> | null {
  const explicit = asRecord(raw.review_context);
  const canonicalScreen =
    subview === "financial_review" || subview === "expense_review"
      ? "financial_summary"
      : subview === "journey_ready"
      ? "journey_ready"
      : subview === "distribution_review"
      ? journeyMode === "money_plan"
        ? "distribution_review"
        : "journey_ready"
      : null;
  if (explicit) {
    const next = { ...explicit };
    if (canonicalScreen) {
      next.screen = canonicalScreen;
    } else if (
      next.screen === "money_plan" ||
      next.screen === "distribution_review" ||
      next.screen === "journey_ready" ||
      typeof next.screen !== "string"
    ) {
      delete next.screen;
    }
    return Object.keys(next).length > 0 ? next : null;
  }
  if (subview === "financial_review" || subview === "expense_review") {
    return { screen: "financial_summary" };
  }
  if (subview === "journey_ready") {
    return { screen: "journey_ready" };
  }
  if (subview === "distribution_review") {
    return {
      screen: journeyMode === "money_plan" ? "distribution_review" : "journey_ready",
    };
  }
  return null;
}

function hasEnvelopeSetupSignals(
  answers: OnboardingAnswers | null | undefined,
  draftObjects: JsonRecord | null | undefined
): boolean {
  if (answers) {
    if (getOnboardingAnswerString(answers, "E7_lifestyle")) return true;
    if (getOnboardingAnswerList(answers, "E10_keep_suggestions").length > 0) return true;
  }
  const proposal = asRecord(draftObjects?.envelopes_proposal_v1);
  if (!proposal) return false;
  return (
    Array.isArray(proposal.selected_envelopes) ||
    Array.isArray(proposal.candidates) ||
    Array.isArray(proposal.excluded_envelopes)
  );
}

function hasGuidanceSignals(
  answers: OnboardingAnswers | null | undefined
): boolean {
  if (!answers) return false;
  return readOptionalString(answers.F1_guidance_mode) !== null;
}

function hasDistributionSetupSignals(
  answers: OnboardingAnswers | null | undefined
): boolean {
  if (!answers) return false;
  return readOptionalString(answers.E11b_distribution_setup) === "done";
}

function hasAnySmartSettingsSignals(
  answers: OnboardingAnswers | null | undefined
): boolean {
  if (!answers) return false;
  const date = getOnboardingAnswerString(answers, "SWP1_last_income_date");
  const amount = parseLocalizedPositiveNumber(
    getOnboardingAnswerString(answers, "SWP2_last_income_amount")
  );
  return date.length > 0 || amount > 0;
}

function isSmartSettingsComplete(
  answers: OnboardingAnswers | null | undefined
): boolean {
  if (!answers) return false;
  const date = getOnboardingAnswerString(answers, "SWP1_last_income_date");
  const amount = parseLocalizedPositiveNumber(
    getOnboardingAnswerString(answers, "SWP2_last_income_amount")
  );
  return date.length > 0 && amount > 0;
}

function canUseMoneyPlanDistributionReview(
  journeyMode: JourneyMode | null,
  stepId: string | null,
  answers?: OnboardingAnswers | null
): boolean {
  return (
    journeyMode === "money_plan" &&
    stepId === MONEY_PLAN_REVIEW_STEP_ID &&
    isSmartSettingsComplete(answers)
  );
}

function inferJourneyModeFromProgress(
  stepId: string | null,
  rawSubview: RawOnboardingProgressSubview | null,
  raw: JsonRecord
): JourneyMode | null {
  const fromStepId = inferJourneyModeFromStepId(stepId);
  if (fromStepId) return fromStepId;
  const reviewContext = asRecord(raw.review_context);
  const reviewScreen = readOptionalString(reviewContext?.screen);
  const hasLegacyFinalSubview = rawSubview !== null && LEGACY_FINAL_REVIEW_SUBVIEWS.has(rawSubview);
  const canMapLegacyFinalToMoneyPlan =
    hasLegacyFinalSubview &&
    (stepId === MONEY_PLAN_REVIEW_STEP_ID ||
      reviewScreen === "distribution_review" ||
      reviewScreen === "money_plan");
  if (
    rawSubview === "distribution_review" ||
    canMapLegacyFinalToMoneyPlan ||
    reviewScreen === "distribution_review" ||
    reviewScreen === "money_plan"
  ) {
    return "money_plan";
  }
  if (
    rawSubview === "journey_ready" ||
    rawSubview === "ready" ||
    hasLegacyFinalSubview ||
    reviewScreen === "journey_ready"
  ) {
    return "onboarding";
  }
  return null;
}

function normalizeProgressStepId(
  stepId: string | null,
  currentQuestionId: string | null,
  journeyMode: JourneyMode | null,
  rawSubview: RawOnboardingProgressSubview | null
): string | null {
  const candidate = stepId ?? currentQuestionId;
  if (
    journeyMode === "money_plan" &&
    (candidate === MONEY_PLAN_REVIEW_STEP_ID ||
      rawSubview === "distribution_review" ||
      (rawSubview !== null && LEGACY_FINAL_REVIEW_SUBVIEWS.has(rawSubview)))
  ) {
    return MONEY_PLAN_REVIEW_STEP_ID;
  }
  return candidate;
}

function normalizeProgressSubview(
  journeyMode: JourneyMode | null,
  stepId: string | null,
  rawSubview: RawOnboardingProgressSubview | null,
  answers?: OnboardingAnswers | null
): OnboardingProgressSubview | undefined {
  if (rawSubview === "question") {
    if (canUseMoneyPlanDistributionReview(journeyMode, stepId, answers)) {
      return "distribution_review";
    }
    return stepId ? "question" : undefined;
  }
  if (rawSubview === "financial_review" || rawSubview === "expense_review") {
    return rawSubview;
  }
  if (rawSubview === "journey_ready") {
    return "journey_ready";
  }
  if (rawSubview === "distribution_review") {
    if (journeyMode === "money_plan" && stepId === MONEY_PLAN_REVIEW_STEP_ID) {
      return canUseMoneyPlanDistributionReview(journeyMode, stepId, answers)
        ? "distribution_review"
        : "question";
    }
    return "distribution_review";
  }
  if (rawSubview === null && canUseMoneyPlanDistributionReview(journeyMode, stepId, answers)) {
    return "distribution_review";
  }
  if (rawSubview === "ready") {
    if (journeyMode === "money_plan") {
      return canUseMoneyPlanDistributionReview(journeyMode, stepId, answers)
        ? "distribution_review"
        : "question";
    }
    return "journey_ready";
  }
  if (
    rawSubview === "rollover_config" ||
    rawSubview === "sweep_setup" ||
    rawSubview === "completion"
  ) {
    if (journeyMode === "money_plan") {
      return canUseMoneyPlanDistributionReview(journeyMode, stepId, answers)
        ? "distribution_review"
        : "question";
    }
    return "journey_ready";
  }
  return stepId ? "question" : undefined;
}

function resolveFallbackMoneyPlanStepId(
  answers: OnboardingAnswers | null | undefined,
  draftObjects: JsonRecord | null | undefined,
  storedStage?: OnboardingRecordStage | null
): string | null {
  // IMPORTANT:
  // Do not infer advanced Money Plan progress from generic onboarding review
  // state or legacy envelope signals. Otherwise a fresh /khatat-lflous entry
  // can jump directly to the final step (E12) even when the user never started
  // the Money Plan flow.
  const hasDistributionSignals = hasDistributionSetupSignals(answers);
  const hasGuidanceSignalsNow = hasGuidanceSignals(answers);
  const hasEnvelopeSignals = hasEnvelopeSetupSignals(answers, draftObjects);
  if (isSmartSettingsComplete(answers) && (hasDistributionSignals || hasGuidanceSignalsNow)) {
    return MONEY_PLAN_REVIEW_STEP_ID;
  }
  if (hasEnvelopeSignals) {
    return "E11_envelope_setup";
  }
  if (hasDistributionSignals) {
    return "E11b_distribution_setup";
  }
  if (hasGuidanceSignalsNow) {
    return "F1_interactive_guidance";
  }
  if (
    storedStage === "review" &&
    hasAnySmartSettingsSignals(answers) &&
    (hasDistributionSignals || hasGuidanceSignalsNow)
  ) {
    return MONEY_PLAN_REVIEW_STEP_ID;
  }
  return null;
}

function buildFallbackProgressSnapshot(
  context?: ProgressNormalizationContext
): OnboardingProgressSnapshot | null {
  const answers = context?.answers ?? null;
  const draftObjects = context?.draftObjects ?? null;
  const stepId = resolveFallbackMoneyPlanStepId(answers, draftObjects, context?.storedStage);
  if (!stepId) return null;
  const stepIndexById: Record<string, number> = {
    F0_financial_summary: 0,
    F1_interactive_guidance: 1,
    E11_envelope_setup: 2,
    E11b_distribution_setup: 3,
    E12_smart_settings: 4,
  };
  const subview =
    stepId === MONEY_PLAN_REVIEW_STEP_ID && isSmartSettingsComplete(answers)
      ? "distribution_review"
      : "question";
  return {
    flow_stage: "questions",
    step_index: stepIndexById[stepId] ?? 0,
    current_question_id: stepId,
    journey_mode: "money_plan",
    step_id: stepId,
    subview,
    modal_state: null,
    review_context: inferReviewContext(subview, "money_plan", {}),
  };
}

export function getOnboardingAnswerString(
  answers: OnboardingAnswers,
  key: string
): string {
  if (key === LEGACY_OBJECTIVES_KEY) {
    return getOnboardingAnswerList(answers, key)[0] ?? "";
  }
  if (key === "P1_debt_priority") {
    return readString(getPriorityProfileRecord(answers).debt_priority) || readString(answers[key]);
  }
  if (key === "P1_goal_priority") {
    return readString(getPriorityProfileRecord(answers).goal_priority) || readString(answers[key]);
  }
  if (key === "P1_living_priority") {
    return readString(getPriorityProfileRecord(answers).living_priority) || readString(answers[key]);
  }
  if (key === "E7_lifestyle") {
    return (
      readString(getEnvelopePreferencesRecord(answers).lifestyle_margin_level) ||
      readString(answers[key])
    );
  }
  return readString(answers[key]);
}

export function getOnboardingAnswerList(
  answers: OnboardingAnswers,
  key: string
): string[] {
  if (key === LEGACY_OBJECTIVES_KEY) {
    const modern = readStringList(answers[MODERN_OBJECTIVES_KEY]);
    return modern.length > 0 ? modern : readStringList(answers[key]);
  }
  if (key === "E10_keep_suggestions") {
    const modern = readStringList(
      getEnvelopePreferencesRecord(answers).selected_suggestion_slugs
    );
    return modern.length > 0 ? modern : readStringList(answers[key]);
  }
  return readStringList(answers[key]);
}

export function setOnboardingAnswerString(
  answers: OnboardingAnswers,
  key: string,
  value: string
): OnboardingAnswers {
  const normalized = readOptionalString(value);
  if (key === "P1_debt_priority") {
    return withPriorityProfileValue(answers, "debt_priority", normalized);
  }
  if (key === "P1_goal_priority") {
    return withPriorityProfileValue(answers, "goal_priority", normalized);
  }
  if (key === "P1_living_priority") {
    return withPriorityProfileValue(answers, "living_priority", normalized);
  }
  if (key === "E7_lifestyle") {
    return withEnvelopePreferencesValue(answers, "lifestyle_margin_level", normalized);
  }
  const next: OnboardingAnswers = { ...answers };
  if (normalized) {
    next[key] = normalized;
  } else {
    delete next[key];
  }
  return next;
}

export function setOnboardingAnswerList(
  answers: OnboardingAnswers,
  key: string,
  values: string[]
): OnboardingAnswers {
  const normalized = Array.from(new Set(values.map((item) => readString(item)).filter(Boolean)));
  if (key === LEGACY_OBJECTIVES_KEY) {
    const next: OnboardingAnswers = { ...answers };
    if (normalized.length > 0) {
      next[MODERN_OBJECTIVES_KEY] = normalized;
    } else {
      delete next[MODERN_OBJECTIVES_KEY];
    }
    delete next[LEGACY_OBJECTIVES_KEY];
    return next;
  }
  if (key === "E10_keep_suggestions") {
    return withEnvelopePreferencesValue(answers, "selected_suggestion_slugs", normalized);
  }
  const next: OnboardingAnswers = { ...answers };
  if (normalized.length > 0) {
    next[key] = normalized;
  } else {
    delete next[key];
  }
  return next;
}

export function deleteOnboardingAnswer(
  answers: OnboardingAnswers,
  key: string
): OnboardingAnswers {
  const next: OnboardingAnswers = { ...answers };
  if (key === LEGACY_OBJECTIVES_KEY) {
    delete next[MODERN_OBJECTIVES_KEY];
    delete next[LEGACY_OBJECTIVES_KEY];
    return next;
  }
  if (key === "P1_debt_priority") {
    const profile = { ...getPriorityProfileRecord(next) };
    delete profile.debt_priority;
    if (Object.keys(profile).length > 0) {
      next[MODERN_PRIORITY_PROFILE_KEY] = profile;
    } else {
      delete next[MODERN_PRIORITY_PROFILE_KEY];
    }
    delete next[key];
    return next;
  }
  if (key === "P1_goal_priority") {
    const profile = { ...getPriorityProfileRecord(next) };
    delete profile.goal_priority;
    if (Object.keys(profile).length > 0) {
      next[MODERN_PRIORITY_PROFILE_KEY] = profile;
    } else {
      delete next[MODERN_PRIORITY_PROFILE_KEY];
    }
    delete next[key];
    return next;
  }
  if (key === "P1_living_priority") {
    const profile = { ...getPriorityProfileRecord(next) };
    delete profile.living_priority;
    if (Object.keys(profile).length > 0) {
      next[MODERN_PRIORITY_PROFILE_KEY] = profile;
    } else {
      delete next[MODERN_PRIORITY_PROFILE_KEY];
    }
    delete next[key];
    return next;
  }
  if (key === "P1_priority_profile") {
    delete next[key];
    return next;
  }
  if (key === "E7_lifestyle") {
    const preferences = { ...getEnvelopePreferencesRecord(next) };
    delete preferences.lifestyle_margin_level;
    if (Object.keys(preferences).length > 0) {
      next[MODERN_ENVELOPE_PREFERENCES_KEY] = preferences;
    } else {
      delete next[MODERN_ENVELOPE_PREFERENCES_KEY];
    }
    delete next[key];
    return next;
  }
  if (key === "E10_keep_suggestions") {
    const preferences = { ...getEnvelopePreferencesRecord(next) };
    delete preferences.selected_suggestion_slugs;
    if (Object.keys(preferences).length > 0) {
      next[MODERN_ENVELOPE_PREFERENCES_KEY] = preferences;
    } else {
      delete next[MODERN_ENVELOPE_PREFERENCES_KEY];
    }
    delete next[key];
    return next;
  }
  delete next[key];
  return next;
}

export function normalizeOnboardingAnswers(value: unknown): OnboardingAnswers {
  const raw = asRecord(value) ?? {};
  let next: OnboardingAnswers = { ...raw } as OnboardingAnswers;
  const objectives = getOnboardingAnswerList(next, LEGACY_OBJECTIVES_KEY);
  const debtPriority = getOnboardingAnswerString(next, "P1_debt_priority");
  const goalPriority = getOnboardingAnswerString(next, "P1_goal_priority");
  const livingPriority = getOnboardingAnswerString(next, "P1_living_priority");
  const lifestyle = getOnboardingAnswerString(next, "E7_lifestyle");
  const suggestions = getOnboardingAnswerList(next, "E10_keep_suggestions");

  next = setOnboardingAnswerList(next, LEGACY_OBJECTIVES_KEY, objectives);
  next = setOnboardingAnswerString(next, "P1_debt_priority", debtPriority);
  next = setOnboardingAnswerString(next, "P1_goal_priority", goalPriority);
  next = setOnboardingAnswerString(next, "P1_living_priority", livingPriority);
  next = deleteOnboardingAnswer(next, "P1_priority_profile");
  if (lifestyle) {
    next = setOnboardingAnswerString(next, "E7_lifestyle", lifestyle);
  } else {
    next = deleteOnboardingAnswer(next, "E7_lifestyle");
  }
  next = setOnboardingAnswerList(next, "E10_keep_suggestions", suggestions);
  delete next.E8_envelope_granularity;
  return next;
}

export function buildOnboardingProgressSnapshot(input: {
  flowStage: "collect_user" | "intro" | "questions";
  stepIndex: number;
  currentQuestionId: string | null;
  journeyMode: JourneyMode;
  answers?: OnboardingAnswers | null;
  isReadyScreen: boolean;
  isFinancialReviewScreen: boolean;
  isExpenseReviewScreen: boolean;
  isRolloverConfigScreen: boolean;
  isSweepSetupScreen: boolean;
  isCompletionScreen: boolean;
}): OnboardingProgressSnapshot {
  const rawSubview: RawOnboardingProgressSubview =
    input.isCompletionScreen
      ? "completion"
      : input.isSweepSetupScreen
      ? "sweep_setup"
      : input.isRolloverConfigScreen
      ? "rollover_config"
      : input.isExpenseReviewScreen
      ? "expense_review"
      : input.isFinancialReviewScreen
      ? "financial_review"
      : input.isReadyScreen
      ? "ready"
      : "question";
  const stepId = normalizeProgressStepId(
    input.currentQuestionId,
    input.currentQuestionId,
    input.journeyMode,
    rawSubview
  );
  const subview =
    normalizeProgressSubview(input.journeyMode, stepId, rawSubview, input.answers) ?? "question";

  return {
    flow_stage: input.flowStage,
    step_index: input.stepIndex,
    current_question_id: stepId,
    journey_mode: input.journeyMode,
    step_id: stepId,
    subview,
    modal_state: null,
    review_context: inferReviewContext(subview, input.journeyMode, {}),
  };
}

export function readOnboardingProgressSnapshot(
  value: unknown,
  context?: ProgressNormalizationContext
): OnboardingProgressSnapshot | null {
  const raw = asRecord(value);
  if (!raw) return buildFallbackProgressSnapshot(context);

  const flowStage = readOptionalString(raw.flow_stage);
  const normalizedFlowStage =
    flowStage === "collect_user" || flowStage === "intro" || flowStage === "questions"
      ? flowStage
      : undefined;
  const currentQuestionId = readOptionalString(raw.current_question_id);
  const rawStepId = readOptionalString(raw.step_id) ?? currentQuestionId;
  const explicitSubview = readOptionalString(raw.subview);
  const legacySubview =
    raw.is_completion_screen === true
      ? "completion"
      : raw.is_sweep_setup_screen === true
      ? "sweep_setup"
      : raw.is_rollover_config_screen === true
      ? "rollover_config"
      : raw.is_expense_review_screen === true
      ? "expense_review"
      : raw.is_financial_review_screen === true
      ? "financial_review"
      : raw.is_ready_screen === true
      ? "ready"
      : null;
  const rawSubview =
    explicitSubview === "question" ||
    explicitSubview === "journey_ready" ||
    explicitSubview === "financial_review" ||
    explicitSubview === "expense_review" ||
    explicitSubview === "distribution_review" ||
    explicitSubview === "ready" ||
    explicitSubview === "rollover_config" ||
    explicitSubview === "sweep_setup" ||
    explicitSubview === "completion"
      ? (explicitSubview as RawOnboardingProgressSubview)
      : legacySubview
      ? (legacySubview as RawOnboardingProgressSubview)
      : null;
  const explicitJourneyMode = readOptionalString(raw.journey_mode);
  const journeyMode =
    explicitJourneyMode === "onboarding" || explicitJourneyMode === "money_plan"
      ? explicitJourneyMode
      : inferJourneyModeFromProgress(rawStepId, rawSubview, raw);
  const stepId = normalizeProgressStepId(rawStepId, currentQuestionId, journeyMode, rawSubview);
  const subview = normalizeProgressSubview(journeyMode, stepId, rawSubview, context?.answers);
  if (!stepId) {
    return buildFallbackProgressSnapshot({
      answers: context?.answers,
      draftObjects: context?.draftObjects ?? raw,
      storedStage: context?.storedStage,
    });
  }
  const modalState = raw.modal_state ?? null;
  const reviewContext = inferReviewContext(subview ?? null, journeyMode, raw);

  return {
    flow_stage: normalizedFlowStage,
    step_index: typeof raw.step_index === "number" ? raw.step_index : undefined,
    current_question_id: stepId,
    journey_mode: journeyMode ?? undefined,
    step_id: stepId,
    subview,
    modal_state: modalState,
    review_context: reviewContext,
  };
}

export function normalizeOnboardingDraftObjects(
  value: unknown,
  context?: ProgressNormalizationContext
): JsonRecord {
  const raw = asRecord(value) ?? {};
  const next: JsonRecord = { ...raw };
  const progress = readOnboardingProgressSnapshot(raw.onboarding_progress_v2, {
    answers: context?.answers,
    draftObjects: raw,
    storedStage: context?.storedStage,
  });
  if (progress) {
    next.onboarding_progress_v2 = progress;
  } else {
    delete next.onboarding_progress_v2;
  }
  return next;
}

export function hasSavedMoneyPlanOverlayState(
  progress: OnboardingProgressSnapshot | null
): boolean {
  return progress?.subview === "distribution_review";
}

export function hasReachedOnboardingReviewProgress(
  progress: OnboardingProgressSnapshot | null,
  options?: {
    allowImplicitMoneyPlanQuestions?: boolean;
  }
): boolean {
  if (!progress) return false;
  if (progress.subview === "journey_ready" || progress.subview === "distribution_review") {
    return true;
  }
  const stepId = progress.step_id ?? progress.current_question_id ?? "";
  return (
    progress.journey_mode !== "onboarding" &&
    (options?.allowImplicitMoneyPlanQuestions ?? true) &&
    MONEY_PLAN_QUESTION_IDS.has(stepId)
  );
}

export function deriveOnboardingWorkflowPhase(
  progress: OnboardingProgressSnapshot | null,
  storedStage?: OnboardingRecordStage | null,
  applied = false
): OnboardingWorkflowPhase {
  if (applied && storedStage === "completed") {
    return "completed";
  }
  if (progress?.journey_mode === "money_plan") {
    if (progress.subview === "distribution_review") {
      return "ready_for_apply";
    }
    return "planning";
  }
  if (progress?.journey_mode === "onboarding") {
    if (progress.subview === "journey_ready") {
      return "planning";
    }
    return "collecting";
  }
  if (progress?.subview === "distribution_review") {
    return "ready_for_apply";
  }
  if (storedStage === "review") {
    return "ready_for_apply";
  }
  if (storedStage === "completed") {
    return "completed";
  }
  return "collecting";
}

export function deriveOnboardingRecordStage(
  progress: OnboardingProgressSnapshot | null,
  stageOverride?: OnboardingRecordStage
): OnboardingRecordStage {
  if (stageOverride) return stageOverride;
  return deriveOnboardingWorkflowPhase(progress) === "ready_for_apply"
    ? "review"
    : "in_progress";
}
