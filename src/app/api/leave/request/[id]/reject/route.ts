import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-utils';
import { apiSuccess, apiError, HttpStatus } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { NotFoundError, ValidationError, AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { EmailService } from '@/lib/email/service';
import { format } from 'date-fns';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { apiCache } from '@/lib/cache/cache-manager';

// Validation schema for rejection
const rejectRequestSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(500)
});

async function rejectLeaveRequestHandler(
  req: NextRequest,
  context: { user: any }
): Promise<NextResponse> {
  try {
    // Admin from middleware
    const admin = context.user;

    // Extract request ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const requestId = pathParts[pathParts.length - 2]; // Get the ID before '/reject'

    // Validate CUID format (Prisma uses cuid() by default)
    // CUID format: starts with 'c' followed by 24 alphanumeric characters
    const cuidRegex = /^c[a-z0-9]{24}$/i;
    if (!requestId || !cuidRegex.test(requestId)) {
      return apiError('Invalid request ID format', 400);
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = rejectRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return apiError(
        'Invalid rejection data: ' + validationResult.error.issues.map(i => i.message).join(', '),
        400
      );
    }

    const { reason } = validationResult.data;

    // Audit log for admin rejection action
    logger.securityEvent('admin_action', 'medium', admin.id, {
      endpoint: '/api/leave/request/[id]/reject',
      action: 'reject_leave_request',
      targetRequestId: requestId,
      adminEmail: admin.email,
      rejectionReason: reason.substring(0, 100) + '...' // Log partial reason for audit
    });

    // Find the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      return apiError('Leave request not found', HttpStatus.NOT_FOUND);
    }

    // Check if request is in a state that can be rejected
    if (leaveRequest.status !== 'PENDING') {
      return apiError(`Cannot reject request with status: ${leaveRequest.status}`, 409);
    }

    // Update request status with transaction safety
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Double-check the request is still pending (race condition protection)
      const currentRequest = await tx.leaveRequest.findUnique({
        where: { id: requestId },
        select: { status: true }
      });

      if (!currentRequest || currentRequest.status !== 'PENDING') {
        throw new ValidationError('Request state changed during processing');
      }

      // Update the request
      return await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          approvedBy: admin.name || admin.email,
          approvedAt: new Date(),
          comments: `${leaveRequest.comments || ''}\n\nRejection reason: ${reason}`.trim()
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
    });

    // Send rejection notification email
    try {
      await EmailService.sendRejectionNotification(
        leaveRequest.user.email,
        leaveRequest.user.name || 'Employee',
        format(new Date(leaveRequest.startDate), 'PPP'),
        format(new Date(leaveRequest.endDate), 'PPP'),
        admin.name || admin.email,
        reason
      );
    } catch (emailError) {
      logger.error('Failed to send rejection email', {
        requestId,
        userEmail: leaveRequest.user.email,
        error: emailError instanceof Error ? emailError.message : String(emailError)
      });
      // Don't fail the rejection if email fails
    }

    // Log successful rejection
    logger.info('Leave request rejected', {
      requestId,
      adminId: admin.id,
      userId: leaveRequest.userId,
      leaveType: leaveRequest.type,
      startDate: leaveRequest.startDate.toISOString(),
      endDate: leaveRequest.endDate.toISOString(),
      rejectionReason: reason
    });

    // Invalidate relevant caches
    apiCache.clear(); // Clear all admin caches to ensure fresh data

    return apiSuccess({
      message: 'Leave request rejected successfully',
      leaveRequest: updatedRequest,
    });

  } catch (error) {
    console.error('Leave request rejection error:', error);
    return apiError('Failed to reject leave request', 500);
  }
}

export const POST = withCompleteSecurity(
  withAdminAuth(rejectLeaveRequestHandler),
  {
    validateInput: true,
    schema: rejectRequestSchema,
    sanitizationRule: 'general'
  }
);

export const PATCH = POST;