import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LeaveStatus } from '@prisma/client';
import { apiSuccess, apiError, HttpStatus } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/api/errors';
import { EmailService } from '@/lib/email/service';
import { format } from 'date-fns';
import { withUserAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';

async function cancelLeaveRequestHandler(
  req: NextRequest,
  context: { user: any }
): Promise<NextResponse> {
  try {
    const user = context.user;
    
    // Extract request ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const requestId = pathParts[pathParts.length - 2]; // Get the ID before '/cancel'

    // Validate CUID format (Prisma uses cuid() by default)
    // CUID format: starts with 'c' followed by 24 alphanumeric characters
    const cuidRegex = /^c[a-z0-9]{24}$/i;
    if (!requestId || !cuidRegex.test(requestId)) {
      return apiError('Invalid request ID format', 400);
    }

    // Audit log
    logger.securityEvent('user_action', 'low', user.id, {
      endpoint: '/api/leave/request/[id]/cancel',
      action: 'cancel_leave_request',
      targetRequestId: requestId,
      userEmail: user.email
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

    // Security: Ensure user can only cancel their own requests
    if (leaveRequest.userId !== user.id) {
      logger.securityEvent('authorization_failure', 'high', user.id, {
        endpoint: '/api/leave/request/[id]/cancel',
        action: 'cancel_leave_request',
        targetRequestId: requestId,
        reason: 'User attempted to cancel another user\'s request'
      });
      return apiError('You can only cancel your own leave requests', HttpStatus.FORBIDDEN);
    }

    // Check if request is in a state that can be cancelled
    if (leaveRequest.status !== 'PENDING' && leaveRequest.status !== 'APPROVED') {
      return apiError(
        `Cannot cancel request with status: ${leaveRequest.status}. Only PENDING or APPROVED requests can be cancelled.`,
        409
      );
    }

    // Check if leave has already ended
    const now = new Date();
    const endDate = new Date(leaveRequest.endDate);
    // Allow cancellation until the end of the leave period
    endDate.setHours(23, 59, 59, 999);
    if (endDate < now) {
      return apiError(
        'Cannot cancel leave that has already ended',
        400
      );
    }

    // Update request status with transaction safety
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const currentRequest = await tx.leaveRequest.findUnique({
        where: { id: requestId },
        select: { status: true, startDate: true }
      });

      if (!currentRequest) {
        throw new ValidationError('Request no longer exists');
      }

      if (currentRequest.status !== 'PENDING' && currentRequest.status !== 'APPROVED') {
        throw new ValidationError('Request state changed during processing');
      }

      return await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'CANCELLED' as LeaveStatus,
          comments: `${leaveRequest.comments || ''}\n\nCancelled by user on ${format(now, 'PPP')}`.trim(),
          updatedAt: now
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

    // Send emails asynchronously (non-blocking) - don't wait for them
    setImmediate(async () => {
      // Send cancellation notification email to user
      try {
        await EmailService.sendCancellationNotification(
          leaveRequest.user.email,
          leaveRequest.user.name || 'Employee',
          format(new Date(leaveRequest.startDate), 'PPP'),
          format(new Date(leaveRequest.endDate), 'PPP')
        );
      } catch (emailError) {
        logger.error('Failed to send cancellation email', {
          requestId,
          userEmail: leaveRequest.user.email,
          error: emailError instanceof Error ? emailError.message : String(emailError)
        });
      }

      // If the request was APPROVED, notify admin
      if (leaveRequest.status === 'APPROVED') {
        try {
          const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { email: true, name: true }
          });

          for (const admin of admins) {
            await EmailService.sendAdminCancellationNotification(
              admin.email,
              admin.name || 'Admin',
              leaveRequest.user.name || leaveRequest.user.email,
              format(new Date(leaveRequest.startDate), 'PPP'),
              format(new Date(leaveRequest.endDate), 'PPP')
            );
          }
        } catch (emailError) {
          logger.error('Failed to send admin cancellation notification', {
            requestId,
            error: emailError instanceof Error ? emailError.message : String(emailError)
          });
        }
      }
    });

    logger.info('Leave request cancelled by user', {
      requestId,
      userId: user.id,
      leaveType: leaveRequest.type,
      startDate: leaveRequest.startDate.toISOString(),
      endDate: leaveRequest.endDate.toISOString()
    });

    return apiSuccess({
      message: 'Leave request cancelled successfully',
      leaveRequest: updatedRequest,
    });

  } catch (error) {
    console.error('Leave request cancellation error:', error);
    return apiError('Failed to cancel leave request', 500);
  }
}

export const POST = withCompleteSecurity(
  withUserAuth(cancelLeaveRequestHandler),
  {
    validateInput: false,
    skipCSRF: false
  }
);

export const PATCH = POST;

