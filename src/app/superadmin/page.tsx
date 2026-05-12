"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  ArrowUpRight,
  CalendarCheck,
  DollarSign,
  Sparkles,
  Users,
  Search,
  ArrowUpRightFromCircle,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type {
  AdminSummaryOut,
  AdminActivityLogOut,
  CategoryEnvelopeMapOut,
  CategoryOut,
  EnvelopeOut,
  PlatformAnalyticsOut,
  TopClientOut,
  TrafficSummaryOut,
  FinanceDailyOut,
  TransactionOut,
  UserOut,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

type UserSummary = {
  transactions: number;
  categories: number;
  envelopes: number;
};

type PlatformTransaction = TransactionOut & {
  userId: string;
  categoryName: string;
};

const profitExpenseFallback = [
  { name: "Mon", profit: 9, expense: 6 },
  { name: "Tue", profit: 5, expense: 3 },
  { name: "Wed", profit: 3, expense: 9 },
  { name: "Thu", profit: 7, expense: 5 },
  { name: "Fri", profit: 5, expense: 4 },
  { name: "Sat", profit: 10, expense: 6 },
  { name: "Sun", profit: 3, expense: 4 },
];

const trafficDataFallback = [
  { name: "Autres", value: 0, color: "#e7ecf0" },
  { name: "Referral", value: 0, color: "#fb977d" },
  { name: "Organique", value: 0, color: "#10b981" },
];

const salesSparkFallback = [
  { name: "1", value: 25 },
  { name: "2", value: 66 },
  { name: "3", value: 20 },
  { name: "4", value: 40 },
  { name: "5", value: 12 },
  { name: "6", value: 58 },
  { name: "7", value: 20 },
];

const scheduleItemsFallback = [
  {
    title: "Audit sécurité",
    subtitle: "À lancer avant 18:00",
  },
  {
    title: "Suivi paiements",
    subtitle: "Mettre à jour les relances",
  },
  {
    title: "Revue performance",
    subtitle: "Données du mois en cours",
  },
  {
    title: "Support premium",
    subtitle: "Tickets prioritaires",
  },
];

const topClientsFallback = [
  {
    id: "01",
    team: "Ops",
    name: "Campaign A",
    priority: "High",
    budget: "12,400",
  },
  {
    id: "02",
    team: "Growth",
    name: "Campaign B",
    priority: "Medium",
    budget: "9,320",
  },
  {
    id: "03",
    team: "Finance",
    name: "Campaign C",
    priority: "Low",
    budget: "6,840",
  },
  {
    id: "04",
    team: "Support",
    name: "Campaign D",
    priority: "High",
    budget: "15,090",
  },
];

const productCardsFallback = [
  { title: "Audit Compliance", price: "49", old: "59" },
  { title: "Monitoring Pro", price: "29", old: "39" },
  { title: "Reports Plus", price: "19", old: "29" },
  { title: "Ops Toolkit", price: "39", old: "49" },
];

export default function SuperAdminPage() {
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "superadmin-dashboard-ar-body");
  const router = useRouter();
  const [adminSummary, setAdminSummary] = useState<AdminSummaryOut | null>(null);
  const [platformTransactions, setPlatformTransactions] = useState<PlatformTransaction[]>([]);
  const [financeSeries, setFinanceSeries] = useState<FinanceDailyOut[]>([]);
  const [platformUserTotals, setPlatformUserTotals] = useState<
    Record<string, { income: number; expense: number; user: UserOut }>
  >({});
  const [platformLoading, setPlatformLoading] = useState(false);
  const [trafficSummary, setTrafficSummary] = useState<TrafficSummaryOut | null>(
    null
  );
  const [topClientsData, setTopClientsData] = useState<TopClientOut[]>([]);
  const [platformAnalytics, setPlatformAnalytics] =
    useState<PlatformAnalyticsOut | null>(null);
  const [profitRangeDays, setProfitRangeDays] = useState<7 | 30 | 90 | 365>(7);
  const [users, setUsers] = useState<UserOut[]>([]);
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserOut | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<UserSummary | null>(null);
  const [selectedEnvelopes, setSelectedEnvelopes] = useState<EnvelopeOut[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryOut[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<TransactionOut[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<CategoryEnvelopeMapOut[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLogOut[]>([]);

  const adminFetch = <T,>(path: string) =>
    apiFetch<T>(path, { headers: { "x-admin-bypass": "true" } });
  const impersonateFetch = <T,>(path: string, userId: string) =>
    apiFetch<T>(path, { headers: { "x-user-id": userId } });

  const toNumber = (value: string | number | null | undefined) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Number.parseFloat(value ?? "0");
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatAmount = (value: number) =>
    value.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  const selectedEmail = selectedUser?.email ?? "";
  const selectedDisplayName =
    [selectedUser?.first_name, selectedUser?.last_name].filter(Boolean).join(" ") ||
    selectedUser?.email ||
    "";

  const mappingCount = useMemo(
    () => selectedMappings.filter((item) => item.envelope_id).length,
    [selectedMappings]
  );

  const chartProfitExpense = useMemo(() => {
    if (financeSeries.length === 0) return profitExpenseFallback;
    const now = new Date();
    const days = Array.from({ length: profitRangeDays }, (_, idx) => {
      const date = new Date(now);
      date.setDate(now.getDate() - ((profitRangeDays - 1) - idx));
      const key = date.toISOString().slice(0, 10);
      const label =
        profitRangeDays <= 14
          ? date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")
          : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      return { key, label };
    });
    const totals = new Map<string, { income: number; expense: number }>();
    for (const item of financeSeries) {
      totals.set(item.date, {
        income: toNumber(item.income),
        expense: toNumber(item.expense),
      });
    }

    return days.map((day) => {
      const dayTotals = totals.get(day.key) ?? {
        income: 0,
        expense: 0,
      };
      return {
        name: day.label,
        profit: Math.round(dayTotals.income),
        expense: Math.round(dayTotals.expense),
      };
    });
  }, [financeSeries, profitRangeDays]);

  const profitTotals = useMemo(() => {
    if (chartProfitExpense === profitExpenseFallback) {
      const fallbackIncome = profitExpenseFallback.reduce(
        (sum, item) => sum + item.profit,
        0
      );
      const fallbackExpense = profitExpenseFallback.reduce(
        (sum, item) => sum + item.expense,
        0
      );
      return {
        income: fallbackIncome,
        expense: fallbackExpense,
        net: fallbackIncome - fallbackExpense,
      };
    }
    const income = chartProfitExpense.reduce((sum, item) => sum + item.profit, 0);
    const expense = chartProfitExpense.reduce((sum, item) => sum + item.expense, 0);
    return { income, expense, net: income - expense };
  }, [chartProfitExpense]);

  const chartSalesSpark = useMemo(() => {
    if (!trafficSummary?.daily?.length) return salesSparkFallback;
    return trafficSummary.daily.map((item, index) => ({
      name: String(index + 1),
      value: item.count,
    }));
  }, [trafficSummary]);

  const salesSummary = useMemo(() => {
    if (!trafficSummary) {
      return {
        net: 0,
        deltaPct: 0,
        label: "vs période précédente",
        positive: true,
      };
    }
    const currentTotal = trafficSummary.total ?? 0;
    const previousTotal = trafficSummary.previous_total ?? 0;
    const delta =
      previousTotal === 0
        ? currentTotal === 0
          ? 0
          : 100
        : ((currentTotal - previousTotal) / Math.abs(previousTotal)) * 100;
    return {
      net: currentTotal,
      deltaPct: Math.round(delta * 10) / 10,
      label: "vs période précédente",
      positive: delta >= 0,
    };
  }, [trafficSummary]);

  const chartTrafficData = useMemo(() => {
    if (!trafficSummary?.sources) return trafficDataFallback;
    const sources = trafficSummary.sources;
    return [
      {
        name: "Autres",
        value: Math.round(sources.internal ?? sources.other ?? 0),
        color: "#e7ecf0",
      },
      {
        name: "Referral",
        value: Math.round(sources.referral ?? 0),
        color: "#fb977d",
      },
      {
        name: "Organique",
        value: Math.round(sources.direct ?? 0),
        color: "#10b981",
      },
    ];
  }, [trafficSummary]);

  const trafficTotal = useMemo(
    () => chartTrafficData.reduce((sum, item) => sum + item.value, 0),
    [chartTrafficData]
  );

  const chartScheduleItems = useMemo(() => {
    if (platformTransactions.length === 0) return scheduleItemsFallback;
    const sorted = [...platformTransactions].sort((a, b) =>
      b.occurred_on.localeCompare(a.occurred_on)
    );
    return sorted.slice(0, 4).map((tx) => ({
      title: `${
        tx.type === "income" ? "Revenu" : "Dépense"
      } · ${tx.categoryName}`,
      subtitle: `${formatAmount(toNumber(tx.amount))} MAD · ${tx.occurred_on}`,
    }));
  }, [platformTransactions]);

  const chartTopClients = useMemo(() => {
    if (topClientsData.length > 0) {
      return topClientsData.map((item, index) => {
        const displayName =
          [item.first_name, item.last_name].filter(Boolean).join(" ") ||
          item.email;
        const priority =
          item.income_total >= 10000
            ? "High"
            : item.income_total >= 3000
            ? "Medium"
            : "Low";
        return {
          id: String(index + 1).padStart(2, "0"),
          team: "Clients",
          name: displayName,
          priority,
          budget: formatAmount(item.income_total),
        };
      });
    }
    const totals = Object.values(platformUserTotals).filter(
      (item) => item.income > 0 || item.expense > 0
    );
    if (totals.length === 0) return [];
    const sorted = [...totals].sort((a, b) => b.income - a.income).slice(0, 4);
    return sorted.map((item, index) => {
      const displayName =
        [item.user.first_name, item.user.last_name].filter(Boolean).join(" ") ||
        item.user.email;
      const priority =
        item.income >= 10000 ? "High" : item.income >= 3000 ? "Medium" : "Low";
      return {
        id: String(index + 1).padStart(2, "0"),
        team: "Clients",
        name: displayName,
        priority,
        budget: formatAmount(item.income),
      };
    });
  }, [platformUserTotals]);

  const chartProductCards = useMemo(() => {
    if (platformTransactions.length === 0) return productCardsFallback;
    const totals = new Map<string, number>();
    for (const tx of platformTransactions) {
      if (tx.type !== "expense") continue;
      const current = totals.get(tx.categoryName) ?? 0;
      totals.set(tx.categoryName, current + toNumber(tx.amount));
    }
    const sorted = [...totals.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
    if (sorted.length === 0) return productCardsFallback;
    return sorted.map((item) => ({
      title: item.name,
      price: formatAmount(item.total),
      old: formatAmount(item.total * 1.2),
    }));
  }, [platformTransactions]);

  const userGrowthData = useMemo(() => {
    if (!platformAnalytics?.user_growth?.length) return [];
    return platformAnalytics.user_growth.map((item) => ({
      name: new Date(item.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
      count: item.count,
    }));
  }, [platformAnalytics]);

  const weeklyActiveData = useMemo(() => {
    if (!platformAnalytics?.weekly_active?.length) return [];
    return platformAnalytics.weekly_active.map((item) => ({
      name: new Date(item.week).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
      count: item.count,
    }));
  }, [platformAnalytics]);

  const monthlyFinanceData = useMemo(() => {
    if (!platformAnalytics?.monthly_finance?.length) return [];
    return platformAnalytics.monthly_finance.map((item) => ({
      name: new Date(item.month).toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      }),
      income: Math.round(item.income),
      expense: Math.round(item.expense),
    }));
  }, [platformAnalytics]);

  const churnData = useMemo(() => {
    if (!platformAnalytics?.churn?.length) return [];
    const colors = ["#10b981", "#fb977d", "#facc15", "#94a3b8"];
    return platformAnalytics.churn.map((item, index) => ({
      name: item.label,
      value: item.count,
      color: colors[index % colors.length],
    }));
  }, [platformAnalytics]);

  const rolloverData = useMemo(() => {
    if (!platformAnalytics?.rollover) return [];
    return [
      { name: "ON", value: platformAnalytics.rollover.on, color: "#10b981" },
      { name: "OFF", value: platformAnalytics.rollover.off, color: "#e7ecf0" },
    ];
  }, [platformAnalytics]);

  const onboarding = platformAnalytics?.onboarding;
  const onboardingTotal = onboarding?.total_users ?? 0;

  useEffect(() => {
    let active = true;
    adminFetch<AdminSummaryOut>("/users/admin/summary")
      .then((summary) => {
        if (active) setAdminSummary(summary);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    adminFetch<TrafficSummaryOut>("/analytics/traffic?days=7")
      .then((summary) => {
        if (active) setTrafficSummary(summary);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    adminFetch<FinanceDailyOut[]>(`/analytics/finance?days=${profitRangeDays}`)
      .then((series) => {
        if (active) setFinanceSeries(series);
      })
      .catch(() => {
        if (active) setFinanceSeries([]);
      });
    return () => {
      active = false;
    };
  }, [profitRangeDays]);

  useEffect(() => {
    let active = true;
    adminFetch<TopClientOut[]>("/users/admin/top-clients?limit=4")
      .then((items) => {
        if (active) setTopClientsData(items);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    adminFetch<PlatformAnalyticsOut>("/analytics/platform?days=30")
      .then((summary) => {
        if (active) setPlatformAnalytics(summary);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setPlatformLoading(true);
    (async () => {
      try {
        const allUsers = await adminFetch<UserOut[]>("/users");
        if (!active) return;
        const combined: PlatformTransaction[] = [];
        const totals: Record<
          string,
          { income: number; expense: number; user: UserOut }
        > = {};
        for (const user of allUsers) {
          totals[user.id] = { income: 0, expense: 0, user };
          try {
            const [transactions, categories] = await Promise.all([
              impersonateFetch<TransactionOut[]>("/transactions", user.id),
              impersonateFetch<CategoryOut[]>("/categories", user.id),
            ]);
            if (!active) return;
            const categoryMap = new Map(
              categories.map((category) => [category.id, category.name])
            );
            for (const tx of transactions) {
              const amount = toNumber(tx.amount);
              if (tx.type === "income") {
                totals[user.id].income += amount;
              } else {
                totals[user.id].expense += amount;
              }
              combined.push({
                ...tx,
                userId: user.id,
                categoryName: categoryMap.get(tx.category_id) ?? "Sans categorie",
              });
            }
          } catch {
            // Ignore per-user fetch errors for now.
          }
        }
        if (!active) return;
        setPlatformTransactions(combined);
        setPlatformUserTotals(totals);
      } finally {
        if (active) setPlatformLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingUsers(true);
    const timer = window.setTimeout(async () => {
      try {
        const list = await adminFetch<UserOut[]>(
          `/users?q=${encodeURIComponent(search.trim())}`
        );
        if (active) setUsers(list);
      } catch {
        if (active) setUsers([]);
      } finally {
        if (active) setLoadingUsers(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    if (!selectedUserId) return;
    let active = true;
    setLoadingDetails(true);
    Promise.all([
      adminFetch<UserOut>(`/users/${selectedUserId}`),
      impersonateFetch<UserSummary>("/users/me/summary", selectedUserId),
      impersonateFetch<EnvelopeOut[]>("/envelopes", selectedUserId),
      impersonateFetch<CategoryOut[]>("/categories", selectedUserId),
      impersonateFetch<CategoryEnvelopeMapOut[]>("/mappings", selectedUserId),
      impersonateFetch<TransactionOut[]>("/transactions", selectedUserId),
    ])
      .then(
        ([
          userDetail,
          summary,
          envelopes,
          categories,
          mappings,
          transactions,
        ]) => {
          if (!active) return;
          setSelectedUser(userDetail);
          setSelectedSummary(summary);
          setSelectedEnvelopes(envelopes);
          setSelectedCategories(categories);
          setSelectedMappings(mappings);
          setSelectedTransactions(
            [...transactions].sort((a, b) =>
              b.occurred_on.localeCompare(a.occurred_on)
            )
          );
        }
      )
      .finally(() => {
        if (active) setLoadingDetails(false);
      });
    return () => {
      active = false;
    };
  }, [selectedUserId]);

  const handleActAs = () => {
    if (!selectedUserId || typeof window === "undefined") return;
    window.localStorage.setItem("floussy.superadmin.act_as", selectedUserId);
    router.push("/dashboard");
  };

  const statusTone = (status: string) => {
    if (status === "success") return "bg-emerald-50 text-emerald-700";
    if (status === "error") return "bg-red-50 text-red-700";
    return "bg-slate-50 text-slate-600";
  };

  useEffect(() => {
    let active = true;
    const loadLogs = async () => {
      try {
        const logs = await adminFetch<AdminActivityLogOut[]>(
          "/admin/activity?limit=30"
        );
        if (!active) return;
        setActivityLogs(logs);
      } catch {
        if (active) setActivityLogs([]);
      }
    };
    loadLogs();
    const interval = window.setInterval(loadLogs, 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);


  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-12 pt-8 text-[var(--ink)]" dir={dir}>
      <style jsx>{`
        .spike-card {
          border-radius: 18px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: #fff;
          box-shadow: 0 12px 30px -24px rgba(0, 0, 0, 0.45);
        }
        .spike-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        .spike-subtitle {
          font-size: 12px;
          color: #9ca3af;
        }
        .spike-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
        }
        .spike-table th,
        .spike-table td {
          padding: 10px 12px;
          font-size: 14px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
            <Sparkles className="h-3.5 w-3.5" /> Superadmin dashboard
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Vue globale de la plateforme
          </h1>
          <p className="text-sm text-gray-500">
            {platformLoading
              ? "Chargement des données plateforme…"
              : "Données plateforme — design inspiré du template Spike."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            <Users className="h-4 w-4" />
            {adminSummary?.users ?? "—"} utilisateurs
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            <DollarSign className="h-4 w-4" />
            {adminSummary?.transactions ?? "—"} transactions
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card className="spike-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="spike-title">Revenus & Dépenses</p>
                <p className="spike-subtitle">
                  {profitRangeDays === 7
                    ? "7 derniers jours"
                    : profitRangeDays === 30
                    ? "30 derniers jours"
                    : profitRangeDays === 90
                    ? "90 derniers jours"
                    : "12 derniers mois"}
                </p>
                <p className="text-xs text-gray-500">
                  Cumul période:{" "}
                  <span className="font-semibold text-gray-900">
                    {formatAmount(profitTotals.net)} MAD
                  </span>{" "}
                  · Revenus {formatAmount(profitTotals.income)} MAD · Dépenses{" "}
                  {formatAmount(profitTotals.expense)} MAD
                </p>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { label: "7j", value: 7 },
                  { label: "30j", value: 30 },
                  { label: "90j", value: 90 },
                  { label: "12m", value: 365 },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setProfitRangeDays(option.value as 7 | 30 | 90 | 365)
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      profitRangeDays === option.value
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-[var(--surface)] text-gray-500 hover:border-emerald-200 hover:text-emerald-600"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartProfitExpense}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expense" fill="#fb977d" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 grid gap-6">
          <Card className="spike-card p-6">
            <div className="space-y-1">
              <p className="spike-title">Traffic Distribution</p>
              <p className="spike-subtitle">Répartition des sources</p>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-4">
              <div className="space-y-3">
                <p className="text-2xl font-semibold text-gray-900">
                  {trafficTotal.toLocaleString("fr-FR")}
                </p>
              <div className="space-y-2 text-xs text-gray-500">
                  {chartTrafficData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span
                        className="spike-dot"
                        style={{ background: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartTrafficData}
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartTrafficData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card className="spike-card p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="spike-title">Trafic navigation</p>
                <p className="spike-subtitle">Visites · 7 derniers jours</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  salesSummary.positive
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-500"
                }`}
              >
                {salesSummary.deltaPct >= 0 ? "+" : ""}
                {salesSummary.deltaPct}%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-semibold text-gray-900">
                {formatAmount(salesSummary.net)} visites
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <ArrowUpRight
                  className={`h-4 w-4 ${
                    salesSummary.positive ? "text-emerald-500" : "text-red-500"
                  }`}
                />
                {salesSummary.deltaPct >= 0 ? "+" : ""}
                {salesSummary.deltaPct}% {salesSummary.label}
              </div>
            </div>
            <div className="mt-4 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSalesSpark}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8763da" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8763da" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8763da"
                    strokeWidth={2}
                    fill="url(#salesFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      <Card className="spike-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="spike-title">Journal d’upload</p>
            <p className="spike-subtitle">
              Suivi en temps réel des imports/exports système.
            </p>
          </div>
          <span className="rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-xs text-gray-500">
            Rafraîchissement auto
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {activityLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
              Aucun log pour le moment.
            </div>
          ) : (
            activityLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 px-4 py-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {log.message}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.created_at).toLocaleString("fr-FR")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {log.actor_email ? log.actor_email : "Admin système"}
                    {log.actor_ip ? ` · IP ${log.actor_ip}` : ""}
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
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Card className="spike-card p-6">
            <div className="space-y-1">
              <p className="spike-title">Upcoming Schedules</p>
              <p className="spike-subtitle">Agenda supervision</p>
            </div>
            <div className="mt-6 space-y-4">
              {chartScheduleItems.map((item, idx) => (
                <div
                  key={`${item.title}-${item.subtitle}-${idx}`}
                  className="grid grid-cols-[auto,1fr] gap-3"
                >
                  <div className="flex flex-col items-center">
                    <span className="spike-dot" style={{ background: "#10b981" }} />
                    {idx < chartScheduleItems.length - 1 ? (
                      <span className="mt-2 h-6 w-px bg-gray-200" />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500">{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="lg:col-span-8">
          <Card className="spike-card p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="spike-title">Top Paying Clients</p>
                <p className="spike-subtitle">Priorités internes</p>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
              <table className="spike-table w-full">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th>Id</th>
                    <th>Assigné</th>
                    <th>Nom</th>
                    <th>Priorité</th>
                    <th className="text-right">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {platformLoading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
                        Chargement des données…
                      </td>
                    </tr>
                  ) : chartTopClients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
                        Aucune donnée disponible.
                      </td>
                    </tr>
                  ) : (
                    chartTopClients.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>
                          <div className="text-sm font-semibold text-gray-900">
                            {item.team}
                          </div>
                          <div className="text-xs text-gray-500">Equipe</div>
                        </td>
                        <td className="text-sm text-gray-600">{item.name}</td>
                        <td>
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                            {item.priority}
                          </span>
                        </td>
                        <td className="text-right font-semibold text-gray-900">
                          {item.budget}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <Card className="spike-card p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="spike-title">Product Cards</p>
            <p className="spike-subtitle">Modules premium</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CalendarCheck className="h-4 w-4 text-emerald-500" />
            Mise à jour hebdo
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {chartProductCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-4 shadow-sm"
            >
              <div className="mb-3 h-20 rounded-2xl bg-gradient-to-br from-emerald-50 via-[var(--surface)] to-emerald-100" />
              <p className="text-sm font-semibold text-gray-900">{card.title}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span className="font-semibold text-gray-900">
                  {card.price} MAD
                </span>
                <span className="line-through">{card.old} MAD</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card className="spike-card p-6">
            <div className="space-y-1">
              <p className="spike-title">Croissance utilisateurs</p>
              <p className="spike-subtitle">Nouveaux comptes · 30 jours</p>
            </div>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    fill="url(#growthFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-4">
          <Card className="spike-card p-6">
            <div className="space-y-1">
              <p className="spike-title">Activation onboarding</p>
              <p className="spike-subtitle">Progression par étape</p>
            </div>
            <div className="mt-4 space-y-4 text-sm text-gray-600">
              {[
                { label: "Enveloppes", value: onboarding?.envelopes ?? 0 },
                { label: "Catégories", value: onboarding?.categories ?? 0 },
                { label: "Transactions", value: onboarding?.transactions ?? 0 },
              ].map((item) => {
                const percent =
                  onboardingTotal > 0
                    ? Math.round((item.value / onboardingTotal) * 100)
                    : 0;
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>{item.label}</span>
                      <span className="text-xs text-gray-500">
                        {percent}% ({item.value}/{onboardingTotal || 0})
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Moyenne avant 1ère transaction:{" "}
                {platformAnalytics?.avg_days_to_first_tx.toFixed(1) ?? "0"} jour(s)
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card className="spike-card p-6">
            <div className="space-y-1">
              <p className="spike-title">Utilisateurs actifs</p>
              <p className="spike-subtitle">Actifs par semaine</p>
            </div>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActiveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8763da" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-5">
          <Card className="spike-card p-6">
            <div className="space-y-1">
              <p className="spike-title">Inactivité</p>
              <p className="spike-subtitle">Dernière transaction</p>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-4">
              <div className="space-y-2 text-xs text-gray-500">
                {churnData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="spike-dot" style={{ background: item.color }} />
                    <span>
                      {item.name} · {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="h-32 w-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={churnData}
                      dataKey="value"
                      innerRadius={35}
                      outerRadius={55}
                      stroke="none"
                    >
                      {churnData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card className="spike-card p-6">
            <div className="space-y-1">
              <p className="spike-title">Revenus vs Dépenses</p>
              <p className="spike-subtitle">Vue mensuelle</p>
            </div>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyFinanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" fill="#fb977d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-4">
          <Card className="spike-card p-6">
            <div className="space-y-1">
              <p className="spike-title">Rollover usage</p>
              <p className="spike-subtitle">Enveloppes ON vs OFF</p>
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-4">
              <div className="space-y-2 text-xs text-gray-500">
                {rolloverData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="spike-dot" style={{ background: item.color }} />
                    <span>
                      {item.name} · {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="h-32 w-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rolloverData}
                      dataKey="value"
                      innerRadius={35}
                      outerRadius={55}
                      stroke="none"
                    >
                      {rolloverData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Card className="spike-card p-6">
            <div className="space-y-1">
              <p className="spike-title">Top catégories</p>
              <p className="spike-subtitle">Dépenses cumulées</p>
            </div>
            <div className="mt-4 space-y-3">
              {(platformAnalytics?.top_categories ?? []).slice(0, 6).map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {formatAmount(item.total)} MAD
                  </span>
                </div>
              ))}
              {platformAnalytics?.top_categories?.length ? null : (
                <p className="text-xs text-gray-500">Aucune donnée.</p>
              )}
            </div>
          </Card>
        </div>
        <div className="lg:col-span-6">
          <Card className="spike-card p-6">
            <div className="space-y-1">
              <p className="spike-title">Top enveloppes</p>
              <p className="spike-subtitle">Dépenses par enveloppe</p>
            </div>
            <div className="mt-4 space-y-3">
              {(platformAnalytics?.top_envelopes ?? []).slice(0, 6).map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {formatAmount(item.total)} MAD
                  </span>
                </div>
              ))}
              {platformAnalytics?.top_envelopes?.length ? null : (
                <p className="text-xs text-gray-500">Aucune donnée.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,1.4fr]">
        <Card className="spike-card p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="spike-title">Utilisateurs</p>
              <p className="spike-subtitle">
                {users.length} compte(s) chargés
              </p>
            </div>
            <div className="relative w-48">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Recherche..."
                className="pl-8"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {loadingUsers ? (
              <p className="text-xs text-gray-500">Chargement…</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-gray-500">Aucun utilisateur.</p>
            ) : (
              users.map((item) => {
                const label =
                  [item.first_name, item.last_name].filter(Boolean).join(" ") ||
                  item.email;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedUserId(item.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition ${
                      selectedUserId === item.id
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-gray-100 bg-[var(--surface)] hover:border-emerald-200"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{item.email}</p>
                    </div>
                    <Badge tone="muted">{item.role ?? "user"}</Badge>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="spike-card p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="spike-title">Détails utilisateur</p>
              <p className="spike-subtitle">
                {selectedEmail ? selectedEmail : "Sélectionne un compte"}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!selectedUserId}
              onClick={handleActAs}
            >
              <ArrowUpRightFromCircle className="mr-2 h-4 w-4" />
              Ouvrir en mode utilisateur
            </Button>
          </div>
          <div className="mt-4 grid gap-4">
            {!selectedUserId ? (
              <p className="text-xs text-gray-500">
                Choisis un utilisateur pour afficher ses données.
              </p>
            ) : loadingDetails ? (
              <p className="text-xs text-gray-500">Chargement des détails…</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <p className="text-xs text-gray-500">Catégories</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedSummary?.categories ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <p className="text-xs text-gray-500">Enveloppes</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedSummary?.envelopes ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <p className="text-xs text-gray-500">Transactions</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedSummary?.transactions ?? 0}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-3 text-sm">
                  <p className="font-semibold text-gray-900">
                    {selectedDisplayName || "Utilisateur"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedUser?.email} · {selectedUser?.currency ?? "—"} ·{" "}
                    Sweep {selectedUser?.sweep_interval_days ?? "—"}j
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Mapping: {mappingCount} categorie(s) reliée(s)
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      Transactions récentes
                    </p>
                    <Badge tone="muted">
                      {selectedTransactions.length} total
                    </Badge>
                  </div>
                  <div className="max-h-64 overflow-auto rounded-2xl border border-gray-100">
                    <table className="spike-table w-full">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th>Date</th>
                          <th>Type</th>
                          <th className="text-right">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTransactions.slice(0, 6).map((tx) => (
                          <tr key={tx.id}>
                            <td>{tx.occurred_on}</td>
                            <td>{tx.type}</td>
                            <td className="text-right">{tx.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        Enveloppes
                      </p>
                      <Badge tone="muted">{selectedEnvelopes.length}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedEnvelopes.slice(0, 8).map((env) => (
                        <span
                          key={env.id}
                          className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                        >
                          {env.name}
                        </span>
                      ))}
                      {selectedEnvelopes.length === 0 ? (
                        <span className="text-xs text-gray-500">
                          Aucune enveloppe.
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        Catégories
                      </p>
                      <Badge tone="muted">{selectedCategories.length}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCategories.slice(0, 8).map((cat) => (
                        <span
                          key={cat.id}
                          className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800"
                        >
                          {cat.name}
                        </span>
                      ))}
                      {selectedCategories.length === 0 ? (
                        <span className="text-xs text-gray-500">
                          Aucune catégorie.
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
