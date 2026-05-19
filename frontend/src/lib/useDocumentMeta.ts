import { useEffect, useState } from "react";
import type { SiteConfig } from "./types";
import { resolveAsset } from "../services/api";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${name}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Applies SEO meta tags, favicon, and the <html lang> attribute based on
 * editor-controlled config. Runs on mount + whenever relevant config changes.
 */
export function useDocumentMeta(config: SiteConfig) {
  useEffect(() => {
    const title = config.metaTitle?.trim() || "Lemberg Winery — Tulbagh Valley";
    document.title = title;

    const description =
      config.metaDescription?.trim() ||
      config.siteDescription?.trim() ||
      "";

    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");

    const ogImage = config.ogImage ? resolveAsset(config.ogImage) : "";
    if (ogImage) setMeta("og:image", ogImage, "property");

    const favicon = config.faviconUrl ? resolveAsset(config.faviconUrl) : "";
    if (favicon) {
      setLink("icon", favicon);
      setLink("apple-touch-icon", favicon);
    }

    document.documentElement.setAttribute(
      "lang",
      config.defaultLanguage || "en"
    );
  }, [
    config.metaTitle,
    config.metaDescription,
    config.siteDescription,
    config.ogImage,
    config.faviconUrl,
    config.defaultLanguage,
  ]);
}

/**
 * Resolves the effective theme for the landing page given the editor's
 * `landingTheme` setting ("dark" / "light" / "auto") and — for "auto" —
 * the current OS preference.
 */
export function useLandingTheme(landingTheme: string | undefined): "dark" | "light" {
  const setting = ((landingTheme || "dark").toLowerCase() as "dark" | "light" | "auto");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (setting !== "auto") return setting === "light" ? "light" : "dark";
    if (typeof window === "undefined" || !window.matchMedia) return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  });

  useEffect(() => {
    if (setting !== "auto") {
      setTheme(setting === "light" ? "light" : "dark");
      return;
    }
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setTheme(mq.matches ? "light" : "dark");
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setting]);

  return theme;
}
