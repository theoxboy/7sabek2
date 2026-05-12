"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import { getOnboardingAnswerList } from "@/lib/onboardingV2Compat";
import type {
  OnboardingV2AdminRecordListOut,
  OnboardingV2AdminRecordOut,
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type LabelMap = Record<string, string>;
type JsonRecord = Record<string, unknown>;
type FieldRow = { label: string; value: string; technicalPath?: string; mediaUrl?: string };
type FieldGroup = { title: string; rows: FieldRow[] };

const INCOME_TYPE_LABELS: LabelMap = {
  salaried: "Salarié",
  hirafi: "Artisan / journalier",
  freelancer: "Freelance",
  mixed: "Mixte",
};

const OBJECTIVE_LABELS: LabelMap = {
  spending_control: "Contrôle des dépenses",
  savings: "Épargne",
  debt: "Remboursement des dettes",
  goals: "Objectifs financiers",
  all: "Tous les objectifs",
};

const HOUSEHOLD_LABELS: LabelMap = {
  single: "Personne seule",
  couple: "Couple",
  family_kids: "Famille avec enfants",
  extended_family: "Famille élargie / colocation",
};

const HOUSING_STATUS_LABELS: LabelMap = {
  rent: "Locataire",
  owner_loan: "Propriétaire (avec crédit)",
  owner_no_loan: "Propriétaire (sans crédit)",
  with_family: "Chez la famille",
};

const TRANSPORT_MODE_LABELS: LabelMap = {
  public: "Transport public",
  car: "Voiture",
  motorbike: "Moto",
  mixed: "Mixte",
};

const STAGE_LABELS: LabelMap = {
  completed: "Terminé",
  draft: "Brouillon",
};

const FLOW_LABELS: LabelMap = {
  v2: "Onboarding v2",
};

const YES_NO_LABELS: LabelMap = {
  yes: "Oui",
  no: "Non",
};

const ANSWER_KEY_LABELS: LabelMap = {
  Q0_income_type: "Type de revenu",
  Q0b_primary_objective: "Objectif principal",
  F1_objectives_v1: "Objectifs onboarding v2",
  E0_household_type: "Situation du foyer",
  E3_housing_status: "Statut logement",
  E4_transport_mode: "Mode de transport",
  E5_has_debt: "Dettes déclarées",
  G0_has_goal: "Objectif financier déclaré",
  M3_min_income: "Revenu minimum mensuel",
};

const ANSWER_VALUE_LABELS: Record<string, LabelMap> = {
  Q0_income_type: INCOME_TYPE_LABELS,
  Q0b_primary_objective: OBJECTIVE_LABELS,
  F1_objectives_v1: OBJECTIVE_LABELS,
  E0_household_type: HOUSEHOLD_LABELS,
  E3_housing_status: HOUSING_STATUS_LABELS,
  E4_transport_mode: TRANSPORT_MODE_LABELS,
  E5_has_debt: YES_NO_LABELS,
  G0_has_goal: YES_NO_LABELS,
};

const HIGHLIGHT_ANSWER_KEYS = [
  "Q0_income_type",
  "F1_objectives_v1",
  "E0_household_type",
  "E3_housing_status",
  "E4_transport_mode",
  "E5_has_debt",
  "G0_has_goal",
  "M3_min_income",
] as const;

const LONG_STRING_PREVIEW_LIMIT = 180;

const toHumanCode = (value?: string | null) => {
  if (!value) return "Non renseigné";
  const normalized = value.trim();
  if (!normalized) return "Non renseigné";
  const withSpaces = normalized
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

const getImageSource = (raw: string, technicalKey?: string): string | null => {
  const value = raw.trim();
  if (!value) return null;

  const key = (technicalKey ?? "").toLowerCase();
  const looksLikeProfilePhotoField =
    key.includes("profile_photo_url") || key.endsWith("photo_url");
  const isImageDataUrl = value.startsWith("data:image/");
  const isHttpUrl = /^https?:\/\//i.test(value);
  const hasImageExtension = /\.(png|jpe?g|webp|gif|bmp|svg)(?:[?#].*)?$/i.test(value);

  if (isImageDataUrl) return value;
  if (isHttpUrl && (looksLikeProfilePhotoField || hasImageExtension)) return value;

  return null;
};

const formatStringPreview = (raw: string, technicalKey?: string) => {
  const value = raw.trim();
  if (!value) return "—";

  const imageSource = getImageSource(value, technicalKey);

  if (imageSource) {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return `Photo de profil disponible (${value.length} caractères)`;
    }
    return `Photo de profil intégrée (${value.length} caractères)`;
  }

  if (value.length > LONG_STRING_PREVIEW_LIMIT) {
    return `${value.slice(0, 90)}…${value.slice(-30)} (${value.length} caractères)`;
  }

  return value;
};

const resolveLabel = (value: string | null | undefined, labels?: LabelMap) => {
  if (!value) return "Non renseigné";
  const normalized = value.trim();
  if (!normalized) return "Non renseigné";
  if (labels && labels[normalized]) return labels[normalized];
  return toHumanCode(normalized);
};

const asRecord = (value: unknown): JsonRecord => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
};

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

const readStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => readString(item))
      .filter((item): item is string => Boolean(item));
  }
  const single = readString(value);
  return single ? [single] : [];
};

