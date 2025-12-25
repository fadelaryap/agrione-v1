# Fix Password Authentication

## Masalah:
Password authentication failed meskipun settings sudah benar di DBeaver.

## Root Cause:
PostgreSQL 18 menggunakan `scram-sha-256` untuk password encryption, dan `pg_hba.conf` perlu di-configure dengan benar untuk external connections.

## Solusi yang Sudah Diterapkan:

1. ✅ Password sudah di-reset: `agrione123`
2. ✅ `pg_hba.conf` sudah di-update untuk allow connections dari semua IP dengan `scram-sha-256`
3. ✅ Container sudah di-restart

## Test Sekarang:

1. **Tunggu 10 detik** setelah restart
2. **Hapus connection lama** di DBeaver
3. **Buat connection baru** dengan settings:
   ```
   Host: 127.0.0.1
   Port: 5432
   Database: agrione_db
   Username: agrione
   Password: agrione123 (ketik manual!)
   SSL: Disable
   ```

## Jika Masih Error:

Coba gunakan **Connection String** di DBeaver:
```
postgresql://agrione:agrione123@127.0.0.1:5432/agrione_db?sslmode=disable
```

Atau coba **Advanced Settings**:
- Authentication: Auto
- Show all databases: Uncheck
- Use single connection: Check

## Alternative: Test dengan psql (jika terinstall)

```powershell
# Install PostgreSQL client tools dulu
# Lalu test:
psql -h 127.0.0.1 -p 5432 -U agrione -d agrione_db
# Password: agrione123
```

Jika psql bisa connect, berarti PostgreSQL benar dan masalahnya di DBeaver settings.

