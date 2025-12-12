import { QueryClient } from '@tanstack/react-query';

/**
 * React Query client configuration for optimal performance
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time updates
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: 'always',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});

/**
 * Query keys for consistent cache management
 */
export const queryKeys = {
  // User data
  user: {
    all: ['user'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
    balance: (userId: string, year?: number) => 
      ['user', 'balance', userId, year || new Date().getFullYear()] as const,
  },
  
  // Leave requests
  leaveRequests: {
    all: ['leaveRequests'] as const,
    byUser: (
      userId: string,
      status?: string,
      page?: number,
      limit?: number,
      startDate?: string,
      endDate?: string,
    ) => 
      ['leaveRequests', 'user', userId, status, page, limit, startDate, endDate] as const,
    pending: ['leaveRequests', 'pending'] as const,
  },
  
  // Admin data
  admin: {
    all: ['admin'] as const,
    stats: ['admin', 'stats'] as const,
    pendingRequests: (page?: number, limit?: number) => 
      ['admin', 'pendingRequests', page, limit] as const,
    users: ['admin', 'users'] as const,
    performance: ['admin', 'performance'] as const,
  },
  
  // Calendar data
  calendar: {
    all: ['calendar'] as const,
    team: (startDate: string, endDate: string) => 
      ['calendar', 'team', startDate, endDate] as const,
  },
  
  // TOIL data
  toil: {
    all: ['toil'] as const,
    byUser: (userId: string) => ['toil', 'user', userId] as const,
    pending: ['toil', 'pending'] as const,
  },
} as const;

/**
 * Default query options for different data types
 */
export const queryOptions = {
  // User data - moderate caching
  user: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  
  // Leave requests - shorter caching for real-time updates
  leaveRequests: {
    staleTime: 10 * 1000, // 10 seconds - faster for small team
    gcTime: 5 * 60 * 1000, // 5 minutes
  },

  // Admin data - very short caching for instant updates
  admin: {
    staleTime: 5 * 1000, // 5 seconds - very fast for 4 users
    gcTime: 3 * 60 * 1000, // 3 minutes
  },
  
  // Calendar data - moderate caching
  calendar: {
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  
  // Performance data - no caching
  performance: {
    staleTime: 0,
    gcTime: 0,
  },
} as const;

/**
 * Mutation options for different operations
 */
export const mutationOptions = {
  // Leave request operations
  leaveRequest: {
    onSuccess: (data: any, variables: any, context: any) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
    },
  },
  
  // Admin operations
  admin: {
    onSuccess: (data: any, variables: any, context: any) => {
      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests.all });
    },
  },
} as const;
