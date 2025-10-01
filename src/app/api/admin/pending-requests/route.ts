import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { apiCache, createCacheKey } from '@/lib/cache/cache-manager';
import { logger, generateRequestId } from '@/lib/logger';

async function getPendingRequestsHandler(req: NextRequest, context: { user: unknown }): Promise<NextResponse> {
  const requestId = generateRequestId();
  const start = performance.now();
  
  try {
    logger.apiRequest('GET', '/api/admin/pending-requests', undefined, requestId);

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Create cache key for this specific request
    const cacheKey = createCacheKey('admin-pending-requests', limit.toString(), offset.toString());
    const cachedData = apiCache.get(cacheKey);
    
    if (cachedData) {
      logger.cacheOperation('hit', cacheKey);
      const duration = performance.now() - start;
      logger.apiResponse('GET', '/api/admin/pending-requests', 200, duration, undefined, requestId);
      return apiSuccess(cachedData);
    }
    
    logger.cacheOperation('miss', cacheKey);

    // Execute both queries in parallel for better performance
    const [pendingRequests, totalCount] = await Promise.all([
      prisma.leaveRequest.findMany({
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
      }),
      prisma.leaveRequest.count({
        where: { status: 'PENDING' }
      })
    ]);

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

    const responseData = {
      requests: enhancedRequests,
      total: totalCount,
      limit,
      offset,
      hasMore: totalCount > offset + limit
    };

    // Cache the response for 2 minutes (admin data changes frequently)
    apiCache.set(cacheKey, responseData, 2 * 60 * 1000);
    logger.cacheOperation('set', cacheKey);

    const duration = performance.now() - start;
    logger.apiResponse('GET', '/api/admin/pending-requests', 200, duration, undefined, requestId);
    
    return apiSuccess(responseData);

  } catch (error) {
    const duration = performance.now() - start;
    
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      logger.apiResponse('GET', '/api/admin/pending-requests', error.statusCode, duration, undefined, requestId);
      return apiError(error.message, error.statusCode as number);
    }
    
    logger.error('Admin pending requests error:', {
      requestId,
      action: 'api_error',
      resource: '/api/admin/pending-requests'
    }, error instanceof Error ? error : new Error(String(error)));
    
    logger.apiResponse('GET', '/api/admin/pending-requests', 500, duration, undefined, requestId);
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