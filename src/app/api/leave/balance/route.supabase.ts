import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, TypedApiError } from '@/lib/api/response';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { AuthenticationError } from '@/lib/api/errors';
import { getUserLeaveBalance } from '@/lib/services/leave.service.supabase';
import { getUserLeaveBalances } from '@/lib/services/leave-balance.service.supabase';
import { features } from '@/lib/features';
import { calculateWorkingDays } from '@/lib/date-utils';
import { userDataCache, createCacheKey } from '@/lib/cache/cache-manager';
import { logger, generateRequestId } from '@/lib/logger';
import { withUserAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { withCacheHeaders } from '@/lib/middleware/cache-headers';
import { calculateUserNotifications } from '@/lib/notifications/notification-policy';
import { supabaseAdmin } from '@/lib/supabase';

async function getLeaveBalanceHandler(
  req: NextRequest,
  context: { user: any }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const start = performance.now();

  try {
    logger.apiRequest('GET', '/api/leave/balance', undefined, requestId);

    const user = context.user;
    logger.debug('User authenticated for leave balance request', {
      userId: user.id,
      requestId,
      action: 'authentication_success',
    });

    // Get current year
    const currentYear = new Date().getFullYear();

    // Check cache first
    const cacheKey = createCacheKey('leave-balance', user.id, currentYear.toString());
    const cachedBalance = userDataCache.get(cacheKey);

    if (cachedBalance) {
      logger.cacheOperation('hit', cacheKey);
      const duration = performance.now() - start;
      logger.apiResponse('GET', '/api/leave/balance', 200, duration, user.id, requestId);
      return apiSuccess(cachedBalance);
    }

    logger.cacheOperation('miss', cacheKey);

    // Get all user data in parallel for better performance
    const [balance, multiBalances, pendingData, allUserRequests, allUserToil] = await Promise.all([
      getUserLeaveBalance(user.id, currentYear),
      getUserLeaveBalances(user.id, currentYear),
      calculatePendingLeaveByType(user.id, currentYear),
      getUserAllRequests(user.id, currentYear),
      getUserAllToil(user.id, currentYear),
    ]);

    // Return appropriate response based on features
    const response: any = {
      data: {
        // Always include annual leave (backward compatible)
        totalAllowance: (balance as any)?.totalAllowance || 0,
        daysUsed: (balance as any)?.daysUsed || 0,
        remaining: (balance as any)?.remaining || 0,

        // New structure if multi-type enabled
        ...(features.isMultiLeaveTypeEnabled() && {
          balances: {
            annual: {
              total: (balance as any)?.totalAllowance || 0,
              used: (balance as any)?.daysUsed || 0,
              remaining: (balance as any)?.remaining || 0,
            },
          },
        }),

        // Include pending requests data (only actionable notifications)
        pending: {
          annual: pendingData.annual,
          toil: pendingData.toil,
          sick: pendingData.sick,
          total: pendingData.total,
          count: pendingData.count, // Include count of pending requests
        },
      },
    };

    // Add TOIL and sick leave if enabled (multiBalances already fetched above)
    if (features.TOIL_ENABLED || features.SICK_LEAVE_ENABLED) {
      if (features.TOIL_ENABLED && multiBalances.toil) {
        if (response.data.balances) {
          response.data.balances.toil = multiBalances.toil;
        }
      }

      if (features.SICK_LEAVE_ENABLED && multiBalances.sick) {
        if (response.data.balances) {
          response.data.balances.sick = multiBalances.sick;
        }
      }
    }

    // Cache the response data
    userDataCache.set(cacheKey, response.data);
    logger.cacheOperation('set', cacheKey);

    const duration = performance.now() - start;
    logger.apiResponse('GET', '/api/leave/balance', 200, duration, user.id, requestId);

    return apiSuccess(response.data);
  } catch (error) {
    const duration = performance.now() - start;

    if (error instanceof AuthenticationError) {
      logger.apiResponse('GET', '/api/leave/balance', error.statusCode, duration, undefined, requestId);
      logger.securityEvent('authentication_failure', 'medium', undefined, {
        endpoint: '/api/leave/balance',
        error: error.message,
      });
      return apiError(error.message, (error as TypedApiError).statusCode);
    }

    logger.error(
      'Internal server error in leave balance endpoint',
      {
        requestId,
        action: 'api_error',
        resource: '/api/leave/balance',
      },
      error instanceof Error ? error : new Error(String(error))
    );

    logger.apiResponse('GET', '/api/leave/balance', 500, duration, undefined, requestId);
    return apiError('Internal server error', 500);
  }
}

export const GET = withCompleteSecurity(
  withCacheHeaders(withUserAuth(getLeaveBalanceHandler)),
  {
    validateInput: false,
    skipCSRF: true,
  }
);

// Helper function to calculate pending leave by type
async function calculatePendingLeaveByType(userId: string, year: number) {
  const { data: pendingRequests, error } = await supabaseAdmin
    .from('leave_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'PENDING')
    .gte('start_date', new Date(year, 0, 1).toISOString())
    .lte('start_date', new Date(year, 11, 31).toISOString());

  if (error) {
    throw new Error(`Failed to fetch pending requests: ${error.message}`);
  }

  const pending = {
    annual: 0,
    toil: 0,
    sick: 0,
    total: 0,
    count: pendingRequests?.length || 0,
  };

  for (const request of pendingRequests || []) {
    const days = calculateWorkingDays(new Date(request.start_date), new Date(request.end_date));

    const leaveType = request.type || 'ANNUAL';

    if (leaveType === 'ANNUAL') {
      pending.annual += days;
    } else if (leaveType === 'TOIL') {
      pending.toil += request.hours || days;
    } else if (leaveType === 'SICK') {
      pending.sick += days;
    }

    pending.total += days;
  }

  return pending;
}

// Helper function to get all user requests for notification calculation
async function getUserAllRequests(userId: string, year: number) {
  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .select('status, user_id')
    .eq('user_id', userId)
    .gte('start_date', new Date(year, 0, 1).toISOString())
    .lte('start_date', new Date(year, 11, 31).toISOString());

  if (error) {
    throw new Error(`Failed to fetch user requests: ${error.message}`);
  }

  // Convert to match Prisma format (snake_case to camelCase)
  return (data || []).map((request: any) => ({
    status: request.status,
    userId: request.user_id,
  }));
}

// Helper function to get all user TOIL entries for notification calculation
async function getUserAllToil(userId: string, year: number) {
  const { data, error } = await supabaseAdmin
    .from('toil_entries')
    .select('approved, user_id')
    .eq('user_id', userId)
    .gte('created_at', new Date(year, 0, 1).toISOString())
    .lte('created_at', new Date(year, 11, 31).toISOString());

  if (error) {
    throw new Error(`Failed to fetch user TOIL entries: ${error.message}`);
  }

  // Convert to match Prisma format (snake_case to camelCase)
  return (data || []).map((entry: any) => ({
    approved: entry.approved,
    userId: entry.user_id,
  }));
}
