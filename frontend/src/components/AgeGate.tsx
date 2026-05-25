import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useState } from "react";
import { Wine, ShieldCheck } from "lucide-react";
import { Monogram } from "./Monogram";
import type { SiteConfig } from "../lib/types";
import { resolveAsset } from "../services/api";
import { fontStack, useGoogleFont } from "../lib/useGoogleFont";
import {
  isConfirmationFresh,
  parseRememberDays,
  readAgeGateState,
  recordAgeGateConfirmation,
} from "../lib/ageGate";

/* ─────────────────────────────────────────────────────────────────────
 * Age verification gate
 *
 * Compliance pop-up for wine/alcohol sites. Renders nothing when:
 *   - `ageGateEnabled` is "false"
 *   - The visitor has a fresh confirmation in localStorage
 *   - We're inside the admin shell (the editor sees their preview
 *     unobstructed; their own first-visit confirmation also propagates
 *     to /admin/preview because localStorage is per-origin)
 *
 * Visitor flow:
 *   1. First page load → gate appears with editorial card + two CTAs
 *   2. "Yes" → confirmation stored; gate exits with smooth fade+scale
 *   3. "No" → in-place transition to a refusal panel; no confirmation
 *      stored (so they can come back next session)
 *
 * Animations are tuned to feel deliberate, not flashy — fade + 0.96→1
 * scale + 8px Y, staggered children. Reduced-motion users get a clean
 * fade only. Body scroll is locked while the gate is up.
 * ─────────────────────────────────────────────────────────────────── */

interface AgeGateProps {
  config: SiteConfig;
  /** When provided, forces the gate visible regardless of localStorage —
   *  used by the admin preview to demo the look. Skipped in normal flow. */
  forceOpen?: boolean;
}

/** Subset of brand identity used by the gate. Mirrors what the landing-page
 *  <Nav> consumes (logoImage / logoText / logoFont) so the brand mark in
 *  the gate looks identical to the one visitors see in the header. */
interface BrandInfo {
  image: string;
  text: string;
  font?: string;
}

