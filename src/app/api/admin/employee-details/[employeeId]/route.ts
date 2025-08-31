import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;
    const user = await getAuthenticatedUser();
    
    if (user.role !== 'ADMIN') {
      return apiError('Unauthorized', 403);
    }

    const employee = await prisma.user.findUnique({
      where: { 
        id: employeeId,
        role: 'USER' // Only regular employees, not admins
      },
      include: {
        leaveRequests: {
          orderBy: { createdAt: 'desc' }
        },
        toilEntries: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!employee) {
      return apiError('Employee not found', 404);
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // Filter requests for current year
    const currentYearRequests = employee.leaveRequests.filter(req => 
      req.startDate >= yearStart && req.startDate <= yearEnd
    );

    // Calculate balances for current year
    const annualLeaveUsed = currentYearRequests
      .filter(req => req.type === 'ANNUAL' && req.status === 'APPROVED')
      .reduce((sum, req) => sum + req.days, 0);
    
    const sickLeaveUsed = currentYearRequests
      .filter(req => req.type === 'SICK' && req.status === 'APPROVED')
      .reduce((sum, req) => sum + req.days, 0);
    
    const unpaidLeaveUsed = currentYearRequests
      .filter(req => req.type === 'UNPAID' && req.status === 'APPROVED')
      .reduce((sum, req) => sum + req.days, 0);

    // Calculate TOIL balance from TOIL entries (more accurate than leave requests)
    const toilBalance = employee.toilBalance || 0;

    // Calculate usage patterns
    const patterns = {
      preferredMonths: getPreferredMonths(employee.leaveRequests),
      averageRequestLength: getAverageRequestLength(employee.leaveRequests),
      mostCommonLeaveType: getMostCommonLeaveType(employee.leaveRequests),
      totalRequests: employee.leaveRequests.length
    };

    // Get recent activity (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentActivity = employee.leaveRequests
      .filter(req => req.createdAt >= threeMonthsAgo)
      .slice(0, 10);

    return apiSuccess({
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.email?.includes('@tdh') ? 'UK Agent' : 'Other',
        annualLeaveEntitlement: employee.annualLeaveEntitlement || 32,
        toilBalance: employee.toilBalance || 0,
        createdAt: employee.createdAt
      },
      balances: {
        annualLeave: {
          used: annualLeaveUsed,
          total: employee.annualLeaveEntitlement || 32,
          remaining: (employee.annualLeaveEntitlement || 32) - annualLeaveUsed,
          percentage: Math.round((annualLeaveUsed / (employee.annualLeaveEntitlement || 32)) * 100)
        },
        sickLeave: {
          used: sickLeaveUsed,
          total: 3,
          remaining: 3 - sickLeaveUsed,
          percentage: Math.round((sickLeaveUsed / 3) * 100)
        },
        unpaidLeave: {
          used: unpaidLeaveUsed,
          year: currentYear
        },
        toil: {
          balance: toilBalance,
          entries: employee.toilEntries.length,
          pendingEntries: employee.toilEntries.filter(entry => !entry.approved).length
        }
      },
      patterns,
      recentActivity,
      leaveHistory: employee.leaveRequests,
      toilHistory: employee.toilEntries,
      stats: {
        joinDate: employee.createdAt,
        totalLeaveRequests: employee.leaveRequests.length,
        approvedRequests: employee.leaveRequests.filter(req => req.status === 'APPROVED').length,
        pendingRequests: employee.leaveRequests.filter(req => req.status === 'PENDING').length,
        rejectedRequests: employee.leaveRequests.filter(req => req.status === 'REJECTED').length
      }
    });

  } catch (error) {
    console.error('Employee details error:', error);
    return apiError('Failed to fetch employee details', 500);
  }
}

// Helper functions
function getPreferredMonths(requests: any[]) {
  const monthCounts: { [key: number]: number } = {};
  
  requests.forEach(req => {
    if (req.status === 'APPROVED') {
      const month = req.startDate.getMonth();
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    }
  });

  const sortedMonths = Object.entries(monthCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  return sortedMonths.map(([month, count]) => ({
    month: parseInt(month),
    monthName: new Date(2025, parseInt(month), 1).toLocaleString('default', { month: 'long' }),
    requests: count
  }));
}

function getAverageRequestLength(requests: any[]) {
  const approvedRequests = requests.filter(req => req.status === 'APPROVED');
  if (approvedRequests.length === 0) return 0;
  
  const totalDays = approvedRequests.reduce((sum, req) => sum + req.days, 0);
  return Math.round((totalDays / approvedRequests.length) * 10) / 10;
}

function getMostCommonLeaveType(requests: any[]) {
  const typeCounts: { [key: string]: number } = {};
  
  requests.forEach(req => {
    if (req.status === 'APPROVED') {
      typeCounts[req.type] = (typeCounts[req.type] || 0) + 1;
    }
  });

  const sortedTypes = Object.entries(typeCounts)
    .sort(([,a], [,b]) => b - a);

  return sortedTypes.length > 0 ? sortedTypes[0][0] : 'ANNUAL';
}