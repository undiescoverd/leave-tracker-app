import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
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
    const [requestsResponse, countResponse] = await Promise.all([
      supabaseAdmin
        .from('leave_requests')
        .select(`
          id,
          user_id,
          start_date,
          end_date,
          type,
          status,
          hours,
          comments,
          created_at,
          user:users!leave_requests_user_id_fkey (
            id,
            name,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabaseAdmin
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
    ]);

    if (requestsResponse.error) {
      throw new Error(`Failed to fetch leave requests: ${requestsResponse.error.message}`);
    }

    if (countResponse.error) {
      throw new Error(`Failed to fetch count: ${countResponse.error.message}`);
    }

    const allRequests = requestsResponse.data || [];
    const totalCount = countResponse.count || 0;

    // Transform data to match frontend expectations (convert snake_case to camelCase)
    const enhancedRequests = allRequests.map(request => {
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Handle user data (can be object or array depending on Supabase response)
      const userData = Array.isArray(request.user) ? request.user[0] : request.user;

      return {
        id: request.id,
        employeeName: userData?.name || 'Unknown',
        employeeEmail: userData?.email || '',
        employeeRole: userData?.role || 'Employee',
        type: request.type,
        status: request.status,
        startDate: request.start_date,
        endDate: request.end_date,
        days,
        hours: request.hours,
        comments: request.comments,
        reason: request.comments || 'No reason provided', // Map comments to reason for consistency with employee view
        submittedAt: request.created_at,
        user: userData
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
