"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type {
  EmailCenterAISuggestRequest,
  EmailCenterAISuggestResponse,
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

  const canSend = useMemo(() => !!payload.to.trim() && !!payload.subject.trim() && !!payload.body.trim() && !sending, [payload, sending]);
  const canSendUser = useMemo(() => !!selectedUser && !!userCompose.subject.trim() && !!userCompose.body.trim() && !userSending, [selectedUser, userCompose, userSending]);

  const modeWarning = useMemo(() => {
    if (!status) return "";
    if (status.mode === "test_only") return "User sending is disabled in test_only mode.";
    if (status.mode === "superadmin_only") return "Safe mode: this email will be sent to the test recipient, not the real user.";
    return "This will send to the real user.";
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
      setSystemStatusError(err instanceof Error ? err.message : "Unable to load system status");
    } finally {
      setSystemStatusLoading(false);
    }
  };

  const loadTemplates = async (language = "", category = "") => {
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
        await loadTemplates();
        setPayload((current) => ({ ...current, to: current.to || statusData.test_recipient_email || "" }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load email center");
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
      setError(err instanceof Error ? err.message : "Unable to save design");
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
      setSendResult(result.status === "sent" ? "Email sent successfully." : `Email result: ${result.status}${result.error_message ? ` (${result.error_message})` : ""}`);
      await refreshHistory();
    } catch (err) {
      setSendResult(err instanceof Error ? err.message : "Failed to send email");
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
      setUserSendResult(result.status === "sent" ? "User email sent successfully." : `Email result: ${result.status}${result.error_message ? ` (${result.error_message})` : ""}`);
      await refreshHistory();
    } catch (err) {
      setUserSendResult(err instanceof Error ? err.message : "Failed to send user email");
    } finally {
      setUserSending(false);
    }
  };

  const previewHtml = useMemo(() => {
    const escapedBody = payload.body.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br/>");
    return {
      __html: `<div style="font-family:Arial,sans-serif;border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#fff;max-width:620px;"><div style="color:${design.primary_color};font-size:20px;font-weight:700;margin-bottom:8px;">${design.brand_name}</div><div style="margin-bottom:8px;font-size:18px;font-weight:600;">${payload.subject || "Subject preview"}</div><div style="line-height:1.6;color:#1e293b;">${escapedBody || "Body preview"}</div>${payload.cta_url ? `<a href="${payload.cta_url}" style="display:inline-block;margin-top:12px;padding:10px 14px;background:${design.button_color};color:#fff;text-decoration:none;border-radius:8px;">${payload.cta_label || "Open"}</a>` : ""}<hr style="margin:14px 0;border:none;border-top:1px solid #e2e8f0;"/><div style="font-size:12px;color:#64748b;">${design.footer_text}</div><div style="font-size:12px;color:#64748b;">${design.support_email}</div></div>`,
    };
  }, [design, payload]);

  const modeExplanation = useMemo(() => {
    if (!systemStatus) return "";
    if (systemStatus.mode === "test_only") {
      return "test_only: only test recipient can receive emails";
    }
    if (systemStatus.mode === "superadmin_only") {
      return "superadmin_only: selected users are rendered but sent to test recipient";
    }
    return "production: sends to real users";
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
      await loadTemplates(templateLanguageFilter, templateCategoryFilter);
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
      await loadTemplates(templateLanguageFilter, templateCategoryFilter);
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
      await loadTemplates(templateLanguageFilter, templateCategoryFilter);
      await loadSystemStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to seed templates");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card className="space-y-2 p-4">
        <h1 className="text-xl font-semibold">Email Center</h1>
        <p className="text-sm text-[var(--muted)]">Superadmin Email Center. No bulk send, no scheduling, no automations.</p>
      </Card>
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="compose">Compose Test</TabsTrigger>
            <TabsTrigger value="compose-user">Compose User</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="system-status">System Status</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><Card className="space-y-3 p-4"><div className="flex flex-wrap items-center gap-2"><Badge>{status?.mode || "unknown"}</Badge><Badge>{status?.provider || "unknown"}</Badge><Badge>{status?.kill_switch ? "Kill switch ON" : "Kill switch OFF"}</Badge></div><p className="text-sm">Enabled: {String(status?.enabled ?? false)}</p><p className="text-sm">From: {status?.mail_from || ""}</p><p className="text-sm">Test recipient: {status?.test_recipient_email || "(not set)"}</p><p className="text-sm">Allow user send: {String(status?.allow_user_send ?? false)}</p><p className="text-sm text-amber-700">{modeWarning}</p></Card></TabsContent>
          <TabsContent value="compose">
            <Card className="space-y-3 p-4">
              <Input placeholder="To" value={payload.to} onChange={(e) => setPayload((s) => ({ ...s, to: e.target.value }))} />
              <Select value={payload.language} onValueChange={(value) => setPayload((s) => ({ ...s, language: value }))}>
                <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
                <SelectContent><SelectItem value="darija">Darija</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
              </Select>
              <Select value={selectedTemplateIdTest || "__none__"} onValueChange={(value) => applyTemplateToTest(value === "__none__" ? "" : value)}>
                <SelectTrigger><SelectValue placeholder="Use template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No template</SelectItem>
                  {filteredTemplatesForTest.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.name} · {template.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded border border-[var(--border)] p-3">
                <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">AI Suggest</p><Badge>{aiDisabled ? "AI suggestions disabled" : aiMissingConfig ? "AI Gateway Hub is not configured" : "Ready"}</Badge></div>
                <Textarea placeholder="Goal (what this email should achieve)" value={aiGoalTest} onChange={(e) => setAiGoalTest(e.target.value)} rows={3} />
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <Select value={aiToneTest} onValueChange={(value) => setAiToneTest(value as "friendly" | "professional" | "motivational" | "short")}><SelectTrigger><SelectValue placeholder="Tone" /></SelectTrigger><SelectContent><SelectItem value="friendly">friendly</SelectItem><SelectItem value="professional">professional</SelectItem><SelectItem value="motivational">motivational</SelectItem><SelectItem value="short">short</SelectItem></SelectContent></Select>
                  <Input placeholder="CTA label hint (optional)" value={aiCtaLabelHintTest} onChange={(e) => setAiCtaLabelHintTest(e.target.value)} />
                </div>
                <div className="mt-2 flex gap-2"><Button onClick={suggestForTest} disabled={aiDisabled || aiMissingConfig || aiSuggestLoadingTest || !aiGoalTest.trim()}>{aiSuggestLoadingTest ? "Suggesting..." : "Suggest with AI"}</Button>{aiSuggestionTest ? <Button variant="secondary" onClick={suggestForTest} disabled={aiSuggestLoadingTest}>Regenerate</Button> : null}{aiSuggestionTest ? <Button variant="secondary" onClick={() => setAiSuggestionTest(null)}>Cancel</Button> : null}</div>
                {aiSuggestErrorTest ? <p className="mt-2 text-sm text-red-600">{aiSuggestErrorTest}</p> : null}
                {aiSuggestionTest ? <div className="mt-3 rounded border border-[var(--border)] p-3 text-sm"><p><strong>Subject:</strong> {aiSuggestionTest.subject}</p><p><strong>Preview:</strong> {aiSuggestionTest.preview_text || "-"}</p><p className="whitespace-pre-wrap"><strong>Body:</strong>{"\n"}{aiSuggestionTest.body}</p><p><strong>CTA:</strong> {aiSuggestionTest.cta_label}</p><Button className="mt-2" onClick={() => setPayload((s) => ({ ...s, subject: aiSuggestionTest.subject, body: aiSuggestionTest.body, cta_label: aiSuggestionTest.cta_label }))}>Apply suggestion</Button></div> : null}
              </div>
              <Input placeholder="Subject" value={payload.subject} onChange={(e) => setPayload((s) => ({ ...s, subject: e.target.value }))} />
              <Textarea placeholder="Body" value={payload.body} onChange={(e) => setPayload((s) => ({ ...s, body: e.target.value }))} rows={8} />
              <Input placeholder="CTA label" value={payload.cta_label} onChange={(e) => setPayload((s) => ({ ...s, cta_label: e.target.value }))} />
              <Input placeholder="CTA URL" value={payload.cta_url} onChange={(e) => setPayload((s) => ({ ...s, cta_url: e.target.value }))} />
              <Button onClick={sendTest} disabled={!canSend}>{sending ? "Sending…" : "Send test"}</Button>
              {sendResult ? <p className="text-sm">{sendResult}</p> : null}
            </Card>
          </TabsContent>
          <TabsContent value="compose-user">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="space-y-3 p-4">
                <p className="text-sm text-amber-700">{modeWarning}</p>
                <div className="flex gap-2">
                  <Input placeholder="Search user by name or email" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} />
                  <Button onClick={searchUsers} disabled={searchingUsers}>{searchingUsers ? "Searching…" : "Search"}</Button>
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
                    <p className="font-medium">Selected user</p>
                    <p>{selectedUser.display_name}</p>
                    <p>{selectedUser.email}</p>
                    <p>Language: {selectedUser.detected_language}</p>
                  </div>
                ) : null}
                <Select value={selectedTemplateIdUser || "__none__"} onValueChange={(value) => applyTemplateToUser(value === "__none__" ? "" : value)}>
                  <SelectTrigger><SelectValue placeholder="Use template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No template</SelectItem>
                    {filteredTemplatesForUser.map((template) => (
                      <SelectItem key={template.id} value={template.id}>{template.name} · {template.category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="rounded border border-[var(--border)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">AI Suggest</p>
                    <Badge>{aiDisabled ? "AI suggestions disabled" : aiMissingConfig ? "AI Gateway Hub is not configured" : "Ready"}</Badge>
                  </div>
                  <Textarea placeholder="Goal (what this email should achieve)" value={aiGoalUser} onChange={(e) => setAiGoalUser(e.target.value)} rows={3} />
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <Select value={aiLanguageUser} onValueChange={(value) => setAiLanguageUser(value as "darija" | "fr" | "en")}>
                      <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
                      <SelectContent><SelectItem value="darija">Darija</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                    </Select>
                    <Select value={aiToneUser} onValueChange={(value) => setAiToneUser(value as "friendly" | "professional" | "motivational" | "short")}>
                      <SelectTrigger><SelectValue placeholder="Tone" /></SelectTrigger>
                      <SelectContent><SelectItem value="friendly">friendly</SelectItem><SelectItem value="professional">professional</SelectItem><SelectItem value="motivational">motivational</SelectItem><SelectItem value="short">short</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <Input className="mt-2" placeholder="CTA label hint (optional)" value={aiCtaLabelHintUser} onChange={(e) => setAiCtaLabelHintUser(e.target.value)} />
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox checked={personalizeWithFirstName} onCheckedChange={(checked) => setPersonalizeWithFirstName(Boolean(checked))} />
                    <p className="text-sm">Personalize with first name</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button onClick={suggestForUser} disabled={aiDisabled || aiMissingConfig || aiSuggestLoadingUser || !selectedUser || !aiGoalUser.trim()}>{aiSuggestLoadingUser ? "Suggesting..." : "Suggest with AI"}</Button>
                    {aiSuggestionUser ? <Button variant="secondary" onClick={suggestForUser} disabled={aiSuggestLoadingUser}>Regenerate</Button> : null}
                    {aiSuggestionUser ? <Button variant="secondary" onClick={() => setAiSuggestionUser(null)}>Cancel</Button> : null}
                  </div>
                  {aiSuggestErrorUser ? <p className="mt-2 text-sm text-red-600">{aiSuggestErrorUser}</p> : null}
                  {aiSuggestionUser ? <div className="mt-3 rounded border border-[var(--border)] p-3 text-sm"><p><strong>Subject:</strong> {aiSuggestionUser.subject}</p><p><strong>Preview:</strong> {aiSuggestionUser.preview_text || "-"}</p><p className="whitespace-pre-wrap"><strong>Body:</strong>{"\n"}{aiSuggestionUser.body}</p><p><strong>CTA:</strong> {aiSuggestionUser.cta_label}</p><Button className="mt-2" onClick={() => setUserCompose((s) => ({ ...s, subject: aiSuggestionUser.subject, body: aiSuggestionUser.body, cta_label: aiSuggestionUser.cta_label }))}>Apply suggestion</Button></div> : null}
                </div>
                <Input placeholder="Subject" value={userCompose.subject} onChange={(e) => setUserCompose((s) => ({ ...s, subject: e.target.value }))} />
                <Textarea placeholder="Body" value={userCompose.body} onChange={(e) => setUserCompose((s) => ({ ...s, body: e.target.value }))} rows={8} />
                <Input placeholder="CTA label" value={userCompose.cta_label} onChange={(e) => setUserCompose((s) => ({ ...s, cta_label: e.target.value }))} />
                <Input placeholder="CTA URL" value={userCompose.cta_url} onChange={(e) => setUserCompose((s) => ({ ...s, cta_url: e.target.value }))} />
                <div className="flex gap-2">
                  <Button onClick={loadUserPreview} disabled={!selectedUser || previewLoading || !userCompose.subject.trim() || !userCompose.body.trim()}>{previewLoading ? "Loading preview…" : "Preview"}</Button>
                  <Button onClick={sendUser} disabled={!canSendUser || !status?.allow_user_send || status?.mode === "test_only"}>{userSending ? "Sending…" : "Send to selected user"}</Button>
                </div>
                {userSendResult ? <p className="text-sm">{userSendResult}</p> : null}
              </Card>
              <Card className="p-4">
                <p className="mb-2 text-sm font-medium">User preview</p>
                {userPreview ? (
                  <div className="space-y-2 text-sm">
                    <p>Target user: {userPreview.display_name} ({userPreview.email})</p>
                    <p>Language: {userPreview.detected_language}</p>
                    <div dangerouslySetInnerHTML={{ __html: userPreview.body_html }} />
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">Select a user and click Preview.</p>
                )}
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="templates">
            <Card className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{templatesEnabled ? "Templates enabled" : "Templates disabled"}</Badge>
                <Button variant="secondary" onClick={() => loadTemplates(templateLanguageFilter, templateCategoryFilter)} disabled={templatesLoading}>
                  {templatesLoading ? "Refreshing..." : "Refresh"}
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
                <Button onClick={() => loadTemplates(templateLanguageFilter, templateCategoryFilter)} disabled={templatesLoading}>Apply filters</Button>
              </div>

              <Card className="space-y-2 p-3">
                <p className="text-sm font-semibold">{templateEditor.id ? "Edit template" : "Create template"}</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="Key (optional)" value={templateEditor.key} onChange={(e) => setTemplateEditor((s) => ({ ...s, key: e.target.value }))} />
                  <Input placeholder="Name" value={templateEditor.name} onChange={(e) => setTemplateEditor((s) => ({ ...s, name: e.target.value }))} />
                  <Select value={templateEditor.category} onValueChange={(value) => setTemplateEditor((s) => ({ ...s, category: value }))}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent><SelectItem value="welcome">welcome</SelectItem><SelectItem value="onboarding_reminder">onboarding_reminder</SelectItem><SelectItem value="salary_reminder">salary_reminder</SelectItem><SelectItem value="first_transaction">first_transaction</SelectItem><SelectItem value="envelope_setup">envelope_setup</SelectItem><SelectItem value="passkey_reminder">passkey_reminder</SelectItem><SelectItem value="monthly_checkin">monthly_checkin</SelectItem><SelectItem value="product_update">product_update</SelectItem><SelectItem value="maintenance">maintenance</SelectItem><SelectItem value="custom">custom</SelectItem></SelectContent>
                  </Select>
                  <Select value={templateEditor.language} onValueChange={(value) => setTemplateEditor((s) => ({ ...s, language: value }))}>
                    <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
                    <SelectContent><SelectItem value="darija">darija</SelectItem><SelectItem value="fr">fr</SelectItem><SelectItem value="en">en</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="Subject" value={templateEditor.subject} onChange={(e) => setTemplateEditor((s) => ({ ...s, subject: e.target.value }))} />
                  <Input placeholder="Preview text (optional)" value={templateEditor.preview_text} onChange={(e) => setTemplateEditor((s) => ({ ...s, preview_text: e.target.value }))} />
                </div>
                <Textarea placeholder="Body" value={templateEditor.body} onChange={(e) => setTemplateEditor((s) => ({ ...s, body: e.target.value }))} rows={6} />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="CTA label" value={templateEditor.cta_label} onChange={(e) => setTemplateEditor((s) => ({ ...s, cta_label: e.target.value }))} />
                  <Input placeholder="CTA URL" value={templateEditor.cta_url} onChange={(e) => setTemplateEditor((s) => ({ ...s, cta_url: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2"><Checkbox checked={templateEditor.is_active} onCheckedChange={(checked) => setTemplateEditor((s) => ({ ...s, is_active: Boolean(checked) }))} /><p className="text-sm">Active</p></div>
                <div className="flex gap-2">
                  <Button onClick={saveTemplate} disabled={!templatesEnabled || savingTemplate}>{savingTemplate ? "Saving..." : templateEditor.id ? "Update template" : "Create template"}</Button>
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
                      <Button variant="secondary" onClick={() => deactivateTemplate(template.id)} disabled={!templatesEnabled}>Deactivate</Button>
                    </div>
                  </Card>
                ))}
                {templates.length === 0 ? <p className="text-sm text-[var(--muted)]">No templates found.</p> : null}
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="system-status">
            <Card className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Backend health and safety diagnostics</p>
                <Button onClick={loadSystemStatus} disabled={systemStatusLoading}>{systemStatusLoading ? "Refreshing..." : "Refresh status"}</Button>
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
                    <p className="text-sm font-semibold">AI Suggestion Status</p>
                    <p className="text-sm">Capability: <Badge>{systemStatus.ai.ai_capability}</Badge></p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge>{systemStatus.ai.ai_suggestions_enabled ? "Flag ON" : "Flag OFF"}</Badge>
                      <Badge>{systemStatus.ai.ai_gateway_configured ? "Gateway configured" : "Gateway missing"}</Badge>
                      <Badge>{systemStatus.ai.ai_default_model_configured ? "Model configured" : "Model missing"}</Badge>
                    </div>
                  </Card>
                  <Card className="space-y-2 p-3">
                    <p className="text-sm font-semibold">Templates Status</p>
                    <p className="text-sm">Capability: <Badge>{systemStatus.templates.templates_capability}</Badge></p>
                    <p className="text-sm">Total: {systemStatus.templates.templates_count} · Active: {systemStatus.templates.active_templates_count}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge>{systemStatus.templates.templates_enabled ? "Templates ON" : "Templates OFF"}</Badge>
                      <Badge>{systemStatus.capabilities.templates ? "Templates Ready" : "Templates Not Ready"}</Badge>
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
          <TabsContent value="design"><div className="grid gap-4 lg:grid-cols-2"><Card className="space-y-3 p-4"><Input placeholder="Brand name" value={design.brand_name} onChange={(e) => setDesign((s) => ({ ...s, brand_name: e.target.value }))} /><Input placeholder="Logo URL" value={design.logo_url} onChange={(e) => setDesign((s) => ({ ...s, logo_url: e.target.value }))} /><Input placeholder="Primary color" value={design.primary_color} onChange={(e) => setDesign((s) => ({ ...s, primary_color: e.target.value }))} /><Input placeholder="Button color" value={design.button_color} onChange={(e) => setDesign((s) => ({ ...s, button_color: e.target.value }))} /><Textarea placeholder="Footer text" value={design.footer_text} onChange={(e) => setDesign((s) => ({ ...s, footer_text: e.target.value }))} rows={3} /><Input placeholder="Support email" value={design.support_email} onChange={(e) => setDesign((s) => ({ ...s, support_email: e.target.value }))} /><Button onClick={saveDesign} disabled={savingDesign}>{savingDesign ? "Saving…" : "Save design"}</Button></Card><Card className="p-4"><p className="mb-2 text-sm font-medium">Live preview</p><div dangerouslySetInnerHTML={previewHtml} /></Card></div></TabsContent>
          <TabsContent value="history"><Card className="space-y-2 p-4">{history?.items?.length ? history.items.map((item) => (<div key={item.id} className="rounded-lg border border-[var(--border)] p-3 text-sm"><p><strong>{item.status}</strong> · actual: {item.email}</p><p>user: {item.recipient_user_id || "-"}</p><p>original: {item.original_recipient_email || item.email}</p><p>language: {item.language}</p><p>{item.subject}</p>{item.note ? <p>note: {item.note}</p> : null}{item.error_message ? <p>error: {item.error_message}</p> : null}<p className="text-[var(--muted)]">{item.created_at}</p></div>)) : <p className="text-sm text-[var(--muted)]">No deliveries yet.</p>}</Card></TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
