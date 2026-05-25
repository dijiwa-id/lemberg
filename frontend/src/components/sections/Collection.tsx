import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, memo } from "react";
import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import type { SiteConfig, Wine } from "../../lib/types";
import { currencySymbol, wineDefaultImage } from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { Reveal, RevealLines } from "../motion/Reveal";
import { cn } from "../../lib/utils";

/* ─────────────────────────────────────────────────────────────────────
 * Wine collection section
 *
 * Four selectable layouts driven by `config.collectionLayout`:
 *   editorial   — default 3-column editorial grid (large cards)
 *   filter-grid — Apple-style filter sidebar + 2-column product grid
 *   compact     — full-width compact list (thumbnail + meta + price)
 *   mosaic      — asymmetric mosaic with one hero card + smaller rest
 *
 * Each renderer is a sub-component below. All four share the same header
 * (eyebrow + display copy) and footer (Order-a-case CTA) so the section
 * silhouette stays consistent across layouts.
 * ─────────────────────────────────────────────────────────────────── */

type Layout = "editorial" | "filter-grid" | "compact" | "mosaic";
const KNOWN_LAYOUTS: ReadonlySet<Layout> = new Set(["editorial", "filter-grid", "compact", "mosaic"]);

function resolveLayout(raw: string | undefined): Layout {
  if (raw && (KNOWN_LAYOUTS as Set<string>).has(raw)) return raw as Layout;
  return "editorial";
}

type Columns = 2 | 3 | 4;

function resolveColumns(raw: string | undefined): Columns {
  if (raw === "2") return 2;
  if (raw === "4") return 4;
  return 3;
}

/* Static Tailwind class strings — JIT can't generate from interpolation,
 * so all three options are listed in full. The base `grid-cols-1` keeps
 * mobile single-column; sm/lg breakpoints scale up. */
const COLUMN_CLASSES: Record<Columns, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

/* Pagination cap — editor picks 3 / 6 / 9 in the studio. Bounded at 9 so a
 * single page never overwhelms the visitor. Unknown values fall back to 9. */
function resolvePageSize(raw: string | undefined): number {
  if (raw === "3") return 3;
  if (raw === "6") return 6;
  return 9;
}

/**
 * Pagination state for a list of items. Clamps the page when items shrink
 * (filter changes, deletes) instead of getting stuck on an empty page —
 * no race conditions, no resetKey props, just always-valid state.
 */
function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  function gotoPage(next: number) {
    const clamped = Math.max(0, Math.min(next, totalPages - 1));
    setPage(clamped);
    // Scroll the section top into view AFTER state commits so the smooth
    // scroll lands on the freshly-mounted page. rAF aligns the scroll
    // with the next paint — short delay, no jank.
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        const section = document.getElementById("collection");
        if (!section) return;
        const rect = section.getBoundingClientRect();
        // Only scroll if the section top is above the viewport (visitor
        // scrolled past it) — avoids forcing scroll when they're already
        // looking at the grid.
        if (rect.top < 0) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }

  return {
    page: safePage,
    setPage: gotoPage,
    totalPages,
    pageItems,
    hasMultiplePages: totalPages > 1,
    rangeStart: items.length === 0 ? 0 : start + 1,
    rangeEnd: start + pageItems.length,
    total: items.length,
  };
}

/* ─────────────────────────────────────────────────────────────────────
 * Pagination component — editorial style
 *
 * `< 01 02 03 >` with an animated pearl underline that slides between
 * active numbers (motion `layoutId`). Below: "Showing 1–9 of 27 wines"
 * for context. Component renders nothing when there's only one page so
 * smaller catalogues get a clean section without leftover chrome.
 * ─────────────────────────────────────────────────────────────────── */

interface PaginationProps {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  onChange: (next: number) => void;
}

