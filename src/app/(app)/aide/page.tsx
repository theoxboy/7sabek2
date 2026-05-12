"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  GlobalTourOverlay,
  useGlobalTour,
  type TourStep,
} from "@/components/tour/GlobalTour";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import { getLocaleDirection, type FloussyLocale } from "@/lib/localePreference";

type AideSectionProps = {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  toggleOpenLabel: string;
  toggleClosedLabel: string;
  hiddenHint: string;
  children: ReactNode;
};

type GuideSection = {
  id: string;
  navLabel: string;
  title: string;
  cards: Array<{
    title: string;
    items: string[];
  }>;
};

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";

function AideSection({
  title,
  isOpen,
  onToggle,
  toggleOpenLabel,
  toggleClosedLabel,
  hiddenHint,
  children,
}: AideSectionProps) {
  return (
    <Section
      title={title}
      actions={
        <Button variant="secondary" size="sm" onClick={onToggle}>
          {isOpen ? toggleOpenLabel : toggleClosedLabel}
        </Button>
      }
    >
      {isOpen ? children : <p className="text-sm text-[var(--muted)]">{hiddenHint}</p>}
    </Section>
  );
}

const HELP_COPY: Record<
  FloussyLocale,
  {
    pageTitle: string;
    pageSubtitle: string;
    quickNavTitle: string;
    quickNavSubtitle: string;
    backToTop: string;
    open: string;
    collapse: string;
    hiddenHint: string;
    introTitle: string;
    introBody: string;
    steps: string[];
    nextStep: string;
    finalTitle: string;
    finalBody: string;
    returnToDashboard: string;
    tour: Array<{ title: string; description: string }>;
    sections: GuideSection[];
  }
