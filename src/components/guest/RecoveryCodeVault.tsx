"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Copy,
  Check,
  Download,
  Share2,
  Fingerprint,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";

import type { FloussyLocale } from "@/lib/localePreference";
import { GUEST_PANEL_COPY } from "@/lib/guestPanelCopy";
import {
  claimGuestWithPasskey,
  emailRecoveryCode,
  guestEvent,
} from "@/lib/guestAnchorApi";
import { clearGuestLocalState } from "@/lib/guestSession";
import {
  getPasskeyFeatureStatus,
  getRegisterOptions,
  verifyRegistration,
} from "@/lib/passkeys";
import { recoveryQrSvg, recoveryUrl } from "@/lib/guestRecoveryQr";
import { renderRecoveryCard } from "@/lib/guestRecoveryImage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function formatCode(raw: string): string {
  const c = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

type Props = {
  code: string;
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
  acked: boolean;
  fragile?: boolean;
  /** Called when the guest taps "I saved my code" (parent runs ack + navigates). */
  onAck: () => void | Promise<void>;
  ackLoading?: boolean;
  /** Called after a successful passkey claim (parent navigates / reloads). */
  onSecured: () => void;
  /** "welcome" (on /decouverte) or "panel" (dashboard/settings) — for analytics. */
  where: string;
};

