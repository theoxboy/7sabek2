import test from "node:test";
import assert from "node:assert/strict";

import {
  simulateDistribution,
  normalizePercentRows,
  type DistributionSimRow,
} from "./distributionSimulation.ts";

const fixedRow = (name: string, amount: string, rank: number): DistributionSimRow => ({
  name,
  mode: "fixed",
  enabled: true,
  fixedAmount: amount,
  rank,
});

const percentRow = (name: string, percent: string, rank: number): DistributionSimRow => ({
  name,
  mode: "percent",
  enabled: true,
  percent,
  rank,
});

test("fixed rules apply in rank order, each capped at the cash left", () => {
  const result = simulateDistribution(
    [fixedRow("Y", "400", 2), fixedRow("X", "300", 1)],
    500
  );
  assert.deepEqual(result.fixedItems, [
    { name: "X", amount: 300 },
    { name: "Y", amount: 200 },
  ]);
  assert.equal(result.remainderAfterFixed, 0);
  assert.equal(result.totalFixedApplied, 500);
});

test("fixed rules past the cash line get 0", () => {
  const result = simulateDistribution(
    [fixedRow("A", "600", 1), fixedRow("B", "600", 2)],
    500
  );
  assert.deepEqual(result.fixedItems, [
    { name: "A", amount: 500 },
    { name: "B", amount: 0 },
  ]);
});

test("percent total = 100 splits the whole remainder, last row absorbs the residual", () => {
  const result = simulateDistribution(
    [percentRow("Food", "60", 1), percentRow("Fun", "40", 2)],
    1000
  );
  assert.deepEqual(result.percentItems, [
    { name: "Food", amount: 600 },
    { name: "Fun", amount: 400 },
  ]);
  assert.equal(result.remainderAfterPercent, 0);
  assert.equal(result.totalPercent, 100);
});

test("percent total < 100 splits that fraction, the rest stays in cash", () => {
  // Matches backend test_income_distribution_percent_under_100_multi_rules.
  const result = simulateDistribution(
    [
      percentRow("Food", "10", 1),
      percentRow("Savings", "30", 2),
      percentRow("Fun", "10", 3),
    ],
    1000
  );
  assert.deepEqual(result.percentItems, [
    { name: "Food", amount: 100 },
    { name: "Savings", amount: 300 },
    { name: "Fun", amount: 100 },
  ]);
  assert.equal(result.remainderAfterPercent, 500);
});

test("percent total > 100 is scaled down to fill the remainder exactly", () => {
  const result = simulateDistribution(
    [percentRow("A", "80", 1), percentRow("B", "50", 2)],
    1000
  );
  assert.equal(result.percentItems[0].amount, 615.38);
  assert.equal(result.percentItems[1].amount, 384.62);
  assert.equal(
    result.percentItems[0].amount + result.percentItems[1].amount,
    1000
  );
  assert.equal(result.remainderAfterPercent, 0);
});

test("fixed then percent: percent works off the post-fixed remainder", () => {
  const result = simulateDistribution(
    [fixedRow("Rent", "300", 1), percentRow("A", "50", 2), percentRow("B", "50", 3)],
    1000
  );
  assert.deepEqual(result.fixedItems, [{ name: "Rent", amount: 300 }]);
  assert.equal(result.remainderAfterFixed, 700);
  assert.deepEqual(result.percentItems, [
    { name: "A", amount: 350 },
    { name: "B", amount: 350 },
  ]);
});

test("baseline fixed items apply before the rows and dedupe by name", () => {
  const applied = simulateDistribution(
    [fixedRow("Assurance", "200", 1)],
    1000,
    [{ name: "Loyer", amount: 400 }]
  );
  assert.deepEqual(applied.fixedItems, [
    { name: "Loyer", amount: 400 },
    { name: "Assurance", amount: 200 },
  ]);
  assert.equal(applied.remainderAfterFixed, 400);

  const deduped = simulateDistribution(
    [fixedRow("Assurance", "200", 1)],
    1000,
    [{ name: "  assurance ", amount: 400 }]
  );
  assert.deepEqual(deduped.fixedItems, [{ name: "Assurance", amount: 200 }]);
});

test("disabled and none rows are ignored", () => {
  const result = simulateDistribution(
    [
      { name: "Off", mode: "percent", enabled: false, percent: "50" },
      { name: "None", mode: "none", enabled: true },
      percentRow("On", "100", 1),
    ],
    500
  );
  assert.deepEqual(result.percentItems, [{ name: "On", amount: 500 }]);
});

test("zero income produces an all-zero preview", () => {
  const result = simulateDistribution([percentRow("A", "100", 1)], 0);
  assert.equal(result.remainderAfterFixed, 0);
  assert.deepEqual(result.percentItems, []);
});

test("comma decimals in row values are parsed", () => {
  const result = simulateDistribution([fixedRow("A", "199,99", 1)], 1000);
  assert.equal(result.fixedItems[0].amount, 199.99);
});

// --- normalizePercentRows ---

test("normalizePercentRows rescales to exactly 100 and folds drift into the largest", () => {
  const rows = [
    { mode: "percent", percent: "20" },
    { mode: "percent", percent: "20" },
    { mode: "percent", percent: "20" },
  ];
  const out = normalizePercentRows(rows);
  assert.deepEqual(
    out.map((r) => r.percent),
    ["33.34", "33.33", "33.33"]
  );
  assert.equal(
    Number(out.reduce((s, r) => s + Number(r.percent), 0).toFixed(2)),
    100
  );
});

test("normalizePercentRows leaves non-percent rows untouched", () => {
  const rows = [
    { mode: "fixed", percent: undefined },
    { mode: "percent", percent: "50" },
  ];
  const out = normalizePercentRows(rows);
  assert.equal(out[0].percent, undefined);
  assert.equal(out[1].percent, "100.00");
});

test("normalizePercentRows returns the same array when there is nothing to scale", () => {
  const rows = [{ mode: "percent", percent: "0" }];
  assert.equal(normalizePercentRows(rows), rows);
});

test("normalizePercentRows never produces a negative or >100 share", () => {
  const rows = Array.from({ length: 21 }, (_, i) => ({
    mode: "percent",
    percent: i === 20 ? "0.01" : "5",
  }));
  const out = normalizePercentRows(rows);
  const values = out.map((r) => Number(r.percent));
  assert.equal(values.some((v) => v < 0), false);
  assert.equal(values.some((v) => v > 100), false);
  // Float addition of 21 two-decimal strings drifts by ~1e-14; round like the
  // production percent-total check does.
  assert.equal(Number(values.reduce((s, v) => s + v, 0).toFixed(2)), 100);
});
