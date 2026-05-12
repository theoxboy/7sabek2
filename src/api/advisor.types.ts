import type { AdvisorPreviewResponseV1, ISODateTime, UUID } from "@/types/advisor";

export type AdvisorApiErrorCode =
  | "ADVISOR_PREVIEW_BLOCKED"
  | "ADVISOR_PREVIEW_STALE"
  | "ADVISOR_PRE_APPLY_FAILED"
  | "ADVISOR_ACCEPTANCE_REFUSED"
  | "ADVISOR_USER_MISMATCH"
  | "ADVISOR_NORMALIZER_FAILED"
  | "ADVISOR_GATING_FAILED"
  | "ADVISOR_ENGINE_FAILED"
  | "ADVISOR_PREVIEW_PERSIST_FAILED"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "MALFORMED_RESPONSE";

export type AdvisorApiError = {
  code: AdvisorApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type PostAdvisorPreviewRequest = {
  user_id: UUID;
  source: "onboarding" | "manual";
  force_regenerate?: boolean;
};

export type PostAdvisorPreviewResponse = {
  preview_id: UUID;
  advisor_preview: AdvisorPreviewResponseV1;
  freshness: {
    profile_hash: string;
    engine_version: string;
    generated_at: ISODateTime;
    expires_at: ISODateTime;
  };
};
