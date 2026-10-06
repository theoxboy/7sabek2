// facts-quotes.ts
import { type FloussyLocale } from "./localePreference";

export const LOGIN_FACTS: Record<FloussyLocale, string[]> = {
  ar: [
    "المشكل ماشي فالفلوس اللي كتصرف.. المشكل ملي ما كتعرفش فين مشات. الوضوح هو نص الحل.",
    "الفلوس ساهل تخرج حيت ولات غير أرقام فالشاشة.. ملي كتقيد مصاريفك، كترجع لفلوسك قيمتها الحقيقية.",
    "صعيب تواجه الحسابات ملي كتكون مضغوط.. ولكن الدخول لهنا كيعني راك ختاريتي تواجه الواقع بلا هروب.",
    "الفلوس ما كتهربش فالحوايج الكبار.. كتهرب فداك الصرف الصغير اللي ما كنردوش ليه البال.",
    "الهدف من الحساب ماشي الحرمان.. الهدف هو تنعس مرتاح وعارف راسك فين واصل.",
  ],
  fr: [
    "Le problème n’est pas ce que vous dépensez, mais d’ignorer où ça part. La clarté est la moitié de la solution.",
    "L’argent file vite quand il n’est qu’un chiffre sur un écran. En notant vos dépenses, vous lui redonnez sa vraie valeur.",
    "Regarder ses comptes sous pression demande du courage. Vous connecter ici prouve que vous reprenez les commandes.",
    "L’argent ne fuit pas dans les gros achats, mais dans ces petits montants du quotidien qu’on oublie de compter.",
    "Tenir son budget n’est pas une question de privation, mais de tranquillité pour dormir l’esprit serein.",
  ],
  en: [
    "The issue isn't what you spend, but not knowing where it went. Clarity is half the battle.",
    "Money slips away easily when it's just numbers on a screen. Tracking your spending restores its real value.",
    "Facing your finances when stressed is tough. Logging in here proves you're choosing control over avoidance.",
    "Money rarely leaks through major purchases; it slips away in small everyday expenses we overlook.",
    "Budgeting isn't about deprivation; it's about sleeping peacefully knowing exactly where you stand.",
  ],
};

// Index aligné avec new Date().getDay() : 0 = Dimanche, 1 = Lundi, ...
export const REGISTER_DAILY_QUOTES: Record<FloussyLocale, Record<number, string>> = {
  ar: {
    0: "5 دقايق ديال الترتيب اليوم، كتوفّر عليك شهر كامل ديال الحيرة والتخمام.", // Dimanche
    1: "7sabek ماشي سحر كيكثر الفلوس.. 7sabek مراية كتعطيك الحقيقة باش تاخد قرارات أصح.", // Lundi
    2: "ضربتي تمارة باش دخلتي داك الدرهم.. أقل حاجة يستاهلها هو تنتبه فين كيمشي.", // Mardi
    3: "التخمام فالحساب كيعيّي كتر من الصرف نيت.. واجه أرقامك وغادي تلقى الأمور أبسط مما كتخيّل.", // Mercredi
    4: "تصرف ونت عارف شحال باقي، حسن بمية مرة من تصرف وعينيك مغمضين.", // Jeudi
    5: "الصالير يلا ما وجّدتيش ليه فين يمشي.. غادي يلقى بوحدو فين يغبر.", // Vendredi
    6: "وفر على قد جهدك، وصرف على راحتك.. المهم هو تكون نتا اللي متحكم فالقرار.", // Samedi
  },
  fr: {
    0: "5 minutes d’organisation aujourd’hui vous évitent un mois entier de doutes et de stress.",
    1: "7sabek n’est pas une formule magique : c’est le miroir lucide qui éclaire vos meilleures décisions.",
    2: "Chaque dirham est le fruit de vos efforts. Le minimum qu’il mérite, c’est votre attention sur sa destination.",
    3: "Angoisser pour son argent fatigue plus que les dépenses. Posez vos chiffres : tout devient plus simple.",
    4: "Dépenser en sachant exactement ce qu’il reste vaut mille fois mieux que dépenser les yeux fermés.",
    5: "Si vous ne donnez pas une mission claire à votre salaire, il trouvera tout seul le moyen de s’évaporer.",
    6: "Épargnez selon vos moyens et profitez sereinement : l’essentiel est de rester le seul maître à bord.",
  },
  en: {
    0: "5 minutes of planning today saves you a whole month of stress and guesswork.",
    1: "7sabek isn't financial magic: it's the clear mirror that helps you make sound decisions.",
    2: "You worked hard to earn every dirham. The least it deserves is your attention on where it goes.",
    3: "Worrying about money drains more energy than spending it. Look at your numbers: it's simpler than you think.",
    4: "Spending while knowing what's left is a hundred times better than spending blindly.",
    5: "If you don't assign a clear role to your salary, it will find a way to disappear on its own.",
    6: "Save what you can and enjoy guilt-free: what matters most is remaining in total control.",
  },
};

// Fonctions utilitaires
export const getTodayRegisterQuote = (locale: FloussyLocale = "ar"): string => {
  const dayIndex = new Date().getDay();
  const localeQuotes = REGISTER_DAILY_QUOTES[locale] ?? REGISTER_DAILY_QUOTES.ar;
  return localeQuotes[dayIndex] ?? localeQuotes[1];
};

export const getRandomLoginFact = (locale: FloussyLocale = "ar"): string => {
  const list = LOGIN_FACTS[locale] ?? LOGIN_FACTS.ar;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex] ?? list[0];
};
