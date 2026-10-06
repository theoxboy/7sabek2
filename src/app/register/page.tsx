"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Camera,
  Check,
  Eye,
  EyeOff,
  Home,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { Cairo, Fraunces, Manrope } from "next/font/google";

import { apiFetch, resetAuthClientState } from "@/lib/api";
import { fetchMe, logout, refreshAuthSession, markAuthSessionHint, type AuthUser } from "@/lib/auth";
import { usePlatformStatus } from "@/lib/usePlatformStatus";
import { getVisibleAnnouncements } from "@/lib/announcementVisibility";
import { SystemMessageCard } from "@/components/announcements/SystemMessageCard";
import { GuestModeButton } from "@/components/guest/GuestModeButton";
import { startGuestSession } from "@/lib/guestSession";
import { shouldShowDiscoveryWelcome } from "@/lib/guestWelcome";
import BrandLogo from "@/components/BrandLogo";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";
import { getAppVersionLabel } from "@/lib/app-version";
import { getTodayRegisterQuote, REGISTER_DAILY_QUOTES } from "@/lib/facts-quotes";

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

const arabicFont = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"] });

const DEFAULT_SWEEP_INTERVAL_DAYS = 7;
type CurrencyCode = "MAD" | "DZD" | "TND" | "EGP";
const COUNTRY_OPTIONS = [
  { name: "Maroc", code: "ma", defaultCurrency: "MAD" as CurrencyCode },
  { name: "Algérie", code: "dz", defaultCurrency: "DZD" as CurrencyCode },
  { name: "Tunisie", code: "tn", defaultCurrency: "TND" as CurrencyCode },
  { name: "Égypte", code: "eg", defaultCurrency: "EGP" as CurrencyCode },
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
    photoMustBeImage: "Le fichier doit être une image (PNG, JPG, WebP).",
    photoMaxSize: "La photo ne doit pas dépasser 13 Mo.",
    waitBeforeRetry: "Merci d’attendre avant de réessayer.",
    allFieldsRequired: "Tous les champs obligatoires doivent être remplis.",
    validEmail: "Merci d’entrer une adresse email valide.",
    passwordsMismatch: "Les deux mots de passe ne correspondent pas.",
    recaptchaRequired: "Veuillez valider la vérification de sécurité.",
    recaptchaFailed: "Échec de vérification reCAPTCHA. Merci de réessayer.",
    recaptchaMissingConfig: "Configuration reCAPTCHA manquante. Ajoute NEXT_PUBLIC_RECAPTCHA_SITE_KEY.",
    recaptchaDevBypass: "Mode dev : vérification de sécurité contournée localement.",
    recaptchaChecking: "Protection anti-spam validée avec succès.",
    completeInfo: "Merci de renseigner tous les champs requis.",
    phoneTooShort: "Le numéro de téléphone est trop court (au moins 8 chiffres).",
    invalidBirthDate: "La date de naissance est invalide.",
    minAge: "L’inscription requiert d’avoir au moins 13 ans.",
    chooseCountryCity: "Merci de sélectionner un pays et une ville.",
    validCity: "Merci de choisir une ville valide.",
    currencyUnavailable: "Devise indisponible pour ce pays.",
    tooManyAttempts: "Trop de tentatives. Merci de réessayer dans un instant.",
    accountExists: "Un compte existe déjà avec cette adresse email.",
    weakPassword: "Le mot de passe ne respecte pas les exigences minimales.",
    weakPasswordRule: "Le mot de passe doit comporter au moins 8 caractères, dont une lettre et un chiffre.",
    compromisedPassword: "Ce mot de passe est trop courant. Choisis-en un plus sécurisé.",
    passwordRuleMinLength: "Au moins 8 caractères",
    passwordRuleLetter: "Au moins 1 lettre",
    passwordRuleDigit: "Au moins 1 chiffre",
    passwordRuleNotCompromised: "Mot de passe sûr et robuste",
    passwordStrengthWeak: "Faible",
    passwordStrengthMedium: "Moyen",
    passwordStrengthStrong: "Robuste",
    createAccountFailed: "Impossible de créer le compte pour le moment. Réessaie.",
    heroTitle: "7sabek n’est pas juste une application..",
    heroSubtitle: "7sabek est la discipline qui transforme durablement votre vie financière.",
    baOmarName: "Ba Omar",
    baOmarRole: "Votre allié financier",
    baOmarQuote: "« Marhaban bik ! En quelques secondes, créons ton compte pour reprendre le contrôle de ton budget avec la méthode des enveloppes. »",
    envelopeLabel: "Enveloppe Active",
    envelopeCategory: "Alimentation & Courses",
    addExpenseQuick: "Ajout rapide",
    fabor: "c’est faboooor",
    step1Pill: "1. Compte & Accès",
    step2Pill: "2. Profil & Finalisation",
    step1Title: "Crée ton compte 7sabek",
    step1Subtitle: "Renseigne tes informations pour configurer ton espace personnel.",
    step2Title: "Finalise ton profil",
    step2Subtitle: "Dernière étape pour personnaliser tes enveloppes budgétaires.",
    maintenanceSuffix: "Les inscriptions sont désactivées pendant la maintenance.",
    alreadyLoggedIn: "Tu es déjà connecté en tant que",
    goDashboard: "Accéder au tableau de bord",
    logout: "Se déconnecter",
    profilePhoto: "Photo de profil (optionnelle)",
    profilePhotoChange: "Changer la photo",
    profilePhotoRemove: "Supprimer",
    firstName: "Prénom",
    firstNamePlaceholder: "Ex. Youssef",
    lastName: "Nom",
    lastNamePlaceholder: "Ex. Bennani",
    phone: "Numéro de téléphone",
    phonePlaceholder: "06 12 34 56 78",
    birthDate: "Date de naissance",
    email: "Adresse email",
    emailPlaceholder: "nom@exemple.ma",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    hidePassword: "Masquer le mot de passe",
    showPassword: "Afficher le mot de passe",
    passwordHint: "8 caractères minimum, avec au moins 1 lettre et 1 chiffre.",
    country: "Pays de résidence",
    city: "Ville",
    selectCity: "Sélectionner une ville",
    chooseCountryFirst: "Choisis d'abord un pays",
    continueToStep2: "Continuer vers le profil",
    backToStep1: "Retour",
    createFinalAccount: "Créer mon compte et démarrer",
    creatingAccount: "Création de ton compte en cours...",
    alreadyAccount: "Tu as déjà un compte ?",
    login: "Se connecter",
    flagAlt: (name: string) => `Drapeau ${name}`,
    acceptTermsPrefix: "En créant ton compte, tu acceptes les ",
    acceptTermsCGULink: "Conditions d'Utilisation (CGU)",
    acceptTermsAnd: " et la ",
    acceptTermsPrivacyLink: "Politique de Confidentialité",
    acceptTermsSuffix: " de 7sabek.ma.",
    tryWithoutAccount: "Essayer sans compte",
    tryWithoutAccountHint: "Découvre 7sabek instantanément en mode invité, sans e-mail ni engagement.",
    guestStartError: "Impossible de démarrer le mode découverte. Réessaie.",
    retryIn: "Trop de tentatives. Réessaie dans",
    trustFeature1: "100% gratuit et pensé pour le Maroc",
    trustFeature2: "Vous savez quoi dépenser chaque jour sans stress",
    trustFeature3: "Données chiffrées et protégées en toute confidentialité",
  },
  en: {
    photoMustBeImage: "The file must be an image (PNG, JPG, WebP).",
    photoMaxSize: "Profile photo must be 13 MB or less.",
    waitBeforeRetry: "Please wait before trying again.",
    allFieldsRequired: "All required fields must be completed.",
    validEmail: "Please enter a valid email address.",
    passwordsMismatch: "Passwords do not match.",
    recaptchaRequired: "Please verify you are not a robot.",
    recaptchaFailed: "Security verification failed. Please try again.",
    recaptchaMissingConfig: "Missing reCAPTCHA configuration. Add NEXT_PUBLIC_RECAPTCHA_SITE_KEY.",
    recaptchaDevBypass: "Dev mode: security verification bypassed locally.",
    recaptchaChecking: "Anti-spam verification passed.",
    completeInfo: "Please complete all required fields.",
    phoneTooShort: "Phone number is too short (at least 8 digits).",
    invalidBirthDate: "Birth date is invalid.",
    minAge: "You must be at least 13 years old.",
    chooseCountryCity: "Please select a country and city.",
    validCity: "Please select a valid city.",
    currencyUnavailable: "Currency is unavailable for this country.",
    tooManyAttempts: "Too many attempts. Please try again shortly.",
    accountExists: "An account already exists with this email.",
    weakPassword: "Password does not meet minimum security requirements.",
    weakPasswordRule: "Password must have at least 8 characters, including a letter and a number.",
    compromisedPassword: "This password is too common. Please choose a stronger one.",
    passwordRuleMinLength: "At least 8 characters",
    passwordRuleLetter: "At least 1 letter",
    passwordRuleDigit: "At least 1 number",
    passwordRuleNotCompromised: "Strong & safe password",
    passwordStrengthWeak: "Weak",
    passwordStrengthMedium: "Medium",
    passwordStrengthStrong: "Strong",
    createAccountFailed: "Unable to create account right now. Please try again.",
    heroTitle: "7sabek is more than just an app..",
    heroSubtitle: "7sabek is the discipline that transforms your financial trajectory.",
    baOmarName: "Ba Omar",
    baOmarRole: "Your financial copilot",
    baOmarQuote: "“Welcome! In just a few seconds, let's create your account to take full control of your finances with envelope budgeting.”",
    envelopeLabel: "Active Envelope",
    envelopeCategory: "Groceries & Food",
    addExpenseQuick: "Quick add",
    fabor: "it’s freeeee",
    step1Pill: "1. Account & Credentials",
    step2Pill: "2. Profile & Complete",
    step1Title: "Create your 7sabek account",
    step1Subtitle: "Fill in your details to set up your personal budget space.",
    step2Title: "Complete your profile",
    step2Subtitle: "Final step to personalize your budget envelopes.",
    maintenanceSuffix: "Signups are disabled during maintenance.",
    alreadyLoggedIn: "You are already signed in as",
    goDashboard: "Go to dashboard",
    logout: "Log out",
    profilePhoto: "Profile photo (optional)",
    profilePhotoChange: "Change photo",
    profilePhotoRemove: "Remove",
    firstName: "First name",
    firstNamePlaceholder: "e.g. Youssef",
    lastName: "Last name",
    lastNamePlaceholder: "e.g. Bennani",
    phone: "Phone number",
    phonePlaceholder: "06 12 34 56 78",
    birthDate: "Birth date",
    email: "Email address",
    emailPlaceholder: "name@example.com",
    password: "Password",
    confirmPassword: "Confirm password",
    hidePassword: "Hide password",
    showPassword: "Show password",
    passwordHint: "8 characters minimum, with at least 1 letter and 1 number.",
    country: "Country of residence",
    city: "City",
    selectCity: "Select a city",
    chooseCountryFirst: "Choose a country first",
    continueToStep2: "Continue to profile",
    backToStep1: "Back",
    createFinalAccount: "Create account and start",
    creatingAccount: "Creating your account...",
    alreadyAccount: "Already have an account?",
    login: "Sign in",
    flagAlt: (name: string) => `${name} flag`,
    acceptTermsPrefix: "By creating an account, you accept the ",
    acceptTermsCGULink: "Terms of Service",
    acceptTermsAnd: " and the ",
    acceptTermsPrivacyLink: "Privacy Policy",
    acceptTermsSuffix: " of 7sabek.ma.",
    tryWithoutAccount: "Try without an account",
    tryWithoutAccountHint: "Explore 7sabek instantly in guest mode, no email or commitment required.",
    guestStartError: "Unable to start discovery mode. Please try again.",
    retryIn: "Too many attempts. Try again in",
    trustFeature1: "100% free and tailored for Morocco",
    trustFeature2: "Clear daily spending limit with zero guesswork",
    trustFeature3: "Bank-grade encryption and total privacy",
  },
  ar: {
    photoMustBeImage: "الملف خاصو يكون صورة (PNG أو JPG أو WebP).",
    photoMaxSize: "الصورة ما خاصهاش تفوت 13 ميغابايت.",
    waitBeforeRetry: "تسنى شوية عاد تعاود المحاولة.",
    allFieldsRequired: "عمر جميع الخانات الضرورية عافاك.",
    validEmail: "دخل عنوان بريد إلكتروني صحيح.",
    passwordsMismatch: "كلمات السر ما متطابقينش.",
    recaptchaRequired: "أكد أنك ماشي روبوت باش نكملو.",
    recaptchaFailed: "ما قدرناش نتحققو من الحماية. عاود المحاولة.",
    recaptchaMissingConfig: "إعداد reCAPTCHA ناقص. زيد NEXT_PUBLIC_RECAPTCHA_SITE_KEY.",
    recaptchaDevBypass: "وضع التطوير: تم تجاوز التحقق الأمني محلياً.",
    recaptchaChecking: "تم التحقق من الحماية بنجاح.",
    completeInfo: "عمر جميع المعلومات المطلوبة.",
    phoneTooShort: "رقم الهاتف قصير بزاف (على الأقل 8 أرقام).",
    invalidBirthDate: "تاريخ الازدياد ما صالحش.",
    minAge: "خاص يكون العمر على الأقل 13 عام.",
    chooseCountryCity: "اختار البلد والمدينة.",
    validCity: "اختار مدينة صالحة.",
    currencyUnavailable: "العملة ما متوفراش لهاد البلد.",
    tooManyAttempts: "كاين بزاف ديال المحاولات. عاود من بعد شوية.",
    accountExists: "كاين حساب مسجل بهاد الإيميل من قبل.",
    weakPassword: "كلمة السر ضعيفة وما كتحترمش الشروط.",
    weakPasswordRule: "كلمة السر خاصها تكون فيها على الأقل 8 حروف، وفيها حرف ورقم.",
    compromisedPassword: "هاد كلمة السر معروفة وضعيفة بزاف. اختار وحدة أقوى.",
    passwordRuleMinLength: "على الأقل 8 حروف",
    passwordRuleLetter: "على الأقل 1 حرف",
    passwordRuleDigit: "على الأقل 1 رقم",
    passwordRuleNotCompromised: "كلمة سر قوية وآمنة",
    passwordStrengthWeak: "ضعيفة",
    passwordStrengthMedium: "متوسطة",
    passwordStrengthStrong: "قوية ومحمية",
    createAccountFailed: "ما قدرناش نصاوبو الحساب دابا. عاود المحاولة.",
    heroTitle: "7sabek ماشي مجرد تطبيق..",
    heroSubtitle: "7sabek هو الديسيبلين اللي كيبدّل مجرى حياتك المالية.",
    baOmarName: "با عمر",
    baOmarRole: "رفيقك المالي",
    baOmarQuote: "« مرحباً بك! فثواني معدودة، غادي نصاوبو حسابك باش تبدا صفحة نقية مع فلوسك. »",
    envelopeLabel: "الظرف النشط",
    envelopeCategory: "التغذية والتقدية",
    addExpenseQuick: "إضافة سريعة",
    fabor: "فابووووور",
    step1Pill: "1. الحساب والدخول",
    step2Pill: "2. البروفايل والتأكيد",
    step1Title: "صاوب حسابك فـ 7sabek",
    step1Subtitle: "دخل معلوماتك الأساسية باش نجهزو مساحتك المالية الخاصة.",
    step2Title: "كمّل البروفايل ديالك",
    step2Subtitle: "آخر خطوة باش نخصصو الأظرفة ديال الميزانية ديالك.",
    maintenanceSuffix: "التسجيل موقف أثناء الصيانة.",
    alreadyLoggedIn: "راك داير الدخول بهاد الحساب",
    goDashboard: "سير للوحة التحكم",
    logout: "تسجيل الخروج",
    profilePhoto: "صورة البروفايل (اختيارية)",
    profilePhotoChange: "تبديل الصورة",
    profilePhotoRemove: "حذف",
    firstName: "الاسم الشخصي",
    firstNamePlaceholder: "مثلاً: يوسف",
    lastName: "النسب (اسم العائلة)",
    lastNamePlaceholder: "مثلاً: بناني",
    phone: "رقم الهاتف",
    phonePlaceholder: "06 12 34 56 78",
    birthDate: "تاريخ الازدياد",
    email: "البريد الإلكتروني",
    emailPlaceholder: "nom@exemple.ma",
    password: "كلمة السر",
    confirmPassword: "أكد كلمة السر",
    hidePassword: "خبي كلمة السر",
    showPassword: "بيّن كلمة السر",
    passwordHint: "8 حروف على الأقل، وحرف واحد، ورقم واحد.",
    country: "بلد الإقامة",
    city: "المدينة",
    selectCity: "اختار المدينة",
    chooseCountryFirst: "اختار البلد أولاً",
    continueToStep2: "المتابعة نحو البروفايل",
    backToStep1: "رجوع",
    createFinalAccount: "صاوب حسابي وابدأ دابا",
    creatingAccount: "كنصاوبو فالحساب ديالك...",
    alreadyAccount: "عندك حساب من قبل؟",
    login: "دخل لحسابك",
    flagAlt: (name: string) => `علم ${name}`,
    acceptTermsPrefix: "بإنشاء حسابك، فإنك توافق على ",
    acceptTermsCGULink: "شروط الاستخدام (CGU)",
    acceptTermsAnd: " و ",
    acceptTermsPrivacyLink: "سياسة الخصوصية",
    acceptTermsSuffix: " لـ 7sabek.ma.",
    tryWithoutAccount: "جرّب بلا حساب كضيف",
    tryWithoutAccountHint: "اكتشف 7sabek دابا فوضع الضيف، بلا إيميل وبلا كلمة سر.",
    guestStartError: "ما قدرناش نبداو وضع الاكتشاف. عاود المحاولة.",
    retryIn: "كاين بزاف ديال المحاولات. عاود ف",
    trustFeature1: "100% فابور ومصمم للمغرب",
    trustFeature2: "كتعرف شحال باقي تصرف كل نهار",
    trustFeature3: "بياناتك مشفرة ومحفوظة فسرّية تامة",
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

  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [introReady, setIntroReady] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = usePlatformStatus();

  // Step 1: Account & Credentials
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFieldActive, setPasswordFieldActive] = useState(false);
  const [country, setCountry] = useState<CountryName>("Maroc");
  const [city, setCity] = useState("Casablanca");
  const [currency, setCurrency] = useState<CurrencyCode>("MAD");

  // Step 2: Profile & Verification
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaWidgetRef = useRef<number | null>(null);
  const recaptchaNodeRef = useRef<HTMLDivElement | null>(null);
  const [recaptchaScriptLoaded, setRecaptchaScriptLoaded] = useState(false);

  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [registerOnboardingPayload, setRegisterOnboardingPayload] =
    useState<RegisterOnboardingPayload | null>(null);
  const [registrationLeadId, setRegistrationLeadId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const passwordFieldRef = useRef<HTMLDivElement | null>(null);
  const profilePhotoBlobUrlRef = useRef<string | null>(null);
  const submitInFlightRef = useRef(false);

  const maintenanceActive = Boolean(status?.maintenance_mode);
  const registrationBlocked = maintenanceActive || Boolean(retryAfterSeconds);
  const copy = REGISTER_COPY[locale];
  const appVersionLabel = getAppVersionLabel();
  const countryLabels = COUNTRY_LABELS[locale];
  const pageDir = getLocaleDirection(locale);
  const pageFontClass = `${arabicFont.className} ${locale === "ar" ? "register-arabic-font" : ""}`;
  const headingClass = arabicFont.className;
  const copyClass = locale === "ar" ? "register-copy" : "";

  const [guestLoading, setGuestLoading] = useState(false);
  const [todayQuote, setTodayQuote] = useState<string>(
    () => getTodayRegisterQuote(locale)
  );

  useEffect(() => {
    setTodayQuote(getTodayRegisterQuote(locale));
  }, [locale]);

  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
  const isDevEnvironment = process.env.NODE_ENV !== "production";
  const allowRecaptchaBypass = isDevEnvironment && !recaptchaSiteKey;

  // Visual Input classes matching modern fintech aesthetic
  const inputClass =
    "h-[50px] w-full rounded-xl border-[#E3E8DF] bg-white ps-11 text-[15px] font-semibold text-[#0A241D] shadow-none placeholder:font-normal placeholder:text-[#A9B5AF] focus-visible:border-[#17C777] focus-visible:ring-[3px] focus-visible:ring-[#E2F7EC] focus-visible:ring-offset-0 transition-all";
  const ICON_WRAP =
    "pointer-events-none absolute inset-y-0 start-0 flex w-11 items-center justify-center text-[#7C8D86] transition-colors";

  const formatDuration = (seconds: number) => {
    const total = Math.max(seconds, 0);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    if (mins <= 0) return `${secs}s`;
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
    if (reduceMotion) return;
    if (typeof document === "undefined") return;
    if (document.visibilityState === "visible") setIntroReady(true);
  }, [reduceMotion]);

  useEffect(() => {
    setLocale(getBrowserLocalePreference() ?? "fr");
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  // Fetch logged in user to prevent double register
  useEffect(() => {
    fetchMe()
      .then((me) => setUser(me))
      .catch(() => setUser(null));
  }, []);

  // Prefill restore
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
      if (raw) {
        const parsed = JSON.parse(raw) as RegisterOnboardingPayload;
        if (parsed?.answers && parsed?.draft_objects) {
          setRegisterOnboardingPayload(parsed);
        }
      }
    } catch {
      return;
    }
  }, []);

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

  // reCAPTCHA Script loader
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
      } else {
        recaptchaWidgetRef.current = null;
      }
    },
    [renderRecaptchaWidget],
  );

  useEffect(() => {
    if (step === 2 && recaptchaScriptLoaded && recaptchaNodeRef.current) {
      renderRecaptchaWidget(recaptchaNodeRef.current);
    }
  }, [step, recaptchaScriptLoaded, renderRecaptchaWidget]);

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

  const handleRemovePhoto = () => {
    if (profilePhotoPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(profilePhotoPreviewUrl);
    }
    setProfilePhotoPreviewUrl(null);
    setProfilePhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const citiesForCountry = useMemo(
    () => (country && country in CITIES_BY_COUNTRY ? CITIES_BY_COUNTRY[country] : []),
    [country]
  );

  useEffect(() => {
    if (!country) return;
    const nextCurrency = CURRENCY_BY_COUNTRY[country];
    if (nextCurrency && nextCurrency !== currency) {
      setCurrency(nextCurrency);
    }
    if (!citiesForCountry.includes(city)) {
      setCity(citiesForCountry[0] || "");
    }
  }, [country, city, citiesForCountry, currency]);

  // Password rules validation
  const passwordRules = useMemo(() => {
    const minLength = password.length >= EASY_MIN_PASSWORD_LENGTH;
    const hasLetter = PASSWORD_HAS_LETTER_RE.test(password);
    const hasDigit = PASSWORD_HAS_DIGIT_RE.test(password);
    const notCompromised = !COMPROMISED_PASSWORDS.has(password.trim().toLowerCase());
    return [
      { label: copy.passwordRuleMinLength, ok: minLength },
      { label: copy.passwordRuleLetter, ok: hasLetter },
      { label: copy.passwordRuleDigit, ok: hasDigit },
      { label: copy.passwordRuleNotCompromised, ok: notCompromised },
    ];
  }, [copy, password]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= EASY_MIN_PASSWORD_LENGTH) score += 1;
    if (PASSWORD_HAS_LETTER_RE.test(password)) score += 1;
    if (PASSWORD_HAS_DIGIT_RE.test(password)) score += 1;
    if (password.length >= 10) score += 1;
    return score;
  }, [password]);

  const maxBirthDate = useMemo(() => {
    const today = new Date();
    const max = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    return max.toISOString().slice(0, 10);
  }, []);

  const validateStep1 = () => {
    if (retryAfterSeconds) {
      setError(copy.waitBeforeRetry);
      return false;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError(copy.allFieldsRequired);
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(copy.validEmail);
      return false;
    }
    if (!password || !confirmPassword) {
      setError(copy.allFieldsRequired);
      return false;
    }
    if (password !== confirmPassword) {
      setError(copy.passwordsMismatch);
      return false;
    }
    if (password.length < EASY_MIN_PASSWORD_LENGTH || !PASSWORD_HAS_LETTER_RE.test(password) || !PASSWORD_HAS_DIGIT_RE.test(password)) {
      setError(copy.weakPasswordRule);
      return false;
    }
    if (COMPROMISED_PASSWORDS.has(password.trim().toLowerCase())) {
      setError(copy.compromisedPassword);
      return false;
    }
    if (!country || !city) {
      setError(copy.chooseCountryCity);
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!phoneNumber.trim() || phoneNumber.trim().length < 8) {
      setError(copy.phoneTooShort);
      return false;
    }
    if (!birthDate) {
      setError(copy.invalidBirthDate);
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

  const handleNextToStep2 = () => {
    if (loading || submitInFlightRef.current) return;
    if (!validateStep1()) return;

    void captureLeadSafe({
      lead_id: registrationLeadId || undefined,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      country,
      city,
      language: locale,
      current_step: 1,
      event: "step1_completed",
    });

    setError(null);
    setStep(2);
  };

  const handlePrevToStep1 = () => {
    setError(null);
    setStep(1);
  };

  const handleRegisterAndStartOnboarding = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (loading || submitInFlightRef.current) return;
    if (maintenanceActive) return;

    if (!validateStep1() || !validateStep2()) {
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
          ...(registerOnboardingPayload?.answers
            ? { onboarding_v2_answers: registerOnboardingPayload.answers }
            : {}),
          ...(registerOnboardingPayload?.draft_objects
            ? { onboarding_v2_draft_objects: registerOnboardingPayload.draft_objects }
            : {}),
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
      } else if (lower.includes("recaptcha_required") || message.includes("أكد أنك ماشي روبوت")) {
        setError(copy.recaptchaRequired);
      } else if (lower.includes("recaptcha_failed") || message.includes("ما قدرناش نتحققو")) {
        setError(copy.recaptchaFailed);
      } else if (lower.includes("exists") || lower.includes("already")) {
        setError(copy.accountExists);
        setStep(1);
      } else if (lower.includes("password")) {
        setError(copy.weakPassword);
        setStep(1);
      } else {
        setError(copy.createAccountFailed);
      }
    } finally {
      setLoading(false);
      submitInFlightRef.current = false;
      resetRecaptcha();
    }
  };

  const handleGuestStart = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      resetAuthClientState();
      const guest = await startGuestSession();
      markAuthSessionHint();
      router.push(shouldShowDiscoveryWelcome(guest) ? "/decouverte" : "/dashboard");
    } catch {
      setError(copy.guestStartError);
    } finally {
      setGuestLoading(false);
    }
  };

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
    : null;
  const maintenanceMessage =
    status?.maintenance_mode && status.maintenance_message ? status.maintenance_message : "";
  const maintenancePlacements = status?.maintenance_placements ?? [];
  const showMaintenanceBanner =
    Boolean(maintenanceMessage.trim()) && maintenancePlacements.includes("register");
  const registerAnnouncements = getVisibleAnnouncements(status, user, "register");
  const showAnnouncementBanner = registerAnnouncements.length > 0;

  return (
    <div
      className={`rg-root relative min-h-screen bg-[#F6F8F4] ${pageFontClass} ${introReady ? "rg-intro" : ""}`}
      dir={pageDir}
      data-register-locale={locale}
    >
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        {/* ---------------- LEFT BRAND PANEL ---------------- */}
        <aside
          className={`rg-panel relative hidden flex-col gap-8 overflow-hidden bg-[linear-gradient(155deg,#124636_0%,#0A241D_62%)] p-10 text-[#EAF4EF] lg:flex ${copyClass}`}
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

          {/* Logo */}
          <div className="relative z-10">
            <BrandLogo locale={locale} tone="dark" className="-ms-3 h-20 w-auto" />
          </div>

          {/* Centered Daily Quote */}
          <div className="relative z-10 my-auto space-y-4">
            <h2 className={`${headingClass} rg-rise ${locale === "ar" ? "text-[1.85rem] leading-[1.38]" : "text-[1.95rem] leading-[1.3]"} font-extrabold text-white`} style={{ "--d": ".18s" } as React.CSSProperties}>
              {`« ${todayQuote} »`}
            </h2>
          </div>


        </aside>

        {/* ---------------- RIGHT FORM PANEL ---------------- */}
        <main className={`flex flex-col px-5 pb-12 pt-6 sm:px-8 lg:px-12 lg:pt-8 ${copyClass}`}>
          {/* Top navigation row */}
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              aria-label="Accueil 7sabek"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E3E8DF] bg-white text-[#4E625A] shadow-sm transition hover:border-[#17C777] hover:text-[#0B8F53]"
            >
              <Home className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-xs font-bold text-[#0B8F53] hover:underline"
              >
                {copy.login}
              </Link>
              <Link
                href="/releases"
                title="Journal des versions 7sabek"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E8DF] bg-white px-3 py-1 text-[0.72rem] font-extrabold text-[#7C8D86] shadow-xs transition hover:border-[#17C777] hover:text-[#0B8F53]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#17C777]" />
                <span>7sabek {appVersionLabel}</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center pt-4">
            <motion.div
              className="w-full max-w-[500px]"
              initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Mobile Brand Logo */}
              <div className="mb-6 flex flex-col items-center gap-2 text-center lg:hidden">
                <BrandLogo locale={locale} className="h-14 w-auto object-contain" />
              </div>

              {/* Maintenance / Announcements */}
              {showMaintenanceBanner ? (
                <div className="mb-4">
                  <SystemMessageCard
                    variant="maintenance"
                    message={maintenanceMessage}
                    suffix={copy.maintenanceSuffix}
                  />
                </div>
              ) : null}
              {showAnnouncementBanner ? (
                <div className="mb-4 space-y-2">
                  {registerAnnouncements.map((announcement) => (
                    <SystemMessageCard
                      key={announcement.id}
                      variant="announcement"
                      message={announcement.message}
                      announcementType={announcement.type}
                    />
                  ))}
                </div>
              ) : null}

              {/* Already logged-in state */}
              {user ? (
                <div className="space-y-4 rounded-2xl border border-[#E3E8DF] bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-[#4E625A]">
                    {copy.alreadyLoggedIn}{" "}
                    <span className="font-extrabold text-[#0A241D]">{displayName}</span>
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <Button
                      onClick={() =>
                        router.push(user.role === "superadmin" ? "/superadmin" : "/dashboard")
                      }
                      className="h-[46px] rounded-xl bg-[#17C777] px-6 font-bold text-[#06301F] shadow-sm hover:bg-[#0B8F53] hover:text-white"
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
                      className="h-[46px] rounded-xl border-[#E3E8DF] bg-white px-5 font-bold text-[#0A241D] hover:border-[#0A241D]"
                    >
                      {copy.logout}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Two-step Header & Visual Stepper */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h1 className={`${headingClass} text-[clamp(1.6rem,2.8vw,2.1rem)] font-extrabold tracking-tight text-[#0A241D]`}>
                        {step === 1 ? copy.step1Title : copy.step2Title}
                      </h1>
                      <span className="rounded-full bg-[#E2F7EC] px-3 py-1 text-xs font-extrabold text-[#0B8F53]">
                        {step === 1 ? "1 / 2" : "2 / 2"}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.92rem] text-[#4E625A]">
                      {step === 1 ? copy.step1Subtitle : copy.step2Subtitle}
                    </p>

                    {/* Stepper Progress Bar */}
                    <div className="mt-4">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E3E8DF]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#17C777,#0B8F53)] transition-all duration-500 ease-out"
                          style={{ width: step === 1 ? "50%" : "100%" }}
                        />
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-xs font-extrabold">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className={`flex items-center gap-1.5 transition-colors ${
                            step === 1 ? "text-[#0B8F53]" : "text-[#4E625A] hover:text-[#0B8F53]"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                              step === 1
                                ? "bg-[#0B8F53] text-white"
                                : "bg-[#E2F7EC] text-[#0B8F53]"
                            }`}
                          >
                            1
                          </span>
                          <span>{copy.step1Pill}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (validateStep1()) setStep(2);
                          }}
                          className={`flex items-center gap-1.5 transition-colors ${
                            step === 2 ? "text-[#0B8F53]" : "text-[#7C8D86]"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                              step === 2
                                ? "bg-[#0B8F53] text-white"
                                : "bg-[#E3E8DF] text-[#7C8D86]"
                            }`}
                          >
                            2
                          </span>
                          <span>{copy.step2Pill}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Errors */}
                  {retryAfterSeconds ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700">
                      <AlertCircle className="h-4 w-4 flex-none" />
                      <span>
                        {copy.retryIn} {formatDuration(retryAfterSeconds)}
                      </span>
                    </div>
                  ) : error ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700">
                      <AlertCircle className="h-4 w-4 flex-none" />
                      <span>{error}</span>
                    </div>
                  ) : null}

                  {/* FORM BODY */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (step === 1) {
                        handleNextToStep2();
                      } else {
                        void handleRegisterAndStartOnboarding(e);
                      }
                    }}
                    className="space-y-4"
                  >
                    {step === 1 ? (
                      /* ================= STEP 1: COMPTE & IDENTIFIANTS ================= */
                      <motion.div
                        key="step-1"
                        initial={reduceMotion ? undefined : { opacity: 0, x: -14 }}
                        animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, x: 14 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-4"
                      >
                        {/* First name & Last name grid */}
                        <div className="grid gap-3.5 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="reg-first-name" className="text-xs font-extrabold text-[#4E625A]">
                              {copy.firstName} *
                            </Label>
                            <div className="relative flex items-center">
                              <span className={ICON_WRAP}>
                                <User className="h-4 w-4" />
                              </span>
                              <Input
                                id="reg-first-name"
                                required
                                autoComplete="given-name"
                                placeholder={copy.firstNamePlaceholder}
                                value={firstName}
                                onChange={(e) => {
                                  setFirstName(e.target.value);
                                  setError(null);
                                }}
                                className={inputClass}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="reg-last-name" className="text-xs font-extrabold text-[#4E625A]">
                              {copy.lastName} *
                            </Label>
                            <div className="relative flex items-center">
                              <span className={ICON_WRAP}>
                                <User className="h-4 w-4" />
                              </span>
                              <Input
                                id="reg-last-name"
                                required
                                autoComplete="family-name"
                                placeholder={copy.lastNamePlaceholder}
                                value={lastName}
                                onChange={(e) => {
                                  setLastName(e.target.value);
                                  setError(null);
                                }}
                                className={inputClass}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                          <Label htmlFor="reg-email" className="text-xs font-extrabold text-[#4E625A]">
                            {copy.email} *
                          </Label>
                          <div className="relative flex items-center">
                            <span className={ICON_WRAP}>
                              <Mail className="h-4 w-4" />
                            </span>
                            <Input
                              id="reg-email"
                              type="email"
                              required
                              autoComplete="email"
                              placeholder={copy.emailPlaceholder}
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                setError(null);
                              }}
                              className={inputClass}
                            />
                          </div>
                        </div>

                        {/* Password & Confirm Password */}
                        <div className="grid gap-3.5 sm:grid-cols-2">
                          <div
                            ref={passwordFieldRef}
                            className="space-y-1.5"
                            onFocusCapture={() => setPasswordFieldActive(true)}
                            onBlurCapture={(e) => {
                              const nextFocused = e.relatedTarget as Node | null;
                              if (nextFocused && passwordFieldRef.current?.contains(nextFocused)) return;
                              setPasswordFieldActive(false);
                            }}
                          >
                            <Label htmlFor="reg-password" className="text-xs font-extrabold text-[#4E625A]">
                              {copy.password} *
                            </Label>
                            <div className="relative flex items-center">
                              <span className={ICON_WRAP}>
                                <Lock className="h-4 w-4" />
                              </span>
                              <Input
                                id="reg-password"
                                type={showPassword ? "text" : "password"}
                                required
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => {
                                  setPassword(e.target.value);
                                  setError(null);
                                }}
                                className={`${inputClass} pe-11`}
                              />
                              <button
                                type="button"
                                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#7C8D86] hover:bg-[#EEF1EA] hover:text-[#0A241D]"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="reg-password-confirm" className="text-xs font-extrabold text-[#4E625A]">
                              {copy.confirmPassword} *
                            </Label>
                            <div className="relative flex items-center">
                              <span className={ICON_WRAP}>
                                <Lock className="h-4 w-4" />
                              </span>
                              <Input
                                id="reg-password-confirm"
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => {
                                  setConfirmPassword(e.target.value);
                                  setError(null);
                                }}
                                className={`${inputClass} pe-11`}
                              />
                              <button
                                type="button"
                                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#7C8D86] hover:bg-[#EEF1EA] hover:text-[#0A241D]"
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                aria-label={showConfirmPassword ? copy.hidePassword : copy.showPassword}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Password strength mini indicator */}
                        {password ? (
                          <div className="rounded-xl border border-[#E3E8DF] bg-white p-3 shadow-xs">
                            <div className="mb-2 flex items-center justify-between text-xs">
                              <span className="font-bold text-[#7C8D86]">Force du mot de passe :</span>
                              <span
                                className={`font-extrabold ${
                                  passwordScore <= 1
                                    ? "text-red-500"
                                    : passwordScore <= 3
                                    ? "text-amber-500"
                                    : "text-[#0B8F53]"
                                }`}
                              >
                                {passwordScore <= 1
                                  ? copy.passwordStrengthWeak
                                  : passwordScore <= 3
                                  ? copy.passwordStrengthMedium
                                  : copy.passwordStrengthStrong}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EEF1EA]">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  passwordScore <= 1
                                    ? "bg-red-500"
                                    : passwordScore <= 3
                                    ? "bg-amber-500"
                                    : "bg-[#17C777]"
                                }`}
                                style={{ width: `${(passwordScore / 4) * 100}%` }}
                              />
                            </div>
                            {passwordFieldActive ? (
                              <ul className="mt-2.5 grid grid-cols-2 gap-1.5 text-[0.72rem]">
                                {passwordRules.map((rule) => (
                                  <li
                                    key={rule.label}
                                    className={`flex items-center gap-1.5 font-bold ${
                                      rule.ok ? "text-[#0B8F53]" : "text-[#7C8D86]"
                                    }`}
                                  >
                                    <span
                                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${
                                        rule.ok ? "bg-[#17C777] text-white" : "bg-[#EEF1EA] text-[#7C8D86]"
                                      }`}
                                    >
                                      ✓
                                    </span>
                                    <span>{rule.label}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}

                        {/* Country selection cards */}
                        <div className="space-y-2">
                          <Label className="text-xs font-extrabold text-[#4E625A]">
                            {copy.country} *
                          </Label>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {COUNTRY_OPTIONS.map((item) => {
                              const isSelected = country === item.name;
                              return (
                                <button
                                  key={item.name}
                                  type="button"
                                  onClick={() => {
                                    setCountry(item.name);
                                    setCurrency(item.defaultCurrency);
                                  }}
                                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                                    isSelected
                                      ? "border-[#17C777] bg-[#E2F7EC]/60 text-[#06301F] shadow-xs ring-1 ring-[#17C777]"
                                      : "border-[#E3E8DF] bg-white text-[#4E625A] hover:border-[#17C777]/50"
                                  }`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`/flags/${item.code}.png`}
                                    alt={copy.flagAlt(countryLabels[item.name])}
                                    className="h-4 w-5 rounded-xs object-cover shadow-xs"
                                    loading="lazy"
                                  />
                                  <span>{countryLabels[item.name]}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* City select dropdown */}
                        <div className="space-y-1.5">
                          <Label htmlFor="reg-city" className="text-xs font-extrabold text-[#4E625A]">
                            {copy.city} *
                          </Label>
                          <div className="relative flex items-center">
                            <span className={ICON_WRAP}>
                              <MapPin className="h-4 w-4" />
                            </span>
                            <select
                              id="reg-city"
                              required
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="h-[50px] w-full rounded-xl border border-[#E3E8DF] bg-white ps-11 pe-4 text-[14px] font-semibold text-[#0A241D] shadow-none focus-visible:border-[#17C777] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#E2F7EC]"
                            >
                              <option value="" disabled>
                                {copy.selectCity}
                              </option>
                              {citiesForCountry.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Step 1 Next Button */}
                        <div className="pt-2">
                          <Button
                            type="button"
                            onClick={handleNextToStep2}
                            className="rg-cta flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#17C777] font-extrabold text-[#06301F] shadow-[0_10px_22px_-10px_rgba(23,199,119,0.6)] transition hover:-translate-y-px hover:bg-[#0B8F53] hover:text-white"
                          >
                            <span>{copy.continueToStep2}</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      /* ================= STEP 2: PROFIL & FINALISATION ================= */
                      <motion.div
                        key="step-2"
                        initial={reduceMotion ? undefined : { opacity: 0, x: 14 }}
                        animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, x: -14 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-4"
                      >
                        {/* Profile Photo Uploader */}
                        <div className="rounded-2xl border border-[#E3E8DF] bg-white p-4 shadow-xs">
                          <div className="flex items-center gap-4">
                            <div className="relative flex-none">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#17C777] bg-[#E2F7EC] text-[#0B8F53] transition hover:opacity-90"
                              >
                                {profilePhotoPreviewUrl || profilePhotoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={profilePhotoPreviewUrl ?? profilePhotoUrl ?? undefined}
                                    alt={copy.profilePhoto}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Camera className="h-6 w-6" />
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
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-extrabold text-[#0A241D]">{copy.profilePhoto}</p>
                              <p className="mt-0.5 text-[0.75rem] text-[#7C8D86]">PNG, JPG, WebP (max 13 Mo)</p>
                              <div className="mt-2 flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="h-7 rounded-lg border-[#E3E8DF] px-2.5 text-[0.72rem] font-bold text-[#0A241D]"
                                >
                                  {copy.profilePhotoChange}
                                </Button>
                                {profilePhotoPreviewUrl || profilePhotoUrl ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleRemovePhoto}
                                    className="h-7 rounded-lg px-2 text-[0.72rem] font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="me-1 h-3 w-3" />
                                    {copy.profilePhotoRemove}
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1.5">
                          <Label htmlFor="reg-phone" className="text-xs font-extrabold text-[#4E625A]">
                            {copy.phone} *
                          </Label>
                          <div className="relative flex items-center">
                            <span className={ICON_WRAP}>
                              <Phone className="h-4 w-4" />
                            </span>
                            <Input
                              id="reg-phone"
                              type="tel"
                              required
                              autoComplete="tel"
                              placeholder={copy.phonePlaceholder}
                              value={phoneNumber}
                              onChange={(e) => {
                                setPhoneNumber(e.target.value);
                                setError(null);
                              }}
                              className={inputClass}
                            />
                          </div>
                        </div>

                        {/* Birth Date */}
                        <div className="space-y-1.5">
                          <Label htmlFor="reg-birth-date" className="text-xs font-extrabold text-[#4E625A]">
                            {copy.birthDate} *
                          </Label>
                          <div className="relative flex items-center">
                            <span className={ICON_WRAP}>
                              <Calendar className="h-4 w-4" />
                            </span>
                            <Input
                              id="reg-birth-date"
                              type="date"
                              required
                              max={maxBirthDate}
                              autoComplete="bday"
                              value={birthDate}
                              onChange={(e) => {
                                setBirthDate(e.target.value);
                                setError(null);
                              }}
                              className={inputClass}
                            />
                          </div>
                        </div>

                        {/* reCAPTCHA Anti-spam */}
                        {recaptchaSiteKey ? (
                          <div className="space-y-1.5">
                            <div ref={recaptchaContainerRef} className="flex justify-center" />
                          </div>
                        ) : isDevEnvironment ? (
                          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                            <ShieldCheck className="h-4 w-4 flex-none text-amber-600" />
                            <span>{copy.recaptchaDevBypass}</span>
                          </div>
                        ) : null}

                        {/* CGU & Privacy acceptance text */}
                        <div className="text-center text-[0.76rem] leading-relaxed text-[#7C8D86]">
                          {copy.acceptTermsPrefix}
                          <Link
                            href="/cgu"
                            target="_blank"
                            className="font-bold text-[#0B8F53] underline hover:text-[#06301F]"
                          >
                            {copy.acceptTermsCGULink}
                          </Link>
                          {copy.acceptTermsAnd}
                          <Link
                            href="/privacy"
                            target="_blank"
                            className="font-bold text-[#0B8F53] underline hover:text-[#06301F]"
                          >
                            {copy.acceptTermsPrivacyLink}
                          </Link>
                          {copy.acceptTermsSuffix}
                        </div>

                        {/* Action buttons (Back to 1 & Submit) */}
                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handlePrevToStep1}
                            className="flex h-[50px] items-center gap-1.5 rounded-xl border-[#E3E8DF] bg-white px-5 font-bold text-[#0A241D] hover:border-[#0A241D]"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            <span>{copy.backToStep1}</span>
                          </Button>
                          <Button
                            type="submit"
                            isLoading={loading}
                            disabled={registrationBlocked || loading}
                            className="rg-cta flex h-[50px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#17C777] font-extrabold text-[#06301F] shadow-[0_10px_22px_-10px_rgba(23,199,119,0.6)] transition hover:-translate-y-px hover:bg-[#0B8F53] hover:text-white"
                          >
                            <span>{loading ? copy.creatingAccount : copy.createFinalAccount}</span>
                            {!loading && <Check className="h-4 w-4" />}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </form>

                  {/* Footer link: Already have an account */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-center text-[0.87rem] font-semibold text-[#4E625A]">
                    <span>{copy.alreadyAccount}</span>
                    <Link href="/login" className="font-extrabold text-[#0B8F53] hover:underline">
                      {copy.login}
                    </Link>
                    <span className="rg-sticker inline-flex items-center gap-1.5 rounded-full bg-[#F2A93B] px-3 py-1 text-[0.74rem] font-extrabold text-[#3A2400] shadow-sm">
                      <span aria-hidden="true">✦</span>
                      {copy.fabor}
                    </span>
                  </div>

                  {/* Guest mode trigger */}
                  <div className="pt-1">
                    <GuestModeButton
                      status={status}
                      locale={locale}
                      dir={pageDir}
                      placement="register"
                      loading={guestLoading}
                      onStart={handleGuestStart}
                      label={copy.tryWithoutAccount}
                      hint={copy.tryWithoutAccountHint}
                      className="h-[48px] w-full rounded-xl border border-[#0B8F53]/40 bg-transparent font-bold text-[#0B8F53] transition hover:bg-[#0B8F53]/10"
                      hintClassName="mt-1.5 text-center text-[0.76rem] font-medium text-[#7C8D86]"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .rg-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(75px);
          pointer-events: none;
        }
        .rg-blob-a {
          width: 440px;
          height: 440px;
          background: rgba(23, 199, 119, 0.32);
          top: -150px;
          inset-inline-start: -140px;
          animation: rgDrift 18s ease-in-out infinite;
        }
        .rg-blob-b {
          width: 360px;
          height: 360px;
          background: rgba(76, 126, 255, 0.22);
          bottom: -130px;
          inset-inline-end: -110px;
          animation: rgDrift 23s ease-in-out infinite reverse;
        }
        @keyframes rgDrift {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(50px, 44px) scale(1.12);
          }
        }
        .rg-spot {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.45s ease;
          background: radial-gradient(
            380px circle at var(--mx, 50%) var(--my, 30%),
            rgba(23, 199, 119, 0.18),
            transparent 66%
          );
        }
        .rg-panel:hover .rg-spot {
          opacity: 1;
        }
        .rg-intro .rg-rise {
          opacity: 0;
          transform: translateY(16px);
          animation: rgRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: var(--d, 0s);
        }
        @keyframes rgRise {
          to {
            opacity: 1;
            transform: none;
          }
        }
        .rg-cta {
          position: relative;
          overflow: hidden;
        }
        .rg-cta::after {
          content: "";
          position: absolute;
          top: 0;
          left: -140%;
          width: 60%;
          height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.45), transparent);
          transform: skewX(-18deg);
          transition: left 0.65s ease;
        }
        .rg-cta:hover::after {
          left: 150%;
        }
        .rg-sticker {
          transform: rotate(-4deg);
          animation: rgWob 4.2s ease-in-out infinite;
        }
        @keyframes rgWob {
          0%,
          100% {
            transform: rotate(-4deg) scale(1);
          }
          50% {
            transform: rotate(3deg) scale(1.05);
          }
        }
        [data-register-locale="ar"],
        [data-register-locale="ar"] *,
        .register-arabic-font,
        .register-arabic-font * {
          font-family: "Cairo", sans-serif !important;
          letter-spacing: 0 !important;
        }
        [data-register-locale="ar"] svg,
        .register-arabic-font svg {
          font-family: initial !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .rg-blob,
          .rg-sticker {
            animation: none !important;
          }
          .rg-intro .rg-rise {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .rg-cta::after {
            display: none;
          }
          .rg-spot {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
