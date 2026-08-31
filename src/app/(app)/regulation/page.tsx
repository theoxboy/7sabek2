"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Cairo } from "next/font/google";
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Wand2,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import type {
  CategoryEnvelopeMapOut,
  CategoryOut,
  EnvelopeOut,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";
import {
  getCanonicalCategoryKey,
  isInternalIncomeCategory,
  isSystemExpenseCategory,
  localizeCategoryName,
} from "@/lib/categoryCatalog";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import { useForceArabicDocumentFont } from "@/lib/appLocale";
import { PageTour } from "@/components/tour/GlobalTour";
import { TourIntroDialog } from "@/components/tour/TourIntroDialog";
import { usePageTour } from "@/components/tour/usePageTour";

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const REGULATION_ARABIC_BODY_CLASS = "regulation-page-ar-body";
const REGULATION_INTRO_SEEN_KEY = "floussy.regulation.intro.seen";

const readRegulationIntroSeen = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(REGULATION_INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

const writeRegulationIntroSeen = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REGULATION_INTRO_SEEN_KEY, "1");
  } catch {
    // Ignore storage write failures.
  }
};
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
});

const REGULATION_COPY: Record<
  FloussyLocale,
  {
    remainingToLink: (count: number) => string;
    toastLinkedTitle: string;
    toastLinkedDescription: string;
    unknownError: string;
    allGoodTitle: string;
    allGoodDescription: string;
    backToDashboard: string;
    anomalyDetected: string;
    unmappedCategories: string;
    whyAsk: string;
    whyAskBody: string;
    heroTitle: string;
    heroDescription: string;
    statCategories: string;
    statRemaining: string;
    statProgress: string;
    fixUnmappedTitle: string;
    chooseMatchingEnvelope: string;
    selectEnvelope: string;
    progressTitle: string;
    progressRemaining: (count: number) => string;
    autoMap: string;
    blockingTitle: string;
    blockingDescription: string;
    restoredImmediately: string;
    validateCorrection: string;
    manageEnvelopes: string;
  }
