import { supabaseAdmin } from '@/lib/supabase';
import { findById, findByDateRange } from '@/lib/supabase-helpers';
import { calculateWorkingDays } from '@/lib/date-utils';
import { LEAVE_CONFIG, UK_AGENTS } from '@/lib/config/business';
import { leaveBalanceCache, createCacheKey } from '@/lib/cache/cache-manager';
import { logger } from '@/lib/logger';
import { withPerformanceLogging } from '@/lib/logger';

/**
 * Type definitions for database tables
 */
interface User {
  id: string;
  email: string;
  name: string | null;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
  toilBalance: number;
}

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  status: string;
  type: string;
  hours: number | null;
  comments: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

/**
 * Get user's leave balance for a specific year (with caching)
 */
export const getUserLeaveBalance = withPerformanceLogging(
  async function getUserLeaveBalanceInner(userId: string, year: number) {
    const cacheKey = createCacheKey('user-balance', userId, year);

    // Check cache first
    const cached = leaveBalanceCache.get(cacheKey);
    if (cached) {
      logger.cacheOperation('hit', cacheKey);
      return cached;
    }

    logger.cacheOperation('miss', cacheKey);

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error(`User ${userId} not found`);
    }

    // Get user's approved leaves for the year
    const { data: leaveRequests, error: leavesError } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'APPROVED')
      .gte('start_date', startOfYear.toISOString())
      .lte('end_date', endOfYear.toISOString());

    if (leavesError) {
      throw new Error(`Error fetching leave requests: ${leavesError.message}`);
    }

    const leaves = leaveRequests || [];

    // Calculate total days used
    let daysUsed = 0;
    let toilHoursEarned = 0;
    let toilHoursUsed = 0;
    let sickDaysUsed = 0;

    for (const leave of leaves) {
      const leaveDays = calculateWorkingDays(
        new Date(leave.start_date),
        new Date(leave.end_date)
      );

      switch (leave.type) {
        case 'ANNUAL':
          daysUsed += leaveDays;
          break;
        case 'SICK':
          sickDaysUsed += leaveDays;
          break;
        case 'TOIL':
          // Handle TOIL credit vs usage based on hours field
          if (leave.hours && leave.hours > 0) {
            toilHoursEarned += leave.hours;
          } else {
            toilHoursUsed += leaveDays * 8; // Convert days to hours
          }
          break;
      }
    }

    const totalAllowance = user.annual_leave_balance || LEAVE_CONFIG.ANNUAL_LEAVE_ALLOWANCE;
    const remaining = totalAllowance - daysUsed;
    const toilBalance = toilHoursEarned - toilHoursUsed;

    const result = {
      totalAllowance,
      daysUsed,
      remaining,
      toilBalance: toilBalance / 8, // Convert back to days for display
      toilHours: toilBalance,
      sickDaysUsed,
      sickDaysRemaining: user.sick_leave_balance - sickDaysUsed,
      approvedLeaves: leaves.length,
      leaveHistory: leaves.map(leave => ({
        id: leave.id,
        startDate: leave.start_date,
        endDate: leave.end_date,
        type: leave.type,
        days: calculateWorkingDays(new Date(leave.start_date), new Date(leave.end_date)),
        hours: leave.hours,
      })),
    };

    // Cache the result for 10 minutes
    leaveBalanceCache.set(cacheKey, result, 10 * 60 * 1000);
    logger.cacheOperation('set', cacheKey, 10 * 60 * 1000);

    return result;
  },
  'getUserLeaveBalance'
);

/**
 * Check if there's a conflict with UK agents (optimized)
 */
