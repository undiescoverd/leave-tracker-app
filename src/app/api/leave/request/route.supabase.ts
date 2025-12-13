import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { withUserAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity, validationSchemas } from '@/lib/middleware/security';
import { ValidationError, AuthenticationError } from '@/lib/api/errors';
import { checkUKAgentConflict } from '@/lib/services/leave.service.supabase';
import { calculateWorkingDays } from '@/lib/date-utils';
import { validateLeaveRequest } from '@/lib/services/leave-balance.service.supabase';
import { features } from '@/lib/features';
import { UK_AGENTS } from '@/lib/config/business';
import { invalidateOnLeaveRequestChange } from '@/lib/cache/cache-invalidation';
import { logger, generateRequestId } from '@/lib/logger';
import { TOILScenario } from '@/lib/types/toil';
import { TOIL_SCENARIOS } from '@/lib/toil/scenarios';
import { EmailService } from '@/lib/email/service';
import { format } from 'date-fns';

async function createLeaveRequestHandler(req: NextRequest, context: { user: any }) {
  const requestId = generateRequestId();
  const start = performance.now();

  try {
    const { user } = context;
    logger.apiRequest('POST', '/api/leave/request', undefined, requestId);

    // Get validated and sanitized data from middleware
    const validatedData = (req as any).validatedData;

    if (!validatedData) {
      throw new ValidationError('Request validation failed');
    }

    const { startDate, endDate, reason, type, hours, scenario, coveringUserId } = validatedData;

    // Check if requested type is enabled
    if (type === 'TOIL' && !features.TOIL_ENABLED) {
      throw new ValidationError('TOIL requests are not currently enabled');
    }

    if (type === 'SICK' && !features.SICK_LEAVE_ENABLED) {
      throw new ValidationError('Sick leave requests are not currently enabled');
    }

    // Calculate leave days
    const leaveDays = calculateWorkingDays(
      new Date(startDate),
      new Date(endDate)
    );

    // Validate leave request based on type and balance
    const validation_result = await validateLeaveRequest(
      user.id,
      type,
      new Date(startDate),
      new Date(endDate)
    );

    if (!validation_result.valid) {
      throw new ValidationError(validation_result.error || 'Invalid request');
    }

    // Check for UK agent conflicts (only for UK agents)
    if (UK_AGENTS.REQUIRE_COVERAGE && UK_AGENTS.EMAILS.includes(user.email)) {
      const conflict = await checkUKAgentConflict(
        new Date(startDate),
        new Date(endDate),
        user.id
      );

      if (conflict.hasConflict) {
        throw new ValidationError(
          `Leave conflict detected with UK agent(s): ${conflict.conflictingAgents.join(', ')}. UK office requires coverage at all times.`
        );
      }
    }

    // Create leave request with type
    let comments = reason;

    // Enhance comments for TOIL scenarios
    if (type === 'TOIL' && scenario) {
      const scenarioInfo = TOIL_SCENARIOS[scenario as TOILScenario];
      comments = `${reason} (${scenarioInfo?.label || scenario})`;

      // Add coverage info for panel days
      if (scenario === TOILScenario.WORKING_DAY_PANEL && coveringUserId) {
        comments += `\nCoverage: ${coveringUserId}`;
      }
    }

    // Create leave request in Supabase
    const { data: leaveRequestData, error: createError } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        user_id: user.id,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        comments,
        status: 'PENDING',
        type,
        hours,
      })
      .select(`
        *,
        user:users!leave_requests_user_id_fkey (
          name,
          email
        )
      `)
      .single();

    if (createError) {
      throw new Error(`Failed to create leave request: ${createError.message}`);
    }

    // Convert snake_case to camelCase for frontend compatibility
    const leaveRequest = {
      id: leaveRequestData.id,
      userId: leaveRequestData.user_id,
      startDate: leaveRequestData.start_date,
      endDate: leaveRequestData.end_date,
      status: leaveRequestData.status,
      comments: leaveRequestData.comments,
      type: leaveRequestData.type,
      hours: leaveRequestData.hours,
      approvedBy: leaveRequestData.approved_by,
      approvedAt: leaveRequestData.approved_at,
      createdAt: leaveRequestData.created_at,
      updatedAt: leaveRequestData.updated_at,
      user: (leaveRequestData as any).user,
    };

    // Invalidate cache after successful creation
    try {
      invalidateOnLeaveRequestChange(user.id, new Date(startDate), new Date(endDate));
    } catch (cacheError) {
      logger.warn('Cache invalidation failed:', undefined, cacheError as Error);
    }

    // Send confirmation email
    await EmailService.sendLeaveRequestConfirmation(
      user.email,
      user.name || 'Employee',
      format(new Date(startDate), 'PPP'),
      format(new Date(endDate), 'PPP'),
      type
    );

    // Log successful leave request creation
    logger.leaveRequest('create', leaveRequest.id, user.id);
    logger.info('Leave request created successfully', {
      userId: user.id,
      requestId,
      action: 'leave_request_created',
      metadata: {
        leaveType: type,
        startDate,
        endDate,
        leaveDays,
        leaveRequestId: leaveRequest.id,
      },
    });

    const duration = performance.now() - start;
    logger.apiResponse('POST', '/api/leave/request', 201, duration, user.id, requestId);

    return apiSuccess(
      {
        leaveRequest,
        leaveDays,
        message: `${type} leave request submitted successfully`,
      },
      undefined,
      201
    );
  } catch (error) {
    const duration = performance.now() - start;

    if (error instanceof ValidationError) {
      logger.warn('Leave request validation failed', {
        requestId,
        action: 'validation_error',
        metadata: {
          error: error.message,
          validationErrors: error.details,
        },
      });
      logger.apiResponse('POST', '/api/leave/request', error.statusCode, duration, undefined, requestId);
      return apiError(error, error.statusCode as any);
    }

    if (error instanceof AuthenticationError) {
      logger.securityEvent('authentication_failure', 'medium', undefined, {
        endpoint: '/api/leave/request',
        error: error.message,
      });
      logger.apiResponse('POST', '/api/leave/request', error.statusCode, duration, undefined, requestId);
      return apiError(error, error.statusCode as any);
    }

    logger.error(
      'Internal server error in leave request endpoint',
      {
        requestId,
        action: 'api_error',
        resource: '/api/leave/request',
      },
      error instanceof Error ? error : new Error(String(error))
    );

    logger.apiResponse('POST', '/api/leave/request', 500, duration, undefined, requestId);
    return apiError('Internal server error');
  }
}

