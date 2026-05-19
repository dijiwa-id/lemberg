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
      <div className="flex items-center gap-3">
        <label className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-[var(--border-default)] bg-[var(--bg-input)]">
          <span
            aria-hidden
            className="absolute inset-1"
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
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2.5 font-mono text-sm text-[var(--color-bone-100)] transition-colors placeholder:text-[var(--color-bone-600)] focus:border-[var(--color-pearl-300)] focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear colour"
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--color-bone-400)] transition-colors hover:text-[var(--color-bone-100)]"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {!valid && value && (
        <p className="label-eyebrow mt-2 text-[var(--color-wine-500)]">
          Use a hex value like #E6DECF
        </p>
      )}
    </FieldShell>
  );
}
