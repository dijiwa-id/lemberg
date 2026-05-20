import { Plus } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { TextField } from "../../components/admin/Field";
import { LayoutPicker, type LayoutOption } from "../../components/admin/LayoutPicker";
import { WineEditor } from "../../components/admin/WineEditor";
import { cn } from "../../lib/utils";
import type { AdminContext } from "../Admin";

type CollectionLayout = "editorial" | "filter-grid" | "compact" | "mosaic";
type CollectionColumns = "2" | "3" | "4";
type CollectionPageSize = "3" | "6" | "9";

/** Layouts where the column count actually changes the rendered grid.
 *  Compact (full-width rows) and Mosaic (asymmetric hero) ignore it
 *  because their shape is fixed by design — the column picker greys out
 *  to make that obvious. */
const COLUMN_AWARE_LAYOUTS: ReadonlySet<CollectionLayout> = new Set([
  "editorial",
  "filter-grid",
]);

interface PillOption<T extends string> {
  value: T;
  label: string;
}

const COLUMN_OPTIONS: PillOption<CollectionColumns>[] = [
  { value: "2", label: "Two" },
  { value: "3", label: "Three" },
  { value: "4", label: "Four" },
];

const PAGE_SIZE_OPTIONS: PillOption<CollectionPageSize>[] = [
  { value: "3", label: "3" },
  { value: "6", label: "6" },
  { value: "9", label: "9" },
];

function resolveColumns(raw: string | undefined): CollectionColumns {
  if (raw === "2" || raw === "4") return raw;
  return "3";
}

function resolvePageSize(raw: string | undefined): CollectionPageSize {
  if (raw === "3" || raw === "6") return raw;
  return "9";
}

const LAYOUT_OPTIONS: LayoutOption<CollectionLayout>[] = [
  {
    value: "editorial",
    label: "Editorial grid",
    description: "Three-column gallery with large cards. The default — works well for any catalogue size.",
    diagram: (
      <div className="grid h-full w-full grid-cols-3 gap-1">
        <span className="bg-[var(--color-bone-300)]/30" />
        <span className="bg-[var(--color-bone-300)]/30" />
        <span className="bg-[var(--color-bone-300)]/30" />
      </div>
    ),
  },
  {
    value: "filter-grid",
    label: "Filter sidebar",
    description: "Left filter rail (varietal, region, vintage, availability) and a two-column product grid. Best for larger catalogues.",
    diagram: (
      <div className="grid h-full w-full grid-cols-[1fr_2fr] gap-1">
        <div className="flex flex-col gap-1 bg-[var(--color-bone-300)]/15 p-1">
          <span className="h-1 bg-[var(--color-bone-300)]/40" />
          <span className="h-1 bg-[var(--color-bone-300)]/40" />
          <span className="h-1 bg-[var(--color-bone-300)]/40" />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <span className="bg-[var(--color-bone-300)]/30" />
          <span className="bg-[var(--color-bone-300)]/30" />
          <span className="bg-[var(--color-bone-300)]/30" />
          <span className="bg-[var(--color-bone-300)]/30" />
        </div>
      </div>
    ),
  },
  {
    value: "compact",
    label: "Compact list",
    description: "Full-width rows with thumbnail, name, region, and price. Quick to scan when copy and price matter more than imagery.",
    diagram: (
      <div className="flex h-full w-full flex-col gap-1.5">
        <span className="h-3 bg-[var(--color-bone-300)]/30" />
        <span className="h-3 bg-[var(--color-bone-300)]/30" />
        <span className="h-3 bg-[var(--color-bone-300)]/30" />
        <span className="h-3 bg-[var(--color-bone-300)]/30" />
      </div>
    ),
  },
  {
    value: "mosaic",
    label: "Hero mosaic",
    description: "First wine becomes a large hero card; the rest fill a tighter side grid. Useful for spotlighting one wine per release.",
    diagram: (
      <div className="grid h-full w-full grid-cols-2 gap-1">
        <span className="row-span-2 bg-[var(--color-bone-300)]/40" />
        <span className="bg-[var(--color-bone-300)]/30" />
        <span className="bg-[var(--color-bone-300)]/30" />
      </div>
    ),
  },
];

function resolveLayout(raw: string | undefined): CollectionLayout {
  const known = LAYOUT_OPTIONS.find((o) => o.value === raw);
  return known ? known.value : "editorial";
}

