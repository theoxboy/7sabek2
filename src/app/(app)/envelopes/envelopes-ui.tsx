"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

import type { FloussyLocale } from "@/lib/localePreference";

/* ------------------------------------------------------------------ */
/* Textes de la maquette « Page 11 · Enveloppes » (fr / en / ar)       */
/* ------------------------------------------------------------------ */

const FR = {
  title: "Enveloppes",
  sub: "Les soldes reflètent la période en cours :",
  dayOf: (d: number, n: number) => `jour ${d} / ${n}`,
  rollBulk: "Rollover collectif",
  adv: "Paramètres avancés",
  add: "Ajouter une enveloppe",
  guestMode: "Mode Découverte",
  createAccount: "Créer mon compte gratuit",
  quotaText: (used: number, max: number) => `${used} / ${max} enveloppes créées`,
  quotaMsgOk: "Avec un compte gratuit, pas de limite et tes enveloppes restent telles quelles.",
  quotaMsgSoon: (left: number) =>
    `Plus que ${left} enveloppe(s) en Mode Découverte. Avec un compte gratuit, pas de limite et tes enveloppes restent telles quelles.`,
  quotaMsgFull: "Limite atteinte. Un compte gratuit lève la limite et garde toutes tes enveloppes telles quelles.",
  summary: "Synthèse",
  inEnvelopes: "Dans les enveloppes",
  activeCount: (n: number) => `${n} enveloppes actives`,
  cashToSplit: "Cash à répartir",
  openAllocation: "Ouvrir l’allocation →",
  toWatch: "À surveiller",
  toWatchHint: "> 90 % consommé ou négatif",
  sweepOn: (d: string) => `Balayage du ${d}`,
  sweepHint: (n: number) => `${n} enveloppe(s) · voir l’aperçu`,
  savings: "Épargne",
  sweepTarget: "Reçoit le balayage",
  locked: "Verrouillée",
  nextSweep: (d: string) => `Balayage prévu le ${d}`,
  sweepCount: (n: number, names: string) => `${n} enveloppe(s) : ${names || "—"}`,
  closingPreview: "Aperçu de la clôture",
  details: "Détails",
  sweepExplain:
    "À chaque fin de cycle, le reliquat non dépensé des enveloppes dont le rollover est désactivé est balayé automatiquement ici.",
  debts: "Enveloppes Dettes & Crédits",
  debtsSub:
    "Rollover verrouillé sur ON et protégées du balayage : leur solde est de l’argent mis de côté pour rembourser.",
  goals: "Enveloppes Objectifs",
  goalsSub: "Chaque enveloppe est adossée à un projet avec un montant et une date cibles.",
  fixed: "Enveloppes à montant fixe",
  fixedSub: "Alimentées par un montant prédéfini lors de la répartition des revenus.",
  flex: "Enveloppes flexibles",
  flexSub: "Alimentées par un pourcentage ou le reste du budget.",
  toFix: "À régler",
  toFixSub: "Enveloppes à découvert : couvre-les avant la clôture.",
  otherWay: "Choisir une autre source",
  coverFromCash: (amt: string) => `Couvrir depuis Cash (${amt})`,
  search: "Chercher une enveloppe",
  filters: "Filtres",
  sortBy: "Trier",
  viewLabel: "Affichage",
  fAll: "Toutes",
  fWatch: "À surveiller",
  fNeg: "Négatives",
  fOff: "Rollover OFF",
  sPerso: "Mon ordre",
  sBal: "Solde",
  sPct: "% consommé",
  sName: "Nom",
  vCards: "Cartes",
  vList: "Liste compacte",
  noResult: "Aucune enveloppe ne correspond.",
  reset: "Réinitialiser les filtres",
  tip: "Astuce : survole ou touche une carte pour voir ses actions. « Détails » ouvre l’historique complet.",
  todayMark: "Repère : où tu devrais en être aujourd’hui",
  qAlloc: "Allouer depuis Cash",
  qAllocShort: "Allouer",
  moreFor: (n: string) => `Plus d’actions pour ${n}`,
  close: "Fermer",
  cancel: "Annuler",
  create: "Créer l’enveloppe",
  next: "Suivant",
  back: "Retour",
  delete: "Supprimer",
  later: "Plus tard",
  current: "Actuel",
  steps: "Étapes",
  name: "Nom de l’enveloppe",
  namePh: "Ex. Vacances, Crédit auto, Animaux",
  save: "Enregistrer",
  debtKind: "Dette / crédit",
  debtKindSub: "Rollover verrouillé sur ON, jamais balayée vers l’Épargne.",
  normalKind: "Enveloppe classique",
  normalKindSub: "Dépenses courantes, alimentée à la répartition.",
  detected: "Dette / crédit détecté.",
  detectedText: "Rollover verrouillé sur ON et protégée du balayage vers l’Épargne.",
  packsIntro: "Coche un ou plusieurs packs. Les enveloppes déjà présentes sont ignorées.",
  quickList: "Liste rapide (séparée par des virgules)",
  quickListPh: "Vacances, Voiture, Animaux",
  advPreview: (n: number) =>
    n === 0 ? "Aucune nouvelle enveloppe à créer." : `${n} enveloppe(s) seront créées.`,
  advSkipped: (names: string) => `Déjà présentes, ignorées : ${names}`,
  advBtn: (n: number) => (n === 0 ? "Rien à créer" : `Créer ${n} enveloppe(s)`),
  rollBulkIntro: (d: string) =>
    `Coche les enveloppes dont le reliquat doit être reporté au cycle suivant. Les décochées seront balayées vers l’Épargne le ${d}. Dettes, objectifs et enveloppes système ne sont pas concernés.`,
  allOn: "Tout cocher",
  allOff: "Tout décocher",
  rbBtn: (n: number) => (n === 0 ? "Aucun changement" : `Appliquer ${n} changement(s)`),
  willCarry: "Reportée",
  willSweep: "Balayée",
  closingIntro: (d: string) =>
    `Voici ce qui se passera le ${d}. Bascule le rollover directement sur chaque ligne.`,
  toSavings: "Vers l’Épargne",
  carried: "Reportée au cycle suivant",
  swept: (amt: string) => `→ Épargne ${amt}`,
  negCarried: "Négatif : toujours reporté",
  lockedOn: "Rollover verrouillé ON",
  sweepExcluded: "Non concernées : dettes & crédits, objectifs, Cash. Un solde négatif est toujours reporté.",
  closingNow: "Solde de clôture · période en cours",
  budgetVsReal: "Budget vs réel",
  periods: "Historique des périodes",
  colPeriod: "Période",
  colAlloc: "Alloué",
  colSpent: "Dépensé",
  colClose: "Clôture",
  inProgress: "(en cours)",
  tabOv: "Vue d’ensemble",
  tabTx: "Dépenses",
  tabLog: "Journaux",
  activity: "Dépenses de la période",
  purgeAll: "Supprimer tout",
  noTx: "Aucune dépense sur cette période.",
  transfers: "Journal des transferts",
  fixLog: "Corrections manuelles",
  noFix: "Aucune correction manuelle.",
  noTransfers: "Aucun transfert enregistré.",
  noPeriods: "Aucune période pour l’instant. Commence avec une allocation ou une transaction.",
  exportCsv: "Exporter CSV",
  amount: "Montant (MAD)",
  quickHint: (name: string, cash: string) => `Vers ${name} · disponible dans Cash : ${cash}`,
  qPreview: (from: string, to: string) => `Cash : ${from} → ${to}`,
  qBtn: (amt: string) => `Allouer ${amt}`,
  amountInvalid: "Saisis un montant supérieur à 0, par exemple 150 ou 150,50.",
  amountTooHigh: "Le montant dépasse le Cash disponible. Baisse-le ou ajoute un revenu.",
  newValue: "Nouvelle valeur du solde (MAD)",
  old: "Ancien",
  nw: "Nouveau",
  delta: "Écart",
  applyFix: "Appliquer la correction",
  fixSteps: ["1. Nouvelle valeur", "2. Vérifier"] as string[],
  rollOnTitle: "Rollover ON",
  rollOffTitle: "Rollover OFF",
  rollSwitchTo: (on: boolean): string => (on ? "Passer en Rollover ON" : "Passer en Rollover OFF"),
  rollLockedText:
    "Cette enveloppe doit rester en Rollover ON (dette, objectif ou montant fixe) pour protéger l’argent mis de côté.",
  purgeText: (n: number, name: string) =>
    `Supprimer les ${n} dépense(s) de « ${name} » ? Cette action est définitive.`,
  txDelText: (label: string) => `Supprimer la dépense « ${label} » ? Cette action est définitive.`,
  emptyTitle: "Commence avec un pack",
  emptyText:
    "Tu n’as encore que Cash et Épargne. Ajoute les enveloppes de base en un clic, puis répartis ton revenu.",
  addEssentials: "Ajouter le pack Essentiels",
  otherPacks: "Voir tous les packs",
  overdrawn: (amt: string) => `À découvert de ${amt}`,
  noSpendYet: "Aucune dépense encore",
  emptyEnv: "Enveloppe vide",
  emptyOn: (d: string) => `À ce rythme, vide le ${d}`,
  willLast: "Tiendra jusqu’à la clôture",
  spentOf: (s: string, a: string) => `Dépensé ${s} / ${a}`,
  noBudget: "Sans budget défini",
  setAside: (a: string) => `Mis de côté ce cycle : ${a}`,
  goalOf: (b: string, t: string) => `${b} / ${t}`,
  goalNeed: (dl: string, need: string, m: number) => `Cible ${dl} · il faut ${need}/mois (${m} mois)`,
  debtLeft: (due: string) => `Reste dû ${due}`,
  kindDebt: "Dette / crédit · rollover verrouillé ON",
  kindSys: "Enveloppe système · verrouillée",
  kindFixe: (on: boolean) => `Fixe · rollover ${on ? "ON" : "OFF"}`,
  kindFlex: (on: boolean) => `Flexible · rollover ${on ? "ON" : "OFF"}`,
  kindGoal: "Objectif",
  menuRename: "Renommer",
  menuFix: "Correction manuelle",
  menuRoll: "Rollover ON / OFF",
  menuGoal: "Voir l’objectif",
  menuDelete: "Supprimer",
  newBadge: "Nouvelle",
  emptyNote: "vide",
  negNote: "à découvert",
  lastSync: "Mise à jour",
};

