import { useQuery, UseQueryResult, useQueryClient } from '@tanstack/react-query';
import { queryKeys, queryOptions } from '@/lib/react-query';

interface LeaveBalanceData {
  totalAllowance: number;
  daysUsed: number;
  remaining: number;
  balances?: {
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
  };
  pending: {
    annual: number;
    toil: number;
    sick: number;
    total: number;
  };
}

interface UseLeaveBalanceOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}

export function useLeaveBalance(
  userId: string,
  options: UseLeaveBalanceOptions = {}
): UseQueryResult<LeaveBalanceData, Error> {
  const {
    enabled = true,
    staleTime = queryOptions.user.staleTime,
    refetchInterval,
  } = options;

  return useQuery({
    queryKey: queryKeys.user.balance(userId),
    queryFn: async (): Promise<LeaveBalanceData> => {
      const response = await fetch('/api/leave/balance', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch leave balance: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch leave balance');
      }

      return result.data;
    },
    enabled: enabled && !!userId,
    staleTime,
    refetchInterval,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook for prefetching leave balance data
 */
export function usePrefetchLeaveBalance() {
  const queryClient = useQueryClient();
  
  return (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.user.balance(userId),
      queryFn: async () => {
        const response = await fetch('/api/leave/balance', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch leave balance: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to fetch leave balance');
        }

        return result.data;
      },
      staleTime: queryOptions.user.staleTime,
    });
  };
}

// Re-export useQueryClient for convenience
export { useQueryClient };