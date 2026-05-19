"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Home } from "lucide-react";
import { Cairo, Fraunces, Manrope } from "next/font/google";

import { API_BASE, apiFetch, resetAuthClientState } from "@/lib/api";
import { fetchMe, logout, markAuthSessionHint, type AuthUser } from "@/lib/auth";
import { usePlatformStatus } from "@/lib/usePlatformStatus";
import { getVisibleAnnouncements } from "@/lib/announcementVisibility";
import { SystemMessageCard } from "@/components/announcements/SystemMessageCard";
import { getAppVersionLabel } from "@/lib/app-version";
import BrandLogo from "@/components/BrandLogo";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
  },
  ar: {
    invalidCredentials: "الإيميل ولا كلمة السر ماشي صحيحة.",
    noAccount: "ما كاين حتى حساب بهاد الإيميل.",
    disabled: "الحساب متوقف. تاصل بالدعم.",
    limited: (supportEmail: string) =>
      `الحساب ديالك محدود ولا موقوف. تاصل بـ ${supportEmail.toUpperCase()} للمزيد من المعلومات.`,
    expiredPassword: "كلمة السر سالات الصلاحية ديالها. خاصك تدخل وحدة جديدة.",
    geoRequired:
      "ما قدرناش ندخلوك: الولوج لموقع GPS ضروري لهاد حساب السوبر أدمن.",
    suspicious: (supportEmail: string) =>
      `ما قدرناش ندخلوك: هاد الاتصال باين مشكوك فيه. السيستيم حبسو أوتوماتيكياً. تاصل بالدعم (${supportEmail.toUpperCase()}).`,
    verifyEmail: "خصك تأكد الإيميل باش يتفعل الحساب.",
    loginFailed: "ما قدرناش ندخلوك. عاود حاول.",
    validEmail: "دخل إيميل صحيح.",
    requestFailed: "وقع مشكل ف الطلب",
    unknownError: "وقع مشكل غير معروف",
    newPasswordLength: "كلمة السر الجديدة خاصها تكون فيها على الأقل 8 حروف.",
    confirmMismatch: "التأكيد ما مطابقش.",
    welcomeBadge: "مرحبا بيك فـ حسابك",
    heroTitle: "شد الميزانية ديالك بيدك من اليوم.",
    heroBody:
      "رؤية واضحة للميزانية، تنبيهات مفيدة، وطريقة بسيطة باش تنظم المصروف ديالك.",
    heroPoint1: "تتبع مباشر لكل ظرف.",
    heroPoint2: "أصناف مخصصة وتقارير واضحة.",
    heroPoint3: "أوتوماتيزمات بسيطة باش تربح الوقت.",
    mobileBrand: "حسابك",
    mobileTitle: "شد الميزانية ديالك بيدك",
    mobileBody: "دخل باش ترجع للأظرفة ديالك.",
    backHome: "رجع للرئيسية",
    pill: "حسابك • الفلوس الشخصية",
    title: "مرحبا برجوعك",
    subtitle: "دخل باش تسير الأظرفة والكاش فلو ديالك.",
    maintenanceSuffix: "غير السوبر أدمن يقدرو يدخلو.",
    connectedAs: "داير الدخول بهاد الإيميل",
    goDashboard: "سير للوحة القيادة",
    logout: "تسجيل الخروج",
    email: "الإيميل",
    password: "كلمة السر",
    hidePassword: "خبي كلمة السر",
    showPassword: "بيّن كلمة السر",
    forgotPassword: "نسيتي كلمة السر؟ رجّعيها دابا.",
    maintenanceActive: "كاينة صيانة دابا",
    maintenanceOnlySuperadmins: "غير السوبر أدمن يقدرو يدخلو.",
    iAmSuperadmin: "أنا سوبر أدمن",
    retryIn: "كاين بزاف ديال المحاولات. عاود ف",
    login: "دخول",
    resetRequired: "خاص تبدل كلمة السر",
    resetRequiredBody: "دخل كلمة سر جديدة باش تكمل.",
    newPassword: "كلمة السر الجديدة",
    confirmPassword: "أكد كلمة السر",
    update: "حدّث",
    noAccountYet: "مازال ما عندكش حساب؟",
    createAccount: "صاوب حساب",
  },
} satisfies Record<FloussyLocale, Record<string, string | ((...args: never[]) => string)>>;

