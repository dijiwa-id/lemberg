import axios, { type AxiosError, type AxiosInstance } from "axios";
import type {
  Wine,
  SiteConfig,
  MenuItem,
  MenuItemNode,
  Reservation,
  ReservationCreate,
  Subscriber,
  Template,
  TemplatePayload,
  User,
  AuditLog,
} from "../lib/types";

/* ──────────────────────────────────────────────────────────────────────
 * Environment
 *
 * `import.meta.env` is typed via `src/vite-env.d.ts`. We accept either a
 * full base URL (e.g. https://api.lemberg.example.com/api) or the local
 * dev default. The asset base is derived from API_URL by stripping `/api`
 * if no explicit override is given.
 * ──────────────────────────────────────────────────────────────────── */

export const API_URL: string =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const ASSET_BASE: string =
  import.meta.env.VITE_ASSET_BASE || API_URL.replace(/\/api\/?$/, "");

export const TOKEN_KEY = "lemberg_token";

const TIMEOUT_MS = 20_000;

/* ──────────────────────────────────────────────────────────────────────
 * Axios instance
 *
 * - Bearer token from localStorage (wrapped in try/catch — Safari private
 *   mode and embedded webviews throw on localStorage access).
 * - 20s timeout — better than indefinite hangs.
 * - One response interceptor: normalises errors and clears stale auth.
 * ──────────────────────────────────────────────────────────────────── */

export const http: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: TIMEOUT_MS,
});

function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore — see readToken
  }
}

http.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401) {
      // Stale credential — drop it. If the failed request was an admin
      // mutation triggered from inside the studio, the AuthProvider will
      // pick up the missing user on its next /me check and bounce to login.
      clearToken();
      // Hard redirect to the login route when the user is inside /admin/*.
      // We avoid touching public routes (e.g. a failed reservation POST
      // shouldn't dump the visitor into the login page).
      if (
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/admin") &&
        !window.location.pathname.startsWith("/admin/login")
      ) {
        const next = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.replace(`/admin/login?next=${next}`);
      }
    }
    // Surface the FastAPI `detail` string as `error.message` so callers can
    // display it without digging into `error.response.data.detail`.
    const detail = error.response?.data?.detail;
    if (detail && typeof detail === "string") {
      error.message = detail;
    }
    return Promise.reject(error);
  }
);

/* ──────────────────────────────────────────────────────────────────────
 * Asset resolver
 *
 * Maps stored URLs to fully-qualified browser-fetchable URLs:
 *   - empty / nullish      -> ""
 *   - https?://…           -> returned unchanged
 *   - protocol-relative //  -> "https:" prefixed (browser convention)
 *   - data:image/…         -> returned unchanged (inline images)
 *   - /uploads/foo.png     -> ${ASSET_BASE}/uploads/foo.png
 *   - anything else        -> returned unchanged (caller's responsibility)
 * ──────────────────────────────────────────────────────────────────── */

export function resolveAsset(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/uploads")) return `${ASSET_BASE}${trimmed}`;
  return trimmed;
}

/* ──────────────────────────────────────────────────────────────────────
 * Endpoints
 * ──────────────────────────────────────────────────────────────────── */

export async function fetchWines(): Promise<Wine[]> {
  const { data } = await http.get<Wine[]>("/wines");
  return data;
}

export async function fetchConfig(): Promise<SiteConfig> {
  const { data } = await http.get<SiteConfig>("/config");
  return data;
}

export async function saveConfig(config: SiteConfig): Promise<SiteConfig> {
  const { data } = await http.put("/config", config);
  return data;
}

export async function createWine(wine: Partial<Wine>): Promise<Wine> {
  const { data } = await http.post<Wine>("/wines", wine);
  return data;
}

export async function updateWine(
  id: number | string,
  patch: Partial<Wine>
): Promise<Wine> {
  const { data } = await http.put<Wine>(`/wines/${id}`, patch);
  return data;
}

export async function deleteWine(id: number | string): Promise<void> {
  await http.delete(`/wines/${id}`);
}

export async function reorderWines(items: ReorderEntry[]): Promise<void> {
  await http.put("/wines/reorder", { items });
}

export async function uploadFile(file: File): Promise<{ url: string; bytes?: number }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await http.post<{ url: string; bytes?: number }>(
    "/upload",
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
      // Uploads can be slow on weak connections — give them longer.
      timeout: 60_000,
    }
  );
  return data;
}

/* ───── Header menu ───── */

export async function fetchMenu(): Promise<MenuItemNode[]> {
  const { data } = await http.get<MenuItemNode[]>("/menu");
  return data;
}

export async function fetchMenuPage(slug: string): Promise<MenuItem> {
  const { data } = await http.get<MenuItem>(`/menu/by-slug/${slug}`);
  return data;
}

export async function createMenuItem(item: Partial<MenuItem>): Promise<MenuItem> {
  const { data } = await http.post<MenuItem>("/menu", item);
  return data;
}

export async function updateMenuItem(
  id: number,
  patch: Partial<MenuItem>
): Promise<MenuItem> {
  const { data } = await http.put<MenuItem>(`/menu/${id}`, patch);
  return data;
}

export async function deleteMenuItem(id: number): Promise<void> {
  await http.delete(`/menu/${id}`);
}

export interface ReorderEntry {
  id: number;
  parent_id: number | null;
  order: number;
}

export async function reorderMenu(items: ReorderEntry[]): Promise<void> {
  await http.put("/menu/reorder", { items });
}

/* ───── Reservations ───── */

