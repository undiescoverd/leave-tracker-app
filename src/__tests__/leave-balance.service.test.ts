import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
  getUserLeaveBalances, 
  validateLeaveRequest, 
  getLegacyLeaveBalance 
} from '@/lib/services/leave-balance.service.supabase';
import { calculateWorkingDays } from '@/lib/date-utils';
import { supabaseAdmin } from '@/lib/supabase';
import './setup';

// Mock dependencies
jest.mock('@/lib/date-utils', () => ({
  calculateWorkingDays: jest.fn(),
}));

// Create feature flags mock with methods - defined inline to avoid hoisting issues
jest.mock('@/lib/features', () => {
  const mockFeatures = {
    TOIL_ENABLED: true,
    TOIL_REQUEST_ENABLED: true,
    TOIL_ADMIN_ENABLED: true,
    SICK_LEAVE_ENABLED: true,
    getFeature(key: string): boolean {
      return (mockFeatures as any)[key] ?? false;
    },
    isMultiLeaveTypeEnabled(): boolean {
      return mockFeatures.TOIL_ENABLED || mockFeatures.SICK_LEAVE_ENABLED;
    },
    getAvailableLeaveTypes(): string[] {
      const types = ['ANNUAL'];
      if (mockFeatures.TOIL_ENABLED) types.push('TOIL');
      if (mockFeatures.SICK_LEAVE_ENABLED) types.push('SICK');
      return types;
    },
  };
  return { features: mockFeatures };
});

// Import the mocked features for test manipulation
import { features as featureFlags } from '@/lib/features';

const mockCalculateWorkingDays = calculateWorkingDays as jest.MockedFunction<typeof calculateWorkingDays>;

