# 🚀 Direct Upload ke GCS (Frontend → GCS)

## ✅ Keuntungan

1. **Lebih Cepat**: File langsung ke GCS, tidak lewat backend
2. **Hemat Bandwidth Backend**: Backend tidak perlu handle file upload
3. **Lebih Efisien**: Backend hanya generate signed URL (ringan)
4. **Scalable**: Tidak ada bottleneck di backend untuk upload besar

---

## 🔄 Cara Kerja

1. **Frontend** request signed URL ke backend: `POST /api/upload/signed-url`
2. **Backend** generate signed URL (valid 15 menit) dan return ke frontend
3. **Frontend** upload file langsung ke GCS menggunakan signed URL
4. **Frontend** kirim public URL ke backend untuk disimpan di database

---

## 📋 Setup

### 1. Update Go Version

✅ **Sudah diupdate** di `backend/Dockerfile`:
```dockerfile
FROM golang:1.24-alpine
```

### 2. Service Account Permission

Service account harus punya permission untuk **sign URLs**:
- Role: `Service Account Token Creator` (optional, untuk advanced)
- Atau pastikan service account punya akses ke bucket

### 3. Test Upload

1. Buka aplikasi
2. Coba upload foto di absen atau field report
3. Check network tab:
   - Request 1: `POST /api/upload/signed-url` (dari backend)
   - Request 2: `PUT https://storage.googleapis.com/...` (langsung ke GCS)

---

## 🔍 Troubleshooting

### Error: "Failed to generate signed URL"

**Penyebab:** Service account tidak punya permission

**Fix:**
1. Buka GCP Console → IAM & Admin → Service Accounts
2. Klik service account Anda
3. Pastikan punya role: `Storage Object Admin` atau `Storage Admin`
4. Untuk sign URLs, pastikan service account punya akses ke bucket

### Error: "Failed to upload to GCS: 403"

**Penyebab:** Signed URL expired atau tidak valid

**Fix:**
- Signed URL valid 15 menit
- Pastikan upload dilakukan segera setelah dapat signed URL
- Check apakah Content-Type header sesuai

---

## 📊 Flow Diagram

```
Frontend                    Backend                    GCS
   |                           |                         |
   |-- POST /upload/signed-url->|                         |
   |                           |-- Generate Signed URL --|
   |<-- Return Signed URL -----|                         |
   |                           |                         |
   |-- PUT file (direct) ------------------------------->|
   |                           |                         |
   |<-- 200 OK -------------------------------------------|
   |                           |                         |
   |-- POST /attendance (with URL) ->|                   |
   |                           |-- Save URL to DB        |
   |<-- Success ----------------|                         |
```

---

**Lebih efisien kan?** 😎

