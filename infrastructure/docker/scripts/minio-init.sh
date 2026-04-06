#!/bin/sh

# Ayan.ai MinIO Initialization Script
# Phase 1 Infrastructure Setup

set -e

echo "🚀 Starting Ayan.ai MinIO bucket initialization..."

# Wait for MinIO to be ready (simple retry mechanism)
echo "⏳ Waiting for MinIO server to be ready..."
sleep 10

# Configure MinIO client  
echo "🔧 Configuring MinIO client..."
mc alias set ayan http://ayan-storage:9000 ayan_admin_user ayan_admin_pass_dev

# Create required buckets
echo "📦 Creating Ayan.ai storage buckets..."

# Recordings bucket for exam session recordings
echo "Creating recordings bucket..."
mc mb ayan/recordings --ignore-existing
mc anonymous set download ayan/recordings

# Organization assets bucket (logos, themes, etc.)
echo "Creating org-assets bucket..."  
mc mb ayan/org-assets --ignore-existing
mc anonymous set download ayan/org-assets

# System assets bucket (platform assets, themes, etc.)
echo "Creating system-assets bucket..."
mc mb ayan/system-assets --ignore-existing
mc anonymous set download ayan/system-assets

# Exports bucket for data exports and reports
echo "Creating exports bucket..."
mc mb ayan/exports --ignore-existing
mc anonymous set none ayan/exports

# Backups bucket for database and configuration backups
echo "Creating backups bucket..."
mc mb ayan/backups --ignore-existing 
mc anonymous set none ayan/backups

echo "✅ MinIO initialization completed successfully!"

echo ""
echo "📊 Ayan.ai MinIO Bucket Summary:"
echo "================================"
mc ls ayan/
echo ""
echo "🎉 Ayan.ai MinIO setup complete!"