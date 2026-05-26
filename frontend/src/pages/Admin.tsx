import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  errorMessage,
  saveConfig,
  createWine,
  updateWine,
  deleteWine,
  reorderWines,
} from "../services/api";
import {
  FALLBACK_CONFIG,
  FALLBACK_WINES,
  type SiteConfig,
  type Wine,
  type User,
} from "../lib/types";
import { ToastProvider, useToast } from "../lib/toast";
import { cacheBrand } from "../lib/brandCache";
import { cacheStudio, pickStudioIdentity } from "../lib/studioIdentity";
import { DashboardLayout } from "../components/admin/DashboardLayout";
import { Dashboard } from "./admin/Dashboard";
import { BrandPage } from "./admin/BrandPage";
import { HeroPage } from "./admin/HeroPage";
import { PhilosophyPage } from "./admin/PhilosophyPage";
import { RibbonPage } from "./admin/RibbonPage";
import { CollectionPage } from "./admin/CollectionPage";
import { FeaturedPage } from "./admin/FeaturedPage";
import { EstatePage } from "./admin/EstatePage";
import { ExperiencePage } from "./admin/ExperiencePage";
import { ClubPage } from "./admin/ClubPage";
import { FooterPage } from "./admin/FooterPage";
import { OrdersPage } from "./admin/OrdersPage";
import { PreviewPage } from "./admin/PreviewPage";
import { SettingsPage } from "./admin/SettingsPage";
import { MenuPage } from "./admin/MenuPage";
import { TemplatesPage } from "./admin/TemplatesPage";
import { StudioPage } from "./admin/StudioPage";
import { AgeGatePage } from "./admin/AgeGatePage";
import { UsersPage } from "./admin/UsersPage";
import { AuditPage } from "./admin/AuditPage";
import { useAuth } from "../lib/auth";
import { useSiteData } from "../lib/useSiteData";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface AdminContext {
  user: User | null;
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
  const { user } = useAuth();
  const { config: remoteConfig, wines: remoteWines, loading, error } = useSiteData();

  const [config, setConfig] = useState<SiteConfig>(FALLBACK_CONFIG);
  const [wines, setWines] = useState<Wine[]>(FALLBACK_WINES);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (remoteConfig) setConfig(remoteConfig);
    if (remoteWines) setWines(remoteWines);
  }, [remoteConfig, remoteWines]);

  useEffect(() => {
    if (error) {
      toast.error(
        "Could not reach the studio API",
        errorMessage(error, "Working from local defaults until the server reconnects.")
      );
    }
  }, [error, toast]);

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
      images: [
        "https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=1200&q=80&auto=format&fit=crop"
      ],
    };
    try {
      const saved = await createWine(next);
      setWines((ws) => [...ws, saved]);
      toast.success("Wine added", `${saved.name} is now in the collection.`);
    } catch (e) {
      toast.error("Could not save the new wine", errorMessage(e));
    }
  }

  async function onWineChange(id: Wine["id"], patch: Partial<Wine>) {
    const target = wines.find((w) => w.id === id);
    if (!target) return;
    
    // Optimistic update
    setWines((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    try {
      await updateWine(id, patch);
    } catch (e) {
      // Revert on failure
      setWines((ws) => ws.map((w) => (w.id === id ? target : w)));
      setSaveState("error");
      toast.error("Could not save wine edit", errorMessage(e));
      setTimeout(() => setSaveState("idle"), 2400);
      throw e;
    }
  }

  async function onReorderWines(next: Wine[]) {
    const previous = wines;
    const withOrder = next.map((w, i) => ({ ...w, order: i }));
    setWines(withOrder);
    try {
      await reorderWines(withOrder.map(w => ({ id: Number(w.id), order: Number(w.order), parent_id: null })));
    } catch (e) {
      // Revert on failure
      setWines(previous);
      toast.error("Reorder did not persist", errorMessage(e));
    }
  }

  async function onDeleteWine(id: Wine["id"]) {
    const target = wines.find((w) => w.id === id);
    const previous = wines;
    setWines((ws) => ws.filter((w) => w.id !== id));
    try {
      await deleteWine(id);
      if (target) toast.success("Wine removed", `${target.name} was deleted.`);
    } catch (e) {
      // Revert on failure
      setWines(previous);
      toast.error("Could not delete wine", errorMessage(e));
    }
  }

  const ctx: AdminContext = {
    user,
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
        <Route path="ribbon" element={<RibbonPage ctx={ctx} />} />
        <Route path="collection" element={<CollectionPage ctx={ctx} />} />
        <Route path="featured" element={<FeaturedPage ctx={ctx} />} />
        <Route path="estate" element={<EstatePage ctx={ctx} />} />
        <Route path="experience" element={<ExperiencePage ctx={ctx} />} />
        <Route path="club" element={<ClubPage ctx={ctx} />} />
        <Route path="orders" element={<OrdersPage ctx={ctx} />} />
        <Route path="footer" element={<FooterPage ctx={ctx} />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="templates" element={<TemplatesPage ctx={ctx} />} />
        <Route path="studio" element={<StudioPage ctx={ctx} />} />
        <Route path="users" element={<UsersPage ctx={ctx} />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="age-gate" element={<AgeGatePage ctx={ctx} />} />
        <Route path="settings" element={<SettingsPage ctx={ctx} />} />
        <Route path="preview" element={<PreviewPage ctx={ctx} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
