"use client";

/**
 * Central registry of every page that ships a guided tour. `useGlobalTour` only
 * accepts an id from this list, so the localStorage keys (`floussy.pageTour.*`)
 * can never silently collide or drift, and `src/lib/tour/content.ts` is checked
 * to hold an entry for each id.
 */
export const TOUR_PAGE_IDS = [
  "dashboard",
  "transactions",
  "envelopes",
  "regulation",
  "reports",
  "settings",
  "distribution",
  "goals",
  "debts",
  "aide",
] as const;

export type TourPageId = (typeof TOUR_PAGE_IDS)[number];

export const isTourPageId = (value: string): value is TourPageId =>
  (TOUR_PAGE_IDS as readonly string[]).includes(value);

/**
 * The whole sidebar, as a single tour target. `AppSidebar` is rendered inside
 * `<div data-tour="sidebar">` (desktop) and `[data-tour-mobile-nav]` (mobile);
 * the step resolver in `GlobalTour` already prefers the mobile variant on
 * narrow viewports.
 */
export const SIDEBAR_TOUR_SELECTOR = '[data-tour="sidebar"]';
