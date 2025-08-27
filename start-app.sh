#!/bin/bash
echo "🚀 Starting TDH Leave Tracker..."
echo ""

# Kill port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
echo "✅ Port 3000 cleared"

# Check environment
if [ ! -f ".env" ]; then
    echo "❌ No .env file found!"
    exit 1
fi

echo "✅ Environment file found"

# Start the app
echo ""
echo "Starting server on http://localhost:3000"
echo "----------------------------------------"
npm run dev
