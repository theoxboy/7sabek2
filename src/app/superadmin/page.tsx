"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";

import { DASHBOARD_COPY } from "./_dashboardCopy";
import {
  AdminCard,
  AuthorityHeader,
  CardHead,
  ChartFrame,
  Delta,
  KpiCard,
  ProgressRow,
  RangeToggle,
  SectionEyebrow,
  useChartPalette,
} from "./_kit";
import {
  useActivityLog,
  useAdminSummary,
  useAllUsers,
  useFinanceSeries,
  usePlatformAnalytics,
  useSystemHealth,
  useTrafficSummary,
} from "./_useAdminData";

type FinanceMode = "amount" | "count";
type RangeDays = 7 | 30 | 90 | 365;

export default function SuperAdminPage() {
  const { locale, dir } = useAppLocale("fr");
  useForceArabicDocumentFont(locale === "ar", "superadmin-dashboard-ar-body");
  const copy = DASHBOARD_COPY[locale];
  const palette = useChartPalette();

  const [range, setRange] = useState<RangeDays>(30);
  const [financeMode, setFinanceMode] = useState<FinanceMode>("amount");

  const summary = useAdminSummary();
  const analytics = usePlatformAnalytics(30);
  const traffic = useTrafficSummary(7);
  const finance = useFinanceSeries(range);
  const activity = useActivityLog(12);
  const users = useAllUsers();
  const health = useSystemHealth();

  const nf = useMemo(
    () => new Intl.NumberFormat(copy.locale, { maximumFractionDigits: 0 }),
    [copy.locale]
  );
  const fmt = (value: number | null | undefined) =>
    value === null || value === undefined || Number.isNaN(value)
      ? "—"
      : nf.format(value);

  const stateLabels = copy.state;

  /* --------------------------- derived: finance --------------------------- */

  const financeAmount = useMemo(() => {
    const series = finance.data ?? [];
    if (range === 365) {
      const byMonth = new Map<string, { income: number; expense: number }>();
      for (const row of series) {
        const key = row.date.slice(0, 7);
        const cur = byMonth.get(key) ?? { income: 0, expense: 0 };
        cur.income += Number(row.income) || 0;
        cur.expense += Number(row.expense) || 0;
        byMonth.set(key, cur);
      }
      return [...byMonth.entries()].map(([month, totals]) => ({
        name: new Date(`${month}-01`).toLocaleDateString(copy.locale, {
          month: "short",
          year: "2-digit",
        }),
        income: Math.round(totals.income),
        expense: Math.round(totals.expense),
      }));
    }
    return series.map((row) => ({
      name: new Date(row.date).toLocaleDateString(copy.locale, {
        day: "2-digit",
        month: "2-digit",
      }),
      income: Math.round(Number(row.income) || 0),
      expense: Math.round(Number(row.expense) || 0),
    }));
  }, [finance.data, range, copy.locale]);

  const financeCount = useMemo(() => {
    const series = analytics.data?.transactions_daily ?? [];
    return series.map((row) => ({
      name: new Date(row.date).toLocaleDateString(copy.locale, {
        day: "2-digit",
        month: "2-digit",
      }),
      total: row.total_count,
      income: row.income_count,
      expense: row.expense_count,
    }));
  }, [analytics.data, copy.locale]);

  const financeTotals = useMemo(() => {
    const income = financeAmount.reduce((sum, row) => sum + row.income, 0);
    const expense = financeAmount.reduce((sum, row) => sum + row.expense, 0);
    return { income, expense, net: income - expense };
  }, [financeAmount]);

  /* -------------------------- derived: acquisition ----------------------- */

  /**
   * Acquisition = EXTERNAL traffic only. "internal" pageviews are dominated by
   * the superadmin's own navigation (the layout POSTs a pageview on every
   * superadmin route change), so counting them would make the headline
   * meaningless. Internal is surfaced separately as a muted footnote.
   */
  const traffic_ = useMemo(() => {
    const sources = traffic.data?.sources ?? {};
    const total = Math.max(0, traffic.data?.total ?? 0);
    const direct = Math.max(0, Math.round(sources.direct ?? 0));
    const referral = Math.max(0, Math.round(sources.referral ?? 0));
    const organic = Math.max(
      0,
      Math.round(sources.organic ?? sources.organique ?? 0)
    );
    const external = direct + referral + organic;
    const internal = Math.max(0, total - external);
    return {
      external,
      internal,
      data: [
        { name: copy.acquisition.sourceDirect, value: direct, color: palette.accent },
        { name: copy.acquisition.sourceReferral, value: referral, color: palette.amber },
        { name: copy.acquisition.sourceOrganic, value: organic, color: palette.neutral },
      ],
    };
  }, [traffic.data, palette, copy.acquisition]);
  const trafficData = traffic_.data;

  const trafficDelta = useMemo(() => {
    // Compare like-for-like: current external vs the previous window's external
    // is not exposed by the API, so only show a delta when we have both totals
    // and they are large enough to be meaningful.
    const current = traffic.data?.total ?? 0;
    const previous = traffic.data?.previous_total ?? 0;
    if (previous < 20 || current < 20) return null;
    return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  }, [traffic.data]);

  const trafficSpark = useMemo(
    () =>
      (traffic.data?.daily ?? []).map((row, index) => ({
        name: String(index + 1),
        value: row.count,
      })),
    [traffic.data]
  );

  /* ------------------------------ derived: kpi --------------------------- */

  const userGrowthDelta = useMemo(() => {
    const growth = analytics.data?.user_growth ?? [];
    if (growth.length < 14) return null;
    const last7 = growth.slice(-7).reduce((s, r) => s + r.count, 0);
    const prev7 = growth.slice(-14, -7).reduce((s, r) => s + r.count, 0);
    // A percentage swing off 1-2 signups ("+100%") is noise, not a trend.
    if (last7 + prev7 < 10) return null;
    if (prev7 === 0) return null;
    return Math.round(((last7 - prev7) / prev7) * 1000) / 10;
  }, [analytics.data]);

  const h = analytics.data?.health;
  const onboarding = analytics.data?.onboarding;
  const activationRate =
    onboarding && onboarding.total_users > 0
      ? Math.round((onboarding.transactions / onboarding.total_users) * 100)
      : null;
  const lastMonthFinance =
    analytics.data?.monthly_finance?.[analytics.data.monthly_finance.length - 1];
  const monthVolume = lastMonthFinance
    ? Math.round(lastMonthFinance.income + lastMonthFinance.expense)
    : null;

  /* ---------------------------- derived: users -------------------------- */

  const userGrowthData = useMemo(
    () =>
      (analytics.data?.user_growth ?? []).map((row) => ({
        name: new Date(row.date).toLocaleDateString(copy.locale, {
          day: "2-digit",
          month: "2-digit",
        }),
        count: row.count,
      })),
    [analytics.data, copy.locale]
  );

  const weeklyActiveData = useMemo(
    () =>
      (analytics.data?.weekly_active ?? []).map((row) => ({
        name: new Date(row.week).toLocaleDateString(copy.locale, {
          day: "2-digit",
          month: "2-digit",
        }),
        count: row.count,
      })),
    [analytics.data, copy.locale]
  );

  const churnData = useMemo(() => {
    const colors = [palette.positive, palette.amber, palette.negative, palette.muted];
    return (analytics.data?.churn ?? []).map((row, index) => ({
      name: row.label,
      value: row.count,
      color: colors[index % colors.length],
    }));
  }, [analytics.data, palette]);

  const segments = useMemo(() => {
    const list = users.data ?? [];
    const now = Date.now();
    const isSuspended = (u: (typeof list)[number]) =>
      u.status === "suspended" ||
      (u.suspended_until ? new Date(u.suspended_until).getTime() > now : false);
    const beta = list.filter((u) => u.is_beta_tester).length;
    const superadmin = list.filter((u) => u.role === "superadmin").length;
    return {
      total: list.length,
      standard: list.length - beta - superadmin,
      beta,
      superadmin,
      suspended: list.filter(isSuspended).length,
      // End users only — a superadmin has no onboarding to complete.
      onboardingIncomplete: list.filter(
        (u) =>
          u.role !== "superadmin" && u.has_completed_onboarding_v2 === false
      ).length,
    };
  }, [users.data]);

  const riskAccounts = useMemo(() => {
    const list = users.data ?? [];
    const now = Date.now();
    const rows: { id: string; email: string; reason: string }[] = [];
    for (const u of list) {
      if (u.role === "superadmin") continue;
      const suspended =
        u.status === "suspended" ||
        (u.suspended_until
          ? new Date(u.suspended_until).getTime() > now
          : false);
      let reason: string | null = null;
      if (suspended) reason = copy.risk.reasonSuspended;
      else if (u.password_reset_blocked) reason = copy.risk.reasonMustReset;
      else if (u.has_completed_onboarding_v2 === false)
        reason = copy.risk.reasonNoOnboarding;
      if (reason) rows.push({ id: u.id, email: u.email, reason });
    }
    return rows.slice(0, 8);
  }, [users.data, copy.risk]);

  /* ------------------------------ health bar --------------------------- */

  const healthItems = useMemo(() => {
    const d = health.data;
    const backupAt = d?.last_backup_at ? new Date(d.last_backup_at) : null;
    const backupFresh =
      backupAt && !Number.isNaN(backupAt.getTime())
        ? Date.now() - backupAt.getTime() < 36 * 3600 * 1000
        : null;
    return [
      {
        label: copy.health.api,
        value: copy.health.operational,
        ok: true,
      },
      {
        label: copy.health.lastBackup,
        value: backupAt
          ? backupAt.toLocaleString(copy.locale, {
              dateStyle: "short",
              timeStyle: "short",
            })
          : copy.health.unknown,
        ok: d?.last_backup_status
          ? d.last_backup_status === "success" && backupFresh
          : backupFresh,
      },
      {
        label: copy.health.emailQueue,
        value:
          d?.email_queue === null || d?.email_queue === undefined
            ? copy.health.unknown
            : fmt(d.email_queue),
        ok:
          d?.email_queue === null || d?.email_queue === undefined
            ? null
            : d.email_queue < 50,
      },
      {
        label: copy.health.emailFailed,
        value:
          d?.email_failed === null || d?.email_failed === undefined
            ? copy.health.unknown
            : fmt(d.email_failed),
        ok:
          d?.email_failed === null || d?.email_failed === undefined
            ? null
            : d.email_failed === 0,
      },
    ];
  }, [health.data, copy, fmt]);

  const rtl = dir === "rtl";
  const chartLabels = {
    loading: stateLabels.loading,
    empty: stateLabels.empty,
    error: stateLabels.error,
    retry: stateLabels.retry,
  };

  const statusTone = (status: string) => {
    if (status === "success")
      return "bg-[var(--success-soft)] text-[var(--success)]";
    if (status === "error") return "bg-[var(--error-soft)] text-[var(--error)]";
    return "bg-[var(--surface-2)] text-[var(--muted)]";
  };

  return (
    <div
      dir={dir}
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-6 text-[var(--ink)] sm:px-6"
    >
      <AuthorityHeader
        kicker={copy.kicker}
        title={copy.title}
        subtitle={copy.subtitle}
        right={
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 backdrop-blur">
              <Users className="h-4 w-4" />
              {fmt(summary.data?.users)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 backdrop-blur">
              <DollarSign className="h-4 w-4" />
              {fmt(summary.data?.transactions)}
            </span>
          </div>
        }
      />

      {/* ------------------------- system health bar ----------------------- */}
      <AdminCard className="sticky top-2 z-20 p-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[var(--accent-strong)]" />
          <p className="text-[13px] font-bold">{copy.health.title}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {healthItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background:
                      item.ok === null
                        ? "var(--muted)"
                        : item.ok
                        ? "var(--success)"
                        : "var(--error)",
                  }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {item.label}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm font-bold tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* ----------------------------- KPI row ----------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label={copy.kpi.users}
          value={fmt(summary.data?.users)}
          delta={userGrowthDelta}
          hint={copy.kpi.vsPrev}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label={copy.kpi.activeUsers}
          value={fmt(h?.active_users_7d)}
          hint={`${copy.kpi.last7d} · ${fmt(h?.total_users)}`}
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label={copy.kpi.transactions}
          value={fmt(summary.data?.transactions)}
          hint={
            h?.transactions_7d === null || h?.transactions_7d === undefined
              ? copy.kpi.allTime
              : `${copy.kpi.allTime} · ${fmt(h.transactions_7d)} / ${copy.kpi.last7d}`
          }
          icon={<DollarSign className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label={copy.kpi.activationRate}
          value={activationRate === null ? "—" : `${activationRate}%`}
          hint={copy.users.stepTransactions}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <KpiCard
          label={copy.kpi.volume}
          value={monthVolume === null ? "—" : `${fmt(monthVolume)} MAD`}
          hint={copy.kpi.last30d}
          icon={<ArrowUpRight className="h-3.5 w-3.5" />}
        />
      </div>

      {/* --------------------- finance + acquisition ---------------------- */}
      <div className="grid gap-6 lg:grid-cols-12">
        <AdminCard className="lg:col-span-8">
          <CardHead
            title={copy.finance.title}
            subtitle={copy.finance.subtitle}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <RangeToggle<FinanceMode>
                  value={financeMode}
                  onChange={setFinanceMode}
                  options={[
                    { label: copy.finance.tabAmount, value: "amount" },
                    { label: copy.finance.tabCount, value: "count" },
                  ]}
                />
                {financeMode === "amount" ? (
                  <RangeToggle<RangeDays>
                    value={range}
                    onChange={setRange}
                    options={[
                      { label: copy.finance.ranges.d7, value: 7 },
                      { label: copy.finance.ranges.d30, value: 30 },
                      { label: copy.finance.ranges.d90, value: 90 },
                      { label: copy.finance.ranges.m12, value: 365 },
                    ]}
                  />
                ) : null}
              </div>
            }
          />
          {financeMode === "amount" ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {copy.finance.cumulative}:{" "}
              <span className="font-bold text-[var(--ink)]">
                {fmt(financeTotals.net)} MAD
              </span>{" "}
              · {copy.finance.income} {fmt(financeTotals.income)} ·{" "}
              {copy.finance.expense} {fmt(financeTotals.expense)}
            </p>
          ) : null}

          {financeMode === "amount" ? (
            <ChartFrame
              height={288}
              loading={finance.isLoading}
              error={Boolean(finance.error)}
              empty={financeAmount.length === 0}
              labels={chartLabels}
              onRetry={() => finance.mutate()}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeAmount}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                  <XAxis dataKey="name" reversed={rtl} tick={{ fontSize: 11 }} />
                  <YAxis
                    orientation={rtl ? "right" : "left"}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="income"
                    name={copy.finance.income}
                    fill={palette.positive}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name={copy.finance.expense}
                    fill={palette.negative}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          ) : (
            <ChartFrame
              height={288}
              loading={analytics.isLoading}
              error={Boolean(analytics.error)}
              empty={financeCount.length === 0}
              labels={chartLabels}
              onRetry={() => analytics.mutate()}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={financeCount}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                  <XAxis dataKey="name" reversed={rtl} tick={{ fontSize: 11 }} />
                  <YAxis
                    orientation={rtl ? "right" : "left"}
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name={copy.finance.txTotal}
                    stroke={palette.accent}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name={copy.finance.txIncome}
                    stroke={palette.positive}
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name={copy.finance.txExpense}
                    stroke={palette.negative}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          )}
        </AdminCard>

        <AdminCard className="lg:col-span-4">
          <CardHead
            title={copy.acquisition.title}
            subtitle={copy.acquisition.subtitle}
            action={<Delta value={trafficDelta} />}
          />
          <ChartFrame
            height={168}
            loading={traffic.isLoading}
            error={Boolean(traffic.error)}
            empty={trafficData.every((row) => row.value === 0)}
            labels={chartLabels}
            onRetry={() => traffic.mutate()}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trafficData}
                  dataKey="value"
                  innerRadius={44}
                  outerRadius={70}
                  stroke="none"
                >
                  {trafficData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 space-y-1.5">
            {trafficData.map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between text-xs text-[var(--muted)]"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: row.color }}
                  />
                  {row.name}
                </span>
                <span className="tabular-nums">{fmt(row.value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficSpark}>
                <defs>
                  <linearGradient id="acqSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={palette.accent}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor={palette.accent}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={palette.accent}
                  strokeWidth={2}
                  fill="url(#acqSpark)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm font-bold tabular-nums text-[var(--ink)]">
            {fmt(traffic_.external)} {copy.acquisition.visits}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            + {fmt(traffic_.internal)} {copy.acquisition.sourceInternal}
          </p>
        </AdminCard>
      </div>

      {/* ----------------------------- users ----------------------------- */}
      <div className="space-y-3">
        <SectionEyebrow>{copy.users.title}</SectionEyebrow>
        <div className="grid gap-6 lg:grid-cols-12">
          <AdminCard className="lg:col-span-7">
            <CardHead
              title={copy.users.growthTitle}
              subtitle={copy.users.growthSub}
            />
            <ChartFrame
              height={224}
              loading={analytics.isLoading}
              error={Boolean(analytics.error)}
              empty={userGrowthData.length === 0}
              labels={chartLabels}
              onRetry={() => analytics.mutate()}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="uGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={palette.accent}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={palette.accent}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                  <XAxis dataKey="name" reversed={rtl} tick={{ fontSize: 11 }} />
                  <YAxis
                    orientation={rtl ? "right" : "left"}
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={copy.users.growthTitle}
                    stroke={palette.accent}
                    strokeWidth={2}
                    fill="url(#uGrowth)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartFrame>
          </AdminCard>

          <AdminCard className="lg:col-span-5">
            <CardHead
              title={copy.users.funnelTitle}
              subtitle={copy.users.funnelSub}
            />
            <div className="mt-4 space-y-3">
              <ProgressRow
                label={copy.users.stepSignup}
                value={onboarding?.total_users ?? 0}
                total={onboarding?.total_users ?? 0}
              />
              <ProgressRow
                label={copy.users.stepEnvelopes}
                value={onboarding?.envelopes ?? 0}
                total={onboarding?.total_users ?? 0}
              />
              <ProgressRow
                label={copy.users.stepCategories}
                value={onboarding?.categories ?? 0}
                total={onboarding?.total_users ?? 0}
              />
              <ProgressRow
                label={copy.users.stepTransactions}
                value={onboarding?.transactions ?? 0}
                total={onboarding?.total_users ?? 0}
                color="var(--accent-strong)"
              />
            </div>
            <div className="mt-4 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--accent-strong)]">
              {copy.users.avgDaysToFirstTx}:{" "}
              <span className="font-bold tabular-nums">
                {analytics.data?.avg_days_to_first_tx?.toFixed(1) ?? "0"}
              </span>{" "}
              {copy.users.days}
            </div>
          </AdminCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <AdminCard className="lg:col-span-7">
            <CardHead
              title={copy.users.wauTitle}
              subtitle={copy.users.wauSub}
            />
            <ChartFrame
              height={200}
              loading={analytics.isLoading}
              error={Boolean(analytics.error)}
              empty={weeklyActiveData.length === 0}
              labels={chartLabels}
              onRetry={() => analytics.mutate()}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActiveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                  <XAxis dataKey="name" reversed={rtl} tick={{ fontSize: 11 }} />
                  <YAxis
                    orientation={rtl ? "right" : "left"}
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name={copy.users.wauTitle}
                    fill={palette.neutral}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </AdminCard>

          <AdminCard className="lg:col-span-5">
            <CardHead
              title={copy.users.churnTitle}
              subtitle={copy.users.churnSub}
            />
            <ChartFrame
              height={160}
              loading={analytics.isLoading}
              error={Boolean(analytics.error)}
              empty={churnData.length === 0}
              labels={chartLabels}
              onRetry={() => analytics.mutate()}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={churnData}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={62}
                    stroke="none"
                  >
                    {churnData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartFrame>
            <div className="mt-3 space-y-1.5">
              {churnData.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between text-xs text-[var(--muted)]"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: row.color }}
                    />
                    {row.name}
                  </span>
                  <span className="tabular-nums">{fmt(row.value)}</span>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      </div>

      {/* --------------------- segments + risk + quality ------------------ */}
      <div className="grid gap-6 lg:grid-cols-12">
        <AdminCard className="lg:col-span-4">
          <CardHead
            title={copy.segments.title}
            subtitle={copy.segments.subtitle}
          />
          <div className="mt-4 space-y-3 text-sm">
            {[
              { label: copy.segments.total, value: segments.total },
              { label: copy.segments.standard, value: segments.standard },
              { label: copy.segments.beta, value: segments.beta },
              { label: copy.segments.superadmin, value: segments.superadmin },
              { label: copy.segments.suspended, value: segments.suspended },
              {
                label: copy.segments.onboardingIncomplete,
                value: segments.onboardingIncomplete,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0 last:pb-0"
              >
                <span className="text-[var(--ink)]">{row.label}</span>
                <span className="font-bold tabular-nums">{fmt(row.value)}</span>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard className="lg:col-span-4">
          <CardHead title={copy.risk.title} subtitle={copy.risk.subtitle} />
          <div className="mt-4 space-y-2">
            {users.isLoading ? (
              <p className="text-xs text-[var(--muted)]">{stateLabels.loading}</p>
            ) : riskAccounts.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">{copy.risk.empty}</p>
            ) : (
              riskAccounts.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row.email}</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {row.reason}
                    </p>
                  </div>
                  <Link
                    href="/superadmin/users"
                    className="shrink-0 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
                  >
                    {copy.risk.open}
                  </Link>
                </div>
              ))
            )}
          </div>
        </AdminCard>

        <AdminCard className="lg:col-span-4">
          <CardHead title={copy.quality.title} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="text-[11px] text-[var(--muted)]">
                {copy.quality.mappingCoverage}
              </p>
              <p className="text-lg font-bold tabular-nums">
                {h?.expense_mapping_rate_30d?.toFixed(1) ?? "0.0"}%
              </p>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="text-[11px] text-[var(--muted)]">
                {copy.quality.unmappedExpenses}
              </p>
              <p className="text-lg font-bold tabular-nums">
                {fmt(h?.unmapped_expense_count_30d)}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="text-[11px] text-[var(--muted)]">
                {copy.quality.rolloverOn}
              </p>
              <p className="text-lg font-bold tabular-nums">
                {fmt(analytics.data?.rollover?.on)}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--surface-2)] p-3">
              <p className="text-[11px] text-[var(--muted)]">
                {copy.quality.rolloverOff}
              </p>
              <p className="text-lg font-bold tabular-nums">
                {fmt(analytics.data?.rollover?.off)}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold text-[var(--muted)]">
                {copy.quality.topCategories}
              </p>
              <div className="space-y-1.5">
                {(analytics.data?.top_categories ?? []).slice(0, 5).map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="truncate text-[var(--ink)]">{row.name}</span>
                    <span className="tabular-nums text-[var(--muted)]">
                      {fmt(row.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-[var(--muted)]">
                {copy.quality.topEnvelopes}
              </p>
              <div className="space-y-1.5">
                {(analytics.data?.top_envelopes ?? []).slice(0, 5).map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="truncate text-[var(--ink)]">{row.name}</span>
                    <span className="tabular-nums text-[var(--muted)]">
                      {fmt(row.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* --------------------------- activity log ------------------------ */}
      <AdminCard>
        <CardHead
          title={copy.activity.title}
          subtitle={copy.activity.subtitle}
          action={
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--muted)]">
              {copy.activity.autoRefresh}
            </span>
          }
        />
        <div className="mt-4 space-y-2">
          {activity.isLoading && !activity.data ? (
            <p className="text-xs text-[var(--muted)]">{stateLabels.loading}</p>
          ) : (activity.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
              {copy.activity.empty}
            </div>
          ) : (
            (activity.data ?? []).map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">{log.message}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(log.created_at).toLocaleString(copy.locale)} ·{" "}
                    {log.actor_email ?? copy.activity.systemAdmin}
                    {log.actor_ip ? ` · ${log.actor_ip}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(
                    log.status
                  )}`}
                >
                  {log.status}
                </span>
              </div>
            ))
          )}
        </div>
      </AdminCard>
    </div>
  );
}
