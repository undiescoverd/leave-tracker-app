import { supabaseAdmin } from '@/lib/supabase';
import { features } from '@/lib/features';
import { calculateWorkingDays } from '@/lib/date-utils';

export type LeaveType = 'ANNUAL' | 'TOIL' | 'SICK';

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
  // Get user
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  // Get approved leave requests for the year
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  const { data: leaveRequests, error: leavesError } = await supabaseAdmin
    .from('leave_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'APPROVED')
    .gte('start_date', startOfYear.toISOString())
    .lte('start_date', endOfYear.toISOString());

  if (leavesError) {
    throw new Error(`Failed to fetch leave requests: ${leavesError.message}`);
  }

  // Calculate used days by type
  const usedByType = {
    ANNUAL: 0,
    TOIL: 0,
    SICK: 0,
  };

  for (const request of leaveRequests || []) {
    const days = calculateWorkingDays(
      new Date(request.start_date),
      new Date(request.end_date)
    );

    // Use type if available, default to ANNUAL for backward compatibility
    const leaveType = (request.type || 'ANNUAL') as LeaveType;
    usedByType[leaveType] += days;
  }

  // Build response based on enabled features
  const balance: LeaveBalance = {
    annual: {
      total: user.annual_leave_balance ?? 32, // Fallback for existing records
      used: usedByType.ANNUAL,
      remaining: (user.annual_leave_balance ?? 32) - usedByType.ANNUAL,
    },
  };

  // Only include TOIL if feature enabled
  if (features.TOIL_ENABLED) {
    balance.toil = {
      total: user.toil_balance ?? 0,
      used: usedByType.TOIL,
      remaining: (user.toil_balance ?? 0) - usedByType.TOIL,
    };
  }

  // Only include sick leave if feature enabled
  if (features.SICK_LEAVE_ENABLED) {
    balance.sick = {
      total: user.sick_leave_balance ?? 3,
      used: usedByType.SICK,
      remaining: (user.sick_leave_balance ?? 3) - usedByType.SICK,
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
  const days = calculateWorkingDays(startDate, endDate);
  const balances = await getUserLeaveBalances(userId);

  // Check balance based on type
  switch (type) {
    case 'ANNUAL':
      if (balances.annual.remaining < days) {
        return {
          valid: false,
          error: `Insufficient annual leave. You have ${balances.annual.remaining} days remaining.`,
        };
      }
      break;

    case 'TOIL':
      if (!features.TOIL_ENABLED) {
        return { valid: false, error: 'TOIL requests are not enabled' };
      }
      // For TOIL, we don't validate against balance since TOIL is earned through travel
      // The hours are calculated based on the scenario, not deducted from a balance
      // TOIL requests are always valid as long as the feature is enabled
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
