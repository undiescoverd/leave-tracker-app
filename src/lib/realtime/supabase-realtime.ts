/**
 * Supabase Realtime Service
 * Provides real-time subscriptions for leave requests, notifications, and team updates
 */

import { supabaseClient } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type LeaveRequestChangeType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface LeaveRequestChange {
  type: LeaveRequestChangeType;
  data: any;
  old?: any;
}

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

/**
 * Subscribe to leave request changes for a specific user
 */
export function subscribeToUserLeaveRequests(
  userId: string,
  callback: (change: LeaveRequestChange) => void
): RealtimeSubscription {
  const channel = supabaseClient
    .channel(`user-leave-requests:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leave_requests',
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        callback({
          type: payload.eventType as LeaveRequestChangeType,
          data: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabaseClient.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to all leave request changes (admin view)
 */
export function subscribeToAllLeaveRequests(
  callback: (change: LeaveRequestChange) => void
): RealtimeSubscription {
  const channel = supabaseClient
    .channel('all-leave-requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leave_requests',
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        callback({
          type: payload.eventType as LeaveRequestChangeType,
          data: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabaseClient.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to pending leave requests (admin notifications)
 */
export function subscribeToPendingRequests(
  callback: (change: LeaveRequestChange) => void
): RealtimeSubscription {
  const channel = supabaseClient
    .channel('pending-leave-requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leave_requests',
        filter: 'status=eq.PENDING',
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        callback({
          type: payload.eventType as LeaveRequestChangeType,
          data: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabaseClient.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to team calendar changes (all users' approved leave)
 */
export function subscribeToTeamCalendar(
  callback: (change: LeaveRequestChange) => void
): RealtimeSubscription {
  const channel = supabaseClient
    .channel('team-calendar')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leave_requests',
        filter: 'status=eq.APPROVED',
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        callback({
          type: payload.eventType as LeaveRequestChangeType,
          data: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabaseClient.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to user balance changes
 */
export function subscribeToUserBalance(
  userId: string,
  callback: (balances: any) => void
): RealtimeSubscription {
  const channel = supabaseClient
    .channel(`user-balance:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        if (payload.new) {
          callback({
            annualLeave: payload.new.annual_leave_balance,
            toil: payload.new.toil_balance,
            sickLeave: payload.new.sick_leave_balance,
          });
        }
      }
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabaseClient.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to TOIL entries for a user
 */
export function subscribeToUserToilEntries(
  userId: string,
  callback: (change: LeaveRequestChange) => void
): RealtimeSubscription {
  const channel = supabaseClient
    .channel(`user-toil:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'toil_entries',
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        callback({
          type: payload.eventType as LeaveRequestChangeType,
          data: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      supabaseClient.removeChannel(channel);
    },
  };
}

/**
 * Get the status of a realtime channel
 */
export function getChannelStatus(channel: RealtimeChannel): string {
  return channel.state;
}

/**
 * Check if realtime is connected
 */
export function isRealtimeConnected(): boolean {
  const channels = supabaseClient.getChannels();
  return channels.some(channel => channel.state === 'joined');
}

/**
 * Unsubscribe from all channels
 */
export async function unsubscribeAll(): Promise<void> {
  const channels = supabaseClient.getChannels();
  await Promise.all(channels.map(channel => supabaseClient.removeChannel(channel)));
}
