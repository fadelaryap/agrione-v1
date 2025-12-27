# Debug Guide: Google Cloud Storage Upload Error (AbortSignal)

## 🎯 Error yang Terjadi
```
Error: Expected signal to be an instanceof AbortSignal
at D._request (/app/.next/server/app/upload/route.js:115:37341)
```

## 📋 Checklist Debugging

### 1. ✅ Cek Versi Library
**File:** `frontend/package.json` & `frontend/package-lock.json`

- [ ] Versi `@google-cloud/storage` di package.json: `^7.7.0`
- [ ] **Versi yang terinstall (package-lock.json): `7.18.0` ⚠️** (lebih baru dari yang didefinisikan)
- [ ] Versi Next.js: `14.0.4`
- [ ] Versi Node.js di production (cek di Dockerfile - saat ini: `node:20-alpine`)

**⚠️ PENTING: Ada perbedaan versi!**
- package.json: `^7.7.0` (mengizinkan 7.7.0 hingga < 8.0.0)
- package-lock.json: `7.18.0` (versi yang benar-benar terinstall)
- Versi 7.18.0 lebih baru dan mungkin ada breaking changes atau bug

**Cara cek versi yang terinstall:**
```bash
cd frontend
npm list @google-cloud/storage
```

**Cek versi di package-lock.json:**
```bash
grep -A 5 '"@google-cloud/storage"' frontend/package-lock.json
```

**Solusi: Lock versi ke 7.7.0 atau downgrade:**
```bash
npm install @google-cloud/storage@7.7.0 --save-exact
```

---

### 2. ✅ Cek Environment Variables
**File:** `.env`, `docker-compose.prod.yml`, atau environment di server

**Variabel yang diperlukan:**
- [ ] `GOOGLE_CLIENT_EMAIL` - Email service account
- [ ] `GOOGLE_PRIVATE_KEY` - Private key (dengan \n atau newlines)
- [ ] `GOOGLE_PRIVATE_KEY_ID` - Private key ID
- [ ] `GOOGLE_CLIENT_ID` - Client ID
- [ ] `GOOGLE_PROJECT_ID` - Project ID (default: mystical-moon-469502-m5)
- [ ] `GCS_BUCKET_NAME` - Nama bucket (default: agrione-media)

**Cara cek di production:**
```bash
# Masuk ke container
docker exec -it agrione_frontend sh

# Cek environment variables
env | grep GOOGLE
env | grep GCS
```

**Test apakah variabel ter-set dengan benar:**
```bash
# Di dalam container
node -e "console.log('EMAIL:', process.env.GOOGLE_CLIENT_EMAIL ? 'SET' : 'NOT SET'); console.log('KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'SET (' + process.env.GOOGLE_PRIVATE_KEY.length + ' chars)' : 'NOT SET')"
```

---

### 3. ✅ Cek Konfigurasi Google Cloud Storage
**File:** `frontend/app/upload/route.ts`

**Yang perlu dicek:**
- [ ] Storage instance diinisialisasi dengan benar
- [ ] Credentials format benar (private key dengan newlines)
- [ ] Bucket name sesuai dengan environment variable
- [ ] Method upload yang digunakan (createWriteStream, save, atau upload)

**Test initialization:**
Tambahkan logging di `route.ts`:
```typescript
console.log('GCS Storage initialized:', storage !== null)
console.log('Bucket name:', bucketName)
console.log('Project ID:', process.env.GOOGLE_PROJECT_ID)
```

---

### 4. ✅ Cek File Upload Route
**File:** `frontend/app/upload/route.ts`

**Yang perlu dicek:**
- [ ] Route handler menggunakan `export async function POST`
- [ ] FormData parsing benar
- [ ] File size tidak terlalu besar (bisa trigger resumable upload)
- [ ] Method upload yang digunakan

**Test dengan logging:**
```typescript
console.log('File received:', {
  name: file.name,
  size: file.size,
  type: file.type,
  bufferSize: buffer.length
})
```

---

### 5. ✅ Cek Next.js Configuration
**File:** `frontend/next.config.js`

**Yang perlu dicek:**
- [ ] Output mode (standalone untuk Docker)
- [ ] Webpack configuration (jika ada custom config)
- [ ] Minification settings

---

### 6. ✅ Cek Build & Runtime
**File:** `frontend/Dockerfile`, `docker-compose.prod.yml`

**Yang perlu dicek:**
- [ ] Build berhasil tanpa error
- [ ] Dependencies terinstall dengan benar
- [ ] Environment variables ter-pass ke container
- [ ] Node version sesuai

**Cek build logs:**
```bash
docker logs agrione_frontend 2>&1 | grep -i "error\|warning\|gcs\|storage"
```

---

### 7. ✅ Test Upload dengan File Kecil vs Besar

**File kecil (< 5MB):**
- Seharusnya menggunakan simple upload (non-resumable)
- Tidak akan trigger AbortSignal error

**File besar (> 5MB):**
- Otomatis menggunakan resumable upload
- Bisa trigger AbortSignal error

