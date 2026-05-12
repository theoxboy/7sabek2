"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Car,
  Gauge,
  NotebookText,
  Settings,
  Timer,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { ShiftPilotStateOut } from "@/lib/types";
import { type FloussyLocale, getLocaleDirection } from "@/lib/localePreference";
import { LANGUAGE_CHANGED_EVENT, useForceArabicDocumentFont } from "@/lib/appLocale";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";

type AppType = "Lyft" | "DoorDash";
type SessionMode =
  | "Commute"
  | "Lunch peak"
  | "Dinner peak"
  | "Nightlife"
  | "Airport"
  | "Flexible";
type WeekStartDay = "Monday" | "Sunday";
type PreferredApps = "Lyft" | "DoorDash" | "both";
type ShiftPilotTemplate = "balanced" | "aggressive" | "weekend_focus";
type TabKey = "home" | "today" | "week" | "history" | "settings";
type DayPlanStatus = "planned" | "done" | "skipped";

interface ShiftPilotSettings {
  weeklyNetGoal: number;
  weeklyRental: number;
  minLyftRides: number;
  weekStartDay: WeekStartDay;
  minDailyHours: number;
  preferredMaxDailyHours: number;
  preferredBreakTimes: string;
  preferredApps: PreferredApps;
  preferredHourlyTarget: number;
  preferredPerRideTarget: number;
  alertIfUnderperforming: boolean;
  browserNotificationsEnabled: boolean;
}

interface ShiftPilotOnboardingState {
  completed: boolean;
  currentStep: 1 | 2 | 3 | 4;
  template: ShiftPilotTemplate;
}

interface WorkSession {
  id: string;
  appType: AppType;
  mode: SessionMode;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  earnings: number;
  tips: number;
  ridesOrDeliveries: number;
  gas: number;
  tolls: number;
  notes: string;
  targetEarnings: number | null;
  targetRides: number | null;
}

interface ActiveSession {
  id: string;
  appType: AppType;
  mode: SessionMode;
  startTime: string;
  pauseStartedAt: string | null;
  pausedSeconds: number;
  earnings: number;
  tips: number;
  ridesOrDeliveries: number;
  gas: number;
  tolls: number;
  notes: string;
  targetEarnings: number | null;
  targetRides: number | null;
}

interface DayPlanBlock {
  id: string;
  date: string;
  appType: AppType;
  startTime: string;
  endTime: string;
  mode: SessionMode;
  targetEarnings: number;
  targetRides: number;
  status: DayPlanStatus;
}

interface PersistedState {
  runtimeVersion: number;
  settings: ShiftPilotSettings;
  sessions: WorkSession[];
  dayPlanBlocks: DayPlanBlock[];
  activeSession: ActiveSession | null;
  selectedDate: string;
  lastApp: AppType;
  lastMode: SessionMode;
  onboarding: ShiftPilotOnboardingState;
}

interface WeeklyStats {
  weeklyGross: number;
  weeklyNet: number;
  lyftGross: number;
  doordashGross: number;
  rentalCovered: number;
  lyftRides: number;
  totalRides: number;
  hoursWorked: number;
  avgPerHour: number;
  avgPerRide: number;
  grossTarget: number;
  remainingGrossTarget: number;
  remainingNetTarget: number;
  remainingRental: number;
  remainingRides: number;
  remainingPlannedHours: number;
  requiredHourlyRate: number;
  behindGross: number;
  aheadGross: number;
  expectedGrossByNow: number;
  daysLeft: number;
}

interface Recommendation {
  app: AppType;
  title: string;
  details: string[];
  instruction: string[];
}

const STORAGE_KEY = "floussy.shiftpilot.runtime.v1";
const NOTIFICATION_SENT_KEY = "floussy.shiftpilot.notifications.sent";
const RUNTIME_VERSION = 2;
const REMOTE_SYNC_DEBOUNCE_MS = 900;
const LOCALE_TO_BCP47: Record<FloussyLocale, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-MA",
};
const APPS: AppType[] = ["Lyft", "DoorDash"];
const MODES: SessionMode[] = [
  "Commute",
  "Lunch peak",
  "Dinner peak",
  "Nightlife",
  "Airport",
  "Flexible",
];
const TAB_ITEMS: Array<{ key: TabKey; label: string; icon: typeof Car }> = [
  { key: "home", label: "Home", icon: Car },
  { key: "today", label: "Today", icon: Timer },
  { key: "week", label: "Week", icon: Gauge },
  { key: "history", label: "History", icon: NotebookText },
  { key: "settings", label: "Settings", icon: Settings },
];

const DEFAULT_SETTINGS: ShiftPilotSettings = {
  weeklyNetGoal: 1200,
  weeklyRental: 320,
  minLyftRides: 30,
  weekStartDay: "Monday",
  minDailyHours: 8,
  preferredMaxDailyHours: 11,
  preferredBreakTimes: "13:30-14:00",
  preferredApps: "both",
  preferredHourlyTarget: 29,
  preferredPerRideTarget: 9,
  alertIfUnderperforming: true,
  browserNotificationsEnabled: false,
};

const ONBOARDING_STEP_META: Array<{
  step: 1 | 2 | 3 | 4;
  title: string;
  description: string;
}> = [
  {
    step: 1,
    title: "Weekly setup",
    description: "Configure net goal, rental, minimum Lyft rides and week start.",
  },
  {
    step: 2,
    title: "Work preferences",
    description: "Define daily hours, preferred apps and break windows.",
  },
  {
    step: 3,
    title: "Schedule template",
    description: "Pick the weekly template that matches your driving style.",
  },
  {
    step: 4,
    title: "Benchmarks & alerts",
    description: "Set performance benchmarks and notification behavior.",
  },
];

