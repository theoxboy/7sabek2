"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Flame,
  Coins,
  ShieldCheck,
  CheckCheck,
  BellRing,
  Eye,
  ShieldAlert,
  Sparkles,
  FileCheck2,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import { extractLatestSalaryScheduleProfile } from "@/lib/salaryNotifications";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";

// Shared Notification Type
interface NotificationItem {
  id: string;
  type: "security" | "budget" | "system" | "savings";
  title: string;
  description: string;
  time: string;
  read: boolean;
  important?: boolean;
}

// Initial Mock Notifications
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    type: "security",
    title: "Nouvelle connexion détectée",
    description:
      "Connexion ShieldKey réussie depuis un appareil iPhone - Casablanca, Maroc.",
    time: "Il y a 3 min",
    read: false,
    important: true,
  },
  {
    id: "notif-2",
    type: "budget",
    title: "Routine budget en attente",
    description:
      'Il vous reste 2 minutes aujourd\'hui pour valider votre routine "7sabek Cash Split".',
    time: "Il y a 15 min",
    read: false,
    important: true,
  },
  {
    id: "notif-3",
    type: "savings",
    title: "Objectif Épargne presque atteint !",
    description:
      "Félicitations Youssef ! Votre cagnotte est financée à 85%. Plus que 150 DH.",
    time: "Il y a 2 heures",
    read: true,
  },
  {
    id: "notif-4",
    type: "system",
    title: "Mise à jour de sécurité installée",
    description:
      "La version stable v2.4.0 de ShieldKey a été déployée avec succès (chiffrement de bout en bout).",
    time: "Hier",
    read: true,
  },
];

// Audio Synthesizer for high-fidelity interactive feedback
const playSound = (
  type: "click" | "success" | "error" | "bell",
  muted: boolean,
) => {
  if (muted) return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "success") {
      const scale = [523.25, 659.25, 783.99, 1046.5];
      scale.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + idx * 0.06 + 0.3,
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.3);
      });
    } else if (type === "bell") {
      const scale = [880, 1320];
      scale.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.05, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + idx * 0.1 + 0.6,
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.6);
      });
    } else if (type === "error") {
      const frequencies = [160, 155];
      frequencies.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      });
    }
  } catch (err) {
    console.debug("Blocked audio play:", err);
  }
};

// Helper Functions for Real Notification Diagnostics
const SALARY_KEYWORDS = ["salaire", "salary", "payroll", "wage", "paycheck", "salario", "راتب"];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const isSalaryLikeTransaction = (
  tx: any,
  categoryName: string | undefined,
  expectedAmount: number | null
) => {
  if (tx.type !== "income") return false;
  const text = normalizeText(`${tx.description ?? ""} ${categoryName ?? ""}`.trim());
  const keywordMatch = SALARY_KEYWORDS.some((keyword) => text.includes(normalizeText(keyword)));
  const amount = Number(tx.amount);
  const amountMatch =
    expectedAmount && Number.isFinite(amount) && expectedAmount > 0
      ? Math.abs(amount - expectedAmount) / expectedAmount <= 0.35
      : false;
  return keywordMatch || amountMatch;
};

const normalizeAmount = (value: string | number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed.toFixed(2);
};

const buildDuplicateTransactionKey = (tx: any) =>
  [
    tx.type,
    tx.category_id,
    tx.occurred_on,
    normalizeAmount(tx.amount),
    normalizeText(tx.description ?? ""),
  ].join("|");

const compareTransactionRecency = (a: any, b: any) => {
  const dateCmp = b.occurred_on.localeCompare(a.occurred_on);
  if (dateCmp !== 0) return dateCmp;
  const createdA = a.created_at ?? "";
  const createdB = b.created_at ?? "";
  const createdCmp = createdB.localeCompare(createdA);
  if (createdCmp !== 0) return createdCmp;
  return b.id.localeCompare(a.id);
};

const extractOnboardingAnswers = (record: any) => {
  const payload =
    record?.payload && typeof record.payload === "object" ? record.payload : null;
  const answers =
    payload && typeof payload.answers === "object" && payload.answers
      ? (payload.answers as Record<string, unknown>)
      : {};
  return answers;
};

