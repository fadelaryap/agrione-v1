#!/bin/bash

echo "🔍 Checking GCS Configuration..."
echo ""

# Check .env file
if [ -f .env ]; then
  echo "✅ .env file exists"
  
  if grep -q "GCS_BUCKET_NAME=" .env; then
    BUCKET_NAME=$(grep "GCS_BUCKET_NAME=" .env | cut -d'=' -f2)
    if [ -z "$BUCKET_NAME" ]; then
      echo "❌ GCS_BUCKET_NAME is empty in .env"
    else
      echo "✅ GCS_BUCKET_NAME=$BUCKET_NAME"
    fi
  else
    echo "❌ GCS_BUCKET_NAME not found in .env"
  fi
  
  if grep -q "GOOGLE_APPLICATION_CREDENTIALS=" .env; then
    CRED_PATH=$(grep "GOOGLE_APPLICATION_CREDENTIALS=" .env | cut -d'=' -f2)
    echo "✅ GOOGLE_APPLICATION_CREDENTIALS=$CRED_PATH"
  else
    echo "❌ GOOGLE_APPLICATION_CREDENTIALS not found in .env"
  fi
else
  echo "❌ .env file not found"
fi

echo ""

# Check credentials file
if [ -f /opt/agrione/gcs-credentials.json ]; then
  echo "✅ GCS credentials file exists: /opt/agrione/gcs-credentials.json"
  
  # Check if file is readable
  if [ -r /opt/agrione/gcs-credentials.json ]; then
    echo "✅ Credentials file is readable"
  else
    echo "❌ Credentials file is not readable (check permissions)"
  fi
else
  echo "❌ GCS credentials file not found: /opt/agrione/gcs-credentials.json"
fi

echo ""

# Check docker-compose.prod.yml
if [ -f docker-compose.prod.yml ]; then
  echo "✅ docker-compose.prod.yml exists"
  
  if grep -q "GCS_BUCKET_NAME:" docker-compose.prod.yml; then
    echo "✅ GCS_BUCKET_NAME found in docker-compose.prod.yml"
  else
    echo "❌ GCS_BUCKET_NAME not found in docker-compose.prod.yml"
  fi
  
  if grep -q "GOOGLE_APPLICATION_CREDENTIALS:" docker-compose.prod.yml; then
    echo "✅ GOOGLE_APPLICATION_CREDENTIALS found in docker-compose.prod.yml"
  else
    echo "❌ GOOGLE_APPLICATION_CREDENTIALS not found in docker-compose.prod.yml"
  fi
  
  if grep -q "gcs-credentials.json" docker-compose.prod.yml; then
    echo "✅ Volume mount for gcs-credentials.json found"
  else
    echo "❌ Volume mount for gcs-credentials.json not found"
  fi
else
  echo "❌ docker-compose.prod.yml not found"
fi

echo ""
echo "📋 Summary:"
echo "1. Pastikan .env file punya GCS_BUCKET_NAME dan GOOGLE_APPLICATION_CREDENTIALS"
echo "2. Pastikan file /opt/agrione/gcs-credentials.json ada dan readable"
echo "3. Restart backend: docker compose restart backend"

