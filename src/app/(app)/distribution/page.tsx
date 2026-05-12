"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api";
import {
  activateDistributionConfig,
  deleteDistributionConfig,
  listSavedDistributionConfigs,
  saveDistributionConfig,
  type DistributionSavedRow,
} from "@/lib/distribution";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import type { SettingsResponse } from "@/lib/types";
import {
  DistributionConfigDialog,
  type SavedDistributionConfig,
} from "@/components/distribution/DistributionConfigDialog";
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
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useToast } from "@/components/ui/Toast";

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";

const COPY = {
  fr: {
    title: "Répartition",
    subtitle: "Configure, active et pilote ta répartition sans complexité.",
    configureTitle: "1) Configuration",
    configureBody: "Prépare une configuration claire puis enregistre-la.",
    configure: "Configurer",
    statusTitle: "2) État actuel",
    activeConfig: "Configuration active",
    noActiveConfig: "Aucune configuration active.",
    autoSweepOn: "Sweep auto actif",
    autoSweepOff: "Sweep auto désactivé",
    savedTitle: "3) Configurations enregistrées",
    noSaved: "Aucune configuration enregistrée pour le moment.",
    updatedAt: "Mise à jour",
    activate: "Activer",
    activating: "Activation...",
    edit: "Modifier",
    delete: "Supprimer",
    confirmTitle: "Confirmation",
    confirmDeleteBody: "Supprimer cette configuration ?",
    confirmActivateBody: "Activer cette configuration maintenant ?",
    cancel: "Annuler",
    confirm: "Confirmer",
    inactive: "Inactive",
    active: "Active",
    advancedTitle: "Options avancées",
    moronaTitle: "Réglage morona",
    toolsTitle: "Outils",
    categories: "Catégories",
    sweeps: "Sweeps",
    rules: "Règles",
    planner: "Planificateur",
  },
  en: {
    title: "Distribution",
    subtitle: "Configure, activate, and manage distribution with a clean flow.",
    configureTitle: "1) Configuration",
    configureBody: "Create a clear configuration and save it.",
    configure: "Configure",
    statusTitle: "2) Current state",
    activeConfig: "Active configuration",
    noActiveConfig: "No active configuration.",
    autoSweepOn: "Auto sweep enabled",
    autoSweepOff: "Auto sweep disabled",
    savedTitle: "3) Saved configurations",
    noSaved: "No saved configuration yet.",
    updatedAt: "Updated",
    activate: "Activate",
    activating: "Activating...",
    edit: "Edit",
    delete: "Delete",
    confirmTitle: "Confirmation",
    confirmDeleteBody: "Delete this configuration?",
    confirmActivateBody: "Activate this configuration now?",
    cancel: "Cancel",
    confirm: "Confirm",
    inactive: "Inactive",
    active: "Active",
    advancedTitle: "Advanced options",
    moronaTitle: "Morona setup",
    toolsTitle: "Tools",
    categories: "Categories",
    sweeps: "Sweeps",
    rules: "Rules",
    planner: "Planner",
  },
  ar: {
    title: "التوزيع",
    subtitle: "وجد، فعّل، وسيّر التوزيع بطريقة واضحة وبسيطة.",
    configureTitle: "1) الإعداد",
    configureBody: "وجد كونفيك واضح ومن بعد حفظو.",
    configure: "وجد التوزيع",
    statusTitle: "2) الحالة الحالية",
    activeConfig: "الكونفيك الخدامة",
    noActiveConfig: "ما كايناش كونفيك خدامة.",
    autoSweepOn: "السويب الأوتوماتيكي خدام",
    autoSweepOff: "السويب الأوتوماتيكي مطفي",
    savedTitle: "3) الكونفيكات المحفوظة",
    noSaved: "مازال ما كاين حتى كونفيك محفوظ.",
    updatedAt: "آخر تحديث",
    activate: "فعّل",
    activating: "كيتفعّل...",
    edit: "بدّل",
    delete: "حيد",
    confirmTitle: "تأكيد",
    confirmDeleteBody: "بغيتي تحيد هاد الكونفيك؟",
    confirmActivateBody: "بغيتي تفعّل هاد الكونفيك دابا؟",
    cancel: "إلغاء",
    confirm: "تأكيد",
    inactive: "ماشي خدامة",
    active: "خدامة",
    advancedTitle: "خيارات متقدمة",
    moronaTitle: "إعداد المرونة",
    toolsTitle: "الأدوات",
    categories: "الفئات",
    sweeps: "السويبات",
    rules: "القواعد",
    planner: "المخطط",
  },
} as const;