export const checkUKAgentConflict = withPerformanceLogging(
  async function checkUKAgentConflictInner(
    startDate: Date,
    endDate: Date,
    excludeUserId?: string
  ): Promise<{ hasConflict: boolean; conflictingAgents: string[] }> {
    // Get UK agents from configuration
    const ukAgentEmails = UK_AGENTS.EMAILS;

    // Build the query for overlapping leave dates
    // In Supabase, we need to use .or() for complex conditions
    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        start_date,
        end_date,
        user:users!leave_requests_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('status', 'APPROVED')
      .in('users.email', ukAgentEmails)
      .or(`start_date.gte.${startDate.toISOString()},start_date.lte.${endDate.toISOString()},end_date.gte.${startDate.toISOString()},end_date.lte.${endDate.toISOString()}`);

    // Alternative approach: Use multiple queries and combine results
    // This is more reliable than the complex .or() syntax
    const { data: conflicts1 } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        user:users!leave_requests_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('status', 'APPROVED')
      .gte('start_date', startDate.toISOString())
      .lte('start_date', endDate.toISOString());

    const { data: conflicts2 } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        user:users!leave_requests_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('status', 'APPROVED')
      .gte('end_date', startDate.toISOString())
      .lte('end_date', endDate.toISOString());

    const { data: conflicts3 } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        user:users!leave_requests_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('status', 'APPROVED')
      .lte('start_date', startDate.toISOString())
      .gte('end_date', endDate.toISOString());

    // Combine and deduplicate conflicts
    const allConflicts = [...(conflicts1 || []), ...(conflicts2 || []), ...(conflicts3 || [])];
    const uniqueConflicts = Array.from(
      new Map(allConflicts.map(item => [item.id, item])).values()
    );

    // Filter for UK agents and exclude the current user
    const filteredConflicts = uniqueConflicts.filter(c => {
      const userEmail = (c.user as any)?.email;
      return (
        ukAgentEmails.includes(userEmail) &&
        (!excludeUserId || (c.user as any)?.id !== excludeUserId)
      );
    });

    return {
      hasConflict: filteredConflicts.length > 0,
      conflictingAgents: filteredConflicts.map(c => (c.user as any)?.name || (c.user as any)?.email),
    };
  },
  'checkUKAgentConflict'
);

/**
 * Get multiple users' leave balances efficiently (batch operation)
 */
