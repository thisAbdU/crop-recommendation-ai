#!/bin/bash

# Help script for Crop Recommendation AI API server management
echo "🌱 Crop Recommendation AI API - Server Management Scripts"
echo "=========================================================="
echo ""

echo "📋 Available Commands:"
echo ""

echo "🚀 ./scripts/start.sh"
echo "   Start the server using docker-compose"
echo "   - Starts all services (web, database, redis, celery)"
echo "   - Checks if services are running properly"
echo ""

echo "🛑 ./scripts/stop.sh"
echo "   Stop the server and all services"
echo "   - Stops all containers"
echo "   - Preserves data and images"
echo ""

echo "🔄 ./scripts/restart.sh"
echo "   Restart the server"
echo "   - Stops all services"
echo "   - Starts them again"
echo "   - Useful for applying configuration changes"
echo ""

echo "🔨 ./scripts/rebuild.sh"
echo "   Rebuild and restart the server"
echo "   - Removes old images"
echo "   - Rebuilds from source"
echo "   - Use after code changes"
echo ""

echo "📊 ./scripts/status.sh"
echo "   Check server status"
echo "   - Shows running services"
echo "   - Tests API endpoints"
echo "   - Provides quick links"
echo ""

echo "📋 ./scripts/logs.sh"
echo "   View server logs"
echo "   - Shows logs from all services"
echo "   - Follows logs in real-time"
echo "   - Press Ctrl+C to exit"
echo ""

echo "🧹 ./scripts/cleanup.sh"
echo "   Clean up Docker resources"
echo "   - Removes containers, images, volumes"
echo "   - Frees up disk space"
echo "   - Use when you want a fresh start"
echo ""

echo "❓ ./scripts/help.sh"
echo "   Show this help message"
echo ""

echo "🔗 Quick Links:"
echo "   API Root: http://localhost:5000"
echo "   Health Check: http://localhost:5000/api/health"
echo "   Swagger UI: http://localhost:5000/swagger-ui"
echo ""

echo "💡 Tips:"
echo "   - Always use these scripts from the project root directory"
echo "   - Check status before starting to see what's running"
echo "   - Use rebuild.sh after making code changes"
echo "   - Use cleanup.sh if you encounter issues"
echo "" 