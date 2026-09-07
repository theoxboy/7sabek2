/**
 * Wording for the guest account panel: the protection gauge (40 / 70 / 100),
 * the recovery code, "erase my data", and the "what is discovery mode" explainer.
 * Trilingual, and it always says the app is free.
 */

import type { FloussyLocale } from "@/lib/localePreference";
import { clampProtectionLevel, resolveProtectionLevel } from "@/lib/guestQuota";

export type ProtectionStep = { level: 40 | 70 | 100; name: string; desc: string };

export type GuestPanelCopy = {
  panelTitle: string;
  panelIntro: string;
  gaugeLabel: string;
  steps: ProtectionStep[];

  recoveryTitle: string;
  recoveryIntro: string;
  /** Palier 5 — shown when the browser actively purges local storage (Safari iOS, not installed). */
  fragileWarning: string;
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
  /** Shown when the server deletion fails — the local anchor is kept, nothing is lost. */
  eraseFailed: string;

  explainTitle: string;
  explainBody: string[];
  explainClose: string;
  chipLabel: string;
  /** The full-page discovery welcome shown before the dashboard. */
  welcomeTitle: string;
  welcomeContinue: string;
  welcomeSkip: string;
  welcomeNext: string;
  welcomeBack: string;
  /** Step 2 heading — "your budget's protection" already exists as gaugeLabel. */
  welcomeProtectionTitle: string;
  /** Fallback when no recovery code is held locally (rare). */
  welcomeNoCode: string;

  // ── "never lose your code" vault ──────────────────────────────────────────
  vaultDownload: string;
  vaultDownloaded: string;
  vaultShare: string;
  vaultQrHint: string;
  vaultAckLocked: string;
  vaultImageHeading: string;
  vaultImageHint: string;
  /** Passkey — the "nothing to remember" path. */
  vaultPasskeyCta: string;
  vaultPasskeyHint: string;
  vaultPasskeyWorking: string;
  vaultPasskeyFailed: string;
  vaultOrCode: string;
  /** Email the code to yourself. */
  vaultEmailToggle: string;
  vaultEmailPlaceholder: string;
  vaultEmailSend: string;
  vaultEmailSent: string;
  vaultEmailError: string;
  /** Tier 3 — persistent header pill + the "still not saved" nudge. */
  pill: (level: number) => string;
  nudgeTitle: string;
  nudgeBody: string;

  /** Shown once the guest has been tracking for a few days — a real, personal nudge. */
  trackingDays: (days: number) => string;
  /** Palier 3 — the guest's own numbers. */
  paliers: (dh: number, days: number, envelopes: number) => string;
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
    fragileWarning: "Ton navigateur (Safari) efface les données de l\u2019app après 7 jours sans visite. Note ton code de reprise maintenant, ou ajoute 7sabek à ton écran d\u2019accueil.",
    recoveryIntro:
      "Note ce code ailleurs que dans ce navigateur (papier, notes du téléphone). Il ramène ton budget sur n’importe quel appareil, sans e-mail. Sans lui, on ne peut rien récupérer.",
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
    eraseFailed: "L’effacement n’a pas pu se faire. Rien n’a été supprimé — réessaie dans un moment.",
    explainTitle: "C’est quoi le Mode Découverte ?",
    explainBody: [
      "Tu essaies 7sabek sans créer de compte : pas d’e-mail, pas de mot de passe, pas de questionnaire.",
      "Tout ce que tu saisis — enveloppes, dépenses, budget — est bien gardé. Tu peux revenir dans une semaine et tout retrouver.",
      "Certaines fonctionnalités (rapports, objectifs, historique, sauvegarde multi-appareil) demandent un compte. Le créer prend 10 secondes et garde tout ce que tu as fait.",
      "7sabek est et restera 100% gratuit. Personne ne paie rien, jamais.",
    ],
    explainClose: "Compris",
    chipLabel: "Mode Découverte",
    welcomeTitle: "Bienvenue en Mode Découverte",
    welcomeContinue: "Continuer vers mon budget",
    welcomeSkip: "Passer",
    welcomeNext: "Suivant",
    welcomeBack: "Précédent",
    welcomeProtectionTitle: "La protection de ton budget",
    welcomeNoCode: "Ton code de reprise ne peut plus être affiché sur cet appareil. Sécurise ton budget avec Face ID ou en créant ton compte gratuit — c’est la seule façon de le retrouver ailleurs.",
    vaultDownload: "Enregistrer l’image",
    vaultDownloaded: "Image enregistrée ✓",
    vaultShare: "Partager",
    vaultQrHint: "Scanne ce QR depuis un autre téléphone pour retrouver ton budget.",
    vaultAckLocked: "Copie, enregistre ou partage ton code d’abord.",
    vaultImageHeading: "Ton code de reprise 7sabek",
    vaultImageHint: "Garde cette image. Elle ramène ton budget sur n’importe quel appareil, sans e-mail.",
    vaultPasskeyCta: "Sécuriser avec Face ID / empreinte",
    vaultPasskeyHint: "Le plus sûr : rien à noter, ton téléphone s’en souvient.",
    vaultPasskeyWorking: "Validation…",
    vaultPasskeyFailed: "La validation a échoué. Utilise le code de reprise.",
    vaultOrCode: "ou garder un code de reprise",
    vaultEmailToggle: "Me l’envoyer par e-mail",
    vaultEmailPlaceholder: "ton@email.com",
    vaultEmailSend: "Envoyer",
    vaultEmailSent: "C’est parti ✓ — si l’adresse est bonne, tu vas recevoir le code.",
    vaultEmailError: "Envoi impossible. Réessaie.",
    pill: (n) => `Protection ${n}%`,
    nudgeTitle: "Ton budget n’est protégé que sur cet appareil",
    nudgeBody: "Tu suis 7sabek depuis quelques jours sans avoir noté ton code de reprise. Prends 10 secondes maintenant — après, un navigateur effacé = tout perdu.",
    trackingDays: (d) => `Tu suis ton budget depuis ${d} jour${d > 1 ? "s" : ""}. Garde tout, même si tu changes de téléphone — crée ton compte gratuit.`,
    paliers: (dh, days, e) => `Tu as suivi ${dh.toLocaleString("fr-FR")} DH ${days > 0 ? `sur ${days} jour${days > 1 ? "s" : ""}` : "aujourd\u2019hui"}, dans ${e} enveloppe${e > 1 ? "s" : ""}. Garde tout — 10 secondes, c'est gratuit.`,
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
    fragileWarning: "Your browser (Safari) wipes the app\u2019s data after 7 days without a visit. Save your recovery code now, or add 7sabek to your home screen.",
    recoveryIntro:
      "Write this code down somewhere other than this browser (paper, phone notes). It brings your budget back on any device, no email. Without it, nothing can be recovered.",
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
    eraseFailed: "Couldn’t erase your data. Nothing was deleted — try again in a moment.",
    explainTitle: "What is discovery mode?",
    explainBody: [
      "You’re trying 7sabek without creating an account: no email, no password, no questionnaire.",
      "Everything you enter — envelopes, expenses, budget — is kept. Come back in a week and it’s all there.",
      "Some features (reports, goals, history, multi-device backup) need an account. Creating one takes 10 seconds and keeps everything you’ve done.",
      "7sabek is and always will be 100% free. Nobody pays anything, ever.",
    ],
    explainClose: "Got it",
    chipLabel: "Discovery mode",
    welcomeTitle: "Welcome to Discovery mode",
    welcomeContinue: "Continue to my budget",
    welcomeSkip: "Skip",
    welcomeNext: "Next",
    welcomeBack: "Back",
    welcomeProtectionTitle: "Your budget’s protection",
    welcomeNoCode: "Your recovery code can no longer be shown on this device. Secure your budget with Face ID or by creating your free account — that’s the only way to get it back elsewhere.",
    vaultDownload: "Save the image",
    vaultDownloaded: "Image saved \u2713",
    vaultShare: "Share",
    vaultQrHint: "Scan this QR from another phone to get your budget back.",
    vaultAckLocked: "Copy, save or share your code first.",
    vaultImageHeading: "Your 7sabek recovery code",
    vaultImageHint: "Keep this image. It brings your budget back on any device, no email.",
    vaultPasskeyCta: "Secure with Face ID / fingerprint",
    vaultPasskeyHint: "Safest: nothing to write down, your phone remembers it.",
    vaultPasskeyWorking: "Verifying\u2026",
    vaultPasskeyFailed: "Verification failed. Use the recovery code.",
    vaultOrCode: "or keep a recovery code",
    vaultEmailToggle: "Email it to me",
    vaultEmailPlaceholder: "you@email.com",
    vaultEmailSend: "Send",
    vaultEmailSent: "Done \u2713 \u2014 if the address is valid, the code is on its way.",
    vaultEmailError: "Couldn\u2019t send. Try again.",
    pill: (n) => `Protection ${n}%`,
    nudgeTitle: "Your budget is only safe on this device",
    nudgeBody: "You\u2019ve been using 7sabek for a few days without saving your recovery code. Take 10 seconds now \u2014 after that, a cleared browser means it\u2019s all gone.",
    trackingDays: (d) => `You\u2019ve been tracking your budget for ${d} day${d > 1 ? "s" : ""}. Keep all of it, even if you switch phones \u2014 create your free account.`,
    paliers: (dh, days, e) => `You\u2019ve tracked ${dh.toLocaleString("en-US")} DH ${days > 0 ? `over ${days} day${days > 1 ? "s" : ""}` : "today"}, across ${e} envelope${e > 1 ? "s" : ""}. Keep all of it \u2014 10 seconds, it\u2019s free.`,
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
    fragileWarning: "المتصفح ديالك (Safari) كيمسح بيانات التطبيق بعد 7 أيام بلا زيارة. سجّل كود الاسترجاع دابا، ولا زيد 7sabek لشاشة البداية ديالك.",
    recoveryIntro:
      "سجّل هاد الكود ف بلاصة أخرى ماشي ف هاد المتصفح (ورقة، نوط ف التيليفون). كيرجّع ليك الميزانية ف أي تيليفون، بلا إيميل. بلاه ما يمكن نرجّعو والو.",
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
    eraseFailed: "ما تقدرش يتمسح. حتى حاجة ما تمسحات — عاود من بعد شوية.",
    explainTitle: "شنو هو وضع الاكتشاف؟",
    explainBody: [
      "كتجرّب 7sabek بلا ما تصاوب حساب: بلا إيميل، بلا كلمة السر، بلا أسئلة.",
      "كولشي اللي كتدخل — المغلفات، المصاريف، الميزانية — كيتحفظ. ترجع من بعد سيمانة وتلقى كولشي.",
      "شي خصائص (التقارير، الأهداف، التاريخ، الحفظ ف بزّاف ديال التيليفونات) كتطلب حساب. تصاوبو كياخد 10 ثواني وكيحفظ كولشي اللي درتي.",
      "7sabek مجاني 100% وغادي يبقى هكاك. حتى واحد ما كيخلص والو، أبداً.",
    ],
    explainClose: "فهمت",
    chipLabel: "وضع الاكتشاف",
    welcomeTitle: "مرحبا بيك ف وضع الاكتشاف",
    welcomeContinue: "كمّل للميزانية ديالي",
    welcomeSkip: "تجاوز",
    welcomeNext: "التالي",
    welcomeBack: "رجوع",
    welcomeProtectionTitle: "حماية الميزانية ديالك",
    welcomeNoCode: "كود الاسترجاع ما بقاش يمكن يتورى ف هاد التيليفون. أمّن الميزانية ديالك بـ Face ID ولا بصواب حسابك المجاني — هادي هي الطريقة الوحيدة باش ترجّعو.",
    vaultDownload: "حفظ الصورة",
    vaultDownloaded: "تحفظات الصورة ✓",
    vaultShare: "مشاركة",
    vaultQrHint: "سكاني هاد الـ QR من تيليفون آخر باش ترجّع الميزانية ديالك.",
    vaultAckLocked: "نسخ، حفظ ولا شارك الكود ديالك الأول.",
    vaultImageHeading: "كود الاسترجاع ديالك ف 7sabek",
    vaultImageHint: "خبّي هاد الصورة. كترجّع ليك الميزانية ف أي تيليفون، بلا إيميل.",
    vaultPasskeyCta: "أمّن بـ Face ID / البصمة",
    vaultPasskeyHint: "الأكثر أماناً: بلا ما تسجّل والو، التيليفون كيتفكّر.",
    vaultPasskeyWorking: "كنتحققو…",
    vaultPasskeyFailed: "التحقق ما نجحش. استعمل كود الاسترجاع.",
    vaultOrCode: "ولا خبّي كود الاسترجاع",
    vaultEmailToggle: "صيفطو ليا فالإيميل",
    vaultEmailPlaceholder: "الإيميل ديالك",
    vaultEmailSend: "صيفط",
    vaultEmailSent: "تصيفط ✓ — إلا كان الإيميل صحيح، غادي يوصلك الكود.",
    vaultEmailError: "ما تصيفطش. عاود.",
    pill: (n) => `الحماية ${n}%`,
    nudgeTitle: "الميزانية ديالك محمية غير ف هاد التيليفون",
    nudgeBody: "كتستعمل 7sabek من شي أيام بلا ما تسجّل كود الاسترجاع ديالك. خود 10 ثواني دابا — من بعد، متصفح ممسوح = كولشي طار.",
    trackingDays: (d) => `كتتبّع الميزانية ديالك من ${d} ${d > 1 ? "أيام" : "يوم"}. خلّي كولشي محفوظ حتى إلا بدّلتي التيليفون — صاوب حسابك المجاني.`,
    paliers: (dh, days, e) => `تبّعتي ${dh.toLocaleString("ar-MA")} درهم ${days > 0 ? `ف ${days} ${days > 1 ? "أيام" : "يوم"}` : "اليوم"}، ف ${e} ${e > 1 ? "مغلفات" : "مغلف"}. خلّي كولشي — 10 ثواني، مجاني.`,
  },
};

/**
 * The protection figure from the raw fields (mirrors the backend).
 *
 * The backend `protection_level` wins when present; otherwise we derive it from
 * the durability state. Both paths funnel through `guestQuota` so there is a
 * single definition of the 40 / 70 / 100 rule.
 */
export function protectionLevelOf(user: {
  is_guest?: boolean;
  claimed_at?: string | null;
  recovery_code_ack?: boolean;
  protection_level?: number | null;
}): 40 | 70 | 100 {
  if (typeof user.protection_level === "number") {
    return clampProtectionLevel(user.protection_level);
  }
  return resolveProtectionLevel({
    hasAccount: !user.is_guest || Boolean(user.claimed_at),
    hasRecoveryCode: Boolean(user.recovery_code_ack),
  });
}
