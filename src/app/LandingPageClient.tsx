"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, EyeOff, Globe, ShieldCheck, Target } from "lucide-react";
import { Cairo, Manrope } from "next/font/google";

import { fetchMe, hasAuthSessionHint, logout, type AuthUser } from "@/lib/auth";
import BrandLogo from "@/components/BrandLogo";
import { getBrowserLocalePreference, getLocaleBadgeLabel, openLanguagePicker } from "@/components/i18n/LanguagePreferenceGate";
import { getLocaleDirection, isSupportedLocale, type FloussyLocale } from "@/lib/localePreference";

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const arabicFont = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"] });

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};

type Copy = {
  navFeatures: string;
  navMethod: string;
  navAudience: string;
  dashboard: string;
  logout: string;
  login: string;
  start: string;
  badge: string;
  heroTitle: string;
  heroText: string;
  ctaMain: string;
  ctaMethod: string;
  heroMicro: string;
  cockpit: string;
  problemTitle: string;
  problemText: string;
  methodTitle: string;
  methodText: string;
  stepsTitle: string;
  featuresTitle: string;
  benefitsTitle: string;
  compareTitle: string;
  compareA: string;
  compareB: string;
  audienceTitle: string;
  trustTitle: string;
  trustText: string;
  trustBadge: string;
  uiTitle: string;
  finalTitle: string;
  finalText: string;
  finalFeatures: string;
  finalMicro: string;
  footer: string;
  problems: Array<{ title: string; text: string }>;
  solutions: string[];
  steps: Array<{ title: string; text: string }>;
  features: string[];
  benefits: string[];
  audience: Array<{ title: string; text: string }>;
};

