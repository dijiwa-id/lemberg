import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  errorMessage,
  fetchConfig,
  fetchWines,
  saveConfig,
  createWine,
  updateWine,
  deleteWine,
} from "../services/api";
import {
  FALLBACK_CONFIG,
  FALLBACK_WINES,
  mergeRemoteConfig,
  type SiteConfig,
  type Wine,
} from "../lib/types";
import { ToastProvider, useToast } from "../lib/toast";
import { cacheBrand } from "../lib/brandCache";
import { cacheStudio, pickStudioIdentity } from "../lib/studioIdentity";
import { DashboardLayout } from "../components/admin/DashboardLayout";
import { Dashboard } from "./admin/Dashboard";
import { BrandPage } from "./admin/BrandPage";
import { HeroPage } from "./admin/HeroPage";
import { PhilosophyPage } from "./admin/PhilosophyPage";
import { CollectionPage } from "./admin/CollectionPage";
import { FeaturedPage } from "./admin/FeaturedPage";
import { EstatePage } from "./admin/EstatePage";
import { ExperiencePage } from "./admin/ExperiencePage";
import { ClubPage } from "./admin/ClubPage";
import { FooterPage } from "./admin/FooterPage";
import { PreviewPage } from "./admin/PreviewPage";
import { SettingsPage } from "./admin/SettingsPage";
import { MenuPage } from "./admin/MenuPage";
import { TemplatesPage } from "./admin/TemplatesPage";
import { StudioPage } from "./admin/StudioPage";
import { AgeGatePage } from "./admin/AgeGatePage";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface AdminContext {
  config: SiteConfig;
  wines: Wine[];
  loading: boolean;
  dirty: boolean;
  saveState: SaveState;
  lastSaved: Date | null;
  update: (patch: Partial<SiteConfig>) => void;
  persistConfig: () => Promise<void>;
  /** Merge a server-authoritative patch into config without marking dirty.
   *  Used after applying a template — the server has already persisted the
   *  change so the editor shouldn't see "Unsaved changes" pulsing. */
  applyServerPatch: (patch: Partial<SiteConfig>) => void;
  onAddWine: () => Promise<void>;
  onWineChange: (id: Wine["id"], patch: Partial<Wine>) => Promise<void>;
  onReorderWines: (next: Wine[]) => Promise<void>;
  onDeleteWine: (id: Wine["id"]) => Promise<void>;
}

export default function Admin() {
  return (
    <ToastProvider>
      <AdminShell />
    </ToastProvider>
  );
}

