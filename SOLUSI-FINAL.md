# Solusi Final: PostgreSQL Docker External Connection

## Masalah:
PostgreSQL di Docker tidak bisa diakses dari host Windows (DBeaver/VS Code) dengan error "password authentication failed"

## Root Cause:
Koneksi dari host Windows ke Docker container memerlukan:
1. Port mapping yang benar ✅ (sudah ada: 5432:5432)
2. PostgreSQL listen di semua interface ✅ (sudah: listen_addresses = '*')
3. pg_hba.conf yang benar untuk external connections ✅ (sudah di-set)
4. **Password yang benar-benar bisa digunakan untuk scram-sha-256** ⚠️

## Solusi:

### 1. Pastikan Container Running
```powershell
docker compose ps
```

### 2. Reset Password dengan Benar
```powershell
docker exec agrione_postgres psql -U agrione -d agrione_db -c "ALTER USER agrione WITH PASSWORD 'agrione123';"
docker compose restart postgres
```

### 3. Tunggu 10 Detik Setelah Restart
PostgreSQL perlu waktu untuk fully start.

### 4. Test dari Host Windows

**Jika punya psql di Windows:**
```powershell
psql -h 127.0.0.1 -p 5432 -U agrione -d agrione_db
# Password: agrione123
```

**Jika tidak punya psql, install dulu:**
- Download: https://www.postgresql.org/download/windows/
- Atau gunakan DBeaver/VS Code

### 5. Settings untuk DBeaver/VS Code

**Host:** 127.0.0.1 (bukan localhost!)
**Port:** 5432
**Database:** agrione_db
**Username:** agrione
**Password:** agrione123 (ketik manual!)
**SSL:** DISABLE

## Jika Masih Error:

### Option 1: Ubah Authentication Method (Temporary untuk Testing)

Edit pg_hba.conf untuk sementara gunakan "md5" atau "password" instead of "scram-sha-256":

```bash
docker exec agrione_postgres bash -c "sed -i 's/scram-sha-256/md5/g' /var/lib/postgresql/data/pg_hba.conf"
docker exec agrione_postgres psql -U agrione -d agrione_db -c "SELECT pg_reload_conf();"
```

### Option 2: Install psql di Windows untuk Test

1. Download PostgreSQL for Windows: https://www.postgresql.org/download/windows/
2. Install (include psql command line tools)
3. Test:
   ```powershell
   psql -h 127.0.0.1 -p 5432 -U agrione -d agrione_db
   ```

### Option 3: Gunakan Docker Network IP

Coba connect ke IP Docker network:
```powershell
docker network inspect agrione_agrione_network | findstr IPv4Address
```

## Verification Commands:

```powershell
# 1. Check port accessible
Test-NetConnection -ComputerName 127.0.0.1 -Port 5432

# 2. Check Docker port mapping
docker port agrione_postgres

# 3. Check PostgreSQL listen addresses
docker exec agrione_postgres psql -U agrione -d agrione_db -c "SHOW listen_addresses;"

# 4. Check pg_hba.conf
docker exec agrione_postgres cat /var/lib/postgresql/data/pg_hba.conf
```

