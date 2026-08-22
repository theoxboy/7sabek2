"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Flame,
  Coins,
  ShieldCheck,
  Check,
  Bot,
  User,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Shield,
  Activity,
  Send,
  ChevronRight,
} from "lucide-react";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import { apiFetch } from "@/lib/api";
import type { UserOut } from "@/lib/types";

const CHAT_STORAGE_KEY = "floussy.chat.messages";

// Shared Notification Type
interface NotificationItem {
  id: string;
  type: "security" | "budget" | "system" | "savings";
  title: string;
  description: string;
  time: string;
  read: boolean;
  important?: boolean;
}

const CHAT_COPY = {
  fr: {
    back: "Retour",
    title: "7sabek AI Smart Conseiller",
    version: "v2.5",
    clear: "Effacer",
    deleteConversation: "Supprimer la conversation",
    placeholder: "Posez votre question à 7sabek AI...",
    welcomeUnread: (userName: string, unreadCount: number) =>
      `Bonjour ${userName} ! Je suis l'assistant intelligent **7sabek AI** 🪙.\n\n` +
      `Je vois que vous avez actuellement **${unreadCount} alerte(s) de sécurité ou de budget** non lue(s).\n\n` +
      `Souhaitez-vous que je les analyse ou que nous fassions une simulation de dépenses ?\n\n` +
      `[bouton: 🔍 Analyser mes alertes]\n` +
      `[bouton: 📈 Simuler un budget]\n` +
      `[bouton: 🔐 Conseil ShieldKey]`,
    welcomeClean: (userName: string) =>
      `Bonjour ${userName} ! Je suis l'assistant intelligent **7sabek AI** 🪙.\n\n` +
      `Toutes vos notifications sont lues. Votre compte est en parfaite sécurité et votre budget est stable !\n\nComment puis-je vous aider aujourd'hui ?\n\n` +
      `[bouton: 📈 Simuler un budget]\n` +
      `[bouton: 💡 Conseils d'épargne]\n` +
      `[bouton: 💸 Expliquer Cash Split]`,
    suggestionsTitle: "Suggestions 7sabek AI :",
    copied: "Copié !",
    copy: "Copier",
    errorConnect: "Oups ! Je rencontre une difficulté pour me connecter au serveur chiffré ShieldKey. Veuillez vérifier que la connexion est établie et réessayez.",
    shortcutsTitle: "Raccourcis d'Assistance Floussy",
    shortcutsDesc: "Sélectionnez un sujet prioritaire pour guider instantanément votre conseiller :",
    shortcutSecurityTitle: "🛡️ Sécurité & Connexions",
    shortcutSecurityPrompt: "Analyser mes alertes de la sécurité",
    shortcutSecurityDesc: "Évaluer l'intégrité de connexion ShieldKey et se prémunir du vol de code PIN.",
    shortcutBudgetTitle: "🔥 Enveloppes & Budgets",
    shortcutBudgetPrompt: "Comment économiser et optimiser mon budget ?",
    shortcutBudgetDesc: "Maximiser la discipline \"Cash Split\" quotidienne pour stabiliser la trésorerie.",
    shortcutSavingsTitle: "💎 Bonus d'Épargne Proactifs",
    shortcutSavingsPrompt: "Comment puis-je débloquer mon bonus d'épargne et augmenter mon score Floussy ?",
    shortcutSavingsDesc: "Analyse des règles automatiques de discipline d'épargne avec gains réels.",
    shortcutSystemTitle: "🔒 Intégrité Cryptographique",
    shortcutSystemPrompt: "Comment fonctionne le chiffrement ShieldKey de l'application Floussy ?",
    shortcutSystemDesc: "Détails sur l'isolation cryptographique locale et l'authentification de session unique.",
    send: "Envoyer",
    disclaimer: "7sabek AI s'appuie sur Gemini pour formuler des conseils indicatifs",
    intelTitle: "Analyse d'Alertes Actives",
    intelUnread: "Non lues",
    intelScore: "Score IP",
    intelClick: "Cliquez pour analyser :",
    intelChannel: "Canal LLM",
    intelEncryption: "Chiffrement local",
    intelConn: "Connexion",
    intelLinkTitle: "Lien Intelligent",
    intelLinkDesc: "Le conseiller AI a un accès direct chiffré à vos notifications. Cliquez sur une alerte ci-dessus pour la charger automatiquement !",
  },
  en: {
    back: "Back",
    title: "7sabek AI Smart Advisor",
    version: "v2.5",
    clear: "Clear",
    deleteConversation: "Delete conversation",
    placeholder: "Ask 7sabek AI your question...",
    welcomeUnread: (userName: string, unreadCount: number) =>
      `Hello ${userName}! I am your smart assistant **7sabek AI** 🪙.\n\n` +
      `I see you currently have **${unreadCount} unread security or budget alert(s)**.\n\n` +
      `Would you like me to analyze them or run a spending simulation?\n\n` +
      `[button: 🔍 Analyze my alerts]\n` +
      `[button: 📈 Simulate a budget]\n` +
      `[button: 🔐 ShieldKey advice]`,
    welcomeClean: (userName: string) =>
      `Hello ${userName}! I am your smart assistant **7sabek AI** 🪙.\n\n` +
      `All your notifications are read. Your account is perfectly secure and your budget is stable!\n\nHow can I help you today?\n\n` +
      `[button: 📈 Simulate a budget]\n` +
      `[button: 💡 Savings tips]\n` +
      `[button: 💸 Explain Cash Split]`,
    suggestionsTitle: "7sabek AI Suggestions:",
    copied: "Copied!",
    copy: "Copy",
    errorConnect: "Oops! I am having trouble connecting to the ShieldKey encrypted server. Please check the connection and try again.",
    shortcutsTitle: "Floussy Support Shortcuts",
    shortcutsDesc: "Select a high-priority topic to instantly guide your advisor:",
    shortcutSecurityTitle: "🛡️ Security & Access",
    shortcutSecurityPrompt: "Analyze my security alerts",
    shortcutSecurityDesc: "Evaluate ShieldKey connection integrity and protect against PIN theft.",
    shortcutBudgetTitle: "🔥 Envelopes & Budgets",
    shortcutBudgetPrompt: "How can I save and optimize my budget?",
    shortcutBudgetDesc: "Maximize daily \"Cash Split\" discipline to stabilize cash flow.",
    shortcutSavingsTitle: "💎 Proactive Savings Bonus",
    shortcutSavingsPrompt: "How can I unlock my savings bonus and increase my Floussy score?",
    shortcutSavingsDesc: "Analysis of automatic savings rules with real gains.",
    shortcutSystemTitle: "🔒 Cryptographic Integrity",
    shortcutSystemPrompt: "How does Floussy's ShieldKey encryption work?",
    shortcutSystemDesc: "Details on local cryptographic isolation and single-session authentication.",
    send: "Send",
    disclaimer: "7sabek AI relies on Gemini to formulate indicative advice",
    intelTitle: "Active Alerts Analysis",
    intelUnread: "Unread",
    intelScore: "IP Score",
    intelClick: "Click to analyze:",
    intelChannel: "LLM Channel",
    intelEncryption: "Local encryption",
    intelConn: "Connection",
    intelLinkTitle: "Smart Link",
    intelLinkDesc: "The AI advisor has direct encrypted access to your notifications. Click on any alert above to load it automatically!",
  },
  ar: {
    back: "رجوع",
    title: "مستشار الذكاء الاصطناعي 7sabek AI",
    version: "v2.5",
    clear: "مسح",
    deleteConversation: "حذف المحادثة",
    placeholder: "سول 7sabek AI ديالك هنا...",
    welcomeUnread: (userName: string, unreadCount: number) =>
      `أهلاً ${userName}! أنا المساعد الذكي ديالك **7sabek AI** 🪙.\n\n` +
      `كنشوف بلي عندك **${unreadCount} تنبيهات غير مقروءة** ديال الأمان ولا الميزانية.\n\n` +
      `واش بغيتيني نحللهم ولا نديرو محاكاة للمصاريف ديالك؟\n\n` +
      `[bouton: 🔍 تحليل التنبيهات ديالي]\n` +
      `[bouton: 📈 محاكاة الميزانية]\n` +
      `[bouton: 🔐 نصيحة ShieldKey]`,
    welcomeClean: (userName: string) =>
      `أهلاً ${userName}! أنا المساعد الذكي ديالك **7sabek AI** 🪙.\n\n` +
      `كاع الإشعارات ديالك مقروءة. الحساب ديالك فـ أمان تام والميزانية ديالك مستقرة!\n\nكيفاش نقدر نعاونك اليوم؟\n\n` +
      `[bouton: 📈 محاكاة الميزانية]\n` +
      `[bouton: 💡 نصائح الادخار]\n` +
      `[bouton: 💸 شرح Cash Split]`,
    suggestionsTitle: "اقتراحات 7sabek AI :",
    copied: "تنسخ!",
    copy: "نسخ",
    errorConnect: "أوبس! لقيت صعوبة باش نتصل بسيرفر ShieldKey المشفر. عفاك تأكد من الاتصال وعاود المحاولة.",
    shortcutsTitle: "اختصارات المساعدة Floussy",
    shortcutsDesc: "اختر موضوع أولوي باش توجه المستشار ديالك مباشرة:",
    shortcutSecurityTitle: "🛡️ الأمان والاتصال",
    shortcutSecurityPrompt: "تحليل تنبيهات الأمان ديالي",
    shortcutSecurityDesc: "تقييم سلامة اتصال ShieldKey والحماية من سرقة رمز PIN.",
    shortcutBudgetTitle: "🔥 الأظرفة والميزانيات",
    shortcutBudgetPrompt: "كيفاش نوفر ونحسن الميزانية ديالي؟",
    shortcutBudgetDesc: "الاستفادة القصوى من نظام \"Cash Split\" اليومي لتثبيت السيولة.",
    shortcutSavingsTitle: "💎 بونص الادخار التفاعلي",
    shortcutSavingsPrompt: "كيفاش نقدر نفعل بونص الادخار ونزيد سكور Floussy ديالي؟",
    shortcutSavingsDesc: "تحليل قواعد الادخار التلقائية مع أرباح حقيقية.",
    shortcutSystemTitle: "🔒 السلامة التشفيرية",
    shortcutSystemPrompt: "كيفاش كيخدم تشفير ShieldKey فـ تطبيق Floussy؟",
    shortcutSystemDesc: "تفاصيل على العزل التشفيري المحلي وتأمين الحصة الفريدة.",
    send: "إرسال",
    disclaimer: "7sabek AI كيعتمد على Gemini باش يقدم نصائح توجيهية",
    intelTitle: "تحليل التنبيهات النشطة",
    intelUnread: "غير مقروءة",
    intelScore: "نقطة IP",
    intelClick: "انقر للتحليل :",
    intelChannel: "قناة LLM",
    intelEncryption: "التشفير المحلي",
    intelConn: "الاتصال",
    intelLinkTitle: "الرابط الذكي",
    intelLinkDesc: "مستشار الذكاء الاصطناعي عنده صلاحية مباشرة مشفرة للإشعارات ديالك. انقر على أي تنبيه لفوق باش يتحمل تلقائياً!",
  },
};

