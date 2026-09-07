import test from "node:test";
import assert from "node:assert/strict";

// jsdom-free: stub sessionStorage on globalThis before importing the module.
const mem = new Map<string, string>();
(globalThis as { window?: unknown }).window = {
  sessionStorage: {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
};

const { markDiscoveryWelcomeSeen, hasSeenDiscoveryWelcome, shouldShowDiscoveryWelcome } =
  await import("./guestWelcome.ts");

test("seen flag round-trips", () => {
  mem.clear();
  assert.equal(hasSeenDiscoveryWelcome(), false);
  markDiscoveryWelcomeSeen();
  assert.equal(hasSeenDiscoveryWelcome(), true);
});

test("shouldShow: fresh guest yes, then no after 'seen'", () => {
  mem.clear();
  const guest = { is_guest: true, claimed_at: null, recovery_code_ack: false };
  assert.equal(shouldShowDiscoveryWelcome(guest), true);
  markDiscoveryWelcomeSeen();
  assert.equal(shouldShowDiscoveryWelcome(guest), false);
});

test("shouldShow: never for members, claimed guests, or acked guests", () => {
  mem.clear();
  assert.equal(shouldShowDiscoveryWelcome({ is_guest: false }), false);
  assert.equal(
    shouldShowDiscoveryWelcome({ is_guest: true, claimed_at: "2026-09-07T00:00:00Z" }),
    false
  );
  assert.equal(
    shouldShowDiscoveryWelcome({ is_guest: true, recovery_code_ack: true }),
    false
  );
});