> = {
  fr: {
    pageTitle: "Aide",
    pageSubtitle: "Guide de référence progressif pour chaque écran du produit.",
    quickNavTitle: "Navigation rapide",
    quickNavSubtitle: "Va directement à la section dont tu as besoin.",
    backToTop: "Retour en haut",
    open: "Ouvrir",
    collapse: "Réduire",
    hiddenHint: "Contenu masqué. Clique sur “Ouvrir” pour afficher cette partie.",
    introTitle: "Comment lire ce guide",
    introBody:
      "Cette page résume le rôle de chaque écran, les boutons utiles et les actions principales. Ouvre seulement la partie qui t’intéresse.",
    steps: [
      "Étape 1 : Dashboard",
      "Étape 2 : Transactions",
      "Étape 3 : Enveloppes",
      "Étape 4 : Catégories",
      "Étape 5 : Distribution",
      "Étape 6 : Sweeps",
      "Étape 7 : Rapports",
      "Étape 8 : Paramètres",
    ],
    nextStep: "Étape suivante : Fin du guide",
    finalTitle: "Fin du guide",
    finalBody: "Tu peux revenir au dashboard ou ouvrir la section qui t’intéresse à tout moment.",
    returnToDashboard: "Retour au dashboard",
    tour: [
      {
        title: "Centre d’aide",
        description: "Retrouve un résumé clair de chaque écran du produit.",
      },
      {
        title: "Navigation rapide",
        description: "Utilise les raccourcis pour ouvrir directement la bonne section.",
      },
      {
        title: "Contenu du guide",
        description: "Chaque bloc explique l’usage réel de la page et de ses actions.",
      },
    ],
    sections: [
      {
        id: "aide-dashboard",
        navLabel: "Dashboard",
        title: "Dashboard — Tout comprendre",
        cards: [
          {
            title: "En-tête et actions",
            items: [
              "Le dashboard donne la vue d’ensemble de la période en cours.",
              "Tu peux changer la période, ajouter une dépense ou ajouter un revenu.",
              "Les actions urgentes apparaissent en haut quand un revenu, un sweep ou un mapping manque.",
            ],
          },
          {
            title: "Cartes clés",
            items: [
              "Cash disponible : argent non encore alloué.",
              "Dépenses période : dépenses mappées sur la période active.",
              "Revenus période et Net période : lecture rapide de la santé du budget.",
            ],
          },
          {
            title: "Blocs utiles",
            items: [
              "Top enveloppes : actives, dépassées, proches de la limite.",
              "Dépenses récentes : modification ou suppression rapide.",
              "Actions rapides : raccourcis vers dépenses, revenus et allocation.",
            ],
          },
        ],
      },
      {
        id: "aide-transactions",
        navLabel: "Transactions",
        title: "Transactions — Tout comprendre",
        cards: [
          {
            title: "Créer une transaction",
            items: [
              "Choisis le type : dépense ou revenu.",
              "Sélectionne une catégorie, un montant, une date et une description si besoin.",
              "Les revenus alimentent Cash; les dépenses touchent une enveloppe seulement si la catégorie est mappée.",
            ],
          },
          {
            title: "Aides et alertes",
            items: [
              "La page t’avertit s’il manque des catégories adaptées au type choisi.",
              "En mode revenu, une simulation de distribution peut apparaître avant validation.",
              "Les erreurs de création, de simulation ou de suppression s’affichent directement.",
            ],
          },
          {
            title: "Historique",
            items: [
              "La popup d’historique permet de filtrer par dates, type, catégorie, enveloppe et recherche texte.",
              "Chaque ligne peut être éditée ou supprimée.",
              "La suppression retire l’impact de la transaction sur Cash et sur les enveloppes.",
            ],
          },
        ],
      },
      {
        id: "aide-envelopes",
        navLabel: "Enveloppes",
        title: "Enveloppes — Tout comprendre",
        cards: [
          {
            title: "Liste principale",
            items: [
              "Chaque carte montre le nom de l’enveloppe et son solde actuel.",
              "Cash et Savings sont des enveloppes système protégées.",
              "Tu peux ouvrir les détails, corriger un solde, activer le rollover ou supprimer une enveloppe autorisée.",
            ],
          },
          {
            title: "Création et allocation",
            items: [
              "Tu peux créer une enveloppe seule ou utiliser des packs prédéfinis.",
              "Une allocation immédiate peut répartir un montant total ou un montant fixe sur les nouvelles enveloppes.",
              "Le formulaire d’allocation déplace un montant depuis Cash vers une enveloppe cible.",
            ],
          },
          {
            title: "Détails et rollover",
            items: [
              "Le panneau latéral affiche l’historique par période, l’activité récente et les transferts.",
              "Rollover ON conserve le solde pour la période suivante.",
              "Rollover OFF renvoie le reliquat vers Cash lors du passage à la période suivante.",
            ],
          },
        ],
      },
      {
        id: "aide-categories",
        navLabel: "Catégories",
        title: "Catégories — Tout comprendre",
        cards: [
          {
            title: "Créer et typer",
            items: [
              "Ajoute une catégorie puis choisis si elle sert aux dépenses, aux revenus ou aux deux.",
              "Des packs rapides peuvent créer plusieurs catégories d’un coup.",
              "Tu peux remettre le mapping à plus tard si tu veux juste préparer les catégories.",
            ],
          },
          {
            title: "Mapping",
            items: [
              "Chaque catégorie peut être liée à une enveloppe ou rester non mappée.",
              "Le mapping permet aux dépenses de toucher automatiquement le bon budget.",
              "Le type Auto / Dépense / Revenu aide à corriger les catégories mal détectées.",
            ],
          },
          {
            title: "Maintenance",
            items: [
              "Tu peux renommer ou supprimer une catégorie.",
              "La suppression collective permet d’effacer plusieurs catégories en une seule action.",
              "La recherche sert à retrouver vite une catégorie dans une longue liste.",
            ],
          },
        ],
      },
      {
        id: "aide-repartition",
        navLabel: "Distribution",
        title: "Distribution — Tout comprendre",
        cards: [
          {
            title: "Objectif de la page",
            items: [
              "Cette page définit comment un revenu déclaré se répartit entre enveloppes et objectifs.",
              "Le bouton Configurer ouvre l’assistant principal de distribution.",
              "Les configurations enregistrées peuvent être activées, visualisées, modifiées ou supprimées.",
            ],
          },
          {
            title: "Règles de distribution",
            items: [
              "Tu peux donner un montant fixe à certaines enveloppes.",
              "Le reste peut être réparti en pourcentage, soit à égalité, soit par priorité.",
              "Les goals peuvent recevoir une part de la répartition comme les enveloppes.",
            ],
          },
          {
            title: "Simulation et application",
            items: [
              "Une simulation locale te montre d’abord fixes, pourcentages et reste non alloué.",
              "Tu peux sauvegarder la configuration localement avec un nom.",
              "L’application finale envoie les règles actives au backend.",
            ],
          },
        ],
      },
      {
        id: "aide-sweeps",
        navLabel: "Sweeps",
        title: "Sweeps — Tout comprendre",
        cards: [
          {
            title: "Rappels de revenu",
            items: [
              "Les rappels servent à ne pas oublier de déclarer un salaire ou un revenu récurrent.",
              "Tu peux définir une fréquence mensuelle, hebdomadaire, tous les 15 jours ou une date fixe.",
              "La page montre aussi la prochaine échéance attendue.",
            ],
          },
          {
            title: "Lien avec le sweep",
            items: [
              "Le sweep se déclenche quand un rappel est dû et que le revenu est déclaré.",
              "Les enveloppes avec rollover OFF renvoient leur reliquat vers l’enveloppe d’épargne.",
              "Les enveloppes avec rollover ON gardent leur solde pour la période suivante.",
            ],
          },
          {
            title: "Actions visibles",
            items: [
              "Chaque rappel peut être marqué comme déclaré ou supprimé.",
              "Après un sweep, une confirmation résume les périodes clôturées et les transferts.",
              "Le bouton d’information rappelle le fonctionnement global des sweeps.",
            ],
          },
        ],
      },
      {
        id: "aide-reports",
        navLabel: "Rapports",
        title: "Rapports — Tout comprendre",
        cards: [
          {
            title: "Vue d’analyse",
            items: [
              "Reports regroupe les graphes, diagnostics et indicateurs avancés.",
              "Tu peux filtrer par période, enveloppe, catégorie, type et texte recherché.",
              "Les exports CSV et l’impression servent à sortir un état lisible du budget.",
            ],
          },
          {
            title: "Mesures et graphiques",
            items: [
              "Les métriques clés couvrent cash, revenus, dépenses, net et qualité du mapping.",
              "Les onglets détaillent la dépense, le revenu, les enveloppes, les sweeps et la qualité des données.",
              "Les états vides expliquent quoi faire quand il manque encore de l’activité.",
            ],
          },
          {
            title: "Actions rapides",
            items: [
              "Tu peux ouvrir rapidement Transactions, Categories ou Sweeps depuis cette page.",
              "Les recommandations te poussent vers la prochaine action utile.",
              "La page est pensée pour comprendre, pas seulement pour consulter une liste brute.",
            ],
          },
        ],
      },
      {
        id: "aide-settings",
        navLabel: "Paramètres",
        title: "Paramètres — Tout comprendre",
        cards: [
          {
            title: "Préférences",
            items: [
              "Settings gère devise, cadence de sweep et autres préférences du compte.",
              "Le bouton Complete onboarding relance le parcours si tu veux l’actualiser.",
              "Les changements sont enregistrés depuis cette page.",
            ],
          },
          {
            title: "Appareil et export",
            items: [
              "Le thème clair/sombre est enregistré localement.",
              "Les exports JSON et CSV servent à sauvegarder ou réutiliser les données.",
              "Le badge de modifications indique si tout est déjà à jour.",
            ],
          },
          {
            title: "Zone sensible",
            items: [
              "Reset account data vide les données mais garde le compte.",
              "Delete account supprime le compte et toutes les données liées.",
              "Ces actions demandent une confirmation explicite avant exécution.",
            ],
          },
        ],
      },
    ],
  },
  en: {
    pageTitle: "Help",
    pageSubtitle: "Progressive reference guide for each product screen.",
    quickNavTitle: "Quick navigation",
    quickNavSubtitle: "Jump straight to the section you need.",
    backToTop: "Back to top",
    open: "Open",
    collapse: "Collapse",
    hiddenHint: "Content is hidden. Click “Open” to show this section.",
    introTitle: "How to use this guide",
    introBody:
      "This page summarizes the purpose of each screen, the visible actions, and the main workflows. Open only the part you need.",
    steps: [
      "Step 1: Dashboard",
      "Step 2: Transactions",
      "Step 3: Envelopes",
      "Step 4: Categories",
      "Step 5: Distribution",
      "Step 6: Sweeps",
      "Step 7: Reports",
      "Step 8: Settings",
    ],
    nextStep: "Next step: End of guide",
    finalTitle: "End of guide",
    finalBody: "You can go back to the dashboard or reopen any section whenever needed.",
    returnToDashboard: "Back to dashboard",
    tour: [
      {
        title: "Help center",
        description: "Find a clear summary of every screen in the product.",
      },
      {
        title: "Quick navigation",
        description: "Use shortcuts to open the right section immediately.",
      },
      {
        title: "Guide content",
        description: "Each block explains the real purpose of the page and its actions.",
      },
    ],
    sections: [
      {
        id: "aide-dashboard",
        navLabel: "Dashboard",
        title: "Dashboard — What it does",
        cards: [
          {
            title: "Header and actions",
            items: [
              "The dashboard gives the main overview of the active period.",
              "You can change the date range, add an expense, or add income.",
              "Urgent tasks appear at the top when income, a sweep, or mapping is missing.",
            ],
          },
          {
            title: "Key cards",
            items: [
              "Available cash: money not allocated yet.",
              "Period expenses: mapped expenses for the active period.",
              "Period income and net period: fast reading of budget health.",
            ],
          },
          {
            title: "Useful blocks",
            items: [
              "Top envelopes: active, overspent, or close to limit.",
              "Recent expenses: quick edit or delete.",
              "Quick actions: shortcuts to expenses, income, and allocation.",
            ],
          },
        ],
      },
      {
        id: "aide-transactions",
        navLabel: "Transactions",
        title: "Transactions — What it does",
        cards: [
          {
            title: "Create a transaction",
            items: [
              "Choose the type: expense or income.",
              "Pick a category, amount, date, and optional description.",
              "Income always feeds Cash; expenses only affect an envelope when the category is mapped.",
            ],
          },
          {
            title: "Warnings and helpers",
            items: [
              "The page warns you when categories are missing for the selected type.",
              "In income mode, a distribution preview can appear before confirmation.",
              "Creation, simulation, and deletion errors are surfaced directly.",
            ],
          },
          {
            title: "History",
            items: [
              "The history dialog filters by date, type, category, envelope, and search text.",
              "Each row can be edited or deleted.",
              "Deletion removes the transaction impact from Cash and envelopes.",
            ],
          },
        ],
      },
      {
        id: "aide-envelopes",
        navLabel: "Envelopes",
        title: "Envelopes — What it does",
        cards: [
          {
            title: "Main list",
            items: [
              "Each card shows the envelope name and current balance.",
              "Cash and Savings are protected system envelopes.",
              "You can open details, correct a balance, toggle rollover, or delete an allowed envelope.",
            ],
          },
          {
            title: "Creation and allocation",
            items: [
              "You can create one envelope or use predefined packs.",
              "Immediate allocation can split a total amount or a fixed amount across new envelopes.",
              "The allocation form moves money from Cash into a target envelope.",
            ],
          },
          {
            title: "Details and rollover",
            items: [
              "The side panel shows period history, recent activity, and transfers.",
              "Rollover ON keeps the balance for the next period.",
              "Rollover OFF sends the leftover back to Cash on the next period rollover.",
            ],
          },
        ],
      },
      {
        id: "aide-categories",
        navLabel: "Categories",
        title: "Categories — What it does",
        cards: [
          {
            title: "Create and type",
            items: [
              "Add a category and decide whether it is for expenses, income, or both.",
              "Quick packs can create multiple categories at once.",
              "You can postpone mapping if you only want to prepare categories first.",
            ],
          },
          {
            title: "Mapping",
            items: [
              "Each category can be linked to an envelope or stay unmapped.",
              "Mapping lets expenses affect the right budget automatically.",
              "The Auto / Expense / Income selector helps fix badly detected types.",
            ],
          },
          {
            title: "Maintenance",
            items: [
              "You can rename or delete a category.",
              "Bulk delete removes many categories in one action.",
              "Search helps when the list becomes long.",
            ],
          },
        ],
      },
      {
        id: "aide-repartition",
        navLabel: "Distribution",
        title: "Distribution — What it does",
        cards: [
          {
            title: "Page purpose",
            items: [
              "This page defines how declared income gets split across envelopes and goals.",
              "The Configure button opens the main distribution wizard.",
              "Saved configurations can be activated, reviewed, edited, or deleted.",
            ],
          },
          {
            title: "Distribution rules",
            items: [
              "You can assign fixed amounts to some envelopes.",
              "The remainder can be split by percentage, either equally or by priority.",
              "Goals can receive a share of the distribution just like envelopes.",
            ],
          },
          {
            title: "Simulation and apply",
            items: [
              "A local simulation shows fixed, percentage, and unallocated remainder first.",
              "You can save the configuration locally with a name.",
              "The final apply step sends the active rules to the backend.",
            ],
          },
        ],
      },
      {
        id: "aide-sweeps",
        navLabel: "Sweeps",
        title: "Sweeps — What it does",
        cards: [
          {
            title: "Income reminders",
            items: [
              "Reminders help you avoid forgetting a salary or recurring income.",
              "You can define monthly, weekly, biweekly, or fixed-date frequency.",
              "The page also shows the next expected reminder date.",
            ],
          },
          {
            title: "Link with sweeps",
            items: [
              "A sweep runs when a reminder is due and the income has been declared.",
              "Envelopes with rollover OFF send leftover funds to savings.",
              "Envelopes with rollover ON keep their balance for the next period.",
            ],
          },
          {
            title: "Visible actions",
            items: [
              "Each reminder can be marked declared or deleted.",
              "After a sweep, a confirmation summarizes closed periods and transfers.",
              "The info button explains the overall sweep logic.",
            ],
          },
        ],
      },
      {
        id: "aide-reports",
        navLabel: "Reports",
        title: "Reports — What it does",
        cards: [
          {
            title: "Analysis view",
            items: [
              "Reports gathers graphs, diagnostics, and advanced metrics.",
              "You can filter by range, envelope, category, type, and search text.",
              "CSV export and print help you produce a readable budget snapshot.",
            ],
          },
          {
            title: "Metrics and charts",
            items: [
              "Key metrics cover cash, income, expenses, net, and mapping quality.",
              "Tabs break down spending, income, envelopes, sweeps, and data quality.",
              "Empty states explain what is still missing to get richer reports.",
            ],
          },
          {
            title: "Quick actions",
            items: [
              "You can jump to Transactions, Categories, or Sweeps from this page.",
              "Recommendations push you toward the next useful action.",
              "The page is built to explain the budget, not just list numbers.",
            ],
          },
        ],
      },
      {
        id: "aide-settings",
        navLabel: "Settings",
        title: "Settings — What it does",
        cards: [
          {
            title: "Preferences",
            items: [
              "Settings manages currency, sweep interval, and account preferences.",
              "Complete onboarding reopens the onboarding flow if you want to refresh it.",
              "Changes are saved directly from this page.",
            ],
          },
          {
            title: "Device and export",
            items: [
              "Light/dark theme is saved locally on the device.",
              "JSON and CSV exports help you back up or reuse your data.",
              "The pending changes badge tells you whether everything is already up to date.",
            ],
          },
          {
            title: "Danger zone",
            items: [
              "Reset account data clears the data but keeps the account.",
              "Delete account removes the account and all related data.",
              "These actions require explicit confirmation before execution.",
            ],
          },
        ],
      },
    ],
  },
  ar: {
    pageTitle: "المساعدة",
    pageSubtitle: "دليل مبسط كيجمع شنو كيدير كل سكرين فالمنصة.",
    quickNavTitle: "تنقل سريع",
    quickNavSubtitle: "سير مباشرة للقسم اللي محتاجو.",
    backToTop: "رجع للفوق",
    open: "حل",
    collapse: "سد",
    hiddenHint: "المحتوى مخبي. ضغط على “حل” باش يبان هاد الجزء.",
    introTitle: "كيفاش تقرا هاد الدليل",
    introBody:
      "هاد الصفحة كتلخص دور كل سكرين، الأزرار المهمة، والخطوات الرئيسية. حل غير الجزء اللي محتاج دابا.",
    steps: [
      "الخطوة 1: لوحة القيادة",
      "الخطوة 2: العمليات",
      "الخطوة 3: الأظرفة",
      "الخطوة 4: الأصناف",
      "الخطوة 5: التوزيع",
      "الخطوة 6: السويبات",
      "الخطوة 7: التقارير",
      "الخطوة 8: الإعدادات",
    ],
    nextStep: "الخطوة الجاية: نهاية الدليل",
    finalTitle: "نهاية الدليل",
    finalBody: "تقدر ترجع للوحة القيادة ولا تحل أي قسم من جديد فاش بغيت.",
    returnToDashboard: "رجع للوحة القيادة",
    tour: [
      {
        title: "مركز المساعدة",
        description: "هنا كتلقى شرح واضح لكل صفحة فالمنتج.",
      },
      {
        title: "تنقل سريع",
        description: "استعمل الاختصارات باش تمشي مباشرة للقسم المناسب.",
      },
      {
        title: "محتوى الدليل",
        description: "كل بلوك كيشـرح الدور الحقيقي ديال الصفحة والأكشنات ديالها.",
      },
    ],
    sections: [
      {
        id: "aide-dashboard",
        navLabel: "لوحة القيادة",
        title: "لوحة القيادة — شنو كتدير",
        cards: [
          {
            title: "الفوق والأكشنات",
            items: [
              "لوحة القيادة كتعطيك النظرة العامة ديال الفترة اللي خدام بها دابا.",
              "تقدر تبدل الفترة، تزيد مصروف، ولا تزيد دخل.",
              "إلا كان شي دخل خاصو تصريح، sweep خاصو يتدار، ولا mapping ناقص، كيبان فوق.",
            ],
          },
          {
            title: "الكارطات الرئيسية",
            items: [
              "لكاش المتوفر: فلوس مازال ما توزعاتش.",
              "مصاريف الفترة: المصاريف المرتبطة بالفترة الحالية.",
              "دخل الفترة والصافي: قراءة سريعة للحالة المالية ديالك.",
            ],
          },
          {
            title: "البلوكات المفيدة",
            items: [
              "الأظرفة المهمة: شكون شغال، شكون خارج على الحد، وشكون قريب ليه.",
              "آخر المصاريف: تعديل أو حذف بسرعة.",
              "الأزرار السريعة: اختصارات للمصاريف، الدخل، والتوزيع.",
            ],
          },
        ],
      },
      {
        id: "aide-transactions",
        navLabel: "العمليات",
        title: "العمليات — شنو كيدير هاد السكرين",
        cards: [
          {
            title: "إنشاء عملية",
            items: [
              "اختار النوع: مصروف ولا دخل.",
              "حدد الصنف، المبلغ، التاريخ، والوصف إلا بغيتي.",
              "الدخل كيمشي ديما للكاش، والمصروف كيأثر على الظرف غير إلا كان الصنف مربوط بيه.",
            ],
          },
          {
            title: "التنبيهات والمساعدة",
            items: [
              "الصفحة كتنبهك إلا ما كايناش أصناف مناسبة للنوع اللي اخترتي.",
              "فحال كان النوع دخل، تقدر تبان ليك محاكاة ديال التوزيع قبل التأكيد.",
              "الأخطاء ديال الإنشاء، المحاكاة، ولا الحذف كتبان مباشرة.",
            ],
          },
          {
            title: "الأرشيف",
            items: [
              "نافذة الأرشيف فيها فلترة حسب التاريخ، النوع، الصنف، الظرف، والبحث.",
              "كل سطر تقدر تبدلو ولا تمسحو.",
              "الحذف كيرجع الأثر ديال العملية من الكاش ومن الأظرفة.",
            ],
          },
        ],
      },
      {
        id: "aide-envelopes",
        navLabel: "الأظرفة",
        title: "الأظرفة — شنو كيدير هاد السكرين",
        cards: [
          {
            title: "اللائحة الرئيسية",
            items: [
              "كل كارت كيبين اسم الظرف والرصيد الحالي ديالو.",
              "الكاش والادخار أظرفة ديال السيستيم ما كيتحيدوش.",
              "تقدر تحل التفاصيل، تصحح الرصيد، تبدل الترحيل، ولا تحيد ظرف مسموح به.",
            ],
          },
          {
            title: "الإنشاء والتخصيص",
            items: [
              "تقدر تزيد ظرف واحد ولا تستعمل باقات واجدين.",
              "التخصيص الفوري يقدر يفرق مبلغ كلي أو مبلغ ثابت على الأظرفة الجداد.",
              "فورميلر التخصيص كينقل الفلوس من الكاش لظرف محدد.",
            ],
          },
          {
            title: "التفاصيل والترحيل",
            items: [
              "البانيل الجانبي كيبين التاريخ ديال الفترات، النشاط القريب، والتحويلات.",
              "الترحيل إلى كان شاعل كيخلي الرصيد يدوز للفترة الجاية.",
              "الترحيل إلى كان طافي كيرجع الباقي للكاش مع بداية الفترة الجاية.",
            ],
          },
        ],
      },
      {
        id: "aide-categories",
        navLabel: "الأصناف",
        title: "الأصناف — شنو كيدير هاد السكرين",
        cards: [
          {
            title: "الإنشاء والنوع",
            items: [
              "زيد صنف وحدد واش للمصاريف، للدخل، ولا بجوج.",
              "كاينين باقات سريعين كيزيدو عدة أصناف مرة وحدة.",
              "تقدر تخلي الربط من بعد إلا غير بغيتي تجهز الأصناف دابا.",
            ],
          },
          {
            title: "الربط",
            items: [
              "كل صنف يقدر يتربط بظرف أو يبقى بلا ربط.",
              "الربط هو اللي كيخلي المصاريف تمشي أوتوماتيكياً للميزانية المناسبة.",
              "تلقائي / مصروف / دخل كيساعدك تصلح النوع إلا تخلط.",
            ],
          },
          {
            title: "الصيانة",
            items: [
              "تقدر تبدل اسم الصنف ولا تمسحو.",
              "الحذف الجماعي كيمسح بزاف ديال الأصناف مرة وحدة.",
              "البحث كيسهل تلقى الصنف إلا كانت اللائحة طويلة.",
            ],
          },
        ],
      },
      {
        id: "aide-repartition",
        navLabel: "التوزيع",
        title: "التوزيع — شنو كيدير هاد السكرين",
        cards: [
          {
            title: "الدور ديال الصفحة",
            items: [
              "هاد الصفحة كتحدد كيفاش الدخل المصرح به غادي يتقسم بين الأظرفة والأهداف.",
              "زر الإعداد كتحل المساعد الرئيسي ديال التوزيع.",
              "الإعدادات المتسجلين تقدر تفعّلهم، تشوفهم، تبدلهم، ولا تمسحهم.",
            ],
          },
          {
            title: "قواعد التوزيع",
            items: [
              "تقدر تعطي بعض الأظرفة مبلغ ثابت.",
              "الباقي يقدر يتقسم بالنسبة، إما بالتساوي ولا حسب الأولوية.",
              "حتى الأهداف يقدرو ياخدو حصة من التوزيع بحال الأظرفة.",
            ],
          },
          {
            title: "المحاكاة والتطبيق",
            items: [
              "المحاكاة المحلية كتبين الثابت، النسبة، والباقي اللي ما توزعش.",
              "تقدر تحفظ الإعداد محلياً باسم.",
              "التطبيق النهائي كيبعث القواعد المفعلة للباكند.",
            ],
          },
        ],
      },
      {
        id: "aide-sweeps",
        navLabel: "السويبات",
        title: "السويبات — شنو كيدير هاد السكرين",
        cards: [
          {
            title: "تذكيرات الدخل",
            items: [
              "التذكيرات كيعونوك ما تنساش تصرح بالسالاير ولا الدخل المتكرر.",
              "تقدر تحدد التردد: شهري، أسبوعي، كل 15 يوم، ولا تاريخ ثابت.",
              "الصفحة كتبرز حتى التاريخ المتوقع الجاي.",
            ],
          },
          {
            title: "العلاقة مع sweep",
            items: [
              "السويب كيتنفذ إلا كان التذكير مستحق والدخل تصرح به.",
              "الأظرفة اللي فيهم الترحيل طافي كيرجع الباقي ديالهم للادخار.",
              "الأظرفة اللي فيهم الترحيل شاعل كيبقاو محافظين على الرصيد.",
            ],
          },
          {
            title: "الأكشنات اللي كيبانو",
            items: [
              "كل تذكير تقدر تعلم عليه كمصرح به ولا تمسحو.",
              "من بعد sweep كيبان تلخيص للفترات اللي تسدات والتحويلات اللي دازت.",
              "زر المعلومات كيشـرح المنطق العام ديال السويبات.",
            ],
          },
        ],
      },
      {
        id: "aide-reports",
        navLabel: "التقارير",
        title: "التقارير — شنو كيدير هاد السكرين",
        cards: [
          {
            title: "واجهة التحليل",
            items: [
              "التقارير كتجمع الكرافيات، التشخيصات، والمؤشرات المتقدمة.",
              "تقدر تفرّي حسب الفترة، الظرف، الصنف، النوع، وكلمة البحث.",
              "التصدير والطبع كيعطيوك نسخة واضحة من حالة الميزانية.",
            ],
          },
          {
            title: "المؤشرات والكرافيات",
            items: [
              "المؤشرات الرئيسية كتشمل الكاش، الدخل، المصاريف، الصافي، وجودة الربط.",
              "التبويبات كتكسر المعطيات حسب المصاريف، الدخل، الأظرفة، السويبات، وجودة البيانات.",
              "إلا كانت الصفحة خاوية، كيبان شنو خاصك دير باش تولي التقارير أغنى.",
            ],
          },
          {
            title: "أكشنات سريعة",
            items: [
              "تقدر تمشي مباشرة للعمليات، الأصناف، ولا السويبات.",
              "التوصيات كتدفعك للخطوة اللي فعلاً غادي تفيدك دابا.",
              "الهدف هنا هو الفهم، ماشي غير تشوف أرقام متفرقة.",
            ],
          },
        ],
      },
      {
        id: "aide-settings",
        navLabel: "الإعدادات",
        title: "الإعدادات — شنو كيدير هاد السكرين",
        cards: [
          {
            title: "التفضيلات",
            items: [
              "الإعدادات كتسير العملة، المدة بين السويبات، وتفضيلات الحساب.",
              "إكمال الإعداد الأولي كيرجع يفتح onboarding إلا بغيتي تحدثو.",
              "التغييرات كتتحفظ من نفس الصفحة.",
            ],
          },
          {
            title: "الجهاز والتصدير",
            items: [
              "الثيم الفاتح/الداكن كيتسجل محلياً فالجهاز.",
              "تصدير البيانات كيساعدك تحتافظ بالبيانات ولا تستعملهم فبلاصة أخرى.",
              "البادج ديال التغييرات كيبين لك واش كلشي محفوظ.",
            ],
          },
          {
            title: "المنطقة الحساسة",
            items: [
              "تصفير بيانات الحساب كيمسح الداتا ويخلي الحساب.",
              "مسح الحساب كيمسح الحساب والبيانات المرتبطة به كاملين.",
              "هاد العمليات خاصها تأكيد صريح قبل ما تتنفذ.",
            ],
          },
        ],
      },
    ],
  },
};

