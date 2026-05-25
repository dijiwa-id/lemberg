import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: "solid" | "ghost" | "danger";
}

export function Card({
  title,
  description,
  action,
  footer,
  children,
  className,
  bodyClassName,
  variant = "solid",
}: CardProps) {
  const variants = {
    solid: "border-[var(--color-ink-700)] bg-[var(--color-ink-800)]",
    ghost: "border-transparent bg-transparent",
    danger: "border-[var(--color-wine-900)]/30 bg-[var(--color-wine-900)]/5",
  };

  return (
    <section
      className={cn(
        "border transition-all duration-300",
        variants[variant],
        className
      )}
    >
      {(title || description || action) && (
        <header className={cn(
          "flex items-start justify-between gap-4 px-6 py-5",
          variant !== "ghost" && "border-b border-[var(--color-ink-700)]"
        )}>
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-xl font-light tracking-tight text-[var(--color-bone-100)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-bone-400)]">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(variant === "ghost" ? "p-0" : "p-6", bodyClassName)}>
        {children}
      </div>
      {footer && (
        <div className={cn(
          "px-6 py-4 bg-[var(--color-ink-950)]/30",
          variant !== "ghost" && "border-t border-[var(--color-ink-700)]"
        )}>
          {footer}
        </div>
      )}
    </section>
  );
}
