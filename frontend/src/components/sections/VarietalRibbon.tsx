import { Marquee } from "../motion/Marquee";

const VARIETALS = [
  "Cabernet Sauvignon",
  "Pinotage",
  "Chenin Blanc",
  "Pinot Noir",
  "Syrah",
  "Hárslevelű",
  "Mourvèdre",
  "Grenache",
  "Cabernet Franc",
  "Merlot",
];

export function VarietalRibbon() {
  return (
    <div className="border-y border-[var(--border-subtle)] bg-[var(--color-ink-900)]">
      <Marquee speed={48} className="py-8">
        {VARIETALS.map((v) => (
          <span
            key={v}
            className="flex shrink-0 items-center gap-12 font-display text-2xl italic text-[var(--color-bone-300)] md:text-3xl"
          >
            {v}
            <span className="block h-1 w-1 rounded-full bg-[var(--color-pearl-300)]/60" />
          </span>
        ))}
      </Marquee>
    </div>
  );
}
