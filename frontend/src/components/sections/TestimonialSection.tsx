import { resolveAsset } from "../../services/api";
import { Testimonial } from "../../lib/types";

interface TestimonialSectionProps {
  testimonials: Testimonial[];
}

export function TestimonialSection({ testimonials }: TestimonialSectionProps) {
  if (testimonials.length === 0) return null;

  return (
    <section className="my-24 border-y border-[var(--border-subtle)] py-20 bg-[var(--color-ink-850)]/30">
      <div className="container px-6 md:px-10">
        <h3 className="text-center font-display text-3xl italic text-[var(--color-pearl-300)] mb-16">
          Words from our guests
        </h3>
        
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, idx) => (
            <div key={idx} className="flex flex-col items-center text-center">
              {t.image && (
                <img 
                  src={resolveAsset(t.image)} 
                  alt={t.name}
                  className="w-20 h-20 rounded-full mb-6 object-cover border border-[var(--color-ink-700)]"
                />
              )}
              <blockquote className="body-editorial text-[var(--color-bone-200)] italic mb-6">
                “{t.quote}”
              </blockquote>
              <cite className="label-eyebrow text-[var(--color-pearl-300)] not-italic">
                — {t.name}
              </cite>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
