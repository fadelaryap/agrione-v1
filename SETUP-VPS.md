# 🚀 Setup VPS dari Awal - Panduan Lengkap

Panduan step-by-step untuk setup VPS Ubuntu dari awal sampai auto-deployment berjalan.

## 📋 Prerequisites

- VPS Ubuntu (18.04 atau lebih baru)
- Akses SSH ke VPS
- Akun GitHub

---

## 🔧 STEP 1: Setup VPS (Di VPS Ubuntu)

### 1.1 Login ke VPS

```bash
ssh user@your-vps-ip
# Contoh: ssh ubuntu@123.456.789.0
```

### 1.2 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Download dan Run Setup Script

```bash
# Download script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/agrione/main/setup-vps-complete.sh -o setup.sh

# Atau jika sudah clone repository:
# cd ~
# git clone https://github.com/YOUR_USERNAME/agrione.git
# cd agrione
# chmod +x setup-vps-complete.sh
# ./setup-vps-complete.sh

# Berikan permission
chmod +x setup.sh

# Run script
./setup.sh
```

Script akan:
- ✅ Install Docker
- ✅ Install Docker Compose
- ✅ Install Git
- ✅ Generate SSH key untuk GitHub Actions
- ✅ Buat project directory

### 1.4 Logout dan Login Lagi

**PENTING!** Logout dan login lagi untuk apply docker group:

```bash
exit
# Login lagi
ssh user@your-vps-ip
```

Atau tanpa logout:
```bash
newgrp docker
```

### 1.5 Copy SSH Private Key

Script akan menampilkan SSH private key. **COPY SELURUH OUTPUT** (termasuk `-----BEGIN` dan `-----END`):

```bash
cat ~/.ssh/github_actions
```

**Simpan output ini** - akan digunakan di GitHub Secrets.

### 1.6 Clone Repository

```bash
cd /opt/agrione

# Jika repository sudah ada di GitHub:
git clone https://github.com/YOUR_USERNAME/agrione.git .

# Atau jika belum ada repository:
# Kita akan setup git repository di step berikutnya
```

---

## 🔐 STEP 2: Setup GitHub Repository

### 2.1 Buat Repository di GitHub

1. Buka https://github.com
2. Klik "New repository"
3. Nama: `agrione`
4. Pilih Public atau Private
5. **JANGAN** centang "Initialize with README"
6. Klik "Create repository"

### 2.2 Push Code dari Local (Windows/WSL)

```bash
# Di Windows/WSL, di folder project
cd /d/agrione  # atau D:\agrione

# Initialize git (jika belum)
git init

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/agrione.git

# Add semua file
git add .

# Commit
git commit -m "Initial commit - Agrione project"

# Push ke GitHub
git branch -M main
git push -u origin main
```

### 2.3 Setup GitHub Secrets

1. Buka repository di GitHub: `https://github.com/YOUR_USERNAME/agrione`
2. Klik **Settings** → **Secrets and variables** → **Actions**
3. Klik **New repository secret**

Tambahkan 3 secrets:

#### Secret 1: `VPS_HOST`
- **Name**: `VPS_HOST`
- **Value**: IP VPS Anda (dari output script: `hostname -I`)
  - Contoh: `123.456.789.0`
  - Atau domain jika sudah ada: `vps.example.com`

#### Secret 2: `VPS_USER`
- **Name**: `VPS_USER`
- **Value**: Username SSH Anda (dari output script)
  - Contoh: `ubuntu` atau `root`

#### Secret 3: `VPS_SSH_PRIVATE_KEY`
- **Name**: `VPS_SSH_PRIVATE_KEY`
- **Value**: SSH Private Key (dari `cat ~/.ssh/github_actions` di VPS)
  - Copy **SELURUH** output, termasuk:
    ```
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
    ```

### 2.4 Enable GitHub Actions

1. Repository → **Settings** → **Actions** → **General**
2. Di bagian "Workflow permissions":
   - Pilih **"Read and write permissions"**
3. Scroll ke bawah, klik **Save**

---

## 🔄 STEP 3: Setup Git di VPS (Jika Belum Clone)

Jika repository belum di-clone di VPS:

```bash
cd /opt/agrione

# Clone repository
git clone https://github.com/YOUR_USERNAME/agrione.git .

# Atau jika folder sudah ada tapi kosong:
git init
git remote add origin https://github.com/YOUR_USERNAME/agrione.git
git fetch origin
git checkout -b main origin/main
```

---

## ✅ STEP 4: Test Deployment

### 4.1 Test Manual di VPS

```bash
cd /opt/agrione

# Test docker compose
docker compose version

# Test build (jika sudah ada docker-compose.yml)
docker compose build
```

### 4.2 Test GitHub Actions

1. Buat perubahan kecil di local:
   ```bash
   # Di Windows/WSL
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test deployment"
   git push origin main
   ```

2. Buka GitHub → Tab **Actions**
3. Workflow akan otomatis jalan
4. Cek logs untuk melihat progress

---

## 🎯 Cara Kerja Auto-Deployment

1. **Push ke GitHub** → Trigger GitHub Actions
2. **GitHub Actions** → SSH ke VPS menggunakan private key
3. **VPS** → Pull latest code, build, dan restart containers

---

## 🔍 Troubleshooting

### Error: "Permission denied (publickey)"

```bash
# Di VPS, test SSH key
ssh -i ~/.ssh/github_actions localhost

# Pastikan authorized_keys ada
cat ~/.ssh/authorized_keys | grep github-actions

# Fix permission
chmod 600 ~/.ssh/github_actions
chmod 644 ~/.ssh/authorized_keys
```

### Error: "Cannot connect to Docker daemon"

```bash
# Pastikan user di docker group
groups | grep docker

# Jika tidak ada, tambahkan:
sudo usermod -aG docker $USER
newgrp docker

# Test
docker ps
```

### Error: "Project directory not found"

```bash
# Pastikan directory ada
ls -la /opt/agrione

# Jika tidak ada, buat:
sudo mkdir -p /opt/agrione
sudo chown $USER:$USER /opt/agrione
cd /opt/agrione
git clone https://github.com/YOUR_USERNAME/agrione.git .
```

### GitHub Actions gagal

1. Cek logs di tab **Actions** di GitHub
2. Pastikan semua secrets sudah di-set dengan benar
3. Test SSH connection manual:
   ```bash
   ssh -i ~/.ssh/github_actions VPS_USER@VPS_HOST
   ```

---

## 📝 Checklist

- [ ] VPS sudah di-update (`apt update && apt upgrade`)
- [ ] Setup script sudah di-run
- [ ] Logout dan login lagi (untuk docker group)
- [ ] SSH private key sudah di-copy
- [ ] Repository GitHub sudah dibuat
- [ ] Code sudah di-push ke GitHub
- [ ] 3 GitHub Secrets sudah di-set
- [ ] GitHub Actions sudah di-enable
- [ ] Test push dan cek Actions tab

---

## 🎉 Selesai!

Setelah semua setup selesai, setiap kali Anda push ke GitHub:
- GitHub Actions otomatis jalan
- Code otomatis di-pull ke VPS
- Containers otomatis di-rebuild dan restart

**Selamat! Auto-deployment sudah siap! 🚀**

