import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionProps,
  type Variants,
} from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SiteConfig, HeroSlide } from "../../lib/types";
import { isRenderableSlide, parseHeroSlides, resolveSlideContent } from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { RevealLines, Reveal } from "../motion/Reveal";
import { cn } from "../../lib/utils";

/* ─────────────────────────────────────────────────────────────────────
 * Hero section
 *
 * Two render paths:
 *   1. No slides defined (`heroSlides` empty)  → legacy single-image hero
 *      with the existing parallax scroll + bottom-left text composition.
 *      Keeps the public site stable for any deployment that hasn't
 *      configured a slider yet.
 *   2. One or more slides defined              → HeroSlider with the
 *      editor's chosen layout + animation.
 *
 * Layout × animation are independent axes:
 *   layout      = composition of image + text (4 variants)
 *   animation   = how slides transition (4 variants)
 *
 * Both axes resolve through a safe fallback so an unknown config value
 * never crashes the public page — it just renders the default.
 * ─────────────────────────────────────────────────────────────────── */

type HeroLayout = "fullscreen-center" | "split-left" | "split-right" | "caption-bottom";
type SliderAnimation = "fade" | "slide" | "kenburns" | "stack";

const KNOWN_LAYOUTS: ReadonlySet<HeroLayout> = new Set([
  "fullscreen-center",
  "split-left",
  "split-right",
  "caption-bottom",
]);
const KNOWN_ANIMATIONS: ReadonlySet<SliderAnimation> = new Set([
  "fade",
  "slide",
  "kenburns",
  "stack",
]);

function resolveLayout(raw: string | undefined): HeroLayout {
  if (raw && (KNOWN_LAYOUTS as Set<string>).has(raw)) return raw as HeroLayout;
  return "fullscreen-center";
}
function resolveAnimation(raw: string | undefined): SliderAnimation {
  if (raw && (KNOWN_ANIMATIONS as Set<string>).has(raw)) return raw as SliderAnimation;
  return "fade";
}
function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === null || raw === "") return fallback;
  return raw === "true" || raw === "1" || raw === "on";
}
function parseInterval(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1500) return 6000;
  return Math.min(n, 30_000);  // clamp upper bound — no 5-minute autoplays
}

interface HeroProps {
  config: SiteConfig;
}

export function Hero({ config }: HeroProps) {
  // Two filters between config and render:
  //   1. parseHeroSlides keeps draft (image-less) slides so the admin can
  //      author across multiple sessions; the section drops them via
  //      `isRenderableSlide`.
  //   2. `heroSliderEnabled` is the master switch — when false, the slider
  //      never renders even if renderable slides exist. Lets editors stage
  //      slides without going live, or roll back to single-image in one
  //      click without losing draft work.
  const renderable = useMemo(
    () => parseHeroSlides(config.heroSlides).filter(isRenderableSlide),
    [config.heroSlides]
  );
  const sliderEnabled = parseBool(config.heroSliderEnabled, true);

  if (!sliderEnabled || renderable.length === 0) {
    return <SingleHero config={config} />;
  }
  return <HeroSlider config={config} slides={renderable} />;
}

/* ─────────────────────────────────────────────────────────────────────
 * Legacy single-image hero (fallback path)
 * ─────────────────────────────────────────────────────────────────── */

