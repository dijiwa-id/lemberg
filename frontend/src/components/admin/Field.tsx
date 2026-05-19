import type { ReactNode, ChangeEvent } from "react";
import { useRef, useState } from "react";
import { uploadFile, resolveAsset } from "../../services/api";

interface BaseProps {
  label: string;
  hint?: string;
  children?: ReactNode;
}

export function FieldShell({ label, hint, children }: BaseProps) {
  return (
    <label className="block">
      <span className="label-eyebrow block text-[var(--color-bone-500)]">{label}</span>
      {hint && (
        <span className="mt-1 block text-[11px] text-[var(--color-bone-600)]">{hint}</span>
      )}
      <div className="mt-2">{children}</div>
    </label>
  );
}

interface TextFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
}: TextFieldProps) {
  const sharedClass =
    "w-full bg-[var(--bg-input)] border border-[var(--border-default)] focus:border-[var(--color-pearl-300)] focus:outline-none text-sm text-[var(--color-bone-100)] px-3 py-2.5 transition-colors placeholder:text-[var(--color-bone-600)] font-body";
  return (
    <FieldShell label={label} hint={hint}>
      {multiline ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${sharedClass} resize-y leading-relaxed`}
        />
      ) : (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={sharedClass}
        />
      )}
    </FieldShell>
  );
}

interface NumberFieldProps extends BaseProps {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number;
  placeholder?: string;
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  step = 1,
  placeholder,
}: NumberFieldProps) {
  return (
    <FieldShell label={label} hint={hint}>
      <input
        type="number"
        step={step}
        value={value === undefined || value === null ? "" : value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? undefined : Number(v));
        }}
        placeholder={placeholder}
        className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] focus:border-[var(--color-pearl-300)] focus:outline-none text-sm text-[var(--color-bone-100)] px-3 py-2.5 transition-colors placeholder:text-[var(--color-bone-600)] font-body"
      />
    </FieldShell>
  );
}

interface SelectFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

export function SelectField({ label, hint, value, onChange, options }: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint}>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] focus:border-[var(--color-pearl-300)] focus:outline-none text-sm text-[var(--color-bone-100)] px-3 py-2.5 transition-colors font-body"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[var(--color-ink-900)]">
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

interface ImageFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  aspect?: string;
}

export function ImageField({ label, hint, value, onChange, aspect = "aspect-video" }: ImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      const { url } = await uploadFile(f);
      onChange(url);
    } catch (ex: any) {
      setErr("Upload failed — pasting a URL also works");
    } finally {
      setBusy(false);
    }
  }

  const preview = value ? resolveAsset(value) : "";

  return (
    <FieldShell label={label} hint={hint}>
      <div className="space-y-3">
        <div
          className={`relative overflow-hidden border border-dashed border-[var(--border-default)] bg-[var(--bg-input)] ${aspect}`}
        >
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center label-eyebrow text-[var(--color-bone-600)]">
              No image
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute right-2 top-2 label-eyebrow border border-[var(--border-strong)] bg-[var(--color-ink-900)]/85 px-3 py-1.5 text-[var(--color-bone-100)] backdrop-blur transition-colors hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)]"
          >
            {busy ? "Uploading…" : preview ? "Replace" : "Upload"}
          </button>
        </div>
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste an image URL"
          className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] focus:border-[var(--color-pearl-300)] focus:outline-none text-xs text-[var(--color-bone-200)] px-3 py-2 placeholder:text-[var(--color-bone-600)] font-body"
        />
        {err && <p className="label-eyebrow text-[var(--color-wine-500)]">{err}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile}
        />
      </div>
    </FieldShell>
  );
}
