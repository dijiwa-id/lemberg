import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Star, X, Plus, ImageOff } from "lucide-react";
import { resolveAsset, uploadFile, errorMessage } from "../../services/api";
import { cn } from "../../lib/utils";
import { useToast } from "../../lib/toast";
import type { AwardItem } from "../../lib/types";

interface AwardGalleryProps {
  images: AwardItem[];
  onChange: (next: AwardItem[]) => void;
}

export function AwardGallery({ images, onChange }: AwardGalleryProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setBusy(true);
    try {
      const { url } = await uploadFile(file);
      onChange([...images, { image: url, text: "" }]);
      toast.success("Award logo added", "Staged for publishing.");
    } catch (ex) {
      toast.error("Upload failed", errorMessage(ex));
    } finally {
      setBusy(false);
    }
  }

  function updateText(idx: number, text: string) {
    const next = [...images];
    next[idx] = { ...next[idx], text };
    onChange(next);
  }

  function remove(idx: number) {
    onChange(images.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: number) {
    const next = [...images];
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {images.map((item, idx) => (
          <div 
            key={`${item.image}-${idx}`} 
            className="group flex gap-4 rounded-lg border border-[var(--border-default)] bg-[var(--color-ink-950)]/40 p-3 transition-colors hover:border-[var(--color-pearl-300)]/30"
          >
            <div className="relative h-20 w-20 shrink-0 border border-[var(--border-subtle)] bg-[var(--color-ink-900)]">
              <img
                src={resolveAsset(item.image)}
                alt=""
                className="h-full w-full object-contain p-2"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-wine-600)] text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
            
            <div className="flex flex-1 flex-col gap-2">
              <textarea
                value={item.text || ""}
                onChange={(e) => updateText(idx, e.target.value)}
                placeholder="Caption (e.g. 95 POINTS\nTIM ATKIN MW)"
                rows={2}
                className="w-full resize-none rounded border border-[var(--border-subtle)] bg-[var(--color-ink-900)] p-2 font-sans text-xs uppercase tracking-wider text-[var(--color-bone-200)] focus:border-[var(--color-pearl-300)] focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="rounded border border-[var(--border-subtle)] px-2 py-1 text-[10px] uppercase tracking-tighter text-[var(--color-bone-500)] hover:bg-[var(--color-ink-800)] disabled:opacity-30"
                >
                  Move Up
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === images.length - 1}
                  className="rounded border border-[var(--border-subtle)] px-2 py-1 text-[10px] uppercase tracking-tighter text-[var(--color-bone-500)] hover:bg-[var(--color-ink-800)] disabled:opacity-30"
                >
                  Move Down
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex h-20 items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--color-ink-700)] bg-[var(--color-ink-950)]/20 text-[var(--color-bone-400)] transition-colors hover:border-[var(--color-pearl-300)] hover:bg-[var(--color-ink-950)]/40 hover:text-[var(--color-bone-100)]"
        >
          {busy ? (
            <span className="label-eyebrow animate-pulse">Uploading logo…</span>
          ) : (
            <>
              <Plus size={20} />
              <span className="label-eyebrow font-semibold uppercase tracking-widest">Add Award Logo</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
