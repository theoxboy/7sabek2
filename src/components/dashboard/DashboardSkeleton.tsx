/**
 * Loading placeholder for the dashboard.
 *
 * It took a locale and the whole copy dictionary and used neither - only the
 * text direction actually reaches the markup - so both were dropped along with
 * the `any` they were typed with.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Dashboard Cockpit Skeleton */}
      <div className="dashboard-cockpit animate-pulse p-6">
        {/* Header section skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--border)] dark:border-slate-800">
          <div className="space-y-3">
            <div className="h-8 w-48 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="h-4 w-72 rounded-lg bg-[var(--surface-2)] dark:bg-slate-800" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-32 rounded-full bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="h-8 w-28 rounded-full bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="h-8 w-28 rounded-full bg-[var(--surface-2)] dark:bg-slate-800" />
          </div>
        </div>

        {/* Three Column Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          {/* Column 1: Flows skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-36 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm space-y-2 dark:border-slate-800">
                  <div className="h-3 w-16 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  <div className="h-5 w-20 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  <div className="h-2.5 w-24 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Envelopes status skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-36 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm space-y-4 dark:border-slate-800 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="h-5 w-8 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                    <div className="h-2.5 w-12 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-[var(--surface-2)] dark:bg-slate-800" />
                <div className="flex justify-between items-center">
                  <div className="h-2.5 w-20 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  <div className="h-2.5 w-16 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Urgent needs skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-36 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm space-y-3 dark:border-slate-800 flex-1 flex flex-col justify-center items-center">
              <div className="h-10 w-10 rounded-full bg-[var(--surface-2)] dark:bg-slate-800 animate-pulse" />
              <div className="h-3.5 w-28 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
              <div className="h-2.5 w-48 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="dashboard-main-grid">
        {/* Left Column (Circular summary chart & recent expenses) */}
        <div className="flex flex-col gap-4">
          {/* Circular Chart Card Skeleton */}
          <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4 animate-pulse">
            <div className="h-6 w-48 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-6">
              {/* Outer circular indicator skeleton */}
              <div className="relative flex items-center justify-center h-44 w-44 rounded-full border-[18px] border-[var(--surface-2)] dark:border-slate-800">
                <div className="h-24 w-24 rounded-full bg-[var(--surface-2)] dark:bg-slate-800" />
              </div>
              <div className="space-y-3 w-full max-w-[200px]">
                <div className="h-4 w-full rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                <div className="h-4 w-[80%] rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                <div className="h-4 w-[60%] rounded bg-[var(--surface-2)] dark:bg-slate-800" />
              </div>
            </div>
          </div>

          {/* Top Envelopes list skeleton */}
          <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="h-6 w-36 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
              <div className="h-8 w-24 rounded-lg bg-[var(--surface-2)] dark:bg-slate-800" />
            </div>
            <div className="h-10 w-48 rounded-lg bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="space-y-3">
              {[1, 2, 3].map((k) => (
                <div
                  key={k}
                  className="flex items-center justify-between h-14 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4"
                >
                  <div className="space-y-2">
                    <div className="h-4 w-24 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                    <div className="h-3 w-36 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  </div>
                  <div className="h-6 w-20 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Cash Split, Risk, Anomalies) */}
        <div className="flex flex-col gap-4">
          {/* Cash Split Widget Skeleton */}
          <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="h-6 w-36 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
              <div className="h-8 w-28 rounded-lg bg-[var(--surface-2)] dark:bg-slate-800" />
            </div>
            <div className="h-4 w-64 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-12 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
              <div className="h-12 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
              <div className="h-12 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
            </div>
            <div className="h-8 w-full rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
          </div>

          {/* Risk Envelopes Skeleton */}
          <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4 animate-pulse">
            <div className="h-6 w-44 rounded-xl bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="h-4 w-56 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
            <div className="space-y-2">
              {[1, 2].map((r) => (
                <div
                  key={r}
                  className="flex items-center justify-between h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4"
                >
                  <div className="h-4 w-28 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                  <div className="h-6 w-16 rounded bg-[var(--surface-2)] dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
