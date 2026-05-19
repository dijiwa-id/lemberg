import { useEffect, useMemo, useState } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink,
  ZoomIn,
  ArrowUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import LandingPage from "../LandingPage";
import { cn } from "../../lib/utils";
import type { AdminContext } from "../Admin";

type DeviceKey = "desktop" | "tablet" | "mobile";

interface DevicePreset {
  key: DeviceKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  width: number;        // logical CSS pixels
  height: number;
  fluid: boolean;       // desktop fills the canvas; others render at fixed size
  defaultZoom: number;  // applied automatically when this preset is selected
}

const DEVICES: Record<DeviceKey, DevicePreset> = {
  desktop: {
    key: "desktop",
    label: "Desktop",
    shortLabel: "Desktop",
    icon: Monitor,
    width: 1440,
    height: 900,
    fluid: true,
    defaultZoom: 1,
  },
  tablet: {
    key: "tablet",
    label: "Tablet · 768 × 1024",
    shortLabel: "Tablet",
    icon: Tablet,
    width: 768,
    height: 1024,
    fluid: false,
    defaultZoom: 0.75,
  },
  mobile: {
    key: "mobile",
    label: "Mobile · 390 × 844",
    shortLabel: "Mobile",
    icon: Smartphone,
    width: 390,
    height: 844,
    fluid: false,
    defaultZoom: 0.85,
  },
};

const ZOOM_LEVELS = [0.5, 0.65, 0.75, 0.85, 1, 1.25] as const;

/* ─────────────────────────────────────────────────────────────────── */

