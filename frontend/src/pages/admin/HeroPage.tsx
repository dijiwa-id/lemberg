import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { ImageField, SelectField, TextField } from "../../components/admin/Field";
import { ToggleField } from "../../components/admin/ToggleField";
import { LayoutPicker, type LayoutOption } from "../../components/admin/LayoutPicker";
import {
  isRenderableSlide,
  parseHeroSlides,
  serializeHeroSlides,
  type HeroSlide,
} from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { cn } from "../../lib/utils";
import type { AdminContext } from "../Admin";

/* ─────────────────────────────────────────────────────────────────────
 * Hero admin
 *
 * Sections:
 *   1. Base copy + background  → applies when no slides are defined
 *      (fallback single-image hero) AND as the default copy for slides
 *      that don't override.
 *   2. Layout / Animation pickers → composition + transition style
 *   3. Slider settings → autoplay + interval
 *   4. Slides list → ordered list with per-slide image + optional copy
 *      overrides. Empty list collapses the slider into the legacy hero.
 * ─────────────────────────────────────────────────────────────────── */

type HeroLayout = "fullscreen-center" | "split-left" | "split-right" | "caption-bottom";
type SliderAnimation = "fade" | "slide" | "kenburns" | "stack";

const LAYOUT_OPTIONS: LayoutOption<HeroLayout>[] = [
  {
    value: "fullscreen-center",
    label: "Fullscreen",
    description: "Full-bleed image with the headline anchored at the bottom — the original cinematic hero.",
    diagram: (
      <div className="relative h-full w-full bg-[var(--color-bone-300)]/25">
        <span className="absolute bottom-1 left-1 h-1 w-6 bg-[var(--color-pearl-300)]/70" />
        <span className="absolute bottom-2.5 left-1 h-1.5 w-10 bg-[var(--color-bone-200)]" />
      </div>
    ),
  },
  {
    value: "split-left",
    label: "Split · text left",
    description: "Dark text plate on the left, full image on the right. Pairs well with serif headings.",
    diagram: (
      <div className="grid h-full w-full grid-cols-2">
        <div className="flex flex-col items-start justify-center gap-0.5 bg-[var(--color-ink-700)] px-1.5">
          <span className="h-1 w-4 bg-[var(--color-pearl-300)]/70" />
          <span className="h-1 w-6 bg-[var(--color-bone-200)]" />
        </div>
        <span className="bg-[var(--color-bone-300)]/30" />
      </div>
    ),
  },
  {
    value: "split-right",
    label: "Split · text right",
    description: "Mirror — image on the left, dark text plate on the right.",
    diagram: (
      <div className="grid h-full w-full grid-cols-2">
        <span className="bg-[var(--color-bone-300)]/30" />
        <div className="flex flex-col items-start justify-center gap-0.5 bg-[var(--color-ink-700)] px-1.5">
          <span className="h-1 w-4 bg-[var(--color-pearl-300)]/70" />
          <span className="h-1 w-6 bg-[var(--color-bone-200)]" />
        </div>
      </div>
    ),
  },
  {
    value: "caption-bottom",
    label: "Caption strip",
    description: "Full-bleed image with a narrow caption bar pinned at the bottom — gallery feel.",
    diagram: (
      <div className="flex h-full w-full flex-col">
        <div className="flex-1 bg-[var(--color-bone-300)]/30" />
        <div className="flex h-3 items-center gap-1 bg-[var(--color-ink-700)] px-1">
          <span className="h-1 w-6 bg-[var(--color-pearl-300)]/70" />
          <span className="ml-auto h-1 w-3 bg-[var(--color-bone-200)]" />
        </div>
      </div>
    ),
  },
];

