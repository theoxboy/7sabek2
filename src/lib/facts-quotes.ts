// facts-quotes.ts

export const LOGIN_FACTS = [
  "المشكل ماشي فالفلوس اللي كتصرف.. المشكل ملي ما كتعرفش فين مشات. الوضوح هو نص الحل.",
  "الفلوس ساهل تخرج حيت ولات غير أرقام فالشاشة.. ملي كتقيد مصاريفك، كترجع لفلوسك قيمتها الحقيقية.",
  "صعيب تواجه الحسابات ملي كتكون مضغوط.. ولكن الدخول لهنا كيعني راك ختاريتي تواجه الواقع بلا هروب.",
  "الفلوس ما كتهربش فالحوايج الكبار.. كتهرب فداك الصرف الصغير اللي ما كنردوش ليه البال.",
  "الهدف من الحساب ماشي الحرمان.. الهدف هو تنعس مرتاح وعارف راسك فين واصل.",
];

// Index aligné avec new Date().getDay() : 0 = Dimanche, 1 = Lundi, ...
export const REGISTER_DAILY_QUOTES: Record<number, string> = {
  0: "5 دقايق ديال الترتيب اليوم، كتوفّر عليك شهر كامل ديال الحيرة والتخمام.", // Dimanche
  1: "7sabek ماشي سحر كيكثر الفلوس.. 7sabek مراية كتعطيك الحقيقة باش تاخد قرارات أصح.", // Lundi
  2: "ضربتي تمارة باش دخلتي داك الدرهم.. أقل حاجة يستاهلها هو تنتبه فين كيمشي.", // Mardi
  3: "التخمام فالحساب كيعيّي كتر من الصرف نيت.. واجه أرقامك وغادي تلقى الأمور أبسط مما كتخيّل.", // Mercredi
  4: "تصرف ونت عارف شحال باقي، حسن بمية مرة من تصرف وعينيك مغمضين.", // Jeudi
  5: "الصالير يلا ما وجّدتيش ليه فين يمشي.. غادي يلقى بوحدو فين يغبر.", // Vendredi
  6: "وفر على قد جهدك، وصرف على راحتك.. المهم هو تكون نتا اللي متحكم فالقرار.", // Samedi
};

// Fonctions utilitaires
export const getTodayRegisterQuote = (): string => {
  const dayIndex = new Date().getDay();
  return REGISTER_DAILY_QUOTES[dayIndex] ?? REGISTER_DAILY_QUOTES[1];
};

export const getRandomLoginFact = (): string => {
  const randomIndex = Math.floor(Math.random() * LOGIN_FACTS.length);
  return LOGIN_FACTS[randomIndex] ?? LOGIN_FACTS[0];
};
