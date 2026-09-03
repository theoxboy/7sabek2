/**
 * L2 device signals — the *stable* ones only.
 *
 * Deliberately NOT canvas, WebGL, audio or font enumeration: those are exactly
 * the signals that drift between sessions and that privacy browsers randomise.
 * These six barely identify a device — which is the point. The server can only
 * ever use them to ask "do you have your recovery code?", never to restore data.
 */

export type DeviceSignals = {
  platform?: string;
  language?: string;
  timezone?: string;
  screen?: string;
  cores?: string;
  memory?: string;
};

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function collectDeviceSignals(): DeviceSignals {
  if (typeof window === "undefined") return {};
  const nav = window.navigator as Navigator & {
    hardwareConcurrency?: number;
    deviceMemory?: number;
  };
  const out: DeviceSignals = {};
  try {
    out.platform = (nav.platform || "").slice(0, 64) || undefined;
  } catch {
    /* ignore */
  }
  try {
    out.language = (nav.language || "").slice(0, 16) || undefined;
  } catch {
    /* ignore */
  }
  try {
    out.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    /* ignore */
  }
  try {
    if (window.screen?.width && window.screen?.height) {
      // Round so a browser-chrome or zoom change doesn't shift the signal.
      const w = roundTo(window.screen.width, 20);
      const h = roundTo(window.screen.height, 20);
      out.screen = `${w}x${h}`;
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof nav.hardwareConcurrency === "number") {
      out.cores = String(nav.hardwareConcurrency);
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof nav.deviceMemory === "number") {
      out.memory = String(nav.deviceMemory);
    }
  } catch {
    /* ignore */
  }
  return out;
}