> = {
  fr: {
    remainingToLink: (count) => `Il reste ${count} catégorie(s) à relier.`,
    toastLinkedTitle: "Catégories reliées",
    toastLinkedDescription: "Tout est prêt. Tu peux continuer.",
    unknownError: "Unknown error",
    allGoodTitle: "Tout est en ordre",
    allGoodDescription: "Aucune anomalie détectée pour ton compte.",
    backToDashboard: "Retour au dashboard",
    anomalyDetected: "Anomalie détectée",
    unmappedCategories: "Catégories non reliées",
    whyAsk: "Pourquoi on te demande ça ?",
    whyAskBody:
      "Relier les catégories permet de classer chaque dépense dans la bonne enveloppe. Sans ça, tes rapports deviennent incomplets.",
    heroTitle: "Tout est prêt, il reste une étape",
    heroDescription:
      "Relie tes catégories aux enveloppes pour garder un budget propre et lisible.",
    statCategories: "Catégories à relier",
    statRemaining: "Restantes",
    statProgress: "Progression",
    fixUnmappedTitle: "Corrige les catégories non reliées",
    chooseMatchingEnvelope: "Choisis l’enveloppe qui correspond.",
    selectEnvelope: "Sélectionner une enveloppe",
    progressTitle: "Progression",
    progressRemaining: (count) => `${count} restante(s)`,
    autoMap: "Mapper automatiquement",
    blockingTitle: "Bloquant",
    blockingDescription: "Tant que ce n’est pas corrigé, le dashboard reste bloqué.",
    restoredImmediately: "Une fois validé, l’accès sera rétabli immédiatement.",
    validateCorrection: "Valider la correction",
    manageEnvelopes: "Gérer les enveloppes",
  },
  en: {
    remainingToLink: (count) => `${count} category(ies) still need to be linked.`,
    toastLinkedTitle: "Categories linked",
    toastLinkedDescription: "Everything is ready. You can continue.",
    unknownError: "Unknown error",
    allGoodTitle: "Everything is in order",
    allGoodDescription: "No anomaly was detected for your account.",
    backToDashboard: "Back to dashboard",
    anomalyDetected: "Anomaly detected",
    unmappedCategories: "Unmapped categories",
    whyAsk: "Why are we asking for this?",
    whyAskBody:
      "Linking categories ensures every expense goes to the right envelope. Without that, your reports remain incomplete.",
    heroTitle: "Everything is ready, one step remains",
    heroDescription:
      "Link your categories to envelopes to keep your budget clean and readable.",
    statCategories: "Categories to link",
    statRemaining: "Remaining",
    statProgress: "Progress",
    fixUnmappedTitle: "Fix unmapped categories",
    chooseMatchingEnvelope: "Choose the matching envelope.",
    selectEnvelope: "Select an envelope",
    progressTitle: "Progress",
    progressRemaining: (count) => `${count} remaining`,
    autoMap: "Auto-map",
    blockingTitle: "Blocking",
    blockingDescription: "Until this is fixed, the dashboard stays locked.",
    restoredImmediately: "Once validated, access will be restored immediately.",
    validateCorrection: "Confirm fix",
    manageEnvelopes: "Manage envelopes",
  },
  ar: {
    remainingToLink: (count) => `باقي ${count} صنف خاصو يتربط.`,
    toastLinkedTitle: "تربطو الأصناف",
    toastLinkedDescription: "كلشي واجد. تقدر تكمل.",
    unknownError: "وقع مشكل غير معروف",
    allGoodTitle: "كلشي منظم",
    allGoodDescription: "ما لقينا حتى مشكل فالحساب ديالك.",
    backToDashboard: "رجع للوحة القيادة",
    anomalyDetected: "لقينا مشكل",
    unmappedCategories: "أصناف ما مربوطاش",
    whyAsk: "علاش كنطلبو منك هاد الشي؟",
    whyAskBody:
      "ربط الأصناف كيساعد كل مصروف يمشي للظرف المناسب. بلا هاد الشي، التقارير ديالك كيبقاو ناقصين.",
    heroTitle: "كلشي واجد، وباقية غير خطوة وحدة",
    heroDescription:
      "ربط الأصناف ديالك مع الأظرفة باش يبقى budget منظم وواضح.",
    statCategories: "الأصناف اللي خاصها الربط",
    statRemaining: "الباقي",
    statProgress: "التقدم",
    fixUnmappedTitle: "صحح الأصناف اللي ما مربوطاش",
    chooseMatchingEnvelope: "اختار الظرف اللي كيناسب هاد الصنف.",
    selectEnvelope: "اختار ظرف",
    progressTitle: "التقدم",
    progressRemaining: (count) => `${count} باقي`,
    autoMap: "ربط تلقائي",
    blockingTitle: "هادشي ضروري",
    blockingDescription: "حتى تصححو، dashboard غيبقى مسدود.",
    restoredImmediately: "منين تأكد، الولوج غيرجع ليك مباشرة.",
    validateCorrection: "أكد التصحيح",
    manageEnvelopes: "تدبير الأظرفة",
  },
};

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const suggestEnvelope = (category: string, envelopes: EnvelopeOut[]) => {
  const categoryKey = getCanonicalCategoryKey(category);
  const normalizedCategory = normalizeName(categoryKey);
  if (!normalizedCategory) return null;
  const categoryHints: Record<string, string[]> = {
    rent: ["loyer", "rent", "كراء", "housing", "logement"],
    groceries: ["course", "food", "nourriture", "ماكلة"],
    restaurants: ["restaurant", "مطاعم"],
    electricity: ["electric", "كهرباء", "ضو"],
    water: ["water", "eau", "ماء", "ما"],
    internet: ["internet", "wifi", "نت"],
    phone: ["phone", "telephone", "تلفون"],
    transport_public: ["transport", "public", "bus", "metro", "عمومي"],
    transport_taxi: ["taxi", "vtc", "خاص"],
    transport_fuel: ["carburant", "fuel", "essence", "وقود"],
    transport_maintenance: ["entretien", "maintenance", "صيانة"],
    car_insurance: ["assurance", "insurance", "تأمين"],
    debt_payment: ["debt", "dette", "credit", "دين"],
    debt_extra_payment: ["debt", "dette", "credit", "دين"],
    health_generic: ["sante", "health", "صحة"],
    health_pharmacy: ["pharmacie", "pharmacy", "صيدلية"],
  };
  const hints = categoryHints[normalizedCategory] ?? [];
  let best: { env: EnvelopeOut; score: number } | null = null;
  for (const env of envelopes) {
    const normalizedEnv = normalizeName(env.name);
    const localizedEnvBundle = normalizeName(
      `${localizeEnvelopeLabel(env.name, "fr")} ${localizeEnvelopeLabel(
        env.name,
        "en"
      )} ${localizeEnvelopeLabel(env.name, "ar")}`
    );
    if (!normalizedEnv) continue;
    let score = 0;
    if (normalizedEnv === normalizedCategory || localizedEnvBundle.includes(normalizedCategory)) score = 4;
    else if (normalizedEnv.includes(normalizedCategory)) score = 3;
    else if (normalizedCategory.includes(normalizedEnv)) score = 2;
    else {
      const catParts = new Set(normalizedCategory.split(" "));
      const envParts = normalizedEnv.split(" ");
      const shared = envParts.filter((part) => catParts.has(part)).length;
      score = shared > 0 ? 1 + shared / 10 : 0;
    }
    if (
      hints.some(
        (hint) =>
          normalizedEnv.includes(normalizeName(hint)) ||
          localizedEnvBundle.includes(normalizeName(hint))
      )
    ) {
      score += 2;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { env, score };
    }
  }
  return best?.env ?? null;
};

