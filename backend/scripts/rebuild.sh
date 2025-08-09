#!/bin/bash

# Rebuild and restart the Crop Recommendation AI API server
echo "🔨 Rebuilding and restarting Crop Recommendation AI API server..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed or not in PATH"
    exit 1
fi

# Stop all services
echo "🛑 Stopping services..."
docker-compose down

# Remove old images
echo "🗑️  Removing old images..."
docker-compose down --rmi all

# Rebuild and start all services
echo "🔨 Rebuilding services..."
docker-compose up -d --build

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 15

# Check if the web service is running
if docker-compose ps web | grep -q "Up"; then
    echo "✅ Server rebuilt and started successfully!"
    echo "🌐 API available at: http://localhost:5000"
    echo "📊 Health check: http://localhost:5000/api/health"
else
    echo "❌ Error: Web service failed to start"
    echo "📋 Check logs: ./scripts/logs.sh"
    exit 1
fi 