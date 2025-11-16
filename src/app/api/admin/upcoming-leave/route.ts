import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/middleware/auth";
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
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingLeave = await prisma.leaveRequest.findMany({
      where: {
        OR: [
          { status: "APPROVED" },
          { status: "PENDING" }
        ],
        startDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    const formattedUpcomingLeave = upcomingLeave.map(leave => ({
      id: leave.id,
      name: leave.user.name || leave.user.email,
      startDate: leave.startDate.toISOString().split('T')[0],
      endDate: leave.endDate.toISOString().split('T')[0],
      type: leave.type,
      status: leave.status,
      days: Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
      hours: leave.hours
    }));

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