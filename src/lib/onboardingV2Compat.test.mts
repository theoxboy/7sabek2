import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveOnboardingRecordStage,
  deriveOnboardingWorkflowPhase,
  MODERN_ENVELOPE_PREFERENCES_KEY,
  MODERN_OBJECTIVES_KEY,
  MODERN_PRIORITY_PROFILE_KEY,
  buildOnboardingProgressSnapshot,
  getOnboardingAnswerList,
  getOnboardingAnswerString,
  hasReachedOnboardingReviewProgress,
  normalizeOnboardingAnswers,
  normalizeOnboardingDraftObjects,
  readOnboardingProgressSnapshot,
} from "./onboardingV2Compat.ts";

test("normalizeOnboardingAnswers strips legacy bridges and keeps modern reads stable", () => {
  const answers = normalizeOnboardingAnswers({
    Q0b_primary_objective: ["debt", "all"],
    P1_debt_priority: "debt_relief_fast",
    P1_goal_priority: "goal_start_light",
    P1_living_priority: "living_balance",
    E7_lifestyle: "high",
    E8_envelope_granularity: "detailed",
    E10_keep_suggestions: ["loyer", "transport"],
    keep_this_key: "ok",
  });

  assert.deepEqual(answers[MODERN_OBJECTIVES_KEY], ["debt", "all"]);
  assert.deepEqual(answers[MODERN_PRIORITY_PROFILE_KEY], {
    debt_priority: "debt_relief_fast",
    goal_priority: "goal_start_light",
    living_priority: "living_balance",
  });
  assert.deepEqual(answers[MODERN_ENVELOPE_PREFERENCES_KEY], {
    lifestyle_margin_level: "high",
    selected_suggestion_slugs: ["loyer", "transport"],
  });
  assert.equal("Q0b_primary_objective" in answers, false);
  assert.equal("P1_debt_priority" in answers, false);
  assert.equal("E7_lifestyle" in answers, false);
  assert.equal("E8_envelope_granularity" in answers, false);
  assert.equal("E10_keep_suggestions" in answers, false);
  assert.equal(getOnboardingAnswerString(answers, "P1_debt_priority"), "debt_relief_fast");
  assert.deepEqual(getOnboardingAnswerList(answers, "Q0b_primary_objective"), ["debt", "all"]);
  assert.deepEqual(getOnboardingAnswerList(answers, "E10_keep_suggestions"), ["loyer", "transport"]);
});

test("readOnboardingProgressSnapshot upgrades legacy overlay flags to the new resume model", () => {
  const progress = readOnboardingProgressSnapshot(
    {
      flow_stage: "questions",
      step_index: 3,
      current_question_id: "E11_envelope_setup",
      is_rollover_config_screen: true,
      review_context: { screen: "money_plan", legacy: true },
    },
    {
      answers: {
        SWP1_last_income_date: "2026-04-01",
        SWP2_last_income_amount: "6000",
      },
    }
  );

  assert.deepEqual(progress, {
    flow_stage: "questions",
    step_index: 3,
    current_question_id: "E12_smart_settings",
    journey_mode: "money_plan",
    step_id: "E12_smart_settings",
    subview: "distribution_review",
    modal_state: null,
    review_context: { screen: "distribution_review", legacy: true },
  });
});

test("legacy money-plan final overlays stay on the E12 question until smart settings are complete", () => {
  const progress = readOnboardingProgressSnapshot(
    {
      flow_stage: "questions",
      step_index: 3,
      current_question_id: "E11_envelope_setup",
      is_completion_screen: true,
      review_context: { screen: "money_plan", legacy: true },
    },
    {
      answers: {
        SWP1_last_income_date: "2026-04-01",
      },
    }
  );

  assert.equal(progress?.step_id, "E12_smart_settings");
  assert.equal(progress?.subview, "question");
  assert.deepEqual(progress?.review_context, { legacy: true });
  assert.equal(deriveOnboardingRecordStage(progress ?? null), "in_progress");
});

