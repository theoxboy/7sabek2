export type MoneyPlanMode =
  | "debt_relief_first"
  | "balanced_rebuild"
  | "goal_growth_first"
  | "stability_first";

export type SafetyState = "empty" | "building" | "funded";

export type MoneyPlanEngineInput = {
  discretionaryPerCycle: number;
  hasValidGoal: boolean;
  goalPaused?: boolean;
  earliestGoalMonths?: number | null;
  goalBehindSchedule?: boolean;
  hasNoDebt?: boolean;
  incomeVolatile?: boolean;
  highInterestDebt?: boolean;
  safetyState?: SafetyState;
  flexEssentialPerCycle?: number;
  monthRiskScore?: number;
};

export type MoneyPlanModeAllocation = {
  mode: MoneyPlanMode;
  reserve_per_cycle: number;
  reserve_seed_per_cycle: number;
  reserve_extra_per_cycle: number;
  debt_extra_per_cycle: number;
  goal_per_cycle: number;
  goal_seed_per_cycle: number;
  goal_bonus_per_cycle: number;
  living_flex_per_cycle: number;
  flex_essential_per_cycle: number;
  flex_buffer_per_cycle: number;
  confidence_label: "tight" | "comfortable" | "balanced";
};

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

function getModePoolWeights(mode: MoneyPlanMode): {
  debtExtra: number;
  safetyExtra: number;
  goalBonus: number;
} {
  if (mode === "debt_relief_first") {
    return { debtExtra: 65, safetyExtra: 15, goalBonus: 20 };
  }
  if (mode === "stability_first") {
    return { debtExtra: 20, safetyExtra: 60, goalBonus: 20 };
  }
  if (mode === "goal_growth_first") {
    return { debtExtra: 20, safetyExtra: 15, goalBonus: 65 };
  }
  return { debtExtra: 40, safetyExtra: 30, goalBonus: 30 };
}

