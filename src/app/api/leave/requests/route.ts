import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { AuthenticationError } from '@/lib/api/errors';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { withUserAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { userDataCache, createCacheKey } from '@/lib/cache/cache-manager';
import { logger, generateRequestId } from '@/lib/logger';
import { withCacheHeaders } from '@/lib/middleware/cache-headers';

async function getLeaveRequestsHandler(
  req: NextRequest,
  context: { user: any }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const start = performance.now();
  
  try {
    logger.apiRequest('GET', '/api/leave/requests', undefined, requestId);
    
    // User from middleware
    const user = context.user;

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const rawStartDate = searchParams.get('startDate');
    const rawEndDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build query
    const where: any = { userId: user.id };
    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }
    
    if (rawStartDate) {
      const parsedStart = new Date(rawStartDate);
      if (!Number.isNaN(parsedStart.getTime())) {
        where.startDate = {
          ...(where.startDate || {}),
          gte: parsedStart,
        };
      }
    }

    if (rawEndDate) {
      const parsedEnd = new Date(rawEndDate);
      if (!Number.isNaN(parsedEnd.getTime())) {
        parsedEnd.setHours(23, 59, 59, 999);
        where.endDate = {
          ...(where.endDate || {}),
          lte: parsedEnd,
        };
      }
    }

    // Create cache key
    const cacheKey = createCacheKey(
      'leave-requests',
      user.id,
      status || 'all',
      page.toString(),
      limit.toString(),
      rawStartDate || 'no-start',
      rawEndDate || 'no-end'
    );
    const cachedData = userDataCache.get(cacheKey);
    
    if (cachedData) {
      logger.cacheOperation('hit', cacheKey);
      const duration = performance.now() - start;
      logger.apiResponse('GET', '/api/leave/requests', 200, duration, user.id, requestId);
      return apiSuccess(cachedData);
    }
    
    logger.cacheOperation('miss', cacheKey);

    // Execute both queries in parallel for better performance
    const [totalCount, leaveRequests] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    ]);

    // Calculate days for each request
    const requestsWithDays = leaveRequests.map(request => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      return {
        ...request,
        days,
        // Fix: Map comments field to reason for frontend compatibility
        reason: request.comments || 'No reason provided',
        // Keep original comments field for admin functionality
        comments: request.comments,
      };
    });

    const responseData = {
      requests: requestsWithDays,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    };

    // Cache the response for 4 minutes
    userDataCache.set(cacheKey, responseData, 4 * 60 * 1000);
    logger.cacheOperation('set', cacheKey);

    const duration = performance.now() - start;
    logger.apiResponse('GET', '/api/leave/requests', 200, duration, user.id, requestId);
    
    return apiSuccess(responseData);
  } catch (error) {
    const duration = performance.now() - start;
    
    logger.error('Get leave requests error:', {
      requestId,
      action: 'api_error',
      resource: '/api/leave/requests'
    }, error instanceof Error ? error : new Error(String(error)));
    
    logger.apiResponse('GET', '/api/leave/requests', 500, duration, undefined, requestId);
    return apiError('Failed to fetch leave requests', 500);
  }
}

export const GET = withCompleteSecurity(
  withCacheHeaders(
    withUserAuth(getLeaveRequestsHandler)
  ),
  {
    validateInput: false,
    skipCSRF: true
  }
);
