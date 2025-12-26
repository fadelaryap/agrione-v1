# 🔧 Update Nginx Config untuk Fix 413 Error

## 📋 Langkah-langkah

### Step 1: Backup Config yang Ada

```bash
sudo cp /etc/nginx/sites-available/agrione /etc/nginx/sites-available/agrione.backup
```

### Step 2: Edit Nginx Config

```bash
sudo nano /etc/nginx/sites-available/agrione
```

### Step 3: Tambahkan/Update Config

**Tambahkan di dalam HTTPS `server` block (setelah `real_ip_header CF-Connecting-IP;`):**

```nginx
    # ⬇️ TAMBAHKAN INI ⬇️
    # Increase client max body size for file uploads (default is 1MB)
    client_max_body_size 50M;
    
    # Increase buffer sizes for large uploads
    client_body_buffer_size 128k;
    
    # Increase timeouts for large uploads
    client_body_timeout 60s;
    # ⬆️ SAMPAI SINI ⬆️
```

**Tambahkan location block baru untuk `/upload` (setelah location `/api`, sebelum location `/health`):**

```nginx
    # ⬇️ TAMBAHKAN INI ⬇️
    # Next.js API route for file upload
    location /upload {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;
        
        # Increase timeouts for large file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # Increase buffer sizes for file uploads
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    # ⬆️ SAMPAI SINI ⬆️
```

### Step 4: Test & Reload Nginx

```bash
# Test configuration
sudo nginx -t

# Jika sukses, reload nginx
sudo systemctl reload nginx
```

## ✅ Verifikasi

Setelah update, test upload file lagi. Seharusnya tidak ada error 413 lagi.

## 📝 Penjelasan

- **`client_max_body_size 50M`** = Maksimal 50MB per request (default 1MB)
- **`client_body_buffer_size 128k`** = Buffer size untuk body request
- **`client_body_timeout 60s`** = Timeout untuk upload body
- **Location `/upload`** = Khusus untuk Next.js API route upload dengan timeout lebih lama (300s)

---

**Selesai!** 🎉

