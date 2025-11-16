import { prisma } from '@/lib/prisma';
import { calculateWorkingDays } from '@/lib/date-utils';
import { LEAVE_CONFIG, UK_AGENTS } from '@/lib/config/business';
import { leaveBalanceCache, createCacheKey } from '@/lib/cache/cache-manager';
import { logger } from '@/lib/logger';
import { withPerformanceLogging } from '@/lib/logger';


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

    // Get user with all their approved leaves for the year in one query
    const userWithLeaves = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        leaveRequests: {
          where: {
            status: 'APPROVED',
            startDate: { gte: startOfYear },
            endDate: { lte: endOfYear },
          },
        },
      },
    });

    if (!userWithLeaves) {
      throw new Error(`User ${userId} not found`);
    }

    // Calculate total days used
    let daysUsed = 0;
    let toilHoursEarned = 0;
    let toilHoursUsed = 0;
    let sickDaysUsed = 0;
    
    for (const leave of userWithLeaves.leaveRequests) {
      const leaveDays = calculateWorkingDays(
        new Date(leave.startDate),
        new Date(leave.endDate)
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

    const totalAllowance = userWithLeaves.annualLeaveBalance || LEAVE_CONFIG.ANNUAL_LEAVE_ALLOWANCE;
    const remaining = totalAllowance - daysUsed;
    const toilBalance = toilHoursEarned - toilHoursUsed;

    const result = {
      totalAllowance,
      daysUsed,
      remaining,
      toilBalance: toilBalance / 8, // Convert back to days for display
      toilHours: toilBalance,
      sickDaysUsed,
      sickDaysRemaining: userWithLeaves.sickLeaveBalance - sickDaysUsed,
      approvedLeaves: userWithLeaves.leaveRequests.length,
      leaveHistory: userWithLeaves.leaveRequests.map(leave => ({
        id: leave.id,
        startDate: leave.startDate.toISOString(),
        endDate: leave.endDate.toISOString(),
        type: leave.type,
        days: calculateWorkingDays(new Date(leave.startDate), new Date(leave.endDate)),
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

    // Single query to get UK agents and their conflicting leaves
    const conflicts = await prisma.leaveRequest.findMany({
      where: {
        user: {
          email: {
            in: ukAgentEmails,
          },
          ...(excludeUserId && { id: { not: excludeUserId } }),
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
            id: true,
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

    // Single query to get all uncached users with their leaves
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const usersWithLeaves = await prisma.user.findMany({
      where: { id: { in: uncachedUserIds } },
      include: {
        leaveRequests: {
          where: {
            status: 'APPROVED',
            startDate: { gte: startOfYear },
            endDate: { lte: endOfYear },
          },
        },
      },
    });

    // Process each user's data and cache the results
    for (const userWithLeaves of usersWithLeaves) {
      const userId = userWithLeaves.id;
      
      // Calculate balances (same logic as single user function)
      let daysUsed = 0;
      let toilHoursEarned = 0;
      let toilHoursUsed = 0;
      let sickDaysUsed = 0;
      
      for (const leave of userWithLeaves.leaveRequests) {
        const leaveDays = calculateWorkingDays(
          new Date(leave.startDate),
          new Date(leave.endDate)
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

      const totalAllowance = userWithLeaves.annualLeaveBalance || LEAVE_CONFIG.ANNUAL_LEAVE_ALLOWANCE;
      const remaining = totalAllowance - daysUsed;
      const toilBalance = toilHoursEarned - toilHoursUsed;

      const result = {
        totalAllowance,
        daysUsed,
        remaining,
        toilBalance: toilBalance / 8,
        toilHours: toilBalance,
        sickDaysUsed,
        sickDaysRemaining: userWithLeaves.sickLeaveBalance - sickDaysUsed,
        approvedLeaves: userWithLeaves.leaveRequests.length,
        leaveHistory: userWithLeaves.leaveRequests.map(leave => ({
          id: leave.id,
          startDate: leave.startDate.toISOString(),
          endDate: leave.endDate.toISOString(),
          type: leave.type,
          days: calculateWorkingDays(new Date(leave.startDate), new Date(leave.endDate)),
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

    // Optimized query with proper includes
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        ...(userIds && { userId: { in: userIds } }),
        OR: [
          {
            startDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            endDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: endDate } },
            ],
          },
        ],
      },
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
        startDate: 'asc',
      },
    });

    const result = {
      totalRequests: leaveRequests.length,
      requests: leaveRequests.map((request) => ({
        id: request.id,
        user: {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
        },
        startDate: request.startDate.toISOString().split('T')[0],
        endDate: request.endDate.toISOString().split('T')[0],
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
