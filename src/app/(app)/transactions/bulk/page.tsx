"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Plus,
  RefreshCcw,
  Trash2,
  Upload,
  Copy,
  Wand2,
  Languages,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import { localizeCategoryName } from "@/lib/categoryCatalog";
import type { FloussyLocale } from "@/lib/localePreference";
import type { CategoryEnvelopeMapOut, CategoryOut } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { useToast } from "@/components/ui/Toast";

type BulkRow = {
  id: string;
  type: "income" | "expense";
  typeValid?: boolean;
  occurred_on: string;
  amount: string;
  category_id: string;
  description: string;
  status?: "idle" | "success" | "error";
  error?: string | null;
};

type ApiError = {
  detail?: string | { msg?: string }[];
};

type BulkCopy = {
  title: string;
  subtitle: string;
  back: string;
  smartImport: string;
  smartImportDesc: string;
  importToTable: string;
  dateFormat: string;
  dateFormatDMY: string;
  dateFormatMDY: string;
  dateInputHint: string;
  dateInputBrowserHint: string;
  ignoreDuplicates: string;
  importFile: string;
  importFileHint: string;
  pastePlaceholder: string;
  exampleLabel: string;
  exampleValue: string;
  smartTips: string;
  smartTipsList: string[];
  tableTitle: string;
  tableSubtitle: string;
  addThreeRows: string;
  clearSuccess: string;
  summaryTotal: (count: number) => string;
  summaryReady: (count: number) => string;
  summaryErrors: (count: number) => string;
  summaryWarnings: (count: number) => string;
  duplicateHint: string;
  type: string;
  income: string;
  expense: string;
  date: string;
  amount: string;
  category: string;
  description: string;
  actions: string;
  chooseCategory: string;
  unmapped: string;
  unmappedHint: string;
  commentPlaceholder: string;
  lineLabel: (index: number) => string;
  statusSuccess: string;
  statusError: string;
  statusDuplicate: string;
  statusDraft: string;
  duplicateLine: string;
  deleteLine: string;
  emptyRows: string;
  loadingCategories: string;
  addRow: string;
  saveAll: string;
  saveDone: string;
  saveDoneDesc: (success: number, failed: number) => string;
  importDone: string;
  importDoneDesc: (count: number) => string;
  unknownError: string;
  invalidType: string;
  invalidDate: string;
  invalidAmount: string;
  requiredCategory: string;
  unmappedCategory: string;
  duplicateIgnored: string;
  duplicateDetected: string;
  invalidRequest: string;
  noCategories: string;
  noCategoriesDesc: string;
  detectedLanguage: string;
  currentLanguage: string;
};

