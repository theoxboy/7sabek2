"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { AIGatewayOut, AnnouncementItem, PlatformSettingsOut } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

const EMPTY_SETTINGS: PlatformSettingsOut = {
  platform_name: "7sabek",
  support_email: "ELIDRYSSI@GMAIL.COM",
  registration_enabled: true,
  advisor_tab_enabled: true,
  guided_tours_enabled: true,
  maintenance_mode: false,
  maintenance_message: "Plateforme en maintenance. Réessayez plus tard.",
  announcement_enabled: false,
  announcement_message: "",
  announcement_type: "custom",
  maintenance_placements: [
    "global_sticky",
    "global_popup",
    "global_footer",
    "landing",
    "login",
    "register",
    "app_header",
  ],
  announcement_placements: [
    "global_sticky",
    "global_popup",
    "global_footer",
    "landing",
    "login",
    "register",
    "app_header",
  ],
  announcement_start_at: "",
  announcement_end_at: "",
  announcement_timezone: "UTC",
  announcement_recurrence: "none",
  announcement_roles: ["any"],
  announcement_statuses: ["any"],
  announcement_countries: [],
  announcements: [],
  ai_gateways: [],
  ai_routing: {
    default_gateway_id: "",
    default_model: "",
    fallback_gateway_ids: [],
    request_timeout_ms: 60000,
  },
  advisor_global_instructions: "",
  rate_limit_login_max: 10,
  rate_limit_login_window_minutes: 10,
  rate_limit_register_max: 5,
  rate_limit_register_window_minutes: 60,
  rate_limit_api_max: 120,
  rate_limit_api_window_minutes: 1,
  default_currency: "MAD",
  default_sweep_interval_days: 30,
  password_min_length: 8,
  default_auto_distribution_enabled: false,
  account_deletion_grace_days: 30,
};

const AI_PROVIDER_PRESETS: Array<{
  provider: string;
  protocol: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  notes: string;
}> = [
  {
    provider: "openai",
    protocol: "openai_compatible",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    notes: "API OpenAI officielle (responses/chat completions).",
  },
  {
    provider: "azure_openai",
    protocol: "azure_openai",
    label: "Azure OpenAI",
    baseUrl: "https://YOUR_RESOURCE_NAME.openai.azure.com",
    defaultModel: "gpt-4o-mini",
    notes: "Renseigner deployment/model et api-version dans notes/paths.",
  },
  {
    provider: "anthropic",
    protocol: "native_anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-haiku-20241022",
    notes: "API native Messages d'Anthropic.",
  },
  {
    provider: "gemini",
    protocol: "native_gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.0-flash",
    notes: "API native Gemini; possible proxy OpenAI-compatible selon usage.",
  },
  {
    provider: "openrouter",
    protocol: "openai_compatible",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.0-flash-001",
    notes: "Schéma proche OpenAI, multi-providers.",
  },
  {
    provider: "groq",
    protocol: "openai_compatible",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    notes: "OpenAI-compatible Chat Completions.",
  },
  {
    provider: "mistral",
    protocol: "openai_compatible",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    notes: "Mistral supporte des patterns compatibles OpenAI.",
  },
  {
    provider: "perplexity",
    protocol: "openai_compatible",
    label: "Perplexity Sonar",
    baseUrl: "https://api.perplexity.ai",
    defaultModel: "sonar",
    notes: "Compatibilité OpenAI SDK annoncée.",
  },
  {
    provider: "custom",
    protocol: "custom_http",
    label: "Custom HTTP",
    baseUrl: "https://YOUR_AI_GATEWAY_URL",
    defaultModel: "gpt-4o-mini",
    notes: "Pour tout fournisseur non standard.",
  },
];

const createGatewayId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ai-gateway-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const createAIGatewayFromPreset = (
  preset?: (typeof AI_PROVIDER_PRESETS)[number]
): AIGatewayOut => {
  const p = preset ?? AI_PROVIDER_PRESETS[0];
  return {
    id: createGatewayId(),
    name: p.label,
    provider: p.provider,
    protocol: p.protocol,
    base_url: p.baseUrl,
    api_key: "",
    auth_header: "Authorization",
    auth_scheme: "Bearer",
    model: p.defaultModel || "gpt-4o-mini",
    enabled: true,
    paths: {},
    extra_headers: {},
    notes: p.notes,
  };
};

const ANNOUNCEMENT_TYPES = [
  {
    value: "security",
    label: "Alerte sécurité",
    description: "Incident ou rappel important.",
    tone: "border-red-200/70 bg-gradient-to-br from-red-50 via-[var(--surface)] to-[var(--surface)] text-red-700",
  },
  {
    value: "scheduled_maintenance",
    label: "Maintenance programmée",
    description: "Annoncer une fenêtre de maintenance.",
    tone: "border-amber-200/70 bg-gradient-to-br from-amber-50 via-[var(--surface)] to-[var(--surface)] text-amber-700",
  },
  {
    value: "product",
    label: "Nouveauté produit",
    description: "Release note ou nouvelle fonctionnalité.",
    tone: "border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-[var(--surface)] to-[var(--surface)] text-emerald-700",
  },
  {
    value: "billing",
    label: "Alerte paiement",
    description: "Infos de facturation ou limites.",
    tone: "border-rose-200/70 bg-gradient-to-br from-rose-50 via-[var(--surface)] to-[var(--surface)] text-rose-700",
  },
  {
    value: "marketing",
    label: "Message marketing",
    description: "Promo ou annonce commerciale.",
    tone: "border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-50 via-[var(--surface)] to-[var(--surface)] text-fuchsia-700",
  },
  {
    value: "legal",
    label: "Message légal",
    description: "CGU, RGPD, conditions.",
    tone: "border-slate-200/70 bg-gradient-to-br from-slate-50 via-[var(--surface)] to-[var(--surface)] text-slate-700",
  },
  {
    value: "performance",
    label: "Alerte performance",
    description: "Lenteurs ou incident technique.",
    tone: "border-yellow-200/70 bg-gradient-to-br from-yellow-50 via-[var(--surface)] to-[var(--surface)] text-yellow-800",
  },
  {
    value: "custom",
    label: "Message personnalisé ciblé",
    description: "Message libre avec style neutre.",
    tone: "border-red-200/70 bg-gradient-to-br from-rose-50 via-[var(--surface)] to-[var(--surface)] text-red-700",
  },
] as const;

const PLACEMENT_OPTIONS = [
  {
    value: "global_sticky",
    label: "Bandeau fixe (haut) — landing",
    description: "Visible en haut uniquement sur la page d’accueil.",
  },
  {
    value: "global_footer",
    label: "Bandeau fixe (bas) — landing",
    description: "Visible en bas uniquement sur la page d’accueil.",
  },
  {
    value: "global_popup",
    label: "Popup global",
    description: "Affiché au chargement des pages.",
  },
  {
    value: "landing",
    label: "Landing page",
    description: "Affiché sur la page d’accueil.",
  },
  {
    value: "login",
    label: "Page connexion",
    description: "Affiché sur /login.",
  },
  {
    value: "register",
    label: "Page inscription",
    description: "Affiché sur /register.",
  },
  {
    value: "app_header",
    label: "Header app",
    description: "Affiché dans l’app après connexion.",
  },
] as const;

