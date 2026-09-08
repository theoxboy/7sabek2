"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Sparkles, Fingerprint } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";

import type { FloussyLocale } from "@/lib/localePreference";
import { GUEST_GATE_COPY, guestPitchForRoute, guestRouteFeature, guestRouteState, guestWallForRoute } from "@/lib/guestGate";
import { claimGuestAccount, claimGuestWithPasskey, mergeGuestIntoAccount, guestEvent } from "@/lib/guestAnchorApi";
import { clearGuestLocalState } from "@/lib/guestSession";
import { getPasskeyFeatureStatus, getRegisterOptions, verifyRegistration } from "@/lib/passkeys";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RecaptchaV2, isRecaptchaConfigured } from "@/components/ui/RecaptchaV2";
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
const promptEventSentFor = new Set<string>();
const wallHitSentFor = new Set<string>();

export function GuestGateBanner({ isGuest, pathname, locale, dir }: Props) {
  const [claimOpen, setClaimOpen] = useState(false);
  const copy = GUEST_GATE_COPY[locale] ?? GUEST_GATE_COPY.fr;
  const pitch = guestPitchForRoute(pathname, locale);
  const state = guestRouteState(pathname);
  const visible = isGuest && state !== "open";
  const claimSource = `wall:${guestWallForRoute(pathname) ?? guestRouteFeature(pathname) ?? "gate"}`;

  useEffect(() => {
    if (!visible) return;
    const where = pathname ?? "";
    if (!promptEventSentFor.has(where)) {
      promptEventSentFor.add(where);
      guestEvent("claim_prompt_shown", { where });
    }
    const wall = guestWallForRoute(pathname);
    if (wall && !wallHitSentFor.has(wall)) {
      wallHitSentFor.add(wall);
      guestEvent("guest_wall_hit", { wall, route: where });
    }
  }, [visible, pathname]);

  if (!visible) return null;

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
              {pitch ?? copy.body}
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

      <GuestClaimDialog open={claimOpen} onOpenChange={setClaimOpen} locale={locale} dir={dir} source={claimSource} />
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
    passkeyCta: string;
    passkeyHint: string;
    passkeyWorking: string;
    passkeyFailed: string;
    orEmail: string;
    mergeCta: string;
    mergeBadPassword: string;
    mergeAmbiguous: string;
    recaptchaRequired: string;
    recaptchaFailed: string;
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
    errEmailTaken: "Un compte existe déjà avec cet e-mail. Connecte-toi avec — ton budget de découverte reste sur cet appareil, tu le récupères avec ton code de reprise. Ou choisis un autre e-mail.",
    errWeakPassword: "Le mot de passe doit contenir au moins 8 caractères.",
    success: "Compte créé. Bienvenue !",
    passkeyCta: "Continuer avec Face ID / empreinte",
    passkeyHint: "Le plus simple : pas d’e-mail, pas de mot de passe.",
    passkeyWorking: "Validation…",
    passkeyFailed: "La validation a échoué. Réessaie ou utilise un e-mail.",
    orEmail: "ou utiliser un e-mail",
    mergeCta: "Me connecter et garder mes dépenses",
    mergeBadPassword: "Mot de passe incorrect pour ce compte.",
    mergeAmbiguous: "La connexion n’a pas abouti clairement. Recharge la page et connecte-toi normalement — si tes dépenses sont déjà là, tout est bon.",
    recaptchaRequired: "Confirme que tu n’es pas un robot.",
    recaptchaFailed: "La vérification anti-robot a échoué. Réessaie.",
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
    errEmailTaken: "An account already exists with this email. Sign in with it — your discovery budget stays on this device, get it back with your recovery code. Or pick another email.",
    errWeakPassword: "Password must be at least 8 characters.",
    success: "Account created. Welcome!",
    passkeyCta: "Continue with Face ID / fingerprint",
    passkeyHint: "The easiest way: no email, no password.",
    passkeyWorking: "Verifying…",
    passkeyFailed: "Verification failed. Try again or use an email.",
    orEmail: "or use an email",
    mergeCta: "Sign in and keep my expenses",
    mergeBadPassword: "Wrong password for this account.",
    mergeAmbiguous: "Sign-in didn’t clearly complete. Reload the page and sign in normally — if your expenses are already there, you’re all set.",
    recaptchaRequired: "Confirm you’re not a robot.",
    recaptchaFailed: "The anti-robot check failed. Try again.",
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
    errEmailTaken: "كاين حساب ديجا بهاد الإيميل. دخل بيه — الميزانية ديال الاكتشاف كتبقى ف هاد التيليفون، ترجّعها بالكود ديال الاسترجاع. ولا اختار إيميل آخر.",
    errWeakPassword: "كلمة السر خاصها على الأقل 8 حروف.",
    success: "تصاوب الحساب. مرحبا بيك!",
    passkeyCta: "كمّل بـ Face ID / البصمة",
    passkeyHint: "أسهل طريقة: بلا إيميل، بلا كلمة السر.",
    passkeyWorking: "كنتحققو…",
    passkeyFailed: "التحقق ما نجحش. عاود ولا استعمل إيميل.",
    orEmail: "ولا استعمل إيميل",
    mergeCta: "دخل وخلّي المصاريف ديالي",
    mergeBadPassword: "كلمة السر ماشي صحيحة لهاد الحساب.",
    mergeAmbiguous: "الدخول ما كملش بوضوح. عاود حمّل الصفحة ودخل بشكل عادي — إلا كانت المصاريف ديالك ديجا تما، كولشي مزيان.",
    recaptchaRequired: "أكّد أنك ماشي روبوت.",
    recaptchaFailed: "التحقق ضد الروبوت ما نجحش. عاود.",
  },
};

