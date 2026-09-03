"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

import type { FloussyLocale } from "@/lib/localePreference";
import { checkL2Hint } from "@/lib/guestSession";
import { recoverGuest } from "@/lib/guestAnchorApi";
import { resetAuthClientState } from "@/lib/api";
import { markAuthSessionHint } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const COPY: Record<
  FloussyLocale,
  {
    title: string;
    body: string;
    label: string;
    placeholder: string;
    submit: string;
    working: string;
    notFound: string;
    generic: string;
    dismiss: string;
  }
> = {
  fr: {
    title: "Un budget existe peut-être sur cet appareil",
    body: "Si tu as déjà utilisé 7sabek ici sans compte, saisis ton code de reprise pour tout retrouver. 7sabek est gratuit.",
    label: "Code de reprise",
    placeholder: "K7M2-9XQP",
    submit: "Récupérer mon budget",
    working: "Vérification…",
    notFound: "Code inconnu. Vérifie et réessaie.",
    generic: "Impossible de récupérer. Réessaie.",
    dismiss: "Ce n’est pas moi",
  },
  en: {
    title: "A budget might live on this device",
    body: "If you used 7sabek here before without an account, enter your recovery code to get it all back. 7sabek is free.",
    label: "Recovery code",
    placeholder: "K7M2-9XQP",
    submit: "Recover my budget",
    working: "Checking…",
    notFound: "Unknown code. Check it and try again.",
    generic: "Could not recover. Try again.",
    dismiss: "That’s not me",
  },
  ar: {
    title: "يمكن كاينة ميزانية ف هاد التيليفون",
    body: "إلا استعملتي 7sabek هنا من قبل بلا حساب، دخّل الكود ديال الاسترجاع باش ترجّع كولشي. 7sabek مجاني.",
    label: "كود الاسترجاع",
    placeholder: "K7M2-9XQP",
    submit: "رجّع الميزانية ديالي",
    working: "كنتحقّقو…",
    notFound: "كود ماشي معروف. تأكد وعاود.",
    generic: "ما قدرناش نرجّعو. عاود.",
    dismiss: "ماشي أنا",
  },
};

/**
 * Shown on /login when L2 says a guest budget might live on this device.
 * It never restores on its own — the recovery code is the only key.
 */
export function GuestRecoveryPrompt({
  locale,
  dir,
}: {
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
}) {
  const router = useRouter();
  const t = COPY[locale] ?? COPY.fr;
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkL2Hint()
      .then((hit) => {
        if (!cancelled && hit) setVisible(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      resetAuthClientState();
      await recoverGuest(code.trim());
      markAuthSessionHint();
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      setError(msg.includes("not_found") || msg.includes("404") ? t.notFound : t.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir={dir}
      className="mb-4 flex flex-col gap-2 rounded-2xl border p-4"
      style={{ borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--ink)" }}
    >
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4" style={{ color: "var(--accent-strong)" }} aria-hidden />
        <span className="text-sm font-bold">{t.title}</span>
      </div>
      <p className="text-[12.5px] leading-snug" style={{ color: "var(--muted)" }}>
        {t.body}
      </p>
      <form
        className="mt-1 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          aria-label={t.label}
          placeholder={t.placeholder}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1"
          style={{ direction: "ltr", textTransform: "uppercase" }}
        />
        <Button type="submit" isLoading={loading} className="whitespace-nowrap">
          {loading ? t.working : t.submit}
        </Button>
      </form>
      {error && (
        <p className="text-xs font-semibold" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="self-start text-[11px] underline"
        style={{ color: "var(--muted)" }}
      >
        {t.dismiss}
      </button>
    </div>
  );
}
