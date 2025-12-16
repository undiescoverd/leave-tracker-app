import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
  getUserLeaveBalance,
  checkUKAgentConflict,
  getBatchUserLeaveBalances,
  getTeamCalendarData
} from '@/lib/services/leave.service.supabase';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateWorkingDays } from '@/lib/date-utils';
import './setup';

// Mock dependencies
jest.mock('@/lib/date-utils', () => ({
  calculateWorkingDays: jest.fn(),
}));

jest.mock('@/lib/config/business', () => ({
  LEAVE_CONFIG: {
    ANNUAL_LEAVE_ALLOWANCE: 32
  },
  UK_AGENTS: {
    EMAILS: ['uk.agent1@company.com', 'uk.agent2@company.com']
  }
}));

jest.mock('@/lib/cache/cache-manager', () => ({
  leaveBalanceCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
  createCacheKey: jest.fn((...args) => args.join('-')),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    cacheOperation: jest.fn(),
  },
  withPerformanceLogging: jest.fn((fn) => fn), // Pass through the function
}));

const mockCalculateWorkingDays = calculateWorkingDays as jest.MockedFunction<typeof calculateWorkingDays>;

interface MockCacheManager {
  leaveBalanceCache: {
    get: jest.Mock;
    set: jest.Mock;
  };
}

const { leaveBalanceCache } = jest.requireMock('@/lib/cache/cache-manager') as MockCacheManager;

