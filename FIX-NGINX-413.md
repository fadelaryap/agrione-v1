# 🔧 Fix Nginx 413 Error (Request Entity Too Large)

## 📋 Masalah

Error 413 terjadi karena Nginx membatasi ukuran request body (default: 1MB). Untuk upload file gambar/video, perlu increase limit.

## ✅ Solusi: Update Nginx Configuration

### Step 1: Backup Config Nginx yang Ada

```bash
sudo cp /etc/nginx/sites-available/agrione /etc/nginx/sites-available/agrione.backup
```

### Step 2: Edit Nginx Config

```bash
sudo nano /etc/nginx/sites-available/agrione
```

### Step 3: Tambahkan/Update di dalam `server` block:

```nginx
server {
    listen 80;
    server_name agrione.agrihub.id;

    # Increase client max body size for file uploads (default is 1MB)
    # Set to 50MB to handle image/video uploads
    client_max_body_size 50M;
    
    # Increase buffer sizes for large uploads
    client_body_buffer_size 128k;
    
    # Increase timeouts for large uploads
    client_body_timeout 60s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

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

    # Backend API (Go)
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js API route for file upload (/upload)
    location /upload {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for large file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

### Step 4: Test Nginx Configuration

```bash
sudo nginx -t
```

### Step 5: Reload Nginx

```bash
sudo systemctl reload nginx
```

## 🔍 Verifikasi

Setelah update, test upload file lagi. Seharusnya tidak ada error 413 lagi.

## 📝 Catatan

- `client_max_body_size 50M` = maksimal 50MB per request
- Bisa diubah ke `100M` atau lebih jika perlu upload file lebih besar
- Timeout di-set lebih lama untuk handle upload file besar

---

**Selesai!** 🎉

