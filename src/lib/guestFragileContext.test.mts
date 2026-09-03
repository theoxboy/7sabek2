import test from "node:test";
import assert from "node:assert/strict";

function withEnv(
  ua: string,
  opts: { standalone?: boolean; matchStandalone?: boolean; maxTouchPoints?: number },
  run: () => void
) {
  const g = globalThis as Record<string, unknown>;
  const def = (k: string, v: unknown) =>
    Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  def("window", {
    navigator: {
      userAgent: ua,
      standalone: opts.standalone,
      maxTouchPoints: opts.maxTouchPoints ?? 0,
    },
    matchMedia: () => ({ matches: Boolean(opts.matchStandalone) }),
  });
  def("navigator", (globalThis as { window: { navigator: unknown } }).window.navigator);
  run();
}

const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const CHROME_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1";
const DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

test("Safari iOS, not installed → fragile", async () => {
  const mod = await import(`./guestFragileContext.ts?t=${Math.random()}`);
  withEnv(SAFARI_IOS, {}, () => {
    const ctx = mod.detectFragileContext();
    assert.equal(ctx.fragile, true);
    assert.equal(ctx.reason, "safari_ios_not_installed");
  });
});

test("Safari iOS but installed to home screen → not fragile", async () => {
  const mod = await import(`./guestFragileContext.ts?t=${Math.random()}`);
  withEnv(SAFARI_IOS, { standalone: true }, () => {
    assert.equal(mod.detectFragileContext().fragile, false);
  });
});

test("Chrome on iOS → not flagged (only real Safari)", async () => {
  const mod = await import(`./guestFragileContext.ts?t=${Math.random()}`);
  withEnv(CHROME_IOS, {}, () => {
    assert.equal(mod.detectFragileContext().fragile, false);
  });
});

test("desktop → not fragile", async () => {
  const mod = await import(`./guestFragileContext.ts?t=${Math.random()}`);
  withEnv(DESKTOP, {}, () => {
    assert.equal(mod.detectFragileContext().fragile, false);
  });
});
