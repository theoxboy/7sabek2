"use client";

import React from "react";
import Image from "next/image";
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
  SlidersHorizontal,
  Plus,
  LogOut,
  Trophy,
  X,
  HandCoins,
  Lock,
} from "lucide-react";
import { isGuestHiddenHref, isGuestLockedHref } from "@/lib/guestGate";
import { protectionLevelOf } from "@/lib/guestPanelCopy";
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
    defaultTitle: "Opérations",
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
        href: "/distribution",
        labelKey: "/distribution",
        defaultLabel: "Allocation de cash",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    titleKey: "section_budget",
    defaultTitle: "Budget",
    items: [
      {
        href: "/envelopes",
        labelKey: "/envelopes",
        defaultLabel: "Enveloppes",
        icon: Wallet,
      },
    ],
  },
  {
    titleKey: "section_goals_analytics",
    defaultTitle: "Projets & Analyses",
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
        defaultLabel: "Dettes · Salaf",
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
        defaultLabel: "Série & Ranking",
        icon: Trophy,
        badge: { text: "streak", variant: "amber" },
      },
    ],
  },
  {
    titleKey: "section_intelligence",
    defaultTitle: "Coach & Lab",
    items: [
      {
        href: "/chat",
        labelKey: "/chat",
        defaultLabel: "Ba Omar",
        icon: BaOmarNavIcon,
        badge: { text: "AI", variant: "emerald" },
      },
      {
        href: "/beta",
        labelKey: "/beta",
        defaultLabel: "Labo Beta",
        icon: FlaskConical,
        badge: { text: "BETA", variant: "purple" },
        betaOnly: true,
      },
    ],
  },
];

function BaOmarNavIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/landing/ai/ba-omar-avatar.png"
      alt="Ba Omar"
      width={20}
      height={20}
      className={`${className ?? "h-5 w-5"} rounded-full object-cover shrink-0 ring-1 ring-emerald-500/30`}
    />
  );
}

const SIDEBAR_I18N = {
  fr: {
    quickAdd: "Nouvelle transaction",
    section_main: "Opérations",
    section_budget: "Budget",
    section_goals_analytics: "Projets & Analyses",
    section_intelligence: "Coach & Lab",
    "/dashboard": "Tableau de bord",
    "/transactions": "Transactions",
    "/envelopes": "Enveloppes",
    "/distribution": "Allocation de cash",
    "/goals": "Objectifs",
    "/debts": "Dettes · Salaf",
    "/reports": "Rapports",
    "/gamification": "Série & Ranking",
    "/chat": "Ba Omar",
    "/beta": "Labo Beta",
    "/aide": "Aide",
    "/settings": "Paramètres",
    collapseSidebar: "Réduire le menu",
    expandSidebar: "Agrandir le menu",
    logout: "Déconnexion",
    activePlan: "Membre · Plan Pro",
    guestMode: "Mode Invité",
  },
  en: {
    quickAdd: "New transaction",
    section_main: "Operations",
    section_budget: "Budget",
    section_goals_analytics: "Projects & Analytics",
    section_intelligence: "Coach & Lab",
    "/dashboard": "Dashboard",
    "/transactions": "Transactions",
    "/envelopes": "Envelopes",
    "/distribution": "Cash allocation",
    "/goals": "Goals",
    "/debts": "Debts & Salaf",
    "/reports": "Reports",
    "/gamification": "Streak & Ranking",
    "/chat": "Ba Omar",
    "/beta": "Beta Lab",
    "/aide": "Help",
    "/settings": "Settings",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    logout: "Logout",
    activePlan: "Pro Member",
    guestMode: "Guest Mode",
  },
  ar: {
    quickAdd: "عملية جديدة",
    section_main: "العمليات",
    section_budget: "الميزانية",
    section_goals_analytics: "المشاريع والتحليلات",
    section_intelligence: "المستشار والمختبر",
    "/dashboard": "لوحة القيادة",
    "/transactions": "العمليات",
    "/envelopes": "الأظرفة",
    "/distribution": "توزيع السيولة",
    "/goals": "الأهداف",
    "/debts": "الديون والسلف",
    "/reports": "التقارير",
    "/gamification": "السلسلة والتصنيف",
    "/chat": "با عمر",
    "/beta": "مختبر بيتا",
    "/aide": "المساعدة",
    "/settings": "الإعدادات",
    collapseSidebar: "طي القائمة",
    expandSidebar: "توسيع القائمة",
    logout: "تسجيل الخروج",
    activePlan: "عضو · باقة احترافية",
    guestMode: "وضع الزائر",
  },
} as const;

