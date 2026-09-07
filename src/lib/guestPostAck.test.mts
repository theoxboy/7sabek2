import test from "node:test";
import assert from "node:assert/strict";

import {
  POST_ACK_FLAG,
  armPostAckPrompt,
  consumePostAckFlag,
  shouldOpenPostAckPrompt,
} from "./guestPostAck.ts";

function memoryStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    _map: m,
  };
}

test("arm then consume returns true exactly once", () => {
  const s = memoryStore();
  armPostAckPrompt(s);
  assert.equal(s.getItem(POST_ACK_FLAG), "1");

  assert.equal(consumePostAckFlag(s), true);
  assert.equal(consumePostAckFlag(s), false); // already cleared
  assert.equal(consumePostAckFlag(s), false); // and stays cleared
  assert.equal(s.getItem(POST_ACK_FLAG), null);
});

test("consume without arm returns false and touches nothing", () => {
  const s = memoryStore();
  assert.equal(consumePostAckFlag(s), false);
  assert.equal(s._map.size, 0);
});

test("a stale value that isn't exactly \"1\" is ignored", () => {
  const s = memoryStore();
  s.setItem(POST_ACK_FLAG, "true");
  assert.equal(consumePostAckFlag(s), false);
});

test("storage that throws never breaks the caller", () => {
  const boom = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };
  assert.doesNotThrow(() => armPostAckPrompt(boom));
  assert.equal(consumePostAckFlag(boom), false);
});

test("null store (SSR / no window) is safe", () => {
  assert.doesNotThrow(() => armPostAckPrompt(null));
  assert.equal(consumePostAckFlag(null), false);
});

test("shouldOpenPostAckPrompt gates on the flag and an un-claimed guest", () => {
  assert.equal(shouldOpenPostAckPrompt(true, { is_guest: true, claimed_at: null }), true);
  // flag not consumed
  assert.equal(shouldOpenPostAckPrompt(false, { is_guest: true }), false);
  // not a guest
  assert.equal(shouldOpenPostAckPrompt(true, { is_guest: false }), false);
  // guest who already claimed (e.g. in another tab)
  assert.equal(
    shouldOpenPostAckPrompt(true, { is_guest: true, claimed_at: "2026-09-07T10:00:00Z" }),
    false
  );
});
