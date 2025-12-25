# Database Connection Information

## Untuk VS Code / Database Tools

Gunakan informasi berikut untuk connect ke PostgreSQL database:

### Connection Details:
- **Host:** `localhost` (atau `127.0.0.1`)
- **Port:** `5432`
- **Username:** `agrione`
- **Password:** `agrione123` ⚠️ **Pastikan password benar-benar `agrione123` (tanpa spasi)**
- **Database:** `agrione_db` (atau `agrione` untuk default connection)

### Connection String:
```
postgresql://agrione:agrione123@localhost:5432/agrione_db
```

### Untuk VS Code Extensions:

#### 1. PostgreSQL Extension (by Chris Kolkman)
- Install extension: "PostgreSQL" di VS Code
- Klik icon PostgreSQL di sidebar
- Klik "+" untuk add connection
- Isi:
  - **Host:** localhost
  - **Port:** 5432
  - **User:** agrione
  - **Password:** agrione123
  - **Database:** agrione_db
  - **SSL Mode:** disable (atau "prefer" jika ada opsi)
  - **Connection Timeout:** 10 (atau biarkan default)

**⚠️ PENTING:** Jika masih error, coba:
- Pastikan **SSL Mode** di-set ke **disable** atau **prefer**
- Beberapa extension memerlukan **SSL Mode: disable** untuk localhost
- Coba hapus connection dan buat ulang

#### 2. SQLTools Extension (Recommended)
- Install extension: "SQLTools" dan "SQLTools PostgreSQL/Cockroach Driver"
- Klik icon SQLTools di sidebar
- Add new connection
- Pilih PostgreSQL
- Isi:
  - **Name:** Agrione DB (atau nama lain)
  - **Server:** localhost
  - **Port:** 5432
  - **Database:** agrione_db
  - **Username:** agrione
  - **Password:** agrione123
  - **SSL:** **DISABLE** (sangat penting untuk localhost!)
  - **Connection Timeout:** 10

**⚠️ PENTING untuk SQLTools:**
- Pastikan **SSL** di-set ke **DISABLE**
- Jangan centang "Use Connection String" kecuali mau pakai connection string
- Jika pakai Connection String: `postgresql://agrione:agrione123@localhost:5432/agrione_db?sslmode=disable`

### Untuk DBeaver / pgAdmin / Other Tools:
Gunakan connection details yang sama di atas.

### Catatan:
- Pastikan Docker container `agrione_postgres` sedang running
- Port 5432 harus exposed (sudah di-set di docker-compose.yml)
- Database name adalah `agrione_db` (bukan `agrione`)

