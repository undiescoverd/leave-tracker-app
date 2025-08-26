#!/bin/bash
# Smart development server starter

echo "🚀 Starting TDH Leave Tracker Development Server"
echo "=============================================="
echo ""

# Step 1: Kill any existing processes on port 3000
echo "1️⃣ Cleaning up port 3000..."
./kill-port.sh
echo ""

# Step 2: Clear Next.js cache (helps with 500 errors)
echo "2️⃣ Clearing Next.js cache..."
rm -rf .next
echo "✅ Cache cleared"
echo ""

# Step 3: Check environment variables
echo "3️⃣ Checking environment..."
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env not found!"
    echo "Please ensure your environment variables are set"
fi
echo ""

# Step 4: Generate Prisma client
echo "4️⃣ Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"
echo ""

# Step 5: Start the server with explicit port
echo "5️⃣ Starting server on port 3000..."
echo "=============================================="
echo ""

# Start with explicit port and host
PORT=3000 npm run dev -- --port 3000

# If the above fails, this will run
echo ""
echo "⚠️  Server stopped or crashed"
echo "Run ./start-dev.sh to restart"
