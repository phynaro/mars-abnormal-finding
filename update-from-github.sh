#!/bin/bash

# Quick update script for GitHub-based deployment
# Run this on your Ubuntu server to update the deployment

set -e

DEPLOY_DIR="/opt/mars-frontend"
BRANCH="main"

echo "🔄 Updating Mars Frontend from GitHub..."

cd $DEPLOY_DIR

# Pull latest changes
echo "📥 Pulling latest changes..."
git fetch origin
git reset --hard origin/$BRANCH

# Rebuild and restart services
echo "🔨 Rebuilding Docker image..."
docker compose -f docker-compose-frontend.yml build

echo "🚀 Restarting services..."
docker compose -f docker-compose-frontend.yml up -d

echo "✅ Update complete!"
echo "📊 Service status:"
docker compose -f docker-compose-frontend.yml ps
