#!/bin/bash

# Script to update .env file for Cloudflare tunnel configuration
# This script will backup your current .env and update it with HTTPS URLs

echo "🔒 Updating .env file for Cloudflare tunnel configuration..."

# Backup current .env file
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up current .env file"
fi

# Update CORS_ORIGIN to HTTPS
if grep -q "CORS_ORIGIN=http://mars-demo.trazor.cloud" .env; then
    sed -i '' 's|CORS_ORIGIN=http://mars-demo.trazor.cloud|CORS_ORIGIN=https://mars-demo.trazor.cloud|g' .env
    echo "✅ Updated CORS_ORIGIN to HTTPS"
fi

# Update FRONTEND_URL to HTTPS
if grep -q "FRONTEND_URL=http://mars-demo.trazor.cloud" .env; then
    sed -i '' 's|FRONTEND_URL=http://mars-demo.trazor.cloud|FRONTEND_URL=https://mars-demo.trazor.cloud|g' .env
    echo "✅ Updated FRONTEND_URL to HTTPS"
fi

# Remove ngrok-related configurations
if grep -q "NGROK_AUTHTOKEN" .env; then
    sed -i '' '/NGROK_AUTHTOKEN/d' .env
    echo "✅ Removed NGROK_AUTHTOKEN (no longer needed with Cloudflare tunnel)"
fi

if grep -q "BACKEND_URL.*ngrok" .env; then
    sed -i '' '/BACKEND_URL.*ngrok/d' .env
    echo "✅ Removed ngrok BACKEND_URL (no longer needed with Cloudflare tunnel)"
fi

echo ""
echo "🎉 Environment configuration updated!"
echo "📝 Your .env file now uses HTTPS URLs for Cloudflare tunnel"
echo "💾 Backup created: .env.backup.$(date +%Y%m%d_%H%M%S)"
echo ""
echo "🔄 To apply changes, restart your backend:"
echo "   docker-compose down && docker-compose up -d"
