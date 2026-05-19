import { useEffect, useState } from "react";
import { motion } from "motion/react";

/**
 * Lightweight custom cursor — a thin iridescent ring that softly follows the pointer.
 * Disabled on touch devices.
 */
export function Cursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const hasFinePointer =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(pointer: fine)").matches;
    if (!hasFinePointer) return;
    setEnabled(true);

    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  if (!enabled) return null;

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-screen"
      animate={{ x: pos.x - 16, y: pos.y - 16 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, mass: 0.4 }}
    >
      <div
        className="h-8 w-8 rounded-full border"
        style={{
          borderColor: "rgba(230, 222, 207, 0.55)",
          boxShadow: "0 0 16px rgba(201,196,187,0.25)",
        }}
      />
    </motion.div>
  );
}
