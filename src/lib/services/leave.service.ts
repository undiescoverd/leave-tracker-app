import { prisma } from '@/lib/prisma';
import { LeaveStatus } from '@prisma/client';
import { calculateWorkingDays } from '@/lib/date-utils';

/**
 * Calculate number of leave days (excluding weekends)
 * @deprecated Use calculateWorkingDays from @/lib/date-utils instead
 */
export function calculateLeaveDays(startDate: Date, endDate: Date): number {
  return calculateWorkingDays(startDate, endDate);
}

/**
 * Get user's leave balance for a specific year
 */
export async function getUserLeaveBalance(userId: string, year: number) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  // Get all approved leaves for the year
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      startDate: {
        gte: startOfYear,
      },
      endDate: {
        lte: endOfYear,
      },
    },
  });

  // Calculate total days used
  let daysUsed = 0;
  for (const leave of approvedLeaves) {
    daysUsed += calculateLeaveDays(
      new Date(leave.startDate),
      new Date(leave.endDate)
    );
  }

  const totalAllowance = 32; // Annual leave allowance
  const remaining = totalAllowance - daysUsed;

  return {
    totalAllowance,
    daysUsed,
    remaining,
    approvedLeaves: approvedLeaves.length,
  };
}

/**
 * Check if there's a conflict with UK agents
 */
export async function checkUKAgentConflict(
  startDate: Date,
  endDate: Date,
  excludeUserId?: string
): Promise<{ hasConflict: boolean; conflictingAgents: string[] }> {
  // Get UK agents (you'll need to add a location field to User model later)
  // For now, we'll check by email domain or specific emails
  const ukAgentEmails = [
    'sup@tdhagency.com',
    'luis@tdhagency.com'
  ];

  // Find UK agents
  const ukAgents = await prisma.user.findMany({
    where: {
      email: {
        in: ukAgentEmails,
      },
      ...(excludeUserId && { id: { not: excludeUserId } }),
    },
  });

  // Check for overlapping approved leaves
  const conflicts = await prisma.leaveRequest.findMany({
    where: {
      userId: {
        in: ukAgents.map(agent => agent.id),
      },
      status: 'APPROVED',
      OR: [
        {
          // New leave starts during existing leave
          startDate: {
            lte: endDate,
            gte: startDate,
          },
        },
        {
          // New leave ends during existing leave
          endDate: {
            lte: endDate,
            gte: startDate,
          },
        },
        {
          // New leave completely overlaps existing leave
          startDate: {
            lte: startDate,
          },
          endDate: {
            gte: endDate,
          },
        },
      ],
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

  return {
    hasConflict: conflicts.length > 0,
    conflictingAgents: conflicts.map(c => c.user.name || c.user.email),
  };
}
