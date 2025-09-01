import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';

export async function GET() {
  try {
    // Require admin authentication with proper error handling
    const admin = await requireAdmin();

    // Audit log for admin stats access
    logger.securityEvent('admin_data_access', 'medium', admin.id, {
      endpoint: '/api/admin/stats',
      action: 'view_admin_statistics',
      adminEmail: admin.email
    });

    const [
      pendingRequests,
      totalUsers,
      activeEmployees,
      toilPending,
      approvedThisMonth
    ] = await Promise.all([
      prisma.leaveRequest.count({
        where: { status: 'PENDING' }
      }),
      
      prisma.user.count(),
      
      prisma.user.count({
        where: { role: 'USER' }
      }),
      
      prisma.leaveRequest.count({
        where: { 
          status: 'PENDING',
          type: 'TOIL'
        }
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

    // Log successful stats access
    logger.info('Admin statistics accessed', {
      adminId: admin.id,
      statsRequested: true,
      metadata: {
        pendingRequests,
        totalUsers,
        activeEmployees,
        toilPending,
        approvedThisMonth
      }
    });

    return apiSuccess({
      pendingRequests,
      totalUsers,
      activeEmployees,
      toilPending,
      approvedThisMonth,
      systemStatus: 'Active',
      allSystemsOperational: true
    });

  } catch (error) {
    logger.error('Admin stats error:', { 
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return apiError(error.message, error.statusCode as number);
    }
    
    return apiError('Failed to fetch admin statistics', 500);
  }
}