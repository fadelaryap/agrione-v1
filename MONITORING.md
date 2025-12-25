# 📊 Monitoring & Logs Guide

Panduan untuk monitoring aplikasi dan GitHub Actions di VPS.

---

## 🔍 GitHub Actions Monitoring

### 1. Check Logs di GitHub

**Cara paling mudah:**
1. Buka repository di GitHub: `https://github.com/fadelaryap/agrione-v1`
2. Klik tab **Actions**
3. Pilih workflow run terbaru
4. Klik pada job untuk melihat logs detail

### 2. Check Logs di VPS

GitHub Actions menjalankan commands via SSH, jadi logs tersimpan di VPS.

#### A. Check Deployment Logs

```bash
# Check apakah deployment berhasil
cd /opt/agrione-v1

# Check git log untuk melihat kapan terakhir update
git log --oneline -10

# Check apakah ada file .env yang terupdate
cat .env | grep -E "CORS_ORIGIN|NEXT_PUBLIC_API_URL"
```

#### B. Check Docker Logs

```bash
# Check semua container logs
docker compose logs

# Check logs specific container
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# Follow logs real-time
docker compose logs -f

# Check logs dengan timestamp
docker compose logs -t

# Check logs terakhir 100 baris
docker compose logs --tail=100
```

#### C. Check Container Status

```bash
# Check status semua containers
docker compose ps

# Check resource usage
docker stats

# Check container health
docker inspect agrione_backend | grep -A 10 Health
```

---

## 🐛 Troubleshooting

### Error: "database agrione does not exist"

**Penyebab:** Healthcheck atau connection test menggunakan database name yang salah.

**Fix:**
```bash
# Pastikan .env file benar
cat .env | grep POSTGRES_DB
# Harus: POSTGRES_DB=agrione_db

# Restart containers
docker compose down
docker compose up -d

# Check logs
docker compose logs postgres | grep -i "database"
```

### Error: CORS atau CSRF

```bash
# Check environment variables
docker compose exec backend env | grep CORS
docker compose exec frontend env | grep NEXT_PUBLIC

# Check .env file
cat .env

# Update jika perlu
nano .env
# Set:
# CORS_ORIGIN=http://103.31.205.102:3000
# NEXT_PUBLIC_API_URL=http://103.31.205.102:8000

# Restart
docker compose restart backend frontend
```

### GitHub Actions Gagal

**Check di VPS:**

```bash
# Check apakah SSH key benar
ls -la ~/.ssh/github_actions*

# Test SSH connection dari GitHub Actions
# (ini akan dijalankan otomatis saat deployment)

# Check apakah project directory ada
ls -la /opt/agrione-v1

# Check apakah docker compose bisa jalan
cd /opt/agrione-v1
docker compose ps
```

**Check di GitHub:**
1. Go to: `https://github.com/fadelaryap/agrione-v1/settings/secrets/actions`
2. Pastikan secrets sudah di-set:
   - `VPS_HOST`: `103.31.205.102`
   - `VPS_USER`: `fadelaryap` (atau username VPS Anda)
   - `VPS_SSH_PRIVATE_KEY`: Private key dari `~/.ssh/github_actions`

---

## 📝 Log Files Locations

### Application Logs

```bash
# Docker logs (default location)
docker compose logs

# Export logs ke file
docker compose logs > deployment.log 2>&1

# Logs dengan timestamp
docker compose logs -t > deployment-$(date +%Y%m%d-%H%M%S).log
```

### System Logs

```bash
# Docker daemon logs
sudo journalctl -u docker.service

# System logs
sudo journalctl -xe

# Check disk space (penting untuk monitoring)
df -h
```

---

## 🔔 Monitoring Commands

### Quick Health Check

```bash
#!/bin/bash
# Save as: check-health.sh

echo "=== Container Status ==="
docker compose ps

echo ""
echo "=== Backend Health ==="
curl -s http://localhost:8000/api/health || echo "Backend tidak bisa diakses"

echo ""
echo "=== Frontend Status ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "Frontend tidak bisa diakses"

echo ""
echo "=== Database Connection ==="
docker compose exec -T postgres psql -U agrione -d agrione_db -c "SELECT 1;" || echo "Database tidak bisa diakses"

echo ""
echo "=== Disk Usage ==="
df -h | grep -E "Filesystem|/dev/"

echo ""
echo "=== Memory Usage ==="
free -h
```

**Jalankan:**
```bash
chmod +x check-health.sh
./check-health.sh
```

---

## 📧 Setup Alerts (Optional)

### Email Alert saat Deployment Gagal

Edit `.github/workflows/deploy.yml` dan tambahkan:

```yaml
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v6
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: '🚨 Deployment Failed',
        body: 'Deployment failed for commit: ${{ github.sha }}'
      })
```

---

## 🔐 Security Monitoring

```bash
# Check failed login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# Check active connections
sudo netstat -tulpn | grep -E ':(3000|8000|5432)'

# Check docker security
docker compose config
```

---

## 📊 Performance Monitoring

```bash
# Check container resource usage
docker stats --no-stream

# Check database size
docker compose exec postgres psql -U agrione -d agrione_db -c "SELECT pg_size_pretty(pg_database_size('agrione_db'));"

# Check table sizes
docker compose exec postgres psql -U agrione -d agrione_db -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## 🚀 Quick Commands Reference

```bash
# Restart semua services
docker compose restart

# Restart specific service
docker compose restart backend

# View logs real-time
docker compose logs -f backend

# Check environment variables
docker compose exec backend env

# Execute command di container
docker compose exec backend sh
docker compose exec postgres psql -U agrione -d agrione_db

# Clean up (HATI-HATI: ini akan hapus volumes!)
docker compose down -v

# Rebuild dan restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 📱 IP VPS Anda

**IP VPS:** `103.31.205.102`

**URLs:**
- Frontend: `http://103.31.205.102:3000`
- Backend API: `http://103.31.205.102:8000`
- Health Check: `http://103.31.205.102:8000/api/health`

---

## ✅ Daily Checklist

```bash
# 1. Check container status
docker compose ps

# 2. Check logs untuk errors
docker compose logs --tail=50 | grep -i error

# 3. Check disk space
df -h

# 4. Check memory
free -h

# 5. Test API
curl http://103.31.205.102:8000/api/health
```

---

## 🆘 Emergency Commands

```bash
# Stop semua containers
docker compose down

# Start ulang dari awal
docker compose down
docker compose up -d

# Check apa yang salah
docker compose logs --tail=100

# Rollback ke commit sebelumnya (jika perlu)
cd /opt/agrione-v1
git log --oneline -5
git checkout <commit-hash>
docker compose down
docker compose up -d --build
```

