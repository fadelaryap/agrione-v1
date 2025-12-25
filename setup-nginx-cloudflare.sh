#!/bin/bash

# Setup Nginx dengan Cloudflare Domain
# Usage: ./setup-nginx-cloudflare.sh

set -e

DOMAIN="agrione.agrihub.id"
VPS_IP="103.31.205.102"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}☁️  Setting up Nginx with Cloudflare domain: $DOMAIN${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${YELLOW}⚠️  Please don't run as root. Use a regular user with sudo privileges.${NC}"
   exit 1
fi

# Step 1: Install Nginx
echo -e "${GREEN}📦 Step 1: Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt update
    sudo apt install nginx -y
    echo -e "${GREEN}✅ Nginx installed${NC}"
else
    echo -e "${GREEN}✅ Nginx already installed${NC}"
fi

# Step 2: Generate SSL Certificate
echo ""
echo -e "${GREEN}🔒 Step 2: Generating SSL certificate...${NC}"
sudo mkdir -p /etc/nginx/ssl

if [ ! -f /etc/nginx/ssl/agrione.crt ]; then
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/agrione.key \
      -out /etc/nginx/ssl/agrione.crt \
      -subj "/C=ID/ST=Indonesia/L=Jakarta/O=Agrione/CN=$DOMAIN" \
      -addext "subjectAltName=DNS:$DOMAIN,DNS:*.agrihub.id,IP:$VPS_IP"
    echo -e "${GREEN}✅ SSL certificate generated${NC}"
else
    echo -e "${YELLOW}⚠️  SSL certificate already exists${NC}"
fi

# Step 3: Create Nginx config
echo ""
echo -e "${GREEN}⚙️  Step 3: Creating Nginx configuration...${NC}"

sudo tee /etc/nginx/sites-available/agrione > /dev/null <<EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Redirect semua HTTP ke HTTPS
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/agrione.crt;
    ssl_certificate_key /etc/nginx/ssl/agrione.key;
    
    # SSL settings
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
    real_ip_header CF-Connecting-IP;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header CF-Connecting-IP \$http_cf_connecting_ip;
        proxy_set_header CF-Ray \$http_cf_ray;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header CF-Connecting-IP \$http_cf_connecting_ip;
        proxy_set_header CF-Ray \$http_cf_ray;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000/api/health;
        access_log off;
    }
}
EOF

echo -e "${GREEN}✅ Nginx configuration created${NC}"

# Step 4: Enable site
echo ""
echo -e "${GREEN}🔗 Step 4: Enabling site...${NC}"
sudo ln -sf /etc/nginx/sites-available/agrione /etc/nginx/sites-enabled/

# Remove default site
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
    echo -e "${GREEN}✅ Default site removed${NC}"
fi

# Step 5: Test configuration
echo ""
echo -e "${GREEN}🧪 Step 5: Testing Nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    exit 1
fi

# Step 6: Restart Nginx
echo ""
echo -e "${GREEN}🚀 Step 6: Restarting Nginx...${NC}"
sudo systemctl restart nginx
sudo systemctl enable nginx
echo -e "${GREEN}✅ Nginx restarted and enabled${NC}"

# Step 7: Update firewall
echo ""
echo -e "${GREEN}🔥 Step 7: Updating firewall...${NC}"
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo -e "${GREEN}✅ Firewall updated${NC}"

# Step 8: Update .env file
echo ""
echo -e "${GREEN}⚙️  Step 8: Updating environment variables...${NC}"
PROJECT_DIR=""
if [ -d /opt/agrione/agrione-v1 ]; then
    PROJECT_DIR=/opt/agrione/agrione-v1
elif [ -d ~/agrione-v1 ]; then
    PROJECT_DIR=~/agrione-v1
else
    echo -e "${YELLOW}⚠️  Project directory not found. Please update .env manually.${NC}"
    PROJECT_DIR=""
fi

if [ -n "$PROJECT_DIR" ] && [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  .env file not found. Creating...${NC}"
        touch .env
    fi
    
    # Update CORS_ORIGIN
    if grep -q "^CORS_ORIGIN=" .env; then
        sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|" .env
    else
        echo "CORS_ORIGIN=https://$DOMAIN" >> .env
    fi
    
    # Update NEXT_PUBLIC_API_URL
    if grep -q "^NEXT_PUBLIC_API_URL=" .env; then
        sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://$DOMAIN/api|" .env
    else
        echo "NEXT_PUBLIC_API_URL=https://$DOMAIN/api" >> .env
    fi
    
    echo -e "${GREEN}✅ Environment variables updated${NC}"
    echo -e "${YELLOW}📝 Restart containers: docker compose restart backend frontend${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "  1. Setup DNS di Cloudflare:"
echo "     - Type: A"
echo "     - Name: agrione"
echo "     - IPv4: $VPS_IP"
echo "     - Proxy: ✅ Proxied (orange cloud)"
echo ""
echo "  2. Setup SSL/TLS di Cloudflare:"
echo "     - SSL/TLS mode: Full (atau Full strict)"
echo "     - Always Use HTTPS: ✅ Enabled"
echo ""
echo "  3. Restart containers:"
echo "     cd $PROJECT_DIR"
echo "     docker compose restart backend frontend"
echo ""
echo "  4. Test:"
echo "     https://$DOMAIN"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"

