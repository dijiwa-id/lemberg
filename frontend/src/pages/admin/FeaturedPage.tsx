import { useMemo } from "react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { ImageField, SelectField, TextField } from "../../components/admin/Field";
import { LayoutPicker, type LayoutOption } from "../../components/admin/LayoutPicker";
import type { AdminContext } from "../Admin";

type BentoLayout = "stack-right" | "stack-left" | "top-hero" | "tri-equal";

/** Tiny CSS-only diagrams. The brighter (pearl-tinted) block denotes the
 *  primary (bottle hero) slot so editors can read which one is the focal
 *  point at a glance. Stays in sync with the public BENTO_LAYOUTS table
 *  in components/sections/FeaturedWine.tsx. */
const BENTO_OPTIONS: LayoutOption<BentoLayout>[] = [
  {
    value: "stack-right",
    label: "Stacked right",
    description: "Bottle hero on the left, two accent details stacked on the right. The original look.",
    diagram: (
      <div className="grid h-full w-full grid-cols-5 grid-rows-2 gap-1">
        <span className="col-span-3 row-span-2 bg-[var(--color-pearl-300)]/35" />
        <span className="col-span-2 bg-[var(--color-bone-300)]/30" />
        <span className="col-span-2 bg-[var(--color-bone-300)]/30" />
      </div>
    ),
  },
  {
    value: "stack-left",
    label: "Stacked left",
    description: "Mirror — accent details on the left, bottle hero on the right. Pairs with right-aligned copy.",
    diagram: (
      <div className="grid h-full w-full grid-cols-5 grid-rows-2 gap-1">
        <span className="col-span-2 bg-[var(--color-bone-300)]/30" />
        <span className="col-span-3 row-span-2 bg-[var(--color-pearl-300)]/35" />
        <span className="col-span-2 bg-[var(--color-bone-300)]/30" />
      </div>
    ),
  },
  {
    value: "top-hero",
    label: "Top hero",
    description: "Wide hero on top, two square accents below. Cinematic — good when the bottle photo is landscape-leaning.",
    diagram: (
      <div className="grid h-full w-full grid-cols-2 gap-1">
        <span className="col-span-2 h-6 bg-[var(--color-pearl-300)]/35" />
        <span className="bg-[var(--color-bone-300)]/30" />
        <span className="bg-[var(--color-bone-300)]/30" />
      </div>
    ),
  },
  {
    value: "tri-equal",
    label: "Tri-equal",
    description: "Three balanced columns. Symmetrical, gallery-style. Each image gets equal visual weight.",
    diagram: (
      <div className="grid h-full w-full grid-cols-3 gap-1">
        <span className="bg-[var(--color-bone-300)]/30" />
        <span className="bg-[var(--color-pearl-300)]/35" />
        <span className="bg-[var(--color-bone-300)]/30" />
      </div>
    ),
  },
];

function resolveBentoLayout(raw: string | undefined): BentoLayout {
  const known = BENTO_OPTIONS.find((o) => o.value === raw);
  return known ? known.value : "stack-right";
}

