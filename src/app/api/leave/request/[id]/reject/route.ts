import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-utils';
import { apiSuccess, apiError, HttpStatus } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { NotFoundError, ValidationError, AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { EmailService } from '@/lib/email/service';
import { format } from 'date-fns';
import { z } from 'zod';

// Validation schema for rejection
const rejectRequestSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(500)
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const admin = await requireAdmin();

    // Await the params Promise (Next.js 15 requirement)
    const { id: requestId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestId)) {
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

    return apiSuccess({
      message: 'Leave request rejected successfully',
      leaveRequest: updatedRequest,
    });

  } catch (error) {
    logger.error('Leave request rejection error:', undefined, error as Error);
    
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return apiError(error.message, error.statusCode as any);
    }
    
    if (error instanceof ValidationError) {
      return apiError(error.message, error.statusCode as any);
    }
    
    return apiError('Failed to reject leave request', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export const PATCH = POST;