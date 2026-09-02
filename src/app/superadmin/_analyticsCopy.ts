import type { FloussyLocale } from "@/lib/localePreference";

type Section =
  | "acquisition"
  | "growth"
  | "activation"
  | "engagement"
  | "finance"
  | "product"
  | "system"
  | "security";

export type AnalyticsCopy = {
  locale: string;
  pageTitle: string;
  pageSubtitle: string;
  kicker: string;
  back: string;
  openFull: string;
  openFullHint: string;
  sections: Record<Section, string>;
  range: { d7: string; d30: string; d90: string; m12: string };
  v: {
    on: string;
    off: string;
    success: string;
    failed: string;
    income: string;
    expense: string;
    external: string;
    internal: string;
    complete: string;
    incomplete: string;
    unknown: string;
    converted: string;
    captured: string;
    partial: string;
    dismissed: string;
    count: string;
    total: string;
  };
  c: Record<string, string>;
};

const build = (
  locale: string,
  t: {
    pageTitle: string;
    pageSubtitle: string;
    kicker: string;
    back: string;
    openFull: string;
    openFullHint: string;
    sections: Record<Section, string>;
    range: { d7: string; d30: string; d90: string; m12: string };
    v: AnalyticsCopy["v"];
    c: Record<string, string>;
  }
): AnalyticsCopy => ({ locale, ...t });

const fr = build("fr-FR", {
  pageTitle: "Analytics plateforme — vue complète",
  pageSubtitle:
    "Toutes les métriques de suivi de 7sabek, alimentées uniquement par des données réelles.",
  kicker: "Suivi complet",
  back: "Retour au dashboard",
  openFull: "Ouvrir l’analytics complète",
  openFullHint: "Tous les graphiques de suivi de la plateforme",
  sections: {
    acquisition: "Acquisition & trafic",
    growth: "Croissance des comptes",
    activation: "Activation & onboarding",
    engagement: "Engagement & rétention",
    finance: "Finance plateforme",
    product: "Comportement produit",
    system: "Système, emails & backups",
    security: "Activité admin & sécurité",
  },
  range: { d7: "7j", d30: "30j", d90: "90j", m12: "12m" },
  v: {
    on: "Activé",
    off: "Désactivé",
    success: "Succès",
    failed: "Échec",
    income: "Revenus",
    expense: "Dépenses",
    external: "Externe",
    internal: "Interne",
    complete: "Terminé",
    incomplete: "Incomplet",
    unknown: "Inconnu",
    converted: "Convertis",
    captured: "Email capturé",
    partial: "Partiel",
    dismissed: "Abandonnés",
    count: "Nombre",
    total: "Total",
  },
  c: {
    visitsDaily: "Visites par jour",
    trafficSources: "Sources de trafic",
    extVsInt: "Trafic externe vs interne",
    leads: "Leads d’inscription",
    leadConv: "Conversion des leads",
    signupsDaily: "Inscriptions par jour",
    cumulativeUsers: "Comptes cumulés",
    signups7v7: "Inscriptions 7j vs 7j précédents",
    roles: "Répartition des rôles",
    byCountry: "Comptes par pays",
    byCity: "Comptes par ville",
    funnel: "Funnel d’activation",
    daysToFirstTx: "Délai avant 1ʳᵉ transaction",
    onboardingState: "État de l’onboarding",
    obStage: "Onboarding par étape atteinte",
    obObjective: "Objectif principal déclaré",
    obIncomeType: "Type de revenu déclaré",
    obHousehold: "Type de foyer déclaré",
    wau: "Utilisateurs actifs par semaine",
    activeRatio: "Part d’actifs sur le total",
    inactivity: "Inactivité (dernière transaction)",
    stickiness: "Stickiness (actifs / total)",
    neverActive: "Comptes jamais actifs",
    incVsExpDaily: "Revenus vs dépenses par jour",
    netDaily: "Solde net quotidien",
    netCumulative: "Solde net cumulé",
    incVsExpMonthly: "Revenus vs dépenses par mois",
    txVolume: "Volume de transactions par jour",
    txMix: "Répartition entrées / sorties",
    topCategories: "Top catégories de dépense",
    topEnvelopes: "Top enveloppes",
    avgTicket: "Montant moyen par transaction",
    rollover: "Report d’enveloppe",
    currencies: "Devise des comptes",
    sweepInterval: "Intervalle de sweep (jours)",
    avgEnvCat: "Enveloppes & catégories par compte",
    upcomingSweeps: "Sweeps prévus (14 jours)",
    emailQueue: "File d’envoi email",
    emailDeliveries: "Livraisons email (cumul)",
    backupDuration: "Durée des backups",
    backupStatus: "Statut des backups",
    backupAge: "Âge du dernier backup",
    sessions: "Sessions superadmin actives",
    actionsByType: "Actions admin par type",
    actionsByStatus: "Actions admin par statut",
    actionsDaily: "Actions admin par jour",
    accountFlags: "Comptes à statut particulier",
    resetRequests: "Demandes de réinitialisation",
    contactDaily: "Messages de contact par jour",
  },
});

