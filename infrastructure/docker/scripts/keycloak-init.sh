#!/bin/bash

# Ayan.ai Keycloak Initialization Script
# Phase 1 Infrastructure Setup

set -e

KC_HEALTH_ENABLED=true
KC_METRICS_ENABLED=true

echo "🚀 Starting Ayan.ai Keycloak initialization..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until nc -z ayan-postgres 5432; do
  echo "Database is unavailable - sleeping..."
  sleep 1
done
echo "✅ Database connection established"

# Configure Keycloak database
export KC_DB=postgres
export KC_DB_URL="jdbc:postgresql://ayan-postgres:5432/ayan_db"
export KC_DB_USERNAME=keycloak_user
export KC_DB_PASSWORD=keycloak_pass_dev
export KC_DB_SCHEMA=keycloak

# Import realm configuration if it doesn't exist
echo "📋 Checking for existing realm configuration..."
if [ -f "/opt/keycloak/data/import/realm-export.json" ]; then
    echo "🔧 Importing Ayan.ai realm configuration..."
    /opt/keycloak/bin/kc.sh import --file /opt/keycloak/data/import/realm-export.json --override true
else
    echo "⚠️  No realm configuration found at /opt/keycloak/data/import/realm-export.json"
fi

# Build optimized Keycloak
echo "🔨 Building optimized Keycloak configuration..."
/opt/keycloak/bin/kc.sh build --db=postgres

# Start Keycloak
echo "🌟 Starting Ayan.ai Keycloak server..."
exec /opt/keycloak/bin/kc.sh start \
  --db=postgres \
  --db-url="jdbc:postgresql://ayan-postgres:5432/ayan_db" \
  --db-username=keycloak_user \
  --db-password=keycloak_pass_dev \
  --db-schema=keycloak \
  --hostname=auth.ayan.nunmai.local \
  --hostname-admin=auth.ayan.nunmai.local \
  --http-enabled=true \
  --http-port=8080 \
  --proxy=edge \
  --health-enabled=true \
  --metrics-enabled=true