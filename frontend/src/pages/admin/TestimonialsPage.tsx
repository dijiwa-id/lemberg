import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { X, Plus, User } from "lucide-react";
import { resolveAsset, uploadFile, errorMessage } from "../../services/api";
import { useToast } from "../../lib/toast";
import type { AdminContext } from "../Admin";
import { parseTestimonials, serializeTestimonials } from "../../lib/types";

export function TestimonialsPage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;
  const testimonials = parseTestimonials(config.testimonials);
  const toast = useToast();

  async function onUpload(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file);
      const next = [...testimonials];
      next[idx].image = url;
      update({ testimonials: serializeTestimonials(next) });
    } catch (ex) {
      toast.error("Upload failed", errorMessage(ex));
    }
  }

  function updateItem(idx: number, field: string, value: string) {
    const next = [...testimonials];
    next[idx] = { ...next[idx], [field]: value };
    update({ testimonials: serializeTestimonials(next) });
  }

  function addItem() {
    update({ testimonials: serializeTestimonials([...testimonials, { image: "", name: "", quote: "" }]) });
  }

  function removeItem(idx: number) {
    update({ testimonials: serializeTestimonials(testimonials.filter((_, i) => i !== idx)) });
  }

  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Add guest testimonials for the Our Story page."
      />
      <div className="grid gap-6">
        {testimonials.map((t, idx) => (
          <Card key={idx} title={`Testimonial ${idx + 1}`}>
            <div className="flex gap-6">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border bg-[var(--color-ink-900)]">
                {t.image ? (
                  <img src={resolveAsset(t.image)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[var(--color-bone-500)]">
                    <User size={32} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => onUpload(idx, e)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <input
                  type="text"
                  value={t.name}
                  onChange={(e) => updateItem(idx, "name", e.target.value)}
                  placeholder="Guest Name"
                  className="rounded border border-[var(--border-subtle)] bg-[var(--color-ink-900)] p-2 text-sm"
                />
                <textarea
                  value={t.quote}
                  onChange={(e) => updateItem(idx, "quote", e.target.value)}
                  placeholder="Quote"
                  className="flex-1 rounded border border-[var(--border-subtle)] bg-[var(--color-ink-900)] p-2 text-sm"
                />
              </div>
              <button onClick={() => removeItem(idx)} className="text-[var(--color-wine-500)]"><X /></button>
            </div>
          </Card>
        ))}
        <button onClick={addItem} className="flex w-full items-center justify-center gap-2 rounded border border-dashed p-4 hover:bg-[var(--color-ink-800)]">
          <Plus /> Add Testimonial
        </button>
      </div>
    </>
  );
}
