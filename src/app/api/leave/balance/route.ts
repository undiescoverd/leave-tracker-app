import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { AuthenticationError } from '@/lib/api/errors';
import { getUserLeaveBalance } from '@/lib/services/leave.service';
import { getUserLeaveBalances } from '@/lib/services/leave-balance.service';
import { features } from '@/lib/features';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Get user's leave balance for current year
    const balance = await getUserLeaveBalance(user.id, currentYear);

    // Get pending requests data
    const pendingRequests = await getUserLeaveBalances(user.id, currentYear);
    
    // Calculate pending days by type
    const pendingData = await calculatePendingLeaveByType(user.id, currentYear);

    // Return appropriate response based on features
    const response: any = {
      data: {
        // Always include annual leave (backward compatible)
        totalAllowance: balance.totalAllowance,
        daysUsed: balance.daysUsed,
        remaining: balance.remaining,
        
        // New structure if multi-type enabled
        ...(features.isMultiLeaveTypeEnabled() && {
          balances: {
            annual: {
              total: balance.totalAllowance,
              used: balance.daysUsed,
              remaining: balance.remaining
            }
          }
        }),
        
        // Include pending requests data
        pending: pendingData
      }
    };

    // Add TOIL and sick leave if enabled
    if (features.TOIL_ENABLED || features.SICK_LEAVE_ENABLED) {
      const multiBalances = await getUserLeaveBalances(user.id, currentYear);
      
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

    return apiSuccess(response.data);

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return apiError(error.message, error.statusCode as any);
    }
    return apiError('Internal server error', 500);
  }
}

// Helper function to calculate pending leave by type
async function calculatePendingLeaveByType(userId: string, year: number) {
  const { prisma } = await import('@/lib/prisma');
  
  const pendingRequests = await prisma.leaveRequest.findMany({
    where: {
      userId: userId,
      status: 'PENDING',
      startDate: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31)
      }
    }
  });

  const pending = {
    annual: 0,
    toil: 0,
    sick: 0,
    total: 0
  };

  for (const request of pendingRequests) {
    const days = calculateLeaveDays(
      new Date(request.startDate),
      new Date(request.endDate)
    );
    
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

// Calculate leave days helper
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
