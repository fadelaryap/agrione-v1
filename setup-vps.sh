#!/bin/bash

# Setup script untuk VPS Ubuntu
# Run script ini di VPS untuk setup environment

set -e

echo "🚀 Setting up VPS for Agrione deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${YELLOW}⚠️  Please don't run as root. Use a regular user with sudo privileges.${NC}"
   exit 1
fi

# Update system
echo -e "${GREEN}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${GREEN}🐳 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker installed. Please logout and login again for group changes to take effect.${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    echo -e "${GREEN}🔧 Installing Docker Compose...${NC}"
    sudo apt install docker-compose-plugin -y
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# Install Git (if not installed)
if ! command -v git &> /dev/null; then
    echo -e "${GREEN}📥 Installing Git...${NC}"
    sudo apt install git -y
else
    echo -e "${GREEN}✅ Git already installed${NC}"
fi

# Setup SSH for GitHub Actions
echo -e "${GREEN}🔑 Setting up SSH for GitHub Actions...${NC}"
if [ ! -f ~/.ssh/github_actions ]; then
    ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""
    cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/github_actions
    chmod 644 ~/.ssh/authorized_keys
    echo -e "${GREEN}✅ SSH key generated${NC}"
    echo -e "${YELLOW}📋 Please add the following private key to GitHub Secrets (VPS_SSH_PRIVATE_KEY):${NC}"
    echo "---"
    cat ~/.ssh/github_actions
    echo "---"
else
    echo -e "${GREEN}✅ SSH key already exists${NC}"
fi

# Create project directory
PROJECT_DIR="${1:-/opt/agrione-v1}"
echo -e "${GREEN}📁 Setting up project directory at $PROJECT_DIR...${NC}"

if [ ! -d "$PROJECT_DIR" ]; then
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown $USER:$USER "$PROJECT_DIR"
    echo -e "${GREEN}✅ Project directory created${NC}"
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "  1. Clone your repository:"
    echo "     cd $PROJECT_DIR"
    echo "     git clone https://github.com/fadelaryap/agrione-v1.git ."
    echo ""
    echo "  2. Add GitHub Secrets:"
    echo "     - VPS_HOST: $(hostname -I | awk '{print $1}') or your domain"
    echo "     - VPS_USER: $USER"
    echo "     - VPS_SSH_PRIVATE_KEY: (from ~/.ssh/github_actions above)"
else
    echo -e "${GREEN}✅ Project directory already exists${NC}"
fi

echo -e "${GREEN}✅ VPS setup complete!${NC}"
echo -e "${YELLOW}⚠️  Remember to logout and login again for Docker group changes to take effect.${NC}"

