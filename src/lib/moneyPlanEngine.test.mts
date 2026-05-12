import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMoneyPlanModeAllocations,
  computeGoalSeedAmount,
  computeSafetySeedAmount,
} from "./moneyPlanEngine.ts";

function getModeMap(input: Parameters<typeof buildMoneyPlanModeAllocations>[0]) {
  const allocations = buildMoneyPlanModeAllocations(input);
  return Object.fromEntries(allocations.map((item) => [item.mode, item]));
}

test("critical invariants: debt/safety/goal/balanced are distinct", () => {
  const modes = getModeMap({
    discretionaryPerCycle: 5465,
    hasValidGoal: true,
    earliestGoalMonths: 5,
    goalBehindSchedule: false,
    hasNoDebt: false,
    incomeVolatile: false,
    safetyState: "building",
  });

  assert.ok(
    modes.debt_relief_first.debt_extra_per_cycle >
      modes.balanced_rebuild.debt_extra_per_cycle
  );
  assert.ok(
    modes.stability_first.reserve_per_cycle >
      modes.balanced_rebuild.reserve_per_cycle
  );
  assert.ok(modes.goal_growth_first.goal_per_cycle > 0);
  assert.ok(
    modes.goal_growth_first.goal_per_cycle > modes.balanced_rebuild.goal_per_cycle
  );
  assert.notDeepEqual(modes.balanced_rebuild, modes.debt_relief_first);
  assert.notDeepEqual(modes.balanced_rebuild, modes.stability_first);
  assert.notDeepEqual(modes.balanced_rebuild, modes.goal_growth_first);
});

test("no goal keeps goal funding at zero in every mode", () => {
  const modes = buildMoneyPlanModeAllocations({
    discretionaryPerCycle: 2400,
    hasValidGoal: false,
    hasNoDebt: false,
    incomeVolatile: false,
  });
  for (const mode of modes) {
    assert.equal(mode.goal_per_cycle, 0);
  }
});

test("paused goal keeps goal funding at zero in every mode", () => {
  const modes = buildMoneyPlanModeAllocations({
    discretionaryPerCycle: 2400,
    hasValidGoal: true,
    goalPaused: true,
    hasNoDebt: false,
    incomeVolatile: false,
  });
  for (const mode of modes) {
    assert.equal(mode.goal_per_cycle, 0);
  }
});

test("surplus <= 0 produces no strategic allocation", () => {
  const modes = buildMoneyPlanModeAllocations({
    discretionaryPerCycle: 0,
    hasValidGoal: true,
  });
  for (const mode of modes) {
    assert.equal(mode.goal_per_cycle, 0);
    assert.equal(mode.reserve_per_cycle, 0);
    assert.equal(mode.debt_extra_per_cycle, 0);
    assert.equal(mode.living_flex_per_cycle, 0);
  }
});

test("small surplus still gives a universal goal seed when goal exists", () => {
  const seed = computeGoalSeedAmount({
    availableSurplus: 120,
    hasValidGoal: true,
  });
  assert.equal(seed, 25);

  const modes = getModeMap({
    discretionaryPerCycle: 120,
    hasValidGoal: true,
  });
  assert.ok(modes.debt_relief_first.goal_per_cycle > 0);
  assert.ok(modes.stability_first.goal_per_cycle > 0);
  assert.ok(modes.goal_growth_first.goal_per_cycle > 0);
  assert.ok(modes.balanced_rebuild.goal_per_cycle > 0);
});

test("no debt redistributes debt share away from debt bucket", () => {
  const modes = getModeMap({
    discretionaryPerCycle: 3000,
    hasValidGoal: true,
    hasNoDebt: true,
  });
  for (const mode of Object.values(modes)) {
    assert.equal(mode.debt_extra_per_cycle, 0);
  }
});

test("urgent or behind-schedule goal boosts goal mode above balanced", () => {
  const normal = getModeMap({
    discretionaryPerCycle: 3000,
    hasValidGoal: true,
    earliestGoalMonths: 12,
    goalBehindSchedule: false,
  });
  const urgent = getModeMap({
    discretionaryPerCycle: 3000,
    hasValidGoal: true,
    earliestGoalMonths: 3,
    goalBehindSchedule: true,
  });

  assert.ok(
    urgent.goal_growth_first.goal_per_cycle >
      normal.goal_growth_first.goal_per_cycle
  );
  assert.ok(
    urgent.balanced_rebuild.goal_per_cycle >
      normal.balanced_rebuild.goal_per_cycle
  );
});

