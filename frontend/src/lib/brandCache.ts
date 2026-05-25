/**
 * Persistent brand-identity cache used by the splash screen.
 *
 * The splash renders synchronously before any API call, so it cannot use the
 * remote config directly. We cache the four fields the splash needs to a
 * single localStorage key on every successful config fetch / save, and read
 * them back synchronously on splash mount. First-time visitors see the
 * defaults; everyone else sees the editor's actual wordmark.
 */

import type { SiteConfig } from "./types";

const KEY = "lemberg_brand_cache";
const CACHE_VERSION = 1;

export interface CachedBrand {
  logoText: string;
  logoImage: string;
  logoFont: string;
  /** A short subtitle below the wordmark — pulled from heroEyebrow. */
  tagline: string;
  v?: number; // Version field
}

const DEFAULT_BRAND: CachedBrand = {
  logoText: "Lemberg",
  logoImage: "",
  logoFont: "Cormorant Garamond",
  tagline: "Tulbagh Valley · South Africa",
  v: CACHE_VERSION,
};

export function getCachedBrand(): CachedBrand {
  if (typeof window === "undefined") return DEFAULT_BRAND;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_BRAND;
    const parsed = JSON.parse(raw) as Partial<CachedBrand>;
    
    // Version check — if version mismatch or missing, fall back to defaults
    if (!parsed || parsed.v !== CACHE_VERSION) {
      return DEFAULT_BRAND;
    }

    return { 
      ...DEFAULT_BRAND, 
      ...parsed,
      v: CACHE_VERSION 
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

export function cacheBrand(config: Partial<SiteConfig> | null | undefined): void {
  if (typeof window === "undefined" || !config) return;
  const brand: CachedBrand = {
    logoText: (config.logoText || "").trim() || DEFAULT_BRAND.logoText,
    logoImage: (config.logoImage || "").trim(),
    logoFont: (config.logoFont || "").trim() || DEFAULT_BRAND.logoFont,
    tagline: (config.heroEyebrow || "").trim() || DEFAULT_BRAND.tagline,
    v: CACHE_VERSION,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(brand));
  } catch {
    // localStorage unavailable (private mode, etc.) — splash falls back next time
  }
}
