"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Cairo, Fraunces, Manrope } from "next/font/google";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CircleHelp,
  ChartBar,
  Settings,
  Menu,
  X,
  Bell,
  Globe,
  Check,
  AlertTriangle,
  Clock,
  Flame,
  Target,
  FlaskConical,
  Lightbulb,
  SlidersHorizontal,
  MessageSquare,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { fetchMe, logout, type AuthUser } from "@/lib/auth";
import {
  hasReachedOnboardingReviewProgress,
  normalizeOnboardingDraftObjects,
  readOnboardingProgressSnapshot,
  type OnboardingAnswers,
} from "@/lib/onboardingV2Compat";
import { usePlatformStatus } from "@/lib/usePlatformStatus";
import { getVisibleAnnouncements } from "@/lib/announcementVisibility";
import { SystemMessageCard } from "@/components/announcements/SystemMessageCard";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageTransition } from "@/components/motion/PageTransition";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import type {
  CategoryOut,
  DashboardAlertOut,
  IncomeReminderOut,
  OnboardingV2RecordOut,
  TransactionOut,
} from "@/lib/types";
import {
  applySalaryNotificationAction,
  buildLiveSalaryNotification,
  extractLatestSalaryScheduleProfile,
  isBetaAuthorized,
  markSalaryPromptSeen,
  type SalaryNotificationScenario,
  type SalaryNotificationState,
} from "@/lib/salaryNotifications";
import {
  getLocaleDirection,
  type FloussyLocale,
} from "@/lib/localePreference";
import { getArabicDisplayName } from "@/lib/arabicDisplayName";
import { useForceArabicDocumentFont } from "@/lib/appLocale";
import {
  getBrowserLocalePreference,
  openLanguagePicker,
} from "@/components/i18n/LanguagePreferenceGate";
import { writeGlobalToursDisabled } from "@/lib/tourFlags";
import { getAppVersionLabel } from "@/lib/app-version";
import { QuickTxProvider } from "@/state/QuickTxContext";
import { QuickTxModal } from "@/components/dashboard/QuickTxModal";

const NOTIFICATION_STORAGE_PREFIX = "floussy.notifications.read";
const NOTIFICATION_DISMISS_STORAGE_PREFIX = "floussy.notifications.dismissed";
const NOTIFICATION_DISMISS_SNOOZE_MS = 24 * 60 * 60 * 1000;
const SALARY_NOTIFICATION_STORAGE_PREFIX = "floussy.salary-notifications.beta";
const APP_DATA_UPDATED_EVENT = "floussy:data-updated";
const REGISTER_FORCE_ONBOARDING_KEY = "floussy.register.force_onboarding_v2";
const ONBOARDING_MANUAL_BACK_OVERRIDE_KEY = "floussy.onboarding.manual_back_override";
const TOUR_FORCE_TOKEN_STORAGE_KEY = "floussy.tour.force.applied";
const DASHBOARD_INTRO_SEEN_KEY = "floussy.dashboard.intro.seen";
const REGULATION_INTRO_SEEN_KEY = "floussy.regulation.intro.seen";
// Allow exiting the money-plan guard after visiting /distribution (standalone distribution UI).
// Session-scoped by design so it doesn't permanently weaken onboarding enforcement.
const MONEY_PLAN_GUARD_BYPASS_KEY = "floussy.money_plan.guard_bypass";
const SALARY_KEYWORDS = [
  "salaire",
  "salary",
  "payroll",
  "wage",
  "paycheck",
  "salario",
  "راتب",
];

type AppNotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "neutral" | "warning" | "danger" | "success";
  icon: typeof Bell;
  meta?: string;
  onSelect?: () => void;
  dismissible?: boolean;
};

type DismissedNotificationEntry = {
  id: string;
  snoozed_until: number;
};
const NOTIFICATION_TONE_STYLES = {
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-rose-50 text-rose-600",
  neutral: "bg-slate-100 text-slate-600",
} as const;

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/envelopes", label: "Envelopes", icon: Wallet },
  { href: "/distribution", label: "Distribution", icon: SlidersHorizontal },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/beta", label: "Beta", icon: FlaskConical },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/aide", label: "Aide", icon: CircleHelp },
  { href: "/reports", label: "Reports", icon: ChartBar },
  { href: "/settings", label: "Settings", icon: Settings },
];
const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const APP_SHELL_COPY = {
  fr: {
    workspace: "Workspace",
    workspaceCaption: "Pilotage budget en temps reel",
    navigation: "Navigation",
    live: "Live",
    activeSession: "Session active",
    account: "Compte",
    loading: "Chargement...",
    logout: "Deconnexion",
    openMenu: "Open menu",
    notifications: "Notifications",
    language: "Langue",
    noNotifications: "Aucune notification pour l’instant",
    unread: (count: number) => `${count} non lue(s)`,
    markAllRead: "Tout lire",
    fixNow: "Régler",
    markNormal: "C’est normal",
    budgetUpToDate: "Rien à signaler. Ton budget est à jour.",
    notificationsFooter:
      "Les notifications sont mises à jour automatiquement selon ta période.",
    duplicateAlertTitle: "Doublons détectés dans les transactions",
    duplicateAlertDescription: (count: number) =>
      `${count} transaction(s) en trop ont été trouvées dans l’historique.`,
    duplicateAlertMeta: "Action requise",
    userSubtitle: "Envelope-first finance",
    nav: {
      "/dashboard": "Tableau de bord",
      "/transactions": "Transactions",
      "/envelopes": "Enveloppes",
      "/distribution": "Distribution",
      "/goals": "Objectifs",
      "/beta": "Beta",
      "/chat": "Chat",
      "/aide": "Aide",
      "/reports": "Rapports",
      "/settings": "Parametres",
    } as Record<string, string>,
    betaNotificationsLink: "Voir le Centre de Notifications",
  },
  en: {
    workspace: "Workspace",
    workspaceCaption: "Real-time budget control",
    navigation: "Navigation",
    live: "Live",
    activeSession: "Active session",
    account: "Account",
    loading: "Loading...",
    logout: "Logout",
    openMenu: "Open menu",
    notifications: "Notifications",
    language: "Language",
    noNotifications: "No notifications yet",
    unread: (count: number) => `${count} unread`,
    markAllRead: "Mark all as read",
    fixNow: "Fix now",
    markNormal: "Looks normal",
    budgetUpToDate: "Nothing new. Your budget is up to date.",
    notificationsFooter:
      "Notifications update automatically based on your current period.",
    duplicateAlertTitle: "Duplicate transactions detected",
    duplicateAlertDescription: (count: number) =>
      `${count} extra transaction(s) were found in your history.`,
    duplicateAlertMeta: "Action required",
    userSubtitle: "Envelope-first finance",
    nav: {
      "/dashboard": "Dashboard",
      "/transactions": "Transactions",
      "/envelopes": "Envelopes",
      "/distribution": "Distribution",
      "/goals": "Goals",
      "/beta": "Beta",
      "/chat": "Chat",
      "/aide": "Help",
      "/reports": "Reports",
      "/settings": "Settings",
    } as Record<string, string>,
    betaNotificationsLink: "View Notification Center",
  },
  ar: {
    workspace: "المجال ديالك",
    workspaceCaption: "قيادة الميزانية فالوقت الحقيقي",
    navigation: "التنقل",
    live: "شغال",
    activeSession: "الجلسة الحالية",
    account: "الحساب",
    loading: "كيتحمّل...",
    logout: "تسجيل الخروج",
    openMenu: "حل اللائحة",
    notifications: "الإشعارات",
    language: "اللغة",
    noNotifications: "ما كاين حتى إشعار دابا",
    unread: (count: number) => `${count} ما تقراوش`,
    markAllRead: "علّمهم كاملين كمقرويين",
    fixNow: "صلّح دابا",
    markNormal: "عادي ومزيان",
    budgetUpToDate: "ما كاين ما يتدار. الميزانية ديالك مزيانة دابا.",
    notificationsFooter:
      "الإشعارات كيتحدّثو بوحدهم حسب الفترة اللي خدام بها.",
    duplicateAlertTitle: "لقينا عمليات مكررين",
    duplicateAlertDescription: (count: number) =>
      `كاينين ${count} عمليات زايدين مكررين فالتاريخ.`,
    duplicateAlertMeta: "خاص التصحيح",
    userSubtitle: "تنظيم الفلوس بالأظرفة",
    nav: {
      "/dashboard": "لوحة القيادة",
      "/transactions": "العمليات",
      "/envelopes": "الأظرفة",
      "/distribution": "التوزيع",
      "/goals": "الأهداف",
      "/beta": "بيتا",
      "/chat": "المحادثة",
      "/aide": "المساعدة",
      "/reports": "التقارير",
      "/settings": "الإعدادات",
    } as Record<string, string>,
    betaNotificationsLink: "عرض مركز الإشعارات",
  },
} satisfies Record<
  FloussyLocale,
  {
    workspace: string;
    workspaceCaption: string;
    navigation: string;
    live: string;
    activeSession: string;
    account: string;
    loading: string;
    logout: string;
    openMenu: string;
    notifications: string;
    language: string;
    noNotifications: string;
    unread: (count: number) => string;
    markAllRead: string;
    fixNow: string;
    markNormal: string;
    budgetUpToDate: string;
    notificationsFooter: string;
    duplicateAlertTitle: string;
    duplicateAlertDescription: (count: number) => string;
    duplicateAlertMeta: string;
    userSubtitle: string;
    nav: Record<string, string>;
    betaNotificationsLink: string;
  }
