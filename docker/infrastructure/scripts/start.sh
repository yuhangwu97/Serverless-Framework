#!/bin/bash

# Start script for the microservice architecture

echo "🚀 Starting Microservice Architecture..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create network if it doesn't exist
docker network create microservice-network 2>/dev/null || true

# Start databases first
echo "📦 Starting databases..."
docker-compose -f database/docker-compose.db.yml up -d

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 30

# Start Kong API Gateway
echo "🌉 Starting Kong API Gateway..."
docker-compose -f gateway/docker-compose.kong.yml up -d

# Wait for Kong to be ready
echo "⏳ Waiting for Kong to be ready..."
sleep 15

# Start all services
echo "🎯 Starting all microservices..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

echo "✅ All services started successfully!"
echo ""
echo "🌐 Access URLs:"
echo "  Frontend:        http://localhost:3000"
echo "  Kong Gateway:    http://localhost:8000"
echo "  Kong Admin:      http://localhost:8002"
echo "  Node.js Service: http://localhost:3001"
echo "  Golang Service:  http://localhost:8080"
echo "  Python Service:  http://localhost:8001"
echo ""
echo "🗄️  Database Management:"
echo "  MongoDB Express: http://localhost:8082 (admin/admin)"
echo "  phpMyAdmin:      http://localhost:8083"
echo "  Redis Commander: http://localhost:8081"
echo ""
echo "🔐 Sample login credentials:"
echo "  Username: admin"
echo "  Password: password123"
echo ""
echo "📊 To check service status:"
echo "  docker-compose ps"
echo ""
echo "🛑 To stop all services:"
echo "  ./scripts/stop.sh"