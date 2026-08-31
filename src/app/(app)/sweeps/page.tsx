"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import type { IncomeReminderOut } from "@/lib/types";
import { useQuickTx } from "@/state/QuickTxContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Info } from "lucide-react";

const SWEEPS_COPY: Record<
  FloussyLocale,
  {
    unknownError: string;
    title: string;
    subtitle: string;
    infoTitle: string;
    infoDescription: string;
    infoIntro: string;
    infoList1: string;
    infoList2: string;
    infoList3: string;
    close: string;
    executedTitle: string;
    executedDescription: string;
    date: string;
    periods: string;
    transfers: string;
    effects: string;
    noTransfer: string;
    loading: string;
    reminders: string;
    reminderHint: string;
    name: string;
    namePlaceholder: string;
    lastIncome: string;
    frequency: string;
    usualDay: string;
    nextIncome: string;
    timezone: string;
    add: string;
    nextReminder: string;
    nextReminderHint: string;
    noReminder: string;
    noReminderDesc: string;
    due: string;
    upcoming: string;
    inactive: string;
    next: string;
    last: string;
    declared: string;
    delete: string;
    added: string;
    declaredSuccess: string;
    deleted: string;
    deleteConfirm: string;
  }
> = {
  fr: {
    unknownError: "Erreur inconnue",
    title: "Sweeps",
    subtitle: "Rappels de revenus",
    infoTitle: "Rappels & Sweeps",
    infoDescription: "Comprendre comment les rappels et sweeps fonctionnent.",
    infoIntro:
      "Un rappel de revenu sert à ne pas oublier de déclarer un salaire. Le sweep s'exécute uniquement quand le revenu est déclaré et que la date du rappel est échue.",
    infoList1: "Les sweeps clôturent la période et déplacent les soldes positifs des enveloppes concernées.",
    infoList2:
      "Les enveloppes avec rollover OFF sont remises à zéro et leur solde est transféré vers l'enveloppe d'épargne par défaut (Savings).",
    infoList3: "Les enveloppes avec rollover ON gardent leur solde pour la période suivante.",
    close: "Fermer",
    executedTitle: "Sweep exécuté",
    executedDescription: "Sweep lancé après déclaration du revenu.",
    date: "Date",
    periods: "Périodes",
    transfers: "Transferts",
    effects: "Effets du sweep",
    noTransfer: "Aucun transfert.",
    loading: "Chargement...",
    reminders: "Rappels de revenus",
    reminderHint: "Le rappel déclenche un sweep automatique à sa date.",
    name: "Nom",
    namePlaceholder: "Salaire",
    lastIncome: "Dernier salaire",
    frequency: "Fréquence",
    usualDay: "Jour habituel",
    nextIncome: "Date du prochain salaire",
    timezone: "Timezone",
    add: "Ajouter",
    nextReminder: "Prochain rappel",
    nextReminderHint: "Renseigne une date pour voir la prochaine échéance.",
    noReminder: "Aucun rappel",
    noReminderDesc: "Ajoute un rappel pour déclarer un revenu récurrent.",
    due: "À déclarer",
    upcoming: "À venir",
    inactive: "Inactif",
    next: "Prochain",
    last: "Dernier",
    declared: "Déclaré",
    delete: "Supprimer",
    added: "Rappel ajouté.",
    declaredSuccess: "Rappel marqué comme déclaré.",
    deleted: "Rappel supprimé.",
    deleteConfirm: "Supprimer ce rappel ?",
  },
  en: {
    unknownError: "Unknown error",
    title: "Sweeps",
    subtitle: "Income reminders",
    infoTitle: "Reminders & sweeps",
    infoDescription: "Understand how reminders and sweeps work.",
    infoIntro:
      "An income reminder helps you avoid forgetting to declare a salary. A sweep runs only when the income is declared and the reminder date is due.",
    infoList1: "Sweeps close the period and move positive balances from the selected envelopes.",
    infoList2:
      "Envelopes with rollover OFF are reset and their balance is transferred to the default savings envelope.",
    infoList3: "Envelopes with rollover ON keep their balance for the next income cycle.",
    close: "Close",
    executedTitle: "Sweep executed",
    executedDescription: "Sweep launched after the income declaration.",
    date: "Date",
    periods: "Periods",
    transfers: "Transfers",
    effects: "Sweep effects",
    noTransfer: "No transfer.",
    loading: "Loading...",
    reminders: "Income reminders",
    reminderHint: "The reminder can trigger an automatic sweep on its due date.",
    name: "Name",
    namePlaceholder: "Salary",
    lastIncome: "Last salary",
    frequency: "Frequency",
    usualDay: "Usual day",
    nextIncome: "Next salary date",
    timezone: "Timezone",
    add: "Add",
    nextReminder: "Next reminder",
    nextReminderHint: "Enter a date to preview the next due date.",
    noReminder: "No reminder",
    noReminderDesc: "Add a reminder to declare recurring income.",
    due: "Due now",
    upcoming: "Upcoming",
    inactive: "Inactive",
    next: "Next",
    last: "Last",
    declared: "Declared",
    delete: "Delete",
    added: "Reminder added.",
    declaredSuccess: "Reminder marked as declared.",
    deleted: "Reminder deleted.",
    deleteConfirm: "Delete this reminder?",
  },
  ar: {
    unknownError: "وقع مشكل غير واضح",
    title: "السوِيبات",
    subtitle: "تذكير الدخل",
    infoTitle: "التذكير والـ sweeps",
    infoDescription: "فهم كيفاش كايخدمو التذكير و sweeps.",
    infoIntro:
      "تذكير الدخل كيساعدك ما تنساش تصرّح بالسالاير. الـ sweep كيتنفذ غير منين كتصرّح بالدخل وكيكون التاريخ ديال التذكير وصل.",
    infoList1: "السوِيبات كيساليو الفترة وكينقلو الأرصدة الإيجابية ديال الأظرفة المعنية.",
    infoList2:
      "الأظرفة اللي فيهم rollover OFF كيرجعو للصفر، والباقي كيمشي لظرف الادخار الافتراضي.",
    infoList3: "الأظرفة اللي فيهم rollover ON كيبقاو حافظين الرصيد للفترة الجاية.",
    close: "سد",
    executedTitle: "تدار الـ sweep",
    executedDescription: "تخدم الـ sweep من بعد ما تصرّح بالدخل.",
    date: "التاريخ",
    periods: "الفترات",
    transfers: "التحويلات",
    effects: "الأثر ديال sweep",
    noTransfer: "ما كاين حتى تحويل.",
    loading: "كيتحمّل...",
    reminders: "تذكير الدخل",
    reminderHint: "التذكير يقدر يطلق sweep أوتوماتيكياً فنهار الاستحقاق.",
    name: "الاسم",
    namePlaceholder: "السالاير",
    lastIncome: "آخر سالاير",
    frequency: "التردد",
    usualDay: "النهار المعتاد",
    nextIncome: "تاريخ السالاير الجاي",
    timezone: "التوقيت",
    add: "زيد",
    nextReminder: "التذكير الجاي",
    nextReminderHint: "دخل تاريخ باش يبان لك الموعد الجاي.",
    noReminder: "ما كاين حتى تذكير",
    noReminderDesc: "زيد تذكير باش تصرّح بالدخل المتكرر.",
    due: "خاصو تصريح",
    upcoming: "جاي من بعد",
    inactive: "ما خدامش",
    next: "الجاي",
    last: "الآخر",
    declared: "تصرّح به",
    delete: "حيد",
    added: "تزاد التذكير.",
    declaredSuccess: "تعلّم التذكير على أنه تصرّح.",
    deleted: "تم حذف التذكير.",
    deleteConfirm: "بغيتي تحيد هاد التذكير؟",
  },
};

