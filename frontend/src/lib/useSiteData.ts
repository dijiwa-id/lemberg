import { useCallback, useEffect, useState } from "react";
import {
  FALLBACK_CONFIG,
  FALLBACK_MENU,
  FALLBACK_WINES,
  mergeRemoteConfig,
  type MenuItemNode,
  type SiteConfig,
  type Wine,
} from "./types";
import { fetchConfig, fetchMenu, fetchWines } from "../services/api";
import { cacheBrand } from "./brandCache";
import {
  readCachedConfig,
  readCachedMenu,
  readCachedWines,
  writeCachedConfig,
  writeCachedMenu,
  writeCachedWines,
} from "./dataCache";
import { cacheStudio } from "./studioIdentity";

export interface SiteData {
  config: SiteConfig;
  wines: Wine[];
  menu: MenuItemNode[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Unified hook for site-wide data (Config, Wines, Menu).
 * 
 * Fetches data in parallel and synchronizes with localStorage caching
 * to ensure a zero-flicker experience for visitors and editors.
 */
export function useSiteData(skipRemote = false): SiteData {
  const [config, setConfig] = useState<SiteConfig>(() => readCachedConfig() || FALLBACK_CONFIG);
  const [wines, setWines] = useState<Wine[]>(() => readCachedWines() || FALLBACK_WINES);
  const [menu, setMenu] = useState<MenuItemNode[]>(() => readCachedMenu() || FALLBACK_MENU);
  const [loading, setLoading] = useState(!skipRemote);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (skipRemote) return;
    setLoading(true);
    try {
      const [c, w, m] = await Promise.all([
        fetchConfig(),
        fetchWines(),
        fetchMenu()
      ]);

      if (c) {
        const merged = mergeRemoteConfig(c);
        setConfig(merged);
        writeCachedConfig(merged);
        cacheBrand(merged);
        cacheStudio(merged);
      }
      
      if (Array.isArray(w)) {
        const sorted = [...w].sort((a, b) => (a.order || 0) - (b.order || 0));
        setWines(sorted);
        writeCachedWines(sorted);
      }

      if (Array.isArray(m)) {
        setMenu(m);
        writeCachedMenu(m);
      }
      
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to fetch site data"));
    } finally {
      setLoading(false);
    }
  }, [skipRemote]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { config, wines, menu, loading, error, refresh };
}
