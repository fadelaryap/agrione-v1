# ⚡ Build Time Optimization

Panduan untuk mengoptimasi build time Docker.

---

## 📊 Build Time Saat Ini

**Current:** ~2 menit 47 detik untuk full rebuild

Ini **normal** untuk:
- First build (download dependencies, compile)
- Rebuild dengan `--no-cache`
- VPS dengan resource terbatas

---

## 🚀 Optimasi Build Time

### 1. Gunakan Build Cache (Recommended)

**Jangan gunakan `--no-cache` setiap kali:**

```bash
# ❌ Lambat (rebuild semua)
docker compose build --no-cache

# ✅ Cepat (gunakan cache)
docker compose build

# ✅ Atau langsung up (auto-build jika perlu)
docker compose up -d --build
```

**Di GitHub Actions, update workflow:**

```yaml
# Build dengan cache
docker compose build
```

### 2. Multi-Stage Build untuk Backend

Update `backend/Dockerfile`:

```dockerfile
# Stage 1: Build
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Stage 2: Runtime
FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy binary from builder
COPY --from=builder /app/main .

EXPOSE 8000
CMD ["./main"]
```

**Keuntungan:**
- Image lebih kecil
- Build lebih cepat (layer caching)
- Production-ready binary

### 3. Optimasi Frontend Build

Update `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (cached layer)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

**Tips:**
- Gunakan `npm ci` untuk production (lebih cepat & reliable)
- `package-lock.json` harus ada untuk cache yang konsisten

### 4. Docker BuildKit (Faster Builds)

Enable BuildKit untuk build yang lebih cepat:

```bash
# Set environment variable
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Atau di docker-compose.yml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      # Enable BuildKit
      x-bake:
        cache-from:
          - type=registry,ref=agrione-backend:cache
```

### 5. Skip Rebuild jika Tidak Ada Perubahan

**Di GitHub Actions, tambahkan check:**

```yaml
# Check if rebuild needed
- name: Check if rebuild needed
  run: |
    if [ -f .docker-rebuild ]; then
      echo "REBUILD=true" >> $GITHUB_ENV
    else
      echo "REBUILD=false" >> $GITHUB_ENV
    fi

- name: Build containers
  if: env.REBUILD == 'true'
  run: docker compose build
```

### 6. Parallel Builds

Build multiple services secara parallel:

```bash
# Build semua services parallel
docker compose build --parallel

# Atau build specific services
docker compose build backend frontend
```

---

## 📈 Expected Build Times

| Scenario | Time | Notes |
|----------|------|-------|
| First build | 3-5 min | Download dependencies |
| Rebuild with cache | 30-60s | Jika tidak ada perubahan |
| Rebuild no cache | 2-3 min | Full rebuild |
| Incremental build | 10-30s | Hanya file yang berubah |

---

## 🔧 Quick Fix untuk Build Time

### Option 1: Remove `--no-cache` dari Workflow

Edit `.github/workflows/deploy.yml`:

```yaml
# Ganti ini:
docker compose build --no-cache

# Menjadi:
docker compose build
```

**Impact:** Build time turun dari ~3 menit ke ~30-60 detik (jika tidak ada perubahan besar)

### Option 2: Conditional Build

```yaml
# Build hanya jika ada perubahan di backend/frontend
- name: Build containers
  run: |
    if git diff --name-only HEAD~1 | grep -E "(backend|frontend)"; then
      docker compose build
    else
      echo "No changes in backend/frontend, skipping build"
    fi
```

### Option 3: Use Pre-built Images (Advanced)

Build images sekali, push ke registry, pull saat deploy:

```yaml
- name: Build and push images
  run: |
    docker compose build
    docker compose push

- name: Deploy
  run: |
    docker compose pull
    docker compose up -d
```

---

## ✅ Recommended Setup

**Untuk development:**
```bash
# Build sekali, kemudian hanya restart
docker compose up -d --build

# Atau jika sudah running
docker compose restart
```

**Untuk production (GitHub Actions):**
```yaml
# Build dengan cache
docker compose build

# Atau conditional build
- name: Build containers
  run: docker compose build --parallel
```

---

## 🎯 Summary

**2 menit 47 detik untuk full rebuild adalah NORMAL**, tapi bisa dioptimasi:

1. ✅ **Hapus `--no-cache`** → Build time: ~30-60s (dengan cache)
2. ✅ **Gunakan `docker compose build`** → Lebih cepat dari `--no-cache`
3. ✅ **Multi-stage build** → Image lebih kecil, build lebih efisien
4. ✅ **Parallel builds** → Build multiple services bersamaan

**Quick win:** Hapus `--no-cache` dari workflow, build time akan turun drastis! 🚀