const NOTIFICATIONS_COPY = {
  fr: {
    title: "Centre de Notifications",
    subtitle: "7sabek lflous — Mises à jour & Alertes",
    back: "Retour",
    readAll: "Tout lire",
    upToDate: "À jour",
    tabInbox: "Boîte de réception",
    tabDashboard: "Simulateur & Stats",
    summaryTitle: "Résumé 7sabek ShieldKey",
    total: "Total",
    unread: "Non Lus",
    security: "Sécurité",
    budget: "Budget",
    filterTitle: "Sélectionner un filtre",
    filterAll: "Toutes les notifications",
    filterBudget: "Banque & Budget",
    filterSecurity: "Accès & Sécurité",
    filterSavings: "Objectifs Épargne",
    filterSystem: "Intégrité Système",
    filterAllShort: "Tout",
    filterBudgetShort: "Budget",
    filterSecurityShort: "Sécurité",
    filterSavingsShort: "Épargne",
    filterSystemShort: "Système",
    liveActivity: "Flux d'activités en direct",
    filteredSuffix: (count: number) => `${count} élément(s) filtré(s)`,
    emptyTitle: "Aucun élément filtré",
    emptyDesc: "Vos paramètres de filtre ou la boîte de réception sont vides.",
    read: "Lire",
    delete: "Supprimer",
    timeReal: "Temps réel",
  },
  en: {
    title: "Notification Center",
    subtitle: "7sabek lflous — Updates & Alerts",
    back: "Back",
    readAll: "Read all",
    upToDate: "Up to date",
    tabInbox: "Inbox",
    tabDashboard: "Simulator & Stats",
    summaryTitle: "7sabek ShieldKey Summary",
    total: "Total",
    unread: "Unread",
    security: "Security",
    budget: "Budget",
    filterTitle: "Select a filter",
    filterAll: "All notifications",
    filterBudget: "Bank & Budget",
    filterSecurity: "Access & Security",
    filterSavings: "Savings Goals",
    filterSystem: "System Integrity",
    filterAllShort: "All",
    filterBudgetShort: "Budget",
    filterSecurityShort: "Security",
    filterSavingsShort: "Savings",
    filterSystemShort: "System",
    liveActivity: "Live activity feed",
    filteredSuffix: (count: number) => `${count} filtered item(s)`,
    emptyTitle: "No filtered items",
    emptyDesc: "Your filter settings or inbox are empty.",
    read: "Read",
    delete: "Delete",
    timeReal: "Real-time",
  },
  ar: {
    title: "مركز الإشعارات",
    subtitle: "حسابك لفلوس — تحديثات وتنبيهات",
    back: "رجوع",
    readAll: "قراءة الكل",
    upToDate: "محدّث",
    tabInbox: "صندوق الوارد",
    tabDashboard: "الإحصائيات",
    summaryTitle: "خلاصة 7سابك ShieldKey",
    total: "المجموع",
    unread: "غير مقروءة",
    security: "الأمان",
    budget: "الميزانية",
    filterTitle: "اختر تصفية",
    filterAll: "كل الإشعارات",
    filterBudget: "البنك والميزانية",
    filterSecurity: "الولوج والأمان",
    filterSavings: "أهداف الادخار",
    filterSystem: "سلامة النظام",
    filterAllShort: "الكل",
    filterBudgetShort: "الميزانية",
    filterSecurityShort: "الأمان",
    filterSavingsShort: "الادخار",
    filterSystemShort: "النظام",
    liveActivity: "نشاط الميزانية المباشر",
    filteredSuffix: (count: number) => `${count} إشعارات مصفاة`,
    emptyTitle: "لا يوجد أي إشعار مصفى",
    emptyDesc: "معايير التصفية أو صندوق الوارد ديالك فارغ.",
    read: "قراءة",
    delete: "حذف",
    timeReal: "في الحين",
  },
};

