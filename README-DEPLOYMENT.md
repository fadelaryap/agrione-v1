# 🚀 Deployment Guide

Panduan lengkap untuk setup automatic deployment dari GitHub ke VPS Ubuntu.

## 📋 Prerequisites

1. ✅ VPS Ubuntu (18.04 atau lebih baru)
2. ✅ SSH access ke VPS
3. ✅ GitHub repository dengan Actions enabled
4. ✅ Domain (opsional, untuk production)

## 🔧 Setup di VPS

### Opsi 1: Menggunakan Setup Script (Recommended)

```bash
# Download dan run setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/agrione/main/setup-vps.sh -o setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh

# Atau clone repository dulu
git clone https://github.com/YOUR_USERNAME/agrione.git
cd agrione
chmod +x setup-vps.sh
./setup-vps.sh
```

### Opsi 2: Manual Setup

#### 1. Install Docker dan Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Logout dan login kembali
exit
# Login lagi via SSH
```

#### 2. Clone Repository

```bash
# Pilih lokasi (contoh: /opt/agrione atau ~/agrione)
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/agrione.git
sudo chown -R $USER:$USER agrione
cd agrione
```

#### 3. Setup SSH Key untuk GitHub Actions

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""

# Add to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/github_actions
chmod 644 ~/.ssh/authorized_keys

# Copy private key (untuk GitHub Secrets)
cat ~/.ssh/github_actions
```

## 🔐 Setup di GitHub

### 1. Tambahkan Secrets

Buka repository di GitHub:
- Settings → Secrets and variables → Actions → New repository secret

Tambahkan 3 secrets:

| Secret Name | Value | Contoh |
|------------|-------|--------|
| `VPS_HOST` | IP atau domain VPS | `123.456.789.0` atau `vps.example.com` |
| `VPS_USER` | Username SSH | `ubuntu` atau `root` |
| `VPS_SSH_PRIVATE_KEY` | Private key SSH | (dari `cat ~/.ssh/github_actions`) |

### 2. Enable GitHub Actions

- Repository → Settings → Actions → General
- Pilih "Allow all actions and reusable workflows"

## 🎯 Cara Kerja

1. **Push ke GitHub**: Setiap push ke branch `main` atau `master`
2. **GitHub Actions**: Otomatis trigger workflow
3. **SSH ke VPS**: Connect menggunakan SSH key
4. **Pull & Deploy**: 
   - Pull latest code
   - Stop containers
   - Build new images
   - Start containers
   - Health check

## 📝 Manual Deployment

Jika ingin deploy manual di VPS:

```bash
cd /opt/agrione  # atau lokasi project Anda
chmod +x deploy.sh
./deploy.sh
```

Atau langsung dengan docker compose:

```bash
cd /opt/agrione
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 🔍 Troubleshooting

### GitHub Actions gagal connect

```bash
# Test SSH connection manual
ssh -i ~/.ssh/github_actions VPS_USER@VPS_HOST

# Check SSH service
sudo systemctl status ssh

# Check firewall
sudo ufw status
sudo ufw allow 22/tcp
```

### Container tidak start

```bash
# Check logs
docker compose logs
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# Check status
docker compose ps -a

# Check port
sudo netstat -tulpn | grep -E ':(3000|8000|5432)'
```

### Database error

```bash
# Restart database
docker compose restart postgres

# Check database logs
docker compose logs postgres

# Access database
docker compose exec postgres psql -U agrione -d agrione_db
```

### Permission denied

```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/agrione

# Add user to docker group
sudo usermod -aG docker $USER
# Logout dan login lagi
```

## 🌐 Production Setup (Optional)

### Nginx Reverse Proxy dengan SSL

```bash
# Install Nginx
sudo apt install nginx certbot python3-certbot-nginx -y

# Setup Nginx config
sudo nano /etc/nginx/sites-available/agrione
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/agrione /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d your-domain.com
```

### Update Environment Variables

Edit `docker-compose.yml` atau buat `.env` file:

```bash
nano .env
```

```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

## 🔒 Security Best Practices

1. **Firewall**: Setup UFW
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **SSH Hardening**:
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Set: PermitRootLogin no
   # Set: PasswordAuthentication no (jika pakai key)
   sudo systemctl restart sshd
   ```

3. **Fail2ban**:
   ```bash
   sudo apt install fail2ban -y
   sudo systemctl enable fail2ban
   ```

4. **Regular Updates**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

## 📊 Monitoring

### Check container resources

```bash
docker stats
```

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

## 🆘 Support

Jika ada masalah:
1. Check GitHub Actions logs
2. Check container logs di VPS
3. Verify SSH connection
4. Check firewall rules
