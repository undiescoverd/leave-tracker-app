import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { withAdminAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { prisma } from '@/lib/prisma';
import { logger, generateRequestId } from '@/lib/logger';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { statsCache, createCacheKey } from '@/lib/cache/cache-manager';
import { withCacheHeaders } from '@/lib/middleware/cache-headers';
import { calculateAdminNotifications } from '@/lib/notifications/notification-policy';

async function getAdminStatsHandler(req: NextRequest, context: { user: { id: string; email: string; name: string } }): Promise<NextResponse> {
  const requestId = generateRequestId();
  const start = performance.now();
  
  try {
    logger.apiRequest('GET', '/api/admin/stats', undefined, requestId);
    
    const admin = context.user;

    // Check cache first
    const cacheKey = createCacheKey('admin-stats', 'global');
    const cachedStats = statsCache.get(cacheKey);
    
    if (cachedStats) {
      logger.cacheOperation('hit', cacheKey);
      const duration = performance.now() - start;
      logger.apiResponse('GET', '/api/admin/stats', 200, duration, admin.id, requestId);
      return apiSuccess(cachedStats);
    }
    
    logger.cacheOperation('miss', cacheKey);

    // Audit log for admin stats access
    logger.securityEvent('admin_data_access', 'medium', admin.id, {
      endpoint: '/api/admin/stats',
      action: 'view_admin_statistics',
      adminEmail: admin.email
    });

    const [
      allLeaveRequests,
      allToilEntries,
      totalUsers,
      activeEmployees,
      approvedThisMonth
    ] = await Promise.all([
      prisma.leaveRequest.findMany({
        select: {
          status: true,
          userId: true
        }
      }),
      
      prisma.toilEntry.findMany({
        select: {
          approved: true,
          userId: true
        }
      }),
      
      prisma.user.count(),
      
      prisma.user.count({
        where: { role: 'USER' }
      }),
      
      prisma.leaveRequest.count({
        where: {
          status: 'APPROVED',
          updatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      })
    ]);

    // Calculate actionable notifications using the notification policy
    const notifications = calculateAdminNotifications({
      pendingRequests: allLeaveRequests,
      toilEntries: allToilEntries
    });

    // Log successful stats access
    logger.info('Admin statistics accessed', {
      adminId: admin.id,
      statsRequested: true,
      metadata: {
        actionablePendingRequests: notifications.pendingRequests.actionable,
        totalPendingRequests: notifications.pendingRequests.total,
        actionableToilPending: notifications.toilPending.actionable,
        totalToilEntries: notifications.toilPending.total,
        totalUsers,
        activeEmployees,
        approvedThisMonth,
        totalActionableNotifications: notifications.totalActionable
      }
    });

    const statsData = {
      // Actionable notifications (what shows in badges)
      pendingRequests: notifications.pendingRequests.actionable,
      toilPending: notifications.toilPending.actionable,
      
      // Reference data (no badges)
      totalUsers,
      activeEmployees,
      approvedThisMonth,
      systemStatus: 'Active',
      allSystemsOperational: true,
      
      // Additional notification breakdown for debugging
      _notificationBreakdown: {
        pendingRequests: notifications.pendingRequests,
        toilPending: notifications.toilPending,
        totalActionable: notifications.totalActionable
      }
    };

    // Cache the stats for 5 minutes
    statsCache.set(cacheKey, statsData, 5 * 60 * 1000);
    logger.cacheOperation('set', cacheKey);

    const duration = performance.now() - start;
    logger.apiResponse('GET', '/api/admin/stats', 200, duration, admin.id, requestId);
    
    return apiSuccess(statsData);

  } catch (error) {
    const duration = performance.now() - start;
    
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      logger.apiResponse('GET', '/api/admin/stats', error.statusCode, duration, undefined, requestId);
      return apiError(error.message, error.statusCode as any);
    }
    
    logger.error('Admin stats error:', { 
      requestId,
      action: 'api_error',
      resource: '/api/admin/stats',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    
    logger.apiResponse('GET', '/api/admin/stats', 500, duration, undefined, requestId);
    return apiError('Failed to fetch admin statistics', 500);
  }
}

// Apply comprehensive admin security with caching
export const GET = withCompleteSecurity(
  withCacheHeaders(
    withAdminAuth(getAdminStatsHandler)
  ),
  { 
    validateInput: false, // GET request, no input validation needed
    skipCSRF: true // GET request, CSRF not applicable
  }
);