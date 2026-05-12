import type { FloussyLocale } from "@/lib/localePreference";

type LocalizedLabel = {
  fr: string;
  en: string;
  ar: string;
};

const CATEGORY_LABELS: Record<string, LocalizedLabel> = {
  rent: { fr: "Loyer", en: "Rent", ar: "الكراء" },
  housing_generic: { fr: "Charges logement", en: "Housing costs", ar: "مصاريف السكن" },
  home_maintenance: { fr: "Entretien maison", en: "Home maintenance", ar: "صيانة الدار" },
  electricity: { fr: "Électricité", en: "Electricity", ar: "الكهرباء" },
  water: { fr: "Eau", en: "Water", ar: "الماء" },
  internet: { fr: "Internet", en: "Internet", ar: "الإنترنت" },
  phone: { fr: "Téléphone", en: "Phone", ar: "التلفون" },
  gas: { fr: "Gaz", en: "Gas", ar: "الغاز" },
  home_insurance: { fr: "Assurance habitation", en: "Home insurance", ar: "تأمين الدار" },
  admin_fees: { fr: "Frais administratifs", en: "Admin fees", ar: "مصاريف إدارية" },
  bills_generic: { fr: "Factures", en: "Bills", ar: "الفواتير" },
  groceries: { fr: "Courses", en: "Groceries", ar: "المأكولات" },
  house_supplies: { fr: "Produits maison", en: "House supplies", ar: "لوازم الدار" },
  restaurants: { fr: "Restaurants", en: "Restaurants", ar: "المطاعم" },
  health_pharmacy: { fr: "Pharmacie", en: "Pharmacy", ar: "الصيدلية" },
  health_consultation: { fr: "Consultation médicale", en: "Medical consultation", ar: "استشارة طبية" },
  health_generic: { fr: "Santé", en: "Health", ar: "الصحة" },
  personal_care: { fr: "Soins personnels", en: "Personal care", ar: "العناية الشخصية" },
  transport_public: { fr: "Transport public", en: "Public transport", ar: "النقل العمومي" },
  transport_taxi: { fr: "Taxi / VTC", en: "Taxi / Ride-hailing", ar: "الطاكسي" },
  transport_fuel: { fr: "Carburant", en: "Fuel", ar: "الوقود" },
  transport_generic: { fr: "Transport", en: "Transport", ar: "النقل" },
  transport_parking: { fr: "Parking", en: "Parking", ar: "الباركينغ" },
  transport_maintenance: { fr: "Entretien véhicule", en: "Vehicle maintenance", ar: "صيانة الطوموبيل" },
  car_insurance: { fr: "Assurance auto", en: "Car insurance", ar: "تأمين الطوموبيل" },
  family_support: { fr: "Aide famille", en: "Family support", ar: "مصروف العائلة" },
  children_school: { fr: "Frais scolaires enfants", en: "Kids school fees", ar: "قراية الدراري" },
  children_activities: { fr: "Activités enfants", en: "Kids activities", ar: "أنشطة الدراري" },
  childcare: { fr: "Garde d'enfants", en: "Childcare", ar: "حضانة الدراري" },
  debt_payment: { fr: "Paiement dette", en: "Debt payment", ar: "خلّاص الدين" },
  debt_extra_payment: {
    fr: "Paiement dette (supplément)",
    en: "Extra debt payment",
    ar: "زيادة فخلصان الدين",
  },
  taxes: { fr: "Taxes", en: "Taxes", ar: "الضرايب" },
  insurance_other: { fr: "Autres assurances", en: "Other insurance", ar: "تأمينات أخرى" },
  shopping: { fr: "Shopping", en: "Shopping", ar: "الشوبينغ" },
  entertainment: { fr: "Loisirs", en: "Entertainment", ar: "الترفيه" },
  miscellaneous: { fr: "Divers", en: "Miscellaneous", ar: "مصاريف متنوعة" },
  subscriptions: { fr: "Abonnements", en: "Subscriptions", ar: "لا بونومون" },
  savings_contribution: { fr: "Épargne", en: "Savings", ar: "الادخار" },
  investment_contribution: { fr: "Investissement", en: "Investment", ar: "الاستثمار" },
  gifts_charity: { fr: "Cadeaux & dons", en: "Gifts & charity", ar: "الهدايا والتبرعات" },
  travel: { fr: "Voyage", en: "Travel", ar: "السفر" },
  business_tools: { fr: "Outils de travail", en: "Work tools", ar: "أدوات الخدمة" },
  business_travel: { fr: "Déplacements pro", en: "Business travel", ar: "تنقلات الخدمة" },
  freelance_expenses: { fr: "Frais freelance", en: "Freelance expenses", ar: "مصاريف الفريلانس" },
  income_general: { fr: "Revenu (interne)", en: "Income (internal)", ar: "دخل (داخلي)" },
};

