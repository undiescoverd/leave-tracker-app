import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth-utils.supabase';
import { apiSuccess, apiError, HttpStatus } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { NotFoundError, ValidationError, AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { EmailService } from '@/lib/email/service';
import { format } from 'date-fns';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { apiCache } from '@/lib/cache/cache-manager';

async function approveLeaveRequestHandler(
  req: NextRequest,
  context: { user: any }
): Promise<NextResponse> {
  try {
    // Admin from middleware
    const admin = context.user;

    // Extract request ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const requestId = pathParts[pathParts.length - 2]; // Get the ID before '/approve'

    // Validate CUID format
    const cuidRegex = /^c[a-z0-9]{24}$/i;
    if (!requestId || !cuidRegex.test(requestId)) {
      return apiError('Invalid request ID format', 400);
    }

    // Audit log for admin approval action
    logger.securityEvent('admin_action', 'medium', admin.id, {
      endpoint: '/api/leave/request/[id]/approve',
      action: 'approve_leave_request',
      targetRequestId: requestId,
      adminEmail: admin.email,
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

    // Check if request is in a state that can be approved
    if (leaveRequest.status !== 'PENDING') {
      return apiError(`Cannot approve request with status: ${leaveRequest.status}`, 409);
    }

    // Update request status with race condition protection
    // Note: Supabase doesn't have explicit transactions, so we use sequential operations

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
        status: 'APPROVED',
        approved_by: admin.name || admin.email,
        approved_at: new Date().toISOString(),
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

    // Send approval notification email
    try {
      await EmailService.sendApprovalNotification(
        (leaveRequest as any).user.email,
        (leaveRequest as any).user.name || 'Employee',
        format(new Date(leaveRequest.start_date), 'PPP'),
        format(new Date(leaveRequest.end_date), 'PPP'),
        admin.name || admin.email
      );
    } catch (emailError) {
      logger.error('Failed to send approval email', {
        requestId,
        userEmail: (leaveRequest as any).user.email,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
      // Don't fail the approval if email fails
    }

    // Log successful approval
    logger.info('Leave request approved', {
      requestId,
      adminId: admin.id,
      userId: leaveRequest.user_id,
      leaveType: leaveRequest.type,
      startDate: leaveRequest.start_date,
      endDate: leaveRequest.end_date,
    });

    // Invalidate relevant caches
    apiCache.clear(); // Clear all admin caches to ensure fresh data

    return apiSuccess({
      message: 'Leave request approved successfully',
      leaveRequest: updatedRequest,
    });
  } catch (error) {
    console.error('Leave request approval error:', error);
    return apiError('Failed to approve leave request', 500);
  }
}

export const POST = withCompleteSecurity(withAdminAuth(approveLeaveRequestHandler), {
  validateInput: false,
  skipCSRF: false,
});

export const PATCH = POST;
