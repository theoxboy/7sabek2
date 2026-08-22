"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Camera, Eye, EyeOff, Home } from "lucide-react";
import { Cairo, Fraunces, Manrope } from "next/font/google";

import { apiFetch } from "@/lib/api";
import { fetchMe, logout, refreshAuthSession, type AuthUser } from "@/lib/auth";
import { usePlatformStatus } from "@/lib/usePlatformStatus";
import { getVisibleAnnouncements } from "@/lib/announcementVisibility";
import { SystemMessageCard } from "@/components/announcements/SystemMessageCard";
import BrandLogo from "@/components/BrandLogo";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: string;
          size?: string;
        },
      ) => number;
      reset: (widgetId?: number) => void;
    };
    onRecaptchaV2Loaded?: () => void;
  }
}

const displayFont = Fraunces({ subsets: ["latin"], weight: ["600", "700"] });
const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "600"] });
const arabicFont = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"] });

const DEFAULT_SWEEP_INTERVAL_DAYS = 7;
type CurrencyCode = "MAD" | "DZD" | "TND" | "EGP";
const COUNTRY_OPTIONS = [
  { name: "Maroc", code: "ma" },
  { name: "Algérie", code: "dz" },
  { name: "Tunisie", code: "tn" },
  { name: "Égypte", code: "eg" },
] as const;
type CountryName = (typeof COUNTRY_OPTIONS)[number]["name"];
const CURRENCY_BY_COUNTRY: Record<CountryName, CurrencyCode> = {
  Maroc: "MAD",
  Algérie: "DZD",
  Tunisie: "TND",
  Égypte: "EGP",
};

const CITIES_BY_COUNTRY: Record<CountryName, string[]> = {
  Maroc: [
    "Casablanca",
    "Rabat",
    "Marrakech",
    "Fès",
    "Tanger",
    "Agadir",
    "Meknès",
    "Oujda",
    "Kénitra",
    "Tétouan",
    "Safi",
    "El Jadida",
    "Nador",
    "Taza",
    "Khouribga",
    "Béni Mellal",
    "Témara",
    "Mohammédia",
    "Settat",
    "Larache",
    "Khémisset",
    "Berkane",
    "Ouarzazate",
    "Al Hoceïma",
    "Dakhla",
    "Laâyoune",
    "Guelmim",
    "Errachidia",
    "Essaouira",
    "Sidi Kacem",
    "Sidi Slimane",
    "Taroudant",
    "Chefchaouen",
    "Ifrane",
    "Azrou",
    "Ksar El Kebir",
    "Taourirt",
    "Tiznit",
    "Tan-Tan",
    "Autres",
  ],
  "Algérie": [
    "Alger",
    "Oran",
    "Constantine",
    "Annaba",
    "Blida",
    "Sétif",
    "Batna",
    "Béjaïa",
    "Tlemcen",
    "Biskra",
    "Skikda",
    "Tizi Ouzou",
    "Chlef",
    "Jijel",
    "Mostaganem",
    "Sidi Bel Abbès",
    "Ouargla",
    "Ghardaïa",
    "El Oued",
    "Bouira",
    "Tipaza",
    "Saïda",
    "Khenchela",
    "Bordj Bou Arréridj",
    "Laghouat",
    "Médéa",
    "Relizane",
    "Aïn Témouchent",
    "Mascara",
    "Tiaret",
    "Béchar",
    "Adrar",
    "Autres",
  ],
  Tunisie: [
    "Tunis",
    "Sfax",
    "Sousse",
    "Kairouan",
    "Bizerte",
    "Gabès",
    "Nabeul",
    "Monastir",
    "Mahdia",
    "Djerba (Houmt Souk)",
    "Hammamet",
    "Ariana",
    "Ben Arous",
    "La Marsa",
    "Le Kef",
    "Gafsa",
    "Kasserine",
    "Sidi Bouzid",
    "Tozeur",
    "Zarzis",
    "Medenine",
    "Tataouine",
    "Zaghouan",
    "Béja",
    "Jendouba",
    "Siliana",
    "Mahres",
    "Menzel Bourguiba",
    "Autres",
  ],
  "Égypte": [
    "Le Caire",
    "Alexandrie",
    "Gizeh",
    "Port-Saïd",
    "Suez",
    "Tanta",
    "Mansoura",
    "Ismaïlia",
    "Assiout",
    "Louxor",
    "Assouan",
    "Zagazig",
    "Damiette",
    "Minya",
    "Beni Suef",
    "Fayoum",
    "Qena",
    "Sohag",
    "Hurghada",
    "Charm el-Cheikh",
    "6 Octobre",
    "10 Ramadan",
    "El Mahalla el-Kubra",
    "Damanhour",
    "Kafr el-Cheikh",
    "Al-Arich",
    "Marsa Matrouh",
    "Autres",
  ],
};

const REGISTER_ONBOARDING_PREFILL_KEY = "floussy.register.prefill";
const REGISTER_ONBOARDING_DRAFT_KEY = "floussy.register.onboarding_v2";
const REGISTER_ONBOARDING_COMPLETED_KEY = "floussy.register.onboarding_v2.completed";
const REGISTER_FORCE_ONBOARDING_KEY = "floussy.register.force_onboarding_v2";
const REGISTER_ONBOARDING_MESSAGE_TYPE = "floussy.register.onboarding_v2.complete";
const REGISTER_LEAD_ID_KEY = "floussy.register.lead_id";
const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";
const MAX_PROFILE_PHOTO_SIZE_BYTES = 13 * 1024 * 1024;
const EASY_MIN_PASSWORD_LENGTH = 8;
const PASSWORD_HAS_LETTER_RE = /[A-Za-z]/;
const PASSWORD_HAS_DIGIT_RE = /\d/;
const COMPROMISED_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "111111",
  "000000",
  "qwerty",
  "qwertyuiop",
  "password",
  "password1",
  "password123",
  "admin",
  "admin123",
  "welcome",
  "letmein",
  "iloveyou",
  "abc123",
  "123123",
]);

