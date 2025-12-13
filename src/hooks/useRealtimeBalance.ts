/**
 * React Hook for Real-time Leave Balance Updates
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  subscribeToUserBalance,
  RealtimeSubscription,
} from '@/lib/realtime/supabase-realtime';

export interface LeaveBalances {
  annualLeave: number;
  toil: number;
  sickLeave: number;
}

export interface UseRealtimeBalanceOptions {
  userId: string;
  enabled?: boolean;
  onBalanceChange?: (balances: LeaveBalances) => void;
}

/**
 * Hook to subscribe to real-time leave balance updates
 *
 * @example
 * const { isSubscribed } = useRealtimeBalance({
 *   userId: currentUser.id,
 *   onBalanceChange: (balances) => {
 *     console.log('New balances:', balances);
 *     updateUI(balances);
 *   }
 * });
 */
export function useRealtimeBalance(options: UseRealtimeBalanceOptions) {
  const { userId, enabled = true, onBalanceChange } = options;

  const subscriptionRef = useRef<RealtimeSubscription | null>(null);

  const handleBalanceChange = useCallback(
    (balances: LeaveBalances) => {
      onBalanceChange?.(balances);
    },
    [onBalanceChange]
  );

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    // Subscribe to user balance changes
    const subscription = subscribeToUserBalance(userId, handleBalanceChange);
    subscriptionRef.current = subscription;

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [userId, enabled, handleBalanceChange]);

  return {
    isSubscribed: subscriptionRef.current !== null,
  };
}
