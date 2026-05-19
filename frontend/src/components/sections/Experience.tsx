import { Link } from "react-router-dom";
import type { SiteConfig } from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { Reveal, RevealLines } from "../motion/Reveal";
import { ImageReveal } from "../motion/ImageReveal";

interface ExperienceProps {
  config: SiteConfig;
}

export function Experience({ config }: ExperienceProps) {
  // Build the small facts grid from individual config keys. Each fact is a
  // [label, value] pair and is rendered only when its value is non-empty,
  // so editors can hide a row by clearing it in the studio.
  const facts: Array<[string, string | undefined]> = [
    ["Hours", config.experienceHours],
    ["Tasting", config.experienceTasting],
    ["Booking", config.experienceBooking],
  ].filter(([, v]) => Boolean(v && v.trim())) as Array<[string, string]>;

  // CTA email: prefer the section-specific override, then the footer email.
  const ctaEmail =
    config.experienceCtaEmail?.trim() ||
    config.footerEmail?.trim() ||
    "info@lemberg.co.za";

  return (
    <section
      id="experience"
      className="relative border-t border-[var(--border-subtle)] bg-[var(--color-ink-900)] px-6 py-32 md:px-10 md:py-44"
    >
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-16 md:grid-cols-12 md:gap-20">
          <div className="md:col-span-6 md:col-start-1 md:row-start-1">
            <ImageReveal
              src={resolveAsset(config.experienceImage)}
              alt="Tasting experience"
              aspectClass="aspect-[5/6]"
              className="shadow-product"
            />
          </div>

          <div className="md:col-span-5 md:col-start-8 md:row-start-1 md:self-center">
            <Reveal y={12} className="mb-8 flex items-center gap-4">
              <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
              <span className="label-eyebrow text-[var(--color-bone-400)]">
                {config.experienceEyebrow || "Visit the estate"}
              </span>
            </Reveal>

            <h2 className="font-display text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1] tracking-[-0.015em] text-[var(--color-bone-50)]">
              <RevealLines text={config.experienceHeading || ""} />
              {config.experienceItalic && (
                <RevealLines
                  text={config.experienceItalic}
                  italicLines={[0]}
                  delay={0.18}
                  className="text-[var(--color-pearl-300)]"
                />
              )}
            </h2>

            {config.experienceBody && (
              <Reveal y={16} delay={0.2} className="mt-10 max-w-md">
                <p className="body-editorial">{config.experienceBody}</p>
              </Reveal>
            )}

            {facts.length > 0 && (
              <Reveal
                y={16}
                delay={0.32}
                className="mt-10 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-6"
              >
                {facts.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-6"
                  >
                    <span className="label-eyebrow text-[var(--color-bone-500)]">
                      {label}
                    </span>
                    <span className="text-sm text-[var(--color-bone-200)]">
                      {value}
                    </span>
                  </div>
                ))}
              </Reveal>
            )}

            <Reveal y={16} delay={0.42} className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                to="/reservation"
                className="group inline-flex items-center gap-4 bg-[var(--color-bone-50)] px-8 py-3.5 text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)]"
              >
                <span className="label-meta">
                  {config.experienceCta || "Book a tasting"}
                </span>
                <svg width="20" height="8" viewBox="0 0 20 8" fill="none" aria-hidden>
                  <path
                    d="M1 4h17m0 0L15 1m3 3l-3 3"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="transition-transform duration-500 group-hover:translate-x-1"
                  />
                </svg>
              </Link>
              <a
                href={`mailto:${ctaEmail}`}
                className="label-meta link-underline text-[var(--color-bone-400)]"
              >
                Or write to us →
              </a>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
