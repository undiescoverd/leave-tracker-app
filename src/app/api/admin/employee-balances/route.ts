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

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const employees = await prisma.user.findMany({
      where: {
        role: 'USER' // Only get regular employees, exclude ADMINs
      },
      include: {
        leaveRequests: {
          where: {
            status: 'APPROVED',
            startDate: {
              gte: yearStart,
              lte: yearEnd
            }
          }
        }
      }
    });

    const employeeBalances = employees.map(employee => {
      // Calculate annual leave usage
      const annualLeaveUsed = employee.leaveRequests
        .filter(req => req.type === 'ANNUAL')
        .reduce((sum, req) => sum + req.days, 0);
      
      // Calculate TOIL balance
      const toilEarned = employee.leaveRequests
        .filter(req => req.type === 'TOIL' && req.isToilCredit)
        .reduce((sum, req) => sum + (req.toilHours || 0), 0);
      
      const toilUsed = employee.leaveRequests
        .filter(req => req.type === 'TOIL' && !req.isToilCredit)
        .reduce((sum, req) => sum + (req.toilHours || 0), 0);
      
      const toilBalance = toilEarned - toilUsed;
      
      // Calculate sick leave usage
      const sickLeaveUsed = employee.leaveRequests
        .filter(req => req.type === 'SICK')
        .reduce((sum, req) => sum + req.days, 0);
      
      // Calculate unpaid leave usage
      const unpaidLeaveUsed = employee.leaveRequests
        .filter(req => req.type === 'UNPAID')
        .reduce((sum, req) => sum + req.days, 0);

      // Calculate status
      const annualUsagePercent = (annualLeaveUsed / (employee.annualLeaveEntitlement || 32)) * 100;
      const sickUsagePercent = (sickLeaveUsed / 3) * 100;
      
      let status = 'good';
      let statusColor = 'success';
      let statusIcon = '✅';
      
      if (annualUsagePercent > 90 || unpaidLeaveUsed > 7 || sickUsagePercent > 100) {
        status = 'critical';
        statusColor = 'destructive';
        statusIcon = '🔴';
      } else if (annualUsagePercent > 70 || unpaidLeaveUsed > 3 || sickUsagePercent > 80) {
        status = 'medium';
        statusColor = 'warning';
        statusIcon = '⚠️';
      }

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        annualLeave: {
          used: annualLeaveUsed,
          total: employee.annualLeaveEntitlement || 32,
          remaining: (employee.annualLeaveEntitlement || 32) - annualLeaveUsed,
          percentage: Math.round(annualUsagePercent)
        },
        toilBalance,
        sickLeave: {
          used: sickLeaveUsed,
          total: 3,
          remaining: 3 - sickLeaveUsed,
          percentage: Math.round(sickUsagePercent)
        },
        unpaidLeave2025: unpaidLeaveUsed,
        status: {
          level: status,
          color: statusColor,
          icon: statusIcon
        }
      };
    });

    // UK Coverage warnings
    const ukAgents = employeeBalances.filter(emp => emp.department === 'UK Agent');
    const warnings = [];
    
    ukAgents.forEach(agent => {
      if (agent.annualLeave.remaining < 5) {
        warnings.push({
          type: 'low_balance',
          message: `${agent.name} has only ${agent.annualLeave.remaining} days annual leave remaining`,
          severity: 'warning',
          employeeId: agent.id
        });
      }
      
      if (agent.unpaidLeave2025 > 5) {
        warnings.push({
          type: 'high_unpaid',
          message: `${agent.name} has taken ${agent.unpaidLeave2025} unpaid days this year`,
          severity: 'info',
          employeeId: agent.id
        });
      }
    });

    return apiSuccess({
      employees: employeeBalances,
      ukCoverageWarnings: warnings,
      summary: {
        totalEmployees: employeeBalances.length,
        ukAgents: ukAgents.length,
        criticalStatus: employeeBalances.filter(emp => emp.status.level === 'critical').length,
        warningStatus: employeeBalances.filter(emp => emp.status.level === 'medium').length
      }
    });

  } catch (error) {
    console.error('Employee balances error:', error);
    return apiError('Failed to fetch employee balances', 500);
  }
}