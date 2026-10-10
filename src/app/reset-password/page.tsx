"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, getPasswordResetTokenInfo } from "@/lib/auth";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import { setAppLocale } from "@/components/i18n/LanguagePreferenceGate";
import type { FloussyLocale } from "@/lib/localePreference";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import BrandLogo from "@/components/BrandLogo";
import { LanguageChip } from "@/components/i18n/LanguageChip";

const arabicFont = { className: "font-cairo", variable: "--font-cairo" };

const COPY: Record<
  FloussyLocale,
  {
    brand: string;
    title: string;
    subtitle: string;
    invalidMissingToken: string;
    invalidToken: string;
    passwordMin: string;
    confirmMismatch: string;
    updatedRedirecting: string;
    requestFailed: string;
    invalidLinkBlockPrefix: string;
    invalidLinkBlockAction: string;
    invalidLinkBlockSuffix: string;
    requestNewLink: string;
    newPassword: string;
    confirmation: string;
    superadminBoxTitle: string;
    superadminCode: string;
    superadminFirstName: string;
    codePlaceholder: string;
    firstNamePlaceholder: string;
    updating: string;
    update: string;
    backToLogin: string;
    superadminVerificationFailed: string;
    superadminRequiredFields: string;
    tokenCheckFailed: string;
    tokenExpired: string;
    mustBeDifferent: string;
  }
> = {
  fr: {
    brand: "7sabek",
    title: "Nouveau mot de passe",
    subtitle: "Entre un nouveau mot de passe pour ton compte.",
    invalidMissingToken: "Lien invalide: token manquant.",
    invalidToken: "Lien invalide ou expiré. Demande un nouveau lien.",
    passwordMin: "Le mot de passe doit contenir au moins 8 caractères.",
    confirmMismatch: "La confirmation ne correspond pas.",
    updatedRedirecting: "Mot de passe mis à jour. Redirection vers la connexion...",
    requestFailed: "Requête échouée.",
    invalidLinkBlockPrefix: "Le lien de réinitialisation est invalide. Retourne sur la page",
    invalidLinkBlockAction: "mot de passe oublié",
    invalidLinkBlockSuffix: "pour en demander un nouveau.",
    requestNewLink: "Demander un nouveau lien",
    newPassword: "Nouveau mot de passe",
    confirmation: "Confirmation",
    superadminBoxTitle:
      "Vérification superadmin (obligatoire uniquement pour compte superadmin)",
    superadminCode: "Code secret (4 chiffres)",
    superadminFirstName: "Prénom superadmin",
    codePlaceholder: "Code secret",
    firstNamePlaceholder: "Prénom",
    updating: "Mise à jour...",
    update: "Mettre à jour",
    backToLogin: "Retour à la connexion",
    superadminVerificationFailed: "Vérification superadmin échouée.",
    superadminRequiredFields: "Entre le code secret (4 chiffres) et le prénom superadmin.",
    tokenCheckFailed: "Impossible de vérifier ce lien maintenant. Réessaie dans quelques instants.",
    tokenExpired: "Lien invalide ou expiré. Demande un nouveau lien.",
    mustBeDifferent: "Le nouveau mot de passe doit être différent de l'ancien.",
  },
  en: {
    brand: "7sabek",
    title: "New password",
    subtitle: "Enter a new password for your account.",
    invalidMissingToken: "Invalid link: missing token.",
    invalidToken: "Invalid or expired link. Request a new one.",
    passwordMin: "Password must contain at least 8 characters.",
    confirmMismatch: "Confirmation does not match.",
    updatedRedirecting: "Password updated. Redirecting to login...",
    requestFailed: "Request failed.",
    invalidLinkBlockPrefix: "The reset link is invalid. Go back to",
    invalidLinkBlockAction: "forgot password",
    invalidLinkBlockSuffix: "to request a new one.",
    requestNewLink: "Request a new link",
    newPassword: "New password",
    confirmation: "Confirmation",
    superadminBoxTitle:
      "Superadmin verification (required only for superadmin account)",
    superadminCode: "Secret code (4 digits)",
    superadminFirstName: "Superadmin first name",
    codePlaceholder: "Secret code",
    firstNamePlaceholder: "First name",
    updating: "Updating...",
    update: "Update",
    backToLogin: "Back to login",
    superadminVerificationFailed: "Superadmin verification failed.",
    superadminRequiredFields: "Enter the secret code (4 digits) and superadmin first name.",
    tokenCheckFailed: "We could not verify this link right now. Please try again shortly.",
    tokenExpired: "Invalid or expired link. Request a new one.",
    mustBeDifferent: "New password must be different from the current one.",
  },
  ar: {
    brand: "حسابك",
    title: "كلمة سر جديدة",
    subtitle: "دخل كلمة سر جديدة للحساب ديالك.",
    invalidMissingToken: "الرابط غير صالح أو ناقص.",
    invalidToken: "الرابط غير صالح أو سالات الصلاحية ديالو. طلب رابط جديد.",
    passwordMin: "كلمة السر خاصها تكون فيها على الأقل 8 حروف.",
    confirmMismatch: "تأكيد كلمة السر ما مطابقش.",
    updatedRedirecting: "تبدلات كلمة السر. غادي نوجهوك لصفحة الدخول…",
    requestFailed: "وقع مشكل فالطلب. عاود المحاولة.",
    invalidLinkBlockPrefix: "رابط تغيير كلمة السر غير صالح. رجع لصفحة",
    invalidLinkBlockAction: "نسيتي كلمة السر",
    invalidLinkBlockSuffix: "باش تطلب رابط جديد.",
    requestNewLink: "طلب رابط جديد",
    newPassword: "كلمة السر الجديدة",
    confirmation: "أكد كلمة السر",
    superadminBoxTitle:
      "تحقق superadmin (إجباري غير لحساب superadmin)",
    superadminCode: "الكود السري (4 أرقام)",
    superadminFirstName: "الاسم الشخصي ديال superadmin",
    codePlaceholder: "الكود السري",
    firstNamePlaceholder: "الاسم الشخصي",
    updating: "جاري التحديث…",
    update: "حدّث كلمة السر",
    backToLogin: "رجوع لتسجيل الدخول",
    superadminVerificationFailed: "ما قدرناش نتحققو من صلاحيات الدخول.",
    superadminRequiredFields: "دخل الكود السري (4 أرقام) والاسم الشخصي ديال superadmin.",
    tokenCheckFailed: "ما قدرناش نتحققو من الرابط دابا. عاود المحاولة من بعد شوية.",
    tokenExpired: "الرابط غير صالح أو سالات الصلاحية ديالو. طلب رابط جديد.",
    mustBeDifferent: "كلمة السر الجديدة خاصها تكون مختلفة على القديمة.",
  },
};

