"use client";

import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";

import type { FloussyLocale } from "@/lib/localePreference";
import { GUEST_GATE_COPY, guestRouteState } from "@/lib/guestGate";
import { claimGuestAccount } from "@/lib/guestAnchorApi";
import { finalizeGuestClaim } from "@/lib/guestSession";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";

type Props = {
  isGuest: boolean;
  pathname: string | null;
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
};

/**
 * The banner a guest sees at the top of any gated page. Self-guarding: renders
 * nothing for members or on fully-open routes. Carries its own "create your
 * free account" dialog.
 */
export function GuestGateBanner({ isGuest, pathname, locale, dir }: Props) {
  const [claimOpen, setClaimOpen] = useState(false);
  const copy = GUEST_GATE_COPY[locale] ?? GUEST_GATE_COPY.fr;
  const state = guestRouteState(pathname);

  if (!isGuest || state === "open") return null;

  const limited = state === "limited";

  return (
    <>
      <div
        dir={dir}
        className="mx-auto mb-4 mt-1 flex w-full max-w-3xl flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:gap-4"
        style={{
          borderColor: "var(--accent)",
          background: "var(--accent-soft)",
          color: "var(--ink)",
        }}
        role="status"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--accent)", color: "var(--surface)" }}
          aria-hidden
        >
          {limited ? <Sparkles className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--accent-strong)" }}
          >
            {copy.eyebrow}
          </p>
          <p className="text-sm font-semibold">
            {limited ? copy.advisorLimit : copy.title}
          </p>
          {!limited && (
            <p className="mt-0.5 text-[13px] leading-snug" style={{ color: "var(--muted)" }}>
              {copy.body}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
          <Button
            type="button"
            onClick={() => setClaimOpen(true)}
            className="whitespace-nowrap"
          >
            {copy.cta}
          </Button>
          <span className="text-[10.5px]" style={{ color: "var(--muted)" }}>
            {copy.freeNote}
          </span>
        </div>
      </div>

      <GuestClaimDialog open={claimOpen} onOpenChange={setClaimOpen} locale={locale} dir={dir} />
    </>
  );
}

// ─── Claim dialog ─────────────────────────────────────────────────────────────

const CLAIM_COPY: Record<
  FloussyLocale,
  {
    title: string;
    desc: string;
    email: string;
    password: string;
    submit: string;
    submitting: string;
    free: string;
    errGeneric: string;
    errEmailTaken: string;
    errWeakPassword: string;
    success: string;
  }
> = {
  fr: {
    title: "Crée ton compte gratuit",
    desc: "Tout ce que tu as déjà fait est gardé. 7sabek reste 100% gratuit, pour toujours.",
    email: "E-mail",
    password: "Mot de passe (8 caractères min.)",
    submit: "Créer mon compte gratuit",
    submitting: "Création…",
    free: "Aucun paiement, jamais. Pas de carte bancaire.",
    errGeneric: "Impossible de créer le compte. Réessaie.",
    errEmailTaken: "Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.",
    errWeakPassword: "Le mot de passe doit contenir au moins 8 caractères.",
    success: "Compte créé. Bienvenue !",
  },
  en: {
    title: "Create your free account",
    desc: "Everything you’ve done so far is kept. 7sabek stays 100% free, forever.",
    email: "Email",
    password: "Password (min. 8 characters)",
    submit: "Create my free account",
    submitting: "Creating…",
    free: "No payment, ever. No card.",
    errGeneric: "Could not create the account. Try again.",
    errEmailTaken: "An account already exists with this email. Sign in instead.",
    errWeakPassword: "Password must be at least 8 characters.",
    success: "Account created. Welcome!",
  },
  ar: {
    title: "صاوب حسابك المجاني",
    desc: "كولشي اللي درتي كيتحفظ. 7sabek كيبقى مجاني 100% وديما.",
    email: "الإيميل",
    password: "كلمة السر (على الأقل 8 حروف)",
    submit: "صاوب حسابي المجاني",
    submitting: "كنصاوبو…",
    free: "بلا خلاص، أبداً. بلا كارط بانكية.",
    errGeneric: "ما قدرناش نصاوبو الحساب. عاود.",
    errEmailTaken: "كاين حساب ديجا بهاد الإيميل. دخل بيه.",
    errWeakPassword: "كلمة السر خاصها على الأقل 8 حروف.",
    success: "تصاوب الحساب. مرحبا بيك!",
  },
};

function GuestClaimDialog({
  open,
  onOpenChange,
  locale,
  dir,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
}) {
  const t = CLAIM_COPY[locale] ?? CLAIM_COPY.fr;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError(t.errWeakPassword);
      return;
    }
    setLoading(true);
    try {
      await claimGuestAccount(email.trim().toLowerCase(), password);
      await finalizeGuestClaim();
      onOpenChange(false);
      // Full reload so the app shell re-bootstraps as a full member
      // (unlocks navigation, drops the guest banners).
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("email_taken") || msg.includes("already")) {
        setError(t.errEmailTaken);
      } else if (msg.includes("password")) {
        setError(t.errWeakPassword);
      } else {
        setError(t.errGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir}>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>

        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
            {t.email}
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
            {t.password}
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <p className="text-xs font-semibold" style={{ color: "var(--error)" }}>
              {error}
            </p>
          )}

          <Button type="submit" isLoading={loading} className="mt-1 w-full">
            {loading ? t.submitting : t.submit}
          </Button>
          <p className="text-center text-[11px]" style={{ color: "var(--muted)" }}>
            {t.free}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
