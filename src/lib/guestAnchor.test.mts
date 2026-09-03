import test from "node:test";
import assert from "node:assert/strict";

/**
 * `guestAnchor.ts` captures `typeof window` at import time, so the browser
 * globals have to exist *before* the module is imported. Each test builds a
 * fresh fake environment and imports the module through a cache-busting query
 * string so state never leaks between cases.
 */

type MemoryStorage = {
  store: Map<string, string>;
  throwOnGet?: boolean;
  throwOnSet?: boolean;
};

function makeStorage(opts: Partial<MemoryStorage> = {}) {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      if (opts.throwOnGet) throw new Error("blocked");
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      if (opts.throwOnSet) throw new Error("quota");
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    _store: store,
  };
}

function makeLocks() {
  let chain: Promise<unknown> = Promise.resolve();
  return {
    calls: [] as string[],
    request(name: string, _opts: unknown, fn: () => Promise<unknown>) {
      const run = chain.then(() => fn());
      chain = run.catch(() => undefined);
      return run;
    },
  };
}

async function loadModule(env: {
  localStorage?: ReturnType<typeof makeStorage>;
  locks?: ReturnType<typeof makeLocks>;
}) {
  const ls = env.localStorage ?? makeStorage();
  const def = (key: string, value: unknown) =>
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  def("window", { localStorage: ls });
  def("localStorage", ls);
  def("navigator", env.locks ? { locks: env.locks } : {});
  def("indexedDB", undefined);
  // cache-bust so each test gets a clean module instance
  return import(`./guestAnchor.ts?t=${Math.random()}`);
}

test("resolveAnchorToken: localStorage value wins and is returned trimmed", async () => {
  const ls = makeStorage();
  ls.setItem("7sabek.guest.token", "  tok_abc  ");
  const mod = await loadModule({ localStorage: ls });
  assert.equal(await mod.resolveAnchorToken(), "tok_abc");
});

test("resolveAnchorToken: returns null for a genuine first visitor", async () => {
  const mod = await loadModule({ localStorage: makeStorage() });
  assert.equal(await mod.resolveAnchorToken(), null);
});

test("resolveAnchorToken: a throwing localStorage degrades to null, never throws", async () => {
  const mod = await loadModule({ localStorage: makeStorage({ throwOnGet: true }) });
  assert.equal(await mod.resolveAnchorToken(), null);
});

test("persistAnchorToken: a throwing localStorage is reported, not fatal", async () => {
  const mod = await loadModule({ localStorage: makeStorage({ throwOnSet: true }) });
  const result = await mod.persistAnchorToken("tok_xyz");
  assert.equal(result.localStorage, false);
  assert.equal(result.indexedDB, false); // no indexedDB in this env
});

test("persistAnchorToken: empty token writes nothing", async () => {
  const ls = makeStorage();
  const mod = await loadModule({ localStorage: ls });
  const result = await mod.persistAnchorToken("   ");
  assert.equal(result.localStorage, false);
  assert.equal(ls._store.has("7sabek.guest.token"), false);
});

test("persistAnchorToken then resolveAnchorToken round-trips through localStorage", async () => {
  const ls = makeStorage();
  const mod = await loadModule({ localStorage: ls });
  await mod.persistAnchorToken("tok_round");
  assert.equal(await mod.resolveAnchorToken(), "tok_round");
});

test("clearAnchorToken removes the localStorage mirror", async () => {
  const ls = makeStorage();
  ls.setItem("7sabek.guest.token", "tok_del");
  const mod = await loadModule({ localStorage: ls });
  await mod.clearAnchorToken();
  assert.equal(ls._store.has("7sabek.guest.token"), false);
});

test("claimGuestCreationLock serialises overlapping callers via the Locks API", async () => {
  const locks = makeLocks();
  const mod = await loadModule({ localStorage: makeStorage(), locks });

  const order: string[] = [];
  const slow = mod.claimGuestCreationLock(async () => {
    order.push("A:start");
    await new Promise((r) => setTimeout(r, 30));
    order.push("A:end");
    return "A";
  });
  const fast = mod.claimGuestCreationLock(async () => {
    order.push("B:start");
    order.push("B:end");
    return "B";
  });

  assert.deepEqual(await Promise.all([slow, fast]), ["A", "B"]);
  // B must not start until A has finished
  assert.deepEqual(order, ["A:start", "A:end", "B:start", "B:end"]);
});

test("claimGuestCreationLock falls back to a localStorage lock without the Locks API", async () => {
  const mod = await loadModule({ localStorage: makeStorage() });
  const value = await mod.claimGuestCreationLock(async () => 42);
  assert.equal(value, 42);
});

test("newIdempotencyKey returns distinct values", async () => {
  const mod = await loadModule({ localStorage: makeStorage() });
  const keys = new Set(Array.from({ length: 50 }, () => mod.newIdempotencyKey()));
  assert.equal(keys.size, 50);
});