export function PreviewPage({ ctx }: { ctx: AdminContext }) {
  const { config, wines, dirty } = ctx;
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [zoom, setZoom] = useState<number>(1);
  const [reloadKey, setReloadKey] = useState(0);

  const preset = DEVICES[device];

  function selectDevice(next: DeviceKey) {
    setDevice(next);
    setZoom(DEVICES[next].defaultZoom);
  }

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function scrollPreviewTop() {
    const scroller = document.getElementById("preview-scroller");
    if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
  }

  // When the device or reload key changes, the rendered frame may be a
  // brand-new DOM node — wait one frame so the scroller exists, then jump
  // its scroll position back to the top (otherwise switching from a
  // scrolled-down desktop preview to mobile leaves the editor staring at
  // the middle of the landing page).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const scroller = document.getElementById("preview-scroller");
      if (scroller) scroller.scrollTop = 0;
    });
    return () => cancelAnimationFrame(id);
  }, [device, reloadKey]);

  const dimensionsLabel = useMemo(() => {
    if (preset.fluid) return "Responsive";
    return `${preset.width} × ${preset.height}`;
  }, [preset]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        eyebrow="Tools"
        title="Live preview"
        description={
          dirty
            ? "Showing your unsaved changes — publish from the top bar to push them live."
            : "What visitors see right now. Toggle the device to spot-check responsive behaviour."
        }
      >
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
        >
          <ExternalLink size={13} />
          <span className="hidden sm:inline">Open in new tab</span>
        </a>
      </PageHeader>

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-ink-700)] bg-[var(--color-ink-900)] px-4 py-3 lg:px-10">
        {/* Device chips */}
        <div
          className="flex items-center border border-[var(--color-ink-700)] bg-[var(--color-ink-850)] p-1"
          role="tablist"
          aria-label="Preview device"
        >
          {(Object.values(DEVICES) as DevicePreset[]).map((d) => {
            const active = device === d.key;
            const Icon = d.icon;
            return (
              <button
                key={d.key}
                role="tab"
                aria-selected={active}
                aria-label={d.label}
                onClick={() => selectDevice(d.key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 label-eyebrow transition-colors",
                  active
                    ? "bg-[var(--color-ink-700)] text-[var(--color-bone-100)]"
                    : "text-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
                )}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{d.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Right cluster: zoom + dimensions + actions */}
        <div className="flex flex-wrap items-center gap-2">
          {!preset.fluid && (
            <label className="flex items-center gap-2 border border-[var(--color-ink-700)] bg-[var(--color-ink-850)] px-3 py-2">
              <ZoomIn
                size={13}
                className="text-[var(--color-bone-400)]"
                aria-hidden
              />
              <span className="label-eyebrow text-[var(--color-bone-500)] hidden sm:inline">
                Zoom
              </span>
              <select
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                aria-label="Zoom level"
                className="border-0 bg-transparent label-eyebrow text-[var(--color-bone-100)] focus:outline-none"
              >
                {ZOOM_LEVELS.map((z) => (
                  <option
                    key={z}
                    value={z}
                    className="bg-[var(--color-ink-900)]"
                  >
                    {Math.round(z * 100)}%
                  </option>
                ))}
              </select>
            </label>
          )}

          <span
            aria-label="Current viewport dimensions"
            className="hidden border border-[var(--color-ink-700)] bg-[var(--color-ink-850)] px-3 py-2 font-mono text-[11px] text-[var(--color-bone-400)] sm:inline-block"
          >
            {dimensionsLabel}
          </span>

          <button
            onClick={reload}
            aria-label="Reload preview"
            title="Reload preview (replays animations)"
            className="flex h-9 items-center gap-2 border border-[var(--color-ink-700)] bg-[var(--color-ink-850)] px-3 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
          >
            <RefreshCw size={13} />
            <span className="hidden lg:inline">Reload</span>
          </button>
        </div>
      </div>

      {/* ── Canvas ──────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0 overflow-auto overscroll-contain bg-[var(--color-ink-950)]">
        {/* Subtle grid pattern so the device "pops" */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--color-bone-100) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex min-h-full items-start justify-center p-4 lg:p-10">
          <DeviceFrame
            preset={preset}
            zoom={zoom}
            scrollerId="preview-scroller"
            onScrollTop={scrollPreviewTop}
            content={
              <LandingPage
                key={reloadKey}
                previewConfig={config}
                previewWines={wines}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

interface DeviceFrameProps {
  preset: DevicePreset;
  zoom: number;
  scrollerId: string;
  content: React.ReactNode;
  onScrollTop: () => void;
}

/**
 * The landing-page header uses `position: fixed`, which by default anchors
 * to the browser viewport — meaning it would escape the preview frame and
 * land on top of the studio chrome. We solve that by giving the scroll
 * container a non-`none` `transform`: per CSS spec, any transformed ancestor
 * becomes the containing block for `position: fixed` descendants, so the
 * Nav now anchors inside the frame.
 *
 * Mobile / tablet already enjoy that property thanks to `transform: scale()`
 * on the device wrapper. Desktop fluid mode gets `translateZ(0)` (zero
 * transform) explicitly.
 *
 * `paddingTop` is replaced with an `absolute` scroll wrapper offset by the
 * chrome height so the Nav doesn't slide *behind* the browser-dots strip.
 */
const SCROLL_CONTAINMENT: React.CSSProperties = {
  transform: "translateZ(0)",
  WebkitTransform: "translateZ(0)",
  // Prevents scroll past the simulated device end from bouncing the
  // surrounding studio canvas / page. Without this, scrolling the inner
  // landing-page mock past its bottom feels like the whole admin is
  // overscrolling.
  overscrollBehavior: "contain",
};

const CHROME_HEIGHT_DESKTOP = 28;
const NOTCH_HEIGHT_MOBILE = 28;

function DeviceFrame({
  preset,
  zoom,
  scrollerId,
  content,
  onScrollTop,
}: DeviceFrameProps) {
  // Fluid (desktop) — container fills the canvas, no scaling.
  if (preset.fluid) {
    return (
      <div className="relative w-full max-w-[1480px] aspect-[16/10] min-h-[520px] overflow-hidden border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]">
        <BrowserChrome />
        <div
          id={scrollerId}
          className="no-scrollbar absolute left-0 right-0 bottom-0 overflow-y-auto"
          style={{ ...SCROLL_CONTAINMENT, top: CHROME_HEIGHT_DESKTOP }}
        >
          {content}
        </div>
        <FloatingScrollTop onClick={onScrollTop} />
      </div>
    );
  }

  // Fixed-size devices (tablet/mobile). The outer reserves the scaled space
  // so the surrounding flex layout still flows correctly; the inner sits at
  // native dimensions and is transform-scaled. The transform also doubles
  // as the containing block for the fixed Nav inside.
  const isMobile = preset.key === "mobile";
  const outerW = preset.width * zoom;
  const outerH = preset.height * zoom;
  const radius = isMobile ? 36 : 18;
  // Push the scroller below the notch on mobile so the fixed Nav anchors
  // below it rather than behind it.
  const topOffset = isMobile ? NOTCH_HEIGHT_MOBILE : 0;

  return (
    <div
      style={{ width: outerW, height: outerH }}
      className="relative"
      aria-label={`${preset.label} preview`}
    >
      <div
        style={{
          width: preset.width,
          height: preset.height,
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
          borderRadius: radius,
        }}
        className="absolute left-0 top-0 overflow-hidden border border-[var(--color-ink-600)] bg-[var(--color-ink-900)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)]"
      >
        {isMobile && <MobileNotch />}
        <div
          id={scrollerId}
          className="no-scrollbar absolute left-0 right-0 bottom-0 overflow-y-auto"
          style={{ ...SCROLL_CONTAINMENT, top: topOffset }}
        >
          {content}
        </div>
      </div>
      <FloatingScrollTop onClick={onScrollTop} />
    </div>
  );
}

/* ─── Frame chrome ────────────────────────────────────────────────── */

function BrowserChrome() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-7 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--color-ink-850)] px-4">
      <span className="h-2 w-2 rounded-full bg-[var(--color-ink-600)]" />
      <span className="h-2 w-2 rounded-full bg-[var(--color-ink-600)]" />
      <span className="h-2 w-2 rounded-full bg-[var(--color-ink-600)]" />
      <span className="ml-3 font-mono text-[10px] text-[var(--color-bone-500)]">
        lemberg.co.za /
      </span>
    </div>
  );
}

function MobileNotch() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-7 items-center justify-center">
      <span className="h-1.5 w-20 rounded-full bg-[var(--color-ink-600)]" />
    </div>
  );
}

function FloatingScrollTop({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll preview to top"
      title="Scroll preview to top"
      className="absolute bottom-4 right-4 z-20 flex h-9 w-9 items-center justify-center border border-[var(--color-ink-600)] bg-[var(--color-ink-900)]/85 text-[var(--color-bone-300)] backdrop-blur-md transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
    >
      <ArrowUp size={14} />
    </button>
  );
}