const REGISTER_COPY = {
  fr: {
    photoMustBeImage: "Le fichier doit être une image.",
    photoMaxSize: "La photo ne doit pas dépasser 13 Mo.",
    waitBeforeRetry: "Merci d’attendre avant de réessayer.",
    allFieldsRequired: "Tous les champs sont requis.",
    validEmail: "Merci d’entrer un email valide.",
    passwordsMismatch: "Les mots de passe ne correspondent pas.",
    captchaIncorrect: "Code de vérification incorrect.",
    recaptchaRequired: "أكد أنك ماشي روبوت باش نكملو التسجيل.",
    recaptchaFailed: "ما قدرناش نتحققو من الحماية. عاود المحاولة.",
    recaptchaMissingConfig: "Configuration reCAPTCHA manquante. Ajoute NEXT_PUBLIC_RECAPTCHA_SITE_KEY.",
    recaptchaDevBypass: "Mode dev: NEXT_PUBLIC_RECAPTCHA_SITE_KEY manquant, reCAPTCHA bypassé localement.",
    recaptchaChecking: "Vérification anti-spam validée.",
    completeInfo: "Merci de compléter toutes les informations.",
    phoneTooShort: "Le numéro de téléphone est trop court.",
    invalidBirthDate: "La date de naissance est invalide.",
    minAge: "Il faut avoir au moins 13 ans.",
    chooseCountryCity: "Merci de choisir un pays et une ville.",
    validCity: "Merci de choisir une ville valide pour ce pays.",
    currencyUnavailable: "Devise automatique indisponible pour ce pays.",
    tooManyAttempts: "Trop de tentatives. Merci de réessayer plus tard.",
    accountExists: "Un compte existe déjà avec cet email.",
    weakPassword: "Le mot de passe ne respecte pas les exigences.",
    weakPasswordRule: "Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.",
    compromisedPassword: "Ce mot de passe est compromis. Merci d’en choisir un autre.",
    passwordRuleMinLength: "Au moins 8 caractères",
    passwordRuleLetter: "Au moins 1 lettre",
    passwordRuleDigit: "Au moins 1 chiffre",
    passwordRuleNotCompromised: "Mot de passe non compromis",
    mfaRequired: "L’activation MFA est obligatoire pour créer le compte.",
    mfaConsentLabel: "J’accepte d’activer MFA (authentification à deux facteurs) pour sécuriser mon compte.",
    createAccountFailed: "Impossible de créer le compte. Réessaie.",
    onboardingRequired: "Tu dois terminer onboarding v2 avant de créer le compte.",
    heroPoint1: "Profil personnalisé selon ta situation.",
    heroPoint2: "Enveloppes auto‑créées pour démarrer vite.",
    heroPoint3: "Données sécurisées et assistance dédiée.",
    mobileTitle: "Crée ton espace budget",
    mobileBody: "Quelques étapes pour personnaliser ton expérience.",
    stepBadge: (step: number) => `Inscription • Étape ${step} sur 5`,
    chipSalary: "Salaire",
    chipRent: "Loyer",
    chipDebt: "Crédit",
    fabor: "c’est faboooor",
    createAccount: "Créer un compte",
    createAccountSubtitle: "Commence avec tes informations puis complète tes identifiants.",
    maintenanceSuffix: "Les inscriptions sont désactivées pendant la maintenance.",
    alreadyLoggedIn: "Tu es déjà connecté en tant que",
    goDashboard: "Aller au dashboard",
    logout: "Se déconnecter",
    profilePhoto: "Photo de profil (optionnelle)",
    firstName: "Prénom",
    lastName: "Nom",
    phone: "Numéro de téléphone",
    birthDate: "Date de naissance",
    email: "Email",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    hidePassword: "Masquer le mot de passe",
    showPassword: "Afficher le mot de passe",
    passwordHint: "Au moins 8 caractères, avec 1 lettre et 1 chiffre. Les mots de passe compromis sont refusés.",
    antiSpam: "Vérification anti‑spam",
    regenerate: "Regénérer",
    captchaPlaceholder: "Recopie le code",
    support: "Besoin d’aide ? Contacte le support.",
    country: "Pays",
    city: "Ville",
    selectCity: "Sélectionner une ville",
    chooseCountryFirst: "Choisir un pays d'abord",
    onboardingTitle: "Terminer onboarding v2",
    onboardingBody: "Cette étape s’ouvre sur une page dédiée. Une fois terminée, on revient ici pour finir l’inscription.",
    onboardingOpen: "Ouvrir onboarding v2",
    onboardingDone: "Onboarding v2 terminé. On passe à la dernière étape.",
    onboardingWaiting: "Une fois onboarding terminé, ses données seront récupérées ici automatiquement.",
    summaryTitle: "Résumé avant création du compte",
    summaryBody: "Le compte va être créé avec tes infos de profil, puis le record onboarding v2 sera enregistré juste après.",
    profileLine: "Profil",
    emailLine: "Email",
    countryCityLine: "Pays / ville",
    onboardingLine: "Onboarding v2",
    completed: "complété",
    missing: "manquant",
    defaultEnvelopes: "Enveloppes par défaut",
    selectedCurrency: "Devise sélectionnée",
    countryLine: "Pays",
    retryIn: "Trop de tentatives. Réessaie dans",
    back: "Retour",
    continue: "Continuer",
    createAndStartOnboarding: "Créer le compte et commencer onboarding v2",
    createFinalAccount: "Créer le compte",
    alreadyAccount: "Déjà un compte ?",
    login: "Se connecter",
    flagAlt: (name: string) => `Drapeau ${name}`,
    acceptTermsPrefix: "En créant votre compte, vous acceptez les ",
    acceptTermsCGULink: "Conditions Générales d'Utilisation (CGU)",
    acceptTermsAnd: " et la ",
    acceptTermsPrivacyLink: "Politique de Confidentialité",
    acceptTermsSuffix: " de 7sabek.ma.",
  },
  en: {
    photoMustBeImage: "The file must be an image.",
    photoMaxSize: "Profile photo must be 13 MB or less.",
    waitBeforeRetry: "Please wait before trying again.",
    allFieldsRequired: "All fields are required.",
    validEmail: "Please enter a valid email.",
    passwordsMismatch: "Passwords do not match.",
    captchaIncorrect: "Verification code is incorrect.",
    recaptchaRequired: "أكد أنك ماشي روبوت باش نكملو التسجيل.",
    recaptchaFailed: "ما قدرناش نتحققو من الحماية. عاود المحاولة.",
    recaptchaMissingConfig: "Missing reCAPTCHA configuration. Add NEXT_PUBLIC_RECAPTCHA_SITE_KEY.",
    recaptchaDevBypass: "Dev mode: NEXT_PUBLIC_RECAPTCHA_SITE_KEY is missing, reCAPTCHA is bypassed locally.",
    recaptchaChecking: "Anti-spam verification passed.",
    completeInfo: "Please complete all information.",
    phoneTooShort: "Phone number is too short.",
    invalidBirthDate: "Birth date is invalid.",
    minAge: "You must be at least 13 years old.",
    chooseCountryCity: "Please choose a country and a city.",
    validCity: "Please choose a valid city for this country.",
    currencyUnavailable: "Automatic currency is unavailable for this country.",
    tooManyAttempts: "Too many attempts. Please try again later.",
    accountExists: "An account already exists with this email.",
    weakPassword: "Password does not meet the requirements.",
    weakPasswordRule: "Password must have at least 8 characters, one letter, and one number.",
    compromisedPassword: "This password is compromised. Please choose another one.",
    passwordRuleMinLength: "At least 8 characters",
    passwordRuleLetter: "At least 1 letter",
    passwordRuleDigit: "At least 1 number",
    passwordRuleNotCompromised: "Password is not compromised",
    mfaRequired: "MFA activation is required to create the account.",
    mfaConsentLabel: "I agree to enable MFA (two-factor authentication) to secure my account.",
    createAccountFailed: "Unable to create the account. Try again.",
    onboardingRequired: "You must finish onboarding v2 before creating the account.",
    heroPoint1: "A setup tailored to your situation.",
    heroPoint2: "Starter envelopes created automatically.",
    heroPoint3: "Secure data and dedicated support.",
    mobileTitle: "Create your budget space",
    mobileBody: "A few steps to personalize your experience.",
    stepBadge: (step: number) => `Register • Step ${step} of 5`,
    chipSalary: "Salary",
    chipRent: "Rent",
    chipDebt: "Loan",
    fabor: "it’s freeeee",
    createAccount: "Create an account",
    createAccountSubtitle: "Start with your profile details, then complete your credentials.",
    maintenanceSuffix: "Signups are disabled during maintenance.",
    alreadyLoggedIn: "You are already signed in as",
    goDashboard: "Go to dashboard",
    logout: "Log out",
    profilePhoto: "Profile photo (optional)",
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone number",
    birthDate: "Birth date",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    hidePassword: "Hide password",
    showPassword: "Show password",
    passwordHint: "At least 8 characters, with 1 letter and 1 number. Compromised passwords are rejected.",
    antiSpam: "Anti-spam verification",
    regenerate: "Regenerate",
    captchaPlaceholder: "Type the code",
    support: "Need help? Contact support.",
    country: "Country",
    city: "City",
    selectCity: "Select a city",
    chooseCountryFirst: "Choose a country first",
    onboardingTitle: "Complete onboarding v2",
    onboardingBody: "This step opens on its own page. Once finished, we come back here to finish registration.",
    onboardingOpen: "Open onboarding v2",
    onboardingDone: "Onboarding v2 completed. Moving to the final step.",
    onboardingWaiting: "Once onboarding is done, its data will be captured here automatically.",
    summaryTitle: "Summary before account creation",
    summaryBody: "The account will be created with your profile info, then the onboarding v2 record will be saved right after.",
    profileLine: "Profile",
    emailLine: "Email",
    countryCityLine: "Country / city",
    onboardingLine: "Onboarding v2",
    completed: "completed",
    missing: "missing",
    defaultEnvelopes: "Default envelopes",
    selectedCurrency: "Selected currency",
    countryLine: "Country",
    retryIn: "Too many attempts. Try again in",
    back: "Back",
    continue: "Continue",
    createAndStartOnboarding: "Create account and start onboarding v2",
    createFinalAccount: "Create account",
    alreadyAccount: "Already have an account?",
    login: "Sign in",
    flagAlt: (name: string) => `${name} flag`,
    acceptTermsPrefix: "By creating your account, you accept the ",
    acceptTermsCGULink: "General Terms of Use (CGU)",
    acceptTermsAnd: " and the ",
    acceptTermsPrivacyLink: "Privacy Policy",
    acceptTermsSuffix: " of 7sabek.ma.",
  },
  ar: {
    photoMustBeImage: "الملف خاصو يكون صورة.",
    photoMaxSize: "الصورة ما خاصهاش تفوت 13 ميغا.",
    waitBeforeRetry: "تسنى شوية قبل ما تعاود.",
    allFieldsRequired: "كل الخانات ضروريين.",
    validEmail: "دخل إيميل صحيح.",
    passwordsMismatch: "كلمات السر ما متطابقينش.",
    captchaIncorrect: "كود التحقق ماشي صحيح.",
    recaptchaRequired: "أكد أنك ماشي روبوت باش نكملو التسجيل.",
    recaptchaFailed: "ما قدرناش نتحققو من الحماية. عاود المحاولة.",
    recaptchaMissingConfig: "إعداد reCAPTCHA ناقص. زيد NEXT_PUBLIC_RECAPTCHA_SITE_KEY.",
    recaptchaDevBypass: "وضع التطوير: NEXT_PUBLIC_RECAPTCHA_SITE_KEY ناقص وتم تجاوز reCAPTCHA محلياً.",
    recaptchaChecking: "تم التحقق من الحماية ضد السبام.",
    completeInfo: "كمل جميع المعلومات.",
    phoneTooShort: "رقم الهاتف قصير بزاف.",
    invalidBirthDate: "تاريخ الازدياد ما صالحش.",
    minAge: "خاص يكون العمر على الأقل 13 عام.",
    chooseCountryCity: "اختار البلد والمدينة.",
    validCity: "اختار مدينة صالحة لهاد البلاد.",
    currencyUnavailable: "العملة الأوتوماتيكية ما متوفراش لهاد البلاد.",
    tooManyAttempts: "كاين بزاف ديال المحاولات. عاود من بعد.",
    accountExists: "كاين حساب بهاد الإيميل من قبل.",
    weakPassword: "كلمة السر ما كتحترمش الشروط.",
    weakPasswordRule: "كلمة السر خاصها تكون فيها على الأقل 8 حروف، وحرف واحد، ورقم واحد.",
    compromisedPassword: "هاد كلمة السر متسربة. اختار كلمة سر أخرى.",
    passwordRuleMinLength: "على الأقل 8 حروف",
    passwordRuleLetter: "على الأقل 1 حرف",
    passwordRuleDigit: "على الأقل 1 رقم",
    passwordRuleNotCompromised: "كلمة سر غير متسربة",
    mfaRequired: "الموافقة على حماية إضافية للحساب ضرورية باش يتصاوب الحساب.",
    mfaConsentLabel: "باش نحمي الحساب ديالك، نقدر نطلبو تحقق إضافي فبعض الحالات.",
    createAccountFailed: "ما قدرناش نصاوبو الحساب دابا. عاود المحاولة.",
    onboardingRequired: "خاصك تكمل الإعداد قبل إنشاء الحساب.",
    heroPoint1: "بروفايل مخصص حسب الوضعية ديالك.",
    heroPoint2: "أظرفة كيتصاوبو ليك تلقائياً باش تبدا بسرعة.",
    heroPoint3: "بيانات مؤمنة ودعم مخصص.",
    mobileTitle: "صاوب حسابك فـ 7sabek",
    mobileBody: "غير شحال هادي ديال الخطوات باش نخصصو التجربة ديالك.",
    stepBadge: (step: number) => `خطوة التسجيل • ${step} من 5`,
    chipSalary: "السالير",
    chipRent: "الكراء",
    chipDebt: "كريدي",
    fabor: "فابووووور",
    createAccount: "صاوب حساب",
    createAccountSubtitle: "بدا بالمعلومات الأساسية، ومن بعد كمل بيانات الدخول.",
    maintenanceSuffix: "التسجيل موقف أثناء الصيانة.",
    alreadyLoggedIn: "راك داير الدخول بهاد الحساب",
    goDashboard: "سير للوحة القيادة",
    logout: "تسجيل الخروج",
    profilePhoto: "صورة البروفايل (اختيارية)",
    firstName: "الاسم الشخصي",
    lastName: "النسب",
    phone: "رقم الهاتف",
    birthDate: "تاريخ الازدياد",
    email: "الإيميل",
    password: "كلمة السر",
    confirmPassword: "أكد كلمة السر",
    hidePassword: "خبي كلمة السر",
    showPassword: "بيّن كلمة السر",
    passwordHint: "كلمة السر خاصها تكون على الأقل 8 حروف، وفيها حرف ورقم. كلمات السر المتسربة ما مقبولاش.",
    antiSpam: "التحقق ضد السبام",
    regenerate: "بدّل كود التحقق",
    captchaPlaceholder: "عاود كتب كود التحقق",
    support: "إلى محتاج مساعدة تاصل بالدعم.",
    country: "البلد",
    city: "المدينة",
    selectCity: "اختار مدينة",
    chooseCountryFirst: "اختار البلد أولاً",
    onboardingTitle: "كمّل الإعداد",
    onboardingBody: "هاد المرحلة كتتحل فصفحة بوحدها. منين تسالي غادي نرجعو لهنا ونكملو التسجيل.",
    onboardingOpen: "فتح صفحة الإعداد",
    onboardingDone: "الإعداد سالا. غادي ندوزو للمرحلة الأخيرة.",
    onboardingWaiting: "منين تسالي الإعداد، المعطيات غادي تجي لهنا تلقائياً.",
    summaryTitle: "الخلاصة قبل إنشاء الحساب",
    summaryBody: "الحساب غادي يتصاوب بمعلومات البروفايل ديالك ومن بعد بيانات الإعداد غادي تتحفظ مباشرة.",
    profileLine: "البروفايل",
    emailLine: "الإيميل",
    countryCityLine: "البلاد / المدينة",
    onboardingLine: "الإعداد",
    completed: "مكمل",
    missing: "ناقص",
    defaultEnvelopes: "الأظرفة الافتراضية",
    selectedCurrency: "العملة المختارة",
    countryLine: "البلاد",
    retryIn: "كاين بزاف ديال المحاولات. عاود ف",
    back: "رجوع",
    continue: "التالي",
    createAndStartOnboarding: "صاوب الحساب وبدا الإعداد",
    createFinalAccount: "صاوب الحساب",
    alreadyAccount: "عندك حساب من قبل؟",
    login: "دخل لحسابك",
    flagAlt: (name: string) => `علم ${name}`,
    acceptTermsPrefix: "بإنشاء حسابك، فإنك توافق على ",
    acceptTermsCGULink: "الشروط العامة للاستخدام (CGU)",
    acceptTermsAnd: " و ",
    acceptTermsPrivacyLink: "سياسة الخصوصية",
    acceptTermsSuffix: " لـ 7sabek.ma.",
  },
} satisfies Record<FloussyLocale, Record<string, string | ((...args: never[]) => string)>>;

