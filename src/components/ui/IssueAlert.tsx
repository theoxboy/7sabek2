"use client";

import { Alert, AlertDescription } from "@/components/ui/Alert";
import { InfoHint } from "@/components/ui/InfoHint";

type IssueAlertTone = "default" | "warning" | "error";

export type IssueDisplay = {
  title: string;
  description: string;
  help?: string;
};

type IssueAlertProps = {
  issue: IssueDisplay;
  tone?: IssueAlertTone;
  className?: string;
};

export function IssueAlert({
  issue,
  tone = "error",
  className,
}: IssueAlertProps) {
  return (
    <Alert
      tone={tone}
      className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className ?? ""}`.trim()}
    >
      <AlertDescription className="space-y-1">
        <p className="font-semibold">{issue.title}</p>
        <p>{issue.description}</p>
      </AlertDescription>
      {issue.help ? (
        <InfoHint label={issue.title}>
          <p>{issue.help}</p>
        </InfoHint>
      ) : null}
    </Alert>
  );
}