function normalizeModePoolWeights(weights: {
  debtExtra: number;
  safetyExtra: number;
  goalBonus: number;
}): {
  debtExtra: number;
  safetyExtra: number;
  goalBonus: number;
} {
  const safe = {
    debtExtra: Math.max(0, weights.debtExtra),
    safetyExtra: Math.max(0, weights.safetyExtra),
    goalBonus: Math.max(0, weights.goalBonus),
  };
  const total = safe.debtExtra + safe.safetyExtra + safe.goalBonus;
  if (total <= 0) {
    return { debtExtra: 0.45, safetyExtra: 0.3, goalBonus: 0.25 };
  }
  return {
    debtExtra: safe.debtExtra / total,
    safetyExtra: safe.safetyExtra / total,
    goalBonus: safe.goalBonus / total,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getFlexBufferBaseRatio(riskScore: number): number {
  if (riskScore >= 6) return 0.08;
  if (riskScore >= 3) return 0.06;
  return 0.04;
}

function getFlexBufferModeMultiplier(mode: MoneyPlanMode): number {
  if (mode === "debt_relief_first") return 1;
  if (mode === "stability_first") return 1.1666666667;
  if (mode === "goal_growth_first") return 1;
  return 1.3333333333;
}

function getFlexBufferCapRatio(mode: MoneyPlanMode, riskScore: number): number {
  const base =
    mode === "stability_first"
      ? 0.07
      : mode === "balanced_rebuild"
      ? 0.08
      : 0.06;
  const riskBonus = riskScore >= 6 ? 0.04 : 0;
  return Math.min(0.12, base + riskBonus);
}

function getSafetyCapRatio(mode: MoneyPlanMode, safetyState?: SafetyState): number {
  if (mode === "stability_first") return 0.12;
  if (safetyState === "empty") return 0.12;
  return 0.08;
}

export function computeSafetySeedAmount(options: {
  availableSurplus: number;
  safetyState?: SafetyState;
  riskScore?: number;
}): number {
  const availableSurplus = Math.max(0, roundAmount(options.availableSurplus));
  if (availableSurplus <= 0) return 0;
  const capRatio =
    options.safetyState === "empty" || (options.riskScore ?? 0) >= 6 ? 0.12 : 0.08;
  const capAmount = roundAmount(availableSurplus * capRatio);
  if (options.safetyState === "empty") {
    return roundAmount(
      Math.min(availableSurplus, capAmount, Math.max(75, availableSurplus * 0.06))
    );
  }
  if (options.safetyState === "building") {
    return roundAmount(
      Math.min(availableSurplus, capAmount, Math.max(50, availableSurplus * 0.04))
    );
  }
  return 0;
}

function distributeNoDebtShare(weights: {
  debtExtra: number;
  safetyExtra: number;
  goalBonus: number;
}): {
  debtExtra: number;
  safetyExtra: number;
  goalBonus: number;
} {
  const debtShare = weights.debtExtra;
  return {
    debtExtra: 0,
    safetyExtra: weights.safetyExtra + Math.round(debtShare * 0.4),
    goalBonus: weights.goalBonus + Math.round(debtShare * 0.6),
  };
}

function softenWeightsForContext(
  weights: { debtExtra: number; safetyExtra: number; goalBonus: number },
  options: {
    safetyState?: SafetyState;
    highInterestDebt?: boolean;
    incomeVolatile?: boolean;
    hasFundableGoal: boolean;
    goalBehindSchedule?: boolean;
    earliestGoalMonths?: number | null;
    hasNoDebt?: boolean;
    mode: MoneyPlanMode;
  }
): { debtExtra: number; safetyExtra: number; goalBonus: number } {
  let next = { ...weights };
  if (!options.hasFundableGoal) next.goalBonus = 0;
  if (options.safetyState === "empty") {
    next.safetyExtra += options.mode === "stability_first" ? 5 : 2;
    next.debtExtra = Math.max(0, next.debtExtra - 2);
  } else if (options.safetyState === "funded") {
    next.safetyExtra = Math.max(0, next.safetyExtra - 4);
    next.goalBonus += 2;
    next.debtExtra += 2;
  }
  if (options.goalBehindSchedule && options.hasFundableGoal) {
    next.goalBonus += 4;
  }
  if (
    options.earliestGoalMonths !== null &&
    options.earliestGoalMonths !== undefined &&
    options.earliestGoalMonths <= 6 &&
    options.hasFundableGoal
  ) {
    next.goalBonus += options.earliestGoalMonths <= 3 ? 5 : 3;
    next.safetyExtra = Math.max(10, next.safetyExtra - 1);
  }
  if (options.highInterestDebt) {
    next.debtExtra += 6;
    next.safetyExtra = Math.max(10, next.safetyExtra - 2);
  }
  if (options.incomeVolatile && options.mode !== "stability_first") {
    next.debtExtra = Math.max(0, next.debtExtra - 3);
    next.safetyExtra = Math.max(0, next.safetyExtra - 2);
  }
  if (options.hasNoDebt) {
    next = distributeNoDebtShare(next);
  }
  return next;
}

export function computeGoalSeedAmount(options: {
  availableSurplus: number;
  hasValidGoal: boolean;
  isPaused?: boolean;
  urgentWithinMonths?: number | null;
  behindSchedule?: boolean;
}): number {
  const availableSurplus = Math.max(0, roundAmount(options.availableSurplus));
  if (!options.hasValidGoal || availableSurplus <= 0 || options.isPaused) return 0;
  if (availableSurplus <= 299) {
    return roundAmount(Math.min(availableSurplus, 25));
  }
  let pct =
    availableSurplus <= 999
      ? 0.05
      : availableSurplus <= 2499
      ? 0.07
      : availableSurplus <= 4999
      ? 0.1
      : 0.12;
  if (options.urgentWithinMonths !== null && options.urgentWithinMonths !== undefined) {
    if (options.urgentWithinMonths <= 3) pct += 0.04;
    else if (options.urgentWithinMonths <= 6) pct += 0.02;
  }
  if (options.behindSchedule) pct += 0.03;
  return roundAmount(Math.min(availableSurplus, Math.max(25, availableSurplus * pct)));
}

export function buildMoneyPlanModeAllocations(
  input: MoneyPlanEngineInput
): MoneyPlanModeAllocation[] {
  const discretionaryPerCycle = Math.max(0, roundAmount(input.discretionaryPerCycle));
  const hasFundableGoal = Boolean(input.hasValidGoal) && !input.goalPaused;
  const derivedRiskScore = clamp(
    Math.round(input.monthRiskScore ?? 0) +
      (input.incomeVolatile ? 3 : 0) +
      (input.highInterestDebt ? 2 : 0) +
      (input.safetyState === "empty" ? 2 : input.safetyState === "building" ? 1 : 0),
    0,
    11
  );
  const flexEssentialPerCycle = roundAmount(
    Math.min(discretionaryPerCycle, Math.max(0, input.flexEssentialPerCycle ?? 0))
  );
  const poolAfterFlexEssential = roundAmount(
    Math.max(0, discretionaryPerCycle - flexEssentialPerCycle)
  );
  const goalSeedPerCycle = computeGoalSeedAmount({
    availableSurplus: poolAfterFlexEssential,
    hasValidGoal: hasFundableGoal,
    isPaused: input.goalPaused,
    urgentWithinMonths: input.earliestGoalMonths ?? null,
    behindSchedule: input.goalBehindSchedule,
  });
  const safetySeedPerCycle = computeSafetySeedAmount({
    availableSurplus: Math.max(0, poolAfterFlexEssential - goalSeedPerCycle),
    safetyState: input.safetyState,
    riskScore: derivedRiskScore,
  });

  const modes: MoneyPlanMode[] = [
    "debt_relief_first",
    "balanced_rebuild",
    "goal_growth_first",
    "stability_first",
  ];

  return modes.map((mode) => {
    const weights = softenWeightsForContext(getModePoolWeights(mode), {
      safetyState: input.safetyState,
      highInterestDebt: input.highInterestDebt,
      incomeVolatile: input.incomeVolatile,
      hasFundableGoal,
      goalBehindSchedule: input.goalBehindSchedule,
      earliestGoalMonths: input.earliestGoalMonths,
      hasNoDebt: input.hasNoDebt,
      mode,
    });

    const normalizedWeights = normalizeModePoolWeights(weights);
    const flexBufferBase = roundAmount(
      poolAfterFlexEssential * getFlexBufferBaseRatio(derivedRiskScore)
    );
    const flexBufferPerCycle = roundAmount(
      flexBufferBase * getFlexBufferModeMultiplier(mode)
    );
    const flexBufferCapAmount = roundAmount(
      discretionaryPerCycle * getFlexBufferCapRatio(mode, derivedRiskScore)
    );
    const flexBufferPerCycleCapped = roundAmount(
      Math.min(flexBufferCapAmount, flexBufferPerCycle)
    );
    const livingFlexPerCycle = roundAmount(
      Math.min(discretionaryPerCycle, flexEssentialPerCycle + flexBufferPerCycleCapped)
    );
    const strategicPool = roundAmount(
      Math.max(
        0,
        discretionaryPerCycle - livingFlexPerCycle - goalSeedPerCycle - safetySeedPerCycle
      )
    );
    const reserveExtraPerCycle = roundAmount(
      strategicPool * normalizedWeights.safetyExtra
    );
    const debtExtraPerCycle = roundAmount(
      strategicPool * normalizedWeights.debtExtra
    );
    const goalBonusPerCycle = hasFundableGoal
      ? roundAmount(strategicPool * normalizedWeights.goalBonus)
      : 0;
    const reservePerCycle = roundAmount(safetySeedPerCycle + reserveExtraPerCycle);
    const goalPerCycle = hasFundableGoal
      ? roundAmount(goalSeedPerCycle + goalBonusPerCycle)
      : 0;
    const safetyCapAmount = roundAmount(
      discretionaryPerCycle * getSafetyCapRatio(mode, input.safetyState)
    );
    const reservePerCycleCapped = roundAmount(Math.min(safetyCapAmount, reservePerCycle));
    const safetyOverflow = roundAmount(reservePerCycle - reservePerCycleCapped);
    const debtExtraPerCycleAdjusted = input.hasNoDebt
      ? 0
      : mode === "debt_relief_first"
      ? roundAmount(debtExtraPerCycle + safetyOverflow)
      : mode === "goal_growth_first"
      ? roundAmount(debtExtraPerCycle + safetyOverflow * 0.35)
      : roundAmount(debtExtraPerCycle + safetyOverflow * 0.5);
    const goalPerCycleAdjusted = hasFundableGoal
      ? mode === "goal_growth_first"
        ? roundAmount(goalPerCycle + safetyOverflow * 0.65)
        : roundAmount(goalPerCycle + safetyOverflow * (mode === "balanced_rebuild" ? 0.5 : 0))
      : 0;
    const reserveExtraPerCycleAdjusted = roundAmount(
      Math.max(0, reservePerCycleCapped - safetySeedPerCycle)
    );
    const goalBonusPerCycleAdjusted = roundAmount(
      Math.max(0, goalPerCycleAdjusted - goalSeedPerCycle)
    );
    const allocatedTotal = roundAmount(
      livingFlexPerCycle + reservePerCycleCapped + debtExtraPerCycleAdjusted + goalPerCycleAdjusted
    );
    const leftover = roundAmount(discretionaryPerCycle - allocatedTotal);
    if (leftover !== 0) {
      if (mode === "debt_relief_first") {
        return {
          mode,
          reserve_per_cycle: reservePerCycleCapped,
          reserve_seed_per_cycle: safetySeedPerCycle,
          reserve_extra_per_cycle: reserveExtraPerCycleAdjusted,
          debt_extra_per_cycle: input.hasNoDebt
            ? 0
            : roundAmount(Math.max(0, debtExtraPerCycleAdjusted + leftover)),
          goal_per_cycle: goalPerCycleAdjusted,
          goal_seed_per_cycle: goalSeedPerCycle,
          goal_bonus_per_cycle: goalBonusPerCycleAdjusted,
          living_flex_per_cycle: livingFlexPerCycle,
          flex_essential_per_cycle: flexEssentialPerCycle,
          flex_buffer_per_cycle: flexBufferPerCycleCapped,
          confidence_label: "tight",
        };
      }
      if (mode === "stability_first") {
        const reserveHeadroom = roundAmount(
          Math.max(0, safetyCapAmount - reservePerCycleCapped)
        );
        const reserveGain = roundAmount(
          Math.min(reserveHeadroom, Math.max(0, leftover))
        );
        const remainingLeftover = roundAmount(leftover - reserveGain);
        return {
          mode,
          reserve_per_cycle: roundAmount(Math.max(0, reservePerCycleCapped + reserveGain)),
          reserve_seed_per_cycle: safetySeedPerCycle,
          reserve_extra_per_cycle: roundAmount(
            Math.max(0, roundAmount(Math.max(0, reservePerCycleCapped + reserveGain)) - safetySeedPerCycle)
          ),
          debt_extra_per_cycle: input.hasNoDebt
            ? 0
            : roundAmount(Math.max(0, debtExtraPerCycleAdjusted + remainingLeftover)),
          goal_per_cycle: hasFundableGoal
            ? roundAmount(
                Math.max(
                  0,
                  goalPerCycleAdjusted +
                    (input.hasNoDebt ? remainingLeftover : 0)
                )
              )
            : 0,
          goal_seed_per_cycle: goalSeedPerCycle,
          goal_bonus_per_cycle: hasFundableGoal
            ? roundAmount(
                Math.max(
                  0,
                  roundAmount(
                    goalPerCycleAdjusted + (input.hasNoDebt ? remainingLeftover : 0)
                  ) - goalSeedPerCycle
                )
              )
            : 0,
          living_flex_per_cycle: livingFlexPerCycle,
          flex_essential_per_cycle: flexEssentialPerCycle,
          flex_buffer_per_cycle: flexBufferPerCycleCapped,
          confidence_label: "comfortable",
        };
      }
      if (mode === "goal_growth_first") {
        return {
          mode,
          reserve_per_cycle: reservePerCycleCapped,
          reserve_seed_per_cycle: safetySeedPerCycle,
          reserve_extra_per_cycle: reserveExtraPerCycleAdjusted,
          debt_extra_per_cycle: input.hasNoDebt ? 0 : debtExtraPerCycleAdjusted,
          goal_per_cycle: hasFundableGoal
            ? roundAmount(Math.max(0, goalPerCycleAdjusted + leftover))
            : 0,
          goal_seed_per_cycle: goalSeedPerCycle,
          goal_bonus_per_cycle: hasFundableGoal
            ? roundAmount(Math.max(0, roundAmount(goalPerCycleAdjusted + leftover) - goalSeedPerCycle))
            : 0,
          living_flex_per_cycle: livingFlexPerCycle,
          flex_essential_per_cycle: flexEssentialPerCycle,
          flex_buffer_per_cycle: flexBufferPerCycleCapped,
          confidence_label: "balanced",
        };
      }
      const reserveHeadroom = roundAmount(
        Math.max(0, safetyCapAmount - reservePerCycleCapped)
      );
      const reserveRequested = roundAmount(Math.max(0, leftover * 0.3));
      const reserveGain = roundAmount(Math.min(reserveHeadroom, reserveRequested));
      const reserveOverflow = roundAmount(reserveRequested - reserveGain);
      const debtCarry = roundAmount(leftover * 0.45 + reserveOverflow * 0.6);
      const goalCarry = roundAmount(leftover * 0.25 + reserveOverflow * 0.4);
      return {
        mode,
        reserve_per_cycle: roundAmount(Math.max(0, reservePerCycleCapped + reserveGain)),
        reserve_seed_per_cycle: safetySeedPerCycle,
        reserve_extra_per_cycle: roundAmount(
          Math.max(0, roundAmount(Math.max(0, reservePerCycleCapped + reserveGain)) - safetySeedPerCycle)
        ),
        debt_extra_per_cycle: input.hasNoDebt
          ? 0
          : roundAmount(Math.max(0, debtExtraPerCycleAdjusted + debtCarry)),
        goal_per_cycle: hasFundableGoal
          ? roundAmount(
              Math.max(
                0,
                goalPerCycleAdjusted + goalCarry + (input.hasNoDebt ? debtCarry : 0)
              )
            )
          : 0,
        goal_seed_per_cycle: goalSeedPerCycle,
        goal_bonus_per_cycle: hasFundableGoal
          ? roundAmount(
              Math.max(
                0,
                roundAmount(
                  goalPerCycleAdjusted + goalCarry + (input.hasNoDebt ? debtCarry : 0)
                ) - goalSeedPerCycle
              )
            )
          : 0,
        living_flex_per_cycle: livingFlexPerCycle,
        flex_essential_per_cycle: flexEssentialPerCycle,
        flex_buffer_per_cycle: flexBufferPerCycleCapped,
        confidence_label: "balanced",
      };
    }

    return {
      mode,
      reserve_per_cycle: reservePerCycleCapped,
      reserve_seed_per_cycle: safetySeedPerCycle,
      reserve_extra_per_cycle: reserveExtraPerCycleAdjusted,
      debt_extra_per_cycle: input.hasNoDebt ? 0 : debtExtraPerCycleAdjusted,
      goal_per_cycle: hasFundableGoal ? goalPerCycleAdjusted : 0,
      goal_seed_per_cycle: goalSeedPerCycle,
      goal_bonus_per_cycle: goalBonusPerCycleAdjusted,
      living_flex_per_cycle: livingFlexPerCycle,
      flex_essential_per_cycle: flexEssentialPerCycle,
      flex_buffer_per_cycle: flexBufferPerCycleCapped,
      confidence_label:
        mode === "debt_relief_first"
          ? "tight"
          : mode === "stability_first"
            ? "comfortable"
            : "balanced",
    };
  });
}
