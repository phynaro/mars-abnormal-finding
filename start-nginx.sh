#!/bin/bash

echo "🚀 Starting Nginx for local development..."
echo "Frontend: http://localhost (proxies to localhost:3000)"
echo "Backend API: http://localhost/api (proxies to localhost:3001)"
echo ""
echo "Make sure your services are running:"
echo "  Frontend: cd frontend && npm run dev"
echo "  Backend: cd backend && npm run dev"
echo ""
echo "Press Ctrl+C to stop"

docker-compose -f docker-compose.nginx-local.yml up