const COPY: Record<FloussyLocale, Copy> = {
  fr: {
    navFeatures: "Fonctionnalités",
    navMethod: "Méthode",
    navAudience: "Pour qui",
    dashboard: "Dashboard",
    logout: "Déconnexion",
    login: "Connexion",
    start: "Commencer",
    badge: "Budget par enveloppes intelligent",
    heroTitle: "Donne une mission claire à chaque dollar.",
    heroText: "Organise tes revenus, suis tes dépenses, finance tes objectifs et garde le contrôle de ton argent grâce à un système intelligent d’enveloppes, de règles et d’automatisations.",
    ctaMain: "Commencer gratuitement",
    ctaMethod: "Voir comment ça fonctionne",
    heroMicro: "Aucun tableur. Moins de stress. Plus de clarté sur chaque dollar.",
    cockpit: "Cockpit budget en direct",
    problemTitle: "Ton argent entre… mais tu ne sais pas toujours où il part.",
    problemText: "Les apps classiques montrent le passé. Ici tu décides quoi faire maintenant.",
    methodTitle: "Une méthode claire: chaque dollar a une mission.",
    methodText: "Chaque revenu est distribué, chaque dépense est liée à une enveloppe, chaque objectif est séparé et les excédents peuvent être dirigés vers l’épargne.",
    stepsTitle: "Ton budget fonctionne en 4 étapes simples.",
    featuresTitle: "Tout ce qu’il faut pour piloter ton budget au quotidien.",
    benefitsTitle: "Moins d’incertitude. Plus de contrôle.",
    compareTitle: "Plus qu’un tracker. Un vrai système budgétaire.",
    compareA: "Tracker classique",
    compareB: "7sabek",
    audienceTitle: "Conçu pour ceux qui veulent gérer leur argent avec méthode.",
    trustTitle: "Une logique pensée pour éviter les erreurs.",
    trustText: "Simulation avant application, alertes sur les configs incomplètes, contraintes métier et séparation claire entre cash, dépenses, dettes, objectifs et épargne.",
    trustBadge: "Validations métier actives",
    uiTitle: "Un cockpit lisible, pas une usine à gaz.",
    finalTitle: "Prêt à donner une mission claire à ton argent?",
    finalText: "Crée tes enveloppes, distribue tes revenus, suis tes objectifs et prends des décisions plus simples avec un budget vivant.",
    finalFeatures: "Découvrir les fonctionnalités",
    finalMicro: "Ton budget devient plus clair dès la première configuration.",
    footer: "© 2026 7sabek. Tous droits réservés.",
    problems: [
      { title: "Trop peu de visibilité", text: "Tu vois un solde global, mais pas ce qu'il reste vraiment par poste." },
      { title: "Dépassements tardifs", text: "Les tensions apparaissent souvent trop tard, quand le budget est déjà touché." },
      { title: "Tâches répétitives", text: "Répartir et ajuster manuellement prend du temps chaque période." },
      { title: "Objectifs oubliés", text: "Les projets importants passent après les urgences du quotidien." },
    ],
    solutions: ["Enveloppes de dépenses claires par besoin.", "Cash séparé avant distribution.", "Objectifs dédiés et suivis à part.", "Dettes isolées avec priorisation.", "Automatisations et sweeps vers l'épargne."],
    steps: [
      { title: "Ajoute ton revenu", text: "Le revenu entre dans Cash, point de départ de ton budget." },
      { title: "Distribue automatiquement", text: "Répartis vers dépenses, dettes, objectifs et épargne." },
      { title: "Suis tes dépenses", text: "Chaque transaction impacte l'enveloppe liée en temps réel." },
      { title: "Optimise en fin de période", text: "Les excédents admissibles peuvent partir vers l'épargne." },
    ],
    features: ["Transactions intelligentes", "Mapping catégories → enveloppes", "Distribution de revenus", "Simulation avant application", "Sweeps automatiques", "Rollover contrôlé", "Objectifs séparés", "Dettes priorisées"],
    benefits: ["Clarté immédiate sur chaque enveloppe", "Moins de stress budgétaire", "Gain de temps au quotidien", "Décisions plus simples et plus sûres", "Discipline sans rigidité", "Objectifs mieux financés"],
    audience: [
      { title: "Reprendre le contrôle", text: "Arrêter de te demander où est parti ton argent à la fin du mois." },
      { title: "Financer des objectifs", text: "Voyage, fonds d’urgence, projet personnel ou achat important." },
      { title: "Rembourser des dettes", text: "Garder une vision claire des remboursements sans casser le budget courant." },
      { title: "Système simple", text: "Une méthode structurée sans vivre dans un tableur." },
    ],
  },
  en: {
    navFeatures: "Features",
    navMethod: "Method",
    navAudience: "Who it's for",
    dashboard: "Dashboard",
    logout: "Log out",
    login: "Log in",
    start: "Start",
    badge: "Smart envelope budgeting",
    heroTitle: "Give every dollar a clear mission.",
    heroText: "Organize your income, track your spending, fund your goals, and stay in control with envelopes, rules, and automations.",
    ctaMain: "Start for free",
    ctaMethod: "See how it works",
    heroMicro: "No spreadsheets. Less stress. More clarity on every dollar.",
    cockpit: "Live budget cockpit",
    problemTitle: "Money comes in… but you don't always know where it goes.",
    problemText: "Classic apps show the past. Here you decide what to do now.",
    methodTitle: "A clear method: every dollar has a job.",
    methodText: "Each income is distributed, each expense is tied to an envelope, each goal is tracked separately, and eligible surplus can move to savings.",
    stepsTitle: "Your budget works in 4 simple steps.",
    featuresTitle: "Everything you need to run your budget daily.",
    benefitsTitle: "Less uncertainty. More control.",
    compareTitle: "More than a tracker. A real budgeting system.",
    compareA: "Classic tracker",
    compareB: "7sabek",
    audienceTitle: "Built for people who want to manage money with structure.",
    trustTitle: "Logic designed to prevent errors.",
    trustText: "Simulation before apply, incomplete setup alerts, business constraints, and clear separation between cash, spending, debt, goals, and savings.",
    trustBadge: "Business validations active",
    uiTitle: "A readable cockpit, not a complicated machine.",
    finalTitle: "Ready to give your money a clear mission?",
    finalText: "Create envelopes, distribute income, track goals, and make better decisions with a living budget.",
    finalFeatures: "Discover features",
    finalMicro: "Your budget becomes clearer from the first setup.",
    footer: "© 2026 7sabek. All rights reserved.",
    problems: [
      { title: "Low visibility", text: "You see one total balance, not what is truly left per area." },
      { title: "Late overruns", text: "Budget stress appears too late, when damage is already done." },
      { title: "Repetitive tasks", text: "Manual distribution and adjustments waste time every cycle." },
      { title: "Forgotten goals", text: "Important projects get pushed behind daily expenses." },
    ],
    solutions: ["Clear spending envelopes by need.", "Cash separated before allocation.", "Dedicated goals with separate tracking.", "Debts isolated with priority logic.", "Automations and savings sweeps."],
    steps: [
      { title: "Add your income", text: "Income goes to Cash first, your budget starting point." },
      { title: "Distribute automatically", text: "Allocate across spending, debt, goals, and savings." },
      { title: "Track expenses", text: "Each transaction updates the linked envelope in real time." },
      { title: "Optimize period end", text: "Eligible surplus can be swept to savings." },
    ],
    features: ["Smart transactions", "Category → envelope mapping", "Income allocation", "Simulation before apply", "Automatic sweeps", "Controlled rollover", "Separated goals", "Prioritized debt"],
    benefits: ["Immediate clarity per envelope", "Less budget stress", "Time saved daily", "Safer decisions", "Discipline without rigidity", "Goals funded better"],
    audience: [
      { title: "Regain control", text: "Stop wondering where your money went at month end." },
      { title: "Fund your goals", text: "Travel, emergency fund, big purchase, or personal project." },
      { title: "Repay debt", text: "Keep repayments clear without breaking your day-to-day budget." },
      { title: "Keep it simple", text: "A structured method without living in spreadsheets." },
    ],
  },
  ar: {
    navFeatures: "الخصائص",
    navMethod: "الطريقة",
    navAudience: "علاش تصلح",
    dashboard: "لوحة التحكم",
    logout: "تسجيل الخروج",
    login: "دخول",
    start: "بدا",
    badge: "ميزانية بالأظرفة الذكية",
    heroTitle: "عطي لكل درهم مهمة واضحة.",
    heroText: "نظّم الدخل ديالك، تتبّع المصاريف، موّل الأهداف ديالك، وبقا متحكم ففلوسك عبر نظام الأظرفة والقواعد والأوتوماتيك.",
    ctaMain: "بدا مجاناً",
    ctaMethod: "شوف كيفاش خدام",
    heroMicro: "بلا جداول. سترس أقل. وضوح كثر فكل درهم.",
    cockpit: "كوكبيت الميزانية مباشر",
    problemTitle: "الفلوس كاتدخل… ولكن ماشي ديما باين فين كاتمشي.",
    problemText: "التطبيقات العادية كتشوف غير الماضي. هنا كتقرر شنو تدير دابا.",
    methodTitle: "طريقة واضحة: كل درهم عندو خدمة.",
    methodText: "كل دخل كيتوزع، كل مصروف مربوط بظرف، كل هدف متتبع بوحدو، والفائض المؤهل يقدر يمشي للادخار.",
    stepsTitle: "الميزانية ديالك خدامة فـ4 خطوات بسيطة.",
    featuresTitle: "كل ما تحتاجو باش تسير الميزانية يومياً.",
    benefitsTitle: "غموض أقل. تحكم أكثر.",
    compareTitle: "ماشي غير tracker. نظام ميزانية كامل.",
    compareA: "Tracker عادي",
    compareB: "7sabek",
    audienceTitle: "مناسب للي باغي يسير فلوسو بمنهج واضح.",
    trustTitle: "منطق مصمم باش يمنع الأخطاء.",
    trustText: "محاكاة قبل التطبيق، تنبيهات الإعداد الناقص، قواعد حماية، وفصل واضح بين الكاش، المصاريف، الديون، الأهداف والادخار.",
    trustBadge: "قواعد التحقق خدامة",
    uiTitle: "واجهة واضحة، ماشي تعقيد زايد.",
    finalTitle: "واجد تعطي لفلوسك مهمة واضحة؟",
    finalText: "صاوب الأظرفة، وزع الدخل، تتبع الأهداف، وخذ قرارات أفضل مع ميزانية حية.",
    finalFeatures: "اكتشف الخصائص",
    finalMicro: "الميزانية ديالك كتولي أوضح من أول إعداد.",
    footer: "© 2026 7sabek. جميع الحقوق محفوظة.",
    problems: [
      { title: "وضوح ناقص", text: "كتشوف غير المجموع، ماشي شحال بقى فعلاً فكل جزء." },
      { title: "التجاوز كيبان متأخر", text: "المشكل كيبان من بعد ما الميزانية تكون تضررات." },
      { title: "خدمة مكررة", text: "التوزيع والتعديل يدويًا كياكل الوقت كل دورة." },
      { title: "الأهداف كتتنسى", text: "المشاريع المهمة كتتأخر قدام مصاريف اليومي." },
    ],
    solutions: ["أظرفة مصاريف واضحة حسب الحاجة.", "الكاش مفصول قبل التوزيع.", "أهداف مخصصة بتتبع مستقل.", "الديون مفصولة بأولوية.", "أوتوماتيك + sweep نحو الادخار."],
    steps: [
      { title: "دخل الدخل ديالك", text: "الدخل كيدخل للكاش أولاً، ومنه كاتبدا الميزانية." },
      { title: "وزع أوتوماتيكياً", text: "وزع على المصاريف، الديون، الأهداف والادخار." },
      { title: "تتبع المصاريف", text: "كل عملية كتأثر مباشرة على الظرف المرتبط." },
      { title: "حسن نهاية الدورة", text: "الفائض المؤهل يقدر يتحول تلقائياً للادخار." },
    ],
    features: ["عمليات ذكية", "ربط التصنيفات بالأظرفة", "توزيع الدخل", "محاكاة قبل التطبيق", "sweeps أوتوماتيكية", "rollover متحكم فيه", "أهداف منفصلة", "ديون بأولوية"],
    benefits: ["وضوح مباشر لكل ظرف", "توتر أقل", "ربح الوقت", "قرارات أسهل", "انضباط بلا تعقيد", "تمويل أفضل للأهداف"],
    audience: [
      { title: "ترجع التحكم", text: "تحبس سؤال فين مشاو الفلوس فآخر الشهر." },
      { title: "تموّل أهدافك", text: "سفر، صندوق طوارئ، شراء مهم أو مشروع شخصي." },
      { title: "تسدد الديون", text: "تبقى شايف السداد بوضوح بلا ما تخلط الميزانية اليومية." },
      { title: "تبغي نظام بسيط", text: "طريقة منظمة بلا ما تعيش فالجداول." },
    ],
  },
};