const ANIMATION_OPTIONS: LayoutOption<SliderAnimation>[] = [
  {
    value: "fade",
    label: "Fade",
    description: "Soft crossfade between slides — the most quiet, editorial option.",
    diagram: (
      <div className="relative h-full w-full">
        <span className="absolute inset-2 bg-[var(--color-bone-300)]/40" />
        <span className="absolute inset-1 bg-[var(--color-pearl-300)]/30" />
      </div>
    ),
  },
  {
    value: "slide",
    label: "Slide",
    description: "Horizontal slide — feels more energetic, suits photo-led campaigns.",
    diagram: (
      <div className="relative flex h-full w-full items-center justify-center gap-1">
        <span className="h-6 w-3 bg-[var(--color-bone-300)]/30" />
        <span className="h-6 w-3 bg-[var(--color-pearl-300)]/60" />
        <span className="h-6 w-3 bg-[var(--color-bone-300)]/30" />
      </div>
    ),
  },
  {
    value: "kenburns",
    label: "Ken Burns",
    description: "Slow continuous zoom on each slide while it's on screen, crossfade between. Cinematic.",
    diagram: (
      <div className="relative flex h-full w-full items-center justify-center">
        <span className="absolute inset-2 border border-[var(--color-bone-300)]/40" />
        <span className="absolute inset-3.5 border border-[var(--color-pearl-300)]/70" />
        <span className="absolute inset-5 border border-[var(--color-pearl-300)]" />
      </div>
    ),
  },
  {
    value: "stack",
    label: "Stack reveal",
    description: "Clip-path reveal from top — feels architectural, gives a sense of unveiling.",
    diagram: (
      <div className="flex h-full w-full flex-col gap-0.5">
        <span className="h-1.5 bg-[var(--color-pearl-300)]/70" />
        <span className="h-2 bg-[var(--color-bone-300)]/40" />
        <span className="h-2.5 bg-[var(--color-bone-300)]/30" />
      </div>
    ),
  },
];

const INTERVAL_PRESETS = [
  { value: "4000", label: "4 seconds — brisk" },
  { value: "6000", label: "6 seconds — balanced (recommended)" },
  { value: "8000", label: "8 seconds — relaxed" },
  { value: "12000", label: "12 seconds — slow editorial" },
];

function resolveLayout(raw: string | undefined): HeroLayout {
  const known = LAYOUT_OPTIONS.find((o) => o.value === raw);
  return known ? known.value : "fullscreen-center";
}
function resolveAnimation(raw: string | undefined): SliderAnimation {
  const known = ANIMATION_OPTIONS.find((o) => o.value === raw);
  return known ? known.value : "fade";
}

