import { motion, useScroll, useTransform, useInView } from "motion/react";
import { useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import type { SiteConfig, Wine } from "../../lib/types";
import { currencySymbol, wineDefaultImage } from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { Reveal, RevealLines } from "../motion/Reveal";
import { cn } from "../../lib/utils";

interface FeaturedWineProps {
  config: SiteConfig;
  wine?: Wine | null;
  onOpenWine?: (wine: Wine) => void;
}

export function FeaturedWine({ config, wine, onOpenWine }: FeaturedWineProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Parallax range for the primary bottle.
  const bottleY = useTransform(scrollYProgress, [0, 1], ["14%", "-14%"]);

  // Resolve the primary image: editor override → wine's gallery default → legacy image.
  const primaryImage =
    config.featuredImage?.trim() || wineDefaultImage(wine);

  return (
    <section
      ref={ref}
      id="featured"
      data-theme="dark"
      className="relative overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--color-ink-950)] px-6 py-32 md:px-10 md:py-44"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,_rgba(185,72,60,0.16)_0%,_transparent_60%)]" />

      <div className="relative mx-auto grid max-w-[1480px] items-center gap-16 md:grid-cols-12">
        {/* ── Copy column ───────────────────────────────────── */}
        <div className="md:col-span-6 md:col-start-1">
          <Reveal y={12} className="mb-8">
            <div className="flex items-center gap-4">
              <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
              <span className="label-eyebrow text-[var(--color-bone-400)]">
                {config.featuredEyebrow || "Flagship release"}
              </span>
            </div>
          </Reveal>

          <h2 className="font-display text-[clamp(2.6rem,6vw,5.5rem)] font-light leading-[1] tracking-[-0.015em] text-[var(--color-bone-50)]">
            <RevealLines
              text={config.featuredHeading || wine?.name || "Lemberg Louis"}
              italicLines={[0]}
              className="italic text-[var(--color-pearl-300)]"
            />
          </h2>

          <div className="mt-8 grid max-w-md grid-cols-3 gap-6 border-y border-[var(--border-subtle)] py-6">
            <div>
              <span className="label-eyebrow text-[var(--color-bone-500)]">Varietal</span>
              <p className="mt-2 text-sm text-[var(--color-bone-200)]">{wine?.varietal || "—"}</p>
            </div>
            <div>
              <span className="label-eyebrow text-[var(--color-bone-500)]">Vintage</span>
              <p className="mt-2 text-sm text-[var(--color-bone-200)]">{wine?.vintage || "—"}</p>
            </div>
            <div>
              <span className="label-eyebrow text-[var(--color-bone-500)]">Category</span>
              <p className="mt-2 text-sm text-[var(--color-bone-200)]">
                {wine?.category || wine?.alcohol || "—"}
              </p>
            </div>
          </div>

          <Reveal y={16} delay={0.2} className="mt-10 max-w-md">
            <p className="body-editorial">{config.featuredBody}</p>
          </Reveal>

          {wine?.tastingNotes && (
            <Reveal y={16} delay={0.28} className="mt-10 max-w-md">
              <span className="label-eyebrow text-[var(--color-bone-500)]">Tasting notes</span>
              <p className="mt-3 font-display italic text-xl leading-snug text-[var(--color-bone-100)]">
                “{wine.tastingNotes}”
              </p>
            </Reveal>
          )}

          <Reveal y={16} delay={0.35} className="mt-10 flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => wine && onOpenWine?.(wine)}
              disabled={!wine}
              className="group inline-flex items-center gap-4 border border-[var(--color-bone-300)]/40 px-8 py-3.5 text-[var(--color-bone-100)] transition-colors hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="label-meta">Reserve a bottle</span>
              <svg width="20" height="8" viewBox="0 0 20 8" fill="none" aria-hidden>
                <path
                  d="M1 4h17m0 0L15 1m3 3l-3 3"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="transition-transform duration-500 group-hover:translate-x-1"
                />
              </svg>
            </button>
            {wine?.price && (
              <span className="font-display text-2xl italic text-[var(--color-pearl-300)]">
                {currencySymbol(config.currency)}{wine.price.toFixed(0)}
              </span>
            )}
          </Reveal>
        </div>

        {/* ── Bento gallery column ──────────────────────────── */}
        <div className="md:col-span-5 md:col-start-8">
          <BentoGallery
            layout={resolveBentoLayout(config.featuredBentoLayout)}
            primarySrc={primaryImage}
            primaryAlt={wine?.name || "Featured wine"}
            primaryY={bottleY}
            accent1Src={config.featuredImageAccent1}
            accent1Caption={config.featuredImageAccent1Caption}
            accent2Src={config.featuredImageAccent2}
            accent2Caption={config.featuredImageAccent2Caption}
          />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Bento gallery — 4 layout variants
 *
 *   stack-right (default)  Primary 3×2 left  | Accent1 2×1 top-right
 *                                            | Accent2 2×1 bottom-right
 *   stack-left             Accent1 2×1 left  | Primary 3×2 right
 *                          Accent2 2×1 left
 *   top-hero               Primary 5×1 spans full width on top
 *                          Accent1 + Accent2 below side-by-side (each 5×1 / 2)
 *   tri-equal              Three equal columns: Accent1 | Primary | Accent2
 *
 * Each variant returns a record of class strings — the grid parent + the
 * three slots. We don't try to share renderers because every layout has
 * its own ideal aspect ratio.
 * ─────────────────────────────────────────────────────────────────── */

type BentoLayout = "stack-right" | "stack-left" | "top-hero" | "tri-equal";
const KNOWN_BENTO_LAYOUTS: ReadonlySet<BentoLayout> = new Set([
  "stack-right",
  "stack-left",
  "top-hero",
  "tri-equal",
]);

function resolveBentoLayout(raw: string | undefined): BentoLayout {
  if (raw && (KNOWN_BENTO_LAYOUTS as Set<string>).has(raw)) return raw as BentoLayout;
  return "stack-right";
}

interface BentoPlacement {
  parent: string;
  primary: string;
  primaryAspect: string;  // applied below md when wrapper grid collapses
  accentWrapper: string;  // mobile wrapper (md:contents to dissolve at md+)
  accent1: string;
  accent2: string;
}

const BENTO_LAYOUTS: Record<BentoLayout, BentoPlacement> = {
  "stack-right": {
    parent: "grid gap-3 md:grid-cols-5 md:grid-rows-2 md:gap-4 md:aspect-[5/6]",
    primary: "md:col-span-3 md:row-span-2 md:aspect-auto",
    primaryAspect: "aspect-[3/4]",
    accentWrapper: "grid grid-cols-2 gap-3 md:contents",
    accent1: "md:col-span-2 md:row-span-1 md:aspect-auto",
    accent2: "md:col-span-2 md:row-span-1 md:aspect-auto",
  },
  "stack-left": {
    parent: "grid gap-3 md:grid-cols-5 md:grid-rows-2 md:gap-4 md:aspect-[5/6]",
    primary: "md:col-start-3 md:col-span-3 md:row-span-2 md:row-start-1 md:aspect-auto",
    primaryAspect: "aspect-[3/4]",
    accentWrapper: "grid grid-cols-2 gap-3 md:contents",
    accent1: "md:col-start-1 md:col-span-2 md:row-start-1 md:row-span-1 md:aspect-auto",
    accent2: "md:col-start-1 md:col-span-2 md:row-start-2 md:row-span-1 md:aspect-auto",
  },
  "top-hero": {
    parent: "grid gap-3 md:grid-cols-2 md:gap-4",
    primary: "md:col-span-2 md:aspect-[16/9]",
    primaryAspect: "aspect-[16/10]",
    accentWrapper: "grid grid-cols-2 gap-3 md:contents",
    accent1: "md:col-span-1 md:aspect-square",
    accent2: "md:col-span-1 md:aspect-square",
  },
  "tri-equal": {
    parent: "grid gap-3 md:grid-cols-3 md:gap-4",
    primary: "md:col-start-2 md:col-span-1 md:row-start-1 md:aspect-[3/4]",
    primaryAspect: "aspect-[3/4]",
    accentWrapper: "grid grid-cols-2 gap-3 md:contents",
    accent1: "md:col-start-1 md:row-start-1 md:aspect-[3/4]",
    accent2: "md:col-start-3 md:row-start-1 md:aspect-[3/4]",
  },
};

interface BentoGalleryProps {
  layout: BentoLayout;
  primarySrc: string;
  primaryAlt: string;
  /** motion value for the bottle parallax y-offset */
  primaryY: any;
  accent1Src?: string;
  accent1Caption?: string;
  accent2Src?: string;
  accent2Caption?: string;
}

function BentoGallery({
  layout,
  primarySrc,
  primaryAlt,
  primaryY,
  accent1Src,
  accent1Caption,
  accent2Src,
  accent2Caption,
}: BentoGalleryProps) {
  const p = BENTO_LAYOUTS[layout];
  return (
    <div className={p.parent} role="group" aria-label="Featured wine gallery">
      <PrimarySlot
        src={primarySrc}
        alt={primaryAlt}
        y={primaryY}
        placement={p.primary}
        mobileAspect={p.primaryAspect}
      />

      {/* On mobile, the two accents pack into a 2-col inner grid; at md+
          `md:contents` dissolves the wrapper so accents join the parent
          grid and pick up their per-layout placement classes. */}
      <div className={p.accentWrapper}>
        <AccentSlot
          src={accent1Src}
          alt="Featured detail one"
          caption={accent1Caption}
          delay={0.15}
          placement={p.accent1}
        />
        <AccentSlot
          src={accent2Src}
          alt="Featured detail two"
          caption={accent2Caption}
          delay={0.25}
          placement={p.accent2}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

interface PrimarySlotProps {
  src: string;
  alt: string;
  y: any;
  placement: string;
  mobileAspect: string;
}

function PrimarySlot({ src, alt, y, placement, mobileAspect }: PrimarySlotProps) {
  const [loaded, setLoaded] = useState(false);
  const hasSrc = Boolean(src && src.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        !loaded && hasSrc && "animate-pulse",
        mobileAspect,
        placement
      )}
    >
      {/* Iridescent radial glow behind the bottle */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,196,187,0.12)_0%,_transparent_70%)]" />

      {hasSrc ? (
        <motion.img
          src={resolveAsset(src)}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{ y }}
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 h-[88%] w-[88%] object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)]"
        />
      ) : (
        <EmptyMark />
      )}

      {/* Floor shadow puddle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 bottom-6 z-0 h-10 rounded-[50%] bg-[rgba(0,0,0,0.55)] blur-2xl"
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

interface AccentSlotProps {
  src?: string;
  alt: string;
  caption?: string;
  delay?: number;
  placement: string;
}

function AccentSlot({
  src,
  alt,
  caption,
  delay = 0,
  placement,
}: AccentSlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const [loaded, setLoaded] = useState(false);
  const hasSrc = Boolean(src && src.trim());

  return (
    <div
      ref={ref}
      className={cn(
        "group relative overflow-hidden border border-[var(--border-subtle)] bg-[var(--color-ink-850)] aspect-square",
        !loaded && hasSrc && "animate-pulse",
        placement
      )}
    >
      {hasSrc ? (
        <motion.div
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={inView ? { clipPath: "inset(0 0% 0 0)" } : {}}
          transition={{ duration: 1.3, ease: [0.65, 0, 0.35, 1], delay }}
          className="absolute inset-0"
        >
          <motion.img
            src={resolveAsset(src!)}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            initial={{ scale: 1.08, opacity: 0 }}
            whileInView={{
              scale: 1.0,
              opacity: loaded ? 1 : 0,
            }}
            transition={{
              scale: { duration: 1.4, ease: [0.22, 1, 0.36, 1], delay },
              opacity: { duration: 0.5 },
            }}
            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
        </motion.div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--color-bone-500)]">
          <ImageOff size={20} className="opacity-60" />
          <span className="label-eyebrow opacity-70">No image set</span>
        </div>
      )}

      {/* Bottom gradient + caption */}
      {caption && hasSrc && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgba(7,7,10,0.7)] via-[rgba(7,7,10,0.25)] to-transparent" />
          <span className="absolute bottom-3 left-4 label-eyebrow text-[var(--color-bone-100)]">
            {caption}
          </span>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function EmptyMark() {
  return (
    <div className="relative z-10 flex flex-col items-center gap-2 text-[var(--color-bone-500)]">
      <ImageOff size={22} className="opacity-60" />
      <span className="label-eyebrow opacity-70">No bottle image set</span>
    </div>
  );
}
