"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Fingerprint, Home } from "lucide-react";
import { Cairo, Fraunces, Manrope } from "next/font/google";
import { startAuthentication } from "@simplewebauthn/browser";

import { API_BASE, apiFetch, resetAuthClientState } from "@/lib/api";
import { fetchMe, logout, markAuthSessionHint, type AuthUser } from "@/lib/auth";
import { usePlatformStatus } from "@/lib/usePlatformStatus";
import { getVisibleAnnouncements } from "@/lib/announcementVisibility";
import { SystemMessageCard } from "@/components/announcements/SystemMessageCard";
import { getAppVersionLabel } from "@/lib/app-version";
import { getLoginOptions, verifyLogin } from "@/lib/passkeys";
import BrandLogo from "@/components/BrandLogo";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";

const displayFont = Fraunces({ subsets: ["latin"], weight: ["600", "700"] });
const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "600"] });
const arabicFont = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"] });

type LoginGeoPayload = {
  geo_lat: number;
  geo_lng: number;
  geo_accuracy_m: number;
  geo_label: string;
};
const SUPERADMIN_GEO_REQUIRED_UI = "SUPERADMIN_GEO_REQUIRED_UI";
const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";

const LOGIN_COPY = {
  fr: {
    invalidCredentials: "Email ou mot de passe incorrect.",
    noAccount: "Aucun compte trouvé avec cet email.",
    disabled: "Compte désactivé. Contacte le support.",
    limited: (supportEmail: string) =>
      `Votre compte a été limité ou suspendu. Contactez ${supportEmail.toUpperCase()} pour plus d’informations.`,
    expiredPassword: "Mot de passe expiré. Merci de définir un nouveau mot de passe.",
    geoRequired:
      "Connexion impossible : l’accès à la localisation GPS est obligatoire pour ce compte superadmin.",
    suspicious: (supportEmail: string) =>
      `Connexion impossible : cette connexion est suspecte. Le système l’a bloquée automatiquement après détection d’une utilisation suspecte. Contacte le support (${supportEmail.toUpperCase()}).`,
    verifyEmail: "Veuillez vérifier votre email pour activer le compte.",
    loginFailed: "Impossible de se connecter. Réessaie.",
    validEmail: "Merci d’entrer un email valide.",
    requestFailed: "Requête échouée",
    unknownError: "Erreur inconnue",
    newPasswordLength: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
    confirmMismatch: "La confirmation ne correspond pas.",
    welcomeBadge: "Bienvenue chez 7sabek",
    heroTitle: "Reprends le contrôle de tes enveloppes, dès aujourd’hui.",
    heroBody:
      "Une vue claire sur ton budget, des alertes utiles, et une méthode simple pour mieux piloter tes dépenses.",
    heroPoint1: "Suivi en temps réel de chaque enveloppe.",
    heroPoint2: "Catégories personnalisées et rapports clairs.",
    heroPoint3: "Automatisations simples pour gagner du temps.",
    mobileBrand: "7sabek",
    mobileTitle: "Reprends le contrôle de ton budget",
    mobileBody: "Connecte-toi pour retrouver tes enveloppes.",
    backHome: "Retour à l’accueil",
    pill: "7sabek • Finance personnelle",
    title: "Bon retour",
    subtitle: "Connecte-toi pour gérer tes enveloppes et ton cash flow.",
    maintenanceSuffix: "Seuls les superadmins peuvent se connecter.",
    connectedAs: "Connecté en tant que",
    goDashboard: "Aller au dashboard",
    logout: "Se déconnecter",
    email: "Email",
    password: "Mot de passe",
    hidePassword: "Masquer le mot de passe",
    showPassword: "Afficher le mot de passe",
    forgotPassword: "Mot de passe oublie ? Reinitialiser.",
    maintenanceActive: "Maintenance active",
    maintenanceOnlySuperadmins: "Seuls les superadmins peuvent se connecter.",
    iAmSuperadmin: "Je suis superadmin",
    retryIn: "Trop de tentatives. Réessaie dans",
    login: "Se connecter",
    resetRequired: "Changement de mot de passe requis",
    resetRequiredBody: "Défini un nouveau mot de passe pour continuer.",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    update: "Mettre à jour",
    noAccountYet: "Pas encore de compte ?",
    createAccount: "Créer un compte",
    quickSignInTitle: "الدخول السريع",
    quickSignInMethod: "Face ID / empreinte",
    quickSignIn: "Connexion rapide",
    quickSignInVerifying: "Vérification...",
    quickSignInDivider: "ou",
    quickSignInError:
      "Connexion rapide impossible. Utilise ton email et mot de passe ou réessaie.",
    chipSalary: "Salaire",
    chipRent: "Loyer",
    chipDebt: "Crédit",
    fabor: "c’est faboooor",
  },
  en: {
    invalidCredentials: "Incorrect email or password.",
    noAccount: "No account found with this email.",
    disabled: "Account disabled. Contact support.",
    limited: (supportEmail: string) =>
      `Your account has been limited or suspended. Contact ${supportEmail.toUpperCase()} for more details.`,
    expiredPassword: "Password expired. Please set a new password.",
    geoRequired:
      "Login denied: GPS location access is required for this superadmin account.",
    suspicious: (supportEmail: string) =>
      `Login denied: this connection looks suspicious. The system blocked it automatically after suspicious activity detection. Contact support (${supportEmail.toUpperCase()}).`,
    verifyEmail: "Please verify your email to activate the account.",
    loginFailed: "Unable to sign in. Try again.",
    validEmail: "Please enter a valid email.",
    requestFailed: "Request failed",
    unknownError: "Unknown error",
    newPasswordLength: "The new password must contain at least 8 characters.",
    confirmMismatch: "Confirmation does not match.",
    welcomeBadge: "Welcome to 7sabek",
    heroTitle: "Take control of your envelopes today.",
    heroBody:
      "A clear budget view, useful alerts, and a simple method to manage your spending better.",
    heroPoint1: "Real-time tracking for every envelope.",
    heroPoint2: "Custom categories and clear reports.",
    heroPoint3: "Simple automations to save time.",
    mobileBrand: "7sabek",
    mobileTitle: "Take control of your budget",
    mobileBody: "Sign in to get back to your envelopes.",
    backHome: "Back to home",
    pill: "7sabek • Personal finance",
    title: "Welcome back",
    subtitle: "Sign in to manage your envelopes and cash flow.",
    maintenanceSuffix: "Only superadmins can sign in.",
    connectedAs: "Signed in as",
    goDashboard: "Go to dashboard",
    logout: "Log out",
    email: "Email",
    password: "Password",
    hidePassword: "Hide password",
    showPassword: "Show password",
    forgotPassword: "Forgot password? Reset it.",
    maintenanceActive: "Maintenance active",
    maintenanceOnlySuperadmins: "Only superadmins can sign in.",
    iAmSuperadmin: "I am superadmin",
    retryIn: "Too many attempts. Try again in",
    login: "Sign in",
    resetRequired: "Password change required",
    resetRequiredBody: "Set a new password to continue.",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    update: "Update",
    noAccountYet: "No account yet?",
    createAccount: "Create an account",
    quickSignInTitle: "Quick sign-in",
    quickSignInMethod: "Face ID / fingerprint",
    quickSignIn: "Quick sign-in",
    quickSignInVerifying: "Verifying...",
    quickSignInDivider: "or",
    quickSignInError: "Quick sign-in failed. Use email and password or try again.",
    chipSalary: "Salary",
    chipRent: "Rent",
    chipDebt: "Loan",
    fabor: "it’s freeeee",
  },
  ar: {
    invalidCredentials: "الإيميل ولا كلمة السر ماشي صحيحة.",
    noAccount: "ما كاين حتى حساب بهاد الإيميل.",
    disabled: "الحساب متوقف. تاصل بالدعم.",
    limited: (_supportEmail: string) => "الحساب ديالك محدود أو موقوف. تاصل بالدعم.",
    expiredPassword: "كلمة السر سالات الصلاحية ديالها. خاصك تبدلها باش تكمل.",
    geoRequired:
      "ما قدرناش ندخلوك: الولوج لموقع GPS ضروري لهاد حساب السوبر أدمن.",
    suspicious: (supportEmail: string) =>
      `ما قدرناش ندخلوك: هاد الاتصال باين مشكوك فيه. السيستيم حبسو أوتوماتيكياً. تاصل بالدعم (${supportEmail.toUpperCase()}).`,
    verifyEmail: "خصك تأكد الإيميل باش يتفعل الحساب.",
    loginFailed: "ما قدرناش ندخلوك دابا. عاود المحاولة.",
    validEmail: "دخل إيميل صحيح.",
    requestFailed: "وقع مشكل فالطلب.",
    unknownError: "وقع مشكل غير معروف. عاود المحاولة.",
    newPasswordLength: "كلمة السر الجديدة خاصها تكون فيها على الأقل 8 حروف.",
    confirmMismatch: "التأكيد ما مطابقش.",
    welcomeBadge: "مرحبا بيك فـ 7sabek",
    heroTitle: "رجّع التحكم فالميزانية ديالك من اليوم.",
    heroBody:
      "رؤية واضحة للميزانية، تنبيهات مفيدة، وطريقة بسيطة باش تنظّم المصاريف ديالك.",
    heroPoint1: "تتبع مباشر لكل ظرف.",
    heroPoint2: "أصناف مخصصة وتقارير واضحة.",
    heroPoint3: "أتمتة بسيطة باش تربح الوقت.",
    mobileBrand: "حسابك",
    mobileTitle: "رجّع التحكم فالميزانية ديالك.",
    mobileBody: "دخل باش ترجع للأظرفة والكاش ديالك.",
    backHome: "رجع للرئيسية",
    pill: "7sabek • فلوسك الشخصية",
    title: "مرحبا برجوعك",
    subtitle: "دخل باش تسير الأظرفة والكاش ديالك.",
    maintenanceSuffix: "غير السوبر أدمن يقدر يدخل مؤقتاً.",
    connectedAs: "داير الدخول بهاد الإيميل",
    goDashboard: "سير للوحة التحكم",
    logout: "تسجيل الخروج",
    email: "الإيميل",
    password: "كلمة السر",
    hidePassword: "خبي كلمة السر",
    showPassword: "بيّن كلمة السر",
    forgotPassword: "نسيتي كلمة السر؟ رجّعها دابا.",
    maintenanceActive: "كاينة صيانة دابا",
    maintenanceOnlySuperadmins: "غير السوبر أدمن يقدر يدخل مؤقتاً.",
    iAmSuperadmin: "أنا سوبر أدمن",
    retryIn: "كاين بزاف ديال المحاولات. عاود ف",
    login: "دخول",
    resetRequired: "خاص تبدل كلمة السر",
    resetRequiredBody: "دخل كلمة سر جديدة باش تكمل.",
    newPassword: "كلمة السر الجديدة",
    confirmPassword: "أكد كلمة السر",
    update: "حدّث كلمة السر",
    noAccountYet: "مازال ما عندكش حساب؟",
    createAccount: "صاوب حساب جديد",
    quickSignInTitle: "الدخول السريع",
    quickSignInMethod: "Face ID / بصمة",
    quickSignIn: "الدخول السريع",
    quickSignInVerifying: "كنتحقق...",
    quickSignInDivider: "أو",
    quickSignInError:
      "ما قدرناش ندخلوك بالدخول السريع. استعمل الإيميل وكلمة السر أو عاود حاول.",
    chipSalary: "السالير",
    chipRent: "الكراء",
    chipDebt: "كريدي",
    fabor: "فابووووور",
  },
} satisfies Record<FloussyLocale, Record<string, string | ((...args: never[]) => string)>>;

