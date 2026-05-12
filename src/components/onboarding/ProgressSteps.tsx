"use client";

import { cn } from "@/lib/cn";

type Step = {
  id: number;
  label: string;
};

type ProgressStepsProps = {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
};

export function ProgressSteps({
  steps,
  currentStep,
  completedSteps,
}: ProgressStepsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isComplete = completedSteps.includes(step.id);
          const isLast = index === steps.length - 1;
          return (
            <div key={step.id} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                  isComplete
                    ? "bg-[var(--accent-strong)] text-white"
                    : isActive
                    ? "bg-[var(--ink)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--muted)]"
                )}
              >
                {step.id}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive || isComplete
                    ? "text-[var(--ink)]"
                    : "text-[var(--muted)]"
                )}
              >
                {step.label}
              </span>
              {!isLast ? (
                <div className="ml-auto h-px flex-1 bg-[var(--border)]" />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--accent-strong)] transition-all"
          style={{
            width: `${(currentStep / steps.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
