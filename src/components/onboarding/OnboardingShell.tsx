"use client";

import { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressSteps } from "@/components/onboarding/ProgressSteps";

type Step = {
  id: number;
  label: string;
};

type OnboardingShellProps = {
  title: string;
  subtitle: string;
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  progressHint?: string;
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  onFinishLater?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextMessage?: string;
  children: ReactNode;
};

export function OnboardingShell({
  title,
  subtitle,
  steps,
  currentStep,
  completedSteps,
  progressHint,
  onBack,
  onNext,
  onSkip,
  onFinishLater,
  nextLabel = "Continuer",
  nextDisabled = false,
  nextMessage,
  children,
}: OnboardingShellProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} subtitle={subtitle} />
      <ProgressSteps
        steps={steps}
        currentStep={currentStep}
        completedSteps={completedSteps}
      />
      {progressHint ? (
        <div className="text-xs font-medium text-[var(--muted)]">
          {progressHint}
        </div>
      ) : null}
      <Card className="space-y-6">
        {children}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {onBack ? (
              <Button variant="ghost" size="sm" onClick={() => onBack()}>
                Retour
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {onSkip ? (
              <Button variant="ghost" size="sm" onClick={() => onSkip()}>
                Passer pour l’instant
              </Button>
            ) : null}
            {onFinishLater ? (
              <Button variant="ghost" size="sm" onClick={() => onFinishLater()}>
                Terminer plus tard
              </Button>
            ) : null}
            {onNext ? (
              <div className="flex items-center gap-3">
                {nextMessage ? (
                  <span className="text-xs font-medium text-red-600">
                    {nextMessage}
                  </span>
                ) : null}
                <Button onClick={() => onNext()} disabled={nextDisabled}>
                  {nextLabel}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
