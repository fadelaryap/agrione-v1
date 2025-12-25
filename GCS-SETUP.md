# ☁️ Setup Google Cloud Storage untuk Media Upload

Panduan setup GCS untuk mengatasi error 413 (payload terlalu besar) saat upload foto/video.

---

## 📋 Prerequisites

1. **Google Cloud Account** dengan billing enabled
2. **Google Cloud Project** sudah dibuat
3. **Service Account** dengan permission untuk GCS

---

## 🔧 Step 1: Buat GCS Bucket

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Pilih project Anda
3. Navigate ke **Cloud Storage** → **Buckets**
4. Klik **Create Bucket**
5. Isi:
   - **Name**: `agrione-media` (atau nama lain, harus unique globally)
   - **Location type**: `Region` (pilih region terdekat, misal: `asia-southeast2` untuk Jakarta)
   - **Storage class**: `Standard`
   - **Access control**: `Uniform` (recommended)
6. Klik **Create**

---

## 🔑 Step 2: Buat Service Account

1. Navigate ke **IAM & Admin** → **Service Accounts**
2. Klik **Create Service Account**
3. Isi:
   - **Name**: `agrione-gcs-uploader`
   - **Description**: `Service account for uploading media to GCS`
4. Klik **Create and Continue**
5. **Grant access**:
   - Role: `Storage Object Admin` (untuk upload/delete)
   - Atau `Storage Object Creator` (hanya upload)
6. Klik **Done**

---

## 📝 Step 3: Download Service Account Key

1. Klik service account yang baru dibuat
2. Tab **Keys**
3. Klik **Add Key** → **Create new key**
4. Pilih **JSON**
5. Klik **Create** (file JSON akan terdownload)
6. **Simpan file JSON ini dengan aman!**

---

## ⚙️ Step 4: Setup di VPS

### 4.1 Update .env File

```bash
cd /opt/agrione/agrione-v1
nano .env
```

**Tambahkan:**

```env
# Google Cloud Storage
GCS_BUCKET_NAME=agrione-media
GCS_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project",...}
```

**Atau jika pakai file:**

```env
GCS_BUCKET_NAME=agrione-media
GOOGLE_APPLICATION_CREDENTIALS=/opt/agrione/gcs-credentials.json
```

### 4.2 Upload Credentials File (jika pakai file)

```bash
# Upload file JSON ke VPS
scp path/to/service-account-key.json user@vps:/opt/agrione/gcs-credentials.json

# Set permissions
ssh user@vps
sudo chmod 600 /opt/agrione/gcs-credentials.json
```

### 4.3 Update docker-compose.yml (jika pakai file)

```yaml
backend:
  environment:
    # ... existing vars ...
    GCS_BUCKET_NAME: ${GCS_BUCKET_NAME}
    GOOGLE_APPLICATION_CREDENTIALS: ${GOOGLE_APPLICATION_CREDENTIALS}
  volumes:
    - ./backend:/app
    - /opt/agrione/gcs-credentials.json:/opt/agrione/gcs-credentials.json:ro
```

---

## 🚀 Step 5: Restart Services

```bash
cd /opt/agrione/agrione-v1
docker compose restart backend
```

---

## ✅ Step 6: Test Upload

1. Buka aplikasi
2. Coba upload foto di absen atau field report
3. Check di GCS Console apakah file sudah terupload
4. Check URL di database - seharusnya `https://storage.googleapis.com/...`

---

## 🔍 Troubleshooting

### Error: "Failed to create GCS client"

**Penyebab:** Credentials tidak valid atau bucket tidak ada

**Fix:**
```bash
# Check credentials
cat .env | grep GCS

# Test credentials
gcloud auth activate-service-account --key-file=/opt/agrione/gcs-credentials.json
gsutil ls gs://agrione-media
```

### Error: "Access Denied"

**Penyebab:** Service account tidak punya permission

**Fix:**
1. Buka Service Account di GCP Console
2. Pastikan role: `Storage Object Admin` atau `Storage Object Creator`
3. Pastikan bucket access control = `Uniform`

### Error: "Bucket not found"

**Penyebab:** Nama bucket salah atau tidak ada

**Fix:**
```bash
# List buckets
gsutil ls

# Check bucket name di .env
cat .env | grep GCS_BUCKET_NAME
```

---

## 💡 Tips

1. **Bucket Naming**: Nama bucket harus unique globally, jadi pakai prefix project (e.g., `agrione-media-2025`)
2. **Region**: Pilih region terdekat untuk latency lebih rendah
3. **Lifecycle Rules**: Setup lifecycle rules untuk auto-delete file lama (optional)
4. **CORS**: Jika perlu akses langsung dari browser, setup CORS di bucket

---

## 📊 Cost Estimation

- **Storage**: ~$0.020 per GB per bulan
- **Operations**: ~$0.05 per 10,000 operations
- **Network Egress**: ~$0.12 per GB (keluar dari GCP)

**Untuk 1000 foto (5MB each) = 5GB:**
- Storage: ~$0.10/bulan
- Upload operations: ~$0.005
- **Total: ~$0.11/bulan**

---

## 🎯 Summary

**Setup:**
1. ✅ Buat GCS bucket
2. ✅ Buat service account dengan permission
3. ✅ Download credentials JSON
4. ✅ Update `.env` dengan `GCS_BUCKET_NAME` dan `GCS_CREDENTIALS_JSON`
5. ✅ Restart backend

**Done!** 🎉

