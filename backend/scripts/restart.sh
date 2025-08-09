#!/bin/bash

# Restart the Crop Recommendation AI API server
echo "🔄 Restarting Crop Recommendation AI API server..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed or not in PATH"
    exit 1
fi

# Stop all services
echo "🛑 Stopping services..."
docker-compose down

# Start all services
echo "🚀 Starting services..."
docker-compose up -d

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if the web service is running
if docker-compose ps web | grep -q "Up"; then
    echo "✅ Server restarted successfully!"
    echo "🌐 API available at: http://localhost:5000"
    echo "📊 Health check: http://localhost:5000/api/health"
else
    echo "❌ Error: Web service failed to start"
    echo "📋 Check logs: ./scripts/logs.sh"
    exit 1
fi 