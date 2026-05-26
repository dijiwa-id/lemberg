import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SiteConfig, Wine, FeaturedSlide } from "../../lib/types";
import { 
  currencySymbol, 
  wineDefaultImage, 
  configFlag, 
  parseFeaturedSlides,
  isRenderableFeaturedSlide
} from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { RevealLines } from "../motion/Reveal";
import { cn } from "../../lib/utils";

interface FeaturedWineProps {
  config: SiteConfig;
  wines: Wine[];
  onOpenWine?: (wine: Wine) => void;
}

function cleanHTML(html: string | undefined | null): string {
  if (!html) return "";
  const cleaned = html.replace(/<p><br><\/p>|<p><\/p>/gi, "").trim();
  return cleaned;
}

export function FeaturedWine({ config, wines, onOpenWine }: FeaturedWineProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = useMemo(() => {
    const enabled = configFlag(config.featuredSliderEnabled, true);
    const parsed = parseFeaturedSlides(config.featuredSlides);
    const renderable = parsed.filter(isRenderableFeaturedSlide);

    if (!enabled || renderable.length === 0) {
      return wines.slice(0, 3).map(w => ({
        wineId: w.id,
        heading: w.name,
        subtitle: w.category,
        body: w.description,
        image: w.heroImage || wineDefaultImage(w),
      })) as FeaturedSlide[];
    }
    return renderable;
  }, [config.featuredSlides, config.featuredSliderEnabled, wines]);

  const activeSlide = slides[activeIndex];
  const linkedWine = wines.find(w => String(w.id) === String(activeSlide.wineId));

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay logic
  useEffect(() => {
    const enabled = configFlag(config.featuredSliderAutoplay, true);
    if (!enabled || slides.length <= 1) return;

    const interval = Number(config.featuredSliderInterval || 8000);
    const timer = setInterval(nextSlide, interval);
    return () => clearInterval(timer);
  }, [slides.length, config.featuredSliderAutoplay, config.featuredSliderInterval, nextSlide]);

  const heading = activeSlide.heading || config.featuredHeading || linkedWine?.name || "Lemberg Estate";
  const subtitle = activeSlide.subtitle || config.featuredSubtitle || linkedWine?.category || "Flagship Release";
  const cleanBody = cleanHTML(activeSlide.body || config.featuredBody || linkedWine?.description);
  
  const heroSrc = activeSlide.image || linkedWine?.heroImage || config.featuredImage || wineDefaultImage(linkedWine);
  const overlayOpacity = linkedWine?.overlayOpacity ?? Number(config.featuredOverlayOpacity || 0.1);
  const enableReflection = linkedWine?.enableReflection ?? configFlag(config.featuredEnableReflection, true);
  const enableBlur = linkedWine?.enableBlurEffect ?? configFlag(config.featuredEnableBlurEffect, false);

  return (
    <section
      id="featured"
      data-theme="dark"
      className="relative h-screen min-h-[600px] overflow-hidden bg-[var(--color-ink-950)] flex items-center"
    >
      {/* ── Side Controls (Hero style) ────────────────────── */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="group absolute left-4 md:left-8 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center border border-[var(--color-pearl-300)]/10 bg-black/10 text-[var(--color-bone-500)] backdrop-blur-sm transition-all hover:border-[var(--color-pearl-300)]/40 hover:text-[var(--color-pearl-300)]"
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} strokeWidth={1} />
          </button>
          <button
            onClick={nextSlide}
            className="group absolute right-4 md:right-8 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center border border-[var(--color-pearl-300)]/10 bg-black/10 text-[var(--color-bone-500)] backdrop-blur-sm transition-all hover:border-[var(--color-pearl-300)]/40 hover:text-[var(--color-pearl-300)]"
            aria-label="Next slide"
          >
            <ChevronRight size={18} strokeWidth={1} />
          </button>
        </>
      )}

      {/* ── BACKGROUND LAYER (Full bleed) ─────────────────── */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {heroSrc ? (
              <div className="relative h-full w-full overflow-hidden">
                <img
                  src={resolveAsset(heroSrc)}
                  alt={heading}
                  className={cn(
                    "h-full w-full object-cover object-right transition-all duration-[2000ms] ease-out",
                    enableBlur && "scale-110 blur-xl"
                  )}
                />
                
                {/* Cinematic Reflection Overlay */}
                {enableReflection && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[rgba(255,255,255,0.015)] to-transparent mix-blend-overlay pointer-events-none" />
                )}

                {/* Dark Base Overlay */}
                <div 
                  className="absolute inset-0 bg-[var(--color-ink-950)]" 
                  style={{ opacity: overlayOpacity * 0.5 }} // Further reduced base darkening
                />
                
                {/* Sophisticated Multi-Stage Gradient for Text Readability - Even subtler */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-ink-950)_0%,rgba(10,10,12,0.7)_20%,rgba(10,10,12,0.2)_40%,transparent_75%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-ink-950)_0%,transparent_20%)] opacity-40" />
                <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[var(--color-ink-950)]/30 to-transparent z-1" />
              </div>
            ) : (
              <div className="h-full w-full bg-[var(--color-ink-900)]" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── CONTENT LAYER ─────────────────────────────────── */}
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-12 py-8 md:px-20 lg:px-28">
        <div className="flex flex-col h-full justify-center min-h-[450px] lg:min-h-[550px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col w-full"
            >
              <div className="max-w-screen-md lg:max-w-screen-lg">
                {/* Eyebrow */}
                <div className="mb-4 md:mb-6 flex items-center gap-4">
                  <motion.span 
                    initial={{ width: 0 }}
                    animate={{ width: 30 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="block h-px bg-[var(--color-pearl-300)]/40" 
                  />
                  <span className="label-eyebrow text-[var(--color-pearl-300)] uppercase tracking-[0.4em] text-[8px] md:text-[9px] font-semibold">
                    {activeSlide.eyebrow || config.featuredEyebrow || "Selected Release"}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div className="space-y-2 md:space-y-3">
                  <h2 className="font-display text-[clamp(1.8rem,6vw,4rem)] font-extralight leading-[1.05] tracking-tighter text-[var(--color-bone-50)]">
                    <RevealLines text={heading} italicLines={[1]} />
                  </h2>
                  <p className="font-display text-sm md:text-lg italic font-light tracking-wider text-[var(--color-bone-400)]/70 max-w-lg">
                    {subtitle}
                  </p>
                </div>

                {/* Description Area */}
                {cleanBody && (
                  <div className="mt-4 md:mt-6 max-w-lg md:max-w-xl">
                    <div
                      className="body-editorial text-xs md:text-base leading-relaxed text-[var(--color-bone-300)]/70 font-light"
                      dangerouslySetInnerHTML={{ __html: cleanBody }}
                    />
                  </div>
                )}

                {/* Metadata Grid (Minimalist) */}
                {linkedWine && (
                  <div className="mt-6 md:mt-8 flex flex-wrap gap-x-8 md:gap-x-12 gap-y-4">
                    <MetaItem label="Varietal" value={linkedWine.varietal} />
                    <MetaItem label="Vintage" value={linkedWine.vintage} />
                    <MetaItem label="Region" value={linkedWine.region || "Tulbagh Valley"} />
                  </div>
                )}

                {/* CTA Area */}
                <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-5 md:gap-8">
                  <button
                    type="button"
                    onClick={() => linkedWine && onOpenWine?.(linkedWine)}
                    className="group relative flex items-center gap-6 overflow-hidden border border-[var(--color-pearl-300)]/20 px-6 md:px-9 py-3 md:py-4 text-[var(--color-bone-50)] transition-all hover:border-[var(--color-pearl-300)]/40 hover:bg-white/[0.03] backdrop-blur-xl"
                  >
                    <span className="label-meta text-[8px] md:text-[10px] uppercase tracking-[0.3em] font-bold">
                      {activeSlide.ctaPrimary || config.featuredCtaPrimary || "Reserve a bottle"}
                    </span>
                    <div className="relative flex items-center">
                      <div className="h-px w-4 bg-[var(--color-pearl-300)]/30 transition-all duration-700 group-hover:w-8 group-hover:bg-[var(--color-pearl-300)]" />
                      <ChevronRight size={12} className="text-[var(--color-pearl-300)]/40 transition-transform duration-700 group-hover:translate-x-1 group-hover:text-[var(--color-pearl-300)]" />
                    </div>
                  </button>
                  
                  {(activeSlide.ctaSecondary || config.featuredCtaSecondary) && (
                    <a
                      href="#collection"
                      className="label-meta text-[8px] md:text-[10px] uppercase tracking-[0.3em] text-[var(--color-bone-500)] transition-all hover:text-[var(--color-pearl-300)] group flex items-center gap-3"
                    >
                      <span className="relative">
                        {activeSlide.ctaSecondary || config.featuredCtaSecondary}
                        <span className="absolute -bottom-1 left-0 h-px w-0 bg-[var(--color-pearl-300)] transition-all duration-500 group-hover:w-full" />
                      </span>
                    </a>
                  )}

                  {linkedWine?.price && (
                    <div className="hidden sm:flex ml-auto flex-col items-end opacity-90">
                      <span className="label-eyebrow text-[7px] text-[var(--color-bone-500)] mb-0.5 uppercase tracking-[0.2em]">Estate Price</span>
                      <span className="font-display text-2xl md:text-4xl font-extralight italic text-[var(--color-pearl-300)]/90">
                        {currencySymbol(config.currency)}
                        {linkedWine.price.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom Pagination (Subtle Dots) */}
          {slides.length > 1 && (
            <div className="mt-10 md:mt-12 flex items-center gap-8">
              <div className="flex items-center gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className="group relative flex h-6 items-center px-1"
                    aria-label={`Go to slide ${idx + 1}`}
                  >
                    <div className={cn(
                      "h-px transition-all duration-700 rounded-full",
                      activeIndex === idx 
                        ? "w-8 bg-[var(--color-pearl-300)]" 
                        : "w-4 bg-[var(--color-bone-900)] group-hover:bg-[var(--color-bone-700)]"
                    )} />
                    <span className={cn(
                      "absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[7px] transition-opacity duration-500",
                      activeIndex === idx ? "opacity-100 text-[var(--color-pearl-300)]" : "opacity-0"
                    )}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </button>
                ))}
              </div>
              
              <div className="hidden md:block">
                <span className="font-mono text-[8px] tracking-[0.2em] text-[var(--color-bone-600)]">
                  {String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MetaItem({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 min-w-[100px]">
      <span className="label-eyebrow text-[9px] uppercase tracking-[0.2em] text-[var(--color-bone-500)] font-semibold">
        {label}
      </span>
      <p className="font-display text-lg md:text-xl text-[var(--color-bone-200)] font-light tracking-wide">
        {value}
      </p>
    </div>
  );
}