const TIMEZONE_OPTIONS = [
  "UTC",
  "Africa/Casablanca",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Tokyo",
] as const;

const COUNTRY_OPTIONS = [
  "Afghanistan",
  "Afrique du Sud",
  "Albanie",
  "Algérie",
  "Allemagne",
  "Andorre",
  "Angola",
  "Antigua-et-Barbuda",
  "Arabie saoudite",
  "Argentine",
  "Arménie",
  "Australie",
  "Autriche",
  "Azerbaïdjan",
  "Bahamas",
  "Bahreïn",
  "Bangladesh",
  "Barbade",
  "Belgique",
  "Belize",
  "Bénin",
  "Bhoutan",
  "Biélorussie",
  "Birmanie (Myanmar)",
  "Bolivie",
  "Bosnie-Herzégovine",
  "Botswana",
  "Brésil",
  "Brunei",
  "Bulgarie",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodge",
  "Cameroun",
  "Canada",
  "Chili",
  "Chine",
  "Chypre",
  "Colombie",
  "Comores",
  "Congo (Brazzaville)",
  "Congo (Kinshasa)",
  "Corée du Nord",
  "Corée du Sud",
  "Costa Rica",
  "Côte d’Ivoire",
  "Croatie",
  "Cuba",
  "Danemark",
  "Djibouti",
  "Dominique",
  "Égypte",
  "Émirats arabes unis",
  "Équateur",
  "Érythrée",
  "Espagne",
  "Estonie",
  "Eswatini",
  "États-Unis",
  "Éthiopie",
  "Fidji",
  "Finlande",
  "France",
  "Gabon",
  "Gambie",
  "Géorgie",
  "Ghana",
  "Grèce",
  "Grenade",
  "Guatemala",
  "Guinée",
  "Guinée-Bissau",
  "Guinée équatoriale",
  "Guyana",
  "Haïti",
  "Honduras",
  "Hongrie",
  "Îles Marshall",
  "Îles Salomon",
  "Inde",
  "Indonésie",
  "Irak",
  "Iran",
  "Irlande",
  "Islande",
  "Israël",
  "Italie",
  "Jamaïque",
  "Japon",
  "Jordanie",
  "Kazakhstan",
  "Kenya",
  "Kirghizistan",
  "Kiribati",
  "Koweït",
  "Laos",
  "Lesotho",
  "Lettonie",
  "Liban",
  "Liberia",
  "Libye",
  "Liechtenstein",
  "Lituanie",
  "Luxembourg",
  "Macédoine du Nord",
  "Madagascar",
  "Malawi",
  "Malaisie",
  "Maldives",
  "Mali",
  "Malte",
  "Maroc",
  "Mauritanie",
  "Maurice",
  "Mexique",
  "Micronésie",
  "Moldavie",
  "Monaco",
  "Mongolie",
  "Monténégro",
  "Mozambique",
  "Namibie",
  "Nauru",
  "Népal",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Norvège",
  "Nouvelle-Zélande",
  "Oman",
  "Ouganda",
  "Ouzbékistan",
  "Pakistan",
  "Palaos",
  "Panama",
  "Papouasie-Nouvelle-Guinée",
  "Paraguay",
  "Pays-Bas",
  "Pérou",
  "Philippines",
  "Pologne",
  "Portugal",
  "Qatar",
  "République centrafricaine",
  "République dominicaine",
  "République tchèque",
  "Roumanie",
  "Royaume-Uni",
  "Russie",
  "Rwanda",
  "Saint-Kitts-et-Nevis",
  "Saint-Marin",
  "Saint-Vincent-et-les Grenadines",
  "Sainte-Lucie",
  "Salvador",
  "Samoa",
  "Sao Tomé-et-Principe",
  "Sénégal",
  "Serbie",
  "Seychelles",
  "Sierra Leone",
  "Singapour",
  "Slovaquie",
  "Slovénie",
  "Somalie",
  "Soudan",
  "Soudan du Sud",
  "Sri Lanka",
  "Suède",
  "Suisse",
  "Suriname",
  "Syrie",
  "Tadjikistan",
  "Tanzanie",
  "Tchad",
  "Thaïlande",
  "Timor oriental",
  "Togo",
  "Tonga",
  "Trinité-et-Tobago",
  "Tunisie",
  "Turkménistan",
  "Turquie",
  "Tuvalu",
  "Ukraine",
  "Uruguay",
  "Vanuatu",
  "Vatican (Saint-Siège)",
  "Venezuela",
  "Viêt Nam",
  "Yémen",
  "Zambie",
  "Zimbabwe",
  "Palestine",
] as const;

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Aucune (plage unique)" },
  { value: "daily", label: "Tous les jours" },
  { value: "weekdays", label: "Jours ouvrés (lun-ven)" },
  { value: "weekly", label: "Chaque semaine (jour du début)" },
] as const;

const ROLE_OPTIONS = [
  { value: "any", label: "Tous (any)" },
  { value: "public", label: "Public (non connecté)" },
  { value: "user", label: "Utilisateur" },
  { value: "superadmin", label: "Superadmin" },
] as const;

const STATUS_OPTIONS = [
  { value: "any", label: "Tous (any)" },
  { value: "active", label: "Actif" },
  { value: "limited", label: "Limité" },
  { value: "suspended", label: "Suspendu" },
] as const;

