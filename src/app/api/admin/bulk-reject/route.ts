import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, HttpStatus } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email/service';
import { withAdminAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/api/errors';

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
  name: string;
  email: string;
}

interface LeaveRequest {
  id: string;
  userId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  days: number;
  status: string;
  createdAt: Date;
  user: LeaveRequestUser;
}

interface RequestsByUser {
  user: LeaveRequestUser;
  requests: LeaveRequest[];
}

interface BulkRejectionResponse {
  message: string;
  rejected: number;
  emailsSent: number;
  emailErrors?: string[];
  affectedUsers: string[];
}

async function bulkRejectHandler(req: NextRequest, context: AuthContext): Promise<NextResponse> {
  try {
    const { user: admin } = context;

    // Parse and validate request body for rejection reason
    const body = req.method === 'POST' ? await req.json() : {};
    const rejectionReason = body.reason || 'Bulk rejection by administrator';

    // Validate rejection reason length
    if (rejectionReason.length > 500) {
      throw new ValidationError('Rejection reason must be 500 characters or less');
    }

    // Audit log for bulk administrative action
    logger.securityEvent('admin_bulk_action', 'high', admin.id, {
      endpoint: '/api/admin/bulk-reject',
      action: 'bulk_reject_all_pending',
      adminEmail: admin.email,
      rejectionReason
    });

    // Get all pending requests with user details
    const pendingRequests = await prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: true }
    });

    if (pendingRequests.length === 0) {
      return apiSuccess({ 
        message: 'No pending requests to reject',
        rejected: 0,
        emailsSent: 0
      });
    }

    // Security check: Log the scale of the operation
    if (pendingRequests.length > 50) {
      logger.securityEvent('large_bulk_operation', 'high', admin.id, {
        requestCount: pendingRequests.length,
        action: 'bulk_reject',
        adminEmail: admin.email
      });
    }

    // Update all requests to rejected with transaction safety
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
          status: 'REJECTED',
          approvedBy: admin.name || admin.email,
          approvedAt: new Date(),
          comments: rejectionReason
        }
      });
    });

    // Group requests by user for smart email batching
    const requestsByUser = pendingRequests.reduce((acc, request) => {
      const userId = request.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: request.user,
          requests: []
        };
      }
      acc[userId].requests.push(request);
      return acc;
    }, {} as Record<string, RequestsByUser>);

    // Send batched rejection emails with error handling
    let emailsSent = 0;
    const emailErrors: string[] = [];
    
    for (const userData of Object.values(requestsByUser)) {
      try {
        await EmailService.sendBulkRejectionNotification(
          userData.user.email,
          userData.user.name,
          userData.requests,
          admin.name || admin.email,
          rejectionReason
        );
        emailsSent++;
      } catch (emailError) {
        const errorMsg = `Failed to send email to ${userData.user.email}`;
        logger.error(errorMsg, {
          action: 'email_error',
          resource: 'bulk_rejection',
          metadata: { email: userData.user.email }
        }, emailError instanceof Error ? emailError : new Error(String(emailError)));
        emailErrors.push(errorMsg);
      }
    }

    // Log the completion of bulk operation
    logger.info('Bulk rejection completed', {
      userId: admin.id,
      action: 'bulk_reject_completed',
      resource: 'leave_request',
      metadata: {
        rejectedCount: updateResult.count,
        emailsSent,
        emailErrors: emailErrors.length,
        affectedUsers: Object.values(requestsByUser).length,
        rejectionReason
      }
    });

    const response = {
      message: `Successfully rejected ${updateResult.count} requests`,
      rejected: updateResult.count,
      emailsSent,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
      affectedUsers: Object.values(requestsByUser).map(u => u.user.name || u.user.email)
    };

    return apiSuccess<BulkRejectionResponse>(response);

  } catch (error) {
    logger.error('Bulk reject error', {
      action: 'bulk_reject_error', 
      resource: 'leave_request'
    }, error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof ValidationError) {
      return apiError(error.message, error.statusCode as HttpStatus);
    }
    
    return apiError('Failed to bulk reject requests', 500);
  }
}

// Apply comprehensive security with validation
export const POST = withCompleteSecurity(
  withAdminAuth(bulkRejectHandler),
  { 
    validateInput: false, // Custom validation handled in handler
    skipCSRF: false // POST operation requires CSRF protection
  }
);