export async function createReservation(
  payload: ReservationCreate
): Promise<Reservation> {
  const { data } = await http.post<Reservation>("/reservations", payload);
  return data;
}

export async function fetchReservations(
  status?: string
): Promise<Reservation[]> {
  const { data } = await http.get<Reservation[]>("/reservations", {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function updateReservation(
  id: number,
  patch: Partial<Reservation>
): Promise<Reservation> {
  const { data } = await http.put<Reservation>(`/reservations/${id}`, patch);
  return data;
}

export async function deleteReservation(id: number): Promise<void> {
  await http.delete(`/reservations/${id}`);
}

/* ───── Subscribers ───── */

export async function createSubscriber(payload: {
  email: string;
  name?: string;
  source?: string;
}): Promise<Subscriber> {
  const { data } = await http.post<Subscriber>("/subscribers", payload);
  return data;
}

export async function fetchSubscribers(): Promise<Subscriber[]> {
  const { data } = await http.get<Subscriber[]>("/subscribers");
  return data;
}

export async function deleteSubscriber(id: number): Promise<void> {
  await http.delete(`/subscribers/${id}`);
}

/* ───── Wine Orders ───── */

export async function createWineOrder(payload: any): Promise<any> {
  const { data } = await http.post("/wine-orders", payload);
  return data;
}

export async function notifyOrder(id: number): Promise<void> {
  await http.post(`/admin/wine-orders/${id}/notify`);
}

/* ───── Theme templates ───── */

export async function fetchTemplates(): Promise<Template[]> {
  const { data } = await http.get<Template[]>("/templates");
  return data;
}

/** Save current live config as a template. Server pulls TEMPLATE_FIELDS
 *  from configs table — client only supplies name + description. */
export async function snapshotCurrentTemplate(
  name: string,
  description?: string
): Promise<Template> {
  const { data } = await http.post<Template>("/templates/from-current", {
    name,
    description,
    payload: {}, // ignored by backend for /from-current
  });
  return data;
}

export async function createTemplate(
  name: string,
  payload: TemplatePayload,
  description?: string
): Promise<Template> {
  const { data } = await http.post<Template>("/templates", {
    name,
    description,
    payload,
  });
  return data;
}

export async function updateTemplate(
  id: number,
  patch: Partial<{
    name: string;
    description: string;
    payload: TemplatePayload;
  }>
): Promise<Template> {
  const { data } = await http.put<Template>(`/templates/${id}`, patch);
  return data;
}

export async function deleteTemplate(id: number): Promise<void> {
  await http.delete(`/templates/${id}`);
}

/** Returns post-apply snapshot of the template's keys — so the studio
 *  can update local state without a separate /api/config fetch. */
export async function applyTemplate(id: number): Promise<TemplatePayload> {
  const { data } = await http.post<TemplatePayload>(`/templates/${id}/apply`);
  return data;
}

/** Bulk import — server sanitises each entry through TEMPLATE_FIELDS and
 *  suffixes any name conflicts with "(imported)" so existing templates
 *  are never overwritten. Returns the freshly-created rows. */
export async function importTemplates(
  templates: Array<{
    name: string;
    description?: string | null;
    payload: TemplatePayload;
    thumbnail?: string | null;
  }>
): Promise<Template[]> {
  const { data } = await http.post<Template[]>("/templates/import", { templates });
  return data;
}

/** Clone an existing template under a "(copy)" suffix. Returns the clone. */
export async function duplicateTemplate(id: number): Promise<Template> {
  const { data } = await http.post<Template>(`/templates/${id}/duplicate`);
  return data;
}

/* ───── Users ───── */

export async function fetchUsers(): Promise<User[]> {
  const { data } = await http.get<User[]>("/auth/users");
  return data;
}

export async function createUser(payload: any): Promise<User> {
  const { data } = await http.post<User>("/auth/users", payload);
  return data;
}

export async function updateUser(id: number, patch: any): Promise<User> {
  const { data } = await http.put<User>(`/auth/users/${id}`, patch);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await http.delete(`/auth/users/${id}`);
}

/* ───── Audit ───── */

export async function fetchAuditLogs(params?: {
  action?: string;
  target_type?: string;
  username?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const { data } = await http.get<AuditLog[]>("/audit", { params });
  return data;
}

/* ───── Auth ───── */

export type AuthUser = User;

export interface SetupStatus {
  needed: boolean;
}

/** Public — tells the studio whether the first-time bootstrap form is needed. */
export async function fetchSetupNeeded(): Promise<SetupStatus> {
  const { data } = await http.get<SetupStatus>("/auth/setup-needed");
  return data;
}

/** OAuth2 password flow — form-encoded body, returns a Bearer token. */
export async function login(
  username: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  const { data } = await http.post<{ access_token: string; token_type: string }>(
    "/auth/token",
    form,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );
  return data;
}

/** Bootstrap-only — first administrator. Returns 403 once any user exists. */
export async function registerAdmin(
  username: string,
  password: string
): Promise<AuthUser> {
  const { data } = await http.post<AuthUser>("/auth/register", {
    username,
    password,
  });
  return data;
}

/** Verify the stored token is still valid and identify the signed-in user. */
export async function fetchMe(): Promise<AuthUser> {
  const { data } = await http.get<AuthUser>("/auth/me");
  return data;
}

export function persistToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function discardToken(): void {
  clearToken();
}

/* ───── Error helper ───── */

/** Extract a user-friendly message from any thrown error. Works for axios
 *  errors (post-interceptor `message` already holds the API detail) and any
 *  other Error subclass. */
export function errorMessage(e: unknown, fallback = "Something went wrong."): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}
