#!/bin/bash

# Clean up Docker resources for the Crop Recommendation AI API server
echo "🧹 Cleaning up Docker resources..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed or not in PATH"
    exit 1
fi

# Stop and remove containers, networks, and images
echo "🛑 Stopping and removing containers..."
docker-compose down --rmi all --volumes --remove-orphans

# Remove any dangling images
echo "🗑️  Removing dangling images..."
docker image prune -f

# Remove any unused volumes
echo "🗑️  Removing unused volumes..."
docker volume prune -f

# Remove any unused networks
echo "🗑️  Removing unused networks..."
docker network prune -f

echo "✅ Cleanup completed successfully!"
echo "💡 To start fresh: ./scripts/start.sh" 