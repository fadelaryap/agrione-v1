# 🔓 Setup GCS Bucket untuk Public Access

## 📋 Masalah

Bucket `agrione-media` menggunakan:
- **Uniform bucket-level access** (tidak bisa set ACL per-object)
- **Not public** (file tidak bisa diakses public)

## ✅ Solusi: Set Bucket-Level Permission

Karena menggunakan uniform bucket-level access, kita perlu set permission di **bucket level**, bukan per-object.

### Opsi 1: Via GCP Console (Recommended)

1. Buka GCP Console → Cloud Storage → Buckets
2. Klik bucket `agrione-media`
3. Klik tab **Permissions**
4. Klik tombol **"+ Grant access"**
5. Di field **"New principals"**, masukkan: `allUsers`
6. Di dropdown **"Select a role"**, pilih: **"Storage Object Viewer"**
7. Klik **"Save"**
8. Konfirmasi dialog yang muncul (akan membuat bucket public)

**Hasil:**
- Semua file di bucket akan otomatis public
- Tidak perlu set `public: true` di code (sudah dihapus)
- File bisa diakses via URL: `https://storage.googleapis.com/agrione-media/...`

### Opsi 2: Via gcloud CLI

```bash
# Set bucket permission untuk allUsers dengan role Storage Object Viewer
gsutil iam ch allUsers:objectViewer gs://agrione-media
```

### Opsi 3: Switch ke Fine-Grained Access (Jika Perlu)

Jika Anda ingin control per-object ACL (tidak recommended untuk public files):

1. Di tab **Permissions**, klik **"Switch to fine-grained"**
2. Konfirmasi switch
3. Setelah switch, bisa set ACL per-object
4. Tapi untuk public access, tetap lebih mudah pakai bucket-level permission

**⚠️ Catatan:** Setelah switch ke fine-grained, tidak bisa balik ke uniform dalam 90 hari.

## 🔍 Verifikasi

Setelah set permission, test:

1. Upload file via aplikasi
2. Check URL file di response
3. Buka URL di browser (harus bisa diakses tanpa auth)

## 📝 Code Changes

Code sudah di-update untuk:
- ✅ Hapus `public: true` dari save options (tidak diperlukan dengan uniform bucket-level access)
- ✅ File akan otomatis public jika bucket permission sudah di-set

## 🎯 Recommended Setup

**Untuk production dengan public files:**
1. ✅ Keep **Uniform bucket-level access** (lebih simple)
2. ✅ Set bucket permission: `allUsers:objectViewer`
3. ✅ Code tidak perlu set ACL per-object

**Keuntungan:**
- Simple dan mudah di-manage
- Semua file otomatis public
- Tidak perlu set ACL per-object di code

---

**Selesai!** Setelah set bucket permission, upload file akan otomatis public. 🎉

