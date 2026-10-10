"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  X,
  Lock,
  RotateCcw,
  Edit3,
  Check,
  Wallet,
  Calendar,
  Store,
  FolderMinus,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { CategoryOut, TransactionOut } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import {
  localizeCategoryName,
  getCanonicalCategoryKey,
  isInternalIncomeCategory,
} from "@/lib/categoryCatalog";

const CATEGORY_TRANSLATIONS_MAP: Record<string, string> = {
  alimentation: "Courses",
  courses: "Courses",
  nourriture: "Courses",
  resto: "Restaurants",
  restaurant: "Restaurants",
  café: "Restaurants",
  cafe: "Restaurants",
  snack: "Restaurants",
  transport: "Transport",
  taxi: "Transport",
  essence: "Transport",
  carburant: "Transport",
  loisirs: "Loisirs",
  sorties: "Loisirs",
  shopping: "Shopping",
  achats: "Shopping",
  santé: "Santé",
  sante: "Santé",
  pharmacie: "Santé",
  logement: "Logement",
  loyer: "Logement",
  factures: "Factures",
  facture: "Factures",
  electricité: "Factures",
  eau: "Factures",
  internet: "Factures",
  recharge: "Factures",
  abonnements: "Abonnements",
  voyage: "Voyages",
  epargne: "Épargne",
  divers: "Divers",
};

interface BaOmarVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: "fr" | "ar";
  userCurrency?: string;
  categoriesData?: CategoryOut[];
  isGuest?: boolean;
  onSuccessTransaction?: (tx: TransactionOut) => void;
  onOpenInFullModal?: (draft: {
    amount: string;
    category_id?: string;
    occurred_on: string;
    description: string;
  }) => void;
  onFocusSearchInput?: () => void;
}

type ModalStep = "listen" | "think" | "result" | "error";
type SpokenLang = "darija" | "fr" | "ar";

