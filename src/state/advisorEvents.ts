import type { AdvisorApiError } from "@/api/advisor.types";
import type { PostAdvisorPreviewResponse } from "@/api/advisor.types";

export type AdvisorEvent =
  | { type: "page_open" }
  | { type: "preview_loaded_ok"; payload: PostAdvisorPreviewResponse }
  | { type: "preview_loaded_blocked"; payload: PostAdvisorPreviewResponse }
  | { type: "preview_failed"; error: AdvisorApiError }
  | { type: "regenerate_preview" };