export default function AidePage() {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [openSection, setOpenSection] = useState("aide-intro");

  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  const copy = HELP_COPY[locale];
  const pageDir = getLocaleDirection(locale);

  const navItems = [
    { id: "aide-intro", label: copy.introTitle },
    ...copy.sections.map((section) => ({ id: section.id, label: section.navLabel })),
    { id: "aide-next", label: copy.finalTitle },
  ];

  const handleNav = (id: string) => {
    setOpenSection(id);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? "" : id));
  };

  const tourSteps = useMemo<TourStep[]>(
    () => [
      {
        title: copy.tour[0].title,
        description: copy.tour[0].description,
        ref: headerRef,
      },
      {
        title: copy.tour[1].title,
        description: copy.tour[1].description,
        ref: navRef,
      },
      {
        title: copy.tour[2].title,
        description: copy.tour[2].description,
        ref: contentRef,
      },
    ],
    [copy]
  );

  const {
    isActive: tourActive,
    step: tourStep,
    stepIndex: tourStepIndex,
    total: tourTotal,
    goNext,
    goPrevious,
    canGoPrevious,
    skipTour,
  } = useGlobalTour("aide", tourSteps);

  return (
    <div id="aide-top" className="flex flex-col gap-8" dir={pageDir}>
      {tourActive && tourStep ? (
        <GlobalTourOverlay
          step={tourStep}
          stepIndex={tourStepIndex}
          total={tourTotal}
          canGoPrevious={canGoPrevious}
          onPrevious={goPrevious}
          onNext={goNext}
          onSkip={skipTour}
        />
      ) : null}

      <div ref={headerRef}>
        <PageHeader title={copy.pageTitle} subtitle={copy.pageSubtitle} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
        <nav ref={navRef} className="space-y-4 lg:sticky lg:top-24">
          <Card className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">{copy.quickNavTitle}</p>
              <p className="text-xs text-[var(--muted)]">{copy.quickNavSubtitle}</p>
            </div>
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={openSection === item.id ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                  className="w-full justify-start"
                >
                  <a
                    href={`#${item.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      handleNav(item.id);
                    }}
                  >
                    {item.label}
                  </a>
                </Button>
              ))}
            </div>
            <Button variant="secondary" size="sm" asChild className="w-full">
              <a
                href="#aide-top"
                onClick={(event) => {
                  event.preventDefault();
                  handleNav("aide-intro");
                }}
              >
                {copy.backToTop}
              </a>
            </Button>
          </Card>
        </nav>

        <div ref={contentRef} className="flex flex-col gap-8">
          <div id="aide-intro" className="scroll-mt-24">
            <AideSection
              title={copy.introTitle}
              isOpen={openSection === "aide-intro"}
              onToggle={() => toggleSection("aide-intro")}
              toggleOpenLabel={copy.collapse}
              toggleClosedLabel={copy.open}
              hiddenHint={copy.hiddenHint}
            >
              <div className="space-y-3 text-sm text-[var(--muted)]">
                <p>{copy.introBody}</p>
                <div className="flex flex-wrap gap-2">
                  {copy.steps.map((step, index) => (
                    <Badge key={step} tone={index === copy.steps.length - 1 ? "accent" : "muted"}>
                      {step}
                    </Badge>
                  ))}
                  <Badge tone="muted">{copy.nextStep}</Badge>
                </div>
              </div>
            </AideSection>
          </div>

          {copy.sections.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-24">
              <AideSection
                title={section.title}
                isOpen={openSection === section.id}
                onToggle={() => toggleSection(section.id)}
                toggleOpenLabel={copy.collapse}
                toggleClosedLabel={copy.open}
                hiddenHint={copy.hiddenHint}
              >
                <div className="space-y-4">
                  {section.cards.map((card) => (
                    <Card key={card.title} className="space-y-2">
                      <p className="text-sm font-semibold text-[var(--ink)]">{card.title}</p>
                      <ul className="list-disc space-y-1 ps-4 text-sm text-[var(--muted)]">
                        {card.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
              </AideSection>
            </div>
          ))}

          <div id="aide-next" className="scroll-mt-24">
            <AideSection
              title={copy.finalTitle}
              isOpen={openSection === "aide-next"}
              onToggle={() => toggleSection("aide-next")}
              toggleOpenLabel={copy.collapse}
              toggleClosedLabel={copy.open}
              hiddenHint={copy.hiddenHint}
            >
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
                <span>{copy.finalBody}</span>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard">{copy.returnToDashboard}</Link>
                </Button>
              </div>
            </AideSection>
          </div>
        </div>
      </div>
    </div>
  );
}
