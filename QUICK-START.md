# ⚡ Quick Start - Setup VPS dari Awal

Panduan cepat untuk setup VPS dari awal sampai auto-deployment berjalan.

## 🎯 Tujuan

Setiap push ke GitHub → Otomatis rebuild di VPS

---

## 📝 STEP-BY-STEP

### 1️⃣ Di VPS Ubuntu (SSH ke VPS)

```bash
# Login ke VPS
ssh ubuntu@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Download setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/agrione/main/setup-vps-complete.sh -o setup.sh
chmod +x setup.sh
./setup.sh

# ⚠️ PENTING: Logout dan login lagi
exit
ssh ubuntu@your-vps-ip

# Copy SSH private key (untuk GitHub Secrets)
cat ~/.ssh/github_actions
# COPY SELURUH OUTPUT (termasuk -----BEGIN dan -----END)

# Clone repository (jika sudah ada di GitHub)
cd /opt/agrione
git clone https://github.com/YOUR_USERNAME/agrione.git .
```

### 2️⃣ Di Local (Windows/WSL)

```bash
# Di folder project
cd D:\agrione

# Initialize git (jika belum)
git init
git add .
git commit -m "Initial commit"

# Push ke GitHub
git remote add origin https://github.com/YOUR_USERNAME/agrione.git
git branch -M main
git push -u origin main
```

### 3️⃣ Di GitHub

1. **Buat Repository** (jika belum):
   - https://github.com/new
   - Nama: `agrione`
   - Jangan centang "Initialize with README"

2. **Setup Secrets**:
   - Repository → Settings → Secrets and variables → Actions
   - New repository secret
   
   Tambahkan 3 secrets:
   - `VPS_HOST` = IP VPS (dari output script)
   - `VPS_USER` = username SSH (contoh: `ubuntu`)
   - `VPS_SSH_PRIVATE_KEY` = output dari `cat ~/.ssh/github_actions` di VPS

3. **Enable Actions**:
   - Settings → Actions → General
   - Workflow permissions: "Read and write"
   - Save

### 4️⃣ Test

```bash
# Di local, buat perubahan kecil
echo "test" >> test.txt
git add test.txt
git commit -m "Test deployment"
git push origin main

# Cek GitHub → Tab Actions
# Workflow akan otomatis jalan!
```

---

## ✅ Checklist

- [ ] VPS: `apt update && apt upgrade` ✅
- [ ] VPS: Run `setup-vps-complete.sh` ✅
- [ ] VPS: Logout & login lagi ✅
- [ ] VPS: Copy SSH private key ✅
- [ ] Local: Push code ke GitHub ✅
- [ ] GitHub: Buat repository ✅
- [ ] GitHub: Setup 3 secrets ✅
- [ ] GitHub: Enable Actions ✅
- [ ] Test: Push dan cek Actions ✅

---

## 🎉 Selesai!

Setelah ini, setiap push ke GitHub akan otomatis rebuild di VPS!

---

## 🆘 Masalah?

**SSH connection failed?**
```bash
# Di VPS, test SSH key
ssh -i ~/.ssh/github_actions localhost
```

**Docker permission denied?**
```bash
# Di VPS
newgrp docker
docker ps
```

**Project directory not found?**
```bash
# Di VPS
cd /opt/agrione
git clone https://github.com/YOUR_USERNAME/agrione.git .
```

