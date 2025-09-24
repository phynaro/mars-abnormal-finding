#!/bin/bash

# Efficient upload script - only copies necessary files
# Run this on your local machine

set -e

echo "📤 Uploading Mars Frontend files efficiently..."

# Check if server details are provided
if [ -z "$1" ]; then
    echo "Usage: $0 user@server"
    echo "Example: $0 ubuntu@your-server.com"
    exit 1
fi

SERVER=$1

# Create temporary directory with only necessary files
TEMP_DIR="/tmp/mars-frontend-upload"
echo "📁 Creating temporary directory: $TEMP_DIR"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR

# Copy only necessary files (excluding node_modules, dist, etc.)
echo "📋 Copying source files..."
cp -r frontend/src $TEMP_DIR/
cp frontend/package.json $TEMP_DIR/
cp frontend/package-lock.json $TEMP_DIR/
cp frontend/tsconfig.json $TEMP_DIR/
cp frontend/tsconfig.app.json $TEMP_DIR/
cp frontend/tsconfig.node.json $TEMP_DIR/
cp frontend/vite.config.ts $TEMP_DIR/
cp frontend/tailwind.config.js $TEMP_DIR/
cp frontend/postcss.config.js $TEMP_DIR/
cp frontend/index.html $TEMP_DIR/
cp frontend/.dockerignore $TEMP_DIR/
cp frontend/Dockerfile $TEMP_DIR/
cp frontend/nginx.conf $TEMP_DIR/

# Copy public assets
if [ -d "frontend/public" ]; then
    cp -r frontend/public $TEMP_DIR/
fi

# Copy Docker Compose files
cp docker-compose-frontend.yml $TEMP_DIR/
cp deploy-docker-compose.sh $TEMP_DIR/

echo "📊 Files to upload:"
du -sh $TEMP_DIR/*
echo "Total size: $(du -sh $TEMP_DIR | cut -f1)"

# Upload to server
echo "🚀 Uploading to server..."
scp -r $TEMP_DIR/* $SERVER:/tmp/mars-frontend/

# Clean up
echo "🧹 Cleaning up..."
rm -rf $TEMP_DIR

echo "✅ Upload complete!"
echo "📝 Next steps on server:"
echo "   cd /tmp/mars-frontend"
echo "   chmod +x deploy-docker-compose.sh"
echo "   ./deploy-docker-compose.sh"
