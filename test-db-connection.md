# Test Database Connection

Jika mengalami error "password authentication failed", coba langkah berikut:

## 1. Verifikasi Password

Pastikan password yang digunakan adalah: `agrione123` (tanpa spasi, huruf kecil semua)

## 2. Test Connection dari Command Line

```bash
# Test connection dari host
docker exec -it agrione_postgres psql -U agrione -d agrione_db

# Atau dari luar container (jika psql terinstall)
psql -h localhost -p 5432 -U agrione -d agrione_db
# Password: agrione123
```

## 3. Reset Password (jika perlu)

```bash
docker exec agrione_postgres psql -U agrione -d agrione_db -c "ALTER USER agrione WITH PASSWORD 'agrione123';"
```

## 4. Cek Environment Variables

Pastikan di docker-compose.yml:
- `POSTGRES_USER=agrione`
- `POSTGRES_PASSWORD=agrione123`
- `POSTGRES_DB=agrione_db`

## 5. Common Issues

### Issue: Password authentication failed
**Solution:** 
- Pastikan tidak ada typo di password
- Pastikan menggunakan password `agrione123` (huruf kecil, tanpa spasi)
- Coba reset password dengan command di atas

### Issue: Connection refused
**Solution:**
- Pastikan container postgres running: `docker compose ps`
- Pastikan port 5432 tidak digunakan aplikasi lain
- Restart container: `docker compose restart postgres`

### Issue: Database does not exist
**Solution:**
- Gunakan database `agrione_db` (bukan `agrione`)
- Atau buat database `agrione` jika ingin default connection

## 6. Connection String untuk Testing

```
postgresql://agrione:agrione123@localhost:5432/agrione_db
```

