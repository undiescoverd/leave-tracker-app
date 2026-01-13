import { NextRequest } from 'next/server';
import { apiSuccess, apiError, TypedApiError } from '@/lib/api/response';
import { getAuthenticatedUser } from '@/lib/auth-utils.supabase';
import { AuthenticationError, ValidationError } from '@/lib/api/errors';
import { getTeamCalendarData } from '@/lib/services/leave.service.supabase';
import { calendarCache, createCacheKey } from '@/lib/cache/cache-manager';
import { withErrorHandler, composeMiddleware, withPerformanceMonitoring, withQueryOptimization } from '@/middleware/error-handler';
import { logger } from '@/lib/logger';
import { parseUTCDateString, toLocalDateKey } from '@/lib/date-utils';

async function getTeamCalendar(req: NextRequest) {
  const user = await getAuthenticatedUser();
  const { searchParams } = new URL(req.url);
  
  // Get query parameters
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  
  // Default to current month/year if not provided
  const month = monthParam ? parseInt(monthParam) : new Date().getMonth() + 1;
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
  
  // Validate parameters
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    throw new ValidationError('Invalid month or year parameters.');
  }
  
  // Create cache key
  const cacheKey = createCacheKey('team-calendar', year, month);
  
  // Check cache first
  const cachedData = calendarCache.get(cacheKey);
  
  if (cachedData) {
    logger.cacheOperation('hit', cacheKey);
    return apiSuccess({
      ...cachedData,
      fromCache: true,
      userId: user.id,
    });
  }
  
  logger.cacheOperation('miss', cacheKey);
  
  // Calculate date range for the month (month is 1-12, Date constructor expects 0-11)
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  // Use the optimized service function
  logger.info('Fetching calendar data', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });
  const teamCalendarData = await getTeamCalendarData(startDate, endDate);
  logger.info('Calendar data fetched', { metadata: { requestCount: (teamCalendarData as any)?.requests?.length || 0 } });
  
  // Transform the data for calendar display
  const calendarEvents = (teamCalendarData as any)?.requests || [];

  // Group events by date for easier calendar rendering
  const eventsByDate: Record<string, typeof calendarEvents> = {};

  calendarEvents.forEach((event: any) => {
    // startDate and endDate are YYYY-MM-DD strings extracted from UTC timestamps in the database
    const startDateStr = event.startDate; // e.g., "2025-01-19"
    const endDateStr = event.endDate; // e.g., "2025-01-20"

    // Parse dates for iteration using explicit UTC (noon to avoid DST edge cases)
    const start = parseUTCDateString(startDateStr);
    const end = parseUTCDateString(endDateStr);

    // Create entry for each day of the leave period
    const current = new Date(start);
    while (current <= end) {
      // Format date as YYYY-MM-DD using local date components for consistency with client lookups
      const dateKey = toLocalDateKey(current);
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
      current.setDate(current.getDate() + 1);
    }
  });

  const responseData = {
    month,
    year,
    events: calendarEvents,
    eventsByDate,
    totalRequests: (teamCalendarData as any)?.totalRequests || 0,
    fromCache: false,
    userId: user.id,
  };

  // Cache the response data with shorter TTL for active data
  const ttl = calendarEvents.length > 0 ? 1 * 60 * 1000 : 5 * 60 * 1000; // 1min if events, 5min if empty
  calendarCache.set(cacheKey, responseData, ttl);
  logger.cacheOperation('set', cacheKey, ttl);

  return apiSuccess(responseData);
}

// Compose middleware for the GET handler
export const GET = composeMiddleware(
  withErrorHandler,
  withPerformanceMonitoring,
  withQueryOptimization
)(getTeamCalendar);

