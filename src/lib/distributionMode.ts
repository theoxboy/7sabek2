/**
 * Distribution rule "mode" predicates.
 *
 * Kept in a dependency-free module so pure logic (simulation, percentage
 * normalisation) and their unit tests can use them without pulling in the API
 * layer. Re-exported from `@/lib/distribution` for existing import sites.
 */

export const isFixedMode = (mode: string): boolean =>
  mode === "fixed" || mode === "fixed_per_period";

export const isPercentMode = (mode: string): boolean =>
  mode === "percent" || mode === "percent_of_income";
