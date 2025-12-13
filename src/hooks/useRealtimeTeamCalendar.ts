/**
 * React Hook for Real-time Team Calendar Updates
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  subscribeToTeamCalendar,
  LeaveRequestChange,
  RealtimeSubscription,
} from '@/lib/realtime/supabase-realtime';

export interface UseRealtimeTeamCalendarOptions {
  enabled?: boolean;
  onLeaveApproved?: (data: any) => void;
  onLeaveUpdated?: (data: any, old?: any) => void;
  onLeaveCancelled?: (old: any) => void;
  onChange?: (change: LeaveRequestChange) => void;
}

/**
 * Hook to subscribe to real-time team calendar changes
 * Only listens to APPROVED leave requests
 *
 * @example
 * useRealtimeTeamCalendar({
 *   onLeaveApproved: (data) => {
 *     // Refresh calendar when new leave is approved
 *     refetchCalendarData();
 *   },
 *   onLeaveCancelled: (old) => {
 *     // Remove cancelled leave from calendar
 *     removeFromCalendar(old.id);
 *   }
 * });
 */
export function useRealtimeTeamCalendar(options: UseRealtimeTeamCalendarOptions = {}) {
  const {
    enabled = true,
    onLeaveApproved,
    onLeaveUpdated,
    onLeaveCancelled,
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
          // New approved leave added
          onLeaveApproved?.(change.data);
          break;
        case 'UPDATE':
          // Approved leave updated (dates changed, etc.)
          onLeaveUpdated?.(change.data, change.old);
          break;
        case 'DELETE':
          // Approved leave cancelled/deleted
          onLeaveCancelled?.(change.old);
          break;
      }
    },
    [onChange, onLeaveApproved, onLeaveUpdated, onLeaveCancelled]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Subscribe to team calendar (approved leave requests only)
    const subscription = subscribeToTeamCalendar(handleChange);
    subscriptionRef.current = subscription;

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [enabled, handleChange]);

  return {
    isSubscribed: subscriptionRef.current !== null,
  };
}