export function CollectionPage({ ctx }: { ctx: AdminContext }) {
  const {
    config,
    wines,
    update,
    onAddWine,
    onWineChange,
    onReorderWines,
    onDeleteWine,
  } = ctx;

  const currentLayout = resolveLayout(config.collectionLayout);
  const currentColumns = resolveColumns(config.collectionColumns);
  const currentPageSize = resolvePageSize(config.collectionPageSize);
  const columnsApplies = COLUMN_AWARE_LAYOUTS.has(currentLayout);
  // Pagination applies to every layout — each renderer respects the
  // configured page size and only shows controls when the wine list
  // actually exceeds the size, so smaller catalogues never see them.
  const pageSizeFitsCatalogue = wines.length > Number(currentPageSize);

  return (
    <>
      <PageHeader
        eyebrow="Section 04"
        title="Wine collection"
        description="Manage the wine library — copy, reorder, edit, upload bottle photography, and set availability status."
      >
        <button
          onClick={onAddWine}
          className="flex items-center gap-2 bg-[var(--color-bone-50)] px-4 py-2 label-eyebrow text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)]"
        >
          <Plus size={13} /> Add wine
        </button>
      </PageHeader>

      <div className="space-y-6 p-5 lg:p-10">
        <Card
          title="Section heading"
          description="The copy that introduces the collection on the landing page."
        >
          <div className="grid gap-5 md:grid-cols-3">
            <TextField
              label="Eyebrow"
              value={config.collectionEyebrow || ""}
              onChange={(v) => update({ collectionEyebrow: v })}
              placeholder="The collection"
            />
            <TextField
              label="Heading"
              value={config.collectionHeading || ""}
              onChange={(v) => update({ collectionHeading: v })}
              placeholder="Six wines."
            />
            <TextField
              label="Italic accent line"
              value={config.collectionItalic || ""}
              onChange={(v) => update({ collectionItalic: v })}
              placeholder="One season."
            />
          </div>
        </Card>

        <Card
          title="Display layout"
          description="Choose how the wine grid renders on the landing page. Switch any time — the choice doesn't affect wine data."
        >
          <LayoutPicker
            value={currentLayout}
            onChange={(v) => update({ collectionLayout: v })}
            options={LAYOUT_OPTIONS}
          />

          {/* Grid columns — only meaningful for layouts that use a grid.
              Stays visible (but dimmed) on Compact + Mosaic so editors
              learn the constraint instead of the control disappearing. */}
          <div className="mt-6 border-t border-[var(--color-ink-700)] pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm",
                    columnsApplies
                      ? "text-[var(--color-bone-100)]"
                      : "text-[var(--color-bone-500)]"
                  )}
                >
                  Grid columns
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-bone-400)]">
                  {columnsApplies
                    ? "How many columns the grid uses on desktop. Mobile and tablet stay one or two columns automatically."
                    : "The selected layout has a fixed shape — pick Editorial or Filter sidebar to use this setting."}
                </p>
              </div>
              <div
                role="radiogroup"
                aria-label="Grid columns"
                aria-disabled={!columnsApplies}
                className={cn(
                  "inline-flex shrink-0 self-start border border-[var(--border-default)] sm:self-auto",
                  !columnsApplies && "opacity-50"
                )}
              >
                {COLUMN_OPTIONS.map((opt) => {
                  const active = currentColumns === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={!columnsApplies}
                      onClick={() => update({ collectionColumns: opt.value })}
                      title={`${opt.label} columns`}
                      className={cn(
                        "flex flex-col items-center gap-2 border-r border-[var(--border-default)] px-5 py-3 last:border-r-0 transition-colors",
                        active && columnsApplies
                          ? "bg-[var(--color-ink-850)] text-[var(--color-pearl-300)]"
                          : "text-[var(--color-bone-300)]",
                        columnsApplies && !active && "hover:bg-[var(--color-ink-800)] hover:text-[var(--color-bone-100)]",
                        !columnsApplies && "cursor-not-allowed"
                      )}
                    >
                      <ColumnsDiagram count={Number(opt.value) as 2 | 3 | 4} active={active && columnsApplies} />
                      <span className="label-eyebrow">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Page size — applies to all layouts. When more wines exist
              than this number, the landing page shows pagination
              controls below the grid. */}
          <div className="mt-6 border-t border-[var(--color-ink-700)] pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-[var(--color-bone-100)]">
                  Products per page
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-bone-400)]">
                  {pageSizeFitsCatalogue
                    ? `Pagination will activate — your catalogue has ${wines.length} wines.`
                    : `All ${wines.length} wines fit in one page at this size. Pagination only appears when there are more wines than the page size.`}
                </p>
              </div>
              <div
                role="radiogroup"
                aria-label="Products per page"
                className="inline-flex shrink-0 self-start border border-[var(--border-default)] sm:self-auto"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => {
                  const active = currentPageSize === opt.value;
                  const willPaginate = wines.length > Number(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => update({ collectionPageSize: opt.value })}
                      title={
                        willPaginate
                          ? `${opt.label} per page — ${Math.ceil(
                              wines.length / Number(opt.value)
                            )} pages`
                          : `${opt.label} per page — fits in one page`
                      }
                      className={cn(
                        "flex min-w-[64px] flex-col items-center gap-2 border-r border-[var(--border-default)] px-5 py-3 last:border-r-0 transition-colors",
                        active
                          ? "bg-[var(--color-ink-850)] text-[var(--color-pearl-300)]"
                          : "text-[var(--color-bone-300)] hover:bg-[var(--color-ink-800)] hover:text-[var(--color-bone-100)]"
                      )}
                    >
                      <span
                        className={cn(
                          "font-display text-2xl leading-none",
                          active && "text-[var(--color-pearl-300)]"
                        )}
                      >
                        {opt.label}
                      </span>
                      <span className="label-eyebrow">per page</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <Card
          title={`Wines (${wines.length})`}
          description="Drag to reorder. Click Edit to expand a wine's metadata. Changes save instantly."
        >
          <WineEditor
            wines={wines}
            onAdd={onAddWine}
            onChange={onWineChange}
            onReorder={onReorderWines}
            onDelete={onDeleteWine}
          />
        </Card>
      </div>
    </>
  );
}

/** N vertical bars in a 16×10 box — mirrors what the editor will see on
 *  the landing grid at desktop widths. Pearl tint when active so the
 *  selected count reads instantly. */
function ColumnsDiagram({ count, active }: { count: 2 | 3 | 4; active: boolean }) {
  return (
    <div
      className="grid h-3 w-6 gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-full",
            active ? "bg-[var(--color-pearl-300)]" : "bg-[var(--color-bone-400)]/70"
          )}
        />
      ))}
    </div>
  );
}
