"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { ShiftPilotStateOut } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type AppType = "Lyft" | "DoorDash";
type SessionMode =
  | "Commute"
  | "Lunch peak"
  | "Dinner peak"
  | "Nightlife"
  | "Airport"
  | "Flexible";

type ExportColumnKey =
  | "date"
  | "start"
  | "end"
  | "app"
  | "mode"
  | "earnings"
  | "tips"
  | "rides"
  | "gas"
  | "tolls"
  | "targetEarnings"
  | "targetRides"
  | "notes";

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

interface HistoryRow {
  id: string;
  appType: AppType;
  mode: SessionMode;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  earnings: string;
  tips: string;
  ridesOrDeliveries: string;
  gas: string;
  tolls: string;
  notes: string;
  targetEarnings: string;
  targetRides: string;
}

interface ShiftPilotHistorySheetPageProps {
  returnPath: string;
}

const APP_TYPES: AppType[] = ["Lyft", "DoorDash"];
const MODES: SessionMode[] = [
  "Commute",
  "Lunch peak",
  "Dinner peak",
  "Nightlife",
  "Airport",
  "Flexible",
];

const DEFAULT_EXPORT_COLUMNS: Record<ExportColumnKey, boolean> = {
  date: true,
  start: true,
  end: true,
  app: true,
  mode: true,
  earnings: true,
  tips: true,
  rides: true,
  gas: true,
  tolls: true,
  targetEarnings: false,
  targetRides: false,
  notes: true,
};

const EXPORT_COLUMNS: Array<{
  key: ExportColumnKey;
  label: string;
  value: (row: HistoryRow) => string;
}> = [
  { key: "date", label: "Date", value: (row) => row.startDate },
  { key: "start", label: "Start Time", value: (row) => row.startTime },
  { key: "end", label: "End Time", value: (row) => row.endTime },
  { key: "app", label: "App", value: (row) => row.appType },
  { key: "mode", label: "Mode", value: (row) => row.mode },
  { key: "earnings", label: "Earnings", value: (row) => row.earnings },
  { key: "tips", label: "Tips", value: (row) => row.tips },
  { key: "rides", label: "Rides/Deliveries", value: (row) => row.ridesOrDeliveries },
  { key: "gas", label: "Gas", value: (row) => row.gas },
  { key: "tolls", label: "Tolls/Parking", value: (row) => row.tolls },
  {
    key: "targetEarnings",
    label: "Target Earnings",
    value: (row) => row.targetEarnings,
  },
  {
    key: "targetRides",
    label: "Target Rides",
    value: (row) => row.targetRides,
  },
  { key: "notes", label: "Notes", value: (row) => row.notes },
];

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTimeInput(date: Date): string {
  const h = `${date.getHours()}`.padStart(2, "0");
  const m = `${date.getMinutes()}`.padStart(2, "0");
  return `${h}:${m}`;
}

function parseFiniteNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function isAppType(value: unknown): value is AppType {
  return value === "Lyft" || value === "DoorDash";
}

function isMode(value: unknown): value is SessionMode {
  return typeof value === "string" && MODES.includes(value as SessionMode);
}

function parseDateTime(datePart: string, timePart: string): Date {
  const fallback = new Date();
  if (!datePart || !timePart) return fallback;
  const value = new Date(`${datePart}T${timePart}:00`);
  return Number.isNaN(value.getTime()) ? fallback : value;
}

function toRow(raw: unknown): HistoryRow {
  const session = (raw ?? {}) as Partial<WorkSession>;
  const start = new Date(session.startTime ?? Date.now());
  const end = new Date(session.endTime ?? start);
  return {
    id: typeof session.id === "string" && session.id ? session.id : createId("session"),
    appType: isAppType(session.appType) ? session.appType : "Lyft",
    mode: isMode(session.mode) ? session.mode : "Flexible",
    startDate: toDateInput(start),
    startTime: toTimeInput(start),
    endDate: toDateInput(end),
    endTime: toTimeInput(end),
    earnings: String(session.earnings ?? 0),
    tips: String(session.tips ?? 0),
    ridesOrDeliveries: String(session.ridesOrDeliveries ?? 0),
    gas: String(session.gas ?? 0),
    tolls: String(session.tolls ?? 0),
    notes: typeof session.notes === "string" ? session.notes : "",
    targetEarnings:
      typeof session.targetEarnings === "number" ? String(session.targetEarnings) : "",
    targetRides:
      typeof session.targetRides === "number" ? String(session.targetRides) : "",
  };
}

