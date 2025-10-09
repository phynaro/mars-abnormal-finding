#!/bin/bash

# Deployment script for portable Docker images
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VERSION=${1:-latest}
IMAGE_ARCHIVE="mars-images-${VERSION}.tar.gz"

echo -e "${YELLOW}Starting deployment...${NC}"

# Check if image archive exists
if [ ! -f "$IMAGE_ARCHIVE" ]; then
    echo -e "${RED}Error: Image archive $IMAGE_ARCHIVE not found!${NC}"
    echo -e "${YELLOW}Please run build-images.sh first to create the images.${NC}"
    exit 1
fi

# Load Docker images
echo -e "${YELLOW}Loading Docker images...${NC}"
docker load < "$IMAGE_ARCHIVE"

# Create environment files if they don't exist
echo -e "${YELLOW}Setting up environment files...${NC}"

# Backend environment
if [ ! -f "backend/.env.production" ]; then
    echo -e "${YELLOW}Creating backend/.env.production from template...${NC}"
    cp backend/env.template backend/.env.production
    echo -e "${RED}Please edit backend/.env.production with your actual configuration!${NC}"
fi

# Frontend environment
if [ ! -f "frontend/.env.production" ]; then
    echo -e "${YELLOW}Creating frontend/.env.production from template...${NC}"
    cp frontend/env.template frontend/.env.production
    echo -e "${RED}Please edit frontend/.env.production with your actual configuration!${NC}"
fi

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker compose -f docker-compose.deploy.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 30

# Check service status
echo -e "${YELLOW}Checking service status...${NC}"
docker compose -f docker-compose.deploy.yml ps

# Test endpoints
echo -e "${YELLOW}Testing endpoints...${NC}"
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

if curl -f http://localhost/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend health check passed${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
fi

echo -e "${GREEN}Deployment completed!${NC}"
echo -e "${GREEN}Application is available at: http://localhost${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  View logs: docker-compose -f docker-compose.deploy.yml logs -f"
echo -e "  Stop services: docker-compose -f docker-compose.deploy.yml down"
echo -e "  Restart services: docker-compose -f docker-compose.deploy.yml restart"
