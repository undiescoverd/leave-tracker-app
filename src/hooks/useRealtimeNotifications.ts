/**
 * React Hook for Real-time Notifications
 * Combines leave requests and TOIL updates to provide notification system
 */

import { useEffect, useState, useCallback } from 'react';
import { useRealtimeLeaveRequests } from './useRealtimeLeaveRequests';
import {
  subscribeToUserToilEntries,
  LeaveRequestChange,
  ToilEntryChange,
  RealtimeSubscription,
} from '@/lib/realtime/supabase-realtime';

export type NotificationType =
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_cancelled'
  | 'new_leave_request'
  | 'toil_approved'
  | 'toil_rejected';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
  read?: boolean;
}

export interface UseRealtimeNotificationsOptions {
  userId?: string;
  isAdmin?: boolean;
  enabled?: boolean;
  maxNotifications?: number;
  onNotification?: (notification: Notification) => void;
}

/**
 * Hook to receive real-time notifications about leave and TOIL changes
 *
 * @example
 * const { notifications, markAsRead, clearAll } = useRealtimeNotifications({
 *   userId: currentUser.id,
 *   onNotification: (notification) => {
 *     // Show toast notification
 *     toast.success(notification.message);
 *   }
 * });
 */
export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const {
    userId,
    isAdmin = false,
    enabled = true,
    maxNotifications = 50,
    onNotification,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toilSubscription, setToilSubscription] = useState<RealtimeSubscription | null>(null);

  // Create notification helper
  const createNotification = useCallback(
    (type: NotificationType, title: string, message: string, data?: any): Notification => {
      return {
        id: `${Date.now()}-${Math.random()}`,
        type,
        title,
        message,
        timestamp: new Date(),
        data,
        read: false,
      };
    },
    []
  );

  // Add notification to state
  const addNotification = useCallback(
    (notification: Notification) => {
      setNotifications(prev => {
        const updated = [notification, ...prev];
        // Keep only the most recent notifications
        return updated.slice(0, maxNotifications);
      });
      onNotification?.(notification);
    },
    [maxNotifications, onNotification]
  );

  // Handle leave request updates (for users)
  const handleLeaveUpdate = useCallback(
    (data: any, old?: any) => {
      if (!userId || isAdmin) return;

      const oldStatus = old?.status;
      const newStatus = data.status;

      if (oldStatus !== newStatus) {
        if (newStatus === 'APPROVED') {
          const notification = createNotification(
            'leave_approved',
            'Leave Request Approved',
            `Your leave request from ${new Date(data.start_date).toLocaleDateString()} has been approved!`,
            data
          );
          addNotification(notification);
        } else if (newStatus === 'REJECTED') {
          const notification = createNotification(
            'leave_rejected',
            'Leave Request Rejected',
            `Your leave request from ${new Date(data.start_date).toLocaleDateString()} was rejected.`,
            data
          );
          addNotification(notification);
        } else if (newStatus === 'CANCELLED') {
          const notification = createNotification(
            'leave_cancelled',
            'Leave Request Cancelled',
            `Your leave request from ${new Date(data.start_date).toLocaleDateString()} was cancelled.`,
            data
          );
          addNotification(notification);
        }
      }
    },
    [userId, isAdmin, createNotification, addNotification]
  );

  // Handle new leave requests (for admins)
  const handleNewLeaveRequest = useCallback(
    (data: any) => {
      if (!isAdmin) return;

      const notification = createNotification(
        'new_leave_request',
        'New Leave Request',
        `${data.user?.name || 'A user'} submitted a new leave request`,
        data
      );
      addNotification(notification);
    },
    [isAdmin, createNotification, addNotification]
  );

  // Subscribe to leave request updates
  useRealtimeLeaveRequests({
    userId: isAdmin ? undefined : userId,
    isAdmin,
    onlyPending: isAdmin,
    enabled,
    onInsert: handleNewLeaveRequest,
    onUpdate: handleLeaveUpdate,
  });

  // Subscribe to TOIL entry updates
  useEffect(() => {
    if (!enabled || !userId || isAdmin) {
      return;
    }

    const handleToilChange = (change: ToilEntryChange) => {
      if (change.type === 'UPDATE' && change.old && change.data) {
        const wasApproved = !change.old.approved && change.data.approved;
        const wasRejected = change.old.approved && !change.data.approved;

        if (wasApproved) {
          const notification = createNotification(
            'toil_approved',
            'TOIL Entry Approved',
            `Your TOIL entry for ${change.data.hours} hours was approved!`,
            change.data
          );
          addNotification(notification);
        } else if (wasRejected) {
          const notification = createNotification(
            'toil_rejected',
            'TOIL Entry Rejected',
            `Your TOIL entry for ${change.data.hours} hours was rejected.`,
            change.data
          );
          addNotification(notification);
        }
      }
    };

    const subscription = subscribeToUserToilEntries(userId, handleToilChange);
    setToilSubscription(subscription);

    return () => {
      subscription.unsubscribe();
      setToilSubscription(null);
    };
  }, [userId, isAdmin, enabled, createNotification, addNotification]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    isSubscribed: toilSubscription !== null,
  };
}
