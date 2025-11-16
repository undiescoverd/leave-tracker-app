import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isLoading: boolean;
}

interface UseCachedDataOptions {
  ttl?: number; // Time to live in milliseconds
  refetchInterval?: number;
  enabled?: boolean;
}

const clientCache = new Map<string, CacheEntry<any>>();

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedDataOptions = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    refetchInterval,
    enabled = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    const cached = clientCache.get(key);
    const now = Date.now();
    
    // Return cached data if valid and not forcing refresh
    if (cached && !forceRefresh && (now - cached.timestamp) < ttl) {
      setData(cached.data);
      setIsLoading(cached.isLoading);
      return cached.data;
    }

    // Avoid duplicate requests if already loading
    if (cached?.isLoading && !forceRefresh) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // Update cache to indicate loading state
    clientCache.set(key, {
      data: cached?.data || null,
      timestamp: now,
      isLoading: true
    });

    try {
      const result = await fetcher();
      
      // Update cache with new data
      clientCache.set(key, {
        data: result,
        timestamp: Date.now(),
        isLoading: false
      });

      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      // Update cache to clear loading state
      const currentCached = clientCache.get(key);
      if (currentCached) {
        clientCache.set(key, {
          ...currentCached,
          isLoading: false
        });
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttl, enabled]);

  const invalidateCache = useCallback(() => {
    clientCache.delete(key);
    fetchData(true);
  }, [key, fetchData]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
    clientCache.set(key, {
      data: newData,
      timestamp: Date.now(),
      isLoading: false
    });
  }, [key]);

  // Initial data fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled]);

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(() => {
        fetchData();
      }, refetchInterval);

      return () => clearInterval(interval);
    }
  }, [fetchData, refetchInterval, enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchData(true),
    invalidate: invalidateCache,
    mutate
  };
}

// Specialized hooks for common data patterns
export function useLeaveBalance() {
  return useCachedData(
    'leave-balance',
    async () => {
      const response = await fetch('/api/leave/balance');
      if (!response.ok) throw new Error('Failed to fetch leave balance');
      return response.json();
    },
    { ttl: 2 * 60 * 1000 } // 2 minutes for balance data
  );
}

export function useTeamCalendar(month?: number, year?: number) {
  const currentDate = new Date();
  const targetMonth = month ?? currentDate.getMonth();
  const targetYear = year ?? currentDate.getFullYear();
  
  return useCachedData(
    `team-calendar-${targetYear}-${targetMonth}`,
    async () => {
      const response = await fetch(`/api/calendar/team-leave?month=${targetMonth}&year=${targetYear}`);
      if (!response.ok) throw new Error('Failed to fetch team calendar');
      return response.json();
    },
    { ttl: 1 * 60 * 1000 } // 1 minute for calendar data
  );
}

export function useLeaveRequests(status?: string, page = 1, limit = 10) {
  const queryParams = new URLSearchParams();
  if (status) queryParams.set('status', status);
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());

  return useCachedData(
    `leave-requests-${queryParams.toString()}`,
    async () => {
      const response = await fetch(`/api/leave/requests?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch leave requests');
      return response.json();
    },
    { ttl: 30 * 1000 } // 30 seconds for requests data
  );
}

// Utility to clear all cached data
export function clearAllCache() {
  clientCache.clear();
}

// Utility to get cache statistics
export function getCacheStats() {
  const entries = Array.from(clientCache.entries());
  const now = Date.now();
  
  return {
    total: entries.length,
    active: entries.filter(([_, entry]) => now - entry.timestamp < 5 * 60 * 1000).length,
    loading: entries.filter(([_, entry]) => entry.isLoading).length
  };
}