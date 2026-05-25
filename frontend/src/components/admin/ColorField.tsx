import { X } from "lucide-react";
import { FieldShell } from "./Field";

interface ColorFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function ColorField({
  label,
  hint,
  value,
  onChange,
  placeholder = "#E6DECF",
}: ColorFieldProps) {
  const valid = !value || HEX_RE.test(value);
  const safe = valid && value ? value : "#E6DECF";

  return (
    <FieldShell label={label} hint={hint}>
      <div className="flex items-center gap-4">
        <label className="relative group flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-[var(--color-ink-700)] bg-[var(--color-ink-950)]/40 transition-all hover:border-[var(--color-bone-500)] shadow-inner">
          <span
            aria-hidden
            className="absolute inset-2 shadow-sm transition-transform group-hover:scale-110"
            style={{ backgroundColor: safe }}
          />
          <input
            type="color"
            value={safe}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} colour picker`}
          />
        </label>
        <div className="relative flex-1 group">
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full border border-[var(--color-ink-700)] bg-[var(--color-ink-950)]/40 px-4 py-3 font-mono text-sm text-[var(--color-bone-100)] transition-all placeholder:text-[var(--color-bone-700)] focus:border-[var(--color-pearl-300)] focus:bg-[var(--color-ink-950)]/60 focus:outline-none shadow-inner"
          />
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear colour"
            className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--color-ink-700)] bg-[var(--color-ink-950)]/40 text-[var(--color-bone-500)] transition-all hover:text-[var(--color-wine-500)] hover:border-[var(--color-wine-900)] shadow-inner"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {!valid && value && (
        <p className="text-[10px] uppercase tracking-widest mt-2 text-[var(--color-wine-500)] font-medium">
          Invalid Hex · e.g. #E6DECF
        </p>
      )}
    </FieldShell>
  );
}
