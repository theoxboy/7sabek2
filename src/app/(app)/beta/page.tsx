"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BellRing } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import type { OnboardingV2RecordOut } from "@/lib/types";
import {
  buildIncomePopupPreviewCases,
  buildLiveSalaryNotification,
  extractLatestSalaryScheduleProfile,
  resolveIncomePopupPreviewModel,
  type IncomePopupPreviewCase,
  type SalaryScheduleProfile,
} from "@/lib/salaryNotifications";

const BETA_PAGES: Record<
  FloussyLocale,
  Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    status: "active";
  }>
> = {
  fr: [
    {
      id: "onboarding-v2",
      title: "Onboarding v2 (essai)",
      description: "Nouveau parcours plus rapide, orienté objectifs.",
      href: "/onboarding",
      status: "active",
    },
    {
      id: "beta-portal",
      title: "Portail d'Authentification (Biométrie & PIN)",
      description: "Portail sécurisé avec capteur d'empreinte digitale simulé et code PIN.",
      href: "/beta/portal",
      status: "active",
    },
    {
      id: "beta-notifications",
      title: "Centre de Notifications",
      description: "Flux d'activités avec filtres et simulateur interactif d'alertes.",
      href: "/notifications",
      status: "active",
    },
    {
      id: "beta-chat",
      title: "7sabek AI Smart Conseiller",
      description: "Chat d'assistance connecté à vos alertes avec suggestions proactives.",
      href: "/chat",
      status: "active",
    },
  ],
  en: [
    {
      id: "onboarding-v2",
      title: "Onboarding v2 (trial)",
      description: "New faster onboarding focused on goals.",
      href: "/onboarding",
      status: "active",
    },
    {
      id: "beta-portal",
      title: "Authentication Portal (Biometrics & PIN)",
      description: "Secure portal with simulated fingerprint sensor and PIN code entry.",
      href: "/beta/portal",
      status: "active",
    },
    {
      id: "beta-notifications",
      title: "Notification Center",
      description: "Activity feed with filters and interactive alerts simulator.",
      href: "/notifications",
      status: "active",
    },
    {
      id: "beta-chat",
      title: "7sabek AI Smart Conseiller",
      description: "AI advisor chat connected to your alerts with proactive action buttons.",
      href: "/chat",
      status: "active",
    },
  ],
  ar: [
    {
      id: "onboarding-v2",
      title: "Onboarding v2 (تجريب)",
      description: "مسار جديد أسرع ومركّز على الأهداف.",
      href: "/onboarding",
      status: "active",
    },
    {
      id: "beta-portal",
      title: "بوابة تسجيل الدخول (البصمة والرقم السري)",
      description: "بوابة آمنة مع جهاز محاكاة للبصمة والرمز السري.",
      href: "/beta/portal",
      status: "active",
    },
    {
      id: "beta-notifications",
      title: "مركز الإشعارات",
      description: "تغذية الإشعارات مع فلترة وجهاز محاكاة تفاعلي للتنبيهات.",
      href: "/notifications",
      status: "active",
    },
    {
      id: "beta-chat",
      title: "مستشار الذكاء الاصطناعي 7سابك",
      description: "محادثة ذكية متصلة بتنبيهاتك وتقترح إجراءات عملية.",
      href: "/chat",
      status: "active",
    },
  ],
};

const BETA_COPY: Record<
  FloussyLocale,
  {
    popupTitle: string;
    popupDesc: string;
    high: string;
    medium: string;
    low: string;
    resetPreview: string;
    confirmed: string;
    waiting: string;
    betaTest: string;
    back: string;
    confirmAmount: string;
    closePopup: string;
    beta: string;
    officialTesters: string;
    pageLabel: (count: number) => string;
    pageSubtitle: string;
    betaPreview: string;
    salaryNotifications: string;
    salaryPreviewTitle: string;
    salaryPreviewDesc: string;
    openPopup: string;
    openOnboarding: string;
    source: string;
    lastOnboarding: string;
    noRecord: string;
    salaryProfile: string;
    profileMissing: string;
    liveReminder: string;
    visibleToday: string;
    notTriggered: string;
    currentMode: string;
    notAvailable: string;
    loadingPreview: string;
    noOnboardingWarning: string;
    incompleteProfileWarning: string;
    liveNotification: string;
    noLiveWindow: string;
    noLiveDesc: string;
    stable: string;
    variable: string;
    viewPopup: string;
    open: string;
    active: string;
    soon: string;
  }