const BULK_COPY: Record<FloussyLocale, BulkCopy> = {
  fr: {
    title: "Saisie collective",
    subtitle: "Importe ou saisis plusieurs mouvements avec une interface plus rapide et plus sûre.",
    back: "Retour aux transactions",
    smartImport: "Import intelligent",
    smartImportDesc: "Colle depuis un tableau, un CSV ou du texte libre. La page essaie de reconnaître le type, la date, le montant et la catégorie.",
    importToTable: "Importer dans le tableau",
    dateFormat: "Format de date",
    dateFormatDMY: "JJ/MM/AAAA",
    dateFormatMDY: "MM/DD/AAAA",
    dateInputHint: "Format attendu",
    dateInputBrowserHint: "L’affichage du champ date peut suivre le navigateur, même si la page valide avec ce format.",
    ignoreDuplicates: "Ignorer les doublons lors de l’enregistrement",
    importFile: "Importer un fichier CSV ou texte",
    importFileHint: "Les fichiers Excel natifs ne sont pas encore pris en charge ici.",
    pastePlaceholder: "Ex: depense\t2026-02-01\t150\tRestaurants\tDiner en ville",
    exampleLabel: "Exemple",
    exampleValue: "revenu, 2026-01-31, 2500, Salaire, Janvier",
    smartTips: "Ce que la page comprend",
    smartTipsList: [
      "tabulation, virgule et point-virgule",
      "type en francais, anglais ou darija",
      "dates au format ISO, JJ/MM/AAAA ou MM/DD/AAAA",
    ],
    tableTitle: "Tableau de saisie",
    tableSubtitle: "Corrige les lignes avant validation. Les erreurs et doublons apparaissent directement.",
    addThreeRows: "Ajouter 3 lignes",
    clearSuccess: "Retirer les lignes enregistrées",
    summaryTotal: (count) => `${count} lignes`,
    summaryReady: (count) => `${count} prêtes`,
    summaryErrors: (count) => `${count} erreurs`,
    summaryWarnings: (count) => `${count} doublons`,
    duplicateHint: "Les doublons sont calculés à partir du type, de la date, du montant, de la catégorie et du commentaire.",
    type: "Type",
    income: "Revenu",
    expense: "Dépense",
    date: "Date",
    amount: "Montant",
    category: "Catégorie",
    description: "Commentaire",
    actions: "Actions",
    chooseCategory: "Choisir une catégorie",
    unmapped: "Non reliée",
    unmappedHint: "Cette catégorie n’est pas reliée à une enveloppe.",
    commentPlaceholder: "Ex: Courses du mois",
    lineLabel: (index) => `Ligne ${index}`,
    statusSuccess: "OK",
    statusError: "Erreur",
    statusDuplicate: "Doublon",
    statusDraft: "Brouillon",
    duplicateLine: "Dupliquer la ligne",
    deleteLine: "Supprimer la ligne",
    emptyRows: "Ajoute une ligne pour commencer.",
    loadingCategories: "Chargement des catégories...",
    addRow: "Ajouter une ligne",
    saveAll: "Enregistrer toutes les lignes",
    saveDone: "Import terminé",
    saveDoneDesc: (success, failed) => `${success} ligne(s) enregistrée(s), ${failed} en erreur.`,
    importDone: "Lignes ajoutées",
    importDoneDesc: (count) => `${count} ligne(s) importée(s) dans le tableau.`,
    unknownError: "Erreur inconnue.",
    invalidType: "Type invalide.",
    invalidDate: "Date invalide.",
    invalidAmount: "Montant invalide.",
    requiredCategory: "Catégorie requise.",
    unmappedCategory: "Catégorie non reliée.",
    duplicateIgnored: "Doublon détecté (ignoré).",
    duplicateDetected: "Doublon détecté.",
    invalidRequest: "Requête invalide.",
    noCategories: "Aucune catégorie disponible.",
    noCategoriesDesc: "Crée d’abord les catégories avant de lancer un import collectif.",
    detectedLanguage: "Langue active",
    currentLanguage: "Français",
  },
  en: {
    title: "Bulk entry",
    subtitle: "Import or enter multiple movements with a faster, safer workflow.",
    back: "Back to transactions",
    smartImport: "Smart import",
    smartImportDesc: "Paste from a table, CSV, or plain text. The page tries to recognize type, date, amount, and category.",
    importToTable: "Import into table",
    dateFormat: "Date format",
    dateFormatDMY: "DD/MM/YYYY",
    dateFormatMDY: "MM/DD/YYYY",
    dateInputHint: "Expected format",
    dateInputBrowserHint: "The date field can still render with the browser format, even if the page validates with this one.",
    ignoreDuplicates: "Ignore duplicates when saving",
    importFile: "Import CSV or text file",
    importFileHint: "Native Excel files are not supported here yet.",
    pastePlaceholder: "Ex: expense\t2026-02-01\t150\tRestaurants\tDinner out",
    exampleLabel: "Example",
    exampleValue: "income, 2026-01-31, 2500, Salary, January",
    smartTips: "What the page understands",
    smartTipsList: [
      "tab, comma, and semicolon separators",
      "type in French, English, or darija",
      "dates in ISO, DD/MM/YYYY, or MM/DD/YYYY",
    ],
    tableTitle: "Entry table",
    tableSubtitle: "Review and fix rows before saving. Errors and duplicates appear immediately.",
    addThreeRows: "Add 3 rows",
    clearSuccess: "Remove saved rows",
    summaryTotal: (count) => `${count} rows`,
    summaryReady: (count) => `${count} ready`,
    summaryErrors: (count) => `${count} errors`,
    summaryWarnings: (count) => `${count} duplicates`,
    duplicateHint: "Duplicates are based on type, date, amount, category, and comment.",
    type: "Type",
    income: "Income",
    expense: "Expense",
    date: "Date",
    amount: "Amount",
    category: "Category",
    description: "Comment",
    actions: "Actions",
    chooseCategory: "Choose a category",
    unmapped: "Unmapped",
    unmappedHint: "This category is not linked to an envelope.",
    commentPlaceholder: "Ex: Groceries for the month",
    lineLabel: (index) => `Row ${index}`,
    statusSuccess: "OK",
    statusError: "Error",
    statusDuplicate: "Duplicate",
    statusDraft: "Draft",
    duplicateLine: "Duplicate row",
    deleteLine: "Delete row",
    emptyRows: "Add a row to get started.",
    loadingCategories: "Loading categories...",
    addRow: "Add row",
    saveAll: "Save all rows",
    saveDone: "Import finished",
    saveDoneDesc: (success, failed) => `${success} row(s) saved, ${failed} failed.`,
    importDone: "Rows added",
    importDoneDesc: (count) => `${count} row(s) imported into the table.`,
    unknownError: "Unknown error.",
    invalidType: "Invalid type.",
    invalidDate: "Invalid date.",
    invalidAmount: "Invalid amount.",
    requiredCategory: "Category required.",
    unmappedCategory: "Category not linked.",
    duplicateIgnored: "Duplicate detected (ignored).",
    duplicateDetected: "Duplicate detected.",
    invalidRequest: "Invalid request.",
    noCategories: "No categories available.",
    noCategoriesDesc: "Create categories first before running a bulk import.",
    detectedLanguage: "Active language",
    currentLanguage: "English",
  },
  ar: {
    title: "إدخال جماعي",
    subtitle: "دخل بزاف ديال العمليات مرة وحدة بطريقة أسهل، أوضح، وأذكى.",
    back: "رجوع للعمليات",
    smartImport: "إدخال ذكي",
    smartImportDesc: "لسّق من الجدول، من ملف، أو من نص عادي. الصفحة كتحاول تفهم النوع، التاريخ، المبلغ، والفئة.",
    importToTable: "دخلهم فالجدول",
    dateFormat: "صيغة التاريخ",
    dateFormatDMY: "يوم/شهر/سنة",
    dateFormatMDY: "شهر/يوم/سنة",
    dateInputHint: "الصيغة المنتظرة",
    dateInputBrowserHint: "الخانة ديال التاريخ تقدر تبان بطريقة ديال المتصفح، حتى إلا كانت الصفحة كتراجع بهاد الصيغة.",
    ignoreDuplicates: "خلي المكررين ما يتسجلوش",
    importFile: "دخل ملف CSV ولا نص",
    importFileHint: "الملفات الأصلية ديال الجدول مازال ما مدعومينش هنا.",
    pastePlaceholder: "مثال: مصروف\t2026-02-01\t150\tمطاعم\tعشا برا",
    exampleLabel: "مثال",
    exampleValue: "دخل, 2026-01-31, 2500, سالير, يناير",
    smartTips: "شنو كتفهم هاد الصفحة",
    smartTipsList: [
      "الجدولة، الفاصلة، والفاصلة المنقوطة",
      "النوع بالفرنسية، الإنجليزية، ولا الدارجة",
      "التواريخ بصيغة ISO ولا يوم/شهر/سنة ولا شهر/يوم/سنة",
    ],
    tableTitle: "جدول الإدخال",
    tableSubtitle: "راجع السطور قبل الحفظ. الغلط والمكرر كيبانو مباشرة.",
    addThreeRows: "زيد 3 سطور",
    clearSuccess: "حيد السطور اللي تسجلو",
    summaryTotal: (count) => `${count} سطر`,
    summaryReady: (count) => (count === 0 ? "ما كاين حتى سطر واجد" : count === 1 ? "سطر واحد جاهز" : `${count} سطور جاهزين`),
    summaryErrors: (count) => (count === 0 ? "ما كاين حتى غلط" : count === 1 ? "سطر واحد فيه غلط" : `${count} سطور فيهم أخطاء`),
    summaryWarnings: (count) => (count === 0 ? "ما كاين حتى مكرر" : count === 1 ? "سطر واحد مكرر" : `${count} سطور مكررين`),
    duplicateHint: "التكرار كيتحسب على النوع، التاريخ، المبلغ، الفئة، والتعليق.",
    type: "النوع",
    income: "دخل",
    expense: "مصروف",
    date: "التاريخ",
    amount: "المبلغ",
    category: "الفئة",
    description: "التعليق",
    actions: "الإجراءات",
    chooseCategory: "اختار فئة",
    unmapped: "ما مربوطةش",
    unmappedHint: "هاد الفئة ما مربوطة حتى بظرف.",
    commentPlaceholder: "مثال: مصروف الشهر",
    lineLabel: (index) => `السطر ${index}`,
    statusSuccess: "مزيان",
    statusError: "غلط",
    statusDuplicate: "مكرر",
    statusDraft: "قيد التحضير",
    duplicateLine: "عاود نفس السطر",
    deleteLine: "حيد السطر",
    emptyRows: "زيد سطر باش تبدا.",
    loadingCategories: "كيتحمّلو الفئات...",
    addRow: "زيد سطر",
    saveAll: "حفظ جميع السطور",
    saveDone: "سالا الإدخال",
    saveDoneDesc: (success, failed) => `${success} تسجلو، و ${failed} فيهم مشكل.`,
    importDone: "تضافو السطور",
    importDoneDesc: (count) => `${count} سطر تضاف فالجدول.`,
    unknownError: "وقع مشكل غير معروف.",
    invalidType: "النوع ما مفهومش.",
    invalidDate: "التاريخ ما صالحش.",
    invalidAmount: "المبلغ ما صالحش.",
    requiredCategory: "الفئة ضرورية.",
    unmappedCategory: "الفئة ما مربوطةش.",
    duplicateIgnored: "لقينا مكرر وخليّناه ما يتحسبش.",
    duplicateDetected: "لقينا سطر مكرر.",
    invalidRequest: "الطلب ما صالحش.",
    noCategories: "ما كايناش فئات.",
    noCategoriesDesc: "صاوب الفئات أولاً قبل ما تدير إدخال جماعي.",
    detectedLanguage: "اللغة الخدامة",
    currentLanguage: "الدارجة",
  },
};

