/**
 * Notification Policy for TDH Agency Leave Tracker
 * 
 * This file defines what constitutes actionable vs reference notifications
 * to ensure users only see notification badges for items requiring action.
 */

export interface NotificationCount {
  actionable: number;
  reference: number;
  total: number;
}

export interface UserNotificationSummary {
  pendingRequests: NotificationCount;
  toilPending: NotificationCount;
  systemNotifications: NotificationCount;
  totalActionable: number;
}

/**
 * Determines if a leave request status requires user action
 */
export function isActionableLeaveRequest(status: string, userRole: 'ADMIN' | 'USER', userId?: string, requestUserId?: string): boolean {
  switch (status) {
    case 'PENDING':
      // For admins: all pending requests are actionable
      // For users: only their own pending requests are actionable
      if (userRole === 'ADMIN') return true;
      if (userRole === 'USER' && userId === requestUserId) return true;
      return false;
      
    case 'REJECTED':
      // For users: only their own rejected requests are actionable (for resubmission)
      if (userRole === 'USER' && userId === requestUserId) return true;
      return false;
      
    case 'APPROVED':
    case 'CANCELLED':
    default:
      // These are reference only - no action required
      return false;
  }
}

/**
 * Determines if a TOIL entry requires user action
 */
export function isActionableToilEntry(approved: boolean, userRole: 'ADMIN' | 'USER', userId?: string, entryUserId?: string): boolean {
  // For admins: unapproved TOIL entries are actionable
  if (userRole === 'ADMIN' && !approved) return true;
  
  // For users: approved TOIL entries are actionable (they can use them)
  if (userRole === 'USER' && approved && userId === entryUserId) return true;
  
  return false;
}

/**
 * Calculates notification counts for admin users
 */
export function calculateAdminNotifications(data: {
  pendingRequests: Array<{ status: string; userId: string }>;
  toilEntries: Array<{ approved: boolean; userId: string }>;
}): UserNotificationSummary {
  const actionablePending = data.pendingRequests.filter(req => 
    isActionableLeaveRequest(req.status, 'ADMIN')
  ).length;
  
  const actionableToil = data.toilEntries.filter(entry => 
    isActionableToilEntry(entry.approved, 'ADMIN')
  ).length;

  return {
    pendingRequests: {
      actionable: actionablePending,
      reference: data.pendingRequests.length - actionablePending,
      total: data.pendingRequests.length
    },
    toilPending: {
      actionable: actionableToil,
      reference: data.toilEntries.length - actionableToil,
      total: data.toilEntries.length
    },
    systemNotifications: {
      actionable: 0, // Future: password resets, system alerts, etc.
      reference: 0,
      total: 0
    },
    totalActionable: actionablePending + actionableToil
  };
}

/**
 * Calculates notification counts for regular users
 */
export function calculateUserNotifications(
  userId: string,
  data: {
    pendingRequests: Array<{ status: string; userId: string }>;
    toilEntries: Array<{ approved: boolean; userId: string }>;
  }
): UserNotificationSummary {
  const actionablePending = data.pendingRequests.filter(req => 
    isActionableLeaveRequest(req.status, 'USER', userId, req.userId)
  ).length;
  
  const actionableToil = data.toilEntries.filter(entry => 
    isActionableToilEntry(entry.approved, 'USER', userId, entry.userId)
  ).length;

  return {
    pendingRequests: {
      actionable: actionablePending,
      reference: data.pendingRequests.filter(req => req.userId === userId).length - actionablePending,
      total: data.pendingRequests.filter(req => req.userId === userId).length
    },
    toilPending: {
      actionable: actionableToil,
      reference: data.toilEntries.filter(entry => entry.userId === userId).length - actionableToil,
      total: data.toilEntries.filter(entry => entry.userId === userId).length
    },
    systemNotifications: {
      actionable: 0, // Future: rejected requests, system alerts, etc.
      reference: 0,
      total: 0
    },
    totalActionable: actionablePending + actionableToil
  };
}

/**
 * Determines if a notification badge should be shown
 */
export function shouldShowNotificationBadge(count: number): boolean {
  return count > 0;
}

/**
 * Gets the appropriate badge variant based on urgency
 */
export function getNotificationBadgeVariant(count: number): 'destructive' | 'secondary' | 'default' {
  if (count === 0) return 'default';
  if (count >= 5) return 'destructive'; // High urgency
  return 'secondary'; // Normal urgency
}
