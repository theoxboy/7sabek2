"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Mic,
  ArrowRight,
  Globe,
  Flame,
  Bell,
  Plus,
  Check,
  Sparkles,
  Loader2,
  CheckCircle2,
  MessageSquareText,
  ExternalLink,
  Tag,
  Calendar,
  X,
  ChevronDown,
} from "lucide-react";
import useSWR from "swr";

import type { AuthUser } from "@/lib/auth";
import type { FloussyLocale } from "@/lib/localePreference";
import { setAppLocale } from "@/components/i18n/LanguagePreferenceGate";
import { useQuickTx } from "@/state/QuickTxContext";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api";
import type { CategoryOut, TransactionOut } from "@/lib/types";
import { BaOmarVoiceModal } from "./BaOmarVoiceModal";
import {
  isInternalIncomeCategory,
  localizeCategoryName,
  getCanonicalCategoryKey,
} from "@/lib/categoryCatalog";

const CATEGORY_TRANSLATIONS_MAP: Record<string, string> = {
  loisirs: "الترفيه",
  الترفيه: "loisirs",
  alimentation: "المأكولات",
  المأكولات: "alimentation",
  courses: "المأكولات",
  groceries: "المأكولات",
  transport: "النقل",
  النقل: "transport",
  sante: "الصحة",
  الصحة: "sante",
  abonnements: "لا بونومون",
  "لا بونومون": "abonnements",
  voyage: "السفر",
  السفر: "voyage",
  shopping: "الشوبينغ",
  الشوبينغ: "shopping",
  loyer: "الكراء",
  الكراء: "loyer",
  rent: "الكراء",
  "cadeaux & dons": "الهدايا والتبرعات",
  "الهدايا والتبرعات": "cadeaux & dons",
};

const formatLocaleDate = (dateStr: string, loc: FloussyLocale) => {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString(
      loc === "ar" ? "ar-MA" : loc === "fr" ? "fr-FR" : "en-US",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return dateStr;
  }
};

export interface AppTopHeaderNotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "neutral" | "warning" | "danger" | "success";
  icon: any;
  meta?: string;
  onSelect?: () => void;
  dismissible?: boolean;
}

export interface AppTopHeaderProps {
  user: AuthUser | null;
  locale: FloussyLocale;
  streakDays?: number | null;
  notifications: AppTopHeaderNotificationItem[];
  unreadCount: number;
  readNotificationIds: string[];
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  onOpenMobileNav?: () => void;
}

const getLocalTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const AppTopHeader: React.FC<AppTopHeaderProps> = ({
  user,
  locale,
  streakDays = 1,
  notifications,
  unreadCount,
  readNotificationIds,
  markAllNotificationsRead,
  markNotificationRead,
  onOpenMobileNav,
}) => {
  const effectiveStreakDays = typeof streakDays === "number" ? streakDays : 1;
  const router = useRouter();
  const { toast } = useToast();
  const { openQuickTx } = useQuickTx();

  const isRTL = locale === "ar";
  const isGuest = Boolean(user?.is_guest);

  const [omarText, setOmarText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guestTries, setGuestTries] = useState(3);
  const [omarReply, setOmarReply] = useState<string | null>(null);
  const [lastOmarTxId, setLastOmarTxId] = useState<string | null>(null);

  // Magic Entry & NLP State
  const { data: categoriesData } = useSWR<CategoryOut[]>("/categories", apiFetch);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const askContainerRef = useRef<HTMLDivElement>(null);

  const [nlpPrediction, setNlpPrediction] = useState<{
    amount: number | null;
    date: string | null;
    description: string;
    category: string | null;
    needs_disambiguation: boolean;
    suggested_categories: string[];
  } | null>(null);
  const [isNlpLoading, setIsNlpLoading] = useState(false);
  const [selectedDisambiguationCategoryName, setSelectedDisambiguationCategoryName] = useState<string | null>(null);
  const [manualCategoryName, setManualCategoryName] = useState<string | null>(null);

  // Active expense categories
  const allExpenseCategories = useMemo(() => {
    return (categoriesData || []).filter((c) => !isInternalIncomeCategory(c.name));
  }, [categoriesData]);

  // Helper to find an active category by canonical name or dictionary translation
  const getActiveCategoryByName = useCallback(
    (catName: string) => {
      if (!catName || allExpenseCategories.length === 0) return null;
      const normName = catName.trim().toLowerCase();

      // 1. Direct case-insensitive match on category name
      let found = allExpenseCategories.find(
        (c) => c.name.trim().toLowerCase() === normName
      );
      if (found) return found;

      // 2. Translate using mapping dictionary
      const mappedName = CATEGORY_TRANSLATIONS_MAP[normName];
      if (mappedName) {
        const normMapped = mappedName.toLowerCase();
        found = allExpenseCategories.find(
          (c) => c.name.trim().toLowerCase() === normMapped
        );
        if (found) return found;
      }

      // 3. Match via canonical keys
      const canonicalKey = getCanonicalCategoryKey(catName).toLowerCase();
      found = allExpenseCategories.find(
        (c) => getCanonicalCategoryKey(c.name).toLowerCase() === canonicalKey
      );
      if (found) return found;

      // 4. Reverse lookup translation mapping against candidate names
      for (const key in CATEGORY_TRANSLATIONS_MAP) {
        if (CATEGORY_TRANSLATIONS_MAP[key].toLowerCase() === normName) {
          found = allExpenseCategories.find(
            (c) => c.name.trim().toLowerCase() === key.toLowerCase()
          );
          if (found) return found;
        }
      }

      return null;
    },
    [allExpenseCategories]
  );

  const getFallbackCategory = useCallback(() => {
    if (allExpenseCategories.length === 0) return null;
    const fallbackKeywords = ["divers", "miscellaneous", "مصاريف متنوعة", "مصاريف أخرى", "autre", "autres"];
    for (const kw of fallbackKeywords) {
      const matched = allExpenseCategories.find(
        (c) => c.name.toLowerCase().includes(kw) || getCanonicalCategoryKey(c.name).toLowerCase() === "miscellaneous"
      );
      if (matched) return matched;
    }
    return allExpenseCategories[0] || null;
  }, [allExpenseCategories]);

  // Filter suggested categories to only contain active ones
  const activeSuggestedCategories = useMemo(() => {
    if (!nlpPrediction?.suggested_categories) return [];
    return nlpPrediction.suggested_categories.filter((catName) =>
      Boolean(getActiveCategoryByName(catName))
    );
  }, [nlpPrediction, getActiveCategoryByName]);

  // Determine if disambiguation is needed
  const activeNeedsDisambiguation = useMemo(() => {
    if (!nlpPrediction) return false;
    if (nlpPrediction.needs_disambiguation) {
      return activeSuggestedCategories.length > 1;
    }
    return false;
  }, [nlpPrediction, activeSuggestedCategories]);

  // Compute resolved category name
  const resolvedCategoryName = useMemo(() => {
    // 1. User manual override takes absolute priority
    if (manualCategoryName && getActiveCategoryByName(manualCategoryName)) {
      return manualCategoryName;
    }

    if (!nlpPrediction) return null;

    if (activeNeedsDisambiguation) {
      return selectedDisambiguationCategoryName && getActiveCategoryByName(selectedDisambiguationCategoryName)
        ? selectedDisambiguationCategoryName
        : activeSuggestedCategories[0] || null;
    }

    if (activeSuggestedCategories.length === 1) {
      return activeSuggestedCategories[0];
    }

    if (nlpPrediction.category) {
      const matched = getActiveCategoryByName(nlpPrediction.category);
      if (matched) return matched.name;
    }

    const fallback = getFallbackCategory();
    return fallback ? fallback.name : null;
  }, [manualCategoryName, nlpPrediction, activeNeedsDisambiguation, selectedDisambiguationCategoryName, activeSuggestedCategories, getActiveCategoryByName, getFallbackCategory]);

  const resolvedCategoryId = useMemo(() => {
    if (!resolvedCategoryName) return "";
    const matched = getActiveCategoryByName(resolvedCategoryName);
    return matched?.id || "";
  }, [resolvedCategoryName, getActiveCategoryByName]);

  const resolvedDescription = useMemo(() => {
    if (!nlpPrediction) return omarText.trim();
    let desc = nlpPrediction.description || omarText.trim();
    if (resolvedCategoryId) {
      desc = desc.replace(/\b(tserkila|tsserkila|tasserkila)\b/gi, "").replace(/\s+/g, " ").trim();
    }
    return desc;
  }, [nlpPrediction, resolvedCategoryId, omarText]);

  // Debounced NLP call when typing in Ba Omar bar
  useEffect(() => {
    const query = omarText.trim();
    if (!query) {
      setNlpPrediction(null);
      setSelectedDisambiguationCategoryName(null);
      setManualCategoryName(null);
      setIsNlpLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsNlpLoading(true);
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
        setNlpPrediction(res);
        setSelectedDisambiguationCategoryName(null);
      } catch (err) {
        console.error("NLP predict failed:", err);
      } finally {
        setIsNlpLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [omarText, allExpenseCategories]);

  const [streakOpen, setStreakOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Load guest tries from localStorage
  useEffect(() => {
    if (!isGuest) return;
    try {
      const stored = localStorage.getItem("floussy.guest_omar_tries");
      if (stored !== null) {
        setGuestTries(Math.max(0, parseInt(stored, 10) || 0));
      }
    } catch {}
  }, [isGuest]);

  // Click outside to close open menus and magic preview
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (langOpen && langRef.current && !langRef.current.contains(target)) {
        setLangOpen(false);
      }
      if (streakOpen && streakRef.current && !streakRef.current.contains(target)) {
        setStreakOpen(false);
      }
      if (notificationsOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (addMenuOpen && addMenuRef.current && !addMenuRef.current.contains(target)) {
        setAddMenuOpen(false);
      }
      if (isPopoverOpen && askContainerRef.current && !askContainerRef.current.contains(target)) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [langOpen, streakOpen, notificationsOpen, addMenuOpen, isPopoverOpen]);

  // Global Keyboard shortcuts:
  // [N]: opens quick add menu / modal
  // [O]: focuses Ba Omar input field
  // [Escape]: closes dropdowns and popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLangOpen(false);
        setStreakOpen(false);
        setNotificationsOpen(false);
        setAddMenuOpen(false);
        setIsPopoverOpen(false);
        return;
      }

      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isEditing =
        ["input", "textarea", "select"].includes(activeTag) ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isEditing) return;

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setAddMenuOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === "o") {
        e.preventDefault();
        inputRef.current?.focus();
        if (omarText.trim()) setIsPopoverOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [omarText]);

  // Stop all active audio streams and speech recognition
  const stopAllAudio = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setIsRecordingAudio(false);
  };

  // High-fidelity MediaRecorder fallback (for audio files / unsupported Web Speech)
  const startMediaRecorder = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast({
        title: locale === "ar" ? "غير مدعوم" : "Non supporté",
        description:
          locale === "ar"
            ? "متصفحك لا يدعم تسجيل الصوت أو أن الاتصال غير آمن (HTTPS مطلوب)."
            : "Votre navigateur ne supporte pas le micro ou la connexion n'est pas sécurisée (HTTPS requis).",
        variant: "danger",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/aac")) {
          mimeType = "audio/aac";
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
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        const chunks = audioChunksRef.current;
        if (chunks.length === 0) return;

        const audioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setIsTranscribingAudio(true);
        setIsPopoverOpen(true);

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

          if (res.transcript) {
            setOmarText(res.transcript);
          }
          setNlpPrediction(res);
          setIsPopoverOpen(true);

          toast({
            title: locale === "ar" ? "🎙️ تم تفريغ الصوت" : "🎙️ Vocal analysé avec succès",
            description: res.transcript || res.description,
          });
        } catch (err: any) {
          console.error("Audio predict error:", err);
          toast({
            title: locale === "ar" ? "خطأ في الصوت" : "Erreur audio IA",
            description:
              err?.message ||
              (locale === "ar"
                ? "تعذر تحليل التسجيل الصوتي بالذكاء الاصطناعي."
                : "Impossible d'analyser le message audio par l'IA."),
            variant: "danger",
          });
        } finally {
          setIsTranscribingAudio(false);
        }
      };

      recorder.start(250);
      setIsRecordingAudio(true);
      setIsPopoverOpen(true);

      toast({
        title: locale === "ar" ? "🎙️ با عمر يستمع..." : "🎙️ Ba Omar vous écoute...",
        description:
          locale === "ar"
            ? "تحدث بمصروفك الآن ثم اضغط لإنهاء التسجيل والتحليل."
            : "Dites votre dépense puis réappuyez pour analyser.",
      });
    } catch (micErr: any) {
      console.warn("getUserMedia failed or denied:", micErr);
      setIsRecordingAudio(false);
      toast({
        title: locale === "ar" ? "⚠️ الميكروفون محظور" : "⚠️ Microphone bloqué",
        description:
          locale === "ar"
            ? "يرجى تفعيل إذن الميكروفون في إعدادات المتصفح."
            : "Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur.",
        variant: "danger",
      });
    }
  };

  // Voice Dictation & Audio Processing
  const toggleSpeechRecognition = () => {
    // 1. If currently recording audio or listening, stop cleanly
    if (isRecordingAudio || isListening) {
      stopAllAudio();
      return;
    }

    // 2. Try Web Speech API first for real-time live transcription (word-by-word into input)
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = locale === "ar" ? "ar-MA" : "fr-FR";

        recognition.onstart = () => {
          setIsListening(true);
          setIsPopoverOpen(true);
          toast({
            title: locale === "ar" ? "🎙️ با عمر يستمع إليك..." : "🎙️ Ba Omar vous écoute...",
            description:
              locale === "ar"
                ? "تحدث بمصروفك الآن (مثال: خسرت 150 درهم ف مرجان)"
                : "Dites votre dépense (ex: 150 dh courses Marjane)",
          });
        };

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            setOmarText(transcript);
            setIsPopoverOpen(true);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech error:", event.error);
          setIsListening(false);
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            toast({
              title: locale === "ar" ? "⚠️ الميكروفون محظور" : "⚠️ Microphone bloqué",
              description:
                locale === "ar"
                  ? "يرجى السماح بالوصول إلى الميكروفون في إعدادات المتصفح."
                  : "Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur.",
              variant: "danger",
            });
          } else if (event.error !== "no-speech") {
            // Fallback to MediaRecorder audio upload
            startMediaRecorder();
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn("SpeechRecognition failed, falling back to MediaRecorder:", err);
      }
    }

    // 3. Fallback to MediaRecorder if Web Speech is unavailable
    startMediaRecorder();
  };

  // Open in full quick transaction modal
  const handleOpenInFullModal = (
    draftOverride?:
      | {
          amount: string;
          category_id?: string;
          occurred_on: string;
          description: string;
        }
      | React.MouseEvent
  ) => {
    if (draftOverride && "amount" in draftOverride) {
      openQuickTx("expense", draftOverride);
      setIsPopoverOpen(false);
      setOmarText("");
      return;
    }

    const fallbackMatch = omarText.match(/(\d+[\d\s,.]*)/);
    const parsedFallbackAmt = fallbackMatch
      ? parseFloat(fallbackMatch[1].replace(/\s+/g, "").replace(",", ".")) || 0
      : 0;

    const effectiveAmount =
      nlpPrediction && nlpPrediction.amount !== null
        ? String(nlpPrediction.amount)
        : parsedFallbackAmt > 0
        ? String(parsedFallbackAmt)
        : "";

    openQuickTx("expense", {
      amount: effectiveAmount,
      category_id: resolvedCategoryId || undefined,
      occurred_on: nlpPrediction?.date || getLocalTodayISO(),
      description: resolvedDescription || omarText,
    });
    setIsPopoverOpen(false);
    setOmarText("");
  };

  // Submit Ba Omar text (with smart category and amount resolution)
  const handleAskOmar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = omarText.trim();
    if (!query) return;

    if (isGuest && guestTries <= 0) {
      toast({
        title: locale === "ar" ? "وضع الاكتشاف" : "Mode Découverte",
        description:
          locale === "ar"
            ? "سجل حسابك مجاناً للاستفادة الكاملة من با عمر."
            : "Crée un compte gratuit pour utiliser Ba Omar en illimité.",
      });
      return;
    }

    // Determine amount: prioritize NLP extracted amount, otherwise fallback regex
    const fallbackMatch = query.match(/(\d+[\d\s,.]*)/);
    const parsedFallbackAmt = fallbackMatch
      ? parseFloat(fallbackMatch[1].replace(/\s+/g, "").replace(",", ".")) || 0
      : 0;

    const effectiveAmount =
      nlpPrediction && nlpPrediction.amount !== null
        ? Number(nlpPrediction.amount)
        : parsedFallbackAmt > 0
        ? parsedFallbackAmt
        : null;

    if (effectiveAmount !== null && effectiveAmount > 0) {
      if (isGuest) {
        setGuestTries((prev) => {
          const next = Math.max(0, prev - 1);
          try {
            localStorage.setItem("floussy.guest_omar_tries", String(next));
          } catch {}
          return next;
        });
      }

      try {
        setIsSubmitting(true);
        const targetCatId = resolvedCategoryId || getFallbackCategory()?.id || undefined;
        const targetDate = nlpPrediction?.date || getLocalTodayISO();
        const targetDesc = resolvedDescription || query;

        const res = await apiFetch<TransactionOut>("/transactions", {
          method: "POST",
          body: {
            amount: effectiveAmount.toFixed(2),
            type: "expense",
            occurred_on: targetDate,
            category_id: targetCatId,
            description: targetDesc,
          },
        });

        // Trigger background NLP feedback if category was predicted
        if (nlpPrediction?.description && resolvedCategoryName) {
          apiFetch("/nlp/feedback", {
            method: "POST",
            body: {
              keyword: nlpPrediction.description,
              category_name: resolvedCategoryName,
            },
          }).catch(() => null);
        }

        setLastOmarTxId(res.id);
        const formattedAmt = effectiveAmount.toLocaleString("fr-FR", {
          maximumFractionDigits: 2,
        });
        const catNameFormatted = resolvedCategoryName
          ? localizeCategoryName(resolvedCategoryName, locale)
          : "";

        const replyText =
          locale === "ar"
            ? `با عمر: قيدت ${formattedAmt} ${user?.currency ?? "درهم"} فـ ${catNameFormatted || "المصاريف"}. تم تحديث الحسابات مباشرة.`
            : `Ba Omar : c’est noté, ${formattedAmt} ${user?.currency ?? "MAD"} enregistrés dans ${catNameFormatted || "tes dépenses"}.`;

        setOmarReply(replyText);
        toast({
          title: locale === "ar" ? "عملية مسجلة من با عمر ✨" : "Dépense enregistrée ✨",
          description: `${formattedAmt} ${user?.currency ?? "MAD"} • ${catNameFormatted || "Dépense"}`,
          variant: "success",
        });

        setOmarText("");
        setIsPopoverOpen(false);
        setNlpPrediction(null);
        setSelectedDisambiguationCategoryName(null);
        setManualCategoryName(null);
        window.dispatchEvent(new CustomEvent("floussy:data-updated"));
        return;
      } catch (err: any) {
        toast({
          title: locale === "ar" ? "خطأ" : "Erreur",
          description:
            err?.message ||
            (locale === "ar"
              ? "تعذر تسجيل العملية"
              : "Impossible d'enregistrer la dépense"),
          variant: "danger",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Conversational question or advice: navigate to Ba Omar AI chat
    setOmarText("");
    setIsPopoverOpen(false);
    router.push(`/chat?q=${encodeURIComponent(query)}`);
  };

  // Undo transaction created by Ba Omar
  const handleUndoOmar = async () => {
    if (!lastOmarTxId) return;
    try {
      await apiFetch(`/transactions/${lastOmarTxId}`, { method: "DELETE" });
      toast({
        title: locale === "ar" ? "تم التراجع" : "Annulé",
        description:
          locale === "ar"
            ? "تم حذف العملية بنجاح."
            : "La dépense a bien été annulée.",
        variant: "success",
      });
      setLastOmarTxId(null);
      setOmarReply(null);
      window.dispatchEvent(new CustomEvent("floussy:data-updated"));
    } catch {
      toast({
        title: locale === "ar" ? "خطأ" : "Erreur",
        description:
          locale === "ar" ? "تعذر التراجع عن العملية." : "Impossible d'annuler.",
        variant: "danger",
      });
    }
  };

  const userInitial = isGuest
    ? "I"
    : user?.first_name?.[0]?.toUpperCase() ||
      user?.email?.[0]?.toUpperCase() ||
      "O";

  return (
    <div style={{ width: "100%" }}>
      <header className="dsh-hdr">
        {/* Mobile Hamburger button */}
        <button
          type="button"
          onClick={() => {
            if (onOpenMobileNav) onOpenMobileNav();
            else
              window.dispatchEvent(new CustomEvent("floussy:open-mobile-nav"));
          }}
          className="flex lg:hidden items-center justify-center p-2 rounded-xl text-[var(--dsh-ink)] hover:bg-[var(--dsh-soft)] border border-[var(--dsh-line)]"
          aria-label={locale === "ar" ? "القائمة" : "Ouvrir le menu"}
        >
          <Menu size={20} />
        </button>

        {/* Ba Omar smart prompt bar with Real-time Magic Detection HUD */}
        <div
          ref={askContainerRef}
          style={{
            position: "relative",
            flex: "1 1 360px",
            maxWidth: 640,
            width: "100%",
          }}
        >
          <form
            className="dsh-ask"
            onSubmit={handleAskOmar}
            style={{
              width: "100%",
              maxWidth: "100%",
              borderColor: isListening || isRecordingAudio ? "#EF4444" : undefined,
              boxShadow:
                isListening || isRecordingAudio
                  ? "0 0 0 2px rgba(239, 68, 68, 0.35), 0 4px 14px rgba(239, 68, 68, 0.15)"
                  : undefined,
              transition: "all 0.25s ease",
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                flexShrink: 0,
                background: "#F2B544",
                color: "#0F1A16",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Cairo, sans-serif",
                fontWeight: 800,
                fontSize: 16,
              }}
              title="Ba Omar [O]"
            >
              ع
            </span>

            <input
              ref={inputRef}
              value={omarText}
              onChange={(e) => {
                setOmarText(e.target.value);
                if (e.target.value.trim()) setIsPopoverOpen(true);
              }}
              onFocus={() => {
                if (omarText.trim() || isListening || isRecordingAudio) setIsPopoverOpen(true);
              }}
              disabled={isSubmitting}
              aria-label="Demander à Ba Omar"
              placeholder={
                isListening || isRecordingAudio
                  ? locale === "ar"
                    ? "🎙️ با عمر يستمع إليك... تحدث بمصروفك الآن"
                    : "🎙️ Ba Omar vous écoute... Parlez maintenant"
                  : isTranscribingAudio
                  ? locale === "ar"
                    ? "⏳ جاري تفريغ الصوت وتحليل المصروف..."
                    : "⏳ Analyse audio IA en cours..."
                  : locale === "ar"
                  ? "كتب ولا قول مصروف… (خسرت 150 فالمارشي)"
                  : "Écris ou dis une dépense… (khsert 150 f lmarche)"
              }
              style={{
                flex: 1,
                minWidth: 0,
                border: 0,
                outline: 0,
                background: "transparent",
                color: "var(--dsh-ink)",
                fontFamily: "inherit",
                fontSize: 14.5,
                fontWeight: 500,
              }}
            />

            {isGuest && (
              <span
                style={{
                  flexShrink: 0,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: "var(--dsh-warn-soft)",
                  color: "var(--dsh-warn-ink)",
                  fontSize: 11.5,
                  fontWeight: 800,
                }}
              >
                {locale === "ar"
                  ? `${guestTries} محاولات متبقية`
                  : `${guestTries} essai${guestTries > 1 ? "s" : ""} restant${
                      guestTries > 1 ? "s" : ""
                    }`}
              </span>
            )}

            <button
              type="button"
              aria-label={locale === "ar" ? "هضر مع با عمر" : "Parler à Ba Omar"}
              onClick={() => setIsVoiceModalOpen(true)}
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                border: 0,
                borderRadius: 18,
                background: isVoiceModalOpen
                  ? "rgba(10, 122, 83, 0.18)"
                  : "transparent",
                color: isVoiceModalOpen
                  ? "#0A7A53"
                  : "var(--dsh-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title={
                locale === "ar"
                  ? "هضر مع با عمر (تسجيل صوتي ذكي)"
                  : "Parler à Ba Omar (mode vocal intelligent)"
              }
            >
              <Mic
                size={18}
                className={isVoiceModalOpen ? "animate-pulse" : ""}
                strokeWidth={2}
              />
            </button>

            <button
              type="submit"
              aria-label="Envoyer"
              disabled={isSubmitting}
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                border: 0,
                borderRadius: 18,
                background: "#0A7A53",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(10, 122, 83, 0.35)",
              }}
            >
              <ArrowRight
                size={16}
                strokeWidth={2.6}
                style={{ transform: isRTL ? "scaleX(-1)" : "none" }}
              />
            </button>
          </form>

          {/* Floating Magic Detection HUD / Popover */}
          {isPopoverOpen && (omarText.trim().length > 0 || isListening || isRecordingAudio || isTranscribingAudio) && (
            <div
              role="region"
              aria-label="Magic AI Preview"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                zIndex: 100,
                boxShadow:
                  "0 20px 40px -10px rgba(10, 122, 83, 0.18), 0 0 0 1px rgba(10, 122, 83, 0.12)",
              }}
              className="rounded-2xl border border-[var(--dsh-brand-soft)] bg-white/95 dark:bg-[#101b17]/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl transition-all duration-200 animate-in fade-in slide-in-from-top-2"
            >
              {/* Header inside HUD */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-400/20 text-amber-600 dark:text-amber-400">
                    <Sparkles size={14} className="animate-spin-slow" />
                  </span>
                  <span className="text-xs font-extrabold text-[var(--dsh-ink)]">
                    {locale === "ar"
                      ? "با عمر — المعاينة الذكية للمصروف"
                      : "Ba Omar — Aperçu Intelligent"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isTranscribingAudio ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 animate-pulse">
                      <Loader2 size={11} className="animate-spin" />
                      {locale === "ar" ? "تفريغ الصوت..." : "Transcription IA..."}
                    </span>
                  ) : isListening || isRecordingAudio ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                      {locale === "ar" ? "استماع مباشر..." : "Écoute en direct..."}
                    </span>
                  ) : isNlpLoading ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse">
                      <Loader2 size={11} className="animate-spin" />
                      {locale === "ar" ? "جاري التحليل..." : "Analyse IA..."}
                    </span>
                  ) : nlpPrediction?.amount !== null && nlpPrediction?.amount !== undefined ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={11} />
                      {locale === "ar" ? "مصروف مكتشف" : "Dépense détectée"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <MessageSquareText size={11} />
                      {locale === "ar" ? "سؤال / محادثة" : "Question Ba Omar"}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsPopoverOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
                    aria-label="Fermer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Active Voice Listening / Recording Status Banner */}
              {(isListening || isRecordingAudio) && (
                <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex items-center justify-center">
                      <span className="w-7 h-7 rounded-full bg-red-500/25 animate-ping absolute" />
                      <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm">
                        <Mic size={14} className="animate-pulse" />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 block">
                        {locale === "ar"
                          ? "🎙️ با عمر يستمع إليك... تحدث بمصروفك الآن"
                          : "🎙️ Ba Omar vous écoute... Parlez maintenant"}
                      </span>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block">
                        {locale === "ar"
                          ? "مثال: «خسرت 150 فالمارشي» أو «30 طاكسي»"
                          : "Ex: « 150 dh courses Marjane » ou « 30 dh taxi »"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Check size={13} strokeWidth={2.5} />
                    <span>{locale === "ar" ? "إنهاء وتحليل ✓" : "Arrêter et analyser ✓"}</span>
                  </button>
                </div>
              )}

              {/* Transcribing Audio Loader Banner */}
              {isTranscribingAudio && (
                <div className="mb-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center gap-2.5 text-purple-700 dark:text-purple-300 animate-pulse">
                  <Loader2 size={16} className="animate-spin text-purple-600" />
                  <span className="text-xs font-semibold">
                    {locale === "ar"
                      ? "جاري تفريغ الصوت وتحليل المصروف بالذكاء الاصطناعي..."
                      : "Transcription et analyse de votre vocal par l'IA..."}
                  </span>
                </div>
              )}

              {/* Body: when amount or valid draft detected */}
              {(nlpPrediction?.amount !== null && nlpPrediction?.amount !== undefined) ||
              Boolean(omarText.match(/(\d+[\d\s,.]*)/)) ? (
                <div className="space-y-3">
                  {/* Grid Cards (Amount, Category, Date, Description) */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {/* Amount Card */}
                    <div className="flex flex-col gap-1 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm">
                      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                        <span className="text-xs">💰</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {locale === "ar" ? "المبلغ" : "Montant"}
                        </span>
                      </div>
                      <span className="font-extrabold text-sm text-red-600 dark:text-red-400">
                        {nlpPrediction?.amount !== null && nlpPrediction?.amount !== undefined
                          ? `${nlpPrediction.amount.toLocaleString("fr-FR")} ${
                              user?.currency ?? "MAD"
                            }`
                          : omarText.match(/(\d+[\d\s,.]*)/)
                          ? `${parseFloat(
                              omarText
                                .match(/(\d+[\d\s,.]*)/)![1]
                                .replace(/\s+/g, "")
                                .replace(",", ".")
                            ).toLocaleString("fr-FR")} ${user?.currency ?? "MAD"}`
                          : "—"}
                      </span>
                    </div>

                    {/* Category Card with interactive envelope switcher */}
                    <div className="flex flex-col gap-1 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm transition-all">
                      <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="text-xs">🏷️</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {locale === "ar" ? "الفئة" : "Catégorie"}
                          </span>
                        </div>
                        {manualCategoryName ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            {locale === "ar" ? "تعديلك ✏️" : "Manuel ✏️"}
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                            {locale === "ar" ? "تغيير ▾" : "Modifier ▾"}
                          </span>
                        )}
                      </div>
                      <div className="relative mt-0.5">
                        <select
                          value={resolvedCategoryName || ""}
                          onChange={(e) => {
                            setManualCategoryName(e.target.value);
                            setSelectedDisambiguationCategoryName(e.target.value);
                          }}
                          className="w-full appearance-none bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg py-1 px-2.5 pe-6 text-xs font-bold text-emerald-800 dark:text-emerald-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all truncate"
                          title={
                            locale === "ar"
                              ? "انقر لتغيير الفئة إذا أخطأ الذكاء الاصطناعي"
                              : "Cliquez pour changer la catégorie si l'IA s'est trompée"
                          }
                        >
                          {allExpenseCategories.map((c) => (
                            <option
                              key={c.id}
                              value={c.name}
                              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium"
                            >
                              {localizeCategoryName(c.name, locale)}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-emerald-600 dark:text-emerald-400">
                          <ChevronDown size={12} strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>

                    {/* Date Card */}
                    <div className="flex flex-col gap-1 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm">
                      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                        <span className="text-xs">📅</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {locale === "ar" ? "التاريخ" : "Date"}
                        </span>
                      </div>
                      <span className="font-medium text-xs text-slate-700 dark:text-slate-300">
                        {nlpPrediction?.date
                          ? formatLocaleDate(nlpPrediction.date, locale)
                          : locale === "ar"
                          ? "اليوم"
                          : "Aujourd'hui"}
                      </span>
                    </div>

                    {/* Description Card */}
                    <div className="flex flex-col gap-1 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm">
                      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                        <span className="text-xs">💬</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {locale === "ar" ? "البيان" : "Description"}
                        </span>
                      </div>
                      <span
                        className="font-medium text-xs text-slate-700 dark:text-slate-300 truncate"
                        title={resolvedDescription}
                      >
                        {resolvedDescription || omarText}
                      </span>
                    </div>
                  </div>

                  {/* Disambiguation chips if multiple categories match */}
                  {activeNeedsDisambiguation && activeSuggestedCategories.length > 1 && (
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <p className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        {locale === "ar"
                          ? "🔍 اختر الفئة الأنسب:"
                          : "🔍 Précisez la catégorie :"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeSuggestedCategories.map((catName) => {
                          const isSelected =
                            resolvedCategoryName?.toLowerCase() ===
                            catName.toLowerCase();
                          return (
                            <button
                              key={catName}
                              type="button"
                              onClick={() => setSelectedDisambiguationCategoryName(catName)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                                  : "border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-emerald-400"
                              }`}
                            >
                              {isSelected && <span className="mr-1">✓</span>}
                              {localizeCategoryName(catName, locale)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAskOmar()}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                      <Check size={15} strokeWidth={2.8} />
                      <span>
                        {locale === "ar"
                          ? "قيد المصروف فوراً (Enter)"
                          : "Enregistrer la dépense (Entrée)"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenInFullModal}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                      title={
                        locale === "ar"
                          ? "تعديل في النموذج الكامل"
                          : "Modifier dans le formulaire complet"
                      }
                    >
                      <ExternalLink size={13} />
                      <span className="hidden sm:inline">
                        {locale === "ar" ? "تعديل" : "Modifier"}
                      </span>
                    </button>
                  </div>
                </div>
              ) : isListening || isRecordingAudio ? (
                /* Listening active indicator when nothing transcribed yet */
                <div className="py-3 px-2 text-center text-xs text-slate-500 dark:text-slate-400">
                  <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {locale === "ar"
                      ? "جاري الاستماع... قل المصروف بصوت واضح"
                      : "Écoute en cours... Parlez distinctement"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {locale === "ar"
                      ? "سيظهر النص هنا وتُحدد الفئة والمبلغ تلقائياً"
                      : "Le texte s'affichera ici en direct avec la détection automatique"}
                  </p>
                </div>
              ) : (
                /* Conversational view (no price detected) */
                <div className="space-y-2.5 py-1">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-700 dark:text-slate-200">
                    <span className="text-base select-none mt-0.5">💬</span>
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-amber-800 dark:text-amber-300 mb-0.5">
                        {locale === "ar"
                          ? "سؤال أو استشارة مالية لـ با عمر"
                          : "Question ou conseil financier pour Ba Omar"}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {locale === "ar"
                          ? "اضغط Enter لبدء المحادثة، أو اكتب مبلغا (مثال: خسرت 150 فالمارشي) لتسجيل مصروف."
                          : "Appuyez sur Entrée pour discuter, ou ajoutez un montant (ex: 150 dh taxi) pour enregistrer une dépense."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAskOmar()}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquareText size={14} />
                    <span>
                      {locale === "ar"
                        ? "طرح السؤال على با عمر (Enter)"
                        : "Discuter avec Ba Omar (Entrée)"}
                    </span>
                  </button>
                </div>
              )}

              {/* Bottom hint */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10.5px] text-slate-400">
                <span>
                  💡{" "}
                  {locale === "ar"
                    ? 'مثال: "خسرت 150 فالمارشي" أو "30 طاكسي"'
                    : 'Exemple: "khsert 150 f lmarche" ou "30dh taxi"'}
                </span>
                <span className="font-mono text-[9.5px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  ESC للغلق
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action icons & buttons */}
        <div className="dsh-act">
          {/* Quick Language Selector (Dropdown window matching notifications style) */}
          <div ref={langRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setLangOpen(!langOpen);
                setStreakOpen(false);
                setNotificationsOpen(false);
                setAddMenuOpen(false);
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                border: langOpen
                  ? "1px solid var(--dsh-brand-soft)"
                  : "1px solid var(--dsh-line)",
                background: langOpen
                  ? "var(--dsh-brand-soft)"
                  : "var(--dsh-card)",
                color: langOpen
                  ? "var(--dsh-brand-ink)"
                  : "var(--dsh-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                transition: "all 0.15s ease",
              }}
              title="Langue / اللغة"
              aria-label="Changer de langue"
              aria-expanded={langOpen}
            >
              <Globe size={18} />
            </button>

            {langOpen && (
              <div
                role="dialog"
                aria-label="Sélection de la langue"
                style={{
                  position: "absolute",
                  top: 48,
                  [isRTL ? "left" : "right"]: 0,
                  zIndex: 50,
                  width: 230,
                  borderRadius: 16,
                  background: "var(--dsh-card)",
                  boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
                  padding: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  border: "1px solid var(--dsh-line)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px 8px",
                    borderBottom: "1px solid var(--dsh-line)",
                    marginBottom: 2,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Globe size={14} style={{ color: "var(--dsh-muted)" }} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "var(--dsh-muted)",
                      }}
                    >
                      {locale === "ar" ? "اللغة" : "Langue"}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: 6,
                      background: "var(--dsh-brand-soft)",
                      color: "var(--dsh-brand-ink)",
                    }}
                  >
                    {locale.toUpperCase()}
                  </span>
                </div>

                {[
                  { code: "fr", label: "Français", flag: "🇫🇷" },
                  { code: "ar", label: "الدارجة (العربية)", flag: "🇲🇦" },
                  { code: "en", label: "English", flag: "🇬🇧" },
                ].map((item) => {
                  const isSelected = locale === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        setAppLocale(item.code as FloussyLocale);
                        setLangOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: isSelected
                          ? "1px solid var(--dsh-brand-soft)"
                          : "1px solid transparent",
                        background: isSelected
                          ? "var(--dsh-brand-soft)"
                          : "transparent",
                        color: isSelected
                          ? "var(--dsh-brand-ink)"
                          : "var(--dsh-ink)",
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        textAlign: isRTL ? "right" : "left",
                        width: "100%",
                      }}
                      className="hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{item.flag}</span>
                        <span>{item.label}</span>
                      </div>
                      {isSelected && (
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            background: "#0A7A53",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Guest Mode Pill */}
          {isGuest ? (
            <Link
              href="/register"
              style={{
                height: 38,
                padding: "0 12px",
                border: 0,
                borderRadius: 19,
                background: "var(--dsh-brand-soft)",
                color: "var(--dsh-brand-ink)",
                fontSize: 13,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "#0A7A53",
                }}
              />
              {locale === "ar" ? "وضع الاكتشاف" : "Mode Découverte"}
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "var(--dsh-warn-soft)",
                  color: "var(--dsh-warn-ink)",
                }}
              >
                40 %
              </span>
            </Link>
          ) : (
            <>
              {/* Streak Flame Popover */}
              <div ref={streakRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setStreakOpen(!streakOpen);
                    setNotificationsOpen(false);
                    setAddMenuOpen(false);
                    setLangOpen(false);
                  }}
                  style={{
                    height: 40,
                    padding: "0 12px",
                    borderRadius: 20,
                    background: "var(--dsh-card)",
                    color: "var(--dsh-ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    border: "1px solid var(--dsh-line)",
                  }}
                >
                  <Flame size={18} color="#E8590C" fill="#E8590C" />
                  {effectiveStreakDays}
                </button>

                {streakOpen && (
                  <div
                    role="dialog"
                    style={{
                      position: "absolute",
                      top: 48,
                      [isRTL ? "left" : "right"]: 0,
                      zIndex: 50,
                      width: 290,
                      borderRadius: 18,
                      background: "var(--dsh-card)",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                      padding: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      border: "1px solid var(--dsh-line)",
                    }}
                  >
                    <b style={{ fontSize: 15 }}>
                      {locale === "ar"
                        ? `${effectiveStreakDays} يوم متتالية من التتبع`
                        : `${effectiveStreakDays} jour${
                            effectiveStreakDays > 1 ? "s" : ""
                          } de suivi d’affilée`}
                    </b>
                    <span
                      style={{
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: "var(--dsh-muted)",
                      }}
                    >
                      {locale === "ar"
                        ? "سجّل مصاريفك بانتظام كل نهار باش تحافظ على الترتيب ديالك فـ 7sabek."
                        : "Suis tes dépenses au quotidien pour maintenir ta série active."}
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          setStreakOpen(false);
                          openQuickTx("expense");
                        }}
                        style={{
                          flex: 1,
                          height: 38,
                          border: 0,
                          borderRadius: 10,
                          background: "#0A7A53",
                          color: "#FFFFFF",
                          fontWeight: 800,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {locale === "ar" ? "تقييد مصروف" : "Saisir dépenses"}
                      </button>
                      <Link
                        href="/gamification"
                        onClick={() => setStreakOpen(false)}
                        style={{
                          height: 38,
                          padding: "0 12px",
                          borderRadius: 10,
                          border: "1px solid var(--dsh-line)",
                          background: "var(--dsh-soft)",
                          color: "var(--dsh-ink)",
                          fontWeight: 700,
                          fontSize: 13,
                          display: "flex",
                          alignItems: "center",
                          textDecoration: "none",
                        }}
                      >
                        {locale === "ar" ? "الترتيب" : "Ranking"}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Real Notifications Bell */}
              <div ref={notifRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setStreakOpen(false);
                    setAddMenuOpen(false);
                    setLangOpen(false);
                  }}
                  style={{
                    position: "relative",
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    background: "var(--dsh-card)",
                    color: "var(--dsh-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    border: "1px solid var(--dsh-line)",
                  }}
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        [isRTL ? "left" : "right"]: 4,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        background: "#C2381A",
                        color: "#FFFFFF",
                        fontSize: 11,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 4px",
                      }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    role="dialog"
                    style={{
                      position: "absolute",
                      top: 50,
                      [isRTL ? "left" : "right"]: 0,
                      zIndex: 50,
                      width: 350,
                      maxWidth: "calc(100vw - 32px)",
                      borderRadius: 18,
                      background: "var(--dsh-card)",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                      padding: 10,
                      display: "flex",
                      flexDirection: "column",
                      border: "1px solid var(--dsh-line)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--dsh-line)",
                      }}
                    >
                      <b style={{ fontSize: 14 }}>
                        {locale === "ar" ? "الإشعارات" : "Notifications"}
                      </b>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          style={{
                            border: 0,
                            background: "transparent",
                            color: "#0A7A53",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {locale === "ar" ? "قراءة الكل" : "Tout marquer lu"}
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: 340, overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <div
                          style={{
                            padding: "24px 12px",
                            textAlign: "center",
                            fontSize: 13,
                            color: "var(--dsh-muted)",
                          }}
                        >
                          {locale === "ar"
                            ? "الميزانية ديالك مضبوطة، ما كاين حتى إشعار."
                            : "Ton budget est à jour, aucune alerte."}
                        </div>
                      ) : (
                        notifications.map((nt) => {
                          const isUnread = !readNotificationIds.includes(nt.id);
                          return (
                            <div
                              key={nt.id}
                              style={{
                                padding: 12,
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                borderBottom: "1px solid var(--dsh-line)",
                                background: isUnread
                                  ? "rgba(10, 122, 83, 0.04)"
                                  : "transparent",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 8,
                                }}
                              >
                                {isUnread && (
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: 3,
                                      background: "#0A7A53",
                                      marginTop: 6,
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <span
                                  style={{
                                    fontSize: 13.5,
                                    lineHeight: 1.4,
                                    flex: 1,
                                  }}
                                >
                                  <b>{nt.title}</b> — {nt.description}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    markNotificationRead(nt.id);
                                    setNotificationsOpen(false);
                                    if (nt.onSelect) nt.onSelect();
                                    else if (nt.href) router.push(nt.href);
                                  }}
                                  style={{
                                    height: 30,
                                    padding: "0 12px",
                                    border: 0,
                                    borderRadius: 8,
                                    background: "#0A7A53",
                                    color: "#FFFFFF",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  {locale === "ar" ? "رؤية" : "Consulter"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markNotificationRead(nt.id)}
                                  style={{
                                    height: 30,
                                    padding: "0 12px",
                                    border: 0,
                                    borderRadius: 8,
                                    background: "var(--dsh-soft)",
                                    color: "var(--dsh-ink)",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  {locale === "ar" ? "تجاهل" : "Ignorer"}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div
                      style={{
                        padding: "8px 12px",
                        borderTop: "1px solid var(--dsh-line)",
                        textAlign: "center",
                      }}
                    >
                      <Link
                        href="/notifications"
                        onClick={() => setNotificationsOpen(false)}
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#0A7A53",
                          textDecoration: "none",
                        }}
                      >
                        {locale === "ar"
                          ? "مركز الإشعارات الكامل →"
                          : "Centre de notifications →"}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Quick Add Button: "+ Ajouter [N]" */}
          <div ref={addMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => {
                setAddMenuOpen(!addMenuOpen);
                setStreakOpen(false);
                setNotificationsOpen(false);
              }}
              className="dsh-act-primary"
              style={{
                height: 44,
                padding: "0 10px 0 16px",
                border: 0,
                borderRadius: 12,
                background: "var(--dsh-ink)",
                color: "var(--dsh-bg)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14.5,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Plus size={18} strokeWidth={2.6} />
              {locale === "ar" ? "إضافة" : "Ajouter"}
              <kbd
                style={{
                  padding: "2px 7px",
                  borderRadius: 6,
                  background: "rgba(127,127,127,0.25)",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
              >
                N
              </kbd>
            </button>

            {addMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: 52,
                  [isRTL ? "left" : "right"]: 0,
                  zIndex: 50,
                  width: 200,
                  borderRadius: 16,
                  background: "var(--dsh-card)",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
                  padding: 6,
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid var(--dsh-line)",
                }}
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setAddMenuOpen(false);
                    openQuickTx("expense");
                  }}
                  style={{
                    height: 42,
                    padding: "0 12px",
                    border: 0,
                    borderRadius: 10,
                    background: "transparent",
                    color: "var(--dsh-ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      background: "#C2185B",
                    }}
                  />
                  {locale === "ar" ? "مصروف" : "Dépense"}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setAddMenuOpen(false);
                    openQuickTx("income");
                  }}
                  style={{
                    height: 42,
                    padding: "0 12px",
                    border: 0,
                    borderRadius: 10,
                    background: "transparent",
                    color: "var(--dsh-ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      background: "#4338CA",
                    }}
                  />
                  {locale === "ar" ? "دخل" : "Revenu"}
                </button>
              </div>
            )}
          </div>

          {/* User Avatar Circle */}
          <Link
            href="/settings"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: isGuest
                ? "#8A968F"
                : "linear-gradient(135deg, #00D284, #0A7A53)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 15,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
            title={user?.email || "Compte"}
          >
            {userInitial}
          </Link>
        </div>
      </header>

      {/* Ba Omar feedback banner if a quick transaction or reply occurred */}
      {omarReply && (
        <div
          role="status"
          style={{
            margin: "12px 16px 0",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            borderRadius: 18,
            background: "var(--dsh-brand-soft)",
            color: "var(--dsh-brand-ink)",
            boxShadow: "0 2px 10px rgba(10, 122, 83, 0.08)",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#0A7A53",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            ع
          </span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
            <b>Ba Omar :</b> {omarReply}
          </span>
          {lastOmarTxId && (
            <button
              type="button"
              onClick={handleUndoOmar}
              style={{
                padding: "6px 14px",
                border: 0,
                borderRadius: 10,
                background: "#FFFFFF",
                color: "#0F1A16",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {locale === "ar" ? "تراجع" : "Annuler"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOmarReply(null)}
            style={{
              padding: "6px 10px",
              border: 0,
              background: "transparent",
              color: "var(--dsh-brand-ink)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}
      {/* Ba Omar Dedicated Voice Modal (Reference Design) */}
      <BaOmarVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        locale={locale === "ar" ? "ar" : "fr"}
        userCurrency={user?.currency ?? "MAD"}
        categoriesData={categoriesData as any}
        isGuest={isGuest}
        onSuccessTransaction={(tx) => {
          setLastOmarTxId(tx.id);
        }}
        onOpenInFullModal={handleOpenInFullModal}
        onFocusSearchInput={() => {
          inputRef.current?.focus();
        }}
      />
    </div>
  );
};
