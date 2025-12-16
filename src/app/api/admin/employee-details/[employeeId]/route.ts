import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';

async function getEmployeeDetailsHandler(
  req: NextRequest,
  context: { user: unknown }
): Promise<NextResponse> {
  try {
    // Extract employeeId from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const employeeId = pathParts[pathParts.indexOf('employee-details') + 1];

    if (!employeeId) {
      return apiError('Employee ID required', 400);
    }
    // Admin user is available in context if needed

    // Get employee details
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', employeeId)
      .eq('role', 'USER') // Only regular employees, not admins
      .single();

    if (employeeError || !employee) {
      return apiError('Employee not found', 404);
    }

    // Get leave requests for this employee
    const { data: leaveRequests, error: leaveError } = await supabaseAdmin
      .from('leave_requests')
      .select('*')
      .eq('user_id', employeeId)
      .order('created_at', { ascending: false });

    if (leaveError) {
      console.error('Error fetching leave requests:', leaveError);
      return apiError('Failed to fetch leave requests', 500);
    }

    // Get TOIL entries for this employee
    const { data: toilEntries, error: toilError } = await supabaseAdmin
      .from('toil_entries')
      .select('*')
      .eq('user_id', employeeId)
      .order('created_at', { ascending: false });

    if (toilError) {
      console.error('Error fetching TOIL entries:', toilError);
      return apiError('Failed to fetch TOIL entries', 500);
    }

    // Convert snake_case to camelCase for consistency with frontend
    const employeeData = {
      id: (employee as any).id,
      name: (employee as any).name,
      email: (employee as any).email,
      role: (employee as any).role,
      annualLeaveBalance: (employee as any).annual_leave_balance,
      toilBalance: (employee as any).toil_balance,
      sickLeaveBalance: (employee as any).sick_leave_balance,
      createdAt: new Date((employee as any).created_at),
      updatedAt: new Date((employee as any).updated_at),
      leaveRequests: (leaveRequests || []).map((req: any) => ({
        id: req.id,
        userId: req.user_id,
        startDate: new Date(req.start_date),
        endDate: new Date(req.end_date),
        type: req.type,
        status: req.status,
        hours: req.hours,
        comments: req.comments,
        createdAt: new Date(req.created_at),
        updatedAt: new Date(req.updated_at),
        approvedBy: req.approved_by,
        approvedAt: req.approved_at ? new Date(req.approved_at) : null,
        rejectedBy: req.rejected_by,
        rejectedAt: req.rejected_at ? new Date(req.rejected_at) : null,
        days: req.days
      })),
      toilEntries: (toilEntries || []).map((entry: any) => ({
        id: entry.id,
        userId: entry.user_id,
        date: new Date(entry.date),
        type: entry.type,
        hours: entry.hours,
        reason: entry.reason,
        approved: entry.approved,
        createdAt: new Date(entry.created_at),
        updatedAt: new Date(entry.updated_at)
      }))
    };

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    // Filter requests for current year
    const currentYearRequests = employeeData.leaveRequests.filter(req =>
      req.startDate >= yearStart && req.startDate <= yearEnd
    );

    // Calculate balances for current year
    const annualLeaveUsed = currentYearRequests
      .filter(req => req.type === 'ANNUAL' && req.status === 'APPROVED')
      .reduce((sum, req) => {
        const days = Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0);

    const sickLeaveUsed = currentYearRequests
      .filter(req => req.type === 'SICK' && req.status === 'APPROVED')
      .reduce((sum, req) => {
        const days = Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0);

    // Note: UNPAID is not a valid LeaveType in the schema, removing this calculation

    // Calculate TOIL balance from TOIL entries (more accurate than leave requests)
    const toilBalance = employeeData.toilBalance || 0;

    // Calculate usage patterns
    const patterns = {
      preferredMonths: getPreferredMonths(employeeData.leaveRequests),
      averageRequestLength: getAverageRequestLength(employeeData.leaveRequests),
      mostCommonLeaveType: getMostCommonLeaveType(employeeData.leaveRequests),
      totalRequests: employeeData.leaveRequests.length
    };

    // Get recent activity (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentActivity = employeeData.leaveRequests
      .filter(req => req.createdAt >= threeMonthsAgo)
      .slice(0, 10);

    return apiSuccess({
      employee: {
        id: employeeData.id,
        name: employeeData.name,
        email: employeeData.email,
        department: employeeData.email?.includes('@tdh') ? 'UK Agent' : 'Other',
        annualLeaveEntitlement: employeeData.annualLeaveBalance || 32,
        toilBalance: employeeData.toilBalance || 0,
        createdAt: employeeData.createdAt
      },
      balances: {
        annualLeave: {
          used: annualLeaveUsed,
          total: employeeData.annualLeaveBalance || 32,
          remaining: (employeeData.annualLeaveBalance || 32) - annualLeaveUsed,
          percentage: Math.round((annualLeaveUsed / (employeeData.annualLeaveBalance || 32)) * 100)
        },
        sickLeave: {
          used: sickLeaveUsed,
          total: employeeData.sickLeaveBalance || 3,
          remaining: (employeeData.sickLeaveBalance || 3) - sickLeaveUsed,
          percentage: Math.round((sickLeaveUsed / (employeeData.sickLeaveBalance || 3)) * 100)
        },
        // Note: Unpaid leave not supported in current schema
        toil: {
          balance: toilBalance,
          entries: employeeData.toilEntries.length,
          pendingEntries: employeeData.toilEntries.filter(entry => !entry.approved).length
        }
      },
      patterns,
      recentActivity,
      leaveHistory: employeeData.leaveRequests,
      toilHistory: employeeData.toilEntries,
      stats: {
        joinDate: employeeData.createdAt,
        totalLeaveRequests: employeeData.leaveRequests.length,
        approvedRequests: employeeData.leaveRequests.filter(req => req.status === 'APPROVED').length,
        pendingRequests: employeeData.leaveRequests.filter(req => req.status === 'PENDING').length,
        rejectedRequests: employeeData.leaveRequests.filter(req => req.status === 'REJECTED').length
      }
    });

  } catch (error) {
    console.error('Employee details error:', error);
    return apiError('Failed to fetch employee details', 500);
  }
}

// Apply comprehensive admin security
export const GET = withCompleteSecurity(
  withAdminAuth(getEmployeeDetailsHandler),
  { 
    validateInput: false, // GET request, no input validation needed
    skipCSRF: true // GET request, CSRF not applicable
  }
);

// Helper functions
interface LeaveRequest {
  status: string;
  startDate: Date;
  type: string;
  days?: number;
}

function getPreferredMonths(requests: LeaveRequest[]) {
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

function getAverageRequestLength(requests: LeaveRequest[]) {
  const approvedRequests = requests.filter(req => req.status === 'APPROVED');
  if (approvedRequests.length === 0) return 0;
  
  const totalDays = approvedRequests.reduce((sum, req) => sum + (req.days || 0), 0);
  return Math.round((totalDays / approvedRequests.length) * 10) / 10;
}

function getMostCommonLeaveType(requests: LeaveRequest[]) {
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