# 🔧 Fix Error 503: GCS not configured

## ❌ Error
```
503 GCS not configured
```

## 🔍 Penyebab
Backend tidak bisa membaca konfigurasi GCS karena:
1. `GCS_BUCKET_NAME` tidak di-set di `.env` file
2. Atau environment variable tidak ter-load dengan benar

## ✅ Solusi

### Step 1: Check Konfigurasi
Jalankan script untuk check konfigurasi:
```bash
cd /opt/agrione/agrione-v1
bash check-gcs-config.sh
```

### Step 2: Update .env File
Edit `.env` file dan pastikan ada 2 baris ini:
```bash
cd /opt/agrione/agrione-v1
nano .env
```

**Tambahkan atau update:**
```env
GCS_BUCKET_NAME=agrione-media
GOOGLE_APPLICATION_CREDENTIALS=/opt/gcs-credentials.json
```

**Catatan Penting:**
- `GCS_BUCKET_NAME` = nama bucket GCS Anda (contoh: `agrione-media`)
- `GOOGLE_APPLICATION_CREDENTIALS` = path **di dalam container** (`/opt/gcs-credentials.json`)
- File di VPS: `/opt/agrione/gcs-credentials.json` (file asli)
- Docker Compose mount: `/opt/agrione/gcs-credentials.json` (VPS) → `/opt/gcs-credentials.json` (container)

### Step 3: Pastikan File Credentials Ada
```bash
# Check apakah file ada
ls -la /opt/agrione/gcs-credentials.json

# Jika tidak ada, upload file ke VPS:
# scp gcs-credentials.json user@vps:/opt/agrione/gcs-credentials.json
```

### Step 4: Restart Backend
```bash
cd /opt/agrione/agrione-v1
docker compose restart backend
```

### Step 5: Check Logs
```bash
docker compose logs backend | tail -20
```

Jika masih error, check apakah:
- File credentials bisa diakses: `docker compose exec backend ls -la /opt/gcs-credentials.json`
- Environment variable ter-load: `docker compose exec backend env | grep GCS`

---

## 🚀 Quick Fix (One-liner)
```bash
cd /opt/agrione/agrione-v1 && \
echo "GCS_BUCKET_NAME=agrione-media" >> .env && \
echo "GOOGLE_APPLICATION_CREDENTIALS=/opt/gcs-credentials.json" >> .env && \
docker compose restart backend
```

**Ganti `agrione-media` dengan nama bucket GCS Anda!**