const SHIFTPILOT_COPY = {
  fr: {
    setupFallback: "Setup",
    onboardingInProgress: "Onboarding guidé en cours",
    step: "Étape",
    continueSetup: "Continuer l'installation",
    quickActions: "Actions rapides",
    quickActionsDesc: "Les actions principales sont regroupées ici.",
    addEarnings: "Ajouter des gains",
    reviewDay: "Revoir la journée",
    tellMeNow: "Dis-moi quoi faire maintenant",
    latestClockOutReview: "Dernier bilan de fin de session",
    todayStatus: "Statut du jour",
    notClockedIn: "Aucune session active",
    offline: "hors ligne",
    start: "Début",
    earnings: "Gains",
    tips: "Pourboires",
    rides: "Courses",
    weeklyGrossGoal: "Objectif brut hebdo",
    remaining: "Reste",
    rentalCoverage: "Couverture location",
    remainingRental: "Reste location",
    lyftRidesMinimum: "Minimum de courses Lyft",
    remainingRides: "Courses restantes",
    hoursVsPlan: "Heures vs plan",
    remainingPlannedHours: "Heures planifiées restantes",
    whatShouldIDoNow: "Que dois-je faire maintenant ?",
    notifications: "Notifications",
    noUrgentAlert: "Aucune alerte urgente pour le moment.",
    liveSession: "Session en direct",
    noActiveSession: "Aucune session active",
    active: "active",
    timer: "Timer",
    started: "commencée à",
    deliveries: "Livraisons",
    tip: "Pourboire",
    expense: "Dépense",
    gas: "Essence",
    toll: "Péage",
    midSessionCoach: "Coach milieu de session",
    currentPace: "Rythme actuel",
    ifPaceContinues: "Si ce rythme continue, il reste",
    pause: "Pause",
    resume: "Reprendre",
    switchApp: "Changer d'app",
    clockOut: "Fin de session",
    clockIn: "Démarrer",
    noActiveSessionBody: "Aucune session active. Utilise Démarrer ou Lance ce bloc.",
    dayPlanner: "Plan du jour",
    addExtraBlock: "Ajouter un bloc",
    target: "Objectif",
    markSkipped: "Marquer ignoré",
    unskip: "Réactiver",
    startThisBlock: "Lancer ce bloc",
    editBlock: "Modifier le bloc",
    importantBlock: "Ce bloc est important parce que tu es en retard sur la cible hebdo.",
    canSkipBlock: "Tu peux ignorer un bloc faible si tu es largement en avance.",
    weeklyGross: "Brut hebdo",
    weeklyNet: "Net hebdo",
    avgPerHour: "Moyenne par heure",
    avgPerRide: "Moyenne par course",
    earningsByDay: "Gains par jour",
    hoursByDay: "Heures par jour",
    split: "Répartition Lyft vs DoorDash",
    smartInsights: "Insights intelligents",
    bestSession: "Meilleure session horaire",
    noDataYet: "Pas encore de données",
    tuesdayLunchAverage: "Moyenne DoorDash mardi midi",
    requiredHourlyRate: "Taux horaire requis maintenant",
    history: "Historique",
    openHistorySheet: "Ouvrir la feuille historique",
    searchPlaceholder: "Chercher app, mode, note",
    noSessionsFound: "Aucune session trouvée.",
    edit: "Modifier",
    delete: "Supprimer",
    weeklySetup: "Configuration hebdo",
    weeklyNetGoal: "Objectif net hebdo",
    weeklyRental: "Location hebdo",
    minimumLyftRides: "Minimum de courses Lyft",
    weekStartsOn: "La semaine commence",
    monday: "Lundi",
    sunday: "Dimanche",
    workPreferences: "Préférences de travail",
    minimumDailyHours: "Heures minimales par jour",
    preferredMaxDailyHours: "Heures max préférées par jour",
    preferredBreakTimes: "Créneaux de pause préférés",
    preferredApps: "Apps préférées",
    lyftOnly: "Lyft seulement",
    doordashOnly: "DoorDash seulement",
    bothApps: "Lyft + DoorDash",
    preferredHourlyTarget: "Objectif horaire préféré",
    preferredPerRideTarget: "Objectif par course préféré",
    alertWhenUnderperforming: "Alerter quand je suis en retard",
    enableBrowserNotifications: "Activer les notifications navigateur",
    permissionStatus: "Statut de permission",
    unsupported: "non supporté",
    requestNotificationPermission: "Demander la permission",
    notificationsUnsupported: "Les notifications navigateur ne sont pas supportées sur cet appareil.",
    saveSettings: "Enregistrer",
    resetDefaults: "Réinitialiser",
    scheduleTemplate: "Template d'horaire",
    balancedText: "Équilibré : trajets du matin + midi + soir répartis sur la semaine.",
    aggressiveText: "Agressif : longues plages en semaine + focus nuits vendredi/samedi.",
    weekendFocusText: "Focus week-end : semaine plus légère et week-end plus chargé.",
    runGuidedOnboarding: "Relancer l'onboarding guidé",
    applyTemplate: "Appliquer ce template à la semaine",
    home: "Accueil",
    today: "Aujourd'hui",
    week: "Semaine",
    settings: "Réglages",
    shiftpilotOnboarding: "Onboarding ShiftPilot",
    onboardingDesc: "Complète les 4 étapes pour configurer les objectifs, le planning et les alertes.",
    back: "Retour",
    next: "Suivant",
    finishOnboarding: "Terminer l'onboarding",
    selectApp: "Choisir l'app",
    plannedMode: "Mode prévu",
    earningsTargetOptional: "Objectif gains (optionnel)",
    ridesTargetOptional: "Objectif courses (optionnel)",
    cancel: "Annuler",
    startSession: "Démarrer la session",
    saveSession: "Enregistrer la session",
    totalEarnings: "Gains totaux",
    totalRidesDeliveries: "Courses / livraisons totales",
    gasExpense: "Essence",
    tollParking: "Péage / parking",
    notes: "Notes",
    duration: "Durée",
    grossPerHour: "Brut par heure",
    netAfterExpenses: "Net après dépenses",
    averagePerRide: "Moyenne par course",
    afterSaveAutoStart: "Après enregistrement : nouvelle session",
    nextApp: "App suivante",
    continue: "Continuer",
    addEarningsManually: "Ajouter des gains manuellement",
    createOrEditSession: "Crée ou modifie une session pour le suivi manuel et l'historique.",
    app: "App",
    mode: "Mode",
    date: "Date",
    startEnd: "Début / fin",
    update: "Mettre à jour",
    save: "Enregistrer",
    close: "Fermer",
    quickSnapshot: "Snapshot rapide du jour sélectionné.",
    gross: "Brut",
    remainingDayTarget: "Objectif restant aujourd'hui",
    ridesDone: "Courses faites",
    remainingRideTarget: "Objectif courses restant",
    tomorrowCarryOver: "Estimation du report demain",
    addBlock: "Ajouter un bloc",
    planEarningsAndRides: "Planifie les gains et les courses pour ce créneau.",
    targetEarnings: "Objectif gains",
    targetRides: "Objectif courses",
    saveBlock: "Enregistrer le bloc",
  },
  en: {
    setupFallback: "Setup",
    onboardingInProgress: "Guided onboarding in progress",
    step: "Step",
    continueSetup: "Continue setup",
    quickActions: "Quick Actions",
    quickActionsDesc: "Main actions are grouped here.",
    addEarnings: "Add Earnings",
    reviewDay: "Review Day",
    tellMeNow: "Tell Me What To Do Now",
    latestClockOutReview: "Latest clock out review",
    todayStatus: "Today status",
    notClockedIn: "Not clocked in",
    offline: "offline",
    start: "Start",
    earnings: "Earnings",
    tips: "Tips",
    rides: "Rides",
    weeklyGrossGoal: "Weekly Gross Goal",
    remaining: "Remaining",
    rentalCoverage: "Rental Coverage",
    remainingRental: "Remaining rental",
    lyftRidesMinimum: "Lyft rides minimum",
    remainingRides: "Remaining rides",
    hoursVsPlan: "Hours vs plan",
    remainingPlannedHours: "Remaining planned hours",
    whatShouldIDoNow: "What should I do now?",
    notifications: "Notifications",
    noUrgentAlert: "No urgent alert right now.",
    liveSession: "Live Session",
    noActiveSession: "No active session",
    active: "active",
    timer: "Timer",
    started: "started",
    deliveries: "Deliveries",
    tip: "Tip",
    expense: "Expense",
    gas: "Gas",
    toll: "Toll",
    midSessionCoach: "Mid-session coach",
    currentPace: "Current pace",
    ifPaceContinues: "If this pace continues, remaining weekly gross is",
    pause: "Pause",
    resume: "Resume",
    switchApp: "Switch App",
    clockOut: "Clock Out",
    clockIn: "Clock In",
    noActiveSessionBody: "No active session. Use Clock In or Start this block.",
    dayPlanner: "Day Planner",
    addExtraBlock: "Add extra block",
    target: "Target",
    markSkipped: "Mark skipped",
    unskip: "Unskip",
    startThisBlock: "Start this block",
    editBlock: "Edit block",
    importantBlock: "This block matters because you are behind weekly target.",
    canSkipBlock: "You can skip a low-value block if you are far ahead of target.",
    weeklyGross: "Weekly gross",
    weeklyNet: "Weekly net",
    avgPerHour: "Avg dollars per hour",
    avgPerRide: "Avg dollars per ride",
    earningsByDay: "Earnings by day",
    hoursByDay: "Hours by day",
    split: "Lyft vs DoorDash split",
    smartInsights: "Smart insights",
    bestSession: "Best hourly session",
    noDataYet: "No data yet",
    tuesdayLunchAverage: "Tuesday lunch DoorDash average",
    requiredHourlyRate: "Required hourly rate from now",
    history: "History",
    openHistorySheet: "Open History Sheet",
    searchPlaceholder: "Search app, mode, note",
    noSessionsFound: "No sessions found.",
    edit: "Edit",
    delete: "Delete",
    weeklySetup: "Weekly setup",
    weeklyNetGoal: "Weekly net goal",
    weeklyRental: "Weekly rental",
    minimumLyftRides: "Minimum Lyft rides",
    weekStartsOn: "Week starts on",
    monday: "Monday",
    sunday: "Sunday",
    workPreferences: "Work preferences",
    minimumDailyHours: "Minimum daily hours",
    preferredMaxDailyHours: "Preferred max daily hours",
    preferredBreakTimes: "Preferred break times",
    preferredApps: "Preferred apps",
    lyftOnly: "Lyft only",
    doordashOnly: "DoorDash only",
    bothApps: "Lyft + DoorDash",
    preferredHourlyTarget: "Preferred hourly target",
    preferredPerRideTarget: "Preferred per-ride target",
    alertWhenUnderperforming: "Alert when underperforming",
    enableBrowserNotifications: "Enable browser notifications",
    permissionStatus: "Permission status",
    unsupported: "unsupported",
    requestNotificationPermission: "Request notification permission",
    notificationsUnsupported: "Browser notifications are not supported on this device.",
    saveSettings: "Save settings",
    resetDefaults: "Reset defaults",
    scheduleTemplate: "Schedule template",
    balancedText: "Balanced: commute + lunch + evening blocks spread across the week.",
    aggressiveText: "Aggressive: longer weekdays and heavy Friday/Saturday nightlife.",
    weekendFocusText: "Weekend focus: lighter weekdays and stronger weekend blocks.",
    runGuidedOnboarding: "Run guided onboarding",
    applyTemplate: "Apply template to this week",
    home: "Home",
    today: "Today",
    week: "Week",
    settings: "Settings",
    shiftpilotOnboarding: "ShiftPilot onboarding",
    onboardingDesc: "Complete 4 guided steps to configure goals, schedule and alerts.",
    back: "Back",
    next: "Next",
    finishOnboarding: "Finish onboarding",
    selectApp: "Select app",
    plannedMode: "Planned mode",
    earningsTargetOptional: "Earnings target (optional)",
    ridesTargetOptional: "Rides target (optional)",
    cancel: "Cancel",
    startSession: "Start Session",
    saveSession: "Save Session",
    totalEarnings: "Total earnings",
    totalRidesDeliveries: "Total rides / deliveries",
    gasExpense: "Gas expense",
    tollParking: "Toll / parking",
    notes: "Notes",
    duration: "Duration",
    grossPerHour: "Gross per hour",
    netAfterExpenses: "Net after expenses",
    averagePerRide: "Average per ride",
    afterSaveAutoStart: "After save: auto start new",
    nextApp: "Next app",
    continue: "Continue",
    addEarningsManually: "Add earnings manually",
    createOrEditSession: "Create or edit a session for manual tracking and history search.",
    app: "App",
    mode: "Mode",
    date: "Date",
    startEnd: "Start / End",
    update: "Update",
    save: "Save",
    close: "Close",
    quickSnapshot: "Quick snapshot for selected day.",
    gross: "Gross",
    remainingDayTarget: "Remaining day target",
    ridesDone: "Rides done",
    remainingRideTarget: "Remaining rides target",
    tomorrowCarryOver: "Tomorrow carry-over estimate",
    addBlock: "Add block",
    planEarningsAndRides: "Plan earnings and rides for this time range.",
    targetEarnings: "Target earnings",
    targetRides: "Target rides",
    saveBlock: "Save block",
  },
  ar: {
    setupFallback: "الإعداد",
    onboardingInProgress: "onboarding موجه مازال خدام",
    step: "الخطوة",
    continueSetup: "كمّل الإعداد",
    quickActions: "إجراءات سريعة",
    quickActionsDesc: "جمعنا هنا الأفعال الرئيسية.",
    addEarnings: "زيد الدخل",
    reviewDay: "راجع النهار",
    tellMeNow: "قول ليا دابا شنو ندير",
    latestClockOutReview: "آخر مراجعة منين سالات السيشن",
    todayStatus: "الحالة ديال اليوم",
    notClockedIn: "ما كايناش سيشن خدامة",
    offline: "ماشي خدام",
    start: "البداية",
    earnings: "الدخل",
    tips: "التيبس",
    rides: "الطراجات",
    weeklyGrossGoal: "الهدف الخام ديال الأسبوع",
    remaining: "الباقي",
    rentalCoverage: "تغطية الكراء",
    remainingRental: "الباقي فالكراء",
    lyftRidesMinimum: "أقل عدد ديال طراجات Lyft",
    remainingRides: "الطراجات الباقيين",
    hoursVsPlan: "الساعات مقابل الخطة",
    remainingPlannedHours: "الساعات المبرمجة الباقيين",
    whatShouldIDoNow: "شنو خاصني ندير دابا؟",
    notifications: "الإشعارات",
    noUrgentAlert: "ما كاين حتى تنبيه مستعجل دابا.",
    liveSession: "السيشن المباشرة",
    noActiveSession: "ما كايناش سيشن خدامة",
    active: "خدامة",
    timer: "العداد",
    started: "بدات فـ",
    deliveries: "الليفريزونات",
    tip: "تيب",
    expense: "المصاريف",
    gas: "المازوط",
    toll: "الطريق المؤدى",
    midSessionCoach: "كوتش وسط السيشن",
    currentPace: "الريتم الحالي",
    ifPaceContinues: "إلا بقى هاد الريتم، الباقي فالهدف الأسبوعي هو",
    pause: "وقف شوية",
    resume: "كمّل",
    switchApp: "بدّل التطبيق",
    clockOut: "سالي السيشن",
    clockIn: "بدا السيشن",
    noActiveSessionBody: "ما كايناش سيشن خدامة. استعمل بدا السيشن ولا بدا هاد البلوك.",
    dayPlanner: "بلان ديال النهار",
    addExtraBlock: "زيد بلوك",
    target: "الهدف",
    markSkipped: "علّم عليه متخطي",
    unskip: "رجعو خدام",
    startThisBlock: "بدا هاد البلوك",
    editBlock: "بدّل البلوك",
    importantBlock: "هاد البلوك مهم حيث راك متأخر على الهدف الأسبوعي.",
    canSkipBlock: "تقدر تخطي بلوك ضعيف إلا راك متقدّم مزيان.",
    weeklyGross: "الخام الأسبوعي",
    weeklyNet: "الصافي الأسبوعي",
    avgPerHour: "المتوسط فالساعة",
    avgPerRide: "المتوسط فالطرجة",
    earningsByDay: "الدخل حسب النهار",
    hoursByDay: "الساعات حسب النهار",
    split: "التقسيم بين Lyft و DoorDash",
    smartInsights: "ملاحظات ذكية",
    bestSession: "أحسن سيشن بالساعة",
    noDataYet: "مازال ما كايناش بيانات",
    tuesdayLunchAverage: "متوسط DoorDash نهار الثلاثاء فالغدا",
    requiredHourlyRate: "الثمن المطلوب فالساعة من دابا",
    history: "التاريخ",
    openHistorySheet: "فتح ورقة التاريخ",
    searchPlaceholder: "قلّب فالتطبيق، المود، الملاحظة",
    noSessionsFound: "ما تلقات حتى سيشن.",
    edit: "بدّل",
    delete: "حيد",
    weeklySetup: "إعداد الأسبوع",
    weeklyNetGoal: "الهدف الصافي ديال الأسبوع",
    weeklyRental: "كراء الأسبوع",
    minimumLyftRides: "أقل عدد ديال طراجات Lyft",
    weekStartsOn: "الأسبوع كيبدا فـ",
    monday: "الاثنين",
    sunday: "الأحد",
    workPreferences: "تفضيلات الخدمة",
    minimumDailyHours: "أقل ساعات فالنهار",
    preferredMaxDailyHours: "أقصى ساعات مفضلة فالنهار",
    preferredBreakTimes: "أوقات الراحة المفضلة",
    preferredApps: "التطبيقات المفضلة",
    lyftOnly: "غير Lyft",
    doordashOnly: "غير DoorDash",
    bothApps: "Lyft + DoorDash",
    preferredHourlyTarget: "الهدف المفضل فالساعة",
    preferredPerRideTarget: "الهدف المفضل فالطرجة",
    alertWhenUnderperforming: "نبّهني إلا كنت متأخر",
    enableBrowserNotifications: "فعّل إشعارات المتصفح",
    permissionStatus: "حالة الترخيص",
    unsupported: "ماشي مدعوم",
    requestNotificationPermission: "طلب ترخيص الإشعارات",
    notificationsUnsupported: "إشعارات المتصفح ماشي مدعومين فهاد الجهاز.",
    saveSettings: "حفظ الإعدادات",
    resetDefaults: "رجّع الافتراضي",
    scheduleTemplate: "قالب البرنامج",
    balancedText: "متوازن: بلوقات ديال الصباح والغدا والعشية موزعين على الأسبوع.",
    aggressiveText: "هجومي: أيام طوال فالسبوع وفوكس على ليالي الجمعة والسبت.",
    weekendFocusText: "فوكس الويكاند: أيام خفيفة وويكاند أقوى.",
    runGuidedOnboarding: "عاود الonboarding الموجه",
    applyTemplate: "طبّق هاد القالب على هاد الأسبوع",
    home: "الرئيسية",
    today: "اليوم",
    week: "الأسبوع",
    settings: "الإعدادات",
    shiftpilotOnboarding: "onboarding ديال ShiftPilot",
    onboardingDesc: "كمّل 4 خطوات باش توجد الأهداف والبرنامج والتنبيهات.",
    back: "رجوع",
    next: "التالي",
    finishOnboarding: "سالي الonboarding",
    selectApp: "اختار التطبيق",
    plannedMode: "المود المتوقع",
    earningsTargetOptional: "هدف الدخل (اختياري)",
    ridesTargetOptional: "هدف الطراجات (اختياري)",
    cancel: "إلغاء",
    startSession: "بدا السيشن",
    saveSession: "حفظ السيشن",
    totalEarnings: "الدخل كامل",
    totalRidesDeliveries: "المجموع ديال الطراجات / الليفريزونات",
    gasExpense: "مصروف المازوط",
    tollParking: "طريق مؤدى / باركينغ",
    notes: "ملاحظات",
    duration: "المدة",
    grossPerHour: "الخام فالساعة",
    netAfterExpenses: "الصافي بعد المصاريف",
    averagePerRide: "المتوسط فالطرجة",
    afterSaveAutoStart: "من بعد الحفظ غادي تبدا أوتوماتيكياً سيشن جديدة ديال",
    nextApp: "التطبيق الجاي",
    continue: "كمّل",
    addEarningsManually: "زيد الدخل بيدك",
    createOrEditSession: "صاوب ولا بدّل سيشن باش تراقبها بيدك وتلقاها فالتاريخ.",
    app: "التطبيق",
    mode: "المود",
    date: "التاريخ",
    startEnd: "البداية / النهاية",
    update: "حدّث",
    save: "حفظ",
    close: "سد",
    quickSnapshot: "نظرة سريعة على النهار المختار.",
    gross: "الخام",
    remainingDayTarget: "هدف النهار الباقي",
    ridesDone: "الطراجات اللي دازو",
    remainingRideTarget: "هدف الطراجات الباقي",
    tomorrowCarryOver: "التقدير اللي غادي يتنقل لغدا",
    addBlock: "زيد بلوك",
    planEarningsAndRides: "برمج الدخل والطراجات فهاد الوقت.",
    targetEarnings: "هدف الدخل",
    targetRides: "هدف الطراجات",
    saveBlock: "حفظ البلوك",
  },
} as const;

function getAppLabel(app: AppType, _locale: FloussyLocale): string {
  if (app === "DoorDash") return "DoorDash";
  return "Lyft";
}

function getModeLabel(mode: SessionMode, locale: FloussyLocale): string {
  if (locale === "ar") {
    if (mode === "Commute") return "تنقل الصباح";
    if (mode === "Lunch peak") return "ذروة الغدا";
    if (mode === "Dinner peak") return "ذروة العشية";
    if (mode === "Nightlife") return "ذروة الليل";
    if (mode === "Airport") return "المطار";
    return "مرن";
  }
  if (locale === "fr") {
    if (mode === "Commute") return "Navette";
    if (mode === "Lunch peak") return "Pic midi";
    if (mode === "Dinner peak") return "Pic soir";
    if (mode === "Nightlife") return "Nuit";
    if (mode === "Airport") return "Aéroport";
    return "Flexible";
  }
  return mode;
}

function getTabLabel(key: TabKey, locale: FloussyLocale) {
  const copy = SHIFTPILOT_COPY[locale];
  if (key === "home") return copy.home;
  if (key === "today") return copy.today;
  if (key === "week") return copy.week;
  if (key === "history") return copy.history;
  return copy.settings;
}