export default function RegulationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [manualUnmappedCategoryIds, setManualUnmappedCategoryIds] = useState<
    Set<string>
  >(new Set());
  const [envelopes, setEnvelopes] = useState<EnvelopeOut[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [introSeen, setIntroSeen] = useState<boolean>(() => readRegulationIntroSeen());
  const listCardRef = useRef<HTMLDivElement | null>(null);
  const actionsCardRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const copy = REGULATION_COPY[locale];
  const pageDir = getLocaleDirection(locale);
  const isArabic = locale === "ar";
  useForceArabicDocumentFont(isArabic, REGULATION_ARABIC_BODY_CLASS);

  const handleIntroChange = (next: boolean) => {
    setIntroOpen(next);
    if (!next) {
      setIntroSeen(true);
      writeRegulationIntroSeen();
    }
  };

  const handleStartTour = () => {
    handleIntroChange(false);
    setIntroSeen(true);
    writeRegulationIntroSeen();
    startTour();
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/categories/self-heal", { method: "POST" });
      const [cats, envs, mappingList, manualUnmapped] = await Promise.all([
        apiFetch<CategoryOut[]>("/categories"),
        apiFetch<EnvelopeOut[]>("/envelopes"),
        apiFetch<CategoryEnvelopeMapOut[]>("/mappings"),
        apiFetch<CategoryOut[]>("/categories/unmapped-manual"),
      ]);

      const mappingMap = mappingList.reduce<Record<string, string>>(
        (acc, item) => ({
          ...acc,
          [item.category_id]: item.envelope_id,
        }),
        {}
      );

      setCategories(cats);
      setEnvelopes(envs);
      setMappings(mappingMap);
      setManualUnmappedCategoryIds(new Set(manualUnmapped.map((cat) => cat.id)));
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setIntroOpen(!introSeen);
  }, [introSeen]);

  useEffect(() => {
    const syncLocale = () => {
      setLocale(getBrowserLocalePreference() ?? "fr");
    };
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  const mappableEnvelopes = useMemo(
    () => envelopes.filter((env) => !env.is_cash && !env.is_default_savings && !env.is_goal),
    [envelopes]
  );

  const unmappedCategories = useMemo(
    () =>
      categories.filter(
        (cat) =>
          !mappings[cat.id] &&
          manualUnmappedCategoryIds.has(cat.id) &&
          !isInternalIncomeCategory(cat.name) &&
          !isSystemExpenseCategory(cat.name)
      ),
    [categories, mappings, manualUnmappedCategoryIds]
  );

  useEffect(() => {
    setSelection((prev) => {
      const next: Record<string, string> = {};
      for (const cat of unmappedCategories) {
        next[cat.id] = prev[cat.id] ?? "";
      }
      return next;
    });
  }, [unmappedCategories]);

  const remaining = useMemo(
    () => unmappedCategories.filter((cat) => !selection[cat.id]).length,
    [unmappedCategories, selection]
  );

  const progress = useMemo(() => {
    if (unmappedCategories.length === 0) return 100;
    return Math.round(
      ((unmappedCategories.length - remaining) / unmappedCategories.length) * 100
    );
  }, [unmappedCategories.length, remaining]);

  const { tour, intro: tourIntro } = usePageTour(
    "regulation",
    {
      list: { ref: listCardRef },
      actions: { ref: actionsCardRef },
      validate: { ref: footerRef },
    },
    { autoStart: false }
  );
  const { startTour } = tour;

  const handleAutoMap = () => {
    setSelection((prev) => {
      const next = { ...prev };
      for (const cat of unmappedCategories) {
        if (next[cat.id]) continue;
        const suggested = suggestEnvelope(cat.name, mappableEnvelopes);
        if (suggested) next[cat.id] = suggested.id;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (remaining > 0) {
      setError(copy.remainingToLink(remaining));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        unmappedCategories
          .map((cat) => ({ categoryId: cat.id, envelopeId: selection[cat.id] }))
          .filter((item) => item.envelopeId)
          .map((item) =>
            apiFetch(`/categories/${item.categoryId}/envelope`, {
              method: "PUT",
              body: { envelope_id: item.envelopeId },
            })
          )
      );
      await loadData();
      toast({
        title: copy.toastLinkedTitle,
        description: copy.toastLinkedDescription,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`${cairo.variable} space-y-6 ${isArabic ? "regulation-arabic-font" : ""}`}
        dir={pageDir}
        style={{ fontFamily: 'var(--font-cairo), "Cairo", sans-serif' }}
      >
        <TourIntroDialog
          open={introOpen}
          onOpenChange={handleIntroChange}
          onStart={handleStartTour}
          content={tourIntro}
        />
        <div className="rounded-[32px] border border-white/70 bg-[var(--surface)]/80 px-6 py-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.7)] backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 animate-pulse rounded-2xl bg-emerald-100" />
            <div className="space-y-2">
              <div className="h-4 w-44 rounded-full bg-slate-200" />
              <div className="h-3 w-64 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-64 rounded-[28px] bg-[var(--surface)]/70" />
          <div className="h-64 rounded-[28px] bg-[var(--surface)]/70" />
        </div>
      </div>
    );
  }

  if (unmappedCategories.length === 0) {
    return (
      <div
        className={`${cairo.variable} space-y-6 ${isArabic ? "regulation-arabic-font" : ""}`}
        dir={pageDir}
        style={{ fontFamily: 'var(--font-cairo), "Cairo", sans-serif' }}
      >
        <TourIntroDialog
          open={introOpen}
          onOpenChange={handleIntroChange}
          onStart={handleStartTour}
          content={tourIntro}
        />
        <div className="rounded-[32px] border border-emerald-100 bg-[var(--surface)]/80 px-6 py-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.7)] backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold text-[var(--ink)]">
                  {copy.allGoodTitle}
                </h1>
                <p className="text-sm text-[var(--muted)]">
                  {copy.allGoodDescription}
                </p>
              </div>
            </div>
            <Button onClick={() => router.push("/dashboard")}>
              {copy.backToDashboard}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${cairo.variable} relative space-y-8 pb-28 ${isArabic ? "regulation-arabic-font" : ""}`}
      dir={pageDir}
      style={{ fontFamily: 'var(--font-cairo), "Cairo", sans-serif' }}
    >
      <TourIntroDialog
        open={introOpen}
        onOpenChange={handleIntroChange}
        onStart={handleStartTour}
        content={tourIntro}
      />
      <PageTour tour={tour} />
      <div className="pointer-events-none absolute -right-20 -top-12 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-32 h-56 w-56 rounded-full bg-orange-200/40 blur-3xl" />

      <div className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] px-6 py-8 text-[var(--ink)] shadow-[var(--shadow-soft)] dark:border-white/10 dark:bg-gradient-to-br dark:from-[#0f172a] dark:via-[#111827] dark:to-[#0f172a] dark:text-white">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning" className="bg-amber-400/20 text-amber-800 dark:text-amber-100">
            {copy.anomalyDetected}
          </Badge>
          <Badge tone="muted" className="bg-[var(--surface-2)] text-[var(--ink)] dark:bg-[var(--surface)]/10 dark:text-white">
            {copy.unmappedCategories}
          </Badge>
          <div className="group relative ml-auto text-xs text-[var(--muted)] dark:text-white/70">
            <span className="cursor-help underline decoration-dotted underline-offset-4">
              {copy.whyAsk}
            </span>
            <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--ink)] shadow-xl opacity-0 transition group-hover:opacity-100 dark:border-white/10 dark:bg-slate-900">
              {copy.whyAskBody}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-[var(--ink)] dark:text-white">
              {copy.heroTitle}
            </h1>
            <p className="text-sm text-[var(--muted)] dark:text-white/70">
              {copy.heroDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 dark:border-white/10 dark:bg-[var(--surface)]/10">
              <p className="text-xs text-[var(--muted)] dark:text-white/60">{copy.statCategories}</p>
              <p className="text-lg font-semibold text-[var(--ink)] dark:text-white">
                {unmappedCategories.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 dark:border-white/10 dark:bg-[var(--surface)]/10">
              <p className="text-xs text-[var(--muted)] dark:text-white/60">{copy.statRemaining}</p>
              <p className="text-lg font-semibold text-[var(--ink)] dark:text-white">{remaining}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 dark:border-white/10 dark:bg-[var(--surface)]/10">
              <p className="text-xs text-[var(--muted)] dark:text-white/60">{copy.statProgress}</p>
              <p className="text-lg font-semibold text-[var(--ink)] dark:text-white">{progress}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div ref={listCardRef}>
          <Card className="space-y-4 rounded-[28px] border border-white/70 bg-[var(--surface)]/85 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              {copy.fixUnmappedTitle}
            </div>
            <div className="grid gap-3">
              {unmappedCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-[var(--surface)] px-4 py-3"
                >
                  <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: selection[cat.id] ? "100%" : "0%",
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">
                        {localizeCategoryName(cat.name, locale)}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {copy.chooseMatchingEnvelope}
                      </p>
                    </div>
                    <select
                      value={selection[cat.id] ?? ""}
                      onChange={(event) =>
                        setSelection((prev) => ({
                          ...prev,
                          [cat.id]: event.target.value,
                        }))
                      }
                      className="h-10 min-w-[220px] rounded-xl border border-slate-200 bg-[var(--surface)] px-3 text-sm text-[var(--ink)]"
                    >
                      <option value="">{copy.selectEnvelope}</option>
                      {mappableEnvelopes.map((env) => (
                        <option key={env.id} value={env.id}>
                          {localizeEnvelopeLabel(env.name, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <div ref={actionsCardRef}>
            <Card className="space-y-4 rounded-[28px] border border-white/70 bg-[var(--surface)]/85 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {copy.progressTitle}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {copy.progressRemaining(remaining)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAutoMap}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    {copy.autoMap}
                  </Button>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </Card>
          </div>

          <Card className="space-y-3 rounded-[28px] border border-amber-200 bg-amber-50/80 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              {copy.blockingTitle}
            </div>
            <p className="text-xs text-amber-900/80">
              {copy.blockingDescription}
            </p>
          </Card>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div
        ref={footerRef}
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/70 bg-[var(--surface)]/80 backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/envelopes")}
            >
              {copy.manageEnvelopes}
            </Button>
            <span>{copy.restoredImmediately}</span>
          </div>
          <Button onClick={handleSave} isLoading={saving}>
            {copy.validateCorrection}
          </Button>
        </div>
      </div>
    </div>
  );
}
