import { prisma } from '@/lib/prisma';
import { ToilType } from '@prisma/client';

/**
 * Contract-based TOIL calculation rules
 */
// const TOIL_RULES = {
//   TRAVEL_LATE_RETURN: {
//     '19:00': 1,  // 7pm = 1 hour
//     '20:00': 2,  // 8pm = 2 hours
//     '21:00': 3,  // 9pm = 3 hours
//     '22:00': 'next_day_1pm' // 10pm+ = 1pm start
//   },
//   WEEKEND_TRAVEL: 4, // Fixed 4 hours
//   AGENT_PANEL_DAY: 'next_day_1pm',
//   OVERTIME: 1 // 1:1 ratio for general overtime
// };

/**
 * Create a TOIL entry for an employee
 */
export async function createToilEntry(
  userId: string,
  data: {
    date: Date;
    type: ToilType;
    hours: number;
    reason: string;
  }
) {
  // Validate user exists and get their current balance
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) throw new Error('User not found');

  // Create TOIL entry (pending approval)
  const toilEntry = await prisma.toilEntry.create({
    data: {
      userId,
      ...data,
      approved: false
    }
  });

  return toilEntry;
}

/**
 * Approve a TOIL entry and update balance
 */
export async function approveToilEntry(
  toilEntryId: string,
  approvedBy: string
) {
  return await prisma.$transaction(async (tx) => {
    // Get the TOIL entry
    const entry = await tx.toilEntry.findUnique({
      where: { id: toilEntryId }
    });
    
    if (!entry) throw new Error('TOIL entry not found');
    if (entry.approved) throw new Error('TOIL entry already approved');

    // Get current user balance for audit trail
    const user = await tx.user.findUnique({
      where: { id: entry.userId }
    });
    
    if (!user) throw new Error('User not found');

    // Update entry as approved
    await tx.toilEntry.update({
      where: { id: toilEntryId },
      data: {
        approved: true,
        approvedBy,
        approvedAt: new Date(),
        previousBalance: user.toilBalance,
        newBalance: user.toilBalance + entry.hours
      }
    });

    // Update user's TOIL balance
    await tx.user.update({
      where: { id: entry.userId },
      data: {
        toilBalance: {
          increment: entry.hours
        }
      }
    });

    return entry;
  });
}

/**
 * Reject a TOIL entry
 */
export async function rejectToilEntry(
  toilEntryId: string,
  rejectedBy: string,
  reason?: string
) {
  const entry = await prisma.toilEntry.findUnique({
    where: { id: toilEntryId }
  });
  
  if (!entry) throw new Error('TOIL entry not found');
  if (entry.approved) throw new Error('TOIL entry already approved');

  return await prisma.toilEntry.update({
    where: { id: toilEntryId },
    data: {
      approved: false,
      approvedBy: rejectedBy,
      approvedAt: new Date(),
      adjustmentReason: reason || 'Rejected by admin'
    }
  });
}

/**
 * Calculate TOIL hours based on contract rules
 */
export function calculateToilHours(
  type: ToilType,
  returnTime?: string // Format: "HH:MM"
): number | string {
  switch (type) {
    case 'WEEKEND_TRAVEL':
      return 4;
      
    case 'TRAVEL_LATE_RETURN':
      if (!returnTime) throw new Error('Return time required for late travel');
      const hour = parseInt(returnTime.split(':')[0]);
      
      if (hour >= 22) return 'next_day_1pm';
      if (hour >= 21) return 3;
      if (hour >= 20) return 2;
      if (hour >= 19) return 1;
      return 0;
      
    case 'AGENT_PANEL_DAY':
      return 'next_day_1pm';
      
    case 'OVERTIME':
    default:
      return 1; // Default 1:1 ratio
  }
}

/**
 * Get TOIL entries for a user or all users (admin)
 */
export async function getToilEntries(userId?: string, includeUser = true) {
  const where = userId ? { userId } : {};
  
  return await prisma.toilEntry.findMany({
    where,
    include: includeUser ? {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    } : undefined,
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get pending TOIL entries (for admin approval)
 */
export async function getPendingToilEntries() {
  return await prisma.toilEntry.findMany({
    where: { approved: false },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get TOIL balance for a user
 */
export async function getUserToilBalance(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { toilBalance: true }
  });
  
  if (!user) throw new Error('User not found');
  
  return user.toilBalance ?? 0;
}
