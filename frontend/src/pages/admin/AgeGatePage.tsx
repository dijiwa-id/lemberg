import { useState } from "react";
import { Eye, ShieldCheck, ShieldOff } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { ImageField, SelectField, TextField, RichTextField } from "../../components/admin/Field";
import { ToggleField } from "../../components/admin/ToggleField";
import { AgeGate } from "../../components/AgeGate";
import { Monogram } from "../../components/Monogram";
import { cn } from "../../lib/utils";
import { clearAgeGateState } from "../../lib/ageGate";
import type { AdminContext } from "../Admin";

/* ─────────────────────────────────────────────────────────────────────
 * Age verification — admin
 *
 * Compliance pop-up shown to public visitors. The admin doesn't see the
 * gate while editing (AgeGate skips when window.location is /admin/*),
 * but a "Preview" button here can summon it on-demand so editors can
 * review their copy before publishing.
 * ─────────────────────────────────────────────────────────────────── */

const REMEMBER_OPTIONS = [
  { value: "1", label: "1 day — strict (re-prompt frequently)" },
  { value: "7", label: "7 days — moderate" },
  { value: "30", label: "30 days — balanced (recommended)" },
  { value: "90", label: "90 days — relaxed" },
  { value: "365", label: "365 days — once a year" },
];

