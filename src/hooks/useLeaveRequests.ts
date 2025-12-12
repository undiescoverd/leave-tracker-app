import { useQuery, UseQueryResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, queryOptions, mutationOptions } from '@/lib/react-query';
import { toast } from 'sonner';

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
  startDate?: string;
  endDate?: string;
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
    startDate,
    endDate,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: queryKeys.leaveRequests.byUser(userId, status, page, limit, startDate, endDate),
    queryFn: async (): Promise<LeaveRequestsResponse> => {
      const params = new URLSearchParams();
      if (status && status !== 'ALL') {
        params.append('status', status);
      }
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/leave/requests?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const error = new Error(
          `Failed to fetch leave requests: ${response.status} ${response.statusText}`
        ) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      const result = await response.json();
      
      if (!result.success) {
        const error = new Error(
          result.error?.message || 'Failed to fetch leave requests'
        ) as Error & { status?: number };
        if (result.error?.statusCode) {
          error.status = result.error.statusCode;
        }
        throw error;
      }

      return result.data;
    },
    enabled: enabled && !!userId,
    staleTime: queryOptions.leaveRequests.staleTime,
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for faster updates
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
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

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.error?.message || 'Failed to cancel request');
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate leave requests queries for instant updates
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });

      // Show success toast
      toast.success('Leave request cancelled successfully');
    },
    onError: (error) => {
      console.error('Failed to cancel leave request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel leave request');
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

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.error?.message || 'Failed to submit request');
      }

      return result;
    },
    onMutate: async (newRequest) => {
      // Show optimistic toast immediately
      toast.success('Submitting leave request...');

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.leaveRequests.all });

      // Return context with the request data for potential rollback
      return { newRequest };
    },
    onSuccess: () => {
      // Invalidate related queries for instant updates
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });

      // Update success toast
      toast.success('Leave request submitted successfully! Admin will be notified.');
    },
    onError: (error) => {
      console.error('Failed to submit leave request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit leave request');

      // Invalidate to refetch correct data
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
    },
  });
}

/**
 * Hook for prefetching leave requests
 */
export function usePrefetchLeaveRequests() {
  const queryClient = useQueryClient();
  
  return (userId: string, status?: string, page?: number, limit?: number, startDate?: string, endDate?: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.leaveRequests.byUser(userId, status, page, limit, startDate, endDate),
      queryFn: async () => {
        const params = new URLSearchParams();
        if (status && status !== 'ALL') {
          params.append('status', status);
        }
        params.append('page', (page || 1).toString());
        params.append('limit', (limit || 10).toString());
        if (startDate) {
          params.append('startDate', startDate);
        }
        if (endDate) {
          params.append('endDate', endDate);
        }

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