// Audio Synthesizer for high-fidelity interactive feedback
const playSound = (
  type: "click" | "success" | "error" | "bell",
  muted: boolean,
) => {
  if (muted) return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "success") {
      const scale = [523.25, 659.25, 783.99, 1046.5];
      scale.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + idx * 0.06 + 0.3,
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.3);
      });
    } else if (type === "bell") {
      const scale = [880, 1320];
      scale.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.05, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + idx * 0.1 + 0.6,
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.6);
      });
    } else if (type === "error") {
      const frequencies = [160, 155];
      frequencies.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      });
    }
  } catch (err) {
    console.debug("Blocked audio play:", err);
  }
};

// Helper to parse message text and extract button suggestions
const parseButtons = (text: string) => {
  const buttons: string[] = [];
  const regex = /\[(?:bouton|button):\s*([^\]]+)\]/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] && match[1].trim()) {
      buttons.push(match[1].trim());
    }
  }
  let cleanText = text.replace(regex, "").trim();
  cleanText = cleanText.replace(/\n\s*\n\s*$/, "\n").trim();
  return { cleanText, buttons };
};

// Component to render text with rich Markdown formatting (Bold, Lists, Code, Italics)
function FormattedChatMessage({ text, isUser }: { text: string; isUser: boolean }) {
  const lines = text.split("\n");

  const formatInline = (str: string) => {
    const parts: React.ReactNode[] = [];
    // Match **bold**, `code`, or *italic*
    const regex = /(\*\*\s*[\s\S]+?\s*\*\*|`[^`]+`|\*[^*]+\*)/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(str)) !== null) {
      const matchStart = match.index;
      const matchText = match[0];

      if (matchStart > lastIdx) {
        parts.push(str.substring(lastIdx, matchStart));
      }

      if (matchText.startsWith("**") && matchText.endsWith("**")) {
        const cleanBold = matchText.slice(2, -2).trim();
        parts.push(
          <strong
            key={`b-${matchStart}`}
            className={`font-black ${isUser ? "text-white font-extrabold" : "text-slate-950 font-black tracking-tight"}`}
          >
            {cleanBold}
          </strong>
        );
      } else if (matchText.startsWith("`") && matchText.endsWith("`")) {
        const cleanCode = matchText.slice(1, -1);
        parts.push(
          <code
            key={`c-${matchStart}`}
            className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold ${
              isUser ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-800 border border-emerald-100/60"
            }`}
          >
            {cleanCode}
          </code>
        );
      } else if (matchText.startsWith("*") && matchText.endsWith("*")) {
        const cleanItalic = matchText.slice(1, -1).trim();
        parts.push(
          <em key={`i-${matchStart}`} className="italic">
            {cleanItalic}
          </em>
        );
      }

      lastIdx = regex.lastIndex;
    }

    if (lastIdx < str.length) {
      parts.push(str.substring(lastIdx));
    }

    return parts.length > 0 ? parts : str;
  };

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Bullet point lines starting with • or - or *
        if (trimmed.startsWith("•") || (trimmed.startsWith("-") && !trimmed.startsWith("---")) || trimmed.startsWith("* ")) {
          const content = trimmed.replace(/^[•\-\*]\s*/, "");
          return (
            <div key={lineIdx} className="flex items-start gap-2 py-0.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isUser ? "bg-white" : "bg-emerald-500"}`} />
              <span className="flex-1">{formatInline(content)}</span>
            </div>
          );
        }

        // Numbered list items e.g. 1. 2.
        const numMatch = trimmed.match(/^(\d+[\.\)])\s*(.*)$/);
        if (numMatch) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 py-0.5">
              <span className={`font-black text-xs shrink-0 ${isUser ? "text-white/90" : "text-emerald-600"}`}>
                {numMatch[1]}
              </span>
              <span className="flex-1">{formatInline(numMatch[2])}</span>
            </div>
          );
        }

        // Section divider ---
        if (trimmed === "---") {
          return <hr key={lineIdx} className={`my-2 border-t ${isUser ? "border-white/20" : "border-slate-200/60"}`} />;
        }

        return <div key={lineIdx}>{formatInline(line)}</div>;
      })}
    </div>
  );
}

