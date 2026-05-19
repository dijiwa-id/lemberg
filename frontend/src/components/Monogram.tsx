import { cn } from "../lib/utils";

interface MonogramProps {
  className?: string;
  title?: string;
}

/**
 * The Lemberg "L" mark — iridescent wedge with a swept tail.
 * Vector reproduction of the approved logo so the brand reads sharp at any size.
 */
export function Monogram({ className = "", title = "Lemberg" }: MonogramProps) {
  return (
    <svg
      viewBox="0 0 64 96"
      role="img"
      aria-label={title}
      className={cn("block", className)}
      fill="none"
    >
      <defs>
        <linearGradient id="iridescent" x1="0" y1="0" x2="64" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C9C4BB" />
          <stop offset="35%" stopColor="#E6DECF" />
          <stop offset="60%" stopColor="#C4D8E3" />
          <stop offset="100%" stopColor="#C9C4BB" />
        </linearGradient>
        <linearGradient id="iridescent-edge" x1="0" y1="0" x2="0" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* Vertical stem */}
      <path
        d="M14 6 L24 6 L24 78 L14 82 Z"
        fill="url(#iridescent)"
      />
      <path
        d="M14 6 L24 6 L24 78 L14 82 Z"
        stroke="url(#iridescent-edge)"
        strokeWidth="0.6"
      />

      {/* Swept tail */}
      <path
        d="M14 78 L24 74 L48 84 C 52 86, 50 92, 44 90 L 14 86 Z"
        fill="url(#iridescent)"
      />
      <path
        d="M14 78 L24 74 L48 84 C 52 86, 50 92, 44 90 L 14 86 Z"
        stroke="url(#iridescent-edge)"
        strokeWidth="0.6"
      />
    </svg>
  );
}