export function FeaturedPage({ ctx }: { ctx: AdminContext }) {
  const { config, wines, update } = ctx;
  const currentBento = resolveBentoLayout(config.featuredBentoLayout);

  const wineOptions = useMemo(
    () =>
      [{ value: "", label: "— Use first wine —" }].concat(
        wines.map((w) => ({
          value: String(w.id),
          label: `${w.name}${w.vintage ? " · " + w.vintage : ""}`,
        }))
      ),
    [wines]
  );

  // Resolve which bottle image will actually be used as the primary slot —
  // editor's override > selected wine's image > first wine's image.
  const selectedWine =
    wines.find((w) => String(w.id) === String(config.featuredWineId)) ||
    wines[0];
  const primaryHint = config.featuredImage
    ? "Custom override — falls back to the selected wine if you clear it."
    : selectedWine?.image
      ? `Currently using ${selectedWine.name}'s bottle photo. Upload here to override.`
      : "Upload a primary product shot. Best as a transparent PNG.";

  return (
    <>
      <PageHeader
        eyebrow="Section 05"
        title="Featured wine"
        description="Flagship showcase — one bottle, three images in an editorial bento grid."
      />
      <div className="space-y-6 p-5 lg:p-10">
        <Card title="Selection" description="Choose which wine to spotlight.">
          <SelectField
            label="Featured wine"
            value={String(config.featuredWineId || "")}
            onChange={(v) => update({ featuredWineId: v })}
            options={wineOptions}
            hint="Varietal, vintage, category, and price are pulled from the wine itself."
          />
        </Card>

        <Card
          title="Showcase copy"
          description="These override the wine's default name and description in this section only."
        >
          <div className="grid gap-5">
            <TextField
              label="Eyebrow"
              value={config.featuredEyebrow || ""}
              onChange={(v) => update({ featuredEyebrow: v })}
              placeholder="Flagship release"
            />
            <TextField
              label="Heading override"
              value={config.featuredHeading || ""}
              onChange={(v) => update({ featuredHeading: v })}
              hint="Leave blank to use the wine's name."
            />
            <TextField
              label="Body"
              multiline
              rows={5}
              value={config.featuredBody || ""}
              onChange={(v) => update({ featuredBody: v })}
            />
          </div>
        </Card>

        {/* ── BENTO LAYOUT PICKER ─────────────────────────────── */}
        <Card
          title="Bento layout"
          description="Pick the shape — the three image slots stay the same, only their arrangement changes. Switch any time."
        >
          <LayoutPicker
            value={currentBento}
            onChange={(v) => update({ featuredBentoLayout: v })}
            options={BENTO_OPTIONS}
            diagramAspect="aspect-[5/4]"
          />
        </Card>

        {/* ── BENTO GALLERY (image slots) ──────────────────────── */}
        <Card
          title="Bento images"
          description="Three slots — primary is the bottle hero (drives the parallax effect); accents add atmosphere (cellar, vineyard, hands at work)."
        >
          <div className="grid gap-4 md:grid-cols-5 md:grid-rows-2">
            {/* Primary slot — col 1-3, row 1-2 */}
            <div className="md:col-span-3 md:row-span-2">
              <SlotHeader index="01" label="Primary · bottle" />
              <ImageField
                label="Primary image"
                value={config.featuredImage || ""}
                onChange={(v) => update({ featuredImage: v })}
                aspect="aspect-[3/4]"
                hint={primaryHint}
              />
            </div>

            {/* Accent 1 — col 4-5, row 1 */}
            <div className="md:col-span-2 md:row-span-1">
              <SlotHeader index="02" label="Accent · top-right" />
              <ImageField
                label="Accent 1 image"
                value={config.featuredImageAccent1 || ""}
                onChange={(v) => update({ featuredImageAccent1: v })}
                aspect="aspect-square"
                hint="A detail or cellar shot."
              />
              <div className="mt-3">
                <TextField
                  label="Accent 1 caption"
                  value={config.featuredImageAccent1Caption || ""}
                  onChange={(v) => update({ featuredImageAccent1Caption: v })}
                  placeholder="In the cellar"
                  hint="Optional small label that sits at the bottom of the image."
                />
              </div>
            </div>

            {/* Accent 2 — col 4-5, row 2 */}
            <div className="md:col-span-2 md:row-span-1">
              <SlotHeader index="03" label="Accent · bottom-right" />
              <ImageField
                label="Accent 2 image"
                value={config.featuredImageAccent2 || ""}
                onChange={(v) => update({ featuredImageAccent2: v })}
                aspect="aspect-square"
                hint="A landscape or vineyard moment."
              />
              <div className="mt-3">
                <TextField
                  label="Accent 2 caption"
                  value={config.featuredImageAccent2Caption || ""}
                  onChange={(v) => update({ featuredImageAccent2Caption: v })}
                  placeholder="From the home block"
                  hint="Optional caption."
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function SlotHeader({ index, label }: { index: string; label: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <span className="font-mono text-[10px] text-[var(--color-bone-500)]">
        {index}
      </span>
      <span className="label-eyebrow text-[var(--color-bone-300)]">{label}</span>
    </div>
  );
}

