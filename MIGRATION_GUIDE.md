# Panduan Migrasi Server VPS — Lemberg Winery

Dokumen ini menjelaskan langkah-langkah teknis untuk memindahkan aplikasi Lemberg (Backend, Frontend, Database, dan Assets) dari satu VPS ke VPS lain dengan aman.

---

## 1. Persiapan Server Baru (Destination)

Pastikan server baru memiliki spesifikasi minimal:
- **OS**: Ubuntu 22.04 LTS atau Linux modern lainnya.
- **Tools**: `docker`, `docker-compose-v2`, `git`, `ssh`.
- **Domain**: Update DNS record ke IP server baru (atau siapkan tunnel).

### Instalasi Dependency (Jika belum ada)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
sudo apt install docker.io docker-compose-v2 -y
sudo systemctl enable --now docker
```

---

## 2. Backup Data dari Server Lama (Source)

Data yang **wajib** dipindahkan adalah database SQLite dan folder uploads.

### A. Hentikan Service Sementara
Guna menghindari korupsi data pada file SQLite selama proses penyalinan.
```bash
cd ~/lemberg
sudo docker compose -f docker-compose.prod.yml down
```

### B. Kompres Data
```bash
# Backup Database (termasuk file WAL jika ada)
tar -czvf backup_db.tar.gz backend/cms.db*

# Backup Assets (Gambar yang diupload)
# Catatan: Periksa apakah volume Docker menggunakan folder lokal atau named volume.
# Jika menggunakan named volume (lemberg_uploads):
sudo tar -C /var/lib/docker/volumes/lemberg_lemberg_uploads/_data -czvf backup_uploads.tar.gz .
```

### C. Ambil File Konfigurasi
Pastikan Anda memiliki file `.env` dan folder `ssl/` (jika menggunakan sertifikat manual).

---

## 3. Transfer Data ke Server Baru

Gunakan `scp` atau `rsync` untuk memindahkan file backup ke server baru.

```bash
# Jalankan dari mesin lokal atau server lama
scp backup_db.tar.gz backup_uploads.tar.gz .env root@IP_SERVER_BARU:~/lemberg_migration/
```

---

## 4. Setup di Server Baru

### A. Clone Repository
```bash
cd ~
git clone https://github.com/dijiwa-id/lemberg.git
cd lemberg
```

### B. Restore Data
```bash
# Restore Database
tar -xzvf ~/lemberg_migration/backup_db.tar.gz -C .

# Restore Config
cp ~/lemberg_migration/.env .

# Setup SSL (Opsi: Copy folder ssl dari backup atau generate baru)
mkdir -p ssl
# scp file cert.pem dan key.pem ke sini
```

### C. Restore Uploads (Named Volume)
Karena production menggunakan Docker Named Volume, kita perlu melakukan trik "sidecar" untuk restore data ke dalam volume.
```bash
# Buat volume terlebih dahulu
sudo docker volume create lemberg_lemberg_uploads

# Restore konten menggunakan temporary container
sudo docker run --rm -v lemberg_lemberg_uploads:/dest -v ~/lemberg_migration:/src alpine \
  sh -c "tar -xzvf /src/backup_uploads.tar.gz -C /dest"
```

---

## 5. Deployment & Verifikasi

### A. Build dan Jalankan
```bash
sudo docker compose -f docker-compose.prod.yml up -d --build
```

### B. Cek Status
```bash
sudo docker compose -f docker-compose.prod.yml ps
sudo docker compose -f docker-compose.prod.yml logs -f backend
```

### C. Verifikasi Stabilitas
1. Buka domain/IP di browser.
2. Login ke Admin Studio.
3. Pastikan gambar di "Awarding Section" muncul (menandakan upload restore sukses).
4. Coba simpan konfigurasi (menandakan database writeable).

---

## 6. Flow Pembersihan (Pasca-Migrasi)

1. **DNS**: Pastikan TTL sudah lewat dan trafik sepenuhnya masuk ke server baru.
2. **SSL**: Jika menggunakan sertifikat `self-signed` di folder `ssl/`, pertimbangkan ganti ke Cloudflare SSL (Full/Strict) agar lebih profesional.
3. **Server Lama**: Hapus data sensitif dan matikan server lama setelah 24-48 jam verifikasi.

---
**Catatan Penting**: Sejak versi 1.5.0, database menggunakan **WAL Mode**. Pastikan file `cms.db-shm` dan `cms.db-wal` ikut dipindahkan jika Anda tidak mematikan container saat backup. Sangat disarankan mematikan container (`down`) sebelum backup agar file WAL di-*checkpoint* ke file `.db` utama.
