import { Link } from "react-router-dom";
import type { SiteConfig } from "../../lib/types";
import { parseBentoImages } from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { Reveal, RevealLines } from "../motion/Reveal";
import { ImageReveal } from "../motion/ImageReveal";

interface ExperienceProps {
  config: SiteConfig;
}

export function Experience({ config }: ExperienceProps) {
  const isBento = config.experienceLayout === "bento";
  const bentoImages = parseBentoImages(config.experienceImages);

  // Build the small facts grid. 'Hours' can now be a multiline string (via ListField
  // in the admin), so we parse it into a flat list of entries to display.
  const hourLines = (config.experienceHours || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const facts: Array<{ label: string; value: string }> = [];
  
  if (hourLines.length > 0) {
    hourLines.forEach((line, i) => {
      facts.push({
        label: i === 0 ? "Hours" : "",
        value: line,
      });
    });
  }

  if (config.experienceTasting?.trim()) {
    facts.push({ label: "Tasting", value: config.experienceTasting });
  }
  if (config.experienceBooking?.trim()) {
    facts.push({ label: "Booking", value: config.experienceBooking });
  }

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
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-24 items-center">
          <div className={isBento ? "lg:col-span-7" : "lg:col-span-6 lg:col-start-1"}>
            {isBento && bentoImages.length > 0 ? (
              <BentoGrid images={bentoImages} />
            ) : (
              <ImageReveal
                src={resolveAsset(config.experienceImage)}
                alt="Tasting experience"
                aspectClass="aspect-[5/6]"
                className="shadow-product"
              />
            )}
          </div>

          <div className={isBento ? "lg:col-span-5" : "lg:col-span-5 lg:col-start-8"}>
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
                <div
                  className="body-editorial"
                  dangerouslySetInnerHTML={{ __html: config.experienceBody }}
                />
              </Reveal>
            )}

            {facts.length > 0 && (
              <Reveal
                y={16}
                delay={0.32}
                className="mt-10 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-6"
              >
                {facts.map((fact, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-6"
                  >
                    <span className="label-eyebrow text-[var(--color-bone-500)]">
                      {fact.label}
                    </span>
                    <span className="text-sm text-[var(--color-bone-200)]">
                      {fact.value}
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

function BentoGrid({ images }: { images: string[] }) {
  const displayImages = images.slice(0, 4);
  
  return (
    <div className="grid grid-cols-12 gap-4">
      {displayImages[0] && (
        <div className="col-span-8 row-span-2">
          <ImageReveal
            src={resolveAsset(displayImages[0])}
            alt=""
            aspectClass="aspect-square"
            className="shadow-2xl"
          />
        </div>
      )}
      {displayImages[1] && (
        <div className="col-span-4 self-end">
          <ImageReveal
            src={resolveAsset(displayImages[1])}
            alt=""
            aspectClass="aspect-[4/5]"
            delay={0.15}
          />
        </div>
      )}
      {displayImages[2] && (
        <div className="col-span-4">
          <ImageReveal
            src={resolveAsset(displayImages[2])}
            alt=""
            aspectClass="aspect-square"
            delay={0.3}
          />
        </div>
      )}
      {displayImages[3] && (
        <div className="col-span-12 mt-4">
          <ImageReveal
            src={resolveAsset(displayImages[3])}
            alt=""
            aspectClass="aspect-[21/9]"
            delay={0.45}
          />
        </div>
      )}
    </div>
  );
}
