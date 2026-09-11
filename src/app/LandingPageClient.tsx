"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Apple, Chrome, Globe } from "lucide-react";
import { Cairo } from "next/font/google";

import { fetchMe, hasAuthSessionHint, logout, type AuthUser } from "@/lib/auth";
import BrandLogo from "@/components/BrandLogo";
import { triggerAddToHomeScreenPrompt } from "@/components/pwa/AddToHomeScreenPrompt";
import {
  getBrowserLocalePreference,
  getLocaleBadgeLabel,
  openLanguagePicker,
} from "@/components/i18n/LanguagePreferenceGate";
import {
  getLocaleDirection,
  isSupportedLocale,
  type FloussyLocale,
} from "@/lib/localePreference";

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const arabicFont = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "900"] });

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type HeroInstallKind = "android" | "ios" | "chromium-desktop" | "none";

function detectHeroInstallKind(ua: string): HeroInstallKind {
  const lowerUA = ua.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(lowerUA);
  const isAndroid = /android/.test(lowerUA);
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  // Chrome, Brave (which mirrors Chrome's UA) and other Chromium browsers
  // (Edge, Opera…) all support the beforeinstallprompt install flow.
  const isChromiumDesktop = /chrome|chromium|crios/.test(lowerUA) && !/firefox|fxios/.test(lowerUA);
  return isChromiumDesktop ? "chromium-desktop" : "none";
}

type Duo = { t: string; d: string };
type Copy = {
  nav: { sim: string; who: string; cgu: string; priv: string; contact: string };
  cta: { start: string; login: string; logout: string; dashboard: string; free: string; installAndroid: string; installIOS: string; installChrome: string };
  hero: { taglineA: string; taglineB: string };
  trust: string[];
  chips: { rent: string; rentM: string; sal: string; salM: string; net: string; netM: string; debt: string; debtM: string; sav: string; savM: string };
  sc: { cycle: string; cash: string };
  env: { food: string; transport: string; fun: string; save: string; rent: string; net: string; debt: string; sal: string };
  why: { kicker: string; items: Duo[] };
  sim: { kicker: string; income: string; left: string; fixed: string; fixedHint: string; pctHint: string };
  cmp: { kicker: string; title: string; a: string; b: string; rows: Array<[string, string]> };
  who: { kicker: string; title: string; items: Duo[] };
  fin: { title: string; alt: string; micro: string };
  foot: string;
};

const COPY: Record<FloussyLocale, Copy> = {
  fr: {
    nav: { sim: "Simulateur", who: "Pour qui", cgu: "CGU", priv: "Confidentialité", contact: "Contact" },
    cta: { start: "Commencer", login: "Connexion", logout: "Déconnexion", dashboard: "Dashboard", free: "Commencer gratuitement", installAndroid: "App Android", installIOS: "Ajouter à l'écran d'accueil", installChrome: "Installer sur Chrome" },
    hero: {
      taglineA: "Ton budget,",
      taglineB: "entre tes mains.",
    },
    trust: ["Connexion par clé d’accès", "Simulation avant application", "Export de tes données", "Multilingue FR / EN / AR"],
    chips: { rent: "Loyer", rentM: "Échéance 3j", sal: "Salaire", salM: "Mensuel", net: "Internet", netM: "Renouvellement", debt: "Crédit voiture", debtM: "Priorité 1", sav: "Épargne", savM: "Auto · reliquat" },
    sc: { cycle: "Cycle 01 → 30", cash: "Cash disponible" },
    env: { food: "Courses", transport: "Transport", fun: "Sorties", save: "Épargne", rent: "Loyer", net: "Internet", debt: "Crédit voiture", sal: "Salaire" },
    why: {
      kicker: "Étape par étape",
      items: [
        { t: "On regarde qui tu es et où part ton argent", d: "Un état des lieux rapide de tes revenus et de tes dépenses, pour partir d’une base claire." },
        { t: "On te propose ta répartition", d: "Un programme de répartition pensé pour ton salaire, que tu ajustes avant de valider." },
        { t: "On suit tes dépenses avec toi", d: "Chaque dépense est enregistrée et rattachée à la bonne enveloppe, en temps réel." },
        { t: "On t’aide à aller jusqu’au bout", d: "Organise tes finances, rembourse tes crédits et atteins tes objectifs, mois après mois." },
      ],
    },
    sim: {
      kicker: "Essaie maintenant",
      income: "Ton salaire mensuel",
      left: "Ce qui part à l’épargne",
      fixed: "Fixe",
      fixedHint: "un montant qui reste le même chaque mois",
      pctHint: "une part de ton salaire qui s’ajuste toute seule",
    },
    cmp: {
      kicker: "Comparatif",
      title: "Plus qu’un tracker. Un vrai système budgétaire.",
      a: "Tracker classique",
      b: "7sabek",
      rows: [
        ["Montre un historique", "Construit un plan financier dès l’inscription"],
        ["Un seul solde global", "Cash + enveloppes + objectifs + dettes, séparés"],
        ["Répartition manuelle", "Distribution automatique, simulée avant application"],
        ["Calendrier générique", "Cycle basé sur ta vraie date de paie"],
        ["Saisie au clavier, champ par champ", "Une phrase en langage naturel suffit"],
      ],
    },
    who: {
      kicker: "Pour qui",
      title: "Conçu pour ceux qui veulent gérer leur argent avec méthode.",
      items: [
        { t: "Reprendre le contrôle", d: "Arrête de te demander où est parti ton argent à la fin du mois." },
        { t: "Financer des objectifs", d: "Voyage, fonds d’urgence, projet personnel ou achat important." },
        { t: "Rembourser des dettes", d: "Garde une vision claire des remboursements sans casser ton budget courant." },
        { t: "Revenus irréguliers", d: "Freelance, artisan ou revenus mixtes : le plan s’adapte à ta réalité, pas l’inverse." },
      ],
    },
    fin: {
      title: "Prêt à donner une mission claire à ton argent ?",
      alt: "Découvrir les fonctionnalités",
      micro: "Zéro dirham à sortir. Faboooor, vraiment.",
    },
    foot: "© 2026 7sabek. Tous droits réservés.",
  },

  en: {
    nav: { sim: "Simulator", who: "Who it’s for", cgu: "Terms", priv: "Privacy", contact: "Contact" },
    cta: { start: "Get started", login: "Log in", logout: "Log out", dashboard: "Dashboard", free: "Start for free", installAndroid: "Android app", installIOS: "Add to Home Screen", installChrome: "Install on Chrome" },
    hero: {
      taglineA: "Your budget,",
      taglineB: "in your hands.",
    },
    trust: ["Passkey sign-in", "Simulate before applying", "Export your data", "Multilingual FR / EN / AR"],
    chips: { rent: "Rent", rentM: "Due in 3d", sal: "Salary", salM: "Monthly", net: "Internet", netM: "Renewal", debt: "Car loan", debtM: "Priority 1", sav: "Savings", savM: "Auto · leftover" },
    sc: { cycle: "Cycle 01 → 30", cash: "Available cash" },
    env: { food: "Groceries", transport: "Transport", fun: "Going out", save: "Savings", rent: "Rent", net: "Internet", debt: "Car loan", sal: "Salary" },
    why: {
      kicker: "Step by step",
      items: [
        { t: "We look at who you are and where your money goes", d: "A quick snapshot of your income and spending, to start from a clear picture." },
        { t: "We suggest your split", d: "A distribution plan built for your salary, which you adjust before confirming." },
        { t: "We track your spending with you", d: "Every expense is logged and linked to the right envelope, in real time." },
        { t: "We help you see it through", d: "Organize your finances, pay off your debts, and reach your goals, month after month." },
      ],
    },
    sim: {
      kicker: "Try it now",
      income: "Your monthly salary",
      left: "What goes to savings",
      fixed: "Fixed",
      fixedHint: "an amount that stays the same every month",
      pctHint: "a share of your salary that adjusts on its own",
    },
    cmp: {
      kicker: "Comparison",
      title: "More than a tracker. A real budgeting system.",
      a: "Classic tracker",
      b: "7sabek",
      rows: [
        ["Shows a history", "Builds a financial plan from sign-up"],
        ["A single global balance", "Cash + envelopes + goals + debt, kept separate"],
        ["Manual splitting", "Automatic distribution, simulated before applying"],
        ["Generic calendar", "Cycle based on your real payday"],
        ["Typing field by field", "One plain sentence is enough"],
      ],
    },
    who: {
      kicker: "Who it’s for",
      title: "Built for people who want to manage money with method.",
      items: [
        { t: "Take back control", d: "Stop wondering where your money went at the end of the month." },
        { t: "Fund your goals", d: "Travel, emergency fund, personal project or a big purchase." },
        { t: "Pay off debt", d: "Keep repayments clear without breaking your everyday budget." },
        { t: "Irregular income", d: "Freelance, craftsperson or mixed income: the plan adapts to you, not the reverse." },
      ],
    },
    fin: {
      title: "Ready to give your money a clear mission?",
      alt: "Explore the features",
      micro: "Not one dirham to pay. Freeeee, really.",
    },
    foot: "© 2026 7sabek. All rights reserved.",
  },

  ar: {
    nav: { sim: "المحاكاة", who: "لمن", cgu: "شروط الاستخدام", priv: "الخصوصية", contact: "اتصل بنا" },
    cta: { start: "بدا", login: "دخول", logout: "تسجيل الخروج", dashboard: "لوحة التحكم", free: "بدا مجاناً", installAndroid: "تطبيق أندرويد", installIOS: "زيد للشاشة الرئيسية", installChrome: "ثبت على Chrome" },
    hero: {
      taglineA: "حسابك",
      taglineB: "بيدك.",
    },
    trust: ["دخول بمفتاح الأمان", "محاكاة قبل التطبيق", "تصدير البيانات ديالك", "بثلاث لغات"],
    chips: { rent: "الكراء", rentM: "باقي 3 أيام", sal: "السالير", salM: "شهري", net: "الأنترنيت", netM: "تجديد", debt: "كريدي الطوموبيل", debtM: "أولوية 1", sav: "الادخار", savM: "أوتوماتيكي · الباقي" },
    sc: { cycle: "الدورة 01 ← 30", cash: "الكاش المتوفر" },
    env: { food: "التقضية", transport: "التنقل", fun: "الخرجات", save: "الادخار", rent: "الكراء", net: "الأنترنيت", debt: "كريدي الطوموبيل", sal: "السالير" },
    why: {
      kicker: "خطوة بخطوة",
      items: [
        { t: "كنشوفو شكون نتا وفين كيمشيو الفلوس ديالك", d: "نظرة سريعة على الدخل والمصاريف ديالك، باش نبداو من صورة واضحة." },
        { t: "كنقترحو عليك برنامج التوزيع ديالك", d: "برنامج توزيع مبني على السالير ديالك، كتعدلو قبل ما تأكد." },
        { t: "كنتبعو معاك المصاريف ديالك", d: "كل مصروف كيتسجل ويترتبط بالظرف الصحيح، فالوقت الحقيقي." },
        { t: "كنعاونوك توصل للأخير", d: "نظم فلوسك، خلص الكريديات ديالك، ووصل لأهدافك، شهر بعد شهر." },
      ],
    },
    sim: {
      kicker: "جرب دابا",
      income: "السالير ديالك فالشهر",
      left: "اللي كيمشي للادخار",
      fixed: "ثابت",
      fixedHint: "مبلغ ما كيتبدلش كل شهر",
      pctHint: "نسبة من السالير كتتبدل معاه بروحها",
    },
    cmp: {
      kicker: "مقارنة",
      title: "ماشي غير تطبيق تتبع. نظام ميزانية كامل.",
      a: "تطبيق تتبع عادي",
      b: "7sabek",
      rows: [
        ["كيوريك غير التاريخ", "كيبني خطة فلوس من أول تسجيل"],
        ["رصيد واحد عام", "الكاش + الأظرفة + الأهداف + الديون، مفصولين"],
        ["تقسيم باليد", "توزيع أوتوماتيكي، بمحاكاة قبل التطبيق"],
        ["روزنامة عامة", "دورة على أساس تاريخ الخلاص الحقيقي ديالك"],
        ["كتابة حقل بحقل", "جملة وحدة بلغة عادية كافية"],
      ],
    },
    who: {
      kicker: "لمن",
      title: "مصمم للي باغي يسير الفلوس ديالو بمنهج واضح.",
      items: [
        { t: "ترجع التحكم", d: "حبس تسول راسك فين مشاو الفلوس فآخر الشهر." },
        { t: "تموّل الأهداف ديالك", d: "سفر، صندوق الطوارئ، مشروع شخصي ولا شرا مهم." },
        { t: "تسدد الديون", d: "بقا شايف السداد بوضوح بلا ما تخرب الميزانية اليومية." },
        { t: "مداخيل غير منتظمة", d: "فريلانس، حرفي ولا مداخيل مخلوطة: الخطة كتأقلم مع الواقع ديالك، ماشي العكس." },
      ],
    },
    fin: {
      title: "واجد تعطي لفلوسك مهمة واضحة؟",
      alt: "اكتشف الخصائص",
      micro: "حتى درهم ما غادي تخلص. فابووووور بصح.",
    },
    foot: "© 2026 7sabek. جميع الحقوق محفوظة.",
  },
};