export default function BetaNotificationsPage() {
  const router = useRouter();
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "beta-notifications-ar-body");
  const copy = NOTIFICATIONS_COPY[locale];

  const latestLocaleRef = useRef(locale);
  latestLocaleRef.current = locale;

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Notifications State Management
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingReal, setLoadingReal] = useState(false);

  const handleLoadRealNotifications = useCallback(async (isManual = true) => {
    if (isManual) {
      playSound("click", false);
    }
    setLoadingReal(true);
    try {
      const user = await fetchMe({ suppressAuthRedirect: true }).catch(() => null);
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }
      
      const [alerts, reminders, records, transactions, categories] = await Promise.all([
        apiFetch<any>("/dashboard/alerts").catch(() => null),
        apiFetch<any[]>("/income-reminders").catch(() => []),
        apiFetch<any[]>("/users/me/onboarding-v2-records?limit=1").catch(() => []),
        apiFetch<any[]>("/transactions?limit=25").catch(() => []),
        apiFetch<any[]>("/categories").catch(() => []),
      ]);

      if (locale !== latestLocaleRef.current) {
        return;
      }

      const latestRecord = records[0] ?? null;
      const unmappedCount = alerts?.unmapped_categories ?? 0;
      const overspentEnvelopes = alerts?.overspent_envelopes ?? [];
      const sweepDue = alerts?.sweep_due ?? false;
      const currentPeriod = alerts?.current_period ?? null;
      const needsFirstIncomeDeclaration = Boolean(
        alerts?.sweep_bootstrap?.needs_first_income_declaration
      );

      const categoryNameById = new Map(
        categories.map((c: any) => [c.id, c.name])
      );
      
      const answers = extractOnboardingAnswers(latestRecord);
      const profile = extractLatestSalaryScheduleProfile(latestRecord?.payload);
      const incomeType = typeof answers.Q0_income_type === "string" ? answers.Q0_income_type : "";
      const salaryAmountAnswer =
        typeof answers.S2a_salary_amount === "string" || typeof answers.S2a_salary_amount === "number"
          ? Number(answers.S2a_salary_amount)
          : null;
      const expectedSalaryAmount =
        profile?.amount && Number.isFinite(profile.amount)
          ? profile.amount
          : salaryAmountAnswer && Number.isFinite(salaryAmountAnswer)
          ? salaryAmountAnswer
          : null;

      const items: NotificationItem[] = [];

      // Duplicate transactions
      const duplicateGroups = new Map<string, any[]>();
      transactions.forEach((tx) => {
        const key = buildDuplicateTransactionKey(tx);
        const list = duplicateGroups.get(key) ?? [];
        list.push(tx);
        duplicateGroups.set(key, list);
      });
      const duplicateTransactions = Array.from(duplicateGroups.values()).filter(
        (group) => group.length > 1
      );
      const duplicateCount = duplicateTransactions.reduce(
        (sum, group) => sum + group.length - 1,
        0
      );
      if (duplicateCount > 0) {
        items.push({
          id: "real-dup",
          type: "security",
          title:
            locale === "ar"
              ? "تكرار فالعمليات"
              : locale === "en"
              ? "Duplicate transactions detected"
              : "Doublons détectés dans les transactions",
          description:
            locale === "ar"
              ? `لقينا ${duplicateCount} عملية معودة فالتاريخ ديالك.`
              : locale === "en"
              ? `${duplicateCount} duplicate transaction(s) found in your history.`
              : `${duplicateCount} transaction(s) en trop ont été trouvées dans l’historique.`,
          time: copy.timeReal,
          read: false,
          important: true,
        });
      }

      // Salary declarations
      if (incomeType === "salaried" && currentPeriod?.start && currentPeriod?.end) {
        const salaryLikeInPeriod = transactions.filter(
          (tx) =>
            tx.type === "income" &&
            tx.occurred_on >= currentPeriod.start &&
            // period end is the exclusive boundary (matches the backend's
            // `occurred_on < period_end`); a tx on that date belongs to N+1.
            tx.occurred_on < currentPeriod.end &&
            isSalaryLikeTransaction(
              tx,
              categoryNameById.get(tx.category_id),
              expectedSalaryAmount
            )
        );
        if (profile?.frequency === "monthly" && salaryLikeInPeriod.length > 1) {
          items.push({
            id: "real-sal-dup",
            type: "security",
            title:
              locale === "ar"
                ? "تنبيه: السالاير تسجّل أكثر من مرة"
                : locale === "en"
                ? "Anomaly: salary declared multiple times"
                : "Anomalie: salaire déclaré plusieurs fois",
            description:
              locale === "ar"
                ? `لقينا ${salaryLikeInPeriod.length} تصريحات ديال السالاير فهاد الدورة.`
                : locale === "en"
                ? `${salaryLikeInPeriod.length} salary declarations detected in the active period.`
                : `${salaryLikeInPeriod.length} déclarations salaire détectées sur la période active.`,
            time: copy.timeReal,
            read: false,
            important: true,
          });
        }
        if (salaryLikeInPeriod.length === 0) {
          items.push({
            id: "real-sal-missing",
            type: "budget",
            title:
              locale === "ar"
                ? "تنبيه: ما كاين حتى تصريح ديال السالاير فهاد الدورة"
                : locale === "en"
                ? "Anomaly: missing salary in current period"
                : "Anomalie: salaire manquant sur la période",
            description:
              locale === "ar"
                ? "إلا توصلتي بالسالاير، صرّح به دابا باش التقارير ما يختالطوش."
                : locale === "en"
                ? "No salary detected in the active period. Declare it if already received."
                : "Aucun salaire détecté sur la période active. Déclare-le si tu l’as déjà reçu.",
            time: copy.timeReal,
            read: false,
            important: false,
          });
        }
        if (expectedSalaryAmount && salaryLikeInPeriod.length > 0) {
          const latestSalary = [...salaryLikeInPeriod].sort(compareTransactionRecency)[0];
          const amount = Number(latestSalary.amount);
          const deviation = Math.abs(amount - expectedSalaryAmount) / expectedSalaryAmount;
          if (Number.isFinite(deviation) && deviation > 0.35) {
            items.push({
              id: "real-sal-amount",
              type: "budget",
              title:
                locale === "ar"
                  ? "تنبيه: مبلغ السالاير مختلف على المتوقع"
                  : locale === "en"
                  ? "Anomaly: unusual salary amount"
                  : "Anomalie: montant salaire inhabituel",
              description:
                locale === "ar"
                  ? `المتوقع تقريباً ${expectedSalaryAmount.toFixed(2)} و التصريح الأخير هو ${amount.toFixed(2)}.`
                  : locale === "en"
                  ? `Expected ~${expectedSalaryAmount.toFixed(2)}; latest entry is ${amount.toFixed(2)}.`
                  : `Attendu ~${expectedSalaryAmount.toFixed(2)} ; reçu ${amount.toFixed(2)}.`,
              time: copy.timeReal,
              read: false,
              important: false,
            });
          }
        }
      }

      // Due income reminders
      const today = new Date().toISOString().slice(0, 10);
      const dueReminders = reminders.filter(
        (reminder) =>
          reminder.is_active &&
          reminder.next_due_on &&
          reminder.next_due_on <= today
      );
      if (dueReminders.length > 0) {
        const names = dueReminders.map((item) => item.name).filter(Boolean);
        items.push({
          id: "real-inc",
          type: "savings",
          title:
            locale === "ar"
              ? `${dueReminders.length} دخل خاص يتصرّح`
              : locale === "en"
              ? `${dueReminders.length} income reminder(s) due`
              : `${dueReminders.length} revenu(s) à déclarer`,
          description:
            names.length > 0
              ? `${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}`
              : locale === "ar"
              ? "صرّح بالدخل باش يتحدّث التوزيع فالأظرفة."
              : locale === "en"
              ? "Declare income to keep envelopes updated."
              : "Déclare tes revenus pour mettre à jour tes enveloppes.",
          time: copy.timeReal,
          read: false,
        });
      }

      if (needsFirstIncomeDeclaration) {
        items.push({
          id: "real-first-income",
          type: "budget",
          title:
            locale === "ar"
              ? "⏳ باقي خاصك تصرّح بأول دخل"
              : locale === "en"
              ? "⏳ First income declaration still needed"
              : "⏳ Première déclaration de revenu à faire",
          description:
            locale === "ar"
              ? "صرّح بأول دخل ليك من بعد الـ onboarding باش تبدا الدورات على أساس حقيقي."
              : locale === "en"
              ? "Declare your first income after onboarding to start cycles on a real basis."
              : "Déclare ton premier revenu après l’onboarding pour démarrer les cycles sur une base réelle.",
          time: copy.timeReal,
          read: false,
          important: true,
        });
      }

      // Unmapped categories
      if (unmappedCount > 0) {
        items.push({
          id: "real-unmapped",
          type: "system",
          title:
            locale === "ar"
              ? `${unmappedCount} فئة ما مربوطةش`
              : locale === "en"
              ? `${unmappedCount} unmapped category/categories`
              : `${unmappedCount} catégorie(s) non mappée(s)`,
          description:
            locale === "ar"
              ? "المصاريف ما غاديش تتوزع حتى تربط هاد الفئات بالأظرفة."
              : locale === "en"
              ? "Expenses will not be distributed until these categories are mapped."
              : "Tes dépenses ne seront pas réparties tant que les catégories ne sont pas reliées.",
          time: copy.timeReal,
          read: false,
        });
      }

      // Overspent envelopes
      if (overspentEnvelopes.length > 0) {
        items.push({
          id: "real-overspent",
          type: "budget",
          title:
            locale === "ar"
              ? `${overspentEnvelopes.length} أظرفة فايتة القياس`
              : locale === "en"
              ? `${overspentEnvelopes.length} overspent envelope(s)`
              : `${overspentEnvelopes.length} enveloppe(s) dépassée(s)`,
          description:
            locale === "ar"
              ? `تجاوزتي الميزانية ف الأظرفة التالية: ${overspentEnvelopes.slice(0, 3).join(", ")}${overspentEnvelopes.length > 3 ? "…" : ""}`
              : locale === "en"
              ? `Overspent: ${overspentEnvelopes.slice(0, 3).join(", ")}${overspentEnvelopes.length > 3 ? "…" : ""}`
              : `${overspentEnvelopes.slice(0, 3).join(", ")}${overspentEnvelopes.length > 3 ? "…" : ""}`,
          time: copy.timeReal,
          read: false,
          important: true,
        });
      }

      // Sweep pending
      if (sweepDue) {
        items.push({
          id: "real-sweep",
          type: "system",
          title:
            locale === "ar"
              ? "تحويل الفائض في الانتظار"
              : locale === "en"
              ? "Rollover / Sweep pending"
              : "Rollover à exécuter",
          description:
            locale === "ar"
              ? "تقدر تدير الـ sweep باش تسد الدورة وتوجد للدورة الماجية."
              : locale === "en"
              ? "You can run the sweep to close this period and prepare the next one."
              : "Tu peux lancer le sweep pour clôturer la période et préparer la suivante.",
          time: copy.timeReal,
          read: false,
        });
      }

      if (items.length === 0) {
        items.push({
          id: "real-clean",
          type: "system",
          title:
            locale === "ar"
              ? "ميزانية مضبوطة ومتوازنة"
              : locale === "en"
              ? "Perfectly healthy budget"
              : "Budget parfaitement sain",
          description:
            locale === "ar"
              ? "كلشي مقاد، ما كاين حتى مشكل ولا تكرار فهاد الدورة!"
              : locale === "en"
              ? "No anomalies detected on your account. Your budget is up to date!"
              : "Aucune anomalie détectée sur votre compte. Votre budget est à jour !",
          time: copy.timeReal,
          read: false,
        });
      }

      const deletedSaved = localStorage.getItem("floussy.beta.notifications.deleted");
      let deletedIds: string[] = [];
      if (deletedSaved) {
        try {
          deletedIds = JSON.parse(deletedSaved);
        } catch {}
      }

      const freshIds = new Set(items.map((n) => n.id));
      const activeDeleted = deletedIds.filter((id) => freshIds.has(id));
      localStorage.setItem("floussy.beta.notifications.deleted", JSON.stringify(activeDeleted));

      const saved = localStorage.getItem("floussy.beta.notifications");
      let existingNotifs: NotificationItem[] = [];
      if (saved) {
        try {
          existingNotifs = JSON.parse(saved);
        } catch {}
      }

      const updatedItems = items
        .map((newItem) => {
          const existing = existingNotifs.find((old) => old.id === newItem.id);
          if (existing) {
            return { ...newItem, read: existing.read };
          }
          return newItem;
        })
        .filter((newItem) => {
          return !activeDeleted.includes(newItem.id);
        });

      updateNotifications(updatedItems);
      if (isManual) {
        playSound("success", false);
      }
    } catch (err: any) {
      console.error(err);
      if (isManual) {
        playSound("error", false);
        alert(`Erreur lors du chargement : ${err.message || err}`);
      }
    } finally {
      setLoadingReal(false);
    }
  }, [locale, copy]);

  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "security" | "budget" | "system" | "savings"
  >("all");
  const [activeMobileTab, setActiveMobileTab] = useState<
    "notifications" | "dashboard"
  >("notifications");

  // Load notifications from local storage on mount to share with chat page
  useEffect(() => {
    if (!hydrated) return;

    const saved = localStorage.getItem("floussy.beta.notifications");
    let hasLoadedSaved = false;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasMocks = parsed.some((n: any) => n.id && String(n.id).startsWith("notif-"));
          if (!hasMocks) {
            setNotifications(parsed);
            hasLoadedSaved = true;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Always trigger a fresh fetch to keep it perfectly in sync with the real system
    handleLoadRealNotifications(false);
  }, [hydrated, locale, handleLoadRealNotifications]);

  const updateNotifications = (newNotifs: NotificationItem[]) => {
    setNotifications(newNotifs);
    localStorage.setItem("floussy.beta.notifications", JSON.stringify(newNotifs));
  };

  // Stats Counters
  const unreadCount = notifications.filter((n) => !n.read).length;
  const totalCount = notifications.length;
  const securityWarnings = notifications.filter(
    (n) => n.type === "security",
  ).length;
  const budgetAlerts = notifications.filter((n) => n.type === "budget").length;

  // Actions inside the Notification Center
  const handleMarkAsRead = (id: string) => {
    playSound("click", false);
    const updated = notifications.map((notif) => (notif.id === id ? { ...notif, read: true } : notif));
    updateNotifications(updated);
  };

  const handleDeleteNotification = (id: string) => {
    playSound("error", false);
    const updated = notifications.filter((notif) => notif.id !== id);
    updateNotifications(updated);

    try {
      const deletedSaved = localStorage.getItem("floussy.beta.notifications.deleted");
      const deleted: string[] = deletedSaved ? JSON.parse(deletedSaved) : [];
      if (Array.isArray(deleted) && !deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem("floussy.beta.notifications.deleted", JSON.stringify(deleted));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAllRead = () => {
    playSound("success", false);
    const updated = notifications.map((n) => ({ ...n, read: true }));
    updateNotifications(updated);
  };

  // Live test feature in active session: dynamic simulations
  const handleTriggerTestNotification = (
    category: "security" | "budget" | "system" | "savings",
  ) => {
    playSound("bell", false);
    const id = `test-${Date.now()}`;
    let newNotif: NotificationItem;

    if (category === "security") {
      newNotif = {
        id,
        type: "security",
        title: "Alerte sécurité temporaire",
        description:
          "Tentative d'accès simulée résolue avec succès par authentification biométrique.",
        time: "À l'instant",
        read: false,
        important: true,
      };
    } else if (category === "budget") {
      newNotif = {
        id,
        type: "budget",
        title: "Mise à jour Budget Cash Split",
        description:
          "Une nouvelle opération de 350 DH est disponible pour répartition immédiate.",
        time: "À l'instant",
        read: false,
        important: false,
      };
    } else if (category === "savings") {
      newNotif = {
        id,
        type: "savings",
        title: "Bonus d'épargne débloqué",
        description:
          "Félicitations ! Votre discipline financière 7sabek vous rapporte un score bonus +45.",
        time: "À l'instant",
        read: false,
      };
    } else {
      newNotif = {
        id,
        type: "system",
        title: "Test d'intégrité ShieldKey",
        description:
          "Le système confirme que la communication chiffrée avec le serveur fonctionne parfaitement.",
        time: "À l'instant",
        read: false,
      };
    }

    updateNotifications([newNotif, ...notifications]);
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === "all") return true;
    return n.type === selectedFilter;
  });

  return (
    <div dir={dir} className="w-full h-screen bg-[var(--surface-2)] relative text-[var(--ink)] font-sans p-0 overflow-hidden flex flex-col">
      {/* Immersive ambient glowing background blur circles */}
      <div className="absolute top-[-15%] left-[-15%] w-[68vw] h-[68vw] rounded-full bg-gradient-to-tr from-emerald-400/20 to-teal-400/10 blur-[130px] pointer-events-none animate-pulse-slow" />
      <div
        className="absolute bottom-[-15%] right-[-15%] w-[68vw] h-[68vw] rounded-full bg-gradient-to-br from-teal-400/20 to-emerald-500/10 blur-[130px] pointer-events-none animate-pulse-slow font-sans"
        style={{ animationDelay: "3s" }}
      />
      <div
        className="absolute top-[30%] left-[30%] w-[45vw] h-[45vw] rounded-full bg-sky-300/15 blur-[140px] pointer-events-none animate-pulse-slow"
        style={{ animationDelay: "6s" }}
      />

      {/* Top minimal decorative brand line with dynamic light sweep anim */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--surface)] overflow-hidden z-10 w-full backdrop-blur-xs">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="h-full w-2/5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-600"
        />
      </div>

      <motion.main
        key="notifications-page"
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 25 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="w-full h-screen z-10 flex flex-col overflow-hidden"
      >
        {/* Full width - Adaptive layout, no enclosing frame card */}
        <div className="w-full h-screen flex flex-col relative bg-[var(--surface)] backdrop-blur-3xl overflow-hidden">
          
          {/* Header Navigation Bar */}
          <div className="p-3.5 xs:p-5 border-b border-[var(--border)]/40 bg-[var(--surface)] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                playSound("click", false);
                router.back();
              }}
              className="p-2 xs:px-3 xs:py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface)] border border-[var(--border)]/35 text-[var(--ink)] hover:text-[var(--ink)] transition flex items-center gap-1 active:scale-95 cursor-pointer text-xs font-bold shadow-xs whitespace-nowrap"
              title={copy.back}
            >
              <ArrowLeft className={`w-4 h-4 stroke-[2.5] ${locale === "ar" ? "rotate-180" : ""}`} />
              <span className="hidden xs:inline">{copy.back}</span>
            </button>

            <div className="text-center min-w-0 flex-1">
              <h2 className="text-xs xs:text-sm sm:text-lg font-black tracking-tight text-slate-955 flex items-center justify-center gap-1 xs:gap-1.5 leading-none truncate">
                <BellRing className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-emerald-600 animate-pulse shrink-0" />
                <span>{copy.title}</span>
              </h2>
              <p className="hidden xs:block text-[8px] sm:text-[10px] text-[var(--muted)] font-bold mt-1 uppercase tracking-wider truncate">
                {copy.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-1 xs:gap-2 shrink-0">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={handleMarkAllAllRead}
                  className="px-2 xs:px-3 py-1.5 rounded-lg xs:rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-800 border border-emerald-200/40 text-[10px] xs:text-[11px] font-black tracking-tight transition flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                  title={copy.readAll}
                >
                  <CheckCheck className="w-3.5 h-3.5 xs:w-4 xs:h-4 stroke-[2.5]" />
                  <span className="hidden xs:inline">{copy.readAll}</span>
                </button>
              ) : (
                <div className="px-2 xs:px-3 py-1.5 text-[var(--muted)] bg-[var(--surface-2)]/40 border border-[var(--border)]/10 text-[10px] xs:text-[11px] font-bold rounded-lg xs:rounded-xl flex items-center gap-1 align-middle justify-center whitespace-nowrap">
                  <FileCheck2 className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                  <span className="hidden xs:inline">{copy.upToDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Adaptive Tabs Selector */}
          <div className="lg:hidden px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]/20 flex justify-center sticky top-0 z-30 backdrop-blur-md">
            <div className="inline-flex bg-[var(--border)]/50 p-1 rounded-2xl w-full max-w-sm">
              <button
                type="button"
                onClick={() => {
                  playSound("click", false);
                  setActiveMobileTab("notifications");
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeMobileTab === "notifications"
                    ? "bg-[var(--surface)] text-emerald-600 shadow-xs"
                    : "text-[var(--muted)] hover:text-slate-850"
                }`}
              >
                <BellRing className="w-3.5 h-3.5 text-emerald-500" />
                <span>{copy.tabInbox}</span>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full inline-block animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  playSound("click", false);
                  setActiveMobileTab("dashboard");
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeMobileTab === "dashboard"
                    ? "bg-[var(--surface)] text-emerald-600 shadow-xs"
                    : "text-[var(--muted)] hover:text-slate-850"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>{copy.tabDashboard}</span>
              </button>
            </div>
          </div>

          {/* Grid content space: 1 Column on Mobile -> 3 Columns on Tablet/Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-grow flex-1 min-h-0 overflow-hidden">
            
            {/* COLUMN A (SIDEBAR FOR DESKTOPS): Statistics & Interactive Simulator triggers */}
            <div
              className={`lg:col-span-4 p-4 pb-8 xs:p-5 xs:pb-10 sm:p-6 sm:pb-8 lg:pb-6 border-b lg:border-b-0 lg:border-r border-[var(--border)]/35 bg-[var(--surface)] flex flex-col justify-between ${
                activeMobileTab === "dashboard" ? "flex" : "hidden lg:flex"
              }`}
            >
              <div>
                <h3 className="text-xs font-extrabold text-[var(--muted)] uppercase tracking-widest mb-4">
                  {copy.summaryTitle}
                </h3>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-[var(--surface)] p-3 rounded-2xl border border-[var(--border)] shadow-xs">
                    <span className="text-[10px] font-bold text-[var(--muted)]">{copy.total}</span>
                    <div className="text-xl font-black text-[var(--ink)] mt-0.5">
                      {totalCount}
                    </div>
                  </div>
                  <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100/30 shadow-xs relative overflow-hidden">
                    <span className="text-[10px] font-bold text-emerald-500">{copy.unread}</span>
                    <div className="text-xl font-black text-emerald-600 mt-0.5">
                      {unreadCount}
                    </div>
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-100/30 shadow-xs">
                    <span className="text-[10px] font-bold text-rose-500">{copy.security}</span>
                    <div className="text-xl font-black text-rose-600 mt-0.5">
                      {securityWarnings}
                    </div>
                  </div>
                  <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100/30 shadow-xs">
                    <span className="text-[10px] font-bold text-amber-500">{copy.budget}</span>
                    <div className="text-xl font-black text-amber-600 mt-0.5">
                      {budgetAlerts}
                    </div>
                  </div>
                </div>

                {/* Filter categories pills */}
                <div className="mb-6">
                  <h4 className="text-[10px] font-extrabold text-[var(--muted)] uppercase tracking-wider mb-2.5">
                    {copy.filterTitle}
                  </h4>
                  <div className="flex flex-wrap lg:flex-col gap-1.5">
                    {[
                      {
                        key: "all",
                        label: copy.filterAll,
                        count: totalCount,
                      },
                      {
                        key: "budget",
                        label: copy.filterBudget,
                        count: budgetAlerts,
                      },
                      {
                        key: "security",
                        label: copy.filterSecurity,
                        count: securityWarnings,
                      },
                      {
                        key: "savings",
                        label: copy.filterSavings,
                        count: notifications.filter((n) => n.type === "savings").length,
                      },
                      {
                        key: "system",
                        label: copy.filterSystem,
                        count: notifications.filter((n) => n.type === "system").length,
                      },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          playSound("click", false);
                          setSelectedFilter(item.key as any);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer w-full text-left ${
                          selectedFilter === item.key
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-[var(--surface)] hover:bg-[var(--surface)] border border-[var(--border)]/20 text-[var(--muted)]"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            selectedFilter === item.key
                              ? "bg-emerald-700 text-emerald-100"
                              : "bg-[var(--border)]/50 text-[var(--muted)]"
                          }`}
                        >
                          {item.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN B (MAIN NOTIFICATIONS AREA) */}
            <div
              className={`lg:col-span-8 p-3 pb-8 xs:p-4 xs:pb-10 sm:p-6 sm:pb-8 lg:pb-6 flex flex-col min-h-0 ${
                activeMobileTab === "notifications" ? "flex" : "hidden lg:flex"
              }`}
            >
              <div>
                {/* Horizontal scrollable filter pills for mobile only */}
                <div className="lg:hidden flex gap-2 overflow-x-auto pb-3.5 pt-1 mb-1 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {[
                    { key: "all", label: copy.filterAllShort, count: totalCount, icon: Bell },
                    { key: "budget", label: copy.filterBudgetShort, count: budgetAlerts, icon: Flame },
                    { key: "security", label: copy.filterSecurityShort, count: securityWarnings, icon: AlertTriangle },
                    { key: "savings", label: copy.filterSavingsShort, count: notifications.filter((n) => n.type === "savings").length, icon: Coins },
                    { key: "system", label: copy.filterSystemShort, count: notifications.filter((n) => n.type === "system").length, icon: ShieldCheck },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedFilter === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          playSound("click", false);
                          setSelectedFilter(item.key as any);
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-black snap-start shrink-0 border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                            : "bg-[var(--surface)] border-[var(--border)]/50 text-[var(--ink)]"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? "bg-emerald-700 text-emerald-100"
                              : "bg-[var(--surface-2)] text-[var(--muted)]"
                          }`}
                        >
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mb-3 text-xs text-[var(--muted)] font-bold bg-[var(--surface)] p-1 rounded-lg">
                  <span>{copy.liveActivity}</span>
                  <span>{copy.filteredSuffix(filteredNotifications.length)}</span>
                </div>

                {/* Scrollable notifications list */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-grow flex-1 min-h-0" style={{ maxHeight: "calc(100vh - 180px)" }}>
                  <AnimatePresence initial={false} mode="popLayout">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((notif) => (
                        <motion.div
                          key={notif.id}
                          layout
                          initial={{ opacity: 0, y: 12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.92, x: -30 }}
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 26,
                          }}
                          className={`p-3 xs:p-4 rounded-xl xs:rounded-2xl border transition-all relative overflow-hidden group ${
                            !notif.read
                              ? "bg-[var(--surface)] shadow-[0_5px_15px_rgba(30,41,59,0.02)] border-emerald-200/40"
                              : "bg-[var(--surface)] hover:bg-[var(--surface)] border-[var(--border)]/20 shadow-xs"
                          }`}
                        >
                          {/* Glowing colored timeline decorator */}
                          <div
                            className={`absolute top-0 bottom-0 left-0 w-1.2 ${
                              notif.type === "security"
                                ? "bg-rose-500"
                                : notif.type === "budget"
                                  ? "bg-amber-500"
                                  : notif.type === "savings"
                                    ? "bg-emerald-500"
                                    : "bg-teal-500"
                            }`}
                          />

                          <div className="flex gap-2.5 xs:gap-3.5">
                            {/* Vector Indicator Circle */}
                            <div
                              className={`w-8.5 h-8.5 xs:w-10 xs:h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                                notif.type === "security"
                                  ? "bg-rose-50 text-rose-500 border border-rose-100"
                                  : notif.type === "budget"
                                    ? "bg-amber-50 text-amber-500 border border-amber-100"
                                    : notif.type === "savings"
                                      ? "bg-emerald-50 text-emerald-500 border border-emerald-100"
                                      : "bg-teal-50 text-teal-600 border border-teal-100"
                              }`}
                            >
                              {notif.type === "security" && <AlertTriangle className="w-4.5 h-4.5 xs:w-5 xs:h-5" />}
                              {notif.type === "budget" && <Flame className="w-4.5 h-4.5 xs:w-5 xs:h-5" />}
                              {notif.type === "savings" && <Coins className="w-4.5 h-4.5 xs:w-5 xs:h-5" />}
                              {notif.type === "system" && <ShieldCheck className="w-4.5 h-4.5 xs:w-5 xs:h-5" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <h4
                                  className={`text-xs xs:text-sm sm:text-base font-extrabold leading-tight ${!notif.read ? "text-slate-955" : "text-[var(--ink)]"}`}
                                >
                                  {notif.title}
                                </h4>
                                <span className="text-[9px] sm:text-xs text-[var(--muted)] font-bold whitespace-nowrap shrink-0">
                                  {notif.time}
                                </span>
                              </div>

                              <p className="text-[10px] xs:text-xs text-[var(--muted)] font-semibold mt-1 leading-relaxed">
                                {notif.description}
                              </p>

                              {/* Custom Action Trigger Panel */}
                              <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-[var(--border)]/60 font-sans">
                                {!notif.read && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAsRead(notif.id)}
                                    className="text-[10px] xs:text-xs text-emerald-600 hover:text-emerald-800 font-black focus:outline-none flex items-center gap-0.5 cursor-pointer hover:underline"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{copy.read}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteNotification(notif.id)}
                                  className="text-[10px] xs:text-xs text-[var(--muted)] hover:text-rose-600 font-bold ltr:ml-auto rtl:mr-auto focus:outline-none flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{copy.delete}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16 flex flex-col items-center justify-center text-[var(--muted)]"
                      >
                        <div className="w-14 h-14 rounded-full border border-[var(--border)]/50 bg-[var(--surface)] flex items-center justify-center text-[var(--muted)] mb-4 shadow-sm">
                          <Bell className="w-6 h-6 opacity-30 animate-pulse" />
                        </div>
                        <p className="text-sm font-bold text-[var(--ink)]">{copy.emptyTitle}</p>
                        <p className="text-xs text-[var(--muted)] font-medium mt-1 leading-none">
                          {copy.emptyDesc}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
