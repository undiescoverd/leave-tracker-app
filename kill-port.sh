#!/bin/bash
# Kill any process using port 3000

PORT=3000
echo "🔍 Checking for processes on port $PORT..."

# Find and kill processes on port 3000
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "⚠️  Found process on port $PORT"
    lsof -ti:$PORT | xargs kill -9
    echo "✅ Killed process on port $PORT"
else
    echo "✅ Port $PORT is already free"
fi

# Also kill any node processes that might be hanging
echo "🔍 Checking for hanging Node.js processes..."
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

echo "✅ Port $PORT is now available"
