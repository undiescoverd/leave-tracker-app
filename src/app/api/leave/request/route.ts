import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { z } from 'zod';
import { ValidationError, AuthenticationError } from '@/lib/api/errors';
import { calculateLeaveDays, checkUKAgentConflict, getUserLeaveBalance } from '@/lib/services/leave.service';
import { validateLeaveRequest } from '@/lib/services/leave-balance.service';
import { features } from '@/lib/features';

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
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser();

    // Parse and validate request body
    const body = await req.json();
    
    const validationResult = createLeaveRequestSchema.safeParse(body);
    
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
    const leaveDays = calculateLeaveDays(
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
    const ukAgentEmails = [
      'sup@tdhagency.com',
      'luis@tdhagency.com'
    ];
    
    if (ukAgentEmails.includes(user.email)) {
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
    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return apiError(error, error.statusCode as any);
    }
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
