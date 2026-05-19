# Menjalankan Lemberg di localhost

Panduan langkah-demi-langkah untuk menyiapkan dev environment di mesin Anda
(Windows, macOS, atau Linux). Setelah selesai akan ada:

- **Backend** FastAPI di `http://localhost:8000`
- **Frontend** Vite/React di `http://localhost:3000`
- **Studio CMS** di `http://localhost:3000/admin`

---

## 1. Prasyarat

| Tool       | Versi minimum | Cek                       | Install                                                |
| ---------- | ------------- | ------------------------- | ------------------------------------------------------ |
| **Python** | 3.11          | `python --version`        | <https://www.python.org/downloads/>                    |
| **Node.js**| 20 LTS        | `node --version`          | <https://nodejs.org/> (atau `nvm install 20`)          |
| **Git**    | any           | `git --version`           | <https://git-scm.com/downloads>                        |

Windows tambahan: gunakan **PowerShell** atau **Git Bash**.

Cek semua sekaligus:

```bash
python --version && node --version && npm --version && git --version
```

Harus muncul empat baris versi tanpa error.

---

## 2. Struktur project

```
lemberg-winery-landing-page/
├── backend/                  ← FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   ├── uploads/              ← file upload (auto-dibuat, di-gitignore)
│   ├── cms.db                ← database SQLite (auto-dibuat, di-gitignore)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 ← React + Vite + TypeScript
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env                  ← VITE_API_URL + VITE_ASSET_BASE
├── .env.example              ← contoh env vars (backend + frontend)
├── README.md
├── DEPLOYMENT.md             ← panduan deploy ke VPS / cloud
└── RUNNING.md                ← Anda di sini
```

---

## 3. TL;DR — kalau Anda terburu-buru

Buka **dua terminal** terpisah di root project.

### Terminal 1 — Backend

```bash
cd backend
python -m venv venv

# Aktifkan venv
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (Git Bash / cmd):
# venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Buka **<http://localhost:3000>** di browser. Selesai.

---

## 4. Setup detail

### 4.1 Backend

```bash
cd backend
```

#### a) Buat virtual environment Python

```bash
python -m venv venv
```

#### b) Aktifkan venv

| OS / shell                    | Command                            |
| ----------------------------- | ---------------------------------- |
| Windows PowerShell            | `.\venv\Scripts\Activate.ps1`      |
| Windows cmd / Git Bash        | `venv\Scripts\activate`            |
| macOS / Linux                 | `source venv/bin/activate`         |

> **PowerShell error "running scripts is disabled"** — jalankan sekali sebagai admin:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

Setelah aktif, prompt akan ada `(venv)` di depannya.

#### c) Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

Yang ter-install: FastAPI, Uvicorn, SQLAlchemy, Pydantic v2, python-jose,
passlib (bcrypt), python-multipart, aiofiles. Total ~30 MB.

#### d) Jalankan server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

`--reload` membuat server auto-restart saat ada perubahan kode. Buang flag itu
untuk mode quiet.

**Boot pertama otomatis melakukan:**

1. Membuat `cms.db` (SQLite, di `backend/`)
2. Buat semua tabel (config, wines, menu_items, reservations)
3. Backfill semua kolom Wine yang missing (lihat [migrate.py](backend/app/migrate.py))
4. Seed default — 50+ config keys, 6 wines, 4 top-level menu, 4 sub-items

Log boot:

```
INFO     lemberg :: seed_defaults completed.
INFO     Uvicorn running on http://127.0.0.1:8000
```

#### e) Verifikasi backend

Di terminal baru (atau browser):

```bash
curl http://127.0.0.1:8000/api/health
# {"ok":true,"version":"1.1.0"}

