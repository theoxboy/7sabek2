"use client";

import type { FloussyLocale } from "@/lib/localePreference";
import type { TourPageId } from "@/lib/tour/registry";

/**
 * Single source of truth for every guided-tour: the pre-tour intro card and the
 * ordered steps, in the three app locales. Pages map each step's `anchor` key to
 * a ref or a CSS selector; they never carry tour copy in their own `copy` object.
 *
 * Writing rules:
 * - `body` = one sentence, concrete (a number, a definition, a real action).
 * - `hint` = one short sentence: why the step matters / what breaks without it.
 * - Brand is always "7sabek" / "7سابك" — never the old "Floussy" / "فلوسي".
 * - No franglais in the FR copy (balayage, rattachement, bouton d'ajout rapide…).
 */

export type TourStepContent = {
  anchor: string;
  title: string;
  body: string;
  hint?: string;
};

export type TourIntroContent = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: [string, string, string];
};

export type TourPageContent = {
  intro?: TourIntroContent;
  steps: TourStepContent[];
};

type LocalizedContent = Record<FloussyLocale, TourPageContent>;

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */
const dashboard: LocalizedContent = {
  fr: {
    intro: {
      eyebrow: "Guide 7sabek",
      title: "Bienvenue sur ton tableau de bord",
      description:
        "Un tour rapide des zones clés. Chaque page lance son guide une seule fois, à ta première visite.",
      bullets: [
        "Le tableau de bord résume ta période : cash, dépenses, revenus, net.",
        "Les alertes « À traiter » sécurisent ton budget en priorité.",
        "Tu peux relancer un guide à tout moment depuis Réglages.",
      ],
    },
    steps: [
      {
        anchor: "header",
        title: "Ta période active",
        body: "Le titre, le sélecteur de période et les boutons d'ajout de revenu ou de dépense.",
        hint: "Tous les chiffres du tableau de bord se recalculent sur cette période.",
      },
      {
        anchor: "todo",
        title: "À traiter",
        body: "Les anomalies détectées : salaire en double, dépense non rattachée, enveloppe dépassée.",
        hint: "Traiter ces alertes garde tes rapports fiables.",
      },
      {
        anchor: "kpis",
        title: "Tes 4 indicateurs",
        body: "Cash disponible à allouer, dépenses de la période, revenus déclarés, et net (revenus − dépenses).",
      },
      {
        anchor: "envelopes",
        title: "Tes enveloppes",
        body: "Les enveloppes principales avec le budget restant de chacune.",
        hint: "Une enveloppe en rouge est dépassée.",
      },
      {
        anchor: "quick",
        title: "Actions rapides",
        body: "Déclarer un revenu, ajouter une dépense, lancer un balayage ou ouvrir la répartition, en un clic.",
      },
      {
        anchor: "sidebar",
        title: "Ta navigation",
        body: "Principal (opérations du quotidien), Pilotage (objectifs, dettes, rapports), Intelligence (assistant, labo) et Système.",
        hint: "Le menu reste accessible partout.",
      },
    ],
  },
  en: {
    intro: {
      eyebrow: "7sabek guide",
      title: "Welcome to your dashboard",
      description:
        "A quick tour of the key areas. Each page runs its guide once, on your first visit.",
      bullets: [
        "The dashboard sums up your period: cash, spending, income, net.",
        "The “To handle” alerts secure your budget first.",
        "You can replay any guide anytime from Settings.",
      ],
    },
    steps: [
      {
        anchor: "header",
        title: "Your active period",
        body: "The title, the period picker and the add-income / add-expense buttons.",
        hint: "Every dashboard figure is recomputed for this period.",
      },
      {
        anchor: "todo",
        title: "To handle",
        body: "Detected anomalies: duplicate salary, unlinked expense, overspent envelope.",
        hint: "Clearing these keeps your reports reliable.",
      },
      {
        anchor: "kpis",
        title: "Your 4 indicators",
        body: "Cash left to allocate, period spending, declared income, and net (income − spending).",
      },
      {
        anchor: "envelopes",
        title: "Your envelopes",
        body: "Your main envelopes with each one's remaining budget.",
        hint: "A red envelope is overspent.",
      },
      {
        anchor: "quick",
        title: "Quick actions",
        body: "Log income, add an expense, run a sweep or open distribution in one click.",
      },
      {
        anchor: "sidebar",
        title: "Your navigation",
        body: "Main (daily operations), Management (goals, debts, reports), Intelligence (assistant, lab) and System.",
        hint: "The menu stays available everywhere.",
      },
    ],
  },
  ar: {
    intro: {
      eyebrow: "دليل 7سابك",
      title: "مرحبا بيك فلوحة القيادة ديالك",
      description:
        "جولة سريعة على المناطق المهمة. كل صفحة كتشغّل المرشد ديالها مرة وحدة، فأول زيارة.",
      bullets: [
        "لوحة القيادة كتلخّص الفترة ديالك: الكاش، المصاريف، الدخل، والصافي.",
        "تنبيهات « خاصك تعالجها » كيأمّنو الميزانية ديالك أولاً.",
        "تقدر تعاود تشغّل أي مرشد فأي وقت من الإعدادات.",
      ],
    },
    steps: [
      {
        anchor: "header",
        title: "الفترة النشيطة ديالك",
        body: "العنوان، مُختار الفترة، وأزرار زيادة دخل ولا مصروف.",
        hint: "كل الأرقام فاللوحة كيتحسبو على هاد الفترة.",
      },
      {
        anchor: "todo",
        title: "خاصك تعالجها",
        body: "الحالات الشاذة: السالاير مسجّل مرتين، مصروف ما مربوطش، ظرف تفوّت.",
        hint: "معالجة هاد التنبيهات كتخلي التقارير ديالك مضبوطة.",
      },
      {
        anchor: "kpis",
        title: "4 مؤشرات ديالك",
        body: "الكاش اللي باقي توزّعو، مصاريف الفترة، الدخل المصرّح، والصافي (دخل − مصاريف).",
      },
      {
        anchor: "envelopes",
        title: "الأظرفة ديالك",
        body: "الأظرفة الرئيسية مع الباقي فكل واحد.",
        hint: "الظرف الأحمر معناه تفوّت.",
      },
      {
        anchor: "quick",
        title: "إجراءات سريعة",
        body: "صرّح دخل، زيد مصروف، شغّل بلياج ولا حل التوزيع، بضغطة وحدة.",
      },
      {
        anchor: "sidebar",
        title: "التنقل ديالك",
        body: "الرئيسي (عمليات نهارية)، التتبع (أهداف، ديون، تقارير)، الذكاء (مساعد، مختبر)، والنظام.",
        hint: "المنيو كيبقى متاح فكل بلاصة.",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Transactions                                                       */
/* ------------------------------------------------------------------ */
const transactions: LocalizedContent = {
  fr: {
    steps: [
      {
        anchor: "header",
        title: "Toutes tes opérations",
        body: "La liste filtrable par type, période et enveloppe.",
      },
      {
        anchor: "quickAdd",
        title: "Saisie rapide",
        body: "Ajoute un revenu ou une dépense : montant, catégorie, date, note.",
        hint: "La catégorie détermine dans quelle enveloppe la dépense est comptée.",
      },
      {
        anchor: "rowActions",
        title: "Modifier une ligne",
        body: "Sur chaque opération : modifier le montant ou la catégorie, ou supprimer.",
      },
      {
        anchor: "history",
        title: "Historique et anomalies",
        body: "Retrouve les doublons de salaire et les revenus manquants sur la période active.",
        hint: "Un salaire déclaré deux fois fausse ton cash disponible.",
      },
    ],
  },
  en: {
    steps: [
      {
        anchor: "header",
        title: "All your transactions",
        body: "The list, filterable by type, period and envelope.",
      },
      {
        anchor: "quickAdd",
        title: "Quick entry",
        body: "Add income or an expense: amount, category, date, note.",
        hint: "The category decides which envelope the expense lands in.",
      },
      {
        anchor: "rowActions",
        title: "Edit a row",
        body: "On each transaction: change the amount or category, or delete it.",
      },
      {
        anchor: "history",
        title: "History and anomalies",
        body: "Spot duplicate salaries and missing income for the active period.",
        hint: "A salary entered twice throws off your available cash.",
      },
    ],
  },
  ar: {
    steps: [
      {
        anchor: "header",
        title: "كل العمليات ديالك",
        body: "اللائحة، تقدر تفلترها حسب النوع، الفترة، والظرف.",
      },
      {
        anchor: "quickAdd",
        title: "تسجيل سريع",
        body: "زيد دخل ولا مصروف: المبلغ، الصنف، التاريخ، وملاحظة.",
        hint: "الصنف هو اللي كيقرّر فأي ظرف كيتحسب المصروف.",
      },
      {
        anchor: "rowActions",
        title: "تعديل سطر",
        body: "فكل عملية: بدّل المبلغ ولا الصنف، ولا مسح.",
      },
      {
        anchor: "history",
        title: "التاريخ والحالات الشاذة",
        body: "لقا السالاير المكرّر والدخل الناقص فالفترة النشيطة.",
        hint: "السالاير مسجّل مرتين كيخرّب الكاش المتوفر ديالك.",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Envelopes                                                          */
/* ------------------------------------------------------------------ */
const envelopes: LocalizedContent = {
  fr: {
    steps: [
      {
        anchor: "overview",
        title: "Tes enveloppes",
        body: "Chaque enveloppe est un budget dédié : loyer, courses, loisirs…",
      },
      {
        anchor: "balances",
        title: "Solde et report",
        body: "Le restant de chaque enveloppe, et l'option de report du solde vers la période suivante.",
        hint: "Le report est verrouillé sur les enveloppes de dette et de crédit.",
      },
      {
        anchor: "create",
        title: "Créer une enveloppe",
        body: "Ajoute une enveloppe pour isoler un nouveau poste de dépense.",
      },
      {
        anchor: "advanced",
        title: "Ajout groupé",
        body: "Des modèles d'enveloppes prêts à l'emploi, ou une liste rapide à saisir d'un coup.",
      },
    ],
  },
  en: {
    steps: [
      {
        anchor: "overview",
        title: "Your envelopes",
        body: "Each envelope is a dedicated budget: rent, groceries, leisure…",
      },
      {
        anchor: "balances",
        title: "Balance and rollover",
        body: "Each envelope's remaining amount, and the option to roll its balance into the next period.",
        hint: "Rollover is locked on debt and credit envelopes.",
      },
      {
        anchor: "create",
        title: "Create an envelope",
        body: "Add an envelope to isolate a new spending line.",
      },
      {
        anchor: "advanced",
        title: "Bulk add",
        body: "Ready-made envelope templates, or a quick list to enter several at once.",
      },
    ],
  },
  ar: {
    steps: [
      {
        anchor: "overview",
        title: "الأظرفة ديالك",
        body: "كل ظرف هو ميزانية مخصّصة: الكرا، الگّوطة، الترفيه…",
      },
      {
        anchor: "balances",
        title: "الرصيد والترحيل",
        body: "الباقي فكل ظرف، وخيار ترحيل الرصيد للفترة الجاية.",
        hint: "الترحيل مقفول على أظرفة الديون والقروض.",
      },
      {
        anchor: "create",
        title: "زيد ظرف",
        body: "زيد ظرف باش تعزل باب صرف جديد.",
      },
      {
        anchor: "advanced",
        title: "إضافة بالجملة",
        body: "نماذج أظرفة جاهزة، ولا لائحة سريعة تعمّرها مرة وحدة.",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Regulation (unlinked categories)                                   */
/* ------------------------------------------------------------------ */
const regulation: LocalizedContent = {
  fr: {
    intro: {
      eyebrow: "Une étape avant le tableau de bord",
      title: "Pourquoi cette page ?",
      description:
        "Des catégories ne sont reliées à aucune enveloppe. Sans ce lien, tes dépenses ne peuvent pas être classées.",
      bullets: [
        "Choisis une enveloppe pour chaque catégorie de la liste.",
        "Utilise le rattachement automatique, puis ajuste si besoin.",
        "Valide : le tableau de bord se débloque aussitôt.",
      ],
    },
    steps: [
      {
        anchor: "list",
        title: "Relier les catégories",
        body: "Pour chaque catégorie, choisis l'enveloppe où ses dépenses seront comptées.",
        hint: "Sans rattachement, tes rapports restent incomplets.",
      },
      {
        anchor: "actions",
        title: "Rattachement automatique",
        body: "Propose un rattachement pour toutes les catégories d'un coup ; tu peux corriger ensuite.",
      },
      {
        anchor: "validate",
        title: "Valider",
        body: "Quand toutes les catégories sont reliées, confirme pour débloquer le tableau de bord.",
      },
    ],
  },
  en: {
    intro: {
      eyebrow: "One step before the dashboard",
      title: "Why this page?",
      description:
        "Some categories aren't linked to any envelope. Without that link, your spending can't be classified.",
      bullets: [
        "Pick an envelope for every category in the list.",
        "Use automatic linking, then adjust if needed.",
        "Confirm: the dashboard unlocks right away.",
      ],
    },
    steps: [
      {
        anchor: "list",
        title: "Link the categories",
        body: "For each category, pick the envelope its spending will count against.",
        hint: "Without linking, your reports stay incomplete.",
      },
      {
        anchor: "actions",
        title: "Automatic linking",
        body: "Suggest a link for every category at once; you can fix any of them afterwards.",
      },
      {
        anchor: "validate",
        title: "Confirm",
        body: "Once every category is linked, confirm to unlock the dashboard.",
      },
    ],
  },
  ar: {
    intro: {
      eyebrow: "خطوة قبل لوحة القيادة",
      title: "علاش هاد الصفحة؟",
      description:
        "كاين أصناف ما مربوطين بحتى ظرف. بلا هاد الربط، المصاريف ديالك ما يمكنش تّصنّف.",
      bullets: [
        "ختار ظرف لكل صنف فاللائحة.",
        "استعمل الربط التلقائي، من بعد صحّح إلا خاص.",
        "أكّد: لوحة القيادة كتّحل دغيا.",
      ],
    },
    steps: [
      {
        anchor: "list",
        title: "ربط الأصناف",
        body: "لكل صنف، ختار الظرف اللي غادي تتحسب فيه مصاريفو.",
        hint: "بلا ربط، التقارير ديالك كتبقى ناقصة.",
      },
      {
        anchor: "actions",
        title: "الربط التلقائي",
        body: "كيقترح ربط لجميع الأصناف مرة وحدة؛ تقدر تصحّح من بعد.",
      },
      {
        anchor: "validate",
        title: "التأكيد",
        body: "ملّي كل الأصناف يّربطو، أكّد باش تّحل لوحة القيادة.",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Reports                                                            */
/* ------------------------------------------------------------------ */
const reports: LocalizedContent = {
  fr: {
    steps: [
      {
        anchor: "filters",
        title: "Période et vue",
        body: "Choisis la plage de dates, l'enveloppe et le type d'analyse.",
      },
      {
        anchor: "kpis",
        title: "Indicateurs clés",
        body: "Revenus, dépenses, net et taux d'épargne sur la plage choisie.",
      },
      {
        anchor: "charts",
        title: "Graphiques",
        body: "Répartition par enveloppe, tendance du net et historique des balayages.",
        hint: "Il faut quelques semaines de données pour des tendances lisibles.",
      },
      {
        anchor: "export",
        title: "Exporter",
        body: "Télécharge en CSV ou imprime en PDF pour partager ou archiver.",
      },
    ],
  },
  en: {
    steps: [
      {
        anchor: "filters",
        title: "Period and view",
        body: "Pick the date range, the envelope and the type of analysis.",
      },
      {
        anchor: "kpis",
        title: "Key indicators",
        body: "Income, spending, net and savings rate over the chosen range.",
      },
      {
        anchor: "charts",
        title: "Charts",
        body: "Breakdown by envelope, net trend and sweep history.",
        hint: "Trends need a few weeks of data to read well.",
      },
      {
        anchor: "export",
        title: "Export",
        body: "Download as CSV or print to PDF to share or archive.",
      },
    ],
  },
  ar: {
    steps: [
      {
        anchor: "filters",
        title: "الفترة والعرض",
        body: "ختار مجال التواريخ، الظرف، ونوع التحليل.",
      },
      {
        anchor: "kpis",
        title: "المؤشرات الأساسية",
        body: "الدخل، المصاريف، الصافي، ونسبة الادخار على المجال المختار.",
      },
      {
        anchor: "charts",
        title: "الرسوم البيانية",
        body: "التوزيع حسب الظرف، تطوّر الصافي، وتاريخ عمليات البلياج.",
        hint: "خاص شي أسابيع ديال المعطيات باش الاتجاهات تبان واضحة.",
      },
      {
        anchor: "export",
        title: "التصدير",
        body: "حمّل CSV ولا اطبع PDF باش تشارك ولا تأرشف.",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */
const settings: LocalizedContent = {
  fr: {
    steps: [
      {
        anchor: "profile",
        title: "Profil",
        body: "Nom, date de naissance, ville et pseudo public du classement.",
      },
      {
        anchor: "preferences",
        title: "Préférences",
        body: "Devise, intervalle de balayage automatique et réglages de base.",
        hint: "Le balayage transfère automatiquement le surplus des enveloppes.",
      },
      {
        anchor: "theme",
        title: "Thème",
        body: "Clair ou sombre. Le choix est mémorisé sur cet appareil.",
      },
      {
        anchor: "export",
        title: "Export des données",
        body: "Télécharge toutes tes données en JSON ou CSV pour sauvegarde.",
      },
      {
        anchor: "danger",
        title: "Zone sensible",
        body: "Réinitialiser les données ou supprimer le compte — actions irréversibles.",
      },
    ],
  },
  en: {
    steps: [
      {
        anchor: "profile",
        title: "Profile",
        body: "Name, date of birth, city and public leaderboard nickname.",
      },
      {
        anchor: "preferences",
        title: "Preferences",
        body: "Currency, automatic sweep interval and base settings.",
        hint: "The sweep automatically moves leftover money out of envelopes.",
      },
      {
        anchor: "theme",
        title: "Theme",
        body: "Light or dark. The choice is remembered on this device.",
      },
      {
        anchor: "export",
        title: "Data export",
        body: "Download all your data as JSON or CSV for backup.",
      },
      {
        anchor: "danger",
        title: "Danger zone",
        body: "Reset your data or delete the account — irreversible actions.",
      },
    ],
  },
  ar: {
    steps: [
      {
        anchor: "profile",
        title: "البروفيل",
        body: "الاسم، تاريخ الازدياد، المدينة، والاسم المستعار العمومي ديال الترتيب.",
      },
      {
        anchor: "preferences",
        title: "التفضيلات",
        body: "العملة، مدة البلياج التلقائي، والإعدادات الأساسية.",
        hint: "البلياج كينقل أوتوماتيكياً الفائض من الأظرفة.",
      },
      {
        anchor: "theme",
        title: "المظهر",
        body: "فاتح ولا غامق. الاختيار كيتسجّل فهاد الجهاز.",
      },
      {
        anchor: "export",
        title: "تصدير المعطيات",
        body: "حمّل جميع المعطيات ديالك بصيغة JSON ولا CSV باش تحتافظ بيها.",
      },
      {
        anchor: "danger",
        title: "المنطقة الحسّاسة",
        body: "إعادة تعيين المعطيات ولا حذف الحساب — إجراءات ما كترجعش.",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Distribution (money plan)                                          */
/* ------------------------------------------------------------------ */
const distribution: LocalizedContent = {
  fr: {
    intro: {
      eyebrow: "Guide 7sabek",
      title: "Répartir tes revenus",
      description:
        "La répartition découpe automatiquement chaque revenu entre tes enveloppes, selon tes règles.",
      bullets: [
        "Déclare un revenu : il est réparti immédiatement.",
        "Le plan fixe la part de chaque enveloppe (montant ou pourcentage).",
        "Les règles intelligentes ajustent le reste selon tes priorités.",
      ],
    },
    steps: [
      {
        anchor: "income",
        title: "Déclarer un revenu",
        body: "Chaque revenu déclaré ici est aussitôt réparti selon ton plan.",
      },
      {
        anchor: "plan",
        title: "Ton plan de répartition",
        body: "Chaque enveloppe reçoit une part fixe ou un pourcentage ; les règles de priorité placent le reste.",
        hint: "Modifiable à tout moment, sans toucher aux périodes passées.",
      },
    ],
  },
  en: {
    intro: {
      eyebrow: "7sabek guide",
      title: "Distribute your income",
      description:
        "Distribution automatically splits every income across your envelopes, following your rules.",
      bullets: [
        "Log an income: it's split right away.",
        "The plan sets each envelope's share (amount or percentage).",
        "Smart rules allocate the rest by your priorities.",
      ],
    },
    steps: [
      {
        anchor: "income",
        title: "Log an income",
        body: "Every income logged here is split immediately according to your plan.",
      },
      {
        anchor: "plan",
        title: "Your distribution plan",
        body: "Each envelope gets a fixed amount or a percentage; priority rules place the rest.",
        hint: "Editable anytime, without touching past periods.",
      },
    ],
  },
  ar: {
    intro: {
      eyebrow: "دليل 7سابك",
      title: "وزّع الدخل ديالك",
      description:
        "التوزيع كيقسم أوتوماتيكياً كل دخل على الأظرفة ديالك، حسب القواعد ديالك.",
      bullets: [
        "صرّح بدخل: كيتقسم دغيا.",
        "الخطة كتحدّد الحصة ديال كل ظرف (مبلغ ولا نسبة).",
        "القواعد الذكية كتوزّع الباقي حسب الأولويات ديالك.",
      ],
    },
    steps: [
      {
        anchor: "income",
        title: "صرّح بدخل",
        body: "كل دخل كتصرّح بيه هنا كيتقسم دغيا حسب الخطة ديالك.",
      },
      {
        anchor: "plan",
        title: "خطة التوزيع ديالك",
        body: "كل ظرف كياخد مبلغ ثابت ولا نسبة؛ قواعد الأولوية كتقسّم الباقي.",
        hint: "تقدر تبدّلها فأي وقت، بلا ما تمسّ الفترات اللّي فاتو.",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Goals                                                              */
/* ------------------------------------------------------------------ */
const goals: LocalizedContent = {
  fr: {
    steps: [
      {
        anchor: "overview",
        title: "Vue d'ensemble",
        body: "Le nombre d'objectifs actifs et ta progression totale (épargné / cible).",
      },
      {
        anchor: "goal",
        title: "Un objectif",
        body: "Objectif d'épargne (un projet) ou fonds dédié (une dépense prévue, comme les impôts) ; chacun a une priorité et une contribution automatique.",
        hint: "La barre de progression = solde actuel ÷ montant cible.",
      },
      {
        anchor: "distribute",
        title: "Distribuer maintenant",
        body: "Alimente les objectifs depuis ton surplus, dans l'ordre des priorités.",
      },
    ],
  },
  en: {
    steps: [
      {
        anchor: "overview",
        title: "Overview",
        body: "The number of active goals and your total progress (saved / target).",
      },
      {
        anchor: "goal",
        title: "A goal",
        body: "Savings goal (a project) or sinking fund (a planned expense, like taxes); each has a priority and an automatic contribution.",
        hint: "The progress bar = current balance ÷ target amount.",
      },
      {
        anchor: "distribute",
        title: "Distribute now",
        body: "Feed your goals from your surplus, in priority order.",
      },
    ],
  },
  ar: {
    steps: [
      {
        anchor: "overview",
        title: "نظرة عامة",
        body: "عدد الأهداف النشيطة والتقدّم الإجمالي ديالك (المدّخر / الهدف).",
      },
      {
        anchor: "goal",
        title: "هدف",
        body: "هدف ادخار (مشروع) ولا صندوق مخصّص (مصروف متوقّع، بحال الضرائب)؛ كل واحد عندو أولوية ومساهمة تلقائية.",
        hint: "شريط التقدّم = الرصيد الحالي ÷ المبلغ المستهدف.",
      },
      {
        anchor: "distribute",
        title: "وزّع دابا",
        body: "عمّر الأهداف من الفائض ديالك، حسب ترتيب الأولويات.",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Debts & Salaf                                                      */
/* ------------------------------------------------------------------ */
const debts: LocalizedContent = {
  fr: {
    steps: [
      {
        anchor: "cockpit",
        title: "Tes totaux",
        body: "À récupérer (on te doit), à rembourser (tu dois), et le solde net entre les deux.",
      },
      {
        anchor: "filters",
        title: "Filtrer",
        body: "Toutes, prêtées, empruntées, ou déjà soldées.",
      },
      {
        anchor: "card",
        title: "Une dette",
        body: "Enregistre chaque remboursement partiel : le restant se met à jour.",
        hint: "Une dette soldée sort automatiquement de la liste active.",
      },
      {
        anchor: "whatsapp",
        title: "Rappel WhatsApp",
        body: "Envoie un message de rappel prérédigé à la personne concernée.",
        hint: "Nécessite le numéro de téléphone du contact.",
      },
    ],
  },
  en: {
    steps: [
      {
        anchor: "cockpit",
        title: "Your totals",
        body: "To collect (owed to you), to repay (you owe), and the net balance between them.",
      },
      {
        anchor: "filters",
        title: "Filter",
        body: "All, lent, borrowed, or already settled.",
      },
      {
        anchor: "card",
        title: "A debt",
        body: "Record each partial repayment: the remaining amount updates.",
        hint: "A settled debt drops out of the active list automatically.",
      },
      {
        anchor: "whatsapp",
        title: "WhatsApp reminder",
        body: "Send a pre-written reminder message to the person involved.",
        hint: "Needs the contact's phone number.",
      },
    ],
  },
  ar: {
    steps: [
      {
        anchor: "cockpit",
        title: "المجاميع ديالك",
        body: "اللّي خاصك تسال (كيسالوك)، اللّي خاصك تخلّص (كتسال)، والصافي بيناتهم.",
      },
      {
        anchor: "filters",
        title: "الفلترة",
        body: "الكل، اللّي سلّفتي، اللّي تسلّفتي، ولا اللّي تخلّصات.",
      },
      {
        anchor: "card",
        title: "دين",
        body: "سجّل كل خلاص جزئي: الباقي كيتحيّن.",
        hint: "الدين اللّي تخلّص كيخرج أوتوماتيكياً من اللائحة النشيطة.",
      },
      {
        anchor: "whatsapp",
        title: "تذكير واتساب",
        body: "صيفط رسالة تذكير مكتوبة مسبقاً للشخص المعني.",
        hint: "خاص رقم الهاتف ديال الشخص.",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Aide (help center)                                                 */
/* ------------------------------------------------------------------ */
const aide: LocalizedContent = {
  fr: {
    steps: [
      {
        anchor: "banner",
        title: "Guide de référence",
        body: "Une explication détaillée pour chaque écran de l'application.",
      },
      {
        anchor: "nav",
        title: "Sommaire",
        body: "Saute directement à la section qui t'intéresse ; les sections s'ouvrent une par une.",
      },
    ],
  },
  en: {
    steps: [
      {
        anchor: "banner",
        title: "Reference guide",
        body: "A detailed explanation for every screen in the app.",
      },
      {
        anchor: "nav",
        title: "Table of contents",
        body: "Jump straight to the section you need; sections open one at a time.",
      },
    ],
  },
  ar: {
    steps: [
      {
        anchor: "banner",
        title: "دليل مرجعي",
        body: "شرح مفصّل لكل شاشة فالتطبيق.",
      },
      {
        anchor: "nav",
        title: "الفهرس",
        body: "نقز مباشرة للقسم اللّي بغيتي؛ الأقسام كتّحل وحدة بوحدة.",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */

export const TOUR_CONTENT: Record<TourPageId, LocalizedContent> = {
  dashboard,
  transactions,
  envelopes,
  regulation,
  reports,
  settings,
  distribution,
  goals,
  debts,
  aide,
};

export const getTourContent = (
  pageId: TourPageId,
  locale: FloussyLocale
): TourPageContent => TOUR_CONTENT[pageId][locale] ?? TOUR_CONTENT[pageId].fr;