describe('Leave Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserLeaveBalance', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        totalAllowance: 32,
        daysUsed: 5,
        remaining: 27,
        toilBalance: 1,
        toilHours: 8,
        sickDaysUsed: 0,
        sickDaysRemaining: 3,
        approvedLeaves: 1,
        leaveHistory: []
      };

      leaveBalanceCache.get.mockReturnValue(cachedResult);

      const result = await getUserLeaveBalance('user-1', 2024);

      expect(result).toEqual(cachedResult);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should calculate and cache result when not cached', async () => {
      leaveBalanceCache.get.mockReturnValue(null);

      const mockUser = {
        id: 'user-1',
        annualLeaveBalance: 32,
        sickLeaveBalance: 3,
        leaveRequests: [
          {
            id: 'req-1',
            startDate: new Date('2024-06-01'),
            endDate: new Date('2024-06-05'),
            type: 'ANNUAL',
            status: 'APPROVED',
            hours: null
          },
          {
            id: 'req-2',
            startDate: new Date('2024-07-01'),
            endDate: new Date('2024-07-02'),
            type: 'TOIL',
            status: 'APPROVED',
            hours: 8 // TOIL earned
          },
          {
            id: 'req-3',
            startDate: new Date('2024-08-01'),
            endDate: new Date('2024-08-01'),
            type: 'SICK',
            status: 'APPROVED',
            hours: null
          }
        ]
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockCalculateWorkingDays
        .mockReturnValueOnce(5) // Annual leave
        .mockReturnValueOnce(2) // TOIL usage (ignored because hours > 0)
        .mockReturnValueOnce(1) // Sick leave
        .mockReturnValueOnce(5) // For history calculation
        .mockReturnValueOnce(2) // For history calculation
        .mockReturnValueOnce(1); // For history calculation

      const result = await getUserLeaveBalance('user-1', 2024);

      expect(result).toEqual({
        totalAllowance: 32,
        daysUsed: 5,
        remaining: 27,
        toilBalance: 1, // 8 hours / 8 = 1 day
        toilHours: 8,
        sickDaysUsed: 1,
        sickDaysRemaining: 2,
        approvedLeaves: 3,
        leaveHistory: [
          {
            id: 'req-1',
            startDate: '2024-06-01T00:00:00.000Z',
            endDate: '2024-06-05T00:00:00.000Z',
            type: 'ANNUAL',
            days: 5,
            hours: null
          },
          {
            id: 'req-2',
            startDate: '2024-07-01T00:00:00.000Z',
            endDate: '2024-07-02T00:00:00.000Z',
            type: 'TOIL',
            days: 2,
            hours: 8
          },
          {
            id: 'req-3',
            startDate: '2024-08-01T00:00:00.000Z',
            endDate: '2024-08-01T00:00:00.000Z',
            type: 'SICK',
            days: 1,
            hours: null
          }
        ]
      });

      expect(leaveBalanceCache.set).toHaveBeenCalled();
    });

    it('should handle TOIL usage without hours field', async () => {
      leaveBalanceCache.get.mockReturnValue(null);

      const mockUser = {
        id: 'user-1',
        annualLeaveBalance: 32,
        sickLeaveBalance: 3,
        leaveRequests: [
          {
            id: 'req-1',
            startDate: new Date('2024-07-01'),
            endDate: new Date('2024-07-02'),
            type: 'TOIL',
            status: 'APPROVED',
            hours: null // TOIL usage, not earned
          }
        ]
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockCalculateWorkingDays
        .mockReturnValueOnce(2) // TOIL usage
        .mockReturnValueOnce(2); // For history

      const result = await getUserLeaveBalance('user-1', 2024);

      expect(result.toilBalance).toBe(-2); // (0 - 16) / 8 = -2 days
      expect(result.toilHours).toBe(-16); // 2 days * 8 hours
    });

    it('should throw error for non-existent user', async () => {
      leaveBalanceCache.get.mockReturnValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getUserLeaveBalance('non-existent', 2024))
        .rejects.toThrow('User non-existent not found');
    });
  });

  describe('checkUKAgentConflict', () => {
    it('should detect conflicts with UK agents', async () => {
      const conflictingRequests = [
        {
          user: {
            id: 'uk-agent-1',
            name: 'UK Agent 1',
            email: 'uk.agent1@company.com'
          }
        },
        {
          user: {
            id: 'uk-agent-2',
            name: 'UK Agent 2',
            email: 'uk.agent2@company.com'
          }
        }
      ];

      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue(conflictingRequests);

      const result = await checkUKAgentConflict(
        new Date('2024-06-01'),
        new Date('2024-06-05')
      );

      expect(result).toEqual({
        hasConflict: true,
        conflictingAgents: ['UK Agent 1', 'UK Agent 2']
      });

      // Verify the query was constructed correctly
      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith({
        where: {
          user: {
            email: {
              in: ['uk.agent1@company.com', 'uk.agent2@company.com']
            }
          },
          status: 'APPROVED',
          OR: expect.any(Array)
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });

    it('should return no conflicts when none exist', async () => {
      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      const result = await checkUKAgentConflict(
        new Date('2024-06-01'),
        new Date('2024-06-05')
      );

      expect(result).toEqual({
        hasConflict: false,
        conflictingAgents: []
      });
    });

    it('should exclude specified user from conflict check', async () => {
      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      await checkUKAgentConflict(
        new Date('2024-06-01'),
        new Date('2024-06-05'),
        'exclude-user-id'
      );

      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: expect.objectContaining({
              id: { not: 'exclude-user-id' }
            })
          })
        })
      );
    });

    it('should handle agents with missing names gracefully', async () => {
      const conflictingRequests = [
        {
          user: {
            id: 'uk-agent-1',
            name: null,
            email: 'uk.agent1@company.com'
          }
        }
      ];

      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue(conflictingRequests);

      const result = await checkUKAgentConflict(
        new Date('2024-06-01'),
        new Date('2024-06-05')
      );

      expect(result.conflictingAgents).toEqual(['uk.agent1@company.com']);
    });
  });

  describe('getBatchUserLeaveBalances', () => {
    it('should return cached results when available', async () => {
      const userIds = ['user-1', 'user-2'];
      const cachedResult1 = { totalAllowance: 32, daysUsed: 5 };
      const cachedResult2 = { totalAllowance: 32, daysUsed: 10 };

      leaveBalanceCache.get
        .mockReturnValueOnce(cachedResult1) // user-1
        .mockReturnValueOnce(cachedResult2); // user-2

      const result = await getBatchUserLeaveBalances(userIds, 2024);

      expect(result.size).toBe(2);
      expect(result.get('user-1')).toEqual(cachedResult1);
      expect(result.get('user-2')).toEqual(cachedResult2);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should fetch and cache uncached users', async () => {
      const userIds = ['user-1', 'user-2'];
      
      leaveBalanceCache.get
        .mockReturnValueOnce({ cached: 'data' }) // user-1 cached
        .mockReturnValueOnce(null); // user-2 not cached

      const mockUsers = [
        {
          id: 'user-2',
          annualLeaveBalance: 32,
          sickLeaveBalance: 3,
          leaveRequests: [
            {
              startDate: new Date('2024-06-01'),
              endDate: new Date('2024-06-05'),
              type: 'ANNUAL',
              status: 'APPROVED',
              hours: null
            }
          ]
        }
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      mockCalculateWorkingDays
        .mockReturnValueOnce(5) // For calculation
        .mockReturnValueOnce(5); // For history

      const result = await getBatchUserLeaveBalances(userIds, 2024);

      expect(result.size).toBe(2);
      expect(result.get('user-1')).toEqual({ cached: 'data' });
      expect(result.get('user-2')).toMatchObject({
        totalAllowance: 32,
        daysUsed: 5,
        remaining: 27
      });
    });

    it('should handle empty user list', async () => {
      const result = await getBatchUserLeaveBalances([], 2024);

      expect(result.size).toBe(0);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getTeamCalendarData', () => {
    it('should return cached calendar data when available', async () => {
      const cachedData = {
        totalRequests: 5,
        requests: [{ id: 'req-1', user: { name: 'Test User' } }]
      };

      leaveBalanceCache.get.mockReturnValue(cachedData);

      const result = await getTeamCalendarData(
        new Date('2024-06-01'),
        new Date('2024-06-30')
      );

      expect(result).toEqual(cachedData);
      expect(prisma.leaveRequest.findMany).not.toHaveBeenCalled();
    });

    it('should fetch and cache calendar data when not cached', async () => {
      leaveBalanceCache.get.mockReturnValue(null);

      const mockRequests = [
        {
          id: 'req-1',
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-05'),
          type: 'ANNUAL',
          status: 'APPROVED',
          comments: 'Vacation',
          hours: null,
          user: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com'
          }
        }
      ];

      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue(mockRequests);

      const result = await getTeamCalendarData(
        new Date('2024-06-01'),
        new Date('2024-06-30')
      );

      expect(result).toEqual({
        totalRequests: 1,
        requests: [
          {
            id: 'req-1',
            user: {
              id: 'user-1',
              name: 'Test User',
              email: 'test@example.com'
            },
            startDate: '2024-06-01',
            endDate: '2024-06-05',
            type: 'ANNUAL',
            status: 'APPROVED',
            comments: 'Vacation',
            hours: null
          }
        ]
      });

      expect(leaveBalanceCache.set).toHaveBeenCalled();
    });

    it('should filter by user IDs when provided', async () => {
      leaveBalanceCache.get.mockReturnValue(null);
      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      const userIds = ['user-1', 'user-2'];
      
      await getTeamCalendarData(
        new Date('2024-06-01'),
        new Date('2024-06-30'),
        userIds
      );

      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { in: userIds }
          })
        })
      );
    });

    it('should handle overlapping leave requests correctly', async () => {
      leaveBalanceCache.get.mockReturnValue(null);
      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      await getTeamCalendarData(
        new Date('2024-06-15'),
        new Date('2024-06-25')
      );

      // Verify the query handles overlapping scenarios
      expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              {
                startDate: {
                  gte: new Date('2024-06-15'),
                  lte: new Date('2024-06-25')
                }
              },
              {
                endDate: {
                  gte: new Date('2024-06-15'),
                  lte: new Date('2024-06-25')
                }
              },
              {
                AND: [
                  { startDate: { lte: new Date('2024-06-15') } },
                  { endDate: { gte: new Date('2024-06-25') } }
                ]
              }
            ]
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures', async () => {
      leaveBalanceCache.get.mockReturnValue(null);
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB Connection failed'));

      await expect(getUserLeaveBalance('user-1', 2024))
        .rejects.toThrow('DB Connection failed');
    });

    it('should handle invalid date ranges gracefully', async () => {
      leaveBalanceCache.get.mockReturnValue(null);
      (prisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      // Test with invalid date range
      const result = await getTeamCalendarData(
        new Date('2024-12-31'),
        new Date('2024-01-01') // End before start
      );

      expect(result.totalRequests).toBe(0);
      expect(result.requests).toEqual([]);
    });
  });
});