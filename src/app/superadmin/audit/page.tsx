"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  UserCog,
} from "lucide-react";

import { apiFetch, API_BASE } from "@/lib/api";
import type { AdminActivityLogOut } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";

const EVENT_PRESETS = [
  "settings_updated",
  "user_updated",
  "user_deleted",
  "user_password_reset",
  "backup_export_started",
  "backup_export_completed",
  "backup_export_failed",
  "backup_import_started",
  "backup_import_restore",
  "backup_import_migrated",
  "backup_import_completed",
  "backup_import_failed",
  "rate_limit_triggered",
  "maintenance_updated",
];

const formatEventType = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const statusTone = (status: string) => {
  if (status === "success") return "bg-emerald-50 text-emerald-700";
  if (status === "error") return "bg-red-50 text-red-700";
  if (status === "warning") return "bg-amber-50 text-amber-700";
  return "bg-slate-50 text-slate-600";
};

const COPY: Record<
  FloussyLocale,
  {
    loadError: string;
    exportError: string;
    exportDone: string;
    auditLog: string;
    title: string;
    subtitle: string;
    autoRefresh: string;
    quickFilters: string;
    filterHint: string;
    reset: string;
    exportCsv: string;
    search: string;
    actionType: string;
    admin: string;
    status: string;
    searchPlaceholder: string;
    allStatuses: string;
    info: string;
    success: string;
    error: string;
    warning: string;
    detailedLog: string;
    loading: string;
    entriesShown: (count: number) => string;
    activeFilter: string;
    empty: string;
    systemAdmin: string;
    ipPrefix: string;
  }
> = {
  fr: {
    loadError: "Erreur de chargement.",
    exportError: "Erreur export.",
    exportDone: "Export CSV généré",
    auditLog: "Journal d’audit",
    title: "Historique des actions administrateurs",
    subtitle: "Suivi complet des modifications d’utilisateurs, paramètres et backups.",
    autoRefresh: "Auto-refresh 10s",
    quickFilters: "Filtres rapides",
    filterHint: "Affine par type d’action, admin, status ou mot clé.",
    reset: "Réinitialiser",
    exportCsv: "Exporter CSV",
    search: "Recherche",
    actionType: "Type d’action",
    admin: "Administrateur",
    status: "Statut",
    searchPlaceholder: "Message, type, email…",
    allStatuses: "Tous les statuts",
    info: "Info",
    success: "Succès",
    error: "Erreur",
    warning: "Alerte",
    detailedLog: "Journal détaillé",
    loading: "Chargement en cours…",
    entriesShown: (count) => `${count} entrée(s) affichées`,
    activeFilter: "Filtrage actif",
    empty: "Aucun log trouvé pour ces filtres.",
    systemAdmin: "Admin système",
    ipPrefix: "IP",
  },
  en: {
    loadError: "Loading error.",
    exportError: "Export error.",
    exportDone: "CSV export generated",
    auditLog: "Audit log",
    title: "Administrator activity history",
    subtitle: "Full tracking of user, settings, and backup changes.",
    autoRefresh: "Auto-refresh 10s",
    quickFilters: "Quick filters",
    filterHint: "Filter by action type, admin, status, or keyword.",
    reset: "Reset",
    exportCsv: "Export CSV",
    search: "Search",
    actionType: "Action type",
    admin: "Administrator",
    status: "Status",
    searchPlaceholder: "Message, type, email…",
    allStatuses: "All statuses",
    info: "Info",
    success: "Success",
    error: "Error",
    warning: "Warning",
    detailedLog: "Detailed log",
    loading: "Loading…",
    entriesShown: (count) => `${count} entries shown`,
    activeFilter: "Active filter",
    empty: "No logs found for these filters.",
    systemAdmin: "System admin",
    ipPrefix: "IP",
  },
  ar: {
    loadError: "ما قدرناش نحمّلو المعطيات.",
    exportError: "وقع مشكل فالتصدير.",
    exportDone: "توجد تصدير CSV",
    auditLog: "سجل التتبع",
    title: "سجل أعمال الإداريين",
    subtitle: "تتبع كامل للتغييرات ديال المستخدمين، الإعدادات والنسخ الاحتياطية.",
    autoRefresh: "تحديث تلقائي كل 10 ثواني",
    quickFilters: "فيلترات سريعة",
    filterHint: "ضيّق البحث حسب نوع العملية، الإداري، الحالة أو كلمة.",
    reset: "رجّع كيف كان",
    exportCsv: "صدّر CSV",
    search: "البحث",
    actionType: "نوع العملية",
    admin: "الإداري",
    status: "الحالة",
    searchPlaceholder: "رسالة، نوع، إيميل…",
    allStatuses: "جميع الحالات",
    info: "معلومة",
    success: "نجاح",
    error: "خطأ",
    warning: "تنبيه",
    detailedLog: "السجل المفصل",
    loading: "جاري التحميل…",
    entriesShown: (count) => `${count} مدخلات باينة`,
    activeFilter: "الفيلترة مفعلة",
    empty: "ما لقيناش حتى log بهاد الفيلترات.",
    systemAdmin: "Admin système",
    ipPrefix: "IP",
  },
};

