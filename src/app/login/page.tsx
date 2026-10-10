"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";

import { API_BASE, apiFetch, resetAuthClientState } from "@/lib/api";
import { fetchMe, logout, markAuthSessionHint, type AuthUser } from "@/lib/auth";
import { startGuestSession } from "@/lib/guestSession";
import { shouldShowDiscoveryWelcome } from "@/lib/guestWelcome";
import { usePlatformStatus } from "@/lib/usePlatformStatus";
import { getVisibleAnnouncements } from "@/lib/announcementVisibility";
import { SystemMessageCard } from "@/components/announcements/SystemMessageCard";
import { getLoginOptions, verifyLogin } from "@/lib/passkeys";
import { getBrowserLocalePreference, setAppLocale } from "@/components/i18n/LanguagePreferenceGate";
import { SbkWLoader } from "@/components/ui/SbkWLoader";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";
import { getAppVersionLabel } from "@/lib/app-version";

type LoginGeoPayload = {
  geo_lat: number;
  geo_lng: number;
  geo_accuracy_m: number;
  geo_label: string;
};
const SUPERADMIN_GEO_REQUIRED_UI = "SUPERADMIN_GEO_REQUIRED_UI";
const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";

const QUOTES = [
  {
    tag: { fr: "DISCIPLINE", ar: "الانضباط", en: "DISCIPLINE" },
    text: {
      fr: "Chaque dirham à sa place",
      ar: "كل درهم فبلاصتو",
      en: "Every dirham in its place",
    },
    ar: "كل درهم فبلاصتو",
  },
  {
    tag: { fr: "ÉPARGNE", ar: "التوفير", en: "SAVING" },
    text: {
      fr: "Paie-toi en premier, dépense ensuite",
      ar: "خلّص راسك هو الأول",
      en: "Pay yourself first, spend after",
    },
    ar: "خلّص راسك هو الأول",
  },
  {
    tag: { fr: "SÉRÉNITÉ", ar: "الراحة", en: "PEACE OF MIND" },
    text: {
      fr: "Un budget, c’est la liberté de dire oui",
      ar: "الميزانية هي الحرية",
      en: "A budget is the freedom to say yes",
    },
    ar: "الميزانية هي الحرية",
  },
  {
    tag: { fr: "PATIENCE", ar: "الصبر", en: "PATIENCE" },
    text: {
      fr: "Les petites sommes font les grands projets",
      ar: "قطرة قطرة كيحمل الواد",
      en: "Small sums build big projects",
    },
    ar: "قطرة قطرة كيحمل الواد",
  },
];

