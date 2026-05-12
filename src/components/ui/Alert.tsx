import * as React from "react";

import { cn } from "@/lib/cn";

type AlertTone = "default" | "warning" | "error";

const toneStyles: Record<AlertTone, string> = {
  default: "bg-[var(--surface-2)] text-[var(--ink)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  error: "bg-[var(--error-soft)] text-[var(--error)]",
};

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
};

export function Alert({ tone = "default", className, ...props }: AlertProps) {
  return (
    <div
      className={cn("rounded-2xl px-4 py-3 text-sm", toneStyles[tone], className)}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm", className)} {...props} />;
}
