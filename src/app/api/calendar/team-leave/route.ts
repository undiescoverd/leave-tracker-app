import { NextRequest } from 'next/server';
import { apiSuccess, apiError, TypedApiError } from '@/lib/api/response';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { AuthenticationError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { calendarCache, createCacheKey } from '@/lib/cache/cache-manager';

export async function GET(req: NextRequest) {
  try {
    await getAuthenticatedUser();
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
      // Date range mode
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam + 'T23:59:59');
      cacheKey = createCacheKey('team-calendar-range', startDateParam, endDateParam);
    } else {
      // Month/year mode (fallback)
      const month = monthParam || new Date().getMonth().toString();
      const year = yearParam || new Date().getFullYear().toString();
      startDate = new Date(parseInt(year), parseInt(month), 1);
      endDate = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59);
      cacheKey = createCacheKey('team-calendar', year, month);
    }
    
    // Check cache first
    const cachedData = calendarCache.get(cacheKey);
    
    if (cachedData) {
      return apiSuccess(cachedData);
    }
    
    // Get all leave requests for the month
    // Admins see all requests, users see all requests (for team visibility)
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        OR: [
          {
            startDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            endDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: endDate } },
            ],
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Transform the data for calendar display
    const calendarEvents = leaveRequests.map((request) => ({
      id: request.id,
      user: {
        id: request.user.id,
        name: request.user.name,
        email: request.user.email,
      },
      startDate: request.startDate.toISOString().split('T')[0],
      endDate: request.endDate.toISOString().split('T')[0],
      type: request.type,
      status: request.status,
      comments: request.comments,
      hours: request.hours,
    }));

    // Group events by date for easier calendar rendering
    const eventsByDate: Record<string, typeof calendarEvents> = {};
    
    calendarEvents.forEach((event) => {
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
      events: calendarEvents,
      eventsByDate,
      totalEvents: calendarEvents.length,
    };

    // Cache the response data
    calendarCache.set(cacheKey, responseData);

    return apiSuccess(responseData);

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return apiError(error.message, (error as TypedApiError).statusCode);
    }
    console.error('Team leave calendar error:', error);
    return apiError('Internal server error', 500);
  }
}