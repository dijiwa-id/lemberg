import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Reset scroll to the top on every pathname change. Hash navigation
 * (e.g. /#collection) is preserved — the landing page's own effect handles
 * smooth-scrolling to the anchor.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // let the landing page scroll to the anchor instead
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}
