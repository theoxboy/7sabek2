"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Mic,
  ArrowRight,
  Globe,
  Flame,
  Bell,
  Plus,
  Check,
} from "lucide-react";

import type { AuthUser } from "@/lib/auth";
import type { FloussyLocale } from "@/lib/localePreference";
import { openLanguagePicker } from "@/components/i18n/LanguagePreferenceGate";
import { useQuickTx } from "@/state/QuickTxContext";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api";
import type { TransactionOut } from "@/lib/types";

export interface AppTopHeaderNotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "neutral" | "warning" | "danger" | "success";
  icon: any;
  meta?: string;
  onSelect?: () => void;
  dismissible?: boolean;
}

export interface AppTopHeaderProps {
  user: AuthUser | null;
  locale: FloussyLocale;
  streakDays?: number | null;
  notifications: AppTopHeaderNotificationItem[];
  unreadCount: number;
  readNotificationIds: string[];
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  onOpenMobileNav?: () => void;
}

const getLocalTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const AppTopHeader: React.FC<AppTopHeaderProps> = ({
  user,
  locale,
  streakDays = 1,
  notifications,
  unreadCount,
  readNotificationIds,
  markAllNotificationsRead,
  markNotificationRead,
  onOpenMobileNav,
}) => {
  const effectiveStreakDays = typeof streakDays === "number" ? streakDays : 1;
  const router = useRouter();
  const { toast } = useToast();
  const { openQuickTx } = useQuickTx();

  const isRTL = locale === "ar";
  const isGuest = Boolean(user?.is_guest);

  const [omarText, setOmarText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guestTries, setGuestTries] = useState(3);
  const [omarReply, setOmarReply] = useState<string | null>(null);
  const [lastOmarTxId, setLastOmarTxId] = useState<string | null>(null);

  const [streakOpen, setStreakOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Load guest tries from localStorage
  useEffect(() => {
    if (!isGuest) return;
    try {
      const stored = localStorage.getItem("floussy.guest_omar_tries");
      if (stored !== null) {
        setGuestTries(Math.max(0, parseInt(stored, 10) || 0));
      }
    } catch {}
  }, [isGuest]);

  // Click outside to close open menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (streakOpen && streakRef.current && !streakRef.current.contains(target)) {
        setStreakOpen(false);
      }
      if (notificationsOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (addMenuOpen && addMenuRef.current && !addMenuRef.current.contains(target)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [streakOpen, notificationsOpen, addMenuOpen]);

  // Global Keyboard shortcuts:
  // [N]: opens quick add menu / modal
  // [O]: focuses Ba Omar input field
  // [Escape]: closes dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStreakOpen(false);
        setNotificationsOpen(false);
        setAddMenuOpen(false);
        return;
      }

      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isEditing =
        ["input", "textarea", "select"].includes(activeTag) ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isEditing) return;

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setAddMenuOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === "o") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Submit Ba Omar text
  const handleAskOmar = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = omarText.trim();
    if (!query) return;

    if (isGuest && guestTries <= 0) {
      toast({
        title: locale === "ar" ? "وضع الاكتشاف" : "Mode Découverte",
        description:
          locale === "ar"
            ? "سجل حسابك مجاناً للاستفادة الكاملة من با عمر."
            : "Crée un compte gratuit pour utiliser Ba Omar en illimité.",
      });
      return;
    }

    if (isGuest) {
      setGuestTries((prev) => {
        const next = Math.max(0, prev - 1);
        try {
          localStorage.setItem("floussy.guest_omar_tries", String(next));
        } catch {}
        return next;
      });
    }

    // Smart expense parsing e.g. "150 courses" or "khsert 150 f lmarche"
    const matchAmount = query.match(/(\d+[\d\s,.]*)/);
    if (matchAmount) {
      const parsedAmt =
        parseFloat(matchAmount[1].replace(/\s+/g, "").replace(",", ".")) || 0;
      if (parsedAmt > 0) {
        try {
          setIsSubmitting(true);
          const res = await apiFetch<TransactionOut>("/transactions", {
            method: "POST",
            body: {
              amount: parsedAmt.toFixed(2),
              type: "expense",
              occurred_on: getLocalTodayISO(),
              description: query,
            },
          });
          setLastOmarTxId(res.id);
          const formattedAmt = parsedAmt.toLocaleString("fr-FR", {
            maximumFractionDigits: 2,
          });
          const replyText =
            locale === "ar"
              ? `با عمر: قيدت ${formattedAmt} درهم فـ المصاريف ديالك. تم تحديث الحسابات مباشرة.`
              : `Ba Omar : c’est noté, ${formattedAmt} MAD enregistrés dans tes dépenses.`;
          setOmarReply(replyText);
          toast({
            title: locale === "ar" ? "عملية مسجلة من با عمر" : "Dépense enregistrée",
            description: `${formattedAmt} MAD`,
            variant: "success",
          });
          setOmarText("");
          window.dispatchEvent(new CustomEvent("floussy:data-updated"));
          return;
        } catch (err: any) {
          toast({
            title: locale === "ar" ? "خطأ" : "Erreur",
            description:
              err?.message ||
              (locale === "ar"
                ? "تعذر تسجيل العملية"
                : "Impossible d'enregistrer la dépense"),
            variant: "danger",
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    }

    // Conversational question or advice: navigate to Ba Omar AI chat
    setOmarText("");
    router.push(`/chat?q=${encodeURIComponent(query)}`);
  };

  // Undo transaction created by Ba Omar
  const handleUndoOmar = async () => {
    if (!lastOmarTxId) return;
    try {
      await apiFetch(`/transactions/${lastOmarTxId}`, { method: "DELETE" });
      toast({
        title: locale === "ar" ? "تم التراجع" : "Annulé",
        description:
          locale === "ar"
            ? "تم حذف العملية بنجاح."
            : "La dépense a bien été annulée.",
        variant: "success",
      });
      setLastOmarTxId(null);
      setOmarReply(null);
      window.dispatchEvent(new CustomEvent("floussy:data-updated"));
    } catch {
      toast({
        title: locale === "ar" ? "خطأ" : "Erreur",
        description:
          locale === "ar" ? "تعذر التراجع عن العملية." : "Impossible d'annuler.",
        variant: "danger",
      });
    }
  };

  const userInitial = isGuest
    ? "I"
    : user?.first_name?.[0]?.toUpperCase() ||
      user?.email?.[0]?.toUpperCase() ||
      "O";

  return (
    <div style={{ width: "100%" }}>
      <header className="dsh-hdr">
        {/* Mobile Hamburger button */}
        <button
          type="button"
          onClick={() => {
            if (onOpenMobileNav) onOpenMobileNav();
            else
              window.dispatchEvent(new CustomEvent("floussy:open-mobile-nav"));
          }}
          className="flex lg:hidden items-center justify-center p-2 rounded-xl text-[var(--dsh-ink)] hover:bg-[var(--dsh-soft)] border border-[var(--dsh-line)]"
          aria-label={locale === "ar" ? "القائمة" : "Ouvrir le menu"}
        >
          <Menu size={20} />
        </button>

        {/* Ba Omar smart prompt bar */}
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
            title="Ba Omar [O]"
          >
            ع
          </span>

          <input
            ref={inputRef}
            value={omarText}
            onChange={(e) => setOmarText(e.target.value)}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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

        {/* Action icons & buttons */}
        <div className="dsh-act">
          {/* Quick Language Selector */}
          <button
            type="button"
            onClick={openLanguagePicker}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              border: "1px solid var(--dsh-line)",
              background: "var(--dsh-card)",
              color: "var(--dsh-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}
            title="Langue / اللغة"
            aria-label="Changer de langue"
          >
            <Globe size={18} />
          </button>

          {/* Guest Mode Pill */}
          {isGuest ? (
            <Link
              href="/register"
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
                textDecoration: "none",
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
            </Link>
          ) : (
            <>
              {/* Streak Flame Popover */}
              <div ref={streakRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setStreakOpen(!streakOpen);
                    setNotificationsOpen(false);
                    setAddMenuOpen(false);
                  }}
                  style={{
                    height: 40,
                    padding: "0 12px",
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
                    border: "1px solid var(--dsh-line)",
                  }}
                >
                  <Flame size={18} color="#E8590C" fill="#E8590C" />
                  {effectiveStreakDays}
                </button>

                {streakOpen && (
                  <div
                    role="dialog"
                    style={{
                      position: "absolute",
                      top: 48,
                      [isRTL ? "left" : "right"]: 0,
                      zIndex: 50,
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
                        ? `${effectiveStreakDays} يوم متتالية من التتبع`
                        : `${effectiveStreakDays} jour${
                            effectiveStreakDays > 1 ? "s" : ""
                          } de suivi d’affilée`}
                    </b>
                    <span
                      style={{
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: "var(--dsh-muted)",
                      }}
                    >
                      {locale === "ar"
                        ? "سجّل مصاريفك بانتظام كل نهار باش تحافظ على الترتيب ديالك فـ 7sabek."
                        : "Suis tes dépenses au quotidien pour maintenir ta série active."}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          setStreakOpen(false);
                          openQuickTx("expense");
                        }}
                        style={{
                          flex: 1,
                          height: 38,
                          border: 0,
                          borderRadius: 10,
                          background: "#0A7A53",
                          color: "#FFFFFF",
                          fontWeight: 800,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {locale === "ar" ? "تقييد مصروف" : "Saisir dépenses"}
                      </button>
                      <Link
                        href="/gamification"
                        onClick={() => setStreakOpen(false)}
                        style={{
                          height: 38,
                          padding: "0 12px",
                          borderRadius: 10,
                          border: "1px solid var(--dsh-line)",
                          background: "var(--dsh-soft)",
                          color: "var(--dsh-ink)",
                          fontWeight: 700,
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          textDecoration: "none",
                        }}
                      >
                        {locale === "ar" ? "الترتيب" : "Ranking"}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Real Notifications Bell */}
              <div ref={notifRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setStreakOpen(false);
                    setAddMenuOpen(false);
                  }}
                  style={{
                    position: "relative",
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    background: "var(--dsh-card)",
                    color: "var(--dsh-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    border: "1px solid var(--dsh-line)",
                  }}
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
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
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    role="dialog"
                    style={{
                      position: "absolute",
                      top: 50,
                      [isRTL ? "left" : "right"]: 0,
                      zIndex: 50,
                      width: 350,
                      maxWidth: "calc(100vw - 32px)",
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
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--dsh-line)",
                      }}
                    >
                      <b style={{ fontSize: 14 }}>
                        {locale === "ar" ? "الإشعارات" : "Notifications"}
                      </b>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          style={{
                            border: 0,
                            background: "transparent",
                            color: "#0A7A53",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {locale === "ar" ? "قراءة الكل" : "Tout marquer lu"}
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: 340, overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <div
                          style={{
                            padding: "24px 12px",
                            textAlign: "center",
                            fontSize: 13,
                            color: "var(--dsh-muted)",
                          }}
                        >
                          {locale === "ar"
                            ? "الميزانية ديالك مضبوطة، ما كاين حتى إشعار."
                            : "Ton budget est à jour, aucune alerte."}
                        </div>
                      ) : (
                        notifications.map((nt) => {
                          const isUnread = !readNotificationIds.includes(nt.id);
                          return (
                            <div
                              key={nt.id}
                              style={{
                                padding: 12,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                borderBottom: "1px solid var(--dsh-line)",
                                background: isUnread
                                  ? "rgba(10, 122, 83, 0.04)"
                                  : "transparent",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 8,
                                }}
                              >
                                {isUnread && (
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: 3,
                                      background: "#0A7A53",
                                      marginTop: 6,
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <span
                                  style={{
                                    fontSize: 13.5,
                                    lineHeight: 1.4,
                                    flex: 1,
                                  }}
                                >
                                  <b>{nt.title}</b> — {nt.description}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    markNotificationRead(nt.id);
                                    setNotificationsOpen(false);
                                    if (nt.onSelect) nt.onSelect();
                                    else if (nt.href) router.push(nt.href);
                                  }}
                                  style={{
                                    height: 30,
                                    padding: "0 12px",
                                    border: 0,
                                    borderRadius: 8,
                                    background: "#0A7A53",
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  {locale === "ar" ? "رؤية" : "Consulter"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markNotificationRead(nt.id)}
                                  style={{
                                    height: 30,
                                    padding: "0 12px",
                                    border: 0,
                                    borderRadius: 8,
                                    background: "var(--dsh-soft)",
                                    color: "var(--dsh-ink)",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  {locale === "ar" ? "تجاهل" : "Ignorer"}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid var(--dsh-line)",
                        textAlign: "center",
                      }}
                    >
                      <Link
                        href="/notifications"
                        onClick={() => setNotificationsOpen(false)}
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#0A7A53",
                          textDecoration: "none",
                        }}
                      >
                        {locale === "ar"
                          ? "مركز الإشعارات الكامل →"
                          : "Centre de notifications →"}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Quick Add Button: "+ Ajouter [N]" */}
          <div ref={addMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setAddMenuOpen(!addMenuOpen);
                setStreakOpen(false);
                setNotificationsOpen(false);
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
                  zIndex: 50,
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
                    openQuickTx("expense");
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
                    openQuickTx("income");
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

          {/* User Avatar Circle */}
          <Link
            href="/settings"
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
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
            title={user?.email || "Compte"}
          >
            {userInitial}
          </Link>
        </div>
      </header>

      {/* Ba Omar feedback banner if a quick transaction or reply occurred */}
      {omarReply && (
        <div
          role="status"
          style={{
            margin: "12px 16px 0",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
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
              background: "#0A7A53",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            ع
          </span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
            <b>Ba Omar :</b> {omarReply}
          </span>
          {lastOmarTxId && (
            <button
              type="button"
              onClick={handleUndoOmar}
              style={{
                padding: "6px 14px",
                border: 0,
                borderRadius: 10,
                background: "#FFFFFF",
                color: "#0F1A16",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {locale === "ar" ? "تراجع" : "Annuler"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOmarReply(null)}
            style={{
              padding: "6px 10px",
              border: 0,
              background: "transparent",
              color: "var(--dsh-brand-ink)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
