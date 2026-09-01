"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Rocket, Sparkles, Target } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { GoalOut, SettingsResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { IssueAlert } from "@/components/ui/IssueAlert";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { getIssueDisplay } from "@/lib/issueMessages";

const COPY = {
  fr: {
    unknownError: "Erreur inconnue",
    nameRequired: "Le nom est requis.",
    amountRequired: "Le montant cible est requis.",
    addedTitle: "Objectif ajouté",
    addedDescription: "Votre objectif est prêt.",
    back: "Retour aux objectifs",
    newGoal: "Nouvel objectif",
    saveGoal: "Enregistrer l'objectif",
    title: "Créer un objectif",
    subtitle: "Planifie une cible claire",
    loading: "Chargement...",
    name: "Nom",
    amount: "Montant",
    type: "Type",
    goalType: "Objectif",
    sinkingFundType: "Obligation prévue",
    date: "Date",
    contribution: "Contribution",
    suggestion: "Suggestion",
    auto: "Auto",
    priority: "Priorité",
    yes: "Oui",
    no: "Non",
    high: "Haute",
    medium: "Moyenne",
    low: "Basse",
    add: "Ajouter",
    placeholderName: "Voyage, Maison...",
    autoPlaceholder: "Auto",
  },
  en: {
    unknownError: "Unknown error",
    nameRequired: "Name is required.",
    amountRequired: "Target amount is required.",
    addedTitle: "Goal added",
    addedDescription: "Your goal is ready.",
    back: "Back to goals",
    newGoal: "New goal",
    saveGoal: "Save goal",
    title: "Create a goal",
    subtitle: "Plan a clear target",
    loading: "Loading...",
    name: "Name",
    amount: "Amount",
    type: "Type",
    goalType: "Goal",
    sinkingFundType: "Planned obligation",
    date: "Date",
    contribution: "Contribution",
    suggestion: "Suggestion",
    auto: "Auto",
    priority: "Priority",
    yes: "Yes",
    no: "No",
    high: "High",
    medium: "Medium",
    low: "Low",
    add: "Add",
    placeholderName: "Trip, House...",
    autoPlaceholder: "Auto",
  },
  ar: {
    unknownError: "وقع مشكل غير معروف",
    nameRequired: "اسم الهدف ضروري.",
    amountRequired: "المبلغ المستهدف ضروري.",
    addedTitle: "تزاد الهدف",
    addedDescription: "الهدف ديالك واجد.",
    back: "رجوع للأهداف",
    newGoal: "هدف جديد",
    saveGoal: "حفظ الهدف",
    title: "زيد هدف",
    subtitle: "حدد ليه وجهة واضحة",
    loading: "جاري التحميل...",
    name: "الاسم",
    amount: "المبلغ",
    type: "النوع",
    goalType: "هدف",
    sinkingFundType: "التزام مستقبلي",
    date: "التاريخ",
    contribution: "المساهمة",
    suggestion: "الاقتراح",
    auto: "تلقائي",
    priority: "الأولوية",
    yes: "نعم",
    no: "لا",
    high: "عالية",
    medium: "متوسطة",
    low: "منخفضة",
    add: "زيد",
    placeholderName: "سفر، دار...",
    autoPlaceholder: "تلقائي",
  },
} as const;

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

