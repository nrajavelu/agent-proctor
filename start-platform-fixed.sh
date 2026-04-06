#!/bin/bash

echo "🔧 Applying Violation Timing Fix for Real-Time Proctoring Platform..."
echo "=================================================================================="

# Stop existing services
echo "🧹 Stopping existing services..."
pkill -f "session-manager-server.js" 2>/dev/null
pkill -f "next dev.*3002" 2>/dev/null  
pkill -f "next dev.*3000" 2>/dev/null
pkill -f "next dev.*3001" 2>/dev/null
sleep 3

echo "✅ Services stopped"
echo ""
echo "🔧 VIOLATION TIMING FIXES APPLIED:"
echo "   ✓ Added 3-second warmup period before violations start"
echo "   ✓ Added 2-second video system initialization delay" 
echo "   ✓ Video-dependent violations now wait for camera readiness"
echo "   ✓ Separated behavioral vs video violation triggers"
echo "   ✓ Added video system status indicators"
echo "   ✓ Reduced violation simulation frequency"
echo ""

# Function to start services
start_service() {
    local name=$1
    local command=$2
    local port=$3
    
    echo "📡 Starting $name on port $port..."
    eval "$command" &
    sleep 2
    
    if lsof -i :$port > /dev/null 2>&1; then
        echo "✅ $name running successfully"
    else
        echo "❌ Failed to start $name"
    fi
}

# Start services
cd /Users/rajavelu/Documents/Macher\ Repo/agent-proctor

start_service "Session Manager (Fixed)" "node tools/session-manager-server.js" "8080"
start_service "Admin Dashboard" "pnpm run dev --filter @agentic-proctor/web" "3002"
start_service "Demo Quiz (Fixed Timing)" "pnpm run dev --filter @agentic-proctor/demo-quiz" "3000"

echo ""
echo "🎯 Real-Time Platform with Fixed Violation Timing Ready!"
echo "=================================================================================="
echo ""
echo "🔗 Admin Dashboard:     http://localhost:3002/admin/login"
echo "🔗 Candidate Quiz App:  http://localhost:3000"
echo ""
echo "🚨 VIOLATION TIMING IMPROVEMENTS:"
echo "   • Video violations will NOT trigger during first 5 seconds"
echo "   • Camera readiness check before face/video violations"
echo "   • Clear status indicators for video system state"
echo "   • Behavioral violations (tab/key) work immediately" 
echo "   • Test buttons disabled for video violations during warmup"
echo ""
echo "📋 Testing Instructions:"
echo "1. Start candidate exam - notice 'Video system initializing...' status"
echo "2. Initially only behavioral violations will work (tab/key)"
echo "3. After 5 seconds, video violations become available"
echo "4. Status shows 'Video Ready' when all systems active"
echo ""
echo "Press Ctrl+C to stop all services..."

trap 'echo ""; echo "🛑 Stopping all services..."; pkill -f "session-manager-server.js" 2>/dev/null; pkill -f "next dev.*3002" 2>/dev/null; pkill -f "next dev.*3000" 2>/dev/null; exit 0' INT

while true; do
    sleep 1
done