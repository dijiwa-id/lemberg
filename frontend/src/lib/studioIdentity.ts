/**
 * Studio identity — the CMS chrome (Sidebar header, TopBar, AdminFooter,
 * Login screen). Editors configure these in /admin/studio independently
 * of the landing-page brand, so a white-label deployment can rename the
 * admin without touching the public site.
 *
 * Two access patterns:
 *   - Inside the authenticated admin tree: read `ctx.config` directly and
 *     compute via `pickStudioIdentity(config)`.
 *   - Outside (LoginPage, splash before login): `getCachedStudio()` reads
 *     a synchronously-loadable localStorage cache that the admin tree
 *     refreshes on every successful config fetch.
 */

import type { SiteConfig } from "./types";

const KEY = "lemberg_studio_identity";

export interface StudioIdentity {
  name: string;
  edition: string;
  tagline: string;
  logo: string;        // image URL; empty = use Monogram SVG
  accent: string;      // hex; empty = inherit landingTheme accent
  confirmDestructive: boolean;
  compactMode: boolean;
}

export const DEFAULT_STUDIO_IDENTITY: StudioIdentity = {
  name: "Lemberg",
  edition: "Studio · v1",
  tagline: "Editorial CMS",
  logo: "",
  accent: "",
  confirmDestructive: true,
  compactMode: false,
};

function parseFlag(v: string | undefined | null, fallback: boolean): boolean {
  if (v === undefined || v === null || v === "") return fallback;
  return v === "true" || v === "1" || v === "on";
}

/** Compute studio identity from the live (or cached) SiteConfig. Empty
 *  string values fall back to defaults — never leaks "" to the UI. */
export function pickStudioIdentity(config: Partial<SiteConfig> | null | undefined): StudioIdentity {
  if (!config) return DEFAULT_STUDIO_IDENTITY;
  return {
    name: (config.studioName || "").trim() || DEFAULT_STUDIO_IDENTITY.name,
    edition: (config.studioEdition || "").trim() || DEFAULT_STUDIO_IDENTITY.edition,
    tagline: (config.studioTagline || "").trim() || DEFAULT_STUDIO_IDENTITY.tagline,
    logo: (config.studioLogo || "").trim(),
    accent: (config.studioAccent || "").trim(),
    confirmDestructive: parseFlag(config.studioConfirmDestructive, true),
    compactMode: parseFlag(config.studioCompactMode, false),
  };
}

/** Sync read from localStorage — used by LoginPage (no admin context). */
export function getCachedStudio(): StudioIdentity {
  if (typeof window === "undefined") return DEFAULT_STUDIO_IDENTITY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STUDIO_IDENTITY;
    const parsed = JSON.parse(raw) as Partial<StudioIdentity>;
    return { ...DEFAULT_STUDIO_IDENTITY, ...parsed };
  } catch {
    return DEFAULT_STUDIO_IDENTITY;
  }
}

/** Persist current studio identity to localStorage. Call this whenever
 *  the admin saves / fetches a fresh config so the splash + login screen
 *  reflect the editor's latest settings on next load. */
export function cacheStudio(config: Partial<SiteConfig> | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pickStudioIdentity(config)));
  } catch {
    // localStorage unavailable — login falls back to defaults next time
  }
}

/** Confirm wrapper that respects the editor's "skip confirmation prompts"
 *  preference. Pass `force: true` for genuinely irreversible actions that
 *  should always prompt regardless of the toggle (e.g. dropping the DB). */
export function studioConfirm(
  identity: StudioIdentity,
  message: string,
  opts: { force?: boolean } = {}
): boolean {
  if (typeof window === "undefined") return true;
  if (!opts.force && !identity.confirmDestructive) return true;
  return window.confirm(message);
}
