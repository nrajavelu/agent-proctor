#!/bin/bash

echo "🚀 Starting Real-Time Agentic AI Proctoring Platform..."
echo "=================================================================================="

# Function to start services in background
start_service() {
    local name=$1
    local command=$2
    local port=$3
    
    echo "📡 Starting $name on port $port..."
    eval "$command" &
    sleep 2
    
    if lsof -i :$port > /dev/null 2>&1; then
        echo "✅ $name running successfully on port $port"
    else
        echo "❌ Failed to start $name on port $port"
    fi
}

# Kill existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "session-manager-server.js" 2>/dev/null
pkill -f "next dev.*3002" 2>/dev/null  
pkill -f "next dev.*3000" 2>/dev/null
sleep 2

# Start Session Manager (WebSocket Server)
start_service "Session Manager" "cd /Users/rajavelu/Documents/Macher\ Repo/agent-proctor && node tools/session-manager-server.js" "8080"

# Start Admin Dashboard
start_service "Admin Dashboard" "cd /Users/rajavelu/Documents/Macher\ Repo/agent-proctor && pnpm run dev --filter @agentic-proctor/web" "3002"

# Start Demo Quiz App  
start_service "Demo Quiz App" "cd /Users/rajavelu/Documents/Macher\ Repo/agent-proctor && pnpm run dev --filter @agentic-proctor/demo-quiz" "3000"

echo ""
echo "🎯 Real-Time Agentic AI Proctoring Platform Started!"
echo "=================================================================================="
echo ""
echo "🔗 Admin Dashboard:     http://localhost:3002/admin/login"
echo "🔗 Candidate Quiz App:  http://localhost:3000"
echo "🔗 WebSocket Server:    ws://localhost:8080"
echo ""
echo "📋 Quick Test Instructions:"
echo "1. Open Admin Dashboard → Login as Super Admin or Tenant Admin"  
echo "2. Open Quiz App → Login as CS Student (Demo) or manual login"
echo "3. Start exam → Watch real-time session appear in admin"
echo "4. Trigger violations → See instant updates and scoring"
echo ""
echo "📚 Full Demo Guide: /REAL-TIME-DEMO-GUIDE.md"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for interrupt signal
trap 'echo ""; echo "🛑 Stopping all services..."; pkill -f "session-manager-server.js" 2>/dev/null; pkill -f "next dev.*3002" 2>/dev/null; pkill -f "next dev.*3000" 2>/dev/null; exit 0' INT

while true; do
    sleep 1
done