export default function NewGoalPage() {
  const router = useRouter();
  const { locale, dir } = useAppLocale();
  const copy = COPY[locale];
  useForceArabicDocumentFont(locale === "ar", "goals-new-page-ar-body");
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const issue = getIssueDisplay(error, locale);

  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState<"goal" | "sinking_fund">("goal");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [autoContribute, setAutoContribute] = useState(true);
  const [priority, setPriority] = useState(2);

  const suggestedContribution = useMemo(() => {
    if (!settings) return "";
    const target = Number(targetAmount);
    if (!target || !targetDate) return "";
    return String(
      computeSuggestedContribution(target, targetDate, settings.sweep_interval_days)
    );
  }, [settings, targetAmount, targetDate]);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const settingsData = await apiFetch<SettingsResponse>("/users/me/settings");
        setSettings(settingsData);
      } catch (err) {
        const message = err instanceof Error ? err.message : copy.unknownError;
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [copy.unknownError]);

  const resetForm = () => {
    setName("");
    setGoalType("goal");
    setTargetAmount("");
    setTargetDate("");
    setContributionAmount("");
    setAutoContribute(true);
    setPriority(2);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("GOAL_NAME_REQUIRED");
      return;
    }
    if (!targetAmount) {
      setError(copy.amountRequired);
      return;
    }

    const payload = {
      name: name.trim(),
      goal_type: goalType,
      target_amount: Number(targetAmount),
      target_date: targetDate || null,
      contribution_amount: contributionAmount
        ? Number(contributionAmount)
        : undefined,
      auto_contribute: autoContribute,
      priority,
    };

    setSaving(true);
    try {
      await apiFetch<GoalOut>("/goals", {
        method: "POST",
        body: payload,
      });
      resetForm();
      toast({
        title: copy.addedTitle,
        description: copy.addedDescription,
        variant: "success",
      });
      router.push("/goals");
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const glassCard =
    "rounded-3xl border border-[var(--border)] bg-[var(--surface)] dark:border-[var(--border)] dark:bg-[var(--surface)]/10 p-6 backdrop-blur-xl shadow-[var(--shadow-soft)] text-[var(--ink)] dark:text-white";
  const inputDark =
    "border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] placeholder:text-[var(--muted)] dark:border-[var(--border)] dark:bg-[var(--surface)]/10 dark:text-white dark:placeholder:text-[var(--muted)] focus-visible:ring-cyan-400 focus-visible:ring-offset-0";
  const selectDark =
    "rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink)] dark:border-[var(--border)] dark:bg-[var(--surface)]/10 dark:text-white px-3 py-2 text-sm";

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[var(--bg)] px-6 pb-12 pt-8 text-[var(--ink)] dark:text-white"
      dir={dir}
    >
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,#22d3ee,transparent_70%)] opacity-20 dark:opacity-40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,#a855f7,transparent_70%)] opacity-15 dark:opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,#34d399,transparent_70%)] opacity-15 dark:opacity-25 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/goals"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--ink)] shadow-sm backdrop-blur hover:bg-[var(--surface-2)] dark:border-[var(--border)] dark:bg-[var(--surface)]/10 dark:text-[var(--ink)]"
            title={copy.back}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{copy.back}</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)] dark:text-[var(--muted)]">
            <Target className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
            <span className="sr-only">{copy.newGoal}</span>
          </div>
          <Button
            size="sm"
            type="submit"
            form="goal-create"
            isLoading={saving}
            className="bg-cyan-400 text-slate-900 hover:bg-cyan-300"
          >
            <Sparkles className="h-4 w-4" />
            <span className="sr-only">{copy.saveGoal}</span>
          </Button>
        </div>

        <div className={glassCard}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface)]/10">
              <Rocket className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-sm font-semibold">{copy.title}</p>
              <p className="text-xs text-[var(--muted)]">{copy.subtitle}</p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-[var(--muted)]">{copy.loading}</p>
          ) : null}
          {issue ? (
            <IssueAlert
              issue={issue}
              tone="error"
              className="mb-4 border border-rose-500/30 bg-rose-500/10 text-rose-100 [&_button]:border-[var(--border)] [&_button]:bg-[var(--surface)]/10 [&_button]:text-rose-50"
            />
          ) : null}

          <form id="goal-create" onSubmit={handleCreate} className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.name}
              </span>
              <Input
                className={inputDark}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={copy.placeholderName}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.type}
              </span>
              <select
                value={goalType}
                onChange={(event) =>
                  setGoalType(event.target.value === "sinking_fund" ? "sinking_fund" : "goal")
                }
                className={selectDark}
              >
                <option value="goal">{copy.goalType}</option>
                <option value="sinking_fund">{copy.sinkingFundType}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.amount}
              </span>
              <Input
                className={inputDark}
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.date}
              </span>
              <Input
                className={inputDark}
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {copy.contribution}
              </span>
              <Input
                className={inputDark}
                value={contributionAmount}
                onChange={(event) => setContributionAmount(event.target.value)}
                placeholder={suggestedContribution || copy.autoPlaceholder}
              />
              {suggestedContribution ? (
                <span className="text-xs text-[var(--muted)]">
                  {copy.suggestion}: {suggestedContribution}
                </span>
              ) : null}
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {copy.auto}
                </span>
                <select
                  value={autoContribute ? "yes" : "no"}
                  onChange={(event) => setAutoContribute(event.target.value === "yes")}
                  className={selectDark}
                >
                  <option value="yes">{copy.yes}</option>
                  <option value="no">{copy.no}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {copy.priority}
                </span>
                <select
                  value={String(priority)}
                  onChange={(event) => setPriority(Number(event.target.value))}
                  className={selectDark}
                >
                  <option value="1">{copy.high}</option>
                  <option value="2">{copy.medium}</option>
                  <option value="3">{copy.low}</option>
                </select>
              </label>
            </div>
            <Button
              type="submit"
              isLoading={saving}
              className="mt-2 bg-emerald-400 text-slate-900 hover:bg-emerald-300"
            >
              <Rocket className="h-4 w-4" />
              <span className="sr-only">{copy.add}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
