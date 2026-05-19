import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Layout-picker — a row of preview tiles for selecting a layout variant.
 * Used by both CollectionPage (grid layouts) and FeaturedPage (bento
 * shapes); the visual contract is the same: a CSS-only diagram, a label,
 * a one-line description, and a clear active state.
 *
 * Generic over the layout value type so each caller can pass its own
 * string-literal union and stay type-safe.
 */

export interface LayoutOption<T extends string> {
  value: T;
  label: string;
  description: string;
  /** Mini diagram — CSS or SVG; rendered inside an aspect-ratio container. */
  diagram: ReactNode;
}

interface LayoutPickerProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: LayoutOption<T>[];
  /** Aspect ratio for the diagram container. Defaults to 3:2; the bento
   *  picker uses 5:4 to better reflect its taller layouts. */
  diagramAspect?: string;
}

export function LayoutPicker<T extends string>({
  value,
  onChange,
  options,
  diagramAspect = "aspect-[3/2]",
}: LayoutPickerProps<T>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              "flex flex-col gap-4 border p-4 text-left transition-colors",
              active
                ? "border-[var(--color-pearl-300)] bg-[var(--color-ink-850)]"
                : "border-[var(--border-default)] bg-[var(--bg-input)] hover:border-[var(--color-bone-400)]"
            )}
          >
            <div
              className={cn(
                "w-full border border-[var(--border-subtle)] bg-[var(--color-ink-900)] p-2",
                diagramAspect
              )}
            >
              {opt.diagram}
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-base text-[var(--color-bone-100)]">
                  {opt.label}
                </span>
                {active && <Check size={13} className="text-[var(--color-pearl-300)]" />}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-bone-400)]">
                {opt.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
