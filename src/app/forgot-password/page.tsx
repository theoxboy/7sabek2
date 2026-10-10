"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Home, Mail, AlertCircle, CheckCircle2 } from "lucide-react";

import { requestPasswordReset } from "@/lib/auth";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import { setAppLocale } from "@/components/i18n/LanguagePreferenceGate";
import type { FloussyLocale } from "@/lib/localePreference";
import { getAppVersionLabel } from "@/lib/app-version";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import BrandLogo from "@/components/BrandLogo";

const arabicFont = { className: "font-cairo", variable: "--font-cairo" };

const COPY: Record<
  FloussyLocale,
  {
    brand: string;
    title: string;
    subtitle: string;
    email: string;
    successFallback: string;
    send: string;
    sending: string;
    backToLogin: string;
    backHome: string;
    requestFailed: string;
    rateLimited: string;
    blockedPermanent: string;
    blockedTemporary: string;
  }
> = {
  fr: {
    brand: "7sabek",
    title: "Mot de passe oublié ?",
    subtitle: "Entre ton adresse email pour recevoir un lien sécurisé de réinitialisation.",
    email: "Adresse email",
    successFallback: "Si le compte existe, un email de réinitialisation a été envoyé.",
    send: "Envoyer le lien de réinitialisation",
    sending: "Envoi en cours...",
    backToLogin: "Retour à la connexion",
    backHome: "Retour à l’accueil",
    requestFailed: "Requête échouée. Réessaie.",
    rateLimited: "Trop de tentatives. Réessaie plus tard.",
    blockedPermanent:
      "La réinitialisation du mot de passe est bloquée pour ce compte. Contacte le support.",
    blockedTemporary:
      "La réinitialisation du mot de passe est temporairement bloquée pour ce compte.",
  },
  en: {
    brand: "7sabek",
    title: "Forgot your password?",
    subtitle: "Enter your email address to receive a secure password reset link.",
    email: "Email address",
    successFallback: "If the account exists, a reset email has been sent.",
    send: "Send reset link",
    sending: "Sending link...",
    backToLogin: "Back to sign in",
    backHome: "Back to home",
    requestFailed: "Request failed. Please try again.",
    rateLimited: "Too many attempts. Please try again later.",
    blockedPermanent:
      "Password reset is blocked for this account. Contact support.",
    blockedTemporary: "Password reset is temporarily blocked for this account.",
  },
  ar: {
    brand: "حسابك",
    title: "نسيتي كلمة السر؟",
    subtitle: "دخل الإيميل ديالك، وغادي نصيفطو ليك رابط آمن باش تبدل كلمة السر.",
    email: "البريد الإلكتروني",
    successFallback: "إلا كان الحساب موجود، غادي يتصيفط ليه رابط تغيير كلمة السر.",
    send: "صيفط رابط تغيير كلمة السر",
    sending: "جاري الإرسال…",
    backToLogin: "رجوع لتسجيل الدخول",
    backHome: "الرجوع للرئيسية",
    requestFailed: "وقع مشكل فالطلب. عاود المحاولة.",
    rateLimited: "كاين بزاف ديال المحاولات. عاود من بعد.",
    blockedPermanent:
      "تغيير كلمة السر موقوف لهاد الحساب. تاصل بالدعم.",
    blockedTemporary:
      "تغيير كلمة السر موقوف مؤقتاً لهاد الحساب.",
  },
};

function localizeResetRequestMessage(raw: string | undefined, localeCopy: (typeof COPY)["fr"]) {
  const msg = (raw || "").trim();
  if (!msg) return localeCopy.successFallback;
  const lower = msg.toLowerCase();
  if (
    lower.includes("password reset email sent") ||
    lower.includes("if the account exists")
  ) {
    return localeCopy.successFallback;
  }
  if (lower.includes("too many") || lower.includes("trop de tentatives")) {
    return localeCopy.rateLimited;
  }
  if (lower.includes("bloquée pour ce compte") || lower.includes("blocked for this account")) {
    return localeCopy.blockedPermanent;
  }
  if (lower.includes("temporairement bloquée") || lower.includes("temporarily blocked")) {
    return localeCopy.blockedTemporary;
  }
  return msg;
}

