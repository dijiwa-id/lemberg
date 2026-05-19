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
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-6 py-4 transition-colors",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <div className="min-w-0">
        <p className="text-sm text-[var(--color-bone-100)]">{label}</p>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-bone-400)]">
            {description}
          </p>
        )}
      </div>
      <span
        role="switch"
        aria-checked={value}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onChange(!value);
        }}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center border transition-colors",
          value
            ? "border-[var(--color-pearl-300)] bg-[var(--color-pearl-300)]"
            : "border-[var(--border-default)] bg-[var(--bg-input)]"
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 transform bg-[var(--color-ink-900)] transition-transform",
            value ? "translate-x-[22px]" : "translate-x-[3px]"
          )}
        />
      </span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
    </label>
  );
}
