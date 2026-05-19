import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "./utils";

export type ToastTone = "info" | "success" | "error";

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  show: (toast: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Drop-in provider — wrap the admin tree once and call `useToast()` anywhere
 * inside to surface success / error / info messages without each call site
 * needing its own banner state.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((cur) => [...cur, { ...t, id }]);
      // Auto-dismiss after 5s — errors stay a bit longer.
      const lifetime = t.tone === "error" ? 7000 : 4500;
      window.setTimeout(() => dismiss(id), lifetime);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (title, description) => show({ tone: "success", title, description }),
      error: (title, description) => show({ tone: "error", title, description }),
      info: (title, description) => show({ tone: "info", title, description }),
      dismiss,
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Soft-fail outside the provider — avoids crashing in error boundaries.
    return {
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}

/* ─────────────────────────────────────────────────────────────────── */

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 border bg-[var(--color-ink-900)] px-4 py-3 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]",
              t.tone === "error"
                ? "border-[var(--color-wine-700)]"
                : t.tone === "success"
                  ? "border-[color-mix(in_srgb,var(--color-pearl-300)_45%,transparent)]"
                  : "border-[var(--color-ink-600)]"
            )}
            role={t.tone === "error" ? "alert" : "status"}
          >
            <ToastIcon tone={t.tone} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--color-bone-100)]">{t.title}</p>
              {t.description && (
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-bone-400)]">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
              className="ml-2 shrink-0 text-[var(--color-bone-500)] transition-colors hover:text-[var(--color-bone-100)]"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  const cls = "mt-0.5 shrink-0";
  if (tone === "error")
    return <AlertTriangle size={14} className={cn(cls, "text-[var(--color-wine-500)]")} />;
  if (tone === "success")
    return <CheckCircle2 size={14} className={cn(cls, "text-[var(--color-pearl-300)]")} />;
  return <Info size={14} className={cn(cls, "text-[var(--color-bone-300)]")} />;
}
