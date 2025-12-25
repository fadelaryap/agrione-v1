# ☁️ Setup Nginx dengan Cloudflare Domain

Panduan setup `https://agrione.agrihub.id` dengan Cloudflare dan Nginx reverse proxy.

**Note:** Dengan Cloudflare **Flexible mode**, tidak perlu setup SSL certificate di server. Cloudflare menangani HTTPS ke user, server hanya perlu HTTP (port 80).

---

## 📋 Prerequisites

- ✅ Domain sudah di Cloudflare: `agrihub.id`
- ✅ Subdomain: `agrione.agrihub.id`
- ✅ VPS IP: `103.31.205.102`
- ✅ Docker containers sudah running di port 3000 (frontend) dan 8000 (backend)

---

## 🔧 Step 1: Setup DNS di Cloudflare

### 1.1 Tambahkan A Record

1. Login ke **Cloudflare Dashboard**
2. Pilih domain **agrihub.id**
3. Klik **DNS** → **Records**
4. Klik **Add record**
5. Isi:
   - **Type**: `A`
   - **Name**: `agrione`
   - **IPv4 address**: `103.31.205.102`
   - **Proxy status**: ✅ **Proxied** (orange cloud) - Penting untuk SSL!
   - **TTL**: Auto
6. Klik **Save**

**Hasil:** `agrione.agrihub.id` → `103.31.205.102` (via Cloudflare proxy)

### 1.2 Setup SSL/TLS di Cloudflare

1. Klik **SSL/TLS** di sidebar
2. Pilih **Overview**
3. Set **SSL/TLS encryption mode** ke: **Flexible** ✅
   - **Flexible**: Cloudflare → User: HTTPS, Cloudflare → Origin: HTTP (tidak perlu SSL di server)
   - **Full**: Cloudflare → User: HTTPS, Cloudflare → Origin: HTTPS (perlu SSL di server)
4. **Save**

**Note:** Dengan mode **Flexible**, tidak perlu setup SSL certificate di server!

---

## 🚀 Step 2: Install Nginx di VPS

```bash
# Update system
sudo apt update

# Install Nginx
sudo apt install nginx -y

# Check status
sudo systemctl status nginx
```

---

## 🔒 Step 3: Skip SSL Certificate (Cloudflare Flexible Mode)

**Tidak perlu setup SSL certificate di server!**

Dengan Cloudflare **Flexible mode**:
- ✅ Cloudflare menangani HTTPS ke user (otomatis)
- ✅ Server hanya perlu HTTP (port 80)
- ✅ Tidak perlu generate certificate
- ✅ Setup lebih mudah

**Jika ingin Full mode (end-to-end encryption):**
- Gunakan **Full** atau **Full (strict)** di Cloudflare
- Baru perlu setup SSL certificate di server

---

## ⚙️ Step 4: Setup Nginx Configuration

```bash
# Buat config file
sudo nano /etc/nginx/sites-available/agrione
```

**Isi dengan:**

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name agrione.agrihub.id;

    # Redirect semua HTTP ke HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name agrione.agrihub.id;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/agrione.crt;  # Atau /etc/letsencrypt/live/agrione.agrihub.id/fullchain.pem
    ssl_certificate_key /etc/nginx/ssl/agrione.key;  # Atau /etc/letsencrypt/live/agrione.agrihub.id/privkey.pem
    
    # SSL settings (optimized for Cloudflare)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Real IP from Cloudflare
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 2400:cb00::/32;
    set_real_ip_from 2606:4700::/32;
    set_real_ip_from 2803:f800::/32;
    set_real_ip_from 2405:b500::/32;
    set_real_ip_from 2405:8100::/32;
    set_real_ip_from 2c0f:f248::/32;
    set_real_ip_from 2a06:98c0::/29;
    real_ip_header CF-Connecting-IP;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/api/health;
        access_log off;
    }
}
```

**Save:** `Ctrl+X`, `Y`, `Enter`

---

## 🔗 Step 5: Enable Site dan Test

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/agrione /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Jika sukses, restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 🔥 Step 6: Update Firewall

```bash
# Allow HTTP (Cloudflare handles HTTPS)
sudo ufw allow 80/tcp

# Optional: Close direct access to 3000 dan 8000 (via Nginx saja)
# sudo ufw deny 3000/tcp
# sudo ufw deny 8000/tcp

# Check status
sudo ufw status
```

**Note:** Dengan Cloudflare Flexible mode, hanya perlu port 80 (HTTP). Cloudflare menangani HTTPS.

---

## ⚙️ Step 7: Update Environment Variables

```bash
cd /opt/agrione/agrione-v1
nano .env
```

**Update dengan domain baru:**

```env
# Database (tidak perlu diubah)
POSTGRES_USER=agrione
POSTGRES_PASSWORD=agrione123
POSTGRES_DB=agrione_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CSRF_SECRET=your-csrf-secret-key-change-in-production

