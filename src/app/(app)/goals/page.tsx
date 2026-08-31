"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Coins,
  Flag,
  Flame,
  Plus,
  Pencil,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { GoalOut, SettingsResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { IssueAlert } from "@/components/ui/IssueAlert";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/components/ui/Toast";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import {
  getLocaleDirection,
  type FloussyLocale,
} from "@/lib/localePreference";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { getIssueDisplay } from "@/lib/issueMessages";
import { PageTour } from "@/components/tour/GlobalTour";
import { usePageTour } from "@/components/tour/usePageTour";

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const LOCALE_TO_BCP47: Record<FloussyLocale, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-MA",
};

const GOALS_COPY = {
  fr: {
    noDate: "Sans date",
    unknownError: "Erreur inconnue",
    updatedTitle: "Objectif mis à jour",
    updatedDescription: "Les changements sont enregistrés.",
    deletedTitle: "Objectif supprimé",
    deletedDescription: "L'objectif a été retiré.",
    distributedTitle: "Distribution appliquée",
    distributedDescription: "Les objectifs ont été alimentés.",
    backToDashboard: "Retour au dashboard",
    activeGoals: "Objectifs actifs",
    addGoal: "Ajouter un objectif",
    distributeNow: "Distribuer maintenant",
    heroEyebrow: "Objectifs",
    heroTitle: "Planifier et avancer",
    chipProgress: "Progression",
    chipAllocation: "Allocation",
    chipPriority: "Priorités",
    chipSinkingFunds: "Sinking funds",
    overview: "Vue globale",
    goalsCount: (count: number) => `${count} objectifs`,
    loading: "Chargement...",
    myGoals: "Mes objectifs",
    myGoalsDesc: "Suivi et actions rapides",
    noGoalsTitle: "Aucun objectif",
    noGoalsDescription: "Ajoutez un objectif pour commencer.",
    target: "Cible",
    auto: "Auto",
    manual: "Manuel",
    edit: "Modifier",
    editGoalTitle: "Modifier l'objectif",
    editGoalDescription: "Ajuste les détails de ton objectif.",
    name: "Nom",
    targetAmount: "Montant cible",
    targetDate: "Date cible",
    contribution: "Contribution",
    suggestion: (value: string) => `Suggestion : ${value}`,
    autoDistribution: "Auto distribution",
    type: "Type",
    goalType: "Objectif",
    sinkingFundType: "Obligation prévue",
    yes: "Oui",
    no: "Non",
    priority: "Priorité",
    high: "Haute",
    medium: "Moyenne",
    low: "Basse",
    cancel: "Annuler",
    save: "Enregistrer",
    deleting: "Suppression...",
  },
  en: {
    noDate: "No date",
    unknownError: "Unknown error",
    updatedTitle: "Goal updated",
    updatedDescription: "Changes were saved.",
    deletedTitle: "Goal deleted",
    deletedDescription: "The goal was removed.",
    distributedTitle: "Distribution applied",
    distributedDescription: "Goals have been funded.",
    backToDashboard: "Back to dashboard",
    activeGoals: "Active goals",
    addGoal: "Add goal",
    distributeNow: "Distribute now",
    heroEyebrow: "Goals",
    heroTitle: "Plan and move forward",
    chipProgress: "Progress",
    chipAllocation: "Allocation",
    chipPriority: "Priority",
    chipSinkingFunds: "Sinking funds",
    overview: "Overview",
    goalsCount: (count: number) => `${count} goals`,
    loading: "Loading...",
    myGoals: "My goals",
    myGoalsDesc: "Tracking and quick actions",
    noGoalsTitle: "No goals",
    noGoalsDescription: "Add a goal to get started.",
    target: "Target",
    auto: "Auto",
    manual: "Manual",
    edit: "Edit",
    editGoalTitle: "Edit goal",
    editGoalDescription: "Adjust the details of your goal.",
    name: "Name",
    targetAmount: "Target amount",
    targetDate: "Target date",
    contribution: "Contribution",
    suggestion: (value: string) => `Suggested: ${value}`,
    autoDistribution: "Auto distribution",
    type: "Type",
    goalType: "Goal",
    sinkingFundType: "Planned obligation",
    yes: "Yes",
    no: "No",
    priority: "Priority",
    high: "High",
    medium: "Medium",
    low: "Low",
    cancel: "Cancel",
    save: "Save",
    deleting: "Deleting...",
  },
  ar: {
    noDate: "بلا تاريخ",
    unknownError: "وقع مشكل غير معروف",
    updatedTitle: "تبدّل الهدف",
    updatedDescription: "تسجلات التغييرات.",
    deletedTitle: "تحيد الهدف",
    deletedDescription: "الهدف ما بقاش موجود.",
    distributedTitle: "تطبّق التوزيع",
    distributedDescription: "تغذاو الأهداف بهاد الدفعة.",
    backToDashboard: "رجوع للوحة الرئيسية",
    activeGoals: "الأهداف الخدامين",
    addGoal: "زيد هدف",
    distributeNow: "وزّع دابا",
    heroEyebrow: "الأهداف",
    heroTitle: "خطّط وتقدّم",
    chipProgress: "التقدّم",
    chipAllocation: "التخصيص",
    chipPriority: "الأولوية",
    chipSinkingFunds: "الصناديق المتوقعة",
    overview: "النظرة العامة",
    goalsCount: (count: number) => `${count} أهداف`,
    loading: "كيتحمّل...",
    myGoals: "الأهداف ديالي",
    myGoalsDesc: "التتبع والإجراءات السريعة",
    noGoalsTitle: "ما كاين حتى هدف",
    noGoalsDescription: "زيد هدف باش تبدا.",
    target: "الهدف",
    auto: "أوتوماتيك",
    manual: "يدوي",
    edit: "بدّل",
    editGoalTitle: "بدّل الهدف",
    editGoalDescription: "صحّح التفاصيل ديال الهدف ديالك.",
    name: "الاسم",
    targetAmount: "المبلغ المستهدف",
    targetDate: "التاريخ المستهدف",
    contribution: "المساهمة",
    suggestion: (value: string) => `اقتراح: ${value}`,
    autoDistribution: "التوزيع الأوتوماتيكي",
    type: "النوع",
    goalType: "هدف",
    sinkingFundType: "التزام مستقبلي",
    yes: "نعم",
    no: "لا",
    priority: "الأولوية",
    high: "عالية",
    medium: "متوسطة",
    low: "منخفضة",
    cancel: "إلغاء",
    save: "حفظ",
    deleting: "كيتحيد...",
  },
};

