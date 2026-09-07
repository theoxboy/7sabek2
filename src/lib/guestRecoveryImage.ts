/**
 * Render a branded "recovery code" card to a PNG blob — the guest downloads it
 * or shares it, and the image (in Downloads / Photos) is a durable copy that
 * survives a cleared browser.
 */

import { paintQr, recoveryUrl } from "@/lib/guestRecoveryQr";

function formatCode(raw: string): string {
  const c = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

type CardText = { heading: string; code: string; hint: string; url: string };

/** Draw the card at 2x for retina, return a PNG blob. */
export async function renderRecoveryCard(
  rawCode: string,
  text: { heading: string; hint: string },
  dir: "rtl" | "ltr"
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const scale = 2;
  const W = 720;
  const H = 420;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);

  const t: CardText = {
    heading: text.heading,
    code: formatCode(rawCode),
    hint: text.hint,
    url: recoveryUrl(rawCode),
  };

  // Background
  ctx.fillStyle = "#f6f8f4";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#d7e6dd";
  ctx.lineWidth = 2;
  roundRect(ctx, 12, 12, W - 24, H - 24, 24);
  ctx.stroke();

  const pad = 44;
  const textX = dir === "rtl" ? W - pad : pad;
  const align: CanvasTextAlign = dir === "rtl" ? "right" : "left";
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";

  // Wordmark
  ctx.fillStyle = "#0b8f53";
  ctx.font = "800 22px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText("7sabek", textX, pad + 8);

  // Heading
  ctx.fillStyle = "#0a241d";
  ctx.font = "700 26px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(t.heading, textX, pad + 54);

  // Code — big, spaced, always LTR
  ctx.save();
  ctx.textAlign = "left";
  ctx.fillStyle = "#0a241d";
  ctx.font = "800 52px ui-monospace, 'SF Mono', Menlo, monospace";
  const codeW = ctx.measureText(t.code).width;
  const codeX = dir === "rtl" ? W - pad - codeW : pad;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, codeX - 16, pad + 82, codeW + 32, 72, 14);
  ctx.fill();
  ctx.strokeStyle = "#bcd6c8";
  ctx.stroke();
  ctx.fillStyle = "#0a241d";
  ctx.fillText(t.code, codeX, pad + 134);
  ctx.restore();

  // Hint (wrapped)
  ctx.fillStyle = "#4e625a";
  ctx.font = "400 16px system-ui, -apple-system, 'Segoe UI', sans-serif";
  wrapText(ctx, t.hint, textX, pad + 190, W - pad * 2 - 170, 22, align);

  // QR bottom-corner
  const qrSize = 150;
  const qrX = dir === "rtl" ? pad : W - pad - qrSize;
  const qrY = H - pad - qrSize;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12);
  ctx.fill();
  ctx.strokeStyle = "#d7e6dd";
  ctx.stroke();
  paintQr(ctx, t.url, qrX, qrY, qrSize);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign
) {
  ctx.textAlign = align;
  const words = text.split(/\s+/);
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}
