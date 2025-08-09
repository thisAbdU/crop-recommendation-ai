#!/bin/bash

# View logs from the Crop Recommendation AI API server
echo "📋 Viewing server logs..."

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed or not in PATH"
    exit 1
fi

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Error: No services are running"
    echo "💡 Start the server first: ./scripts/start.sh"
    exit 1
fi

# Show logs for all services
echo "📊 Showing logs for all services..."
echo "Press Ctrl+C to exit"
echo ""

docker-compose logs -f 