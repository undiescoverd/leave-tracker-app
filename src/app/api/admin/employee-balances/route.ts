import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { logger } from '@/lib/logger';

interface UserContext {
  id: string;
  email: string;
  role: string;
}

interface DbUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  annual_leave_balance: number;
  toil_balance: number;
  sick_leave_balance: number;
}

interface DbLeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  hours: number | null;
}

async function getEmployeeBalancesHandler(req: NextRequest, context: { user: UserContext }) {
  try {
    const { user: admin } = context;

    // Audit log for admin accessing sensitive employee data
    logger.securityEvent('admin_data_access', 'medium', admin.id, {
      endpoint: '/api/admin/employee-balances',
      action: 'view_all_employee_balances',
      adminEmail: admin.email
    });

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // Fetch all USER role employees
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, annual_leave_balance, toil_balance, sick_leave_balance')
      .eq('role', 'USER')
      .returns<DbUser[]>();

    if (usersError) {
      logger.error('Failed to fetch users:', { metadata: { error: usersError.message } });
      return apiError('Failed to fetch employee balances', 500);
    }

    if (!usersData || usersData.length === 0) {
      return apiSuccess({
        employees: [],
        ukCoverageWarnings: [],
        summary: {
          totalEmployees: 0,
          ukAgents: 0,
          criticalStatus: 0,
          warningStatus: 0
        }
      });
    }

    // Fetch approved leave requests for the current year
    const { data: leaveRequestsData, error: leaveRequestsError } = await supabaseAdmin
      .from('leave_requests')
      .select('id, user_id, start_date, end_date, type, status, hours')
      .eq('status', 'APPROVED')
      .gte('start_date', yearStart.toISOString())
      .lte('start_date', yearEnd.toISOString())
      .returns<DbLeaveRequest[]>();

    if (leaveRequestsError) {
      logger.error('Failed to fetch leave requests:', { metadata: { error: leaveRequestsError.message } });
      return apiError('Failed to fetch employee balances', 500);
    }

    // Group leave requests by user_id
    const leaveRequestsByUser = (leaveRequestsData || []).reduce((acc, req) => {
      if (!acc[req.user_id]) {
        acc[req.user_id] = [];
      }
      acc[req.user_id].push({
        id: req.id,
        userId: req.user_id,
        startDate: new Date(req.start_date),
        endDate: new Date(req.end_date),
        type: req.type,
        status: req.status,
        hours: req.hours
      });
      return acc;
    }, {} as Record<string, Array<{
      id: string;
      userId: string;
      startDate: Date;
      endDate: Date;
      type: string;
      status: string;
      hours: number | null;
    }>>);

    // Convert users to expected format with camelCase fields
    const employees = usersData.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      annualLeaveBalance: user.annual_leave_balance,
      toilBalance: user.toil_balance,
      sickLeaveBalance: user.sick_leave_balance,
      leaveRequests: leaveRequestsByUser[user.id] || []
    }));

    const employeeBalances = employees.map(employee => {
      // Calculate annual leave usage
      const annualLeaveUsed = employee.leaveRequests
        .filter(req => req.type === 'ANNUAL')
        .reduce((sum, req) => sum + Math.round((req.hours || 0) / 8), 0); // Convert hours to days
      
      // Calculate TOIL balance (TOIL entries are tracked separately in toilEntry table)
      // This is a simplified calculation - in a real implementation, you'd query the toilEntry table
      const toilUsed = employee.leaveRequests
        .filter(req => req.type === 'TOIL')
        .reduce((sum, req) => sum + (req.hours || 0), 0);
      
      // Note: TOIL earned should come from toilEntry table, setting to 0 for now
      const toilBalance = 0 - toilUsed; // Negative indicates used TOIL
      
      // Calculate sick leave usage
      const sickLeaveUsed = employee.leaveRequests
        .filter(req => req.type === 'SICK')
        .reduce((sum, req) => sum + Math.round((req.hours || 0) / 8), 0); // Convert hours to days
      
      // Note: UNPAID is not a valid LeaveType in the schema, removing this calculation
      const unpaidLeaveUsed = 0;

      // Calculate status
      const annualUsagePercent = (annualLeaveUsed / 32) * 100; // Default 32 days entitlement
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
        department: 'General', // Department field not in schema
        annualLeave: {
          used: annualLeaveUsed,
          total: 32, // Default entitlement
          remaining: 32 - annualLeaveUsed,
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
    interface Warning {
      type: string;
      message: string;
      severity: string;
      employeeId: string;
    }
    const warnings: Warning[] = [];
    
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

    // Log successful data access
    logger.info('Employee balances accessed', {
      adminId: admin.id,
      employeeCount: employeeBalances.length,
      ukAgentCount: ukAgents.length,
      warningCount: warnings.length
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
    logger.error('Employee balances error:', { 
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return apiError('Failed to fetch employee balances', 500);
  }
}

// Apply comprehensive admin security
export const GET = withCompleteSecurity(
  withAdminAuth(getEmployeeBalancesHandler) as (req: NextRequest) => Promise<NextResponse>,
  {
    validateInput: false,
    skipCSRF: true // GET request, CSRF not applicable
  }
);