const formatAnswerValue = (key: string, value: unknown): string => {
  const labels = ANSWER_VALUE_LABELS[key];
  const stringList = readStringList(value);
  if (stringList.length > 0) {
    return stringList.map((item) => {
      if (labels) return resolveLabel(item, labels);
      const looksLikeEnumCode = /^[a-z0-9_]+$/i.test(item) && item.length <= 64;
      if (looksLikeEnumCode) return toHumanCode(item);
      return formatStringPreview(item, key);
    }).join(" · ");
  }

  if (typeof value === "number") {
    return value.toLocaleString("fr-FR");
  }

  if (typeof value === "boolean") {
    return value ? "Oui" : "Non";
  }

  if (value && typeof value === "object") {
    const entries = Object.keys(asRecord(value)).length;
    return `${entries} entrée(s)`;
  }

  return "Non renseigné";
};

const extractAnswers = (record: OnboardingV2AdminRecordOut): JsonRecord => {
  const payload = asRecord(record.payload);
  return asRecord(payload.answers);
};

const extractDraftObjects = (record: OnboardingV2AdminRecordOut): JsonRecord => {
  const payload = asRecord(record.payload);
  return asRecord(payload.draft_objects);
};

const collectObjectives = (record: OnboardingV2AdminRecordOut, answers: JsonRecord): string[] => {
  const fromAnswers = getOnboardingAnswerList(
    answers as Record<string, string | string[] | Record<string, unknown> | Array<Record<string, unknown>>>,
    "Q0b_primary_objective"
  );
  const fromRecord = readStringList(record.primary_objective);
  const merged = [...fromAnswers, ...fromRecord];
  return Array.from(new Set(merged));
};

const formatGenericValue = (value: unknown, technicalKey?: string): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return formatStringPreview(value, technicalKey);
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("fr-FR") : String(value);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return JSON.stringify(value);
};

const buildAnswerGroups = (answers: JsonRecord): FieldGroup[] => {
  const rows = Object.entries(answers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const singleString = readString(value);
      return {
        label: ANSWER_KEY_LABELS[key] ?? toHumanCode(key),
        value: formatAnswerValue(key, value),
        technicalPath: key,
        mediaUrl: singleString ? getImageSource(singleString, key) ?? undefined : undefined,
      };
    });

  if (rows.length === 0) return [];
  return [{ title: "Réponses capturées", rows }];
};

const toReadableSegment = (segment: string): string => {
  if (segment.startsWith("#")) {
    return `Élément ${segment.slice(1)}`;
  }
  return toHumanCode(segment);
};

const collectDraftRows = (
  value: unknown,
  segments: string[],
  rows: FieldRow[],
) => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      rows.push({
        label: segments.slice(1).map(toReadableSegment).join(" > ") || "Valeur",
        value: "Liste vide",
        technicalPath: segments.join("."),
      });
      return;
    }
    value.forEach((item, index) => {
      collectDraftRows(item, [...segments, `#${index + 1}`], rows);
    });
    return;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(asRecord(value));
    if (entries.length === 0) {
      rows.push({
        label: segments.slice(1).map(toReadableSegment).join(" > ") || "Valeur",
        value: "Objet vide",
        technicalPath: segments.join("."),
      });
      return;
    }
    entries.forEach(([key, child]) => {
      collectDraftRows(child, [...segments, key], rows);
    });
    return;
  }

  rows.push({
    label: segments.slice(1).map(toReadableSegment).join(" > ") || "Valeur",
    value: formatGenericValue(value, segments.join(".")),
    technicalPath: segments.join("."),
    mediaUrl: typeof value === "string" ? getImageSource(value, segments.join(".")) ?? undefined : undefined,
  });
};

