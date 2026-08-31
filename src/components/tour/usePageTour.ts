"use client";

import { useMemo } from "react";

import { useGlobalTour, type TourStep } from "@/components/tour/GlobalTour";
import { useAppLocale } from "@/lib/appLocale";
import { getTourContent, type TourIntroContent } from "@/lib/tour/content";
import type { TourPageId } from "@/lib/tour/registry";

export type TourAnchor = {
  ref?: React.RefObject<HTMLElement | null>;
  selector?: string;
};

/**
 * One call wires a page's tour: it reads the active locale, pulls the centralized
 * content for `pageId`, turns each step's `anchor` key into a real ref/selector,
 * and starts the tour. Anchors whose key is missing from `anchors` are skipped,
 * so a page can expose a subset (e.g. a conditional section).
 *
 * `anchors` values should hold stable refs (the usual `useRef` result); only the
 * set of keys present is tracked for memoization.
 */
export function usePageTour(
  pageId: TourPageId,
  anchors: Record<string, TourAnchor>,
  options?: { autoStart?: boolean }
): {
  tour: ReturnType<typeof useGlobalTour>;
  intro: TourIntroContent | undefined;
} {
  const { locale } = useAppLocale("fr");
  const content = getTourContent(pageId, locale);
  const anchorKey = Object.keys(anchors).sort().join("|");

  const steps = useMemo<TourStep[]>(
    () =>
      content.steps
        .filter((step) => anchors[step.anchor])
        .map((step) => ({
          title: step.title,
          description: step.body,
          hint: step.hint,
          ref: anchors[step.anchor].ref,
          selector: anchors[step.anchor].selector,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content, anchorKey]
  );

  const tour = useGlobalTour(pageId, steps, options);
  return { tour, intro: content.intro };
}
