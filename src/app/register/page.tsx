"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiFetch, resetAuthClientState } from "@/lib/api";
import { fetchMe, logout, refreshAuthSession, markAuthSessionHint, type AuthUser } from "@/lib/auth";
import { usePlatformStatus } from "@/lib/usePlatformStatus";
import { getVisibleAnnouncements } from "@/lib/announcementVisibility";
import { SystemMessageCard } from "@/components/announcements/SystemMessageCard";
import { startGuestSession } from "@/lib/guestSession";
import { shouldShowDiscoveryWelcome } from "@/lib/guestWelcome";
import { getBrowserLocalePreference, setAppLocale } from "@/components/i18n/LanguagePreferenceGate";
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

const DEFAULT_SWEEP_INTERVAL_DAYS = 7;
type CurrencyCode = "MAD" | "DZD" | "TND" | "EGP";

const COUNTRY_OPTIONS = [
  { name: "Maroc", code: "ma", dial: "🇲🇦 +212", defaultCurrency: "MAD" as CurrencyCode },
  { name: "Algérie", code: "dz", dial: "🇩🇿 +213", defaultCurrency: "DZD" as CurrencyCode },
  { name: "Tunisie", code: "tn", dial: "🇹🇳 +216", defaultCurrency: "TND" as CurrencyCode },
  { name: "Égypte", code: "eg", dial: "🇪🇬 +20", defaultCurrency: "EGP" as CurrencyCode },
] as const;

type CountryName = (typeof COUNTRY_OPTIONS)[number]["name"];

const CURRENCY_BY_COUNTRY: Record<CountryName, CurrencyCode> = {
  Maroc: "MAD",
  Algérie: "DZD",
  Tunisie: "TND",
  Égypte: "EGP",
};

