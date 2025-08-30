import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (user.role !== 'ADMIN') {
      return apiError('Unauthorized', 403);
    }

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
    console.error('Admin stats error:', error);
    return apiError('Failed to fetch admin statistics', 500);
  }
}