import { useState, useEffect, useRef, ChangeEvent } from "react";
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
  Check,
  Plus,
  Trash2,
  LayoutGrid,
  Image as ImageIcon,
} from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { TextField, SelectField, ImageField } from "../../components/admin/Field";
import { ColorField } from "../../components/admin/ColorField";
import { ToggleField } from "../../components/admin/ToggleField";
import { RichTextField } from "../../components/admin/Field";
import { configFlag, flagValue, FALLBACK_CONFIG, parseBentoImages, serializeBentoImages } from "../../lib/types";
import { cn } from "../../lib/utils";
import { uploadFile, resolveAsset } from "../../services/api";
import type { AdminContext } from "../Admin";

const SETTINGS_NAV = [
  { id: "general", icon: Globe, label: "Identity & Locale", description: "Winery basics" },
  { id: "appearance", icon: Palette, label: "Theme & Brand", description: "Visual style" },
  { id: "seo", icon: Search, label: "SEO & Social", description: "Search optimization" },
  { id: "sections", icon: Eye, label: "Site Structure", description: "Section visibility" },
  { id: "maintenance", icon: Wrench, label: "Maintenance", description: "Offline controls" },
  { id: "danger", icon: AlertTriangle, label: "System", description: "Danger zone" },
];

export function SettingsPage({ ctx }: { ctx: AdminContext }) {
  const { config, update, loading } = ctx;
  const [active, setActive] = useState<string>("general");
  const [confirmReset, setConfirmReset] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync active section based on scroll position
  useEffect(() => {
    // Find the closest scrollable parent (main in DashboardLayout)
    const scroller = document.querySelector("main");
    if (!scroller) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id.replace("settings-", ""));
          }
        });
      },
      { 
        threshold: 0.2, 
        root: scroller,
        rootMargin: "-20% 0px -60% 0px" 
      }
    );

    SETTINGS_NAV.forEach((item) => {
      const el = document.getElementById(`settings-${item.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  if (loading || !config) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-pearl-300)] border-t-transparent" />
      </div>
    );
  }

  function scrollTo(id: string) {
    setActive(id);
    const el = document.getElementById(`settings-${id}`);
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
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
    <div ref={containerRef} className="flex flex-col min-h-full bg-[var(--color-ink-900)]">
      <PageHeader
        eyebrow="Studio"
        title="Settings"
        description="Global configuration for identity, theme, SEO, and section visibility. Changes are saved locally until published."
      />

      {/* Mobile Category Switcher (Horizontal Scroll) */}
      <div className="lg:hidden sticky top-0 z-20 flex overflow-x-auto bg-[var(--color-ink-950)] border-b border-[var(--color-ink-700)] no-scrollbar py-1">
        <div className="flex px-4 gap-1">
          {SETTINGS_NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={cn(
                  "flex-shrink-0 px-5 py-3 text-[10px] uppercase tracking-widest font-bold transition-all border-b-2",
                  isActive
                    ? "text-[var(--color-pearl-300)] border-[var(--color-pearl-300)]"
                    : "text-[var(--color-bone-500)] border-transparent"
                )}
              >
                {item.label.split(" & ")[0]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[280px_1fr] flex-1">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden lg:block border-r border-[var(--color-ink-700)] bg-[var(--color-ink-950)]/30 sticky top-0 h-[calc(100vh-64px)] overflow-y-auto">
          <nav className="p-8 space-y-2">
            <p className="px-4 mb-6 text-[10px] uppercase tracking-[0.3em] text-[var(--color-bone-500)] font-bold">
              Categories
            </p>
            {SETTINGS_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={cn(
                    "w-full group flex items-center gap-4 px-4 py-4 text-left transition-all duration-300 rounded-sm relative",
                    isActive
                      ? "bg-[var(--color-ink-800)] text-[var(--color-pearl-300)]"
                      : "text-[var(--color-bone-400)] hover:bg-[var(--color-ink-800)]/60 hover:text-[var(--color-bone-200)]"
                  )}
                >
                  <Icon size={16} className={cn("transition-colors", isActive ? "text-[var(--color-pearl-300)]" : "text-[var(--color-bone-600)] group-hover:text-[var(--color-bone-400)]")} />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-sans text-[11px] font-bold tracking-wider uppercase">{item.label}</span>
                    <span className="text-[9px] uppercase tracking-widest opacity-40 font-mono italic">
                      {item.description}
                    </span>
                  </div>
                  
                  {isActive && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[var(--color-pearl-300)] rounded-r-full shadow-[0_0_8px_rgba(230,222,207,0.4)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="p-6 md:p-12 lg:p-20 max-w-6xl space-y-32">
          {/* GENERAL ─────────────────────────────────────────────── */}
          <section id="settings-general" className="scroll-mt-32">
            <SectionHeader 
              title="General Identity" 
              description="Basic information about the winery and local display preferences. These affect global site metadata and formatting."
            />
            
            <div className="grid gap-12 lg:grid-cols-1">
              <Card variant="ghost" className="space-y-12">
                <TextField
                  label="Site Description"
                  multiline
                  rows={4}
                  value={config.siteDescription || ""}
                  onChange={(v) => update({ siteDescription: v })}
                  hint="Descriptive text for the winery used in search results and social snippets."
                />
                <div className="grid gap-10 md:grid-cols-2 pt-10 border-t border-[var(--color-ink-700)]/40">
                  <SelectField
                    label="Primary Language"
                    value={config.defaultLanguage || "en"}
                    onChange={(v) => update({ defaultLanguage: v })}
                    options={[
                      { value: "en", label: "English" },
                      { value: "af", label: "Afrikaans" },
                      { value: "fr", label: "French" },
                      { value: "de", label: "German" },
                    ]}
                    hint="The main language for your public site."
                  />
                  <SelectField
                    label="Display Currency"
                    value={config.currency || "ZAR"}
                    onChange={(v) => update({ currency: v })}
                    options={[
                      { value: "ZAR", label: "R · South African Rand" },
                      { value: "USD", label: "$ · US Dollar" },
                      { value: "EUR", label: "€ · Euro" },
                      { value: "GBP", label: "£ · British Pound" },
                    ]}
                    hint="Currency symbol used across the collection."
                  />
                </div>
              </Card>
            </div>
          </section>

          {/* APPEARANCE ──────────────────────────────────────────── */}
          <section id="settings-appearance" className="scroll-mt-32">
            <SectionHeader 
              title="Theme & Brand" 
              description="Control the color palette and interactive accents of the landing page. Select a theme that best reflects your winery's character."
            />
            
            <Card variant="ghost" className="space-y-16">
              <div className="space-y-8">
                <label className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-bone-500)] font-bold block">
                  Base Palette
                </label>
                <div className="grid gap-6 sm:grid-cols-3">
                  <ThemeOption
                    icon={Moon}
                    label="Dark Editorial"
                    description="Classic depth"
                    active={(config.landingTheme || "dark") === "dark"}
                    onClick={() => update({ landingTheme: "dark" })}
                  />
                  <ThemeOption
                    icon={Sun}
                    label="Light Parchment"
                    description="Bright heritage"
                    active={config.landingTheme === "light"}
                    onClick={() => update({ landingTheme: "light" })}
                  />
                  <ThemeOption
                    icon={MonitorSmartphone}
                    label="System Auto"
                    description="Adaptive focus"
                    active={config.landingTheme === "auto"}
                    onClick={() => update({ landingTheme: "auto" })}
                  />
                </div>
              </div>

              <div className="pt-12 border-t border-[var(--color-ink-700)]/40 max-w-2xl">
                <ColorField
                  label="Brand Accent Color"
                  value={config.brandAccent || ""}
                  onChange={(v) => update({ brandAccent: v })}
                  hint="Overrides the default pearl/wine accents across the landing page."
                />
              </div>
            </Card>
          </section>

          {/* SEO ─────────────────────────────────────────────────── */}
          <section id="settings-seo" className="scroll-mt-32">
            <SectionHeader 
              title="SEO & Social" 
              description="Optimize how your winery appears in search engines and social platforms like Instagram or Twitter."
            />
            
            <Card variant="ghost" className="space-y-12">
              <TextField
                label="Search Title (Meta Title)"
                value={config.metaTitle || ""}
                onChange={(v) => update({ metaTitle: v })}
                placeholder="Lemberg Winery — Tulbagh Valley"
                hint="Optimal length: 50-60 characters. This appears in browser tabs and search results."
              />
              <TextField
                label="Search Description"
                multiline
                rows={3}
                value={config.metaDescription || ""}
                onChange={(v) => update({ metaDescription: v })}
                hint="Short summary (150-160 chars) describing the estate for search results."
              />
              <div className="grid gap-12 md:grid-cols-2 pt-12 border-t border-[var(--color-ink-700)]/40">
                <ImageField
                  label="Social Sharing Image"
                  value={config.ogImage || ""}
                  onChange={(v) => update({ ogImage: v })}
                  aspect="aspect-[1200/630]"
                  hint="Visual preview shown when your site is shared (1200x630px recommended)."
                />
                <ImageField
                  label="Browser Favicon"
                  value={config.faviconUrl || ""}
                  onChange={(v) => update({ faviconUrl: v })}
                  aspect="aspect-square"
                  hint="Small icon displayed in browser tabs. Should be simple and clear."
                />
              </div>
            </Card>
          </section>

          {/* SECTIONS ────────────────────────────────────────────── */}
          <section id="settings-sections" className="scroll-mt-32">
            <SectionHeader 
              title="Site Structure" 
              description="Configure which sections appear on the landing page and choose between editorial layout variations."
            />
            
            <div className="space-y-10">
              <Card variant="ghost" className="p-0 border border-[var(--color-ink-700)]/60 overflow-hidden bg-[var(--color-ink-950)]/20 shadow-2xl">
                <div className="divide-y divide-[var(--color-ink-700)]/40">
                  <VisibilityToggle
                    label="Announcement Bar"
                    description="Floating banner for news, vintage releases, or seasonal alerts."
                    value={configFlag(config.showAnnouncementBar)}
                    onChange={(b) => update({ showAnnouncementBar: flagValue(b) })}
                  />
                  
                  {/* PHILOSOPHY SECTION CONFIG */}
                  <div className={cn(
                    "p-8 lg:p-12 transition-all duration-500",
                    configFlag(config.showPhilosophy) ? "bg-[var(--color-ink-800)]/25" : "opacity-40 grayscale hover:grayscale-0"
                  )}>
                    <ToggleField
                      label="Philosophy Section"
                      description="Editorial space for heritage, approach, and the winery's core beliefs."
                      value={configFlag(config.showPhilosophy)}
                      onChange={(b) => update({ showPhilosophy: flagValue(b) })}
                    />
                    
                    {configFlag(config.showPhilosophy) && (
                      <div className="mt-12 pl-6 border-l-2 border-[var(--color-pearl-300)]/30 space-y-12 animate-in fade-in slide-in-from-left-4 duration-700">
                        <div className="space-y-6">
                          <label className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-bone-500)] font-bold">
                            Section Layout
                          </label>
                          <div className="flex flex-wrap gap-4 max-w-xl">
                            <LayoutOption
                              icon={ImageIcon}
                              label="Single Image"
                              active={(config.philosophyLayout || "single") === "single"}
                              onClick={() => update({ philosophyLayout: "single" })}
                            />
                            <LayoutOption
                              icon={LayoutGrid}
                              label="Bento Grid"
                              active={config.philosophyLayout === "bento"}
                              onClick={() => update({ philosophyLayout: "bento" })}
                            />
                          </div>
                        </div>

                        {config.philosophyLayout === "bento" ? (
                          <ImageGalleryField
                            label="Philosophy Bento Images"
                            hint="Select up to 5 images for a dynamic bento-style editorial grid."
                            images={parseBentoImages(config.philosophyImages)}
                            onChange={(imgs) => update({ philosophyImages: serializeBentoImages(imgs) })}
                          />
                        ) : (
                          <ImageField
                            label="Philosophy Main Image"
                            value={config.philosophyImage || ""}
                            onChange={(v) => update({ philosophyImage: v })}
                            hint="A large, striking editorial image shown next to the narrative."
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <VisibilityToggle
                    label="Varietal Ribbon"
                    description="Stylized marquee showcasing the winery's diverse grape varieties."
                    value={configFlag(config.showVarietalRibbon)}
                    onChange={(b) => update({ showVarietalRibbon: flagValue(b) })}
                  />
                  <VisibilityToggle
                    label="Featured Showcase"
                    description="Highlight your most prestigious or limited-edition vintage."
                    value={configFlag(config.showFeaturedWine)}
                    onChange={(b) => update({ showFeaturedWine: flagValue(b) })}
                  />
                  <VisibilityToggle
                    label="Estate Band"
                    description="Full-width cinematic imagery of the vineyard and landscape."
                    value={configFlag(config.showEstateBand)}
                    onChange={(b) => update({ showEstateBand: flagValue(b) })}
                  />

                  {/* EXPERIENCE SECTION CONFIG */}
                  <div className={cn(
                    "p-8 lg:p-12 transition-all duration-500",
                    configFlag(config.showExperience) ? "bg-[var(--color-ink-800)]/25" : "opacity-40 grayscale hover:grayscale-0"
                  )}>
                    <ToggleField
                      label="Experience & Tasting"
                      description="Information for visitors, tasting notes, and booking invitations."
                      value={configFlag(config.showExperience)}
                      onChange={(b) => update({ showExperience: flagValue(b) })}
                    />

                    {configFlag(config.showExperience) && (
                      <div className="mt-12 pl-6 border-l-2 border-[var(--color-pearl-300)]/30 space-y-12 animate-in fade-in slide-in-from-left-4 duration-700">
                        <div className="space-y-6">
                          <label className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-bone-500)] font-bold">
                            Section Layout
                          </label>
                          <div className="flex flex-wrap gap-4 max-w-xl">
                            <LayoutOption
                              icon={ImageIcon}
                              label="Single Image"
                              active={(config.experienceLayout || "single") === "single"}
                              onClick={() => update({ experienceLayout: "single" })}
                            />
                            <LayoutOption
                              icon={LayoutGrid}
                              label="Bento Grid"
                              active={config.experienceLayout === "bento"}
                              onClick={() => update({ experienceLayout: "bento" })}
                            />
                          </div>
                        </div>

                        {config.experienceLayout === "bento" ? (
                          <ImageGalleryField
                            label="Experience Bento Images"
                            hint="A collection of atmospheric photos representing the tasting experience."
                            images={parseBentoImages(config.experienceImages)}
                            onChange={(imgs) => update({ experienceImages: serializeBentoImages(imgs) })}
                          />
                        ) : (
                          <ImageField
                            label="Experience Main Image"
                            value={config.experienceImage || ""}
                            onChange={(v) => update({ experienceImage: v })}
                            hint="A welcoming image of the tasting room or estate atmosphere."
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <VisibilityToggle
                    label="Allocation List"
                    description="The winery's newsletter and exclusive allocation signup."
                    value={configFlag(config.showClub)}
                    onChange={(b) => update({ showClub: flagValue(b) })}
                  />
                </div>
              </Card>
            </div>
          </section>

          {/* MAINTENANCE ─────────────────────────────────────────── */}
          <section id="settings-maintenance" className="scroll-mt-32">
            <SectionHeader 
              title="Maintenance" 
              description="Control public visibility during updates or off-season periods."
            />
            
            <Card variant="ghost" className="space-y-12">
              <div className={cn(
                "p-10 border transition-all duration-700 rounded-sm relative overflow-hidden group",
                configFlag(config.maintenanceMode, false)
                  ? "bg-[var(--color-wine-900)]/10 border-[var(--color-wine-700)]/60 shadow-[0_0_50px_rgba(114,30,47,0.15)]"
                  : "bg-[var(--color-ink-800)]/40 border-[var(--color-ink-700)] hover:bg-[var(--color-ink-800)]/60"
              )}>
                <ToggleField
                  label="Enable Maintenance Mode"
                  description={
                    configFlag(config.maintenanceMode, false)
                      ? "The winery is currently offline. Visitors will see the custom message below."
                      : "The winery is live. Public visitors have full access to the landing page."
                  }
                  value={configFlag(config.maintenanceMode, false)}
                  onChange={(b) => update({ maintenanceMode: flagValue(b) })}
                />
                
                {configFlag(config.maintenanceMode, false) && (
                  <div className="mt-6 flex items-center gap-3 text-[var(--color-wine-400)] text-[10px] uppercase tracking-[0.2em] font-bold animate-pulse">
                    <AlertTriangle size={14} />
                    Live Preview remains active for authenticated editors
                  </div>
                )}
                
                {/* Background warning pattern when active */}
                {configFlag(config.maintenanceMode, false) && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-wine-600)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                )}
              </div>
              
              <div className="pt-8 max-w-4xl">
                <RichTextField
                  label="Maintenance Message"
                  value={config.maintenanceMessage || ""}
                  onChange={(v) => update({ maintenanceMessage: v })}
                  hint="The editorial message shown to visitors when maintenance mode is active."
                />
              </div>
            </Card>
          </section>

          {/* DANGER ZONE ─────────────────────────────────────────── */}
          <section id="settings-danger" className="scroll-mt-32 pb-24">
            <div className="mb-12 border-b border-[var(--color-wine-900)]/50 pb-10">
              <h2 className="font-display text-4xl font-extralight text-[var(--color-wine-500)] tracking-tight lg:text-5xl">System Controls</h2>
              <p className="mt-4 text-[13px] md:text-sm text-[var(--color-bone-500)] max-w-2xl leading-relaxed font-body">Manage permanent resets and irreversible system-wide configurations.</p>
            </div>
            
            <Card variant="ghost" className="bg-[var(--color-wine-950)]/20 border border-[var(--color-wine-900)]/40 p-10 lg:p-14 rounded-sm relative overflow-hidden shadow-2xl">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-12 relative z-10">
                <div className="max-w-xl">
                  <h3 className="font-display text-2xl text-[var(--color-bone-100)] font-light tracking-wide">Factory Reset Settings</h3>
                  <p className="mt-4 text-[13px] text-[var(--color-bone-500)] leading-relaxed font-body">
                    Restores all global configuration values (identity, colors, visibility, SEO) to their original factory defaults. 
                    <span className="block mt-2 text-[var(--color-wine-400)] font-bold italic underline decoration-wine-700 underline-offset-4">
                      Wines, media assets, and custom page content will not be affected.
                    </span>
                  </p>
                </div>
                
                <div className="flex shrink-0">
                  {!confirmReset ? (
                    <button
                      onClick={() => setConfirmReset(true)}
                      className="group flex items-center justify-center gap-4 border-2 border-[var(--color-wine-800)] px-10 py-5 label-eyebrow text-[var(--color-wine-500)] transition-all hover:bg-[var(--color-wine-700)] hover:text-[var(--color-bone-50)] hover:border-[var(--color-wine-600)] shadow-lg active:scale-95"
                    >
                      <RotateCcw size={16} className="group-hover:rotate-[-60deg] transition-transform duration-500" />
                      Restore Factory Defaults
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={handleReset}
                        className="bg-[var(--color-wine-700)] px-10 py-5 label-eyebrow text-[var(--color-bone-50)] hover:bg-[var(--color-wine-600)] transition-all shadow-2xl hover:shadow-wine-900/40 active:scale-95"
                      >
                        Confirm Factory Reset
                      </button>
                      <button
                        onClick={() => setConfirmReset(false)}
                        className="border border-[var(--color-ink-600)] px-10 py-5 label-eyebrow text-[var(--color-bone-400)] hover:text-[var(--color-bone-100)] hover:bg-[var(--color-ink-800)] transition-all active:scale-95"
                      >
                        Abort
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Decorative danger alert background */}
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[var(--color-wine-900)]/10 rounded-full blur-3xl pointer-events-none" />
            </Card>
          </section>

          {/* Footer spacer */}
          <div className="h-24 lg:h-32" />
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-14 border-b border-[var(--color-ink-700)]/60 pb-10">
      <h2 className="font-display text-4xl font-extralight text-[var(--color-bone-50)] tracking-tight lg:text-5xl">{title}</h2>
      <p className="mt-4 text-[13px] md:text-sm text-[var(--color-bone-400)] max-w-2xl leading-relaxed font-body">{description}</p>
    </div>
  );
}

function VisibilityToggle({ label, description, value, onChange }: { 
  label: string; 
  description: string; 
  value: boolean; 
  onChange: (v: boolean) => void 
}) {
  return (
    <div className={cn(
      "p-8 lg:p-10 transition-all duration-300",
      value ? "bg-[var(--color-ink-800)]/30" : "hover:bg-[var(--color-ink-800)]/20"
    )}>
      <ToggleField
        label={label}
        description={description}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function ThemeOption({ icon: Icon, label, description, active, onClick }: ThemeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-6 border p-10 text-center transition-all duration-500 group overflow-hidden rounded-sm",
        active
          ? "border-[var(--color-pearl-300)] bg-[var(--color-ink-850)] shadow-[0_0_40px_rgba(230,222,207,0.1)] ring-1 ring-[var(--color-pearl-300)]/30"
          : "border-[var(--color-ink-700)]/60 bg-[var(--color-ink-950)]/40 hover:border-[var(--color-bone-500)] hover:bg-[var(--color-ink-800)]/40"
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center border rounded-full transition-all duration-700",
          active
            ? "border-[var(--color-pearl-300)] text-[var(--color-pearl-300)] scale-110 shadow-[0_0_20px_rgba(230,222,207,0.3)] bg-[var(--color-pearl-300)]/5"
            : "border-[var(--color-ink-700)] text-[var(--color-bone-600)] group-hover:text-[var(--color-bone-300)] group-hover:border-[var(--color-bone-500)]"
        )}
      >
        <Icon size={28} strokeWidth={1.2} />
      </div>
      <div className="space-y-2 relative z-10">
        <p className={cn(
          "font-display text-2xl font-light tracking-wide transition-colors",
          active ? "text-[var(--color-bone-50)]" : "text-[var(--color-bone-400)]"
        )}>{label}</p>
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-bone-500)] font-bold">
          {description}
        </p>
      </div>
      
      {/* Decorative accent */}
      {active && (
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[var(--color-pearl-300)]/5 rounded-full blur-3xl animate-pulse" />
      )}
      
      {active && (
        <div className="absolute top-6 right-6">
          <div className="bg-[var(--color-pearl-300)] text-[var(--color-ink-900)] p-1 rounded-full shadow-lg">
            <Check size={14} strokeWidth={3} />
          </div>
        </div>
      )}
    </button>
  );
}

interface ThemeOptionProps {
  icon: typeof Moon;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

function LayoutOption({ icon: Icon, label, active, onClick }: { 
  icon: any; 
  label: string; 
  active: boolean; 
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-3 px-6 py-4 border transition-all duration-500 group relative",
        active 
          ? "border-[var(--color-pearl-300)] bg-[var(--color-pearl-300)]/10 text-[var(--color-pearl-300)] shadow-[0_0_20px_rgba(230,222,207,0.1)]" 
          : "border-[var(--color-ink-700)] text-[var(--color-bone-500)] hover:border-[var(--color-bone-500)] hover:bg-[var(--color-ink-800)]/40"
      )}
    >
      <Icon size={16} className={cn("transition-colors duration-500", active ? "text-[var(--color-pearl-300)]" : "text-[var(--color-bone-600)] group-hover:text-[var(--color-bone-400)]")} />
      <span className="text-[11px] font-bold tracking-[0.15em] uppercase">{label}</span>
      {active && <div className="absolute inset-0 border border-[var(--color-pearl-300)]/40 animate-pulse" />}
    </button>
  );
}

function ImageGalleryField({ label, hint, images, onChange }: {
  label: string;
  hint: string;
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setBusy(true);
    try {
      const newImgs = [...images];
      for (let i = 0; i < files.length; i++) {
        const { url } = await uploadFile(files[i]);
        newImgs.push(url);
      }
      onChange(newImgs);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function remove(idx: number) {
    const next = [...images];
    next.splice(idx, 1);
    onChange(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-bone-500)] font-bold">
          {label}
        </label>
        <span className="text-[12px] leading-relaxed text-[var(--color-bone-600)] max-w-3xl font-body italic">
          {hint}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((img, idx) => (
          <div key={`${img}-${idx}`} className="group relative aspect-square border border-[var(--color-ink-700)] bg-[var(--color-ink-950)]/40 overflow-hidden shadow-2xl transition-all duration-500 hover:border-[var(--color-bone-500)]">
            <img src={resolveAsset(img)} alt="" className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" />
            <div className="absolute inset-0 bg-[var(--color-ink-900)]/70 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-[3px]">
              <button
                onClick={() => remove(idx)}
                className="p-4 bg-[var(--color-wine-700)] text-white rounded-full hover:bg-[var(--color-wine-600)] transition-all transform translate-y-4 group-hover:translate-y-0 shadow-2xl hover:scale-110 active:scale-95"
                title="Remove image"
              >
                <Trash2 size={20} />
              </button>
            </div>
            <div className="absolute bottom-3 left-3 bg-[var(--color-ink-950)]/90 px-3 py-1 rounded-sm border border-[var(--color-ink-700)] text-[10px] font-mono text-[var(--color-bone-400)] tracking-tighter">
              #{idx + 1}
            </div>
          </div>
        ))}
        
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className={cn(
            "flex flex-col items-center justify-center gap-4 aspect-square border-2 border-dashed border-[var(--color-ink-700)] bg-[var(--color-ink-950)]/20 text-[var(--color-bone-600)] transition-all duration-500 hover:border-[var(--color-pearl-300)] hover:text-[var(--color-pearl-300)] hover:bg-[var(--color-ink-950)]/40 group relative overflow-hidden",
            busy && "opacity-50 cursor-wait"
          )}
        >
          {busy ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-pearl-300)] border-t-transparent" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold animate-pulse">Uploading…</span>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-full border border-[var(--color-ink-700)] group-hover:border-[var(--color-pearl-300)] group-hover:bg-[var(--color-pearl-300)]/5 transition-all duration-500 transform group-hover:scale-110">
                <Plus size={24} />
              </div>
              <span className="text-[11px] uppercase tracking-[0.25em] font-bold">Add Image</span>
            </>
          )}
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(230,222,207,0.03)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
      
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
