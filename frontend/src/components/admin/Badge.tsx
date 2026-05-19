import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export type BadgeTone = "neutral" | "available" | "allocated" | "library" | "sold-out";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "badge-neutral",
  available: "badge-available",
  allocated: "badge-allocated",
  library: "badge-library",
  "sold-out": "badge-sold-out",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 label-eyebrow",
        TONE_CLASS[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusToTone(status?: string): BadgeTone {
  if (status === "available") return "available";
  if (status === "allocated") return "allocated";
  if (status === "library") return "library";
  if (status === "sold-out") return "sold-out";
  return "neutral";
}

export function statusLabel(status?: string): string {
  if (status === "available") return "Available";
  if (status === "allocated") return "Allocated";
  if (status === "library") return "Library";
  if (status === "sold-out") return "Sold out";
  return status || "—";
}