function AdminShell() {
  const toast = useToast();
  const [config, setConfig] = useState<SiteConfig>(FALLBACK_CONFIG);
  const [wines, setWines] = useState<Wine[]>(FALLBACK_WINES);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, w] = await Promise.all([fetchConfig(), fetchWines()]);
        if (!alive) return;
        if (c && Object.keys(c).length > 0) {
          const merged = mergeRemoteConfig(c);
          setConfig(merged);
          cacheBrand(merged);
          cacheStudio(merged);
        }
        if (Array.isArray(w) && w.length > 0) {
          setWines([...w].sort((a, b) => (a.order || 0) - (b.order || 0)));
        }
      } catch (e) {
        // Backend offline — fallback config keeps the editor usable. Surface
        // a soft warning so the editor knows changes won't persist yet.
        toast.error(
          "Could not reach the studio API",
          errorMessage(e, "Working from local defaults until the server reconnects.")
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const update = (patch: Partial<SiteConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
    setDirty(true);
    setSaveState("idle");
  };

  /** Server already persisted the change (template apply / external write).
   *  Merge into state, refresh brand cache + landing cache, do NOT mark
   *  dirty (it's already saved). */
  const applyServerPatch = (patch: Partial<SiteConfig>) => {
    setConfig((c) => {
      const merged = { ...c, ...patch };
      cacheBrand(merged);
      cacheStudio(merged);
      return merged;
    });
    setLastSaved(new Date());
  };

  async function persistConfig() {
    if (saveState === "saving") return;
    setSaveState("saving");
    try {
      const sanitized: Record<string, string> = {};
      Object.entries(config).forEach(([k, v]) => {
        sanitized[k] = v == null ? "" : String(v);
      });
      await saveConfig(sanitized);
      setSaveState("saved");
      setDirty(false);
      setLastSaved(new Date());
      // Refresh the splash-screen brand snapshot so the next reload of any
      // page renders the just-published wordmark immediately.
      cacheBrand(config);
      cacheStudio(config);
      toast.success("Changes published", "The public site has been updated.");
      setTimeout(() => setSaveState("idle"), 1800);
    } catch (e) {
      setSaveState("error");
      toast.error("Publish failed", errorMessage(e));
      setTimeout(() => setSaveState("idle"), 2400);
    }
  }

  async function onAddWine() {
    const next: Partial<Wine> = {
      name: "New Wine",
      vintage: String(new Date().getFullYear()),
      varietal: "Varietal",
      description: "Description",
      tastingNotes: "",
      foodPairing: "",
      status: "available",
      price: 0,
      order: wines.length,
      image:
        "https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=1200&q=80&auto=format&fit=crop",
    };
    try {
      const saved = await createWine(next);
      setWines((ws) => [...ws, saved]);
      toast.success("Wine added", `${saved.name} is now in the collection.`);
    } catch (e) {
      // Optimistic local id so the editor keeps working; flag the failure.
      const localId = `local-${Date.now()}`;
      setWines((ws) => [...ws, { ...(next as Wine), id: localId }]);
      toast.error("Could not save the new wine", errorMessage(e));
    }
  }

  async function onWineChange(id: Wine["id"], patch: Partial<Wine>) {
    setWines((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    try {
      await updateWine(id, patch);
    } catch (e) {
      setSaveState("error");
      toast.error("Could not save wine edit", errorMessage(e));
      setTimeout(() => setSaveState("idle"), 2400);
      // Rethrow so the per-wine save indicator in WineEditor can show
      // "Failed" inline, not just the global toast.
      throw e;
    }
  }

  async function onReorderWines(next: Wine[]) {
    const withOrder = next.map((w, i) => ({ ...w, order: i }));
    setWines(withOrder);
    try {
      await Promise.all(
        withOrder.map((w) => updateWine(w.id, { order: w.order }))
      );
    } catch (e) {
      toast.error("Reorder did not persist", errorMessage(e));
    }
  }

  async function onDeleteWine(id: Wine["id"]) {
    const target = wines.find((w) => w.id === id);
    setWines((ws) => ws.filter((w) => w.id !== id));
    try {
      await deleteWine(id);
      if (target) toast.success("Wine removed", `${target.name} was deleted.`);
    } catch (e) {
      toast.error("Could not delete wine", errorMessage(e));
    }
  }

  const ctx: AdminContext = {
    config,
    wines,
    loading,
    dirty,
    saveState,
    lastSaved,
    update,
    persistConfig,
    applyServerPatch,
    onAddWine,
    onWineChange,
    onReorderWines,
    onDeleteWine,
  };

  const studio = pickStudioIdentity(config);

  return (
    <DashboardLayout
      saveState={saveState}
      dirty={dirty}
      loading={loading}
      studio={studio}
      lastSaved={lastSaved}
      onSave={persistConfig}
    >
      <Routes>
        <Route index element={<Dashboard ctx={ctx} />} />
        <Route path="brand" element={<BrandPage ctx={ctx} />} />
        <Route path="hero" element={<HeroPage ctx={ctx} />} />
        <Route path="philosophy" element={<PhilosophyPage ctx={ctx} />} />
        <Route path="collection" element={<CollectionPage ctx={ctx} />} />
        <Route path="featured" element={<FeaturedPage ctx={ctx} />} />
        <Route path="estate" element={<EstatePage ctx={ctx} />} />
        <Route path="experience" element={<ExperiencePage ctx={ctx} />} />
        <Route path="club" element={<ClubPage ctx={ctx} />} />
        <Route path="footer" element={<FooterPage ctx={ctx} />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="templates" element={<TemplatesPage ctx={ctx} />} />
        <Route path="studio" element={<StudioPage ctx={ctx} />} />
        <Route path="age-gate" element={<AgeGatePage ctx={ctx} />} />
        <Route path="settings" element={<SettingsPage ctx={ctx} />} />
        <Route path="preview" element={<PreviewPage ctx={ctx} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