export const getBatchUserLeaveBalances = withPerformanceLogging(
  async function getBatchUserLeaveBalancesInner(
    userIds: string[],
    year: number
  ) {
    // Check cache for each user
    const results = new Map<string, any>();
    const uncachedUserIds: string[] = [];

    for (const userId of userIds) {
      const cacheKey = createCacheKey('user-balance', userId, year);
      const cached = leaveBalanceCache.get(cacheKey);

      if (cached) {
        results.set(userId, cached);
        logger.cacheOperation('hit', cacheKey);
      } else {
        uncachedUserIds.push(userId);
        logger.cacheOperation('miss', cacheKey);
      }
    }

    if (uncachedUserIds.length === 0) {
      return results;
    }

    // Get all uncached users
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .in('id', uncachedUserIds);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    // Get all leave requests for these users in one query
    const { data: allLeaveRequests, error: leavesError } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .in('user_id', uncachedUserIds)
      .eq('status', 'APPROVED')
      .gte('start_date', startOfYear.toISOString())
      .lte('end_date', endOfYear.toISOString());

    if (leavesError) {
      throw new Error(`Error fetching leave requests: ${leavesError.message}`);
    }

    // Group leave requests by user
    const leaveRequestsByUser = new Map<string, any[]>();
    for (const leave of allLeaveRequests || []) {
      if (!leaveRequestsByUser.has(leave.user_id)) {
        leaveRequestsByUser.set(leave.user_id, []);
      }
      leaveRequestsByUser.get(leave.user_id)!.push(leave);
    }

    // Process each user's data and cache the results
    for (const user of users || []) {
      const userId = user.id;
      const leaves = leaveRequestsByUser.get(userId) || [];

      // Calculate balances (same logic as single user function)
      let daysUsed = 0;
      let toilHoursEarned = 0;
      let toilHoursUsed = 0;
      let sickDaysUsed = 0;

      for (const leave of leaves) {
        const leaveDays = calculateWorkingDays(
          new Date(leave.start_date),
          new Date(leave.end_date)
        );

        switch (leave.type) {
          case 'ANNUAL':
            daysUsed += leaveDays;
            break;
          case 'SICK':
            sickDaysUsed += leaveDays;
            break;
          case 'TOIL':
            if (leave.hours && leave.hours > 0) {
              toilHoursEarned += leave.hours;
            } else {
              toilHoursUsed += leaveDays * 8;
            }
            break;
        }
      }

      const totalAllowance = user.annual_leave_balance || LEAVE_CONFIG.ANNUAL_LEAVE_ALLOWANCE;
      const remaining = totalAllowance - daysUsed;
      const toilBalance = toilHoursEarned - toilHoursUsed;

      const result = {
        totalAllowance,
        daysUsed,
        remaining,
        toilBalance: toilBalance / 8,
        toilHours: toilBalance,
        sickDaysUsed,
        sickDaysRemaining: user.sick_leave_balance - sickDaysUsed,
        approvedLeaves: leaves.length,
        leaveHistory: leaves.map(leave => ({
          id: leave.id,
          startDate: leave.start_date,
          endDate: leave.end_date,
          type: leave.type,
          days: calculateWorkingDays(new Date(leave.start_date), new Date(leave.end_date)),
          hours: leave.hours,
        })),
      };

      results.set(userId, result);

      // Cache the result
      const cacheKey = createCacheKey('user-balance', userId, year);
      leaveBalanceCache.set(cacheKey, result, 10 * 60 * 1000);
      logger.cacheOperation('set', cacheKey, 10 * 60 * 1000);
    }

    return results;
  },
  'getBatchUserLeaveBalances'
);

/**
 * Get team calendar data optimized for large datasets
 */
export const getTeamCalendarData = withPerformanceLogging(
  async function getTeamCalendarDataInner(
    startDate: Date,
    endDate: Date,
    userIds?: string[]
  ) {
    const cacheKey = createCacheKey(
      'team-calendar-data',
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      userIds?.join(',') || 'all'
    );

    const cached = leaveBalanceCache.get(cacheKey);
    if (cached) {
      logger.cacheOperation('hit', cacheKey);
      return cached;
    }

    logger.cacheOperation('miss', cacheKey);

    // Build query
    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        user:users!leave_requests_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .order('start_date', { ascending: true });

    // Add user filter if specified
    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    // Fetch requests in date ranges (similar to Prisma OR logic)
    // We'll do three separate queries and combine them
    const { data: requests1 } = await query
      .gte('start_date', startDate.toISOString())
      .lte('start_date', endDate.toISOString());

    const { data: requests2 } = await query
      .gte('end_date', startDate.toISOString())
      .lte('end_date', endDate.toISOString());

    const { data: requests3 } = await query
      .lte('start_date', startDate.toISOString())
      .gte('end_date', endDate.toISOString());

    // Combine and deduplicate
    const allRequests = [...(requests1 || []), ...(requests2 || []), ...(requests3 || [])];
    const uniqueRequests = Array.from(
      new Map(allRequests.map(item => [item.id, item])).values()
    );

    const result = {
      totalRequests: uniqueRequests.length,
      requests: uniqueRequests.map((request: any) => ({
        id: request.id,
        user: {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
        },
        startDate: request.start_date.split('T')[0],
        endDate: request.end_date.split('T')[0],
        type: request.type,
        status: request.status,
        comments: request.comments,
        hours: request.hours,
      })),
    };

    // Cache for 2 minutes
    leaveBalanceCache.set(cacheKey, result, 2 * 60 * 1000);
    logger.cacheOperation('set', cacheKey, 2 * 60 * 1000);

    return result;
  },
  'getTeamCalendarData'
);
