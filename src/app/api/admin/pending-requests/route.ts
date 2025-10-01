import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';

async function getPendingRequestsHandler(req: NextRequest, context: { user: unknown }): Promise<NextResponse> {
  try {
    // Admin user is available in context if needed

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get all pending leave requests with user details
    const pendingRequests = await prisma.leaveRequest.findMany({
      where: {
        status: 'PENDING'
      },
      orderBy: [
        { createdAt: 'asc' }, // Oldest requests first for better prioritization
      ],
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Get total count for pagination
    const totalCount = await prisma.leaveRequest.count({
      where: { status: 'PENDING' }
    });

    // Transform data to match frontend expectations
    const enhancedRequests = pendingRequests.map(request => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      return {
        id: request.id,
        employeeName: request.user?.name || 'Unknown',
        employeeEmail: request.user?.email || '',
        employeeRole: request.user?.role || 'Employee',
        type: request.type,
        startDate: request.startDate.toISOString().split('T')[0],
        endDate: request.endDate.toISOString().split('T')[0],
        days,
        hours: request.hours,
        comments: request.comments,
        submittedAt: request.createdAt.toISOString(),
        // Business impact calculation (could be enhanced with real business logic)
        businessImpact: days >= 5 ? 'HIGH' : days >= 3 ? 'MEDIUM' : 'LOW',
        // Mock coverage data - in real app this would come from a coverage system
        coverageArranged: Math.random() > 0.5,
        user: request.user
      };
    });

    return apiSuccess({
      requests: enhancedRequests,
      total: totalCount,
      limit,
      offset,
      hasMore: totalCount > offset + limit
    });

  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return apiError(error.message, error.statusCode as number);
    }
    console.error('Admin pending requests error:', error);
    return apiError('Failed to fetch pending requests', 500);
  }
}

// Apply comprehensive admin security
export const GET = withCompleteSecurity(
  withAdminAuth(getPendingRequestsHandler),
  { 
    validateInput: false, // GET request, no input validation needed
    skipCSRF: true // GET request, CSRF not applicable
  }
);