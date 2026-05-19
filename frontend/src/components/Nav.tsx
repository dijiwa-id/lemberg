import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wordmark } from "./Wordmark";
import { cn } from "../lib/utils";
import type { MenuItem, MenuItemNode, SiteConfig } from "../lib/types";
import { resolveAsset } from "../services/api";

interface NavProps {
  config: SiteConfig;
  menu?: MenuItemNode[];
  showAnnouncementBar?: boolean;
}

export function Nav({
  config,
  menu = [],
  showAnnouncementBar = true,
}: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<Record<number, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();

  const hasAnnouncement =
    showAnnouncementBar && Boolean(config.navAnnouncement);

  const visibleMenu = menu.filter((m) => m.isVisible);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Keyboard-only users can dismiss the mobile drawer with Escape, matching
  // the convention used by the WineDetailModal and most modal patterns.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /**
   * Resolve a click on a menu item. Anchors smooth-scroll when we're already
   * on the landing page, otherwise navigate home + then scroll. Pages use
   * react-router. External opens in a new tab.
   */
  function handleClick(item: MenuItem, e: React.MouseEvent) {
    setOpen(false);
    if (item.kind === "external") return;
    e.preventDefault();
    if (item.kind === "page") {
      navigate(`/page/${item.target}`);
      return;
    }
    const hash = item.target.startsWith("#") ? item.target : `#${item.target}`;
    if (location.pathname !== "/") {
      navigate(`/${hash}`);
    } else {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.history.replaceState(null, "", hash);
    }
  }

  function itemHref(item: MenuItem): string {
    if (item.kind === "page") return `/page/${item.target}`;
    if (item.kind === "external") return item.target;
    return item.target.startsWith("#") ? item.target : `#${item.target}`;
  }

  function itemTarget(item: MenuItem): string | undefined {
    return item.kind === "external" ? "_blank" : undefined;
  }

  function isItemActive(item: MenuItem): boolean {
    if (item.kind === "page" && location.pathname === `/page/${item.target}`) {
      return true;
    }
    return false;
  }

  return (
    <>
      {/* Top announcement strip */}
      {hasAnnouncement && (
        <div
          className={cn(
            "fixed top-0 left-0 right-0 z-[60] border-b border-[var(--border-subtle)] bg-[var(--color-ink-950)]/95 backdrop-blur-md transition-all duration-500",
            scrolled ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
          )}
        >
          <div className="mx-auto flex h-9 max-w-[1480px] items-center justify-center px-6 text-center text-[var(--color-bone-300)] label-eyebrow">
            <span className="opacity-80">{config.navAnnouncement}</span>
          </div>
        </div>
      )}

      {/*
        Theme override: when not scrolled, the header sits transparent over
        the dark hero image. In light landing mode, the editor's chosen
        light-theme tokens would turn nav text dark-on-dark and invisible.
        Forcing `data-theme="dark"` on the header keeps every var inside
        (text, border, dropdown, CTA outline) resolved to dark-theme values
        — white-ish on the hero — until the user starts scrolling, at which
        point the override is dropped and the header inherits the landing
        theme so it sits readably on the parchment/blurred backdrop.
      */}
      <header
        data-theme={scrolled ? undefined : "dark"}
        className={cn(
          "fixed left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "top-0 border-b border-[var(--border-subtle)] bg-[var(--color-ink-900)]/85 backdrop-blur-xl"
            : cn(
                "border-b border-transparent",
                hasAnnouncement ? "top-9" : "top-0"
              )
        )}
      >
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-6 py-5 md:gap-10 md:px-10 md:py-6">
          <Link
            to="/"
            className="flex items-center gap-3"
            aria-label={`${config.logoText || "Lemberg"} home`}
          >
            <Wordmark
              text={config.logoText || "Lemberg"}
              imageSrc={config.logoImage ? resolveAsset(config.logoImage) : undefined}
              font={config.logoFont}
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {visibleMenu.map((node) => {
              const visibleChildren = (node.children || []).filter(
                (c) => c.isVisible
              );
              const hasChildren = visibleChildren.length > 0;
              const isOpen = hoverId === node.id;
              const isActive = isItemActive(node);

              return (
                <div
                  key={node.id}
                  className="relative"
                  onMouseEnter={() => hasChildren && setHoverId(node.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onFocus={() => hasChildren && setHoverId(node.id)}
                  onBlur={(e) => {
                    // Only close if focus leaves the entire group
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setHoverId(null);
                    }
                  }}
                >
                  <a
                    href={itemHref(node)}
                    target={itemTarget(node)}
                    rel={node.kind === "external" ? "noreferrer" : undefined}
                    onClick={(e) => handleClick(node, e)}
                    className={cn(
                      "group relative inline-flex items-center gap-2 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors",
                      isActive || (isOpen && hasChildren)
                        ? "text-[var(--color-bone-100)]"
                        : "text-[var(--color-bone-200)]/75 hover:text-[var(--color-bone-100)]"
                    )}
                    aria-haspopup={hasChildren ? "menu" : undefined}
                    aria-expanded={hasChildren ? isOpen : undefined}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span>{node.label}</span>

                    {hasChildren && (
                      <svg
                        width="9"
                        height="7"
                        viewBox="0 0 9 7"
                        fill="none"
                        aria-hidden
                        className={cn(
                          "transition-transform duration-300 opacity-60",
                          isOpen && "rotate-180 opacity-100"
                        )}
                      >
                        <path
                          d="M1 1.5L4.5 5L8 1.5"
                          stroke="currentColor"
                          strokeWidth="1"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}

                    {/* Underline */}
                    <span
                      className={cn(
                        "pointer-events-none absolute left-4 right-4 -bottom-px h-px bg-current transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        isActive
                          ? "scale-x-100"
                          : "scale-x-0 origin-left group-hover:scale-x-100"
                      )}
                    />
                  </a>

                  <AnimatePresence>
                    {hasChildren && isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute left-1/2 top-full z-[55] mt-2 -translate-x-1/2 min-w-[240px] border border-[var(--border-subtle)] bg-[var(--color-ink-900)]/95 backdrop-blur-xl shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]"
                        role="menu"
                      >
                        {/* Visual link from parent to dropdown — invisible hover bridge */}
                        <div
                          aria-hidden
                          className="absolute -top-2 left-0 right-0 h-2"
                        />
                        <ul className="py-2">
                          {visibleChildren.map((child) => {
                            const childActive = isItemActive(child);
                            return (
                              <li key={child.id}>
                                <a
                                  href={itemHref(child)}
                                  target={itemTarget(child)}
                                  rel={
                                    child.kind === "external"
                                      ? "noreferrer"
                                      : undefined
                                  }
                                  onClick={(e) => handleClick(child, e)}
                                  role="menuitem"
                                  className={cn(
                                    "group flex items-center justify-between gap-4 px-5 py-2.5 text-sm transition-colors",
                                    childActive
                                      ? "bg-[var(--color-ink-850)] text-[var(--color-bone-100)]"
                                      : "text-[var(--color-bone-300)] hover:bg-[var(--color-ink-850)] hover:text-[var(--color-bone-100)]"
                                  )}
                                >
                                  <span>{child.label}</span>
                                  <svg
                                    width="14"
                                    height="6"
                                    viewBox="0 0 14 6"
                                    fill="none"
                                    aria-hidden
                                    className="shrink-0 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-80"
                                  >
                                    <path
                                      d="M0.5 3h12m0 0L10 0.5m2.5 2.5L10 5.5"
                                      stroke="currentColor"
                                      strokeWidth="1"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-5 md:flex">
            <a
              href="/#club"
              onClick={(e) =>
                handleClick(
                  {
                    id: -1,
                    label: "",
                    kind: "anchor",
                    target: "#club",
                    order: 0,
                    isVisible: true,
                  } as MenuItem,
                  e
                )
              }
              className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-bone-200)]/70 link-underline hover:text-[var(--color-bone-100)]"
            >
              Allocation
            </a>
            <Link
              to="/reservation"
              className="group inline-flex items-center gap-3 border border-[var(--color-bone-300)]/40 px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] text-[var(--color-bone-100)] transition-colors hover:bg-[var(--color-bone-100)] hover:text-[var(--color-ink-900)]"
            >
              Book a tasting
              <svg
                width="14"
                height="6"
                viewBox="0 0 14 6"
                fill="none"
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                <path
                  d="M0.5 3h12m0 0L10 0.5m2.5 2.5L10 5.5"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center text-[var(--color-bone-100)] md:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            <span className="relative block h-3 w-6">
              <span
                className={cn(
                  "absolute left-0 top-0 h-px w-6 bg-current transition-transform duration-300",
                  open && "translate-y-1.5 rotate-45"
                )}
              />
              <span
                className={cn(
                  "absolute left-0 bottom-0 h-px w-6 bg-current transition-transform duration-300",
                  open && "-translate-y-1.5 -rotate-45"
                )}
              />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 overflow-y-auto bg-[var(--color-ink-950)] pt-28 md:hidden"
          >
            <div className="flex flex-col gap-5 px-8 pb-16">
              {visibleMenu.map((node, i) => {
                const visibleChildren = (node.children || []).filter(
                  (c) => c.isVisible
                );
                const hasChildren = visibleChildren.length > 0;
                const expanded = expandedMobile[node.id] ?? hasChildren;
                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.06 * i,
                      duration: 0.55,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="border-b border-[var(--border-subtle)] pb-5"
                  >
                    <div className="flex items-center justify-between">
                      <a
                        href={itemHref(node)}
                        target={itemTarget(node)}
                        rel={node.kind === "external" ? "noreferrer" : undefined}
                        onClick={(e) => handleClick(node, e)}
                        className="inline-flex items-center gap-3 font-display text-3xl font-light leading-none text-[var(--color-bone-100)]"
                      >
                        {node.label}
                        {!hasChildren && (
                          <svg
                            width="14"
                            height="6"
                            viewBox="0 0 14 6"
                            fill="none"
                            aria-hidden
                            className="opacity-60"
                          >
                            <path
                              d="M0.5 3h12m0 0L10 0.5m2.5 2.5L10 5.5"
                              stroke="currentColor"
                              strokeWidth="1"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </a>
                      {hasChildren && (
                        <button
                          onClick={() =>
                            setExpandedMobile((cur) => ({
                              ...cur,
                              [node.id]: !expanded,
                            }))
                          }
                          aria-label={expanded ? "Collapse" : "Expand"}
                          className="ml-4 flex h-9 w-9 items-center justify-center text-[var(--color-bone-300)]"
                        >
                          <svg
                            width="11"
                            height="8"
                            viewBox="0 0 11 8"
                            fill="none"
                            aria-hidden
                            className={cn(
                              "transition-transform duration-300",
                              expanded && "rotate-180"
                            )}
                          >
                            <path
                              d="M1 1.5L5.5 6L10 1.5"
                              stroke="currentColor"
                              strokeWidth="1"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      )}
                    </div>

                    {hasChildren && expanded && (
                      <ul className="mt-4 ml-1 flex flex-col border-l border-[var(--border-default)] pl-5">
                        {visibleChildren.map((child) => (
                          <li key={child.id}>
                            <a
                              href={itemHref(child)}
                              target={itemTarget(child)}
                              rel={
                                child.kind === "external"
                                  ? "noreferrer"
                                  : undefined
                              }
                              onClick={(e) => handleClick(child, e)}
                              className="group flex items-center justify-between gap-4 py-2.5 label-meta text-[var(--color-bone-300)] hover:text-[var(--color-bone-100)]"
                            >
                              <span>{child.label}</span>
                              <svg
                                width="14"
                                height="6"
                                viewBox="0 0 14 6"
                                fill="none"
                                aria-hidden
                                className="opacity-0 transition-opacity duration-300 group-hover:opacity-80"
                              >
                                <path
                                  d="M0.5 3h12m0 0L10 0.5m2.5 2.5L10 5.5"
                                  stroke="currentColor"
                                  strokeWidth="1"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                );
              })}

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  to="/reservation"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-flex items-center gap-3 self-start border border-[var(--color-bone-300)]/40 px-6 py-3 label-eyebrow text-[var(--color-bone-100)]"
                >
                  Book a tasting
                  <svg
                    width="14"
                    height="6"
                    viewBox="0 0 14 6"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M0.5 3h12m0 0L10 0.5m2.5 2.5L10 5.5"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  </svg>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
