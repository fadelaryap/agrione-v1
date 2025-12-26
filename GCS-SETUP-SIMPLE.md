# ☁️ Setup GCS - Versi Simple (Pakai Next.js API Route)

## 📋 Step 1: Install Package

```bash
cd frontend
npm install @google-cloud/storage
```

## 📝 Step 2: Update .env File

Edit `.env` di VPS:

```bash
cd /opt/agrione/agrione-v1
nano .env
```

**Tambahkan baris ini:**

```env
GCS_BUCKET_NAME=agrione-media
GOOGLE_CLIENT_EMAIL=agrione-gcs-uploader@mystical-moon-469502-m5.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4VhV8Niuckvle\n...\n-----END PRIVATE KEY-----\n
GOOGLE_PRIVATE_KEY_ID=ab9ab51bc90c2c1212e2ae1174b929005cf7dc9d
GOOGLE_CLIENT_ID=100249810148217928356
GOOGLE_PROJECT_ID=mystical-moon-469502-m5
```

**Catatan Penting:**
- `GOOGLE_PRIVATE_KEY` harus pakai `\n` untuk newline (bukan newline asli)
- Copy semua isi `private_key` dari `gcs-credentials.json`, ganti newline dengan `\n`

**Cara convert dari file ke .env:**
```bash
# Extract values dari gcs-credentials.json
cat /opt/agrione/gcs-credentials.json | jq -r '.client_email'  # untuk GOOGLE_CLIENT_EMAIL
cat /opt/agrione/gcs-credentials.json | jq -r '.private_key_id'  # untuk GOOGLE_PRIVATE_KEY_ID
cat /opt/agrione/gcs-credentials.json | jq -r '.client_id'  # untuk GOOGLE_CLIENT_ID
cat /opt/agrione/gcs-credentials.json | jq -r '.private_key' | sed 's/$/\\n/' | tr -d '\n'  # untuk GOOGLE_PRIVATE_KEY
```

## 🔄 Step 3: Rebuild Frontend

```bash
cd /opt/agrione/agrione-v1
docker compose up -d --build frontend
```

**PENTING:** Environment variables di Next.js API route adalah runtime variables, jadi **tidak perlu rebuild** (tapi rebuild untuk pastikan package terinstall).

## ✅ Step 4: Test Upload

1. Buka aplikasi
2. Coba upload foto di absen atau field report
3. Check di GCS Console apakah file sudah terupload

---

## 🔍 Troubleshooting

### Error: "GCS credentials not configured"

**Penyebab:** Environment variable tidak ter-set

**Fix:**
1. Check `.env` file:
   ```bash
   grep GOOGLE .env
   ```

2. Check environment variable di container:
   ```bash
   docker compose exec frontend env | grep GOOGLE
   ```

3. Pastikan `GOOGLE_PRIVATE_KEY` pakai `\n` bukan newline asli

### Error: "Failed to upload file"

**Penyebab:** Service account tidak punya permission

**Fix:**
1. Buka GCP Console → IAM & Admin → Service Accounts
2. Klik service account Anda
3. Pastikan punya role: `Storage Object Admin` atau `Storage Admin`

---

## 📊 Cara Kerja

1. **Frontend** upload file ke Next.js API route: `POST /api/upload`
2. **Next.js API route** upload file ke GCS menggunakan `@google-cloud/storage`
3. **Next.js API route** return public URL
4. **Frontend** kirim URL ke Go backend untuk disimpan di database

**Keuntungan:**
- ✅ Simple, pakai library yang sudah ada
- ✅ Credentials di server (Next.js), tidak exposed ke client
- ✅ Go backend hanya terima URL (ringan)

---

**Selesai!** 🎉