// GET endpoint to list leave requests with authentication
async function getLeaveRequestsHandler(req: NextRequest, context: { user: any }) {
  try {
    const { user } = context;

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10'))); // Security: Limit max results
    const offset = (page - 1) * limit;

    // Build query - users can only see their own requests (security)
    let query = supabaseAdmin
      .from('leave_requests')
      .select(
        `
        *,
        user:users!leave_requests_user_id_fkey (
          name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add status filter if provided
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: leaveRequests, error, count: totalCount } = await query;

    if (error) {
      throw new Error(`Failed to fetch leave requests: ${error.message}`);
    }

    // Calculate days for each request and convert to camelCase
    const requestsWithDays = (leaveRequests || []).map((request: any) => {
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
        user: request.user,
        days,
        // Fix: Map comments field to reason for frontend compatibility
        reason: request.comments || 'No reason provided',
      };
    });

    return apiSuccess({
      requests: requestsWithDays,
      total: totalCount || 0,
      page,
      limit,
      totalPages: Math.ceil((totalCount || 0) / limit),
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return apiError(error, error.statusCode as any);
    }
    return apiError('Internal server error');
  }
}

// Apply comprehensive security with input validation for POST
export const POST = withCompleteSecurity(
  withUserAuth(createLeaveRequestHandler),
  {
    validateInput: true,
    schema: validationSchemas.leaveRequest,
    sanitizationRule: 'leaveRequest',
    skipCSRF: false,
  }
);

// Apply security for GET without input validation
export const GET = withCompleteSecurity(
  withUserAuth(getLeaveRequestsHandler),
  {
    validateInput: false,
    skipCSRF: true, // GET request, CSRF not applicable
  }
);
