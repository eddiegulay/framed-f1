#!/bin/bash

# framed-tv.sh
# Automation script to launch Framed-F1 Backend and Frontend

# Function to clean up background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Framed-F1..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) to run cleanup
trap cleanup SIGINT

echo "🎬 Starting Framed-F1..."

# 1. Start Backend
echo "📡 Launching Backend Server..."
npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"

# 2. Start Frontend
echo "📺 Launching Frontend Client..."
npm run client:dev > /dev/null 2>&1 &
FRONTEND_PID=$!
echo "   PID: $FRONTEND_PID"

# 3. Wait for servers to initialize
echo "⏳ Waiting for services to start..."
sleep 5

# 4. Open Browser
APP_URL="http://localhost:5173"
echo "🚀 Opening $APP_URL"

if command -v xdg-open > /dev/null; then
    xdg-open "$APP_URL"
elif command -v open > /dev/null; then
    open "$APP_URL"
else
    echo "⚠️  Could not detect browser opener. Please open $APP_URL manually."
fi

# 5. Keep script running to maintain background processes
echo ""
echo "✅ App is running!"
echo "👉 Press Ctrl+C to stop servers and exit."

wait
