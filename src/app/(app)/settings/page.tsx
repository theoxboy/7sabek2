"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  Globe,
  Palette,
  Settings2,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { API_BASE, apiFetch } from "@/lib/api";
import { logout } from "@/lib/auth";
import type { SettingsResponse, UserOut } from "@/lib/types";
import { usePlatformStatus } from "@/lib/usePlatformStatus";
import { PasskeyManager } from "@/components/auth/PasskeyManager";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import {
  GlobalTourOverlay,
  useGlobalTour,
  type TourStep,
} from "@/components/tour/GlobalTour";
import { getBrowserLocalePreference } from "@/components/i18n/LanguagePreferenceGate";
import {
  FL_LOCALE_LABELS,
  FL_LOCALE_NATIVE_LABELS,
  FL_LOCALES,
  getLocaleDirection,
  persistLocaleCookie,
  type FloussyLocale,
} from "@/lib/localePreference";

const LANGUAGE_CHANGED_EVENT = "floussy:locale-changed";

const formatDate = () => new Date().toISOString().slice(0, 10);

const isValidCurrency = (value: string) => /^[A-Z]{3}$/.test(value.trim());
const PHONE_ALLOWED_CHARS = /^[+0-9()\-\s.]+$/;
const countDigits = (value: string) => (value.match(/\d/g) ?? []).length;

const COUNTRIES = ["Maroc", "Algérie", "Tunisie", "Égypte"] as const;
type Country = (typeof COUNTRIES)[number];

const COUNTRY_LABELS: Record<FloussyLocale, Record<Country, string>> = {
  fr: {
    Maroc: "Maroc",
    "Algérie": "Algérie",
    Tunisie: "Tunisie",
    "Égypte": "Égypte",
  },
  en: {
    Maroc: "Morocco",
    "Algérie": "Algeria",
    Tunisie: "Tunisia",
    "Égypte": "Egypt",
  },
  ar: {
    Maroc: "المغرب",
    "Algérie": "الجزائر",
    Tunisie: "تونس",
    "Égypte": "مصر",
  },
};

const CITIES_BY_COUNTRY: Record<Country, string[]> = {
  Maroc: [
    "Casablanca",
    "Rabat",
    "Marrakech",
    "Fès",
    "Tanger",
    "Agadir",
    "Meknès",
    "Oujda",
    "Kénitra",
    "Tétouan",
    "Safi",
    "El Jadida",
    "Nador",
    "Taza",
    "Khouribga",
    "Béni Mellal",
    "Témara",
    "Mohammédia",
    "Settat",
    "Larache",
    "Khémisset",
    "Berkane",
    "Ouarzazate",
    "Al Hoceïma",
    "Dakhla",
    "Laâyoune",
    "Guelmim",
    "Errachidia",
    "Essaouira",
    "Sidi Kacem",
    "Sidi Slimane",
    "Taroudant",
    "Chefchaouen",
    "Ifrane",
    "Azrou",
    "Ksar El Kebir",
    "Taourirt",
    "Tiznit",
    "Tan-Tan",
    "Autres",
  ],
  "Algérie": [
    "Alger",
    "Oran",
    "Constantine",
    "Annaba",
    "Blida",
    "Sétif",
    "Batna",
    "Béjaïa",
    "Tlemcen",
    "Biskra",
    "Skikda",
    "Tizi Ouzou",
    "Chlef",
    "Jijel",
    "Mostaganem",
    "Sidi Bel Abbès",
    "Ouargla",
    "Ghardaïa",
    "El Oued",
    "Bouira",
    "Tipaza",
    "Saïda",
    "Khenchela",
    "Bordj Bou Arréridj",
    "Laghouat",
    "Médéa",
    "Relizane",
    "Aïn Témouchent",
    "Mascara",
    "Tiaret",
    "Béchar",
    "Adrar",
    "Autres",
  ],
  Tunisie: [
    "Tunis",
    "Sfax",
    "Sousse",
    "Kairouan",
    "Bizerte",
    "Gabès",
    "Nabeul",
    "Monastir",
    "Mahdia",
    "Djerba (Houmt Souk)",
    "Hammamet",
    "Ariana",
    "Ben Arous",
    "La Marsa",
    "Le Kef",
    "Gafsa",
    "Kasserine",
    "Sidi Bouzid",
    "Tozeur",
    "Zarzis",
    "Medenine",
    "Tataouine",
    "Zaghouan",
    "Béja",
    "Jendouba",
    "Siliana",
    "Mahres",
    "Menzel Bourguiba",
    "Autres",
  ],
  "Égypte": [
    "Le Caire",
    "Alexandrie",
    "Gizeh",
    "Port-Saïd",
    "Suez",
    "Tanta",
    "Mansoura",
    "Ismaïlia",
    "Assiout",
    "Louxor",
    "Assouan",
    "Zagazig",
    "Damiette",
    "Minya",
    "Beni Suef",
    "Fayoum",
    "Qena",
    "Sohag",
    "Hurghada",
    "Charm el-Cheikh",
    "6 Octobre",
    "10 Ramadan",
    "El Mahalla el-Kubra",
    "Damanhour",
    "Kafr el-Cheikh",
    "Al-Arich",
    "Marsa Matrouh",
    "Autres",
  ],
};

const SETTINGS_COPY: Record<
  FloussyLocale,
  {
    unknownError: string;
    currencyRequired: string;
    currencyCodeError: string;
    validNumber: string;
    sweepRangeError: string;
    invalidImage: string;
    maxPhotoSize: string;
    completeProfile: string;
    leaderboardRule: string;
    phoneShort: string;
    invalidBirthDate: string;
    ageLimit: string;
    invalidCity: string;
    profileUpdated: string;
    profileUpdatedDesc: string;
    leaderboardChangeLimit: string;
    leaderboardBlocked: string;
    leaderboardCharsInvalid: string;
    error: string;
    noChanges: string;
    everythingUpToDate: string;
    settingsUpdated: string;
    settingsUpdatedDesc: string;
    updateFailed: string;
    exportFailed: string;
    exportReady: string;
    exportReadyDesc: (format: string) => string;
    darkModeEnabled: string;
    lightModeEnabled: string;
    impossible: string;
    userNotLoaded: string;
    dismissResetTitle: string;
    dismissResetDesc: string;
    dismissResetError: string;
    typeDelete: string;
    accountDeleted: string;
    accountDeletedDesc: (email: string, days: number, daysLabel: string, hours: number, hoursLabel: string) => string;
    deleteFailed: string;
    typeReset: string;
    dataReset: string;
    dataResetDesc: string;
    resetFailed: string;
    day: string;
    days: string;
    hour: string;
    hours: string;
    tour: Array<{ title: string; description: string }>;
    pageTitle: string;
    pageSubtitle: string;
    completeOnboarding: string;
    loading: string;
    profileTitle: string;
    profileSubtitle: string;
    profilePhotoOptional: string;
    choosePhoto: string;
    remove: string;
    firstName: string;
    lastName: string;
    leaderboardName: string;
    leaderboardPlaceholder: string;
    leaderboardHint: string;
    phoneNumber: string;
    birthDate: string;
    country: string;
    city: string;
    selectCountry: string;
    selectCity: string;
    chooseCountryFirst: string;
    saving: string;
    saveProfile: string;
    noPendingChanges: string;
    preferencesTitle: string;
    preferencesSubtitle: string;
    languageTitle: string;
    languageSubtitle: string;
    language: string;
    currency: string;
    sweepInterval: string;
    autoSweepEnabled: string;
    autoSweepHelp: string;
    saveSettings: string;
    themeTitle: string;
    themeSubtitle: string;
    optional: string;
    light: string;
    dark: string;
    themeStoredLocally: string;
    dismissedTitle: string;
    dismissedSubtitle: string;
    dismissedBody: string;
    resetDismissed: string;
    resetDismissedConfirmTitle: string;
    resetDismissedConfirmDesc: string;
    cancel: string;
    resetting: string;
    confirm: string;
    exportTitle: string;
    exportSubtitle: string;
    exportBody: string;
    exportJson: string;
    exportCsv: string;
    logsTitle: string;
    logsSubtitle: string;
    logsBody: string;
    openLogs: string;
    dangerTitle: string;
    dangerSubtitle: string;
    resetAccountData: string;
    resetAccountTitle: string;
    resetAccountDesc: string;
    typeResetLabel: string;
    cancelEn: string;
    resetData: string;
    deleteAccount: string;
    deleteAccountTitle: string;
    deleteAccountDesc: string;
    typeDeleteLabel: string;
    deleting: string;
    deletePermanently: string;
  }
