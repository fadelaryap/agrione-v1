# ☁️ Setup GCS - Versi Sederhana (Pakai File)

## 📋 Step 1: Taruh File di VPS

```bash
# Upload file ke VPS (dari local)
scp gcs-credentials.json user@vps:/opt/agrione/gcs-credentials.json

# Atau jika sudah di VPS, pindahkan ke lokasi yang tepat
sudo mkdir -p /opt/agrione
sudo mv gcs-credentials.json /opt/agrione/gcs-credentials.json
sudo chmod 600 /opt/agrione/gcs-credentials.json
```

---

## 📝 Step 2: Update .env File

```bash
cd /opt/agrione/agrione-v1
nano .env
```

**Tambahkan 2 baris ini:**

```env
GCS_BUCKET_NAME=agrione-media
GOOGLE_APPLICATION_CREDENTIALS=/opt/gcs-credentials.json
```

**Catatan:** Path `/opt/gcs-credentials.json` adalah path **di dalam container** (setelah di-mount dari `/opt/agrione/gcs-credentials.json` di VPS).

**Selesai!** ✅

---

## 🚀 Step 3: Restart Backend

```bash
cd /opt/agrione/agrione-v1
docker compose restart backend
```

---

## ✅ Step 4: Test

1. Buka aplikasi
2. Coba upload foto di absen atau field report
3. Check di GCS Console apakah file sudah terupload

---

## 🔍 Troubleshooting

### Error: "credentials file not found"

**Fix:**
```bash
# Check apakah file ada
ls -la /opt/agrione/gcs-credentials.json

# Check permission
chmod 600 /opt/agrione/gcs-credentials.json

# Check path di .env
cat .env | grep GOOGLE_APPLICATION_CREDENTIALS
```

### Error: "Access Denied"

**Fix:**
1. Buka file `gcs-credentials.json`
2. Check `project_id` dan `client_email`
3. Pastikan service account punya role `Storage Object Admin` di GCP Console

---

## 📌 Catatan Penting

1. **File di VPS:** `/opt/agrione/gcs-credentials.json` (path di VPS)
2. **Path di .env:** `/opt/gcs-credentials.json` (path di dalam container)
3. **Docker Compose** akan otomatis mount:
   - Dari: `/opt/agrione/gcs-credentials.json` (VPS)
   - Ke: `/opt/gcs-credentials.json` (container)
4. Jika GCS belum dikonfigurasi, sistem akan pakai base64 fallback (untuk development)

## 🚀 Upload Flow (Direct Upload)

Sistem sekarang pakai **direct upload** dari frontend ke GCS:
1. Frontend request signed URL ke backend
2. Backend generate signed URL (valid 15 menit)
3. Frontend upload langsung ke GCS
4. Frontend kirim URL ke backend untuk disimpan

**Keuntungan:** Lebih cepat, hemat bandwidth backend, scalable!

---

**Gampang kan?** 😎

