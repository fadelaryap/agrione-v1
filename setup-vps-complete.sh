#!/bin/bash

# Setup script lengkap untuk VPS Ubuntu dari awal
# Run script ini di VPS setelah apt update && apt upgrade

set -e

echo "🚀 Setting up VPS for Agrione - Complete Setup"
echo "================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Jangan run sebagai root. Gunakan user biasa dengan sudo.${NC}"
   exit 1
fi

echo -e "${BLUE}📦 Step 1: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker installed${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Logout dan login lagi untuk apply docker group!${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

echo -e "${BLUE}📦 Step 2: Installing Docker Compose...${NC}"
if ! docker compose version &> /dev/null; then
    sudo apt install docker-compose-plugin -y
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

echo -e "${BLUE}📦 Step 3: Installing Git...${NC}"
if ! command -v git &> /dev/null; then
    sudo apt install git -y
    echo -e "${GREEN}✅ Git installed${NC}"
else
    echo -e "${GREEN}✅ Git already installed${NC}"
fi

echo -e "${BLUE}🔑 Step 4: Setting up SSH for GitHub Actions...${NC}"
mkdir -p ~/.ssh
chmod 700 ~/.ssh

if [ ! -f ~/.ssh/github_actions ]; then
    ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""
    cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/github_actions
    chmod 644 ~/.ssh/authorized_keys
    echo -e "${GREEN}✅ SSH key generated${NC}"
else
    echo -e "${GREEN}✅ SSH key already exists${NC}"
fi

echo -e "${BLUE}📁 Step 5: Setting up project directory...${NC}"
PROJECT_DIR="/opt/agrione"

if [ ! -d "$PROJECT_DIR" ]; then
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown $USER:$USER "$PROJECT_DIR"
    echo -e "${GREEN}✅ Project directory created at $PROJECT_DIR${NC}"
else
    echo -e "${GREEN}✅ Project directory already exists${NC}"
fi

echo ""
echo -e "${GREEN}✅ Setup selesai!${NC}"
echo ""
echo -e "${YELLOW}📋 INFORMASI PENTING:${NC}"
echo ""
echo -e "${BLUE}1. SSH Private Key (untuk GitHub Secrets - VPS_SSH_PRIVATE_KEY):${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat ~/.ssh/github_actions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}2. VPS Host (untuk GitHub Secrets - VPS_HOST):${NC}"
echo "   $(hostname -I | awk '{print $1}')"
echo "   atau domain Anda jika sudah setup"
echo ""
echo -e "${BLUE}3. VPS User (untuk GitHub Secrets - VPS_USER):${NC}"
echo "   $USER"
echo ""
echo -e "${YELLOW}⚠️  PENTING:${NC}"
echo "   1. Logout dan login lagi (atau: newgrp docker)"
echo "   2. Copy SSH Private Key di atas ke GitHub Secrets"
echo "   3. Clone repository ke $PROJECT_DIR"
echo ""
echo -e "${BLUE}Langkah selanjutnya:${NC}"
echo "   cd $PROJECT_DIR"
echo "   git clone https://github.com/YOUR_USERNAME/agrione.git ."
echo "   # atau jika sudah ada:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/agrione.git"
echo "   git pull origin main"