describe('Leave Balance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserLeaveBalances', () => {
    it('should calculate balances correctly for user with leave requests', async () => {
      const mockUser = {
        ...testUtils.mockUser(),
        annualLeaveBalance: 32,
        toilBalance: 8,
        sickLeaveBalance: 3,
        leaveRequests: [
          // 5-day annual leave
          { 
            startDate: new Date('2024-06-01'),
            endDate: new Date('2024-06-05'),
            type: 'ANNUAL',
            status: 'APPROVED'
          },
          // 2-day TOIL usage
          { 
            startDate: new Date('2024-07-01'),
            endDate: new Date('2024-07-02'),
            type: 'TOIL',
            status: 'APPROVED'
          },
          // 1-day sick leave
          { 
            startDate: new Date('2024-08-01'),
            endDate: new Date('2024-08-01'),
            type: 'SICK',
            status: 'APPROVED'
          }
        ]
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      
      // Mock working days calculations
      mockCalculateWorkingDays
        .mockReturnValueOnce(5) // Annual leave: 5 days
        .mockReturnValueOnce(2) // TOIL: 2 days
        .mockReturnValueOnce(1); // Sick: 1 day

      const result = await getUserLeaveBalances('user-1', 2024);

      expect(result).toEqual({
        annual: {
          total: 32,
          used: 5,
          remaining: 27
        },
        toil: {
          total: 8,
          used: 2,
          remaining: 6
        },
        sick: {
          total: 3,
          used: 1,
          remaining: 2
        }
      });
    });

    it('should handle user with no leave requests', async () => {
      const mockUser = {
        ...testUtils.mockUser(),
        leaveRequests: []
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserLeaveBalances('user-1', 2024);

      expect(result).toEqual({
        annual: {
          total: 32,
          used: 0,
          remaining: 32
        },
        toil: {
          total: 0,
          used: 0,
          remaining: 0
        },
        sick: {
          total: 3,
          used: 0,
          remaining: 3
        }
      });
    });

    it('should throw error for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getUserLeaveBalances('non-existent', 2024))
        .rejects.toThrow('User not found');
    });

    it('should use fallback values for users with null balances', async () => {
      const mockUser = {
        ...testUtils.mockUser(),
        annualLeaveBalance: null,
        toilBalance: null,
        sickLeaveBalance: null,
        leaveRequests: []
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserLeaveBalances('user-1', 2024);

      expect(result).toEqual({
        annual: {
          total: 32, // Fallback value
          used: 0,
          remaining: 32
        },
        toil: {
          total: 0, // Fallback value
          used: 0,
          remaining: 0
        },
        sick: {
          total: 3, // Fallback value
          used: 0,
          remaining: 3
        }
      });
    });

    it('should filter requests by year correctly', async () => {
      const mockUser = {
        ...testUtils.mockUser(),
        leaveRequests: [] // Should only include requests from the specified year
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await getUserLeaveBalances('user-1', 2024);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: {
          leaveRequests: {
            where: {
              status: 'APPROVED',
              startDate: {
                gte: new Date(2024, 0, 1),
                lte: new Date(2024, 11, 31)
              }
            }
          }
        }
      });
    });

    it('should handle backward compatibility with undefined leave types', async () => {
      const mockUser = {
        ...testUtils.mockUser(),
        leaveRequests: [
          {
            startDate: new Date('2024-06-01'),
            endDate: new Date('2024-06-05'),
            type: undefined, // Old records might not have type
            status: 'APPROVED'
          }
        ]
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockCalculateWorkingDays.mockReturnValue(5);

      const result = await getUserLeaveBalances('user-1', 2024);

      // Should default to ANNUAL leave
      expect(result.annual.used).toBe(5);
      expect(result.toil?.used).toBe(0);
    });
  });

  describe('validateLeaveRequest', () => {
    beforeEach(() => {
      // Reset the mock to default enabled state
      jest.doMock('@/lib/features', () => ({
        features: {
          TOIL_ENABLED: true,
          SICK_LEAVE_ENABLED: true,
        }
      }));
    });

    it('should validate annual leave request with sufficient balance', async () => {
      mockCalculateWorkingDays.mockReturnValue(5);
      
      const mockUser = {
        ...testUtils.mockUser(),
        leaveRequests: []
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await validateLeaveRequest(
        'user-1',
        'ANNUAL',
        new Date('2024-06-01'),
        new Date('2024-06-05')
      );

      expect(result).toEqual({ valid: true });
    });

    it('should reject annual leave request with insufficient balance', async () => {
      mockCalculateWorkingDays.mockReturnValue(50); // More than available
      
      const mockUser = {
        ...testUtils.mockUser(),
        annualLeaveBalance: 32,
        leaveRequests: []
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await validateLeaveRequest(
        'user-1',
        'ANNUAL',
        new Date('2024-06-01'),
        new Date('2024-12-31')
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient annual leave');
      expect(result.error).toContain('32 days remaining');
    });

    it('should validate TOIL request when feature is enabled', async () => {
      mockCalculateWorkingDays.mockReturnValue(2);
      
      const mockUser = {
        ...testUtils.mockUser(),
        leaveRequests: []
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await validateLeaveRequest(
        'user-1',
        'TOIL',
        new Date('2024-06-01'),
        new Date('2024-06-02')
      );

      expect(result).toEqual({ valid: true });
    });

    it('should reject TOIL request when feature is disabled', async () => {
      featureFlags.TOIL_ENABLED = false;

      const result = await validateLeaveRequest(
        'user-1',
        'TOIL',
        new Date('2024-06-01'),
        new Date('2024-06-02')
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOIL requests are not enabled');

      featureFlags.TOIL_ENABLED = true;
    });

    it('should validate sick leave request when feature is enabled', async () => {
      mockCalculateWorkingDays.mockReturnValue(1);
      
      const mockUser = {
        ...testUtils.mockUser(),
        leaveRequests: []
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await validateLeaveRequest(
        'user-1',
        'SICK',
        new Date('2024-06-01'),
        new Date('2024-06-01')
      );

      expect(result).toEqual({ valid: true });
    });

    it('should allow sick leave to go negative (statutory requirement)', async () => {
      mockCalculateWorkingDays.mockReturnValue(10); // More than available
      
      const mockUser = {
        ...testUtils.mockUser(),
        sickLeaveBalance: 3,
        leaveRequests: []
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await validateLeaveRequest(
        'user-1',
        'SICK',
        new Date('2024-06-01'),
        new Date('2024-06-14')
      );

      // Sick leave should always be valid (can go negative)
      expect(result).toEqual({ valid: true });
    });
  });

  describe('getLegacyLeaveBalance', () => {
    it('should return backward-compatible balance structure', async () => {
      const mockUser = {
        ...testUtils.mockUser(),
        leaveRequests: [
          {
            startDate: new Date('2024-06-01'),
            endDate: new Date('2024-06-05'),
            type: 'ANNUAL',
            status: 'APPROVED'
          }
        ]
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockCalculateWorkingDays.mockReturnValue(5);

      const result = await getLegacyLeaveBalance('user-1', 2024);

      expect(result).toEqual({
        totalAllowance: 32,
        daysUsed: 5,
        remaining: 27,
        approvedLeaves: 1
      });
    });

    it('should handle users with no approved leaves', async () => {
      const mockUser = {
        ...testUtils.mockUser(),
        leaveRequests: []
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await getLegacyLeaveBalance('user-1', 2024);

      expect(result).toEqual({
        totalAllowance: 32,
        daysUsed: 0,
        remaining: 32,
        approvedLeaves: 0
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(getUserLeaveBalances('user-1', 2024))
        .rejects.toThrow('DB Error');
    });

    it('should handle date calculations with zero days', async () => {
      const mockUser = {
        ...testUtils.mockUser(),
        leaveRequests: []
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockCalculateWorkingDays.mockReturnValue(0); // Zero days calculated

      const result = await getUserLeaveBalances('user-1', 2024);

      // Should handle zero days gracefully
      expect(result.annual.used).toBe(0);
      expect(result.annual.remaining).toBe(32); // 32 - 0
    });
  });
});