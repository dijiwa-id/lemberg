import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { ImageField, TextField, SelectField } from "../../components/admin/Field";
import { ToggleField } from "../../components/admin/ToggleField";
import {
  flagValue,
  configFlag,
  parseFeaturedSlides,
  serializeFeaturedSlides,
  isRenderableFeaturedSlide,
  type FeaturedSlide,
} from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { cn } from "../../lib/utils";
import type { AdminContext } from "../Admin";

export function FeaturedPage({ ctx }: { ctx: AdminContext }) {
  const { config, update, wines } = ctx;

  const slides = useMemo(
    () => parseFeaturedSlides(config.featuredSlides),
    [config.featuredSlides]
  );

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const sliderEnabled = configFlag(config.featuredSliderEnabled, true);
  const autoplay = configFlag(config.featuredSliderAutoplay, true);

  function commitSlides(next: FeaturedSlide[]) {
    update({ featuredSlides: serializeFeaturedSlides(next) });
  }

  function addSlide() {
    const next = [...slides, { wineId: "" }];
    commitSlides(next);
    setExpandedIdx(next.length - 1);
  }

  function removeSlide(i: number) {
    commitSlides(slides.filter((_, idx) => idx !== i));
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
    setExpandedIdx((cur) => (cur === i ? j : cur === j ? i : cur));
  }

  function updateSlide(i: number, patch: Partial<FeaturedSlide>) {
    commitSlides(slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function toggleExpand(i: number) {
    setExpandedIdx((cur) => (cur === i ? null : i));
  }

  const wineOptions = useMemo(() => [
    { value: "", label: "No linked wine (manual content)" },
    ...wines.map(w => ({
      value: String(w.id),
      label: `${w.name} ${w.vintage ? `· ${w.vintage}` : ""}`
    }))
  ], [wines]);

  return (
    <>
      <PageHeader
        eyebrow="Section 05"
        title="Featured Section"
        description="Cinematic luxury showcase. Highlights the latest products with a high-end asymmetric layout and oversized imagery."
      />
      <div className="space-y-4 p-4 lg:p-6">
        <Card
          title="Section Visibility"
          description="Control if this section appears on the landing page."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ToggleField
              label="Enable Featured Section"
              value={configFlag(config.showFeaturedWine)}
              onChange={(b) => update({ showFeaturedWine: flagValue(b) })}
            />
            <ToggleField
              label="Enable Slider Mode"
              description="Use the slides defined below. Falls back to top 2 wines if empty."
              value={sliderEnabled}
              onChange={(b) => update({ featuredSliderEnabled: flagValue(b) })}
            />
          </div>
        </Card>

        {/* ── Slides Management ───────────────────────────── */}
        <Card
          title={`Slides (${slides.length})`}
          description="Manage explicitly featured items. Link to wines or override content."
          action={
            <button
              onClick={addSlide}
              className="flex items-center gap-2 bg-[var(--color-bone-50)] px-3 py-1.5 label-eyebrow text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)]"
            >
              <Plus size={12} /> Add slide
            </button>
          }
        >
          {slides.length === 0 ? (
            <div className="flex flex-col items-center gap-2 border border-dashed border-[var(--border-subtle)] px-4 py-8 text-center">
              <ImageIcon size={20} className="text-[var(--color-bone-500)] opacity-60" />
              <p className="font-display text-base text-[var(--color-bone-200)]">
                No custom slides
              </p>
              <button
                onClick={addSlide}
                className="mt-1 flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
              >
                <Plus size={12} /> Create first slide
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {slides.map((slide, i) => (
                <SlideRow
                  key={i}
                  slide={slide}
                  index={i}
                  total={slides.length}
                  expanded={expandedIdx === i}
                  wines={wines}
                  wineOptions={wineOptions}
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

        {/* ── Slider Settings ────────────────────────────── */}
        {sliderEnabled && slides.length > 0 && (
          <Card
            title="Slider Settings"
            description="Control how the featured section animates."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <ToggleField
                label="Autoplay"
                value={autoplay}
                onChange={(b) => update({ featuredSliderAutoplay: flagValue(b) })}
              />
              <SelectField
                label="Slide interval"
                value={config.featuredSliderInterval || "8000"}
                onChange={(v) => update({ featuredSliderInterval: v })}
                options={[
                  { value: "5000", label: "5 seconds" },
                  { value: "8000", label: "8 seconds" },
                  { value: "12000", label: "12 seconds" },
                ]}
              />
            </div>
          </Card>
        )}

        <Card
          title="Global Content Overrides"
          description="Fallback values if no specific wine data is available."
        >
          <div className="grid gap-4">
            <TextField
              label="Section eyebrow"
              value={config.featuredEyebrow || ""}
              onChange={(v) => update({ featuredEyebrow: v })}
              placeholder="Flagship release"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Global Heading"
                value={config.featuredHeading || ""}
                onChange={(v) => update({ featuredHeading: v })}
              />
              <TextField
                label="Global Subtitle"
                value={config.featuredSubtitle || ""}
                onChange={(v) => update({ featuredSubtitle: v })}
              />
            </div>
            <TextField
              label="Section Description"
              value={config.featuredBody || ""}
              multiline
              rows={2}
              onChange={(v) => update({ featuredBody: v })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Primary CTA Label"
                value={config.featuredCtaPrimary || ""}
                onChange={(v) => update({ featuredCtaPrimary: v })}
              />
              <TextField
                label="Secondary CTA Label"
                value={config.featuredCtaSecondary || ""}
                onChange={(v) => update({ featuredCtaSecondary: v })}
              />
            </div>
          </div>
        </Card>

        <Card
          title="Global Visual Fallbacks"
          description="Cinematic settings if the featured wine doesn't specify its own."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ImageField
              label="Fallback Hero Image"
              value={config.featuredImage || ""}
              onChange={(v) => update({ featuredImage: v })}
              aspect="aspect-[3/4]"
            />
            <div className="space-y-4">
              <SelectField
                label="Image Position"
                value={config.featuredHeroImagePosition || "center"}
                onChange={(v) => update({ featuredHeroImagePosition: v })}
                options={[
                  { value: "center", label: "Center" },
                  { value: "left", label: "Left" },
                  { value: "right", label: "Right" },
                ]}
              />
              <TextField
                label="Overlay Opacity"
                value={config.featuredOverlayOpacity || "0.1"}
                onChange={(v) => update({ featuredOverlayOpacity: v })}
              />
              <div className="grid grid-cols-2 gap-4">
                <ToggleField
                  label="Reflection"
                  value={configFlag(config.featuredEnableReflection)}
                  onChange={(b) => update({ featuredEnableReflection: flagValue(b) })}
                />
                <ToggleField
                  label="Blur Effect"
                  value={configFlag(config.featuredEnableBlurEffect)}
                  onChange={(b) => update({ featuredEnableBlurEffect: flagValue(b) })}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="SEO Metadata"
          description="Search engine optimization for the featured section."
        >
          <div className="grid gap-5">
            <TextField
              label="SEO Title"
              value={config.featuredSeoTitle || ""}
              onChange={(v) => update({ featuredSeoTitle: v })}
            />
            <TextField
              label="SEO Description"
              value={config.featuredSeoDescription || ""}
              multiline
              onChange={(v) => update({ featuredSeoDescription: v })}
            />
          </div>
        </Card>
      </div>
    </>
  );
}

function SlideRow({
  slide,
  index,
  total,
  expanded,
  wines,
  wineOptions,
  onToggleExpand,
  onPatch,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  slide: FeaturedSlide;
  index: number;
  total: number;
  expanded: boolean;
  wines: any[];
  wineOptions: any[];
  onToggleExpand: () => void;
  onPatch: (patch: Partial<FeaturedSlide>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const linkedWine = wines.find(w => String(w.id) === String(slide.wineId));
  const isDraft = !isRenderableFeaturedSlide(slide);
  const thumb = slide.image || (linkedWine?.heroImage || (linkedWine?.images?.[0]));

  return (
    <li
      className={cn(
        "border bg-[var(--bg-input)] transition-colors",
        isDraft
          ? "border-dashed border-[var(--color-bone-400)]/40"
          : "border-[var(--border-subtle)]"
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="relative aspect-[3/4] w-12 shrink-0 overflow-hidden border border-[var(--border-subtle)] bg-[var(--color-ink-850)]">
          {thumb ? (
            <img src={resolveAsset(thumb)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--color-bone-500)]">
              <ImageIcon size={14} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--color-bone-500)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="truncate text-xs font-medium text-[var(--color-bone-100)]">
              {slide.heading || linkedWine?.name || "Untitled slide"}
            </p>
            {isDraft && (
              <span className="inline-flex items-center gap-1 border border-[var(--color-bone-400)]/40 px-1 py-0.5 text-[8px] uppercase tracking-wider text-[var(--color-bone-400)]">
                Draft
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-[var(--color-bone-400)]">
            {linkedWine ? `Linked to ${linkedWine.name}` : "Manual content"}
          </p>
        </div>

        <div className="flex items-center gap-1">
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
        <div className="space-y-4 border-t border-[var(--border-subtle)] bg-[var(--color-ink-950)] p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <ImageField
              label="Slide Image (Override)"
              value={slide.image || ""}
              onChange={(v) => onPatch({ image: v })}
              aspect="aspect-[3/4]"
            />
            <div className="space-y-4">
              <SelectField
                label="Linked Wine"
                value={String(slide.wineId || "")}
                onChange={(v) => onPatch({ wineId: v })}
                options={wineOptions}
                hint="Auto-populates data. You can still override specific fields below."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Eyebrow (Override)"
                  value={slide.eyebrow || ""}
                  onChange={(v) => onPatch({ eyebrow: v })}
                  placeholder={linkedWine ? "Inherit from wine category" : "Selected Release"}
                />
                <TextField
                  label="Heading (Override)"
                  value={slide.heading || ""}
                  onChange={(v) => onPatch({ heading: v })}
                  placeholder={linkedWine ? linkedWine.name : "Wine Name"}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Subtitle (Override)"
              value={slide.subtitle || ""}
              onChange={(v) => onPatch({ subtitle: v })}
              placeholder={linkedWine ? linkedWine.category : "Category"}
            />
            <TextField
              label="Body Description (Override)"
              value={slide.body || ""}
              multiline
              rows={2}
              onChange={(v) => onPatch({ body: v })}
              placeholder={linkedWine ? linkedWine.description : "Description"}
            />
            <TextField
              label="Primary CTA (Override)"
              value={slide.ctaPrimary || ""}
              onChange={(v) => onPatch({ ctaPrimary: v })}
              placeholder="Reserve a bottle"
            />
            <TextField
              label="Secondary CTA (Override)"
              value={slide.ctaSecondary || ""}
              onChange={(v) => onPatch({ ctaSecondary: v })}
              placeholder="Explore collection"
            />
          </div>
        </div>
      )}
    </li>
  );
}

function IconButton({
  label,
  onClick,
  icon: Icon,
  disabled,
  destructive,
}: {
  label: string;
  onClick: () => void;
  icon: any;
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