export default function LoginPage() {
  const appVersionLabel = getAppVersionLabel();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const inputClass =
    "border-gray-200 focus-visible:ring-emerald-500 focus-visible:ring-offset-white";
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
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [maintenanceConfirm, setMaintenanceConfirm] = useState(false);

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

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-[#f6f1e9] ${pageFontClass}`}
      dir={pageDir}
      data-login-locale={locale}
    >
      <div className="pointer-events-none absolute -top-24 left-1/3 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-10 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#9ca3af_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className={`relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-10 px-4 py-12 md:grid md:grid-cols-[1.05fr_0.95fr] ${copyClass}`}>
        <div className="hidden flex-col justify-between gap-10 rounded-[32px] bg-[#0f172a] p-10 text-white shadow-2xl shadow-emerald-500/20 md:flex">
          <div className="space-y-4">
            <span className="text-xs uppercase tracking-[0.3em] text-emerald-200">
              {copy.welcomeBadge}
            </span>
            <h2
              className={`${headingClass} text-3xl font-semibold leading-tight`}
            >
              {copy.heroTitle}
            </h2>
            <p className="text-sm text-slate-200/80">
              {copy.heroBody}
            </p>
          </div>
          <div className="grid gap-3 text-sm text-emerald-100">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
              {copy.heroPoint1}
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
              {copy.heroPoint2}
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
              {copy.heroPoint3}
            </div>
          </div>
        </div>
        <motion.div
          className="w-full max-w-md"
        initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center md:hidden">
          <BrandLogo locale={locale} className="h-28 w-auto object-contain" />
          <h2 className={`${headingClass} text-2xl text-gray-900`}>
            {copy.mobileTitle}
          </h2>
          <p className="text-sm text-gray-600">
            {copy.mobileBody}
          </p>
        </div>
        <div className="relative">
          <Link
            href="/"
            className="absolute -top-12 left-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-[var(--surface)]/90 text-gray-600 shadow-lg shadow-emerald-500/10 transition hover:border-emerald-200 hover:text-emerald-600"
            aria-label={copy.backHome}
          >
            <Home className="h-4 w-4" />
          </Link>
          <Card className="w-full space-y-6 rounded-[28px] border border-white/70 bg-[var(--surface)]/80 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur">
          <motion.div
            className="space-y-1"
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
              {copy.pill}
            </span>
            <h1
              className={`${headingClass} text-3xl font-semibold tracking-tight text-gray-900`}
            >
              {copy.title}
            </h1>
            <p className="text-sm text-gray-500">
              {copy.subtitle}
            </p>
          </motion.div>
          {showMaintenanceBanner ? (
            <SystemMessageCard
              variant="maintenance"
              message={maintenanceMessage}
              suffix={copy.maintenanceSuffix}
            />
          ) : null}
          {showAnnouncementBanner ? (
            loginAnnouncements.map((announcement) => (
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
                {copy.connectedAs}{" "}
                <span className="font-medium text-gray-900">{user.email}</span>
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
                  onClick={handleLogout}
                  className="border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-500"
                >
                  {copy.logout}
                </Button>
              </div>
            </div>
          ) : (
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.45 }}
            >
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
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">{copy.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{copy.password}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showLoginPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={`${inputClass} pr-10`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full p-0 text-gray-500 hover:text-emerald-600"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      aria-label={
                        showLoginPassword
                          ? copy.hidePassword
                          : copy.showPassword
                      }
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <Link
                    href="/forgot-password"
                    className="font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    {copy.forgotPassword}
                  </Link>
                </div>
                {maintenanceActive ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p className="font-semibold">{copy.maintenanceActive}</p>
                    <p className="mt-1 text-xs text-amber-700">
                      {copy.maintenanceOnlySuperadmins}
                    </p>
                    <label className="mt-3 flex items-center gap-2 text-xs text-amber-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        checked={maintenanceConfirm}
                        onChange={(event) => setMaintenanceConfirm(event.target.checked)}
                      />
                      {copy.iAmSuperadmin}
                    </label>
                  </div>
                ) : null}
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
                <Button
                  type="submit"
                  isLoading={loading}
                  disabled={loginDisabled}
                  className="w-full bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600"
                >
                  {copy.login}
                </Button>
                {forceReset ? (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">
                      {copy.resetRequired}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {copy.resetRequiredBody}
                    </p>
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label>{copy.newPassword}</Label>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                        />
                      </div>
                      <div>
                        <Label>{copy.confirmPassword}</Label>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          value={confirmNewPassword}
                          onChange={(event) =>
                            setConfirmNewPassword(event.target.value)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleForceReset}
                        isLoading={loading}
                        className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        {copy.update}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </form>
              <div className="mt-4 text-center text-sm text-gray-500">
                {copy.noAccountYet}{" "}
                <Link
                  href="/register"
                  className="font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  {copy.createAccount}
                </Link>
              </div>
            </motion.div>
          )}
          <p className="pt-1 text-center text-xs text-gray-400">7sabek {appVersionLabel}</p>
          </Card>
        </div>
      </motion.div>
      </div>
      {locale === "ar" ? (
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap');

          [data-login-locale="ar"],
          [data-login-locale="ar"] *,
          .login-arabic-font,
          .login-arabic-font * {
            font-family: "Cairo", sans-serif !important;
            font-optical-sizing: auto;
            font-variation-settings: "slnt" 0;
            letter-spacing: 0 !important;
          }

          [data-login-locale="ar"] svg,
          [data-login-locale="ar"] button svg,
          [data-login-locale="ar"] a svg,
          .login-arabic-font svg,
          .login-arabic-font button svg,
          .login-arabic-font a svg {
            font-family: initial !important;
          }

          [data-login-locale="ar"] .login-title,
          .login-arabic-font .login-title {
            font-family: "Cairo", sans-serif !important;
            font-weight: 800 !important;
            letter-spacing: 0 !important;
          }

          [data-login-locale="ar"] .login-copy,
          [data-login-locale="ar"] .login-copy p,
          [data-login-locale="ar"] .login-copy span,
          [data-login-locale="ar"] .login-copy a,
          [data-login-locale="ar"] .login-copy button,
          [data-login-locale="ar"] .login-copy label,
          [data-login-locale="ar"] .login-copy input,
          [data-login-locale="ar"] .login-copy div,
          .login-arabic-font .login-copy,
          .login-arabic-font .login-copy p,
          .login-arabic-font .login-copy span,
          .login-arabic-font .login-copy a,
          .login-arabic-font .login-copy button,
          .login-arabic-font .login-copy label,
          .login-arabic-font .login-copy input,
          .login-arabic-font .login-copy div {
            font-family: "Cairo", sans-serif !important;
            letter-spacing: 0 !important;
          }
        `}</style>
      ) : null}
    </div>
  );
}
