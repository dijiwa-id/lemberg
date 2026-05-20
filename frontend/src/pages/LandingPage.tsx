import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Hero } from "../components/sections/Hero";
import { Philosophy } from "../components/sections/Philosophy";
import { Collection } from "../components/sections/Collection";
import { FeaturedWine } from "../components/sections/FeaturedWine";
import { EstateBand } from "../components/sections/EstateBand";
import { Experience } from "../components/sections/Experience";
import { Club } from "../components/sections/Club";
import { Footer } from "../components/sections/Footer";
import { VarietalRibbon } from "../components/sections/VarietalRibbon";
import { WineDetailModal } from "../components/sections/WineDetailModal";
import { Cursor } from "../components/Cursor";
import { AgeGate } from "../components/AgeGate";
import { MaintenancePage } from "../components/MaintenancePage";
import {
  FALLBACK_CONFIG,
  FALLBACK_MENU,
  FALLBACK_WINES,
  configFlag,
  mergeRemoteConfig,
  type MenuItemNode,
  type SiteConfig,
  type Wine,
} from "../lib/types";
import { fetchConfig, fetchMenu, fetchWines } from "../services/api";
import { useDocumentMeta, useLandingTheme } from "../lib/useDocumentMeta";
import { cacheBrand } from "../lib/brandCache";
import {
  readCachedConfig,
  readCachedMenu,
  readCachedWines,
  writeCachedConfig,
  writeCachedMenu,
  writeCachedWines,
} from "../lib/dataCache";

interface LandingPageProps {
  previewConfig?: SiteConfig;
  previewWines?: Wine[];
}

export default function LandingPage({ previewConfig, previewWines }: LandingPageProps) {
  // Initial state pulls from the persistent cache when available so a refresh
  // doesn't briefly render the Unsplash defaults baked into FALLBACK_*.
  // Preview mode (Studio) always wins — it passes live editor state.
  const [config, setConfig] = useState<SiteConfig>(() => {
    if (previewConfig) return mergeRemoteConfig(previewConfig);
    return readCachedConfig() || FALLBACK_CONFIG;
  });
  const [wines, setWines] = useState<Wine[]>(
    () => previewWines || readCachedWines() || FALLBACK_WINES
  );
  const [menu, setMenu] = useState<MenuItemNode[]>(
    () => readCachedMenu() || FALLBACK_MENU
  );
  const [activeWine, setActiveWine] = useState<Wine | null>(null);
  const location = useLocation();

  // Live preview sync (Admin)
  // Preview mode overrides
  useEffect(() => {
    if (previewConfig) setConfig(mergeRemoteConfig(previewConfig));
  }, [previewConfig]);
  useEffect(() => {
    if (previewWines) setWines(previewWines);
  }, [previewWines]);

  // Remote data (skip in preview mode). Each successful response is written
  // to localStorage so the next refresh / new tab paints with the real data
  // synchronously — no fallback-image flash during the API roundtrip.
  useEffect(() => {
    if (previewConfig) return;
    fetchConfig()
      .then((c) => {
        if (c && Object.keys(c).length > 0) {
          const merged = mergeRemoteConfig(c);
          setConfig(merged);
          writeCachedConfig(merged);
          // Keep the splash-screen brand cache in sync with what the editor
          // most recently published. Next page load shows the real wordmark.
          cacheBrand(merged);
        }
      })
      .catch(() => {});
  }, [previewConfig]);

  useEffect(() => {
    if (previewWines) return;
    fetchWines()
      .then((w) => {
        if (Array.isArray(w) && w.length > 0) {
          const sorted = [...w].sort((a, b) => (a.order || 0) - (b.order || 0));
          setWines(sorted);
          writeCachedWines(sorted);
        }
      })
      .catch(() => {});
  }, [previewWines]);

  // Menu tree (header nav) — same skip-in-preview pattern; preview uses fallback.
  useEffect(() => {
    if (previewConfig) return;
    fetchMenu()
      .then((m) => {
        if (Array.isArray(m) && m.length > 0) {
          setMenu(m);
          writeCachedMenu(m);
        }
      })
      .catch(() => {});
  }, [previewConfig]);

  // Cross-page anchor scroll: when arriving from /page/* via /#section, the
  // browser may not scroll because the component has only just mounted.
  useEffect(() => {
    if (!location.hash) return;
    const t = setTimeout(() => {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [location.hash]);

  const featuredWine = useMemo(() => {
    if (!config.featuredWineId) return wines[0];
    return (
      wines.find((w) => String(w.id) === String(config.featuredWineId)) || wines[0]
    );
  }, [config.featuredWineId, wines]);

  // SEO meta + favicon + <html lang> — skip in preview to avoid clobbering Studio tab
  const isPreview = Boolean(previewConfig);
  useDocumentMeta(isPreview ? FALLBACK_CONFIG : config);

  const theme = useLandingTheme(config.landingTheme);

  // Brand accent overrides the iridescent pearl across the entire landing.
  const accentStyle: CSSProperties = config.brandAccent
    ? ({ "--color-pearl-300": config.brandAccent } as CSSProperties)
    : {};

  // Maintenance mode short-circuits the entire site (preview still renders the
  // full landing so editors can keep editing while the public site is paused).
  if (!isPreview && configFlag(config.maintenanceMode, false)) {
    return (
      <div data-theme={theme} style={accentStyle}>
        <MaintenancePage config={config} />
      </div>
    );
  }

  const showAnnouncementBar = configFlag(config.showAnnouncementBar, true);
  const showPhilosophy = configFlag(config.showPhilosophy, true);
  const showVarietalRibbon = configFlag(config.showVarietalRibbon, true);
  const showFeaturedWine = configFlag(config.showFeaturedWine, true);
  const showEstateBand = configFlag(config.showEstateBand, true);
  const showExperience = configFlag(config.showExperience, true);
  const showClub = configFlag(config.showClub, true);

  return (
    <div
      data-theme={theme}
      style={accentStyle}
      className="relative min-h-screen bg-[var(--color-ink-900)] text-[var(--color-bone-100)]"
    >
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-[var(--color-bone-50)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-ink-900)]"
      >
        Skip to content
      </a>
      <Cursor />
      <AgeGate config={config} />
      <Nav
        config={config}
        menu={menu}
        showAnnouncementBar={showAnnouncementBar}
      />
      <main>
        <Hero config={config} />
        {showPhilosophy && <Philosophy config={config} />}
        {showVarietalRibbon && <VarietalRibbon />}
        <Collection
          config={config}
          wines={wines}
          onOpenWine={setActiveWine}
        />
        {showFeaturedWine && featuredWine && (
          <FeaturedWine
            config={config}
            wine={featuredWine}
            onOpenWine={setActiveWine}
          />
        )}
        {showEstateBand && <EstateBand config={config} />}
        {showExperience && <Experience config={config} />}
        {showClub && <Club config={config} />}
      </main>
      <Footer config={config} />

      <WineDetailModal
        wine={activeWine}
        config={config}
        onClose={() => setActiveWine(null)}
      />
    </div>
  );
}
