import { ExternalLink, Heart } from "lucide-react";
import { Monogram } from "../Monogram";
import { DEFAULT_STUDIO_IDENTITY, type StudioIdentity } from "../../lib/studioIdentity";
import { resolveAsset } from "../../services/api";

interface AdminFooterProps {
  studio?: StudioIdentity;
}

/**
 * Editorial closing element for the studio. Anchors the bottom of every
 * admin page so short pages (Dashboard, Brand, Club) don't leave a slab of
 * empty canvas after the last card — and long pages get a tidy "end of
 * content" stamp instead of fading into nothing.
 *
 * Placed by DashboardLayout inside the scrollable <main> so it sits below
 * the page content but inside the studio shell. Uses semantic <footer>.
 */
export function AdminFooter({ studio }: AdminFooterProps = {}) {
  const id = studio || DEFAULT_STUDIO_IDENTITY;
  const logoUrl = id.logo ? resolveAsset(id.logo) : "";
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--color-ink-700)] bg-[var(--color-ink-900)] px-5 py-6 lg:px-10">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-4 text-[var(--color-bone-500)]">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-5 w-5 object-contain opacity-50" />
          ) : (
            <Monogram className="h-5 w-auto opacity-50" />
          )}
          <div className="flex flex-col gap-0.5 leading-tight">
            <span className="label-eyebrow">
              {id.name} {id.edition && <>· {id.edition}</>}
            </span>
            <span className="text-[10px] text-[var(--color-bone-600)]">
              {id.tagline} · © {year}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <span className="hidden items-center gap-1.5 label-eyebrow text-[var(--color-bone-600)] sm:flex">
            <Heart size={10} className="text-[var(--color-pearl-300)]/60" />
            Crafted in Tulbagh
          </span>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 label-eyebrow transition-colors hover:text-[var(--color-bone-100)]"
          >
            View public site
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </footer>
  );
}
