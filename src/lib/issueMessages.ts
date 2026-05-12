import type { FloussyLocale } from "@/lib/localePreference";
import type { IssueDisplay } from "@/components/ui/IssueAlert";

const ISSUE_COPY: Record<
  string,
  Record<FloussyLocale, IssueDisplay>
> = {
  ENVELOPE_NAME_REQUIRED: {
    fr: {
      title: "Nom d’enveloppe manquant",
      description: "Ajoute un nom clair avant d’enregistrer l’enveloppe.",
      help: "Choisis un nom simple et unique, par exemple Courses, Transport ou Santé.",
    },
    en: {
      title: "Envelope name is missing",
      description: "Add a clear name before saving the envelope.",
      help: "Use a short unique name such as Groceries, Transport, or Health.",
    },
    ar: {
      title: "اسم الظرف ناقص",
      description: "كتب اسم واضح للظرف قبل ما تحفظو.",
      help: "اختار اسم قصير وما يكونش مكرر، بحال الماكلة ولا التنقل ولا الصحة.",
    },
  },
  ENVELOPE_NAME_RESERVED: {
    fr: {
      title: "Nom réservé",
      description: "Ce nom est déjà utilisé par le système.",
      help: "Choisis un autre nom pour éviter toute confusion avec Cash ou Épargne.",
    },
    en: {
      title: "Reserved name",
      description: "This name is already used by the system.",
      help: "Pick another name so it does not conflict with Cash or Savings.",
    },
    ar: {
      title: "هاد الاسم محجوز",
      description: "السيستيم راه كييستعمل هاد الاسم من قبل.",
      help: "بدّل الاسم وخليه مختلف على Cash ولا Epargnes باش ما يوقعش الخلط.",
    },
  },
  ENVELOPE_NAME_EXISTS: {
    fr: {
      title: "Enveloppe déjà existante",
      description: "Une autre enveloppe utilise déjà ce nom ou un nom très proche.",
      help: "Renomme-la ou vérifie ta liste pour éviter deux enveloppes presque identiques.",
    },
    en: {
      title: "Envelope already exists",
      description: "Another envelope already uses the same or a very close name.",
      help: "Rename it or review your envelope list to avoid two confusingly similar envelopes.",
    },
    ar: {
      title: "كاين ظرف بهاد الاسم",
      description: "راه كاين ظرف آخر بنفس الاسم أو باسم قريب بزاف.",
      help: "بدّل الاسم ولا راجع لائحة الأظرفة باش كل ظرف يبقى واضح بوحدو.",
    },
  },
  ENVELOPE_CANNOT_DELETE: {
    fr: {
      title: "Suppression non disponible",
      description: "Cette enveloppe ne peut pas être supprimée de cette manière.",
      help: "Les enveloppes système ou protégées doivent rester disponibles. Modifie plutôt son nom ou ses réglages.",
    },
    en: {
      title: "Delete not allowed",
      description: "This envelope cannot be deleted this way.",
      help: "System or protected envelopes must stay available. Rename it or adjust its settings instead.",
    },
    ar: {
      title: "ما نقدرش نحيدو هاد الظرف",
      description: "هاد الظرف محمي ولا تابع للنظام.",
      help: "الأظرفة النظامية خاصها تبقى. إلا بغيتي تصلح شي حاجة فيه، بدّل الاسم أو الإعدادات ديالو.",
    },
  },
  CATEGORY_NAME_REQUIRED: {
    fr: {
      title: "Nom de catégorie manquant",
      description: "Une catégorie a besoin d’un nom avant d’être ajoutée.",
      help: "Utilise un nom clair comme Restaurants, Salaire ou Santé.",
    },
    en: {
      title: "Category name is missing",
      description: "A category needs a name before it can be added.",
      help: "Use a clear label such as Restaurants, Salary, or Health.",
    },
    ar: {
      title: "اسم الكاتيغوري ناقص",
      description: "خاص الكاتيغوري يكون عندها اسم قبل ما تزيدها.",
      help: "عطيها اسم واضح بحال الماكلة ولا السالاير ولا الصحة.",
    },
  },
  CATEGORY_NAME_EXISTS: {
    fr: {
      title: "Catégorie déjà existante",
      description: "Une autre catégorie utilise déjà ce nom ou un nom très proche.",
      help: "Garde des noms distincts pour que le classement reste simple à comprendre.",
    },
    en: {
      title: "Category already exists",
      description: "Another category already uses the same or a very close name.",
      help: "Keep category names distinct so mappings stay easy to understand.",
    },
    ar: {
      title: "كاينة كاتيغوري بهاد الاسم",
      description: "راه كاينة كاتيغوري أخرى بنفس الاسم أو باسم قريب بزاف.",
      help: "خلي كل كاتيغوري باسم واضح ومختلف على الباقي باش الربط ما يتخلطش عليك.",
    },
  },
  CATEGORY_HAS_TRANSACTIONS: {
    fr: {
      title: "Catégorie déjà utilisée",
      description: "Cette catégorie ne peut pas être supprimée car des opérations l’utilisent déjà.",
      help: "Renomme-la ou cesse de l’utiliser plutôt que de la supprimer directement.",
    },
    en: {
      title: "Category is already used",
      description: "This category cannot be deleted because transactions already use it.",
      help: "Rename it or stop using it instead of deleting it directly.",
    },
    ar: {
      title: "هاد الكاتيغوري مستعملة دابا",
      description: "ما نقدرش نحيدوها حيت كاينين عمليات مسجلين بها.",
      help: "إما بدّل الاسم ديالها، أو خليهـا ووقف الاستعمال ديالها من بعد.",
    },
  },
  CATEGORY_MAPPING_TO_CASH_FORBIDDEN: {
    fr: {
      title: "Lien non adapté",
      description: "Une catégorie ne peut pas être reliée directement à Cash.",
      help: "Cash reste la réserve centrale des mouvements, pas une enveloppe directe de dépense.",
    },
    en: {
      title: "Invalid mapping target",
      description: "A category cannot be mapped directly to Cash.",
      help: "Cash is the money pool, not a spending envelope target.",
    },
    ar: {
      title: "هاد الربط ما مناسبش",
      description: "ما نقدرش نربط الكاتيغوري بظرف Cash.",
      help: "Cash هو البلاصة اللي كتجمع فيها الفلوس، ماشي ظرف مباشر للمصاريف.",
    },
  },
  CATEGORY_MAPPING_TO_SAVINGS_FORBIDDEN: {
    fr: {
      title: "Lien non adapté",
      description: "Une catégorie ne peut pas être reliée à l’enveloppe d’épargne par défaut.",
      help: "Cette enveloppe sert à recevoir et regrouper le reste, pas à classer directement les dépenses.",
    },
    en: {
      title: "Invalid mapping target",
      description: "A category cannot be mapped to the default savings envelope.",
      help: "Default savings is meant to receive leftovers, not direct category spending.",
    },
    ar: {
      title: "هاد الربط ما مناسبش",
      description: "ما نقدرش نربط الكاتيغوري بظرف الادخار الافتراضي.",
      help: "هاد الظرف خاصو يبقى للتجميع، ماشي باش نربطو به المصاريف مباشرة.",
    },
  },
  CATEGORY_MAPPING_TO_GOAL_FORBIDDEN: {
    fr: {
      title: "Lien non adapté",
      description: "Une catégorie ne peut pas être reliée à une enveloppe d’objectif.",
      help: "Choisis une enveloppe normale de dépense et garde les enveloppes d’objectif pour l’épargne.",
    },
    en: {
      title: "Invalid mapping target",
      description: "A category cannot be mapped to a goal envelope.",
      help: "Use a regular spending envelope and keep goal envelopes for saving progress.",
    },
    ar: {
      title: "هاد الربط ما مناسبش",
      description: "ما نقدرش نربط الكاتيغوري بظرف تابع لهدف.",
      help: "اختار ظرف عادي ديال المصروف، وخلي ظرف الهدف غير للتوفير والتقدم.",
    },
  },
  GOAL_NAME_REQUIRED: {
    fr: {
      title: "Nom d’objectif manquant",
      description: "Un objectif a besoin d’un nom clair avant d’être enregistré.",
      help: "Par exemple : Fonds d’urgence, Voyage d’été ou Remplacement de voiture.",
    },
    en: {
      title: "Goal name is missing",
      description: "A goal needs a clear name before it can be saved.",
      help: "Examples: Emergency fund, Summer trip, Replace the car.",
    },
    ar: {
      title: "اسم الهدف ناقص",
      description: "خاص الهدف يكون عندو اسم واضح قبل ما يتحفظ.",
      help: "مثال: صندوق الطوارئ، سفر الصيف، ولا تبديل الطوموبيل.",
    },
  },
  GOAL_NAME_RESERVED: {
    fr: {
      title: "Nom d’objectif non valide",
      description: "Ce nom est réservé par le système et ne peut pas servir pour un objectif.",
      help: "Choisis un nom qui décrit clairement ce pour quoi tu épargnes.",
    },
    en: {
      title: "Invalid goal name",
      description: "This name is reserved by the system and cannot be used for a goal.",
      help: "Use a real goal name that describes what you are saving for.",
    },
    ar: {
      title: "اسم الهدف ما صالحش",
      description: "هاد الاسم محجوز من طرف النظام وما يصلحش للهدف.",
      help: "بدّل الاسم وخليه كيعبر بوضوح على شنو باغي تجمع ليه.",
    },
  },
  GOAL_NAME_EXISTS: {
    fr: {
      title: "Nom d’objectif déjà utilisé",
      description: "Un autre objectif ou une autre enveloppe utilise déjà ce nom.",
      help: "Choisis un nom plus précis pour éviter toute confusion avec le reste du budget.",
    },
    en: {
      title: "Goal name already used",
      description: "Another goal or envelope already uses this name.",
      help: "Pick a more specific name so it does not conflict with existing envelopes or goals.",
    },
    ar: {
      title: "اسم الهدف مكرر",
      description: "كاين هدف أو ظرف آخر بهاد الاسم من قبل.",
      help: "خلي اسم الهدف مختلف باش ما يتخلطش عليك مع الأظرفة أو الأهداف الآخرين.",
    },
  },
  GOAL_ENVELOPE_NOT_FOUND: {
    fr: {
      title: "Objectif à vérifier",
      description: "L’enveloppe liée à cet objectif est introuvable.",
      help: "Rafraîchis la page puis vérifie les enveloppes et les objectifs si le problème continue.",
    },
    en: {
      title: "Goal needs review",
      description: "The linked envelope could not be found.",
      help: "This is an internal mismatch. Refresh and review the related envelope if needed.",
    },
    ar: {
      title: "الهدف خاصو مراجعة",
      description: "ما لقيناش الظرف المرتابط بهاد الهدف.",
      help: "هادشي مشكل داخلي. عاود حدّث الصفحة، وإذا بقا المشكل راجع الأظرفة والأهداف.",
    },
  },
};

function fallbackIssue(locale: FloussyLocale, message: string): IssueDisplay {
  if (locale === "ar") {
    return {
      title: "وقع مشكل",
      description: message,
      help: "راجع المعطيات اللي دخلتي وحاول من جديد. إلا بقى نفس المشكل، صلح العنصر المرتابط بهاد العملية.",
    };
  }
  if (locale === "fr") {
    return {
      title: "Un problème est survenu",
      description: message,
      help: "Vérifie les informations saisies et réessaie. Si le problème continue, corrige l’élément lié à cette action.",
    };
  }
  return {
    title: "Something went wrong",
    description: message,
    help: "Review the entered data and try again. If it keeps failing, fix the related item first.",
  };
}

export function getIssueDisplay(
  message: string | null | undefined,
  locale: FloussyLocale
): IssueDisplay | null {
  if (!message) return null;
  const trimmed = message.trim();
  if (!trimmed) return null;
  return ISSUE_COPY[trimmed]?.[locale] ?? fallbackIssue(locale, trimmed);
}
