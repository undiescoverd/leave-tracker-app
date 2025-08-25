#!/bin/bash

echo "🔧 TDH Leave Tracker - Server Fix Script"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the leave-tracker-app directory!"
    echo "Please run: cd leave-tracker-app"
    exit 1
fi

echo "✅ Current directory: $(pwd)"
echo ""

# Step 1: Clean installation
echo "Step 1: Cleaning node_modules and cache..."
rm -rf node_modules
rm -rf .next
rm -f package-lock.json
echo "✅ Cleaned"
echo ""

# Step 2: Install dependencies
echo "Step 2: Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 3: Generate Prisma client
echo "Step 3: Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"
echo ""

# Step 4: Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local with your database credentials"
    exit 1
fi
echo "✅ .env.local found"
echo ""

# Step 5: Run diagnostics
echo "Step 5: Running diagnostics..."
npx tsx scripts/diagnose-api.ts
DIAG_RESULT=$?

if [ $DIAG_RESULT -ne 0 ]; then
    echo ""
    echo "❌ Diagnostics failed. Please fix the issues above."
    exit 1
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "Now try running the server with:"
echo "  npm run dev"
echo ""
echo "And test with:"
echo "  curl http://localhost:3000/api/test-simple"
