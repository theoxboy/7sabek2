// Moved to @/lib/distributionSimulation so the logic sits next to the split
// simulation it belongs with and can be unit tested without the API layer.
// Kept here as a re-export for existing import sites.
export {
  normalizePercentRows,
  type PercentRow,
} from "@/lib/distributionSimulation";
