import { motion, useInView } from "motion/react";
import { useRef } from "react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  once?: boolean;
  className?: string;
  as?: "div" | "section" | "article" | "li" | "header" | "footer";
}

/**
 * Soft entrance — fade in + small Y rise. Observes itself with `whileInView`
 * (the element is only translated a few pixels, so its bounding box stays
 * close to its natural position and the IntersectionObserver fires reliably).
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 1.1,
  once = true,
  className = "",
  as = "div",
}: RevealProps) {
  const Comp = motion[as] as any;
  return (
    <Comp
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.1 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Comp>
  );
}

interface RevealLinesProps {
  text: string;
  className?: string;
  italicLines?: number[];
  delay?: number;
  perLineStagger?: number;
}

/**
 * "Type rises out of a mask" — each line is clipped by an `overflow-hidden`
 * parent while the inner motion span starts translated 115% down. Because the
 * inner span carries the transform, observing IT directly via `whileInView`
 * is unreliable (its bounding box lives at the transformed position, far from
 * where the user actually sees the line). We observe the static PARENT span
 * via `useInView` and drive the child animation from that signal.
 */
function RevealLine({
  text,
  italic,
  delay,
}: {
  text: string;
  italic: boolean;
  delay: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  return (
    <span ref={ref} className="block overflow-hidden">
      <motion.span
        initial={{ y: "115%" }}
        animate={inView ? { y: 0 } : { y: "115%" }}
        transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1], delay }}
        className={`block ${italic ? "italic" : ""}`}
      >
        {text || " "}
      </motion.span>
    </span>
  );
}

export function RevealLines({
  text,
  className = "",
  italicLines = [],
  delay = 0,
  perLineStagger = 0.12,
}: RevealLinesProps) {
  const lines = (text ?? "").replace(/\\n/g, "\n").split("\n");
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <RevealLine
          key={`${i}-${line}`}
          text={line}
          italic={italicLines.includes(i)}
          delay={delay + i * perLineStagger}
        />
      ))}
    </span>
  );
}
