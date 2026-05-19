import { useState } from "react";
import { motion } from "motion/react";
import { Monogram } from "./Monogram";
import { getCachedBrand } from "../lib/brandCache";
import { fontStack, useGoogleFont } from "../lib/useGoogleFont";
import { resolveAsset } from "../services/api";

/**
 * Brief intro splash on first paint. Renders the editor-configured brand
 * (uploaded icon + wordmark in the chosen Google font + heroEyebrow tagline)
 * via a synchronous localStorage cache so the splash matches the live header
 * even before any API call resolves.
 *
 * First-time visitors see the bundled Monogram + "Lemberg" defaults; once
 * the config has been fetched once, subsequent loads pick up the real brand.
 */
export function SplashScreen() {
  const brand = getCachedBrand();
  // Idempotent — only injects the <link> the first time per session.
  useGoogleFont(brand.logoFont ? [brand.logoFont] : []);

  const initialIconUrl = brand.logoImage ? resolveAsset(brand.logoImage) : "";
  const [iconUrl, setIconUrl] = useState(initialIconUrl);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.6, delay: 0.9, ease: [0.65, 0, 0.35, 1] }}
      onAnimationComplete={(state) => {
        if (state === "animate" || (state as { opacity?: number })?.opacity === 0) {
          const el = document.getElementById("lemberg-splash");
          if (el) el.style.display = "none";
        }
      }}
      id="lemberg-splash"
      className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-[var(--color-ink-950)]"
    >
      {/* Iridescent radial glow — same warmth the studio uses behind the Featured wine */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,196,187,0.10)_0%,_transparent_60%)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={brand.logoText}
            className="h-14 w-auto object-contain"
            // Fall back to the bundled monogram if the uploaded icon 404s
            // (e.g. cache referencing a deleted /uploads/* file).
            onError={() => setIconUrl("")}
          />
        ) : (
          <Monogram className="h-14 w-auto" />
        )}

        <span
          className="text-2xl font-light leading-none tracking-[0.32em] text-[var(--color-bone-100)]"
          style={{
            fontFamily: fontStack(brand.logoFont, "var(--font-display)"),
            textTransform: "uppercase",
          }}
        >
          {brand.logoText}
        </span>

        {brand.tagline && (
          <span className="label-eyebrow text-[var(--color-bone-500)]">
            {brand.tagline}
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
