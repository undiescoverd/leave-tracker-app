#!/bin/bash

echo "🔧 Quick Fix for Leave Tracker App"
echo "=================================="
echo ""

# Check if server is running
echo "1. Checking if server is running..."
if curl -s http://localhost:3000/api/ping > /dev/null 2>&1; then
    echo "   ✅ Server is running"
else
    echo "   ❌ Server is not running"
    echo "   Please start the server with: npm run dev"
    exit 1
fi

# Test all components
echo ""
echo "2. Running comprehensive tests..."
node test-all-components.js

echo ""
echo "3. Testing admin API specifically..."
node test-admin-api.js

echo ""
echo "🎯 Quick fix complete!"
echo ""
echo "📝 If you see any errors above, they will help identify specific issues."
echo "✅ If all tests pass, your app is working correctly!"
echo ""
echo "🚀 You can now:"
echo "   - Login at: http://localhost:3000/login"
echo "   - Test admin features at: http://localhost:3000/admin/pending-requests"
echo "   - Submit leave requests from the dashboard"
