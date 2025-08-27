import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
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

// UK agent conflict detection
async function checkUKAgentConflicts(startDate: Date, endDate: Date, currentUserId: string) {
  // Get all UK agents (users with role USER)
  const ukAgents = await prisma.user.findMany({
    where: {
      role: 'USER',
      id: { not: currentUserId } // Exclude current user
    },
    include: {
      leaveRequests: {
        where: {
          status: { in: ['PENDING', 'APPROVED'] }
        }
      }
    }
  });

  const conflicts: Array<{ agent: string, dates: string }> = [];

  for (const agent of ukAgents) {
    for (const request of agent.leaveRequests) {
      // Check if date ranges overlap
      if (
        (startDate <= request.endDate && endDate >= request.startDate) ||
        (request.startDate <= endDate && request.endDate >= startDate)
      ) {
        conflicts.push({
          agent: agent.name || agent.email,
          dates: `${request.startDate.toISOString().split('T')[0]} to ${request.endDate.toISOString().split('T')[0]}`
        });
      }
    }
  }

  return conflicts;
}

// Calculate working days (excluding weekends)
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let workingDays = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user?.email) {
      throw new AuthenticationError('You must be logged in to submit a leave request');
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

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
      'sup.dhanasunthorn@tdhagency.com',
      'luis.drake@tdhagency.com'
    ];
    
    if (ukAgentEmails.includes(session.user.email)) {
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
      return apiError(error, error.statusCode);
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
