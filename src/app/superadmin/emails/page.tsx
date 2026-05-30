"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
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
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
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

  const modeWarning = useMemo(() => {
    if (!status) return "";
    if (status.mode === "test_only") return "Irsal l-user mssedoud f mode test_only.";
    if (status.mode === "superadmin_only") return "Mode amin: had email ghadi ymchi ghir l-email test, machi l-user الحقيقي.";
    return "Had email ghadi ymchi l-user الحقيقي.";
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
      setSystemStatusError(err instanceof Error ? err.message : "Ma9drnach njibou halat nizam");
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
        setPayload((current) => ({ ...current, to: current.to || statusData.test_recipient_email || "" }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ma9drnach n7emlou Markaz l-Emails");
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
      setError(err instanceof Error ? err.message : "Ma9drnach n7afdou design");
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
      setSendResult(result.status === "sent" ? "Tsift l-email بنجاح." : `Ntiija dyal l-email: ${result.status}${result.error_message ? ` (${result.error_message})` : ""}`);
      await refreshHistory();
    } catch (err) {
      setSendResult(err instanceof Error ? err.message : "Ma9drnach nsifto l-email");
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
      setUserSendResult(result.status === "sent" ? "Tsift l-email l-user بنجاح." : `Ntiija dyal l-email: ${result.status}${result.error_message ? ` (${result.error_message})` : ""}`);
      await refreshHistory();
    } catch (err) {
      setUserSendResult(err instanceof Error ? err.message : "Ma9drnach nsifto l-email l-user");
    } finally {
      setUserSending(false);
    }
  };

  const previewHtml = useMemo(() => {
    const escapedBody = payload.body.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br/>");
    return {
      __html: `<div style="font-family:Arial,sans-serif;border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#fff;max-width:620px;"><div style="color:${design.primary_color};font-size:20px;font-weight:700;margin-bottom:8px;">${design.brand_name}</div><div style="margin-bottom:8px;font-size:18px;font-weight:600;">${payload.subject || "Mo3ayana dyal l-3onwan"}</div><div style="line-height:1.6;color:#1e293b;">${escapedBody || "Mo3ayana dyal l-matn"}</div>${payload.cta_url ? `<a href="${payload.cta_url}" style="display:inline-block;margin-top:12px;padding:10px 14px;background:${design.button_color};color:#fff;text-decoration:none;border-radius:8px;">${payload.cta_label || "Hll"}</a>` : ""}<hr style="margin:14px 0;border:none;border-top:1px solid #e2e8f0;"/><div style="font-size:12px;color:#64748b;">${design.footer_text}</div><div style="font-size:12px;color:#64748b;">${design.support_email}</div></div>`,
    };
  }, [design, payload]);

  const modeExplanation = useMemo(() => {
    if (!systemStatus) return "";
    if (systemStatus.mode === "test_only") {
      return "test_only: ghir email test اللي ي9der ytsel emails";
    }
    if (systemStatus.mode === "superadmin_only") {
      return "superadmin_only: kayt7der l-email 3la 7sab user mkhtar walakin kaytsift ghir l-email test";
    }
    return "production: kaytsift l-users الحقيقيين";
  }, [systemStatus]);

  const statusBadge = (value: boolean, positiveLabel = "Active") => (
    <Badge>{value ? positiveLabel : "Disabled"}</Badge>
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
      setAiSuggestErrorTest(err instanceof Error ? err.message : "AI suggestion failed");
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
      setAiSuggestErrorUser(err instanceof Error ? err.message : "AI suggestion failed");
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
      setError(err instanceof Error ? err.message : "Unable to save template");
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
      setError(err instanceof Error ? err.message : "Unable to delete template");
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
      setError(err instanceof Error ? err.message : "Unable to seed templates");
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
      setError(err instanceof Error ? err.message : "Unable to run recipients preview");
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
      setError(err instanceof Error ? err.message : "Unable to preview user email");
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
      setError("Campaign title is required");
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
      setError(err instanceof Error ? err.message : "Unable to save campaign");
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
      setError(err instanceof Error ? err.message : "Unable to delete campaign");
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
      setError(err instanceof Error ? err.message : "Unable to duplicate campaign");
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
      setError(err instanceof Error ? err.message : "Unable to preview recipients");
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
        [campaignId]: result.status === "sent" ? "Campaign test sent to configured test inbox." : `Campaign test result: ${result.status}${result.error_message ? ` (${result.error_message})` : ""}`,
      }));
      await refreshHistory();
      await loadSystemStatus();
    } catch (err) {
      setCampaignTestResultById((s) => ({ ...s, [campaignId]: err instanceof Error ? err.message : "Campaign test send failed" }));
    } finally {
      setCampaignTestSendingById((s) => ({ ...s, [campaignId]: false }));
    }
  };

  const sendCampaignQueued = async (campaignId: string, recipients: number) => {
    const confirmation = window.prompt(`You are about to queue emails for ${recipients} recipients. Type SEND to confirm.`);
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
      body: { email: suppressionEmail, reason: suppressionReason, source: "manual" },
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card className="space-y-2 p-4">
        <h1 className="text-xl font-semibold">Markaz l-Emails</h1>
        <p className="text-sm text-[var(--muted)]">Markaz dyal l'emails (Admin). Ma kayn la bulk send mftouh, la scheduling, la automation.</p>
      </Card>
      {loading ? <p className="text-sm text-[var(--muted)]">Kayt7emmel…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Nadra 3amma</TabsTrigger>
            <TabsTrigger value="compose">Kteb Test</TabsTrigger>
            <TabsTrigger value="compose-user">Kteb l-Mostakhdem</TabsTrigger>
            <TabsTrigger value="templates">Qwaleb</TabsTrigger>
            <TabsTrigger value="campaigns">Hamalat</TabsTrigger>
            <TabsTrigger value="recipients-preview">Mo3ayana dyal Mostafidin</TabsTrigger>
            <TabsTrigger value="suppressions">Liste dyal l-Man3</TabsTrigger>
            <TabsTrigger value="delivery-queue">Saff dyal l-Irsal</TabsTrigger>
            <TabsTrigger value="system-status">Halat Nizam</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="history">Tarikh</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><Card className="space-y-3 p-4"><div className="flex flex-wrap items-center gap-2"><Badge>{status?.mode || "unknown"}</Badge><Badge>{status?.provider || "unknown"}</Badge><Badge>{status?.kill_switch ? "Kill switch Mcha3el" : "Kill switch مطفي"}</Badge></div><p className="text-sm">Mcha3el: {String(status?.enabled ?? false)}</p><p className="text-sm">From: {status?.mail_from || ""}</p><p className="text-sm">Email test: {status?.test_recipient_email || "(not set)"}</p><p className="text-sm">Irsal l-user mssmouh: {String(status?.allow_user_send ?? false)}</p><p className="text-sm text-amber-700">{modeWarning}</p></Card></TabsContent>
          <TabsContent value="compose">
            <Card className="space-y-3 p-4">
              <Input placeholder="To" value={payload.to} onChange={(e) => setPayload((s) => ({ ...s, to: e.target.value }))} />
              <Select value={payload.language} onValueChange={(value) => setPayload((s) => ({ ...s, language: value }))}>
                <SelectTrigger><SelectValue placeholder="Logha" /></SelectTrigger>
                <SelectContent><SelectItem value="darija">Darija</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
              </Select>
              <Select value={selectedTemplateIdTest || "__none__"} onValueChange={(value) => applyTemplateToTest(value === "__none__" ? "" : value)}>
                <SelectTrigger><SelectValue placeholder="St3mel template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Bla template</SelectItem>
                  {filteredTemplatesForTest.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.name} · {template.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded border border-[var(--border)] p-3">
                <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">اقتراح AI</p><Badge>{aiDisabled ? "AI msddoud" : aiMissingConfig ? "AI Gateway ma mconfigurich" : "Wajed"}</Badge></div>
                <Textarea placeholder="Lhadaf dyal had email" value={aiGoalTest} onChange={(e) => setAiGoalTest(e.target.value)} rows={3} />
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <Select value={aiToneTest} onValueChange={(value) => setAiToneTest(value as "friendly" | "professional" | "motivational" | "short")}><SelectTrigger><SelectValue placeholder="Nabra" /></SelectTrigger><SelectContent><SelectItem value="friendly">friendly</SelectItem><SelectItem value="professional">professional</SelectItem><SelectItem value="motivational">motivational</SelectItem><SelectItem value="short">short</SelectItem></SelectContent></Select>
                  <Input placeholder="Ishara l-CTA (ikhtiyari)" value={aiCtaLabelHintTest} onChange={(e) => setAiCtaLabelHintTest(e.target.value)} />
                </div>
                <div className="mt-2 flex gap-2"><Button onClick={suggestForTest} disabled={aiDisabled || aiMissingConfig || aiSuggestLoadingTest || !aiGoalTest.trim()}>{aiSuggestLoadingTest ? "Kayfakker..." : "Jib i9tira7 b AI"}</Button>{aiSuggestionTest ? <Button variant="secondary" onClick={suggestForTest} disabled={aiSuggestLoadingTest}>3awed l-i9tira7</Button> : null}{aiSuggestionTest ? <Button variant="secondary" onClick={() => setAiSuggestionTest(null)}>Ilgha2</Button> : null}</div>
                {aiSuggestErrorTest ? <p className="mt-2 text-sm text-red-600">{aiSuggestErrorTest}</p> : null}
                {aiSuggestionTest ? <div className="mt-3 rounded border border-[var(--border)] p-3 text-sm"><p><strong>Subject:</strong> {aiSuggestionTest.subject}</p><p><strong>Mo3ayana:</strong> {aiSuggestionTest.preview_text || "-"}</p><p className="whitespace-pre-wrap"><strong>Body:</strong>{"\n"}{aiSuggestionTest.body}</p><p><strong>CTA:</strong> {aiSuggestionTest.cta_label}</p><Button className="mt-2" onClick={() => setPayload((s) => ({ ...s, subject: aiSuggestionTest.subject, body: aiSuggestionTest.body, cta_label: aiSuggestionTest.cta_label }))}>Tb9 i9tira7</Button></div> : null}
              </div>
              <Input placeholder="L3onwan" value={payload.subject} onChange={(e) => setPayload((s) => ({ ...s, subject: e.target.value }))} />
              <Textarea placeholder="Lmatn" value={payload.body} onChange={(e) => setPayload((s) => ({ ...s, body: e.target.value }))} rows={8} />
              <Input placeholder="Nass CTA" value={payload.cta_label} onChange={(e) => setPayload((s) => ({ ...s, cta_label: e.target.value }))} />
              <Input placeholder="Rabeta CTA" value={payload.cta_url} onChange={(e) => setPayload((s) => ({ ...s, cta_url: e.target.value }))} />
              <Button onClick={sendTest} disabled={!canSend}>{sending ? "Kaytsift…" : "Sift test"}</Button>
              {sendResult ? <p className="text-sm">{sendResult}</p> : null}
            </Card>
          </TabsContent>
          <TabsContent value="suppressions">
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">Liste dyal l-Man3</p><Badge>{systemStatus?.flags.suppression_enabled ? "Enabled" : "Disabled"}</Badge></div>
              {!systemStatus?.flags.suppression_enabled ? <p className="text-sm text-[var(--muted)]">Liste l-man3 msdouda b EMAIL_CENTER_SUPPRESSION_ENABLED.</p> : null}
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="email@example.com" value={suppressionEmail} onChange={(e) => setSuppressionEmail(e.target.value)} disabled={!systemStatus?.flags.suppression_enabled} />
                <Input placeholder="reason" value={suppressionReason} onChange={(e) => setSuppressionReason(e.target.value)} disabled={!systemStatus?.flags.suppression_enabled} />
                <Button onClick={addSuppression} disabled={!suppressionEmail.trim() || !systemStatus?.flags.suppression_enabled}>Zid man3</Button>
              </div>
              {suppressions?.items.map((item) => (<div key={item.id} className="flex items-center justify-between rounded border border-[var(--border)] p-2 text-sm"><p>{item.email} · {item.reason}</p><Button variant="secondary" onClick={() => deactivateSuppression(item.id)} disabled={!systemStatus?.flags.suppression_enabled}>Hyed l-man3</Button></div>))}
            </Card>
          </TabsContent>
          <TabsContent value="delivery-queue">
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">Saff dyal l-Irsal</p><Badge>{systemStatus?.flags.delivery_queue_enabled ? "Enabled" : "Disabled"}</Badge></div>
              <p className="text-sm text-[var(--muted)]">Hada kay3alej emails f saff b batchat sghar.</p>
              <p className="text-sm">Pending: {queueStatus?.pending_count ?? 0} · Retry: {queueStatus?.retry_count ?? 0} · Failed: {queueStatus?.failed_count ?? 0}</p>
              <div className="flex gap-2"><Input type="number" value={queueProcessLimit} onChange={(e) => setQueueProcessLimit(Number(e.target.value || "20"))} /><Button onClick={processQueue} disabled={!systemStatus?.flags.delivery_queue_enabled}>3alej batch</Button></div>
            </Card>
          </TabsContent>
          <TabsContent value="compose-user">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-3 p-4">
                <p className="text-sm text-amber-700">{modeWarning}</p>
                <div className="flex gap-2">
                  <Input placeholder="Qelleb 3la user b smiya wla email" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} />
                  <Button onClick={searchUsers} disabled={searchingUsers}>{searchingUsers ? "Kayqelleb…" : "Qelleb"}</Button>
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
                    <p className="font-medium">User mkhtar</p>
                    <p>{selectedUser.display_name}</p>
                    <p>{selectedUser.email}</p>
                    <p>Logha: {selectedUser.detected_language}</p>
                  </div>
                ) : null}
                <Select value={selectedTemplateIdUser || "__none__"} onValueChange={(value) => applyTemplateToUser(value === "__none__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="St3mel template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Bla template</SelectItem>
                    {filteredTemplatesForUser.map((template) => (
                      <SelectItem key={template.id} value={template.id}>{template.name} · {template.category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="rounded border border-[var(--border)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">اقتراح AI</p>
                    <Badge>{aiDisabled ? "AI msddoud" : aiMissingConfig ? "AI Gateway ma mconfigurich" : "Wajed"}</Badge>
                  </div>
                  <Textarea placeholder="Lhadaf dyal had email" value={aiGoalUser} onChange={(e) => setAiGoalUser(e.target.value)} rows={3} />
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <Select value={aiLanguageUser} onValueChange={(value) => setAiLanguageUser(value as "darija" | "fr" | "en")}>
                      <SelectTrigger><SelectValue placeholder="Logha" /></SelectTrigger>
                      <SelectContent><SelectItem value="darija">Darija</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                    </Select>
                    <Select value={aiToneUser} onValueChange={(value) => setAiToneUser(value as "friendly" | "professional" | "motivational" | "short")}>
                      <SelectTrigger><SelectValue placeholder="Nabra" /></SelectTrigger>
                      <SelectContent><SelectItem value="friendly">friendly</SelectItem><SelectItem value="professional">professional</SelectItem><SelectItem value="motivational">motivational</SelectItem><SelectItem value="short">short</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <Input className="mt-2" placeholder="Ishara l-CTA (ikhtiyari)" value={aiCtaLabelHintUser} onChange={(e) => setAiCtaLabelHintUser(e.target.value)} />
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox checked={personalizeWithFirstName} onCheckedChange={(checked) => setPersonalizeWithFirstName(Boolean(checked))} />
                    <p className="text-sm">Personalize with first name</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button onClick={suggestForUser} disabled={aiDisabled || aiMissingConfig || aiSuggestLoadingUser || !selectedUser || !aiGoalUser.trim()}>{aiSuggestLoadingUser ? "Kayfakker..." : "Jib i9tira7 b AI"}</Button>
                    {aiSuggestionUser ? <Button variant="secondary" onClick={suggestForUser} disabled={aiSuggestLoadingUser}>3awed l-i9tira7</Button> : null}
                    {aiSuggestionUser ? <Button variant="secondary" onClick={() => setAiSuggestionUser(null)}>Ilgha2</Button> : null}
                  </div>
                  {aiSuggestErrorUser ? <p className="mt-2 text-sm text-red-600">{aiSuggestErrorUser}</p> : null}
                  {aiSuggestionUser ? <div className="mt-3 rounded border border-[var(--border)] p-3 text-sm"><p><strong>Subject:</strong> {aiSuggestionUser.subject}</p><p><strong>Mo3ayana:</strong> {aiSuggestionUser.preview_text || "-"}</p><p className="whitespace-pre-wrap"><strong>Body:</strong>{"\n"}{aiSuggestionUser.body}</p><p><strong>CTA:</strong> {aiSuggestionUser.cta_label}</p><Button className="mt-2" onClick={() => setUserCompose((s) => ({ ...s, subject: aiSuggestionUser.subject, body: aiSuggestionUser.body, cta_label: aiSuggestionUser.cta_label }))}>Tb9 i9tira7</Button></div> : null}
                </div>
                <Input placeholder="L3onwan" value={userCompose.subject} onChange={(e) => setUserCompose((s) => ({ ...s, subject: e.target.value }))} />
                <Textarea placeholder="Lmatn" value={userCompose.body} onChange={(e) => setUserCompose((s) => ({ ...s, body: e.target.value }))} rows={8} />
                <Input placeholder="Nass CTA" value={userCompose.cta_label} onChange={(e) => setUserCompose((s) => ({ ...s, cta_label: e.target.value }))} />
                <Input placeholder="Rabeta CTA" value={userCompose.cta_url} onChange={(e) => setUserCompose((s) => ({ ...s, cta_url: e.target.value }))} />
                <div className="flex gap-2">
                  <Button onClick={loadUserPreview} disabled={!selectedUser || previewLoading || !userCompose.subject.trim() || !userCompose.body.trim()}>{previewLoading ? "Kayjib l-mo3ayana…" : "Mo3ayana"}</Button>
                  <Button onClick={sendUser} disabled={!canSendUser || !status?.allow_user_send || status?.mode === "test_only"}>{userSending ? "Kaytsift…" : "Sift l had user"}</Button>
                </div>
                {userSendResult ? <p className="text-sm">{userSendResult}</p> : null}
              </Card>
              <Card className="p-4">
                <p className="mb-2 text-sm font-medium">Mo3ayana dyal user</p>
                {userPreview ? (
                  <div className="space-y-2 text-sm">
                    <p>User cible: {userPreview.display_name} ({userPreview.email})</p>
                    <p>Logha: {userPreview.detected_language}</p>
                    <div dangerouslySetInnerHTML={{ __html: userPreview.body_html }} />
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">Select a user and click Mo3ayana.</p>
                )}
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="campaigns">
            <Card className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Msawdat l-hamalat</p>
                <Badge>{systemStatus?.flags.campaigns_enabled ? "Enabled" : "Disabled"}</Badge>
              </div>
              <p className="text-sm text-amber-700">Campaign drafts do not send emails. Bulk sending is not enabled yet.</p>
              <p className="text-sm text-[var(--muted)]">This sends only to the configured test inbox.</p>
              {!systemStatus?.flags.campaigns_enabled ? <p className="text-sm text-[var(--muted)]">Khass EMAIL_CENTER_CAMPAIGNS_ENABLED=true باش tdir hamalat.</p> : null}
              {!systemStatus?.flags.campaign_test_send_enabled ? <p className="text-sm text-[var(--muted)]">Campaign test send is disabled by EMAIL_CENTER_CAMPAIGN_TEST_SEND_ENABLED.</p> : null}
              {systemStatus?.capabilities.campaign_test_send === "blocked_by_kill_switch" ? <p className="text-sm text-red-600">Campaign test send blocked: kill switch is ON.</p> : null}
              {systemStatus?.capabilities.campaign_test_send === "missing_test_recipient" ? <p className="text-sm text-red-600">Campaign test send blocked: EMAIL_CENTER_TEST_RECIPIENT_EMAIL is missing.</p> : null}
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="3onwan l-hamla" value={campaignEditor.title} onChange={(e) => setCampaignEditor((s) => ({ ...s, title: e.target.value }))} />
                <Select value={campaignEditor.audience_type} onValueChange={(value) => setCampaignEditor((s) => ({ ...s, audience_type: value as EmailCenterAudienceType }))}>
                  <SelectTrigger><SelectValue placeholder="No3 l-audience" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_users">all_users</SelectItem>
                    <SelectItem value="incomplete_onboarding">incomplete_onboarding</SelectItem>
                    <SelectItem value="no_transactions">no_transactions</SelectItem>
                    <SelectItem value="no_envelopes">no_envelopes</SelectItem>
                    <SelectItem value="by_language">by_language</SelectItem>
                    <SelectItem value="salary_today">salary_today</SelectItem>
                    <SelectItem value="salary_tomorrow">salary_tomorrow</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={campaignEditor.language_mode} onValueChange={(value) => setCampaignEditor((s) => ({ ...s, language_mode: value as "auto" | "darija" | "fr" | "en" }))}>
                  <SelectTrigger><SelectValue placeholder="Mode dyal logha" /></SelectTrigger>
                  <SelectContent><SelectItem value="auto">auto</SelectItem><SelectItem value="darija">darija</SelectItem><SelectItem value="fr">fr</SelectItem><SelectItem value="en">en</SelectItem></SelectContent>
                </Select>
                <Select value={campaignEditor.template_id || "__none__"} onValueChange={(value) => setCampaignEditor((s) => ({ ...s, template_id: value === "__none__" ? "" : value }))}>
                  <SelectTrigger><SelectValue placeholder="Template (ikhtiyari)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Bla template</SelectItem>
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
                      <Input placeholder={`CTA label ${lang}`} value={campaignEditor.cta_label_by_language_json[lang]} onChange={(e) => setCampaignEditor((s) => ({ ...s, cta_label_by_language_json: { ...s.cta_label_by_language_json, [lang]: e.target.value } }))} />
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="space-y-2 p-3">
                  <Input placeholder="L3onwan" value={campaignEditor.subject_by_language_json[campaignEditor.language_mode]} onChange={(e) => setCampaignEditor((s) => ({ ...s, subject_by_language_json: { ...s.subject_by_language_json, [campaignEditor.language_mode]: e.target.value } }))} />
                  <Textarea placeholder="Lmatn" value={campaignEditor.body_by_language_json[campaignEditor.language_mode]} onChange={(e) => setCampaignEditor((s) => ({ ...s, body_by_language_json: { ...s.body_by_language_json, [campaignEditor.language_mode]: e.target.value } }))} rows={4} />
                  <Input placeholder="Nass CTA" value={campaignEditor.cta_label_by_language_json[campaignEditor.language_mode]} onChange={(e) => setCampaignEditor((s) => ({ ...s, cta_label_by_language_json: { ...s.cta_label_by_language_json, [campaignEditor.language_mode]: e.target.value } }))} />
                </Card>
              )}
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Rabeta CTA" value={campaignEditor.cta_url} onChange={(e) => setCampaignEditor((s) => ({ ...s, cta_url: e.target.value }))} />
                <Select value={campaignEditor.status} onValueChange={(value) => setCampaignEditor((s) => ({ ...s, status: value as "draft" | "ready" | "archived" }))}>
                  <SelectTrigger><SelectValue placeholder="Lhala" /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">draft</SelectItem><SelectItem value="ready">ready</SelectItem><SelectItem value="archived">archived</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveCampaign} disabled={!systemStatus?.flags.campaigns_enabled}>{campaignEditor.id ? "Update draft" : "Save draft"}</Button>
                <Button variant="secondary" onClick={() => setCampaignEditor({ id: "", title: "", audience_type: "all_users", language_mode: "auto", template_id: "", cta_url: "", status: "draft", subject_by_language_json: { darija: "", fr: "", en: "" }, body_by_language_json: { darija: "", fr: "", en: "" }, cta_label_by_language_json: { darija: "", fr: "", en: "" } })}>Clear</Button>
                <Button variant="secondary" onClick={loadHamalat} disabled={campaignsLoading}>{campaignsLoading ? "3awed tahdithing..." : "3awed tahdith"}</Button>
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
                    <p className="text-xs text-[var(--muted)]">Created: {campaign.created_at}</p>
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
                      })}>Edit</Button>
                      <Button variant="secondary" onClick={() => duplicateCampaign(campaign.id)}>Duplicate</Button>
                      <Button variant="secondary" onClick={() => deleteCampaign(campaign.id)}>Archive/Delete</Button>
                      <Button variant="secondary" onClick={() => previewCampaignRecipients(campaign.id)}>Mo3ayana recipients</Button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Select
                        value={campaignTestLanguageById[campaign.id] || "darija"}
                        onValueChange={(value) => setCampaignTestLanguageById((s) => ({ ...s, [campaign.id]: value as "darija" | "fr" | "en" }))}
                      >
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Logha dyal test" /></SelectTrigger>
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
                          {campaignTestSendingById[campaign.id] ? "Sending..." : "Sift test"}
                        </Button>
                      ) : (
                        <Badge>Campaign test disabled</Badge>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => sendCampaignQueued(campaign.id, Number(campaign.estimated_recipient_count || 0))}
                        disabled={!systemStatus?.flags.allow_bulk_send}
                      >
                        Saffet l-hamla
                      </Button>
                    </div>
                    {campaignTestResultById[campaign.id] ? <p className="text-sm">{campaignTestResultById[campaign.id]}</p> : null}
                  </Card>
                ))}
                {campaigns.length === 0 ? <p className="text-sm text-[var(--muted)]">Mazal ma kaynach msawdat hamalat.</p> : null}
              </div>
              {campaignRecipientsPreview && selectedCampaignId ? (
                <Card className="space-y-2 p-3">
                  <p className="text-sm font-semibold">Recipients preview for selected campaign</p>
                  {campaignRecipientsPreview.warnings.map((w) => <p key={w} className="text-sm text-amber-700">{w}</p>)}
                  {campaignRecipientsPreview.items.map((item) => (
                    <div key={item.user_id} className="grid gap-2 rounded border border-[var(--border)] p-2 text-sm md:grid-cols-[1.2fr_1.2fr_auto_auto_1fr_auto] md:items-center">
                      <p>{item.display_name}</p>
                      <p>{item.email}</p>
                      <Badge>{item.detected_language}</Badge>
                      <Badge>{item.eligible ? "Eligible" : "Skipped"}</Badge>
                      <p>{item.skip_reason || item.reason}</p>
                      <Button variant="secondary" onClick={() => loadPreviewUserEmail(item.user_id)}>Chof mo3ayana dyal email</Button>
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
                  <p className="text-sm font-medium">Mo3ayana amina (dry run) dyal audience</p>
                  <Badge>{systemStatus?.flags.recipient_preview_enabled ? "Enabled" : "Disabled"}</Badge>
                </div>
                <p className="text-sm text-amber-700">Hadi ghir mo3ayana. 7tta email ma ghadi ytsift.</p>
                {!systemStatus?.flags.recipient_preview_enabled ? <p className="text-sm text-[var(--muted)]">Khass EMAIL_CENTER_RECIPIENT_PREVIEW_ENABLED=true باش tkhddem had tab.</p> : null}
                <Select value={previewAudienceType} onValueChange={(value) => setPreviewAudienceType(value as EmailCenterAudienceType)}>
                  <SelectTrigger><SelectValue placeholder="No3 l-audience" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_users">all_users</SelectItem>
                    <SelectItem value="incomplete_onboarding">incomplete_onboarding</SelectItem>
                    <SelectItem value="no_transactions">no_transactions</SelectItem>
                    <SelectItem value="no_envelopes">no_envelopes</SelectItem>
                    <SelectItem value="by_language">by_language</SelectItem>
                    <SelectItem value="salary_today">salary_today</SelectItem>
                    <SelectItem value="salary_tomorrow">salary_tomorrow</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={previewLanguage || "__none__"} onValueChange={(value) => setPreviewLanguage(value === "__none__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Filter dyal logha (ikhtiyari)" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">No language filter</SelectItem><SelectItem value="darija">darija</SelectItem><SelectItem value="fr">fr</SelectItem><SelectItem value="en">en</SelectItem></SelectContent>
                </Select>
                <Select value={previewTemplateId || "__none__"} onValueChange={(value) => setPreviewTemplateId(value === "__none__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Template (ikhtiyari)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Bla template</SelectItem>
                    {templates.map((template) => (<SelectItem key={template.id} value={template.id}>{template.name} · {template.language}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Input type="number" min={1} max={200} placeholder="Limit (max 200)" value={previewLimit} onChange={(e) => setPreviewLimit(Number(e.target.value || "50"))} />
                <Input placeholder="3onwan i7tiyati" value={previewCompose.subject} onChange={(e) => setPreviewCompose((s) => ({ ...s, subject: e.target.value }))} />
                <Textarea placeholder="Matn i7tiyati" value={previewCompose.body} onChange={(e) => setPreviewCompose((s) => ({ ...s, body: e.target.value }))} rows={5} />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="Nass CTA i7tiyati" value={previewCompose.cta_label} onChange={(e) => setPreviewCompose((s) => ({ ...s, cta_label: e.target.value }))} />
                  <Input placeholder="Rabeta CTA i7tiyati" value={previewCompose.cta_url} onChange={(e) => setPreviewCompose((s) => ({ ...s, cta_url: e.target.value }))} />
                </div>
                <Button onClick={runRecipientsPreview} disabled={!systemStatus?.flags.recipient_preview_enabled || recipientsLoading}>{recipientsLoading ? "Khadam…" : "Chghal l-mo3ayana"}</Button>
              </Card>
              <Card className="space-y-3 p-4">
                <p className="text-sm font-medium">Mo3ayana dyal email dyal user</p>
                {previewEmail ? (
                  <div className="space-y-2 text-sm">
                    <p>{previewEmail.email} · {previewEmail.detected_language}</p>
                    <p>{previewEmail.subject}</p>
                    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded border border-[var(--border)] bg-white p-2">
                      <div dangerouslySetInnerHTML={{ __html: previewEmail.body_html }} />
                    </div>
                  </div>
                ) : <p className="text-sm text-[var(--muted)]">Select a recipient row and click View email.</p>}
              </Card>
            </div>
            <Card className="mt-4 space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge>Total matched: {recipientsPreview?.total_matched ?? 0}</Badge>
                <Badge>Returned: {recipientsPreview?.returned_count ?? 0}</Badge>
              </div>
              {recipientsPreview?.warnings?.length ? <div className="space-y-1">{recipientsPreview.warnings.map((warning) => <p key={warning} className="text-sm text-amber-700">{warning}</p>)}</div> : null}
              <div className="space-y-2">
                {recipientsPreview?.items?.map((item) => (
                  <div key={item.user_id} className="grid gap-2 rounded border border-[var(--border)] p-3 text-sm md:grid-cols-[1.2fr_1.2fr_auto_1fr_1fr_auto] md:items-center">
                    <p>{item.display_name}</p>
                    <p>{item.email}</p>
                    <Badge>{item.detected_language}</Badge>
                    <Badge>{item.eligible ? "Eligible" : "Skipped"}</Badge>
                    <p>{item.skip_reason || item.reason}</p>
                    <Button variant="secondary" onClick={() => loadPreviewUserEmail(item.user_id)} disabled={previewEmailLoading}>{previewEmailLoading ? "Loading..." : "Chof l-email"}</Button>
                  </div>
                ))}
                {recipientsPreview && recipientsPreview.items.length === 0 ? <p className="text-sm text-[var(--muted)]">Ma t9abl 7tta mostafid.</p> : null}
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="templates">
            <Card className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{templatesEnabled ? "Qwaleb mcha3lin" : "Qwaleb msdoudin"}</Badge>
                <Button variant="secondary" onClick={() => loadQwaleb(templateLanguageFilter, templateCategoryFilter)} disabled={templatesLoading}>
                  {templatesLoading ? "3awed tahdithing..." : "3awed tahdith"}
                </Button>
                <Button variant="secondary" onClick={seedDefaultTemplates} disabled={!templatesEnabled}>
                  Seed defaults
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <Select value={templateLanguageFilter || "__all__"} onValueChange={(value) => setTemplateLanguageFilter(value === "__all__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Language filter" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">All languages</SelectItem><SelectItem value="darija">darija</SelectItem><SelectItem value="fr">fr</SelectItem><SelectItem value="en">en</SelectItem></SelectContent>
                </Select>
                <Select value={templateCategoryFilter || "__all__"} onValueChange={(value) => setTemplateCategoryFilter(value === "__all__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Category filter" /></SelectTrigger>
                  <SelectContent><SelectItem value="__all__">All categories</SelectItem><SelectItem value="welcome">welcome</SelectItem><SelectItem value="onboarding_reminder">onboarding_reminder</SelectItem><SelectItem value="salary_reminder">salary_reminder</SelectItem><SelectItem value="first_transaction">first_transaction</SelectItem><SelectItem value="envelope_setup">envelope_setup</SelectItem><SelectItem value="passkey_reminder">passkey_reminder</SelectItem><SelectItem value="monthly_checkin">monthly_checkin</SelectItem><SelectItem value="product_update">product_update</SelectItem><SelectItem value="maintenance">maintenance</SelectItem><SelectItem value="custom">custom</SelectItem></SelectContent>
                </Select>
                <Button onClick={() => loadQwaleb(templateLanguageFilter, templateCategoryFilter)} disabled={templatesLoading}>Tb9i filters</Button>
              </div>

              <Card className="space-y-2 p-3">
                <p className="text-sm font-semibold">{templateEditor.id ? "Hddet template" : "Sna3 قالب"}</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="Mefta7 (ikhtiyari)" value={templateEditor.key} onChange={(e) => setTemplateEditor((s) => ({ ...s, key: e.target.value }))} />
                  <Input placeholder="Smiya" value={templateEditor.name} onChange={(e) => setTemplateEditor((s) => ({ ...s, name: e.target.value }))} />
                  <Select value={templateEditor.category} onValueChange={(value) => setTemplateEditor((s) => ({ ...s, category: value }))}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent><SelectItem value="welcome">welcome</SelectItem><SelectItem value="onboarding_reminder">onboarding_reminder</SelectItem><SelectItem value="salary_reminder">salary_reminder</SelectItem><SelectItem value="first_transaction">first_transaction</SelectItem><SelectItem value="envelope_setup">envelope_setup</SelectItem><SelectItem value="passkey_reminder">passkey_reminder</SelectItem><SelectItem value="monthly_checkin">monthly_checkin</SelectItem><SelectItem value="product_update">product_update</SelectItem><SelectItem value="maintenance">maintenance</SelectItem><SelectItem value="custom">custom</SelectItem></SelectContent>
                  </Select>
                  <Select value={templateEditor.language} onValueChange={(value) => setTemplateEditor((s) => ({ ...s, language: value }))}>
                    <SelectTrigger><SelectValue placeholder="Logha" /></SelectTrigger>
                    <SelectContent><SelectItem value="darija">darija</SelectItem><SelectItem value="fr">fr</SelectItem><SelectItem value="en">en</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="L3onwan" value={templateEditor.subject} onChange={(e) => setTemplateEditor((s) => ({ ...s, subject: e.target.value }))} />
                  <Input placeholder="Mo3ayana text (optional)" value={templateEditor.preview_text} onChange={(e) => setTemplateEditor((s) => ({ ...s, preview_text: e.target.value }))} />
                </div>
                <Textarea placeholder="Lmatn" value={templateEditor.body} onChange={(e) => setTemplateEditor((s) => ({ ...s, body: e.target.value }))} rows={6} />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="Nass CTA" value={templateEditor.cta_label} onChange={(e) => setTemplateEditor((s) => ({ ...s, cta_label: e.target.value }))} />
                  <Input placeholder="Rabeta CTA" value={templateEditor.cta_url} onChange={(e) => setTemplateEditor((s) => ({ ...s, cta_url: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2"><Checkbox checked={templateEditor.is_active} onCheckedChange={(checked) => setTemplateEditor((s) => ({ ...s, is_active: Boolean(checked) }))} /><p className="text-sm">Active</p></div>
                <div className="flex gap-2">
                  <Button onClick={saveTemplate} disabled={!templatesEnabled || savingTemplate}>{savingTemplate ? "Kayt7fed..." : templateEditor.id ? "Hddet قالب" : "Sna3 قالب"}</Button>
                  <Button variant="secondary" onClick={() => setTemplateEditor({ id: "", key: "", name: "", category: "custom", language: "fr", subject: "", preview_text: "", body: "", cta_label: "", cta_url: "", is_active: true })}>Clear</Button>
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
                        <Badge>{template.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                    </div>
                    <p className="text-sm">{template.subject}</p>
                    <p className="text-xs text-[var(--muted)]">{template.preview_text || ""}</p>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setTemplateEditor({
                        id: template.id, key: template.key || "", name: template.name, category: template.category, language: template.language, subject: template.subject, preview_text: template.preview_text || "", body: template.body, cta_label: template.cta_label || "", cta_url: template.cta_url || "", is_active: template.is_active,
                      })}>Edit</Button>
                      <Button variant="secondary" onClick={() => deactivateTemplate(template.id)} disabled={!templatesEnabled}>Hyed l-man3</Button>
                    </div>
                  </Card>
                ))}
                {templates.length === 0 ? <p className="text-sm text-[var(--muted)]">Bla templates found.</p> : null}
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="system-status">
            <Card className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Backend health and safety diagnostics</p>
                <Button onClick={loadSystemStatus} disabled={systemStatusLoading}>{systemStatusLoading ? "3awed tahdithing..." : "3awed tahdith l-hala"}</Button>
              </div>
              {systemStatusError ? <p className="text-sm text-red-600">Unable to load system status right now. {systemStatusError}</p> : null}
              {systemStatus ? (
                <div className="grid gap-4">
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">Feature Flags</p>
                    <p className="text-sm">Mode: <Badge>{systemStatus.mode}</Badge></p>
                    <p className="text-sm text-[var(--muted)]">{modeExplanation}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {statusBadge(systemStatus.flags.allow_user_send)}
                      <Badge>{systemStatus.flags.allow_bulk_send ? "Active" : "Blocked"}</Badge>
                      <Badge>{systemStatus.flags.allow_scheduling ? "Active" : "Blocked"}</Badge>
                      <Badge>{systemStatus.flags.allow_salary_reminders ? "Active" : "Blocked"}</Badge>
                      <Badge>{systemStatus.flags.ai_suggestions_enabled ? "Active" : "Disabled"}</Badge>
                      <Badge>{systemStatus.flags.allow_open_tracking ? "Active" : "Disabled"}</Badge>
                      <Badge>{systemStatus.flags.allow_click_tracking ? "Active" : "Disabled"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">Mail Provider</p>
                    <p className="text-sm">Provider: {systemStatus.mail_provider.provider}</p>
                    <p className="text-sm">From: {systemStatus.mail_provider.from_email}</p>
                    <div className="flex gap-2 text-sm">
                      <Badge>{systemStatus.mail_provider.api_base_configured ? "OK" : "Missing"}</Badge>
                      <Badge>{systemStatus.mail_provider.token_configured ? "OK" : "Missing"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">Database</p>
                    <div className="flex gap-2 text-sm">
                      <Badge>{systemStatus.database.email_design_settings_table ? "OK" : "Missing"}</Badge>
                      <Badge>{systemStatus.database.email_deliveries_table ? "OK" : "Missing"}</Badge>
                    </div>
                    {systemStatus.database.error ? <p className="text-xs text-red-600">DB check: {systemStatus.database.error}</p> : null}
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">Capabilities</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge>{systemStatus.capabilities.send_test ? "OK" : "Disabled"}</Badge>
                      <Badge>{systemStatus.capabilities.design_settings ? "OK" : "Disabled"}</Badge>
                      <Badge>{systemStatus.capabilities.history ? "OK" : "Disabled"}</Badge>
                      <Badge>{systemStatus.capabilities.user_search ? "OK" : "Disabled"}</Badge>
                      <Badge>{systemStatus.capabilities.user_preview ? "OK" : "Disabled"}</Badge>
                      <Badge>{systemStatus.capabilities.send_user ? "Active" : "Disabled"}</Badge>
                      <Badge>{systemStatus.capabilities.bulk_send ? "Active" : "Blocked"}</Badge>
                      <Badge>{systemStatus.capabilities.scheduling ? "Active" : "Blocked"}</Badge>
                      <Badge>{systemStatus.capabilities.salary_reminders ? "Active" : "Blocked"}</Badge>
                      <Badge>{systemStatus.capabilities.ai_suggestions ? "Active" : "Disabled"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">اقتراح AIion Status</p>
                    <p className="text-sm">Capability: <Badge>{systemStatus.ai.ai_capability}</Badge></p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge>{systemStatus.ai.ai_suggestions_enabled ? "Flag ON" : "Flag OFF"}</Badge>
                      <Badge>{systemStatus.ai.ai_gateway_configured ? "Gateway configured" : "Gateway missing"}</Badge>
                      <Badge>{systemStatus.ai.ai_default_model_configured ? "Model configured" : "Model missing"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">Qwaleb Status</p>
                    <p className="text-sm">Capability: <Badge>{systemStatus.templates.templates_capability}</Badge></p>
                    <p className="text-sm">Total: {systemStatus.templates.templates_count} · Active: {systemStatus.templates.active_templates_count}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge>{systemStatus.templates.templates_enabled ? "Qwaleb ON" : "Qwaleb OFF"}</Badge>
                      <Badge>{systemStatus.capabilities.templates ? "Qwaleb Wajed" : "Qwaleb Not Wajed"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">Safety</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge>{systemStatus.safety.bulk_send_blocked ? "Blocked" : "Active"}</Badge>
                      <Badge>{systemStatus.safety.scheduling_blocked ? "Blocked" : "Active"}</Badge>
                      <Badge>{systemStatus.safety.salary_reminders_blocked ? "Blocked" : "Active"}</Badge>
                      <Badge>{systemStatus.safety.test_recipient_configured ? "OK" : "Missing"}</Badge>
                      <Badge>{systemStatus.safety.production_send_enabled ? "Active" : "Disabled"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">Delivery Stats</p>
                    <p className="text-sm">Total: {systemStatus.stats.total_deliveries}</p>
                    <p className="text-sm">Pending: {systemStatus.stats.pending} · Sent: {systemStatus.stats.sent} · Failed: {systemStatus.stats.failed} · Skipped: {systemStatus.stats.skipped}</p>
                    <p className="text-sm">Latest delivery: {systemStatus.stats.latest_delivery_at || "None"}</p>
                  </Card>
                </div>
              ) : null}
            </Card>
          </TabsContent>
          <TabsContent value="design"><div className="grid gap-4 lg:grid-cols-2"><Card className="space-y-3 p-4"><Input placeholder="Smiya dyal brand" value={design.brand_name} onChange={(e) => setDesign((s) => ({ ...s, brand_name: e.target.value }))} /><Input placeholder="Rabeta dyal logo" value={design.logo_url} onChange={(e) => setDesign((s) => ({ ...s, logo_url: e.target.value }))} /><Input placeholder="Lon ra2isi" value={design.primary_color} onChange={(e) => setDesign((s) => ({ ...s, primary_color: e.target.value }))} /><Input placeholder="Lon dyal bouton" value={design.button_color} onChange={(e) => setDesign((s) => ({ ...s, button_color: e.target.value }))} /><Textarea placeholder="Nass footer" value={design.footer_text} onChange={(e) => setDesign((s) => ({ ...s, footer_text: e.target.value }))} rows={3} /><Input placeholder="Email dyal support" value={design.support_email} onChange={(e) => setDesign((s) => ({ ...s, support_email: e.target.value }))} /><Button onClick={saveDesign} disabled={savingDesign}>{savingDesign ? "Kayt7fed..." : "Hfed design"}</Button></Card><Card className="p-4"><p className="mb-2 text-sm font-medium">Mo3ayana live</p><div dangerouslySetInnerHTML={previewHtml} /></Card></div></TabsContent>
          <TabsContent value="history"><Card className="space-y-2 p-4">{history?.items?.length ? history.items.map((item) => (<div key={item.id} className="rounded-lg border border-[var(--border)] p-3 text-sm"><p><strong>{item.status}</strong> · actual: {item.email}</p><p>user: {item.recipient_user_id || "-"}</p><p>original: {item.original_recipient_email || item.email}</p><p>language: {item.language}</p><p>{item.subject}</p>{item.note ? <p>note: {item.note}</p> : null}{item.error_message ? <p>error: {item.error_message}</p> : null}<p className="text-[var(--muted)]">{item.created_at}</p></div>)) : <p className="text-sm text-[var(--muted)]">No deliveries yet.</p>}</Card></TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