const formatFrequency = (
  value: IncomeReminderOut["frequency"],
  locale: FloussyLocale
) => {
  switch (value) {
    case "monthly":
      return locale === "ar" ? "شهري" : locale === "en" ? "Monthly" : "Mensuel";
    case "bi_weekly":
      return locale === "ar"
        ? "كل 15 يوم"
        : locale === "en"
        ? "Every 2 weeks"
        : "Tous les 15 jours";
    case "weekly":
      return locale === "ar" ? "كل أسبوع" : locale === "en" ? "Weekly" : "Hebdo";
    case "one_off":
      return locale === "ar" ? "مرة وحدة" : locale === "en" ? "One-off" : "Date fixe";
    case "bi_monthly":
      return locale === "ar"
        ? "مرتين فالشهر"
        : locale === "en"
        ? "Twice a month"
        : "Bi-mensuel";
    default:
      return value;
  }
};

export default function SweepsPage() {
  const { locale, dir } = useAppLocale();
  const searchParams = useSearchParams();
  useForceArabicDocumentFont(locale === "ar", "sweeps-page-ar-body");
  const copy = SWEEPS_COPY[locale];
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<IncomeReminderOut[]>([]);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const { openQuickTx } = useQuickTx();
  const [reminderForm, setReminderForm] = useState({
    name: "",
    frequency: "monthly",
    last_declared_on: "",
    day_of_month: "",
    due_date: "",
    timezone: "UTC",
  });
  const issueParam = searchParams.get("issue");
  const notificationIssueGuidance =
    issueParam === "sweep-due"
      ? {
          title:
            locale === "ar"
              ? "تنبيه: كاين Sweep خاص يتنفّذ"
              : locale === "en"
              ? "Action required: sweep is due"
              : "Action requise: sweep en attente",
          description:
            locale === "ar"
              ? "صرّح بالدخل المستحق أو نفّذ الـ sweep باش تسالي الفترة الحالية."
              : locale === "en"
              ? "Declare the due income or run sweep to close the current period."
              : "Déclare le revenu attendu ou lance le sweep pour clôturer la période en cours.",
        }
      : null;
  const parseDate = (value: string) =>
    value ? new Date(`${value}T00:00:00`) : null;

  const formatDate = (value: Date) => value.toISOString().slice(0, 10);

  const nextMonthlyDate = (base: Date, dayOfMonth: number) => {
    const day = Math.max(1, Math.min(dayOfMonth, 31));
    const year = base.getFullYear();
    const month = base.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const candidate = new Date(year, month, Math.min(day, lastDay));
    if (candidate >= base) return candidate;
    const nextMonth = new Date(year, month + 1, 1);
    const nextLast = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth() + 1,
      0
    ).getDate();
    return new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      Math.min(day, nextLast)
    );
  };

  const previewUpcomingDates = () => {
    const lastDeclared = parseDate(reminderForm.last_declared_on);
    const dates: string[] = [];
    if (reminderForm.frequency === "one_off") {
      if (reminderForm.due_date) dates.push(reminderForm.due_date);
      return dates;
    }
    if (!lastDeclared) return dates;
    if (reminderForm.frequency === "weekly") {
      for (let i = 1; i <= 3; i += 1) {
        const next = new Date(lastDeclared);
        next.setDate(next.getDate() + 7 * i);
        dates.push(formatDate(next));
      }
      return dates;
    }
    if (reminderForm.frequency === "bi_weekly") {
      const next = new Date(lastDeclared);
      next.setDate(next.getDate() + 15);
      const following = new Date(lastDeclared);
      following.setDate(following.getDate() + 30);
      dates.push(formatDate(next), formatDate(following));
      return dates;
    }
    if (reminderForm.frequency === "monthly") {
      const dayOfMonth = reminderForm.day_of_month
        ? Number(reminderForm.day_of_month)
        : lastDeclared.getDate();
      const base = new Date(lastDeclared);
      base.setDate(base.getDate() + 1);
      dates.push(formatDate(nextMonthlyDate(base, dayOfMonth)));
      return dates;
    }
    return dates;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const incomeReminders = await apiFetch<IncomeReminderOut[]>(
        "/income-reminders"
      );
      setReminders(incomeReminders);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [copy.unknownError]);

  // The quick income dialog (opened from "Déclaré") marks the reminder on
  // submit; refresh the list when it does.
  useEffect(() => {
    const refresh = () => {
      void loadData();
    };
    window.addEventListener("floussy:data-updated", refresh);
    return () => window.removeEventListener("floussy:data-updated", refresh);
    // loadData is a stable closure; the listener only needs to be attached once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReminderChange = (
    field: keyof typeof reminderForm,
    value: string
  ) => {
    setReminderForm((prev) => {
      const next = { ...prev, [field]: value };
      if (
        field === "last_declared_on" &&
        prev.frequency === "monthly" &&
        !prev.day_of_month
      ) {
        const last = parseDate(value);
        if (last) {
          next.day_of_month = String(last.getDate());
        }
      }
      if (field === "frequency" && value !== "monthly") {
        next.day_of_month = "";
      }
      return next;
    });
  };

  const handleCreateReminder = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setReminderSaving(true);
    try {
      const lastDeclared = reminderForm.last_declared_on
        ? parseDate(reminderForm.last_declared_on)
        : null;
      const dayOfMonth =
        reminderForm.frequency === "monthly"
          ? reminderForm.day_of_month
            ? Number(reminderForm.day_of_month)
            : lastDeclared
              ? lastDeclared.getDate()
              : null
          : null;
      const dayOfWeek =
        reminderForm.frequency === "weekly" && lastDeclared
          ? (lastDeclared.getDay() + 6) % 7
          : null;
      const payload = {
        name: reminderForm.name.trim(),
        frequency: reminderForm.frequency,
        last_declared_on: reminderForm.last_declared_on || null,
        day_of_month: dayOfMonth,
        day_of_week: dayOfWeek,
        due_date:
          reminderForm.frequency === "one_off"
            ? reminderForm.due_date || null
            : null,
        timezone: reminderForm.timezone || "UTC",
        is_active: true,
      };
      await apiFetch<IncomeReminderOut>("/income-reminders", {
        method: "POST",
        body: payload,
      });
      setSuccess(copy.added);
      setReminderForm({
        name: "",
        frequency: "monthly",
        last_declared_on: "",
        day_of_month: "",
        due_date: "",
        timezone: "UTC",
      });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setReminderSaving(false);
    }
  };

  // "Marking a reminder declared" must actually record the income, not just
  // flip a flag: the real income entry is what runs distribution and lets the
  // auto-sweep close the period. Open the same quick income dialog the
  // dashboard uses, passing this reminder so it is marked on submit.
  const handleMarkDeclared = (reminder: IncomeReminderOut) => {
    setError(null);
    setSuccess(null);
    openQuickTx("income", { reminderIdsToMark: [reminder.id] });
  };

  const handleDeleteReminder = async (reminderId: string) => {
    const confirmed = window.confirm(copy.deleteConfirm);
    if (!confirmed) return;
    setError(null);
    setSuccess(null);
    setReminderSaving(true);
    try {
      await apiFetch<void>(`/income-reminders/${reminderId}`, {
        method: "DELETE",
      });
      setSuccess(copy.deleted);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setReminderSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8" dir={dir}>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{copy.infoTitle}</DialogTitle>
            <DialogDescription>{copy.infoDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-[var(--ink)]">
            <p>{copy.infoIntro}</p>
            <ul className="list-disc space-y-2 pl-4 text-sm text-[var(--muted)]">
              <li>{copy.infoList1}</li>
              <li>{copy.infoList2}</li>
              <li>{copy.infoList3}</li>
            </ul>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => setInfoOpen(false)}>
              {copy.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {loading ? <p className="text-sm text-[var(--muted)]">{copy.loading}</p> : null}
      {notificationIssueGuidance ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            {notificationIssueGuidance.title}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {notificationIssueGuidance.description}
          </p>
        </div>
      ) : null}
      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <Section
        title={copy.reminders}
        actions={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setInfoOpen(true)}
          >
            <Info className="h-4 w-4" />
          </Button>
        }
      >
        <p className="text-sm text-[var(--muted)]">
          {copy.reminderHint}
        </p>
        <Card>
          <form
            onSubmit={handleCreateReminder}
            className="grid gap-3 md:grid-cols-6"
          >
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-sm font-medium">{copy.name}</span>
              <input
                value={reminderForm.name}
                onChange={(event) => handleReminderChange("name", event.target.value)}
                required
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                placeholder={copy.namePlaceholder}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{copy.lastIncome}</span>
              <input
                type="date"
                value={reminderForm.last_declared_on}
                onChange={(event) =>
                  handleReminderChange("last_declared_on", event.target.value)
                }
                required={reminderForm.frequency !== "one_off"}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{copy.frequency}</span>
              <select
                value={reminderForm.frequency}
                onChange={(event) =>
                  handleReminderChange("frequency", event.target.value)
                }
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <option value="monthly">{formatFrequency("monthly", locale)}</option>
                <option value="bi_weekly">{formatFrequency("bi_weekly", locale)}</option>
                <option value="weekly">{formatFrequency("weekly", locale)}</option>
                <option value="one_off">{formatFrequency("one_off", locale)}</option>
              </select>
            </label>
            {reminderForm.frequency === "monthly" ? (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">{copy.usualDay}</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={reminderForm.day_of_month}
                  onChange={(event) =>
                    handleReminderChange("day_of_month", event.target.value)
                  }
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                />
              </label>
            ) : null}
            {reminderForm.frequency === "one_off" ? (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">{copy.nextIncome}</span>
                <input
                  type="date"
                  value={reminderForm.due_date}
                  onChange={(event) =>
                    handleReminderChange("due_date", event.target.value)
                  }
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">{copy.timezone}</span>
              <input
                value={reminderForm.timezone}
                onChange={(event) =>
                  handleReminderChange("timezone", event.target.value)
                }
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                placeholder="UTC"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" isLoading={reminderSaving}>
                {copy.add}
              </Button>
            </div>
          </form>
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
            <p className="font-medium text-[var(--ink)]">{copy.nextReminder}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {previewUpcomingDates().length === 0 ? (
                <span>{copy.nextReminderHint}</span>
              ) : (
                previewUpcomingDates().map((dateValue) => (
                  <Badge key={dateValue} tone="muted">
                    {dateValue}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </Card>
        <div className="grid gap-3">
          {reminders.length === 0 ? (
            <EmptyState
              title={copy.noReminder}
              description={copy.noReminderDesc}
            />
          ) : (
            reminders.map((reminder) => (
              <Card key={reminder.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {reminder.name}
                    </p>
                    {reminder.is_active ? (
                      reminder.next_due_on &&
                      reminder.next_due_on <= new Date().toISOString().slice(0, 10) ? (
                        <Badge tone="warning">{copy.due}</Badge>
                      ) : (
                        <Badge tone="success">{copy.upcoming}</Badge>
                      )
                    ) : (
                      <Badge tone="muted">{copy.inactive}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    <Badge tone="muted">{formatFrequency(reminder.frequency, locale)}</Badge>
                    <Badge tone="accent">
                      {copy.next} : {reminder.next_due_on ?? "—"}
                    </Badge>
                    <Badge tone="default">
                      {copy.last} : {reminder.last_declared_on ?? "—"}
                    </Badge>
                    <Badge tone="default">TZ : {reminder.timezone}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleMarkDeclared(reminder)}
                    disabled={reminderSaving}
                  >
                    {copy.declared}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteReminder(reminder.id)}
                    disabled={reminderSaving}
                  >
                    {copy.delete}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}
