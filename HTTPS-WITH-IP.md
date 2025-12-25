# 🔒 Setup HTTPS dengan IP Address (Tanpa Domain)

Panduan untuk setup HTTPS menggunakan IP address saja, tanpa domain.

---

## ✅ Jawaban Singkat

**Ya, bisa!** Anda bisa setup HTTPS dengan IP address menggunakan **self-signed certificate**.

**Trade-off:**
- ✅ Kamera bisa diakses di semua browser (termasuk Safari)
- ⚠️ Browser akan menampilkan warning "Not Secure" (karena self-signed)
- ⚠️ User perlu klik "Advanced" → "Proceed" untuk pertama kali
- ✅ Setelah itu, akan bekerja normal

---

## 🚀 Setup HTTPS dengan IP Address

### Opsi 1: Nginx dengan Self-Signed Certificate (Recommended)

#### Step 1: Install Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

#### Step 2: Generate Self-Signed Certificate

```bash
# Buat directory untuk certificates
sudo mkdir -p /etc/nginx/ssl

# Generate certificate untuk IP address
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/agrione.key \
  -out /etc/nginx/ssl/agrione.crt \
  -subj "/C=ID/ST=Indonesia/L=Jakarta/O=Agrione/CN=103.31.205.102" \
  -addext "subjectAltName=IP:103.31.205.102"
```

**Ganti `103.31.205.102` dengan IP VPS Anda!**

#### Step 3: Setup Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/agrione
```

**Isi dengan:**

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name 103.31.205.102;
    
    # Redirect semua HTTP ke HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name 103.31.205.102;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/agrione.crt;
    ssl_certificate_key /etc/nginx/ssl/agrione.key;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Step 4: Enable Site dan Restart Nginx

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/agrione /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### Step 5: Update Firewall

```bash
# Allow HTTPS
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

# Optional: Close direct access to 3000 dan 8000 (via Nginx saja)
# sudo ufw deny 3000/tcp
# sudo ufw deny 8000/tcp
```

#### Step 6: Update Environment Variables

```bash
cd /opt/agrione/agrione-v1
nano .env
```

**Update:**
```env
CORS_ORIGIN=https://103.31.205.102
NEXT_PUBLIC_API_URL=https://103.31.205.102/api
```

**Restart containers:**
```bash
docker compose restart backend frontend
```

---

### Opsi 2: Docker dengan Nginx (All-in-One)

Buat `nginx.conf` di root project:

```nginx
events {
    worker_connections 1024;
}

http {
    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name 103.31.205.102;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name 103.31.205.102;

        ssl_certificate /etc/nginx/ssl/agrione.crt;
        ssl_certificate_key /etc/nginx/ssl/agrione.key;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        location / {
            proxy_pass http://frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api {
            proxy_pass http://backend:8000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

**Update `docker-compose.yml`:**

```yaml
services:
  # ... existing services ...

  nginx:
    image: nginx:alpine
    container_name: agrione_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - agrione_network
    restart: always
```

---

## ⚠️ Browser Warning

Saat pertama kali akses `https://103.31.205.102`, browser akan menampilkan:

**Chrome/Edge:**
```
Your connection is not private
NET::ERR_CERT_AUTHORITY_INVALID
```

**Safari:**
```
This connection is not private
```

**Solusi untuk User:**
1. Klik **"Advanced"** atau **"Show Details"**
2. Klik **"Proceed to 103.31.205.102 (unsafe)"** atau **"Visit this website"**
3. Setelah itu, akan bekerja normal

**Note:** Warning ini muncul karena self-signed certificate tidak terverifikasi oleh CA. Ini normal dan aman untuk internal use.

---

## 🔄 Update CORS dan API URL

Setelah setup HTTPS, update environment variables:

```bash
cd /opt/agrione/agrione-v1
nano .env
```

```env
# Ganti dari HTTP ke HTTPS
CORS_ORIGIN=https://103.31.205.102
NEXT_PUBLIC_API_URL=https://103.31.205.102/api
```

**Restart:**
```bash
docker compose restart backend frontend
```

---

## 📊 Perbandingan: IP vs Domain

| Aspect | IP + Self-Signed | Domain + Let's Encrypt |
|--------|------------------|------------------------|
| **Setup** | ✅ Mudah | ⚠️ Perlu domain |
| **Cost** | ✅ Gratis | ✅ Gratis (domain ~$10/tahun) |
| **Browser Trust** | ❌ Warning muncul | ✅ Fully trusted |
| **User Experience** | ⚠️ Klik "Advanced" sekali | ✅ Smooth |
| **Camera Access** | ✅ Bekerja | ✅ Bekerja |
| **Production Ready** | ⚠️ OK untuk internal | ✅ Recommended |

---

## 🎯 Rekomendasi

### Untuk Development/Testing:
✅ **IP + Self-Signed Certificate** - Cukup untuk testing

### Untuk Production:
✅ **Domain + Let's Encrypt** - Lebih profesional, user-friendly

**Domain murah:**
- Namecheap: ~$10/tahun
- Cloudflare Registrar: ~$8/tahun
- Freenom: Gratis (tapi terbatas)

---

## 🚀 Quick Setup Script

Buat file `setup-https-ip.sh`:

```bash
#!/bin/bash

VPS_IP="103.31.205.102"  # Ganti dengan IP Anda

echo "🔒 Setting up HTTPS for IP: $VPS_IP"

# Install Nginx
sudo apt update
sudo apt install nginx openssl -y

# Generate certificate
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/agrione.key \
  -out /etc/nginx/ssl/agrione.crt \
  -subj "/C=ID/ST=Indonesia/L=Jakarta/O=Agrione/CN=$VPS_IP" \
  -addext "subjectAltName=IP:$VPS_IP"

# Setup Nginx config (copy dari contoh di atas)
# ...

# Enable and start
sudo systemctl enable nginx
sudo systemctl restart nginx

# Firewall
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

echo "✅ HTTPS setup complete!"
echo "Access: https://$VPS_IP"
echo "⚠️  First time: Click 'Advanced' → 'Proceed'"
```

---

## ✅ Testing

Setelah setup:

1. **Akses:** `https://103.31.205.102`
2. **Klik "Advanced" → "Proceed"** (pertama kali)
3. **Test kamera** - Seharusnya sudah bisa diakses!

---

## 📝 Summary

**Ya, bisa pakai HTTPS dengan IP address saja!**

- ✅ Setup self-signed certificate
- ✅ Configure Nginx reverse proxy
- ✅ Update CORS_ORIGIN dan NEXT_PUBLIC_API_URL ke HTTPS
- ⚠️ User perlu klik "Advanced" pertama kali
- ✅ Setelah itu, kamera bisa diakses di semua browser!