# Update ke domain baru
CORS_ORIGIN=https://agrione.agrihub.id
NEXT_PUBLIC_API_URL=https://agrione.agrihub.id/api
```

**Restart containers:**

```bash
# Rebuild frontend (NEXT_PUBLIC_API_URL is build-time variable!)
docker compose up -d --build frontend

# Restart backend
docker compose restart backend
```

**⚠️ PENTING:** `NEXT_PUBLIC_API_URL` adalah build-time variable di Next.js, jadi perlu **rebuild** frontend, bukan hanya restart!

---

## 🧪 Step 8: Testing

### 8.1 Test DNS Propagation

```bash
# Di local machine
nslookup agrione.agrihub.id
# Harus return: 103.31.205.102 (atau Cloudflare IP jika proxied)

# Atau
ping agrione.agrihub.id
```

### 8.2 Test HTTP Redirect

```bash
curl -I http://agrione.agrihub.id
# Harus return: 301 redirect ke HTTPS
```

### 8.3 Test HTTPS

```bash
curl -I https://agrione.agrihub.id
# Harus return: 200 OK
```

### 8.4 Test di Browser

1. Buka: `https://agrione.agrihub.id`
2. Seharusnya tidak ada warning SSL (jika pakai Let's Encrypt)
3. Test akses kamera - seharusnya sudah bisa!

---

## 🔍 Step 9: Verify Cloudflare Settings

### 9.1 SSL/TLS Mode

1. Cloudflare Dashboard → **SSL/TLS** → **Overview**
2. Pastikan: **Full** atau **Full (strict)**
   - **Full**: Accept self-signed dari origin
   - **Full (strict)**: Perlu valid certificate (Let's Encrypt)

### 9.2 Always Use HTTPS

1. Cloudflare Dashboard → **SSL/TLS** → **Edge Certificates**
2. Enable: **Always Use HTTPS** ✅

### 9.3 Automatic HTTPS Rewrites

1. Cloudflare Dashboard → **SSL/TLS** → **Edge Certificates**
2. Enable: **Automatic HTTPS Rewrites** ✅

---

## 🐛 Troubleshooting

### Error: 502 Bad Gateway

```bash
# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check apakah containers running
docker compose ps

# Check apakah port 3000 dan 8000 accessible
curl http://localhost:3000
curl http://localhost:8000/api/health
```

### Error: SSL Certificate Invalid

**Jika pakai Flexible mode:** Tidak perlu SSL certificate di server, skip error ini.

**Jika pakai Full mode:**
```bash
# Pastikan Cloudflare SSL mode = "Full"
# Jika pakai Let's Encrypt, check certificate
sudo certbot certificates

# Renew jika perlu
sudo certbot renew
```

### DNS Not Resolving

```bash
# Check DNS propagation
dig agrione.agrihub.id

# Pastikan A record sudah benar di Cloudflare
# Pastikan Proxy status = Proxied (orange cloud)
```

### CORS Error

```bash
# Pastikan CORS_ORIGIN sudah diupdate
cat .env | grep CORS_ORIGIN

# Restart backend
docker compose restart backend

# Check backend logs
docker compose logs backend | grep CORS
```

---

## ✅ Checklist

- [ ] DNS A record sudah dibuat di Cloudflare
- [ ] Proxy status = **Proxied** (orange cloud)
- [ ] SSL/TLS mode = **Full** atau **Full (strict)**
- [ ] Nginx sudah terinstall
- [ ] SSL certificate sudah dibuat
- [ ] Nginx config sudah dibuat dan enabled
- [ ] Firewall sudah allow port 80 dan 443
- [ ] Environment variables sudah diupdate
- [ ] Containers sudah di-restart
- [ ] Test akses `https://agrione.agrihub.id` berhasil
- [ ] Test kamera sudah bisa diakses

---

## 🎯 Quick Commands Reference

```bash
# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# Test Nginx config
sudo nginx -t

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check SSL certificate (Let's Encrypt)
sudo certbot certificates

# Renew certificate (Let's Encrypt)
sudo certbot renew

# Check containers
docker compose ps
docker compose logs backend
docker compose logs frontend
```

---

## 📝 Summary

**Setup selesai!** Sekarang:

- ✅ Domain: `https://agrione.agrihub.id`
- ✅ SSL: Via Cloudflare (Full SSL)
- ✅ Nginx: Reverse proxy ke Docker containers
- ✅ Kamera: Bisa diakses di semua browser (termasuk Safari)

**Akses aplikasi:**
- Frontend: `https://agrione.agrihub.id`
- Backend API: `https://agrione.agrihub.id/api`

