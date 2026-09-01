"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { PageTour } from "@/components/tour/GlobalTour";
import { usePageTour } from "@/components/tour/usePageTour";
import { useAppLocale } from "@/lib/appLocale";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";
import {
  BookOpen,
  HelpCircle,
  Activity,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
type HelpSectionId =
  | "intro"
  | "dashboard"
  | "operations"
  | "envelopes"
  | "categories"
  | "distribution"
  | "sweeps"
  | "reports"
  | "settings"
  | "outro";

type HelpExpandedState = Record<HelpSectionId, boolean>;

interface HelpBlock {
  borderColor: string;
  icon: string;
  title: string;
  items: string[];
}

interface HelpSection {
  id: HelpSectionId;
  number: string;
  numberBg: string;
  numberText: string;
  title: string;
  blocks: HelpBlock[];
}

/* ------------------------------------------------------------------ */
/*  Locale-independent section chrome (number, colors)                */
/* ------------------------------------------------------------------ */
const SECTION_META: Array<
  Pick<HelpSection, "id" | "number" | "numberBg" | "numberText">
> = [
  { id: "intro", number: "01", numberBg: "bg-indigo-50", numberText: "text-indigo-600" },
  { id: "dashboard", number: "02", numberBg: "bg-emerald-50", numberText: "text-emerald-600" },
  { id: "operations", number: "03", numberBg: "bg-indigo-50", numberText: "text-indigo-600" },
  { id: "envelopes", number: "04", numberBg: "bg-emerald-50", numberText: "text-emerald-600" },
  { id: "categories", number: "05", numberBg: "bg-indigo-50", numberText: "text-indigo-600" },
  { id: "distribution", number: "06", numberBg: "bg-emerald-50", numberText: "text-emerald-600" },
  { id: "sweeps", number: "07", numberBg: "bg-indigo-50", numberText: "text-indigo-600" },
  { id: "reports", number: "08", numberBg: "bg-emerald-50", numberText: "text-emerald-600" },
  { id: "settings", number: "09", numberBg: "bg-indigo-50", numberText: "text-indigo-600" },
];

const BLOCK_BORDERS = [
  "border-indigo-500",
  "border-emerald-500",
  "border-amber-500",
  "border-rose-500",
];

type SectionCopy = {
  title: string;
  blocks: Array<{ icon: string; title: string; items: string[] }>;
};

const buildSections = (rows: Record<HelpSectionId, SectionCopy>): HelpSection[] =>
  SECTION_META.map((meta) => {
    const row = rows[meta.id];
    return {
      ...meta,
      title: row.title,
      blocks: row.blocks.map((block, index) => ({
        borderColor: BLOCK_BORDERS[index] ?? BLOCK_BORDERS[BLOCK_BORDERS.length - 1],
        icon: block.icon,
        title: block.title,
        items: block.items,
      })),
    };
  });

/* ------------------------------------------------------------------ */
/*  Section content per locale                                        */
/* ------------------------------------------------------------------ */
const SECTIONS_AR: Record<HelpSectionId, SectionCopy> = {
  intro: {
    title: "كيفاش تقرا هاد الدليل",
    blocks: [
      {
        icon: "📖",
        title: "هذا هو الدليل",
        items: [
          "هاد الصفحة كتلخص دور كل سكرين، الأزرار المهمة، والخطوات الرئيسية. حل غير الجزء اللي محتاج دابا.",
          "كل سكرين عندها شلا خطوات وأزرار كتساعدك تمشي فالميزانية ديالك بطريقة صحيحة.",
        ],
      },
    ],
  },
  dashboard: {
    title: "لوحة القيادة — شنو كتدير",
    blocks: [
      {
        icon: "⭐️",
        title: "الفوق والأكشنات",
        items: [
          "لوحة القيادة كتعطيك النظرة العامة ديال الفترة اللي خدام بها دابا.",
          "تقدر تبدل الفترة، تزيد مصروف، ولا تزيد دخل.",
          "إلا كان شي دخل خاصو تصريح، بلياج خاصو يتدار، ولا ربط ناقص، كيبان فوق.",
        ],
      },
      {
        icon: "💳",
        title: "الكارطات الرئيسية",
        items: [
          "الكاش المتوفر: فلوس مازال ما توزعاتش لشي ظرف معين.",
          "مصاريف الفترة: المصاريف الإجمالية المرتبطة بالفترة الحالية.",
          "دخل الفترة والصافي: قراءة سريعة للحالة المالية ديالك دابا.",
        ],
      },
      {
        icon: "💡",
        title: "البلوكات المفيدة",
        items: [
          "الأظرفة المهمة: شكون شغال، شكون خارج على الحد، وشكون قريب ليه.",
          "آخر المصاريف: تصحيح، تعديل أو حذف مصروف دوزتيه بسرعة.",
          "الأزرار السريعة: اختصارات للعمليات السريعة (المصاريف، الدخل، والتوزيع).",
        ],
      },
    ],
  },
  operations: {
    title: "العمليات — شنو كيدير هاد السكرين",
    blocks: [
      {
        icon: "🔄",
        title: "إنشاء عملية جديدة",
        items: [
          "اختار نوع العملية: مصروف ولا دخل.",
          "حدد الصنف المناسب، المبلغ، تاريخ العملية، والوصف إلا بغيتي توضيح.",
          "الدخل كيمشي ديما لحساب الكاش المتوفر، والمصروف كيأثر على رصيد الظرف اللي الصنف مربوط بيه.",
        ],
      },
      {
        icon: "⚠️",
        title: "التنبيهات والمساعدة التلقائية",
        items: [
          "الصفحة كتنبهك إلا ما كايناش أصناف مناسبة للنوع اللي اخترتي.",
          "إلا كان النوع دخل، تقدر تشوف محاكاة التوزيع على الأظرفة قبل ما تأكد العملية.",
          "أي خطأ فالإنشاء، فالمبلغ، ولا فالحذف كيبان مباشرة فالشريط الفوقاني.",
        ],
      },
      {
        icon: "🗂️",
        title: "أرشيف وسجل العمليات",
        items: [
          "السجل فيه فلترة متقدمة حسب التاريخ، النوع، الصنف، والبحث النصي السريع.",
          "كل عملية فالسجل تقدر تبدلها، تصححها ولا تحذفها نهائياً.",
          "الحذف كيمسح أثر العملية تلقائياً من الكاش المتوفر ومن الأظرفة المربوطة.",
        ],
      },
    ],
  },
  envelopes: {
    title: "الأظرفة — شنو كيدير هاد السكرين",
    blocks: [
      {
        icon: "📬",
        title: "اللائحة الرئيسية",
        items: [
          "كل كارت كيبين اسم الظرف والباقي فيه دابا.",
          "الكاش والادخار: أظرفة النظام الأساسية، ما يمكنش تحذفهم.",
          "تقدر تحل تفاصيل أي ظرف، تصحح رصيدو، تبدل خيار الترحيل، ولا تحذف الأظرفة العادية.",
        ],
      },
      {
        icon: "➕",
        title: "الإنشاء والتخصيص الفوري",
        items: [
          "تقدر تزيد ظرف مخصص وحدة بوحدة، ولا تستعمل نماذج جاهزة ديال الأظرفة.",
          "التخصيص الفوري: كينقل ولا كيوزع مبلغ من الكاش لظرف معين باش تعمّر ميزانيتو.",
        ],
      },
      {
        icon: "📈",
        title: "حركة الظرف والترحيل",
        items: [
          "البانيل الجانبي كيبين الفترات القديمة، آخر الأنشطة، والتحويلات اللي دازت.",
          "الترحيل شاعل: الباقي فالظرف كيدوز ويزيد على ميزانية الفترة الجاية.",
          "الترحيل طافي: الباقي كيرجع للكاش العام مع بداية الفترة الجاية.",
        ],
      },
    ],
  },
  categories: {
    title: "الأصناف — شنو كيدير هاد السكرين",
    blocks: [
      {
        icon: "🏷️",
        title: "إنشاء وتحديد الأنواع",
        items: [
          "تقدر تزيد صنف جديد وتحدد نوعو: للمصاريف، للدخل، ولا بجوج.",
          "كاينين نماذج سريعة كتزيد ليك بزاف ديال الأصناف الشائعة بكليك وحدة.",
          "تقدر تزيد صنف وتخليه بلا ربط حتى تحتاجو من بعد.",
        ],
      },
      {
        icon: "🔗",
        title: "ربط الأصناف بالأظرفة",
        items: [
          "كل صنف يقدر يتربط بظرف محدد ولا يبقى مستقل.",
          "هاد الربط هو اللي كيخلي المصاريف المصنفة تمشي أوتوماتيكياً للظرف وتنقص من ميزانيتو.",
          "الفلترات الذكية (تلقائي / مصروف / دخل) كتسهل تصحيح أنواع الأصناف.",
        ],
      },
      {
        icon: "⚙️",
        title: "صيانة وحذف الأصناف",
        items: [
          "تقدر تبدل سمية أي صنف، تعدل الظرف المربوط بيه، ولا تمسحو.",
          "المسح الجماعي كيمحي بزاف ديال الأصناف بلمسة وحدة.",
          "خانة البحث كتخليك تلقى أي صنف حتى لو كان السجل طويل.",
        ],
      },
    ],
  },
  distribution: {
    title: "التوزيع — شنو كيدير هاد السكرين",
    blocks: [
      {
        icon: "🎯",
        title: "دور صفحة توزيع الدخل",
        items: [
          "هاد الصفحة كتحدد كيفاش الدخل المصرح به كيتقسم أوتوماتيكياً بين الأظرفة والأهداف.",
          "زر الإعداد كيفتح المساعد البصري لبرمجة طريقة توزيع فلوسك.",
          "تقدر تفعل، تلغي، تعدل، ولا تمسح إعدادات التوزيع المسجلة.",
        ],
      },
      {
        icon: "⚖️",
        title: "قواعد التوزيع الذكي",
        items: [
          "المبلغ الثابت: كتعطي ظرف معين مبلغاً ثابتاً كل فترة (بحال الكراء).",
          "النسبة المئوية: كتوزع الباقي بالنسبة، إما بالتساوي ولا حسب الأولوية.",
          "حتى الأهداف والادخارات كتاخد حصتها بحال الأظرفة العادية.",
        ],
      },
      {
        icon: "🧪",
        title: "المحاكاة الفورية",
        items: [
          "المحاكاة كتبين شحال غياخد كل ظرف وشحال غيبقى قبل التطبيق الحقيقي.",
          "تقدر تحفظ الإعداد وتعطيه إسم باش يبقى مرجع.",
          "التطبيق النهائي كيرسل القواعد للباكيند باش يطبق التوزيع فور حط دخل جديد.",
        ],
      },
    ],
  },
  sweeps: {
    title: "البلياج والتذكيرات — شنو كيدير هاد السكرين",
    blocks: [
      {
        icon: "🗓️",
        title: "تذكيرات الدخل المتكرر",
        items: [
          "التذكيرات كتعاونك ما تنساش تصرح بالسالير ولا المداخيل المتكررة.",
          "تقدر تحدد التردد: شهري، أسبوعي، كل 15 يوم، ولا تاريخ ثابت.",
          "الصفحة كتبين ليك التاريخ المتوقع الجاي أوتوماتيكياً.",
        ],
      },
      {
        icon: "🧹",
        title: "علاقة التذكيرات بالبلياج",
        items: [
          "البلياج كيتدار فاش كيوصل تذكير الدخل المصرح به وتكون دازت المدة.",
          "الأظرفة اللي ترحيلها طافي: الباقي كيرجع للادخار.",
          "الأظرفة اللي ترحيلها شاعل: كتحافظ على الباقي كإضافة على ميزانيتها الجديدة.",
        ],
      },
      {
        icon: "⚙️",
        title: "الأكشنات اللي كيبانو",
        items: [
          "كل تذكير تقدر تعلم عليه كمصرح به باش تبدا الدورة الجديدة، ولا تمسحو.",
          "من بعد البلياج كتشوف ملخص الفترات اللي تسدات ومجموع المبالغ اللي تحولت.",
          "زر المعلومات كيعطيك شرح تفصيلي للمنطق ديال البلياج فـ 7سابك.",
        ],
      },
    ],
  },
  reports: {
    title: "التقارير — شنو كيدير هاد السكرين",
    blocks: [
      {
        icon: "📊",
        title: "التقارير والرسوم البيانية",
        items: [
          "كتعطيك نظرة بصرية على فين كيمشيو فلوسك ومصاريفك كل فترة.",
          "كتبين التقسيم المئوي لكل ظرف وصنف باش تعرف شكون كياكل ليك الميزانية.",
          "كتوضح متوسط الادخار والالتزام بقواعد ميزانيتك.",
        ],
      },
      {
        icon: "📅",
        title: "مقارنة الفترات السابقة",
        items: [
          "تقدر تقارن بين الشهور اللي فاتت وتشوف واش مصاريفك طلعات ولا نزلات.",
          "كتساعدك تحسن التخطيط للشهر الجاي وتوفر كتر مع الوقت.",
        ],
      },
    ],
  },
  settings: {
    title: "الإعدادات — شنو كيدير هاد السكرين",
    blocks: [
      {
        icon: "⚙️",
        title: "تخصيص تفضيلات حسابك",
        items: [
          "الإعدادات كتسير العملة الافتراضية، المدة بين عمليات البلياج، ومعلومات البروفيل.",
          "إرجاع البداية لمراجعة أساسيات حسابك وأهدافك من الزيرو.",
          "أي تغيير كيتحفظ فالحين وبشكل آمن.",
        ],
      },
      {
        icon: "💾",
        title: "إعدادات الجهاز والتصدير",
        items: [
          "تفعيل الثيم الفاتح / الغامق وتخزين التفضيل على جهازك.",
          "تصدير البيانات: تحميل سجل حسابك بصيغة ملف باش تحتافظ بنسخة.",
          "شارة التغييرات كتعلمك واش كل حاجة درتيها تحفظات.",
        ],
      },
      {
        icon: "🚨",
        title: "المنطقة الحساسة",
        items: [
          "تصفير البيانات: كيمسح الداتا ولكن كيخلي حسابك باش تبدا ميزانية خاوية.",
          "حذف الحساب نهائياً: كيمسح بروفيلك وكاع الداتا ولا يمكن التراجع.",
          "هاد الأكشن كتحتاج تأكيد صريح منك قبل التنفيذ.",
        ],
      },
    ],
  },
  outro: { title: "", blocks: [] },
};

const SECTIONS_FR: Record<HelpSectionId, SectionCopy> = {
  intro: {
    title: "Comment lire ce guide",
    blocks: [
      {
        icon: "📖",
        title: "À quoi sert ce guide",
        items: [
          "Cette page résume le rôle de chaque écran, les boutons importants et les étapes clés. Ouvre seulement la partie dont tu as besoin.",
          "Chaque écran suit une logique d'étapes et de boutons qui t'aident à gérer ton budget correctement.",
        ],
      },
    ],
  },
  dashboard: {
    title: "Tableau de bord — ce qu'il fait",
    blocks: [
      {
        icon: "⭐️",
        title: "En-tête et actions",
        items: [
          "Le tableau de bord te donne la vue d'ensemble de la période active.",
          "Tu peux changer de période, ajouter une dépense ou ajouter un revenu.",
          "Si un revenu doit être déclaré, un balayage doit être lancé ou un rattachement manque, ça s'affiche en haut.",
        ],
      },
      {
        icon: "💳",
        title: "Les cartes principales",
        items: [
          "Cash disponible : argent pas encore réparti dans une enveloppe.",
          "Dépenses de la période : total des dépenses rattachées à la période active.",
          "Revenu de la période et net : lecture rapide de ta situation financière du moment.",
        ],
      },
      {
        icon: "💡",
        title: "Les blocs utiles",
        items: [
          "Enveloppes importantes : lesquelles sont actives, dépassées, ou proches de la limite.",
          "Dernières dépenses : corrige, modifie ou supprime une dépense rapidement.",
          "Boutons rapides : raccourcis pour les opérations courantes (dépense, revenu, répartition).",
        ],
      },
    ],
  },
  operations: {
    title: "Transactions — ce que fait cet écran",
    blocks: [
      {
        icon: "🔄",
        title: "Créer une transaction",
        items: [
          "Choisis le type : dépense ou revenu.",
          "Renseigne la catégorie, le montant, la date et une note si tu veux préciser.",
          "Un revenu va toujours au cash disponible ; une dépense impacte le solde de l'enveloppe à laquelle sa catégorie est rattachée.",
        ],
      },
      {
        icon: "⚠️",
        title: "Alertes et aide automatique",
        items: [
          "L'écran te prévient s'il n'existe pas de catégorie adaptée au type choisi.",
          "Pour un revenu, tu peux voir la simulation de répartition sur les enveloppes avant de confirmer.",
          "Toute erreur de création, de montant ou de suppression s'affiche directement dans la barre du haut.",
        ],
      },
      {
        icon: "🗂️",
        title: "Historique et journal",
        items: [
          "Le journal a un filtrage avancé par date, type, catégorie et recherche texte rapide.",
          "Chaque transaction du journal peut être modifiée, corrigée ou supprimée définitivement.",
          "La suppression retire automatiquement l'effet de la transaction du cash disponible et des enveloppes liées.",
        ],
      },
    ],
  },
  envelopes: {
    title: "Enveloppes — ce que fait cet écran",
    blocks: [
      {
        icon: "📬",
        title: "La liste principale",
        items: [
          "Chaque carte montre le nom de l'enveloppe et son solde restant actuel.",
          "Cash et Épargne : enveloppes système essentielles, elles ne peuvent pas être supprimées.",
          "Tu peux ouvrir le détail d'une enveloppe, corriger son solde, changer l'option de report, ou supprimer les enveloppes normales.",
        ],
      },
      {
        icon: "➕",
        title: "Création et allocation directe",
        items: [
          "Ajoute une enveloppe sur mesure une par une, ou utilise des modèles d'enveloppes prêts à l'emploi.",
          "L'allocation directe déplace ou répartit un montant depuis le cash vers une enveloppe pour alimenter son budget.",
        ],
      },
      {
        icon: "📈",
        title: "Mouvements de l'enveloppe et report",
        items: [
          "Le panneau latéral montre les périodes passées, les dernières activités et les transferts effectués.",
          "Report activé : ce qui reste dans l'enveloppe est reporté et s'ajoute au budget de la période suivante.",
          "Report désactivé : le reste retourne au cash général au début de la période suivante.",
        ],
      },
    ],
  },
  categories: {
    title: "Catégories — ce que fait cet écran",
    blocks: [
      {
        icon: "🏷️",
        title: "Créer et typer",
        items: [
          "Ajoute une catégorie et définis son type : dépense, revenu, ou les deux.",
          "Des modèles rapides ajoutent d'un clic plusieurs catégories courantes (loyer, alimentation, transport).",
          "Tu peux créer une catégorie et la laisser non reliée jusqu'à ce que tu en aies besoin.",
        ],
      },
      {
        icon: "🔗",
        title: "Relier les catégories aux enveloppes",
        items: [
          "Chaque catégorie peut être reliée à une enveloppe précise ou rester indépendante.",
          "Ce lien est ce qui fait qu'une dépense catégorisée va automatiquement dans l'enveloppe et réduit son budget.",
          "Les filtres (auto / dépense / revenu) facilitent la correction des types de catégorie.",
        ],
      },
      {
        icon: "⚙️",
        title: "Entretien et suppression",
        items: [
          "Tu peux renommer une catégorie, changer l'enveloppe reliée, ou la supprimer.",
          "La suppression groupée retire plusieurs catégories d'un coup pour nettoyer ta configuration.",
          "La recherche rapide retrouve n'importe quelle catégorie même si la liste est longue.",
        ],
      },
    ],
  },
  distribution: {
    title: "Répartition — ce que fait cet écran",
    blocks: [
      {
        icon: "🎯",
        title: "Le rôle de la page",
        items: [
          "Cette page définit comment un revenu déclaré (comme le salaire) est découpé automatiquement entre tes enveloppes et objectifs d'épargne.",
          "Le bouton de configuration ouvre l'assistant visuel pour programmer la répartition.",
          "Tu peux activer, désactiver, modifier ou supprimer une configuration de répartition enregistrée.",
        ],
      },
      {
        icon: "⚖️",
        title: "Les règles intelligentes",
        items: [
          "Montant fixe : donne à une enveloppe un montant fixe chaque période (ex. loyer : 3000 DH).",
          "Pourcentage : répartit le reste du revenu en pourcentage, à parts égales ou selon la priorité.",
          "Les objectifs et l'épargne reçoivent aussi leur part, comme les enveloppes normales.",
        ],
      },
      {
        icon: "🧪",
        title: "Simulation immédiate",
        items: [
          "La simulation montre précisément ce que reçoit chaque enveloppe et ce qui reste avant l'application réelle.",
          "Tu peux sauvegarder une configuration et lui donner un nom pour la garder en référence (ex. budget d'été).",
          "L'application finale envoie les règles actives au backend pour répartir dès qu'un nouveau revenu est saisi.",
        ],
      },
    ],
  },
  sweeps: {
    title: "Balayages et rappels — ce que fait cet écran",
    blocks: [
      {
        icon: "🗓️",
        title: "Rappels de revenu récurrent",
        items: [
          "Les rappels t'aident à ne pas oublier de déclarer le salaire ou les revenus récurrents.",
          "Tu choisis la fréquence : mensuel, hebdomadaire, tous les 15 jours, ou une date fixe.",
          "L'écran affiche automatiquement la prochaine date prévue.",
        ],
      },
      {
        icon: "🧹",
        title: "Lien entre rappels et balayage",
        items: [
          "Le balayage s'exécute quand un rappel de revenu déclaré arrive et que la période est écoulée.",
          "Enveloppes sans report : le reste retourne à l'épargne pour repartir à zéro.",
          "Enveloppes avec report : elles gardent le reste en plus de leur nouveau budget.",
        ],
      },
      {
        icon: "⚙️",
        title: "Les actions affichées",
        items: [
          "Chaque rappel peut être marqué comme revenu déclaré pour lancer le nouveau cycle, ou supprimé.",
          "Après un balayage, tu vois le récapitulatif des périodes clôturées et le total transféré.",
          "Le bouton info explique en détail la logique des balayages dans 7sabek.",
        ],
      },
    ],
  },
  reports: {
    title: "Rapports — ce que fait cet écran",
    blocks: [
      {
        icon: "📊",
        title: "Rapports et graphiques",
        items: [
          "Vue visuelle directe de là où va ton argent et de tes dépenses par période.",
          "Répartition en pourcentage par enveloppe et catégorie pour voir ce qui pèse le plus.",
          "Affiche ton taux d'épargne moyen et le respect de tes règles de budget.",
        ],
      },
      {
        icon: "📅",
        title: "Comparer les périodes",
        items: [
          "Compare les mois passés pour voir si tes dépenses montent ou baissent.",
          "T'aide à mieux planifier le mois suivant et à économiser plus avec le temps.",
        ],
      },
    ],
  },
  settings: {
    title: "Réglages — ce que fait cet écran",
    blocks: [
      {
        icon: "⚙️",
        title: "Préférences du compte",
        items: [
          "Les réglages gèrent la devise par défaut, l'intervalle entre balayages, et les infos de profil.",
          "Refaire l'onboarding permet de revoir les bases de ton compte et tes objectifs depuis zéro.",
          "Chaque changement est enregistré immédiatement et de façon sécurisée.",
        ],
      },
      {
        icon: "💾",
        title: "Appareil et export",
        items: [
          "Active le thème clair / sombre ; le choix est mémorisé sur ton appareil.",
          "Export des données : télécharge le journal de ton compte dans un fichier pour garder une sauvegarde.",
          "Le badge de changements t'indique si tout ce que tu as fait a bien été enregistré.",
        ],
      },
      {
        icon: "🚨",
        title: "Zone sensible",
        items: [
          "Réinitialiser les données : efface les données mais garde ton compte pour repartir sur un budget vide.",
          "Supprimer le compte : efface ton profil et toutes les données ; action irréversible.",
          "Cette action demande une confirmation explicite avant de s'exécuter.",
        ],
      },
    ],
  },
  outro: { title: "", blocks: [] },
};

const SECTIONS_EN: Record<HelpSectionId, SectionCopy> = {
  intro: {
    title: "How to read this guide",
    blocks: [
      {
        icon: "📖",
        title: "What this guide is for",
        items: [
          "This page sums up what each screen does, the key buttons, and the main steps. Open only the part you need right now.",
          "Every screen follows a flow of steps and buttons that help you manage your budget correctly.",
        ],
      },
    ],
  },
  dashboard: {
    title: "Dashboard — what it does",
    blocks: [
      {
        icon: "⭐️",
        title: "Header and actions",
        items: [
          "The dashboard gives you the overview of the active period.",
          "You can change the period, add an expense, or add income.",
          "If income needs declaring, a sweep needs running, or a link is missing, it shows at the top.",
        ],
      },
      {
        icon: "💳",
        title: "The main cards",
        items: [
          "Available cash: money not yet allocated to any envelope.",
          "Period spending: total spending tied to the active period.",
          "Period income and net: a quick read of your current financial situation.",
        ],
      },
      {
        icon: "💡",
        title: "The useful blocks",
        items: [
          "Key envelopes: which are active, overspent, or near the limit.",
          "Recent expenses: fix, edit, or delete an expense quickly.",
          "Quick buttons: shortcuts for common actions (expense, income, distribution).",
        ],
      },
    ],
  },
  operations: {
    title: "Transactions — what this screen does",
    blocks: [
      {
        icon: "🔄",
        title: "Create a transaction",
        items: [
          "Pick the type: expense or income.",
          "Set the category, amount, date, and a note if you want to clarify.",
          "Income always goes to available cash; an expense affects the balance of the envelope its category is linked to.",
        ],
      },
      {
        icon: "⚠️",
        title: "Alerts and automatic help",
        items: [
          "The screen warns you if there is no category that fits the type you chose.",
          "For income, you can see the distribution simulation across envelopes before confirming.",
          "Any create, amount, or delete error shows directly in the top bar.",
        ],
      },
      {
        icon: "🗂️",
        title: "History and journal",
        items: [
          "The journal has advanced filtering by date, type, category, and quick text search.",
          "Every transaction in the journal can be edited, corrected, or permanently deleted.",
          "Deleting automatically removes the transaction's effect from available cash and linked envelopes.",
        ],
      },
    ],
  },
  envelopes: {
    title: "Envelopes — what this screen does",
    blocks: [
      {
        icon: "📬",
        title: "The main list",
        items: [
          "Each card shows the envelope name and its current remaining balance.",
          "Cash and Savings: essential system envelopes, they cannot be deleted.",
          "You can open an envelope's detail, correct its balance, change the rollover option, or delete normal envelopes.",
        ],
      },
      {
        icon: "➕",
        title: "Creation and direct allocation",
        items: [
          "Add a custom envelope one at a time, or use ready-made envelope templates.",
          "Direct allocation moves or splits an amount from cash into an envelope to fund its budget.",
        ],
      },
      {
        icon: "📈",
        title: "Envelope movement and rollover",
        items: [
          "The side panel shows past periods, recent activity, and completed transfers.",
          "Rollover on: what is left in the envelope carries over and adds to the next period's budget.",
          "Rollover off: the remainder goes back to general cash at the start of the next period.",
        ],
      },
    ],
  },
  categories: {
    title: "Categories — what this screen does",
    blocks: [
      {
        icon: "🏷️",
        title: "Create and type",
        items: [
          "Add a category and set its type: expense, income, or both.",
          "Quick templates add several common categories in one click (rent, food, transport).",
          "You can create a category and leave it unlinked until you need it.",
        ],
      },
      {
        icon: "🔗",
        title: "Link categories to envelopes",
        items: [
          "Each category can be linked to a specific envelope or stay independent.",
          "This link is what makes a categorized expense automatically go into the envelope and reduce its budget.",
          "The filters (auto / expense / income) make it easy to fix category types.",
        ],
      },
      {
        icon: "⚙️",
        title: "Maintenance and deletion",
        items: [
          "You can rename a category, change its linked envelope, or delete it.",
          "Bulk delete removes several categories at once to clean up your setup.",
          "Quick search finds any category even if the list is long.",
        ],
      },
    ],
  },
  distribution: {
    title: "Distribution — what this screen does",
    blocks: [
      {
        icon: "🎯",
        title: "The page's role",
        items: [
          "This page defines how declared income (like salary) is split automatically across your envelopes and savings goals.",
          "The setup button opens the visual assistant to program the split.",
          "You can enable, disable, edit, or delete a saved distribution configuration.",
        ],
      },
      {
        icon: "⚖️",
        title: "Smart rules",
        items: [
          "Fixed amount: give an envelope a fixed amount each period (e.g. rent: 3000 DH).",
          "Percentage: split the rest of the income by percentage, evenly or by priority.",
          "Goals and savings also take their share, like normal envelopes.",
        ],
      },
      {
        icon: "🧪",
        title: "Instant simulation",
        items: [
          "The simulation shows exactly what each envelope gets and what is left before the real apply.",
          "You can save a configuration and name it to keep it as a reference (e.g. summer budget).",
          "The final apply sends the active rules to the backend to split as soon as new income is entered.",
        ],
      },
    ],
  },
  sweeps: {
    title: "Sweeps and reminders — what this screen does",
    blocks: [
      {
        icon: "🗓️",
        title: "Recurring income reminders",
        items: [
          "Reminders help you not forget to declare salary or recurring income.",
          "You pick the frequency: monthly, weekly, every 15 days, or a fixed date.",
          "The screen automatically shows the next expected date.",
        ],
      },
      {
        icon: "🧹",
        title: "How reminders relate to the sweep",
        items: [
          "The sweep runs when a declared-income reminder arrives and the period has elapsed.",
          "Envelopes without rollover: the remainder goes back to savings to reset.",
          "Envelopes with rollover: they keep the remainder on top of their new budget.",
        ],
      },
      {
        icon: "⚙️",
        title: "The actions shown",
        items: [
          "Each reminder can be marked as declared income to start the new cycle, or deleted.",
          "After a sweep you see the summary of closed periods and the total transferred.",
          "The info button explains the sweep logic in 7sabek in detail.",
        ],
      },
    ],
  },
  reports: {
    title: "Reports — what this screen does",
    blocks: [
      {
        icon: "📊",
        title: "Reports and charts",
        items: [
          "A direct visual view of where your money goes and your spending per period.",
          "Percentage breakdown per envelope and category so you see what weighs the most.",
          "Shows your average savings rate and how well you follow your budget rules.",
        ],
      },
      {
        icon: "📅",
        title: "Compare periods",
        items: [
          "Compare past months to see whether your spending is going up or down.",
          "Helps you plan the next month better and save more over time.",
        ],
      },
    ],
  },
  settings: {
    title: "Settings — what this screen does",
    blocks: [
      {
        icon: "⚙️",
        title: "Account preferences",
        items: [
          "Settings manage the default currency, the interval between sweeps, and profile info.",
          "Redoing onboarding lets you review your account basics and goals from scratch.",
          "Every change is saved immediately and securely.",
        ],
      },
      {
        icon: "💾",
        title: "Device and export",
        items: [
          "Toggle the light / dark theme; the choice is stored on your device.",
          "Data export: download your account journal as a file to keep a backup.",
          "The changes badge tells you whether everything you did was saved.",
        ],
      },
      {
        icon: "🚨",
        title: "Danger zone",
        items: [
          "Reset data: wipes the data but keeps your account so you start on an empty budget.",
          "Delete account: erases your profile and all data; this cannot be undone.",
          "This action needs an explicit confirmation before it runs.",
        ],
      },
    ],
  },
  outro: { title: "", blocks: [] },
};

const HELP_CONTENT: Record<FloussyLocale, HelpSection[]> = {
  ar: buildSections(SECTIONS_AR),
  fr: buildSections(SECTIONS_FR),
  en: buildSections(SECTIONS_EN),
};

/* ------------------------------------------------------------------ */
/*  Page chrome per locale                                            */
/* ------------------------------------------------------------------ */
type AideChrome = {
  headerTitle: string;
  headerSubtitle: string;
  badge: string;
  heroTitle: string;
  heroBody: string;
  quickNavTitle: string;
  outroNavLabel: string;
  open: string;
  close: string;
  closeSection: string;
  backToTop: string;
  backToToc: string;
  outroTitle: string;
  outroBody: string;
  footer: string;
};

const AIDE_CHROME: Record<FloussyLocale, AideChrome> = {
  ar: {
    headerTitle: "المساعدة — دليل المنصة",
    headerSubtitle: "دليل مبسط خطوة بخطوة لكل سكرين",
    badge: "المساعدة والدعم",
    heroTitle: "فهم كل سكرين فمنصة 7سابك",
    heroBody:
      "دليل مبسط كيجمع شنو كيدير كل سكرين. حل غير السكرين اللي محتاج دابا وتعرف على أهم الخصائص والأزرار.",
    quickNavTitle: "🚀 تنقل سريع — سير مباشرة للقسم اللي محتاجو",
    outroNavLabel: "نهاية الدليل",
    open: "حل",
    close: "سد",
    closeSection: "سد القسم",
    backToTop: "رجع للفوق ↑",
    backToToc: "رجع للفهرس ↑",
    outroTitle: "نهاية دليل 7سابك",
    outroBody:
      "تقدر ترجع للوحة القيادة ولا تحل أي قسم من جديد فاش بغيت. ميزانيتك مصفية دابا مع 7سابك 🪙 !",
    footer: "7sabek Guide — 7sabek lflous 🪙 2026",
  },
  fr: {
    headerTitle: "Aide — guide de la plateforme",
    headerSubtitle: "Un guide simple, écran par écran",
    badge: "Aide et support",
    heroTitle: "Comprendre chaque écran de 7sabek",
    heroBody:
      "Un guide simple qui rassemble ce que fait chaque écran. Ouvre seulement celui dont tu as besoin et repère les fonctions et boutons clés.",
    quickNavTitle: "🚀 Navigation rapide — va directement à la section voulue",
    outroNavLabel: "Fin du guide",
    open: "Ouvrir",
    close: "Fermer",
    closeSection: "Fermer la section",
    backToTop: "Retour en haut ↑",
    backToToc: "Retour au sommaire ↑",
    outroTitle: "Fin du guide 7sabek",
    outroBody:
      "Tu peux revenir au tableau de bord ou rouvrir n'importe quelle section quand tu veux. Ton budget est propre avec 7sabek 🪙 !",
    footer: "7sabek Guide — 7sabek lflous 🪙 2026",
  },
  en: {
    headerTitle: "Help — platform guide",
    headerSubtitle: "A simple guide, screen by screen",
    badge: "Help and support",
    heroTitle: "Understand every screen in 7sabek",
    heroBody:
      "A simple guide that gathers what each screen does. Open only the one you need and spot the key features and buttons.",
    quickNavTitle: "🚀 Quick nav — jump straight to the section you need",
    outroNavLabel: "End of the guide",
    open: "Open",
    close: "Close",
    closeSection: "Close section",
    backToTop: "Back to top ↑",
    backToToc: "Back to contents ↑",
    outroTitle: "End of the 7sabek guide",
    outroBody:
      "You can go back to the dashboard or reopen any section whenever you want. Your budget is clean with 7sabek 🪙 !",
    footer: "7sabek Guide — 7sabek lflous 🪙 2026",
  },
};

/* ------------------------------------------------------------------ */
/*  Help Section Toggle Component                                     */
/* ------------------------------------------------------------------ */
function HelpToggleSection({
  section,
  isOpen,
  onToggle,
  chrome,
  dir,
}: {
  section: HelpSection;
  isOpen: boolean;
  onToggle: () => void;
  chrome: AideChrome;
  dir: "rtl" | "ltr";
}) {
  return (
    <div
      id={`help-sec-${section.id}`}
      className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl shadow-xs overflow-hidden transition-all duration-300"
    >
      <div
        onClick={onToggle}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--surface-2)]/50 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-lg ${section.numberBg} ${section.numberText} flex items-center justify-center font-black text-xs font-sans`}
          >
            {section.number}
          </div>
          <h3 className="text-sm xs:text-base font-black text-[var(--ink)] leading-none">
            {section.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest leading-none">
            {isOpen ? chrome.close : chrome.open}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={section.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-[var(--border)] p-4 sm:p-5 text-[var(--ink)] space-y-4 text-xs xs:text-sm font-semibold font-sans leading-relaxed"
          >
            {section.blocks.map((block) => (
              <div
                key={block.title}
                className={`${dir === "rtl" ? "border-r-4 pr-3" : "border-l-4 pl-3"} ${block.borderColor}`}
              >
                <h4 className="font-black text-[var(--ink)] text-xs sm:text-sm">
                  {block.icon} {block.title}
                </h4>
                <ul className="list-disc list-inside mt-1 space-y-1 text-[var(--muted)]">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="px-3 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--ink)] rounded-xl text-xs font-bold font-sans cursor-pointer transition select-none"
              >
                {chrome.closeSection}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  document
                    .getElementById("help-page-container")
                    ?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold font-sans cursor-pointer transition select-none"
              >
                {chrome.backToTop}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function AidePage() {
  const { locale } = useAppLocale("fr");
  const dir = getLocaleDirection(locale);
  const chrome = AIDE_CHROME[locale] ?? AIDE_CHROME.fr;
  const sections = HELP_CONTENT[locale] ?? HELP_CONTENT.fr;

  const [expanded, setExpanded] = useState<HelpExpandedState>({
    intro: false,
    dashboard: false,
    operations: false,
    envelopes: false,
    categories: false,
    distribution: false,
    sweeps: false,
    reports: false,
    settings: false,
    outro: false,
  });

  const bannerRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const { tour } = usePageTour("aide", {
    banner: { ref: bannerRef },
    nav: { ref: navRef },
  });

  const toggleSection = useCallback((id: HelpSectionId) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(`help-sec-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const quickNav = [
    ...sections.map((section) => ({ key: section.id, label: section.title })),
    { key: "outro" as const, label: chrome.outroNavLabel },
  ];

  return (
    <motion.div
      key="help-page"
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 25 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="w-full min-h-screen z-10 flex flex-col bg-[var(--surface-2)] text-[var(--ink)] overflow-y-auto"
      id="help-page-container"
      dir={dir}
    >
      <PageTour tour={tour} />
      <div className="w-full min-h-screen flex flex-col relative bg-[var(--surface)] backdrop-blur-3xl">
        {/* Header / Title bar */}
        <div className="p-3.5 xs:p-5 border-b border-[var(--border)]/40 bg-[var(--surface)] flex items-center justify-center gap-2 sticky top-0 z-30 backdrop-blur-md">
          <div className="text-center min-w-0">
            <h2 className="text-xs xs:text-sm sm:text-lg font-black tracking-tight text-[var(--ink)] flex items-center justify-center gap-1.5 leading-none">
              <BookOpen className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
              <span>{chrome.headerTitle}</span>
            </h2>
            <p className="hidden xs:block text-[8px] sm:text-[10px] text-[var(--muted)] font-bold mt-1 uppercase tracking-wider">
              {chrome.headerSubtitle}
            </p>
          </div>
        </div>

        {/* Main content body */}
        <div className="max-w-4xl mx-auto w-full p-4 xs:p-5 sm:p-6 space-y-6">
          {/* Hero introduction banner */}
          <div
            ref={bannerRef}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/40 rounded-3xl p-5 sm:p-6 text-emerald-950 shadow-xs relative overflow-hidden"
          >
            <div className="absolute -left-10 -bottom-10 opacity-5 sm:opacity-10 transform -rotate-12 select-none pointer-events-none">
              <BookOpen className="w-48 h-48 text-emerald-700" />
            </div>

            <div className="flex items-center gap-2.5 mb-2 relative z-10 font-sans">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                <HelpCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-sans font-black text-xs sm:text-sm tracking-wider uppercase bg-emerald-600/10 text-emerald-800 px-2.5 py-1 rounded-full">
                {chrome.badge}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-emerald-950 leading-tight">
              {chrome.heroTitle}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-800 mt-2 font-semibold font-sans leading-relaxed">
              {chrome.heroBody}
            </p>
          </div>

          {/* Table of Content (Quick links) */}
          <div
            ref={navRef}
            className="bg-[var(--surface)] border border-[var(--border)]/50 rounded-3xl p-4 sm:p-5 shadow-xs"
          >
            <div className="flex items-center gap-2.5 mb-3.5">
              <Activity className="w-4 h-4 text-indigo-500 stroke-[2.5]" />
              <h3 className="text-sm font-black text-[var(--ink)]">{chrome.quickNavTitle}</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickNav.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => scrollToSection(item.key)}
                  className={`px-3 py-2 ${dir === "rtl" ? "text-right" : "text-left"} bg-[var(--surface-2)] hover:text-indigo-600 border border-[var(--border)]/35 rounded-2xl text-xs font-bold transition flex items-center justify-between cursor-pointer group active:scale-95 select-none leading-tight`}
                >
                  <span className="font-sans text-[var(--ink)] group-hover:text-indigo-700">
                    {item.label}
                  </span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-[var(--muted)] group-hover:text-indigo-500 ${dir === "rtl" ? "rotate-180" : ""}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Section content blocks */}
          <div className="space-y-4">
            {sections.map((section) => (
              <HelpToggleSection
                key={section.id}
                section={section}
                isOpen={expanded[section.id]}
                onToggle={() => toggleSection(section.id)}
                chrome={chrome}
                dir={dir}
              />
            ))}

            {/* Outro block */}
            <div
              id="help-sec-outro"
              className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100/30 rounded-3xl p-5 text-center shadow-xs space-y-3"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
              </div>
              <h3 className="text-base font-black text-[var(--ink)]">{chrome.outroTitle}</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] max-w-md mx-auto leading-relaxed font-sans font-semibold">
                {chrome.outroBody}
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById("help-page-container")
                      ?.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold font-sans cursor-pointer transition select-none"
                >
                  {chrome.backToToc}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer watermark */}
        <div className="py-6 text-center border-t border-[var(--border)]/20 text-[9px] font-black text-[var(--muted)] uppercase tracking-widest leading-none">
          {chrome.footer}
        </div>
      </div>
    </motion.div>
  );
}
