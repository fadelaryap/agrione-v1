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

# Navigate to project directory
PROJECT_DIR="${PROJECT_DIR:-~/agrione}"
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  Project directory not found at $PROJECT_DIR${NC}"
    echo -e "${YELLOW}   Please set PROJECT_DIR environment variable or clone the repository first.${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

echo -e "${GREEN}📁 Project directory: $(pwd)${NC}"

# Pull latest changes (if git repo)
if [ -d ".git" ]; then
    echo -e "${GREEN}📥 Pulling latest changes...${NC}"
    git fetch origin
    git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || echo "⚠️  Could not pull from git"
fi

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