export const BaOmarVoiceModal: React.FC<BaOmarVoiceModalProps> = ({
  isOpen,
  onClose,
  locale = "fr",
  userCurrency = "MAD",
  categoriesData = [],
  isGuest = false,
  onSuccessTransaction,
  onOpenInFullModal,
  onFocusSearchInput,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<ModalStep>("listen");
  const [spokenLang, setSpokenLang] = useState<SpokenLang>("darija");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Prediction payload
  const [prediction, setPrediction] = useState<{
    amount: number | null;
    date: string | null;
    description: string;
    category: string | null;
    needs_disambiguation: boolean;
    suggested_categories: string[];
    transcript?: string;
  } | null>(null);

  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  // Audio / Speech refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter out internal income categories
  const allExpenseCategories = React.useMemo(() => {
    return (categoriesData || []).filter((c) => !isInternalIncomeCategory(c.name));
  }, [categoriesData]);

  // Category matching helper
  const getActiveCategoryByName = useCallback(
    (catName: string) => {
      if (!catName || allExpenseCategories.length === 0) return null;
      const norm = catName.trim().toLowerCase();
      let found = allExpenseCategories.find(
        (c) => c.name.trim().toLowerCase() === norm
      );
      if (found) return found;

      const mapped = CATEGORY_TRANSLATIONS_MAP[norm];
      if (mapped) {
        found = allExpenseCategories.find(
          (c) => c.name.trim().toLowerCase() === mapped.toLowerCase()
        );
        if (found) return found;
      }

      const canonical = getCanonicalCategoryKey(catName).toLowerCase();
      found = allExpenseCategories.find(
        (c) => getCanonicalCategoryKey(c.name).toLowerCase() === canonical
      );
      if (found) return found;

      return null;
    },
    [allExpenseCategories]
  );

  const getFallbackCategory = useCallback(() => {
    if (allExpenseCategories.length === 0) return null;
    const kwList = ["courses", "alimentation", "divers", "makla", "مصاريف متنوعة", "autre"];
    for (const kw of kwList) {
      const match = allExpenseCategories.find(
        (c) => c.name.toLowerCase().includes(kw) || getCanonicalCategoryKey(c.name).toLowerCase() === "miscellaneous"
      );
      if (match) return match;
    }
    return allExpenseCategories[0];
  }, [allExpenseCategories]);

  // Clean stop for all audio recording & recognition
  const stopAudio = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  // Process text through NLP
  const processQuery = useCallback(
    async (textToAnalyze: string) => {
      const query = textToAnalyze.trim();
      if (!query) {
        setStep("error");
        return;
      }

      setStep("think");
      stopAudio();

      try {
        const availableCategories = allExpenseCategories.map((c) => c.name);
        const res = await apiFetch<{
          amount: number | null;
          date: string | null;
          description: string;
          category: string | null;
          needs_disambiguation: boolean;
          suggested_categories: string[];
        }>("/nlp/predict", {
          method: "POST",
          body: {
            text: query,
            available_categories: availableCategories,
          },
        });

        const fallbackAmountMatch = query.match(/(\d+[\d\s,.]*)/);
        const parsedFallbackAmt = fallbackAmountMatch
          ? parseFloat(fallbackAmountMatch[1].replace(/\s+/g, "").replace(",", ".")) || null
          : null;

        const effectiveAmt =
          res.amount !== null && res.amount !== undefined
            ? res.amount
            : parsedFallbackAmt;

        if (effectiveAmt !== null && effectiveAmt > 0) {
          setPrediction({
            ...res,
            amount: effectiveAmt,
          });

          // Match category
          let matchedCatName: string | null = null;
          if (res.category && getActiveCategoryByName(res.category)) {
            matchedCatName = res.category;
          } else if (res.suggested_categories?.length > 0) {
            const firstValid = res.suggested_categories.find((c) =>
              Boolean(getActiveCategoryByName(c))
            );
            if (firstValid) matchedCatName = firstValid;
          }
          if (!matchedCatName) {
            matchedCatName = getFallbackCategory()?.name || null;
          }

          setSelectedCategoryName(matchedCatName);
          setStep("result");
        } else {
          setStep("error");
        }
      } catch (err) {
        console.error("NLP error in voice modal:", err);
        setStep("error");
      }
    },
    [allExpenseCategories, getActiveCategoryByName, getFallbackCategory, stopAudio]
  );

  // Start speech recognition
  const startListening = useCallback(() => {
    stopAudio();
    setStep("listen");
    setSeconds(0);
    setTranscript("");
    setInterimText("");
    setPrediction(null);
    setSelectedCategoryName(null);

    // Timer
    timerIntervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const langCode =
      spokenLang === "darija" ? "ar-MA" : spokenLang === "fr" ? "fr-FR" : "ar-SA";

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = langCode;

        recognition.onresult = (e: any) => {
          let currentFinal = "";
          let currentInterim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const item = e.results[i];
            if (item.isFinal) {
              currentFinal += item[0].transcript;
            } else {
              currentInterim += item[0].transcript;
            }
          }
          if (currentFinal) {
            setTranscript((prev) => (prev ? `${prev} ${currentFinal}` : currentFinal));
            setInterimText("");
          } else {
            setInterimText(currentInterim);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("Voice modal speech recognition error:", e.error);
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            toast({
              title: locale === "ar" ? "⚠️ الميكروفون محظور" : "⚠️ Microphone bloqué",
              description:
                locale === "ar"
                  ? "يرجى تفعيل الميكروفون في إعدادات المتصفح."
                  : "Veuillez autoriser l'accès au microphone dans votre navigateur.",
              variant: "danger",
            });
            setStep("error");
          }
        };

        recognition.onend = () => {
          // If text was accumulated, finalize
          setTranscript((curr) => {
            const finalQuery = curr.trim() || interimText.trim();
            if (finalQuery) {
              processQuery(finalQuery);
            }
            return curr;
          });
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn("SpeechRecognition init failed, falling back to MediaRecorder:", err);
      }
    }

    // MediaRecorder fallback
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          mediaStreamRef.current = stream;
          audioChunksRef.current = [];

          let mimeType = "audio/webm";
          if (typeof MediaRecorder !== "undefined") {
            if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
              mimeType = "audio/webm;codecs=opus";
            } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
              mimeType = "audio/mp4";
            }
          }

          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          recorder.onstop = async () => {
            const chunks = audioChunksRef.current;
            if (chunks.length === 0) return;
            const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });

            setStep("think");
            try {
              const formData = new FormData();
              const ext = recorder.mimeType.includes("mp4") ? "mp4" : "webm";
              formData.append("file", audioBlob, `voice_note.${ext}`);
              const availableCategories = allExpenseCategories.map((c) => c.name);
              formData.append("available_categories", JSON.stringify(availableCategories));

              const res = await apiFetch<{
                transcript: string;
                amount: number | null;
                date: string | null;
                description: string;
                category: string | null;
                needs_disambiguation: boolean;
                suggested_categories: string[];
              }>("/nlp/predict-audio", {
                method: "POST",
                body: formData,
                timeoutMs: 40000,
              });

              if (res.amount !== null && res.amount !== undefined && res.amount > 0) {
                setTranscript(res.transcript || res.description);
                setPrediction(res);
                setSelectedCategoryName(res.category || getFallbackCategory()?.name || null);
                setStep("result");
              } else {
                setStep("error");
              }
            } catch (err) {
              console.error("predict-audio error:", err);
              setStep("error");
            }
          };

          recorder.start(250);
        })
        .catch((err) => {
          console.error("getUserMedia error:", err);
          toast({
            title: locale === "ar" ? "⚠️ الميكروفون محظور" : "⚠️ Microphone bloqué",
            description:
              locale === "ar"
                ? "يرجى تفعيل الميكروفون في إعدادات المتصفح."
                : "Veuillez autoriser l'accès au microphone dans votre navigateur.",
            variant: "danger",
          });
          setStep("error");
        });
    }
  }, [
    spokenLang,
    stopAudio,
    processQuery,
    interimText,
    locale,
    toast,
    allExpenseCategories,
    getFallbackCategory,
  ]);

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopAudio();
    }
    return () => {
      stopAudio();
    };
  }, [isOpen, startListening, stopAudio]);

  // Global escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Confirm and save transaction
  const handleConfirm = async () => {
    if (!prediction || prediction.amount === null || prediction.amount <= 0) return;

    try {
      setIsSaving(true);
      const matchedCat = selectedCategoryName
        ? getActiveCategoryByName(selectedCategoryName)
        : getFallbackCategory();
      const targetCatId = matchedCat?.id || undefined;
      const targetDate = prediction.date || new Date().toISOString().split("T")[0];
      const targetDesc = prediction.description || transcript;

      const res = await apiFetch<TransactionOut>("/transactions", {
        method: "POST",
        body: {
          amount: prediction.amount.toFixed(2),
          type: "expense",
          occurred_on: targetDate,
          category_id: targetCatId,
          description: targetDesc,
        },
      });

      // Feedback for AI accuracy
      if (prediction.description && selectedCategoryName) {
        apiFetch("/nlp/feedback", {
          method: "POST",
          body: {
            keyword: prediction.description,
            category_name: selectedCategoryName,
          },
        }).catch(() => null);
      }

      const formattedAmt = prediction.amount.toLocaleString("fr-FR", {
        maximumFractionDigits: 2,
      });
      const catDisplayName = selectedCategoryName
        ? localizeCategoryName(selectedCategoryName, locale)
        : "";

      toast({
        title: locale === "ar" ? "تم تسجيل المصروف ✨" : "Dépense enregistrée ✨",
        description: `${formattedAmt} ${userCurrency} • ${catDisplayName || "Dépense"}`,
        variant: "success",
      });

      if (onSuccessTransaction) {
        onSuccessTransaction(res);
      }
      onClose();
    } catch (err: any) {
      console.error("Save voice transaction failed:", err);
      toast({
        title: locale === "ar" ? "خطأ في التسجيل" : "Erreur d'enregistrement",
        description: err?.message || "Impossible d'enregistrer la transaction.",
        variant: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Words formatting
  const displayWords = (() => {
    const full = `${transcript} ${interimText}`.trim();
    if (!full) return [];
    return full.split(/\s+/).map((word, idx, arr) => ({
      text: word,
      isInterim: Boolean(interimText) && idx >= arr.length - interimText.trim().split(/\s+/).length,
      delay: `${Math.min(idx * 0.08, 0.6).toFixed(2)}s`,
    }));
  })();

  // Example prompts based on spoken language
  const examplesByLang: Record<SpokenLang, string[]> = {
    darija: [
      "khsert 150 dh f Marjane",
      "chhal baqi f l-makla ?",
      "khlest 30 dh taxi",
    ],
    fr: [
      "150 DH courses chez Marjane",
      "Taxi 30 DH",
      "Déjeuner 80 DH",
    ],
    ar: [
      "صرفت 150 درهم ف مرجان",
      "طاكسي 30 درهم",
      "عشاء 80 درهم",
    ],
  };

  // Status text per step
  const statusText = (() => {
    if (step === "listen") {
      return locale === "ar" ? "با عمر كيسمع ليك…" : "Ba Omar t’écoute…";
    }
    if (step === "think") {
      return locale === "ar" ? "با عمر كيفهم…" : "Ba Omar comprend…";
    }
    if (step === "result") {
      return locale === "ar" ? "فهمت ✓" : "C’est compris ✓";
    }
    return locale === "ar" ? "ما سمعتش مزيان" : "Je n’ai pas bien entendu";
  })();

  // Ba Omar confirmation bubble text
  const replyBubbleText = (() => {
    if (!prediction?.amount) return "";
    const amt = prediction.amount.toLocaleString("fr-FR");
    const catName = selectedCategoryName
      ? localizeCategoryName(selectedCategoryName, locale)
      : "";

    if (spokenLang === "darija") {
      return `Mzyan ! Ghadi nsjjel ${amt} ${userCurrency} f ${catName || "l-masarif"}.`;
    }
    if (spokenLang === "ar") {
      return `مزيان! غادي نسجل ${amt} ${userCurrency} في ${catName || "المصاريف"}.`;
    }
    return `Parfait ! J’enregistre ${amt} ${userCurrency} dans ${catName || "tes dépenses"}.`;
  })();

  const isRTL = locale === "ar";

  return (
    <div
      className="v-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="v-title"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className={`v-card ${
          step === "listen"
            ? "v-listen"
            : step === "think"
            ? "v-think"
            : step === "result"
            ? "v-done"
            : "v-err"
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          className="v-x"
          onClick={onClose}
          aria-label={locale === "ar" ? "إغلاق" : "Fermer"}
        >
          <X size={20} strokeWidth={2.2} />
        </button>

        {/* Top Section with Animated Orb, Waves, Status & Language Switcher */}
        <div className="v-top">
          <div className="v-orbwrap" aria-hidden="true">
            <span className="v-ring" />
            <span className="v-ring r2" />
            <span className="v-ring r3" />
            <div className="v-orb" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="v-face"
              src="/brand/ba-omar-avatar.png"
              alt="Ba Omar"
              onError={(e) => {
                // Fallback to landing avatar if missing
                (e.currentTarget as HTMLImageElement).src = "/landing/ai/ba-omar-avatar.png";
              }}
            />
            {step === "result" && (
              <span className="v-badge ok">✓</span>
            )}
            {step === "error" && (
              <span className="v-badge err">?</span>
            )}
          </div>

          {/* Sound Waves */}
          <div className="v-wave" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>

          {/* Status Label + Live Blink + Running Timer */}
          <div className="v-status" id="v-title" role="status" aria-live="polite">
            {step === "listen" && <span className="v-live" aria-hidden="true" />}
            <span>{statusText}</span>
            {step === "listen" && (
              <span className="text-slate-400 font-mono text-xs">
                0:{String(Math.min(seconds, 59)).padStart(2, "0")}
              </span>
            )}
          </div>

          {/* Spoken Language Selector Segment */}
          {step === "listen" && (
            <div
              className="v-seg"
              role="group"
              aria-label={locale === "ar" ? "اللغة المنطوقة" : "Langue parlée"}
            >
              <button
                type="button"
                className={spokenLang === "darija" ? "on" : ""}
                onClick={() => setSpokenLang("darija")}
              >
                Darija
              </button>
              <button
                type="button"
                className={spokenLang === "fr" ? "on" : ""}
                onClick={() => setSpokenLang("fr")}
              >
                Français
              </button>
              <button
                type="button"
                className={spokenLang === "ar" ? "on" : ""}
                onClick={() => setSpokenLang("ar")}
              >
                العربية
              </button>
            </div>
          )}
        </div>

        {/* Live Transcription Display */}
        {(step === "listen" || step === "think" || step === "result") && (
          <p className="v-trans" dir="auto" aria-live="polite">
            {displayWords.length > 0 ? (
              displayWords.map((w, i) => (
                <span
                  key={`${i}-${w.text}`}
                  className={`v-w ${w.isInterim ? "interim" : ""}`}
                  style={{ animationDelay: w.delay }}
                >
                  {w.text}{" "}
                </span>
              ))
            ) : (
              <span className="text-slate-400 font-normal text-base">
                {locale === "ar"
                  ? "تحدث بمصروفك الآن… (مثال: خسرت 150 درهم ف مرجان)"
                  : "Dites votre dépense… (ex : 150 dh courses Marjane)"}
              </span>
            )}
          </p>
        )}

        {/* Step 1: Listening View */}
        {step === "listen" && (
          <>
            {/* Quick Example Chips */}
            <div
              className="v-chips"
              aria-label={locale === "ar" ? "أمثلة" : "Exemples"}
            >
              {examplesByLang[spokenLang].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="v-chip"
                  onClick={() => {
                    setTranscript(ex);
                    processQuery(ex);
                  }}
                  dir="auto"
                >
                  « {ex} »
                </button>
              ))}
            </div>

            {/* Footer with Stop Button & Privacy notice */}
            <div className="v-foot">
              <button type="button" className="v-btn" onClick={onClose}>
                {locale === "ar" ? "إلغاء" : "Annuler"}
              </button>

              <div className="flex-1 flex items-center justify-center gap-1.5 text-slate-400 text-xs font-semibold">
                <Lock size={13} />
                <span>
                  {locale === "ar"
                    ? "الصوت لا يُحفظ على خوادمنا"
                    : "L’audio n’est pas conservé"}
                </span>
              </div>

              <button
                type="button"
                className="v-stop"
                onClick={() => {
                  const finalTxt = `${transcript} ${interimText}`.trim();
                  if (finalTxt) {
                    processQuery(finalTxt);
                  } else {
                    stopAudio();
                    setStep("error");
                  }
                }}
                aria-label={locale === "ar" ? "إنهاء وإرسال" : "Terminer et envoyer"}
                title={locale === "ar" ? "إنهاء وإرسال" : "Terminer et envoyer"}
              >
                <div className="w-5 h-5 rounded-[4px] bg-white" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Thinking View (AI analyzing) */}
        {step === "think" && (
          <>
            <div className="v-res p-4 flex flex-col gap-2.5">
              <div className="v-skel w-2/5" />
              <div className="v-skel w-4/5" />
              <div className="v-skel w-3/5" />
            </div>

            <div className="v-foot">
              <button
                type="button"
                className="v-btn ms-auto"
                onClick={onClose}
              >
                {locale === "ar" ? "إلغاء" : "Annuler"}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Result View (Transaction detected) */}
        {step === "result" && prediction && (
          <>
            {/* Ba Omar Speech Bubble */}
            <div className="v-bubble">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="v-avatar"
                src="/brand/ba-omar-avatar.png"
                alt="Ba Omar"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/landing/ai/ba-omar-avatar.png";
                }}
              />
              <span dir="auto" className="font-semibold text-sm">
                {replyBubbleText}
              </span>
            </div>

            {/* Structured Result Card */}
            <div className="v-res">
              <div className="v-res-h">
                <span className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400 flex items-center justify-center flex-shrink-0">
                  <Wallet size={20} strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <small className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase block">
                    {locale === "ar" ? "مصروف مكتشف" : "NOUVELLE DÉPENSE"}
                  </small>
                  <div className="text-sm font-extrabold text-[var(--v-ink)] truncate">
                    {prediction.description || transcript}
                  </div>
                </div>
                <b className="text-2xl font-extrabold text-pink-600 dark:text-pink-400 tabular-nums whitespace-nowrap">
                  −{prediction.amount?.toLocaleString("fr-FR")} {userCurrency}
                </b>
              </div>

              <div className="v-kv">
                {/* Envelope / Category */}
                <div>
                  <small>
                    <FolderMinus size={13} />
                    {locale === "ar" ? "الظرف" : "Enveloppe"}
                  </small>
                  <select
                    value={selectedCategoryName || ""}
                    onChange={(e) => setSelectedCategoryName(e.target.value)}
                    className="w-full bg-transparent font-bold text-xs cursor-pointer focus:outline-none"
                  >
                    {allExpenseCategories.map((c) => (
                      <option key={c.id} value={c.name} className="dark:bg-slate-900">
                        {localizeCategoryName(c.name, locale)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <small>
                    <Calendar size={13} />
                    {locale === "ar" ? "التاريخ" : "Date"}
                  </small>
                  <b>
                    {prediction.date || (locale === "ar" ? "اليوم" : "Aujourd’hui")}
                  </b>
                </div>

                {/* Merchant / Description */}
                <div>
                  <small>
                    <Store size={13} />
                    {locale === "ar" ? "البيان" : "Description"}
                  </small>
                  <b className="truncate" title={prediction.description || transcript}>
                    {prediction.description || transcript}
                  </b>
                </div>

                {/* Status / Currency */}
                <div>
                  <small>
                    <Sparkles size={13} />
                    {locale === "ar" ? "العملة" : "Devise"}
                  </small>
                  <b className="text-emerald-600 dark:text-emerald-400">
                    {userCurrency}
                  </b>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="v-foot flex-wrap">
              <button
                type="button"
                className="v-btn"
                onClick={startListening}
                aria-label={locale === "ar" ? "إعادة التسجيل" : "Réécouter"}
              >
                <RotateCcw size={15} />
                <span>{locale === "ar" ? "عاود" : "Réécouter"}</span>
              </button>

              <button
                type="button"
                className="v-btn"
                onClick={() => {
                  if (onOpenInFullModal && prediction.amount) {
                    const matchedCat = selectedCategoryName
                      ? getActiveCategoryByName(selectedCategoryName)
                      : getFallbackCategory();
                    onOpenInFullModal({
                      amount: String(prediction.amount),
                      category_id: matchedCat?.id,
                      occurred_on: prediction.date || new Date().toISOString().split("T")[0],
                      description: prediction.description || transcript,
                    });
                    onClose();
                  }
                }}
              >
                <Edit3 size={15} />
                <span>{locale === "ar" ? "بدّل" : "Modifier"}</span>
              </button>

              <button
                type="button"
                className="v-btn pri ms-auto flex-1 sm:flex-none"
                onClick={handleConfirm}
                disabled={isSaving}
              >
                <Check size={16} strokeWidth={2.6} />
                <span>
                  {isSaving
                    ? locale === "ar"
                      ? "جاري الحفظ…"
                      : "Enregistrement…"
                    : locale === "ar"
                    ? "سجّل المصروف"
                    : "Enregistrer"}
                </span>
              </button>
            </div>
          </>
        )}

        {/* Step 4: Error View */}
        {step === "error" && (
          <>
            <div className="v-bubble" style={{ background: "#FFF4E5", color: "#8A5300" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="v-avatar"
                src="/brand/ba-omar-avatar.png"
                alt="Ba Omar"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/landing/ai/ba-omar-avatar.png";
                }}
              />
              <span className="font-semibold text-sm">
                {locale === "ar"
                  ? "ما فهمتش مزيان… جرب تقول المبلغ والظرف، بحال:"
                  : "Ma fhemtch mzyan… Essaie avec le montant et l’enveloppe, par exemple :"}
              </span>
            </div>

            <div className="v-chips" style={{ paddingTop: 0 }}>
              {examplesByLang[spokenLang].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="v-chip"
                  onClick={() => {
                    setTranscript(ex);
                    processQuery(ex);
                  }}
                  dir="auto"
                >
                  « {ex} »
                </button>
              ))}
            </div>

            <div className="v-foot">
              <button
                type="button"
                className="v-btn"
                onClick={() => {
                  onClose();
                  if (onFocusSearchInput) onFocusSearchInput();
                }}
              >
                {locale === "ar" ? "كتب بلاصتها" : "Écrire plutôt"}
              </button>

              <button
                type="button"
                className="v-btn pri ms-auto"
                onClick={startListening}
              >
                <Mic size={15} />
                <span>{locale === "ar" ? "عاود" : "Réessayer"}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
