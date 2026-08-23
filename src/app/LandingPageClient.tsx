"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { Globe } from "lucide-react";
import { Bricolage_Grotesque, Cairo, Manrope } from "next/font/google";

import { fetchMe, hasAuthSessionHint, logout, type AuthUser } from "@/lib/auth";
import BrandLogo from "@/components/BrandLogo";
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
const displayFont = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const arabicFont = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "900"] });

type Duo = { t: string; d: string };
type Feat = { k: string; t: string; d: string };

type Copy = {
  nav: { sim: string; plan: string; tour: string; feat: string; who: string; cgu: string; priv: string; contact: string };
  cta: { start: string; login: string; logout: string; dashboard: string; free: string; try: string };
  hero: { badge: string; t1: string; t2: string; sub: string; micro: string };
  trust: string[];
  chips: { rent: string; rentM: string; sal: string; salM: string; net: string; netM: string; debt: string; debtM: string; sav: string; savM: string };
  sc: { cycle: string; cash: string };
  env: { food: string; transport: string; fun: string; save: string; rent: string; net: string; debt: string; sal: string };
  sim: { kicker: string; title: string; text: string; income: string; left: string; note: string; fixed: string };
  ck: { kicker: string; title: string; text: string; items: string[]; verdicts: Duo[]; solutions: string[]; cta: string };
  plan: { kicker: string; title: string; text: string; cta: string; steps: Duo[] };
  tour: { kicker: string; title: string; text: string; tabs: string[]; caps: string[] };
  how: { kicker: string; title: string; steps: Duo[] };
  ft: { kicker: string; title: string; items: Feat[] };
  cmp: { kicker: string; title: string; a: string; b: string; rows: Array<[string, string]> };
  who: { kicker: string; title: string; items: Duo[] };
  fin: { title: string; text: string; alt: string; micro: string };
  sv: {
    cash: string; income: string; addEnv: string; rollOn: string; rollOff: string; almost: string;
    debtP1: string; of1100: string; of400: string; of350: string; of2100: string;
    savDefault: string; savDesc: string; rules: string; fixed: string; leftover: string;
    toSavings: string; auto: string; simulate: string; save: string; simulation: string;
    distributed: string; fixedCosts: string; debts: string; expenses: string;
    exportCsv: string; incVsExp: string; byCat: string; savRegularity: string; vsPrev: string;
  };
  fabor: string;
  foot: string;
};

