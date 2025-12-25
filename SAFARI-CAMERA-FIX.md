# 🎥 Safari Camera Access Fix

Panduan untuk mengatasi masalah akses kamera di Safari.

---

## ❌ Masalah

Safari memblokir akses kamera pada HTTP (non-HTTPS) karena kebijakan keamanan yang ketat.

**Error yang muncul:**
- "Failed to access camera. Please allow camera permission"
- Tidak ada popup permission yang muncul
- Kamera tidak bisa diakses

---

## ✅ Solusi

### 1. Gunakan Browser Lain (Quick Fix)

**Chrome atau Firefox** lebih permisif dan akan mengizinkan akses kamera pada HTTP:

- ✅ Chrome: `http://103.31.205.102:3000`
- ✅ Firefox: `http://103.31.205.102:3000`
- ❌ Safari: Memerlukan HTTPS

### 2. Setup HTTPS (Recommended untuk Production)

Untuk Safari, Anda perlu setup HTTPS. **Bisa pakai IP address saja!** Beberapa opsi:

#### A. Menggunakan IP Address dengan Self-Signed Certificate (✅ Recommended untuk IP)

**Bisa pakai IP address saja tanpa domain!**

```bash
# Install Nginx
sudo apt install nginx openssl -y

# Generate self-signed certificate untuk IP
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/agrione.key \
  -out /etc/nginx/ssl/agrione.crt \
  -subj "/C=ID/ST=Indonesia/L=Jakarta/O=Agrione/CN=103.31.205.102" \
  -addext "subjectAltName=IP:103.31.205.102"
```

**Lihat panduan lengkap di `HTTPS-WITH-IP.md`**

#### B. Menggunakan Domain dengan Let's Encrypt (Untuk Production)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d yourdomain.com
```

#### B. Menggunakan Cloudflare (Free SSL)

1. Daftar di Cloudflare
2. Tambahkan domain/IP
3. Setup DNS
4. Enable SSL/TLS
5. Akses via HTTPS

### 3. Manual Permission di Safari

Jika sudah menggunakan HTTPS, tapi masih tidak muncul permission:

1. Buka **Safari Preferences** → **Websites** → **Camera**
2. Cari domain/IP Anda
3. Pilih **Allow**
4. Refresh halaman

---

## 🔧 Error Handling yang Sudah Ditambahkan

Kode sekarang sudah menambahkan:

1. **HTTPS Check** - Deteksi apakah menggunakan HTTPS
2. **Detailed Error Messages** - Pesan error yang jelas untuk setiap jenis error
3. **Browser Detection** - Deteksi browser dan berikan solusi yang sesuai

### Error Types yang Ditangani:

- `NotAllowedError` / `PermissionDeniedError` - Izin ditolak
- `NotFoundError` / `DevicesNotFoundError` - Kamera tidak ditemukan
- `NotReadableError` / `TrackStartError` - Kamera sedang digunakan
- `OverconstrainedError` - Kamera tidak mendukung mode yang diminta

---

## 📱 Testing di Safari

### Cara Test:

1. Buka Safari
2. Akses `http://103.31.205.102:3000`
3. Coba akses kamera
4. Akan muncul alert dengan pesan:
   ```
   ⚠️ Safari memerlukan HTTPS untuk akses kamera!
   
   Karena Anda menggunakan HTTP, Safari memblokir akses kamera.
   
   Solusi:
   1. Gunakan browser Chrome atau Firefox (lebih permisif)
   2. Atau setup HTTPS untuk production
   3. Atau akses via localhost untuk development
   ```

---

## 🚀 Quick Solution untuk User

**Untuk user yang menggunakan Safari:**

1. **Gunakan Chrome atau Firefox** (paling mudah)
2. Atau tunggu setup HTTPS (jika admin sudah setup)

**Untuk admin:**

1. Setup HTTPS dengan Let's Encrypt atau Cloudflare
2. Update CORS_ORIGIN dan NEXT_PUBLIC_API_URL ke HTTPS
3. Restart containers

---

## 📝 Notes

- Safari memerlukan HTTPS untuk akses kamera (security policy)
- Chrome dan Firefox lebih permisif untuk development
- Error handling sudah ditambahkan di:
  - `AttendanceCard.tsx` (attendance)
  - `report/create/page.tsx` (field reports)

---

## 🔍 Debug

Jika masih ada masalah:

1. Check browser console untuk error detail
2. Check Safari Preferences → Websites → Camera
3. Coba di Chrome/Firefox untuk verifikasi
4. Pastikan kamera tidak digunakan aplikasi lain

