"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Globe, Laptop, MapPin, RefreshCw, ShieldCheck } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import type {
  SuperadminSessionHistoryListOut,
  SuperadminSessionHistoryOut,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type StatusFilter = "all" | "active" | "revoked" | "ended";

const statusMeta: Record<
  SuperadminSessionHistoryOut["status"],
  { className: string }
> = {
  active: {
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  revoked: {
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  ended: {
    className: "bg-slate-100 text-slate-700 border border-slate-200",
  },
};

const COPY: Record<
  FloussyLocale,
  {
    security: string;
    title: string;
    subtitle: string;
    active: string;
    revoked: string;
    ended: string;
    total: string;
    updated: string;
    refresh: string;
    status: string;
    all: string;
    searchLabel: string;
    searchPlaceholder: string;
    loading: string;
    empty: string;
    session: string;
    fullId: string;
    created: string;
    activity: string;
    ip: string;
    browser: string;
    os: string;
    device: string;
    userAgent: string;
    gps: string;
    accuracy: string;
    geoLabel: string;
    endedNormally: string;
    revokedAt: string;
    hideMap: string;
    showMap: string;
    notAvailable: string;
    cannotLoadHistory: string;
  }
> = {
  fr: {
    security: "Sécurité superadmin",
    title: "Historique des connexions superadmin",
    subtitle: "Liste complète des sessions passées et actives avec détails techniques.",
    active: "Actives",
    revoked: "Révoquées",
    ended: "Terminées",
    total: "Total",
    updated: "MAJ",
    refresh: "Actualiser",
    status: "Statut",
    all: "Tous",
    searchLabel: "Recherche (IP, navigateur, OS, appareil, user-agent)",
    searchPlaceholder: "Ex: 76.13, Chrome, Windows, mobile...",
    loading: "Chargement de l'historique...",
    empty: "Aucun historique trouvé avec ces filtres.",
    session: "Session",
    fullId: "ID complet",
    created: "Créée",
    activity: "Dernière activité",
    ip: "IP",
    browser: "Navigateur",
    os: "OS",
    device: "Appareil",
    userAgent: "User-Agent",
    gps: "GPS",
    accuracy: "Précision",
    geoLabel: "Libellé",
    endedNormally: "Fin normale",
    revokedAt: "Révocation",
    hideMap: "Masquer la carte",
    showMap: "Voir la carte",
    notAvailable: "N/A",
    cannotLoadHistory: "Impossible de charger l'historique.",
  },
  en: {
    security: "Superadmin security",
    title: "Superadmin sign-in history",
    subtitle: "Complete list of past and active sessions with technical details.",
    active: "Active",
    revoked: "Revoked",
    ended: "Ended",
    total: "Total",
    updated: "Updated",
    refresh: "Refresh",
    status: "Status",
    all: "All",
    searchLabel: "Search (IP, browser, OS, device, user-agent)",
    searchPlaceholder: "Ex: 76.13, Chrome, Windows, mobile...",
    loading: "Loading history...",
    empty: "No history found with these filters.",
    session: "Session",
    fullId: "Full ID",
    created: "Created",
    activity: "Last activity",
    ip: "IP",
    browser: "Browser",
    os: "OS",
    device: "Device",
    userAgent: "User-Agent",
    gps: "GPS",
    accuracy: "Accuracy",
    geoLabel: "Label",
    endedNormally: "Normal end",
    revokedAt: "Revoked",
    hideMap: "Hide map",
    showMap: "View map",
    notAvailable: "N/A",
    cannotLoadHistory: "Unable to load history.",
  },
  ar: {
    security: "أمان superadmin",
    title: "سجل الولوجات ديال superadmin",
    subtitle: "لائحة كاملة ديال السيشنات القديمة والحالية مع التفاصيل التقنية.",
    active: "خدامة",
    revoked: "ملغية",
    ended: "سالاو",
    total: "المجموع",
    updated: "آخر تحديث",
    refresh: "حدّث",
    status: "الحالة",
    all: "الكل",
    searchLabel: "البحث (IP، المتصفح، النظام، الجهاز، user-agent)",
    searchPlaceholder: "مثال: 76.13, Chrome, Windows, mobile...",
    loading: "كنحمّلو السجل...",
    empty: "ما لقيناش حتى سجل بهاد الفيلترات.",
    session: "سيشن",
    fullId: "المعرّف الكامل",
    created: "تخلقات",
    activity: "آخر نشاط",
    ip: "IP",
    browser: "المتصفح",
    os: "النظام",
    device: "الجهاز",
    userAgent: "User-Agent",
    gps: "GPS",
    accuracy: "الدقة",
    geoLabel: "الوسم",
    endedNormally: "السالية العادية",
    revokedAt: "وقت الإلغاء",
    hideMap: "خبي الخريطة",
    showMap: "بان الخريطة",
    notAvailable: "N/A",
    cannotLoadHistory: "ما قدرناش نحمّلو السجل.",
  },
};

const formatDateTime = (value: string | null | undefined, locale: FloussyLocale, fallback: string) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-CA", {
    dateStyle: "short",
    timeStyle: "medium",
  });
};

