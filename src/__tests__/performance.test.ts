import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
  getUserLeaveBalance,
  getBatchUserLeaveBalances,
  getTeamCalendarData,
  checkUKAgentConflict
} from '@/lib/services/leave.service';

// Mock dependencies with performance tracking
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    leaveRequest: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}));

jest.mock('@/lib/cache/cache-manager', () => {
  const leaveBalanceCache = {
    get: jest.fn(),
    set: jest.fn(),
  };

  return {
    leaveBalanceCache,
    createCacheKey: jest.fn((...args: string[]) => args.join('-')),
  };
});

jest.mock('@/lib/date-utils', () => ({
  calculateWorkingDays: jest.fn().mockReturnValue(5),
}));

interface MockPrisma {
  user: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
  leaveRequest: {
    findMany: jest.Mock;
    count: jest.Mock;
  };
  $transaction: jest.Mock;
}

interface MockCacheManager {
  leaveBalanceCache: {
    get: jest.Mock;
    set: jest.Mock;
  };
  createCacheKey: jest.Mock;
}

const mockPrismaModule = jest.requireMock('@/lib/prisma') as { prisma: MockPrisma };
const mockCacheModule = jest.requireMock('@/lib/cache/cache-manager') as MockCacheManager;
const mockPrisma = mockPrismaModule.prisma;
const { leaveBalanceCache } = mockCacheModule;

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset performance counters
    leaveBalanceCache.get.mockReturnValue(null);
  });

  describe('Database Query Performance', () => {
    it('should execute user balance queries within performance thresholds', async () => {
      const mockUser = {
        id: 'user-1',
        annualLeaveBalance: 32,
        leaveRequests: Array(10).fill(null).map((_, i) => testUtils.mockLeaveRequest({ id: `req-${i}` }))
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const startTime = process.hrtime.bigint();
      
      await getUserLeaveBalance('user-1', 2024);
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      // Should execute in under 100ms for single user
      expect(executionTime).toBeLessThan(100);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should handle batch operations efficiently', async () => {
      const userIds = Array(50).fill(null).map((_, i) => `user-${i}`);
      const mockUsers = userIds.map(id => ({
        id,
        annualLeaveBalance: 32,
        leaveRequests: Array(5).fill(null).map((_, i) => testUtils.mockLeaveRequest({ id: `${id}-req-${i}` }))
      }));

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const startTime = process.hrtime.bigint();
      
      const results = await getBatchUserLeaveBalances(userIds, 2024);
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      // Batch operation should be more efficient than individual queries
      expect(executionTime).toBeLessThan(500); // 500ms for 50 users
      expect(results.size).toBe(50);
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1); // Single batch query
    });

    it('should optimize team calendar queries for large date ranges', async () => {
      const mockRequests = Array(100).fill(null).map((_, i) => ({
        id: `req-${i}`,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        user: { id: `user-${i % 20}`, name: `User ${i % 20}` },
        type: 'ANNUAL',
        status: 'APPROVED'
      }));

      mockPrisma.leaveRequest.findMany.mockResolvedValue(mockRequests);

      const startTime = process.hrtime.bigint();
      
      await getTeamCalendarData(
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      // Large date range query should still be performant
      expect(executionTime).toBeLessThan(200);
      expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle UK agent conflict checks efficiently', async () => {
      const conflictingRequests = Array(20).fill(null).map((_, i) => ({
        user: {
          id: `uk-agent-${i}`,
          name: `UK Agent ${i}`,
          email: `uk.agent${i}@company.com`
        }
      }));

      mockPrisma.leaveRequest.findMany.mockResolvedValue(conflictingRequests);

      const startTime = process.hrtime.bigint();
      
      await checkUKAgentConflict(
        new Date('2024-06-01'),
        new Date('2024-06-05')
      );
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      // Conflict check should be fast even with many agents
      expect(executionTime).toBeLessThan(50);
      expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledTimes(1);
    });

    it('should use appropriate database indexes', async () => {
      // Test that queries use expected WHERE clauses for index optimization
      await getUserLeaveBalance('user-1', 2024);

      const expectedQuery = expect.objectContaining({
        where: { id: 'user-1' },
        include: {
          leaveRequests: {
            where: {
              status: 'APPROVED',
              startDate: expect.any(Object),
              endDate: expect.any(Object)
            }
          }
        }
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(expectedQuery);
    });
  });

  describe('Cache Performance', () => {
    it('should improve response times with caching', async () => {
      const mockBalance = {
        totalAllowance: 32,
        daysUsed: 5,
        remaining: 27
      };

      // First call - cache miss
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        annualLeaveBalance: 32,
        leaveRequests: []
      });

      const firstCallStart = process.hrtime.bigint();
      await getUserLeaveBalance('user-1', 2024);
      const firstCallEnd = process.hrtime.bigint();
      const firstCallTime = Number(firstCallEnd - firstCallStart) / 1000000;

      // Second call - cache hit
      leaveBalanceCache.get.mockReturnValue(mockBalance);

      const secondCallStart = process.hrtime.bigint();
      await getUserLeaveBalance('user-1', 2024);
      const secondCallEnd = process.hrtime.bigint();
      const secondCallTime = Number(secondCallEnd - secondCallStart) / 1000000;

      // Cached call should be faster (more realistic threshold for test environment)
      expect(secondCallTime).toBeLessThan(firstCallTime); // Faster than uncached
      expect(secondCallTime).toBeLessThan(10); // Under 10ms
    });

    it('should handle cache misses gracefully under load', async () => {
      const userIds = Array(100).fill(null).map((_, i) => `user-${i}`);
      
      // All cache misses
      leaveBalanceCache.get.mockReturnValue(null);
      mockPrisma.user.findMany.mockResolvedValue(
        userIds.map(id => ({ id, annualLeaveBalance: 32, leaveRequests: [] }))
      );

      const startTime = process.hrtime.bigint();
      
      const results = await getBatchUserLeaveBalances(userIds, 2024);
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      // Should handle 100 cache misses efficiently
      expect(executionTime).toBeLessThan(1000); // Under 1 second
      expect(results.size).toBe(100);
    });

    it('should optimize cache key generation', () => {
      const { createCacheKey } = mockCacheModule;
      
      const startTime = process.hrtime.bigint();
      
      // Generate many cache keys
      for (let i = 0; i < 10000; i++) {
        createCacheKey('user-balance', `user-${i}`, 2024);
      }
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      // Cache key generation should be very fast
      expect(executionTime).toBeLessThan(100);
    });

    it('should maintain cache efficiency with varying data sizes', async () => {
      const scenarios = [
        { userCount: 10, requestsPerUser: 5 },
        { userCount: 50, requestsPerUser: 10 },
        { userCount: 100, requestsPerUser: 20 }
      ];

      for (const { userCount, requestsPerUser } of scenarios) {
        const userIds = Array(userCount).fill(null).map((_, i) => `user-${i}`);
        const mockUsers = userIds.map(id => ({
          id,
          annualLeaveBalance: 32,
          leaveRequests: Array(requestsPerUser).fill(null).map((_, i) => 
            testUtils.mockLeaveRequest({ id: `${id}-req-${i}` })
          )
        }));

        mockPrisma.user.findMany.mockResolvedValue(mockUsers);
        leaveBalanceCache.get.mockReturnValue(null); // Force cache miss

        const startTime = process.hrtime.bigint();
        const results = await getBatchUserLeaveBalances(userIds, 2024);
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;

        expect(results.size).toBe(userCount);
        
        // Performance should scale linearly, not exponentially
        const expectedMaxTime = userCount * 10; // 10ms per user maximum
        expect(executionTime).toBeLessThan(expectedMaxTime);
      }
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should handle large datasets without memory leaks', async () => {
      const largeUserSet = Array(1000).fill(null).map((_, i) => ({
        id: `user-${i}`,
        annualLeaveBalance: 32,
        leaveRequests: Array(50).fill(null).map((_, j) => 
          testUtils.mockLeaveRequest({ id: `user-${i}-req-${j}` })
        )
      }));

      mockPrisma.user.findMany.mockResolvedValue(largeUserSet);

      // Measure memory usage before operation
      const memBefore = process.memoryUsage();
      
      const results = await getBatchUserLeaveBalances(
        largeUserSet.map(u => u.id),
        2024
      );
      
      // Force garbage collection (if available)
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage();
      
      expect(results.size).toBe(1000);
      
      // Memory increase should be reasonable (less than 100MB)
      const memoryIncrease = memAfter.heapUsed - memBefore.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
    });

    it('should optimize object creation in loops', async () => {
      const mockRequests = Array(1000).fill(null).map((_, i) => ({
        id: `req-${i}`,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-05'),
        user: { id: `user-${i % 100}`, name: `User ${i % 100}` },
        type: 'ANNUAL',
        status: 'APPROVED'
      }));

      mockPrisma.leaveRequest.findMany.mockResolvedValue(mockRequests);

      const startTime = process.hrtime.bigint();
      const memBefore = process.memoryUsage();
      
      const result = await getTeamCalendarData(
        new Date('2024-06-01'),
        new Date('2024-06-30')
      );
      
      const endTime = process.hrtime.bigint();
      const memAfter = process.memoryUsage();
      
      const executionTime = Number(endTime - startTime) / 1000000;
      const memoryUsage = memAfter.heapUsed - memBefore.heapUsed;

      expect(result.totalRequests).toBe(1000);
      expect(executionTime).toBeLessThan(200); // Fast processing
      expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // Reasonable memory usage
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent balance requests efficiently', async () => {
      const concurrentUsers = Array(20).fill(null).map((_, i) => `user-${i}`);
      
      mockPrisma.user.findUnique.mockImplementation(async ({ where: { id } }) => ({
        id,
        annualLeaveBalance: 32,
        leaveRequests: Array(5).fill(null).map((_, requestIndex) => testUtils.mockLeaveRequest({ id: `${id}-req-${requestIndex}` }))
      }));

      const startTime = process.hrtime.bigint();
      
      // Execute concurrent requests
      const concurrentPromises = concurrentUsers.map(userId => 
        getUserLeaveBalance(userId, 2024)
      );
      
      const results = await Promise.all(concurrentPromises);
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(20);
      expect(executionTime).toBeLessThan(300); // Should handle concurrency well
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(20);
    });

    it('should maintain performance under database connection pressure', async () => {
      // Simulate database connection limits
      let callCount = 0;
      mockPrisma.user.findMany.mockImplementation(async () => {
        callCount++;
        
        // Simulate slight delays for database pressure
        await new Promise(resolve => setTimeout(resolve, callCount > 5 ? 10 : 1));
        
        return Array(10).fill(null).map((_, i) => ({
          id: `user-${i}`,
          annualLeaveBalance: 32,
          leaveRequests: []
        }));
      });

      const batchRequests = Array(10).fill(null).map((_, i) => 
        getBatchUserLeaveBalances([`batch-${i}-user-1`, `batch-${i}-user-2`], 2024)
      );

      const startTime = process.hrtime.bigint();
      const results = await Promise.all(batchRequests);
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(10);
      expect(executionTime).toBeLessThan(500); // Should handle pressure reasonably
    });
  });

  describe('Algorithm Efficiency', () => {
    it('should use efficient date calculations', async () => {
      const { calculateWorkingDays } = await import('@/lib/date-utils');
      
      // Test different date ranges
      const dateRanges = [
        { start: new Date('2024-01-01'), end: new Date('2024-01-31'), days: 31 },
        { start: new Date('2024-01-01'), end: new Date('2024-06-30'), days: 181 },
        { start: new Date('2024-01-01'), end: new Date('2024-12-31'), days: 366 }
      ];

      dateRanges.forEach(({ start, end }, index) => {
        const iterations = 1000;
        const startTime = process.hrtime.bigint();
        
        for (let i = 0; i < iterations; i++) {
          calculateWorkingDays(start, end);
        }
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;
        
        // Should be very fast regardless of date range
        expect(executionTime).toBeLessThan(50); // 50ms for 1000 calculations
        
        // Larger date ranges shouldn't be significantly slower (O(1) complexity)
        if (index > 0) {
          const timePerCalculation = executionTime / iterations;
          expect(timePerCalculation).toBeLessThan(0.1); // Under 0.1ms per calculation
        }
      });
    });

    it('should optimize conflict detection algorithms', async () => {
      // Test conflict detection with varying numbers of agents
      const agentCounts = [5, 20, 50];
      
      agentCounts.forEach(async (agentCount) => {
        const mockConflicts = Array(agentCount).fill(null).map((_, i) => ({
          user: {
            id: `agent-${i}`,
            name: `Agent ${i}`,
            email: `agent${i}@company.com`
          }
        }));

        mockPrisma.leaveRequest.findMany.mockResolvedValue(mockConflicts);

        const startTime = process.hrtime.bigint();
        
        const result = await checkUKAgentConflict(
          new Date('2024-06-01'),
          new Date('2024-06-05')
        );
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;

        expect(result.conflictingAgents).toHaveLength(agentCount);
        
        // Time complexity should be linear, not exponential
        expect(executionTime).toBeLessThan(agentCount * 2); // 2ms per agent maximum
      });
    });
  });

  describe('Resource Usage Monitoring', () => {
    it('should track database query counts', async () => {
      // Reset call counts
      jest.clearAllMocks();

      // Setup mocks for the operations
      (mockPrisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        annualLeaveBalance: 32,
        leaveRequests: []
      });

      (mockPrisma.user.findMany as any).mockResolvedValue([
        { id: 'user-2', annualLeaveBalance: 32, leaveRequests: [] },
        { id: 'user-3', annualLeaveBalance: 32, leaveRequests: [] }
      ]);

      (mockPrisma.leaveRequest.findMany as any).mockResolvedValue([
        {
          ...testUtils.mockLeaveRequest({ id: 'req-1' }),
          user: { id: 'user-1', name: 'User 1', email: 'user1@example.com' }
        },
        {
          ...testUtils.mockLeaveRequest({ id: 'req-2' }),
          user: { id: 'user-2', name: 'User 2', email: 'user2@example.com' }
        }
      ]);

      // Execute various operations
      await getUserLeaveBalance('user-1', 2024);
      await getBatchUserLeaveBalances(['user-2', 'user-3'], 2024);
      await getTeamCalendarData(new Date('2024-06-01'), new Date('2024-06-30'));

      // Count total database calls
      const userQueries = mockPrisma.user.findUnique.mock.calls.length +
                         mockPrisma.user.findMany.mock.calls.length;
      const leaveQueries = mockPrisma.leaveRequest.findMany.mock.calls.length;

      const totalQueries = userQueries + leaveQueries;

      // Should minimize total database queries
      expect(totalQueries).toBeLessThanOrEqual(5); // Efficient query usage
    });

    it('should monitor cache hit ratios', async () => {
      let cacheHits = 0;
      let cacheMisses = 0;
      
      leaveBalanceCache.get.mockImplementation((key: string) => {
        if (key.includes('user-1') || key.includes('user-2')) {
          cacheHits++;
          return { totalAllowance: 32, daysUsed: 5 };
        }
        cacheMisses++;
        return null;
      });

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-3', annualLeaveBalance: 32, leaveRequests: [] },
        { id: 'user-4', annualLeaveBalance: 32, leaveRequests: [] }
      ]);

      await getBatchUserLeaveBalances(['user-1', 'user-2', 'user-3', 'user-4'], 2024);

      const hitRatio = cacheHits / (cacheHits + cacheMisses);
      
      // Should achieve reasonable cache hit ratio
      expect(hitRatio).toBeGreaterThan(0.3); // At least 30% hit ratio
    });
  });
});