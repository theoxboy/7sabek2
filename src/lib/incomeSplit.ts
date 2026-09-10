/**
 * Pure helpers for the income-split presets, shared by the standalone
 * `/repartir` page and the guest prise-en-main (`/decouverte`).
 *
 * A "split" is a map of envelope id → percentage of income (multiples of STEP).
 * No API here.
 */

export const SPLIT_STEP = 5;

export const roundToSplitStep = (n: number) => Math.round(n / SPLIT_STEP) * SPLIT_STEP;

export const sumSplit = (o: Record<string, number>) =>
  Object.values(o).reduce((s, v) => s + (v || 0), 0);

/**
 * Distribute 100 across envelopes proportionally to weights, in SPLIT_STEP
 * increments, never exceeding 100 (any remainder simply stays in Cash).
 *
 * The rounding remainder is spread across the envelopes with the largest
 * fractional parts — one SPLIT_STEP each — rather than dumped on the last row,
 * so an "equal" split stays visually even (20/20/15/15/15/15, not 15×5 + 25).
 */
export function splitByWeights(
  ids: string[],
  weightOf: (id: string) => number
): Record<string, number> {
  if (ids.length === 0) return {};
  const total = ids.reduce((s, id) => s + weightOf(id), 0) || ids.length;

  const ideal = ids.map((id) => ((weightOf(id) / total) * 100) / SPLIT_STEP);
  const base = ideal.map((n) => Math.floor(n));
  let steps = Math.round(100 / SPLIT_STEP) - base.reduce((s, n) => s + n, 0);

  // Hand each remaining step to the envelope currently furthest below its ideal.
  const order = ids
    .map((_, i) => i)
    .sort((a, b) => ideal[b] - base[b] - (ideal[a] - base[a]));
  for (let k = 0; steps > 0 && k < order.length; k++, steps--) base[order[k]] += 1;

  const out: Record<string, number> = {};
  let running = 0;
  ids.forEach((id, i) => {
    const v = Math.max(0, Math.min(100 - running, base[i] * SPLIT_STEP));
    out[id] = v;
    running += v;
  });
  return out;
}

/** Rough "essential-ness" of an envelope from its raw name, for the presets. */
export function essentialWeight(name: string): number {
  const n = name.trim().toLowerCase();
  if (/(loyer|rent|كراء|logement|housing)/.test(n)) return 3;
  if (/(course|food|nourriture|ماكلة|أكل|groc)/.test(n)) return 3;
  if (/(transport|تنقل|carburant|fuel|essence)/.test(n)) return 2;
  if (/(epargne|épargne|saving|ادخار|توفير)/.test(n)) return 2;
  if (/(phone|téléphone|telephone|هاتف|تليفون)/.test(n)) return 1;
  return 1.5;
}

export function isSavingsName(name: string): boolean {
  return /(epargne|épargne|saving|ادخار|توفير)/.test(name.trim().toLowerCase());
}

export type SplitPreset = "equal" | "essentials" | "save";

/** Build a split for the given preset over a set of named envelopes. */
export function buildPresetSplit(
  envelopes: { id: string; name: string }[],
  preset: SplitPreset
): Record<string, number> {
  const ids = envelopes.map((e) => e.id);
  const nameOf = (id: string) => envelopes.find((e) => e.id === id)?.name ?? "";
  if (preset === "equal") return splitByWeights(ids, () => 1);
  if (preset === "save") {
    return splitByWeights(ids, (id) => (isSavingsName(nameOf(id)) ? 4 : essentialWeight(nameOf(id))));
  }
  return splitByWeights(ids, (id) => essentialWeight(nameOf(id)));
}