type Copy = typeof FR;

const EN: Copy = {
  ...FR,
  title: "Envelopes",
  sub: "Balances reflect the current period:",
  dayOf: (d, n) => `day ${d} / ${n}`,
  rollBulk: "Bulk rollover",
  adv: "Advanced settings",
  add: "Add an envelope",
  guestMode: "Discovery mode",
  createAccount: "Create my free account",
  quotaText: (used, max) => `${used} / ${max} envelopes created`,
  quotaMsgOk: "With a free account there is no limit and your envelopes stay exactly as they are.",
  quotaMsgSoon: (left) =>
    `Only ${left} envelope(s) left in Discovery mode. With a free account there is no limit and your envelopes stay as they are.`,
  quotaMsgFull: "Limit reached. A free account removes the limit and keeps all your envelopes as they are.",
  summary: "Summary",
  inEnvelopes: "In envelopes",
  activeCount: (n) => `${n} active envelopes`,
  cashToSplit: "Cash to allocate",
  openAllocation: "Open allocation →",
  toWatch: "To watch",
  toWatchHint: "> 90% used or negative",
  sweepOn: (d) => `Sweep on ${d}`,
  sweepHint: (n) => `${n} envelope(s) · see preview`,
  savings: "Savings",
  sweepTarget: "Receives the sweep",
  locked: "Locked",
  nextSweep: (d) => `Sweep planned on ${d}`,
  sweepCount: (n, names) => `${n} envelope(s): ${names || "—"}`,
  closingPreview: "Closing preview",
  details: "Details",
  sweepExplain:
    "At the end of each cycle, the unspent remainder of envelopes with rollover off is swept here automatically.",
  debts: "Debt & credit envelopes",
  debtsSub: "Rollover locked ON and protected from the sweep: their balance is money set aside to repay.",
  goals: "Goal envelopes",
  goalsSub: "Each envelope backs a project with a target amount and date.",
  fixed: "Fixed-amount envelopes",
  fixedSub: "Funded with a preset amount when income is split.",
  flex: "Flexible envelopes",
  flexSub: "Funded with a percentage or the rest of the budget.",
  toFix: "To resolve",
  toFixSub: "Overdrawn envelopes: cover them before closing.",
  otherWay: "Pick another source",
  coverFromCash: (amt) => `Cover from Cash (${amt})`,
  search: "Search an envelope",
  filters: "Filters",
  sortBy: "Sort",
  viewLabel: "View",
  fAll: "All",
  fWatch: "To watch",
  fNeg: "Negative",
  fOff: "Rollover OFF",
  sPerso: "My order",
  sBal: "Balance",
  sPct: "% used",
  sName: "Name",
  vCards: "Cards",
  vList: "Compact list",
  noResult: "No envelope matches.",
  reset: "Reset filters",
  tip: "Tip: hover or tap a card to see its actions. “Details” opens the full history.",
  todayMark: "Marker: where you should be today",
  qAlloc: "Allocate from Cash",
  qAllocShort: "Allocate",
  moreFor: (n) => `More actions for ${n}`,
  close: "Close",
  cancel: "Cancel",
  create: "Create envelope",
  next: "Next",
  back: "Back",
  delete: "Delete",
  later: "Later",
  current: "Current",
  steps: "Steps",
  name: "Envelope name",
  namePh: "E.g. Holidays, Car loan, Pets",
  save: "Save",
  debtKind: "Debt / credit",
  debtKindSub: "Rollover locked ON, never swept to Savings.",
  normalKind: "Regular envelope",
  normalKindSub: "Everyday spending, funded when income is split.",
  detected: "Debt / credit detected.",
  detectedText: "Rollover locked ON and protected from the sweep to Savings.",
  packsIntro: "Tick one or more packs. Envelopes you already have are skipped.",
  quickList: "Quick list (comma separated)",
  quickListPh: "Holidays, Car, Pets",
  advPreview: (n) => (n === 0 ? "No new envelope to create." : `${n} envelope(s) will be created.`),
  advSkipped: (names) => `Already there, skipped: ${names}`,
  advBtn: (n) => (n === 0 ? "Nothing to create" : `Create ${n} envelope(s)`),
  rollBulkIntro: (d) =>
    `Tick the envelopes whose remainder should carry over to the next cycle. Unticked ones will be swept to Savings on ${d}. Debts, goals and system envelopes are not affected.`,
  allOn: "Tick all",
  allOff: "Untick all",
  rbBtn: (n) => (n === 0 ? "No change" : `Apply ${n} change(s)`),
  willCarry: "Carried",
  willSweep: "Swept",
  closingIntro: (d) => `Here is what will happen on ${d}. Switch rollover directly on each line.`,
  toSavings: "To Savings",
  carried: "Carried to next cycle",
  swept: (amt) => `→ Savings ${amt}`,
  negCarried: "Negative: always carried",
  lockedOn: "Rollover locked ON",
  sweepExcluded: "Not affected: debts & credits, goals, Cash. A negative balance is always carried over.",
  closingNow: "Closing balance · current period",
  budgetVsReal: "Budget vs actual",
  periods: "Period history",
  colPeriod: "Period",
  colAlloc: "Allocated",
  colSpent: "Spent",
  colClose: "Closing",
  inProgress: "(current)",
  tabOv: "Overview",
  tabTx: "Spending",
  tabLog: "Logs",
  activity: "Spending this period",
  purgeAll: "Delete all",
  noTx: "No spending in this period.",
  transfers: "Transfer log",
  fixLog: "Manual corrections",
  noFix: "No manual correction.",
  noTransfers: "No transfer recorded.",
  noPeriods: "No period yet. Start with an allocation or a transaction.",
  exportCsv: "Export CSV",
  amount: "Amount (MAD)",
  quickHint: (name, cash) => `To ${name} · available in Cash: ${cash}`,
  qPreview: (from, to) => `Cash: ${from} → ${to}`,
  qBtn: (amt) => `Allocate ${amt}`,
  amountInvalid: "Enter an amount above 0, for example 150 or 150.50.",
  amountTooHigh: "The amount is more than the Cash available. Lower it or add an income.",
  newValue: "New balance (MAD)",
  old: "Old",
  nw: "New",
  delta: "Difference",
  applyFix: "Apply correction",
  fixSteps: ["1. New value", "2. Check"],
  rollSwitchTo: (on) => (on ? "Switch to Rollover ON" : "Switch to Rollover OFF"),
  rollLockedText:
    "This envelope must stay on Rollover ON (debt, goal or fixed amount) to protect the money set aside.",
  purgeText: (n, name) => `Delete the ${n} expense(s) of “${name}”? This cannot be undone.`,
  txDelText: (label) => `Delete the expense “${label}”? This cannot be undone.`,
  emptyTitle: "Start with a pack",
  emptyText: "You only have Cash and Savings so far. Add the basic envelopes in one click, then split your income.",
  addEssentials: "Add the Essentials pack",
  otherPacks: "See all packs",
  overdrawn: (amt) => `Overdrawn by ${amt}`,
  noSpendYet: "No spending yet",
  emptyEnv: "Envelope empty",
  emptyOn: (d) => `At this pace, empty on ${d}`,
  willLast: "Will last until closing",
  spentOf: (s, a) => `Spent ${s} / ${a}`,
  noBudget: "No budget set",
  setAside: (a) => `Set aside this cycle: ${a}`,
  goalNeed: (dl, need, m) => `Target ${dl} · ${need}/month needed (${m} months)`,
  debtLeft: (due) => `Still owed ${due}`,
  kindDebt: "Debt / credit · rollover locked ON",
  kindSys: "System envelope · locked",
  kindFixe: (on) => `Fixed · rollover ${on ? "ON" : "OFF"}`,
  kindFlex: (on) => `Flexible · rollover ${on ? "ON" : "OFF"}`,
  kindGoal: "Goal",
  menuRename: "Rename",
  menuFix: "Manual correction",
  menuGoal: "Open the goal",
  menuDelete: "Delete",
  newBadge: "New",
  emptyNote: "empty",
  negNote: "overdrawn",
};