export default function ForgotPasswordPage() {
  const { locale, dir } = useAppLocale("fr");
  useForceArabicDocumentFont(locale === "ar", "forgot-password-ar-body");
  const copy = COPY[locale];
  const appVersionLabel = getAppVersionLabel();
  const pageFontClass = `${arabicFont.className} ${locale === "ar" ? "forgot-arabic-font" : ""}`;

  const changeLocale = (next: FloussyLocale) => {
    setAppLocale(next);
  };

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await requestPasswordReset(email.trim(), locale);
      setMessage(localizeResetRequestMessage(result.message, copy));
    } catch (exc) {
      const text = exc instanceof Error ? exc.message : "";
      setError(localizeResetRequestMessage(text, copy) || copy.requestFailed);
    } finally {
      setLoading(false);
    }
  };

  const isLimited = error && (error.includes("tentatives") || error.includes("attempts") || error.includes("محاولات"));
  const isBlocked = error && !isLimited ? error : null;

  return (
    <div
      className={`pw-root t-light min-h-screen flex flex-col bg-[#F6F5EF] dark:bg-[#0E1512] text-[#0F1A16] dark:text-[#EEF2EF] ${pageFontClass}`}
      dir={dir}
    >
      {/* Mobile / Tablet Top Band */}
      <div className="pw-band">
        <Link href="/" className="pw-logo">
          <BrandLogo locale={locale} className="h-9 w-auto brightness-0 invert" />
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
          <Link href="/" className="pw-pill">
            <Home className="w-4 h-4" />
            <span>{copy.backHome}</span>
          </Link>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="pw-head w-full max-w-[1200px] mx-auto p-6 flex justify-between items-center gap-3 box-border">
        <Link
          href="/"
          className="h-11 px-3.5 rounded-xl bg-white dark:bg-[#18221E] border border-[#DCDAD1] dark:border-[#33433C] flex items-center gap-2 text-[#0F1A16] dark:text-[#EEF2EF] text-[15px] font-bold no-underline hover:border-[#0A7A53] transition"
        >
          <Home className="w-[18px] h-[18px]" />
          <span>{copy.backHome}</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
          <Link
            href="/releases"
            className="h-[34px] px-3 rounded-[17px] bg-[#E2F1E8] dark:bg-[#173A2D] flex items-center gap-1.5 text-[#06402C] dark:text-[#BFEBD6] text-[13px] font-extrabold no-underline"
          >
            <span className="w-[7px] h-[7px] rounded-[4px] bg-[#0A7A53] dark:bg-[#2FB27A]" />
            <span>v{appVersionLabel}</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="pw-main flex-1 flex items-center justify-center px-6 py-6 pb-20">
        <div className="pw-card w-full max-w-[480px] bg-white dark:bg-[#18221E] border border-[#DCDAD1] dark:border-[#33433C] rounded-[28px] p-8 sm:p-11 box-border flex flex-col gap-5 shadow-[0_24px_60px_rgba(15,26,22,0.06)] dark:shadow-none">
          <span className="w-16 h-16 rounded-[20px] bg-[#E2F1E8] dark:bg-[#173A2D] flex items-center justify-center text-[#0A7A53] dark:text-[#2FB27A]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="15" r="4" />
              <path d="M11 12l9-9M17 6l3 3M15 8l2 2" />
            </svg>
          </span>

          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[30px] sm:text-[32px] font-extrabold tracking-[-1px] text-[#0F1A16] dark:text-[#EEF2EF]">
              {copy.title}
            </h1>
            <p className="m-0 text-base leading-[1.55] text-[#55645D] dark:text-[#A3B1AA]">
              {copy.subtitle}
            </p>
          </div>

          {/* Success Banner */}
          {message && (
            <div
              role="status"
              className="flex gap-3 p-4 rounded-2xl bg-[#E2F1E8] dark:bg-[#173A2D] text-[#06402C] dark:text-[#BFEBD6] text-[15px] leading-relaxed"
            >
              <CheckCircle2 className="w-[22px] h-[22px] shrink-0 text-[#0A7A53] dark:text-[#2FB27A]" />
              <span>{message}</span>
            </div>
          )}

          {/* Rate Limited Banner */}
          {isLimited && (
            <div
              role="alert"
              className="flex gap-3 p-4 rounded-2xl bg-[#FFF4DC] dark:bg-[#3A2C14] text-[#5C4A1E] dark:text-[#F5C77A] text-[15px] leading-relaxed"
            >
              <AlertCircle className="w-[22px] h-[22px] shrink-0 text-[#8A5300] dark:text-[#F5C77A]" />
              <span>{error}</span>
            </div>
          )}

          {/* Blocked / Other Error Banner */}
          {isBlocked && (
            <div
              role="alert"
              className="flex gap-3 p-4 rounded-2xl bg-[#FBE8E1] dark:bg-[#3D1E1A] text-[#7A2A10] dark:text-[#FF8A80] text-[15px] leading-relaxed"
            >
              <AlertCircle className="w-[22px] h-[22px] shrink-0 text-[#B42318] dark:text-[#FF8A80]" />
              <div>
                <span>{isBlocked} </span>
                <Link href="/contact" className="font-extrabold text-[#7A2A10] dark:text-[#FF8A80] underline">
                  Contact
                </Link>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5 text-sm font-bold text-[#0F1A16] dark:text-[#EEF2EF]">
              <span>{copy.email}</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="nom@exemple.ma"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="h-[54px] px-4 border-[1.5px] border-[#DCDAD1] dark:border-[#33433C] focus:border-[#0A7A53] dark:focus:border-[#2FB27A] rounded-[14px] font-sans text-base box-border w-full bg-white dark:bg-[#18221E] text-[#0F1A16] dark:text-[#EEF2EF] outline-none transition"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="h-[56px] border-0 rounded-[14px] bg-[#0A7A53] dark:bg-[#2FB27A] hover:bg-[#086645] dark:hover:bg-[#3CC58A] text-white dark:text-[#05140E] font-sans text-[17px] font-extrabold cursor-pointer transition flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? copy.sending : copy.send}
            </button>
          </form>

          <Link
            href="/login"
            className="self-center p-2 text-[15px] font-bold text-[#0A7A53] dark:text-[#2FB27A] hover:underline no-underline"
          >
            ← {copy.backToLogin}
          </Link>
        </div>
      </main>
    </div>
  );
}
