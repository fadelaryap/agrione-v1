# Upgrade PostgreSQL

## Versi Saat Ini:
- **PostgreSQL 15** (postgres:15-alpine)

## Versi Tersedia:
- PostgreSQL 18 (latest, dirilis November 2025)
- PostgreSQL 17
- PostgreSQL 16
- PostgreSQL 15 (current)

## Upgrade Options:

### Option 1: PostgreSQL 18 (Latest)
```yaml
image: postgres:18-alpine
```

### Option 2: PostgreSQL 17 (Stable)
```yaml
image: postgres:17-alpine
```

### Option 3: PostgreSQL 16 (LTS)
```yaml
image: postgres:16-alpine
```

## Catatan:
- PostgreSQL 18 adalah versi terbaru dengan fitur baru
- PostgreSQL 15 masih didukung dan stabil
- Untuk production, pertimbangkan versi LTS (Long Term Support)

## Untuk Upgrade:

1. **Backup database dulu** (jika ada data penting):
   ```powershell
   docker exec agrione_postgres pg_dump -U agrione agrione_db > backup.sql
   ```

2. **Update docker-compose.yml** (sudah di-update ke 18)

3. **Rebuild dan restart:**
   ```powershell
   docker compose down
   docker compose up -d --build
   ```

4. **Jika ada masalah, bisa rollback ke versi 15**

