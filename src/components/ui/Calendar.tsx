import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "space-y-4",
        caption: "flex items-center justify-between px-2",
        caption_label: "text-sm font-medium text-[var(--ink)]",
        nav: "flex items-center gap-1",
        nav_button:
          "h-8 w-8 rounded-full border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "w-9 text-xs font-medium text-[var(--muted)] uppercase",
        row: "flex w-full",
        cell: "h-9 w-9 text-center text-sm",
        day: "h-9 w-9 rounded-full hover:bg-[var(--surface-2)]",
        day_selected:
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]",
        day_today: "border border-[var(--accent)]",
        day_outside: "text-[var(--muted)] opacity-50",
        day_disabled: "text-[var(--muted)] opacity-40",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...iconProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...iconProps} />
          ),
      }}
      {...props}
    />
  );
}
