# Lemberg Winery — Editorial Landing Page & CMS

A dark, editorial landing experience for **Lemberg Winery** (Tulbagh Valley, South Africa)
inspired by the visual restraint of Aesop. Iridescent silver on ink-black, generous
whitespace, Cormorant Garamond display type, and quiet scroll-driven motion.

Ships with a small headless CMS so non-technical staff can edit every section, manage the
wine collection, and upload imagery without touching code.

---

## Stack

| Layer       | Tech                                                         |
| ----------- | ------------------------------------------------------------ |
| Frontend    | React 19 · Vite 6 · TypeScript · Tailwind v4 · Motion (`motion/react`) |
| CMS UI      | Same stack as frontend, mounted at `/admin`                  |
| Backend     | FastAPI (Python 3.11+) · SQLAlchemy · SQLite                 |
| Drag/drop   | `@dnd-kit` for wine reordering                               |
| Auth        | JWT scaffolding via `python-jose` (admin route is open in local mode) |

---

## Run locally

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The first boot:
- creates `cms.db` (SQLite, in `backend/`)
- runs lightweight migrations to add any missing wine columns
- seeds default content and six placeholder wines

API surface:
- `GET  /api/config` · `PUT /api/config`
- `GET  /api/wines`  · `POST /api/wines` · `PUT /api/wines/{id}` · `DELETE /api/wines/{id}`
- `POST /api/upload` (multipart) → returns `{ url: "/uploads/…" }`
- `GET  /uploads/<filename>` (static)

OpenAPI docs at `http://localhost:8000/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev    # → http://localhost:3000
```

`frontend/.env` defaults:
```
VITE_API_URL=http://localhost:8000/api
VITE_ASSET_BASE=http://localhost:8000
```

### 3. Docker (optional, single command)

```bash
docker compose up --build
```

Maps `backend → :8000` and `frontend → :3000`.

---

## Routes

| URL        | Purpose                                                 |
| ---------- | ------------------------------------------------------- |
| `/`        | Public landing page                                     |
| `/admin`   | Editorial CMS — left rail editor, right rail live preview |

In local mode the admin route has no auth gate. For production, wire the existing
`/api/auth/token` JWT flow into a login screen and put `Depends(get_current_user)` back
on the mutating endpoints in `app/api/cms.py`.

---

## Project layout

```
lemberg-winery-landing-page/
├── backend/
│   └── app/
│       ├── api/
│       │   ├── auth.py        ← JWT scaffold
│       │   └── cms.py         ← config + wines + uploads
│       ├── core/security.py
│       ├── models/models.py   ← User · Config · Wine
│       ├── schemas/schemas.py ← Pydantic v2 schemas
│       ├── database.py        ← SQLite via SQLAlchemy
│       ├── migrate.py         ← additive dev migration (ADD COLUMN)
│       ├── seed.py            ← default config + six fallback wines
│       └── main.py            ← FastAPI app, CORS, static /uploads mount
│
└── frontend/
    └── src/
        ├── components/
        │   ├── admin/         ← Field, Section, WineEditor
        │   ├── motion/        ← Reveal, ImageReveal, Marquee primitives
        │   ├── sections/      ← Hero, Philosophy, Collection, FeaturedWine,
        │   │                    EstateBand, Experience, Club, Footer, VarietalRibbon
        │   ├── Nav.tsx
        │   ├── Monogram.tsx   ← vector "L" mark (iridescent gradient)
        │   ├── Wordmark.tsx
        │   └── Cursor.tsx     ← thin pointer ring (fine pointers only)
        ├── lib/
        │   ├── types.ts       ← Wine / SiteConfig + FALLBACK_*
        │   └── utils.ts       ← cn() helper
        ├── services/api.ts    ← typed axios client + resolveAsset()
        ├── pages/
        │   ├── LandingPage.tsx
        │   └── Admin.tsx
        ├── App.tsx
        ├── main.tsx
        └── index.css          ← theme tokens, fonts, utilities
```

---

## Design language

### Palette

