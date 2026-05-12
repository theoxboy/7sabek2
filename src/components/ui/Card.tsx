import * as React from "react";

import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] transition duration-200 motion-reduce:transition-none",
        interactive
          ? "group relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[var(--shadow)]"
          : null,
        interactive
          ? "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-card)-2px)] before:ring-1 before:ring-transparent hover:before:ring-[var(--accent-soft)]"
          : null,
        className
      )}
      {...props}
    />
  );
}
