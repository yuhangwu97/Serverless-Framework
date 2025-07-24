#!/bin/bash

# Stop script for the microservice architecture

echo "🛑 Stopping Microservice Architecture..."

# Stop all services
echo "📦 Stopping all services..."
docker-compose down

# Stop Kong
echo "🌉 Stopping Kong API Gateway..."
docker-compose -f gateway/docker-compose.kong.yml down

# Stop databases
echo "🗄️  Stopping databases..."
docker-compose -f database/docker-compose.db.yml down

echo "✅ All services stopped successfully!"
echo ""
echo "🧹 To remove all data (WARNING: This will delete all data):"
echo "  docker-compose down -v"
echo "  docker-compose -f gateway/docker-compose.kong.yml down -v"
echo "  docker-compose -f database/docker-compose.db.yml down -v"