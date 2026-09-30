import test from "node:test";
import assert from "node:assert/strict";

import {
  PAY_TIMING_SPECS,
  applyPayTimingAnswer,
  getPayTimingLegacyQuestionAliases,
  getPayTimingOptions,
  getPayTimingSpec,
  getPayTimingValueFromLegacyAnswers,
  withPayTimingAnswersFromLegacy,
  type PayTimingAnswers,
} from "./onboardingPayTiming.ts";
import { buildSalaryScheduleProfile } from "./salaryNotifications.ts";

const draft = (value: PayTimingAnswers): PayTimingAnswers => value;

const monthly = getPayTimingSpec("S4_pay_timing_monthly")!;
const weekly = getPayTimingSpec("S4_pay_timing_weekly")!;

test("a fixed day writes the historical keys the schedule and backend read", () => {
  const next = applyPayTimingAnswer(draft({ Q0_income_type: "salaried" }), monthly, "fixed_day:25");
  assert.equal(next.S4_pay_timing_monthly, "fixed_day:25");
  assert.equal(next.S4_date_mode, "fixed_day");
  assert.equal(next.S4a_fixed_day, "25");
  assert.equal("S4b_range" in next, false);
});

test("switching from a fixed day to a range clears the stale day", () => {
  const first = applyPayTimingAnswer(draft({}), monthly, "fixed_day:25");
  const next = applyPayTimingAnswer(first, monthly, "range:1-5");
  assert.equal(next.S4_date_mode, "range");
  assert.equal(next.S4b_range, "1-5");
  assert.equal("S4a_fixed_day" in next, false);
});

test("the merged answer still produces the same salary schedule", () => {
  const base = { Q0_income_type: "salaried", S1_stability: "fixed", S3_frequency: "monthly", S2a_salary_amount: "6500" };
  const merged = buildSalaryScheduleProfile(applyPayTimingAnswer(base, monthly, "fixed_day:28"));
  const legacy = buildSalaryScheduleProfile({ ...base, S4_date_mode: "fixed_day", S4a_fixed_day: "28" });
  assert.deepEqual(merged, legacy);
  assert.equal(merged?.fixedDay, 28);
});

test("every biweekly and weekly choice produces a schedule", () => {
  for (const frequency of ["biweekly", "weekly"] as const) {
    const spec = getPayTimingSpec(`S4_pay_timing_${frequency}`)!;
    for (const option of getPayTimingOptions(spec).options) {
      const answers = applyPayTimingAnswer(
        { Q0_income_type: "salaried", S1_stability: "fixed", S3_frequency: frequency, S2a_salary_amount: "3000" },
        spec,
        option.value
      );
      assert.notEqual(buildSalaryScheduleProfile(answers), null, `${frequency} ${option.value}`);
    }
  }
});

test("drafts saved before the merge are read back as answered", () => {
  const answers = withPayTimingAnswersFromLegacy(draft({
    S4_date_mode: "range",
    S4b_range: "25-30",
    F3_retainer_day_mode: "fixed_day",
    F3a_retainer_fixed_day: "1",
  }));
  assert.equal(answers.S4_pay_timing_monthly, "range:25-30");
  assert.equal(answers.F3_retainer_pay_timing, "fixed_day:1");
});

test("a legacy weekend payday maps onto the same weekday choice", () => {
  const legacy = { S4d_weekly_mode: "weekend", S4d2_weekly_weekend_day: "sat" };
  assert.equal(getPayTimingValueFromLegacyAnswers(legacy, weekly), "fixed_weekday:sat");
});

test("incomplete or unknown legacy values are not treated as answered", () => {
  assert.equal(getPayTimingValueFromLegacyAnswers({ S4_date_mode: "fixed_day" }, monthly), "");
  assert.equal(getPayTimingValueFromLegacyAnswers({ S4_date_mode: "fixed_day", S4a_fixed_day: "17" }, monthly), "");
  const untouched = { S3_frequency: "monthly" };
  assert.equal(withPayTimingAnswersFromLegacy(untouched), untouched);
});

test("an existing merged answer is never overwritten by legacy keys", () => {
  const answers = withPayTimingAnswersFromLegacy({
    S4_pay_timing_monthly: "fixed_day:20",
    S4_date_mode: "range",
    S4b_range: "1-5",
  });
  assert.equal(answers.S4_pay_timing_monthly, "fixed_day:20");
});

test("every historical key points at an existing merged screen", () => {
  const questionIds = new Set(PAY_TIMING_SPECS.map((spec) => spec.questionId));
  const aliases = getPayTimingLegacyQuestionAliases();
  for (const key of ["S4_date_mode", "S4a_fixed_day", "S4d2_weekly_weekend_day", "F3a_retainer_fixed_day", "M2b_monthly_fixed_day"]) {
    assert.ok(questionIds.has(aliases[key]), key);
  }
});
