"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CircleHelp,
  ChartBar,
  Settings,
  Target,
  FlaskConical,
  MessageSquare,
  SlidersHorizontal,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Trophy,
  X,
  HandCoins,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { useQuickTx } from "@/state/QuickTxContext";
import type { FloussyLocale } from "@/lib/localePreference";
import type { AuthUser } from "@/lib/auth";

export interface NavSectionItem {
  href: string;
  labelKey: string;
  defaultLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: {
    text: string;
    variant: "primary" | "amber" | "emerald" | "purple";
  };
  betaOnly?: boolean;
}

export interface NavSection {
  titleKey: string;
  defaultTitle: string;
  items: NavSectionItem[];
}

export const SIDEBAR_SECTIONS: NavSection[] = [
  {
    titleKey: "section_main",
    defaultTitle: "Vue d'ensemble",
    items: [
      {
        href: "/dashboard",
        labelKey: "/dashboard",
        defaultLabel: "Tableau de bord",
        icon: LayoutDashboard,
      },
      {
        href: "/transactions",
        labelKey: "/transactions",
        defaultLabel: "Transactions",
        icon: ArrowLeftRight,
      },
      {
        href: "/envelopes",
        labelKey: "/envelopes",
        defaultLabel: "Enveloppes",
        icon: Wallet,
      },
      {
        href: "/distribution",
        labelKey: "/distribution",
        defaultLabel: "Distribution",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    titleKey: "section_goals_analytics",
    defaultTitle: "Objectifs & Analyses",
    items: [
      {
        href: "/goals",
        labelKey: "/goals",
        defaultLabel: "Objectifs",
        icon: Target,
      },
      {
        href: "/debts",
        labelKey: "/debts",
        defaultLabel: "Dettes & Salaf",
        icon: HandCoins,
      },
      {
        href: "/reports",
        labelKey: "/reports",
        defaultLabel: "Rapports",
        icon: ChartBar,
      },
      {
        href: "/gamification",
        labelKey: "/gamification",
        defaultLabel: "Classement & Série",
        icon: Trophy,
        badge: { text: "streak", variant: "amber" },
      },
    ],
  },
  {
    titleKey: "section_intelligence",
    defaultTitle: "Intelligence & Lab",
    items: [
      {
        href: "/chat",
        labelKey: "/chat",
        defaultLabel: "Assistant Floussy",
        icon: MessageSquare,
        badge: { text: "AI", variant: "emerald" },
      },
      {
        href: "/beta",
        labelKey: "/beta",
        defaultLabel: "Labo Beta",
        icon: FlaskConical,
        badge: { text: "BETA", variant: "purple" },
      },
    ],
  },
  {
    titleKey: "section_system",
    defaultTitle: "Système",
    items: [
      {
        href: "/aide",
        labelKey: "/aide",
        defaultLabel: "Centre d'aide",
        icon: CircleHelp,
      },
      {
        href: "/settings",
        labelKey: "/settings",
        defaultLabel: "Paramètres",
        icon: Settings,
      },
    ],
  },
];

const SIDEBAR_I18N = {
  fr: {
    quickAdd: "Nouvelle transaction",
    section_main: "PRINCIPAL",
    section_goals_analytics: "PILOTAGE",
    section_intelligence: "INTELLIGENCE",
    section_system: "SYSTÈME",
    "/dashboard": "Tableau de bord",
    "/transactions": "Transactions",
    "/envelopes": "Enveloppes",
    "/distribution": "Distribution",
    "/goals": "Objectifs",
    "/debts": "Dettes & Salaf",
    "/reports": "Rapports",
    "/gamification": "Série & Ranking",
    "/chat": "Assistant IA",
    "/beta": "Labo Beta",
    "/aide": "Aide & Support",
    "/settings": "Paramètres",
    collapseSidebar: "Réduire le menu",
    expandSidebar: "Agrandir le menu",
    logout: "Déconnexion",
    activePlan: "Compte actif",
  },
  en: {
    quickAdd: "New transaction",
    section_main: "MAIN",
    section_goals_analytics: "MANAGEMENT",
    section_intelligence: "INTELLIGENCE",
    section_system: "SYSTEM",
    "/dashboard": "Dashboard",
    "/transactions": "Transactions",
    "/envelopes": "Envelopes",
    "/distribution": "Distribution",
    "/goals": "Goals",
    "/debts": "Debts & Salaf",
    "/reports": "Reports",
    "/gamification": "Streak & Ranking",
    "/chat": "AI Assistant",
    "/beta": "Beta Lab",
    "/aide": "Help & Support",
    "/settings": "Settings",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    logout: "Logout",
    activePlan: "Active Account",
  },
  ar: {
    quickAdd: "عملية جديدة",
    section_main: "الرئيسي",
    section_goals_analytics: "التتبع والتحليل",
    section_intelligence: "الذكاء والتجربة",
    section_system: "النظام",
    "/dashboard": "لوحة القيادة",
    "/transactions": "العمليات",
    "/envelopes": "الأظرفة",
    "/distribution": "التوزيع",
    "/goals": "الأهداف",
    "/debts": "الديون والسلف",
    "/reports": "التقارير",
    "/gamification": "السلسلة والتصنيف",
    "/chat": "المساعد الذكي",
    "/beta": "مختبر بيتا",
    "/aide": "المساعدة والدعم",
    "/settings": "الإعدادات",
    collapseSidebar: "طي القائمة",
    expandSidebar: "توسيع القائمة",
    logout: "تسجيل الخروج",
    activePlan: "حساب نشط",
  },
} as const;

interface AppSidebarProps {
  user: AuthUser | null;
  displayName: string;
  initials: string;
  locale: FloussyLocale;
  streakDays?: number | null;
  appVersionLabel: string;
  onLogout: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  betaAuthorized?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppSidebar({
  user,
  displayName,
  initials,
  locale,
  streakDays,
  appVersionLabel,
  onLogout,
  isMobile = false,
  onCloseMobile,
  betaAuthorized = true,
  collapsed = false,
  onToggleCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { openQuickTx } = useQuickTx();
  const i18n = SIDEBAR_I18N[locale] || SIDEBAR_I18N.fr;
  const isRTL = locale === "ar";

  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleQuickAddClick = () => {
    openQuickTx("expense");
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={`floussy-sidebar group relative flex h-full min-h-0 flex-col overflow-hidden transition-all duration-300 select-none ${
        isMobile
          ? "floussy-sidebar--mobile w-72"
          : collapsed
          ? "floussy-sidebar--collapsed w-[78px]"
          : "w-72"
      }`}
      aria-label="Navigation principale"
    >
      {/* Header / Brand */}
      <div className="floussy-sidebar__head flex items-center justify-between px-4 pt-5 pb-3">
        <Link
          href="/dashboard"
          onClick={handleLinkClick}
          className={`floussy-sidebar__brand flex items-center gap-2 overflow-hidden transition-opacity hover:opacity-90 ${
            collapsed && !isMobile ? "justify-center w-full" : ""
          }`}
          title="7sabek"
        >
          {collapsed && !isMobile ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-950/40 text-white font-black text-lg">
              7
            </div>
          ) : (
            <BrandLogo
              locale={locale}
              tone="dark"
              className="h-11 w-auto max-w-[170px] object-contain"
            />
          )}
        </Link>

        {isMobile ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseMobile}
            className="text-slate-400 hover:text-white"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        ) : onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/80 hover:border-slate-600 transition-all shadow-sm"
            title={collapsed ? i18n.expandSidebar : i18n.collapseSidebar}
            aria-label={collapsed ? i18n.expandSidebar : i18n.collapseSidebar}
          >
            {collapsed ? (
              isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>

      {/* Quick Action Button (Ajouter une transaction) */}
      <div className={`px-3 py-2 ${collapsed && !isMobile ? "flex justify-center" : ""}`}>
        <button
          type="button"
          onClick={handleQuickAddClick}
          className={`group/btn relative flex items-center justify-center font-bold transition-all duration-200 shadow-lg active:scale-95 ${
            collapsed && !isMobile
              ? "h-11 w-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-950/40"
              : "w-full gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-4 py-2.5 text-xs text-white hover:brightness-110 shadow-emerald-900/30"
          }`}
          title={i18n.quickAdd}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white transition-transform group-hover/btn:rotate-90">
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          </div>
          {(!collapsed || isMobile) && (
            <span className="truncate tracking-wide">{i18n.quickAdd}</span>
          )}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 floussy-scroll">
        {SIDEBAR_SECTIONS.map((section, secIdx) => {
          const visibleItems = section.items.filter(
            (item) => !item.betaOnly || betaAuthorized
          );
          if (visibleItems.length === 0) return null;

          const sectionTitle =
            i18n[section.titleKey as keyof typeof i18n] || section.defaultTitle;

          return (
            <div key={secIdx} className="space-y-1">
              {(!collapsed || isMobile) && (
                <div className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
                  {sectionTitle}
                </div>
              )}
              {collapsed && !isMobile && secIdx > 0 && (
                <div className="mx-auto my-1.5 h-[1px] w-8 bg-slate-800/80" />
              )}
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  const label =
                    i18n[item.labelKey as keyof typeof i18n] || item.defaultLabel;
                  const tourId = `nav-${item.href.replace("/", "")}`;

                  // Dynamic badge override (e.g. streak count)
                  let badgeContent = item.badge?.text;
                  if (item.badge?.text === "streak") {
                    if (typeof streakDays === "number" && streakDays > 0) {
                      badgeContent = `${streakDays} 🔥`;
                    } else {
                      badgeContent = undefined;
                    }
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={handleLinkClick}
                        data-tour={tourId}
                        aria-current={isActive ? "page" : undefined}
                        title={collapsed && !isMobile ? label : undefined}
                        className={`group/item relative flex items-center rounded-2xl transition-all duration-150 ${
                          collapsed && !isMobile
                            ? "h-11 w-11 mx-auto justify-center"
                            : "px-3 py-2.5 text-xs font-medium justify-between"
                        } ${
                          isActive
                            ? "bg-emerald-500/15 text-emerald-300 font-semibold shadow-inner border border-emerald-500/30"
                            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <div
                          className={`flex items-center gap-3 min-w-0 ${
                            collapsed && !isMobile ? "justify-center" : ""
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              isActive
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "text-slate-400 group-hover/item:text-slate-200 group-hover/item:bg-slate-700/50"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>

                          {(!collapsed || isMobile) && (
                            <span className="truncate">{label}</span>
                          )}
                        </div>

                        {/* Badges */}
                        {(!collapsed || isMobile) && badgeContent && (
                          <span
                            className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                              item.badge?.variant === "amber"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : item.badge?.variant === "purple"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : item.badge?.variant === "emerald"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {badgeContent}
                          </span>
                        )}

                        {/* Collapsed active indicator pip */}
                        {collapsed && !isMobile && isActive && (
                          <span
                            className={`absolute ${
                              isRTL ? "left-1.5" : "right-1.5"
                            } top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80`}
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Footer / User Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 mt-auto">
        <div
          className={`flex items-center rounded-2xl bg-slate-800/50 p-2.5 border border-slate-700/40 transition-all ${
            collapsed && !isMobile
              ? "justify-center p-1.5"
              : "justify-between gap-2.5"
          }`}
        >
          <div
            className={`flex items-center gap-2.5 min-w-0 ${
              collapsed && !isMobile ? "justify-center" : ""
            }`}
            title={`${displayName} (${user?.email || ""})`}
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-xs font-bold text-white shadow-sm ring-2 ring-emerald-500/20">
              {initials || "U"}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
            </div>

            {(!collapsed || isMobile) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-100">
                  {displayName}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {user?.email || i18n.activePlan}
                </p>
              </div>
            )}
          </div>

          {(!collapsed || isMobile) && (
            <button
              type="button"
              onClick={onLogout}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 transition-all border border-transparent"
              title={i18n.logout}
              aria-label={i18n.logout}
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {(!collapsed || isMobile) && (
          <div className="mt-2 text-center text-[10px] text-slate-500">
            7sabek {appVersionLabel}
          </div>
        )}
      </div>
    </aside>
  );
}

export default AppSidebar;
