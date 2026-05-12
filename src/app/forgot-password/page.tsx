"use client";

import Link from "next/link";
import { useState } from "react";
import { Cairo, Manrope } from "next/font/google";

import { requestPasswordReset } from "@/lib/auth";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import BrandLogo from "@/components/BrandLogo";

const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const arabicFont = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"] });

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
    requestFailed: string;
    rateLimited: string;
    blockedPermanent: string;
    blockedTemporary: string;
  }
> = {
  fr: {
    brand: "7sabek",
    title: "Mot de passe oublié",
    subtitle: "Entre ton email, on t'envoie un lien de réinitialisation.",
    email: "Email",
    successFallback: "Si le compte existe, un email de réinitialisation a été envoyé.",
    send: "Envoyer le lien",
    sending: "Envoi...",
    backToLogin: "Retour à la connexion",
    requestFailed: "Requête échouée",
    rateLimited: "Trop de tentatives. Réessaie plus tard.",
    blockedPermanent:
      "La réinitialisation du mot de passe est bloquée pour ce compte. Contacte le support.",
    blockedTemporary:
      "La réinitialisation du mot de passe est temporairement bloquée pour ce compte.",
  },
  en: {
    brand: "7sabek",
    title: "Forgot password",
    subtitle: "Enter your email and we will send you a reset link.",
    email: "Email",
    successFallback: "If the account exists, a reset email has been sent.",
    send: "Send reset link",
    sending: "Sending...",
    backToLogin: "Back to login",
    requestFailed: "Request failed",
    rateLimited: "Too many attempts. Please try again later.",
    blockedPermanent:
      "Password reset is blocked for this account. Contact support.",
    blockedTemporary: "Password reset is temporarily blocked for this account.",
  },
  ar: {
    brand: "حسابك",
    title: "نسيتي كلمة السر",
    subtitle: "دخل الإيميل ديالك وغادي نصيفطو ليك رابط إعادة التعيين.",
    email: "الإيميل",
    successFallback: "إلا كان الحساب موجود، تصيفط ليه إيميل إعادة التعيين.",
    send: "صيفط رابط الاسترجاع",
    sending: "جاري الإرسال...",
    backToLogin: "رجوع لتسجيل الدخول",
    requestFailed: "وقع مشكل فالطلب",
    rateLimited: "كاين بزاف ديال المحاولات. عاود من بعد.",
    blockedPermanent:
      "إعادة تعيين كلمة السر محبوسة لهاد الحساب. تاصل بالدعم.",
    blockedTemporary:
      "إعادة تعيين كلمة السر محبوسة مؤقتاً لهاد الحساب.",
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
  const pageFontClass =
    locale === "ar" ? `${arabicFont.className} forgot-arabic-font` : bodyFont.className;
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

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-[#f6f0e4] ${pageFontClass}`}
      dir={dir}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.14),_transparent_26%),linear-gradient(180deg,_rgba(255,255,255,0.78),_rgba(255,255,255,0.22))]" />
      <div className="pointer-events-none absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-40 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
        <Card className="w-full rounded-[30px] border border-white/80 bg-[var(--surface)]/85 p-7 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="mb-3">
            <BrandLogo locale={locale} className="h-28 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">{copy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.subtitle}</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{copy.email}</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="border-slate-200 bg-[var(--surface)]/95 focus-visible:ring-emerald-500"
              />
            </div>
            {message ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {loading ? copy.sending : copy.send}
            </Button>
          </form>
          <div className="mt-4 text-sm">
            <Link href="/login" className="font-medium text-emerald-700 hover:underline">
              {copy.backToLogin}
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
