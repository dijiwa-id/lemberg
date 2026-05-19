import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ImageOff,
  RefreshCw,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useRef, useState } from "react";
import { ImageField, NumberField, SelectField, TextField } from "./Field";
import { Badge, statusToTone, statusLabel } from "./Badge";
import { WineGallery } from "./WineGallery";
import type { Wine } from "../../lib/types";
import { wineDefaultImage } from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { cn } from "../../lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface WineRowProps {
  wine: Wine;
  /** Awaitable so the row can show a per-wine save indicator while the
   *  API call is in flight. Admin's onWineChange is already async. */
  onChange: (id: Wine["id"], patch: Partial<Wine>) => Promise<void>;
  onDelete: (id: Wine["id"]) => void;
}

function WineRow({ wine, onChange, onDelete }: WineRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: wine.id });
  const [open, setOpen] = useState(false);

  // Per-row autosave indicator — overlap-tolerant counter so rapid edits
  // don't flicker "Saved" between every keystroke. The pill only shows
  // "Saved" once *all* outstanding requests have settled.
  const inFlightRef = useRef(0);
  const idleTimerRef = useRef<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  async function persist(patch: Partial<Wine>) {
    inFlightRef.current += 1;
    setSaveStatus("saving");
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    try {
      await onChange(wine.id, patch);
      inFlightRef.current -= 1;
      if (inFlightRef.current === 0) {
        setSaveStatus("saved");
        idleTimerRef.current = window.setTimeout(() => {
          if (inFlightRef.current === 0) setSaveStatus("idle");
          idleTimerRef.current = null;
        }, 1500);
      }
    } catch {
      inFlightRef.current = Math.max(0, inFlightRef.current - 1);
      setSaveStatus("error");
      idleTimerRef.current = window.setTimeout(() => {
        if (inFlightRef.current === 0) setSaveStatus("idle");
        idleTimerRef.current = null;
      }, 2500);
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="overflow-hidden border border-[var(--color-ink-700)] bg-[var(--color-ink-850)] transition-colors hover:border-[var(--color-ink-600)]"
    >
      <div className="flex items-center gap-4 p-4">
        <button
          {...attributes}
          {...listeners}
          aria-label="Reorder wine"
          className="flex h-9 w-6 cursor-grab items-center justify-center text-[var(--color-bone-500)] hover:text-[var(--color-pearl-300)] active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>

        <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden border border-[var(--color-ink-700)] bg-[var(--color-ink-900)]">
          {wineDefaultImage(wine) ? (
            <img
              src={resolveAsset(wineDefaultImage(wine))}
              alt={wine.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageOff size={14} className="text-[var(--color-bone-600)]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-display text-base leading-tight text-[var(--color-bone-100)]">
              {wine.name || "Untitled wine"}
            </p>
            {wine.vintage && (
              <span className="label-eyebrow text-[var(--color-bone-500)]">
                {wine.vintage}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-[var(--color-bone-400)]">
            {wine.varietal || "Varietal"} · {wine.region || "—"}
            {wine.alcohol ? ` · ${wine.alcohol}` : ""}
          </p>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <SavePill status={saveStatus} />
          <Badge tone={statusToTone(wine.status)}>{statusLabel(wine.status)}</Badge>
          {typeof wine.price === "number" && wine.price > 0 && (
            <span className="label-eyebrow text-[var(--color-bone-400)]">
              R {wine.price.toLocaleString()}
            </span>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse" : "Expand"}
          className="flex items-center gap-2 border border-[var(--color-ink-600)] px-3 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
        >
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          <span className="hidden sm:inline">{open ? "Close" : "Edit"}</span>
        </button>

        <button
          onClick={() => {
            if (confirm(`Delete "${wine.name}"?`)) onDelete(wine.id);
          }}
          aria-label="Delete wine"
          className="text-[var(--color-bone-500)] transition-colors hover:text-[var(--color-wine-500)]"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {open && (
        <div className="grid gap-5 border-t border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-6 md:grid-cols-2">
          <TextField
            label="Name"
            value={wine.name || ""}
            onChange={(v) => persist({name: v })}
          />
          <TextField
            label="Slug"
            value={wine.slug || ""}
            onChange={(v) => persist({slug: v })}
          />
          <TextField
            label="Varietal"
            value={wine.varietal || ""}
            onChange={(v) => persist({varietal: v })}
          />
          <TextField
            label="Vintage"
            value={wine.vintage || ""}
            onChange={(v) => persist({vintage: v })}
          />
          <TextField
            label="Region"
            value={wine.region || ""}
            onChange={(v) => persist({region: v })}
          />
          <TextField
            label="Alcohol"
            value={wine.alcohol || ""}
            onChange={(v) => persist({alcohol: v })}
            placeholder="14.0%"
          />
          <NumberField
            label="Price (ZAR)"
            value={wine.price}
            onChange={(v) => persist({price: v })}
            step={10}
          />
          <SelectField
            label="Status"
            value={wine.status || "available"}
            onChange={(v) => persist({status: v })}
            options={[
              { value: "available", label: "Available" },
              { value: "allocated", label: "Allocation only" },
              { value: "library", label: "Library release" },
              { value: "sold-out", label: "Sold out" },
            ]}
          />
          <div className="md:col-span-2">
            <TextField
              label="Description"
              value={wine.description || ""}
              onChange={(v) => persist({description: v })}
              multiline
              rows={2}
            />
          </div>
          <div className="md:col-span-2">
            <TextField
              label="Tasting notes"
              value={wine.tastingNotes || ""}
              onChange={(v) => persist({tastingNotes: v })}
              multiline
              rows={2}
            />
          </div>
          <div className="md:col-span-2">
            <TextField
              label="Food pairing"
              value={wine.foodPairing || ""}
              onChange={(v) => persist({foodPairing: v })}
            />
          </div>
          <div className="md:col-span-2">
            <p className="label-eyebrow text-[var(--color-bone-500)]">
              Bottle gallery
            </p>
            <p className="mt-1 text-xs text-[var(--color-bone-500)]">
              Upload one or more bottle / detail shots. The first image is the
              default shown on the landing card — tap the star on any other to
              promote it. Every change autosaves.
            </p>
            <div className="mt-4">
              <WineGallery
                images={wine.images || []}
                legacyImage={wine.image}
                onChange={(next) => persist({ images: next })}
              />
            </div>
          </div>

          <div className="md:col-span-2 border-t border-[var(--color-ink-700)] pt-5">
            <ImageField
              label="Legacy single image (fallback)"
              hint="Used only when the gallery above is empty. Once you have a gallery, this becomes a backup."
              value={wine.image || ""}
              onChange={(v) => persist({ image: v })}
              aspect="aspect-[4/5]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function SavePill({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 label-eyebrow transition-colors",
        status === "saving" &&
          "border-[var(--color-ink-600)] bg-[var(--color-ink-850)] text-[var(--color-bone-300)]",
        status === "saved" &&
          "border-[color-mix(in_srgb,var(--color-pearl-300)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-pearl-300)_10%,transparent)] text-[var(--color-pearl-300)]",
        status === "error" &&
          "border-[var(--color-wine-700)] bg-[color-mix(in_srgb,var(--color-wine-700)_15%,transparent)] text-[var(--color-wine-500)]"
      )}
    >
      {status === "saving" && <RefreshCw size={10} className="animate-spin" />}
      {status === "saved" && <Check size={10} />}
      {status === "error" && <AlertTriangle size={10} />}
      {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Failed"}
    </span>
  );
}

interface WineEditorProps {
  wines: Wine[];
  /** Must be awaitable so each row can surface a per-wine save indicator. */
  onChange: (id: Wine["id"], patch: Partial<Wine>) => Promise<void>;
  onReorder: (next: Wine[]) => void;
  onAdd: () => void;
  onDelete: (id: Wine["id"]) => void;
}

export function WineEditor({
  wines,
  onChange,
  onReorder,
  onAdd,
  onDelete,
}: WineEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = wines.findIndex((w) => w.id === active.id);
    const newIndex = wines.findIndex((w) => w.id === over.id);
    onReorder(arrayMove(wines, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      {wines.length === 0 ? (
        <div className="border border-dashed border-[var(--color-ink-600)] bg-[var(--color-ink-850)] p-10 text-center">
          <p className="font-display text-lg text-[var(--color-bone-200)]">
            No wines yet.
          </p>
          <p className="mt-1 text-sm text-[var(--color-bone-500)]">
            Add your first wine to the collection.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={wines.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {wines.map((w) => (
                <WineRow
                  key={w.id}
                  wine={w}
                  onChange={onChange}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <button
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-2 border border-dashed border-[var(--color-ink-600)] py-4 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-pearl-300)] hover:text-[var(--color-bone-100)]"
      >
        <Plus size={14} /> Add a wine
      </button>
    </div>
  );
}