const AR: Copy = {
  ...FR,
  title: "الأظرفة",
  sub: "الأرصدة كتعكس الدورة الحالية:",
  dayOf: (d, n) => `النهار ${d} / ${n}`,
  rollBulk: "Rollover جماعي",
  adv: "إعدادات متقدمة",
  add: "زيد ظرف",
  guestMode: "وضع الاكتشاف",
  createAccount: "دير حساب مجاني",
  quotaText: (used, max) => `${used} / ${max} ظرف`,
  quotaMsgOk: "بحساب مجاني ما كاين حتى حد والأظرفة ديالك كتبقى كيف ما هوما.",
  quotaMsgSoon: (left) => `بقا ليك غير ${left} ظرف فوضع الاكتشاف. بحساب مجاني ما كاين حتى حد.`,
  quotaMsgFull: "وصلتي للحد. حساب مجاني كيحيّد الحد وكيخلّي الأظرفة ديالك كيف ما هوما.",
  summary: "ملخص",
  inEnvelopes: "فالأظرفة",
  activeCount: (n) => `${n} ظرف نشيط`,
  cashToSplit: "لكاش اللي باقي",
  openAllocation: "حلّ التوزيع ←",
  toWatch: "خاصهم المراقبة",
  toWatchHint: "كثر من 90% ولا تحت الصفر",
  sweepOn: (d) => `التحويل ديال ${d}`,
  sweepHint: (n) => `${n} ظرف · شوف`,
  savings: "التوفير",
  sweepTarget: "كيستقبل الباقي",
  locked: "مقفول",
  nextSweep: (d) => `التحويل نهار ${d}`,
  sweepCount: (n, names) => `${n} ظرف: ${names || "—"}`,
  closingPreview: "شوف شنو غادي يوقع فالإغلاق",
  details: "التفاصيل",
  sweepExplain:
    "فآخر كل دورة، الفلوس اللي بقات فالأظرفة اللي الـ Rollover ديالها مطفي كتمشي أوتوماتيكيا للتوفير.",
  debts: "أظرفة الديون والقروض",
  debtsSub: "الـ Rollover مقفول على ON وما كيتسحبش منها للتوفير: هادي فلوس ديال الخلاص.",
  goals: "أظرفة الأهداف",
  goalsSub: "كل ظرف مربوط بمشروع عندو مبلغ وتاريخ.",
  fixed: "أظرفة بمبلغ ثابت",
  fixedSub: "كتعمّر بمبلغ محدد فاش كتوزع المدخول.",
  flex: "أظرفة مرنة",
  flexSub: "كتعمّر بنسبة ولا بالباقي ديال الميزانية.",
  toFix: "خاصهم يتسوّاو",
  toFixSub: "أظرفة تحت الصفر: عمّرهم قبل الإغلاق.",
  otherWay: "اختار مصدر آخر",
  coverFromCash: (amt) => `غطّي من لكاش (${amt})`,
  search: "قلّب على ظرف",
  filters: "الفلاتر",
  sortBy: "رتّب",
  viewLabel: "العرض",
  fAll: "كلشي",
  fWatch: "خاصهم المراقبة",
  fNeg: "تحت الصفر",
  fOff: "Rollover مطفي",
  sPerso: "الترتيب ديالي",
  sBal: "الرصيد",
  sPct: "% المصروف",
  sName: "السمية",
  vCards: "بطاقات",
  vList: "لائحة",
  noResult: "حتى ظرف ما مطابق.",
  reset: "رجّع الفلاتر",
  tip: "نصيحة: دوز الفأرة ولا اضغط على البطاقة باش تبانو الخيارات. «التفاصيل» كتحل التاريخ كامل.",
  todayMark: "فين خاصك تكون اليوم",
  qAlloc: "وزّع من لكاش",
  qAllocShort: "وزّع",
  moreFor: (n) => `خيارات أخرى لـ ${n}`,
  close: "سدّ",
  cancel: "لغي",
  create: "دير الظرف",
  next: "التالي",
  back: "رجوع",
  delete: "مسح",
  later: "من بعد",
  current: "الحالي",
  steps: "المراحل",
  name: "سمية الظرف",
  namePh: "مثلا: عطلة، كريدي الطوموبيل",
  save: "سجّل",
  debtKind: "دين / قرض",
  debtKindSub: "الـ Rollover مقفول على ON وما كيتسحبش للتوفير.",
  normalKind: "ظرف عادي",
  normalKindSub: "مصاريف يومية، كيتعمّر فالتوزيع.",
  detected: "تلقّينا دين / قرض.",
  detectedText: "الـ Rollover مقفول على ON وما كيتسحبش للتوفير.",
  packsIntro: "ختار باك ولا كثر. الأظرفة اللي كاينة ما غاديش تعاود.",
  quickList: "لائحة سريعة (مفرّقة بفاصلة)",
  quickListPh: "عطلة، طوموبيل، حيوانات",
  advPreview: (n) => (n === 0 ? "حتى ظرف جديد." : `غادي يتزادو ${n} ظرف.`),
  advSkipped: (names) => `كاينين من قبل: ${names}`,
  advBtn: (n) => (n === 0 ? "والو باش يتزاد" : `زيد ${n} ظرف`),
  rollBulkIntro: (d) =>
    `علّم الأظرفة اللي الباقي ديالها يدوز للدورة الجاية. اللي ما معلّماش غادي يمشي الباقي ديالها للتوفير نهار ${d}.`,
  allOn: "علّم كلشي",
  allOff: "حيّد كلشي",
  rbBtn: (n) => (n === 0 ? "حتى تبديل" : `طبّق ${n} تبديل`),
  willCarry: "كيدوز",
  willSweep: "كيتحوّل",
  closingIntro: (d) => `هادشي اللي غادي يوقع نهار ${d}. تقدر تبدّل الـ Rollover من هنا.`,
  toSavings: "للتوفير",
  carried: "كيدوز للدورة الجاية",
  swept: (amt) => `← التوفير ${amt}`,
  negCarried: "تحت الصفر: ديما كيدوز",
  lockedOn: "Rollover مقفول ON",
  sweepExcluded: "ماشي معنيين: الديون، الأهداف، لكاش. الرصيد تحت الصفر ديما كيدوز.",
  closingNow: "رصيد الإغلاق · الدورة الحالية",
  budgetVsReal: "الميزانية مقابل الواقع",
  periods: "تاريخ الدورات",
  colPeriod: "الدورة",
  colAlloc: "الموزّع",
  colSpent: "المصروف",
  colClose: "الإغلاق",
  inProgress: "(الحالية)",
  tabOv: "نظرة عامة",
  tabTx: "المصاريف",
  tabLog: "السجلات",
  activity: "مصاريف الدورة",
  purgeAll: "مسح كلشي",
  noTx: "حتى مصروف فهاد الدورة.",
  transfers: "سجل التحويلات",
  fixLog: "التصحيحات اليدوية",
  noFix: "حتى تصحيح.",
  noTransfers: "حتى تحويل.",
  noPeriods: "مازال حتى دورة. بدا بتوزيع ولا بعملية.",
  exportCsv: "تصدير CSV",
  amount: "المبلغ (درهم)",
  quickHint: (name, cash) => `لـ ${name} · فلكاش كاين: ${cash}`,
  qPreview: (from, to) => `لكاش: ${from} ← ${to}`,
  qBtn: (amt) => `وزّع ${amt}`,
  amountInvalid: "دخّل مبلغ كبر من 0، بحال 150 ولا 150,50.",
  amountTooHigh: "المبلغ كثر من اللي كاين فلكاش. نقّصو ولا زيد مدخول.",
  newValue: "الرصيد الجديد (درهم)",
  old: "القديم",
  nw: "الجديد",
  delta: "الفرق",
  applyFix: "طبّق التصحيح",
  fixSteps: ["1. القيمة الجديدة", "2. تأكد"],
  rollSwitchTo: (on) => (on ? "دوّز لـ Rollover ON" : "دوّز لـ Rollover OFF"),
  rollLockedText: "هاد الظرف خاصو يبقى Rollover ON (دين، هدف ولا مبلغ ثابت) باش تبقى الفلوس محمية.",
  purgeText: (n, name) => `نمسحو ${n} مصروف ديال « ${name} »؟ ما يمكنش ترجع.`,
  txDelText: (label) => `نمسحو المصروف « ${label} »؟ ما يمكنش ترجع.`,
  emptyTitle: "بدا بباك",
  emptyText: "عندك غير لكاش والتوفير. زيد الأظرفة الأساسية بكليك وحدة ومن بعد وزّع المدخول.",
  addEssentials: "زيد باك الأساسيات",
  otherPacks: "شوف كاع الباكات",
  overdrawn: (amt) => `ناقص ${amt}`,
  noSpendYet: "مازال ما تصرف والو",
  emptyEnv: "الظرف خاوي",
  emptyOn: (d) => `بهاد الريتم غادي يخوا نهار ${d}`,
  willLast: "غادي يكفي حتى للإغلاق",
  spentOf: (s, a) => `تصرف ${s} / ${a}`,
  noBudget: "بلا ميزانية",
  setAside: (a) => `تخبّا هاد الدورة: ${a}`,
  goalNeed: (dl, need, m) => `الهدف ${dl} · خاص ${need} فالشهر (${m} شهور)`,
  debtLeft: (due) => `باقي ${due}`,
  kindDebt: "دين · Rollover مقفول ON",
  kindSys: "ظرف النظام · مقفول",
  kindFixe: (on) => `ثابت · rollover ${on ? "ON" : "OFF"}`,
  kindFlex: (on) => `مرن · rollover ${on ? "ON" : "OFF"}`,
  kindGoal: "هدف",
  menuRename: "بدّل السمية",
  menuFix: "تصحيح يدوي",
  menuGoal: "شوف الهدف",
  menuDelete: "مسح",
  newBadge: "جديد",
  emptyNote: "خاوي",
  negNote: "ناقص",
};