> = {
  fr: {
    popupTitle: "Notification beta",
    popupDesc: "Preview du popup salaire",
    high: "Confiance haute",
    medium: "Confiance moyenne",
    low: "Confiance faible",
    resetPreview: "Revenir au preview",
    confirmed: "confirmé",
    waiting: "en attente",
    betaTest: "beta test",
    back: "Retour",
    confirmAmount: "Confirmer le montant",
    closePopup: "Fermer le popup",
    beta: "Beta",
    officialTesters: "Testeurs officiels",
    pageLabel: (count) => `${count} page(s)`,
    pageSubtitle: "Liste de toutes les nouvelles pages beta disponibles sur la plateforme.",
    betaPreview: "Beta preview",
    salaryNotifications: "Notifications salaire",
    salaryPreviewTitle: "Tester les notifications salaire ici",
    salaryPreviewDesc: "Preview beta only: compare `prefilled`, `suggested` et `manual` sans relancer l'onboarding.",
    openPopup: "Ouvrir le popup",
    openOnboarding: "Ouvrir onboarding v2",
    source: "Source",
    lastOnboarding: "Dernier onboarding v2",
    noRecord: "Aucun record",
    salaryProfile: "Profil salaire",
    profileMissing: "Pas encore dispo",
    liveReminder: "Reminder live",
    visibleToday: "Visible aujourd’hui",
    notTriggered: "Pas déclenché aujourd’hui",
    currentMode: "Mode actuel",
    notAvailable: "pas encore dispo",
    loadingPreview: "Chargement du preview salaire…",
    noOnboardingWarning:
      "Aucun onboarding v2 trouvé pour ce compte. Il faut au moins un record onboarding v2 avec des réponses salaire pour voir le preview ici.",
    incompleteProfileWarning:
      "Le dernier onboarding v2 existe, mais le profil salaire est incomplet ou ce n’est pas un parcours salarié.",
    liveNotification: "Notification live",
    noLiveWindow: "Aujourd’hui, aucun rappel live ne tombe sur ta fenêtre.",
    noLiveDesc:
      "Le preview ci-dessous te permet quand même de tester tous les cas sans attendre la vraie date.",
    stable: "stable/confident",
    variable: "variable/soft",
    viewPopup: "Voir en popup",
    open: "Ouvrir",
    active: "Active",
    soon: "Bientôt",
  },
  en: {
    popupTitle: "Beta notification",
    popupDesc: "Salary popup preview",
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
    resetPreview: "Reset preview",
    confirmed: "confirmed",
    waiting: "waiting",
    betaTest: "beta test",
    back: "Back",
    confirmAmount: "Confirm amount",
    closePopup: "Close popup",
    beta: "Beta",
    officialTesters: "Official testers",
    pageLabel: (count) => `${count} page(s)`,
    pageSubtitle: "List of the new beta pages available on the platform.",
    betaPreview: "Beta preview",
    salaryNotifications: "Salary notifications",
    salaryPreviewTitle: "Test salary notifications here",
    salaryPreviewDesc: "Beta preview only: compare `prefilled`, `suggested`, and `manual` without rerunning onboarding.",
    openPopup: "Open popup",
    openOnboarding: "Open onboarding v2",
    source: "Source",
    lastOnboarding: "Latest onboarding v2",
    noRecord: "No record",
    salaryProfile: "Salary profile",
    profileMissing: "Not available yet",
    liveReminder: "Live reminder",
    visibleToday: "Visible today",
    notTriggered: "Not triggered today",
    currentMode: "Current mode",
    notAvailable: "not available yet",
    loadingPreview: "Loading salary preview…",
    noOnboardingWarning:
      "No onboarding v2 found for this account. You need at least one onboarding v2 record with salary answers to see the preview here.",
    incompleteProfileWarning:
      "The latest onboarding v2 exists, but the salary profile is incomplete or this is not a salaried journey.",
    liveNotification: "Live notification",
    noLiveWindow: "No live reminder is scheduled for your window today.",
    noLiveDesc:
      "The preview below still lets you test every case without waiting for the real date.",
    stable: "stable/confident",
    variable: "variable/soft",
    viewPopup: "View popup",
    open: "Open",
    active: "Active",
    soon: "Soon",
  },
  ar: {
    popupTitle: "إشعار beta",
    popupDesc: "preview ديال popup السالاير",
    high: "ثقة عالية",
    medium: "ثقة متوسطة",
    low: "ثقة ضعيفة",
    resetPreview: "رجّع preview",
    confirmed: "تأكد",
    waiting: "مازال",
    betaTest: "beta test",
    back: "رجع",
    confirmAmount: "أكد المبلغ",
    closePopup: "سدّ الpopup",
    beta: "Beta",
    officialTesters: "مجربين رسميين",
    pageLabel: (count) => `${count} صفحة`,
    pageSubtitle: "اللائحة ديال الصفحات beta الجديدة فالبلاطافورم.",
    betaPreview: "Beta preview",
    salaryNotifications: "إشعارات السالاير",
    salaryPreviewTitle: "جرّب إشعارات السالاير من هنا",
    salaryPreviewDesc: "قارن بين `prefilled` و`suggested` و`manual` بلا ما تعاود l'onboarding.",
    openPopup: "حل الpopup",
    openOnboarding: "حل onboarding v2",
    source: "المصدر",
    lastOnboarding: "آخر onboarding v2",
    noRecord: "ما كاين حتى record",
    salaryProfile: "بروفايل السالاير",
    profileMissing: "مازال ما بانش",
    liveReminder: "التذكير الليف",
    visibleToday: "باين اليوم",
    notTriggered: "ما تفعّلش اليوم",
    currentMode: "المود الحالي",
    notAvailable: "مازال ما بانش",
    loadingPreview: "كيتحمّل preview ديال السالاير…",
    noOnboardingWarning:
      "ما كاين حتى onboarding v2 فهاد الحساب. خاص على الأقل record واحد فيه أجوبة السالاير باش يبان preview هنا.",
    incompleteProfileWarning:
      "آخر onboarding v2 كاين، ولكن بروفايل السالاير ناقص أو المسار ماشي ديال salaried.",
    liveNotification: "الإشعار الليف",
    noLiveWindow: "اليوم ما كاين حتى reminder live فالنافذة ديالك.",
    noLiveDesc:
      "هاد preview لتحت مازال كيخليك تجرّب جميع الحالات بلا ما تستنا التاريخ الحقيقي.",
    stable: "مستقر",
    variable: "متغير",
    viewPopup: "شوف فالpopup",
    open: "حل",
    active: "خدامة",
    soon: "قريباً",
  },
};

