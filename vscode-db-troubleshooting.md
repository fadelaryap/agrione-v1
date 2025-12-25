# VS Code Database Extension Troubleshooting

## Masalah: Password authentication failed di VS Code tapi bisa di CMD

### Solusi 1: SQLTools Extension (Recommended)

1. **Install Extensions:**
   - SQLTools
   - SQLTools PostgreSQL/Cockroach Driver

2. **Add Connection:**
   - Klik icon SQLTools di sidebar
   - Klik "Add New Connection"
   - Pilih "PostgreSQL"

3. **Connection Settings (PENTING!):**
   ```
   Name: Agrione DB
   Server Address: localhost
   Port: 5432
   Database: agrione_db
   Username: agrione
   Password: agrione123
   SSL: DISABLE ⚠️ (SANGAT PENTING!)
   Connection Timeout: 10
   ```

4. **Jika masih error, coba Connection String:**
   - Centang "Use Connection String"
   - Masukkan: `postgresql://agrione:agrione123@localhost:5432/agrione_db?sslmode=disable`

### Solusi 2: PostgreSQL Extension (by Chris Kolkman)

1. **Install Extension:** PostgreSQL

2. **Add Connection:**
   - Klik icon PostgreSQL di sidebar
   - Klik "+" untuk add connection

3. **Connection Settings:**
   ```
   Host: localhost
   Port: 5432
   User: agrione
   Password: agrione123
   Database: agrione_db
   SSL Mode: disable (atau prefer)
   ```

### Solusi 3: Cek Settings Extension

Beberapa extension memiliki settings tambahan:

1. **Buka VS Code Settings** (Ctrl+,)
2. **Cari:** `postgresql` atau `sqltools`
3. **Pastikan:**
   - SSL mode: disable
   - Connection timeout: cukup besar (10-30 detik)
   - Auto-connect: bisa di-disable dulu

### Solusi 4: Manual Connection String

Jika extension support connection string, gunakan:

```
postgresql://agrione:agrione123@localhost:5432/agrione_db?sslmode=disable
```

### Solusi 5: Cek Extension Version

1. **Update Extension** ke versi terbaru
2. **Restart VS Code** setelah install/update
3. **Reload Window:** Ctrl+Shift+P → "Reload Window"

### Solusi 6: Alternative - Gunakan DBeaver

Jika VS Code extension masih bermasalah:

1. Download DBeaver: https://dbeaver.io/
2. Add PostgreSQL connection
3. Settings:
   - Host: localhost
   - Port: 5432
   - Database: agrione_db
   - Username: agrione
   - Password: agrione123
   - SSL: Disable

### Common Issues:

1. **SSL Required Error:**
   - **Fix:** Set SSL Mode ke "disable" atau "prefer"

2. **Connection Timeout:**
   - **Fix:** Increase timeout ke 30 detik
   - Pastikan container postgres running

3. **Authentication Failed:**
   - **Fix:** Pastikan password benar `agrione123` (huruf kecil, tanpa spasi)
   - Coba reset password: `docker exec agrione_postgres psql -U agrione -d agrione_db -c "ALTER USER agrione WITH PASSWORD 'agrione123';"`

4. **Extension Not Connecting:**
   - **Fix:** Coba extension lain (SQLTools biasanya lebih reliable)
   - Atau gunakan DBeaver/pgAdmin

### Test Connection dari CMD (Sudah Bisa):

```bash
docker exec -it agrione_postgres psql -U agrione -d agrione_db
```

Jika ini berhasil, berarti database dan password benar. Masalahnya di extension settings.

