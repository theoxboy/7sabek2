"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Mail,
  Phone,
  Clock,
  User,
  Calendar,
  ChevronRight,
  HelpCircle,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";

type ContactMessageOut = {
  id: number;
  created_at: string;
  full_name: string;
  contact_info: string;
  subject: string;
  message: string;
  ticket_ref: string;
  matched_user_id?: string | null;
};

const COPY: Record<
  FloussyLocale,
  {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    ticketRef: string;
    date: string;
    subject: string;
    sender: string;
    contact: string;
    message: string;
    empty: string;
    detailsTitle: string;
    loading: string;
    loadError: string;
    close: string;
    badgeAccountExists: string;
    manageAccount: string;
    accountExistsInfo: string;
  }
> = {
  fr: {
    title: "Messages de Contact & Support",
    subtitle: "Consultez et suivez tous les messages envoyés par les visiteurs via le formulaire de contact.",
    searchPlaceholder: "Rechercher par nom, contact, sujet ou ticket...",
    ticketRef: "Référence",
    date: "Date de réception",
    subject: "Sujet",
    sender: "Expéditeur",
    contact: "Contact",
    message: "Message",
    empty: "Aucun message de contact trouvé.",
    detailsTitle: "Détails de la demande",
    loading: "Chargement des messages...",
    loadError: "Impossible de charger les messages.",
    close: "Fermer",
    badgeAccountExists: "Compte existant",
    manageAccount: "Gérer le compte",
    accountExistsInfo: "Cet expéditeur possède un compte utilisateur 7sabek.",
  },
  en: {
    title: "Contact & Support Messages",
    subtitle: "View and track all messages sent by visitors through the contact form.",
    searchPlaceholder: "Search by name, contact, subject or ticket...",
    ticketRef: "Reference",
    date: "Received date",
    subject: "Subject",
    sender: "Sender",
    contact: "Contact",
    message: "Message",
    empty: "No contact messages found.",
    detailsTitle: "Request Details",
    loading: "Loading messages...",
    loadError: "Unable to load messages.",
    close: "Close",
    badgeAccountExists: "Account exists",
    manageAccount: "Manage account",
    accountExistsInfo: "This sender has a 7sabek user account.",
  },
  ar: {
    title: "رسائل الاتصال والدعم",
    subtitle: "تتبع وشوف كاع الرسائل اللي تصيفطو من صفحة اتصل بنا.",
    searchPlaceholder: "بحث بالاسم، الاتصال، الموضوع أو التذكرة...",
    ticketRef: "المرجع",
    date: "تاريخ الاستلام",
    subject: "الموضوع",
    sender: "المرسل",
    contact: "الاتصال",
    message: "الرسالة",
    empty: "ما كاين حتى رسالة اتصال.",
    detailsTitle: "تفاصيل الطلب",
    loading: "جاري تحميل الرسائل...",
    loadError: "ما قدرناش نحملو الرسائل.",
    close: "إغلاق",
    badgeAccountExists: "عندو حساب",
    manageAccount: "تسيير الحساب",
    accountExistsInfo: "هاد المرسل عندو حساب مستخدم ف 7sabek.",
  },
};


