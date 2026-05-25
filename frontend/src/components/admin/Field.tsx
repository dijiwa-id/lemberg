import type { ReactNode, ChangeEvent } from "react";
import { useRef, useState } from "react";
import ReactQuill from "react-quill";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { uploadFile, resolveAsset } from "../../services/api";

interface BaseProps {
  label: string;
  hint?: string;
  children?: ReactNode;
}

export function FieldShell({ label, hint, children }: BaseProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-bone-500)] font-semibold">
          {label}
        </label>
        {hint && (
          <span className="text-[11px] leading-relaxed text-[var(--color-bone-600)] max-w-2xl font-body italic opacity-80">
            {hint}
          </span>
        )}
      </div>
      <div className="relative group">{children}</div>
    </div>
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
    "w-full bg-[var(--color-ink-950)]/40 border border-[var(--color-ink-700)] focus:border-[var(--color-pearl-300)] focus:bg-[var(--color-ink-950)]/60 focus:outline-none text-sm text-[var(--color-bone-100)] px-4 py-3 transition-all duration-300 placeholder:text-[var(--color-bone-700)] font-body shadow-inner";
  return (
    <FieldShell label={label} hint={hint}>
      {multiline ? (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${sharedClass} resize-y leading-relaxed min-h-[100px]`}
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

export function ListField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const items = value ? value.split("\n") : [""];

  function updateItem(index: number, next: string) {
    const nextItems = [...items];
    nextItems[index] = next;
    onChange(nextItems.join("\n"));
  }

  function removeItem(index: number) {
    const nextItems = items.filter((_, i) => i !== index);
    onChange(nextItems.length > 0 ? nextItems.join("\n") : "");
  }

  function addItem() {
    onChange([...items, ""].join("\n"));
  }

  const sharedClass =
    "w-full bg-[var(--color-ink-950)]/40 border border-[var(--color-ink-700)] focus:border-[var(--color-pearl-300)] focus:bg-[var(--color-ink-950)]/60 focus:outline-none text-sm text-[var(--color-bone-100)] px-4 py-3 transition-all duration-300 placeholder:text-[var(--color-bone-700)] font-body shadow-inner";

  return (
    <FieldShell label={label} hint={hint}>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={placeholder}
              className={sharedClass}
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="flex items-center justify-center aspect-square h-[46px] border border-[var(--color-ink-700)] bg-[var(--color-ink-950)]/40 text-[var(--color-bone-600)] transition-colors hover:border-[var(--color-wine-500)] hover:text-[var(--color-wine-500)]"
              title="Remove item"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="flex w-full items-center justify-center gap-2 border border-dashed border-[var(--color-ink-700)] py-3 text-[10px] uppercase tracking-widest text-[var(--color-bone-500)] transition-colors hover:border-[var(--color-bone-500)] hover:text-[var(--color-bone-100)]"
        >
          <Plus size={12} />
          <span>Add item</span>
        </button>
      </div>
    </FieldShell>
  );
}

interface RichTextFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

const QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "list",
  "bullet",
];

export function RichTextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: RichTextFieldProps) {
  return (
    <FieldShell label={label} hint={hint}>
      <div className="rich-text-container border border-[var(--color-ink-700)] focus-within:border-[var(--color-pearl-300)] transition-colors">
        <ReactQuill
          theme="snow"
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          modules={QUILL_MODULES}
          formats={QUILL_FORMATS}
        />
      </div>
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
        className="w-full bg-[var(--color-ink-950)]/40 border border-[var(--color-ink-700)] focus:border-[var(--color-pearl-300)] focus:bg-[var(--color-ink-950)]/60 focus:outline-none text-sm text-[var(--color-bone-100)] px-4 py-3 transition-all duration-300 placeholder:text-[var(--color-bone-700)] font-body shadow-inner"
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
      <div className="relative">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-[var(--color-ink-950)]/40 border border-[var(--color-ink-700)] focus:border-[var(--color-pearl-300)] focus:bg-[var(--color-ink-950)]/60 focus:outline-none text-sm text-[var(--color-bone-100)] px-4 py-3 transition-all duration-300 font-body shadow-inner pr-10"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[var(--color-ink-900)]">
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-bone-500)]">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
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
      <div className="space-y-4">
        <div
          className={cn(
            "relative overflow-hidden border border-dashed border-[var(--color-ink-700)] bg-[var(--color-ink-950)]/40 transition-colors group-hover:border-[var(--color-bone-500)]",
            aspect
          )}
        >
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--color-bone-600)]">
              <div className="p-3 rounded-full bg-[var(--color-ink-800)]/50 border border-[var(--color-ink-700)]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-[10px] uppercase tracking-widest">No Asset</span>
            </div>
          )}
          <div className="absolute inset-0 bg-[var(--color-ink-950)]/20 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="absolute bottom-4 right-4 flex gap-2">
            {preview && !busy && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="label-eyebrow border border-[var(--color-wine-500)] bg-[var(--color-ink-900)] px-4 py-2 text-[var(--color-wine-500)] backdrop-blur transition-all hover:bg-[var(--color-wine-500)] hover:text-white shadow-lg"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="label-eyebrow border border-[var(--color-pearl-300)] bg-[var(--color-ink-900)] px-4 py-2 text-[var(--color-pearl-300)] backdrop-blur transition-all hover:bg-[var(--color-pearl-300)] hover:text-[var(--color-ink-900)] shadow-lg"
            >
              {busy ? "Uploading…" : preview ? "Replace Asset" : "Choose File"}
            </button>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="…or paste a remote URL"
            className="w-full bg-[var(--color-ink-950)]/40 border border-[var(--color-ink-700)] focus:border-[var(--color-pearl-300)] focus:outline-none text-[11px] text-[var(--color-bone-300)] px-4 py-2.5 transition-all placeholder:text-[var(--color-bone-700)] font-body shadow-inner italic"
          />
        </div>
        {err && <p className="text-[11px] text-[var(--color-wine-500)] italic">{err}</p>}
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