function toSession(row: HistoryRow): WorkSession {
  const start = parseDateTime(row.startDate, row.startTime);
  const end = parseDateTime(row.endDate, row.endTime);
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  const durationSeconds = Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / 1000)
  );
  return {
    id: row.id || createId("session"),
    appType: row.appType,
    mode: row.mode,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    durationSeconds,
    earnings: parseFiniteNumber(row.earnings),
    tips: parseFiniteNumber(row.tips),
    ridesOrDeliveries: Math.max(0, Math.floor(parseFiniteNumber(row.ridesOrDeliveries))),
    gas: parseFiniteNumber(row.gas),
    tolls: parseFiniteNumber(row.tolls),
    notes: row.notes.trim(),
    targetEarnings: parseOptionalNumber(row.targetEarnings),
    targetRides: parseOptionalNumber(row.targetRides),
  };
}

function escapeCsv(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

export default function ShiftPilotHistorySheetPage({
  returnPath,
}: ShiftPilotHistorySheetPageProps) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportAppFilter, setExportAppFilter] = useState<"all" | AppType>("all");
  const [exportColumns, setExportColumns] = useState<Record<ExportColumnKey, boolean>>(
    DEFAULT_EXPORT_COLUMNS
  );

  const loadRemote = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const response = await apiFetch<ShiftPilotStateOut>("/users/me/shiftpilot-state");
      const data =
        response.payload && typeof response.payload === "object"
          ? (response.payload as Record<string, unknown>)
          : {};
      const list = Array.isArray(data.sessions) ? data.sessions : [];
      const parsed = list.map((item) => toRow(item)).sort((a, b) => {
        const left = parseDateTime(a.startDate, a.startTime).getTime();
        const right = parseDateTime(b.startDate, b.startTime).getTime();
        return right - left;
      });
      setPayload(data);
      setRows(parsed);
      setHasUnsavedChanges(false);
      setMessage(silent ? "Data refreshed." : "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRemote();
  }, [loadRemote]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.startDate,
        row.startTime,
        row.endTime,
        row.appType,
        row.mode,
        row.notes,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search]);

  const rowsForExport = useMemo(() => {
    return rows.filter((row) => {
      if (exportAppFilter !== "all" && row.appType !== exportAppFilter) return false;
      if (exportStartDate && row.startDate < exportStartDate) return false;
      if (exportEndDate && row.startDate > exportEndDate) return false;
      return true;
    });
  }, [rows, exportAppFilter, exportStartDate, exportEndDate]);

  const visibleStats = useMemo(() => {
    const gross = visibleRows.reduce(
      (sum, row) => sum + parseFiniteNumber(row.earnings) + parseFiniteNumber(row.tips),
      0
    );
    const expenses = visibleRows.reduce(
      (sum, row) => sum + parseFiniteNumber(row.gas) + parseFiniteNumber(row.tolls),
      0
    );
    const rides = visibleRows.reduce(
      (sum, row) => sum + Math.max(0, Math.floor(parseFiniteNumber(row.ridesOrDeliveries))),
      0
    );
    return {
      gross,
      net: gross - expenses,
      rides,
      expenses,
    };
  }, [visibleRows]);

  const selectedExportCount = useMemo(
    () => EXPORT_COLUMNS.filter((column) => exportColumns[column.key]).length,
    [exportColumns]
  );

  const updateRow = (id: string, field: keyof HistoryRow, value: string) => {
    setHasUnsavedChanges(true);
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    const next: HistoryRow = {
      id: createId("session"),
      appType: "Lyft",
      mode: "Flexible",
      startDate: toDateInput(now),
      startTime: toTimeInput(now),
      endDate: toDateInput(later),
      endTime: toTimeInput(later),
      earnings: "0",
      tips: "0",
      ridesOrDeliveries: "0",
      gas: "0",
      tolls: "0",
      notes: "",
      targetEarnings: "",
      targetRides: "",
    };
    setHasUnsavedChanges(true);
    setRows((prev) => [next, ...prev]);
    setMessage("New manual row added.");
  };

  const deleteRow = (id: string) => {
    const confirmed = window.confirm("Delete this row?");
    if (!confirmed) return;
    setHasUnsavedChanges(true);
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const saveAll = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const nextPayload = {
        ...payload,
        sessions: rows.map((row) => toSession(row)),
      };
      await apiFetch<ShiftPilotStateOut>("/users/me/shiftpilot-state", {
        method: "PUT",
        body: { payload: nextPayload },
      });
      setPayload(nextPayload);
      setHasUnsavedChanges(false);
      setMessage("History saved successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save history.");
    } finally {
      setSaving(false);
    }
  };

  const toggleExportColumn = (key: ExportColumnKey, checked: boolean) => {
    setExportColumns((prev) => ({ ...prev, [key]: checked }));
  };

  const toggleAllExportColumns = (checked: boolean) => {
    const next: Record<ExportColumnKey, boolean> = { ...DEFAULT_EXPORT_COLUMNS };
    for (const column of EXPORT_COLUMNS) {
      next[column.key] = checked;
    }
    setExportColumns(next);
  };

  const downloadExcelCsv = () => {
    const selectedColumns = EXPORT_COLUMNS.filter((column) => exportColumns[column.key]);
    if (selectedColumns.length === 0) {
      setError("Select at least one export column.");
      return;
    }
    const header = selectedColumns.map((column) => escapeCsv(column.label)).join(",");
    const lines = rowsForExport.map((row) =>
      selectedColumns.map((column) => escapeCsv(column.value(row))).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `shiftpilot-history-${stamp}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage(`Excel-compatible file downloaded (${rowsForExport.length} rows).`);
  };

  return (
    <div className="space-y-6 pb-20">
      <section className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-[var(--surface)] to-cyan-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              ShiftPilot
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">History Sheet</h1>
            <p className="mt-1 text-sm text-slate-600">
              Visual editor for sessions, bulk adjustments, and export-ready reports.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={hasUnsavedChanges ? "warning" : "success"}>
                {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
              </Badge>
              <Badge tone="accent">Rows: {rows.length}</Badge>
              <Badge tone="muted">Visible: {visibleRows.length}</Badge>
              <Badge tone="warning">Exportable: {rowsForExport.length}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={returnPath}>Back to ShiftPilot</Link>
            </Button>
            <Button
              variant="secondary"
              isLoading={refreshing}
              onClick={() => void loadRemote(true)}
            >
              Refresh
            </Button>
            <Button variant="secondary" onClick={addRow}>
              Add Manual Row
            </Button>
            <Button
              isLoading={saving}
              disabled={!hasUnsavedChanges && !saving}
              onClick={() => void saveAll()}
            >
              Save All Changes
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-1 py-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Visible Gross</p>
          <p className="text-xl font-semibold text-slate-900">
            {formatCurrency(visibleStats.gross)}
          </p>
        </Card>
        <Card className="space-y-1 py-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Visible Net</p>
          <p className="text-xl font-semibold text-slate-900">
            {formatCurrency(visibleStats.net)}
          </p>
        </Card>
        <Card className="space-y-1 py-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Visible Rides</p>
          <p className="text-xl font-semibold text-slate-900">
            {visibleStats.rides.toLocaleString("en-US")}
          </p>
        </Card>
        <Card className="space-y-1 py-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Visible Expenses</p>
          <p className="text-xl font-semibold text-slate-900">
            {formatCurrency(visibleStats.expenses)}
          </p>
        </Card>
      </div>

      {message ? (
        <Card className="border-emerald-200 bg-emerald-50 py-3">
          <p className="text-sm text-emerald-800">{message}</p>
        </Card>
      ) : null}
      {error ? (
        <Card className="border-rose-200 bg-rose-50 py-3">
          <p className="text-sm text-rose-800">{error}</p>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[210px] flex-1">
            <p className="mb-1 text-sm text-slate-600">Search in editor</p>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="date, app, mode, notes..."
            />
          </div>
          <div>
            <p className="mb-1 text-sm text-slate-600">Export start</p>
            <Input
              type="date"
              value={exportStartDate}
              onChange={(event) => setExportStartDate(event.target.value)}
            />
          </div>
          <div>
            <p className="mb-1 text-sm text-slate-600">Export end</p>
            <Input
              type="date"
              value={exportEndDate}
              onChange={(event) => setExportEndDate(event.target.value)}
            />
          </div>
          <div>
            <p className="mb-1 text-sm text-slate-600">App filter</p>
            <select
              value={exportAppFilter}
              onChange={(event) =>
                setExportAppFilter(
                  event.target.value === "Lyft" || event.target.value === "DoorDash"
                    ? event.target.value
                    : "all"
                )
              }
              className="h-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="all">All apps</option>
              <option value="Lyft">Lyft</option>
              <option value="DoorDash">DoorDash</option>
            </select>
          </div>
          <Button variant="secondary" onClick={downloadExcelCsv}>
            Download Excel (.csv)
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-sm text-slate-700">
            Export columns selected: <strong>{selectedExportCount}</strong> /{" "}
            {EXPORT_COLUMNS.length}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleAllExportColumns(true)}
            >
              Select all
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleAllExportColumns(false)}
            >
              Clear all
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {EXPORT_COLUMNS.map((column) => (
            <label
              key={column.key}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-[var(--surface)] px-3 py-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={exportColumns[column.key]}
                onChange={(event) => toggleExportColumn(column.key, event.target.checked)}
              />
              {column.label}
            </label>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base font-semibold text-slate-900">History Editor</p>
          <p className="text-xs text-slate-500">
            Tip: scroll horizontally and keep action columns pinned on the left.
          </p>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading history...</p>
        ) : (
          <div className="overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1940px] text-left text-sm">
              <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-600">
                <tr>
                  <th className="sticky left-0 z-30 w-[52px] px-2 py-2">#</th>
                  <th className="sticky z-30 w-[120px] px-2 py-2" style={{ left: 52 }}>
                    Actions
                  </th>
                  <th className="px-2 py-2">App</th>
                  <th className="px-2 py-2">Mode</th>
                  <th className="px-2 py-2">Start date</th>
                  <th className="px-2 py-2">Start time</th>
                  <th className="px-2 py-2">End date</th>
                  <th className="px-2 py-2">End time</th>
                  <th className="px-2 py-2">Earnings</th>
                  <th className="px-2 py-2">Tips</th>
                  <th className="px-2 py-2">Rides/Deliveries</th>
                  <th className="px-2 py-2">Gas</th>
                  <th className="px-2 py-2">Tolls</th>
                  <th className="px-2 py-2">Target $</th>
                  <th className="px-2 py-2">Target rides</th>
                  <th className="px-2 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td className="px-2 py-6 text-center text-sm text-slate-500" colSpan={16}>
                      No rows found for this filter.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row, index) => {
                    const rowBg = index % 2 === 0 ? "bg-[var(--surface)]" : "bg-slate-50";
                    return (
                      <tr key={row.id} className={`${rowBg} hover:bg-blue-50/50`}>
                        <td
                          className={`sticky left-0 z-10 px-2 py-2 text-xs font-semibold text-slate-500 ${rowBg}`}
                        >
                          {index + 1}
                        </td>
                        <td
                          className={`sticky z-10 px-2 py-2 ${rowBg}`}
                          style={{ left: 52 }}
                        >
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => deleteRow(row.id)}
                          >
                            Delete
                          </Button>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={row.appType}
                            onChange={(event) =>
                              updateRow(
                                row.id,
                                "appType",
                                event.target.value === "DoorDash" ? "DoorDash" : "Lyft"
                              )
                            }
                            className="h-8 w-[120px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                          >
                            {APP_TYPES.map((app) => (
                              <option key={app} value={app}>
                                {app}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={row.mode}
                            onChange={(event) =>
                              updateRow(
                                row.id,
                                "mode",
                                MODES.includes(event.target.value as SessionMode)
                                  ? event.target.value
                                  : "Flexible"
                              )
                            }
                            className="h-8 w-[148px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                          >
                            {MODES.map((mode) => (
                              <option key={mode} value={mode}>
                                {mode}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="date"
                            value={row.startDate}
                            onChange={(event) =>
                              updateRow(row.id, "startDate", event.target.value)
                            }
                            className="h-8 min-w-[145px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="time"
                            value={row.startTime}
                            onChange={(event) =>
                              updateRow(row.id, "startTime", event.target.value)
                            }
                            className="h-8 min-w-[120px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="date"
                            value={row.endDate}
                            onChange={(event) => updateRow(row.id, "endDate", event.target.value)}
                            className="h-8 min-w-[145px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="time"
                            value={row.endTime}
                            onChange={(event) => updateRow(row.id, "endTime", event.target.value)}
                            className="h-8 min-w-[120px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.earnings}
                            onChange={(event) => updateRow(row.id, "earnings", event.target.value)}
                            className="h-8 min-w-[110px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.tips}
                            onChange={(event) => updateRow(row.id, "tips", event.target.value)}
                            className="h-8 min-w-[100px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.ridesOrDeliveries}
                            onChange={(event) =>
                              updateRow(row.id, "ridesOrDeliveries", event.target.value)
                            }
                            className="h-8 min-w-[120px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.gas}
                            onChange={(event) => updateRow(row.id, "gas", event.target.value)}
                            className="h-8 min-w-[100px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.tolls}
                            onChange={(event) => updateRow(row.id, "tolls", event.target.value)}
                            className="h-8 min-w-[100px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.targetEarnings}
                            onChange={(event) =>
                              updateRow(row.id, "targetEarnings", event.target.value)
                            }
                            className="h-8 min-w-[110px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.targetRides}
                            onChange={(event) =>
                              updateRow(row.id, "targetRides", event.target.value)
                            }
                            className="h-8 min-w-[110px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={row.notes}
                            onChange={(event) => updateRow(row.id, "notes", event.target.value)}
                            className="h-8 min-w-[320px]"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
