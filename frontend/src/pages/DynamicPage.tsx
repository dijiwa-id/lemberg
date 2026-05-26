import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Nav } from "../components/Nav";
import { AgeGate } from "../components/AgeGate";
import { Footer } from "../components/sections/Footer";
import { Reveal, RevealLines } from "../components/motion/Reveal";
import { ImageReveal } from "../components/motion/ImageReveal";
import { TestimonialSection } from "../components/sections/TestimonialSection";
import {
  FALLBACK_CONFIG,
  FALLBACK_MENU,
  configFlag,
  mergeRemoteConfig,
  parseTestimonials,
  type MenuItem,
  type MenuItemNode,
  type SiteConfig,
} from "../lib/types";
import {
  fetchConfig,
  fetchMenu,
  fetchMenuPage,
  resolveAsset,
} from "../services/api";
import { useDocumentMeta, useLandingTheme } from "../lib/useDocumentMeta";
import { cacheBrand } from "../lib/brandCache";
import {
  readCachedConfig,
  readCachedMenu,
  writeCachedConfig,
  writeCachedMenu,
} from "../lib/dataCache";

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

export default function DynamicPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  // Read from the cross-page cache so the header / footer / theme render
  // with the editor's real brand on first paint — no Unsplash flash.
  const [config, setConfig] = useState<SiteConfig>(
    () => readCachedConfig() || FALLBACK_CONFIG
  );
  const [menu, setMenu] = useState<MenuItemNode[]>(
    () => readCachedMenu() || FALLBACK_MENU
  );
  const [page, setPage] = useState<MenuItem | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "not_found">("loading");

  useEffect(() => {
    fetchConfig()
      .then((c) => {
        if (c && Object.keys(c).length > 0) {
          const merged = mergeRemoteConfig(c);
          setConfig(merged);
          writeCachedConfig(merged);
          cacheBrand(merged);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchMenu()
      .then((m) => {
        if (Array.isArray(m) && m.length > 0) {
          setMenu(m);
          writeCachedMenu(m);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!slug) {
      setStatus("not_found");
      return;
    }
    setStatus("loading");
    fetchMenuPage(slug)
      .then((p) => {
        setPage(p);
        setStatus("ok");
        window.scrollTo({ top: 0, behavior: "auto" });
      })
      .catch(() => setStatus("not_found"));
  }, [slug]);

  // Reuse the landing page's meta hook so each dynamic page also gets a
  // sensible title / description / og.
  const metaConfig: SiteConfig = page
    ? {
        ...config,
        metaTitle: `${page.pageHeading || page.label} — ${config.logoText || "Lemberg"}`,
        metaDescription:
          stripHtml(page.pageBody || "").slice(0, 160) ||
          config.siteDescription,
      }
    : config;
  useDocumentMeta(metaConfig);

  const theme = useLandingTheme(config.landingTheme);
  const showAnnouncementBar = configFlag(config.showAnnouncementBar, true);

  const accentStyle: React.CSSProperties = config.brandAccent
    ? ({ "--color-pearl-300": config.brandAccent } as React.CSSProperties)
    : {};

  if (configFlag(config.maintenanceMode, false)) {
    return (
      <div data-theme={theme} style={accentStyle}>
        {/* Maintenance mode applies to all public routes */}
        <MaintenancePlaceholder config={config} />
      </div>
    );
  }

  return (
    <div
      data-theme={theme}
      style={accentStyle}
      className="relative min-h-screen bg-[var(--color-ink-900)] text-[var(--color-bone-100)]"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-[var(--color-bone-50)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-ink-900)]"
      >
        Skip to content
      </a>

      <AgeGate config={config} />
      <Nav
        config={config}
        menu={menu}
        showAnnouncementBar={showAnnouncementBar}
      />

      <main
        id="main"
        className="mx-auto max-w-[1100px] px-6 pt-44 pb-32 md:px-10 md:pt-52 md:pb-44"
      >
        {status === "loading" && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <span className="label-eyebrow text-[var(--color-bone-500)]">Loading…</span>
          </div>
        )}

        {status === "not_found" && (
          <div className="flex min-h-[40vh] flex-col items-start justify-center">
            <span className="label-eyebrow text-[var(--color-bone-500)]">404</span>
            <h1 className="mt-4 font-display text-5xl font-light italic text-[var(--color-pearl-300)]">
              Out of vintage.
            </h1>
            <p className="mt-6 max-w-md body-editorial text-[var(--color-bone-300)]">
              This page is not in the cellar — it may have been moved or never
              existed. Editors can create it from the studio's Header menu.
            </p>
            <Link
              to="/"
              className="mt-10 inline-flex items-center gap-3 border border-[var(--color-bone-300)]/40 px-7 py-3 label-eyebrow text-[var(--color-bone-100)] transition-colors hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)]"
            >
              <ArrowLeft size={13} /> Return home
            </Link>
          </div>
        )}

        {status === "ok" && page && (
          <article>
            <Reveal y={10} className="mb-6">
              <Link
                to="/"
                className="label-eyebrow inline-flex items-center gap-2 text-[var(--color-bone-500)] transition-colors hover:text-[var(--color-bone-100)]"
              >
                <ArrowLeft size={11} /> Back to home
              </Link>
            </Reveal>

            <header className="mb-14 md:mb-20">
              {page.pageEyebrow && (
                <Reveal y={10} delay={0.05}>
                  <div className="mb-8 flex items-center gap-4">
                    <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
                    <span className="label-eyebrow text-[var(--color-bone-400)]">
                      {page.pageEyebrow}
                    </span>
                  </div>
                </Reveal>
              )}

              <h1 className="font-display text-[clamp(2.6rem,6vw,5.5rem)] font-light leading-[1] tracking-[-0.015em] text-[var(--color-bone-50)]">
                <RevealLines
                  text={page.pageHeading || page.label}
                  italicLines={[]}
                  perLineStagger={0.12}
                />
              </h1>
            </header>

            {page.pageImage && (
              <Reveal y={20} delay={0.1} className="mb-16 md:mb-24">
                <ImageReveal
                  src={resolveAsset(page.pageImage)}
                  alt={page.pageHeading || page.label}
                  aspectClass="aspect-[16/9]"
                  className="shadow-product"
                />
              </Reveal>
            )}

            {page.pageBody && (
              <Reveal y={14} delay={0.06} className="max-w-[680px]">
                <div
                  className="body-editorial text-[var(--color-bone-200)]"
                  dangerouslySetInnerHTML={{ __html: page.pageBody }}
                />
              </Reveal>
            )}

            {page.target === "our-story" && config.testimonials && (
              <TestimonialSection testimonials={parseTestimonials(config.testimonials)} />
            )}

            {/* Sibling pages — surface other pages under the same parent */}
            <RelatedPages slug={slug} menu={menu} />

            <Reveal y={16} delay={0.3} className="mt-24 border-t border-[var(--border-subtle)] pt-10">
              <Link
                to="/"
                className="group inline-flex items-center gap-4 border border-[var(--color-bone-300)]/40 px-8 py-3.5 text-[var(--color-bone-100)] transition-colors hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)]"
              >
                <span className="label-meta">Return to the home page</span>
                <motion.span
                  className="inline-block"
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                >
                  →
                </motion.span>
              </Link>
            </Reveal>
          </article>
        )}
      </main>

      <Footer config={config} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function RelatedPages({
  slug,
  menu,
}: {
  slug: string;
  menu: MenuItemNode[];
}) {
  // Find the parent of this slug, then sibling page-items.
  let parent: MenuItemNode | undefined;
  let siblings: MenuItem[] = [];

  for (const node of menu) {
    if (node.kind === "page" && node.target === slug) {
      parent = node;
      siblings = node.children.filter(
        (c) => c.kind === "page" && c.isVisible && c.target !== slug
      );
      break;
    }
    const child = node.children.find(
      (c) => c.kind === "page" && c.target === slug
    );
    if (child) {
      parent = node;
      siblings = node.children.filter(
        (c) => c.kind === "page" && c.isVisible && c.target !== slug
      );
      break;
    }
  }

  if (!parent || siblings.length === 0) return null;

  return (
    <Reveal y={20} delay={0.2} className="mt-24 border-t border-[var(--border-subtle)] pt-12">
      <p className="label-eyebrow text-[var(--color-bone-500)]">
        More from {parent.label}
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {siblings.map((s) => (
          <li key={s.id}>
            <Link
              to={`/page/${s.target}`}
              className="group block border border-[var(--border-subtle)] bg-[var(--color-ink-850)] p-6 transition-colors hover:border-[var(--color-pearl-300)]"
            >
              {s.pageEyebrow && (
                <span className="label-eyebrow text-[var(--color-bone-500)]">
                  {s.pageEyebrow}
                </span>
              )}
              <p className="mt-3 font-display text-2xl font-light text-[var(--color-bone-100)] group-hover:text-[var(--color-pearl-300)]">
                {s.pageHeading || s.label}
              </p>
              {s.pageBody && (
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[var(--color-bone-400)]">
                  {stripHtml(s.pageBody)}
                </p>
              )}
              <span className="mt-4 inline-block label-eyebrow text-[var(--color-bone-300)] transition-colors group-hover:text-[var(--color-pearl-300)]">
                Read →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

// Inline maintenance placeholder so dynamic pages also honour maintenance mode.
function MaintenancePlaceholder({ config }: { config: SiteConfig }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-ink-900)] px-6 text-center text-[var(--color-bone-100)]">
      <div className="max-w-md">
        <p className="label-eyebrow text-[var(--color-bone-500)]">
          {config.logoText || "Lemberg"}
        </p>
        <h1 className="mt-6 font-display text-4xl font-light italic text-[var(--color-pearl-300)]">
          A quiet pause.
        </h1>
        <div
          className="mt-6 body-editorial text-[var(--color-bone-300)]"
          dangerouslySetInnerHTML={{ __html: config.maintenanceMessage || "The cellar is closed for a moment. Please check back shortly." }}
        />
      </div>
    </div>
  );
}
