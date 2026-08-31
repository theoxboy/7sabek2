"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useAppLocale } from "@/lib/appLocale";
import { getLocaleDirection } from "@/lib/localePreference";
import { getTourChrome } from "@/lib/tour/i18n";
import type { TourIntroContent } from "@/lib/tour/content";

/**
 * The single pre-tour intro card. Theme-aware (all `var(--*)` tokens), RTL-aware,
 * localized chrome via `TOUR_CHROME`. Content comes from `TOUR_CONTENT[page].intro`.
 * Replaces the bespoke dashboard modal and the regulation `IntroDialog`.
 */
export function TourIntroDialog({
  open,
  onOpenChange,
  onStart,
  content,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onStart: () => void;
  content: TourIntroContent | undefined;
}) {
  const { locale } = useAppLocale("fr");
  const chrome = getTourChrome(locale);
  const dir = getLocaleDirection(locale);

  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        className="max-w-md border border-[var(--border)] bg-[var(--surface)]"
      >
        <DialogHeader>
          <span className="inline-flex w-fit items-center rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-strong)]">
            {content.eyebrow || chrome.introEyebrowFallback}
          </span>
          <DialogTitle className="mt-2">{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>

        <ol className="mt-1 space-y-2">
          {content.bullets.map((bullet, index) => (
            <li
              key={index}
              className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--ink)]"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)]">
                {index + 1}
              </span>
              <span className="leading-relaxed">{bullet}</span>
            </li>
          ))}
        </ol>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {chrome.introLater}
          </Button>
          <Button onClick={onStart}>{chrome.introStart}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
