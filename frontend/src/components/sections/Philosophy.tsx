import { Link } from "react-router-dom";
import type { SiteConfig } from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { Reveal, RevealLines } from "../motion/Reveal";
import { ImageReveal } from "../motion/ImageReveal";

interface PhilosophyProps {
  config: SiteConfig;
}

export function Philosophy({ config }: PhilosophyProps) {
  return (
    <section
      id="philosophy"
      className="relative bg-[var(--color-ink-900)] px-6 py-32 md:px-10 md:py-44"
    >
      <div className="mx-auto max-w-[1480px]">
        <div className="grid gap-16 md:grid-cols-12 md:gap-20">
          <div className="md:col-span-5 md:col-start-1">
            <Reveal y={12} className="mb-12">
              <div className="flex items-center gap-4">
                <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
                <span className="label-eyebrow text-[var(--color-bone-400)]">
                  {config.philosophyEyebrow}
                </span>
              </div>
            </Reveal>

            <h2 className="font-display text-[clamp(2.2rem,4.6vw,4.2rem)] font-light leading-[1] tracking-[-0.015em] text-[var(--color-bone-50)]">
              <RevealLines text={config.philosophyHeading || ""} perLineStagger={0.1} />
              {config.philosophyHeadingItalic && (
                <span className="block overflow-hidden">
                  <RevealLines
                    text={config.philosophyHeadingItalic}
                    italicLines={[0]}
                    delay={0.25}
                    className="text-[var(--color-pearl-300)]"
                  />
                </span>
              )}
            </h2>

            <div className="mt-12 max-w-md">
              <Reveal y={16} delay={0.2}>
                <p className="body-editorial whitespace-pre-line">{config.philosophyBody}</p>
              </Reveal>
              <Reveal y={16} delay={0.3} className="mt-10">
                <Link
                  to="/page/journal"
                  className="label-meta link-underline inline-block text-[var(--color-bone-200)]"
                >
                  Read our story
                </Link>
              </Reveal>
            </div>
          </div>

          <div className="relative md:col-span-6 md:col-start-7">
            <ImageReveal
              src={resolveAsset(config.philosophyImage)}
              alt="Lemberg vineyard"
              aspectClass="aspect-[4/5]"
              className="shadow-product"
            />
            {config.philosophyEstYear && (
              <Reveal
                y={20}
                delay={0.4}
                className="absolute -left-4 -bottom-6 hidden border border-[var(--border-default)] bg-[var(--color-ink-850)] px-7 py-6 md:block"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="font-display text-2xl italic text-[var(--color-pearl-300)]">
                    {config.philosophyEstYear?.replace(/^Est\.?\s*/i, "") || ""}
                  </span>
                  <span className="label-eyebrow text-[var(--color-bone-400)]">Established</span>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
