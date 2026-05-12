import * as React from "react";

import { cn } from "@/lib/cn";

type BadgeTone = "default" | "accent" | "muted" | "success" | "warning" | "error";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, string> = {
  default: "bg-[var(--surface-2)] text-[var(--ink)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  muted: "bg-[#efe7df] text-[var(--muted)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  error: "bg-[var(--error-soft)] text-[var(--error)]",
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
