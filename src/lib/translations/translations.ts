import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import type { FloussyLocale } from "@/lib/localePreference";

export const TRANSACTIONS_COPY = {
  fr: {
    title: "Transactions",
    subtitle: "Income feeds Cash. Expenses affect mapped envelopes only.",
    quickEntry: "Saisie rapide",
    quickEntryDesc:
      "Enregistre un mouvement en quelques secondes et vérifie son impact avant validation.",
    bulkEntry: "Saisie collective",
    editTransaction: "Edit transaction",
    createTransaction: "Create transaction",
    openHistory: "Ouvrir l'historique",
    type: "Type",
    expense: "Depense",
    income: "Revenu",
    noCategories: "Aucune catégorie disponible. Crée des catégories pour ajouter une transaction.",
    createCategories: "Créer des catégories",
    noIncomeCategories: "Aucune catégorie de revenu disponible.",
    noExpenseCategories: "Aucune catégorie de dépense mappée.",
    createToContinue: "Crée-en pour continuer.",
    mapToContinue: "Mappe les catégories pour continuer.",
    mapInCategories: "Mapper dans Catégories",
    category: "Category",
    incomeCategoryAuto: "Catégorie revenu (auto)",
    salaryCategoryAuto: "Salaire",
    selectCategory: "Select a category",
    noIncomeOption: "No income categories",
    noExpenseOption: "No expense categories",
    amount: "Amount",
    amountHintIncome: "Le revenu sera ajouté à Cash puis réparti selon ta configuration.",
    amountHintExpense: "La dépense touchera uniquement l’enveloppe reliée à cette catégorie.",
    amountHeroIncome: "Montant du revenu",
    amountHeroExpense: "Montant de la dépense",
    date: "Date",
    description: "Description",
    optionalDescription: "Optional description",
    mappedToEnvelope: (name: string) => `Mapped to envelope: ${name}`,
    mappedEnvelope: "Mapped envelope",
    saveChanges: "Save changes",
    cancel: "Cancel",
    history: "Historique des transactions",
    preview: "Aperçu de répartition",
    previewBase: "Basé sur la configuration active.",
    previewAuto: "La répartition automatique s’applique uniquement aux revenus.",
    incomeDateBeforePeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `Ce revenu est daté au ${incomeDate}, donc avant la période active (${start} ${arrow} ${end}). Il sera compté sur une période précédente. Si c'est le salaire de cette période, choisis une date entre ${start} et ${end}.`,
    incomeDateAfterPeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `Ce revenu est daté au ${incomeDate}, donc après la période active (${start} ${arrow} ${end}). Il sera compté sur une période suivante. Si c'est le salaire de cette période, choisis une date entre ${start} et ${end}.`,
    previewFixedLayer: "1) Engagements fixes (onboarding)",
    previewDebtGoalsLayer: "2) Dettes & objectifs",
    previewFlexibleLayer: "3) Reste vers les enveloppes flexibles (configuration)",
    previewNoLayerItems: "Aucune ligne pour cette étape",
    expenseImpact: "Impact de la dépense",
    expenseImpactBase: "Cette opération débite uniquement l’enveloppe liée à la catégorie.",
    expenseImpactSelectCategory: "Choisis une catégorie pour voir l’impact.",
    expenseImpactNotMapped: "Cette catégorie n’est pas liée à une enveloppe.",
    expenseImpactEnvelope: "Enveloppe",
    expenseImpactCurrent: "Solde actuel",
    expenseImpactAfter: "Solde après opération",
    expenseImpactWarning: "Attention: ce montant peut faire passer l’enveloppe sous zéro.",
    livePreviewTitle: "Aperçu en direct",
    livePreviewDescIncome: "Vois comment ce revenu sera réparti avant de l’enregistrer.",
    livePreviewDescExpense: "Vérifie l’effet immédiat de cette dépense sur l’enveloppe liée.",
    activePeriod: "Période active",
    availableCategories: "Catégories disponibles",
    mappedEnvelopeStatus: "Enveloppe liée",
    noMappedEnvelopeStatus: "Aucune enveloppe liée",
    previewEnterAmount: "Saisis un montant pour voir la répartition.",
    previewLoading: "Simulation en cours…",
    noDistributionConfig:
      "Aucune configuration enregistrée. Tout le revenu ira dans l’enveloppe Cash par défaut.",
    createConfig: "Créer une configuration",
    fixed: "Fixe",
    remainsInCash: "Reste en Cash",
    duplicates: "Doublons",
    downloadCsv: "Télécharger CSV",
    historyFilters: "Historique et filtres des transactions.",
    filters: "Filters",
    from: "From",
    to: "To",
    all: "All",
    envelope: "Envelope",
    cash: "Cash",
    unmapped: "Unmapped",
    mapped: "Mapped",
    search: "Search",
    searchPlaceholder: "Search by description or category",
    noTransactions: "No transactions",
    noTransactionsDescription: "Create your first transaction to get started.",
    tableDate: "Date",
    tableType: "Type",
    tableCategory: "Category",
    tableEnvelope: "Envelope",
    tableAmount: "Amount",
    tableDescription: "Description",
    tableActions: "Actions",
    edit: "Edit",
    delete: "Delete",
    rows: "Rows",
    prev: "Prev",
    next: "Next",
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    duplicateTitle: "Transactions en doublon",
    duplicateSubtitle: "Nous conservons la plus ancienne transaction et supprimons le reste.",
    duplicateCount: (count: number) => `${count} doublon(s)`,
    duplicateAlertTitle: "Doublons détectés dans l’historique.",
    duplicateAlertDescription: (count: number) =>
      `${count} transaction(s) en trop ont été repérées. Vérifie-les avant de continuer.`,
    duplicateAlertAction: "Voir les doublons",
    deleteDuplicates: "Supprimer les doublons",
    noDuplicates: "Aucun doublon",
    noDuplicatesDescription: "Tes transactions sont propres.",
    entries: "entrées",
    categoryFallback: "Catégorie",
    envelopeFallback: "Enveloppe",
    kept: "Conservée",
    duplicate: "Doublon",
    duplicateBeforeSave: "Transaction en doublon détectée.",
    duplicateBeforeSaveDescription:
      "Une transaction identique existe déjà avec le même type, la même date, le même montant, la même catégorie et le même commentaire.",
    duplicateBeforeSaveFix: "Corriger cette saisie",
    duplicateBeforeSaveOpenExisting: "Ouvrir l’opération existante",
    duplicateBeforeSaveConfirm:
      "Si cette opération est réellement distincte, appuyez à nouveau sur Enregistrer pour confirmer.",
    addSuccess: "Ajout reussi.",
    addSuccessDescription: "La transaction a ete ajoutee.",
    distributionApplied: "Répartition appliquée.",
    distributionAppliedDescription: "Les enveloppes ont été mises à jour.",
    distributionFailed: "Répartition échouée.",
    transactionDeleted: "Transaction supprimée",
    transactionDeletedDescription: "La transaction a bien été supprimée.",
    duplicatesDeleted: "Doublons supprimés",
    duplicatesDeletedDescription: (count: number) => `${count} doublon(s) supprimé(s).`,
    partialDelete: "Suppression partielle",
    partialDeleteDescription: (success: number, failed: number) =>
      `${success} supprimé(s), ${failed} en erreur.`,
    unknownError: "Unknown error",
    invalidRequest: "Invalid request",
    requestFailed: "Request failed",
    categoryNotMapped:
      "Catégorie non mappée. Associe-la à une enveloppe avant de créer la dépense.",
    pleaseSelectCategory: "Please select a category.",
    amountRequired: "Amount is required.",
  },
  en: {
    title: "Transactions",
    subtitle: "Income feeds Cash. Expenses affect mapped envelopes only.",
    quickEntry: "Quick entry",
    quickEntryDesc:
      "Capture a movement in seconds and review its impact before saving.",
    bulkEntry: "Bulk entry",
    editTransaction: "Edit transaction",
    createTransaction: "Create transaction",
    openHistory: "Open history",
    type: "Type",
    expense: "Expense",
    income: "Income",
    noCategories: "No categories available. Create categories before adding a transaction.",
    createCategories: "Create categories",
    noIncomeCategories: "No income categories available.",
    noExpenseCategories: "No mapped expense categories available.",
    createToContinue: "Create some to continue.",
    mapToContinue: "Map categories to continue.",
    mapInCategories: "Map in Categories",
    category: "Category",
    incomeCategoryAuto: "Income category (auto)",
    salaryCategoryAuto: "Salary",
    selectCategory: "Select a category",
    noIncomeOption: "No income categories",
    noExpenseOption: "No expense categories",
    amount: "Amount",
    amountHintIncome: "This income will be added to Cash, then split using your active setup.",
    amountHintExpense: "This expense will affect only the envelope linked to this category.",
    amountHeroIncome: "Income amount",
    amountHeroExpense: "Expense amount",
    date: "Date",
    description: "Description",
    optionalDescription: "Optional description",
    mappedToEnvelope: (name: string) => `Mapped to envelope: ${name}`,
    mappedEnvelope: "Mapped envelope",
    saveChanges: "Save changes",
    cancel: "Cancel",
    history: "Transaction history",
    preview: "Distribution preview",
    previewBase: "Based on the active setup.",
    previewAuto: "Automatic distribution applies to income only.",
    incomeDateBeforePeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `This income is dated ${incomeDate}, which is before the active period (${start} ${arrow} ${end}). It will be counted in a previous cycle. If this is this cycle's salary, pick a date between ${start} and ${end}.`,
    incomeDateAfterPeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `This income is dated ${incomeDate}, which is after the active period (${start} ${arrow} ${end}). It will be counted in the next cycle. If this is this cycle's salary, pick a date between ${start} and ${end}.`,
    previewFixedLayer: "1) Fixed commitments (onboarding)",
    previewDebtGoalsLayer: "2) Debts & goals",
    previewFlexibleLayer: "3) Remaining amount to flexible envelopes (configuration)",
    previewNoLayerItems: "No rows for this stage",
    expenseImpact: "Expense impact",
    expenseImpactBase: "This transaction debits only the envelope mapped to the selected category.",
    expenseImpactSelectCategory: "Select a category to preview impact.",
    expenseImpactNotMapped: "This category is not mapped to any envelope.",
    expenseImpactEnvelope: "Envelope",
    expenseImpactCurrent: "Current balance",
    expenseImpactAfter: "Balance after transaction",
    expenseImpactWarning: "Warning: this amount may push the envelope below zero.",
    livePreviewTitle: "Live preview",
    livePreviewDescIncome: "See how this income will be distributed before saving it.",
    livePreviewDescExpense: "Check the immediate effect of this expense on the linked envelope.",
    activePeriod: "Active period",
    availableCategories: "Available categories",
    mappedEnvelopeStatus: "Linked envelope",
    noMappedEnvelopeStatus: "No linked envelope",
    previewEnterAmount: "Enter an amount to preview distribution.",
    previewLoading: "Running simulation…",
    noDistributionConfig:
      "No saved configuration. All income will go to the Cash envelope by default.",
    createConfig: "Create configuration",
    fixed: "Fixed",
    remainsInCash: "Left in Cash",
    duplicates: "Duplicates",
    downloadCsv: "Download CSV",
    historyFilters: "Transaction history and filters.",
    filters: "Filters",
    from: "From",
    to: "To",
    all: "All",
    envelope: "Envelope",
    cash: "Cash",
    unmapped: "Unmapped",
    mapped: "Mapped",
    search: "Search",
    searchPlaceholder: "Search by description or category",
    noTransactions: "No transactions",
    noTransactionsDescription: "Create your first transaction to get started.",
    tableDate: "Date",
    tableType: "Type",
    tableCategory: "Category",
    tableEnvelope: "Envelope",
    tableAmount: "Amount",
    tableDescription: "Description",
    tableActions: "Actions",
    edit: "Edit",
    delete: "Delete",
    rows: "Rows",
    prev: "Prev",
    next: "Next",
    pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
    duplicateTitle: "Duplicate transactions",
    duplicateSubtitle: "We keep the oldest transaction and remove the rest.",
    duplicateCount: (count: number) => `${count} duplicate(s)`,
    duplicateAlertTitle: "Duplicates detected in history.",
    duplicateAlertDescription: (count: number) =>
      `${count} extra transaction(s) were found. Review them before continuing.`,
    duplicateAlertAction: "Review duplicates",
    deleteDuplicates: "Delete duplicates",
    noDuplicates: "No duplicates",
    noDuplicatesDescription: "Your transactions look clean.",
    entries: "entries",
    categoryFallback: "Category",
    envelopeFallback: "Envelope",
    kept: "Kept",
    duplicate: "Duplicate",
    duplicateBeforeSave: "Duplicate transaction detected.",
    duplicateBeforeSaveDescription:
      "An identical transaction already exists with the same type, date, amount, category, and comment.",
    duplicateBeforeSaveFix: "Fix this entry",
    duplicateBeforeSaveOpenExisting: "Open existing transaction",
    duplicateBeforeSaveConfirm:
      "If this really is a separate transaction, press Save again to confirm.",
    addSuccess: "Added successfully.",
    addSuccessDescription: "The transaction has been added.",
    distributionApplied: "Distribution applied.",
    distributionAppliedDescription: "Envelopes have been updated.",
    distributionFailed: "Distribution failed.",
    transactionDeleted: "Transaction deleted",
    transactionDeletedDescription: "The transaction was removed.",
    duplicatesDeleted: "Duplicates deleted",
    duplicatesDeletedDescription: (count: number) => `${count} duplicate(s) deleted.`,
    partialDelete: "Partial delete",
    partialDeleteDescription: (success: number, failed: number) =>
      `${success} deleted, ${failed} failed.`,
    unknownError: "Unknown error",
    invalidRequest: "Invalid request",
    requestFailed: "Request failed",
    categoryNotMapped:
      "Category not mapped. Link it to an envelope before creating the expense.",
    pleaseSelectCategory: "Please select a category.",
    amountRequired: "Amount is required.",
  },
  ar: {
    title: "العمليات",
    subtitle: "منين كتسجل دخل، كيزيد فالكاش. ومنين كتسجل مصروف، كينقص من الظرف المرتبط.",
    quickEntry: "تسجيل سريع",
    quickEntryDesc:
      "سجل العملية ديالك بسرعة، وشوف الأثر ديالها قبل ما تحفظها.",
    bulkEntry: "إضافة جماعية",
    editTransaction: "بدّل العملية",
    createTransaction: "زيد عملية",
    openHistory: "حل تاريخ العمليات",
    type: "النوع",
    expense: "مصروف",
    income: "دخل",
    noCategories: "ما كاين حتى فئة دابا. زيد الفئات باش تقدر تزيد عملية.",
    createCategories: "زيد الفئات",
    noIncomeCategories: "ما كايناش فئات ديال الدخل.",
    noExpenseCategories: "ما كايناش فئات ديال المصاريف مربوطة.",
    createToContinue: "زيدهم باش تكمل.",
    mapToContinue: "ربط الفئات باش تكمل.",
    mapInCategories: "ربط فصفحة الفئات",
    category: "الفئة",
    incomeCategoryAuto: "فئة الدخل (تلقائي)",
    salaryCategoryAuto: "سالير",
    selectCategory: "اختار فئة",
    noIncomeOption: "ما كايناش فئات ديال الدخل",
    noExpenseOption: "ما كايناش فئات ديال المصروف",
    amount: "المبلغ",
    amountHintIncome: "هاد الدخل غادي يزيد فالكاش، ومن بعد يتقسم على حساب الخطة الحالية.",
    amountHintExpense: "هاد المصروف غادي ينقص غير من الظرف المرتابط بهاد الفئة.",
    amountHeroIncome: "مبلغ الدخل",
    amountHeroExpense: "مبلغ المصروف",
    date: "التاريخ",
    description: "الوصف",
    optionalDescription: "وصف اختياري",
    mappedToEnvelope: (name: string) => `مربوط بظرف: ${name}`,
    mappedEnvelope: "الظرف المربوط",
    saveChanges: "حفظ التعديلات",
    cancel: "إلغاء",
    history: "تاريخ العمليات",
    preview: "معاينة التوزيع",
    previewBase: "مبني على الإعداد الحالي.",
    previewAuto: "التوزيع التلقائي كيتطبق غير ملي كتسجل دخل.",
    incomeDateBeforePeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `هاد الدخل بتاريخ ${incomeDate}، يعني قبل الفترة النشيطة (${start} ${arrow} ${end}). غادي يتحسب فالدورة اللي قبل. إلى كان هادا دخل هاد الدورة، اختار تاريخ بين ${start} و ${end}.`,
    incomeDateAfterPeriod: (
      incomeDate: string,
      start: string,
      end: string,
      arrow: string
    ) =>
      `هاد الدخل بتاريخ ${incomeDate}، يعني من بعد الفترة النشيطة (${start} ${arrow} ${end}). غادي يتحسب فالدورة الجاية. إلى كان هادا دخل هاد الدورة، اختار تاريخ بين ${start} و ${end}.`,
    previewFixedLayer: "1) الالتزامات الثابتة (onboarding)",
    previewDebtGoalsLayer: "2) الديون والأهداف",
    previewFlexibleLayer: "3) الباقي كيمشي للأظرفة المرنة (configuration)",
    previewNoLayerItems: "ما كايناش أسطر فهاد المرحلة",
    expenseImpact: "تأثير المصروف",
    expenseImpactBase: "هاد العملية كتخصم غير من الظرف المربوط بهاد الفئة.",
    expenseImpactSelectCategory: "اختار فئة باش تبان المعاينة.",
    expenseImpactNotMapped: "هاد الفئة ما مربوطة حتى بظرف.",
    expenseImpactEnvelope: "الظرف",
    expenseImpactCurrent: "الرصيد الحالي",
    expenseImpactAfter: "الرصيد من بعد العملية",
    expenseImpactWarning: "انتباه: هاد المبلغ يقدر ينزل الظرف تحت الصفر.",
    livePreviewTitle: "معاينة مباشرة",
    livePreviewDescIncome: "شوف كيفاش غادي يتقسم هاد الدخل قبل ما تسجلو.",
    livePreviewDescExpense: "شوف الأثر ديال هاد المصروف على الظرف المرتابط قبل الحفظ.",
    activePeriod: "الفترة الحالية",
    availableCategories: "الفئات المتوفرة",
    mappedEnvelopeStatus: "الظرف المرتابط",
    noMappedEnvelopeStatus: "ما كاين حتى ظرف مربوط",
    previewEnterAmount: "دخل المبلغ باش تشوف المعاينة.",
    previewLoading: "كنديرو المحاكاة…",
    noDistributionConfig:
      "ما كاين حتى إعداد محفوظ. الدخل كامل غادي يمشي لظرف الكاش بشكل افتراضي.",
    createConfig: "صاوب إعداد",
    fixed: "ثابت",
    remainsInCash: "الباقي فالكاش",
    duplicates: "المكررين",
    downloadCsv: "حمّل CSV",
    historyFilters: "تاريخ العمليات والفلاتر.",
    filters: "الفلاتر",
    from: "من",
    to: "حتى",
    all: "الكل",
    envelope: "الظرف",
    cash: "لكاش",
    unmapped: "ما مربوطش",
    mapped: "مربوط",
    search: "البحث",
    searchPlaceholder: "قلب بالوصف أو الفئة",
    noTransactions: "ما كايناش عمليات",
    noTransactionsDescription: "زيد أول عملية باش تبدا.",
    tableDate: "التاريخ",
    tableType: "النوع",
    tableCategory: "الفئة",
    tableEnvelope: "الظرف",
    tableAmount: "المبلغ",
    tableDescription: "الوصف",
    tableActions: "العمليات",
    edit: "بدّل",
    delete: "حذف",
    rows: "عدد السطور",
    prev: "السابق",
    next: "التالي",
    pageOf: (page: number, total: number) => `الصفحة ${page} من ${total}`,
    duplicateTitle: "عمليات مكررة",
    duplicateSubtitle: "غادي نخليو الأقدم ونحيدو الباقي.",
    duplicateCount: (count: number) => `${count} مكرر`,
    duplicateAlertTitle: "لقينا عمليات مكررين فالتاريخ.",
    duplicateAlertDescription: (count: number) =>
      `كاينين ${count} عمليات زايدين مكررين. راجعهم قبل ما تكمل.`,
    duplicateAlertAction: "شوف المكررين",
    deleteDuplicates: "حيد المكررين",
    noDuplicates: "ما كاين حتى مكرر",
    noDuplicatesDescription: "العمليات ديالك نقيين.",
    entries: "عمليات",
    categoryFallback: "فئة",
    envelopeFallback: "ظرف",
    kept: "تبقات",
    duplicate: "مكرر",
    duplicateBeforeSave: "لقينا عملية مكررة.",
    duplicateBeforeSaveDescription:
      "كاينة عملية بحالها بنفس النوع، التاريخ، المبلغ، الفئة، والتعليق.",
    duplicateBeforeSaveFix: "نرجع نصلح هاد الإدخال",
    duplicateBeforeSaveOpenExisting: "نفتح العملية الموجودة",
    duplicateBeforeSaveConfirm:
      "إلا كانت هاد العملية بصح مختلفة، عاود كليك على \"حفظ\" باش تأكد.",
    addSuccess: "تزادت العملية بنجاح.",
    addSuccessDescription: "تسجلات العملية.",
    distributionApplied: "تطبق التوزيع.",
    distributionAppliedDescription: "تحدّثات الأظرفة.",
    distributionFailed: "ما تطبقش التوزيع.",
    transactionDeleted: "تم حذف العملية",
    transactionDeletedDescription: "تحيدات العملية بنجاح.",
    duplicatesDeleted: "تم حذف المكررين",
    duplicatesDeletedDescription: (count: number) => `تحيدو ${count} مكرر.`,
    partialDelete: "حذف جزئي",
    partialDeleteDescription: (success: number, failed: number) =>
      `تحيدو ${success} وبقاو ${failed} فيهم مشكل.`,
    unknownError: "وقع مشكل غير متوقع",
    invalidRequest: "الطلب ما صالحش",
    requestFailed: "ما نجحش الطلب",
    categoryNotMapped:
      "هاد الفئة ما مربوطة حتى بظرف. ربطها بظرف باش يتحدث الميزان تلقائياً.",
    pleaseSelectCategory: "اختار فئة.",
    amountRequired: "المبلغ ضروري.",
  },
} as const;

