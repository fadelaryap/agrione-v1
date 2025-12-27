#!/bin/bash

# Quick fix untuk update domain di .env dan rebuild frontend

DOMAIN="agrione.agrihub.id"

echo "🔧 Fixing domain configuration..."

cd /opt/agrione/agrione-v1 || exit 1

# Update .env
if [ -f .env ]; then
  # Update CORS_ORIGIN
  if grep -q "^CORS_ORIGIN=" .env; then
    sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|" .env
  else
    echo "CORS_ORIGIN=https://$DOMAIN" >> .env
  fi
  
  # Update NEXT_PUBLIC_API_URL (HAPUS SEMUA IP ADDRESS!)
  if grep -q "^NEXT_PUBLIC_API_URL=" .env; then
    sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://$DOMAIN/api|" .env
  else
    echo "NEXT_PUBLIC_API_URL=https://$DOMAIN/api" >> .env
  fi
  
  # Hapus semua baris yang masih pakai IP address
  sed -i '/103\.31\.205\.102/d' .env
  
  echo "✅ Updated .env file"
  echo ""
  echo "Current .env values:"
  grep -E "CORS_ORIGIN|NEXT_PUBLIC_API_URL" .env
else
  echo "❌ .env file not found!"
  exit 1
fi

echo ""
echo "🔄 Rebuilding frontend (NEXT_PUBLIC_API_URL is build-time variable)..."
docker compose up -d --build frontend

echo ""
echo "✅ Done! Frontend is rebuilding with domain configuration."
echo "   Check logs: docker compose logs -f frontend"


