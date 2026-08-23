"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Send,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
  Users,
  Eye,
  Trash2,
  Power,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Compass,
  Sliders,
  Award,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import type { AdminNotificationItem, AdminNotificationCreateIn } from "@/lib/types";

const NOTIFICATION_TYPES = [
  { id: "general", labelFr: "📢 Annonce Générale", labelAr: "📢 إعلان عام", icon: Info, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "advice", labelFr: "💡 Conseil & Tawfir", labelAr: "💡 نصيحة وتوفير", icon: Sparkles, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "alert", labelFr: "⚠️ Alerte / Urgent", labelAr: "⚠️ تنبيه هام", icon: AlertTriangle, color: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "celebration", labelFr: "🎁 Célébration & Bonus", labelAr: "🎁 مكافأة واحتفال", icon: Award, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

const TARGET_AUDIENCES = [
  { id: "all", labelFr: "Tous les utilisateurs (Broadcast)", labelAr: "كاع المستخدمين (عام)" },
  { id: "lang_ar", labelFr: "Utilisateurs Arabe uniquement", labelAr: "مستخدمي العربية فقط" },
  { id: "lang_fr", labelFr: "Utilisateurs Français uniquement", labelAr: "مستخدمي الفرنسية فقط" },
  { id: "specific", labelFr: "Utilisateur spécifique (Email)", labelAr: "مستخدم محدد (بالإيميل)" },
];

const ACTION_OPTIONS = [
  { id: "none", labelFr: "Aucune action (Info simple)", labelAr: "بدون توجيه (معلومة فقط)" },
  { id: "dashboard", labelFr: "Ouvrir l'Accueil (Dashboard)", labelAr: "فتح لوحة التحكم" },
  { id: "distribution", labelFr: "Ouvrir Répartition de Cash", labelAr: "فتح توزيع الميزانية" },
  { id: "savings", labelFr: "Ouvrir Objectifs d'Épargne", labelAr: "فتح أهداف التوفير" },
  { id: "coach", labelFr: "Ouvrir le Coach IA", labelAr: "فتح المستشار الذكي" },
  { id: "sweeps", labelFr: "Ouvrir le Balayage Mensuel", labelAr: "فتح التصفية الشهرية" },
  { id: "url", labelFr: "Ouvrir un lien web externe", labelAr: "فتح رابط خارجي" },
];

const HAPTIC_OPTIONS = [
  { id: "Success", label: "✅ Succès (Double tap)" },
  { id: "Celebration", label: "🎉 Célébration (Vibration festive)" },
  { id: "Warning", label: "⚠️ Alerte (Vibration d'attention)" },
  { id: "Press", label: "🔘 Clic standard" },
  { id: "MoneyIn", label: "💵 Encaissement Cash" },
];

export default function SuperAdminNotificationsPage() {
  const { locale, dir } = useAppLocale();
  const isAr = locale === "ar";
  useForceArabicDocumentFont(isAr, "superadmin-notifications-page");

  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active form state
  const [activeTabLang, setActiveTabLang] = useState<"fr" | "ar">("fr");
  const [titleFr, setTitleFr] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [messageFr, setMessageFr] = useState("");
  const [messageAr, setMessageAr] = useState("");
  const [notificationType, setNotificationType] = useState("general");
  const [targetAudience, setTargetAudience] = useState("all");
  const [targetUserEmail, setTargetUserEmail] = useState("");
  const [actionType, setActionType] = useState("dashboard");
  const [actionUrl, setActionUrl] = useState("");
  const [hapticEffect, setHapticEffect] = useState("Success");
  const [priority, setPriority] = useState<"normal" | "high">("normal");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<AdminNotificationItem[]>("/admin/notifications?limit=50");
      setNotifications(data);
    } catch (err: any) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const stats = useMemo(() => {
    const total = notifications.length;
    const active = notifications.filter((n) => n.is_active).length;
    const totalReads = notifications.reduce((acc, n) => acc + (n.read_count || 0), 0);
    const totalSent = notifications.reduce((acc, n) => acc + (n.sent_count || 0), 0);
    return { total, active, totalReads, totalSent };
  }, [notifications]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleFr.trim() && !titleAr.trim()) {
      setStatusMessage({ type: "error", text: isAr ? "يرجى كتابة عنوان الإشعار" : "Veuillez saisir au moins un titre." });
      return;
    }
    if (!messageFr.trim() && !messageAr.trim()) {
      setStatusMessage({ type: "error", text: isAr ? "يرجى كتابة نص الإشعار" : "Veuillez saisir le contenu du message." });
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage(null);

      const payload: AdminNotificationCreateIn = {
        title_fr: titleFr.trim() || titleAr.trim(),
        title_ar: titleAr.trim() || titleFr.trim(),
        message_fr: messageFr.trim() || messageAr.trim(),
        message_ar: messageAr.trim() || messageFr.trim(),
        notification_type: notificationType,
        target_audience: targetAudience,
        target_user_email: targetAudience === "specific" ? targetUserEmail.trim() : null,
        action_type: actionType,
        action_url: actionType === "url" ? actionUrl.trim() : null,
        haptic_effect: hapticEffect,
        priority: priority,
      };

      await apiFetch("/admin/notifications", {
        method: "POST",
        body: payload,
      });

      setStatusMessage({
        type: "success",
        text: isAr ? "تم إرسال الإشعار ونشره في التطبيق بنجاح !" : "Notification diffusée avec succès sur tous les appareils !",
      });

      // Reset form
      setTitleFr("");
      setTitleAr("");
      setMessageFr("");
      setMessageAr("");
      fetchNotifications();
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || (isAr ? "فشل إرسال الإشعار" : "Erreur lors de l'envoi de la notification."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await apiFetch(`/admin/notifications/${id}/toggle`, { method: "PATCH" });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(isAr ? "واش متأكد باغي تحذف هاد الإشعار ؟" : "Supprimer définitivement cette notification ?")) return;
    try {
      await apiFetch(`/admin/notifications/${id}`, { method: "DELETE" });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8" dir={dir}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {isAr ? "مركز الإشعارات والبث (Push Center)" : "Centre de Notifications & Push"}
              </h1>
              <p className="text-sm text-gray-500">
                {isAr
                  ? "إنشاء وإرسال إشعارات فورية لجميع مستخدمي تطبيق أندرويد APK مع التوجيه والتأثيرات الحركية."
                  : "Diffusez des notifications en direct à tous les utilisateurs de l'application Android avec haptique et redirections."}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={fetchNotifications}
          disabled={loading}
          className="flex items-center gap-2 rounded-2xl"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>{isAr ? "تحديث" : "Rafraîchir"}</span>
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="rounded-3xl border border-gray-100 bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {isAr ? "مجموع الحملات" : "Total Campagnes"}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>
        <Card className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            {isAr ? "إشعارات نشطة الآن" : "Diffusions Actives"}
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.active}</p>
        </Card>
        <Card className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            {isAr ? "أجهزة مستهدفة" : "Appareils Ciblés"}
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{stats.totalSent}</p>
        </Card>
        <Card className="rounded-3xl border border-purple-100 bg-purple-50/50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
            {isAr ? "تأكيدات القراءة" : "Lectures Enregistrées"}
          </p>
          <p className="mt-2 text-2xl font-bold text-purple-700">{stats.totalReads}</p>
        </Card>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-medium ${
            statusMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Studio Grid: Form + Live Phone Preview */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        {/* Creation Form (7 cols) */}
        <div className="xl:col-span-7">
          <Card className="rounded-3xl border border-gray-100 bg-[var(--surface)] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <span>{isAr ? "إنشاء إشعار جديد" : "Créer une nouvelle notification"}</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {isAr ? "حدد المحتوى، الفئة، الجمهور المستهدف والوجهة داخل التطبيق." : "Configurez le contenu bilingue, l'audience ciblée et l'action au clic."}
            </p>

            <form onSubmit={handleSend} className="mt-6 space-y-6">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                  {isAr ? "نوع الإشعار" : "Type de notification"}
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {NOTIFICATION_TYPES.map((t) => {
                    const isSelected = notificationType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNotificationType(t.id)}
                        className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold text-left transition ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm"
                            : "border-gray-200 bg-[var(--surface)] text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {isAr ? t.labelAr : t.labelFr}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language Tabs for Content */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    {isAr ? "محتوى الرسالة" : "Contenu du message"}
                  </span>
                  <div className="flex rounded-xl bg-gray-200 p-1">
                    <button
                      type="button"
                      onClick={() => setActiveTabLang("fr")}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                        activeTabLang === "fr" ? "bg-[var(--surface)] text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      🇫🇷 Français
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTabLang("ar")}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                        activeTabLang === "ar" ? "bg-[var(--surface)] text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      🇲🇦 Darija / Arabe
                    </button>
                  </div>
                </div>

                {activeTabLang === "fr" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Titre (Français)
                      </label>
                      <Input
                        placeholder="Ex: Nouveauté : Suivez vos épargnes !"
                        value={titleFr}
                        onChange={(e) => setTitleFr(e.target.value)}
                        className="rounded-xl border-gray-200 bg-[var(--surface)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Corps du message (Français)
                      </label>
                      <Textarea
                        placeholder="Ex: Vos objectifs d'épargne ont été mis à jour. Découvrez la nouvelle répartition disponible dès aujourd'hui..."
                        rows={3}
                        value={messageFr}
                        onChange={(e) => setMessageFr(e.target.value)}
                        className="rounded-xl border-gray-200 bg-[var(--surface)]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4" dir="rtl">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        العنوان (بالعربية / الدارجة)
                      </label>
                      <Input
                        placeholder="مثال: جديد : تبع التوفير ديالك بسهولة !"
                        value={titleAr}
                        onChange={(e) => setTitleAr(e.target.value)}
                        className="rounded-xl border-gray-200 bg-[var(--surface)] text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        نص الإشعار (بالعربية / الدارجة)
                      </label>
                      <Textarea
                        placeholder="مثال: تم تحديث أهداف التوفير ديالك. دخل دابا وشوف التوزيع الجديد اللي درنا ليك..."
                        rows={3}
                        value={messageAr}
                        onChange={(e) => setMessageAr(e.target.value)}
                        className="rounded-xl border-gray-200 bg-[var(--surface)] text-right"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Target Audience & Priority */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                    {isAr ? "الجمهور المستهدف" : "Audience ciblée"}
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[var(--surface)] p-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                  >
                    {TARGET_AUDIENCES.map((a) => (
                      <option key={a.id} value={a.id}>
                        {isAr ? a.labelAr : a.labelFr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                    {isAr ? "درجة الأهمية (Android Priority)" : "Priorité Android"}
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "normal" | "high")}
                    className="w-full rounded-2xl border border-gray-200 bg-[var(--surface)] p-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="normal">{isAr ? "عادية (Normal Banner)" : "Normale (Bannière standard)"}</option>
                    <option value="high">{isAr ? "عالية (Heads-up alert)" : "Haute (Alerte prioritaire)"}</option>
                  </select>
                </div>
              </div>

              {targetAudience === "specific" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {isAr ? "البريد الإلكتروني للمستخدم" : "Email du destinataire"}
                  </label>
                  <Input
                    type="email"
                    placeholder="client@domaine.com"
                    value={targetUserEmail}
                    onChange={(e) => setTargetUserEmail(e.target.value)}
                    className="rounded-xl border-gray-200"
                  />
                </div>
              )}

              {/* Action / Deep Link & Haptics */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                    {isAr ? "التوجيه عند النقر (Deep Link)" : "Action au clic (Deep Link)"}
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[var(--surface)] p-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                  >
                    {ACTION_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {isAr ? opt.labelAr : opt.labelFr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                    {isAr ? "التأثير الاهتزازي (Haptics)" : "Style Haptique Android"}
                  </label>
                  <select
                    value={hapticEffect}
                    onChange={(e) => setHapticEffect(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-[var(--surface)] p-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                  >
                    {HAPTIC_OPTIONS.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {actionType === "url" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {isAr ? "رابط الويب الخارجي" : "URL externe"}
                  </label>
                  <Input
                    placeholder="https://floussy.online/guide"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    className="rounded-xl border-gray-200"
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-emerald-600 py-6 text-base font-bold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Send className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0" />
                  <span>
                    {submitting
                      ? isAr
                        ? "جاري البث..."
                        : "Diffusion en cours..."
                      : isAr
                      ? "إرسال وبث الإشعار الآن"
                      : "Diffuser la notification maintenant"}
                  </span>
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Live Phone Preview (5 cols) */}
        <div className="xl:col-span-5">
          <Card className="sticky top-6 rounded-3xl border border-gray-100 bg-gradient-to-b from-gray-900 to-gray-950 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                <span>{isAr ? "معاينة حية على الهاتف (Android Preview)" : "Aperçu en direct sur Android"}</span>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                LIVE
              </span>
            </div>

            {/* Mock Phone Frame */}
            <div className="mt-6 mx-auto w-full max-w-sm rounded-[36px] border-4 border-gray-800 bg-gray-900 p-4 shadow-inner">
              {/* Phone Top Notch / Speaker */}
              <div className="mx-auto mb-4 h-4 w-28 rounded-full bg-gray-800 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-gray-700 mr-2" />
                <div className="h-1.5 w-10 rounded-full bg-gray-700" />
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 px-2 mb-4">
                <span>20:00</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">4G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Push Notification Card */}
              <div className="rounded-2xl border border-gray-700/60 bg-gray-800/90 backdrop-blur p-3.5 shadow-lg transition-all">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-md bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                      7
                    </div>
                    <span className="font-semibold text-gray-300">7SABEK</span>
                    <span className="text-gray-500">· maintenant</span>
                  </div>
                  <span className="text-[10px] font-medium text-emerald-400">
                    {priority === "high" ? "PRIORITAIRE" : "INFO"}
                  </span>
                </div>

                <div className="mt-1">
                  <p className="text-sm font-bold text-white">
                    {activeTabLang === "ar"
                      ? titleAr || "عنوان الإشعار التجريبي..."
                      : titleFr || "Titre de l'alerte en direct..."}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5 line-clamp-3">
                    {activeTabLang === "ar"
                      ? messageAr || "هنا غادي يظهر المحتوى ديال الإشعار اللي كتبتي للزبناء ديال التطبيق..."
                      : messageFr || "Le texte de la notification saisie s'affichera ici en temps réel sur les écrans des utilisateurs..."}
                  </p>
                </div>

                {actionType !== "none" && (
                  <div className="mt-3 flex items-center justify-between border-t border-gray-700/60 pt-2 text-[11px] text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>
                        {actionType === "dashboard" && "Ouvrir Dashboard"}
                        {actionType === "distribution" && "Aller à Répartition"}
                        {actionType === "savings" && "Aller à Épargne"}
                        {actionType === "coach" && "Consulter Coach IA"}
                        {actionType === "sweeps" && "Voir Balayage"}
                        {actionType === "url" && "Ouvrir lien"}
                      </span>
                    </span>
                    <span className="text-gray-500 font-normal">Haptique: {hapticEffect}</span>
                  </div>
                )}
              </div>

              {/* Phone Home Bar */}
              <div className="mx-auto mt-8 h-1 w-24 rounded-full bg-gray-700" />
            </div>
          </Card>
        </div>
      </div>

      {/* Broadcast History Table */}
      <Card className="rounded-3xl border border-gray-100 bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-emerald-600" />
          <span>{isAr ? "سجل الإشعارات المرسلة" : "Historique des diffusions"}</span>
        </h2>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">
            {isAr ? "جاري تحميل السجل..." : "Chargement de l'historique..."}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            {isAr ? "لم يتم إرسال أي إشعار حتى الآن." : "Aucune notification n'a été diffusée pour l'instant."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-400">
                <tr>
                  <th className="pb-3 pl-2">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="pb-3">{isAr ? "العنوان والرسالة" : "Contenu (FR / AR)"}</th>
                  <th className="pb-3">{isAr ? "الفئة" : "Type"}</th>
                  <th className="pb-3">{isAr ? "الجمهور" : "Audience"}</th>
                  <th className="pb-3 text-center">{isAr ? "الاستهداف / القراءات" : "Portée / Vues"}</th>
                  <th className="pb-3 text-center">{isAr ? "الحالة" : "Statut"}</th>
                  <th className="pb-3 pr-2 text-right">{isAr ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {notifications.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 pl-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 max-w-xs">
                      <p className="font-bold text-gray-900 truncate">{item.title_fr || item.title_ar}</p>
                      <p className="text-xs text-gray-500 truncate">{item.message_fr || item.message_ar}</p>
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {item.notification_type}
                      </span>
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <span className="text-xs font-semibold text-gray-600">
                        {item.target_audience === "all" && (isAr ? "الكل" : "Tous")}
                        {item.target_audience === "lang_ar" && "Arabe"}
                        {item.target_audience === "lang_fr" && "Français"}
                        {item.target_audience === "specific" && item.target_user_email}
                      </span>
                    </td>
                    <td className="py-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-gray-900">{item.sent_count}</span>
                        <span className="text-gray-400">/</span>
                        <span className="font-semibold text-purple-600">{item.read_count} lus</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggle(item.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        <span>{item.is_active ? (isAr ? "نشط" : "Actif") : isAr ? "معطل" : "Inactif"}</span>
                      </button>
                    </td>
                    <td className="py-3.5 pr-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-xl p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title={isAr ? "حذف" : "Supprimer"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