const toDialogConfig = (config: {
  id: string;
  name: string;
  auto_enabled: boolean;
  percent_mode: "equal" | "ranked";
  source?: "onboarding_initial" | "post_onboarding_adjustment";
  rows: DistributionSavedRow[];
  scope_hash?: string | null;
  created_at: string;
  updated_at: string;
}): SavedDistributionConfig => ({
  id: config.id,
  name: config.name,
  autoEnabled: config.auto_enabled,
  percentMode: config.percent_mode,
  source: config.source,
  scopeHash: config.scope_hash ?? null,
  rows: config.rows.map((row) => ({
    id: `${row.target_type}:${row.target_id}`,
    targetType: row.target_type,
    targetId: row.target_id,
    name: row.name ?? "",
    mode: row.mode,
    enabled: row.enabled,
    fixedAmount: row.fixed_amount ?? "",
    percent: row.percent ?? "",
    rank: row.rank,
  })),
  createdAt: config.created_at,
  updatedAt: config.updated_at,
});

const isMoronaLikeEnvelope = (name: string) => {
  const normalized = name.trim().toLowerCase();
  return !(
    normalized.includes("debt") ||
    normalized.includes("dette") ||
    normalized.includes("dettes") ||
    normalized.includes("credit") ||
    normalized.includes("repayment") ||
    normalized.includes("loan") ||
    normalized.includes("دين") ||
    normalized.includes("ديون") ||
    normalized.includes("قرض") ||
    normalized.includes("goal") ||
    normalized.includes("objectif") ||
    normalized.includes("هدف")
  );
};

