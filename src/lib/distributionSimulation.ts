/**
 * Client-side preview of how one income is split across envelopes / goals.
 *
 * Mirrors the backend engine (`distribution_engine.build_distribution_plan`,
 * standard path) so the wizard preview matches what `/distribution/apply` will
 * actually do:
 *   1. Fixed rules apply first, in rank order, each capped at the cash left.
 *   2. Percent rules then split the remainder:
 *        - total % > 100 → shares scaled down to fill the whole remainder;
 *        - total % ≤ 100 → shares split that fraction; the rest stays in cash
 *          (it is NOT swept into savings).
 *      The last percent row absorbs the rounding residual.
 *
 * Dependency-free (only `parseDecimalInput` + the mode predicates) so it is unit
 * testable without the API layer.
 */

import { isFixedMode, isPercentMode } from "./distributionMode.ts";
import { parseDecimalInput } from "./parseAmount.ts";

export type DistributionSimRow = {
  name: string;
  mode: string;
  enabled: boolean;
  fixedAmount?: string;
  percent?: string;
  rank?: number;
};

export type SimulationItem = {
  name: string;
  amount: number;
};

export type SimulationPreview = {
  income: number;
  fixedItems: SimulationItem[];
  percentItems: SimulationItem[];
  totalFixedApplied: number;
  remainderAfterFixed: number;
  remainderAfterPercent: number;
  totalPercent: number;
};

const round2 = (value: number) => Number(value.toFixed(2));
const roundHalfUp2 = (value: number) => Math.round(value * 100) / 100;

export const simulateDistribution = (
  rows: DistributionSimRow[],
  income: number,
  baselineFixedItemsInput: Array<{ name: string; amount: number }> = []
): SimulationPreview => {
  const byRank = (left: DistributionSimRow, right: DistributionSimRow) =>
    (left.rank ?? 9999) - (right.rank ?? 9999);
  const activeRows = rows.filter((row) => row.enabled && row.mode !== "none");
  const fixedRows = activeRows.filter((row) => isFixedMode(row.mode)).sort(byRank);
  const percentRows = activeRows.filter((row) => isPercentMode(row.mode)).sort(byRank);

  let remaining = income;
  const fixedItems: SimulationItem[] = [];
  const normalizeName = (value: string) => value.trim().toLowerCase();
  const fixedNameSet = new Set(fixedRows.map((row) => normalizeName(row.name)));
  const baselineFixedItems = baselineFixedItemsInput.filter(
    (item) => item.amount > 0 && !fixedNameSet.has(normalizeName(item.name))
  );

  baselineFixedItems.forEach((item) => {
    if (remaining <= 0) {
      fixedItems.push({ name: item.name, amount: 0 });
      return;
    }
    const applied = Math.min(Math.max(0, item.amount), remaining);
    remaining -= applied;
    fixedItems.push({ name: item.name, amount: applied });
  });

  fixedRows.forEach((row) => {
    if (remaining <= 0) {
      fixedItems.push({ name: row.name, amount: 0 });
      return;
    }
    const amount = Math.max(0, parseDecimalInput(row.fixedAmount));
    const applied = Math.min(amount, remaining);
    remaining -= applied;
    fixedItems.push({ name: row.name, amount: applied });
  });

  const remainderAfterFixed = Math.max(0, remaining);
  const totalPercent = percentRows.reduce(
    (sum, row) => sum + Math.max(0, parseDecimalInput(row.percent)),
    0
  );

  const percentItems: SimulationItem[] = [];
  let remainderAfterPercent = remainderAfterFixed;

  if (remainderAfterFixed > 0 && totalPercent > 0 && percentRows.length > 0) {
    const divisor = totalPercent > 100 ? totalPercent : 100;
    const expectedTotal =
      totalPercent > 100
        ? remainderAfterFixed
        : (remainderAfterFixed * totalPercent) / 100;
    let running = 0;
    percentRows.forEach((row, index) => {
      const rawAmount =
        index === percentRows.length - 1
          ? Math.max(0, expectedTotal - running)
          : remainderAfterFixed * (Math.max(0, parseDecimalInput(row.percent)) / divisor);
      const rounded = round2(rawAmount);
      running = round2(running + rounded);
      percentItems.push({ name: row.name, amount: rounded });
    });
    remainderAfterPercent = round2(Math.max(0, remainderAfterFixed - running));
  }

  return {
    income,
    fixedItems,
    percentItems,
    totalFixedApplied: income - remainderAfterFixed,
    remainderAfterFixed,
    remainderAfterPercent,
    totalPercent: round2(totalPercent),
  };
};

export type PercentRow = {
  mode: string;
  percent?: string;
};

/**
 * Rescale the percent rows so their values sum to exactly 100.00.
 *
 * Each row gets its proportional share rounded to 2 decimals; the cent or two
 * of rounding drift is folded into the largest share, which can always absorb
 * it without going negative or overshooting 100. Non-percent rows are left
 * untouched. Returns the same array reference when there is nothing to do.
 */
export const normalizePercentRows = <T extends PercentRow>(rows: T[]): T[] => {
  const percentRows = rows.filter((row) => isPercentMode(row.mode));
  const total = percentRows.reduce(
    (sum, row) => sum + parseDecimalInput(row.percent),
    0
  );
  if (total <= 0 || percentRows.length === 0) return rows;

  const shares = percentRows.map((row) =>
    roundHalfUp2((parseDecimalInput(row.percent) / total) * 100)
  );

  const drift = roundHalfUp2(100 - shares.reduce((sum, value) => sum + value, 0));
  if (drift !== 0) {
    let largestIndex = 0;
    for (let index = 1; index < shares.length; index += 1) {
      if (shares[index] > shares[largestIndex]) largestIndex = index;
    }
    shares[largestIndex] = roundHalfUp2(Math.max(0, shares[largestIndex] + drift));
  }

  const updated = [...rows];
  percentRows.forEach((row, index) => {
    const rowIndex = updated.indexOf(row);
    updated[rowIndex] = { ...row, percent: shares[index].toFixed(2) };
  });

  return updated;
};