const COUNTRY_LABELS: Record<FloussyLocale, Record<CountryName, string>> = {
  fr: { Maroc: "Maroc", Algérie: "Algérie", Tunisie: "Tunisie", Égypte: "Égypte" },
  en: { Maroc: "Morocco", Algérie: "Algeria", Tunisie: "Tunisia", Égypte: "Egypt" },
  ar: { Maroc: "المغرب", Algérie: "الجزائر", Tunisie: "تونس", Égypte: "مصر" },
};

type RegisterOnboardingPayload = {
  answers: Record<string, unknown>;
  draft_objects: Record<string, unknown>;
};

type RegisterPrefillPayload = {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  birth_date?: string;
  profile_photo_url?: string | null;
  country?: CountryName | "";
  city?: string;
  currency?: CurrencyCode | "";
};

export default function RegisterPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const inputClass =
    "h-[50px] rounded-xl border-[#E3E8DF] bg-white text-[15px] font-semibold text-[#0A241D] shadow-none placeholder:font-medium placeholder:text-[#A9B5AF] focus-visible:border-[#17C777] focus-visible:ring-[3px] focus-visible:ring-[#E2F7EC] focus-visible:ring-offset-0";
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [introReady, setIntroReady] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = usePlatformStatus();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaWidgetRef = useRef<number | null>(null);
  const recaptchaNodeRef = useRef<HTMLDivElement | null>(null);
  const [recaptchaScriptLoaded, setRecaptchaScriptLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFieldActive, setPasswordFieldActive] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState<CountryName | "">("");
  const [city, setCity] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode | "">("");
  const [registerOnboardingPayload, setRegisterOnboardingPayload] =
    useState<RegisterOnboardingPayload | null>(null);
  const [registrationLeadId, setRegistrationLeadId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const passwordFieldRef = useRef<HTMLDivElement | null>(null);
  const profilePhotoBlobUrlRef = useRef<string | null>(null);
  const submitInFlightRef = useRef(false);
  const maintenanceActive = Boolean(status?.maintenance_mode);
  const registrationBlocked = maintenanceActive || Boolean(retryAfterSeconds);
  const supportEmail = status?.support_email || "elidryssi@gmail.com";
  const isOnboardingStep = !user && step === 4;
  const copy = REGISTER_COPY[locale];
  // A tab opened in the background freezes CSS animations at frame 0, which would
  // leave the panel invisible. Only arm the one-shot intro when the page is on screen.
  useEffect(() => {
    if (reduceMotion) return;
    if (typeof document === "undefined") return;
    if (document.visibilityState === "visible") setIntroReady(true);
  }, [reduceMotion]);

  const pageDir = getLocaleDirection(locale);
  const pageFontClass = locale === "ar" ? `${arabicFont.className} register-arabic-font` : bodyFont.className;
  const headingClass = locale === "ar" ? "register-title" : displayFont.className;
  const copyClass = locale === "ar" ? "register-copy" : "";
  const countryLabels = COUNTRY_LABELS[locale];
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
  const isDevEnvironment = process.env.NODE_ENV !== "production";
  const allowRecaptchaBypass = !recaptchaSiteKey;

  const formatDuration = (seconds: number) => {
    const total = Math.max(seconds, 0);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    if (mins <= 0) {
      return `${secs}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const parseRetryAfter = (headerValue: string | null, message: string) => {
    if (headerValue) {
      const parsed = Number(headerValue);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
    const match = message.match(/(\d+)\s*(seconde|secondes|minute|minutes)/i);
    if (match) {
      const parsed = Number(match[1]);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return match[2].toLowerCase().startsWith("minute") ? parsed * 60 : parsed;
      }
    }
    return null;
  };

  useEffect(() => {
    setLocale(getBrowserLocalePreference() ?? "fr");
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const prefillRaw = window.localStorage.getItem(REGISTER_ONBOARDING_PREFILL_KEY);
      if (prefillRaw) {
        const prefill = JSON.parse(prefillRaw) as RegisterPrefillPayload;
        if (prefill.first_name) setFirstName(prefill.first_name);
        if (prefill.last_name) setLastName(prefill.last_name);
        if (prefill.phone_number) setPhoneNumber(prefill.phone_number);
        if (prefill.birth_date) setBirthDate(prefill.birth_date);
        if (typeof prefill.profile_photo_url === "string" && prefill.profile_photo_url.trim()) {
          setProfilePhotoUrl(prefill.profile_photo_url);
          setProfilePhotoPreviewUrl(null);
        }
        if (prefill.country && prefill.country in CITIES_BY_COUNTRY) {
          setCountry(prefill.country);
        }
        if (prefill.city) setCity(prefill.city);
        if (prefill.currency) setCurrency(prefill.currency);
      }

      const raw = window.localStorage.getItem(REGISTER_ONBOARDING_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RegisterOnboardingPayload;
      if (parsed?.answers && parsed?.draft_objects) {
        setRegisterOnboardingPayload(parsed);
        if (
          new URLSearchParams(window.location.search).get("resume") === "1" &&
          window.localStorage.getItem(REGISTER_ONBOARDING_COMPLETED_KEY) === "1"
        ) {
          setStep(5);
          setError(null);
          router.replace("/register");
        }
      }
    } catch {
      return;
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(REGISTER_LEAD_ID_KEY) || "";
    if (saved) setRegistrationLeadId(saved);
  }, []);

  const captureLeadSafe = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        const result = await apiFetch<{ lead_id: string; status: string }>("/auth/register/lead", {
          method: "POST",
          body,
        });
        const nextLeadId = (result?.lead_id || "").trim();
        if (nextLeadId && typeof window !== "undefined") {
          window.localStorage.setItem(REGISTER_LEAD_ID_KEY, nextLeadId);
          setRegistrationLeadId(nextLeadId);
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("registration_lead_capture_failed", err);
        }
      }
    },
    []
  );

  useEffect(() => {
    profilePhotoBlobUrlRef.current =
      profilePhotoPreviewUrl?.startsWith("blob:") ? profilePhotoPreviewUrl : null;
  }, [profilePhotoPreviewUrl]);

  useEffect(() => {
    return () => {
      if (profilePhotoBlobUrlRef.current) {
        URL.revokeObjectURL(profilePhotoBlobUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== REGISTER_ONBOARDING_MESSAGE_TYPE) return;
      const payload = event.data.payload as RegisterOnboardingPayload | undefined;
      if (!payload?.answers || !payload?.draft_objects) return;
      window.localStorage.setItem(REGISTER_ONBOARDING_DRAFT_KEY, JSON.stringify(payload));
      setRegisterOnboardingPayload(payload);
      setError(null);
      setStep(5);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  useEffect(() => {
    if (!retryAfterSeconds || retryAfterSeconds <= 0) return;
    const timer = setInterval(() => {
      setRetryAfterSeconds((prev) => {
        if (!prev) return prev;
        if (prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!recaptchaSiteKey || allowRecaptchaBypass) return;
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://www.google.com/recaptcha/api.js"]'
    );
    if (existing && window.grecaptcha) {
      setRecaptchaScriptLoaded(true);
    } else if (!existing) {
      window.onRecaptchaV2Loaded = () => setRecaptchaScriptLoaded(true);
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaV2Loaded&render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    return () => {
      window.onRecaptchaV2Loaded = undefined;
    };
  }, [allowRecaptchaBypass, recaptchaSiteKey]);

  const renderRecaptchaWidget = useCallback(
    (node: HTMLDivElement) => {
      if (window.grecaptcha && recaptchaWidgetRef.current === null && recaptchaSiteKey) {
        try {
          recaptchaWidgetRef.current = window.grecaptcha.render(node, {
            sitekey: recaptchaSiteKey,
            callback: (token: string) => setRecaptchaToken(token),
            "expired-callback": () => setRecaptchaToken(null),
            "error-callback": () => setRecaptchaToken(null),
          });
        } catch {
          setError(copy.recaptchaFailed);
        }
      }
    },
    [copy.recaptchaFailed, recaptchaSiteKey],
  );

  const recaptchaContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      recaptchaNodeRef.current = node;
      if (node) {
        renderRecaptchaWidget(node);
      }
    },
    [renderRecaptchaWidget],
  );

  useEffect(() => {
    if (recaptchaScriptLoaded && recaptchaNodeRef.current) {
      renderRecaptchaWidget(recaptchaNodeRef.current);
    }
  }, [recaptchaScriptLoaded, renderRecaptchaWidget]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(copy.photoMustBeImage);
      if (event.target) event.target.value = "";
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
      setError(copy.photoMaxSize);
      if (event.target) event.target.value = "";
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setProfilePhotoPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return nextPreviewUrl;
    });

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhotoUrl(typeof reader.result === "string" ? reader.result : null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const citiesForCountry = useMemo(
    () => (country && country in CITIES_BY_COUNTRY ? CITIES_BY_COUNTRY[country] : []),
    [country]
  );

  const passwordRules = useMemo(
    () => [
      { label: copy.passwordRuleMinLength, ok: password.length >= EASY_MIN_PASSWORD_LENGTH },
      { label: copy.passwordRuleLetter, ok: PASSWORD_HAS_LETTER_RE.test(password) },
      { label: copy.passwordRuleDigit, ok: PASSWORD_HAS_DIGIT_RE.test(password) },
      { label: copy.passwordRuleNotCompromised, ok: !COMPROMISED_PASSWORDS.has(password.trim().toLowerCase()) },
    ],
    [copy.passwordRuleDigit, copy.passwordRuleLetter, copy.passwordRuleMinLength, copy.passwordRuleNotCompromised, password]
  );

  useEffect(() => {
    if (!country) {
      setCity("");
      setCurrency("");
      return;
    }
    if (!citiesForCountry.includes(city)) {
      setCity("");
    }
    const nextCurrency = CURRENCY_BY_COUNTRY[country as CountryName];
    if (nextCurrency && nextCurrency !== currency) {
      setCurrency(nextCurrency);
    }
  }, [country, city, citiesForCountry, currency]);

  const validateCredentialsStep = () => {
    if (retryAfterSeconds) {
      setError(copy.waitBeforeRetry);
      return false;
    }
    if (!email.trim() || !password || !confirmPassword) {
      setError(copy.allFieldsRequired);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(copy.validEmail);
      return false;
    }
    if (password !== confirmPassword) {
      setError(copy.passwordsMismatch);
      return false;
    }
    if (password.length < EASY_MIN_PASSWORD_LENGTH) {
      setError(copy.weakPasswordRule);
      return false;
    }
    if (!PASSWORD_HAS_LETTER_RE.test(password) || !PASSWORD_HAS_DIGIT_RE.test(password)) {
      setError(copy.weakPasswordRule);
      return false;
    }
    if (COMPROMISED_PASSWORDS.has(password.trim().toLowerCase())) {
      setError(copy.compromisedPassword);
      return false;
    }
    if (!recaptchaSiteKey && !allowRecaptchaBypass) {
      setError(copy.recaptchaMissingConfig);
      return false;
    }
    if (!allowRecaptchaBypass && !recaptchaToken) {
      setError(copy.recaptchaRequired);
      return false;
    }
    setError(null);
    return true;
  };

  const maxBirthDate = (() => {
    const today = new Date();
    const max = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    return max.toISOString().slice(0, 10);
  })();

  const validateProfileStep = () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !phoneNumber.trim() ||
      !birthDate
    ) {
      setError(copy.completeInfo);
      return false;
    }
    if (phoneNumber.trim().length < 6) {
      setError(copy.phoneTooShort);
      return false;
    }
    const birth = new Date(birthDate);
    const today = new Date();
    const minBirth = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    if (Number.isNaN(birth.getTime()) || birth > today) {
      setError(copy.invalidBirthDate);
      return false;
    }
    if (birth > minBirth) {
      setError(copy.minAge);
      return false;
    }
    setError(null);
    return true;
  };

  const validateLocationStep = () => {
    if (!country.trim() || !city.trim()) {
      setError(copy.chooseCountryCity);
      return false;
    }
    if (country && !citiesForCountry.includes(city)) {
      setError(copy.validCity);
      return false;
    }
    setError(null);
    return true;
  };

  const persistRegisterOnboardingPrefill = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      REGISTER_ONBOARDING_PREFILL_KEY,
      JSON.stringify({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
        birth_date: birthDate,
        profile_photo_url: profilePhotoUrl,
        country: country.trim(),
        city: city.trim(),
        currency,
      })
    );
  };

  const getRecaptchaToken = (): string | null => {
    if (allowRecaptchaBypass) return null;
    if (!recaptchaToken) {
      setError(copy.recaptchaRequired);
      return null;
    }
    return recaptchaToken;
  };

  const resetRecaptcha = () => {
    setRecaptchaToken(null);
    if (window.grecaptcha && recaptchaWidgetRef.current !== null) {
      window.grecaptcha.reset(recaptchaWidgetRef.current);
    }
  };

  const handleNext = () => {
    if (loading || submitInFlightRef.current) return;
    if (step === 1 && !validateProfileStep()) return;
    if (step === 2 && !validateCredentialsStep()) return;
    if (step === 3 && !validateLocationStep()) return;
    if (step === 1) {
      void captureLeadSafe({
        lead_id: registrationLeadId || undefined,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone: phoneNumber.trim() || undefined,
        birth_date: birthDate || undefined,
        language: locale,
        current_step: 1,
        event: "step1_saved",
      });
    }
    if (step === 3) {
      persistRegisterOnboardingPrefill();
      setError(null);
      setStep(4);
      router.push("/onboarding?register=1");
      return;
    }
    if (step === 4 && !registerOnboardingPayload) {
      persistRegisterOnboardingPrefill();
      setError(null);
      router.push("/onboarding?register=1");
      return;
    }
    setStep((prev) => (prev < 5 ? ((prev + 1) as 1 | 2 | 3 | 4 | 5) : prev));
  };

  const handleRegisterAndStartOnboarding = async () => {
    if (loading || submitInFlightRef.current) return;
    if (!validateProfileStep() || !validateCredentialsStep() || !validateLocationStep()) {
      return;
    }
    if (!currency) {
      setError(copy.currencyUnavailable);
      return;
    }
    const currentRecaptchaToken = getRecaptchaToken();
    if (!allowRecaptchaBypass && !currentRecaptchaToken) {
      return;
    }
    persistRegisterOnboardingPrefill();
    setLoading(true);
    submitInFlightRef.current = true;
    setRetryAfterSeconds(null);
    setError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await apiFetch("/auth/register", {
        method: "POST",
        body: {
          email: normalizedEmail,
          password,
          currency,
          sweep_interval_days: DEFAULT_SWEEP_INTERVAL_DAYS,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim(),
          birth_date: birthDate,
          country: country.trim(),
          city: city.trim(),
          profile_photo_url: profilePhotoUrl,
          mfa_consent: true,
          defer_onboarding_v2: true,
          recaptcha_token: currentRecaptchaToken,
          lead_id: registrationLeadId || undefined,
        },
      });
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(REGISTER_LEAD_ID_KEY);
        window.localStorage.removeItem(REGISTER_ONBOARDING_DRAFT_KEY);
        window.localStorage.removeItem(REGISTER_ONBOARDING_COMPLETED_KEY);
        window.localStorage.setItem(REGISTER_FORCE_ONBOARDING_KEY, "1");
      }
      await refreshAuthSession();
      router.push("/onboarding?post_register=1");
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.createAccountFailed;
      const lower = message.toLowerCase();
      if (lower.includes("too many") || lower.includes("trop de tentatives")) {
        const retryAfter = parseRetryAfter(null, message);
        if (retryAfter) setRetryAfterSeconds(retryAfter);
        setError(copy.tooManyAttempts);
        return;
      }
      if (
        lower.includes("compte supprim") ||
        lower.includes("récupération") ||
        lower.includes("recuperation") ||
        lower.includes("suppression définitive")
      ) {
        setError(message);
      } else if (lower.includes("maintenance")) {
        setError(message);
      } else if (lower.includes("recaptcha_required")) {
        setError(copy.recaptchaRequired);
      } else if (message.includes("أكد أنك ماشي روبوت")) {
        setError(copy.recaptchaRequired);
      } else if (lower.includes("recaptcha_failed")) {
        setError(copy.recaptchaFailed);
      } else if (message.includes("ما قدرناش نتحققو")) {
        setError(copy.recaptchaFailed);
      } else if (lower.includes("exists") || lower.includes("already")) {
        setError(copy.accountExists);
      } else if (lower.includes("password")) {
        setError(copy.weakPassword);
      } else {
        setError(copy.createAccountFailed);
      }
    } finally {
      setLoading(false);
      submitInFlightRef.current = false;
      resetRecaptcha();
    }
  };

  const handlePrev = () => {
    setError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4 | 5) : prev));
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || submitInFlightRef.current) return;
    if (maintenanceMessage) {
      setError(maintenanceMessage);
      return;
    }
    if (step === 3) {
      await handleRegisterAndStartOnboarding();
      return;
    }
    if (step !== 5) {
      handleNext();
      return;
    }
    if (!validateProfileStep() || !validateCredentialsStep() || !validateLocationStep()) return;
    if (!registerOnboardingPayload) {
      setError(copy.onboardingRequired);
      return;
    }
    if (!currency) {
      setError(copy.currencyUnavailable);
      return;
    }
    const currentRecaptchaToken2 = getRecaptchaToken();
    if (!allowRecaptchaBypass && !currentRecaptchaToken2) {
      return;
    }
    setLoading(true);
    submitInFlightRef.current = true;
    setRetryAfterSeconds(null);
    setError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await apiFetch("/auth/register", {
        method: "POST",
        body: {
          email: normalizedEmail,
          password,
          currency,
          sweep_interval_days: DEFAULT_SWEEP_INTERVAL_DAYS,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim(),
          birth_date: birthDate,
          country: country.trim(),
          city: city.trim(),
          profile_photo_url: profilePhotoUrl,
          mfa_consent: true,
          onboarding_v2_answers: registerOnboardingPayload.answers,
          onboarding_v2_draft_objects: registerOnboardingPayload.draft_objects,
          recaptcha_token: currentRecaptchaToken2,
          lead_id: registrationLeadId || undefined,
        },
      });
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(REGISTER_LEAD_ID_KEY);
        window.localStorage.removeItem(REGISTER_ONBOARDING_PREFILL_KEY);
        window.localStorage.removeItem(REGISTER_ONBOARDING_DRAFT_KEY);
        window.localStorage.removeItem(REGISTER_ONBOARDING_COMPLETED_KEY);
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(REGISTER_FORCE_ONBOARDING_KEY);
      }
      await refreshAuthSession();
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.createAccountFailed;
      const lower = message.toLowerCase();
      if (lower.includes("too many") || lower.includes("trop de tentatives")) {
        const retryAfter = parseRetryAfter(null, message);
        if (retryAfter) setRetryAfterSeconds(retryAfter);
        setError(copy.tooManyAttempts);
        return;
      }
      if (
        lower.includes("compte supprim") ||
        lower.includes("récupération") ||
        lower.includes("recuperation") ||
        lower.includes("suppression définitive")
      ) {
        setError(message);
      } else if (lower.includes("maintenance")) {
        setError(message);
      } else if (lower.includes("onboarding")) {
        setError(copy.onboardingRequired);
      } else if (lower.includes("recaptcha_required")) {
        setError(copy.recaptchaRequired);
      } else if (message.includes("أكد أنك ماشي روبوت")) {
        setError(copy.recaptchaRequired);
      } else if (lower.includes("recaptcha_failed")) {
        setError(copy.recaptchaFailed);
      } else if (message.includes("ما قدرناش نتحققو")) {
        setError(copy.recaptchaFailed);
      } else if (lower.includes("exists") || lower.includes("already")) {
        setError(copy.accountExists);
      } else if (lower.includes("password")) {
        setError(copy.weakPassword);
      } else {
        setError(copy.createAccountFailed);
      }
    } finally {
      setLoading(false);
      submitInFlightRef.current = false;
      resetRecaptcha();
    }
  };

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
    : null;
  const maintenanceMessage =
    status?.maintenance_mode && status.maintenance_message
      ? status.maintenance_message
      : "";
  const maintenancePlacements = status?.maintenance_placements ?? [];
  const showMaintenanceBanner =
    Boolean(maintenanceMessage.trim()) &&
    maintenancePlacements.includes("register");
  const registerAnnouncements = getVisibleAnnouncements(status, user, "register");
  const showAnnouncementBanner = registerAnnouncements.length > 0;

  useEffect(() => {
    if (step !== 2) return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return;
    const timer = window.setTimeout(() => {
      void captureLeadSafe({
        lead_id: registrationLeadId || undefined,
        email: normalized,
        language: locale,
        current_step: 2,
        event: "email_entered",
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [step, email, locale, registrationLeadId, captureLeadSafe]);

  return (
    <div
      className={`rg-root relative min-h-screen bg-[#F6F8F4] ${pageFontClass} ${introReady ? "rg-intro" : ""}`}
      dir={pageDir}
      data-register-locale={locale}
      style={locale === "ar" ? { fontFamily: `var(--font-cairo), "Cairo", sans-serif` } : undefined}
    >
      <div
        className={`grid min-h-screen grid-cols-1 ${
          isOnboardingStep ? "" : "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
        }`}
      >
        <aside
          className={`rg-panel relative hidden flex-col justify-between gap-7 overflow-hidden bg-[linear-gradient(155deg,#124636_0%,#0A241D_62%)] p-11 text-[#EAF4EF] ${copyClass} ${
            isOnboardingStep ? "" : "lg:flex"
          }`}
          onPointerMove={(event) => {
            if (reduceMotion) return;
            const target = event.currentTarget;
            const rect = target.getBoundingClientRect();
            target.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
            target.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
          }}
        >
          <span className="rg-blob rg-blob-a" aria-hidden="true" />
          <span className="rg-blob rg-blob-b" aria-hidden="true" />
          <span className="rg-spot" aria-hidden="true" />

          <div className="relative z-10">
            {/* The brand PNGs are square with wide transparent padding, so the box
                has to be ~2.4x the intended visual height. */}
            <BrandLogo locale={locale} tone="dark" className="-ms-3 h-20 w-auto" />
          </div>

          <div className="relative z-10">
            <h2
              className={`${headingClass} rg-rise text-[2rem] font-extrabold leading-[1.1] text-white`}
              style={{ "--d": ".18s" } as React.CSSProperties}
            >
              {copy.mobileTitle}
            </h2>
            <p
              className="rg-rise mt-3.5 max-w-[38ch] text-[0.95rem] leading-relaxed text-[#B9CFC5]"
              style={{ "--d": ".3s" } as React.CSSProperties}
            >
              {copy.createAccountSubtitle}
            </p>
            <div className="mt-7 flex flex-col gap-3">
              {[copy.heroPoint1, copy.heroPoint2, copy.heroPoint3].map((point, index) => (
                <div
                  key={point}
                  className="rg-rise flex items-start gap-3 text-[0.87rem] font-semibold text-[#DCEAE3]"
                  style={{ "--d": `${0.42 + index * 0.08}s` } as React.CSSProperties}
                >
                  <span className="mt-px flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full bg-[#17C777]/20 text-[#17C777]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rg-rise relative z-10 flex flex-wrap gap-2" style={{ "--d": ".72s" } as React.CSSProperties}>
            {[
              { label: copy.chipSalary, value: "+12 400", dot: "#17C777", up: true },
              { label: copy.chipRent, value: "-3 200", dot: "#0A241D", up: false },
              { label: copy.chipDebt, value: "-2 100", dot: "#8B7CF6", up: false },
            ].map((chip) => (
              <span
                key={chip.label}
                className="rg-chip flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-[0.76rem] font-bold text-[#DCEAE3] backdrop-blur"
              >
                <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: chip.dot }} />
                <span>{chip.label}</span>
                <span className={`tabular-nums font-extrabold ${chip.up ? "text-[#17C777]" : ""}`} dir="ltr">
                  {chip.value}
                </span>
              </span>
            ))}
          </div>
        </aside>

        <main className={`flex flex-col px-5 pb-12 pt-6 sm:px-8 lg:px-14 lg:pt-8 ${copyClass}`}>
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              aria-label="7sabek"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E3E8DF] bg-white text-[#4E625A] transition hover:border-[#17C777] hover:text-[#0B8F53]"
            >
              <Home className="h-4 w-4" />
            </Link>
            <span className="text-[0.7rem] font-semibold text-[#7C8D86]">7sabek</span>
          </div>

          <div className="flex flex-1 justify-center pt-8">
            <motion.div
              className={`w-full ${isOnboardingStep ? "max-w-none" : "max-w-[520px]"}`}
              initial={reduceMotion ? undefined : { opacity: 0, y: 22 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
            <div className={`mb-7 flex flex-col items-center gap-2 text-center lg:hidden ${copyClass} ${isOnboardingStep ? "hidden" : ""}`}>
              <BrandLogo locale={locale} className="h-20 w-auto object-contain" />
            </div>

            {!isOnboardingStep && !user ? (
              <div className="mb-6">
                <div className="flex items-center justify-between gap-3 text-[0.78rem] font-extrabold text-[#7C8D86]">
                  <span>{copy.stepBadge(step)}</span>
                </div>
                <div className="rg-bar mt-2.5 h-[5px] overflow-hidden rounded-full bg-[#EEF1EA]">
                  <span
                    className="block h-full rounded-full bg-[linear-gradient(90deg,#17C777,#0B8F53)] transition-[width] duration-500 ease-out"
                    style={{ width: `${step * 20}%` }}
                  />
                </div>
                <div className="mt-3.5 flex gap-[7px]">
                  {[1, 2, 3, 4, 5].map((index) => (
                    <span
                      key={index}
                      className={`flex h-[30px] flex-1 items-center justify-center rounded-[9px] text-[0.72rem] font-extrabold transition ${
                        index === step
                          ? "scale-[1.06] bg-[#0A241D] text-white"
                          : index < step
                            ? "bg-[#E2F7EC] text-[#0B8F53]"
                            : "bg-[#EEF1EA] text-[#7C8D86]"
                      }`}
                    >
                      {index}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
        <Card
          className={`w-full border-0 bg-transparent p-0 shadow-none ${copyClass} ${
            isOnboardingStep ? "space-y-4" : "space-y-5"
          }`}
        >
          <motion.div
            className="space-y-1"
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            {isOnboardingStep ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-medium text-emerald-700">
                    {copy.stepBadge(4)}
                  </span>
                  <h1
                    className={`${headingClass} mt-3 text-3xl font-semibold tracking-tight text-gray-900`}
                  >
                    {copy.onboardingTitle}
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    {copy.onboardingBody}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h1
                  className={`${headingClass} text-[clamp(1.7rem,3vw,2.2rem)] font-extrabold tracking-tight text-[#0A241D]`}
                >
                  {copy.createAccount}
                </h1>
                <p className="mt-2.5 text-[0.96rem] leading-relaxed text-[#4E625A]">
                  {copy.createAccountSubtitle}
                </p>
              </>
            )}
          </motion.div>
          {showMaintenanceBanner ? (
            <SystemMessageCard
              variant="maintenance"
              message={maintenanceMessage}
              suffix={copy.maintenanceSuffix}
            />
          ) : null}
          {showAnnouncementBanner ? (
            registerAnnouncements.map((announcement) => (
              <SystemMessageCard
                key={announcement.id}
                variant="announcement"
                message={announcement.message}
                announcementType={announcement.type}
              />
            ))
          ) : null}

          {user ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                {copy.alreadyLoggedIn}{" "}
                <span className="font-medium text-gray-900">
                  {displayName}
                </span>
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    router.push(
                      user.role === "superadmin" ? "/superadmin" : "/dashboard"
                    )
                  }
                  className="bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
                >
                  {copy.goDashboard}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    logout()
                      .catch(() => null)
                      .finally(() => setUser(null));
                  }}
                  className="border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-500"
                >
                  {copy.logout}
                </Button>
              </div>
            </div>
          ) : (
            <motion.form
              onSubmit={handleRegister}
              className="space-y-4"
              initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.45 }}
            >
              {step === 1 ? (
                <>
                  <div className="flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-dashed border-emerald-200 bg-emerald-50 text-emerald-600"
                    >
                      {profilePhotoPreviewUrl || profilePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profilePhotoPreviewUrl ?? profilePhotoUrl ?? undefined}
                          alt={copy.profilePhoto}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Camera className="h-8 w-8" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">{copy.firstName}</Label>
                      <Input
                        id="first-name"
                        required
                        autoComplete="given-name"
                        data-clarity-mask="true"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">{copy.lastName}</Label>
                      <Input
                        id="last-name"
                        required
                        autoComplete="family-name"
                        data-clarity-mask="true"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{copy.phone}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        autoComplete="tel"
                        data-clarity-mask="true"
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birth-date">{copy.birthDate}</Label>
                      <Input
                        id="birth-date"
                        type="date"
                        required
                        max={maxBirthDate}
                        autoComplete="bday"
                        data-clarity-mask="true"
                        value={birthDate}
                        onChange={(event) => setBirthDate(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="text-center text-xs text-gray-500 mt-4 px-2 select-none leading-relaxed">
                    {copy.acceptTermsPrefix}
                    <Link
                      href="/cgu"
                      target="_blank"
                      className="font-semibold text-emerald-600 hover:text-emerald-700 underline transition-colors"
                    >
                      {copy.acceptTermsCGULink}
                    </Link>
                    {copy.acceptTermsAnd}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="font-semibold text-emerald-600 hover:text-emerald-700 underline transition-colors"
                    >
                      {copy.acceptTermsPrivacyLink}
                    </Link>
                    {copy.acceptTermsSuffix}
                  </div>
                </>
              ) : step === 2 ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">{copy.email}</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      required
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      data-clarity-mask="true"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onBlur={() => {
                        const normalized = email.trim().toLowerCase();
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return;
                        void captureLeadSafe({
                          lead_id: registrationLeadId || undefined,
                          email: normalized,
                          language: locale,
                          current_step: 2,
                          event: "email_entered",
                        });
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div
                    ref={passwordFieldRef}
                    className="space-y-2"
                    onFocusCapture={() => setPasswordFieldActive(true)}
                    onBlurCapture={(event) => {
                      const nextFocused = event.relatedTarget as Node | null;
                      if (nextFocused && passwordFieldRef.current?.contains(nextFocused)) return;
                      setPasswordFieldActive(false);
                    }}
                  >
                    <Label htmlFor="reg-password">{copy.password}</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        data-clarity-mask="true"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className={`${inputClass} pr-10`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full p-0 text-gray-500 hover:text-emerald-600"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword
                            ? copy.hidePassword
                            : copy.showPassword
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400">
                      {copy.passwordHint}
                    </p>
                    {passwordFieldActive ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                        <ul className="space-y-1 text-xs">
                          {passwordRules.map((rule) => (
                            <li
                              key={rule.label}
                              className={rule.ok ? "text-emerald-700" : "text-red-600"}
                            >
                              {rule.ok ? "✓" : "•"} {rule.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password-confirm">
                      {copy.confirmPassword}
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-password-confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        data-clarity-mask="true"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        className={`${inputClass} pr-10`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full p-0 text-gray-500 hover:text-emerald-600"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword
                            ? copy.hidePassword
                            : copy.showPassword
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {recaptchaSiteKey ? (
                    <div className="space-y-2">
                      <Label>{copy.antiSpam}</Label>
                      <div ref={recaptchaContainerRef} />
                    </div>
                  ) : isDevEnvironment ? (
                    <div className="space-y-2">
                      <Label>{copy.antiSpam}</Label>
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {copy.recaptchaDevBypass}
                      </p>
                    </div>
                  ) : null}
                  <div className="text-right text-xs text-gray-500">
                    <a
                      href={`mailto:${supportEmail}`}
                      className="font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      {copy.support}
                    </a>
                  </div>
                </>
              ) : step === 3 ? (
                <>
                  <div className="space-y-2">
                    <Label>{copy.country}</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {COUNTRY_OPTIONS.map((item) => {
                        const selected = country === item.name;
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setCountry(item.name)}
                            className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                              selected
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-gray-100 bg-[var(--surface)] hover:border-emerald-200"
                            }`}
                            aria-pressed={selected}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/flags/${item.code}.png`}
                              alt={copy.flagAlt(countryLabels[item.name])}
                              className="h-6 w-8 rounded-sm border border-gray-100 object-cover"
                              loading="lazy"
                            />
                            <span className="font-medium text-gray-900">
                              {countryLabels[item.name]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="city">{copy.city}</Label>
                    <select
                      id="city"
                      required
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      className="h-10 w-full rounded-2xl border border-gray-200 bg-[var(--surface)] px-3 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!country}
                    >
                      <option value="" disabled>
                        {country ? copy.selectCity : copy.chooseCountryFirst}
                      </option>
                      {citiesForCountry.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : step === 4 ? (
                <>
                  <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/70 px-5 py-6 text-sm text-emerald-950">
                    <p className="text-lg font-semibold">
                      {copy.onboardingTitle}
                    </p>
                    <p className="mt-2">
                      {copy.onboardingBody}
                    </p>
                    <div className="mt-4">
                      <Button
                        type="button"
                        onClick={() => router.push("/onboarding?register=1")}
                        className="bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
                      >
                        {copy.onboardingOpen}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-gray-200 bg-[#fafaf8] px-4 py-4 text-sm text-gray-700">
                    {registerOnboardingPayload ? (
                      <p className="font-medium text-emerald-700">
                        {copy.onboardingDone}
                      </p>
                    ) : (
                      <p>
                        {copy.onboardingWaiting}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-gray-100 bg-[var(--surface)] px-4 py-4 text-sm text-gray-700">
                    <p className="text-base font-semibold text-gray-900">{copy.summaryTitle}</p>
                    <p className="mt-2">
                      {copy.summaryBody}
                    </p>
                    <div className="mt-2 space-y-1">
                      <p>1. {copy.profileLine}: <strong>{firstName} {lastName}</strong></p>
                      <p>2. {copy.emailLine}: <strong>{email.trim().toLowerCase()}</strong></p>
                      <p>3. {copy.countryCityLine}: <strong>{country ? countryLabels[country] : ""}</strong>{city ? ` · ${city}` : ""}</p>
                      <p>4. {copy.onboardingLine}: <strong>{registerOnboardingPayload ? copy.completed : copy.missing}</strong></p>
                    </div>
                    <p className="mt-2">
                      {copy.defaultEnvelopes} : <strong>Epargnes</strong> et <strong>Cash</strong>.
                    </p>
                    {currency ? (
                      <p className="mt-2">
                        {copy.selectedCurrency} : <strong>{currency}</strong>
                      </p>
                    ) : null}
                    {country ? (
                      <p className="mt-2">
                        {copy.countryLine} : <strong>{countryLabels[country]}</strong>
                        {city ? ` · ${copy.city} : ${city}` : ""}
                      </p>
                    ) : null}
                  </div>
                  {recaptchaSiteKey ? (
                    <div className="space-y-2">
                      <Label>{copy.antiSpam}</Label>
                      {recaptchaToken ? (
                        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                          {copy.recaptchaChecking}
                        </p>
                      ) : (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          {copy.recaptchaRequired}
                        </p>
                      )}
                    </div>
                  ) : isDevEnvironment ? (
                    <div className="space-y-2">
                      <Label>{copy.antiSpam}</Label>
                      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {copy.recaptchaDevBypass}
                      </p>
                    </div>
                  ) : null}
                </>
              )}

              {retryAfterSeconds ? (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {copy.retryIn}{" "}
                  <span className="font-semibold">
                    {formatDuration(retryAfterSeconds)}
                  </span>
                  .
                </p>
              ) : error ? (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <div className={`flex flex-wrap items-center justify-between gap-3 ${isOnboardingStep ? "hidden" : ""}`}>
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePrev}
                    className="h-[50px] rounded-xl border-[#E3E8DF] bg-white px-6 font-bold text-[#0A241D] hover:border-[#0A241D]"
                  >
                    {copy.back}
                  </Button>
                ) : (
                  <span />
                )}
              {step < 5 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (step === 3) {
                        void handleRegisterAndStartOnboarding();
                        return;
                      }
                      handleNext();
                    }}
                    isLoading={loading && step === 3}
                    disabled={registrationBlocked || loading}
                    className="rg-cta h-[50px] rounded-xl bg-[#17C777] px-6 font-bold text-[#06301F] shadow-[0_10px_22px_-10px_rgba(23,199,119,0.6)] transition hover:-translate-y-px hover:bg-[#0B8F53] hover:text-white"
                  >
                    {step === 3 ? copy.createAndStartOnboarding : step === 4 ? copy.onboardingOpen : copy.continue}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    isLoading={loading}
                    disabled={registrationBlocked || loading}
                    className="rg-cta h-[50px] rounded-xl bg-[#17C777] px-6 font-bold text-[#06301F] shadow-[0_10px_22px_-10px_rgba(23,199,119,0.6)] transition hover:-translate-y-px hover:bg-[#0B8F53] hover:text-white"
                  >
                    {copy.createFinalAccount}
                  </Button>
                )}
              </div>

              <div className={`flex flex-wrap items-center justify-center gap-2 text-center text-[0.87rem] font-semibold text-[#4E625A] ${isOnboardingStep ? "hidden" : ""}`}>
                <span>{copy.alreadyAccount}</span>
                <Link href="/login" className="font-extrabold text-[#0B8F53] hover:underline">
                  {copy.login}
                </Link>
                <span className="rg-sticker inline-flex items-center gap-1.5 rounded-full bg-[#F2A93B] px-3 py-1.5 text-[0.78rem] font-extrabold text-[#3A2400] shadow-[0_8px_18px_-8px_rgba(242,169,59,0.8)]">
                  <span aria-hidden="true">✦</span>
                  {copy.fabor}
                </span>
              </div>
            </motion.form>
          )}
        </Card>
            </motion.div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .rg-blob { position: absolute; border-radius: 9999px; filter: blur(70px); pointer-events: none; }
        .rg-blob-a {
          width: 420px; height: 420px; background: rgba(23,199,119,0.32);
          top: -150px; inset-inline-start: -140px; animation: rgDrift 18s ease-in-out infinite;
        }
        .rg-blob-b {
          width: 340px; height: 340px; background: rgba(76,126,255,0.22);
          bottom: -130px; inset-inline-end: -110px; animation: rgDrift 23s ease-in-out infinite reverse;
        }
        @keyframes rgDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, 44px) scale(1.12); }
        }
        .rg-spot {
          position: absolute; inset: 0; pointer-events: none; opacity: 0;
          transition: opacity 0.45s ease;
          background: radial-gradient(360px circle at var(--mx, 50%) var(--my, 30%), rgba(23,199,119,0.16), transparent 66%);
        }
        .rg-panel:hover .rg-spot { opacity: 1; }
        .rg-chip { animation: rgFloat 5.6s ease-in-out infinite; }
        .rg-chip:nth-child(2) { animation-delay: 0.9s; }
        .rg-chip:nth-child(3) { animation-delay: 1.8s; }
        @keyframes rgFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        .rg-intro .rg-rise {
          opacity: 0; transform: translateY(16px);
          animation: rgRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: var(--d, 0s);
        }
        @keyframes rgRise { to { opacity: 1; transform: none; } }
        [dir="rtl"] .rg-bar { transform: scaleX(-1); }
        .rg-cta { position: relative; overflow: hidden; }
        .rg-cta::after {
          content: ""; position: absolute; top: 0; left: -140%; width: 60%; height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent);
          transform: skewX(-18deg); transition: left 0.65s ease;
        }
        .rg-cta:hover::after { left: 150%; }
        .rg-sticker { transform: rotate(-4deg); animation: rgWob 4.2s ease-in-out infinite; }
        @keyframes rgWob {
          0%, 100% { transform: rotate(-4deg) scale(1); }
          50% { transform: rotate(3deg) scale(1.05); }
        }

        [data-register-locale="ar"],
        [data-register-locale="ar"] *,
        .register-arabic-font,
        .register-arabic-font * {
          font-family: "Cairo", sans-serif !important;
          font-optical-sizing: auto;
          letter-spacing: 0 !important;
        }
        [data-register-locale="ar"] svg,
        .register-arabic-font svg { font-family: initial !important; }
        [data-register-locale="ar"] .register-title,
        .register-arabic-font .register-title {
          font-family: "Cairo", sans-serif !important;
          font-weight: 800 !important;
          letter-spacing: 0 !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .rg-blob, .rg-chip, .rg-sticker { animation: none !important; }
          .rg-intro .rg-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
          .rg-cta::after { display: none; }
          .rg-spot { display: none; }
        }
      `}</style>
    </div>
  );
}
