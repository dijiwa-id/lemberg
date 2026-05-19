import { Check } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { ImageField, TextField } from "../../components/admin/Field";
import { Monogram } from "../../components/Monogram";
import { BRAND_FONTS } from "../../lib/types";
import { fontStack, useGoogleFont } from "../../lib/useGoogleFont";
import { resolveAsset } from "../../services/api";
import { cn } from "../../lib/utils";
import type { AdminContext } from "../Admin";

export function BrandPage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;

  // Load the whole curated catalogue so the picker can show real previews.
  useGoogleFont(BRAND_FONTS.map((f) => f.family));

  const currentFont = config.logoFont || "Cormorant Garamond";
  const brandText = config.logoText || "Lemberg";
  const iconUrl = config.logoImage ? resolveAsset(config.logoImage) : "";

  return (
    <>
      <PageHeader
        eyebrow="Section 01"
        title="Brand"
        description="Identity used in the header, footer, and social sharing. The brand mark = icon + wordmark text."
      />
      <div className="space-y-6 p-5 lg:p-10">
        {/* ── Live brand preview ─────────────────────────────── */}
        <Card
          title="Preview"
          description="How the brand mark renders in the public header."
        >
          <div className="flex flex-col items-center gap-8 border border-[var(--border-subtle)] bg-[var(--color-ink-900)] p-12">
            <div className="flex items-center gap-4">
              {iconUrl ? (
                <img
                  src={iconUrl}
                  alt=""
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <Monogram className="h-12 w-auto" />
              )}
              <span
                className="text-3xl uppercase tracking-[0.32em] text-[var(--color-bone-100)]"
                style={{ fontFamily: fontStack(currentFont, "var(--font-display)") }}
              >
                {brandText}
              </span>
            </div>
            <p className="label-eyebrow text-[var(--color-bone-500)]">
              {currentFont}
            </p>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Identity ─────────────────────────────────────── */}
          <Card
            title="Identity"
            description="The brand name and an optional icon to render alongside it."
          >
            <div className="grid gap-5">
              <TextField
                label="Brand name"
                value={config.logoText || ""}
                onChange={(v) => update({ logoText: v })}
                placeholder="Lemberg"
                hint="Shown as a wordmark in the chosen font below."
              />
              <ImageField
                label="Logo icon (optional)"
                value={config.logoImage || ""}
                onChange={(v) => update({ logoImage: v })}
                aspect="aspect-square"
                hint="A small icon, monogram or seal. Best as a square PNG/SVG with transparent background. Leave blank to use the built-in iridescent “L” monogram."
              />
            </div>
          </Card>

          {/* ── Top announcement ─────────────────────────────── */}
          <Card
            title="Top announcement"
            description="Short line above the navigation — perfect for a current vintage or seasonal note."
          >
            <TextField
              label="Announcement copy"
              value={config.navAnnouncement || ""}
              onChange={(v) => update({ navAnnouncement: v })}
              placeholder="Vintage 2024 — pre-allocation open"
              hint="Toggle the announcement bar on/off from Settings → Section visibility."
            />
          </Card>
        </div>

        {/* ── Display font picker ────────────────────────────── */}
        <Card
          title="Display font"
          description={`Typography used for the wordmark text. ${BRAND_FONTS.length} typefaces — Google Fonts load automatically, commercial fonts work when the visitor has them installed locally.`}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BRAND_FONTS.map((font) => {
              const active = currentFont === font.family;
              return (
                <button
                  key={font.family}
                  type="button"
                  onClick={() => update({ logoFont: font.family })}
                  className={cn(
                    "flex flex-col items-start gap-4 border p-5 text-left transition-colors",
                    active
                      ? "border-[var(--color-pearl-300)] bg-[var(--color-ink-850)]"
                      : "border-[var(--border-default)] bg-[var(--bg-input)] hover:border-[var(--color-bone-400)]"
                  )}
                  aria-pressed={active}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <p className="label-eyebrow text-[var(--color-bone-500)]">
                      {font.category}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "border px-2 py-0.5 label-eyebrow",
                          font.source === "google"
                            ? "border-[color-mix(in_srgb,var(--color-pearl-300)_45%,transparent)] text-[var(--color-pearl-300)]"
                            : "border-[var(--border-default)] text-[var(--color-bone-400)]"
                        )}
                        title={
                          font.source === "google"
                            ? "Loaded automatically from Google Fonts"
                            : "Commercial font — works when the visitor's device has it installed; otherwise falls back to a similar typeface"
                        }
                      >
                        {font.source === "google" ? "Google" : "Local"}
                      </span>
                      {active && (
                        <Check
                          size={13}
                          className="text-[var(--color-pearl-300)]"
                        />
                      )}
                    </div>
                  </div>
                  <span
                    className="text-2xl uppercase tracking-[0.22em] leading-none text-[var(--color-bone-100)]"
                    style={{
                      fontFamily: fontStack(font.family, "var(--font-display)"),
                    }}
                  >
                    {brandText}
                  </span>
                  <span className="label-eyebrow text-[var(--color-bone-400)]">
                    {font.family}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-6 max-w-2xl text-xs leading-relaxed text-[var(--color-bone-500)]">
            <strong className="text-[var(--color-bone-300)]">Google</strong> fonts
            (Montserrat, Josefin Sans, Jost, etc.) are open-source and load on
            every visit. <strong className="text-[var(--color-bone-300)]">Local</strong>{" "}
            fonts (Gotham, Proxima Nova, Futura) are commercial — they render
            crisply when the visitor's system has them, otherwise the listed
            fallback chain takes over so the layout never breaks.
          </p>
        </Card>
      </div>
    </>
  );
}