function getOnboardingMeta(
  step: 1 | 2 | 3 | 4,
  locale: FloussyLocale
): { title: string; description: string } {
  if (locale === "ar") {
    if (step === 1) {
      return {
        title: "إعداد الأسبوع",
        description: "وجد الهدف الصافي، الكراء، أقل عدد ديال طراجات Lyft وبداية الأسبوع.",
      };
    }
    if (step === 2) {
      return {
        title: "تفضيلات الخدمة",
        description: "حدد الساعات اليومية، التطبيقات المفضلة وأوقات الراحة.",
      };
    }
    if (step === 3) {
      return {
        title: "قالب البرنامج",
        description: "اختار القالب الأسبوعي اللي كيناسب الطريقة ديالك فالخدمة.",
      };
    }
    return {
      title: "المعايير والتنبيهات",
      description: "حدد المعايير ديال الأداء وسلوك الإشعارات.",
    };
  }
  if (locale === "fr") {
    if (step === 1) {
      return {
        title: "Configuration hebdo",
        description: "Configure objectif net, location, minimum Lyft et début de semaine.",
      };
    }
    if (step === 2) {
      return {
        title: "Préférences de travail",
        description: "Définis les heures quotidiennes, les apps préférées et les pauses.",
      };
    }
    if (step === 3) {
      return {
        title: "Template d'horaire",
        description: "Choisis le template hebdo adapté à ton style de conduite.",
      };
    }
    return {
      title: "Benchmarks et alertes",
      description: "Définis les repères de performance et le comportement des alertes.",
    };
  }
  const meta = ONBOARDING_STEP_META.find((item) => item.step === step);
  return { title: meta?.title ?? "", description: meta?.description ?? "" };
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateKey(dateKey: string, time: string): Date {
  const [y, m, d] = dateKey.split("-").map((item) => Number.parseInt(item, 10));
  const [h, min] = time.split(":").map((item) => Number.parseInt(item, 10));
  return new Date(y, (m || 1) - 1, d || 1, h || 0, min || 0, 0, 0);
}

function normalizeBlockEnd(start: Date, end: Date): Date {
  if (end <= start) {
    const next = new Date(end);
    next.setDate(next.getDate() + 1);
    return next;
  }
  return end;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatDurationHms(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatDurationShort(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return `${h}h ${m}m`;
}

function parseNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getModeForTime(date: Date): SessionMode {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 11 && hour < 14) return "Lunch peak";
  if (hour >= 17 && hour < 20) return "Dinner peak";
  if (hour >= 21.5 || hour < 2) return "Nightlife";
  if (hour >= 5 && hour < 11) return "Commute";
  return "Flexible";
}

function isLunchPeak(date: Date): boolean {
  const hour = date.getHours() + date.getMinutes() / 60;
  return hour >= 11 && hour < 14;
}

function isDinnerPeak(date: Date): boolean {
  const hour = date.getHours() + date.getMinutes() / 60;
  return hour >= 17 && hour < 20;
}

function isNightlifePeak(date: Date): boolean {
  const hour = date.getHours() + date.getMinutes() / 60;
  return hour >= 21.5 || hour < 2;
}

function isLyftPeak(date: Date): boolean {
  const hour = date.getHours() + date.getMinutes() / 60;
  const isCommute = hour >= 6 && hour < 10;
  const isEvening = hour >= 16 && hour < 20;
  return isCommute || isEvening || isNightlifePeak(date);
}

function getWeekStart(date: Date, weekStartDay: WeekStartDay): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const currentDow = start.getDay();
  const targetDow = weekStartDay === "Monday" ? 1 : 0;
  const delta = (currentDow - targetDow + 7) % 7;
  start.setDate(start.getDate() - delta);
  return start;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function computeActiveDurationSeconds(session: ActiveSession, nowTs: number): number {
  const startTs = new Date(session.startTime).getTime();
  const pauseStartedTs = session.pauseStartedAt
    ? new Date(session.pauseStartedAt).getTime()
    : null;
  const currentPause = pauseStartedTs ? Math.max(0, nowTs - pauseStartedTs) / 1000 : 0;
  const raw = Math.max(0, nowTs - startTs) / 1000;
  return Math.max(0, Math.floor(raw - session.pausedSeconds - currentPause));
}

function sessionGross(session: Pick<WorkSession, "earnings" | "tips">): number {
  return session.earnings + session.tips;
}

function sessionExpenses(session: Pick<WorkSession, "gas" | "tolls">): number {
  return session.gas + session.tolls;
}

function sessionNet(session: Pick<WorkSession, "earnings" | "tips" | "gas" | "tolls">): number {
  return sessionGross(session) - sessionExpenses(session);
}

function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, (current / target) * 100));
}

function blockDurationHours(block: Pick<DayPlanBlock, "date" | "startTime" | "endTime">): number {
  const start = fromDateKey(block.date, block.startTime);
  const end = normalizeBlockEnd(start, fromDateKey(block.date, block.endTime));
  return Math.max(0, end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function overlapsSessionAndBlock(
  session: Pick<WorkSession, "startTime" | "endTime">,
  block: Pick<DayPlanBlock, "date" | "startTime" | "endTime">
): boolean {
  const sessionStart = new Date(session.startTime);
  const sessionEnd = new Date(session.endTime);
  const blockStart = fromDateKey(block.date, block.startTime);
  const blockEnd = normalizeBlockEnd(blockStart, fromDateKey(block.date, block.endTime));
  return sessionStart <= blockEnd && sessionEnd >= blockStart;
}

function toWeekday(dateKey: string): number {
  const date = fromDateKey(dateKey, "00:00");
  return date.getDay();
}

function getTemplateBlocksForDate(
  dateKey: string,
  template: ShiftPilotTemplate = "balanced"
): DayPlanBlock[] {
  const day = toWeekday(dateKey);
  const make = (
    appType: AppType,
    startTime: string,
    endTime: string,
    mode: SessionMode,
    targetEarnings: number,
    targetRides: number,
    index: number
  ): DayPlanBlock => ({
    id: `tpl_${dateKey}_${index}`,
    date: dateKey,
    appType,
    startTime,
    endTime,
    mode,
    targetEarnings,
    targetRides,
    status: "planned",
  });

  if (template === "aggressive") {
    if (day >= 1 && day <= 4) {
      return [
        make("Lyft", "05:30", "10:00", "Commute", 130, 8, 0),
        make("DoorDash", "11:00", "14:00", "Lunch peak", 85, 9, 1),
        make("Lyft", "16:00", "20:30", "Dinner peak", 145, 9, 2),
      ];
    }
    if (day === 5 || day === 6) {
      return [
        make("DoorDash", "11:00", "14:00", "Lunch peak", 100, 10, 0),
        make("Lyft", "21:00", "02:00", "Nightlife", 240, 14, 1),
      ];
    }
    return [
      make("DoorDash", "11:00", "15:00", "Lunch peak", 105, 10, 0),
      make("Lyft", "18:00", "22:00", "Flexible", 120, 8, 1),
    ];
  }

  if (template === "weekend_focus") {
    if (day === 1) {
      return [
        make("Lyft", "06:00", "10:00", "Commute", 110, 7, 0),
        make("DoorDash", "11:00", "14:00", "Lunch peak", 65, 7, 1),
      ];
    }
    if (day >= 2 && day <= 4) {
      return [
        make("Lyft", "06:00", "09:30", "Commute", 95, 6, 0),
        make("DoorDash", "11:30", "13:30", "Lunch peak", 55, 6, 1),
      ];
    }
    if (day === 5 || day === 6) {
      return [
        make("DoorDash", "11:00", "14:00", "Lunch peak", 100, 10, 0),
        make("Lyft", "21:00", "02:00", "Nightlife", 260, 15, 1),
      ];
    }
    return [
      make("DoorDash", "12:00", "15:00", "Lunch peak", 80, 8, 0),
      make("Lyft", "18:00", "22:30", "Flexible", 150, 9, 1),
    ];
  }

  if (day === 1) {
    return [
      make("Lyft", "06:00", "10:00", "Commute", 120, 7, 0),
      make("DoorDash", "11:00", "14:00", "Lunch peak", 70, 8, 1),
      make("Lyft", "16:00", "20:00", "Dinner peak", 120, 7, 2),
    ];
  }
  if (day >= 2 && day <= 4) {
    return [
      make("Lyft", "06:00", "10:00", "Commute", 115, 7, 0),
      make("DoorDash", "11:00", "14:00", "Lunch peak", 75, 8, 1),
      make("Lyft", "16:00", "20:00", "Dinner peak", 125, 7, 2),
    ];
  }
  if (day === 5) {
    return [
      make("DoorDash", "11:00", "14:00", "Lunch peak", 90, 9, 0),
      make("Lyft", "21:30", "02:00", "Nightlife", 180, 12, 1),
    ];
  }
  if (day === 6) {
    return [
      make("DoorDash", "11:00", "14:00", "Lunch peak", 95, 10, 0),
      make("Lyft", "21:30", "02:00", "Nightlife", 220, 14, 1),
    ];
  }
  return [
    make("DoorDash", "11:00", "14:00", "Lunch peak", 70, 8, 0),
    make("DoorDash", "17:00", "21:00", "Flexible", 110, 10, 1),
  ];
}

function makeWeekSeed(
  dateKey: string,
  template: ShiftPilotTemplate = "balanced"
): DayPlanBlock[] {
  const base = fromDateKey(dateKey, "00:00");
  const monday = getWeekStart(base, "Monday");
  const blocks: DayPlanBlock[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = addDays(monday, i);
    blocks.push(...getTemplateBlocksForDate(toDateKey(day), template));
  }
  return blocks;
}

function defaultOnboardingState(): ShiftPilotOnboardingState {
  return {
    completed: false,
    currentStep: 1,
    template: "balanced",
  };
}

function normalizeTemplate(value: unknown): ShiftPilotTemplate {
  if (value === "aggressive") return "aggressive";
  if (value === "weekend_focus") return "weekend_focus";
  return "balanced";
}

function normalizeOnboarding(value: unknown): ShiftPilotOnboardingState {
  const fallback = defaultOnboardingState();
  if (!value || typeof value !== "object") return fallback;
  const typed = value as Partial<ShiftPilotOnboardingState>;
  const stepRaw = Number(typed.currentStep ?? fallback.currentStep);
  const step = [1, 2, 3, 4].includes(stepRaw) ? (stepRaw as 1 | 2 | 3 | 4) : 1;
  return {
    completed: Boolean(typed.completed),
    currentStep: step,
    template: normalizeTemplate(typed.template),
  };
}

function defaultPersistedState(): PersistedState {
  const today = toDateKey(new Date());
  const onboarding = defaultOnboardingState();
  return {
    runtimeVersion: RUNTIME_VERSION,
    settings: DEFAULT_SETTINGS,
    sessions: [],
    dayPlanBlocks: makeWeekSeed(today, onboarding.template),
    activeSession: null,
    selectedDate: today,
    lastApp: "Lyft",
    lastMode: getModeForTime(new Date()),
    onboarding,
  };
}

function normalizePersistedState(parsed: Partial<PersistedState> | null | undefined): PersistedState {
  const fallback = defaultPersistedState();
  if (!parsed) return fallback;
  const onboarding = normalizeOnboarding(parsed.onboarding);
  const selectedDate =
    typeof parsed.selectedDate === "string" ? parsed.selectedDate : fallback.selectedDate;
  const dayPlanBlocks =
    Array.isArray(parsed.dayPlanBlocks) && parsed.dayPlanBlocks.length > 0
      ? parsed.dayPlanBlocks
      : makeWeekSeed(selectedDate, onboarding.template);

  return {
    runtimeVersion: RUNTIME_VERSION,
    settings: {
      ...fallback.settings,
      ...(parsed.settings ?? {}),
      browserNotificationsEnabled: Boolean(
        parsed.settings?.browserNotificationsEnabled
      ),
    },
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : fallback.sessions,
    dayPlanBlocks,
    activeSession: parsed.activeSession ?? null,
    selectedDate,
    lastApp:
      parsed.lastApp === "DoorDash" || parsed.lastApp === "Lyft"
        ? parsed.lastApp
        : fallback.lastApp,
    lastMode:
      parsed.lastMode && MODES.includes(parsed.lastMode)
        ? parsed.lastMode
        : fallback.lastMode,
    onboarding,
  };
}

function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") {
    return defaultPersistedState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersistedState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return normalizePersistedState(parsed);
  } catch {
    return defaultPersistedState();
  }
}

function computeWeeklyStats(
  sessions: WorkSession[],
  settings: ShiftPilotSettings,
  nowDate: Date,
  dayPlanBlocks: DayPlanBlock[]
): WeeklyStats {
  const weekStart = getWeekStart(nowDate, settings.weekStartDay);
  const weekEnd = addDays(weekStart, 7);

  const weekSessions = sessions.filter((session) => {
    const start = new Date(session.startTime);
    return start >= weekStart && start < weekEnd;
  });

  const weeklyGross = weekSessions.reduce((sum, session) => sum + sessionGross(session), 0);
  const weeklyNet = weekSessions.reduce((sum, session) => sum + sessionNet(session), 0);
  const lyftGross = weekSessions
    .filter((session) => session.appType === "Lyft")
    .reduce((sum, session) => sum + sessionGross(session), 0);
  const doordashGross = weekSessions
    .filter((session) => session.appType === "DoorDash")
    .reduce((sum, session) => sum + sessionGross(session), 0);
  const lyftRides = weekSessions
    .filter((session) => session.appType === "Lyft")
    .reduce((sum, session) => sum + session.ridesOrDeliveries, 0);
  const totalRides = weekSessions.reduce((sum, session) => sum + session.ridesOrDeliveries, 0);
  const durationSeconds = weekSessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const hoursWorked = durationSeconds / 3600;
  const avgPerHour = hoursWorked > 0 ? weeklyGross / hoursWorked : 0;
  const avgPerRide = totalRides > 0 ? weeklyGross / totalRides : 0;

  const grossTarget = settings.weeklyNetGoal + settings.weeklyRental;
  const remainingGrossTarget = Math.max(0, grossTarget - weeklyGross);
  const remainingNetTarget = Math.max(0, settings.weeklyNetGoal - weeklyNet);
  const remainingRental = Math.max(0, settings.weeklyRental - lyftGross);
  const remainingRides = Math.max(0, settings.minLyftRides - lyftRides);

  const plannedHoursWeek = dayPlanBlocks
    .filter((block) => {
      const start = fromDateKey(block.date, block.startTime);
      return start >= weekStart && start < weekEnd && block.status !== "skipped";
    })
    .reduce((sum, block) => sum + blockDurationHours(block), 0);

  const nowTs = nowDate.getTime();
  const weekStartTs = weekStart.getTime();
  const weekEndTs = weekEnd.getTime();
  const elapsedRatio = Math.max(0, Math.min(1, (nowTs - weekStartTs) / (weekEndTs - weekStartTs)));
  const expectedGrossByNow = grossTarget * elapsedRatio;
  const behindGross = Math.max(0, expectedGrossByNow - weeklyGross);
  const aheadGross = Math.max(0, weeklyGross - expectedGrossByNow);

  const daysLeft = Math.max(1, Math.ceil((weekEndTs - nowTs) / (1000 * 60 * 60 * 24)));
  const fallbackRemainingHours = settings.minDailyHours * daysLeft;
  const remainingPlannedHours = Math.max(1, plannedHoursWeek - hoursWorked, fallbackRemainingHours);
  const requiredHourlyRate = remainingGrossTarget > 0 ? remainingGrossTarget / remainingPlannedHours : 0;

  return {
    weeklyGross,
    weeklyNet,
    lyftGross,
    doordashGross,
    rentalCovered: Math.min(settings.weeklyRental, lyftGross),
    lyftRides,
    totalRides,
    hoursWorked,
    avgPerHour,
    avgPerRide,
    grossTarget,
    remainingGrossTarget,
    remainingNetTarget,
    remainingRental,
    remainingRides,
    remainingPlannedHours,
    requiredHourlyRate,
    behindGross,
    aheadGross,
    expectedGrossByNow,
    daysLeft,
  };
}