const buildDraftGroups = (draftObjects: JsonRecord): FieldGroup[] => {
  return Object.entries(draftObjects)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([rootKey, rootValue]) => {
      const rows: FieldRow[] = [];
      collectDraftRows(rootValue, [rootKey], rows);
      return {
        title: toHumanCode(rootKey),
        rows,
      };
    })
    .filter((group) => group.rows.length > 0);
};

function StructuredDataSection({
  title,
  groups,
  emptyMessage,
}: {
  title: string;
  groups: FieldGroup[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-[#f5f5f7] p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </p>
      {groups.length === 0 ? (
        <p className="text-xs text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-auto pr-1">
          {groups.map((group) => (
            <div key={group.title} className="rounded-lg border border-gray-100 bg-[var(--surface)] p-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {group.title}
              </p>
              <div className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-[var(--surface)]">
                {group.rows.map((row, index) => (
                  <div
                    key={`${group.title}-${row.technicalPath ?? row.label}-${index}`}
                    className="grid gap-1 px-2.5 py-2 md:grid-cols-[minmax(160px,230px)_1fr] md:gap-3"
                  >
                    <div>
                      <p className="text-[11px] text-gray-600">{row.label}</p>
                      {row.technicalPath ? (
                        <p className="text-[10px] text-gray-400">{row.technicalPath}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <p className="break-words text-xs font-medium text-gray-900">{row.value}</p>
                      {row.mediaUrl ? (
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={row.mediaUrl}
                            alt={row.label}
                            className="h-14 w-14 rounded-lg border border-gray-200 object-cover bg-[var(--surface)]"
                            loading="lazy"
                          />
                          <a
                            href={row.mediaUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-[11px] font-medium text-blue-600 underline underline-offset-2"
                          >
                            Ouvrir la photo
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SuperAdminOnboardingRecordsPage() {
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "superadmin-onboarding-records-ar-body");
  const [records, setRecords] = useState<OnboardingV2AdminRecordOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatIsoDateTime = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  };

  const loadRecords = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await apiFetch<OnboardingV2AdminRecordListOut>(
        "/users/admin/onboarding-v2-records?limit=500",
        { headers: { "x-admin-bypass": "true" } }
      );
      setRecords(response.items);
      setExpandedId((current) =>
        current && response.items.some((item) => item.id === current) ? current : null
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les enregistrements onboarding."
      );
      setRecords([]);
      setExpandedId(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      await loadRecords(false);
    };
    void run();
    const interval = window.setInterval(() => {
      if (!active) return;
      void loadRecords(true);
    }, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return records;

    return records.filter((item) => {
      const fullName = [item.user_first_name, item.user_last_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const readableIncome = resolveLabel(item.income_type, INCOME_TYPE_LABELS).toLowerCase();
      const readableObjective = resolveLabel(item.primary_objective, OBJECTIVE_LABELS).toLowerCase();
      const readableHousehold = resolveLabel(item.household_type, HOUSEHOLD_LABELS).toLowerCase();

      return (
        (item.user_email ?? "").toLowerCase().includes(needle) ||
        fullName.includes(needle) ||
        (item.income_type ?? "").toLowerCase().includes(needle) ||
        (item.primary_objective ?? "").toLowerCase().includes(needle) ||
        (item.household_type ?? "").toLowerCase().includes(needle) ||
        readableIncome.includes(needle) ||
        readableObjective.includes(needle) ||
        readableHousehold.includes(needle)
      );
    });
  }, [records, search]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-12 pt-8 text-[var(--ink)]" dir={dir}>
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

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Onboarding clients</h1>
        <p className="text-sm text-gray-500">
          Vue lisible des données onboarding v2 par client.
        </p>
      </div>

      <Card className="spike-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="spike-title">Tableau des enregistrements</p>
            <p className="spike-subtitle">{filteredRecords.length} enregistrement(s)</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-72">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Recherche email / nom / revenu / objectif..."
                className="pl-8"
              />
            </div>
            <Button type="button" variant="secondary" onClick={() => void loadRecords(false)} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}
        {loading ? <p className="mt-3 text-xs text-gray-500">Chargement…</p> : null}
        {!loading && filteredRecords.length === 0 ? (
          <p className="mt-3 text-xs text-gray-500">Aucune donnée onboarding enregistrée.</p>
        ) : null}

        {!loading && filteredRecords.length > 0 ? (
          <div className="mt-4 space-y-3">
            {filteredRecords.map((record) => {
              const isExpanded = expandedId === record.id;
              const answers = extractAnswers(record);
              const draftObjects = extractDraftObjects(record);
              const objectives = collectObjectives(record, answers);

              const userLabel =
                [record.user_first_name, record.user_last_name].filter(Boolean).join(" ") ||
                record.user_email ||
                "Utilisateur";

              const incomeLabel = resolveLabel(record.income_type, INCOME_TYPE_LABELS);
              const householdLabel = resolveLabel(record.household_type, HOUSEHOLD_LABELS);
              const objectivesLabel =
                objectives.length > 0
                  ? objectives
                      .map((item) => resolveLabel(item, OBJECTIVE_LABELS))
                      .join(" · ")
                  : "Non renseigné";
              const housingLabel = resolveLabel(readString(answers.E3_housing_status), HOUSING_STATUS_LABELS);
              const transportLabel = resolveLabel(readString(answers.E4_transport_mode), TRANSPORT_MODE_LABELS);
              const debtLabel = resolveLabel(readString(answers.E5_has_debt), YES_NO_LABELS);
              const goalLabel = resolveLabel(readString(answers.G0_has_goal), YES_NO_LABELS);
              const flowLabel = resolveLabel(record.flow_version, FLOW_LABELS);
              const stageLabel = resolveLabel(record.stage, STAGE_LABELS);

              const answerCount = Object.keys(answers).length;
              const draftCount = Object.keys(draftObjects).length;
              const answerGroups = buildAnswerGroups(answers);
              const draftGroups = buildDraftGroups(draftObjects);

              const highlights = HIGHLIGHT_ANSWER_KEYS.map((key) => {
                const value = formatAnswerValue(key, answers[key]);
                return {
                  key,
                  label: ANSWER_KEY_LABELS[key] ?? toHumanCode(key),
                  value,
                };
              }).filter((item) => item.value !== "Non renseigné");

              return (
                <div
                  key={record.id}
                  className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-4 text-xs shadow-[0_8px_18px_-16px_rgba(0,0,0,0.55)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">{userLabel}</p>
                      <p className="text-xs text-gray-600">{record.user_email ?? "—"}</p>
                      <p className="text-xs text-gray-500">
                        Enregistré le <strong>{formatIsoDateTime(record.created_at)}</strong>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="accent">{incomeLabel}</Badge>
                      <Badge tone="muted">{householdLabel}</Badge>
                      <Badge tone="default">{stageLabel}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Profil onboarding
                      </p>
                      <dl className="mt-2 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-gray-500">Type de revenu</dt>
                          <dd className="text-right font-medium text-gray-900">{incomeLabel}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-gray-500">Objectif(s)</dt>
                          <dd className="text-right font-medium text-gray-900">{objectivesLabel}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-gray-500">Foyer</dt>
                          <dd className="text-right font-medium text-gray-900">{householdLabel}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-gray-500">Flow</dt>
                          <dd className="text-right font-medium text-gray-900">{flowLabel}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Contexte client
                      </p>
                      <dl className="mt-2 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-gray-500">Logement</dt>
                          <dd className="text-right font-medium text-gray-900">{housingLabel}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-gray-500">Transport</dt>
                          <dd className="text-right font-medium text-gray-900">{transportLabel}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-gray-500">Dettes</dt>
                          <dd className="text-right font-medium text-gray-900">{debtLabel}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-gray-500">Objectif financier</dt>
                          <dd className="text-right font-medium text-gray-900">{goalLabel}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="default">Réponses: {answerCount}</Badge>
                      <Badge tone="default">Objets brouillon: {draftCount}</Badge>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setExpandedId((current) => (current === record.id ? null : record.id))}
                    >
                      {isExpanded ? "Masquer détails" : "Voir détails"}
                    </Button>
                  </div>

                  {isExpanded ? (
                    <div className="mt-3 space-y-3">
                      {highlights.length > 0 ? (
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Points clés capturés
                          </p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {highlights.map((item) => (
                              <div key={item.key} className="rounded-lg border border-gray-100 bg-[var(--surface)] px-2.5 py-2">
                                <p className="text-[11px] text-gray-500">{item.label}</p>
                                <p className="mt-0.5 text-xs font-medium text-gray-900">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-3 lg:grid-cols-2">
                        <StructuredDataSection
                          title="Réponses (answers)"
                          groups={answerGroups}
                          emptyMessage="Aucune réponse enregistrée."
                        />
                        <StructuredDataSection
                          title="Brouillon (draft_objects)"
                          groups={draftGroups}
                          emptyMessage="Aucun brouillon enregistré."
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
