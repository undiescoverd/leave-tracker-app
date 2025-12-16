import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase';
import { withUserAuth } from '@/lib/middleware/auth.supabase';
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

    // Build query
    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        user:users!leave_requests_user_id_fkey (
          name,
          email
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      query = query.eq('status', status);
    }

    if (rawStartDate) {
      const parsedStart = new Date(rawStartDate);
      if (!Number.isNaN(parsedStart.getTime())) {
        query = query.gte('start_date', parsedStart.toISOString());
      }
    }

    if (rawEndDate) {
      const parsedEnd = new Date(rawEndDate);
      if (!Number.isNaN(parsedEnd.getTime())) {
        parsedEnd.setHours(23, 59, 59, 999);
        query = query.lte('end_date', parsedEnd.toISOString());
      }
    }

    const { data: leaveRequests, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch leave requests: ${error.message}`);
    }

    // Calculate days for each request and convert to camelCase
    const requestsWithDays = (leaveRequests || []).map(request => {
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: request.id,
        userId: request.user_id,
        startDate: request.start_date,
        endDate: request.end_date,
        status: request.status,
        comments: request.comments,
        type: request.type,
        hours: request.hours,
        approvedBy: request.approved_by,
        approvedAt: request.approved_at,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        user: (request as any).user,
        days,
        reason: request.comments || 'No reason provided',
      };
    });

    const totalCount = count || 0;
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
