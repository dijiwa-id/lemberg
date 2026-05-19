import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  Check,
  X,
  RotateCcw,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Users,
  AlertCircle,
} from "lucide-react";
import { Card } from "./Card";
import { StatCard } from "./StatCard";
import {
  deleteReservation,
  fetchReservations,
  updateReservation,
} from "../../services/api";
import type { Reservation } from "../../lib/types";
import {
  formatVisitDate,
  relativeCreated,
  relativeVisit,
  reservationRef,
  sortReservations,
  statusPreset,
} from "../../lib/reservationHelpers";
import { cn } from "../../lib/utils";

type StatusFilter = "all" | "new" | "confirmed" | "cancelled";

interface ReservationsListProps {
  /** Reservations are fetched on mount + after each mutation. The parent
   *  receives a count callback so it can show a badge on the tab.        */
  onCountChange?: (counts: { total: number; new: number }) => void;
}

export function ReservationsList({ onCountChange }: ReservationsListProps) {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReservations();
      setRows(sortReservations(data));
    } catch (e: any) {
      setError("Could not load reservations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    onCountChange?.({
      total: rows.length,
      new: rows.filter((r) => r.status === "new").length,
    });
  }, [rows, onCountChange]);

  const counts = useMemo(() => {
    const c = { total: rows.length, new: 0, confirmed: 0, cancelled: 0 };
    rows.forEach((r) => {
      if (r.status === "new") c.new++;
      else if (r.status === "confirmed") c.confirmed++;
      else if (r.status === "cancelled") c.cancelled++;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  async function changeStatus(r: Reservation, next: string) {
    // Optimistic update
    setRows((cur) =>
      cur.map((x) => (x.id === r.id ? { ...x, status: next } : x))
    );
    try {
      const updated = await updateReservation(r.id, { status: next });
      setRows((cur) =>
        cur.map((x) => (x.id === r.id ? updated : x))
      );
    } catch {
      load(); // rollback by reloading
    }
  }

  async function remove(r: Reservation) {
    if (!confirm(`Delete reservation ${reservationRef(r)} from ${r.name}? This cannot be undone.`)) {
      return;
    }
    setRows((cur) => cur.filter((x) => x.id !== r.id));
    try {
      await deleteReservation(r.id);
    } catch {
      load();
    }
  }

  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="All requests"
          value={counts.total}
          hint="Lifetime submissions"
        />
        <StatCard
          icon={AlertCircle}
          label="Awaiting reply"
          value={counts.new}
          hint={counts.new === 0 ? "All clear." : "Triage these next."}
          accent="pearl"
        />
        <StatCard label="Confirmed" value={counts.confirmed} />
        <StatCard
          label="Cancelled"
          value={counts.cancelled}
          accent={counts.cancelled > 0 ? "wine" : "default"}
        />
      </div>

      {/* Filter + refresh */}
      <Card
        title="Filter"
        description={`Showing ${filtered.length} of ${counts.total} reservations.`}
        action={
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 border border-[var(--color-ink-600)] px-3 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)] disabled:opacity-60"
          >
            <RefreshCw
              size={12}
              className={cn(loading && "animate-spin")}
            />
            Refresh
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="All"
            count={counts.total}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterChip
            label="New"
            count={counts.new}
            active={filter === "new"}
            onClick={() => setFilter("new")}
            tone="pearl"
          />
          <FilterChip
            label="Confirmed"
            count={counts.confirmed}
            active={filter === "confirmed"}
            onClick={() => setFilter("confirmed")}
          />
          <FilterChip
            label="Cancelled"
            count={counts.cancelled}
            active={filter === "cancelled"}
            onClick={() => setFilter("cancelled")}
            tone="wine"
          />
        </div>
        {error && (
          <p className="mt-4 label-eyebrow text-[var(--color-wine-500)]">{error}</p>
        )}
      </Card>

      {/* List */}
      <Card
        title={`Requests (${filtered.length})`}
        description={
          counts.new > 0
            ? `${counts.new} new reservation${counts.new === 1 ? "" : "s"} awaiting your reply.`
            : "All requests have been triaged."
        }
        bodyClassName="p-0"
      >
        {loading && rows.length === 0 ? (
          <div className="p-10 text-center label-eyebrow text-[var(--color-bone-500)]">
            Loading reservations…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <ul className="divide-y divide-[var(--color-ink-700)]">
            {filtered.map((r) => (
              <ReservationRow
                key={r.id}
                reservation={r}
                onChangeStatus={changeStatus}
                onDelete={remove}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function FilterChip({
  label,
  count,
  active,
  onClick,
  tone = "neutral",
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  tone?: "neutral" | "pearl" | "wine";
}) {
  const accentBorder =
    tone === "pearl"
      ? "border-[var(--color-pearl-300)]"
      : tone === "wine"
        ? "border-[var(--color-wine-700)]"
        : "border-[var(--color-bone-400)]";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-3 border px-4 py-2 label-eyebrow transition-colors",
        active
          ? `${accentBorder} bg-[var(--color-ink-700)] text-[var(--color-bone-100)]`
          : "border-[var(--color-ink-600)] text-[var(--color-bone-400)] hover:border-[var(--color-bone-500)] hover:text-[var(--color-bone-100)]"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "min-w-[20px] border px-1.5 text-center font-mono text-[10px]",
          active
            ? "border-[var(--color-bone-400)] text-[var(--color-bone-100)]"
            : "border-[var(--color-ink-600)] text-[var(--color-bone-500)]"
        )}
      >
        {count}
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function ReservationRow({
  reservation,
  onChangeStatus,
  onDelete,
}: {
  reservation: Reservation;
  onChangeStatus: (r: Reservation, next: string) => void;
  onDelete: (r: Reservation) => void;
}) {
  const [open, setOpen] = useState(false);
  const preset = statusPreset(reservation.status);
  const isNew = reservation.status === "new";
  const ref = reservationRef(reservation);
  const dateLabel = formatVisitDate(reservation.visit_date);
  const visitRel = relativeVisit(reservation.visit_date);
  const submittedRel = relativeCreated(reservation.createdAt);

  return (
    <li>
      <div
        className={cn(
          "flex flex-wrap items-center gap-4 px-6 py-4 transition-colors",
          isNew ? "bg-[color-mix(in_srgb,var(--color-pearl-300)_4%,transparent)]" : ""
        )}
      >
        {/* Status dot indicator */}
        <span
          className={cn("inline-block h-2 w-2 shrink-0 rounded-full", preset.dot)}
          aria-hidden
        />

        {/* Reference + guest */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-[11px] text-[var(--color-bone-500)]">
              {ref}
            </span>
            <p className="truncate font-display text-base leading-tight text-[var(--color-bone-100)]">
              {reservation.name}
            </p>
          </div>
          <p className="mt-1 truncate text-xs text-[var(--color-bone-400)]">
            <Users size={11} className="-mt-0.5 inline align-baseline" />{" "}
            {reservation.party_size} guest{reservation.party_size === 1 ? "" : "s"}
            {" · "}
            <Calendar size={11} className="-mt-0.5 inline align-baseline" />{" "}
            {dateLabel} · {reservation.visit_time}
            {visitRel && (
              <span className="ml-2 text-[var(--color-bone-500)]">
                ({visitRel})
              </span>
            )}
          </p>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 border px-2.5 py-1 label-eyebrow",
            preset.className
          )}
        >
          {preset.label}
        </span>

        <span className="hidden label-eyebrow text-[var(--color-bone-500)] md:inline">
          {submittedRel}
        </span>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 border border-[var(--color-ink-600)] px-3 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
          aria-expanded={open}
          aria-label={open ? "Close details" : "Open details"}
        >
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <span className="hidden sm:inline">{open ? "Close" : "Details"}</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-[var(--color-ink-700)] bg-[var(--color-ink-900)] px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailRow
                icon={Mail}
                label="Email"
                value={
                  <a
                    href={`mailto:${reservation.email}?subject=Reservation%20${ref}`}
                    className="link-underline text-[var(--color-bone-100)]"
                  >
                    {reservation.email}
                  </a>
                }
              />
              <DetailRow
                icon={Phone}
                label="Phone"
                value={
                  reservation.phone ? (
                    <a
                      href={`tel:${reservation.phone}`}
                      className="link-underline text-[var(--color-bone-100)]"
                    >
                      {reservation.phone}
                    </a>
                  ) : (
                    <span className="text-[var(--color-bone-500)]">—</span>
                  )
                }
              />
              <DetailRow
                icon={Users}
                label="Party size"
                value={
                  <span className="text-[var(--color-bone-100)]">
                    {reservation.party_size}
                  </span>
                }
              />
              <DetailRow
                icon={Calendar}
                label="Visit"
                value={
                  <span className="text-[var(--color-bone-100)]">
                    {dateLabel} at {reservation.visit_time}
                    {visitRel && (
                      <span className="ml-2 text-[var(--color-bone-500)]">
                        ({visitRel})
                      </span>
                    )}
                  </span>
                }
              />
              <div className="sm:col-span-2">
                <DetailRow
                  icon={MessageSquare}
                  label="Message"
                  value={
                    reservation.message ? (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-bone-200)]">
                        {reservation.message}
                      </p>
                    ) : (
                      <span className="text-[var(--color-bone-500)]">No notes</span>
                    )
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <dt className="label-eyebrow text-[var(--color-bone-500)]">
                  Submitted
                </dt>
                <dd className="mt-1 text-xs text-[var(--color-bone-400)]">
                  {new Date(reservation.createdAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <span className="ml-2 text-[var(--color-bone-500)]">
                    · {submittedRel}
                  </span>
                </dd>
              </div>
            </dl>

            {/* Action panel */}
            <div className="flex flex-col gap-2 border-t border-[var(--color-ink-700)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="label-eyebrow text-[var(--color-bone-500)]">Actions</p>

              {reservation.status === "new" && (
                <>
                  <button
                    onClick={() => onChangeStatus(reservation, "confirmed")}
                    className="flex items-center gap-2 bg-[var(--color-bone-50)] px-4 py-2.5 label-eyebrow text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)]"
                  >
                    <Check size={12} /> Confirm tasting
                  </button>
                  <button
                    onClick={() => onChangeStatus(reservation, "cancelled")}
                    className="flex items-center gap-2 border border-[var(--color-wine-700)] px-4 py-2.5 label-eyebrow text-[var(--color-wine-500)] transition-colors hover:bg-[var(--color-wine-700)] hover:text-[var(--color-bone-50)]"
                  >
                    <X size={12} /> Decline
                  </button>
                </>
              )}

              {reservation.status === "confirmed" && (
                <button
                  onClick={() => onChangeStatus(reservation, "cancelled")}
                  className="flex items-center gap-2 border border-[var(--color-wine-700)] px-4 py-2.5 label-eyebrow text-[var(--color-wine-500)] transition-colors hover:bg-[var(--color-wine-700)] hover:text-[var(--color-bone-50)]"
                >
                  <X size={12} /> Mark cancelled
                </button>
              )}

              {reservation.status === "cancelled" && (
                <button
                  onClick={() => onChangeStatus(reservation, "new")}
                  className="flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2.5 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
                >
                  <RotateCcw size={12} /> Reopen as new
                </button>
              )}

              <a
                href={`mailto:${reservation.email}?subject=Re:%20Reservation%20${ref}&body=Dear%20${encodeURIComponent(reservation.name)}%2C%0A%0A`}
                className="flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2.5 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
              >
                <Mail size={12} /> Reply by email
              </a>

              <button
                onClick={() => onDelete(reservation)}
                className="mt-2 flex items-center gap-2 px-4 py-2.5 label-eyebrow text-[var(--color-bone-500)] transition-colors hover:text-[var(--color-wine-500)]"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="label-eyebrow flex items-center gap-2 text-[var(--color-bone-500)]">
        <Icon size={11} />
        {label}
      </dt>
      <dd className="mt-2 text-sm">{value}</dd>
    </div>
  );
}

function EmptyState({ filter }: { filter: StatusFilter }) {
  const label =
    filter === "all"
      ? "No reservations yet."
      : `No ${filter} reservations.`;
  const hint =
    filter === "all"
      ? "When visitors submit the booking form, requests appear here for you to confirm or decline."
      : filter === "new"
        ? "Inbox zero — every request has been triaged."
        : "Switch filter to see other requests.";
  return (
    <div className="p-12 text-center">
      <p className="font-display text-xl text-[var(--color-bone-200)]">{label}</p>
      <p className="mt-2 max-w-sm mx-auto text-sm leading-relaxed text-[var(--color-bone-500)]">
        {hint}
      </p>
    </div>
  );
}
