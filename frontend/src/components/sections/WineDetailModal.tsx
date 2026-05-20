import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { X, ImageOff } from "lucide-react";
import type { SiteConfig, Wine } from "../../lib/types";
import { currencySymbol, wineGallery } from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { statusLabel, statusToTone } from "../admin/Badge";
import { cn } from "../../lib/utils";

interface WineDetailModalProps {
  wine: Wine | null;
  config: SiteConfig;
  onClose: () => void;
}

/**
 * Editorial detail overlay for a single wine. Replaces the previously dead
 * `#wine-{slug}` anchor links on Collection cards and the Featured "Reserve"
 * button. Lock body scroll while open, close on Escape / overlay click /
 * close button. Reserve-a-bottle CTA navigates to the reservation form with
 * the wine pre-selected via query string.
 */
export function WineDetailModal({ wine, config, onClose }: WineDetailModalProps) {
  const gallery = wineGallery(wine);
  const [activeIdx, setActiveIdx] = useState(0);

  // Whenever a new wine is opened, snap back to the first image.
  useEffect(() => {
    setActiveIdx(0);
  }, [wine?.id]);

  // Body-scroll lock + Escape-to-close, scoped to whenever the modal is open.
  useEffect(() => {
    if (!wine) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [wine, onClose]);

  const activeImage = gallery[activeIdx] || gallery[0] || "";

  return (
    <AnimatePresence>
      {wine && (
        <motion.div
          key="wine-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[150] flex items-stretch justify-center bg-[rgba(7,7,10,0.78)] backdrop-blur-md md:items-center md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wine-modal-heading"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex w-full max-w-[1100px] flex-col overflow-hidden bg-[var(--color-ink-900)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)] md:max-h-[88vh] md:flex-row"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center border border-[var(--border-subtle)] bg-[var(--color-ink-900)]/85 text-[var(--color-bone-300)] backdrop-blur-md transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
            >
              <X size={16} />
            </button>

            {/* Image column */}
            <div className="relative flex aspect-[4/5] w-full shrink-0 flex-col overflow-hidden bg-[var(--color-ink-850)] md:aspect-auto md:w-1/2">
              <div className="relative flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeImage ? (
                    <motion.img
                      key={activeImage}
                      src={resolveAsset(activeImage)}
                      alt={wine.name}
                      loading="lazy"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--color-bone-500)]">
                      <ImageOff size={28} />
                      <span className="label-eyebrow opacity-70">No image</span>
                    </div>
                  )}
                </AnimatePresence>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,7,10,0.55)] via-transparent to-transparent" />
                {gallery.length > 1 && (
                  <span className="absolute right-5 top-5 border border-[var(--border-subtle)] bg-[var(--color-ink-950)]/70 px-2 py-1 font-mono text-[10px] text-[var(--color-bone-200)] backdrop-blur">
                    {activeIdx + 1} / {gallery.length}
                  </span>
                )}
              </div>

              {/* Thumbnail strip — only when more than one image */}
              {gallery.length > 1 && (
                <div className="flex shrink-0 gap-2 border-t border-[var(--border-subtle)] bg-[var(--color-ink-950)]/60 p-3 backdrop-blur">
                  {gallery.map((src, idx) => (
                    <button
                      key={`${src}-${idx}`}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      aria-label={`Show image ${idx + 1} of ${gallery.length}`}
                      aria-pressed={idx === activeIdx}
                      className={cn(
                        "h-14 w-14 shrink-0 overflow-hidden border transition-colors",
                        idx === activeIdx
                          ? "border-[var(--color-pearl-300)]"
                          : "border-[var(--border-subtle)] hover:border-[var(--color-bone-400)]"
                      )}
                    >
                      <img
                        src={resolveAsset(src)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content column */}
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-7 md:p-10">
              {/*
                Spec line — varietal + availability status. Status was
                previously duplicated (image overlay + a pill below the CTA);
                consolidating it here pairs the wine's identity with its
                availability at a glance, the way an editorial product page
                usually presents it.
              */}
              <div className="flex flex-wrap items-center gap-3">
                {wine.varietal && (
                  <span className="label-eyebrow text-[var(--color-bone-500)]">
                    {wine.varietal}
                  </span>
                )}
                {wine.varietal && (
                  <span className="block h-1 w-1 rounded-full bg-[var(--color-bone-600)]" />
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 border px-2.5 py-1 label-eyebrow",
                    `badge-${statusToTone(wine.status)}`
                  )}
                >
                  {statusLabel(wine.status)}
                </span>
              </div>

              <div className="mt-3 flex items-start justify-between gap-6">
                <h2
                  id="wine-modal-heading"
                  className="min-w-0 font-display text-[clamp(2rem,4.4vw,3.5rem)] font-light leading-[1.02] tracking-[-0.015em] text-[var(--color-bone-50)]"
                >
                  {wine.name}
                </h2>
                {wine.vintage && (
                  <span className="font-display text-2xl italic text-[var(--color-pearl-300)] shrink-0">
                    {wine.vintage}
                  </span>
                )}
              </div>

              {/* Meta row */}
              <dl className="mt-8 grid grid-cols-3 gap-6 border-y border-[var(--border-subtle)] py-5">
                <Meta label="Region" value={wine.region} />
                <Meta label="Category" value={wine.category || wine.alcohol} />
                <Meta
                  label="Price"
                  value={
                    wine.price
                      ? `${currencySymbol(config.currency)}${wine.price.toFixed(0)}`
                      : undefined
                  }
                />
              </dl>

              {wine.description && (
                <p className="mt-7 body-editorial !text-[14.5px] text-[var(--color-bone-300)]">
                  {wine.description}
                </p>
              )}

              {wine.tastingNotes && (
                <div className="mt-7">
                  <span className="label-eyebrow text-[var(--color-bone-500)]">
                    Tasting notes
                  </span>
                  <p className="mt-3 font-display italic text-xl leading-snug text-[var(--color-bone-100)]">
                    “{wine.tastingNotes}”
                  </p>
                </div>
              )}

              {wine.foodPairing && (
                <div className="mt-5">
                  <span className="label-eyebrow text-[var(--color-bone-500)]">
                    Food pairing
                  </span>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-bone-200)]">
                    {wine.foodPairing}
                  </p>
                </div>
              )}

              <div className="mt-auto pt-10">
                {/* Suppress allocated/sold-out reservation CTA */}
                {wine.status === "sold-out" ? (
                  <div className="border border-[var(--border-default)] bg-[var(--color-ink-850)] px-5 py-4 text-sm text-[var(--color-bone-300)]">
                    This vintage is sold out. Join the allocation list below to
                    secure the next release.
                  </div>
                ) : (
                  <Link
                    to={`/reservation?wine=${encodeURIComponent(
                      wine.slug || String(wine.id)
                    )}`}
                    onClick={onClose}
                    className="group inline-flex w-full items-center justify-center gap-4 bg-[var(--color-bone-50)] px-7 py-3.5 text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)] sm:w-auto"
                  >
                    <span className="label-meta">
                      {wine.status === "allocated"
                        ? "Request allocation"
                        : "Reserve a tasting"}
                    </span>
                    <svg width="20" height="8" viewBox="0 0 20 8" fill="none" aria-hidden>
                      <path
                        d="M1 4h17m0 0L15 1m3 3l-3 3"
                        stroke="currentColor"
                        strokeWidth="1"
                        className="transition-transform duration-500 group-hover:translate-x-1"
                      />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="label-eyebrow text-[var(--color-bone-500)]">{label}</dt>
      <dd className="mt-2 text-sm text-[var(--color-bone-200)]">{value || "—"}</dd>
    </div>
  );
}
