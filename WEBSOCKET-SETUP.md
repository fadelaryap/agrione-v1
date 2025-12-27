# WebSocket Setup Guide

## Masalah yang Ditemukan
WebSocket connection gagal dengan error: `WebSocket connection to 'wss://agrione.agrihub.id/api/ws' failed`

## Solusi

### 1. Reload Nginx Configuration
Setelah update konfigurasi Nginx, **WAJIB reload**:

```bash
sudo nginx -t  # Test konfigurasi
sudo systemctl reload nginx  # Reload Nginx
```

### 2. Cloudflare WebSocket Settings
Cloudflare **perlu setting khusus** untuk WebSocket:

1. Login ke Cloudflare Dashboard
2. Pilih domain `agrihub.id`
3. Go to **Network** → **WebSockets**
4. **Enable WebSockets** (toggle ON)
5. Save changes

**PENTING**: Cloudflare secara default memblokir WebSocket. Harus di-enable manual!

### 3. Test WebSocket Connection

#### Test langsung ke backend (bypass Nginx):
```bash
# Di VPS, test langsung ke backend
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/ws
```

#### Test melalui Nginx:
```bash
# Test melalui Nginx
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost/api/ws
```

### 4. Check Nginx Logs
Jika masih error, cek log Nginx:

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 5. Check Backend Logs
Cek apakah WebSocket handler dipanggil:

```bash
docker logs agrione_backend -f
```

## Troubleshooting

### Error: "WebSocket connection failed"
1. ✅ Pastikan Nginx sudah di-reload
2. ✅ Pastikan Cloudflare WebSocket sudah di-enable
3. ✅ Pastikan backend route `/api/ws` sudah terdaftar
4. ✅ Test langsung ke backend (bypass Nginx) untuk isolasi masalah

### Error: "Unauthorized"
- Pastikan token JWT valid
- Token dikirim via query parameter: `/api/ws?token=YOUR_TOKEN`
- Atau via Authorization header: `Authorization: Bearer YOUR_TOKEN`

### Error: "Connection timeout"
- Cek firewall rules
- Cek Cloudflare settings
- Pastikan proxy timeouts di Nginx sudah cukup panjang (7d untuk WebSocket)

## Konfigurasi yang Sudah Ditambahkan

### Nginx (`nginx-agrione-updated.conf`):
```nginx
location /api/ws {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # ... (full config di file)
}
```

### Backend:
- Route: `/api/ws` (GET)
- Authentication: Via JWT token (query param atau header)
- Handler: `websocket.HandleWebSocket(hub, cfg)`

### Frontend:
- URL: `wss://agrione.agrihub.id/api/ws?token=YOUR_TOKEN`
- Auto-reconnect dengan exponential backoff
- Real-time notification delivery

## Next Steps

1. **Reload Nginx**: `sudo systemctl reload nginx`
2. **Enable Cloudflare WebSocket**: Dashboard → Network → WebSockets → Enable
3. **Test connection**: Buka browser console dan cek apakah WebSocket connected
4. **Monitor logs**: Cek Nginx dan backend logs untuk error messages


