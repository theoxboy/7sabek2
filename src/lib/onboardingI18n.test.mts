import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { hasOnboardingTranslation, setOnboardingLocale, t, tx } from "./onboardingI18n.ts";

const PAGE = "src/app/(app)/beta/onboarding-v2/page.tsx";
const ARABIC = /[؀-ۿ]/;

// Static Darija literals of a source region. Literals built with values
// (`${…}`) and first arguments of t(…) carry their own translations.
function staticDarijaLiterals(source: string): string[] {
  const found = new Set<string>();
  const literal = /(["`])((?:(?!\1)[^\\\n]|\\.)*)\1/g;
  let match: RegExpExecArray | null;
  while ((match = literal.exec(source))) {
    const value = match[2];
    if (!ARABIC.test(value) || value.includes("${")) continue;
    const before = source.slice(Math.max(0, match.index - 12), match.index);
    if (/\bt\(\s*$/.test(before)) continue;
    found.add(value);
  }
  return [...found];
}

function region(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `region ${startMarker}`);
  return source.slice(start, end);
}

test("every onboarding question, option and card text has fr and en", () => {
  const page = readFileSync(PAGE, "utf8");
  const sources = [
    region(page, "const INCOME_TYPE_OPTIONS", "const ENVELOPE_SUGGESTION_CATALOG"),
    region(page, "function buildQuestions(", "function isQuestionAnswered("),
    readFileSync("src/lib/onboardingPayTiming.ts", "utf8"),
    readFileSync("src/lib/onboardingCards.ts", "utf8"),
  ];
  const missing = sources.flatMap(staticDarijaLiterals).filter((text) => !hasOnboardingTranslation(text));
  assert.deepEqual(missing, [], `Missing translations:\n${missing.join("\n")}`);
});

test("t and tx follow the active locale and fall back to Darija", () => {
  setOnboardingLocale("fr");
  assert.equal(tx("نعم"), "Oui");
  assert.equal(tx("نص غير معروف"), "نص غير معروف");
  assert.equal(t("أ", "b", "c"), "b");
  setOnboardingLocale("en");
  assert.equal(tx("نعم"), "Yes");
  assert.equal(t("أ", "b", "c"), "c");
  setOnboardingLocale("ar");
  assert.equal(tx("نعم"), "نعم");
  assert.equal(t("أ", "b", "c"), "أ");
});