**Test:**
```typescript
// Tambahkan di route.ts
const fileSizeMB = buffer.length / (1024 * 1024)
console.log('File size:', fileSizeMB.toFixed(2), 'MB')
console.log('Will use resumable:', fileSizeMB > 5)
```

---

### 8. ✅ Cek Dependency Conflicts

**Library yang bisa conflict:**
- `node-fetch` (dipakai oleh @google-cloud/storage)
- `axios` (dipakai di frontend)
- Versi Node.js

**Cek dependency tree:**
```bash
cd frontend
npm ls @google-cloud/storage
npm ls node-fetch
```

---

### 9. ✅ Cek Production vs Development

**Perbedaan yang mungkin menyebabkan error:**
- [ ] Production menggunakan Docker, development tidak
- [ ] Production menggunakan Next.js standalone build
- [ ] Production environment variables berbeda
- [ ] Production menggunakan Node.js version berbeda

**Test di development:**
```bash
cd frontend
npm run dev
# Test upload di localhost:3000/upload
```

---

### 10. ✅ Cek Logs Production

**Cara melihat logs:**
```bash
# Logs real-time
docker logs -f agrione_frontend

# Logs dengan filter
docker logs agrione_frontend 2>&1 | grep -i "upload\|gcs\|storage\|abort"

# Logs dengan timestamp
docker logs -t agrione_frontend
```

**Cari error pattern:**
- `AbortSignal`
- `Expected signal`
- `resumable`
- `makeRequestStream`
- `startUploading`

---

## 🔍 Step-by-Step Debugging

### Step 1: Verifikasi Environment Variables
```bash
# Di production server
docker exec agrione_frontend env | grep -E "GOOGLE|GCS"
```

### Step 2: Test Storage Initialization
Tambahkan endpoint test di `route.ts`:
```typescript
export async function GET() {
  return NextResponse.json({
    storageInitialized: storage !== null,
    bucketName: bucketName,
    hasCredentials: !!(
      process.env.GOOGLE_CLIENT_EMAIL && 
      process.env.GOOGLE_PRIVATE_KEY
    )
  })
}
```

Akses: `https://agrione.agrihub.id/upload` (GET method)

### Step 3: Test Upload dengan File Kecil
Coba upload file < 1MB untuk test simple upload

### Step 4: Test Upload dengan File Besar
Coba upload file > 5MB untuk test resumable upload

### Step 5: Compare dengan Working Code
Bandingkan kode current dengan versi yang sebelumnya bekerja

---

## 🛠️ Files yang Berhubungan dengan GCS

### Core Files
1. **`frontend/app/upload/route.ts`** - Main upload handler
2. **`frontend/lib/api.ts`** - uploadAPI.uploadFile() - Client-side upload function
3. **`frontend/package.json`** - @google-cloud/storage dependency
4. **`frontend/package-lock.json`** - Locked versions

### Configuration Files
5. **`docker-compose.prod.yml`** - Environment variables untuk production
6. **`frontend/Dockerfile`** - Build configuration
7. **`.env`** (jika ada) - Local environment variables
8. **`frontend/next.config.js`** - Next.js configuration

### Files yang Menggunakan Upload
9. **`frontend/app/lapangan/work-orders/[id]/report/create/page.tsx`** - Menggunakan uploadAPI
10. **`frontend/components/attendance/AttendanceCard.tsx`** - Menggunakan uploadAPI
11. **Lainnya yang menggunakan `uploadAPI.uploadFile()`**

---

## 🎯 Potential Solutions

### Solution 1: Force Non-Resumable Upload
```typescript
// Di route.ts, gunakan file.save() untuk file kecil
// Atau gunakan createWriteStream dengan resumable: false
const stream = fileUpload.createWriteStream({
  metadata: { contentType: file.type },
  resumable: false // Force non-resumable
})
```

### Solution 2: Downgrade @google-cloud/storage
```bash
npm install @google-cloud/storage@6.9.7
```

### Solution 3: Use REST API Directly
Hindari library, gunakan fetch langsung ke GCS REST API

### Solution 4: Update Next.js & Dependencies
```bash
npm update next @google-cloud/storage
```

---

## 📝 Notes

- Error terjadi di production build (`.next/server/app/upload/route.js`)
- Error terkait dengan resumable upload mechanism
- Kemungkinan masalah minification atau bundling
- Cek apakah error hanya terjadi untuk file besar (>5MB)
- **⚠️ Ada perbedaan versi: package.json `^7.7.0` tapi package-lock.json `7.18.0`**

## 🚀 Quick Start Debugging

1. **Jalankan script helper:**
   ```bash
   cd frontend
   npm run check-gcs
   ```

2. **Cek versi yang terinstall:**
   ```bash
   npm list @google-cloud/storage
   ```

3. **Cek environment variables di production:**
   ```bash
   docker exec agrione_frontend env | grep GOOGLE
   ```

4. **Lihat logs error:**
   ```bash
   docker logs agrione_frontend 2>&1 | grep -i "abort\|upload\|gcs"
   ```

