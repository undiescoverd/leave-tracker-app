import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { apiSuccess, apiError, HttpStatus } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/api/errors';
import { EmailService } from '@/lib/email/service';
import { format } from 'date-fns';
import { withUserAuth } from '@/lib/middleware/auth.supabase';
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

    // Validate CUID format (c followed by 24-32 alphanumeric characters)
    const cuidRegex = /^c[a-z0-9]{24,32}$/i;
    if (!requestId || !cuidRegex.test(requestId)) {
      return apiError('Invalid request ID format', 400);
    }

    // Audit log
    logger.securityEvent('user_action', 'low', user.id, {
      endpoint: '/api/leave/request/[id]/cancel',
      action: 'cancel_leave_request',
      targetRequestId: requestId,
      userEmail: user.email,
    });

    // Find the leave request
    const { data: leaveRequest, error: findError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        user:users!leave_requests_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('id', requestId)
      .single();

    if (findError || !leaveRequest) {
      return apiError('Leave request not found', HttpStatus.NOT_FOUND);
    }

    // Security: Ensure user can only cancel their own requests
    if (leaveRequest.user_id !== user.id) {
      logger.securityEvent('authorization_failure', 'high', user.id, {
        endpoint: '/api/leave/request/[id]/cancel',
        action: 'cancel_leave_request',
        targetRequestId: requestId,
        reason: "User attempted to cancel another user's request",
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
    const endDate = new Date(leaveRequest.end_date);
    // Allow cancellation until the end of the leave period
    endDate.setHours(23, 59, 59, 999);
    if (endDate < now) {
      return apiError('Cannot cancel leave that has already ended', 400);
    }

    // Double-check request state (race condition protection)
    const { data: currentRequest, error: checkError } = await supabaseAdmin
      .from('leave_requests')
      .select('status, start_date')
      .eq('id', requestId)
      .single();

    if (checkError || !currentRequest) {
      throw new ValidationError('Request no longer exists');
    }

    if (currentRequest.status !== 'PENDING' && currentRequest.status !== 'APPROVED') {
      throw new ValidationError('Request state changed during processing');
    }

    // Update request status
    const { data: updatedRequestData, error: updateError } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: 'CANCELLED',
        comments: `${leaveRequest.comments || ''}\n\nCancelled by user on ${format(now, 'PPP')}`.trim(),
        updated_at: now.toISOString(),
      })
      .eq('id', requestId)
      .select(`
        *,
        user:users!leave_requests_user_id_fkey (
          name,
          email
        )
      `)
      .single();

    if (updateError) {
      throw new Error(`Failed to cancel leave request: ${updateError.message}`);
    }

    // Convert to camelCase for frontend compatibility
    const updatedRequest = {
      id: updatedRequestData.id,
      userId: updatedRequestData.user_id,
      startDate: updatedRequestData.start_date,
      endDate: updatedRequestData.end_date,
      status: updatedRequestData.status,
      comments: updatedRequestData.comments,
      type: updatedRequestData.type,
      hours: updatedRequestData.hours,
      approvedBy: updatedRequestData.approved_by,
      approvedAt: updatedRequestData.approved_at,
      createdAt: updatedRequestData.created_at,
      updatedAt: updatedRequestData.updated_at,
      user: (updatedRequestData as any).user,
    };

    // Send emails asynchronously (non-blocking) - don't wait for them
    setImmediate(async () => {
      // Send cancellation notification email to user
      try {
        await EmailService.sendCancellationNotification(
          (leaveRequest as any).user.email,
          (leaveRequest as any).user.name || 'Employee',
          format(new Date(leaveRequest.start_date), 'PPP'),
          format(new Date(leaveRequest.end_date), 'PPP')
        );
      } catch (emailError) {
        logger.error('Failed to send cancellation email', {
          requestId,
          userEmail: (leaveRequest as any).user.email,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }

      // If the request was APPROVED, notify admin
      if (leaveRequest.status === 'APPROVED') {
        try {
          const { data: admins, error: adminsError } = await supabaseAdmin
            .from('users')
            .select('email, name')
            .eq('role', 'ADMIN');

          if (!adminsError && admins) {
            for (const admin of admins) {
              await EmailService.sendAdminCancellationNotification(
                admin.email,
                admin.name || 'Admin',
                (leaveRequest as any).user.name || (leaveRequest as any).user.email,
                format(new Date(leaveRequest.start_date), 'PPP'),
                format(new Date(leaveRequest.end_date), 'PPP')
              );
            }
          }
        } catch (emailError) {
          logger.error('Failed to send admin cancellation notification', {
            requestId,
            error: emailError instanceof Error ? emailError.message : String(emailError),
          });
        }
      }
    });

    logger.info('Leave request cancelled by user', {
      requestId,
      userId: user.id,
      leaveType: leaveRequest.type,
      startDate: leaveRequest.start_date,
      endDate: leaveRequest.end_date,
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

export const POST = withCompleteSecurity(withUserAuth(cancelLeaveRequestHandler), {
  validateInput: false,
  skipCSRF: false,
});

export const PATCH = POST;
