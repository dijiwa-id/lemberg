import type { Template, TemplatePayload } from "./types";

/* Versioned wrapper around exported templates. Editors can ship these
 * JSON files between environments (dev → staging → prod), share them in
 * chat, or commit them as part of a brand kit. The version tag lets us
 * evolve the format later without breaking older bundles. */

const BUNDLE_VERSION = 1;
const BUNDLE_TAG = "lembergTemplateBundle";

export interface ImportableTemplate {
  name: string;
  description?: string | null;
  payload: TemplatePayload;
  thumbnail?: string | null;
}

export interface TemplateBundle {
  [BUNDLE_TAG]: number;
  exportedAt: string;
  source: string;
  count: number;
  templates: ImportableTemplate[];
}

export function buildBundle(templates: Template[]): TemplateBundle {
  return {
    [BUNDLE_TAG]: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    source: "Lemberg Studio",
    count: templates.length,
    templates: templates.map((t) => ({
      name: t.name,
      description: t.description ?? null,
      payload: t.payload,
      thumbnail: t.thumbnail ?? null,
    })),
  };
}

/** Trigger a browser download of one or more templates as a JSON bundle.
 *  Single template → filename uses its slug; multi → uses count + date. */
export function downloadBundle(templates: Template[]): void {
  if (templates.length === 0) return;
  const bundle = buildBundle(templates);
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    templates.length === 1
      ? `lemberg-template-${slug(templates[0].name)}.json`
      : `lemberg-templates-${templates.length}-${dateStamp()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari finishes the download — synchronous revoke
  // sometimes cancels the file save.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Parse a JSON string (from file or paste) into the import shape the
 *  backend expects. Accepts three layouts so editors can paste loosely:
 *    1. A full bundle: `{ lembergTemplateBundle: 1, templates: [...] }`
 *    2. A bare array of templates: `[{ name, payload }, ...]`
 *    3. A single template object: `{ name, payload }`
 *  Throws with a human-readable message on any malformed input — those
 *  bubble up to a toast in the studio. */
export function parseBundle(text: string): ImportableTemplate[] {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    throw new Error("Nothing to import — the file or paste is empty.");
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new Error("Invalid JSON — please check the file or pasted text.");
  }

  let items: unknown[];
  if (Array.isArray(data)) {
    items = data;
  } else if (isRecord(data) && Array.isArray((data as { templates?: unknown }).templates)) {
    items = (data as { templates: unknown[] }).templates;
  } else if (
    isRecord(data) &&
    typeof (data as { name?: unknown }).name === "string" &&
    isRecord((data as { payload?: unknown }).payload)
  ) {
    items = [data];
  } else {
    throw new Error(
      "Couldn't detect a template bundle in this file. Expected a Lemberg export."
    );
  }

  if (items.length === 0) {
    throw new Error("This file contains no templates.");
  }
  if (items.length > 100) {
    throw new Error(`Too many templates (${items.length}). The limit is 100 per bundle.`);
  }

  return items.map((raw, idx) => {
    if (!isRecord(raw)) {
      throw new Error(`Entry ${idx + 1} is not a JSON object.`);
    }
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name || name.length < 2) {
      throw new Error(`Entry ${idx + 1} is missing a valid name.`);
    }
    const payload = raw.payload;
    if (!isRecord(payload)) {
      throw new Error(`"${name}" is missing a payload object.`);
    }
    return {
      name,
      description:
        typeof raw.description === "string" && raw.description.trim()
          ? raw.description.trim()
          : null,
      payload: payload as TemplatePayload,
      thumbnail:
        typeof raw.thumbnail === "string" && raw.thumbnail.trim()
          ? raw.thumbnail.trim()
          : null,
    };
  });
}

/** Read a File (from <input type="file"> or drag-drop) as text. Promises
 *  are nicer than FileReader's event-driven API in this codebase. */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(file);
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "template"
  );
}

function dateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
