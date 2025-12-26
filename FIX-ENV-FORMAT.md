# ✅ Format .env yang Benar untuk GCS

## Format yang Benar:

```env
POSTGRES_USER=agrione
POSTGRES_PASSWORD=agrione123
POSTGRES_DB=agrione_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CSRF_SECRET=your-csrf-secret-key-change-in-production
CORS_ORIGIN=https://agrione.agrihub.id
NEXT_PUBLIC_API_URL=https://agrione.agrihub.id/api

# GCS Configuration (pakai environment variables, bukan file)
GCS_BUCKET_NAME=agrione-media
GOOGLE_CLIENT_EMAIL=agrione-gcs-uploader@mystical-moon-469502-m5.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4VhV8Niuckvle\nnrJigUEKd/WwzdoUdNNUmm2dL944NK+V7YWxBfckV9+L1buxc9sHwYjHmC/d3NlO\nVu9S3RKMDXhpMM9mgiZjkJBbE28Kq7MjkI51F6ZBycUtU44Ie3UcwPP2hc/7TAL5\nh6L5z2lXmCFhxJ5z5VOIBV4tfDTeaVWRmuHcTDIUumxsfWO4BQlOjh4fvIeooGn9\nrukpVlxvraCtF8UJAtREMwAkMSBEXLMMc2wNmbOOnTqYe6x1QkpBsYSsvx2tXKEJ\n+PZDVuVrwPXknGEwZv+LPibZlyovGAz9ZHhN1p3W7o4ytz1P5dvVEvpcYp11Xadu\nxsOg+E3xAgMBAAECggEAHkvds6DGmbEJRb0g9fIm8bTGH3UxzM9npV3NOrqxk/zK\nyAI2CSKBHErJ/bZW5yMywktTcvSHF3iTCZ5drrmRcQ3MtsM0LzWgYBhUNXfT9gXC\nx0tcso98vo7ONrUnIKtD1AI9hoy3Imb7jS33AgZOGryw7dvuK/+qsy4orKKfoNcZ\nFHipFTFwM178QDe1EXREThEHdVlCxV8zAexSmrHLZecuEXDckbCx4oGTz/ickcwn\nwXkoZ8eprr+bTPfFNUta3Zg997Ldu46yfvYXKXkDAZDj6sS7FbBDqc8BFc3hhzcj\n/gPEWgk6vP82LRQDJuM3MPx6QBOVOYPYBLSyVQ5ZrQKBgQDm2LD0RGW/k+84Y6ck\ntte4MJHpoj1qoyFmORSac8X3Nzm7VtF2yk1RyuhVxMzxlLQlVMiQxfFWhwngv8XK\nk1NIitN8jaBKWA1yL9V3plV9pR/5rpra9picvNpgMKIQ5kxbpBBy20JQSJ43v7mb\nEM+gsuXqWpffBOfZ2faPTNS2jQKBgQDMbAWcATwiu9mrI0vl0LC8cmEzwyV5L8c+\n03SI/1C7vU7owCoCxY56AIVMCM9gWviqMvj2slQCZXdREBd+vLH5qhoVXHYCpi8d\nOaHd2JdSbmoMWdTGTCt2AJNfNPguOgnPCsWvHmUPQFjy+LkYo1bN0YZU42px4jB/\nban68v499QKBgDv39Ngv4ILJKm7qrGQEP7vwmicoZ24JXMbSc0DAbKARL6U0I4wJ\nd9aUsJB/ZIIpkDbWdJfvZAeHYxCIoRhD93Gz5sbHf+lwQGX2eSzw/+p49/qD2mSh\nhPnKsawlViSvvwxbbY542RxEER4IZ24aCuYDM2kTCbr86kIUtlF5sxSNAoGADwWh\nI+WzVZoYVMszOKAtXKvLGNKuXkl0itlfJvIcLK+srM3ySGHcJnsDUKMVGi+VNmyo\nfvh70/FA42QbVeTn70DgydERmwA7Vhp2Gqdf917FzEKNsETIrNM+ATETS9JYBi70\nd/nz0zsXTkOY1oaqSlWrWXGc0OGeTr7wTtCsfkECgYEAh2W+sLTmz+FncYBvk420\nq/iW/Dz1DJP7ElX0p7f9dQdTY4ynN9LKX6et3CBzNkuvt+yDbVMsCluidF0SAQEQ\neKsYRqrtJ8IYosATo+zDZNsg57TLuYhkNtCIRGnVJZf3ajB3xt5/d/1MzOVvaKCY\ne5cG2hwOAR66FBwgXPsPp90=\n-----END PRIVATE KEY-----\n"
GOOGLE_PRIVATE_KEY_ID=ab9ab51bc90c2c1212e2ae1174b929005cf7dc9d
GOOGLE_CLIENT_ID=100249810148217928356
GOOGLE_PROJECT_ID=mystical-moon-469502-m5
```

## ⚠️ Masalah di .env Anda:

1. **Duplikasi `GCS_BUCKET_NAME`** - Hapus yang pertama, keep yang kedua
2. **`GOOGLE_APPLICATION_CREDENTIALS`** - Tidak diperlukan karena kita pakai environment variables langsung (bisa dihapus)
3. **`GOOGLE_PRIVATE_KEY`** - Format sudah benar, tapi pastikan pakai **double quotes** (`"`) untuk wrap value

## ✅ Format yang Benar:

**PENTING:** `GOOGLE_PRIVATE_KEY` harus:
- Pakai **double quotes** (`"`) untuk wrap value
- Pakai `\n` literal (backslash + n), bukan newline asli
- Tidak ada newline di akhir setelah `-----END PRIVATE KEY-----\n`

## 🔧 Cara Fix:

1. Hapus duplikasi `GCS_BUCKET_NAME` (keep yang kedua)
2. Hapus `GOOGLE_APPLICATION_CREDENTIALS` (tidak diperlukan)
3. Pastikan `GOOGLE_PRIVATE_KEY` pakai double quotes dan format `\n` literal

## 📝 Contoh Command untuk Fix:

```bash
cd /opt/agrione/agrione-v1

# Backup dulu
cp .env .env.backup

# Edit .env
nano .env

# Hapus:
# - GCS_BUCKET_NAME yang pertama
# - GOOGLE_APPLICATION_CREDENTIALS line

# Pastikan GOOGLE_PRIVATE_KEY pakai double quotes:
# GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## 🔄 Setelah Fix:

```bash
# Restart frontend untuk load environment variables baru
docker compose restart frontend

# Check logs untuk pastikan tidak ada error
docker compose logs frontend | grep -i gcs
```

---

**Catatan:** Format `\n` literal (backslash + n) akan di-convert ke newline asli oleh code di `frontend/app/upload/route.ts`.

