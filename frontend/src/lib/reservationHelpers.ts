import type { Reservation } from "./types";

export type ReservationStatus = "new" | "confirmed" | "cancelled";

export const RESERVATION_REF_PREFIX = "LMB-";

export function reservationRef(r: Pick<Reservation, "id">): string {
  return `${RESERVATION_REF_PREFIX}${String(r.id).padStart(5, "0")}`;
}

/** Tue, 19 May 2026 */
export function formatVisitDate(iso: string, locale = "en-GB"): string {
  if (!iso) return "—";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Returns "in 3 days", "today", "2 days ago", or "" if can't be parsed. */
export function relativeVisit(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = d.getTime() - today.getTime();
    const days = Math.round(diffMs / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    if (days === -1) return "yesterday";
    if (days > 0) return `in ${days} days`;
    return `${Math.abs(days)} days ago`;
  } catch {
    return "";
  }
}

/** Short relative time for createdAt timestamps. */
export function relativeCreated(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (sec < 60) return "just now";
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export const STATUS_PRESET: Record<
  ReservationStatus,
  { label: string; className: string; dot: string }
> = {
  new: {
    label: "New",
    className:
      "border-[color-mix(in_srgb,var(--color-pearl-300)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-pearl-300)_10%,transparent)] text-[var(--color-pearl-300)]",
    dot: "bg-[var(--color-pearl-300)]",
  },
  confirmed: {
    label: "Confirmed",
    className:
      "border-[var(--border-default)] bg-[color-mix(in_srgb,var(--color-bone-300)_8%,transparent)] text-[var(--color-bone-200)]",
    dot: "bg-[var(--color-bone-300)]",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "border-[color-mix(in_srgb,var(--color-wine-700)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-wine-700)_12%,transparent)] text-[var(--color-wine-500)]",
    dot: "bg-[var(--color-wine-500)]",
  },
};

export function statusPreset(status: string) {
  return STATUS_PRESET[(status as ReservationStatus)] || STATUS_PRESET.new;
}

/** Sort: status priority (new > confirmed > cancelled) then createdAt desc. */
export function sortReservations(rows: Reservation[]): Reservation[] {
  const priority: Record<string, number> = { new: 0, confirmed: 1, cancelled: 2 };
  return [...rows].sort((a, b) => {
    const pa = priority[a.status] ?? 99;
    const pb = priority[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}
