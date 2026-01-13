import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { queryKeys, queryOptions } from '@/lib/react-query';
import { format, addDays, subDays } from 'date-fns';

/**
 * Leave event interface matching the API response structure
 */
export interface LeaveEvent {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: string;
  status: string;
  comments: string | null;
  hours: number | null;
}

/**
 * Team calendar API response structure
 */
interface TeamCalendarResponse {
  events: LeaveEvent[];
  eventsByDate: Record<string, LeaveEvent[]>;
  dateRange: {
    start: string;
    end: string;
  };
  totalEvents: number;
  fromCache?: boolean;
}

/**
 * Options for the useTeamCalendarForDateRange hook
 */
export interface UseTeamCalendarForDateRangeOptions {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
  bufferDays?: number; // Number of days to add before/after for smooth navigation
}

/**
 * Hook to fetch team calendar data for a date range
 *
 * This hook fetches leave requests (pending and approved) for the specified date range
 * and provides an eventsByDate mapping for easy lookup in calendar components.
 *
 * @param options - Configuration options
 * @param options.startDate - Start date of the range
 * @param options.endDate - End date of the range
 * @param options.enabled - Whether the query is enabled (default: true)
 * @param options.bufferDays - Number of days to add before/after for navigation (default: 7)
 *
 * @returns Query result with eventsByDate, events, and loading/error states
 *
 * @example
 * ```tsx
 * const { eventsByDate, isLoading } = useTeamCalendarForDateRange({
 *   startDate: new Date(2024, 0, 1),
 *   endDate: new Date(2024, 1, 0),
 * });
 *
 * // Check if a date has team leave
 * const dateKey = format(someDate, 'yyyy-MM-dd');
 * const hasLeave = !!eventsByDate[dateKey]?.length;
 * ```
 */
export function useTeamCalendarForDateRange(
  options: UseTeamCalendarForDateRangeOptions
): UseQueryResult<TeamCalendarResponse, Error> & {
  eventsByDate: Record<string, LeaveEvent[]>;
} {
  const {
    startDate,
    endDate,
    enabled = true,
    bufferDays = 7,
  } = options;

  // Add buffer days for smoother calendar navigation
  const bufferedStartDate = subDays(startDate, bufferDays);
  const bufferedEndDate = addDays(endDate, bufferDays);

  // Format dates for API and query key
  const startDateStr = format(bufferedStartDate, 'yyyy-MM-dd');
  const endDateStr = format(bufferedEndDate, 'yyyy-MM-dd');

  const queryResult = useQuery({
    queryKey: queryKeys.calendar.team(startDateStr, endDateStr),
    queryFn: async (): Promise<TeamCalendarResponse> => {
      const params = new URLSearchParams({
        startDate: startDateStr,
        endDate: endDateStr,
      });

      const response = await fetch(`/api/calendar/team-leave?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const error = new Error(
          `Failed to fetch team calendar: ${response.status} ${response.statusText}`
        ) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      const result = await response.json();

      if (!result.success) {
        const error = new Error(
          result.error?.message || 'Failed to fetch team calendar'
        ) as Error & { status?: number };
        if (result.error?.statusCode) {
          error.status = result.error.statusCode;
        }
        throw error;
      }

      return result.data;
    },
    enabled: enabled && !!startDate && !!endDate,
    staleTime: queryOptions.calendar.staleTime,
    gcTime: queryOptions.calendar.gcTime,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Extract eventsByDate from the query result, providing empty object as fallback
  const eventsByDate = queryResult.data?.eventsByDate || {};

  return {
    ...queryResult,
    eventsByDate,
  };
}