function SingleHero({ config }: { config: SiteConfig }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.16]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      id="top"
      data-theme="dark"
      className="relative h-[100svh] min-h-[680px] w-full overflow-hidden bg-[var(--color-ink-950)]"
    >
      <motion.div className="absolute inset-0" style={{ y: imgY, scale: imgScale }}>
        <img
          src={resolveAsset(config.heroBackgroundImage)}
          alt="Lemberg Winery Landscape"
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(7,7,10,0.55)] via-[rgba(7,7,10,0.35)] to-[var(--color-ink-900)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(7,7,10,0.6)_100%)]" />
      </motion.div>

      <div className="relative z-10 mx-auto flex h-full max-w-[1480px] flex-col justify-between px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 md:px-10 md:pt-40 md:pb-28">
        <Reveal y={12} delay={0.35}>
          <div className="flex items-center gap-4">
            <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
            <span className="label-eyebrow text-[var(--color-pearl-300)]">
              {config.heroEyebrow || "Tulbagh Valley · South Africa"}
            </span>
          </div>
        </Reveal>

        <motion.div style={{ y: textY, opacity: textOpacity }} className="max-w-[920px]">
          <h1 className="font-display text-[clamp(2rem,4.8vw,4.25rem)] font-light leading-[1.05] tracking-[-0.015em] text-[var(--color-bone-50)]">
            <RevealLines text={config.heroHeading || ""} delay={0.25} perLineStagger={0.14} />
            {config.heroHeadingItalic && (
              <span className="block overflow-hidden">
                <motion.span
                  initial={{ y: "115%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
                  className="block italic text-[var(--color-pearl-300)]"
                >
                  {config.heroHeadingItalic}
                </motion.span>
              </span>
            )}
          </h1>
          <Reveal y={16} delay={0.85} className="mt-8 max-w-md sm:mt-10">
            <p className="body-editorial text-[var(--color-bone-300)]">{config.heroSubheading}</p>
          </Reveal>
          <Reveal y={16} delay={1} className="mt-8 sm:mt-10">
            <a
              href="#collection"
              className="group inline-flex items-center gap-5 border border-[var(--color-bone-300)]/50 px-7 py-3.5 text-[var(--color-bone-100)] transition-all duration-500 hover:gap-7 hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)] sm:px-9 sm:py-4"
            >
              <span className="label-meta">{config.heroCta || "View the collection"}</span>
              <Arrow />
            </a>
          </Reveal>
        </motion.div>
      </div>

      <HairlineTrim />
      <ScrollCue />
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Slider — state machine + per-slide rendering
 * ─────────────────────────────────────────────────────────────────── */

function HeroSlider({ config, slides }: { config: SiteConfig; slides: HeroSlide[] }) {
  const layout = resolveLayout(config.heroLayout);
  const animation = resolveAnimation(config.heroSliderAnimation);
  const autoplay = parseBool(config.heroSliderAutoplay, true);
  const interval = parseInterval(config.heroSliderInterval);
  const reduced = useReducedMotion() ?? false;

  const [index, setIndex] = useState(0);
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const total = slides.length;

  const goto = useCallback(
    (next: number) => {
      // Normalise into [0, total) and pick a direction so animations know
      // which way to slide. Wrap-around uses the shortest path heuristically.
      const normalised = ((next % total) + total) % total;
      setDirection(normalised === (indexRef.current + 1) % total ? 1 : normalised === (indexRef.current - 1 + total) % total ? -1 : 1);
      setIndex(normalised);
    },
    [total]
  );
  const next = useCallback(() => goto(indexRef.current + 1), [goto, total]);
  const prev = useCallback(() => goto(indexRef.current - 1), [goto, total]);

  // Autoplay — skipped when paused (hover/focus), when there's a single
  // slide, or when the user prefers reduced motion. Restarts on every
  // index change so manual navigation resets the timer.
  useEffect(() => {
    if (total < 2 || !autoplay || paused || reduced) return;
    const t = window.setTimeout(next, interval);
    return () => window.clearTimeout(t);
  }, [autoplay, paused, interval, index, total, next, reduced]);

  // Keyboard nav — global because the hero is always at the top of the
  // page; users tabbing through other sections won't accidentally trigger
  // it (focus lives elsewhere).
  useEffect(() => {
    if (total < 2) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      }
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, total]);

  // Pointer swipe — threshold 50px so a casual horizontal scroll doesn't
  // misfire as a swipe. Stored on a ref so we don't re-render on every
  // pointer move.
  const swipeStart = useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;  // mouse uses the buttons
    swipeStart.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (swipeStart.current === null) return;
    const dx = e.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
  };

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const slide = slides[index];
  const content = resolveSlideContent(slide, config);

  return (
    <section
      ref={sectionRef}
      id="top"
      data-theme="dark"
      className="relative h-[100svh] min-h-[680px] w-full overflow-hidden bg-[var(--color-ink-950)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      aria-roledescription="carousel"
      aria-label="Featured imagery"
    >
      <SlideStage
        slide={slide}
        content={content}
        layout={layout}
        animation={animation}
        index={index}
        direction={direction}
        interval={interval}
        textY={textY}
        textOpacity={textOpacity}
        reduced={reduced}
      />

      {total > 1 && (
        <>
          <SliderControls
            index={index}
            total={total}
            onPrev={prev}
            onNext={next}
            onSelect={(i) => goto(i)}
            layout={layout}
          />
        </>
      )}

      <HairlineTrim />
      {total === 1 && <ScrollCue />}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Slide stage — picks the per-layout composition
 * ─────────────────────────────────────────────────────────────────── */

interface SlideStageProps {
  slide: HeroSlide;
  content: ReturnType<typeof resolveSlideContent>;
  layout: HeroLayout;
  animation: SliderAnimation;
  index: number;
  direction: 1 | -1;
  interval: number;
  textY: any;
  textOpacity: any;
  reduced: boolean;
}

function SlideStage(props: SlideStageProps) {
  switch (props.layout) {
    case "split-left":
      return <SplitLayout {...props} side="left" />;
    case "split-right":
      return <SplitLayout {...props} side="right" />;
    case "caption-bottom":
      return <CaptionBottomLayout {...props} />;
    case "fullscreen-center":
    default:
      return <FullscreenLayout {...props} />;
  }
}

function FullscreenLayout({
  slide,
  content,
  animation,
  index,
  direction,
  interval,
  textY,
  textOpacity,
  reduced,
}: SlideStageProps) {
  return (
    <>
      {/* AnimatePresence inside SliderImage keys on `index` so the outer
          component MUST stay mounted across slide changes — don't add a
          `key` here or the exit animations disappear. */}
      <SliderImage
        slide={slide}
        animation={animation}
        index={index}
        direction={direction}
        interval={interval}
        reduced={reduced}
        className="absolute inset-0"
      />
      <Overlay />

      <div className="relative z-10 mx-auto flex h-full max-w-[1480px] flex-col justify-between px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 md:px-10 md:pt-40 md:pb-28">
        <Reveal y={12} delay={0.35}>
          <Eyebrow text={content.eyebrow} />
        </Reveal>

        <motion.div style={{ y: textY, opacity: textOpacity }} className="max-w-[920px]">
          <AnimatedText
            content={content}
            keyIndex={index}
            headingClassName="font-display text-[clamp(2rem,4.8vw,4.25rem)] font-light leading-[1.05] tracking-[-0.015em] text-[var(--color-bone-50)]"
          />
        </motion.div>
      </div>
    </>
  );
}

function SplitLayout({
  slide,
  content,
  animation,
  index,
  direction,
  interval,
  reduced,
  side,
}: SlideStageProps & { side: "left" | "right" }) {
  // Two stacked panels on desktop. Text panel sits flush against the
  // section edge so the editorial typography reads against a dark plate
  // rather than fighting the photograph behind it.
  return (
    <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2">
      {side === "left" ? (
        <>
          <TextPanel content={content} index={index} />
          <ImagePanel
            slide={slide}
            animation={animation}
            index={index}
            direction={direction}
            interval={interval}
            reduced={reduced}
          />
        </>
      ) : (
        <>
          <ImagePanel
            slide={slide}
            animation={animation}
            index={index}
            direction={direction}
            interval={interval}
            reduced={reduced}
          />
          <TextPanel content={content} index={index} />
        </>
      )}
    </div>
  );
}

function CaptionBottomLayout({
  slide,
  content,
  animation,
  index,
  direction,
  interval,
  reduced,
}: SlideStageProps) {
  return (
    <>
      <SliderImage
        slide={slide}
        animation={animation}
        index={index}
        direction={direction}
        interval={interval}
        reduced={reduced}
        className="absolute inset-0"
      />
      {/* Lighter overlay — the caption strip handles legibility */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(7,7,10,0.55)_100%)]" />

      {/* Top eyebrow */}
      <div className="absolute inset-x-0 top-0 z-10 px-6 pt-24 sm:pt-28 md:px-10 md:pt-40">
        <Reveal y={12} delay={0.35}>
          <Eyebrow text={content.eyebrow} />
        </Reveal>
      </div>

      {/* Bottom caption strip — dark plate, single line of headline + CTA */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-[var(--border-subtle)] bg-[rgba(7,7,10,0.78)] px-6 py-8 backdrop-blur-md md:px-10 md:py-10">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <motion.div
            key={`caption-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[920px]"
          >
            <h1 className="font-display text-[clamp(1.8rem,4vw,3.4rem)] font-light leading-[1.05] tracking-[-0.015em] text-[var(--color-bone-50)]">
              {content.heading}
              {content.headingItalic && (
                <span className="ml-2 italic text-[var(--color-pearl-300)]">
                  {content.headingItalic}
                </span>
              )}
            </h1>
            {content.subheading && (
              <p className="body-editorial mt-3 text-[var(--color-bone-300)] max-w-xl">
                {content.subheading}
              </p>
            )}
          </motion.div>
          <CtaLink content={content} />
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function ImagePanel({
  slide,
  animation,
  index,
  direction,
  interval,
  reduced,
}: {
  slide: HeroSlide;
  animation: SliderAnimation;
  index: number;
  direction: 1 | -1;
  interval: number;
  reduced: boolean;
}) {
  return (
    <div className="relative h-[50vh] overflow-hidden md:h-auto">
      <SliderImage
        slide={slide}
        animation={animation}
        index={index}
        direction={direction}
        interval={interval}
        reduced={reduced}
        className="absolute inset-0"
      />
      {/* Soft inner shadow tying the image into the dark text panel */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(7,7,10,0.35),transparent_30%)]" />
    </div>
  );
}

function TextPanel({
  content,
  index,
}: {
  content: ReturnType<typeof resolveSlideContent>;
  index: number;
}) {
  return (
    <div className="relative flex items-center bg-[var(--color-ink-950)] px-6 py-16 md:px-12 md:py-24 lg:px-20">
      <div className="max-w-xl">
        <Eyebrow text={content.eyebrow} />
        <div className="mt-8">
          <AnimatedText
            content={content}
            keyIndex={index}
            headingClassName="font-display text-[clamp(1.9rem,3.6vw,3.6rem)] font-light leading-[1.08] tracking-[-0.015em] text-[var(--color-bone-50)]"
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Slider image — the part that actually animates between slides
 * ─────────────────────────────────────────────────────────────────── */

interface SliderImageProps {
  slide: HeroSlide;
  animation: SliderAnimation;
  index: number;
  direction: 1 | -1;
  interval: number;
  reduced: boolean;
  className?: string;
}

function SliderImage({
  slide,
  animation,
  index,
  direction,
  interval,
  reduced,
  className,
}: SliderImageProps) {
  // Only the first slide in the slider (index 0) gets high priority for LCP.
  // Note: this assumes the first slide is what the user sees first.
  const isPriority = index === 0;

  // Reduced-motion path — no transitions, just snap to the current slide.
  if (reduced) {
    return (
      <div className={className}>
        <img
          src={resolveAsset(slide.image)}
          alt=""
          loading={isPriority ? "eager" : "lazy"}
          fetchPriority={isPriority ? "high" : "auto"}
          decoding={isPriority ? "sync" : "async"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  // Ken Burns: continuous slow zoom over `interval` so the visible
  // movement matches how long the slide is on screen. Other animations
  // use a quick directional transition between slides.
  const intervalS = Math.max(2, interval / 1000);

  return (
    <div className={cn("overflow-hidden", className)}>
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.img
          key={`hero-${index}`}
          src={resolveAsset(slide.image)}
          alt=""
          loading={isPriority ? "eager" : "lazy"}
          fetchPriority={isPriority ? "high" : "auto"}
          decoding={isPriority ? "sync" : "async"}
          {...imageMotion(animation, direction, intervalS)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>
    </div>
  );
}

/** Per-animation motion props bundle. Each variant returns initial/animate/
 *  exit/transition tuned to the animation's character — extracted so the
 *  switch lives in one place and the renderer stays tight. */
function imageMotion(
  animation: SliderAnimation,
  direction: 1 | -1,
  intervalS: number
): MotionProps {
  switch (animation) {
    case "slide":
      return {
        initial: { x: direction > 0 ? "100%" : "-100%", opacity: 0.4 },
        animate: { x: 0, opacity: 1 },
        exit: { x: direction > 0 ? "-100%" : "100%", opacity: 0.4 },
        transition: { duration: 1.0, ease: [0.65, 0, 0.35, 1] },
      };
    case "kenburns":
      return {
        initial: { opacity: 0, scale: 1.0 },
        animate: { opacity: 1, scale: 1.08 },
        exit: { opacity: 0, scale: 1.1 },
        transition: {
          opacity: { duration: 1.0, ease: [0.22, 1, 0.36, 1] },
          scale: { duration: intervalS, ease: "linear" },
        },
      };
    case "stack":
      return {
        initial: { clipPath: "inset(0 0 100% 0)", opacity: 1 },
        animate: { clipPath: "inset(0 0 0% 0)", opacity: 1 },
        exit: { clipPath: "inset(100% 0 0 0)", opacity: 1 },
        transition: { duration: 1.1, ease: [0.65, 0, 0.35, 1] },
      };
    case "fade":
    default:
      return {
        initial: { opacity: 0, scale: 1.02 },
        animate: { opacity: 1, scale: 1.0 },
        exit: { opacity: 0, scale: 1.0 },
        transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
      };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Animated text — re-mounts on every slide change to retrigger reveals.
 * ─────────────────────────────────────────────────────────────────── */

interface AnimatedTextProps {
  content: ReturnType<typeof resolveSlideContent>;
  keyIndex: number;
  headingClassName: string;
}

const TEXT_PARENT_VARIANTS: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const TEXT_CHILD_VARIANTS: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

function AnimatedText({ content, keyIndex, headingClassName }: AnimatedTextProps) {
  return (
    <motion.div
      key={`text-${keyIndex}`}
      variants={TEXT_PARENT_VARIANTS}
      initial="initial"
      animate="animate"
    >
      <motion.h1 variants={TEXT_CHILD_VARIANTS} className={headingClassName}>
        {content.heading}
        {content.headingItalic && (
          <span className="block italic text-[var(--color-pearl-300)]">
            {content.headingItalic}
          </span>
        )}
      </motion.h1>

      {content.subheading && (
        <motion.p
          variants={TEXT_CHILD_VARIANTS}
          className="body-editorial mt-8 max-w-md text-[var(--color-bone-300)] sm:mt-10"
        >
          {content.subheading}
        </motion.p>
      )}

      <motion.div variants={TEXT_CHILD_VARIANTS} className="mt-8 sm:mt-10">
        <CtaLink content={content} />
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Small shared parts
 * ─────────────────────────────────────────────────────────────────── */

function Eyebrow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
      <span className="label-eyebrow text-[var(--color-pearl-300)]">{text}</span>
    </div>
  );
}

function CtaLink({ content }: { content: ReturnType<typeof resolveSlideContent> }) {
  return (
    <a
      href={content.ctaHref}
      className="group inline-flex items-center gap-5 border border-[var(--color-bone-300)]/50 px-7 py-3.5 text-[var(--color-bone-100)] transition-all duration-500 hover:gap-7 hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)] sm:px-9 sm:py-4"
    >
      <span className="label-meta">{content.ctaLabel}</span>
      <Arrow />
    </a>
  );
}

function Arrow() {
  return (
    <svg width="24" height="9" viewBox="0 0 24 9" fill="none" aria-hidden>
      <path
        d="M1 4.5h21m0 0L19 1m3 3.5l-3 3.5"
        stroke="currentColor"
        strokeWidth="1"
        className="transition-transform duration-500 group-hover:translate-x-1"
      />
    </svg>
  );
}

function Overlay() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(7,7,10,0.55)] via-[rgba(7,7,10,0.35)] to-[var(--color-ink-900)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(7,7,10,0.6)_100%)]" />
    </>
  );
}

function HairlineTrim() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-6 hidden w-px bg-gradient-to-b from-transparent via-[var(--border-subtle)] to-transparent md:left-10 md:block" />
      <div className="pointer-events-none absolute inset-y-0 right-6 hidden w-px bg-gradient-to-b from-transparent via-[var(--border-subtle)] to-transparent md:right-10 md:block" />
    </>
  );
}

function ScrollCue() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.4, duration: 1 }}
      className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3"
    >
      <span className="label-eyebrow text-[var(--color-bone-400)]">Scroll</span>
      <motion.span
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="block h-8 w-px bg-gradient-to-b from-[var(--color-pearl-300)] to-transparent"
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Slider controls — arrows + pagination dots
 *
 * Positioning differs by layout:
 *   - fullscreen / caption-bottom: bottom-right dots, side-edge arrows
 *   - split-left / split-right:    same; arrows + dots sit on the image
 *     panel side (caller positions the section, controls sit globally)
 * ─────────────────────────────────────────────────────────────────── */

interface SliderControlsProps {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (i: number) => void;
  layout: HeroLayout;
}

function SliderControls({ index, total, onPrev, onNext, onSelect, layout }: SliderControlsProps) {
  // For caption-bottom the caption strip sits at the bottom — push dots
  // above it. Other layouts get the standard bottom-center placement.
  const dotsPosition =
    layout === "caption-bottom"
      ? "bottom-[160px] sm:bottom-[180px] md:bottom-[200px]"
      : "bottom-10";

  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous slide"
        className="group absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center border border-[var(--border-default)] bg-[rgba(7,7,10,0.4)] p-3 text-[var(--color-bone-300)] backdrop-blur-sm transition-colors hover:border-[var(--color-pearl-300)] hover:text-[var(--color-pearl-300)] md:left-6 md:flex"
      >
        <ChevronLeft size={20} strokeWidth={1.25} />
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next slide"
        className="group absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center border border-[var(--border-default)] bg-[rgba(7,7,10,0.4)] p-3 text-[var(--color-bone-300)] backdrop-blur-sm transition-colors hover:border-[var(--color-pearl-300)] hover:text-[var(--color-pearl-300)] md:right-6 md:flex"
      >
        <ChevronRight size={20} strokeWidth={1.25} />
      </button>

      <div
        className={cn(
          "absolute left-1/2 z-20 -translate-x-1/2 flex items-center gap-2",
          dotsPosition
        )}
        role="tablist"
        aria-label="Slide pagination"
      >
        {Array.from({ length: total }).map((_, i) => {
          const active = i === index;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => onSelect(i)}
              className={cn(
                "h-[2px] transition-all duration-500",
                active
                  ? "w-10 bg-[var(--color-pearl-300)]"
                  : "w-6 bg-[var(--color-bone-300)]/35 hover:bg-[var(--color-bone-300)]/70"
              )}
            />
          );
        })}
      </div>

      {/* Slide counter — small subtle marker on the right edge */}
      <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 rotate-90 origin-right md:block md:right-3 lg:right-6">
        <span className="font-mono text-xs tracking-[0.32em] text-[var(--color-bone-400)]">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
    </>
  );
}