export const ENV_COPY: Record<FloussyLocale, Copy> = { fr: FR, en: EN, ar: AR };
export type EnvCopy = Copy;

/* ------------------------------------------------------------------ */
/* Couleurs des cartes (sceau) — 6 thèmes, clair / sombre              */
/* ------------------------------------------------------------------ */

export const SEALS_LIGHT = ["#B4462B", "#2457A6", "#C2185B", "#0A7A53", "#7C4DBA", "#C98A1A"];
export const SEALS_DARK = ["#E07A5F", "#5B8BDA", "#E0608F", "#3DBE8B", "#9775D8", "#D9A23A"];

export const sealIndex = (name: string) =>
  [...name].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 9973, 7) % 6;

/** Billets 200/100/50/20 + pièce de 10 DH selon le reste (design E). */
export function getBanknotes(amount: number) {
  let r = Math.max(0, Math.round(amount));
  const out: number[] = [];
  for (const d of [200, 100, 50, 20]) {
    while (r >= d && out.length < 5) {
      out.push(d);
      r -= d;
    }
  }
  const coin = r >= 10 && out.length < 5;
  out.reverse();
  const mid = out.length > 0 ? ((out.length - 1) / 2).toFixed(1) : "0";
  return {
    notes: out.map((denom, i) => ({ cls: `eb-note n${denom}`, i, mid })),
    coin,
    nCount: out.length,
    noMoney: out.length === 0 && !coin,
  };
}

