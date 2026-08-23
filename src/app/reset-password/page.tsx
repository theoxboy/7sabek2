"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cairo, Manrope } from "next/font/google";

import { confirmPasswordReset, getPasswordResetTokenInfo } from "@/lib/auth";
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
    <main
      className={`relative min-h-screen overflow-hidden bg-[#f6f0e4] ${pageFontClass}`}
      dir={dir}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.14),_transparent_26%),linear-gradient(180deg,_rgba(255,255,255,0.78),_rgba(255,255,255,0.22))]" />
      <div className="pointer-events-none absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-40 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
        <Card className="w-full rounded-[30px] border border-white/80 bg-[var(--surface)]/88 p-7 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="mb-3">
            <BrandLogo locale={locale} className="h-28 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">{copy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.subtitle}</p>

          {!canShowForm ? (
            <div className="mt-5 space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">{copy.invalidToken}</p>
              <p className="text-xs text-amber-700">
                {copy.invalidLinkBlockPrefix} {copy.invalidLinkBlockAction} {copy.invalidLinkBlockSuffix}
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                {copy.requestNewLink}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{copy.newPassword}</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  data-clarity-mask="true"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="border-slate-200 bg-[var(--surface)]/95 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{copy.confirmation}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  data-clarity-mask="true"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="border-slate-200 bg-[var(--surface)]/95 focus-visible:ring-emerald-500"
                />
              </div>
              {tokenInfoLoading ? null : requiresSuperadminVerification ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-amber-800">
                    {copy.superadminBoxTitle}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="superadmin-code">{copy.superadminCode}</Label>
                    <Input
                      id="superadmin-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      data-clarity-mask="true"
                      value={superadminCode}
                      onChange={(event) =>
                        setSuperadminCode(event.target.value.replace(/[^\d]/g, "").slice(0, 4))
                      }
                      placeholder={copy.codePlaceholder}
                      className="border-amber-200 bg-[var(--surface)]/95 focus-visible:ring-amber-400"
                    />
                  </div>
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="superadmin-first-name">{copy.superadminFirstName}</Label>
                    <Input
                      id="superadmin-first-name"
                      type="text"
                      data-clarity-mask="true"
                      value={superadminFirstName}
                      onChange={(event) => setSuperadminFirstName(event.target.value)}
                      placeholder={copy.firstNamePlaceholder}
                      className="border-amber-200 bg-[var(--surface)]/95 focus-visible:ring-amber-400"
                    />
                  </div>
                </div>
              ) : null}
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
                disabled={loading || tokenInfoLoading || !hasValidTokenFormat}
                className="h-11 w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
              >
                {loading ? copy.updating : copy.update}
              </Button>
            </form>
          )}

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