const formatDateTimeInput = (value?: string | null, timeZone = "UTC") => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date).reduce<Record<string, string>>(
    (acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    },
    {}
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const normalizeOptionalDateTime = (value?: string | null): string | null => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const createAnnouncementId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `announcement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const createEmptyAnnouncement = (): AnnouncementItem => ({
  id: createAnnouncementId(),
  label: "Nouvelle annonce",
  enabled: true,
  message: "",
  type: "custom",
  placements: [...EMPTY_SETTINGS.announcement_placements],
  start_at: "",
  end_at: "",
  timezone: "UTC",
  recurrence: "none",
  roles: ["any"],
  statuses: ["any"],
  countries: [],
});

const toAnnouncementForm = (item: AnnouncementItem): AnnouncementItem => {
  const timezone = item.timezone || "UTC";
  return {
    id: item.id || createAnnouncementId(),
    label: item.label?.trim() || "Annonce",
    enabled: item.enabled ?? true,
    message: item.message ?? "",
    type: item.type || "custom",
    placements: item.placements?.length
      ? item.placements
      : [...EMPTY_SETTINGS.announcement_placements],
    start_at: formatDateTimeInput(item.start_at, timezone),
    end_at: formatDateTimeInput(item.end_at, timezone),
    timezone,
    recurrence: item.recurrence || "none",
    roles: item.roles?.length ? item.roles : ["any"],
    statuses: item.statuses?.length ? item.statuses : ["any"],
    countries: item.countries ?? [],
  };
};

const getInitialAnnouncements = (data: PlatformSettingsOut): AnnouncementItem[] => {
  if (data.announcements?.length) {
    return data.announcements.map((item) => toAnnouncementForm(item));
  }
  if (!data.announcement_message?.trim()) {
    return [];
  }
  return [
    toAnnouncementForm({
      id: "legacy-primary",
      label: "Annonce #1",
      enabled: data.announcement_enabled,
      message: data.announcement_message,
      type: data.announcement_type,
      placements:
        data.announcement_placements?.length > 0
          ? data.announcement_placements
          : [...EMPTY_SETTINGS.announcement_placements],
      start_at: data.announcement_start_at,
      end_at: data.announcement_end_at,
      timezone: data.announcement_timezone || "UTC",
      recurrence: data.announcement_recurrence || "none",
      roles: data.announcement_roles?.length ? data.announcement_roles : ["any"],
      statuses:
        data.announcement_statuses?.length ? data.announcement_statuses : ["any"],
      countries: data.announcement_countries ?? [],
    }),
  ];
};

export default function SuperAdminSettingsPage() {
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "superadmin-settings-ar-body");
  const [formState, setFormState] = useState<PlatformSettingsOut>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [announcementCountryFilters, setAnnouncementCountryFilters] = useState<
    Record<string, string>
  >({});
  const [detailsAnnouncementId, setDetailsAnnouncementId] = useState<string | null>(
    null
  );
  const [saveState, setSaveState] = useState({
    loading: false,
    message: "",
    error: "",
  });

  const adminFetch = <T,>(path: string, options?: Parameters<typeof apiFetch>[1]) =>
    apiFetch<T>(path, { ...options, headers: { "x-admin-bypass": "true" } });
  const selectedAnnouncement = useMemo(
    () =>
      (formState.announcements ?? []).find(
        (announcement) => announcement.id === detailsAnnouncementId
      ) ?? null,
    [detailsAnnouncementId, formState.announcements]
  );
  const selectedAnnouncementCountryFilter = selectedAnnouncement
    ? announcementCountryFilters[selectedAnnouncement.id] ?? ""
    : "";
  const selectedAnnouncementCountries = useMemo(() => {
    if (!selectedAnnouncement) return [];
    return COUNTRY_OPTIONS.filter((country) =>
      country
        .toLowerCase()
        .includes(selectedAnnouncementCountryFilter.toLowerCase())
    );
  }, [selectedAnnouncement, selectedAnnouncementCountryFilter]);
  const togglePlacement = (value: string) => {
    setFormState((prev) => {
      const current = new Set(prev.maintenance_placements ?? []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, maintenance_placements: Array.from(current) };
    });
  };

  const updateAnnouncement = (
    id: string,
    updater: (announcement: AnnouncementItem) => AnnouncementItem
  ) => {
    setFormState((prev) => {
      const announcements = (prev.announcements ?? []).map((announcement) =>
        announcement.id === id ? updater(announcement) : announcement
      );
      return { ...prev, announcements };
    });
  };

  const toggleAnnouncementPlacement = (id: string, value: string) => {
    updateAnnouncement(id, (announcement) => {
      const current = new Set(announcement.placements ?? []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...announcement, placements: Array.from(current) };
    });
  };

  const toggleAnnouncementListValue = (
    id: string,
    key: "roles" | "statuses",
    value: string
  ) => {
    updateAnnouncement(id, (announcement) => {
      const current = new Set(announcement[key] ?? []);
      if (value === "any") {
        return { ...announcement, [key]: current.has("any") ? [] : ["any"] };
      }
      current.delete("any");
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...announcement, [key]: Array.from(current) };
    });
  };

  const toggleAnnouncementCountry = (id: string, country: string) => {
    updateAnnouncement(id, (announcement) => {
      const current = new Set(announcement.countries ?? []);
      if (current.has(country)) {
        current.delete(country);
      } else {
        current.add(country);
      }
      return { ...announcement, countries: Array.from(current) };
    });
  };

  const clearAnnouncementCountries = (id: string) => {
    updateAnnouncement(id, (announcement) => ({
      ...announcement,
      countries: [],
    }));
  };

  const addAnnouncement = () => {
    const next = createEmptyAnnouncement();
    setFormState((prev) => ({
      ...prev,
      announcements: [...(prev.announcements ?? []), next],
    }));
    setAnnouncementCountryFilters((prev) => ({ ...prev, [next.id]: "" }));
  };

  const removeAnnouncement = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      announcements: (prev.announcements ?? []).filter(
        (announcement) => announcement.id !== id
      ),
    }));
    setDetailsAnnouncementId((current) => (current === id ? null : current));
    setAnnouncementCountryFilters((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const moveAnnouncement = (id: string, direction: "up" | "down") => {
    setFormState((prev) => {
      const items = [...(prev.announcements ?? [])];
      const index = items.findIndex((announcement) => announcement.id === id);
      if (index < 0) return prev;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= items.length) return prev;
      const [moved] = items.splice(index, 1);
      items.splice(target, 0, moved);
      return { ...prev, announcements: items };
    });
  };

  const addAIGateway = (presetProvider?: string) => {
    const preset = AI_PROVIDER_PRESETS.find((item) => item.provider === presetProvider);
    const next = createAIGatewayFromPreset(preset);
    setFormState((prev) => ({
      ...prev,
      ai_gateways: [...(prev.ai_gateways ?? []), next],
    }));
  };

  const updateAIGateway = (
    id: string,
    updater: (gateway: AIGatewayOut) => AIGatewayOut
  ) => {
    setFormState((prev) => ({
      ...prev,
      ai_gateways: (prev.ai_gateways ?? []).map((gateway) =>
        gateway.id === id ? updater(gateway) : gateway
      ),
    }));
  };

  const removeAIGateway = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      ai_gateways: (prev.ai_gateways ?? []).filter((gateway) => gateway.id !== id),
      ai_routing: {
        ...(prev.ai_routing ?? EMPTY_SETTINGS.ai_routing),
        default_gateway_id:
          prev.ai_routing?.default_gateway_id === id ? "" : prev.ai_routing?.default_gateway_id ?? "",
        fallback_gateway_ids: (prev.ai_routing?.fallback_gateway_ids ?? []).filter(
          (gatewayId) => gatewayId !== id
        ),
      },
    }));
  };

  useEffect(() => {
    let active = true;
    adminFetch<PlatformSettingsOut>("/admin/settings")
      .then((data) => {
        if (!active) return;
        const tz = data.announcement_timezone || EMPTY_SETTINGS.announcement_timezone;
        const announcements = getInitialAnnouncements(data);
        setFormState({
          ...EMPTY_SETTINGS,
          ...data,
          maintenance_placements:
            data.maintenance_placements?.length > 0
              ? data.maintenance_placements
              : EMPTY_SETTINGS.maintenance_placements,
          announcement_placements:
            data.announcement_placements?.length > 0
              ? data.announcement_placements
              : EMPTY_SETTINGS.announcement_placements,
          announcement_start_at: formatDateTimeInput(
            data.announcement_start_at,
            tz
          ),
          announcement_end_at: formatDateTimeInput(
            data.announcement_end_at,
            tz
          ),
          announcement_timezone: tz,
          announcement_recurrence:
            data.announcement_recurrence || EMPTY_SETTINGS.announcement_recurrence,
          announcement_roles:
            data.announcement_roles?.length > 0
              ? data.announcement_roles
              : EMPTY_SETTINGS.announcement_roles,
          announcement_statuses:
            data.announcement_statuses?.length > 0
              ? data.announcement_statuses
              : EMPTY_SETTINGS.announcement_statuses,
          announcement_countries: data.announcement_countries ?? [],
          announcements,
          ai_gateways: Array.isArray(data.ai_gateways) ? data.ai_gateways : [],
          ai_routing: data.ai_routing ?? EMPTY_SETTINGS.ai_routing,
          advisor_global_instructions:
            data.advisor_global_instructions ?? EMPTY_SETTINGS.advisor_global_instructions,
        });
        const nextFilters: Record<string, string> = {};
        announcements.forEach((announcement) => {
          nextFilters[announcement.id] = "";
        });
        setAnnouncementCountryFilters(nextFilters);
      })
      .catch(() => {
        if (!active) return;
        setFormState(EMPTY_SETTINGS);
        setAnnouncementCountryFilters({});
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaveState({ loading: true, message: "", error: "" });
    try {
      const normalizedAnnouncements = (formState.announcements ?? [])
        .map((announcement) => ({
          ...announcement,
          id: announcement.id || createAnnouncementId(),
          label: (announcement.label || "").trim() || "Annonce",
          message: announcement.message.trim(),
          type: announcement.type || "custom",
          placements:
            announcement.placements?.length > 0
              ? announcement.placements
              : [...EMPTY_SETTINGS.announcement_placements],
          start_at: announcement.start_at || null,
          end_at: announcement.end_at || null,
          timezone: announcement.timezone || "UTC",
          recurrence: announcement.recurrence || "none",
          roles:
            announcement.roles?.length > 0 ? announcement.roles : ["any"],
          statuses:
            announcement.statuses?.length > 0 ? announcement.statuses : ["any"],
          countries: announcement.countries ?? [],
        }));

      const invalidAnnouncement = normalizedAnnouncements.find(
        (announcement) =>
          announcement.enabled &&
          (!announcement.message || announcement.message.trim().length === 0)
      );
      if (invalidAnnouncement) {
        setSaveState({
          loading: false,
          message: "",
          error:
            `L'annonce \"${invalidAnnouncement.label}\" est active mais son message est vide. ` +
            "Ajoute un message ou désactive cette annonce.",
        });
        return;
      }

      const placementIssue = normalizedAnnouncements.find(
        (announcement) =>
          announcement.enabled &&
          (!announcement.placements || announcement.placements.length === 0)
      );
      if (placementIssue) {
        setSaveState({
          loading: false,
          message: "",
          error:
            `L'annonce \"${placementIssue.label}\" n'a aucun emplacement. ` +
            "Sélectionne au moins un emplacement.",
        });
        return;
      }

      const announcements = normalizedAnnouncements.filter(
        (announcement) => announcement.message.length > 0
      );

      const primaryAnnouncement = announcements[0];
      const payload = {
        platform_name: formState.platform_name.trim(),
        support_email: formState.support_email.trim(),
        registration_enabled: formState.registration_enabled,
        advisor_tab_enabled: formState.advisor_tab_enabled,
        guided_tours_enabled: formState.guided_tours_enabled,
        maintenance_mode: formState.maintenance_mode,
        maintenance_message: formState.maintenance_message.trim(),
        announcement_enabled: formState.announcement_enabled,
        announcement_message: primaryAnnouncement?.message ?? "",
        announcement_type: primaryAnnouncement?.type ?? "custom",
        maintenance_placements: formState.maintenance_placements,
        announcement_placements:
          primaryAnnouncement?.placements ?? formState.announcement_placements,
        announcement_start_at:
          normalizeOptionalDateTime(
            primaryAnnouncement?.start_at ?? formState.announcement_start_at ?? null
          ),
        announcement_end_at:
          normalizeOptionalDateTime(
            primaryAnnouncement?.end_at ?? formState.announcement_end_at ?? null
          ),
        announcement_timezone:
          primaryAnnouncement?.timezone ?? formState.announcement_timezone,
        announcement_recurrence:
          primaryAnnouncement?.recurrence ?? formState.announcement_recurrence,
        announcement_roles:
          primaryAnnouncement?.roles ?? formState.announcement_roles,
        announcement_statuses:
          primaryAnnouncement?.statuses ?? formState.announcement_statuses,
        announcement_countries:
          primaryAnnouncement?.countries ?? formState.announcement_countries,
        announcements,
        ai_gateways: formState.ai_gateways ?? [],
        ai_routing: formState.ai_routing ?? EMPTY_SETTINGS.ai_routing,
        advisor_global_instructions: formState.advisor_global_instructions ?? "",
        rate_limit_login_max: Number(formState.rate_limit_login_max),
        rate_limit_login_window_minutes: Number(
          formState.rate_limit_login_window_minutes
        ),
        rate_limit_register_max: Number(formState.rate_limit_register_max),
        rate_limit_register_window_minutes: Number(
          formState.rate_limit_register_window_minutes
        ),
        rate_limit_api_max: Number(formState.rate_limit_api_max),
        rate_limit_api_window_minutes: Number(
          formState.rate_limit_api_window_minutes
        ),
        default_currency: formState.default_currency.trim().toUpperCase(),
        default_sweep_interval_days: Number(formState.default_sweep_interval_days),
        password_min_length: Number(formState.password_min_length),
        default_auto_distribution_enabled: formState.default_auto_distribution_enabled,
        account_deletion_grace_days: Number(formState.account_deletion_grace_days),
      };
      const updated = await adminFetch<PlatformSettingsOut>("/admin/settings", {
        method: "PATCH",
        body: payload,
      });
      const tz = updated.announcement_timezone || EMPTY_SETTINGS.announcement_timezone;
      const updatedAnnouncements = getInitialAnnouncements(updated);
      setFormState({
        ...EMPTY_SETTINGS,
        ...updated,
        maintenance_placements:
          updated.maintenance_placements?.length > 0
            ? updated.maintenance_placements
            : EMPTY_SETTINGS.maintenance_placements,
        announcement_placements:
          updated.announcement_placements?.length > 0
            ? updated.announcement_placements
            : EMPTY_SETTINGS.announcement_placements,
        announcement_start_at: formatDateTimeInput(
          updated.announcement_start_at,
          tz
        ),
        announcement_end_at: formatDateTimeInput(
          updated.announcement_end_at,
          tz
        ),
        announcement_timezone: tz,
        announcement_recurrence:
          updated.announcement_recurrence || EMPTY_SETTINGS.announcement_recurrence,
        announcement_roles:
          updated.announcement_roles?.length > 0
            ? updated.announcement_roles
            : EMPTY_SETTINGS.announcement_roles,
        announcement_statuses:
          updated.announcement_statuses?.length > 0
            ? updated.announcement_statuses
            : EMPTY_SETTINGS.announcement_statuses,
        announcement_countries: updated.announcement_countries ?? [],
        announcements: updatedAnnouncements,
        ai_gateways: Array.isArray(updated.ai_gateways) ? updated.ai_gateways : [],
        ai_routing: updated.ai_routing ?? EMPTY_SETTINGS.ai_routing,
        advisor_global_instructions:
          updated.advisor_global_instructions ?? EMPTY_SETTINGS.advisor_global_instructions,
      });
      const nextFilters: Record<string, string> = {};
      updatedAnnouncements.forEach((announcement) => {
        nextFilters[announcement.id] = announcementCountryFilters[announcement.id] ?? "";
      });
      setAnnouncementCountryFilters(nextFilters);
      setSaveState({ loading: false, message: "Paramètres enregistrés.", error: "" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setSaveState({ loading: false, message: "", error: message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface)] px-6 py-10 text-sm text-[var(--muted)]">
        Chargement…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-12 pt-8 text-[var(--ink)]" dir={dir}>
      <style jsx>{`
        .spike-card {
          border-radius: 18px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: #fff;
          box-shadow: 0 12px 30px -24px rgba(0, 0, 0, 0.45);
        }
        .spike-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        .spike-subtitle {
          font-size: 12px;
          color: #9ca3af;
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900">Paramètres</h1>
          <p className="text-sm text-gray-500">
            Contrôle global de la plateforme et des règles de sécurité.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveState.loading}
            className="bg-emerald-500 text-white hover:bg-emerald-600"
          >
            Enregistrer
          </Button>
          {saveState.message ? (
            <span className="text-xs text-emerald-600">{saveState.message}</span>
          ) : null}
          {saveState.error ? (
            <span className="text-xs text-red-500">{saveState.error}</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <Card className="spike-card p-6">
          <div className="space-y-4">
            <div>
              <p className="spike-title">Identité & support</p>
              <p className="spike-subtitle">
                Ces informations apparaissent dans les messages systèmes.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nom de la plateforme</Label>
                <Input
                  value={formState.platform_name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      platform_name: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Email support</Label>
                <Input
                  type="email"
                  value={formState.support_email}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      support_email: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="spike-card p-6">
          <div className="space-y-4">
            <div>
              <p className="spike-title">Statut de la plateforme</p>
              <p className="spike-subtitle">
                Active les inscriptions ou place la plateforme en maintenance.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Inscriptions ouvertes
                  </p>
                  <p className="text-xs text-gray-500">
                    Autorise les nouveaux comptes à s’inscrire.
                  </p>
                </div>
                <Switch
                  checked={formState.registration_enabled}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      registration_enabled: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Onglet Advisor visible
                  </p>
                  <p className="text-xs text-gray-500">
                    Affiche ou masque l’onglet Advisor pour les utilisateurs.
                  </p>
                </div>
                <Switch
                  checked={formState.advisor_tab_enabled}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      advisor_tab_enabled: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Tours guidés activés
                  </p>
                  <p className="text-xs text-gray-500">
                    Désactive tous les tours guidés pour tous les utilisateurs.
                  </p>
                </div>
                <Switch
                  checked={formState.guided_tours_enabled}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      guided_tours_enabled: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Mode maintenance
                  </p>
                  <p className="text-xs text-gray-500">
                    Bloque les connexions (hors superadmin).
                  </p>
                </div>
                <Switch
                  checked={formState.maintenance_mode}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      maintenance_mode: checked,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 rounded-2xl border border-gray-100 px-3 py-2">
                <Label>Message de maintenance</Label>
                <p className="text-xs text-gray-500">
                  Message affiché aux utilisateurs bloqués pendant la maintenance.
                </p>
                <Textarea
                  value={formState.maintenance_message}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      maintenance_message: event.target.value,
                    }))
                  }
                  placeholder="Plateforme en maintenance. Réessayez plus tard."
                  rows={4}
                />
              </div>
              <div className="space-y-3 rounded-2xl border border-gray-100 px-3 py-2">
                <Label>Emplacements maintenance</Label>
                <p className="text-xs text-gray-500">
                  Où afficher le message de maintenance.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PLACEMENT_OPTIONS.map((option) => (
                    <label
                      key={`maintenance-${option.value}`}
                      className="flex items-start gap-2 text-xs text-gray-600"
                    >
                      <Checkbox
                        checked={formState.maintenance_placements.includes(
                          option.value
                        )}
                        onCheckedChange={() => togglePlacement(option.value)}
                      />
                      <span>
                        <span className="block font-medium text-gray-900">
                          {option.label}
                        </span>
                        <span className="block text-gray-500">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Système d’annonces
                  </p>
                  <p className="text-xs text-gray-500">
                    Visible même hors maintenance, activable globalement.
                  </p>
                </div>
                <Switch
                  checked={formState.announcement_enabled}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      announcement_enabled: checked,
                    }))
                  }
                />
              </div>
              <div className="space-y-3 rounded-2xl border border-gray-100 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Label>Annonces multiples</Label>
                    <p className="text-xs text-gray-500">
                      Crée plusieurs annonces et active/désactive chaque message.
                    </p>
                  </div>
                  <Button type="button" variant="secondary" onClick={addAnnouncement}>
                    Ajouter une annonce
                  </Button>
                </div>
                {(formState.announcements ?? []).length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-gray-200 px-3 py-4 text-xs text-gray-500">
                    Aucune annonce configurée. Clique sur Ajouter une annonce.
                  </p>
                ) : null}
                <div className="space-y-3">
                  {(formState.announcements ?? []).map((announcement, index) => {
                    const announcementType = ANNOUNCEMENT_TYPES.find(
                      (option) => option.value === announcement.type
                    );
                    return (
                      <div
                        key={announcement.id}
                        className="rounded-2xl border border-gray-200 bg-gray-50/40 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {announcement.label?.trim() || `Annonce #${index + 1}`}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Annonce #{index + 1} · ID: {announcement.id}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {announcementType?.label ?? "Message personnalisé"} ·{" "}
                              {announcement.enabled ? "Active" : "Inactive"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setDetailsAnnouncementId(announcement.id)}
                            >
                              Détails
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => moveAnnouncement(announcement.id, "up")}
                              disabled={index === 0}
                            >
                              Monter
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => moveAnnouncement(announcement.id, "down")}
                              disabled={index === (formState.announcements ?? []).length - 1}
                            >
                              Descendre
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => removeAnnouncement(announcement.id)}
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr,0.8fr]">
                          <div>
                            <Label>Label</Label>
                            <Input
                              value={announcement.label}
                              onChange={(event) =>
                                updateAnnouncement(announcement.id, (current) => ({
                                  ...current,
                                  label: event.target.value,
                                }))
                              }
                              placeholder={`Annonce #${index + 1}`}
                            />
                          </div>
                          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-[var(--surface)] px-2 py-1">
                            <span className="text-xs text-gray-500">Active</span>
                            <Switch
                              checked={announcement.enabled}
                              onCheckedChange={(checked) =>
                                updateAnnouncement(announcement.id, (current) => ({
                                  ...current,
                                  enabled: checked,
                                }))
                              }
                            />
                          </div>
                        </div>
                        {announcement.message?.trim() ? (
                          <p className="mt-2 text-xs text-gray-600">
                            {announcement.message.length > 120
                              ? `${announcement.message.slice(0, 120)}...`
                              : announcement.message}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-gray-400">
                            Aucun message pour cette annonce.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Dialog
                  open={Boolean(selectedAnnouncement)}
                  onOpenChange={(open) => {
                    if (!open) setDetailsAnnouncementId(null);
                  }}
                >
                  <DialogContent className="max-w-4xl">
                    {selectedAnnouncement ? (
                      <>
                        <DialogHeader>
                          <DialogTitle>
                            {selectedAnnouncement.label?.trim() || "Annonce"}
                          </DialogTitle>
                          <DialogDescription>
                            ID: {selectedAnnouncement.id}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 px-3 py-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                const items = formState.announcements ?? [];
                                const index = items.findIndex(
                                  (item) => item.id === selectedAnnouncement.id
                                );
                                moveAnnouncement(selectedAnnouncement.id, "up");
                                if (index > 0) {
                                  setDetailsAnnouncementId(items[index - 1].id);
                                }
                              }}
                            >
                              Monter
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                const items = formState.announcements ?? [];
                                const index = items.findIndex(
                                  (item) => item.id === selectedAnnouncement.id
                                );
                                moveAnnouncement(selectedAnnouncement.id, "down");
                                if (index >= 0 && index < items.length - 1) {
                                  setDetailsAnnouncementId(items[index + 1].id);
                                }
                              }}
                            >
                              Descendre
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => removeAnnouncement(selectedAnnouncement.id)}
                            >
                              Supprimer
                            </Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label>Label</Label>
                              <Input
                                value={selectedAnnouncement.label}
                                onChange={(event) =>
                                  updateAnnouncement(
                                    selectedAnnouncement.id,
                                    (current) => ({
                                      ...current,
                                      label: event.target.value,
                                    })
                                  )
                                }
                              />
                            </div>
                            <div className="flex items-center gap-2 rounded-2xl border border-gray-100 px-3 py-2">
                              <span className="text-xs text-gray-500">Active</span>
                              <Switch
                                checked={selectedAnnouncement.enabled}
                                onCheckedChange={(checked) =>
                                  updateAnnouncement(
                                    selectedAnnouncement.id,
                                    (current) => ({
                                      ...current,
                                      enabled: checked,
                                    })
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2 rounded-2xl border border-gray-100 px-3 py-2">
                            <Label>Type d’annonce</Label>
                            <Select
                              value={selectedAnnouncement.type}
                              onValueChange={(value) =>
                                updateAnnouncement(
                                  selectedAnnouncement.id,
                                  (current) => ({
                                    ...current,
                                    type: value,
                                  })
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choisir un type" />
                              </SelectTrigger>
                              <SelectContent>
                                {ANNOUNCEMENT_TYPES.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">
                              {ANNOUNCEMENT_TYPES.find(
                                (option) => option.value === selectedAnnouncement.type
                              )?.description ?? "Sélectionne un type d’annonce."}
                            </p>
                          </div>

                          <div className="space-y-2 rounded-2xl border border-gray-100 px-3 py-2">
                            <Label>Message d’annonce</Label>
                            <Textarea
                              value={selectedAnnouncement.message}
                              onChange={(event) =>
                                updateAnnouncement(
                                  selectedAnnouncement.id,
                                  (current) => ({
                                    ...current,
                                    message: event.target.value,
                                  })
                                )
                              }
                              placeholder="Ex: Mise à jour en cours ce soir à 22h."
                              rows={4}
                            />
                            {selectedAnnouncement.enabled &&
                            selectedAnnouncement.message ? (
                              <div
                                className={`rounded-2xl border px-4 py-3 text-xs ${ANNOUNCEMENT_TYPES.find(
                                  (option) =>
                                    option.value === selectedAnnouncement.type
                                )?.tone ?? "border-red-200/70 bg-red-50 text-red-700"}`}
                              >
                                Aperçu: {selectedAnnouncement.message}
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-3 rounded-2xl border border-gray-100 px-3 py-2">
                            <Label>Emplacements annonce</Label>
                            <p className="text-xs text-gray-500">
                              Où afficher cette annonce.
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {PLACEMENT_OPTIONS.map((option) => (
                                <label
                                  key={`${selectedAnnouncement.id}-${option.value}`}
                                  className="flex items-start gap-2 text-xs text-gray-600"
                                >
                                  <Checkbox
                                    checked={selectedAnnouncement.placements.includes(
                                      option.value
                                    )}
                                    onCheckedChange={() =>
                                      toggleAnnouncementPlacement(
                                        selectedAnnouncement.id,
                                        option.value
                                      )
                                    }
                                  />
                                  <span>
                                    <span className="block font-medium text-gray-900">
                                      {option.label}
                                    </span>
                                    <span className="block text-gray-500">
                                      {option.description}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3 rounded-2xl border border-gray-100 px-3 py-2">
                            <Label>Programmation</Label>
                            <p className="text-xs text-gray-500">
                              Les dates suivent le fuseau horaire choisi.
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <Label>Début</Label>
                                <Input
                                  type="datetime-local"
                                  value={selectedAnnouncement.start_at || ""}
                                  onChange={(event) =>
                                    updateAnnouncement(
                                      selectedAnnouncement.id,
                                      (current) => ({
                                        ...current,
                                        start_at: event.target.value,
                                      })
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <Label>Fin</Label>
                                <Input
                                  type="datetime-local"
                                  value={selectedAnnouncement.end_at || ""}
                                  onChange={(event) =>
                                    updateAnnouncement(
                                      selectedAnnouncement.id,
                                      (current) => ({
                                        ...current,
                                        end_at: event.target.value,
                                      })
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <Label>Fuseau horaire</Label>
                                <Select
                                  value={selectedAnnouncement.timezone}
                                  onValueChange={(value) =>
                                    updateAnnouncement(
                                      selectedAnnouncement.id,
                                      (current) => ({
                                        ...current,
                                        timezone: value,
                                      })
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Choisir un fuseau horaire" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIMEZONE_OPTIONS.map((value) => (
                                      <SelectItem key={value} value={value}>
                                        {value}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Récurrence</Label>
                                <Select
                                  value={selectedAnnouncement.recurrence}
                                  onValueChange={(value) =>
                                    updateAnnouncement(
                                      selectedAnnouncement.id,
                                      (current) => ({
                                        ...current,
                                        recurrence: value,
                                      })
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Choisir une récurrence" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {RECURRENCE_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 rounded-2xl border border-gray-100 px-3 py-2">
                            <Label>Ciblage de l’annonce</Label>
                            <p className="text-xs text-gray-500">
                              Si any est coché, les autres choix sont ignorés.
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-900">Rôles</p>
                                <div className="grid gap-2">
                                  {ROLE_OPTIONS.map((option) => (
                                    <label
                                      key={`${selectedAnnouncement.id}-role-${option.value}`}
                                      className="flex items-center gap-2 text-xs text-gray-600"
                                    >
                                      <Checkbox
                                        checked={selectedAnnouncement.roles.includes(
                                          option.value
                                        )}
                                        onCheckedChange={() =>
                                          toggleAnnouncementListValue(
                                            selectedAnnouncement.id,
                                            "roles",
                                            option.value
                                          )
                                        }
                                      />
                                      <span className="text-gray-700">{option.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-900">Statuts</p>
                                <div className="grid gap-2">
                                  {STATUS_OPTIONS.map((option) => (
                                    <label
                                      key={`${selectedAnnouncement.id}-status-${option.value}`}
                                      className="flex items-center gap-2 text-xs text-gray-600"
                                    >
                                      <Checkbox
                                        checked={selectedAnnouncement.statuses.includes(
                                          option.value
                                        )}
                                        onCheckedChange={() =>
                                          toggleAnnouncementListValue(
                                            selectedAnnouncement.id,
                                            "statuses",
                                            option.value
                                          )
                                        }
                                      />
                                      <span className="text-gray-700">{option.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label>Pays (optionnel)</Label>
                              <p className="text-xs text-gray-500">
                                Sélection multiple. Laisse vide pour tous les pays.
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Input
                                  value={selectedAnnouncementCountryFilter}
                                  onChange={(event) =>
                                    setAnnouncementCountryFilters((prev) => ({
                                      ...prev,
                                      [selectedAnnouncement.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Rechercher un pays…"
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    clearAnnouncementCountries(selectedAnnouncement.id)
                                  }
                                >
                                  Tout effacer
                                </Button>
                              </div>
                              <div className="mt-3 max-h-56 overflow-auto rounded-2xl border border-gray-100 p-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {selectedAnnouncementCountries.map((country) => (
                                    <label
                                      key={`${selectedAnnouncement.id}-${country}`}
                                      className="flex items-center gap-2 text-xs text-gray-600"
                                    >
                                      <Checkbox
                                        checked={selectedAnnouncement.countries.includes(
                                          country
                                        )}
                                        onCheckedChange={() =>
                                          toggleAnnouncementCountry(
                                            selectedAnnouncement.id,
                                            country
                                          )
                                        }
                                      />
                                      <span className="text-gray-700">{country}</span>
                                    </label>
                                  ))}
                                  {selectedAnnouncementCountries.length === 0 ? (
                                    <span className="text-xs text-gray-400">
                                      Aucun résultat.
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              {selectedAnnouncement.countries.length > 0 ? (
                                <p className="mt-2 text-xs text-gray-500">
                                  {selectedAnnouncement.countries.length} pays sélectionnés.
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <Card className="spike-card p-6">
          <div className="space-y-4">
            <div>
              <p className="spike-title">Sécurité</p>
              <p className="spike-subtitle">
                Règles globales appliquées aux mots de passe.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Longueur minimum</Label>
                <Input
                  type="number"
                  min={6}
                  max={128}
                  value={formState.password_min_length}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      password_min_length: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>
              <div>
                <Label>Période de grâce suppression (jours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={formState.account_deletion_grace_days}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      account_deletion_grace_days: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Auto-répartition activée par défaut
                  </p>
                  <p className="text-xs text-gray-500">
                    Active automatiquement la distribution des revenus pour les nouveaux comptes.
                  </p>
                </div>
                <Switch
                  checked={formState.default_auto_distribution_enabled}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      default_auto_distribution_enabled: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="spike-card p-6">
          <div className="space-y-4">
            <div>
              <p className="spike-title">Valeurs par défaut</p>
              <p className="spike-subtitle">
                Utilisées lors de la création de nouveaux comptes.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Devise par défaut</Label>
                <Input
                  value={formState.default_currency}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      default_currency: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
              <div>
                <Label>Sweep par défaut (jours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={formState.default_sweep_interval_days}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      default_sweep_interval_days: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="spike-card p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="spike-title">AI Gateway Hub</p>
              <p className="spike-subtitle">
                Connecte plusieurs APIs IA (OpenAI-compatible, Anthropic natif, Gemini natif, Azure, Custom).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select onValueChange={(value) => addAIGateway(value)}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Ajouter depuis preset provider" />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDER_PRESETS.map((preset) => (
                    <SelectItem key={preset.provider} value={preset.provider}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="secondary" onClick={() => addAIGateway()}>
                Ajouter custom
              </Button>
            </div>
          </div>

          {(formState.ai_gateways ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-3 py-4 text-xs text-gray-500">
              Aucun gateway IA configuré. Ajoute un provider pour activer le routage IA multi-vendeurs.
            </p>
          ) : (
            <div className="space-y-3">
              {(formState.ai_gateways ?? []).map((gateway, index) => (
                <div key={gateway.id} className="rounded-2xl border border-gray-200 bg-gray-50/40 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {gateway.name || `Gateway #${index + 1}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Enabled</span>
                      <Switch
                        checked={gateway.enabled}
                        onCheckedChange={(checked) =>
                          updateAIGateway(gateway.id, (current) => ({
                            ...current,
                            enabled: checked,
                          }))
                        }
                      />
                      <Button type="button" variant="secondary" onClick={() => removeAIGateway(gateway.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <Label>Nom</Label>
                      <Input
                        value={gateway.name}
                        onChange={(event) =>
                          updateAIGateway(gateway.id, (current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Provider</Label>
                      <Input
                        value={gateway.provider}
                        onChange={(event) =>
                          updateAIGateway(gateway.id, (current) => ({
                            ...current,
                            provider: event.target.value,
                          }))
                        }
                        placeholder="openai | anthropic | gemini | custom..."
                      />
                    </div>
                    <div>
                      <Label>Protocol</Label>
                      <Select
                        value={gateway.protocol || "openai_compatible"}
                        onValueChange={(value) =>
                          updateAIGateway(gateway.id, (current) => ({
                            ...current,
                            protocol: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Protocol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai_compatible">openai_compatible</SelectItem>
                          <SelectItem value="azure_openai">azure_openai</SelectItem>
                          <SelectItem value="native_anthropic">native_anthropic</SelectItem>
                          <SelectItem value="native_gemini">native_gemini</SelectItem>
                          <SelectItem value="custom_http">custom_http</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Model (default)</Label>
                      <Input
                        value={gateway.model}
                        onChange={(event) =>
                          updateAIGateway(gateway.id, (current) => ({
                            ...current,
                            model: event.target.value,
                          }))
                        }
                        placeholder="gpt-4.1-mini / claude-3-5-sonnet / gemini-2.0-flash..."
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <Label>Base URL</Label>
                      <Input
                        value={gateway.base_url}
                        onChange={(event) =>
                          updateAIGateway(gateway.id, (current) => ({
                            ...current,
                            base_url: event.target.value,
                          }))
                        }
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                    <div>
                      <Label>Auth Header</Label>
                      <Input
                        value={gateway.auth_header}
                        onChange={(event) =>
                          updateAIGateway(gateway.id, (current) => ({
                            ...current,
                            auth_header: event.target.value,
                          }))
                        }
                        placeholder="Authorization"
                      />
                    </div>
                    <div>
                      <Label>Auth Scheme</Label>
                      <Input
                        value={gateway.auth_scheme}
                        onChange={(event) =>
                          updateAIGateway(gateway.id, (current) => ({
                            ...current,
                            auth_scheme: event.target.value,
                          }))
                        }
                        placeholder="Bearer"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={gateway.api_key}
                        onChange={(event) =>
                          updateAIGateway(gateway.id, (current) => ({
                            ...current,
                            api_key: event.target.value,
                          }))
                        }
                        placeholder="sk-..."
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <Label>Notes</Label>
                      <Textarea
                        rows={2}
                        value={gateway.notes}
                        onChange={(event) =>
                          updateAIGateway(gateway.id, (current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Info mapping endpoint, deployment name, API version, etc."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 rounded-2xl border border-gray-100 px-3 py-3 lg:grid-cols-3">
            <div>
              <Label>Gateway par défaut</Label>
              <Select
                value={formState.ai_routing?.default_gateway_id || ""}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    ai_routing: {
                      ...(prev.ai_routing ?? EMPTY_SETTINGS.ai_routing),
                      default_gateway_id: value,
                    },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir gateway" />
                </SelectTrigger>
                <SelectContent>
                  {(formState.ai_gateways ?? []).map((gateway) => (
                    <SelectItem key={gateway.id} value={gateway.id}>
                      {gateway.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Model par défaut (router)</Label>
              <Input
                value={formState.ai_routing?.default_model || ""}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    ai_routing: {
                      ...(prev.ai_routing ?? EMPTY_SETTINGS.ai_routing),
                      default_model: event.target.value,
                    },
                  }))
                }
              />
            </div>
            <div>
              <Label>Timeout (ms)</Label>
              <Input
                type="number"
                min={1000}
                max={600000}
                value={formState.ai_routing?.request_timeout_ms ?? 60000}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    ai_routing: {
                      ...(prev.ai_routing ?? EMPTY_SETTINGS.ai_routing),
                      request_timeout_ms: Number(event.target.value || 60000),
                    },
                  }))
                }
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Global AI Advisor Instructions */}
      <Card className="spike-card p-6">
        <div className="space-y-4">
          <div>
            <p className="spike-title">Instructions globales Advisor IA</p>
            <p className="spike-subtitle">
              Ces instructions s&rsquo;appliquent &agrave; tous les utilisateurs du chat 7sabek AI.
              Le superadmin peut d&eacute;finir un comportement, un ton ou des r&egrave;gles suppl&eacute;mentaires.
            </p>
          </div>
          <div>
            <textarea
              rows={6}
              className="xs:spike-input w-full resize-y text-sm leading-relaxed"
              placeholder="Ex: &laquo; Ne donne jamais de conseil juridique. R&eacute;ponds toujours en fran&ccedil;ais. &raquo;"
              value={formState.advisor_global_instructions ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  advisor_global_instructions: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </Card>

      <Card className="spike-card p-6">
        <div className="space-y-4">
          <div>
            <p className="spike-title">Limites anti-abus</p>
            <p className="spike-subtitle">
              Limite les tentatives par IP. Mets 0 pour désactiver.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 rounded-2xl border border-gray-100 px-3 py-3">
              <p className="text-sm font-semibold text-gray-900">Login</p>
              <div className="grid gap-3">
                <div>
                  <Label>Max tentatives</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={formState.rate_limit_login_max}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        rate_limit_login_max: Number(event.target.value || 0),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Fenêtre (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={formState.rate_limit_login_window_minutes}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        rate_limit_login_window_minutes: Number(
                          event.target.value || 0
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-gray-100 px-3 py-3">
              <p className="text-sm font-semibold text-gray-900">Inscription</p>
              <div className="grid gap-3">
                <div>
                  <Label>Max tentatives</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={formState.rate_limit_register_max}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        rate_limit_register_max: Number(event.target.value || 0),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Fenêtre (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={formState.rate_limit_register_window_minutes}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        rate_limit_register_window_minutes: Number(
                          event.target.value || 0
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-gray-100 px-3 py-3">
              <p className="text-sm font-semibold text-gray-900">API</p>
              <div className="grid gap-3">
                <div>
                  <Label>Max requêtes</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100000}
                    value={formState.rate_limit_api_max}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        rate_limit_api_max: Number(event.target.value || 0),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Fenêtre (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={formState.rate_limit_api_window_minutes}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        rate_limit_api_window_minutes: Number(
                          event.target.value || 0
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="spike-card p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-xs text-gray-500">Inscriptions</p>
            <p className="text-lg font-semibold text-gray-900">
              {formState.registration_enabled ? "Ouvertes" : "Fermées"}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
            <p className="text-xs text-gray-500">Maintenance</p>
            <p className="text-lg font-semibold text-gray-900">
              {formState.maintenance_mode ? "Active" : "Inactive"}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
            <p className="text-xs text-gray-500">Mot de passe min.</p>
            <p className="text-lg font-semibold text-gray-900">
              {formState.password_min_length} caractères
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
