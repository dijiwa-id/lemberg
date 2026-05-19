import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "pearl" | "wine";
}

export function StatCard({ icon: Icon, label, value, hint, accent = "default" }: StatCardProps) {
  const iconColor =
    accent === "pearl"
      ? "text-[var(--color-pearl-300)]"
      : accent === "wine"
        ? "text-[var(--color-wine-500)]"
        : "text-[var(--color-bone-300)]";

  return (
    <div className="border border-[var(--color-ink-700)] bg-[var(--color-ink-800)] p-5 transition-colors hover:border-[var(--color-ink-600)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-eyebrow text-[var(--color-bone-500)]">{label}</p>
          <p className="mt-3 font-display text-3xl font-light tracking-tight text-[var(--color-bone-100)]">
            {value}
          </p>
          {hint && (
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-bone-500)]">
              {hint}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--color-ink-600)] bg-[var(--color-ink-850)] ${iconColor}`}
          >
            <Icon size={16} />
          </div>
        )}
      </div>
    </div>
  );
}