test("buildOnboardingProgressSnapshot emits the new progress shape and review detection stays stable", () => {
  const progress = buildOnboardingProgressSnapshot({
    flowStage: "questions",
    stepIndex: 4,
    currentQuestionId: "E12_smart_settings",
    journeyMode: "money_plan",
    answers: {
      SWP1_last_income_date: "2026-04-01",
      SWP2_last_income_amount: "6000",
    },
    isReadyScreen: false,
    isFinancialReviewScreen: false,
    isExpenseReviewScreen: false,
    isRolloverConfigScreen: false,
    isSweepSetupScreen: false,
    isCompletionScreen: false,
  });

  assert.equal(progress.subview, "distribution_review");
  assert.deepEqual(progress.review_context, { screen: "distribution_review" });
  assert.equal(hasReachedOnboardingReviewProgress(progress), true);

  const draftObjects = normalizeOnboardingDraftObjects({
    onboarding_progress_v2: {
      current_question_id: "F1_interactive_guidance",
      is_financial_review_screen: true,
    },
  });
  const normalized = readOnboardingProgressSnapshot(draftObjects.onboarding_progress_v2);
  assert.equal(normalized?.subview, "financial_review");
  assert.equal(normalized?.journey_mode, "money_plan");
});

test("normalizeOnboardingDraftObjects derives fallback money-plan progress from answers when snapshot is missing", () => {
  const draftObjects = normalizeOnboardingDraftObjects(
    {
      envelopes_proposal_v1: {
        selected_envelopes: [{ id: "env-1", name: "Loyer" }],
      },
    },
    {
      answers: {
        E7_lifestyle: "high",
      },
      storedStage: "in_progress",
    }
  );
  const normalized = readOnboardingProgressSnapshot(draftObjects.onboarding_progress_v2, {
    answers: {
      E7_lifestyle: "high",
    },
  });
  assert.equal(normalized?.journey_mode, "money_plan");
  assert.equal(normalized?.step_id, "E11_envelope_setup");
  assert.equal(normalized?.subview, "question");
  assert.equal(hasReachedOnboardingReviewProgress(normalized ?? null), true);
  assert.equal(
    hasReachedOnboardingReviewProgress(normalized ?? null, {
      allowImplicitMoneyPlanQuestions: false,
    }),
    false
  );
});

test("smart settings alone do not infer final money-plan step without prior money-plan progress", () => {
  const draftObjects = normalizeOnboardingDraftObjects(
    {},
    {
      answers: {
        SWP1_last_income_date: "2026-04-01",
        SWP2_last_income_amount: "6000",
      },
      storedStage: "review",
    }
  );
  const normalized = readOnboardingProgressSnapshot(draftObjects.onboarding_progress_v2, {
    answers: {
      SWP1_last_income_date: "2026-04-01",
      SWP2_last_income_amount: "6000",
    },
    storedStage: "review",
  });
  assert.equal(normalized, null);
});

test("legacy money_plan review_context alias is removed when the normalized state is no longer a review screen", () => {
  const normalized = readOnboardingProgressSnapshot(
    {
      current_question_id: "E11_envelope_setup",
      is_ready_screen: true,
      review_context: { screen: "money_plan", legacy: true },
    },
    {
      answers: {
        E7_lifestyle: "high",
      },
    }
  );
  assert.equal(normalized?.step_id, "E12_smart_settings");
  assert.equal(normalized?.subview, "question");
  assert.deepEqual(normalized?.review_context, { legacy: true });
});

test("workflow stage derivation only marks the final pre-apply step as review", () => {
  const onboardingReady = readOnboardingProgressSnapshot({
    journey_mode: "onboarding",
    step_id: "Q3a_housing_status",
    subview: "journey_ready",
  });
  assert.equal(deriveOnboardingWorkflowPhase(onboardingReady), "planning");
  assert.equal(deriveOnboardingRecordStage(onboardingReady), "in_progress");

  const moneyPlanSetup = readOnboardingProgressSnapshot({
    journey_mode: "money_plan",
    step_id: "E12_smart_settings",
    subview: "question",
  }, {
    answers: {
      SWP1_last_income_date: "2026-04-01",
    },
  });
  assert.equal(deriveOnboardingWorkflowPhase(moneyPlanSetup), "planning");
  assert.equal(deriveOnboardingRecordStage(moneyPlanSetup), "in_progress");

  const finalReview = readOnboardingProgressSnapshot({
    journey_mode: "money_plan",
    step_id: "E12_smart_settings",
  }, {
    answers: {
      SWP1_last_income_date: "2026-04-01",
      SWP2_last_income_amount: "6000",
    },
  });
  assert.equal(deriveOnboardingWorkflowPhase(finalReview), "ready_for_apply");
  assert.equal(deriveOnboardingRecordStage(finalReview), "review");
  assert.equal(deriveOnboardingWorkflowPhase(finalReview, "completed", true), "completed");
});
