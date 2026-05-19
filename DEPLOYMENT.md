# Deployment — Lemberg Winery (v1.2)

Panduan operasional untuk men-deploy stack Lemberg ke **VPS Linux**, **server
cloud**, atau **container platform**. Disusun untuk DevOps agent — semua
hardening sudah dilakukan di kode (env-aware secret, CORS allowlist, auth
gates, upload validation), Anda cukup men-supply env var + jalankan bootstrap.

> **Versi target**: backend v1.2 (env-aware config, JWT auth, image upload
> validation, template export/import, studio identity, landing layout variants),
> frontend v1.2 (Vite 5 SPA, brand-cache splash, dynamic pages, reservation
> form, allocation subscribers, template library, studio chrome configurator).

---

## What's new in v1.2

Upgrading from v1.1 → v1.2 is **zero-downtime, zero-migration**. New config
keys are seeded automatically on first boot (see `backend/app/seed.py
DEFAULT_CONFIG`), and the templates table is created via the existing
`Base.metadata.create_all(...)` call in `main.py`. No SQL migrations required.

| Feature | Surface | Touched |
|---|---|---|
| Theme template library | `/admin/templates` | new `templates` table, 6 endpoints |
| Template export / import | `/admin/templates` | client-side bundle format, drag-drop |
| Studio identity | `/admin/studio` | new config keys with `studio*` prefix |
| Collection layout variants | `/admin/collection` + `#collection` | `collectionLayout` config key |
| Featured bento variants | `/admin/featured` + `#featured` | `featuredBentoLayout` config key |

After upgrading the code and restarting `uvicorn`, verify on next boot:

```bash
curl -s http://127.0.0.1:8000/api/config | jq '{
  studioName, studioEdition, studioTagline,
  collectionLayout, featuredBentoLayout, activeTemplateId
}'
```

All keys should appear with their defaults; the seeder leaves any existing
edited values untouched.

---

## 0. Arsitektur produksi

```
                       ┌────────────────────────┐
                       │       Nginx (443)      │
                       │  TLS termination + SPA │
                       └──┬──────────┬──────────┘
                          │          │
                /api, /uploads     /  (static dist/)
                          │
                ┌─────────▼─────────┐
                │  FastAPI (uvicorn)│
                │   127.0.0.1:8000  │
                └─────────┬─────────┘
                          │
                ┌─────────▼──────────┐
                │  SQLite cms.db     │  ←—— backup
                │  + uploads/        │  ←—— persistent volume
                │  + users (auth)    │
                │  + wines           │
                │  + menu_items      │
                │  + reservations    │
                │  + subscribers     │
                │  + configs (k/v)   │
                │  + templates       │  ←—— v1.2: theme snapshots
                └────────────────────┘
```

- **Frontend** di-build sebagai SPA statis (`vite build` → `frontend/dist/`)
  dan dilayani Nginx. Env vars di-bake at build time.
- **Backend** FastAPI di-run via `uvicorn` di belakang Nginx (loopback
  127.0.0.1, **bukan** 0.0.0.0 — Nginx adalah satu-satunya jalan masuk).
- **Uploads** dilayani Nginx langsung dari `backend/uploads/` (lebih cepat
  daripada proxying ke uvicorn) — atau via volume mount kalau Docker.
- **Database** SQLite (file `backend/cms.db`). Single-file storage berarti
  backup = copy file. Skala lebih besar → Postgres via `LEMBERG_DATABASE_URL`
  (lihat §8).

---

## 1. Pre-flight env vars

**Tidak ada perubahan kode yang diperlukan.** Semua hardening (SECRET_KEY,
CORS, auth gate, upload validation, file-type allowlist) sudah di-implement
di v1.1. Yang Anda perlu lakukan:

### Backend env vars

