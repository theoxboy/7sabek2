import type { AdvisorApiError } from "@/api/advisor.types";
import type { AdvisorPreviewResponseV1, UUID } from "@/types/advisor";

export type AdvisorPageState =
  | "idle_init"
  | "loading_preview"
  | "preview_ready"
  | "preview_blocked"
  | "server_error";

export type AdvisorContext = {
  state: AdvisorPageState;
  preview: AdvisorPreviewResponseV1 | null;
  previewId: UUID | null;
  isLoadingPreview: boolean;
  isBlocked: boolean;
  isStale: boolean;
  lastError: AdvisorApiError | null;
  lastRequestAt: string | null;
  lastSuccessAt: string | null;
};

export const initialAdvisorContext: AdvisorContext = {
  state: "idle_init",
  preview: null,
  previewId: null,
  isLoadingPreview: false,
  isBlocked: false,
  isStale: false,
  lastError: null,
  lastRequestAt: null,
  lastSuccessAt: null,
};