const COPY = {
  fr: {
    home: "Accueil",
    title: "Bon retour",
    sub: "Reprends le contrôle de ton budget en enveloppes.",
    email: "E-mail",
    phone: "Téléphone",
    phoneNumber: "Numéro de téléphone",
    smsHelp: "Un code de vérification SMS sera envoyé à ce numéro.",
    password: "Mot de passe",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    forgot: "Mot de passe oublié ?",
    remember: "Se souvenir de moi",
    signin: "Se connecter",
    signingIn: "Connexion en cours…",
    sendCode: "Recevoir le code SMS",
    passkeyBtn: "Se connecter avec Touch ID / Face ID",
    orEmail: "ou par identifiants",
    guestTitle: "Mode découverte (invité)",
    guestSub: "2 min pour tester sans compte ni inscription",
    newHere: "Nouveau sur 7sabek ?",
    signup: "Inscription",
    guest: "Invité",
    caps: "Touche Majuscule (Caps Lock) activée",
    pwWrong: "Mot de passe incorrect.",
    resetIt: "Le réinitialiser ?",
    emailUnknown: "Aucun compte trouvé avec cet e-mail.",
    createIt: "Créer un compte",
    emailEmpty: "Entre ton adresse e-mail pour continuer.",
    tipNote: "Astuce : 7sabek fonctionne sans connexion bancaire, par enveloppes de dépenses.",
    nextTip: "Astuce suivante",
    terms: "Conditions",
    privacy: "Confidentialité",
    contact: "Contact",
    news: "Nouveautés",
    welcomeBack: "Bon retour",
    continueAs: "Continuer en tant que",
    passkeyHint: "Connexion sécurisée par empreinte ou code",
    notMe: "Ce n'est pas vous ? Changer de compte",
    maint: "Maintenance en cours : seuls les superadmins peuvent se connecter.",
    locked: "Trop de tentatives infructueuses. Merci de patienter quelques minutes.",
    waitLocked: "Patientez avant de réessayer",
    saveContinue: "Enregistrer et continuer",
    otpTitle: "Code de vérification",
    otpLabel: "Code à 6 chiffres",
    pasteHint: "Colle directement les 6 chiffres du code.",
    codeWrong: "Code incorrect. Réessaie.",
    trust: "Faire confiance à cet appareil pendant 30 jours",
    verify: "Vérifier le code",
    verifying: "Vérification…",
    noCode: "Tu n'as pas reçu de code ?",
    resend: "Renvoyer dans",
    back: "Retour",
    invalidCredentials: "Email ou mot de passe incorrect.",
    noAccount: "Aucun compte trouvé avec cet email.",
    disabled: "Compte désactivé. Contacte le support.",
    limited: (s: string) => `Compte limité. Contactez ${s}.`,
    expiredPassword: "Mot de passe expiré. Merci d’en définir un nouveau.",
    geoRequired: "Accès GPS requis pour ce compte superadmin.",
    suspicious: (s: string) => `Connexion refusée. Contacte ${s}.`,
    verifyEmail: "Veuillez vérifier votre email pour activer le compte.",
    loginFailed: "Impossible de se connecter. Réessaie.",
    validEmail: "Merci d’entrer un email valide.",
    requestFailed: "Requête échouée.",
    unknownError: "Erreur inconnue.",
    newPasswordLength: "Le mot de passe doit comporter au moins 8 caractères.",
    confirmMismatch: "La confirmation ne correspond pas.",
    quickSignInError: "Connexion rapide impossible. Réessaie.",
    guestStartError: "Impossible de démarrer le mode découverte.",
  },
  ar: {
    home: "الرئيسية",
    title: "مرحبا برجوعك",
    sub: "رجّع التحكم فالميزانية ديالك بالأظرفة.",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    phoneNumber: "رقم الهاتف",
    smsHelp: "غادي يوصلك كود فالـ SMS لتأكيد الدخول.",
    password: "كلمة السر",
    newPassword: "كلمة السر الجديدة",
    confirmPassword: "تأكيد كلمة السر",
    forgot: "نسيتي كلمة السر؟",
    remember: "عقل عليا فهاد المتصفح",
    signin: "تسجيل الدخول",
    signingIn: "جاري الدخول…",
    sendCode: "طلب كود SMS",
    passkeyBtn: "الدخول بالبصمة / Face ID",
    orEmail: "أو بالبريد وكلمة السر",
    guestTitle: "وضع الاكتشاف (ضيف)",
    guestSub: "دقيقتين لتجربة التطبيق بدون تسجيل",
    newHere: "جديد فـ 7sabek؟",
    signup: "إنشاء حساب",
    guest: "ضيف",
    caps: "زر الحروف الكبيرة (Caps Lock) مشعول",
    pwWrong: "كلمة السر ماشي صحيحة.",
    resetIt: "تبدلها؟",
    emailUnknown: "ما كاين حتى حساب بهاد الإيميل.",
    createIt: "صاوب حساب",
    emailEmpty: "دخل البريد الإلكتروني ديالك باش تكمل.",
    tipNote: "حكمة : 7sabek كيعتمد على نظام الأظرفة وكايحافظ على سرية فلوسك بلا ربط بنكي.",
    nextTip: "الحكمة الموالية",
    terms: "الشروط",
    privacy: "الخصوصية",
    contact: "الدعم",
    news: "الجديد",
    welcomeBack: "مرحبا بيك من جديد",
    continueAs: "المتابعة بحساب",
    passkeyHint: "تسجيل دخول آمن بالبصمة أو كود المرور",
    notMe: "ماشي نتا؟ بدّل الحساب",
    maint: "كاينة صيانة دابا : غير السوبر أدمن يقدر يدخل.",
    locked: "بزاف ديال المحاولات. عفاك تسنى شوية وعاود.",
    waitLocked: "تسنى شوية قبل المحاولة",
    saveContinue: "حفظ ومتابعة",
    otpTitle: "رمز التأكيد",
    otpLabel: "كود من 6 أرقام",
    pasteHint: "لصق الكود مباشرة من الحافظة.",
    codeWrong: "الكود غلط. عاود المحاولة.",
    trust: "ثق فهاد الجهاز لمدة 30 يوم",
    verify: "تأكيد الكود",
    verifying: "جاري التحقق…",
    noCode: "ما وصلكش الكود؟",
    resend: "إعادة الإرسال بعد",
    back: "رجوع",
    invalidCredentials: "الإيميل ولا كلمة السر ماشي صحيحة.",
    noAccount: "ما كاين حتى حساب بهاد الإيميل.",
    disabled: "الحساب متوقف. تاصل بالدعم.",
    limited: (_s: string) => "الحساب محدود. تاصل بالدعم.",
    expiredPassword: "كلمة السر سالات. بدلها باش تكمل.",
    geoRequired: "الموقع GPS ضروري للدخول بهاد الحساب.",
    suspicious: (_s: string) => "الاتصال مشكوك فيه. تاصل بالدعم.",
    verifyEmail: "أكد البريد الإلكتروني باش تفعل الحساب.",
    loginFailed: "ما قدرناش ندخلوك دابا. عاود المحاولة.",
    validEmail: "دخل إيميل صحيح.",
    requestFailed: "وقع مشكل فالطلب.",
    unknownError: "وقع مشكل غير معروف.",
    newPasswordLength: "كلمة السر خاصها تكون على الأقل 8 حروف.",
    confirmMismatch: "التأكيد ما مطابقش.",
    quickSignInError: "ما قدرناش ندخلوك بالبصمة.",
    guestStartError: "ما قدرناش نبداو وضع الاكتشاف.",
  },
  en: {
    home: "Home",
    title: "Welcome back",
    sub: "Take control of your budget with envelope savings.",
    email: "Email",
    phone: "Phone",
    phoneNumber: "Phone number",
    smsHelp: "A verification SMS code will be sent to this number.",
    password: "Password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    forgot: "Forgot password?",
    remember: "Remember me",
    signin: "Sign in",
    signingIn: "Signing in…",
    sendCode: "Send SMS code",
    passkeyBtn: "Sign in with Touch ID / Face ID",
    orEmail: "or with credentials",
    guestTitle: "Discovery mode (Guest)",
    guestSub: "2 min to test without account or signup",
    newHere: "New to 7sabek?",
    signup: "Sign up",
    guest: "Guest",
    caps: "Caps Lock is on",
    pwWrong: "Incorrect password.",
    resetIt: "Reset it?",
    emailUnknown: "No account found with this email.",
    createIt: "Create one",
    emailEmpty: "Enter your email address to continue.",
    tipNote: "Tip: 7sabek works without bank syncing, using cash envelopes.",
    nextTip: "Next tip",
    terms: "Terms",
    privacy: "Privacy",
    contact: "Contact",
    news: "Releases",
    welcomeBack: "Welcome back",
    continueAs: "Continue as",
    passkeyHint: "Secure sign-in with fingerprint or passkey",
    notMe: "Not you? Switch account",
    maint: "Maintenance active: only superadmins can log in.",
    locked: "Too many failed attempts. Please wait a few moments.",
    waitLocked: "Please wait before retrying",
    saveContinue: "Save & continue",
    otpTitle: "Verification code",
    otpLabel: "6-digit code",
    pasteHint: "Paste the 6-digit code directly.",
    codeWrong: "Incorrect code. Try again.",
    trust: "Trust this device for 30 days",
    verify: "Verify code",
    verifying: "Verifying…",
    noCode: "Didn't receive a code?",
    resend: "Resend in",
    back: "Back",
    invalidCredentials: "Incorrect email or password.",
    noAccount: "No account found with this email.",
    disabled: "Account disabled. Contact support.",
    limited: (s: string) => `Account limited. Contact ${s}.`,
    expiredPassword: "Password expired. Please set a new password.",
    geoRequired: "GPS location access required for this account.",
    suspicious: (s: string) => `Login blocked. Contact ${s}.`,
    verifyEmail: "Please verify your email to activate the account.",
    loginFailed: "Unable to sign in. Try again.",
    validEmail: "Please enter a valid email.",
    requestFailed: "Request failed.",
    unknownError: "Unknown error.",
    newPasswordLength: "Password must have at least 8 characters.",
    confirmMismatch: "Passwords do not match.",
    quickSignInError: "Quick sign-in failed. Try again.",
    guestStartError: "Unable to start discovery mode.",
  },
};

