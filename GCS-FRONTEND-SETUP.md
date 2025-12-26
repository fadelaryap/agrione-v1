# 🚀 Setup GCS di Frontend (Direct Upload)

## 📋 Step 1: Update .env File

Edit `.env` di VPS:

```bash
cd /opt/agrione/agrione-v1
nano .env
```

**Tambahkan 2 baris ini:**

```env
GCS_BUCKET_NAME=agrione-media
GCS_CREDENTIALS_JSON={"type":"service_account","project_id":"mystical-moon-469502-m5","private_key_id":"ab9ab51bc90c2c1212e2ae1174b929005cf7dc9d","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"agrione-gcs-uploader@mystical-moon-469502-m5.iam.gserviceaccount.com",...}
```

**Catatan Penting:**
- `GCS_CREDENTIALS_JSON` harus **satu baris** (tidak ada newline)
- Copy semua isi dari `gcs-credentials.json` dan jadikan satu baris JSON
- Atau gunakan command ini untuk convert:

```bash
# Convert file ke satu baris JSON
cat /opt/agrione/gcs-credentials.json | jq -c . > /tmp/gcs-one-line.json
# Copy isinya ke .env
```

## 📝 Step 2: Format Credentials di .env

Jika credentials panjang, bisa pakai heredoc atau escape:

```bash
# Method 1: Pakai jq untuk compress
GCS_CREDENTIALS_JSON=$(cat /opt/agrione/gcs-credentials.json | jq -c .)

# Method 2: Manual (hapus semua newline dan space)
# Copy isi gcs-credentials.json, hapus semua \n, jadi satu baris
```

**Contoh format di .env:**
```env
GCS_CREDENTIALS_JSON={"type":"service_account","project_id":"mystical-moon-469502-m5",...}
```

## 🔄 Step 3: Rebuild Frontend

```bash
cd /opt/agrione/agrione-v1
docker compose up -d --build frontend
```

**PENTING:** `NEXT_PUBLIC_*` adalah build-time variables, jadi **WAJIB rebuild** frontend!

## ✅ Step 4: Test Upload

1. Buka aplikasi
2. Coba upload foto di absen atau field report
3. Check di GCS Console apakah file sudah terupload

---

## 🔍 Troubleshooting

### Error: "GCS not configured"

**Penyebab:** Environment variable tidak ter-set atau tidak ter-load

**Fix:**
1. Check `.env` file:
   ```bash
   grep GCS .env
   ```

2. Check environment variable di container:
   ```bash
   docker compose exec frontend env | grep GCS
   ```

3. Pastikan rebuild frontend:
   ```bash
   docker compose up -d --build frontend
   ```

### Error: "Failed to get access token"

**Penyebab:** Credentials JSON tidak valid atau format salah

**Fix:**
1. Pastikan `GCS_CREDENTIALS_JSON` adalah valid JSON (satu baris)
2. Test parse JSON:
   ```bash
   echo "$GCS_CREDENTIALS_JSON" | jq .
   ```

### Error: "Failed to upload to GCS: 403"

**Penyebab:** Service account tidak punya permission

**Fix:**
1. Buka GCP Console → IAM & Admin → Service Accounts
2. Klik service account Anda
3. Pastikan punya role: `Storage Object Admin` atau `Storage Admin`

---

## 📊 Cara Kerja

1. **Frontend** membaca `NEXT_PUBLIC_GCS_BUCKET_NAME` dan `NEXT_PUBLIC_GCS_CREDENTIALS` dari environment
2. **Frontend** generate OAuth2 token dari service account credentials
3. **Frontend** upload file langsung ke GCS menggunakan REST API
4. **Frontend** return public URL ke backend untuk disimpan di database

**Keuntungan:**
- ✅ File langsung ke GCS, tidak lewat backend
- ✅ Backend hanya terima URL (ringan)
- ✅ Tidak perlu backend handle file upload

---

**Selesai!** 🎉

