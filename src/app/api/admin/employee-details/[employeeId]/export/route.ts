import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api/response';

import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';

async function exportEmployeeDetailsHandler(
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

    // Get employee data (reuse logic from details endpoint)
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', employeeId)
      .eq('role', 'USER')
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

    // Convert snake_case to camelCase for HTML generation
    const employeeData = {
      id: (employee as any).id,
      name: (employee as any).name,
      email: (employee as any).email,
      createdAt: new Date((employee as any).created_at),
      annualLeaveBalance: (employee as any).annual_leave_balance,
      toilBalance: (employee as any).toil_balance,
      leaveRequests: (leaveRequests || []).map((req: any) => ({
        id: req.id,
        startDate: new Date(req.start_date),
        endDate: new Date(req.end_date),
        type: req.type,
        status: req.status,
        hours: req.hours,
        comments: req.comments,
        createdAt: new Date(req.created_at),
        approvedBy: req.approved_by
      })),
      toilEntries: (toilEntries || []).map((entry: any) => ({
        id: entry.id,
        date: new Date(entry.date),
        type: entry.type,
        hours: entry.hours,
        reason: entry.reason,
        approved: entry.approved,
        createdAt: new Date(entry.created_at)
      }))
    };

    // Generate comprehensive HTML report
    const html = generateEmployeeReportHTML(employeeData);

    // For now, return HTML that can be printed to PDF by browser
    // In production, you could use puppeteer or similar for server-side PDF generation
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="employee-leave-report-${(employeeData.name || 'unknown').replace(' ', '-')}.html"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return apiError('Failed to generate report', 500);
  }
}

// Apply comprehensive admin security
export const GET = withCompleteSecurity(
  withAdminAuth(exportEmployeeDetailsHandler),
  { 
    validateInput: false, // GET request, no input validation needed
    skipCSRF: true // GET request, CSRF not applicable
  }
);

interface Employee {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  annualLeaveBalance?: number;
  toilBalance?: number;
  leaveRequests: LeaveRequest[];
  toilEntries: ToilEntry[];
}

interface LeaveRequest {
  id: string;
  startDate: Date;
  endDate: Date;
  type: string;
  status: string;
  hours?: number | null;
  comments?: string | null;
  createdAt: Date;
  approvedBy?: string | null;
}

interface ToilEntry {
  id: string;
  date: Date;
  type: string;
  hours: number;
  reason: string;
  approved: boolean;
  createdAt: Date;
}

