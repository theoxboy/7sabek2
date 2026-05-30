"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type {
  EmailCenterStatusOut,
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
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><Card className="space-y-3 p-4"><div className="flex flex-wrap items-center gap-2"><Badge>{status?.mode || "unknown"}</Badge><Badge>{status?.provider || "unknown"}</Badge><Badge>{status?.kill_switch ? "Kill switch ON" : "Kill switch OFF"}</Badge></div><p className="text-sm">Enabled: {String(status?.enabled ?? false)}</p><p className="text-sm">From: {status?.mail_from || ""}</p><p className="text-sm">Test recipient: {status?.test_recipient_email || "(not set)"}</p><p className="text-sm">Allow user send: {String(status?.allow_user_send ?? false)}</p><p className="text-sm text-amber-700">{modeWarning}</p></Card></TabsContent>
          <TabsContent value="compose"><Card className="space-y-3 p-4"><Input placeholder="To" value={payload.to} onChange={(e) => setPayload((s) => ({ ...s, to: e.target.value }))} /><Select value={payload.language} onValueChange={(value) => setPayload((s) => ({ ...s, language: value }))}><SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger><SelectContent><SelectItem value="darija">Darija</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select><Input placeholder="Subject" value={payload.subject} onChange={(e) => setPayload((s) => ({ ...s, subject: e.target.value }))} /><Textarea placeholder="Body" value={payload.body} onChange={(e) => setPayload((s) => ({ ...s, body: e.target.value }))} rows={8} /><Input placeholder="CTA label" value={payload.cta_label} onChange={(e) => setPayload((s) => ({ ...s, cta_label: e.target.value }))} /><Input placeholder="CTA URL" value={payload.cta_url} onChange={(e) => setPayload((s) => ({ ...s, cta_url: e.target.value }))} /><Button onClick={sendTest} disabled={!canSend}>{sending ? "Sending…" : "Send test"}</Button>{sendResult ? <p className="text-sm">{sendResult}</p> : null}</Card></TabsContent>
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
          <TabsContent value="design"><div className="grid gap-4 lg:grid-cols-2"><Card className="space-y-3 p-4"><Input placeholder="Brand name" value={design.brand_name} onChange={(e) => setDesign((s) => ({ ...s, brand_name: e.target.value }))} /><Input placeholder="Logo URL" value={design.logo_url} onChange={(e) => setDesign((s) => ({ ...s, logo_url: e.target.value }))} /><Input placeholder="Primary color" value={design.primary_color} onChange={(e) => setDesign((s) => ({ ...s, primary_color: e.target.value }))} /><Input placeholder="Button color" value={design.button_color} onChange={(e) => setDesign((s) => ({ ...s, button_color: e.target.value }))} /><Textarea placeholder="Footer text" value={design.footer_text} onChange={(e) => setDesign((s) => ({ ...s, footer_text: e.target.value }))} rows={3} /><Input placeholder="Support email" value={design.support_email} onChange={(e) => setDesign((s) => ({ ...s, support_email: e.target.value }))} /><Button onClick={saveDesign} disabled={savingDesign}>{savingDesign ? "Saving…" : "Save design"}</Button></Card><Card className="p-4"><p className="mb-2 text-sm font-medium">Live preview</p><div dangerouslySetInnerHTML={previewHtml} /></Card></div></TabsContent>
          <TabsContent value="history"><Card className="space-y-2 p-4">{history?.items?.length ? history.items.map((item) => (<div key={item.id} className="rounded-lg border border-[var(--border)] p-3 text-sm"><p><strong>{item.status}</strong> · actual: {item.email}</p><p>user: {item.recipient_user_id || "-"}</p><p>original: {item.original_recipient_email || item.email}</p><p>language: {item.language}</p><p>{item.subject}</p>{item.note ? <p>note: {item.note}</p> : null}{item.error_message ? <p>error: {item.error_message}</p> : null}<p className="text-[var(--muted)]">{item.created_at}</p></div>)) : <p className="text-sm text-[var(--muted)]">No deliveries yet.</p>}</Card></TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
