"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Flame,
  Sparkles,
  Trophy,
  Shield,
  Crown,
  Plus,
  UserRound,
  Calendar,
  CalendarDays,
  Clock,
  Gem,
  Target,
  ShieldCheck,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import type { GamificationSummaryOut, LeaderboardOut, UserOut } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const LEVEL_LABELS = {
  1: "L1",
  2: "L2",
  3: "L3",
  4: "L4",
  5: "L5",
} as const;

const PERIODS = [
  { key: "weekly", label: "Semaine", icon: Calendar },
  { key: "monthly", label: "Mois", icon: CalendarDays },
  { key: "lifetime", label: "Total", icon: Clock },
] as const;

const PERIOD_LABELS: Record<FloussyLocale, Record<(typeof PERIODS)[number]["key"], string>> = {
  fr: { weekly: "Semaine", monthly: "Mois", lifetime: "Total" },
  en: { weekly: "Week", monthly: "Month", lifetime: "Total" },
  ar: { weekly: "أسبوع", monthly: "شهر", lifetime: "الإجمالي" },
};

const GAMI_COPY: Record<
  FloussyLocale,
  {
    saveImpossible: string;
    requiredPseudo: string;
    limitReached: string;
    blocked: string;
    invalidChars: string;
    backDashboard: string;
    activeForAll: string;
    title: string;
    addTransaction: string;
    profile: string;
    pseudo: string;
    level: string;
    max: string;
    weekShort: string;
    monthShort: string;
    streak: string;
    ranking: string;
    achievements: string;
    settings: string;
    streakHint: string;
    days: string;
    record: string;
    freeze: string;
    freezeHint: string;
    available: string;
    useFreeze: string;
    missedDay: string;
    keepFreeze: string;
    leaderboard: string;
    leaderboardDesc: string;
    noLeaderboard: string;
    noLeaderboardDesc: string;
    yourPosition: (rank: number, points: number) => string;
    achievementsSoon: string;
    achievementsSoonDesc: string;
    settingsTitle: string;
    settingsHint: string;
    yourPseudo: string;
    pseudoPlaceholder: string;
    save: string;
    current: (name: string) => string;
  }