const buildMapEmbedUrl = (latitude?: number | null, longitude?: number | null) => {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  const zoomDelta = 0.01;
  const minLng = (longitude - zoomDelta).toFixed(6);
  const minLat = (latitude - zoomDelta).toFixed(6);
  const maxLng = (longitude + zoomDelta).toFixed(6);
  const maxLat = (latitude + zoomDelta).toFixed(6);
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${latitude.toFixed(6)}%2C${longitude.toFixed(6)}`;
};

export default function SuperadminSessionsHistoryPage() {
  const { locale, dir } = useAppLocale();
  const copy = COPY[locale];
  useForceArabicDocumentFont(locale === "ar", "superadmin-sessions-ar-body");
  const [sessions, setSessions] = useState<SuperadminSessionHistoryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [mapPreviewSessionId, setMapPreviewSessionId] = useState<string | null>(null);

  const loadHistory = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const response = await apiFetch<SuperadminSessionHistoryListOut>(
        "/auth/superadmin/sessions/history?limit=2000"
      );
      setSessions(response.sessions);
      setLastUpdated(new Date());
      if (
        mapPreviewSessionId &&
        !response.sessions.some((session) => session.id === mapPreviewSessionId)
      ) {
        setMapPreviewSessionId(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : copy.cannotLoadHistory;
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy.cannotLoadHistory, locale, mapPreviewSessionId]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!active) return;
      await loadHistory(false);
    };

    run();
    const interval = window.setInterval(() => {
      if (!active) return;
      void loadHistory(true);
    }, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [loadHistory]);

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sessions.filter((session) => {
      if (statusFilter !== "all" && session.status !== statusFilter) return false;
      if (!query) return true;
      return [
        session.id,
        session.source_ip ?? "",
        session.browser ?? "",
        session.os ?? "",
        session.device ?? "",
        session.user_agent ?? "",
        session.geo_label ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [sessions, statusFilter, search]);

  const activeCount = sessions.filter((item) => item.status === "active").length;
  const revokedCount = sessions.filter((item) => item.status === "revoked").length;
  const endedCount = sessions.filter((item) => item.status === "ended").length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-10 text-[var(--ink)]" dir={dir}>
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          {copy.security}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">{copy.title}</h1>
        <p className="text-sm text-gray-500">{copy.subtitle}</p>
      </div>

      <Card className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-4 shadow-sm" dir={dir}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {copy.active}: {activeCount}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {copy.revoked}: {revokedCount}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {copy.ended}: {endedCount}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {copy.total}: {sessions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated ? (
              <span className="text-xs text-gray-500">
                {copy.updated}: {lastUpdated.toLocaleTimeString(locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-CA")}
              </span>
            ) : null}
            <Button
              type="button"
              onClick={() => void loadHistory(true)}
              isLoading={refreshing}
              className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              {copy.refresh}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{copy.status}</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 w-full rounded-xl border border-gray-200 bg-[var(--surface)] px-3 text-sm text-gray-700 outline-none ring-0 transition focus:border-emerald-300"
            >
              <option value="all">{copy.all}</option>
              <option value="active">{copy.active}</option>
              <option value="revoked">{copy.revoked}</option>
              <option value="ended">{copy.ended}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {copy.searchLabel}
            </label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
            />
          </div>
        </div>
      </Card>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Card className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-6 text-sm text-gray-500">
          {copy.loading}
        </Card>
      ) : null}

      {!loading && filteredSessions.length === 0 ? (
        <Card className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-6 text-sm text-gray-500">
          {copy.empty}
        </Card>
      ) : null}

      <div className="grid gap-4">
        {filteredSessions.map((session) => {
          const mapUrl = buildMapEmbedUrl(session.geo_lat, session.geo_lng);
          const mapOpen = mapPreviewSessionId === session.id;
          const meta = statusMeta[session.status];
          return (
            <Card
              key={session.id}
              className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {copy.session} {session.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-gray-500">{copy.fullId}: {session.id}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                  {copy[session.status]}
                </span>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                <p>
                  <Clock3 className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
                  {copy.created}: <strong>{formatDateTime(session.created_at, locale, copy.notAvailable)}</strong>
                </p>
                <p>
                  {copy.activity}: <strong>{formatDateTime(session.last_seen_at, locale, copy.notAvailable)}</strong>
                </p>
                <p>
                  <Globe className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
                  {copy.ip}: <strong>{session.source_ip ?? copy.notAvailable}</strong>
                </p>
                <p>
                  <Laptop className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
                  {copy.browser}: <strong>{session.browser ?? copy.notAvailable}</strong> · {copy.os}:{" "}
                  <strong>{session.os ?? copy.notAvailable}</strong> · {copy.device}:{" "}
                  <strong>{session.device ?? copy.notAvailable}</strong>
                </p>
                <p className="md:col-span-2">
                  {copy.userAgent}:{" "}
                  <strong className="break-all font-medium">
                    {session.user_agent ?? copy.notAvailable}
                  </strong>
                </p>
                <p className="md:col-span-2">
                  <MapPin className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
                  {copy.gps}:{" "}
                  <strong>
                    {typeof session.geo_lat === "number" &&
                    typeof session.geo_lng === "number"
                      ? `${session.geo_lat.toFixed(6)}, ${session.geo_lng.toFixed(6)}`
                      : copy.notAvailable}
                  </strong>{" "}
                  · {copy.accuracy}:{" "}
                  <strong>
                    {typeof session.geo_accuracy_m === "number"
                      ? `${Math.round(session.geo_accuracy_m)}m`
                      : copy.notAvailable}
                  </strong>
                  {session.geo_label ? (
                    <>
                      {" "}
                      · {copy.geoLabel}: <strong>{session.geo_label}</strong>
                    </>
                  ) : null}
                </p>
                {session.ended_at ? (
                  <p>
                    {copy.endedNormally}: <strong>{formatDateTime(session.ended_at, locale, copy.notAvailable)}</strong>
                  </p>
                ) : null}
                {session.revoked_at ? (
                  <p>
                    {copy.revokedAt}: <strong>{formatDateTime(session.revoked_at, locale, copy.notAvailable)}</strong>
                  </p>
                ) : null}
              </div>

              {mapUrl ? (
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMapPreviewSessionId((current) =>
                        current === session.id ? null : session.id
                      )
                    }
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    {mapOpen ? copy.hideMap : copy.showMap}
                  </button>
                  {mapOpen ? (
                    <div className="overflow-hidden rounded-2xl border border-gray-200">
                      <iframe
                        title={`Localisation session ${session.id}`}
                        src={mapUrl}
                        className="h-56 w-full"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