export default function LoginPage() {
  const router = useRouter();

  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [theme, setTheme] = useState<"clair" | "sombre">("clair");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const [method, setMethod] = useState<"email" | "phone">("email");
  const [methodSwitched, setMethodSwitched] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forceReset, setForceReset] = useState(false);

  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [quickSignInLoading, setQuickSignInLoading] = useState(false);
  const [quickSignInError, setQuickSignInError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);

  const [accountOpeningTarget, setAccountOpeningTarget] = useState<string | null>(null);
  const [passkeysSupported, setPasskeysSupported] = useState(false);

  const status = usePlatformStatus();
  const supportEmail = status?.support_email || "support@7sabek.ma";
  const t = COPY[locale];
  const appVersionLabel = getAppVersionLabel();
  const isRtl = locale === "ar";
  const currentQuote = QUOTES[quoteIdx];

  // Geolocation for Superadmin
  const requestGeolocation = async (): Promise<LoginGeoPayload> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      throw new Error(SUPERADMIN_GEO_REQUIRED_UI);
    }
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      });
    }).catch(() => {
      throw new Error(SUPERADMIN_GEO_REQUIRED_UI);
    });

    return {
      geo_lat: position.coords.latitude,
      geo_lng: position.coords.longitude,
      geo_accuracy_m: Math.max(0, position.coords.accuracy ?? 0),
      geo_label: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
    };
  };

  const getDeviceMetadata = () => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent ?? "" : "";
    let browser = "Unknown";
    let os = "Unknown";
    let device = "Desktop";
    const uaLow = ua.toLowerCase();

    if (uaLow.includes("edg/")) browser = "Microsoft Edge";
    else if (uaLow.includes("opr/") || uaLow.includes("opera")) browser = "Opera";
    else if (uaLow.includes("chrome/") && !uaLow.includes("edg/")) browser = "Google Chrome";
    else if (uaLow.includes("safari/") && !uaLow.includes("chrome/")) browser = "Safari";
    else if (uaLow.includes("firefox/")) browser = "Mozilla Firefox";

    if (uaLow.includes("windows")) os = "Windows";
    else if (uaLow.includes("mac os x") || uaLow.includes("macintosh")) os = "macOS";
    else if (uaLow.includes("android")) os = "Android";
    else if (uaLow.includes("iphone") || uaLow.includes("ipad") || uaLow.includes("ios")) os = "iOS";
    else if (uaLow.includes("linux")) os = "Linux";

    if (uaLow.includes("ipad") || uaLow.includes("tablet")) device = "Tablet";
    else if (uaLow.includes("mobile") || uaLow.includes("iphone") || uaLow.includes("android")) device = "Mobile";

    return { browser, os, device };
  };

  const extractErrorMessage = (payload: string) => {
    const trimmed = payload.trim();
    if (!trimmed) return t.requestFailed;
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as { detail?: string | { msg?: string }[]; message?: string };
        if (typeof parsed.detail === "string") return parsed.detail;
        if (typeof parsed.message === "string") return parsed.message;
        if (Array.isArray(parsed.detail)) {
          return parsed.detail.map((item) => item.msg ?? t.requestFailed).join(", ");
        }
      } catch {
        return payload;
      }
    }
    return payload;
  };

  const getAuthErrorMessage = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes("trop de tentatives") || lower.includes("réessaie") || lower.includes("wait")) {
      return message;
    }
    if (lower.includes("invalid credentials") || lower.includes("unauthorized") || lower.includes("incorrect")) {
      return t.invalidCredentials;
    }
    if (lower.includes("not found") || lower.includes("no account") || lower.includes("inconnu")) {
      return t.noAccount;
    }
    if (lower.includes("disabled") || lower.includes("inactive")) {
      return t.disabled;
    }
    if (lower.includes("limité") || lower.includes("suspendu")) {
      return t.limited(supportEmail);
    }
    if (lower.includes("password_reset_required")) {
      return t.expiredPassword;
    }
    if (lower.includes("gps") || lower.includes("superadmin_geo_required")) {
      return t.geoRequired;
    }
    if (lower.includes("suspecte") || lower.includes("ip_address_blocked")) {
      return t.suspicious(supportEmail);
    }
    if (lower.includes("verify") || lower.includes("confirm")) {
      return t.verifyEmail;
    }
    return message || t.loginFailed;
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

  useEffect(() => {
    setPasskeysSupported(typeof window !== "undefined" && "PublicKeyCredential" in window);
    fetchMe().then(setUser).catch(() => setUser(null));
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

  const changeLocale = (next: FloussyLocale) => {
    setLocale(next);
    setAppLocale(next);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setQuickSignInError(null);
    setForceReset(false);
    setRetryAfterSeconds(null);

    if (method === "email") {
      if (!email.trim()) {
        setError(t.emailEmpty);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError(t.validEmail);
        return;
      }
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const deviceMetadata = getDeviceMetadata();

      const sendLoginRequest = async (geo?: LoginGeoPayload) => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10_000);
        try {
          return await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            signal: controller.signal,
            body: JSON.stringify({
              email: method === "email" ? normalizedEmail : `212${phone.replace(/\D/g, "")}@phone.7sabek.ma`,
              password,
              ...deviceMetadata,
              ...(geo ?? {}),
            }),
          });
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      let response = await sendLoginRequest();
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        let message = extractErrorMessage(text);
        const requiresSuperadminGeo =
          response.status === 403 && message.toLowerCase().includes("superadmin_geo_required");

        if (requiresSuperadminGeo) {
          const geo = await requestGeolocation();
          response = await sendLoginRequest(geo);
          if (!response.ok) {
            const secondText = await response.text().catch(() => "");
            message = extractErrorMessage(secondText);
          }
        }

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = parseRetryAfter(response.headers.get("Retry-After"), message);
            if (retryAfter) setRetryAfterSeconds(retryAfter);
          }
          throw new Error(message || t.requestFailed);
        }
      }

      resetAuthClientState();
      const me = await fetchMe();
      markAuthSessionHint();
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("sbk_account_opening", "1");
      }
      const target = me.role === "superadmin" ? "/superadmin" : "/dashboard";
      router.prefetch(target);
      setAccountOpeningTarget(target);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.unknownError;
      if (message === SUPERADMIN_GEO_REQUIRED_UI) {
        setError(t.geoRequired);
        return;
      }
      setError(getAuthErrorMessage(message));
      if (String(message).toLowerCase().includes("password_reset_required")) {
        setForceReset(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSignIn = async () => {
    setError(null);
    setQuickSignInError(null);
    setQuickSignInLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
      const loginOptions = await getLoginOptions(validEmail ? normalizedEmail : undefined);
      if (!loginOptions) return;
      const credential = await startAuthentication({
        optionsJSON: loginOptions.options,
      });
      const metadata = getDeviceMetadata();
      const challenge = String(loginOptions.options.challenge ?? "");
      const result = await verifyLogin({
        challenge_id: loginOptions.challenge_id,
        challenge,
        credential,
        ...metadata,
      });
      if (!result) return;
      resetAuthClientState();
      const me = await fetchMe();
      markAuthSessionHint();
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("sbk_account_opening", "1");
      }
      const target = me.role === "superadmin" ? "/superadmin" : "/dashboard";
      router.prefetch(target);
      setAccountOpeningTarget(target);
    } catch {
      setQuickSignInError(t.quickSignInError);
    } finally {
      setQuickSignInLoading(false);
    }
  };

  const handleGuestStart = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      resetAuthClientState();
      const guest = await startGuestSession();
      markAuthSessionHint();
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("sbk_account_opening", "1");
      }
      const target = shouldShowDiscoveryWelcome(guest) ? "/decouverte" : "/dashboard";
      router.prefetch(target);
      setAccountOpeningTarget(target);
    } catch {
      setError(t.guestStartError);
    } finally {
      setGuestLoading(false);
    }
  };

  const handleForceReset = async () => {
    setError(null);
    if (!newPassword || newPassword.length < 8) {
      setError(t.newPasswordLength);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t.confirmMismatch);
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await apiFetch("/auth/force-reset", {
        method: "POST",
        body: {
          email: normalizedEmail,
          current_password: password,
          new_password: newPassword,
        },
      });
      const me = await fetchMe();
      markAuthSessionHint();
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("sbk_account_opening", "1");
      }
      const target = me.role === "superadmin" ? "/superadmin" : "/dashboard";
      router.prefetch(target);
      setAccountOpeningTarget(target);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.unknownError;
      setError(getAuthErrorMessage(message));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout()
      .catch(() => null)
      .finally(() => setUser(null));
  };

  const maintenanceActive = Boolean(status?.maintenance_mode);
  const maintenanceMessage = status?.maintenance_message || "";
  const loginAnnouncements = getVisibleAnnouncements(status, user, "login");

  if (accountOpeningTarget) {
    return (
      <SbkWLoader
        mode="complete"
        fullscreen
        theme="dark"
        locale={locale}
        speed="normal"
        onComplete={() => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("sbk_just_animated_login", String(Date.now()));
          }
          router.push(accountOpeningTarget);
        }}
      />
    );
  }

  const rootCls = `lg ${theme === "sombre" ? "t-dark" : "t-light"}`;
  const flip = isRtl ? "scaleX(-1)" : "none";
  const thumbX = method === "phone" ? (isRtl ? "-100%" : "100%") : "0%";

  return (
    <div className={rootCls} dir={isRtl ? "rtl" : "ltr"}>
      {/* ----------------- LEFT HERO BRAND ASIDE ----------------- */}
      <aside className="lg-left">
        {/* Glow ambient spots */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "520px",
            height: "520px",
            left: "-160px",
            top: "-140px",
            borderRadius: "50%",
            background: "#19A56F",
            filter: "blur(90px)",
            opacity: 0.7,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "420px",
            height: "420px",
            right: "-140px",
            bottom: "-120px",
            borderRadius: "50%",
            background: "#E0A43A",
            filter: "blur(100px)",
            opacity: 0.4,
          }}
        />

        {/* 7sabek Wordmark Logo */}
        <Link
          href="/"
          dir="ltr"
          aria-label={`7sabek — ${t.home}`}
          style={{ position: "relative", display: "block", width: "150px", color: "#FFFFFF" }}
        >
          <svg viewBox="10 540 1880 840" width="150" style={{ display: "block", overflow: "visible" }} aria-hidden="true">
            <defs>
              <linearGradient id="lg150" gradientUnits="userSpaceOnUse" x1="520" y1="560" x2="140" y2="1290">
                <stop offset="0" stopColor="#3DF0A8" />
                <stop offset="1" stopColor="#00B06E" />
              </linearGradient>
            </defs>
            <path
              fill="url(#lg150)"
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

        {/* Floating Glassmorphic Quote Cadran */}
        <div
          className="lg-quote"
          style={{
            position: "relative",
            margin: "auto 0",
            display: "flex",
            flexDirection: "column",
            gap: "22px",
            maxWidth: "460px",
          }}
        >
          <div
            style={{
              borderRadius: "28px",
              padding: "32px",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(22px) saturate(160%)",
              WebkitBackdropFilter: "blur(22px) saturate(160%)",
              border: "1px solid rgba(255,255,255,0.22)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 24px 60px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "1.5px", color: "#F2B544" }}>
                {currentQuote.tag[locale]}
              </span>
              <span style={{ fontFamily: "Cairo, sans-serif", fontSize: "14px", color: "#CFE6DB" }}>
                حكمة مالية
              </span>
            </div>

            <p style={{ margin: 0, fontSize: "28px", lineHeight: 1.25, fontWeight: 800 }}>
              « {currentQuote.text[locale]} »
            </p>

            <p
              dir="rtl"
              style={{
                margin: 0,
                fontFamily: "Cairo, sans-serif",
                fontSize: "19px",
                lineHeight: 1.6,
                color: "#E7F3ED",
              }}
            >
              {currentQuote.ar}
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {QUOTES.map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: i === quoteIdx ? "22px" : "6px",
                      height: "6px",
                      borderRadius: "3px",
                      background: i === quoteIdx ? "#F2B544" : "rgba(255,255,255,0.35)",
                      transition: "width .3s ease, background .3s ease",
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setQuoteIdx((prev) => (prev + 1) % QUOTES.length)}
                aria-label={t.nextTip}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "22px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transform: flip,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.6, color: "#CFE6DB" }}>
            {t.tipNote}
          </p>
        </div>
      </aside>

      {/* ----------------- RIGHT FORM SECTION ----------------- */}
      <section className="lg-right">
        {/* Top Navbar */}
        <div className="lg-top" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/"
            style={{
              height: "40px",
              padding: "0 14px",
              borderRadius: "12px",
              background: "var(--card)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
            {t.home}
          </Link>

          <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Language Chip */}
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

            {/* Dark / Light Theme Toggle */}
            <button
              type="button"
              className="lg-icon"
              onClick={() => setTheme((prev) => (prev === "sombre" ? "clair" : "sombre"))}
              aria-label={theme === "sombre" ? "Mode clair" : "Mode sombre"}
              title={theme === "sombre" ? "Mode clair" : "Mode sombre"}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {theme === "sombre" ? (
                  <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
                ) : (
                  <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div
          className="lg-main"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "28px 0",
          }}
        >
          {user ? (
            /* Returning Connected User View */
            <div className="lg-form lg-anim">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center" }}>
                <span
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #00D284, #0A7A53)",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "32px",
                    fontWeight: 800,
                    boxShadow: "0 0 0 6px var(--brandSoft)",
                  }}
                >
                  {(user?.first_name || user?.email || "U")[0].toUpperCase()}
                </span>
                <div>
                  <h1 className="lg-h1">{t.welcomeBack}</h1>
                  <p className="lg-sub" dir="ltr">
                    {user?.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="lg-btn"
                onClick={() => router.push(user?.role === "superadmin" ? "/superadmin" : "/dashboard")}
              >
                {t.continueAs} {user?.first_name || user?.email}
              </button>

              <button
                type="button"
                className="lg-ghost"
                onClick={handleLogout}
              >
                {t.notMe}
              </button>
            </div>
          ) : (
            /* Main Login Form */
            <form className="lg-form lg-anim" onSubmit={handleLogin} noValidate>
              <div>
                <h1 className="lg-h1">{forceReset ? t.saveContinue : t.title}</h1>
                <p className="lg-sub">{t.sub}</p>
              </div>

              {/* Maintenance Banner */}
              {maintenanceActive && (
                <div role="status" className="lg-help warn" style={{ padding: "12px 14px", borderRadius: "14px", background: "var(--warnSoft)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />
                  </svg>
                  <span>{maintenanceMessage || t.maint}</span>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div role="alert" className="lg-help err" style={{ padding: "12px 14px", borderRadius: "14px", background: "var(--errSoft)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Rate Limit Timeout Banner */}
              {retryAfterSeconds && retryAfterSeconds > 0 && (
                <div role="alert" className="lg-help warn" style={{ padding: "12px 14px", borderRadius: "14px", background: "var(--warnSoft)" }}>
                  <span>{t.locked} ({retryAfterSeconds}s)</span>
                </div>
              )}

              {/* System Announcements */}
              {loginAnnouncements.map((ann) => (
                <SystemMessageCard key={ann.id} variant="announcement" message={ann.message} announcementType={ann.type} />
              ))}

              {/* Method Switcher Segmented Control */}
              {!forceReset && (
                <div className="lg-seg" role="tablist" aria-label="Méthode de connexion">
                  <span className="lg-thumb" aria-hidden="true" style={{ transform: `translateX(${thumbX})` }} />
                  <button
                    type="button"
                    role="tab"
                    className={method === "email" ? "on" : ""}
                    aria-selected={method === "email"}
                    onClick={() => {
                      if (method !== "email") {
                        setMethod("email");
                        setMethodSwitched(true);
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18v13H3zM3 7l9 6 9-6" />
                    </svg>
                    {t.email}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    className={method === "phone" ? "on" : ""}
                    aria-selected={method === "phone"}
                    onClick={() => {
                      if (method !== "phone") {
                        setMethod("phone");
                        setMethodSwitched(true);
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 3h10v18H7zM11 18h2" />
                    </svg>
                    {t.phone}
                  </button>
                </div>
              )}

              {/* Email Mode Inputs */}
              {method === "email" && (
                <div className={`lg-swap ${methodSwitched ? (isRtl ? "from-r" : "from-l") : ""}`}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <span className="lg-label">{t.email}</span>
                    <input
                      className={`lg-input ${error && !email.trim() ? "bad" : ""}`}
                      type="email"
                      dir="ltr"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      placeholder="nom@exemple.ma"
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}>
                    <span className="lg-label">
                      <span>{forceReset ? t.newPassword : t.password}</span>
                      {!forceReset && (
                        <Link href="/forgot-password" style={{ fontSize: "14px" }}>
                          {t.forgot}
                        </Link>
                      )}
                    </span>
                    <span dir="ltr" style={{ position: "relative", display: "block" }}>
                      <input
                        className={`lg-input lg-pw ${showPassword ? "shown" : ""}`}
                        type={showPassword ? "text" : "password"}
                        dir="ltr"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError(null);
                        }}
                        onKeyUp={(e) => {
                          const caps = !!(e && e.getModifierState && e.getModifierState("CapsLock"));
                          setCapsLockActive(caps);
                        }}
                        style={{ paddingInlineEnd: "52px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Masquer" : "Afficher"}
                        title={showPassword ? "Masquer" : "Afficher"}
                        style={{
                          position: "absolute",
                          top: "4px",
                          insetInlineEnd: "4px",
                          width: "44px",
                          height: "44px",
                          border: 0,
                          borderRadius: "10px",
                          background: "transparent",
                          color: "var(--sub)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        {showPassword ? (
                          <span className="lg-eyeanim">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                            </svg>
                          </span>
                        ) : (
                          <span className="lg-eyeanim">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                            </svg>
                          </span>
                        )}
                      </button>
                    </span>
                  </label>

                  {/* CapsLock detector */}
                  {capsLockActive && (
                    <div className="lg-help warn" role="status" style={{ marginTop: "8px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      </svg>
                      <span>{t.caps}</span>
                    </div>
                  )}

                  {/* Force Reset fields if required by policy */}
                  {forceReset && (
                    <label style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}>
                      <span className="lg-label">{t.confirmPassword}</span>
                      <input
                        className="lg-input"
                        type="password"
                        dir="ltr"
                        autoComplete="new-password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Phone Mode Inputs */}
              {method === "phone" && (
                <div className={`lg-swap ${methodSwitched ? (isRtl ? "from-l" : "from-r") : ""}`}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <span className="lg-label">{t.phoneNumber}</span>
                    <span dir="ltr" style={{ display: "flex", gap: "8px" }}>
                      <span className="lg-input" style={{ width: "108px", flex: "none", display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                        🇲🇦 +212
                      </span>
                      <input
                        className="lg-input"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="6 12 34 56 78"
                      />
                    </span>
                  </label>
                  <span className="lg-help" style={{ color: "var(--sub)", marginTop: "8px" }}>
                    {t.smsHelp}
                  </span>
                </div>
              )}

              {/* Remember Me */}
              {!forceReset && (
                <label className="lg-check" style={{ marginTop: "4px" }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  {t.remember}
                </label>
              )}

              {/* Submit Button */}
              <button
                type={forceReset ? "button" : "submit"}
                onClick={forceReset ? handleForceReset : undefined}
                className="lg-btn"
                disabled={loading || Boolean(retryAfterSeconds)}
                aria-busy={loading}
              >
                {loading && (
                  <svg viewBox="0 540 700 760" width="18" height="20" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
                    <path
                      fill="#FFFFFF"
                      d="M143.9 1281.0 27.0 1280.7 23.3 1278.6 22.5 1273.5 26.0 1266.8 65.5 1209.8 80.1 1187.1 100.9 1157.7 107.5 1147.0 178.4 1045.5 276.4 902.2 291.8 880.9 316.8 843.1 339.3 811.7 388.6 738.9 404.8 716.6 417.8 697.5 419.2 693.2 418.2 691.2 415.4 690.4 298.2 691.0 42.7 690.6 39.9 688.9 38.3 686.5 39.7 678.5 57.5 639.4 66.4 617.6 74.1 602.2 79.9 587.7 86.4 576.7 95.5 566.5 104.8 560.2 113.9 556.6 127.6 554.1 633.8 554.1 645.8 556.6 652.9 560.0 657.8 563.5 662.6 568.7 668.2 578.7 671.3 591.4 671.0 605.1 668.6 616.4 663.2 629.8 654.9 644.5 636.2 671.5 535.6 810.6 411.4 985.5 317.2 1115.2 281.8 1166.1 255.8 1201.0 218.5 1254.2 205.1 1267.2 191.3 1275.0 183.0 1277.9 171.0 1280.4 143.9 1281.0Z"
                    />
                    <circle className="lg-dotbounce" cx="625" cy="1276" r="70" fill="#7CF0A6" />
                  </svg>
                )}
                <span>
                  {loading ? t.signingIn : retryAfterSeconds ? t.waitLocked : forceReset ? t.saveContinue : method === "phone" ? t.sendCode : t.signin}
                </span>
              </button>

              {/* Passkey Fast Sign-in Button */}
              {passkeysSupported && !forceReset && (
                <button
                  type="button"
                  className="lg-ghost"
                  onClick={handleQuickSignIn}
                  disabled={quickSignInLoading}
                  style={{ height: "44px", borderColor: "transparent", color: "var(--sub)", fontSize: "14.5px" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 11v4M8 11a4 4 0 0 1 8 0v2a8 8 0 0 1-1 4M6.5 8.5A7 7 0 0 1 19 11v1M5 13v-2a7 7 0 0 1 .5-2.5M9 15a12 12 0 0 1-1 5M12 19v2" />
                  </svg>
                  {quickSignInLoading ? t.verifying : t.passkeyBtn}
                </button>
              )}

              {quickSignInError && (
                <p className="lg-help err" style={{ justifyContent: "center" }}>
                  {quickSignInError}
                </p>
              )}

              {/* Discovery / Guest Mode Card */}
              <button
                type="button"
                className="lg-guest"
                onClick={handleGuestStart}
                disabled={guestLoading}
                style={{ textAlign: "start", border: "none", cursor: "pointer", width: "100%" }}
              >
                <span
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "10px",
                    background: "var(--card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5" />
                  </svg>
                </span>
                <span style={{ flex: 1, lineHeight: 1.35 }}>
                  <b style={{ display: "block" }}>{t.guestTitle}</b>
                  <span style={{ fontSize: "13px", opacity: 0.85 }}>{t.guestSub}</span>
                </span>
                <span style={{ transform: flip, display: "flex" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </button>

              {/* Bottom Registration Links */}
              <p style={{ margin: "4px 0 0", textAlign: "center", fontSize: "15px", color: "var(--sub)" }}>
                {t.newHere}{" "}
                <Link href="/register" style={{ fontWeight: 800 }}>
                  {t.signup}
                </Link>{" "}
                ·{" "}
                <button
                  type="button"
                  onClick={handleGuestStart}
                  style={{ background: "none", border: "none", padding: 0, color: "var(--brand)", fontWeight: 700, cursor: "pointer" }}
                >
                  {t.guest}
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <footer
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px 18px",
            fontSize: "13.5px",
            color: "var(--muted)",
          }}
        >
          <Link href="/cgu" style={{ color: "var(--muted)" }}>
            {t.terms}
          </Link>
          <Link href="/privacy" style={{ color: "var(--muted)" }}>
            {t.privacy}
          </Link>
          <Link href="/contact" style={{ color: "var(--muted)" }}>
            {t.contact}
          </Link>
          <span>© 2026 7sabek</span>
          <Link
            href="/releases"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "26px",
              padding: "0 10px",
              borderRadius: "13px",
              background: "var(--brandSoft)",
              color: "var(--brandInk)",
              fontWeight: 800,
              fontSize: "12px",
              textDecoration: "none",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "3px", background: "var(--brand)" }} />
            v{appVersionLabel || "1.6.2"} · {t.news}
          </Link>
        </footer>
      </section>
    </div>
  );
}
