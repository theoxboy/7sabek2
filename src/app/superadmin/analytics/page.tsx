"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import type { UserOut } from "@/lib/types";

import { ANALYTICS_COPY } from "../_analyticsCopy";
import {
  AdminCard,
  AuthorityHeader,
  ChartCard,
  Metric,
  RangeToggle,
  SectionEyebrow,
  useChartPalette,
} from "../_kit";
import {
  useActivityLog,
  useAdminSummary,
  useAllUsers,
  useBackupHistory,
  useDeliveryQueue,
  useEmailSystemStatus,
  useFinanceSeries,
  useOnboardingRecords,
  usePlatformAnalytics,
  useRegistrationLeadStats,
  useSuperadminSessions,
  useTrafficSummary,
} from "../_useAdminData";

type RangeDays = 7 | 30 | 90 | 365;

/* ------------------------------- helpers ---------------------------------- */

function bucket<T>(
  items: T[],
  key: (item: T) => string | null | undefined,
  limit = 10
) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = (key(item) ?? "").toString().trim();
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function runningTotal<T extends { name: string }>(
  rows: T[],
  pick: (row: T) => number
) {
  let acc = 0;
  return rows.map((row) => {
    acc += pick(row);
    return { name: row.name, value: Math.round(acc) };
  });
}

