/**
 * The L1 anchor: the guest identity secret and the redundant vaults that keep it.
 *
 * Everything that touches the anchor lives here and nowhere else. The rest of the
 * app only ever sees a session (via `fetchMe`) — it never reads or writes a token
 * directly.
 *
 * ## The vaults
 *
 * The backend cookie `gt` (HttpOnly, 2 years) is the source of truth. It is out of
 * reach of this module by design. What this module manages are the *mirrors* that
 * re-seed that cookie when it is lost:
 *
 *   1. `localStorage`  — fast, first checked
 *   2. IndexedDB       — survives some cleanups that only clear localStorage
 *   (native keychains — iOS Keychain, Android Block Store — are phase 4 and plug
 *    in through `NATIVE_VAULT` when running inside the shell)
 *
 * Resolution order is strict and first-match-wins. Mirrors are never merged.
 *
 * ## Creation
 *
 * A guest is created only at the first data-producing mutation, and exactly once
 * even with several tabs racing: `claimGuestCreationLock` serialises via the Web
 * Locks API (with a localStorage fallback for older engines) and the caller must
 * re-check for a session *inside* the lock before calling `POST /auth/guest`.
 *
 * NOTE: the `/auth/guest*` backend routes are specified in the Mode Découverte
 * plan (annexe B.3) and are not live yet. Their network wrappers live in
 * `guestAnchorApi.ts`; this module is dependency-free so the vault + lock logic
 * stays unit-testable.
 */

const LS_KEY = "7sabek.guest.token";
const IDB_NAME = "7sabek";
const IDB_STORE = "anchor";
const IDB_KEY = "guest.token";
const LOCK_NAME = "7sabek.guest.create";
const LOCK_FALLBACK_KEY = "7sabek.guest.create.lock";
const LOCK_FALLBACK_TTL_MS = 15_000;

const isBrowser = typeof window !== "undefined";

/** A pluggable native keychain vault, wired up by the mobile shell in phase 4. */
export type NativeVault = {
  read: () => Promise<string | null>;
  write: (token: string) => Promise<void>;
  clear: () => Promise<void>;
};

let NATIVE_VAULT: NativeVault | null = null;

/** Called once by the native shell at boot to enable the keychain / Block Store mirror. */
export function registerNativeVault(vault: NativeVault): void {
  NATIVE_VAULT = vault;
}

// ─── localStorage vault ────────────────────────────────────────────────────────

function readLocalStorage(): string | null {
  if (!isBrowser) return null;
  try {
    return normaliseToken(window.localStorage.getItem(LS_KEY));
  } catch {
    return null;
  }
}

function writeLocalStorage(token: string): boolean {
  if (!isBrowser) return false;
  try {
    window.localStorage.setItem(LS_KEY, token);
    return true;
  } catch {
    return false; // private mode, quota, disabled storage — never fatal
  }
}

function clearLocalStorage(): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

// ─── IndexedDB vault ───────────────────────────────────────────────────────────

function openIdb(): Promise<IDBDatabase | null> {
  if (!isBrowser || typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const done = (db: IDBDatabase | null) => {
      if (!settled) {
        settled = true;
        resolve(db);
      }
    };
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => done(req.result);
      req.onerror = () => done(null);
      req.onblocked = () => done(null);
      // never hang the boot sequence on IDB
      setTimeout(() => done(null), 1_500);
    } catch {
      done(null);
    }
  });
}

async function readIdb(): Promise<string | null> {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(normaliseToken(req.result as string | undefined));
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    } finally {
      db.close();
    }
  });
}

async function writeIdb(token: string): Promise<boolean> {
  const db = await openIdb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(token, IDB_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    } finally {
      db.close();
    }
  });
}

async function clearIdb(): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
  } catch {
    /* ignore */
  } finally {
    db.close();
  }
}

// ─── Resolution / persistence across vaults ────────────────────────────────────

function normaliseToken(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * First stored anchor token, checked in strict order: localStorage → IndexedDB →
 * native keychain. First match wins; mirrors are never merged. Returns `null`
 * when no vault holds a token (a genuine first visitor).
 */
export async function resolveAnchorToken(): Promise<string | null> {
  const fromLs = readLocalStorage();
  if (fromLs) return fromLs;

  const fromIdb = await readIdb();
  if (fromIdb) return fromIdb;

  if (NATIVE_VAULT) {
    try {
      const fromNative = normaliseToken(await NATIVE_VAULT.read());
      if (fromNative) return fromNative;
    } catch {
      /* ignore */
    }
  }

  return null;
}

/**
 * Write the token to every mirror. Each vault is attempted independently; a
 * failure in one is logged-and-ignored and must never block the caller (the
 * mutation that created the guest still has to go through). Returns the set of
 * vaults that accepted the write, for diagnostics.
 */
export async function persistAnchorToken(token: string): Promise<{ localStorage: boolean; indexedDB: boolean; native: boolean }> {
  const clean = normaliseToken(token);
  if (!clean) return { localStorage: false, indexedDB: false, native: false };

  const results = await Promise.allSettled([
    Promise.resolve(writeLocalStorage(clean)),
    writeIdb(clean),
    NATIVE_VAULT
      ? NATIVE_VAULT.write(clean).then(
          () => true,
          () => false
        )
      : Promise.resolve(false),
  ]);

  const ok = (i: number) => results[i].status === "fulfilled" && (results[i] as PromiseFulfilledResult<boolean>).value === true;
  return { localStorage: ok(0), indexedDB: ok(1), native: ok(2) };
}

/** Wipe the anchor from every mirror. Used by "Effacer mes données" and on merge. */
export async function clearAnchorToken(): Promise<void> {
  clearLocalStorage();
  await clearIdb();
  if (NATIVE_VAULT) {
    try {
      await NATIVE_VAULT.clear();
    } catch {
      /* ignore */
    }
  }
}

// ─── Creation lock (one guest even with racing tabs) ───────────────────────────

/**
 * Run `fn` while holding the guest-creation lock so two tabs can't each create a
 * guest. Prefers the Web Locks API; falls back to a TTL'd localStorage flag with
 * a short spin. `fn` MUST re-check for an existing session before creating one.
 */
export async function claimGuestCreationLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = isBrowser
    ? (navigator as Navigator & { locks?: LockManager }).locks
    : undefined;

  if (locks?.request) {
    return locks.request(LOCK_NAME, { mode: "exclusive" }, async () => fn());
  }

  // Fallback: best-effort mutual exclusion for engines without the Locks API.
  const acquired = await spinForFallbackLock();
  try {
    return await fn();
  } finally {
    if (acquired) releaseFallbackLock();
  }
}

async function spinForFallbackLock(): Promise<boolean> {
  if (!isBrowser) return false;
  const deadline = Date.now() + LOCK_FALLBACK_TTL_MS;
  while (Date.now() < deadline) {
    try {
      const raw = window.localStorage.getItem(LOCK_FALLBACK_KEY);
      const heldUntil = raw ? Number(raw) : 0;
      if (!heldUntil || Number.isNaN(heldUntil) || heldUntil < Date.now()) {
        window.localStorage.setItem(LOCK_FALLBACK_KEY, String(Date.now() + LOCK_FALLBACK_TTL_MS));
        return true;
      }
    } catch {
      return false;
    }
    await sleep(120);
  }
  return false;
}

function releaseFallbackLock(): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(LOCK_FALLBACK_KEY);
  } catch {
    /* ignore */
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A fresh idempotency key for one guest-creation attempt (safe to retry with the same value). */
export function newIdempotencyKey(): string {
  if (isBrowser && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
