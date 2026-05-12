"use client";

import {
  Activity,
  AlertTriangle,
  CreditCard,
  FileText,
  Megaphone,
  ShieldAlert,
  Sparkles,
  Target,
  Wrench,
  X,
} from "lucide-react";

import { cn } from "@/lib/cn";

type MessageVariant = "maintenance" | "announcement";

type AnnouncementType =
  | "security"
  | "scheduled_maintenance"
  | "product"
  | "billing"
  | "marketing"
  | "legal"
  | "performance"
  | "custom";

const ANNOUNCEMENT_STYLES: Record<AnnouncementType, {
  title: string;
  tone: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  security: {
    title: "Alerte sécurité",
    icon: ShieldAlert,
    tone: "border-red-200/70 bg-gradient-to-br from-red-50 via-[var(--surface)] to-[var(--surface)] text-red-700",
  },
  scheduled_maintenance: {
    title: "Maintenance programmée",
    icon: Wrench,
    tone: "border-amber-200/70 bg-gradient-to-br from-amber-50 via-[var(--surface)] to-[var(--surface)] text-amber-700",
  },
  product: {
    title: "Nouveauté produit",
    icon: Sparkles,
    tone: "border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-[var(--surface)] to-[var(--surface)] text-emerald-700",
  },
  billing: {
    title: "Alerte paiement",
    icon: CreditCard,
    tone: "border-rose-200/70 bg-gradient-to-br from-rose-50 via-[var(--surface)] to-[var(--surface)] text-rose-700",
  },
  marketing: {
    title: "Message marketing",
    icon: Megaphone,
    tone: "border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-50 via-[var(--surface)] to-[var(--surface)] text-fuchsia-700",
  },
  legal: {
    title: "Message légal",
    icon: FileText,
    tone: "border-slate-200/70 bg-gradient-to-br from-slate-50 via-[var(--surface)] to-[var(--surface)] text-slate-700",
  },
  performance: {
    title: "Alerte performance",
    icon: Activity,
    tone: "border-yellow-200/70 bg-gradient-to-br from-yellow-50 via-[var(--surface)] to-[var(--surface)] text-yellow-800",
  },
  custom: {
    title: "Message personnalisé",
    icon: Target,
    tone: "border-red-200/70 bg-gradient-to-br from-rose-50 via-[var(--surface)] to-[var(--surface)] text-red-700",
  },
};

const MAINTENANCE_STYLE = {
  title: "Maintenance en cours",
  icon: AlertTriangle,
  tone: "border-amber-200/70 bg-gradient-to-br from-amber-50 via-[var(--surface)] to-[var(--surface)] text-amber-700",
};

type SystemMessageCardProps = {
  variant: MessageVariant;
  message: string;
  announcementType?: AnnouncementType | string | null;
  suffix?: string;
  className?: string;
  showClose?: boolean;
  onClose?: () => void;
};

export function SystemMessageCard({
  variant,
  message,
  announcementType,
  suffix,
  className,
  showClose = false,
  onClose,
}: SystemMessageCardProps) {
  const trimmed = message.trim();
  if (!trimmed) return null;

  const style =
    variant === "maintenance"
      ? MAINTENANCE_STYLE
      : ANNOUNCEMENT_STYLES[
          (announcementType as AnnouncementType) || "custom"
        ] ?? ANNOUNCEMENT_STYLES.custom;

  const Icon = style.icon;

  return (
    <div
      className={cn(
        "rounded-3xl border px-4 py-3 shadow-sm",
        style.tone,
        showClose ? "relative pr-10" : "",
        className
      )}
    >
      {showClose && onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le message"
          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface)]/70 text-[var(--ink)] shadow-sm transition hover:bg-[var(--surface)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-2xl bg-[var(--surface)]/70 p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-inherit">{style.title}</p>
          <p className="text-xs whitespace-pre-line">
            {trimmed}
            {suffix ? ` ${suffix}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
