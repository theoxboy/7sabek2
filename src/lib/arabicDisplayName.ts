export function containsArabicScript(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

function transliterateLatinTokenToArabic(token: string): string {
  const normalized = token
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  if (!normalized) return token;

  const dictionary: Record<string, string> = {
    omar: "عمر",
    amine: "أمين",
    amin: "أمين",
    ahmed: "أحمد",
    mohamed: "محمد",
    mohammad: "محمد",
    mohammed: "محمد",
    muhammad: "محمد",
    youssef: "يوسف",
    youcef: "يوسف",
    yassine: "ياسين",
    yasine: "ياسين",
    mehdi: "مهدي",
    mahdi: "مهدي",
    rachid: "رشيد",
    rachidh: "رشيد",
    khalid: "خالد",
    karim: "كريم",
    adil: "عادل",
    adel: "عادل",
    reda: "رضا",
    rida: "رضا",
    zakaria: "زكريا",
    zakariya: "زكريا",
    fatima: "فاطمة",
    khadija: "خديجة",
    idrissi: "إدريسي",
    drissi: "دريسي",
    elidrissi: "الإدريسي",
    alidrissi: "الإدريسي",
    elalami: "العلامي",
    alaoui: "العلوي",
    elhajji: "الحاجي",
    benali: "بن علي",
    kamili: "كاميلي",
  };

  if (dictionary[normalized]) return dictionary[normalized];

  const pairs: Array<[string, string]> = [
    ["eau", "و"],
    ["ou", "و"],
    ["oo", "و"],
    ["aa", "ا"],
    ["ee", "ي"],
    ["ii", "ي"],
    ["kh", "خ"],
    ["gh", "غ"],
    ["ch", "ش"],
    ["sh", "ش"],
    ["th", "ت"],
    ["dh", "د"],
    ["ph", "ف"],
    ["oua", "وا"],
    ["wa", "وا"],
    ["qu", "ك"],
    ["ck", "ك"],
    ["dj", "ج"],
  ];

  const singleMap: Record<string, string> = {
    a: "ا",
    b: "ب",
    c: "ك",
    d: "د",
    e: "ي",
    f: "ف",
    g: "غ",
    h: "ه",
    i: "ي",
    j: "ج",
    k: "ك",
    l: "ل",
    m: "م",
    n: "ن",
    o: "و",
    p: "ب",
    q: "ق",
    r: "ر",
    s: "س",
    t: "ت",
    u: "و",
    v: "ف",
    w: "و",
    x: "كس",
    y: "ي",
    z: "ز",
  };

  let rest = normalized;
  let result = "";
  while (rest.length > 0) {
    const pair = pairs.find(([needle]) => rest.startsWith(needle));
    if (pair) {
      result += pair[1];
      rest = rest.slice(pair[0].length);
      continue;
    }
    const char = rest[0];
    result += singleMap[char] ?? char;
    rest = rest.slice(1);
  }

  return result;
}

export function getArabicDisplayName(rawName: string): string {
  const normalized = rawName.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  if (containsArabicScript(normalized)) return normalized;
  return normalized
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => transliterateLatinTokenToArabic(part))
    .join(" ");
}