export default function DistributionPage() {
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSweepEnabled, setAutoSweepEnabled] = useState<boolean | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<SavedDistributionConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<SavedDistributionConfig | null>(null);
  const [activatingConfigId, setActivatingConfigId] = useState<string | null>(null);
  const [deletingConfigId, setDeletingConfigId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "delete" | "activate">(null);
  const [confirmConfig, setConfirmConfig] = useState<SavedDistributionConfig | null>(null);
  const [showAllSavedConfigs, setShowAllSavedConfigs] = useState(false);
  const [cut1Pct, setCut1Pct] = useState(34);
  const [cut2Pct, setCut2Pct] = useState(67);
  const { toast } = useToast();

  const copy = COPY[locale];
  const pageDir = getLocaleDirection(locale);

  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configs, settings] = await Promise.all([
        listSavedDistributionConfigs(),
        apiFetch<SettingsResponse>("/users/me/settings").catch(() => null),
      ]);
      const mapped = configs.map((item) => toDialogConfig(item));
      setSavedConfigs(mapped);
      const active = configs.find((item) => item.is_active);
      setActiveConfigId(active?.id ?? null);
      setAutoSweepEnabled(settings?.auto_sweep_enabled ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveNamedConfig = useCallback(async (config: SavedDistributionConfig) => {
    const rowsPayload: DistributionSavedRow[] = config.rows.map((row) => ({
      target_type: row.targetType,
      target_id: row.targetId,
      mode: row.mode,
      enabled: row.enabled,
      fixed_amount: row.fixedAmount || null,
      percent: row.percent || null,
      rank: row.rank,
      name: row.name,
    }));

    const saved = await saveDistributionConfig({
      id: config.id,
      name: config.name,
      auto_enabled: config.autoEnabled,
      percent_mode: config.percentMode === "ranked" ? "ranked" : "equal",
      rows: rowsPayload,
      scope_hash: config.scopeHash ?? undefined,
    });

    await loadData();
    return saved.id;
  }, [loadData]);

  const handleActivate = useCallback(async (config: SavedDistributionConfig) => {
    setActivatingConfigId(config.id);
    try {
      await activateDistributionConfig(config.id);
      await loadData();
      toast({ title: copy.activeConfig, description: config.name, variant: "success" });
    } finally {
      setActivatingConfigId(null);
    }
  }, [copy.activeConfig, loadData, toast]);

  const handleDelete = useCallback(async (config: SavedDistributionConfig) => {
    setDeletingConfigId(config.id);
    try {
      await deleteDistributionConfig(config.id);
      await loadData();
    } finally {
      setDeletingConfigId(null);
    }
  }, [loadData]);

  const requestConfirm = useCallback(
    (action: "delete" | "activate", config: SavedDistributionConfig) => {
      setConfirmAction(action);
      setConfirmConfig(config);
      setConfirmOpen(true);
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!confirmConfig || !confirmAction) return;
    setConfirmOpen(false);
    if (confirmAction === "delete") {
      await handleDelete(confirmConfig);
      return;
    }
    await handleActivate(confirmConfig);
  }, [confirmAction, confirmConfig, handleActivate, handleDelete]);

  const activeConfig = useMemo(
    () => savedConfigs.find((cfg) => cfg.id === activeConfigId) ?? null,
    [savedConfigs, activeConfigId]
  );
  const sortedSavedConfigs = useMemo(
    () =>
      [...savedConfigs].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [savedConfigs]
  );
  const visibleSavedConfigs = useMemo(
    () => (showAllSavedConfigs ? sortedSavedConfigs : sortedSavedConfigs.slice(0, 3)),
    [showAllSavedConfigs, sortedSavedConfigs]
  );

  const moronaTargets = useMemo(() => {
    if (!activeConfig) return [] as string[];
    const names = activeConfig.rows
      .filter((row) => row.targetType === "envelope" && row.enabled && row.mode !== "none")
      .map((row) => row.name)
      .filter((name) => isMoronaLikeEnvelope(name));
    return Array.from(new Set(names));
  }, [activeConfig]);

  const rebalanceBase = useMemo(() => {
    if (!activeConfig) return { debt: 0, goals: 0, morona: 0, total: 0 };
    let debt = 0;
    let goals = 0;
    let morona = 0;
    activeConfig.rows.forEach((row) => {
      if (!row.enabled || row.mode !== "fixed") return;
      const amount = Number(row.fixedAmount || 0);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const name = row.name.trim().toLowerCase();
      const isGoal =
        row.targetType === "goal" ||
        name.includes("goal") ||
        name.includes("objectif") ||
        name.includes("هدف");
      const isDebt =
        name.includes("debt") ||
        name.includes("dette") ||
        name.includes("dettes") ||
        name.includes("credit") ||
        name.includes("repayment") ||
        name.includes("loan") ||
        name.includes("دين") ||
        name.includes("ديون") ||
        name.includes("قرض");
      if (isGoal) goals += amount;
      else if (isDebt) debt += amount;
      else morona += amount;
    });
    return { debt, goals, morona, total: debt + goals + morona };
  }, [activeConfig]);

  useEffect(() => {
    if (rebalanceBase.total <= 0) {
      setCut1Pct(34);
      setCut2Pct(67);
      return;
    }
    const debtPct = (rebalanceBase.debt / rebalanceBase.total) * 100;
    const goalsPct = (rebalanceBase.goals / rebalanceBase.total) * 100;
    const c1 = Math.max(0, Math.min(100, Number(debtPct.toFixed(2))));
    const c2 = Math.max(c1, Math.min(100, Number((debtPct + goalsPct).toFixed(2))));
    setCut1Pct(c1);
    setCut2Pct(c2);
  }, [rebalanceBase.debt, rebalanceBase.goals, rebalanceBase.total]);

  const debtAmount = Number(((rebalanceBase.total * cut1Pct) / 100).toFixed(2));
  const goalsAmount = Number(
    ((rebalanceBase.total * Math.max(0, cut2Pct - cut1Pct)) / 100).toFixed(2)
  );
  const moronaAmount = Number((rebalanceBase.total - debtAmount - goalsAmount).toFixed(2));

  return (
    <div className="space-y-8 pb-10" dir={pageDir}>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <Section title={copy.configureTitle}>
        <Card className="grid gap-4 border-emerald-200 bg-gradient-to-br from-emerald-50 via-[var(--surface)] to-cyan-50 shadow-sm">
          <p className="text-sm text-[var(--muted)]">{copy.configureBody}</p>
          <div className="flex items-center gap-2">
            <Button onClick={() => { setSelectedConfig(null); setOpen(true); }}>{copy.configure}</Button>
            <Badge tone="success">
              {locale === "ar" ? "الخطوة الأولى" : locale === "fr" ? "Première étape" : "First step"}
            </Badge>
          </div>
        </Card>
      </Section>

      <Section title={copy.statusTitle}>
        <Card className="grid gap-4 border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-cyan-50 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {locale === "ar" ? "حالة الأوتوماتيزاصيون" : locale === "fr" ? "État d’automatisation" : "Automation status"}
            </p>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                autoSweepEnabled
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                  : "border-amber-300 bg-amber-100 text-amber-800"
              }`}
            >
              {autoSweepEnabled ? copy.autoSweepOn : copy.autoSweepOff}
            </span>
          </div>

          <div className="rounded-2xl border border-emerald-300 bg-white/80 px-4 py-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              {locale === "ar" ? "الكونفيك النشيطة" : locale === "fr" ? "Configuration active" : "Active configuration"}
            </p>
            <p className="mt-2 text-base font-black text-emerald-950 break-words">
              {activeConfig ? activeConfig.name : copy.noActiveConfig}
            </p>
          </div>
        </Card>
      </Section>

      <Section title={copy.savedTitle}>
        <Card className="grid gap-4 border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading...</p>
          ) : savedConfigs.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{copy.noSaved}</p>
          ) : (
            <div className="grid gap-3">
              {visibleSavedConfigs.map((config) => {
                const isActive = config.id === activeConfigId;
                return (
                  <div
                    key={config.id}
                    className={`rounded-3xl border p-4 shadow-sm transition ${
                      isActive
                        ? "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-cyan-50"
                        : "border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[var(--ink)]">{config.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {copy.updatedAt}: {new Date(config.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge tone={isActive ? "success" : "muted"}>
                        {isActive ? copy.active : copy.inactive}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <Button size="sm" variant="secondary" onClick={() => { setSelectedConfig(config); setOpen(true); }}>
                        {copy.edit}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => requestConfirm("activate", config)}
                        disabled={isActive || activatingConfigId === config.id}
                      >
                        {activatingConfigId === config.id ? copy.activating : copy.activate}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => requestConfirm("delete", config)}
                        disabled={deletingConfigId === config.id}
                      >
                        {copy.delete}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {sortedSavedConfigs.length > 3 ? (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4"
                    onClick={() => setShowAllSavedConfigs((prev) => !prev)}
                  >
                    {showAllSavedConfigs
                      ? locale === "ar"
                        ? "عرض أقل"
                        : locale === "fr"
                        ? "Voir moins"
                        : "Show less"
                      : locale === "ar"
                      ? `عرض الكل (${sortedSavedConfigs.length})`
                      : locale === "fr"
                      ? `Voir tout (${sortedSavedConfigs.length})`
                      : `Show all (${sortedSavedConfigs.length})`}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </Section>

      <details>
        <summary className="cursor-pointer rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--surface)] to-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-[var(--ink)] shadow-sm">
          {copy.advancedTitle}
        </summary>
        <div className="mt-4 space-y-6">
          <Section title={copy.moronaTitle}>
            <Card className="grid gap-3 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-[var(--surface)] shadow-sm">
              <Badge tone={moronaTargets.length > 0 ? "success" : "warning"}>
                {locale === "ar" ? "الأظرفة المستهدفة" : locale === "fr" ? "Enveloppes cibles" : "Target envelopes"}: {moronaTargets.length}
              </Badge>
              <div className="flex flex-wrap gap-2">
                {moronaTargets.map((name) => (
                  <span key={name} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--ink)]">
                    {localizeEnvelopeLabel(name, locale)}
                  </span>
                ))}
              </div>
            </Card>
          </Section>

          <Section
            title={locale === "ar" ? "رݣلة الديون/الأهداف/المرونة" : locale === "fr" ? "Réglette dettes/objectifs/morona" : "Debt/goals/morona slider"}
          >
            <Card className="grid gap-3 border-amber-200 bg-gradient-to-br from-amber-50 via-[var(--surface)] to-orange-50 shadow-sm">
              <p className="text-xs text-[var(--muted)]">
                {locale === "ar"
                  ? "هاد المجموع غير ديال: الديون + الأهداف + المرونة (ماشي الاحتياط)."
                  : locale === "fr"
                  ? "Ce total couvre seulement dettes + objectifs + morona (hors réserve)."
                  : "This total includes only debt + goals + morona (reserve excluded)."}
              </p>
              <Badge tone="warning">{rebalanceBase.total.toFixed(2)}</Badge>
              <div className="flex h-3 overflow-hidden rounded-full border border-[#e5e7eb]">
                <div className="bg-[#ef4444]" style={{ width: `${cut1Pct}%` }} />
                <div className="bg-[#6366f1]" style={{ width: `${Math.max(0, cut2Pct - cut1Pct)}%` }} />
                <div className="bg-[#22c55e]" style={{ width: `${Math.max(0, 100 - cut2Pct)}%` }} />
              </div>
              <div className="grid gap-2">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>{locale === "ar" ? "الحد بين الديون والأهداف" : locale === "fr" ? "Limite dettes/objectifs" : "Debt/goals boundary"}</span>
                    <span>{cut1Pct.toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cut1Pct}
                    onChange={(event) => {
                      const next = Math.max(0, Math.min(100, Number(event.target.value) || 0));
                      setCut1Pct(next);
                      if (next > cut2Pct) setCut2Pct(next);
                    }}
                    className="w-full accent-[#ef4444]"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>{locale === "ar" ? "الحد بين الأهداف والمرونة" : locale === "fr" ? "Limite objectifs/morona" : "Goals/morona boundary"}</span>
                    <span>{cut2Pct.toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cut2Pct}
                    onChange={(event) => {
                      const next = Math.max(0, Math.min(100, Number(event.target.value) || 0));
                      setCut2Pct(next);
                      if (next < cut1Pct) setCut1Pct(next);
                    }}
                    className="w-full accent-[#6366f1]"
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 shadow-sm">
                  <p className="text-xs text-[#991b1b]">{locale === "ar" ? "الديون" : "Debt"}</p>
                  <p className="text-sm font-semibold text-[#7f1d1d]">{debtAmount.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-[#c7d2fe] bg-[#eef2ff] px-3 py-2 shadow-sm">
                  <p className="text-xs text-[#3730a3]">{locale === "ar" ? "الهدف" : "Goals"}</p>
                  <p className="text-sm font-semibold text-[#312e81]">{goalsAmount.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 shadow-sm">
                  <p className="text-xs text-[#166534]">{locale === "ar" ? "المرونة" : "Morona"}</p>
                  <p className="text-sm font-semibold text-[#14532d]">{moronaAmount.toFixed(2)}</p>
                </div>
              </div>
            </Card>
          </Section>

          <Section title={copy.toolsTitle}>
            <Card className="grid gap-3 sm:grid-cols-2">
              <Button asChild variant="secondary"><Link href="/categories">{copy.categories}</Link></Button>
              <Button asChild variant="secondary"><Link href="/planner">{copy.planner}</Link></Button>
              <Button asChild variant="secondary"><Link href="/sweeps">{copy.sweeps}</Link></Button>
              <Button asChild variant="secondary"><Link href="/rules">{copy.rules}</Link></Button>
            </Card>
          </Section>
        </div>
      </details>

      <DistributionConfigDialog
        open={open}
        onOpenChange={setOpen}
        initialConfig={selectedConfig}
        onSaveNamedConfig={handleSaveNamedConfig}
        includeGoals={false}
        showRolloverControls={false}
        hideFixedSelectionStep={true}
        rebalanceConfig={{
          totalPool: rebalanceBase.total,
          debtAmount: rebalanceBase.debt,
          goalsAmount: rebalanceBase.goals,
          flexAmount: rebalanceBase.morona,
        }}
        onApplyRebalance={(next) => {
          if (rebalanceBase.total <= 0) return;
          const debtPct = (Math.max(0, next.debtAmount) / rebalanceBase.total) * 100;
          const goalsPct = (Math.max(0, next.goalsAmount) / rebalanceBase.total) * 100;
          const c1 = Math.max(0, Math.min(100, Number(debtPct.toFixed(2))));
          const c2 = Math.max(c1, Math.min(100, Number((debtPct + goalsPct).toFixed(2))));
          setCut1Pct(c1);
          setCut2Pct(c2);
        }}
        onSetActiveConfig={(id) => {
          setActiveConfigId(id);
          void loadData();
        }}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="popup-confirm max-w-md border-emerald-200 bg-gradient-to-br from-white via-[var(--surface)] to-emerald-50 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{copy.confirmTitle}</DialogTitle>
            <DialogDescription>
              {confirmAction === "delete" ? copy.confirmDeleteBody : copy.confirmActivateBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {copy.cancel}
            </Button>
            <Button
              variant={confirmAction === "delete" ? "danger" : "primary"}
              onClick={() => void handleConfirm()}
            >
              {copy.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .popup-confirm[data-state="open"] {
          animation: popupConfirmIn 360ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform, opacity, filter;
        }
        .popup-confirm[data-state="closed"] {
          animation: popupConfirmOut 220ms cubic-bezier(0.4, 0, 1, 1);
          will-change: transform, opacity, filter;
        }
        @keyframes popupConfirmIn {
          0% {
            opacity: 0;
            transform: translateY(24px) scale(0.94) rotateX(-6deg);
            filter: blur(4px);
          }
          60% {
            opacity: 1;
            transform: translateY(-2px) scale(1.01) rotateX(0deg);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotateX(0deg);
            filter: blur(0);
          }
        }
        @keyframes popupConfirmOut {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
            filter: blur(3px);
          }
        }
      `}</style>
    </div>
  );
}