export function HeroPage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;

  // Parse once per config string change. The parser now preserves draft
  // slides (image-less) so `addSlide` actually produces a visible row —
  // before this fix, serializeHeroSlides filtered drafts out before they
  // could land in state. The renderable subset is computed separately
  // for the effective-mode badge.
  const slides = useMemo(
    () => parseHeroSlides(config.heroSlides),
    [config.heroSlides]
  );
  const renderableCount = useMemo(
    () => slides.filter(isRenderableSlide).length,
    [slides]
  );

  const layout = resolveLayout(config.heroLayout);
  const animation = resolveAnimation(config.heroSliderAnimation);
  const autoplay = (config.heroSliderAutoplay ?? "true") === "true";
  const sliderEnabled = (config.heroSliderEnabled ?? "true") === "true";

  // Which slide is expanded right now. Single-expand keeps the list
  // scannable; auto-expand on add saves the editor a click since the
  // image upload is the next obvious step.
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  function commitSlides(next: HeroSlide[]) {
    update({ heroSlides: serializeHeroSlides(next) });
  }

  function addSlide() {
    const next = [...slides, { image: "" }];
    commitSlides(next);
    setExpandedIdx(next.length - 1);  // auto-expand for immediate image upload
  }

  function removeSlide(i: number) {
    commitSlides(slides.filter((_, idx) => idx !== i));
    // If we removed the expanded one (or any before it), invalidate.
    setExpandedIdx((cur) => {
      if (cur === null) return cur;
      if (cur === i) return null;
      if (cur > i) return cur - 1;
      return cur;
    });
  }

  function moveSlide(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    commitSlides(next);
    // Track the expanded slide as it moves.
    setExpandedIdx((cur) => (cur === i ? j : cur === j ? i : cur));
  }

  function updateSlide(i: number, patch: Partial<HeroSlide>) {
    commitSlides(slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function toggleExpand(i: number) {
    setExpandedIdx((cur) => (cur === i ? null : i));
  }

  /* Effective render mode — drives the badge at the top of the slides
   * card. Mirrors the runtime logic in components/sections/Hero.tsx so
   * editors see exactly what visitors will get. */
  const effectiveMode: "slider" | "single" = sliderEnabled && renderableCount > 0
    ? "slider"
    : "single";
  const effectiveReason =
    !sliderEnabled
      ? "Slider master switch is off."
      : renderableCount === 0
        ? slides.length === 0
          ? "No slides defined yet."
          : "All slides are drafts (no image)."
        : null;

  return (
    <>
      <PageHeader
        eyebrow="Section 02"
        title="Hero"
        description="The opening frame visitors see. Toggle the slider on to use multiple slides with transitions, or off for the classic single-image hero."
      />

      <div className="space-y-6 p-5 lg:p-10">
        {/* ── 0. Mode toggle ───────────────────────────────── */}
        <Card
          title="Slider mode"
          description="Master switch — flip off to use the single-image hero even when slides exist. Drafts are preserved either way, so this is a safe rollback."
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <ToggleField
              label="Enable hero slider"
              description={
                sliderEnabled
                  ? "Slider is on — visitors will see the configured slides with the chosen layout and animation."
                  : "Slider is off — visitors will see the classic single-image hero using the background image below."
              }
              value={sliderEnabled}
              onChange={(v) =>
                update({ heroSliderEnabled: v ? "true" : "false" })
              }
            />
            <EffectiveModeBadge
              mode={effectiveMode}
              reason={effectiveReason}
              renderableCount={renderableCount}
            />
          </div>
        </Card>

        {/* ── 1. Base copy ─────────────────────────────────── */}
        <Card
          title="Base copy"
          description="The default headline, subhead, and CTA. Slides can override these per slide; if a slide leaves a field blank, this is what shows."
        >
          <div className="grid gap-5">
            <TextField
              label="Eyebrow"
              value={config.heroEyebrow || ""}
              onChange={(v) => update({ heroEyebrow: v })}
              placeholder="Tulbagh Valley · South Africa"
            />
            <TextField
              label="Heading"
              multiline
              rows={2}
              value={config.heroHeading || ""}
              onChange={(v) => update({ heroHeading: v })}
              hint="Use Enter for a line break"
            />
            <TextField
              label="Heading — italic accent line"
              value={config.heroHeadingItalic || ""}
              onChange={(v) => update({ heroHeadingItalic: v })}
              placeholder="extraordinary intent."
            />
            <TextField
              label="Subheading"
              multiline
              rows={3}
              value={config.heroSubheading || ""}
              onChange={(v) => update({ heroSubheading: v })}
            />
            <TextField
              label="Primary CTA"
              value={config.heroCta || ""}
              onChange={(v) => update({ heroCta: v })}
              placeholder="View the collection"
            />
          </div>
        </Card>

        {/* ── 2. Fallback background ───────────────────────── */}
        <Card
          title="Background image"
          description="Used when the slides list below is empty. With slides defined, each slide brings its own image."
        >
          <ImageField
            label="Background image"
            value={config.heroBackgroundImage || ""}
            onChange={(v) => update({ heroBackgroundImage: v })}
            aspect="aspect-video"
          />
        </Card>

        {/* ── 3. Hero layout ───────────────────────────────── */}
        <Card
          title="Hero layout"
          description="How the image + text compose. Currently affects the slider; the single-image hero keeps its classic full-bleed composition."
        >
          <div className={cn(!sliderEnabled && "opacity-60")}>
            <LayoutPicker
              value={layout}
              onChange={(v) => update({ heroLayout: v })}
              options={LAYOUT_OPTIONS}
            />
            {!sliderEnabled && (
              <p className="mt-4 label-eyebrow text-[var(--color-bone-500)]">
                Slider is off — layout will take effect when you turn it back on.
              </p>
            )}
          </div>
        </Card>

        {/* ── 4. Slider animation ──────────────────────────── */}
        <Card
          title="Slider animation"
          description="How slides transition. Only meaningful with the slider enabled and two or more renderable slides."
        >
          <div className={cn(!sliderEnabled && "opacity-60")}>
            <LayoutPicker
              value={animation}
              onChange={(v) => update({ heroSliderAnimation: v })}
              options={ANIMATION_OPTIONS}
              diagramAspect="aspect-square"
            />
          </div>
        </Card>

        {/* ── 5. Slider settings ───────────────────────────── */}
        <Card
          title="Slider settings"
          description="Autoplay + how long each slide stays on screen. Visitors can still navigate manually via arrows, dots, swipe, or arrow keys."
        >
          <div className={cn("grid gap-5 sm:grid-cols-[1fr_1fr]", !sliderEnabled && "opacity-60")}>
            <ToggleField
              label="Autoplay"
              description="Advance slides automatically. Respects the visitor's reduced-motion setting and pauses while they hover the hero."
              value={autoplay}
              onChange={(v) => update({ heroSliderAutoplay: v ? "true" : "false" })}
              disabled={!sliderEnabled}
            />
            <SelectField
              label="Slide interval"
              value={config.heroSliderInterval || "6000"}
              onChange={(v) => update({ heroSliderInterval: v })}
              options={INTERVAL_PRESETS}
              hint="Ken Burns uses this duration for the continuous zoom — pair longer intervals with Ken Burns for the calmest motion."
            />
          </div>
        </Card>

        {/* ── 6. Slides list ───────────────────────────────── */}
        <Card
          title={`Slides (${slides.length})`}
          description={slidesCardDescription(slides.length, renderableCount)}
          action={
            <button
              onClick={addSlide}
              className="flex items-center gap-2 bg-[var(--color-bone-50)] px-4 py-2 label-eyebrow text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)]"
            >
              <Plus size={13} /> Add slide
            </button>
          }
        >
          {slides.length === 0 ? (
            <EmptySlidesHint onAdd={addSlide} />
          ) : (
            <ul className="space-y-3">
              {slides.map((slide, i) => (
                <SlideRow
                  key={i}
                  slide={slide}
                  index={i}
                  total={slides.length}
                  expanded={expandedIdx === i}
                  onToggleExpand={() => toggleExpand(i)}
                  onPatch={(patch) => updateSlide(i, patch)}
                  onMoveUp={() => moveSlide(i, -1)}
                  onMoveDown={() => moveSlide(i, 1)}
                  onRemove={() => removeSlide(i)}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function slidesCardDescription(total: number, renderable: number): string {
  if (total === 0) {
    return "No slides yet — click Add slide to start. New slides expand automatically so you can upload the image right away.";
  }
  const drafts = total - renderable;
  const parts: string[] = [];
  if (renderable > 0) {
    parts.push(`${renderable} ready to publish`);
  }
  if (drafts > 0) {
    parts.push(`${drafts} draft${drafts === 1 ? "" : "s"} (no image yet)`);
  }
  return `${parts.join(" · ")}. Order top-to-bottom matches slide order. Each slide can optionally override the base copy.`;
}

/* ─────────────────────────────────────────────────────────────────── */

/** Live indicator mirroring what visitors will actually see — bridges the
 *  gap between "config says X" and "render does Y" so editors don't get
 *  surprised by drafts or a disabled master switch. */
function EffectiveModeBadge({
  mode,
  reason,
  renderableCount,
}: {
  mode: "slider" | "single";
  reason: string | null;
  renderableCount: number;
}) {
  const Icon = mode === "slider" ? Eye : EyeOff;
  return (
    <div
      className={cn(
        "inline-flex flex-col gap-1 border px-4 py-3",
        mode === "slider"
          ? "border-[color-mix(in_srgb,var(--color-pearl-300)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-pearl-300)_8%,transparent)]"
          : "border-[var(--border-default)] bg-[var(--bg-input)]"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={12}
          className={cn(
            mode === "slider"
              ? "text-[var(--color-pearl-300)]"
              : "text-[var(--color-bone-500)]"
          )}
        />
        <span className="label-eyebrow text-[var(--color-bone-300)]">
          On the live site
        </span>
      </div>
      <p className="text-sm text-[var(--color-bone-100)]">
        {mode === "slider"
          ? `Slider · ${renderableCount} slide${renderableCount === 1 ? "" : "s"}`
          : "Single-image hero"}
      </p>
      {reason && (
        <p className="text-xs text-[var(--color-bone-500)]">{reason}</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function EmptySlidesHint({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed border-[var(--border-subtle)] px-6 py-10 text-center">
      <ImageIcon size={22} className="text-[var(--color-bone-500)] opacity-60" />
      <p className="font-display text-lg text-[var(--color-bone-200)]">
        No slides — single image hero
      </p>
      <p className="max-w-md text-sm leading-relaxed text-[var(--color-bone-400)]">
        Start a slider by adding a slide. Each slide carries its own image
        and can optionally override the base copy above. With one slide the
        hero behaves like a static image; with two or more it animates.
      </p>
      <button
        onClick={onAdd}
        className="mt-2 flex items-center gap-2 border border-[var(--color-ink-600)] px-5 py-2.5 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
      >
        <Plus size={13} /> Add first slide
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

interface SlideRowProps {
  slide: HeroSlide;
  index: number;
  total: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onPatch: (patch: Partial<HeroSlide>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function SlideRow({
  slide,
  index,
  total,
  expanded,
  onToggleExpand,
  onPatch,
  onMoveUp,
  onMoveDown,
  onRemove,
}: SlideRowProps) {
  const thumb = slide.image ? resolveAsset(slide.image) : "";
  const isDraft = !isRenderableSlide(slide);
  const hasOverrides =
    !!slide.eyebrow ||
    !!slide.heading ||
    !!slide.headingItalic ||
    !!slide.subheading ||
    !!slide.ctaLabel ||
    !!slide.ctaHref;

  return (
    <li
      className={cn(
        "border bg-[var(--bg-input)] transition-colors",
        isDraft
          ? "border-dashed border-[var(--color-bone-400)]/40"
          : "border-[var(--border-subtle)]"
      )}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Thumb */}
        <div className="relative aspect-[3/2] w-24 shrink-0 overflow-hidden border border-[var(--border-subtle)] bg-[var(--color-ink-850)]">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--color-bone-500)]">
              <ImageIcon size={16} />
              <span className="text-[9px] uppercase tracking-[0.2em]">Empty</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-[var(--color-bone-500)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="truncate text-sm text-[var(--color-bone-100)]">
              {slide.heading?.trim() || slide.eyebrow?.trim() || "Untitled slide"}
            </p>
            {isDraft && (
              <span className="inline-flex items-center gap-1 border border-[var(--color-bone-400)]/40 px-1.5 py-0.5 label-eyebrow text-[var(--color-bone-400)]">
                Draft
              </span>
            )}
            {!isDraft && hasOverrides && (
              <span className="inline-flex items-center gap-1 border border-[color-mix(in_srgb,var(--color-pearl-300)_40%,transparent)] px-1.5 py-0.5 label-eyebrow text-[var(--color-pearl-300)]">
                Custom copy
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-[var(--color-bone-400)]">
            {isDraft
              ? "Upload an image to publish this slide — it won't appear on the live page until then."
              : hasOverrides
                ? "Per-slide copy overrides applied."
                : "Inherits the base copy from above."}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <IconButton
            label="Move up"
            disabled={index === 0}
            onClick={onMoveUp}
            icon={ArrowUp}
          />
          <IconButton
            label="Move down"
            disabled={index === total - 1}
            onClick={onMoveDown}
            icon={ArrowDown}
          />
          <IconButton
            label={expanded ? "Collapse" : "Edit"}
            onClick={onToggleExpand}
            icon={expanded ? ChevronUp : ChevronDown}
          />
          <IconButton
            label="Remove"
            onClick={onRemove}
            icon={Trash2}
            destructive
          />
        </div>
      </div>

      {expanded && (
        <div className="space-y-5 border-t border-[var(--border-subtle)] bg-[var(--color-ink-950)] p-5">
          <ImageField
            label="Slide image"
            value={slide.image}
            onChange={(v) => onPatch({ image: v })}
            aspect="aspect-video"
            hint="Best at 2400px wide, dark or atmospheric — matches the editorial mood."
          />

          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Eyebrow (override)"
              value={slide.eyebrow || ""}
              onChange={(v) => onPatch({ eyebrow: v })}
              placeholder="Leave empty to inherit base copy"
            />
            <TextField
              label="Heading (override)"
              value={slide.heading || ""}
              onChange={(v) => onPatch({ heading: v })}
              placeholder="Leave empty to inherit"
            />
            <TextField
              label="Italic accent (override)"
              value={slide.headingItalic || ""}
              onChange={(v) => onPatch({ headingItalic: v })}
              placeholder="Leave empty to inherit"
            />
            <TextField
              label="Subheading (override)"
              multiline
              rows={2}
              value={slide.subheading || ""}
              onChange={(v) => onPatch({ subheading: v })}
              placeholder="Leave empty to inherit"
            />
            <TextField
              label="CTA label (override)"
              value={slide.ctaLabel || ""}
              onChange={(v) => onPatch({ ctaLabel: v })}
              placeholder="View the collection"
            />
            <TextField
              label="CTA href (override)"
              value={slide.ctaHref || ""}
              onChange={(v) => onPatch({ ctaHref: v })}
              placeholder="#collection or /journal"
              hint="An on-page anchor (#section) or an internal path. External links work too."
            />
          </div>
        </div>
      )}
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function IconButton({
  label,
  onClick,
  icon: Icon,
  disabled,
  destructive,
}: {
  label: string;
  onClick: () => void;
  icon: typeof ArrowUp;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center border transition-colors",
        disabled
          ? "border-[var(--border-subtle)] text-[var(--color-bone-600)] opacity-50 cursor-not-allowed"
          : destructive
            ? "border-[var(--color-ink-600)] text-[var(--color-bone-500)] hover:border-[var(--color-wine-700)] hover:text-[var(--color-wine-500)]"
            : "border-[var(--color-ink-600)] text-[var(--color-bone-300)] hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
      )}
    >
      <Icon size={13} />
    </button>
  );
}
