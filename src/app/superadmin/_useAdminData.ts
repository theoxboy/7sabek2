"use client";

import useSWR from "swr";

import { apiFetch } from "@/lib/api";
import type {
  AdminActivityLogOut,
  AdminSummaryOut,
  FinanceDailyOut,
  PlatformAnalyticsOut,
  PlatformStatusOut,
  TrafficSummaryOut,
  UserOut,
} from "@/lib/types";

/**
 * Every superadmin read goes through here. Notes vs. the previous page:
 *  - SWR de-dupes and caches; `refreshWhenHidden` defaults to false so the
 *    polling loops pause when the tab is in the background (previously three
 *    overlapping 3s setInterval loops ran forever).
 *  - The old per-user N+1 (GET /transactions + /categories for every account,
 *    sequentially, in the browser) is gone. Aggregates come from
 *    /analytics/platform and /analytics/finance.
 */

const adminFetcher = <T,>(path: string) =>
  apiFetch<T>(path, { headers: { "x-admin-bypass": "true" } });

type SwrOpts = { refreshInterval?: number };

function useAdmin<T>(key: string | null, opts: SwrOpts = {}) {
  return useSWR<T>(key, adminFetcher, {
    refreshWhenHidden: false,
    revalidateOnFocus: false,
    keepPreviousData: true,
    ...opts,
  });
}

export function useAdminSummary() {
  return useAdmin<AdminSummaryOut>("/users/admin/summary", {
    refreshInterval: 60_000,
  });
}

export function usePlatformAnalytics(days = 30) {
  return useAdmin<PlatformAnalyticsOut>(`/analytics/platform?days=${days}`, {
    refreshInterval: 60_000,
  });
}

export function useTrafficSummary(days = 7) {
  return useAdmin<TrafficSummaryOut>(`/analytics/traffic?days=${days}`, {
    refreshInterval: 120_000,
  });
}

export function useFinanceSeries(days: number) {
  return useAdmin<FinanceDailyOut[]>(`/analytics/finance?days=${days}`, {
    refreshInterval: 120_000,
  });
}

export function useActivityLog(limit = 12) {
  return useAdmin<AdminActivityLogOut[]>(`/admin/activity?limit=${limit}`, {
    refreshInterval: 15_000,
  });
}

export function useAllUsers() {
  return useAdmin<UserOut[]>("/users", { refreshInterval: 120_000 });
}

/**
 * System health. `/superadmin/system-health` is not guaranteed to exist yet on
 * the backend — the hook degrades to the public status endpoint and finally to
 * nulls, so the health bar renders "n/a" rather than breaking the page.
 */
export type SystemHealth = {
  api_ok: boolean | null;
  error_rate_5xx: number | null;
  latency_p95_ms: number | null;
  last_backup_at: string | null;
  failed_jobs: number | null;
  email_queue: number | null;
};

const emptyHealth: SystemHealth = {
  api_ok: null,
  error_rate_5xx: null,
  latency_p95_ms: null,
  last_backup_at: null,
  failed_jobs: null,
  email_queue: null,
};

export function useSystemHealth() {
  return useSWR<SystemHealth>(
    "superadmin:system-health",
    async () => {
      try {
        return await adminFetcher<SystemHealth>("/superadmin/system-health");
      } catch {
        try {
          const status = await apiFetch<PlatformStatusOut>(
            "/public/platform-status"
          );
          return {
            ...emptyHealth,
            api_ok: Boolean(status),
          };
        } catch {
          return emptyHealth;
        }
      }
    },
    { refreshInterval: 30_000, refreshWhenHidden: false, revalidateOnFocus: false }
  );
}
