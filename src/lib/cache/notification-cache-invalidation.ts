/**
 * Notification Cache Invalidation Utilities
 * 
 * This file provides utilities to properly invalidate caches when
 * notification-relevant data changes, ensuring dashboard data stays fresh.
 */

import { queryClient } from '@/lib/react-query';
import { statsCache, userDataCache, apiCache } from '@/lib/cache/cache-manager';

/**
 * Invalidates all notification-related caches
 * Call this when leave request statuses change or new requests are created
 */
export function invalidateNotificationCaches(userId?: string) {
  // Invalidate admin stats cache
  statsCache.clear();
  
  // Invalidate API caches for pending requests
  apiCache.clear();
  
  // Invalidate user-specific caches if userId provided
  if (userId) {
    // Clear user data cache - the cache manager doesn't expose keys()
    // so we'll clear all user data caches for safety
    userDataCache.clear();
  } else {
    // If no userId, clear all user data caches
    userDataCache.clear();
  }
  
  // Invalidate React Query caches
  queryClient.invalidateQueries({ queryKey: ['admin'] });
  queryClient.invalidateQueries({ queryKey: ['user'] });
  queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
  queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
}

/**
 * Invalidates caches when a leave request status changes
 */
export function invalidateOnLeaveRequestStatusChange(requestId: string, userId: string, adminId?: string) {
  // Clear all caches since this affects both user and admin views
  invalidateNotificationCaches();
  
  // Log the cache invalidation for debugging
  console.log(`Cache invalidated due to leave request ${requestId} status change`, {
    requestId,
    userId,
    adminId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Invalidates caches when a new leave request is created
 */
export function invalidateOnNewLeaveRequest(userId: string, adminIds: string[] = []) {
  invalidateNotificationCaches();
  
  console.log(`Cache invalidated due to new leave request from user ${userId}`, {
    userId,
    adminIds,
    timestamp: new Date().toISOString()
  });
}

/**
 * Invalidates caches when TOIL entries change
 */
export function invalidateOnToilChange(userId: string) {
  invalidateNotificationCaches(userId);
  
  console.log(`Cache invalidated due to TOIL change for user ${userId}`, {
    userId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Force refresh all notification data
 * Use this for debugging or when you need to ensure fresh data
 */
export function forceRefreshNotificationData() {
  invalidateNotificationCaches();
  
  // Also refetch all queries
  queryClient.refetchQueries({ queryKey: ['admin'] });
  queryClient.refetchQueries({ queryKey: ['user'] });
  queryClient.refetchQueries({ queryKey: ['leaveRequests'] });
  queryClient.refetchQueries({ queryKey: ['leaveBalance'] });
  
  console.log('Force refreshed all notification data', {
    timestamp: new Date().toISOString()
  });
}
