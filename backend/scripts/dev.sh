#!/bin/bash

# Development script for Crop Recommendation AI API server
echo "🌱 Crop Recommendation AI API - Development Menu"
echo "================================================"
echo ""

# Function to show menu
show_menu() {
    echo "Select an option:"
    echo ""
    echo "1) 🚀 Start server"
    echo "2) 🛑 Stop server"
    echo "3) 🔄 Restart server"
    echo "4) 🔨 Rebuild server"
    echo "5) 📊 Check status"
    echo "6) 📋 View logs"
    echo "7) 🧹 Cleanup (remove all containers/images)"
    echo "8) ❓ Show help"
    echo "9) 🚪 Exit"
    echo ""
    echo -n "Enter your choice (1-9): "
}

# Function to handle user input
handle_choice() {
    case $1 in
        1)
            echo ""
            echo "🚀 Starting server..."
            ./scripts/start.sh
            ;;
        2)
            echo ""
            echo "🛑 Stopping server..."
            ./scripts/stop.sh
            ;;
        3)
            echo ""
            echo "🔄 Restarting server..."
            ./scripts/restart.sh
            ;;
        4)
            echo ""
            echo "🔨 Rebuilding server..."
            ./scripts/rebuild.sh
            ;;
        5)
            echo ""
            echo "📊 Checking status..."
            ./scripts/status.sh
            ;;
        6)
            echo ""
            echo "📋 Viewing logs..."
            ./scripts/logs.sh
            ;;
        7)
            echo ""
            echo "🧹 Cleaning up Docker resources..."
            echo "⚠️  This will remove all containers, images, and volumes!"
            echo -n "Are you sure? (y/N): "
            read -r confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                ./scripts/cleanup.sh
            else
                echo "Cleanup cancelled."
            fi
            ;;
        8)
            echo ""
            ./scripts/help.sh
            ;;
        9)
            echo ""
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo ""
            echo "❌ Invalid option. Please try again."
            ;;
    esac
}

# Main loop
while true; do
    show_menu
    read -r choice
    handle_choice "$choice"
    
    echo ""
    echo "Press Enter to continue..."
    read -r
    echo ""
done 