const en = build("en-CA", {
  pageTitle: "Platform analytics — full view",
  pageSubtitle:
    "Every 7sabek monitoring metric, fed only by real data.",
  kicker: "Full monitoring",
  back: "Back to dashboard",
  openFull: "Open full analytics",
  openFullHint: "Every platform monitoring chart",
  sections: {
    acquisition: "Acquisition & traffic",
    growth: "Account growth",
    activation: "Activation & onboarding",
    engagement: "Engagement & retention",
    finance: "Platform finance",
    product: "Product behaviour",
    system: "System, email & backups",
    security: "Admin activity & security",
  },
  range: { d7: "7d", d30: "30d", d90: "90d", m12: "12m" },
  v: {
    on: "On",
    off: "Off",
    success: "Success",
    failed: "Failed",
    income: "Income",
    expense: "Expense",
    external: "External",
    internal: "Internal",
    complete: "Complete",
    incomplete: "Incomplete",
    unknown: "Unknown",
    converted: "Converted",
    captured: "Email captured",
    partial: "Partial",
    dismissed: "Dismissed",
    count: "Count",
    total: "Total",
  },
  c: {
    visitsDaily: "Visits per day",
    trafficSources: "Traffic sources",
    extVsInt: "External vs internal traffic",
    leads: "Registration leads",
    leadConv: "Lead conversion",
    signupsDaily: "Signups per day",
    cumulativeUsers: "Cumulative accounts",
    signups7v7: "Signups last 7d vs previous 7d",
    roles: "Role breakdown",
    byCountry: "Accounts by country",
    byCity: "Accounts by city",
    funnel: "Activation funnel",
    daysToFirstTx: "Days to first transaction",
    onboardingState: "Onboarding state",
    obStage: "Onboarding by stage reached",
    obObjective: "Primary objective declared",
    obIncomeType: "Declared income type",
    obHousehold: "Declared household type",
    wau: "Weekly active users",
    activeRatio: "Active share of total",
    inactivity: "Inactivity (last transaction)",
    stickiness: "Stickiness (active / total)",
    neverActive: "Never-active accounts",
    incVsExpDaily: "Income vs expense per day",
    netDaily: "Daily net balance",
    netCumulative: "Cumulative net balance",
    incVsExpMonthly: "Income vs expense per month",
    txVolume: "Transaction volume per day",
    txMix: "Inflow / outflow split",
    topCategories: "Top expense categories",
    topEnvelopes: "Top envelopes",
    avgTicket: "Average amount per transaction",
    rollover: "Envelope rollover",
    currencies: "Account currency",
    sweepInterval: "Sweep interval (days)",
    avgEnvCat: "Envelopes & categories per account",
    upcomingSweeps: "Scheduled sweeps (14 days)",
    emailQueue: "Email delivery queue",
    emailDeliveries: "Email deliveries (cumulative)",
    backupDuration: "Backup duration",
    backupStatus: "Backup status",
    backupAge: "Last backup age",
    sessions: "Active superadmin sessions",
    actionsByType: "Admin actions by type",
    actionsByStatus: "Admin actions by status",
    actionsDaily: "Admin actions per day",
    accountFlags: "Flagged accounts",
    resetRequests: "Password reset requests",
    contactDaily: "Contact messages per day",
  },
});