function generateEmployeeReportHTML(employee: Employee): string {
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31);

  // Calculate current year data
  const currentYearRequests = employee.leaveRequests.filter((req) => 
    new Date(req.startDate) >= yearStart && new Date(req.startDate) <= yearEnd
  );

  const annualLeaveUsed = currentYearRequests
    .filter((req) => req.type === 'ANNUAL' && req.status === 'APPROVED')
    .reduce((sum, req) => sum + (req.hours || 0) / 8, 0); // Convert hours to days

  const sickLeaveUsed = currentYearRequests
    .filter((req) => req.type === 'SICK' && req.status === 'APPROVED')
    .reduce((sum, req) => sum + (req.hours || 0) / 8, 0);

  const unpaidLeaveUsed = currentYearRequests
    .filter((req) => req.type === 'UNPAID' && req.status === 'APPROVED')
    .reduce((sum, req) => sum + (req.hours || 0) / 8, 0);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Employee Leave Report - ${employee.name || 'Unknown Employee'}</title>
      <style>
        body { 
          font-family: 'Inter', Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header { 
          border-bottom: 3px solid #1B365D; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
          text-align: center;
        }
        .company-logo {
          color: #1B365D;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .report-title {
          color: #1B365D;
          margin: 10px 0;
        }
        .employee-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .section { 
          margin: 30px 0; 
          page-break-inside: avoid;
        }
        .section h3 {
          color: #1B365D;
          border-bottom: 2px solid #e9ecef;
          padding-bottom: 10px;
        }
        .balance-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
          gap: 20px; 
          margin: 20px 0;
        }
        .balance-card {
          background: #fff;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        .balance-value {
          font-size: 28px;
          font-weight: bold;
          color: #1B365D;
        }
        .balance-label {
          color: #6c757d;
          font-size: 14px;
          margin-top: 5px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0;
        }
        th, td { 
          padding: 12px; 
          border: 1px solid #dee2e6; 
          text-align: left; 
        }
        th {
          background: #f8f9fa;
          font-weight: 600;
          color: #1B365D;
        }
        .status-approved { color: #28a745; font-weight: bold; }
        .status-pending { color: #ffc107; font-weight: bold; }
        .status-rejected { color: #dc3545; font-weight: bold; }
        .leave-type {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        .leave-annual { background: #e3f2fd; color: #1976d2; }
        .leave-sick { background: #ffebee; color: #d32f2f; }
        .leave-unpaid { background: #f5f5f5; color: #616161; }
        .leave-toil { background: #f3e5f5; color: #7b1fa2; }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
          text-align: center;
          color: #6c757d;
          font-size: 12px;
        }
        @media print {
          body { margin: 0; }
          .header { page-break-after: avoid; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-logo">TDH Agency</div>
        <h1 class="report-title">Employee Leave Report</h1>
        <p>Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
      </div>
      
      <div class="employee-info">
        <h2>${employee.name || 'Unknown Employee'}</h2>
        <p><strong>Email:</strong> ${employee.email}</p>
        <p><strong>Department:</strong> ${employee.email?.includes('@tdh') ? 'UK Agent' : 'Other'}</p>
        <p><strong>Join Date:</strong> ${formatDate(employee.createdAt)}</p>
        <p><strong>Annual Leave Entitlement:</strong> ${employee.annualLeaveBalance || 32} days</p>
      </div>

      <div class="section">
        <h3>Current Leave Balances (${currentYear})</h3>
        <div class="balance-grid">
          <div class="balance-card">
            <div class="balance-value">${annualLeaveUsed}/${employee.annualLeaveBalance || 32}</div>
            <div class="balance-label">Annual Leave (Days)</div>
            <div class="balance-label">${(employee.annualLeaveBalance || 32) - annualLeaveUsed} remaining</div>
          </div>
          <div class="balance-card">
            <div class="balance-value">${employee.toilBalance || 0}h</div>
            <div class="balance-label">TOIL Balance</div>
            <div class="balance-label">${employee.toilEntries.length} total entries</div>
          </div>
          <div class="balance-card">
            <div class="balance-value">${sickLeaveUsed}/3</div>
            <div class="balance-label">Sick Leave (Days)</div>
            <div class="balance-label">${3 - sickLeaveUsed} remaining</div>
          </div>
          <div class="balance-card">
            <div class="balance-value">${unpaidLeaveUsed}</div>
            <div class="balance-label">Unpaid Leave (Days)</div>
            <div class="balance-label">${currentYear} total</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>Leave Request History (${currentYear})</h3>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Type</th>
              <th>Hours</th>
              <th>Status</th>
              <th>Approved By</th>
              <th>Reason</th>
              <th>Requested Date</th>
            </tr>
          </thead>
          <tbody>
            ${currentYearRequests.map((req) => `
              <tr>
                <td>${formatDate(req.startDate)} - ${formatDate(req.endDate)}</td>
                <td>
                  <span class="leave-type leave-${req.type.toLowerCase()}">
                    ${req.type}
                  </span>
                </td>
                <td>${req.hours || 0}h</td>
                <td class="status-${req.status.toLowerCase()}">${req.status}</td>
                <td>${req.approvedBy || '-'}</td>
                <td>${req.comments || '-'}</td>
                <td>${formatDate(req.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${currentYearRequests.length === 0 ? '<p style="text-align: center; color: #6c757d;">No leave requests found for ' + currentYear + '</p>' : ''}
      </div>

      <div class="section">
        <h3>TOIL Entry History</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Hours</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            ${employee.toilEntries.map((entry) => `
              <tr>
                <td>${formatDate(entry.date)}</td>
                <td>${entry.type}</td>
                <td>${entry.hours}h</td>
                <td class="status-${entry.approved ? 'approved' : 'pending'}">${entry.approved ? 'APPROVED' : 'PENDING'}</td>
                <td>${entry.reason}</td>
                <td>${formatDate(entry.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${employee.toilEntries.length === 0 ? '<p style="text-align: center; color: #6c757d;">No TOIL entries found</p>' : ''}
      </div>

      <div class="section">
        <h3>Summary Statistics</h3>
        <div class="balance-grid">
          <div class="balance-card">
            <div class="balance-value">${employee.leaveRequests.length}</div>
            <div class="balance-label">Total Leave Requests</div>
          </div>
          <div class="balance-card">
            <div class="balance-value">${employee.leaveRequests.filter((req) => req.status === 'APPROVED').length}</div>
            <div class="balance-label">Approved Requests</div>
          </div>
          <div class="balance-card">
            <div class="balance-value">${employee.leaveRequests.filter((req) => req.status === 'PENDING').length}</div>
            <div class="balance-label">Pending Requests</div>
          </div>
          <div class="balance-card">
            <div class="balance-value">${employee.toilEntries.filter((entry) => !entry.approved).length}</div>
            <div class="balance-label">Pending TOIL Entries</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>This report was generated by TDH Agency Leave Tracker System</p>
        <p>For questions, contact your HR administrator</p>
      </div>
    </body>
    </html>
  `;
}