export interface AppSidebarProps {
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
  const guestProtectionPct = user?.is_guest ? protectionLevelOf(user) : 100;
  const isClosed = collapsed && !isMobile;

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
      className={`sb-island ${isClosed ? "closed" : ""} ${isMobile ? "is-mobile" : ""}`}
      aria-label="Navigation principale"
      data-tour="sidebar"
    >
      {/* 1. Header avec Logo 7sabek et poignée ressort (Knob) */}
      <div className="sb-head">
        <Link
          href="/dashboard"
          onClick={handleLinkClick}
          className="sb-logo flex items-center focus:outline-none"
          title="7sabek"
          aria-label="7sabek"
        >
          <svg
            viewBox="10 540 1880 840"
            width="84"
            height="38"
            style={{ display: "block", overflow: "visible" }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="sbg-island"
                gradientUnits="userSpaceOnUse"
                x1="520"
                y1="560"
                x2="140"
                y2="1290"
              >
                <stop offset="0" stopColor="#00D284" />
                <stop offset="1" stopColor="#00884F" />
              </linearGradient>
            </defs>
            <path
              className="sb-7"
              fill="url(#sbg-island)"
              d="M143.9 1281.0 27.0 1280.7 23.3 1278.6 22.5 1273.5 26.0 1266.8 65.5 1209.8 80.1 1187.1 100.9 1157.7 107.5 1147.0 178.4 1045.5 276.4 902.2 291.8 880.9 316.8 843.1 339.3 811.7 388.6 738.9 404.8 716.6 417.8 697.5 419.2 693.2 418.2 691.2 415.4 690.4 298.2 691.0 42.7 690.6 39.9 688.9 38.3 686.5 39.7 678.5 57.5 639.4 66.4 617.6 74.1 602.2 79.9 587.7 86.4 576.7 95.5 566.5 104.8 560.2 113.9 556.6 127.6 554.1 633.8 554.1 645.8 556.6 652.9 560.0 657.8 563.5 662.6 568.7 668.2 578.7 671.3 591.4 671.0 605.1 668.6 616.4 663.2 629.8 654.9 644.5 636.2 671.5 535.6 810.6 411.4 985.5 317.2 1115.2 281.8 1166.1 255.8 1201.0 218.5 1254.2 205.1 1267.2 191.3 1275.0 183.0 1277.9 171.0 1280.4 143.9 1281.0Z"
            />
            <path
              className="sb-word"
              fillRule="evenodd"
              d="M1451.2 1258.9 1422.8 1258.0 1401.8 1254.6 1379.4 1247.9 1366.4 1242.2 1355.0 1235.9 1339.3 1224.6 1323.5 1208.8 1317.9 1201.4 1310.2 1189.1 1300.6 1167.0 1294.3 1184.7 1289.3 1195.1 1279.6 1210.4 1271.2 1220.6 1257.5 1233.3 1243.8 1242.6 1231.1 1248.9 1217.1 1253.9 1199.7 1257.7 1185.4 1259.0 1168.7 1258.7 1150.7 1256.0 1137.0 1251.9 1125.6 1246.6 1113.3 1238.0 1105.3 1230.1 1104.3 1254.6 1019.9 1254.5 1019.8 905.7 1108.9 905.7 1109.3 1020.7 1119.6 1012.4 1132.0 1005.0 1143.7 1000.3 1159.7 996.6 1172.7 995.2 1192.1 995.6 1208.1 997.9 1225.8 1003.0 1241.8 1010.3 1253.2 1017.4 1265.5 1027.3 1274.4 1036.5 1284.3 1049.8 1290.6 1060.7 1296.3 1073.5 1300.6 1086.2 1306.3 1072.1 1313.2 1058.8 1322.8 1045.1 1333.8 1033.1 1345.9 1023.1 1355.4 1016.7 1371.7 1008.0 1388.7 1001.7 1407.8 997.3 1426.5 995.2 1443.8 995.2 1462.5 997.3 1479.2 1001.0 1496.9 1007.4 1510.3 1014.0 1526.0 1024.6 1538.0 1035.6 1549.4 1049.7 1556.5 1061.2 1564.4 1079.2 1568.9 1095.2 1571.5 1113.6 1571.9 1131.3 1570.3 1149.3 1385.3 1150.0 1387.3 1156.3 1391.0 1163.7 1396.6 1171.4 1402.4 1176.9 1415.8 1184.8 1432.5 1189.5 1441.5 1190.6 1454.2 1190.6 1472.2 1187.8 1486.9 1182.1 1497.3 1175.8 1506.6 1168.7 1553.1 1217.1 1551.0 1220.3 1543.3 1227.6 1532.1 1236.1 1520.0 1243.2 1509.6 1247.9 1494.6 1252.9 1480.9 1256.0 1462.9 1258.3 1451.2 1258.9ZM1872.6 1254.6 1765.1 1254.5 1693.3 1165.6 1667.2 1192.1 1666.8 1254.5 1577.7 1254.4 1577.9 905.6 1667.0 905.9 1667.2 1087.8 1758.4 999.7 1863.5 999.7 1758.7 1108.9 1869.4 1249.5 1872.9 1254.2 1872.6 1254.6ZM615.4 1261.3 596.4 1261.0 572.7 1259.0 551.6 1255.7 531.3 1250.9 515.6 1246.2 495.9 1238.5 483.8 1232.5 472.1 1225.1 502.5 1156.7 527.2 1169.9 549.3 1178.4 576.7 1185.5 600.7 1188.6 616.7 1188.9 627.1 1188.2 645.8 1184.5 652.1 1181.8 658.0 1177.7 662.9 1171.4 664.6 1165.7 664.6 1158.3 662.9 1152.7 660.5 1148.8 653.5 1142.9 641.1 1137.6 628.4 1133.6 567.7 1118.7 550.6 1113.7 531.3 1106.7 517.2 1099.0 507.2 1091.7 495.0 1079.9 488.8 1071.2 481.8 1055.8 478.0 1037.8 477.7 1017.1 481.1 998.1 485.4 986.0 488.8 979.2 499.1 964.0 511.9 951.2 527.6 940.2 548.6 930.2 573.0 923.1 601.0 919.1 633.8 918.4 665.8 921.5 695.2 927.5 717.9 934.9 730.9 940.5 742.4 946.6 742.8 947.6 740.7 953.0 714.2 1016.0 681.2 1001.3 660.8 995.3 638.4 991.6 617.1 990.9 604.7 991.9 594.4 994.0 587.0 996.7 581.7 999.7 575.3 1005.3 572.9 1008.8 570.5 1014.4 569.8 1022.4 571.0 1027.6 575.2 1034.1 581.0 1038.5 585.7 1040.9 608.4 1048.2 654.5 1058.8 680.8 1066.1 702.9 1074.1 716.9 1081.8 729.8 1091.6 743.0 1105.9 750.7 1119.9 756.2 1140.3 767.3 1128.1 779.0 1119.9 794.4 1112.9 809.7 1108.5 823.1 1106.1 845.1 1104.1 909.1 1103.6 908.7 1098.2 906.6 1089.9 903.6 1083.5 900.2 1078.7 894.9 1073.7 890.2 1070.8 883.9 1067.8 872.5 1064.7 852.5 1063.4 842.8 1064.0 827.1 1066.8 804.4 1074.5 786.0 1085.2 756.0 1025.1 765.3 1019.0 779.0 1012.4 807.1 1003.0 827.8 998.6 841.5 996.6 859.2 995.2 879.2 995.2 902.9 997.6 916.9 1000.3 929.6 1004.0 941.3 1008.7 950.3 1013.4 961.8 1021.1 969.7 1028.0 977.0 1036.4 983.4 1045.8 990.4 1060.5 993.8 1070.9 997.2 1087.2 998.6 1099.9 998.6 1254.5 915.9 1254.6 914.9 1222.9 908.1 1233.1 899.9 1241.3 890.9 1247.6 877.5 1253.6 864.2 1257.0 845.1 1259.0 825.4 1258.3 809.1 1255.7 794.7 1251.2 784.0 1246.3 775.0 1240.6 767.7 1234.6 761.5 1228.1 755.9 1220.5 750.9 1210.8 746.6 1198.2 737.6 1212.2 725.9 1224.9 712.6 1235.2 695.2 1244.9 674.5 1252.9 658.1 1257.0 638.1 1260.0 615.4 1261.3ZM1487.8 1102.6 1485.6 1092.9 1481.3 1083.5 1476.7 1076.9 1470.2 1070.4 1463.2 1065.4 1455.2 1061.8 1447.2 1059.7 1437.2 1058.7 1426.5 1059.4 1416.8 1061.8 1409.1 1065.1 1401.1 1070.7 1394.9 1076.9 1390.0 1084.2 1386.3 1092.2 1383.8 1101.9 1385.1 1102.7 1487.8 1102.6ZM1168.2 1187.4 1177.0 1185.8 1188.7 1180.8 1198.4 1173.2 1206.2 1163.4 1211.2 1152.7 1214.2 1139.6 1214.9 1132.0 1214.2 1113.9 1211.5 1101.9 1206.5 1090.9 1200.6 1082.9 1193.2 1076.2 1186.1 1071.8 1174.4 1067.7 1165.0 1066.4 1151.7 1067.0 1140.3 1070.1 1130.6 1075.5 1122.3 1082.7 1116.2 1090.9 1111.5 1100.9 1108.5 1113.6 1107.8 1119.9 1108.1 1137.3 1110.2 1148.3 1113.8 1158.3 1118.3 1166.1 1125.6 1174.5 1134.6 1181.1 1144.7 1185.4 1155.3 1187.5 1168.2 1187.4ZM870.7 1202.1 879.9 1200.5 890.2 1196.2 896.9 1191.6 902.6 1185.5 905.7 1180.7 909.4 1172.4 909.0 1150.7 871.5 1150.5 855.8 1151.9 847.8 1153.9 842.8 1156.3 839.5 1158.5 835.5 1162.9 832.7 1168.7 831.6 1178.0 833.7 1186.7 838.3 1193.4 843.1 1197.1 851.8 1200.8 860.5 1202.2 870.7 1202.1Z"
            />
            <circle className="sb-dot" cx="1273" cy="1316" r="45" />
          </svg>
        </Link>

        {isMobile ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseMobile}
            className="ml-auto text-slate-400 hover:text-[var(--sb-ink)]"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        ) : onToggleCollapse ? (
          <button
            type="button"
            className="sb-knob"
            onClick={onToggleCollapse}
            aria-label={collapsed ? i18n.expandSidebar : i18n.collapseSidebar}
            title={collapsed ? i18n.expandSidebar : i18n.collapseSidebar}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* 2. Bouton d'action rapide (Nouvelle transaction) */}
      <div className={`mb-2 ${isClosed ? "flex justify-center" : "px-2"}`}>
        <button
          type="button"
          onClick={handleQuickAddClick}
          className={`sb-it w-full justify-center font-bold transition-all ${
            isClosed
              ? "h-10 w-10 !px-0 rounded-xl bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 hover:bg-emerald-600 hover:!text-white"
              : "gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 !text-white shadow-md shadow-emerald-900/20 hover:brightness-105"
          }`}
          title={i18n.quickAdd}
        >
          <Plus className="h-4 w-4 stroke-[2.5] shrink-0" />
          {!isClosed && (
            <span className="sb-lb text-xs font-bold tracking-wide">
              {i18n.quickAdd}
            </span>
          )}
          {isClosed && (
            <span className="sb-tip" role="tooltip">
              {i18n.quickAdd}
            </span>
          )}
        </button>
      </div>

      {/* 3. Sections de navigation */}
      <nav className="sb-nav">
        {SIDEBAR_SECTIONS.map((section, secIdx) => {
          const visibleItems = section.items.filter(
            (item) =>
              (!item.betaOnly || betaAuthorized) &&
              !(Boolean(user?.is_guest) && isGuestHiddenHref(item.href))
          );
          if (visibleItems.length === 0) return null;

          const sectionTitle =
            i18n[section.titleKey as keyof typeof i18n] || section.defaultTitle;

          return (
            <div key={secIdx}>
              {secIdx > 0 && (
                <div className="sb-sec">
                  <span className="sb-sec-t">{sectionTitle}</span>
                  <span className="sb-sec-l" aria-hidden="true" />
                </div>
              )}
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const guestLocked =
                  Boolean(user?.is_guest) && isGuestLockedHref(item.href);
                const Icon = item.icon;
                const label =
                  i18n[item.labelKey as keyof typeof i18n] || item.defaultLabel;
                const tourId = `nav-${item.href.replace("/", "")}`;

                let badgeContent = item.badge?.text;
                if (item.badge?.text === "streak") {
                  if (typeof streakDays === "number" && streakDays > 0) {
                    badgeContent = `${streakDays} 🔥`;
                  } else {
                    badgeContent = undefined;
                  }
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    data-tour={tourId}
                    aria-current={isActive ? "page" : undefined}
                    className={`sb-it ${isActive ? "sb-on" : ""} ${
                      guestLocked ? "opacity-45 hover:opacity-75" : ""
                    }`}
                  >
                    <Icon className="sb-ic" />
                    <span className="sb-lb">{label}</span>
                    <span className="sb-tip" role="tooltip">
                      {label}
                    </span>

                    {!isClosed && guestLocked && (
                      <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
                    )}

                    {!isClosed && !guestLocked && badgeContent && (
                      <span
                        className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          item.badge?.variant === "amber"
                            ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                            : item.badge?.variant === "emerald"
                            ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                            : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        }`}
                      >
                        {badgeContent}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* 4. Footer avec Paramètres, Aide et Utilisateur */}
      <div className="sb-foot">
        <Link
          href="/settings"
          onClick={handleLinkClick}
          className={`sb-it ${pathname.startsWith("/settings") ? "sb-on" : ""}`}
        >
          <Settings className="sb-ic" />
          <span className="sb-lb">{i18n["/settings"]}</span>
          <span className="sb-tip" role="tooltip">
            {i18n["/settings"]}
          </span>
        </Link>

        <Link
          href="/aide"
          onClick={handleLinkClick}
          className={`sb-it ${pathname.startsWith("/aide") ? "sb-on" : ""}`}
        >
          <CircleHelp className="sb-ic" />
          <span className="sb-lb">{i18n["/aide"]}</span>
          <span className="sb-tip" role="tooltip">
            {i18n["/aide"]}
          </span>
        </Link>

        {/* Profil de l'utilisateur */}
        <div className="sb-user">
          <span className="sb-av">{initials || "U"}</span>
          {!isClosed && (
            <div className="sb-uname flex-1 min-w-0">
              <b>{displayName}</b>
              <small>
                {user?.is_guest
                  ? `${i18n.guestMode} (${guestProtectionPct}%)`
                  : i18n.activePlan}
              </small>
            </div>
          )}
          {!isClosed && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-auto"
              title={i18n.logout}
              aria-label={i18n.logout}
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {!isClosed && (
          <Link
            href="/releases"
            className="mt-1 block text-center text-[10.5px] text-[var(--sb-sub)] opacity-70 hover:opacity-100 hover:underline transition-opacity"
          >
            7sabek {appVersionLabel}
          </Link>
        )}
      </div>
    </aside>
  );
}

export default AppSidebar;