export default function SuperAdminAuditPage() {
  const { locale, dir } = useAppLocale();
  const copy = COPY[locale];
  useForceArabicDocumentFont(locale === "ar", "superadmin-audit-ar-body");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [status, setStatus] = useState("all");
  const [limit, setLimit] = useState(50);
  const [logs, setLogs] = useState<AdminActivityLogOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (search.trim()) params.set("q", search.trim());
    if (eventType.trim()) params.set("event_type", eventType.trim());
    if (actorEmail.trim()) params.set("actor_email", actorEmail.trim());
    if (status !== "all") params.set("status", status);
    return params.toString();
  }, [limit, search, eventType, actorEmail, status]);

  const adminFetch = <T,>(path: string) =>
    apiFetch<T>(path, { headers: { "x-admin-bypass": "true" } });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const path = query ? `/admin/activity?${query}` : "/admin/activity";
        const data = await adminFetch<AdminActivityLogOut[]>(path);
        if (!active) return;
        setLogs(data);
        setLastUpdated(new Date());
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : copy.loadError;
        setError(msg);
        setLogs([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    const initialTimer = window.setTimeout(load, 200);
    const interval = window.setInterval(load, 10000);
    return () => {
      active = false;
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [copy.loadError, query]);

  const handleReset = () => {
    setSearch("");
    setEventType("");
    setActorEmail("");
    setStatus("all");
    setLimit(50);
  };

  const handleExport = async () => {
    setExportError("");
    setExportMessage("");
    setExporting(true);
    try {
      const url = query
        ? `${API_BASE}/admin/activity/export?${query}`
        : `${API_BASE}/admin/activity/export`;
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { "x-admin-bypass": "true" },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || copy.exportError);
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "audit_logs.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setExportMessage(
        `${copy.exportDone} — ${new Date().toLocaleString(locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-CA")}.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : copy.exportError;
      setExportError(msg);
    } finally {
      setExporting(false);
    }
  };

  const canLoadMore = logs.length >= limit && limit < 200;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-10 text-[var(--ink)]" dir={dir}>
      <style jsx>{`
        .audit-card {
          border-radius: 18px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: #fff;
          box-shadow: 0 12px 30px -24px rgba(0, 0, 0, 0.45);
        }
        .audit-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        .audit-subtitle {
          font-size: 12px;
          color: #9ca3af;
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
            <Activity className="h-3.5 w-3.5" /> {copy.auditLog}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{copy.title}</h1>
          <p className="text-sm text-gray-500">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
            <RefreshCw className="h-3.5 w-3.5" />
            {copy.autoRefresh}
          </span>
          {lastUpdated ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
              <Calendar className="h-3.5 w-3.5" />
              {lastUpdated.toLocaleTimeString(locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-CA")}
            </span>
          ) : null}
        </div>
      </div>

      <Card className="audit-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="audit-title">{copy.quickFilters}</p>
            <p className="audit-subtitle">{copy.filterHint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              className="text-xs text-gray-500"
            >
              {copy.reset}
            </Button>
            <Button
              type="button"
              isLoading={exporting}
              onClick={handleExport}
              className="bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
            >
              {copy.exportCsv}
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{copy.search}</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{copy.actionType}</Label>
            <Input
              list="audit-event-types"
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
              placeholder="Ex: settings_updated"
            />
            <datalist id="audit-event-types">
              {EVENT_PRESETS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label>{copy.admin}</Label>
            <div className="relative">
              <UserCog className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={actorEmail}
                onChange={(event) => setActorEmail(event.target.value)}
                placeholder="email@domaine.com"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{copy.status}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allStatuses}</SelectItem>
                <SelectItem value="info">{copy.info}</SelectItem>
                <SelectItem value="success">{copy.success}</SelectItem>
                <SelectItem value="error">{copy.error}</SelectItem>
                <SelectItem value="warning">{copy.warning}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {exportMessage ? (
        <Card className="audit-card px-4 py-3 text-sm text-emerald-700 bg-emerald-50 border-emerald-100">
          {exportMessage}
        </Card>
      ) : null}
      {exportError ? (
        <Card className="audit-card px-4 py-3 text-sm text-red-700 bg-red-50 border-red-100">
          {exportError}
        </Card>
      ) : null}

      <Card className="audit-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="audit-title">{copy.detailedLog}</p>
            <p className="audit-subtitle">
              {loading ? copy.loading : copy.entriesShown(logs.length)}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-xs text-gray-500">
            <Filter className="h-3.5 w-3.5" /> {copy.activeFilter}
          </span>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {logs.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
              {copy.empty}
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 px-4 py-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span className="font-semibold text-gray-900">
                      {formatEventType(log.event_type)}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString(locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-CA")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {log.message}
                  </p>
                  <p className="text-xs text-gray-400">
                    {log.actor_email ? log.actor_email : copy.systemAdmin}
                    {log.actor_ip ? ` · ${copy.ipPrefix} ${log.actor_ip}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(
                    log.status
                  )}`}
                >
                  {log.status}
                </span>
              </div>
            ))
          )}
        </div>

        {canLoadMore ? (
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLimit((prev) => Math.min(prev + 50, 200))}
            >
              Charger plus
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
