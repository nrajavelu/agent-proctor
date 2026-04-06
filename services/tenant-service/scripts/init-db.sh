#!/bin/bash
# Database initialization script for Phase 5 Tenant Service

set -e  # Exit on error

echo "🚀 Initializing Phase 5 Tenant Service Database..."

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_NAME=${DB_NAME:-agent_proctor_tenants}

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; do
  sleep 1
done
echo "✅ PostgreSQL is ready!"

# Create database if it doesn't exist
echo "📦 Creating database '$DB_NAME' if not exists..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists"

# Apply database schema
echo "🏗️  Applying database schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f src/database/schema.sql

echo "🌱 Seeding initial data..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f src/database/seed.sql

echo "🔐 Setting up Row Level Security policies..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f src/database/rls-policies.sql

echo "✅ Database initialization complete!"
echo ""
echo "📋 Summary:"
echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   User: $DB_USER"
echo ""
echo "📖 Next steps:"
echo "   1. Copy .env.dev to .env: cp .env.dev .env"
echo "   2. Start the service: pnpm dev"
echo "   3. Test health endpoint: curl http://localhost:3000/health"