export type CategoryEnvelopeMapping = Record<string, string>;

const MAPPINGS_KEY = "floussy_category_envelope_map";

export function getStoredMappings(): CategoryEnvelopeMapping {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(MAPPINGS_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as CategoryEnvelopeMapping;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    return {};
  }

  return {};
}

export function setStoredMappings(
  mappings: CategoryEnvelopeMapping
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(MAPPINGS_KEY, JSON.stringify(mappings));
}

export function setStoredMapping(
  categoryId: string,
  envelopeId: string
): CategoryEnvelopeMapping {
  const current = getStoredMappings();
  const next = { ...current, [categoryId]: envelopeId };
  setStoredMappings(next);
  return next;
}

export function clearStoredMappings(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(MAPPINGS_KEY);
}