export default function SuperAdminAnalyticsPage() {
  const { locale, dir } = useAppLocale("fr");
  useForceArabicDocumentFont(locale === "ar", "superadmin-analytics-ar-body");
  const copy = ANALYTICS_COPY[locale];
  const p = useChartPalette();
  const rtl = dir === "rtl";

  const [range, setRange] = useState<RangeDays>(30);

  const summary = useAdminSummary();
  const analytics = usePlatformAnalytics(range === 365 ? 90 : range);
  const finance = useFinanceSeries(range);
  const traffic = useTrafficSummary(range === 365 ? 90 : range);
  const users = useAllUsers();
  const activity = useActivityLog(200);
  const backups = useBackupHistory(30);
  const emailStatus = useEmailSystemStatus();
  const queue = useDeliveryQueue();
  const leads = useRegistrationLeadStats();
  const sessions = useSuperadminSessions();
  const onboarding = useOnboardingRecords(500);

  const nf = useMemo(
    () => new Intl.NumberFormat(copy.locale, { maximumFractionDigits: 0 }),
    [copy.locale]
  );
  const fmt = (v: number | null | undefined) =>
    v === null || v === undefined || Number.isNaN(v) ? "—" : nf.format(v);
  const dayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString(copy.locale, {
      day: "2-digit",
      month: "2-digit",
    });

  const labels = {
    loading: locale === "ar" ? "جاري التحميل…" : locale === "en" ? "Loading…" : "Chargement…",
    empty: locale === "ar" ? "ما كاينة حتى بيانات." : locale === "en" ? "No data." : "Aucune donnée.",
    error:
      locale === "ar"
        ? "ما قدرناش نحمّلو."
        : locale === "en"
        ? "Could not load."
        : "Chargement impossible.",
    retry: locale === "ar" ? "عاود" : locale === "en" ? "Retry" : "Réessayer",
  };

  const userList: UserOut[] = users.data ?? [];
  const now = Date.now();

  /* ------------------------------ acquisition --------------------------- */

  const visitsDaily = useMemo(
    () =>
      (traffic.data?.daily ?? []).map((r) => ({
        name: dayLabel(r.date),
        value: r.count,
      })),
    [traffic.data, copy.locale]
  );

  const trafficSources = useMemo(() => {
    const s = traffic.data?.sources ?? {};
    const direct = Math.max(0, Math.round(s.direct ?? 0));
    const referral = Math.max(0, Math.round(s.referral ?? 0));
    const organic = Math.max(0, Math.round(s.organic ?? s.organique ?? 0));
    return [
      { name: "Direct", value: direct, color: p.accent },
      { name: "Referral", value: referral, color: p.amber },
      { name: "Organic", value: organic, color: p.neutral },
    ];
  }, [traffic.data, p]);

  const extVsInt = useMemo(() => {
    const total = Math.max(0, traffic.data?.total ?? 0);
    const ext = trafficSources.reduce((sum, r) => sum + r.value, 0);
    return [
      { name: copy.v.external, value: ext, color: p.accent },
      { name: copy.v.internal, value: Math.max(0, total - ext), color: p.muted },
    ];
  }, [traffic.data, trafficSources, p, copy.v]);

  const leadsData = useMemo(() => {
    const l = leads.data;
    if (!l) return [];
    return [
      { name: copy.v.captured, value: l.email_captured },
      { name: copy.v.partial, value: l.partial_no_email },
      { name: copy.v.converted, value: l.converted },
      { name: copy.v.dismissed, value: l.dismissed },
    ];
  }, [leads.data, copy.v]);

  /* -------------------------------- growth ------------------------------ */

  const signupsDaily = useMemo(
    () =>
      (analytics.data?.user_growth ?? []).map((r) => ({
        name: dayLabel(r.date),
        value: r.count,
      })),
    [analytics.data, copy.locale]
  );
  const cumulativeUsers = useMemo(
    () => runningTotal(signupsDaily, (r) => r.value),
    [signupsDaily]
  );
  const signups7v7 = useMemo(() => {
    const g = analytics.data?.user_growth ?? [];
    if (g.length < 8) return [];
    const last7 = g.slice(-7).reduce((s, r) => s + r.count, 0);
    const prev7 = g.slice(-14, -7).reduce((s, r) => s + r.count, 0);
    return [
      { name: "-7j", value: prev7 },
      { name: "7j", value: last7 },
    ];
  }, [analytics.data]);

  const roles = useMemo(() => {
    const beta = userList.filter((u) => u.is_beta_tester).length;
    const superadmin = userList.filter((u) => u.role === "superadmin").length;
    return [
      { name: copy.sections.growth, value: userList.length - beta - superadmin, color: p.accent },
      { name: "Beta", value: beta, color: p.amber },
      { name: "Superadmin", value: superadmin, color: p.negative },
    ].filter((r) => r.value > 0);
  }, [userList, p, copy.sections]);

  const byCountry = useMemo(() => bucket(userList, (u) => u.country, 8), [userList]);
  const byCity = useMemo(() => bucket(userList, (u) => u.city, 8), [userList]);

  /* ------------------------------ activation ---------------------------- */

  const ob = analytics.data?.onboarding;
  const funnel = useMemo(() => {
    if (!ob) return [];
    return [
      { name: copy.v.total, value: ob.total_users },
      { name: "Env.", value: ob.envelopes },
      { name: "Cat.", value: ob.categories },
      { name: "Tx", value: ob.transactions },
    ];
  }, [ob, copy.v]);

  const onboardingState = useMemo(() => {
    let complete = 0;
    let incomplete = 0;
    let unknown = 0;
    for (const u of userList) {
      if (u.role === "superadmin") continue;
      if (u.has_completed_onboarding_v2 === true) complete += 1;
      else if (u.has_completed_onboarding_v2 === false) incomplete += 1;
      else unknown += 1;
    }
    return [
      { name: copy.v.complete, value: complete, color: p.accent },
      { name: copy.v.incomplete, value: incomplete, color: p.amber },
      { name: copy.v.unknown, value: unknown, color: p.muted },
    ].filter((r) => r.value > 0);
  }, [userList, p, copy.v]);

  const obRecords = onboarding.data?.items ?? [];
  const obStage = useMemo(() => bucket(obRecords, (r) => r.stage, 10), [obRecords]);
  const obObjective = useMemo(
    () => bucket(obRecords, (r) => r.primary_objective, 10),
    [obRecords]
  );
  const obIncomeType = useMemo(
    () => bucket(obRecords, (r) => r.income_type, 10),
    [obRecords]
  );
  const obHousehold = useMemo(
    () => bucket(obRecords, (r) => r.household_type, 10),
    [obRecords]
  );

  /* ------------------------------ engagement ---------------------------- */

  const wau = useMemo(
    () =>
      (analytics.data?.weekly_active ?? []).map((r) => ({
        name: dayLabel(r.week),
        value: r.count,
      })),
    [analytics.data, copy.locale]
  );
  const activeRatio = useMemo(() => {
    const totalUsers = userList.length || summary.data?.users || 0;
    if (!totalUsers) return [];
    return (analytics.data?.weekly_active ?? []).map((r) => ({
      name: dayLabel(r.week),
      value: Math.round((r.count / totalUsers) * 1000) / 10,
    }));
  }, [analytics.data, userList.length, summary.data, copy.locale]);

  const inactivity = useMemo(() => {
    const colors = [p.positive, p.amber, p.negative, p.muted];
    return (analytics.data?.churn ?? []).map((r, i) => ({
      name: r.label,
      value: r.count,
      color: colors[i % colors.length],
    }));
  }, [analytics.data, p]);

  const churnSum = (analytics.data?.churn ?? []).reduce((s, r) => s + r.count, 0);
  const totalUsers = userList.length || summary.data?.users || 0;
  const neverActive = Math.max(0, totalUsers - churnSum);
  const lastWau =
    (analytics.data?.weekly_active ?? []).slice(-1)[0]?.count ?? null;
  const stickiness =
    lastWau !== null && totalUsers > 0
      ? Math.round((lastWau / totalUsers) * 1000) / 10
      : null;

  /* -------------------------------- finance ----------------------------- */

  const financeDaily = useMemo(() => {
    const rows = finance.data ?? [];
    if (range === 365) {
      const byMonth = new Map<string, { income: number; expense: number }>();
      for (const r of rows) {
        const k = r.date.slice(0, 7);
        const cur = byMonth.get(k) ?? { income: 0, expense: 0 };
        cur.income += Number(r.income) || 0;
        cur.expense += Number(r.expense) || 0;
        byMonth.set(k, cur);
      }
      return [...byMonth.entries()].map(([m, v]) => ({
        name: new Date(`${m}-01`).toLocaleDateString(copy.locale, {
          month: "short",
          year: "2-digit",
        }),
        income: Math.round(v.income),
        expense: Math.round(v.expense),
        net: Math.round(v.income - v.expense),
      }));
    }
    return rows.map((r) => ({
      name: dayLabel(r.date),
      income: Math.round(Number(r.income) || 0),
      expense: Math.round(Number(r.expense) || 0),
      net: Math.round((Number(r.income) || 0) - (Number(r.expense) || 0)),
    }));
  }, [finance.data, range, copy.locale]);

  const netCumulative = useMemo(
    () => runningTotal(financeDaily, (r) => r.net),
    [financeDaily]
  );

  const monthlyFinance = useMemo(
    () =>
      (analytics.data?.monthly_finance ?? []).map((r) => ({
        name: new Date(r.month).toLocaleDateString(copy.locale, {
          month: "short",
          year: "2-digit",
        }),
        income: Math.round(r.income),
        expense: Math.round(r.expense),
      })),
    [analytics.data, copy.locale]
  );

  const txVolume = useMemo(
    () =>
      (analytics.data?.transactions_daily ?? []).map((r) => ({
        name: dayLabel(r.date),
        total: r.total_count,
        income: r.income_count,
        expense: r.expense_count,
      })),
    [analytics.data, copy.locale]
  );

  const topCategories = useMemo(
    () =>
      (analytics.data?.top_categories ?? [])
        .slice(0, 10)
        .map((r) => ({ name: r.name, value: Math.round(r.total) })),
    [analytics.data]
  );
  const topEnvelopes = useMemo(
    () =>
      (analytics.data?.top_envelopes ?? [])
        .filter((r) => !/^cash$/i.test(r.name.trim()))
        .slice(0, 10)
        .map((r) => ({ name: r.name, value: Math.round(r.total) })),
    [analytics.data]
  );

  const avgTicket = useMemo(() => {
    const amount = financeDaily.reduce((s, r) => s + r.income + r.expense, 0);
    const count = (analytics.data?.transactions_daily ?? []).reduce(
      (s, r) => s + r.total_count,
      0
    );
    return count > 0 ? Math.round(amount / count) : null;
  }, [financeDaily, analytics.data]);

  /* -------------------------------- product ----------------------------- */

  const rollover = useMemo(() => {
    const r = analytics.data?.rollover;
    if (!r) return [];
    return [
      { name: copy.v.on, value: r.on, color: p.accent },
      { name: copy.v.off, value: r.off, color: p.muted },
    ];
  }, [analytics.data, p, copy.v]);

  const currencies = useMemo(
    () =>
      bucket(userList, (u) => u.currency, 6).map((r, i) => ({
        ...r,
        color: [p.accent, p.neutral, p.amber, p.negative, p.positive, p.muted][i % 6],
      })),
    [userList, p]
  );

  const sweepInterval = useMemo(
    () =>
      bucket(userList, (u) => (u.sweep_interval_days ? `${u.sweep_interval_days}j` : null), 8),
    [userList]
  );

  const upcomingSweeps = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of userList) {
      if (!u.next_sweep_date) continue;
      const t = new Date(u.next_sweep_date).getTime();
      if (Number.isNaN(t) || t < now || t > now + 14 * 864e5) continue;
      const k = dayLabel(u.next_sweep_date);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [userList, now, copy.locale]);

  /* -------------------------------- system ------------------------------ */

  const queueData = useMemo(() => {
    const q = queue.data;
    if (!q) return [];
    return [
      { name: "Pending", value: q.pending_count },
      { name: "Retry", value: q.retry_count },
      { name: "Failed", value: q.failed_count },
      { name: "Sent 24h", value: q.sent_today },
    ];
  }, [queue.data]);

  const emailDeliveries = useMemo(() => {
    const s = emailStatus.data?.stats;
    if (!s) return [];
    return [
      { name: copy.v.success, value: s.sent, color: p.accent },
      { name: copy.v.failed, value: s.failed, color: p.negative },
      { name: "Skipped", value: s.skipped, color: p.muted },
      { name: "Pending", value: s.pending + s.retry, color: p.amber },
    ].filter((r) => r.value > 0);
  }, [emailStatus.data, p, copy.v]);

  const backupList = backups.data ?? [];
  const backupDuration = useMemo(
    () =>
      [...backupList]
        .reverse()
        .map((b) => ({
          name: dayLabel(b.created_at),
          value: b.duration_ms ? Math.round(b.duration_ms / 1000) : 0,
        })),
    [backupList, copy.locale]
  );
  const backupStatus = useMemo(
    () =>
      bucket(backupList, (b) => b.status, 5).map((r) => ({
        ...r,
        color: r.name === "success" ? p.accent : p.negative,
      })),
    [backupList, p]
  );
  const lastBackup = backupList[0] ?? null;
  const backupAgeHours = lastBackup
    ? Math.round((now - new Date(lastBackup.created_at).getTime()) / 36e5)
    : null;

  const activeSessions = sessions.data?.sessions ?? [];

  /* ------------------------------- security ----------------------------- */

  const activityRows = activity.data ?? [];
  const actionsByType = useMemo(
    () => bucket(activityRows, (r) => r.event_type, 12),
    [activityRows]
  );
  const actionsByStatus = useMemo(
    () =>
      bucket(activityRows, (r) => r.status, 5).map((r) => ({
        ...r,
        color:
          r.name === "success"
            ? p.accent
            : r.name === "error"
            ? p.negative
            : p.amber,
      })),
    [activityRows, p]
  );
  const actionsDaily = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of activityRows) {
      const k = dayLabel(r.created_at);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].reverse().map(([name, value]) => ({ name, value }));
  }, [activityRows, copy.locale]);

  const accountFlags = useMemo(() => {
    const suspended = userList.filter(
      (u) =>
        u.status === "suspended" ||
        (u.suspended_until
          ? new Date(u.suspended_until).getTime() > now
          : false)
    ).length;
    const deleted = userList.filter((u) => u.deleted_at).length;
    const resetBlocked = userList.filter((u) => u.password_reset_blocked).length;
    const mustReset = userList.filter((u) => u.must_reset_password).length;
    return [
      { name: copy.v.dismissed, value: suspended },
      { name: "Deleted", value: deleted },
      { name: "Reset blocked", value: resetBlocked },
      { name: "Must reset", value: mustReset },
    ];
  }, [userList, now, copy.v]);

  const resetRequests = useMemo(() => {
    const buckets = { "0": 0, "1-2": 0, "3-5": 0, "6+": 0 };
    for (const u of userList) {
      const n = u.password_reset_requests_total ?? 0;
      if (n === 0) buckets["0"] += 1;
      else if (n <= 2) buckets["1-2"] += 1;
      else if (n <= 5) buckets["3-5"] += 1;
      else buckets["6+"] += 1;
    }
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [userList]);

  /* -------------------------------- render ------------------------------ */

  const rangeOptions = [
    { label: copy.range.d7, value: 7 as RangeDays },
    { label: copy.range.d30, value: 30 as RangeDays },
    { label: copy.range.d90, value: 90 as RangeDays },
    { label: copy.range.m12, value: 365 as RangeDays },
  ];

  const axis = { fontSize: 11 };
  const grid = <CartesianGrid strokeDasharray="3 3" stroke={p.grid} />;
  const xAxis = <XAxis dataKey="name" reversed={rtl} tick={axis} />;
  const yAxis = (
    <YAxis orientation={rtl ? "right" : "left"} tick={axis} allowDecimals={false} />
  );

  const BarOne = ({ data, color }: { data: { name: string; value: number }[]; color: string }) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        {grid}
        {xAxis}
        {yAxis}
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const HBar = ({ data, color }: { data: { name: string; value: number }[]; color: string }) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
        <XAxis type="number" tick={axis} reversed={rtl} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fontSize: 10 }}
          orientation={rtl ? "right" : "left"}
        />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[0, 5, 5, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const Donut = ({
    data,
  }: {
    data: { name: string; value: number; color: string }[];
  }) => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={40} outerRadius={64} stroke="none">
          {data.map((e) => (
            <Cell key={e.name} fill={e.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );

  return (
    <div
      dir={dir}
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-6 text-[var(--ink)] sm:px-6"
    >
      <AuthorityHeader
        kicker={copy.kicker}
        title={copy.pageTitle}
        subtitle={copy.pageSubtitle}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <RangeToggle<RangeDays> value={range} onChange={setRange} options={rangeOptions} />
            <Link
              href="/superadmin"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 backdrop-blur hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.back}
            </Link>
          </div>
        }
      />

      {/* ===================== 1. Acquisition ===================== */}
      <section className="space-y-3">
        <SectionEyebrow>{copy.sections.acquisition}</SectionEyebrow>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title={copy.c.visitsDaily} query={traffic} empty={visitsDaily.length === 0} labels={labels}>
            <BarOne data={visitsDaily} color={p.accent} />
          </ChartCard>
          <ChartCard title={copy.c.trafficSources} query={traffic} empty={trafficSources.every((r) => r.value === 0)} labels={labels}>
            <Donut data={trafficSources} />
          </ChartCard>
          <ChartCard title={copy.c.extVsInt} query={traffic} empty={extVsInt.every((r) => r.value === 0)} labels={labels}>
            <Donut data={extVsInt} />
          </ChartCard>
          <ChartCard title={copy.c.leads} query={leads} empty={leadsData.length === 0} labels={labels}>
            <BarOne data={leadsData} color={p.neutral} />
          </ChartCard>
          <Metric
            label={copy.c.leadConv}
            value={
              leads.data && leads.data.total > 0
                ? `${Math.round((leads.data.converted / leads.data.total) * 100)}%`
                : "—"
            }
            sub={leads.data ? `${fmt(leads.data.last_24h)} / 24h · ${fmt(leads.data.total)} ${copy.v.total}` : undefined}
          />
        </div>
      </section>

      {/* ===================== 2. Growth ===================== */}
      <section className="space-y-3">
        <SectionEyebrow>{copy.sections.growth}</SectionEyebrow>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title={copy.c.signupsDaily} query={analytics} empty={signupsDaily.length === 0} labels={labels}>
            <BarOne data={signupsDaily} color={p.accent} />
          </ChartCard>
          <ChartCard title={copy.c.cumulativeUsers} query={analytics} empty={cumulativeUsers.length === 0} labels={labels}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeUsers}>
                <defs>
                  <linearGradient id="cumUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={p.accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={p.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                {grid}
                {xAxis}
                {yAxis}
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke={p.accent} strokeWidth={2} fill="url(#cumUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={copy.c.signups7v7} query={analytics} empty={signups7v7.length === 0} labels={labels}>
            <BarOne data={signups7v7} color={p.neutral} />
          </ChartCard>
          <ChartCard title={copy.c.roles} query={users} empty={roles.length === 0} labels={labels}>
            <Donut data={roles} />
          </ChartCard>
          <ChartCard title={copy.c.byCountry} query={users} empty={byCountry.length === 0} labels={labels}>
            <HBar data={byCountry} color={p.accent} />
          </ChartCard>
          <ChartCard title={copy.c.byCity} query={users} empty={byCity.length === 0} labels={labels}>
            <HBar data={byCity} color={p.neutral} />
          </ChartCard>
        </div>
      </section>

      {/* ===================== 3. Activation ===================== */}
      <section className="space-y-3">
        <SectionEyebrow>{copy.sections.activation}</SectionEyebrow>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title={copy.c.funnel} query={analytics} empty={funnel.length === 0} labels={labels}>
            <BarOne data={funnel} color={p.accent} />
          </ChartCard>
          <Metric
            label={copy.c.daysToFirstTx}
            value={analytics.data ? `${analytics.data.avg_days_to_first_tx.toFixed(1)}` : "—"}
            sub={locale === "ar" ? "يوم" : locale === "en" ? "days" : "jour(s)"}
          />
          <ChartCard title={copy.c.onboardingState} query={users} empty={onboardingState.length === 0} labels={labels}>
            <Donut data={onboardingState} />
          </ChartCard>
          <ChartCard title={copy.c.obStage} query={onboarding} empty={obStage.length === 0} labels={labels}>
            <HBar data={obStage} color={p.neutral} />
          </ChartCard>
          <ChartCard title={copy.c.obObjective} query={onboarding} empty={obObjective.length === 0} labels={labels}>
            <HBar data={obObjective} color={p.accent} />
          </ChartCard>
          <ChartCard title={copy.c.obIncomeType} query={onboarding} empty={obIncomeType.length === 0} labels={labels}>
            <HBar data={obIncomeType} color={p.amber} />
          </ChartCard>
          <ChartCard title={copy.c.obHousehold} query={onboarding} empty={obHousehold.length === 0} labels={labels}>
            <HBar data={obHousehold} color={p.neutral} />
          </ChartCard>
        </div>
      </section>

      {/* ===================== 4. Engagement ===================== */}
      <section className="space-y-3">
        <SectionEyebrow>{copy.sections.engagement}</SectionEyebrow>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title={copy.c.wau} query={analytics} empty={wau.length === 0} labels={labels}>
            <BarOne data={wau} color={p.neutral} />
          </ChartCard>
          <ChartCard title={copy.c.activeRatio} query={analytics} empty={activeRatio.length === 0} labels={labels}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeRatio}>
                {grid}
                {xAxis}
                <YAxis orientation={rtl ? "right" : "left"} tick={axis} unit="%" />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke={p.accent} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={copy.c.inactivity} query={analytics} empty={inactivity.length === 0} labels={labels}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inactivity}>
                {grid}
                {xAxis}
                {yAxis}
                <Tooltip />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {inactivity.map((e) => (
                    <Cell key={e.name} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <Metric
            label={copy.c.stickiness}
            value={stickiness === null ? "—" : `${stickiness}%`}
            sub={`${fmt(lastWau)} / ${fmt(totalUsers)}`}
          />
          <Metric label={copy.c.neverActive} value={fmt(neverActive)} sub={`/ ${fmt(totalUsers)}`} tone="warning" />
        </div>
      </section>

      {/* ===================== 5. Finance ===================== */}
      <section className="space-y-3">
        <SectionEyebrow>{copy.sections.finance}</SectionEyebrow>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title={copy.c.incVsExpDaily} query={finance} empty={financeDaily.length === 0} labels={labels}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeDaily}>
                {grid}
                {xAxis}
                {yAxis}
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" name={copy.v.income} fill={p.positive} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={copy.v.expense} fill={p.negative} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={copy.c.netDaily} query={finance} empty={financeDaily.length === 0} labels={labels}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeDaily}>
                {grid}
                {xAxis}
                {yAxis}
                <Tooltip />
                <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                  {financeDaily.map((e) => (
                    <Cell key={e.name} fill={e.net >= 0 ? p.positive : p.negative} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={copy.c.netCumulative} query={finance} empty={netCumulative.length === 0} labels={labels}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netCumulative}>
                <defs>
                  <linearGradient id="netCum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={p.neutral} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={p.neutral} stopOpacity={0} />
                  </linearGradient>
                </defs>
                {grid}
                {xAxis}
                {yAxis}
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke={p.neutral} strokeWidth={2} fill="url(#netCum)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={copy.c.incVsExpMonthly} query={analytics} empty={monthlyFinance.length === 0} labels={labels}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFinance}>
                {grid}
                {xAxis}
                {yAxis}
                <Tooltip />
                <Bar dataKey="income" name={copy.v.income} fill={p.positive} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={copy.v.expense} fill={p.negative} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={copy.c.txVolume} query={analytics} empty={txVolume.length === 0} labels={labels}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={txVolume}>
                {grid}
                {xAxis}
                {yAxis}
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke={p.accent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="income" stroke={p.positive} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="expense" stroke={p.negative} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={copy.c.txMix} query={analytics} empty={txVolume.length === 0} labels={labels}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={txVolume} stackOffset="expand">
                {grid}
                {xAxis}
                <YAxis orientation={rtl ? "right" : "left"} tick={axis} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <Tooltip />
                <Area type="monotone" dataKey="income" stackId="1" stroke={p.positive} fill={p.positive} fillOpacity={0.5} />
                <Area type="monotone" dataKey="expense" stackId="1" stroke={p.negative} fill={p.negative} fillOpacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title={copy.c.topCategories} query={analytics} empty={topCategories.length === 0} labels={labels} height={260}>
            <HBar data={topCategories} color={p.negative} />
          </ChartCard>
          <ChartCard title={copy.c.topEnvelopes} query={analytics} empty={topEnvelopes.length === 0} labels={labels} height={260}>
            <HBar data={topEnvelopes} color={p.accent} />
          </ChartCard>
          <Metric label={copy.c.avgTicket} value={avgTicket === null ? "—" : `${fmt(avgTicket)} MAD`} />
        </div>
      </section>

      {/* ===================== 6. Product ===================== */}
      <section className="space-y-3">
        <SectionEyebrow>{copy.sections.product}</SectionEyebrow>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title={copy.c.rollover} query={analytics} empty={rollover.length === 0} labels={labels}>
            <Donut data={rollover} />
          </ChartCard>
          <ChartCard title={copy.c.currencies} query={users} empty={currencies.length === 0} labels={labels}>
            <Donut data={currencies} />
          </ChartCard>
          <ChartCard title={copy.c.sweepInterval} query={users} empty={sweepInterval.length === 0} labels={labels}>
            <BarOne data={sweepInterval} color={p.neutral} />
          </ChartCard>
          <Metric
            label={copy.c.avgEnvCat}
            value={
              summary.data && summary.data.users > 0
                ? `${(summary.data.envelopes / summary.data.users).toFixed(1)} · ${(
                    summary.data.categories / summary.data.users
                  ).toFixed(1)}`
                : "—"
            }
            sub={locale === "ar" ? "أظرفة · فئات لكل حساب" : locale === "en" ? "envelopes · categories per account" : "enveloppes · catégories / compte"}
          />
          <ChartCard title={copy.c.upcomingSweeps} query={users} empty={upcomingSweeps.length === 0} labels={labels}>
            <BarOne data={upcomingSweeps} color={p.amber} />
          </ChartCard>
        </div>
      </section>

      {/* ===================== 7. System ===================== */}
      <section className="space-y-3">
        <SectionEyebrow>{copy.sections.system}</SectionEyebrow>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title={copy.c.emailQueue} query={queue} empty={queueData.every((r) => r.value === 0)} labels={labels}>
            <BarOne data={queueData} color={p.neutral} />
          </ChartCard>
          <ChartCard title={copy.c.emailDeliveries} query={emailStatus} empty={emailDeliveries.length === 0} labels={labels}>
            <Donut data={emailDeliveries} />
          </ChartCard>
          <ChartCard title={copy.c.backupDuration} query={backups} empty={backupDuration.length === 0} labels={labels}>
            <BarOne data={backupDuration} color={p.accent} />
          </ChartCard>
          <ChartCard title={copy.c.backupStatus} query={backups} empty={backupStatus.length === 0} labels={labels}>
            <Donut data={backupStatus} />
          </ChartCard>
          <Metric
            label={copy.c.backupAge}
            value={backupAgeHours === null ? "—" : `${fmt(backupAgeHours)} h`}
            sub={lastBackup?.status}
            tone={backupAgeHours !== null && backupAgeHours > 36 ? "negative" : "default"}
          />
          <AdminCard>
            <p className="text-[15px] font-bold">{copy.c.sessions}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{fmt(activeSessions.length)}</p>
            <div className="mt-3 space-y-1.5">
              {activeSessions.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span className="truncate">
                    {s.browser ?? "?"} · {s.os ?? "?"} · {s.source_ip ?? "?"}
                  </span>
                  <span>{new Date(s.last_seen_at).toLocaleDateString(copy.locale)}</span>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      </section>

      {/* ===================== 8. Security ===================== */}
      <section className="space-y-3">
        <SectionEyebrow>{copy.sections.security}</SectionEyebrow>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title={copy.c.actionsByType} query={activity} empty={actionsByType.length === 0} labels={labels} height={260}>
            <HBar data={actionsByType} color={p.neutral} />
          </ChartCard>
          <ChartCard title={copy.c.actionsByStatus} query={activity} empty={actionsByStatus.length === 0} labels={labels}>
            <Donut data={actionsByStatus} />
          </ChartCard>
          <ChartCard title={copy.c.actionsDaily} query={activity} empty={actionsDaily.length === 0} labels={labels}>
            <BarOne data={actionsDaily} color={p.accent} />
          </ChartCard>
          <ChartCard title={copy.c.accountFlags} query={users} empty={accountFlags.every((r) => r.value === 0)} labels={labels}>
            <BarOne data={accountFlags} color={p.negative} />
          </ChartCard>
          <ChartCard title={copy.c.resetRequests} query={users} empty={userList.length === 0} labels={labels}>
            <BarOne data={resetRequests} color={p.amber} />
          </ChartCard>
        </div>
      </section>

      <div className="flex justify-center pt-4">
        <Link
          href="/superadmin"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] hover:border-[var(--accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
      </div>
    </div>
  );
}
