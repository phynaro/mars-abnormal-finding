#!/bin/bash

echo "🛑 Stopping Nginx..."

docker-compose -f docker-compose.nginx-local.yml down

echo "✅ Nginx stopped"