const formatMoney = (value: string | number) => {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
};

const formatDate = (
  value: string | null,
  locale: FloussyLocale,
  noDateLabel: string
) => {
  if (!value) return noDateLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(LOCALE_TO_BCP47[locale], { dateStyle: "medium" });
};

const computeSuggestedContribution = (
  targetAmount: number,
  targetDate: string,
  sweepIntervalDays: number
) => {
  const parsed = new Date(targetDate);
  if (Number.isNaN(parsed.getTime()) || sweepIntervalDays <= 0) return targetAmount;
  const now = new Date();
  const diffDays = Math.max(
    1,
    Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
  const periods = Math.max(1, Math.ceil(diffDays / sweepIntervalDays));
  return Number((targetAmount / periods).toFixed(2));
};

export default function GoalsPage() {
  const { toast } = useToast();
  const [locale, setLocale] = useState<FloussyLocale>(
    () => getBrowserLocalePreference() ?? "fr"
  );
  const [goals, setGoals] = useState<GoalOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<GoalOut | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const copy = GOALS_COPY[locale];
  const pageDir = getLocaleDirection(locale);
  const issue = getIssueDisplay(error, locale);

  const overviewRef = useRef<HTMLDivElement | null>(null);
  const goalRef = useRef<HTMLDivElement | null>(null);
  const distributeRef = useRef<HTMLDivElement | null>(null);
  const { tour } = usePageTour("goals", {
    overview: { ref: overviewRef },
    goal: { ref: goalRef },
    distribute: { ref: distributeRef },
  });

  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  const editSuggestedContribution = useMemo(() => {
    if (!settings || !editGoal) return "";
    const target = Number(editGoal.target_amount);
    if (!target || !editGoal.target_date) return "";
    return String(
      computeSuggestedContribution(
        target,
        editGoal.target_date,
        settings.sweep_interval_days
      )
    );
  }, [settings, editGoal]);

  const goalSummary = useMemo(() => {
    const totalTarget = goals.reduce(
      (sum, g) => sum + Number(g.target_amount || 0),
      0
    );
    const totalCurrent = goals.reduce(
      (sum, g) => sum + Number(g.current_balance || 0),
      0
    );
    const progress =
      totalTarget > 0 ? Math.min((totalCurrent / totalTarget) * 100, 100) : 0;
    return {
      totalTarget,
      totalCurrent,
      progress,
      count: goals.length,
    };
  }, [goals]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalData, settingsData] = await Promise.all([
        apiFetch<GoalOut[]>("/goals"),
        apiFetch<SettingsResponse>("/users/me/settings"),
      ]);
      setGoals(goalData);
      setSettings(settingsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdate = async () => {
    if (!editGoal) return;
    setSaving(true);
    try {
      const updated = await apiFetch<GoalOut>(`/goals/${editGoal.id}`, {
        method: "PATCH",
        body: {
          name: editGoal.name,
          goal_type: editGoal.goal_type,
          target_amount: Number(editGoal.target_amount),
          target_date: editGoal.target_date,
          contribution_amount: Number(editGoal.contribution_amount),
          auto_contribute: editGoal.auto_contribute,
          priority: editGoal.priority,
        },
      });
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setEditOpen(false);
      setEditGoal(null);
      toast({
        title: copy.updatedTitle,
        description: copy.updatedDescription,
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goal: GoalOut) => {
    setDeletingId(goal.id);
    try {
      await apiFetch(`/goals/${goal.id}`, { method: "DELETE" });
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
      toast({
        title: copy.deletedTitle,
        description: copy.deletedDescription,
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDistribute = async () => {
    setSaving(true);
    try {
      await apiFetch("/goals/distribute", { method: "POST", body: {} });
      await loadData();
      toast({
        title: copy.distributedTitle,
        description: copy.distributedDescription,
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const glassCard =
    "rounded-3xl border border-[var(--border)] bg-[var(--surface)] dark:border-white/10 dark:bg-[var(--surface)]/10 p-5 backdrop-blur-xl shadow-[var(--shadow-soft)] text-[var(--ink)] dark:text-white";
  const inputDark =
    "border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] placeholder:text-[var(--muted)] dark:border-white/10 dark:bg-[var(--surface)]/10 dark:text-white dark:placeholder:text-white/50 focus-visible:ring-cyan-400 focus-visible:ring-offset-0";
  const selectDark =
    "rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] dark:border-white/10 dark:bg-[var(--surface)]/10 dark:text-white px-3 py-2 text-sm";

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[var(--bg)] px-6 pb-12 pt-8 text-[var(--ink)] dark:text-white"
      dir={pageDir}
    >
      <PageTour tour={tour} />
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,#22d3ee,transparent_70%)] opacity-20 dark:opacity-40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,#a855f7,transparent_70%)] opacity-15 dark:opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,#34d399,transparent_70%)] opacity-15 dark:opacity-25 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--ink)] shadow-sm backdrop-blur hover:bg-[var(--surface-2)] dark:border-white/15 dark:bg-[var(--surface)]/10 dark:text-white/90"
            title={copy.backToDashboard}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{copy.backToDashboard}</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)] dark:text-white/60">
            <Target className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
            <span className="sr-only">{copy.activeGoals}</span>
          </div>
          <div ref={distributeRef} className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)] dark:border-white/15 dark:bg-[var(--surface)]/10 dark:text-white"
            >
              <Link href="/goals/new">
                <Plus className="h-4 w-4" />
                <span className="sr-only">{copy.addGoal}</span>
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={handleDistribute}
              isLoading={saving}
              className="bg-cyan-400 text-slate-900 hover:bg-cyan-300"
            >
              <Sparkles className="h-4 w-4" />
              <span className="sr-only">{copy.distributeNow}</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div ref={overviewRef} className={glassCard}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)]/10">
                <Flag className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  {copy.heroEyebrow}
                </p>
                <p className="text-xl font-semibold">{copy.heroTitle}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[var(--surface)]/5 px-3 py-1">
                <Rocket className="h-3.5 w-3.5 text-cyan-300" /> {copy.chipProgress}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[var(--surface)]/5 px-3 py-1">
                <Coins className="h-3.5 w-3.5 text-emerald-300" /> {copy.chipAllocation}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[var(--surface)]/5 px-3 py-1">
                <Flame className="h-3.5 w-3.5 text-amber-300" /> {copy.chipPriority}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[var(--surface)]/5 px-3 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-300" /> {copy.chipSinkingFunds}
              </span>
            </div>
          </div>

          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface)]/10">
                  <Target className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                    {copy.overview}
                  </p>
                  <p className="text-lg font-semibold">{copy.goalsCount(goalSummary.count)}</p>
                </div>
              </div>
              <div className="text-right text-xs text-white/60">
                <p>{formatMoney(goalSummary.totalCurrent)}</p>
                <p className="text-white/40">/ {formatMoney(goalSummary.totalTarget)}</p>
              </div>
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-[var(--surface)]/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                style={{ width: `${goalSummary.progress}%` }}
              />
            </div>
          </div>
        </div>

        {loading ? <p className="text-sm text-white/60">{copy.loading}</p> : null}
        {issue ? (
          <IssueAlert
            issue={issue}
            tone="error"
            className="border border-rose-500/30 bg-rose-500/10 text-rose-100 [&_button]:border-white/20 [&_button]:bg-[var(--surface)]/10 [&_button]:text-rose-50"
          />
        ) : null}

        <div ref={goalRef} className={glassCard}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface)]/10">
              <Coins className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-semibold">{copy.myGoals}</p>
              <p className="text-xs text-white/60">{copy.myGoalsDesc}</p>
            </div>
          </div>

          {goals.length === 0 ? (
            <EmptyState
              title={copy.noGoalsTitle}
              description={copy.noGoalsDescription}
              className="border-white/10 bg-[var(--surface)]/5 text-white [&_p]:text-white/60"
            />
          ) : (
            <div className="grid gap-3">
              {goals.map((goal) => {
                const target = Number(goal.target_amount);
                const current = Number(goal.current_balance);
                const progress = target
                  ? Math.min((current / target) * 100, 100)
                  : 0;
                return (
                  <div
                    key={goal.id}
                    className="rounded-2xl border border-white/10 bg-[var(--surface)]/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-white/70">{goal.name}</p>
                        <p className="mt-1 text-2xl font-semibold">
                          {formatMoney(goal.current_balance)}
                        </p>
                        <p className="text-xs text-white/50">
                          {copy.target}: {formatMoney(goal.target_amount)} · {" "}
                          {formatDate(goal.target_date, locale, copy.noDate)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[var(--surface)]/5 px-2 py-1 text-white/70">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                          {goal.auto_contribute ? copy.auto : copy.manual}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[var(--surface)]/5 px-2 py-1 text-white/60">
                          <Target className="h-3.5 w-3.5 text-sky-300" />
                          {goal.goal_type === "sinking_fund" ? copy.sinkingFundType : copy.goalType}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[var(--surface)]/5 px-2 py-1 text-white/60">
                          <Flame className="h-3.5 w-3.5 text-amber-300" />
                          P{goal.priority}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-[var(--surface)]/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                      <span>{progress.toFixed(0)}%</span>
                      <span>{formatMoney(goal.contribution_amount)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Dialog
                        open={editOpen && editGoal?.id === goal.id}
                        onOpenChange={(open) => {
                          setEditOpen(open);
                          setEditGoal(open ? goal : null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="border-white/15 bg-[var(--surface)]/10 text-white hover:bg-[var(--surface)]/20"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">{copy.edit}</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] dark:border-white/10 dark:bg-[#0f1424] dark:text-white shadow-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-[var(--ink)] dark:text-white">
                              {copy.editGoalTitle}
                            </DialogTitle>
                            <DialogDescription className="text-[var(--muted)] dark:text-white/60">
                              {copy.editGoalDescription}
                            </DialogDescription>
                          </DialogHeader>
                          {editGoal ? (
                            <div className="mt-4 grid gap-3">
                              <Label className="text-[var(--ink)] dark:text-white/80">
                                {copy.name}
                                <Input
                                  className={inputDark}
                                  value={editGoal.name}
                                  onChange={(event) =>
                                    setEditGoal({
                                      ...editGoal,
                                      name: event.target.value,
                                    })
                                  }
                                />
                              </Label>
                              <Label className="text-white/80">
                                {copy.type}
                                <select
                                  value={editGoal.goal_type}
                                  onChange={(event) =>
                                    setEditGoal({
                                      ...editGoal,
                                      goal_type:
                                        event.target.value === "sinking_fund"
                                          ? "sinking_fund"
                                          : "goal",
                                    })
                                  }
                                  className={selectDark}
                                >
                                  <option value="goal">{copy.goalType}</option>
                                  <option value="sinking_fund">{copy.sinkingFundType}</option>
                                </select>
                              </Label>
                              <Label className="text-white/80">
                                {copy.targetAmount}
                                <Input
                                  className={inputDark}
                                  value={editGoal.target_amount}
                                  onChange={(event) =>
                                    setEditGoal({
                                      ...editGoal,
                                      target_amount: event.target.value,
                                    })
                                  }
                                />
                              </Label>
                              <Label className="text-white/80">
                                {copy.targetDate}
                                <Input
                                  className={inputDark}
                                  type="date"
                                  value={editGoal.target_date ?? ""}
                                  onChange={(event) =>
                                    setEditGoal({
                                      ...editGoal,
                                      target_date: event.target.value || null,
                                    })
                                  }
                                />
                              </Label>
                              <Label className="text-white/80">
                                {copy.contribution}
                                <Input
                                  className={inputDark}
                                  value={editGoal.contribution_amount}
                                  onChange={(event) =>
                                    setEditGoal({
                                      ...editGoal,
                                      contribution_amount: event.target.value,
                                    })
                                  }
                                  placeholder={editSuggestedContribution || copy.auto}
                                />
                                {editSuggestedContribution ? (
                                  <span className="text-xs text-white/50">
                                    {copy.suggestion(editSuggestedContribution)}
                                  </span>
                                ) : null}
                              </Label>
                              <Label className="text-white/80">
                                {copy.autoDistribution}
                                <select
                                  value={editGoal.auto_contribute ? "yes" : "no"}
                                  onChange={(event) =>
                                    setEditGoal({
                                      ...editGoal,
                                      auto_contribute: event.target.value === "yes",
                                    })
                                  }
                                  className={selectDark}
                                >
                                  <option value="yes">{copy.yes}</option>
                                  <option value="no">{copy.no}</option>
                                </select>
                              </Label>
                              <Label className="text-white/80">
                                {copy.priority}
                                <select
                                  value={String(editGoal.priority)}
                                  onChange={(event) =>
                                    setEditGoal({
                                      ...editGoal,
                                      priority: Number(event.target.value),
                                    })
                                  }
                                  className={selectDark}
                                >
                                  <option value="1">{copy.high}</option>
                                  <option value="2">{copy.medium}</option>
                                  <option value="3">{copy.low}</option>
                                </select>
                              </Label>
                            </div>
                          ) : null}
                          <DialogFooter className="mt-6">
                            <DialogClose asChild>
                              <Button
                                variant="secondary"
                                className="border-white/15 bg-[var(--surface)]/10 text-white hover:bg-[var(--surface)]/20"
                              >
                                {copy.cancel}
                              </Button>
                            </DialogClose>
                            <Button
                              onClick={handleUpdate}
                              isLoading={saving}
                              className="bg-cyan-400 text-slate-900 hover:bg-cyan-300"
                            >
                              {copy.save}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(goal)}
                        disabled={deletingId === goal.id}
                      >
                        {deletingId === goal.id ? (
                          copy.deleting
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