export function RecoveryCodeVault({
  code,
  locale,
  dir,
  acked,
  fragile = false,
  onAck,
  ackLoading = false,
  onSecured,
  where,
}: Props) {
  const t = GUEST_PANEL_COPY[locale] ?? GUEST_PANEL_COPY.fr;

  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState<"" | "download" | "share">("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"" | "sending" | "sent" | "error">("");
  // Hidden until the backend endpoint is live in prod. Also self-heals on a 404.
  const [emailAvailable, setEmailAvailable] = useState(
    process.env.NEXT_PUBLIC_GUEST_EMAIL_CODE === "1"
  );
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  const savedSomehow = copied || downloaded || shared || emailState === "sent";
  const qr = useMemo(() => recoveryQrSvg(recoveryUrl(code)), [code]);
  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    typeof navigator.share === "function";

  useEffect(() => {
    let cancelled = false;
    if (typeof window === "undefined" || typeof window.PublicKeyCredential === "undefined") return;
    getPasskeyFeatureStatus()
      .then((s) => {
        if (!cancelled) setPasskeyAvailable(Boolean(s?.enabled));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatCode(code));
      setCopied(true);
      guestEvent("guest_recovery_action", { action: "copy", where });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const buildFile = async () => {
    const blob = await renderRecoveryCard(
      code,
      { heading: t.vaultImageHeading, hint: t.vaultImageHint },
      dir
    );
    if (!blob) return null;
    return new File([blob], "7sabek-code-reprise.png", { type: "image/png" });
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      const file = await buildFile();
      if (!file) return;
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setDownloaded(true);
      guestEvent("guest_recovery_action", { action: "download", where });
    } catch {
      /* ignore */
    } finally {
      setBusy("");
    }
  };

  const handleShare = async () => {
    setBusy("share");
    try {
      const file = await buildFile();
      if (!file) return;
      if (canShareFiles && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: t.vaultImageHeading });
        setShared(true);
        guestEvent("guest_recovery_action", { action: "share", where });
      } else {
        await handleDownload();
      }
    } catch {
      /* user cancelled the share sheet — not an error */
    } finally {
      setBusy("");
    }
  };

  const handleEmail = async () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
      setEmailState("error");
      return;
    }
    setEmailState("sending");
    try {
      await emailRecoveryCode(clean, code);
      setEmailState("sent");
      guestEvent("guest_recovery_action", { action: "email", where });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("404")) {
        // Endpoint not deployed yet — retire the option quietly.
        setEmailAvailable(false);
        setEmailOpen(false);
        setEmailState("");
      } else {
        setEmailState("error");
      }
    }
  };

  const handlePasskey = async () => {
    setPasskeyError(null);
    setPasskeyLoading(true);
    guestEvent("guest_claim_method_selected", { method: "passkey", source: `vault:${where}` });
    try {
      const options = await getRegisterOptions();
      if (!options) throw new Error("unavailable");
      const credential = await startRegistration({ optionsJSON: options.options });
      const verified = await verifyRegistration({
        challenge_id: options.challenge_id,
        challenge: String(options.options.challenge ?? ""),
        credential,
      });
      if (!verified) throw new Error("unverified");
      await claimGuestWithPasskey();
      await clearGuestLocalState();
      onSecured();
    } catch {
      setPasskeyError(t.vaultPasskeyFailed);
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div
      dir={dir}
      className="flex flex-col gap-3 rounded-2xl p-3.5"
      style={{
        background: fragile ? "var(--warning-soft)" : "var(--surface-2)",
        border: `1px solid ${fragile ? "var(--warning)" : "var(--border)"}`,
      }}
    >
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4" style={{ color: "var(--muted)" }} aria-hidden />
        <span className="text-[13px] font-bold">{t.recoveryTitle}</span>
      </div>

      {fragile && (
        <p
          className="flex items-start gap-1.5 text-[12.5px] font-semibold leading-snug"
          style={{ color: "var(--warning)" }}
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {t.fragileWarning}
        </p>
      )}
      <p className="text-[12.5px] leading-snug" style={{ color: "var(--muted)" }}>
        {t.recoveryIntro}
      </p>

      {/* Passkey — nothing to remember */}
      {passkeyAvailable && !acked && (
        <div className="flex flex-col gap-1 rounded-xl p-2.5" style={{ background: "var(--accent-soft)" }}>
          <Button type="button" onClick={() => void handlePasskey()} isLoading={passkeyLoading} className="w-full">
            <Fingerprint className="h-4 w-4" />
            <span className="ms-2">{passkeyLoading ? t.vaultPasskeyWorking : t.vaultPasskeyCta}</span>
          </Button>
          <span className="text-center text-[11px]" style={{ color: "var(--accent-strong)" }}>
            {t.vaultPasskeyHint}
          </span>
          {passkeyError && (
            <span className="text-center text-[11px] font-semibold" style={{ color: "var(--error)" }}>
              {passkeyError}
            </span>
          )}
        </div>
      )}
      {passkeyAvailable && !acked && (
        <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
          <span className="h-px flex-1" style={{ background: "var(--border)" }} />
          {t.vaultOrCode}
          <span className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>
      )}

      {/* The code + QR */}
      <div className="flex flex-wrap items-center gap-3">
        <code
          className="rounded-lg px-3 py-1.5 text-base font-bold tracking-widest"
          style={{ background: "var(--bg)", border: "1px solid var(--border-strong)", direction: "ltr" }}
        >
          {formatCode(code)}
        </code>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt=""
          width={72}
          height={72}
          className="rounded-md"
          style={{ background: "#fff", border: "1px solid var(--border)" }}
        />
        <span className="text-[11px] leading-snug" style={{ color: "var(--muted)", maxWidth: "12rem" }}>
          {t.vaultQrHint}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ms-1">{copied ? t.copied : t.copy}</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void handleDownload()}
          isLoading={busy === "download"}
        >
          {downloaded ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
          <span className="ms-1">{downloaded ? t.vaultDownloaded : t.vaultDownload}</span>
        </Button>
        {canShareFiles && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleShare()}
            isLoading={busy === "share"}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="ms-1">{t.vaultShare}</span>
          </Button>
        )}
        {emailAvailable && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEmailOpen((v) => !v)}>
            <Mail className="h-3.5 w-3.5" />
            <span className="ms-1">{t.vaultEmailToggle}</span>
          </Button>
        )}
      </div>

      {emailAvailable && emailOpen && emailState !== "sent" && (
        <form
          className="flex flex-col gap-1.5 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void handleEmail();
          }}
        >
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t.vaultEmailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm" isLoading={emailState === "sending"} className="whitespace-nowrap">
            {t.vaultEmailSend}
          </Button>
        </form>
      )}
      {emailState === "sent" && (
        <span className="text-[12px] font-semibold" style={{ color: "var(--success)" }}>
          {t.vaultEmailSent}
        </span>
      )}
      {emailState === "error" && (
        <span className="text-[12px] font-semibold" style={{ color: "var(--error)" }}>
          {t.vaultEmailError}
        </span>
      )}

      {/* Ack — locked until the guest actually saved the code somewhere */}
      {acked ? (
        <span className="text-[12px] font-semibold" style={{ color: "var(--success)" }}>
          {t.acked}
        </span>
      ) : (
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            size="sm"
            onClick={() => void onAck()}
            isLoading={ackLoading}
            disabled={!savedSomehow || ackLoading}
            className="self-start"
          >
            {t.ackButton}
          </Button>
          {!savedSomehow && (
            <span className="text-[11px]" style={{ color: "var(--muted)" }}>
              {t.vaultAckLocked}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