export default function LoginPage() {
  const appVersionLabel = getAppVersionLabel();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const inputClass =
    "h-[50px] rounded-xl border-[#E3E8DF] bg-white ps-11 text-[15px] font-semibold text-[#0A241D] shadow-none placeholder:font-medium placeholder:text-[#A9B5AF] focus-visible:border-[#17C777] focus-visible:ring-[3px] focus-visible:ring-[#E2F7EC] focus-visible:ring-offset-0";
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = usePlatformStatus();
  const supportEmail = status?.support_email || "elidryssi@gmail.com";
  const copy = LOGIN_COPY[locale];
  const pageDir = getLocaleDirection(locale);
  const pageFontClass = locale === "ar" ? `${arabicFont.className} login-arabic-font` : bodyFont.className;
  const headingClass = locale === "ar" ? "login-title" : displayFont.className;
  const copyClass = locale === "ar" ? "login-copy" : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [forceReset, setForceReset] = useState(false);
  const [quickSignInLoading, setQuickSignInLoading] = useState(false);
  const [quickSignInError, setQuickSignInError] = useState<string | null>(null);
  const [passkeysSupported, setPasskeysSupported] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [maintenanceConfirm, setMaintenanceConfirm] = useState(false);
  const [introReady, setIntroReady] = useState(false);

  const getAuthErrorMessage = (message: string) => {
    const lower = message.toLowerCase();
    if (
      lower.includes("compte supprim") ||
      lower.includes("récupération") ||
      lower.includes("recuperation") ||
      lower.includes("suppression définitive")
    ) {
      return message;
    }
    if (lower.includes("trop de tentatives") || lower.includes("réessaie")) {
      return message;
    }
    if (lower.includes("invalid credentials") || lower.includes("unauthorized")) {
      return copy.invalidCredentials;
    }
    if (lower.includes("not found") || lower.includes("no account") || lower.includes("user not found")) {
      return copy.noAccount;
    }
    if (lower.includes("disabled") || lower.includes("inactive")) {
      return copy.disabled;
    }
    if (lower.includes("limité") || lower.includes("suspendu") || lower.includes("suspendu")) {
      return copy.limited(supportEmail);
    }
    if (lower.includes("password_reset_required")) {
      return copy.expiredPassword;
    }
    if (
      lower.includes("accès gps refus") ||
      lower.includes("acces gps refus") ||
      lower.includes("géolocalisation indisponible") ||
      lower.includes("geolocalisation indisponible") ||
      lower.includes("position gps indisponible") ||
      lower.includes("temps dépassé") ||
      lower.includes("position indisponible")
    ) {
      return copy.geoRequired;
    }
    if (
      lower.includes("connexion est suspecte") ||
      lower.includes("utilisation suspecte") ||
      lower.includes("ip_address_blocked")
    ) {
      return copy.suspicious(supportEmail);
    }
    if (lower.includes("superadmin_geo_required")) {
      return copy.geoRequired;
    }
    if (lower.includes("maintenance")) {
      return message;
    }
    if (lower.includes("verify") || lower.includes("confirm")) {
      return copy.verifyEmail;
    }
    return copy.loginFailed;
  };

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

  const inferBrowser = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes("edg/")) return "Microsoft Edge";
    if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
    if (ua.includes("chrome/") && !ua.includes("edg/")) return "Google Chrome";
    if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
    if (ua.includes("firefox/")) return "Mozilla Firefox";
    return "Unknown";
  };

  const inferOs = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes("windows")) return "Windows";
    if (ua.includes("mac os x") || ua.includes("macintosh")) return "macOS";
    if (ua.includes("android")) return "Android";
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
    if (ua.includes("linux")) return "Linux";
    return "Unknown";
  };

  const inferDevice = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes("ipad") || ua.includes("tablet")) return "Tablet";
    if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
      return "Mobile";
    }
    return "Desktop";
  };

  const getDeviceMetadata = () => {
    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent ?? "" : "";
    return {
      browser: inferBrowser(userAgent),
      os: inferOs(userAgent),
      device: inferDevice(userAgent),
    };
  };

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
    }).catch((error: unknown) => {
      const geoError = error as GeolocationPositionError | undefined;
      if (geoError?.code === 1) {
        throw new Error(SUPERADMIN_GEO_REQUIRED_UI);
      }
      if (geoError?.code === 2) {
        throw new Error(SUPERADMIN_GEO_REQUIRED_UI);
      }
      if (geoError?.code === 3) {
        throw new Error(SUPERADMIN_GEO_REQUIRED_UI);
      }
      throw new Error(SUPERADMIN_GEO_REQUIRED_UI);
    });

    return {
      geo_lat: position.coords.latitude,
      geo_lng: position.coords.longitude,
      geo_accuracy_m: Math.max(0, position.coords.accuracy ?? 0),
      geo_label: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
    };
  };

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const extractErrorMessage = (payload: string) => {
    const trimmed = payload.trim();
    if (!trimmed) return copy.requestFailed;
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as {
          detail?: string | { msg?: string }[];
          message?: string;
        };
        if (typeof parsed.detail === "string") return parsed.detail;
        if (typeof parsed.message === "string") return parsed.message;
        if (Array.isArray(parsed.detail)) {
          return parsed.detail.map((item) => item.msg ?? copy.requestFailed).join(", ");
        }
      } catch {
        return payload;
      }
    }
    return payload;
  };

  useEffect(() => {
    setLocale(getBrowserLocalePreference() ?? "fr");
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  useEffect(() => {
    setPasskeysSupported(
      typeof window !== "undefined" && "PublicKeyCredential" in window
    );
  }, []);

  // A tab opened in the background freezes CSS animations at frame 0, which would
  // leave the panel invisible. Only arm the one-shot intro when the page is on screen.
  useEffect(() => {
    if (reduceMotion) return;
    if (typeof document === "undefined") return;
    if (document.visibilityState === "visible") setIntroReady(true);
  }, [reduceMotion]);

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

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setQuickSignInError(null);
    setForceReset(false);
    setRetryAfterSeconds(null);
    if (!isValidEmail(email)) {
      setError(copy.validEmail);
      return;
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
              email: normalizedEmail,
              password,
              ...deviceMetadata,
              ...(geo ?? {}),
            }),
          });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw new Error(`Network timeout. API unreachable at ${API_BASE}.`);
          }
          throw new Error(`Network error. API unreachable at ${API_BASE}.`);
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      let response = await sendLoginRequest();
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        let message = extractErrorMessage(text);
        const requiresSuperadminGeo =
          response.status === 403 &&
          message.toLowerCase().includes("superadmin_geo_required");

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
            const retryAfter = parseRetryAfter(
              response.headers.get("Retry-After"),
              message
            );
            if (retryAfter) {
              setRetryAfterSeconds(retryAfter);
            }
          }
          throw new Error(message || copy.requestFailed);
        }
      }
      resetAuthClientState();
      const me = await fetchMe();
      markAuthSessionHint();
      router.push(me.role === "superadmin" ? "/superadmin" : "/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      if (message === SUPERADMIN_GEO_REQUIRED_UI) {
        setError(copy.geoRequired);
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
      const loginOptions = await getLoginOptions(
        isValidEmail(normalizedEmail) ? normalizedEmail : undefined
      );
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
      router.push(me.role === "superadmin" ? "/superadmin" : "/dashboard");
    } catch {
      setQuickSignInError(copy.quickSignInError);
    } finally {
      setQuickSignInLoading(false);
    }
  };

  const handleForceReset = async () => {
    setError(null);
    if (!newPassword || newPassword.length < 8) {
      setError(copy.newPasswordLength);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(copy.confirmMismatch);
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
      router.push(me.role === "superadmin" ? "/superadmin" : "/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(getAuthErrorMessage(message));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout()
      .catch(() => null)
      .finally(() => {
        setUser(null);
      });
  };

  const maintenanceMessage =
    status?.maintenance_mode && status.maintenance_message
      ? status.maintenance_message
      : "";
  const maintenancePlacements = status?.maintenance_placements ?? [];
  const showMaintenanceBanner =
    Boolean(maintenanceMessage.trim()) && maintenancePlacements.includes("login");
  const loginAnnouncements = getVisibleAnnouncements(status, user, "login");
  const showAnnouncementBanner = loginAnnouncements.length > 0;
  const maintenanceActive = Boolean(status?.maintenance_mode);
  const loginDisabled =
    loading || Boolean(retryAfterSeconds) || (maintenanceActive && !maintenanceConfirm);
  const passkeysEnabled = Boolean(status?.features?.passkeys);
  const showQuickSignIn = passkeysEnabled && passkeysSupported;

  const ICON_WRAP =
    "pointer-events-none absolute inset-y-0 start-0 flex w-11 items-center justify-center text-[#7C8D86] transition-colors";

  return (
    <div
      className={`lg-root relative min-h-screen bg-[#F6F8F4] ${pageFontClass} ${introReady ? "lg-intro" : ""}`}
      dir={pageDir}
      data-login-locale={locale}
    >
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* ---------------- brand panel ---------------- */}
        <aside
          className="lg-panel relative hidden flex-col justify-between gap-7 overflow-hidden bg-[linear-gradient(155deg,#124636_0%,#0A241D_62%)] p-11 text-[#EAF4EF] lg:flex"
          onPointerMove={(event) => {
            if (reduceMotion) return;
            const target = event.currentTarget;
            const rect = target.getBoundingClientRect();
            target.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
            target.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
          }}
        >
          <span className="lg-blob lg-blob-a" aria-hidden="true" />
          <span className="lg-blob lg-blob-b" aria-hidden="true" />
          <span className="lg-spot" aria-hidden="true" />

          <div className="relative z-10">
            {/* The brand PNGs are square with wide transparent padding, so the box
                has to be ~2.4x the intended visual height. */}
            <BrandLogo locale={locale} tone="dark" className="-ms-3 h-20 w-auto" />
          </div>

          <div className="relative z-10">
            <h2 className={`${headingClass} lg-rise text-[2rem] font-extrabold leading-[1.1] text-white`} style={{ "--d": ".18s" } as React.CSSProperties}>
              {copy.heroTitle}
            </h2>
            <p className="lg-rise mt-3.5 max-w-[38ch] text-[0.95rem] leading-relaxed text-[#B9CFC5]" style={{ "--d": ".3s" } as React.CSSProperties}>
              {copy.heroBody}
            </p>
            <div className="mt-7 flex flex-col gap-3">
              {[copy.heroPoint1, copy.heroPoint2, copy.heroPoint3].map((point, index) => (
                <div
                  key={point}
                  className="lg-rise flex items-start gap-3 text-[0.87rem] font-semibold text-[#DCEAE3]"
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

          <div className="lg-rise relative z-10 flex flex-wrap gap-2" style={{ "--d": ".72s" } as React.CSSProperties}>
            {[
              { label: copy.chipSalary, value: "+12 400", dot: "#17C777", up: true },
              { label: copy.chipRent, value: "-3 200", dot: "#0A241D", up: false },
              { label: copy.chipDebt, value: "-2 100", dot: "#8B7CF6", up: false },
            ].map((chip) => (
              <span
                key={chip.label}
                className="lg-chip flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-[0.76rem] font-bold text-[#DCEAE3] backdrop-blur"
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

        {/* ---------------- form panel ---------------- */}
        <main className={`flex flex-col px-5 pb-12 pt-6 sm:px-8 lg:px-14 lg:pt-8 ${copyClass}`}>
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              aria-label={copy.backHome}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E3E8DF] bg-white text-[#4E625A] transition hover:border-[#17C777] hover:text-[#0B8F53]"
            >
              <Home className="h-4 w-4" />
            </Link>
            <span className="text-[0.7rem] font-semibold text-[#7C8D86]">7sabek {appVersionLabel}</span>
          </div>

          <div className="flex flex-1 items-center justify-center pt-8">
            <motion.div
              className="w-full max-w-[470px]"
              initial={reduceMotion ? undefined : { opacity: 0, y: 22 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-7 flex flex-col items-center gap-3 text-center lg:hidden">
                <BrandLogo locale={locale} className="h-20 w-auto object-contain" />
              </div>

              <h1 className={`${headingClass} text-[clamp(1.7rem,3vw,2.2rem)] font-extrabold tracking-tight text-[#0A241D]`}>
                {copy.title}
              </h1>
              <p className="mt-2.5 text-[0.96rem] leading-relaxed text-[#4E625A]">{copy.subtitle}</p>

              {showMaintenanceBanner ? (
                <div className="mt-5">
                  <SystemMessageCard variant="maintenance" message={maintenanceMessage} suffix={copy.maintenanceSuffix} />
                </div>
              ) : null}
              {showAnnouncementBanner
                ? loginAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="mt-3">
                      <SystemMessageCard
                        variant="announcement"
                        message={announcement.message}
                        announcementType={announcement.type}
                      />
                    </div>
                  ))
                : null}

              {user ? (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-[#4E625A]">
                    {copy.connectedAs} <span className="font-bold text-[#0A241D]">{user.email}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => router.push(user.role === "superadmin" ? "/superadmin" : "/dashboard")}
                      className="h-[50px] rounded-xl bg-[#17C777] px-6 font-bold text-[#06301F] shadow-[0_10px_22px_-10px_rgba(23,199,119,0.6)] hover:bg-[#0B8F53] hover:text-white"
                    >
                      {copy.goDashboard}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleLogout}
                      className="h-[50px] rounded-xl border-[#E3E8DF] bg-white px-6 font-bold text-[#0A241D] hover:border-[#0A241D]"
                    >
                      {copy.logout}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <form
                    onSubmit={handleLogin}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      const target = event.target as HTMLElement | null;
                      if (!target) return;
                      if (target.tagName !== "INPUT") return;
                      event.preventDefault();
                      event.currentTarget.requestSubmit();
                    }}
                    className="mt-6"
                  >
                    <div className="lg-field">
                      <Label htmlFor="email" className="mb-1.5 block text-[0.8rem] font-extrabold text-[#4E625A]">
                        {copy.email}
                      </Label>
                      <div className="lg-control relative flex items-center">
                        <span className={ICON_WRAP}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
                        </span>
                        <Input
                          id="email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="nom@exemple.ma"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="lg-field mt-4">
                      <Label htmlFor="password" className="mb-1.5 block text-[0.8rem] font-extrabold text-[#4E625A]">
                        {copy.password}
                      </Label>
                      <div className="lg-control relative flex items-center">
                        <span className={ICON_WRAP}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        </span>
                        <Input
                          id="password"
                          type={showLoginPassword ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          data-clarity-mask="true"
                          placeholder="••••••••"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className={`${inputClass} pe-12`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute end-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg p-0 text-[#7C8D86] hover:bg-[#EEF1EA] hover:text-[#0A241D]"
                          onClick={() => setShowLoginPassword((prev) => !prev)}
                          aria-label={showLoginPassword ? copy.hidePassword : copy.showPassword}
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="mt-2.5 flex justify-end">
                        <Link href="/forgot-password" className="text-[0.83rem] font-bold text-[#0B8F53] hover:underline">
                          {copy.forgotPassword}
                        </Link>
                      </div>
                    </div>

                    {maintenanceActive ? (
                      <div className="mt-4 rounded-2xl border border-[#F2A93B]/40 bg-[#FDF2DF] px-4 py-3.5 text-sm text-[#8A5A0F]">
                        <p className="font-extrabold">{copy.maintenanceActive}</p>
                        <p className="mt-1 text-xs">{copy.maintenanceOnlySuperadmins}</p>
                        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-bold">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-[#F2A93B]/60 text-[#B97913] focus:ring-[#F2A93B]"
                            checked={maintenanceConfirm}
                            onChange={(event) => setMaintenanceConfirm(event.target.checked)}
                          />
                          {copy.iAmSuperadmin}
                        </label>
                      </div>
                    ) : null}

                    {retryAfterSeconds ? (
                      <p className="mt-4 rounded-2xl border border-[#F2686B]/30 bg-[#FDECEC] px-4 py-3 text-sm font-semibold text-[#B33A3D]">
                        {copy.retryIn} <span className="font-extrabold tabular-nums">{formatDuration(retryAfterSeconds)}</span>.
                      </p>
                    ) : error ? (
                      <p className="mt-4 rounded-2xl border border-[#F2686B]/30 bg-[#FDECEC] px-4 py-3 text-sm font-semibold text-[#B33A3D]">
                        {error}
                      </p>
                    ) : null}

                    <Button
                      type="submit"
                      isLoading={loading}
                      disabled={loginDisabled}
                      className="lg-cta mt-5 h-[52px] w-full rounded-xl bg-[#17C777] text-[0.95rem] font-bold text-[#06301F] shadow-[0_10px_22px_-10px_rgba(23,199,119,0.6)] transition hover:-translate-y-px hover:bg-[#0B8F53] hover:text-white"
                    >
                      {copy.login}
                    </Button>

                    {showQuickSignIn ? (
                      <div className="mt-5">
                        <div className="flex items-center gap-3.5" aria-hidden="true">
                          <span className="h-px flex-1 bg-[#E3E8DF]" />
                          <span className="text-[0.76rem] font-bold uppercase tracking-wide text-[#7C8D86]">
                            {copy.quickSignInDivider}
                          </span>
                          <span className="h-px flex-1 bg-[#E3E8DF]" />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          aria-label={`${copy.quickSignInTitle} - ${copy.quickSignInMethod}`}
                          className="mt-4 h-[52px] w-full rounded-xl border-[#E3E8DF] bg-white text-[0.92rem] font-bold text-[#0A241D] shadow-none transition hover:-translate-y-px hover:border-[#0A241D]"
                          onClick={handleQuickSignIn}
                          disabled={quickSignInLoading || loading}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Fingerprint className="h-4 w-4 text-[#0B8F53]" aria-hidden="true" />
                            <span>{quickSignInLoading ? copy.quickSignInVerifying : copy.quickSignInTitle}</span>
                            <span className="text-xs font-semibold text-[#7C8D86]">{copy.quickSignInMethod}</span>
                          </span>
                        </Button>
                        {quickSignInError ? (
                          <p className="mt-2 text-center text-xs font-semibold text-[#B33A3D]">{quickSignInError}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {forceReset ? (
                      <div className="mt-5 rounded-2xl border border-[#17C777]/30 bg-[#E2F7EC] p-4">
                        <p className="font-extrabold text-[#0A241D]">{copy.resetRequired}</p>
                        <p className="mt-1 text-xs text-[#4E625A]">{copy.resetRequiredBody}</p>
                        <div className="mt-3.5 space-y-3">
                          <div>
                            <Label className="mb-1.5 block text-[0.8rem] font-extrabold text-[#4E625A]">{copy.newPassword}</Label>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              data-clarity-mask="true"
                              value={newPassword}
                              onChange={(event) => setNewPassword(event.target.value)}
                              className={`${inputClass} ps-4`}
                            />
                          </div>
                          <div>
                            <Label className="mb-1.5 block text-[0.8rem] font-extrabold text-[#4E625A]">{copy.confirmPassword}</Label>
                            <Input
                              type="password"
                              autoComplete="new-password"
                              data-clarity-mask="true"
                              value={confirmNewPassword}
                              onChange={(event) => setConfirmNewPassword(event.target.value)}
                              className={`${inputClass} ps-4`}
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={handleForceReset}
                            isLoading={loading}
                            className="h-[50px] w-full rounded-xl bg-[#17C777] font-bold text-[#06301F] hover:bg-[#0B8F53] hover:text-white"
                          >
                            {copy.update}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </form>

                  <p className="mt-6 flex flex-wrap items-center justify-center gap-2 text-center text-[0.87rem] font-semibold text-[#4E625A]">
                    <span>{copy.noAccountYet}</span>
                    <Link href="/register" className="font-extrabold text-[#0B8F53] hover:underline">
                      {copy.createAccount}
                    </Link>
                    <span className="lg-sticker inline-flex items-center gap-1.5 rounded-full bg-[#F2A93B] px-3 py-1.5 text-[0.78rem] font-extrabold text-[#3A2400] shadow-[0_8px_18px_-8px_rgba(242,169,59,0.8)]">
                      <span aria-hidden="true">✦</span>
                      {copy.fabor}
                    </span>
                  </p>
                </>
              )}
            </motion.div>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .lg-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(70px);
          pointer-events: none;
        }
        .lg-blob-a {
          width: 420px;
          height: 420px;
          background: rgba(23, 199, 119, 0.32);
          top: -150px;
          inset-inline-start: -140px;
          animation: lgDrift 18s ease-in-out infinite;
        }
        .lg-blob-b {
          width: 340px;
          height: 340px;
          background: rgba(76, 126, 255, 0.22);
          bottom: -130px;
          inset-inline-end: -110px;
          animation: lgDrift 23s ease-in-out infinite reverse;
        }
        @keyframes lgDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, 44px) scale(1.12); }
        }
        .lg-spot {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.45s ease;
          background: radial-gradient(360px circle at var(--mx, 50%) var(--my, 30%), rgba(23, 199, 119, 0.16), transparent 66%);
        }
        .lg-panel:hover .lg-spot { opacity: 1; }
        .lg-chip { animation: lgFloat 5.6s ease-in-out infinite; }
        .lg-chip:nth-child(2) { animation-delay: 0.9s; }
        .lg-chip:nth-child(3) { animation-delay: 1.8s; }
        @keyframes lgFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        .lg-intro .lg-rise {
          opacity: 0;
          transform: translateY(16px);
          animation: lgRise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: var(--d, 0s);
        }
        @keyframes lgRise { to { opacity: 1; transform: none; } }
        .lg-control { transition: transform 0.18s ease; }
        .lg-control:focus-within { transform: translateY(-1px); }
        .lg-control:focus-within span:first-child { color: #0b8f53; }
        .lg-cta { position: relative; overflow: hidden; }
        .lg-cta::after {
          content: "";
          position: absolute;
          top: 0;
          left: -140%;
          width: 60%;
          height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.5), transparent);
          transform: skewX(-18deg);
          transition: left 0.65s ease;
        }
        .lg-cta:hover::after { left: 150%; }
        .lg-sticker { transform: rotate(-4deg); animation: lgWob 4.2s ease-in-out infinite; }
        @keyframes lgWob {
          0%, 100% { transform: rotate(-4deg) scale(1); }
          50% { transform: rotate(3deg) scale(1.05); }
        }
        [data-login-locale="ar"],
        [data-login-locale="ar"] *,
        .login-arabic-font,
        .login-arabic-font * {
          font-family: "Cairo", sans-serif !important;
          font-optical-sizing: auto;
          letter-spacing: 0 !important;
        }
        [data-login-locale="ar"] svg,
        .login-arabic-font svg {
          font-family: initial !important;
        }
        [data-login-locale="ar"] .login-title,
        .login-arabic-font .login-title {
          font-family: "Cairo", sans-serif !important;
          font-weight: 800 !important;
          letter-spacing: 0 !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .lg-blob, .lg-chip, .lg-sticker { animation: none !important; }
          .lg-intro .lg-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
          .lg-cta::after { display: none; }
          .lg-spot { display: none; }
        }
      `}</style>

    </div>
  );
}
