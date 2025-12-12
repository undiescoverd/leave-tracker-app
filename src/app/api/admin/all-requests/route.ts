import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { apiCache, createCacheKey } from '@/lib/cache/cache-manager';
import { logger, generateRequestId } from '@/lib/logger';
import { withCacheHeaders } from '@/lib/middleware/cache-headers';

async function getAllRequestsHandler(req: NextRequest, context: { user: unknown }): Promise<NextResponse> {
  const requestId = generateRequestId();
  const start = performance.now();

  try {
    logger.apiRequest('GET', '/api/admin/all-requests', undefined, requestId);

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Create cache key for this specific request
    const cacheKey = createCacheKey('admin-all-requests', limit.toString(), offset.toString());
    const cachedData = apiCache.get(cacheKey);

    if (cachedData) {
      logger.cacheOperation('hit', cacheKey);
      const duration = performance.now() - start;
      logger.apiResponse('GET', '/api/admin/all-requests', 200, duration, undefined, requestId);
      return apiSuccess(cachedData);
    }

    logger.cacheOperation('miss', cacheKey);

    // Execute both queries in parallel for better performance
    const [allRequests, totalCount] = await Promise.all([
      prisma.leaveRequest.findMany({
        orderBy: [
          { createdAt: 'desc' }, // Newest requests first
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
      prisma.leaveRequest.count()
    ]);

    // Transform data to match frontend expectations
    const enhancedRequests = allRequests.map(request => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: request.id,
        employeeName: request.user?.name || 'Unknown',
        employeeEmail: request.user?.email || '',
        employeeRole: request.user?.role || 'Employee',
        type: request.type,
        status: request.status,
        startDate: request.startDate.toISOString().split('T')[0],
        endDate: request.endDate.toISOString().split('T')[0],
        days,
        hours: request.hours,
        comments: request.comments,
        reason: request.comments || 'No reason provided', // Map comments to reason for consistency with employee view
        submittedAt: request.createdAt.toISOString(),
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
    logger.apiResponse('GET', '/api/admin/all-requests', 200, duration, undefined, requestId);

    return apiSuccess(responseData);

  } catch (error) {
    const duration = performance.now() - start;

    logger.error('Admin all requests error:', {
      requestId,
      action: 'api_error',
      resource: '/api/admin/all-requests'
    }, error instanceof Error ? error : new Error(String(error)));

    logger.apiResponse('GET', '/api/admin/all-requests', 500, duration, undefined, requestId);
    return apiError('Failed to fetch all requests', 500);
  }
}

// Apply comprehensive admin security with caching
export const GET = withCompleteSecurity(
  withCacheHeaders(
    withAdminAuth(getAllRequestsHandler)
  ),
  {
    validateInput: false, // GET request, no input validation needed
    skipCSRF: true // GET request, CSRF not applicable
  }
);
