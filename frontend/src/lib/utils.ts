import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function splitLines(text: string | undefined | null): string[] {
  if (!text) return [];
  return text.replace(/\\n/g, "\n").split("\n");
}

export function formatVintage(v: string | number | undefined): string {
  if (v === undefined || v === null) return "";
  return String(v);
}