export default function SuperAdminContactMessagesPage() {
  const { locale, dir } = useAppLocale();
  const copy = COPY[locale];
  useForceArabicDocumentFont(locale === "ar", "superadmin-contact-ar-body");

  const [messages, setMessages] = useState<ContactMessageOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessageOut | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ContactMessageOut[]>("/admin/contact-messages", {
        headers: { "x-admin-bypass": "true" },
      });
      setMessages(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : copy.loadError;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
  }, []);

  const filteredMessages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        m.contact_info.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q) ||
        m.ticket_ref.toLowerCase().includes(q)
    );
  }, [messages, search]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const isRTL = locale === "ar";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-10 text-[var(--ink)]" dir={dir}>
      <style jsx>{`
        .contact-messages-card {
          border-radius: 18px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: #fff;
          box-shadow: 0 12px 30px -24px rgba(0, 0, 0, 0.45);
        }
        .message-item {
          transition: all 0.2s ease;
        }
        .message-item:hover {
          background-color: #f8fafc;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
            <MessageSquare className="h-3.5 w-3.5" /> Contact & Support
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{copy.title}</h1>
          <p className="text-sm text-gray-500">{copy.subtitle}</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="contact-messages-card p-4">
        <div className="relative">
          <Search className={`pointer-events-none absolute ${isRTL ? "right-3" : "left-3"} top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400`} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className={isRTL ? "pr-9 pl-4" : "pl-9 pr-4"}
          />
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Messages list */}
      <Card className="contact-messages-card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            <svg className="animate-spin mx-auto mb-3 h-6 w-6 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {copy.loading}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 border border-dashed border-gray-200 m-4 rounded-xl">
            {copy.empty}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredMessages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className="w-full text-left message-item flex items-center justify-between p-4 sm:p-5 outline-none focus:bg-slate-50/50"
                style={{ textAlign: isRTL ? "right" : "left" }}
              >
                <div className="flex-1 min-w-0 pr-4 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-slate-900 text-sm sm:text-base">
                      {msg.full_name}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-mono">
                      {msg.ticket_ref}
                    </span>
                    {msg.matched_user_id && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-105 px-2 py-0.5 text-xs font-semibold text-emerald-750">
                        <User className="h-3 w-3" />
                        {copy.badgeAccountExists}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 ml-auto">
                      <Clock size={12} />
                      {formatDate(msg.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-emerald-600">{msg.subject}</span>
                    <span>·</span>
                    <span className="truncate">{msg.contact_info}</span>
                  </div>

                  <p className="text-sm text-slate-600 truncate mt-1">
                    {msg.message}
                  </p>
                </div>
                <ChevronRight className={`text-slate-400 shrink-0 h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Drawer / Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedMessage(null)}
          />
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-150 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <HelpCircle className="text-emerald-600" size={20} />
              {copy.detailsTitle}
            </h3>

            {selectedMessage.matched_user_id && (
              <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 p-3.5 text-xs text-emerald-900 leading-relaxed shadow-sm">
                <span className="font-semibold text-emerald-700 shrink-0">💡 Info :</span>
                <div>
                  {copy.accountExistsInfo}
                </div>
              </div>
            )}

            <div className="space-y-4 text-sm text-slate-800">
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-500">{copy.ticketRef}</span>
                <span className="col-span-2 font-mono font-bold text-slate-800">{selectedMessage.ticket_ref}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-500">{copy.sender}</span>
                <span className="col-span-2 font-medium flex items-center gap-1.5">
                  <User size={14} className="text-slate-450" />
                  {selectedMessage.full_name}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-500">{copy.contact}</span>
                <span className="col-span-2 flex items-center gap-1.5">
                  {selectedMessage.contact_info.includes("@") ? (
                    <Mail size={14} className="text-slate-450" />
                  ) : (
                    <Phone size={14} className="text-slate-450" />
                  )}
                  {selectedMessage.contact_info}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-500">{copy.date}</span>
                <span className="col-span-2 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-450" />
                  {formatDate(selectedMessage.created_at)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-500">{copy.subject}</span>
                <span className="col-span-2 font-medium text-emerald-700">{selectedMessage.subject}</span>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="font-semibold text-slate-500 block">{copy.message}</span>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-700 text-sm whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                  {selectedMessage.message}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center gap-3">
              {selectedMessage.matched_user_id ? (
                <Link
                  href={`/superadmin/users?id=${selectedMessage.matched_user_id}&q=${encodeURIComponent(selectedMessage.contact_info)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-750 px-4 py-2 text-sm font-semibold text-white transition shadow-sm"
                >
                  <User size={16} />
                  {copy.manageAccount}
                </Link>
              ) : (
                <div />
              )}
              <Button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                {copy.close}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