> = {
  fr: {
    unknownError: "Erreur inconnue",
    currencyRequired: "La devise est obligatoire.",
    currencyCodeError: "Utilise un code devise sur 3 lettres.",
    validNumber: "Entre un nombre valide.",
    sweepRangeError: "L’intervalle de sweep doit être entre 1 et 365.",
    invalidImage: "Le fichier doit être une image.",
    maxPhotoSize: "La photo ne doit pas dépasser 2 Mo.",
    completeProfile: "Merci de compléter toutes les informations.",
    leaderboardRule:
      "Le pseudo doit contenir 3 à 20 caractères (lettres, chiffres, espaces, . _ -).",
    phoneShort: "Le numéro de téléphone est trop court.",
    invalidBirthDate: "La date de naissance est invalide.",
    ageLimit: "Il faut avoir au moins 13 ans.",
    invalidCity: "Merci de choisir une ville valide pour ce pays.",
    profileUpdated: "Profil mis à jour",
    profileUpdatedDesc: "Tes informations personnelles ont été enregistrées.",
    leaderboardChangeLimit: "Limite atteinte: 2 changements de pseudo par mois.",
    leaderboardBlocked: "Pseudo interdit: suspension automatique 10 jours.",
    leaderboardCharsInvalid: "Caractères invalides dans le pseudo.",
    error: "Erreur",
    noChanges: "Aucun changement",
    everythingUpToDate: "Tout est déjà à jour.",
    settingsUpdated: "Paramètres mis à jour",
    settingsUpdatedDesc: "Tes préférences ont été enregistrées.",
    updateFailed: "Mise à jour échouée",
    exportFailed: "Export échoué",
    exportReady: "Export prêt",
    exportReadyDesc: (format: string) => `Ton export ${format.toUpperCase()} a été téléchargé.`,
    darkModeEnabled: "Mode sombre activé",
    lightModeEnabled: "Mode clair activé",
    impossible: "Impossible",
    userNotLoaded: "Utilisateur non chargé.",
    dismissResetTitle: "Réinitialisé",
    dismissResetDesc: "Les messages ignorés ont été réactivés.",
    dismissResetError: "Impossible de réinitialiser les messages.",
    typeDelete: "Tape DELETE pour confirmer la suppression du compte.",
    accountDeleted: "Compte supprimé",
    accountDeletedDesc: (email, days, daysLabel, hours, hoursLabel) =>
      `Pour récupérer ton compte, contacte le support à ${email} avec l'email du compte, ton nom complet et ton numéro de téléphone. Il reste ${days} ${daysLabel} et ${hours} ${hoursLabel} avant la suppression définitive.`,
    deleteFailed: "Suppression échouée",
    typeReset: "Tape RESET pour confirmer la réinitialisation des données.",
    dataReset: "Données réinitialisées",
    dataResetDesc: "Les données du compte ont été vidées.",
    resetFailed: "Réinitialisation échouée",
    day: "jour",
    days: "jours",
    hour: "heure",
    hours: "heures",
    tour: [
      { title: "Paramètres", description: "Gère ton compte et tes préférences." },
      { title: "Profil", description: "Mets à jour tes infos personnelles." },
      { title: "Préférences", description: "Devise, sweep et réglages de base." },
      { title: "Thème", description: "Choisis ton apparence préférée." },
      { title: "Messages ignorés", description: "Réactive les alertes masquées." },
      { title: "Export", description: "Télécharge tes données en JSON ou CSV." },
      { title: "Logs", description: "Accède au journal complet des actions." },
      { title: "Zone sensible", description: "Réinitialise ou supprime le compte." },
    ],
    pageTitle: "Paramètres",
    pageSubtitle: "Contrôle tes préférences, exports et accès au compte.",
    completeOnboarding: "Terminer l’onboarding",
    loading: "Chargement...",
    profileTitle: "Profil",
    profileSubtitle: "Mets à jour tes informations personnelles.",
    profilePhotoOptional: "Photo de profil (optionnelle)",
    choosePhoto: "Choisir une photo",
    remove: "Supprimer",
    firstName: "Prénom",
    lastName: "Nom",
    leaderboardName: "Pseudo de classement",
    leaderboardPlaceholder: "Ex: 7sabekPro",
    leaderboardHint:
      "Visible dans le ranking. Pseudo propre obligatoire. 2 changements par mois maximum (suspension auto 10 jours en cas d’abus).",
    phoneNumber: "Numéro de téléphone",
    birthDate: "Date de naissance",
    country: "Pays",
    city: "Ville",
    selectCountry: "Sélectionner un pays",
    selectCity: "Sélectionner une ville",
    chooseCountryFirst: "Choisir un pays d'abord",
    saving: "Enregistrement...",
    saveProfile: "Enregistrer le profil",
    noPendingChanges: "Aucun changement en attente",
    preferencesTitle: "Préférences",
    preferencesSubtitle: "Personnalise la devise et la cadence de sweep.",
    languageTitle: "Langue",
    languageSubtitle: "Choisis la langue de l’interface sur cet appareil.",
    language: "Langue",
    currency: "Devise",
    sweepInterval: "Intervalle de sweep (jours)",
    autoSweepEnabled: "Auto sweep",
    autoSweepHelp:
      "Quand activé, les sweeps dus se lancent automatiquement (login et activité).",
    saveSettings: "Enregistrer les paramètres",
    themeTitle: "Thème",
    themeSubtitle: "Passe entre apparence claire et sombre.",
    optional: "Optionnel",
    light: "Clair",
    dark: "Sombre",
    themeStoredLocally: "La préférence de thème est stockée localement sur cet appareil.",
    dismissedTitle: "Messages ignorés",
    dismissedSubtitle: "Réactive les popups que tu as masquées sur le Dashboard.",
    dismissedBody: "Les rappels et alertes masqués seront affichés à nouveau.",
    resetDismissed: "Réinitialiser les messages",
    resetDismissedConfirmTitle: "Réinitialiser les messages ignorés ?",
    resetDismissedConfirmDesc:
      "Cette action réactive toutes les popups masquées sur ce navigateur.",
    cancel: "Annuler",
    resetting: "Réinitialisation...",
    confirm: "Confirmer",
    exportTitle: "Exporter les données",
    exportSubtitle: "Télécharge tes données pour sauvegarde ou analyse.",
    exportBody:
      "JSON inclut la configuration complète, les catégories, les enveloppes et les transactions. CSV exporte les lignes de transactions.",
    exportJson: "Export JSON",
    exportCsv: "Export CSV",
    logsTitle: "Logs",
    logsSubtitle: "Consulte l’historique des actions enregistrées.",
    logsBody: "Accède au journal complet des sweeps, transferts et corrections.",
    openLogs: "Ouvrir les logs",
    dangerTitle: "Zone sensible",
    dangerSubtitle: "Supprime ton compte et toutes les données associées.",
    resetAccountData: "Réinitialiser les données",
    resetAccountTitle: "Réinitialiser les données",
    resetAccountDesc:
      "Cette action vide toutes les enveloppes, catégories, transactions, mappings et historiques. Le compte reste actif.",
    typeResetLabel: "Tape RESET",
    cancelEn: "Annuler",
    resetData: "Réinitialiser les données",
    deleteAccount: "Supprimer le compte",
    deleteAccountTitle: "Confirmer la suppression du compte",
    deleteAccountDesc:
      "Cette action supprime définitivement tes données. Tape DELETE pour confirmer.",
    typeDeleteLabel: "Tape DELETE",
    deleting: "Suppression...",
    deletePermanently: "Supprimer définitivement",
  },
  en: {
    unknownError: "Unknown error",
    currencyRequired: "Currency is required.",
    currencyCodeError: "Use a 3-letter currency code.",
    validNumber: "Enter a valid number.",
    sweepRangeError: "Sweep interval must be between 1 and 365.",
    invalidImage: "The file must be an image.",
    maxPhotoSize: "The photo must not exceed 2 MB.",
    completeProfile: "Please complete all information.",
    leaderboardRule:
      "Leaderboard name must contain 3 to 20 characters (letters, numbers, spaces, . _ -).",
    phoneShort: "Phone number is too short.",
    invalidBirthDate: "Birth date is invalid.",
    ageLimit: "You must be at least 13 years old.",
    invalidCity: "Please choose a valid city for this country.",
    profileUpdated: "Profile updated",
    profileUpdatedDesc: "Your personal information has been saved.",
    leaderboardChangeLimit: "Limit reached: 2 leaderboard-name changes per month.",
    leaderboardBlocked: "Leaderboard name blocked: automatic 10-day suspension.",
    leaderboardCharsInvalid: "Invalid characters in leaderboard name.",
    error: "Error",
    noChanges: "No changes",
    everythingUpToDate: "Everything is already up to date.",
    settingsUpdated: "Settings updated",
    settingsUpdatedDesc: "Your preferences were saved successfully.",
    updateFailed: "Update failed",
    exportFailed: "Export failed",
    exportReady: "Export ready",
    exportReadyDesc: (format: string) => `Your ${format.toUpperCase()} export was downloaded.`,
    darkModeEnabled: "Dark mode enabled",
    lightModeEnabled: "Light mode enabled",
    impossible: "Impossible",
    userNotLoaded: "User not loaded.",
    dismissResetTitle: "Reset complete",
    dismissResetDesc: "Dismissed messages were re-enabled.",
    dismissResetError: "Unable to reset dismissed messages.",
    typeDelete: "Type DELETE to confirm account removal.",
    accountDeleted: "Account deleted",
    accountDeletedDesc: (email, days, daysLabel, hours, hoursLabel) =>
      `To recover your account, contact support at ${email} with your account email, full name, and phone number. There are ${days} ${daysLabel} and ${hours} ${hoursLabel} left before permanent deletion.`,
    deleteFailed: "Delete failed",
    typeReset: "Type RESET to confirm data reset.",
    dataReset: "Data reset",
    dataResetDesc: "Your account data has been cleared.",
    resetFailed: "Reset failed",
    day: "day",
    days: "days",
    hour: "hour",
    hours: "hours",
    tour: [
      { title: "Settings", description: "Manage your account and preferences." },
      { title: "Profile", description: "Update your personal information." },
      { title: "Preferences", description: "Currency, sweep, and core settings." },
      { title: "Theme", description: "Choose your preferred appearance." },
      { title: "Dismissed messages", description: "Re-enable hidden alerts." },
      { title: "Export", description: "Download your data as JSON or CSV." },
      { title: "Logs", description: "Open the complete action log." },
      { title: "Danger zone", description: "Reset or delete the account." },
    ],
    pageTitle: "Settings",
    pageSubtitle: "Control your preferences, exports, and account access.",
    completeOnboarding: "Complete onboarding",
    loading: "Loading...",
    profileTitle: "Profile",
    profileSubtitle: "Update your personal information.",
    profilePhotoOptional: "Profile photo (optional)",
    choosePhoto: "Choose a photo",
    remove: "Remove",
    firstName: "First name",
    lastName: "Last name",
    leaderboardName: "Leaderboard name",
    leaderboardPlaceholder: "Ex: 7sabekPro",
    leaderboardHint:
      "Visible in ranking. Clean username required. Maximum 2 changes per month (automatic 10-day suspension in case of abuse).",
    phoneNumber: "Phone number",
    birthDate: "Birth date",
    country: "Country",
    city: "City",
    selectCountry: "Select a country",
    selectCity: "Select a city",
    chooseCountryFirst: "Choose a country first",
    saving: "Saving...",
    saveProfile: "Save profile",
    noPendingChanges: "No pending changes",
    preferencesTitle: "Preferences",
    preferencesSubtitle: "Personalize currency and sweep cadence.",
    languageTitle: "Language",
    languageSubtitle: "Choose the interface language on this device.",
    language: "Language",
    currency: "Currency",
    sweepInterval: "Sweep interval (days)",
    autoSweepEnabled: "Auto sweep",
    autoSweepHelp:
      "When enabled, due sweeps run automatically (login and activity).",
    saveSettings: "Save settings",
    themeTitle: "Theme",
    themeSubtitle: "Switch between light and dark appearance.",
    optional: "Optional",
    light: "Light",
    dark: "Dark",
    themeStoredLocally: "Theme preference is stored locally on this device.",
    dismissedTitle: "Dismissed messages",
    dismissedSubtitle: "Re-enable the popups you hid on the Dashboard.",
    dismissedBody: "Hidden reminders and alerts will be shown again.",
    resetDismissed: "Reset dismissed messages",
    resetDismissedConfirmTitle: "Reset dismissed messages?",
    resetDismissedConfirmDesc:
      "This action re-enables all hidden popups on this browser.",
    cancel: "Cancel",
    resetting: "Resetting...",
    confirm: "Confirm",
    exportTitle: "Export data",
    exportSubtitle: "Download your financial data for backups or analysis.",
    exportBody:
      "JSON includes full configuration, categories, envelopes, and transactions. CSV exports transaction rows.",
    exportJson: "Export JSON",
    exportCsv: "Export CSV",
    logsTitle: "Logs",
    logsSubtitle: "Review the recorded action history.",
    logsBody: "Access the complete journal of sweeps, transfers, and corrections.",
    openLogs: "Open logs",
    dangerTitle: "Danger zone",
    dangerSubtitle: "Delete your account and all associated data.",
    resetAccountData: "Reset account data",
    resetAccountTitle: "Reset account data",
    resetAccountDesc:
      "This clears all envelopes, categories, transactions, mappings, and history. Your account stays active.",
    typeResetLabel: "Type RESET",
    cancelEn: "Cancel",
    resetData: "Reset data",
    deleteAccount: "Delete account",
    deleteAccountTitle: "Confirm account deletion",
    deleteAccountDesc:
      "This action permanently deletes your data. Type DELETE to confirm.",
    typeDeleteLabel: "Type DELETE",
    deleting: "Deleting...",
    deletePermanently: "Delete permanently",
  },
  ar: {
    unknownError: "وقع مشكل غير معروف",
    currencyRequired: "العملة ضرورية.",
    currencyCodeError: "استعمل كود ديال العملة فيه 3 حروف.",
    validNumber: "دخل رقم صحيح.",
    sweepRangeError: "المدة بين sweeps خاصها تكون بين 1 و 365.",
    invalidImage: "الملف خاصو يكون صورة.",
    maxPhotoSize: "الصورة ما خاصهاش تفوت 2 ميغا.",
    completeProfile: "كمل جميع المعلومات.",
    leaderboardRule:
      "الاسم ديال الترتيب خاصو يكون بين 3 و20 حرف/رقم، وكيقبل المسافة و . _ -",
    phoneShort: "رقم الهاتف قصير بزاف.",
    invalidBirthDate: "تاريخ الازدياد ما صالحش.",
    ageLimit: "خاص يكون العمر على الأقل 13 عام.",
    invalidCity: "اختار مدينة صالحة لهاد البلاد.",
    profileUpdated: "تبدل البروفايل",
    profileUpdatedDesc: "المعلومات الشخصية ديالك تحفضات.",
    leaderboardChangeLimit: "وصلتي للحد: جوج تغييرات ديال الاسم فالشهر.",
    leaderboardBlocked: "الاسم ترفض: كاينة وقفة أوتوماتيكية 10 أيام.",
    leaderboardCharsInvalid: "كاينين حروف ما صالحينش فالاسم.",
    error: "مشكلة",
    noChanges: "ما كاين حتى تبديل",
    everythingUpToDate: "كلشي راه محين.",
    settingsUpdated: "تبدلات الإعدادات",
    settingsUpdatedDesc: "التفضيلات ديالك تحفضات.",
    updateFailed: "ما نجحاتش لميزا جور",
    exportFailed: "ما نجحش التصدير",
    exportReady: "وجد التصدير",
    exportReadyDesc: (format: string) => `الملف ${format.toUpperCase()} ديالك تهبط.`,
    darkModeEnabled: "تفعّل المود الغامق",
    lightModeEnabled: "تفعّل المود الفاتح",
    impossible: "مستحيل",
    userNotLoaded: "المستخدم مازال ما تحملش.",
    dismissResetTitle: "تعاودو تشعلو",
    dismissResetDesc: "الرسائل اللي خبيتيهم رجعو خدامين.",
    dismissResetError: "ما قدرناش نرجعو الرسائل المخبية.",
    typeDelete: "كتب DELETE باش تأكد حذف الحساب.",
    accountDeleted: "تحيد الحساب",
    accountDeletedDesc: (email, days, daysLabel, hours, hoursLabel) =>
      `إلا بغيتي ترجّع الحساب، تاصل بالدعم على ${email} باستعمال إيميل الحساب والاسم الكامل ورقم الهاتف. باقي ${days} ${daysLabel} و ${hours} ${hoursLabel} قبل الحذف النهائي.`,
    deleteFailed: "ما نجحش الحذف",
    typeReset: "كتب RESET باش تأكد مسح البيانات.",
    dataReset: "تمسحات البيانات",
    dataResetDesc: "بيانات الحساب تمسحات.",
    resetFailed: "ما نجحاتش إعادة التصفير",
    day: "نهار",
    days: "أيام",
    hour: "ساعة",
    hours: "ساعات",
    tour: [
      { title: "الإعدادات", description: "سير الحساب والتفضيلات ديالك." },
      { title: "البروفايل", description: "بدل المعلومات الشخصية ديالك." },
      { title: "التفضيلات", description: "العملة، sweep، والإعدادات الأساسية." },
      { title: "الثيم", description: "اختار الشكل اللي كيوافقك." },
      { title: "الرسائل المخبية", description: "رجع التنبيهات اللي خبيتي." },
      { title: "التصدير", description: "هبط البيانات ديالك JSON ولا CSV." },
      { title: "اللوغات", description: "شوف التاريخ الكامل ديال الأكشنات." },
      { title: "المنطقة الحساسة", description: "صفّر الحساب ولا مسحو كامل." },
    ],
    pageTitle: "الإعدادات",
    pageSubtitle: "سير التفضيلات، التصدير، والوصول للحساب ديالك.",
    completeOnboarding: "كمّل onboarding",
    loading: "كيتحمّل...",
    profileTitle: "البروفايل",
    profileSubtitle: "بدل المعلومات الشخصية ديالك.",
    profilePhotoOptional: "صورة البروفايل (اختيارية)",
    choosePhoto: "اختار صورة",
    remove: "حيد",
    firstName: "الاسم الشخصي",
    lastName: "النسب",
    leaderboardName: "الاسم ديال الترتيب",
    leaderboardPlaceholder: "مثال: حسابكPro",
    leaderboardHint:
      "كيبان فالترتيب. خاص الاسم يكون نقي. الحد الأقصى جوج تغييرات فالشهر.",
    phoneNumber: "رقم الهاتف",
    birthDate: "تاريخ الازدياد",
    country: "البلاد",
    city: "المدينة",
    selectCountry: "اختار البلاد",
    selectCity: "اختار المدينة",
    chooseCountryFirst: "اختار البلاد اللول",
    saving: "كيتحفظ...",
    saveProfile: "حفظ البروفايل",
    noPendingChanges: "ما كاين حتى تبديل باقي",
    preferencesTitle: "التفضيلات",
    preferencesSubtitle: "خصص العملة والمدة ديال sweep.",
    languageTitle: "اللغة",
    languageSubtitle: "اختار لغة الواجهة فهاد الجهاز.",
    language: "اللغة",
    currency: "العملة",
    sweepInterval: "المدة بين sweeps (بالأيام)",
    autoSweepEnabled: "Auto sweep",
    autoSweepHelp:
      "إلا كان مفعّل، sweeps اللي واجدين كيتشغلو بوحدهم (فالولوج والنشاط).",
    saveSettings: "حفظ الإعدادات",
    themeTitle: "الثيم",
    themeSubtitle: "بدل بين الشكل الفاتح والغامق.",
    optional: "اختياري",
    light: "فاتح",
    dark: "غامق",
    themeStoredLocally: "اختيار الثيم كيتسجل غير فهاد الجهاز.",
    dismissedTitle: "الرسائل المخبية",
    dismissedSubtitle: "رجع popups اللي خبيتيهم فلوحة القيادة.",
    dismissedBody: "التذكيرات والتنبيهات المخبيين غادي يبانـو من جديد.",
    resetDismissed: "رجع الرسائل",
    resetDismissedConfirmTitle: "ترجع الرسائل المخبية؟",
    resetDismissedConfirmDesc: "هاد العملية غادي ترجع جميع popups المخبيين فهاد المتصفح.",
    cancel: "إلغاء",
    resetting: "كيتصفّر...",
    confirm: "تأكيد",
    exportTitle: "تصدير البيانات",
    exportSubtitle: "هبط البيانات المالية ديالك للنسخ الاحتياطي ولا التحليل.",
    exportBody:
      "JSON فيه الكونفيك كامل، الأصناف، الأظرفة، والعمليات. CSV فيه غير سطور العمليات.",
    exportJson: "تصدير JSON",
    exportCsv: "تصدير CSV",
    logsTitle: "اللوغات",
    logsSubtitle: "شوف تاريخ الأكشنات اللي تسجلو.",
    logsBody: "دخول لسجل sweeps، التحويلات، والتصحيحات كامل.",
    openLogs: "حل اللوغات",
    dangerTitle: "المنطقة الحساسة",
    dangerSubtitle: "تمسح الحساب والبيانات المرتبطة به كاملين.",
    resetAccountData: "صفّر بيانات الحساب",
    resetAccountTitle: "صفّر بيانات الحساب",
    resetAccountDesc:
      "هادشي غادي يمسح الأظرفة، الأصناف، العمليات، المابينغ، والتاريخ كامل. الحساب غيبقى خدام.",
    typeResetLabel: "كتب RESET",
    cancelEn: "إلغاء",
    resetData: "صفّر البيانات",
    deleteAccount: "مسح الحساب",
    deleteAccountTitle: "أكد حذف الحساب",
    deleteAccountDesc: "هاد العملية غادي تمسح البيانات ديالك نهائياً. كتب DELETE باش تأكد.",
    typeDeleteLabel: "كتب DELETE",
    deleting: "كيتحيد...",
    deletePermanently: "مسح نهائياً",
  },
};

