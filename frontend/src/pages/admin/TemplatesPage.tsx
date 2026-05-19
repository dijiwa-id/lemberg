import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  RefreshCw,
  Trash2,
  Check,
  Edit3,
  X,
  Layers,
  Moon,
  Sun,
  MonitorSmartphone,
  Download,
  Upload,
  Copy,
  Search,
  FileJson,
} from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import {
  applyTemplate,
  deleteTemplate,
  duplicateTemplate,
  errorMessage,
  fetchTemplates,
  importTemplates,
  snapshotCurrentTemplate,
  updateTemplate,
} from "../../services/api";
import { useToast } from "../../lib/toast";
import {
  describeTemplate,
  type Template,
  type TemplatePayload,
} from "../../lib/types";
import {
  downloadBundle,
  parseBundle,
  readFileAsText,
  type ImportableTemplate,
} from "../../lib/templateExport";
import { fontStack, useGoogleFont } from "../../lib/useGoogleFont";
import { cn } from "../../lib/utils";
import type { AdminContext } from "../Admin";

const THEME_PRESET: Record<
  string,
  { label: string; icon: typeof Moon }
> = {
  dark: { label: "Dark", icon: Moon },
  light: { label: "Light", icon: Sun },
  auto: { label: "Auto", icon: MonitorSmartphone },
};

