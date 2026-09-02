import type { FloussyLocale } from "@/lib/localePreference";

export type DashboardCopy = {
  locale: string;
  kicker: string;
  title: string;
  subtitle: string;

  health: {
    title: string;
    api: string;
    lastBackup: string;
    emailQueue: string;
    emailFailed: string;
    unknown: string;
    operational: string;
    degraded: string;
    ago: (value: string) => string;
  };

  kpi: {
    users: string;
    activeUsers: string;
    transactions: string;
    activationRate: string;
    volume: string;
    last7d: string;
    last30d: string;
    allTime: string;
    vsPrev: string;
  };

  finance: {
    title: string;
    subtitle: string;
    tabAmount: string;
    tabCount: string;
    ranges: { d7: string; d30: string; d90: string; m12: string };
    cumulative: string;
    income: string;
    expense: string;
    net: string;
    txTotal: string;
    txIncome: string;
    txExpense: string;
  };

  acquisition: {
    title: string;
    subtitle: string;
    visits: string;
    vsPrevPeriod: string;
    sourceDirect: string;
    sourceReferral: string;
    sourceOrganic: string;
    sourceInternal: string;
  };

  users: {
    title: string;
    growthTitle: string;
    growthSub: string;
    wauTitle: string;
    wauSub: string;
    funnelTitle: string;
    funnelSub: string;
    stepSignup: string;
    stepEnvelopes: string;
    stepCategories: string;
    stepTransactions: string;
    avgDaysToFirstTx: string;
    days: string;
    churnTitle: string;
    churnSub: string;
  };

  segments: {
    title: string;
    subtitle: string;
    total: string;
    standard: string;
    user: string;
    beta: string;
    superadmin: string;
    suspended: string;
    onboardingIncomplete: string;
  };

  risk: {
    title: string;
    subtitle: string;
    empty: string;
    reasonNoOnboarding: string;
    reasonSuspended: string;
    reasonMustReset: string;
    open: string;
  };

  quality: {
    title: string;
    mappingCoverage: string;
    unmappedExpenses: string;
    topCategories: string;
    topEnvelopes: string;
    rollover: string;
    rolloverOn: string;
    rolloverOff: string;
  };

  activity: {
    title: string;
    subtitle: string;
    autoRefresh: string;
    empty: string;
    systemAdmin: string;
    viewAll: string;
  };

  state: {
    loading: string;
    empty: string;
    error: string;
    retry: string;
  };
};

const fr: DashboardCopy = {
  locale: "fr-FR",
  kicker: "Poste de commande",
  title: "Vue globale de la plateforme",
  subtitle: "Santé système, adoption et finances agrégées — en temps quasi réel.",
  health: {
    title: "Santé système",
    api: "API",
    lastBackup: "Dernier backup",
    emailQueue: "File emails",
    emailFailed: "Emails en échec",
    unknown: "n/d",
    operational: "Opérationnel",
    degraded: "Dégradé",
    ago: (value) => `il y a ${value}`,
  },
  kpi: {
    users: "Utilisateurs",
    activeUsers: "Actifs",
    transactions: "Transactions",
    activationRate: "Taux d’activation",
    volume: "Volume",
    last7d: "7 derniers jours",
    last30d: "30 derniers jours",
    allTime: "cumul total",
    vsPrev: "vs période précédente",
  },
  finance: {
    title: "Finance plateforme",
    subtitle: "Flux agrégés de tous les comptes",
    tabAmount: "Montant",
    tabCount: "Nombre",
    ranges: { d7: "7j", d30: "30j", d90: "90j", m12: "12m" },
    cumulative: "Cumul période",
    income: "Revenus",
    expense: "Dépenses",
    net: "Net",
    txTotal: "Total",
    txIncome: "Entrées",
    txExpense: "Sorties",
  },
  acquisition: {
    title: "Acquisition",
    subtitle: "Sources de trafic · 7 derniers jours",
    visits: "visites",
    vsPrevPeriod: "vs période précédente",
    sourceDirect: "Direct",
    sourceReferral: "Referral",
    sourceOrganic: "Organique",
    sourceInternal: "Interne / autres",
  },
  users: {
    title: "Utilisateurs",
    growthTitle: "Croissance",
    growthSub: "Nouveaux comptes · 30 jours",
    wauTitle: "Actifs par semaine",
    wauSub: "Utilisateurs actifs hebdomadaires",
    funnelTitle: "Funnel d’activation",
    funnelSub: "Part des comptes ayant franchi chaque étape",
    stepSignup: "Inscrits",
    stepEnvelopes: "1ʳᵉ enveloppe",
    stepCategories: "1ʳᵉ catégorie",
    stepTransactions: "1ʳᵉ transaction",
    avgDaysToFirstTx: "Délai moyen avant 1ʳᵉ transaction",
    days: "jour(s)",
    churnTitle: "Inactivité",
    churnSub: "Répartition par ancienneté de la dernière transaction",
  },
  segments: {
    title: "Segments de comptes",
    subtitle: "Répartition par statut",
    total: "Total comptes",
    standard: "Standard",
    user: "Standard",
    beta: "Bêta-testeurs",
    superadmin: "Superadmins",
    suspended: "Suspendus",
    onboardingIncomplete: "Onboarding incomplet",
  },
  risk: {
    title: "Comptes à surveiller",
    subtitle: "Onboarding abandonné, suspensions, réinitialisations bloquées",
    empty: "Aucun compte à signaler.",
    reasonNoOnboarding: "Onboarding non terminé",
    reasonSuspended: "Suspendu",
    reasonMustReset: "Réinit. mot de passe requise",
    open: "Ouvrir",
  },
  quality: {
    title: "Qualité des données",
    mappingCoverage: "Couverture mapping (30j)",
    unmappedExpenses: "Dépenses non mappées (30j)",
    topCategories: "Top catégories",
    topEnvelopes: "Top enveloppes",
    rollover: "Report d’enveloppe",
    rolloverOn: "Activé",
    rolloverOff: "Désactivé",
  },
  activity: {
    title: "Journal d’activité",
    subtitle: "Actions administratives système",
    autoRefresh: "Rafraîchissement auto",
    empty: "Aucun log pour le moment.",
    systemAdmin: "Admin système",
    viewAll: "Tout voir",
  },
  state: {
    loading: "Chargement…",
    empty: "Aucune donnée disponible.",
    error: "Impossible de charger ces données.",
    retry: "Réessayer",
  },
};