type LandingPageClientProps = {
  initialLocale: FloussyLocale;
};

export default function LandingPageClient({ initialLocale }: LandingPageClientProps) {
  const reduceMotion = useReducedMotion();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [locale, setLocale] = useState<FloussyLocale>(initialLocale);

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
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["lang"],
      });
    }

    window.addEventListener(LANGUAGE_CHANGED_EVENT, handleLocaleChanged as EventListener);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, handleLocaleChanged as EventListener);
      observer?.disconnect();
    };
  }, [initialLocale]);

  const handleLogout = () => {
    void logout().finally(() => setUser(null));
  };

  const effectiveLocale: FloussyLocale = locale;
  const copy = COPY[effectiveLocale];
  const direction = getLocaleDirection(effectiveLocale);
  const isArabic = effectiveLocale === "ar";
  const pageFontClass = isArabic ? `${arabicFont.className} landing-arabic-font` : bodyFont.className;
  const headingClass = isArabic ? "landing-title" : "";
  const copyClass = isArabic ? "landing-copy" : "";
  const sectionSoftClass = isArabic ? "bg-transparent" : "bg-[#f9fafb]";
  const sectionSolidClass = isArabic ? "bg-transparent" : "bg-white";
  const heroOverlayClass = isArabic
    ? "bg-[radial-gradient(circle_at_90%_8%,rgba(45,212,191,0.24),transparent_46%),radial-gradient(circle_at_8%_92%,rgba(14,165,233,0.12),transparent_42%),linear-gradient(125deg,#edfff8_0%,#ffffff_48%,#f2f9ff_100%)]"
    : "bg-[radial-gradient(circle_at_20%_0%,#d1fae5_0%,transparent_42%),linear-gradient(180deg,#ffffff_0%,#ecfdf5_100%)]";

  return (
    <div
      className={`landing-root min-h-screen text-[#111827] ${pageFontClass} ${
        isArabic ? "dashboard-v2 landing-arabic-font" : "bg-white"
      }`}
      dir={direction}
      lang={effectiveLocale}
      data-landing-locale={effectiveLocale}
      style={
        isArabic
          ? {
              background:
                "radial-gradient(1100px 500px at -5% -10%, rgba(20, 184, 166, 0.12), transparent 65%), radial-gradient(900px 480px at 105% 8%, rgba(59, 130, 246, 0.1), transparent 62%), linear-gradient(180deg, #f6fbf7 0%, #eef7ff 100%)",
            }
          : undefined
      }
    >
      <header className={`sticky top-0 z-40 border-b border-[#e5e7eb] backdrop-blur ${isArabic ? "bg-white/75" : "bg-white/90"}`}>
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-4 sm:px-8">
          <BrandLogo locale={effectiveLocale} className="h-20 w-auto" priority />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#374151] lg:flex">
            <a href="#features" className="hover:text-[#059669]">{copy.navFeatures}</a>
            <a href="#method" className="hover:text-[#059669]">{copy.navMethod}</a>
            <a href="#audience" className="hover:text-[#059669]">{copy.navAudience}</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" onClick={openLanguagePicker} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e5e7eb] px-3 text-sm font-semibold text-[#374151] hover:border-[#10b981] hover:text-[#059669]">
              <Globe size={15} /> {getLocaleBadgeLabel(locale)}
            </button>
            {checkingAuth ? null : user ? (
              <>
                <Link href={user.role === "superadmin" ? "/superadmin" : "/dashboard"} className="rounded-xl bg-[#10b981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669]">{copy.dashboard}</Link>
                <button type="button" onClick={handleLogout} className="rounded-xl border border-[#e5e7eb] px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb]">{copy.logout}</button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb]">{copy.login}</Link>
                <Link href="/register" className="rounded-xl bg-[#10b981] px-4 py-2 text-sm font-semibold text-white hover:bg-[#059669]">{copy.start}</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={copyClass}>
        <section className="relative overflow-hidden border-b border-[#e5e7eb]">
          <div className={`pointer-events-none absolute inset-0 ${heroOverlayClass}`} />
          <div className="relative mx-auto grid w-full max-w-[1200px] gap-10 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:pb-24 lg:pt-20">
            <motion.div initial={reduceMotion ? undefined : "hidden"} animate={reduceMotion ? undefined : "show"} variants={stagger} className="space-y-6">
              <motion.span variants={fadeUp} className="inline-flex rounded-full bg-[#d1fae5] px-4 py-2 text-sm font-semibold text-[#059669]">{copy.badge}</motion.span>
              <motion.h1 variants={fadeUp} className={`${headingClass} text-4xl font-extrabold leading-tight text-[#111827] sm:text-6xl`}>{copy.heroTitle}</motion.h1>
              <motion.p variants={fadeUp} className="text-lg leading-8 text-[#4b5563]">{copy.heroText}</motion.p>
              <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#10b981] px-6 py-3.5 text-base font-semibold text-white hover:bg-[#059669]">{copy.ctaMain} <ArrowRight size={16} /></Link>
                <a href="#method" className="inline-flex items-center justify-center rounded-2xl border border-[#e5e7eb] bg-white px-6 py-3.5 text-base font-semibold text-[#111827] hover:bg-[#f9fafb]">{copy.ctaMethod}</a>
              </motion.div>
              <motion.p variants={fadeUp} className="text-sm text-[#6b7280]">{copy.heroMicro}</motion.p>
            </motion.div>

            <motion.div initial={reduceMotion ? undefined : "hidden"} animate={reduceMotion ? undefined : "show"} variants={fadeUp} className="rounded-3xl border border-[#e5e7eb] bg-white p-6 shadow-xl shadow-[#073a34]/10">
              <h3 className="text-lg font-bold">{copy.cockpit}</h3>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[#ecfdf5] p-3"><p className="text-xs text-[#6b7280]">Cash</p><p className="text-lg font-bold text-[#059669]">8 750</p></div>
                <div className="rounded-2xl bg-[#eff6ff] p-3"><p className="text-xs text-[#6b7280]">Goals</p><p className="text-lg font-bold">3</p></div>
                <div className="rounded-2xl bg-[#fff7ed] p-3"><p className="text-xs text-[#6b7280]">Debt</p><p className="text-lg font-bold">2</p></div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className={`mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 ${sectionSolidClass}`}>
          <h2 className="text-3xl font-bold sm:text-4xl">{copy.problemTitle}</h2>
          <p className="mt-4 max-w-4xl text-[#6b7280]">{copy.problemText}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[EyeOff, AlertTriangle, Clock3, Target].map((Icon, i) => (
              <article key={copy.problems[i].title} className="rounded-3xl border border-[#e5e7eb] bg-white p-6">
                <Icon className="text-[#f59e0b]" size={20} />
                <h3 className="mt-3 text-lg font-bold">{copy.problems[i].title}</h3>
                <p className="mt-2 text-sm text-[#6b7280]">{copy.problems[i].text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${sectionSoftClass} py-16`} id="method">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl">{copy.methodTitle}</h2>
            <p className="mt-4 max-w-4xl text-[#6b7280]">{copy.methodText}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {copy.solutions.map((text) => (
                <div key={text} className="flex items-start gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-4">
                  <CheckCircle2 className="mt-0.5 text-[#10b981]" size={18} />
                  <p className="text-sm text-[#374151]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">{copy.stepsTitle}</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {copy.steps.map((step, idx) => (
              <div key={step.title} className="rounded-3xl border border-[#e5e7eb] bg-white p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#d1fae5] text-sm font-bold text-[#059669]">{idx + 1}</span>
                <h3 className="mt-3 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-[#6b7280]">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${sectionSoftClass} py-16`} id="features">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl">{copy.featuresTitle}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {copy.features.map((item) => (
                <div key={item} className="rounded-2xl border border-[#e5e7eb] bg-white p-4 text-sm font-semibold text-[#1f2937]">{item}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">{copy.benefitsTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {copy.benefits.map((item) => (
              <div key={item} className="rounded-2xl border border-[#e5e7eb] bg-white p-5">
                <p className="font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${sectionSoftClass} py-16`}>
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl">{copy.compareTitle}</h2>
            <div className="mt-8 overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f3f4f6]">
                  <tr><th className="px-4 py-3 font-bold">{copy.compareA}</th><th className="px-4 py-3 font-bold">{copy.compareB}</th></tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#e5e7eb]"><td className="px-4 py-3">Historical visibility</td><td className="px-4 py-3">Decision cockpit</td></tr>
                  <tr className="border-t border-[#e5e7eb]"><td className="px-4 py-3">Low automation</td><td className="px-4 py-3">Distribution, sweeps, rules</td></tr>
                  <tr className="border-t border-[#e5e7eb]"><td className="px-4 py-3">Single balance view</td><td className="px-4 py-3">Cash + envelopes + goals + debt</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8" id="audience">
          <h2 className="text-3xl font-bold sm:text-4xl">{copy.audienceTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {copy.audience.map((item) => (
              <div key={item.title} className="rounded-2xl border border-[#e5e7eb] bg-white p-5"><h3 className="font-bold">{item.title}</h3><p className="mt-2 text-sm text-[#6b7280]">{item.text}</p></div>
            ))}
          </div>
        </section>

        <section className={`${sectionSoftClass} py-16`}>
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl">{copy.trustTitle}</h2>
            <p className="mt-4 max-w-3xl text-[#6b7280]">{copy.trustText}</p>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#059669]"><ShieldCheck size={18} /> {copy.trustBadge}</div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">{copy.uiTitle}</h2>
        </section>

        <section className="bg-[#073a34] py-16 text-white">
          <div className="mx-auto w-full max-w-[1200px] px-5 text-center sm:px-8">
            <h2 className="text-3xl font-extrabold sm:text-5xl">{copy.finalTitle}</h2>
            <p className="mx-auto mt-4 max-w-3xl text-[#d1d5db]">{copy.finalText}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-2xl bg-[#10b981] px-6 py-3.5 font-semibold text-white hover:bg-[#059669]">{copy.ctaMain} <ArrowRight size={16} /></Link>
              <a href="#features" className="rounded-2xl border border-white/25 px-6 py-3.5 font-semibold text-white hover:bg-white/10">{copy.finalFeatures}</a>
            </div>
            <p className="mt-4 text-sm text-[#d1d5db]">{copy.finalMicro}</p>
          </div>
        </section>
      </main>

      <footer className={`border-t border-[#e5e7eb] px-5 py-8 text-center text-sm text-[#6b7280] ${isArabic ? "bg-white/70" : "bg-white"}`}>
        <div className="mb-3 flex justify-center">
          <BrandLogo locale={effectiveLocale} className="h-16 w-auto" />
        </div>
        {copy.footer}
      </footer>
      {isArabic ? (
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap');

          [data-landing-locale="ar"],
          [data-landing-locale="ar"] *,
          .landing-arabic-font,
          .landing-arabic-font * {
            font-family: "Cairo", sans-serif !important;
            font-optical-sizing: auto;
            font-variation-settings: "slnt" 0;
            letter-spacing: 0 !important;
          }

          [data-landing-locale="ar"] svg,
          [data-landing-locale="ar"] button svg,
          [data-landing-locale="ar"] a svg,
          .landing-arabic-font svg,
          .landing-arabic-font button svg,
          .landing-arabic-font a svg {
            font-family: initial !important;
          }

          [data-landing-locale="ar"] .landing-title,
          .landing-arabic-font .landing-title {
            font-family: "Cairo", sans-serif !important;
            font-weight: 800 !important;
            letter-spacing: 0 !important;
          }

          [data-landing-locale="ar"] .landing-copy,
          [data-landing-locale="ar"] .landing-copy p,
          [data-landing-locale="ar"] .landing-copy span,
          [data-landing-locale="ar"] .landing-copy a,
          [data-landing-locale="ar"] .landing-copy button,
          [data-landing-locale="ar"] .landing-copy label,
          [data-landing-locale="ar"] .landing-copy input,
          [data-landing-locale="ar"] .landing-copy div,
          .landing-arabic-font .landing-copy,
          .landing-arabic-font .landing-copy p,
          .landing-arabic-font .landing-copy span,
          .landing-arabic-font .landing-copy a,
          .landing-arabic-font .landing-copy button,
          .landing-arabic-font .landing-copy label,
          .landing-arabic-font .landing-copy input,
          .landing-arabic-font .landing-copy div {
            font-family: "Cairo", sans-serif !important;
            letter-spacing: 0 !important;
          }
        `}</style>
      ) : null}
    </div>
  );
}
