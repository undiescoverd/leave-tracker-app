import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { AuthenticationError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { calendarCache, createCacheKey } from '@/lib/cache/cache-manager';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(req.url);
    
    // Get query parameters
    const month = searchParams.get('month') || new Date().getMonth().toString();
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    
    // Check cache first
    const cacheKey = createCacheKey('team-calendar', year, month);
    const cachedData = calendarCache.get(cacheKey);
    
    if (cachedData) {
      return apiSuccess(cachedData);
    }
    
    // Calculate date range for the month
    const startDate = new Date(parseInt(year), parseInt(month), 1);
    const endDate = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59);
    
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
      month: parseInt(month),
      year: parseInt(year),
      events: calendarEvents,
      eventsByDate,
      totalEvents: calendarEvents.length,
    };

    // Cache the response data
    calendarCache.set(cacheKey, responseData);

    return apiSuccess(responseData);

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return apiError(error.message, error.statusCode as any);
    }
    console.error('Team leave calendar error:', error);
    return apiError('Internal server error', 500);
  }
}