const DIAL_BY_COUNTRY: Record<CountryName, string> = {
  Maroc: "🇲🇦 +212",
  Algérie: "🇩🇿 +213",
  Tunisie: "🇹🇳 +216",
  Égypte: "🇪🇬 +20",
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
  Algérie: [
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
  Égypte: [
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

const COPY = {
  fr: {
    home: "Accueil",
    login: "Connexion",
    alreadyRegistered: "Déjà inscrit ?",
    step1Title: "ÉTAPE 1 · COMPTE & ACCÈS",
    step2Title: "ÉTAPE 2 · PROFIL & FINALISATION",
    createTitle: "Crée ton compte",
    profileTitle: "Ton profil",
    back: "← Retour",
    email: "Adresse e-mail",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    strength: "Robustesse",
    weak: "Faible",
    medium: "Moyen",
    strong: "Robuste",
    ruleMinLength: "Au moins 8 caractères",
    ruleLetter: "Au moins 1 lettre",
    ruleDigit: "Au moins 1 chiffre",
    continueProfile: "Continuer vers le profil",
    tryGuest: "Essayer sans compte",
    profilePhoto: "Photo de profil (optionnelle)",
    upload: "Téléverser",
    remove: "Supprimer",
    firstName: "Prénom",
    lastName: "Nom",
    phone: "Téléphone",
    birthDate: "Date de naissance",
    country: "Pays de résidence",
    city: "Ville",
    ageNotice: "Âge minimum requis : 13 ans.",
    recaptchaNotRobot: "Je ne suis pas un robot",
    cguAccept: "J’accepte les Conditions générales d’utilisation et la Politique de confidentialité.",
    submitCreate: "Créer mon compte et démarrer",
    submitting: "Création du compte…",
    livePreview: "APERÇU EN DIRECT",
    salam: "Salam",
    budgetCurrency: "Devise de ton budget",
    adv1: "4 enveloppes prêtes à remplir",
    adv2: "Ba Omar parle ta langue",
    adv3: "Aucune banque connectée",
    allFieldsRequired: "Tous les champs obligatoires doivent être renseignés.",
    validEmail: "Merci d'entrer une adresse e-mail valide.",
    passwordsMismatch: "Les mots de passe ne correspondent pas.",
    weakPasswordRule: "Le mot de passe doit comporter au moins 8 caractères, dont une lettre et un chiffre.",
    compromisedPassword: "Ce mot de passe est trop facile. Choisis-en un plus robuste.",
    phoneTooShort: "Le numéro de téléphone est trop court (au moins 8 chiffres).",
    invalidBirthDate: "Date de naissance invalide.",
    minAge: "L'inscription requiert d'avoir au moins 13 ans.",
    chooseCountryCity: "Merci de sélectionner un pays et une ville.",
    recaptchaRequired: "Veuillez valider la vérification de sécurité.",
    recaptchaFailed: "Échec de vérification reCAPTCHA.",
    cguRequired: "Veuillez accepter les CGU et la Politique de confidentialité.",
    photoMustBeImage: "Le fichier doit être une image (PNG, JPG, WebP).",
    photoMaxSize: "La photo ne doit pas dépasser 13 Mo.",
    createAccountFailed: "Impossible de créer le compte pour le moment.",
    accountExists: "Un compte existe déjà avec cette adresse e-mail.",
    weakPassword: "Le mot de passe ne respecte pas les critères de sécurité.",
    guestStartError: "Impossible de démarrer le mode invité.",
    connectedAs: "Tu es connecté en tant que",
    goDashboard: "Accéder au dashboard",
    logout: "Se déconnecter",
  },
  ar: {
    home: "الرئيسية",
    login: "تسجيل الدخول",
    alreadyRegistered: "عندك حساب؟",
    step1Title: "المرحلة 1 · الحساب والولوج",
    step2Title: "المرحلة 2 · الملف الشخصي",
    createTitle: "أنشئ حسابك 7sabek",
    profileTitle: "الملف الشخصي",
    back: "← رجوع",
    email: "البريد الإلكتروني",
    password: "كلمة السر",
    confirmPassword: "تأكيد كلمة السر",
    strength: "القوة",
    weak: "ضعيفة",
    medium: "متوسطة",
    strong: "قوية",
    ruleMinLength: "على الأقل 8 حروف",
    ruleLetter: "على الأقل حرف واحد",
    ruleDigit: "على الأقل رقم واحد",
    continueProfile: "المتابعة للملف الشخصي",
    tryGuest: "تجربة بدون حساب",
    profilePhoto: "الصورة الشخصية (اختيارية)",
    upload: "تحميل صورة",
    remove: "حذف",
    firstName: "الاسم الشخصي",
    lastName: "الاسم العائلي",
    phone: "رقم الهاتف",
    birthDate: "تاريخ الازدياد",
    country: "بلد الإقامة",
    city: "المدينة",
    ageNotice: "السن الأدنى المطلوب : 13 سنة.",
    recaptchaNotRobot: "أنا لست روبوت",
    cguAccept: "أوافق على الشروط العامة للاستخدام وسياسة الخصوصية.",
    submitCreate: "إنشاء الحساب والبدء",
    submitting: "جاري إنشاء الحساب…",
    livePreview: "معاينة مباشرة",
    salam: "السلام",
    budgetCurrency: "عملة الميزانية",
    adv1: "4 أظرفة واجدة للاستعمال",
    adv2: "با عمر كايهضر بلهجتك",
    adv3: "بدون ربط بنكي لحماية سرية حساباتك",
    allFieldsRequired: "عمر الخانات الضرورية عافاك.",
    validEmail: "دخل بريد إلكتروني صحيح.",
    passwordsMismatch: "كلمات السر ما متطابقينش.",
    weakPasswordRule: "كلمة السر خاصها 8 حروف على الأقل مع حرف ورقم.",
    compromisedPassword: "كلمة السر ساهلة بزاف. اختار وحدة أقوى.",
    phoneTooShort: "رقم الهاتف قصير بزاف (8 أرقام على الأقل).",
    invalidBirthDate: "تاريخ الازدياد غير صحيح.",
    minAge: "خاص يكون عندك 13 عام على الأقل.",
    chooseCountryCity: "اختار البلد والمدينة.",
    recaptchaRequired: "أكد أنك لست روبوت باش نكملو.",
    recaptchaFailed: "وقع مشكل فالتحقق من الحماية.",
    cguRequired: "وافق على الشروط وسياسة الخصوصية للمتابعة.",
    photoMustBeImage: "الملف خاصو يكون صورة (PNG, JPG, WebP).",
    photoMaxSize: "حجم الصورة ما خاصوش يفوت 13 ميغابايت.",
    createAccountFailed: "ما قدرناش نسجلو الحساب دابا.",
    accountExists: "كاين حساب مسجل بهاد البريد الإلكتروني.",
    weakPassword: "كلمة السر ضعيفة.",
    guestStartError: "ما قدرناش نبداو وضع الضيف.",
    connectedAs: "راك داخل بحساب",
    goDashboard: "سير للوحة التحكم",
    logout: "تسجيل الخروج",
  },
  en: {
    home: "Home",
    login: "Log in",
    alreadyRegistered: "Already registered?",
    step1Title: "STEP 1 · ACCOUNT & CREDENTIALS",
    step2Title: "STEP 2 · PROFILE & COMPLETE",
    createTitle: "Create your account",
    profileTitle: "Your profile",
    back: "← Back",
    email: "Email address",
    password: "Password",
    confirmPassword: "Confirm password",
    strength: "Strength",
    weak: "Weak",
    medium: "Medium",
    strong: "Strong",
    ruleMinLength: "At least 8 characters",
    ruleLetter: "At least 1 letter",
    ruleDigit: "At least 1 number",
    continueProfile: "Continue to profile",
    tryGuest: "Try without account",
    profilePhoto: "Profile photo (optional)",
    upload: "Upload",
    remove: "Remove",
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone number",
    birthDate: "Date of birth",
    country: "Country of residence",
    city: "City",
    ageNotice: "Minimum age required: 13 years.",
    recaptchaNotRobot: "I'm not a robot",
    cguAccept: "I accept the Terms of Service and Privacy Policy.",
    submitCreate: "Create my account and start",
    submitting: "Creating your account…",
    livePreview: "LIVE PREVIEW",
    salam: "Salam",
    budgetCurrency: "Budget currency",
    adv1: "4 envelopes ready to use",
    adv2: "Ba Omar speaks your language",
    adv3: "No bank account connection required",
    allFieldsRequired: "All required fields must be completed.",
    validEmail: "Please enter a valid email address.",
    passwordsMismatch: "Passwords do not match.",
    weakPasswordRule: "Password must have at least 8 characters, including a letter and a number.",
    compromisedPassword: "This password is too common. Choose a stronger one.",
    phoneTooShort: "Phone number is too short (at least 8 digits).",
    invalidBirthDate: "Invalid date of birth.",
    minAge: "You must be at least 13 years old to sign up.",
    chooseCountryCity: "Please select a country and city.",
    recaptchaRequired: "Please verify that you are human.",
    recaptchaFailed: "Security verification failed.",
    cguRequired: "Please accept the terms and privacy policy to continue.",
    photoMustBeImage: "File must be an image (PNG, JPG, WebP).",
    photoMaxSize: "Photo must not exceed 13 MB.",
    createAccountFailed: "Unable to create account right now.",
    accountExists: "An account already exists with this email address.",
    weakPassword: "Password does not meet security requirements.",
    guestStartError: "Unable to start guest mode.",
    connectedAs: "You are signed in as",
    goDashboard: "Go to dashboard",
    logout: "Log out",
  },
};

export default function RegisterPage() {
  const router = useRouter();

  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthDate, setBirthDate] = useState("1998-03-12");
  const [country, setCountry] = useState<CountryName>("Maroc");
  const [city, setCity] = useState("Casablanca");
  const [currency, setCurrency] = useState<CurrencyCode>("MAD");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState<string | null>(null);
  const [cguAccepted, setCguAccepted] = useState(true);

  // reCAPTCHA state
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaScriptLoaded, setRecaptchaScriptLoaded] = useState(false);
  const recaptchaWidgetRef = useRef<number | null>(null);
  const recaptchaNodeRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status & Submit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const submitInFlightRef = useRef(false);
  const [registrationLeadId, setRegistrationLeadId] = useState("");

  const status = usePlatformStatus();
  const t = COPY[locale];
  const isRtl = locale === "ar";
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
  const isDev = process.env.NODE_ENV !== "production";
  const allowRecaptchaBypass = isDev && !recaptchaSiteKey;

  useEffect(() => {
    const initial = getBrowserLocalePreference() ?? "fr";
    setLocale(initial);
    const syncLocale = (event?: Event) => {
      const customEvent = event as CustomEvent<{ locale?: FloussyLocale }> | undefined;
      const next = customEvent?.detail?.locale || getBrowserLocalePreference() || "fr";
      setLocale(next);
    };
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale as EventListener);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale as EventListener);
  }, []);

  const changeLocale = (next: FloussyLocale) => {
    setLocale(next);
    setAppLocale(next);
  };

  useEffect(() => {
    fetchMe().then(setUser).catch(() => setUser(null));
  }, []);

  // Restore prefill draft
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedLead = window.localStorage.getItem(REGISTER_LEAD_ID_KEY) || "";
      if (savedLead) setRegistrationLeadId(savedLead);

      const prefillRaw = window.localStorage.getItem(REGISTER_ONBOARDING_PREFILL_KEY);
      if (prefillRaw) {
        const p = JSON.parse(prefillRaw);
        if (p.first_name) setFirstName(p.first_name);
        if (p.last_name) setLastName(p.last_name);
        if (p.phone_number) setPhoneNumber(p.phone_number);
        if (p.birth_date) setBirthDate(p.birth_date);
        if (p.country && p.country in CITIES_BY_COUNTRY) setCountry(p.country as CountryName);
        if (p.city) setCity(p.city);
        if (p.currency) setCurrency(p.currency);
        if (p.profile_photo_url) setProfilePhotoUrl(p.profile_photo_url);
      }
    } catch {
      // Ignore corrupted storage
    }
  }, []);

  // Sync Currency & Cities when Country changes
  useEffect(() => {
    const cur = CURRENCY_BY_COUNTRY[country];
    if (cur) setCurrency(cur);
    const cities = CITIES_BY_COUNTRY[country] || [];
    if (!cities.includes(city)) {
      setCity(cities[0] || "");
    }
  }, [country, city]);

  // reCAPTCHA loader
  useEffect(() => {
    if (typeof window === "undefined" || !recaptchaSiteKey || allowRecaptchaBypass) return;
    const existing = document.querySelector<HTMLScriptElement>('script[src^="https://www.google.com/recaptcha/api.js"]');
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
          setError(t.recaptchaFailed);
        }
      }
    },
    [recaptchaSiteKey, t.recaptchaFailed],
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

  // Photo handlers
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t.photoMustBeImage);
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
      setError(t.photoMaxSize);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setProfilePhotoPreviewUrl(nextPreviewUrl);

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhotoUrl(typeof reader.result === "string" ? reader.result : null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (profilePhotoPreviewUrl) URL.revokeObjectURL(profilePhotoPreviewUrl);
    setProfilePhotoPreviewUrl(null);
    setProfilePhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Password Strength Score & Rules
  const passwordRules = useMemo(() => {
    return [
      { label: t.ruleMinLength, ok: password.length >= EASY_MIN_PASSWORD_LENGTH },
      { label: t.ruleLetter, ok: PASSWORD_HAS_LETTER_RE.test(password) },
      { label: t.ruleDigit, ok: PASSWORD_HAS_DIGIT_RE.test(password) },
    ];
  }, [password, t]);

  const passwordScore = useMemo(() => {
    let s = 0;
    if (password.length >= EASY_MIN_PASSWORD_LENGTH) s += 1;
    if (PASSWORD_HAS_LETTER_RE.test(password)) s += 1;
    if (PASSWORD_HAS_DIGIT_RE.test(password)) s += 1;
    if (password.length >= 10 && !COMPROMISED_PASSWORDS.has(password.toLowerCase())) s += 1;
    return s;
  }, [password]);

  const strLabel = passwordScore <= 1 ? t.weak : passwordScore <= 2 ? t.medium : t.strong;
  const strColor = passwordScore <= 1 ? "#B42318" : passwordScore <= 2 ? "#8A5300" : "#0A7A53";

  const meter = [
    { c: passwordScore >= 1 ? (passwordScore === 1 ? "#B42318" : passwordScore === 2 ? "#E0A43A" : "#0A7A53") : "#E4E2D9" },
    { c: passwordScore >= 2 ? (passwordScore === 2 ? "#E0A43A" : "#0A7A53") : "#E4E2D9" },
    { c: passwordScore >= 3 ? "#0A7A53" : "#E4E2D9" },
    { c: passwordScore >= 4 ? "#0A7A53" : "#E4E2D9" },
  ];

  // Validation
  const validateStep1 = () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t.validEmail);
      return false;
    }
    if (!password || !confirmPassword) {
      setError(t.allFieldsRequired);
      return false;
    }
    if (password !== confirmPassword) {
      setError(t.passwordsMismatch);
      return false;
    }
    if (
      password.length < EASY_MIN_PASSWORD_LENGTH ||
      !PASSWORD_HAS_LETTER_RE.test(password) ||
      !PASSWORD_HAS_DIGIT_RE.test(password)
    ) {
      setError(t.weakPasswordRule);
      return false;
    }
    if (COMPROMISED_PASSWORDS.has(password.trim().toLowerCase())) {
      setError(t.compromisedPassword);
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError(t.allFieldsRequired);
      return false;
    }
    if (!phoneNumber.trim() || phoneNumber.trim().length < 8) {
      setError(t.phoneTooShort);
      return false;
    }
    if (!birthDate) {
      setError(t.invalidBirthDate);
      return false;
    }
    const birth = new Date(birthDate);
    const today = new Date();
    const minBirth = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    if (Number.isNaN(birth.getTime()) || birth > minBirth) {
      setError(t.minAge);
      return false;
    }
    if (!cguAccepted) {
      setError(t.cguRequired);
      return false;
    }
    if (!allowRecaptchaBypass && !recaptchaToken) {
      setError(t.recaptchaRequired);
      return false;
    }
    setError(null);
    return true;
  };

  const handleNextToStep2 = () => {
    if (!validateStep1()) return;
    setError(null);
    setStep(2);
  };

  const handleRegisterAndStartOnboarding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading || submitInFlightRef.current) return;
    if (!validateStep1() || !validateStep2()) return;

    setLoading(true);
    submitInFlightRef.current = true;
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
          phone_number: `${DIAL_BY_COUNTRY[country]} ${phoneNumber.trim()}`,
          birth_date: birthDate,
          country: country.trim(),
          city: city.trim(),
          profile_photo_url: profilePhotoUrl,
          mfa_consent: true,
          defer_onboarding_v2: true,
          recaptcha_token: recaptchaToken || undefined,
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
      markAuthSessionHint();
      router.push("/onboarding?post_register=1");
    } catch (err) {
      const message = err instanceof Error ? err.message : t.createAccountFailed;
      const lower = message.toLowerCase();
      if (lower.includes("exists") || lower.includes("already")) {
        setError(t.accountExists);
        setStep(1);
      } else if (lower.includes("password")) {
        setError(t.weakPassword);
        setStep(1);
      } else {
        setError(message || t.createAccountFailed);
      }
    } finally {
      setLoading(false);
      submitInFlightRef.current = false;
      if (window.grecaptcha && recaptchaWidgetRef.current !== null) {
        window.grecaptcha.reset(recaptchaWidgetRef.current);
      }
    }
  };

  const handleGuestStart = async () => {
    setError(null);
    setLoading(true);
    try {
      resetAuthClientState();
      const guest = await startGuestSession();
      markAuthSessionHint();
      router.push(shouldShowDiscoveryWelcome(guest) ? "/decouverte" : "/dashboard");
    } catch {
      setError(t.guestStartError);
    } finally {
      setLoading(false);
    }
  };

  const initial = (firstName.trim() || email.trim() || "O")[0].toUpperCase();
  const cities = CITIES_BY_COUNTRY[country] || [];
  const dial = DIAL_BY_COUNTRY[country];

  return (
    <div
      className="pw"
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        minHeight: "100vh",
        background: "#F6F5EF",
        color: "#0F1A16",
        fontFamily: "Manrope, Cairo, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Mobile Top Brand Band */}
      <div className="pw-band">
        <Link href="/" className="pw-logo" dir="ltr" aria-label={`7sabek — ${t.home}`}>
          <svg viewBox="10 540 1880 840" width="150" style={{ display: "block", overflow: "visible" }} aria-hidden="true">
            <defs>
              <linearGradient id="pwW" gradientUnits="userSpaceOnUse" x1="520" y1="560" x2="140" y2="1290">
                <stop offset="0" stopColor="#3DF0A8" />
                <stop offset="1" stopColor="#00B06E" />
              </linearGradient>
            </defs>
            <path
              fill="url(#pwW)"
              d="M143.9 1281.0 27.0 1280.7 23.3 1278.6 22.5 1273.5 26.0 1266.8 65.5 1209.8 80.1 1187.1 100.9 1157.7 107.5 1147.0 178.4 1045.5 276.4 902.2 291.8 880.9 316.8 843.1 339.3 811.7 388.6 738.9 404.8 716.6 417.8 697.5 419.2 693.2 418.2 691.2 415.4 690.4 298.2 691.0 42.7 690.6 39.9 688.9 38.3 686.5 39.7 678.5 57.5 639.4 66.4 617.6 74.1 602.2 79.9 587.7 86.4 576.7 95.5 566.5 104.8 560.2 113.9 556.6 127.6 554.1 633.8 554.1 645.8 556.6 652.9 560.0 657.8 563.5 662.6 568.7 668.2 578.7 671.3 591.4 671.0 605.1 668.6 616.4 663.2 629.8 654.9 644.5 636.2 671.5 535.6 810.6 411.4 985.5 317.2 1115.2 281.8 1166.1 255.8 1201.0 218.5 1254.2 205.1 1267.2 191.3 1275.0 183.0 1277.9 171.0 1280.4 143.9 1281.0Z"
            />
            <path
              fill="#FFFFFF"
              fillRule="evenodd"
              d="M1451.2 1258.9 1422.8 1258.0 1401.8 1254.6 1379.4 1247.9 1366.4 1242.2 1355.0 1235.9 1339.3 1224.6 1323.5 1208.8 1317.9 1201.4 1310.2 1189.1 1300.6 1167.0 1294.3 1184.7 1289.3 1195.1 1279.6 1210.4 1271.2 1220.6 1257.5 1233.3 1243.8 1242.6 1231.1 1248.9 1217.1 1253.9 1199.7 1257.7 1185.4 1259.0 1168.7 1258.7 1150.7 1256.0 1137.0 1251.9 1125.6 1246.6 1113.3 1238.0 1105.3 1230.1 1104.3 1254.6 1019.9 1254.5 1019.8 905.7 1108.9 905.7 1109.3 1020.7 1119.6 1012.4 1132.0 1005.0 1143.7 1000.3 1159.7 996.6 1172.7 995.2 1192.1 995.6 1208.1 997.9 1225.8 1003.0 1241.8 1010.3 1253.2 1017.4 1265.5 1027.3 1274.4 1036.5 1284.3 1049.8 1290.6 1060.7 1296.3 1073.5 1300.6 1086.2 1306.3 1072.1 1313.2 1058.8 1322.8 1045.1 1333.8 1033.1 1345.9 1023.1 1355.4 1016.7 1371.7 1008.0 1388.7 1001.7 1407.8 997.3 1426.5 995.2 1443.8 995.2 1462.5 997.3 1479.2 1001.0 1496.9 1007.4 1510.3 1014.0 1526.0 1024.6 1538.0 1035.6 1549.4 1049.7 1556.5 1061.2 1564.4 1079.2 1568.9 1095.2 1571.5 1113.6 1571.9 1131.3 1570.3 1149.3 1385.3 1150.0 1387.3 1156.3 1391.0 1163.7 1396.6 1171.4 1402.4 1176.9 1415.8 1184.8 1432.5 1189.5 1441.5 1190.6 1454.2 1190.6 1472.2 1187.8 1486.9 1182.1 1497.3 1175.8 1506.6 1168.7 1553.1 1217.1 1551.0 1220.3 1543.3 1227.6 1532.1 1236.1 1520.0 1243.2 1509.6 1247.9 1494.6 1252.9 1480.9 1256.0 1462.9 1258.3 1451.2 1258.9ZM1872.6 1254.6 1765.1 1254.5 1693.3 1165.6 1667.2 1192.1 1666.8 1254.5 1577.7 1254.4 1577.9 905.6 1667.0 905.9 1667.2 1087.8 1758.4 999.7 1863.5 999.7 1758.7 1108.9 1869.4 1249.5 1872.9 1254.2 1872.6 1254.6ZM615.4 1261.3 596.4 1261.0 572.7 1259.0 551.6 1255.7 531.3 1250.9 515.6 1246.2 495.9 1238.5 483.8 1232.5 472.1 1225.1 502.5 1156.7 527.2 1169.9 549.3 1178.4 576.7 1185.5 600.7 1188.6 616.7 1188.9 627.1 1188.2 645.8 1184.5 652.1 1181.8 658.0 1177.7 662.9 1171.4 664.6 1165.7 664.6 1158.3 662.9 1152.7 660.5 1148.8 653.5 1142.9 641.1 1137.6 628.4 1133.6 567.7 1118.7 550.6 1113.7 531.3 1106.7 517.2 1099.0 507.2 1091.7 495.0 1079.9 488.8 1071.2 481.8 1055.8 478.0 1037.8 477.7 1017.1 481.1 998.1 485.4 986.0 488.8 979.2 499.1 964.0 511.9 951.2 527.6 940.2 548.6 930.2 573.0 923.1 601.0 919.1 633.8 918.4 665.8 921.5 695.2 927.5 717.9 934.9 730.9 940.5 742.4 946.6 742.8 947.6 740.7 953.0 714.2 1016.0 681.2 1001.3 660.8 995.3 638.4 991.6 617.1 990.9 604.7 991.9 594.4 994.0 587.0 996.7 581.7 999.7 575.3 1005.3 572.9 1008.8 570.5 1014.4 569.8 1022.4 571.0 1027.6 575.2 1034.1 581.0 1038.5 585.7 1040.9 608.4 1048.2 654.5 1058.8 680.8 1066.1 702.9 1074.1 716.9 1081.8 729.8 1091.6 743.0 1105.9 750.7 1119.9 756.2 1140.3 767.3 1128.1 779.0 1119.9 794.4 1112.9 809.7 1108.5 823.1 1106.1 845.1 1104.1 909.1 1103.6 908.7 1098.2 906.6 1089.9 903.6 1083.5 900.2 1078.7 894.9 1073.7 890.2 1070.8 883.9 1067.8 872.5 1064.7 852.5 1063.4 842.8 1064.0 827.1 1066.8 804.4 1074.5 786.0 1085.2 756.0 1025.1 765.3 1019.0 779.0 1012.4 807.1 1003.0 827.8 998.6 841.5 996.6 859.2 995.2 879.2 995.2 902.9 997.6 916.9 1000.3 929.6 1004.0 941.3 1008.7 950.3 1013.4 961.8 1021.1 969.7 1028.0 977.0 1036.4 983.4 1045.8 990.4 1060.5 993.8 1070.9 997.2 1087.2 998.6 1099.9 998.6 1254.5 915.9 1254.6 914.9 1222.9 908.1 1233.1 899.9 1241.3 890.9 1247.6 877.5 1253.6 864.2 1257.0 845.1 1259.0 825.4 1258.3 809.1 1255.7 794.7 1251.2 784.0 1246.3 775.0 1240.6 767.7 1234.6 761.5 1228.1 755.9 1220.5 750.9 1210.8 746.6 1198.2 737.6 1212.2 725.9 1224.9 712.6 1235.2 695.2 1244.9 674.5 1252.9 658.1 1257.0 638.1 1260.0 615.4 1261.3ZM1487.8 1102.6 1485.6 1092.9 1481.3 1083.5 1476.7 1076.9 1470.2 1070.4 1463.2 1065.4 1455.2 1061.8 1447.2 1059.7 1437.2 1058.7 1426.5 1059.4 1416.8 1061.8 1409.1 1065.1 1401.1 1070.7 1394.9 1076.9 1390.0 1084.2 1386.3 1092.2 1383.8 1101.9 1385.1 1102.7 1487.8 1102.6ZM1168.2 1187.4 1177.0 1185.8 1188.7 1180.8 1198.4 1173.2 1206.2 1163.4 1211.2 1152.7 1214.2 1139.6 1214.9 1132.0 1214.2 1113.9 1211.5 1101.9 1206.5 1090.9 1200.6 1082.9 1193.2 1076.2 1186.1 1071.8 1174.4 1067.7 1165.0 1066.4 1151.7 1067.0 1140.3 1070.1 1130.6 1075.5 1122.3 1082.7 1116.2 1090.9 1111.5 1100.9 1108.5 1113.6 1107.8 1119.9 1108.1 1137.3 1110.2 1148.3 1113.8 1158.3 1118.3 1166.1 1125.6 1174.5 1134.6 1181.1 1144.7 1185.4 1155.3 1187.5 1168.2 1187.4ZM870.7 1202.1 879.9 1200.5 890.2 1196.2 896.9 1191.6 902.6 1185.5 905.7 1180.7 909.4 1172.4 909.0 1150.7 871.5 1150.5 855.8 1151.9 847.8 1153.9 842.8 1156.3 839.5 1158.5 835.5 1162.9 832.7 1168.7 831.6 1178.0 833.7 1186.7 838.3 1193.4 843.1 1197.1 851.8 1200.8 860.5 1202.2 870.7 1202.1Z"
            />
            <circle cx="1273" cy="1316" r="45" fill="#43B95E" />
          </svg>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="lg-chip" role="group" aria-label="Langues">
            <button
              type="button"
              className={locale === "fr" ? "on" : ""}
              onClick={() => changeLocale("fr")}
              aria-pressed={locale === "fr"}
              lang="fr"
            >
              FR
            </button>
            <button
              type="button"
              className={locale === "ar" ? "on" : ""}
              onClick={() => changeLocale("ar")}
              aria-pressed={locale === "ar"}
              lang="ar"
            >
              العربية
            </button>
            <button
              type="button"
              className={locale === "en" ? "on" : ""}
              onClick={() => changeLocale("en")}
              aria-pressed={locale === "en"}
              lang="en"
            >
              EN
            </button>
          </div>
          <Link className="pw-pill" href="/login">
            {t.login}
          </Link>
        </div>
      </div>

      {/* Desktop Top Header */}
      <header
        className="pw-head"
        style={{
          maxWidth: "1200px",
          width: "100%",
          boxSizing: "border-box",
          margin: "0 auto",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <Link href="/" dir="ltr" aria-label={`7sabek — ${t.home}`} style={{ display: "block", color: "#0F1A16", textDecoration: "none" }}>
          <svg viewBox="10 540 1880 840" width="124" style={{ display: "block", overflow: "visible" }} aria-hidden="true">
            <defs>
              <linearGradient id="pwD" gradientUnits="userSpaceOnUse" x1="520" y1="560" x2="140" y2="1290">
                <stop offset="0" stopColor="#3DF0A8" />
                <stop offset="1" stopColor="#00B06E" />
              </linearGradient>
            </defs>
            <path
              fill="url(#pwD)"
              d="M143.9 1281.0 27.0 1280.7 23.3 1278.6 22.5 1273.5 26.0 1266.8 65.5 1209.8 80.1 1187.1 100.9 1157.7 107.5 1147.0 178.4 1045.5 276.4 902.2 291.8 880.9 316.8 843.1 339.3 811.7 388.6 738.9 404.8 716.6 417.8 697.5 419.2 693.2 418.2 691.2 415.4 690.4 298.2 691.0 42.7 690.6 39.9 688.9 38.3 686.5 39.7 678.5 57.5 639.4 66.4 617.6 74.1 602.2 79.9 587.7 86.4 576.7 95.5 566.5 104.8 560.2 113.9 556.6 127.6 554.1 633.8 554.1 645.8 556.6 652.9 560.0 657.8 563.5 662.6 568.7 668.2 578.7 671.3 591.4 671.0 605.1 668.6 616.4 663.2 629.8 654.9 644.5 636.2 671.5 535.6 810.6 411.4 985.5 317.2 1115.2 281.8 1166.1 255.8 1201.0 218.5 1254.2 205.1 1267.2 191.3 1275.0 183.0 1277.9 171.0 1280.4 143.9 1281.0Z"
            />
            <path
              fill="#0F1A16"
              fillRule="evenodd"
              d="M1451.2 1258.9 1422.8 1258.0 1401.8 1254.6 1379.4 1247.9 1366.4 1242.2 1355.0 1235.9 1339.3 1224.6 1323.5 1208.8 1317.9 1201.4 1310.2 1189.1 1300.6 1167.0 1294.3 1184.7 1289.3 1195.1 1279.6 1210.4 1271.2 1220.6 1257.5 1233.3 1243.8 1242.6 1231.1 1248.9 1217.1 1253.9 1199.7 1257.7 1185.4 1259.0 1168.7 1258.7 1150.7 1256.0 1137.0 1251.9 1125.6 1246.6 1113.3 1238.0 1105.3 1230.1 1104.3 1254.6 1019.9 1254.5 1019.8 905.7 1108.9 905.7 1109.3 1020.7 1119.6 1012.4 1132.0 1005.0 1143.7 1000.3 1159.7 996.6 1172.7 995.2 1192.1 995.6 1208.1 997.9 1225.8 1003.0 1241.8 1010.3 1253.2 1017.4 1265.5 1027.3 1274.4 1036.5 1284.3 1049.8 1290.6 1060.7 1296.3 1073.5 1300.6 1086.2 1306.3 1072.1 1313.2 1058.8 1322.8 1045.1 1333.8 1033.1 1345.9 1023.1 1355.4 1016.7 1371.7 1008.0 1388.7 1001.7 1407.8 997.3 1426.5 995.2 1443.8 995.2 1462.5 997.3 1479.2 1001.0 1496.9 1007.4 1510.3 1014.0 1526.0 1024.6 1538.0 1035.6 1549.4 1049.7 1556.5 1061.2 1564.4 1079.2 1568.9 1095.2 1571.5 1113.6 1571.9 1131.3 1570.3 1149.3 1385.3 1150.0 1387.3 1156.3 1391.0 1163.7 1396.6 1171.4 1402.4 1176.9 1415.8 1184.8 1432.5 1189.5 1441.5 1190.6 1454.2 1190.6 1472.2 1187.8 1486.9 1182.1 1497.3 1175.8 1506.6 1168.7 1553.1 1217.1 1551.0 1220.3 1543.3 1227.6 1532.1 1236.1 1520.0 1243.2 1509.6 1247.9 1494.6 1252.9 1480.9 1256.0 1462.9 1258.3 1451.2 1258.9ZM1872.6 1254.6 1765.1 1254.5 1693.3 1165.6 1667.2 1192.1 1666.8 1254.5 1577.7 1254.4 1577.9 905.6 1667.0 905.9 1667.2 1087.8 1758.4 999.7 1863.5 999.7 1758.7 1108.9 1869.4 1249.5 1872.9 1254.2 1872.6 1254.6ZM615.4 1261.3 596.4 1261.0 572.7 1259.0 551.6 1255.7 531.3 1250.9 515.6 1246.2 495.9 1238.5 483.8 1232.5 472.1 1225.1 502.5 1156.7 527.2 1169.9 549.3 1178.4 576.7 1185.5 600.7 1188.6 616.7 1188.9 627.1 1188.2 645.8 1184.5 652.1 1181.8 658.0 1177.7 662.9 1171.4 664.6 1165.7 664.6 1158.3 662.9 1152.7 660.5 1148.8 653.5 1142.9 641.1 1137.6 628.4 1133.6 567.7 1118.7 550.6 1113.7 531.3 1106.7 517.2 1099.0 507.2 1091.7 495.0 1079.9 488.8 1071.2 481.8 1055.8 478.0 1037.8 477.7 1017.1 481.1 998.1 485.4 986.0 488.8 979.2 499.1 964.0 511.9 951.2 527.6 940.2 548.6 930.2 573.0 923.1 601.0 919.1 633.8 918.4 665.8 921.5 695.2 927.5 717.9 934.9 730.9 940.5 742.4 946.6 742.8 947.6 740.7 953.0 714.2 1016.0 681.2 1001.3 660.8 995.3 638.4 991.6 617.1 990.9 604.7 991.9 594.4 994.0 587.0 996.7 581.7 999.7 575.3 1005.3 572.9 1008.8 570.5 1014.4 569.8 1022.4 571.0 1027.6 575.2 1034.1 581.0 1038.5 585.7 1040.9 608.4 1048.2 654.5 1058.8 680.8 1066.1 702.9 1074.1 716.9 1081.8 729.8 1091.6 743.0 1105.9 750.7 1119.9 756.2 1140.3 767.3 1128.1 779.0 1119.9 794.4 1112.9 809.7 1108.5 823.1 1106.1 845.1 1104.1 909.1 1103.6 908.7 1098.2 906.6 1089.9 903.6 1083.5 900.2 1078.7 894.9 1073.7 890.2 1070.8 883.9 1067.8 872.5 1064.7 852.5 1063.4 842.8 1064.0 827.1 1066.8 804.4 1074.5 786.0 1085.2 756.0 1025.1 765.3 1019.0 779.0 1012.4 807.1 1003.0 827.8 998.6 841.5 996.6 859.2 995.2 879.2 995.2 902.9 997.6 916.9 1000.3 929.6 1004.0 941.3 1008.7 950.3 1013.4 961.8 1021.1 969.7 1028.0 977.0 1036.4 983.4 1045.8 990.4 1060.5 993.8 1070.9 997.2 1087.2 998.6 1099.9 998.6 1254.5 915.9 1254.6 914.9 1222.9 908.1 1233.1 899.9 1241.3 890.9 1247.6 877.5 1253.6 864.2 1257.0 845.1 1259.0 825.4 1258.3 809.1 1255.7 794.7 1251.2 784.0 1246.3 775.0 1240.6 767.7 1234.6 761.5 1228.1 755.9 1220.5 750.9 1210.8 746.6 1198.2 737.6 1212.2 725.9 1224.9 712.6 1235.2 695.2 1244.9 674.5 1252.9 658.1 1257.0 638.1 1260.0 615.4 1261.3ZM1487.8 1102.6 1485.6 1092.9 1481.3 1083.5 1476.7 1076.9 1470.2 1070.4 1463.2 1065.4 1455.2 1061.8 1447.2 1059.7 1437.2 1058.7 1426.5 1059.4 1416.8 1061.8 1409.1 1065.1 1401.1 1070.7 1394.9 1076.9 1390.0 1084.2 1386.3 1092.2 1383.8 1101.9 1385.1 1102.7 1487.8 1102.6ZM1168.2 1187.4 1177.0 1185.8 1188.7 1180.8 1198.4 1173.2 1206.2 1163.4 1211.2 1152.7 1214.2 1139.6 1214.9 1132.0 1214.2 1113.9 1211.5 1101.9 1206.5 1090.9 1200.6 1082.9 1193.2 1076.2 1186.1 1071.8 1174.4 1067.7 1165.0 1066.4 1151.7 1067.0 1140.3 1070.1 1130.6 1075.5 1122.3 1082.7 1116.2 1090.9 1111.5 1100.9 1108.5 1113.6 1107.8 1119.9 1108.1 1137.3 1110.2 1148.3 1113.8 1158.3 1118.3 1166.1 1125.6 1174.5 1134.6 1181.1 1144.7 1185.4 1155.3 1187.5 1168.2 1187.4ZM870.7 1202.1 879.9 1200.5 890.2 1196.2 896.9 1191.6 902.6 1185.5 905.7 1180.7 909.4 1172.4 909.0 1150.7 871.5 1150.5 855.8 1151.9 847.8 1153.9 842.8 1156.3 839.5 1158.5 835.5 1162.9 832.7 1168.7 831.6 1178.0 833.7 1186.7 838.3 1193.4 843.1 1197.1 851.8 1200.8 860.5 1202.2 870.7 1202.1Z"
            />
            <circle cx="1273" cy="1316" r="45" fill="#43B95E" />
          </svg>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="lg-chip" role="group" aria-label="Langues">
            <button
              type="button"
              className={locale === "fr" ? "on" : ""}
              onClick={() => changeLocale("fr")}
              aria-pressed={locale === "fr"}
              lang="fr"
            >
              FR
            </button>
            <button
              type="button"
              className={locale === "ar" ? "on" : ""}
              onClick={() => changeLocale("ar")}
              aria-pressed={locale === "ar"}
              lang="ar"
            >
              العربية
            </button>
            <button
              type="button"
              className={locale === "en" ? "on" : ""}
              onClick={() => changeLocale("en")}
              aria-pressed={locale === "en"}
              lang="en"
            >
              EN
            </button>
          </div>
          <span style={{ fontSize: "15px", color: "#55645D" }}>
            {t.alreadyRegistered}{" "}
            <Link href="/login" style={{ fontWeight: 800 }}>
              {t.login}
            </Link>
          </span>
        </div>
      </header>

      {/* Main Body */}
      <div
        className="pw-main"
        style={{
          maxWidth: "1200px",
          width: "100%",
          boxSizing: "border-box",
          margin: "0 auto",
          padding: "16px 24px 64px",
          display: "flex",
          flexWrap: "wrap",
          gap: "32px",
          alignItems: "flex-start",
        }}
      >
        {/* Form Card */}
        <main
          className="pw-card"
          style={{
            flex: "999 1 560px",
            minWidth: 0,
            background: "#FFFFFF",
            borderRadius: "28px",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {user ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" }}>
              <p style={{ fontSize: "16px", color: "#55645D" }}>
                {t.connectedAs} <b>{user.email}</b>
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => router.push(user.role === "superadmin" ? "/superadmin" : "/dashboard")}
                  style={{
                    height: "50px",
                    padding: "0 24px",
                    borderRadius: "14px",
                    border: 0,
                    background: "#0A7A53",
                    color: "#FFFFFF",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {t.goDashboard}
                </button>
                <button
                  type="button"
                  onClick={() => logout().then(() => setUser(null))}
                  style={{
                    height: "50px",
                    padding: "0 24px",
                    borderRadius: "14px",
                    border: "1.5px solid #DAD8CF",
                    background: "#FFFFFF",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {t.logout}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Stepper Header */}
              <ol aria-label="Étapes" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <li style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ height: "6px", borderRadius: "3px", background: "#0A7A53" }} />
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "#0A7A53" }}>{t.step1Title}</span>
                </li>
                <li style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span
                    style={{
                      height: "6px",
                      borderRadius: "3px",
                      background: step === 2 ? "#0A7A53" : "#E4E2D9",
                      transition: "background .3s ease",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: step === 2 ? "#0A7A53" : "#8A9791",
                      transition: "color .3s ease",
                    }}
                  >
                    {t.step2Title}
                  </span>
                </li>
              </ol>

              {/* Error Alert */}
              {error && (
                <div role="alert" className="lg-help err" style={{ padding: "12px 14px", borderRadius: "14px", background: "var(--errSoft)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: COMPTE & ACCÈS */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <h1 style={{ margin: 0, fontSize: "34px", fontWeight: 800, letterSpacing: "-1px" }}>{t.createTitle}</h1>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 700 }}>
                    {t.email}
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      autoComplete="email"
                      placeholder="nom@exemple.ma"
                      style={{
                        height: "54px",
                        padding: "0 16px",
                        border: "1.5px solid #DAD8CF",
                        borderRadius: "14px",
                        fontFamily: "inherit",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 700 }}>
                    {t.password}
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      autoComplete="new-password"
                      style={{
                        height: "54px",
                        padding: "0 16px",
                        border: "1.5px solid #DAD8CF",
                        borderRadius: "14px",
                        fontFamily: "inherit",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </label>

                  {/* Password 4-bar strength indicator */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px" }}>
                      {meter.map((m, i) => (
                        <span key={i} style={{ height: "6px", borderRadius: "3px", background: m.c, transition: "background .3s ease" }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: "13px" }}>
                      <span style={{ fontWeight: 800, color: strColor }}>
                        {t.strength} : {strLabel}
                      </span>
                      {passwordRules.map((r, i) => (
                        <span key={i} style={{ color: r.ok ? "#0A7A53" : "#8A9791", fontWeight: 600 }}>
                          {r.ok ? "✓" : "✕"} {r.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 700 }}>
                    {t.confirmPassword}
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                      autoComplete="new-password"
                      style={{
                        height: "54px",
                        padding: "0 16px",
                        border: "1.5px solid #DAD8CF",
                        borderRadius: "14px",
                        fontFamily: "inherit",
                        fontSize: "16px",
                        boxSizing: "border-box",
                        width: "100%",
                        outline: "none",
                      }}
                    />
                  </label>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "6px" }}>
                    <button
                      type="button"
                      onClick={handleNextToStep2}
                      style={{
                        flex: "1 1 220px",
                        height: "56px",
                        border: 0,
                        borderRadius: "14px",
                        background: "#0A7A53",
                        color: "#FFFFFF",
                        fontFamily: "inherit",
                        fontSize: "17px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {t.continueProfile}
                    </button>
                    <button
                      type="button"
                      onClick={handleGuestStart}
                      disabled={loading}
                      style={{
                        flex: "1 1 200px",
                        height: "56px",
                        borderRadius: "14px",
                        border: "1.5px solid #0F1A16",
                        background: "transparent",
                        color: "#0F1A16",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {t.tryGuest}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PROFIL & FINALISATION */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <h1 style={{ margin: 0, fontSize: "34px", fontWeight: 800, letterSpacing: "-1px" }}>{t.profileTitle}</h1>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setStep(1);
                      }}
                      style={{
                        height: "40px",
                        padding: "0 14px",
                        border: 0,
                        borderRadius: "10px",
                        background: "#F6F5EF",
                        fontFamily: "inherit",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#0F1A16",
                        cursor: "pointer",
                      }}
                    >
                      {t.back}
                    </button>
                  </div>

                  {/* Profile Photo */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span
                      style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "36px",
                        background: profilePhotoPreviewUrl ? `url(${profilePhotoPreviewUrl}) center/cover no-repeat` : "#E2F1E8",
                        color: "#0A7A53",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "26px",
                        fontWeight: 800,
                      }}
                    >
                      {!profilePhotoPreviewUrl && initial}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700 }}>{t.profilePhoto}</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handlePhotoChange}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            height: "40px",
                            padding: "0 14px",
                            borderRadius: "10px",
                            border: "1.5px solid #DAD8CF",
                            background: "#FFFFFF",
                            fontFamily: "inherit",
                            fontSize: "14px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {t.upload}
                        </button>
                        {profilePhotoPreviewUrl && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            style={{
                              height: "40px",
                              padding: "0 14px",
                              border: 0,
                              borderRadius: "10px",
                              background: "transparent",
                              color: "#B4441C",
                              fontFamily: "inherit",
                              fontSize: "14px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {t.remove}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profile Form Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 700 }}>
                      {t.firstName}
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Youssef"
                        style={{
                          height: "52px",
                          padding: "0 16px",
                          border: "1.5px solid #DAD8CF",
                          borderRadius: "14px",
                          fontFamily: "inherit",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 700 }}>
                      {t.lastName}
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Benali"
                        style={{
                          height: "52px",
                          padding: "0 16px",
                          border: "1.5px solid #DAD8CF",
                          borderRadius: "14px",
                          fontFamily: "inherit",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 700 }}>
                      {t.phone}
                      <span style={{ display: "flex", height: "52px", border: "1.5px solid #DAD8CF", borderRadius: "14px", overflow: "hidden" }}>
                        <span style={{ padding: "0 12px", display: "flex", alignItems: "center", background: "#F6F5EF", fontWeight: 700 }}>
                          {dial}
                        </span>
                        <input
                          type="tel"
                          placeholder="6 12 34 56 78"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            border: 0,
                            padding: "0 12px",
                            fontFamily: "inherit",
                            fontSize: "16px",
                            outline: "none",
                          }}
                        />
                      </span>
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 700 }}>
                      {t.birthDate}
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        style={{
                          height: "52px",
                          padding: "0 16px",
                          border: "1.5px solid #DAD8CF",
                          borderRadius: "14px",
                          fontFamily: "inherit",
                          fontSize: "16px",
                          boxSizing: "border-box",
                          width: "100%",
                          outline: "none",
                        }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 700 }}>
                      {t.country}
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value as CountryName)}
                        style={{
                          height: "52px",
                          padding: "0 12px",
                          border: "1.5px solid #DAD8CF",
                          borderRadius: "14px",
                          background: "#FFFFFF",
                          fontFamily: "inherit",
                          fontSize: "16px",
                          outline: "none",
                        }}
                      >
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 700 }}>
                      {t.city}
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        style={{
                          height: "52px",
                          padding: "0 12px",
                          border: "1.5px solid #DAD8CF",
                          borderRadius: "14px",
                          background: "#FFFFFF",
                          fontFamily: "inherit",
                          fontSize: "16px",
                          outline: "none",
                        }}
                      >
                        {cities.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <span style={{ marginTop: "-6px", fontSize: "13px", color: "#55645D" }}>{t.ageNotice}</span>

                  {/* reCAPTCHA Widget */}
                  {recaptchaSiteKey && !allowRecaptchaBypass ? (
                    <div ref={recaptchaContainerRef} style={{ minHeight: "76px" }} />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "304px",
                        maxWidth: "100%",
                        height: "76px",
                        padding: "0 14px",
                        boxSizing: "border-box",
                        border: "1px solid #D3D3D3",
                        borderRadius: "4px",
                        background: "#F9F9F9",
                        fontSize: "14px",
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={Boolean(recaptchaToken)}
                          onChange={(e) => setRecaptchaToken(e.target.checked ? "dev-token-ok" : null)}
                          style={{ width: "24px", height: "24px" }}
                        />
                        {t.recaptchaNotRobot}
                      </label>
                      <span style={{ fontSize: "10px", color: "#6B6B6B", textAlign: "center" }}>[ reCAPTCHA ]</span>
                    </div>
                  )}

                  {/* CGU Acceptance Checkbox */}
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "15px", lineHeight: 1.45 }}>
                    <input
                      type="checkbox"
                      checked={cguAccepted}
                      onChange={(e) => setCguAccepted(e.target.checked)}
                      style={{ width: "20px", height: "20px", marginTop: "2px", accentColor: "#0A7A53" }}
                    />
                    <span>
                      J’accepte les{" "}
                      <Link href="/cgu" style={{ fontWeight: 700 }}>
                        Conditions générales d’utilisation
                      </Link>{" "}
                      et la{" "}
                      <Link href="/privacy" style={{ fontWeight: 700 }}>
                        Politique de confidentialité
                      </Link>
                      .
                    </span>
                  </label>

                  {/* Final Submit Button */}
                  <button
                    type="button"
                    onClick={handleRegisterAndStartOnboarding}
                    disabled={loading}
                    style={{
                      height: "56px",
                      borderRadius: "14px",
                      background: "#0A7A53",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "17px",
                      fontWeight: 800,
                      border: 0,
                      cursor: "pointer",
                      gap: "10px",
                    }}
                  >
                    {loading ? t.submitting : t.submitCreate}
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {/* Aside: Live Preview Card */}
        <aside
          aria-label={t.livePreview}
          style={{
            flex: "1 1 320px",
            minWidth: 0,
            position: "sticky",
            top: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "1.5px", color: "#55645D" }}>
            {t.livePreview}
          </span>
          <div
            style={{
              borderRadius: "28px",
              background: "#06402C",
              color: "#FFFFFF",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              boxShadow: "0 24px 60px -24px rgba(6,64,44,.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "28px",
                  background: "#F2B544",
                  color: "#0F1A16",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  fontWeight: 800,
                }}
              >
                {initial}
              </span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <b style={{ fontSize: "20px" }}>
                  {t.salam}, {firstName.trim() || (locale === "ar" ? "بيك" : "toi")}
                </b>
                <span style={{ fontSize: "14px", color: "#9FD8BE" }}>
                  {city}, {country}
                </span>
              </div>
            </div>

            <div
              style={{
                borderRadius: "18px",
                background: "rgba(255,255,255,0.08)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "13px", color: "#9FD8BE" }}>{t.budgetCurrency}</span>
              <b style={{ fontSize: "26px" }}>{currency}</b>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", color: "#CFE6DB" }}>
              <span style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "4px", background: "#7FD3AE" }} />
                {t.adv1}
              </span>
              <span style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "4px", background: "#7FD3AE" }} />
                {t.adv2}
              </span>
              <span style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "4px", background: "#7FD3AE" }} />
                {t.adv3}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
