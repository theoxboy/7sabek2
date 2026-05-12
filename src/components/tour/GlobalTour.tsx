/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { areToursGloballyDisabled } from "@/lib/tourFlags";

export type TourStep = {
  title: string;
  description: string;
  ref: React.RefObject<HTMLElement | null>;
  selector?: string;
};

const TOUR_STATE_PREFIX = "floussy.pageTour.state";
const TOUR_DONE_PREFIX = "floussy.pageTour.done";
const TOUR_SEEN_PREFIX = "floussy.pageTour.seen";
const isElementVisible = (element: HTMLElement | null) => {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return element.getClientRects().length > 0;
};

const isNavSelector = (selector?: string) =>
  typeof selector === "string" && selector.includes("data-tour=\"nav-");

const resolveStepTarget = (step: TourStep | null) => {
  if (!step) return null;
  if (step.ref.current) return step.ref.current;
  if (
    !step.selector ||
    typeof document === "undefined" ||
    typeof window === "undefined"
  ) {
    return null;
  }
  const isMobile = window.innerWidth < 768;
  if (isMobile && isNavSelector(step.selector)) {
    const mobileTarget = document.querySelector<HTMLElement>(
      `[data-tour-mobile-nav] ${step.selector}`
    );
    if (mobileTarget) return mobileTarget;
  }
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(step.selector));
  const visible = nodes.find((node) => isElementVisible(node));
  return visible ?? nodes[0] ?? null;
};

type GlobalTourState = {
  active: boolean;
  stepIndex: number;
};

const defaultState: GlobalTourState = {
  active: false,
  stepIndex: 0,
};

const readState = (pageId: string): GlobalTourState => {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(`${TOUR_STATE_PREFIX}.${pageId}`);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<GlobalTourState>;
    if (
      typeof parsed.active !== "boolean" ||
      typeof parsed.stepIndex !== "number"
    ) {
      return defaultState;
    }
    const parsedStepIndex = Number.isFinite(parsed.stepIndex)
      ? Math.max(0, Math.floor(parsed.stepIndex))
      : 0;
    return {
      active: parsed.active,
      stepIndex: parsedStepIndex,
    };
  } catch {
    return defaultState;
  }
};

const writeState = (pageId: string, state: GlobalTourState) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${TOUR_STATE_PREFIX}.${pageId}`,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage write failures (private mode / blocked storage / quota).
  }
};

const readDone = (pageId: string) => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${TOUR_DONE_PREFIX}.${pageId}`) === "1";
  } catch {
    return false;
  }
};

const writeDone = (pageId: string, done: boolean) => {
  if (typeof window === "undefined") return;
  try {
    if (done) {
      window.localStorage.setItem(`${TOUR_DONE_PREFIX}.${pageId}`, "1");
    } else {
      window.localStorage.removeItem(`${TOUR_DONE_PREFIX}.${pageId}`);
    }
  } catch {
    // Ignore storage write failures (private mode / blocked storage / quota).
  }
};

const readSeen = (pageId: string) => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${TOUR_SEEN_PREFIX}.${pageId}`) === "1";
  } catch {
    return false;
  }
};

const writeSeen = (pageId: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${TOUR_SEEN_PREFIX}.${pageId}`, "1");
  } catch {
    // Ignore storage write failures (private mode / blocked storage / quota).
  }
};

