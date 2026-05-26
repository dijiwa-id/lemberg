import { Marquee } from "../motion/Marquee";
import type { SiteConfig } from "../../lib/types";
import { parseAwardingImages } from "../../lib/types";
import { resolveAsset } from "../../services/api";

interface AwardingRibbonProps {
  config: SiteConfig;
}

export function AwardingRibbon({ config }: AwardingRibbonProps) {
  const awardingImages = parseAwardingImages(config.awardingImages);
  const heading = config.awardingHeading || "Awarding";

  return (
    <section className="bg-[var(--color-ink-900)] py-12 md:py-20 overflow-hidden">
      <div className="container px-6 mb-12">
        <div className="flex flex-col items-center text-center">
          <span className="label-eyebrow text-[var(--color-pearl-300)] mb-4 tracking-[0.2em] uppercase">
            Recognition
          </span>
          <h2 className="font-display text-4xl md:text-5xl italic text-[var(--color-bone-100)]">
            {heading}
          </h2>
        </div>
      </div>

      <div className="border-y border-[var(--border-subtle)] bg-[var(--color-ink-950)]/50 py-10">
        <Marquee speed={40} className="py-2">
          <div className="flex h-16 md:h-24 items-center gap-16 md:gap-24 px-8">
            {awardingImages.length > 0 ? (
              awardingImages.map((img, idx) => (
                <img 
                  key={`${img}-${idx}`}
                  src={resolveAsset(img)} 
                  alt="Award" 
                  className="h-full w-auto object-contain brightness-90 contrast-125 hover:brightness-100 transition-all duration-500 grayscale hover:grayscale-0"
                />
              ))
            ) : (
              // Fallback placeholders if no images are set
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div 
                  key={i}
                  className="h-full aspect-[3/2] bg-[var(--color-ink-800)] rounded flex items-center justify-center border border-[var(--border-subtle)]"
                >
                  <span className="text-[var(--color-bone-800)] font-display italic">Award {i}</span>
                </div>
              ))
            )}
          </div>
        </Marquee>
      </div>
    </section>
  );
}