type SalaryPreviewState = Record<string, "pending" | "confirmed" | "delayed">;
type SalaryPreviewAmounts = Record<string, number>;
type SalaryDraftAmounts = Record<string, string>;

export default function BetaHubPage() {
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "beta-page-ar-body");
  const copy = BETA_COPY[locale];
  const pages = BETA_PAGES[locale];
  const [latestOnboardingRecord, setLatestOnboardingRecord] =
    useState<OnboardingV2RecordOut | null>(null);
  const [loadingSalaryPreview, setLoadingSalaryPreview] = useState(true);
  const [salaryPreviewState, setSalaryPreviewState] = useState<SalaryPreviewState>({});
  const [salaryPreviewAmounts, setSalaryPreviewAmounts] = useState<SalaryPreviewAmounts>({});
  const [salaryDraftAmounts, setSalaryDraftAmounts] = useState<SalaryDraftAmounts>({});
  const [salaryPopupOpen, setSalaryPopupOpen] = useState(false);
  const [selectedPopupScenarioId, setSelectedPopupScenarioId] = useState<string | null>(
    null
  );
  const [salaryPopupConfirmMode, setSalaryPopupConfirmMode] = useState(false);
  const [salaryConfirmError, setSalaryConfirmError] = useState<string | null>(null);
  const popupAutoOpenedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const records = await apiFetch<OnboardingV2RecordOut[]>(
          "/users/me/onboarding-v2-records?limit=1"
        );
        if (cancelled) return;
        setLatestOnboardingRecord(records[0] ?? null);
      } catch {
        if (cancelled) return;
        setLatestOnboardingRecord(null);
      } finally {
        if (!cancelled) {
          setLoadingSalaryPreview(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const salaryProfile = useMemo<SalaryScheduleProfile | null>(
    () => extractLatestSalaryScheduleProfile(latestOnboardingRecord?.payload),
    [latestOnboardingRecord]
  );

  const actualPopupModel = useMemo(
    () => resolveIncomePopupPreviewModel(latestOnboardingRecord?.payload),
    [latestOnboardingRecord]
  );

  const popupPreviewCases = useMemo(
    () => buildIncomePopupPreviewCases(latestOnboardingRecord?.payload),
    [latestOnboardingRecord]
  );

  const liveSalaryPreview = useMemo(
    () => buildLiveSalaryNotification(salaryProfile, { cycles: {} }),
    [salaryProfile]
  );

  const selectedPopupCase = useMemo<IncomePopupPreviewCase | null>(() => {
    if (!popupPreviewCases.length) return null;
    if (!selectedPopupScenarioId) {
      return popupPreviewCases[0] ?? null;
    }
    return (
      popupPreviewCases.find((scenario) => scenario.id === selectedPopupScenarioId) ??
      popupPreviewCases[0] ??
      null
    );
  }, [popupPreviewCases, selectedPopupScenarioId]);

  const getPopupCaseState = (item: IncomePopupPreviewCase) =>
    salaryPreviewState[item.id] ?? item.state;

  const getInitialDraftAmount = useCallback(
    (item: IncomePopupPreviewCase) => {
      if (typeof salaryPreviewAmounts[item.id] === "number") {
        return String(salaryPreviewAmounts[item.id]);
      }
      if (
        item.model.amountClaimMode !== "manual" &&
        typeof item.model.expectedAmount === "number"
      ) {
        return String(item.model.expectedAmount);
      }
      return "";
    },
    [salaryPreviewAmounts]
  );

  useEffect(() => {
    if (!selectedPopupCase) return;
    setSalaryDraftAmounts((prev) => {
      if (prev[selectedPopupCase.id] !== undefined) return prev;
      return {
        ...prev,
        [selectedPopupCase.id]: getInitialDraftAmount(selectedPopupCase),
      };
    });
  }, [getInitialDraftAmount, selectedPopupCase]);

  const handleSalaryPreviewAction = (
    scenarioId: string,
    nextState: "pending" | "confirmed" | "delayed"
  ) => {
    setSalaryPreviewState((prev) => {
      if (nextState === "pending") {
        const next = { ...prev };
        delete next[scenarioId];
        return next;
      }
      return {
        ...prev,
        [scenarioId]: nextState,
      };
    });
    if (nextState !== "confirmed") {
      setSalaryPreviewAmounts((prev) => {
        const next = { ...prev };
        if (nextState === "pending" || nextState === "delayed") {
          delete next[scenarioId];
        }
        return next;
      });
    }
  };

  const handleConfirmReceivedAmount = () => {
    if (!selectedPopupCase) return;
    const currentDraft = salaryDraftAmounts[selectedPopupCase.id] ?? "";
    const parsedAmount = Number(currentDraft);
    if (!currentDraft.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSalaryConfirmError("دخل شحال توصّلتي به بالضبط.");
      return;
    }
    handleSalaryPreviewAction(selectedPopupCase.id, "confirmed");
    setSalaryPreviewAmounts((prev) => ({
      ...prev,
      [selectedPopupCase.id]: parsedAmount,
    }));
    setSalaryConfirmError(null);
  };

  const openSalaryPopup = (scenarioId?: string) => {
    if (scenarioId) {
      setSelectedPopupScenarioId(scenarioId);
    } else if (!selectedPopupScenarioId) {
      setSelectedPopupScenarioId(popupPreviewCases[0]?.id ?? null);
    }
    setSalaryPopupConfirmMode(false);
    setSalaryConfirmError(null);
    setSalaryPopupOpen(true);
  };

  useEffect(() => {
    if (loadingSalaryPreview || popupAutoOpenedRef.current) return;
    if (!popupPreviewCases.length) return;
    const preferredId = popupPreviewCases[0]?.id;
    if (!preferredId) return;
    popupAutoOpenedRef.current = true;
    setSelectedPopupScenarioId(preferredId);
    setSalaryPopupOpen(true);
  }, [loadingSalaryPreview, popupPreviewCases]);

  return (
    <div className="space-y-6" dir={dir}>
      <Dialog
        open={salaryPopupOpen}
        onOpenChange={(next) => {
          setSalaryPopupOpen(next);
          if (!next) {
            setSalaryPopupConfirmMode(false);
            setSalaryConfirmError(null);
          }
        }}
      >
        <DialogContent className="max-w-md border-[var(--border)] bg-[linear-gradient(160deg,_#ffffff_0%,_#f8fbff_65%,_#f4f7ff_100%)] p-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ink)] text-[var(--bg)] shadow-sm">
                <BellRing className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-base">{copy.popupTitle}</DialogTitle>
                <DialogDescription className="text-xs">
                  {copy.popupDesc}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedPopupCase ? (
            <div className="space-y-3">
              <div
                className={`rounded-[26px] border p-4 shadow-sm ${
                  getPopupCaseState(selectedPopupCase) === "confirmed"
                    ? "border-emerald-200 bg-emerald-50/80"
                    : getPopupCaseState(selectedPopupCase) === "delayed"
                    ? "border-amber-200 bg-amber-50/80"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                      {selectedPopupCase.label}
                    </p>
                    <p className="mt-1.5 text-lg font-semibold leading-6 text-[var(--ink)]">
                      {selectedPopupCase.model.title}
                    </p>
                    <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
                      {selectedPopupCase.model.helperText}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      getPopupCaseState(selectedPopupCase) === "confirmed"
                        ? "bg-emerald-100 text-emerald-800"
                        : getPopupCaseState(selectedPopupCase) === "delayed"
                        ? "bg-amber-100 text-amber-800"
                        : selectedPopupCase.model.amountClaimMode === "prefilled"
                        ? "bg-[var(--ink)] text-[var(--bg)]"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {selectedPopupCase.model.amountBadge}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--muted)]">
                  <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1">
                    {selectedPopupCase.model.confidence === "high"
                      ? copy.high
                      : selectedPopupCase.model.confidence === "medium"
                      ? copy.medium
                      : copy.low}
                  </span>
                  <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1">
                    {selectedPopupCase.model.incomeType}
                  </span>
                  {typeof salaryPreviewAmounts[selectedPopupCase.id] === "number" ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
                      {salaryPreviewAmounts[selectedPopupCase.id]} MAD
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 space-y-3">
                  {salaryPopupConfirmMode ? (
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">
                        شحال توصّلتي به بالضبط؟
                      </p>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={
                          salaryDraftAmounts[selectedPopupCase.id] ??
                          getInitialDraftAmount(selectedPopupCase)
                        }
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setSalaryDraftAmounts((prev) => ({
                            ...prev,
                            [selectedPopupCase.id]: nextValue,
                          }));
                          if (salaryConfirmError) {
                            setSalaryConfirmError(null);
                          }
                        }}
                        placeholder={
                          selectedPopupCase.model.amountClaimMode === "manual"
                            ? "0"
                            : selectedPopupCase.model.expectedAmount
                            ? String(selectedPopupCase.model.expectedAmount)
                            : "0"
                        }
                        className={`mt-2 h-10 rounded-xl ${
                          selectedPopupCase.model.amountClaimMode === "suggested"
                            ? "border-dashed border-indigo-300 bg-indigo-50/30"
                            : ""
                        }`}
                      />
                      {salaryConfirmError ? (
                        <p className="mt-2 text-[11px] text-rose-600">{salaryConfirmError}</p>
                      ) : (
                        <p className="mt-2 text-[11px] text-[var(--muted)]">
                          دخل المبلغ اللي توصّلتي به باش نكملو الpreview.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSalaryPopupConfirmMode(true);
                          setSalaryConfirmError(null);
                          setSalaryDraftAmounts((prev) => ({
                            ...prev,
                            [selectedPopupCase.id]:
                              prev[selectedPopupCase.id] ?? getInitialDraftAmount(selectedPopupCase),
                          }));
                        }}
                      >
                        {selectedPopupCase.model.confirmLabel}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSalaryPreviewAction(selectedPopupCase.id, "delayed")}
                      >
                        {selectedPopupCase.model.waitLabel}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      handleSalaryPreviewAction(selectedPopupCase.id, "pending");
                      setSalaryDraftAmounts((prev) => {
                        const next = { ...prev };
                        next[selectedPopupCase.id] = getInitialDraftAmount(selectedPopupCase);
                        return next;
                      });
                      setSalaryPopupConfirmMode(false);
                      setSalaryConfirmError(null);
                    }}
                    className="inline-flex text-[11px] font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
                  >
                    {copy.resetPreview}
                  </button>
                  <span className="text-[11px] text-[var(--muted)]">
                    {getPopupCaseState(selectedPopupCase) === "confirmed"
                      ? copy.confirmed
                      : getPopupCaseState(selectedPopupCase) === "delayed"
                      ? copy.waiting
                      : copy.betaTest}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
              ما كاين حتى سيناريو متاح دابا باش يتفتح فـ popup.
            </div>
          )}

          <DialogFooter className="pt-1">
            <div className="flex w-full items-center justify-between gap-2">
              {salaryPopupConfirmMode && selectedPopupCase ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSalaryPopupConfirmMode(false);
                    setSalaryConfirmError(null);
                  }}
                >
                  {copy.back}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                {salaryPopupConfirmMode && selectedPopupCase ? (
                  <Button size="sm" onClick={handleConfirmReceivedAmount}>
                    {copy.confirmAmount}
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => setSalaryPopupOpen(false)}>
                  {copy.closePopup}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-emerald-200 bg-[linear-gradient(130deg,_#ecfdf5_0%,_#ffffff_55%,_#ecfeff_100%)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="accent">{copy.beta}</Badge>
              <Badge tone="muted">{copy.officialTesters}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--ink)]">{copy.beta}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {copy.pageSubtitle}
            </p>
          </div>
          <Badge tone="accent">{copy.pageLabel(pages.length)}</Badge>
        </div>
      </Card>

      <Card className="border-indigo-200 bg-[linear-gradient(135deg,_#f8fbff_0%,_#ffffff_50%,_#f6f5ff_100%)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="accent">{copy.betaPreview}</Badge>
              <Badge tone="muted">{copy.salaryNotifications}</Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-[var(--ink)]">
              {copy.salaryPreviewTitle}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              {copy.salaryPreviewDesc}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => openSalaryPopup()}
              disabled={!popupPreviewCases.length && !loadingSalaryPreview}
            >
              {copy.openPopup}
            </Button>
            <Button asChild variant="secondary">
              <Link href="/onboarding">{copy.openOnboarding}</Link>
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {copy.source}
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
              {latestOnboardingRecord ? copy.lastOnboarding : copy.noRecord}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {copy.salaryProfile}
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
              {salaryProfile?.displayLabel ?? copy.profileMissing}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {copy.liveReminder}
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
              {liveSalaryPreview ? copy.visibleToday : copy.notTriggered}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {copy.currentMode}
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
              {actualPopupModel?.amountClaimMode ?? copy.notAvailable}
            </p>
          </div>
        </div>

        {loadingSalaryPreview ? (
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
            {copy.loadingPreview}
          </div>
        ) : null}

        {!loadingSalaryPreview && !latestOnboardingRecord ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {copy.noOnboardingWarning}
          </div>
        ) : null}

        {!loadingSalaryPreview && latestOnboardingRecord && !salaryProfile ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {copy.incompleteProfileWarning}
          </div>
        ) : null}

        {salaryProfile ? (
          <>
            <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                    {copy.liveNotification}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                    {liveSalaryPreview?.title ?? copy.noLiveWindow}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                    {liveSalaryPreview?.description ?? copy.noLiveDesc}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
                    {salaryProfile.frequency}
                  </span>
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
                    {salaryProfile.certainty === "confident" ? copy.stable : copy.variable}
                  </span>
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
                    {salaryProfile.displayLabel}
                  </span>
                  {actualPopupModel ? (
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                      {actualPopupModel.amountClaimMode}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

          </>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {popupPreviewCases.map((scenario) => (
            <div
              key={scenario.id}
              className={`rounded-[24px] border p-4 transition ${
                getPopupCaseState(scenario) === "confirmed"
                  ? "border-emerald-200 bg-emerald-50/70"
                  : getPopupCaseState(scenario) === "delayed"
                  ? "border-amber-200 bg-amber-50/70"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                    {scenario.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--ink)]">
                    {scenario.model.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {scenario.model.helperText}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    getPopupCaseState(scenario) === "confirmed"
                      ? "bg-emerald-100 text-emerald-800"
                      : getPopupCaseState(scenario) === "delayed"
                      ? "bg-amber-100 text-amber-800"
                      : scenario.model.amountClaimMode === "prefilled"
                      ? "bg-[var(--ink)] text-[var(--bg)]"
                      : "bg-indigo-100 text-indigo-800"
                  }`}
                >
                  {scenario.model.amountClaimMode}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--muted)]">
                <span className="rounded-full bg-[var(--surface-2)] px-3 py-1">
                  {scenario.model.confidence}
                </span>
                <span className="rounded-full bg-[var(--surface-2)] px-3 py-1">
                  {scenario.model.amountBadge}
                </span>
                {typeof scenario.model.expectedAmount === "number" ? (
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1">
                    {scenario.model.expectedAmount} MAD
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openSalaryPopup(scenario.id)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-medium text-indigo-800 transition hover:bg-indigo-100"
                >
                  {copy.viewPopup}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPopupScenarioId(scenario.id);
                    setSalaryPopupConfirmMode(true);
                    setSalaryConfirmError(null);
                    setSalaryPopupOpen(true);
                    setSalaryDraftAmounts((prev) => ({
                      ...prev,
                      [scenario.id]: prev[scenario.id] ?? getInitialDraftAmount(scenario),
                    }));
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#111111] px-4 text-sm font-medium text-white transition hover:bg-black"
                >
                  {scenario.model.confirmLabel}
                </button>
                <button
                  type="button"
                  onClick={() => handleSalaryPreviewAction(scenario.id, "delayed")}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--surface-2)]"
                >
                  {scenario.model.waitLabel}
                </button>
                <button
                  type="button"
                  onClick={() => handleSalaryPreviewAction(scenario.id, "pending")}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-transparent px-3 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
                >
                  رجّع preview
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {pages.map((item) => (
        <Card key={item.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-[var(--ink)]">{item.title}</p>
                <Badge tone={item.status === "active" ? "success" : "muted"}>
                  {item.status === "active" ? copy.active : copy.soon}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{item.href}</p>
            </div>
            <Button asChild>
              <Link href={item.href}>{copy.open}</Link>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
