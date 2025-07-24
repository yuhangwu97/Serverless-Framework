#!/bin/bash

# Development script for running services locally

echo "🚀 Starting Development Environment..."

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v go >/dev/null 2>&1 || { echo "❌ Go is required but not installed."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python3 is required but not installed."; exit 1; }

# Start only databases
echo "📦 Starting databases..."
docker-compose -f infrastructure/databases/docker-compose.db.yml up -d

echo "⏳ Waiting for databases to be ready..."
sleep 30

# Create .env files if they don't exist
echo "🔧 Setting up environment files..."

# Node.js env
if [ ! -f services/middleware-service/.env ]; then
    cp services/middleware-service/.env.example services/middleware-service/.env
    echo "✅ Created Node.js middleware service .env file"
fi

# Golang env
if [ ! -f services/business-service/.env ]; then
    cp services/business-service/.env.example services/business-service/.env
    echo "✅ Created Golang business service .env file"
fi

# Python env
if [ ! -f services/analytics-service/.env ]; then
    cp services/analytics-service/.env.example services/analytics-service/.env
    echo "✅ Created Python analytics service .env file"
fi

echo ""
echo "🛠️  Development Setup Complete!"
echo ""
echo "📝 To start services manually:"
echo ""
echo "  Web Client (React):"
echo "    cd apps/web-client && npm start"
echo ""
echo "  Middleware Service (Node.js 中台):"
echo "    cd services/middleware-service && npm run dev"
echo ""
echo "  Business Service (Golang 后台):"
echo "    cd services/business-service && go run main.go"
echo ""
echo "  Analytics Service (Python 辅助后台):"
echo "    cd services/analytics-service && python -m app.main"
echo ""
echo "🌐 Development URLs:"
echo "  Web Client:           http://localhost:3000"
echo "  Middleware Service:   http://localhost:3001"
echo "  Business Service:     http://localhost:8080"
echo "  Analytics Service:    http://localhost:8001"
echo "  Kong Gateway:         http://localhost:8000"
echo ""
echo "🗄️  Database Management:"
echo "  MongoDB Express: http://localhost:8082 (admin/admin)"
echo "  phpMyAdmin:      http://localhost:8083"
echo "  Redis Commander: http://localhost:8081"