#!/bin/bash

# ============================================
# TDH Leave Tracker - Clean Startup Script
# Prevents auto-opening and provides clear instructions
# ============================================

echo "🚀 TDH Leave Tracker - Clean Startup"
echo "==================================="
echo ""

# Kill any existing processes
echo "🛑 Stopping any existing servers..."
pkill -f "npm run dev" 2>/dev/null
pkill -f "next dev" 2>/dev/null

# Wait a moment for processes to stop
sleep 2

# Clear Next.js cache to prevent 500 errors
echo "🧹 Clearing Next.js cache..."
rm -rf .next 2>/dev/null

# Start server without auto-opening browser
echo "🚀 Starting development server..."
echo "   Server will run on: http://localhost:3000"
echo "   No browser will open automatically"
echo ""

# Set environment variables to prevent auto-opening
export BROWSER=none
export NEXT_TELEMETRY_DISABLED=1

# Start the server
npm run dev