function recommendationForNow(
  nowDate: Date,
  stats: WeeklyStats,
  settings: ShiftPilotSettings,
  locale: FloussyLocale
): Recommendation {
  const rentalUrgent = stats.lyftGross < settings.weeklyRental;
  const ridesUrgent = stats.lyftRides < settings.minLyftRides;
  const lunch = isLunchPeak(nowDate);
  const dinner = isDinnerPeak(nowDate);
  const lyftPeak = isLyftPeak(nowDate);
  const day = nowDate.getDay();
  const fridayOrSaturdayNight = (day === 5 || day === 6) && isNightlifePeak(nowDate);

  let app: AppType = "Lyft";
  const details: string[] = [];

  if (rentalUrgent) {
    app = "Lyft";
    details.push(
      locale === "ar"
        ? `الكراء ديال Lyft مازال ما تغطاش كامل: باقي ${formatCurrency(stats.remainingRental)}.`
        : locale === "fr"
        ? `Location Lyft مازال غير مغطاة: باقي ${formatCurrency(stats.remainingRental)}.`
        : `Lyft rental still not covered: ${formatCurrency(stats.remainingRental)} remaining.`
    );
  } else if (ridesUrgent && lyftPeak) {
    app = "Lyft";
    details.push(
      locale === "ar"
        ? `باقيين ${stats.remainingRides} ديال طراجات Lyft و peak ديال Lyft خدام دابا.`
        : locale === "fr"
        ? `Courses Lyft restantes : ${stats.remainingRides}. Peak Lyft actif.`
        : `Lyft rides remaining: ${stats.remainingRides}. Lyft peak is active.`
    );
  } else if ((lunch || dinner) && !ridesUrgent) {
    app = "DoorDash";
    details.push(
      locale === "ar"
        ? "ذروة الغدا ولا العشية حاضرة ودابا الاستعجال ديال Lyft ضعيف."
        : locale === "fr"
        ? "Pic lunch/dinner détecté avec faible urgence Lyft."
        : "Lunch/Dinner peak detected with low Lyft urgency."
    );
  } else if (fridayOrSaturdayNight) {
    app = "Lyft";
    details.push(
      locale === "ar"
        ? "ليالي الجمعة والسبت غالباً كيربحو أكثر فـ Lyft."
        : locale === "fr"
        ? "Les nuits du vendredi/samedi sont généralement plus rentables sur Lyft."
        : "Friday/Saturday nightlife is usually more profitable on Lyft."
    );
  } else if (stats.behindGross > 0) {
    app = ridesUrgent ? "Lyft" : "DoorDash";
    details.push(
      locale === "ar"
        ? `راك متأخر على الهدف الأسبوعي بـ ${formatCurrency(stats.behindGross)}.`
        : locale === "fr"
        ? `Retard sur la cible hebdo : ${formatCurrency(stats.behindGross)}.`
        : `You are behind weekly target by ${formatCurrency(stats.behindGross)}.`
    );
  } else {
    app = lunch || dinner ? "DoorDash" : "Lyft";
    details.push(
      locale === "ar"
        ? "ما كاين حتى استعجال قوي، الاختيار مبني على الوقت اللي خدام دابا."
        : locale === "fr"
        ? "Pas d'urgence forte, choix basé sur la fenêtre horaire active."
        : "No strong urgency, choice based on the active time window."
    );
  }

  if (stats.aheadGross > 100) {
    details.push(
      locale === "ar"
        ? "راك متقدّم مزيان: تقدر تخفف شوية البرنامج."
        : locale === "fr"
        ? "Tu es bien en avance : possible d'alléger le planning."
        : "You are well ahead: you can lighten the plan."
    );
  }

  const now = new Date(nowDate);
  const end = new Date(now);
  const hour = now.getHours() + now.getMinutes() / 60;

  if (app === "DoorDash" && isLunchPeak(now)) {
    end.setHours(14, 0, 0, 0);
  } else if (app === "DoorDash" && isDinnerPeak(now)) {
    end.setHours(20, 0, 0, 0);
  } else if (app === "Lyft" && hour < 10) {
    end.setHours(10, 0, 0, 0);
  } else if (app === "Lyft" && hour < 11) {
    end.setHours(11, 0, 0, 0);
  } else if (app === "Lyft" && fridayOrSaturdayNight) {
    end.setDate(end.getDate() + 1);
    end.setHours(1, 30, 0, 0);
  } else {
    end.setHours(end.getHours() + 2, 0, 0, 0);
  }

  if (end <= now) {
    end.setHours(now.getHours() + 2, now.getMinutes(), 0, 0);
  }

  const blockHours = Math.max(1, (end.getTime() - now.getTime()) / (1000 * 60 * 60));
  const targetEarnings = Math.max(
    25,
    Math.round(
      stats.requiredHourlyRate > 0
        ? Math.min(stats.remainingGrossTarget, stats.requiredHourlyRate * blockHours)
        : 30 * blockHours
    )
  );
  const targetRides = app === "Lyft" ? Math.max(2, Math.min(stats.remainingRides || 8, Math.ceil(blockHours * 2))) : Math.max(3, Math.ceil(blockHours * 3));

  const instruction = [
    locale === "ar"
      ? `بدا ${getAppLabel(app, locale)} دابا`
      : locale === "fr"
      ? `Commence ${getAppLabel(app, locale)} maintenant`
      : `Start ${getAppLabel(app, locale)} now`,
    locale === "ar"
      ? `خدم حتى ${end.toLocaleTimeString(LOCALE_TO_BCP47[locale], { hour: "numeric", minute: "2-digit" })}`
      : locale === "fr"
      ? `خدم حتى ${end.toLocaleTimeString(LOCALE_TO_BCP47[locale], { hour: "numeric", minute: "2-digit" })}`
      : `Work until ${end.toLocaleTimeString(LOCALE_TO_BCP47[locale], { hour: "numeric", minute: "2-digit" })}`,
    locale === "ar"
      ? `الهدف: ${formatCurrency(targetEarnings)} و ${targetRides} طرجة/ليفريزون`
      : locale === "fr"
      ? `Objectif : ${formatCurrency(targetEarnings)} et ${targetRides} courses/livraisons`
      : `Target: ${formatCurrency(targetEarnings)} and ${targetRides} rides/deliveries`,
    app === "Lyft"
      ? locale === "ar"
        ? "من بعد بدل لـ DoorDash مع ذروة الغدا ولا العشية الجاية"
        : locale === "fr"
        ? "Ensuite passe à DoorDash au prochain pic midi/soir"
        : "Then switch to DoorDash at next lunch or dinner peak"
      : locale === "ar"
      ? "من بعد بدل لـ Lyft مع نافذة التنقل/العشية/الليل الجاية"
      : locale === "fr"
      ? "Ensuite passe à Lyft pour la prochaine fenêtre navette/soir/nuit"
      : "Then switch to Lyft for next commute/evening/night window",
  ];

  const title =
    app === "Lyft"
      ? locale === "ar"
        ? `أحسن خطوة دابا: Lyft (باقيين ${stats.remainingRides} ديال الطراجات)`
        : locale === "fr"
        ? `Meilleur move maintenant : Lyft (${stats.remainingRides} courses restantes)`
        : `Best move now: Lyft (${stats.remainingRides} rides remaining)`
      : locale === "ar"
      ? "أحسن خطوة دابا: شد peak ديال DoorDash"
      : locale === "fr"
      ? "Meilleur move maintenant : capter le pic DoorDash"
      : "Best move now: DoorDash peak capture";

  return { app, title, details, instruction };
}

function statusTone(status: "active" | "upcoming" | "done" | "skipped"):
  | "accent"
  | "warning"
  | "success"
  | "muted" {
  if (status === "active") return "accent";
  if (status === "upcoming") return "warning";
  if (status === "done") return "success";
  return "muted";
}

function dayName(dateKey: string, locale: FloussyLocale): string {
  return fromDateKey(dateKey, "00:00").toLocaleDateString(LOCALE_TO_BCP47[locale], {
    weekday: "short",
  });
}