const ar = build("ar-MA", {
  pageTitle: "تحليلات المنصة — العرض الكامل",
  pageSubtitle: "جميع مؤشرات متابعة 7sabek، مبنية فقط على بيانات حقيقية.",
  kicker: "متابعة كاملة",
  back: "الرجوع للوحة القيادة",
  openFull: "افتح التحليلات الكاملة",
  openFullHint: "جميع رسوم متابعة المنصة",
  sections: {
    acquisition: "الاكتساب والزيارات",
    growth: "نمو الحسابات",
    activation: "التفعيل والأونبوردينغ",
    engagement: "التفاعل والاحتفاظ",
    finance: "مالية المنصة",
    product: "سلوك المنتج",
    system: "النظام، الإيميلات والنسخ الاحتياطية",
    security: "نشاط الأدمين والأمان",
  },
  range: { d7: "7ي", d30: "30ي", d90: "90ي", m12: "12ش" },
  v: {
    on: "مفعّل",
    off: "مطفّى",
    success: "نجاح",
    failed: "فشل",
    income: "مداخيل",
    expense: "مصاريف",
    external: "خارجي",
    internal: "داخلي",
    complete: "مكمّل",
    incomplete: "ناقص",
    unknown: "غير معروف",
    converted: "تحوّلو",
    captured: "الإيميل متسجّل",
    partial: "جزئي",
    dismissed: "متخلاو",
    count: "العدد",
    total: "المجموع",
  },
  c: {
    visitsDaily: "الزيارات كل نهار",
    trafficSources: "مصادر الزيارات",
    extVsInt: "زيارات خارجية مقابل داخلية",
    leads: "ليدات التسجيل",
    leadConv: "تحويل الليدات",
    signupsDaily: "التسجيلات كل نهار",
    cumulativeUsers: "الحسابات التراكمية",
    signups7v7: "تسجيلات 7 أيام مقابل 7 السابقة",
    roles: "توزيع الأدوار",
    byCountry: "الحسابات حسب البلد",
    byCity: "الحسابات حسب المدينة",
    funnel: "قمع التفعيل",
    daysToFirstTx: "الأيام قبل أول معاملة",
    onboardingState: "حالة الأونبوردينغ",
    obStage: "الأونبوردينغ حسب المرحلة",
    obObjective: "الهدف الرئيسي المصرّح",
    obIncomeType: "نوع الدخل المصرّح",
    obHousehold: "نوع الأسرة المصرّح",
    wau: "المستخدمين النشطين كل أسبوع",
    activeRatio: "نسبة النشطين من المجموع",
    inactivity: "الخمول (آخر معاملة)",
    stickiness: "الالتصاق (نشطين / المجموع)",
    neverActive: "حسابات ما نشطاتش أبداً",
    incVsExpDaily: "مداخيل مقابل مصاريف كل نهار",
    netDaily: "الرصيد الصافي اليومي",
    netCumulative: "الرصيد الصافي التراكمي",
    incVsExpMonthly: "مداخيل مقابل مصاريف كل شهر",
    txVolume: "حجم المعاملات كل نهار",
    txMix: "توزيع الداخل / الخارج",
    topCategories: "أهم فئات المصاريف",
    topEnvelopes: "أهم الأظرفة",
    avgTicket: "متوسط المبلغ لكل معاملة",
    rollover: "ترحيل الظرف",
    currencies: "عملة الحسابات",
    sweepInterval: "مدة السويب (أيام)",
    avgEnvCat: "الأظرفة والفئات لكل حساب",
    upcomingSweeps: "السويبات المبرمجة (14 يوم)",
    emailQueue: "طابور إرسال الإيميل",
    emailDeliveries: "إرسالات الإيميل (تراكمي)",
    backupDuration: "مدة النسخ الاحتياطية",
    backupStatus: "حالة النسخ الاحتياطية",
    backupAge: "قدم آخر نسخة احتياطية",
    sessions: "سيسيونات سوبر أدمين نشطة",
    actionsByType: "إجراءات الأدمين حسب النوع",
    actionsByStatus: "إجراءات الأدمين حسب الحالة",
    actionsDaily: "إجراءات الأدمين كل نهار",
    accountFlags: "حسابات بحالة خاصة",
    resetRequests: "طلبات إعادة التعيين",
    contactDaily: "رسائل الاتصال كل نهار",
  },
});

export const ANALYTICS_COPY: Record<FloussyLocale, AnalyticsCopy> = { fr, en, ar };