const DEFAULT_ROWS = 6;
const EMPTY_DATE = new Date().toISOString().slice(0, 10);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const TYPE_ALIASES: Record<string, "income" | "expense"> = {
  income: "income",
  incomes: "income",
  revenu: "income",
  revenus: "income",
  "revenu mensuel": "income",
  "revenus mensuels": "income",
  entree: "income",
  entrees: "income",
  salaire: "income",
  salary: "income",
  "monthly income": "income",
  paycheck: "income",
  salair: "income",
  saler: "income",
  salire: "income",
  dkhol: "income",
  dakhl: "income",
  madkhol: "income",
  mdkhol: "income",
  دخل: "income",
  مدخول: "income",
  سالير: "income",
  expense: "expense",
  expenses: "expense",
  depense: "expense",
  depenses: "expense",
  "depense resto": "expense",
  "expense food": "expense",
  sortie: "expense",
  sorties: "expense",
  charge: "expense",
  charges: "expense",
  masrouf: "expense",
  masrof: "expense",
  msrouf: "expense",
  kharj: "expense",
  khrej: "expense",
  مصروف: "expense",
  مصاريف: "expense",
};

const TYPE_KEYWORDS: Record<"income" | "expense", string[]> = {
  income: [
    "income",
    "revenu",
    "revenus",
    "salaire",
    "salary",
    "paycheck",
    "monthly income",
    "dkhol",
    "dakhl",
    "madkhol",
    "mdkhol",
    "دخل",
    "مدخول",
    "سالير",
  ],
  expense: [
    "expense",
    "expenses",
    "depense",
    "depenses",
    "charge",
    "charges",
    "sortie",
    "sorties",
    "masrouf",
    "masrof",
    "msrouf",
    "kharj",
    "khrej",
    "مصروف",
    "مصاريف",
  ],
};

