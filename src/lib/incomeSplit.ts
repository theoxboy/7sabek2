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
 */
export function splitByWeights(
  ids: string[],
  weightOf: (id: string) => number
): Record<string, number> {
  if (ids.length === 0) return {};
  const total = ids.reduce((s, id) => s + weightOf(id), 0) || ids.length;
  const out: Record<string, number> = {};
  let running = 0;
  ids.forEach((id, i) => {
    const v =
      i === ids.length - 1
        ? Math.max(0, 100 - running)
        : Math.max(0, Math.min(100 - running, roundToSplitStep((weightOf(id) / total) * 100)));
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
