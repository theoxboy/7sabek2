"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cairo, Manrope } from "next/font/google";

import { resetAuthClientState } from "@/lib/api";
import { fetchMe, hasAuthSessionHint, logout, markAuthSessionHint, type AuthUser } from "@/lib/auth";
import { startGuestSession } from "@/lib/guestSession";
import { shouldShowDiscoveryWelcome } from "@/lib/guestWelcome";
import {
  getBrowserLocalePreference,
} from "@/components/i18n/LanguagePreferenceGate";
import {
  getLocaleDirection,
  isSupportedLocale,
  persistLocaleCookie,
  type FloussyLocale,
} from "@/lib/localePreference";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";

type Copy = {
  navSim: string;
  navWho: string;
  navApk: string;
  login: string;
  logout: string;
  dashboard: string;
  start: string;
  badge: string;
  h1a: string;
  h1b: string;
  lead: string;
  cta1: string;
  cta2: string;
  cta3: string;
  trust1: string;
  trust2: string;
  trust3: string;
  activeEnvelopes: string;
  cashAvailable: string;
  floaterSal: string;
  floaterRent: string;
  floaterNet: string;
  floaterDebt: string;
  floaterSav: string;
  envFood: string;
  envTransport: string;
  envFun: string;
  envSav: string;
  envRent: string;
  envNet: string;
  envDebt: string;
  envEid: string;
  omarBadge: string;
  omarTitle: string;
  omarText: string;
  omarTag1: string;
  omarTag2: string;
  omarTag3: string;
  omarUserMsg: string;
  omarBotMsg: string;
  omarBotSub: string;
  omarOnline: string;
  whyKicker: string;
  whyTitle: string;
  steps: Array<{ n: string; title: string; text: string }>;
  simKicker: string;
  simTitle: string;
  simSalaryLabel: string;
  simFixedTitle: string;
  simVarTitle: string;
  simSavingProjected: string;
  simMonthUnit: string;
  simYearUnit: string;
  simDisclaimer: string;
  cmpTitle: string;
  cmpScrollHint: string;
  cmpColCrit: string;
  cmpColOld: string;
  cmpColNew: string;
  compare: Array<{ k: string; old: string; neu: string }>;
  whoKicker: string;
  whoTitle: string;
  who: Array<{ title: string; text: string; tag: string; tint: string; color: string; icon: string }>;
  finTitle: string;
  finSub: string;
  finCta1: string;
  finCta2: string;
  finTrust: string;
  footCgu: string;
  footPrivacy: string;
  footContact: string;
  footReleases: string;
  footRights: string;
  apkTitle: string;
  apkSub: string;
  apkF1: string;
  apkF2: string;
  apkF3: string;
  apkDownload: string;
  apkHint: string;
};