const HEADER_ALIASES: Record<string, keyof ImportedCells> = {
  type: "type",
  kind: "type",
  nature: "type",
  النوع: "type",
  date: "date",
  occurred_on: "date",
  occurred: "date",
  التاريخ: "date",
  montant: "amount",
  amount: "amount",
  value: "amount",
  somme: "amount",
  المبلغ: "amount",
  categorie: "category",
  category: "category",
  rubrique: "category",
  cat: "category",
  الفئة: "category",
  commentaire: "description",
  description: "description",
  note: "description",
  libelle: "description",
  البيان: "description",
  التعليق: "description",
};

type ImportedCells = {
  type?: string;
  date?: string;
  amount?: string;
  category?: string;
  description?: string;
};

const parseType = (raw: string): { type: "income" | "expense"; valid: boolean } => {
  const value = normalize(raw);
  const detected = TYPE_ALIASES[value];
  if (detected) return { type: detected, valid: true };
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS) as Array<
    ["income" | "expense", string[]]
  >) {
    if (keywords.some((keyword) => value.includes(keyword))) {
      return { type, valid: true };
    }
  }
  return { type: "expense", valid: false };
};

const parseDate = (value: string, dateFormat: "DMY" | "MDY"): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("/");
    return `${year}-${month}-${day}`;
  }
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmed)) {
    const [first, second, year] = trimmed.split(/[-/]/);
    if (dateFormat === "DMY") return `${year}-${second}-${first}`;
    return `${year}-${first}-${second}`;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const parseAmountValue = (raw: string) => {
  const cleaned = raw.replace(/\s/g, "").trim();
  if (!cleaned) return { value: null, normalized: "" };
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length === 3) {
      normalized = parts.join("");
    } else {
      normalized = cleaned.replace(",", ".");
    }
  } else if (hasDot) {
    const parts = cleaned.split(".");
    if (parts.length === 2 && parts[1].length === 3) {
      normalized = parts.join("");
    }
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return { value: null, normalized: "" };
  return { value, normalized: value.toFixed(2) };
};

const createRow = (overrides: Partial<BulkRow> = {}): BulkRow => {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    type: "expense",
    typeValid: true,
    occurred_on: EMPTY_DATE,
    amount: "",
    category_id: "",
    description: "",
    status: "idle",
    error: null,
    ...overrides,
  };
};

function parseApiError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  const typed = error as ApiError;
  if (typeof typed.detail === "string") return typed.detail;
  if (Array.isArray(typed.detail)) {
    return typed.detail.map((item) => item.msg ?? "").filter(Boolean).join(", ");
  }
  return null;
}