export function TemplatesPage({ ctx }: { ctx: AdminContext }) {
  const toast = useToast();
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  // IDs of templates that just landed via import — highlighted briefly so
  // editors can spot what changed in the library.
  const [recentlyAdded, setRecentlyAdded] = useState<Set<number>>(new Set());
  // Drag-state for the library-wide file drop zone. Two layers: a counter
  // (handles nested dragenter/leave) + a boolean for the overlay.
  const dragDepth = useRef(0);
  const [dragOver, setDragOver] = useState(false);

  // Pre-load all brand fonts present in the catalogue so the per-card font
  // preview renders correctly without a flash.
  const familiesInUse = useMemo(
    () => Array.from(new Set(items.map((t) => t.payload.logoFont).filter(Boolean))) as string[],
    [items]
  );
  useGoogleFont(familiesInUse);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchTemplates()
      .then((t) => {
        if (alive) setItems(t);
      })
      .catch((e) => {
        if (!alive) return;
        setItems([]);
        toast.error("Could not load templates", errorMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refreshTick, toast]);

  // Filter by search (name + description) then pin the active template to
  // the top. Recently-added rows are NOT pulled to the top — sorting is
  // about "what's live"; the highlight is enough to find new arrivals.
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matching = q
      ? items.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            (t.description || "").toLowerCase().includes(q)
        )
      : items;
    return sortActiveFirst(matching, ctx.config.activeTemplateId);
  }, [items, search, ctx.config.activeTemplateId]);

  async function handleSaveCurrent() {
    const name = newName.trim();
    if (name.length < 2) {
      toast.error("Name too short", "Template name needs at least 2 characters.");
      return;
    }
    try {
      const t = await snapshotCurrentTemplate(name, newDesc.trim() || undefined);
      setItems((cur) => [t, ...cur]);
      setCreating(false);
      setNewName("");
      setNewDesc("");
      toast.success("Template saved", `"${t.name}" is now in your library.`);
    } catch (e) {
      toast.error("Could not save template", errorMessage(e));
    }
  }

  async function handleApply(t: Template) {
    if (
      !confirm(
        `Apply "${t.name}"? This overwrites the current brand, theme, and section-visibility settings (page copy stays the same).`
      )
    ) {
      return;
    }
    try {
      const patch = await applyTemplate(t.id);
      ctx.applyServerPatch(patch as Partial<typeof ctx.config>);
      toast.success("Template applied", `"${t.name}" is now live.`);
    } catch (e) {
      toast.error("Could not apply template", errorMessage(e));
    }
  }

  async function handleDelete(t: Template) {
    const wasActive = String(t.id) === (ctx.config.activeTemplateId || "");
    const warning = wasActive
      ? `"${t.name}" is the currently active template. Delete anyway? The live look stays as-is, but no template will be marked active.`
      : `Delete "${t.name}"? This cannot be undone.`;
    if (!confirm(warning)) return;

    setItems((cur) => cur.filter((x) => x.id !== t.id));
    try {
      await deleteTemplate(t.id);
      // Mirror the backend's active-flag clear so the studio doesn't keep
      // showing the deleted ID as active until the next config refetch.
      if (wasActive) ctx.applyServerPatch({ activeTemplateId: "" });
      toast.success("Template removed", `"${t.name}" deleted.`);
    } catch (e) {
      toast.error("Could not delete template", errorMessage(e));
      setRefreshTick((n) => n + 1);
    }
  }

  async function handleRename(t: Template) {
    const next = prompt("Rename template:", t.name);
    if (next == null) return;
    const name = next.trim();
    if (name.length < 2) {
      toast.error("Name too short", "Template name needs at least 2 characters.");
      return;
    }
    setItems((cur) => cur.map((x) => (x.id === t.id ? { ...x, name } : x)));
    try {
      const updated = await updateTemplate(t.id, { name });
      setItems((cur) => cur.map((x) => (x.id === t.id ? updated : x)));
    } catch (e) {
      toast.error("Could not rename", errorMessage(e));
      setRefreshTick((n) => n + 1);
    }
  }

  function handleExport(t: Template) {
    try {
      downloadBundle([t]);
      toast.success("Template exported", `"${t.name}" saved as JSON.`);
    } catch (e) {
      toast.error("Could not export", errorMessage(e));
    }
  }

  function handleExportAll() {
    if (items.length === 0) return;
    try {
      downloadBundle(items);
      toast.success(
        "Bundle exported",
        `${items.length} template${items.length === 1 ? "" : "s"} saved as one file.`
      );
    } catch (e) {
      toast.error("Could not export", errorMessage(e));
    }
  }

  async function handleDuplicate(t: Template) {
    try {
      const clone = await duplicateTemplate(t.id);
      setItems((cur) => [clone, ...cur]);
      markRecentlyAdded([clone.id]);
      toast.success("Template duplicated", `Created "${clone.name}".`);
    } catch (e) {
      toast.error("Could not duplicate", errorMessage(e));
    }
  }

  async function handleImport(payload: ImportableTemplate[]) {
    if (payload.length === 0) return;
    try {
      const created = await importTemplates(payload);
      // Server may have suffixed names — show its returned list, not the
      // input, so editors see the actual final names.
      setItems((cur) => [...created, ...cur]);
      markRecentlyAdded(created.map((c) => c.id));
      setImportOpen(false);
      toast.success(
        created.length === 1 ? "Template imported" : "Templates imported",
        created.length === 1
          ? `"${created[0].name}" added to the library.`
          : `${created.length} templates added to the library.`
      );
    } catch (e) {
      toast.error("Could not import", errorMessage(e));
    }
  }

  /** Briefly highlight rows that were just added (import / duplicate) so
   *  the editor can spot them at a glance. Clears after a few seconds. */
  function markRecentlyAdded(ids: number[]) {
    setRecentlyAdded(new Set(ids));
    window.setTimeout(() => setRecentlyAdded(new Set()), 4500);
  }

  /* Library-wide drag-drop. Hooked on the wrapper that holds the search +
   * grid card, so editors can drop a file anywhere in the viewport area. */
  function handleDragEnter(e: React.DragEvent) {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragOver(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }
  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await handleDroppedFile(file);
  }

  async function handleDroppedFile(file: File) {
    try {
      const text = await readFileAsText(file);
      const parsed = parseBundle(text);
      await handleImport(parsed);
    } catch (err) {
      toast.error("Could not import file", errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Tools"
        title="Template themes"
        description="Save the current brand + theme + section visibility as a named template, then switch between looks in one click. Page copy and wine content stay untouched."
      >
        <button
          onClick={() => setRefreshTick((n) => n + 1)}
          className="flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
        >
          <RefreshCw size={13} /> Refresh
        </button>
        <button
          onClick={handleExportAll}
          disabled={items.length === 0}
          title={
            items.length === 0
              ? "Save a template first"
              : `Download all ${items.length} templates as one .json bundle`
          }
          className="flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={13} /> Export bundle
        </button>
        <button
          onClick={() => setImportOpen(true)}
          title="Import templates from a .json file or pasted text"
          className="flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
        >
          <Upload size={13} /> Import
        </button>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-2 bg-[var(--color-bone-50)] px-4 py-2 label-eyebrow text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)]"
        >
          <Plus size={13} /> Save current as template
        </button>
      </PageHeader>

      <div
        className="relative space-y-6 p-5 lg:p-10"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Library-wide drop overlay — appears only while dragging a file
            over any part of the page. Click-through is enabled via
            pointer-events-none so the underlying handlers still fire. */}
        {dragOver && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-ink-950)_72%,transparent)] backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 border-2 border-dashed border-[var(--color-pearl-300)] bg-[color-mix(in_srgb,var(--color-pearl-300)_8%,transparent)] px-12 py-10 text-center">
              <FileJson size={32} className="text-[var(--color-pearl-300)]" />
              <p className="font-display text-xl text-[var(--color-bone-100)]">
                Drop to import
              </p>
              <p className="max-w-xs text-sm text-[var(--color-bone-400)]">
                Release a Lemberg template <span className="font-mono">.json</span> file
                anywhere to add it to the library.
              </p>
            </div>
          </div>
        )}

        {/* Inline create form */}
        {creating && (
          <Card
            title="New template"
            description="Snapshot the current brand, theme, accent, font, and section visibility. Doesn't capture page copy."
            action={
              <button
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                  setNewDesc("");
                }}
                aria-label="Cancel"
                className="flex h-9 w-9 items-center justify-center border border-[var(--color-ink-600)] text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
              >
                <X size={13} />
              </button>
            }
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="label-eyebrow text-[var(--color-bone-500)]">Name</span>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Spring 2026 — light editorial"
                  autoFocus
                  className="mt-2 w-full border border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--color-bone-100)] focus:border-[var(--color-pearl-300)] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="label-eyebrow text-[var(--color-bone-500)]">
                  Description (optional)
                </span>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="A short note about when to use this"
                  className="mt-2 w-full border border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--color-bone-100)] focus:border-[var(--color-pearl-300)] focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSaveCurrent}
                disabled={newName.trim().length < 2}
                className="flex items-center gap-2 bg-[var(--color-bone-50)] px-5 py-2.5 label-eyebrow text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={13} /> Save template
              </button>
              <span className="label-eyebrow text-[var(--color-bone-500)]">
                Pulls live brand, theme, accent, font + 7 visibility toggles.
              </span>
            </div>
          </Card>
        )}

        {/* Search bar — only useful once a few templates exist. */}
        {items.length > 2 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-bone-500)]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates by name or description"
                className="w-full border border-[var(--border-default)] bg-[var(--bg-input)] py-2.5 pl-10 pr-10 text-sm text-[var(--color-bone-100)] focus:border-[var(--color-pearl-300)] focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-bone-500)] hover:text-[var(--color-bone-100)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="label-eyebrow text-[var(--color-bone-500)]">
              {filteredItems.length} of {items.length}
            </span>
          </div>
        )}

        {/* Template grid */}
        <Card
          title={`Library (${items.length})`}
          description={
            items.length === 0 && !loading
              ? "Save your first template to start a library, or import a bundle from another environment. Switch between looks for seasonal campaigns, soft launches, or A/B tests."
              : "Apply switches the live site to that template. Export to share, Duplicate to fork. Drop a .json file anywhere to import."
          }
          bodyClassName="p-0"
        >
          {loading ? (
            <div className="p-10 text-center label-eyebrow text-[var(--color-bone-500)]">
              Loading templates…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <Layers size={26} className="text-[var(--color-bone-500)] opacity-60" />
              <p className="font-display text-lg text-[var(--color-bone-200)]">
                No templates yet
              </p>
              <p className="max-w-sm text-sm text-[var(--color-bone-500)]">
                When you save the current look, it appears here. Switch the
                landing page's vibe (light vs dark, different accent, hide
                club section, etc.) in one click later. You can also import
                a bundle from another environment.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-2 bg-[var(--color-bone-50)] px-5 py-2.5 label-eyebrow text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)]"
                >
                  <Plus size={13} /> Save current as template
                </button>
                <button
                  onClick={() => setImportOpen(true)}
                  className="flex items-center gap-2 border border-[var(--color-ink-600)] px-5 py-2.5 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
                >
                  <Upload size={13} /> Import a bundle
                </button>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Search size={20} className="text-[var(--color-bone-500)] opacity-60" />
              <p className="text-sm text-[var(--color-bone-400)]">
                Nothing matches <span className="font-mono">"{search}"</span>.
              </p>
              <button
                onClick={() => setSearch("")}
                className="label-eyebrow text-[var(--color-bone-500)] hover:text-[var(--color-bone-100)]"
              >
                Clear search
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-ink-700)]">
              {filteredItems.map((t) => (
                <TemplateRow
                  key={t.id}
                  template={t}
                  isActive={String(t.id) === (ctx.config.activeTemplateId || "")}
                  isRecentlyAdded={recentlyAdded.has(t.id)}
                  onApply={handleApply}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onExport={handleExport}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
          existingCount={items.length}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

/** Pin the active template to the top of the list — it's what the editor
 *  most likely wants to see first ("which look is live right now"). */
function sortActiveFirst(items: Template[], activeId: string | undefined): Template[] {
  if (!activeId) return items;
  return [...items].sort((a, b) => {
    if (String(a.id) === activeId) return -1;
    if (String(b.id) === activeId) return 1;
    return 0;
  });
}

interface TemplateRowProps {
  template: Template;
  isActive: boolean;
  isRecentlyAdded: boolean;
  onApply: (t: Template) => void;
  onDelete: (t: Template) => void;
  onRename: (t: Template) => void;
  onExport: (t: Template) => void;
  onDuplicate: (t: Template) => void;
}

function TemplateRow({
  template,
  isActive,
  isRecentlyAdded,
  onApply,
  onDelete,
  onRename,
  onExport,
  onDuplicate,
}: TemplateRowProps) {
  const meta = describeTemplate(template);
  const ThemeIcon = (THEME_PRESET[meta.theme] || THEME_PRESET.dark).icon;
  const themeLabel = (THEME_PRESET[meta.theme] || THEME_PRESET.dark).label;
  const accentColor = meta.accent || "var(--color-pearl-300)";

  const updatedLabel = useMemo(() => {
    try {
      const d = new Date(template.updatedAt);
      return d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return template.updatedAt;
    }
  }, [template.updatedAt]);

  return (
    <li
      className={cn(
        "relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
        isActive &&
          "bg-[color-mix(in_srgb,var(--color-pearl-300)_4%,transparent)] before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-[var(--color-pearl-300)]",
        !isActive &&
          isRecentlyAdded &&
          "bg-[color-mix(in_srgb,var(--color-bone-300)_6%,transparent)] transition-colors duration-700"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-5">
        {/* Visual preview tile */}
        <div
          className={cn(
            "flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1.5 border bg-[var(--color-ink-850)] p-2",
            isActive
              ? "border-[color-mix(in_srgb,var(--color-pearl-300)_55%,transparent)]"
              : "border-[var(--border-subtle)]"
          )}
          aria-hidden
        >
          <span
            className="block h-5 w-5 rounded-full border border-[var(--border-subtle)]"
            style={{ background: accentColor }}
          />
          <span
            className="line-clamp-1 max-w-[64px] text-center text-[10px] leading-none text-[var(--color-bone-300)]"
            style={{ fontFamily: fontStack(meta.font, "var(--font-display)") }}
          >
            {template.payload.logoText || "Lemberg"}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="truncate font-display text-lg leading-tight text-[var(--color-bone-100)]">
              {template.name}
            </h3>
            {isActive && (
              <span className="inline-flex items-center gap-1.5 border border-[var(--color-pearl-300)] bg-[color-mix(in_srgb,var(--color-pearl-300)_12%,transparent)] px-2 py-0.5 label-eyebrow text-[var(--color-pearl-300)]">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-pearl-300)]"
                  aria-hidden
                />
                Active
              </span>
            )}
            {!isActive && isRecentlyAdded && (
              <span className="inline-flex items-center gap-1.5 border border-[var(--color-bone-400)] bg-[color-mix(in_srgb,var(--color-bone-300)_10%,transparent)] px-2 py-0.5 label-eyebrow text-[var(--color-bone-200)]">
                New
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 border px-2 py-0.5 label-eyebrow",
                meta.theme === "light"
                  ? "border-[var(--color-bone-300)] text-[var(--color-bone-200)]"
                  : meta.theme === "auto"
                    ? "border-[var(--color-ink-600)] text-[var(--color-bone-300)]"
                    : "border-[color-mix(in_srgb,var(--color-pearl-300)_45%,transparent)] text-[var(--color-pearl-300)]"
              )}
            >
              <ThemeIcon size={10} /> {themeLabel}
            </span>
            {meta.sectionsHidden > 0 && (
              <span className="label-eyebrow text-[var(--color-bone-500)]">
                {meta.sectionsHidden} hidden
              </span>
            )}
          </div>
          {template.description && (
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-[var(--color-bone-400)]">
              {template.description}
            </p>
          )}
          <p className="mt-3 label-eyebrow text-[var(--color-bone-500)]">
            {isActive ? "Currently live · " : ""}Updated {updatedLabel} · Font: {meta.font}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {isActive ? (
          <span
            className="flex cursor-default items-center gap-2 border border-[color-mix(in_srgb,var(--color-pearl-300)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-pearl-300)_8%,transparent)] px-4 py-2 label-eyebrow text-[var(--color-pearl-300)]"
            title="This template's look is currently live on the landing page"
          >
            <Check size={12} /> Currently active
          </span>
        ) : (
          <button
            onClick={() => onApply(template)}
            className="flex items-center gap-2 bg-[var(--color-bone-50)] px-4 py-2 label-eyebrow text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)]"
          >
            <Check size={12} /> Apply
          </button>
        )}
        <button
          onClick={() => onDuplicate(template)}
          aria-label="Duplicate"
          title="Duplicate this template"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-ink-600)] text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
        >
          <Copy size={13} />
        </button>
        <button
          onClick={() => onExport(template)}
          aria-label="Export"
          title="Download as .json"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-ink-600)] text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
        >
          <Download size={13} />
        </button>
        <button
          onClick={() => onRename(template)}
          aria-label="Rename"
          title="Rename"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-ink-600)] text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
        >
          <Edit3 size={13} />
        </button>
        <button
          onClick={() => onDelete(template)}
          aria-label="Delete"
          title="Delete"
          className="flex h-9 w-9 items-center justify-center border border-[var(--color-ink-600)] text-[var(--color-bone-500)] transition-colors hover:border-[var(--color-wine-700)] hover:text-[var(--color-wine-500)]"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

