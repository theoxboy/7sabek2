/**
 * Every string the dashboard renders, in the three supported locales.
 *
 * These 950 lines used to sit inside page.tsx, ahead of the component that
 * uses them, so any change to the screen meant scrolling past the whole
 * dictionary first. Keeping them in their own module leaves page.tsx to the
 * behaviour and makes a missing translation a compile error in one place.
 */
import type { FloussyLocale } from "@/lib/localePreference";

export type DashboardCopy = {
  unknownError: string;
  loadFailedTitle: string;
  retry: string;
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
  tourOverviewTitle: string;
  tourOverviewDescription: string;
  tourTodoTitle: string;
  tourTodoDescription: string;
  tourAvailableTitle: string;
  tourAvailableDescription: string;
  tourExpenseTitle: string;
  tourExpenseDescription: string;
  tourIncomeTitle: string;
  tourIncomeDescription: string;
  tourNetTitle: string;
  tourNetDescription: string;
  tourTopTitle: string;
  tourTopDescription: string;
  tourRecentTitle: string;
  tourRecentDescription: string;
  tourSpendingTitle: string;
  tourSpendingDescription: string;
  tourTrendTitle: string;
  tourTrendDescription: string;
  tourQuickTitle: string;
  tourQuickDescription: string;
  tourFabTitle: string;
  tourFabDescription: string;
  navDashboard: string;
  navDashboardDesc: string;
  navTransactions: string;
  navTransactionsDesc: string;
  navEnvelopes: string;
  navEnvelopesDesc: string;
  navDistribution: string;
  navDistributionDesc: string;
  navGoals: string;
  navGoalsDesc: string;
  navAide: string;
  navAideDesc: string;
  navReports: string;
  navReportsDesc: string;
  navSettings: string;
  navSettingsDesc: string;
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
  guideTag: string;
  welcomeTitle: string;
  welcomeDescription: string;
  guideLine1: string;
  guideLine2: string;
  guideLine3: string;
  guideChip1: string;
  guideChip2: string;
  guideChip3: string;
  guideFooter: string;
  skip: string;
  startTour: string;
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
    loadFailedTitle: "Impossible de charger le tableau de bord.",
    retry: "Réessayer",
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
    tourOverviewTitle: "Vue d’ensemble",
    tourOverviewDescription:
      "Ici tu vois ta période active et les actions rapides pour ajouter des transactions.",
    tourTodoTitle: "À faire maintenant",
    tourTodoDescription:
      "Les alertes importantes pour sécuriser ton budget en priorité.",
    tourAvailableTitle: "Cash disponible",
    tourAvailableDescription:
      "Le montant que tu peux encore allouer à tes enveloppes.",
    tourExpenseTitle: "Dépenses période",
    tourExpenseDescription:
      "Le total dépensé sur la période sélectionnée (mappé).",
    tourIncomeTitle: "Revenus période",
    tourIncomeDescription: "Le total des revenus déclarés sur la période.",
    tourNetTitle: "Net période",
    tourNetDescription: "Le solde net revenus - dépenses sur la période.",
    tourTopTitle: "Top enveloppes",
    tourTopDescription: "Les enveloppes principales et leurs budgets restants.",
    tourRecentTitle: "Dépenses récentes",
    tourRecentDescription:
      "Vérifie tes dernières dépenses pour corriger rapidement si besoin.",
    tourSpendingTitle: "Répartition par enveloppe",
    tourSpendingDescription:
      "Graphique et détails par enveloppe pour mieux analyser.",
    tourTrendTitle: "Tendance du net",
    tourTrendDescription:
      "Visualise l’évolution de ton net sur la période sélectionnée.",
    tourQuickTitle: "Actions rapides",
    tourQuickDescription:
      "Accède en un clic aux actions essentielles pour gérer ton budget.",
    tourFabTitle: "Raccourcis flottants",
    tourFabDescription: "Ajoute un revenu ou une dépense en un seul geste.",
    navDashboard: "Menu latéral — Dashboard",
    navDashboardDesc: "Reviens à ton tableau de bord à tout moment.",
    navTransactions: "Menu latéral — Transactions",
    navTransactionsDesc: "Saisis ou consulte toutes tes transactions.",
    navEnvelopes: "Menu latéral — Envelopes",
    navEnvelopesDesc: "Gère tes enveloppes et leurs budgets.",
    navDistribution: "Menu latéral — Répartition",
    navDistributionDesc: "Alloue ton cash disponible aux enveloppes.",
    navGoals: "Menu latéral — Goals",
    navGoalsDesc: "Planifie tes objectifs et suis ta progression.",
    navAide: "Menu latéral — Aide",
    navAideDesc: "Accède aux guides et explications rapides.",
    navReports: "Menu latéral — Reports",
    navReportsDesc: "Analyse tes tendances et tes rapports.",
    navSettings: "Menu latéral — Settings",
    navSettingsDesc: "Gère ton compte et tes préférences.",
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
    guideTag: "Guide 7sabek",
    welcomeTitle: "Bienvenue sur ton dashboard",
    welcomeDescription:
      "Ce guide t’aide à repérer les zones clés. Chaque page lance son guide une seule fois quand tu la visites.",
    guideLine1: "Dashboard → Transactions → Envelopes.",
    guideLine2: "Répartition → Aide → Reports.",
    guideLine3: "Settings pour finaliser ta configuration.",
    guideChip1: "Couleurs & visuels",
    guideChip2: "Explications courtes",
    guideChip3: "Navigation guidée",
    guideFooter:
      "Des explications rapides et visuelles pour t’accompagner sans t’encombrer.",
    skip: "Passer",
    startTour: "Commencer",
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
    loadFailedTitle: "The dashboard could not be loaded.",
    retry: "Try again",
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
    tourOverviewTitle: "Overview",
    tourOverviewDescription:
      "Here you can see the active period and the quick actions to add transactions.",
    tourTodoTitle: "Do now",
    tourTodoDescription: "The key alerts to secure your budget first.",
    tourAvailableTitle: "Available cash",
    tourAvailableDescription: "The amount you can still allocate to envelopes.",
    tourExpenseTitle: "Period spending",
    tourExpenseDescription: "Total mapped spending for the selected period.",
    tourIncomeTitle: "Period income",
    tourIncomeDescription: "Total declared income for the period.",
    tourNetTitle: "Period net",
    tourNetDescription: "Net income minus spending for the period.",
    tourTopTitle: "Top envelopes",
    tourTopDescription: "Your main envelopes and remaining balances.",
    tourRecentTitle: "Recent expenses",
    tourRecentDescription: "Check recent expenses to fix issues quickly.",
    tourSpendingTitle: "Envelope breakdown",
    tourSpendingDescription: "Chart and details by envelope for analysis.",
    tourTrendTitle: "Net trend",
    tourTrendDescription: "See how your net changes over the selected period.",
    tourQuickTitle: "Quick actions",
    tourQuickDescription: "One-click access to the essential budget actions.",
    tourFabTitle: "Floating shortcuts",
    tourFabDescription: "Add income or expense in one tap.",
    navDashboard: "Sidebar — Dashboard",
    navDashboardDesc: "Return to your dashboard anytime.",
    navTransactions: "Sidebar — Transactions",
    navTransactionsDesc: "Enter or review all your transactions.",
    navEnvelopes: "Sidebar — Envelopes",
    navEnvelopesDesc: "Manage your envelopes and budgets.",
    navDistribution: "Sidebar — Distribution",
    navDistributionDesc: "Allocate your available cash to envelopes.",
    navGoals: "Sidebar — Goals",
    navGoalsDesc: "Plan your goals and track progress.",
    navAide: "Sidebar — Help",
    navAideDesc: "Access guides and quick explanations.",
    navReports: "Sidebar — Reports",
    navReportsDesc: "Analyze trends and reports.",
    navSettings: "Sidebar — Settings",
    navSettingsDesc: "Manage your account and preferences.",
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
    guideTag: "7sabek guide",
    welcomeTitle: "Welcome to your dashboard",
    welcomeDescription:
      "This guide helps you spot the key areas. Each page launches its guide once when you visit it.",
    guideLine1: "Dashboard → Transactions → Envelopes.",
    guideLine2: "Distribution → Help → Reports.",
    guideLine3: "Settings to finish your setup.",
    guideChip1: "Colors & visuals",
    guideChip2: "Short explanations",
    guideChip3: "Guided navigation",
    guideFooter: "Quick visual explanations to help without clutter.",
    skip: "Skip",
    startTour: "Start",
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
    loadFailedTitle: "ما قدرناش نحملو لوحة التحكم.",
    retry: "عاود جرب",
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
    tourOverviewTitle: "نظرة عامة",
    tourOverviewDescription:
      "هنا كتشوف الفترة الحالية والأزرار السريعة باش تزيد العمليات.",
    tourTodoTitle: "شنو خاصك دير دابا",
    tourTodoDescription: "هادشي المستعجل اللي خاصك تعالجو باش يبقى البوجي مضبوط.",
    tourAvailableTitle: "الكاش المتوفر",
    tourAvailableDescription: "هادشي اللي مازال تقدر توزّعو على الأظرفة.",
    tourExpenseTitle: "المصاريف ديال الفترة",
    tourExpenseDescription: "مجموع المصاريف المربوطة فالفترة اللي مختار.",
    tourIncomeTitle: "الدخل ديال الفترة",
    tourIncomeDescription: "مجموع الدخول اللي تسجلات فهاد الفترة.",
    tourNetTitle: "الصافي ديال الفترة",
    tourNetDescription: "الفرق بين الدخل والمصاريف فهاد الفترة.",
    tourTopTitle: "الأظرفة المهمة",
    tourTopDescription: "الأظرفة اللي باينين دابا والباقي فيهم.",
    tourRecentTitle: "آخر العمليات",
    tourRecentDescription: "راجع آخر العمليات باش تصلّح أي حاجة بسرعة.",
    tourSpendingTitle: "تفصيل الصرف حسب الأظرفة",
    tourSpendingDescription: "غرافيك وتفاصيل حسب كل ظرف باش الفهم يكون أوضح.",
    tourTrendTitle: "تطور الصافي",
    tourTrendDescription: "شوف كيفاش كيتبدل الصافي مع الوقت فالفترة المختارة.",
    tourQuickTitle: "إجراءات سريعة",
    tourQuickDescription: "أهم العمليات اللي تقدر ديرها بسرعة.",
    tourFabTitle: "اختصارات سريعة",
    tourFabDescription: "زيد دخل ولا مصروف بضغطة وحدة.",
    navDashboard: "اللائحة الجانبية — لوحة الميزانية",
    navDashboardDesc: "ترجع للوحة الميزانية فاي وقت.",
    navTransactions: "اللائحة الجانبية — العمليات",
    navTransactionsDesc: "زيد ولا راجع جميع العمليات ديالك.",
    navEnvelopes: "اللائحة الجانبية — الأظرفة",
    navEnvelopesDesc: "سيّر الأظرفة والميزانيات ديالهم.",
    navDistribution: "اللائحة الجانبية — التوزيع",
    navDistributionDesc: "وزّع الكاش المتوفر على الأظرفة.",
    navGoals: "اللائحة الجانبية — الأهداف",
    navGoalsDesc: "خطط لأهدافك وتبع التقدم ديالك.",
    navAide: "اللائحة الجانبية — المساعدة",
    navAideDesc: "لقى الشروحات والدلائل بسرعة.",
    navReports: "اللائحة الجانبية — التقارير",
    navReportsDesc: "حلل الترندات والتقارير ديالك.",
    navSettings: "اللائحة الجانبية — الإعدادات",
    navSettingsDesc: "سيّر الحساب والتفضيلات ديالك.",
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
    guideTag: "دليل فلوسي",
    welcomeTitle: "مرحبا بيك فلوحة الميزانية ديالك",
    welcomeDescription:
      "هاد الدليل كيعونك تعرف البلايص المهمة. كل صفحة كتشغل الدليل ديالها غير أول مرة كتدخل ليها.",
    guideLine1: "لوحة الميزانية ← العمليات ← الأظرفة.",
    guideLine2: "التوزيع ← المساعدة ← التقارير.",
    guideLine3: "الإعدادات باش تكمل الضبط ديالك.",
    guideChip1: "ألوان وواجهة واضحة",
    guideChip2: "شروحات قصيرة",
    guideChip3: "تنقل موجه",
    guideFooter: "شروحات سريعة وواضحة باش تعاونك بلا ما تعمر عليك الصفحة.",
    skip: "تخطي",
    startTour: "بدا",
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
    sweepNotDueDesc: "دابا ما كاين حتى إجراء خاص بتحويل الفائض.",
    sweepHelp: "تحويل الفائض ما كيتدارش حتى كتوصل نهاية الفترة وكيكون الدخل المتوقع تصرّح به.",
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
