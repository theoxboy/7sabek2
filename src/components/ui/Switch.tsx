import * as React from "react";

import { cn } from "@/lib/cn";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      dir="ltr"
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-emerald-500 bg-emerald-500 shadow-[0_10px_20px_-12px_rgba(16,185,129,0.55)]"
          : "border-[#d1d1d6] bg-[#e9e9ed] shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] hover:bg-[#e2e2e8]",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-7 w-7 rounded-full bg-[var(--surface)] shadow-[0_2px_8px_rgba(15,23,42,0.22)] transition-transform duration-200 will-change-transform",
          checked ? "translate-x-6" : "translate-x-0"
        )}
      />
    </button>
  );
}
