"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useAppLocale } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import type {
  DistributionApplyOut,
  DistributionConfigIn,
  DistributionConfigOut,
  DistributionSimulateOut,
} from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Separator } from "@/components/ui/Separator";
import { Switch } from "@/components/ui/Switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { normalizePercentRows } from "@/components/distribution/PercentNormalizer";
import { isFixedMode, isPercentMode } from "@/lib/distribution";

type Mode = "none" | "fixed" | "percent" | "fixed_per_period" | "percent_of_income";
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

type DistributionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const parseNum = (value?: string) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const formatMoney = (value?: string | number) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
};

const percentTone = (total: number) => {
  if (total === 100) return "success";
  if (total > 100) return "error";
  return "warning";
};

const DISTRIBUTION_DIALOG_COPY: Record<FloussyLocale, Record<string, string>> = {
  fr: {
    applied: "Répartition appliquée",
    distributed: "distribué",
    applyError: "Erreur d'application",
    simulateError: "Erreur de simulation",
    configure: "Configurer la répartition",
    autoOnIncome: "Auto sur revenus",
    adjustTo100: "Ajuster à 100%",
    loading: "Chargement...",
    envelopes: "Enveloppes",
    goals: "Goals",
    noRows: "Aucune ligne.",
    name: "Nom",
    mode: "Mode",
    value: "Valeur",
    priority: "Priorité",
  },
  en: {
    applied: "Distribution applied",
    distributed: "distributed",
    applyError: "Apply error",
    simulateError: "Simulation error",
    configure: "Configure distribution",
    autoOnIncome: "Auto on income",
    adjustTo100: "Adjust to 100%",
    loading: "Loading...",
    envelopes: "Envelopes",
    goals: "Goals",
    noRows: "No rows.",
    name: "Name",
    mode: "Mode",
    value: "Value",
    priority: "Priority",
  },
  ar: {
    applied: "تطبقات إعادة التوزيع",
    distributed: "توزعات",
    applyError: "وقع مشكل فالتطبيق",
    simulateError: "وقع مشكل فالمحاكاة",
    configure: "ضبط التوزيع",
    autoOnIncome: "تلقائي مع الدخل",
    adjustTo100: "صلّحها حتى 100%",
    loading: "كيتحمّل...",
    envelopes: "الأظرفة",
    goals: "الأهداف",
    noRows: "ما كاين حتى سطر.",
    name: "الاسم",
    mode: "الطريقة",
    value: "القيمة",
    priority: "الأولوية",
  },
};