function buildCategorySearchMap(categories: CategoryOut[]) {
  const map = new Map<string, CategoryOut>();
  const addVariant = (variant: string, category: CategoryOut) => {
    const normalized = normalize(variant);
    if (!normalized) return;
    if (!map.has(normalized)) map.set(normalized, category);
    normalized
      .split(/[\/,&()]+|\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4)
      .forEach((token) => {
        if (!map.has(token)) map.set(token, category);
      });
  };

  categories.forEach((category) => {
    addVariant(category.name, category);
    addVariant(localizeCategoryName(category.name, "fr"), category);
    addVariant(localizeCategoryName(category.name, "en"), category);
    addVariant(localizeCategoryName(category.name, "ar"), category);
  });
  return map;
}

function matchCategory(rawCategory: string, categorySearchMap: Map<string, CategoryOut>) {
  const normalized = normalize(rawCategory);
  if (!normalized) return null;
  const direct = categorySearchMap.get(normalized);
  if (direct) return direct;
  for (const [key, category] of categorySearchMap.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) return category;
  }
  return null;
}

function getRowHash(row: BulkRow, dateFormat: "DMY" | "MDY") {
  const date = parseDate(row.occurred_on, dateFormat);
  const amount = parseAmountValue(row.amount);
  if (!row.category_id || !date || !amount.normalized) return "";
  return [row.type, date, amount.normalized, row.category_id, normalize(row.description || "")].join("|");
}

function getDuplicateIds(rows: BulkRow[], dateFormat: "DMY" | "MDY") {
  const groups = new Map<string, string[]>();
  const duplicates = new Set<string>();
  rows.forEach((row) => {
    const hash = getRowHash(row, dateFormat);
    if (!hash) return;
    const ids = groups.get(hash) ?? [];
    ids.push(row.id);
    groups.set(hash, ids);
  });
  groups.forEach((ids) => {
    if (ids.length < 2) return;
    ids.forEach((id) => duplicates.add(id));
  });
  return duplicates;
}

function getRowIssue(
  row: BulkRow,
  options: {
    copy: BulkCopy;
    dateFormat: "DMY" | "MDY";
    mappedCategoryIds: Set<string>;
    duplicateIds: Set<string>;
    ignoreDuplicates: boolean;
  }
) {
  const { copy, dateFormat, mappedCategoryIds, duplicateIds, ignoreDuplicates } = options;

  if (row.typeValid === false) {
    return { error: copy.invalidType };
  }
  const date = parseDate(row.occurred_on, dateFormat);
  if (!date) return { error: copy.invalidDate };
  const amount = parseAmountValue(row.amount);
  if (!amount.value || amount.value <= 0) return { error: copy.invalidAmount };
  if (!row.category_id) return { error: copy.requiredCategory };
  if (row.type === "expense" && !mappedCategoryIds.has(row.category_id)) {
    return { error: copy.unmappedCategory };
  }
  if (duplicateIds.has(row.id)) {
    return { warning: ignoreDuplicates ? copy.duplicateIgnored : copy.duplicateDetected };
  }
  return {};
}

function detectSeparator(line: string) {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  return ",";
}