| Variable | Required | Default | Catatan |
|----------|----------|---------|---------|
| `LEMBERG_SECRET_KEY` | **WAJIB di prod** | dev placeholder (logs WARNING) | Generate: `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `LEMBERG_CORS_ORIGINS` | **WAJIB di prod** | `*` (logs WARNING) | Comma-separated allowlist — mis. `https://lemberg.co.za,https://www.lemberg.co.za`. Wildcard otomatis disable credentials |
| `LEMBERG_DATABASE_URL` | Recommended | `sqlite:///./cms.db` | Postgres example: `postgresql+psycopg://user:pass@host:5432/lemberg` |
| `LEMBERG_UPLOAD_MAX_BYTES` | Optional | `20971520` (20 MiB) | Maks ukuran image upload |
| `LEMBERG_ACCESS_TOKEN_EXPIRE_MINUTES` | Optional | `60` | JWT lifetime. 30–120 menit reasonable untuk editor |
| `LEMBERG_LOG_LEVEL` | Optional | `INFO` | `DEBUG`/`INFO`/`WARNING`/`ERROR` |
| `LEMBERG_VERSION` | Optional | `1.1.0` | Exposed di `/api/health` dan `/api/version` — useful untuk deployment tracking |

### Frontend env vars (build-time, di-bake by Vite)

| Variable | Required | Default | Catatan |
|----------|----------|---------|---------|
| `VITE_API_URL` | **WAJIB** | `http://localhost:8000/api` | `https://lemberg.co.za/api` di prod |
| `VITE_ASSET_BASE` | **WAJIB** | derived from `VITE_API_URL` | `https://lemberg.co.za` (tanpa /api) — base untuk `/uploads/...` |

> ⚠️ Frontend env vars di-**bake at build time** (`npm run build`). Setelah
> mengubah `.env.production`, **build ulang** frontend.

Template lengkap di [.env.example](.env.example).

---

## 2. Bootstrap (one-time, fresh deployment)

Setelah backend hidup, **tidak ada user di database** — `/admin` akan
otomatis ke `/admin/login` yang menampilkan form **"Create administrator"**.

### Opsi A: via web UI (recommended)

1. Buka `https://lemberg.example.com/admin/login`
2. Form muncul dalam **Setup mode** (judul "Create your administrator.")
3. Isi username (≥ 3 chars) + password (≥ 8 chars)
4. Submit → auto sign-in → masuk Studio dashboard

### Opsi B: via API

```bash
curl -X POST https://lemberg.example.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"GANTI_PASSWORD_KUAT"}'
# Response 201: {"id":1,"username":"admin"}
```

**Setelah bootstrap selesai**, endpoint `/api/auth/register` mengembalikan
**403 "Registration is closed"** — tidak ada cara publik untuk menambah user
lagi (intentional v1 scope; tambah user kedua perlu akses DB langsung).

### Verifikasi bootstrap selesai

```bash
curl https://lemberg.example.com/api/auth/setup-needed
# Setelah bootstrap: {"needed":false}
```

---

## 3. Opsi A — Deploy native ke VPS Ubuntu

Cocok untuk single-server, traffic kecil–menengah, kontrol penuh.

### 3.1 Persiapan server

```bash
# SSH ke VPS sebagai root, lalu buat user non-root
adduser lemberg
usermod -aG sudo lemberg

# Login ulang sebagai 'lemberg':
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.11 python3.11-venv python3-pip \
                    nginx git ufw certbot python3-certbot-nginx \
                    build-essential

# Node.js 20 LTS (untuk build frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Firewall: izinkan SSH + HTTP + HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### 3.2 Clone repo dan install dependensi

```bash
sudo mkdir -p /var/www && sudo chown lemberg:lemberg /var/www
cd /var/www
git clone <repo-url> lemberg
cd lemberg

# Backend
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt   # includes bcrypt<4.1 pin — see requirements.txt
deactivate
cd ..

# Frontend (build statis)
cd frontend
npm ci
# Isi .env.production dulu sebelum build — lihat §3.4
npm run build      # output ke frontend/dist/
cd ..
```

> ✅ **bcrypt 4.1+ ada incompat bug dengan passlib 1.7.x** (passlib reads
> `bcrypt.__about__.__version__` yang sudah dihapus). `requirements.txt`
> sudah pin `bcrypt>=3.2.0,<4.1.0` untuk mencegah ini. Jangan upgrade bcrypt
> manual tanpa juga upgrade passlib ke 1.7.5+ atau pakai bcrypt direct.

### 3.3 Direktori persistent untuk uploads & DB

`cms.db` dan `uploads/` harus survive antar deploy. Pindahkan keluar folder
kode:

```bash
sudo mkdir -p /var/lib/lemberg/uploads
sudo chown -R lemberg:www-data /var/lib/lemberg
sudo chmod -R 775 /var/lib/lemberg