const INTERNAL_INCOME_KEYS = new Set([
  "income_general",
  "income_salary",
  "income_freelance",
  "income_bonus",
  "income_commission",
  "income_refund",
  "income_other",
]);

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const LEGACY_ALIAS_TO_KEY: Record<string, string> = {
  loyer: "rent",
  rent: "rent",
  الكرا: "rent",
  الكراء: "rent",
  charges: "housing_generic",
  logement: "housing_generic",
  "charges logement": "housing_generic",
  "housing costs": "housing_generic",
  housing: "housing_generic",
  "entretien maison": "home_maintenance",
  electricite: "electricity",
  "électricité": "electricity",
  eau: "water",
  water: "water",
  internet: "internet",
  telephone: "phone",
  "téléphone": "phone",
  gaz: "gas",
  "assurance habitation": "home_insurance",
  factures: "bills_generic",
  facture: "bills_generic",
  bills: "bills_generic",
  utilities: "bills_generic",
  courses: "groceries",
  nourriture: "groceries",
  food: "groceries",
  "produits maison": "house_supplies",
  restaurants: "restaurants",
  pharmacie: "health_pharmacy",
  "consultation médicale": "health_consultation",
  "consultation medicale": "health_consultation",
  doctor: "health_consultation",
  medecin: "health_consultation",
  "médecin": "health_consultation",
  health: "health_generic",
  sante: "health_generic",
  "santé": "health_generic",
  "transport public": "transport_public",
  transport: "transport_generic",
  "transport general": "transport_generic",
  "transport général": "transport_generic",
  fuel: "transport_fuel",
  essence: "transport_fuel",
  taxi: "transport_taxi",
  carburant: "transport_fuel",
  parking: "transport_parking",
  "entretien auto": "transport_maintenance",
  "assurance auto": "car_insurance",
  "credit auto": "debt_payment",
  "crédit auto": "debt_payment",
  "controle technique": "transport_maintenance",
  "contrôle technique": "transport_maintenance",
  "taxe auto": "taxes",
  "carburant 2 roues": "transport_fuel",
  "assurance 2 roues": "car_insurance",
  "entretien 2 roues": "transport_maintenance",
  "aide famille": "family_support",
  "famille — aide": "family_support",
  "activités enfants": "children_activities",
  "activites enfants": "children_activities",
  garde: "childcare",
  credit: "debt_payment",
  "crédit": "debt_payment",
  dettes: "debt_payment",
  "dettes — credit": "debt_payment",
  "dettes - credit": "debt_payment",
  remboursement: "debt_extra_payment",
  "paiement dette": "debt_payment",
  taxes: "taxes",
  impots: "taxes",
  "impôts": "taxes",
  "autres assurances": "insurance_other",
  loisirs: "entertainment",
  divers: "miscellaneous",
  misc: "miscellaneous",
  miscellaneous: "miscellaneous",
  abonnements: "subscriptions",
  epargne: "savings_contribution",
  "épargne": "savings_contribution",
  savings: "savings_contribution",
  investissement: "investment_contribution",
  investment: "investment_contribution",
  cadeaux: "gifts_charity",
  voyage: "travel",
  "outils de travail": "business_tools",
  "déplacements pro": "business_travel",
  "deplacements pro": "business_travel",
  "frais freelance": "freelance_expenses",
  salaire: "income_general",
  revenu: "income_general",
  income: "income_general",
};

Object.entries(CATEGORY_LABELS).forEach(([key, labels]) => {
  LEGACY_ALIAS_TO_KEY[normalize(key)] = key;
  LEGACY_ALIAS_TO_KEY[normalize(labels.fr)] = key;
  LEGACY_ALIAS_TO_KEY[normalize(labels.en)] = key;
  LEGACY_ALIAS_TO_KEY[normalize(labels.ar)] = key;
});

export const getCanonicalCategoryKey = (value: string) => {
  const normalized = normalize(value);
  if (CATEGORY_LABELS[normalized]) return normalized;
  return LEGACY_ALIAS_TO_KEY[normalized] ?? value;
};

export const localizeCategoryName = (value: string, locale: FloussyLocale) => {
  const key = getCanonicalCategoryKey(value);
  return CATEGORY_LABELS[key]?.[locale] ?? value;
};

export const isInternalIncomeCategory = (value: string) => {
  const key = getCanonicalCategoryKey(value);
  return INTERNAL_INCOME_KEYS.has(key);
};

export const isSystemExpenseCategory = (value: string) => {
  const key = getCanonicalCategoryKey(value);
  return Boolean(CATEGORY_LABELS[key]) && !INTERNAL_INCOME_KEYS.has(key);
};
