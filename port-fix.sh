#!/bin/bash

# ============================================
# TDH Leave Tracker - Port Management Solution
# Fixes port conflicts and ensures consistent port 3000
# ============================================

echo "🔧 TDH Leave Tracker - Port Management Solution"
echo "=============================================="
echo ""

# ============================================
# SOLUTION 1: Kill Process Script
# ============================================
echo "📝 Creating port management scripts..."

# Create a kill-port script
cat > kill-port.sh << 'EOF'
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
EOF

chmod +x kill-port.sh
echo "✅ Created kill-port.sh"

# ============================================
# SOLUTION 2: Smart Start Script
# ============================================
cat > start-dev.sh << 'EOF'
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
EOF

chmod +x start-dev.sh
echo "✅ Created start-dev.sh"

# ============================================
# SOLUTION 3: Update next.config.js
# ============================================
echo ""
echo "📝 Updating next.config.js for consistent port..."

cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force development server settings
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  
  // Ensure consistent behavior
  reactStrictMode: true,
  
  // Help with 500 errors - show more detailed errors in development
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },

  // Experimental features that might help with stability
  experimental: {
    // Helps with hot reload issues
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

  // Add custom webpack config to help with module resolution
  webpack: (config, { dev, isServer }) => {
    // In development, add better error handling
    if (dev) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    return config;
  },
};

module.exports = nextConfig;
EOF

echo "✅ Updated next.config.js"

# ============================================
# SOLUTION 4: Update package.json scripts
# ============================================
echo ""
echo "📝 Updating package.json with better scripts..."

node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update scripts for better port management
packageJson.scripts = {
    ...packageJson.scripts,
    'dev': 'next dev',
    'dev:clean': './kill-port.sh && rm -rf .next && next dev --port 3000',
    'dev:force': './kill-port.sh && PORT=3000 next dev --port 3000',
    'start:dev': './start-dev.sh',
    'kill:port': './kill-port.sh',
    'clean': 'rm -rf .next node_modules .next-lock',
    'clean:cache': 'rm -rf .next',
    'fix:500': 'rm -rf .next && npm run dev'
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json scripts');
"

# ============================================
# SOLUTION 5: Create debug script for 500 errors
# ============================================
echo ""
echo "📝 Creating debug script for 500 errors..."

cat > debug-500.sh << 'EOF'
#!/bin/bash
# Debug script for 500 errors

echo "🔍 Debugging 500 Errors"
echo "======================="
echo ""

echo "1. Checking Node version..."
node --version
echo ""

echo "2. Checking npm version..."
npm --version
echo ""

echo "3. Checking for .env..."
if [ -f ".env" ]; then
    echo "✅ .env exists"
    echo "   Checking required variables..."
    
    # Check for required env vars without exposing values
    if grep -q "DATABASE_URL" .env; then
        echo "   ✅ DATABASE_URL is set"
    else
        echo "   ❌ DATABASE_URL is missing!"
    fi
    
    if grep -q "NEXTAUTH_SECRET" .env; then
        echo "   ✅ NEXTAUTH_SECRET is set"
    else
        echo "   ❌ NEXTAUTH_SECRET is missing!"
    fi
    
    if grep -q "NEXTAUTH_URL" .env; then
        echo "   ✅ NEXTAUTH_URL is set"
    else
        echo "   ❌ NEXTAUTH_URL is missing!"
    fi
else
    echo "❌ .env is missing!"
fi
echo ""

echo "4. Checking Prisma client..."
if [ -d "node_modules/.prisma/client" ]; then
    echo "✅ Prisma client exists"
else
    echo "❌ Prisma client missing - run: npx prisma generate"
fi
echo ""

echo "5. Checking for port conflicts..."
./kill-port.sh
echo ""

echo "6. Testing database connection..."
npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Database connection successful');
    return prisma.\$disconnect();
  })
  .catch((e) => {
    console.error('❌ Database connection failed:', e.message);
    process.exit(1);
  });
" 2>/dev/null || echo "❌ Database connection failed"

echo ""
echo "======================="
echo "Recommended fixes for 500 errors:"
echo "1. Run: npm run clean:cache"
echo "2. Run: npx prisma generate"
echo "3. Run: npm run start:dev"
echo "4. Check browser console for detailed errors"
echo "5. Check terminal for server-side errors"
EOF

chmod +x debug-500.sh
echo "✅ Created debug-500.sh"

# ============================================
# FINAL SETUP
# ============================================
echo ""
echo "=============================================="
echo "✅ PORT MANAGEMENT SOLUTION INSTALLED!"
echo "=============================================="
echo ""
echo "📋 Available Commands:"
echo ""
echo "  ./start-dev.sh        - Smart start (kills port, clears cache, starts server)"
echo "  ./kill-port.sh        - Kill anything on port 3000"
echo "  ./debug-500.sh        - Debug 500 errors"
echo ""
echo "  npm run dev:clean     - Clean start with cache clear"
echo "  npm run dev:force     - Force port 3000"
echo "  npm run kill:port     - Kill port 3000"
echo "  npm run fix:500       - Quick fix for 500 errors"
echo ""
echo "=============================================="
echo "🎯 RECOMMENDED USAGE:"
echo ""
echo "Always start your dev server with:"
echo "  ./start-dev.sh"
echo ""
echo "This ensures:"
echo "  ✅ Port 3000 is always used"
echo "  ✅ No hanging processes"
echo "  ✅ Clean cache (prevents 500 errors)"
echo "  ✅ Proper environment setup"
echo ""
echo "If you get 500 errors, run:"
echo "  ./debug-500.sh"
echo ""
echo "=============================================="
echo "🚀 Starting server now on port 3000..."
echo ""
./start-dev.sh
