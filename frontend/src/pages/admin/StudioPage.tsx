import { Building2 } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { ImageField, TextField } from "../../components/admin/Field";
import { ToggleField } from "../../components/admin/ToggleField";
import { ColorField } from "../../components/admin/ColorField";
import { Monogram } from "../../components/Monogram";
import { resolveAsset } from "../../services/api";
import { pickStudioIdentity } from "../../lib/studioIdentity";
import type { AdminContext } from "../Admin";

/**
 * Studio identity — chrome of the CMS itself (Sidebar, TopBar, Login,
 * Footer). Separate from the landing-page brand: a white-label deployment
 * can rebrand the admin without touching the public site copy.
 *
 * Edits flow through `ctx.update(...)` like every other admin page — the
 * normal Publish button persists them to /api/config. On save, Admin.tsx
 * re-runs `cacheStudio()` so the next mount of LoginPage picks up the new
 * values synchronously from localStorage.
 */
export function StudioPage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;
  const identity = pickStudioIdentity(config);
  const logoUrl = identity.logo ? resolveAsset(identity.logo) : "";

  return (
    <>
      <PageHeader
        eyebrow="Tools"
        title="Studio identity"
        description="What editors see when they open the CMS — name, logo, edition, and a few behaviour preferences. Independent of the public landing-page brand."
      />

      <div className="space-y-6 p-5 lg:p-10">
        {/* ── Live chrome preview ─────────────────────────────── */}
        <Card
          title="Preview"
          description="How the identity appears in the studio sidebar and on the login screen."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Sidebar header miniature */}
            <div
              className="border border-[var(--border-subtle)] bg-[var(--color-ink-950)] p-5"
              aria-label="Sidebar preview"
            >
              <p className="label-eyebrow text-[var(--color-bone-600)]">Sidebar</p>
              <div className="mt-4 flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />
                ) : (
                  <Monogram className="h-8 w-auto" />
                )}
                <div className="min-w-0">
                  <p className="font-display text-lg leading-none tracking-tight text-[var(--color-bone-100)] truncate">
                    {identity.name}
                  </p>
                  <p className="label-eyebrow mt-1.5 text-[var(--color-bone-500)] truncate">
                    {identity.edition}
                  </p>
                </div>
              </div>
            </div>

            {/* Login miniature */}
            <div
              className="border border-[var(--border-subtle)] bg-[var(--color-ink-950)] p-5"
              aria-label="Login preview"
            >
              <p className="label-eyebrow text-[var(--color-bone-600)]">Login screen</p>
              <div className="mt-4 flex flex-col items-center gap-3 py-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-10 w-10 object-contain" />
                ) : (
                  <Monogram className="h-10 w-auto" />
                )}
                <span className="text-base font-light uppercase tracking-[0.32em] text-[var(--color-bone-100)]">
                  {identity.name}
                </span>
                <span className="label-eyebrow text-[var(--color-bone-500)] text-center">
                  {identity.tagline} · {identity.edition}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Identity ─────────────────────────────────────── */}
          <Card
            title="Identity"
            description="Name and logo shown in the studio chrome. Leave logo empty to use the built-in monogram."
          >
            <div className="grid gap-5">
              <TextField
                label="Studio name"
                value={config.studioName || ""}
                onChange={(v) => update({ studioName: v })}
                placeholder="Lemberg"
                hint="Shown in the sidebar header and on the login screen."
              />
              <TextField
                label="Edition label"
                value={config.studioEdition || ""}
                onChange={(v) => update({ studioEdition: v })}
                placeholder="Studio · v1"
                hint='Short subtitle below the name. e.g. "Studio · v1" or "Editor".'
              />
              <TextField
                label="Tagline"
                value={config.studioTagline || ""}
                onChange={(v) => update({ studioTagline: v })}
                placeholder="Editorial CMS"
                hint="Eyebrow text on the TopBar and Login screen."
              />
              <ImageField
                label="Studio logo (optional)"
                value={config.studioLogo || ""}
                onChange={(v) => update({ studioLogo: v })}
                aspect="aspect-square"
                hint="A small icon used in the sidebar, footer, and login screen. Square PNG or SVG with transparent background works best. Leave blank to keep the iridescent Monogram."
              />
            </div>
          </Card>

          {/* ── Accent + behaviour ───────────────────────────── */}
          <Card
            title="Accent & behaviour"
            description="Subtle accent for studio highlights and a few editing-flow toggles."
          >
            <div className="grid gap-5">
              <ColorField
                label="Studio accent"
                value={config.studioAccent || ""}
                onChange={(v) => update({ studioAccent: v })}
                placeholder="#E6DECF"
                hint="Used for hover states and small accents in the studio. Leave empty to inherit the landing brand accent."
              />
              <div className="border-t border-[var(--color-ink-700)] pt-2">
                <ToggleField
                  label="Confirm destructive actions"
                  description="Show a confirmation dialog before deleting templates, wines, or menu items. Turn off if you trust your edits and prefer fewer interruptions."
                  value={identity.confirmDestructive}
                  onChange={(v) =>
                    update({ studioConfirmDestructive: v ? "true" : "false" })
                  }
                />
                <ToggleField
                  label="Compact tables"
                  description="Tighter row spacing in lists (reservations, subscribers, wines). Useful on smaller screens or when scanning long tables."
                  value={identity.compactMode}
                  onChange={(v) =>
                    update({ studioCompactMode: v ? "true" : "false" })
                  }
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ── Footnote ──────────────────────────────────────── */}
        <Card
          title="Heads-up"
          description="Studio identity is separate from the public landing-page brand."
        >
          <div className="flex items-start gap-3">
            <Building2 size={20} className="mt-0.5 shrink-0 text-[var(--color-bone-500)]" />
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--color-bone-400)]">
              Changing the studio name here renames the CMS chrome only — it does
              not change the public landing-page wordmark. To rebrand the public
              site, edit <span className="text-[var(--color-bone-200)]">Brand</span> in
              the sidebar. Useful when one editor team manages multiple white-label
              deployments from the same studio installation.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
