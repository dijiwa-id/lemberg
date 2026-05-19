# Lemberg CMS — Architecture (v1.2)

Reference for engineers working on the Lemberg studio. Describes how the
system is actually built today — not a migration roadmap. For operational
deployment (Nginx, env vars, backups), see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 1. System at a glance

```
┌────────────────────────────────────────────────────────────────────┐
│                         Public landing page                         │
│  / · /reservation · /menu/:slug    (no auth)                        │
│  ──────────────────────────────────────────────────────────────     │
│  React 18 + Vite 5 SPA · Tailwind v4 · Motion · React Router v6     │
│  Pulls /api/config + /api/wines + /api/menu on mount                │
│  Falls back to FALLBACK_CONFIG when the API is unreachable          │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                          Studio (CMS)                              │
│  /admin/* · /admin/login    (JWT auth)                              │
│  ──────────────────────────────────────────────────────────────     │
│  16 admin pages: Dashboard · Brand · Hero · Philosophy · Collection │
│    · Featured · Estate · Experience · Club · Footer · Menu          │
│    · Templates · Studio · Preview · Settings                        │
│  Single AdminContext threaded into every page                       │
│  Edits buffered in React state → Publish writes /api/config         │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                          FastAPI backend                           │
│  Python 3.13 · FastAPI · SQLAlchemy · SQLite (file)                 │
│  ──────────────────────────────────────────────────────────────     │
│  /api/config         k/v config singleton (one row per key)         │
│  /api/wines          CRUD + reorder                                 │
│  /api/menu           CRUD + nested children + slug pages            │
│  /api/reservations   public POST · admin LIST/UPDATE/DELETE         │
│  /api/subscribers    public POST · admin LIST/DELETE                │
│  /api/templates      LIST · CREATE · FROM-CURRENT · UPDATE · APPLY  │
│                      DELETE · IMPORT · DUPLICATE                    │
│  /api/auth           setup-needed · register · token · me           │
│  /api/upload         image upload (validated, capped)               │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend architecture

### 2.1 Routing

`frontend/src/App.tsx` mounts a `BrowserRouter` with three top-level
sections:

| Route prefix | Code-split bundle | Auth |
|---|---|---|
| `/` (public) | `LandingPage`, `ReservationPage`, `DynamicPage` | none |
| `/admin/login` | `LoginPage` | none (bootstrap or login) |
| `/admin/*` | `Admin.tsx` shell + lazy admin pages | `RequireAuth` guard |

All admin pages are lazy-loaded via `React.lazy(...)` so the first paint
on the public site doesn't pull in studio code.

### 2.2 AdminContext

`pages/Admin.tsx` is the single owner of editor state:

```ts
interface AdminContext {
  config: SiteConfig;      // current edits, dirty-tracked
  wines: Wine[];
  dirty: boolean;
  saveState: SaveState;    // idle | saving | saved | error
  lastSaved: Date | null;
  update: (patch: Partial<SiteConfig>) => void;
  persistConfig: () => Promise<void>;
  applyServerPatch: (patch) => void;  // server already persisted, don't mark dirty
  onAddWine / onWineChange / onReorderWines / onDeleteWine: ...;
}
```

The whole `ctx` object is passed as a prop to every admin page. There is
no global store — `Admin.tsx` is the source of truth and React's
re-render cycle propagates updates downward.

### 2.3 Two parallel caches: brand + studio

Two synchronously-readable localStorage keys make first paint flicker-free
on routes that don't sit inside the admin tree:

| Key | Cached fields | Read by |
|---|---|---|
| `lemberg_brand_cache` | `logoText`, `logoImage`, `logoFont`, `tagline` | Public splash + landing header |
| `lemberg_studio_identity` | `studioName`, `studioEdition`, `studioTagline`, `studioLogo`, `studioAccent`, `studioConfirmDestructive`, `studioCompactMode` | LoginPage |

Both are refreshed whenever `Admin.tsx` fetches or persists a config —
see `cacheBrand()` and `cacheStudio()` calls in `Admin.tsx`. The pattern:
write on every config touch, read once on mount, never rely on it for
business logic (it's purely a paint-time prefetch).

### 2.4 Configuration system

The backend stores config as a key/value table (`configs` row per key,
all values as strings). On the frontend:

- `SiteConfig` is the typed shape with `Partial`-ish fields
- `FALLBACK_CONFIG` (in `lib/types.ts`) is the in-memory default used when
  the API is unreachable
- `mergeRemoteConfig(remote)` overlays the remote values on FALLBACK but
  **skips empty strings on non-toggle keys** — prevents a deleted key from
  clobbering a meaningful default

When adding a new config key:
1. Add it to `DEFAULT_CONFIG` in `backend/app/seed.py` (idempotent backfill)
2. Add the typed field to `SiteConfig` in `lib/types.ts`
3. Add a default value to `FALLBACK_CONFIG` in the same file
4. (Optional) If it's a studio-identity field, add it to
   `studioIdentity.ts` so LoginPage can read it from cache

### 2.5 Landing page layout variants

Sections that support multiple layouts (Collection, FeaturedWine) follow
the same pattern:

```ts
type Layout = "a" | "b" | "c";
const KNOWN: ReadonlySet<Layout> = new Set([...]);

function resolveLayout(raw: string | undefined): Layout {
  if (raw && KNOWN.has(raw as Layout)) return raw as Layout;
  return "a";  // default — never crash on stale or unknown values
}
```

The resolver pattern ensures forward compatibility: a config from a future
version that has `collectionLayout: "experimental-x"` won't crash the
landing page; it falls back to the editorial default. Likewise for the
bento variants.

### 2.6 The admin chrome

`DashboardLayout` wraps every admin page with a shell:

- **Sidebar** (left, 260px) — nav groups: Overview / Content sections / Tools
- **TopBar** (top) — save state, theme toggle, user menu
- **Main content area** (scrollable) — page contents
- **AdminFooter** (bottom of scroll) — closing editorial stamp

All three chrome components (`Sidebar`, `TopBar`, `AdminFooter`) accept an
optional `studio?: StudioIdentity` prop. `Admin.tsx` computes the identity
once via `pickStudioIdentity(config)` and passes it through
`DashboardLayout`. The Login screen (not inside this tree) uses
`getCachedStudio()` for synchronous access.

---

## 3. Backend architecture

### 3.1 Stack

- **FastAPI** 0.115+ on Python 3.13
- **SQLAlchemy** 2.0 ORM
- **SQLite** as the database (single `cms.db` file)
- **python-jose** for JWT (HS256)
- **passlib + bcrypt** for password hashing (bcrypt pinned `>=3.2.0,<4.1.0` — see DEPLOYMENT.md)
- **uvicorn** ASGI server

### 3.2 Module layout

```
backend/app/
├── main.py               # FastAPI app factory, CORS, middleware, route mount
├── database.py           # SQLAlchemy engine + SessionLocal + get_db dep
├── seed.py               # First-boot defaults (idempotent backfill)
├── core/
│   └── security.py       # JWT + password hashing primitives
├── models/
│   └── models.py         # SQLAlchemy ORM models (one file)
├── schemas/
│   └── schemas.py        # Pydantic request/response shapes
└── api/
    ├── auth.py           # JWT auth + bootstrap
    ├── config.py         # GET/PUT /api/config
    ├── wines.py          # CRUD + reorder
    ├── menu.py           # nested menu + slug pages
    ├── reservations.py   # public POST + admin ops
    ├── subscribers.py    # public POST + admin ops
    ├── templates.py      # theme snapshots + apply + import/duplicate
    └── upload.py         # multipart image upload (validated)
```

### 3.3 Database schema

Tables (all auto-created by `Base.metadata.create_all(...)` on first boot):

| Table | Purpose | Notable columns |
|---|---|---|
| `users` | Studio admins | `username` (unique), `hashed_password` |
| `configs` | Key/value singleton store | `key` (PK, unique), `value` (string) |
| `wines` | Wine catalogue | `slug` (unique), `image`, `images` (JSON array), `order` |
| `menu_items` | Nav menu (parent + children, page content) | `parent_id`, `kind`, `pageBody`, `order` |
| `reservations` | Booking form submissions | `status` (new/confirmed/...), `visit_date` |
| `subscribers` | Allocation list signups | `email` (unique), `subscribed`, `source` |
| `templates` | Theme/brand snapshots (v1.2) | `payload` (JSON dict of TEMPLATE_FIELDS) |

There are no foreign keys to `users` — all admin actions are auth-gated
but stored anonymously. Reservation/subscriber rows don't reference user
accounts.

### 3.4 Auth flow

1. **Bootstrap**: deployment starts with empty `users` table → `GET /api/auth/setup-needed` returns `{ needed: true }` → frontend shows the bootstrap form
2. **Register** (first user only): `POST /api/auth/register` → 403 thereafter (no admin-creates-admin flow in v1.2; future work)
3. **Login**: `POST /api/auth/token` form-encoded → returns JWT with 8-hour expiry
4. **Authenticated requests**: `Authorization: Bearer <token>` header; the `get_current_user` FastAPI dependency validates on every admin endpoint
5. **Stale token**: any 401 in the studio triggers `clearToken()` + redirect to `/admin/login`

Password hashing: `passlib.hash.bcrypt` with bcrypt 4.0.x. The version pin
is critical — bcrypt 5.x removed the `__about__` module and tightened the
72-byte input cap, both of which break passlib's startup probe.

### 3.5 Template system (v1.2)

`api/templates.py` exposes a curated **subset of SiteConfig** as a
named, swappable snapshot. The fields that get captured:

```python
TEMPLATE_FIELDS = (
    "logoText", "logoImage", "logoFont",
    "landingTheme", "brandAccent", "navAnnouncement",
    "showAnnouncementBar", "showPhilosophy", "showVarietalRibbon",
    "showFeaturedWine", "showEstateBand", "showExperience", "showClub",
)
```

This is intentionally narrow — only brand + theme + section-visibility
fields. **Page copy stays separate**: applying a template never overwrites
hero text, philosophy body, etc. The allowlist also acts as an injection
guard during `import` (`_sanitize_payload` strips unknown keys).

Apply endpoint also writes `activeTemplateId` so the studio can badge the
currently-applied row. Delete endpoint clears `activeTemplateId` if it
matches the deleted template's ID.

Default snapshot: on first boot when the `templates` table is empty,
`_seed_default_template()` snapshots the current config into a "Default
editorial" template and marks it active. Idempotent — skipped on every
subsequent boot.

### 3.6 Adding a new endpoint

The conventional shape:

```python
# api/<feature>.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.auth import get_current_user   # admin gate
from app.database import get_db

router = APIRouter()

@router.get("/feature", response_model=List[FeatureResponse])
def list_features(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),   # remove for public endpoints
):
    return db.query(Feature).all()
```

Then mount it in `app/main.py`:

```python
from app.api import feature
app.include_router(feature.router, prefix="/api", tags=["feature"])
```

---

## 4. Customization touch points

### 4.1 White-labelling the studio

Studio identity lives in seven config keys (`studioName`, `studioEdition`,
`studioTagline`, `studioLogo`, `studioAccent`, `studioConfirmDestructive`,
`studioCompactMode`). Edit at `/admin/studio` — the changes flow through
to Sidebar, TopBar, AdminFooter, and the Login screen automatically.
Public landing-page branding is **independent** (managed via `/admin/brand`).

### 4.2 Adding a new landing page section variant

1. Implement the renderer as a subcomponent inside the section's file
2. Add a new entry to the section's layout-key enum + `KNOWN_LAYOUTS` set + resolver
3. Add a matching `LayoutOption` to the admin picker (with a CSS-only diagram)
4. Add the layout value to `DEFAULT_CONFIG` only if you want to ship a new default — existing values stay safe via the resolver fallback

### 4.3 Adding a new section to the landing page

1. Create `components/sections/<NewSection>.tsx`
2. Add the rendered call in `LandingPage.tsx` between existing sections
3. Add config keys for the section's copy (`<section>Eyebrow`, `<section>Heading`, `<section>Body`, etc.) — defaults in `seed.py`, types in `lib/types.ts`
4. Build the admin page at `pages/admin/<NewSection>Page.tsx` (use `BrandPage.tsx` or `EstatePage.tsx` as the template)
5. Register the route in `Admin.tsx` and add the nav entry in `components/admin/Sidebar.tsx`

### 4.4 Folder convention

```
frontend/src/
├── pages/                # route-level components
│   ├── LandingPage.tsx
│   ├── Admin.tsx         # admin shell + AdminContext owner
│   └── admin/            # one file per admin route
├── components/
│   ├── sections/         # landing page sections (Hero, Collection, ...)
│   ├── admin/            # studio-only chrome + form controls
│   └── motion/           # animation primitives (Reveal, RevealLines)
├── lib/                  # types, hooks, utilities
└── services/
    └── api.ts            # axios instance + endpoint wrappers
```

---

## 5. What's deliberately not done

- **No SSR** — Vite SPA only. SEO meta is set via React Helmet patterns in `LandingPage.tsx`. For full SSR, migrate to Next.js (out of scope for v1.2).
- **No admin-create-admin** — Only the bootstrap register flow exists. Multi-editor teams currently share one account; granular permissions are a roadmap item.
- **No image CDN** — Uploads are served from the same FastAPI process via `/uploads/`. For high-traffic deployments, front the `/uploads` path with a CDN (Cloudflare, BunnyCDN) and set `LEMBERG_ASSET_BASE` accordingly.
- **No CMS sync** — All edits are immediate to the live SQLite. There is no draft / preview / scheduled-publish workflow. Editors use the in-studio Preview page (`/admin/preview`) to sanity-check before clicking Publish.
- **No automated backups** — DEPLOYMENT.md documents the backup pattern but doesn't ship a script. Schedule `cp cms.db cms.backup.$(date +%F).db` via cron.

---

## 6. Where to look first when something breaks

| Symptom | First file to read |
|---|---|
| Login returns 500 | `backend/app/core/security.py` + check bcrypt version is 4.x not 5.x |
| Public site shows fallback content | Open DevTools Network — is `GET /api/config` reaching the backend? CORS? |
| Studio crashes on a specific page | `pages/admin/<Page>.tsx` — usually a missing config key (add to `FALLBACK_CONFIG`) |
| Template apply doesn't change the look | Verify the key is in `TEMPLATE_FIELDS` (backend) AND in `TEMPLATE_FIELDS` (frontend `lib/types.ts`) |
| Sidebar nav item missing | `components/admin/Sidebar.tsx` `CONTENT_ITEMS` / `TOOL_ITEMS` arrays |
| New config key not persisting | Backend: `Admin.tsx` `persistConfig()` serialises **all** keys in `config` to strings — make sure the key is on the typed SiteConfig |
| Layout switch has no visual effect | Resolver in the section file probably falls through to default — check that the value matches the `KNOWN_LAYOUTS` set exactly |
