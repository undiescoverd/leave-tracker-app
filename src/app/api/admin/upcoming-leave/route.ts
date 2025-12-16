import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAdminAuth } from "@/lib/middleware/auth.supabase";
import { withCompleteSecurity } from "@/lib/middleware/security";
import { logger } from "@/lib/logger";

interface UserContext {
  id: string;
  email: string;
  role: string;
}

async function getUpcomingLeaveHandler(req: NextRequest, context: { user: UserContext }): Promise<NextResponse> {
  try {
    const { user } = context;

    // Audit log for admin data access
    logger.securityEvent('admin_data_access', 'medium', user.id, {
      endpoint: '/api/admin/upcoming-leave',
      adminEmail: user.email
    });

    // Get upcoming leave requests (approved and pending) for the next 30 days
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: upcomingLeave, error: leaveError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        start_date,
        end_date,
        type,
        status,
        hours,
        user:users!inner (
          name,
          email
        )
      `)
      .in('status', ['APPROVED', 'PENDING'])
      .gte('start_date', now.toISOString())
      .lte('start_date', thirtyDaysFromNow.toISOString())
      .order('start_date', { ascending: true });

    if (leaveError) {
      logger.error("Error fetching upcoming leave:", {
        metadata: { error: leaveError.message }
      });
      return NextResponse.json(
        { error: "Failed to fetch upcoming leave data" },
        { status: 500 }
      );
    }

    const formattedUpcomingLeave = (upcomingLeave || []).map(leave => {
      const userData = Array.isArray(leave.user) ? leave.user[0] : leave.user;
      return {
        id: leave.id,
        name: userData?.name || userData?.email || 'Unknown',
        startDate: new Date(leave.start_date).toISOString().split('T')[0],
        endDate: new Date(leave.end_date).toISOString().split('T')[0],
        type: leave.type,
        status: leave.status,
        days: Math.ceil((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
        hours: leave.hours
      };
    });

    logger.info('Admin upcoming leave data accessed', {
      adminId: user.id,
      recordCount: formattedUpcomingLeave.length
    });

    return NextResponse.json({
      success: true,
      upcomingLeave: formattedUpcomingLeave
    });

  } catch (error) {
    logger.error("Error fetching upcoming leave:", {
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return NextResponse.json(
      { error: "Failed to fetch upcoming leave data" },
      { status: 500 }
    );
  }
}

// Apply comprehensive security middleware
export const GET = withCompleteSecurity(
  withAdminAuth(getUpcomingLeaveHandler) as (req: NextRequest) => Promise<NextResponse>,
  {
    validateInput: false, // GET request, no body validation needed
    skipCSRF: true // GET request, CSRF not applicable
  }
);