curl http://127.0.0.1:8000/api/wines | head -c 200
# [{"name":"Lemberg Louis","slug":"lemberg-louis","vintage":"2021",...
```

OpenAPI docs interaktif: <http://localhost:8000/docs>.

---

### 4.2 Frontend

Di terminal lain:

```bash
cd frontend
```

#### a) Install dependencies

```bash
npm install
```

(\~1 menit, install React 18, Vite 5, Tailwind v4, Motion, axios, dnd-kit, lucide-react)

#### b) Cek env file

```bash
cat .env
```

Harus berisi:

```
VITE_API_URL=http://localhost:8000/api
VITE_ASSET_BASE=http://localhost:8000
```

Kalau file `frontend/.env` tidak ada, salin dari root `.env.example`
atau buat manual dengan dua baris di atas.

#### c) Jalankan dev server

```bash
npm run dev
```

Vite akan mulai di port 3000:

```
VITE v5.4.21  ready in 5557 ms
➜  Local:   http://localhost:3000/
➜  Network: http://192.168.x.x:3000/
```

#### d) Verifikasi frontend

Buka **<http://localhost:3000>** — landing page muncul dengan hero, collection,
philosophy, dst.

---

## 5. URL penting

| URL                                       | Halaman                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| `http://localhost:3000`                   | Landing page publik                                  |
| `http://localhost:3000/reservation`       | Form booking tasting                                 |
| `http://localhost:3000/page/journal`      | Halaman dinamis (dari menu kind=`page`)              |
| `http://localhost:3000/admin`             | Studio CMS — dashboard                               |
| `http://localhost:3000/admin/hero`        | Edit section Hero                                    |
| `http://localhost:3000/admin/collection`  | Manage wine library (drag-reorder, status, upload)   |
| `http://localhost:3000/admin/menu`        | Manage header menu (CRUD + sub-items + dynamic pages)|
| `http://localhost:3000/admin/experience`  | Edit Experience + tab list reservation               |
| `http://localhost:3000/admin/settings`    | Pengaturan global (theme, SEO, visibility, dst)      |
| `http://localhost:8000/docs`              | OpenAPI Swagger UI (test endpoint langsung)          |
| `http://localhost:8000/api/health`        | Health check                                         |
| `http://localhost:8000/api/version`       | Version info                                         |

