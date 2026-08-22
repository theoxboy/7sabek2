import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FloussyLocale } from "@/lib/localePreference";
import type { DashboardOut } from "@/lib/types";
import { DASHBOARD_COPY } from "@/lib/translations/translations";

export type EnvelopeSpend = {
  name: string;
  total: number;
};

interface DashboardChartsProps {
  locale: FloussyLocale;
  chartData: any[];
  totalBudget: number;
  spendingByEnvelope: EnvelopeSpend[];
  sortedTrends: any[];
  data: DashboardOut | null;
  formatMoney: (value: string | number | undefined) => string;
  formatLocaleDate: (value: string, locale: FloussyLocale) => string;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  locale,
  chartData,
  totalBudget,
  spendingByEnvelope,
  sortedTrends,
  data,
  formatMoney,
  formatLocaleDate,
}) => {
  const copy = DASHBOARD_COPY[locale];

  return (
    <Tabs defaultValue="synthesis" className="w-full">
      <Section
        title={copy.spendingByEnvelope}
        className="dashboard-charts-section relative"
        actions={
          <TabsList className="bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-2xl border border-[var(--border)] overflow-hidden">
            <TabsTrigger value="synthesis">
              {locale === "ar" ? "التوزيع" : locale === "fr" ? "Synthèse" : "Synthesis"}
            </TabsTrigger>
            <TabsTrigger value="spending">
              {locale === "ar" ? "المصاريف" : locale === "fr" ? "Répartition" : "Breakdown"}
            </TabsTrigger>
            <TabsTrigger value="trends">
              {locale === "ar" ? "التطور" : locale === "fr" ? "Tendance" : "Trend"}
            </TabsTrigger>
          </TabsList>
        }
      >
        <Card className="dashboard-chart-card p-5 relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-[var(--border)] rounded-[26px]">
          <TabsContent value="synthesis" className="mt-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="relative w-48 h-48 flex items-center justify-center shrink-0 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius="70%"
                      outerRadius="90%"
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const dataItem = payload[0].payload;
                          return (
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg max-w-[240px]">
                              <p className="text-xs font-semibold" style={{ color: dataItem.color }}>
                                {dataItem.name}
                              </p>
                              <p className="mt-1 text-sm font-bold">
                                {formatMoney(dataItem.value)} {data?.user.currency ?? "MAD"}
                              </p>
                              <p className="mt-1 text-[11px] text-[var(--muted)] leading-relaxed">
                                {dataItem.tooltip}
                              </p>
                              {dataItem.percentage > 0 && (
                                <p className="mt-1 text-[11px] font-semibold text-[var(--muted)]">
                                  {dataItem.percentage.toFixed(1)}%
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Central value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
                    {copy.chartTotalResources}
                  </span>
                  <span className="text-xl font-bold tracking-tight mt-0.5">
                    {formatMoney(totalBudget)}
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">
                    {data?.user.currency ?? "MAD"}
                  </span>
                </div>
              </div>

              {/* Interactive Legends */}
              <div className="flex-1 w-full space-y-3">
                {chartData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 rounded-2xl border border-[var(--border)] bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--ink)] truncate">{item.name}</p>
                        <p className="text-[10px] text-[var(--muted)] truncate">{item.tooltip}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold tabular-nums">
                        {formatMoney(item.value)} {data?.user.currency ?? "MAD"}
                      </p>
                      {item.percentage > 0 && (
                        <p className="text-[10px] font-semibold text-[var(--muted)] tabular-nums">
                          {item.percentage.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="spending" className="mt-0">
            {spendingByEnvelope.length === 0 ? (
              <EmptyState
                title={copy.noExpensesTitle}
                description={copy.noExpensesDescription}
              />
            ) : (
              <div className="w-full pt-2">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={spendingByEnvelope.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 11, fill: "var(--ink)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
                              <p className="text-xs font-semibold text-[var(--ink)]">{item.name}</p>
                              <p className="mt-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {formatMoney(item.total)} {data?.user.currency ?? "MAD"}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="var(--accent-strong, #6366f1)"
                      radius={[0, 8, 8, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trends" className="mt-0">
            {sortedTrends.length === 0 ? (
              <EmptyState
                title={copy.noRecentTitle}
                description={locale === "ar" ? "ما كاين حتى تطور دابا." : locale === "fr" ? "Aucune donnée de tendance disponible." : "No trend data available."}
              />
            ) : (
              <div className="w-full pt-2">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={sortedTrends} margin={{ left: 5, right: 5, top: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorNetWorthDashboard" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="period"
                      tickFormatter={(value) => formatLocaleDate(value, locale)}
                      stroke="var(--muted)"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--muted)"
                      fontSize={10}
                      tickFormatter={(value) => `${formatMoney(value)}`}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const point = payload[0].payload;
                          return (
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
                              <p className="text-xs text-[var(--muted)]">{formatLocaleDate(point.period, locale)}</p>
                              <p className="mt-1 text-sm font-bold text-emerald-600">
                                {formatMoney(point.closing)} {data?.user.currency ?? "MAD"}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="closing"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorNetWorthDashboard)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Card>
      </Section>
    </Tabs>
  );
};
