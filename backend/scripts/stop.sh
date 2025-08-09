#!/bin/bash

# Stop the Crop Recommendation AI API server
echo "🛑 Stopping Crop Recommendation AI API server..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed or not in PATH"
    exit 1
fi

# Stop all services
docker-compose down

echo "✅ Server stopped successfully!" 