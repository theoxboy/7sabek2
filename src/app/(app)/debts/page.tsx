"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  HandCoins,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Send,
  Trash2,
  Wallet,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { DebtCreateIn, DebtOut, DebtRepayIn, DebtUpdateIn, SettingsResponse } from "@/lib/types";
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

const DEBTS_COPY = {
  fr: {
    heroTitle: "Dettes & Salaf",
    heroDescription: "Gérez vos prêts accordés et vos dettes en toute sérénité avec rappels WhatsApp.",
    totalGiven: "À récupérer (كنسال)",
    totalOwed: "À rembourser (كيسالوني)",
    netBalance: "Balance nette",
    all: "Tous",
    given: "À récupérer (سلف)",
    owed: "À rembourser (دين)",
    settled: "Réglés ✅",
    addDebt: "Ajouter une dette / prêt",
    noDebtsTitle: "Aucune dette enregistrée",
    noDebtsDescription: "Enregistrez vos prêts accordés ou vos dettes pour commencer le suivi.",
    paid: "Payé",
    remaining: "Reste",
    dueDate: "Échéance",
    repay: "Rembourser",
    repayTitle: "Enregistrer un remboursement",
    repayDescription: "Indiquez le montant remboursé pour ajuster le solde.",
    amount: "Montant",
    cancel: "Annuler",
    confirm: "Confirmer",
    deleteTitle: "Supprimer la dette",
    deleteDescription: "Êtes-vous sûr de vouloir supprimer cet enregistrement ?",
    delete: "Supprimer",
    edit: "Modifier",
    editTitle: "Modifier la dette",
    contactName: "Nom du contact / créancier",
    contactPhone: "Numéro de téléphone WhatsApp",
    totalAmount: "Montant total (DH)",
    type: "Type d'opération",
    typeGiven: "On me doit (كنسال - Prêt accordé)",
    typeOwed: "Je dois (كيسالوني - Dette à payer)",
    notes: "Notes & détails (optionnel)",
    whatsAppTitle: "Envoyer un message WhatsApp",
    chooseTemplate: "Choisir un modèle de message :",
    messagePreview: "Aperçu & personnalisation du message :",
    openWhatsApp: "Ouvrir WhatsApp",
    phoneRequired: "Veuillez renseigner un numéro de téléphone.",
    save: "Enregistrer",
    createdSuccess: "Enregistrement créé avec succès",
    updatedSuccess: "Enregistrement mis à jour",
    deletedSuccess: "Enregistrement supprimé",
    repaySuccess: "Remboursement enregistré",
  },
  en: {
    heroTitle: "Debts & Salaf",
    heroDescription: "Manage loans given and debts with WhatsApp reminder templates.",
    totalGiven: "Owed to me",
    totalOwed: "I owe",
    netBalance: "Net balance",
    all: "All",
    given: "Owed to me",
    owed: "I owe",
    settled: "Settled ✅",
    addDebt: "Add debt / loan",
    noDebtsTitle: "No debt recorded",
    noDebtsDescription: "Record loans given or debts to start tracking.",
    paid: "Paid",
    remaining: "Remaining",
    dueDate: "Due date",
    repay: "Repay",
    repayTitle: "Record repayment",
    repayDescription: "Enter the repaid amount to update balance.",
    amount: "Amount",
    cancel: "Cancel",
    confirm: "Confirm",
    deleteTitle: "Delete debt",
    deleteDescription: "Are you sure you want to delete this record?",
    delete: "Delete",
    edit: "Edit",
    editTitle: "Edit debt",
    contactName: "Contact / lender name",
    contactPhone: "WhatsApp phone number",
    totalAmount: "Total amount (DH)",
    type: "Operation type",
    typeGiven: "Owed to me (Loan given)",
    typeOwed: "I owe (Debt to pay)",
    notes: "Notes & details (optional)",
    whatsAppTitle: "Send WhatsApp message",
    chooseTemplate: "Choose a message template:",
    messagePreview: "Preview & customize message:",
    openWhatsApp: "Open WhatsApp",
    phoneRequired: "Please provide a valid phone number.",
    save: "Save",
    createdSuccess: "Record created successfully",
    updatedSuccess: "Record updated",
    deletedSuccess: "Record deleted",
    repaySuccess: "Repayment recorded",
  },
  ar: {
    heroTitle: "الديون والتسليفات (Salaf)",
    heroDescription: "ضبط وتتبع السلف والديون بكل سهولة مع خيارات إرسال رسائل الواتساب.",
    totalGiven: "كنسال (سلف)",
    totalOwed: "كيسالوني (دين)",
    netBalance: "الرصيد الصافي",
    all: "الكل",
    given: "كنسال (سلف)",
    owed: "كيسالوني (دين)",
    settled: "مسددة ✅",
    addDebt: "تسجيل سلف أو دين جديد",
    noDebtsTitle: "لا توجد ديون مسجلة",
    noDebtsDescription: "قم بتسجيل التسليفات أو الديون للبدء في المتابعة والتذكير.",
    paid: "تم أداؤه",
    remaining: "المتبقي",
    dueDate: "تاريخ الاستحقاق",
    repay: "تسجيل دفعة",
    repayTitle: "تسجيل سداد أو دفعة",
    repayDescription: "أدخل المبلغ المؤدى لتحديث الرصيد المتبقي.",
    amount: "المبلغ",
    cancel: "إلغاء",
    confirm: "تأكيد",
    deleteTitle: "حذف السجل",
    deleteDescription: "هل أنت متأكد من رغبتك في حذف هذه المعاملة ؟",
    delete: "حذف",
    edit: "تعديل",
    editTitle: "تعديل بيانات الدين",
    contactName: "اسم الشخص / المتجر",
    contactPhone: "رقم الهاتف للواتساب",
    totalAmount: "المبلغ الإجمالي (درهم)",
    type: "نوع المعاملة",
    typeGiven: "كنسال (سلف ممنوح)",
    typeOwed: "كيسالوني (دين واجب السداد)",
    notes: "ملاحظات وتفاصيل إضافية",
    whatsAppTitle: "إرسال رسالة عبر الواتساب",
    chooseTemplate: "اختر صيغة الرسالة المناسبة :",
    messagePreview: "معاينة وتعديل نص الرسالة :",
    openWhatsApp: "فتح الواتساب",
    phoneRequired: "يرجى كتابة رقم الهاتف.",
    save: "حفظ",
    createdSuccess: "تم تسجيل المعاملة بنجاح",
    updatedSuccess: "تم تحديث البيانات",
    deletedSuccess: "تم حذف المعاملة",
    repaySuccess: "تم تسجيل الدفعة بنجاح",
  },
} satisfies Record<FloussyLocale, Record<string, any>>;

