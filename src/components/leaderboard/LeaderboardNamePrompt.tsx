"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import type { FloussyLocale } from "@/lib/localePreference";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

const SEEN_AT_KEY = "7sabek.leaderboard_prompt_seen_at";
/** Once dismissed, leave the person alone for this long before nudging again. */
const RENUDGE_AFTER_MS = 7 * 86_400_000;

const NAME_MIN = 3;
const NAME_MAX = 20;
// Letters (any script — the app is Moroccan darija first), digits, space, . _ -
const NAME_RE = /^[\p{L}\p{N} _.\-]{3,20}$/u;

export function markLeaderboardPromptSeen(): void {
  try {
    window.localStorage.setItem(SEEN_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Whether the "pick a leaderboard name" nudge is due (no name yet, not recently dismissed). */
export function shouldNudgeLeaderboardName(user: {
  leaderboard_name?: string | null;
  is_guest?: boolean | null;
  role?: string | null;
}): boolean {
  if (!user || user.is_guest || user.role !== "user") return false;
  if (user.leaderboard_name) return false;
  let seenAt = 0;
  try {
    seenAt = Number(window.localStorage.getItem(SEEN_AT_KEY)) || 0;
  } catch {
    seenAt = 0;
  }
  return Date.now() - seenAt > RENUDGE_AFTER_MS;
}

type Copy = {
  title: string;
  description: string;
  optIn: string;
  label: string;
  placeholder: string;
  abuseNote: string;
  laterHint: string;
  save: string;
  later: string;
  errRequired: string;
  errFormat: string;
  errChangeLimit: string;
  errBlocked: string;
  errCharsInvalid: string;
  errGeneric: string;
};

const COPY: Record<FloussyLocale, Copy> = {
  fr: {
    title: "Rejoins le classement 7sabek",
    description:
      "Compare ta régularité avec les autres. Ton pseudo est public — tu peux le changer 2 fois par mois.",
    optIn: "Choisis un pseudo pour apparaître au classement.",
    label: "Ton pseudo",
    placeholder: "Ex : Hsab_Nadi",
    abuseNote: "Les pseudos offensants sont filtrés automatiquement.",
    laterHint: "Tu pourras aussi le faire plus tard dans Réglages.",
    save: "Enregistrer",
    later: "Plus tard",
    errRequired: "Choisis un pseudo pour continuer.",
    errFormat: `${NAME_MIN} à ${NAME_MAX} caractères : lettres, chiffres, espace, . _ -`,
    errChangeLimit: "Limite atteinte : 2 changements de pseudo par mois.",
    errBlocked: "Ce pseudo n’est pas autorisé. Choisis-en un autre.",
    errCharsInvalid: "Ce pseudo contient des caractères non autorisés.",
    errGeneric: "Impossible d’enregistrer. Réessaie.",
  },
  en: {
    title: "Join the 7sabek leaderboard",
    description:
      "Compare your consistency with others. Your nickname is public — you can change it twice a month.",
    optIn: "Pick a nickname to appear on the leaderboard.",
    label: "Your nickname",
    placeholder: "e.g. Hsab_Nadi",
    abuseNote: "Offensive nicknames are filtered automatically.",
    laterHint: "You can also do this later in Settings.",
    save: "Save",
    later: "Later",
    errRequired: "Pick a nickname to continue.",
    errFormat: `${NAME_MIN} to ${NAME_MAX} characters: letters, digits, space, . _ -`,
    errChangeLimit: "Limit reached: 2 nickname changes per month.",
    errBlocked: "This nickname isn’t allowed. Please choose another.",
    errCharsInvalid: "This nickname has characters that aren’t allowed.",
    errGeneric: "Couldn’t save. Try again.",
  },
  ar: {
    title: "انضم للترتيب ديال 7sabek",
    description:
      "قارن الانتظام ديالك مع ناس آخرين. الاسم ديالك كيبان للناس — تقدر تبدلو جوج مرات فالشهر.",
    optIn: "اختار اسم باش تبان فالترتيب.",
    label: "الاسم ديالك",
    placeholder: "مثال: Hsab_Nadi",
    abuseNote: "الأسماء المسيئة كيتفلترو أوتوماتيكيا.",
    laterHint: "تقدر ديرها من بعد فـ الإعدادات.",
    save: "سجّل",
    later: "من بعد",
    errRequired: "اختار اسم باش تكمل.",
    errFormat: `من ${NAME_MIN} حتى ${NAME_MAX} حرف: حروف، أرقام، مسافة، . _ -`,
    errChangeLimit: "وصلتي للحد: جوج تبديلات ديال الاسم فالشهر.",
    errBlocked: "هاد الاسم ماشي مسموح. اختار واحد آخر.",
    errCharsInvalid: "هاد الاسم فيه حروف ما مسموحينش.",
    errGeneric: "ما قدرناش نسجلو. عاود.",
  },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: FloussyLocale;
  dir: "rtl" | "ltr";
  onSaved: (user: AuthUser) => void;
};

export function LeaderboardNamePrompt({
  open,
  onOpenChange,
  locale,
  dir,
  onSaved,
}: Props) {
  const t = COPY[locale] ?? COPY.fr;
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
      const id = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const trimmed = name.trim();
  const valid = NAME_RE.test(trimmed);

  const dismiss = () => {
    markLeaderboardPromptSeen();
    onOpenChange(false);
  };

  const save = async () => {
    if (!trimmed) {
      setError(t.errRequired);
      return;
    }
    if (!valid) {
      setError(t.errFormat);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<AuthUser>("/users/me/profile", {
        method: "PATCH",
        body: { leaderboard_name: trimmed },
      });
      markLeaderboardPromptSeen();
      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      const raw = (err instanceof Error ? err.message : "").toUpperCase();
      if (raw.includes("PSEUDO_CHANGE_LIMIT")) setError(t.errChangeLimit);
      else if (raw.includes("PSEUDO_BLOCKED_FOR_ABUSE")) setError(t.errBlocked);
      else if (raw.includes("PSEUDO_CHARS_INVALID")) setError(t.errCharsInvalid);
      else setError(t.errGeneric);
    } finally {
      setSaving(false);
    }
  };

  const counterTone = useMemo(() => {
    if (trimmed.length === 0) return "var(--muted)";
    return valid ? "var(--success)" : "var(--error)";
  }, [trimmed.length, valid]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
        else onOpenChange(true);
      }}
    >
      <DialogContent dir={dir} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-2">
          <label
            htmlFor="leaderboard-name"
            className="flex items-center justify-between text-sm font-semibold text-[var(--ink)]"
          >
            <span>{t.label}</span>
            <span className="text-xs font-normal tabular-nums" style={{ color: counterTone }}>
              {trimmed.length}/{NAME_MAX}
            </span>
          </label>
          <Input
            id="leaderboard-name"
            ref={inputRef}
            dir="ltr"
            value={name}
            onChange={(event) => {
              setName(event.target.value.slice(0, NAME_MAX));
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && valid && !saving) {
                event.preventDefault();
                void save();
              }
            }}
            placeholder={t.placeholder}
            maxLength={NAME_MAX}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby="leaderboard-name-help"
            className="text-start"
            style={
              error
                ? { borderColor: "var(--error)" }
                : valid
                  ? { borderColor: "var(--success)" }
                  : undefined
            }
          />
          <p id="leaderboard-name-help" className="text-xs text-[var(--muted)]">
            {t.abuseNote}
          </p>
          {error ? (
            <p role="alert" className="text-xs font-semibold text-[var(--error)]">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-[var(--muted)]">{t.laterHint}</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={dismiss} disabled={saving}>
              {t.later}
            </Button>
            <Button
              type="button"
              onClick={() => void save()}
              isLoading={saving}
              disabled={!valid || saving}
            >
              {t.save}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
