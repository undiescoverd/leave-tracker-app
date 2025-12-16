import { NextRequest } from 'next/server';
import { apiSuccess, apiError, TypedApiError } from '@/lib/api/response';
import { getAuthenticatedUser } from '@/lib/auth-utils.supabase';
import { AuthenticationError, ValidationError } from '@/lib/api/errors';
import { getTeamCalendarData } from '@/lib/services/leave.service.supabase';
import { calendarCache, createCacheKey } from '@/lib/cache/cache-manager';
import { withErrorHandler, composeMiddleware, withPerformanceMonitoring, withQueryOptimization } from '@/middleware/error-handler';
import { logger } from '@/lib/logger';

async function getTeamLeaveCalendar(req: NextRequest) {
  const user = await getAuthenticatedUser();
  const { searchParams } = new URL(req.url);
  
  // Get query parameters - support both month/year and date range
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  
  let startDate: Date;
  let endDate: Date;
  let cacheKey: string;
  
  if (startDateParam && endDateParam) {
    // Validate date format
    const startDateObj = new Date(startDateParam);
    const endDateObj = new Date(endDateParam);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new ValidationError('Invalid date format. Use YYYY-MM-DD.');
    }
    
    if (startDateObj > endDateObj) {
      throw new ValidationError('Start date must be before or equal to end date.');
    }
    
    // Date range mode
    startDate = startDateObj;
    endDate = new Date(endDateParam + 'T23:59:59');
    cacheKey = createCacheKey('team-calendar-range', startDateParam, endDateParam);
  } else {
    // Month/year mode (fallback)
    const month = monthParam ? parseInt(monthParam) : new Date().getMonth();
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    
    if (isNaN(month) || isNaN(year) || month < 0 || month > 11) {
      throw new ValidationError('Invalid month or year parameters.');
    }
    
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 0, 23, 59, 59);
    cacheKey = createCacheKey('team-calendar', year, month);
  }
  
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
  
  // Use the optimized service function
  const teamCalendarData = await getTeamCalendarData(startDate, endDate);
  
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
    month: startDateParam ? startDate.getMonth() : parseInt(monthParam || new Date().getMonth().toString()),
    year: startDateParam ? startDate.getFullYear() : parseInt(yearParam || new Date().getFullYear().toString()),
    dateRange: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    events: calendarEvents,
    eventsByDate,
    totalEvents: calendarEvents.length,
    fromCache: false,
    userId: user.id,
    metadata: {
      queryDuration: `Generated for user ${user.id}`,
      totalRequests: (teamCalendarData as any)?.totalRequests || 0,
    },
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
)(getTeamLeaveCalendar);