Studio CMS tidak butuh login di mode local (auth gate di-disable per [DEPLOYMENT.md](DEPLOYMENT.md#11-pindahkan-secret_key-ke-environment-variable)).

---

## 6. Workflow editor

1. Buka `/admin` — landing dashboard dengan stat cards
2. Klik nav sidebar untuk pindah ke section (Brand, Hero, Philosophy, Collection, dll)
3. Edit field — preview tidak auto-update sebelum publish
4. Klik **Publish** di top bar (tombol jadi pearl saat ada perubahan unsaved)
5. Buka tab baru ke `/` untuk lihat hasil

Settings yang berlaku langsung tanpa rebuild:
- Section visibility toggles
- Landing theme (dark / light / auto)
- Brand accent color
- Menu structure
- Maintenance mode

---

## 7. Default data

| Kategori          | Jumlah default | Sumber                                                |
| ----------------- | -------------- | ----------------------------------------------------- |
| Config keys       | ~50            | [seed.py](backend/app/seed.py) `DEFAULT_CONFIG`       |
| Wines             | 6              | `DEFAULT_WINES` (Louis, Rhône Blend, Pinot Noir, …)   |
| Menu top-level    | 4              | Collection, Estate, Experience, Journal               |
| Menu sub-items    | 4              | 2 di bawah Collection, 2 di bawah Journal             |
| Reservations      | 0              | Submit lewat form `/reservation`                      |

Boot pertama populate semua. Boot kedua dst hanya **backfill keys yang missing**
— editan editor tidak ditimpa.

---

## 8. Common tasks

### Reset database total

```bash
# Stop backend dulu (Ctrl+C)
rm backend/cms.db        # macOS/Linux/Git Bash
# atau:
del backend\cms.db       # Windows cmd
# atau:
Remove-Item backend\cms.db -Force  # PowerShell
```

Restart backend → seed default akan jalan dari nol.

### Hapus semua upload

```bash
rm -rf backend/uploads/*.* 2>/dev/null   # macOS/Linux/Git Bash
# atau:
Get-ChildItem backend\uploads | Remove-Item -Force  # PowerShell
```

Folder `backend/uploads/` di-gitignore — bisa dikosongkan kapan saja.
Setelah dihapus, sumber gambar di config yang masih point ke `/uploads/...` akan
404 — bisa diganti via Studio (atau biarkan, akan fallback ke placeholder
"Image unavailable" karena onError handler).

### Update dependencies

**Backend:**

```bash
cd backend
.\venv\Scripts\Activate.ps1   # atau source venv/bin/activate
pip install -r requirements.txt --upgrade
```

**Frontend:**

```bash
cd frontend
npm update
# atau install paket spesifik:
npm install <package-name>
```

### Build frontend untuk production preview

```bash
cd frontend
npm run build       # output ke frontend/dist/
npm run preview     # serve dist/ di port 4173
```

### Type-check tanpa run

```bash
cd frontend
npm run lint    # alias: tsc --noEmit
```

### Test backend API langsung

```bash
# Health
curl http://127.0.0.1:8000/api/health

# Submit reservation dummy
curl -X POST http://127.0.0.1:8000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"t@t.com","party_size":2,"visit_date":"2026-05-19","visit_time":"11:00"}'

# List reservations
curl http://127.0.0.1:8000/api/reservations | jq

# Get config
curl http://127.0.0.1:8000/api/config | jq '.logoText, .landingTheme'
```

---

## 9. Optional: jalankan dengan Docker (single command)

```bash
docker compose up --build
```

Konfigurasi di [docker-compose.yml](docker-compose.yml) — backend + frontend
sekaligus, file changes auto-reload. Pakai ini kalau tidak mau install Python /
Node lokal.

---

## 10. Troubleshooting

### "Port 8000 already in use"

Ada proses lain yang pegang port. Cari + bunuh:

```bash
# Windows PowerShell
$conn = Get-NetTCPConnection -LocalPort 8000 -State Listen
Stop-Process -Id $conn.OwningProcess -Force

# macOS / Linux
lsof -ti:8000 | xargs kill -9
```

Atau pakai port lain: `uvicorn app.main:app --port 8001` lalu update
`frontend/.env` ke `VITE_API_URL=http://localhost:8001/api`.

### "Port 3000 already in use"

Vite akan minta konfirmasi pakai port lain. Atau:

```bash
npm run dev -- --port 3001
```

### Frontend kosong / 404 saat fetch API

1. Cek backend hidup: `curl http://127.0.0.1:8000/api/health`
2. Cek `frontend/.env` benar (`VITE_API_URL=http://localhost:8000/api`)
3. Restart Vite (`Ctrl+C` lalu `npm run dev`) — Vite cache env vars saat boot
4. Buka DevTools Console — lihat error spesifik

### `pip install` gagal di Windows (bcrypt / cryptography)

```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

Kalau masih gagal, install Microsoft C++ Build Tools dari:
<https://visualstudio.microsoft.com/visual-cpp-build-tools/>

### `npm install` gagal di Windows

Coba clear cache + retry:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json   # atau Remove-Item di PS
npm install
```

### "Module not found" setelah `git pull`

```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### Reservation submit gagal "estate closed Sun–Mon"

Pilih tanggal Selasa–Sabtu. Validasi sengaja di-enforce server-side
(lihat [reservations.py](backend/app/api/reservations.py)).

### Image upload "Unsupported file type"

Hanya gambar yang diizinkan (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`,
`.avif`). Maksimum 20 MB per file (override via env `LEMBERG_UPLOAD_MAX_BYTES`).

### Toast error "Could not reach the studio API"

Backend mati atau port salah. Cek log backend dan `frontend/.env`.

---

## 11. Env vars lokal (opsional)

Di mode local **tidak perlu set env var apapun** — semua default sudah pas
untuk dev. Tapi kalau mau override (misalnya naikkan upload cap), buat file
`.env` di root atau export di shell:

```bash
# Linux/macOS
export LEMBERG_UPLOAD_MAX_BYTES=52428800   # 50 MB
export LEMBERG_LOG_LEVEL=DEBUG

# Windows PowerShell
$env:LEMBERG_UPLOAD_MAX_BYTES = "52428800"
$env:LEMBERG_LOG_LEVEL = "DEBUG"

# lalu jalankan uvicorn seperti biasa
```

Daftar lengkap env var di [.env.example](.env.example).

---

## 12. Stop semua

```bash
# Di terminal masing-masing: Ctrl+C

# Atau kalau lupa terminal mana yang mana:
# Windows PowerShell
Get-NetTCPConnection -LocalPort 8000,3000 -State Listen | ForEach-Object {
  Stop-Process -Id $_.OwningProcess -Force
}

# macOS / Linux
lsof -ti:8000,3000 | xargs kill -9
```

---

## 13. Selanjutnya

- **Editorial workflow** & detail UI: [README.md](README.md)
- **Deploy ke VPS / cloud**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Arsitektur + decisions**: [CMS_ARCHITECTURE.md](CMS_ARCHITECTURE.md)