/* ------------------------------------------------------------------ */
/* Portail + boîte de dialogue + tiroir + toast                        */
/* ------------------------------------------------------------------ */

function Portal({ children, dir }: { children: ReactNode; dir: "ltr" | "rtl" }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.body), []);
  if (!el) return null;
  return createPortal(
    <div className="env11 env11--portal" dir={dir}>
      {children}
    </div>,
    el
  );
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

function useFocusReturn(open: boolean, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>(
      "input, textarea, select, button:not([data-close])"
    );
    (first ?? node)?.focus();
    return () => previous?.focus?.();
  }, [open, ref]);
}

export function EnvModal({
  open,
  title,
  onClose,
  dir,
  wide,
  closeLabel,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  dir: "ltr" | "rtl";
  wide?: boolean;
  closeLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEscape(open, onClose);
  useFocusReturn(open, ref);
  if (!open) return null;
  return (
    <Portal dir={dir}>
      <div
        className="env-dlg-wrap"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className={wide ? "env-dlg env-dlg--wide" : "env-dlg"}
        >
          <div className="env-dlg__head">
            <b>{title}</b>
            <button type="button" data-close className="env-dlg__close" onClick={onClose} aria-label={closeLabel}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  );
}

export function EnvDrawer({
  open,
  label,
  onClose,
  dir,
  top,
  children,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  dir: "ltr" | "rtl";
  top: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEscape(open, onClose);
  useFocusReturn(open, ref);
  if (!open) return null;
  return (
    <Portal dir={dir}>
      <div className="env-scrim" onClick={onClose} />
      <aside ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className="env-drawer">
        <div className="env-drawer__top">{top}</div>
        <div className="env-drawer__body">{children}</div>
      </aside>
    </Portal>
  );
}

export type EnvToast = { id: number; text: string; bad?: boolean };

export function EnvToastView({ toast, dir }: { toast: EnvToast | null; dir: "ltr" | "rtl" }) {
  if (!toast) return null;
  return (
    <Portal dir={dir}>
      <div key={toast.id} role="status" className={toast.bad ? "env-toast is-bad" : "env-toast"}>
        <i aria-hidden="true">{toast.bad ? <X size={13} strokeWidth={3} /> : <Check size={13} strokeWidth={3} />}</i>
        <span>{toast.text}</span>
      </div>
    </Portal>
  );
}
