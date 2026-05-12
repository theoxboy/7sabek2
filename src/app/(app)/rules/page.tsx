"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import {
  clearStoredMappings,
  getStoredMappings,
  setStoredMapping,
  type CategoryEnvelopeMapping,
} from "@/lib/mappings";
import type { CategoryOut, EnvelopeOut } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useToast } from "@/components/ui/Toast";

const RULES_COPY: Record<
  FloussyLocale,
  {
    unknownError: string;
    title: string;
    subtitle: string;
    loading: string;
    filters: string;
    search: string;
    unmappedOnly: string;
    actions: string;
    autoMap: string;
    clearAll: string;
    exportRules: string;
    importRules: string;
    localFallback: string;
    table: string;
    noCategories: string;
    noCategoriesDesc: string;
    routedTo: (name: string) => string;
    unmapped: string;
    mapped: string;
    optionalDeleteConfirm: string;
    saveLocal: string;
    saveRemote: string;
    clearSuccess: string;
    clearToastTitle: string;
    clearToastDesc: string;
    addEnvelopeFirst: string;
    suggestionsApplied: string;
    invalidFile: string;
    importedLocal: string;
    importedRemote: string;
  }
> = {
  fr: {
    unknownError: "Erreur inconnue",
    title: "Rules",
    subtitle: "Mappe chaque catégorie vers une enveloppe pour ranger les dépenses au bon endroit.",
    loading: "Chargement...",
    filters: "Filtres",
    search: "Chercher une catégorie",
    unmappedOnly: "Afficher seulement les non mappées",
    actions: "Actions",
    autoMap: "Suggestions auto",
    clearAll: "Vider les règles",
    exportRules: "Exporter les règles",
    importRules: "Importer les règles",
    localFallback: "Fallback local actif",
    table: "Table des règles",
    noCategories: "Aucune catégorie",
    noCategoriesDesc: "Crée des catégories avant de faire le mapping.",
    routedTo: (name) => `Reliée à ${name}`,
    unmapped: "Non mappée",
    mapped: "Mappée",
    optionalDeleteConfirm: "Vider toutes les règles ?",
    saveLocal: "Règle sauvegardée localement.",
    saveRemote: "Règle sauvegardée.",
    clearSuccess: "Toutes les règles ont été vidées.",
    clearToastTitle: "Suppression réussie",
    clearToastDesc: "Toutes les règles ont été supprimées.",
    addEnvelopeFirst: "Ajoute d'abord des enveloppes et des catégories.",
    suggestionsApplied: "Suggestions appliquées. Vérifie les lignes si nécessaire.",
    invalidFile: "Fichier de règles invalide.",
    importedLocal: "Règles importées localement.",
    importedRemote: "Règles importées.",
  },
  en: {
    unknownError: "Unknown error",
    title: "Rules",
    subtitle: "Map each category to an envelope so expenses land in the right budget.",
    loading: "Loading...",
    filters: "Filters",
    search: "Search categories",
    unmappedOnly: "Show unmapped only",
    actions: "Actions",
    autoMap: "Auto-map suggestions",
    clearAll: "Clear all rules",
    exportRules: "Export rules",
    importRules: "Import rules",
    localFallback: "Local fallback enabled",
    table: "Rules table",
    noCategories: "No categories",
    noCategoriesDesc: "Create categories first to map them.",
    routedTo: (name) => `Routed to ${name}`,
    unmapped: "Unmapped",
    mapped: "Mapped",
    optionalDeleteConfirm: "Clear all rules?",
    saveLocal: "Rule saved locally.",
    saveRemote: "Rule saved.",
    clearSuccess: "All rules cleared.",
    clearToastTitle: "Rules cleared",
    clearToastDesc: "All rules were removed.",
    addEnvelopeFirst: "Add envelopes and categories first.",
    suggestionsApplied: "Suggestions applied. Review each row if needed.",
    invalidFile: "Invalid rules file.",
    importedLocal: "Rules imported locally.",
    importedRemote: "Rules imported.",
  },
  ar: {
    unknownError: "وقع مشكل غير واضح",
    title: "الربط",
    subtitle: "ربط كل كاتيغوري بظرف باش المصروف يمشي للبلاصـة الصحيحة.",
    loading: "كيتحمّل...",
    filters: "الفيلترات",
    search: "قلّب على كاتيغوري",
    unmappedOnly: "بيّن غير اللي مازال ما مربوطاش",
    actions: "إجراءات",
    autoMap: "اقتراحات الربط",
    clearAll: "حيد جميع القواعد",
    exportRules: "صدّر القواعد",
    importRules: "دخل القواعد",
    localFallback: "الخدمة محلياً مفعّلة",
    table: "لائحة القواعد",
    noCategories: "ما كايناش كاتيغوريات",
    noCategoriesDesc: "صاوب كاتيغوريات قبل ما تبدا الربط.",
    routedTo: (name) => `مربوطة مع ${name}`,
    unmapped: "ما مربوطةش",
    mapped: "مربوطة",
    optionalDeleteConfirm: "بغيتي تمسح جميع القواعد؟",
    saveLocal: "تسجلات القاعدة محلياً.",
    saveRemote: "تسجلات القاعدة.",
    clearSuccess: "تمسحات جميع القواعد.",
    clearToastTitle: "تم المسح",
    clearToastDesc: "تم حذف جميع القواعد.",
    addEnvelopeFirst: "زيد الأظرفة والكاتيغوريات أولاً.",
    suggestionsApplied: "طبقنا الاقتراحات. راجع السطور إلا بغيتي.",
    invalidFile: "ملف القواعد ما صالحش.",
    importedLocal: "تدخلات القواعد محلياً.",
    importedRemote: "تدخلات القواعد.",
  },
};

