#!/bin/bash

# Check status of the Crop Recommendation AI API server
echo "📊 Server Status Check"
echo "======================"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed or not in PATH"
    exit 1
fi

# Show service status
echo "🐳 Docker Services:"
docker-compose ps

echo ""
echo "🌐 API Health Check:"

# Check if web service is running
if docker-compose ps web | grep -q "Up"; then
    # Try to get health status
    if command -v curl &> /dev/null; then
        echo "📡 Testing API endpoints..."
        
        # Test root endpoint
        if curl -s http://localhost:5000/ > /dev/null 2>&1; then
            echo "✅ Root endpoint (/): OK"
        else
            echo "❌ Root endpoint (/): FAILED"
        fi
        
        # Test health endpoint
        if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
            echo "✅ Health endpoint (/api/health): OK"
        else
            echo "❌ Health endpoint (/api/health): FAILED"
        fi
        
        echo ""
        echo "🔗 Quick Links:"
        echo "   API Root: http://localhost:5000"
        echo "   Health Check: http://localhost:5000/api/health"
    else
        echo "⚠️  curl not available - cannot test endpoints"
        echo "🌐 API should be available at: http://localhost:5000"
    fi
else
    echo "❌ Web service is not running"
    echo "💡 Start the server: ./scripts/start.sh"
fi 