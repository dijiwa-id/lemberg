import { Link } from "react-router-dom";
import type { SiteConfig } from "../../lib/types";
import { Wordmark } from "../Wordmark";
import { resolveAsset } from "../../services/api";

interface FooterProps {
  config: SiteConfig;
}

export function Footer({ config }: FooterProps) {
  // Derive the established year from the editor's `Est. 1978` style value
  // instead of hard-coding it. Falls back to "1978" if the field is empty
  // or doesn't contain a four-digit year.
  const estYearMatch = (config.philosophyEstYear || "").match(/\d{4}/);
  const estYear = estYearMatch ? estYearMatch[0] : "1978";
  const brandName = config.logoText || "Lemberg";

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--color-ink-950)] text-[var(--color-bone-200)]">
      <div className="mx-auto max-w-[1480px] px-6 py-20 md:px-10 md:py-24">
        <div className="grid gap-16 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5 md:col-start-1">
            <Wordmark
              text={brandName}
              imageSrc={config.logoImage ? resolveAsset(config.logoImage) : undefined}
              font={config.logoFont}
              layout="stacked"
              className="items-start"
            />
            <p className="mt-10 max-w-sm body-editorial text-[var(--color-bone-400)]">
              A small estate at the foot of the Witzenberg. Six wines a year,
              made with quiet conviction since {estYear}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 md:col-span-7 md:col-start-6">
            <div className="space-y-4">
              <span className="label-eyebrow text-[var(--color-bone-500)]">Visit</span>
              <ul className="space-y-2 text-sm text-[var(--color-bone-200)]">
                {config.footerAddress && <li>{config.footerAddress}</li>}
                {config.footerHours && <li>{config.footerHours}</li>}
                <li>
                  <Link
                    to="/reservation"
                    className="link-underline text-[var(--color-bone-100)]"
                  >
                    Book a tasting →
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <span className="label-eyebrow text-[var(--color-bone-500)]">Contact</span>
              <ul className="space-y-2 text-sm text-[var(--color-bone-200)]">
                {config.footerEmail && (
                  <li>
                    <a
                      href={`mailto:${config.footerEmail}`}
                      className="link-underline text-[var(--color-bone-100)]"
                    >
                      {config.footerEmail}
                    </a>
                  </li>
                )}
                {config.footerPhone && (
                  <li>
                    <a
                      href={`tel:${config.footerPhone.replace(/\s+/g, "")}`}
                      className="link-underline text-[var(--color-bone-100)]"
                    >
                      {config.footerPhone}
                    </a>
                  </li>
                )}
                {config.footerInstagram && (
                  <li>
                    <a
                      href={`https://instagram.com/${config.footerInstagram.replace(
                        "@",
                        ""
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="link-underline text-[var(--color-bone-100)]"
                    >
                      {config.footerInstagram}
                    </a>
                  </li>
                )}
              </ul>
            </div>

            <div className="col-span-2 space-y-4">
              <span className="label-eyebrow text-[var(--color-bone-500)]">Explore</span>
              <ul className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-[var(--color-bone-200)]">
                <li>
                  <a href="/#collection" className="link-underline">
                    Collection
                  </a>
                </li>
                <li>
                  <a href="/#estate" className="link-underline">
                    Estate
                  </a>
                </li>
                <li>
                  <a href="/#experience" className="link-underline">
                    Experience
                  </a>
                </li>
                <li>
                  <a href="/#club" className="link-underline">
                    Allocation
                  </a>
                </li>
                <li>
                  <Link to="/page/journal" className="link-underline">
                    Journal
                  </Link>
                </li>
                {/* The /admin "Studio" link was removed from the public
                    footer — exposing the CMS path on every public page
                    invites bot scanning + targeted credential stuffing.
                    Editors reach the studio by typing /admin directly. */}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-start justify-between gap-4 border-t border-[var(--border-subtle)] pt-8 text-[var(--color-bone-500)] md:flex-row md:items-center">
          <p className="label-eyebrow">
            © {new Date().getFullYear()} {brandName} Winery · All rights reserved
          </p>
          <p className="label-eyebrow">Tulbagh Valley · Est. {estYear}</p>
        </div>
      </div>
    </footer>
  );
}
