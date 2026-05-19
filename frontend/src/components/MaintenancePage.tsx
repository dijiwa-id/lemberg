import { Monogram } from "./Monogram";
import type { SiteConfig } from "../lib/types";

interface Props {
  config: SiteConfig;
}

export function MaintenancePage({ config }: Props) {
  const message =
    config.maintenanceMessage?.trim() ||
    "The cellar is closed for a moment. Please check back shortly.";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--color-ink-900)] px-6 text-[var(--color-bone-100)]">
      <div className="grain pointer-events-none absolute inset-0 z-0" />

      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center text-center">
        <Monogram className="h-14 w-auto" />

        <p className="label-eyebrow mt-10 text-[var(--color-bone-500)]">
          {config.logoText || "Lemberg"} · {config.defaultLanguage === "af" ? "Tydelik gesluit" : "Closed for the moment"}
        </p>

        <h1 className="mt-6 font-display text-4xl font-light italic leading-tight text-[var(--color-pearl-300)] sm:text-5xl">
          A quiet pause.
        </h1>

        <p className="mt-8 body-editorial max-w-md text-[var(--color-bone-300)]">
          {message}
        </p>

        {config.footerEmail && (
          <a
            href={`mailto:${config.footerEmail}`}
            className="mt-10 inline-flex items-center gap-3 border border-[var(--color-bone-300)]/40 px-6 py-3 label-eyebrow text-[var(--color-bone-100)] transition-colors hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)]"
          >
            Write to us → {config.footerEmail}
          </a>
        )}

        <p className="mt-16 label-eyebrow text-[var(--color-bone-600)]">
          © {new Date().getFullYear()} {config.logoText || "Lemberg"} Winery
        </p>
      </div>
    </div>
  );
}
