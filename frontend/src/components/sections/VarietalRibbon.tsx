import { Marquee } from "../motion/Marquee";
import type { SiteConfig } from "../../lib/types";
import { parseRibbonImages } from "../../lib/types";
import { resolveAsset } from "../../services/api";

interface VarietalRibbonProps {
  config: SiteConfig;
}

export function VarietalRibbon({ config }: VarietalRibbonProps) {
  const isImage = config.ribbonFormat === "image";
  const rawText = config.ribbonText || "";
  
  // If it's text, split by typical separators or just render the text directly.
  const segments = rawText.split("·").map(s => s.trim()).filter(Boolean);
  
  const ribbonImages = parseRibbonImages(config.ribbonImages);

  return (
    <div className="border-y border-[var(--border-subtle)] bg-[var(--color-ink-900)]">
      <Marquee speed={48} className={isImage ? "py-0" : "py-8"}>
        {isImage ? (
          <div className="flex h-32 md:h-48 items-center py-4 gap-16 px-8">
            {ribbonImages.length > 0 ? (
              ribbonImages.map((img, idx) => (
                <img 
                  key={`${img}-${idx}`}
                  src={resolveAsset(img)} 
                  alt="Running visual" 
                  className="h-full w-auto object-contain"
                />
              ))
            ) : (
              <span className="text-[var(--color-bone-500)] italic">No images selected</span>
            )}
          </div>
        ) : (
          segments.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="flex shrink-0 items-center gap-12 font-display text-2xl italic text-[var(--color-bone-300)] md:text-3xl"
            >
              {v}
              <span className="block h-1 w-1 rounded-full bg-[var(--color-pearl-300)]/60" />
            </span>
          ))
        )}
      </Marquee>
    </div>
  );
}
