import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, HttpStatusCode } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { apiCache, createCacheKey } from '@/lib/cache/cache-manager';
import { logger, generateRequestId } from '@/lib/logger';
import { withCacheHeaders } from '@/lib/middleware/cache-headers';

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
    const [requestsResult, countResult] = await Promise.all([
      supabaseAdmin
        .from('leave_requests')
        .select(`
          *,
          user:users!leave_requests_user_id_fkey (
            id,
            name,
            email,
            role
          )
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true }) // Oldest requests first for better prioritization
        .range(offset, offset + limit - 1),
      supabaseAdmin
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
    ]);

    const { data: pendingRequests, error: requestsError } = requestsResult;
    const { count: totalCount, error: countError } = countResult;

    if (requestsError) {
      throw new Error(`Failed to fetch pending requests: ${requestsError.message}`);
    }

    if (countError) {
      throw new Error(`Failed to count pending requests: ${countError.message}`);
    }

    // Transform data to match frontend expectations
    const enhancedRequests = (pendingRequests || []).map((request: any) => {
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: request.id,
        employeeName: request.user?.name || 'Unknown',
        employeeEmail: request.user?.email || '',
        employeeRole: request.user?.role || 'Employee',
        type: request.type,
        startDate: request.start_date.split('T')[0],
        endDate: request.end_date.split('T')[0],
        days,
        hours: request.hours,
        comments: request.comments,
        submittedAt: request.created_at,
        // Business impact calculation (could be enhanced with real business logic)
        businessImpact: days >= 5 ? 'HIGH' : days >= 3 ? 'MEDIUM' : 'LOW',
        // Mock coverage data - in real app this would come from a coverage system
        coverageArranged: Math.random() > 0.5,
        user: request.user,
      };
    });

    const responseData = {
      requests: enhancedRequests,
      total: totalCount || 0,
      limit,
      offset,
      hasMore: (totalCount || 0) > offset + limit,
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
      return apiError(error.message, error.statusCode as HttpStatusCode);
    }

    logger.error(
      'Admin pending requests error:',
      {
        requestId,
        action: 'api_error',
        resource: '/api/admin/pending-requests',
      },
      error instanceof Error ? error : new Error(String(error))
    );

    logger.apiResponse('GET', '/api/admin/pending-requests', 500, duration, undefined, requestId);
    return apiError('Failed to fetch pending requests', 500);
  }
}

// Apply comprehensive admin security with caching
export const GET = withCompleteSecurity(
  withCacheHeaders(withAdminAuth(getPendingRequestsHandler)),
  {
    validateInput: false, // GET request, no input validation needed
    skipCSRF: true, // GET request, CSRF not applicable
  }
);
