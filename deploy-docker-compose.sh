#!/bin/bash

# Docker Compose deployment script for Ubuntu server
# Run this on your Ubuntu server

set -e

echo "🐳 Deploying Mars Frontend with Docker Compose"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Installing Docker..."
    
    # Update package index
    sudo apt update
    
    # Install required packages
    sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    echo "✅ Docker installed successfully!"
    echo "⚠️  Please log out and log back in for group changes to take effect"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Installing Docker Compose..."
    sudo apt install -y docker-compose-plugin
fi

# Create deployment directory
DEPLOY_DIR="/opt/mars-frontend"
echo "📁 Creating deployment directory: $DEPLOY_DIR"
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR

# Copy files to deployment directory
echo "📤 Copying deployment files..."
cp docker-compose-frontend.yml $DEPLOY_DIR/
cp -r frontend $DEPLOY_DIR/

# Navigate to deployment directory
cd $DEPLOY_DIR

# Update nginx config with your ngrok URL
echo "⚙️  Please update the nginx configuration with your ngrok URL:"
echo "   Edit: $DEPLOY_DIR/frontend/nginx.conf"
echo "   Replace 'your-ngrok-url.ngrok.io' with your actual ngrok URL"
echo ""
read -p "Press Enter after updating the nginx config..."

# Build and start services
echo "🔨 Building Docker image..."
docker compose -f docker-compose-frontend.yml build

echo "🚀 Starting services..."
docker compose -f docker-compose-frontend.yml up -d

# Check if services are running
echo "📊 Checking service status..."
docker compose -f docker-compose-frontend.yml ps

echo "✅ Deployment complete!"
echo "🌐 Your site should be available at: http://mars-demo.trazor.cloud"
echo ""
echo "📝 Next steps:"
echo "1. Set up SSL certificate with Let's Encrypt"
echo "2. Configure your domain DNS to point to this server"
echo "3. Test the deployment"
