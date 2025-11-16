import { useQuery, UseQueryResult, useQueryClient } from '@tanstack/react-query';
import { queryKeys, queryOptions } from '@/lib/react-query';

interface LeaveEvent {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  comments?: string;
  hours?: number;
}

interface CalendarData {
  month: number;
  year: number;
  events: LeaveEvent[];
  eventsByDate: Record<string, LeaveEvent[]>;
  totalRequests: number;
}

interface UseTeamCalendarOptions {
  month?: number;
  year?: number;
  enabled?: boolean;
  refetchInterval?: number;
}

export function useTeamCalendar(
  options: UseTeamCalendarOptions = {}
): UseQueryResult<CalendarData, Error> {
  const {
    month = new Date().getMonth() + 1,
    year = new Date().getFullYear(),
    enabled = true,
    refetchInterval,
  } = options;

  return useQuery({
    queryKey: queryKeys.calendar.team(year.toString(), month.toString()),
    queryFn: async (): Promise<CalendarData> => {
      const params = new URLSearchParams();
      params.append('month', month.toString());
      params.append('year', year.toString());

      const response = await fetch(`/api/calendar/team?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch calendar data');
      }

      return result.data;
    },
    enabled,
    staleTime: queryOptions.calendar.staleTime,
    refetchInterval,
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
 * Hook for prefetching calendar data
 */
export function usePrefetchTeamCalendar() {
  const queryClient = useQueryClient();
  
  return (month: number, year: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendar.team(year.toString(), month.toString()),
      queryFn: async () => {
        const params = new URLSearchParams();
        params.append('month', month.toString());
        params.append('year', year.toString());

        const response = await fetch(`/api/calendar/team?${params}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch calendar data: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to fetch calendar data');
        }

        return result.data;
      },
      staleTime: queryOptions.calendar.staleTime,
    });
  };
}

// Re-export useQueryClient
export { useQueryClient };
