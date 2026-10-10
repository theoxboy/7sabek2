"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Target,
  ChartBar,
  LayoutGrid,
  X,
  SlidersHorizontal,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Calendar,
  Lock,
  Flame,
  Bell,
  Settings,
  CircleHelp,
  ShieldCheck,
  FlaskConical,
  Scale,
  HandCoins,
} from "lucide-react";
import type { FloussyLocale } from "@/lib/localePreference";
import type { AuthUser } from "@/lib/auth";

interface AppBottomNavProps {
  user: AuthUser | null;
  locale: FloussyLocale;
  streakDays?: number | null;
}

export function AppBottomNav({ user, locale }: AppBottomNavProps) {
  const pathname = usePathname();
  const [isTablet, setIsTablet] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);

  const isRTL = locale === "ar";
  const isGuest = user?.is_guest;

  useEffect(() => {
    const checkViewport = () => {
      const w = window.innerWidth;
      setIsTablet(w >= 600 && w < 1024);
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // Labels i18n
  const t = {
    home: locale === "ar" ? "الرئيسية" : "Accueil",
    envelopes: locale === "ar" ? "الأظرفة" : "Enveloppes",
    transactions: locale === "ar" ? "المعاملات" : "Opérations",
    goals: locale === "ar" ? "الأهداف" : "Objectifs",
    reports: locale === "ar" ? "التقارير" : "Rapports",
    baOmar: locale === "ar" ? "با عمر" : "Ba Omar",
    plus: locale === "ar" ? "المزيد" : "Plus",
    allPages: locale === "ar" ? "جميع الصفحات" : "Toutes les pages",
    close: locale === "ar" ? "إغلاق" : "Fermer",
    soon: locale === "ar" ? "قريباً" : "Bientôt",
  };

  // Base Tabs
  const phoneTabs = [
    { href: "/dashboard", label: t.home, icon: LayoutDashboard },
    { href: "/envelopes", label: t.envelopes, icon: Wallet },
    { href: "/transactions", label: t.transactions, icon: ArrowLeftRight },
    { href: "/chat", label: t.baOmar, isAi: true },
  ];

  const tabletTabs = [
    { href: "/dashboard", label: t.home, icon: LayoutDashboard },
    { href: "/envelopes", label: t.envelopes, icon: Wallet },
    { href: "/transactions", label: t.transactions, icon: ArrowLeftRight },
    { href: "/goals", label: t.goals, icon: Target },
    { href: "/reports", label: t.reports, icon: ChartBar },
    { href: "/chat", label: t.baOmar, isAi: true },
  ];

  const activeTabs = isTablet ? tabletTabs : phoneTabs;

interface PlusSheetItem {
  href: string;
  label: string;
  icon?: React.ComponentType<any>;
  isAi?: boolean;
  locked?: boolean;
  soon?: boolean;
}

interface PlusSheetGroup {
  label: string;
  items: PlusSheetItem[];
}

  // Groups for "Plus" Sheet Modal
  const groups: PlusSheetGroup[] = [
    {
      label: locale === "ar" ? "العمليات" : "OPÉRATIONS",
      items: [
        { href: "/transactions", label: locale === "ar" ? "المعاملات" : "Transactions", icon: ArrowLeftRight },
        { href: "/transactions/bulk", label: locale === "ar" ? "استيراد جماعي" : "Import en masse", icon: FileSpreadsheet, locked: isGuest },
        { href: "/distribution", label: locale === "ar" ? "توزيع الكاش" : "Allocation de cash", icon: SlidersHorizontal },
      ],
    },
    {
      label: locale === "ar" ? "الميزانية" : "BUDGET",
      items: [
        { href: "/envelopes", label: locale === "ar" ? "الأظرفة" : "Enveloppes", icon: Wallet },
        { href: "/categories", label: locale === "ar" ? "الفئات" : "Catégories", icon: Layers },
        { href: "/distribution", label: locale === "ar" ? "التوزيع" : "Distribution", icon: SlidersHorizontal },
        { href: "/repartir", label: locale === "ar" ? "قسّم" : "Répartir", icon: SlidersHorizontal },
        { href: "/khatat-lflous", label: locale === "ar" ? "خطط الفلوس" : "Khatat Lflous", icon: Sparkles, locked: isGuest },
        { href: "/sweeps", label: locale === "ar" ? "التحويلات" : "Sweeps", icon: Sparkles, locked: isGuest },
        { href: "/rules", label: locale === "ar" ? "القواعد" : "Règles", icon: Sparkles, locked: isGuest },
        { href: "/regulation", label: locale === "ar" ? "التسوية" : "Régulation", icon: Scale },
      ],
    },
    {
      label: locale === "ar" ? "المشاريع" : "PROJETS",
      items: [
        { href: "/goals", label: locale === "ar" ? "الأهداف" : "Objectifs", icon: Target, locked: isGuest },
        { href: "/debts", label: locale === "ar" ? "الديون · السلف" : "Dettes · Salaf", icon: HandCoins, locked: isGuest },
        { href: "/planner", label: locale === "ar" ? "المخطط" : "Planificateur", icon: Calendar, locked: isGuest },
      ],
    },
    {
      label: locale === "ar" ? "المدرب والتحليلات" : "COACH & ANALYSES",
      items: [
        { href: "/chat", label: locale === "ar" ? "با عمر" : "Ba Omar", isAi: true },
        { href: "/reports", label: locale === "ar" ? "التقارير" : "Rapports", icon: ChartBar, locked: isGuest },
        { href: "/gamification", label: locale === "ar" ? "السلسلة والترتيب" : "Série & classement", icon: Flame, locked: isGuest },
      ],
    },
    {
      label: locale === "ar" ? "الحساب" : "COMPTE",
      items: [
        { href: "/notifications", label: locale === "ar" ? "الإشعارات" : "Notifications", icon: Bell },
        { href: "/settings", label: locale === "ar" ? "الإعدادات" : "Paramètres", icon: Settings },
        { href: "/aide", label: locale === "ar" ? "المساعدة" : "Aide", icon: CircleHelp },
        { href: "/logs", label: locale === "ar" ? "سجل الأمان" : "Journal de sécurité", icon: ShieldCheck, locked: isGuest },
        { href: "/beta", label: locale === "ar" ? "مختبر بيتا" : "Labo Bêta", icon: FlaskConical, soon: true },
      ],
    },
  ];

  return (
    <>
      {/* 1. BARRE DU BAS (TabNav) — Responsive iPad (84px) & Phone (76px) */}
      <nav
        className="asb-tabnav lg:hidden"
        aria-label="Navigation mobile"
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          height: isTablet ? "84px" : "76px",
          boxSizing: "border-box",
          padding: isTablet
            ? "8px max(24px, calc((100vw - 820px) / 2)) 12px"
            : "6px 4px 8px",
          background: "var(--dsh-card, #FFFFFF)",
          borderTop: "1px solid var(--dsh-line, #ECEBE4)",
          boxShadow: "0 -8px 24px -16px rgba(15, 26, 22, 0.35)",
          display: "grid",
          gridTemplateColumns: `repeat(${activeTabs.length + 1}, minmax(0, 1fr))`,
          alignItems: "center",
        }}
      >
        {activeTabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                minWidth: 0,
                textDecoration: "none",
                color: isActive ? "var(--dsh-ink, #0F1A16)" : "var(--dsh-muted, #55645D)",
                fontSize: isTablet ? "13px" : "12px",
                fontWeight: isActive ? 800 : 650,
                whiteSpace: "nowrap",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span
                style={{
                  width: "58px",
                  height: "32px",
                  borderRadius: "16px",
                  background: isActive ? "var(--dsh-brand-soft, #E2F1E8)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s ease, transform 0.15s ease",
                  transform: isActive ? "scale(1.04)" : "scale(1)",
                }}
              >
                {tab.isAi ? (
                  <Image
                    src="/landing/ai/ba-omar-avatar.png"
                    alt="Ba Omar"
                    width={22}
                    height={22}
                    className="rounded-full object-cover ring-1 ring-emerald-500/40"
                  />
                ) : tab.icon ? (
                  <tab.icon
                    style={{
                      width: 21,
                      height: 21,
                      color: isActive ? "var(--dsh-brand-ink, #06402C)" : "currentColor",
                      strokeWidth: isActive ? 2.3 : 1.9,
                    }}
                  />
                ) : null}
              </span>
              <span
                style={{
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  padding: "0 2px",
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* Bouton "Plus" */}
        <button
          type="button"
          onClick={() => setPlusOpen(true)}
          aria-expanded={plusOpen}
          aria-label={t.plus}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            minWidth: 0,
            background: "transparent",
            border: 0,
            cursor: "pointer",
            color: plusOpen ? "var(--dsh-ink, #0F1A16)" : "var(--dsh-muted, #55645D)",
            fontSize: isTablet ? "13px" : "12px",
            fontWeight: plusOpen ? 800 : 650,
            whiteSpace: "nowrap",
            userSelect: "none",
            WebkitTapHighlightColor: "transparent",
            fontFamily: "inherit",
          }}
        >
          <span
            style={{
              width: "58px",
              height: "32px",
              borderRadius: "16px",
              background: plusOpen ? "var(--dsh-brand-soft, #E2F1E8)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s ease",
            }}
          >
            <LayoutGrid
              style={{
                width: 21,
                height: 21,
                color: plusOpen ? "var(--dsh-brand-ink, #06402C)" : "currentColor",
                strokeWidth: plusOpen ? 2.3 : 1.9,
              }}
            />
          </span>
          <span>{t.plus}</span>
        </button>
      </nav>

      {/* 2. "PLUS" BOTTOM SHEET DIALOG MODAL */}
      {plusOpen && (
        <>
          {/* Scrim backdrop */}
          <div
            onClick={() => setPlusOpen(false)}
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: "rgba(8, 20, 16, 0.48)",
              backdropFilter: "blur(3px)",
              animation: "fx-fade 0.2s ease both",
            }}
          />

          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.allPages}
            dir={isRTL ? "rtl" : "ltr"}
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              margin: "0 auto",
              maxWidth: isTablet ? "720px" : "100%",
              zIndex: 51,
              maxHeight: "84vh",
              overflowY: "auto",
              boxSizing: "border-box",
              background: "var(--dsh-card, #FFFFFF)",
              borderRadius: "28px 28px 0 0",
              padding: "10px 18px 36px",
              boxShadow: "0 -12px 40px rgba(0, 0, 0, 0.3)",
              animation: "dsh-up 0.28s cubic-bezier(0.32, 0.72, 0, 1) both",
            }}
          >
            {/* Grab handle */}
            <div
              aria-hidden="true"
              style={{
                width: "38px",
                height: "4px",
                borderRadius: "2px",
                background: "var(--dsh-line, #ECEBE4)",
                margin: "0 auto 12px",
              }}
            />

            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 4px 10px",
                borderBottom: "1px solid var(--dsh-line, #ECEBE4)",
                marginBottom: "8px",
              }}
            >
              <b style={{ fontSize: "18px", color: "var(--dsh-ink, #0F1A16)" }}>
                {t.allPages}
              </b>
              <button
                type="button"
                onClick={() => setPlusOpen(false)}
                aria-label={t.close}
                style={{
                  width: "40px",
                  height: "40px",
                  border: 0,
                  borderRadius: "20px",
                  background: "var(--dsh-soft, #F1F0EA)",
                  color: "var(--dsh-ink, #0F1A16)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Groups */}
            {groups.map((g) => (
              <div key={g.label} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    padding: "12px 4px 8px",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "1.1px",
                    textTransform: "uppercase",
                    color: "var(--dsh-muted, #55645D)",
                  }}
                >
                  {g.label}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isTablet
                      ? "repeat(4, minmax(0, 1fr))"
                      : "repeat(3, minmax(0, 1fr))",
                    gap: "8px",
                  }}
                >
                  {g.items.map((it) => {
                    const isCur = pathname === it.href;
                    return (
                      <Link
                        key={it.label}
                        href={it.soon ? "#" : it.href}
                        onClick={(e) => {
                          if (it.soon) {
                            e.preventDefault();
                            return;
                          }
                          setPlusOpen(false);
                        }}
                        style={{
                          position: "relative",
                          minHeight: "84px",
                          padding: "10px 6px",
                          boxSizing: "border-box",
                          borderRadius: "18px",
                          background: isCur
                            ? "var(--dsh-brand-soft, #E2F1E8)"
                            : "var(--dsh-soft, #F4F3EE)",
                          color: "var(--dsh-ink, #0F1A16)",
                          textDecoration: "none",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "7px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          lineHeight: 1.2,
                        }}
                      >
                        <span
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "13px",
                            background: isCur
                              ? "#0A7A53"
                              : "var(--dsh-card, #FFFFFF)",
                            color: isCur ? "#FFFFFF" : "#0A7A53",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                          }}
                        >
                          {it.isAi ? (
                            <Image
                              src="/landing/ai/ba-omar-avatar.png"
                              alt="Ba Omar"
                              width={24}
                              height={24}
                              className="rounded-full object-cover"
                            />
                          ) : it.icon ? (
                            <it.icon size={20} strokeWidth={2} />
                          ) : null}
                        </span>

                        <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {it.label}
                        </span>

                        {it.soon && (
                          <span
                            style={{
                              position: "absolute",
                              top: 6,
                              insetInlineEnd: 6,
                              fontSize: "9px",
                              fontWeight: 800,
                              padding: "2px 5px",
                              borderRadius: 6,
                              background: "var(--dsh-card, #FFFFFF)",
                              color: "var(--dsh-muted, #55645D)",
                            }}
                          >
                            {t.soon}
                          </span>
                        )}

                        {it.locked && (
                          <Lock
                            size={12}
                            style={{
                              position: "absolute",
                              top: 8,
                              insetInlineEnd: 8,
                              color: "var(--dsh-muted, #55645D)",
                            }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default AppBottomNav;
