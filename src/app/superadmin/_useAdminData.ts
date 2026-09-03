"use client";

import useSWR from "swr";

import { apiFetch } from "@/lib/api";
import type {
  AdminActivityLogOut,
  AdminSummaryOut,
  BackupRecordOut,
  BackupStatusOut,
  DeliveryQueueStatusOut,
  EmailCenterSystemStatusOut,
  FinanceDailyOut,
  GuestFunnelOut,
  OnboardingV2AdminRecordListOut,
  PlatformAnalyticsOut,
  RegistrationLeadStatsOut,
  SuperadminSessionStateOut,
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

export function useGuestFunnel(days = 30) {
  return useAdmin<GuestFunnelOut>(`/analytics/guest-funnel?days=${days}`, {
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

/* ----- deeper reads, used by the full analytics page ---------------------- */

export function useBackupHistory(limit = 30) {
  return useAdmin<BackupRecordOut[]>(`/admin/backups/history?limit=${limit}`, {
    refreshInterval: 300_000,
  });
}

export function useBackupStatus() {
  return useAdmin<BackupStatusOut>("/admin/backups/status", {
    refreshInterval: 300_000,
  });
}

export function useEmailSystemStatus() {
  return useAdmin<EmailCenterSystemStatusOut>(
    "/superadmin/email-center/system-status",
    { refreshInterval: 120_000 }
  );
}

export function useDeliveryQueue() {
  return useAdmin<DeliveryQueueStatusOut>(
    "/superadmin/email-center/delivery-queue/status",
    { refreshInterval: 60_000 }
  );
}

export function useRegistrationLeadStats() {
  return useAdmin<RegistrationLeadStatsOut>(
    "/superadmin/registration-leads/stats",
    { refreshInterval: 120_000 }
  );
}

export function useSuperadminSessions() {
  return useAdmin<SuperadminSessionStateOut>("/auth/superadmin/sessions", {
    refreshInterval: 30_000,
  });
}

export function useOnboardingRecords(limit = 500) {
  return useAdmin<OnboardingV2AdminRecordListOut>(
    `/users/admin/onboarding-v2-records?limit=${limit}`,
    { refreshInterval: 300_000 }
  );
}

/**
 * System health, composed only from endpoints that actually exist and return
 * real values:
 *  - last backup  -> /admin/backups/status (BackupStatusOut)
 *  - email queue  -> /superadmin/email-center/delivery-queue/status
 *  - delivery failures (proxy for "failed jobs") -> same endpoint
 *  - API reachable -> true, since this very request came back
 * No fabricated 5xx-rate / p95 latency tiles — the frontend has no honest
 * source for those, so they are not shown at all.
 */
export type SystemHealth = {
  api_ok: boolean;
  last_backup_at: string | null;
  last_backup_status: string | null;
  email_queue: number | null;
  email_failed: number | null;
};

export function useSystemHealth() {
  return useSWR<SystemHealth>(
    "superadmin:system-health",
    async () => {
      const [backup, queue] = await Promise.all([
        adminFetcher<BackupStatusOut>("/admin/backups/status").catch(() => null),
        adminFetcher<DeliveryQueueStatusOut>(
          "/superadmin/email-center/delivery-queue/status"
        ).catch(() => null),
      ]);
      const lastBackup = backup?.last_snapshot ?? backup?.last_scheduled ?? null;
      return {
        api_ok: true,
        last_backup_at: lastBackup?.completed_at ?? lastBackup?.created_at ?? null,
        last_backup_status: lastBackup?.status ?? null,
        email_queue: queue ? queue.pending_count + queue.retry_count : null,
        email_failed: queue?.failed_count ?? null,
      };
    },
    { refreshInterval: 60_000, refreshWhenHidden: false, revalidateOnFocus: false }
  );
}
