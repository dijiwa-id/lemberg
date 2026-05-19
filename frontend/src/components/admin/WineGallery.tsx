import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Star, X, Plus, ImageOff } from "lucide-react";
import { resolveAsset, uploadFile, errorMessage } from "../../services/api";
import { cn } from "../../lib/utils";
import { useToast } from "../../lib/toast";

interface WineGalleryProps {
  /** Current gallery array. First entry is the default. */
  images: string[];
  /** Persisted on every change (add/remove/reorder/set-default). */
  onChange: (next: string[]) => void;
  /** Legacy single-image hint — shown as the default thumbnail when the
   *  array is empty so editors see what's currently on the landing card. */
  legacyImage?: string;
}

/**
 * Editorial gallery editor for a single wine. Designed for the WineEditor
 * expanded row.
 *
 * Behaviour:
 * - Upload appends to `images`. Each upload persists immediately via
 *   `onChange` so the editor always sees the truth.
 * - Click the star on any non-default tile → it moves to index 0 and becomes
 *   the landing-card default.
 * - × removes the tile. Confirmation only when removing the default.
 * - If the gallery is empty, falls back to displaying `legacyImage` as a
 *   read-only preview with a "Migrate to gallery" CTA that copies it into
 *   the array.
 */
export function WineGallery({ images, onChange, legacyImage }: WineGalleryProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  const hasGallery = images.length > 0;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-uploading the same filename
    setBusy(true);
    setErr(null);
    try {
      const { url } = await uploadFile(file);
      onChange([...images, url]);
      toast.success("Image added", "Saved to the gallery.");
    } catch (ex) {
      const msg = errorMessage(ex, "Upload failed.");
      setErr(msg);
      toast.error("Upload failed", msg);
    } finally {
      setBusy(false);
    }
  }

  function setAsDefault(idx: number) {
    if (idx === 0 || idx >= images.length) return;
    const next = [...images];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    onChange(next);
    toast.success("Default updated", "This image now leads the landing card.");
  }

  function remove(idx: number) {
    const isDefault = idx === 0 && images.length > 1;
    if (isDefault) {
      if (
        !confirm(
          "Removing the default image — the next one in the gallery will take its place. Continue?"
        )
      ) {
        return;
      }
    }
    onChange(images.filter((_, i) => i !== idx));
  }

  function migrateLegacy() {
    if (!legacyImage) return;
    onChange([legacyImage]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="label-eyebrow text-[var(--color-bone-500)]">
          Gallery {hasGallery && `· ${images.length}`}
        </p>
        {hasGallery && (
          <p className="label-eyebrow text-[var(--color-bone-500)]">
            Tap <Star size={10} className="inline" /> to set as default
          </p>
        )}
      </div>

      {!hasGallery && legacyImage && (
        <div className="flex flex-wrap items-center gap-4 border border-dashed border-[var(--color-ink-600)] bg-[var(--color-ink-850)] p-4">
          <div className="h-20 w-16 shrink-0 overflow-hidden border border-[var(--border-subtle)] bg-[var(--color-ink-900)]">
            <img
              src={resolveAsset(legacyImage)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-[var(--color-bone-200)]">
              Currently using a single image.
            </p>
            <p className="mt-1 text-xs text-[var(--color-bone-500)]">
              Convert it into a gallery to add more shots or change the
              landing-card default.
            </p>
          </div>
          <button
            type="button"
            onClick={migrateLegacy}
            className="border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
          >
            Convert
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {images.map((url, idx) => {
          const isDefault = idx === 0;
          return (
            <div
              key={`${url}-${idx}`}
              className={cn(
                "group relative aspect-square overflow-hidden border bg-[var(--color-ink-900)] transition-colors",
                isDefault
                  ? "border-[var(--color-pearl-300)]"
                  : "border-[var(--border-default)] hover:border-[var(--color-bone-400)]"
              )}
            >
              <img
                src={resolveAsset(url)}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />

              {/* Default badge */}
              {isDefault && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 border border-[var(--color-pearl-300)] bg-[var(--color-ink-950)]/80 px-2 py-0.5 label-eyebrow text-[var(--color-pearl-300)] backdrop-blur">
                  <Star size={9} fill="currentColor" /> Default
                </span>
              )}

              {/* Set-as-default action (on non-default tiles) */}
              {!isDefault && (
                <button
                  type="button"
                  onClick={() => setAsDefault(idx)}
                  aria-label="Set as default"
                  title="Set as default landing image"
                  className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center border border-[var(--border-subtle)] bg-[var(--color-ink-950)]/70 text-[var(--color-bone-300)] opacity-0 backdrop-blur transition-opacity hover:text-[var(--color-pearl-300)] focus:opacity-100 group-hover:opacity-100"
                >
                  <Star size={11} />
                </button>
              )}

              {/* Remove action */}
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label="Remove image"
                title="Remove from gallery"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center border border-[var(--border-subtle)] bg-[var(--color-ink-950)]/70 text-[var(--color-bone-300)] opacity-0 backdrop-blur transition-opacity hover:text-[var(--color-wine-500)] focus:opacity-100 group-hover:opacity-100"
              >
                <X size={11} />
              </button>

              <span className="absolute bottom-1 right-2 font-mono text-[10px] text-[var(--color-bone-500)]">
                {idx + 1} / {images.length}
              </span>
            </div>
          );
        })}

        {/* Upload tile */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label="Upload image"
          className="flex aspect-square flex-col items-center justify-center gap-2 border border-dashed border-[var(--color-ink-600)] bg-[var(--color-ink-900)] text-[var(--color-bone-400)] transition-colors hover:border-[var(--color-pearl-300)] hover:text-[var(--color-bone-100)] disabled:opacity-60"
        >
          {busy ? (
            <span className="label-eyebrow">Uploading…</span>
          ) : (
            <>
              <Plus size={16} />
              <span className="label-eyebrow">Add image</span>
            </>
          )}
        </button>

        {/* Empty state when no gallery AND no legacy image */}
        {!hasGallery && !legacyImage && (
          <div className="col-span-2 flex aspect-square flex-col items-center justify-center gap-2 border border-dashed border-[var(--color-ink-600)] bg-[var(--color-ink-850)] text-[var(--color-bone-500)] sm:col-span-3 md:col-span-4">
            <ImageOff size={18} className="opacity-60" />
            <span className="label-eyebrow">No images yet</span>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
      {err && (
        <p className="label-eyebrow text-[var(--color-wine-500)]">{err}</p>
      )}
    </div>
  );
}
