import { Monogram } from "./Monogram";
import { cn } from "../lib/utils";
import { fontStack, useGoogleFont } from "../lib/useGoogleFont";

interface WordmarkProps {
  text?: string;
  className?: string;
  layout?: "horizontal" | "stacked";
  showMonogram?: boolean;
  /** Uploaded icon — replaces the vector Monogram (the wordmark text stays). */
  imageSrc?: string;
  /** Google Font family for the wordmark text. */
  font?: string;
}

/**
 * Brand wordmark = icon (uploaded image OR vector monogram) + display text
 * rendered in a Google Font chosen by the editor. The old behaviour of
 * "image replaces the whole wordmark" caused the text to disappear when an
 * icon was uploaded — keeping both lets editors lock the typography while
 * customising the mark.
 */
export function Wordmark({
  text = "Lemberg",
  className = "",
  layout = "horizontal",
  showMonogram = true,
  imageSrc,
  font,
}: WordmarkProps) {
  useGoogleFont(font ? [font] : []);
  const textStyle = { fontFamily: fontStack(font, "var(--font-display)") };

  const Icon = imageSrc ? (
    <img
      src={imageSrc}
      alt=""
      loading="eager"
      fetchPriority="high"
      className={cn(
        "object-contain shrink-0",
        layout === "stacked" ? "h-10 w-auto" : "h-7 w-auto"
      )}
    />
  ) : showMonogram ? (
    <Monogram className={cn(layout === "stacked" ? "h-10 w-auto" : "h-7 w-auto")} />
  ) : null;

  // Explicit `text-[var(--color-bone-100)]` so the wordmark text re-evaluates
  // the var at the span — not at the LandingPage wrapper. The var lookup
  // happens where the `color` property is applied, so this lets the
  // header's transient `data-theme="dark"` override (when not scrolled, over
  // the dark hero image) flow through to the wordmark too, instead of the
  // text staying inherited from the outer light-theme computed colour and
  // disappearing dark-on-dark.
  if (layout === "stacked") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        {Icon}
        <span
          className="text-[22px] tracking-[0.35em] uppercase font-light leading-none text-[var(--color-bone-100)]"
          style={textStyle}
        >
          {text}
        </span>
        <span className="label-eyebrow text-[var(--color-bone-500)]">Winery</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {Icon}
      <span
        className="text-lg tracking-[0.32em] uppercase font-light leading-none text-[var(--color-bone-100)]"
        style={textStyle}
      >
        {text}
      </span>
    </div>
  );
}
