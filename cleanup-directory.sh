#!/bin/bash

echo "🧹 Cleaning up directory structure..."
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the leave-tracker-app directory!"
    echo "Please run this script from the leave-tracker-app directory"
    exit 1
fi

echo "✅ Current directory: $(pwd)"
echo ""

# Step 1: Move to parent directory
echo "1️⃣ Moving to parent directory..."
cd ..
echo "✅ Now in: $(pwd)"
echo ""

# Step 2: Backup important parent files
echo "2️⃣ Backing up important parent files..."
mkdir -p backup-parent-files
cp -r .git backup-parent-files/ 2>/dev/null || echo "⚠️  No .git directory found"
cp .env.development.local backup-parent-files/ 2>/dev/null || echo "⚠️  No .env.development.local found"
cp -r docs backup-parent-files/ 2>/dev/null || echo "⚠️  No docs directory found"
cp -r .vscode backup-parent-files/ 2>/dev/null || echo "⚠️  No .vscode directory found"
cp -r .vercel backup-parent-files/ 2>/dev/null || echo "⚠️  No .vercel directory found"
echo "✅ Parent files backed up"
echo ""

# Step 3: Move all files from leave-tracker-app to parent
echo "3️⃣ Moving all files from leave-tracker-app to parent..."
mv leave-tracker-app/* . 2>/dev/null || echo "⚠️  Some files couldn't be moved"
mv leave-tracker-app/.* . 2>/dev/null || echo "⚠️  Some hidden files couldn't be moved"
echo "✅ Files moved"
echo ""

# Step 4: Remove the empty leave-tracker-app directory
echo "4️⃣ Removing empty leave-tracker-app directory..."
rmdir leave-tracker-app 2>/dev/null || echo "⚠️  Directory not empty, checking contents..."
if [ -d "leave-tracker-app" ]; then
    echo "📋 Remaining files in leave-tracker-app:"
    ls -la leave-tracker-app/
    echo ""
    echo "🗑️  Force removing leave-tracker-app directory..."
    rm -rf leave-tracker-app
fi
echo "✅ Directory removed"
echo ""

# Step 5: Restore important parent files
echo "5️⃣ Restoring important parent files..."
if [ -d "backup-parent-files/.git" ]; then
    rm -rf .git
    mv backup-parent-files/.git .
    echo "✅ .git restored"
fi

if [ -f "backup-parent-files/.env.development.local" ]; then
    mv backup-parent-files/.env.development.local .
    echo "✅ .env.development.local restored"
fi

if [ -d "backup-parent-files/docs" ]; then
    rm -rf docs
    mv backup-parent-files/docs .
    echo "✅ docs restored"
fi

if [ -d "backup-parent-files/.vscode" ]; then
    rm -rf .vscode
    mv backup-parent-files/.vscode .
    echo "✅ .vscode restored"
fi

if [ -d "backup-parent-files/.vercel" ]; then
    rm -rf .vercel
    mv backup-parent-files/.vercel .
    echo "✅ .vercel restored"
fi

# Clean up backup directory
rm -rf backup-parent-files
echo "✅ Backup directory cleaned up"
echo ""

# Step 6: Verify the structure
echo "6️⃣ Verifying new directory structure..."
echo "📋 Current directory contents:"
ls -la
echo ""

# Step 7: Test that everything still works
echo "7️⃣ Testing that everything still works..."
if [ -f "package.json" ]; then
    echo "✅ package.json found"
    echo "✅ Node.js project structure intact"
else
    echo "❌ package.json not found - something went wrong!"
    exit 1
fi

echo ""
echo "====================================="
echo "✅ DIRECTORY CLEANUP COMPLETE!"
echo "====================================="
echo ""
echo "🎯 You can now run commands directly from this directory:"
echo ""
echo "  npm run dev              - Start development server"
echo "  ./start-dev.sh           - Smart start (recommended)"
echo "  ./kill-port.sh           - Kill port 3000"
echo "  ./debug-500.sh           - Debug 500 errors"
echo ""
echo "📁 No more confusing nested directories!"
echo "🚀 Everything is now in one clean location"
echo ""
echo "====================================="