export function useGlobalTour(
  pageId: string,
  steps: TourStep[],
  options?: { autoStart?: boolean }
) {
  const safeSteps = steps.filter(
    (step) =>
      typeof step.title === "string" &&
      step.title.trim().length > 0 &&
      typeof step.description === "string" &&
      step.description.trim().length > 0
  );
  const router = useRouter();
  const [state, setState] = useState<GlobalTourState>(() => {
    if (typeof window === "undefined") return defaultState;
    const done = readDone(pageId);
    const seen = readSeen(pageId);
    if (done || seen) return defaultState;
    return readState(pageId);
  });
  const [isDone, setIsDone] = useState(() => {
    if (typeof window === "undefined") return false;
    return readDone(pageId);
  });
  const [isSeen, setIsSeen] = useState(() => {
    if (typeof window === "undefined") return false;
    return readSeen(pageId);
  });
  const [toursDisabledGlobally, setToursDisabledGlobally] = useState(() =>
    areToursGloballyDisabled()
  );
  const total = safeSteps.length;
  const isActive =
    !toursDisabledGlobally &&
    state.active &&
    total > 0 &&
    state.stepIndex >= 0 &&
    state.stepIndex < total;
  const stepIndex = isActive ? state.stepIndex : 0;
  const step = isActive ? safeSteps[stepIndex] ?? null : null;

  useEffect(() => {
    const sync = () => setToursDisabledGlobally(areToursGloballyDisabled());
    sync();
    if (typeof window === "undefined") return;
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    if (!toursDisabledGlobally) return;
    setState(defaultState);
    writeState(pageId, defaultState);
  }, [pageId, toursDisabledGlobally]);

  useEffect(() => {
    const done = readDone(pageId);
    const seen = readSeen(pageId);
    setIsDone(done);
    setIsSeen(seen);
    if (toursDisabledGlobally) {
      setState(defaultState);
      return;
    }
    if (!done && !seen) {
      setState(readState(pageId));
      return;
    }
    setState(defaultState);
  }, [pageId, toursDisabledGlobally]);

  useEffect(() => {
    if (!state.active) return;
    if (state.stepIndex >= 0 && state.stepIndex < total) return;
    setState(defaultState);
    writeState(pageId, defaultState);
    // Transactions tour was reported with stale persisted state; clear flags to restart cleanly.
    if (pageId === "transactions" && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(`${TOUR_SEEN_PREFIX}.${pageId}`);
        window.localStorage.removeItem(`${TOUR_DONE_PREFIX}.${pageId}`);
      } catch {
        // ignore
      }
      setIsSeen(false);
      setIsDone(false);
    }
  }, [pageId, state.active, state.stepIndex, total]);

  useEffect(() => {
    if (!isActive) return;
    if (total === 0) return;
    if (state.stepIndex >= total) {
      const nextState = { ...state, stepIndex: Math.max(0, total - 1) };
      setState(nextState);
      writeState(pageId, nextState);
    }
  }, [isActive, state, total, pageId]);

  useEffect(() => {
    if (!isActive) return;
    const target = resolveStepTarget(step);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [isActive, step]);

  const startTour = () => {
    if (toursDisabledGlobally) return;
    const next = { active: true, stepIndex: 0 };
    setState(next);
    writeState(pageId, next);
    writeSeen(pageId);
    setIsSeen(true);
  };

  const finishTour = (redirectToDashboard = false) => {
    setState(defaultState);
    writeState(pageId, defaultState);
    writeDone(pageId, true);
    setIsDone(true);
    if (redirectToDashboard) {
      router.push("/dashboard");
    }
  };

  const goNext = () => {
    if (!isActive) return;
    if (stepIndex + 1 < total) {
      const next = { ...state, stepIndex: stepIndex + 1 };
      setState(next);
      writeState(pageId, next);
      return;
    }
    finishTour(false);
  };

  const goPrevious = () => {
    if (!isActive) return;
    if (stepIndex > 0) {
      const prev = { ...state, stepIndex: stepIndex - 1 };
      setState(prev);
      writeState(pageId, prev);
      return;
    }
  };

  const canGoPrevious = isActive && state.stepIndex > 0;

  const skipTour = () => finishTour(false);

  useEffect(() => {
    const autoStart = options?.autoStart ?? true;
    if (!autoStart) return;
    if (toursDisabledGlobally) return;
    if (isDone) return;
    if (isSeen) return;
    if (isActive) return;
    if (total === 0) return;
    const next = { active: true, stepIndex: 0 };
    setState(next);
    writeState(pageId, next);
    writeSeen(pageId);
    setIsSeen(true);
  }, [options?.autoStart, isDone, isSeen, isActive, total, pageId, toursDisabledGlobally]);

  return {
    isActive,
    step,
    stepIndex,
    total,
    startTour,
    goNext,
    goPrevious,
    canGoPrevious,
    skipTour,
    isDone,
  };
}

