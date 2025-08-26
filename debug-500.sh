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