export default function BetaChatPage() {
  const router = useRouter();
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "beta-chat-ar-body");
  const copy = CHAT_COPY[locale];

  // Profile States — fetch real user data on mount
  const [userProfile, setUserProfile] = useState<UserOut | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [profileLoading, setProfileLoading] = useState(true);

  // Notifications state loaded from shared local storage
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // AI Chat states
  interface ChatMessage {
    id: string;
    role: "user" | "model";
    text: string;
    timestamp: string;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageRatings, setMessageRatings] = useState<
    Record<string, "up" | "down">
  >({});

  // Fetch real user profile on mount
  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const profile = await apiFetch<UserOut>("/auth/me");
        if (!cancelled) {
          setUserProfile(profile);
          const parts = [profile.first_name, profile.last_name].filter(Boolean);
          setUserName(parts.length > 0 ? parts.join(" ") : profile.email.split("@")[0] || "");
        }
      } catch {
        if (!cancelled) setUserName("");
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }
    loadProfile();
    return () => { cancelled = true; };
  }, []);

  // Sync notifications from local storage on load
  useEffect(() => {
    const saved = localStorage.getItem("floussy.beta.notifications");
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch {
        setNotifications([]);
      }
    }
  }, []);

  // Load saved chat messages from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Save chat messages to local storage whenever they change
  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  // Auto-generate context-aware welcome message when entering AI Chat
  useEffect(() => {
    if (chatMessages.length === 0 && !profileLoading) {
      const displayName = userName || "Utilisateur";
      const activeUnreadCount = notifications.filter((n) => !n.read).length;
      const greetText =
        activeUnreadCount > 0
          ? copy.welcomeUnread(displayName, activeUnreadCount)
          : copy.welcomeClean(displayName);

      setChatMessages([
        {
          id: "welcome",
          role: "model",
          text: greetText,
          timestamp: new Date().toLocaleTimeString(locale === "ar" ? "ar-MA" : locale === "en" ? "en-US" : "fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  }, [chatMessages.length, notifications, userName, copy, locale, profileLoading]);

  // AI Chat message sender
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    playSound("click", false);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(locale === "ar" ? "ar-MA" : locale === "en" ? "en-US" : "fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    if (!customPrompt) setChatInput("");
    setChatLoading(true);

    try {
      // Build the conversation for the backend
      const conversationMessages = newMessages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      // Call the backend /advisor/chat endpoint via apiFetch with extended timeout for LLM generation
      const data = await apiFetch<{ text: string }>("/advisor/chat", {
        method: "POST",
        body: {
          messages: conversationMessages,
        },
        timeoutMs: 60_000,
      });
      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "model",
        text: data.text,
        timestamp: new Date().toLocaleTimeString(locale === "ar" ? "ar-MA" : locale === "en" ? "en-US" : "fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setChatMessages((prev) => [...prev, botMsg]);
      playSound("click", false);
    } catch (error: any) {
      console.error("AI chat error:", error);
      // Extract and sanitize error message
      let rawError =
        (error?.detail && typeof error.detail === "string"
          ? error.detail
          : error?.message && typeof error.message === "string"
            ? error.message
            : copy.errorConnect) as string;

      // Ensure raw HTML tags or upstream error pages are never rendered in the chat bubble
      if (
        rawError.startsWith("<!DOCTYPE") ||
        rawError.startsWith("<html") ||
        rawError.startsWith("<head") ||
        rawError.startsWith("<body") ||
        rawError.includes("via_upstream") ||
        rawError.includes("App Platform failed") ||
        /<[a-z][\s\S]*>/i.test(rawError)
      ) {
        rawError = copy.errorConnect;
      }

      const errorMsg: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        role: "model",
        text: rawError,
        timestamp: new Date().toLocaleTimeString(locale === "ar" ? "ar-MA" : locale === "en" ? "en-US" : "fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
      playSound("error", false);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    playSound("error", false);
    setChatMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    playSound("success", false);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleRateMessage = (id: string, rating: "up" | "down") => {
    playSound("click", false);
    setMessageRatings((prev) => ({
      ...prev,
      [id]: prev[id] === rating ? undefined : rating,
    }) as any);
  };

  return (
    <div dir={dir} className="w-full h-screen overflow-hidden bg-slate-50 text-slate-900 animate-fade-in relative flex flex-col">
      {/* Ambient soft background blur blobs */}
      <div className="absolute top-10 left-1/3 w-80 h-80 bg-emerald-300/10 rounded-full blur-3xl pointer-events-none select-none" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-teal-300/10 rounded-full blur-3xl pointer-events-none select-none" />

      {/* Navigation Header */}
      <header className="p-4 border-b border-slate-200/50 bg-white/75 backdrop-blur-md flex items-center shrink-0 z-20 shadow-2xs">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              playSound("click", false);
              router.back();
            }}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/50 transition flex items-center gap-2 active:scale-95 cursor-pointer text-xs font-black shadow-3xs whitespace-nowrap"
            title={copy.back}
          >
            <ArrowLeft className={`w-4 h-4 stroke-[2.5] ${locale === "ar" ? "rotate-180" : ""}`} />
            <span>{copy.back}</span>
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-sm shadow-emerald-600/10">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5 leading-none">
                <h2 className="text-xs xs:text-sm sm:text-base font-black tracking-tight text-slate-900 truncate">
                  {copy.title}
                </h2>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100/30">
                  {copy.version}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Delete entire conversation */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.confirm(
                  locale === "ar" ? "واش متأكد بغيتي تحذف المحادثة كاملة؟" :
                  locale === "en" ? "Are you sure you want to delete the entire conversation?" :
                  "Es-tu sûr de vouloir supprimer toute la conversation ?"
                )) {
                  playSound("error", false);
                  setChatMessages([]);
                  localStorage.removeItem(CHAT_STORAGE_KEY);
                }
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white hover:bg-rose-500 hover:text-white border border-slate-200/50 text-rose-400 hover:border-rose-300 transition flex items-center gap-1.5 active:scale-95 cursor-pointer text-xs font-black shadow-3xs"
              title={copy.deleteConversation}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline ml-0.5">{copy.deleteConversation}</span>
            </button>
          </div>
        </div>
      </header>

      {/* DUAL PANE WORKSPACE GRID */}
      <div className="flex-1 flex overflow-hidden relative max-w-7xl w-full mx-auto">
        {/* LEFT PANELS WORKSPACE: DISCUSSIONS ENGINE */}
        <div className="flex-1 flex flex-col h-full bg-slate-50/10 overflow-hidden relative min-w-0">
          {/* SCROLLABLE VIEWPORT */}
          <div
            className="flex-1 overflow-y-auto px-4 py-6 sm:p-8 space-y-6 scroll-smooth"
            id="chat-messages-viewport"
          >
            <div className="max-w-3xl mx-auto space-y-6">
              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex items-start gap-3 max-w-[88%] sm:max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Bubble Icon indicator */}
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all shadow-xs ${
                        msg.role === "user"
                          ? "bg-slate-900 border-slate-800 text-white shadow-slate-900/10"
                          : "bg-white border-slate-200/60 text-emerald-600 shadow-emerald-100/20"
                      }`}
                    >
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Bubble Context */}
                    <div className="flex flex-col">
                      {(() => {
                        const parsed = parseButtons(msg.text);
                        return (
                          <div
                            className={`p-4 rounded-3xl text-xs sm:text-sm shadow-2xs leading-relaxed whitespace-pre-wrap transition-colors break-words ${
                              msg.role === "user"
                                ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-none font-bold shadow-md shadow-emerald-600/10"
                                : "bg-white text-slate-850 border border-slate-200/50 rounded-tl-none font-semibold"
                            }`}
                          >
                            <FormattedChatMessage text={parsed.cleanText} isUser={msg.role === "user"} />

                            {/* Interactive Suggestion Buttons from Chat Response */}
                            {msg.role !== "user" && parsed.buttons.length > 0 && (
                              <div className="mt-3.5 pt-2.5 border-t border-slate-100/60 flex flex-col gap-2 select-none">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                                  <span>{copy.suggestionsTitle}</span>
                                </p>
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  {parsed.buttons.map((btnLabel, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => handleSendMessage(btnLabel)}
                                      className="px-3 py-1.5 bg-gradient-to-br from-emerald-50 to-slate-50 hover:from-emerald-100 hover:to-emerald-50 border border-emerald-100/40 text-emerald-700 hover:text-emerald-800 rounded-xl text-xs font-bold transition-all duration-200 active:scale-97 flex items-center gap-1 shadow-3xs hover:shadow-2xs cursor-pointer group/btn"
                                    >
                                      <span>{btnLabel}</span>
                                      <ChevronRight className={`w-3 h-3 text-emerald-400 group-hover/btn:translate-x-0.5 transition-transform ${locale === "ar" ? "rotate-180" : ""}`} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Bottom micro actions inside AI bubbles */}
                            {msg.role !== "user" && (
                              <div className="mt-3.5 pt-2.5 border-t border-slate-100/85 flex items-center gap-4 text-slate-400 select-none">
                                {/* Copy Button */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyMessage(msg.id, parsed.cleanText)
                                  }
                                  className="text-[10px] font-extrabold hover:text-emerald-600 flex items-center gap-1 cursor-pointer transition"
                                >
                                  {copiedMessageId === msg.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-600 font-extrabold">
                                        {copy.copied}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>{copy.copy}</span>
                                    </>
                                  )}
                                </button>

                                {/* Rate Thumbs */}
                                <div className="flex items-center gap-1.5 ml-auto">
                                  <button
                                    type="button"
                                    onClick={() => handleRateMessage(msg.id, "up")}
                                    className={`p-1 rounded-md hover:bg-slate-50 transition cursor-pointer ${
                                      messageRatings[msg.id] === "up"
                                        ? "text-emerald-600 bg-emerald-50 border border-emerald-100/30"
                                        : "hover:text-slate-600 border border-transparent"
                                    }`}
                                    title={locale === "ar" ? "إجابة مفيدة" : locale === "en" ? "Helpful answer" : "Réponse utile"}
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRateMessage(msg.id, "down")}
                                    className={`p-1 rounded-md hover:bg-slate-50 transition cursor-pointer ${
                                      messageRatings[msg.id] === "down"
                                        ? "text-rose-600 bg-rose-50 border border-rose-100/25"
                                        : "hover:text-slate-600 border border-transparent"
                                    }`}
                                    title={locale === "ar" ? "إجابة غير صحيحة" : locale === "en" ? "Incorrect answer" : "Réponse incorrecte"}
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                            </div>
                          )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* BENTO GRID PROMPTS PANEL (Welcome Mode) */}
              {chatMessages.length === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 space-y-6 pt-5 border-t border-slate-200/35"
                >
                  <div className="text-center sm:text-left">
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <span>{copy.shortcutsTitle}</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-bold mt-1">
                      {copy.shortcutsDesc}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      {
                        title: copy.shortcutSecurityTitle,
                        prompt: copy.shortcutSecurityPrompt,
                        desc: copy.shortcutSecurityDesc,
                        color: "from-rose-500/5 to-rose-500/2 hover:border-rose-300 shadow-rose-100/10",
                        iconColor: "text-rose-500 bg-rose-50 border-rose-100/60",
                        icon: AlertTriangle,
                      },
                      {
                        title: copy.shortcutBudgetTitle,
                        prompt: copy.shortcutBudgetPrompt,
                        desc: copy.shortcutBudgetDesc,
                        color: "from-amber-400/5 to-amber-500/2 hover:border-amber-300 shadow-amber-100/10",
                        iconColor: "text-amber-500 bg-amber-50 border-amber-100/60",
                        icon: Flame,
                      },
                      {
                        title: copy.shortcutSavingsTitle,
                        prompt: copy.shortcutSavingsPrompt,
                        desc: copy.shortcutSavingsDesc,
                        color: "from-emerald-500/5 to-emerald-500/2 hover:border-emerald-300 shadow-emerald-100/10",
                        iconColor: "text-emerald-500 bg-emerald-50 border-emerald-100/60",
                        icon: Coins,
                      },
                      {
                        title: copy.shortcutSystemTitle,
                        prompt: copy.shortcutSystemPrompt,
                        desc: copy.shortcutSystemDesc,
                        color: "from-emerald-500/5 to-emerald-500/2 hover:border-emerald-300 shadow-emerald-100/10",
                        iconColor: "text-emerald-500 bg-emerald-50 border-emerald-100/60",
                        icon: Shield,
                      },
                    ].map((bento, i) => {
                      const BentoIcon = bento.icon;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            playSound("click", false);
                            handleSendMessage(bento.prompt);
                          }}
                          className={`p-4 rounded-2xl bg-gradient-to-br ${bento.color} border border-slate-200/50 text-left cursor-pointer transition-all duration-300 shadow-2xs hover:shadow-md hover:-translate-y-0.5 flex flex-col gap-2.5 group relative overflow-hidden`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${bento.iconColor}`}>
                              <BentoIcon className="w-4 h-4" />
                            </div>
                            <span className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors tracking-tight uppercase">
                              {bento.title}
                            </span>
                          </div>
                          <p className="text-[10px] sm:text-xs text-slate-500 font-semibold leading-relaxed font-sans">
                            {bento.desc}
                          </p>
                          <span className="absolute bottom-3 right-3 text-slate-355 group-hover:text-emerald-600 group-hover:translate-x-1.2 transition-all duration-300 font-extrabold">
                            →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* CHAT INPUT AREA */}
          <div className="p-4 sm:p-5 bg-white/80 border-t border-slate-200/50 backdrop-blur-md shrink-0 z-10 shadow-lg">
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={copy.placeholder}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  className="flex-1 bg-white border border-slate-200/80 rounded-2xl px-5 py-3.5 sm:py-4 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-2xs"
                />

                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className={`
                    relative flex items-center justify-center shrink-0 select-none transition-all duration-300 active:scale-90 group border
                    ${
                      chatLoading
                        ? "w-11 h-11 rounded-full bg-slate-50 border-slate-200 text-slate-400 shadow-none cursor-not-allowed"
                        : !chatInput.trim()
                          ? "w-11 h-11 rounded-full bg-slate-100 border-slate-200 text-slate-350 shadow-none cursor-not-allowed"
                          : "w-11 h-11 rounded-full sm:w-auto sm:px-5 sm:py-3.5 sm:rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-650 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 border-emerald-700/10 text-white shadow-md hover:shadow-lg hover:shadow-emerald-600/15 cursor-pointer font-black"
                    }
                  `}
                >
                  {!chatLoading && chatInput.trim() && (
                    <span className="hidden sm:inline-block font-black text-xs uppercase tracking-wider mr-1.5 select-none text-white">
                      {copy.send}
                    </span>
                  )}
                  {chatLoading ? (
                    <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
                  ) : (
                    <Send className="w-4.5 h-4.5 sm:w-4 sm:h-4 transition-transform duration-250 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  )}
                </button>
              </form>
              <p className="text-[9px] text-slate-400 font-bold text-center mt-2 uppercase tracking-widest leading-none">
                {copy.disclaimer}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: CONTEXTUAL INTEL PANEL (Desktop Only) */}
        <div className="hidden lg:flex w-76 shrink-0 flex-col bg-white/45 border-l border-slate-200/35 backdrop-blur-md p-5 overflow-y-auto space-y-6 justify-between select-none">
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3.5">
                {copy.intelTitle}
              </h3>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="bg-white p-3 rounded-2xl border border-slate-200/40 text-center shadow-3xs">
                  <span className="text-lg sm:text-xl font-extrabold text-emerald-600">
                    {notifications.filter((n) => !n.read).length}
                  </span>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-tight">
                    {copy.intelUnread}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200/40 text-center shadow-3xs">
                  <span className="text-lg sm:text-xl font-extrabold text-[#111827]">98%</span>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-tight">
                    {copy.intelScore}
                  </p>
                </div>
              </div>

              <span className="text-[9px] font-bold text-slate-450 uppercase block mb-2 tracking-wider">
                {copy.intelClick}
              </span>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 flex-col flex">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => {
                      playSound("click", false);
                      setChatInput(
                        locale === "ar"
                          ? `حلل هاد التنبيه: \n- الفئة: ${notif.type.toUpperCase()}\n- العنوان: ${notif.title}\n- التفاصيل: ${notif.description}`
                          : locale === "en"
                          ? `Analyze the following alert: \n- Category: ${notif.type.toUpperCase()}\n- Title: ${notif.title}\n- Detail: ${notif.description}`
                          : `Analyse l'alerte suivante : \n- Catégorie : ${notif.type.toUpperCase()}\n- Titre : ${notif.title}\n- Détail : ${notif.description}`,
                      );
                    }}
                    className="w-full text-left p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/40 hover:border-emerald-400 shadow-3xs transition-all hover:bg-slate-50 cursor-pointer flex gap-1.5"
                    title={locale === "ar" ? "اضغط للتحليل مع الذكاء الاصطناعي" : locale === "en" ? "Inject for AI consultation" : "Injecter pour consultation IA"}
                  >
                    <div
                      className={`w-1.2 h-auto rounded-full shrink-0 ${
                        notif.type === "security"
                          ? "bg-rose-500"
                          : notif.type === "budget"
                            ? "bg-amber-500"
                            : "bg-teal-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <h4 className="text-[10px] sm:text-[11px] font-extrabold text-slate-800 truncate leading-tight">
                        {notif.title}
                      </h4>
                      <p className="text-[9px] text-slate-500 font-semibold truncate mt-0.5">
                        {notif.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pro Info Box */}
            <div className="pt-4 border-t border-slate-200/35 font-sans">
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/30 relative overflow-hidden">
                <Sparkles className="w-8 h-8 text-emerald-400/10 absolute -right-1 -bottom-1" />
                <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                  {copy.intelLinkTitle}
                </h4>
                <p className="text-[10px] text-emerald-950 font-semibold mt-1 leading-relaxed">
                  {copy.intelLinkDesc}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