export function GuestClaimDialog({
  open,
  onOpenChange,
  locale,
  dir,
  source = "unknown",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
  /** Where the dialog was opened from — "wall:<name>" | "panel_dashboard" | "panel_settings" | "post_ack". */
  source?: string;
}) {
  const t = CLAIM_COPY[locale] ?? CLAIM_COPY.fr;
  const succeededRef = useRef(false);
  const openedEventSentRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  // Once a merge has been fired and its outcome is unknown (network drop after
  // the server may have replayed the expenses), block a second attempt so the
  // guest can't double-post their transactions.
  const [mergeAmbiguous, setMergeAmbiguous] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaOn = isRecaptchaConfigured();

  useEffect(() => {
    if (!open) {
      openedEventSentRef.current = false;
      return;
    }
    succeededRef.current = false;
    let cancelled = false;
    const supported =
      typeof window !== "undefined" &&
      typeof window.PublicKeyCredential !== "undefined";
    const announce = (methodShown: "passkey_first" | "email_only") => {
      if (openedEventSentRef.current) return;
      openedEventSentRef.current = true;
      guestEvent("guest_claim_dialog_opened", { source, method_shown: methodShown });
    };
    if (!supported) {
      setShowEmail(true);
      announce("email_only");
      return;
    }
    getPasskeyFeatureStatus()
      .then((s) => {
        if (!cancelled) {
          setPasskeyAvailable(Boolean(s?.enabled));
          setShowEmail(!s?.enabled);
          announce(s?.enabled ? "passkey_first" : "email_only");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShowEmail(true);
          announce("email_only");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, source]);

  const handleOpenChange = (v: boolean) => {
    if (!v && !succeededRef.current && openedEventSentRef.current) {
      guestEvent("claim_abandoned", { source });
    }
    onOpenChange(v);
  };

  const markClaimSuccess = (method: "passkey" | "email" | "merge") => {
    succeededRef.current = true;
    if (source === "post_ack") {
      guestEvent("guest_post_ack_prompt_converted", { method });
    }
  };

  const submitPasskey = async () => {
    setError(null);
    guestEvent("guest_claim_method_selected", { method: "passkey", source });
    setPasskeyLoading(true);
    try {
      const options = await getRegisterOptions();
      if (!options) throw new Error("passkey_unavailable");
      const credential = await startRegistration({ optionsJSON: options.options });
      const verified = await verifyRegistration({
        challenge_id: options.challenge_id,
        challenge: String(options.options.challenge ?? ""),
        credential,
      });
      if (!verified) throw new Error("passkey_unverified");
      await claimGuestWithPasskey();
      await clearGuestLocalState();
      markClaimSuccess("passkey");
      onOpenChange(false);
      window.location.reload();
    } catch {
      setError(t.passkeyFailed);
      setShowEmail(true);
    } finally {
      setPasskeyLoading(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError(t.errWeakPassword);
      return;
    }
    if (recaptchaOn && !recaptchaToken) {
      setError(t.recaptchaRequired);
      return;
    }
    guestEvent("guest_claim_method_selected", { method: "email", source });
    setLoading(true);
    try {
      await claimGuestAccount(email.trim().toLowerCase(), password, recaptchaToken);
      await clearGuestLocalState();
      markClaimSuccess("email");
      onOpenChange(false);
      // Full reload so the app shell re-bootstraps as a full member
      // (unlocks navigation, drops the guest banners).
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("recaptcha")) {
        setError(t.recaptchaFailed);
        setRecaptchaToken(null);
      } else if (msg.includes("email_taken") || msg.includes("already")) {
        setError(t.errEmailTaken);
        setMergeMode(true);
      } else if (msg.includes("password")) {
        setError(t.errWeakPassword);
      } else {
        setError(t.errGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitMerge = async () => {
    if (mergeAmbiguous) return;
    setError(null);
    guestEvent("guest_claim_method_selected", { method: "merge", source });
    setLoading(true);
    try {
      await mergeGuestIntoAccount(email.trim().toLowerCase(), password);
      await clearGuestLocalState();
      markClaimSuccess("merge");
      onOpenChange(false);
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      const badCredentials = msg.includes("bad_credentials") || msg.includes("401");
      if (badCredentials) {
        // Server rejected the login before touching anything — safe to retry.
        setError(t.mergeBadPassword);
      } else {
        // Any other failure is ambiguous: the replay may have partly run.
        setMergeAmbiguous(true);
        setError(t.mergeAmbiguous);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir={dir}>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>

        <div className="mt-3 flex flex-col gap-3">
          {passkeyAvailable && (
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                onClick={() => void submitPasskey()}
                isLoading={passkeyLoading}
                className="w-full"
              >
                <Fingerprint className="h-4 w-4" />
                <span className="ms-2">{passkeyLoading ? t.passkeyWorking : t.passkeyCta}</span>
              </Button>
              <span className="text-center text-[11px]" style={{ color: "var(--muted)" }}>
                {t.passkeyHint}
              </span>
            </div>
          )}

          {passkeyAvailable && !showEmail && (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="text-center text-[12px] font-semibold underline"
              style={{ color: "var(--accent-strong)" }}
            >
              {t.orEmail}
            </button>
          )}

          {showEmail && (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                {t.email}
                <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
              {recaptchaOn && <RecaptchaV2 onToken={setRecaptchaToken} />}
              <Button type="submit" isLoading={loading} className="mt-1 w-full">
                {loading ? t.submitting : t.submit}
              </Button>
            </form>
          )}

          {error && (
            <p className="text-xs font-semibold" style={{ color: "var(--error)" }}>
              {error}
            </p>
          )}

          {mergeMode && (
            <Button
              type="button"
              variant="secondary"
              isLoading={loading}
              disabled={mergeAmbiguous}
              onClick={() => void submitMerge()}
              className="w-full"
            >
              {t.mergeCta}
            </Button>
          )}

          <p className="text-center text-[11px]" style={{ color: "var(--muted)" }}>
            {t.free}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
