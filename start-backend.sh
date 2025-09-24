#!/bin/bash

# Script to start backend with Docker and ngrok manually
# Run this on your local machine

set -e

echo "🐳 Starting Mars Backend with Docker and ngrok"

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

# Check if ngrok authtoken is set
if [ -z "$NGROK_AUTHTOKEN" ]; then
    echo "❌ NGROK_AUTHTOKEN not set in .env file!"
    echo "📝 Please get your ngrok authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken"
    exit 1
fi

# Build and start Docker container
echo "🔨 Building Docker image..."
docker-compose build

echo "🚀 Starting backend container..."
docker-compose up -d

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Start ngrok manually
echo "🌐 Starting ngrok tunnel..."
echo "📝 Note: Keep this terminal open to maintain the ngrok tunnel"
echo "📝 Copy the ngrok URL and update your nginx configuration"
echo ""

# Authenticate ngrok
ngrok config add-authtoken $NGROK_AUTHTOKEN

# Start ngrok tunnel
ngrok http 3001
