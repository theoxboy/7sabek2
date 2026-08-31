import test from "node:test";
import assert from "node:assert/strict";

import { parseAmountInput, parseDecimalInput } from "./parseAmount.ts";

test("plain integers and decimals", () => {
  assert.equal(parseDecimalInput("1234"), 1234);
  assert.equal(parseDecimalInput("12.5"), 12.5);
  assert.equal(parseDecimalInput("0.01"), 0.01);
  assert.equal(parseDecimalInput("100.00"), 100);
});

test("comma as decimal separator", () => {
  assert.equal(parseDecimalInput("12,5"), 12.5);
  assert.equal(parseDecimalInput("0,25"), 0.25);
});

test("thousands separators are ignored, last separator is the decimal point", () => {
  assert.equal(parseDecimalInput("1,234.56"), 1234.56);
  assert.equal(parseDecimalInput("1.234,56"), 1234.56);
  assert.equal(parseDecimalInput("1 234,56"), 1234.56);
  assert.equal(parseDecimalInput("1 234 567,89"), 1234567.89);
});

test("surrounding whitespace and currency-ish noise", () => {
  assert.equal(parseDecimalInput("  42  "), 42);
  assert.equal(parseDecimalInput("12abc"), 12);
  assert.equal(parseDecimalInput("12.3abc"), 12.3);
});

test("negatives", () => {
  assert.equal(parseDecimalInput("-3.5"), -3.5);
  assert.equal(parseDecimalInput("-1,25"), -1.25);
});

test("empty / non-numeric / nullish yields 0, never NaN", () => {
  for (const value of ["", "   ", "abc", ".", ",", "-", null, undefined]) {
    const result = parseDecimalInput(value as string);
    assert.equal(Number.isNaN(result), false, `NaN for ${JSON.stringify(value)}`);
    assert.equal(result, 0, `expected 0 for ${JSON.stringify(value)}`);
  }
});

test("number input passes through, non-finite becomes 0", () => {
  assert.equal(parseDecimalInput(12.5), 12.5);
  assert.equal(parseDecimalInput(0), 0);
  assert.equal(parseDecimalInput(Number.NaN), 0);
  assert.equal(parseDecimalInput(Number.POSITIVE_INFINITY), 0);
});

test("regression: multi-separator input no longer collapses to 0", () => {
  // Old behaviour replaced only the first comma, so "3,000.50" -> "3.000.50" -> NaN -> 0.
  assert.equal(parseDecimalInput("3,000.50"), 3000.5);
});

test("parseDecimalInput folds Eastern-Arabic digits", () => {
  assert.equal(parseDecimalInput("٥٠"), 50);
  assert.equal(parseDecimalInput("١٢,٥"), 12.5);
});

test("parseAmountInput: positive amounts, both separators", () => {
  assert.equal(parseAmountInput("1234"), 1234);
  assert.equal(parseAmountInput("12,50"), 12.5);
  assert.equal(parseAmountInput("12.50"), 12.5);
  assert.equal(parseAmountInput("1 234,56"), 1234.56);
  assert.equal(parseAmountInput("1,234.56"), 1234.56);
  assert.equal(parseAmountInput("٥٠٠"), 500);
});

test("parseAmountInput: 3 trailing digits read as a thousands separator", () => {
  assert.equal(parseAmountInput("1.234"), 1234);
  assert.equal(parseAmountInput("1,234"), 1234);
  assert.equal(parseAmountInput("12.500"), 12500);
});

test("parseAmountInput: null for empty, non-numeric, or non-positive", () => {
  for (const value of ["", "   ", "abc", "0", "-5", "."]) {
    assert.equal(parseAmountInput(value), null, `expected null for ${JSON.stringify(value)}`);
  }
});