const COPY: Record<FloussyLocale, Copy> = {
  fr: {
    nav: { sim: "Simulateur", plan: "Money Plan", tour: "L’app", feat: "Fonctionnalités", who: "Pour qui", cgu: "CGU", priv: "Confidentialité", contact: "Contact" },
    cta: { start: "Commencer", login: "Connexion", logout: "Déconnexion", dashboard: "Dashboard", free: "Commencer gratuitement", try: "Essayer le simulateur" },
    hero: {
      badge: "Budget par enveloppes, pensé pour le Maroc",
      t1: "Chaque dirham,",
      t2: "une mission claire.",
      sub: "7sabek construit ton plan financier dès l’inscription, répartit ton salaire dans des enveloppes, et te dit ce qu’il te reste vraiment — pas juste un solde global.",
      micro: "Aucune carte bancaire requise · Aucun tableur · FR · EN · الدارجة",
    },
    trust: ["Connexion par clé d’accès", "Simulation avant application", "Export de tes données", "Multilingue FR / EN / AR"],
    chips: { rent: "Loyer", rentM: "Échéance 3j", sal: "Salaire", salM: "Mensuel", net: "Internet", netM: "Renouvellement", debt: "Crédit voiture", debtM: "Priorité 1", sav: "Épargne", savM: "Auto · reliquat" },
    sc: { cycle: "Cycle 01 → 30", cash: "Cash disponible" },
    env: { food: "Courses", transport: "Transport", fun: "Sorties", save: "Épargne", rent: "Loyer", net: "Internet", debt: "Crédit voiture", sal: "Salaire" },
    sim: {
      kicker: "Essaie maintenant",
      title: "Bouge le curseur. Vois ton salaire se répartir.",
      text: "C’est exactement la logique de 7sabek : les montants fixes d’abord, les pourcentages ensuite, et le reste part automatiquement vers l’épargne.",
      income: "Ton salaire mensuel",
      left: "Ce qui part à l’épargne",
      note: "Exemple illustratif. Dans l’app, tes enveloppes, tes montants et tes règles sont les tiens — et rien n’est appliqué avant que tu valides.",
      fixed: "Fixe",
    },
    ck: {
      kicker: "Diagnostic express",
      title: "Coche ce qui te parle.",
      text: "Six situations, aucune donnée demandée. À la fin, tu sauras si 7sabek te sert vraiment — ou pas.",
      items: [
        "À la fin du mois, je ne sais pas vraiment où est parti mon argent.",
        "Je découvre que j’ai trop dépensé une fois que c’est déjà fait.",
        "Je répartis mon salaire de tête, ou pas du tout.",
        "J’ai une dette que je repousse de mois en mois.",
        "J’ai un projet que je n’arrive jamais à financer.",
        "J’ai déjà abandonné un tableur ou une app de budget.",
      ],
      verdicts: [
        { t: "Coche au moins une case.", d: "Le diagnostic s’affiche ici, avec ce que 7sabek change concrètement pour toi." },
        { t: "Tu es plutôt bien organisé.", d: "Franchement, tu gères déjà. 7sabek te ferait surtout gagner du temps : la répartition et le suivi deviennent automatiques, c’est tout." },
        { t: "Tu es dans la zone fragile.", d: "Ton budget tient debout, mais rien ne t’alerte avant qu’il ne casse. C’est exactement le moment où une méthode d’enveloppes change la donne." },
        { t: "C’est ton argent qui décide à ta place.", d: "Chaque dirham part sans mission précise. C’est le cas type où passer aux enveloppes change tout, dès le premier salaire." },
      ],
      solutions: [
        "Enveloppes : un montant clair par poste",
        "Alerte avant le dépassement, pas après",
        "Distribution automatique de ton salaire",
        "Dettes isolées et priorisées",
        "Objectifs séparés, jamais entamés",
        "Money Plan : le budget est construit avec toi",
      ],
      cta: "Créer mon plan",
    },
    plan: {
      kicker: "Le point de départ",
      title: "Un plan financier construit avec toi, pas à ta place.",
      text: "Dès l’inscription, 7sabek pose les bonnes questions sur ton revenu, tes charges fixes, tes dettes et tes objectifs — puis calcule ta capacité réelle de remboursement et ta réserve de sécurité. Tu ajustes la répartition proposée, tu valides, et tu démarres avec un budget qui te ressemble.",
      cta: "Construire mon plan",
      steps: [
        { t: "Profil de revenu", d: "Salarié, freelance, artisan ou revenus mixtes — le calcul s’adapte à ta réalité." },
        { t: "Charges & dettes", d: "Loyer, abonnements, remboursements en cours : tout est déclaré une seule fois." },
        { t: "Capacité & réserve", d: "7sabek calcule combien tu peux vraiment rembourser sans casser ton mois." },
        { t: "Enveloppes proposées", d: "Une première répartition prête à l’emploi — que tu peux ajuster à tout moment." },
      ],
    },
    tour: {
      kicker: "Aperçu",
      title: "Regarde l’app de l’intérieur.",
      text: "Quatre écrans, une seule logique : tu vois toujours ce qu’il te reste, et pourquoi.",
      tabs: ["Tableau de bord", "Enveloppes", "Répartition", "Rapports"],
      caps: [
        "Le tableau de bord : cash disponible, dépenses du cycle, et l’état réel de chaque enveloppe d’un seul coup d’œil.",
        "Chaque enveloppe montre ce qui reste, si le report est actif, et t’alerte avant que tu dépasses.",
        "Tes règles de répartition : montants fixes, pourcentages, et le reliquat qui part vers l’épargne — simulé avant d’être appliqué.",
        "Tendances, répartition par catégorie et régularité d’épargne — exportables quand tu veux.",
      ],
    },
    how: {
      kicker: "Au quotidien",
      title: "Ton budget fonctionne en 4 étapes simples.",
      steps: [
        { t: "Ton salaire arrive dans Cash", d: "Point de départ neutre, avant toute répartition automatique." },
        { t: "Distribution automatique", d: "Réparti vers dépenses, dettes, objectifs et épargne selon tes règles." },
        { t: "Suivi en temps réel", d: "Chaque dépense impacte l’enveloppe liée, immédiatement." },
        { t: "Fin de cycle optimisée", d: "Le reliquat éligible part automatiquement vers l’épargne." },
      ],
    },
    ft: {
      kicker: "Fonctionnalités",
      title: "Tout ce qu’il faut pour piloter ton budget au quotidien.",
      items: [
        { k: "Zéro-based", t: "Enveloppes budgétaires", d: "Donne une mission à chaque dirham : loyer, courses, sorties, épargne — chacun dans sa propre enveloppe." },
        { k: "Saisie rapide", t: "Ajoute une dépense en une phrase", d: "Décris ta dépense en langage naturel, 7sabek propose le montant et la catégorie." },
        { k: "Répartition", t: "Règles fixes ou en pourcentage", d: "Fixe un montant ou un pourcentage par enveloppe. Le reliquat part automatiquement vers l’épargne." },
        { k: "Sans surprise", t: "Simulation avant application", d: "Visualise l’effet d’une règle avant qu’elle ne touche réellement ton argent." },
        { k: "Cycle réel", t: "Ta date de paie, pas un calendrier générique", d: "Paie hebdomadaire, mensuelle ou irrégulière : le cycle suit ta réalité, pas l’inverse." },
        { k: "Sécurité", t: "Connexion par clé d’accès", d: "Fini les mots de passe oubliés : connecte-toi avec une clé de sécurité moderne (passkey)." },
        { k: "Rapports", t: "Comprends où part ton argent", d: "Tendances, répartition par catégorie, et export de tes données à tout moment." },
        { k: "Objectifs", t: "Séparés de tes dépenses", d: "Voyage, urgence, achat important : chaque objectif a sa propre enveloppe, jamais touchée par erreur." },
        { k: "Dettes", t: "Priorisées, pas oubliées", d: "Isole tes remboursements avec une priorité claire, sans casser ton budget courant." },
      ],
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
      text: "Construis ton plan, répartis ton salaire, suis tes objectifs — et prends des décisions plus simples avec un budget vivant.",
      alt: "Découvrir les fonctionnalités",
      micro: "Zéro dirham à sortir. Faboooor, vraiment.",
    },
    sv: {
      cash: "CASH", income: "REVENU", addEnv: "+ Enveloppe",
      rollOn: "Report activé · 12 opérations", rollOff: "Report désactivé · 6 opérations",
      almost: "Presque épuisée · 10 MAD restants", debtP1: "Dette · priorité 1",
      of1100: "sur 1 100", of400: "sur 400", of350: "sur 350", of2100: "sur 2 100",
      savDefault: "Épargne (par défaut)", savDesc: "Reçoit le reliquat de fin de cycle",
      rules: "Règles actives", fixed: "FIXE", leftover: "Reliquat", toSavings: "Envoyé vers Épargne", auto: "auto",
      simulate: "Simuler la répartition", save: "Enregistrer", simulation: "Simulation", distributed: "MAD réparti",
      fixedCosts: "Charges fixes", debts: "Dettes", expenses: "Dépenses",
      exportCsv: "Exporter CSV", incVsExp: "Revenus vs dépenses", byCat: "Par catégorie",
      savRegularity: "Régularité d’épargne", vsPrev: "vs cycle précédent",
    },
    fabor: "c’est faboooor",
    foot: "© 2026 7sabek. Tous droits réservés.",
  },

  en: {
    nav: { sim: "Simulator", plan: "Money Plan", tour: "The app", feat: "Features", who: "Who it’s for", cgu: "Terms", priv: "Privacy", contact: "Contact" },
    cta: { start: "Get started", login: "Log in", logout: "Log out", dashboard: "Dashboard", free: "Start for free", try: "Try the simulator" },
    hero: {
      badge: "Envelope budgeting, built for Morocco",
      t1: "Every dirham,",
      t2: "a clear mission.",
      sub: "7sabek builds your financial plan the moment you sign up, splits your salary into envelopes, and tells you what you actually have left — not just one balance.",
      micro: "No credit card · No spreadsheets · FR · EN · الدارجة",
    },
    trust: ["Passkey sign-in", "Simulate before applying", "Export your data", "Multilingual FR / EN / AR"],
    chips: { rent: "Rent", rentM: "Due in 3d", sal: "Salary", salM: "Monthly", net: "Internet", netM: "Renewal", debt: "Car loan", debtM: "Priority 1", sav: "Savings", savM: "Auto · leftover" },
    sc: { cycle: "Cycle 01 → 30", cash: "Available cash" },
    env: { food: "Groceries", transport: "Transport", fun: "Going out", save: "Savings", rent: "Rent", net: "Internet", debt: "Car loan", sal: "Salary" },
    sim: {
      kicker: "Try it now",
      title: "Move the slider. Watch your salary split itself.",
      text: "This is exactly how 7sabek works: fixed amounts first, percentages next, and whatever is left goes straight to savings.",
      income: "Your monthly salary",
      left: "What goes to savings",
      note: "Illustrative example. In the app, your envelopes, amounts and rules are your own — and nothing is applied until you confirm.",
      fixed: "Fixed",
    },
    ck: {
      kicker: "Quick check",
      title: "Tick what sounds like you.",
      text: "Six situations, no data asked. By the end you’ll know whether 7sabek is actually for you — or not.",
      items: [
        "At the end of the month, I don’t really know where my money went.",
        "I find out I overspent only once it’s already done.",
        "I split my salary in my head, or not at all.",
        "I have a debt I keep pushing to next month.",
        "I have a plan I never manage to fund.",
        "I’ve already given up on a spreadsheet or a budgeting app.",
      ],
      verdicts: [
        { t: "Tick at least one box.", d: "Your read-out appears here, with what 7sabek actually changes for you." },
        { t: "You’re pretty well organised.", d: "Honestly, you’ve got this. 7sabek would mainly save you time: the splitting and the tracking become automatic. That’s it." },
        { t: "You’re in the fragile zone.", d: "Your budget holds up, but nothing warns you before it breaks. That’s exactly when an envelope method starts paying off." },
        { t: "Your money is deciding for you.", d: "Every dirham leaves without a job. This is the textbook case where switching to envelopes changes everything, from the first payday." },
      ],
      solutions: [
        "Envelopes: a clear amount per area",
        "Warned before you overspend, not after",
        "Automatic splitting of your salary",
        "Debt kept apart and prioritised",
        "Goals kept separate, never raided",
        "Money Plan: the budget is built with you",
      ],
      cta: "Build my plan",
    },
    plan: {
      kicker: "The starting point",
      title: "A financial plan built with you, not for you.",
      text: "From sign-up, 7sabek asks the right questions about your income, fixed costs, debts and goals — then computes your real repayment capacity and your safety buffer. You adjust the proposed split, confirm, and start with a budget that fits you.",
      cta: "Build my plan",
      steps: [
        { t: "Income profile", d: "Salaried, freelance, craftsperson or mixed income — the maths adapts to you." },
        { t: "Costs & debts", d: "Rent, subscriptions, ongoing repayments: declared once, used everywhere." },
        { t: "Capacity & buffer", d: "7sabek works out how much you can really repay without breaking your month." },
        { t: "Proposed envelopes", d: "A ready-to-use first split — that you can adjust at any time." },
      ],
    },
    tour: {
      kicker: "A look inside",
      title: "See the app from the inside.",
      text: "Four screens, one logic: you always see what’s left, and why.",
      tabs: ["Dashboard", "Envelopes", "Allocation", "Reports"],
      caps: [
        "The dashboard: available cash, cycle spending, and the real state of every envelope at a glance.",
        "Each envelope shows what’s left, whether rollover is on, and warns you before you overspend.",
        "Your allocation rules: fixed amounts, percentages, and the leftover flowing to savings — simulated before it’s applied.",
        "Trends, category breakdown and savings consistency — exportable whenever you want.",
      ],
    },
    how: {
      kicker: "Day to day",
      title: "Your budget runs in 4 simple steps.",
      steps: [
        { t: "Your salary lands in Cash", d: "A neutral starting point, before any automatic split." },
        { t: "Automatic distribution", d: "Allocated across spending, debt, goals and savings following your rules." },
        { t: "Real-time tracking", d: "Every expense hits its linked envelope, immediately." },
        { t: "Optimised cycle end", d: "Eligible leftovers move automatically to savings." },
      ],
    },
    ft: {
      kicker: "Features",
      title: "Everything you need to run your budget every day.",
      items: [
        { k: "Zero-based", t: "Budget envelopes", d: "Give every dirham a job: rent, groceries, going out, savings — each in its own envelope." },
        { k: "Fast entry", t: "Add an expense in one sentence", d: "Describe your expense in plain language and 7sabek suggests the amount and category." },
        { k: "Allocation", t: "Fixed or percentage rules", d: "Set a fixed amount or a percentage per envelope. The leftover goes to savings automatically." },
        { k: "No surprises", t: "Simulate before applying", d: "See what a rule does before it ever touches your real money." },
        { k: "Real cycle", t: "Your payday, not a generic calendar", d: "Weekly, monthly or irregular pay: the cycle follows your reality, not the other way round." },
        { k: "Security", t: "Passkey sign-in", d: "No more forgotten passwords: sign in with a modern security key (passkey)." },
        { k: "Reports", t: "Understand where your money goes", d: "Trends, category breakdown, and export of your data at any time." },
        { k: "Goals", t: "Kept apart from spending", d: "Travel, emergencies, big purchases: each goal has its own envelope, never touched by mistake." },
        { k: "Debt", t: "Prioritised, not forgotten", d: "Isolate repayments with a clear priority, without breaking your day-to-day budget." },
      ],
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
      text: "Build your plan, split your salary, track your goals — and make simpler decisions with a living budget.",
      alt: "Explore the features",
      micro: "Not one dirham to pay. Freeeee, really.",
    },
    sv: {
      cash: "CASH", income: "INCOME", addEnv: "+ Envelope",
      rollOn: "Rollover on · 12 entries", rollOff: "Rollover off · 6 entries",
      almost: "Almost empty · 10 MAD left", debtP1: "Debt · priority 1",
      of1100: "of 1,100", of400: "of 400", of350: "of 350", of2100: "of 2,100",
      savDefault: "Savings (default)", savDesc: "Receives the end-of-cycle leftover",
      rules: "Active rules", fixed: "FIXED", leftover: "Leftover", toSavings: "Sent to Savings", auto: "auto",
      simulate: "Simulate allocation", save: "Save", simulation: "Simulation", distributed: "MAD allocated",
      fixedCosts: "Fixed costs", debts: "Debt", expenses: "Spending",
      exportCsv: "Export CSV", incVsExp: "Income vs spending", byCat: "By category",
      savRegularity: "Savings consistency", vsPrev: "vs previous cycle",
    },
    fabor: "it’s freeeee",
    foot: "© 2026 7sabek. All rights reserved.",
  },

  ar: {
    nav: { sim: "المحاكاة", plan: "خطة الفلوس", tour: "التطبيق", feat: "الخصائص", who: "لمن", cgu: "شروط الاستخدام", priv: "الخصوصية", contact: "اتصل بنا" },
    cta: { start: "بدا", login: "دخول", logout: "تسجيل الخروج", dashboard: "لوحة التحكم", free: "بدا مجاناً", try: "جرب المحاكاة" },
    hero: {
      badge: "ميزانية بالأظرفة، مصممة للمغرب",
      t1: "كل درهم،",
      t2: "عندو مهمة واضحة.",
      sub: "7sabek كيبني ليك خطة الفلوس ديالك من أول ما تسجل، كيوزع السالير ديالك على الأظرفة، وكيقول ليك شحال بقا ليك بالضبط — ماشي غير رصيد عام.",
      micro: "بلا كارط بانكية · بلا جداول · بالفرنسية، الإنجليزية والدارجة",
    },
    trust: ["دخول بمفتاح الأمان", "محاكاة قبل التطبيق", "تصدير البيانات ديالك", "بثلاث لغات"],
    chips: { rent: "الكراء", rentM: "باقي 3 أيام", sal: "السالير", salM: "شهري", net: "الأنترنيت", netM: "تجديد", debt: "كريدي الطوموبيل", debtM: "أولوية 1", sav: "الادخار", savM: "أوتوماتيكي · الباقي" },
    sc: { cycle: "الدورة 01 ← 30", cash: "الكاش المتوفر" },
    env: { food: "التقضية", transport: "التنقل", fun: "الخرجات", save: "الادخار", rent: "الكراء", net: "الأنترنيت", debt: "كريدي الطوموبيل", sal: "السالير" },
    sim: {
      kicker: "جرب دابا",
      title: "حرك المؤشر. شوف كيفاش كيتقسم السالير ديالك.",
      text: "هادي بالضبط هي الطريقة ديال 7sabek: المبالغ الثابتة الأول، من بعد النسب المئوية، والباقي كيمشي أوتوماتيكياً للادخار.",
      income: "السالير ديالك فالشهر",
      left: "اللي كيمشي للادخار",
      note: "هادا غير مثال توضيحي. فالتطبيق، الأظرفة والمبالغ والقواعد كلها ديالك — وحتى حاجة ما كتطبق حتى تأكد نتا.",
      fixed: "ثابت",
    },
    ck: {
      kicker: "تشخيص سريع",
      title: "شيك على اللي كيوقع ليك.",
      text: "ست حالات، بلا ما نطلبو منك حتى معلومة. فالأخير غادي تعرف واش 7sabek كينفعك بصح — ولا لا.",
      items: [
        "فآخر الشهر، ما كنعرفش بصح فين مشاو ليا الفلوس.",
        "كنعرف بللي صرفت بزااااف غير من بعد ما يكون فات الفوت.",
        "كنقسم السالير ديالي فراسي، ولا ما كنقسمو حتى قسمة.",
        "عندي دين كنأجلو من شهر لشهر.",
        "عندي مشروع عمري ما قدرت نموّلو.",
        "سبق ليا خليت جدول ولا تطبيق ديال الميزانية.",
      ],
      verdicts: [
        { t: "شيك على شي حاجة وحدة على الأقل.", d: "التشخيص غادي يبان هنا، مع اللي كيبدلو 7sabek عندك بصح." },
        { t: "راك منظم مزيان.", d: "بصراحة راك مسير راسك. 7sabek غادي يربحك غير الوقت: التوزيع والتتبع كيوليو أوتوماتيكيين، وصافي." },
        { t: "راك فالمنطقة الهشة.", d: "الميزانية ديالك واقفة، ولكن حتى حاجة ما كتنبهك قبل ما تطيح. هادي بالضبط اللحظة اللي طريقة الأظرفة كتبدل فيها كلشي." },
        { t: "الفلوس هي اللي كتقرر بلاصتك.", d: "كل درهم كيخرج بلا مهمة واضحة. هادي هي الحالة اللي فيها الأظرفة كيبدلو كلشي، من أول سالير." },
      ],
      solutions: [
        "الأظرفة: مبلغ واضح لكل جزء",
        "تنبيه قبل التجاوز، ماشي من بعد",
        "توزيع أوتوماتيكي للسالير ديالك",
        "الديون مفصولة وبأولوية",
        "الأهداف منفصلة، وما كيتمسوش",
        "خطة الفلوس: الميزانية كتتبنى معاك",
      ],
      cta: "بني الخطة ديالي",
    },
    plan: {
      kicker: "نقطة البداية",
      title: "خطة فلوس مبنية معاك، ماشي بلاصتك.",
      text: "من أول ما تسجل، 7sabek كيسولك على الدخل ديالك، المصاريف الثابتة، الديون والأهداف — ومن بعد كيحسب القدرة الحقيقية ديالك على السداد والاحتياطي ديال الأمان. كتعدل التوزيع المقترح، كتأكد، وكتبدا بميزانية على قياسك.",
      cta: "بني الخطة ديالي",
      steps: [
        { t: "نوع الدخل", d: "مأجور، فريلانس، حرفي ولا مداخيل مخلوطة — الحساب كيتأقلم مع الواقع ديالك." },
        { t: "المصاريف والديون", d: "الكراء، الاشتراكات، السداد اللي خدام: كلشي كيتصرح به مرة وحدة." },
        { t: "القدرة والاحتياطي", d: "7sabek كيحسب شحال تقدر تسدد بصح بلا ما تخرب الشهر ديالك." },
        { t: "الأظرفة المقترحة", d: "توزيع أولي واجد للاستعمال — وتقدر تعدلو فأي وقت." },
      ],
    },
    tour: {
      kicker: "نظرة من الداخل",
      title: "شوف التطبيق من الداخل.",
      text: "أربع سكرينات، ومنطق واحد: ديما كتشوف شحال بقا ليك، وعلاش.",
      tabs: ["لوحة القيادة", "الأظرفة", "التوزيع", "التقارير"],
      caps: [
        "لوحة القيادة: الكاش المتوفر، مصاريف الدورة، وحالة كل ظرف بنظرة وحدة.",
        "كل ظرف كيبين ليك شحال بقا فيه، واش الترحيل شاعل، وكينبهك قبل ما تتجاوز.",
        "قواعد التوزيع ديالك: مبالغ ثابتة، نسب مئوية، والباقي كيمشي للادخار — بمحاكاة قبل التطبيق.",
        "الاتجاهات، التقسيم حسب الصنف، والانتظام فالادخار — وتقدر تصدرهم فأي وقت.",
      ],
    },
    how: {
      kicker: "فاليومي",
      title: "الميزانية ديالك كتخدم فـ4 خطوات بسيطة.",
      steps: [
        { t: "السالير كيدخل للكاش", d: "نقطة بداية محايدة، قبل أي توزيع أوتوماتيكي." },
        { t: "التوزيع الأوتوماتيكي", d: "كيتقسم على المصاريف، الديون، الأهداف والادخار حسب القواعد ديالك." },
        { t: "التتبع فالوقت الحقيقي", d: "كل مصروف كيأثر على الظرف المرتبط بيه، دغيا." },
        { t: "نهاية الدورة محسّنة", d: "الباقي المؤهل كيمشي أوتوماتيكياً للادخار." },
      ],
    },
    ft: {
      kicker: "الخصائص",
      title: "كل ما تحتاجو باش تسير الميزانية ديالك يومياً.",
      items: [
        { k: "من الصفر", t: "الأظرفة ديال الميزانية", d: "عطي مهمة لكل درهم: الكراء، التقضية، الخرجات، الادخار — كل واحد فالظرف ديالو." },
        { k: "تسجيل سريع", t: "زيد مصروف بجملة وحدة", d: "وصف المصروف ديالك بلغة عادية، و7sabek كيقترح ليك المبلغ والصنف." },
        { k: "التوزيع", t: "قواعد ثابتة ولا بالنسبة المئوية", d: "حدد مبلغ ثابت ولا نسبة مئوية لكل ظرف. الباقي كيمشي أوتوماتيكياً للادخار." },
        { k: "بلا مفاجآت", t: "محاكاة قبل التطبيق", d: "شوف تأثير أي قاعدة قبل ما تمس الفلوس ديالك بصح." },
        { k: "دورة حقيقية", t: "تاريخ الخلاص ديالك، ماشي روزنامة عامة", d: "خلاص أسبوعي، شهري ولا غير منتظم: الدورة كتمشي مع الواقع ديالك، ماشي العكس." },
        { k: "الأمان", t: "دخول بمفتاح الأمان", d: "سالا نسيان كلمة السر: دخل بمفتاح أمان عصري (passkey)." },
        { k: "التقارير", t: "فهم فين كتمشي فلوسك", d: "الاتجاهات، التقسيم حسب الصنف، وتصدير البيانات ديالك فأي وقت." },
        { k: "الأهداف", t: "منفصلة على المصاريف", d: "سفر، طوارئ، شرا مهم: كل هدف عندو الظرف ديالو، وما كيتمسش بالغلط." },
        { k: "الديون", t: "بأولوية، ماشي منسية", d: "افصل السداد ديالك بأولوية واضحة، بلا ما تخرب الميزانية اليومية." },
      ],
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
      text: "بني الخطة ديالك، وزع السالير، تتبع الأهداف — وخذ قرارات أسهل مع ميزانية حية.",
      alt: "اكتشف الخصائص",
      micro: "حتى درهم ما غادي تخلص. فابووووور بصح.",
    },
    sv: {
      cash: "كاش", income: "دخل", addEnv: "+ ظرف",
      rollOn: "الترحيل شاعل · 12 عملية", rollOff: "الترحيل طافي · 6 عمليات",
      almost: "قريب يسالي · بقا 10 درهم", debtP1: "دين · أولوية 1",
      of1100: "من 1 100", of400: "من 400", of350: "من 350", of2100: "من 2 100",
      savDefault: "الادخار (افتراضي)", savDesc: "كياخد الباقي فنهاية الدورة",
      rules: "القواعد المفعلة", fixed: "ثابت", leftover: "الباقي", toSavings: "كيمشي للادخار", auto: "أوتوماتيكي",
      simulate: "شوف المحاكاة", save: "حفظ", simulation: "المحاكاة", distributed: "درهم موزع",
      fixedCosts: "مصاريف ثابتة", debts: "الديون", expenses: "المصاريف",
      exportCsv: "تصدير CSV", incVsExp: "الدخل مقابل المصاريف", byCat: "حسب الصنف",
      savRegularity: "انتظام الادخار", vsPrev: "مقارنة بالدورة السابقة",
    },
    fabor: "فابووووور",
    foot: "© 2026 7sabek. جميع الحقوق محفوظة.",
  },
};