export type DashboardCopy = {
  unknownError: string;
  unknownUpdateError: string;
  invalidPeriod: string;
  incomeDeclaredTitle: string;
  incomeDeclaredDescription: string;
  errorTitle: string;
  deletedTitle: string;
  deletedDescription: string;
  deleteErrorTitle: string;
  sweepDoneTitle: string;
  sweepDoneDescription: string;
  sweepErrorTitle: string;
  incomeDialogTitle: string;
  incomeDialogDescription: (count: number) => string;
  incomeDialogBody: string;
  toDeclare: string;
  hideReminder: string;
  ignore: string;
  declareNow: string;
  periodTitle: string;
  periodDescription: string;
  preset7: string;
  preset30: string;
  preset90: string;
  presetYtd: string;
  presetCustom: string;
  start: string;
  end: string;
  startPlaceholder: string;
  endPlaceholder: string;
  selectedPeriod: string;
  cancel: string;
  apply: string;
  skip: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  noPeriod: string;
  changePeriod: string;
  addExpense: string;
  addIncome: string;
  sweepRunning: string;
  sweep: string;
  loading: string;
  todo: string;
  sweepBootstrapTitle: string;
  sweepBootstrapDesc: string;
  sweepBootstrapHelp: string;
  sweepBootstrapAction: string;
  declareIncome: string;
  declared: string;
  categoriesToMap: (count: number) => string;
  categoriesToMapDesc: string;
  categoriesToMapHelp: string;
  mapNow: string;
  overspentAlert: (count: number, names: string) => string;
  overspentDesc: string;
  overspentHelp: string;
  seeAll: string;
  sweepReady: string;
  sweepReadyDesc: string;
  sweepExecute: string;
  executing: string;
  sweepNotDue: string;
  sweepNotDueDesc: string;
  sweepHelp: string;
  availableCash: string;
  notAllocated: string;
  periodExpenses: string;
  mappedExpenses: string;
  unmappedSuffix: (count: number) => string;
  periodIncome: string;
  periodNet: string;
  topEnvelopes: string;
  allocateFunds: string;
  viewAllEnvelopes: string;
  filterActive: string;
  filterOverspent: string;
  filterNear: string;
  noEnvelopeTitle: string;
  noEnvelopeDescription: string;
  spentLabel: string;
  spentFallback: string;
  recentExpenses: string;
  noExpensesTitle: string;
  noExpensesDescription: string;
  noRecentTitle: string;
  noRecentDescription: string;
  expenseFallback: string;
  unmapped: string;
  mapped: string;
  edit: string;
  delete: string;
  spendingByEnvelope: string;
  netWorthTrend: string;
  quickActions: string;
  quickAddExpense: string;
  quickAllocateCash: string;
  quickMapCategories: string;
  widgetCashSplit: string;
  widgetCashSplitDesc: string;
  widgetPlanDirection: string;
  widgetPlanCoverage: string;
  widgetAutoSweep: string;
  widgetAutoSweepOn: string;
  widgetAutoSweepOff: string;
  widgetOpenDistribution: string;
  widgetOpenSweeps: string;
  widgetDebt: string;
  widgetGoals: string;
  widgetMorona: string;
  widgetNoPlan: string;
  widgetFixed: string;
  widgetDebtGoals: string;
  widgetFlexible: string;
  widgetCashLeft: string;
  widgetRisk: string;
  widgetRiskDesc: string;
  widgetRiskAllHealthy: string;
  widgetDebtGoalsPressure: string;
  widgetDebtPressure: string;
  widgetGoalsPressure: string;
  widgetNoDebt: string;
  widgetNoGoals: string;
  widgetAnomalies: string;
  widgetAnomaliesDesc: string;
  widgetAnomalyNoConfig: string;
  widgetAnomalyNoConfigHelp: string;
  fabDeclareIncome: string;
  fabDeclareExpense: string;
  quickTxTitle: string;
  quickTxDescription: string;
  quickTxIncomeTab: string;
  quickTxExpenseTab: string;
  quickTxAmount: string;
  quickTxDate: string;
  quickTxCategory: string;
  quickTxDescriptionField: string;
  quickTxDescriptionPlaceholder: string;
  quickTxSelectCategory: string;
  quickTxMappedTo: (name: string) => string;
  quickTxNoIncomeCategories: string;
  quickTxNoExpenseCategories: string;
  quickTxAmountRequired: string;
  quickTxCategoryRequired: string;
  quickTxSavedIncome: string;
  quickTxSavedExpense: string;
  quickTxUnknownError: string;
  quickTxBeforePeriod: (incomeDate: string, start: string, end: string, arrow: string) => string;
  quickTxAfterPeriod: (incomeDate: string, start: string, end: string, arrow: string) => string;
  quickTxSubmitIncome: string;
  quickTxSubmitExpense: string;
  quickTxSuggestedAmounts: string;
  quickTxProgressLabel: string;
  quickTxSelectedDateLabel: string;
  quickTxSmartCategories: string;
  quickTxUseLastExpense: string;
  quickTxLastExpenseLabel: string;
  quickTxRecurringHint: string;
  quickTxApplyRecurring: string;
  quickTxDescriptionSuggestions: string;
  quickTxAmountAnomaly: (amount: string, usual: string) => string;
  tooltipAvailableCash: string;
  tooltipPeriodExpenses: string;
  tooltipPeriodNet: string;
  budgetSummaryTitle: string;
  chartSpent: string;
  chartReserved: string;
  chartFree: string;
  chartTotalResources: string;
  chartTooltipSpent: string;
  chartTooltipReserved: string;
  chartTooltipFree: string;
};

