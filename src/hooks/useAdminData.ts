import { useQuery, UseQueryResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, queryOptions, mutationOptions } from '@/lib/react-query';

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
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
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
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
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
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
    onError: (error) => {
      console.error('Failed to approve leave request:', error);
    },
  });
}

/**
 * Hook for rejecting leave requests
 */
export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, adminComment }: { requestId: string; adminComment?: string }) => {
      const response = await fetch(`/api/leave/request/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ adminComment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to reject request');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
    onError: (error) => {
      console.error('Failed to reject leave request:', error);
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
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
    onError: (error) => {
      console.error('Failed to bulk approve requests:', error);
    },
  });
}
