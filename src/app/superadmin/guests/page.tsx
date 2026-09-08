"use client";

import { useMemo, useState } from "react";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { GuestAdminRow } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  AdminCard,
  AuthorityHeader,
  ChartCard,
  KpiCard,
  useChartPalette,
} from "../_kit";
import {
  purgeGuestAccount,
  useGuestDetail,
  useGuestFunnel,
  useGuestList,
  type GuestListParams,
} from "../_useAdminData";

const COPY = {
  fr: {
    kicker: "Mode Découverte",
    title: "Comptes invités",
    subtitle:
      "Chaque invité, ses données, son état de protection et son parcours de conversion.",
    kpiActive: "Invités actifs",
    kpiCreated: "Créés (30 j)",
    kpiConversion: "Taux de conversion",
    kpiSilent: "Perte silencieuse",
    protectionSplit: "Répartition de la protection",
    trend: "Créés vs convertis / jour",
    search: "Rechercher un ID…",
    refresh: "Rafraîchir",
    export: "Exporter CSV",
    all: "Tous",
    statusActive: "Actif",
    statusClaimed: "Converti",
    statusAtRisk: "À risque",
    statusStale: "Périmé",
    hasTx: "Avec transactions",
    colId: "ID",
    colCreated: "Créé",
    colSeen: "Dernière activité",
    colProtection: "Protection",
    colEnv: "Env.",
    colTx: "Tx",
    colTotal: "Dépensé",
    colRecovery: "Code",
    colStatus: "Statut",
    colDevice: "Appareil / pays",
    colClaim: "Claim",
    empty: "Aucun invité (ou l’endpoint /admin/guests n’est pas encore déployé).",
    detailTitle: "Détail de l’invité",
    timeline: "Parcours",
    envelopes: "Enveloppes",
    transactions: "Transactions récentes",
    anchor: "Empreinte appareil",
    purge: "Purger cet invité",
    purgeConfirm:
      "Supprimer définitivement cet invité et toutes ses données ? Action irréversible.",
    cancel: "Annuler",
    confirm: "Purger",
    close: "Fermer",
    days: "j",
    chart: { loading: "Chargement…", empty: "Aucune donnée", error: "Erreur", retry: "Réessayer" },
  },
  en: {
    kicker: "Discovery mode",
    title: "Guest accounts",
    subtitle: "Every guest, their data, protection state and conversion journey.",
    kpiActive: "Active guests",
    kpiCreated: "Created (30d)",
    kpiConversion: "Conversion rate",
    kpiSilent: "Silent loss",
    protectionSplit: "Protection split",
    trend: "Created vs claimed / day",
    search: "Search an ID…",
    refresh: "Refresh",
    export: "Export CSV",
    all: "All",
    statusActive: "Active",
    statusClaimed: "Claimed",
    statusAtRisk: "At risk",
    statusStale: "Stale",
    hasTx: "With transactions",
    colId: "ID",
    colCreated: "Created",
    colSeen: "Last seen",
    colProtection: "Protection",
    colEnv: "Env.",
    colTx: "Tx",
    colTotal: "Spent",
    colRecovery: "Code",
    colStatus: "Status",
    colDevice: "Device / country",
    colClaim: "Claim",
    empty: "No guests (or the /admin/guests endpoint isn’t deployed yet).",
    detailTitle: "Guest detail",
    timeline: "Journey",
    envelopes: "Envelopes",
    transactions: "Recent transactions",
    anchor: "Device fingerprint",
    purge: "Purge this guest",
    purgeConfirm:
      "Permanently delete this guest and all their data? This cannot be undone.",
    cancel: "Cancel",
    confirm: "Purge",
    close: "Close",
    days: "d",
    chart: { loading: "Loading…", empty: "No data", error: "Error", retry: "Retry" },
  },
  ar: {
    kicker: "وضع الاكتشاف",
    title: "حسابات الضيوف",
    subtitle: "كل ضيف، البيانات ديالو، مستوى الحماية، ومسار التحويل.",
    kpiActive: "ضيوف نشيطين",
    kpiCreated: "تصاوبو (30 يوم)",
    kpiConversion: "نسبة التحويل",
    kpiSilent: "الضياع الصامت",
    protectionSplit: "توزيع الحماية",
    trend: "تصاوبو مقابل تحوّلو / نهار",
    search: "قلب على ID…",
    refresh: "عاود",
    export: "صدّر CSV",
    all: "الكل",
    statusActive: "نشيط",
    statusClaimed: "تحوّل",
    statusAtRisk: "فخطر",
    statusStale: "قديم",
    hasTx: "عندو معاملات",
    colId: "ID",
    colCreated: "تصاوب",
    colSeen: "آخر نشاط",
    colProtection: "الحماية",
    colEnv: "أظرفة",
    colTx: "معاملات",
    colTotal: "صرف",
    colRecovery: "كود",
    colStatus: "الحالة",
    colDevice: "الجهاز / البلد",
    colClaim: "التحويل",
    empty: "ما كاين حتى ضيف (ولا /admin/guests مازال ما تنشرش).",
    detailTitle: "تفاصيل الضيف",
    timeline: "المسار",
    envelopes: "الأظرفة",
    transactions: "آخر المعاملات",
    anchor: "بصمة الجهاز",
    purge: "امسح هاد الضيف",
    purgeConfirm: "تمسح هاد الضيف وكل البيانات ديالو نهائيا؟ ما يمكنش الرجوع.",
    cancel: "إلغاء",
    confirm: "امسح",
    close: "سدّ",
    days: "يوم",
    chart: { loading: "كيتحمّل…", empty: "ما كاين داتا", error: "خطأ", retry: "عاود" },
  },
} as const;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function protectionTone(level: number | null): "muted" | "warning" | "accent" | "success" {
  if (level == null) return "muted";
  if (level >= 100) return "success";
  if (level >= 70) return "accent";
  return "warning";
}