const en: DashboardCopy = {
  locale: "en-CA",
  kicker: "Command center",
  title: "Platform overview",
  subtitle: "System health, adoption and aggregated finances — near real time.",
  health: {
    title: "System health",
    api: "API",
    lastBackup: "Last backup",
    emailQueue: "Email queue",
    emailFailed: "Failed emails",
    unknown: "n/a",
    operational: "Operational",
    degraded: "Degraded",
    ago: (value) => `${value} ago`,
  },
  kpi: {
    users: "Users",
    activeUsers: "Active",
    transactions: "Transactions",
    activationRate: "Activation rate",
    volume: "Volume",
    last7d: "Last 7 days",
    last30d: "Last 30 days",
    allTime: "all-time total",
    vsPrev: "vs previous period",
  },
  finance: {
    title: "Platform finance",
    subtitle: "Aggregated flows across all accounts",
    tabAmount: "Amount",
    tabCount: "Count",
    ranges: { d7: "7d", d30: "30d", d90: "90d", m12: "12m" },
    cumulative: "Period total",
    income: "Income",
    expense: "Expense",
    net: "Net",
    txTotal: "Total",
    txIncome: "Inflow",
    txExpense: "Outflow",
  },
  acquisition: {
    title: "Acquisition",
    subtitle: "Traffic sources · last 7 days",
    visits: "visits",
    vsPrevPeriod: "vs previous period",
    sourceDirect: "Direct",
    sourceReferral: "Referral",
    sourceOrganic: "Organic",
    sourceInternal: "Internal / other",
  },
  users: {
    title: "Users",
    growthTitle: "Growth",
    growthSub: "New accounts · 30 days",
    wauTitle: "Weekly active",
    wauSub: "Weekly active users",
    funnelTitle: "Activation funnel",
    funnelSub: "Share of accounts reaching each step",
    stepSignup: "Signed up",
    stepEnvelopes: "First envelope",
    stepCategories: "First category",
    stepTransactions: "First transaction",
    avgDaysToFirstTx: "Avg. days to first transaction",
    days: "day(s)",
    churnTitle: "Inactivity",
    churnSub: "Split by age of last transaction",
  },
  segments: {
    title: "Account segments",
    subtitle: "Breakdown by status",
    total: "Total accounts",
    standard: "Standard",
    user: "Standard",
    beta: "Beta testers",
    superadmin: "Superadmins",
    suspended: "Suspended",
    onboardingIncomplete: "Onboarding incomplete",
  },
  risk: {
    title: "Accounts to watch",
    subtitle: "Abandoned onboarding, suspensions, blocked resets",
    empty: "No accounts to flag.",
    reasonNoOnboarding: "Onboarding not completed",
    reasonSuspended: "Suspended",
    reasonMustReset: "Password reset required",
    open: "Open",
  },
  quality: {
    title: "Data quality",
    mappingCoverage: "Mapping coverage (30d)",
    unmappedExpenses: "Unmapped expenses (30d)",
    topCategories: "Top categories",
    topEnvelopes: "Top envelopes",
    rollover: "Envelope rollover",
    rolloverOn: "On",
    rolloverOff: "Off",
  },
  activity: {
    title: "Activity log",
    subtitle: "System administrative actions",
    autoRefresh: "Auto refresh",
    empty: "No logs yet.",
    systemAdmin: "System admin",
    viewAll: "View all",
  },
  state: {
    loading: "Loading…",
    empty: "No data available.",
    error: "Could not load this data.",
    retry: "Retry",
  },
};

