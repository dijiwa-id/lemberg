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
import { OrderFormModal } from "../components/sections/OrderFormModal";
import { Cursor } from "../components/Cursor";
import { AgeGate } from "../components/AgeGate";
import { MaintenancePage } from "../components/MaintenancePage";
import {
  FALLBACK_CONFIG,
  configFlag,
  mergeRemoteConfig,
  type SiteConfig,
  type Wine,
} from "../lib/types";
import { useDocumentMeta, useLandingTheme } from "../lib/useDocumentMeta";
import { useSiteData } from "../lib/useSiteData";

interface LandingPageProps {
  previewConfig?: SiteConfig;
  previewWines?: Wine[];
}

export default function LandingPage({ previewConfig, previewWines }: LandingPageProps) {
  const isPreview = Boolean(previewConfig);
  const { config: remoteConfig, wines: remoteWines, menu: remoteMenu } = useSiteData(isPreview);

  // Initial state pulls from remote if available, else falls back to preview props or defaults.
  const [config, setConfig] = useState<SiteConfig>(() => {
    if (previewConfig) return mergeRemoteConfig(previewConfig);
    return remoteConfig;
  });
  const [wines, setWines] = useState<Wine[]>(() => previewWines || remoteWines);
  const [menu, setMenu] = useState(remoteMenu);
  
  const [activeWine, setActiveWine] = useState<Wine | null>(null);
  const [orderWine, setOrderWine] = useState<Wine | null>(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const location = useLocation();

  // Sync with remote data when it updates (non-preview mode)
  useEffect(() => {
    if (!isPreview) {
      setConfig(remoteConfig);
      setWines(remoteWines);
      setMenu(remoteMenu);
    }
  }, [isPreview, remoteConfig, remoteWines, remoteMenu]);

  // Sync with preview props when they update (preview mode)
  useEffect(() => {
    if (previewConfig) setConfig(mergeRemoteConfig(previewConfig));
  }, [previewConfig]);
  useEffect(() => {
    if (previewWines) setWines(previewWines);
  }, [previewWines]);

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

  const featuredWines = useMemo(() => {
    // We show the top 2 wines in the featured section for the new pagination.
    return wines.slice(0, 2);
  }, [wines]);

  // SEO meta + favicon + <html lang> — skip in preview to avoid clobbering Studio tab
  useDocumentMeta(isPreview ? FALLBACK_CONFIG : config);

  const theme = useLandingTheme(config.landingTheme);

  const openOrderForm = (wine: Wine | null = null) => {
    setOrderWine(wine);
    setIsOrderFormOpen(true);
  };

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
        {showVarietalRibbon && <VarietalRibbon config={config} />}
        <Collection
          config={config}
          wines={wines}
          onOpenWine={setActiveWine}
        />
        {showFeaturedWine && wines.length > 0 && (
          <FeaturedWine
            config={config}
            wines={wines}
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

      <OrderFormModal
        wine={orderWine}
        wines={wines}
        config={config}
        isOpen={isOrderFormOpen}
        onClose={() => setIsOrderFormOpen(false)}
      />
    </div>
  );
}
