import { useState } from "react";
import {
  Globe,
  Palette,
  Search,
  Eye,
  Wrench,
  AlertTriangle,
  Moon,
  Sun,
  MonitorSmartphone,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { TextField, SelectField, ImageField } from "../../components/admin/Field";
import { ColorField } from "../../components/admin/ColorField";
import { ToggleField } from "../../components/admin/ToggleField";
import { configFlag, flagValue, FALLBACK_CONFIG } from "../../lib/types";
import { cn } from "../../lib/utils";
import type { AdminContext } from "../Admin";

const SETTINGS_NAV = [
  { id: "general", icon: Globe, label: "General" },
  { id: "appearance", icon: Palette, label: "Appearance" },
  { id: "seo", icon: Search, label: "SEO & sharing" },
  { id: "sections", icon: Eye, label: "Section visibility" },
  { id: "maintenance", icon: Wrench, label: "Maintenance" },
  { id: "danger", icon: AlertTriangle, label: "Danger zone" },
];

export function SettingsPage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;
  const [active, setActive] = useState<string>("general");
  const [confirmReset, setConfirmReset] = useState(false);

  function scrollTo(id: string) {
    setActive(id);
    const el = document.getElementById(`settings-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleReset() {
    const settingsKeys: (keyof typeof FALLBACK_CONFIG)[] = [
      "siteDescription",
      "defaultLanguage",
      "currency",
      "landingTheme",
      "brandAccent",
      "metaTitle",
      "metaDescription",
      "ogImage",
      "faviconUrl",
      "showAnnouncementBar",
      "showPhilosophy",
      "showVarietalRibbon",
      "showFeaturedWine",
      "showEstateBand",
      "showExperience",
      "showClub",
      "maintenanceMode",
      "maintenanceMessage",
    ];
    const patch: Record<string, string> = {};
    settingsKeys.forEach((k) => {
      patch[k] = (FALLBACK_CONFIG[k] as string) ?? "";
    });
    update(patch as any);
    setConfirmReset(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Studio"
        title="Settings"
        description="Application-wide configuration: identity, theme, SEO, section visibility, and maintenance. Changes apply to the public site after you publish."
      />

      <div className="grid gap-6 p-5 lg:grid-cols-[220px_1fr] lg:gap-10 lg:p-10">
        {/* Sticky sub-nav (TOC) */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav className="flex gap-1 overflow-x-auto overscroll-x-contain border border-[var(--color-ink-700)] bg-[var(--color-ink-800)] p-1 lg:flex-col lg:overflow-visible">
            {SETTINGS_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                    isActive
                      ? "bg-[var(--color-ink-700)] text-[var(--color-bone-100)]"
                      : "text-[var(--color-bone-400)] hover:bg-[var(--color-ink-700)]/60 hover:text-[var(--color-bone-100)]"
                  )}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="font-sans tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Settings groups */}
        <div className="min-w-0 space-y-8">
          {/* GENERAL ─────────────────────────────────────────────── */}
          <section id="settings-general" className="scroll-mt-6">
            <Card
              title="General"
              description="Identity, locale, and currency for prices across the site."
            >
              <div className="grid gap-5">
                <TextField
                  label="Site description"
                  multiline
                  rows={3}
                  value={config.siteDescription || ""}
                  onChange={(v) => update({ siteDescription: v })}
                  hint="A short paragraph that describes the winery. Used as the default for SEO and social sharing."
                />
                <div className="grid gap-5 md:grid-cols-2">
                  <SelectField
                    label="Default language"
                    value={config.defaultLanguage || "en"}
                    onChange={(v) => update({ defaultLanguage: v })}
                    options={[
                      { value: "en", label: "English" },
                      { value: "af", label: "Afrikaans" },
                      { value: "fr", label: "French" },
                      { value: "de", label: "German" },
                    ]}
                    hint="Sets the <html lang> attribute on the public site."
                  />
                  <SelectField
                    label="Currency"
                    value={config.currency || "ZAR"}
                    onChange={(v) => update({ currency: v })}
                    options={[
                      { value: "ZAR", label: "R · South African Rand" },
                      { value: "USD", label: "$ · US Dollar" },
                      { value: "EUR", label: "€ · Euro" },
                      { value: "GBP", label: "£ · British Pound" },
                    ]}
                    hint="Symbol prepended to wine prices throughout the site."
                  />
                </div>
              </div>
            </Card>
          </section>

          {/* APPEARANCE ──────────────────────────────────────────── */}
          <section id="settings-appearance" className="scroll-mt-6">
            <Card
              title="Appearance"
              description="How the public landing page presents itself — palette and accent."
            >
              <div className="grid gap-6">
                <div>
                  <p className="label-eyebrow text-[var(--color-bone-500)]">
                    Landing theme
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-bone-500)]">
                    The studio dashboard's theme is independent and lives in the top bar.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <ThemeOption
                      icon={Moon}
                      label="Dark"
                      description="Ink-on-pearl. The full editorial."
                      active={(config.landingTheme || "dark") === "dark"}
                      onClick={() => update({ landingTheme: "dark" })}
                    />
                    <ThemeOption
                      icon={Sun}
                      label="Light"
                      description="Parchment & ink — print edition."
                      active={config.landingTheme === "light"}
                      onClick={() => update({ landingTheme: "light" })}
                    />
                    <ThemeOption
                      icon={MonitorSmartphone}
                      label="Auto"
                      description="Match the visitor's system preference."
                      active={config.landingTheme === "auto"}
                      onClick={() => update({ landingTheme: "auto" })}
                    />
                  </div>
                </div>

                <ColorField
                  label="Brand accent"
                  value={config.brandAccent || ""}
                  onChange={(v) => update({ brandAccent: v })}
                  hint="Optional override for the iridescent accent (italic phrases, eyebrows, active states). Leave blank to use the default pearl/wine palette."
                />
              </div>
            </Card>
          </section>

          {/* SEO ─────────────────────────────────────────────────── */}
          <section id="settings-seo" className="scroll-mt-6">
            <Card
              title="SEO & sharing"
              description="How the site appears in search results and social previews."
            >
              <div className="grid gap-5">
                <TextField
                  label="Meta title"
                  value={config.metaTitle || ""}
                  onChange={(v) => update({ metaTitle: v })}
                  placeholder="Lemberg Winery — Tulbagh Valley"
                  hint="Shown in browser tabs and search results. Keep under 60 characters."
                />
                <TextField
                  label="Meta description"
                  multiline
                  rows={2}
                  value={config.metaDescription || ""}
                  onChange={(v) => update({ metaDescription: v })}
                  hint="Falls back to the general site description if left blank. Keep under 160 characters."
                />
                <div className="grid gap-5 md:grid-cols-2">
                  <ImageField
                    label="Social share image (OG)"
                    value={config.ogImage || ""}
                    onChange={(v) => update({ ogImage: v })}
                    aspect="aspect-[1200/630]"
                    hint="1200×630 looks best on most platforms."
                  />
                  <ImageField
                    label="Favicon"
                    value={config.faviconUrl || ""}
                    onChange={(v) => update({ faviconUrl: v })}
                    aspect="aspect-square"
                    hint="Square — 64×64 or larger PNG / SVG."
                  />
                </div>
              </div>
            </Card>
          </section>

          {/* SECTIONS ────────────────────────────────────────────── */}
          <section id="settings-sections" className="scroll-mt-6">
            <Card
              title="Section visibility"
              description="Toggle off any section you'd like to hide from the public landing page. Hidden sections remain editable in the studio."
              bodyClassName="p-0"
            >
              <div className="divide-y divide-[var(--color-ink-700)] px-6">
                <ToggleField
                  label="Announcement bar"
                  description="The thin strip above the navigation (e.g. vintage release notice)."
                  value={configFlag(config.showAnnouncementBar)}
                  onChange={(b) => update({ showAnnouncementBar: flagValue(b) })}
                />
                <ToggleField
                  label="Philosophy"
                  description="Estate story with portrait image and 'Established' badge."
                  value={configFlag(config.showPhilosophy)}
                  onChange={(b) => update({ showPhilosophy: flagValue(b) })}
                />
                <ToggleField
                  label="Varietal ribbon"
                  description="The infinite-scroll marquee between Philosophy and Collection."
                  value={configFlag(config.showVarietalRibbon)}
                  onChange={(b) => update({ showVarietalRibbon: flagValue(b) })}
                />
                <ToggleField
                  label="Featured wine"
                  description="Flagship showcase with parallax bottle photography."
                  value={configFlag(config.showFeaturedWine)}
                  onChange={(b) => update({ showFeaturedWine: flagValue(b) })}
                />
                <ToggleField
                  label="Estate band"
                  description="Full-bleed valley landscape with overlay copy."
                  value={configFlag(config.showEstateBand)}
                  onChange={(b) => update({ showEstateBand: flagValue(b) })}
                />
                <ToggleField
                  label="Experience"
                  description="Visit & tasting invitation with hours and booking CTA."
                  value={configFlag(config.showExperience)}
                  onChange={(b) => update({ showExperience: flagValue(b) })}
                />
                <ToggleField
                  label="Wine club"
                  description="Allocation list email signup."
                  value={configFlag(config.showClub)}
                  onChange={(b) => update({ showClub: flagValue(b) })}
                />
              </div>
            </Card>
          </section>

          {/* MAINTENANCE ─────────────────────────────────────────── */}
          <section id="settings-maintenance" className="scroll-mt-6">
            <Card
              title="Maintenance"
              description="Temporarily replace the public landing page with a quiet 'closed for the moment' note. The studio remains accessible."
            >
              <div className="grid gap-5">
                <div className="border border-[var(--border-default)] bg-[var(--bg-input)] px-4">
                  <ToggleField
                    label="Maintenance mode"
                    description={
                      configFlag(config.maintenanceMode, false)
                        ? "Active — the public site shows only your maintenance message."
                        : "Off — the site is live to visitors."
                    }
                    value={configFlag(config.maintenanceMode, false)}
                    onChange={(b) => update({ maintenanceMode: flagValue(b) })}
                  />
                </div>
                <TextField
                  label="Maintenance message"
                  multiline
                  rows={3}
                  value={config.maintenanceMessage || ""}
                  onChange={(v) => update({ maintenanceMessage: v })}
                  hint="Italic line shown on the maintenance page. Keep it warm and brief."
                />
              </div>
            </Card>
          </section>

          {/* DANGER ZONE ─────────────────────────────────────────── */}
          <section id="settings-danger" className="scroll-mt-6">
            <Card
              title="Reset settings"
              description="Restore the application-wide settings (above) to their factory defaults. Section copy, wines, and uploads are untouched."
            >
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="flex items-center gap-2 border border-[var(--color-wine-700)] px-5 py-2.5 label-eyebrow text-[var(--color-wine-500)] transition-colors hover:bg-[var(--color-wine-700)] hover:text-[var(--color-bone-50)]"
                >
                  <RotateCcw size={13} />
                  Reset settings to defaults
                </button>
              ) : (
                <div className="flex flex-col gap-3 border border-[var(--color-wine-700)] bg-[color-mix(in_srgb,var(--color-wine-700)_8%,transparent)] p-5">
                  <p className="text-sm text-[var(--color-bone-100)]">
                    Reset General, Appearance, SEO, Section visibility, and Maintenance to defaults?
                  </p>
                  <p className="label-eyebrow text-[var(--color-bone-500)]">
                    This will queue the reset — click Publish in the top bar to apply.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleReset}
                      className="bg-[var(--color-wine-700)] px-5 py-2.5 label-eyebrow text-[var(--color-bone-50)] transition-colors hover:bg-[var(--color-wine-900)]"
                    >
                      Yes, reset
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="border border-[var(--color-ink-600)] px-5 py-2.5 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:text-[var(--color-bone-100)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}

interface ThemeOptionProps {
  icon: typeof Moon;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

function ThemeOption({ icon: Icon, label, description, active, onClick }: ThemeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 border p-4 text-left transition-colors",
        active
          ? "border-[var(--color-pearl-300)] bg-[var(--color-ink-850)]"
          : "border-[var(--border-default)] bg-[var(--bg-input)] hover:border-[var(--color-bone-400)]"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center border",
          active
            ? "border-[var(--color-pearl-300)] text-[var(--color-pearl-300)]"
            : "border-[var(--border-default)] text-[var(--color-bone-300)]"
        )}
      >
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="font-display text-base text-[var(--color-bone-100)]">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-bone-400)]">
          {description}
        </p>
      </div>
    </button>
  );
}
