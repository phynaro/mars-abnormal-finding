#!/bin/bash

# Script to start backend with Docker
# Run this on your local machine

set -e

echo "🐳 Starting Mars Backend with Docker"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Please copy env.example to .env and fill in your values:"
    echo "   cp env.example .env"
    echo "   nano .env"
    exit 1
fi

# Load environment variables
source .env

# Build and start Docker container
echo "🔨 Building Docker image..."
docker-compose build

echo "🚀 Starting backend container..."
docker-compose up -d

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
echo "✅ Backend started successfully!"
echo "🌐 Backend is running on: http://localhost:3001"
echo "📝 You can now access the API at: http://localhost:3001/api"
echo ""
echo "📋 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop backend: docker-compose down"
echo "   - Restart backend: docker-compose restart"
