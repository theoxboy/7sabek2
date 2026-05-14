"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useAppLocale } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import type {
  DistributionApplyOut,
  DistributionConfigIn,
  DistributionConfigOut,
  DistributionSimulateOut,
} from "@/lib/types";
import {
  activateDistributionConfig,
  deleteDistributionConfig,
  getSettings,
  listSavedDistributionConfigs,
  patchSettings,
  type DistributionSavedConfig,
  type DistributionSettings,
} from "@/lib/distribution";
import { normalizePercentRows } from "@/components/distribution/PercentNormalizer";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Separator } from "@/components/ui/Separator";
import { Switch } from "@/components/ui/Switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Trash2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Mode = "none" | "fixed" | "percent";
type TargetType = "envelope" | "goal";

type Row = {
  targetType: TargetType;
  targetId: string;
  name: string;
  mode: Mode;
  enabled: boolean;
  fixedAmount?: string;
  fixedPriority?: number;
  percent?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parseNum = (value?: string) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const formatMoney = (value?: string | number) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
};

const percentTone = (total: number) => {
  if (total === 100) return "success" as const;
  if (total > 100) return "error" as const;
  return "warning" as const;
};

// ---------------------------------------------------------------------------
// Copy / i18n
// ---------------------------------------------------------------------------