/* ------------------------------------------------------------------ */
/*  Simulator rules — mirrors the backend engine: fixed rules first,    */
/*  then percent-of-income, and whatever is left goes to savings.       */
/* ------------------------------------------------------------------ */
type Rule =
  // A "fixed" rule still stands for a real-world fixed cost (rent, a loan
  // installment) that doesn't move month to month — but a fixed cost for a
  // 3 000 MAD salary isn't the same number as one for a 40 000 MAD salary.
  // `amount` is the value at REFERENCE_SALARY; min/max keep it inside a
  // realistic range as the slider moves, instead of a flat 3 200 MAD rent
  // silently eating a 3 000 MAD income.
  | { key: keyof Copy["env"]; kind: "fixed"; amount: number; min: number; max: number; color: string }
  | { key: keyof Copy["env"]; kind: "pct"; pct: number; color: string };

const REFERENCE_SALARY = 12400;

const RULES: Rule[] = [
  { key: "rent", kind: "fixed", amount: 3200, min: 600, max: 4500, color: "#0A241D" },
  { key: "debt", kind: "fixed", amount: 2100, min: 0, max: 3200, color: "#8B7CF6" },
  { key: "net", kind: "fixed", amount: 199, min: 199, max: 199, color: "#123A2E" },
  { key: "food", kind: "pct", pct: 22, color: "#17C777" },
  { key: "transport", kind: "pct", pct: 8, color: "#4C7EFF" },
  { key: "fun", kind: "pct", pct: 6, color: "#F2A93B" },
];

function scaledFixedAmount(rule: { amount: number; min: number; max: number }, salary: number) {
  const scaled = Math.round(((rule.amount / REFERENCE_SALARY) * salary) / 100) * 100;
  return Math.min(rule.max, Math.max(rule.min, scaled));
}

const MARQUEE: Array<{ key: keyof Copy["env"]; v: string; up: boolean; c: string }> = [
  { key: "rent", v: "-3 200", up: false, c: "#0A241D" },
  { key: "sal", v: "+12 400", up: true, c: "#17C777" },
  { key: "food", v: "-742", up: false, c: "#17C777" },
  { key: "debt", v: "-2 100", up: false, c: "#8B7CF6" },
  { key: "transport", v: "-180", up: false, c: "#4C7EFF" },
  { key: "save", v: "+1 500", up: true, c: "#0B8F53" },
  { key: "net", v: "-199", up: false, c: "#123A2E" },
  { key: "fun", v: "-340", up: false, c: "#F2A93B" },
];

const PRESETS = [6000, 12400, 20000, 32000];

