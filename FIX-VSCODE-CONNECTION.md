# Fix VS Code Database Connection Error

## Masalah: Password authentication failed di VS Code tapi bisa di CMD

### Solusi 1: Clear Extension Cache & Reconnect

1. **Hapus Connection yang Ada:**
   - Di SQLTools, klik kanan connection → Delete
   - Atau hapus dari settings

2. **Clear VS Code Cache:**
   - Tutup VS Code
   - Hapus folder cache extension (opsional):
     - Windows: `%APPDATA%\Code\User\globalStorage\mtxr.sqltools-driver-pg`
     - Atau restart VS Code saja

3. **Buat Connection Baru:**
   - Klik "Add New Connection"
   - Pilih PostgreSQL
   - **PENTING:** Isi dengan teliti:
     ```
     Name: Agrione DB
     Server Address: 127.0.0.1 (bukan localhost, coba IP langsung)
     Port: 5432
     Database: agrione_db
     Username: agrione
     Password: agrione123 (ketik manual, jangan copy-paste)
     SSL: DISABLE
     ```

### Solusi 2: Gunakan Connection String

1. Di SQLTools, pilih "Use Connection String"
2. Masukkan:
   ```
   postgresql://agrione:agrione123@127.0.0.1:5432/agrione_db?sslmode=disable
   ```

### Solusi 3: Test dari Command Line Dulu

Pastikan bisa connect dari command line:

```bash
# Test 1: Dari dalam container
docker exec -it agrione_postgres psql -U agrione -d agrione_db

# Test 2: Dari host (jika psql terinstall)
psql -h 127.0.0.1 -p 5432 -U agrione -d agrione_db
# Password: agrione123
```

### Solusi 4: Reset Password Lagi

Jika masih error, reset password:

```bash
docker exec agrione_postgres psql -U agrione -d agrione_db -c "ALTER USER agrione WITH PASSWORD 'agrione123';"
```

### Solusi 5: Cek Connection Details

Pastikan:
- ✅ **Server:** `127.0.0.1` (coba IP langsung, bukan localhost)
- ✅ **Port:** `5432` (bukan 5433 atau lainnya)
- ✅ **Database:** `agrione_db` (bukan `agrione` atau `postgres`)
- ✅ **Username:** `agrione` (huruf kecil semua)
- ✅ **Password:** `agrione123` (huruf kecil, tanpa spasi, ketik manual)
- ✅ **SSL:** DISABLE (sangat penting!)

### Solusi 6: Restart Container

```bash
docker compose restart postgres
```

Tunggu beberapa detik, lalu coba connect lagi.

### Solusi 7: Alternative - Gunakan DBeaver

Jika VS Code extension masih bermasalah:

1. Download DBeaver: https://dbeaver.io/
2. Create New Connection → PostgreSQL
3. Settings:
   - Host: 127.0.0.1
   - Port: 5432
   - Database: agrione_db
   - Username: agrione
   - Password: agrione123
   - SSL: Disable

### Troubleshooting Checklist

- [ ] Password di-reset: `ALTER USER agrione WITH PASSWORD 'agrione123';`
- [ ] Container postgres running: `docker compose ps`
- [ ] Port 5432 tidak digunakan aplikasi lain
- [ ] Connection dihapus dan dibuat ulang
- [ ] VS Code di-restart
- [ ] Menggunakan IP `127.0.0.1` bukan `localhost`
- [ ] SSL di-set ke DISABLE
- [ ] Password diketik manual (bukan copy-paste)

### Test Connection dari PowerShell/CMD

```powershell
# Jika psql terinstall di Windows
psql -h 127.0.0.1 -p 5432 -U agrione -d agrione_db
# Masukkan password: agrione123
```

Jika ini berhasil, berarti database dan password benar. Masalahnya di extension settings atau cache.

