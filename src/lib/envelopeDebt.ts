/**
 * Heuristic "this envelope name looks like a debt / credit repayment fund".
 *
 * Mirrors the backend `name_looks_like_debt` so the create form can pre-check
 * the "it's a debt" box. It is only a suggestion — the box value the user
 * confirms is what's sent, and the backend `is_debt` flag is authoritative.
 */
const DEBT_KEYWORDS = [
  "dette",
  "dettes",
  "debt",
  "debts",
  "credit",
  "crédit",
  "crédits",
  "kredit",
  "كريدي",
  "repayment",
  "repayments",
  "loan",
  "loans",
  "salaf",
  "سلف",
  "دين",
  "الديون",
  "ديون",
  "قرض",
  "قروض",
];

export const looksLikeDebt = (name: string | null | undefined): boolean => {
  if (!name) return false;
  const key = name.trim().toLowerCase();
  return DEBT_KEYWORDS.some((kw) => key.includes(kw));
};
