import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase';
import { withUserAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity, validationSchemas } from '@/lib/middleware/security';
import { ValidationError, AuthenticationError } from '@/lib/api/errors';
import { checkUKAgentConflict } from '@/lib/services/leave.service.supabase';
import { calculateWorkingDays } from '@/lib/date-utils';
import { validateLeaveRequest } from '@/lib/services/leave-balance.service.supabase';
import { features } from '@/lib/features';
import { UK_AGENTS } from '@/lib/config/business';
import { invalidateOnLeaveRequestChange } from '@/lib/cache/cache-invalidation';
import { logger, generateRequestId } from '@/lib/logger';
import { EmailService } from '@/lib/email/service';
import { format } from 'date-fns';
import { createMany } from '@/lib/supabase-helpers';

async function createBulkLeaveRequestHandler(req: NextRequest, context: { user: any }) {
  const requestId = generateRequestId();
  const start = performance.now();

  try {
    const { user } = context;
    logger.apiRequest('POST', '/api/leave/request/bulk', undefined, requestId);

    // Get validated and sanitized data from middleware
    const validatedData = (req as any).validatedData;

    if (!validatedData) {
      throw new ValidationError('Request validation failed');
    }

    const { requests, type } = validatedData;
    const leaveType = type || 'ANNUAL';

    // Check if requested type is enabled
    if (leaveType === 'TOIL' && !features.TOIL_ENABLED) {
      throw new ValidationError('TOIL requests are not currently enabled');
    }

    if (leaveType === 'SICK' && !features.SICK_LEAVE_ENABLED) {
      throw new ValidationError('Sick leave requests are not currently enabled');
    }

    // Validate all requests before processing
    const validationErrors: Array<{ index: number; error: string }> = [];
    const validRequests: Array<{
      startDate: string;
      endDate: string;
      reason: string;
      type: string;
      hours?: number;
    }> = [];

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const requestType = request.type || leaveType;

      // Basic validation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        validationErrors.push({
          index: i + 1,
          error: `Request ${i + 1}: Start date cannot be in the past`,
        });
        continue;
      }

      if (endDate < startDate) {
        validationErrors.push({
          index: i + 1,
          error: `Request ${i + 1}: End date must be after or equal to start date`,
        });
        continue;
      }

      // Validate leave balance for each request
      const validation_result = await validateLeaveRequest(
        user.id,
        requestType,
        startDate,
        endDate
      );

      if (!validation_result.valid) {
        validationErrors.push({
          index: i + 1,
          error: `Request ${i + 1}: ${validation_result.error || 'Invalid request'}`,
        });
        continue;
      }

      // Check for UK agent conflicts (only for UK agents)
      if (UK_AGENTS.REQUIRE_COVERAGE && UK_AGENTS.EMAILS.includes(user.email)) {
        const conflict = await checkUKAgentConflict(startDate, endDate, user.id);

        if (conflict.hasConflict) {
          validationErrors.push({
            index: i + 1,
            error: `Request ${i + 1}: Leave conflict detected with UK agent(s): ${conflict.conflictingAgents.join(', ')}`,
          });
          continue;
        }
      }

      validRequests.push({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason: request.reason,
        type: requestType,
        hours: request.hours,
      });
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      throw new ValidationError(
        `Validation failed for ${validationErrors.length} request(s): ${validationErrors.map(e => e.error).join('; ')}`
      );
    }

    // If no valid requests, throw error
    if (validRequests.length === 0) {
      throw new ValidationError('No valid requests to submit');
    }

    // Prepare bulk insert data
    const insertData = validRequests.map((request) => ({
      user_id: user.id,
      start_date: new Date(request.startDate).toISOString(),
      end_date: new Date(request.endDate).toISOString(),
      comments: request.reason,
      status: 'PENDING',
      type: request.type,
      hours: request.hours || null,
    }));

    // Bulk insert all leave requests
    const { data: leaveRequestsData, error: createError } = await supabaseAdmin
      .from('leave_requests')
      .insert(insertData)
      .select(`
        *,
        user:users!leave_requests_user_id_fkey (
          name,
          email
        )
      `);

    if (createError) {
      throw new Error(`Failed to create leave requests: ${createError.message}`);
    }

    // Convert snake_case to camelCase for frontend compatibility
    const leaveRequests = (leaveRequestsData || []).map((request: any) => ({
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
      user: request.user,
    }));

    // Calculate total days
    const totalDays = validRequests.reduce((sum, request) => {
      return sum + calculateWorkingDays(new Date(request.startDate), new Date(request.endDate));
    }, 0);

    // Invalidate cache for all date ranges
    for (const request of validRequests) {
      try {
        invalidateOnLeaveRequestChange(
          user.id,
          new Date(request.startDate),
          new Date(request.endDate)
        );
      } catch (cacheError) {
        logger.warn('Cache invalidation failed:', undefined, cacheError as Error);
      }
    }

    // Send confirmation email with all requests
    const requestSummary = validRequests
      .map((req, idx) => {
        const days = calculateWorkingDays(new Date(req.startDate), new Date(req.endDate));
        return `${idx + 1}. ${format(new Date(req.startDate), 'PPP')} - ${format(new Date(req.endDate), 'PPP')} (${days} ${days === 1 ? 'day' : 'days'})`;
      })
      .join('\n');

    await EmailService.sendLeaveRequestConfirmation(
      user.email,
      user.name || 'Employee',
      `${validRequests.length} leave request${validRequests.length > 1 ? 's' : ''} submitted`,
      requestSummary,
      leaveType
    );

    // Log successful bulk leave request creation
    logger.info('Bulk leave requests created successfully', {
      userId: user.id,
      requestId,
      action: 'bulk_leave_requests_created',
      metadata: {
        leaveType,
        requestCount: validRequests.length,
        totalDays,
        leaveRequestIds: leaveRequests.map((r: any) => r.id),
      },
    });

    const duration = performance.now() - start;
    logger.apiResponse('POST', '/api/leave/request/bulk', 201, duration, user.id, requestId);

    return apiSuccess(
      {
        leaveRequests,
        totalDays,
        requestCount: validRequests.length,
        message: `Successfully submitted ${validRequests.length} leave request${validRequests.length > 1 ? 's' : ''}`,
      },
      undefined,
      201
    );
  } catch (error) {
    const duration = performance.now() - start;

    if (error instanceof ValidationError) {
      logger.warn('Bulk leave request validation failed', {
        requestId,
        action: 'validation_error',
        metadata: {
          error: error.message,
          validationErrors: error.details,
        },
      });
      logger.apiResponse('POST', '/api/leave/request/bulk', error.statusCode, duration, undefined, requestId);
      return apiError(
        {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        error.statusCode as any
      );
    }

    if (error instanceof AuthenticationError) {
      logger.securityEvent('authentication_failure', 'medium', undefined, {
        endpoint: '/api/leave/request/bulk',
        error: error.message,
      });
      logger.apiResponse('POST', '/api/leave/request/bulk', error.statusCode, duration, undefined, requestId);
      return apiError(
        {
          code: error.code,
          message: error.message,
        },
        error.statusCode as any
      );
    }

    logger.error(
      'Internal server error in bulk leave request endpoint',
      {
        requestId,
        action: 'api_error',
        resource: '/api/leave/request/bulk',
      },
      error instanceof Error ? error : new Error(String(error))
    );

    logger.apiResponse('POST', '/api/leave/request/bulk', 500, duration, undefined, requestId);
    return apiError('Internal server error');
  }
}

// Apply comprehensive security with input validation for POST
export const POST = withCompleteSecurity(
  withUserAuth(createBulkLeaveRequestHandler),
  {
    validateInput: true,
    schema: validationSchemas.bulkLeaveRequest,
    sanitizationRule: 'leaveRequest',
    skipCSRF: false,
  }
);
