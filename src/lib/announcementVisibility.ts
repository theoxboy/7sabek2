import type { AuthUser } from "@/lib/auth";
import type {
  PlatformAnnouncementOut,
  PlatformStatusOut,
} from "@/lib/types";

function normalizeList(values?: string[]) {
  return (values ?? [])
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function buildLegacyAnnouncement(status: PlatformStatusOut): PlatformAnnouncementOut {
  return {
    id: "legacy-primary",
    label: "Annonce",
    enabled: status.announcement_enabled,
    active: status.announcement_active,
    message: status.announcement_message,
    type: status.announcement_type,
    placements: status.announcement_placements,
    start_at: status.announcement_start_at,
    end_at: status.announcement_end_at,
    timezone: status.announcement_timezone,
    recurrence: status.announcement_recurrence,
    roles: status.announcement_roles,
    statuses: status.announcement_statuses,
    countries: status.announcement_countries,
  };
}

function getStatusAnnouncements(status: PlatformStatusOut): PlatformAnnouncementOut[] {
  if (status.announcements?.length) return status.announcements;
  return [buildLegacyAnnouncement(status)];
}

function isAudienceMatch(
  announcement: PlatformAnnouncementOut,
  user: AuthUser | null
): boolean {
  const roles = normalizeList(announcement.roles);
  const statuses = normalizeList(announcement.statuses);
  const countries = normalizeList(announcement.countries);

  const rolesAny = roles.length === 0 || roles.includes("any");
  const statusesAny = statuses.length === 0 || statuses.includes("any");
  const countriesAny = countries.length === 0;

  const roleMatch =
    rolesAny ||
    (user ? roles.includes(user.role.toLowerCase()) : roles.includes("public"));

  const statusMatch =
    statusesAny ||
    (user?.status ? statuses.includes(user.status.toLowerCase()) : false);

  const countryMatch =
    countriesAny ||
    (user?.country
      ? countries.includes(user.country.trim().toLowerCase())
      : false);

  return roleMatch && statusMatch && countryMatch;
}

export function getVisibleAnnouncements(
  status: PlatformStatusOut | null,
  user: AuthUser | null,
  placement?: string
): PlatformAnnouncementOut[] {
  if (!status || !status.announcement_enabled) return [];

  return getStatusAnnouncements(status).filter((announcement) => {
    if (!announcement.enabled || !announcement.active) return false;
    if (!announcement.message?.trim()) return false;
    if (placement && !announcement.placements.includes(placement)) return false;
    return isAudienceMatch(announcement, user);
  });
}

export function isAnnouncementVisible(
  status: PlatformStatusOut | null,
  user: AuthUser | null,
  placement?: string
): boolean {
  return getVisibleAnnouncements(status, user, placement).length > 0;
}