export default function DebtsPage() {
  const [debts, setDebts] = useState<DebtOut[]>([]);
  const [currency, setCurrency] = useState("DH");
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"ALL" | "GIVEN" | "OWED" | "SETTLED">("ALL");
  const [locale, setLocale] = useState<FloussyLocale>("fr");

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtOut | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<DebtOut | null>(null);
  const [repayingDebt, setRepayingDebt] = useState<DebtOut | null>(null);
  const [whatsAppDebt, setWhatsAppDebt] = useState<DebtOut | null>(null);

  // Form inputs
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formIsLoanGiven, setFormIsLoanGiven] = useState(true);
  const [formDueDate, setFormDueDate] = useState("");
  const [formNote, setFormNote] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WhatsApp template state
  const [waPhone, setWaPhone] = useState("");
  const [waTemplateIdx, setWaTemplateIdx] = useState(0);
  const [waCustomMessage, setWaCustomMessage] = useState("");

  const { toast } = useToast();
  const dir = getLocaleDirection(locale);
  const copy = DEBTS_COPY[locale] || DEBTS_COPY.fr;

  const cockpitRef = useRef<HTMLDivElement | null>(null);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const hasActiveDebt = debts.some(
    (d) => parseFloat(d.paid_amount) < parseFloat(d.total_amount)
  );
  const { tour } = usePageTour("debts", {
    cockpit: { ref: cockpitRef },
    filters: { ref: filtersRef },
    card: { ref: cardRef },
    ...(hasActiveDebt
      ? { whatsapp: { selector: '[data-tour="debt-whatsapp"]' } }
      : {}),
  });

  useEffect(() => {
    const active = getBrowserLocalePreference();
    if (active === "fr" || active === "en" || active === "ar") {
      setLocale(active);
    }
    const onLocaleChanged = () => {
      const next = getBrowserLocalePreference();
      if (next === "fr" || next === "en" || next === "ar") {
        setLocale(next);
      }
    };
    window.addEventListener(LANGUAGE_CHANGED_EVENT, onLocaleChanged);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, onLocaleChanged);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [debtsRes, settingsRes] = await Promise.all([
        apiFetch<DebtOut[]>("/debts"),
        apiFetch<SettingsResponse>("/users/me/settings").catch(() => null),
      ]);
      setDebts(debtsRes);
      if (settingsRes?.currency) {
        setCurrency(settingsRes.currency);
      }
    } catch (err: any) {
      toast({
        variant: "danger",
        title: "Erreur",
        description: getIssueDisplay(err?.message || "Erreur de chargement", locale)?.description || err?.message || "Erreur",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatMoney = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return `${(isNaN(num) ? 0 : num).toLocaleString(LOCALE_TO_BCP47[locale], {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  // Calculations
  const totalGiven = useMemo(() => {
    return debts
      .filter((d) => d.is_loan_given && parseFloat(d.paid_amount) < parseFloat(d.total_amount))
      .reduce((sum, d) => sum + Math.max(0, parseFloat(d.total_amount) - parseFloat(d.paid_amount)), 0);
  }, [debts]);

  const totalOwed = useMemo(() => {
    return debts
      .filter((d) => !d.is_loan_given && parseFloat(d.paid_amount) < parseFloat(d.total_amount))
      .reduce((sum, d) => sum + Math.max(0, parseFloat(d.total_amount) - parseFloat(d.paid_amount)), 0);
  }, [debts]);

  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      const isSettled = parseFloat(d.paid_amount) >= parseFloat(d.total_amount);
      if (filterType === "GIVEN") return d.is_loan_given && !isSettled;
      if (filterType === "OWED") return !d.is_loan_given && !isSettled;
      if (filterType === "SETTLED") return isSettled;
      return true;
    });
  }, [debts, filterType]);

  // WhatsApp templates generator
  const getWhatsAppTemplates = (debt: DebtOut) => {
    const name = debt.contact_name;
    const remaining = Math.max(0, parseFloat(debt.total_amount) - parseFloat(debt.paid_amount));
    const amountStr = formatMoney(remaining);
    const dateStr = debt.due_date || new Date().toISOString().split("T")[0];

    if (!debt.is_loan_given) {
      // كيسالوني (Je dois de l'argent)
      return [
        {
          label: "📅 " + (locale === "ar" ? "تأكيد موعد السداد" : "Engagement avec date"),
          text: `السلام عليكم ${name}، غير بغيت نأكد معاك بلي المبلغ ديال ${amountStr} راه غادي نرجعهولك إن شاء الله فـ ${dateStr}. شكراً بزاف على صبرك.`,
        },
        {
          label: "🤝 " + (locale === "ar" ? "رسالة طمأنة أخوية" : "Rassurance amicale"),
          text: `السلام عليكم ${name}، إن شاء الله المبلغ ديال ${amountStr} غادي يكون عندك فالموعد المحدد (${dateStr}). الله يجازيك بالخير على وقفتك معايا.`,
        },
        {
          label: "⚡ " + (locale === "ar" ? "تسوية قريبة" : "Règlement rapide"),
          text: `السلام عليكم ${name}، بخصوص المبلغ ديال ${amountStr}، إن شاء الله قبل ${dateStr} غادي نسويه معاك كامل. تحياتي.`,
        },
        {
          label: "🇫🇷 Français",
          text: `Salam ${name}, je te confirme que je te rembourserai les ${amountStr} le ${dateStr} inchallah. Merci beaucoup pour ta patience !`,
        },
      ];
    } else {
      // كنسال (On me doit de l'argent)
      return [
        {
          label: "🌸 " + (locale === "ar" ? "تذكير لطيف وودي" : "Rappel amical doux"),
          text: `السلام عليكم ${name}، كنتمنى تكون بخير. غير تذكير لطيف بخصوص سلف ديال ${amountStr} لي كنا تفاهمنا عليه فـ ${dateStr}. شكراً ليك.`,
        },
        {
          label: "💬 " + (locale === "ar" ? "استفسار أخوي" : "Demande de nouvelles"),
          text: `السلام عليكم أخي ${name}، عفاك واش كاين شي جديد بخصوص المبلغ ديال ${amountStr} المتفق عليه ؟ شكراً بزاف.`,
        },
        {
          label: "📊 " + (locale === "ar" ? "تذكير لضبط الحسابات" : "Clôture de compte"),
          text: `السلام عليكم ${name}، الله يحفظك غير بغيت نفكرك فـ ${amountStr} المتبقية باش نقاد الحسابات ديالي. شكراً على تفهمك.`,
        },
        {
          label: "🇫🇷 Français",
          text: `Salam ${name}, j'espère que tu vas bien. Petit rappel amical concernant les ${amountStr} prévus pour le ${dateStr}. Merci d'avance !`,
        },
      ];
    }
  };

  const openWhatsAppModal = (debt: DebtOut) => {
    setWhatsAppDebt(debt);
    setWaPhone(debt.contact_phone || "");
    const tmpls = getWhatsAppTemplates(debt);
    setWaTemplateIdx(0);
    setWaCustomMessage(tmpls[0].text);
  };

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(formAmount);
    if (!formName.trim() || isNaN(total) || total <= 0) return;

    setIsSubmitting(true);
    try {
      const payload: DebtCreateIn = {
        contact_name: formName.trim(),
        contact_phone: formPhone.trim() || null,
        total_amount: total,
        paid_amount: 0,
        is_loan_given: formIsLoanGiven,
        due_date: formDueDate || null,
        note: formNote.trim() || null,
      };
      const created = await apiFetch<DebtOut>("/debts", {
        method: "POST",
        body: payload,
      });
      setDebts((prev) => [created, ...prev]);
      setIsAddOpen(false);
      resetForm();
      toast({ variant: "success", title: copy.createdSuccess });
    } catch (err: any) {
      toast({ variant: "danger", title: "Erreur", description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;
    const total = parseFloat(formAmount);
    if (!formName.trim() || isNaN(total) || total <= 0) return;

    setIsSubmitting(true);
    try {
      const payload: DebtUpdateIn = {
        contact_name: formName.trim(),
        contact_phone: formPhone.trim() || null,
        total_amount: total,
        is_loan_given: formIsLoanGiven,
        due_date: formDueDate || null,
        note: formNote.trim() || null,
      };
      const updated = await apiFetch<DebtOut>(`/debts/${editingDebt.id}`, {
        method: "PATCH",
        body: payload,
      });
      setDebts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setEditingDebt(null);
      resetForm();
      toast({ variant: "success", title: copy.updatedSuccess });
    } catch (err: any) {
      toast({ variant: "danger", title: "Erreur", description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDebt = async () => {
    if (!deletingDebt) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/debts/${deletingDebt.id}`, { method: "DELETE" });
      setDebts((prev) => prev.filter((d) => d.id !== deletingDebt.id));
      setDeletingDebt(null);
      toast({ variant: "success", title: copy.deletedSuccess });
    } catch (err: any) {
      toast({ variant: "danger", title: "Erreur", description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayingDebt) return;
    const amount = parseFloat(repayAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsSubmitting(true);
    try {
      const payload: DebtRepayIn = { amount };
      const updated = await apiFetch<DebtOut>(`/debts/${repayingDebt.id}/repay`, {
        method: "POST",
        body: payload,
      });
      setDebts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setRepayingDebt(null);
      setRepayAmount("");
      toast({ variant: "success", title: copy.repaySuccess });
    } catch (err: any) {
      toast({ variant: "danger", title: "Erreur", description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormAmount("");
    setFormIsLoanGiven(true);
    setFormDueDate(new Date().toISOString().split("T")[0]);
    setFormNote("");
  };

  const openEditModal = (debt: DebtOut) => {
    setEditingDebt(debt);
    setFormName(debt.contact_name);
    setFormPhone(debt.contact_phone || "");
    setFormAmount(debt.total_amount);
    setFormIsLoanGiven(debt.is_loan_given);
    setFormDueDate(debt.due_date || "");
    setFormNote(debt.note || "");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 pt-4" dir={dir}>
      <PageTour tour={tour} />
      {/* 🌟 1. Header / Cockpit Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 shadow-[var(--shadow-soft)] backdrop-blur-xl dark:border-emerald-500/20 dark:bg-gradient-to-br dark:from-emerald-950/40 dark:via-slate-900/60 dark:to-slate-950">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <HandCoins className="h-3.5 w-3.5" />
              <span>{copy.heroTitle}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--ink)]">
              {copy.heroTitle}
            </h1>
            <p className="text-sm text-[var(--muted)] max-w-xl">{copy.heroDescription}</p>
          </div>

          <Button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="self-start md:self-auto gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/20 rounded-xl px-5 py-2.5"
          >
            <Plus className="h-4 w-4" />
            <span>{copy.addDebt}</span>
          </Button>
        </div>

        {/* Totals Cockpit Grid */}
        <div ref={cockpitRef} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Total À Récupérer */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 transition-all hover:border-emerald-300 dark:border-emerald-500/20 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <ArrowDownLeft className="h-4 w-4" />
                {copy.totalGiven}
              </span>
              <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold">
                {debts.filter((d) => d.is_loan_given && parseFloat(d.paid_amount) < parseFloat(d.total_amount)).length} actif(s)
              </span>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
              {formatMoney(totalGiven)}
            </div>
          </div>

          {/* Total À Rembourser */}
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/60 p-4 transition-all hover:border-rose-300 dark:border-rose-500/20 dark:bg-rose-950/20">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-700 dark:text-rose-400">
              <span className="flex items-center gap-1.5">
                <ArrowUpRight className="h-4 w-4" />
                {copy.totalOwed}
              </span>
              <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold">
                {debts.filter((d) => !d.is_loan_given && parseFloat(d.paid_amount) < parseFloat(d.total_amount)).length} actif(s)
              </span>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-rose-700 dark:text-rose-300">
              {formatMoney(totalOwed)}
            </div>
          </div>

          {/* Solde Net */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 transition-all hover:border-[var(--border)] dark:border-slate-700/50 dark:bg-slate-900/40 sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4" />
                {copy.netBalance}
              </span>
            </div>
            <div
              className={`mt-2 text-2xl font-black tracking-tight ${
                totalGiven - totalOwed >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatMoney(totalGiven - totalOwed)}
            </div>
          </div>
        </div>
      </div>

      {/* 🗂️ 2. Filters */}
      <div ref={filtersRef} className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "ALL", label: copy.all },
            { key: "GIVEN", label: copy.given },
            { key: "OWED", label: copy.owed },
            { key: "SETTLED", label: copy.settled },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              filterType === f.key
                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-sm"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--ink)]/30 hover:text-[var(--ink)] dark:bg-slate-900/60 dark:text-[var(--muted)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 📋 3. Debts Grid List */}
      {loading ? (
        <div className="py-20 text-center text-sm text-[var(--muted)]">Chargement...</div>
      ) : filteredDebts.length === 0 ? (
        <EmptyState
          title={copy.noDebtsTitle}
          description={copy.noDebtsDescription}
          action={
            <Button
              onClick={() => {
                resetForm();
                setIsAddOpen(true);
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
            >
              <Plus className="h-4 w-4" />
              <span>{copy.addDebt}</span>
            </Button>
          }
        />
      ) : (
        <div ref={cardRef} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredDebts.map((debt, debtIndex) => {
            const total = parseFloat(debt.total_amount) || 0;
            const paid = parseFloat(debt.paid_amount) || 0;
            const remaining = Math.max(0, total - paid);
            const isSettled = paid >= total;
            const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

            return (
              <div
                key={debt.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] transition-all hover:border-[var(--border)] hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-slate-700"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          debt.is_loan_given
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {debt.is_loan_given ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--ink)] text-base leading-snug">
                          {debt.contact_name}
                        </h3>
                        <p className="text-xs text-[var(--muted)] line-clamp-1">
                          {debt.note ||
                            (debt.is_loan_given ? copy.typeGiven : copy.typeOwed)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {isSettled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {copy.settled}
                        </span>
                      ) : (
                        <div>
                          <div className="text-xs text-[var(--muted)]">{copy.remaining}</div>
                          <div
                            className={`text-base font-black ${
                              debt.is_loan_given ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {formatMoney(remaining)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Due Date & Phone */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                    {debt.due_date && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-2)] px-2.5 py-1 border border-[var(--border)] dark:border-transparent dark:bg-slate-800/60 text-[var(--ink)]">
                        <Calendar className="h-3.5 w-3.5 text-[var(--muted)]" />
                        {copy.dueDate} : {debt.due_date}
                      </span>
                    )}
                    {debt.contact_phone && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-2)] px-2.5 py-1 border border-[var(--border)] dark:border-transparent dark:bg-slate-800/60 text-[var(--ink)]">
                        <Phone className="h-3.5 w-3.5 text-emerald-500" />
                        {debt.contact_phone}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-medium text-[var(--muted)]">
                      <span>
                        {copy.paid} : {formatMoney(paid)} / {formatMoney(total)}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)] dark:bg-slate-800">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isSettled
                            ? "bg-emerald-500"
                            : debt.is_loan_given
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-3 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    {!isSettled && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setRepayingDebt(debt);
                          setRepayAmount("");
                        }}
                        className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3"
                      >
                        {copy.repay}
                      </Button>
                    )}

                    {/* WhatsApp Action */}
                    {!isSettled && (
                      <Button
                        size="sm"
                        variant="secondary"
                        data-tour={debtIndex === 0 ? "debt-whatsapp" : undefined}
                        onClick={() => openWhatsAppModal(debt)}
                        className="h-8 gap-1.5 rounded-lg border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold px-3"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(debt)}
                      className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] dark:hover:bg-slate-800"
                      title={copy.edit}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingDebt(debt)}
                      className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                      title={copy.delete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ➕ Add / Edit Debt Dialog */}
      <Dialog
        open={isAddOpen || !!editingDebt}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingDebt(null);
          }
        }}
      >
        <DialogContent className="max-w-md bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[var(--ink)]">{editingDebt ? copy.editTitle : copy.addDebt}</DialogTitle>
            <DialogDescription className="text-[var(--muted)]">
              {copy.heroDescription}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editingDebt ? handleUpdateDebt : handleCreateDebt} className="space-y-4">
            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--ink)] font-semibold">{copy.type}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormIsLoanGiven(true)}
                  className={`rounded-xl border p-2.5 text-xs font-bold transition-all text-center ${
                    formIsLoanGiven
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--ink)]/30 hover:text-[var(--ink)]"
                  }`}
                >
                  {copy.typeGiven}
                </button>
                <button
                  type="button"
                  onClick={() => setFormIsLoanGiven(false)}
                  className={`rounded-xl border p-2.5 text-xs font-bold transition-all text-center ${
                    !formIsLoanGiven
                      ? "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-400"
                      : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--ink)]/30 hover:text-[var(--ink)]"
                  }`}
                >
                  {copy.typeOwed}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact_name" className="text-xs text-[var(--ink)] font-semibold">
                {copy.contactName} *
              </Label>
              <Input
                id="contact_name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Omar, Youssef, Épicerie..."
                className="bg-[var(--surface-2)] border-[var(--border)] text-[var(--ink)] rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="total_amount" className="text-xs text-[var(--ink)] font-semibold">
                  {copy.totalAmount} *
                </Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="500"
                  className="bg-[var(--surface-2)] border-[var(--border)] text-[var(--ink)] rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="due_date" className="text-xs text-[var(--ink)] font-semibold">
                  {copy.dueDate}
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="bg-[var(--surface-2)] border-[var(--border)] text-[var(--ink)] rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact_phone" className="text-xs text-[var(--ink)] font-semibold">
                {copy.contactPhone}
              </Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+212 6..."
                className="bg-[var(--surface-2)] border-[var(--border)] text-[var(--ink)] rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note" className="text-xs text-[var(--ink)] font-semibold">
                {copy.notes}
              </Label>
              <Input
                id="note"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Motif, détails..."
                className="bg-[var(--surface-2)] border-[var(--border)] text-[var(--ink)] rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingDebt(null);
                }}
                className="rounded-xl border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
              >
                {copy.cancel}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {copy.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 💵 Repayment Dialog */}
      <Dialog open={!!repayingDebt} onOpenChange={(open) => !open && setRepayingDebt(null)}>
        <DialogContent className="max-w-md bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[var(--ink)]">{copy.repayTitle}</DialogTitle>
            <DialogDescription className="text-[var(--muted)]">
              {repayingDebt && (
                <span>
                  {copy.contactName} : <strong>{repayingDebt.contact_name}</strong> — Solde restant :{" "}
                  <strong>
                    {formatMoney(
                      Math.max(
                        0,
                        parseFloat(repayingDebt.total_amount) - parseFloat(repayingDebt.paid_amount)
                      )
                    )}
                  </strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRepayDebt} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="repay_amount" className="text-xs text-[var(--ink)] font-semibold">
                {copy.amount} (DH) *
              </Label>
              <Input
                id="repay_amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder="Ex: 200"
                className="bg-[var(--surface-2)] border-[var(--border)] text-[var(--ink)] rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRepayingDebt(null)}
                className="rounded-xl border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
              >
                {copy.cancel}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {copy.confirm}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 💬 WhatsApp Message Templates Dialog */}
      <Dialog open={!!whatsAppDebt} onOpenChange={(open) => !open && setWhatsAppDebt(null)}>
        <DialogContent className="max-w-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--ink)]">
              <MessageCircle className="h-5 w-5 text-emerald-500" />
              <span>{copy.whatsAppTitle}</span>
            </DialogTitle>
            <DialogDescription className="text-[var(--muted)]">
              {whatsAppDebt && (
                <span>
                  Pour <strong>{whatsAppDebt.contact_name}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {whatsAppDebt && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="wa_phone" className="text-xs text-[var(--ink)] font-semibold">
                  {copy.contactPhone}
                </Label>
                <Input
                  id="wa_phone"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="+212 6..."
                  className="bg-[var(--surface-2)] border-[var(--border)] text-[var(--ink)] rounded-xl"
                />
              </div>

              {/* Template Choices */}
              <div className="space-y-2">
                <Label className="text-xs text-[var(--ink)] font-semibold">{copy.chooseTemplate}</Label>
                <div className="grid grid-cols-1 gap-2">
                  {getWhatsAppTemplates(whatsAppDebt).map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setWaTemplateIdx(idx);
                        setWaCustomMessage(tmpl.text);
                      }}
                      className={`rounded-xl border p-2.5 text-left text-xs font-medium transition-all ${
                        waTemplateIdx === idx
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm"
                          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--ink)]/30 hover:text-[var(--ink)]"
                      }`}
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Message Preview */}
              <div className="space-y-1.5">
                <Label htmlFor="wa_message" className="text-xs text-[var(--ink)] font-semibold">
                  {copy.messagePreview}
                </Label>
                <textarea
                  id="wa_message"
                  rows={4}
                  value={waCustomMessage}
                  onChange={(e) => setWaCustomMessage(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setWhatsAppDebt(null)}
                  className="rounded-xl border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
                >
                  {copy.cancel}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const cleanPhone = waPhone.trim().replace(/\s+/g, "").replace(/-/g, "");
                    if (!cleanPhone) {
                      toast({ variant: "danger", title: copy.phoneRequired });
                      return;
                    }
                    const formatted = cleanPhone.startsWith("0") && cleanPhone.length === 10
                      ? "212" + cleanPhone.substring(1)
                      : cleanPhone.replace("+", "");
                    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(
                      formatted
                    )}&text=${encodeURIComponent(waCustomMessage)}`;
                    window.open(url, "_blank");
                    setWhatsAppDebt(null);
                  }}
                  className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  <Send className="h-4 w-4" />
                  <span>{copy.openWhatsApp}</span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 🗑️ Delete Confirmation Dialog */}
      <Dialog open={!!deletingDebt} onOpenChange={(open) => !open && setDeletingDebt(null)}>
        <DialogContent className="max-w-md bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[var(--ink)]">{copy.deleteTitle}</DialogTitle>
            <DialogDescription className="text-[var(--muted)]">
              {copy.deleteDescription} (<strong>{deletingDebt?.contact_name}</strong>)
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDeletingDebt(null)}
              className="rounded-xl border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
            >
              {copy.cancel}
            </Button>
            <Button
              variant="danger"
              disabled={isSubmitting}
              onClick={handleDeleteDebt}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              {copy.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