> = {
  fr: {
    saveImpossible: "Impossible de sauvegarder.",
    requiredPseudo: "Le pseudo est obligatoire.",
    limitReached: "Limite atteinte: 2 changements par mois.",
    blocked: "Pseudo interdit: suspension automatique 10 jours.",
    invalidChars: "Caractères invalides dans le pseudo.",
    backDashboard: "Retour au dashboard",
    activeForAll: "Gamification active pour tous",
    title: "Classement · Points · Streaks",
    addTransaction: "Ajouter une transaction",
    profile: "Profil",
    pseudo: "Pseudo",
    level: "Niveau",
    max: "Max",
    weekShort: "Sem.",
    monthShort: "Mois",
    streak: "Streak",
    ranking: "Classement",
    achievements: "Succès",
    settings: "Pseudo",
    streakHint: "3/7/14/30",
    days: "jours",
    record: "Record",
    freeze: "Freeze",
    freezeHint: "1 / semaine",
    available: "disponible(s)",
    useFreeze: "Utiliser un freeze",
    missedDay: "Tu as raté un jour. Utilise un freeze pour sauver la streak.",
    keepFreeze: "Garde-les pour protéger ta streak.",
    leaderboard: "Leaderboard",
    leaderboardDesc: "Public · Pseudo requis",
    noLeaderboard: "Aucun classement",
    noLeaderboardDesc: "Choisis un pseudo pour apparaître dans le classement.",
    yourPosition: (rank, points) => `Ta position: #${rank} · ${points} pts`,
    achievementsSoon: "Bientôt disponible avec des badges personnalisés.",
    achievementsSoonDesc: "Les achievements seront activés dans une prochaine version.",
    settingsTitle: "Pseudo de classement",
    settingsHint: "Public · Pseudo propre obligatoire · 2 changements / mois",
    yourPseudo: "Ton pseudo",
    pseudoPlaceholder: "Ex: BudgetMaster",
    save: "Enregistrer",
    current: (name) => `Actuel: ${name}`,
  },
  en: {
    saveImpossible: "Unable to save.",
    requiredPseudo: "Nickname is required.",
    limitReached: "Limit reached: 2 changes per month.",
    blocked: "Blocked nickname: automatic 10-day suspension.",
    invalidChars: "Invalid characters in nickname.",
    backDashboard: "Back to dashboard",
    activeForAll: "Gamification enabled for everyone",
    title: "Ranking · Points · Streaks",
    addTransaction: "Add transaction",
    profile: "Profile",
    pseudo: "Nickname",
    level: "Level",
    max: "Max",
    weekShort: "Week",
    monthShort: "Month",
    streak: "Streak",
    ranking: "Ranking",
    achievements: "Achievements",
    settings: "Nickname",
    streakHint: "3/7/14/30",
    days: "days",
    record: "Record",
    freeze: "Freeze",
    freezeHint: "1 / week",
    available: "available",
    useFreeze: "Use freeze",
    missedDay: "You missed a day. Use a freeze to save the streak.",
    keepFreeze: "Keep them to protect your streak.",
    leaderboard: "Leaderboard",
    leaderboardDesc: "Public · Nickname required",
    noLeaderboard: "No leaderboard yet",
    noLeaderboardDesc: "Choose a nickname to appear on the leaderboard.",
    yourPosition: (rank, points) => `Your position: #${rank} · ${points} pts`,
    achievementsSoon: "Coming soon with custom badges.",
    achievementsSoonDesc: "Achievements will be enabled in a future version.",
    settingsTitle: "Leaderboard nickname",
    settingsHint: "Public · Clean nickname required · 2 changes / month",
    yourPseudo: "Your nickname",
    pseudoPlaceholder: "Ex: BudgetMaster",
    save: "Save",
    current: (name) => `Current: ${name}`,
  },
  ar: {
    saveImpossible: "ما قدرناش نحفظو.",
    requiredPseudo: "الاسم ضروري.",
    limitReached: "وصلتي للحد: جوج تغييرات فالشهر.",
    blocked: "هاد الpseudo ممنوع: كاينة وقفة أوتوماتيكية 10 أيام.",
    invalidChars: "كاينين حروف ما صالحينش فالpseudo.",
    backDashboard: "رجوع للداشبورد",
    activeForAll: "الـ gamification خدامة على الجميع",
    title: "الترتيب · النقاط · الستريك",
    addTransaction: "زيد معاملة",
    profile: "البروفايل",
    pseudo: "الاسم",
    level: "المستوى",
    max: "ماكس",
    weekShort: "أسبوع",
    monthShort: "شهر",
    streak: "ستريك",
    ranking: "الترتيب",
    achievements: "الإنجازات",
    settings: "الاسم",
    streakHint: "3/7/14/30",
    days: "أيام",
    record: "أحسن رقم",
    freeze: "Freeze",
    freezeHint: "1 / أسبوع",
    available: "متوفر",
    useFreeze: "استعمل freeze",
    missedDay: "فوتّي نهار. استعمل freeze باش تبقى الستريك.",
    keepFreeze: "خليهم لوقت الحاجة باش يحميو الستريك.",
    leaderboard: "الترتيب",
    leaderboardDesc: "عمومي · خاص الاسم",
    noLeaderboard: "ما كاين حتى ترتيب",
    noLeaderboardDesc: "اختار اسم باش تبان فالترتيب.",
    yourPosition: (rank, points) => `الترتيب ديالك: #${rank} · ${points} نقطة`,
    achievementsSoon: "غادي يزيدو قريباً مع badges خاصين.",
    achievementsSoonDesc: "الإنجازات غادي تتفعل فنسخة جاية.",
    settingsTitle: "اسم الترتيب",
    settingsHint: "عمومي · خاص اسم نقي · جوج تغييرات فالشهر",
    yourPseudo: "الاسم ديالك",
    pseudoPlaceholder: "مثال: BudgetMaster",
    save: "حفظ",
    current: (name) => `دابا: ${name}`,
  },
};

