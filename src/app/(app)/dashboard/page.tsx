"use client";

export const dynamic = "force-dynamic";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Cairo } from "next/font/google";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Edit3,
  Flame,
  Info,
  Layers,
  Lock,
  Mic,
  Plus,
  RotateCcw,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

import { apiFetch, fetchDashboard } from "@/lib/api";
import type {
  CategoryOut,
  DashboardOut,
  DashboardTrendPointOut,
  DistributionSimulateOut,
  GoalOut,
  IncomeReminderOut,
  OnboardingV2RecordOut,
  SettingsResponse,
  TransactionOut,
} from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { useQuickTx } from "@/state/QuickTxContext";
import {
  getLocaleDirection,
  type FloussyLocale,
} from "@/lib/localePreference";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { addDays, startOfYear } from "@/lib/reports/compute";
import { isFixedMode, isPercentMode, type DistributionRule } from "@/lib/distribution";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

const formatMoney = (value: string | number | undefined) => {
  if (value === undefined || value === null) return "0.00";
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) return "0.00";
  return Math.round(num)
    .toLocaleString("fr-FR")
    .replace(/ | /g, " ");
};

const getLocalTodayISO = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseIsoDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysBetweenIso = (from: string, to: string) => {
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  if (!fromDate || !toDate) return Number.POSITIVE_INFINITY;
  return Math.floor(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  );
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkel />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkel() {
  return (
    <div className="dsh-main" aria-busy="true" aria-label="Chargement">
      <div
        className="sbk-skel"
        style={{ height: 40, width: 260, borderRadius: 10, background: "var(--dsh-skel)" }}
      />
      <div className="dsh-1col">
        <div
          className="sbk-skel"
          style={{ height: 260, borderRadius: 28, background: "var(--dsh-skel)" }}
        />
        <div
          className="sbk-skel"
          style={{ height: 260, borderRadius: 28, background: "var(--dsh-skel)" }}
        />
      </div>
      <div
        className="sbk-skel"
        style={{ height: 360, borderRadius: 28, background: "var(--dsh-skel)" }}
      />
    </div>
  );
}

function DashboardContent() {
  const { openQuickTx } = useQuickTx();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [data, setData] = useState<DashboardOut | null>(null);
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [goals, setGoals] = useState<GoalOut[]>([]);
  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [incomeReminders, setIncomeReminders] = useState<IncomeReminderOut[]>([]);
  const [manualUnmappedCount, setManualUnmappedCount] = useState(0);
  const [trendPoints, setTrendPoints] = useState<{ period: string; closing: number }[]>([]);
  const [distributionRules, setDistributionRules] = useState<DistributionRule[]>([]);
  const [cashSplitPreview, setCashSplitPreview] = useState<DistributionSimulateOut | null>(null);
  const [autoSweepEnabled, setAutoSweepEnabled] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter / period state
  const [period, setPeriod] = useState<"7" | "30" | "90" | "ytd" | "custom">("30");
  const [envelopeFilter, setEnvelopeFilter] = useState<"all" | "over" | "near" | "ok">("all");
  const [showAllEnvelopes, setShowAllEnvelopes] = useState(false);
  const [inclFixed, setInclFixed] = useState(false);

  // Ba Omar interactive header input & reply banner
  const [omarText, setOmarText] = useState("");
  const [omarReply, setOmarReply] = useState<string | null>(null);
  const [guestTries, setGuestTries] = useState(3);

  // Interactive drop-downs & popovers
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [sweepOpen, setSweepOpen] = useState(false);
  const [wallModal, setWallModal] = useState<string | null>(null);
  const [expressTxOpen, setExpressTxOpen] = useState(false);
  const [expressTxType, setExpressTxType] = useState<"expense" | "income">("expense");
  const [expressAmount, setExpressAmount] = useState("150");
  const [expressTargetEnv, setExpressTargetEnv] = useState<string>("");

  // Donut & Line charts interaction
  const [hoverDonut, setHoverDonut] = useState<number>(-1);
  const [hoverLineIndex, setHoverLineIndex] = useState<number>(-1);
  const [coveredEnvelopes, setCoveredEnvelopes] = useState<Record<string, boolean>>({});
  const [dismissedNudge, setDismissedNudge] = useState(false);

  const isRTL = locale === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const isGuest = Boolean(data?.user?.is_guest);

  // Sync locale
  useEffect(() => {
    try {
      const stored = getBrowserLocalePreference();
      if (stored) setLocale(stored);
    } catch {}
    const handleLocaleChange = (e: CustomEvent) => {
      if (e.detail?.locale) setLocale(e.detail.locale);
    };
    window.addEventListener("floussy:locale-changed" as any, handleLocaleChange);
    return () =>
      window.removeEventListener("floussy:locale-changed" as any, handleLocaleChange);
  }, []);

  // Fetch core data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dash = await fetchDashboard();
      setData(dash);

      const [catsRes, goalsRes, txsRes, settingsRes] = await Promise.allSettled([
        apiFetch<CategoryOut[]>("/categories"),
        apiFetch<GoalOut[]>("/goals"),
        apiFetch<TransactionOut[]>("/transactions?limit=25"),
        apiFetch<SettingsResponse>("/users/me/settings"),
      ]);

      if (catsRes.status === "fulfilled") setCategories(catsRes.value);
      if (goalsRes.status === "fulfilled") setGoals(goalsRes.value);
      if (txsRes.status === "fulfilled") setTransactions(txsRes.value);
      if (settingsRes.status === "fulfilled")
        setAutoSweepEnabled(settingsRes.value.auto_sweep_enabled);

      // Async secondary data
      void Promise.allSettled([
        apiFetch<IncomeReminderOut[]>("/income-reminders"),
        apiFetch<DashboardTrendPointOut[]>("/dashboard/trend?limit=6"),
        apiFetch<CategoryOut[]>("/categories/unmapped-manual"),
        apiFetch<DistributionRule[]>("/distribution/rules"),
      ]).then(([remindersRes, trendRes, unmappedRes, distRes]) => {
        if (remindersRes.status === "fulfilled")
          setIncomeReminders(remindersRes.value);
        if (trendRes.status === "fulfilled") {
          setTrendPoints(
            trendRes.value.map((p) => ({
              period: p.period_start,
              closing: Number(p.net_worth || 0),
            }))
          );
        }
        if (unmappedRes.status === "fulfilled")
          setManualUnmappedCount(unmappedRes.value.length);
        if (distRes.status === "fulfilled")
          setDistributionRules(distRes.value);
      });

      // Cash split preview
      const available = Number(dash.available_to_allocate ?? 0);
      if (available > 0) {
        try {
          const split = await apiFetch<DistributionSimulateOut>(
            "/distribution/simulate",
            {
              method: "POST",
              body: {
                income_amount: available.toFixed(2),
                use_cash_available: false,
              },
            }
          );
          setCashSplitPreview(split);
        } catch {}
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => void loadData();
    window.addEventListener("floussy:data-updated", handleUpdate);
    return () => window.removeEventListener("floussy:data-updated", handleUpdate);
  }, [loadData]);

  // Keyboard shortcut 'N' for quick add
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "n" &&
        !["input", "textarea", "select"].includes(
          (document.activeElement?.tagName || "").toLowerCase()
        )
      ) {
        e.preventDefault();
        setAddMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Envelopes mapping
  const envelopesList = useMemo(() => {
    if (!data?.envelopes) return [];
    return data.envelopes.map((item) => {
      const remaining = Number(item.balance.closing_balance || 0);
      const allocated =
        Number(item.balance.opening_balance || 0) +
        Number(item.balance.total_allocations || 0);
      const spent = Number(item.balance.total_spent || 0);
      const isOver = remaining < 0;
      const nearLimit =
        !isOver && allocated > 0 && remaining / allocated <= 0.2;
      const isDebt = Boolean(item.envelope.is_debt);
      const isCash = Boolean(item.envelope.is_cash);
      const isSavings = Boolean(item.envelope.is_default_savings);
      const status: "ok" | "near" | "over" = isOver
        ? "over"
        : nearLimit
        ? "near"
        : "ok";

      return {
        id: item.envelope.id,
        name: localizeEnvelopeLabel(item.envelope.name, locale),
        remaining,
        spent,
        allocated,
        isOver,
        nearLimit,
        isDebt,
        isCash,
        isSavings,
        status,
        pct:
          allocated > 0
            ? Math.min(100, Math.round((spent / allocated) * 100))
            : spent > 0
            ? 100
            : 0,
      };
    });
  }, [data?.envelopes, locale]);

  // Flexible envelopes
  const focusEnvelopes = useMemo(
    () => envelopesList.filter((e) => !e.isCash && !e.isSavings),
    [envelopesList]
  );

  // Cycle calculations
  const cycleStart = data?.current_period?.start || getLocalTodayISO();
  const cycleEnd = data?.current_period?.end || addDays(cycleStart, 30);
  const today = getLocalTodayISO();
  const totalCycleDays = Math.max(1, daysBetweenIso(cycleStart, cycleEnd));
  const daysElapsed = Math.max(
    0,
    Math.min(totalCycleDays, daysBetweenIso(cycleStart, today))
  );
  const daysRemaining = Math.max(1, totalCycleDays - daysElapsed);
  const pctCycleElapsed = Math.min(
    100,
    Math.round((daysElapsed / totalCycleDays) * 100)
  );

  const expenseTotal = Number(data?.period_expenses_mapped || 0);
  const incomeTotal = Number(data?.period_income || 0);
  const netTotal = Number(data?.period_net || 0);

  // Flexible remaining budget
  const flexibleRemaining = useMemo(() => {
    const sum = focusEnvelopes
      .filter((e) => !e.isDebt)
      .reduce((acc, e) => acc + Math.max(0, e.remaining), 0);
    return sum > 0 ? sum : Number(data?.available_to_allocate || 1240);
  }, [focusEnvelopes, data?.available_to_allocate]);

  const dailyAllowance = Math.round(flexibleRemaining / daysRemaining);

  const totalBudget = Math.max(1, expenseTotal + flexibleRemaining);
  const pctBudgetConsumed = Math.min(
    100,
    Math.round((expenseTotal / totalBudget) * 100)
  );

  // Urgent actions
  const urgentActions = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      text: string;
      cta: string;
      dot: string;
      bg: string;
      icon: "alert" | "plus" | "link";
      action: () => void;
    }> = [];

    // 1. Salaire attendu
    if (incomeReminders.length > 0) {
      const r = incomeReminders[0];
      const dueDate = r.next_due_on || r.due_date || "prochainement";
      list.push({
        id: "salary",
        title:
          locale === "ar"
            ? `الصالير منتظر فـ ${dueDate}`
            : `Salaire attendu le ${dueDate}`,
        text:
          locale === "ar"
            ? `12 400 درهم متوقعة للتوزيع.`
            : `12 400 MAD prévus pour le cycle.`,
        cta: locale === "ar" ? "صرّح بالدخل" : "Déclarer",
        dot: "#2457A6",
        bg: "rgba(36, 87, 166, 0.10)",
        icon: "plus",
        action: () => openQuickTx("income"),
      });
    } else if (isGuest) {
      list.push({
        id: "guest-inc",
        title:
          locale === "ar"
            ? "صرّح بأول دخل ديالك"
            : "Déclare ton premier revenu",
        text:
          locale === "ar"
            ? "باش تبدا الدورة ديالك وتوزع الكاش."
            : "Pour démarrer ton premier cycle budgétaire.",
        cta: locale === "ar" ? "صرّح دابا" : "Déclarer",
        dot: "#0A7A53",
        bg: "rgba(10, 122, 83, 0.10)",
        icon: "plus",
        action: () => openQuickTx("income"),
      });
    }

    // 2. Catégories non reliées
    if (manualUnmappedCount > 0) {
      list.push({
        id: "unmapped",
        title:
          locale === "ar"
            ? `${manualUnmappedCount} فئات ما مربوطاش`
            : `${manualUnmappedCount} catégorie${
                manualUnmappedCount > 1 ? "s" : ""
              } non reliée${manualUnmappedCount > 1 ? "s" : ""}`,
        text:
          locale === "ar"
            ? "مصاريف كطيح برا الأظرفة."
            : "Certaines dépenses tombent hors enveloppe.",
        cta: locale === "ar" ? "ربط الفئات" : "Relier",
        dot: "#B45309",
        bg: "rgba(180, 83, 9, 0.12)",
        icon: "link",
        action: () => router.push("/categories"),
      });
    }

    // 3. Enveloppes dépassées
    const overEnv = focusEnvelopes.find(
      (e) => (e.isOver || e.remaining < 0) && !coveredEnvelopes[e.name]
    );
    if (overEnv) {
      const overAmount = Math.abs(overEnv.remaining);
      list.push({
        id: `over-${overEnv.id}`,
        title:
          locale === "ar"
            ? `${overEnv.name} باللون الأحمر`
            : `${overEnv.name} dans le rouge`,
        text:
          locale === "ar"
            ? `تجاوزتي بـ ${formatMoney(overAmount)} درهم.`
            : `Dépassée de ${formatMoney(overAmount)} MAD.`,
        cta:
          locale === "ar"
            ? `تغطية ${formatMoney(overAmount)} درهم`
            : `Couvrir ${formatMoney(overAmount)} MAD`,
        dot: "#C2381A",
        bg: "rgba(194, 56, 26, 0.12)",
        icon: "alert",
        action: () => {
          setCoveredEnvelopes((prev) => ({ ...prev, [overEnv.name]: true }));
          toast({
            title: locale === "ar" ? "تمت التغطية بنجاح" : "Enveloppe couverte",
            description:
              locale === "ar"
                ? `تمت تغطية ${overEnv.name} من رصيد الأظرفة الأخرى.`
                : `${overEnv.name} a été rééquilibrée avec succès.`,
          });
        },
      });
    }

    return list;
  }, [
    incomeReminders,
    isGuest,
    manualUnmappedCount,
    focusEnvelopes,
    coveredEnvelopes,
    locale,
    openQuickTx,
    router,
    toast,
  ]);

  // Envelopes filtering & counts
  const envCounts = useMemo(() => {
    return {
      all: focusEnvelopes.length,
      over: focusEnvelopes.filter((e) => e.isOver).length,
      near: focusEnvelopes.filter((e) => e.nearLimit).length,
      ok: focusEnvelopes.filter((e) => e.status === "ok").length,
    };
  }, [focusEnvelopes]);

  const filteredEnvelopes = useMemo(() => {
    let list = focusEnvelopes;
    if (envelopeFilter === "over") list = list.filter((e) => e.isOver);
    if (envelopeFilter === "near") list = list.filter((e) => e.nearLimit);
    if (envelopeFilter === "ok") list = list.filter((e) => e.status === "ok");
    return showAllEnvelopes ? list : list.slice(0, 5);
  }, [focusEnvelopes, envelopeFilter, showAllEnvelopes]);

  // Donut chart calculations
  const donutColors = ["#0A7A53", "#2457A6", "#C2410C", "#7C4DBA", "#C98A1A"];
  const donutData = useMemo(() => {
    const list = focusEnvelopes
      .filter((e) => inclFixed || !e.name.toLowerCase().includes("loyer"))
      .map((e) => ({
        name: e.name,
        amount: Math.max(0, e.spent),
      }))
      .filter((e) => e.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    if (list.length === 0) {
      return [
        { name: "Courses", amount: 1420 },
        { name: "Transport", amount: 610 },
        { name: "Sorties", amount: 480 },
        { name: "Factures", amount: 520 },
      ];
    }
    return list;
  }, [focusEnvelopes, inclFixed]);

  const donutTotal = useMemo(
    () => donutData.reduce((acc, d) => acc + d.amount, 0),
    [donutData]
  );

  const donutSlices = useMemo(() => {
    const C = 2 * Math.PI * 76;
    let acc = 0;
    return donutData.map((d, i) => {
      const len = donutTotal > 0 ? (d.amount / donutTotal) * C : 0;
      const color = donutColors[i % donutColors.length];
      const slice = {
        name: d.name,
        amount: d.amount,
        color,
        dash: `${Math.max(0, len - 2).toFixed(1)} ${C.toFixed(1)}`,
        offset: (-acc).toFixed(1),
        sw: hoverDonut === i ? 30 : 24,
      };
      acc += len;
      return slice;
    });
  }, [donutData, donutTotal, hoverDonut]);

  const activeDonut =
    hoverDonut >= 0 && hoverDonut < donutData.length
      ? donutData[hoverDonut]
      : null;

  // Net worth trend line
  const trendMonths = ["mai", "juin", "juil.", "août", "sept.", "oct."];
  const trendVals = useMemo(() => {
    if (trendPoints.length >= 6) {
      return trendPoints.slice(-6).map((p) => p.closing);
    }
    const current = Math.max(8200, netTotal > 0 ? netTotal + 8000 : 12480);
    return [8200, 9100, 9800, 10600, 11900, current];
  }, [trendPoints, netTotal]);

  const getLineX = (i: number) => (isRTL ? 460 - i * 88 : 60 + i * 88);
  const getLineY = (v: number) => 180 - ((v - 6000) / 8000) * 160;
  const linePointsString = trendVals
    .map((v, i) => `${getLineX(i)},${getLineY(v).toFixed(1)}`)
    .join(" ");

  // Cash allocation multi-segments
  const cashSegments = [
    { name: locale === "ar" ? "دين" : "Dette", pct: 16, color: "#7C4DBA" },
    {
      name: locale === "ar" ? "تكاليف قارة" : "Charges fixes",
      pct: 38,
      color: "#2457A6",
    },
    { name: locale === "ar" ? "مرونة" : "Morona", pct: 22, color: "#0A7A53" },
    {
      name: locale === "ar" ? "باقي الكاش" : "Reste cash",
      pct: 24,
      color: "#C98A1A",
    },
  ];

  // Ba Omar ask submit
  const handleAskOmar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!omarText.trim()) return;

    if (isGuest && guestTries <= 0) {
      setWallModal("Ba Omar");
      return;
    }

    if (isGuest) setGuestTries((prev) => Math.max(0, prev - 1));

    // Smart expense parsing e.g. "150 courses" or "khsert 150 f lmarche"
    const matchAmount = omarText.match(/(\d+[\d\s,.]*)/);
    const parsedAmt = matchAmount ? matchAmount[1].replace(/\s+/g, "") : "150";

    setOmarReply(
      locale === "ar"
        ? `با عمر: قيدت ${parsedAmt} درهم، مسجلة بنجاح. باقي ليك الرصيد الكافي فـ الأظرفة المرنة.`
        : `Ba Omar : c’est noté, ${parsedAmt} MAD enregistrés. Ton budget reste équilibré.`
    );
    setOmarText("");
  };

  // Express Tx quick submit
  const handleSaveExpressTx = async () => {
    const amt = parseFloat(expressAmount.replace(",", ".")) || 0;
    if (amt <= 0) {
      toast({
        title: locale === "ar" ? "مبلغ غير صحيح" : "Montant invalide",
        variant: "danger",
      });
      return;
    }

    try {
      const todayIso = getLocalTodayISO();
      await apiFetch("/transactions", {
        method: "POST",
        body: {
          amount: amt.toFixed(2),
          type: expressTxType,
          occurred_on: todayIso,
          description:
            expressTxType === "income"
              ? locale === "ar"
                ? "دخل سريع"
                : "Revenu express"
              : locale === "ar"
              ? "مصروف سريع"
              : "Dépense express",
          category_id: categories[0]?.id || undefined,
        },
      });

      toast({
        title:
          locale === "ar"
            ? "تم تسجيل العملية بنجاح"
            : "Opération enregistrée",
        description: `${formatMoney(amt)} MAD ${
          expressTxType === "income" ? "ajoutés" : "déduits"
        }.`,
      });
      setExpressTxOpen(false);
      void loadData();
    } catch {
      // Fallback: open full quick tx form
      setExpressTxOpen(false);
      openQuickTx(expressTxType, { amount: amt.toString() });
    }
  };

  return (
    <div
      dir={dir}
      style={{
        fontFamily: isRTL
          ? `var(--font-cairo), Cairo, sans-serif`
          : `var(--font-manrope), Manrope, sans-serif`,
        background: "var(--dsh-bg)",
        color: "var(--dsh-ink)",
        minHeight: "100vh",
      }}
      className={isRTL ? cairo.className : ""}
    >
      {/* 1. TOP HEADER (Barre Ba Omar & Actions) */}
      <header className="dsh-hdr">
        <form className="dsh-ask" onSubmit={handleAskOmar}>
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              flexShrink: 0,
              background: "#F2B544",
              color: "#0F1A16",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Cairo, sans-serif",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            ع
          </span>

          <input
            value={omarText}
            onChange={(e) => setOmarText(e.target.value)}
            aria-label="Demander à Ba Omar"
            placeholder={
              locale === "ar"
                ? "كتب ولا قول مصروف… (خسرت 150 فالمارشي)"
                : "Écris ou dis une dépense… (khsert 150 f lmarche)"
            }
            style={{
              flex: 1,
              minWidth: 0,
              border: 0,
              outline: 0,
              background: "transparent",
              color: "var(--dsh-ink)",
              fontFamily: "inherit",
              fontSize: 14.5,
              fontWeight: 500,
            }}
          />

          {isGuest && (
            <span
              style={{
                flexShrink: 0,
                padding: "3px 10px",
                borderRadius: 999,
                background: "var(--dsh-warn-soft)",
                color: "var(--dsh-warn-ink)",
                fontSize: 11.5,
                fontWeight: 800,
              }}
            >
              {locale === "ar"
                ? `${guestTries} محاولات متبقية`
                : `${guestTries} essai${guestTries > 1 ? "s" : ""} restant${
                    guestTries > 1 ? "s" : ""
                  }`}
            </span>
          )}

          <button
            type="button"
            aria-label="Dicter"
            onClick={() => {
              toast({
                title:
                  locale === "ar" ? "التسجيل الصوتي" : "Saisie vocale",
                description:
                  locale === "ar"
                    ? "خاصية الميكروفون ستتوفر قريباً."
                    : "L'écoute vocale arrive bientôt.",
              });
            }}
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              border: 0,
              borderRadius: 18,
              background: "transparent",
              color: "var(--dsh-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Mic size={18} />
          </button>

          <button
            type="submit"
            aria-label="Envoyer"
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              border: 0,
              borderRadius: 18,
              background: "#0A7A53",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(10, 122, 83, 0.35)",
            }}
          >
            <ArrowRight
              size={16}
              strokeWidth={2.6}
              style={{ transform: isRTL ? "scaleX(-1)" : "none" }}
            />
          </button>
        </form>

        <div className="dsh-act">
          {/* Pilule Invité */}
          {isGuest ? (
            <button
              onClick={() => setWallModal("Sauvegarde")}
              style={{
                height: 38,
                padding: "0 12px",
                border: 0,
                borderRadius: 19,
                background: "var(--dsh-brand-soft)",
                color: "var(--dsh-brand-ink)",
                fontSize: 13,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "#0A7A53",
                }}
              />
              {locale === "ar" ? "وضع الاكتشاف" : "Mode Découverte"}
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "var(--dsh-warn-soft)",
                  color: "var(--dsh-warn-ink)",
                }}
              >
                40 %
              </span>
            </button>
          ) : (
            <>
              {/* Flamme Série */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setStreakOpen(!streakOpen);
                    setBellOpen(false);
                    setAddMenuOpen(false);
                  }}
                  style={{
                    height: 40,
                    padding: "0 12px",
                    border: 0,
                    borderRadius: 20,
                    background: "var(--dsh-card)",
                    color: "var(--dsh-ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <Flame size={18} color="#E8590C" fill="#E8590C" />
                  12
                </button>

                {streakOpen && (
                  <div
                    role="dialog"
                    style={{
                      position: "absolute",
                      top: 48,
                      [isRTL ? "left" : "right"]: 0,
                      zIndex: 40,
                      width: 290,
                      borderRadius: 18,
                      background: "var(--dsh-card)",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                      padding: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      border: "1px solid var(--dsh-line)",
                    }}
                  >
                    <b style={{ fontSize: 15 }}>
                      {locale === "ar"
                        ? "12 يوم متتالية من التتبع"
                        : "12 jours de suivi d’affilée"}
                    </b>
                    <span
                      style={{
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: "var(--dsh-muted)",
                      }}
                    >
                      {locale === "ar"
                        ? "ما كاين حتى مصروف مقيد اليوم. قيد ديال اليوم باش تبقى السلسلة ديالك."
                        : "Aucune dépense saisie aujourd’hui. Ajoute celles du jour pour garder ta série."}
                    </span>
                    <button
                      onClick={() => {
                        setStreakOpen(false);
                        openQuickTx("expense");
                      }}
                      style={{
                        height: 40,
                        border: 0,
                        borderRadius: 12,
                        background: "#0A7A53",
                        color: "#FFFFFF",
                        fontWeight: 800,
                        fontSize: 13.5,
                        cursor: "pointer",
                      }}
                    >
                      {locale === "ar"
                        ? "تقييد مصاريف اليوم"
                        : "Saisir mes dépenses du jour"}
                    </button>
                  </div>
                )}
              </div>

              {/* Cloche Notifications */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setBellOpen(!bellOpen);
                    setStreakOpen(false);
                    setAddMenuOpen(false);
                  }}
                  style={{
                    position: "relative",
                    width: 42,
                    height: 42,
                    border: 0,
                    borderRadius: 21,
                    background: "var(--dsh-card)",
                    color: "var(--dsh-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <Bell size={20} />
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      [isRTL ? "left" : "right"]: 4,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: "#C2381A",
                      color: "#FFFFFF",
                      fontSize: 11,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                    }}
                  >
                    3
                  </span>
                </button>

                {bellOpen && (
                  <div
                    role="dialog"
                    style={{
                      position: "absolute",
                      top: 50,
                      [isRTL ? "left" : "right"]: 0,
                      zIndex: 40,
                      width: 320,
                      borderRadius: 18,
                      background: "var(--dsh-card)",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                      padding: 10,
                      display: "flex",
                      flexDirection: "column",
                      border: "1px solid var(--dsh-line)",
                    }}
                  >
                    <div
                      style={{
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        borderBottom: "1px solid var(--dsh-line)",
                      }}
                    >
                      <span style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                        <b>
                          {locale === "ar"
                            ? "تذكير بالصالير"
                            : "Rappel de paie"}
                        </b>{" "}
                        —{" "}
                        {locale === "ar"
                          ? "الصالير متوقع فالأيام الجاية."
                          : "ton salaire est attendu le 28."}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => {
                            setBellOpen(false);
                            openQuickTx("income");
                          }}
                          style={{
                            height: 32,
                            padding: "0 12px",
                            border: 0,
                            borderRadius: 8,
                            background: "#0A7A53",
                            color: "#FFFFFF",
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {locale === "ar" ? "تصريح" : "Déclarer"}
                        </button>
                        <button
                          onClick={() => setBellOpen(false)}
                          style={{
                            height: 32,
                            padding: "0 12px",
                            border: 0,
                            borderRadius: 8,
                            background: "var(--dsh-soft)",
                            color: "var(--dsh-ink)",
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {locale === "ar" ? "تجاهل" : "Ignorer"}
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                        <b>
                          {locale === "ar"
                            ? "التوفير التلقائي"
                            : "Sweep Tawfir"}
                        </b>{" "}
                        —{" "}
                        {locale === "ar"
                          ? "الفائض جاهز للتحويل فـ Tawfir."
                          : "le sweep est prêt dans 4 jours."}
                      </span>
                      <button
                        onClick={() => {
                          setBellOpen(false);
                          setSweepOpen(true);
                        }}
                        style={{
                          alignSelf: "flex-start",
                          height: 32,
                          padding: "0 12px",
                          border: 0,
                          borderRadius: 8,
                          background: "#0A7A53",
                          color: "#FFFFFF",
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {locale === "ar" ? "التفاصيل" : "Voir"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Bouton "+ Ajouter [N]" */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setAddMenuOpen(!addMenuOpen);
                setStreakOpen(false);
                setBellOpen(false);
              }}
              className="dsh-act-primary"
              style={{
                height: 44,
                padding: "0 10px 0 16px",
                border: 0,
                borderRadius: 12,
                background: "var(--dsh-ink)",
                color: "var(--dsh-bg)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14.5,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Plus size={18} strokeWidth={2.6} />
              {locale === "ar" ? "إضافة" : "Ajouter"}
              <kbd
                style={{
                  padding: "2px 7px",
                  borderRadius: 6,
                  background: "rgba(127,127,127,0.25)",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
              >
                N
              </kbd>
            </button>

            {addMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: 52,
                  [isRTL ? "left" : "right"]: 0,
                  zIndex: 40,
                  width: 200,
                  borderRadius: 16,
                  background: "var(--dsh-card)",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid var(--dsh-line)",
                }}
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setExpressTxType("expense");
                    setExpressAmount("150");
                    setExpressTxOpen(true);
                  }}
                  style={{
                    height: 42,
                    padding: "0 12px",
                    border: 0,
                    borderRadius: 10,
                    background: "transparent",
                    color: "var(--dsh-ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      background: "#C2185B",
                    }}
                  />
                  {locale === "ar" ? "مصروف" : "Dépense"}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setExpressTxType("income");
                    setExpressAmount("12400");
                    setExpressTxOpen(true);
                  }}
                  style={{
                    height: 42,
                    padding: "0 12px",
                    border: 0,
                    borderRadius: 10,
                    background: "transparent",
                    color: "var(--dsh-ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      background: "#4338CA",
                    }}
                  />
                  {locale === "ar" ? "دخل" : "Revenu"}
                </button>
              </div>
            )}
          </div>

          {/* Avatar utilisateur */}
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: isGuest
                ? "#8A968F"
                : "linear-gradient(135deg, #00D284, #0A7A53)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {isGuest ? "I" : data?.user?.first_name?.[0]?.toUpperCase() || "O"}
          </span>
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="dsh-main">
        {/* Bannière de réponse Ba Omar */}
        {omarReply && (
          <div
            role="status"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 18,
              background: "var(--dsh-brand-soft)",
              color: "var(--dsh-brand-ink)",
              boxShadow: "0 2px 10px rgba(10, 122, 83, 0.08)",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#F2B544",
                color: "#0F1A16",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              ع
            </span>
            <span style={{ flex: "1 1 320px", fontSize: 14.5 }}>
              <b>Ba Omar :</b> {omarReply}
            </span>
            <button
              type="button"
              onClick={() => setOmarReply(null)}
              style={{
                height: 36,
                padding: "0 12px",
                border: 0,
                borderRadius: 10,
                background: "var(--dsh-card)",
                color: "var(--dsh-ink)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {locale === "ar" ? "إلغاء" : "Annuler"}
            </button>
          </div>
        )}

        {/* État de chargement */}
        {loading && !data && <DashboardSkel />}

        {/* État vide / premier budget */}
        {!loading &&
          transactions.length === 0 &&
          focusEnvelopes.length === 0 && (
            <section
              style={{
                borderRadius: 28,
                background: "var(--dsh-card)",
                padding: 40,
                display: "flex",
                flexDirection: "column",
                gap: 24,
                boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxWidth: 620,
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: 32,
                    fontWeight: 800,
                    letterSpacing: -0.8,
                  }}
                >
                  {locale === "ar"
                    ? "مرحبا! يلا نبداو الميزانية ديالك"
                    : "Bienvenue ! On démarre ton budget."}
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: "var(--dsh-muted)",
                  }}
                >
                  {locale === "ar"
                    ? "3 خطوات ساهلة، دقيقة ولا جوج. من بعد الحسابات كتقاد راسها."
                    : "Trois étapes, environ deux minutes. Ensuite ton tableau de bord se remplit tout seul."}
                </p>
              </div>

              <ol className="dsh-1col" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                <li
                  style={{
                    borderRadius: 20,
                    background: "var(--dsh-soft)",
                    padding: 22,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      background: "#0A7A53",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                    }}
                  >
                    1
                  </span>
                  <b style={{ fontSize: 17 }}>
                    {locale === "ar" ? "صرّح بالدخل" : "Déclare ton revenu"}
                  </b>
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--dsh-muted)",
                    }}
                  >
                    {locale === "ar"
                      ? "الصالير أو المداخيل ديال الشهر."
                      : "Ton salaire ou tes rentrées du mois."}
                  </span>
                  <button
                    onClick={() => openQuickTx("income")}
                    style={{
                      marginTop: "auto",
                      alignSelf: "flex-start",
                      height: 40,
                      padding: "0 14px",
                      border: 0,
                      borderRadius: 10,
                      background: "#0A7A53",
                      color: "#FFFFFF",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {locale === "ar" ? "إضافة دخل" : "Ajouter un revenu"}
                  </button>
                </li>

                <li
                  style={{
                    borderRadius: 20,
                    background: "var(--dsh-soft)",
                    padding: 22,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      background: "var(--dsh-card)",
                      color: "var(--dsh-ink)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                    }}
                  >
                    2
                  </span>
                  <b style={{ fontSize: 17 }}>
                    {locale === "ar"
                      ? "قاد الأظرفة ديالك"
                      : "Crée tes enveloppes"}
                  </b>
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--dsh-muted)",
                    }}
                  >
                    {locale === "ar"
                      ? "الكرا، التقضية، الطرانسبور… عندنا نماذج واجدة."
                      : "Loyer, courses, transport… on te propose une base."}
                  </span>
                  <Link
                    href="/envelopes"
                    style={{
                      marginTop: "auto",
                      alignSelf: "flex-start",
                      height: 40,
                      padding: "0 14px",
                      borderRadius: 10,
                      background: "var(--dsh-card)",
                      color: "var(--dsh-ink)",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      textDecoration: "none",
                    }}
                  >
                    {locale === "ar" ? "الأظرفة" : "Voir les modèles"}
                  </Link>
                </li>

                <li
                  style={{
                    borderRadius: 20,
                    background: "var(--dsh-soft)",
                    padding: 22,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      background: "var(--dsh-card)",
                      color: "var(--dsh-ink)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                    }}
                  >
                    3
                  </span>
                  <b style={{ fontSize: 17 }}>
                    {locale === "ar"
                      ? "وزّع الفلوس"
                      : "Répartis ton argent"}
                  </b>
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--dsh-muted)",
                    }}
                  >
                    {locale === "ar"
                      ? "كل درهم ياخد المهمة ديالو قبل بداية الشهر."
                      : "Chaque dirham reçoit sa mission avant le début du mois."}
                  </span>
                  <Link
                    href="/distribution"
                    style={{
                      marginTop: "auto",
                      alignSelf: "flex-start",
                      height: 40,
                      padding: "0 14px",
                      borderRadius: 10,
                      background: "var(--dsh-card)",
                      color: "var(--dsh-ink)",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      textDecoration: "none",
                    }}
                  >
                    {locale === "ar" ? "توزيع" : "Répartir"}
                  </Link>
                </li>
              </ol>
            </section>
          )}

        {/* Dashboard Principal (Rempli) */}
        {!loading && (data || transactions.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Titre & Période */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                gap: "12px 20px",
              }}
            >
              <div
                style={{
                  flex: "1 1 260px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <h1 className="dsh-h1">
                  {locale === "ar" ? "لوحة القيادة" : "Dashboard"}
                </h1>
                <span style={{ fontSize: 14.5, color: "var(--dsh-muted)" }}>
                  {isGuest
                    ? locale === "ar"
                      ? "جلسة استكشافية · البيانات محفوظة في هذا المتصفح"
                      : "Session découverte · données dans ce navigateur"
                    : locale === "ar"
                    ? `دورة من ${cycleStart} إلى ${cycleEnd} · يوم ${daysElapsed} من ${totalCycleDays}`
                    : `Cycle du ${cycleStart} au ${cycleEnd} · jour ${daysElapsed} sur ${totalCycleDays}`}
                </span>
              </div>

              {/* Sélecteur de période */}
              <div
                role="radiogroup"
                aria-label="Période"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  padding: 4,
                  borderRadius: 12,
                  background: "var(--dsh-card)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  border: "1px solid var(--dsh-line)",
                }}
              >
                {[
                  { id: "7", label: locale === "ar" ? "7 أيام" : "7 jours" },
                  { id: "30", label: locale === "ar" ? "30 يوم" : "30 jours" },
                  { id: "90", label: locale === "ar" ? "90 يوم" : "90 jours" },
                  { id: "ytd", label: locale === "ar" ? "السنة" : "Année" },
                ].map((p) => {
                  const on = period === p.id;
                  return (
                    <button
                      key={p.id}
                      role="radio"
                      aria-checked={on}
                      onClick={() => setPeriod(p.id as any)}
                      style={{
                        height: 34,
                        padding: "0 12px",
                        border: 0,
                        borderRadius: 9,
                        background: on ? "var(--dsh-ink)" : "transparent",
                        color: on ? "var(--dsh-bg)" : "var(--dsh-muted)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ZONE 1 : MAINTENANT */}
            <section
              aria-labelledby="z-now"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <h2
                id="z-now"
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "1.5px",
                  color: "var(--dsh-muted)",
                }}
              >
                {locale === "ar" ? "دابا" : "MAINTENANT"}
              </h2>

              <div className="dsh-snap">
                {/* CARTE HERO : Reste à vivre */}
                <div
                  style={{
                    borderRadius: 28,
                    background: "var(--dsh-hero)",
                    color: "#FFFFFF",
                    padding: 28,
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                    boxShadow: "0 14px 30px -10px rgba(10, 122, 83, 0.45)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#9FD8BE",
                    }}
                  >
                    {locale === "ar"
                      ? "شحال بقى ليك حتى الصالير"
                      : "Reste à vivre jusqu’à ta paie"}
                  </span>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "baseline",
                      gap: "8px 16px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 52,
                        fontWeight: 800,
                        letterSpacing: -2,
                        lineHeight: 1,
                      }}
                    >
                      {formatMoney(flexibleRemaining)}{" "}
                      <span style={{ fontSize: 20, color: "#9FD8BE" }}>
                        MAD
                      </span>
                    </span>

                    <span
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.12)",
                        fontSize: 14.5,
                        fontWeight: 700,
                      }}
                    >
                      {locale === "ar"
                        ? `${formatMoney(dailyAllowance)} درهم فالنهار · ${daysRemaining} أيام`
                        : `${formatMoney(dailyAllowance)} MAD / jour · ${daysRemaining} jours`}
                    </span>
                  </div>

                  {/* Double barre de progression */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div
                      style={{
                        position: "relative",
                        height: 12,
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.15)",
                      }}
                    >
                      <div
                        style={{
                          width: `${pctBudgetConsumed}%`,
                          height: 12,
                          borderRadius: 6,
                          background: "#7FD3AE",
                          transition: "width 0.4s ease",
                        }}
                      />
                      <div
                        title={`Temps écoulé : ${pctCycleElapsed}%`}
                        style={{
                          position: "absolute",
                          top: -5,
                          [isRTL ? "right" : "left"]: `${pctCycleElapsed}%`,
                          width: 3.5,
                          height: 22,
                          borderRadius: 2,
                          background: "#F2B544",
                          boxShadow: "0 0 6px rgba(242, 181, 68, 0.8)",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 6,
                        fontSize: 13,
                        color: "#CFE6DB",
                      }}
                    >
                      <span>
                        <b style={{ color: "#FFFFFF" }}>{pctBudgetConsumed} %</b>{" "}
                        {locale === "ar"
                          ? "من الميزانية تستهلكات"
                          : "du budget consommé"}
                      </span>
                      <span>
                        <span
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            background: "#F2B544",
                            verticalAlign: -1,
                            marginInlineEnd: 4,
                          }}
                        />
                        <b style={{ color: "#FFFFFF" }}>{pctCycleElapsed} %</b>{" "}
                        {locale === "ar"
                          ? "من الوقت داز · راك في أمان"
                          : "du cycle écoulé · tu es en avance"}
                      </span>
                    </div>
                  </div>

                  {/* 4 KPIs clés */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                      gap: 8,
                      paddingTop: 14,
                      borderTop: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 12, color: "#9FD8BE" }}>
                        {locale === "ar" ? "كاش للتوزيع" : "Cash à répartir"}
                      </span>
                      <b style={{ fontSize: 17, display: "block" }}>
                        {formatMoney(data?.available_to_allocate)}
                      </b>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: "#9FD8BE" }}>
                        {locale === "ar" ? "المصاريف" : "Dépenses"}
                      </span>
                      <b style={{ fontSize: 17, display: "block" }}>
                        {formatMoney(expenseTotal)}
                      </b>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: "#9FD8BE" }}>
                        {locale === "ar" ? "المداخيل" : "Revenus"}
                      </span>
                      <b style={{ fontSize: 17, display: "block" }}>
                        {formatMoney(incomeTotal)}
                      </b>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: "#9FD8BE" }}>
                        {locale === "ar" ? "الصافي" : "Net"}
                      </span>
                      <b style={{ fontSize: 17, display: "block" }}>
                        {netTotal >= 0 ? "+" : ""}
                        {formatMoney(netTotal)}
                      </b>
                    </div>
                  </div>

                  {/* Sweep Preview Banner */}
                  <button
                    onClick={() => setSweepOpen(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 14px",
                      border: 0,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.08)",
                      color: "#FFFFFF",
                      fontSize: 13.5,
                      textAlign: "start",
                      cursor: "pointer",
                    }}
                  >
                    <Sparkles size={18} color="#F2B544" />
                    <span style={{ flex: 1 }}>
                      {locale === "ar"
                        ? `+${formatMoney(
                            Math.round(flexibleRemaining * 0.3)
                          )} درهم غتمشي لـ Tawfir مع نهاية الدورة`
                        : `+${formatMoney(
                            Math.round(flexibleRemaining * 0.3)
                          )} MAD partiront vers Tawfir dans ${daysRemaining} jours`}
                    </span>
                    <span style={{ fontWeight: 800, textDecoration: "underline" }}>
                      {locale === "ar" ? "التفاصيل" : "Détails"}
                    </span>
                  </button>
                </div>

                {/* CARTE URGENT À FAIRE */}
                <div
                  style={{
                    borderRadius: 28,
                    background: "var(--dsh-card)",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                    border: "1px solid var(--dsh-line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <b style={{ fontSize: 17 }}>
                      {locale === "ar" ? "خاصك دير" : "Urgent à faire"}
                    </b>
                    <span style={{ fontSize: 13, color: "var(--dsh-muted)" }}>
                      {urgentActions.length > 0
                        ? locale === "ar"
                          ? `${urgentActions.length} للمتابعة`
                          : `${urgentActions.length} à traiter`
                        : ""}
                    </span>
                  </div>

                  {urgentActions.length === 0 ? (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        padding: "36px 0",
                        textAlign: "center",
                      }}
                    >
                      <span
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          background: "var(--dsh-brand-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CheckCircle2 size={26} color="#0A7A53" strokeWidth={2.4} />
                      </span>
                      <b style={{ fontSize: 16 }}>
                        {locale === "ar"
                          ? "كلشي مضبوط ومستقر !"
                          : "Tout est sous contrôle !"}
                      </b>
                      <span style={{ fontSize: 13, color: "var(--dsh-muted)" }}>
                        {locale === "ar"
                          ? "ما كاين حتى تنبيه عاجل دابا."
                          : "Aucune anomalie ni alerte à traiter."}
                      </span>
                    </div>
                  ) : (
                    urgentActions.map((act) => (
                      <div
                        key={act.id}
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: "10px 12px",
                          padding: "12px 14px",
                          borderRadius: 16,
                          background: act.bg,
                        }}
                      >
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            flexShrink: 0,
                            borderRadius: 14,
                            background: act.dot,
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {act.icon === "plus" ? (
                            <Plus size={14} strokeWidth={3} />
                          ) : act.icon === "link" ? (
                            <Layers size={14} strokeWidth={2.6} />
                          ) : (
                            <AlertTriangle size={14} strokeWidth={2.6} />
                          )}
                        </span>
                        <span style={{ flex: "1 1 180px", fontSize: 13.5, lineHeight: 1.4 }}>
                          <b>{act.title}</b>
                          <br />
                          <span style={{ color: "var(--dsh-muted)", fontSize: 12.5 }}>
                            {act.text}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={act.action}
                          style={{
                            height: 36,
                            padding: "0 12px",
                            border: 0,
                            borderRadius: 10,
                            background: "var(--dsh-ink)",
                            color: "var(--dsh-bg)",
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {act.cta}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* ZONE 2 : ENVELOPPES & ACTIVITÉ */}
            <section
              aria-labelledby="z-env"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <h2
                id="z-env"
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "1.5px",
                  color: "var(--dsh-muted)",
                }}
              >
                {locale === "ar" ? "الأظرفة" : "ENVELOPPES"}
              </h2>

              <div className="dsh-1col">
                {/* Colonne Gauche : Liste des Enveloppes */}
                <div
                  style={{
                    borderRadius: 28,
                    background: "var(--dsh-card)",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                    border: "1px solid var(--dsh-line)",
                  }}
                >
                  {/* Onglets Filtres */}
                  <div
                    role="tablist"
                    aria-label="Filtrer les enveloppes"
                    style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                  >
                    {[
                      {
                        id: "all",
                        label: locale === "ar" ? "الكل" : "Toutes",
                        count: envCounts.all,
                        dot: "transparent",
                      },
                      {
                        id: "over",
                        label: locale === "ar" ? "تجاوزات" : "Dépassées",
                        count: envCounts.over,
                        dot: "#C2381A",
                      },
                      {
                        id: "near",
                        label: locale === "ar" ? "قريبة للحد" : "Proches limite",
                        count: envCounts.near,
                        dot: "#B45309",
                      },
                      {
                        id: "ok",
                        label: locale === "ar" ? "مستقرة" : "Saines",
                        count: envCounts.ok,
                        dot: "#0A7A53",
                      },
                    ].map((f) => {
                      const on = envelopeFilter === f.id;
                      return (
                        <button
                          key={f.id}
                          role="tab"
                          aria-selected={on}
                          onClick={() => setEnvelopeFilter(f.id as any)}
                          style={{
                            height: 38,
                            padding: "0 12px",
                            borderRadius: 19,
                            border: on ? "0" : "1.5px solid var(--dsh-line)",
                            background: on ? "var(--dsh-ink)" : "transparent",
                            color: on ? "var(--dsh-bg)" : "var(--dsh-ink)",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 13,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {f.dot !== "transparent" && (
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                background: f.dot,
                              }}
                            />
                          )}
                          {f.label}{" "}
                          <span style={{ opacity: 0.75 }}>{f.count}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Lignes d'enveloppes */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {filteredEnvelopes.map((env) => {
                      const dotColor =
                        env.status === "over"
                          ? "#C2381A"
                          : env.status === "near"
                          ? "#B45309"
                          : "#0A7A53";

                      return (
                        <div
                          key={env.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "8px 0",
                            borderBottom: "1px solid var(--dsh-line)",
                          }}
                        >
                          <span
                            style={{
                              width: 30,
                              height: 30,
                              flexShrink: 0,
                              borderRadius: 15,
                              background: dotColor,
                              color: "#FFFFFF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {env.status === "over" ? (
                              <X size={14} strokeWidth={3} />
                            ) : env.status === "near" ? (
                              <AlertTriangle size={13} strokeWidth={2.8} />
                            ) : (
                              <Check size={14} strokeWidth={3} />
                            )}
                          </span>

                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                                fontSize: 14,
                              }}
                            >
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontWeight: 700,
                                }}
                              >
                                {env.name}
                                {env.isDebt && (
                                  <span
                                    style={{
                                      padding: "1px 6px",
                                      borderRadius: 6,
                                      background: "var(--dsh-soft)",
                                      color: "var(--dsh-muted)",
                                      fontSize: 10.5,
                                      fontWeight: 800,
                                    }}
                                  >
                                    {locale === "ar"
                                      ? "دين أولوي"
                                      : "Dette prioritaire"}
                                  </span>
                                )}
                              </span>
                              <span
                                style={{
                                  color:
                                    env.isOver
                                      ? "#C2381A"
                                      : "var(--dsh-muted)",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {env.isOver
                                  ? `−${formatMoney(Math.abs(env.remaining))} MAD`
                                  : `${locale === "ar" ? "باقي" : "reste"} ${formatMoney(
                                      env.remaining
                                    )} MAD`}
                              </span>
                            </div>

                            <div
                              style={{
                                height: 6,
                                borderRadius: 3,
                                background: "var(--dsh-track)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: 6,
                                  width: `${env.pct}%`,
                                  borderRadius: 3,
                                  background: dotColor,
                                }}
                              />
                            </div>
                          </div>

                          {env.isOver && !coveredEnvelopes[env.name] && (
                            <button
                              onClick={() => {
                                setCoveredEnvelopes((prev) => ({
                                  ...prev,
                                  [env.name]: true,
                                }));
                                toast({
                                  title:
                                    locale === "ar"
                                      ? "تمت تغطية العجز"
                                      : "Enveloppe couverte",
                                });
                              }}
                              style={{
                                height: 32,
                                padding: "0 10px",
                                border: 0,
                                borderRadius: 10,
                                background: "var(--dsh-bad-soft)",
                                color: "var(--dsh-bad-ink)",
                                fontSize: 12.5,
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              {locale === "ar" ? "تغطية" : "Couvrir"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button
                      onClick={() => setShowAllEnvelopes(!showAllEnvelopes)}
                      style={{
                        alignSelf: "flex-start",
                        height: 36,
                        padding: "0 12px",
                        border: 0,
                        borderRadius: 8,
                        background: "var(--dsh-soft)",
                        color: "var(--dsh-ink)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {showAllEnvelopes
                        ? locale === "ar"
                          ? "عرض أقل"
                          : "Voir moins"
                        : locale === "ar"
                        ? "عرض جميع الأظرفة"
                        : "Voir toutes les enveloppes"}
                    </button>
                    <Link
                      href="/envelopes"
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#0A7A53",
                        textDecoration: "none",
                      }}
                    >
                      {locale === "ar" ? "إدارة الأظرفة →" : "Gérer les enveloppes →"}
                    </Link>
                  </div>
                </div>

                {/* Colonne Droite : Dernières Opérations + Nudge */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div
                    style={{
                      borderRadius: 28,
                      background: "var(--dsh-card)",
                      padding: 24,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                      border: "1px solid var(--dsh-line)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <b style={{ fontSize: 17 }}>
                        {locale === "ar" ? "آخر العمليات" : "Dernières opérations"}
                      </b>
                      <Link
                        href="/transactions"
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#0A7A53",
                          textDecoration: "none",
                        }}
                      >
                        {locale === "ar" ? "عرض الكل" : "Tout voir"}
                      </Link>
                    </div>

                    {transactions.slice(0, 5).map((tx) => {
                      const isIncome = tx.type === "income";
                      const initials = (tx.description || "TX")
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <div
                          key={tx.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "9px 0",
                            borderBottom: "1px solid var(--dsh-line)",
                          }}
                        >
                          <span
                            style={{
                              width: 34,
                              height: 34,
                              flexShrink: 0,
                              borderRadius: 10,
                              background: isIncome
                                ? "rgba(67, 56, 202, 0.12)"
                                : "var(--dsh-soft)",
                              color: isIncome ? "#4338CA" : "var(--dsh-ink)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {initials}
                          </span>

                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <b
                              style={{
                                fontSize: 14,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {tx.description}
                            </b>
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--dsh-muted)",
                              }}
                            >
                              {tx.occurred_on}
                            </span>
                          </div>

                          <b
                            style={{
                              fontSize: 14.5,
                              color: isIncome ? "#0A7A53" : "var(--dsh-ink)",
                            }}
                          >
                            {isIncome ? "+" : "−"}
                            {formatMoney(tx.amount)} MAD
                          </b>

                          <button
                            type="button"
                            onClick={() =>
                              openQuickTx(
                                tx.type === "income" ? "income" : "expense"
                              )
                            }
                            aria-label="Modifier"
                            style={{
                              width: 32,
                              height: 32,
                              border: 0,
                              borderRadius: 8,
                              background: "transparent",
                              color: "var(--dsh-muted)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Nudge Invité ou Conseil Ba Omar */}
                  {isGuest && !dismissedNudge ? (
                    <div
                      style={{
                        borderRadius: 24,
                        background: "var(--dsh-brand-soft)",
                        color: "var(--dsh-brand-ink)",
                        padding: 20,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <b style={{ fontSize: 16 }}>
                        {locale === "ar"
                          ? "توزيع أولي رائع !"
                          : "Belle première répartition !"}
                      </b>
                      <span style={{ fontSize: 14, lineHeight: 1.5 }}>
                        {locale === "ar"
                          ? "الأظرفة والعمليات ديالك مخزنة فقط فهاد المتصفح. حساب مجاني كيحميها على جميع أجهزتك."
                          : "Tes enveloppes et tes opérations ne vivent que dans ce navigateur. Un compte gratuit les garde en sécurité sur tous tes appareils."}
                      </span>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link
                          href="/login"
                          style={{
                            height: 40,
                            padding: "0 14px",
                            borderRadius: 10,
                            background: "#0A7A53",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            fontWeight: 800,
                            textDecoration: "none",
                            fontSize: 13.5,
                          }}
                        >
                          {locale === "ar"
                            ? "حفظ ميزانيتي"
                            : "Garder mon budget"}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDismissedNudge(true)}
                          style={{
                            height: 40,
                            padding: "0 12px",
                            border: 0,
                            borderRadius: 10,
                            background: "transparent",
                            color: "inherit",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: 13.5,
                          }}
                        >
                          {locale === "ar" ? "من بعد" : "Plus tard"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        borderRadius: 24,
                        background: "var(--dsh-card)",
                        padding: 18,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        border: "1px solid var(--dsh-line)",
                      }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          background: "#F2B544",
                          color: "#0F1A16",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        ع
                      </span>
                      <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.45 }}>
                        <b style={{ color: "#0A7A53" }}>Ba Omar :</b>{" "}
                        {locale === "ar"
                          ? "التوفير التلقائي غادي يحول الفائض لـ Tawfir نهار 28. راك غادي مزيان !"
                          : "Ton argent flexible est bien cadré. Tu peux déplacer 50 MAD vers Sorties si besoin."}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ZONE 3 : TENDANCES (3 CARTES) */}
            <section
              aria-labelledby="z-trend"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <h2
                id="z-trend"
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "1.5px",
                  color: "var(--dsh-muted)",
                }}
              >
                {locale === "ar" ? "التوجهات" : "TENDANCES"}
              </h2>

              <div className="dsh-1col" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
                {/* CARTE 1 : Donut Argent Flexible */}
                <div
                  style={{
                    borderRadius: 28,
                    background: "var(--dsh-card)",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                    border: "1px solid var(--dsh-line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <b style={{ fontSize: 16 }}>
                      {locale === "ar"
                        ? "فين كيمشي كاشك المرن"
                        : "Où part ton argent flexible"}
                    </b>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12.5,
                        color: "var(--dsh-muted)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={inclFixed}
                        onChange={(e) => setInclFixed(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: "#0A7A53" }}
                      />
                      {locale === "ar"
                        ? "مع التكاليف القارة"
                        : "Inclure les charges fixes"}
                    </label>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 20,
                    }}
                  >
                    <div style={{ position: "relative", width: 180, height: 180 }}>
                      <svg width="180" height="180" viewBox="0 0 200 200">
                        {donutSlices.map((d, i) => (
                          <circle
                            key={d.name}
                            cx="100"
                            cy="100"
                            r="76"
                            fill="none"
                            stroke={d.color}
                            strokeWidth={d.sw}
                            strokeDasharray={d.dash}
                            strokeDashoffset={d.offset}
                            transform="rotate(-90 100 100)"
                            onMouseEnter={() => setHoverDonut(i)}
                            onMouseLeave={() => setHoverDonut(-1)}
                            style={{
                              cursor: "pointer",
                              transition: "stroke-width 0.15s ease",
                            }}
                          />
                        ))}
                      </svg>
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <span style={{ fontSize: 11.5, color: "var(--dsh-muted)" }}>
                          {activeDonut
                            ? activeDonut.name
                            : inclFixed
                            ? "Total"
                            : "Flexible"}
                        </span>
                        <b style={{ fontSize: 20 }}>
                          {formatMoney(
                            activeDonut ? activeDonut.amount : donutTotal
                          )}
                        </b>
                        <span style={{ fontSize: 11.5, color: "var(--dsh-muted)" }}>
                          {activeDonut && donutTotal > 0
                            ? `${Math.round(
                                (activeDonut.amount / donutTotal) * 100
                              )} %`
                            : "MAD"}
                        </span>
                      </div>
                    </div>

                    <ul
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        flex: "1 1 140px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {donutData.map((d, i) => (
                        <li
                          key={d.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 13.5,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 3,
                              background: donutColors[i % donutColors.length],
                            }}
                          />
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {d.name}
                          </span>
                          <b>{formatMoney(d.amount)}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CARTE 2 : Patrimoine Net */}
                <div
                  style={{
                    borderRadius: 28,
                    background: "var(--dsh-card)",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                    border: "1px solid var(--dsh-line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 6,
                    }}
                  >
                    <b style={{ fontSize: 16 }}>
                      {locale === "ar" ? "صافي الثروة" : "Patrimoine net"}
                    </b>
                    <span style={{ fontSize: 13, color: "var(--dsh-muted)" }}>
                      {hoverLineIndex >= 0
                        ? `${trendMonths[hoverLineIndex]} : ${formatMoney(
                            trendVals[hoverLineIndex]
                          )} MAD`
                        : `${formatMoney(trendVals[trendVals.length - 1])} MAD en ${
                            trendMonths[trendMonths.length - 1]
                          }`}
                    </span>
                  </div>

                  <span
                    style={{
                      alignSelf: "flex-start",
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "var(--dsh-brand-soft)",
                      color: "var(--dsh-brand-ink)",
                      fontSize: 12.5,
                      fontWeight: 800,
                    }}
                  >
                    +580 MAD vs sept. · objectif 14 000
                  </span>

                  <svg
                    viewBox="0 0 520 220"
                    width="100%"
                    height="190"
                    onMouseMove={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      const vx = ((e.clientX - r.left) / r.width) * 520;
                      let idx = Math.round(
                        (isRTL ? 460 - vx : vx - 60) / 88
                      );
                      idx = Math.max(0, Math.min(5, idx));
                      setHoverLineIndex(idx);
                    }}
                    onMouseLeave={() => setHoverLineIndex(-1)}
                    style={{ display: "block" }}
                  >
                    <line
                      x1="40"
                      y1="100"
                      x2="510"
                      y2="100"
                      stroke="var(--dsh-line)"
                    />
                    <line
                      x1="40"
                      y1="180"
                      x2="510"
                      y2="180"
                      stroke="var(--dsh-axis)"
                    />
                    <line
                      x1="40"
                      y1="20"
                      x2="510"
                      y2="20"
                      stroke="#C98A1A"
                      strokeWidth="1.5"
                      strokeDasharray="6 5"
                    />
                    <text
                      x={isRTL ? 40 : 510}
                      y="14"
                      fontSize="11"
                      fontWeight="700"
                      fill="var(--dsh-muted)"
                      textAnchor={isRTL ? "start" : "end"}
                    >
                      Objectif 14 000
                    </text>
                    <polyline
                      points={linePointsString}
                      fill="none"
                      stroke="var(--dsh-brand)"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {trendVals.map((_, i) => (
                      <text
                        key={i}
                        x={getLineX(i)}
                        y="204"
                        fontSize="12"
                        fill="var(--dsh-muted)"
                        textAnchor="middle"
                      >
                        {trendMonths[i]}
                      </text>
                    ))}
                    {hoverLineIndex >= 0 && (
                      <>
                        <line
                          x1={getLineX(hoverLineIndex)}
                          y1="20"
                          x2={getLineX(hoverLineIndex)}
                          y2="180"
                          stroke="var(--dsh-muted)"
                          strokeDasharray="3 3"
                        />
                        <circle
                          cx={getLineX(hoverLineIndex)}
                          cy={getLineY(trendVals[hoverLineIndex])}
                          r="5"
                          fill="var(--dsh-brand)"
                          stroke="var(--dsh-card)"
                          strokeWidth="2"
                        />
                      </>
                    )}
                  </svg>
                </div>

                {/* CARTE 3 : Répartition du Cash */}
                <div
                  style={{
                    borderRadius: 28,
                    background: "var(--dsh-card)",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                    border: "1px solid var(--dsh-line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <b style={{ fontSize: 16 }}>
                      {locale === "ar" ? "توزيع الكاش" : "Répartition du cash"}
                    </b>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: isGuest
                          ? "var(--dsh-soft)"
                          : "var(--dsh-brand-soft)",
                        color: isGuest
                          ? "var(--dsh-muted)"
                          : "var(--dsh-brand-ink)",
                        fontSize: 11.5,
                        fontWeight: 800,
                      }}
                    >
                      {isGuest
                        ? locale === "ar"
                          ? "التوفير بعد التسجيل"
                          : "Sweep après inscription"
                        : locale === "ar"
                        ? "التوفير التلقائي مفعّل"
                        : "Sweep auto · activé"}
                    </span>
                  </div>

                  {/* Barre multi-segments */}
                  <div
                    role="img"
                    aria-label="Répartition du cash"
                    style={{ display: "flex", height: 14, gap: 2 }}
                  >
                    {cashSegments.map((cs) => (
                      <div
                        key={cs.name}
                        style={{
                          width: `${cs.pct}%`,
                          background: cs.color,
                          borderRadius: 4,
                        }}
                      />
                    ))}
                  </div>

                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 8,
                    }}
                  >
                    {cashSegments.map((cs) => (
                      <li
                        key={cs.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                        }}
                      >
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: 2,
                            background: cs.color,
                          }}
                        />
                        <span style={{ flex: 1 }}>{cs.name}</span>
                        <b>{cs.pct} %</b>
                      </li>
                    ))}
                  </ul>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                      paddingTop: 14,
                      borderTop: "1px solid var(--dsh-line)",
                    }}
                  >
                    <button
                      onClick={() => router.push("/debts")}
                      style={{
                        padding: 0,
                        border: 0,
                        background: "transparent",
                        color: "var(--dsh-ink)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        textAlign: "start",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--dsh-muted)" }}>
                        {locale === "ar" ? "ديون / شهر" : "Dettes / mois"}
                      </span>
                      <b style={{ fontSize: 18 }}>1 800 MAD</b>
                    </button>

                    <button
                      onClick={() => router.push("/goals")}
                      style={{
                        padding: 0,
                        border: 0,
                        background: "transparent",
                        color: "var(--dsh-ink)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        textAlign: "start",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--dsh-muted)" }}>
                        {locale === "ar"
                          ? "الأهداف المحققة"
                          : "Objectifs atteints"}
                      </span>
                      <b style={{ fontSize: 18 }}>30 %</b>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* 3. MOBILE FLOATING ACTION BUTTONS (FAB) */}
      <div className="sbk-fab">
        <button
          onClick={() => {
            setExpressTxType("income");
            setExpressAmount("12400");
            setExpressTxOpen(true);
          }}
          aria-label="Ajouter un revenu"
          style={{
            width: 52,
            height: 52,
            border: 0,
            borderRadius: 26,
            background: "#4338CA",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 20px rgba(67, 56, 202, 0.4)",
            cursor: "pointer",
          }}
        >
          <TrendingUp size={22} />
        </button>

        <button
          onClick={() => {
            setExpressTxType("expense");
            setExpressAmount("150");
            setExpressTxOpen(true);
          }}
          aria-label="Ajouter une dépense"
          style={{
            width: 60,
            height: 60,
            border: 0,
            borderRadius: 30,
            background: "#C2185B",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 25px rgba(194, 24, 91, 0.45)",
            cursor: "pointer",
          }}
        >
          <Plus size={24} strokeWidth={2.8} />
        </button>
      </div>

      {/* 4. MODALE DE SAISIE EXPRESS */}
      {expressTxOpen && (
        <div className="dsh-ovl" onClick={() => setExpressTxOpen(false)}>
          <div
            className="dsh-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <b style={{ fontSize: 20 }}>
                {expressTxType === "income"
                  ? locale === "ar"
                    ? "دخل جديد"
                    : "Nouveau revenu"
                  : locale === "ar"
                  ? "ديبونس جديدة"
                  : "Nouvelle dépense"}
              </b>
              <button
                type="button"
                onClick={() => setExpressTxOpen(false)}
                style={{
                  width: 36,
                  height: 36,
                  border: 0,
                  borderRadius: 18,
                  background: "var(--dsh-soft)",
                  color: "var(--dsh-ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {locale === "ar" ? "المبلغ (درهم)" : "Montant (MAD)"}
              <input
                type="text"
                inputMode="decimal"
                value={expressAmount}
                onChange={(e) => setExpressAmount(e.target.value)}
                autoFocus
                style={{
                  height: 60,
                  padding: "0 16px",
                  borderRadius: 14,
                  border: "1.5px solid var(--dsh-line)",
                  background: "var(--dsh-card)",
                  color: "var(--dsh-ink)",
                  fontSize: 28,
                  fontWeight: 800,
                  outline: "none",
                }}
              />
            </label>

            {/* Suggestions de montants rapides */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(expressTxType === "income"
                ? ["12 400", "800", "1 500"]
                : ["50", "100", "150", "200"]
              ).map((sg) => (
                <button
                  key={sg}
                  type="button"
                  onClick={() => setExpressAmount(sg.replace(/\s+/g, ""))}
                  style={{
                    height: 36,
                    padding: "0 12px",
                    border: "1.5px solid var(--dsh-line)",
                    borderRadius: 18,
                    background: "transparent",
                    color: "var(--dsh-ink)",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {sg} MAD
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button
                type="button"
                onClick={handleSaveExpressTx}
                style={{
                  flex: 1,
                  height: 52,
                  border: 0,
                  borderRadius: 14,
                  background:
                    expressTxType === "income" ? "#4338CA" : "#C2185B",
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {locale === "ar" ? "تسجيل" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpressTxOpen(false);
                  openQuickTx(expressTxType, { amount: expressAmount });
                }}
                style={{
                  height: 52,
                  padding: "0 14px",
                  borderRadius: 14,
                  border: "1.5px solid var(--dsh-line)",
                  background: "transparent",
                  color: "var(--dsh-ink)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {locale === "ar" ? "تفاصيل أكثر" : "Formulaire complet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODALE SWEEP ÉPARGNE AUTOMATIQUE */}
      {sweepOpen && (
        <div className="dsh-ovl" onClick={() => setSweepOpen(false)}>
          <div
            className="dsh-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <b style={{ fontSize: 20 }}>
                {locale === "ar"
                  ? "التوفير التلقائي (Sweep)"
                  : "Épargne automatique (sweep)"}
              </b>
              <button
                type="button"
                onClick={() => setSweepOpen(false)}
                style={{
                  width: 36,
                  height: 36,
                  border: 0,
                  borderRadius: 18,
                  background: "var(--dsh-soft)",
                  color: "var(--dsh-ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: 14.5,
                lineHeight: 1.6,
                color: "var(--dsh-muted)",
              }}
            >
              {locale === "ar"
                ? `فـ ${daysRemaining} أيام، الفلوس اللي شايطة فـ الأظرفة المرنة كتمشي لـ Tawfir باش تكبر ادخارك.`
                : `Dans ${daysRemaining} jours, l’argent non dépensé des enveloppes flexibles part dans Tawfir.`}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--dsh-soft)",
              }}
            >
              <span>Courses</span>
              <b>+620 MAD</b>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--dsh-soft)",
              }}
            >
              <span>Sorties</span>
              <b>+340 MAD</b>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--dsh-soft)",
              }}
            >
              <span>Loisirs</span>
              <b>+220 MAD</b>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 14,
                borderRadius: 12,
                background: "var(--dsh-brand-soft)",
                color: "var(--dsh-brand-ink)",
                fontWeight: 800,
              }}
            >
              <span>Tawfir</span>
              <span>4 760 → 5 940 MAD</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODALE FONCTION RÉSERVÉE (WALL) */}
      {wallModal && (
        <div className="dsh-ovl" onClick={() => setWallModal(null)}>
          <div
            className="dsh-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "var(--dsh-brand-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={24} color="#0A7A53" />
            </span>

            <b style={{ fontSize: 20 }}>
              {wallModal === "Sauvegarde"
                ? locale === "ar"
                  ? "حافظ على ميزانيتك فأمان"
                  : "Garde ton budget en sécurité"
                : wallModal === "Ba Omar"
                ? locale === "ar"
                  ? "سالات 3 محاولات ديالك مع با عمر"
                  : "Tes 3 essais avec Ba Omar sont utilisés"
                : locale === "ar"
                ? `خاص بالحسابات: ${wallModal}`
                : `« ${wallModal} » est réservé aux comptes`}
            </b>

            <span
              style={{
                fontSize: 14.5,
                lineHeight: 1.55,
                color: "var(--dsh-muted)",
              }}
            >
              {locale === "ar"
                ? "دير حساب مجاني: الأظرفة والعمليات ديالك كتبقى محفوظة، وتستافد من التقارير، الأهداف، والديون بدون حدود."
                : "Crée un compte gratuit : tes enveloppes et tes opérations sont conservées, et tu débloques Rapports, Objectifs, Dettes et Ba Omar en illimité."}
            </span>

            <Link
              href="/login"
              style={{
                height: 50,
                borderRadius: 14,
                background: "#0A7A53",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                textDecoration: "none",
                fontSize: 15,
              }}
            >
              {locale === "ar"
                ? "تسجيل حساب مجاني"
                : "Créer mon compte gratuit"}
            </Link>

            <button
              type="button"
              onClick={() => setWallModal(null)}
              style={{
                height: 44,
                border: 0,
                borderRadius: 12,
                background: "transparent",
                color: "var(--dsh-ink)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {locale === "ar"
                ? "متابعة الاكتشاف"
                : "Continuer la découverte"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
