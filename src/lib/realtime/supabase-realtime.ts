/**
 * Supabase Realtime Service
 * Provides real-time subscriptions for leave requests, notifications, and team updates
 */

import { supabaseClient } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type LeaveRequestChangeType = 'INSERT' | 'UPDATE' | 'DELETE';

// Base record type for leave requests (matches database schema)
interface LeaveRequestRecord {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  type: 'ANNUAL' | 'TOIL' | 'SICK';
  hours?: number | null;
  comments?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestChange {
  type: LeaveRequestChangeType;
  // For INSERT/UPDATE: contains new record, for DELETE: null
  data: LeaveRequestRecord | null;
  // For UPDATE/DELETE: contains old record, for INSERT: undefined
  old?: LeaveRequestRecord | null;
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
      (payload: RealtimePostgresChangesPayload<LeaveRequestRecord>) => {
        callback({
          type: payload.eventType as LeaveRequestChangeType,
          // For DELETE events, payload.new is null, which is correct
          data: payload.new ?? null,
          old: payload.old ?? undefined,
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
      (payload: RealtimePostgresChangesPayload<LeaveRequestRecord>) => {
        callback({
          type: payload.eventType as LeaveRequestChangeType,
          // For DELETE events, payload.new is null, which is correct
          data: payload.new ?? null,
          old: payload.old ?? undefined,
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
      (payload: RealtimePostgresChangesPayload<LeaveRequestRecord>) => {
        callback({
          type: payload.eventType as LeaveRequestChangeType,
          // For DELETE events, payload.new is null, which is correct
          data: payload.new ?? null,
          old: payload.old ?? undefined,
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
 * Subscribe to team calendar changes (all leave requests)
 * Note: Calendar shows both PENDING and APPROVED requests with different colors.
 * We listen to all changes and let the query handle filtering.
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
        // No filter - listen to all changes for maximum reliability
        // The calendar query will filter out CANCELLED requests
      },
      (payload: RealtimePostgresChangesPayload<LeaveRequestRecord>) => {
        callback({
          type: payload.eventType as LeaveRequestChangeType,
          // For DELETE events, payload.new is null, which is correct
          data: payload.new ?? null,
          old: payload.old ?? undefined,
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

// User balance record type
interface UserBalanceRecord {
  id: string;
  annual_leave_balance: number;
  toil_balance: number;
  sick_leave_balance: number;
}

export interface UserBalance {
  annualLeave: number;
  toil: number;
  sickLeave: number;
}

/**
 * Subscribe to user balance changes
 */
export function subscribeToUserBalance(
  userId: string,
  callback: (balances: UserBalance) => void
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
      (payload: RealtimePostgresChangesPayload<UserBalanceRecord>) => {
        if (payload.new) {
          callback({
            annualLeave: payload.new.annual_leave_balance ?? 0,
            toil: payload.new.toil_balance ?? 0,
            sickLeave: payload.new.sick_leave_balance ?? 0,
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

// TOIL entry record type
interface ToilEntryRecord {
  id: string;
  user_id: string;
  date: string;
  type: string;
  hours: number;
  reason: string;
  approved: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
  adjustment_reason?: string | null;
  previous_balance?: number | null;
  new_balance?: number | null;
}

export interface ToilEntryChange {
  type: LeaveRequestChangeType;
  data: ToilEntryRecord | null;
  old?: ToilEntryRecord | null;
}

/**
 * Subscribe to TOIL entries for a user
 */
export function subscribeToUserToilEntries(
  userId: string,
  callback: (change: ToilEntryChange) => void
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
      (payload: RealtimePostgresChangesPayload<ToilEntryRecord>) => {
        callback({
          type: payload.eventType as LeaveRequestChangeType,
          data: payload.new ?? null,
          old: payload.old ?? undefined,
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
 * Channel states: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'
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
