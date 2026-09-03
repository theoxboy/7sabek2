/**
 * 7sabek — journal des versions (user-facing changelog).
 *
 * ⚠️  Lire `CLAUDE.md` (section "Versioning & changelog") avant d'éditer ce
 *     fichier. En résumé :
 *      - Une seule entrée (release) par jour maximum. Si la date du jour a déjà
 *        une entrée, on AJOUTE des puces dedans, on ne crée pas de nouvelle
 *        version.
 *      - Langage grand public, trilingue fr/en/ar, AUCUN détail technique
 *        (pas de nom de fichier, d'endpoint, de librairie, de stack).
 *      - La 1ʳᵉ entrée du tableau = la version affichée dans l'app.
 *
 * Ordre : le plus récent EN PREMIER.
 */

export type ChangeItem = { fr: string; en: string; ar: string };
export type ChangeKind = "added" | "improved" | "fixed";

export type Release = {
  version: string;
  /** ISO `yyyy-mm-dd`. */
  date: string;
  /** Phrase d'accroche facultative, mise en avant en haut de l'entrée. */
  highlight?: ChangeItem;
  groups: { kind: ChangeKind; items: ChangeItem[] }[];
};

export const CHANGELOG: Release[] = [
  {
    version: "1.3.1",
    date: "2026-09-03",
    groups: [
      {
        kind: "improved",
        items: [
          {
            fr: "En mode découverte, les fonctionnalités qui demandent un compte affichent maintenant un message clair qui rappelle que 7sabek est 100% gratuit, avec un bouton pour créer son compte sans rien perdre.",
            en: "In discovery mode, features that need an account now show a clear message reminding you that 7sabek is 100% free, with a button to create your account without losing anything.",
            ar: "فوضع الاكتشاف، الخصائص اللي كتطلب حساب ولّات كتبيّن رسالة واضحة كتفكّرك بلي 7sabek مجاني 100%، مع زر باش تصاوب حسابك بلا ما تخسر والو.",
          },
          {
            fr: "L’assistant IA reste accessible en mode découverte avec quelques messages par jour, puis invite à créer un compte gratuit pour un accès sans limite.",
            en: "The AI assistant stays available in discovery mode with a few messages a day, then invites you to create a free account for unlimited access.",
            ar: "المساعد الذكي كيبقى متاح فوضع الاكتشاف بشي كم ديال الرسائل فاليوم، من بعد كيدعيك تصاوب حساب مجاني باش يكون عندك دخول بلا حدود.",
          },
          {
            fr: "En mode découverte : un indicateur de protection de ton budget, ton code de reprise consultable et copiable, un bouton pour tout effacer immédiatement, et une explication claire du mode — le tout rappelant que l’app est gratuite à vie.",
            en: "In discovery mode: a gauge showing how protected your budget is, your recovery code you can view and copy, a button to erase everything right away, and a plain explanation of the mode — all reminding you the app is free for life.",
            ar: "فوضع الاكتشاف: مؤشر كيوريك شحال الميزانية ديالك محمية، الكود ديال الاسترجاع تقدر تشوفو وتنسخو، زر باش تمسح كولشي دغيا، وشرح واضح للوضع — وكولشي كيفكّرك بلي التطبيق مجاني مدى الحياة.",
          },
          {
            fr: "Après avoir créé ton compte depuis le mode découverte, tu arrives directement dans l’app — l’onboarding devient facultatif, plus jamais imposé.",
            en: "After creating your account from discovery mode you land straight in the app — onboarding becomes optional, never forced.",
            ar: "من بعد ما تصاوب حسابك من وضع الاكتشاف، كتدخل نيشان للتطبيق — الـ onboarding ولّا اختياري، ما بقاش إجباري.",
          },
        ],
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-09-02",
    highlight: {
      fr: "Une supervision de la plateforme plus claire, plus rapide et plus fiable.",
      en: "Clearer, faster and more reliable platform monitoring.",
      ar: "مراقبة المنصة ولّات أوضح، أسرع وأكثر موثوقية.",
    },
    groups: [
      {
        kind: "added",
        items: [
          {
            fr: "Nouveau mode découverte : essaie 7sabek sans créer de compte et sans rien remplir. Tu gardes tes données et tu crées ton compte quand tu veux, même en changeant de téléphone.",
            en: "New discovery mode: try 7sabek without creating an account or filling anything in. Your data stays, and you create your account whenever you want — even if you switch phones.",
            ar: "وضع اكتشاف جديد: جرّب 7sabek بلا ما تصاوب حساب وبلا ما تعمّر والو. البيانات ديالك كتبقى، وكتصاوب الحساب فاش بغيتي، حتى إلا بدّلتي التيليفون.",
          },
        ],
      },
      {
        kind: "improved",
        items: [
          {
            fr: "Améliorations de stabilité et de performance dans toute l’application.",
            en: "Stability and performance improvements across the app.",
            ar: "تحسينات فالاستقرار والأداء فجميع أنحاء التطبيق.",
          },
          {
            fr: "Interface d’administration modernisée et réorganisée pour un suivi complet de l’activité.",
            en: "Modernized, reorganized admin interface for end-to-end activity monitoring.",
            ar: "واجهة الإدارة تجدّدت واتنظمات باش تتبع النشاط كامل.",
          },
        ],
      },
      {
        kind: "fixed",
        items: [
          {
            fr: "Correction de l’affichage de plusieurs statistiques de suivi qui pouvaient être incomplètes.",
            en: "Fixed several monitoring statistics that could show incomplete figures.",
            ar: "إصلاح بزّاف ديال إحصائيات المتابعة اللي كانت تبان ناقصة.",
          },
          {
            fr: "Correction des informations de sauvegarde qui pouvaient afficher une fausse alerte.",
            en: "Fixed backup information that could raise a false alert.",
            ar: "إصلاح معلومات النسخ الاحتياطية اللي كانت تعطي تنبيه غالط.",
          },
        ],
      },
    ],
  },
  {
    version: "1.2.1",
    date: "2026-08-15",
    highlight: {
      fr: "Version de référence de 7sabek : budget par enveloppes, plan financier et rapports.",
      en: "7sabek baseline release: envelope budgeting, money plan and reports.",
      ar: "النسخة المرجعية ديال 7sabek: ميزانية بالأظرفة، خطة مالية وتقارير.",
    },
    groups: [
      {
        kind: "added",
        items: [
          {
            fr: "Budget par enveloppes, répartition automatique du salaire et suivi du cash disponible.",
            en: "Envelope budgeting, automatic salary distribution and available-cash tracking.",
            ar: "ميزانية بالأظرفة، تقسيم تلقائي ديال الراتب وتتبع الكاش المتاح.",
          },
          {
            fr: "Money Plan, objectifs, dettes et rapports multilingues (FR · EN · الدارجة).",
            en: "Money Plan, goals, debts and multilingual reports (FR · EN · Darija).",
            ar: "Money Plan، الأهداف، الديون وتقارير بلغات متعددة (بالفرنسية · بالإنجليزية · بالدارجة).",
          },
        ],
      },
    ],
  },
];

export const LATEST_RELEASE = CHANGELOG[0];
