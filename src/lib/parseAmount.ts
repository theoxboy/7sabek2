/**
 * Shared numeric-input parsing for money amounts and percentages.
 *
 * Two contracts, one separator-handling core:
 *
 * - `parseAmountInput` — for transaction / income amounts. Returns `number | null`,
 *   rejects non-positive values, and applies a "3 trailing digits ⇒ thousands
 *   separator" heuristic (`"1.234"` → `1234`, `"1,50"` → `1.5`).
 * - `parseDecimalInput` — for distribution config fields and percentages. Always
 *   returns a `number` (0 when unreadable), allows 0 and negatives, and treats
 *   the last `.`/`,` as the decimal point with no thousands heuristic
 *   (`"33.333"` → `33.333`, not `33333`).
 *
 * Both first fold Eastern-Arabic / Persian digits to ASCII via `normalizeDigits`.
 */

const EASTERN_ARABIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

export const normalizeDigits = (value: string): string =>
  value.replace(/[٠-٩۰-۹]/g, (char) => EASTERN_ARABIC_DIGITS[char] ?? char);

/**
 * Parse a user-entered transaction amount. `null` when the value is empty,
 * unreadable, or not strictly positive.
 */
export const parseAmountInput = (value: string): number | null => {
  const digitsNormalized = normalizeDigits(value);
  const cleaned = digitsNormalized
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;

  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const dotCount = (cleaned.match(/\./g) ?? []).length;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized = cleaned;
  if (commaCount > 0 && dotCount > 0) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    normalized = normalized.split(thousandSep).join("");
    normalized = normalized.replace(decimalSep, ".");
  } else if (commaCount > 0) {
    if (commaCount > 1) {
      normalized = normalized.split(",").join("");
    } else {
      const decimals = cleaned.length - lastComma - 1;
      const shouldTreatAsThousands = decimals === 3;
      normalized = shouldTreatAsThousands
        ? normalized.replace(",", "")
        : normalized.replace(",", ".");
    }
  } else if (dotCount > 0) {
    if (dotCount > 1) {
      normalized = normalized.split(".").join("");
    } else {
      const decimals = cleaned.length - lastDot - 1;
      const shouldTreatAsThousands = decimals === 3;
      normalized = shouldTreatAsThousands
        ? normalized.replace(".", "")
        : normalized;
    }
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

/**
 * Parse a config / percentage input. The last `.` or `,` is the decimal point;
 * every other separator is dropped. Never returns NaN — `0` when unreadable, so
 * validate emptiness beforehand when "0" and "blank" must differ.
 *
 *   "1 234,56" -> 1234.56   "12,5" -> 12.5   "33.333" -> 33.333
 *   ""/"abc"   -> 0
 */
export const parseDecimalInput = (value?: string | number | null): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;

  const cleaned = normalizeDigits(value).trim().replace(/\s/g, "");
  if (cleaned === "") return 0;

  const decimalPos = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
  const negative = cleaned.startsWith("-");

  const digitsOnly = (part: string) => part.replace(/[^\d]/g, "");
  const intPart =
    decimalPos === -1 ? digitsOnly(cleaned) : digitsOnly(cleaned.slice(0, decimalPos));
  const fracPart = decimalPos === -1 ? "" : digitsOnly(cleaned.slice(decimalPos + 1));

  if (intPart === "" && fracPart === "") return 0;

  const parsed = Number(`${negative ? "-" : ""}${intPart || "0"}.${fracPart || "0"}`);
  return Number.isFinite(parsed) ? parsed : 0;
};
