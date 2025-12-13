/**
 * React Hook for Real-time Leave Request Updates
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  subscribeToUserLeaveRequests,
  subscribeToAllLeaveRequests,
  subscribeToPendingRequests,
  LeaveRequestChange,
  RealtimeSubscription,
} from '@/lib/realtime/supabase-realtime';

export interface UseRealtimeLeaveRequestsOptions {
  userId?: string;
  isAdmin?: boolean;
  onlyPending?: boolean;
  enabled?: boolean;
  onInsert?: (data: any) => void;
  onUpdate?: (data: any, old?: any) => void;
  onDelete?: (old: any) => void;
  onChange?: (change: LeaveRequestChange) => void;
}

/**
 * Hook to subscribe to real-time leave request changes
 *
 * @example
 * // User view - subscribe to own requests
 * useRealtimeLeaveRequests({
 *   userId: currentUser.id,
 *   onUpdate: (data) => {
 *     if (data.status === 'APPROVED') {
 *       showNotification('Your leave request was approved!');
 *     }
 *   }
 * });
 *
 * @example
 * // Admin view - subscribe to all pending requests
 * useRealtimeLeaveRequests({
 *   isAdmin: true,
 *   onlyPending: true,
 *   onInsert: (data) => {
 *     showNotification('New leave request from ' + data.user.name);
 *   }
 * });
 */
export function useRealtimeLeaveRequests(options: UseRealtimeLeaveRequestsOptions = {}) {
  const {
    userId,
    isAdmin = false,
    onlyPending = false,
    enabled = true,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
  } = options;

  const subscriptionRef = useRef<RealtimeSubscription | null>(null);

  const handleChange = useCallback(
    (change: LeaveRequestChange) => {
      // Call the general onChange callback if provided
      onChange?.(change);

      // Call specific callbacks based on change type
      switch (change.type) {
        case 'INSERT':
          onInsert?.(change.data);
          break;
        case 'UPDATE':
          onUpdate?.(change.data, change.old);
          break;
        case 'DELETE':
          onDelete?.(change.old);
          break;
      }
    },
    [onChange, onInsert, onUpdate, onDelete]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Determine which subscription to create based on options
    let subscription: RealtimeSubscription | null = null;

    if (isAdmin && onlyPending) {
      // Admin view: subscribe to pending requests only
      subscription = subscribeToPendingRequests(handleChange);
    } else if (isAdmin) {
      // Admin view: subscribe to all requests
      subscription = subscribeToAllLeaveRequests(handleChange);
    } else if (userId) {
      // User view: subscribe to own requests
      subscription = subscribeToUserLeaveRequests(userId, handleChange);
    }

    subscriptionRef.current = subscription;

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      subscription?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [userId, isAdmin, onlyPending, enabled, handleChange]);

  return {
    isSubscribed: subscriptionRef.current !== null,
  };
}
