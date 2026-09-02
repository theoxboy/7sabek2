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
    version: "1.3.0",
    date: "2026-09-02",
    highlight: {
      fr: "Une supervision de la plateforme plus claire, plus rapide et plus fiable.",
      en: "Clearer, faster and more reliable platform monitoring.",
      ar: "مراقبة المنصة ولّات أوضح، أسرع وأكثر موثوقية.",
    },
    groups: [
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
