"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { usePlatformStatus } from "@/lib/usePlatformStatus";
import { fetchMe, type AuthUser } from "@/lib/auth";
import { getVisibleAnnouncements } from "@/lib/announcementVisibility";
import { useAppLocale } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import { SystemMessageCard } from "@/components/announcements/SystemMessageCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

const ANNOUNCEMENT_COPY: Record<
  FloussyLocale,
  { superadminOnly: string; importantMessage: string; currentSystemInfo: string }
> = {
  fr: {
    superadminOnly: "Seuls les superadmins peuvent se connecter.",
    importantMessage: "Message important",
    currentSystemInfo: "Informations système ou annonces en cours.",
  },
  en: {
    superadminOnly: "Only superadmins can sign in.",
    importantMessage: "Important message",
    currentSystemInfo: "Current system information or active announcements.",
  },
  ar: {
    superadminOnly: "غير السوبر أدمن اللي يقدرو يدخلو دابا.",
    importantMessage: "رسالة مهمة",
    currentSystemInfo: "معلومات على النظام أو إعلانات خدامين دابا.",
  },
};

export function GlobalMessageLayer() {
  const { locale, dir } = useAppLocale();
  const copy = ANNOUNCEMENT_COPY[locale];
  const status = usePlatformStatus();
  const pathname = usePathname();
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [dismissedStickyMaintenance, setDismissedStickyMaintenance] = useState(false);
  const [dismissedFooterMaintenance, setDismissedFooterMaintenance] = useState(false);
  const [dismissedStickyAnnouncementIds, setDismissedStickyAnnouncementIds] = useState<
    string[]
  >([]);
  const [dismissedFooterAnnouncementIds, setDismissedFooterAnnouncementIds] = useState<
    string[]
  >([]);

  const maintenanceActive = Boolean(
    status?.maintenance_mode && status?.maintenance_message?.trim()
  );
  const maintenancePlacements = status?.maintenance_placements ?? [];
  const isLanding = pathname === "/";

  const visibleAnnouncements = useMemo(
    () => getVisibleAnnouncements(status, viewer),
    [status, viewer]
  );

  const stickyAnnouncements = useMemo(
    () =>
      visibleAnnouncements.filter(
        (announcement) =>
          announcement.placements.includes("global_sticky") &&
          !dismissedStickyAnnouncementIds.includes(announcement.id)
      ),
    [dismissedStickyAnnouncementIds, visibleAnnouncements]
  );

  const footerAnnouncements = useMemo(
    () =>
      visibleAnnouncements.filter(
        (announcement) =>
          announcement.placements.includes("global_footer") &&
          !dismissedFooterAnnouncementIds.includes(announcement.id)
      ),
    [dismissedFooterAnnouncementIds, visibleAnnouncements]
  );

  const popupAnnouncements = useMemo(
    () =>
      visibleAnnouncements.filter((announcement) =>
        announcement.placements.includes("global_popup")
      ),
    [visibleAnnouncements]
  );

  const showSticky =
    isLanding &&
    ((maintenanceActive &&
      maintenancePlacements.includes("global_sticky") &&
      !dismissedStickyMaintenance) ||
      stickyAnnouncements.length > 0);

  const showFooter =
    isLanding &&
    ((maintenanceActive &&
      maintenancePlacements.includes("global_footer") &&
      !dismissedFooterMaintenance) ||
      footerAnnouncements.length > 0);

  const showPopup =
    (maintenanceActive && maintenancePlacements.includes("global_popup")) ||
    popupAnnouncements.length > 0;

  useEffect(() => {
    const publicPaths = new Set([
      "/",
      "/login",
      "/register",
      "/mobile-login",
      "/forgot-password",
      "/reset-password",
    ]);
    if (publicPaths.has(pathname)) {
      setViewer(null);
      return;
    }
    fetchMe({ suppressAuthRedirect: true })
      .then(setViewer)
      .catch(() => setViewer(null));
  }, [pathname]);

  if (!status) return null;

  return (
    <>
      {showSticky ? (
        <div className="fixed inset-x-3 top-3 z-40 mx-auto flex max-w-3xl flex-col gap-2">
          {maintenanceActive &&
          maintenancePlacements.includes("global_sticky") &&
          !dismissedStickyMaintenance ? (
            <SystemMessageCard
              variant="maintenance"
              message={status.maintenance_message}
              suffix={copy.superadminOnly}
              showClose
              onClose={() => setDismissedStickyMaintenance(true)}
            />
          ) : null}
          {stickyAnnouncements.map((announcement) => (
            <SystemMessageCard
              key={announcement.id}
              variant="announcement"
              message={announcement.message}
              announcementType={announcement.type}
              showClose
              onClose={() =>
                setDismissedStickyAnnouncementIds((prev) =>
                  prev.includes(announcement.id) ? prev : [...prev, announcement.id]
                )
              }
            />
          ))}
        </div>
      ) : null}

      {showFooter ? (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl flex-col gap-2">
          {maintenanceActive &&
          maintenancePlacements.includes("global_footer") &&
          !dismissedFooterMaintenance ? (
            <SystemMessageCard
              variant="maintenance"
              message={status.maintenance_message}
              suffix={copy.superadminOnly}
              showClose
              onClose={() => setDismissedFooterMaintenance(true)}
            />
          ) : null}
          {footerAnnouncements.map((announcement) => (
            <SystemMessageCard
              key={announcement.id}
              variant="announcement"
              message={announcement.message}
              announcementType={announcement.type}
              showClose
              onClose={() =>
                setDismissedFooterAnnouncementIds((prev) =>
                  prev.includes(announcement.id) ? prev : [...prev, announcement.id]
                )
              }
            />
          ))}
        </div>
      ) : null}

      {showPopup ? (
        <Dialog defaultOpen>
          <DialogContent dir={dir}>
            <DialogHeader>
              <DialogTitle>{copy.importantMessage}</DialogTitle>
              <DialogDescription>{copy.currentSystemInfo}</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              {maintenanceActive && maintenancePlacements.includes("global_popup") ? (
                <SystemMessageCard
                  key="maintenance"
                  variant="maintenance"
                  message={status.maintenance_message}
                  suffix={copy.superadminOnly}
                />
              ) : null}
              {popupAnnouncements.map((announcement) => (
                <SystemMessageCard
                  key={announcement.id}
                  variant="announcement"
                  message={announcement.message}
                  announcementType={announcement.type}
                />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
