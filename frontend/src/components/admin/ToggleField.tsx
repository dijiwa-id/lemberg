import { cn } from "../../lib/utils";

interface ToggleFieldProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export function ToggleField({
  label,
  description,
  value,
  onChange,
  disabled,
}: ToggleFieldProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-8 py-2 transition-all group",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <div className="min-w-0 flex-1">
        <h4 className={cn(
          "font-sans text-sm font-semibold tracking-wide transition-colors",
          value ? "text-[var(--color-bone-50)]" : "text-[var(--color-bone-300)]"
        )}>
          {label}
        </h4>
        {description && (
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-bone-500)] max-w-xl italic">
            {description}
          </p>
        )}
      </div>
      
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => !disabled && onChange(!value)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 outline-none ring-offset-2 ring-offset-[var(--color-ink-900)] focus-visible:ring-2 focus-visible:ring-[var(--color-pearl-300)]",
          value
            ? "bg-[var(--color-pearl-300)] shadow-[0_0_12px_rgba(230,222,207,0.3)]"
            : "bg-[var(--color-ink-700)] hover:bg-[var(--color-ink-600)]"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-[var(--color-ink-900)] shadow-sm ring-0 transition-transform duration-300",
            value ? "translate-x-[24px]" : "translate-x-[3px]"
          )}
        />
      </button>
      
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
    </div>
  );
}
