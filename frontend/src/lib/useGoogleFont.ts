import { useEffect } from "react";
import { findBrandFont, googleFontsUrl } from "./types";

const INJECTED = new Set<string>();

/** Inject a Google Fonts stylesheet for the supplied families. Idempotent —
 *  repeated calls with the same key reuse the existing link. Families whose
 *  catalogue entry is `source="system"` are skipped because they're not on
 *  fonts.googleapis.com (Gotham, Proxima Nova, Futura, etc.). */
export function useGoogleFont(families: string[], weights = "300;400;500;600") {
  useEffect(() => {
    if (!families.length) return;
    const googleOnly = families.filter((f) => {
      const meta = findBrandFont(f);
      return !meta || meta.source === "google";
    });
    if (googleOnly.length === 0) return;

    const key = googleOnly.join("|") + "|" + weights;
    if (INJECTED.has(key)) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = googleFontsUrl(googleOnly, weights);
    link.setAttribute("data-gf", key);
    document.head.appendChild(link);
    INJECTED.add(key);
    // No cleanup — once a font is loaded for the session we keep it; the
    // catalogue is small and removing the link would unstyle in-flight UI.
  }, [families.join("|"), weights]);
}

/** Inline-style helper. For families in our catalogue with a `fallback`
 *  defined (commercial fonts), the returned stack is the family followed by
 *  the curated fallback chain. For Google fonts we append a single fallback
 *  category (serif / sans-serif). */
export function fontStack(family: string | undefined, fallback = "serif"): string {
  const f = (family || "").trim();
  if (!f) return fallback;
  const meta = findBrandFont(f);
  if (meta?.fallback) {
    // Commercial fonts: family + curated visual-equivalent chain.
    return `"${f}", ${meta.fallback}`;
  }
  if (meta?.category === "sans") {
    return `"${f}", ${fallback === "serif" ? "ui-sans-serif" : fallback}, sans-serif`;
  }
  return `"${f}", ${fallback}`;
}
