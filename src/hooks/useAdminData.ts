import { useQuery, UseQueryResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, queryOptions, mutationOptions } from '@/lib/react-query';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { subscribeToAllLeaveRequests, subscribeToPendingRequests } from '@/lib/realtime/supabase-realtime';

interface AdminStats {
  pendingRequests: number;
  totalUsers: number;
  activeEmployees: number;
  toilPending: number;
  approvedThisMonth: number;
  systemStatus: string;
  allSystemsOperational: boolean;
}

interface PendingRequest {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  hours?: number;
  comments?: string;
  submittedAt: string;
  businessImpact: string;
  coverageArranged: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface PendingRequestsResponse {
  requests: PendingRequest[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Hook for fetching admin statistics
 */
export function useAdminStats(): UseQueryResult<AdminStats, Error> {
  const queryClient = useQueryClient();

  // Subscribe to real-time updates for admin stats
  useEffect(() => {
    // Subscribe to all leave request changes to update stats in real-time
    const subscription = subscribeToAllLeaveRequests((change) => {
      // Invalidate admin stats when any leave request changes
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: async (): Promise<AdminStats> => {
      const response = await fetch('/api/admin/stats', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch admin stats: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch admin stats');
      }

      return result.data;
    },
    staleTime: queryOptions.admin.staleTime,
    // Remove polling since we now have real-time subscriptions
    // refetchInterval: 5 * 1000,
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
 * Hook for fetching pending leave requests (admin view)
 */
export function usePendingRequests(
  page: number = 1,
  limit: number = 50
): UseQueryResult<PendingRequestsResponse, Error> {
  const offset = (page - 1) * limit;
  const queryClient = useQueryClient();

  // Subscribe to real-time updates for pending requests
  useEffect(() => {
    // Subscribe to ALL leave request changes (not just pending) because:
    // 1. When a PENDING request becomes APPROVED/REJECTED, the filter won't catch it
    // 2. We need to know when records are updated OUT of the PENDING status
    const subscription = subscribeToAllLeaveRequests((change) => {
      // Invalidate pending requests query when any change occurs
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.pendingRequests(page, limit) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, page, limit]);

  return useQuery({
    queryKey: queryKeys.admin.pendingRequests(page, limit),
    queryFn: async (): Promise<PendingRequestsResponse> => {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/admin/pending-requests?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch pending requests: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch pending requests');
      }

      return result.data;
    },
    staleTime: queryOptions.admin.staleTime,
    // Remove polling since we now have real-time subscriptions
    // refetchInterval: 5 * 1000,
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
 * Hook for approving leave requests
 */
export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, adminComment }: { requestId: string; adminComment?: string }) => {
      const response = await fetch(`/api/leave/request/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ adminComment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to approve request');
      }

      return response.json();
    },
    onMutate: async () => {
      // Show optimistic feedback
      toast.success('Approving request...');

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.admin.all });
    },
    onSuccess: () => {
      // Invalidate related queries for instant updates across all dashboards
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pendingRequests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-requests'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });

      // Show success toast
      toast.success('Leave request approved! Employee will be notified.');
    },
    onError: (error) => {
      console.error('Failed to approve leave request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve leave request');

      // Invalidate to refetch correct data
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

/**
 * Hook for rejecting leave requests
 */
export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const response = await fetch(`/api/leave/request/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to reject request');
      }

      return response.json();
    },
    onMutate: async () => {
      // Show optimistic feedback
      toast.success('Rejecting request...');

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.admin.all });
    },
    onSuccess: () => {
      // Invalidate related queries for instant updates
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pendingRequests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-requests'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });

      // Show success toast
      toast.success('Leave request rejected. Employee will be notified.');
    },
    onError: (error) => {
      console.error('Failed to reject leave request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject leave request');

      // Invalidate to refetch correct data
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

/**
 * Hook for bulk approving leave requests
 */
export function useBulkApproveRequests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestIds: string[]) => {
      const response = await fetch('/api/admin/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ requestIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to bulk approve requests');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries for instant updates
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });

      // Show success toast
      const count = data?.data?.approved || 0;
      toast.success(`${count} leave request${count !== 1 ? 's' : ''} approved successfully!`);
    },
    onError: (error) => {
      console.error('Failed to bulk approve requests:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to bulk approve requests');
    },
  });
}