function localizeResetError(raw: string, copy: (typeof COPY)["fr"]) {
  const lower = (raw || "").toLowerCase();
  if (!lower) return copy.requestFailed;
  if (lower.includes("at least 16 characters")) return copy.tokenExpired;
  if (lower.includes("invalid or expired reset token")) return copy.tokenExpired;
  if (lower.includes("superadmin verification failed")) return copy.superadminVerificationFailed;
  if (lower.includes("different from the current password")) return copy.mustBeDifferent;
  return raw;
}

export default function ResetPasswordPage() {
  const { locale, dir } = useAppLocale("fr");
  useForceArabicDocumentFont(locale === "ar", "reset-password-ar-body");
  const copy = COPY[locale];
  const pageFontClass = `${arabicFont.className} ${locale === "ar" ? "reset-arabic-font" : ""}`;
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);
  const hasValidTokenFormat = token.length >= 16;

  const changeLocale = (next: FloussyLocale) => {
    setAppLocale(next);
  };

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [superadminCode, setSuperadminCode] = useState("");
  const [superadminFirstName, setSuperadminFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenInfoLoading, setTokenInfoLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(
    hasValidTokenFormat ? null : false
  );
  const [requiresSuperadminVerification, setRequiresSuperadminVerification] =
    useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!hasValidTokenFormat) {
      setTokenValid(false);
      setRequiresSuperadminVerification(false);
      return () => {
        active = false;
      };
    }
    setTokenInfoLoading(true);
    setError(null);
    getPasswordResetTokenInfo(token)
      .then((info) => {
        if (!active) return;
        if (!info.valid) {
          setTokenValid(false);
          setRequiresSuperadminVerification(false);
          setError(copy.invalidToken);
          return;
        }
        setTokenValid(true);
        setRequiresSuperadminVerification(Boolean(info.requires_superadmin_verification));
      })
      .catch(() => {
        if (!active) return;
        setTokenValid(null);
        setRequiresSuperadminVerification(false);
        setError(copy.tokenCheckFailed);
      })
      .finally(() => {
        if (active) setTokenInfoLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, hasValidTokenFormat, copy.invalidToken, copy.tokenCheckFailed]);

  const canShowForm = hasValidTokenFormat && tokenValid === true;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!token) {
      setError(copy.invalidMissingToken);
      return;
    }
    if (!hasValidTokenFormat) {
      setError(copy.invalidToken);
      return;
    }
    if (tokenValid === false) {
      setError(copy.invalidToken);
      return;
    }
    if (password.length < 8) {
      setError(copy.passwordMin);
      return;
    }
    if (password !== confirm) {
      setError(copy.confirmMismatch);
      return;
    }
    if (requiresSuperadminVerification) {
      if (superadminCode.trim().length !== 4 || !superadminFirstName.trim()) {
        setError(copy.superadminRequiredFields);
        return;
      }
    }
    setLoading(true);
    try {
      await confirmPasswordReset(token, password, {
        superadminCode: requiresSuperadminVerification ? superadminCode : undefined,
        superadminFirstName: requiresSuperadminVerification
          ? superadminFirstName
          : undefined,
      });
      setMessage(copy.updatedRedirecting);
      setTimeout(() => router.push("/login"), 1200);
    } catch (exc) {
      const text = exc instanceof Error ? exc.message : "";
      setError(localizeResetError(text, copy));
    } finally {
      setLoading(false);
    }
  };

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
          <LanguageChip locale={locale} onChangeLocale={changeLocale} layoutId="reset-top-lang" />
          <Link href="/" className="pw-pill">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
            <span>Accueil</span>
          </Link>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="pw-head w-full max-w-[1200px] mx-auto p-6 flex justify-between items-center gap-3 box-border">
        <Link
          href="/"
          className="h-11 px-3.5 rounded-xl bg-white dark:bg-[#18221E] border border-[#DCDAD1] dark:border-[#33433C] flex items-center gap-2 text-[#0F1A16] dark:text-[#EEF2EF] text-[15px] font-bold no-underline hover:border-[#0A7A53] transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
          <span>Accueil</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <LanguageChip locale={locale} onChangeLocale={changeLocale} layoutId="reset-hdr-lang" />
          <Link
            href="/releases"
            className="h-[34px] px-3 rounded-[17px] bg-[#E2F1E8] dark:bg-[#173A2D] flex items-center gap-1.5 text-[#06402C] dark:text-[#BFEBD6] text-[13px] font-extrabold no-underline"
          >
            <span className="w-[7px] h-[7px] rounded-[4px] bg-[#0A7A53] dark:bg-[#2FB27A]" />
            <span>v1.7.0</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="pw-main flex-1 flex items-center justify-center px-6 py-6 pb-20">
        <div className="pw-card w-full max-w-[480px] bg-white dark:bg-[#18221E] border border-[#DCDAD1] dark:border-[#33433C] rounded-[28px] p-8 sm:p-11 box-border flex flex-col gap-5 shadow-[0_24px_60px_rgba(15,26,22,0.06)] dark:shadow-none">

          {/* Expired / Invalid State */}
          {!canShowForm && !message && (
            <div className="flex flex-col gap-[18px]">
              <span className="w-16 h-16 rounded-[20px] bg-[#FBE8E1] dark:bg-[#3D1E1A] flex items-center justify-center text-[#B4441C] dark:text-[#FF8A80]">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4M12 16.5h.01M9 2h6" />
                </svg>
              </span>
              <h1 className="m-0 text-[28px] sm:text-[30px] font-extrabold tracking-[-1px] text-[#0F1A16] dark:text-[#EEF2EF]">
                {copy.invalidToken}
              </h1>
              <p className="m-0 text-base leading-[1.55] text-[#55645D] dark:text-[#A3B1AA]">
                {copy.tokenExpired}
              </p>
              <Link
                href="/forgot-password"
                className="h-14 rounded-[14px] bg-[#0A7A53] dark:bg-[#2FB27A] hover:bg-[#086645] dark:hover:bg-[#3CC58A] text-white dark:text-[#05140E] flex items-center justify-center text-[17px] font-extrabold no-underline transition"
              >
                {copy.requestNewLink}
              </Link>
            </div>
          )}

          {/* Success State */}
          {message && (
            <div className="flex flex-col gap-[18px] items-center text-center">
              <span className="w-[72px] h-[72px] rounded-[36px] bg-[#E2F1E8] dark:bg-[#173A2D] flex items-center justify-center text-[#0A7A53] dark:text-[#2FB27A]">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-10" />
                </svg>
              </span>
              <h1 className="m-0 text-[28px] sm:text-[30px] font-extrabold tracking-[-1px] text-[#0F1A16] dark:text-[#EEF2EF]">
                {copy.updatedRedirecting}
              </h1>
              <p className="m-0 text-base text-[#55645D] dark:text-[#A3B1AA]">
                Redirection automatique vers la connexion…
              </p>
              <div className="w-full h-1.5 rounded-[3px] bg-[#E6E4DC] dark:bg-[#33433C] overflow-hidden">
                <div className="w-full h-1.5 rounded-[3px] bg-[#0A7A53] dark:bg-[#2FB27A] animate-pulse" />
              </div>
              <Link
                href="/login"
                className="text-[15px] font-extrabold text-[#0A7A53] dark:text-[#2FB27A] hover:underline no-underline"
              >
                {copy.backToLogin}
              </Link>
            </div>
          )}

          {/* Valid Form State */}
          {canShowForm && !message && (
            <div className="flex flex-col gap-[18px]">
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#E2F1E8] dark:bg-[#173A2D] text-[#06402C] dark:text-[#BFEBD6] text-sm font-bold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-10" />
                </svg>
                <span>Lien vérifié · Session sécurisée</span>
              </div>

              <h1 className="m-0 text-[30px] sm:text-[32px] font-extrabold tracking-[-1px] text-[#0F1A16] dark:text-[#EEF2EF]">
                {copy.title}
              </h1>

              {error && (
                <div
                  role="alert"
                  className="flex gap-3 p-4 rounded-2xl bg-[#FBE8E1] dark:bg-[#3D1E1A] text-[#7A2A10] dark:text-[#FF8A80] text-[15px] leading-relaxed"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-[#0F1A16] dark:text-[#EEF2EF]">
                  <span>{copy.newPassword}</span>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    data-clarity-mask="true"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-[54px] px-4 border-[1.5px] border-[#DCDAD1] dark:border-[#33433C] focus:border-[#0A7A53] dark:focus:border-[#2FB27A] rounded-[14px] font-sans text-base box-border w-full bg-white dark:bg-[#18221E] text-[#0F1A16] dark:text-[#EEF2EF] outline-none transition"
                  />
                </label>
                <span className="-mt-2 text-[13px] text-[#55645D] dark:text-[#A3B1AA]">
                  {copy.passwordMin}
                </span>

                <label className="flex flex-col gap-1.5 text-sm font-bold text-[#0F1A16] dark:text-[#EEF2EF]">
                  <span>{copy.confirmation}</span>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    data-clarity-mask="true"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-[54px] px-4 border-[1.5px] border-[#DCDAD1] dark:border-[#33433C] focus:border-[#0A7A53] dark:focus:border-[#2FB27A] rounded-[14px] font-sans text-base box-border w-full bg-white dark:bg-[#18221E] text-[#0F1A16] dark:text-[#EEF2EF] outline-none transition"
                  />
                </label>

                {requiresSuperadminVerification && (
                  <fieldset className="m-0 border-[1.5px] border-dashed border-[#6B3FA0] rounded-[18px] p-4 flex flex-col gap-3">
                    <legend className="px-1.5 text-[13px] font-extrabold text-[#6B3FA0]">
                      {copy.superadminBoxTitle}
                    </legend>
                    <label className="flex flex-col gap-1.5 text-sm font-bold text-[#0F1A16] dark:text-[#EEF2EF]">
                      <span>{copy.superadminCode}</span>
                      <input
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="• • • •"
                        data-clarity-mask="true"
                        value={superadminCode}
                        onChange={(e) => setSuperadminCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        className="h-[52px] px-4 border-[1.5px] border-[#DCDAD1] dark:border-[#33433C] focus:border-[#6B3FA0] rounded-[14px] font-sans text-xl tracking-[8px] box-border w-full bg-white dark:bg-[#18221E] text-[#0F1A16] dark:text-[#EEF2EF] outline-none transition"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-bold text-[#0F1A16] dark:text-[#EEF2EF]">
                      <span>{copy.superadminFirstName}</span>
                      <input
                        type="text"
                        placeholder={copy.firstNamePlaceholder}
                        data-clarity-mask="true"
                        value={superadminFirstName}
                        onChange={(e) => setSuperadminFirstName(e.target.value)}
                        className="h-[52px] px-4 border-[1.5px] border-[#DCDAD1] dark:border-[#33433C] focus:border-[#6B3FA0] rounded-[14px] font-sans text-base box-border w-full bg-white dark:bg-[#18221E] text-[#0F1A16] dark:text-[#EEF2EF] outline-none transition"
                      />
                    </label>
                  </fieldset>
                )}

                <button
                  type="submit"
                  disabled={loading || tokenInfoLoading || !hasValidTokenFormat}
                  className="h-[56px] mt-2 border-0 rounded-[14px] bg-[#0A7A53] dark:bg-[#2FB27A] hover:bg-[#086645] dark:hover:bg-[#3CC58A] text-white dark:text-[#05140E] font-sans text-[17px] font-extrabold cursor-pointer transition flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? copy.updating : copy.update}
                </button>
              </form>
            </div>
          )}

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