const COPY: Record<FloussyLocale, Record<string, string>> = {
  fr: {
    pageTitle: "Paramètres de distribution",
    pageSubtitle:
      "Modifie les règles de répartition sans refaire tout le wizard.",
    activeConfigTitle: "Configuration active",
    activeConfigNone: "Aucune config active.",
    activeConfigSource: "Source",
    activeConfigCreated: "Créée le",
    activeConfigRows: "Règles",
    rulesTitle: "Éditeur de règles",
    rulesSubtitle:
      "Ajuste les montants fixes et les pourcentages pour chaque enveloppe.",
    envelopes: "Enveloppes",
    goals: "Goals",
    noRows: "Aucune ligne.",
    name: "Nom",
    mode: "Mode",
    value: "Valeur",
    priority: "Priorité",
    modeNone: "Aucun",
    modeFixed: "Fixe",
    modePercent: "%",
    adjustTo100: "Ajuster à 100%",
    save: "Sauvegarder",
    saving: "Sauvegarde...",
    saved: "Configuration enregistrée",
    savedDesc: "La répartition a été mise à jour.",
    simulationTitle: "Simulation",
    simulationSubtitle: "Prévisualise la répartition avant d'appliquer.",
    incomeLabel: "Revenu (optionnel)",
    useCash: "Utiliser cash disponible",
    simulate: "Simuler",
    simulating: "Simulation...",
    apply: "Appliquer",
    applying: "Application...",
    applied: "Répartition appliquée",
    distributed: "distribué",
    cashBefore: "Cash avant",
    cashAfter: "Cash après",
    fixedLabel: "Fixe",
    percentLabel: "%",
    noFixed: "Aucun transfert fixe.",
    noPercent: "Aucun transfert %.",
    remainAfterFixed: "Reste cash après fixes",
    remainAfterPercent: "Reste cash après %",
    settingsTitle: "Paramètres globaux",
    settingsSubtitle: "Automatisations et configs sauvegardées.",
    autoDistribution: "Auto-distribution sur revenus",
    autoSweep: "Auto-sweep activé",
    savedConfigs: "Configurations sauvegardées",
    noSavedConfigs: "Aucune config sauvegardée.",
    activate: "Activer",
    active: "Active",
    delete: "Supprimer",
    confirmDelete: "Supprimer cette configuration ?",
    loadError: "Erreur de chargement",
    saveError: "Erreur de sauvegarde",
    applyError: "Erreur d'application",
    simulateError: "Erreur de simulation",
  },
  en: {
    pageTitle: "Distribution settings",
    pageSubtitle: "Edit distribution rules without the full wizard.",
    activeConfigTitle: "Active configuration",
    activeConfigNone: "No active config.",
    activeConfigSource: "Source",
    activeConfigCreated: "Created",
    activeConfigRows: "Rules",
    rulesTitle: "Rules editor",
    rulesSubtitle:
      "Adjust fixed amounts and percentages for each envelope.",
    envelopes: "Envelopes",
    goals: "Goals",
    noRows: "No rows.",
    name: "Name",
    mode: "Mode",
    value: "Value",
    priority: "Priority",
    modeNone: "None",
    modeFixed: "Fixed",
    modePercent: "%",
    adjustTo100: "Adjust to 100%",
    save: "Save",
    saving: "Saving...",
    saved: "Configuration saved",
    savedDesc: "Distribution has been updated.",
    simulationTitle: "Simulation",
    simulationSubtitle: "Preview distribution before applying.",
    incomeLabel: "Income (optional)",
    useCash: "Use available cash",
    simulate: "Simulate",
    simulating: "Simulating...",
    apply: "Apply",
    applying: "Applying...",
    applied: "Distribution applied",
    distributed: "distributed",
    cashBefore: "Cash before",
    cashAfter: "Cash after",
    fixedLabel: "Fixed",
    percentLabel: "%",
    noFixed: "No fixed transfers.",
    noPercent: "No percent transfers.",
    remainAfterFixed: "Remaining cash after fixed",
    remainAfterPercent: "Remaining cash after %",
    settingsTitle: "Global settings",
    settingsSubtitle: "Automations and saved configurations.",
    autoDistribution: "Auto-distribution on income",
    autoSweep: "Auto-sweep enabled",
    savedConfigs: "Saved configurations",
    noSavedConfigs: "No saved configurations.",
    activate: "Activate",
    active: "Active",
    delete: "Delete",
    confirmDelete: "Delete this configuration?",
    loadError: "Load error",
    saveError: "Save error",
    applyError: "Apply error",
    simulateError: "Simulation error",
  },
  ar: {
    pageTitle: "إعدادات التوزيع",
    pageSubtitle: "عدّل قواعد التوزيع بلا ما تعاود الإعداد الكامل.",
    activeConfigTitle: "الإعداد النشط",
    activeConfigNone: "ما كاين حتى إعداد نشط.",
    activeConfigSource: "المصدر",
    activeConfigCreated: "تاريخ الإنشاء",
    activeConfigRows: "القواعد",
    rulesTitle: "محرر القواعد",
    rulesSubtitle: "عدّل المبالغ الثابتة والنسب ديال كل ظرف.",
    envelopes: "الأظرفة",
    goals: "الأهداف",
    noRows: "ما كاين حتى سطر.",
    name: "الاسم",
    mode: "الطريقة",
    value: "القيمة",
    priority: "الأولوية",
    modeNone: "بلا",
    modeFixed: "ثابت",
    modePercent: "%",
    adjustTo100: "صلّحها حتى 100%",
    save: "حفظ",
    saving: "كيتحفظ...",
    saved: "تحفظ الإعداد",
    savedDesc: "التوزيع تحدّث.",
    simulationTitle: "المحاكاة",
    simulationSubtitle: "شوف التوزيع قبل ما تطبّقو.",
    incomeLabel: "الدخل (اختياري)",
    useCash: "استعمل الكاش المتاح",
    simulate: "محاكاة",
    simulating: "كتمشي المحاكاة...",
    apply: "طبّق",
    applying: "كيتطبّق...",
    applied: "تطبّق التوزيع",
    distributed: "توزّعات",
    cashBefore: "الكاش قبل",
    cashAfter: "الكاش بعد",
    fixedLabel: "ثابت",
    percentLabel: "%",
    noFixed: "ما كاين حتى تحويل ثابت.",
    noPercent: "ما كاين حتى تحويل %.",
    remainAfterFixed: "الباقي بعد الثوابت",
    remainAfterPercent: "الباقي بعد %",
    settingsTitle: "إعدادات عامة",
    settingsSubtitle: "الأتمتة والإعدادات المحفوظة.",
    autoDistribution: "توزيع تلقائي مع الدخل",
    autoSweep: "المسح التلقائي مفعّل",
    savedConfigs: "الإعدادات المحفوظة",
    noSavedConfigs: "ما كاين حتى إعداد محفوظ.",
    activate: "فعّل",
    active: "نشط",
    delete: "حذف",
    confirmDelete: "بغيتي تحذف هاد الإعداد؟",
    loadError: "خطأ فالتحميل",
    saveError: "خطأ فالحفظ",
    applyError: "خطأ فالتطبيق",
    simulateError: "خطأ فالمحاكاة",
  },
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DistributionSettingsPage() {
  const { locale, dir } = useAppLocale();
  const copy = COPY[locale];
  const { toast } = useToast();

  // ── loading / error ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── config editor state ──
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [activeTab, setActiveTab] = useState<TargetType>("envelope");
  const [saving, setSaving] = useState(false);

  // ── simulation state ──
  const [simulateIncome, setSimulateIncome] = useState("");
  const [useCashAvailable, setUseCashAvailable] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [simulation, setSimulation] = useState<DistributionSimulateOut | null>(
    null
  );

  // ── global settings state ──
  const [settings, setSettings] = useState<DistributionSettings | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<DistributionSavedConfig[]>(
    []
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── derived ──
  const percentTotal = useMemo(
    () =>
      rows
        .filter((row) => row.mode === "percent")
        .reduce((sum, row) => sum + parseNum(row.percent), 0),
    [rows]
  );
  const rowsForTab = rows.filter((row) => row.targetType === activeTab);

  const activeConfig = useMemo(
    () => savedConfigs.find((c) => c.is_active) ?? null,
    [savedConfigs]
  );

  // ── helpers ──
  const buildRowsFromConfig = (config: DistributionConfigOut): Row[] => [
    ...config.envelopes.map(
      (item): Row => ({
        targetType: "envelope",
        targetId: item.target_id,
        name: item.name,
        mode: item.mode,
        enabled: item.mode !== "none",
        fixedAmount: item.fixed_amount ?? "",
        fixedPriority: item.fixed_priority ?? 1,
        percent: item.percent ?? "",
      })
    ),
    ...config.goals.map(
      (item): Row => ({
        targetType: "goal",
        targetId: item.target_id,
        name: item.name,
        mode: item.mode,
        enabled: item.mode !== "none",
        fixedAmount: item.fixed_amount ?? "",
        fixedPriority: item.fixed_priority ?? 1,
        percent: item.percent ?? "",
      })
    ),
  ];

  // ── load everything on mount ──
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [config, userSettings, configs] = await Promise.all([
        apiFetch<DistributionConfigOut>("/distribution/config"),
        getSettings(),
        listSavedDistributionConfigs(),
      ]);
      setAutoEnabled(config.auto_enabled);
      setRows(buildRowsFromConfig(config));
      setSettings(userSettings);
      setSavedConfigs(configs);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ── row mutations ──
  const updateRow = (
    targetType: TargetType,
    targetId: string,
    updates: Partial<Row>
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.targetType === targetType && row.targetId === targetId
          ? { ...row, ...updates }
          : row
      )
    );
  };

  const changeMode = (row: Row, mode: Mode) => {
    updateRow(row.targetType, row.targetId, {
      mode,
      enabled: mode !== "none",
    });
  };

  const normalizePercent = () => {
    setRows((prev) => normalizePercentRows(prev));
  };

  // ── build payload ──
  const buildPayload = (): DistributionConfigIn | null => {
    const errors: string[] = [];
    const toItem = (row: Row) => {
      const payload: DistributionConfigIn["envelopes"][number] = {
        target_id: row.targetId,
        mode: row.mode,
        enabled: row.mode !== "none",
      };
      if (row.mode === "fixed") {
        if (!row.fixedAmount || parseNum(row.fixedAmount) <= 0) {
          errors.push(`${row.name}: montant fixe requis`);
        }
        payload.fixed_amount = row.fixedAmount ?? "0";
        payload.fixed_priority = row.fixedPriority ?? 1;
      }
      if (row.mode === "percent") {
        if (!row.percent || parseNum(row.percent) <= 0) {
          errors.push(`${row.name}: pourcentage requis`);
        }
        payload.percent = row.percent ?? "0";
      }
      return payload;
    };
    const envelopes = rows
      .filter((row) => row.targetType === "envelope")
      .map(toItem);
    const goals = rows
      .filter((row) => row.targetType === "goal")
      .map(toItem);
    if (percentTotal > 100) {
      errors.push("Le total des % dépasse 100");
    }
    if (errors.length > 0) {
      setApiError(errors[0]);
      return null;
    }
    return { auto_enabled: autoEnabled, envelopes, goals };
  };

  // ── save config ──
  const saveConfig = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    setApiError(null);
    try {
      const updated = await apiFetch<DistributionConfigOut>(
        "/distribution/config",
        { method: "PUT", body: payload }
      );
      setRows(buildRowsFromConfig(updated));
      toast({
        title: copy.saved,
        description: copy.savedDesc,
        variant: "success",
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  // ── simulate ──
  const handleSimulate = async () => {
    setSimulating(true);
    setApiError(null);
    try {
      const result = await apiFetch<DistributionSimulateOut>(
        "/distribution/simulate",
        {
          method: "POST",
          body: {
            income_amount: simulateIncome || undefined,
            use_cash_available: useCashAvailable,
          },
        }
      );
      setSimulation(result);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : copy.simulateError);
    } finally {
      setSimulating(false);
    }
  };

  // ── apply ──
  const handleApply = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setApplying(true);
    setApiError(null);
    try {
      await apiFetch<DistributionConfigOut>("/distribution/config", {
        method: "PUT",
        body: payload,
      });
      const result = await apiFetch<DistributionApplyOut>(
        "/distribution/apply",
        {
          method: "POST",
          body: {
            income_amount: simulateIncome || undefined,
            use_cash_available: useCashAvailable,
          },
        }
      );
      toast({
        title: copy.applied,
        description: `${formatMoney(result.total_distributed)} ${copy.distributed}`,
        variant: "success",
      });
      void loadAll();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : copy.applyError);
    } finally {
      setApplying(false);
    }
  };

  // ── global settings toggles ──
  const toggleAutoDistribution = async (checked: boolean) => {
    try {
      const updated = await patchSettings({
        auto_distribution_enabled: checked,
      });
      setSettings(updated);
    } catch {
      // revert
    }
  };

  const toggleAutoSweep = async (checked: boolean) => {
    try {
      const updated = await patchSettings({ auto_sweep_enabled: checked });
      setSettings(updated);
    } catch {
      // revert
    }
  };

  // ── saved configs ──
  const handleActivateConfig = async (configId: string) => {
    try {
      await activateDistributionConfig(configId);
      const configs = await listSavedDistributionConfigs();
      setSavedConfigs(configs);
      void loadAll();
    } catch {
      // ignore
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    setDeletingId(configId);
    try {
      await deleteDistributionConfig(configId);
      setSavedConfigs((prev) => prev.filter((c) => c.id !== configId));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  // ── render ──
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6" dir={dir}>
        <PageHeader title={copy.pageTitle} subtitle={copy.pageSubtitle} />
        <p className="text-sm text-[var(--muted)]">
          {locale === "ar"
            ? "كيتحمّل..."
            : locale === "fr"
            ? "Chargement..."
            : "Loading..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6" dir={dir}>
        <PageHeader title={copy.pageTitle} subtitle={copy.pageSubtitle} />
        <Alert tone="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6" dir={dir}>
      <PageHeader title={copy.pageTitle} subtitle={copy.pageSubtitle} />

      {apiError ? (
        <Alert tone="error">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      ) : null}

      {/* ── Section 1: Active Config ── */}
      <Section title={copy.activeConfigTitle}>
        {activeConfig ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="success">{copy.active}</Badge>
              <span className="font-semibold">{activeConfig.name}</span>
            </div>
            <div className="grid gap-1 text-xs text-[var(--muted)]">
              <span>
                {copy.activeConfigSource}:{" "}
                {activeConfig.source === "onboarding_initial"
                  ? "Onboarding"
                  : "Post-onboarding"}
              </span>
              <span>
                {copy.activeConfigCreated}:{" "}
                {new Date(activeConfig.created_at).toLocaleDateString(
                  locale === "ar" ? "ar-MA" : locale === "fr" ? "fr-FR" : "en-US"
                )}
              </span>
              <span>
                {copy.activeConfigRows}: {activeConfig.rows.length}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {copy.activeConfigNone}
          </p>
        )}
      </Section>

      {/* ── Section 2: Rules Editor ── */}
      <Section
        title={copy.rulesTitle}
        subtitle={copy.rulesSubtitle}
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={percentTone(percentTotal)}>
              Total %: {percentTotal.toFixed(2)}%
            </Badge>
            {percentTotal !== 100 ? (
              <Button size="sm" variant="secondary" onClick={normalizePercent}>
                {copy.adjustTo100}
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="flex items-center gap-2 mb-3">
          <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
          <span className="text-sm font-medium">{copy.autoDistribution}</span>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TargetType)}
        >
          <TabsList>
            <TabsTrigger value="envelope">{copy.envelopes}</TabsTrigger>
            <TabsTrigger value="goal">{copy.goals}</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-4 space-y-3">
            {rowsForTab.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{copy.noRows}</p>
            ) : (
              <div className="space-y-2">
                <div className="grid gap-3 rounded-2xl bg-[var(--surface-2)] px-3 py-2 text-xs font-medium md:grid-cols-[1.2fr_1fr_1fr_0.7fr]">
                  <span>{copy.name}</span>
                  <span>{copy.mode}</span>
                  <span>{copy.value}</span>
                  <span>{copy.priority}</span>
                </div>
                {rowsForTab.map((row) => (
                  <div
                    key={`${row.targetType}-${row.targetId}`}
                    className="grid items-center gap-3 rounded-2xl border border-[var(--border)] px-3 py-2 md:grid-cols-[1.2fr_1fr_1fr_0.7fr]"
                  >
                    <span className="text-sm font-medium">{row.name}</span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={
                          row.mode === "none" ? "primary" : "secondary"
                        }
                        onClick={() => changeMode(row, "none")}
                      >
                        {copy.modeNone}
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          row.mode === "fixed" ? "primary" : "secondary"
                        }
                        onClick={() => changeMode(row, "fixed")}
                      >
                        {copy.modeFixed}
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          row.mode === "percent" ? "primary" : "secondary"
                        }
                        onClick={() => changeMode(row, "percent")}
                      >
                        {copy.modePercent}
                      </Button>
                    </div>
                    <Input
                      value={
                        row.mode === "fixed"
                          ? row.fixedAmount ?? ""
                          : row.percent ?? ""
                      }
                      onChange={(event) =>
                        row.mode === "fixed"
                          ? updateRow(row.targetType, row.targetId, {
                              fixedAmount: event.target.value,
                            })
                          : updateRow(row.targetType, row.targetId, {
                              percent: event.target.value,
                            })
                      }
                      disabled={row.mode === "none"}
                      placeholder={
                        row.mode === "fixed"
                          ? locale === "ar"
                            ? "المبلغ"
                            : "Montant"
                          : locale === "ar"
                          ? "النسبة"
                          : "Pourcentage"
                      }
                    />
                    {row.mode === "fixed" ? (
                      <Input
                        type="number"
                        value={String(row.fixedPriority ?? 1)}
                        onChange={(event) =>
                          updateRow(row.targetType, row.targetId, {
                            fixedPriority: Number(event.target.value),
                          })
                        }
                        placeholder="1"
                      />
                    ) : (
                      <span className="text-xs text-[var(--muted)]">-</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex justify-end">
          <Button onClick={saveConfig} isLoading={saving}>
            {saving ? copy.saving : copy.save}
          </Button>
        </div>
      </Section>

      {/* ── Section 3: Simulation ── */}
      <Section title={copy.simulationTitle} subtitle={copy.simulationSubtitle}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={useCashAvailable}
                onCheckedChange={(checked) =>
                  setUseCashAvailable(Boolean(checked))
                }
              />
              <span className="text-xs text-[var(--muted)]">
                {copy.useCash}
              </span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            <Label className="text-xs">
              {copy.incomeLabel}
              <Input
                value={simulateIncome}
                onChange={(event) => setSimulateIncome(event.target.value)}
                placeholder="0.00"
              />
            </Label>
            <Button size="sm" onClick={handleSimulate} isLoading={simulating}>
              {simulating ? copy.simulating : copy.simulate}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleApply}
              isLoading={applying}
            >
              {applying ? copy.applying : copy.apply}
            </Button>
          </div>

          {simulation ? (
            <>
              <Separator />
              <div className="space-y-3 text-sm">
                <div className="text-xs text-[var(--muted)]">
                  {copy.cashBefore}: {formatMoney(simulation.cash_before)} ·{" "}
                  {copy.cashAfter}: {formatMoney(simulation.cash_after)}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold">{copy.fixedLabel}</p>
                  {simulation.items.filter((item) => item.mode === "fixed")
                    .length > 0 ? (
                    simulation.items
                      .filter((item) => item.mode === "fixed")
                      .map((item) => (
                        <div
                          key={`${item.target_type}-${item.target_id}-fixed`}
                          className="flex items-center justify-between rounded-2xl bg-[var(--surface-2)] px-3 py-2 text-xs"
                        >
                          <span>{item.name}</span>
                          <span>{formatMoney(item.amount)}</span>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-[var(--muted)]">
                      {copy.noFixed}
                    </p>
                  )}
                  <p className="text-xs text-[var(--muted)]">
                    {copy.remainAfterFixed}:{" "}
                    {formatMoney(simulation.remaining_after_fixed)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold">{copy.percentLabel}</p>
                  {simulation.items.filter((item) => item.mode === "percent")
                    .length > 0 ? (
                    simulation.items
                      .filter((item) => item.mode === "percent")
                      .map((item) => (
                        <div
                          key={`${item.target_type}-${item.target_id}-pct`}
                          className="flex items-center justify-between rounded-2xl bg-[var(--surface-2)] px-3 py-2 text-xs"
                        >
                          <span>{item.name}</span>
                          <span>{formatMoney(item.amount)}</span>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-[var(--muted)]">
                      {copy.noPercent}
                    </p>
                  )}
                  <p className="text-xs text-[var(--muted)]">
                    {copy.remainAfterPercent}:{" "}
                    {formatMoney(simulation.remaining_after_percent)}
                  </p>
                </div>
                {simulation.warnings.length > 0 ? (
                  <Alert tone="warning">
                    <AlertDescription>
                      {simulation.warnings.join(" · ")}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </Section>

      {/* ── Section 4: Global Settings ── */}
      <Section title={copy.settingsTitle} subtitle={copy.settingsSubtitle}>
        <div className="space-y-4">
          {settings ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.auto_distribution_enabled}
                  onCheckedChange={toggleAutoDistribution}
                />
                <span className="text-sm">{copy.autoDistribution}</span>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.auto_sweep_enabled}
                  onCheckedChange={toggleAutoSweep}
                />
                <span className="text-sm">{copy.autoSweep}</span>
              </div>
            </div>
          ) : null}

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-semibold">{copy.savedConfigs}</p>
            {savedConfigs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                {copy.noSavedConfigs}
              </p>
            ) : (
              <div className="space-y-2">
                {savedConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] px-3 py-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {config.name}
                        </span>
                        {config.is_active ? (
                          <Badge tone="success">{copy.active}</Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-[var(--muted)]">
                        {config.rows.length}{" "}
                        {locale === "ar"
                          ? "قاعدة"
                          : locale === "fr"
                          ? "règle(s)"
                          : "rule(s)"}{" "}
                        ·{" "}
                        {new Date(config.updated_at).toLocaleDateString(
                          locale === "ar"
                            ? "ar-MA"
                            : locale === "fr"
                            ? "fr-FR"
                            : "en-US"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!config.is_active ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleActivateConfig(config.id)}
                          >
                            {copy.activate}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteConfig(config.id)}
                            isLoading={deletingId === config.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