export function AgeGatePage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;
  const enabled = (config.ageGateEnabled || "").toLowerCase() === "true";

  // On-demand preview — bypasses localStorage and admin-route detection so
  // editors can see the gate without leaving /admin or clearing storage
  // by hand.
  const [previewing, setPreviewing] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Tools"
        title="Age verification"
        description="Compliance pop-up shown to public visitors before they can browse the site. Required in many regions for alcohol-related content."
      >
        <button
          onClick={() => setPreviewing(true)}
          className="flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
        >
          <Eye size={13} /> Preview gate
        </button>
        <button
          onClick={() => clearAgeGateState()}
          title="Removes the locally-stored confirmation so the next public-site visit will see the gate again. Useful when you've just edited the copy and want to QA it."
          className="flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
        >
          Reset local confirmation
        </button>
      </PageHeader>

      <div className="space-y-6 p-5 lg:p-10">
        {/* ── Status ────────────────────────────────────────── */}
        <Card
          title="Status"
          description="Master switch — toggle off when not legally required, or to temporarily disable the gate while editing copy."
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <ToggleField
              label="Enable age verification gate"
              description={
                enabled
                  ? "Active — visitors will see the pop-up before they can interact with the site."
                  : "Off — visitors enter the site directly with no gate."
              }
              value={enabled}
              onChange={(v) => update({ ageGateEnabled: v ? "true" : "false" })}
            />
            <StatusBadge enabled={enabled} />
          </div>
        </Card>

        {/* ── Copy ──────────────────────────────────────────── */}
        <Card
          title="Copy"
          description="The wording visitors will read. Keep the heading short — italic accent picks up the editorial style of the landing page."
        >
          <div className={cn("grid gap-5", !enabled && "opacity-70")}>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Heading"
                value={config.ageGateHeading || ""}
                onChange={(v) => update({ ageGateHeading: v })}
                placeholder="Are you of"
                hint="Lead line of the question."
              />
              <TextField
                label="Italic accent line"
                value={config.ageGateHeadingItalic || ""}
                onChange={(v) => update({ ageGateHeadingItalic: v })}
                placeholder="legal drinking age?"
                hint="Rendered in italic pearl. Leave blank for a single-line heading."
              />
            </div>
            <RichTextField
              label="Body"
              value={config.ageGateBody || ""}
              onChange={(v) => update({ ageGateBody: v })}
              placeholder="The wines of Lemberg Estate are intended for visitors aged 18 and over…"
            />
            <div className="grid gap-5 md:grid-cols-3">
              <TextField
                label="Minimum age"
                value={config.ageGateMinAge || ""}
                onChange={(v) => update({ ageGateMinAge: v.replace(/[^\d]/g, "") })}
                placeholder="18"
                hint="Number only. Shown in the verification chip."
              />
              <TextField
                label="Confirm button"
                value={config.ageGateConfirmLabel || ""}
                onChange={(v) => update({ ageGateConfirmLabel: v })}
                placeholder="Yes, I am of age"
              />
              <TextField
                label="Deny button"
                value={config.ageGateDenyLabel || ""}
                onChange={(v) => update({ ageGateDenyLabel: v })}
                placeholder="I'm under age"
              />
            </div>
            <RichTextField
              label="Denial message"
              value={config.ageGateDenyMessage || ""}
              onChange={(v) => update({ ageGateDenyMessage: v })}
              placeholder="Thank you for your honesty. Please come back when you are old enough…"
              hint="Shown after a visitor selects the deny button. Keep it respectful — no confirmation is stored, so they can return next session."
            />
          </div>
        </Card>

        {/* ── Behaviour ─────────────────────────────────────── */}
        <Card
          title="Behaviour"
          description="How long a successful confirmation is remembered. Confirmations are stored only on the visitor's device — privacy-respecting."
        >
          <div className={cn("grid gap-5 md:grid-cols-2", !enabled && "opacity-70")}>
            <SelectField
              label="Remember confirmation for"
              value={config.ageGateRememberDays || "30"}
              onChange={(v) => update({ ageGateRememberDays: v })}
              options={REMEMBER_OPTIONS}
              hint="After this window the visitor will be re-prompted."
            />
            <div className="flex items-start gap-3 border border-[var(--border-subtle)] bg-[var(--color-ink-850)] p-4">
              <Monogram className="mt-1 h-6 w-auto opacity-70" />
              <p className="text-xs leading-relaxed text-[var(--color-bone-400)]">
                Storage uses a single localStorage key{" "}
                <span className="font-mono text-[var(--color-bone-300)]">
                  lemberg_age_gate
                </span>{" "}
                with the confirmation timestamp. Denied visitors are never
                stored — they're free to retry on next visit. No personal
                data leaves the visitor's browser.
              </p>
            </div>
          </div>
        </Card>

        {/* ── Background ────────────────────────────────────── */}
        <Card
          title="Background"
          description="Optional image behind the gate card. Leave blank to inherit the hero background image."
        >
          <div className={cn(!enabled && "opacity-70")}>
            <ImageField
              label="Background image (optional)"
              value={config.ageGateBackgroundImage || ""}
              onChange={(v) => update({ ageGateBackgroundImage: v })}
              aspect="aspect-video"
              hint="A dark, atmospheric image works best — the card sits on a tinted blur over the photo."
            />
          </div>
        </Card>
      </div>

      {/* Preview overlay — uses the real AgeGate with forceOpen so it
          shows on /admin without writing localStorage state. */}
      {previewing && (
        <div className="relative" onClick={() => setPreviewing(false)}>
          <AgeGate config={config} forceOpen />
          {/* Hint banner on the preview so editors know how to close it */}
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[101] flex justify-center">
            <span className="pointer-events-auto cursor-pointer border border-[var(--border-default)] bg-[rgba(7,7,10,0.85)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] backdrop-blur-md">
              Preview only — click anywhere to close
            </span>
          </div>
        </div>
      )}
    </>
  );
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  const Icon = enabled ? ShieldCheck : ShieldOff;
  return (
    <div
      className={cn(
        "inline-flex flex-col gap-1 border px-4 py-3",
        enabled
          ? "border-[color-mix(in_srgb,var(--color-pearl-300)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-pearl-300)_8%,transparent)]"
          : "border-[var(--border-default)] bg-[var(--bg-input)]"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={12}
          className={cn(
            enabled
              ? "text-[var(--color-pearl-300)]"
              : "text-[var(--color-bone-500)]"
          )}
        />
        <span className="label-eyebrow text-[var(--color-bone-300)]">
          On the live site
        </span>
      </div>
      <p className="text-sm text-[var(--color-bone-100)]">
        {enabled ? "Gate active" : "Disabled"}
      </p>
    </div>
  );
}