function parseDelimitedText(text: string) {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = cleaned.split("\n").find((line) => line.trim().length > 0);
  const delimiter = firstLine ? detectSeparator(firstLine) : ",";
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    const next = cleaned[i + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if (char === "\n" && !inQuotes) {
      row.push(current);
      current = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  return rows;
}

function extractRowsFromImport(content: string) {
  const parsed = parseDelimitedText(content.trim());
  if (parsed.length === 0) return [] as ImportedCells[];

  const header = parsed[0].map((cell) => normalize(cell));
  const looksLikeHeader = header.some((cell) => cell in HEADER_ALIASES);

  if (looksLikeHeader) {
    const mapping: Array<keyof ImportedCells | null> = parsed[0].map(
      (cell) => HEADER_ALIASES[normalize(cell)] ?? null
    );
    return parsed.slice(1).map((cells) => {
      const next: ImportedCells = {};
      cells.forEach((value, index) => {
        const key = mapping[index];
        if (!key) return;
        next[key] = value;
      });
      return next;
    });
  }

  return parsed.map((cells) => ({
    type: cells[0] ?? "",
    date: cells[1] ?? "",
    amount: cells[2] ?? "",
    category: cells[3] ?? "",
    description: cells[4] ?? "",
  }));
}

export default function BulkTransactionsPage() {
  const { toast } = useToast();
  const { locale, dir } = useAppLocale("fr");
  useForceArabicDocumentFont(locale === "ar", "bulk-transactions-page-ar-body");
  const copy = BULK_COPY[locale];
  const submitLockRef = useRef(false);

  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [mappedCategoryIds, setMappedCategoryIds] = useState<Set<string>>(
    () => new Set()
  );
  const [rows, setRows] = useState<BulkRow[]>(
    () => Array.from({ length: DEFAULT_ROWS }, () => createRow())
  );
  const [pasteText, setPasteText] = useState("");
  const [manualDateFormat, setManualDateFormat] = useState<"DMY" | "MDY" | null>(null);
  const dateFormat = manualDateFormat ?? (locale === "en" ? "MDY" : "DMY");
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      apiFetch<CategoryOut[]>("/categories"),
      apiFetch<CategoryEnvelopeMapOut[]>("/mappings"),
    ])
      .then(([categoryList, mappingList]) => {
        if (!mounted) return;
        setCategories(categoryList);
        setMappedCategoryIds(new Set(mappingList.map((item) => item.category_id)));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(parseApiError(err) ?? copy.unknownError);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [copy.unknownError]);

  const categorySearchMap = useMemo(() => buildCategorySearchMap(categories), [categories]);

  const duplicateIds = useMemo(() => getDuplicateIds(rows, dateFormat), [rows, dateFormat]);

  const validationSummary = useMemo(() => {
    let ready = 0;
    let errors = 0;
    let warnings = 0;
    rows.forEach((row) => {
      const issue = getRowIssue(row, {
        copy,
        dateFormat,
        mappedCategoryIds,
        duplicateIds,
        ignoreDuplicates,
      });
      if (issue.error) {
        errors += 1;
        return;
      }
      if (issue.warning) {
        warnings += 1;
        if (ignoreDuplicates) return;
      }
      ready += 1;
    });
    return { ready, errors, warnings, total: rows.length };
  }, [rows, copy, dateFormat, mappedCategoryIds, duplicateIds, ignoreDuplicates]);

  const updateRow = (id: string, patch: Partial<BulkRow>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, ...patch, status: patch.status ?? "idle" } : row
      )
    );
  };

  const handleAddRows = (count = 1) => {
    setRows((prev) => [...prev, ...Array.from({ length: count }, () => createRow())]);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleDuplicateRow = (row: BulkRow) => {
    const duplicated = createRow({
      type: row.type,
      occurred_on: row.occurred_on,
      amount: row.amount,
      category_id: row.category_id,
      description: row.description,
      typeValid: row.typeValid ?? true,
    });
    setRows((prev) => {
      const index = prev.findIndex((item) => item.id === row.id);
      if (index === -1) return [duplicated, ...prev];
      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
  };

  const handleClearSuccess = () => {
    setRows((prev) => prev.filter((row) => row.status !== "success"));
  };

  const importFromText = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const importedRows = extractRowsFromImport(trimmed);
    const nextRows = importedRows.map((entry) => {
      const detectedType = parseType(entry.type ?? "");
      const occurred_on = parseDate(entry.date ?? "", dateFormat);
      const amount = (entry.amount ?? "").trim();
      const category = matchCategory(entry.category ?? "", categorySearchMap);
      return createRow({
        type: detectedType.type,
        typeValid: detectedType.valid,
        occurred_on,
        amount,
        category_id: category?.id ?? "",
        description: entry.description ?? "",
      });
    });

    setRows((prev) => [...nextRows, ...prev]);
    toast({
      title: copy.importDone,
      description: copy.importDoneDesc(nextRows.length),
      variant: "success",
    });
  };

  const handlePasteImport = () => {
    importFromText(pasteText);
    setPasteText("");
  };

  const handleFileImport = async (file: File) => {
    const content = await file.text();
    importFromText(content);
  };

  const handleSubmitAll = async () => {
    if (submitting || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const nextRows = [...rows];

      for (let i = 0; i < nextRows.length; i += 1) {
        const row = nextRows[i];

        // Never resubmit rows already accepted by the backend.
        if (row.status === "success") continue;

        const issue = getRowIssue(row, {
          copy,
          dateFormat,
          mappedCategoryIds,
          duplicateIds,
          ignoreDuplicates,
        });
        if (issue.error) {
          nextRows[i] = { ...row, status: "error", error: issue.error };
          errorCount += 1;
          continue;
        }
        if (issue.warning && ignoreDuplicates) {
          nextRows[i] = { ...row, status: "idle", error: null };
          continue;
        }
        try {
          const parsedAmount = parseAmountValue(row.amount);
          await apiFetch("/transactions", {
            method: "POST",
            body: {
              type: row.type,
              category_id: row.category_id,
              amount: parsedAmount.value,
              occurred_on: parseDate(row.occurred_on, dateFormat),
              description: row.description ? row.description : null,
            },
          });
          nextRows[i] = { ...row, status: "success", error: null };
          successCount += 1;
        } catch (err) {
          nextRows[i] = {
            ...row,
            status: "error",
            error: parseApiError(err) ?? copy.invalidRequest,
          };
          errorCount += 1;
        }
      }

      setRows(nextRows);
      toast({
        title: copy.saveDone,
        description: copy.saveDoneDesc(successCount, errorCount),
        variant: errorCount > 0 ? "default" : "success",
      });
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div dir={dir} className="relative flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-emerald-50/70 p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
        <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <Wand2 className="h-3.5 w-3.5" />
              {copy.smartImport}
            </div>
            <PageHeader title={copy.title} subtitle={copy.subtitle} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200/80 bg-[var(--surface)]/85 px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {copy.detectedLanguage}
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                  {copy.currentLanguage}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-[var(--surface)]/85 px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {copy.dateFormat}
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--ink)]">
                  {dateFormat === "DMY" ? copy.dateFormatDMY : copy.dateFormatMDY}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-[var(--surface)]/85 px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {copy.smartTips}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                  {copy.smartTipsList[0]}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-start xl:justify-end">
            <Button asChild variant="secondary" className="rounded-2xl border-white/80 bg-[var(--surface)]/90 shadow-sm">
              <Link href="/transactions">{copy.back}</Link>
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {categories.length === 0 && !loading ? (
        <Card className="rounded-[28px] border border-amber-200 bg-amber-50/70 p-5">
          <p className="text-lg font-semibold text-[var(--ink)]">{copy.noCategories}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{copy.noCategoriesDesc}</p>
        </Card>
      ) : null}

      <Section
        title={copy.smartImport}
        subtitle={copy.smartImportDesc}
        className="border border-white/80 bg-[var(--surface)]/75 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)] backdrop-blur"
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePasteImport}
            disabled={!pasteText.trim()}
            className="rounded-2xl"
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden />
            {copy.importToTable}
          </Button>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <div className="grid gap-4">
            <div className="rounded-[26px] border border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-[var(--surface)] p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <input
                      type="radio"
                      name="date-format"
                      value="DMY"
                      checked={dateFormat === "DMY"}
                      onChange={() => {
                        setManualDateFormat("DMY");
                      }}
                    />
                    {copy.dateFormatDMY}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <input
                      type="radio"
                      name="date-format"
                      value="MDY"
                      checked={dateFormat === "MDY"}
                      onChange={() => {
                        setManualDateFormat("MDY");
                      }}
                    />
                    {copy.dateFormatMDY}
                  </label>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={ignoreDuplicates}
                    onChange={(event) => setIgnoreDuplicates(event.target.checked)}
                  />
                  {copy.ignoreDuplicates}
                </label>
              </div>
              <div className="mt-4">
                <Input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleFileImport(file);
                  }}
                />
                <p className="mt-2 text-xs text-[var(--muted)]">{copy.importFileHint}</p>
              </div>
              <textarea
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                placeholder={copy.pastePlaceholder}
                className="mt-4 min-h-[180px] w-full rounded-[26px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm text-[var(--ink)] shadow-sm placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                <FileSpreadsheet className="h-4 w-4" aria-hidden />
                {copy.exampleLabel}: <span className="font-medium">{copy.exampleValue}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="rounded-[26px] border border-slate-200/80 bg-[var(--surface)] p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[var(--ink)]">
                <Languages className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-semibold">{copy.smartTips}</p>
              </div>
              <div className="mt-4 grid gap-3">
                {copy.smartTipsList.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-[var(--muted)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Section>

      <Section
        title={copy.tableTitle}
        subtitle={copy.tableSubtitle}
        className="border border-white/80 bg-[var(--surface)]/75 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)] backdrop-blur"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => handleAddRows(3)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              {copy.addThreeRows}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleClearSuccess}>
              <RefreshCcw className="mr-2 h-4 w-4" aria-hidden />
              {copy.clearSuccess}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Card className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-emerald-100 bg-emerald-50/50 px-4 py-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="muted">{copy.summaryTotal(validationSummary.total)}</Badge>
              <Badge tone="success">{copy.summaryReady(validationSummary.ready)}</Badge>
              <Badge tone="warning">{copy.summaryErrors(validationSummary.errors)}</Badge>
              <Badge tone="accent">{copy.summaryWarnings(validationSummary.warnings)}</Badge>
            </div>
            <div className="text-xs text-[var(--muted)]">{copy.duplicateHint}</div>
          </Card>

          <div className="overflow-x-auto">
            <div className="min-w-[960px] grid gap-3">
              <div className="hidden gap-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)] md:grid md:grid-cols-[140px_150px_140px_minmax(220px,1.2fr)_minmax(220px,1.4fr)_112px]">
                <span>{copy.type}</span>
                <span>{copy.date}</span>
                <span>{copy.amount}</span>
                <span>{copy.category}</span>
                <span>{copy.description}</span>
                <span>{copy.actions}</span>
              </div>

              {rows.map((row, index) => {
                const mapped = row.category_id ? mappedCategoryIds.has(row.category_id) : true;
                const issue = getRowIssue(row, {
                  copy,
                  dateFormat,
                  mappedCategoryIds,
                  duplicateIds,
                  ignoreDuplicates,
                });
                const displayError = row.error ?? issue.error;

                return (
                  <Card
                    key={row.id}
                    className={`grid gap-3 rounded-[26px] border p-4 md:grid-cols-[140px_150px_140px_minmax(220px,1.2fr)_minmax(220px,1.4fr)_112px] ${
                      row.status === "success"
                        ? "border-emerald-200 bg-emerald-50/60"
                        : row.status === "error"
                        ? "border-rose-200 bg-rose-50/50"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[var(--muted)] md:hidden">{copy.type}</p>
                      <select
                        value={row.type}
                        onChange={(event) =>
                          updateRow(row.id, {
                            type: event.target.value as "income" | "expense",
                            typeValid: true,
                            error: null,
                          })
                        }
                        className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                      >
                        <option value="income">{copy.income}</option>
                        <option value="expense">{copy.expense}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[var(--muted)] md:hidden">{copy.date}</p>
                      <Input
                        type="date"
                        value={row.occurred_on}
                        onChange={(event) =>
                          updateRow(row.id, {
                            occurred_on: event.target.value,
                            error: null,
                          })
                        }
                      />
                      <p className="text-[11px] text-[var(--muted)]">
                        {copy.dateInputHint}:{" "}
                        {dateFormat === "DMY" ? copy.dateFormatDMY : copy.dateFormatMDY}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[var(--muted)] md:hidden">{copy.amount}</p>
                      <Input
                        type="text"
                        value={row.amount}
                        onChange={(event) =>
                          updateRow(row.id, {
                            amount: event.target.value,
                            error: null,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between md:hidden">
                        <p className="text-xs font-medium text-[var(--muted)]">{copy.category}</p>
                        {row.type === "expense" && !mapped ? (
                          <Badge tone="warning">{copy.unmapped}</Badge>
                        ) : null}
                      </div>
                      <select
                        value={row.category_id}
                        onChange={(event) =>
                          updateRow(row.id, {
                            category_id: event.target.value,
                            error: null,
                          })
                        }
                        className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                      >
                        <option value="">{copy.chooseCategory}</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {localizeCategoryName(cat.name, locale)}
                          </option>
                        ))}
                      </select>
                      {row.type === "expense" && row.category_id && !mapped ? (
                        <p className="text-xs text-amber-600">{copy.unmappedHint}</p>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-[var(--muted)] md:hidden">{copy.description}</p>
                      <Input
                        type="text"
                        value={row.description}
                        data-clarity-mask="true"
                        onChange={(event) =>
                          updateRow(row.id, {
                            description: event.target.value,
                            error: null,
                          })
                        }
                        placeholder={copy.commentPlaceholder}
                      />
                    </div>

                    <div className="flex items-start justify-between gap-2 md:flex-col md:justify-start">
                      <div className="flex flex-col gap-1">
                        {row.status === "success" ? (
                          <Badge tone="success" className="w-fit whitespace-nowrap">{copy.statusSuccess}</Badge>
                        ) : displayError ? (
                          <Badge tone="warning" className="w-fit whitespace-nowrap">{copy.statusError}</Badge>
                        ) : issue.warning ? (
                          <Badge tone="accent" className="w-fit whitespace-nowrap">{copy.statusDuplicate}</Badge>
                        ) : (
                          <Badge tone="muted" className="w-fit whitespace-nowrap">{copy.statusDraft}</Badge>
                        )}
                        <span className="text-[11px] text-[var(--muted)]">{copy.lineLabel(index + 1)}</span>
                      </div>
                      <div className="flex items-center gap-1 md:mt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicateRow(row)}
                          title={copy.duplicateLine}
                        >
                          <Copy className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRow(row.id)}
                          title={copy.deleteLine}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>

                    {displayError ? (
                      <p className="text-xs text-red-600 md:col-span-6">{displayError}</p>
                    ) : null}
                    {!displayError && issue.warning ? (
                      <p className="text-xs text-amber-600 md:col-span-6">{issue.warning}</p>
                    ) : null}
                    {!displayError && !issue.warning ? (
                      <p className="text-[11px] text-[var(--muted)] md:col-span-6">
                        {copy.dateInputBrowserHint}
                      </p>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-6 py-8 text-center text-sm text-[var(--muted)]">
              {copy.emptyRows}
            </div>
          ) : null}
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[var(--muted)]">{loading ? copy.loadingCategories : ""}</div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => handleAddRows(1)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {copy.addRow}
          </Button>
          <Button type="button" onClick={handleSubmitAll} disabled={submitting}>
            {copy.saveAll}
          </Button>
        </div>
      </div>
    </div>
  );
}