// One custom illustration per copy.why.items entry, in order — kept out of
// the copy object since assets aren't per-locale content.
const WHY_IMAGES = [
  "/landing/why/step-1-diagnostic.png",
  "/landing/why/step-2-split.png",
  "/landing/why/step-3-tracking.png",
  "/landing/why/step-4-goals.png",
];

function fmt(value: number) {
  return Math.round(value).toLocaleString("fr-FR").replace(/ | /g, " ");
}

type LandingPageClientProps = {
  initialLocale: FloussyLocale;
};

export default function LandingPageClient({ initialLocale }: LandingPageClientProps) {
  const reduceMotion = useReducedMotion();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [locale, setLocale] = useState<FloussyLocale>(initialLocale);
  const [showGooglePlayPopup, setShowGooglePlayPopup] = useState(false);
  const [heroInstallKind, setHeroInstallKind] = useState<HeroInstallKind | null>(null);
  const [chromeDeferredPrompt, setChromeDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [salary, setSalary] = useState(12400);
  const [introReady, setIntroReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const phoneRef = useRef<HTMLDivElement | null>(null);

  // The Google Play popup is opened on demand only (header button + hero badge).
  // It used to auto-open 1s after load on every visit, stacking on top of the
  // language modal and the cookie banner; the PWA prompt already covers the
  // "install the app" nudge automatically, with proper dismissal memory.

  // The hero install CTA changes with the device: the Android popup on
  // Android, the "Add to Home Screen" prompt on iOS, and a Chrome-install
  // button on Chromium desktop browsers — nothing on other desktop browsers,
  // since they have no install path we can trigger.
  useEffect(() => {
    setHeroInstallKind(detectHeroInstallKind(window.navigator.userAgent));
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setChromeDeferredPrompt(promptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const handleChromeInstall = useCallback(async () => {
    if (!chromeDeferredPrompt) return;
    await chromeDeferredPrompt.prompt();
    await chromeDeferredPrompt.userChoice;
    setChromeDeferredPrompt(null);
  }, [chromeDeferredPrompt]);

  useEffect(() => {
    const load = async () => {
      if (!hasAuthSessionHint()) {
        setUser(null);
        setCheckingAuth(false);
        return;
      }
      try {
        const me = await fetchMe({ suppressAuthRedirect: true });
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const resolveLocale = (): FloussyLocale => {
      const cookieLocale = getBrowserLocalePreference();
      if (cookieLocale) return cookieLocale;
      if (typeof document !== "undefined") {
        const lang = document.documentElement.lang?.trim().toLowerCase();
        if (isSupportedLocale(lang)) return lang;
      }
      return initialLocale;
    };

    setLocale(resolveLocale());

    const handleLocaleChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ locale?: FloussyLocale }>;
      if (customEvent.detail?.locale) {
        setLocale(customEvent.detail.locale);
        return;
      }
      setLocale(resolveLocale());
    };

    const observer =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            setLocale((previous) => {
              const next = resolveLocale();
              return next === previous ? previous : next;
            });
          })
        : null;

    if (observer && typeof document !== "undefined") {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }

    window.addEventListener(LANGUAGE_CHANGED_EVENT, handleLocaleChanged as EventListener);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, handleLocaleChanged as EventListener);
      observer?.disconnect();
    };
  }, [initialLocale]);

  // A tab opened in the background freezes CSS animations at frame 0, which would
  // leave sections invisible. Only arm the one-shot intro when the page is on screen.
  useEffect(() => {
    if (reduceMotion) return;
    if (typeof document === "undefined") return;
    if (document.visibilityState === "visible") setIntroReady(true);
  }, [reduceMotion]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0);
        setScrolled(window.scrollY > 20);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    void logout().finally(() => setUser(null));
  };

  const effectiveLocale: FloussyLocale = locale;
  const copy = COPY[effectiveLocale];
  const direction = getLocaleDirection(effectiveLocale);
  const isArabic = effectiveLocale === "ar";
  const pageFontClass = `${arabicFont.className} ${isArabic ? "lp-ar" : ""}`;
  const headingClass = arabicFont.className;

  const allocation = useMemo(() => {
    let remaining = salary;
    const rows = RULES.map((rule) => {
      const want = rule.kind === "fixed" ? scaledFixedAmount(rule, salary) : Math.round((salary * rule.pct) / 100);
      const got = Math.max(0, Math.min(want, remaining));
      remaining -= got;
      return {
        key: rule.key,
        color: rule.color,
        value: got,
        tag: rule.kind === "fixed" ? copy.sim.fixed : `${rule.pct} %`,
      };
    });
    return { rows, savings: Math.max(0, remaining) };
  }, [salary, copy.sim.fixed]);

  const onPhoneMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const scene = event.currentTarget;
    const phone = phoneRef.current;
    const rect = scene.getBoundingClientRect();
    const dx = (event.clientX - rect.left) / rect.width - 0.5;
    const dy = (event.clientY - rect.top) / rect.height - 0.5;
    if (phone) {
      phone.style.transform = `rotateY(${(dx * 13).toFixed(2)}deg) rotateX(${(-dy * 13).toFixed(2)}deg) translateZ(14px)`;
    }
    scene.querySelectorAll<HTMLElement>(".lp-chip").forEach((chip, index) => {
      const depth = 12 + (index % 3) * 7;
      chip.style.transform = `translate(${(dx * depth).toFixed(1)}px, ${(dy * depth).toFixed(1)}px)`;
    });
  };

  const onPhoneLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    const phone = phoneRef.current;
    if (phone) phone.style.transform = "";
    event.currentTarget.querySelectorAll<HTMLElement>(".lp-chip").forEach((chip) => {
      chip.style.removeProperty("transform");
    });
  };

  const heroChips = [
    { t: copy.chips.rent, a: "-3 200 MAD", m: copy.chips.rentM, up: false, cls: "lp-c1" },
    { t: copy.chips.sal, a: "+12 400 MAD", m: copy.chips.salM, up: true, cls: "lp-c2" },
    { t: copy.chips.net, a: "-199 MAD", m: copy.chips.netM, up: false, cls: "lp-c3" },
    { t: copy.chips.debt, a: "-2 100 MAD", m: copy.chips.debtM, up: false, cls: "lp-c4" },
    { t: copy.chips.sav, a: "+1 500 MAD", m: copy.chips.savM, up: true, cls: "lp-c5" },
  ];

  const navLinks = [
    { href: "#simulateur", label: copy.nav.sim },
    { href: "#pourqui", label: copy.nav.who },
  ];

  const Arrow = () => (
    <svg className="lp-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );

  const GooglePlayIcon = ({ className = "w-7 h-7" }: { className?: string }) => (
    <svg viewBox="0 0 512 512" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M47.2 24.3C40.6 31.4 36.8 42.4 36.8 56.4V455.6c0 14 3.8 25 10.4 32.1l1.8 1.7L273.4 265v-4.4L49 22.6l-1.8 1.7z" fill="#00A0FF" />
      <path d="M352.4 344L273.4 265v-4.4L352.4 182l2.4 1.4 93.6 53.2c26.7 15.2 26.7 40.1 0 55.3l-93.6 53.2-2.4 1.3z" fill="#FFC107" />
      <path d="M354.8 342.7L273.4 261.3 47.2 487.7c8.8 9.3 23.3 10.5 39.8 1.1l267.8-146.1" fill="#FF3D00" />
      <path d="M354.8 171.3L87 25.2C70.5 15.8 56 17 47.2 26.3L273.4 252.7l81.4-81.4z" fill="#4CAF50" />
    </svg>
  );

  return (
    <div
      className={`lp-root ${pageFontClass} ${introReady ? "lp-intro" : ""}`}
      dir={direction}
      lang={effectiveLocale}
      data-landing-locale={effectiveLocale}
    >
      {/* 🚀 GOOGLE PLAY / ANDROID POPUP MODAL (LIGHT THEME) */}
      <AnimatePresence>
        {showGooglePlayPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowGooglePlayPopup(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.25)] text-slate-900 overflow-hidden text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Subtle ambient light glows */}
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowGooglePlayPopup(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                aria-label="Fermer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Logo Emblem */}
              <div className="mx-auto mb-3.5 w-16 h-16 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-center shadow-sm">
                <GooglePlayIcon className="w-9 h-9 flex-shrink-0" />
              </div>

              {/* Status Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300/70 rounded-full mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                {isArabic ? "تطبيق أندرويد الرسمي" : "Disponible sur Android"}
              </span>

              {/* Main Headline */}
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-2">
                {isArabic ? "7sabek في جيبك أينما كنت !" : "7sabek sur votre smartphone"}
              </h3>

              {/* Concise 1-sentence description */}
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-5 max-w-sm mx-auto">
                {isArabic
                  ? "أظرفة الميزانية 100% بدون إنترنت، تسجيل بالدارجة بالصوت وحماية فورية بالبصمة."
                  : "Budget par enveloppes 100% hors-ligne, saisie vocale en Darija et verrouillage biométrique."}
              </p>

              {/* 3 Sleek Highlight Pills */}
              <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
                <span className="px-2.5 py-1 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                  ⚡ {isArabic ? "بدون إنترنت" : "Hors-Ligne"}
                </span>
                <span className="px-2.5 py-1 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                  🎙️ {isArabic ? "صوت بالدارجة" : "Voix Darija"}
                </span>
                <span className="px-2.5 py-1 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                  🛡️ {isArabic ? "بصمة" : "Biométrie"}
                </span>
              </div>

              {/* High-Impact CTA Button */}
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="/7sabek_app.apk"
                download="7sabek_app.apk"
                onClick={() => setShowGooglePlayPopup(false)}
                className="w-full inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-600/25 transition-all text-sm cursor-pointer"
              >
                <GooglePlayIcon className="w-5 h-5 flex-shrink-0" />
                <span>{isArabic ? "تحميل التطبيق مجاناً (APK)" : "Télécharger l'Application (APK)"}</span>
              </motion.a>

              {/* Secondary Action Link */}
              <button
                type="button"
                onClick={() => setShowGooglePlayPopup(false)}
                className="mt-3 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer py-1 block w-full text-center"
              >
                {isArabic ? "المتابعة على الموقع" : "Continuer sur le Web"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lp-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      {/* ============================ HEADER ============================ */}
      <header className={`lp-header ${scrolled ? "lp-scrolled" : ""}`}>
        <div className="lp-wrap lp-headrow">
          <Link href="#top" aria-label="7sabek">
            {/* The brand PNGs are square with wide transparent padding, so the box
                has to be ~2.4x the intended visual height. */}
            <BrandLogo locale={effectiveLocale} className="lp-logo" priority />
          </Link>

          <nav className="lp-nav">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
          </nav>

          <div className="lp-actions">
            <button
              type="button"
              onClick={() => setShowGooglePlayPopup(true)}
              className="lp-btn lp-btn-ghost lp-btn-sm inline-flex items-center gap-1.5 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40 cursor-pointer"
              title={isArabic ? "تطبيق أندرويد" : "App Android"}
            >
              <GooglePlayIcon className="w-4 h-4" />
              <span className="lp-hide-sm">{isArabic ? "تطبيق أندرويد" : "App Android"}</span>
            </button>
            <button
              type="button"
              onClick={openLanguagePicker}
              className="lp-lang lp-hide-sm"
              aria-label={isArabic ? "تغيير اللغة" : "Changer de langue"}
              title={isArabic ? "تغيير اللغة" : "Changer de langue"}
            >
              <Globe size={15} />
              <span>{getLocaleBadgeLabel(locale)}</span>
            </button>
            {checkingAuth ? null : user ? (
              <>
                <Link href={user.role === "superadmin" ? "/superadmin" : "/dashboard"} className="lp-btn lp-btn-accent lp-btn-sm">
                  {copy.cta.dashboard}
                </Link>
                <button type="button" onClick={handleLogout} className="lp-btn lp-btn-ghost lp-btn-sm">
                  {copy.cta.logout}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="lp-btn lp-btn-ghost lp-btn-sm lp-hide-sm">{copy.cta.login}</Link>
                <Link href="/register" className="lp-btn lp-btn-accent lp-btn-sm">{copy.cta.start}</Link>
              </>
            )}
            <button
              type="button"
              className="lp-burger"
              aria-label="Menu"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav((prev) => !prev)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {mobileNav ? (
          <div className="lp-mobilenav">
            <div className="lp-wrap">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMobileNav(false)}>{link.label}</a>
              ))}
              <Link href="/login" onClick={() => setMobileNav(false)}>{copy.cta.login}</Link>

              {/* 🌍 Language switcher inside mobile lateral menu */}
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-[var(--line)]">
                <span className="text-sm font-semibold text-[var(--ink-soft)]">
                  {isArabic ? "اللغة" : "Langue"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMobileNav(false);
                    openLanguagePicker();
                  }}
                  className="lp-lang inline-flex items-center gap-2"
                  aria-label={isArabic ? "تغيير اللغة" : "Changer de langue"}
                >
                  <Globe size={15} />
                  <span>{getLocaleBadgeLabel(locale)}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main id="top">
        {/* ============================ HERO ============================ */}
        <section className="lp-hero">
          <div className="lp-herobg" aria-hidden="true">
            <span className="lp-blob lp-blob-a" />
            <span className="lp-blob lp-blob-b" />
          </div>

          <div className="lp-wrap lp-herogrid">
            <div>
              <h1 className={`${headingClass} lp-h1`}>
                <span className="lp-tagAccent">{copy.hero.taglineA}</span>{" "}
                <span className="lp-tagInk">{copy.hero.taglineB}</span>
              </h1>
              <div className="lp-ctarow">
                <Link href="/register" className="lp-btn lp-btn-accent">{copy.cta.free}<Arrow /></Link>

                {/* Device-aware install CTA: Android → Play/APK popup, iOS →
                    the existing "Add to Home Screen" prompt, Chromium desktop
                    → the browser's own PWA install prompt. Nothing on other
                    desktop browsers (no install path to trigger). Each one
                    keeps that platform's own brand color instead of a flat
                    black pill. */}
                {heroInstallKind === "android" ? (
                  <button
                    type="button"
                    onClick={() => setShowGooglePlayPopup(true)}
                    className="lp-btn lp-btn-ghost lp-install lp-install-android"
                  >
                    <GooglePlayIcon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span>{copy.cta.installAndroid}</span>
                  </button>
                ) : heroInstallKind === "ios" ? (
                  <button
                    type="button"
                    onClick={() => triggerAddToHomeScreenPrompt()}
                    className="lp-btn lp-btn-ghost lp-install lp-install-ios"
                  >
                    <Apple className="w-4 h-4 flex-shrink-0" />
                    <span>{copy.cta.installIOS}</span>
                  </button>
                ) : heroInstallKind === "chromium-desktop" && chromeDeferredPrompt ? (
                  <button
                    type="button"
                    onClick={handleChromeInstall}
                    className="lp-btn lp-btn-ghost lp-install lp-install-chrome"
                  >
                    <Chrome className="w-4 h-4 flex-shrink-0" />
                    <span>{copy.cta.installChrome}</span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="lp-visual" onPointerMove={onPhoneMove} onPointerLeave={onPhoneLeave}>
              {heroChips.map((chip) => (
                <div key={chip.t} className={`lp-chip ${chip.cls} ${chip.up ? "lp-pos" : ""}`}>
                  <div className="lp-chipt">{chip.t}</div>
                  <div className="lp-chipa" dir="ltr">{chip.a}</div>
                  <div className="lp-chipm">{chip.m}</div>
                </div>
              ))}

              <div className="lp-phone" ref={phoneRef}>
                <div className="lp-screen">
                  <div className="lp-sctop"><span>7sabek</span><span>{copy.sc.cycle}</span></div>
                  <div className="lp-sccash">
                    <div className="lp-sclbl">{copy.sc.cash}</div>
                    <div className="lp-scamt" dir="ltr">2 640,00 MAD</div>
                  </div>
                  <div className="lp-scenvs">
                    {[
                      { n: copy.env.food, v: "640 / 1 100", w: "58%", c: "#17C777" },
                      { n: copy.env.transport, v: "210 / 400", w: "52%", c: "#17C777" },
                      { n: copy.env.fun, v: "340 / 350", w: "97%", c: "#F2A93B" },
                      { n: copy.env.save, v: "1 500 / 1 500", w: "100%", c: "#17C777" },
                    ].map((row, index) => (
                      <div key={row.n} className="lp-scenv">
                        <div className="lp-scrow"><span>{row.n}</span><span dir="ltr">{row.v}</span></div>
                        <div className="lp-bar">
                          <span style={{ width: row.w, background: row.c, transitionDelay: `${0.25 + index * 0.12}s` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================ MARQUEE ============================ */}
        <div className="lp-marquee" aria-hidden="true">
          <div className="lp-mqtrack">
            {[0, 1].map((pass) => (
              <div key={pass} className="lp-mqgroup">
                {MARQUEE.map((item) => (
                  <span key={`${pass}-${item.key}-${item.v}`} className="lp-mqitem">
                    <span className="lp-mqdot" style={{ background: item.c }} />
                    <span>{copy.env[item.key]}</span>
                    <span className={`lp-mqv ${item.up ? "lp-up" : ""}`} dir="ltr">{item.v} MAD</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ============================ WHY 7SABEK ============================ */}
        <section id="pourquoi" className="lp-section">
          <div className="lp-wrap">
            <div className="lp-head lp-center">
              <span className="lp-kicker">{copy.why.kicker}</span>
            </div>
            <div className="lp-whygrid">
              {copy.why.items.map((item, index) => {
                return (
                  <div key={item.t} className="lp-whycard">
                    <span className="lp-whyblob">
                      <Image src={WHY_IMAGES[index]} alt={item.t} width={176} height={176} className="lp-whyimg" />
                      <span className="lp-whystep" dir="ltr">{`0${index + 1}`}</span>
                    </span>
                    <h3>{item.t}</h3>
                    <p>{item.d}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================ SIMULATOR ============================ */}
        <section id="simulateur" className="lp-section lp-pt0">
          <div className="lp-wrap">
            <div className="lp-head lp-center">
              <span className="lp-kicker">{copy.sim.kicker}</span>
            </div>

            <div className="lp-simcard">
              <div className="lp-simgrid">
                <div>
                  <div className="lp-simlbl">{copy.sim.income}</div>
                  <div className={`${headingClass} lp-simamt`}>
                    <span dir="ltr">{fmt(salary)}</span><span className="lp-cur">MAD</span>
                  </div>
                  <input
                    type="range"
                    min={3000}
                    max={40000}
                    step={100}
                    value={salary}
                    onChange={(event) => setSalary(Number(event.target.value))}
                    aria-label={copy.sim.income}
                  />
                  <div className="lp-simscale"><span dir="ltr">3 000</span><span dir="ltr">40 000</span></div>
                  <div className="lp-presets">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="lp-preset"
                        aria-pressed={salary === preset}
                        onClick={() => setSalary(preset)}
                      >
                        <span dir="ltr">{fmt(preset)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="lp-simlegend">
                    <span className="lp-legendtag">{copy.sim.fixed}</span> {copy.sim.fixedHint}
                    <span className="lp-legendsep" aria-hidden="true">·</span>
                    <span className="lp-legendtag">%</span> {copy.sim.pctHint}
                  </p>
                  <div className="lp-alloc">
                    {allocation.rows.map((row) => (
                      <div key={row.key} className="lp-allocrow">
                        <div className="lp-allocname">
                          <span className="lp-allocdot" style={{ background: row.color }} />
                          <span>{copy.env[row.key]}</span>
                          <span className="lp-alloctag">{row.tag}</span>
                        </div>
                        <div className="lp-allocval" dir="ltr">{fmt(row.value)} MAD</div>
                        <div className="lp-allocbar">
                          <span style={{ width: `${Math.min(100, (row.value / Math.max(salary, 1)) * 100)}%`, background: row.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="lp-alloctotal">
                    <span className="lp-k">{copy.sim.left}</span>
                    <span className={`${headingClass} lp-v`} dir="ltr">{fmt(allocation.savings)} MAD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================ COMPARE ============================ */}
        <section className="lp-section">
          <div className="lp-wrap">
            <div className="lp-head">
              <span className="lp-kicker">{copy.cmp.kicker}</span>
              <h2 className={`${headingClass} lp-h2`}>{copy.cmp.title}</h2>
            </div>
            <div className="lp-comparewrap">
              <div className="lp-tscroll">
                <table className="lp-compare">
                  <thead>
                    <tr><th>{copy.cmp.a}</th><th className="lp-win">{copy.cmp.b}</th></tr>
                  </thead>
                  <tbody>
                    {copy.cmp.rows.map(([a, b]) => (
                      <tr key={a}><td>{a}</td><td className="lp-win">{b}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ============================ AUDIENCE ============================ */}
        <section id="pourqui" className="lp-section lp-surface lp-band">
          <div className="lp-wrap">
            <div className="lp-head">
              <span className="lp-kicker">{copy.who.kicker}</span>
              <h2 className={`${headingClass} lp-h2`}>{copy.who.title}</h2>
            </div>
            <div className="lp-grid2">
              {copy.who.items.map((item, index) => (
                <div key={item.t} className="lp-card" style={{ "--d": `${index * 0.07}s` } as React.CSSProperties}>
                  <h3>{item.t}</h3>
                  <p>{item.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ FINAL ============================ */}
        <section className="lp-section">
          <div className="lp-wrap">
            <div className="lp-dark lp-final">
              <h2 className={`${headingClass} lp-white`}>{copy.fin.title}</h2>
              <div className="lp-ctarow lp-centerrow">
                <Link href="/register" className="lp-btn lp-btn-accent">{copy.cta.free}<Arrow /></Link>
                <a href="#pourquoi" className="lp-btn lp-btn-ghostdark">{copy.fin.alt}</a>
              </div>
              <p className="lp-finmicro">{copy.fin.micro}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footrow">
            <BrandLogo locale={effectiveLocale} className="lp-logo lp-logofoot" />
            <div className="lp-footlinks">
              <Link href="/cgu">{copy.nav.cgu}</Link>
              <Link href="/privacy">{copy.nav.priv}</Link>
              <Link href="/contact">{copy.nav.contact}</Link>
            </div>
          </div>
          <div className="lp-footcopy">{copy.foot}</div>
        </div>
      </footer>

      <style jsx global>{`
        .lp-root {
          --ink: #0a241d; --paper: #f6f8f4; --surface: #fff;
          --ink-soft: #4e625a; --ink-mute: #7c8d86;
          --accent: #17c777; --accent-deep: #0b8f53; --accent-soft: #e2f7ec;
          --amber: #f2a93b; --sky: #4c7eff; --rose: #f2686b;
          --line: #e3e8df; --line2: #eef1ea;
          --shadow: 0 1px 2px rgba(10,36,29,.04), 0 18px 40px -22px rgba(10,36,29,.22);
          background: var(--paper); color: var(--ink); overflow-x: hidden;
          font-family: "Cairo", var(--font-cairo), sans-serif !important;
        }
        .lp-root, .lp-root * {
          font-family: "Cairo", var(--font-cairo), sans-serif !important;
        }
        .lp-root svg, .lp-root button svg, .lp-root a svg {
          font-family: initial !important;
        }
        .lp-root h1, .lp-root h2, .lp-root h3, .lp-root h4 { margin: 0; letter-spacing: -.01em; text-wrap: balance; font-family: "Cairo", var(--font-cairo), sans-serif !important; }
        .lp-ar h1, .lp-ar h2, .lp-ar h3, .lp-ar h4, .lp-ar .lp-title { letter-spacing: 0 !important; }
        .lp-root p { margin: 0; }
        .lp-root a { color: inherit; text-decoration: none; }
        .lp-wrap { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
        @media (max-width: 640px) { .lp-wrap { padding: 0 18px; } }

        .lp-progress { position: fixed; top: 0; inset-inline: 0; height: 3px; z-index: 80; pointer-events: none; }
        .lp-progress > span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--sky)); box-shadow: 0 0 12px rgba(23,199,119,.6); }
        [dir="rtl"] .lp-progress > span { margin-inline-start: auto; }

        .lp-header { position: sticky; top: 0; z-index: 60; background: rgba(246,248,244,.88); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); transition: box-shadow .3s ease, background .3s ease; }
        .lp-header.lp-scrolled { box-shadow: 0 8px 30px -18px rgba(10,36,29,.35); background: rgba(246,248,244,.95); }
        .lp-headrow { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 78px; transition: height .3s ease; }
        .lp-scrolled .lp-headrow { height: 66px; }
        .lp-logo { height: 72px; width: auto; transition: height .3s ease; }
        .lp-scrolled .lp-logo { height: 60px; }
        .lp-nav { display: none; align-items: center; gap: 28px; font-size: .9rem; font-weight: 600; color: var(--ink-soft); }
        .lp-nav a { position: relative; padding: 4px 0; }
        .lp-nav a::after { content: ""; position: absolute; inset-inline: 0; bottom: 0; height: 2px; background: var(--accent); transform: scaleX(0); transform-origin: inline-start; transition: transform .22s ease; }
        .lp-nav a:hover { color: var(--ink); } .lp-nav a:hover::after { transform: scaleX(1); }
        @media (min-width: 1040px) { .lp-nav { display: flex; } }
        .lp-actions { display: flex; align-items: center; gap: 8px; }
        .lp-lang { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); font-family: inherit; font-size: .82rem; font-weight: 700; color: var(--ink-soft); cursor: pointer; }
        .lp-lang:hover { border-color: var(--accent); color: var(--accent-deep); }
        .lp-burger { display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--line); border-radius: 10px; padding: 9px 10px; background: var(--surface); cursor: pointer; color: var(--ink); }
        @media (min-width: 1040px) { .lp-burger { display: none; } }
        @media (max-width: 520px) { 
          .lp-hide-sm { display: none; } 
          .lp-lang { padding: 0 10px; min-width: 38px; justify-content: center; gap: 0; }
        }
        .lp-mobilenav { border-top: 1px solid var(--line); background: var(--paper); }
        .lp-mobilenav .lp-wrap { padding-block: 14px 16px; display: flex; flex-direction: column; gap: 13px; font-weight: 700; font-size: .95rem; }

        .lp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; font-weight: 700; font-size: .92rem; border-radius: 12px; padding: 11px 20px; border: 1px solid transparent; cursor: pointer; transition: transform .16s, box-shadow .16s, background .16s, border-color .16s; white-space: nowrap; }
        .lp-btn:hover { transform: translateY(-1px); }
        .lp-btn-sm { padding: 9px 15px; font-size: .83rem; }
        .lp-btn-accent { background: var(--accent); color: #06301f; box-shadow: 0 10px 22px -10px rgba(23,199,119,.6); position: relative; overflow: hidden; }
        .lp-btn-accent:hover { background: var(--accent-deep); color: #fff; }
        .lp-btn-accent::after { content: ""; position: absolute; top: 0; left: -140%; width: 60%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.5), transparent); transform: skewX(-18deg); transition: left .65s ease; }
        .lp-btn-accent:hover::after { left: 150%; }
        .lp-btn-ghost { background: var(--surface); color: var(--ink); border-color: var(--line); }
        .lp-btn-ghost:hover { border-color: var(--ink); }
        .lp-install { border-width: 1.5px; }
        .lp-install-android { border-color: #34a853; color: #1e7e34; }
        .lp-install-android:hover { background: #eefaf1; border-color: #1e7e34; }
        .lp-install-ios { border-color: #1d1d1f; color: #1d1d1f; }
        .lp-install-ios:hover { background: #f2f2f3; border-color: #000; }
        .lp-install-chrome { border-color: #4285f4; color: #1a56c4; }
        .lp-install-chrome:hover { background: #eef4ff; border-color: #1a56c4; }
        .lp-btn-ghostdark { background: transparent; color: #fff; border-color: rgba(255,255,255,.26); }
        .lp-btn-ghostdark:hover { border-color: #fff; background: rgba(255,255,255,.06); }
        [dir="rtl"] .lp-arrow { transform: scaleX(-1); }

        .lp-hero { position: relative; padding: 60px 0 30px; }
        .lp-herobg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .lp-blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: .5; }
        .lp-blob-a { width: 460px; height: 460px; background: rgba(23,199,119,.34); top: -160px; inset-inline-start: -120px; animation: lpDrift1 17s ease-in-out infinite; }
        .lp-blob-b { width: 400px; height: 400px; background: rgba(76,126,255,.2); top: -80px; inset-inline-end: -100px; animation: lpDrift2 21s ease-in-out infinite; }
        @keyframes lpDrift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,50px) scale(1.12); } }
        @keyframes lpDrift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,60px) scale(1.08); } }
        .lp-herogrid { position: relative; display: grid; gap: 44px; align-items: center; }
        @media (min-width: 980px) { .lp-herogrid { grid-template-columns: 1.02fr .98fr; gap: 24px; } }
        .lp-eyebrow { display: inline-flex; align-items: center; gap: 8px; background: var(--accent-soft); color: var(--accent-deep); font-size: .79rem; font-weight: 700; padding: 7px 14px; border-radius: 999px; }
        .lp-sq { width: 6px; height: 6px; border-radius: 2px; background: var(--accent); flex: none; }
        .lp-h1 { font-size: clamp(2.1rem, 4.4vw, 3.6rem); line-height: 1.08; font-weight: 800; margin-top: 20px; }
        .lp-tagAccent { color: var(--accent-deep); }
        .lp-tagInk { color: var(--ink); }
        .lp-ctarow { margin-top: 28px; display: flex; flex-wrap: wrap; align-items: center; gap: 11px; }
        .lp-centerrow { justify-content: center; }
        .lp-trust { margin-top: 34px; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 9px 18px; max-width: 470px; }
        .lp-trustitem { display: flex; align-items: center; gap: 8px; font-size: .79rem; font-weight: 600; color: var(--ink-soft); }
        .lp-tick { width: 16px; height: 16px; border-radius: 50%; background: var(--accent-soft); color: var(--accent-deep); display: flex; align-items: center; justify-content: center; flex: none; }

        .lp-visual { position: relative; min-height: 470px; display: flex; align-items: center; justify-content: center; perspective: 1100px; }
        .lp-phone { position: relative; width: min(100%, 296px); border-radius: 38px; background: linear-gradient(160deg,#153b30,#0a241d); padding: 9px; box-shadow: 0 30px 60px -24px rgba(10,36,29,.45); transform-style: preserve-3d; transition: transform .5s cubic-bezier(.22,1,.36,1); }
        .lp-screen { background: var(--surface); border-radius: 30px; padding: 26px 15px 18px; overflow: hidden; }
        .lp-sctop { display: flex; align-items: center; justify-content: space-between; font-size: .66rem; font-weight: 700; color: var(--ink-mute); }
        .lp-sccash { margin-top: 13px; }
        .lp-sclbl { font-size: .63rem; font-weight: 800; color: var(--ink-mute); text-transform: uppercase; letter-spacing: .06em; }
        .lp-scamt { font-weight: 800; font-size: 1.75rem; margin-top: 2px; font-variant-numeric: tabular-nums; }
        .lp-scenvs { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
        .lp-scenv { background: var(--paper); border-radius: 13px; padding: 9px 11px; }
        .lp-scrow { display: flex; align-items: center; justify-content: space-between; font-size: .72rem; font-weight: 700; }
        .lp-bar { margin-top: 6px; height: 6px; border-radius: 4px; background: var(--line); overflow: hidden; }
        .lp-bar > span { display: block; height: 100%; border-radius: 4px; }
        .lp-intro .lp-bar > span { transform: scaleX(0); transform-origin: inline-start; animation: lpFill 1.1s cubic-bezier(.22,1,.36,1) forwards; animation-delay: inherit; }
        @keyframes lpFill { to { transform: scaleX(1); } }

        .lp-chip { position: absolute; background: var(--surface); border-radius: 15px; padding: 9px 13px; box-shadow: var(--shadow); border: 1px solid var(--line2); font-size: .76rem; min-width: 126px; z-index: 2; animation: lpFloat 6s ease-in-out infinite; }
        .lp-chipt { font-weight: 800; font-size: .74rem; }
        .lp-chipa { font-weight: 800; margin-top: 1px; font-size: .86rem; font-variant-numeric: tabular-nums; }
        .lp-chipm { margin-top: 1px; font-size: .63rem; color: var(--ink-mute); font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
        .lp-pos .lp-chipa { color: var(--accent-deep); }
        @keyframes lpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        .lp-c1 { top: 2%; inset-inline-start: -4%; } .lp-c2 { top: 14%; inset-inline-end: -6%; animation-delay: .9s; }
        .lp-c3 { top: 50%; inset-inline-start: -12%; animation-delay: 1.7s; } .lp-c4 { bottom: 16%; inset-inline-end: -9%; animation-delay: 2.4s; }
        .lp-c5 { bottom: -1%; inset-inline-start: 2%; animation-delay: 3.1s; }
        @media (max-width: 1100px) { .lp-c3 { inset-inline-start: -4%; } .lp-c4 { inset-inline-end: -2%; } .lp-c2 { inset-inline-end: 0; } }
        @media (max-width: 520px) { .lp-c2, .lp-c3, .lp-c4 { display: none; } .lp-c1, .lp-c5 { inset-inline-start: 0; } }

        .lp-marquee { overflow: hidden; border-block: 1px solid var(--line); background: var(--surface); padding: 18px 0; -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
        .lp-mqtrack { display: flex; width: max-content; animation: lpMq 46s linear infinite; }
        .lp-marquee:hover .lp-mqtrack { animation-play-state: paused; }
        .lp-mqgroup { display: flex; gap: 12px; padding-inline-end: 12px; }
        @keyframes lpMq { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        [dir="rtl"] .lp-mqtrack { animation-name: lpMqR; }
        @keyframes lpMqR { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .lp-mqitem { display: flex; align-items: center; gap: 9px; background: var(--paper); border: 1px solid var(--line); border-radius: 99px; padding: 9px 16px; white-space: nowrap; font-size: .82rem; font-weight: 700; }
        .lp-mqdot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
        .lp-mqv { font-variant-numeric: tabular-nums; font-weight: 800; }
        .lp-mqv.lp-up { color: var(--accent-deep); }

        .lp-section { padding: 86px 0; }
        .lp-pt0 { padding-top: 0; }
        .lp-surface { background: var(--surface); }
        .lp-band { border-block: 1px solid var(--line); }
        .lp-head { max-width: 660px; }
        .lp-center { margin: 0 auto; text-align: center; }
        .lp-center .lp-text { margin-inline: auto; }
        .lp-kicker { font-size: .75rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: var(--accent-deep); }
        .lp-ar .lp-kicker { letter-spacing: 0; }
        .lp-h2 { font-size: clamp(1.85rem, 3.3vw, 2.6rem); font-weight: 800; margin-top: 10px; line-height: 1.1; }
        .lp-text { margin-top: 15px; font-size: 1rem; line-height: 1.65; color: var(--ink-soft); max-width: 62ch; }
        .lp-white { color: #fff !important; }

        .lp-simcard { margin-top: 38px; border: 1px solid var(--line); background: var(--surface); border-radius: 34px; padding: 26px; box-shadow: var(--shadow); }
        @media (min-width: 900px) { .lp-simcard { padding: 36px; } }
        .lp-simgrid { display: grid; gap: 32px; }
        @media (min-width: 880px) { .lp-simgrid { grid-template-columns: .85fr 1.15fr; gap: 44px; } }
        .lp-simlbl { font-size: .78rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-mute); }
        .lp-ar .lp-simlbl { letter-spacing: 0; }
        .lp-simamt { font-size: clamp(2.1rem, 4.6vw, 2.9rem); font-weight: 800; margin-top: 6px; font-variant-numeric: tabular-nums; }
        .lp-cur { font-size: .44em; color: var(--ink-mute); font-weight: 700; margin-inline-start: 6px; }
        .lp-simcard input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 99px; background: var(--line); margin-top: 22px; outline: none; }
        .lp-simcard input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 26px; height: 26px; border-radius: 50%; background: var(--accent); border: 4px solid #fff; box-shadow: 0 3px 10px rgba(11,143,83,.4); cursor: pointer; }
        .lp-simcard input[type="range"]::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: var(--accent); border: 4px solid #fff; box-shadow: 0 3px 10px rgba(11,143,83,.4); cursor: pointer; }
        .lp-simscale { display: flex; justify-content: space-between; margin-top: 9px; font-size: .71rem; color: var(--ink-mute); font-weight: 600; }
        .lp-presets { margin-top: 20px; display: flex; flex-wrap: wrap; gap: 7px; }
        .lp-preset { font-family: inherit; font-size: .76rem; font-weight: 700; padding: 7px 13px; border-radius: 99px; border: 1px solid var(--line); background: var(--paper); color: var(--ink-soft); cursor: pointer; transition: all .16s ease; }
        .lp-preset:hover { border-color: var(--accent); color: var(--accent-deep); }
        .lp-preset[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: #fff; }
        .lp-simlegend { margin: 0 0 14px; font-size: .76rem; line-height: 1.6; color: var(--ink-mute); }
        .lp-legendtag { font-weight: 800; color: var(--ink); }
        .lp-legendsep { margin: 0 7px; opacity: .5; }
        .lp-alloc { display: flex; flex-direction: column; gap: 11px; }
        .lp-allocrow { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: center; }
        .lp-allocname { font-size: .87rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .lp-allocdot { width: 9px; height: 9px; border-radius: 3px; flex: none; }
        .lp-alloctag { font-size: .63rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-mute); background: var(--paper); border: 1px solid var(--line); padding: 2px 7px; border-radius: 99px; }
        .lp-ar .lp-alloctag { letter-spacing: 0; }
        .lp-allocval { font-size: .9rem; font-weight: 800; font-variant-numeric: tabular-nums; }
        .lp-allocbar { grid-column: 1/-1; height: 8px; border-radius: 5px; background: var(--line2); overflow: hidden; }
        .lp-allocbar > span { display: block; height: 100%; border-radius: 5px; transition: width .7s cubic-bezier(.22,1,.36,1); }
        .lp-alloctotal { margin-top: 18px; padding-top: 16px; border-top: 1px dashed var(--line); display: flex; justify-content: space-between; align-items: baseline; }
        .lp-alloctotal .lp-k { font-size: .8rem; font-weight: 700; color: var(--ink-soft); }
        .lp-alloctotal .lp-v { font-size: 1.35rem; font-weight: 800; color: var(--accent-deep); font-variant-numeric: tabular-nums; }

        .lp-ckgrid { margin-top: 36px; display: grid; gap: 12px; grid-template-columns: 1fr; }
        @media (min-width: 760px) { .lp-ckgrid { grid-template-columns: repeat(2,1fr); } }
        .lp-ck { display: flex; align-items: flex-start; gap: 13px; text-align: start; width: 100%; font-family: inherit; font-size: .93rem; font-weight: 600; line-height: 1.45; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px 18px; cursor: pointer; transition: border-color .2s, background .2s, transform .2s, box-shadow .2s; }
        .lp-ck:hover { border-color: var(--accent); transform: translateY(-2px); }
        .lp-ckbox { flex: none; width: 24px; height: 24px; border-radius: 8px; border: 2px solid var(--line); display: flex; align-items: center; justify-content: center; color: transparent; font-size: .8rem; font-weight: 900; transition: all .2s ease; margin-top: 1px; }
        .lp-ck[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); }
        .lp-ck[aria-pressed="true"] .lp-ckbox { background: var(--accent); border-color: var(--accent); color: #06301f; }
        .lp-ckresult { margin-top: 26px; border: 1px solid var(--line); background: var(--surface); border-radius: 26px; padding: 26px; display: grid; gap: 22px; box-shadow: var(--shadow); }
        @media (min-width: 860px) { .lp-ckresult { grid-template-columns: auto 1fr; align-items: start; padding: 32px; gap: 34px; } }
        .lp-ckgauge { text-align: center; min-width: 150px; }
        .lp-cknum { font-size: 3.4rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; transition: color .3s ease; }
        .lp-ckden { font-size: 1.3rem; font-weight: 700; color: var(--ink-mute); }
        .lp-cksegs { display: flex; gap: 5px; justify-content: center; margin-top: 14px; }
        .lp-ckseg { width: 19px; height: 7px; border-radius: 99px; background: var(--line); transition: background .35s ease; }
        .lp-ckverdict { font-size: 1.24rem; font-weight: 800; }
        .lp-ckadvice { margin-top: 8px; font-size: .93rem; line-height: 1.6; color: var(--ink-soft); }
        .lp-cksol { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px; }
        .lp-ckchip { display: inline-flex; align-items: center; gap: 7px; background: var(--paper); border: 1px solid var(--line); border-radius: 99px; padding: 7px 14px; font-size: .79rem; font-weight: 700; animation: lpChipIn .35s cubic-bezier(.22,1,.36,1); }
        .lp-ckcd { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex: none; }
        @keyframes lpChipIn { from { opacity: 0; transform: translateY(6px) scale(.94); } to { opacity: 1; transform: none; } }
        .lp-ckactions { margin-top: 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }

        .lp-dark { background: linear-gradient(155deg,#123a2e 0%,#0a241d 60%); color: #eaf4ef; border-radius: 34px; padding: 52px 28px; position: relative; overflow: hidden; }
        @media (min-width: 1000px) { .lp-dark { padding: 70px 60px; } }
        .lp-kaccent { color: var(--accent) !important; }
        .lp-plangrid { display: grid; gap: 40px; }
        @media (min-width: 900px) { .lp-plangrid { grid-template-columns: 1fr 1fr; align-items: center; } }
        .lp-planstep { display: flex; gap: 16px; padding: 17px 0; border-top: 1px solid rgba(255,255,255,.11); }
        .lp-planstep:first-child { border-top: none; }
        .lp-planN { font-weight: 800; font-size: 1.05rem; color: var(--accent); flex: none; width: 30px; font-variant-numeric: tabular-nums; }
        .lp-planstep h4 { font-size: .95rem; font-weight: 800; color: #fff; }
        .lp-planstep p { margin-top: 4px; font-size: .84rem; color: #a9c2b7; line-height: 1.5; }

        .lp-tabs { margin-top: 34px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .lp-tab { font-family: inherit; font-size: .85rem; font-weight: 700; padding: 10px 18px; border-radius: 99px; border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft); cursor: pointer; transition: all .18s ease; }
        .lp-tab:hover { border-color: var(--accent); color: var(--accent-deep); }
        .lp-tab[aria-selected="true"] { background: var(--ink); border-color: var(--ink); color: #fff; }
        .lp-stage { margin-top: 28px; border: 1px solid var(--line); background: var(--surface); border-radius: 34px; padding: 16px; box-shadow: var(--shadow); }
        @media (min-width: 820px) { .lp-stage { padding: 26px; } }
        .lp-shot { animation: lpFade .5s ease; }
        @keyframes lpFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        /* Mock screens use an LTR grid: keep text-anchor start/end meaning left/right in RTL. */
        .lp-shot svg { width: 100%; height: auto; border-radius: 18px; display: block; direction: ltr; }
        .lp-ar .lp-shot svg text { font-family: "Cairo", sans-serif !important; }
        [dir="rtl"] .lp-shot svg text.lp-capsm { transform: translateY(7px); }
        .lp-shotcap { margin-top: 16px; text-align: center; font-size: .87rem; color: var(--ink-soft); line-height: 1.55; max-width: 60ch; margin-inline: auto; }

        .lp-grid2 { margin-top: 40px; display: grid; gap: 16px; grid-template-columns: 1fr; }
        @media (min-width: 720px) { .lp-grid2 { grid-template-columns: repeat(2,1fr); } }
        .lp-card { position: relative; border: 1px solid var(--line); background: var(--surface); border-radius: 26px; padding: 24px; transition: border-color .18s, transform .18s, box-shadow .18s; }
        .lp-card:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: var(--shadow); }
        .lp-card h3 { margin-top: 12px; font-size: 1.02rem; font-weight: 800; }
        .lp-card p { margin-top: 7px; font-size: .87rem; color: var(--ink-soft); line-height: 1.56; }
        .lp-whygrid { margin-top: 44px; display: grid; gap: 32px 20px; grid-template-columns: 1fr; text-align: center; }
        @media (min-width: 640px) { .lp-whygrid { grid-template-columns: repeat(2,1fr); } }
        @media (min-width: 1060px) { .lp-whygrid { grid-template-columns: repeat(4,1fr); } }
        .lp-whyblob { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 176px; height: 176px; margin-bottom: 14px; }
        .lp-whystep { position: absolute; top: 4px; inset-inline-end: 4px; min-width: 26px; height: 26px; padding: 0 6px; border-radius: 999px; background: var(--accent-deep); color: #fff; font-size: .76rem; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3px var(--surface); }
        .lp-whyimg { width: 176px; height: 176px; }
        .lp-whycard h3 { font-size: 1.04rem; font-weight: 800; }
        .lp-whycard p { margin-top: 8px; font-size: .87rem; line-height: 1.58; color: var(--ink-soft); }

        .lp-comparewrap { margin-top: 38px; border: 1px solid var(--line); border-radius: 26px; overflow: hidden; background: var(--surface); }
        .lp-tscroll { overflow-x: auto; }
        .lp-compare { width: 100%; border-collapse: collapse; font-size: .91rem; min-width: 520px; }
        .lp-compare th { text-align: start; padding: 15px 20px; font-size: .74rem; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-mute); font-weight: 800; background: var(--paper); }
        .lp-ar .lp-compare th { letter-spacing: 0; }
        .lp-compare th.lp-win { color: var(--accent-deep); }
        .lp-compare td { padding: 15px 20px; border-top: 1px solid var(--line); color: var(--ink-soft); }
        .lp-compare td.lp-win { font-weight: 700; color: var(--ink); }
        .lp-compare td.lp-win::before { content: "✓"; color: var(--accent); font-weight: 900; margin-inline-end: 8px; }

        .lp-final { text-align: center; }
        .lp-final h2 { font-size: clamp(1.95rem, 4vw, 3rem); font-weight: 800; }
        .lp-final p { margin: 15px auto 0; max-width: 52ch; }
        .lp-finmicro { margin-top: 18px; font-size: .86rem; color: #9fbaae !important; font-weight: 700; }

        .lp-footer { padding: 46px 0 40px; border-top: 1px solid var(--line); }
        .lp-footrow { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px; }
        .lp-logofoot { height: 60px; }
        .lp-footlinks { display: flex; flex-wrap: wrap; gap: 22px; font-size: .84rem; font-weight: 700; color: var(--ink-soft); }
        .lp-footlinks a:hover { color: var(--accent-deep); }
        .lp-footcopy { margin-top: 20px; font-size: .77rem; color: var(--ink-mute); }

        [data-landing-locale="ar"],
        [data-landing-locale="ar"] *,
        .lp-ar, .lp-ar * { font-family: "Cairo", sans-serif !important; letter-spacing: 0 !important; }
        [data-landing-locale="ar"] svg, .lp-ar svg { font-family: initial !important; }

        @media (prefers-reduced-motion: reduce) {
          .lp-blob, .lp-chip, .lp-mqtrack { animation: none !important; }
          .lp-intro .lp-bar > span { animation: none !important; opacity: 1 !important; transform: none !important; }
          .lp-shot { animation: none; }
          .lp-btn-accent::after { display: none; }
          .lp-phone { transition: none; }
        }
      `}</style>
    </div>
  );
}
