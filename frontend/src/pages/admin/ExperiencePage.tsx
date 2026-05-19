import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileEdit, ClipboardList } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { ImageField, TextField } from "../../components/admin/Field";
import { ReservationsList } from "../../components/admin/ReservationsList";
import { fetchReservations } from "../../services/api";
import { cn } from "../../lib/utils";
import type { AdminContext } from "../Admin";

type ExperienceTab = "content" | "reservations";

export function ExperiencePage({ ctx }: { ctx: AdminContext }) {
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get("tab") as ExperienceTab) === "reservations"
    ? "reservations"
    : "content";
  const [tab, setTab] = useState<ExperienceTab>(initialTab);

  // Lightweight badge counter — fetched once on mount so the tab can show
  // "Reservations · 3 new" without requiring the user to switch tabs first.
  // The full list inside the Reservations tab manages its own state and
  // refreshes via the onCountChange callback to keep this badge in sync.
  const [counts, setCounts] = useState<{ total: number; new: number }>({
    total: 0,
    new: 0,
  });

  useEffect(() => {
    let alive = true;
    fetchReservations()
      .then((rows) => {
        if (!alive) return;
        setCounts({
          total: rows.length,
          new: rows.filter((r) => r.status === "new").length,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function switchTab(next: ExperienceTab) {
    setTab(next);
    const p = new URLSearchParams(params);
    if (next === "content") p.delete("tab");
    else p.set("tab", next);
    setParams(p, { replace: true });
  }

  const onCountChange = useCallback(
    (c: { total: number; new: number }) => setCounts(c),
    []
  );

  return (
    <>
      <PageHeader
        eyebrow="Section 07"
        title="Experience"
        description="Visiting the estate — tasting copy, opening hours, the booking CTA, and the reservation inbox."
      />

      {/* Tabs */}
      <nav
        role="tablist"
        aria-label="Experience sub-sections"
        className="flex gap-1 border-b border-[var(--color-ink-700)] bg-[var(--color-ink-900)] px-5 lg:px-10"
      >
        <TabButton
          icon={FileEdit}
          label="Section content"
          active={tab === "content"}
          onClick={() => switchTab("content")}
        />
        <TabButton
          icon={ClipboardList}
          label="Reservations"
          active={tab === "reservations"}
          onClick={() => switchTab("reservations")}
          badge={counts.total > 0 ? counts.total : undefined}
          highlight={counts.new > 0}
        />
      </nav>

      <div className="p-5 lg:p-10">
        {tab === "content" ? (
          <ContentTab ctx={ctx} />
        ) : (
          <ReservationsList onCountChange={onCountChange} />
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  highlight,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  highlight?: boolean;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative -mb-px flex items-center gap-2.5 border-b-2 px-4 py-4 label-eyebrow transition-colors",
        active
          ? "border-[var(--color-pearl-300)] text-[var(--color-bone-100)]"
          : "border-transparent text-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
      )}
    >
      <Icon size={13} />
      <span>{label}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "ml-1 flex h-5 min-w-[20px] items-center justify-center border px-1.5 font-mono text-[10px]",
            highlight
              ? "border-[var(--color-pearl-300)] bg-[color-mix(in_srgb,var(--color-pearl-300)_15%,transparent)] text-[var(--color-pearl-300)]"
              : "border-[var(--color-ink-600)] text-[var(--color-bone-400)]"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function ContentTab({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card title="Copy" description="Headline, italic accent and body paragraph.">
          <div className="grid gap-5">
            <TextField
              label="Eyebrow"
              value={config.experienceEyebrow || ""}
              onChange={(v) => update({ experienceEyebrow: v })}
              placeholder="Visit the estate"
            />
            <TextField
              label="Heading"
              value={config.experienceHeading || ""}
              onChange={(v) => update({ experienceHeading: v })}
              placeholder="Stay a while."
            />
            <TextField
              label="Italic accent line"
              value={config.experienceItalic || ""}
              onChange={(v) => update({ experienceItalic: v })}
              placeholder="Savour the depth."
            />
            <TextField
              label="Body"
              multiline
              rows={4}
              value={config.experienceBody || ""}
              onChange={(v) => update({ experienceBody: v })}
            />
          </div>
        </Card>

        <div className="mt-6">
          <Card
            title="Visit facts"
            description="Three small label/value pairs that sit above the booking button. Clear a value to hide that row."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Hours"
                value={config.experienceHours || ""}
                onChange={(v) => update({ experienceHours: v })}
                placeholder="Tue–Sat · 10:00 — 16:00"
              />
              <TextField
                label="Tasting"
                value={config.experienceTasting || ""}
                onChange={(v) => update({ experienceTasting: v })}
                placeholder="6 wines · 75 min"
              />
              <div className="md:col-span-2">
                <TextField
                  label="Booking"
                  value={config.experienceBooking || ""}
                  onChange={(v) => update({ experienceBooking: v })}
                  placeholder="By appointment only"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Card
            title="Call to action"
            description="The button label and the email address shown in the Reservation page sidebar."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="CTA label"
                value={config.experienceCta || ""}
                onChange={(v) => update({ experienceCta: v })}
                placeholder="Book a tasting"
              />
              <TextField
                label="Booking email"
                value={config.experienceCtaEmail || ""}
                onChange={(v) => update({ experienceCtaEmail: v })}
                placeholder="bookings@lemberg.co.za"
                hint="Used as the 'Or write to us' fallback. Leave blank to use the Footer email."
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="lg:col-span-1">
        <Card title="Image" description="Portrait, 5:6 aspect.">
          <ImageField
            label="Section image"
            value={config.experienceImage || ""}
            onChange={(v) => update({ experienceImage: v })}
            aspect="aspect-[5/6]"
          />
        </Card>
      </div>
    </div>
  );
}