>;

const APP_MODAL_COPY = {
  fr: {
    leaderboardTitle: "Choisis ton pseudo de classement",
    leaderboardDescription:
      "Le ranking est actif pour tous. Ton pseudo est public. Tu peux le changer 2 fois par mois.",
    leaderboardRule1: "Pseudo propre obligatoire (insultes interdites).",
    leaderboardRule2:
      "En cas d’abus, le compte peut être suspendu 10 jours par un filtre automatique.",
    leaderboardLabel: "Ton pseudo (3 à 20 caractères)",
    leaderboardPlaceholder: "Ex: BudgetMaster",
    leaderboardSave: "Enregistrer mon pseudo",
    regulationTitle: "Action requise avant de continuer",
    regulationDescription: (count: number) =>
      `Nous avons détecté ${count} catégorie(s) non reliée(s) à une enveloppe. Pour bien classer tes dépenses, il faut corriger cela.`,
    regulationWarning: "Sans correction, tes dépenses ne seront pas bien rangées.",
    regulationOpen: "Ouvrir l’assistant",
    salaryTitle: "Beta salary reminder",
    salaryDescription:
      "Ce prompt est encore expérimental et se base uniquement sur les infos salaire du onboarding v2.",
    superadminOnly: "Seuls les superadmins peuvent se connecter.",
  },
  en: {
    leaderboardTitle: "Choose your leaderboard nickname",
    leaderboardDescription:
      "The ranking is active for everyone. Your nickname is public. You can change it twice a month.",
    leaderboardRule1: "A clean nickname is required (insults are forbidden).",
    leaderboardRule2:
      "In case of abuse, the account may be suspended for 10 days by an automatic filter.",
    leaderboardLabel: "Your nickname (3 to 20 characters)",
    leaderboardPlaceholder: "e.g. BudgetMaster",
    leaderboardSave: "Save my nickname",
    regulationTitle: "Action required before continuing",
    regulationDescription: (count: number) =>
      `We detected ${count} category(ies) not linked to an envelope. To classify your expenses properly, this must be fixed.`,
    regulationWarning: "Without this fix, your expenses will not be organized correctly.",
    regulationOpen: "Open the assistant",
    salaryTitle: "Beta salary reminder",
    salaryDescription:
      "This prompt is still experimental and only uses the salary information entered in onboarding v2.",
    superadminOnly: "Only superadmins can sign in.",
  },
  ar: {
    leaderboardTitle: "اختار الاسم ديالك فالكلاسمون",
    leaderboardDescription:
      "الترتيب خدام عند الجميع. الاسم ديالك كيبان للناس، وتقدر تبدلو غير جوج مرات فالشهر.",
    leaderboardRule1: "خاص الاسم يكون نقي وواضح، بلا سبان ولا إساءة.",
    leaderboardRule2:
      "إلا كان سوء استعمال، الحساب يقدر يتوقف 10 أيام بفلتر أوتوماتيكي.",
    leaderboardLabel: "الاسم ديالك فالكلاسمون (من 3 حتى 20 حرف)",
    leaderboardPlaceholder: "مثال: BudgetMaster",
    leaderboardSave: "سجّل الاسم ديالي",
    regulationTitle: "كاين إجراء خاصك ديرو قبل ما تكمل",
    regulationDescription: (count: number) =>
      `لقينا ${count} فئات ما مربوطاش مع حتى ظرف. باش المصاريف ديالك يتنظمو مزيان، خاصك تصلح هادشي.`,
    regulationWarning: "إلى ما تصلحش هادشي، المصاريف ديالك ما غاديش يترتبو مزيان.",
    regulationOpen: "حل المساعد",
    salaryTitle: "تذكير السالاير beta",
    salaryDescription:
      "هاد الـ prompt مازال تجريبي وكيتبنى غير على معلومات السالاير اللي دخلتي فـ onboarding v2.",
    superadminOnly: "غير السوبر أدمن اللي يقدرو يدخلو دابا.",
  },
} satisfies Record<
  FloussyLocale,
  {
    leaderboardTitle: string;
    leaderboardDescription: string;
    leaderboardRule1: string;
    leaderboardRule2: string;
    leaderboardLabel: string;
    leaderboardPlaceholder: string;
    leaderboardSave: string;
    regulationTitle: string;
    regulationDescription: (count: number) => string;
    regulationWarning: string;
    regulationOpen: string;
    salaryTitle: string;
    salaryDescription: string;
    superadminOnly: string;
  }
>;

const displayFont = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-fraunces",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
});

const arabicFont = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

