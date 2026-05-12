import type { FloussyLocale } from "@/lib/localePreference";

const norm = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const isPrefix = (value: string, prefixes: string[]) =>
  prefixes.some((prefix) => value.startsWith(prefix));

export function localizeEnvelopeLabel(name: string, locale: FloussyLocale): string {
  const normalized = norm(name);

  if (locale === "ar") {
    if (["cash"].includes(normalized)) return "لكاش";
    if (["epargnes", "epargne", "savings"].includes(normalized)) return "الادخار";
    if (["nourriture", "food", "courses"].includes(normalized)) return "الماكلة";
    if (["sante", "health", "pharmacie"].includes(normalized)) return "الصحة";
    if (["charges", "housing costs", "housing"].includes(normalized)) return "مصاريف السكن";
    if (["factures", "bills", "utilities"].includes(normalized)) return "لفواتير";
    if (["loyer", "rent"].includes(normalized)) return "الكراء";
    if (["transport public", "public transport"].includes(normalized)) return "النقل العمومي";
    if (["transport"].includes(normalized)) return "التنقل";
    if (["carburant", "fuel"].includes(normalized)) return "الوقود";
    if (["assurance auto", "car insurance"].includes(normalized)) return "تأمين السيارة";
    if (["entretien auto", "vehicle maintenance", "entretien vehicule", "entretien véhicule"].includes(normalized)) {
      return "صيانة السيارة";
    }
    if (["parking"].includes(normalized)) return "موقف السيارة";
    if (["credit auto", "crédit auto", "auto loan"].includes(normalized)) return "قرض السيارة";
    if (["credit", "crédit"].includes(normalized)) return "كريدي";
    if (["controle technique", "contrôle technique", "technical inspection"].includes(normalized)) {
      return "الفحص التقني";
    }
    if (["taxe auto", "car tax"].includes(normalized)) return "ضريبة السيارة";
    if (["carburant 2 roues", "bike fuel", "moto fuel"].includes(normalized)) return "وقود الدراجة";
    if (["assurance 2 roues", "bike insurance", "moto insurance"].includes(normalized)) {
      return "تأمين الدراجة";
    }
    if (["entretien 2 roues", "bike maintenance", "moto maintenance"].includes(normalized)) {
      return "صيانة الدراجة";
    }
    if (["taxi / vtc", "taxi/vtc", "taxi", "vtc"].includes(normalized)) return "تاكسي / نقل خاص";
    if (["aide famille", "famille — aide", "family support", "family — support"].includes(normalized)) {
      return "مساعدة العائلة";
    }
    if (["loisirs", "leisure", "fun"].includes(normalized)) return "الترفيه";
    if (["restaurants", "restaurant"].includes(normalized)) return "المطاعم";
    if (["shopping"].includes(normalized)) return "التسوق";
    if (
      ["imprevus / طوارئ", "imprevus", "urgences", "emergency", "emergencies"].includes(normalized) ||
      normalized.startsWith("imprevus /") ||
      normalized.includes("طوار")
    ) {
      return "الطوارئ";
    }
    if (["flexibilite", "flexibility", "flex"].includes(normalized)) return "المرونة";
    if (["equilibre", "balance"].includes(normalized)) return "التوازن";

    if (isPrefix(name, ["Dettes — ", "Dettes - ", "Debts — ", "Debts - "])) {
      const suffix = name.replace(/^Dettes\s*[—-]\s*|^Debts\s*[—-]\s*/u, "");
      return `الديون — ${localizeEnvelopeLabel(suffix, "ar")}`;
    }
    if (isPrefix(name, ["Objectif — ", "Objectif - ", "Goal — ", "Goal - "])) {
      const suffix = name.replace(/^Objectif\s*[—-]\s*|^Goal\s*[—-]\s*/u, "");
      return `الهدف — ${suffix}`;
    }
    if (normalized === "master") return "الهدف — master";

    if (name.startsWith("Carburant (")) return name.replace(/^Carburant\s*/u, "الوقود ");
    if (name.startsWith("Assurance auto (")) return name.replace(/^Assurance auto\s*/u, "تأمين السيارة ");
    if (name.startsWith("Entretien auto (")) return name.replace(/^Entretien auto\s*/u, "صيانة السيارة ");
    if (name.startsWith("Carburant 2 roues (")) return name.replace(/^Carburant 2 roues\s*/u, "وقود الدراجة ");
    if (name.startsWith("Assurance 2 roues (")) return name.replace(/^Assurance 2 roues\s*/u, "تأمين الدراجة ");
    if (name.startsWith("Entretien 2 roues (")) return name.replace(/^Entretien 2 roues\s*/u, "صيانة الدراجة ");
  }

  if (locale === "en") {
    if (["epargnes", "epargne"].includes(normalized)) return "Savings";
    if (normalized === "master") return "Goal — master";
    if (["carburant"].includes(normalized)) return "Fuel";
    if (["assurance auto"].includes(normalized)) return "Car insurance";
    if (["entretien auto", "entretien vehicule", "entretien véhicule"].includes(normalized)) {
      return "Vehicle maintenance";
    }
    if (["credit auto", "crédit auto"].includes(normalized)) return "Car loan";
    if (["controle technique", "contrôle technique"].includes(normalized)) return "Technical inspection";
    if (["taxe auto"].includes(normalized)) return "Car tax";
    if (["carburant 2 roues"].includes(normalized)) return "Bike fuel";
    if (["assurance 2 roues"].includes(normalized)) return "Bike insurance";
    if (["entretien 2 roues"].includes(normalized)) return "Bike maintenance";
    if (isPrefix(name, ["Dettes — ", "Dettes - "])) {
      const suffix = name.replace(/^Dettes\s*[—-]\s*/u, "");
      return `Debts — ${suffix}`;
    }
    if (isPrefix(name, ["Objectif — ", "Objectif - "])) {
      const suffix = name.replace(/^Objectif\s*[—-]\s*/u, "");
      return `Goal — ${suffix}`;
    }
  }

  if (locale === "fr") {
    if (normalized === "savings") return "Épargne";
    if (["vehicle maintenance"].includes(normalized)) return "Entretien véhicule";
    if (["car insurance"].includes(normalized)) return "Assurance auto";
    if (["car loan"].includes(normalized)) return "Crédit auto";
    if (["technical inspection"].includes(normalized)) return "Contrôle technique";
    if (["car tax"].includes(normalized)) return "Taxe auto";
    if (["bike fuel"].includes(normalized)) return "Carburant 2 roues";
    if (["bike insurance"].includes(normalized)) return "Assurance 2 roues";
    if (["bike maintenance"].includes(normalized)) return "Entretien 2 roues";
    if (normalized === "master") return "Objectif — master";
    if (isPrefix(name, ["Debts — ", "Debts - "])) {
      const suffix = name.replace(/^Debts\s*[—-]\s*/u, "");
      return `Dettes — ${suffix}`;
    }
    if (isPrefix(name, ["Goal — ", "Goal - "])) {
      const suffix = name.replace(/^Goal\s*[—-]\s*/u, "");
      return `Objectif — ${suffix}`;
    }
  }

  return name;
}
