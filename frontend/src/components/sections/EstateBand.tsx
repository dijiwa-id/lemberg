import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import type { SiteConfig } from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { Reveal, RevealLines } from "../motion/Reveal";

interface EstateBandProps {
  config: SiteConfig;
}

export function EstateBand({ config }: EstateBandProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.1, 1.0]);

  return (
    <section
      ref={ref}
      id="estate"
      data-theme="dark"
      className="relative h-[90vh] min-h-[600px] overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--color-ink-950)]"
    >
      <motion.div className="absolute inset-0" style={{ y, scale }}>
        <img
          src={resolveAsset(config.estateImage)}
          alt="Tulbagh valley"
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(7,7,10,0.35)] via-transparent to-[rgba(7,7,10,0.85)]" />
      </motion.div>

      <div className="relative z-10 mx-auto flex h-full max-w-[1480px] flex-col justify-end px-6 pb-20 md:px-10 md:pb-28">
        <Reveal y={12} className="mb-8 flex items-center gap-4">
          <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
          <span className="label-eyebrow text-[var(--color-bone-200)]">
            {config.estateEyebrow || "The valley"}
          </span>
        </Reveal>

        <h2 className="max-w-3xl font-display text-[clamp(2.4rem,5vw,5rem)] font-light leading-[1] tracking-[-0.015em] text-[var(--color-bone-50)]">
          <RevealLines text={config.estateHeading || ""} perLineStagger={0.12} />
        </h2>

        <Reveal y={16} delay={0.25} className="mt-8 max-w-xl">
          <p className="body-editorial text-[var(--color-bone-200)]">
            {config.estateBody}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
