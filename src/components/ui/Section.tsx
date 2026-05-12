import * as React from "react";

import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";

type SectionProps = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function Section({
  title,
  subtitle,
  actions,
  className,
  children,
}: SectionProps) {
  return (
    <Card className={cn("space-y-4", className)}>
      {title || actions ? (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold text-[var(--ink)]">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="text-sm text-[var(--muted)]">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div>{children}</div>
    </Card>
  );
}