const ar: DashboardCopy = {
  locale: "ar-MA",
  kicker: "غرفة التحكم",
  title: "نظرة شاملة على المنصة",
  subtitle: "صحة النظام، الاستعمال والمداخيل المجمّعة — شبه مباشر.",
  health: {
    title: "صحة النظام",
    api: "API",
    lastBackup: "آخر نسخة احتياطية",
    emailQueue: "طابور الإيميلات",
    emailFailed: "إيميلات فاشلة",
    unknown: "غير متاح",
    operational: "خدام مزيان",
    degraded: "فيه مشكل",
    ago: (value) => `قبل ${value}`,
  },
  kpi: {
    users: "المستخدمين",
    activeUsers: "نشطين",
    transactions: "المعاملات",
    activationRate: "نسبة التفعيل",
    volume: "الحجم",
    last7d: "آخر 7 أيام",
    last30d: "آخر 30 يوم",
    allTime: "المجموع الكلي",
    vsPrev: "مقارنة بالفترة السابقة",
  },
  finance: {
    title: "مالية المنصة",
    subtitle: "التدفقات المجمّعة ديال جميع الحسابات",
    tabAmount: "المبلغ",
    tabCount: "العدد",
    ranges: { d7: "7ي", d30: "30ي", d90: "90ي", m12: "12ش" },
    cumulative: "مجموع الفترة",
    income: "مداخيل",
    expense: "مصاريف",
    net: "الصافي",
    txTotal: "المجموع",
    txIncome: "داخل",
    txExpense: "خارج",
  },
  acquisition: {
    title: "الاكتساب",
    subtitle: "مصادر الزيارات · آخر 7 أيام",
    visits: "زيارة",
    vsPrevPeriod: "مقارنة بالفترة السابقة",
    sourceDirect: "مباشر",
    sourceReferral: "إحالة",
    sourceOrganic: "طبيعي",
    sourceInternal: "داخلي / أخرى",
  },
  users: {
    title: "المستخدمين",
    growthTitle: "النمو",
    growthSub: "حسابات جديدة · 30 يوم",
    wauTitle: "النشطين أسبوعياً",
    wauSub: "المستخدمين النشطين كل أسبوع",
    funnelTitle: "قمع التفعيل",
    funnelSub: "نسبة الحسابات اللي وصلات لكل مرحلة",
    stepSignup: "مسجّلين",
    stepEnvelopes: "أول ظرف",
    stepCategories: "أول فئة",
    stepTransactions: "أول معاملة",
    avgDaysToFirstTx: "متوسط الأيام قبل أول معاملة",
    days: "يوم",
    churnTitle: "الخمول",
    churnSub: "التقسيم حسب قدم آخر معاملة",
  },
  segments: {
    title: "شرائح الحسابات",
    subtitle: "التوزيع حسب الحالة",
    total: "مجموع الحسابات",
    standard: "عاديين",
    user: "عاديين",
    beta: "مختبري بيتا",
    superadmin: "سوبر أدمين",
    suspended: "موقّفين",
    onboardingIncomplete: "أونبوردينغ ناقص",
  },
  risk: {
    title: "حسابات خاصها مراقبة",
    subtitle: "أونبوردينغ متسالاش، توقيفات، إعادة تعيين محجوبة",
    empty: "ما كاين حتى حساب باش نشيرو ليه.",
    reasonNoOnboarding: "أونبوردينغ ما تكملاش",
    reasonSuspended: "موقّف",
    reasonMustReset: "خاص إعادة تعيين كلمة السر",
    open: "حل",
  },
  quality: {
    title: "جودة البيانات",
    mappingCoverage: "تغطية الربط (30ي)",
    unmappedExpenses: "مصاريف غير مربوطة (30ي)",
    topCategories: "أهم الفئات",
    topEnvelopes: "أهم الأظرفة",
    rollover: "ترحيل الظرف",
    rolloverOn: "مفعّل",
    rolloverOff: "مطفّى",
  },
  activity: {
    title: "سجل النشاط",
    subtitle: "إجراءات إدارية ديال النظام",
    autoRefresh: "تحديث تلقائي",
    empty: "ما كاين حتى سجل دابا.",
    systemAdmin: "أدمين النظام",
    viewAll: "شوف الكل",
  },
  state: {
    loading: "جاري التحميل…",
    empty: "ما كاينة حتى بيانات.",
    error: "ما قدرناش نحمّلو هاد البيانات.",
    retry: "عاود",
  },
};

export const DASHBOARD_COPY: Record<FloussyLocale, DashboardCopy> = { fr, en, ar };
