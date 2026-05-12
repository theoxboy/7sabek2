"use client";

import { useCallback, useReducer } from "react";

import { postAdvisorPreview } from "@/api/advisor";
import type {
  AdvisorApiError,
  AdvisorApiErrorCode,
  PostAdvisorPreviewRequest,
} from "@/api/advisor.types";
import type { AdvisorContext } from "@/state/advisorContext";
import { initialAdvisorContext } from "@/state/advisorContext";
import type { AdvisorEvent } from "@/state/advisorEvents";

function nowIso(): string {
  return new Date().toISOString();
}

export function advisorReducer(context: AdvisorContext, event: AdvisorEvent): AdvisorContext {
  switch (event.type) {
    case "page_open":
    case "regenerate_preview":
      return {
        ...context,
        state: "loading_preview",
        isLoadingPreview: true,
        lastError: null,
        lastRequestAt: nowIso(),
      };
    case "preview_loaded_ok":
      return {
        ...context,
        state: "preview_ready",
        preview: event.payload.advisor_preview,
        previewId: event.payload.preview_id,
        isLoadingPreview: false,
        isBlocked: false,
        lastError: null,
        lastSuccessAt: nowIso(),
      };
    case "preview_loaded_blocked":
      return {
        ...context,
        state: "preview_blocked",
        preview: event.payload.advisor_preview,
        previewId: event.payload.preview_id,
        isLoadingPreview: false,
        isBlocked: true,
        lastError: null,
        lastSuccessAt: nowIso(),
      };
    case "preview_failed":
      return {
        ...context,
        state: "server_error",
        isLoadingPreview: false,
        lastError: event.error,
      };
    default:
      return context;
  }
}

export function useAdvisorMachine(userId: string | null) {
  const [context, dispatch] = useReducer(advisorReducer, initialAdvisorContext);

  const normalizeError = (error: unknown): AdvisorApiError => {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      "message" in error
    ) {
      return {
        code: String((error as { code: string }).code) as AdvisorApiErrorCode,
        message: String((error as { message: string }).message),
      };
    }
    return {
      code: "INTERNAL_ERROR",
      message: "Erreur serveur.",
    };
  };

  const loadPreview = useCallback(
    async (forceRegenerate = false) => {
      if (!userId) {
        dispatch({
          type: "preview_failed",
          error: {
            code: "INTERNAL_ERROR",
            message: "Utilisateur introuvable.",
          },
        });
        return;
      }

      dispatch({ type: forceRegenerate ? "regenerate_preview" : "page_open" });

      const payload: PostAdvisorPreviewRequest = {
        user_id: userId,
        source: "onboarding",
        force_regenerate: forceRegenerate,
      };

      try {
        const response = await postAdvisorPreview(payload);
        if (response.advisor_preview.mode === "blocked") {
          dispatch({ type: "preview_loaded_blocked", payload: response });
          return;
        }
        dispatch({ type: "preview_loaded_ok", payload: response });
      } catch (error) {
        dispatch({
          type: "preview_failed",
          error: normalizeError(error),
        });
      }
    },
    [userId]
  );

  return {
    context,
    dispatch,
    loadPreview,
  };
}
