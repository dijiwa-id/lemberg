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
}

export function Card({
  title,
  description,
  action,
  footer,
  children,
  className,
  bodyClassName,
}: CardProps) {
  return (
    <section
      className={cn(
        "border border-[var(--color-ink-700)] bg-[var(--color-ink-800)]",
        className
      )}
    >
      {(title || description || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-ink-700)] px-6 py-5">
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
      <div className={cn("p-6", bodyClassName)}>{children}</div>
      {footer && (
        <div className="border-t border-[var(--color-ink-700)] bg-[var(--color-ink-850)] px-6 py-4">
          {footer}
        </div>
      )}
    </section>
  );
}
