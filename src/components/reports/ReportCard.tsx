import * as React from "react";
import { MoreHorizontal } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

type ReportCardProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  menu?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function ReportCard({
  title,
  description,
  actions,
  menu = false,
  className,
  children,
}: ReportCardProps) {
  return (
    <Card
      interactive
      className={cn(
        "report-card group flex h-full flex-col gap-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
          {description ? (
            <p className="text-xs text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {menu ? (
            <button
              type="button"
              aria-label="More options"
              className="rounded-full p-1 text-[var(--muted)] opacity-0 transition group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}
