import test from "node:test";
import assert from "node:assert/strict";

const mem = new Map<string, string>();
(globalThis as { window?: unknown }).window = {
  localStorage: {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
};

const { markDiscoveryWelcomeSeen, hasSeenDiscoveryWelcome, shouldShowDiscoveryWelcome } =
  await import("./guestWelcome.ts");

const guest = { is_guest: true, claimed_at: null, recovery_code_ack: false };

test("a brand-new guest must walk through it", () => {
  mem.clear();
  assert.equal(hasSeenDiscoveryWelcome(), false);
  assert.equal(shouldShowDiscoveryWelcome(guest), true);
});

test("after 'seen' it does not re-trigger immediately", () => {
  mem.clear();
  markDiscoveryWelcomeSeen();
  assert.equal(hasSeenDiscoveryWelcome(), true);
  assert.equal(shouldShowDiscoveryWelcome(guest), false);
});

test("an unsecured guest is re-nudged after 3 days", () => {
  mem.clear();
  mem.set("7sabek.guest.decouverte_seen_at", String(Date.now() - 4 * 86_400_000));
  assert.equal(shouldShowDiscoveryWelcome(guest), true);
  // …but not a guest who acknowledged their code
  assert.equal(
    shouldShowDiscoveryWelcome({ ...guest, recovery_code_ack: true }),
    false
  );
});

test("never for members or claimed guests", () => {
  mem.clear();
  assert.equal(shouldShowDiscoveryWelcome({ is_guest: false }), false);
  assert.equal(
    shouldShowDiscoveryWelcome({ is_guest: true, claimed_at: "2026-09-07T00:00:00Z" }),
    false
  );
});
