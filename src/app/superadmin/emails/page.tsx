"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Activity,
  Blocks,
  Brush,
  Clock3,
  FileText,
  Gauge,
  Megaphone,
  Send,
  Settings2,
  UserRound,
  Users,
} from "lucide-react";

import { API_BASE, apiFetch } from "@/lib/api";
import { SafeHtmlFrame } from "@/components/ui/SafeHtmlFrame";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type {
  EmailCampaignCreateRequest,
  EmailCampaignListOut,
  EmailCampaignOut,
  EmailCenterAISuggestRequest,
  EmailCenterAISuggestResponse,
  EmailCenterAudienceType,
  EmailCenterPreviewUserEmailResponse,
  EmailCenterRecipientsPreviewResponse,
  EmailCenterStatusOut,
  EmailCenterSystemStatusOut,
  EmailTemplateListOut,
  EmailTemplateOut,
  EmailCenterUserPreviewOut,
  EmailCenterUserSearchListOut,
  EmailCenterUserSearchOut,
  EmailDeliveryHistoryOut,
  EmailDesignSettingsOut,
  EmailSendPayload,
  EmailSuppressionListOut,
  DeliveryQueueStatusOut,
  RegistrationLeadListOut,
  RegistrationLeadStatsOut,
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/Drawer";
import { InfoHint } from "@/components/ui/InfoHint";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

const DEFAULT_DESIGN: EmailDesignSettingsOut = {
  id: 0,
  brand_name: "7sabek",
  logo_url: "",
  primary_color: "#0f172a",
  button_color: "#0f172a",
  footer_text: "Merci d'utiliser 7sabek.",
  support_email: "",
  created_at: "",
  updated_at: "",
};

export default function SuperadminEmailsPage() {
  const { locale } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "superadmin-email-center-ar-body");
  const [status, setStatus] = useState<EmailCenterStatusOut | null>(null);
  const [design, setDesign] = useState<EmailDesignSettingsOut>(DEFAULT_DESIGN);
  const [history, setHistory] = useState<EmailDeliveryHistoryOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingDesign, setSavingDesign] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [payload, setPayload] = useState<EmailSendPayload>({ to: "", language: "fr", subject: "", body: "", cta_label: "", cta_url: "" });

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<EmailCenterUserSearchOut[]>([]);
  const [selectedUser, setSelectedUser] = useState<EmailCenterUserSearchOut | null>(null);
  const [userCompose, setUserCompose] = useState({ subject: "", body: "", cta_label: "", cta_url: "" });
  const [userPreview, setUserPreview] = useState<EmailCenterUserPreviewOut | null>(null);
  const [userSending, setUserSending] = useState(false);
  const [userSendResult, setUserSendResult] = useState<string | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<EmailCenterSystemStatusOut | null>(null);
  const [systemStatusLoading, setSystemStatusLoading] = useState(false);
  const [systemStatusError, setSystemStatusError] = useState<string | null>(null);
  const [aiToneTest, setAiToneTest] = useState<"friendly" | "professional" | "motivational" | "short">("friendly");
  const [aiGoalTest, setAiGoalTest] = useState("");
  const [aiCtaLabelHintTest, setAiCtaLabelHintTest] = useState("");
  const [aiSuggestLoadingTest, setAiSuggestLoadingTest] = useState(false);
  const [aiSuggestErrorTest, setAiSuggestErrorTest] = useState<string | null>(null);
  const [aiSuggestionTest, setAiSuggestionTest] = useState<EmailCenterAISuggestResponse | null>(null);

  const [aiToneUser, setAiToneUser] = useState<"friendly" | "professional" | "motivational" | "short">("friendly");
  const [aiGoalUser, setAiGoalUser] = useState("");
  const [aiLanguageUser, setAiLanguageUser] = useState<"darija" | "fr" | "en">("darija");
  const [aiCtaLabelHintUser, setAiCtaLabelHintUser] = useState("");
  const [personalizeWithFirstName, setPersonalizeWithFirstName] = useState(true);
  const [aiSuggestLoadingUser, setAiSuggestLoadingUser] = useState(false);
  const [aiSuggestErrorUser, setAiSuggestErrorUser] = useState<string | null>(null);
  const [aiSuggestionUser, setAiSuggestionUser] = useState<EmailCenterAISuggestResponse | null>(null);
  const [templatesEnabled, setTemplatesEnabled] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplateOut[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateLanguageFilter, setTemplateLanguageFilter] = useState<string>("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("");
  const [selectedTemplateIdTest, setSelectedTemplateIdTest] = useState<string>("");
  const [selectedTemplateIdUser, setSelectedTemplateIdUser] = useState<string>("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateEditor, setTemplateEditor] = useState({
    id: "",
    key: "",
    name: "",
    category: "custom",
    language: "fr",
    subject: "",
    preview_text: "",
    body: "",
    cta_label: "",
    cta_url: "",
    is_active: true,
  });
  const [previewAudienceType, setPreviewAudienceType] = useState<EmailCenterAudienceType>("all_users");
  const [previewLanguage, setPreviewLanguage] = useState<string>("");
  const [previewTemplateId, setPreviewTemplateId] = useState<string>("");
  const [previewLimit, setPreviewLimit] = useState<number>(50);
  const [previewCompose, setPreviewCompose] = useState({ subject: "", body: "", cta_label: "", cta_url: "" });
  const [recipientsPreview, setRecipientsPreview] = useState<EmailCenterRecipientsPreviewResponse | null>(null);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [previewEmailLoading, setPreviewEmailLoading] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<EmailCenterPreviewUserEmailResponse | null>(null);
  const [campaigns, setHamalat] = useState<EmailCampaignOut[]>([]);
  const [campaignsLoading, setHamalatLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [campaignRecipientsPreview, setCampaignRecipientsPreview] = useState<EmailCenterRecipientsPreviewResponse | null>(null);
  const [campaignTestLanguageById, setCampaignTestLanguageById] = useState<Record<string, "darija" | "fr" | "en">>({});
  const [campaignTestSendingById, setCampaignTestSendingById] = useState<Record<string, boolean>>({});
  const [campaignTestResultById, setCampaignTestResultById] = useState<Record<string, string>>({});
  const [suppressions, setSuppressions] = useState<EmailSuppressionListOut | null>(null);
  const [queueStatus, setQueueStatus] = useState<DeliveryQueueStatusOut | null>(null);
  const [suppressionEmail, setSuppressionEmail] = useState("");
  const [suppressionReason, setSuppressionReason] = useState("blocked_by_admin");
  const [queueProcessLimit, setQueueProcessLimit] = useState(20);
  const [registrationLeads, setRegistrationLeads] = useState<RegistrationLeadListOut | null>(null);
  const [registrationLeadsStats, setRegistrationLeadsStats] = useState<RegistrationLeadStatsOut | null>(null);
  const [registrationLeadsQuery, setRegistrationLeadsQuery] = useState("");
  const [registrationLeadsStatusFilter, setRegistrationLeadsStatusFilter] = useState<string>("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [campaignEditor, setCampaignEditor] = useState<{
    id: string;
    title: string;
    audience_type: EmailCenterAudienceType;
    language_mode: "auto" | "darija" | "fr" | "en";
    template_id: string;
    cta_url: string;
    status: "draft" | "ready" | "archived";
    subject_by_language_json: { darija: string; fr: string; en: string };
    body_by_language_json: { darija: string; fr: string; en: string };
    cta_label_by_language_json: { darija: string; fr: string; en: string };
  }>({
    id: "",
    title: "",
    audience_type: "all_users",
    language_mode: "auto",
    template_id: "",
    cta_url: "",
    status: "draft",
    subject_by_language_json: { darija: "", fr: "", en: "" },
    body_by_language_json: { darija: "", fr: "", en: "" },
    cta_label_by_language_json: { darija: "", fr: "", en: "" },
  });

  const canSend = useMemo(() => !!payload.to.trim() && !!payload.subject.trim() && !!payload.body.trim() && !sending, [payload, sending]);
  const canSendUser = useMemo(() => !!selectedUser && !!userCompose.subject.trim() && !!userCompose.body.trim() && !userSending, [selectedUser, userCompose, userSending]);
  const selectedLead = useMemo(
    () => registrationLeads?.items.find((lead) => lead.id === selectedLeadId) || null,
    [registrationLeads?.items, selectedLeadId]
  );

  const modeWarning = useMemo(() => {
    if (!status) return "";
    if (status.mode === "test_only") return "الإرسال للمستخدمين محظور فـ وضع test_only.";
    if (status.mode === "superadmin_only") return "وضع آمن: الإيميل كيمشي غير لإيميل التجربة، ماشي للمستخدم الحقيقي.";
    return "هاد الإيميل غادي يمشي للمستخدم الحقيقي.";
  }, [status]);

  const refreshHistory = async () => {
    const historyData = await apiFetch<EmailDeliveryHistoryOut>("/superadmin/email-center/history?page=1&page_size=20", { headers: { "x-admin-bypass": "true" } });
    setHistory(historyData);
  };

  const loadSystemStatus = async () => {
    setSystemStatusLoading(true);
    setSystemStatusError(null);
    try {
      const data = await apiFetch<EmailCenterSystemStatusOut>("/superadmin/email-center/system-status", {
        headers: { "x-admin-bypass": "true" },
      });
      setSystemStatus(data);
    } catch (err) {
      setSystemStatusError(err instanceof Error ? err.message : "ما قدرناش نجيبو حالة النظام");
    } finally {
      setSystemStatusLoading(false);
    }
  };

  const loadQwaleb = async (language = "", category = "") => {
    setTemplatesLoading(true);
    try {
      const params = new URLSearchParams();
      if (language) params.set("language", language);
      if (category) params.set("category", category);
      const data = await apiFetch<EmailTemplateListOut>(`/superadmin/email-center/templates?${params.toString()}`, {
        headers: { "x-admin-bypass": "true" },
      });
      setTemplatesEnabled(Boolean(data.enabled));
      setTemplates(data.items || []);
    } catch {
      setTemplates([]);
      setTemplatesEnabled(false);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadHamalat = async () => {
    setHamalatLoading(true);
    try {
      const data = await apiFetch<EmailCampaignListOut>("/superadmin/email-center/campaigns?limit=50&offset=0", {
        headers: { "x-admin-bypass": "true" },
      });
      setHamalat(data.items || []);
    } catch {
      setHamalat([]);
    } finally {
      setHamalatLoading(false);
    }
  };

  const loadSuppressions = async () => {
    try {
      const data = await apiFetch<EmailSuppressionListOut>("/superadmin/email-center/suppressions?active_only=true&limit=50&offset=0", { headers: { "x-admin-bypass": "true" } });
      setSuppressions(data);
    } catch {
      setSuppressions({ items: [], limit: 50, offset: 0, total: 0 });
    }
  };

  const loadQueueStatus = async () => {
    try {
      const data = await apiFetch<DeliveryQueueStatusOut>("/superadmin/email-center/delivery-queue/status", { headers: { "x-admin-bypass": "true" } });
      setQueueStatus(data);
    } catch {
      setQueueStatus(null);
    }
  };

  const loadRegistrationLeads = async () => {
    const params = new URLSearchParams({ limit: "50", offset: "0" });
    if (registrationLeadsQuery.trim()) params.set("q", registrationLeadsQuery.trim());
    if (registrationLeadsStatusFilter.trim()) params.set("status", registrationLeadsStatusFilter.trim());
    try {
      const [listData, statsData] = await Promise.all([
        apiFetch<RegistrationLeadListOut>(`/superadmin/registration-leads?${params.toString()}`, { headers: { "x-admin-bypass": "true" } }),
        apiFetch<RegistrationLeadStatsOut>("/superadmin/registration-leads/stats", { headers: { "x-admin-bypass": "true" } }),
      ]);
      setRegistrationLeads(listData);
      setRegistrationLeadsStats(statsData);
    } catch {
      setRegistrationLeads({ items: [], total: 0, limit: 50, offset: 0 });
      setRegistrationLeadsStats({ total: 0, email_captured: 0, partial_no_email: 0, converted: 0, dismissed: 0, last_24h: 0 });
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statusData, designData, historyData] = await Promise.all([
          apiFetch<EmailCenterStatusOut>("/superadmin/email-center/status", { headers: { "x-admin-bypass": "true" } }),
          apiFetch<EmailDesignSettingsOut>("/superadmin/email-center/design", { headers: { "x-admin-bypass": "true" } }),
          apiFetch<EmailDeliveryHistoryOut>("/superadmin/email-center/history?page=1&page_size=20", { headers: { "x-admin-bypass": "true" } }),
        ]);
        setStatus(statusData);
        setDesign(designData);
        setHistory(historyData);
        await loadSystemStatus();
        await loadQwaleb();
        await loadHamalat();
        await loadSuppressions();
        await loadQueueStatus();
        await loadRegistrationLeads();
        setPayload((current) => ({ ...current, to: current.to || statusData.test_recipient_email || "" }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "ما قدرناش نحمّلو مركز الإيميلات");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const saveDesign = async () => {
    setSavingDesign(true);
    setError(null);
    try {
      const updated = await apiFetch<EmailDesignSettingsOut>("/superadmin/email-center/design", {
        method: "PATCH",
        headers: { "x-admin-bypass": "true" },
        body: design,
      });
      setDesign(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرناش نحفظو التصميم");
    } finally {
      setSavingDesign(false);
    }
  };

  const sendTest = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const result = await apiFetch<{ status: string; error_message?: string }>("/superadmin/email-center/send-test", {
        method: "POST",
        headers: { "x-admin-bypass": "true" },
        body: payload,
      });
      setSendResult(result.status === "sent" ? "تصيفط الإيميل بنجاح." : `نتيجة الإرسال: ${result.status}${result.error_message ? ` (${result.error_message})` : ""}`);
      await refreshHistory();
    } catch (err) {
      setSendResult(err instanceof Error ? err.message : "ما قدرناش نصيفطو الإيميل");
    } finally {
      setSending(false);
    }
  };

  const searchUsers = async () => {
    if (!userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const data = await apiFetch<EmailCenterUserSearchListOut>(`/superadmin/email-center/users/search?q=${encodeURIComponent(userSearchQuery.trim())}`, {
        headers: { "x-admin-bypass": "true" },
      });
      setUserSearchResults(data.items || []);
    } catch {
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const loadUserPreview = async () => {
    if (!selectedUser || !userCompose.subject.trim() || !userCompose.body.trim()) {
      setUserPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({
        subject: userCompose.subject,
        body: userCompose.body,
        cta_label: userCompose.cta_label,
        cta_url: userCompose.cta_url,
      });
      const data = await apiFetch<EmailCenterUserPreviewOut>(`/superadmin/email-center/users/${selectedUser.id}/preview?${params.toString()}`, {
        headers: { "x-admin-bypass": "true" },
      });
      setUserPreview(data);
    } catch {
      setUserPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const sendUser = async () => {
    if (!selectedUser) return;
    setUserSending(true);
    setUserSendResult(null);
    try {
      const result = await apiFetch<{ status: string; error_message?: string }>("/superadmin/email-center/send-user", {
        method: "POST",
        headers: { "x-admin-bypass": "true" },
        body: {
          user_id: selectedUser.id,
          subject: userCompose.subject,
          body: userCompose.body,
          cta_label: userCompose.cta_label,
          cta_url: userCompose.cta_url,
        },
      });
      setUserSendResult(result.status === "sent" ? "تصيفط الإيميل للمستخدم بنجاح." : `نتيجة الإرسال: ${result.status}${result.error_message ? ` (${result.error_message})` : ""}`);
      await refreshHistory();
    } catch (err) {
      setUserSendResult(err instanceof Error ? err.message : "ما قدرناش نصيفطو الإيميل l-user");
    } finally {
      setUserSending(false);
    }
  };

  const previewHtml = useMemo(() => {
    const isRtl = payload.language === "darija";
    const dir: "rtl" | "ltr" = isRtl ? "rtl" : "ltr";
    const align = isRtl ? "right" : "left";
    const escapedBrand = design.brand_name
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    const brandRender = `<bdi dir=\"ltr\" style=\"unicode-bidi:isolate;\">${escapedBrand}</bdi>`;
    const escapedBody = payload.body.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br/>");
    return {
      dir,
      html: `<div dir="${dir}" style="font-family:Arial,sans-serif;border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#fff;max-width:620px;text-align:${align};"><div style="color:${design.primary_color};font-size:20px;font-weight:700;margin-bottom:8px;">${brandRender}</div><div style="margin-bottom:8px;font-size:18px;font-weight:600;">${payload.subject || "معاينة الموضوع"}</div><div style="line-height:1.6;color:#1e293b;">${escapedBody || "معاينة النص"}</div>${payload.cta_url ? `<a href="${payload.cta_url}" style="display:inline-block;margin-top:12px;padding:10px 14px;background:${design.button_color};color:#fff;text-decoration:none;border-radius:8px;">${payload.cta_label || "فتح"}</a>` : ""}<hr style="margin:14px 0;border:none;border-top:1px solid #e2e8f0;"/><div style="font-size:12px;color:#64748b;">${design.footer_text}</div><div style="font-size:12px;color:#64748b;">${design.support_email}</div></div>`,
    };
  }, [design, payload]);

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API_BASE}/superadmin/email-center/design/logo-upload`, {
        method: "POST",
        headers: { "x-admin-bypass": "true" },
        credentials: "include",
        body: form,
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Logo upload failed");
      }
      const data = (await response.json()) as { logo_url: string };
      setDesign((s) => ({ ...s, logo_url: data.logo_url || s.logo_url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setLogoUploading(false);
      event.target.value = "";
    }
  };

  const modeExplanation = useMemo(() => {
    if (!systemStatus) return "";
    if (systemStatus.mode === "test_only") {
      return "test_only: غير إيميل التجربة اللي يقدر يتوصل.";
    }
    if (systemStatus.mode === "superadmin_only") {
      return "superadmin_only: كيتوجد الإيميل حسب المستخدم المختار ولكن كيتصيفط غير لإيميل التجربة.";
    }
    return "production: كيتصيفط للمستخدمين الحقيقيين.";
  }, [systemStatus]);

  const statusBadge = (value: boolean, positiveLabel = "مفعّل") => (
    <Badge>{value ? positiveLabel : "مطفّي"}</Badge>
  );
  const aiDisabled = !systemStatus?.flags.ai_suggestions_enabled;
  const aiMissingConfig = systemStatus?.ai?.ai_capability === "missing_config";

  useEffect(() => {
    if (selectedUser?.detected_language === "fr" || selectedUser?.detected_language === "en" || selectedUser?.detected_language === "darija") {
      setAiLanguageUser(selectedUser.detected_language);
    }
  }, [selectedUser]);

  const requestAISuggest = async (body: EmailCenterAISuggestRequest) => {
    return apiFetch<EmailCenterAISuggestResponse>("/superadmin/email-center/ai-suggest", {
      method: "POST",
      headers: { "x-admin-bypass": "true" },
      body,
    });
  };

  const suggestForTest = async () => {
    setAiSuggestLoadingTest(true);
    setAiSuggestErrorTest(null);
    try {
      const suggestion = await requestAISuggest({
        language: payload.language,
        tone: aiToneTest,
        goal: aiGoalTest,
        audience_type: "test",
        cta_url: payload.cta_url,
        cta_label_hint: aiCtaLabelHintTest,
      });
      setAiSuggestionTest(suggestion);
    } catch (err) {
      setAiSuggestErrorTest(err instanceof Error ? err.message : "فشل اقتراح الذكاء الاصطناعي");
    } finally {
      setAiSuggestLoadingTest(false);
    }
  };

  const suggestForUser = async () => {
    if (!selectedUser) return;
    setAiSuggestLoadingUser(true);
    setAiSuggestErrorUser(null);
    try {
      const suggestion = await requestAISuggest({
        language: aiLanguageUser,
        tone: aiToneUser,
        goal: aiGoalUser,
        audience_type: "single_user",
        user_id: selectedUser.id,
        cta_url: userCompose.cta_url,
        cta_label_hint: aiCtaLabelHintUser,
        personalize_with_first_name: personalizeWithFirstName,
      });
      setAiSuggestionUser(suggestion);
    } catch (err) {
      setAiSuggestErrorUser(err instanceof Error ? err.message : "فشل اقتراح الذكاء الاصطناعي");
    } finally {
      setAiSuggestLoadingUser(false);
    }
  };

  const filteredTemplatesForTest = useMemo(
    () => templates.filter((t) => t.language === payload.language || !payload.language),
    [templates, payload.language]
  );
  const filteredTemplatesForUser = useMemo(
    () => templates.filter((t) => t.language === aiLanguageUser || !aiLanguageUser),
    [templates, aiLanguageUser]
  );

  const applyTemplateToTest = (templateId: string) => {
    setSelectedTemplateIdTest(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setPayload((s) => ({
      ...s,
      subject: template.subject,
      body: template.body,
      cta_label: template.cta_label || "",
      cta_url: template.cta_url || "",
    }));
  };

  const applyTemplateToUser = (templateId: string) => {
    setSelectedTemplateIdUser(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setUserCompose((s) => ({
      ...s,
      subject: template.subject,
      body: template.body,
      cta_label: template.cta_label || "",
      cta_url: template.cta_url || "",
    }));
  };

  const saveTemplate = async () => {
    setSavingTemplate(true);
    setError(null);
    try {
      if (!templateEditor.name.trim() || !templateEditor.subject.trim() || !templateEditor.body.trim()) {
        throw new Error("Name, subject and body are required");
      }
      const body = {
        key: templateEditor.key || null,
        name: templateEditor.name,
        category: templateEditor.category,
        language: templateEditor.language,
        subject: templateEditor.subject,
        preview_text: templateEditor.preview_text || null,
        body: templateEditor.body,
        cta_label: templateEditor.cta_label || null,
        cta_url: templateEditor.cta_url || null,
        is_active: templateEditor.is_active,
      };
      if (templateEditor.id) {
        await apiFetch(`/superadmin/email-center/templates/${templateEditor.id}`, {
          method: "PATCH",
          headers: { "x-admin-bypass": "true" },
          body,
        });
      } else {
        await apiFetch("/superadmin/email-center/templates", {
          method: "POST",
          headers: { "x-admin-bypass": "true" },
          body,
        });
      }
      await loadQwaleb(templateLanguageFilter, templateCategoryFilter);
      await loadSystemStatus();
      setTemplateEditor({
        id: "",
        key: "",
        name: "",
        category: "custom",
        language: "fr",
        subject: "",
        preview_text: "",
        body: "",
        cta_label: "",
        cta_url: "",
        is_active: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرناش نحفظو القالب");
    } finally {
      setSavingTemplate(false);
    }
  };

  const deactivateTemplate = async (templateId: string) => {
    try {
      await apiFetch(`/superadmin/email-center/templates/${templateId}`, {
        method: "DELETE",
        headers: { "x-admin-bypass": "true" },
      });
      await loadQwaleb(templateLanguageFilter, templateCategoryFilter);
      await loadSystemStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرناش نعطلو القالب");
    }
  };

  const seedDefaultTemplates = async () => {
    try {
      await apiFetch("/superadmin/email-center/templates/seed-defaults", {
        method: "POST",
        headers: { "x-admin-bypass": "true" },
      });
      await loadQwaleb(templateLanguageFilter, templateCategoryFilter);
      await loadSystemStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرناش نركبو القوالب الجاهزة");
    }
  };

  const runRecipientsPreview = async () => {
    setRecipientsLoading(true);
    setPreviewEmail(null);
    try {
      const data = await apiFetch<EmailCenterRecipientsPreviewResponse>("/superadmin/email-center/recipients/preview", {
        method: "POST",
        headers: { "x-admin-bypass": "true" },
        body: {
          audience_type: previewAudienceType,
          language: previewLanguage || undefined,
          template_id: previewTemplateId || undefined,
          subject: previewCompose.subject || undefined,
          body: previewCompose.body || undefined,
          cta_label: previewCompose.cta_label || undefined,
          cta_url: previewCompose.cta_url || undefined,
          limit: previewLimit,
        },
      });
      setRecipientsPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرناش نشغلو معاينة المستافدين");
      setRecipientsPreview(null);
    } finally {
      setRecipientsLoading(false);
    }
  };

  const loadPreviewUserEmail = async (userId: string) => {
    setPreviewEmailLoading(true);
    try {
      const data = await apiFetch<EmailCenterPreviewUserEmailResponse>("/superadmin/email-center/recipients/preview-user-email", {
        method: "POST",
        headers: { "x-admin-bypass": "true" },
        body: {
          user_id: userId,
          template_id: previewTemplateId || undefined,
          subject: previewCompose.subject || undefined,
          body: previewCompose.body || undefined,
          cta_label: previewCompose.cta_label || undefined,
          cta_url: previewCompose.cta_url || undefined,
        },
      });
      setPreviewEmail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرناش نعاينو إيميل المستخدم");
      setPreviewEmail(null);
    } finally {
      setPreviewEmailLoading(false);
    }
  };

  const saveCampaign = async () => {
    const body: EmailCampaignCreateRequest = {
      title: campaignEditor.title,
      audience_type: campaignEditor.audience_type,
      language_mode: campaignEditor.language_mode,
      template_id: campaignEditor.template_id || undefined,
      cta_url: campaignEditor.cta_url || undefined,
      status: campaignEditor.status,
      subject_by_language_json: campaignEditor.subject_by_language_json,
      body_by_language_json: campaignEditor.body_by_language_json,
      cta_label_by_language_json: campaignEditor.cta_label_by_language_json,
    };
    if (!campaignEditor.title.trim()) {
      setError("عنوان الحملة ضروري");
      return;
    }
    try {
      if (campaignEditor.id) {
        await apiFetch(`/superadmin/email-center/campaigns/${campaignEditor.id}`, {
          method: "PATCH",
          headers: { "x-admin-bypass": "true" },
          body,
        });
      } else {
        await apiFetch("/superadmin/email-center/campaigns", {
          method: "POST",
          headers: { "x-admin-bypass": "true" },
          body,
        });
      }
      await loadHamalat();
      await loadSystemStatus();
      setCampaignEditor((s) => ({ ...s, id: "", title: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرناش نحفظو الحملة");
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      await apiFetch(`/superadmin/email-center/campaigns/${campaignId}`, {
        method: "DELETE",
        headers: { "x-admin-bypass": "true" },
      });
      await loadHamalat();
      await loadSystemStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرناش نحيدو الحملة");
    }
  };

  const duplicateCampaign = async (campaignId: string) => {
    try {
      await apiFetch(`/superadmin/email-center/campaigns/${campaignId}/duplicate`, {
        method: "POST",
        headers: { "x-admin-bypass": "true" },
      });
      await loadHamalat();
      await loadSystemStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرناش ننسخو الحملة");
    }
  };

  const previewCampaignRecipients = async (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    try {
      const data = await apiFetch<EmailCenterRecipientsPreviewResponse>(
        `/superadmin/email-center/campaigns/${campaignId}/recipients-preview?limit=50`,
        { method: "POST", headers: { "x-admin-bypass": "true" } }
      );
      setCampaignRecipientsPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ما قدرناش نعاينو المستافدين");
      setCampaignRecipientsPreview(null);
    }
  };

  const sendCampaignTest = async (campaignId: string) => {
    const language = campaignTestLanguageById[campaignId] || "darija";
    setCampaignTestSendingById((s) => ({ ...s, [campaignId]: true }));
    setCampaignTestResultById((s) => ({ ...s, [campaignId]: "" }));
    try {
      const result = await apiFetch<{ status: string; error_message?: string }>(`/superadmin/email-center/campaigns/${campaignId}/send-test`, {
        method: "POST",
        headers: { "x-admin-bypass": "true" },
        body: { language },
      });
      setCampaignTestResultById((s) => ({
        ...s,
        [campaignId]: result.status === "sent" ? "تصيفط تيست الحملة لإيميل التجربة المعيّن." : `نتيجة تيست الحملة: ${result.status}${result.error_message ? ` (${result.error_message})` : ""}`,
      }));
      await refreshHistory();
      await loadSystemStatus();
    } catch (err) {
      setCampaignTestResultById((s) => ({ ...s, [campaignId]: err instanceof Error ? err.message : "فشل إرسال تيست الحملة" }));
    } finally {
      setCampaignTestSendingById((s) => ({ ...s, [campaignId]: false }));
    }
  };

  const sendCampaignQueued = async (campaignId: string, recipients: number) => {
    const confirmation = window.prompt(`غادي تصيفط الحملة لــ ${recipients} مستافد. كتب SEND باش تأكد.`);
    if (confirmation !== "SEND") return;
    await apiFetch(`/superadmin/email-center/campaigns/${campaignId}/send`, {
      method: "POST",
      headers: { "x-admin-bypass": "true" },
      body: { confirmation: "SEND" },
    });
    await loadHamalat();
    await loadSystemStatus();
    await loadQueueStatus();
  };

  const addSuppression = async () => {
    await apiFetch("/superadmin/email-center/suppressions", {
      method: "POST",
      headers: { "x-admin-bypass": "true" },
      body: { email: suppressionEmail, السبب: suppressionReason, source: "manual" },
    });
    setSuppressionEmail("");
    await loadSuppressions();
    await loadSystemStatus();
  };

  const deactivateSuppression = async (id: string) => {
    await apiFetch(`/superadmin/email-center/suppressions/${id}`, { method: "DELETE", headers: { "x-admin-bypass": "true" } });
    await loadSuppressions();
    await loadSystemStatus();
  };

  const processQueue = async () => {
    await apiFetch("/superadmin/email-center/delivery-queue/process", {
      method: "POST",
      headers: { "x-admin-bypass": "true" },
      body: { limit: queueProcessLimit },
    });
    await loadQueueStatus();
    await loadSystemStatus();
  };

  const updateRegistrationLeadStatus = async (leadId: string, nextStatus: "dismissed" | "blocked") => {
    await apiFetch(`/superadmin/registration-leads/${leadId}`, {
      method: "PATCH",
      headers: { "x-admin-bypass": "true" },
      body: { status: nextStatus },
    });
    await loadRegistrationLeads();
    await loadSystemStatus();
  };

  return (
    <div className="min-h-screen space-y-6 bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef7f4_40%,_#f8fafc)] p-4 md:p-6" dir="rtl">
      <Card className="space-y-4 rounded-3xl border-0 p-5 shadow-[var(--shadow-soft)]">
        <PageHeader
          title="مركز الإيميلات"
          subtitle="مركز ديال الإيميلات للمشرف. من هنا تقدر تجرّب الإرسال، تكتب لمستخدم واحد، تراجع القوالب، وتشوف الحالة العامة ديال النظام بطريقة آمنة."
          actions={<Button variant="secondary" onClick={loadSystemStatus} disabled={systemStatusLoading}>{systemStatusLoading ? "كيتم التحديث..." : "حدّث"}</Button>}
        />
        <div className="flex flex-wrap gap-2">
          <Badge>{status?.mode || "وضع غير معروف"}</Badge>
          <Badge>{status?.provider || "مزوّد غير معروف"}</Badge>
          <Badge>{status?.kill_switch ? "الإرسال محظور" : "الإرسال مفتوح"}</Badge>
          <Badge>{systemStatus?.templates.templates_count ?? 0} قوالب</Badge>
          <Badge>{queueStatus?.pending_count ?? 0} فـالصف</Badge>
          <Badge>{systemStatus?.ai.ai_capability || "AI"}</Badge>
        </div>
      </Card>
      {loading ? <p className="text-sm text-[var(--muted)]">جاري التحميل...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-white/70 p-2">
            <TabsTrigger value="overview" className="rounded-full"><Gauge className="ml-1 h-4 w-4" />نظرة عامة</TabsTrigger>
            <TabsTrigger value="compose" className="rounded-full"><Send className="ml-1 h-4 w-4" />كتب تيست</TabsTrigger>
            <TabsTrigger value="compose-user" className="rounded-full"><UserRound className="ml-1 h-4 w-4" />كتب للمستخدم</TabsTrigger>
            <TabsTrigger value="templates" className="rounded-full"><FileText className="ml-1 h-4 w-4" />القوالب</TabsTrigger>
            <TabsTrigger value="campaigns" className="rounded-full"><Megaphone className="ml-1 h-4 w-4" />الحملات</TabsTrigger>
            <TabsTrigger value="recipients-preview" className="rounded-full"><Users className="ml-1 h-4 w-4" />معاينة المستافدين</TabsTrigger>
            <TabsTrigger value="registration-leads">الناس اللي بداو التسجيل</TabsTrigger>
            <TabsTrigger value="suppressions" className="rounded-full"><Blocks className="ml-1 h-4 w-4" />لائحة المنع</TabsTrigger>
            <TabsTrigger value="delivery-queue" className="rounded-full"><Activity className="ml-1 h-4 w-4" />صف الإرسال</TabsTrigger>
            <TabsTrigger value="system-status" className="rounded-full"><Settings2 className="ml-1 h-4 w-4" />حالة النظام</TabsTrigger>
            <TabsTrigger value="design" className="rounded-full"><Brush className="ml-1 h-4 w-4" />التصميم</TabsTrigger>
            <TabsTrigger value="history" className="rounded-full"><Clock3 className="ml-1 h-4 w-4" />التاريخ</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><Card className="space-y-3 rounded-3xl p-4"><div className="flex items-center gap-2"><p className="text-sm font-semibold">نظرة عامة</p><InfoHint label="معلومة">هنا كتشوف الحالة العامة ديال مركز الإيميلات بسرعة.</InfoHint></div><div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4"><Badge>الوضع: {status?.mode || "غير معروف"}</Badge><Badge>المزوّد: {status?.provider || "غير معروف"}</Badge><Badge>{status?.enabled ? "مفعّل" : "مطفّي"}</Badge><Badge>{status?.allow_user_send ? "الإرسال للمستخدم مفعّل" : "الإرسال للمستخدم غير مفعّل"}</Badge></div><p className="text-sm">من: {status?.mail_from || "-"}</p><p className="text-sm">إيميل التجربة: {status?.test_recipient_email || "غير محدد"}</p><p className="text-sm text-amber-700">{modeWarning}</p></Card></TabsContent>
          <TabsContent value="compose">
            <Card className="space-y-3 p-4">
              <Input placeholder="إيميل التوصل" value={payload.to} onChange={(e) => setPayload((s) => ({ ...s, to: e.target.value }))} />
              <Select value={payload.language} onValueChange={(value) => setPayload((s) => ({ ...s, language: value }))}>
                <SelectTrigger><SelectValue placeholder="اللغة" /></SelectTrigger>
                <SelectContent><SelectItem value="darija">Darija</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
              </Select>
              <Select value={selectedTemplateIdTest || "__none__"} onValueChange={(value) => applyTemplateToTest(value === "__none__" ? "" : value)}>
                <SelectTrigger><SelectValue placeholder="استعمل قالب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بلا قالب</SelectItem>
                  {filteredTemplatesForTest.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.name} · {template.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded border border-[var(--border)] p-3">
                <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">اقتراح AI</p><Badge>{aiDisabled ? "الذكاء الاصطناعي مطفّي" : aiMissingConfig ? "بوابة الذكاء الاصطناعي خاصها إعداد" : "جاهز"}</Badge></div>
                <Textarea placeholder="الهدف ديال هاد الإيميل" value={aiGoalTest} onChange={(e) => setAiGoalTest(e.target.value)} rows={3} />
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <Select value={aiToneTest} onValueChange={(value) => setAiToneTest(value as "friendly" | "professional" | "motivational" | "short")}><SelectTrigger><SelectValue placeholder="النبرة" /></SelectTrigger><SelectContent><SelectItem value="friendly">friendly</SelectItem><SelectItem value="professional">professional</SelectItem><SelectItem value="motivational">motivational</SelectItem><SelectItem value="short">short</SelectItem></SelectContent></Select>
                  <Input placeholder="تلميح نص الزر (اختياري)" value={aiCtaLabelHintTest} onChange={(e) => setAiCtaLabelHintTest(e.target.value)} />
                </div>
                <div className="mt-2 flex gap-2"><Button onClick={suggestForTest} disabled={aiDisabled || aiMissingConfig || aiSuggestLoadingTest || !aiGoalTest.trim()}>{aiSuggestLoadingTest ? "كيحضّر الاقتراح..." : "جيب اقتراح بالذكاء الاصطناعي"}</Button>{aiSuggestionTest ? <Button variant="secondary" onClick={suggestForTest} disabled={aiSuggestLoadingTest}>عاود الاقتراح</Button> : null}{aiSuggestionTest ? <Button variant="secondary" onClick={() => setAiSuggestionTest(null)}>إلغاء</Button> : null}</div>
                {aiSuggestErrorTest ? <p className="mt-2 text-sm text-red-600">{aiSuggestErrorTest}</p> : null}
                {aiSuggestionTest ? <div className="mt-3 rounded border border-[var(--border)] p-3 text-sm"><p><strong>الموضوع:</strong> {aiSuggestionTest.subject}</p><p><strong>عاين:</strong> {aiSuggestionTest.preview_text || "-"}</p><p className="whitespace-pre-wrap"><strong>نص الإيميل:</strong>{"\n"}{aiSuggestionTest.body}</p><p><strong>CTA:</strong> {aiSuggestionTest.cta_label}</p><Button className="mt-2" onClick={() => setPayload((s) => ({ ...s, subject: aiSuggestionTest.subject, body: aiSuggestionTest.body, cta_label: aiSuggestionTest.cta_label }))}>طبّق الاقتراح</Button></div> : null}
              </div>
              <Input placeholder="الموضوع" value={payload.subject} onChange={(e) => setPayload((s) => ({ ...s, subject: e.target.value }))} />
              <Textarea placeholder="نص الإيميل" value={payload.body} onChange={(e) => setPayload((s) => ({ ...s, body: e.target.value }))} rows={8} />
              <Input placeholder="نص الزر" value={payload.cta_label} onChange={(e) => setPayload((s) => ({ ...s, cta_label: e.target.value }))} />
              <Input placeholder="الرابط" value={payload.cta_url} onChange={(e) => setPayload((s) => ({ ...s, cta_url: e.target.value }))} />
              <Button onClick={sendTest} disabled={!canSend}>{sending ? "كيتم الإرسال..." : "صيفط تيست"}</Button>
              {sendResult ? <p className="text-sm">{sendResult}</p> : null}
            </Card>
          </TabsContent>
          <TabsContent value="suppressions">
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">لائحة المنع</p><Badge>{systemStatus?.flags.suppression_enabled ? "مفعّل" : "مطفّي"}</Badge></div>
              {!systemStatus?.flags.suppression_enabled ? <p className="text-sm text-[var(--muted)]">هاد الخاصية ما مفعّلاش دابا.</p> : null}
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="email@example.com" value={suppressionEmail} onChange={(e) => setSuppressionEmail(e.target.value)} disabled={!systemStatus?.flags.suppression_enabled} />
                <Input placeholder="السبب" value={suppressionReason} onChange={(e) => setSuppressionReason(e.target.value)} disabled={!systemStatus?.flags.suppression_enabled} />
                <Button onClick={addSuppression} disabled={!suppressionEmail.trim() || !systemStatus?.flags.suppression_enabled}>زيد إيميل للمنع</Button>
              </div>
              {suppressions?.items.map((item) => (<div key={item.id} className="flex items-center justify-between rounded border border-[var(--border)] p-2 text-sm"><p>{item.email} · {item.reason}</p><Button variant="secondary" onClick={() => deactivateSuppression(item.id)} disabled={!systemStatus?.flags.suppression_enabled}>عطّل المنع</Button></div>))}
            </Card>
          </TabsContent>
          <TabsContent value="delivery-queue">
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">صف الإرسال</p><Badge>{systemStatus?.flags.delivery_queue_enabled ? "مفعّل" : "مطفّي"}</Badge></div>
              <p className="text-sm text-[var(--muted)]">هاد الصف فيه الإيميلات اللي واجدين للإرسال ولا اللي خاصهم إعادة محاولة.</p>
              <p className="text-sm">فانتظار الإرسال: {queueStatus?.pending_count ?? 0} · إعادة المحاولة: {queueStatus?.retry_count ?? 0} · فشل: {queueStatus?.failed_count ?? 0}</p>
              <div className="flex gap-2"><Input type="number" value={queueProcessLimit} onChange={(e) => setQueueProcessLimit(Number(e.target.value || "20"))} /><Button onClick={processQueue} disabled={!systemStatus?.flags.delivery_queue_enabled}>شغّل دفعة</Button></div>
            </Card>
          </TabsContent>
          <TabsContent value="compose-user">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-3 p-4">
                <p className="text-sm text-amber-700">{modeWarning}</p>
                <div className="flex gap-2">
                  <Input placeholder="قلّب على المستخدم" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} />
                  <Button onClick={searchUsers} disabled={searchingUsers}>{searchingUsers ? "كيتم التقليب..." : "قلّب"}</Button>
                </div>
                <div className="space-y-2">
                  {userSearchResults.map((user) => (
                    <button key={user.id} type="button" className="w-full rounded border border-[var(--border)] p-2 text-left text-sm" onClick={() => setSelectedUser(user)}>
                      <p className="font-medium">{user.display_name}</p>
                      <p className="text-[var(--muted)]">{user.email} · {user.detected_language}</p>
                    </button>
                  ))}
                </div>
                {selectedUser ? (
                  <div className="rounded border border-[var(--border)] p-3 text-sm">
                    <p className="font-medium">المستخدم المختار</p>
                    <p>{selectedUser.display_name}</p>
                    <p>{selectedUser.email}</p>
                    <p>اللغة: {selectedUser.detected_language}</p>
                  </div>
                ) : null}
                <Select value={selectedTemplateIdUser || "__none__"} onValueChange={(value) => applyTemplateToUser(value === "__none__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="استعمل قالب" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بلا قالب</SelectItem>
                    {filteredTemplatesForUser.map((template) => (
                      <SelectItem key={template.id} value={template.id}>{template.name} · {template.category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="rounded border border-[var(--border)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">اقتراح AI</p>
                    <Badge>{aiDisabled ? "الذكاء الاصطناعي مطفّي" : aiMissingConfig ? "بوابة الذكاء الاصطناعي خاصها إعداد" : "جاهز"}</Badge>
                  </div>
                  <Textarea placeholder="الهدف ديال هاد الإيميل" value={aiGoalUser} onChange={(e) => setAiGoalUser(e.target.value)} rows={3} />
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <Select value={aiLanguageUser} onValueChange={(value) => setAiLanguageUser(value as "darija" | "fr" | "en")}>
                      <SelectTrigger><SelectValue placeholder="اللغة" /></SelectTrigger>
                      <SelectContent><SelectItem value="darija">Darija</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                    </Select>
                    <Select value={aiToneUser} onValueChange={(value) => setAiToneUser(value as "friendly" | "professional" | "motivational" | "short")}>
                      <SelectTrigger><SelectValue placeholder="النبرة" /></SelectTrigger>
                      <SelectContent><SelectItem value="friendly">friendly</SelectItem><SelectItem value="professional">professional</SelectItem><SelectItem value="motivational">motivational</SelectItem><SelectItem value="short">short</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <Input className="mt-2" placeholder="تلميح نص الزر (اختياري)" value={aiCtaLabelHintUser} onChange={(e) => setAiCtaLabelHintUser(e.target.value)} />
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox checked={personalizeWithFirstName} onCheckedChange={(checked) => setPersonalizeWithFirstName(Boolean(checked))} />
                    <p className="text-sm">خصّص بالاسم الأول</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button onClick={suggestForUser} disabled={aiDisabled || aiMissingConfig || aiSuggestLoadingUser || !selectedUser || !aiGoalUser.trim()}>{aiSuggestLoadingUser ? "كيحضّر الاقتراح..." : "جيب اقتراح بالذكاء الاصطناعي"}</Button>
                    {aiSuggestionUser ? <Button variant="secondary" onClick={suggestForUser} disabled={aiSuggestLoadingUser}>عاود الاقتراح</Button> : null}
                    {aiSuggestionUser ? <Button variant="secondary" onClick={() => setAiSuggestionUser(null)}>إلغاء</Button> : null}
                  </div>
                  {aiSuggestErrorUser ? <p className="mt-2 text-sm text-red-600">{aiSuggestErrorUser}</p> : null}
                  {aiSuggestionUser ? <div className="mt-3 rounded border border-[var(--border)] p-3 text-sm"><p><strong>الموضوع:</strong> {aiSuggestionUser.subject}</p><p><strong>عاين:</strong> {aiSuggestionUser.preview_text || "-"}</p><p className="whitespace-pre-wrap"><strong>نص الإيميل:</strong>{"\n"}{aiSuggestionUser.body}</p><p><strong>CTA:</strong> {aiSuggestionUser.cta_label}</p><Button className="mt-2" onClick={() => setUserCompose((s) => ({ ...s, subject: aiSuggestionUser.subject, body: aiSuggestionUser.body, cta_label: aiSuggestionUser.cta_label }))}>طبّق الاقتراح</Button></div> : null}
                </div>
                <Input placeholder="الموضوع" value={userCompose.subject} onChange={(e) => setUserCompose((s) => ({ ...s, subject: e.target.value }))} />
                <Textarea placeholder="نص الإيميل" value={userCompose.body} onChange={(e) => setUserCompose((s) => ({ ...s, body: e.target.value }))} rows={8} />
                <Input placeholder="نص الزر" value={userCompose.cta_label} onChange={(e) => setUserCompose((s) => ({ ...s, cta_label: e.target.value }))} />
                <Input placeholder="الرابط" value={userCompose.cta_url} onChange={(e) => setUserCompose((s) => ({ ...s, cta_url: e.target.value }))} />
                <div className="flex gap-2">
                  <Button onClick={loadUserPreview} disabled={!selectedUser || previewLoading || !userCompose.subject.trim() || !userCompose.body.trim()}>{previewLoading ? "كيجيب المعاينة..." : "عاين"}</Button>
                  <Button onClick={sendUser} disabled={!canSendUser || !status?.allow_user_send || status?.mode === "test_only"}>{userSending ? "كيتم الإرسال..." : "صيفط دابا"}</Button>
                </div>
                {userSendResult ? <p className="text-sm">{userSendResult}</p> : null}
              </Card>
              <Card className="p-4">
                <p className="mb-2 text-sm font-medium">عاين الرسالة</p>
                {userPreview ? (
                  <div className="space-y-2 text-sm">
                    <p>المستافد: {userPreview.display_name} ({userPreview.email})</p>
                    <p>اللغة: {userPreview.detected_language}</p>
                    <SafeHtmlFrame html={userPreview.body_html} title="معاينة الإيميل" />
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">اختار مستخدم، عاين الرسالة، ومن بعد صيفطها بطريقة آمنة.</p>
                )}
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="campaigns">
            <Card className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">الحملات</p>
                <Badge>{systemStatus?.flags.campaigns_enabled ? "مفعّل" : "مطفّي"}</Badge>
              </div>
              <p className="text-sm text-amber-700">الحملة كتجمع المحتوى والمستافدين باش تراجع كلشي قبل الإرسال. مازال bulk send مطفّي.</p>
              <p className="text-sm text-[var(--muted)]">التست كيمشي غير للإيميل ديال التجربة.</p>
              {!systemStatus?.flags.campaigns_enabled ? <p className="text-sm text-[var(--muted)]">هاد الخاصية مطفّية دابا حتى يتفعّل الفلاغ.</p> : null}
              {!systemStatus?.flags.campaign_test_send_enabled ? <p className="text-sm text-[var(--muted)]">صيفط تيست ديال الحملة غير مفعّل دابا.</p> : null}
              {systemStatus?.capabilities.campaign_test_send === "blocked_by_kill_switch" ? <p className="text-sm text-red-600">لا يمكن إرسال هاد الحملة دابا: الحظر العام مفعّل.</p> : null}
              {systemStatus?.capabilities.campaign_test_send === "missing_test_recipient" ? <p className="text-sm text-red-600">لا يمكن إرسال هاد الحملة دابا: إيميل التجربة ناقص.</p> : null}
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="عنوان الحملة" value={campaignEditor.title} onChange={(e) => setCampaignEditor((s) => ({ ...s, title: e.target.value }))} />
                <Select value={campaignEditor.audience_type} onValueChange={(value) => setCampaignEditor((s) => ({ ...s, audience_type: value as EmailCenterAudienceType }))}>
                  <SelectTrigger><SelectValue placeholder="نوع الجمهور" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_users">all_users</SelectItem>
                    <SelectItem value="incomplete_onboarding">incomplete_onboarding</SelectItem>
                    <SelectItem value="no_transactions">no_transactions</SelectItem>
                    <SelectItem value="no_envelopes">no_envelopes</SelectItem>
                    <SelectItem value="by_language">by_language</SelectItem>
                    <SelectItem value="salary_today">salary_today</SelectItem>
                    <SelectItem value="salary_tomorrow">salary_tomorrow</SelectItem>
                    <SelectItem value="registration_leads_email_captured">الناس اللي بداو التسجيل وما كملوش</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={campaignEditor.language_mode} onValueChange={(value) => setCampaignEditor((s) => ({ ...s, language_mode: value as "auto" | "darija" | "fr" | "en" }))}>
                  <SelectTrigger><SelectValue placeholder="وضع اللغة" /></SelectTrigger>
                  <SelectContent><SelectItem value="auto">auto</SelectItem><SelectItem value="darija">darija</SelectItem><SelectItem value="fr">fr</SelectItem><SelectItem value="en">en</SelectItem></SelectContent>
                </Select>
                <Select value={campaignEditor.template_id || "__none__"} onValueChange={(value) => setCampaignEditor((s) => ({ ...s, template_id: value === "__none__" ? "" : value }))}>
                  <SelectTrigger><SelectValue placeholder="قالب (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بلا قالب</SelectItem>
                    {templates.map((template) => (<SelectItem key={template.id} value={template.id}>{template.name} · {template.language}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {campaignEditor.language_mode === "auto" ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {(["darija", "fr", "en"] as const).map((lang) => (
                    <Card key={lang} className="space-y-2 p-3">
                      <p className="text-sm font-medium">{lang}</p>
                      <Input placeholder={`Subject ${lang}`} value={campaignEditor.subject_by_language_json[lang]} onChange={(e) => setCampaignEditor((s) => ({ ...s, subject_by_language_json: { ...s.subject_by_language_json, [lang]: e.target.value } }))} />
                      <Textarea placeholder={`Body ${lang}`} value={campaignEditor.body_by_language_json[lang]} onChange={(e) => setCampaignEditor((s) => ({ ...s, body_by_language_json: { ...s.body_by_language_json, [lang]: e.target.value } }))} rows={4} />
                      <Input placeholder={`نص الزر ${lang}`} value={campaignEditor.cta_label_by_language_json[lang]} onChange={(e) => setCampaignEditor((s) => ({ ...s, cta_label_by_language_json: { ...s.cta_label_by_language_json, [lang]: e.target.value } }))} />
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="space-y-2 p-3">
                  <Input placeholder="الموضوع" value={campaignEditor.subject_by_language_json[campaignEditor.language_mode]} onChange={(e) => setCampaignEditor((s) => ({ ...s, subject_by_language_json: { ...s.subject_by_language_json, [campaignEditor.language_mode]: e.target.value } }))} />
                  <Textarea placeholder="نص الإيميل" value={campaignEditor.body_by_language_json[campaignEditor.language_mode]} onChange={(e) => setCampaignEditor((s) => ({ ...s, body_by_language_json: { ...s.body_by_language_json, [campaignEditor.language_mode]: e.target.value } }))} rows={4} />
                  <Input placeholder="نص الزر" value={campaignEditor.cta_label_by_language_json[campaignEditor.language_mode]} onChange={(e) => setCampaignEditor((s) => ({ ...s, cta_label_by_language_json: { ...s.cta_label_by_language_json, [campaignEditor.language_mode]: e.target.value } }))} />
                </Card>
              )}
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="الرابط" value={campaignEditor.cta_url} onChange={(e) => setCampaignEditor((s) => ({ ...s, cta_url: e.target.value }))} />
                <Select value={campaignEditor.status} onValueChange={(value) => setCampaignEditor((s) => ({ ...s, status: value as "draft" | "ready" | "archived" }))}>
                  <SelectTrigger><SelectValue placeholder="Lhala" /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">draft</SelectItem><SelectItem value="ready">ready</SelectItem><SelectItem value="archived">archived</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveCampaign} disabled={!systemStatus?.flags.campaigns_enabled}>{campaignEditor.id ? "عدّل المسودة" : "حفظ الحملة"}</Button>
                <Button variant="secondary" onClick={() => setCampaignEditor({ id: "", title: "", audience_type: "all_users", language_mode: "auto", template_id: "", cta_url: "", status: "draft", subject_by_language_json: { darija: "", fr: "", en: "" }, body_by_language_json: { darija: "", fr: "", en: "" }, cta_label_by_language_json: { darija: "", fr: "", en: "" } })}>إلغاء</Button>
                <Button variant="secondary" onClick={loadHamalat} disabled={campaignsLoading}>{campaignsLoading ? "كيتم التحديث..." : "حدّث الحالة"}</Button>
              </div>
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id} className="space-y-2 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{campaign.title}</p>
                      <div className="flex gap-2">
                        <Badge>{campaign.status}</Badge>
                        <Badge>{campaign.audience_type}</Badge>
                        <Badge>{campaign.language_mode}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--muted)]">التاريخ: {campaign.created_at}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setCampaignEditor({
                        id: campaign.id,
                        title: campaign.title,
                        audience_type: (campaign.audience_type as EmailCenterAudienceType),
                        language_mode: (campaign.language_mode as "auto" | "darija" | "fr" | "en"),
                        template_id: campaign.template_id || "",
                        cta_url: campaign.cta_url || "",
                        status: (campaign.status as "draft" | "ready" | "archived"),
                        subject_by_language_json: {
                          darija: String((campaign.subject_by_language_json as Record<string, unknown> | null)?.["darija"] || ""),
                          fr: String((campaign.subject_by_language_json as Record<string, unknown> | null)?.["fr"] || ""),
                          en: String((campaign.subject_by_language_json as Record<string, unknown> | null)?.["en"] || ""),
                        },
                        body_by_language_json: {
                          darija: String((campaign.body_by_language_json as Record<string, unknown> | null)?.["darija"] || ""),
                          fr: String((campaign.body_by_language_json as Record<string, unknown> | null)?.["fr"] || ""),
                          en: String((campaign.body_by_language_json as Record<string, unknown> | null)?.["en"] || ""),
                        },
                        cta_label_by_language_json: {
                          darija: String((campaign.cta_label_by_language_json as Record<string, unknown> | null)?.["darija"] || ""),
                          fr: String((campaign.cta_label_by_language_json as Record<string, unknown> | null)?.["fr"] || ""),
                          en: String((campaign.cta_label_by_language_json as Record<string, unknown> | null)?.["en"] || ""),
                        },
                      })}>عدّل</Button>
                      <Button variant="secondary" onClick={() => duplicateCampaign(campaign.id)}>نسخة</Button>
                      <Button variant="secondary" onClick={() => deleteCampaign(campaign.id)}>أرشفة/حذف</Button>
                      <Button variant="secondary" onClick={() => previewCampaignRecipients(campaign.id)}>عاين المستافدين</Button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Select
                        value={campaignTestLanguageById[campaign.id] || "darija"}
                        onValueChange={(value) => setCampaignTestLanguageById((s) => ({ ...s, [campaign.id]: value as "darija" | "fr" | "en" }))}
                      >
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="لغة التيست" /></SelectTrigger>
                        <SelectContent><SelectItem value="darija">Darija</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                      </Select>
                      {systemStatus?.flags.campaign_test_send_enabled ? (
                        <Button
                          variant="secondary"
                          onClick={() => sendCampaignTest(campaign.id)}
                          disabled={
                            campaignTestSendingById[campaign.id] ||
                            systemStatus?.capabilities.campaign_test_send !== "ready"
                          }
                        >
                          {campaignTestSendingById[campaign.id] ? "كيتم الإرسال..." : "صيفط تيست"}
                        </Button>
                      ) : (
                        <Badge>تيست الحملة غير مفعّل</Badge>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => sendCampaignQueued(campaign.id, Number(campaign.estimated_recipient_count || 0))}
                        disabled={!systemStatus?.flags.allow_bulk_send}
                      >
                        صف للإرسال
                      </Button>
                    </div>
                    {campaignTestResultById[campaign.id] ? <p className="text-sm">{campaignTestResultById[campaign.id]}</p> : null}
                  </Card>
                ))}
                {campaigns.length === 0 ? <p className="text-sm text-[var(--muted)]">ما كايناش حملات دابا.</p> : null}
              </div>
              {campaignRecipientsPreview && selectedCampaignId ? (
                <Card className="space-y-2 p-3">
                  <p className="text-sm font-semibold">آخر معاينة للمستافدين</p>
                  {campaignRecipientsPreview.warnings.map((w) => <p key={w} className="text-sm text-amber-700">{w}</p>)}
                  {campaignRecipientsPreview.items.map((item) => (
                    <div key={item.user_id || item.lead_id || item.email} className="grid gap-2 rounded border border-[var(--border)] p-2 text-sm md:grid-cols-[1.2fr_1.2fr_auto_auto_1fr_auto] md:items-center">
                      <p>{item.display_name}</p>
                      <p>{item.email}</p>
                      <Badge>{item.detected_language}</Badge>
                      <Badge>{item.eligible ? "مؤهل" : "غير مؤهل"}</Badge>
                      <p>{item.skip_reason || item.reason}</p>
                      <Button variant="secondary" onClick={() => item.user_id && loadPreviewUserEmail(item.user_id)} disabled={!item.user_id}>عاين الإيميل</Button>
                    </div>
                  ))}
                </Card>
              ) : null}
            </Card>
          </TabsContent>
          <TabsContent value="recipients-preview">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">معاينة المستافدين</p>
                  <Badge>{systemStatus?.flags.recipient_preview_enabled ? "مفعّل" : "مطفّي"}</Badge>
                </div>
                <p className="text-sm text-amber-700">هادي غير معاينة، ما غادي يتصيفط حتى إيميل.</p>
                {!systemStatus?.flags.recipient_preview_enabled ? <p className="text-sm text-[var(--muted)]">Khass هاد التبويب غير للمعاينة، ما كيصيفط حتى إيميل.</p> : null}
                <Select value={previewAudienceType} onValueChange={(value) => setPreviewAudienceType(value as EmailCenterAudienceType)}>
                  <SelectTrigger><SelectValue placeholder="نوع الجمهور" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_users">all_users</SelectItem>
                    <SelectItem value="incomplete_onboarding">incomplete_onboarding</SelectItem>
                    <SelectItem value="no_transactions">no_transactions</SelectItem>
                    <SelectItem value="no_envelopes">no_envelopes</SelectItem>
                    <SelectItem value="by_language">by_language</SelectItem>
                    <SelectItem value="salary_today">salary_today</SelectItem>
                    <SelectItem value="salary_tomorrow">salary_tomorrow</SelectItem>
                    <SelectItem value="registration_leads_email_captured">الناس اللي بداو التسجيل وما كملوش</SelectItem>
                  </SelectContent>
                </Select>
                {previewAudienceType === "registration_leads_email_captured" ? (
                  <p className="text-sm text-amber-700">هاد الاختيار كيستهدف الناس اللي بداو التسجيل وما كملوش. الرسالة خاصها تكون خفيفة ومحترمة.</p>
                ) : null}
                <Select value={previewLanguage || "__none__"} onValueChange={(value) => setPreviewLanguage(value === "__none__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="اللغة (اختياري)" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">بلا فلتر اللغة</SelectItem><SelectItem value="darija">darija</SelectItem><SelectItem value="fr">fr</SelectItem><SelectItem value="en">en</SelectItem></SelectContent>
                </Select>
                <Select value={previewTemplateId || "__none__"} onValueChange={(value) => setPreviewTemplateId(value === "__none__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="قالب (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بلا قالب</SelectItem>
                    {templates.map((template) => (<SelectItem key={template.id} value={template.id}>{template.name} · {template.language}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Input type="number" min={1} max={200} placeholder="الحد الأقصى (200)" value={previewLimit} onChange={(e) => setPreviewLimit(Number(e.target.value || "50"))} />
                <Input placeholder="الموضوع (اختياري)" value={previewCompose.subject} onChange={(e) => setPreviewCompose((s) => ({ ...s, subject: e.target.value }))} />
                <Textarea placeholder="نص الإيميل (اختياري)" value={previewCompose.body} onChange={(e) => setPreviewCompose((s) => ({ ...s, body: e.target.value }))} rows={5} />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="نص الزر (اختياري)" value={previewCompose.cta_label} onChange={(e) => setPreviewCompose((s) => ({ ...s, cta_label: e.target.value }))} />
                  <Input placeholder="الرابط (اختياري)" value={previewCompose.cta_url} onChange={(e) => setPreviewCompose((s) => ({ ...s, cta_url: e.target.value }))} />
                </div>
                <Button onClick={runRecipientsPreview} disabled={!systemStatus?.flags.recipient_preview_enabled || recipientsLoading}>{recipientsLoading ? "خدام..." : "شغّل المعاينة"}</Button>
              </Card>
              <Card className="space-y-3 p-4">
                <p className="text-sm font-medium">شوف الإيميل</p>
                {previewEmail ? (
                  <div className="space-y-2 text-sm">
                    <p>{previewEmail.email} · {previewEmail.detected_language}</p>
                    <p>{previewEmail.subject}</p>
                    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded border border-[var(--border)] bg-white p-2">
                      <SafeHtmlFrame html={previewEmail.body_html} title="معاينة الإيميل" />
                    </div>
                  </div>
                ) : <p className="text-sm text-[var(--muted)]">اختار مستافد ومن بعد كليك على شوف الإيميل.</p>}
              </Card>
            </div>
            <Card className="mt-4 space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge>المجموع الموافق: {recipientsPreview?.total_matched ?? 0}</Badge>
                <Badge>الراجع: {recipientsPreview?.returned_count ?? 0}</Badge>
              </div>
              {recipientsPreview?.warnings?.length ? <div className="space-y-1">{recipientsPreview.warnings.map((warning) => <p key={warning} className="text-sm text-amber-700">{warning}</p>)}</div> : null}
              <div className="space-y-2">
                {recipientsPreview?.items?.map((item) => (
                  <div key={item.user_id || item.lead_id || item.email} className="grid gap-2 rounded border border-[var(--border)] p-3 text-sm md:grid-cols-[1.2fr_1.2fr_auto_1fr_1fr_auto] md:items-center">
                    <p>{item.display_name}</p>
                    <p>{item.email}</p>
                    <Badge>{item.detected_language}</Badge>
                    <Badge>{item.eligible ? "مؤهل" : "غير مؤهل"}</Badge>
                    <p>{item.skip_reason || item.reason}</p>
                    <Button variant="secondary" onClick={() => item.user_id && loadPreviewUserEmail(item.user_id)} disabled={previewEmailLoading || !item.user_id}>{previewEmailLoading ? "جاري التحميل..." : "شوف الإيميل"}</Button>
                  </div>
                ))}
                {recipientsPreview && recipientsPreview.items.length === 0 ? <p className="text-sm text-[var(--muted)]">ما كاين حتى مستافد مطابق.</p> : null}
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="registration-leads">
            <Card className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold">الناس اللي بداو التسجيل</p>
                <InfoHint label="معلومة">هاد اللائحة فيها الناس اللي بداو يصاوبو الحساب وما كملوش، وتقدر تستعملهم فاستهداف الإيميلات من بعد.</InfoHint>
              </div>
              <div className="grid gap-2 md:grid-cols-5">
                <Badge>المجموع: {registrationLeadsStats?.total ?? 0}</Badge>
                <Badge>عندهم الإيميل: {registrationLeadsStats?.email_captured ?? 0}</Badge>
                <Badge>ما كملوش: {registrationLeadsStats?.partial_no_email ?? 0}</Badge>
                <Badge>تحولو لحسابات: {registrationLeadsStats?.converted ?? 0}</Badge>
                <Badge>آخر 24 ساعة: {registrationLeadsStats?.last_24h ?? 0}</Badge>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="قلّب بالإيميل ولا الاسم ولا الهاتف" value={registrationLeadsQuery} onChange={(e) => setRegistrationLeadsQuery(e.target.value)} />
                <Select value={registrationLeadsStatusFilter || "__all__"} onValueChange={(value) => setRegistrationLeadsStatusFilter(value === "__all__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">الحالة</SelectItem>
                    <SelectItem value="partial">ما كملش</SelectItem>
                    <SelectItem value="email_captured">عندو الإيميل</SelectItem>
                    <SelectItem value="converted">تحول لحساب</SelectItem>
                    <SelectItem value="dismissed">تحيد من اللائحة</SelectItem>
                    <SelectItem value="blocked">مبلوكي</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="secondary" onClick={loadRegistrationLeads}>تحديث</Button>
              </div>
              <div className="space-y-2">
                {registrationLeads?.items?.map((lead) => (
                  <div key={lead.id} className="grid gap-2 rounded border border-[var(--border)] p-3 text-sm md:grid-cols-[1.2fr_1.2fr_1fr_auto_auto_auto] md:items-center">
                    <p>{[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "-"}</p>
                    <p>{lead.email || "-"}</p>
                    <p>{lead.phone || "-"}</p>
                    <Badge>{lead.current_step === 1 ? "المعلومات الأساسية" : lead.current_step === 2 ? "الإيميل وكلمة السر" : "مراحل متقدمة"}</Badge>
                    <Badge>{lead.status === "partial" ? "ما كملش" : lead.status === "email_captured" ? "عندو الإيميل" : lead.status === "converted" ? "تحوّل لحساب" : lead.status === "dismissed" ? "محيّد" : "مبلوكي"}</Badge>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setSelectedLeadId(lead.id)}>فتح التفاصيل</Button>
                      <Button variant="secondary" onClick={() => updateRegistrationLeadStatus(lead.id, "dismissed")}>تحييد من اللائحة</Button>
                      <Button variant="secondary" onClick={() => updateRegistrationLeadStatus(lead.id, "blocked")}>بلوكي</Button>
                    </div>
                  </div>
                ))}
                {registrationLeads && registrationLeads.items.length === 0 ? <p className="text-sm text-[var(--muted)]">ما كاين حتى واحد دابا.</p> : null}
              </div>
            </Card>
            <Drawer open={Boolean(selectedLeadId)} onOpenChange={(open) => !open && setSelectedLeadId("")}> 
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>تفاصيل المستافد</DrawerTitle>
                </DrawerHeader>
                {selectedLead ? (
                  <div className="mt-4 space-y-3 text-sm">
                    <p><strong>الاسم:</strong> {[selectedLead.first_name, selectedLead.last_name].filter(Boolean).join(" ") || "-"}</p>
                    <p><strong>الإيميل:</strong> {selectedLead.email || "-"}</p>
                    <p><strong>الهاتف:</strong> {selectedLead.phone || "-"}</p>
                    <p><strong>المرحلة:</strong> {selectedLead.current_step}</p>
                    <p><strong>المصدر:</strong> {String((selectedLead as Record<string, unknown>).source || "-")}</p>
                    <p><strong>آخر تحديث:</strong> {selectedLead.updated_at || "-"}</p>
                    <p><strong>ملاحظات:</strong> {String((selectedLead as Record<string, unknown>).note || "-")}</p>
                    <Badge>{selectedLead.email ? "يمكن الاستهداف بالإيميل" : "ما عندوش إيميل"}</Badge>
                  </div>
                ) : null}
              </DrawerContent>
            </Drawer>
          </TabsContent>
          <TabsContent value="templates">
            <Card className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{templatesEnabled ? "القوالب مفعّلة" : "القوالب مطفّية"}</Badge>
                <Button variant="secondary" onClick={() => loadQwaleb(templateLanguageFilter, templateCategoryFilter)} disabled={templatesLoading}>
                  {templatesLoading ? "كيتم التحديث..." : "حدّث الحالة"}
                </Button>
                <Button variant="secondary" onClick={seedDefaultTemplates} disabled={!templatesEnabled}>
                  ركّب القوالب الجاهزة
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <Select value={templateLanguageFilter || "__all__"} onValueChange={(value) => setTemplateLanguageFilter(value === "__all__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="اللغة" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">جميع اللغات</SelectItem><SelectItem value="darija">darija</SelectItem><SelectItem value="fr">fr</SelectItem><SelectItem value="en">en</SelectItem></SelectContent>
                </Select>
                <Select value={templateCategoryFilter || "__all__"} onValueChange={(value) => setTemplateCategoryFilter(value === "__all__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="الفئة" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">جميع الفئات</SelectItem><SelectItem value="welcome">welcome</SelectItem><SelectItem value="onboarding_reminder">onboarding_reminder</SelectItem><SelectItem value="salary_reminder">salary_reminder</SelectItem><SelectItem value="first_transaction">first_transaction</SelectItem><SelectItem value="envelope_setup">envelope_setup</SelectItem><SelectItem value="passkey_reminder">passkey_reminder</SelectItem><SelectItem value="monthly_checkin">monthly_checkin</SelectItem><SelectItem value="product_update">product_update</SelectItem><SelectItem value="maintenance">maintenance</SelectItem><SelectItem value="registration_reminder">registration_reminder</SelectItem><SelectItem value="custom">custom</SelectItem></SelectContent>
                </Select>
                <Button onClick={() => loadQwaleb(templateLanguageFilter, templateCategoryFilter)} disabled={templatesLoading}>طبّق الفلترات</Button>
              </div>

              <Card className="space-y-2 p-3">
                <p className="text-sm font-semibold">{templateEditor.id ? "عدّل القالب" : "قالب جديد"}</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="المفتاح (اختياري)" value={templateEditor.key} onChange={(e) => setTemplateEditor((s) => ({ ...s, key: e.target.value }))} />
                  <Input placeholder="الاسم" value={templateEditor.name} onChange={(e) => setTemplateEditor((s) => ({ ...s, name: e.target.value }))} />
                  <Select value={templateEditor.category} onValueChange={(value) => setTemplateEditor((s) => ({ ...s, category: value }))}>
                    <SelectTrigger><SelectValue placeholder="الفئة" /></SelectTrigger>
                    <SelectContent><SelectItem value="welcome">welcome</SelectItem><SelectItem value="onboarding_reminder">onboarding_reminder</SelectItem><SelectItem value="salary_reminder">salary_reminder</SelectItem><SelectItem value="first_transaction">first_transaction</SelectItem><SelectItem value="envelope_setup">envelope_setup</SelectItem><SelectItem value="passkey_reminder">passkey_reminder</SelectItem><SelectItem value="monthly_checkin">monthly_checkin</SelectItem><SelectItem value="product_update">product_update</SelectItem><SelectItem value="maintenance">maintenance</SelectItem><SelectItem value="registration_reminder">registration_reminder</SelectItem><SelectItem value="custom">custom</SelectItem></SelectContent>
                  </Select>
                  <Select value={templateEditor.language} onValueChange={(value) => setTemplateEditor((s) => ({ ...s, language: value }))}>
                    <SelectTrigger><SelectValue placeholder="اللغة" /></SelectTrigger>
                    <SelectContent><SelectItem value="darija">darija</SelectItem><SelectItem value="fr">fr</SelectItem><SelectItem value="en">en</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="الموضوع" value={templateEditor.subject} onChange={(e) => setTemplateEditor((s) => ({ ...s, subject: e.target.value }))} />
                  <Input placeholder="نص المعاينة (اختياري)" value={templateEditor.preview_text} onChange={(e) => setTemplateEditor((s) => ({ ...s, preview_text: e.target.value }))} />
                </div>
                <Textarea placeholder="نص الإيميل" value={templateEditor.body} onChange={(e) => setTemplateEditor((s) => ({ ...s, body: e.target.value }))} rows={6} />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="نص الزر" value={templateEditor.cta_label} onChange={(e) => setTemplateEditor((s) => ({ ...s, cta_label: e.target.value }))} />
                  <Input placeholder="الرابط" value={templateEditor.cta_url} onChange={(e) => setTemplateEditor((s) => ({ ...s, cta_url: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2"><Checkbox checked={templateEditor.is_active} onCheckedChange={(checked) => setTemplateEditor((s) => ({ ...s, is_active: Boolean(checked) }))} /><p className="text-sm">مفعّل</p></div>
                <div className="flex gap-2">
                  <Button onClick={saveTemplate} disabled={!templatesEnabled || savingTemplate}>{savingTemplate ? "كيتم الحفظ..." : templateEditor.id ? "حفظ القالب" : "قالب جديد"}</Button>
                  <Button variant="secondary" onClick={() => setTemplateEditor({ id: "", key: "", name: "", category: "custom", language: "fr", subject: "", preview_text: "", body: "", cta_label: "", cta_url: "", is_active: true })}>إلغاء</Button>
                </div>
              </Card>

              <div className="space-y-2">
                {templates.map((template) => (
                  <Card key={template.id} className="space-y-2 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{template.name}</p>
                      <div className="flex gap-2">
                        <Badge>{template.language}</Badge>
                        <Badge>{template.category}</Badge>
                        <Badge>{template.is_active ? "مفعّل" : "غير مفعّل"}</Badge>
                      </div>
                    </div>
                    <p className="text-sm">{template.subject}</p>
                    <p className="text-xs text-[var(--muted)]">{template.preview_text || ""}</p>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setTemplateEditor({
                        id: template.id, key: template.key || "", name: template.name, category: template.category, language: template.language, subject: template.subject, preview_text: template.preview_text || "", body: template.body, cta_label: template.cta_label || "", cta_url: template.cta_url || "", is_active: template.is_active,
                      })}>عدّل</Button>
                      <Button variant="secondary" onClick={() => deactivateTemplate(template.id)} disabled={!templatesEnabled}>عطّل القالب</Button>
                    </div>
                  </Card>
                ))}
                {templates.length === 0 ? <p className="text-sm text-[var(--muted)]">ما كاين حتى قالب.</p> : null}
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="system-status">
            <Card className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">حالة النظام</p>
                  <InfoHint label="معلومة">هنا كتشوف واش إعدادات الإيميلات خدامة مزيان.</InfoHint>
                </div>
                <Button onClick={loadSystemStatus} disabled={systemStatusLoading}>{systemStatusLoading ? "كيتم التحديث..." : "حدّث الحالة"}</Button>
              </div>
              {systemStatusError ? <p className="text-sm text-red-600">ما قدرناش نجيبو حالة النظام دابا. {systemStatusError}</p> : null}
              {systemStatus ? (
                <div className="grid gap-4">
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">وضع التشغيل</p>
                    <p className="text-sm">وضع التشغيل: <Badge>{systemStatus.mode}</Badge></p>
                    <p className="text-sm text-[var(--muted)]">{modeExplanation}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {statusBadge(systemStatus.flags.allow_user_send, "مفعّل")}
                      <Badge>{systemStatus.flags.allow_bulk_send ? "مفعّل" : "محظور"}</Badge>
                      <Badge>{systemStatus.flags.allow_scheduling ? "مفعّل" : "محظور"}</Badge>
                      <Badge>{systemStatus.flags.allow_salary_reminders ? "مفعّل" : "محظور"}</Badge>
                      <Badge>{systemStatus.flags.ai_suggestions_enabled ? "مفعّل" : "مطفّي"}</Badge>
                      <Badge>{systemStatus.flags.allow_open_tracking ? "مفعّل" : "مطفّي"}</Badge>
                      <Badge>{systemStatus.flags.allow_click_tracking ? "مفعّل" : "مطفّي"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">مزوّد الإيميلات</p>
                    <p className="text-sm">المزوّد: {systemStatus.mail_provider.provider}</p>
                    <p className="text-sm">المرسل: {systemStatus.mail_provider.from_email}</p>
                    <div className="flex gap-2 text-sm">
                      <Badge>{systemStatus.mail_provider.api_base_configured ? "سليم" : "ناقص"}</Badge>
                      <Badge>{systemStatus.mail_provider.token_configured ? "سليم" : "ناقص"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">قاعدة البيانات</p>
                    <div className="flex gap-2 text-sm">
                      <Badge>{systemStatus.database.email_design_settings_table ? "سليم" : "ناقص"}</Badge>
                      <Badge>{systemStatus.database.email_deliveries_table ? "سليم" : "ناقص"}</Badge>
                    </div>
                    {systemStatus.database.error ? <p className="text-xs text-red-600">خطأ ففحص قاعدة البيانات: {systemStatus.database.error}</p> : null}
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">القدرات</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge>{systemStatus.capabilities.send_test ? "سليم" : "مطفّي"}</Badge>
                      <Badge>{systemStatus.capabilities.design_settings ? "سليم" : "مطفّي"}</Badge>
                      <Badge>{systemStatus.capabilities.history ? "سليم" : "مطفّي"}</Badge>
                      <Badge>{systemStatus.capabilities.user_search ? "سليم" : "مطفّي"}</Badge>
                      <Badge>{systemStatus.capabilities.user_preview ? "سليم" : "مطفّي"}</Badge>
                      <Badge>{systemStatus.capabilities.send_user ? "مفعّل" : "مطفّي"}</Badge>
                      <Badge>{systemStatus.capabilities.bulk_send ? "مفعّل" : "محظور"}</Badge>
                      <Badge>{systemStatus.capabilities.scheduling ? "مفعّل" : "محظور"}</Badge>
                      <Badge>{systemStatus.capabilities.salary_reminders ? "مفعّل" : "محظور"}</Badge>
                      <Badge>{systemStatus.capabilities.ai_suggestions ? "مفعّل" : "مطفّي"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">الذكاء الاصطناعي</p>
                    <p className="text-sm">الحالة: <Badge>{systemStatus.ai.ai_capability}</Badge></p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge>{systemStatus.ai.ai_suggestions_enabled ? "مفعّل" : "مطفّي"}</Badge>
                      <Badge>{systemStatus.ai.ai_gateway_configured ? "سليم" : "خاصو إعداد"}</Badge>
                      <Badge>{systemStatus.ai.ai_default_model_configured ? "سليم" : "خاصو إعداد"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">القوالب</p>
                    <p className="text-sm">الحالة: <Badge>{systemStatus.templates.templates_capability}</Badge></p>
                    <p className="text-sm">المجموع: {systemStatus.templates.templates_count} · مفعّل: {systemStatus.templates.active_templates_count}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge>{systemStatus.templates.templates_enabled ? "مفعّل" : "مطفّي"}</Badge>
                      <Badge>{systemStatus.capabilities.templates ? "جاهز" : "خاصو إعداد"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">الأمان</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge>{systemStatus.safety.bulk_send_blocked ? "محظور" : "مفعّل"}</Badge>
                      <Badge>{systemStatus.safety.scheduling_blocked ? "محظور" : "مفعّل"}</Badge>
                      <Badge>{systemStatus.safety.salary_reminders_blocked ? "محظور" : "مفعّل"}</Badge>
                      <Badge>{systemStatus.safety.test_recipient_configured ? "سليم" : "ناقص"}</Badge>
                      <Badge>{systemStatus.safety.production_send_enabled ? "مفعّل" : "مطفّي"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">الإحصائيات</p>
                    <p className="text-sm">المجموع: {systemStatus.stats.total_deliveries}</p>
                    <p className="text-sm">فانتظار الإرسال: {systemStatus.stats.pending} · تصيفط: {systemStatus.stats.sent} · فشل: {systemStatus.stats.failed} · تجاوز: {systemStatus.stats.skipped}</p>
                    <p className="text-sm">آخر إرسال: {systemStatus.stats.latest_delivery_at || "ما كاينش"}</p>
                  </Card>
                </div>
              ) : null}
            </Card>
          </TabsContent>
          <TabsContent value="design">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">التصميم</p>
                  <InfoHint label="معلومة">من هنا تقدر تبدّل الشكل العام ديال الإيميلات.</InfoHint>
                </div>
                <Input placeholder="اسم المنصة" value={design.brand_name} onChange={(e) => setDesign((s) => ({ ...s, brand_name: e.target.value }))} />
                <Input placeholder="رابط الشعار" value={design.logo_url} onChange={(e) => setDesign((s) => ({ ...s, logo_url: e.target.value }))} />
                <div className="rounded-2xl border border-[var(--border)] p-3">
                  <p className="mb-2 text-sm text-[var(--muted)]">ولا حمّل الشعار مباشرة:</p>
                  <Input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={uploadLogo} disabled={logoUploading} />
                  {logoUploading ? <p className="mt-2 text-xs text-[var(--muted)]">كيتم رفع الشعار...</p> : null}
                </div>
                <Input placeholder="اللون الرئيسي" value={design.primary_color} onChange={(e) => setDesign((s) => ({ ...s, primary_color: e.target.value }))} />
                <Input placeholder="لون الزر" value={design.button_color} onChange={(e) => setDesign((s) => ({ ...s, button_color: e.target.value }))} />
                <Textarea placeholder="التذييل" value={design.footer_text} onChange={(e) => setDesign((s) => ({ ...s, footer_text: e.target.value }))} rows={3} />
                <Input placeholder="رابط الدعم" value={design.support_email} onChange={(e) => setDesign((s) => ({ ...s, support_email: e.target.value }))} />
                <Button onClick={saveDesign} disabled={savingDesign}>{savingDesign ? "كيتم الحفظ..." : "حفظ التصميم"}</Button>
              </Card>
              <Card className="p-4">
                <p className="mb-2 text-sm font-medium">عاين النتيجة</p>
                <SafeHtmlFrame html={previewHtml.html} dir={previewHtml.dir} title="معاينة التصميم" />
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="history"><Card className="space-y-2 p-4"><div className="mb-2 flex items-center gap-2"><p className="text-sm font-semibold">التاريخ</p><InfoHint label="معلومة">هنا كتشوف شنو تصيفط، لمين، وفاش، وبأي نتيجة.</InfoHint></div>{history?.items?.length ? history.items.map((item) => (<div key={item.id} className="rounded-lg border border-[var(--border)] p-3 text-sm"><p><strong>الحالة:</strong> {item.status}</p><p><strong>المستافد:</strong> {item.email}</p><p><strong>شكون صيفط:</strong> {item.recipient_user_id || "-"}</p><p><strong>نوع الإرسال:</strong> {item.original_recipient_email || item.email}</p><p><strong>اللغة:</strong> {item.language}</p><p><strong>الموضوع:</strong> {item.subject}</p>{item.note ? <p><strong>الملاحظات:</strong> {item.note}</p> : null}{item.error_message ? <p><strong>الخطأ:</strong> {item.error_message}</p> : null}<p className="text-[var(--muted)]"><strong>التاريخ:</strong> {item.created_at}</p></div>)) : <p className="text-sm text-[var(--muted)]">ما كاين حتى إرسال باقي</p>}</Card></TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