const formatError = (error: unknown, fallback: string) => {
  if (!error) return fallback;
  if (error instanceof Error) return error.message;
  return String(error);
};

function exportRules(rules: CategoryEnvelopeMapping) {
  const blob = new Blob([JSON.stringify(rules, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "floussy-rules.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function RulesPage() {
  const { toast } = useToast();
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "rules-page-ar-body");
  const copy = RULES_COPY[locale];
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeOut[]>([]);
  const [mappings, setMappings] = useState<CategoryEnvelopeMapping>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usingLocalStorage, setUsingLocalStorage] = useState(false);
  const [search, setSearch] = useState("");
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const [cats, envs, mappingList] = await Promise.all([
        apiFetch<CategoryOut[]>("/categories"),
        apiFetch<EnvelopeOut[]>("/envelopes"),
        apiFetch<{ category_id: string; envelope_id: string }[]>("/mappings"),
      ]);
      const mappingMap = mappingList.reduce<CategoryEnvelopeMapping>(
        (acc, item) => ({ ...acc, [item.category_id]: item.envelope_id }),
        {}
      );
      setCategories(cats);
      setEnvelopes(envs);
      setMappings(mappingMap);
      setUsingLocalStorage(false);
    } catch (err) {
      setCategories([]);
      setEnvelopes([]);
      setMappings(getStoredMappings());
      setUsingLocalStorage(true);
      setError(copy.localFallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [locale]);

  const envelopeMap = useMemo(
    () => new Map(envelopes.map((env) => [env.id, env.name])),
    [envelopes]
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories
      .filter((cat) => (term ? cat.name.toLowerCase().includes(term) : true))
      .filter((cat) => (showUnmappedOnly ? !mappings[cat.id] : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, search, showUnmappedOnly, mappings]);

  const handleMappingChange = async (categoryId: string, envelopeId: string) => {
    setError(null);
    setSuccess(null);
    setSavingId(categoryId);
    const snapshot = { ...mappings };
    const next = { ...mappings };
    if (!envelopeId) delete next[categoryId];
    else next[categoryId] = envelopeId;
    setMappings(next);
    try {
      if (usingLocalStorage) {
        if (!envelopeId) {
          clearStoredMappings();
          Object.entries(next).forEach(([catId, envId]) => setStoredMapping(catId, envId));
        } else {
          setStoredMapping(categoryId, envelopeId);
        }
        setSuccess(copy.saveLocal);
      } else {
        if (!envelopeId) {
          await apiFetch(`/categories/${categoryId}/envelope`, { method: "DELETE" });
        } else {
          await apiFetch(`/categories/${categoryId}/envelope`, {
            method: "PUT",
            body: { envelope_id: envelopeId },
          });
        }
        setSuccess(copy.saveRemote);
      }
    } catch (err) {
      setMappings(snapshot);
      setError(formatError(err, copy.unknownError));
    } finally {
      setSavingId(null);
    }
  };

  const handleClearAll = async () => {
    const ok = window.confirm(copy.optionalDeleteConfirm);
    if (!ok) return;
    const snapshot = { ...mappings };
    setMappings({});
    try {
      if (usingLocalStorage) {
        clearStoredMappings();
      } else {
        await Promise.all(
          categories.map((cat) =>
            apiFetch(`/categories/${cat.id}/envelope`, { method: "DELETE" }).catch(() => null)
          )
        );
      }
      setSuccess(copy.clearSuccess);
      toast({ title: copy.clearToastTitle, description: copy.clearToastDesc, variant: "success" });
    } catch (err) {
      setMappings(snapshot);
      setError(formatError(err, copy.unknownError));
    }
  };

  const handleAutoMap = async () => {
    if (envelopes.length === 0 || categories.length === 0) {
      setError(copy.addEnvelopeFirst);
      return;
    }
    const suggestions: CategoryEnvelopeMapping = { ...mappings };
    const envelopeLookup = new Map(
      envelopes.filter((env) => !env.is_cash).map((env) => [env.name.toLowerCase(), env.id])
    );
    categories.forEach((cat) => {
      if (!suggestions[cat.id]) {
        const match = envelopeLookup.get(cat.name.toLowerCase());
        if (match) suggestions[cat.id] = match;
      }
    });
    setMappings(suggestions);
    setSuccess(copy.suggestionsApplied);
  };

  const handleImportRules = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setImporting(true);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as CategoryEnvelopeMapping;
      if (!parsed || typeof parsed !== "object") throw new Error(copy.invalidFile);
      const validCategories = new Set(categories.map((cat) => cat.id));
      const validEnvelopes = new Set(envelopes.map((env) => env.id));
      const next: CategoryEnvelopeMapping = {};
      Object.entries(parsed).forEach(([catId, envId]) => {
        if (validCategories.has(catId) && validEnvelopes.has(envId)) next[catId] = envId;
      });
      setMappings(next);
      if (usingLocalStorage) {
        clearStoredMappings();
        Object.entries(next).forEach(([catId, envId]) => setStoredMapping(catId, envId));
        setSuccess(copy.importedLocal);
      } else {
        await Promise.all(
          categories.map((cat) =>
            apiFetch(`/categories/${cat.id}/envelope`, { method: "DELETE" }).catch(() => null)
          )
        );
        await Promise.all(
          Object.entries(next).map(([catId, envId]) =>
            apiFetch(`/categories/${catId}/envelope`, {
              method: "PUT",
              body: { envelope_id: envId },
            })
          )
        );
        setSuccess(copy.importedRemote);
      }
    } catch (err) {
      setError(formatError(err, copy.unknownError));
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-8" dir={dir}>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      {loading ? <p className="text-sm text-[var(--muted)]">{copy.loading}</p> : null}
      {error ? <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p> : null}
      {success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}

      <Section title={copy.filters}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            placeholder={copy.search}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showUnmappedOnly}
              onChange={(event) => setShowUnmappedOnly(event.target.checked)}
            />
            {copy.unmappedOnly}
          </label>
        </div>
      </Section>

      <Section title={copy.actions}>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleAutoMap}>{copy.autoMap}</Button>
          <Button variant="ghost" onClick={handleClearAll}>{copy.clearAll}</Button>
          <Button variant="ghost" onClick={() => exportRules(mappings)}>{copy.exportRules}</Button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportRules}
              disabled={importing}
            />
            <Button variant="ghost" isLoading={importing}>{copy.importRules}</Button>
          </label>
          {usingLocalStorage ? <Badge tone="warning">{copy.localFallback}</Badge> : null}
        </div>
      </Section>

      <Section title={copy.table}>
        <Card>
          {rows.length === 0 ? (
            <EmptyState title={copy.noCategories} description={copy.noCategoriesDesc} />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {rows.map((cat) => {
                const mappedId = mappings[cat.id];
                const mappedName = mappedId ? envelopeMap.get(mappedId) : null;
                return (
                  <div
                    key={cat.id}
                    className="flex flex-col gap-3 py-3 text-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-[var(--ink)]">{cat.name}</p>
                      {mappedName ? (
                        <p className="text-xs text-[var(--muted)]">{copy.routedTo(mappedName)}</p>
                      ) : (
                        <p className="text-xs text-[var(--muted)]">{copy.unmapped}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={mappedId ?? ""}
                        onChange={(event) => handleMappingChange(cat.id, event.target.value)}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                        disabled={savingId === cat.id}
                      >
                        <option value="">{copy.unmapped}</option>
                        {envelopes
                          .filter((env) => !env.is_cash)
                          .map((env) => (
                            <option key={env.id} value={env.id}>
                              {env.name}
                            </option>
                          ))}
                      </select>
                      {mappedId ? <Badge tone="accent">{copy.mapped}</Badge> : <Badge tone="muted">{copy.unmapped}</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Section>
    </div>
  );
}
