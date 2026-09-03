import test from "node:test";
import assert from "node:assert/strict";

import {
  GUEST_LIMITS,
  GUEST_STARTER_ENVELOPE_COUNT,
  checkAdvisorQuota,
  checkEnvelopeQuota,
  guestFeatureAccess,
  protectionLevelCopyKey,
  resolveProtectionLevel,
} from "./guestQuota.ts";

test("envelope quota: 20 is the ceiling, 5 is only the starting point", () => {
  assert.equal(GUEST_LIMITS.envelopes, 20);
  assert.equal(GUEST_STARTER_ENVELOPE_COUNT, 5);

  assert.deepEqual(checkEnvelopeQuota(0), { allowed: true, remaining: 20, limit: 20 });
  assert.deepEqual(checkEnvelopeQuota(5), { allowed: true, remaining: 15, limit: 20 });
  assert.deepEqual(checkEnvelopeQuota(19), { allowed: true, remaining: 1, limit: 20 });
  assert.deepEqual(checkEnvelopeQuota(20), { allowed: false, remaining: 0, limit: 20 });
  assert.deepEqual(checkEnvelopeQuota(23), { allowed: false, remaining: 0, limit: 20 });
});

test("advisor quota: 3 exchanges, then the wall", () => {
  assert.equal(GUEST_LIMITS.advisorExchanges, 3);
  assert.equal(checkAdvisorQuota(0).allowed, true);
  assert.equal(checkAdvisorQuota(2).allowed, true);
  assert.equal(checkAdvisorQuota(3).allowed, false);
  assert.equal(checkAdvisorQuota(3).remaining, 0);
});

test("quota checks never return NaN or negative remaining for junk input", () => {
  for (const value of [null, undefined, -4, Number.NaN, Infinity, 2.7]) {
    const check = checkEnvelopeQuota(value as number);
    assert.equal(Number.isNaN(check.remaining), false, `NaN for ${String(value)}`);
    assert.ok(check.remaining >= 0, `negative for ${String(value)}`);
    assert.equal(typeof check.allowed, "boolean");
  }
});

test("protection level is derived purely from durability state", () => {
  assert.equal(resolveProtectionLevel({}), 40);
  assert.equal(resolveProtectionLevel({ hasRecoveryCode: true }), 70);
  assert.equal(resolveProtectionLevel({ hasAccount: true }), 100);
  // account beats recovery code
  assert.equal(
    resolveProtectionLevel({ hasRecoveryCode: true, hasAccount: true }),
    100
  );
  // nullish is treated as absent
  assert.equal(resolveProtectionLevel({ hasRecoveryCode: null, hasAccount: null }), 40);
});

test("every protection level has a distinct copy key", () => {
  const keys = new Set(
    ([40, 70, 100] as const).map((level) => protectionLevelCopyKey(level))
  );
  assert.equal(keys.size, 3);
});

test("feature gates: the money-in path is never walled", () => {
  assert.equal(guestFeatureAccess("transactions"), "open");
  assert.equal(guestFeatureAccess("envelopes"), "open");
  assert.equal(guestFeatureAccess("monthly-budget"), "open");
});

test("feature gates: conversion arguments stay visible as soft walls", () => {
  assert.equal(guestFeatureAccess("reports"), "soft-wall");
  assert.equal(guestFeatureAccess("goals"), "soft-wall");
  assert.equal(guestFeatureAccess("history-past-months"), "soft-wall");
});

test("feature gates: dead-end features are hidden, not greyed", () => {
  assert.equal(guestFeatureAccess("rules"), "hidden");
  assert.equal(guestFeatureAccess("notifications"), "hidden");
  assert.equal(guestFeatureAccess("leaderboard"), "hidden");
  assert.equal(guestFeatureAccess("profile"), "hidden");
});

test("feature gates: unknown key fails open so the UI never dead-locks", () => {
  assert.equal(guestFeatureAccess("some-future-feature"), "open");
});
