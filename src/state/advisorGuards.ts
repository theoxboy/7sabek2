import type { AdvisorContext } from "@/state/advisorContext";

export function isBlockedPreview(context: AdvisorContext): boolean {
  return context.preview?.mode === "blocked" || context.isBlocked;
}

export function hasPreview(context: AdvisorContext): boolean {
  return context.preview !== null;
}

export function canRetryPreview(context: AdvisorContext): boolean {
  return context.state === "server_error" || context.state === "preview_blocked";
}