const TRANSLATIONS: Record<FloussyLocale, Copy> = {
  fr: {
    navSim: "Simulateur",
    navWho: "Pour qui",
    navApk: "App Android",
    login: "Connexion",
    logout: "Déconnexion",
    dashboard: "Mon budget",
    start: "Commencer",
    badge: "La méthode des enveloppes, en Darija",
    h1a: "Ton budget,",
    h1b: "entre tes mains.",
    lead: "Répartis ton salaire en enveloppes virtuelles avant le début du mois. Zéro tableur, zéro stress : chaque dirham a sa mission.",
    cta1: "Commencer gratuitement",
    cta2: "Essayer sans compte",
    cta3: "Installer l’app",
    trust1: "Gratuit",
    trust2: "Aucune banque connectée",
    trust3: "Données privées",
    activeEnvelopes: "ENVELOPPES ACTIVES",
    cashAvailable: "Cash disponible",
    floaterSal: "Salaire",
    floaterRent: "Loyer",
    floaterNet: "Internet",
    floaterDebt: "Crédit voiture",
    floaterSav: "Épargne",
    envFood: "Courses",
    envTransport: "Transport",
    envFun: "Sorties",
    envSav: "Épargne",
    envRent: "Loyer",
    envNet: "Internet",
    envDebt: "Crédit",
    envEid: "Aïd al-Adha",
    omarBadge: "ASSISTANT IA",
    omarTitle: "Ba Omar (IA) pilote votre budget",
    omarText: "Parlez-lui ou écrivez-lui en Darija marocaine. Il enregistre la dépense dans la bonne enveloppe, sans aucun calcul de votre part.",
    omarTag1: "Voix ou texte",
    omarTag2: "Darija, français, anglais",
    omarTag3: "Classement automatique",
    omarUserMsg: "خسرت 150 درهم فالمارشي",
    omarBotMsg: "C’est noté ! 150 MAD retirés de l’enveloppe Courses.",
    omarBotSub: "Il reste 350 MAD jusqu’à ta prochaine paie.",
    omarOnline: "En ligne",
    whyKicker: "POURQUOI 7SABEK",
    whyTitle: "Une méthode en 4 étapes. Zéro tableur, zéro stress.",
    steps: [
      { n: "01", title: "État des lieux en 2 min", text: "Revenus et charges fixes configurés dès l’inscription." },
      { n: "02", title: "Répartition sur-mesure", text: "Chaque dirham reçoit une mission claire avant le début du mois." },
      { n: "03", title: "Suivi en direct", text: "Chaque dépense est classée dans la bonne enveloppe, sans calcul manuel." },
      { n: "04", title: "Objectifs & zéro dette", text: "Épargne sécurisée et crédits soldés, en toute sérénité." },
    ],
    simKicker: "SIMULATEUR",
    simTitle: "Combien peux-tu épargner chaque mois ?",
    simSalaryLabel: "Ton salaire mensuel",
    simFixedTitle: "CHARGES FIXES",
    simVarTitle: "ENVELOPPES VARIABLES",
    simSavingProjected: "Épargne projetée",
    simMonthUnit: "MAD / mois",
    simYearUnit: "MAD / an",
    simDisclaimer: "Simulation indicative basée sur une répartition type. Dans l’app, tu fixes tes propres montants.",
    cmpTitle: "Un tracker te dit où est parti ton argent. 7sabek lui donne une mission.",
    cmpScrollHint: "Glisse pour comparer les colonnes →",
    cmpColCrit: "CRITÈRE",
    cmpColOld: "TRACKER CLASSIQUE",
    cmpColNew: "7SABEK",
    compare: [
      { k: "Approche", old: "Historique passif", neu: "Plan financier proactif dès J1" },
      { k: "Vision", old: "Un seul solde confus", neu: "Cash, enveloppes, épargne et dettes isolés" },
      { k: "Calculs", old: "Calculs manuels lourds", neu: "Distribution automatique selon tes priorités" },
      { k: "Calendrier", old: "Calendrier rigide", neu: "Cycles calés sur ta vraie date de paie" },
      { k: "Saisie", old: "Saisie fastidieuse", neu: "Une phrase en langage naturel ou à la voix" },
    ],
    whoKicker: "POUR QUI",
    whoTitle: "Pensé pour la vraie vie au Maroc.",
    who: [
      { title: "Fin de mois sereine", text: "Savoir à tout moment ce qu’il te reste, enveloppe par enveloppe.", tag: "Visibilité", tint: "#E2F1E8", color: "#0A7A53", icon: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
      { title: "Projets & cagnottes", text: "Aïd, vacances, mariage, apport : une cagnotte par projet.", tag: "Épargne", tint: "#FFF4DC", color: "#8A5300", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
      { title: "Remboursement de crédits", text: "Priorise tes dettes et vois la date où tu seras libéré.", tag: "Priorité", tint: "#EFE7F6", color: "#6B3FA0", icon: "M4 6h16v12H4zM4 10h16M8 15h3" },
      { title: "Revenus variables", text: "Freelances et commerçants : un budget qui suit tes rentrées réelles.", tag: "Flexibilité", tint: "#E6EEFA", color: "#2457A6", icon: "M3 17l5-5 4 4 8-8M15 8h5v5" },
    ],
    finTitle: "Ce mois-ci, chaque dirham aura sa mission.",
    finSub: "Crée ton compte en 2 minutes ou essaie tout de suite, sans e-mail.",
    finCta1: "Commencer gratuitement",
    finCta2: "Essayer sans compte",
    finTrust: "100 % gratuit · Sans engagement · Données privées",
    footCgu: "CGU",
    footPrivacy: "Confidentialité",
    footContact: "Contact",
    footReleases: "Nouveautés",
    footRights: "© 2026 7sabek. Tous droits réservés.",
    apkTitle: "7sabek pour Android",
    apkSub: "Version 2.4.0 · APK officiel",
    apkF1: "100 % hors-ligne — fonctionne sans connexion",
    apkF2: "Voix en Darija — dicte tes dépenses",
    apkF3: "Verrouillage biométrique — empreinte ou visage",
    apkDownload: "Télécharger 7sabek_app.apk",
    apkHint: "Autorisez l’installation depuis cette source dans les réglages Android.",
  },
  ar: {
    navSim: "المحاكي",
    navWho: "لمن؟",
    navApk: "تطبيق أندرويد",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    dashboard: "ميزانيتي",
    start: "ابدأ",
    badge: "طريقة الأظرفة، بالدارجة",
    h1a: "حسابك",
    h1b: "بيدك.",
    lead: "قسّم الصالير ديالك على أظرفة قبل ما يبدا الشهر. بلا جداول، بلا ستريس: كل درهم عندو المهمة ديالو.",
    cta1: "ابدأ مجانًا",
    cta2: "جرّب بلا حساب",
    cta3: "ثبّت التطبيق",
    trust1: "مجاني",
    trust2: "بلا ربط بالبنك",
    trust3: "معطيات خاصة",
    activeEnvelopes: "الأظرفة النشطة",
    cashAvailable: "الكاش المتوفر",
    floaterSal: "الصالير",
    floaterRent: "الكراء",
    floaterNet: "الأنترنيت",
    floaterDebt: "كريدي الطوموبيل",
    floaterSav: "الادخار",
    envFood: "التقضية",
    envTransport: "التنقل",
    envFun: "الخرجات",
    envSav: "الادخار",
    envRent: "الكراء",
    envNet: "الأنترنيت",
    envDebt: "الكريدي",
    envEid: "عيد الأضحى",
    omarBadge: "مساعد ذكي",
    omarTitle: "با عمر (ذكاء اصطناعي) كيسيّر الميزانية ديالك",
    omarText: "هضر معاه ولا كتب ليه بالدارجة المغربية. كيسجّل المصروف فالظرف المناسب بلا حتى حساب من جيهتك.",
    omarTag1: "بالصوت ولا بالكتابة",
    omarTag2: "دارجة، فرنسية، إنجليزية",
    omarTag3: "تصنيف تلقائي للمصاريف",
    omarUserMsg: "خسرت 150 درهم فالمارشي",
    omarBotMsg: "مقيدة ! نقصت 150 درهم من ظرف التقضية.",
    omarBotSub: "باقي ليك 350 درهم حتى لتاريخ الصالير الجاي.",
    omarOnline: "متصل الآن",
    whyKicker: "علاش 7SABEK",
    whyTitle: "طريقة بسيطة فـ 4 خطوات. بلا جداول، بلا ستريس.",
    steps: [
      { n: "01", title: "نظرة واضحة فـ 2 دقايق", text: "الدخل والمصاريف الثابتة مضبوطين من أول خطوة." },
      { n: "02", title: "توزيع مفصل على قياسك", text: "كل درهم عندو هدف واضح قبل ما يبدا الشهر." },
      { n: "03", title: "تتبع المصاريف فالحين", text: "المصاريف كتمشي للظرف الصحيح بلا حسابات يدوية." },
      { n: "04", title: "أهداف محققة وبلا ديون", text: "ادخار مضمون وتصفية الكريديات بكل راحة بال." },
    ],
    simKicker: "المحاكي",
    simTitle: "شحال تقدر توفر كل شهر ؟",
    simSalaryLabel: "الصالير الشهري ديالك",
    simFixedTitle: "المصاريف الثابتة",
    simVarTitle: "أظرفة المصاريف اليومية",
    simSavingProjected: "الادخار المتوقع",
    simMonthUnit: "درهم / شهر",
    simYearUnit: "درهم / عام",
    simDisclaimer: "محاكاة تقديرية مبنية على توزيع متوازن. فالتطبيق، تقدر تختار المبالغ لي مسلكاك.",
    cmpTitle: "التطبيقات العادية كتقولك فين مشاو فلوسك. 7sabek كيعطي لكل درهم مهمة.",
    cmpScrollHint: "مرر لمشاهدة المقارنة ←",
    cmpColCrit: "المعيار",
    cmpColOld: "تطبيق عادي",
    cmpColNew: "7SABEK",
    compare: [
      { k: "المنهجية", old: "تتبع الماضي فقط", neu: "خطة استباقية من أول نهار" },
      { k: "الرؤية", old: "رصيد واحد مخلط", neu: "كاش، أظرفة، ادخار وديون معزولين" },
      { k: "الحسابات", old: "حسابات يدوية معقدة", neu: "توزيع أوتوماتيكي حسب أولوياتك" },
      { k: "الروزنامة", old: "تقويم شهري جامد", neu: "دورات مضبوطة على تاريخ الصالير ديالك" },
      { k: "تسجيل المصاريف", old: "إدخال يدوي طويل", neu: "جملة وحدة بالصوت ولا بالكتابة فثانية" },
    ],
    whoKicker: "لشكون",
    whoTitle: "مصمم للواقع الحقيقي فالمغرب.",
    who: [
      { title: "راحة البال فآخر الشهر", text: "تعرف فكل وقت شحال باقي ليك ظرف بظرف.", tag: "وضوح", tint: "#E2F1E8", color: "#0A7A53", icon: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
      { title: "المشاريع ودواير الزمان", text: "العيد، العطلة، العرس ولا الدار: صندوق خاص بكل مشروع.", tag: "توفير", tint: "#FFF4DC", color: "#8A5300", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
      { title: "تصفية الكريديات", text: "رتب ديونك وتعرف على التاريخ لي غتتهنى فيه تمامًا.", tag: "أولوية", tint: "#EFE7F6", color: "#6B3FA0", icon: "M4 6h16v12H4zM4 10h16M8 15h3" },
      { title: "المداخيل المتغيرة", text: "فريلانس وتجار: ميزانية مرنة كتبع الدخل الحقيقي ديالك.", tag: "مرونة", tint: "#E6EEFA", color: "#2457A6", icon: "M3 17l5-5 4 4 8-8M15 8h5v5" },
    ],
    finTitle: "هاد الشهر، كل درهم غتكون عندو مهمة واضحة.",
    finSub: "قاد حسابك فـ 2 دقايق ولا جرّب دابا مباشرة، بلا إيميل.",
    finCta1: "ابدأ مجانًا",
    finCta2: "جرّب بلا حساب",
    finTrust: "100 % مجاني · بلا التزام · بياناتك محمية",
    footCgu: "شروط الاستخدام",
    footPrivacy: "سياسة الخصوصية",
    footContact: "اتصل بنا",
    footReleases: "المستجدات",
    footRights: "© 2026 7sabek. جميع الحقوق محفوظة.",
    apkTitle: "7sabek لأندرويد",
    apkSub: "الإصدار 2.4.0 · ملف APK رسمي",
    apkF1: "100 % بلا أنترنيت — خدام بلا اتصال",
    apkF2: "بالصوت بالدارجة — ملّي عليه مصاريفك",
    apkF3: "أمان بيومتري — بالبصمة ولا بالوجه",
    apkDownload: "تحميل 7sabek_app.apk",
    apkHint: "فعّل السماح بتثبيت التطبيقات من هذا المصدر في إعدادات أندرويد.",
  },
  en: {
    navSim: "Simulator",
    navWho: "Who it’s for",
    navApk: "Android app",
    login: "Log in",
    logout: "Log out",
    dashboard: "My budget",
    start: "Get started",
    badge: "The envelope method, in Darija",
    h1a: "Your budget,",
    h1b: "in your hands.",
    lead: "Split your salary into virtual envelopes before the month starts. No spreadsheets, no stress: every dirham gets a job.",
    cta1: "Start for free",
    cta2: "Try without an account",
    cta3: "Install the app",
    trust1: "Free",
    trust2: "No bank connection",
    trust3: "Private data",
    activeEnvelopes: "ACTIVE ENVELOPES",
    cashAvailable: "Available cash",
    floaterSal: "Salary",
    floaterRent: "Rent",
    floaterNet: "Internet",
    floaterDebt: "Car loan",
    floaterSav: "Savings",
    envFood: "Groceries",
    envTransport: "Transport",
    envFun: "Leisure",
    envSav: "Savings",
    envRent: "Rent",
    envNet: "Internet",
    envDebt: "Loan",
    envEid: "Eid al-Adha",
    omarBadge: "AI ASSISTANT",
    omarTitle: "Ba Omar (AI) runs your budget",
    omarText: "Talk or type to him in Moroccan Darija. He files each expense in the right envelope, no maths needed.",
    omarTag1: "Voice or text",
    omarTag2: "Darija, French, English",
    omarTag3: "Automatic categorization",
    omarUserMsg: "خسرت 150 درهم فالمارشي",
    omarBotMsg: "Got it! 150 MAD deducted from the Groceries envelope.",
    omarBotSub: "350 MAD remaining until your next payday.",
    omarOnline: "Online",
    whyKicker: "WHY 7SABEK",
    whyTitle: "A 4-step method. Zero spreadsheets, zero stress.",
    steps: [
      { n: "01", title: "2-Min Overview", text: "Income and fixed commitments configured right upon sign-up." },
      { n: "02", title: "Tailored Split", text: "Every dirham gets a designated role before the month starts." },
      { n: "03", title: "Live Tracking", text: "Expenses filed into the right envelope with zero manual math." },
      { n: "04", title: "Goals & Zero Debt", text: "Safe savings growth and loans paid off with complete peace of mind." },
    ],
    simKicker: "SIMULATOR",
    simTitle: "How much can you save every month?",
    simSalaryLabel: "Your monthly salary",
    simFixedTitle: "FIXED EXPENSES",
    simVarTitle: "VARIABLE ENVELOPES",
    simSavingProjected: "Projected savings",
    simMonthUnit: "MAD / mo",
    simYearUnit: "MAD / yr",
    simDisclaimer: "Indicative simulation based on typical allocation. Inside the app, you customize your exact amounts.",
    cmpTitle: "A tracker tells you where your money went. 7sabek gives it a mission.",
    cmpScrollHint: "Swipe to compare columns →",
    cmpColCrit: "CRITERIA",
    cmpColOld: "CLASSIC TRACKER",
    cmpColNew: "7SABEK",
    compare: [
      { k: "Approach", old: "Passive history log", neu: "Proactive financial plan from Day 1" },
      { k: "Visibility", old: "Single confusing balance", neu: "Cash, envelopes, savings and debt separated" },
      { k: "Calculations", old: "Heavy manual math", neu: "Automatic distribution based on your priorities" },
      { k: "Calendar", old: "Rigid monthly calendar", neu: "Pay cycles aligned to your real payday" },
      { k: "Logging", old: "Tedious manual forms", neu: "One natural sentence by voice or text" },
    ],
    whoKicker: "WHO IT’S FOR",
    whoTitle: "Crafted for real everyday life in Morocco.",
    who: [
      { title: "Stress-free month-end", text: "Always know exactly what you have left, envelope by envelope.", tag: "Clarity", tint: "#E2F1E8", color: "#0A7A53", icon: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
      { title: "Goals & pots", text: "Eid, holidays, wedding, down payment: a dedicated pot per project.", tag: "Savings", tint: "#FFF4DC", color: "#8A5300", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
      { title: "Debt repayment", text: "Prioritize debt payoffs and track the exact date you’ll be free.", tag: "Priority", tint: "#EFE7F6", color: "#6B3FA0", icon: "M4 6h16v12H4zM4 10h16M8 15h3" },
      { title: "Variable incomes", text: "Freelancers and merchants: allocations adjust to your real cash flow.", tag: "Flexibility", tint: "#E6EEFA", color: "#2457A6", icon: "M3 17l5-5 4 4 8-8M15 8h5v5" },
    ],
    finTitle: "This month, every dirham gets a mission.",
    finSub: "Create your account in 2 minutes or try right now, no email needed.",
    finCta1: "Start for free",
    finCta2: "Try without an account",
    finTrust: "100% free · No commitment · Private data",
    footCgu: "Terms",
    footPrivacy: "Privacy",
    footContact: "Contact",
    footReleases: "Releases",
    footRights: "© 2026 7sabek. All rights reserved.",
    apkTitle: "7sabek for Android",
    apkSub: "Version 2.4.0 · Official APK",
    apkF1: "100% offline — works with zero internet connection",
    apkF2: "Voice in Darija — dictate your expenses",
    apkF3: "Biometric lock — fingerprint or face unlock",
    apkDownload: "Download 7sabek_app.apk",
    apkHint: "Allow installation from this source in your Android security settings.",
  },
};

const PRESET_SALARIES = [6000, 12400, 20000, 32000];

function formatMad(n: number) {
  return Math.round(n)
    .toLocaleString("fr-FR")
    .replace(/ | /g, " ");
}

interface LandingPageClientProps {
  initialLocale: FloussyLocale;
}

export default function LandingPageClient({ initialLocale }: LandingPageClientProps) {
  const router = useRouter();

  // Language state
  const [locale, setLocale] = useState<FloussyLocale>(initialLocale);
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const t = TRANSLATIONS[locale] || TRANSLATIONS.fr;

  // Auth & Guest state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [guestLoading, setGuestLoading] = useState(false);

  // Mobile navigation drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive hero state
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);

  // Interactive assistant spotlight state
  const [sx, setSx] = useState(70);
  const [sy, setSy] = useState(30);

  // Simulator state
  const [salary, setSalary] = useState(12400);

  // APK modal state
  const [apkOpen, setApkOpen] = useState(false);

  // Check auth on mount
  useEffect(() => {
    if (!hasAuthSessionHint()) {
      setUser(null);
      setCheckingAuth(false);
      return;
    }
    fetchMe({ suppressAuthRedirect: true })
      .then((me) => setUser(me))
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  // Listen to locale changes
  useEffect(() => {
    const syncLocale = () => {
      const pref = getBrowserLocalePreference();
      if (pref && isSupportedLocale(pref)) {
        setLocale(pref);
      }
    };
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  const changeLocale = (newLocale: FloussyLocale) => {
    setLocale(newLocale);
    persistLocaleCookie(newLocale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = newLocale;
      document.documentElement.dir = getLocaleDirection(newLocale);
    }
    window.dispatchEvent(
      new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { locale: newLocale } })
    );
  };

  // Guest mode action
  const handleGuestStart = async () => {
    if (guestLoading) return;
    setGuestLoading(true);
    try {
      resetAuthClientState();
      const guest = await startGuestSession();
      markAuthSessionHint();
      router.push(shouldShowDiscoveryWelcome(guest) ? "/decouverte" : "/dashboard");
    } catch {
      router.push("/login");
    } finally {
      setGuestLoading(false);
    }
  };

  // Keyboard accessibility for APK modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && apkOpen) {
        setApkOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [apkOpen]);

  // Hero parallax calculations
  const onHeroMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMx((e.clientX - r.left) / r.width - 0.5);
    setMy((e.clientY - r.top) / r.height - 0.5);
  };

  const onHeroLeave = () => {
    setMx(0);
    setMy(0);
  };

  const phoneTransform = `rotateY(${(mx * 16).toFixed(2)}deg) rotateX(${(-my * 12).toFixed(2)}deg)`;

  // Floating chips
  const floaters = [
    { x: "-20px", y: "70px", ini: "SA", label: t.floaterSal, amount: "+12 400 MAD", tint: "#E2F1E8", fg: "#0A7A53", d: 1.4, delay: "0s", side: "left" },
    { x: "240px", y: "40px", ini: "LO", label: t.floaterRent, amount: "−3 500 MAD", tint: "#EFEDE6", fg: "#0F1A16", d: 1.0, delay: "1.2s", side: "right" },
    { x: "-30px", y: "310px", ini: "IN", label: t.floaterNet, amount: "−300 MAD", tint: "#E6EEFA", fg: "#2457A6", d: 1.8, delay: "0.6s", side: "left" },
    { x: "230px", y: "370px", ini: "CR", label: t.floaterDebt, amount: "−1 800 MAD", tint: "#EFE7F6", fg: "#6B3FA0", d: 1.2, delay: "2s", side: "right" },
    { x: "190px", y: "520px", ini: "EP", label: t.floaterSav, amount: "+1 500 MAD", tint: "#FFF4DC", fg: "#8A5300", d: 1.6, delay: "0.3s", side: "right" },
  ];

  // Marquee ticker items
  const tickerItems = [
    { name: t.envFood, amount: "1 100 MAD", color: "#7FD3AE" },
    { name: t.envTransport, amount: "400 MAD", color: "#8FC2F0" },
    { name: t.envFun, amount: "350 MAD", color: "#F7B58F" },
    { name: t.envSav, amount: "+1 500 MAD", color: "#F2B544" },
    { name: t.envRent, amount: "3 500 MAD", color: "#CFE6DB" },
    { name: t.envEid, amount: "+400 MAD", color: "#F2B544" },
  ];

  // Spotlight on Assistant card
  const onSpot = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSx(((e.clientX - r.left) / r.width) * 100);
    setSy(((e.clientY - r.top) / r.height) * 100);
  };

  // Simulator computations
  const fixedConfig = useMemo(() => [
    { name: t.envRent, pct: 0.28, color: "#06402C" },
    { name: t.envNet, pct: 0.03, color: "#2457A6" },
    { name: t.envDebt, pct: 0.12, color: "#6B3FA0" },
  ], [t]);

  const varConfig = useMemo(() => [
    { name: t.envFood, pct: 0.15, color: "#0A7A53" },
    { name: t.envTransport, pct: 0.06, color: "#5AA9E6" },
    { name: t.envFun, pct: 0.06, color: "#B4441C" },
  ], [t]);

  const usedRatio = useMemo(() => {
    return [...fixedConfig, ...varConfig].reduce((acc, item) => acc + item.pct, 0);
  }, [fixedConfig, varConfig]);

  const savingRatio = Math.max(0, 1 - usedRatio);
  const savingAmount = salary * savingRatio;
  const savingYear = savingAmount * 12;

  const splitBars = useMemo(() => {
    return [
      ...fixedConfig.map((item) => ({ pct: `${(item.pct * 100).toFixed(1)}%`, color: item.color })),
      ...varConfig.map((item) => ({ pct: `${(item.pct * 100).toFixed(1)}%`, color: item.color })),
      { pct: `${(savingRatio * 100).toFixed(1)}%`, color: "#F2B544" },
    ];
  }, [fixedConfig, varConfig, savingRatio]);

  return (
    <div
      dir={dir}
      className={isAr ? cairo.className : manrope.className}
      style={{
        minHeight: "100vh",
        background: "#F6F5EF",
        color: "#0F1A16",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        width: "100%",
      }}
    >
      <style>{`
        html, body {
          overflow-x: hidden;
          width: 100%;
          margin: 0;
          padding: 0;
          -webkit-text-size-adjust: 100%;
        }
        * {
          box-sizing: border-box;
        }
        a { color: #0A7A53; text-decoration: none; }
        a:hover { color: #06402C; }
        @keyframes sbk-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes sbk-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .sbk-track {
          display: flex;
          width: max-content;
          gap: 36px;
          animation: sbk-marquee 32s linear infinite;
        }
        .sbk-float {
          animation: sbk-float 6s ease-in-out infinite;
        }
        input[type="range"] {
          accent-color: #0A7A53;
        }

        /* Responsive Layout Utilities */
        .lp-header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
        }
        @media (min-width: 900px) {
          .lp-header-container {
            padding: 14px 24px;
            gap: 28px;
          }
        }

        .lp-desktop-nav {
          display: none;
        }
        @media (min-width: 900px) {
          .lp-desktop-nav {
            display: flex;
            align-items: center;
            gap: 8px;
          }
        }

        .lp-mobile-menu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid rgba(15, 26, 22, 0.12);
          background: #FFFFFF;
          color: #0F1A16;
          cursor: pointer;
        }
        @media (min-width: 900px) {
          .lp-mobile-menu-btn {
            display: none !important;
          }
        }

        .lp-mobile-drawer {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 16px;
          background: #FFFFFF;
          border-bottom: 1px solid rgba(15, 26, 22, 0.08);
          box-shadow: 0 10px 24px rgba(0,0,0,0.06);
        }

        .lp-hero-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 36px 16px 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
          width: 100%;
        }
        @media (min-width: 900px) {
          .lp-hero-section {
            flex-direction: row;
            padding: 72px 24px 88px;
            gap: 56px;
          }
        }

        .lp-hero-left {
          flex: 1 1 460px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 22px;
          width: 100%;
        }
        @media (min-width: 900px) {
          .lp-hero-left {
            gap: 26px;
          }
        }

        .lp-hero-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        @media (min-width: 580px) {
          .lp-hero-buttons {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
          }
        }
        .lp-hero-btn-primary, .lp-hero-btn-secondary, .lp-hero-btn-apk {
          width: 100%;
          justify-content: center;
        }
        @media (min-width: 580px) {
          .lp-hero-btn-primary, .lp-hero-btn-secondary, .lp-hero-btn-apk {
            width: auto;
          }
        }

        /* 3D Phone Mockup Container on Mobile */
        .lp-phone-stage {
          position: relative;
          width: 360px;
          max-width: 100%;
          height: 610px;
          margin: 0 auto;
          transform-origin: top center;
        }
        @media (max-width: 420px) {
          .lp-phone-stage {
            transform: scale(0.88);
            margin-bottom: -60px;
          }
        }
        @media (max-width: 360px) {
          .lp-phone-stage {
            transform: scale(0.78);
            margin-bottom: -110px;
          }
        }

        /* Floater badges responsive placement */
        @media (max-width: 480px) {
          .lp-floater-left {
            left: 4px !important;
          }
          .lp-floater-right {
            left: 170px !important;
          }
        }

        /* Section containers */
        .lp-section-container {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 60px 16px 0;
        }
        @media (min-width: 900px) {
          .lp-section-container {
            padding: 104px 24px 0;
          }
        }

        /* Assistant IA card */
        .lp-omar-card {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          background: #06402C;
          color: #FFFFFF;
          padding: 28px 20px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          width: 100%;
        }
        @media (min-width: 900px) {
          .lp-omar-card {
            border-radius: 32px;
            padding: 56px;
            flex-direction: row;
            gap: 48px;
            align-items: center;
          }
        }

        /* Simulator card */
        .lp-sim-card {
          background: #FFFFFF;
          border-radius: 24px;
          padding: 24px 18px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          box-shadow: 0 4px 16px rgba(15, 26, 22, 0.04);
          width: 100%;
        }
        @media (min-width: 900px) {
          .lp-sim-card {
            border-radius: 32px;
            padding: 48px;
            flex-direction: row;
            gap: 48px;
          }
        }

        /* Final CTA card */
        .lp-final-card {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          background: #0F1A16;
          color: #FFFFFF;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          text-align: center;
          width: 100%;
        }
        @media (min-width: 900px) {
          .lp-final-card {
            border-radius: 32px;
            padding: 64px 48px;
            gap: 24px;
          }
        }
        .lp-final-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          align-items: stretch;
        }
        @media (min-width: 580px) {
          .lp-final-buttons {
            flex-direction: row;
            width: auto;
            justify-content: center;
          }
        }

        /* Table container */
        .lp-table-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 20px;
          background: #FFFFFF;
          box-shadow: 0 2px 8px rgba(15, 26, 22, 0.04);
          width: 100%;
        }
      `}</style>

      {/* HEADER */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(246, 245, 239, 0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(15, 26, 22, 0.08)",
          width: "100%",
        }}
      >
        <div className="lp-header-container">
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              color: "#0F1A16",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#0A7A53",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                boxShadow: "0 2px 8px rgba(10, 122, 83, 0.25)",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 8l9 6 9-6" />
              </svg>
            </span>
            <span
              style={{
                fontSize: "21px",
                fontWeight: 800,
                letterSpacing: "-0.4px",
                fontFamily: isAr ? cairo.style.fontFamily : manrope.style.fontFamily,
              }}
            >
              {isAr ? "حسابك" : "7sabek"}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="lp-desktop-nav" aria-label="Navigation principale">
            <a
              href="#simulateur"
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                color: "#33423C",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {t.navSim}
            </a>
            <a
              href="#pour-qui"
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                color: "#33423C",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {t.navWho}
            </a>
            <button
              type="button"
              onClick={() => setApkOpen(true)}
              style={{
                padding: "8px 12px",
                border: 0,
                borderRadius: "10px",
                background: "transparent",
                color: "#33423C",
                fontFamily: "inherit",
                fontSize: "15px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="6" y="2" width="12" height="20" rx="2.5" />
                <path d="M11 18h2" />
              </svg>
              {t.navApk}
            </button>
          </nav>

          {/* Header Right Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* Lang switcher */}
            <div
              role="radiogroup"
              aria-label="Langue"
              style={{
                display: "flex",
                padding: "2px",
                borderRadius: "10px",
                background: "rgba(15, 26, 22, 0.06)",
              }}
            >
              {(
                [
                  ["fr", "FR"],
                  ["ar", "AR"],
                  ["en", "EN"],
                ] as const
              ).map(([id, label]) => {
                const isActive = locale === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => changeLocale(id)}
                    style={{
                      height: "30px",
                      minWidth: "36px",
                      padding: "0 6px",
                      border: 0,
                      borderRadius: "8px",
                      background: isActive ? "#FFFFFF" : "transparent",
                      boxShadow: isActive ? "0 1px 3px rgba(15, 26, 22, 0.12)" : "none",
                      fontFamily: "inherit",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#0F1A16",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Auth Buttons */}
            {user ? (
              <Link
                href="/dashboard"
                style={{
                  height: "38px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  background: "#0A7A53",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "14px",
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {t.dashboard}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  style={{
                    height: "38px",
                    padding: "0 10px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#0F1A16",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.login}
                </Link>
                <Link
                  href="/register"
                  style={{
                    height: "38px",
                    padding: "0 14px",
                    borderRadius: "10px",
                    background: "#0F1A16",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "14px",
                    fontWeight: 700,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.start}
                </Link>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="lp-mobile-menu-btn"
              aria-label="Menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <nav className="lp-mobile-drawer" aria-label="Menu mobile">
            <a
              href="#simulateur"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                background: "#F6F5EF",
                color: "#33423C",
                fontSize: "15px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {t.navSim}
            </a>
            <a
              href="#pour-qui"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                background: "#F6F5EF",
                color: "#33423C",
                fontSize: "15px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {t.navWho}
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setApkOpen(true);
              }}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: 0,
                background: "#E2F1E8",
                color: "#06402C",
                fontFamily: "inherit",
                fontSize: "15px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                textAlign: "start",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="6" y="2" width="12" height="20" rx="2.5" />
                <path d="M11 18h2" />
              </svg>
              {t.navApk}
            </button>
          </nav>
        )}
      </header>

      {/* HERO SECTION */}
      <section
        onMouseMove={onHeroMove}
        onMouseLeave={onHeroLeave}
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div className="lp-hero-section">
          {/* Left Column */}
          <div className="lp-hero-left">
            {/* Badge */}
            <span
              style={{
                alignSelf: "flex-start",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "999px",
                background: "#E2F1E8",
                color: "#06402C",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: "#0A7A53",
                }}
              />
              {t.badge}
            </span>

            {/* Heading */}
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(34px, 7vw, 76px)",
                lineHeight: 1.06,
                fontWeight: 800,
                letterSpacing: "-1.5px",
              }}
            >
              {t.h1a}
              <br />
              <span style={{ color: "#0A7A53" }}>{t.h1b}</span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                margin: 0,
                maxWidth: "520px",
                fontSize: "clamp(16px, 3.5vw, 19px)",
                lineHeight: 1.6,
                color: "#4A5A53",
              }}
            >
              {t.lead}
            </p>

            {/* CTAs */}
            <div className="lp-hero-buttons">
              <Link
                href="/register"
                className="lp-hero-btn-primary"
                style={{
                  height: "54px",
                  padding: "0 24px",
                  borderRadius: "14px",
                  background: "#0A7A53",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "16px",
                  fontWeight: 800,
                  textDecoration: "none",
                  boxShadow: "0 8px 20px rgba(10, 122, 83, 0.28)",
                }}
              >
                {t.cta1}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: isAr ? "scaleX(-1)" : "none" }}
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>

              <button
                type="button"
                className="lp-hero-btn-secondary"
                onClick={handleGuestStart}
                disabled={guestLoading}
                style={{
                  height: "54px",
                  padding: "0 20px",
                  borderRadius: "14px",
                  border: "1.5px solid #0F1A16",
                  background: "transparent",
                  color: "#0F1A16",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: guestLoading ? "wait" : "pointer",
                  opacity: guestLoading ? 0.7 : 1,
                  fontFamily: "inherit",
                }}
              >
                {guestLoading ? "..." : t.cta2}
              </button>

              <button
                type="button"
                className="lp-hero-btn-apk"
                onClick={() => setApkOpen(true)}
                style={{
                  height: "54px",
                  padding: "0 18px",
                  borderRadius: "14px",
                  border: 0,
                  background: "#FFFFFF",
                  color: "#0F1A16",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(15, 26, 22, 0.08)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0A7A53"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
                </svg>
                {t.cta3}
              </button>
            </div>

            {/* Trust points */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 18px", fontSize: "14px", color: "#55645D" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A7A53" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-10" />
                </svg>
                {t.trust1}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A7A53" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-10" />
                </svg>
                {t.trust2}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A7A53" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-10" />
                </svg>
                {t.trust3}
              </span>
            </div>
          </div>

          {/* Right Column: 3D Tilt Phone Mockup */}
          <div
            style={{
              flex: "1 1 360px",
              minWidth: 0,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              perspective: "1400px",
            }}
          >
            <div className="lp-phone-stage">
              {/* Radial green glow background */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: "420px",
                  height: "420px",
                  margin: "-210px 0 0 -210px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(10, 122, 83, 0.22), rgba(10, 122, 83, 0) 70%)",
                  pointerEvents: "none",
                }}
              />

              {/* The Phone */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "10px",
                  width: "280px",
                  marginLeft: "-140px",
                  height: "590px",
                  borderRadius: "44px",
                  background: "#0F1A16",
                  padding: "10px",
                  boxSizing: "border-box",
                  boxShadow: "0 30px 70px rgba(6, 64, 44, 0.35)",
                  transform: phoneTransform,
                  transition: "transform 0.2s ease-out",
                }}
              >
                <div
                  dir="ltr"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "36px",
                    overflow: "hidden",
                    background: "#F4F5F1",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Camera pill notch */}
                  <div style={{ height: "30px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <span style={{ width: "80px", height: "20px", borderRadius: "10px", background: "#0F1A16" }} />
                  </div>

                  {/* Phone Screen Content */}
                  <div
                    style={{
                      padding: "8px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      fontFamily: manrope.style.fontFamily,
                    }}
                  >
                    {/* Available Cash Card */}
                    <div
                      style={{
                        borderRadius: "20px",
                        background: "#06402C",
                        color: "#FFFFFF",
                        padding: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span style={{ fontSize: "11px", color: "#9FD8BE", fontWeight: 700 }}>
                        {t.cashAvailable}
                      </span>
                      <span style={{ fontSize: "25px", fontWeight: 800, letterSpacing: "-0.5px" }}>
                        2 640,00 <span style={{ fontSize: "12px", color: "#9FD8BE" }}>MAD</span>
                      </span>
                    </div>

                    {/* Active envelopes header */}
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#55645D" }}>
                      {t.activeEnvelopes}
                    </span>

                    {/* 4 Envelope items */}
                    {[
                      { name: t.envFood, left: "1 100 MAD", pct: "62%", color: "#0A7A53" },
                      { name: t.envTransport, left: "400 MAD", pct: "45%", color: "#2457A6" },
                      { name: t.envFun, left: "350 MAD", pct: "80%", color: "#B4441C" },
                      { name: t.envSav, left: "+1 500 MAD", pct: "35%", color: "#C98A1A" },
                    ].map((e) => (
                      <div
                        key={e.name}
                        style={{
                          background: "#FFFFFF",
                          borderRadius: "14px",
                          padding: "10px 12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          boxShadow: "0 2px 6px rgba(15, 26, 22, 0.04)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                          <b>{e.name}</b>
                          <span style={{ color: "#55645D" }}>{e.left}</span>
                        </div>
                        <div style={{ height: "5px", borderRadius: "3px", background: "#EEF1ED" }}>
                          <div
                            style={{
                              height: "5px",
                              width: e.pct,
                              borderRadius: "3px",
                              background: e.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badges around the phone */}
              {floaters.map((f, i) => (
                <div
                  key={i}
                  className={`sbk-float ${f.side === "left" ? "lp-floater-left" : "lp-floater-right"}`}
                  dir="ltr"
                  style={{
                    position: "absolute",
                    left: f.x,
                    top: f.y,
                    animationDelay: f.delay,
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      transform: `translate(${(mx * 30 * f.d).toFixed(1)}px, ${(my * 24 * f.d).toFixed(1)}px)`,
                      transition: "transform 0.2s ease-out",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px 8px 8px",
                      borderRadius: "14px",
                      background: "#FFFFFF",
                      boxShadow: "0 12px 30px rgba(15, 26, 22, 0.12)",
                      fontFamily: manrope.style.fontFamily,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "8px",
                        background: f.tint,
                        color: f.fg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      {f.ini}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "11px", color: "#55645D" }}>{f.label}</span>
                      <b style={{ fontSize: "13px", color: f.fg }}>{f.amount}</b>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TICKER / MARQUEE BANNER */}
      <div
        aria-label="Mouvements typiques des enveloppes"
        style={{
          overflow: "hidden",
          background: "#0F1A16",
          color: "#FFFFFF",
          padding: "16px 0",
          width: "100%",
        }}
        dir="ltr"
      >
        <div className="sbk-track" style={{ fontFamily: manrope.style.fontFamily, fontSize: "16px", fontWeight: 700 }}>
          {[...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems].map((m, index) => (
            <span key={index} style={{ display: "flex", alignItems: "center", gap: "10px", whiteSpace: "nowrap" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "5px", background: m.color }} />
              {m.name} <span style={{ color: m.color }}>{m.amount}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ASSISTANT IA SECTION (BA OMAR) */}
      <section className="lp-section-container">
        <div onMouseMove={onSpot} className="lp-omar-card">
          {/* Spotlight background gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(420px circle at ${sx.toFixed(0)}% ${sy.toFixed(0)}%, rgba(127, 211, 174, 0.22), rgba(127, 211, 174, 0) 70%)`,
              pointerEvents: "none",
            }}
          />

          {/* Left Text */}
          <div
            style={{
              position: "relative",
              flex: "1 1 420px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <span
              style={{
                alignSelf: "flex-start",
                padding: "6px 12px",
                borderRadius: "999px",
                background: "rgba(242, 181, 68, 0.18)",
                color: "#F2B544",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "1px",
              }}
            >
              {t.omarBadge}
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(26px, 5.5vw, 48px)",
                lineHeight: 1.12,
                fontWeight: 800,
                letterSpacing: "-1px",
              }}
            >
              {t.omarTitle}
            </h2>
            <p style={{ margin: 0, fontSize: "clamp(15px, 3.5vw, 18px)", lineHeight: 1.6, color: "#CFE6DB" }}>
              {t.omarText}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ padding: "8px 12px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.08)", fontSize: "14px" }}>
                {t.omarTag1}
              </span>
              <span style={{ padding: "8px 12px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.08)", fontSize: "14px" }}>
                {t.omarTag2}
              </span>
              <span style={{ padding: "8px 12px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.08)", fontSize: "14px" }}>
                {t.omarTag3}
              </span>
            </div>
          </div>

          {/* Right Simulated Chat Card */}
          <div
            style={{
              position: "relative",
              flex: "1 1 340px",
              minWidth: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "24px",
                  background: "#F2B544",
                  color: "#0F1A16",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: cairo.style.fontFamily,
                  fontSize: "20px",
                  fontWeight: 800,
                }}
              >
                ع
              </span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <b style={{ fontSize: "16px" }}>
                  Ba Omar <span style={{ fontFamily: cairo.style.fontFamily, fontWeight: 600 }}>· با عمر</span>
                </b>
                <span style={{ fontSize: "12px", color: "#9FD8BE" }}>{t.omarOnline}</span>
              </div>
            </div>

            {/* User message in Darija */}
            <div
              dir="rtl"
              style={{
                alignSelf: isAr ? "flex-start" : "flex-end",
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: "16px 16px 4px 16px",
                background: "#0A7A53",
                fontFamily: cairo.style.fontFamily,
                fontSize: "15px",
              }}
            >
              {t.omarUserMsg}
            </div>

            {/* Bot response */}
            <div
              style={{
                alignSelf: isAr ? "flex-end" : "flex-start",
                maxWidth: "92%",
                padding: "12px 14px",
                borderRadius: "16px 16px 16px 4px",
                background: "rgba(255, 255, 255, 0.1)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "14px",
              }}
            >
              <span>{t.omarBotMsg}</span>
              <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255, 255, 255, 0.15)" }}>
                <div style={{ width: "68%", height: "6px", borderRadius: "3px", background: "#7FD3AE" }} />
              </div>
              <span style={{ fontSize: "12px", color: "#9FD8BE" }}>
                {t.omarBotSub}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* POURQUOI 7SABEK / 4 ETAPES */}
      <section className="lp-section-container" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "640px" }}>
          <span style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "1.5px", color: "#0A7A53" }}>
            {t.whyKicker}
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(26px, 5.5vw, 48px)",
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            {t.whyTitle}
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: "14px" }}>
          {t.steps.map((s) => (
            <div
              key={s.n}
              style={{
                background: "#FFFFFF",
                borderRadius: "20px",
                padding: "22px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 2px 8px rgba(15, 26, 22, 0.04)",
              }}
            >
              <span style={{ fontSize: "38px", fontWeight: 800, color: "#0A7A53", letterSpacing: "-1px" }}>
                {s.n}
              </span>
              <h3 style={{ margin: 0, fontSize: "19px", fontWeight: 800 }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.55, color: "#55645D" }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SIMULATEUR */}
      <section id="simulateur" className="lp-section-container">
        <div className="lp-sim-card">
          {/* Left Controls */}
          <div
            style={{
              flex: "1 1 360px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "1.5px", color: "#0A7A53" }}>
              {t.simKicker}
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(26px, 5vw, 42px)",
                lineHeight: 1.12,
                fontWeight: 800,
                letterSpacing: "-1px",
              }}
            >
              {t.simTitle}
            </h2>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "14px",
                fontWeight: 700,
                color: "#33423C",
              }}
            >
              {t.simSalaryLabel}
              <span
                style={{
                  fontSize: "clamp(34px, 8vw, 44px)",
                  fontWeight: 800,
                  color: "#0F1A16",
                  letterSpacing: "-1px",
                }}
              >
                {formatMad(salary)}{" "}
                <span style={{ fontSize: "16px", color: "#55645D" }}>MAD</span>
              </span>
              <input
                type="range"
                min="3000"
                max="40000"
                step="100"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                style={{ width: "100%", height: "32px", cursor: "pointer" }}
              />
              <span
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#55645D",
                }}
              >
                <span>3 000 MAD</span>
                <span>40 000 MAD</span>
              </span>
            </label>

            {/* Presets */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PRESET_SALARIES.map((p) => {
                const isSelected = salary === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSalary(p)}
                    style={{
                      height: "40px",
                      padding: "0 14px",
                      borderRadius: "10px",
                      border: isSelected ? "0" : "1.5px solid #DAD8CF",
                      background: isSelected ? "#0F1A16" : "#FFFFFF",
                      color: isSelected ? "#FFFFFF" : "#0F1A16",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {formatMad(p)}
                  </button>
                );
              })}
            </div>

            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: "#55645D" }}>
              {t.simDisclaimer}
            </p>
          </div>

          {/* Right Visual Breakdown */}
          <div
            style={{
              flex: "1 1 420px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* Visual stacked split bar */}
            <div
              style={{
                display: "flex",
                height: "16px",
                borderRadius: "8px",
                overflow: "hidden",
                gap: "2px",
              }}
            >
              {splitBars.map((b, i) => (
                <div key={i} style={{ width: b.pct, background: b.color }} />
              ))}
            </div>

            {/* Boxes: Fixed vs Variables */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "10px" }}>
              {/* Fixed */}
              <div
                style={{
                  borderRadius: "18px",
                  background: "#F6F5EF",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#55645D" }}>
                  {t.simFixedTitle}
                </span>
                {fixedConfig.map((r) => (
                  <div key={r.name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "3px", background: r.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{r.name}</span>
                    <b>{formatMad(salary * r.pct)}</b>
                  </div>
                ))}
              </div>

              {/* Variables */}
              <div
                style={{
                  borderRadius: "18px",
                  background: "#F6F5EF",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1px", color: "#55645D" }}>
                  {t.simVarTitle}
                </span>
                {varConfig.map((r) => (
                  <div key={r.name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "3px", background: r.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{r.name}</span>
                    <b>{formatMad(salary * r.pct)}</b>
                  </div>
                ))}
              </div>
            </div>

            {/* Projected Savings Banner */}
            <div
              style={{
                borderRadius: "18px",
                background: "#06402C",
                color: "#FFFFFF",
                padding: "20px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <span style={{ fontSize: "13px", color: "#9FD8BE", fontWeight: 700 }}>
                  {t.simSavingProjected}
                </span>
                <span style={{ fontSize: "clamp(26px, 6vw, 36px)", fontWeight: 800, letterSpacing: "-1px" }}>
                  {formatMad(savingAmount)}{" "}
                  <span style={{ fontSize: "14px", color: "#9FD8BE" }}>{t.simMonthUnit}</span>
                </span>
              </div>
              <span
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background: "rgba(242, 181, 68, 0.18)",
                  color: "#F2B544",
                  fontWeight: 800,
                  fontSize: "14px",
                }}
              >
                {formatMad(savingYear)} {t.simYearUnit}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TABLEAU COMPARATIF */}
      <section className="lp-section-container" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <h2
            style={{
              margin: 0,
              maxWidth: "680px",
              fontSize: "clamp(24px, 5vw, 44px)",
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            {t.cmpTitle}
          </h2>
          <span style={{ fontSize: "13px", color: "#55645D" }}>
            {t.cmpScrollHint}
          </span>
        </div>

        <div className="lp-table-scroll">
          <table style={{ width: "100%", minWidth: "560px", borderCollapse: "collapse", fontSize: "15px" }}>
            <thead>
              <tr>
                <th scope="col" style={{ padding: "16px 20px", textAlign: "start", fontSize: "12px", letterSpacing: "1px", color: "#55645D" }}>
                  {t.cmpColCrit}
                </th>
                <th scope="col" style={{ padding: "16px 20px", textAlign: "start", fontSize: "12px", letterSpacing: "1px", color: "#55645D" }}>
                  {t.cmpColOld}
                </th>
                <th
                  scope="col"
                  style={{
                    padding: "16px 20px",
                    textAlign: "start",
                    fontSize: "12px",
                    letterSpacing: "1px",
                    color: "#0A7A53",
                    background: "#E2F1E8",
                  }}
                >
                  {t.cmpColNew}
                </th>
              </tr>
            </thead>
            <tbody>
              {t.compare.map((c, i) => (
                <tr key={i} style={{ borderTop: "1px solid #ECEBE4" }}>
                  <th scope="row" style={{ padding: "16px 20px", textAlign: "start", fontWeight: 700 }}>
                    {c.k}
                  </th>
                  <td style={{ padding: "16px 20px", color: "#6B7872" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B4441C" strokeWidth="2.4" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                      {c.old}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", background: "#F2F9F5", fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A7A53" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                      {c.neu}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* POUR QUI */}
      <section id="pour-qui" className="lp-section-container" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "1.5px", color: "#0A7A53" }}>
            {t.whoKicker}
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(24px, 5vw, 44px)",
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            {t.whoTitle}
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: "14px" }}>
          {t.who.map((w, idx) => (
            <div
              key={idx}
              style={{
                background: "#FFFFFF",
                borderRadius: "20px",
                padding: "22px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: "0 2px 8px rgba(15, 26, 22, 0.04)",
              }}
            >
              <span
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "14px",
                  background: w.tint,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={w.color}
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={w.icon} />
                </svg>
              </span>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>{w.title}</h3>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.55, color: "#55645D" }}>
                {w.text}
              </p>
              <span
                style={{
                  marginTop: "auto",
                  alignSelf: "flex-start",
                  padding: "5px 10px",
                  borderRadius: "999px",
                  background: w.tint,
                  color: w.color,
                  fontSize: "12px",
                  fontWeight: 800,
                }}
              >
                {w.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION BANNER */}
      <section className="lp-section-container" style={{ paddingBottom: "72px" }}>
        <div className="lp-final-card">
          {/* Radial emerald glow */}
          <div
            style={{
              position: "absolute",
              width: "480px",
              height: "480px",
              left: "50%",
              top: "-260px",
              marginLeft: "-240px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(10, 122, 83, 0.55), rgba(10, 122, 83, 0) 70%)",
              pointerEvents: "none",
            }}
          />

          <h2
            style={{
              position: "relative",
              margin: 0,
              maxWidth: "720px",
              fontSize: "clamp(26px, 5.5vw, 52px)",
              lineHeight: 1.1,
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            {t.finTitle}
          </h2>
          <p
            style={{
              position: "relative",
              margin: 0,
              maxWidth: "560px",
              fontSize: "clamp(15px, 3.5vw, 18px)",
              lineHeight: 1.6,
              color: "#B9C6C0",
            }}
          >
            {t.finSub}
          </p>

          <div className="lp-final-buttons">
            <Link
              href="/register"
              style={{
                height: "54px",
                padding: "0 28px",
                borderRadius: "14px",
                background: "#F2B544",
                color: "#0F1A16",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(242, 181, 68, 0.3)",
              }}
            >
              {t.finCta1}
            </Link>

            <button
              type="button"
              onClick={handleGuestStart}
              disabled={guestLoading}
              style={{
                height: "54px",
                padding: "0 24px",
                borderRadius: "14px",
                border: "1.5px solid rgba(255, 255, 255, 0.35)",
                background: "transparent",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: 700,
                cursor: guestLoading ? "wait" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {guestLoading ? "..." : t.finCta2}
            </button>
          </div>

          <span style={{ position: "relative", fontSize: "13px", color: "#9FB0A8" }}>
            {t.finTrust}
          </span>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(15, 26, 22, 0.1)", background: "transparent", width: "100%" }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "24px 16px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: "#0A7A53",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="13" rx="2" />
                <path d="M3 8l9 6 9-6" />
              </svg>
            </span>
            <b style={{ fontSize: "17px" }}>{isAr ? "حسابك" : "7sabek"}</b>
          </div>

          {/* Legal Links */}
          <nav aria-label="Liens légaux" style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: "14px" }}>
            <Link href="/cgu" style={{ color: "#33423C", textDecoration: "none", padding: "6px 0" }}>
              {t.footCgu}
            </Link>
            <Link href="/privacy" style={{ color: "#33423C", textDecoration: "none", padding: "6px 0" }}>
              {t.footPrivacy}
            </Link>
            <Link href="/contact" style={{ color: "#33423C", textDecoration: "none", padding: "6px 0" }}>
              {t.footContact}
            </Link>
            <Link href="/releases" style={{ color: "#33423C", textDecoration: "none", padding: "6px 0" }}>
              {t.footReleases}
            </Link>
          </nav>

          <span style={{ fontSize: "13px", color: "#55645D", width: "100%", textAlign: "center", marginTop: "4px" }}>
            {t.footRights}
          </span>
        </div>
      </footer>

      {/* APK MODAL DIALOG */}
      {apkOpen && (
        <div
          role="presentation"
          onClick={() => setApkOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(15, 26, 22, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.apkTitle}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "460px",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: "24px",
              background: "#FFFFFF",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              boxShadow: "0 30px 80px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: "#0A7A53",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                    flexShrink: 0,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="6" width="18" height="13" rx="2" />
                    <path d="M3 8l9 6 9-6" />
                  </svg>
                </span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <b style={{ fontSize: "18px" }}>{t.apkTitle}</b>
                  <span style={{ fontSize: "13px", color: "#55645D" }}>{t.apkSub}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApkOpen(false)}
                aria-label="Fermer"
                style={{
                  width: "40px",
                  height: "40px",
                  border: 0,
                  borderRadius: "20px",
                  background: "#F6F5EF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1A16" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Features */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#E2F1E8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A7A53" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01M3 3l18 18" />
                  </svg>
                </span>
                <span style={{ fontSize: "14px" }}>
                  <b>{t.apkF1.split("—")[0]}</b> — {t.apkF1.split("—")[1]}
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#FFF4DC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A5300" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  </svg>
                </span>
                <span style={{ fontSize: "14px" }}>
                  <b>{t.apkF2.split("—")[0]}</b> — {t.apkF2.split("—")[1]}
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#E6EEFA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2457A6" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 11v3a8 8 0 0 1-1 4M8 11a4 4 0 0 1 8 0v2a12 12 0 0 1-.6 4M5 10a7 7 0 0 1 14 0v3" />
                  </svg>
                </span>
                <span style={{ fontSize: "14px" }}>
                  <b>{t.apkF3.split("—")[0]}</b> — {t.apkF3.split("—")[1]}
                </span>
              </div>
            </div>

            {/* Download CTA */}
            <a
              href="/7sabek_app.apk"
              download="7sabek_app.apk"
              style={{
                height: "52px",
                borderRadius: "14px",
                background: "#0A7A53",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                fontSize: "16px",
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(10, 122, 83, 0.25)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
              </svg>
              {t.apkDownload}
            </a>
            <span style={{ fontSize: "12px", color: "#55645D", textAlign: "center" }}>
              {t.apkHint}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
