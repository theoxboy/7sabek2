"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Users,
  Settings,
  ClipboardList,
  Clock3,
  Rows3,
  CarFront,
  Mail,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { fetchMe, logout, type AuthUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import type {
  AdminActivityLogOut,
  ResolveSuperadminSessionOut,
  SuperadminSessionOut,
  SuperadminSessionStateOut,
} from "@/lib/types";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/Drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

const isBrowser = typeof window !== "undefined";
const isLoopbackHost =
  isBrowser &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");
const isPrivateIpv4Address = (value: string) =>
  /^10(?:\.\d{1,3}){3}$/.test(value) ||
  /^192\.168(?:\.\d{1,3}){2}$/.test(value) ||
  /^172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/.test(value);
const isLocalBrowserHost = () =>
  isBrowser &&
  (isLoopbackHost ||
    isPrivateIpv4Address(window.location.hostname) ||
    window.location.hostname.endsWith(".local"));

const SUPERADMIN_DIALOG_COPY: Record<
  FloussyLocale,
  {
    navDashboard: string;
    navUsers: string;
    navOnboarding: string;
    navShiftPilot: string;
    navSettings: string;
    navBackups: string;
    navAudit: string;
    navSessions: string;
    navEmails: string;
    newConnection: string;
    chooseSession: string;
    connectionDetails: string;
    currentSession: string;
    otherActiveSession: string;
    continueCurrent: string;
    switchToSession: (browser: string) => string;
    mapTitle: string;
    loading: string;
    cannotCheckSessions: string;
    cannotResolveSession: string;
    ipLabel: string;
    browserLabel: string;
    osLabel: string;
    deviceLabel: string;
    userAgentLabel: string;
    createdLabel: string;
    activityLabel: string;
    accuracyLabel: string;
    geoLabel: string;
    logout: string;
    openMenu: string;
    navigation: string;
    navHint: string;
    superAdmin: string;
    uploadInProgress: string;
    uploadFinishing: string;
    uploadStabilizing: string;
    remainingTime: string;
    notAvailable: string;
    otherBrowser: string;
  }
> = {
  fr: {
    navDashboard: "Dashboard",
    navUsers: "Utilisateurs",
    navOnboarding: "Onboarding clients",
    navShiftPilot: "ShiftPilot",
    navSettings: "Paramètres",
    navBackups: "Sauvegardes",
    navAudit: "Journal d’audit",
    navSessions: "Historique connexions",
    navEmails: "Emails",
    newConnection: "Nouvelle connexion superadmin détectée",
    chooseSession: "Une autre session est active avec ce compte. Choisis la session à conserver.",
    connectionDetails: "Détails de la nouvelle connexion",
    currentSession: "Session actuelle",
    otherActiveSession: "Autre session active",
    continueCurrent: "Continuer sur cette session",
    switchToSession: (browser) => `Basculer vers session ${browser}`,
    mapTitle: "Aperçu de localisation de la nouvelle connexion",
    loading: "Chargement…",
    cannotCheckSessions: "Impossible de vérifier les sessions.",
    cannotResolveSession: "Impossible de résoudre le conflit de session.",
    ipLabel: "IP",
    browserLabel: "Navigateur",
    osLabel: "OS",
    deviceLabel: "Appareil",
    userAgentLabel: "User-Agent",
    createdLabel: "Créée",
    activityLabel: "Activité",
    accuracyLabel: "Précision",
    geoLabel: "Libellé",
    logout: "Déconnexion",
    openMenu: "Ouvrir le menu",
    navigation: "Navigation",
    navHint: "Accès rapide aux pages superadmin.",
    superAdmin: "Super Admin",
    uploadInProgress: "Upload en cours",
    uploadFinishing: "Finalisation de l’upload",
    uploadStabilizing: "Patiente encore un peu, tout est en train de se stabiliser.",
    remainingTime: "Temps restant",
    notAvailable: "N/A",
    otherBrowser: "autre",
  },
  en: {
    navDashboard: "Dashboard",
    navUsers: "Users",
    navOnboarding: "Client onboarding",
    navShiftPilot: "ShiftPilot",
    navSettings: "Settings",
    navBackups: "Backups",
    navAudit: "Audit log",
    navSessions: "Session history",
    navEmails: "Emails",
    newConnection: "New superadmin sign-in detected",
    chooseSession: "Another session is active on this account. Choose which session to keep.",
    connectionDetails: "Details of the new sign-in",
    currentSession: "Current session",
    otherActiveSession: "Other active session",
    continueCurrent: "Stay on this session",
    switchToSession: (browser) => `Switch to ${browser} session`,
    mapTitle: "Location preview of the new sign-in",
    loading: "Loading…",
    cannotCheckSessions: "Unable to verify sessions.",
    cannotResolveSession: "Unable to resolve the session conflict.",
    ipLabel: "IP",
    browserLabel: "Browser",
    osLabel: "OS",
    deviceLabel: "Device",
    userAgentLabel: "User-Agent",
    createdLabel: "Created",
    activityLabel: "Activity",
    accuracyLabel: "Accuracy",
    geoLabel: "Label",
    logout: "Log out",
    openMenu: "Open menu",
    navigation: "Navigation",
    navHint: "Quick access to superadmin pages.",
    superAdmin: "Super Admin",
    uploadInProgress: "Upload in progress",
    uploadFinishing: "Finalizing upload",
    uploadStabilizing: "Please wait a little longer while everything stabilizes.",
    remainingTime: "Time left",
    notAvailable: "N/A",
    otherBrowser: "other",
  },
  ar: {
    navDashboard: "لوحة القيادة",
    navUsers: "المستخدمين",
    navOnboarding: "أونبوردينغ الزبناء",
    navShiftPilot: "شيفت بايلوت",
    navSettings: "الإعدادات",
    navBackups: "النسخ الاحتياطية",
    navAudit: "سجل التتبع",
    navSessions: "سجل الولوجات",
    navEmails: "الإيميلات",
    newConnection: "لقينا دخول جديد ديال superadmin",
    chooseSession: "كاينة session أخرى خدامة بهاد الحساب. اختار شكون تبقى هي الخدامة.",
    connectionDetails: "تفاصيل الدخول الجديد",
    currentSession: "السيشن الحالية",
    otherActiveSession: "سيشن أخرى خدامة",
    continueCurrent: "بقا فهاد السيشن",
    switchToSession: (browser) => `بدّل لسيشن ${browser}`,
    mapTitle: "معاينة البلاصة ديال الدخول الجديد",
    loading: "جاري التحميل…",
    cannotCheckSessions: "ما قدرناش نتحققو من السيشنات.",
    cannotResolveSession: "ما قدرناش نصلحو تعارض السيشن.",
    ipLabel: "IP",
    browserLabel: "المتصفح",
    osLabel: "النظام",
    deviceLabel: "الجهاز",
    userAgentLabel: "User-Agent",
    createdLabel: "تخلقات",
    activityLabel: "آخر نشاط",
    accuracyLabel: "الدقة",
    geoLabel: "الوسم",
    logout: "تسجيل الخروج",
    openMenu: "حل المينيو",
    navigation: "التنقل",
    navHint: "ولوج سريع لصفحات superadmin.",
    superAdmin: "Super Admin",
    uploadInProgress: "الرفع خدام",
    uploadFinishing: "كنكملو الرفع",
    uploadStabilizing: "تسنا شوية حتى يستقر كلشي.",
    remainingTime: "الوقت الباقي",
    notAvailable: "N/A",
    otherBrowser: "آخر",
  },
};

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, dir } = useAppLocale();
  const copy = SUPERADMIN_DIALOG_COPY[locale];
  useForceArabicDocumentFont(locale === "ar", "superadmin-shell-ar-body");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastPathRef = useRef<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [uploadCountdownEndsAt, setUploadCountdownEndsAt] = useState<Date | null>(
    null
  );
  const [uploadCountdownSeconds, setUploadCountdownSeconds] = useState<number | null>(
    null
  );
  const [superadminSessionState, setSuperadminSessionState] =
    useState<SuperadminSessionStateOut | null>(null);
  const [superadminSessionError, setSuperadminSessionError] = useState<string | null>(
    null
  );
  const [superadminSessionResolving, setSuperadminSessionResolving] =
    useState(false);

  const NAV_ITEMS = [
    { href: "/superadmin", label: copy.navDashboard, icon: LayoutDashboard, enabled: true },
    { href: "/superadmin/users", label: copy.navUsers, icon: Users, enabled: true },
    { href: "/superadmin/onboarding-records", label: copy.navOnboarding, icon: Rows3, enabled: true },
    { href: "/superadmin/shiftpilot", label: copy.navShiftPilot, icon: CarFront, enabled: true },
    { href: "/superadmin/settings", label: copy.navSettings, icon: Settings, enabled: true },
    { href: "/superadmin/backups", label: copy.navBackups, icon: Archive, enabled: true },
    { href: "/superadmin/audit", label: copy.navAudit, icon: ClipboardList, enabled: true },
    { href: "/superadmin/sessions", label: copy.navSessions, icon: Clock3, enabled: true },
    { href: "/superadmin/emails", label: copy.navEmails, icon: Mail, enabled: true },
  ];

  const formatCountdown = (seconds: number) => {
    const total = Math.max(seconds, 0);
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return copy.notAvailable;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString(locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-CA", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  };

  const buildMapEmbedUrl = (
    latitude?: number | null,
    longitude?: number | null
  ) => {
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return null;
    }
    const zoomDelta = 0.01;
    const minLng = (longitude - zoomDelta).toFixed(6);
    const minLat = (latitude - zoomDelta).toFixed(6);
    const maxLng = (longitude + zoomDelta).toFixed(6);
    const maxLat = (latitude + zoomDelta).toFixed(6);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${latitude.toFixed(6)}%2C${longitude.toFixed(6)}`;
  };

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((me) => {
        if (!active) return;
        if (me.role !== "superadmin") {
          router.push("/dashboard");
          return;
        }
        setUser(me);
      })
      .catch(() => {
        if (active) router.push("/login");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

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
    apiFetch("/analytics/pageviews", {
      method: "POST",
      body: { path: pathname, referrer, source },
    }).catch(() => null);
    lastPathRef.current = pathname;
  }, [pathname, user]);

  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        const logs = await apiFetch<AdminActivityLogOut[]>(
          "/admin/activity?limit=10",
          { headers: { "x-admin-bypass": "true" } }
        );
        if (!active) return;
        const importStart = logs.find(
          (log) => log.event_type === "backup_import_started"
        );
        if (!importStart) {
          setUploadCountdownEndsAt(null);
          return;
        }
        const startedAt = new Date(importStart.created_at);
        const importEnd = logs.find((log) =>
          ["backup_import_completed", "backup_import_failed"].includes(log.event_type)
        );
        if (importEnd) {
          const endAt = new Date(importEnd.created_at);
          if (!Number.isNaN(endAt.getTime()) && endAt >= startedAt) {
            setUploadCountdownEndsAt(null);
            return;
          }
        }
        const endsAt = new Date(startedAt.getTime() + 10 * 60 * 1000);
        if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) {
          setUploadCountdownEndsAt(null);
          return;
        }
        setUploadCountdownEndsAt(endsAt);
      } catch {
        if (active) setUploadCountdownEndsAt(null);
      }
    };
    fetchLogs();
    const interval = window.setInterval(fetchLogs, 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!uploadCountdownEndsAt) {
      setUploadCountdownSeconds(null);
      return;
    }
    const updateCountdown = () => {
      const diff = Math.ceil(
        (uploadCountdownEndsAt.getTime() - Date.now()) / 1000
      );
      if (diff <= 0) {
        setUploadCountdownSeconds(null);
        setUploadCountdownEndsAt(null);
        return;
      }
      setUploadCountdownSeconds(diff);
    };
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [uploadCountdownEndsAt]);

  useEffect(() => {
    if (!user || user.role !== "superadmin") {
      setSuperadminSessionState(null);
      return;
    }
    let active = true;

    const fetchSessionState = async () => {
      try {
        const state = await apiFetch<SuperadminSessionStateOut>(
          "/auth/superadmin/sessions"
        );
        if (!active) return;
        setSuperadminSessionState(state);
        setSuperadminSessionError(null);
      } catch (error) {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : copy.cannotCheckSessions;
        setSuperadminSessionError(message);
      }
    };

    fetchSessionState();
    const interval = window.setInterval(fetchSessionState, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [copy.cannotCheckSessions, user]);

  const resolveSuperadminSessionConflict = async (keepSessionId: string) => {
    setSuperadminSessionResolving(true);
    setSuperadminSessionError(null);
    try {
      const resolution = await apiFetch<ResolveSuperadminSessionOut>(
        "/auth/superadmin/sessions/resolve",
        {
          method: "POST",
          body: { keep_session_id: keepSessionId },
        }
      );
      if (resolution.should_logout) {
        await logout().catch(() => null);
        router.push("/login");
        return;
      }
      const state = await apiFetch<SuperadminSessionStateOut>(
        "/auth/superadmin/sessions"
      );
      setSuperadminSessionState(state);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : copy.cannotResolveSession;
      setSuperadminSessionError(message);
    } finally {
      setSuperadminSessionResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface)] px-6 py-10 text-sm text-[var(--muted)]">
        {copy.loading}
      </div>
    );
  }

  if (!user) return null;

  const activeSessions = superadminSessionState?.sessions ?? [];
  const currentSession = activeSessions.find(
    (session) => session.id === superadminSessionState?.current_session_id
  );
  const otherSessions = activeSessions.filter(
    (session) => session.id !== superadminSessionState?.current_session_id
  );
  const newestOtherSession = [...otherSessions].sort((a, b) => {
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  })[0] as SuperadminSessionOut | undefined;
  const conflictMapUrl = buildMapEmbedUrl(
    newestOtherSession?.geo_lat ?? null,
    newestOtherSession?.geo_lng ?? null
  );
  const showSessionConflictDialog = Boolean(superadminSessionState?.has_conflict);

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]" dir={dir}>
      <Dialog open={showSessionConflictDialog}>
        <DialogContent
          className="max-w-3xl"
          dir={dir}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{copy.newConnection}</DialogTitle>
            <DialogDescription>{copy.chooseSession}</DialogDescription>
          </DialogHeader>

          {newestOtherSession ? (
            <div className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">{copy.connectionDetails}</p>
              <p>
                {copy.ipLabel}: <strong>{newestOtherSession.source_ip ?? copy.notAvailable}</strong> ·
                {copy.browserLabel}: <strong>{newestOtherSession.browser ?? copy.notAvailable}</strong> ·
                {copy.osLabel}: <strong>{newestOtherSession.os ?? copy.notAvailable}</strong> · {copy.deviceLabel}:{" "}
                <strong>{newestOtherSession.device ?? copy.notAvailable}</strong>
              </p>
              <p>
                {copy.userAgentLabel}:{" "}
                <strong className="break-all">
                  {newestOtherSession.user_agent ?? copy.notAvailable}
                </strong>
              </p>
              <p>
                {copy.createdLabel}: <strong>{formatDateTime(newestOtherSession.created_at)}</strong>{" "}
                · {copy.activityLabel}:{" "}
                <strong>{formatDateTime(newestOtherSession.last_seen_at)}</strong>
              </p>
              <p>
                GPS:{" "}
                <strong>
                  {typeof newestOtherSession.geo_lat === "number" &&
                  typeof newestOtherSession.geo_lng === "number"
                    ? `${newestOtherSession.geo_lat.toFixed(6)}, ${newestOtherSession.geo_lng.toFixed(6)}`
                    : copy.notAvailable}
                </strong>{" "}
                · {copy.accuracyLabel}:{" "}
                <strong>
                  {typeof newestOtherSession.geo_accuracy_m === "number"
                    ? `${Math.round(newestOtherSession.geo_accuracy_m)}m`
                    : copy.notAvailable}
                </strong>
                {newestOtherSession.geo_label ? (
                  <>
                    {" "}
                    · {copy.geoLabel}: <strong>{newestOtherSession.geo_label}</strong>
                  </>
                ) : null}
              </p>
              {conflictMapUrl ? (
                <div className="overflow-hidden rounded-2xl border border-amber-200">
                  <iframe
                    title={copy.mapTitle}
                    src={conflictMapUrl}
                    className="h-52 w-full"
                    loading="lazy"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {currentSession ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">{copy.currentSession}</p>
                <p>{copy.ipLabel}: {currentSession.source_ip ?? copy.notAvailable}</p>
                <p>{copy.browserLabel}: {currentSession.browser ?? copy.notAvailable}</p>
                <p>{copy.osLabel}: {currentSession.os ?? copy.notAvailable}</p>
                <p>{copy.deviceLabel}: {currentSession.device ?? copy.notAvailable}</p>
                <p className="break-all">{copy.userAgentLabel}: {currentSession.user_agent ?? copy.notAvailable}</p>
                <p>{copy.createdLabel}: {formatDateTime(currentSession.created_at)}</p>
              </div>
            ) : null}
            {otherSessions[0] ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900">
                <p className="font-semibold">{copy.otherActiveSession}</p>
                <p>{copy.ipLabel}: {otherSessions[0].source_ip ?? copy.notAvailable}</p>
                <p>{copy.browserLabel}: {otherSessions[0].browser ?? copy.notAvailable}</p>
                <p>{copy.osLabel}: {otherSessions[0].os ?? copy.notAvailable}</p>
                <p>{copy.deviceLabel}: {otherSessions[0].device ?? copy.notAvailable}</p>
                <p className="break-all">{copy.userAgentLabel}: {otherSessions[0].user_agent ?? copy.notAvailable}</p>
                <p>{copy.createdLabel}: {formatDateTime(otherSessions[0].created_at)}</p>
              </div>
            ) : null}
          </div>

          {superadminSessionError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {superadminSessionError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {currentSession ? (
              <button
                type="button"
                disabled={superadminSessionResolving}
                onClick={() => resolveSuperadminSessionConflict(currentSession.id)}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.continueCurrent}
              </button>
            ) : null}
            {otherSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                disabled={superadminSessionResolving}
                onClick={() => resolveSuperadminSessionConflict(session.id)}
                className="rounded-2xl border border-gray-300 bg-[var(--surface)] px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.switchToSession(session.browser ?? copy.otherBrowser)}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {uploadCountdownSeconds ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-8 sm:items-center sm:pb-0">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative w-[92%] max-w-md rounded-3xl border border-emerald-100 bg-[var(--surface)] px-6 py-5 shadow-2xl">
            <div className="absolute -top-6 right-6 rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-emerald-200">
              {copy.uploadInProgress}
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-gray-900">
                {copy.uploadFinishing}
              </p>
              <p className="text-sm text-gray-500">
                {copy.uploadStabilizing}
              </p>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {copy.remainingTime}
                </span>
                <span className="text-2xl font-semibold text-emerald-700">
                  {formatCountdown(uploadCountdownSeconds)}
                </span>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (uploadCountdownSeconds / 600) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="md:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-2 pt-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-[var(--surface)] text-gray-700 shadow-sm"
            aria-label={copy.openMenu}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-emerald-600">
            <ShieldCheck className="h-5 w-5" aria-hidden />
            <p className="text-sm font-semibold">{copy.superAdmin}</p>
          </div>
        </div>
      </div>

      <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DrawerContent side="left" className="h-full max-w-xs">
          <DrawerHeader>
            <DrawerTitle>{copy.navigation}</DrawerTitle>
            <p className="text-xs text-[var(--muted)]">
              {copy.navHint}
            </p>
          </DrawerHeader>
          <div className="mt-6 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition ${
                    isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-100 text-gray-700 hover:border-emerald-200"
                  }`}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-6 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={async () => {
                await logout();
                setMobileNavOpen(false);
                router.push("/login");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-[var(--surface)] px-4 py-2 text-sm text-gray-700 transition hover:border-red-200 hover:text-red-600"
            >
              {copy.logout}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-10 pt-8 md:flex-row">
        <nav className="hidden w-full md:block md:w-64">
          <div className="floussy-sidebar">
            <div className="floussy-sidebar__head">
              <div className="flex items-center gap-2 text-emerald-600">
                <ShieldCheck className="h-5 w-5" aria-hidden />
                <p className="floussy-sidebar__title">{copy.superAdmin}</p>
              </div>
            </div>
            <ul className="floussy-nav-list floussy-scroll">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                if (!item.enabled) {
                  return (
                    <li key={item.href}>
                      <span className="floussy-nav-item opacity-50 cursor-not-allowed">
                        <span className="navbox bg-hover-primary">
                          <span className="icon-box bgicn-hover-primary">
                            <Icon className="texthover-primary" aria-hidden />
                          </span>
                          <span className="floussy-nav-label">
                            {item.label}
                          </span>
                        </span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`floussy-nav-item ${isActive ? "is-active" : ""}`}
                    >
                      <span className="navbox bg-hover-primary">
                        <span className="icon-box bgicn-hover-primary">
                          <Icon className="texthover-primary" aria-hidden />
                        </span>
                        <span className="floussy-nav-label">{item.label}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-[var(--surface)] px-4 py-2 text-sm text-gray-700 transition hover:border-red-200 hover:text-red-600"
              >
                {copy.logout}
              </button>
            </div>
          </div>
        </nav>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
