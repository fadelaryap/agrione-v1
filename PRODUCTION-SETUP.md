# 🚀 Production Setup dengan IP Address

Panduan setup untuk production menggunakan IP address (tanpa domain).

**IP VPS Anda:** `103.31.205.102`

## 📋 Prerequisites

- VPS dengan IP public
- Docker & Docker Compose terinstall
- Port 3000 dan 8000 terbuka di firewall

---

## 🔧 Setup Environment Variables

### 1. Buat File `.env` di Root Project

```bash
cd /opt/agrione-v1
nano .env
```

### 2. Isi dengan Konfigurasi Berikut

```env
# Database
POSTGRES_USER=agrione
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=agrione_db

# Security (GENERATE STRONG SECRETS!)
# Generate dengan: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CSRF_SECRET=your-csrf-secret-key-change-in-production

# CORS & API Configuration
# IP VPS: 103.31.205.102
CORS_ORIGIN=http://103.31.205.102:3000

# Frontend API URL
NEXT_PUBLIC_API_URL=http://103.31.205.102:8000
```

### 3. Contoh untuk VPS dengan IP `103.31.205.102`

```env
POSTGRES_USER=agrione
POSTGRES_PASSWORD=MySecurePassword123!
POSTGRES_DB=agrione_db
JWT_SECRET=abc123xyz789secretkey
CSRF_SECRET=csrf123secret456key
CORS_ORIGIN=http://103.31.205.102:3000
NEXT_PUBLIC_API_URL=http://103.31.205.102:8000
```

---

## 🔥 Setup Firewall

```bash
# Allow ports
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

---

## 🚀 Deploy

```bash
cd /opt/agrione-v1

# Pastikan .env sudah di-set dengan benar
cat .env

# Build dan start
docker compose down
docker compose build --no-cache
docker compose up -d

# Check status
docker compose ps
docker compose logs
```

---

## ✅ Test

1. **Frontend**: Buka `http://103.31.205.102:3000`
2. **Backend API**: Test `http://103.31.205.102:8000/api/health`

---

## 🔍 Troubleshooting

### CORS Error

```bash
# Pastikan CORS_ORIGIN di .env sesuai dengan IP yang digunakan
# Harus: http://103.31.205.102:3000 (bukan localhost)
cat .env | grep CORS_ORIGIN
```

### CSRF Error

```bash
# Pastikan CSRF_ORIGIN sama dengan CORS_ORIGIN
# Check backend logs
docker compose logs backend | grep CSRF
```

### Port Already in Use

```bash
# Check port usage
sudo netstat -tulpn | grep -E ':(3000|8000)'

# Stop conflicting services
sudo systemctl stop nginx  # jika ada
```

---

## 🔐 Security Notes

1. **Gunakan Strong Passwords**: Generate password yang kuat untuk database
2. **Generate Strong Secrets**: 
   ```bash
   openssl rand -base64 32  # untuk JWT_SECRET
   openssl rand -base64 32  # untuk CSRF_SECRET
   ```
3. **Firewall**: Hanya buka port yang diperlukan
4. **HTTPS**: Untuk production, setup domain dengan SSL (Let's Encrypt)

---

## 📝 Auto-Update IP di Deployment

Script `deploy.sh` dan GitHub Actions workflow sudah otomatis update `.env` dengan VPS IP saat deployment.

Jika ingin update manual:

```bash
VPS_IP=$(hostname -I | awk '{print $1}')
sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://$VPS_IP:3000|" .env
sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$VPS_IP:8000|" .env
```