# Symlink supaya kode tetap menemukan path lama
ln -sf /var/lib/lemberg/uploads /var/www/lemberg/backend/uploads
touch /var/lib/lemberg/cms.db
ln -sf /var/lib/lemberg/cms.db /var/www/lemberg/backend/cms.db
```

### 3.4 File `.env`

**`/var/www/lemberg/backend/.env`** (chmod 600):

```bash
LEMBERG_SECRET_KEY=<hasil python -c "import secrets; print(secrets.token_urlsafe(64))">
LEMBERG_CORS_ORIGINS=https://lemberg.example.com,https://www.lemberg.example.com
LEMBERG_LOG_LEVEL=INFO
LEMBERG_VERSION=1.1.0
# Optional — untuk Postgres:
# LEMBERG_DATABASE_URL=postgresql+psycopg://lemberg:secret@127.0.0.1:5432/lemberg
```

**`/var/www/lemberg/frontend/.env.production`** (dibaca saat `npm run build`):

```bash
VITE_API_URL=https://lemberg.example.com/api
VITE_ASSET_BASE=https://lemberg.example.com
```

> Setelah `.env.production` berubah, **build ulang frontend**
> (`npm run build`) — Vite menanam env vars di waktu build, bukan runtime.

### 3.5 Systemd service untuk backend

Buat `/etc/systemd/system/lemberg-api.service`:

```ini
[Unit]
Description=Lemberg Winery FastAPI backend
After=network.target

