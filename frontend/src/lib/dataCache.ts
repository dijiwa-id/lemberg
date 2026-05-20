/**
 * Synchronous localStorage cache for the public-page data the editor most
 * recently saw.
 *
 * Why this exists: the landing page initialises with `FALLBACK_CONFIG` /
 * `FALLBACK_WINES` (which point at Unsplash placeholders) and then issues an
 * API call to fetch the real data. On every refresh the editor saw their
 * configured images briefly replaced by the Unsplash defaults during the
 * roundtrip — a visible flash that broke trust in "what I publish is what
 * shows up".
 *
 * After the first successful fetch we persist config / wines / menu to
 * localStorage. Subsequent loads read those caches *synchronously* in the
 * `useState` initialiser, so the very first paint already shows the real
 * data — no flash, no flicker.
 *
 * Cache invariants:
 * - Stale data is acceptable — the in-flight fetch will overwrite within a
 *   tick. The visible delta between cached value and fresh value is at most
 *   one editor-edit, far less jarring than reverting to Unsplash defaults.
 * - localStorage is best-effort. Private mode / quota errors fall through
 *   silently and the page degrades to `FALLBACK_*` until next load.
 * - A schema version guards against shape changes — bump `CACHE_VERSION`
 *   when SiteConfig / Wine / MenuItem changes in a way the renderer can't
 *   read.
 */

import type { MenuItemNode, SiteConfig, Wine } from "./types";

const CACHE_VERSION = 2;

const KEYS = {
  config: "lemberg_config_cache",
  wines: "lemberg_wines_cache",
  menu: "lemberg_menu_cache",
} as const;

interface CachedEnvelope<T> {
  v: number;
  ts: number;
  data: T;
}

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const env = JSON.parse(raw) as CachedEnvelope<T>;
    if (!env || env.v !== CACHE_VERSION || env.data == null) return null;
    return env.data;
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const env: CachedEnvelope<T> = {
      v: CACHE_VERSION,
      ts: Date.now(),
      data,
    };
    window.localStorage.setItem(key, JSON.stringify(env));
  } catch {
    // Quota / private mode / disabled — silently skip; next fetch retries.
  }
}

/* ── Config ──────────────────────────────────────────────────────── */

export function readCachedConfig(): SiteConfig | null {
  const c = read<SiteConfig>(KEYS.config);
  if (!c || typeof c !== "object") return null;
  return c;
}

export function writeCachedConfig(config: SiteConfig | null | undefined): void {
  if (!config) return;
  write(KEYS.config, config);
}

/* ── Wines ───────────────────────────────────────────────────────── */

export function readCachedWines(): Wine[] | null {
  const w = read<Wine[]>(KEYS.wines);
  if (!Array.isArray(w) || w.length === 0) return null;
  return w;
}

export function writeCachedWines(wines: Wine[] | null | undefined): void {
  if (!Array.isArray(wines) || wines.length === 0) return;
  write(KEYS.wines, wines);
}

/* ── Menu ────────────────────────────────────────────────────────── */

export function readCachedMenu(): MenuItemNode[] | null {
  const m = read<MenuItemNode[]>(KEYS.menu);
  if (!Array.isArray(m) || m.length === 0) return null;
  return m;
}

export function writeCachedMenu(menu: MenuItemNode[] | null | undefined): void {
  if (!Array.isArray(menu) || menu.length === 0) return;
  write(KEYS.menu, menu);
}

/* ── Reset (useful for the Studio "reset settings" flow) ─────────── */

export function clearDataCache(): void {
  if (typeof window === "undefined") return;
  for (const key of Object.values(KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
