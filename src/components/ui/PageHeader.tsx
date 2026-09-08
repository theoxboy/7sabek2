"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Set to false to render a plain header without the glowing cockpit panel. */
  glow?: boolean;
};

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  glow = true,
}: PageHeaderProps) {
  const inner = (
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );

  if (!glow) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <div
      className={cn(
        "dashboard-cockpit relative overflow-hidden p-6",
        className
      )}
      onPointerMove={(event) => {
        const target = event.currentTarget;
        const rect = target.getBoundingClientRect();
        target.style.setProperty(
          "--mx",
          `${((event.clientX - rect.left) / rect.width) * 100}%`
        );
        target.style.setProperty(
          "--my",
          `${((event.clientY - rect.top) / rect.height) * 100}%`
        );
      }}
    >
      <div className="dashboard-cockpit__decorative-glow dashboard-cockpit__decorative-glow--emerald" />
      <div className="dashboard-cockpit__decorative-glow dashboard-cockpit__decorative-glow--indigo" />
      <div aria-hidden="true" className="dashboard-cockpit__spot" />
      <div className="relative">{inner}</div>
    </div>
  );
}
