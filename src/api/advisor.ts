import { apiFetch } from "@/lib/api";

import type {
  AdvisorApiError,
  AdvisorApiErrorCode,
  PostAdvisorPreviewRequest,
  PostAdvisorPreviewResponse,
} from "@/api/advisor.types";

function isPreviewResponse(payload: unknown): payload is PostAdvisorPreviewResponse {
  if (!payload || typeof payload !== "object") return false;
  const typed = payload as Record<string, unknown>;
  return typeof typed.preview_id === "string" && typeof typed.advisor_preview === "object" && typeof typed.freshness === "object";
}

export function parseAdvisorApiError(error: unknown): AdvisorApiError {
  const fallback: AdvisorApiError = {
    code: "INTERNAL_ERROR",
    message: "Erreur serveur inattendue.",
  };

  if (error instanceof Error) {
    const known = error.message as AdvisorApiErrorCode;
    if (
      known === "ADVISOR_USER_MISMATCH" ||
      known === "ADVISOR_NORMALIZER_FAILED" ||
      known === "ADVISOR_GATING_FAILED" ||
      known === "ADVISOR_ENGINE_FAILED" ||
      known === "ADVISOR_PREVIEW_PERSIST_FAILED" ||
      known === "INTERNAL_ERROR"
    ) {
      return { code: known, message: known };
    }
    if (error.message.toLowerCase().includes("network")) {
      return { code: "NETWORK_ERROR", message: "Erreur réseau." };
    }
    return { ...fallback, message: error.message || fallback.message };
  }

  return fallback;
}

export async function postAdvisorPreview(
  payload: PostAdvisorPreviewRequest
): Promise<PostAdvisorPreviewResponse> {
  try {
    const response = await apiFetch<PostAdvisorPreviewResponse>("/advisor/preview", {
      method: "POST",
      body: payload,
    });

    if (!isPreviewResponse(response)) {
      throw new Error("MALFORMED_RESPONSE");
    }

    return response;
  } catch (error) {
    const parsed = parseAdvisorApiError(error);
    throw parsed;
  }
}