function Pagination({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  total,
  onChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Wine collection pagination"
      className="mt-16 flex flex-col items-center gap-4"
    >
      <div className="flex items-center gap-1">
        <PaginationArrow
          direction="prev"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
        />
        <ol className="flex items-center gap-1" role="list">
          {Array.from({ length: totalPages }).map((_, i) => {
            const active = i === page;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onChange(i)}
                  aria-current={active ? "page" : undefined}
                  aria-label={`Go to page ${i + 1} of ${totalPages}`}
                  className={cn(
                    "relative px-4 py-2 font-mono text-[12px] tracking-[0.2em] transition-colors",
                    active
                      ? "text-[var(--color-pearl-300)]"
                      : "text-[var(--color-bone-500)] hover:text-[var(--color-bone-100)]"
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                  {active && (
                    <motion.span
                      layoutId="collection-page-underline"
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="pointer-events-none absolute inset-x-3 -bottom-px h-px bg-[var(--color-pearl-300)]"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        <PaginationArrow
          direction="next"
          disabled={page >= totalPages - 1}
          onClick={() => onChange(page + 1)}
        />
      </div>
      <p className="label-eyebrow text-[var(--color-bone-500)]">
        Showing {rangeStart}–{rangeEnd} of {total}
        {total === 1 ? " wine" : " wines"}
      </p>
    </nav>
  );
}

function PaginationArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous page" : "Next page"}
      className={cn(
        "flex h-9 w-9 items-center justify-center transition-colors",
        disabled
          ? "cursor-not-allowed text-[var(--color-bone-600)]/40"
          : "text-[var(--color-bone-400)] hover:text-[var(--color-pearl-300)]"
      )}
    >
      <Icon size={16} strokeWidth={1.25} />
    </button>
  );
}

/* Animated wrapper used by each layout so a page change feels intentional
 * rather than a hard swap. `mode="wait"` runs exit then enter — keeps the
 * editorial feel that overlap would interrupt. */
const PAGE_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const };

function PagedGrid({
  pageKey,
  children,
}: {
  pageKey: number;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`page-${pageKey}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={PAGE_TRANSITION}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

interface CollectionProps {
  config: SiteConfig;
  wines: Wine[];
  onOpenWine?: (wine: Wine) => void;
}

export function Collection({ config, wines, onOpenWine }: CollectionProps) {
  const layout = resolveLayout(config.collectionLayout);
  const columns = resolveColumns(config.collectionColumns);
  const pageSize = resolvePageSize(config.collectionPageSize);
  const symbol = currencySymbol(config.currency);

  return (
    <section
      id="collection"
      className="relative border-t border-[var(--border-subtle)] bg-[var(--color-ink-850)] px-6 py-32 md:px-10 md:py-44"
    >
      <div className="mx-auto max-w-[1480px]">
        <CollectionHeader config={config} />

        {layout === "editorial" && (
          <EditorialGrid
            wines={wines}
            symbol={symbol}
            columns={columns}
            pageSize={pageSize}
            onOpenWine={onOpenWine}
          />
        )}
        {layout === "filter-grid" && (
          <FilterGrid
            wines={wines}
            symbol={symbol}
            columns={columns}
            pageSize={pageSize}
            onOpenWine={onOpenWine}
          />
        )}
        {layout === "compact" && (
          <CompactList
            wines={wines}
            symbol={symbol}
            pageSize={pageSize}
            onOpenWine={onOpenWine}
          />
        )}
        {layout === "mosaic" && (
          <MosaicGrid
            wines={wines}
            symbol={symbol}
            pageSize={pageSize}
            onOpenWine={onOpenWine}
          />
        )}

        <Reveal y={20} delay={0.2} className="mt-24 flex justify-center">
          <a
            href="#experience"
            className="group inline-flex items-center gap-4 border border-[var(--color-bone-300)]/40 px-8 py-4 text-[var(--color-bone-100)] transition-colors hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)]"
          >
            <span className="label-meta">Order a case</span>
            <svg width="20" height="8" viewBox="0 0 20 8" fill="none" aria-hidden>
              <path d="M1 4h17m0 0L15 1m3 3l-3 3" stroke="currentColor" strokeWidth="1" />
            </svg>
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Shared header
 * ─────────────────────────────────────────────────────────────────── */

function CollectionHeader({ config }: { config: SiteConfig }) {
  return (
    <div className="mb-20 grid items-end gap-10 md:mb-28 md:grid-cols-12">
      <Reveal y={12} className="md:col-span-7">
        <div className="mb-8 flex items-center gap-4">
          <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
          <span className="label-eyebrow text-[var(--color-bone-400)]">
            {config.collectionEyebrow || "The collection"}
          </span>
        </div>
        <h2 className="font-display text-[clamp(2.4rem,5.2vw,5rem)] font-light leading-[0.98] tracking-[-0.015em] text-[var(--color-bone-50)]">
          <RevealLines text={config.collectionHeading || "Six wines."} perLineStagger={0.1} />
          {config.collectionItalic && (
            <RevealLines
              text={config.collectionItalic}
              italicLines={[0]}
              delay={0.18}
              className="text-[var(--color-pearl-300)]"
            />
          )}
        </h2>
      </Reveal>
      <Reveal y={16} delay={0.15} className="md:col-span-4 md:col-start-9">
        <p className="body-editorial max-w-sm">
          A measured collection released once a year. Each wine reflects a single season,
          one parcel of vines, and one pair of hands in the cellar.
        </p>
      </Reveal>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Layout 1 — Editorial grid (default)
 * ─────────────────────────────────────────────────────────────────── */

interface LayoutProps {
  wines: Wine[];
  symbol: string;
  onOpenWine?: (wine: Wine) => void;
  /** Desktop column count — editorial + filter-grid honour it; compact +
   *  mosaic ignore it because their shape is fixed by design. */
  columns?: Columns;
  /** Max items per rendered page. Pagination kicks in only when the
   *  visible-after-filter list is longer than this. */
  pageSize?: number;
}

function EditorialGrid({
  wines,
  symbol,
  columns = 3,
  pageSize = 9,
  onOpenWine,
}: LayoutProps) {
  const [hovered, setHovered] = useState<number | string | null>(null);
  const {
    page,
    setPage,
    totalPages,
    pageItems,
    rangeStart,
    rangeEnd,
    total,
  } = usePagination(wines, pageSize);

  return (
    <>
      <PagedGrid pageKey={page}>
        <div className={cn("grid gap-10 sm:gap-8 lg:gap-12", COLUMN_CLASSES[columns])}>
          {pageItems.map((wine, i) => (
            <Reveal
              key={wine.id}
              y={36}
              delay={(i % columns) * 0.08}
              className="group flex h-full flex-col"
            >
              <WineCard
                wine={wine}
                symbol={symbol}
                hovered={hovered === wine.id}
                onHover={(v) => setHovered(v ? wine.id : null)}
                onOpen={() => onOpenWine?.(wine)}
              />
            </Reveal>
          ))}
        </div>
      </PagedGrid>
      <Pagination
        page={page}
        totalPages={totalPages}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={total}
        onChange={setPage}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Layout 2 — Filter grid (Apple-style sidebar + 2-column grid)
 *
 * Filters derived live from the wine catalogue — only categories with
 * 2+ values appear, so a 1-region cellar doesn't show a single-row Region
 * filter. Selecting filter pills narrows the visible wines client-side.
 * ─────────────────────────────────────────────────────────────────── */

function FilterGrid({
  wines,
  symbol,
  columns = 3,
  pageSize = 9,
  onOpenWine,
}: LayoutProps) {
  const [hovered, setHovered] = useState<number | string | null>(null);
  const [open, setOpen] = useState(false);  // mobile drawer
  const [active, setActive] = useState<Record<string, Set<string>>>({});

  const facets = useMemo(() => buildFacets(wines), [wines]);
  const filtered = useMemo(() => applyFilters(wines, active), [wines, active]);

  // Paginate AFTER filtering — usePagination clamps the page when the
  // filtered list shrinks, so applying a tighter filter while on page 3
  // smoothly snaps to the last valid page rather than showing emptiness.
  const {
    page,
    setPage,
    totalPages,
    pageItems,
    rangeStart,
    rangeEnd,
    total,
  } = usePagination(filtered, pageSize);

  function toggle(facet: string, value: string) {
    setActive((cur) => {
      const next = { ...cur };
      const set = new Set(next[facet] || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      if (set.size === 0) delete next[facet];
      else next[facet] = set;
      return next;
    });
  }

  const activeCount = Object.values(active).reduce((sum, s) => sum + s.size, 0);

  return (
    <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-14">
      {/* Filter sidebar (desktop) — fixed-width, sticky once scrolled. */}
      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-7">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <span className="label-eyebrow text-[var(--color-bone-300)]">Filter by</span>
            {activeCount > 0 && (
              <button
                onClick={() => setActive({})}
                className="label-eyebrow text-[var(--color-bone-500)] hover:text-[var(--color-pearl-300)]"
              >
                Clear
              </button>
            )}
          </div>
          {facets.map((f) => (
            <FacetBlock
              key={f.key}
              facet={f}
              selected={active[f.key]}
              onToggle={(v) => toggle(f.key, v)}
            />
          ))}
        </div>
      </aside>

      {/* Mobile filter button */}
      <div className="flex items-center justify-between lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 border border-[var(--border-default)] px-4 py-2 label-eyebrow text-[var(--color-bone-200)]"
        >
          <Filter size={13} /> Filter
          {activeCount > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center bg-[var(--color-pearl-300)] px-1 text-[10px] font-medium text-[var(--color-ink-900)]">
              {activeCount}
            </span>
          )}
        </button>
        <span className="label-eyebrow text-[var(--color-bone-500)]">
          {filtered.length} {filtered.length === 1 ? "wine" : "wines"}
        </span>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-[rgba(7,7,10,0.7)] backdrop-blur-sm" />
          <aside
            className="relative ml-auto h-full w-[80%] max-w-[320px] overflow-y-auto bg-[var(--color-ink-850)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="label-eyebrow text-[var(--color-bone-300)]">Filter by</span>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} className="text-[var(--color-bone-300)]" />
              </button>
            </div>
            <div className="space-y-7">
              {facets.map((f) => (
                <FacetBlock
                  key={f.key}
                  facet={f}
                  selected={active[f.key]}
                  onToggle={(v) => toggle(f.key, v)}
                />
              ))}
              {activeCount > 0 && (
                <button
                  onClick={() => setActive({})}
                  className="mt-4 w-full border border-[var(--border-default)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
                >
                  Clear all
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Grid */}
      <div>
        <div className="hidden items-center justify-between border-b border-[var(--border-subtle)] pb-4 lg:flex">
          <span className="text-sm text-[var(--color-bone-300)]">
            {filtered.length} {filtered.length === 1 ? "wine" : "wines"}
          </span>
          {activeCount > 0 && (
            <span className="label-eyebrow text-[var(--color-bone-500)]">
              {activeCount} filter{activeCount === 1 ? "" : "s"} active
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 border border-dashed border-[var(--border-subtle)] py-16 text-center">
            <p className="font-display text-2xl text-[var(--color-bone-200)]">
              No wines match these filters.
            </p>
            <button
              onClick={() => setActive({})}
              className="label-eyebrow text-[var(--color-pearl-300)] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <PagedGrid pageKey={page}>
              <div className={cn("mt-10 grid gap-10 sm:gap-8", COLUMN_CLASSES[columns])}>
                {pageItems.map((wine, i) => (
                  <Reveal
                    key={wine.id}
                    y={28}
                    delay={(i % columns) * 0.06}
                    className="group flex flex-col"
                  >
                    <WineCard
                      wine={wine}
                      symbol={symbol}
                      hovered={hovered === wine.id}
                      onHover={(v) => setHovered(v ? wine.id : null)}
                      onOpen={() => onOpenWine?.(wine)}
                    />
                  </Reveal>
                ))}
              </div>
            </PagedGrid>
            <Pagination
              page={page}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              total={total}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface Facet {
  key: string;
  label: string;
  values: string[];
  /** True when at least one wine lacks a value for this field — used by
   *  `buildFacets` to decide whether a single-value facet is still useful
   *  (clicking it isolates the wines that have the value). */
  hasEmpty: boolean;
}

function buildFacets(wines: Wine[]): Facet[] {
  // Category leads the list — it's the broadest grouping (Red/White/…)
  // so visitors scan from coarse to fine. Order also drives the
  // top-to-bottom render order in the sidebar.
  const fields: Array<{ key: keyof Wine; label: string }> = [
    { key: "category", label: "Category" },
    { key: "region", label: "Region" },
    { key: "status", label: "Availability" },
  ];
  return fields
    .map((f) => {
      const set = new Set<string>();
      let hasEmpty = false;
      wines.forEach((w) => {
        const v = (w[f.key] as string | undefined)?.trim();
        if (v) set.add(v);
        else hasEmpty = true;
      });
      const values = Array.from(set).sort();
      return { key: String(f.key), label: f.label, values, hasEmpty };
    })
    // Show a facet when clicking would actually narrow the visible
    // wines, i.e. when at least two distinct buckets exist:
    //   - ≥2 distinct non-empty values, OR
    //   - ≥1 distinct value AND some wines lack the field
    //     (clicking the value isolates the ones that have it)
    // This fixes the editor-confusing case where a single shared value
    // (e.g. 3 wines tagged "Reserve", 3 untagged) used to hide the
    // filter entirely just because there was only one unique value.
    .filter((f) => f.values.length >= 2 || (f.values.length >= 1 && f.hasEmpty));
}

function applyFilters(wines: Wine[], active: Record<string, Set<string>>): Wine[] {
  const keys = Object.keys(active);
  if (keys.length === 0) return wines;
  return wines.filter((w) =>
    keys.every((k) => {
      const v = (w[k as keyof Wine] as string | undefined)?.trim() || "";
      return active[k].has(v);
    })
  );
}

function FacetBlock({
  facet,
  selected,
  onToggle,
}: {
  facet: Facet;
  selected: Set<string> | undefined;
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="label-eyebrow mb-3 text-[var(--color-bone-400)]">{facet.label}</p>
      <ul className="space-y-2">
        {facet.values.map((v) => {
          const active = selected?.has(v) ?? false;
          return (
            <li key={v}>
              <button
                type="button"
                onClick={() => onToggle(v)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center gap-2 text-left text-sm transition-colors",
                  active
                    ? "text-[var(--color-pearl-300)]"
                    : "text-[var(--color-bone-300)] hover:text-[var(--color-bone-100)]"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3 w-3 shrink-0 border transition-colors",
                    active
                      ? "border-[var(--color-pearl-300)] bg-[var(--color-pearl-300)]"
                      : "border-[var(--border-default)]"
                  )}
                  aria-hidden
                />
                <span className="capitalize">{v.replace("-", " ")}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Layout 3 — Compact list (full-width rows)
 * ─────────────────────────────────────────────────────────────────── */

function CompactList({ wines, symbol, pageSize = 9, onOpenWine }: LayoutProps) {
  const {
    page,
    setPage,
    totalPages,
    pageItems,
    rangeStart,
    rangeEnd,
    total,
  } = usePagination(wines, pageSize);

  return (
    <>
      <PagedGrid pageKey={page}>
        <div className="divide-y divide-[var(--border-subtle)]">
          {pageItems.map((wine, i) => (
            <CompactRow
              key={wine.id}
              wine={wine}
              symbol={symbol}
              delay={(i % 4) * 0.05}
              onOpen={() => onOpenWine?.(wine)}
            />
          ))}
        </div>
      </PagedGrid>
      <Pagination
        page={page}
        totalPages={totalPages}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={total}
        onChange={setPage}
      />
    </>
  );
}

function CompactRow({
  wine,
  symbol,
  delay,
  onOpen,
}: {
  wine: Wine;
  symbol: string;
  delay: number;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Reveal y={20} delay={delay}>
      <button
        type="button"
        onClick={onOpen}
        className="group grid w-full grid-cols-[80px_1fr_auto] items-center gap-5 py-5 text-left transition-colors hover:bg-[var(--color-ink-800)]/40 sm:grid-cols-[120px_1fr_auto_auto] sm:gap-8 sm:py-8"
      >
        <div
          className={cn(
            "aspect-[3/4] overflow-hidden bg-[var(--color-ink-800)]",
            !loaded && "animate-pulse"
          )}
        >
          <motion.img
            src={resolveAsset(wineDefaultImage(wine))}
            alt={wine.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: loaded ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-xl font-light tracking-[-0.005em] text-[var(--color-bone-50)] sm:text-2xl">
              {wine.name}
            </h3>
            {wine.vintage && (
              <span className="label-eyebrow text-[var(--color-pearl-300)]">
                {wine.vintage}
              </span>
            )}
          </div>
          {wine.varietal && (
            <p className="mt-1 body-editorial !text-[13px] text-[var(--color-bone-400)] line-clamp-1">
              {wine.varietal}
              {wine.region && <span className="text-[var(--color-bone-500)]"> · {wine.region}</span>}
            </p>
          )}
        </div>
        <span className="hidden label-eyebrow text-[var(--color-bone-200)]/80 sm:inline">
          {(wine.status || "available").toString().replace("-", " ")}
        </span>
        <span className="label-meta whitespace-nowrap text-[var(--color-bone-300)]">
          {wine.price ? `${symbol}${wine.price.toFixed(0)}` : "Enquire"}
        </span>
      </button>
    </Reveal>
  );
}


/* ─────────────────────────────────────────────────────────────────────
 * Layout 4 — Mosaic (hero + supporting cards)
 *
 * The hero is the FIRST wine of the active page — so when the visitor
 * paginates, each page reveals its own featured wine plus supporting
 * cards. Pagination only kicks in when total wines exceed the page size.
 * ─────────────────────────────────────────────────────────────────── */

function MosaicGrid({ wines, symbol, pageSize = 9, onOpenWine }: LayoutProps) {
  const [hovered, setHovered] = useState<number | string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const {
    page,
    setPage,
    totalPages,
    pageItems,
    rangeStart,
    rangeEnd,
    total,
  } = usePagination(wines, pageSize);

  if (pageItems.length === 0) return null;
  const [hero, ...rest] = pageItems;

  return (
    <>
      <PagedGrid pageKey={page}>
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      {/* Hero (spans 7 columns) */}
      <Reveal y={36} className="lg:col-span-7">
        <button
          type="button"
          onMouseEnter={() => setHovered(hero.id)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onOpenWine?.(hero)}
          className="group flex h-full w-full flex-col text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-pearl-300)]"
        >
          <div
            className={cn(
              "relative aspect-[4/5] overflow-hidden bg-[var(--color-ink-800)] lg:aspect-[5/6]",
              !loaded && "animate-pulse"
            )}
          >
            <motion.img
              src={resolveAsset(wineDefaultImage(hero))}
              alt={hero.name}
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              initial={{ opacity: 0 }}
              animate={{
                scale: hovered === hero.id ? 1.04 : 1.0,
                opacity: loaded ? 1 : 0,
              }}
              transition={{
                scale: { duration: 1.6, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.5 },
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[var(--hero-overlay-bottom)] via-[var(--hero-overlay-mid)] to-transparent p-8 pt-24">
              <span className="label-eyebrow text-[var(--color-pearl-300)]">
                Featured release
              </span>
              <h3 className="mt-2 font-display text-3xl font-light text-[var(--color-bone-50)] sm:text-4xl">
                {hero.name}
              </h3>
              {hero.varietal && (
                <p className="mt-2 body-editorial text-[var(--color-bone-300)] !text-[13px]">
                  {hero.varietal}
                  {hero.vintage && (
                    <span className="ml-2 text-[var(--color-pearl-300)]">{hero.vintage}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </button>
      </Reveal>

      {/* Supporting cards (5 columns wide, 2-up grid) */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:col-span-5">
        {rest.map((wine, i) => (
          <Reveal key={wine.id} y={28} delay={(i % 2) * 0.08} className="group flex h-full flex-col">
            <WineCard
              wine={wine}
              symbol={symbol}
              hovered={hovered === wine.id}
              onHover={(v) => setHovered(v ? wine.id : null)}
              onOpen={() => onOpenWine?.(wine)}
              compact
            />
          </Reveal>
        ))}
      </div>
    </div>
      </PagedGrid>
      <Pagination
        page={page}
        totalPages={totalPages}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={total}
        onChange={setPage}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Shared card — used by Editorial / Filter / Mosaic layouts
 * ─────────────────────────────────────────────────────────────────── */

interface WineCardProps {
  wine: Wine;
  symbol: string;
  hovered: boolean;
  onHover: (v: boolean) => void;
  onOpen: () => void;
  /** Compact mode trims gaps + meta so the card reads well in narrower columns. */
  compact?: boolean;
}

const WineCard = memo(function WineCard({ wine, symbol, hovered, onHover, onOpen, compact }: WineCardProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onOpen}
      aria-label={`View ${wine.name}${wine.vintage ? " " + wine.vintage : ""} details`}
      className="flex h-full flex-col text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-pearl-300)]"
    >
      <div
        className={cn(
          "relative aspect-[4/5] overflow-hidden bg-[var(--color-ink-800)]",
          !loaded && "animate-pulse"
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-10 mix-blend-multiply bg-[var(--vignette-overlay)]" />
        <motion.img
          src={resolveAsset(wineDefaultImage(wine))}
          alt={wine.name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          initial={{ opacity: 0 }}
          animate={{
            scale: hovered ? 1.06 : 1.0,
            opacity: loaded ? 1 : 0,
          }}
          transition={{
            scale: { duration: 1.6, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.5 },
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-20 flex items-end p-6"
        >
          <span className="label-eyebrow text-[var(--color-bone-50)]">View wine →</span>
        </motion.div>
        <div className="absolute left-0 top-0 z-20 flex h-10 items-center gap-3 px-4">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              wine.status === "available" && "bg-[var(--color-pearl-300)]",
              wine.status === "allocated" && "bg-[var(--color-wine-500)]",
              wine.status === "library" && "bg-[var(--color-bone-400)]",
              (!wine.status || wine.status === "sold-out") && "bg-[var(--color-bone-600)]"
            )}
          />
          <span className="label-eyebrow text-[var(--color-bone-200)]/80">
            {(wine.status || "available").toString().replace("-", " ")}
          </span>
        </div>
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "mt-4" : "mt-6")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              className={cn(
                "font-display font-light tracking-[-0.005em] text-[var(--color-bone-50)]",
                compact ? "text-xl" : "text-2xl"
              )}
            >
              {wine.name}
            </h3>
            {wine.varietal && (
              <p className="mt-1 body-editorial text-[var(--color-bone-400)] !text-[13px]">
                {wine.varietal}
              </p>
            )}
          </div>
          {wine.vintage && (
            <span className="label-eyebrow shrink-0 text-[var(--color-pearl-300)]">
              {wine.vintage}
            </span>
          )}
        </div>

        {!compact && wine.description && (
          <p
            className="mt-4 max-w-xs body-editorial !text-[13.5px] text-[var(--color-bone-400)] line-clamp-2"
            title={wine.description}
          >
            {wine.description}
          </p>
        )}

        <div
          className={cn(
            "flex items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-4",
            compact ? "mt-4" : "mt-6"
          )}
        >
          <span className="label-meta text-[var(--color-bone-300)]">
            {wine.price ? `${symbol}${wine.price.toFixed(0)}` : "— Enquire —"}
          </span>
          <span className="label-eyebrow text-[var(--color-bone-200)]/70 transition-colors group-hover:text-[var(--color-pearl-300)]">
            Discover →
          </span>
        </div>
      </div>
    </button>
  );
});