| Token              | Value      | Use                                        |
| ------------------ | ---------- | ------------------------------------------ |
| `--color-ink-900`  | `#0A0A0B`  | Page background                            |
| `--color-ink-850`  | `#0E0E11`  | Alt surface                                |
| `--color-ink-800`  | `#131315`  | Panels                                     |
| `--color-bone-100` | `#ECE9E2`  | Primary text                               |
| `--color-bone-300` | `#B7B1A3`  | Editorial body copy                        |
| `--color-bone-500` | `#6F6A63`  | Muted meta / labels                        |
| `--color-pearl-300`| `#E6DECF`  | Iridescent warm accent (italic phrases)    |
| `--color-pearl-500`| `#C9C4BB`  | Cool pearl primary accent                  |
| `--color-wine-700` | `#6B1F26`  | Deep wine — error / allocated indicator    |

### Typography

- **Display** Cormorant Garamond (300 weight, italic for accents)
- **UI** Inter Tight (400/500 — used for labels with wide tracking)
- **Body** Inter (400 — long-form copy at 14.5px with 1.75 leading)

### Motion

Built on `motion/react`. Primitives in `components/motion/`:

- `<Reveal>` — opacity + y rise on viewport enter
- `<RevealLines>` — line-by-line "type rises out of mask" entrance
- `<ImageReveal>` — clip-path wipe + parallax inside frame
- `<Marquee>` — infinite linear scroll for the varietal ribbon

All entrances use the `[0.22, 1, 0.36, 1]` easing curve (a quiet "expo-out" feel) and
respect `prefers-reduced-motion` via Motion's defaults.

---

## CMS — how to use

1. Open `/admin`. The left rail is grouped into collapsible sections that mirror the
   landing page (Hero, Philosophy, Collection, Featured wine, Estate, Experience, Club,
   Footer).
2. Edit a field — the right rail preview updates instantly (no save needed for the
   preview).
3. Press **Publish changes** at the top of the editor to write to the database.
4. The **Collection** section contains the wine library:
   - **Drag** the handle to reorder.
   - Click the chevron to expand a wine and edit all metadata.
   - Upload bottle photography directly via the **Replace / Upload** button — files
     land in `backend/uploads/` and are served from `/uploads/<name>`.

Switch between **Desktop** and **Mobile** preview viewports at the top of the preview
pane.

---

## Replacing placeholder imagery

The default seed uses Unsplash URLs for hero, estate, and bottle imagery so the site
looks finished on first boot. To swap in the approved brand assets (the bottle
photography and packaging shots provided):

1. In `/admin`, hit **Upload** under any image field — your file is stored in
   `backend/uploads/` and the URL is written into the config.
2. The frontend's `resolveAsset()` (in `src/services/api.ts`) prefixes `/uploads/*`
   paths with `VITE_ASSET_BASE`, so uploaded assets work both in dev and behind a
   reverse proxy.

For bulk import, drop files into `backend/uploads/` and reference them as
`/uploads/<filename>` in the CMS image fields.

---

## Production considerations

- **Auth.** Reinstate `Depends(get_current_user)` on the mutating endpoints in
  `cms.py` and build a `/admin/login` screen against `/api/auth/token`.
- **Database.** Swap SQLite for Postgres in `database.py`. The schema is small, but if
  the data model continues to grow, introduce Alembic and retire `migrate.py`.
- **Images.** Move uploads behind a CDN (S3 + CloudFront, or Cloudflare R2). The
  `resolveAsset` helper means only `VITE_ASSET_BASE` needs to change.
- **Build.** `npm run build` outputs a static SPA. Serve `dist/` from any static
  host; proxy `/api` and `/uploads` to the FastAPI service.
- **SEO.** Current setup is a CSR SPA. If the marketing team wants per-wine OG cards,
  migrate the frontend to Next.js — the component tree maps 1:1.

---

## Brand notes

- The "L" monogram is reproduced as inline SVG (`components/Monogram.tsx`) with an
  iridescent linear gradient. It will reproduce sharp at any size and inherits the
  same animated `iridescent-pan` keyframe used for italic accent type.
- Vintage labels render as `2024` / `2022` etc. in tight tracking — never in italic.
  Wine **names** use the Cormorant italic.
- The "Aesop quality bar" rule: every page edge should be at least one full line of
  text away from the gutter (we use a 1480px max-width with 24px / 40px gutters).