function UserSummaryCard({
  initials,
  displayName,
  email,
  idleLabel,
  logoutLabel,
  onLogout,
  versionLabel,
  className = "",
}: {
  initials: string;
  displayName: string;
  email: string | null | undefined;
  idleLabel: string;
  logoutLabel: string;
  onLogout: () => void;
  versionLabel: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-[var(--surface)]/5 px-4 py-4 text-slate-100 ${className}`.trim()}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)]/10 text-sm font-semibold">
          {initials || "F"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-xs text-slate-300">{email || idleLabel}</p>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onLogout}
        className="mt-4 w-full justify-center border-white/15 bg-[var(--surface)]/10 text-white hover:bg-[var(--surface)]/15"
      >
        {logoutLabel}
      </Button>
      <p className="mt-3 text-center text-[11px] text-slate-300">7sabek {versionLabel}</p>
    </div>
  );
}

function hasReachedOnboardingReview(record: OnboardingV2RecordOut | null) {
  if (!record) return false;
  if (record.stage === "completed" || record.stage === "review") return true;
  const payload =
    record.payload && typeof record.payload === "object" ? record.payload : null;
  const answers =
    payload && typeof payload.answers === "object" && payload.answers
      ? (payload.answers as OnboardingAnswers)
      : null;
  const draftObjects = normalizeOnboardingDraftObjects(payload?.draft_objects, {
    answers: answers ?? undefined,
    storedStage:
      record.stage === "completed" || record.stage === "review" || record.stage === "in_progress"
        ? record.stage
        : undefined,
  });
  const rawDraftObjects =
    payload?.draft_objects && typeof payload.draft_objects === "object"
      ? (payload.draft_objects as Record<string, unknown>)
      : null;
  const hasExplicitPersistedProgress =
    rawDraftObjects?.onboarding_progress_v2 &&
    typeof rawDraftObjects.onboarding_progress_v2 === "object";
  const progress = readOnboardingProgressSnapshot(draftObjects.onboarding_progress_v2, {
    answers: answers ?? undefined,
    storedStage:
      record.stage === "completed" || record.stage === "review" || record.stage === "in_progress"
        ? record.stage
        : undefined,
  });
  return hasReachedOnboardingReviewProgress(progress, {
    allowImplicitMoneyPlanQuestions: Boolean(hasExplicitPersistedProgress),
  });
}

function hasCompletedMoneyPlanJourney(record: OnboardingV2RecordOut | null) {
  return record?.stage === "completed";
}

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const isAuthFailureMessage = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("not authenticated") ||
    normalized.includes("invalid token") ||
    normalized.includes("missing refresh token") ||
    normalized.includes("invalid refresh token") ||
    normalized.includes("user not found") ||
    normalized.includes("unauthorized") ||
    normalized.includes("bootstrap timeout") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("load failed")
  );
};

const extractOnboardingAnswers = (record: OnboardingV2RecordOut | null) => {
  const payload =
    record?.payload && typeof record.payload === "object" ? record.payload : null;
  const answers =
    payload && typeof payload.answers === "object" && payload.answers
      ? (payload.answers as Record<string, unknown>)
      : {};
  return answers;
};

const isSalaryLikeTransaction = (
  tx: TransactionOut,
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

const compareTransactionRecency = (a: TransactionOut, b: TransactionOut) => {
  const dateCmp = b.occurred_on.localeCompare(a.occurred_on);
  if (dateCmp !== 0) return dateCmp;
  const createdA = a.created_at ?? "";
  const createdB = b.created_at ?? "";
  const createdCmp = createdB.localeCompare(createdA);
  if (createdCmp !== 0) return createdCmp;
  return b.id.localeCompare(a.id);
};

const isLocalBrowserHost = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
};

const normalizeAmount = (value: string | number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed.toFixed(2);
};

const buildDuplicateTransactionKey = (tx: TransactionOut) =>
  [
    tx.type,
    tx.category_id,
    tx.occurred_on,
    normalizeAmount(tx.amount),
    normalizeText(tx.description ?? ""),
  ].join("|");

function AppLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const sanitizeJsonStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const mustBeJsonPrefixes = [
      "floussy.pageTour.state.",
      "floussy.notifications.read:",
      "floussy.notifications.dismissed:",
      "floussy.salary-notifications.beta:",
      "floussy.quickTx.expensePreference:",
    ];
    const mustBeJsonKeys = new Set<string>([
      "floussy_category_type_overrides",
      "floussy.dashboardPeriod.v1",
      "floussy.dismissedIncomeReminders.v1",
      "floussy.register.onboarding.prefill.v1",
      "floussy.register.onboarding.draft.v1",
    ]);
    const shouldValidateAsJson = (key: string) =>
      mustBeJsonKeys.has(key) ||
      mustBeJsonPrefixes.some((prefix) => key.startsWith(prefix));

    const toDelete: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !shouldValidateAsJson(key)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        JSON.parse(raw);
      } catch {
        toDelete.push(key);
      }
    }
    for (const key of toDelete) {
      window.localStorage.removeItem(key);
    }
  }, []);

  const applyForcedTourReplayIfNeeded = useCallback((user: AuthUser) => {
    if (typeof window === "undefined") return;
    const token = `${user.id}:${Number(user.force_tour_replay_version ?? 0)}`;
    const applied = window.localStorage.getItem(TOUR_FORCE_TOKEN_STORAGE_KEY);
    if (applied === token) return;
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (
        key.startsWith("floussy.pageTour.state.") ||
        key.startsWith("floussy.pageTour.done.") ||
        key.startsWith("floussy.pageTour.seen.")
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.push(DASHBOARD_INTRO_SEEN_KEY, REGULATION_INTRO_SEEN_KEY);
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
    window.localStorage.setItem(TOUR_FORCE_TOKEN_STORAGE_KEY, token);
  }, []);

  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userBootstrapLoading, setUserBootstrapLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [actAsId, setActAsId] = useState<string | null>(null);
  const lastPathRef = useRef<string | null>(null);
  const [dashboardAlerts, setDashboardAlerts] = useState<DashboardAlertOut | null>(
    null
  );
  const [incomeReminders, setIncomeReminders] = useState<IncomeReminderOut[]>([]);
  const [notificationTransactions, setNotificationTransactions] = useState<TransactionOut[]>(
    []
  );
  const [notificationCategories, setNotificationCategories] = useState<CategoryOut[]>([]);
  const [latestOnboardingV2Record, setLatestOnboardingV2Record] =
    useState<OnboardingV2RecordOut | null>(null);
  const [salaryNotificationState, setSalaryNotificationState] =
    useState<SalaryNotificationState>({ cycles: {} });
  const [salaryPromptScenario, setSalaryPromptScenario] =
    useState<SalaryNotificationScenario | null>(null);
  const [salaryPromptOpen, setSalaryPromptOpen] = useState(false);
  const [salaryPromptConfirmMode, setSalaryPromptConfirmMode] = useState(false);
  const [salaryPromptAmount, setSalaryPromptAmount] = useState("");
  const [salaryPromptAmountError, setSalaryPromptAmountError] = useState<string | null>(
    null
  );
  const [streakDays, setStreakDays] = useState<number | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<
    DismissedNotificationEntry[]
  >([]);
  const [regulationPromptOpen, setRegulationPromptOpen] = useState(false);
  const [leaderboardPromptOpen, setLeaderboardPromptOpen] = useState(false);
  const [leaderboardName, setLeaderboardName] = useState("");
  const [leaderboardSaving, setLeaderboardSaving] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const status = usePlatformStatus();
  const hasPathPrefix = useCallback(
    (prefix: string) =>
      Boolean(pathname && (pathname === prefix || pathname.startsWith(`${prefix}/`))),
    [pathname]
  );
  const isClassicOnboarding = hasPathPrefix("/onboarding");
  const isBetaOnboarding = hasPathPrefix("/beta/onboarding-v2");
  const isMoneyPlanJourney = hasPathPrefix("/khatat-lflous");
  const isDistributionPage = hasPathPrefix("/distribution");
  const isOnboardingRoute = Boolean(isClassicOnboarding || isBetaOnboarding);
  const shouldStayOnOnboardingFromQuery =
    isOnboardingRoute && searchParams?.get("stay_on_onboarding") === "1";
  const isGuestRegisterOnboarding =
    (isBetaOnboarding || isMoneyPlanJourney) && searchParams?.get("register") === "1";
  const isBetaPortalPage = hasPathPrefix("/beta/portal");
  const isBetaNotificationsPage = hasPathPrefix("/beta/notifications") || hasPathPrefix("/notifications");
  const isBetaChatPage = hasPathPrefix("/beta/chat") || hasPathPrefix("/chat");
  const isOnboarding = Boolean(
    isClassicOnboarding ||
    isBetaOnboarding ||
    isMoneyPlanJourney ||
    isBetaPortalPage ||
    isBetaNotificationsPage ||
    isBetaChatPage
  );
  const isRegulation = pathname?.startsWith("/regulation");
  const isGamification = pathname === "/gamification";
  const isGoals = pathname?.startsWith("/goals") ?? false;
  const isDashboard = pathname?.startsWith("/dashboard") ?? false;
  const rawDisplayName =
    user
      ? [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.email
      : "7sabek";
  const displayName =
    locale === "ar" && user
      ? getArabicDisplayName(
          [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
        ) || user.email
      : rawDisplayName;
  const betaAuthorized = isBetaAuthorized(user);
  const initials = displayName
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
  const shellCopy = APP_SHELL_COPY[locale];
  const appVersionLabel = getAppVersionLabel();
  const modalCopy = APP_MODAL_COPY[locale];
  const pageDir = getLocaleDirection(locale);
  useForceArabicDocumentFont(locale === "ar", "app-shell-ar-body");

  useEffect(() => {
    setHydrated(true);
  }, []);

  const maintenanceMessage =
    status?.maintenance_mode && status.maintenance_message
      ? status.maintenance_message
      : "";
  const maintenancePlacements = status?.maintenance_placements ?? [];
  const showMaintenanceBanner =
    Boolean(maintenanceMessage.trim()) &&
    maintenancePlacements.includes("app_header");
  const appHeaderAnnouncements = getVisibleAnnouncements(
    status,
    user,
    "app_header"
  );
  const showAnnouncementBanner = appHeaderAnnouncements.length > 0;
  const visibleNavItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (!("betaOnly" in item) || !item.betaOnly) return true;
        return betaAuthorized;
      }),
    [betaAuthorized]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !isOnboardingRoute) return;
    if (shouldStayOnOnboardingFromQuery) {
      window.sessionStorage.setItem(ONBOARDING_MANUAL_BACK_OVERRIDE_KEY, "1");
    }
  }, [isOnboardingRoute, shouldStayOnOnboardingFromQuery]);

  useEffect(() => {
    sanitizeJsonStorage();
  }, [sanitizeJsonStorage]);

  useEffect(() => {
    writeGlobalToursDisabled(status?.guided_tours_enabled === false);
  }, [status?.guided_tours_enabled]);

  useEffect(() => {
    const load = async () => {
      setUserBootstrapLoading(true);
      try {
        const me = await Promise.race<AuthUser>([
          fetchMe({ suppressAuthRedirect: true }),
          new Promise<AuthUser>((_, reject) =>
            window.setTimeout(() => reject(new Error("bootstrap timeout")), 8000)
          ),
        ]);
        setUser(me);
        applyForcedTourReplayIfNeeded(me);
        if (me.role === "superadmin") {
          const actAs =
            typeof window !== "undefined"
              ? window.sessionStorage.getItem("floussy.superadmin.act_as")
              : null;
          if (!actAs) {
            router.push("/superadmin");
            return;
          }
        }
        const records = await apiFetch<OnboardingV2RecordOut[]>(
          "/users/me/onboarding-v2-records?limit=1"
        ).catch(() => [] as OnboardingV2RecordOut[]);
        const latestRecord = records[0] ?? null;
        const onboardingCompleted = hasReachedOnboardingReview(latestRecord);
        const moneyPlanCompleted = hasCompletedMoneyPlanJourney(latestRecord);

        if (me.force_onboarding_v2_review) {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(ONBOARDING_MANUAL_BACK_OVERRIDE_KEY);
          }
          if (!onboardingCompleted) {
            if (!isClassicOnboarding && !isBetaOnboarding) {
              router.push("/onboarding?forced_review=1");
            }
            return;
          }
          if (!moneyPlanCompleted) {
            if (!isMoneyPlanJourney && !isDistributionPage) {
              router.push("/khatat-lflous");
            }
            return;
          }
          if (isClassicOnboarding || isBetaOnboarding || isMoneyPlanJourney) {
            router.replace("/dashboard");
          }
          return;
        }

        if (!onboardingCompleted) {
          if (!isClassicOnboarding && !isBetaOnboarding) {
            router.push("/onboarding");
          }
          return;
        }

        if (moneyPlanCompleted) {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(MONEY_PLAN_GUARD_BYPASS_KEY);
          }
          if (isMoneyPlanJourney && !isDistributionPage) {
            router.replace("/dashboard");
          }
          return;
        }

        if (!moneyPlanCompleted) {
          if (!isMoneyPlanJourney && !isDistributionPage) {
            const bypassGuard =
              typeof window !== "undefined" &&
              window.sessionStorage.getItem(MONEY_PLAN_GUARD_BYPASS_KEY) === "1";
            if (bypassGuard) {
              return;
            }
            const hasManualBackOverride =
              typeof window !== "undefined" &&
              window.sessionStorage.getItem(ONBOARDING_MANUAL_BACK_OVERRIDE_KEY) === "1";
            const shouldBypassMoneyPlanRedirect =
              (isClassicOnboarding || isBetaOnboarding) &&
              (shouldStayOnOnboardingFromQuery || hasManualBackOverride);
            if (shouldBypassMoneyPlanRedirect) {
              return;
            }
            router.push("/khatat-lflous");
          }
          return;
        }
      } catch (error) {
        if (isGuestRegisterOnboarding) {
          setUser(null);
          return;
        }
        const message = error instanceof Error ? error.message : "";
        if (!isAuthFailureMessage(message)) {
          console.warn("App shell user bootstrap failed; forcing login fallback:", error);
        }
        setUser(null);
        router.push("/login");
        return;
      } finally {
        setUserBootstrapLoading(false);
      }
    };
    load();
  }, [
    isBetaOnboarding,
    isClassicOnboarding,
    isDistributionPage,
    isGuestRegisterOnboarding,
    isMoneyPlanJourney,
    shouldStayOnOnboardingFromQuery,
    router,
    applyForcedTourReplayIfNeeded,
  ]);

  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user || isOnboarding) return;
    if (window.sessionStorage.getItem(REGISTER_FORCE_ONBOARDING_KEY) !== "1") return;
    router.push("/onboarding?post_register=1");
  }, [isOnboarding, router, user]);

  useEffect(() => {
    if (!user || isOnboarding) return;
    if (user.role !== "user") return;
    if (!user.leaderboard_name) {
      setLeaderboardName("");
      setLeaderboardPromptOpen(true);
      return;
    }
    setLeaderboardPromptOpen(false);
  }, [user, isOnboarding]);

  useEffect(() => {
    if (!user || isOnboarding) return;
    if (user.role !== "user") return;
    let cancelled = false;
    const loadStreak = async () => {
      try {
        const summary = await apiFetch<{ current_streak_days: number }>(
          "/gamification/summary"
        );
        if (cancelled) return;
        setStreakDays(summary.current_streak_days ?? 0);
      } catch {
        if (cancelled) return;
        setStreakDays(null);
      }
    };
    loadStreak();
    return () => {
      cancelled = true;
    };
  }, [user, isOnboarding, pathname]);

  useEffect(() => {
    if (!user || isOnboarding) return;
    let cancelled = false;
    let inFlight = false;
    let lastRefreshAt = 0;
    let scheduledRefresh: number | null = null;
    const intervalMs = isLocalBrowserHost() ? 30_000 : 15_000;
    const minRefreshGapMs = isLocalBrowserHost() ? 5_000 : 2_500;
    const refreshNotifications = async () => {
      if (inFlight || cancelled) return;
      const now = Date.now();
      if (now - lastRefreshAt < minRefreshGapMs) return;
      inFlight = true;
      lastRefreshAt = now;
      try {
        // Run one protected call first so token refresh (if needed) happens once,
        // then fan out the remaining calls without triggering a 401 burst.
        const [alertsResult] = await Promise.allSettled([
          apiFetch<DashboardAlertOut>("/dashboard/alerts"),
        ]);
        if (cancelled) return;

        if (alertsResult.status === "fulfilled") {
          setDashboardAlerts(alertsResult.value);
        }
        if (isDashboard) {
          return;
        }

        const [remindersResult, recordsResult, txsResult, catsResult] = await Promise.allSettled([
          apiFetch<IncomeReminderOut[]>("/income-reminders"),
          apiFetch<OnboardingV2RecordOut[]>("/users/me/onboarding-v2-records?limit=1"),
          apiFetch<TransactionOut[]>("/transactions?limit=25"),
          apiFetch<CategoryOut[]>("/categories"),
        ]);
        if (cancelled) return;

        if (alertsResult.status === "fulfilled") {
          setDashboardAlerts(alertsResult.value);
        }
        if (remindersResult.status === "fulfilled") {
          setIncomeReminders(remindersResult.value);
        }
        if (recordsResult.status === "fulfilled") {
          setLatestOnboardingV2Record(recordsResult.value[0] ?? null);
        }
        if (txsResult.status === "fulfilled") {
          setNotificationTransactions(txsResult.value);
        }
        if (catsResult.status === "fulfilled") {
          setNotificationCategories(catsResult.value);
        }
        const allFailed =
          alertsResult.status === "rejected" &&
          remindersResult.status === "rejected" &&
          recordsResult.status === "rejected" &&
          txsResult.status === "rejected" &&
          catsResult.status === "rejected";
        if (allFailed) {
          setDashboardAlerts(null);
          setIncomeReminders([]);
          setLatestOnboardingV2Record(null);
          setNotificationTransactions([]);
          setNotificationCategories([]);
        }
      } catch {
        if (cancelled) return;
        setDashboardAlerts(null);
        setIncomeReminders([]);
        setLatestOnboardingV2Record(null);
        setNotificationTransactions([]);
        setNotificationCategories([]);
      } finally {
        inFlight = false;
      }
    };

    const queueRefresh = (delayMs = 250) => {
      if (cancelled) return;
      if (scheduledRefresh) {
        window.clearTimeout(scheduledRefresh);
      }
      scheduledRefresh = window.setTimeout(() => {
        scheduledRefresh = null;
        void refreshNotifications();
      }, delayMs);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        queueRefresh(350);
      }
    };
    const handleDataUpdated = () => {
      queueRefresh(500);
    };

    void refreshNotifications();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
      }
    }, intervalMs);
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(APP_DATA_UPDATED_EVENT, handleDataUpdated);

    return () => {
      cancelled = true;
      if (scheduledRefresh) {
        window.clearTimeout(scheduledRefresh);
      }
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(APP_DATA_UPDATED_EVENT, handleDataUpdated);
    };
  }, [user, pathname, isOnboarding, betaAuthorized, isDashboard]);

  const effectiveUnmappedCategoriesCount = useMemo(() => {
    return dashboardAlerts?.unmapped_categories ?? 0;
  }, [dashboardAlerts?.unmapped_categories]);

  useEffect(() => {
    if (!user || isOnboarding || isRegulation) return;
    if (effectiveUnmappedCategoriesCount > 0) {
      setRegulationPromptOpen(true);
    } else {
      setRegulationPromptOpen(false);
    }
  }, [user, isOnboarding, isRegulation, effectiveUnmappedCategoriesCount, router]);

  useEffect(() => {
    setMobileNavOpen(false);
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("tour-mobile-nav-open");
      setActAsId(window.sessionStorage.getItem("floussy.superadmin.act_as"));
    }
  }, [pathname]);


  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const syncFromTour = () => {
      const shouldOpen = root.classList.contains("tour-mobile-nav-open");
      if (shouldOpen) {
        setMobileNavOpen(true);
      }
    };
    const observer = new MutationObserver(syncFromTour);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    syncFromTour();
    return () => observer.disconnect();
  }, []);

  const handleLeaderboardSave = async () => {
    const value = leaderboardName.trim();
    if (!value) {
      setLeaderboardError("Le pseudo est obligatoire.");
      return;
    }
    if (!/^[A-Za-z0-9 _.-]{3,20}$/.test(value)) {
      setLeaderboardError(
        "3 à 20 caractères (lettres, chiffres, espaces, . _ -)."
      );
      return;
    }
    setLeaderboardSaving(true);
    setLeaderboardError(null);
    try {
      const updated = await apiFetch<AuthUser>("/users/me/profile", {
        method: "PATCH",
        body: { leaderboard_name: value },
      });
      setUser(updated);
      setLeaderboardPromptOpen(false);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Erreur";
      if (raw.includes("PSEUDO_CHANGE_LIMIT")) {
        setLeaderboardError("Limite atteinte: 2 changements par mois.");
      } else if (raw.includes("PSEUDO_BLOCKED_FOR_ABUSE")) {
        setLeaderboardError("Pseudo interdit: suspension automatique 10 jours.");
      } else if (raw.includes("PSEUDO_CHARS_INVALID")) {
        setLeaderboardError("Caractères invalides dans le pseudo.");
      } else {
        setLeaderboardError(raw);
      }
    } finally {
      setLeaderboardSaving(false);
    }
  };

  const dueIncomeReminders = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return incomeReminders.filter(
      (reminder) =>
        reminder.is_active &&
        reminder.next_due_on &&
        reminder.next_due_on <= today
    );
  }, [incomeReminders]);

  const hasBlockingAnomaly = effectiveUnmappedCategoriesCount > 0;

  const salaryNotificationStorageKey = user?.id
    ? `${SALARY_NOTIFICATION_STORAGE_PREFIX}:${user.id}`
    : null;

  const salaryScheduleProfile = useMemo(
    () =>
      betaAuthorized
        ? extractLatestSalaryScheduleProfile(latestOnboardingV2Record?.payload)
        : null,
    [betaAuthorized, latestOnboardingV2Record]
  );

  const betaSalaryNotification = useMemo(
    () =>
      betaAuthorized
        ? buildLiveSalaryNotification(salaryScheduleProfile, salaryNotificationState)
        : null,
    [betaAuthorized, salaryScheduleProfile, salaryNotificationState]
  );

  const activeDismissedNotificationIds = useMemo(() => {
    const now = Date.now();
    return dismissedNotifications
      .filter((entry) => entry.snoozed_until > now)
      .map((entry) => entry.id);
  }, [dismissedNotifications]);

  const rawNotifications = useMemo(() => {
    const items: AppNotificationItem[] = [];
    const categoryNameById = new Map(
      notificationCategories.map((category) => [category.id, category.name])
    );
    const answers = extractOnboardingAnswers(latestOnboardingV2Record);
    const profile = extractLatestSalaryScheduleProfile(latestOnboardingV2Record?.payload);
    const incomeType =
      typeof answers.Q0_income_type === "string" ? answers.Q0_income_type : "";
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
    const currentPeriod = dashboardAlerts?.current_period ?? null;

    const currentPeriodKey =
      currentPeriod?.start && currentPeriod?.end
        ? `${currentPeriod.start}:${currentPeriod.end}`
        : "no-period";
    const duplicateGroups = new Map<string, TransactionOut[]>();
    notificationTransactions.forEach((tx) => {
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
    const withHistoryFilters = (
      baseHref: string,
      options?: {
        openHistory?: boolean;
        openDuplicates?: boolean;
        type?: "income" | "expense";
        from?: string;
        to?: string;
        search?: string;
      }
    ) => {
      const params = new URLSearchParams();
      if (options?.openHistory) params.set("history_open", "1");
      if (options?.openDuplicates) params.set("duplicates_open", "1");
      if (options?.type) params.set("history_type", options.type);
      if (options?.from) params.set("history_from", options.from);
      if (options?.to) params.set("history_to", options.to);
      if (options?.search) params.set("history_search", options.search);
      const query = params.toString();
      return query ? `${baseHref}&${query}` : baseHref;
    };

    if (duplicateCount > 0) {
      const duplicateSignature = duplicateTransactions
        .flatMap((group) => group.map((tx) => tx.id))
        .sort()
        .join("|");
      items.push({
        id: `anomaly:transactions-duplicate:${duplicateCount}:${duplicateSignature}`,
        title: shellCopy.duplicateAlertTitle,
        description: shellCopy.duplicateAlertDescription(duplicateCount),
        href: withHistoryFilters("/transactions?type=all", {
          openHistory: true,
          openDuplicates: true,
        }),
        tone: "danger",
        icon: AlertTriangle,
        meta: shellCopy.duplicateAlertMeta,
        dismissible: true,
      });
    }

    if (incomeType === "salaried" && currentPeriod?.start && currentPeriod?.end) {
      const salaryLikeInPeriod = notificationTransactions.filter(
        (tx) =>
          tx.type === "income" &&
          tx.occurred_on >= currentPeriod.start &&
          tx.occurred_on <= currentPeriod.end &&
          isSalaryLikeTransaction(
            tx,
            categoryNameById.get(tx.category_id),
            expectedSalaryAmount
          )
      );
      const salaryDuplicateSignature = salaryLikeInPeriod
        .map((tx) => tx.id)
        .sort()
        .join("|");
      if (profile?.frequency === "monthly" && salaryLikeInPeriod.length > 1) {
        items.push({
          id: `anomaly:salary-duplicate-monthly:${currentPeriod.start}:${currentPeriod.end}:${salaryLikeInPeriod.length}:${salaryDuplicateSignature}`,
          title:
            locale === "ar"
              ? "تنبيه: السالاير تسجّل أكثر من مرة فهاد الدورة"
              : locale === "fr"
              ? "Anomalie: salaire déclaré plusieurs fois"
              : "Anomaly: salary declared more than once",
          description:
            locale === "ar"
              ? `لقينا ${salaryLikeInPeriod.length} تصريحات ديال السالاير فهاد الدورة.`
              : locale === "fr"
              ? `${salaryLikeInPeriod.length} déclarations salaire détectées sur la période active.`
              : `${salaryLikeInPeriod.length} salary-like income entries detected in the active period.`,
          href: withHistoryFilters("/transactions?type=income&issue=salary-duplicate", {
            openHistory: true,
            type: "income",
            from: currentPeriod.start,
            to: currentPeriod.end,
          }),
          tone: "danger",
          icon: AlertTriangle,
          meta: locale === "ar" ? "تصحيح ضروري" : locale === "fr" ? "Action requise" : "Action required",
          dismissible: true,
        });
      }
      if (salaryLikeInPeriod.length === 0) {
        items.push({
          id: `anomaly:salary-missing:${currentPeriod.start}:${currentPeriod.end}`,
          title:
            locale === "ar"
              ? "تنبيه: ما كاين حتى تصريح ديال السالاير فهاد الدورة"
              : locale === "fr"
              ? "Anomalie: salaire manquant sur la période"
              : "Anomaly: missing salary in current period",
          description:
            locale === "ar"
              ? "إلا توصلتي بالسالاير، صرّح به دابا باش التقارير ما يختالطوش."
              : locale === "fr"
              ? "Aucun salaire détecté sur la période active. Déclare-le si tu l’as déjà reçu."
              : "No salary detected in the active period. Declare it if already received.",
          href: withHistoryFilters("/transactions?type=income&issue=salary-missing", {
            type: "income",
            from: currentPeriod.start,
            to: currentPeriod.end,
          }),
          tone: "warning",
          icon: Clock,
          meta: locale === "ar" ? "متابعة" : locale === "fr" ? "A vérifier" : "Check",
          dismissible: true,
        });
      }
      if (expectedSalaryAmount && salaryLikeInPeriod.length > 0) {
        const latestSalary = [...salaryLikeInPeriod].sort(compareTransactionRecency)[0];
        const amount = Number(latestSalary.amount);
        const deviation = Math.abs(amount - expectedSalaryAmount) / expectedSalaryAmount;
        if (Number.isFinite(deviation) && deviation > 0.35) {
          const amountFingerprint = Number.isFinite(amount) ? amount.toFixed(2) : latestSalary.amount;
          items.push({
            id: `anomaly:salary-amount:${latestSalary.id}:${amountFingerprint}`,
            title:
              locale === "ar"
                ? "تنبيه: مبلغ السالاير مختلف على المتوقع"
                : locale === "fr"
                ? "Anomalie: montant salaire inhabituel"
                : "Anomaly: unusual salary amount",
              description:
                locale === "ar"
                  ? `المتوقع تقريباً ${expectedSalaryAmount.toFixed(2)} و التصريح الأخير هو ${amount.toFixed(2)}.`
                : locale === "fr"
                ? `Attendu ~${expectedSalaryAmount.toFixed(2)} ; reçu ${amount.toFixed(2)}.`
                : `Expected ~${expectedSalaryAmount.toFixed(2)}; latest entry is ${amount.toFixed(2)}.`,
            href: withHistoryFilters(
              `/transactions?type=income&issue=salary-amount&tx_id=${encodeURIComponent(latestSalary.id)}`,
              {
                openHistory: true,
                type: "income",
                from: currentPeriod.start,
                to: currentPeriod.end,
              }
            ),
            tone: "warning",
            icon: AlertTriangle,
            meta: locale === "ar" ? "راجِع القيمة" : locale === "fr" ? "Vérifier montant" : "Verify amount",
            dismissible: true,
          });
        }
      }
    }

    if (betaSalaryNotification) {
      items.push({
        id: betaSalaryNotification.id,
        title: betaSalaryNotification.title,
        description: betaSalaryNotification.description,
        href: "/onboarding",
        tone:
          betaSalaryNotification.state === "delayed"
            ? "warning"
            : betaSalaryNotification.certainty === "confident"
            ? "success"
            : "neutral",
        icon: Wallet,
        meta: `Beta · ${betaSalaryNotification.meta}`,
        onSelect: () => {
          setSalaryPromptScenario(betaSalaryNotification);
          setSalaryPromptOpen(true);
        },
        dismissible: true,
      });
    }
    if (dueIncomeReminders.length > 0) {
      const names = dueIncomeReminders.map((item) => item.name).filter(Boolean);
      const dueOnSignature = dueIncomeReminders
        .map((item) => `${item.id}:${item.next_due_on ?? ""}`)
        .sort()
        .join(",");
      items.push({
        id: `income:${dueOnSignature}`,
        title:
          locale === "ar"
            ? `${dueIncomeReminders.length} دخل خاص يتصرّح`
            : locale === "en"
            ? `${dueIncomeReminders.length} income reminder(s)`
            : `${dueIncomeReminders.length} revenu(s) à déclarer`,
        description:
          names.length > 0
            ? `${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}`
            : locale === "ar"
            ? "صرّح بالدخل باش يتحدّث التوزيع فالأظرفة."
            : locale === "en"
            ? "Declare income to keep envelopes updated."
            : "Déclare tes revenus pour mettre à jour tes enveloppes.",
        href: withHistoryFilters("/transactions?type=income&issue=income-reminder", {
          type: "income",
          from: currentPeriod?.start,
          to: currentPeriod?.end,
        }),
        tone: "success",
        icon: Wallet,
        meta:
          locale === "ar"
            ? "خاص اليوم"
            : locale === "en"
            ? "Due today"
            : "À traiter aujourd’hui",
        dismissible: true,
      });
    }

    const needsFirstIncomeDeclaration = Boolean(
      dashboardAlerts?.sweep_bootstrap?.needs_first_income_declaration
    );
    if (needsFirstIncomeDeclaration) {
      items.push({
        id: "anomaly:first-income-declaration",
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
        href: "/transactions?open_new_income=1",
        tone: "warning",
        icon: Wallet,
        meta: locale === "ar" ? "خطوة أولى" : locale === "fr" ? "Première étape" : "First step",
        dismissible: true,
      });
    }
    if (effectiveUnmappedCategoriesCount > 0) {
      items.push({
        id: `unmapped:${currentPeriodKey}:${effectiveUnmappedCategoriesCount}`,
        title:
          locale === "ar"
            ? `${effectiveUnmappedCategoriesCount} فئة ما مربوطةش`
            : locale === "en"
            ? `${effectiveUnmappedCategoriesCount} unmapped categor${effectiveUnmappedCategoriesCount > 1 ? "ies" : "y"}`
            : `${effectiveUnmappedCategoriesCount} catégorie(s) non mappée(s)`,
        description:
          locale === "ar"
            ? "المصاريف ما غاديش تتوزع حتى تربط هاد الفئات بالأظرفة."
            : locale === "en"
            ? "Expenses will not be distributed until these categories are mapped."
            : "Tes dépenses ne seront pas réparties tant que les catégories ne sont pas reliées.",
        href: "/categories?issue=unmapped-categories",
        tone: "warning",
        icon: AlertTriangle,
        meta: locale === "ar" ? "إجراء ضروري" : locale === "en" ? "Action required" : "Action requise",
        dismissible: true,
      });
    }
    if (dashboardAlerts?.overspent_envelopes?.length) {
      items.push({
        id: `overspent:${currentPeriodKey}:${dashboardAlerts.overspent_envelopes.join("|")}`,
        title:
          locale === "ar"
            ? `${dashboardAlerts.overspent_envelopes.length} ظرف تجاوز السقف`
            : locale === "en"
            ? `${dashboardAlerts.overspent_envelopes.length} overspent envelope(s)`
            : `${dashboardAlerts.overspent_envelopes.length} enveloppe(s) dépassée(s)`,
        description: `${dashboardAlerts.overspent_envelopes
          .slice(0, 3)
          .join(", ")}${dashboardAlerts.overspent_envelopes.length > 3 ? "…" : ""}`,
        href: "/envelopes?issue=overspent-envelopes",
        tone: "danger",
        icon: AlertTriangle,
        meta: locale === "ar" ? "خص مراجعة" : locale === "en" ? "Needs review" : "À surveiller",
        dismissible: true,
      });
    }
    if (dashboardAlerts?.sweep_due) {
      items.push({
        id: `sweep:due:${currentPeriodKey}`,
        title:
          locale === "ar"
            ? "كاين Rollover خاص يتدار"
            : locale === "en"
            ? "Rollover is pending"
            : "Rollover à exécuter",
        description:
          locale === "ar"
            ? "نفّذ الـ sweep باش تسالي هاد الدورة وتوجد للي من بعدها."
            : locale === "en"
            ? "Run sweep to close this period and prepare the next one."
            : "Tu peux lancer le sweep pour clôturer la période et préparer la suivante.",
        href: "/sweeps?issue=sweep-due",
        tone: "neutral",
        icon: Clock,
        meta: locale === "ar" ? "فترة كتسنى" : locale === "en" ? "Pending period" : "Période en attente",
        dismissible: true,
      });
    }
    return items;
  }, [
    betaSalaryNotification,
    dashboardAlerts,
    dueIncomeReminders,
    effectiveUnmappedCategoriesCount,
    latestOnboardingV2Record,
    locale,
    notificationCategories,
    notificationTransactions,
    shellCopy,
  ]);

  const notifications = useMemo(
    () =>
      rawNotifications.filter(
        (item) => !activeDismissedNotificationIds.includes(item.id)
      ),
    [rawNotifications, activeDismissedNotificationIds]
  );

  const notificationStorageKey = user?.id
    ? `${NOTIFICATION_STORAGE_PREFIX}:${user.id}`
    : null;
  const dismissedNotificationStorageKey = user?.id
    ? `${NOTIFICATION_DISMISS_STORAGE_PREFIX}:${user.id}`
    : null;

  useEffect(() => {
    if (!notificationStorageKey) return;
    try {
      const stored = localStorage.getItem(notificationStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          setReadNotificationIds(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, [notificationStorageKey]);

  useEffect(() => {
    if (!notificationStorageKey) return;
    try {
      localStorage.setItem(
        notificationStorageKey,
        JSON.stringify(readNotificationIds)
      );
    } catch {
      // ignore
    }
  }, [readNotificationIds, notificationStorageKey]);

  useEffect(() => {
    if (!dismissedNotificationStorageKey) return;
    try {
      const stored = localStorage.getItem(dismissedNotificationStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          const now = Date.now();
          const normalized: DismissedNotificationEntry[] = parsed
            .map((item) => {
              if (typeof item === "string") {
                // Legacy format: convert to short-lived snooze instead of permanent hide.
                return { id: item, snoozed_until: now + NOTIFICATION_DISMISS_SNOOZE_MS };
              }
              if (
                item &&
                typeof item === "object" &&
                typeof (item as { id?: unknown }).id === "string" &&
                typeof (item as { snoozed_until?: unknown }).snoozed_until === "number"
              ) {
                return {
                  id: (item as { id: string }).id,
                  snoozed_until: (item as { snoozed_until: number }).snoozed_until,
                };
              }
              return null;
            })
            .filter(
              (item): item is DismissedNotificationEntry =>
                item !== null && item.snoozed_until > now
            );
          setDismissedNotifications(normalized);
        }
      }
    } catch {
      // ignore
    }
  }, [dismissedNotificationStorageKey]);

  useEffect(() => {
    if (!dismissedNotificationStorageKey) return;
    try {
      const now = Date.now();
      const activeEntries = dismissedNotifications.filter(
        (entry) => entry.snoozed_until > now
      );
      localStorage.setItem(
        dismissedNotificationStorageKey,
        JSON.stringify(activeEntries)
      );
    } catch {
      // ignore
    }
  }, [dismissedNotifications, dismissedNotificationStorageKey]);

  useEffect(() => {
    const now = Date.now();
    const rawIds = new Set(rawNotifications.map((item) => item.id));
    setDismissedNotifications((prev) =>
      prev.filter(
        (entry) => entry.snoozed_until > now && rawIds.has(entry.id)
      )
    );
  }, [rawNotifications]);

  useEffect(() => {
    if (!notificationStorageKey) return;
    setReadNotificationIds((prev) =>
      prev.filter((id) => notifications.some((item) => item.id === id))
    );
  }, [notifications, notificationStorageKey]);

  useEffect(() => {
    if (!salaryNotificationStorageKey || !betaAuthorized) {
      setSalaryNotificationState({ cycles: {} });
      return;
    }
    try {
      const stored = localStorage.getItem(salaryNotificationStorageKey);
      if (!stored) {
        setSalaryNotificationState({ cycles: {} });
        return;
      }
      const parsed = JSON.parse(stored) as SalaryNotificationState;
      if (parsed && typeof parsed === "object" && parsed.cycles && typeof parsed.cycles === "object") {
        setSalaryNotificationState(parsed);
        return;
      }
      setSalaryNotificationState({ cycles: {} });
    } catch {
      setSalaryNotificationState({ cycles: {} });
    }
  }, [salaryNotificationStorageKey, betaAuthorized]);

  useEffect(() => {
    if (!salaryNotificationStorageKey || !betaAuthorized) return;
    try {
      localStorage.setItem(
        salaryNotificationStorageKey,
        JSON.stringify(salaryNotificationState)
      );
    } catch {
      // ignore
    }
  }, [salaryNotificationState, salaryNotificationStorageKey, betaAuthorized]);

  useEffect(() => {
    if (!betaSalaryNotification || !betaSalaryNotification.shouldPrompt || isOnboarding) return;
    setSalaryPromptScenario(betaSalaryNotification);
    setSalaryPromptOpen(true);
    setSalaryNotificationState((prev) =>
      markSalaryPromptSeen(prev, betaSalaryNotification.cycleKey)
    );
  }, [betaSalaryNotification, isOnboarding]);

  const unreadCount = notifications.filter(
    (item) => !readNotificationIds.includes(item.id)
  ).length;

  const markNotificationRead = (id: string) => {
    setReadNotificationIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  };

  const dismissNotificationAsNormal = (id: string) => {
    const snoozedUntil = Date.now() + NOTIFICATION_DISMISS_SNOOZE_MS;
    setDismissedNotifications((prev) => {
      const withoutCurrent = prev.filter((entry) => entry.id !== id);
      return [...withoutCurrent, { id, snoozed_until: snoozedUntil }];
    });
    setReadNotificationIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  };

  const markAllNotificationsRead = () => {
    setReadNotificationIds(notifications.map((item) => item.id));
  };

  const handleSalaryPromptAction = (action: "confirmed" | "delayed") => {
    if (!salaryPromptScenario || !salaryScheduleProfile) return;
    if (action === "confirmed") {
      const parsedAmount = Number(salaryPromptAmount);
      if (!salaryPromptAmount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setSalaryPromptAmountError("دخل شحال توصّلتي به بالضبط.");
        return;
      }
      setSalaryNotificationState((prev) =>
        applySalaryNotificationAction(
          prev,
          salaryPromptScenario.cycleKey,
          action,
          salaryScheduleProfile,
          parsedAmount
        )
      );
      setReadNotificationIds((prev) =>
        prev.includes(salaryPromptScenario.id)
          ? prev
          : [...prev, salaryPromptScenario.id]
      );
      setSalaryPromptOpen(false);
      setSalaryPromptScenario(null);
      setSalaryPromptConfirmMode(false);
      setSalaryPromptAmount("");
      setSalaryPromptAmountError(null);
      return;
    }
    setSalaryNotificationState((prev) =>
      applySalaryNotificationAction(
        prev,
        salaryPromptScenario.cycleKey,
        action,
        salaryScheduleProfile
      )
    );
    setReadNotificationIds((prev) =>
      prev.includes(salaryPromptScenario.id)
        ? prev
        : [...prev, salaryPromptScenario.id]
    );
    setSalaryPromptOpen(false);
    setSalaryPromptScenario(null);
    setSalaryPromptConfirmMode(false);
    setSalaryPromptAmount("");
    setSalaryPromptAmountError(null);
  };

  useEffect(() => {
    if (!user || !pathname) return;
    if (isLocalBrowserHost()) {
      lastPathRef.current = pathname;
      return;
    }
    const referrer = typeof document !== "undefined" ? document.referrer : "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const isInternalNav = !!lastPathRef.current && lastPathRef.current !== pathname;
    const source = isInternalNav
      ? "internal"
      : !referrer || referrer.trim().length === 0
      ? "direct"
      : referrer.startsWith(origin)
      ? "internal"
      : "referral";
    const timerId = window.setTimeout(() => {
      apiFetch("/analytics/pageviews", {
        method: "POST",
        body: { path: pathname, referrer, source },
      }).catch(() => null);
    }, 1500);
    lastPathRef.current = pathname;
    return () => {
      window.clearTimeout(timerId);
    };
  }, [pathname, user]);

  const handleLogout = () => {
    logout()
      .catch(() => null)
      .finally(() => {
        setUser(null);
        router.push("/login");
      });
  };

  if (isClassicOnboarding) {
    return (
      <div
        lang="ar"
        dir="rtl"
        className={`min-h-screen bg-[var(--surface)] text-[var(--ink)] onboarding-route-ar ${arabicFont.className}`.trim()}
        style={{ fontFamily: `var(--font-cairo), "Cairo", sans-serif` }}
      >
        <PageTransition routeKey={pathname}>{children}</PageTransition>
      </div>
    );
  }

  if (isBetaOnboarding) {
    return (
      <div
        lang="ar"
        dir="rtl"
        className={`min-h-screen bg-[var(--surface)] text-[var(--ink)] onboarding-route-ar ${arabicFont.className}`.trim()}
        style={{ fontFamily: `var(--font-cairo), "Cairo", sans-serif` }}
      >
        <PageTransition routeKey={pathname}>{children}</PageTransition>
      </div>
    );
  }

  if (isRegulation) {
    return (
      <div className="min-h-screen bg-[#f6f1e9] text-[var(--ink)]">
        <div className="mx-auto w-full max-w-5xl px-6 pb-16 pt-10">
          <PageTransition routeKey={pathname}>{children}</PageTransition>
        </div>
      </div>
    );
  }

  if (isGamification || isGoals) {
    return (
      <div className="min-h-screen text-[var(--ink)]">
        <Dialog
          open={leaderboardPromptOpen}
          onOpenChange={(next) => {
            if (!next) return;
            setLeaderboardPromptOpen(next);
          }}
        >
          <DialogContent
            className="max-w-md"
            onInteractOutside={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{modalCopy.leaderboardTitle}</DialogTitle>
              <DialogDescription>{modalCopy.leaderboardDescription}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-[var(--muted)]">
              <p>{modalCopy.leaderboardRule1}</p>
              <p>{modalCopy.leaderboardRule2}</p>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <label htmlFor="leaderboard-modal" className="text-sm font-semibold">
                {modalCopy.leaderboardLabel}
              </label>
              <input
                id="leaderboard-modal"
                value={leaderboardName}
                onChange={(event) => setLeaderboardName(event.target.value)}
                placeholder={modalCopy.leaderboardPlaceholder}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
              />
              {leaderboardError ? (
                <p className="text-xs text-[var(--error)]">{leaderboardError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button onClick={handleLeaderboardSave} isLoading={leaderboardSaving}>
                {modalCopy.leaderboardSave}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={regulationPromptOpen && !isRegulation}
          onOpenChange={(next) => {
            if (!next && hasBlockingAnomaly) return;
            setRegulationPromptOpen(next);
          }}
        >
          <DialogContent
            className="max-w-md"
            onInteractOutside={(event) => {
              if (hasBlockingAnomaly) event.preventDefault();
            }}
            onEscapeKeyDown={(event) => {
              if (hasBlockingAnomaly) event.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>{modalCopy.regulationTitle}</DialogTitle>
              <DialogDescription>
                {modalCopy.regulationDescription(
                  effectiveUnmappedCategoriesCount
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {modalCopy.regulationWarning}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setRegulationPromptOpen(false);
                  router.push("/regulation");
                }}
              >
                {modalCopy.regulationOpen}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <PageTransition routeKey={pathname}>{children}</PageTransition>
      </div>
    );
  }

  return (
    <div
      dir={pageDir}
      data-app-locale={locale}
      style={
        locale === "ar"
          ? {
              fontFamily: `var(--font-cairo), "Cairo", sans-serif`,
            }
          : undefined
      }
      className={`app-shell-v2 relative min-h-screen overflow-hidden text-[var(--ink)] ${displayFont.variable} ${bodyFont.variable} ${arabicFont.variable} ${
        locale === "ar" ? arabicFont.className : ""
      } ${
        locale === "ar" ? "is-ar" : ""
      }`}
    >
      <div className="app-shell-v2__orb app-shell-v2__orb--one" aria-hidden />
      <div className="app-shell-v2__orb app-shell-v2__orb--two" aria-hidden />
      <div className="app-shell-v2__grid" aria-hidden />
      <Dialog
        open={leaderboardPromptOpen}
        onOpenChange={(next) => {
          if (!next) return;
          setLeaderboardPromptOpen(next);
        }}
      >
        <DialogContent
          className="max-w-md"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{modalCopy.leaderboardTitle}</DialogTitle>
            <DialogDescription>{modalCopy.leaderboardDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <p>{modalCopy.leaderboardRule1}</p>
            <p>{modalCopy.leaderboardRule2}</p>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <label htmlFor="leaderboard-modal" className="text-sm font-semibold">
              {modalCopy.leaderboardLabel}
            </label>
            <input
              id="leaderboard-modal"
              value={leaderboardName}
              onChange={(event) => setLeaderboardName(event.target.value)}
              placeholder={modalCopy.leaderboardPlaceholder}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
            />
            {leaderboardError ? (
              <p className="text-xs text-[var(--error)]">{leaderboardError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={handleLeaderboardSave} isLoading={leaderboardSaving}>
              {modalCopy.leaderboardSave}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={regulationPromptOpen && !isRegulation}
        onOpenChange={(next) => {
          if (!next && hasBlockingAnomaly) return;
          setRegulationPromptOpen(next);
        }}
      >
        <DialogContent
          className="max-w-md"
          onInteractOutside={(event) => {
            if (hasBlockingAnomaly) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (hasBlockingAnomaly) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{modalCopy.regulationTitle}</DialogTitle>
            <DialogDescription>
              {modalCopy.regulationDescription(effectiveUnmappedCategoriesCount)}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {modalCopy.regulationWarning}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setRegulationPromptOpen(false);
                router.push("/regulation");
              }}
            >
              {modalCopy.regulationOpen}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={salaryPromptOpen}
        onOpenChange={(next) => {
          setSalaryPromptOpen(next);
          if (!next) {
            setSalaryPromptScenario(null);
            setSalaryPromptConfirmMode(false);
            setSalaryPromptAmount("");
            setSalaryPromptAmountError(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{modalCopy.salaryTitle}</DialogTitle>
            <DialogDescription>{modalCopy.salaryDescription}</DialogDescription>
          </DialogHeader>
          {salaryPromptScenario ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {salaryPromptScenario.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {salaryPromptScenario.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-slate-700">
                    {salaryPromptScenario.meta}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1">
                    {salaryPromptScenario.frequencyLabel}
                  </span>
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1">
                    {salaryPromptScenario.timingLabel}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                فهاد المرحلة beta كنجرّبو غير الواجهة والحالة ديال التذكير. التأكيد الحقيقي للدخل غادي نربطوه من بعد.
              </div>
              {salaryPromptConfirmMode ? (
                <div className="rounded-2xl border border-slate-200 bg-[var(--surface)] px-4 py-4">
                  <p className="text-sm font-medium text-slate-900">
                    شحال توصّلتي به بالضبط؟
                  </p>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={salaryPromptAmount}
                    onChange={(event) => {
                      setSalaryPromptAmount(event.target.value);
                      if (salaryPromptAmountError) {
                        setSalaryPromptAmountError(null);
                      }
                    }}
                    placeholder="0"
                    className="mt-3"
                  />
                  {salaryPromptAmountError ? (
                    <p className="mt-2 text-xs text-rose-600">{salaryPromptAmountError}</p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      هاد الرقم غير للتست فمرحلة beta دابا.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setSalaryPromptOpen(false);
                router.push("/onboarding");
              }}
            >
              شوف preview beta
            </Button>
            <div className="flex gap-2">
              {salaryPromptConfirmMode ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSalaryPromptConfirmMode(false);
                      setSalaryPromptAmount("");
                      setSalaryPromptAmountError(null);
                    }}
                  >
                    رجع
                  </Button>
                  <Button onClick={() => handleSalaryPromptAction("confirmed")}>
                    أكد المبلغ
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => handleSalaryPromptAction("delayed")}
                  >
                    مازال
                  </Button>
                  <Button
                    onClick={() => {
                      setSalaryPromptConfirmMode(true);
                      setSalaryPromptAmount("");
                      setSalaryPromptAmountError(null);
                    }}
                  >
                    توصّلت به
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isOnboarding ? (
        <PageTransition routeKey={pathname}>{children}</PageTransition>
      ) : (
        <>
          <div
            className={`pointer-events-none fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] transition-opacity ${
              notificationsOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          <div className="relative mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:flex-row">
            <nav
              className="hidden w-full lg:block lg:w-72 lg:shrink-0 lg:self-start lg:sticky lg:top-8 lg:h-[calc(100dvh-4rem)]"
              data-tour="sidebar"
            >
              <div className="floussy-sidebar">
                <div className="floussy-sidebar__head">
                  <div className="floussy-sidebar__brand">
                    <BrandLogo
                      locale={locale}
                      tone="dark"
                      className="h-14 w-auto object-contain"
                    />
                  </div>
                </div>
                <ul className="floussy-nav-list floussy-scroll">
                  {visibleNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    const tourId = `nav-${item.href.replace("/", "")}`;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          data-tour={tourId}
                          className={`floussy-nav-item ${isActive ? "is-active" : ""}`}
                        >
                          <span className="navbox bg-hover-primary">
                            <span className="icon-box bgicn-hover-primary">
                              <Icon className="texthover-primary" aria-hidden />
                            </span>
                            <span className="floussy-nav-label">
                              {shellCopy.nav[item.href] ?? item.label}
                            </span>
                            <span className="floussy-nav-dot" aria-hidden />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <UserSummaryCard
                  initials={initials}
                  displayName={displayName}
                  email={user?.email}
                  idleLabel="—"
                  logoutLabel={shellCopy.logout}
                  onLogout={handleLogout}
                  versionLabel={appVersionLabel}
                  className="mx-4 mt-auto mb-4"
                />
              </div>
            </nav>

            <div className="flex-1">
              {user?.role === "superadmin" && actAsId ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  <span>
                    Mode superadmin actif · utilisateur ciblé: {actAsId}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.sessionStorage.removeItem("floussy.superadmin.act_as");
                      }
                      setActAsId(null);
                      router.refresh();
                    }}
                  >
                    Quitter le mode
                  </Button>
                </div>
              ) : null}
              {showMaintenanceBanner || showAnnouncementBanner ? (
                <div className="mb-4 flex flex-col gap-2">
                  {showMaintenanceBanner ? (
                    <SystemMessageCard
                      variant="maintenance"
                      message={maintenanceMessage}
                      suffix={modalCopy.superadminOnly}
                    />
                  ) : null}
                  {showAnnouncementBanner ? (
                    appHeaderAnnouncements.map((announcement) => (
                      <SystemMessageCard
                        key={announcement.id}
                        variant="announcement"
                        message={announcement.message}
                        announcementType={announcement.type}
                      />
                    ))
                  ) : null}
                </div>
              ) : null}
              <div className="floussy-topbar-wrap">
                <div className="floussy-topbar">
                  <div className="floussy-topbar__left">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="lg:hidden"
                      onClick={() => setMobileNavOpen(true)}
                      aria-label={shellCopy.openMenu}
                    >
                      <Menu className="h-5 w-5" aria-hidden />
                    </Button>
                  </div>
                  <div className="floussy-topbar__right">
                    {typeof streakDays === "number" ? (
                      <Link
                        href="/gamification"
                        className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
                        title="Voir le ranking"
                      >
                        <Flame className="h-4 w-4" />
                        <span>{streakDays}</span>
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={openLanguagePicker}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] shadow-sm transition hover:border-emerald-200 hover:text-emerald-600"
                      aria-label={shellCopy.language}
                      title={shellCopy.language}
                    >
                      <Globe className="h-4 w-4" />
                    </button>
                    {!hydrated ? (
                      <button
                        type="button"
                        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] shadow-sm transition hover:border-emerald-200 hover:text-emerald-600"
                        aria-label={shellCopy.notifications}
                      >
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 ? (
                          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white shadow">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] shadow-sm transition hover:border-emerald-200 hover:text-emerald-600"
                            aria-label={shellCopy.notifications}
                          >
                            <Bell className="h-4 w-4" />
                            {unreadCount > 0 ? (
                              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white shadow">
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </span>
                            ) : null}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          sideOffset={12}
                          className="w-[440px] rounded-3xl border border-slate-200 bg-slate-50 p-0 text-gray-900 shadow-2xl"
                        >
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {shellCopy.notifications}
                            </p>
                            <p className="text-xs text-slate-500">
                              {notifications.length === 0
                                ? shellCopy.noNotifications
                                : shellCopy.unread(unreadCount)}
                            </p>
                          </div>
                          {unreadCount > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={markAllNotificationsRead}
                              className="h-7 px-2 text-xs"
                            >
                              <Check className="mr-1 h-3 w-3" />
                              {shellCopy.markAllRead}
                            </Button>
                          ) : null}
                        </div>
                        <div className="max-h-[65vh] overflow-auto">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-slate-500">
                              {shellCopy.budgetUpToDate}
                            </div>
                          ) : (
                            notifications.map((item) => {
                              const isUnread = !readNotificationIds.includes(item.id);
                              const ToneIcon = item.icon;
                              const rowClass = `group border-b border-slate-100 px-4 py-3 transition ${
                                isUnread ? "bg-emerald-50/40" : "bg-[var(--surface)]"
                              } hover:bg-emerald-50/60`;
                              const content = (
                                <div className="flex w-full items-start gap-3 text-left">
                                  <span
                                    className={`mt-2 h-2 w-2 rounded-full ${
                                      isUnread ? "bg-emerald-500" : "bg-transparent"
                                    }`}
                                  />
                                  <span
                                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${NOTIFICATION_TONE_STYLES[item.tone]}`}
                                  >
                                    <ToneIcon className="h-5 w-5" />
                                  </span>
                                  <div className="flex-1 text-left">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-medium text-gray-900">
                                        {item.title}
                                      </p>
                                      {item.meta ? (
                                        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                          {item.meta}
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                      {item.description}
                                    </p>
                                  </div>
                                </div>
                              );
                              return (
                                <div key={item.id} className={rowClass}>
                                  {content}
                                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-8 rounded-xl px-3 text-xs"
                                      onClick={() => {
                                        markNotificationRead(item.id);
                                        setNotificationsOpen(false);
                                        if (item.onSelect) {
                                          item.onSelect();
                                          return;
                                        }
                                        router.push(item.href);
                                      }}
                                    >
                                      {shellCopy.fixNow}
                                    </Button>
                                    {item.dismissible ? (
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="h-8 rounded-xl px-3 text-xs"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          dismissNotificationAsNormal(item.id);
                                        }}
                                      >
                                        {shellCopy.markNormal}
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                        {notifications.length > 0 ? (
                          <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 text-center">
                            {shellCopy.notificationsFooter}
                          </div>
                        ) : null}
                        <div className="border-t border-slate-200/60 px-4 py-3 bg-slate-100/35 flex justify-center rounded-b-3xl">
                          <Link
                            href="/notifications"
                            onClick={() => setNotificationsOpen(false)}
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-black text-emerald-600 hover:text-emerald-700 hover:underline active:scale-95 transition-all"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>{shellCopy.betaNotificationsLink}</span>
                          </Link>
                        </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </div>
              <PageTransition routeKey={pathname}>{children}</PageTransition>
            </div>
          </div>

          <div
            data-tour-mobile-backdrop
            className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
              mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setMobileNavOpen(false)}
            aria-hidden={!mobileNavOpen}
          />
          <aside
            data-tour-mobile-nav
            className={`fixed top-0 z-50 h-full w-72 transform p-0 shadow-2xl transition-transform duration-300 lg:hidden ${
              pageDir === "rtl" ? "right-0" : "left-0"
            } ${
              mobileNavOpen
                ? "translate-x-0"
                : pageDir === "rtl"
                  ? "translate-x-full"
                  : "-translate-x-full"
            }`}
            role="dialog"
            aria-label={shellCopy.navigation}
          >
            <div className="floussy-sidebar floussy-sidebar--mobile">
              <div className="floussy-sidebar__head">
                <div className="floussy-sidebar__brand">
                  <BrandLogo
                    locale={locale}
                    tone="dark"
                    className="h-14 w-auto object-contain"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X className="h-5 w-5" aria-hidden />
                </Button>
              </div>
              <ul className="floussy-nav-list floussy-scroll">
                {visibleNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  const tourId = `nav-${item.href.replace("/", "")}`;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        data-tour={tourId}
                        className={`floussy-nav-item ${isActive ? "is-active" : ""}`}
                      >
                        <span className="navbox bg-hover-primary">
                          <span className="icon-box bgicn-hover-primary">
                            <Icon className="texthover-primary" aria-hidden />
                          </span>
                          <span className="floussy-nav-label">
                            {shellCopy.nav[item.href] ?? item.label}
                          </span>
                          <span className="floussy-nav-dot" aria-hidden />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <UserSummaryCard
                initials={initials}
                displayName={displayName}
                email={user?.email}
                idleLabel="—"
                logoutLabel={shellCopy.logout}
                onLogout={handleLogout}
                versionLabel={appVersionLabel}
                className="mx-4 mt-auto mb-4"
              />
            </div>
          </aside>
        </>
      )}
      {locale === "ar" ? (
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap');

          [data-app-locale="ar"],
          [data-app-locale="ar"] *,
          .app-shell-v2.is-ar,
          .app-shell-v2.is-ar * {
            font-family: "Cairo", sans-serif !important;
            font-optical-sizing: auto;
            font-variation-settings: "slnt" 0;
            letter-spacing: 0 !important;
          }

          [data-app-locale="ar"] svg,
          [data-app-locale="ar"] button svg,
          [data-app-locale="ar"] a svg,
          .app-shell-v2.is-ar svg,
          .app-shell-v2.is-ar button svg,
          .app-shell-v2.is-ar a svg {
            font-family: initial !important;
          }

          [data-app-locale="ar"] .app-display-font,
          .app-shell-v2.is-ar .app-display-font,
          [data-app-locale="ar"] .floussy-sidebar__app,
          .app-shell-v2.is-ar .floussy-sidebar__app,
          [data-app-locale="ar"] .floussy-brand__title,
          .app-shell-v2.is-ar .floussy-brand__title {
            font-family: "Cairo", sans-serif !important;
            letter-spacing: 0 !important;
          }

        `}</style>
      ) : null}
      <QuickTxModal />
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--surface)]" />}>
      <QuickTxProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </QuickTxProvider>
    </Suspense>
  );
}
