#!/bin/bash

# Quick Health Check Script untuk Agrione
# Usage: ./check-health.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 Agrione Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Docker
echo -e "${YELLOW}📦 Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker installed${NC}"
    docker --version
else
    echo -e "${RED}❌ Docker not found${NC}"
    exit 1
fi

echo ""

# Check Container Status
echo -e "${YELLOW}🐳 Container Status:${NC}"
cd /opt/agrione/agrione-v1 2>/dev/null || cd /opt/agrione-v1 2>/dev/null || cd ~/agrione-v1 2>/dev/null || { echo -e "${RED}❌ Project directory not found${NC}"; exit 1; }

docker compose ps

echo ""

# Check Backend
echo -e "${YELLOW}🔧 Backend Health:${NC}"
if curl -s -f http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
    curl -s http://localhost:8000/api/health | jq . 2>/dev/null || curl -s http://localhost:8000/api/health
else
    echo -e "${RED}❌ Backend tidak bisa diakses${NC}"
    echo "   Check logs: docker compose logs backend"
fi

echo ""

# Check Frontend
echo -e "${YELLOW}🌐 Frontend Status:${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅ Frontend is accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ Frontend tidak bisa diakses (HTTP $HTTP_CODE)${NC}"
    echo "   Check logs: docker compose logs frontend"
fi

echo ""

# Check Database
echo -e "${YELLOW}🗄️  Database Connection:${NC}"
if docker compose exec -T postgres psql -U agrione -d agrione_db -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection OK${NC}"
    
    # Get database size
    DB_SIZE=$(docker compose exec -T postgres psql -U agrione -d agrione_db -t -c "SELECT pg_size_pretty(pg_database_size('agrione_db'));" 2>/dev/null | xargs)
    echo "   Database size: $DB_SIZE"
else
    echo -e "${RED}❌ Database tidak bisa diakses${NC}"
    echo "   Check logs: docker compose logs postgres"
fi

echo ""

# Check Environment Variables
echo -e "${YELLOW}⚙️  Environment Configuration:${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✅ .env file found${NC}"
    echo "   CORS_ORIGIN: $(grep CORS_ORIGIN .env | cut -d'=' -f2 || echo 'not set')"
    echo "   NEXT_PUBLIC_API_URL: $(grep NEXT_PUBLIC_API_URL .env | cut -d'=' -f2 || echo 'not set')"
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
fi

echo ""

# Check Disk Space
echo -e "${YELLOW}💾 Disk Usage:${NC}"
df -h | grep -E "Filesystem|/dev/" | head -3

echo ""

# Check Memory
echo -e "${YELLOW}🧠 Memory Usage:${NC}"
free -h | head -2

echo ""

# Check Recent Logs for Errors
echo -e "${YELLOW}📋 Recent Errors (last 5):${NC}"
ERRORS=$(docker compose logs --tail=100 2>&1 | grep -i error | tail -5)
if [ -z "$ERRORS" ]; then
    echo -e "${GREEN}✅ No recent errors found${NC}"
else
    echo -e "${RED}⚠️  Recent errors:${NC}"
    echo "$ERRORS"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Health check complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

