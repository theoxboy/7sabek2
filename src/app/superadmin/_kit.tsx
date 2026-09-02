"use client";

/**
 * Shared building blocks for the superadmin dashboard, aligned with the visual
 * language of the public landing page and the login screen: Cairo type,
 * emerald "authority" gradient (#124636 -> #0A241D), --accent tokens, pill
 * eyebrows, tabular-nums figures, soft card shadows. No hard-coded slate/white,
 * no per-component hex — colours come from CSS variables so light/dark/RTL all
 * work.
 */

import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/*  Card                                                                       */
/* -------------------------------------------------------------------------- */

export function AdminCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6",
        "shadow-[0_1px_2px_rgba(10,36,29,0.04),0_18px_40px_-24px_rgba(10,36,29,0.22)]",
        className
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Section eyebrow + heading                                                  */
/* -------------------------------------------------------------------------- */

export function CardHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-[15px] font-bold text-[var(--ink)]">{title}</p>
        {subtitle ? (
          <p className="text-xs text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--accent-strong)]">
      <span className="h-1.5 w-1.5 rounded-[2px] bg-[var(--accent)]" />
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Authority header (login-panel gradient)                                    */
/* -------------------------------------------------------------------------- */

export function AuthorityHeader({
  kicker,
  title,
  subtitle,
  right,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="admin-authority relative overflow-hidden rounded-[24px] px-6 py-6 text-white sm:px-8">
      <span className="admin-blob admin-blob-a" aria-hidden />
      <span className="admin-blob admin-blob-b" aria-hidden />
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white/90 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#17C777]" />
            {kicker}
          </span>
          <h1 className="text-[1.7rem] font-extrabold leading-tight sm:text-[2rem]">
            {title}
          </h1>
          <p className="max-w-[52ch] text-sm text-white/70">{subtitle}</p>
        </div>
        {right}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat chip (login "chip" style) + KPI card                                  */
/* -------------------------------------------------------------------------- */

export function Delta({ value, suffix }: { value: number | null; suffix?: string }) {
  if (value === null || Number.isNaN(value)) return null;
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
        positive
          ? "bg-[var(--success-soft)] text-[var(--success)]"
          : "bg-[var(--error-soft)] text-[var(--error)]"
      )}
    >
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {value}
      {suffix ?? "%"}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  delta,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  delta?: number | null;
  icon?: React.ReactNode;
}) {
  return (
    <AdminCard className="p-4 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]">
          {icon}
          {label}
        </span>
        {delta === undefined ? null : <Delta value={delta ?? null} />}
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-[var(--ink)]">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</p> : null}
    </AdminCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Range toggle                                                               */
/* -------------------------------------------------------------------------- */

export function RangeToggle<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold transition",
              active
                ? "bg-[var(--accent)] text-[#06301f]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chart frame — one place for loading / empty / error states                 */
/* -------------------------------------------------------------------------- */

export function ChartFrame({
  height = 260,
  loading,
  error,
  empty,
  labels,
  onRetry,
  children,
}: {
  height?: number;
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  labels: { loading: string; empty: string; error: string; retry: string };
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  const state = error ? "error" : loading ? "loading" : empty ? "empty" : "ok";

  return (
    <div style={{ height }} className="mt-4 w-full">
      {state === "ok" ? (
        children
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] text-center text-xs text-[var(--muted)]">
          {state === "loading" ? (
            <span className="admin-shimmer h-full w-full rounded-2xl" />
          ) : (
            <>
              <span className={state === "error" ? "text-[var(--error)]" : ""}>
                {state === "error" ? labels.error : labels.empty}
              </span>
              {state === "error" && onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-full border border-[var(--border)] px-3 py-1 font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
                >
                  {labels.retry}
                </button>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chart palette from CSS tokens (keeps charts theme-aware)                    */
/* -------------------------------------------------------------------------- */

export type ChartPalette = {
  accent: string;
  positive: string;
  negative: string;
  neutral: string;
  amber: string;
  grid: string;
  muted: string;
  track: string;
};

const FALLBACK_PALETTE: ChartPalette = {
  accent: "#17c777",
  positive: "#17c777",
  negative: "#f2686b",
  neutral: "#4c7eff",
  amber: "#f2a93b",
  grid: "#e3e8df",
  muted: "#7c8d86",
  track: "#eef1ea",
};

export function useChartPalette(): ChartPalette {
  const [palette, setPalette] = React.useState<ChartPalette>(FALLBACK_PALETTE);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      const pick = (name: string, fallback: string) =>
        styles.getPropertyValue(name).trim() || fallback;
      setPalette({
        accent: pick("--accent", FALLBACK_PALETTE.accent),
        positive: pick("--success", FALLBACK_PALETTE.positive),
        negative: pick("--error", FALLBACK_PALETTE.negative),
        neutral: FALLBACK_PALETTE.neutral,
        amber: pick("--warning", FALLBACK_PALETTE.amber),
        grid: pick("--border", FALLBACK_PALETTE.grid),
        muted: pick("--muted", FALLBACK_PALETTE.muted),
        track: pick("--surface-2", FALLBACK_PALETTE.track),
      });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return palette;
}

/* -------------------------------------------------------------------------- */
/*  Progress row (funnel / breakdown)                                          */
/* -------------------------------------------------------------------------- */

export function ProgressRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--ink)]">{label}</span>
        <span className="text-xs tabular-nums text-[var(--muted)]">
          {pct}% · {value.toLocaleString()}/{total.toLocaleString()}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color ?? "var(--accent)" }}
        />
      </div>
    </div>
  );
}
