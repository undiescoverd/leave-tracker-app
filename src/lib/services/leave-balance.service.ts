import { prisma } from '@/lib/prisma';
import { LeaveType, User } from '@prisma/client';
import { features } from '@/lib/features';

export interface LeaveBalance {
  annual: {
    total: number;
    used: number;
    remaining: number;
  };
  toil?: {
    total: number;
    used: number;
    remaining: number;
  };
  sick?: {
    total: number;
    used: number;
    remaining: number;
  };
}

/**
 * Get comprehensive leave balance for a user
 * Backward compatible - works with or without TOIL
 */
export async function getUserLeaveBalances(
  userId: string, 
  year: number = new Date().getFullYear()
): Promise<LeaveBalance> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      leaveRequests: {
        where: {
          status: 'APPROVED',
          startDate: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31)
          }
        }
      }
    }
  });

  if (!user) throw new Error('User not found');

  // Calculate used days by type
  const usedByType = {
    ANNUAL: 0,
    TOIL: 0,
    SICK: 0
  };

  for (const request of user.leaveRequests) {
    const days = calculateLeaveDays(
      new Date(request.startDate),
      new Date(request.endDate)
    );
    
    // Use type if available, default to ANNUAL for backward compatibility
    const leaveType = request.type || 'ANNUAL';
    usedByType[leaveType] += days;
  }

  // Build response based on enabled features
  const balance: LeaveBalance = {
    annual: {
      total: user.annualLeaveBalance ?? 32, // Fallback for existing records
      used: usedByType.ANNUAL,
      remaining: (user.annualLeaveBalance ?? 32) - usedByType.ANNUAL
    }
  };

  // Only include TOIL if feature enabled
  if (features.TOIL_ENABLED) {
    balance.toil = {
      total: user.toilBalance ?? 0,
      used: usedByType.TOIL,
      remaining: (user.toilBalance ?? 0) - usedByType.TOIL
    };
  }

  // Only include sick leave if feature enabled
  if (features.SICK_LEAVE_ENABLED) {
    balance.sick = {
      total: user.sickLeaveBalance ?? 3,
      used: usedByType.SICK,
      remaining: (user.sickLeaveBalance ?? 3) - usedByType.SICK
    };
  }

  return balance;
}

/**
 * Validate leave request based on type and balance
 */
export async function validateLeaveRequest(
  userId: string,
  type: LeaveType,
  startDate: Date,
  endDate: Date
): Promise<{ valid: boolean; error?: string }> {
  const days = calculateLeaveDays(startDate, endDate);
  const balances = await getUserLeaveBalances(userId);

  // Check balance based on type
  switch (type) {
    case 'ANNUAL':
      if (balances.annual.remaining < days) {
        return { 
          valid: false, 
          error: `Insufficient annual leave. You have ${balances.annual.remaining} days remaining.` 
        };
      }
      break;
      
    case 'TOIL':
      if (!features.TOIL_ENABLED) {
        return { valid: false, error: 'TOIL requests are not enabled' };
      }
      if (!balances.toil || balances.toil.remaining < days) {
        return { 
          valid: false, 
          error: `Insufficient TOIL balance. You have ${balances.toil?.remaining ?? 0} days remaining.` 
        };
      }
      break;
      
    case 'SICK':
      if (!features.SICK_LEAVE_ENABLED) {
        return { valid: false, error: 'Sick leave requests are not enabled' };
      }
      // Sick leave can go negative (statutory requirement)
      break;
  }

  return { valid: true };
}

/**
 * Calculate leave days (excluding weekends)
 * Backward compatible with existing implementation
 */
function calculateLeaveDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get legacy leave balance (for backward compatibility)
 * This maintains the existing API structure
 */
export async function getLegacyLeaveBalance(userId: string, year: number) {
  const balances = await getUserLeaveBalances(userId, year);
  
  return {
    totalAllowance: balances.annual.total,
    daysUsed: balances.annual.used,
    remaining: balances.annual.remaining,
    approvedLeaves: balances.annual.used > 0 ? 1 : 0, // Simplified for backward compatibility
  };
}
