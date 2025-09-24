#!/bin/bash

# Deployment script for Ubuntu server
# Run this on your Ubuntu server to deploy the frontend

set -e

# Configuration
DOMAIN="mars-demo.trazor.cloud"
WEB_ROOT="/var/www/$DOMAIN"
NGINX_SITES="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

echo "🚀 Deploying Mars Demo Frontend to $DOMAIN"

# Create web directory
echo "📁 Creating web directory..."
sudo mkdir -p $WEB_ROOT
sudo chown -R $USER:$USER $WEB_ROOT

# Build frontend locally (you'll need to run this on your local machine)
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build

# Copy built files to server (you'll need to scp or rsync this)
echo "📤 Copying built files..."
# scp -r dist/* user@your-server:$WEB_ROOT/
# Or use rsync:
# rsync -avz --delete dist/ user@your-server:$WEB_ROOT/

# On the server, copy nginx configuration
echo "⚙️ Setting up nginx configuration..."
sudo cp nginx-mars-demo.conf $NGINX_SITES/$DOMAIN

# Enable the site
sudo ln -sf $NGINX_SITES/$DOMAIN $NGINX_ENABLED/

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo "🌐 Your site should be available at: https://$DOMAIN"
echo ""
echo "📝 Next steps:"
echo "1. Update the ngrok URL in nginx configuration"
echo "2. Start your backend with Docker and ngrok"
echo "3. Test the deployment"