function monthDay(dateKey: string, locale: FloussyLocale): string {
  return fromDateKey(dateKey, "00:00").toLocaleDateString(LOCALE_TO_BCP47[locale], {
    month: "short",
    day: "numeric",
  });
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export default function ShiftPilotPage() {
  const pathname = usePathname();
  const initial = useMemo(() => loadPersistedState(), []);
  const remoteSyncTimerRef = useRef<number | null>(null);
  const isHydratingRemoteRef = useRef(true);

  const [tab, setTab] = useState<TabKey>("home");
  const [locale, setLocale] = useState<FloussyLocale>(
    () => getBrowserLocalePreference() ?? "fr"
  );
  const [settings, setSettings] = useState<ShiftPilotSettings>(initial.settings);
  const [settingsDraft, setSettingsDraft] = useState<ShiftPilotSettings>(initial.settings);
  const [sessions, setSessions] = useState<WorkSession[]>(initial.sessions);
  const [dayPlanBlocks, setDayPlanBlocks] = useState<DayPlanBlock[]>(initial.dayPlanBlocks);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(initial.activeSession);
  const [selectedDate, setSelectedDate] = useState<string>(initial.selectedDate);
  const [lastApp, setLastApp] = useState<AppType>(initial.lastApp);
  const [lastMode, setLastMode] = useState<SessionMode>(initial.lastMode);
  const [onboarding, setOnboarding] = useState<ShiftPilotOnboardingState>(
    initial.onboarding
  );
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(
    !initial.onboarding.completed
  );
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [sentNotificationIds, setSentNotificationIds] = useState<string[]>([]);

  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  const [clockInOpen, setClockInOpen] = useState(false);
  const [clockInApp, setClockInApp] = useState<AppType>(lastApp);
  const [clockInMode, setClockInMode] = useState<SessionMode>(lastMode);
  const [clockInTargetEarnings, setClockInTargetEarnings] = useState("");
  const [clockInTargetRides, setClockInTargetRides] = useState("");

  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [clockOutEarnings, setClockOutEarnings] = useState("0");
  const [clockOutRides, setClockOutRides] = useState("0");
  const [clockOutTips, setClockOutTips] = useState("0");
  const [clockOutGas, setClockOutGas] = useState("0");
  const [clockOutTolls, setClockOutTolls] = useState("0");
  const [clockOutNotes, setClockOutNotes] = useState("");
  const [clockOutSummary, setClockOutSummary] = useState<string[] | null>(null);
  const [pendingSwitchApp, setPendingSwitchApp] = useState<AppType | null>(null);

  const [switchOpen, setSwitchOpen] = useState(false);
  const [switchTargetApp, setSwitchTargetApp] = useState<AppType>("DoorDash");

  const [manualOpen, setManualOpen] = useState(false);
  const [manualApp, setManualApp] = useState<AppType>("Lyft");
  const [manualMode, setManualMode] = useState<SessionMode>("Flexible");
  const [manualDate, setManualDate] = useState<string>(selectedDate);
  const [manualStart, setManualStart] = useState("09:00");
  const [manualEnd, setManualEnd] = useState("11:00");
  const [manualEarnings, setManualEarnings] = useState("0");
  const [manualRides, setManualRides] = useState("0");
  const [manualTips, setManualTips] = useState("0");
  const [manualGas, setManualGas] = useState("0");
  const [manualTolls, setManualTolls] = useState("0");
  const [manualNotes, setManualNotes] = useState("");

  const [reviewOpen, setReviewOpen] = useState(false);

  const [historySearch, setHistorySearch] = useState("");
  const [editSessionId, setEditSessionId] = useState<string | null>(null);

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockEditId, setBlockEditId] = useState<string | null>(null);
  const [blockDate, setBlockDate] = useState<string>(selectedDate);
  const [blockApp, setBlockApp] = useState<AppType>("Lyft");
  const [blockMode, setBlockMode] = useState<SessionMode>("Commute");
  const [blockStart, setBlockStart] = useState("06:00");
  const [blockEnd, setBlockEnd] = useState("10:00");
  const [blockTargetEarnings, setBlockTargetEarnings] = useState("80");
  const [blockTargetRides, setBlockTargetRides] = useState("6");

  const [coachAnswer, setCoachAnswer] = useState<string[]>([]);

  const copy = SHIFTPILOT_COPY[locale];
  const pageDir = getLocaleDirection(locale);
  useForceArabicDocumentFont(locale === "ar", "shiftpilot-page-ar-body");
  const tabItems = useMemo(
    () => TAB_ITEMS.map((item) => ({ ...item, label: getTabLabel(item.key, locale) })),
    [locale]
  );
  const onboardingStepMeta = useMemo(
    () =>
      ONBOARDING_STEP_META.map((item) => ({
        ...item,
        ...getOnboardingMeta(item.step, locale),
      })),
    [locale]
  );

  const applyLoadedState = (next: PersistedState) => {
    setSettings(next.settings);
    setSettingsDraft(next.settings);
    setSessions(next.sessions);
    setDayPlanBlocks(next.dayPlanBlocks);
    setActiveSession(next.activeSession);
    setSelectedDate(next.selectedDate);
    setLastApp(next.lastApp);
    setLastMode(next.lastMode);
    setOnboarding(next.onboarding);
  };

  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  useEffect(() => {
    if (!onboarding.completed) {
      setOnboardingOpen(true);
    } else {
      setOnboardingOpen(false);
    }
  }, [onboarding.completed]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(NOTIFICATION_SENT_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          setSentNotificationIds(parsed);
        }
      } catch {
        setSentNotificationIds([]);
      }
    }
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      NOTIFICATION_SENT_KEY,
      JSON.stringify(sentNotificationIds)
    );
  }, [sentNotificationIds]);

  useEffect(() => {
    let cancelled = false;
    const loadRemote = async () => {
      try {
        const response = await apiFetch<ShiftPilotStateOut>(
          "/users/me/shiftpilot-state"
        );
        if (cancelled) return;
        const normalized = normalizePersistedState(
          response.payload as Partial<PersistedState>
        );
        applyLoadedState(normalized);
      } catch {
        if (cancelled) return;
      } finally {
        if (!cancelled) {
          isHydratingRemoteRef.current = false;
        }
      }
    };
    loadRemote();
    return () => {
      cancelled = true;
      if (remoteSyncTimerRef.current) {
        window.clearTimeout(remoteSyncTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedState = {
      runtimeVersion: RUNTIME_VERSION,
      settings,
      sessions,
      dayPlanBlocks,
      activeSession,
      selectedDate,
      lastApp,
      lastMode,
      onboarding,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    settings,
    sessions,
    dayPlanBlocks,
    activeSession,
    selectedDate,
    lastApp,
    lastMode,
    onboarding,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isHydratingRemoteRef.current) return;
    if (remoteSyncTimerRef.current) {
      window.clearTimeout(remoteSyncTimerRef.current);
    }

    const payload: PersistedState = {
      runtimeVersion: RUNTIME_VERSION,
      settings,
      sessions,
      dayPlanBlocks,
      activeSession,
      selectedDate,
      lastApp,
      lastMode,
      onboarding,
    };
    remoteSyncTimerRef.current = window.setTimeout(async () => {
      try {
        await apiFetch<ShiftPilotStateOut>("/users/me/shiftpilot-state", {
          method: "PUT",
          body: { payload },
        });
      } catch {
        // Keep local state even if remote sync fails silently.
      }
    }, REMOTE_SYNC_DEBOUNCE_MS);

    return () => {
      if (remoteSyncTimerRef.current) {
        window.clearTimeout(remoteSyncTimerRef.current);
      }
    };
  }, [
    settings,
    sessions,
    dayPlanBlocks,
    activeSession,
    selectedDate,
    lastApp,
    lastMode,
    onboarding,
  ]);

  const nowDate = useMemo(() => new Date(nowTs), [nowTs]);
  const activeDuration = useMemo(
    () => (activeSession ? computeActiveDurationSeconds(activeSession, nowTs) : 0),
    [activeSession, nowTs]
  );

  const sessionsForStats = useMemo(() => {
    if (!activeSession) return sessions;
    const synthetic: WorkSession = {
      id: `${activeSession.id}_active`,
      appType: activeSession.appType,
      mode: activeSession.mode,
      startTime: activeSession.startTime,
      endTime: new Date(nowTs).toISOString(),
      durationSeconds: activeDuration,
      earnings: activeSession.earnings,
      tips: activeSession.tips,
      ridesOrDeliveries: activeSession.ridesOrDeliveries,
      gas: activeSession.gas,
      tolls: activeSession.tolls,
      notes: activeSession.notes,
      targetEarnings: activeSession.targetEarnings,
      targetRides: activeSession.targetRides,
    };
    return [...sessions, synthetic];
  }, [activeSession, sessions, nowTs, activeDuration]);

  const weeklyStats = useMemo(
    () => computeWeeklyStats(sessionsForStats, settings, nowDate, dayPlanBlocks),
    [sessionsForStats, settings, nowDate, dayPlanBlocks]
  );

  const recommendation = useMemo(
    () => recommendationForNow(nowDate, weeklyStats, settings, locale),
    [nowDate, weeklyStats, settings, locale]
  );

  const daySessions = useMemo(() => {
    return sessionsForStats
      .filter((session) => toDateKey(new Date(session.startTime)) === selectedDate)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [sessionsForStats, selectedDate]);

  const dayBlocks = useMemo(() => {
    const blocks = dayPlanBlocks.filter((block) => block.date === selectedDate);
    const source =
      blocks.length > 0
        ? blocks
        : getTemplateBlocksForDate(selectedDate, onboarding.template);
    return [...source].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [dayPlanBlocks, selectedDate, onboarding.template]);

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    const base = [...sessions].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    if (!query) return base;
    return base.filter((session) => {
      const haystack = [
        getAppLabel(session.appType, locale),
        getModeLabel(session.mode, locale),
        session.notes,
        new Date(session.startTime).toLocaleString(LOCALE_TO_BCP47[locale]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [sessions, historySearch, locale]);

  const weekDailySeries = useMemo(() => {
    const start = getWeekStart(nowDate, settings.weekStartDay);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      const key = toDateKey(date);
      const list = sessionsForStats.filter((session) => toDateKey(new Date(session.startTime)) === key);
      const gross = list.reduce((sum, item) => sum + sessionGross(item), 0);
      const hours = list.reduce((sum, item) => sum + item.durationSeconds, 0) / 3600;
      return {
        dateKey: key,
        label: dayName(key, locale),
        gross,
        hours,
      };
    });
  }, [locale, nowDate, settings.weekStartDay, sessionsForStats]);

  const bestSessions = useMemo(() => {
    const finished = sessions.filter((session) => session.durationSeconds > 0);
    const bestHour = [...finished].sort(
      (a, b) =>
        sessionGross(b) / (b.durationSeconds / 3600) -
        sessionGross(a) / (a.durationSeconds / 3600)
    )[0];
    const lunchDoorDash = finished.filter(
      (session) => session.appType === "DoorDash" && session.mode === "Lunch peak"
    );
    const avgLunchDoorDash =
      lunchDoorDash.length > 0
        ? lunchDoorDash.reduce((sum, item) => sum + sessionGross(item), 0) / lunchDoorDash.length
        : 0;
    return {
      bestHour,
      avgLunchDoorDash,
    };
  }, [sessions]);

  const todayGross = useMemo(
    () => daySessions.reduce((sum, session) => sum + sessionGross(session), 0),
    [daySessions]
  );
  const todayRides = useMemo(
    () => daySessions.reduce((sum, session) => sum + session.ridesOrDeliveries, 0),
    [daySessions]
  );

  const dailyGrossTarget = useMemo(() => {
    return weeklyStats.remainingGrossTarget > 0
      ? Math.ceil(weeklyStats.remainingGrossTarget / weeklyStats.daysLeft)
      : 0;
  }, [weeklyStats]);

  const dailyRideTarget = useMemo(() => {
    return weeklyStats.remainingRides > 0 ? Math.ceil(weeklyStats.remainingRides / weeklyStats.daysLeft) : 0;
  }, [weeklyStats]);

  const notifications = useMemo(() => {
    const list: Array<{ tone: "warning" | "success" | "accent"; text: string }> = [];

    const upcoming = dayBlocks.find((block) => {
      if (block.status === "skipped") return false;
      const start = fromDateKey(block.date, block.startTime).getTime();
      const diffMinutes = (start - nowTs) / (1000 * 60);
      return diffMinutes >= 0 && diffMinutes <= 15;
    });
    if (upcoming) {
      list.push({
        tone: "accent",
        text:
          locale === "ar"
            ? `${upcoming.startTime}: بدا ${getAppLabel(upcoming.appType, locale)} (${getModeLabel(upcoming.mode, locale)})`
            : locale === "fr"
            ? `${upcoming.startTime} : démarre ${getAppLabel(upcoming.appType, locale)} (${getModeLabel(upcoming.mode, locale)})`
            : `${upcoming.startTime}: start ${getAppLabel(upcoming.appType, locale)} (${getModeLabel(upcoming.mode, locale)})`,
      });
    }

    if (isLunchPeak(nowDate)) {
      list.push({
        tone: "accent",
        text:
          locale === "ar"
            ? "11:00-14:00 ذروة الغدا خدامة."
            : locale === "fr"
            ? "11:00-14:00 pic midi actif."
            : "11:00-14:00 lunch peak active.",
      });
    }
    if (isDinnerPeak(nowDate)) {
      list.push({
        tone: "accent",
        text:
          locale === "ar"
            ? "17:00-20:00 ذروة العشية خدامة."
            : locale === "fr"
            ? "17:00-20:00 pic du soir actif."
            : "17:00-20:00 dinner peak active.",
      });
    }

    if (activeSession && activeSession.appType !== recommendation.app) {
      list.push({
        tone: "warning",
        text:
          locale === "ar"
            ? `التبديل المقترح: من ${getAppLabel(activeSession.appType, locale)} لـ ${getAppLabel(recommendation.app, locale)}.`
            : locale === "fr"
            ? `Switch recommandé : passer de ${getAppLabel(activeSession.appType, locale)} vers ${getAppLabel(recommendation.app, locale)}.`
            : `Recommended switch: move from ${getAppLabel(activeSession.appType, locale)} to ${getAppLabel(recommendation.app, locale)}.`,
      });
    }

    if (weeklyStats.behindGross > 0 && settings.alertIfUnderperforming) {
      list.push({
        tone: "warning",
        text:
          locale === "ar"
            ? `تأخر أسبوعي: ناقص ${formatCurrency(weeklyStats.behindGross)} على المسار.`
            : locale === "fr"
            ? `Retard hebdo : ${formatCurrency(weeklyStats.behindGross)} sous la trajectoire.`
            : `Weekly delay: ${formatCurrency(weeklyStats.behindGross)} below target pace.`,
      });
    }

    if (weeklyStats.lyftGross >= settings.weeklyRental) {
      list.push({
        tone: "success",
        text:
          locale === "ar"
            ? "مزيان: الكراء الأسبوعي تغطى."
            : locale === "fr"
            ? "Succès : location hebdo couverte."
            : "Success: weekly rental covered.",
      });
    }

    if (weeklyStats.lyftRides >= settings.minLyftRides) {
      list.push({
        tone: "success",
        text:
          locale === "ar"
            ? "مزيان: وصلتي للحد الأدنى ديال طراجات Lyft."
            : locale === "fr"
            ? "Succès : minimum Lyft atteint."
            : "Success: minimum Lyft rides reached.",
      });
    }

    return list.slice(0, 6);
  }, [dayBlocks, nowTs, nowDate, activeSession, recommendation, weeklyStats, settings, locale]);

  const requestBrowserNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission !== "granted") return;
    new Notification(
      locale === "ar"
        ? "تفعّلات إشعارات ShiftPilot"
        : locale === "fr"
        ? "Notifications ShiftPilot activées"
        : "ShiftPilot notifications enabled",
      {
        body:
          locale === "ar"
            ? "غادي يوصلكم تذكير بالبلوكات الجاية وتنبيهات التأخر."
            : locale === "fr"
            ? "Tu recevras des rappels de blocs à venir et des alertes de rattrapage."
            : "You will receive upcoming block reminders and catch-up warnings.",
      }
    );
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!settings.browserNotificationsEnabled) return;
    if (notificationPermission !== "granted") return;

    const nowMs = nowTs;
    const nextSent: string[] = [];

    const pushIfMissing = (id: string, title: string, body: string) => {
      if (sentNotificationIds.includes(id) || nextSent.includes(id)) return;
      nextSent.push(id);
      new Notification(title, { body });
    };

    dayBlocks.forEach((block) => {
      if (block.status === "skipped") return;
      const startMs = fromDateKey(block.date, block.startTime).getTime();
      const diffMinutes = (startMs - nowMs) / (1000 * 60);
      if (diffMinutes >= 0 && diffMinutes <= 10) {
        const id = `block:${block.id}:${block.date}:${block.startTime}`;
        pushIfMissing(
          id,
          locale === "ar"
            ? `ShiftPilot • ${getAppLabel(block.appType, locale)} بعد ${Math.max(0, Math.round(diffMinutes))} دقايق`
            : locale === "fr"
            ? `ShiftPilot • ${getAppLabel(block.appType, locale)} dans ${Math.max(0, Math.round(diffMinutes))} min`
            : `ShiftPilot • ${getAppLabel(block.appType, locale)} in ${Math.max(0, Math.round(diffMinutes))} min`,
          locale === "ar"
            ? `المود ${getModeLabel(block.mode, locale)}. الهدف ${formatCurrency(block.targetEarnings)} و ${block.targetRides} طرجة/ليفريزون.`
            : locale === "fr"
            ? `Mode ${getModeLabel(block.mode, locale)}. Objectif ${formatCurrency(block.targetEarnings)} et ${block.targetRides} courses/livraisons.`
            : `Mode ${getModeLabel(block.mode, locale)}. Target ${formatCurrency(block.targetEarnings)} and ${block.targetRides} rides/deliveries.`
        );
      }
    });

    if (settings.alertIfUnderperforming && weeklyStats.behindGross > 0) {
      const id = `behind:${toDateKey(nowDate)}`;
      pushIfMissing(
        id,
        locale === "ar"
          ? "ShiftPilot • راك متأخر على الهدف"
          : locale === "fr"
          ? "ShiftPilot • Tu es en retard sur l'objectif"
          : "ShiftPilot • You are behind target",
        locale === "ar"
          ? `${formatCurrency(weeklyStats.behindGross)} تحت المسار. فكر تزيد بلوك دابا.`
          : locale === "fr"
          ? `${formatCurrency(weeklyStats.behindGross)} sous la trajectoire. Pense à ajouter un bloc maintenant.`
          : `${formatCurrency(weeklyStats.behindGross)} below trajectory. Consider an extra block now.`
      );
    }

    if (nextSent.length > 0) {
      setSentNotificationIds((prev) => [...prev, ...nextSent]);
    }
  }, [
    nowTs,
    dayBlocks,
    settings.browserNotificationsEnabled,
    settings.alertIfUnderperforming,
    notificationPermission,
    sentNotificationIds,
    weeklyStats.behindGross,
    nowDate,
    locale,
  ]);

  const prepareClockIn = () => {
    const now = new Date(nowTs);
    setClockInApp(lastApp);
    setClockInMode(getModeForTime(now));
    setClockInTargetEarnings("");
    setClockInTargetRides("");
    setClockInOpen(true);
  };

  const startSession = (
    appType: AppType,
    mode: SessionMode,
    targetEarnings: number | null,
    targetRides: number | null
  ) => {
    if (activeSession) return;
    const next: ActiveSession = {
      id: createId("active"),
      appType,
      mode,
      startTime: new Date(nowTs).toISOString(),
      pauseStartedAt: null,
      pausedSeconds: 0,
      earnings: 0,
      tips: 0,
      ridesOrDeliveries: 0,
      gas: 0,
      tolls: 0,
      notes: "",
      targetEarnings,
      targetRides,
    };
    setActiveSession(next);
    setLastApp(appType);
    setLastMode(mode);
    setClockOutSummary(null);
  };

  const submitClockIn = () => {
    startSession(
      clockInApp,
      clockInMode,
      parseOptionalNumber(clockInTargetEarnings),
      parseOptionalNumber(clockInTargetRides)
    );
    setClockInOpen(false);
    setTab("today");
  };

  const togglePause = () => {
    if (!activeSession) return;
    const nowIso = new Date(nowTs).toISOString();
    setActiveSession((prev) => {
      if (!prev) return prev;
      if (!prev.pauseStartedAt) {
        return { ...prev, pauseStartedAt: nowIso };
      }
      const extra = Math.max(0, nowTs - new Date(prev.pauseStartedAt).getTime()) / 1000;
      return {
        ...prev,
        pauseStartedAt: null,
        pausedSeconds: prev.pausedSeconds + extra,
      };
    });
  };

  const applyActiveDelta = (
    field: "ridesOrDeliveries" | "earnings" | "tips" | "gas" | "tolls",
    delta: number
  ) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const nextValue = Math.max(0, round2(prev[field] + delta));
      return { ...prev, [field]: nextValue };
    });
  };

  const openClockOut = () => {
    if (!activeSession) return;
    setClockOutEarnings(activeSession.earnings.toFixed(2));
    setClockOutRides(activeSession.ridesOrDeliveries.toString());
    setClockOutTips(activeSession.tips.toFixed(2));
    setClockOutGas(activeSession.gas.toFixed(2));
    setClockOutTolls(activeSession.tolls.toFixed(2));
    setClockOutNotes(activeSession.notes);
    setClockOutOpen(true);
  };

  const markOverlappingBlocksDone = (session: WorkSession) => {
    setDayPlanBlocks((prev) =>
      prev.map((block) => {
        if (overlapsSessionAndBlock(session, block) && block.status !== "skipped") {
          return { ...block, status: "done" };
        }
        return block;
      })
    );
  };

  const submitClockOut = () => {
    if (!activeSession) return;
    const nextAppAfterClockOut = pendingSwitchApp;

    const endIso = new Date(nowTs).toISOString();
    const duration = computeActiveDurationSeconds(activeSession, nowTs);
    const session: WorkSession = {
      id: createId("session"),
      appType: activeSession.appType,
      mode: activeSession.mode,
      startTime: activeSession.startTime,
      endTime: endIso,
      durationSeconds: duration,
      earnings: parseNumber(clockOutEarnings),
      tips: parseNumber(clockOutTips),
      ridesOrDeliveries: Math.max(0, Math.floor(parseNumber(clockOutRides))),
      gas: parseNumber(clockOutGas),
      tolls: parseNumber(clockOutTolls),
      notes: clockOutNotes.trim(),
      targetEarnings: activeSession.targetEarnings,
      targetRides: activeSession.targetRides,
    };

    setSessions((prev) => [session, ...prev]);
    markOverlappingBlocksDone(session);
    setLastApp(session.appType);
    setLastMode(session.mode);
    setPendingSwitchApp(null);
    if (nextAppAfterClockOut) {
      const autoMode = getModeForTime(new Date(nowTs));
      setActiveSession({
        id: createId("active"),
        appType: nextAppAfterClockOut,
        mode: autoMode,
        startTime: new Date(nowTs).toISOString(),
        pauseStartedAt: null,
        pausedSeconds: 0,
        earnings: 0,
        tips: 0,
        ridesOrDeliveries: 0,
        gas: 0,
        tolls: 0,
        notes: "",
        targetEarnings: null,
        targetRides: null,
      });
      setLastApp(nextAppAfterClockOut);
      setLastMode(autoMode);
    } else {
      setActiveSession(null);
    }
    setClockOutOpen(false);

    const gross = sessionGross(session);
    const net = sessionNet(session);
    const avgPerHour = session.durationSeconds > 0 ? gross / (session.durationSeconds / 3600) : 0;
    setClockOutSummary([
      locale === "ar" ? "تسجلات السيشن" : locale === "fr" ? "Session enregistrée" : "Session saved",
      locale === "ar"
        ? `${formatCurrency(gross)} فـ ${formatDurationShort(session.durationSeconds)}`
        : locale === "fr"
        ? `${formatCurrency(gross)} en ${formatDurationShort(session.durationSeconds)}`
        : `${formatCurrency(gross)} in ${formatDurationShort(session.durationSeconds)}`,
      locale === "ar"
        ? `الريتم: ${formatCurrency(avgPerHour)}/h`
        : locale === "fr"
        ? `Rythme : ${formatCurrency(avgPerHour)}/h`
        : `Rate: ${formatCurrency(avgPerHour)}/h`,
      locale === "ar"
        ? `${session.ridesOrDeliveries} طرجة/ليفريزون`
        : locale === "fr"
        ? `${session.ridesOrDeliveries} courses/livraisons`
        : `${session.ridesOrDeliveries} rides/deliveries`,
      `${copy.netAfterExpenses}: ${formatCurrency(net)}`,
      locale === "ar"
        ? `${copy.remainingDayTarget}: ${formatCurrency(Math.max(0, dailyGrossTarget - todayGross))} و ${Math.max(
            0,
            dailyRideTarget - todayRides
          )} ${copy.rides}`
        : locale === "fr"
        ? `${copy.remainingDayTarget}: ${formatCurrency(Math.max(0, dailyGrossTarget - todayGross))} et ${Math.max(
            0,
            dailyRideTarget - todayRides
          )} ${copy.rides}`
        : `${copy.remainingDayTarget}: ${formatCurrency(Math.max(0, dailyGrossTarget - todayGross))} and ${Math.max(
            0,
            dailyRideTarget - todayRides
          )} ${copy.rides}`,
      ...(nextAppAfterClockOut
        ? [`${copy.afterSaveAutoStart} ${getAppLabel(nextAppAfterClockOut, locale)}.`]
        : []),
    ]);
  };

  const confirmSwitchApp = () => {
    if (!activeSession) return;
    setPendingSwitchApp(switchTargetApp);
    setSwitchOpen(false);
    openClockOut();
  };

  const ensureDayBlocksForDate = (dateKey: string) => {
    setDayPlanBlocks((prev) => {
      if (prev.some((block) => block.date === dateKey)) return prev;
      return [...prev, ...getTemplateBlocksForDate(dateKey, onboarding.template)];
    });
  };

  const openAddBlock = () => {
    setBlockEditId(null);
    setBlockDate(selectedDate);
    setBlockApp(recommendation.app);
    setBlockMode(getModeForTime(new Date(nowTs)));
    setBlockStart("09:00");
    setBlockEnd("11:00");
    setBlockTargetEarnings("70");
    setBlockTargetRides("5");
    setBlockOpen(true);
  };

  const openEditBlock = (block: DayPlanBlock) => {
    setBlockEditId(block.id);
    setBlockDate(block.date);
    setBlockApp(block.appType);
    setBlockMode(block.mode);
    setBlockStart(block.startTime);
    setBlockEnd(block.endTime);
    setBlockTargetEarnings(block.targetEarnings.toString());
    setBlockTargetRides(block.targetRides.toString());
    setBlockOpen(true);
  };

  const saveBlock = () => {
    const nextBlock: DayPlanBlock = {
      id: blockEditId ?? createId("block"),
      date: blockDate,
      appType: blockApp,
      mode: blockMode,
      startTime: blockStart,
      endTime: blockEnd,
      targetEarnings: Math.max(0, parseNumber(blockTargetEarnings)),
      targetRides: Math.max(0, Math.floor(parseNumber(blockTargetRides))),
      status: "planned",
    };

    setDayPlanBlocks((prev) => {
      const without = prev.filter((item) => item.id !== nextBlock.id);
      return [...without, nextBlock];
    });
    setBlockOpen(false);
  };

  const toggleSkipBlock = (block: DayPlanBlock) => {
    ensureDayBlocksForDate(block.date);
    setDayPlanBlocks((prev) =>
      prev.map((item) => {
        if (item.id !== block.id) return item;
        const status = item.status === "skipped" ? "planned" : "skipped";
        return { ...item, status };
      })
    );
  };

  const startBlock = (block: DayPlanBlock) => {
    if (activeSession) return;
    startSession(block.appType, block.mode, block.targetEarnings, block.targetRides);
    setTab("today");
  };

  const openManual = () => {
    setManualApp(lastApp);
    setManualMode(lastMode);
    setManualDate(selectedDate);
    setManualStart("09:00");
    setManualEnd("11:00");
    setManualEarnings("0");
    setManualRides("0");
    setManualTips("0");
    setManualGas("0");
    setManualTolls("0");
    setManualNotes("");
    setEditSessionId(null);
    setManualOpen(true);
  };

  const openEditSession = (session: WorkSession) => {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    setEditSessionId(session.id);
    setManualApp(session.appType);
    setManualMode(session.mode);
    setManualDate(toDateKey(start));
    setManualStart(
      `${start.getHours().toString().padStart(2, "0")}:${start
        .getMinutes()
        .toString()
        .padStart(2, "0")}`
    );
    setManualEnd(
      `${end.getHours().toString().padStart(2, "0")}:${end
        .getMinutes()
        .toString()
        .padStart(2, "0")}`
    );
    setManualEarnings(session.earnings.toString());
    setManualRides(session.ridesOrDeliveries.toString());
    setManualTips(session.tips.toString());
    setManualGas(session.gas.toString());
    setManualTolls(session.tolls.toString());
    setManualNotes(session.notes);
    setManualOpen(true);
  };

  const saveManualSession = () => {
    const start = fromDateKey(manualDate, manualStart);
    const endRaw = fromDateKey(manualDate, manualEnd);
    const end = normalizeBlockEnd(start, endRaw);
    const durationSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));

    const next: WorkSession = {
      id: editSessionId ?? createId("session"),
      appType: manualApp,
      mode: manualMode,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationSeconds,
      earnings: parseNumber(manualEarnings),
      tips: parseNumber(manualTips),
      ridesOrDeliveries: Math.max(0, Math.floor(parseNumber(manualRides))),
      gas: parseNumber(manualGas),
      tolls: parseNumber(manualTolls),
      notes: manualNotes.trim(),
      targetEarnings: null,
      targetRides: null,
    };

    setSessions((prev) => {
      const without = prev.filter((item) => item.id !== next.id);
      return [next, ...without];
    });
    markOverlappingBlocksDone(next);
    setManualOpen(false);
    setEditSessionId(null);
  };

  const deleteSession = (id: string) => {
    const ok = window.confirm(
      locale === "ar"
        ? "واش بغيتي تحيد هاد السيشن؟"
        : locale === "fr"
        ? "Supprimer cette session ?"
        : "Delete this session?"
    );
    if (!ok) return;
    setSessions((prev) => prev.filter((session) => session.id !== id));
  };

  const applyTemplateToCurrentWeek = (template: ShiftPilotTemplate) => {
    const referenceDate = fromDateKey(selectedDate, "00:00");
    const weekStart = getWeekStart(referenceDate, settingsDraft.weekStartDay);
    const weekDateKeys = Array.from({ length: 7 }, (_, index) =>
      toDateKey(addDays(weekStart, index))
    );
    const weekDateSet = new Set(weekDateKeys);
    setDayPlanBlocks((prev) => {
      const keep = prev.filter(
        (block) => !weekDateSet.has(block.date) || block.status !== "planned"
      );
      const generated = weekDateKeys.flatMap((dateKey) =>
        getTemplateBlocksForDate(dateKey, template)
      );
      return [...keep, ...generated];
    });
  };

  const setOnboardingStep = (step: 1 | 2 | 3 | 4) => {
    setOnboarding((prev) => ({ ...prev, currentStep: step }));
  };

  const previousOnboardingStep = () => {
    setOnboarding((prev) => {
      if (prev.currentStep <= 1) return prev;
      return { ...prev, currentStep: (prev.currentStep - 1) as 1 | 2 | 3 | 4 };
    });
  };

  const nextOnboardingStep = () => {
    setOnboarding((prev) => {
      if (prev.currentStep >= 4) return prev;
      return { ...prev, currentStep: (prev.currentStep + 1) as 1 | 2 | 3 | 4 };
    });
  };

  const completeOnboarding = async () => {
    setSettings(settingsDraft);
    applyTemplateToCurrentWeek(onboarding.template);
    if (
      settingsDraft.browserNotificationsEnabled &&
      notificationPermission !== "granted"
    ) {
      await requestBrowserNotifications();
    }
    setOnboarding((prev) => ({
      ...prev,
      completed: true,
      currentStep: 4,
    }));
    setOnboardingOpen(false);
  };

  const saveSettings = async () => {
    setSettings(settingsDraft);
    if (
      settingsDraft.browserNotificationsEnabled &&
      notificationPermission !== "granted"
    ) {
      await requestBrowserNotifications();
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setSettingsDraft(DEFAULT_SETTINGS);
  };

  const tellMeNow = () => {
    setCoachAnswer(recommendation.instruction);
  };

  const getBlockStatus = (block: DayPlanBlock): "active" | "upcoming" | "done" | "skipped" => {
    if (block.status === "skipped") return "skipped";

    if (block.status === "done") return "done";

    const blockStart = fromDateKey(block.date, block.startTime).getTime();
    const blockEnd = normalizeBlockEnd(
      fromDateKey(block.date, block.startTime),
      fromDateKey(block.date, block.endTime)
    ).getTime();

    if (activeSession) {
      const activeStart = new Date(activeSession.startTime).getTime();
      const activeEnd = nowTs;
      if (activeStart <= blockEnd && activeEnd >= blockStart) {
        return "active";
      }
    }

    const doneBySession = sessions.some((session) => overlapsSessionAndBlock(session, block));
    if (doneBySession) return "done";

    if (nowTs > blockEnd) return "skipped";
    return "upcoming";
  };

  const actionPrimaryLabel = activeSession ? copy.clockOut : copy.clockIn;
  const weekMaxGross = Math.max(1, ...weekDailySeries.map((item) => item.gross));
  const weekMaxHours = Math.max(1, ...weekDailySeries.map((item) => item.hours));
  const notificationSupported =
    typeof window !== "undefined" && "Notification" in window;
  const historySheetPath = pathname?.startsWith("/superadmin")
    ? "/superadmin/shiftpilot/history-sheet"
    : "/shiftpilot/history-sheet";

  return (
    <div className="space-y-6 pb-28" dir={pageDir}>
      {!onboarding.completed ? (
        <Card className="space-y-3 border-amber-200 bg-amber-50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {copy.onboardingInProgress}
              </p>
              <p className="text-sm text-amber-900">
                {copy.step} {onboarding.currentStep}/4:{" "}
                {onboardingStepMeta.find(
                  (item) => item.step === onboarding.currentStep
                )?.title ?? copy.setupFallback}
              </p>
            </div>
            <Button size="sm" onClick={() => setOnboardingOpen(true)}>
              {copy.continueSetup}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3 border-slate-200 bg-[var(--surface)]/95">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">{copy.quickActions}</p>
          <p className="text-xs text-slate-500">{copy.quickActionsDesc}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="flex-1 min-w-[130px]"
            onClick={() => {
              if (activeSession) {
                openClockOut();
              } else {
                prepareClockIn();
              }
            }}
          >
            {actionPrimaryLabel}
          </Button>
          <Button className="flex-1 min-w-[130px]" variant="secondary" onClick={openManual}>
            {copy.addEarnings}
          </Button>
          <Button
            className="flex-1 min-w-[130px]"
            variant="secondary"
            onClick={() => setReviewOpen(true)}
          >
            {copy.reviewDay}
          </Button>
          <Button className="flex-1 min-w-[170px]" variant="ghost" onClick={tellMeNow}>
            {copy.tellMeNow}
          </Button>
        </div>
      </Card>

      {clockOutSummary ? (
        <Card className="space-y-2 border-emerald-200 bg-emerald-50">
          <p className="text-sm font-semibold text-emerald-800">{copy.latestClockOutReview}</p>
          <ul className="space-y-1 text-sm text-emerald-900">
            {clockOutSummary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {tab === "home" ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.todayStatus}</p>
                <p className="text-xl font-semibold text-slate-900">
                  {activeSession
                    ? `${getAppLabel(activeSession.appType, locale)} ${copy.active}`
                    : copy.notClockedIn}
                </p>
              </div>
              <Badge tone={activeSession ? "accent" : "muted"}>
                {activeSession ? formatDurationHms(activeDuration) : copy.offline}
              </Badge>
            </div>
            {activeSession ? (
              <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900 sm:grid-cols-4">
                <p>{copy.start}: {new Date(activeSession.startTime).toLocaleTimeString(LOCALE_TO_BCP47[locale])}</p>
                <p>{copy.earnings}: {formatCurrency(activeSession.earnings)}</p>
                <p>{copy.tips}: {formatCurrency(activeSession.tips)}</p>
                <p>{copy.rides}: {activeSession.ridesOrDeliveries}</p>
              </div>
            ) : null}
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.weeklyGrossGoal}</p>
              <p className="text-xl font-semibold text-slate-900">
                {formatCurrency(weeklyStats.weeklyGross)} / {formatCurrency(weeklyStats.grossTarget)}
              </p>
              <Progress value={progressPercent(weeklyStats.weeklyGross, weeklyStats.grossTarget)} />
              <p className="text-xs text-slate-500">
                {copy.remaining}: {formatCurrency(weeklyStats.remainingGrossTarget)}
              </p>
            </Card>

            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.rentalCoverage}</p>
              <p className="text-xl font-semibold text-slate-900">
                {formatCurrency(weeklyStats.rentalCovered)} / {formatCurrency(settings.weeklyRental)}
              </p>
              <Progress value={progressPercent(weeklyStats.rentalCovered, settings.weeklyRental)} />
              <p className="text-xs text-slate-500">
                {copy.remainingRental}: {formatCurrency(weeklyStats.remainingRental)}
              </p>
            </Card>

            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.lyftRidesMinimum}</p>
              <p className="text-xl font-semibold text-slate-900">
                {weeklyStats.lyftRides} / {settings.minLyftRides}
              </p>
              <Progress value={progressPercent(weeklyStats.lyftRides, settings.minLyftRides)} />
              <p className="text-xs text-slate-500">{copy.remainingRides}: {weeklyStats.remainingRides}</p>
            </Card>

            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.hoursVsPlan}</p>
              <p className="text-xl font-semibold text-slate-900">{round2(weeklyStats.hoursWorked)}h</p>
              <Progress
                value={progressPercent(
                  weeklyStats.hoursWorked,
                  weeklyStats.hoursWorked + weeklyStats.remainingPlannedHours
                )}
              />
              <p className="text-xs text-slate-500">
                {copy.remainingPlannedHours}: {round2(weeklyStats.remainingPlannedHours)}h
              </p>
            </Card>
          </div>

          <Card className="space-y-3 border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold text-blue-900">{recommendation.title}</p>
              <Badge tone={recommendation.app === "Lyft" ? "accent" : "warning"}>{recommendation.app}</Badge>
            </div>
            <ul className="space-y-1 text-sm text-blue-900">
              {recommendation.details.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="rounded-2xl border border-blue-200 bg-[var(--surface)] p-3">
              <p className="text-sm font-semibold text-slate-900">{copy.whatShouldIDoNow}</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {(coachAnswer.length > 0 ? coachAnswer : recommendation.instruction).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="mt-3">
                <Button onClick={tellMeNow} size="sm">{copy.tellMeNow}</Button>
              </div>
            </div>
          </Card>

          <Card className="space-y-3">
            <p className="text-base font-semibold text-slate-900">{copy.notifications}</p>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500">{copy.noUrgentAlert}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notifications.map((item) => (
                  <li
                    key={item.text}
                    className="rounded-xl border border-slate-200 bg-[var(--surface)] px-3 py-2 text-slate-700"
                  >
                    <Badge tone={item.tone} className="mr-2">
                      {item.tone}
                    </Badge>
                    {item.text}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "today" ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-semibold text-slate-900">{copy.liveSession}</p>
              <Badge tone={activeSession ? "accent" : "muted"}>
                {activeSession ? copy.active : copy.noActiveSession}
              </Badge>
            </div>

            {activeSession ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-blue-700">{copy.timer}</p>
                  <p className="mt-1 text-3xl font-semibold text-blue-900">{formatDurationHms(activeDuration)}</p>
                  <p className="text-sm text-blue-800">
                    {getAppLabel(activeSession.appType, locale)} · {getModeLabel(activeSession.mode, locale)} · {copy.started}{" "}
                    {new Date(activeSession.startTime).toLocaleTimeString(LOCALE_TO_BCP47[locale], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Card className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                      {activeSession.appType === "Lyft" ? copy.rides : copy.deliveries}
                    </p>
                    <p className="text-2xl font-semibold text-slate-900">{activeSession.ridesOrDeliveries}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => applyActiveDelta("ridesOrDeliveries", 1)}>
                        +1
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => applyActiveDelta("ridesOrDeliveries", -1)}>
                        -1
                      </Button>
                    </div>
                  </Card>

                  <Card className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Earnings</p>
                    <p className="text-2xl font-semibold text-slate-900">{formatCurrency(activeSession.earnings)}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => applyActiveDelta("earnings", 5)}>
                        +$5
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => applyActiveDelta("earnings", -5)}>
                        -$5
                      </Button>
                    </div>
                  </Card>

                  <Card className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.tip}</p>
                    <p className="text-2xl font-semibold text-slate-900">{formatCurrency(activeSession.tips)}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => applyActiveDelta("tips", 2)}>
                        +$2
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => applyActiveDelta("tips", -2)}>
                        -$2
                      </Button>
                    </div>
                  </Card>

                  <Card className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.expense}</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {formatCurrency(activeSession.gas + activeSession.tolls)}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => applyActiveDelta("gas", 2)}>
                        +$2 {copy.gas}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => applyActiveDelta("tolls", 1)}>
                        +$1 {copy.toll}
                      </Button>
                    </div>
                  </Card>
                </div>

                <Card className="space-y-2 border-amber-200 bg-amber-50">
                  <p className="text-sm font-semibold text-amber-900">{copy.midSessionCoach}</p>
                  <p className="text-sm text-amber-900">
                    {copy.currentPace}: {formatCurrency(activeDuration > 0 ? (sessionGross(activeSession) / activeDuration) * 3600 : 0)}/h
                  </p>
                  <p className="text-sm text-amber-900">
                    {copy.ifPaceContinues} {formatCurrency(weeklyStats.remainingGrossTarget)}.
                  </p>
                </Card>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={togglePause}>
                    {activeSession.pauseStartedAt ? copy.resume : copy.pause}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSwitchTargetApp(activeSession.appType === "Lyft" ? "DoorDash" : "Lyft");
                      setSwitchOpen(true);
                    }}
                  >
                    {copy.switchApp}
                  </Button>
                  <Button onClick={openClockOut}>{copy.clockOut}</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                {copy.noActiveSessionBody}
              </p>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-semibold text-slate-900">{copy.dayPlanner}</p>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="w-[170px]"
                />
                <Button size="sm" variant="secondary" onClick={openAddBlock}>
                  {copy.addExtraBlock}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {dayBlocks.map((block) => {
                const status = getBlockStatus(block);
                return (
                  <div
                    key={block.id}
                    className="rounded-2xl border border-slate-200 bg-[var(--surface)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">
                        {block.startTime} - {block.endTime} · {getAppLabel(block.appType, locale)} ({getModeLabel(block.mode, locale)})
                      </p>
                      <Badge tone={statusTone(status)}>{status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {copy.target}: {formatCurrency(block.targetEarnings)} · {block.targetRides} {copy.rides}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggleSkipBlock(block)}>
                        {block.status === "skipped" ? copy.unskip : copy.markSkipped}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!!activeSession || block.status === "skipped"}
                        onClick={() => startBlock(block)}
                      >
                        {copy.startThisBlock}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditBlock(block)}>
                        {copy.editBlock}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              {weeklyStats.behindGross > 0
                ? copy.importantBlock
                : copy.canSkipBlock}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "week" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.weeklyGross}</p>
              <p className="text-xl font-semibold text-slate-900">{formatCurrency(weeklyStats.weeklyGross)}</p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.weeklyNet}</p>
              <p className="text-xl font-semibold text-slate-900">{formatCurrency(weeklyStats.weeklyNet)}</p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.avgPerHour}</p>
              <p className="text-xl font-semibold text-slate-900">{formatCurrency(weeklyStats.avgPerHour)}</p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{copy.avgPerRide}</p>
              <p className="text-xl font-semibold text-slate-900">{formatCurrency(weeklyStats.avgPerRide)}</p>
            </Card>
          </div>

          <Card className="space-y-3">
            <p className="text-base font-semibold text-slate-900">{copy.earningsByDay}</p>
            <div className="space-y-2">
              {weekDailySeries.map((item) => (
                <div key={item.dateKey} className="grid grid-cols-[90px_1fr_80px] items-center gap-2 text-sm">
                  <span className="text-slate-600">{item.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${(item.gross / weekMaxGross) * 100}%` }}
                    />
                  </div>
                  <span className="text-right text-slate-700">{formatCurrency(item.gross)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <p className="text-base font-semibold text-slate-900">{copy.hoursByDay}</p>
            <div className="space-y-2">
              {weekDailySeries.map((item) => (
                <div key={`${item.dateKey}_h`} className="grid grid-cols-[90px_1fr_80px] items-center gap-2 text-sm">
                  <span className="text-slate-600">{item.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(item.hours / weekMaxHours) * 100}%` }}
                    />
                  </div>
                  <span className="text-right text-slate-700">{round2(item.hours)}h</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <p className="text-base font-semibold text-slate-900">{copy.split}</p>
            <div className="space-y-2 text-sm">
              <p className="text-slate-700">{getAppLabel("Lyft", locale)} {copy.gross}: {formatCurrency(weeklyStats.lyftGross)}</p>
              <Progress value={progressPercent(weeklyStats.lyftGross, weeklyStats.weeklyGross || 1)} />
              <p className="text-slate-700">{getAppLabel("DoorDash", locale)} {copy.gross}: {formatCurrency(weeklyStats.doordashGross)}</p>
              <Progress value={progressPercent(weeklyStats.doordashGross, weeklyStats.weeklyGross || 1)} />
            </div>
          </Card>

          <Card className="space-y-2 border-amber-200 bg-amber-50">
            <p className="text-base font-semibold text-amber-900">{copy.smartInsights}</p>
            <ul className="space-y-1 text-sm text-amber-900">
              <li>
                {copy.bestSession}: {bestSessions.bestHour ? `${getAppLabel(bestSessions.bestHour.appType, locale)} ${getModeLabel(bestSessions.bestHour.mode, locale)}` : copy.noDataYet}
              </li>
              <li>
                {copy.tuesdayLunchAverage}: {formatCurrency(bestSessions.avgLunchDoorDash)}
              </li>
              <li>
                {copy.requiredHourlyRate}: {formatCurrency(weeklyStats.requiredHourlyRate)}/h
              </li>
              <li>
                {copy.remaining}: {formatCurrency(weeklyStats.remainingGrossTarget)} {copy.gross} و {weeklyStats.remainingRides} {getAppLabel("Lyft", locale)} {copy.rides}
              </li>
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-slate-900">{copy.history}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open(historySheetPath, "_blank")}
                >
                  {copy.openHistorySheet}
                </Button>
              </div>
              <div className="w-full max-w-xs space-y-1">
                <Input
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                />
              </div>
            </div>

            <div className="space-y-2">
              {filteredHistory.length === 0 ? (
                <p className="text-sm text-slate-500">{copy.noSessionsFound}</p>
              ) : (
                filteredHistory.map((session) => {
                  const gross = sessionGross(session);
                  return (
                    <div key={session.id} className="rounded-2xl border border-slate-200 bg-[var(--surface)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-900">
                          {getAppLabel(session.appType, locale)} · {getModeLabel(session.mode, locale)}
                        </p>
                        <p className="text-sm text-slate-600">{new Date(session.startTime).toLocaleString(LOCALE_TO_BCP47[locale])}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatCurrency(gross)} · {formatDurationShort(session.durationSeconds)} · {session.ridesOrDeliveries} {copy.rides}/{copy.deliveries}
                      </p>
                      {session.notes ? (
                        <p className="mt-1 text-sm text-slate-500">{session.notes}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEditSession(session)}>
                          {copy.edit}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => deleteSession(session.id)}>
                          {copy.delete}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="space-y-4">
          <Card className="space-y-4">
            <p className="text-lg font-semibold text-slate-900">{copy.weeklySetup}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.weeklyNetGoal}</p>
                <Input
                  type="number"
                  value={settingsDraft.weeklyNetGoal}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      weeklyNetGoal: Math.max(0, parseNumber(event.target.value)),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.weeklyRental}</p>
                <Input
                  type="number"
                  value={settingsDraft.weeklyRental}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      weeklyRental: Math.max(0, parseNumber(event.target.value)),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.minimumLyftRides}</p>
                <Input
                  type="number"
                  value={settingsDraft.minLyftRides}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      minLyftRides: Math.max(0, Math.floor(parseNumber(event.target.value))),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.weekStartsOn}</p>
                <select
                  value={settingsDraft.weekStartDay}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      weekStartDay: event.target.value === "Sunday" ? "Sunday" : "Monday",
                    }))
                  }
                  className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                >
                  <option value="Monday">{copy.monday}</option>
                  <option value="Sunday">{copy.sunday}</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <p className="text-lg font-semibold text-slate-900">{copy.workPreferences}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.minimumDailyHours}</p>
                <Input
                  type="number"
                  value={settingsDraft.minDailyHours}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      minDailyHours: Math.max(0, parseNumber(event.target.value)),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.preferredMaxDailyHours}</p>
                <Input
                  type="number"
                  value={settingsDraft.preferredMaxDailyHours}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      preferredMaxDailyHours: Math.max(0, parseNumber(event.target.value)),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.preferredBreakTimes}</p>
                <Input
                  value={settingsDraft.preferredBreakTimes}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({ ...prev, preferredBreakTimes: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.preferredApps}</p>
                <select
                  value={settingsDraft.preferredApps}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      preferredApps:
                        event.target.value === "Lyft"
                          ? "Lyft"
                          : event.target.value === "DoorDash"
                          ? "DoorDash"
                          : "both",
                    }))
                  }
                  className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                >
                  <option value="both">{copy.bothApps}</option>
                  <option value="Lyft">{copy.lyftOnly}</option>
                  <option value="DoorDash">{copy.doordashOnly}</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.preferredHourlyTarget}</p>
                <Input
                  type="number"
                  value={settingsDraft.preferredHourlyTarget}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      preferredHourlyTarget: Math.max(0, parseNumber(event.target.value)),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.preferredPerRideTarget}</p>
                <Input
                  type="number"
                  value={settingsDraft.preferredPerRideTarget}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      preferredPerRideTarget: Math.max(0, parseNumber(event.target.value)),
                    }))
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={settingsDraft.alertIfUnderperforming}
                onChange={(event) =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    alertIfUnderperforming: event.target.checked,
                  }))
                }
              />
              {copy.alertWhenUnderperforming}
            </label>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settingsDraft.browserNotificationsEnabled}
                  onChange={(event) =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      browserNotificationsEnabled: event.target.checked,
                    }))
                  }
                />
                {copy.enableBrowserNotifications}
              </label>
              <p className="text-xs text-slate-600">
                {copy.permissionStatus}:{" "}
                {notificationSupported ? notificationPermission : copy.unsupported}
              </p>
              {notificationSupported ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={requestBrowserNotifications}
                >
                  {copy.requestNotificationPermission}
                </Button>
              ) : (
                <p className="text-xs text-slate-500">
                  {copy.notificationsUnsupported}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={saveSettings}>{copy.saveSettings}</Button>
              <Button variant="secondary" onClick={resetSettings}>
                {copy.resetDefaults}
              </Button>
            </div>
          </Card>

          <Card className="space-y-3 border-blue-200 bg-blue-50">
            <p className="text-base font-semibold text-blue-900">{copy.scheduleTemplate}</p>
            <Textarea
              value={
                onboarding.template === "aggressive"
                  ? copy.aggressiveText
                  : onboarding.template === "weekend_focus"
                  ? copy.weekendFocusText
                  : copy.balancedText
              }
              readOnly
              className="min-h-[80px]"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setOnboarding((prev) => ({
                    ...prev,
                    completed: false,
                    currentStep: 1,
                  }));
                  setOnboardingOpen(true);
                }}
              >
                {copy.runGuidedOnboarding}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => applyTemplateToCurrentWeek(onboarding.template)}
              >
                {copy.applyTemplate}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-5 gap-1 px-2 py-2">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`rounded-xl px-2 py-2 text-xs font-medium transition ${
                  isActive
                    ? "bg-[var(--ink)] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog
        open={onboardingOpen}
        onOpenChange={(next) => {
          if (next || onboarding.completed) {
            setOnboardingOpen(next);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{copy.shiftpilotOnboarding}</DialogTitle>
            <DialogDescription>
              {copy.onboardingDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {onboardingStepMeta.map((item) => {
                const isActive = onboarding.currentStep === item.step;
                const isDone = onboarding.currentStep > item.step || onboarding.completed;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setOnboardingStep(item.step)}
                    className={`rounded-2xl border px-3 py-2 text-left ${
                      isActive
                        ? "border-emerald-300 bg-emerald-50"
                        : isDone
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-[var(--surface)]"
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-600">{copy.step} {item.step}</p>
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-slate-900">
                {
                  onboardingStepMeta.find(
                    (item) => item.step === onboarding.currentStep
                  )?.title
                }
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {
                  onboardingStepMeta.find(
                    (item) => item.step === onboarding.currentStep
                  )?.description
                }
              </p>

              {onboarding.currentStep === 1 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">{copy.weeklyNetGoal}</p>
                    <Input
                      type="number"
                      value={settingsDraft.weeklyNetGoal}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          weeklyNetGoal: Math.max(0, parseNumber(event.target.value)),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">{copy.weeklyRental}</p>
                    <Input
                      type="number"
                      value={settingsDraft.weeklyRental}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          weeklyRental: Math.max(0, parseNumber(event.target.value)),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">{copy.minimumLyftRides}</p>
                    <Input
                      type="number"
                      value={settingsDraft.minLyftRides}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          minLyftRides: Math.max(
                            0,
                            Math.floor(parseNumber(event.target.value))
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">{copy.weekStartsOn}</p>
                    <select
                      value={settingsDraft.weekStartDay}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          weekStartDay:
                            event.target.value === "Sunday" ? "Sunday" : "Monday",
                        }))
                      }
                      className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                    >
                      <option value="Monday">{copy.monday}</option>
                      <option value="Sunday">{copy.sunday}</option>
                    </select>
                  </div>
                </div>
              ) : null}

              {onboarding.currentStep === 2 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">{copy.minimumDailyHours}</p>
                    <Input
                      type="number"
                      value={settingsDraft.minDailyHours}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          minDailyHours: Math.max(0, parseNumber(event.target.value)),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">{copy.preferredMaxDailyHours}</p>
                    <Input
                      type="number"
                      value={settingsDraft.preferredMaxDailyHours}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          preferredMaxDailyHours: Math.max(
                            0,
                            parseNumber(event.target.value)
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">{copy.preferredApps}</p>
                    <select
                      value={settingsDraft.preferredApps}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          preferredApps:
                            event.target.value === "Lyft"
                              ? "Lyft"
                              : event.target.value === "DoorDash"
                              ? "DoorDash"
                              : "both",
                        }))
                      }
                      className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                    >
                      <option value="both">{copy.bothApps}</option>
                      <option value="Lyft">{copy.lyftOnly}</option>
                      <option value="DoorDash">{copy.doordashOnly}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">{copy.preferredBreakTimes}</p>
                    <Input
                      value={settingsDraft.preferredBreakTimes}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          preferredBreakTimes: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {onboarding.currentStep === 3 ? (
                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOnboarding((prev) => ({ ...prev, template: "balanced" }))
                    }
                    className={`rounded-2xl border p-3 text-left ${
                      onboarding.template === "balanced"
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-[var(--surface)]"
                    }`}
                  >
                    <p className="font-medium text-slate-900">{locale === "ar" ? "متوازن" : locale === "fr" ? "Équilibré" : "Balanced"}</p>
                    <p className="text-sm text-slate-600">{copy.balancedText}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOnboarding((prev) => ({ ...prev, template: "aggressive" }))
                    }
                    className={`rounded-2xl border p-3 text-left ${
                      onboarding.template === "aggressive"
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-[var(--surface)]"
                    }`}
                  >
                    <p className="font-medium text-slate-900">{locale === "ar" ? "هجومي" : locale === "fr" ? "Agressif" : "Aggressive"}</p>
                    <p className="text-sm text-slate-600">{copy.aggressiveText}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOnboarding((prev) => ({
                        ...prev,
                        template: "weekend_focus",
                      }))
                    }
                    className={`rounded-2xl border p-3 text-left ${
                      onboarding.template === "weekend_focus"
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-[var(--surface)]"
                    }`}
                  >
                    <p className="font-medium text-slate-900">{locale === "ar" ? "فوكس الويكاند" : locale === "fr" ? "Focus week-end" : "Weekend focus"}</p>
                    <p className="text-sm text-slate-600">{copy.weekendFocusText}</p>
                  </button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => applyTemplateToCurrentWeek(onboarding.template)}
                  >
                    {copy.applyTemplate}
                  </Button>
                </div>
              ) : null}

              {onboarding.currentStep === 4 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">{copy.preferredHourlyTarget}</p>
                    <Input
                      type="number"
                      value={settingsDraft.preferredHourlyTarget}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          preferredHourlyTarget: Math.max(
                            0,
                            parseNumber(event.target.value)
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600">{copy.preferredPerRideTarget}</p>
                    <Input
                      type="number"
                      value={settingsDraft.preferredPerRideTarget}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          preferredPerRideTarget: Math.max(
                            0,
                            parseNumber(event.target.value)
                          ),
                        }))
                      }
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={settingsDraft.alertIfUnderperforming}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          alertIfUnderperforming: event.target.checked,
                        }))
                      }
                    />
                    {copy.alertWhenUnderperforming}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={settingsDraft.browserNotificationsEnabled}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          browserNotificationsEnabled: event.target.checked,
                        }))
                      }
                    />
                    {copy.enableBrowserNotifications}
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <p className="mr-auto text-xs text-slate-500">
              {copy.step} {onboarding.currentStep}/4
            </p>
            {onboarding.currentStep > 1 ? (
              <Button variant="secondary" onClick={previousOnboardingStep}>
                {copy.back}
              </Button>
            ) : null}
            {onboarding.currentStep < 4 ? (
              <Button
                onClick={() => {
                  if (onboarding.currentStep === 3) {
                    applyTemplateToCurrentWeek(onboarding.template);
                  }
                  nextOnboardingStep();
                }}
              >
                {copy.next}
              </Button>
            ) : (
              <Button onClick={() => void completeOnboarding()}>
                {copy.finishOnboarding}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clockInOpen} onOpenChange={setClockInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.clockIn}</DialogTitle>
            <DialogDescription>{copy.createOrEditSession}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.selectApp}</p>
              <select
                value={clockInApp}
                onChange={(event) => setClockInApp(event.target.value as AppType)}
                className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                {APPS.map((app) => (
                  <option key={app} value={app}>
                    {getAppLabel(app, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.plannedMode}</p>
              <select
                value={clockInMode}
                onChange={(event) => setClockInMode(event.target.value as SessionMode)}
                className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                {MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {getModeLabel(mode, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.earningsTargetOptional}</p>
                <Input
                  type="number"
                  value={clockInTargetEarnings}
                  onChange={(event) => setClockInTargetEarnings(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.ridesTargetOptional}</p>
                <Input
                  type="number"
                  value={clockInTargetRides}
                  onChange={(event) => setClockInTargetRides(event.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setClockInOpen(false)}>
              {copy.cancel}
            </Button>
            <Button onClick={submitClockIn}>{copy.startSession}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clockOutOpen} onOpenChange={setClockOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.clockOut}</DialogTitle>
            <DialogDescription>{copy.latestClockOutReview}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.totalEarnings}</p>
                <Input value={clockOutEarnings} onChange={(event) => setClockOutEarnings(event.target.value)} />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.totalRidesDeliveries}</p>
                <Input value={clockOutRides} onChange={(event) => setClockOutRides(event.target.value)} />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.tips}</p>
                <Input value={clockOutTips} onChange={(event) => setClockOutTips(event.target.value)} />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.gasExpense}</p>
                <Input value={clockOutGas} onChange={(event) => setClockOutGas(event.target.value)} />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{copy.tollParking}</p>
                <Input value={clockOutTolls} onChange={(event) => setClockOutTolls(event.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.notes}</p>
              <Textarea value={clockOutNotes} onChange={(event) => setClockOutNotes(event.target.value)} />
            </div>

            {activeSession ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p>{copy.duration}: {formatDurationShort(activeDuration)}</p>
                <p>
                  {copy.grossPerHour}:{" "}
                  {formatCurrency(
                    activeDuration > 0
                      ? ((parseNumber(clockOutEarnings) + parseNumber(clockOutTips)) / activeDuration) * 3600
                      : 0
                  )}
                </p>
                <p>
                  {copy.netAfterExpenses}:{" "}
                  {formatCurrency(
                    parseNumber(clockOutEarnings) +
                      parseNumber(clockOutTips) -
                      parseNumber(clockOutGas) -
                      parseNumber(clockOutTolls)
                  )}
                </p>
                <p>
                  {copy.averagePerRide}:{" "}
                  {formatCurrency(
                    parseNumber(clockOutRides) > 0
                      ? (parseNumber(clockOutEarnings) + parseNumber(clockOutTips)) /
                        parseNumber(clockOutRides)
                      : 0
                  )}
                </p>
                {pendingSwitchApp ? (
                  <p className="mt-2 font-medium text-blue-700">
                    {copy.afterSaveAutoStart} {getAppLabel(pendingSwitchApp, locale)}.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setPendingSwitchApp(null);
                setClockOutOpen(false);
              }}
            >
              {copy.cancel}
            </Button>
            <Button onClick={submitClockOut}>{copy.saveSession}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.switchApp}</DialogTitle>
            <DialogDescription>
              {copy.switchApp}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">{copy.nextApp}</p>
            <select
              value={switchTargetApp}
              onChange={(event) => setSwitchTargetApp(event.target.value as AppType)}
              className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              {APPS.map((app) => (
                  <option key={app} value={app}>
                    {getAppLabel(app, locale)}
                  </option>
                ))}
              </select>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSwitchOpen(false)}>
              {copy.cancel}
            </Button>
            <Button onClick={confirmSwitchApp}>{copy.continue}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editSessionId ? copy.edit : copy.addEarningsManually}</DialogTitle>
            <DialogDescription>
              {copy.createOrEditSession}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.app}</p>
              <select
                value={manualApp}
                onChange={(event) => setManualApp(event.target.value as AppType)}
                className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                {APPS.map((app) => (
                  <option key={app} value={app}>
                    {getAppLabel(app, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.mode}</p>
              <select
                value={manualMode}
                onChange={(event) => setManualMode(event.target.value as SessionMode)}
                className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                {MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {getModeLabel(mode, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.date}</p>
              <Input type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.startEnd}</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={manualStart} onChange={(event) => setManualStart(event.target.value)} />
                <Input type="time" value={manualEnd} onChange={(event) => setManualEnd(event.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.earnings}</p>
              <Input value={manualEarnings} onChange={(event) => setManualEarnings(event.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.totalRidesDeliveries}</p>
              <Input value={manualRides} onChange={(event) => setManualRides(event.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.tips}</p>
              <Input value={manualTips} onChange={(event) => setManualTips(event.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.gas}</p>
              <Input value={manualGas} onChange={(event) => setManualGas(event.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.toll}</p>
              <Input value={manualTolls} onChange={(event) => setManualTolls(event.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-slate-600">{copy.notes}</p>
            <Textarea value={manualNotes} onChange={(event) => setManualNotes(event.target.value)} />
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setManualOpen(false)}>
              {copy.cancel}
            </Button>
            <Button onClick={saveManualSession}>{editSessionId ? copy.update : copy.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.reviewDay}</DialogTitle>
            <DialogDescription>{copy.quickSnapshot}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm text-slate-700">
            <p>{copy.date}: {monthDay(selectedDate, locale)}</p>
            <p>{copy.gross}: {formatCurrency(todayGross)}</p>
            <p>
              {copy.remainingDayTarget}: {formatCurrency(Math.max(0, dailyGrossTarget - todayGross))}
            </p>
            <p>{copy.ridesDone}: {todayRides}</p>
            <p>{copy.remainingRideTarget}: {Math.max(0, dailyRideTarget - todayRides)}</p>
            <p>
              {copy.tomorrowCarryOver}: {formatCurrency(Math.max(0, weeklyStats.remainingGrossTarget - (dailyGrossTarget - todayGross)))}
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setReviewOpen(false)}>{copy.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{blockEditId ? copy.editBlock : copy.addBlock}</DialogTitle>
            <DialogDescription>{copy.planEarningsAndRides}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.date}</p>
              <Input type="date" value={blockDate} onChange={(event) => setBlockDate(event.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.app}</p>
              <select
                value={blockApp}
                onChange={(event) => setBlockApp(event.target.value as AppType)}
                className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                {APPS.map((app) => (
                  <option key={app} value={app}>
                    {getAppLabel(app, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.mode}</p>
              <select
                value={blockMode}
                onChange={(event) => setBlockMode(event.target.value as SessionMode)}
                className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                {MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {getModeLabel(mode, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.startEnd}</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={blockStart} onChange={(event) => setBlockStart(event.target.value)} />
                <Input type="time" value={blockEnd} onChange={(event) => setBlockEnd(event.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.targetEarnings}</p>
              <Input value={blockTargetEarnings} onChange={(event) => setBlockTargetEarnings(event.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">{copy.targetRides}</p>
              <Input value={blockTargetRides} onChange={(event) => setBlockTargetRides(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setBlockOpen(false)}>
              {copy.cancel}
            </Button>
            <Button onClick={saveBlock}>{copy.saveBlock}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
