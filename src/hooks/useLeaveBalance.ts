import { useQuery, UseQueryResult, useQueryClient } from '@tanstack/react-query';
import { queryKeys, queryOptions } from '@/lib/react-query';
import { useEffect } from 'react';
import { subscribeToUserBalance, subscribeToUserLeaveRequests } from '@/lib/realtime/supabase-realtime';

export interface LeaveBalanceData {
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
    count?: number; // Count of pending requests (not just days)
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

  const queryClient = useQueryClient();

  // Subscribe to real-time updates for user balance
  useEffect(() => {
    if (!enabled || !userId) return;

    // Subscribe to user balance changes (when balances are updated)
    const balanceSubscription = subscribeToUserBalance(userId, () => {
      // Invalidate balance query when user balances change
      queryClient.invalidateQueries({ queryKey: queryKeys.user.balance(userId) });
    });

    // Also subscribe to leave request changes since they affect balances
    const requestsSubscription = subscribeToUserLeaveRequests(userId, () => {
      // Invalidate balance query when leave requests change
      // (new requests, approvals, rejections all affect balance/pending counts)
      queryClient.invalidateQueries({ queryKey: queryKeys.user.balance(userId) });
    });

    return () => {
      balanceSubscription.unsubscribe();
      requestsSubscription.unsubscribe();
    };
  }, [enabled, userId, queryClient]);

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
    // Remove polling since we now have real-time subscriptions
    // refetchInterval,
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