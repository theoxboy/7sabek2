"use client";

import { useEffect, useMemo, useState } from "react";

import { API_BASE, apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { BackupRecordOut, BackupStatusOut } from "@/lib/types";
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

const extractErrorMessage = (payload: string) => {
  if (!payload) return "Request failed";
  const trimmed = payload.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as { detail?: string | { msg?: string }[] };
      if (typeof parsed.detail === "string") return parsed.detail;
      if (Array.isArray(parsed.detail)) {
        return parsed.detail.map((item) => item.msg ?? "Invalid request").join(", ");
      }
    } catch {
      return payload;
    }
  }
  return payload;
};

const getFilenameFromDisposition = (value: string | null) => {
  if (!value) return null;
  const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }
  const match = value.match(/filename="?([^\";]+)"?/i);
  return match?.[1] ?? null;
};

export default function SuperAdminBackupsPage() {
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "superadmin-backups-ar-body");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState("replace");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportMessageMeta, setExportMessageMeta] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [backupStatus, setBackupStatus] = useState<BackupStatusOut | null>(null);
  const [history, setHistory] = useState<BackupRecordOut[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);

  const adminFetch = <T,>(path: string) =>
    apiFetch<T>(path, { headers: { "x-admin-bypass": "true" } });

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      try {
        const data = await adminFetch<BackupStatusOut>("/admin/backups/status");
        if (active) setBackupStatus(data);
      } catch {
        if (active) setBackupStatus(null);
      }
    };
    loadStatus();
    const interval = window.setInterval(loadStatus, 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingHistory(true);
    const loadHistory = async () => {
      try {
        const data = await adminFetch<BackupRecordOut[]>(
          "/admin/backups/history?limit=30"
        );
        if (active) setHistory(data);
        if (active) setHistoryError("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur de chargement.";
        if (active) setHistoryError(msg);
      } finally {
        if (active) setLoadingHistory(false);
      }
    };
    loadHistory();
    const interval = window.setInterval(loadHistory, 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const formatBytes = (value?: number | null) => {
    if (!value) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let idx = 0;
    while (size >= 1024 && idx < units.length - 1) {
      size /= 1024;
      idx += 1;
    }
    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[idx]}`;
  };

  const formatDuration = (value?: number | null) => {
    if (!value) return "—";
    const seconds = Math.round(value / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const nextScheduled = useMemo(() => {
    if (!backupStatus?.last_scheduled) return null;
    const base = new Date(backupStatus.last_scheduled.created_at);
    if (Number.isNaN(base.getTime())) return null;
    const days = backupStatus.schedule_days ?? 15;
    return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  }, [backupStatus]);

  const handleExport = async () => {
    setExportError("");
    setExportMessage("");
    setExportMessageMeta(null);
    setExporting(true);
    try {
      const response = await fetch(`${API_BASE}/admin/backups/export`, {
        method: "POST",
        credentials: "include",
        headers: { "x-admin-bypass": "true" },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(extractErrorMessage(text));
      }
      const blob = await response.blob();
      const filename =
        getFilenameFromDisposition(response.headers.get("content-disposition")) ??
        "floussy_backup.dump";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      const now = new Date();
      setExportMessage(
        `Export terminé avec succès — ${now.toLocaleString("fr-FR")}.`
      );
      setExportMessageMeta(
        "Ce log est enregistré automatiquement. Aucun téléversement n’est nécessaire."
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l’export.";
      const now = new Date();
      setExportError(`${msg} — ${now.toLocaleString("fr-FR")}.`);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImportError("");
    setImportMessage("");
    if (!importFile) {
      setImportError("Choisis un fichier de backup.");
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("mode", importMode);
      const response = await fetch(`${API_BASE}/admin/backups/import`, {
        method: "POST",
        credentials: "include",
        headers: { "x-admin-bypass": "true" },
        body: formData,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(extractErrorMessage(text));
      }
      setImportMessage("Import terminé avec succès.");
      setImportFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l’import.";
      setImportError(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-10 text-[var(--ink)]" dir={dir}>
      <style jsx>{`
        .spike-card {
          border-radius: 18px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: #fff;
          box-shadow: 0 12px 30px -24px rgba(0, 0, 0, 0.45);
        }
        .spike-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        .spike-subtitle {
          font-size: 12px;
          color: #9ca3af;
        }
      `}</style>
      <Card className="spike-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="spike-title">Sauvegardes planifiées</p>
            <p className="spike-subtitle">
              Sauvegarde automatique tous les{" "}
              {backupStatus?.schedule_days ?? 15} jours. Rétention{" "}
              {backupStatus?.retention_count ?? 1} version.
            </p>
          </div>
          <div className="text-xs text-gray-500">
            {nextScheduled
              ? `Prochaine exécution estimée: ${nextScheduled.toLocaleString("fr-FR")}`
              : "Prochaine exécution: —"}
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">
              Dernière sauvegarde planifiée
            </p>
            <p className="text-xs text-gray-500">
              {backupStatus?.last_scheduled
                ? new Date(
                    backupStatus.last_scheduled.created_at
                  ).toLocaleString("fr-FR")
                : "Aucune sauvegarde planifiée pour le moment."}
            </p>
            {backupStatus?.last_scheduled ? (
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <p>Fichier: {backupStatus.last_scheduled.file_name ?? "—"}</p>
                <p>
                  Taille:{" "}
                  {formatBytes(backupStatus.last_scheduled.file_size_bytes)}
                </p>
                <p>
                  Durée:{" "}
                  {formatDuration(backupStatus.last_scheduled.duration_ms)}
                </p>
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">
              Dernier snapshot avant import
            </p>
            <p className="text-xs text-gray-500">
              {backupStatus?.last_snapshot
                ? new Date(
                    backupStatus.last_snapshot.created_at
                  ).toLocaleString("fr-FR")
                : "Aucun snapshot pour le moment."}
            </p>
            {backupStatus?.last_snapshot ? (
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <p>Fichier: {backupStatus.last_snapshot.file_name ?? "—"}</p>
                <p>
                  Taille:{" "}
                  {formatBytes(backupStatus.last_snapshot.file_size_bytes)}
                </p>
                <p>
                  Durée:{" "}
                  {formatDuration(backupStatus.last_snapshot.duration_ms)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
      <Card className="spike-card p-6">
        <div className="space-y-4">
          <div>
            <p className="spike-title">Export complet</p>
            <p className="spike-subtitle">
              Télécharge une sauvegarde complète de la base de données.
            </p>
          </div>
        <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              isLoading={exporting}
              onClick={handleExport}
              className="bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
            >
              Générer le backup
            </Button>
            <span className="text-xs text-gray-500">
              Format : .dump (pg_restore)
            </span>
          </div>
        </div>
        {exportMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {exportMessage}
            {exportMessageMeta ? (
              <p className="mt-1 text-xs text-emerald-600">{exportMessageMeta}</p>
            ) : null}
          </div>
        ) : null}
        {exportError ? (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {exportError}
          </div>
        ) : null}
      </Card>

      <Card className="spike-card p-6">
        <div className="space-y-4">
          <div>
            <p className="spike-title">Import / Restauration</p>
            <p className="spike-subtitle">
              Restaurer une sauvegarde peut écraser les données existantes.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-2">
              <Label>Fichier de backup</Label>
              <Input
                type="file"
                accept=".dump,application/octet-stream"
                onChange={(event) =>
                  setImportFile(event.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs text-gray-500">
                Utilise un fichier exporté depuis 7sabek (.dump).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Mode de restauration</Label>
              <Select value={importMode} onValueChange={setImportMode}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="replace">
                    Remplacer (efface puis restaure)
                  </SelectItem>
                  <SelectItem value="merge">
                    Fusionner (garde les données)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                “Remplacer” est recommandé pour une restauration complète.
              </p>
            </div>
          </div>
        <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              isLoading={importing}
              onClick={handleImport}
              className="bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
            >
              Importer la sauvegarde
            </Button>
            <span className="text-xs text-gray-500">
              L’import peut prendre quelques minutes.
            </span>
          </div>
        </div>
        {importMessage && !importError ? (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {importMessage}
          </div>
        ) : null}
        {importError ? (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {importError}
          </div>
        ) : null}
      </Card>

      <Card className="spike-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="spike-title">Historique des backups</p>
            <p className="spike-subtitle">
              Imports, exports, snapshots et sauvegardes planifiées.
            </p>
          </div>
          <span className="rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-xs text-gray-500">
            Rafraîchissement auto
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {historyError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {historyError}
            </div>
          ) : null}
          {loadingHistory ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
              Chargement...
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
              Aucun historique pour le moment.
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 px-4 py-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.kind} · {item.status}
                    {item.mode ? ` · ${item.mode}` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleString("fr-FR")}
                    {item.actor_email ? ` · ${item.actor_email}` : ""}
                    {item.actor_ip ? ` · IP ${item.actor_ip}` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.file_name ? `Fichier: ${item.file_name}` : "Fichier: —"} ·
                    Taille: {formatBytes(item.file_size_bytes)} · Durée:{" "}
                    {formatDuration(item.duration_ms)}
                  </p>
                  {item.message ? (
                    <p className="text-xs text-gray-400">{item.message}</p>
                  ) : null}
                </div>
                <span className="rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-xs text-gray-500">
                  {item.completed_at
                    ? `Terminé ${new Date(item.completed_at).toLocaleString("fr-FR")}`
                    : "En cours"}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

    </div>
  );
}