[Service]
Type=simple
User=lemberg
Group=www-data
WorkingDirectory=/var/www/lemberg/backend
EnvironmentFile=/var/www/lemberg/backend/.env
ExecStart=/var/www/lemberg/backend/venv/bin/uvicorn app.main:app \
          --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/lemberg /var/www/lemberg/backend
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Aktifkan + log realtime:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lemberg-api
sudo systemctl status lemberg-api
journalctl -u lemberg-api -f
```

Verifikasi log boot:

```
WARNING — atau hilang kalau env benar — re: LEMBERG_SECRET_KEY / CORS
INFO     lemberg :: seed_defaults completed.
INFO     Uvicorn running on http://127.0.0.1:8000
```

### 3.6 Konfigurasi Nginx

Buat `/etc/nginx/sites-available/lemberg`:

```nginx
server {
    listen 80;
    server_name lemberg.example.com www.lemberg.example.com;

    # Certbot HTTP-01 challenge — sisanya redirect ke HTTPS
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name lemberg.example.com www.lemberg.example.com;

    # SSL certs di-issue oleh certbot (§3.7) — placeholder di sini:
    # ssl_certificate     /etc/letsencrypt/live/lemberg.example.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/lemberg.example.com/privkey.pem;

    client_max_body_size 25M;    # ≥ LEMBERG_UPLOAD_MAX_BYTES + slack
    gzip on;
    gzip_types text/css application/javascript application/json
               image/svg+xml font/woff2;

    # Frontend SPA — static dist/
    root /var/www/lemberg/frontend/dist;
    index index.html;

    # API → uvicorn (loopback)
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Uploads dilayani Nginx langsung (skip uvicorn)
    location /uploads/ {
        alias /var/lib/lemberg/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Hashed assets SPA — cache 1 tahun
    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — semua route → index.html (React Router handles it)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Aktifkan + test:

```bash
sudo ln -s /etc/nginx/sites-available/lemberg /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.7 HTTPS via Let's Encrypt

Pastikan DNS A record `lemberg.example.com` (+ www) sudah point ke IP VPS.

```bash
sudo certbot --nginx -d lemberg.example.com -d www.lemberg.example.com
# Pilih opsi 2: redirect HTTP → HTTPS (otomatis update Nginx config)
```

Certbot otomatis:
- Tambah `ssl_certificate` lines ke nginx config
- Setup systemd timer untuk renewal (`systemctl status certbot.timer`)
- Dry-run verify: `sudo certbot renew --dry-run`

### 3.8 Bootstrap admin pertama

```bash
curl -X POST https://lemberg.example.com/api/auth/setup-needed
# {"needed":true}

curl -X POST https://lemberg.example.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"REPLACE_WITH_STRONG_PASSWORD"}'
# 201 {"id":1,"username":"admin"}
```

Atau buka `https://lemberg.example.com/admin/login` di browser dan ikuti
form Setup. Selanjutnya `/api/auth/register` return 403.

### 3.9 Update workflow (deploy versi baru)

Simpan sebagai `/var/www/lemberg/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /var/www/lemberg

git pull --ff-only

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# Frontend
cd frontend
npm ci
npm run build
cd ..

sudo systemctl restart lemberg-api
sudo systemctl reload nginx
echo "Deploy OK"
```

`chmod +x deploy.sh` lalu `./deploy.sh` setiap rilis. **Migrasi DB otomatis**
— `backend/app/migrate.py` jalan di startup, menambah kolom Wine yang
missing tanpa intervention.

---

## 4. Opsi B — Deploy via Docker Compose

Cocok untuk reproducible environment dan portable antar VPS / cloud.

### 4.1 Dockerfile produksi untuk frontend

Dockerfile di `frontend/Dockerfile` saat ini menjalankan `npm run dev` (dev
mode). Buat **`frontend/Dockerfile.prod`** untuk build statis:

```dockerfile
# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build-time env vars di-bake oleh Vite
ARG VITE_API_URL
ARG VITE_ASSET_BASE
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ASSET_BASE=$VITE_ASSET_BASE
RUN npm run build

# ---- serve ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Buat **`frontend/nginx.conf`**:

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;

  location /api/ {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25M;
  }

  location /uploads/ {
    proxy_pass http://backend:8000;
    expires 30d;
  }

  location /assets/ {
    try_files $uri =404;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### 4.2 `docker-compose.prod.yml`

```yaml
services:
  backend:
    build:
      context: ./backend
    restart: unless-stopped
    environment:
      LEMBERG_SECRET_KEY: ${LEMBERG_SECRET_KEY:?set in .env}
      LEMBERG_CORS_ORIGINS: ${LEMBERG_CORS_ORIGINS}
      LEMBERG_DATABASE_URL: ${LEMBERG_DATABASE_URL:-sqlite:////data/cms.db}
      LEMBERG_LOG_LEVEL: ${LEMBERG_LOG_LEVEL:-INFO}
      LEMBERG_VERSION: ${LEMBERG_VERSION:-1.1.0}
    volumes:
      - lemberg_db:/data           # DB persisted (Postgres-ready)
      - lemberg_uploads:/app/uploads
    expose:
      - "8000"
    healthcheck:
      test: ["CMD", "python", "-c",
             "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health').read()"]
      interval: 30s
      timeout: 5s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        VITE_API_URL: ${VITE_API_URL}
        VITE_ASSET_BASE: ${VITE_ASSET_BASE}
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "80:80"

volumes:
  lemberg_db:
  lemberg_uploads:
```

> Note: kalau pakai SQLite di Docker, set
> `LEMBERG_DATABASE_URL=sqlite:////data/cms.db` (4 slashes — absolute path
> di volume mount) dan pastikan backend `WORKDIR /app` cocok.

**`.env`** di root project (chmod 600, **tidak commit**):

```bash
LEMBERG_SECRET_KEY=<token-64-byte>
LEMBERG_CORS_ORIGINS=https://lemberg.example.com
VITE_API_URL=https://lemberg.example.com/api
VITE_ASSET_BASE=https://lemberg.example.com
```

Jalankan:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f backend
```

Bootstrap admin sama seperti §3.8 (via API atau /admin/login UI).

### 4.3 HTTPS untuk Docker

Dua pola umum:

**(a) Host Nginx + Certbot di luar container** — paling sederhana. Map
container `frontend` ke `127.0.0.1:8080`, host Nginx (§3.6) proxy ke
loopback. Certbot jalan di host.

**(b) Caddy / Traefik di docker-compose** — ATM-style auto-TLS:

```yaml
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on: [frontend]
```

**Caddyfile**:

```
lemberg.example.com {
  reverse_proxy frontend:80
}
```

Caddy otomatis issue Let's Encrypt cert. No Certbot needed.

---

## 5. Backup & restore

Endpoint admin protected, tapi BACKUP harus dilakukan dari server (tidak
bisa via API).

### 5.1 SQLite

```bash
# Atomic backup (cp bisa korup file in-use)
sqlite3 /var/lib/lemberg/cms.db ".backup /var/backups/lemberg/cms-$(date +%F).db"
```

Cron harian (jam 3 pagi), simpan 14 hari terakhir:

```cron
0 3 * * * sqlite3 /var/lib/lemberg/cms.db ".backup /var/backups/lemberg/cms-$(date +\%F).db" && find /var/backups/lemberg -name "cms-*.db" -mtime +14 -delete
```

### 5.2 Uploads (image files)

```bash
# Sinkron mingguan ke storage off-site (rclone ke S3/Backblaze/Wasabi)
0 4 * * 0 rclone sync /var/lib/lemberg/uploads remote:lemberg-uploads
```

### 5.3 Restore

```bash
sudo systemctl stop lemberg-api
cp /var/backups/lemberg/cms-2026-05-15.db /var/lib/lemberg/cms.db
sudo systemctl start lemberg-api
```

User accounts, wines, config, menu, reservations, subscribers — semua dalam
satu file `cms.db`. Restore file = restore semuanya.

---

## 6. Monitoring & maintenance

### 6.1 Health checks

```bash
# Liveness — backend up
GET /api/health
→ {"ok":true,"version":"1.1.0"}

# Version probe — useful untuk cek deploy berhasil
GET /api/version
→ {"version":"1.1.0"}
```

Load balancer / uptime monitor poll `/api/health` setiap 30s.

### 6.2 Logs

Native deploy:

```bash
journalctl -u lemberg-api -f                 # tail backend
sudo tail -f /var/log/nginx/access.log       # request log
sudo tail -f /var/log/nginx/error.log        # 4xx/5xx
```

Docker:

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

Backend log format:

```
2026-05-18 18:52:38,023 INFO    lemberg :: PUT /api/config -> 200 (12.4ms)
```

Setiap response juga punya `X-Response-Time-ms` header untuk client-side
timing analysis.

### 6.3 Disk monitoring

`uploads/` bisa tumbuh dengan editor upload. Set alert:

```bash
# Quick check
du -sh /var/lib/lemberg/uploads
df -h /var/lib/lemberg
```

Alert kalau > 80% disk full.

### 6.4 Cert expiry

```bash
sudo certbot certificates
# Cert sisa berapa hari — auto-renewal seharusnya ngehandle
sudo certbot renew --dry-run
```

### 6.5 Security updates

```bash
# OS-level auto patch (recommended)
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 7. Operational endpoints reference

### Public (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness |
| GET | `/api/version` | Deploy tracking |
| GET | `/api/config` | Landing page reads brand config |
| GET | `/api/wines` | Wine collection (landing) |
| GET | `/api/menu` | Header menu tree (landing) |
| GET | `/api/menu/by-slug/{slug}` | Dynamic page lookup |
| POST | `/api/reservations` | Visitor booking form |
| POST | `/api/subscribers` | Allocation list signup |
| GET | `/api/auth/setup-needed` | Bootstrap status |
| POST | `/api/auth/register` | Bootstrap admin (403 setelah pertama) |
| POST | `/api/auth/token` | Login (OAuth2 password flow) |

### Admin (Bearer token required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auth/me` | Verify session, get user identity |
| PUT | `/api/config` | Publish brand / section / settings |
| POST/PUT/DELETE | `/api/wines`, `/api/wines/{id}` | Wine CRUD |
| POST | `/api/upload` | Image upload (15 MB max, jpg/png/webp/gif/svg/avif) |
| POST/PUT/DELETE | `/api/menu`, `/api/menu/{id}` | Header menu CRUD |
| PUT | `/api/menu/reorder` | Bulk reorder |
| GET/PUT/DELETE | `/api/reservations`, `/api/reservations/{id}` | Reservation triage |
| GET/DELETE | `/api/subscribers`, `/api/subscribers/{id}` | Allocation list management |

Interactive OpenAPI docs di `https://lemberg.example.com/docs`. Pertimbangkan
**lock production /docs** (FastAPI parameter atau Nginx `deny`) kalau Anda
tidak mau public API spec.

---

## 8. Migrasi SQLite → Postgres

SQLite cukup untuk traffic puluhan ribu pageview/hari. Pindah ke Postgres
saat:
- Write konkuren tinggi (banyak editor)
- Butuh replikasi / HA
- Managed service tanpa persistent disk

### Langkah

1. Provision Postgres (Neon / Supabase / RDS / Cloud SQL).
2. Tambah `psycopg[binary]>=3.1` ke [requirements.txt](backend/requirements.txt).
3. Set env: `LEMBERG_DATABASE_URL=postgresql+psycopg://user:pass@host:5432/lemberg`
   — **tidak perlu edit kode**, [backend/app/database.py](backend/app/database.py)
   sudah env-aware dengan `pool_pre_ping=True`.
4. Adopsi **Alembic** menggantikan [backend/app/migrate.py](backend/app/migrate.py)
   yang aditif-only. Generate migration awal: `alembic revision --autogenerate`.
5. Migrasi data:
   ```bash
   pgloader sqlite:///var/lib/lemberg/cms.db \
            postgresql://user:pass@host/lemberg
   ```

### Catatan

- Wine `images` column adalah `JSON` di model — Postgres native, no change.
- `Reservation.createdAt` / `Subscriber.createdAt` string ISO-8601 — Postgres
  TEXT, no change. Bisa di-convert ke `TIMESTAMPTZ` lewat Alembic migration.
- SQLite `.db` file di-leave behind sebagai backup.

---

## 9. Pre-production checklist

Sebelum bilang "go-live":

- [ ] `LEMBERG_SECRET_KEY` di-set ke 64-byte random, **bukan** dev placeholder.
      Log boot **tidak** ada `WARNING — using insecure dev placeholder`.
- [ ] `LEMBERG_CORS_ORIGINS` di-set ke domain spesifik (bukan `*`).
      Log boot **tidak** ada `WARNING — CORS allows all origins`.
- [ ] HTTPS aktif, redirect HTTP → HTTPS, sertifikat valid ≥ 30 hari.
- [ ] Backend hanya bind ke `127.0.0.1` (verifikasi: `ss -tlnp | grep 8000`
      hanya menampilkan loopback).
- [ ] Bootstrap admin user pertama sudah dibuat, password kuat (≥ 16 chars).
      `/api/auth/setup-needed` return `{"needed":false}`.
- [ ] `cms.db` dan `uploads/` mount ke persistent volume **di luar** folder
      kode (supaya `git pull` tidak overwrite).
- [ ] Backup harian DB + sync mingguan uploads off-site sudah jalan.
      Verifikasi: ada file di `/var/backups/lemberg/` dengan tanggal hari ini.
- [ ] Frontend di-build dengan `VITE_API_URL=https://...` produksi
      (cek `dist/assets/index-*.js` mengandung domain produksi, bukan
      localhost).
- [ ] Nginx `client_max_body_size` ≥ `LEMBERG_UPLOAD_MAX_BYTES` + 1 MB slack.
- [ ] Firewall hanya membuka 22 (SSH), 80, 443. UFW status verified.
- [ ] Smoke test:
      - [ ] Landing `/` muncul → wines + menu loaded
      - [ ] Submit form `/reservation` → 200, muncul di DB (cek via SSH:
            `sqlite3 cms.db "SELECT count(*) FROM reservations"`)
      - [ ] Submit form Club di footer landing → 200, muncul di DB
            (`SELECT count(*) FROM subscribers`)
      - [ ] Login `/admin/login` → token di-issue → masuk dashboard
      - [ ] Edit field di Studio → Publish → reload landing → perubahan tampil
      - [ ] Upload image di /admin/hero → reload landing → image muncul dari
            `/uploads/...`
      - [ ] Logout dari Studio → kembali ke login

---

## 10. Yang masih jadi follow-up potensial

Hal ini **tidak blocker** untuk launch, tapi worth scheduling:

- **Self-service password reset** — perlu email service (SES / SendGrid /
  Mailgun) + reset-token mechanism. Belum ada.
- **Multi-admin** — saat ini hanya 1 admin (bootstrap). Adding "Create new
  editor" di Studio yang gated by current session.
- **Rate limiting** — `POST /reservations`, `/subscribers`, dan
  `/auth/token` rentan brute-force. Tambah `slowapi` di middleware atau
  Nginx `limit_req`.
- **Token refresh** — JWT 60 menit, user re-login setelah expire. Tambah
  refresh-token flow untuk smooth renewal.
- **Audit log** — track siapa ubah apa kapan. Useful untuk multi-admin.
- **Email notifications** — reservation submit → email ke editor inbox.
  Saat ini editor harus polling Studio Reservations tab.
- **Storage offload** — `/uploads/*` ke S3 / Cloudflare R2 + CDN. Code path
  sudah `VITE_ASSET_BASE` aware — ganti env var ke CDN URL setelah migrasi.

---

## 11. Quick reference: env vars

Salin ke `.env` server, ganti placeholder:

```bash
# ─── Backend (FastAPI) ───────────────────────────────────────────
LEMBERG_SECRET_KEY=GENERATE_WITH_secrets.token_urlsafe(64)
LEMBERG_CORS_ORIGINS=https://lemberg.example.com,https://www.lemberg.example.com
LEMBERG_DATABASE_URL=sqlite:///./cms.db
LEMBERG_UPLOAD_MAX_BYTES=20971520
LEMBERG_ACCESS_TOKEN_EXPIRE_MINUTES=60
LEMBERG_LOG_LEVEL=INFO
LEMBERG_VERSION=1.1.0

# ─── Frontend (Vite — build time) ─────────────────────────────────
VITE_API_URL=https://lemberg.example.com/api
VITE_ASSET_BASE=https://lemberg.example.com
```

Generate secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

## 12. Troubleshooting

### "WARNING — using insecure dev placeholder" di log boot

Set `LEMBERG_SECRET_KEY` env var. Tanpa ini, JWT tetap berfungsi tapi pakai
key yang lemah & publik.

### `passlib` error "module 'bcrypt' has no attribute '__about__'"

bcrypt 4.1+ tidak compatible dengan passlib 1.7.x. Pastikan
[requirements.txt](backend/requirements.txt) berisi
`bcrypt>=3.2.0,<4.1.0`, reinstall:
```bash
source venv/bin/activate
pip install -r requirements.txt --force-reinstall bcrypt
```

### Login return 500 tanpa detail

Cek backend log. Biasanya issue bcrypt (lihat atas) atau database lock
(SQLite + banyak concurrent write).

### "Could not validate credentials" setelah login berhasil

JWT expired (default 60 menit) atau `LEMBERG_SECRET_KEY` berubah antara
issue dan validation (mis. restart dengan env var berbeda). User perlu
re-login.

### CORS preflight gagal

Browser console: "Origin ... is not allowed by Access-Control-Allow-Origin".
Cek `LEMBERG_CORS_ORIGINS` cocok dengan domain frontend persis (HTTPS scheme,
no trailing slash, port kalau bukan 80/443).

### Upload 413 "File too large"

Naikkan `LEMBERG_UPLOAD_MAX_BYTES` (backend) **dan** `client_max_body_size`
(Nginx). Restart backend + reload Nginx.

### Frontend fetch `localhost:8000` di production

`VITE_API_URL` tidak ter-set saat build, sehingga jatuh ke default. Set di
`.env.production`, lalu `npm run build` ulang. Vite **tidak** baca env var
saat runtime.

### Studio bisa diakses tanpa login

Kemungkinan: token lama di localStorage masih valid. Verify via DevTools
Application → localStorage → cari `lemberg_token`. Hapus, refresh → harus
redirect ke login. Atau periksa backend `Depends(get_current_user)` benar
terpasang di endpoint mutating.

---

**Versi dokumen**: untuk Lemberg backend v1.1 / frontend v1.0 (commit hash
mengikuti tag/release). Update saat env var atau auth flow berubah.
