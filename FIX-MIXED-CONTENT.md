# 🔧 Fix Mixed Content Error

Panduan cepat untuk memperbaiki error Mixed Content setelah setup domain dengan Cloudflare.

**Note:** Dengan Cloudflare Flexible mode, tidak perlu setup SSL di server. Cloudflare menangani HTTPS ke user.

---

## ❌ Error

```
Mixed Content: The page at 'https://agrione.agrihub.id/login' was loaded over HTTPS, 
but requested an insecure resource 'http://103.31.205.102:8000/api/csrf'. 
This request has been blocked; the content must be served over HTTPS.
```

**Penyebab:** `NEXT_PUBLIC_API_URL` di `.env` masih menggunakan IP address (`http://103.31.205.102:8000`), padahal seharusnya menggunakan domain (`https://agrione.agrihub.id/api`). Frontend Next.js membaca `NEXT_PUBLIC_API_URL` saat build time, jadi perlu rebuild setelah update `.env`.

---

## ✅ Quick Fix

### Step 1: Update .env File

```bash
cd /opt/agrione/agrione-v1
nano .env
```

**Update menjadi:**

```env
# Database (tidak perlu diubah)
POSTGRES_USER=agrione
POSTGRES_PASSWORD=agrione123
POSTGRES_DB=agrione_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CSRF_SECRET=your-csrf-secret-key-change-in-production

# Update ke HTTPS domain (PENTING!)
# NEXT_PUBLIC_API_URL harus include /api di akhir
CORS_ORIGIN=https://agrione.agrihub.id
NEXT_PUBLIC_API_URL=https://agrione.agrihub.id/api
```

**Save:** `Ctrl+X`, `Y`, `Enter`

### Step 2: Restart Containers

```bash
# Restart frontend dan backend
docker compose restart frontend backend

# Atau rebuild frontend (karena NEXT_PUBLIC_API_URL adalah build-time variable)
docker compose up -d --build frontend
```

**Note:** `NEXT_PUBLIC_API_URL` adalah build-time variable di Next.js, jadi perlu rebuild frontend!

### Step 3: Verify

```bash
# Check .env file
cat .env | grep -E "CORS_ORIGIN|NEXT_PUBLIC_API_URL"

# Check environment variables di container
docker compose exec frontend env | grep NEXT_PUBLIC_API_URL
docker compose exec backend env | grep CORS_ORIGIN

# Check logs
docker compose logs frontend | tail -20
```

**Note:** Environment variable di container mungkin masih menunjukkan nilai lama jika belum rebuild. Yang penting adalah `.env` file sudah benar dan frontend sudah di-rebuild.

---

## 🔍 Troubleshooting

### Masih Error?

1. **Pastikan Nginx sudah setup dengan benar:**
   ```bash
   # Test Nginx config
   sudo nginx -t
   
   # Check Nginx status
   sudo systemctl status nginx
   ```

2. **Pastikan Nginx proxy `/api` ke backend:**
   ```bash
   # Test API via Nginx
   curl https://agrione.agrihub.id/api/health
   ```

3. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) atau `Cmd+Shift+R` (Mac)
   - Atau clear cache di browser settings

4. **Check browser console:**
   - Buka Developer Tools (F12)
   - Tab Console
   - Lihat apakah masih ada error Mixed Content

---

## 📝 One-Line Fix (Jalankan di VPS!)

```bash
cd /opt/agrione/agrione-v1 && \
sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=https://agrione.agrihub.id|' .env && \
sed -i 's|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://agrione.agrihub.id/api|' .env && \
docker compose up -d --build frontend && \
docker compose restart backend
```

**⚠️ PENTING:** 
- Pastikan jalankan di VPS, bukan di local
- `NEXT_PUBLIC_API_URL` adalah **build-time variable**, jadi **WAJIB rebuild** frontend
- Setelah rebuild, clear browser cache (Ctrl+Shift+R)

---

## ✅ Verification

Setelah fix, test:

1. **Buka:** `https://agrione.agrihub.id/login`
2. **Check Network tab** (F12 → Network):
   - Semua request ke `/api/*` harus menggunakan `https://agrione.agrihub.id/api`
   - Tidak ada request ke `http://103.31.205.102:8000`
3. **Test login** - Seharusnya berhasil tanpa error

---

## 🎯 Summary

**Masalah:** Mixed Content (HTTPS page → HTTP API)

**Solusi:** 
1. Update `NEXT_PUBLIC_API_URL` ke HTTPS domain
2. Rebuild frontend (karena build-time variable)
3. Restart backend (untuk CORS_ORIGIN)

**Done!** 🎉