export function DistributionDialog({ open, onOpenChange }: DistributionDialogProps) {
  const { locale, dir } = useAppLocale();
  const copy = DISTRIBUTION_DIALOG_COPY[locale];
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [activeTab, setActiveTab] = useState<TargetType>("envelope");

  const [simulateIncome, setSimulateIncome] = useState("");
  const [useCashAvailable, setUseCashAvailable] = useState(true);
  const [simulation, setSimulation] = useState<DistributionSimulateOut | null>(null);

  const [baseline, setBaseline] = useState<DistributionConfigOut | null>(null);

  const percentTotal = useMemo(() => {
    return rows
      .filter((row) => isPercentMode(row.mode))
      .reduce((sum, row) => sum + parseNum(row.percent), 0);
  }, [rows]);

  const rowsForTab = rows.filter((row) => row.targetType === activeTab);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const config = await apiFetch<DistributionConfigOut>("/distribution/config");
      setBaseline(config);
      setAutoEnabled(config.auto_enabled);
      const nextRows: Row[] = [
        ...config.envelopes.map((item): Row => ({
          targetType: "envelope",
          targetId: item.target_id,
          name: item.name,
          mode: item.mode,
          enabled: item.mode !== "none",
          fixedAmount: item.fixed_amount ?? "",
          fixedPriority: item.fixed_priority ?? 1,
          percent: item.percent ?? "",
        })),
        ...config.goals.map((item): Row => ({
          targetType: "goal",
          targetId: item.target_id,
          name: item.name,
          mode: item.mode,
          enabled: item.mode !== "none",
          fixedAmount: item.fixed_amount ?? "",
          fixedPriority: item.fixed_priority ?? 1,
          percent: item.percent ?? "",
        })),
      ];
      setRows(nextRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadConfig();
      setSimulation(null);
      setApiError(null);
    }
  }, [open]);

  const resetDraft = () => {
    if (!baseline) return;
    setAutoEnabled(baseline.auto_enabled);
    const nextRows: Row[] = [
      ...baseline.envelopes.map((item): Row => ({
        targetType: "envelope",
        targetId: item.target_id,
        name: item.name,
        mode: item.mode,
        enabled: item.mode !== "none",
        fixedAmount: item.fixed_amount ?? "",
        fixedPriority: item.fixed_priority ?? 1,
        percent: item.percent ?? "",
      })),
      ...baseline.goals.map((item): Row => ({
        targetType: "goal",
        targetId: item.target_id,
        name: item.name,
        mode: item.mode,
        enabled: item.mode !== "none",
        fixedAmount: item.fixed_amount ?? "",
        fixedPriority: item.fixed_priority ?? 1,
        percent: item.percent ?? "",
      })),
    ];
    setRows(nextRows);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetDraft();
      setSimulation(null);
      setSimulateIncome("");
      setUseCashAvailable(true);
      setApiError(null);
    }
    onOpenChange(nextOpen);
  };

  const updateRow = (targetType: TargetType, targetId: string, updates: Partial<Row>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.targetType === targetType && row.targetId === targetId
          ? { ...row, ...updates }
          : row
      )
    );
  };

  const changeMode = (row: Row, mode: Mode) => {
    if (mode === "none") {
      updateRow(row.targetType, row.targetId, { mode, enabled: false });
    } else {
      updateRow(row.targetType, row.targetId, { mode, enabled: true });
    }
  };

  const normalizePercent = () => {
    setRows((prev) => normalizePercentRows(prev));
  };

  const buildPayload = (): DistributionConfigIn | null => {
    const errors: string[] = [];

    const toItem = (row: Row) => {
      const payload: DistributionConfigIn["envelopes"][number] = {
        target_id: row.targetId,
        mode: isFixedMode(row.mode) ? "fixed" : isPercentMode(row.mode) ? "percent" : "none",
        enabled: row.mode !== "none",
      };
      if (isFixedMode(row.mode)) {
        if (!row.fixedAmount || parseNum(row.fixedAmount) <= 0) {
          errors.push(`${row.name}: montant fixe requis`);
        }
        if (row.fixedPriority === undefined || row.fixedPriority === null) {
          errors.push(`${row.name}: priorite requise`);
        }
        payload.fixed_amount = row.fixedAmount ?? "0";
        payload.fixed_priority = row.fixedPriority ?? 1;
      }
      if (isPercentMode(row.mode)) {
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
    const goals = rows.filter((row) => row.targetType === "goal").map(toItem);

    if (percentTotal > 100) {
      errors.push("Le total des % depasse 100");
    }

    if (errors.length > 0) {
      setApiError(errors[0]);
      return null;
    }

    return { auto_enabled: autoEnabled, envelopes, goals };
  };

  const saveConfig = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    setApiError(null);
    try {
      const updated = await apiFetch<DistributionConfigOut>("/distribution/config", {
        method: "PUT",
        body: payload,
      });
      setBaseline(updated);
      toast({
        title: "Configuration enregistree",
        description: "La repartition a ete mise a jour.",
        variant: "success",
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const applyDistribution = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setApplying(true);
    setApiError(null);
    try {
      const updated = await apiFetch<DistributionConfigOut>("/distribution/config", {
        method: "PUT",
        body: payload,
      });
      setBaseline(updated);
      const result = await apiFetch<DistributionApplyOut>("/distribution/apply", {
        method: "POST",
        body: {
          income_amount: simulateIncome || undefined,
          use_cash_available: useCashAvailable,
        },
      });
      toast({
        title: copy.applied,
        description: `${formatMoney(result.total_distributed)} ${copy.distributed}`,
        variant: "success",
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : copy.applyError);
    } finally {
      setApplying(false);
    }
  };

  const simulate = async () => {
    setSimulating(true);
    setApiError(null);
    try {
      const result = await apiFetch<DistributionSimulateOut>("/distribution/simulate", {
        method: "POST",
        body: {
          income_amount: simulateIncome || undefined,
          use_cash_available: useCashAvailable,
        },
      });
      setSimulation(result);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : copy.simulateError);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl" dir={dir}>
        <DialogHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle>{copy.configure}</DialogTitle>
            <div className="flex items-center gap-2">
              <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
              <span className="text-sm font-medium">{copy.autoOnIncome}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={percentTone(percentTotal)}>
              Total %: {percentTotal.toFixed(2)}%
            </Badge>
            {percentTotal !== 100 ? (
              <Button size="sm" variant="secondary" onClick={normalizePercent}>
                {copy.adjustTo100}
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-[var(--muted)]">{copy.loading}</p>
        ) : error ? (
          <Alert tone="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TargetType)}>
              <TabsList className="mt-4">
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
                          variant={row.mode === "none" ? "primary" : "secondary"}
                          onClick={() => changeMode(row, "none")}
                        >
                          Aucun
                        </Button>
                        <Button
                          size="sm"
                          variant={isFixedMode(row.mode) ? "primary" : "secondary"}
                          onClick={() => changeMode(row, "fixed")}
                        >
                          Fixe
                        </Button>
                        <Button
                          size="sm"
                          variant={isPercentMode(row.mode) ? "primary" : "secondary"}
                          onClick={() => changeMode(row, "percent")}
                        >
                          %
                        </Button>
                      </div>
                      <Input
                        value={isFixedMode(row.mode) ? row.fixedAmount ?? "" : row.percent ?? ""}
                        onChange={(event) =>
                          isFixedMode(row.mode)
                            ? updateRow(row.targetType, row.targetId, {
                                  fixedAmount: event.target.value,
                                })
                            : updateRow(row.targetType, row.targetId, {
                                  percent: event.target.value,
                                })
                        }
                        disabled={row.mode === "none"}
                        placeholder={isFixedMode(row.mode) ? "Montant" : "Pourcentage"}
                      />
                      {isFixedMode(row.mode) ? (
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
        )}

        <Separator className="my-4" />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold">Simulation</p>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={useCashAvailable}
                onCheckedChange={(checked) => setUseCashAvailable(Boolean(checked))}
              />
              <span className="text-xs text-[var(--muted)]">
                Utiliser cash disponible
              </span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <Label className="text-xs">
              Revenu (optionnel)
              <Input
                value={simulateIncome}
                onChange={(event) => setSimulateIncome(event.target.value)}
                placeholder="0.00"
              />
            </Label>
            <Button size="sm" onClick={simulate} isLoading={simulating}>
              Simuler
            </Button>
          </div>

          {simulation ? (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-[var(--muted)]">
                Cash avant: {formatMoney(simulation.cash_before)} · Cash apres:{" "}
                {formatMoney(simulation.cash_after)}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold">Fixe</p>
                {simulation.items.filter((item) => isFixedMode(item.mode)).length > 0 ? (
                  simulation.items
                    .filter((item) => isFixedMode(item.mode))
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
                  <p className="text-xs text-[var(--muted)]">Aucun transfert fixe.</p>
                )}
                <p className="text-xs text-[var(--muted)]">
                  Reste cash apres fixes: {formatMoney(simulation.remaining_after_fixed)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold">%</p>
                {simulation.items.filter((item) => isPercentMode(item.mode)).length > 0 ? (
                  simulation.items
                    .filter((item) => isPercentMode(item.mode))
                    .map((item) => (
                      <div
                        key={`${item.target_type}-${item.target_id}-percent`}
                        className="flex items-center justify-between rounded-2xl bg-[var(--surface-2)] px-3 py-2 text-xs"
                      >
                        <span>{item.name}</span>
                        <span>{formatMoney(item.amount)}</span>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-[var(--muted)]">Aucun transfert %.</p>
                )}
                <p className="text-xs text-[var(--muted)]">
                  Reste cash apres %: {formatMoney(simulation.remaining_after_percent)}
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
          ) : null}
        </div>

        {apiError ? (
          <Alert tone="error">
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter className="sticky bottom-0 mt-6 bg-[var(--surface)] pt-4">
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="secondary" onClick={saveConfig} isLoading={saving}>
            Enregistrer
          </Button>
          <Button onClick={applyDistribution} isLoading={applying}>
            Enregistrer & Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