/* ------------------------------------------------------------------ */
/*  Simulator rules — mirrors the backend engine: fixed rules first,    */
/*  then percent-of-income, and whatever is left goes to savings.       */
/* ------------------------------------------------------------------ */
type Rule =
  | { key: keyof Copy["env"]; kind: "fixed"; amount: number; color: string }
  | { key: keyof Copy["env"]; kind: "pct"; pct: number; color: string };

const RULES: Rule[] = [
  { key: "rent", kind: "fixed", amount: 3200, color: "#0A241D" },
  { key: "debt", kind: "fixed", amount: 2100, color: "#8B7CF6" },
  { key: "net", kind: "fixed", amount: 199, color: "#123A2E" },
  { key: "food", kind: "pct", pct: 22, color: "#17C777" },
  { key: "transport", kind: "pct", pct: 8, color: "#4C7EFF" },
  { key: "fun", kind: "pct", pct: 6, color: "#F2A93B" },
];

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

  const [salary, setSalary] = useState(12400);
  const [checked, setChecked] = useState<boolean[]>(() => Array(6).fill(false));
  const [shot, setShot] = useState(0);
  const [introReady, setIntroReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const phoneRef = useRef<HTMLDivElement | null>(null);

  // Auto-open Google Play popup after landing load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGooglePlayPopup(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

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
      const want = rule.kind === "fixed" ? rule.amount : Math.round((salary * rule.pct) / 100);
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

  const pickedCount = checked.filter(Boolean).length;
  const level = pickedCount === 0 ? 0 : pickedCount <= 2 ? 1 : pickedCount <= 4 ? 2 : 3;
  const verdict = copy.ck.verdicts[level];
  const levelColor = ["#7C8D86", "#0B8F53", "#F2A93B", "#F2686B"][level];

  const toggleCheck = useCallback((index: number) => {
    setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)));
  }, []);

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
    { href: "#plan", label: copy.nav.plan },
    { href: "#apercu", label: copy.nav.tour },
    { href: "#fonctions", label: copy.nav.feat },
    { href: "#pourqui", label: copy.nav.who },
  ];

  const Tick = () => (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
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
      {/* 🚀 GOOGLE PLAY POPUP MODAL */}
      {showGooglePlayPopup && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setShowGooglePlayPopup(false)}
        >
          <div
            className="relative w-full max-w-lg bg-neutral-950 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/60 text-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient glow */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/25 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowGooglePlayPopup(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center shadow-inner">
                <GooglePlayIcon className="w-10 h-10 flex-shrink-0" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 rounded-full">
                  {isArabic ? "تطبيق أندرويد الرسمي" : "Application Android Officielle"}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {isArabic ? "حمّل تطبيق 7sabek على أندرويد !" : "7sabek est disponible sur Android !"}
                </h3>
              </div>
            </div>

            <p className="text-neutral-300 text-sm leading-relaxed mb-6">
              {isArabic
                ? "تحكم في ميزانيتك وأظرفتك من هاتفك بدون إنترنت، سجل مصاريفك بالدارجة المغربية بالصوت، واحصل على تنبيهات ذكية وتشفير بالبصمة."
                : "Gérez vos enveloppes hors-ligne, dictez vos transactions en Darija par la voix, sécurisez votre compte avec la biométrie et suivez vos dettes en toute simplicité."}
            </p>

            {/* Key highlights */}
            <div className="grid grid-cols-2 gap-2.5 mb-6 text-xs text-neutral-200">
              <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl border border-white/10">
                <span className="text-emerald-400 text-base">⚡</span>
                <span className="font-semibold">{isArabic ? "100% بدون إنترنت" : "100% Hors-Ligne"}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl border border-white/10">
                <span className="text-cyan-400 text-base">🎙️</span>
                <span className="font-semibold">{isArabic ? "صوت بالدارجة المغربية" : "IA Darija Vocale"}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl border border-white/10">
                <span className="text-emerald-400 text-base">🛡️</span>
                <span className="font-semibold">{isArabic ? "دخول بالبصمة" : "Sécurité Biométrique"}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl border border-white/10">
                <span className="text-amber-400 text-base">📊</span>
                <span className="font-semibold">{isArabic ? "تحليلات وديون Salaf" : "Analytics & Dettes"}</span>
              </div>
            </div>

            {/* Download Call to Action */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <a
                href="/7sabek_app.apk"
                download="7sabek_app.apk"
                onClick={() => setShowGooglePlayPopup(false)}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black py-3 px-6 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all text-sm group"
              >
                <GooglePlayIcon className="w-6 h-6 flex-shrink-0" />
                <span>{isArabic ? "تحميل تطبيق أندرويد (APK)" : "Télécharger pour Android (APK)"}</span>
              </a>

              <button
                type="button"
                onClick={() => setShowGooglePlayPopup(false)}
                className="w-full sm:w-auto px-4 py-3 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                {isArabic ? "المتابعة على الموقع" : "Continuer sur le Web"}
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-center">
              <p className="text-[11px] text-neutral-400">
                {isArabic ? "متوافق مع جميع هواتف أندرويد • الإصدار 2.4.0 • مجاني 100%" : "Compatible Android 8.0+ • Version 2.4.0 • 100% Gratuit"}
              </p>
            </div>
          </div>
        </div>
      )}

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
              <span className="lp-eyebrow"><span className="lp-sq" />{copy.hero.badge}</span>
              <h1 className={`${headingClass} lp-h1`}>
                <span className="lp-line">
                  {copy.hero.t1.split(" ").map((word, index) => (
                    <span key={`${word}-${index}`} className="lp-w" style={{ "--wd": `${0.18 + index * 0.07}s` } as React.CSSProperties}>
                      {word}
                    </span>
                  ))}
                </span>
                <span className="lp-line lp-l2">
                  {copy.hero.t2.split(" ").map((word, index) => (
                    <span key={`${word}-${index}`} className="lp-w" style={{ "--wd": `${0.32 + index * 0.07}s` } as React.CSSProperties}>
                      {word}
                    </span>
                  ))}
                </span>
              </h1>
              <p className="lp-sub">{copy.hero.sub}</p>
              <div className="lp-ctarow">
                <Link href="/register" className="lp-btn lp-btn-accent">{copy.cta.free}<Arrow /></Link>
                <a href="#simulateur" className="lp-btn lp-btn-ghost">{copy.cta.try}</a>
                <span className="lp-sticker"><span aria-hidden="true">✦</span>{copy.fabor}</span>
              </div>

              {/* 📱 Google Play Android App Installer Badge */}
              <div className="mt-3.5 mb-1.5">
                <button
                  type="button"
                  onClick={() => setShowGooglePlayPopup(true)}
                  className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer group"
                >
                  <GooglePlayIcon className="w-6 h-6 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10.5px] uppercase font-bold text-emerald-400 tracking-wider leading-none">
                      {isArabic ? "📱 متوفر الآن على أندرويد و Google Play" : "📱 Disponible sur Google Play & Android"}
                    </span>
                    <span className="text-[12.5px] text-neutral-200 font-semibold group-hover:text-white mt-0.5">
                      {isArabic ? "انقر لتثبيت تطبيق 7sabek على هاتفك أندرويد ←" : "Installer l'application 7sabek sur votre smartphone Android →"}
                    </span>
                  </div>
                </button>
              </div>

              <p className="lp-micro">{copy.hero.micro}</p>

              <div className="lp-trust">
                {copy.trust.map((item) => (
                  <div key={item} className="lp-trustitem"><span className="lp-tick"><Tick /></span>{item}</div>
                ))}
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

        {/* ============================ SIMULATOR ============================ */}
        <section id="simulateur" className="lp-section lp-pt0">
          <div className="lp-wrap">
            <div className="lp-head lp-center">
              <span className="lp-kicker">{copy.sim.kicker}</span>
              <h2 className={`${headingClass} lp-h2`}>{copy.sim.title}</h2>
              <p className="lp-text">{copy.sim.text}</p>
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
                  <p className="lp-simnote">{copy.sim.note}</p>
                </div>

                <div>
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

        {/* ============================ CHECKLIST ============================ */}
        <section id="diagnostic" className="lp-section lp-surface lp-band">
          <div className="lp-wrap">
            <div className="lp-head lp-center">
              <span className="lp-kicker">{copy.ck.kicker}</span>
              <h2 className={`${headingClass} lp-h2`}>{copy.ck.title}</h2>
              <p className="lp-text">{copy.ck.text}</p>
            </div>

            <div className="lp-ckgrid">
              {copy.ck.items.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className="lp-ck"
                  aria-pressed={checked[index]}
                  onClick={() => toggleCheck(index)}
                >
                  <span className="lp-ckbox">✓</span>
                  <span>{item}</span>
                </button>
              ))}
            </div>

            <div className="lp-ckresult" role="status" aria-live="polite">
              <div className="lp-ckgauge">
                <div>
                  <span className={`${headingClass} lp-cknum`} style={{ color: levelColor }}>{pickedCount}</span>
                  <span className={`${headingClass} lp-ckden`}>/6</span>
                </div>
                <div className="lp-cksegs">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <span key={index} className="lp-ckseg" style={index < pickedCount ? { background: levelColor } : undefined} />
                  ))}
                </div>
              </div>
              <div>
                <h3 className={`${headingClass} lp-ckverdict`}>{verdict.t}</h3>
                <p className="lp-ckadvice">{verdict.d}</p>
                {pickedCount > 0 ? (
                  <>
                    <div className="lp-cksol">
                      {checked.map((isOn, index) =>
                        isOn ? (
                          <span key={copy.ck.solutions[index]} className="lp-ckchip">
                            <span className="lp-ckcd" />{copy.ck.solutions[index]}
                          </span>
                        ) : null
                      )}
                    </div>
                    <div className="lp-ckactions">
                      <Link href="/register" className="lp-btn lp-btn-accent">{copy.ck.cta}<Arrow /></Link>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* ============================ MONEY PLAN ============================ */}
        <section id="plan" className="lp-section">
          <div className="lp-wrap">
            <div className="lp-dark">
              <div className="lp-plangrid">
                <div>
                  <span className="lp-kicker lp-kaccent">{copy.plan.kicker}</span>
                  <h2 className={`${headingClass} lp-h2 lp-white`}>{copy.plan.title}</h2>
                  <p className="lp-text lp-textdim">{copy.plan.text}</p>
                  <div className="lp-ctarow">
                    <Link href="/register" className="lp-btn lp-btn-accent">{copy.plan.cta}</Link>
                  </div>
                </div>
                <div>
                  {copy.plan.steps.map((step, index) => (
                    <div key={step.t} className="lp-planstep">
                      <span className={`${headingClass} lp-planN`} dir="ltr">{`0${index + 1}`}</span>
                      <div>
                        <h4>{step.t}</h4>
                        <p>{step.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================ APP TOUR ============================ */}
        <section id="apercu" className="lp-section lp-surface lp-band">
          <div className="lp-wrap">
            <div className="lp-head lp-center">
              <span className="lp-kicker">{copy.tour.kicker}</span>
              <h2 className={`${headingClass} lp-h2`}>{copy.tour.title}</h2>
              <p className="lp-text">{copy.tour.text}</p>
            </div>

            <div className="lp-tabs" role="tablist">
              {copy.tour.tabs.map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={shot === index}
                  className="lp-tab"
                  onClick={() => setShot(index)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="lp-stage">
              <div className="lp-shot" key={shot}>
                {shot === 0 ? <ShotDashboard copy={copy} /> : null}
                {shot === 1 ? <ShotEnvelopes copy={copy} /> : null}
                {shot === 2 ? <ShotDistribution copy={copy} /> : null}
                {shot === 3 ? <ShotReports copy={copy} /> : null}
              </div>
              <p className="lp-shotcap">{copy.tour.caps[shot]}</p>
            </div>
          </div>
        </section>

        {/* ============================ STEPS ============================ */}
        <section className="lp-section">
          <div className="lp-wrap">
            <div className="lp-head">
              <span className="lp-kicker">{copy.how.kicker}</span>
              <h2 className={`${headingClass} lp-h2`}>{copy.how.title}</h2>
            </div>
            <div className="lp-grid4">
              {copy.how.steps.map((step, index) => (
                <div key={step.t} className="lp-card" style={{ "--d": `${index * 0.07}s` } as React.CSSProperties}>
                  <span className={`${headingClass} lp-idx`} dir="ltr">{`0${index + 1}`}</span>
                  <h3>{step.t}</h3>
                  <p>{step.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ FEATURES ============================ */}
        <section id="fonctions" className="lp-section lp-surface lp-band">
          <div className="lp-wrap">
            <div className="lp-head">
              <span className="lp-kicker">{copy.ft.kicker}</span>
              <h2 className={`${headingClass} lp-h2`}>{copy.ft.title}</h2>
            </div>
            <div className="lp-grid3">
              {copy.ft.items.map((item, index) => (
                <div key={item.t} className="lp-card" style={{ "--d": `${index * 0.05}s` } as React.CSSProperties}>
                  <span className="lp-fttag">{item.k}</span>
                  <h3>{item.t}</h3>
                  <p>{item.d}</p>
                </div>
              ))}
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
              <p className="lp-textdim">{copy.fin.text}</p>
              <div className="lp-ctarow lp-centerrow">
                <Link href="/register" className="lp-btn lp-btn-accent">{copy.cta.free}<Arrow /></Link>
                <a href="#fonctions" className="lp-btn lp-btn-ghostdark">{copy.fin.alt}</a>
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
        }
        .lp-root h1, .lp-root h2, .lp-root h3, .lp-root h4 { margin: 0; letter-spacing: -.02em; text-wrap: balance; }
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
        .lp-h1 { font-size: clamp(2.5rem, 5.4vw, 4.35rem); line-height: 1; font-weight: 800; margin-top: 20px; }
        .lp-line { display: block; }
        .lp-l2 { color: var(--accent-deep); }
        .lp-w { display: inline-block; margin-inline-end: .25em; }
        .lp-intro .lp-w { opacity: 0; transform: translateY(26px) rotate(2deg); animation: lpWord .62s cubic-bezier(.22,1,.36,1) forwards; animation-delay: var(--wd, 0s); }
        @keyframes lpWord { to { opacity: 1; transform: none; } }
        .lp-sub { margin-top: 20px; max-width: 47ch; font-size: 1.06rem; line-height: 1.62; color: var(--ink-soft); }
        .lp-ctarow { margin-top: 28px; display: flex; flex-wrap: wrap; align-items: center; gap: 11px; }
        .lp-centerrow { justify-content: center; }
        .lp-micro { margin-top: 15px; font-size: .81rem; color: var(--ink-mute); }
        .lp-sticker { display: inline-flex; align-items: center; gap: 6px; background: var(--amber); color: #3a2400; font-weight: 800; font-size: .78rem; padding: 7px 14px; border-radius: 999px; box-shadow: 0 8px 18px -8px rgba(242,169,59,.8); transform: rotate(-4deg); animation: lpWob 4.2s ease-in-out infinite; white-space: nowrap; }
        @keyframes lpWob { 0%,100% { transform: rotate(-4deg) scale(1); } 50% { transform: rotate(3deg) scale(1.05); } }
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
        .lp-textdim { color: #b9cfc5 !important; }

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
        .lp-simnote { margin-top: 20px; font-size: .79rem; line-height: 1.55; color: var(--ink-mute); border-inline-start: 2px solid var(--accent); padding-inline-start: 12px; }
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

        .lp-grid2, .lp-grid3, .lp-grid4 { margin-top: 40px; display: grid; gap: 16px; grid-template-columns: 1fr; }
        @media (min-width: 720px) { .lp-grid2 { grid-template-columns: repeat(2,1fr); } }
        @media (min-width: 700px) { .lp-grid3 { grid-template-columns: repeat(2,1fr); } }
        @media (min-width: 1060px) { .lp-grid3 { grid-template-columns: repeat(3,1fr); } }
        @media (min-width: 640px) { .lp-grid4 { grid-template-columns: repeat(2,1fr); } }
        @media (min-width: 1060px) { .lp-grid4 { grid-template-columns: repeat(4,1fr); } }
        .lp-card { position: relative; border: 1px solid var(--line); background: var(--surface); border-radius: 26px; padding: 24px; transition: border-color .18s, transform .18s, box-shadow .18s; }
        .lp-card:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: var(--shadow); }
        .lp-card h3 { margin-top: 12px; font-size: 1.02rem; font-weight: 800; }
        .lp-card p { margin-top: 7px; font-size: .87rem; color: var(--ink-soft); line-height: 1.56; }
        .lp-fttag { font-size: .64rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--accent-deep); }
        .lp-ar .lp-fttag { letter-spacing: 0; }
        .lp-idx { font-size: 2rem; font-weight: 800; -webkit-text-stroke: 1.5px var(--accent); color: transparent; line-height: 1; }

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
          .lp-blob, .lp-chip, .lp-sticker, .lp-mqtrack { animation: none !important; }
          .lp-intro .lp-w, .lp-intro .lp-bar > span { animation: none !important; opacity: 1 !important; transform: none !important; }
          .lp-shot { animation: none; }
          .lp-btn-accent::after { display: none; }
          .lp-phone { transition: none; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mock app screens                                                   */
/* ------------------------------------------------------------------ */
function ShotDashboard({ copy }: { copy: Copy }) {
  const bars: Array<[string, string, number, string]> = [
    [copy.env.food, "640 / 1 100", 295, "#17C777"],
    [copy.env.transport, "210 / 400", 266, "#17C777"],
    [copy.env.fun, "340 / 350", 493, "#F2A93B"],
    [copy.env.debt, "2 100 / 2 100", 508, "#8B7CF6"],
    [copy.env.save, "1 500 / 1 500", 508, "#17C777"],
  ];
  return (
    <svg viewBox="0 0 960 560" role="img" aria-label={copy.tour.tabs[0]}>
      <defs>
        <linearGradient id="lpAr1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#17C777" stopOpacity=".28" /><stop offset="100%" stopColor="#17C777" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="960" height="560" rx="18" fill="#F6F8F4" />
      <rect x="0" y="0" width="960" height="56" rx="18" fill="#FFFFFF" /><rect x="0" y="40" width="960" height="16" fill="#FFFFFF" />
      <line x1="0" y1="56" x2="960" y2="56" stroke="#E3E8DF" />
      <circle cx="34" cy="28" r="9" fill="#17C777" />
      <rect x="52" y="22" width="62" height="12" rx="6" fill="#0A241D" opacity=".82" />
      <rect x="24" y="80" width="292" height="104" rx="16" fill="#FFFFFF" stroke="#E3E8DF" />
      <rect x="44" y="102" width="98" height="8" rx="4" fill="#7C8D86" />
      <text x="44" y="152" fontSize="30" fontWeight="800" fill="#0B8F53">2 640,00</text>
      <text x="196" y="152" fontSize="13" fontWeight="700" fill="#7C8D86">MAD</text>
      <rect x="256" y="98" width="46" height="20" rx="10" fill="#E2F7EC" />
      <text x="264" y="112" fontSize="10" fontWeight="800" fill="#0B8F53">{copy.sv.cash}</text>
      <rect x="332" y="80" width="292" height="104" rx="16" fill="#FFFFFF" stroke="#E3E8DF" />
      <rect x="352" y="102" width="86" height="8" rx="4" fill="#7C8D86" />
      <text x="352" y="152" fontSize="30" fontWeight="800" fill="#0A241D">7 214,00</text>
      <text x="512" y="152" fontSize="13" fontWeight="700" fill="#7C8D86">MAD</text>
      <rect x="640" y="80" width="296" height="104" rx="16" fill="#FFFFFF" stroke="#E3E8DF" />
      <rect x="660" y="102" width="76" height="8" rx="4" fill="#7C8D86" />
      <text x="660" y="152" fontSize="30" fontWeight="800" fill="#0A241D">12 400</text>
      <text x="790" y="152" fontSize="13" fontWeight="700" fill="#7C8D86">MAD</text>
      <rect x="856" y="98" width="60" height="20" rx="10" fill="#EAEFFF" />
      <text x="864" y="112" fontSize="10" fontWeight="800" fill="#2E5BD1">{copy.sv.income}</text>

      <rect x="24" y="204" width="560" height="332" rx="18" fill="#FFFFFF" stroke="#E3E8DF" />
      <g fontSize="13" fontWeight="700" fill="#0A241D">
        {bars.map((row, index) => {
          const y = 278 + index * 58;
          return (
            <g key={row[0]}>
              <text x="46" y={y}>{row[0]}</text>
              <text x="470" y={y} textAnchor="end" fill="#4E625A">{row[1]}</text>
              <rect x="46" y={y + 10} width="508" height="9" rx="4.5" fill="#EEF1EA" />
              <rect x="46" y={y + 10} width={row[2]} height="9" rx="4.5" fill={row[3]} />
            </g>
          );
        })}
      </g>

      <rect x="600" y="204" width="336" height="332" rx="18" fill="#FFFFFF" stroke="#E3E8DF" />
      <rect x="622" y="228" width="104" height="10" rx="5" fill="#0A241D" opacity=".8" />
      <path d="M622,420 662,398 702,406 742,368 782,382 822,338 862,352 902,306 902,470 622,470Z" fill="url(#lpAr1)" />
      <polyline points="622,420 662,398 702,406 742,368 782,382 822,338 862,352 902,306" fill="none" stroke="#17C777" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="902" cy="306" r="5" fill="#17C777" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

function ShotEnvelopes({ copy }: { copy: Copy }) {
  const rows = [
    { n: copy.env.food, s: copy.sv.rollOn, v: "460 MAD", of: copy.sv.of1100, w: 372, c: "#17C777", bg: "#E2F7EC", stroke: "#E3E8DF", vc: "#0A241D" },
    { n: copy.env.transport, s: copy.sv.rollOff, v: "190 MAD", of: copy.sv.of400, w: 336, c: "#4C7EFF", bg: "#EAEFFF", stroke: "#E3E8DF", vc: "#0A241D" },
    { n: copy.env.fun, s: copy.sv.almost, v: "10 MAD", of: copy.sv.of350, w: 622, c: "#F2A93B", bg: "#FDF2DF", stroke: "#F2A93B", vc: "#B97913" },
    { n: copy.env.debt, s: copy.sv.debtP1, v: "0 MAD", of: copy.sv.of2100, w: 640, c: "#8B7CF6", bg: "#F1EEFE", stroke: "#E3E8DF", vc: "#0A241D" },
  ];
  return (
    <svg viewBox="0 0 960 560" role="img" aria-label={copy.tour.tabs[1]}>
      <rect width="960" height="560" rx="18" fill="#F6F8F4" />
      <rect x="0" y="0" width="960" height="56" rx="18" fill="#FFFFFF" /><rect x="0" y="40" width="960" height="16" fill="#FFFFFF" />
      <line x1="0" y1="56" x2="960" y2="56" stroke="#E3E8DF" />
      <circle cx="34" cy="28" r="9" fill="#17C777" /><rect x="52" y="22" width="76" height="12" rx="6" fill="#0A241D" opacity=".82" />
      <rect x="786" y="16" width="142" height="24" rx="12" fill="#17C777" />
      <text x="808" y="32" fontSize="11" fontWeight="800" fill="#06301F">{copy.sv.addEnv}</text>

      {rows.map((row, index) => {
        const y = 80 + index * 100;
        return (
          <g key={row.n}>
            <rect x="24" y={y} width="912" height="86" rx="16" fill="#FFFFFF" stroke={row.stroke} strokeOpacity={row.stroke === "#E3E8DF" ? 1 : 0.5} />
            <rect x="46" y={y + 28} width="34" height="34" rx="10" fill={row.bg} />
            <circle cx="63" cy={y + 45} r="6" fill={row.c} />
            <text x="98" y={y + 36} fontSize="15" fontWeight="800" fill="#0A241D">{row.n}</text>
            <text x="98" y={y + 58} fontSize="11.5" fontWeight="600" fill="#7C8D86">{row.s}</text>
            <text x="912" y={y + 36} textAnchor="end" fontSize="20" fontWeight="800" fill={row.vc}>{row.v}</text>
            <text x="912" y={y + 58} textAnchor="end" fontSize="11" fontWeight="700" fill="#7C8D86" className="lp-capsm">{row.of}</text>
            <rect x="98" y={y + 68} width="640" height="7" rx="3.5" fill="#EEF1EA" />
            <rect x="98" y={y + 68} width={row.w} height="7" rx="3.5" fill={row.c} />
          </g>
        );
      })}

      <rect x="24" y="480" width="912" height="60" rx="16" fill="#E2F7EC" stroke="#17C777" strokeOpacity=".35" />
      <text x="46" y="508" fontSize="13" fontWeight="800" fill="#0B8F53">{copy.sv.savDefault}</text>
      <text x="46" y="528" fontSize="11.5" fontWeight="600" fill="#0B8F53" opacity=".8" className="lp-capsm">{copy.sv.savDesc}</text>
      <text x="912" y="518" textAnchor="end" fontSize="22" fontWeight="800" fill="#0B8F53">+1 500 MAD</text>
    </svg>
  );
}

function ShotDistribution({ copy }: { copy: Copy }) {
  const rules = [
    { tag: copy.sv.fixed, dark: true, name: copy.env.rent, val: "3 200 MAD" },
    { tag: copy.sv.fixed, dark: true, name: copy.env.debt, val: "2 100 MAD" },
    { tag: "%", dark: false, name: copy.env.food, val: "22 %" },
    { tag: "%", dark: false, name: copy.env.transport, val: "8 %" },
  ];
  const legend: Array<[string, string, string]> = [
    [copy.sv.fixedCosts, "5 300", "#0A241D"],
    [copy.sv.debts, "2 100", "#8B7CF6"],
    [copy.sv.expenses, "3 500", "#17C777"],
    [copy.env.save, "1 500", "#4C7EFF"],
  ];
  return (
    <svg viewBox="0 0 960 560" role="img" aria-label={copy.tour.tabs[2]}>
      <rect width="960" height="560" rx="18" fill="#F6F8F4" />
      <rect x="0" y="0" width="960" height="56" rx="18" fill="#FFFFFF" /><rect x="0" y="40" width="960" height="16" fill="#FFFFFF" />
      <line x1="0" y1="56" x2="960" y2="56" stroke="#E3E8DF" />
      <circle cx="34" cy="28" r="9" fill="#17C777" /><rect x="52" y="22" width="88" height="12" rx="6" fill="#0A241D" opacity=".82" />

      <rect x="24" y="80" width="556" height="456" rx="18" fill="#FFFFFF" stroke="#E3E8DF" />
      <text x="46" y="112" fontSize="13" fontWeight="800" fill="#0A241D">{copy.sv.rules}</text>
      {rules.map((rule, index) => {
        const y = 132 + index * 68;
        return (
          <g key={`${rule.name}-${rule.val}`} fontSize="12.5">
            <rect x="46" y={y} width="512" height="58" rx="12" fill="#F6F8F4" />
            <rect x="62" y={y + 18} width="52" height="20" rx="10" fill={rule.dark ? "#0A241D" : "#E2F7EC"} />
            <text x="70" y={y + 32} fontSize="9.5" fontWeight="800" fill={rule.dark ? "#fff" : "#0B8F53"}>{rule.tag}</text>
            <text x="126" y={y + 33} fontWeight="800" fill="#0A241D">{rule.name}</text>
            <text x="542" y={y + 33} textAnchor="end" fontWeight="800" fill={rule.dark ? "#0A241D" : "#0B8F53"}>{rule.val}</text>
          </g>
        );
      })}
      <rect x="46" y="404" width="512" height="58" rx="12" fill="#E2F7EC" stroke="#17C777" strokeOpacity=".3" />
      <text x="62" y="429" fontSize="11.5" fontWeight="800" fill="#0B8F53">{copy.sv.leftover}</text>
      <text x="62" y="447" fontSize="10.5" fontWeight="600" fill="#0B8F53" opacity=".85" className="lp-capsm">{copy.sv.toSavings}</text>
      <text x="542" y="440" textAnchor="end" fontSize="18" fontWeight="800" fill="#0B8F53">{copy.sv.auto}</text>
      <rect x="46" y="482" width="250" height="34" rx="12" fill="#0A241D" />
      <text x="70" y="504" fontSize="12" fontWeight="800" fill="#fff">{copy.sv.simulate}</text>
      <rect x="310" y="482" width="150" height="34" rx="12" fill="#fff" stroke="#E3E8DF" />
      <text x="336" y="504" fontSize="12" fontWeight="800" fill="#4E625A">{copy.sv.save}</text>

      <rect x="600" y="80" width="336" height="456" rx="18" fill="#FFFFFF" stroke="#E3E8DF" />
      <text x="622" y="112" fontSize="13" fontWeight="800" fill="#0A241D">{copy.sv.simulation}</text>
      <g transform="translate(768,250)">
        <circle r="86" fill="none" stroke="#EEF1EA" strokeWidth="34" />
        <circle r="86" fill="none" stroke="#0A241D" strokeWidth="34" strokeDasharray="140 400" transform="rotate(-90)" />
        <circle r="86" fill="none" stroke="#8B7CF6" strokeWidth="34" strokeDasharray="92 400" transform="rotate(70)" />
        <circle r="86" fill="none" stroke="#17C777" strokeWidth="34" strokeDasharray="120 400" transform="rotate(140)" />
        <circle r="86" fill="none" stroke="#4C7EFF" strokeWidth="34" strokeDasharray="44 400" transform="rotate(228)" />
        <text textAnchor="middle" y="-4" fontSize="26" fontWeight="800" fill="#0A241D">12 400</text>
        <text textAnchor="middle" y="18" fontSize="11" fontWeight="700" fill="#7C8D86">{copy.sv.distributed}</text>
      </g>
      <g fontSize="11.5" fontWeight="700">
        {legend.map(([label, value, color], index) => {
          const y = 392 + index * 28;
          return (
            <g key={label}>
              <rect x="628" y={y} width="10" height="10" rx="3" fill={color} />
              <text x="648" y={y + 9} fill="#4E625A">{label}</text>
              <text x="908" y={y + 9} textAnchor="end" fill="#0A241D">{value}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function ShotReports({ copy }: { copy: Copy }) {
  const cats: Array<[string, string, number, string]> = [
    [copy.env.food, "2 730", 330, "#17C777"],
    [copy.env.transport, "980", 140, "#4C7EFF"],
    [copy.env.fun, "640", 92, "#F2A93B"],
  ];
  const heat = ["#E2F7EC", "#9AE6C0", "#17C777", "#17C777", "#0B8F53", "#E2F7EC", "#9AE6C0", "#17C777", "#0B8F53", "#9AE6C0", "#17C777", "#E2F7EC", "#17C777", "#0B8F53", "#9AE6C0", "#17C777", "#0B8F53", "#0B8F53", "#17C777", "#9AE6C0", "#17C777"];
  return (
    <svg viewBox="0 0 960 560" role="img" aria-label={copy.tour.tabs[3]}>
      <defs>
        <linearGradient id="lpAr2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4C7EFF" stopOpacity=".26" /><stop offset="100%" stopColor="#4C7EFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="960" height="560" rx="18" fill="#F6F8F4" />
      <rect x="0" y="0" width="960" height="56" rx="18" fill="#FFFFFF" /><rect x="0" y="40" width="960" height="16" fill="#FFFFFF" />
      <line x1="0" y1="56" x2="960" y2="56" stroke="#E3E8DF" />
      <circle cx="34" cy="28" r="9" fill="#17C777" /><rect x="52" y="22" width="70" height="12" rx="6" fill="#0A241D" opacity=".82" />
      <rect x="780" y="16" width="148" height="24" rx="12" fill="#F6F8F4" stroke="#E3E8DF" />
      <text x="802" y="32" fontSize="11" fontWeight="800" fill="#4E625A">{copy.sv.exportCsv}</text>

      <rect x="24" y="80" width="912" height="240" rx="18" fill="#FFFFFF" stroke="#E3E8DF" />
      <text x="46" y="112" fontSize="13" fontWeight="800" fill="#0A241D">{copy.sv.incVsExp}</text>
      <g stroke="#EEF1EA"><line x1="46" y1="160" x2="914" y2="160" /><line x1="46" y1="210" x2="914" y2="210" /><line x1="46" y1="260" x2="914" y2="260" /></g>
      <path d="M46,266 156,240 266,252 376,208 486,224 596,182 706,196 816,150 914,138 914,296 46,296Z" fill="url(#lpAr2)" />
      <polyline points="46,266 156,240 266,252 376,208 486,224 596,182 706,196 816,150 914,138" fill="none" stroke="#4C7EFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="46,286 156,278 266,282 376,268 486,276 596,258 706,266 816,246 914,240" fill="none" stroke="#17C777" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
      <circle cx="914" cy="138" r="5.5" fill="#4C7EFF" stroke="#fff" strokeWidth="2.5" />

      <rect x="24" y="336" width="446" height="200" rx="18" fill="#FFFFFF" stroke="#E3E8DF" />
      <text x="46" y="368" fontSize="13" fontWeight="800" fill="#0A241D">{copy.sv.byCat}</text>
      <g fontSize="11.5" fontWeight="700">
        {cats.map(([label, value, width, color], index) => {
          const y = 400 + index * 44;
          return (
            <g key={label}>
              <text x="46" y={y} fill="#4E625A">{label}</text>
              <text x="448" y={y} textAnchor="end" fill="#0A241D">{value}</text>
              <rect x="46" y={y + 8} width="402" height="8" rx="4" fill="#EEF1EA" />
              <rect x="46" y={y + 8} width={width} height="8" rx="4" fill={color} />
            </g>
          );
        })}
      </g>

      <rect x="490" y="336" width="446" height="200" rx="18" fill="#FFFFFF" stroke="#E3E8DF" />
      <text x="512" y="368" fontSize="13" fontWeight="800" fill="#0A241D">{copy.sv.savRegularity}</text>
      <g>
        {heat.map((fill, index) => (
          <rect key={index} x={512 + (index % 7) * 24} y={386 + Math.floor(index / 7) * 24} width="18" height="18" rx="4" fill={fill} />
        ))}
      </g>
      <text x="512" y="490" fontSize="26" fontWeight="800" fill="#0B8F53">+18 %</text>
      <text x="512" y="512" fontSize="11.5" fontWeight="600" fill="#7C8D86" className="lp-capsm">{copy.sv.vsPrev}</text>
    </svg>
  );
}