test("income volatility favors flex over the stable case", () => {
  const stable = getModeMap({
    discretionaryPerCycle: 3000,
    hasValidGoal: true,
    incomeVolatile: false,
  });
  const volatile = getModeMap({
    discretionaryPerCycle: 3000,
    hasValidGoal: true,
    incomeVolatile: true,
  });

  assert.ok(
    volatile.balanced_rebuild.living_flex_per_cycle >
      stable.balanced_rebuild.living_flex_per_cycle
  );
});

test("empty safety pushes reserve above funded safety case", () => {
  const empty = getModeMap({
    discretionaryPerCycle: 3000,
    hasValidGoal: true,
    safetyState: "empty",
  });
  const funded = getModeMap({
    discretionaryPerCycle: 3000,
    hasValidGoal: true,
    safetyState: "funded",
  });

  assert.ok(
    empty.balanced_rebuild.reserve_per_cycle >
      funded.balanced_rebuild.reserve_per_cycle
  );
});

test("debt-first keeps flex under its cap and above balanced debt", () => {
  const pool = 5465;
  const modes = getModeMap({
    discretionaryPerCycle: pool,
    hasValidGoal: true,
    safetyState: "building",
    flexEssentialPerCycle: 1000,
    monthRiskScore: 4,
  });

  assert.ok(modes.debt_relief_first.debt_extra_per_cycle > modes.balanced_rebuild.debt_extra_per_cycle);
  assert.ok(modes.debt_relief_first.living_flex_per_cycle <= pool * 0.3);
});

test("goal-first keeps goal above balanced and above safety in a normal month", () => {
  const modes = getModeMap({
    discretionaryPerCycle: 5465,
    hasValidGoal: true,
    safetyState: "building",
    flexEssentialPerCycle: 1000,
    monthRiskScore: 4,
  });

  assert.ok(modes.goal_growth_first.goal_per_cycle > modes.balanced_rebuild.goal_per_cycle);
  assert.ok(modes.goal_growth_first.goal_per_cycle > modes.goal_growth_first.reserve_per_cycle);
});

test("safety-first keeps reserve above flex in a normal month", () => {
  const modes = getModeMap({
    discretionaryPerCycle: 5465,
    hasValidGoal: true,
    safetyState: "building",
    flexEssentialPerCycle: 1000,
    monthRiskScore: 4,
  });

  assert.ok(modes.stability_first.reserve_per_cycle > modes.balanced_rebuild.reserve_per_cycle);
  assert.ok(modes.stability_first.reserve_per_cycle <= 5465 * 0.12);
});

test("normal month keeps flex buffer and safety seed under the 8% guardrail", () => {
  const pool = 5465;
  const flexEssential = 1000;
  const modes = getModeMap({
    discretionaryPerCycle: pool,
    hasValidGoal: true,
    safetyState: "building",
    flexEssentialPerCycle: flexEssential,
    monthRiskScore: 4,
  });

  const flexBufferDebt = modes.debt_relief_first.living_flex_per_cycle - flexEssential;
  const flexBufferBalanced = modes.balanced_rebuild.living_flex_per_cycle - flexEssential;
  const safetySeed = computeSafetySeedAmount({
    availableSurplus: pool - flexEssential - computeGoalSeedAmount({ availableSurplus: pool - flexEssential, hasValidGoal: true }),
    safetyState: "building",
    riskScore: 4,
  });

  assert.ok(flexBufferDebt <= pool * 0.08);
  assert.ok(flexBufferBalanced <= pool * 0.08);
  assert.ok(safetySeed <= pool * 0.08);
});

test("high-risk month can stretch flex buffer and safety seed up to 12%", () => {
  const pool = 5465;
  const flexEssential = 1000;
  const modes = getModeMap({
    discretionaryPerCycle: pool,
    hasValidGoal: true,
    safetyState: "empty",
    incomeVolatile: true,
    flexEssentialPerCycle: flexEssential,
    monthRiskScore: 8,
  });

  const flexBufferBalanced = modes.balanced_rebuild.living_flex_per_cycle - flexEssential;
  const safetySeed = computeSafetySeedAmount({
    availableSurplus: pool - flexEssential - computeGoalSeedAmount({ availableSurplus: pool - flexEssential, hasValidGoal: true }),
    safetyState: "empty",
    riskScore: 8,
  });

  assert.ok(flexBufferBalanced <= pool * 0.12);
  assert.ok(safetySeed <= pool * 0.12);
  assert.ok(modes.stability_first.reserve_per_cycle <= pool * 0.12);
});