export function AgeGate({ config, forceOpen }: AgeGateProps) {
  const enabled = (config.ageGateEnabled || "").toLowerCase() === "true";
  const isAdminRoute =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/admin");

  // Preload the editor's display font so the wordmark renders in the
  // chosen typeface from the first paint of the gate — matches what
  // visitors see in the landing-page <Nav>.
  useGoogleFont(config.logoFont ? [config.logoFont] : []);

  // Initial visibility is decided synchronously so we don't flash content
  // before deciding whether to gate. Guards against SSR by defaulting to
  // false when window is undefined.
  const [visible, setVisible] = useState<boolean>(() => {
    if (forceOpen) return true;
    if (typeof window === "undefined") return false;
    if (!enabled) return false;
    if (isAdminRoute) return false;
    const remember = parseRememberDays(config.ageGateRememberDays);
    return !isConfirmationFresh(readAgeGateState(), remember);
  });

  const [denied, setDenied] = useState(false);
  const reduced = useReducedMotion() ?? false;

  // Re-evaluate when the master toggle flips (rare in the wild — useful
  // for the admin preview which uses forceOpen). Also resync on config
  // changes that affect the decision.
  useEffect(() => {
    if (forceOpen) {
      setVisible(true);
      return;
    }
    if (!enabled || isAdminRoute) {
      setVisible(false);
      return;
    }
    const remember = parseRememberDays(config.ageGateRememberDays);
    setVisible(!isConfirmationFresh(readAgeGateState(), remember));
  }, [enabled, forceOpen, isAdminRoute, config.ageGateRememberDays]);

  // Lock body scroll while the gate is up — without this, the visitor can
  // scroll the landing page behind the backdrop using a mouse wheel.
  useEffect(() => {
    if (!visible) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [visible]);

  function handleConfirm() {
    recordAgeGateConfirmation();
    setVisible(false);
  }

  function handleDeny() {
    setDenied(true);
    // Intentionally NOT persisted — let an honest "no" re-prompt later.
  }

  if (!visible) return null;

  return (
    <AnimatePresence>
      <AgeGateOverlay
        config={config}
        denied={denied}
        reduced={reduced}
        onConfirm={handleConfirm}
        onDeny={handleDeny}
      />
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

interface OverlayProps {
  config: SiteConfig;
  denied: boolean;
  reduced: boolean;
  onConfirm: () => void;
  onDeny: () => void;
}

function AgeGateOverlay({ config, denied, reduced, onConfirm, onDeny }: OverlayProps) {
  const bgImage =
    (config.ageGateBackgroundImage || "").trim() ||
    (config.heroBackgroundImage || "").trim();
  const bgUrl = bgImage ? resolveAsset(bgImage) : "";

  const heading = config.ageGateHeading?.trim() || "Are you of";
  const headingItalic = config.ageGateHeadingItalic?.trim() || "legal drinking age?";
  const body =
    config.ageGateBody?.trim() ||
    "The wines of Lemberg Estate are intended for visitors aged 18 and over.";
  const confirmLabel = config.ageGateConfirmLabel?.trim() || "Yes, I am of age";
  const denyLabel = config.ageGateDenyLabel?.trim() || "I'm under age";
  const denyMessage =
    config.ageGateDenyMessage?.trim() ||
    "Please come back when you are old enough to enjoy our wines responsibly.";
  const minAge = (config.ageGateMinAge || "18").trim();

  // Brand mark — mirrors what landing-page <Nav> renders so the gate
  // feels like a continuation of the brand, not a foreign blocker.
  // Uploaded logoImage takes precedence over the SVG Monogram; the
  // wordmark sits below in the editor's chosen logoFont.
  const brand: BrandInfo = {
    image: (config.logoImage || "").trim()
      ? resolveAsset(config.logoImage!)
      : "",
    text: (config.logoText || "").trim() || "Lemberg",
    font: (config.logoFont || "").trim() || undefined,
  };

  return (
    <motion.div
      key="age-gate"
      data-theme="dark"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Background — visitor's eyes anchor on the card, but a dim,
          blurred reflection of the landing makes the gate feel like part
          of the brand rather than a generic blocker. */}
      <div className="absolute inset-0">
        {bgUrl ? (
          <img
            src={bgUrl}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="h-full w-full bg-[var(--color-ink-950)]" />
        )}
        <div className="absolute inset-0 bg-[rgba(7,7,10,0.78)] backdrop-blur-[10px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(7,7,10,0.6)_100%)]" />
      </div>

      {/* Card */}
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
        transition={{
          duration: reduced ? 0 : 0.8,
          ease: [0.22, 1, 0.36, 1],
          delay: reduced ? 0 : 0.1,
        }}
        className="relative mx-4 w-full max-w-xl border border-[var(--border-subtle)] bg-[rgba(10,10,11,0.92)] px-7 py-10 backdrop-blur-md sm:px-12 sm:py-16"
      >
        {/* Hairline trim — picks up the editorial frame used elsewhere */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />

        <AnimatePresence mode="wait">
          {denied ? (
            <DeniedView
              key="denied"
              brand={brand}
              message={denyMessage}
              reduced={reduced}
            />
          ) : (
            <GateView
              key="gate"
              brand={brand}
              heading={heading}
              headingItalic={headingItalic}
              body={body}
              minAge={minAge}
              confirmLabel={confirmLabel}
              denyLabel={denyLabel}
              reduced={reduced}
              onConfirm={onConfirm}
              onDeny={onDeny}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Gate view (the question + two CTAs)
 * ─────────────────────────────────────────────────────────────────── */

const PARENT: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
  exit: { opacity: 0, transition: { duration: 0.35 } },
};

const CHILD: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

interface GateViewProps {
  brand: BrandInfo;
  heading: string;
  headingItalic: string;
  body: string;
  minAge: string;
  confirmLabel: string;
  denyLabel: string;
  reduced: boolean;
  onConfirm: () => void;
  onDeny: () => void;
}

function GateView({
  brand,
  heading,
  headingItalic,
  body,
  minAge,
  confirmLabel,
  denyLabel,
  reduced,
  onConfirm,
  onDeny,
}: GateViewProps) {
  return (
    <motion.div
      variants={reduced ? undefined : PARENT}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col items-center text-center"
    >
      <motion.div variants={reduced ? undefined : CHILD} className="flex flex-col items-center gap-4">
        <BrandMark brand={brand} />
        <span className="label-eyebrow text-[var(--color-pearl-300)]">
          Age verification
        </span>
      </motion.div>

      <motion.h2
        id="age-gate-title"
        variants={reduced ? undefined : CHILD}
        className="mt-8 font-display text-[clamp(1.7rem,4vw,2.6rem)] font-light leading-[1.1] tracking-[-0.015em] text-[var(--color-bone-50)] sm:mt-10"
      >
        {heading}
        {headingItalic && (
          <span className="block italic text-[var(--color-pearl-300)]">
            {headingItalic}
          </span>
        )}
      </motion.h2>

      <motion.div
        variants={reduced ? undefined : CHILD}
        className="body-editorial mt-6 max-w-md text-[var(--color-bone-300)]"
        dangerouslySetInnerHTML={{ __html: body }}
      />

      {/* Min age chip — small reassurance of what they're confirming */}
      <motion.div
        variants={reduced ? undefined : CHILD}
        className="mt-7 inline-flex items-center gap-2 border border-[var(--border-subtle)] bg-[var(--color-ink-900)] px-4 py-2"
      >
        <Wine size={12} className="text-[var(--color-pearl-300)]" aria-hidden />
        <span className="label-eyebrow text-[var(--color-bone-300)]">
          Minimum age {minAge}+
        </span>
      </motion.div>

      <motion.div
        variants={reduced ? undefined : CHILD}
        className="mt-10 flex w-full max-w-sm flex-col gap-3"
      >
        <button
          type="button"
          onClick={onConfirm}
          autoFocus
          className="group flex items-center justify-center gap-3 bg-[var(--color-bone-50)] px-6 py-4 text-[var(--color-ink-900)] transition-all duration-500 hover:gap-4 hover:bg-[var(--color-bone-100)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-pearl-300)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink-900)]"
        >
          <ShieldCheck size={14} strokeWidth={1.5} />
          <span className="label-meta">{confirmLabel}</span>
        </button>
        <button
          type="button"
          onClick={onDeny}
          className="border border-[var(--color-bone-300)]/35 px-6 py-3.5 text-[var(--color-bone-200)] transition-colors duration-500 hover:border-[var(--color-bone-300)]/60 hover:text-[var(--color-bone-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-pearl-300)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink-900)]"
        >
          <span className="label-meta">{denyLabel}</span>
        </button>
      </motion.div>

      <motion.p
        variants={reduced ? undefined : CHILD}
        className="mt-8 max-w-sm text-[10px] uppercase leading-relaxed tracking-[0.22em] text-[var(--color-bone-500)]"
      >
        Please enjoy Lemberg wines responsibly
      </motion.p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Denied view — replaces the question with a respectful note.
 * No "go back" link: changing your mind feels coercive.
 * ─────────────────────────────────────────────────────────────────── */

function DeniedView({
  brand,
  message,
  reduced,
}: {
  brand: BrandInfo;
  message: string;
  reduced: boolean;
}) {
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: reduced ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center text-center"
    >
      <div className="opacity-60">
        <BrandMark brand={brand} />
      </div>
      <p className="label-eyebrow mt-4 text-[var(--color-pearl-300)]">
        Until next time
      </p>
      <h2 className="mt-8 font-display text-[clamp(1.6rem,3.6vw,2.4rem)] font-light italic leading-[1.15] tracking-[-0.015em] text-[var(--color-bone-50)] sm:mt-10">
        Thank you for your honesty.
      </h2>
      <div
        className="body-editorial mt-6 max-w-md text-[var(--color-bone-300)]"
        dangerouslySetInnerHTML={{ __html: message }}
      />
      <div className="mt-10 inline-flex items-center gap-3 border-t border-[var(--border-subtle)] pt-5">
        <span
          className="block h-px w-10 bg-[var(--color-pearl-300)]/40"
          aria-hidden
        />
        <span className="label-eyebrow text-[var(--color-bone-500)]">
          {brand.text} Estate
        </span>
        <span
          className="block h-px w-10 bg-[var(--color-pearl-300)]/40"
          aria-hidden
        />
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * BrandMark — mirrors the landing-page wordmark
 *
 * Stacked layout (icon above wordmark) is chosen here because the gate
 * card is centre-aligned. Icon = uploaded `logoImage` when provided,
 * otherwise the SVG Monogram. Wordmark text picks up the editor's
 * `logoFont` so the typography in the gate matches the public header.
 * ─────────────────────────────────────────────────────────────────── */

function BrandMark({ brand }: { brand: BrandInfo }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {brand.image ? (
        <img
          src={brand.image}
          alt=""
          aria-hidden
          className="h-10 w-auto object-contain"
        />
      ) : (
        <Monogram className="h-10 w-auto" />
      )}
      {/* Wordmark — explicit color so the gate's data-theme="dark" reads
          through and the text never gets stuck in a stale inherited
          colour from a parent theme. */}
      <span
        className="text-base font-light uppercase leading-none tracking-[0.32em] text-[var(--color-bone-100)] sm:text-lg"
        style={{ fontFamily: fontStack(brand.font, "var(--font-display)") }}
      >
        {brand.text}
      </span>
    </div>
  );
}
