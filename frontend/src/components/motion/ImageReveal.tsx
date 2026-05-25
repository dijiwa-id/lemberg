import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "../../lib/utils";

interface ImageRevealProps {
  src: string;
  alt: string;
  className?: string;
  aspectClass?: string;
  parallax?: boolean;
  priority?: boolean;
  delay?: number;
}

/**
 * Editorial image with mask-wipe entrance + optional parallax inside its frame.
 *
 * The wipe is driven by `useInView` on the static parent (not the animated
 * child). The earlier version observed the clipped child directly via
 * `whileInView` — combined with the aggressive `margin: "-80px"` rootMargin,
 * the IntersectionObserver could fail to fire on some scroll patterns and the
 * image would stay clipped to invisibility (the Experience section was hit
 * hardest by this on first paint). Observing the parent fixes it.
 *
 * Also: empty `src` and image-load errors now render a quiet placeholder
 * instead of a broken-image icon.
 */
export function ImageReveal({
  src,
  alt,
  className = "",
  aspectClass = "aspect-[4/5]",
  parallax = true,
  priority = false,
  delay = 0,
}: ImageRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 1.02]);

  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const hasSrc = Boolean(src && src.trim());

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden bg-[var(--color-ink-850)]",
        !loaded && !errored && hasSrc && "animate-pulse",
        aspectClass,
        className
      )}
    >
      {hasSrc && !errored ? (
        <motion.div
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={
            inView
              ? { clipPath: "inset(0 0% 0 0)" }
              : { clipPath: "inset(0 100% 0 0)" }
          }
          transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1], delay }}
          className="absolute inset-0 will-change-transform"
        >
          <motion.img
            src={src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: loaded ? 1 : 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={parallax ? { y, scale } : undefined}
            className="h-full w-full object-cover"
          />
        </motion.div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--color-bone-500)]">
          <ImageOff size={22} className="opacity-60" />
          <span className="label-eyebrow opacity-70">
            {errored ? "Image unavailable" : "No image set"}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(7,7,10,0.25)]" />
    </div>
  );
}
