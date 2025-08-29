import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { z } from 'zod';
import { ValidationError, AuthenticationError } from '@/lib/api/errors';
import { checkUKAgentConflict, getUserLeaveBalance } from '@/lib/services/leave.service';
import { calculateWorkingDays } from '@/lib/date-utils';
import { validateLeaveRequest } from '@/lib/services/leave-balance.service';
import { features } from '@/lib/features';
import { sanitizeObject, sanitizationRules } from '@/lib/middleware/sanitization';
import { UK_AGENTS } from '@/lib/config/business';
import { invalidateOnLeaveRequestChange } from '@/lib/cache/cache-invalidation';
import { logger, generateRequestId } from '@/lib/logger';

// Enhanced validation schema with leave type support
const createLeaveRequestSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(1, 'Reason is required').max(500),
  type: z.enum(['ANNUAL', 'TOIL', 'SICK']).optional().default('ANNUAL'),
  hours: z.number().optional(), // For TOIL requests
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
});


export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const start = performance.now();
  
  try {
    logger.apiRequest('POST', '/api/leave/request', undefined, requestId);
    
    // Get authenticated user
    const user = await getAuthenticatedUser();
    logger.debug('User authenticated for leave request creation', {
      userId: user.id,
      requestId,
      action: 'authentication_success'
    });

    // Parse, sanitize and validate request body
    const rawBody = await req.json();
    const sanitizedBody = sanitizeObject(rawBody, sanitizationRules.leaveRequest);
    
    const validationResult = createLeaveRequestSchema.safeParse(sanitizedBody);
    
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid request data',
        validationResult.error.flatten().fieldErrors
      );
    }

    const { startDate, endDate, reason, type, hours } = validationResult.data;

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
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: user.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        comments: reason,
        status: 'PENDING',
        type, // New field
        hours // For TOIL
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Invalidate cache after successful creation
    invalidateOnLeaveRequestChange(user.id, new Date(startDate), new Date(endDate));

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
        leaveRequestId: leaveRequest.id
      }
    });

    const duration = performance.now() - start;
    logger.apiResponse('POST', '/api/leave/request', 201, duration, user.id, requestId);

    return apiSuccess(
      { 
        leaveRequest,
        leaveDays,
        message: `${type} leave request submitted successfully`
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
          validationErrors: error.details
        }
      });
      logger.apiResponse('POST', '/api/leave/request', error.statusCode, duration, undefined, requestId);
      return apiError(error, error.statusCode as any);
    }
    
    if (error instanceof AuthenticationError) {
      logger.securityEvent('authentication_failure', 'medium', undefined, {
        endpoint: '/api/leave/request',
        error: error.message
      });
      logger.apiResponse('POST', '/api/leave/request', error.statusCode, duration, undefined, requestId);
      return apiError(error, error.statusCode as any);
    }
    
    logger.error('Internal server error in leave request endpoint', {
      requestId,
      action: 'api_error',
      resource: '/api/leave/request'
    }, error instanceof Error ? error : new Error(String(error)));
    
    logger.apiResponse('POST', '/api/leave/request', 500, duration, undefined, requestId);
    return apiError('Internal server error');
  }
}

// GET endpoint to list leave requests
export async function GET() {
  try {
    const leaveRequests = await prisma.leaveRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return apiSuccess(
      { leaveRequests }
    );
  } catch (error) {
    return apiError('Internal server error');
  }
}
