#!/bin/bash

# Build script for portable Docker images
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_IMAGE_NAME="mars-backend"
FRONTEND_IMAGE_NAME="mars-frontend"
NGINX_IMAGE_NAME="mars-nginx"
VERSION=${1:-latest}
REGISTRY=${2:-""}
PLATFORM=${3:-"linux/amd64"}  # Default to AMD64 for server deployment

# Build backend image
echo -e "${YELLOW}Building backend image for ${PLATFORM}...${NC}"
docker build --platform ${PLATFORM} -f backend/Dockerfile.production -t ${REGISTRY}${BACKEND_IMAGE_NAME}:${VERSION} ./backend

# Build frontend image
echo -e "${YELLOW}Building frontend image for ${PLATFORM}...${NC}"
docker build --platform ${PLATFORM} \
    --build-arg NODE_ENV=production \
    --build-arg VITE_API_URL=/api \
    --build-arg VITE_LIFF_ID=${VITE_LIFF_ID:-your-liff-id-here} \
    -f frontend/Dockerfile.production \
    -t ${REGISTRY}${FRONTEND_IMAGE_NAME}:${VERSION} ./frontend

# Build nginx image with configuration
echo -e "${YELLOW}Building nginx image for ${PLATFORM}...${NC}"
docker build --platform ${PLATFORM} -f Dockerfile.nginx -t ${REGISTRY}${NGINX_IMAGE_NAME}:${VERSION} .

# Create image archive
echo -e "${YELLOW}Creating image archive...${NC}"
docker save ${REGISTRY}${BACKEND_IMAGE_NAME}:${VERSION} ${REGISTRY}${FRONTEND_IMAGE_NAME}:${VERSION} ${REGISTRY}${NGINX_IMAGE_NAME}:${VERSION} | gzip > mars-images-${VERSION}.tar.gz

echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${GREEN}Images:${NC}"
echo -e "  - ${REGISTRY}${BACKEND_IMAGE_NAME}:${VERSION}"
echo -e "  - ${REGISTRY}${FRONTEND_IMAGE_NAME}:${VERSION}"
echo -e "  - ${REGISTRY}${NGINX_IMAGE_NAME}:${VERSION}"
echo -e "${GREEN}Archive: mars-images-${VERSION}.tar.gz${NC}"
echo ""
echo -e "${YELLOW}To deploy on target server:${NC}"
echo -e "1. Copy mars-images-${VERSION}.tar.gz to target server"
echo -e "2. Run: docker load < mars-images-${VERSION}.tar.gz"
echo -e "3. Copy deployment files and run: docker-compose -f docker-compose.deploy.yml up -d"
echo ""
echo -e "${YELLOW}Usage examples:${NC}"
echo -e "  Build for AMD64 servers: ./build-images.sh latest \"\" linux/amd64"
echo -e "  Build for ARM64 servers: ./build-images.sh latest \"\" linux/arm64"
echo -e "  Build for both platforms: ./build-images.sh latest \"\" linux/amd64,linux/arm64"
