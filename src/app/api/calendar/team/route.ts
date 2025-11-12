import { NextRequest } from 'next/server';
import { apiSuccess, apiError, TypedApiError } from '@/lib/api/response';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { AuthenticationError, ValidationError } from '@/lib/api/errors';
import { getTeamCalendarData } from '@/lib/services/leave.service';
import { calendarCache, createCacheKey } from '@/lib/cache/cache-manager';
import { withErrorHandler, composeMiddleware, withPerformanceMonitoring, withQueryOptimization } from '@/middleware/error-handler';
import { logger } from '@/lib/logger';

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
  logger.info('Fetching calendar data', { startDate, endDate, month, year });
  const teamCalendarData = await getTeamCalendarData(startDate, endDate);
  logger.info('Calendar data fetched', { requestCount: (teamCalendarData as any)?.requests?.length || 0 });
  
  // Transform the data for calendar display
  const calendarEvents = (teamCalendarData as any)?.requests || [];

  // Group events by date for easier calendar rendering
  const eventsByDate: Record<string, typeof calendarEvents> = {};
  
  calendarEvents.forEach((event: any) => {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    
    // Create entry for each day of the leave period
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
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

