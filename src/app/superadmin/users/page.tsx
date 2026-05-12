"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRightFromCircle,
  CheckCircle2,
  CircleEllipsis,
  Clock3,
  Globe,
  KeyRound,
  Laptop,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";
import { logout } from "@/lib/auth";
import type {
  BlockedIPListOut,
  BlockedIPOut,
  CategoryEnvelopeMapOut,
  CategoryOut,
  EnvelopeOut,
  PasswordResetBlockOut,
  PlatformSettingsOut,
  TransactionOut,
  UnblockIPOut,
  UserOut,
  UserSessionHistoryListOut,
  UserSessionActionOut,
  UserSessionBlockIPOut,
  UserSessionHistoryOut,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

type UserSummary = {
  transactions: number;
  categories: number;
  envelopes: number;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Actif" },
  { value: "limited", label: "Limité" },
  { value: "suspended", label: "Suspendu" },
];

export default function SuperAdminUsersPage() {
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "superadmin-users-ar-body");
  const router = useRouter();
  const [users, setUsers] = useState<UserOut[]>([]);
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [graceDays, setGraceDays] = useState(30);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserOut | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<UserSummary | null>(null);
  const [selectedEnvelopes, setSelectedEnvelopes] = useState<EnvelopeOut[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryOut[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<TransactionOut[]>([]);
  const [selectedMappings, setSelectedMappings] = useState<CategoryEnvelopeMapOut[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedSessionHistory, setSelectedSessionHistory] = useState<
    UserSessionHistoryOut[]
  >([]);
  const [loadingSessionHistory, setLoadingSessionHistory] = useState(false);
  const [sessionHistoryError, setSessionHistoryError] = useState("");
  const [mapPreviewSessionId, setMapPreviewSessionId] = useState<string | null>(null);
  const [sessionActionState, setSessionActionState] = useState<{
    loadingKey: string | null;
    message: string;
    error: string;
  }>({
    loadingKey: null,
    message: "",
    error: "",
  });
  const [blockedIpList, setBlockedIpList] = useState<BlockedIPOut[]>([]);
  const [blockedIpLoading, setBlockedIpLoading] = useState(false);
  const [blockedIpError, setBlockedIpError] = useState("");
  const [blockedIpAction, setBlockedIpAction] = useState<{
    loadingId: string | null;
    message: string;
    error: string;
  }>({
    loadingId: null,
    message: "",
    error: "",
  });
  const [passwordResetBlockForm, setPasswordResetBlockForm] = useState({
    mode: "none" as "none" | "temporary" | "permanent",
    duration_value: "24",
    duration_unit: "hours" as "hours" | "days" | "months",
    reason: "",
  });
  const [passwordResetBlockState, setPasswordResetBlockState] = useState<{
    loading: boolean;
    message: string;
    error: string;
  }>({
    loading: false,
    message: "",
    error: "",
  });

  const [formState, setFormState] = useState({
    email: "",
    currency: "",
    sweep_interval_days: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    birth_date: "",
    country: "",
    city: "",
    profile_photo_url: "",
    status: "active",
    must_reset_password: false,
    is_beta_tester: false,
    force_onboarding_v2_review: false,
  });
  const [pendingForceReset, setPendingForceReset] = useState(false);
  const [forceResetState, setForceResetState] = useState({
    loading: false,
    message: "",
    error: "",
  });
  const [tourReplayState, setTourReplayState] = useState({
    loading: false,
    message: "",
    error: "",
  });

  const [passwordState, setPasswordState] = useState({
    password: "",
    confirm: "",
    message: "",
    error: "",
    loading: false,
  });

  const [saveState, setSaveState] = useState({
    loading: false,
    message: "",
    error: "",
  });

  const adminFetch = <T,>(path: string, options?: Parameters<typeof apiFetch>[1]) =>
    apiFetch<T>(path, { ...options, headers: { "x-admin-bypass": "true" } });
  const impersonateFetch = <T,>(path: string, userId: string) =>
    apiFetch<T>(path, { headers: { "x-user-id": userId } });

  const mappingCount = useMemo(
    () => selectedMappings.filter((item) => item.envelope_id).length,
    [selectedMappings]
  );

  const getStatusLabel = (value: string | null | undefined) =>
    STATUS_OPTIONS.find((option) => option.value === value)?.label ?? "Actif";
  const getStatusTone = (value: string | null | undefined) => {
    switch (value) {
      case "limited":
        return "warning";
      case "suspended":
        return "error";
      default:
        return "success";
    }
  };

  const loadSelectedUserSessions = async (userId: string) => {
    setLoadingSessionHistory(true);
    setSessionHistoryError("");
    setSessionActionState((prev) => ({ ...prev, error: "" }));
    try {
      const response = await adminFetch<UserSessionHistoryListOut>(
        `/users/${userId}/sessions?limit=300`
      );
      setSelectedSessionHistory(response.sessions);
      setMapPreviewSessionId((current) => {
        if (!current) return current;
        return response.sessions.some((item) => item.id === current) ? current : null;
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur de chargement des connexions.";
      setSessionHistoryError(message);
      setSelectedSessionHistory([]);
      setMapPreviewSessionId(null);
    } finally {
      setLoadingSessionHistory(false);
    }
  };

  const handleUserSessionAction = async (
    sessionId: string,
    action: "end" | "revoke"
  ) => {
    if (!selectedUserId) return;
    const loadingKey = `${action}:${sessionId}`;
    setSessionActionState({ loadingKey, message: "", error: "" });
    try {
      const response = await adminFetch<UserSessionActionOut>(
        `/users/${selectedUserId}/sessions/${sessionId}/action`,
        {
          method: "POST",
          body: { action },
        }
      );
      setSelectedSessionHistory((prev) =>
        prev.map((item) => (item.id === sessionId ? response.session : item))
      );
      setSessionActionState({
        loadingKey: null,
        message:
          action === "end"
            ? "Session terminée avec succès."
            : "Session révoquée avec succès.",
        error: "",
      });
      if (response.should_logout) {
        await logout().catch(() => null);
        router.push("/login");
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Impossible d'appliquer l'action sur cette session.";
      setSessionActionState({ loadingKey: null, message: "", error: message });
    }
  };

  const handleBlockSessionIp = async (session: UserSessionHistoryOut) => {
    if (!selectedUserId) return;
    if (!session.source_ip) {
      setSessionActionState({
        loadingKey: null,
        message: "",
        error: "Cette session n'a pas d'IP exploitable.",
      });
      return;
    }
    const confirmed = window.confirm(
      `Bloquer l'IP ${session.source_ip} ? Toutes les sessions actives venant de cette IP seront révoquées.`
    );
    if (!confirmed) return;

    const loadingKey = `block:${session.id}`;
    setSessionActionState({ loadingKey, message: "", error: "" });
    try {
      const response = await adminFetch<UserSessionBlockIPOut>(
        `/users/${selectedUserId}/sessions/${session.id}/block-ip`,
        { method: "POST", body: { reason: "Blocage depuis interface superadmin" } }
      );
      setSessionActionState({
        loadingKey: null,
        message: response.already_blocked
          ? `IP déjà bloquée (${response.blocked_ip}).`
          : `IP bloquée (${response.blocked_ip}) · ${response.affected_active_sessions} session(s) active(s) révoquée(s).`,
        error: "",
      });
      await loadBlockedIpList(true);
      await loadSelectedUserSessions(selectedUserId);
      if (response.should_logout) {
        await logout().catch(() => null);
        router.push("/login");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible de bloquer l'IP.";
      setSessionActionState({ loadingKey: null, message: "", error: message });
    }
  };

  const loadBlockedIpList = async (silent = false) => {
    if (!silent) setBlockedIpLoading(true);
    setBlockedIpError("");
    try {
      const response = await adminFetch<BlockedIPListOut>("/users/admin/ip-blocks?limit=300");
      setBlockedIpList(response.items);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible de charger la liste des IP bloquées.";
      setBlockedIpError(message);
      setBlockedIpList([]);
    } finally {
      if (!silent) setBlockedIpLoading(false);
    }
  };


  const handleUnblockIp = async (block: BlockedIPOut) => {
    const confirmed = window.confirm(`Débloquer l'IP ${block.ip_address} ?`);
    if (!confirmed) return;
    setBlockedIpAction({ loadingId: block.id, message: "", error: "" });
    try {
      const response = await adminFetch<UnblockIPOut>(`/users/admin/ip-blocks/${block.id}`, {
        method: "DELETE",
      });
      setBlockedIpList((prev) => prev.filter((item) => item.id !== response.id));
      setBlockedIpAction({
        loadingId: null,
        message: `IP débloquée (${response.ip_address}).`,
        error: "",
      });
      if (selectedUserId) {
        await loadSelectedUserSessions(selectedUserId);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible de débloquer cette IP.";
      setBlockedIpAction({ loadingId: null, message: "", error: message });
    }
  };

  useEffect(() => {
    let active = true;
    adminFetch<PlatformSettingsOut>("/admin/settings")
      .then((settings) => {
        if (!active) return;
        const value = Number(settings.account_deletion_grace_days || 30);
        setGraceDays(value > 0 ? value : 30);
      })
      .catch(() => {
        if (active) setGraceDays(30);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      await loadBlockedIpList(false);
    };
    void run();
    const interval = window.setInterval(() => {
      if (!active) return;
      void loadBlockedIpList(true);
    }, 20000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);


  const computeDeletion = (deletedAt?: string | null) => {
    if (!deletedAt) return null;
    const deletedDate = new Date(deletedAt);
    if (Number.isNaN(deletedDate.getTime())) return null;
    const deadline = new Date(
      deletedDate.getTime() + graceDays * 24 * 60 * 60 * 1000
    );
    const remainingMs = deadline.getTime() - Date.now();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / 86400000));
    return {
      deletedAt: deletedDate,
      deadline,
      expired: remainingMs <= 0,
      remainingDays,
    };
  };

  const formatDateTime = (value: Date | null) =>
    value ? value.toLocaleString("fr-FR") : "—";

  const formatIsoDateTime = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  };

  const buildMapEmbedUrl = (latitude?: number | null, longitude?: number | null) => {
    if (typeof latitude !== "number" || typeof longitude !== "number") return null;
    const zoomDelta = 0.01;
    const minLng = (longitude - zoomDelta).toFixed(6);
    const minLat = (latitude - zoomDelta).toFixed(6);
    const maxLng = (longitude + zoomDelta).toFixed(6);
    const maxLat = (latitude + zoomDelta).toFixed(6);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${latitude.toFixed(6)}%2C${longitude.toFixed(6)}`;
  };

  useEffect(() => {
    let active = true;
    setLoadingUsers(true);
    const timer = window.setTimeout(async () => {
      try {
        const list = await adminFetch<UserOut[]>(
          `/users?q=${encodeURIComponent(search.trim())}&include_deleted=${
            includeDeleted ? "true" : "false"
          }`
        );
        if (active) setUsers(list);
      } catch {
        if (active) setUsers([]);
      } finally {
        if (active) setLoadingUsers(false);
      }
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, includeDeleted]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedSessionHistory([]);
      setSessionHistoryError("");
      setLoadingSessionHistory(false);
      setMapPreviewSessionId(null);
      setSessionActionState({ loadingKey: null, message: "", error: "" });
      return;
    }
    let active = true;
    setLoadingDetails(true);
    void loadSelectedUserSessions(selectedUserId);
    const listUser = users.find((item) => item.id === selectedUserId) ?? null;
    const isDeleted = Boolean(listUser?.deleted_at);
    const requests: Promise<unknown>[] = [
      adminFetch<UserOut>(`/users/${selectedUserId}?include_deleted=true`),
    ];
    if (!isDeleted) {
      requests.push(
        impersonateFetch<UserSummary>("/users/me/summary", selectedUserId),
        impersonateFetch<EnvelopeOut[]>("/envelopes", selectedUserId),
        impersonateFetch<CategoryOut[]>("/categories", selectedUserId),
        impersonateFetch<CategoryEnvelopeMapOut[]>("/mappings", selectedUserId),
        impersonateFetch<TransactionOut[]>("/transactions", selectedUserId)
      );
    }
    Promise.allSettled(requests).then((results) => {
      if (!active) return;
      const userResult = results[0];
      if (userResult?.status === "fulfilled") {
        setSelectedUser(userResult.value as UserOut);
      } else {
        setSelectedUser(listUser);
      }
      if (isDeleted) {
        setSelectedSummary(null);
        setSelectedEnvelopes([]);
        setSelectedCategories([]);
        setSelectedMappings([]);
        setSelectedTransactions([]);
        return;
      }
      const summaryResult = results[1];
      const envelopesResult = results[2];
      const categoriesResult = results[3];
      const mappingsResult = results[4];
      const transactionsResult = results[5];
      if (summaryResult?.status === "fulfilled") {
        setSelectedSummary(summaryResult.value as UserSummary);
      }
      if (envelopesResult?.status === "fulfilled") {
        setSelectedEnvelopes(envelopesResult.value as EnvelopeOut[]);
      }
      if (categoriesResult?.status === "fulfilled") {
        setSelectedCategories(categoriesResult.value as CategoryOut[]);
      }
      if (mappingsResult?.status === "fulfilled") {
        setSelectedMappings(mappingsResult.value as CategoryEnvelopeMapOut[]);
      }
      if (transactionsResult?.status === "fulfilled") {
        setSelectedTransactions(
          [...(transactionsResult.value as TransactionOut[])].sort((a, b) =>
            b.occurred_on.localeCompare(a.occurred_on)
          )
        );
      }
    }).finally(() => {
      if (active) setLoadingDetails(false);
    });
    return () => {
      active = false;
    };
  }, [selectedUserId, users]);

  useEffect(() => {
    if (!selectedUser) return;
    setFormState({
      email: selectedUser.email ?? "",
      currency: selectedUser.currency ?? "",
      sweep_interval_days: selectedUser.sweep_interval_days?.toString() ?? "",
      first_name: selectedUser.first_name ?? "",
      last_name: selectedUser.last_name ?? "",
      phone_number: selectedUser.phone_number ?? "",
      birth_date: selectedUser.birth_date ?? "",
      country: selectedUser.country ?? "",
      city: selectedUser.city ?? "",
      profile_photo_url: selectedUser.profile_photo_url ?? "",
      status: selectedUser.status ?? "active",
      must_reset_password: selectedUser.must_reset_password ?? false,
      is_beta_tester: selectedUser.is_beta_tester ?? false,
      force_onboarding_v2_review: selectedUser.force_onboarding_v2_review ?? false,
    });
    setSaveState({ loading: false, message: "", error: "" });
    setPasswordState({ password: "", confirm: "", message: "", error: "", loading: false });
    setPasswordResetBlockForm({
      mode:
        selectedUser.password_reset_block_mode === "temporary" ||
        selectedUser.password_reset_block_mode === "permanent"
          ? selectedUser.password_reset_block_mode
          : "none",
      duration_value: "24",
      duration_unit: "hours",
      reason: selectedUser.password_reset_block_reason ?? "",
    });
    setPasswordResetBlockState({ loading: false, message: "", error: "" });
    setTourReplayState({ loading: false, message: "", error: "" });
  }, [selectedUser]);

  const handleActAs = () => {
    if (!selectedUserId || typeof window === "undefined") return;
    if (selectedUser?.deleted_at) return;
    window.localStorage.setItem("floussy.superadmin.act_as", selectedUserId);
    router.push("/dashboard");
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaveState({ loading: true, message: "", error: "" });
    try {
      const payload = {
        email: formState.email.trim() || undefined,
        currency: formState.currency.trim() || undefined,
        sweep_interval_days: formState.sweep_interval_days
          ? Number(formState.sweep_interval_days)
          : undefined,
        first_name: formState.first_name || undefined,
        last_name: formState.last_name || undefined,
        phone_number: formState.phone_number || undefined,
        birth_date: formState.birth_date || undefined,
        country: formState.country || undefined,
        city: formState.city || undefined,
        profile_photo_url: formState.profile_photo_url || undefined,
        status: formState.status,
        must_reset_password: formState.must_reset_password,
        is_beta_tester: formState.is_beta_tester,
        force_onboarding_v2_review: formState.force_onboarding_v2_review,
      };
      const updated = await adminFetch<UserOut>(`/users/${selectedUserId}`, {
        method: "PATCH",
        body: payload,
      });
      setSelectedUser(updated);
      setUsers((prev) =>
        prev.map((user) => (user.id === updated.id ? { ...user, ...updated } : user))
      );
      setSaveState({ loading: false, message: "Informations mises à jour.", error: "" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setSaveState({ loading: false, message: "", error: message });
    }
  };

  const handleForceGuidedTourReplay = async () => {
    if (!selectedUserId || !selectedUser) return;
    setTourReplayState({ loading: true, message: "", error: "" });
    try {
      const nextVersion = Number(selectedUser.force_tour_replay_version ?? 0) + 1;
      const updated = await adminFetch<UserOut>(`/users/${selectedUserId}`, {
        method: "PATCH",
        body: { force_tour_replay_version: nextVersion },
      });
      setSelectedUser(updated);
      setUsers((prev) =>
        prev.map((user) => (user.id === updated.id ? { ...user, ...updated } : user))
      );
      setTourReplayState({
        loading: false,
        message: `Tour guidé forcé (version ${updated.force_tour_replay_version ?? nextVersion}).`,
        error: "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setTourReplayState({ loading: false, message: "", error: message });
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserId) return;
    if (!passwordState.password || passwordState.password.length < 8) {
      setPasswordState((prev) => ({
        ...prev,
        error: "Le mot de passe doit contenir au moins 8 caractères.",
        message: "",
      }));
      return;
    }
    if (passwordState.password !== passwordState.confirm) {
      setPasswordState((prev) => ({
        ...prev,
        error: "La confirmation ne correspond pas.",
        message: "",
      }));
      return;
    }
    setPasswordState((prev) => ({ ...prev, loading: true, error: "", message: "" }));
    try {
      await adminFetch(`/users/${selectedUserId}/reset-password`, {
        method: "POST",
        body: { password: passwordState.password },
      });
      setPasswordState({
        password: "",
        confirm: "",
        loading: false,
        error: "",
        message: "Mot de passe mis à jour.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setPasswordState((prev) => ({ ...prev, loading: false, error: message }));
    }
  };

  const handleApplyPasswordResetBlock = async () => {
    if (!selectedUserId) return;
    setPasswordResetBlockState({ loading: true, message: "", error: "" });
    try {
      const mode = passwordResetBlockForm.mode;
      const payload: Record<string, unknown> = {
        mode,
        reason: passwordResetBlockForm.reason.trim() || undefined,
      };
      if (mode === "temporary") {
        const durationValue = Number(passwordResetBlockForm.duration_value);
        if (!Number.isFinite(durationValue) || durationValue <= 0) {
          throw new Error("Durée temporaire invalide.");
        }
        payload.duration_value = durationValue;
        payload.duration_unit = passwordResetBlockForm.duration_unit;
      }
      const response = await adminFetch<PasswordResetBlockOut>(
        `/users/${selectedUserId}/password-reset-block`,
        {
          method: "POST",
          body: payload,
        }
      );
      const updated = await adminFetch<UserOut>(`/users/${selectedUserId}?include_deleted=true`);
      setSelectedUser(updated);
      setUsers((prev) =>
        prev.map((user) => (user.id === updated.id ? { ...user, ...updated } : user))
      );
      const message =
        response.mode === "none"
          ? "Blocage des demandes de réinitialisation retiré."
          : response.mode === "permanent"
          ? "Blocage permanent activé."
          : "Blocage temporaire activé.";
      setPasswordResetBlockState({ loading: false, message, error: "" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible de mettre à jour le blocage.";
      setPasswordResetBlockState({ loading: false, message: "", error: message });
    }
  };

  const handleDelete = async () => {
    if (!selectedUserId) return;
    const confirmed = window.confirm(
      `Supprimer ce compte ? Il pourra être restauré pendant ${graceDays} jour(s).`
    );
    if (!confirmed) return;
    try {
      await adminFetch(`/users/${selectedUserId}`, { method: "DELETE" });
      const deletedAt = new Date().toISOString();
      if (includeDeleted) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === selectedUserId ? { ...user, deleted_at: deletedAt } : user
          )
        );
        setSelectedUser((prev) =>
          prev ? { ...prev, deleted_at: deletedAt } : prev
        );
      } else {
        setUsers((prev) => prev.filter((user) => user.id !== selectedUserId));
        setSelectedUserId(null);
        setSelectedUser(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setSaveState({ loading: false, message: "", error: message });
    }
  };

  const handleRestore = async () => {
    if (!selectedUserId) return;
    setSaveState({ loading: true, message: "", error: "" });
    try {
      const restored = await adminFetch<UserOut>(`/users/${selectedUserId}/restore`, {
        method: "POST",
      });
      setSelectedUser(restored);
      setUsers((prev) =>
        prev.map((user) => (user.id === restored.id ? { ...user, ...restored } : user))
      );
      setSaveState({ loading: false, message: "Compte restauré.", error: "" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setSaveState({ loading: false, message: "", error: message });
    }
  };

  const handlePurge = async () => {
    if (!selectedUserId) return;
    const confirmed = window.confirm(
      "Supprimer définitivement ce compte ? Cette action est irréversible."
    );
    if (!confirmed) return;
    setSaveState({ loading: true, message: "", error: "" });
    try {
      await adminFetch(`/users/${selectedUserId}/purge`, { method: "POST" });
      setUsers((prev) => prev.filter((user) => user.id !== selectedUserId));
      setSelectedUserId(null);
      setSelectedUser(null);
      setSaveState({ loading: false, message: "Compte supprimé.", error: "" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setSaveState({ loading: false, message: "", error: message });
    }
  };

  const displayName =
    [selectedUser?.first_name, selectedUser?.last_name].filter(Boolean).join(" ") ||
    selectedUser?.email ||
    "Utilisateur";
  const currentMustReset =
    selectedUser?.must_reset_password ?? formState.must_reset_password;
  const selectedDeletion = computeDeletion(selectedUser?.deleted_at ?? null);
  const passwordResetRequestCount = selectedUser?.password_reset_requests_total ?? 0;
  const passwordResetBlockedMode =
    selectedUser?.password_reset_block_mode === "temporary" ||
    selectedUser?.password_reset_block_mode === "permanent"
      ? selectedUser.password_reset_block_mode
      : "none";
  const passwordResetBlockedUntil = selectedUser?.password_reset_blocked_until
    ? formatIsoDateTime(selectedUser.password_reset_blocked_until)
    : null;
  const passwordResetLastRequestAt = selectedUser?.password_reset_last_requested_at
    ? formatIsoDateTime(selectedUser.password_reset_last_requested_at)
    : "—";
  const activeSessionCount = selectedSessionHistory.filter(
    (item) => item.status === "active"
  ).length;
  const revokedSessionCount = selectedSessionHistory.filter(
    (item) => item.status === "revoked"
  ).length;
  const endedSessionCount = selectedSessionHistory.filter(
    (item) => item.status === "ended"
  ).length;

  const handleForceResetConfirm = async () => {
    if (!selectedUserId) return;
    setForceResetState({ loading: true, message: "", error: "" });
    const nextValue = !currentMustReset;
    try {
      const updated = await adminFetch<UserOut>(`/users/${selectedUserId}`, {
        method: "PATCH",
        body: { must_reset_password: nextValue },
      });
      setSelectedUser(updated);
      setFormState((prev) => ({
        ...prev,
        must_reset_password: updated.must_reset_password ?? nextValue,
      }));
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUserId
            ? { ...user, must_reset_password: updated.must_reset_password ?? nextValue }
            : user
        )
      );
      setForceResetState({
        loading: false,
        message: nextValue
          ? "Demande de changement activée."
          : "Demande de changement retirée.",
        error: "",
      });
      setPendingForceReset(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setForceResetState({ loading: false, message: "", error: message });
    }
  };

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
          <h1 className="text-2xl font-semibold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500">
            Gestion complète des comptes, statuts et accès.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,1.6fr]">
        <Card className="spike-card p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="spike-title">Liste des comptes</p>
              <p className="spike-subtitle">{users.length} utilisateur(s)</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Switch
                  checked={includeDeleted}
                  onCheckedChange={setIncludeDeleted}
                />
                <span>Afficher supprimés</span>
              </div>
              <div className="relative w-48">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Recherche..."
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {loadingUsers ? (
              <p className="text-xs text-gray-500">Chargement…</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-gray-500">Aucun utilisateur.</p>
            ) : (
              users.map((item) => {
                const label =
                  [item.first_name, item.last_name].filter(Boolean).join(" ") ||
                  item.email;
                const deletion = computeDeletion(item.deleted_at ?? null);
                const isDeleted = Boolean(item.deleted_at);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedUserId(item.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition ${
                      selectedUserId === item.id
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-gray-100 bg-[var(--surface)] hover:border-emerald-200"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{item.email}</p>
                      <p className="text-[11px] text-gray-500">
                        Reset demandés: {item.password_reset_requests_total ?? 0}
                      </p>
                      {isDeleted && deletion ? (
                        <p className="text-[11px] text-rose-500">
                          Supprimé ·{" "}
                          {deletion.expired
                            ? "délai expiré"
                            : `restauration jusqu'au ${formatDateTime(
                                deletion.deadline
                              )}`}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.is_beta_tester ? (
                        <Badge tone="accent">Testeur beta</Badge>
                      ) : null}
                      {item.force_onboarding_v2_review ? (
                        <Badge tone="warning">Review onboarding</Badge>
                      ) : null}
                      {(item.force_tour_replay_version ?? 0) > 0 ? (
                        <Badge tone="accent">
                          Tour v{item.force_tour_replay_version}
                        </Badge>
                      ) : null}
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                          item.has_completed_onboarding_v2
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                        title={
                          item.has_completed_onboarding_v2
                            ? "Onboarding terminé"
                            : "Onboarding non terminé"
                        }
                        aria-label={
                          item.has_completed_onboarding_v2
                            ? "Onboarding terminé"
                            : "Onboarding non terminé"
                        }
                      >
                        {item.has_completed_onboarding_v2 ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <CircleEllipsis className="h-4 w-4" />
                        )}
                      </span>
                      {item.must_reset_password ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                          <KeyRound className="h-4 w-4" />
                        </span>
                      ) : null}
                      {item.password_reset_block_mode === "permanent" ? (
                        <Badge tone="error">Reset bloqué</Badge>
                      ) : null}
                      {item.password_reset_block_mode === "temporary" ? (
                        <Badge tone="warning">Reset bloqué (temp.)</Badge>
                      ) : null}
                      {isDeleted ? (
                        <Badge tone="error">Supprimé</Badge>
                      ) : (
                        <Badge tone={getStatusTone(item.status)}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="spike-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="spike-title">Détails utilisateur</p>
              <p className="spike-subtitle">
                {selectedUser?.email ?? "Sélectionne un compte"}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!selectedUserId || Boolean(selectedUser?.deleted_at)}
              onClick={handleActAs}
            >
              <ArrowUpRightFromCircle className="mr-2 h-4 w-4" />
              Ouvrir en mode utilisateur
            </Button>
          </div>

          {!selectedUserId ? (
            <p className="mt-6 text-xs text-gray-500">
              Choisis un utilisateur pour afficher ses données.
            </p>
          ) : loadingDetails ? (
            <p className="mt-6 text-xs text-gray-500">Chargement…</p>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-xs text-gray-500">Catégories</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedSummary?.categories ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-xs text-gray-500">Enveloppes</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedSummary?.envelopes ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-xs text-gray-500">Transactions</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedSummary?.transactions ?? 0}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-4 text-sm">
                <p className="font-semibold text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500">
                  {selectedUser?.email} · {selectedUser?.currency ?? "—"} · Sweep{" "}
                  {selectedUser?.sweep_interval_days ?? "—"}j
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Mapping: {mappingCount} categorie(s) reliée(s)
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Historique des connexions
                    </p>
                    <p className="text-xs text-gray-500">
                      Détails techniques de connexion pour ce compte.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      selectedUserId ? void loadSelectedUserSessions(selectedUserId) : undefined
                    }
                    disabled={!selectedUserId || loadingSessionHistory}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualiser
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                    Actives: {activeSessionCount}
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                    Révoquées: {revokedSessionCount}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    Terminées: {endedSessionCount}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                    Total: {selectedSessionHistory.length}
                  </span>
                </div>

                {sessionHistoryError ? (
                  <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {sessionHistoryError}
                  </p>
                ) : null}
                {sessionActionState.message ? (
                  <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {sessionActionState.message}
                  </p>
                ) : null}
                {sessionActionState.error ? (
                  <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {sessionActionState.error}
                  </p>
                ) : null}

                {loadingSessionHistory ? (
                  <p className="mt-3 text-xs text-gray-500">Chargement des connexions…</p>
                ) : null}

                {!loadingSessionHistory && selectedSessionHistory.length === 0 ? (
                  <p className="mt-3 text-xs text-gray-500">Aucune connexion enregistrée.</p>
                ) : null}

                {!loadingSessionHistory && selectedSessionHistory.length > 0 ? (
                  <div className="mt-3 max-h-[460px] space-y-3 overflow-y-auto pr-1">
                    {selectedSessionHistory.map((session) => {
                      const mapUrl = buildMapEmbedUrl(session.geo_lat, session.geo_lng);
                      const mapOpen = mapPreviewSessionId === session.id;
                      return (
                        <div
                          key={session.id}
                          className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-gray-900">
                                Session {session.id.slice(0, 8)}
                              </p>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  session.status === "active"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : session.status === "revoked"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {session.status === "active"
                                  ? "Active"
                                  : session.status === "revoked"
                                  ? "Révoquée"
                                  : "Terminée"}
                              </span>
                              {session.ip_blocked ? (
                                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                                  IP bloquée
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleUserSessionAction(session.id, "end")}
                                disabled={
                                  session.status !== "active" ||
                                  sessionActionState.loadingKey !== null
                                }
                                className="rounded-lg border border-gray-200 bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-gray-700 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {sessionActionState.loadingKey === `end:${session.id}`
                                  ? "..."
                                  : "Terminer"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUserSessionAction(session.id, "revoke")
                                }
                                disabled={
                                  session.status !== "active" ||
                                  sessionActionState.loadingKey !== null
                                }
                                className="rounded-lg border border-red-200 bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {sessionActionState.loadingKey === `revoke:${session.id}`
                                  ? "..."
                                  : "Révoquer"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleBlockSessionIp(session)}
                                disabled={
                                  !session.source_ip ||
                                  Boolean(session.ip_blocked) ||
                                  sessionActionState.loadingKey !== null
                                }
                                className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {sessionActionState.loadingKey === `block:${session.id}`
                                  ? "..."
                                  : "Bloquer IP"}
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 grid gap-1 md:grid-cols-2">
                            <p>
                              <Clock3 className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
                              Créée: <strong>{formatIsoDateTime(session.created_at)}</strong>
                            </p>
                            <p>
                              Activité: <strong>{formatIsoDateTime(session.last_seen_at)}</strong>
                            </p>
                            <p>
                              <Globe className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
                              IP: <strong>{session.source_ip ?? "N/A"}</strong>
                            </p>
                            <p>
                              <Laptop className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
                              {session.browser ?? "N/A"} · {session.os ?? "N/A"} ·{" "}
                              {session.device ?? "N/A"}
                            </p>
                            <p className="md:col-span-2 break-all">
                              User-Agent: <strong>{session.user_agent ?? "N/A"}</strong>
                            </p>
                            <p className="md:col-span-2">
                              <MapPin className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
                              GPS:{" "}
                              <strong>
                                {typeof session.geo_lat === "number" &&
                                typeof session.geo_lng === "number"
                                  ? `${session.geo_lat.toFixed(6)}, ${session.geo_lng.toFixed(6)}`
                                  : "N/A"}
                              </strong>{" "}
                              · Précision:{" "}
                              <strong>
                                {typeof session.geo_accuracy_m === "number"
                                  ? `${Math.round(session.geo_accuracy_m)}m`
                                  : "N/A"}
                              </strong>
                              {session.geo_label ? (
                                <>
                                  {" "}
                                  · Libellé: <strong>{session.geo_label}</strong>
                                </>
                              ) : null}
                            </p>
                            {session.ended_at ? (
                              <p>
                                Fin: <strong>{formatIsoDateTime(session.ended_at)}</strong>
                              </p>
                            ) : null}
                            {session.revoked_at ? (
                              <p>
                                Révocation:{" "}
                                <strong>{formatIsoDateTime(session.revoked_at)}</strong>
                              </p>
                            ) : null}
                          </div>
                          {mapUrl ? (
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setMapPreviewSessionId((current) =>
                                    current === session.id ? null : session.id
                                  )
                                }
                                className="rounded-xl border border-gray-200 bg-[var(--surface)] px-3 py-1 text-[11px] font-medium text-gray-700 hover:border-emerald-200 hover:text-emerald-700"
                              >
                                {mapOpen ? "Masquer la carte" : "Voir la carte"}
                              </button>
                              {mapOpen ? (
                                <div className="mt-2 overflow-hidden rounded-xl border border-gray-200">
                                  <iframe
                                    title={`Localisation session ${session.id}`}
                                    src={mapUrl}
                                    className="h-48 w-full"
                                    loading="lazy"
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              {selectedUser?.deleted_at ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-sm">
                  <p className="font-semibold text-rose-700">
                    Compte supprimé (période de grâce)
                  </p>
                  <p className="mt-1 text-xs text-rose-600">
                    Supprimé le {formatDateTime(selectedDeletion?.deletedAt ?? null)}
                  </p>
                  <p className="mt-1 text-xs text-rose-600">
                    {selectedDeletion?.expired
                      ? "Délai de restauration expiré."
                      : `Restauration possible jusqu'au ${formatDateTime(
                          selectedDeletion?.deadline ?? null
                        )} (${selectedDeletion?.remainingDays ?? 0} jour(s)).`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={handleRestore}
                      disabled={saveState.loading || selectedDeletion?.expired}
                      className="bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      Restaurer
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handlePurge}
                      disabled={saveState.loading}
                    >
                      Supprimer définitivement
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900">
                    Informations du compte
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={formState.email}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            email: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Statut</Label>
                      <select
                        className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm"
                        value={formState.status}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            status: event.target.value,
                          }))
                        }
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-[var(--surface)] px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Mode essai / testeur officiel
                        </p>
                        <p className="text-xs text-gray-500">
                          Donne accès aux pages beta (dont le nouvel onboarding test).
                        </p>
                      </div>
                      <Switch
                        checked={formState.is_beta_tester}
                        onCheckedChange={(checked) =>
                          setFormState((prev) => ({
                            ...prev,
                            is_beta_tester: Boolean(checked),
                          }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-[var(--surface)] px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Forcer le changement de mot de passe
                        </p>
                        <p className="text-xs text-gray-500">
                          L’utilisateur devra définir un nouveau mot de passe à la prochaine connexion.
                        </p>
                        {forceResetState.message ? (
                          <p className="mt-1 text-xs text-emerald-600">
                            {forceResetState.message}
                          </p>
                        ) : null}
                        {forceResetState.error ? (
                          <p className="mt-1 text-xs text-red-500">
                            {forceResetState.error}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setPendingForceReset(true)}
                        disabled={!selectedUserId}
                      >
                        {currentMustReset ? "Réinitialiser le flag" : "Forcer"}
                      </Button>
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-[var(--surface)] px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Obliger à refaire l&apos;onboarding
                        </p>
                        <p className="text-xs text-gray-500">
                          L’utilisateur sera renvoyé automatiquement vers l’onboarding. Ses anciennes réponses resteront préremplies pour simple révision.
                        </p>
                      </div>
                      <Switch
                        checked={formState.force_onboarding_v2_review}
                        onCheckedChange={(checked) =>
                          setFormState((prev) => ({
                            ...prev,
                            force_onboarding_v2_review: Boolean(checked),
                          }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-[var(--surface)] px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Forcer le tour guidé
                        </p>
                        <p className="text-xs text-gray-500">
                          Réaffiche les guides même si l’utilisateur les a déjà terminés.
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          Version actuelle: {selectedUser?.force_tour_replay_version ?? 0}
                        </p>
                        {tourReplayState.message ? (
                          <p className="mt-1 text-xs text-emerald-600">
                            {tourReplayState.message}
                          </p>
                        ) : null}
                        {tourReplayState.error ? (
                          <p className="mt-1 text-xs text-red-500">
                            {tourReplayState.error}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleForceGuidedTourReplay}
                        disabled={!selectedUserId || tourReplayState.loading}
                      >
                        {tourReplayState.loading ? "Forçage..." : "Forcer le tour"}
                      </Button>
                    </div>
                    <div>
                      <Label>Prénom</Label>
                      <Input
                        value={formState.first_name}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            first_name: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Nom</Label>
                      <Input
                        value={formState.last_name}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            last_name: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input
                        value={formState.phone_number}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            phone_number: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Date de naissance</Label>
                      <Input
                        type="date"
                        value={formState.birth_date}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            birth_date: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Pays</Label>
                      <Input
                        value={formState.country}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            country: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Ville</Label>
                      <Input
                        value={formState.city}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            city: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Devise</Label>
                      <Input
                        value={formState.currency}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            currency: event.target.value.toUpperCase(),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Sweep (jours)</Label>
                      <Input
                        value={formState.sweep_interval_days}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            sweep_interval_days: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Photo de profil</Label>
                      <Input
                        value={formState.profile_photo_url}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            profile_photo_url: event.target.value,
                          }))
                        }
                      />
                    </div>
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
                      <span className="text-xs text-emerald-600">
                        {saveState.message}
                      </span>
                    ) : null}
                    {saveState.error ? (
                      <span className="text-xs text-red-500">
                        {saveState.error}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900">
                    Sécurité & accès
                  </p>
                  <div className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-4 text-xs text-gray-500">
                    Le mot de passe actuel ne peut pas être affiché (hashé).
                    Tu peux définir un nouveau mot de passe ci-dessous.
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label>Nouveau mot de passe</Label>
                      <Input
                        type="password"
                        value={passwordState.password}
                        onChange={(event) =>
                          setPasswordState((prev) => ({
                            ...prev,
                            password: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Confirmer le mot de passe</Label>
                      <Input
                        type="password"
                        value={passwordState.confirm}
                        onChange={(event) =>
                          setPasswordState((prev) => ({
                            ...prev,
                            confirm: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={passwordState.loading}
                      className="bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      Réinitialiser le mot de passe
                    </Button>
                    {passwordState.message ? (
                      <span className="text-xs text-emerald-600">
                        {passwordState.message}
                      </span>
                    ) : null}
                    {passwordState.error ? (
                      <span className="text-xs text-red-500">
                        {passwordState.error}
                      </span>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-4">
                    <p className="text-sm font-semibold text-gray-900">
                      Demandes de réinitialisation du mot de passe
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Total: <strong>{passwordResetRequestCount}</strong> · Dernière demande:{" "}
                      <strong>{passwordResetLastRequestAt}</strong>
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      État actuel:{" "}
                      <strong>
                        {passwordResetBlockedMode === "none"
                          ? "autorisé"
                          : passwordResetBlockedMode === "permanent"
                          ? "bloqué définitivement"
                          : `bloqué temporairement${
                              passwordResetBlockedUntil ? ` jusqu'au ${passwordResetBlockedUntil}` : ""
                            }`}
                      </strong>
                    </p>
                    {selectedUser?.password_reset_block_reason ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Raison: <strong>{selectedUser.password_reset_block_reason}</strong>
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label>Mode de blocage</Label>
                        <select
                          className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm"
                          value={passwordResetBlockForm.mode}
                          onChange={(event) =>
                            setPasswordResetBlockForm((prev) => ({
                              ...prev,
                              mode: event.target.value as "none" | "temporary" | "permanent",
                            }))
                          }
                        >
                          <option value="none">Aucun blocage</option>
                          <option value="temporary">Temporaire</option>
                          <option value="permanent">Définitif</option>
                        </select>
                      </div>
                      {passwordResetBlockForm.mode === "temporary" ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label>Durée</Label>
                            <Input
                              value={passwordResetBlockForm.duration_value}
                              onChange={(event) =>
                                setPasswordResetBlockForm((prev) => ({
                                  ...prev,
                                  duration_value: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Unité</Label>
                            <select
                              className="mt-1 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm"
                              value={passwordResetBlockForm.duration_unit}
                              onChange={(event) =>
                                setPasswordResetBlockForm((prev) => ({
                                  ...prev,
                                  duration_unit: event.target.value as
                                    | "hours"
                                    | "days"
                                    | "months",
                                }))
                              }
                            >
                              <option value="hours">Heures</option>
                              <option value="days">Jours</option>
                              <option value="months">Mois (30j)</option>
                            </select>
                          </div>
                        </div>
                      ) : null}
                      <div>
                        <Label>Raison (optionnel)</Label>
                        <Input
                          value={passwordResetBlockForm.reason}
                          onChange={(event) =>
                            setPasswordResetBlockForm((prev) => ({
                              ...prev,
                              reason: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          onClick={handleApplyPasswordResetBlock}
                          disabled={passwordResetBlockState.loading}
                          className="bg-emerald-500 text-white hover:bg-emerald-600"
                        >
                          Appliquer le blocage
                        </Button>
                        {passwordResetBlockState.message ? (
                          <span className="text-xs text-emerald-600">
                            {passwordResetBlockState.message}
                          </span>
                        ) : null}
                        {passwordResetBlockState.error ? (
                          <span className="text-xs text-red-500">
                            {passwordResetBlockState.error}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleDelete}
                      disabled={Boolean(selectedUser?.deleted_at)}
                    >
                      Supprimer le compte
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      Enveloppes
                    </p>
                    <Badge tone="muted">{selectedEnvelopes.length}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedEnvelopes.slice(0, 8).map((env) => (
                      <span
                        key={env.id}
                        className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                      >
                        {env.name}
                      </span>
                    ))}
                    {selectedEnvelopes.length === 0 ? (
                      <span className="text-xs text-gray-500">
                        Aucune enveloppe.
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-[var(--surface)] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      Catégories
                    </p>
                    <Badge tone="muted">{selectedCategories.length}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCategories.slice(0, 8).map((cat) => (
                      <span
                        key={cat.id}
                        className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800"
                      >
                        {cat.name}
                      </span>
                    ))}
                    {selectedCategories.length === 0 ? (
                      <span className="text-xs text-gray-500">
                        Aucune catégorie.
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="spike-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="spike-title">IP bloquées</p>
            <p className="spike-subtitle">
              Liste globale des IP bloquées avec source et date de blocage.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadBlockedIpList(false)}
            disabled={blockedIpLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {blockedIpError ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {blockedIpError}
          </p>
        ) : null}
        {blockedIpAction.message ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {blockedIpAction.message}
          </p>
        ) : null}
        {blockedIpAction.error ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {blockedIpAction.error}
          </p>
        ) : null}

        {blockedIpLoading ? (
          <p className="mt-3 text-xs text-gray-500">Chargement des IP bloquées…</p>
        ) : null}

        {!blockedIpLoading && blockedIpList.length === 0 ? (
          <p className="mt-3 text-xs text-gray-500">Aucune IP bloquée.</p>
        ) : null}

        {!blockedIpLoading && blockedIpList.length > 0 ? (
          <div className="mt-3 space-y-2">
            {blockedIpList.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-[var(--surface)] px-3 py-2 text-xs"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    IP: {item.ip_address}
                  </p>
                  <p className="text-gray-600">
                    Bloquée le: <strong>{formatIsoDateTime(item.created_at)}</strong>
                  </p>
                  <p className="text-gray-600">
                    Source du blocage:{" "}
                    <strong>{item.source_user_email ?? "N/A"}</strong>
                    {item.source_session_id ? (
                      <> · Session {item.source_session_id.slice(0, 8)}</>
                    ) : null}
                  </p>
                  <p className="text-gray-600">
                    Bloquée par: <strong>{item.blocked_by_email ?? "N/A"}</strong>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => void handleUnblockIp(item)}
                  disabled={blockedIpAction.loadingId !== null}
                >
                  {blockedIpAction.loadingId === item.id ? "..." : "Débloquer"}
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Dialog open={pendingForceReset} onOpenChange={setPendingForceReset}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentMustReset
                ? "Retirer l'obligation de changement"
                : "Forcer le changement de mot de passe"}
            </DialogTitle>
            <DialogDescription>
              {currentMustReset
                ? "L'utilisateur pourra se connecter sans obligation immédiate."
                : "L'utilisateur devra définir un nouveau mot de passe à la prochaine connexion."}{" "}
              Compte concerné : <strong>{selectedUser?.email ?? "—"}</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="danger"
              onClick={handleForceResetConfirm}
              disabled={forceResetState.loading}
            >
              {currentMustReset ? "Retirer" : "Forcer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
