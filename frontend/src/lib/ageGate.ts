/**
 * Age verification — persistence + status helpers.
 *
 * Stores the visitor's confirmation in localStorage with an expiry, so they
 * aren't gated on every page-load. Two values are persisted:
 *   - `confirmed`: true when the visitor declared they're of age
 *   - `at`:        timestamp of the declaration (ms since epoch)
 * Denial is NOT persisted — we want a denied visitor to see the gate again
 * on next visit; otherwise an honest "no" locks them out forever, which is
 * neither nice nor compliant.
 *
 * All access is synchronous so the gate component can decide whether to
 * render on first paint without flashing.
 */

const KEY = "lemberg_age_gate";

export interface AgeGateState {
  confirmed: boolean;
  at: number;
}

const DEFAULT_REMEMBER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function safeGetItem(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;  // private mode, etc.
  }
}

function safeSetItem(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // ignore — gate will simply re-prompt next visit
  }
}

function safeRemoveItem(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Read the current confirmation state. Returns null when nothing stored
 *  or when the storage payload is malformed. */
export function readAgeGateState(): AgeGateState | null {
  const raw = safeGetItem();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AgeGateState>;
    if (typeof parsed.confirmed !== "boolean" || typeof parsed.at !== "number") {
      return null;
    }
    return { confirmed: parsed.confirmed, at: parsed.at };
  } catch {
    return null;
  }
}

/** Persist a positive confirmation. Stamped with the current time so we
 *  can expire it against the editor's `ageGateRememberDays` setting. */
export function recordAgeGateConfirmation(): void {
  const state: AgeGateState = { confirmed: true, at: Date.now() };
  safeSetItem(JSON.stringify(state));
}

/** Wipe the stored confirmation — exposed for the admin "Test on live"
 *  flow and for editors who want to force-re-prompt themselves. */
export function clearAgeGateState(): void {
  safeRemoveItem();
}

/** Parse the editor's `ageGateRememberDays` setting, clamped to a sane
 *  range. Min 1 day so the gate doesn't re-prompt within a single session;
 *  max 365 so confirmation isn't held forever on shared devices. */
export function parseRememberDays(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_REMEMBER_DAYS;
  return Math.min(n, 365);
}

/** Whether the stored confirmation is still within its expiry window. */
export function isConfirmationFresh(
  state: AgeGateState | null,
  rememberDays: number
): boolean {
  if (!state || !state.confirmed) return false;
  const elapsed = Date.now() - state.at;
  return elapsed >= 0 && elapsed < rememberDays * DAY_MS;
}
