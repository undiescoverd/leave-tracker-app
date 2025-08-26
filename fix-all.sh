#!/bin/bash

# ============================================
# TDH Leave Tracker - Complete Fix Script
# Fixes: Route issues, Next.js 15 types, and test script conflicts
# ============================================

echo "🔧 TDH Leave Tracker - Complete Fix Script"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the leave-tracker-app directory!"
    echo "Please run this script from the leave-tracker-app directory"
    exit 1
fi

echo "✅ Starting fixes in: $(pwd)"
echo ""

# ============================================
# FIX 1: Create Missing/Updated Page Routes
# ============================================
echo "📄 Fix 1: Ensuring Leave Requests Page Exists..."

# Create the leave requests page if it doesn't exist or is broken
cat > src/app/leave/requests/page.tsx << 'EOF'
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  days: number;
  createdAt: string;
  adminComment?: string;
}

export default function LeaveRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchRequests();
    }
  }, [status, router]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");
      
      const queryParams = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const response = await fetch(`/api/leave/requests${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data.data || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || "Failed to fetch requests");
      }
    } catch (err) {
      setError("Network error: Unable to fetch leave requests");
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800", 
      REJECTED: "bg-red-100 text-red-800"
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Leave History</h1>
              <p className="mt-2 text-gray-600">View and track all your leave requests</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1"
            >
              <option value="ALL">All Requests</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button
              onClick={fetchRequests}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No leave requests found</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md"
              >
                Submit New Request
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{request.days}</td>
                    <td className="px-6 py-4 text-sm">{request.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
EOF

echo "✅ Leave requests page created/updated"
echo ""

# ============================================
# FIX 2: Update Next.js 15 Dynamic API Routes
# ============================================
echo "🔄 Fix 2: Updating Next.js 15 API Routes..."

# Fix approve route
cat > src/app/api/leave/request/[id]/approve/route.ts << 'EOF'
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { AuthenticationError, AuthorizationError, NotFoundError } from '@/lib/api/errors';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.email) {
      throw new AuthenticationError('Authentication required');
    }

    // Get user and check admin role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      throw new AuthorizationError('Admin access required');
    }

    // Get params in Next.js 15 style
    const { id } = await context.params;

    // Get the leave request
    const leaveRequest = await prisma.leave.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leaveRequest) {
      throw new NotFoundError('Leave request', id);
    }

    // Update status
    const updated = await prisma.leave.update({
      where: { id },
      data: {
        status: 'APPROVED',
        updatedAt: new Date()
      },
      include: { user: true }
    });

    return apiSuccess({
      message: 'Leave request approved successfully',
      request: updated
    });

  } catch (error) {
    if (error instanceof AuthenticationError || 
        error instanceof AuthorizationError || 
        error instanceof NotFoundError) {
      return apiError(error.toJSON(), error.statusCode);
    }
    return apiError({ 
      code: 'INTERNAL_ERROR', 
      message: 'Failed to approve request' 
    }, 500);
  }
}
EOF

# Fix reject route
cat > src/app/api/leave/request/[id]/reject/route.ts << 'EOF'
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { z } from 'zod';

const rejectSchema = z.object({
  adminComment: z.string().min(1, 'Comment is required for rejection')
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.email) {
      throw new AuthenticationError('Authentication required');
    }

    // Get user and check admin role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      throw new AuthorizationError('Admin access required');
    }

    // Parse body
    const body = await request.json();
    const validation = rejectSchema.safeParse(body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid request data', validation.error.flatten().fieldErrors);
    }

    // Get params in Next.js 15 style
    const { id } = await context.params;

    // Get the leave request
    const leaveRequest = await prisma.leave.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leaveRequest) {
      throw new NotFoundError('Leave request', id);
    }

    // Update status with comment
    const updated = await prisma.leave.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminComment: validation.data.adminComment,
        updatedAt: new Date()
      },
      include: { user: true }
    });

    return apiSuccess({
      message: 'Leave request rejected',
      request: updated
    });

  } catch (error) {
    if (error instanceof AuthenticationError || 
        error instanceof AuthorizationError || 
        error instanceof NotFoundError ||
        error instanceof ValidationError) {
      return apiError(error.toJSON(), error.statusCode);
    }
    return apiError({ 
      code: 'INTERNAL_ERROR', 
      message: 'Failed to reject request' 
    }, 500);
  }
}
EOF

echo "✅ API routes updated for Next.js 15"
echo ""

# ============================================
# FIX 3: Move Test Scripts Out of Build Path
# ============================================
echo "📦 Fix 3: Reorganizing Test Scripts..."

# Create test-scripts directory at root
mkdir -p test-scripts

# Move all test scripts if they exist
if [ -d "scripts" ]; then
    # Check if there are .ts files to move
    if ls scripts/*.ts 1> /dev/null 2>&1; then
        echo "Moving test scripts to test-scripts directory..."
        mv scripts/*.ts test-scripts/ 2>/dev/null || true
    fi
fi

# Update tsconfig.json to exclude test-scripts
echo "Updating tsconfig.json..."
if [ -f "tsconfig.json" ]; then
    # Create a backup
    cp tsconfig.json tsconfig.json.backup
    
    # Update tsconfig.json using Node.js
    node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    
    // Add exclude array if it doesn't exist
    if (!config.exclude) {
        config.exclude = [];
    }
    
    // Add test-scripts to exclude if not already there
    if (!config.exclude.includes('test-scripts')) {
        config.exclude.push('test-scripts');
    }
    
    // Also exclude scripts directory
    if (!config.exclude.includes('scripts')) {
        config.exclude.push('scripts');
    }
    
    fs.writeFileSync('tsconfig.json', JSON.stringify(config, null, 2));
    console.log('✅ tsconfig.json updated');
    "
fi

echo ""

# ============================================
# FIX 4: Update ESLint Configuration
# ============================================
echo "🔧 Fix 4: Updating ESLint Configuration..."

cat > eslint.config.mjs << 'EOF'
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["test-scripts/**", "scripts/**", ".next/**", "node_modules/**"],
  },
];

export default eslintConfig;
EOF

echo "✅ ESLint configuration updated"
echo ""

# ============================================
# FIX 5: Update package.json scripts
# ============================================
echo "📝 Fix 5: Updating package.json scripts..."

# Add helpful scripts using Node.js
node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Add or update scripts
packageJson.scripts = {
    ...packageJson.scripts,
    'test:api': 'npx tsx test-scripts/test-api-endpoints.ts',
    'test:auth': 'npx tsx test-scripts/test-authentication.ts',
    'test:leave': 'npx tsx test-scripts/test-leave-crud.ts',
    'fix:types': 'npx tsc --noEmit',
    'clean': 'rm -rf .next node_modules',
    'clean:install': 'npm run clean && npm install'
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ package.json scripts updated');
"

echo ""

# ============================================
# FIX 6: Clear Next.js cache and rebuild
# ============================================
echo "🧹 Fix 6: Cleaning and Rebuilding..."

# Clear Next.js cache
rm -rf .next
echo "✅ Cleared Next.js cache"

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"

echo ""
echo "============================================"
echo "✅ ALL FIXES APPLIED SUCCESSFULLY!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Test the 'My Leave History' button"
echo "3. The page should now work at: http://localhost:3000/leave/requests"
echo ""
echo "Test users:"
echo "- senay.taormina@tdhagency.com (Admin)"
echo "- ian.vincent@tdhagency.com (Admin)"
echo "- sup.dhanasunthorn@tdhagency.com (User)"
echo "- luis.drake@tdhagency.com (User)"
echo "- Password: Password123! (for all)"
echo ""
echo "If you still have issues, check:"
echo "- Browser console for errors"
echo "- Terminal for server errors"
echo "- Network tab for API failures"
