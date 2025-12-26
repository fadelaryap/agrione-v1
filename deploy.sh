#!/bin/bash

# Deployment script for VPS
# This script can be run manually on the VPS or via GitHub Actions

set -e

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Find project directory
PROJECT_DIR=""
if [ -d /opt/agrione/agrione-v1 ]; then
    PROJECT_DIR=/opt/agrione/agrione-v1
elif [ -d ~/agrione-v1 ]; then
    PROJECT_DIR=~/agrione-v1
elif [ -d /opt/agrione-v1 ]; then
    PROJECT_DIR=/opt/agrione-v1
else
    echo -e "${RED}❌ Project directory not found!${NC}"
    echo "   Please clone repository to /opt/agrione/agrione-v1, ~/agrione-v1, or /opt/agrione-v1"
    exit 1
fi
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  Project directory not found at $PROJECT_DIR${NC}"
    echo -e "${YELLOW}   Please set PROJECT_DIR environment variable or clone the repository first.${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

echo -e "${GREEN}📁 Project directory: $(pwd)${NC}"

# Get VPS IP for environment variables
VPS_IP=$(hostname -I | awk '{print $1}')
echo -e "${BLUE}🌐 VPS IP: $VPS_IP${NC}"

# Pull latest changes (if git repo)
if [ -d ".git" ]; then
    echo -e "${GREEN}📥 Pulling latest changes...${NC}"
    git fetch origin
    git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || echo "⚠️  Could not pull from git"
fi

# Setup .env file with VPS IP
if [ ! -f .env ]; then
    echo -e "${GREEN}📝 Creating .env file...${NC}"
    cat > .env << 'ENVEOF'
POSTGRES_USER=agrione
POSTGRES_PASSWORD=agrione123
POSTGRES_DB=agrione_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CSRF_SECRET=your-csrf-secret-key-change-in-production
ENVEOF
    echo "CORS_ORIGIN=http://$VPS_IP:3000" >> .env
    echo "NEXT_PUBLIC_API_URL=http://$VPS_IP:8000" >> .env
else
    echo -e "${GREEN}📝 Updating .env file with VPS IP...${NC}"
    # Update CORS_ORIGIN and NEXT_PUBLIC_API_URL
    if grep -q "^CORS_ORIGIN=" .env; then
        sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=http://$VPS_IP:3000|" .env
    else
        echo "CORS_ORIGIN=http://$VPS_IP:3000" >> .env
    fi
    
    if grep -q "^NEXT_PUBLIC_API_URL=" .env; then
        sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$VPS_IP:8000|" .env
    else
        echo "NEXT_PUBLIC_API_URL=http://$VPS_IP:8000" >> .env
    fi
    
    # GCS Configuration (jika belum ada)
    if ! grep -q "^GCS_BUCKET_NAME=" .env; then
        echo "GCS_BUCKET_NAME=" >> .env
    fi
    if ! grep -q "^GOOGLE_APPLICATION_CREDENTIALS=" .env; then
        echo "GOOGLE_APPLICATION_CREDENTIALS=/opt/gcs-credentials.json" >> .env
    fi
fi

echo -e "${GREEN}✅ Environment configured:${NC}"
echo -e "   CORS_ORIGIN=http://$VPS_IP:3000"
echo -e "   NEXT_PUBLIC_API_URL=http://$VPS_IP:8000"

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker compose down || true

# Build and start containers
echo -e "${GREEN}🔨 Building containers...${NC}"
docker compose build --no-cache

echo -e "${GREEN}🚀 Starting containers...${NC}"
docker compose up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Health checks
echo -e "${GREEN}🏥 Running health checks...${NC}"

# Check backend
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend health check failed (may need more time)${NC}"
fi

# Show container status
echo -e "${GREEN}📊 Container status:${NC}"
docker compose ps

# Clean up old images
echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
docker image prune -f

echo -e "${GREEN}✅ Deployment complete!${NC}"

