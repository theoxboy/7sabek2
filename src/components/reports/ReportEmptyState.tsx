import { ArrowRight, Rocket, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

type ReportEmptyStateProps = {
  title: string;
  description?: string;
  ctaLabel?: string;
  href?: string;
  icon?: "rocket" | "alert" | "default";
  className?: string;
};

const iconMap = {
  rocket: Rocket,
  alert: ShieldAlert,
  default: ArrowRight,
};

export function ReportEmptyState({
  title,
  description,
  ctaLabel,
  href,
  icon = "default",
  className,
}: ReportEmptyStateProps) {
  const Icon = iconMap[icon];
  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
          {description ? (
            <p className="text-xs text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
      </div>
      {ctaLabel && href ? (
        <Button asChild size="sm" variant="secondary">
          <Link href={href}>{ctaLabel}</Link>
        </Button>
      ) : null}
    </Card>
  );
}
