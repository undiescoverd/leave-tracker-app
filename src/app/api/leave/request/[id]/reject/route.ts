import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth-utils.supabase';
import { apiSuccess, apiError, HttpStatus } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { NotFoundError, ValidationError, AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { EmailService } from '@/lib/email/service';
import { format } from 'date-fns';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { apiCache } from '@/lib/cache/cache-manager';

// Validation schema for rejection
const rejectRequestSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(500),
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

    // Validate CUID format
    const cuidRegex = /^c[a-z0-9]{24}$/i;
    if (!requestId || !cuidRegex.test(requestId)) {
      return apiError('Invalid request ID format', 400);
    }

    // Get validated data from middleware (already parsed and validated)
    let reason: string;
    const validatedData = (req as any).validatedData;

    if (!validatedData) {
      // Try parsing body manually as fallback
      try {
        const body = await req.json();

        if (!body || !body.reason) {
          return apiError('Request validation failed - no reason provided', 400);
        }

        reason = body.reason;

        // Manual validation
        if (typeof reason !== 'string' || reason.length < 10 || reason.length > 500) {
          return apiError('Rejection reason must be between 10 and 500 characters', 400);
        }
      } catch (parseError) {
        logger.error('Failed to parse request body', { error: parseError });
        return apiError('Request validation failed - could not parse request body', 400);
      }
    } else {
      reason = validatedData.reason;
    }

    // Audit log for admin rejection action
    logger.securityEvent('admin_action', 'medium', admin.id, {
      endpoint: '/api/leave/request/[id]/reject',
      action: 'reject_leave_request',
      targetRequestId: requestId,
      adminEmail: admin.email,
      rejectionReason: reason.substring(0, 100) + '...', // Log partial reason for audit
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

    // Check if request is in a state that can be rejected
    if (leaveRequest.status !== 'PENDING') {
      return apiError(`Cannot reject request with status: ${leaveRequest.status}`, 409);
    }

    // Double-check the request is still pending (race condition protection)
    const { data: currentRequest, error: checkError } = await supabaseAdmin
      .from('leave_requests')
      .select('status')
      .eq('id', requestId)
      .single();

    if (checkError || !currentRequest || currentRequest.status !== 'PENDING') {
      throw new ValidationError('Request state changed during processing');
    }

    // Update the request
    const { data: updatedRequestData, error: updateError } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status: 'REJECTED',
        approved_by: admin.name || admin.email,
        approved_at: new Date().toISOString(),
        comments: `${leaveRequest.comments || ''}\n\nRejection reason: ${reason}`.trim(),
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
      throw new Error(`Failed to update leave request: ${updateError.message}`);
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

    // Send rejection notification email
    try {
      await EmailService.sendRejectionNotification(
        (leaveRequest as any).user.email,
        (leaveRequest as any).user.name || 'Employee',
        format(new Date(leaveRequest.start_date), 'PPP'),
        format(new Date(leaveRequest.end_date), 'PPP'),
        admin.name || admin.email,
        reason
      );
    } catch (emailError) {
      logger.error('Failed to send rejection email', {
        requestId,
        userEmail: (leaveRequest as any).user.email,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
      // Don't fail the rejection if email fails
    }

    // Log successful rejection
    logger.info('Leave request rejected', {
      requestId,
      adminId: admin.id,
      userId: leaveRequest.user_id,
      leaveType: leaveRequest.type,
      startDate: leaveRequest.start_date,
      endDate: leaveRequest.end_date,
      rejectionReason: reason,
    });

    // Invalidate relevant caches
    apiCache.clear(); // Clear all admin caches to ensure fresh data

    return apiSuccess({
      message: 'Leave request rejected successfully',
      leaveRequest: updatedRequest,
    });
  } catch (error) {
    console.error('Leave request rejection error:', error);
    logger.error('Leave request rejection failed', {
      requestId: (error as any)?.requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return apiError(
      `Failed to reject leave request: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}

export const POST = withCompleteSecurity(withAdminAuth(rejectLeaveRequestHandler), {
  validateInput: true,
  schema: rejectRequestSchema,
  sanitizationRule: 'general',
});

export const PATCH = POST;