export default function SettingsPage() {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const preferencesRef = useRef<HTMLDivElement | null>(null);
  const themeRef = useRef<HTMLDivElement | null>(null);
  const dismissedRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const logsRef = useRef<HTMLDivElement | null>(null);
  const dangerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [currency, setCurrency] = useState("MAD");
  const [sweepIntervalDays, setSweepIntervalDays] = useState(7);
  const [autoSweepEnabled, setAutoSweepEnabled] = useState(true);
  const [initialCurrency, setInitialCurrency] = useState("MAD");
  const [initialSweepIntervalDays, setInitialSweepIntervalDays] = useState(7);
  const [initialAutoSweepEnabled, setInitialAutoSweepEnabled] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [leaderboardName, setLeaderboardName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState<Country | "">("");
  const [city, setCity] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [initialProfile, setInitialProfile] = useState({
    firstName: "",
    lastName: "",
    leaderboardName: "",
    phoneNumber: "",
    birthDate: "",
    country: "",
    city: "",
    profilePhotoUrl: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteAcknowledge, setDeleteAcknowledge] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [useCustomCity, setUseCustomCity] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const status = usePlatformStatus();
  const copy = SETTINGS_COPY[locale];
  const pageDir = getLocaleDirection(locale);
  const phonePlaceholder =
    locale === "ar"
      ? "مثال: +212 6 12 34 56 78"
      : locale === "fr"
      ? "Ex: +212 6 12 34 56 78"
      : "Ex: +212 6 12 34 56 78";
  const localeChoices = useMemo(
    () =>
      FL_LOCALES.map((item) => ({
        value: item,
        badge: FL_LOCALE_LABELS[item],
        label: FL_LOCALE_NATIVE_LABELS[item],
      })),
    []
  );

  useEffect(() => {
    const syncLocale = () => setLocale(getBrowserLocalePreference() ?? "fr");
    syncLocale();
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLocale);
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("floussy_theme");
    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      return;
    }
    setTheme("light");
    document.documentElement.removeAttribute("data-theme");
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, authUser] = await Promise.all([
          apiFetch<SettingsResponse>("/users/me/settings"),
          apiFetch<UserOut>("/auth/me"),
        ]);
        setCurrency(data.currency);
        setSweepIntervalDays(data.sweep_interval_days);
        setAutoSweepEnabled(data.auto_sweep_enabled);
        setInitialCurrency(data.currency);
        setInitialSweepIntervalDays(data.sweep_interval_days);
        setInitialAutoSweepEnabled(data.auto_sweep_enabled);
        setUserId(authUser.id);
        const nextProfile = {
          firstName: authUser.first_name ?? "",
          lastName: authUser.last_name ?? "",
          leaderboardName: authUser.leaderboard_name ?? "",
          phoneNumber: authUser.phone_number ?? "",
          birthDate: authUser.birth_date ?? "",
          country: (authUser.country as Country) ?? "",
          city: authUser.city ?? "",
          profilePhotoUrl: authUser.profile_photo_url ?? "",
        };
        setFirstName(nextProfile.firstName);
        setLastName(nextProfile.lastName);
        setLeaderboardName(nextProfile.leaderboardName);
        setPhoneNumber(nextProfile.phoneNumber);
        setBirthDate(nextProfile.birthDate);
        setCountry(nextProfile.country);
        setCity(nextProfile.city);
        setProfilePhotoUrl(nextProfile.profilePhotoUrl);
        setInitialProfile(nextProfile);
      } catch (err) {
        const message = err instanceof Error ? err.message : copy.unknownError;
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [copy.unknownError]);


  useEffect(() => {
    if (!deleteOpen) {
      setDeleteText("");
      setDeleteAcknowledge(false);
      setDeleteError(null);
    }
  }, [deleteOpen]);

  useEffect(() => {
    if (!resetOpen) {
      setResetText("");
      setResetError(null);
    }
  }, [resetOpen]);

  const maxBirthDate = useMemo(() => {
    const today = new Date();
    const max = new Date(
      today.getFullYear() - 13,
      today.getMonth(),
      today.getDate()
    );
    return max.toISOString().slice(0, 10);
  }, []);

  const citiesForCountry = useMemo(
    () => (country ? CITIES_BY_COUNTRY[country] : []),
    [country]
  );

  const countryLabels = COUNTRY_LABELS[locale];

  useEffect(() => {
    if (!country) {
      setCity("");
      return;
    }
  }, [country, city, citiesForCountry]);

  useEffect(() => {
    if (!country) {
      setUseCustomCity(false);
      return;
    }
    if (city && !citiesForCountry.includes(city)) {
      setUseCustomCity(true);
    }
  }, [country, city, citiesForCountry]);

  const currencyError = useMemo(() => {
    if (!currency.trim()) return copy.currencyRequired;
    if (!isValidCurrency(currency)) return copy.currencyCodeError;
    return null;
  }, [currency, copy.currencyCodeError, copy.currencyRequired]);

  const sweepError = useMemo(() => {
    if (!Number.isFinite(sweepIntervalDays)) return copy.validNumber;
    if (sweepIntervalDays < 1 || sweepIntervalDays > 365) {
      return copy.sweepRangeError;
    }
    return null;
  }, [sweepIntervalDays, copy.sweepRangeError, copy.validNumber]);

  const hasChanges =
    currency !== initialCurrency ||
    sweepIntervalDays !== initialSweepIntervalDays ||
    autoSweepEnabled !== initialAutoSweepEnabled;

  const profileHasChanges =
    firstName !== initialProfile.firstName ||
    lastName !== initialProfile.lastName ||
    leaderboardName !== initialProfile.leaderboardName ||
    phoneNumber !== initialProfile.phoneNumber ||
    birthDate !== initialProfile.birthDate ||
    country !== initialProfile.country ||
    city !== initialProfile.city ||
    profilePhotoUrl !== initialProfile.profilePhotoUrl;
  const accountPendingChanges = profileHasChanges;
  const prefsPendingChanges = hasChanges;
  const totalPendingGroups = Number(accountPendingChanges) + Number(prefsPendingChanges);
  const hasAnyPendingChanges = totalPendingGroups > 0;

  const handleProfilePhotoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError(copy.invalidImage);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError(copy.maxPhotoSize);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhotoUrl(typeof reader.result === "string" ? reader.result : "");
      setPhotoError(null);
    };
    reader.readAsDataURL(file);
  };

  const validateProfile = () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !leaderboardName.trim() ||
      !phoneNumber.trim() ||
      !birthDate ||
      !country.trim() ||
      !city.trim()
    ) {
      setProfileError(copy.completeProfile);
      return false;
    }
    if (!/^[A-Za-z0-9 _.-]{3,20}$/.test(leaderboardName.trim())) {
      setProfileError(copy.leaderboardRule);
      return false;
    }
    const phone = phoneNumber.trim();
    if (!PHONE_ALLOWED_CHARS.test(phone) || countDigits(phone) < 6) {
      setProfileError(copy.phoneShort);
      return false;
    }
    const birth = new Date(birthDate);
    const today = new Date();
    const minBirth = new Date(
      today.getFullYear() - 13,
      today.getMonth(),
      today.getDate()
    );
    if (Number.isNaN(birth.getTime()) || birth > today) {
      setProfileError(copy.invalidBirthDate);
      return false;
    }
    if (birth > minBirth) {
      setProfileError(copy.ageLimit);
      return false;
    }
    setProfileError(null);
    return true;
  };

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError(null);
    if (!validateProfile()) return;
    setProfileSaving(true);
    try {
      const updated = await apiFetch<UserOut>("/users/me/profile", {
        method: "PATCH",
        body: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          leaderboard_name: leaderboardName.trim(),
          phone_number: phoneNumber.trim().replace(/\s+/g, " "),
          birth_date: birthDate,
          country: country.trim(),
          city: city.trim(),
          profile_photo_url: profilePhotoUrl || null,
        },
      });
      const nextProfile = {
        firstName: updated.first_name ?? "",
        lastName: updated.last_name ?? "",
        leaderboardName: updated.leaderboard_name ?? "",
        phoneNumber: updated.phone_number ?? "",
        birthDate: updated.birth_date ?? "",
        country: (updated.country as Country) ?? "",
        city: updated.city ?? "",
        profilePhotoUrl: updated.profile_photo_url ?? "",
      };
      setInitialProfile(nextProfile);
      setFirstName(nextProfile.firstName);
      setLastName(nextProfile.lastName);
      setLeaderboardName(nextProfile.leaderboardName);
      setPhoneNumber(nextProfile.phoneNumber);
      setBirthDate(nextProfile.birthDate);
      setCountry(nextProfile.country);
      setCity(nextProfile.city);
      setProfilePhotoUrl(nextProfile.profilePhotoUrl);
      setLastSavedAt(new Date().toISOString());
      toast({
        title: copy.profileUpdated,
        description: copy.profileUpdatedDesc,
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : copy.unknownError;
      let message = raw;
      if (raw.includes("PSEUDO_CHANGE_LIMIT")) {
        message = copy.leaderboardChangeLimit;
      } else if (raw.includes("PSEUDO_BLOCKED_FOR_ABUSE")) {
        message = copy.leaderboardBlocked;
      } else if (raw.includes("PSEUDO_CHARS_INVALID")) {
        message = copy.leaderboardCharsInvalid;
      }
      setProfileError(message);
      toast({
        title: copy.error,
        description: message,
        variant: "danger",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (currencyError || sweepError) {
      setError(currencyError ?? sweepError);
      return;
    }

    if (!hasChanges) {
      toast({
        title: copy.noChanges,
        description: copy.everythingUpToDate,
      });
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<SettingsResponse> = {};
      if (currency !== initialCurrency) {
        payload.currency = currency.trim().toUpperCase();
      }
      if (sweepIntervalDays !== initialSweepIntervalDays) {
        payload.sweep_interval_days = sweepIntervalDays;
      }
      if (autoSweepEnabled !== initialAutoSweepEnabled) {
        payload.auto_sweep_enabled = autoSweepEnabled;
      }

      const updated = await apiFetch<SettingsResponse>("/users/me/settings", {
        method: "PATCH",
        body: payload,
      });
      setInitialCurrency(updated.currency);
      setInitialSweepIntervalDays(updated.sweep_interval_days);
      setInitialAutoSweepEnabled(updated.auto_sweep_enabled);
      setAutoSweepEnabled(updated.auto_sweep_enabled);
      setLastSavedAt(new Date().toISOString());
      toast({
        title: copy.settingsUpdated,
        description: copy.settingsUpdatedDesc,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
      toast({
        title: copy.updateFailed,
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: "json" | "csv") => {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}/users/me/export?format=${format}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error(copy.exportFailed);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `floussy-export-${formatDate()}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: copy.exportReady,
        description: copy.exportReadyDesc(format),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setError(message);
      toast({ title: copy.exportFailed, description: message });
    } finally {
      setExporting(false);
    }
  };

  const handleThemeChange = (nextTheme: string) => {
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      window.localStorage.setItem("floussy_theme", "dark");
      toast({ title: copy.darkModeEnabled });
    } else {
      document.documentElement.removeAttribute("data-theme");
      window.localStorage.removeItem("floussy_theme");
      toast({ title: copy.lightModeEnabled });
    }
  };

  const handleResetDismissals = () => {
    if (!userId) {
      toast({
        title: copy.impossible,
        description: copy.userNotLoaded,
        variant: "danger",
      });
      return;
    }
    setDismissing(true);
    try {
      const suffix = `:${userId}:v1`;
      Object.keys(window.localStorage).forEach((key) => {
        if (key.startsWith("dismissed:") && key.endsWith(suffix)) {
          window.localStorage.removeItem(key);
        }
      });
      window.localStorage.removeItem("floussy.dismissedIncomeReminders.v1");
      toast({
        title: copy.dismissResetTitle,
        description: copy.dismissResetDesc,
      });
      setDismissOpen(false);
    } catch {
      toast({
        title: copy.error,
        description: copy.dismissResetError,
        variant: "danger",
      });
    } finally {
      setDismissing(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    if (!deleteAcknowledge) {
      setDeleteError(
        locale === "ar"
          ? "خاصك تأكد أنك فاهم أثر الحذف النهائي."
          : locale === "fr"
          ? "Tu dois confirmer que tu comprends l’impact de la suppression."
          : "You must confirm that you understand the deletion impact."
      );
      return;
    }
    if (deleteText !== "DELETE") {
      setDeleteError(copy.typeDelete);
      return;
    }
    setDeleting(true);
    try {
      await apiFetch("/users/me", { method: "DELETE" });
      await logout().catch(() => null);
      const supportEmail =
        status?.support_email?.trim() || "elidryssi@gmail.com";
      const graceDays = status?.account_deletion_grace_days ?? 30;
      const totalSeconds = Math.max(0, graceDays * 24 * 60 * 60);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const daysLabel = days === 1 ? copy.day : copy.days;
      const hoursLabel = hours === 1 ? copy.hour : copy.hours;
      toast({
        title: copy.accountDeleted,
        description: copy.accountDeletedDesc(
          supportEmail,
          days,
          daysLabel,
          hours,
          hoursLabel
        ),
        variant: "danger",
      });
      router.push("/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setDeleteError(message);
      toast({ title: copy.deleteFailed, description: message });
    } finally {
      setDeleting(false);
    }
  };

  const handleResetData = async () => {
    setResetError(null);
    if (resetText !== "RESET") {
      setResetError(copy.typeReset);
      return;
    }
    setResetting(true);
    try {
      await apiFetch("/users/me/reset", { method: "POST" });
      toast({
        title: copy.dataReset,
        description: copy.dataResetDesc,
        variant: "success",
      });
      setResetOpen(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.unknownError;
      setResetError(message);
      toast({ title: copy.resetFailed, description: message });
    } finally {
      setResetting(false);
    }
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
        ref: profileRef,
      },
      {
        title: copy.tour[2].title,
        description: copy.tour[2].description,
        ref: preferencesRef,
      },
      {
        title: copy.tour[3].title,
        description: copy.tour[3].description,
        ref: themeRef,
      },
      {
        title: copy.tour[4].title,
        description: copy.tour[4].description,
        ref: dismissedRef,
      },
      {
        title: copy.tour[5].title,
        description: copy.tour[5].description,
        ref: exportRef,
      },
      {
        title: copy.tour[6].title,
        description: copy.tour[6].description,
        ref: logsRef,
      },
      {
        title: copy.tour[7].title,
        description: copy.tour[7].description,
        ref: dangerRef,
      },
    ],
    [copy]
  );

  const {
    isActive: tourActive,
    step: tourStep,
    stepIndex: tourStepIndex,
    total: tourTotal,
    canGoPrevious: canGoPrevious,
    goPrevious: goPrevious,
    goNext,
    skipTour,
  } = useGlobalTour("settings", tourSteps);

  return (
    <div className="flex flex-col gap-6" dir={pageDir}>
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
        <PageHeader
          title={copy.pageTitle}
          subtitle={copy.pageSubtitle}
          actions={
            <div className="flex items-center gap-2">
              <Badge tone="muted">{FL_LOCALE_LABELS[locale]}</Badge>
              <Button asChild variant="secondary" size="sm">
                <Link href="/onboarding">{copy.completeOnboarding}</Link>
              </Button>
            </div>
          }
        />
      </div>
      <div className="sticky top-2 z-20 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 px-3 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={hasAnyPendingChanges ? "warning" : "success"}>
            {hasAnyPendingChanges
              ? locale === "ar"
                ? `كاينين ${totalPendingGroups} مجموعات ديال التغييرات`
                : locale === "fr"
                ? `${totalPendingGroups} groupes de changements non enregistrés`
                : `${totalPendingGroups} unsaved change groups`
              : locale === "ar"
              ? "كلشي متزامن"
              : locale === "fr"
              ? "Tout est synchronisé"
              : "All synced"}
          </Badge>
          {lastSavedAt ? (
            <Badge tone="muted">
              {locale === "ar" ? "آخر حفظ" : locale === "fr" ? "Dernière sauvegarde" : "Last save"}:{" "}
              {new Date(lastSavedAt).toLocaleTimeString()}
            </Badge>
          ) : null}
          <button type="button" className="rounded-full border px-2 py-1 text-xs" onClick={() => profileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            {locale === "ar" ? "الحساب" : locale === "fr" ? "Compte" : "Account"}
          </button>
          <button type="button" className="rounded-full border px-2 py-1 text-xs" onClick={() => preferencesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            {locale === "ar" ? "التفضيلات" : locale === "fr" ? "Préférences" : "Preferences"}
          </button>
          <button type="button" className="rounded-full border px-2 py-1 text-xs" onClick={() => exportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            {locale === "ar" ? "البيانات" : locale === "fr" ? "Données" : "Data"}
          </button>
          <button type="button" className="rounded-full border px-2 py-1 text-xs" onClick={() => dangerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            {locale === "ar" ? "الأمان" : locale === "fr" ? "Sécurité" : "Security"}
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-[var(--muted)]">{copy.loading}</p> : null}
      {error ? (
        <p className="rounded-2xl border border-[var(--error)]/20 bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]">
          {error}
        </p>
      ) : null}

      <div ref={profileRef}>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          <UserRound className="h-4 w-4" />
          <span>{locale === "ar" ? "الحساب" : locale === "fr" ? "Compte" : "Account"}</span>
        </div>
        <Section
          title={copy.profileTitle}
          subtitle={copy.profileSubtitle}
        >
        <form onSubmit={handleProfileSave} className="grid gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-dashed border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"
            >
              {profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePhotoUrl}
                  alt={copy.profilePhotoOptional}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Camera className="h-6 w-6" />
              )}
            </button>
            <div className="flex flex-col gap-1 text-sm text-[var(--muted)]">
              <span>{copy.profilePhotoOptional}</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {copy.choosePhoto}
                </Button>
                {profilePhotoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setProfilePhotoUrl("")}
                  >
                    {copy.remove}
                  </Button>
                ) : null}
              </div>
              {photoError ? (
                <span className="text-xs text-[var(--error)]">{photoError}</span>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfilePhotoChange}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="first-name">{copy.firstName}</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="last-name">{copy.lastName}</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="leaderboard-name">{copy.leaderboardName}</Label>
            <Input
              id="leaderboard-name"
              value={leaderboardName}
              onChange={(event) => setLeaderboardName(event.target.value)}
              placeholder={copy.leaderboardPlaceholder}
            />
            <p className="text-xs text-[var(--muted)]">
              {copy.leaderboardHint}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone-number">{copy.phoneNumber}</Label>
              <Input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder={phonePlaceholder}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="birth-date">{copy.birthDate}</Label>
              <Input
                id="birth-date"
                type="date"
                max={maxBirthDate}
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="country">{copy.country}</Label>
              <select
                id="country"
                value={country}
                onChange={(event) =>
                  setCountry(event.target.value as Country | "")
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
              >
                <option value="" disabled>
                  {copy.selectCountry}
                </option>
                {COUNTRIES.map((item) => (
                  <option key={item} value={item}>
                    {countryLabels[item]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="city">{copy.city}</Label>
              {!useCustomCity ? (
                <select
                  id="city"
                  value={city}
                  onChange={(event) => {
                    if (event.target.value === "__other__") {
                      setUseCustomCity(true);
                      setCity("");
                      return;
                    }
                    setCity(event.target.value);
                  }}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
                  disabled={!country}
                >
                  <option value="" disabled>
                    {country ? copy.selectCity : copy.chooseCountryFirst}
                  </option>
                  {city && !citiesForCountry.includes(city) ? (
                    <option value={city}>{city}</option>
                  ) : null}
                  {citiesForCountry.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  <option value="__other__">
                    {locale === "ar" ? "مدينة أخرى..." : locale === "fr" ? "Autre ville..." : "Other city..."}
                  </option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder={locale === "ar" ? "دخل المدينة" : locale === "fr" ? "Saisir la ville" : "Enter city"}
                    disabled={!country}
                  />
                  <Button type="button" variant="secondary" onClick={() => setUseCustomCity(false)}>
                    {locale === "ar" ? "لائحة" : locale === "fr" ? "Liste" : "List"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {profileError ? (
            <p className="rounded-2xl border border-[var(--error)]/20 bg-[var(--error-soft)] px-3 py-2 text-sm text-[var(--error)]">
              {profileError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={profileSaving || !profileHasChanges}>
              {profileSaving ? copy.saving : copy.saveProfile}
            </Button>
            {!profileHasChanges ? (
              <Badge tone="muted">{copy.noPendingChanges}</Badge>
            ) : null}
          </div>
        </form>
        </Section>
      </div>

      <div ref={preferencesRef}>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          <Settings2 className="h-4 w-4" />
          <span>{locale === "ar" ? "التفضيلات" : locale === "fr" ? "Préférences" : "Preferences"}</span>
        </div>
        <Section title={copy.preferencesTitle} subtitle={copy.preferencesSubtitle}>
        <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex flex-col gap-2">
            <Label htmlFor="app-language">{copy.languageTitle}</Label>
            <select
              id="app-language"
              value={locale}
              onChange={(event) => {
                const nextLocale = event.target.value as FloussyLocale;
                persistLocaleCookie(nextLocale);
                document.documentElement.lang = nextLocale;
                document.documentElement.dir = getLocaleDirection(nextLocale);
                window.dispatchEvent(
                  new CustomEvent(LANGUAGE_CHANGED_EVENT, {
                    detail: { locale: nextLocale },
                  })
                );
              }}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] md:max-w-sm"
            >
              {localeChoices.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.badge})
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--muted)]">{copy.languageSubtitle}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="currency">{copy.currency}</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value.toUpperCase())
              }
              maxLength={3}
              placeholder="MAD"
            />
            {currencyError ? (
              <span className="text-xs text-[var(--error)]">
                {currencyError}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sweep">{copy.sweepInterval}</Label>
            <Input
              id="sweep"
              type="number"
              min={1}
              max={365}
              value={sweepIntervalDays}
              onChange={(event) =>
                setSweepIntervalDays(Number(event.target.value))
              }
            />
            {sweepError ? (
              <span className="text-xs text-[var(--error)]">{sweepError}</span>
            ) : null}
          </div>

          <div className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
            <input
              id="auto-sweep-enabled"
              type="checkbox"
              checked={autoSweepEnabled}
              onChange={(event) => setAutoSweepEnabled(event.target.checked)}
              aria-describedby="auto-sweep-help"
              className="mt-1 h-4 w-4 rounded border-[var(--border)]"
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor="auto-sweep-enabled">{copy.autoSweepEnabled}</Label>
              <p id="auto-sweep-help" className="text-xs text-[var(--muted)]">{copy.autoSweepHelp}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving || !hasChanges}>
              {saving ? copy.saving : copy.saveSettings}
            </Button>
            {!hasChanges ? (
              <Badge tone="muted">{copy.noPendingChanges}</Badge>
            ) : null}
          </div>
        </form>
        </Section>
      </div>

      <div ref={themeRef}>
        <PasskeyManager
          locale={locale}
          passkeysEnabled={Boolean(status?.features?.passkeys)}
        />
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          <Palette className="h-4 w-4" />
          <span>{copy.themeTitle}</span>
        </div>
        <Section
          title={copy.themeTitle}
          subtitle={copy.themeSubtitle}
          actions={<Badge tone="muted">{copy.optional}</Badge>}
        >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <select
            value={theme}
            onChange={(event) => handleThemeChange(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] md:max-w-xs"
          >
            <option value="light">{copy.light}</option>
            <option value="dark">{copy.dark}</option>
          </select>
          <span className="text-sm text-[var(--muted)]">
            {copy.themeStoredLocally}
          </span>
        </div>
        </Section>
      </div>

      <div ref={dismissedRef}>
        <Section
          title={copy.dismissedTitle}
          subtitle={copy.dismissedSubtitle}
        >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            {copy.dismissedBody}
          </p>
          <Dialog open={dismissOpen} onOpenChange={setDismissOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">{copy.resetDismissed}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{copy.resetDismissedConfirmTitle}</DialogTitle>
                <DialogDescription>
                  {copy.resetDismissedConfirmDesc}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" disabled={dismissing}>
                    {copy.cancel}
                  </Button>
                </DialogClose>
                <Button onClick={handleResetDismissals} disabled={dismissing}>
                  {dismissing ? copy.resetting : copy.confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        </Section>
      </div>

      <div ref={exportRef}>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          <Globe className="h-4 w-4" />
          <span>{locale === "ar" ? "البيانات" : locale === "fr" ? "Données" : "Data"}</span>
        </div>
        <Section
          title={copy.exportTitle}
          subtitle={copy.exportSubtitle}
        >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-[var(--muted)]">
              {copy.exportBody}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => handleExport("json")}
              disabled={exporting}
            >
              {copy.exportJson}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport("csv")}
              disabled={exporting}
            >
              {copy.exportCsv}
            </Button>
          </div>
        </div>
        </Section>
      </div>

      <div ref={logsRef}>
        <Section
          title={copy.logsTitle}
          subtitle={copy.logsSubtitle}
        >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            {copy.logsBody}
          </p>
          <Button asChild variant="secondary">
            <Link href="/logs">{copy.openLogs}</Link>
          </Button>
        </div>
        </Section>
      </div>

      <div ref={dangerRef}>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          <ShieldAlert className="h-4 w-4" />
          <span>{locale === "ar" ? "الأمان" : locale === "fr" ? "Sécurité" : "Security"}</span>
        </div>
        <Section
          title={copy.dangerTitle}
          subtitle={copy.dangerSubtitle}
        >
        <div className="flex flex-wrap gap-3">
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">{copy.resetAccountData}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{copy.resetAccountTitle}</DialogTitle>
                <DialogDescription>
                  {copy.resetAccountDesc}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">
                  {locale === "ar" ? "شنو غادي يتمسح:" : locale === "fr" ? "Ce qui sera supprimé :" : "What will be removed:"}
                </p>
                <p>
                  {locale === "ar"
                    ? "الأظرفة، الأصناف، العمليات، التحويلات، التاريخ المرتبط بالميزانية."
                    : locale === "fr"
                    ? "Enveloppes, catégories, transactions, transferts, et historique budgétaire."
                    : "Envelopes, categories, transactions, transfers, and budget history."}
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Label htmlFor="reset-confirm">{copy.typeResetLabel}</Label>
                <Input
                  id="reset-confirm"
                  value={resetText}
                  onChange={(event) => setResetText(event.target.value)}
                  placeholder="RESET"
                />
                {resetError ? (
                  <p className="text-xs text-[var(--error)]">{resetError}</p>
                ) : null}
              </div>
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button variant="secondary">{copy.cancelEn}</Button>
                </DialogClose>
                <Button
                  variant="danger"
                  onClick={handleResetData}
                  disabled={resetting}
                >
                  {resetting ? copy.resetting : copy.resetData}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="danger">{copy.deleteAccount}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{copy.deleteAccountTitle}</DialogTitle>
                <DialogDescription>
                  {copy.deleteAccountDesc}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                <p className="font-semibold">
                  {locale === "ar" ? "تحذير نهائي" : locale === "fr" ? "Alerte finale" : "Final warning"}
                </p>
                <p>
                  {locale === "ar"
                    ? "هاذ الحذف دائم وممكن يوقف بعض الخدمات المرتبطة بالحساب."
                    : locale === "fr"
                    ? "Cette suppression est définitive et peut impacter les services liés à ton compte."
                    : "This deletion is permanent and can impact services tied to your account."}
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Label htmlFor="delete-confirm">{copy.typeDeleteLabel}</Label>
                <Input
                  id="delete-confirm"
                  value={deleteText}
                  onChange={(event) => setDeleteText(event.target.value)}
                  placeholder="DELETE"
                />
                {deleteError ? (
                  <p className="text-xs text-[var(--error)]">{deleteError}</p>
                ) : null}
                <label className="mt-1 flex items-start gap-2 text-xs text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={deleteAcknowledge}
                    onChange={(event) => setDeleteAcknowledge(event.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    {locale === "ar"
                      ? "كنأكد بلي فاهم أن الحذف نهائي."
                      : locale === "fr"
                      ? "Je confirme comprendre que cette suppression est définitive."
                      : "I confirm I understand this deletion is permanent."}
                  </span>
                </label>
              </div>
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button variant="secondary">{copy.cancelEn}</Button>
                </DialogClose>
                <Button
                  variant="danger"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? copy.deleting : copy.deletePermanently}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        </Section>
      </div>
    </div>
  );
}
