"use client";

import { useEffect, useMemo, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

import {
  PasskeyRequestError,
  deletePasskey,
  getRegisterOptions,
  guessDeviceLabel,
  listPasskeys,
  verifyRegistration,
  type PasskeyCredential,
} from "@/lib/passkeys";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import type { FloussyLocale } from "@/lib/localePreference";

type Copy = {
  title: string;
  description: string;
  add: string;
  unsupported: string;
  empty: string;
  createdAt: string;
  lastUsedAt: string;
  transports: string;
  remove: string;
  removing: string;
  adding: string;
  added: string;
  addFailed: string;
  deleteFailed: string;
  confirmDelete: string;
};

const COPY: Record<FloussyLocale, Copy> = {
  ar: {
    title: "الأمان والدخول السريع",
    description:
      "فعّل الدخول السريع باستعمال Face ID / Touch ID أو بصمة الهاتف. 7sabek ما كيخزنش البصمة ديالك.",
    add: "زيد Passkey",
    unsupported: "هاد المتصفح ما كيدعمش Passkeys فهاد الجهاز.",
    empty: "ما عندك حتى Passkey دابا.",
    createdAt: "تزاد",
    lastUsedAt: "آخر استعمال",
    transports: "طرق الاستعمال",
    remove: "حيد",
    removing: "كيتحيد...",
    adding: "كنزيدو...",
    added: "تزادت Passkey بنجاح.",
    addFailed:
      "ما قدرناش نفعّلو الدخول السريع فهاد الجهاز. تأكد أنك فاتح الموقع من Safari على https://7sabek.ma، وأن iCloud Keychain و Face ID/رمز الهاتف خدامين، وعاود حاول.",
    deleteFailed: "ما قدرناش نحيدو Passkey. عاود حاول.",
    confirmDelete: "واش متأكد بغيتي تحيد هاد Passkey؟",
  },
  fr: {
    title: "Sécurité et connexion rapide",
    description:
      "Active la connexion rapide avec Face ID, Touch ID ou empreinte. 7sabek ne stocke jamais tes données biométriques.",
    add: "Ajouter une passkey",
    unsupported: "Ce navigateur ne prend pas en charge les passkeys sur cet appareil.",
    empty: "Aucune passkey enregistrée.",
    createdAt: "Créée le",
    lastUsedAt: "Dernière utilisation",
    transports: "Transports",
    remove: "Supprimer",
    removing: "Suppression...",
    adding: "Ajout...",
    added: "Passkey ajoutée avec succès.",
    addFailed: "Impossible d'ajouter la passkey. Réessaie.",
    deleteFailed: "Impossible de supprimer la passkey. Réessaie.",
    confirmDelete: "Supprimer cette passkey ?",
  },
  en: {
    title: "Security & quick sign-in",
    description:
      "Enable quick sign-in with Face ID, Touch ID, fingerprint, or device PIN. 7sabek never stores your biometric data.",
    add: "Add passkey",
    unsupported: "This browser does not support passkeys on this device.",
    empty: "No passkeys added yet.",
    createdAt: "Created",
    lastUsedAt: "Last used",
    transports: "Transports",
    remove: "Delete",
    removing: "Deleting...",
    adding: "Adding...",
    added: "Passkey added successfully.",
    addFailed: "Could not add passkey. Try again.",
    deleteFailed: "Could not delete passkey. Try again.",
    confirmDelete: "Delete this passkey?",
  },
};

export function PasskeyManager({
  locale,
  passkeysEnabled,
}: {
  locale: FloussyLocale;
  passkeysEnabled: boolean;
}) {
  const copy = COPY[locale];
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [items, setItems] = useState<PasskeyCredential[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "PublicKeyCredential" in window);
  }, []);

  const loadPasskeys = async () => {
    if (!passkeysEnabled) return;
    const data = await listPasskeys();
    if (!data) {
      setItems([]);
      return;
    }
    setItems(data);
  };

  useEffect(() => {
    if (!passkeysEnabled || !supported) return;
    loadPasskeys().catch(() => null);
  }, [passkeysEnabled, supported]);

  const canUse = passkeysEnabled && supported;
  const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : false;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const href = typeof window !== "undefined" ? window.location.href : "";
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const allowedOrigins = ["https://7sabek.ma", "https://www.7sabek.ma"];
  const isLocalDevOrigin = origin === "http://localhost:3000";
  const isAllowedOrigin =
    allowedOrigins.includes(origin) ||
    (process.env.NODE_ENV !== "production" && isLocalDevOrigin);

  const rows = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        createdAt: new Date(item.created_at).toLocaleString(),
        lastUsedAt: item.last_used_at ? new Date(item.last_used_at).toLocaleString() : "-",
      })),
    [items]
  );

  const handleAdd = async () => {
    setError(null);
    setLoading(true);
    try {
      let registerOptions: Awaited<ReturnType<typeof getRegisterOptions>>;
      try {
        registerOptions = await getRegisterOptions();
        console.info("passkey_register_options_success", {
          hasChallengeId: Boolean(registerOptions?.challenge_id),
          hasOptions: Boolean(registerOptions?.options),
        });
      } catch (error) {
        const status = error instanceof PasskeyRequestError ? error.status : undefined;
        console.error("passkey register/options failed", {
          name: error instanceof Error ? error.name : "Error",
          message: error instanceof Error ? error.message : String(error),
          status,
        });
        throw error;
      }
      if (!registerOptions) {
        setLoading(false);
        return;
      }
      console.info("passkey_start_registration_start", {
        secureContext: isSecureContext,
        origin,
        href,
        userAgent,
        hasPublicKeyCredential: supported,
      });
      if (!isSecureContext) {
        setError(copy.addFailed);
        return;
      }
      if (typeof window !== "undefined" && !isAllowedOrigin) {
        setError(`فتحتي الموقع من: ${origin}. خاصك تفتحو من 7sabek.ma أو www.7sabek.ma مباشرة.`);
        console.error("passkey_origin_check_failed", {
          origin,
          href,
          userAgent,
          secureContext: isSecureContext,
          hasPublicKeyCredential: supported,
        });
        return;
      }
      let credential;
      try {
        credential = await startRegistration({
          optionsJSON: registerOptions.options,
        });
        console.info("passkey_start_registration_success");
      } catch (error) {
        const errName = error instanceof Error ? error.name : "Error";
        const errMessage = error instanceof Error ? error.message : String(error);
        const ctorName =
          typeof error === "object" &&
          error !== null &&
          "constructor" in error &&
          (error as { constructor?: { name?: string } }).constructor?.name
            ? (error as { constructor: { name: string } }).constructor.name
            : "UnknownConstructor";
        console.error("passkey_start_registration_error", {
          name: errName,
          message: errMessage,
          constructorName: ctorName,
          origin,
          href,
          userAgent,
          secureContext: isSecureContext,
          hasPublicKeyCredential: supported,
        });
        if (errName === "NotAllowedError") {
          setError("العملية تلغات أو Safari ما قدرش يكمل إنشاء Passkey. عاود حاول.");
        } else if (errName === "InvalidStateError") {
          setError("هاد Passkey ممكن راه موجودة من قبل فهاد الجهاز.");
        } else if (errName === "SecurityError") {
          setError(`فتحتي الموقع من: ${origin}. خاصك تفتحو من 7sabek.ma أو www.7sabek.ma مباشرة.`);
        } else {
          setError(copy.addFailed);
        }
        console.error("passkey startRegistration failed", {
          name: error instanceof Error ? error.name : "Error",
          message: error instanceof Error ? error.message : String(error),
          status: undefined,
        });
        throw error;
      }
      const challenge = String(registerOptions.options.challenge ?? "");
      console.info("passkey_register_verify_start");
      try {
        await verifyRegistration({
          challenge_id: registerOptions.challenge_id,
          challenge,
          credential,
          name: guessDeviceLabel(),
        });
        console.info("passkey_register_verify_success");
      } catch (error) {
        const status = error instanceof PasskeyRequestError ? error.status : undefined;
        console.error("passkey_register_verify_error", {
          name: error instanceof Error ? error.name : "Error",
          message: error instanceof Error ? error.message : String(error),
          status,
          body: error instanceof PasskeyRequestError ? error.debugBody : undefined,
        });
        if (error instanceof PasskeyRequestError && error.status === 422) {
          console.error("passkey_register_verify_422_body", error.debugBody);
        }
        console.error("passkey register/verify failed", {
          name: error instanceof Error ? error.name : "Error",
          message: error instanceof Error ? error.message : String(error),
          status,
        });
        throw error;
      }
      await loadPasskeys();
    } catch (error) {
      if (error instanceof Error && ["NotAllowedError", "InvalidStateError", "SecurityError"].includes(error.name)) {
        return;
      }
      if (error instanceof PasskeyRequestError && [400, 409, 422].includes(error.status ?? 0)) {
        setError(copy.addFailed);
        return;
      }
      setError(copy.addFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(copy.confirmDelete)) return;
    setError(null);
    setDeletingId(id);
    try {
      await deletePasskey(id);
      await loadPasskeys();
    } catch {
      setError(copy.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  if (!passkeysEnabled) return null;

  return (
    <Section title={copy.title} subtitle={copy.description}>
      <div className="grid gap-3">
        {!supported ? (
          <p className="text-sm text-[var(--muted)]">{copy.unsupported}</p>
        ) : null}
        {error ? (
          <p className="rounded-2xl border border-[var(--error)]/20 bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]">
            {error}
          </p>
        ) : null}
        {canUse ? (
          <div className="flex items-center gap-2">
            <Button type="button" onClick={handleAdd} disabled={loading}>
              {loading ? copy.adding : copy.add}
            </Button>
          </div>
        ) : null}

        {canUse && rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{copy.empty}</p>
        ) : null}

        {canUse && rows.length > 0 ? (
          <div className="grid gap-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1 text-sm">
                    <p className="font-semibold text-[var(--ink)]">{row.name || row.credential_id_masked}</p>
                    <p className="text-[var(--muted)]">{copy.createdAt}: {row.createdAt}</p>
                    <p className="text-[var(--muted)]">{copy.lastUsedAt}: {row.lastUsedAt}</p>
                    {row.transports?.length ? (
                      <p className="text-[var(--muted)]">{copy.transports}: {row.transports.join(", ")}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleDelete(row.id)}
                    disabled={deletingId === row.id}
                  >
                    {deletingId === row.id ? copy.removing : copy.remove}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
}