export function GlobalTourOverlay({
  step,
  stepIndex,
  total,
  canGoPrevious,
  onPrevious,
  onNext,
  onSkip,
}: {
  step: TourStep | null;
  stepIndex: number;
  total: number;
  canGoPrevious: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  if (!step || total <= 0) return null;
  return (
    <GlobalTourOverlayInner
      step={step}
      stepIndex={stepIndex}
      total={total}
      canGoPrevious={canGoPrevious}
      onPrevious={onPrevious}
      onNext={onNext}
      onSkip={onSkip}
    />
  );
}

function GlobalTourOverlayInner({
  step,
  stepIndex,
  total,
  canGoPrevious,
  onPrevious,
  onNext,
  onSkip,
}: {
  step: TourStep;
  stepIndex: number;
  total: number;
  canGoPrevious: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const resolveTarget = useCallback(() => resolveStepTarget(step), [step]);

  useLayoutEffect(() => {
    const target = resolveTarget();
    if (!target) return;
    setRect(target.getBoundingClientRect());
  }, [resolveTarget]);

  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    const bounds = tooltipRef.current.getBoundingClientRect();
    setTooltipSize({ width: bounds.width, height: bounds.height });
  }, [stepIndex, step?.title, step?.description]);

  useEffect(() => {
    const handle = () => {
      const target = resolveTarget();
      if (!target) return;
      setRect(target.getBoundingClientRect());
    };
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(handle);
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      cancelAnimationFrame(frame);
    };
  }, [resolveTarget]);

  useEffect(() => {
    overlayRef.current?.focus();
  }, [stepIndex]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const isMobile = window.innerWidth < 768;
    const shouldOpenMobileNav = isMobile && isNavSelector(step?.selector);
    if (shouldOpenMobileNav) {
      root.classList.add("tour-mobile-nav-open");
    } else {
      root.classList.remove("tour-mobile-nav-open");
    }
    return () => {
      root.classList.remove("tour-mobile-nav-open");
    };
  }, [step, stepIndex]);

  useEffect(() => {
    const target = resolveTarget();
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      const fresh = resolveTarget();
      if (fresh) setRect(fresh.getBoundingClientRect());
    });
    const timeout = window.setTimeout(() => {
      const fresh = resolveTarget();
      if (fresh) setRect(fresh.getBoundingClientRect());
    }, 320);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [stepIndex, step?.selector, resolveTarget]);

  const safePadding = 16;
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const isVisible =
    rect &&
    rect.bottom > 0 &&
    rect.top < viewportHeight &&
    rect.right > 0 &&
    rect.left < viewportWidth;
  const isAbove = rect ? rect.bottom <= 0 : false;
  const scrollDirection = isAbove ? "haut" : "bas";
  const tooltipWidth = Math.min(360, viewportWidth - safePadding * 2);
  const tooltipHeight = tooltipSize?.height ?? 160;
  const placeBelow =
    rect && rect.bottom + tooltipHeight + 24 < viewportHeight ? true : rect ? rect.top < 220 : true;
  const top = rect
    ? placeBelow
      ? Math.min(rect.bottom + 16, viewportHeight - tooltipHeight - safePadding)
      : Math.max(rect.top - tooltipHeight - 16, safePadding)
    : safePadding;
  const left = rect
    ? Math.min(
        Math.max(rect.left, safePadding),
        viewportWidth - tooltipWidth - safePadding
      )
    : safePadding;

  const overlay = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] pointer-events-auto"
      tabIndex={-1}
    >
      {rect && isVisible ? (
        <>
          <div
            className="absolute rounded-3xl border-2 border-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]"
            style={{
              top: Math.max(rect.top - 6, 8),
              left: Math.max(rect.left - 6, 8),
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: "0 0 0 9999px rgba(8, 10, 20, 0.6)",
            }}
          />
          <div
            ref={tooltipRef}
            className="absolute pointer-events-auto w-[360px] max-w-[calc(100vw-32px)] rounded-3xl border border-white/70 bg-[var(--surface)]/95 p-4 text-sm text-slate-700 shadow-2xl"
            style={{ top, left, width: tooltipWidth }}
          >
            <div
              className={`absolute h-3 w-3 rotate-45 border border-white/70 bg-[var(--surface)]/95 ${
                placeBelow ? "-top-1" : "bottom-[-6px]"
              }`}
              style={{ left: 24 }}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Étape {stepIndex + 1}/{total}
              </p>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                Guide
              </span>
            </div>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {step.title}
            </p>
            <p className="mt-1 text-sm text-slate-600">{step.description}</p>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" />
          <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-[var(--surface)]/95 p-4 text-center text-sm text-slate-700 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Étape {stepIndex + 1}/{Math.max(total, 1)}
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              Étape hors écran
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Fais défiler vers le {scrollDirection} pour retrouver l’élément de
              cette étape.
            </p>
            {resolveTarget() ? (
              <Button
                onClick={() =>
                  resolveTarget()?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
                className="mt-4 h-8 px-4 text-xs"
              >
                Recentrer l’étape
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 pointer-events-auto flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/70 bg-[var(--surface)]/90 px-4 py-2 text-sm text-slate-700 shadow-xl">
        <button
          type="button"
          onClick={() => onSkip()}
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Passer pour le moment
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <Button
          variant="secondary"
          onClick={() => onPrevious()}
          className="h-8 px-4 text-xs"
          disabled={!canGoPrevious}
        >
          Avant
        </Button>
        <Button onClick={() => onNext()} className="h-8 px-4 text-xs">
          Suivant
        </Button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
