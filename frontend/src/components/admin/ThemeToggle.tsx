import { Sun, Moon } from "lucide-react";
import type { Theme } from "../../lib/useTheme";
import { cn } from "../../lib/utils";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
  className?: string;
}

export function ThemeToggle({ theme, onToggle, className }: ThemeToggleProps) {
  const next = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${next} mode`;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={cn(
        "group relative flex h-9 w-9 items-center justify-center border border-[var(--color-ink-600)] text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]",
        className
      )}
    >
      <Sun
        size={14}
        className={cn(
          "absolute transition-all duration-300",
          theme === "light"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-50 opacity-0"
        )}
      />
      <Moon
        size={14}
        className={cn(
          "absolute transition-all duration-300",
          theme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-50 opacity-0"
        )}
      />
    </button>
  );
}