export default function GamificationPage() {
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "gamification-page-ar-body");
  const copy = GAMI_COPY[locale];
  const [summary, setSummary] = useState<GamificationSummaryOut | null>(null);
  const [me, setMe] = useState<UserOut | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardOut | null>(null);
  const [tab, setTab] = useState<"ranking" | "achievements" | "settings">(
    "ranking"
  );
  const [period, setPeriod] = useState<"weekly" | "monthly" | "lifetime">(
    "weekly"
  );
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [pseudo, setPseudo] = useState("");
  const [pseudoSaving, setPseudoSaving] = useState(false);
  const [pseudoError, setPseudoError] = useState<string | null>(null);

  const loadSummary = async () => {
    const data = await apiFetch<GamificationSummaryOut>("/gamification/summary");
    setSummary(data);
  };

  const loadMe = async () => {
    const data = await apiFetch<UserOut>("/auth/me");
    setMe(data);
    setPseudo(data.leaderboard_name ?? "");
  };

  const loadLeaderboard = async (target: typeof period) => {
    setLeaderboardLoading(true);
    try {
      const data = await apiFetch<LeaderboardOut>(`/leaderboard/${target}`);
      setLeaderboard(data);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([loadSummary(), loadLeaderboard(period), loadMe()])
      .then(() => {
        if (active) setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadLeaderboard(period).catch(() => null);
  }, [period]);

  const handleUseFreeze = async () => {
    setFreezeLoading(true);
    try {
      const updated = await apiFetch<GamificationSummaryOut>("/gamification/freeze", {
        method: "POST",
      });
      setSummary(updated);
    } finally {
      setFreezeLoading(false);
    }
  };

  const handlePseudoSave = async () => {
    if (!pseudo.trim()) {
      setPseudoError(copy.requiredPseudo);
      return;
    }
    setPseudoSaving(true);
    setPseudoError(null);
    try {
      const updated = await apiFetch<UserOut>("/users/me/profile", {
        method: "PATCH",
        body: { leaderboard_name: pseudo.trim() },
      });
      setMe(updated);
      setPseudo(updated.leaderboard_name ?? "");
      await loadSummary();
      await loadLeaderboard(period);
    } catch (err) {
      const raw = err instanceof Error ? err.message : copy.saveImpossible;
      if (raw.includes("PSEUDO_CHANGE_LIMIT")) {
        setPseudoError(copy.limitReached);
      } else if (raw.includes("PSEUDO_BLOCKED_FOR_ABUSE")) {
        setPseudoError(copy.blocked);
      } else if (raw.includes("PSEUDO_CHARS_INVALID")) {
        setPseudoError(copy.invalidChars);
      } else {
        setPseudoError(raw);
      }
    } finally {
      setPseudoSaving(false);
    }
  };

  const levelLabel = summary
    ? LEVEL_LABELS[summary.level as keyof typeof LEVEL_LABELS] ?? `L${summary.level}`
    : "—";
  const progressPercent = useMemo(() => {
    if (!summary) return 0;
    if (summary.next_level_points === 0) return 100;
    return Math.min(
      100,
      Math.round((summary.level_progress / summary.next_level_points) * 100)
    );
  }, [summary]);

  const highlightCard =
    "rounded-2xl border border-[var(--border)] bg-[var(--surface)]/85 p-4 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.08)]";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]" dir={dir}>
      <div className="pointer-events-none absolute -left-24 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,#a7f3d0,transparent_70%)] opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-16 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,#bae6fd,transparent_70%)] opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,#fde68a,transparent_70%)] opacity-70 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-2 text-sm font-medium text-[var(--ink)] shadow-sm backdrop-blur hover:bg-[var(--surface)]"
            title={copy.backDashboard}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{copy.backDashboard}</span>
          </Link>
          <div
            className="flex items-center gap-2 text-xs text-[var(--muted)]"
            title={copy.activeForAll}
          >
            <Sparkles className="h-4 w-4" />
            <span className="sr-only">{copy.activeForAll}</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-[var(--muted)]">
              <Trophy className="h-4 w-4 text-amber-500" />
              <Sparkles className="h-4 w-4 text-cyan-500" />
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)] leading-tight">
              {copy.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/transactions"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">{copy.addTransaction}</span>
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-2 text-sm font-medium text-[var(--ink)] shadow-sm backdrop-blur hover:bg-[var(--surface)]"
              >
                <UserRound className="h-4 w-4" />
                <span className="sr-only">{copy.profile}</span>
              </Link>
              {me?.leaderboard_name ? (
                  <Badge tone="muted">{copy.current(me.leaderboard_name)}</Badge>
              ) : null}
            </div>
          </div>

          <div className={highlightCard}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50">
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                    {copy.level}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold">{levelLabel}</span>
                    <span className="text-sm text-[var(--muted)]">
                      {summary ? summary.points_total : 0} pts
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">
                    {summary?.next_level_points === 0
                      ? copy.max
                      : `${summary?.level_progress ?? 0}/${summary?.next_level_points ?? 0}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-center text-[11px] text-[var(--muted)]">
                <div className="flex flex-col items-center gap-1">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  <span className="font-semibold text-[var(--ink)]">
                    {summary?.points_weekly ?? 0}
                  </span>
                  <span className="uppercase tracking-[0.18em] text-[var(--muted)]">
                    {copy.weekShort}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <CalendarDays className="h-4 w-4 text-cyan-500" />
                  <span className="font-semibold text-[var(--ink)]">
                    {summary?.points_monthly ?? 0}
                  </span>
                  <span className="uppercase tracking-[0.18em] text-[var(--muted)]">
                    {copy.monthShort}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-[var(--ink)]">
                    {summary?.current_streak_days ?? 0}
                  </span>
                  <span className="uppercase tracking-[0.18em] text-[var(--muted)]">
                    {copy.streak}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: "ranking", label: copy.ranking, icon: Trophy },
            { key: "achievements", label: copy.achievements, icon: Crown },
            { key: "settings", label: copy.settings, icon: UserRound },
          ] as const).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === item.key
                  ? "bg-[var(--ink)] text-white"
                  : "border border-[var(--border)] bg-[var(--surface)]/80 text-[var(--muted)] hover:bg-[var(--surface)]"
              }`}
              title={item.label}
            >
              <span className="inline-flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                <span className="sr-only">{item.label}</span>
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={`skeleton-${index}`} className="h-28 rounded-3xl bg-[var(--surface)]/5" />
            ))}
          </div>
        ) : null}

        {tab === "ranking" && summary ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className={highlightCard}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{copy.streak}</p>
                  <p className="text-xs text-[var(--muted)]">{copy.streakHint}</p>
                </div>
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <p className="mt-4 text-3xl font-semibold">
                {summary.current_streak_days} {copy.days}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {copy.record}: {summary.longest_streak_days} {copy.days}
              </p>
            </div>

            <div className={highlightCard}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{copy.freeze}</p>
                  <p className="text-xs text-[var(--muted)]">{copy.freezeHint}</p>
                </div>
                <ShieldCheck className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="mt-4 text-3xl font-semibold">
                {summary.freeze_tokens} {copy.available}
              </p>
              {summary.freeze_pending ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleUseFreeze}
                    isLoading={freezeLoading}
                  >
                    <Shield className="h-4 w-4" />
                    <span className="sr-only">{copy.useFreeze}</span>
                  </Button>
                  <span className="text-xs text-amber-600">
                    {copy.missedDay}
                  </span>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {copy.keepFreeze}
                </p>
              )}
            </div>

            <div className={`lg:col-span-2 ${highlightCard}`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold">{copy.leaderboard}</p>
                    <p className="text-xs text-[var(--muted)]">{copy.leaderboardDesc}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {PERIODS.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setPeriod(item.key)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        period === item.key
                          ? "bg-emerald-500 text-white"
                          : "border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface)]"
                      }`}
                      title={item.label}
                    >
                      <span className="inline-flex items-center gap-2">
                        <item.icon className="h-3.5 w-3.5" />
                        <span className="sr-only">{PERIOD_LABELS[locale][item.key]}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {leaderboardLoading ? (
                  [...Array(6)].map((_, index) => (
                    <div
                      key={`leaderboard-skeleton-${index}`}
                      className="h-12 rounded-2xl bg-[var(--surface)]/5"
                    />
                  ))
                ) : leaderboard && leaderboard.entries.length > 0 ? (
                  leaderboard.entries.map((entry) => (
                    <div
                      key={`${entry.rank}-${entry.display_name}`}
                      className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--muted)]">#{entry.rank}</span>
                        <span className="font-medium">{entry.display_name}</span>
                      </div>
                      <span className="font-semibold text-emerald-600">
                        {entry.points} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title={copy.noLeaderboard}
                    description={copy.noLeaderboardDesc}
                  />
                )}

                {leaderboard?.user_rank ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {copy.yourPosition(
                      leaderboard.user_rank,
                      leaderboard.user_points ?? 0
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "achievements" ? (
          <div className={highlightCard}>
            <div className="flex items-center gap-3">
              <Crown className="h-6 w-6 text-fuchsia-500" />
              <div>
                  <p className="text-sm font-semibold">{copy.achievements}</p>
                  <p className="text-xs text-[var(--muted)]">
                  {copy.achievementsSoon}
                  </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm text-[var(--muted)]">
              {copy.achievementsSoonDesc}
            </div>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className={highlightCard}>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold">{copy.settingsTitle}</p>
                <p className="text-xs text-[var(--muted)]">
                  {copy.settingsHint}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
                  {copy.yourPseudo}
                </label>
                <input
                  value={pseudo}
                  onChange={(event) => setPseudo(event.target.value)}
                  placeholder={copy.pseudoPlaceholder}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]"
                />
                {pseudoError ? (
                  <p className="text-xs text-red-600">{pseudoError}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handlePseudoSave} isLoading={pseudoSaving}>
                  <Sparkles className="h-4 w-4" />
                  <span className="sr-only">{copy.save}</span>
                </Button>
                {me?.leaderboard_name ? (
                  <Badge tone="muted">{copy.current(me.leaderboard_name)}</Badge>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
