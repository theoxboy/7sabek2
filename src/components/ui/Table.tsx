"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

export type TableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  cell: (row: T) => React.ReactNode;
};

type TableProps<T> = {
  columns: Array<TableColumn<T>>;
  data: T[];
  getRowKey: (row: T) => string;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  emptyMessage?: string;
  loading?: boolean;
  skeletonRows?: number;
};

export function Table<T>({
  columns,
  data,
  getRowKey,
  sortKey,
  sortDirection = "asc",
  onSort,
  emptyMessage = "No data yet.",
  loading = false,
  skeletonRows = 5,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
          <tr>
            {columns.map((column) => {
              const isActive = sortKey === column.key;
              return (
                <th key={column.key} className={cn("py-2 pr-4", column.className)}>
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]"
                      aria-sort={
                        isActive
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      {column.header}
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 transition",
                          isActive && sortDirection === "asc" && "rotate-180",
                          !isActive && "opacity-40"
                        )}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, index) => (
              <tr key={`skeleton-${index}`}>
                <td colSpan={columns.length} className="py-4">
                  <div className="h-4 w-full animate-pulse rounded-full bg-[var(--surface-2)]" />
                </td>
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-4 text-sm text-[var(--muted)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className="py-3 pr-4">
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
