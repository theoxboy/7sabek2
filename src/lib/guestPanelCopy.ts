/**
 * Wording for the guest account panel: the protection gauge (40 / 70 / 100),
 * the recovery code, "erase my data", and the "what is discovery mode" explainer.
 * Trilingual, and it always says the app is free.
 */

import type { FloussyLocale } from "@/lib/localePreference";

export type ProtectionStep = { level: 40 | 70 | 100; name: string; desc: string };

export type GuestPanelCopy = {
  panelTitle: string;
  panelIntro: string;
  gaugeLabel: string;
  steps: ProtectionStep[];

  recoveryTitle: string;
  recoveryIntro: string;
  reveal: string;
  copy: string;
  copied: string;
  saveImage: string;
  ackButton: string;
  acked: string;

  claimCta: string;
  claimNote: string;

  eraseTitle: string;
  eraseIntro: string;
  eraseButton: string;
  eraseConfirmTitle: string;
  eraseConfirmBody: string;
  eraseConfirm: string;
  eraseCancel: string;

  explainTitle: string;
  explainBody: string[];
  explainClose: string;
  chipLabel: string;
};

export const GUEST_PANEL_COPY: Record<FloussyLocale, GuestPanelCopy> = {
  fr: {
    panelTitle: "Mode Découverte — ton budget",
    panelIntro:
      "Tu utilises 7sabek sans compte. Tout ce que tu saisis est gardé sur le serveur. 7sabek est 100% gratuit, pour toujours.",
    gaugeLabel: "Protection de ton budget",
    steps: [
      { level: 40, name: "Sur cet appareil", desc: "Tes données vivent ici. Si tu effaces ton navigateur, elles partent." },
      { level: 70, name: "Code de reprise noté", desc: "Tu peux les récupérer ailleurs — à condition d’avoir gardé ton code." },
      { level: 100, name: "Budget protégé", desc: "Sauvegardé, récupérable, sur tous tes appareils. Plus rien à faire." },
    ],
    recoveryTitle: "Mon code de reprise",
    recoveryIntro:
      "Note ce code. Il ramène ton budget sur n’importe quel appareil, sans e-mail. Garde-le en lieu sûr.",
    reveal: "Afficher mon code",
    copy: "Copier",
    copied: "Copié !",
    saveImage: "Enregistrer en image",
    ackButton: "J’ai noté mon code",
    acked: "Code noté ✓ — protection à 70%",
    claimCta: "Créer mon compte gratuit",
    claimNote: "Aucun paiement, jamais. Tes données déjà là sont gardées.",
    eraseTitle: "Effacer mes données",
    eraseIntro:
      "Supprime immédiatement et totalement ton budget de découverte. Aucune conservation cachée.",
    eraseButton: "Effacer mes données",
    eraseConfirmTitle: "Effacer tout ?",
    eraseConfirmBody:
      "Tes enveloppes, tes dépenses et ton code de reprise seront supprimés définitivement, tout de suite.",
    eraseConfirm: "Oui, tout effacer",
    eraseCancel: "Annuler",
    explainTitle: "C’est quoi le Mode Découverte ?",
    explainBody: [
      "Tu essaies 7sabek sans créer de compte : pas d’e-mail, pas de mot de passe, pas de questionnaire.",
      "Tout ce que tu saisis — enveloppes, dépenses, budget — est bien gardé. Tu peux revenir dans une semaine et tout retrouver.",
      "Certaines fonctionnalités (rapports, objectifs, historique, sauvegarde multi-appareil) demandent un compte. Le créer prend 10 secondes et garde tout ce que tu as fait.",
      "7sabek est et restera 100% gratuit. Personne ne paie rien, jamais.",
    ],
    explainClose: "Compris",
    chipLabel: "Mode Découverte",
  },
  en: {
    panelTitle: "Discovery mode — your budget",
    panelIntro:
      "You’re using 7sabek without an account. Everything you enter is kept on the server. 7sabek is 100% free, forever.",
    gaugeLabel: "Your budget’s protection",
    steps: [
      { level: 40, name: "On this device", desc: "Your data lives here. Clear your browser and it’s gone." },
      { level: 70, name: "Recovery code saved", desc: "You can get it back elsewhere — if you kept your code." },
      { level: 100, name: "Budget protected", desc: "Backed up, recoverable, on every device. Nothing left to do." },
    ],
    recoveryTitle: "My recovery code",
    recoveryIntro:
      "Write this code down. It brings your budget back on any device, no email. Keep it somewhere safe.",
    reveal: "Show my code",
    copy: "Copy",
    copied: "Copied!",
    saveImage: "Save as image",
    ackButton: "I saved my code",
    acked: "Code saved ✓ — protection at 70%",
    claimCta: "Create my free account",
    claimNote: "No payment, ever. The data you already added is kept.",
    eraseTitle: "Erase my data",
    eraseIntro:
      "Immediately and completely delete your discovery budget. No hidden retention.",
    eraseButton: "Erase my data",
    eraseConfirmTitle: "Erase everything?",
    eraseConfirmBody:
      "Your envelopes, expenses and recovery code will be permanently deleted, right now.",
    eraseConfirm: "Yes, erase everything",
    eraseCancel: "Cancel",
    explainTitle: "What is discovery mode?",
    explainBody: [
      "You’re trying 7sabek without creating an account: no email, no password, no questionnaire.",
      "Everything you enter — envelopes, expenses, budget — is kept. Come back in a week and it’s all there.",
      "Some features (reports, goals, history, multi-device backup) need an account. Creating one takes 10 seconds and keeps everything you’ve done.",
      "7sabek is and always will be 100% free. Nobody pays anything, ever.",
    ],
    explainClose: "Got it",
    chipLabel: "Discovery mode",
  },
  ar: {
    panelTitle: "وضع الاكتشاف — الميزانية ديالك",
    panelIntro:
      "كتستعمل 7sabek بلا حساب. كولشي اللي كتدخل كيتحفظ فالسيرفر. 7sabek مجاني 100% وديما.",
    gaugeLabel: "حماية الميزانية ديالك",
    steps: [
      { level: 40, name: "ف هاد التيليفون", desc: "البيانات ديالك هنا. إلا مسحتي المتصفح، غادي تمشي." },
      { level: 70, name: "الكود ديال الاسترجاع مسجّل", desc: "تقدر ترجّعها ف بلاصة أخرى — إلا حفظتي الكود ديالك." },
      { level: 100, name: "الميزانية محمية", desc: "محفوظة، قابلة للاسترجاع، ف كل التيليفونات. ما بقا والو." },
    ],
    recoveryTitle: "الكود ديال الاسترجاع",
    recoveryIntro:
      "سجّل هاد الكود. كيرجّع ليك الميزانية ف أي تيليفون، بلا إيميل. خبّيه ف بلاصة مأمونة.",
    reveal: "وري ليا الكود",
    copy: "نسخ",
    copied: "تنسخ!",
    saveImage: "حفظ كصورة",
    ackButton: "سجّلت الكود ديالي",
    acked: "الكود مسجّل ✓ — الحماية ف 70%",
    claimCta: "صاوب حسابي المجاني",
    claimNote: "بلا خلاص، أبداً. البيانات اللي دخلتي كتبقى.",
    eraseTitle: "مسح البيانات ديالي",
    eraseIntro:
      "مسح الميزانية ديال الاكتشاف دغيا وكاملة. بلا أي احتفاظ مخبّي.",
    eraseButton: "مسح البيانات ديالي",
    eraseConfirmTitle: "نمسحو كولشي؟",
    eraseConfirmBody:
      "المغلفات، المصاريف والكود ديال الاسترجاع غادي يتمسحو نهائياً، دابا.",
    eraseConfirm: "أيه، مسح كولشي",
    eraseCancel: "إلغاء",
    explainTitle: "شنو هو وضع الاكتشاف؟",
    explainBody: [
      "كتجرّب 7sabek بلا ما تصاوب حساب: بلا إيميل، بلا كلمة السر، بلا أسئلة.",
      "كولشي اللي كتدخل — المغلفات، المصاريف، الميزانية — كيتحفظ. ترجع من بعد سيمانة وتلقى كولشي.",
      "شي خصائص (التقارير، الأهداف، التاريخ، الحفظ ف بزّاف ديال التيليفونات) كتطلب حساب. تصاوبو كياخد 10 ثواني وكيحفظ كولشي اللي درتي.",
      "7sabek مجاني 100% وغادي يبقى هكاك. حتى واحد ما كيخلص والو، أبداً.",
    ],
    explainClose: "فهمت",
    chipLabel: "وضع الاكتشاف",
  },
};

/** The protection figure from the raw fields (mirrors the backend). */
export function protectionLevelOf(user: {
  is_guest?: boolean;
  claimed_at?: string | null;
  recovery_code_ack?: boolean;
  protection_level?: number | null;
}): 40 | 70 | 100 {
  if (typeof user.protection_level === "number") {
    if (user.protection_level >= 100) return 100;
    if (user.protection_level >= 70) return 70;
    return 40;
  }
  if (!user.is_guest || user.claimed_at) return 100;
  if (user.recovery_code_ack) return 70;
  return 40;
}
