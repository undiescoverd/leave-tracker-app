import { useQuery, UseQueryResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, queryOptions, mutationOptions } from '@/lib/react-query';

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  days: number;
  createdAt: string;
  adminComment?: string;
  comments?: string;
  type: string;
  hours?: number;
}

interface LeaveRequestsResponse {
  requests: LeaveRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseLeaveRequestsOptions {
  userId: string;
  status?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useLeaveRequests(
  options: UseLeaveRequestsOptions
): UseQueryResult<LeaveRequestsResponse, Error> {
  const {
    userId,
    status,
    page = 1,
    limit = 10,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: queryKeys.leaveRequests.byUser(userId, status, page, limit),
    queryFn: async (): Promise<LeaveRequestsResponse> => {
      const params = new URLSearchParams();
      if (status && status !== 'ALL') {
        params.append('status', status);
      }
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/leave/requests?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch leave requests: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch leave requests');
      }

      return result.data;
    },
    enabled: enabled && !!userId,
    staleTime: queryOptions.leaveRequests.staleTime,
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
 * Hook for canceling a leave request
 */
export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/leave/request/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to cancel request');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate leave requests queries
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
    onError: (error) => {
      console.error('Failed to cancel leave request:', error);
    },
  });
}

/**
 * Hook for submitting a new leave request
 */
export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestData: {
      startDate: string;
      endDate: string;
      type: string;
      comments?: string;
      hours?: number;
    }) => {
      const response = await fetch('/api/leave/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to submit request');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
    },
    onError: (error) => {
      console.error('Failed to submit leave request:', error);
    },
  });
}

/**
 * Hook for prefetching leave requests
 */
export function usePrefetchLeaveRequests() {
  const queryClient = useQueryClient();
  
  return (userId: string, status?: string, page?: number, limit?: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.leaveRequests.byUser(userId, status, page, limit),
      queryFn: async () => {
        const params = new URLSearchParams();
        if (status && status !== 'ALL') {
          params.append('status', status);
        }
        params.append('page', (page || 1).toString());
        params.append('limit', (limit || 10).toString());

        const response = await fetch(`/api/leave/requests?${params}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch leave requests: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to fetch leave requests');
        }

        return result.data;
      },
      staleTime: queryOptions.leaveRequests.staleTime,
    });
  };
}
