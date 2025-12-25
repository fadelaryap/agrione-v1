#!/bin/bash

# Script untuk update .env dari IP address ke domain
# Usage: ./update-to-domain.sh

set -e

DOMAIN="agrione.agrihub.id"
PROJECT_DIR=""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🌐 Updating .env to use domain: $DOMAIN${NC}"
echo ""

# Find project directory
if [ -d /opt/agrione/agrione-v1 ]; then
    PROJECT_DIR=/opt/agrione/agrione-v1
elif [ -d ~/agrione-v1 ]; then
    PROJECT_DIR=~/agrione-v1
elif [ -d /opt/agrione-v1 ]; then
    PROJECT_DIR=/opt/agrione-v1
else
    echo -e "${RED}❌ Project directory not found!${NC}"
    echo "   Please run this script from the project directory or set PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    exit 1
fi

echo -e "${YELLOW}📝 Current .env values:${NC}"
grep -E "CORS_ORIGIN|NEXT_PUBLIC_API_URL" .env || echo "  (not found)"

echo ""
echo -e "${GREEN}🔄 Updating .env...${NC}"

# Update CORS_ORIGIN
if grep -q "^CORS_ORIGIN=" .env; then
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|" .env
    echo -e "${GREEN}✅ Updated CORS_ORIGIN${NC}"
else
    echo "CORS_ORIGIN=https://$DOMAIN" >> .env
    echo -e "${GREEN}✅ Added CORS_ORIGIN${NC}"
fi

# Update NEXT_PUBLIC_API_URL (harus include /api karena baseURL di api.ts tidak tambah /api lagi)
if grep -q "^NEXT_PUBLIC_API_URL=" .env; then
    sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://$DOMAIN/api|" .env
    echo -e "${GREEN}✅ Updated NEXT_PUBLIC_API_URL${NC}"
else
    echo "NEXT_PUBLIC_API_URL=https://$DOMAIN/api" >> .env
    echo -e "${GREEN}✅ Added NEXT_PUBLIC_API_URL${NC}"
fi

echo ""
echo -e "${YELLOW}📝 Updated .env values:${NC}"
grep -E "CORS_ORIGIN|NEXT_PUBLIC_API_URL" .env

echo ""
echo -e "${YELLOW}🔨 Rebuilding frontend (NEXT_PUBLIC_API_URL is build-time variable)...${NC}"
docker compose up -d --build frontend

echo ""
echo -e "${YELLOW}🔄 Restarting backend...${NC}"
docker compose restart backend

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Update complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "  1. Clear browser cache (Ctrl+Shift+R atau Cmd+Shift+R)"
echo "  2. Test: https://$DOMAIN/login"
echo "  3. Check Network tab (F12) - semua request harus ke https://$DOMAIN/api"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"