export const DASHBOARD_COPY: Record<FloussyLocale, DashboardCopy> = {
  fr: {
    unknownError: "Erreur inconnue",
    unknownUpdateError: "Impossible de mettre à jour.",
    invalidPeriod: "La date de début doit être strictement avant la date de fin.",
    incomeDeclaredTitle: "Revenu déclaré",
    incomeDeclaredDescription: "Le rappel a été mis à jour.",
    errorTitle: "Erreur",
    deletedTitle: "Transaction supprimée",
    deletedDescription: "Le dashboard a été mis à jour.",
    deleteErrorTitle: "Suppression impossible",
    sweepDoneTitle: "Sweep exécuté",
    sweepDoneDescription: "Les soldes ont été mis à jour.",
    sweepErrorTitle: "Sweep impossible",
    incomeDialogTitle: "Revenus à déclarer",
    incomeDialogDescription: (count: number) => `${count} revenu(s) à déclarer.`,
    incomeDialogBody:
      "Tu as des rappels en attente. Déclare ton revenu pour garder un suivi correct.",
    toDeclare: "À déclarer",
    hideReminder: "Ne plus afficher ce message",
    ignore: "Ignorer",
    declareNow: "Déclarer maintenant",
    periodTitle: "Choisir une période",
    periodDescription: "Sélectionne une période pour mettre à jour les indicateurs. La date de fin est exclue.",
    preset7: "7 jours",
    preset30: "30 jours",
    preset90: "90 jours",
    presetYtd: "YTD",
    presetCustom: "Personnalisé",
    start: "Début",
    end: "Fin",
    startPlaceholder: "Date de début",
    endPlaceholder: "Date de fin",
    selectedPeriod: "Période sélectionnée (fin exclue)",
    cancel: "Annuler",
    apply: "Appliquer",
    skip: "Passer",
    eyebrow: "Cockpit budget",
    title: "Dashboard",
    subtitle: "Vue globale de tes flux, enveloppes et actions urgentes.",
    noPeriod: "Aucune période",
    changePeriod: "Changer la période",
    addExpense: "+ Ajouter une dépense",
    addIncome: "+ Ajouter un revenu",
    sweepRunning: "Sweep...",
    sweep: "Sweep",
    loading: "Chargement...",
    todo: "À faire maintenant",
    sweepBootstrapTitle: "⏳ Première déclaration de revenu à faire",
    sweepBootstrapDesc:
      "Déclare ton premier revenu après l’onboarding pour démarrer les cycles sur une base réelle.",
    sweepBootstrapHelp:
      "On a déjà préparé une date et un montant d’exemple depuis l’onboarding. Vérifie-les, puis enregistre ton premier revenu pour lancer les cycles.",
    sweepBootstrapAction: "Déclarer le premier revenu",
    declareIncome: "Déclarer revenu",
    declared: "Déclaré",
    categoriesToMap: (count: number) =>
      `⚠️ ${count} catégories à mapper → tes dépenses ne seront pas bien rangées`,
    categoriesToMapDesc: "Relie ces catégories à une enveloppe pour que chaque dépense tombe au bon endroit.",
    categoriesToMapHelp: "Ouvre la page des catégories, puis choisis l’enveloppe correcte pour chaque catégorie non liée.",
    mapNow: "Mapper maintenant",
    overspentAlert: (count: number, names: string) =>
      `🔴 ${count} enveloppes dépassées (${names}${count > 3 ? "..." : ""})`,
    overspentDesc: "Une ou plusieurs enveloppes sont passées sous zéro sur la période en cours.",
    overspentHelp: "Ouvre les enveloppes concernées, puis corrige le budget, déclare une dépense oubliée ou réalloue du cash.",
    seeAll: "Voir tout",
    sweepReady: "✅ Sweep prêt",
    sweepReadyDesc: "La période peut être clôturée maintenant et les soldes concernés seront traités.",
    sweepExecute: "Exécuter le sweep",
    executing: "Exécution...",
    sweepNotDue: "🟡 Sweep : pas encore dû",
    sweepNotDueDesc: "Aucune action de sweep n’est nécessaire pour l’instant.",
    sweepHelp: "Le sweep se déclenche seulement quand la période arrive à sa fin et que le revenu attendu a été déclaré.",
    availableCash: "Cash disponible",
    notAllocated: "argent pas encore alloué",
    periodExpenses: "Dépenses période",
    mappedExpenses: "dépenses mappées",
    unmappedSuffix: (count: number) => ` · ${count} non mappées`,
    periodIncome: "Revenus période",
    periodNet: "Net période",
    topEnvelopes: "Top enveloppes",
    allocateFunds: "Allouer des fonds",
    viewAllEnvelopes: "Voir toutes les enveloppes",
    filterActive: "Actives",
    filterOverspent: "Overspent",
    filterNear: "Proches limite",
    noEnvelopeTitle: "Aucune enveloppe à afficher",
    noEnvelopeDescription: "Ajoute des budgets pour suivre tes enveloppes.",
    spentLabel: "dépensé",
    spentFallback: "Dépensé",
    recentExpenses: "Dépenses récentes",
    noExpensesTitle: "Aucune dépense cette période",
    noExpensesDescription: "Ajoute une dépense pour voir la répartition.",
    noRecentTitle: "Aucune dépense récente",
    noRecentDescription: "Les dernières dépenses apparaîtront ici.",
    expenseFallback: "Dépense",
    unmapped: "Unmapped",
    mapped: "Mapped",
    edit: "Modifier",
    delete: "Supprimer",
    spendingByEnvelope: "Spending by envelope",
    netWorthTrend: "Net worth trend",
    quickActions: "Actions rapides",
    quickAddExpense: "Ajouter dépense",
    quickAllocateCash: "Allouer cash",
    quickMapCategories: "Mapper catégories",
    widgetCashSplit: "Répartition du cash",
    widgetCashSplitDesc: "Simulation sur le cash disponible actuel.",
    widgetPlanDirection: "Direction du plan",
    widgetPlanCoverage: "Couverture distribution",
    widgetAutoSweep: "Sweep auto",
    widgetAutoSweepOn: "Activé",
    widgetAutoSweepOff: "Désactivé",
    widgetOpenDistribution: "Ouvrir Distribution",
    widgetOpenSweeps: "Ouvrir Sweeps",
    widgetDebt: "Dette",
    widgetGoals: "Objectifs",
    widgetMorona: "Morona (dépenses flex)",
    widgetNoPlan: "Aucun plan onboarding détecté.",
    widgetFixed: "Fixes",
    widgetDebtGoals: "Dettes + objectifs",
    widgetFlexible: "Flexible (config)",
    widgetCashLeft: "Reste cash",
    widgetRisk: "Enveloppes à risque",
    widgetRiskDesc: "Priorité aux enveloppes proches ou au-dessus de la limite.",
    widgetRiskAllHealthy: "✅ Toutes les enveloppes sont dans les limites — aucune alerte.",
    widgetDebtGoalsPressure: "Pression dettes & objectifs",
    widgetDebtPressure: "Dettes",
    widgetGoalsPressure: "Objectifs",
    widgetNoDebt: "Aucune enveloppe dette détectée.",
    widgetNoGoals: "Aucun objectif actif.",
    widgetAnomalies: "Anomalies système",
    widgetAnomaliesDesc: "Points à corriger pour éviter les écarts de suivi.",
    widgetAnomalyNoConfig: "Configuration de distribution incomplète ou inactive.",
    widgetAnomalyNoConfigHelp: "Ouvre Distribution et sauvegarde une configuration active.",
    fabDeclareIncome: "Déclarer revenu",
    fabDeclareExpense: "Déclarer dépense",
    quickTxTitle: "Déclarer une opération",
    quickTxDescription:
      "Saisie rapide sans quitter le dashboard. Le revenu alimente le Cash, la dépense débite l’enveloppe liée.",
    quickTxIncomeTab: "Revenu",
    quickTxExpenseTab: "Dépense",
    quickTxAmount: "Montant",
    quickTxDate: "Date",
    quickTxCategory: "Catégorie",
    quickTxDescriptionField: "Description",
    quickTxDescriptionPlaceholder: "Optionnel (ex: courses, salaire...)",
    quickTxSelectCategory: "Choisir une catégorie",
    quickTxMappedTo: (name: string) => `Impact sur l’enveloppe: ${name}`,
    quickTxNoIncomeCategories:
      "Aucune catégorie revenu détectée. Crée une catégorie avant de continuer.",
    quickTxNoExpenseCategories:
      "Aucune catégorie dépense mappée. Mappe une catégorie à une enveloppe pour continuer.",
    quickTxAmountRequired: "Le montant est requis.",
    quickTxCategoryRequired: "La catégorie est requise.",
    quickTxSavedIncome: "Revenu déclaré.",
    quickTxSavedExpense: "Dépense déclarée.",
    quickTxUnknownError: "Impossible d’enregistrer l’opération.",
    quickTxBeforePeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `Ce revenu (${incomeDate}) est avant la période active (${start} ${arrow} ${end}) et sera compté dans la période précédente.`,
    quickTxAfterPeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `Ce revenu (${incomeDate}) est après la période active (${start} ${arrow} ${end}) et sera compté dans la période suivante.`,
    quickTxSubmitIncome: "Enregistrer le revenu",
    quickTxSubmitExpense: "Enregistrer la dépense",
    quickTxSuggestedAmounts: "Montants rapides",
    quickTxProgressLabel: "Progression",
    quickTxSelectedDateLabel: "Date choisie",
    quickTxSmartCategories: "Catégories proposées",
    quickTxUseLastExpense: "Reprendre",
    quickTxLastExpenseLabel: "Dernière dépense similaire",
    quickTxRecurringHint: "Habitude détectée",
    quickTxApplyRecurring: "Appliquer cette habitude",
    quickTxDescriptionSuggestions: "Descriptions suggérées",
    quickTxAmountAnomaly: (amount: string, usual: string) =>
      `Montant inhabituel (${amount}). Montant habituel: ${usual}.`,
    tooltipAvailableCash: "Cash restant disponible non encore alloué aux enveloppes.",
    tooltipPeriodExpenses: "Somme de toutes les dépenses effectuées dans la période active.",
    tooltipPeriodNet: "Revenus totaux moins l'ensemble des dépenses de la période.",
    budgetSummaryTitle: "Résumé du Budget de la Période",
    chartSpent: "Dépensé",
    chartReserved: "Réservé",
    chartFree: "Cash Libre",
    chartTotalResources: "Ressources",
    chartTooltipSpent: "Dépenses réelles effectuées",
    chartTooltipReserved: "Montant alloué aux enveloppes resté non dépensé",
    chartTooltipFree: "Argent disponible non alloué à une enveloppe",
  },
  en: {
    unknownError: "Unknown error",
    unknownUpdateError: "Unable to update.",
    invalidPeriod: "Start date must be strictly before end date.",
    incomeDeclaredTitle: "Income declared",
    incomeDeclaredDescription: "The reminder has been updated.",
    errorTitle: "Error",
    deletedTitle: "Transaction deleted",
    deletedDescription: "The dashboard has been updated.",
    deleteErrorTitle: "Delete failed",
    sweepDoneTitle: "Sweep completed",
    sweepDoneDescription: "Balances have been updated.",
    sweepErrorTitle: "Sweep failed",
    incomeDialogTitle: "Income to declare",
    incomeDialogDescription: (count: number) => `${count} income reminder(s) due.`,
    incomeDialogBody:
      "You have pending reminders. Declare your income to keep tracking accurate.",
    toDeclare: "To declare",
    hideReminder: "Do not show this message again",
    ignore: "Ignore",
    declareNow: "Declare now",
    periodTitle: "Choose a period",
    periodDescription: "Select a period to refresh the indicators. End date is excluded.",
    preset7: "7 days",
    preset30: "30 days",
    preset90: "90 days",
    presetYtd: "YTD",
    presetCustom: "Custom",
    start: "Start",
    end: "End",
    startPlaceholder: "Start date",
    endPlaceholder: "End date",
    selectedPeriod: "Selected period (end excluded)",
    cancel: "Cancel",
    apply: "Apply",
    skip: "Skip",
    eyebrow: "Budget cockpit",
    title: "Dashboard",
    subtitle: "Global view of your flows, envelopes, and urgent actions.",
    noPeriod: "No period selected",
    changePeriod: "Change period",
    addExpense: "+ Add expense",
    addIncome: "+ Add income",
    sweepRunning: "Sweep...",
    sweep: "Sweep",
    loading: "Loading...",
    todo: "Do now",
    sweepBootstrapTitle: "⏳ First income declaration still needed",
    sweepBootstrapDesc:
      "Declare your first income after onboarding so cycles start from a real income event.",
    sweepBootstrapHelp:
      "We already prepared a suggested date and amount from onboarding. Review them, then save the income to activate your cycles.",
    sweepBootstrapAction: "Declare first income",
    declareIncome: "Declare income",
    declared: "Declared",
    categoriesToMap: (count: number) =>
      `⚠️ ${count} categories to map → your spending will stay messy`,
    categoriesToMapDesc: "Link each category to the right envelope so expenses land in the right place.",
    categoriesToMapHelp: "Open categories, then choose an envelope for every category that is still unmapped.",
    mapNow: "Map now",
    overspentAlert: (count: number, names: string) =>
      `🔴 ${count} overspent envelopes (${names}${count > 3 ? "..." : ""})`,
    overspentDesc: "One or more envelopes dropped below zero in the current period.",
    overspentHelp: "Open the affected envelopes, then fix the budget, add the missing expense, or reallocate cash.",
    seeAll: "See all",
    sweepReady: "✅ Sweep ready",
    sweepReadyDesc: "The current period can now be closed and eligible balances will be processed.",
    sweepExecute: "Run sweep",
    executing: "Running...",
    sweepNotDue: "🟡 Sweep: not due yet",
    sweepNotDueDesc: "No sweep action is needed right now.",
    sweepHelp: "A sweep only runs when the period ends and the expected income has been declared.",
    availableCash: "Available cash",
    notAllocated: "not yet allocated",
    periodExpenses: "Period spending",
    mappedExpenses: "mapped spending",
    unmappedSuffix: (count: number) => ` · ${count} unmapped`,
    periodIncome: "Period income",
    periodNet: "Period net",
    topEnvelopes: "Top envelopes",
    allocateFunds: "Allocate funds",
    viewAllEnvelopes: "View all envelopes",
    filterActive: "Active",
    filterOverspent: "Overspent",
    filterNear: "Near limit",
    noEnvelopeTitle: "No envelopes to show",
    noEnvelopeDescription: "Add budgets to track your envelopes.",
    spentLabel: "spent",
    spentFallback: "Spent",
    recentExpenses: "Recent expenses",
    noExpensesTitle: "No expenses this period",
    noExpensesDescription: "Add an expense to see the breakdown.",
    noRecentTitle: "No recent expenses",
    noRecentDescription: "Your latest expenses will appear here.",
    expenseFallback: "Expense",
    unmapped: "Unmapped",
    mapped: "Mapped",
    edit: "Edit",
    delete: "Delete",
    spendingByEnvelope: "Spending by envelope",
    netWorthTrend: "Net worth trend",
    quickActions: "Quick actions",
    quickAddExpense: "Add expense",
    quickAllocateCash: "Allocate cash",
    quickMapCategories: "Map categories",
    widgetCashSplit: "Cash split",
    widgetCashSplitDesc: "Simulation based on currently available cash.",
    widgetPlanDirection: "Plan direction",
    widgetPlanCoverage: "Distribution coverage",
    widgetAutoSweep: "Auto sweep",
    widgetAutoSweepOn: "Enabled",
    widgetAutoSweepOff: "Disabled",
    widgetOpenDistribution: "Open Distribution",
    widgetOpenSweeps: "Open Sweeps",
    widgetDebt: "Debt",
    widgetGoals: "Goals",
    widgetMorona: "Morona (flex spending)",
    widgetNoPlan: "No onboarding plan detected.",
    widgetFixed: "Fixed",
    widgetDebtGoals: "Debts + goals",
    widgetFlexible: "Flexible (config)",
    widgetCashLeft: "Cash left",
    widgetRisk: "At-risk envelopes",
    widgetRiskDesc: "Priority to envelopes near or above limit.",
    widgetRiskAllHealthy: "✅ All envelopes are within limits — no alerts.",
    widgetDebtGoalsPressure: "Debt & goals pressure",
    widgetDebtPressure: "Debts",
    widgetGoalsPressure: "Goals",
    widgetNoDebt: "No debt envelope detected.",
    widgetNoGoals: "No active goals.",
    widgetAnomalies: "System anomalies",
    widgetAnomaliesDesc: "Issues to fix to prevent tracking drift.",
    widgetAnomalyNoConfig: "Distribution configuration is missing or inactive.",
    widgetAnomalyNoConfigHelp: "Open Distribution and save an active configuration.",
    fabDeclareIncome: "Declare income",
    fabDeclareExpense: "Declare expense",
    quickTxTitle: "Declare a transaction",
    quickTxDescription:
      "Quick entry without leaving the dashboard. Income feeds Cash, expense debits the mapped envelope.",
    quickTxIncomeTab: "Income",
    quickTxExpenseTab: "Expense",
    quickTxAmount: "Amount",
    quickTxDate: "Date",
    quickTxCategory: "Category",
    quickTxDescriptionField: "Description",
    quickTxDescriptionPlaceholder: "Optional (ex: groceries, salary...)",
    quickTxSelectCategory: "Select a category",
    quickTxMappedTo: (name: string) => `Envelope impact: ${name}`,
    quickTxNoIncomeCategories:
      "No income category detected. Create one before continuing.",
    quickTxNoExpenseCategories:
      "No mapped expense category found. Map a category to an envelope to continue.",
    quickTxAmountRequired: "Amount is required.",
    quickTxCategoryRequired: "Category is required.",
    quickTxSavedIncome: "Income declared.",
    quickTxSavedExpense: "Expense declared.",
    quickTxUnknownError: "Unable to save this transaction.",
    quickTxBeforePeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `This income (${incomeDate}) is before the active period (${start} ${arrow} ${end}) and will count in the previous cycle.`,
    quickTxAfterPeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `This income (${incomeDate}) is after the active period (${start} ${arrow} ${end}) and will count in the next cycle.`,
    quickTxSubmitIncome: "Save income",
    quickTxSubmitExpense: "Save expense",
    quickTxSuggestedAmounts: "Quick amounts",
    quickTxProgressLabel: "Progress",
    quickTxSelectedDateLabel: "Selected date",
    quickTxSmartCategories: "Suggested categories",
    quickTxUseLastExpense: "Reuse",
    quickTxLastExpenseLabel: "Last similar expense",
    quickTxRecurringHint: "Recurring pattern detected",
    quickTxApplyRecurring: "Apply this pattern",
    quickTxDescriptionSuggestions: "Suggested descriptions",
    quickTxAmountAnomaly: (amount: string, usual: string) =>
      `Unusual amount (${amount}). Usual amount: ${usual}.`,
    tooltipAvailableCash: "Remaining available cash not yet allocated to any envelopes.",
    tooltipPeriodExpenses: "Sum of all expenses made during the active period.",
    tooltipPeriodNet: "Total income minus all expenses in this period.",
    budgetSummaryTitle: "Period Budget Summary",
    chartSpent: "Spent",
    chartReserved: "Reserved",
    chartFree: "Free Cash",
    chartTotalResources: "Resources",
    chartTooltipSpent: "Actual expenses incurred",
    chartTooltipReserved: "Amount allocated to envelopes but not yet spent",
    chartTooltipFree: "Money available and not allocated to any envelope",
  },
  ar: {
    unknownError: "وقع مشكل غير متوقع. عاود المحاولة.",
    unknownUpdateError: "ما قدرناش نحدّثو هاد العملية.",
    invalidPeriod: "تاريخ البداية خاصو يكون قبل بزاف من تاريخ النهاية، ماشي نفس النهار.",
    incomeDeclaredTitle: "تسجّل الدخل",
    incomeDeclaredDescription: "تحدّث التذكير ديال الدخل.",
    errorTitle: "وقع مشكل. عاود المحاولة.",
    deletedTitle: "تم حذف العملية",
    deletedDescription: "تحدّثت لوحة القيادة.",
    deleteErrorTitle: "ما قدرناش نحذفو العملية.",
    sweepDoneTitle: "تم تحويل الفائض.",
    sweepDoneDescription: "تحدّثات الأرصدة.",
    sweepErrorTitle: "ما قدرناش نحولو الفائض.",
    incomeDialogTitle: "مداخيل خاصك تصرح بيهم",
    incomeDialogDescription: (count: number) => `عندك ${count} دخل خاصك تصرح به.`,
    incomeDialogBody:
      "عندك تذكيرات باقين. صرّح بالدخل ديالك باش يبقى التتبع مضبوط.",
    toDeclare: "خاصو تصريح",
    hideReminder: "ما تبقاش توريني هاد الرسالة",
    ignore: "تخطي",
    declareNow: "صرّح دابا",
    periodTitle: "اختار الفترة",
    periodDescription: "اختار الفترة اللي بغيتي تحدّث بها المؤشرات. تاريخ النهاية ما كيتحسبش داخل الفترة.",
    preset7: "7 أيام",
    preset30: "30 يوم",
    preset90: "90 يوم",
    presetYtd: "من بداية العام",
    presetCustom: "مخصصة",
    start: "البداية",
    end: "النهاية",
    startPlaceholder: "تاريخ البداية",
    endPlaceholder: "تاريخ النهاية",
    selectedPeriod: "الفترة المختارة (النهاية ما داخلاش)",
    cancel: "إلغاء",
    apply: "تطبيق",
    skip: "تخطي",
    eyebrow: "قيادة الميزانية",
    title: "لوحة الميزانية",
    subtitle: "نظرة عامة على التدفقات، الأظرفة، والحاجات المستعجلة.",
    noPeriod: "ما كايناش فترة مختارة",
    changePeriod: "بدّل الفترة",
    addExpense: "+ زيد مصروف",
    addIncome: "+ زيد دخل",
    sweepRunning: "كيتنفذ السويب...",
    sweep: "دير السويب",
    loading: "كيتحمّل...",
    todo: "شنو خاصك دير دابا",
    sweepBootstrapTitle: "⏳ باقي خاصك تصرّح بأول دخل",
    sweepBootstrapDesc:
      "صرّح بأول دخل من بعد onboarding باش تبدا الدورات من دخل حقيقي.",
    sweepBootstrapHelp:
      "وجدنا ليك التاريخ والمبلغ اللي جايين من onboarding. راجعهم وعدلهم إلا تبدلو، ومن بعد سجّل أول دخل باش تبدا الدورات.",
    sweepBootstrapAction: "صرّح بأول دخل",
    declareIncome: "صرّح بالدخل",
    declared: "تصرّح به",
    categoriesToMap: (count: number) =>
      `⚠️ عندك ${count} فئات مازال ما مربوطاش`,
    categoriesToMapDesc: "ربط هاد الفئات هو اللي كيخلي كل مصروف يبان فظرفو الصحيح.",
    categoriesToMapHelp: "دخل لصفحة الكاتيغوريات، ومن بعد اختار الظرف المناسب لكل فئة مازال ما تربطاتش.",
    mapNow: "ربط الفئات بالأظرفة دابا",
    overspentAlert: (count: number, names: string) =>
      `🔴 عندك ${count} أظرفة خارجين على الحد (${names}${count > 3 ? "..." : ""})`,
    overspentDesc: "واحد ولا أكثر من الأظرفة نزل تحت الصفر فهاد الفترة.",
    overspentHelp: "دخل للأظرفة المعنيين، ومن بعد صحح الميزانية، ولا زيد المصروف الناقص، ولا وزّع عليهم من الكاش.",
    seeAll: "شوف كاملين",
    sweepReady: "✅ تحويل الفائض واجد",
    sweepReadyDesc: "دابا تقدر تسالي هاد الفترة ويتدار التعامل مع الأرصدة المعنية.",
    sweepExecute: "نفّذ تحويل الفائض",
    executing: "كيتنفذ...",
    sweepNotDue: "🟡 تحويل الفائض: مازال ما وصلش الوقت ديالو",
    sweepNotDueDesc: "دابا ما كاين حتى إجراء خاص بتدوير الباقي.",
    sweepHelp: "تحويل الفائض ما كيتدارش حتى كتوصل نهاية الفترة وكيكون الدخل المتوقع تصرّh به.",
    availableCash: "الكاش المتوفر",
    notAllocated: "فلوس مازال ما توزعاتش",
    periodExpenses: "المصاريف ديال الفترة",
    mappedExpenses: "مصاريف مربوطة",
    unmappedSuffix: (count: number) => ` · ${count} فئات ما مربوطاش`,
    periodIncome: "الدخل ديال الفترة",
    periodNet: "الصافي ديال الفترة",
    topEnvelopes: "الأظرفة المهمة",
    allocateFunds: "وزّع الفلوس",
    viewAllEnvelopes: "شوف جميع الأظرفة",
    filterActive: "شغالين",
    filterOverspent: "خارجين على الحد",
    filterNear: "قريبين للحد",
    noEnvelopeTitle: "ما كاين حتى ظرف يبان هنا",
    noEnvelopeDescription: "زيد الأظرفة ديالك باش تبقى المتابعة واضحة.",
    spentLabel: "المصروف",
    spentFallback: "المصروف",
    recentExpenses: "آخر العمليات",
    noExpensesTitle: "ما كاين حتى مصروف فهاد الفترة",
    noExpensesDescription: "زيد مصروف باش تشوف التوزيع.",
    noRecentTitle: "ما كايناش مصاريف قريبة",
    noRecentDescription: "آخر العمليات غادي يبانوا هنا.",
    expenseFallback: "مصروف",
    unmapped: "ما مربوطش",
    mapped: "مربوط",
    edit: "بدّل",
    delete: "حذف",
    spendingByEnvelope: "تفصيل الصرف حسب الأظرفة",
    netWorthTrend: "تطور الصافي",
    quickActions: "إجراءات سريعة",
    quickAddExpense: "زيد مصروف",
    quickAllocateCash: "وزّع الفلوس",
    quickMapCategories: "ربط الفئات بالأظرفة",
    widgetCashSplit: "توزيع لكاش",
    widgetCashSplitDesc: "محاكاة مبنية على الكاش المتوفر دابا.",
    widgetPlanDirection: "اتجاه الخطة",
    widgetPlanCoverage: "تغطية التوزيع",
    widgetAutoSweep: "تحويل الفائض التلقائي",
    widgetAutoSweepOn: "مفعّل",
    widgetAutoSweepOff: "مطفّي",
    widgetOpenDistribution: "فتح التوزيع",
    widgetOpenSweeps: "فتح تحويلات الفائض",
    widgetDebt: "الديون",
    widgetGoals: "الأهداف",
    widgetMorona: "المرونة (المصاريف)",
    widgetNoPlan: "ما كايناش خطة onboarding دابا.",
    widgetFixed: "الثوابت",
    widgetDebtGoals: "الديون + الأهداف",
    widgetFlexible: "المرونة (config)",
    widgetCashLeft: "الباقي فالكاش",
    widgetRisk: "أظرفة فيها خطر",
    widgetRiskDesc: "أولوية للأظرفة القريبة للحد أو الخارجة عليه.",
    widgetRiskAllHealthy: "✅ جميع الأظرفة فحدودها — ما كاين حتى تحذير.",
    widgetDebtGoalsPressure: "ضغط الديون والأهداف",
    widgetDebtPressure: "الديون",
    widgetGoalsPressure: "الأهداف",
    widgetNoDebt: "ما لقيناش أظرفة ديون.",
    widgetNoGoals: "ما كايناش أهداف مفعلة.",
    widgetAnomalies: "أنوماليات النظام",
    widgetAnomaliesDesc: "نقاط خاصها تصحيح باش التتبع يبقى مضبوط.",
    widgetAnomalyNoConfig: "إعداد التوزيع ناقص ولا ماشي نشط.",
    widgetAnomalyNoConfigHelp: "دخل لصفحة التوزيع وحفظ إعداد نشط.",
    fabDeclareIncome: "صرّح بالدخل",
    fabDeclareExpense: "صرّح بالمصروف",
    quickTxTitle: "صرّح بعملية بسرعة",
    quickTxDescription:
      "دخل العملية مباشرة من لوحة القيادة. الدخل كيمشي للكاش، والمصروف كينقص من الظرف المربوط.",
    quickTxIncomeTab: "دخل",
    quickTxExpenseTab: "مصروف",
    quickTxAmount: "المبلغ",
    quickTxDate: "التاريخ",
    quickTxCategory: "الفئة",
    quickTxDescriptionField: "البيان",
    quickTxDescriptionPlaceholder: "اختياري (مثال: الماكلة، سالير...)",
    quickTxSelectCategory: "اختار فئة",
    quickTxMappedTo: (name: string) => `التأثير على الظرف: ${name}`,
    quickTxNoIncomeCategories:
      "ما لقيناش فئة دخل. زيد فئة دخل قبل ما تكمل.",
    quickTxNoExpenseCategories:
      "ما كايناش فئة مصروف مربوطة. ربط فئة بظرف باش تقدر تكمل.",
    quickTxAmountRequired: "المبلغ ضروري.",
    quickTxCategoryRequired: "الفئة ضرورية.",
    quickTxSavedIncome: "تصرّح بالدخل.",
    quickTxSavedExpense: "تصرّح بالمصروف.",
    quickTxUnknownError: "ما قدرناش نسجلو هاد العملية.",
    quickTxBeforePeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `هاد الدخل (${incomeDate}) قبل الفترة النشيطة (${start} ${arrow} ${end}) وغادي يتحسب فالدورة اللي فاتت.`,
    quickTxAfterPeriod: (incomeDate: string, start: string, end: string, arrow: string) =>
      `هاد الدخل (${incomeDate}) من بعد الفترة النشيطة (${start} ${arrow} ${end}) وغادي يتحسب فالدورة الجاية.`,
    quickTxSubmitIncome: "حفظ الدخل",
    quickTxSubmitExpense: "حفظ المصروف",
    quickTxSuggestedAmounts: "مبالغ سريعة",
    quickTxProgressLabel: "نسبة الإكمال",
    quickTxSelectedDateLabel: "التاريخ المختار",
    quickTxSmartCategories: "فئات مقترحة",
    quickTxUseLastExpense: "استعمال نفس الشي",
    quickTxLastExpenseLabel: "آخر مصروف مشابه",
    quickTxRecurringHint: "لقينا هاد العملية كتعاود",
    quickTxApplyRecurring: "طبّق هاد العادة",
    quickTxDescriptionSuggestions: "أوصاف مقترحة",
    quickTxAmountAnomaly: (amount: string, usual: string) =>
      `المبلغ غير معتاد (${amount}). المبلغ المعتاد: ${usual}.`,
    tooltipAvailableCash: "الفلوس السائلة اللي باقا ومازال ما تفرقاتش على الأظرفة.",
    tooltipPeriodExpenses: "مجموع كاع المصاريف اللي تقيدو فهاد الفترة.",
    tooltipPeriodNet: "المداخيل كاملة ناقص كاع المصاريف ديال هاد الفترة.",
    budgetSummaryTitle: "ملخص ميزانية الفترة",
    chartSpent: "مخسور",
    chartReserved: "مخصص",
    chartFree: "فلوس حرة",
    chartTotalResources: "الموارد",
    chartTooltipSpent: "المصاريف الحقيقية اللي تخلصات",
    chartTooltipReserved: "المبالغ المخصصة للأظرفة واللي مازال ما تخسراتش",
    chartTooltipFree: "الفلوس اللي باقة ومامخصصة لحتى شي ظرف",
  },
};
