import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, HttpStatus } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email/service';
import { withAdminAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/api/errors';

// Helper function to calculate days between dates
function calculateDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

interface AuthContext {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

interface LeaveRequestUser {
  id: string;
  name: string | null;
  email: string;
}

interface LeaveRequest {
  id: string;
  userId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
  user: LeaveRequestUser;
  days?: number;
}

interface RequestsByUser {
  user: LeaveRequestUser;
  requests: LeaveRequest[];
}

interface BulkApprovalResponse {
  message: string;
  approved: number;
  emailsSent: number;
  emailErrors?: string[];
  affectedUsers: string[];
}

async function bulkApproveHandler(req: NextRequest, context: AuthContext): Promise<NextResponse> {
  try {
    const { user: admin } = context;

    // Audit log for bulk administrative action
    logger.securityEvent('admin_bulk_action', 'high', admin.id, {
      endpoint: '/api/admin/bulk-approve',
      action: 'bulk_approve_all_pending',
      adminEmail: admin.email
    });

    // Get all pending requests with user details
    const pendingRequests = await prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: true }
    });

    if (pendingRequests.length === 0) {
      return apiSuccess({ 
        message: 'No pending requests to approve',
        approved: 0,
        emailsSent: 0
      });
    }

    // Security check: Log the scale of the operation
    if (pendingRequests.length > 50) {
      logger.securityEvent('large_bulk_operation', 'high', admin.id, {
        requestCount: pendingRequests.length,
        action: 'bulk_approve',
        adminEmail: admin.email
      });
    }

    // Update all requests to approved with transaction safety
    const updateResult = await prisma.$transaction(async (tx) => {
      // First, verify all requests are still pending (race condition protection)
      const currentPending = await tx.leaveRequest.count({
        where: { status: 'PENDING' }
      });

      if (currentPending !== pendingRequests.length) {
        throw new ValidationError('Request state changed during processing. Please refresh and try again.');
      }

      // Update all requests
      return await tx.leaveRequest.updateMany({
        where: { status: 'PENDING' },
        data: {
          status: 'APPROVED',
          approvedBy: admin.name || admin.email,
          approvedAt: new Date()
        }
      });
    });

    // Group requests by user for smart email batching
    const requestsByUser = pendingRequests.reduce((acc, request) => {
      const userId = request.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: {
            ...request.user,
            name: request.user.name || 'Unknown User'
          },
          requests: []
        };
      }
      acc[userId].requests.push({
        ...request,
        user: {
          ...request.user,
          name: request.user.name || 'Unknown User'
        },
        days: calculateDays(request.startDate, request.endDate)
      });
      return acc;
    }, {} as Record<string, RequestsByUser>);

    // Send batched emails with error handling
    let emailsSent = 0;
    const emailErrors: string[] = [];
    
    for (const userData of Object.values(requestsByUser)) {
      try {
        await EmailService.sendBulkApprovalNotification(
          userData.user.email,
          userData.user.name || userData.user.email,
          userData.requests,
          admin.name || admin.email
        );
        emailsSent++;
      } catch (emailError) {
        const errorMsg = `Failed to send email to ${userData.user.email}`;
        logger.error(errorMsg, { 
          action: 'email_error',
          resource: 'bulk_approval',
          metadata: { email: userData.user.email }
        }, emailError instanceof Error ? emailError : new Error(String(emailError)));
        emailErrors.push(errorMsg);
      }
    }

    // Log the completion of bulk operation
    logger.info('Bulk approval completed', {
      userId: admin.id,
      action: 'bulk_approve_completed',
      resource: 'leave_request',
      metadata: {
        approvedCount: updateResult.count,
        emailsSent,
        emailErrors: emailErrors.length,
        affectedUsers: Object.values(requestsByUser).length
      }
    });

    const response = {
      message: `Successfully approved ${updateResult.count} requests`,
      approved: updateResult.count,
      emailsSent,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
      affectedUsers: Object.values(requestsByUser).map(u => u.user.name || u.user.email)
    };

    return apiSuccess<BulkApprovalResponse>(response);

  } catch (error) {
    logger.error('Bulk approve error', {
      action: 'bulk_approve_error',
      resource: 'leave_request'
    }, error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof ValidationError) {
      return apiError(error.message, 400);
    }
    
    return apiError('Failed to bulk approve requests', 500);
  }
}

// Apply comprehensive security with validation
export const POST = withCompleteSecurity(
  withAdminAuth(bulkApproveHandler),
  { 
    validateInput: false, // No input validation needed for bulk approve all
    skipCSRF: false // POST operation requires CSRF protection
  }
);