interface ImportModalProps {
  onClose: () => void;
  onImport: (items: ImportableTemplate[]) => Promise<void>;
  existingCount: number;
}

/** Two-step import: pick a source (file or paste) → preview parsed list →
 *  confirm. We parse client-side so editors get instant validation
 *  feedback (wrong file? malformed JSON?) before any network call. */
function ImportModal({ onClose, onImport, existingCount }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState("");
  const [preview, setPreview] = useState<ImportableTemplate[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFileChosen(file: File | null | undefined) {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setPasted(text);
      runParse(text);
    } catch (err) {
      setParseError(errorMessage(err));
      setPreview(null);
    }
  }

  function runParse(text: string) {
    setParseError(null);
    try {
      const items = parseBundle(text);
      setPreview(items);
    } catch (err) {
      setParseError(errorMessage(err));
      setPreview(null);
    }
  }

  async function handleConfirm() {
    if (!preview || preview.length === 0) return;
    setBusy(true);
    try {
      await onImport(preview);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,7,10,0.78)] backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-ink-700)] px-6 py-5">
          <div>
            <p className="label-eyebrow text-[var(--color-bone-500)]">Template library</p>
            <h2 className="mt-1 font-display text-2xl text-[var(--color-bone-100)]">
              Import templates
            </h2>
            <p className="mt-2 max-w-md text-sm text-[var(--color-bone-400)]">
              Upload a Lemberg <span className="font-mono">.json</span> bundle, or paste the
              contents directly. Names that already exist in the library will be
              suffixed with <span className="font-mono">(imported)</span>.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--color-ink-600)] text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
            >
              <FileJson size={13} /> Choose file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void handleFileChosen(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
            <span className="label-eyebrow text-[var(--color-bone-500)]">
              or paste below
            </span>
          </div>

          <textarea
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              if (e.target.value.trim()) {
                runParse(e.target.value);
              } else {
                setPreview(null);
                setParseError(null);
              }
            }}
            placeholder='Paste exported JSON here…&#10;&#10;Example:&#10;{ "lembergTemplateBundle": 1, "templates": [ { "name": "...", "payload": { ... } } ] }'
            rows={8}
            className="w-full border border-[var(--border-default)] bg-[var(--bg-input)] p-4 font-mono text-xs text-[var(--color-bone-200)] focus:border-[var(--color-pearl-300)] focus:outline-none"
          />

          {parseError && (
            <div className="border border-[var(--color-wine-700)] bg-[color-mix(in_srgb,var(--color-wine-700)_8%,transparent)] px-4 py-3 text-sm text-[var(--color-wine-300)]">
              {parseError}
            </div>
          )}

          {preview && preview.length > 0 && (
            <div className="border border-[var(--color-ink-600)] bg-[var(--color-ink-850)] p-4">
              <p className="label-eyebrow text-[var(--color-bone-500)]">
                Ready to import · {preview.length} template
                {preview.length === 1 ? "" : "s"}
                {existingCount > 0 && (
                  <span className="ml-2 text-[var(--color-bone-600)]">
                    (joining {existingCount} existing)
                  </span>
                )}
              </p>
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto overscroll-contain">
                {preview.map((it, i) => (
                  <li
                    key={`${it.name}-${i}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-[var(--color-bone-200)]">{it.name}</span>
                    <span className="shrink-0 label-eyebrow text-[var(--color-bone-500)]">
                      {Object.keys(it.payload || {}).length} fields
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-ink-700)] px-6 py-4">
          <button
            onClick={onClose}
            disabled={busy}
            className="border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!preview || preview.length === 0 || busy}
            className="flex items-center gap-2 bg-[var(--color-bone-50)] px-5 py-2 label-eyebrow text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Upload size={13} /> {busy ? "Importing…" : "Import"}
            {preview && preview.length > 0 && !busy && (
              <span className="ml-1 text-[var(--color-ink-700)]">
                · {preview.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
