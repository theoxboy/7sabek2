"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

/* ------------------------------------------------------------------ */
/*  Help copy (Darija / Arabic only)                                  */
/* ------------------------------------------------------------------ */
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

const HELP_CONTENT: HelpSection[] = [
  {
    id: "intro",
    number: "01",
    numberBg: "bg-indigo-50",
    numberText: "text-indigo-600",
    title: "كيفاش تقرا هاد الدليل",
    blocks: [
      {
        borderColor: "border-indigo-500",
        icon: "📖",
        title: "هذا هو الدليل",
        items: [
          "هاد الصفحة كتلخص دور كل سكرين، الأزرار المهمة، والخطوات الرئيسية. حل غير الجزء اللي محتاج دابا.",
          "كل سكرين عندها شلا خطوات وأزرار كتساعدك تمشي فالميزانية ديالك بطريقة صحيحة.",
        ],
      },
    ],
  },
  {
    id: "dashboard",
    number: "02",
    numberBg: "bg-emerald-50",
    numberText: "text-emerald-600",
    title: "لوحة القيادة — شنو كتدير",
    blocks: [
      {
        borderColor: "border-indigo-500",
        icon: "⭐️",
        title: "الفوق والأكشنات",
        items: [
          "لوحة القيادة كتعطيك النظرة العامة ديال الفترة اللي خدام بها دابا.",
          "تقدر تبدل الفترة، تزيد مصروف، ولا تزيد دخل.",
          "إلا كان شي دخل خاصو تصريح، sweep خاصو يتدار، ولا mapping ناقص، كيبان فوق.",
        ],
      },
      {
        borderColor: "border-emerald-500",
        icon: "💳",
        title: "الكارطات الرئيسية",
        items: [
          "لكاش المتوفر: فلوس مازال ما توزعاتش لشي ظرف معين.",
          "مصاريف الفترة: المصاريف الإجمالية المرتبطة بالفترة الحالية.",
          "دخل الفترة والصافي: قراءة سريعة للحالة المالية وسالير ديالك دابا.",
        ],
      },
      {
        borderColor: "border-amber-500",
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
  {
    id: "operations",
    number: "03",
    numberBg: "bg-indigo-50",
    numberText: "text-indigo-600",
    title: "العمليات — شنو كيدير هاد السكرين",
    blocks: [
      {
        borderColor: "border-indigo-500",
        icon: "🔄",
        title: "إنشاء عملية جديدة",
        items: [
          "اختار نوع العملية: مصروف (Dépense) ولا دخل (Revenu).",
          "حدد الصنف المناسب، المبلغ، تاريخ العملية، والوصف إلا بغيتي توضيح.",
          "الدخل كيمشي ديما لحساب الكاش المتوفر، والمصروف كيأثر على رصيد الظرف غير إلا كان داك الصنف مربوط بيه بشكل مباشر.",
        ],
      },
      {
        borderColor: "border-teal-500",
        icon: "⚠️",
        title: "التنبيهات والمساعدة التلقائية",
        items: [
          "الصفحة كتنبهك إلا ما كايناش أصناف (Catégories) مناسبة للنوع اللي اخترتي دابا.",
          "فحال إلا كان النوع دخل، تقدر تبان ليك مميزات محاكاة التوزيع على الأظرفة قبل ما تأكد العملية بشكل نهائي.",
          "أي أخطاء عادية ديال الإنشاء، مشكل فالحجم، ولا الحذف كتبان مباشرة فالشريط الفوقاني.",
        ],
      },
      {
        borderColor: "border-rose-500",
        icon: "🗂️",
        title: "أرشيف وسجل العمليات",
        items: [
          "سجل الفواتير والعمليات فيه فلترة متقدمة حسب تاريخ العملية، النوع، الصنف (Catégorie)، والبحث النصي السريع.",
          "كل عملية فالسجل تقدر تبدلها، تصححها ولا تحذفها نهائياً.",
          "الحذف كيمسح الأثر ديال العملية تلقائياً من الكاش المتوفر ومن الأظرفة المربوطة.",
        ],
      },
    ],
  },
  {
    id: "envelopes",
    number: "04",
    numberBg: "bg-emerald-50",
    numberText: "text-emerald-600",
    title: "الأظرفة — شنو كيدير هاد السكرين",
    blocks: [
      {
        borderColor: "border-indigo-500",
        icon: "📬",
        title: "اللائحة الرئيسية",
        items: [
          "كل كارت كيبين اسم الظرف (Enveloppe) وباقي الرصيد الحالي ديالو بدقة.",
          "الكاش والادخار: هادو أظرفة النظام (System Envelopes) أساسيين ومبرمجين لتخزين السيولة والادخار ولا يمكن حذفهم.",
          "تقدر تضغط على تفاصيل أي ظرف، تصحح رصيده مباشرة، تبدل خيارات الترحيل، ولا تحذف الأظرفة العادية للي مسموح بها.",
        ],
      },
      {
        borderColor: "border-emerald-500",
        icon: "➕",
        title: "الإنشاء والتخصيص الفوري",
        items: [
          "تقدر تزيد ظرف مخصص بالخطوة، وإلا تستعمل باقات جاهرة من الأظرفة لتوفير الوقت.",
          "التخصيص الفوري: ميزة لنقل أو توزيع مبلغ من الكاش لظرف معين دفعة واحدة لتغذية ميزانيته.",
        ],
      },
      {
        borderColor: "border-amber-500",
        icon: "📈",
        title: "تفاصيل حركة الظرف والترحيل الجاي",
        items: [
          "البانيل الجانبي كيبين لك الفترات القديمة، الأنشطة الأخيرة، والتحويلات اللي دازت.",
          "الترحيل شاعل (Report On): كيخلي ما تبقى من الميزانية فداك الظرف يدوز ويزيد على ميزانية دالشهر أو الفترة الجاية تلقائياً.",
          "الترحيل طافي (Report Off): كيرجع الباقي من الظرف مباشرة للكاش الإجمالي مع بداية الفترة الجاية باش تبدا بزيرو.",
        ],
      },
    ],
  },
  {
    id: "categories",
    number: "05",
    numberBg: "bg-indigo-50",
    numberText: "text-indigo-600",
    title: "الأصناف — شنو كيدير هاد السكرين",
    blocks: [
      {
        borderColor: "border-indigo-500",
        icon: "🏷️",
        title: "إنشاء وتحديد الأنواع",
        items: [
          "تقدر تزيد صنف جديد وتحدد نوعه: مخصص فقط للمصاريف، للدخل، ولا هما بجوج.",
          "كاينين باقات سريعة كتزيد ليك بزاف ديال الأصناف الشائعة (بحال كراء، تغذية، نقل) بكليك وحدة.",
          "تقدر تزيد صنف دابا وتخليه بلا ربط حتى تحتاجو من بعد.",
        ],
      },
      {
        borderColor: "border-emerald-500",
        icon: "🔗",
        title: "ربط الأصناف بالأظرفة",
        items: [
          "كل صنف يقدر يتربط بظرف مالي محدد أو يبقى مستقل.",
          "هاد الربط هو المحرك والأساس اللي كيخلي المصاريف المصنفة تمشي أوتوماتيكياً للظرف وتقلل الميزانية ديالو.",
          "الفلترات الذكية بحال 'تلقائي / مصروف / دخل' كتسهل تصحيح وتعديل أنواع الأصناف إلا تلفات.",
        ],
      },
      {
        borderColor: "border-rose-500",
        icon: "⚙️",
        title: "صيانة وحذف الأصناف",
        items: [
          "تقدر تبدل سمية أي صنف، تعدل الظرف المربوط بيه، ولا تمسحو تماماً.",
          "المسح الجماعي كيمحيلك بزاف د الأصناف بلمسة وحدة لتنظيف الـ setup ديالك.",
          "خانة البحث السريعة كتخليك تلقى أي صنف حتى ولو كان السجل طويل بزاف.",
        ],
      },
    ],
  },
  {
    id: "distribution",
    number: "06",
    numberBg: "bg-emerald-50",
    numberText: "text-emerald-600",
    title: "التوزيع — شنو كيدير هاد السكرين",
    blocks: [
      {
        borderColor: "border-indigo-500",
        icon: "🎯",
        title: "دور صفحة توزيع الدخل",
        items: [
          "هاد الصفحة هي اللي كتحدد كيفاش الدخل المصرح به (بحال السالار) غادي يتقسم ويتفرق بشكل أوتوماتيكي بين الأظرفة والاهداف الإدخارية اللي عندك.",
          "عند الدخول، زر الإعداد كيفتح المساعد البصري لبرمجة طريقة توزيع فلوسك.",
          "تقدر تفعل، تلغي، تعدل، ولا تمسح إعدادت التوزيع المسجلة مسبقاً.",
        ],
      },
      {
        borderColor: "border-emerald-500",
        icon: "⚖️",
        title: "قواعد التوزيع الذكي",
        items: [
          "المبلغ الثابت: كارت لإعطاء ظرف معين مبلغاً ثابتاً كل شهر (بحال الكراء: 3000 درهم).",
          "النسبة المئوية: كارت لتوزيع الباقي من الدخل بالنسبة المئوية، إما بالتساوي أو حسب الأهمية والأولوية بين الأظرفة.",
          "حتى الأهداف والادخارات الإستراتيجية كتاخد حصتها من التوزيع بحالها بحال الأظرفة العادية.",
        ],
      },
      {
        borderColor: "border-amber-500",
        icon: "🧪",
        title: "المحاكاة الفورية",
        items: [
          "المحاكاة المحلية كتبين بدقة شحال غياخد كل ظرف وشحال غيبقا كباقي ما توزعش قبل التطبيق الحقيقي.",
          "تقدر تحفظ الإعدادات المحلية وتعطيها إسم باش تبقا مرجع (بحال: ميزانية الصيف).",
          "التطبيق النهائي كيرسل القواعد اللي مفعلة مباشرة للباكيند ليطبق التوزيع فور حط الدخل جديد.",
        ],
      },
    ],
  },
  {
    id: "sweeps",
    number: "07",
    numberBg: "bg-indigo-50",
    numberText: "text-indigo-600",
    title: "السويبات — شنو كيدير هاد السكرين",
    blocks: [
      {
        borderColor: "border-indigo-500",
        icon: "🗓️",
        title: "تذكيرات الدخل المتكرر",
        items: [
          "التذكيرات كتعاونك ما تنساش تصرح بالسالير أو المداخيل المتكررة وحساب الربح الإجمالي.",
          "تقدر تحدد التكرار و التردد: شهري، أسبوعي، كل 15 يوم، أو فـتاريخ محدد وثابت.",
          "الصفحة كتبين ليك التاريخ المتوقع الجاي بشكل تلقائي وجميل.",
        ],
      },
      {
        borderColor: "border-emerald-500",
        icon: "🧹",
        title: "علاقة التذكيرات بـ Sweep",
        items: [
          "تنفيذ الـ Sweep كيتدار فاش كيوصل تذكير الدخل المصرح به وتكون دازت المدة.",
          "الأظرفة للي ترحيلها طافي: كيرجع الباقي الفايت ديالها للادخار باش تصفى.",
          "الأظرفة للي ترحيلها شاعل: كتحافظ على الباقي كإضافة على ميزانيتها الجديدة.",
        ],
      },
      {
        borderColor: "border-amber-500",
        icon: "⚙️",
        title: "الأكشنات اللي كيبانو",
        items: [
          "كل تذكير تقدر تعلم عليه كمصرح به (Revenu Déclaré) لتبدأ الدورة الجديدة، أو تمسحو.",
          "من بعد تنفيذ الـ sweep كتشوف ملخص الفترات اللي تسدات ومجموع المبالغ اللي تحولت.",
          "زر المعلومات كيعطيك شرح دقيق وتفصيلي للمنطق العام ديال السويبات فـ 7sabek.",
        ],
      },
    ],
  },
  {
    id: "reports",
    number: "08",
    numberBg: "bg-emerald-50",
    numberText: "text-emerald-600",
    title: "التقارير — شنو كيدير هاد السكرين",
    blocks: [
      {
        borderColor: "border-indigo-500",
        icon: "📊",
        title: "التقارير والرسوم البيانية الملونة",
        items: [
          "كتعطيك نظرة بصرية مباشرة بالـ (Interactive Charts) على فين وفاش كيمشيو فلوسك والمصاريف ديالك كل فترة.",
          "كيبينو ليك التقسيم المئوي لكل ظرف وصنف باش تعرف شكون كياكل ليك الميزانية والسيولة بزاف.",
          "كتوضح ليك متوسط الإدخار والالتزام بقواعد ميزانيتك.",
        ],
      },
      {
        borderColor: "border-emerald-500",
        icon: "📅",
        title: "مقارنة الفترات السابقة",
        items: [
          "تقدر تقارن بين الفترات والشهور اللي فاتت وتشوف واش مصاريفك طلعات ولا نزلات.",
          "كتساعدك بزاف تحسن التخطيط للشهر الجاي، وتوفر فلوس كتر مع مرور الوقت.",
        ],
      },
    ],
  },
  {
    id: "settings",
    number: "09",
    numberBg: "bg-indigo-50",
    numberText: "text-indigo-600",
    title: "الإعدادات — شنو كيدير هاد السكرين",
    blocks: [
      {
        borderColor: "border-indigo-500",
        icon: "⚙️",
        title: "تخصيص تفضيلات حسابك",
        items: [
          "الإعدادات كتسير ليك العملة الافتراضية (MAD/درهم مروكي)، المدة المعتمدة بين السويبات، ومعلومات البروفيل.",
          "إرجاع البداية (Onboarding) لتحديث ومراجعة أساسيات حسابك وأهدافك من الزيرو.",
          "أي تغيير كتحفظ وتتسجل فالحين وبشكل آمن تماماً.",
        ],
      },
      {
        borderColor: "border-emerald-500",
        icon: "💾",
        title: "إعدادات الجهاز وعمليات التصدير",
        items: [
          "تفعيل الثيم الفاتح / الداكن وتخزين التفضيل محلياً على جهازك لراحة العين.",
          "تصدير البيانات (Export Data): خيار لتحميل وحفظ سجل حسابك بصيغة ملف للاحتفاظ بنسخة احتياطية.",
          "شارة التغييرات كتعلمك مباشرة واش كاع العمليات والخصائص للي درتي تم الحفظ ديالها.",
        ],
      },
      {
        borderColor: "border-rose-500",
        icon: "🚨",
        title: "المنطقة الحساسة (Zone Dangereuse)",
        items: [
          "تصفير البيانات: كيمسح الداتا والسجلات ولكن كيخلي معلومات حسابك باش تبدا ميزانية خاوية وصافية.",
          "حذف الحساب نهائياً: كيهدم الحساب ويمسح بروفيلك وكاع الداتا المرتبطة بيه ولا يمكن التراجع عليها.",
          "هاد الأكشن كتحتاج كود أو تأكيد صريح منك قبل التنفيذ لتفادي الأخطاء.",
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Quick‑nav items                                                   */
/* ------------------------------------------------------------------ */
const QUICK_NAV: Array<{ key: HelpSectionId; label: string }> = [
  { key: "intro", label: "كيفاش تقرا هاد الدليل" },
  { key: "dashboard", label: "لوحة القيادة" },
  { key: "operations", label: "العمليات" },
  { key: "envelopes", label: "الأظرفة" },
  { key: "categories", label: "الأصناف" },
  { key: "distribution", label: "التوزيع" },
  { key: "sweeps", label: "السويبات" },
  { key: "reports", label: "التقارير" },
  { key: "settings", label: "الإعدادات" },
  { key: "outro", label: "نهاية الدليل" },
];

/* ------------------------------------------------------------------ */
/*  Help Section Toggle Component                                     */
/* ------------------------------------------------------------------ */
function HelpToggleSection({
  section,
  isOpen,
  onToggle,
}: {
  section: HelpSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      id={`help-sec-${section.id}`}
      className="bg-white border border-slate-200/50 rounded-3xl shadow-xs overflow-hidden transition-all duration-300"
    >
      <div
        onClick={onToggle}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-lg ${section.numberBg} ${section.numberText} flex items-center justify-center font-black text-xs font-sans`}
          >
            {section.number}
          </div>
          <h3 className="text-sm xs:text-base font-black text-slate-900 leading-none">
            {section.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
            {isOpen ? "سد" : "حل"}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
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
            className="border-t border-slate-100 p-4 sm:p-5 text-slate-700 space-y-4 text-xs xs:text-sm font-semibold font-sans leading-relaxed"
          >
            {section.blocks.map((block) => (
              <div key={block.title} className={`border-r-4 ${block.borderColor} pr-3`}>
                <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                  {block.icon} {block.title}
                </h4>
                <ul className="list-disc list-inside mr-2 mt-1 space-y-1 text-slate-600">
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
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold font-sans cursor-pointer transition select-none"
              >
                سد القسم
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
                رجع للفوق ↑
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

  const toggleSection = useCallback((id: HelpSectionId) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const scrollToSection = useCallback((id: HelpSectionId) => {
    const el = document.getElementById(`help-sec-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <motion.div
      key="help-page"
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 25 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="w-full min-h-screen z-10 flex flex-col bg-slate-50 text-slate-900 overflow-y-auto"
      id="help-page-container"
      dir="rtl"
    >
      <div className="w-full min-h-screen flex flex-col relative bg-white/40 backdrop-blur-3xl">
        {/* Header / Title bar (no back, no chat button) */}
        <div className="p-3.5 xs:p-5 border-b border-slate-200/40 bg-white/50 flex items-center justify-center gap-2 sticky top-0 z-30 backdrop-blur-md">
          <div className="text-center min-w-0">
            <h2 className="text-xs xs:text-sm sm:text-lg font-black tracking-tight text-slate-950 flex items-center justify-center gap-1.5 leading-none">
              <BookOpen className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
              <span>المساعدة — دليل المنصة</span>
            </h2>
            <p className="hidden xs:block text-[8px] sm:text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
              دليل مبسط خطوة بخطوة لكل سكرين بالمنصة
            </p>
          </div>
        </div>

        {/* Main content body */}
        <div className="max-w-4xl mx-auto w-full p-4 xs:p-5 sm:p-6 space-y-6">
          {/* Hero introduction banner */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/40 rounded-3xl p-5 sm:p-6 text-emerald-950 shadow-xs relative overflow-hidden">
            <div className="absolute -left-10 -bottom-10 opacity-5 sm:opacity-10 transform -rotate-12 select-none pointer-events-none">
              <BookOpen className="w-48 h-48 text-emerald-700" />
            </div>

            <div className="flex items-center gap-2.5 mb-2 relative z-10 font-sans">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                <HelpCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-sans font-black text-xs sm:text-sm tracking-wider uppercase bg-emerald-600/10 text-emerald-800 px-2.5 py-1 rounded-full">
                المساعدة والدعم
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-emerald-950 leading-tight">
              فهم كل سكرين فمنصة 7sabek
            </h1>
            <p className="text-xs sm:text-sm text-emerald-800 mt-2 font-semibold font-sans leading-relaxed">
              دليل مبسط كيجمع شنو كيدير كل سكرين فالمنصة. حل غير السكرين اللي محتاج دابا
              وتعرف على أهم الخصائص والأزرار لتسير ميزانيتك بكل سهولة!
            </p>
          </div>

          {/* Table of Content (Quick links) Section */}
          <div className="bg-white border border-slate-200/50 rounded-3xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-2.5 mb-3.5">
              <Activity className="w-4 h-4 text-indigo-500 stroke-[2.5]" />
              <h3 className="text-sm font-black text-slate-900">🚀 تنقل سريع — سير مباشرة للقسم اللي محتاجو</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_NAV.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.key === "outro") {
                      const outro = document.getElementById("help-sec-outro");
                      if (outro) outro.scrollIntoView({ behavior: "smooth", block: "start" });
                    } else {
                      scrollToSection(item.key);
                    }
                  }}
                  className="px-3 py-2 text-right bg-slate-50 hover:bg-slate-100 hover:text-indigo-600 border border-slate-200/35 rounded-2xl text-xs font-bold transition flex items-center justify-between cursor-pointer group active:scale-95 select-none leading-tight"
                >
                  <span className="font-sans text-slate-700 group-hover:text-indigo-700">
                    {item.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transform rotate-180" />
                </button>
              ))}
            </div>
          </div>

          {/* Section Content blocks */}
          <div className="space-y-4">
            {HELP_CONTENT.map((section) => (
              <HelpToggleSection
                key={section.id}
                section={section}
                isOpen={expanded[section.id]}
                onToggle={() => toggleSection(section.id)}
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
              <h3 className="text-base font-black text-slate-900">نهاية دليل 7sabek</h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed font-sans font-semibold">
                تقدر ترجع للوحة القيادة ولا تحل أي قسم من جديد فاش بغيت. ميزانيتك وبيانات
                مصفية دابا مع 7sabek 🪙 !
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
                  رجع للفوق للفهرس ↑
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer watermark */}
        <div className="py-6 text-center border-t border-slate-200/20 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
          7sabek Guide — 7sabek lflous 🪙 2026
        </div>
      </div>
    </motion.div>
  );
}