export default function SuperadminGuestsPage() {
  const { locale, dir } = useAppLocale("fr");
  useForceArabicDocumentFont(locale === "ar", "superadmin-guests-ar-body");
  const t = COPY[locale];
  const palette = useChartPalette();

  const [status, setStatus] = useState("all");
  const [protection, setProtection] = useState("all");
  const [hasTx, setHasTx] = useState(false);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<GuestAdminRow | null>(null);
  const [purging, setPurging] = useState(false);

  const params: GuestListParams = { status, protection, hasTx, q, sort: "created_desc" };
  const list = useGuestList(params);
  const funnel = useGuestFunnel(30);
  const detail = useGuestDetail(selectedId);

  const rows = list.data?.rows ?? [];

  const protectionData = useMemo(() => {
    const f = funnel.data;
    if (!f) return [];
    return [
      { name: "40", value: f.protection_40 ?? 0, color: palette.amber },
      { name: "70", value: f.protection_70 ?? 0, color: palette.accent },
      { name: "100", value: f.protection_100 ?? 0, color: palette.positive },
    ].filter((d) => d.value > 0);
  }, [funnel.data, palette]);

  const trendData = useMemo(
    () =>
      (funnel.data?.daily ?? []).map((d) => ({
        day: d.day.slice(5),
        created: d.created,
        claimed: d.claimed,
      })),
    [funnel.data]
  );

  const exportCsv = () => {
    const head = [
      "id",
      "created_at",
      "last_seen_at",
      "protection",
      "envelopes",
      "transactions",
      "expense_total",
      "status",
      "claim_method",
      "device",
      "country",
    ];
    const lines = rows.map((r) =>
      [
        r.id,
        r.guest_created_at ?? "",
        r.last_seen_at ?? "",
        r.protection_level ?? "",
        r.envelope_count,
        r.transaction_count,
        r.expense_total,
        r.status,
        r.claim_method ?? "",
        (r.device ?? "").replace(/[,;\n]/g, " "),
        r.country ?? "",
      ].join(",")
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmPurge = async () => {
    if (!purgeTarget) return;
    setPurging(true);
    try {
      await purgeGuestAccount(purgeTarget.id);
      setPurgeTarget(null);
      if (selectedId === purgeTarget.id) setSelectedId(null);
      await list.mutate();
    } catch {
      /* surfaced by the row staying */
    } finally {
      setPurging(false);
    }
  };

  const statusLabel = (s: GuestAdminRow["status"]) =>
    s === "claimed"
      ? t.statusClaimed
      : s === "at_risk"
        ? t.statusAtRisk
        : s === "stale"
          ? t.statusStale
          : t.statusActive;

  const f = funnel.data;

  return (
    <div dir={dir} className="space-y-6">
      <AuthorityHeader
        kicker={t.kicker}
        title={t.title}
        subtitle={t.subtitle}
        right={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => void list.mutate()}>
              <RefreshCw className="h-4 w-4" />
              {t.refresh}
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="h-4 w-4" />
              {t.export}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t.kpiActive}
          value={(f?.guests_active_now ?? 0).toLocaleString()}
        />
        <KpiCard
          label={t.kpiCreated}
          value={(f?.guests_created ?? 0).toLocaleString()}
        />
        <KpiCard
          label={t.kpiConversion}
          value={f ? `${Math.round(f.claim_rate * 100)}%` : "—"}
          hint={f ? `${f.guests_claimed} / ${f.guests_created}` : undefined}
        />
        <KpiCard
          label={t.kpiSilent}
          value={f ? `${(f.silent_loss_rate * 100).toFixed(1)}%` : "—"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title={t.trend}
          query={funnel}
          empty={trendData.length === 0}
          labels={t.chart}
          height={200}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="created"
                stroke={palette.accent}
                fill={palette.accent}
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="claimed"
                stroke={palette.positive}
                fill={palette.positive}
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={t.protectionSplit}
          query={funnel}
          empty={protectionData.length === 0}
          labels={t.chart}
          height={200}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={protectionData}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={70}
              >
                {protectionData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <AdminCard>
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs"
          >
            <option value="all">{t.all}</option>
            <option value="active">{t.statusActive}</option>
            <option value="claimed">{t.statusClaimed}</option>
            <option value="at_risk">{t.statusAtRisk}</option>
            <option value="stale">{t.statusStale}</option>
          </select>
          <select
            value={protection}
            onChange={(e) => setProtection(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs"
          >
            <option value="all">{t.colProtection}: {t.all}</option>
            <option value="40">40</option>
            <option value="70">70</option>
            <option value="100">100</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <input type="checkbox" checked={hasTx} onChange={(e) => setHasTx(e.target.checked)} />
            {t.hasTx}
          </label>
          <div className="ms-auto w-48">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.search}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 pe-3 font-semibold">{t.colId}</th>
                <th className="py-2 pe-3 font-semibold">{t.colCreated}</th>
                <th className="py-2 pe-3 font-semibold">{t.colSeen}</th>
                <th className="py-2 pe-3 font-semibold">{t.colProtection}</th>
                <th className="py-2 pe-3 font-semibold">{t.colEnv}</th>
                <th className="py-2 pe-3 font-semibold">{t.colTx}</th>
                <th className="py-2 pe-3 font-semibold">{t.colTotal}</th>
                <th className="py-2 pe-3 font-semibold">{t.colRecovery}</th>
                <th className="py-2 pe-3 font-semibold">{t.colStatus}</th>
                <th className="py-2 pe-3 font-semibold">{t.colDevice}</th>
                <th className="py-2 pe-3 font-semibold">{t.colClaim}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const age = daysSince(r.guest_created_at);
                const seen = daysSince(r.last_seen_at);
                return (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-[var(--border)]/60 hover:bg-[var(--surface-2)]/50"
                    onClick={() => setSelectedId(r.id)}
                  >
                    <td className="py-2 pe-3 font-mono">{r.id.slice(0, 8)}</td>
                    <td className="py-2 pe-3">
                      {age == null ? "—" : `${age}${t.days}`}
                    </td>
                    <td className="py-2 pe-3">
                      {seen == null ? "—" : `${seen}${t.days}`}
                    </td>
                    <td className="py-2 pe-3">
                      <Badge tone={protectionTone(r.protection_level)}>
                        {r.protection_level ?? "—"}
                      </Badge>
                    </td>
                    <td className="py-2 pe-3 tabular-nums">{r.envelope_count}</td>
                    <td className="py-2 pe-3 tabular-nums">{r.transaction_count}</td>
                    <td className="py-2 pe-3 tabular-nums">{r.expense_total}</td>
                    <td className="py-2 pe-3">{r.recovery_code_ack ? "✓" : "✗"}</td>
                    <td className="py-2 pe-3">
                      <Badge
                        tone={
                          r.status === "claimed"
                            ? "success"
                            : r.status === "at_risk"
                              ? "warning"
                              : r.status === "stale"
                                ? "muted"
                                : "accent"
                        }
                      >
                        {statusLabel(r.status)}
                      </Badge>
                    </td>
                    <td className="py-2 pe-3">
                      {[r.device, r.country].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="py-2 pe-3">{r.claim_method ?? "—"}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPurgeTarget(r);
                        }}
                        className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--error)]/10 hover:text-[var(--error)]"
                        aria-label={t.purge}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">{t.empty}</p>
          ) : null}
        </div>
      </AdminCard>

      {/* Detail drawer */}
      <Dialog open={Boolean(selectedId)} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent dir={dir} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.detailTitle}</DialogTitle>
            <DialogDescription className="font-mono">{selectedId}</DialogDescription>
          </DialogHeader>

          {detail.data ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label={t.colProtection} value={String(detail.data.protection_level ?? "—")} />
                <Stat label={t.colEnv} value={String(detail.data.envelope_count)} />
                <Stat label={t.colTx} value={String(detail.data.transaction_count)} />
                <Stat label={t.colTotal} value={detail.data.expense_total} />
              </div>

              <Block title={t.timeline}>
                <ol className="space-y-1 text-xs text-[var(--muted)]">
                  {detail.data.events.map((ev, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="text-[var(--ink)]">{ev.name}</span>
                      <span>{new Date(ev.at).toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              </Block>

              <Block title={t.envelopes}>
                <ul className="space-y-1 text-xs">
                  {detail.data.envelopes.map((e) => (
                    <li key={e.id} className="flex justify-between">
                      <span>{e.name}</span>
                      <span className="tabular-nums text-[var(--muted)]">
                        {e.spent} / {e.allocated}
                      </span>
                    </li>
                  ))}
                </ul>
              </Block>

              <Block title={t.transactions}>
                <ul className="space-y-1 text-xs">
                  {detail.data.recent_transactions.map((tx) => (
                    <li key={tx.id} className="flex justify-between">
                      <span>
                        {tx.occurred_on} · {tx.label}
                      </span>
                      <span className="tabular-nums">{tx.amount}</span>
                    </li>
                  ))}
                </ul>
              </Block>

              {detail.data.anchor ? (
                <Block title={t.anchor}>
                  <p className="text-xs text-[var(--muted)]">
                    {detail.data.anchor.ip_prefix ?? "—"} ·{" "}
                    {detail.data.anchor.signal_count ?? 0} signals
                  </p>
                </Block>
              ) : null}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-[var(--muted)]">…</p>
          )}

          <DialogFooter className="mt-4 justify-between">
            <Button
              variant="danger"
              onClick={() => detail.data && setPurgeTarget(detail.data)}
            >
              <Trash2 className="h-4 w-4" />
              {t.purge}
            </Button>
            <Button variant="ghost" onClick={() => setSelectedId(null)}>
              {t.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge confirm */}
      <Dialog open={Boolean(purgeTarget)} onOpenChange={(o) => !o && setPurgeTarget(null)}>
        <DialogContent dir={dir} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.purge}</DialogTitle>
            <DialogDescription>{t.purgeConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3">
            <Button variant="ghost" onClick={() => setPurgeTarget(null)} disabled={purging}>
              {t.cancel}
            </Button>
            <Button variant="danger" onClick={() => void confirmPurge()} isLoading={purging}>
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="text-sm font-bold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </p>
      {children}
    </div>
  );
}
