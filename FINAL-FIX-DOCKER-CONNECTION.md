# Final Fix: PostgreSQL Docker External Connection

## ✅ Yang Sudah Diperbaiki:

1. ✅ PostgreSQL listen di semua interface (`listen_addresses = '*'`)
2. ✅ Port mapping benar (`5432:5432`)
3. ✅ `pg_hba.conf` sudah di-set untuk external connections dengan `scram-sha-256`
4. ✅ Password sudah di-reset ke `agrione123`
5. ✅ Container sudah di-restart

## 🧪 Test External Connection:

Jalankan ini di PowerShell untuk test koneksi dari host Windows:

```powershell
.\test-external-connection.ps1
```

Atau manual:
```powershell
docker exec -e PGPASSWORD=agrione123 agrione_postgres psql -h 127.0.0.1 -p 5432 -U agrione -d agrione_db -c "SELECT 'Connection OK!' as status;"
```

**Jika test ini berhasil, berarti PostgreSQL sudah benar!**

## 🔧 Settings untuk DBeaver:

1. **New Database Connection** → PostgreSQL
2. **Main Tab:**
   ```
   Host: 127.0.0.1
   Port: 5432
   Database: agrione_db
   Username: agrione
   Password: agrione123
   ```
3. **SSL Tab:**
   - ✅ **Uncheck "Use SSL"** (sangat penting!)
   - Atau set SSL Mode ke "disable"

4. **Test Connection** → Seharusnya berhasil!

## 🔧 Settings untuk SQLTools (VS Code):

1. **Add New Connection** → PostgreSQL
2. **Settings:**
   ```
   Name: Agrione DB
   Server Address: 127.0.0.1
   Port: 5432
   Database: agrione_db
   Username: agrione
   Password: agrione123 (ketik manual!)
   SSL: DISABLE
   Connection Timeout: 30
   ```

3. **Atau gunakan Connection String:**
   ```
   postgresql://agrione:agrione123@127.0.0.1:5432/agrione_db?sslmode=disable
   ```

## ⚠️ PENTING:

1. **Gunakan IP `127.0.0.1` bukan `localhost`** - kadang `localhost` di Windows resolve ke IPv6 yang bermasalah
2. **SSL harus DISABLE** - PostgreSQL di Docker tidak menggunakan SSL untuk development
3. **Password: `agrione123`** - huruf kecil semua, tanpa spasi
4. **Tunggu 5-10 detik** setelah restart container sebelum connect

## 🐛 Jika Masih Error:

### Error: "password authentication failed"
**Solusi:**
1. Pastikan password benar: `agrione123` (ketik manual, jangan copy-paste)
2. Pastikan username: `agrione` (huruf kecil)
3. Coba reset password lagi:
   ```powershell
   docker exec agrione_postgres psql -U agrione -d agrione_db -c "ALTER USER agrione WITH PASSWORD 'agrione123';"
   docker compose restart postgres
   ```

### Error: "Connection refused" atau "Could not connect"
**Solusi:**
1. Pastikan container running: `docker compose ps`
2. Pastikan port 5432 tidak digunakan aplikasi lain
3. Coba restart: `docker compose restart postgres`
4. Tunggu beberapa detik setelah restart

### Error: "SSL required"
**Solusi:**
- Pastikan SSL di-set ke **DISABLE** di client settings
- Jangan centang "Use SSL" atau "Require SSL"

## ✅ Verification:

Jika semua sudah benar, test ini harus berhasil:
```powershell
docker exec -e PGPASSWORD=agrione123 agrione_postgres psql -h 127.0.0.1 -p 5432 -U agrione -d agrione_db -c "SELECT current_user, current_database();"
```

Output harus:
```
 current_user | current_database 
--------------+------------------
 agrione      | agrione_db
```

Jika ini berhasil tapi DBeaver/VS Code masih error, masalahnya di client application settings, bukan di PostgreSQL!

