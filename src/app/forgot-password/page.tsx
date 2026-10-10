"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Home, Mail, AlertCircle, CheckCircle2 } from "lucide-react";

import { requestPasswordReset } from "@/lib/auth";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
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
  const reduceMotion = useReducedMotion();
  const copy = COPY[locale];
  const appVersionLabel = getAppVersionLabel();
  const pageFontClass = `${arabicFont.className} ${locale === "ar" ? "forgot-arabic-font" : ""}`;
  const headingClass = arabicFont.className;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "h-[50px] w-full rounded-xl border-[#E3E8DF] bg-white ps-11 text-[15px] font-semibold text-[#0A241D] shadow-none placeholder:font-normal placeholder:text-[#A9B5AF] focus-visible:border-[#17C777] focus-visible:ring-[3px] focus-visible:ring-[#E2F7EC] focus-visible:ring-offset-0 transition-all";
  const ICON_WRAP =
    "pointer-events-none absolute inset-y-0 start-0 flex w-11 items-center justify-center text-[#7C8D86] transition-colors";

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

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-[#F4F6F2] ${pageFontClass}`}
      dir={dir}
    >
      {/* Background ambient lighting matching login & register */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(23,199,119,0.12),_transparent_40%),radial-gradient(circle_at_80%_80%,_rgba(11,143,83,0.08),_transparent_40%)]" />
      <div className="pointer-events-none absolute -start-24 top-20 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -end-24 bottom-20 h-80 w-80 rounded-full bg-emerald-600/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12">
        {/* Top navigation row identical to login/register */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            aria-label={copy.backHome}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E3E8DF] bg-white text-[#4E625A] shadow-xs transition hover:border-[#17C777] hover:text-[#0B8F53]"
          >
            <Home className="h-4 w-4" />
          </Link>

          <Link
            href="/releases"
            title="Journal des versions 7sabek"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E3E8DF] bg-white px-3 py-1 text-[0.72rem] font-extrabold text-[#7C8D86] shadow-xs transition hover:border-[#17C777] hover:text-[#0B8F53]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#17C777]" />
            <span>7sabek {appVersionLabel}</span>
          </Link>
        </header>

        {/* Centered card container */}
        <div className="flex flex-1 items-center justify-center py-8">
          <motion.div
            className="w-full max-w-[440px]"
            initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-[28px] border border-[#E3E8DF] bg-white p-7 shadow-[0_24px_54px_-20px_rgba(10,36,29,0.08)] sm:p-9">
              {/* Brand Logo */}
              <div className="mb-5 flex justify-center">
                <BrandLogo locale={locale} className="h-14 w-auto object-contain" />
              </div>

              <div className="text-center">
                <h1 className={`${headingClass} text-[1.65rem] font-extrabold tracking-tight text-[#0A241D]`}>
                  {copy.title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[#5A6E65]">
                  {copy.subtitle}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="block text-start text-[0.8rem] font-extrabold text-[#4E625A]">
                    {copy.email}
                  </Label>
                  <div className="relative flex items-center">
                    <span className={ICON_WRAP}>
                      <Mail className="h-4 w-4" />
                    </span>
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="nom@exemple.ma"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError(null);
                      }}
                      className={`${inputClass} ${error ? "border-[#F2686B] ring-2 ring-[#F2686B]/20" : ""}`}
                    />
                  </div>
                </div>

                {message ? (
                  <p className="flex items-center gap-2 rounded-xl border border-[#17C777]/30 bg-[#E8F8F0] px-3.5 py-2.5 text-xs font-bold text-[#0B8F53]">
                    <CheckCircle2 className="h-4 w-4 flex-none" />
                    <span>{message}</span>
                  </p>
                ) : null}

                {error ? (
                  <p className="flex items-center gap-2 rounded-xl border border-[#F2686B]/30 bg-[#FDECEC] px-3.5 py-2.5 text-xs font-bold text-[#B33A3D]">
                    <AlertCircle className="h-4 w-4 flex-none" />
                    <span>{error}</span>
                  </p>
                ) : null}

                <Button
                  type="submit"
                  isLoading={loading}
                  disabled={loading}
                  className="h-[50px] w-full rounded-xl bg-[#17C777] text-[15px] font-extrabold text-[#06301F] shadow-[0_10px_22px_-10px_rgba(23,199,119,0.7)] transition-all hover:bg-[#0B8F53] hover:text-white"
                >
                  {loading ? copy.sending : copy.send}
                </Button>
              </form>

              <div className="mt-6 border-t border-[#EEF2EC] pt-5 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B8F53] transition hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                  <span>{copy.backToLogin}</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
