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
        })
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
