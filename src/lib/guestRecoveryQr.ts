/**
 * QR + deep-link helpers for the recovery code, so a guest can photograph it
 * (a photo lands in the gallery and is backed up to iCloud / Google Photos on
 * its own) and scan it later from another phone.
 */

import qrcode from "qrcode-generator";

/** Normalised 8-char code, no dash. */
export function normalizeCode(raw: string): string {
  return (raw || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** A scannable link that opens /login with the recovery code pre-filled. */
export function recoveryUrl(code: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://7sabek.ma";
  return `${origin}/login?rc=${encodeURIComponent(normalizeCode(code))}`;
}

type Qr = ReturnType<typeof qrcode>;

function buildQr(text: string): Qr {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr;
}

/** An <svg> data URI for inline display. */
export function recoveryQrSvg(text: string): string {
  const svg = buildQr(text).createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Paint the QR onto a canvas 2D context as a crisp black-on-white square. */
export function paintQr(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number
): void {
  const qr = buildQr(text);
  const count = qr.getModuleCount();
  const quiet = 2;
  const total = count + quiet * 2;
  const cell = size / total;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "#0a241d";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(
          Math.round(x + (c + quiet) * cell),
          Math.round(y + (r + quiet) * cell),
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    }
  }
}
