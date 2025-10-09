#!/bin/bash

# Build script for AMD64 servers (Intel/AMD processors)
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Building images for AMD64 servers...${NC}"
echo -e "${YELLOW}This will build images compatible with Intel/AMD processors.${NC}"
echo ""

# Call the main build script with AMD64 platform
./build-images.sh latest "" linux/amd64

echo -e "${GREEN}AMD64 images built successfully!${NC}"
echo -e "${GREEN}These images will work on Intel/AMD servers.${NC}"
