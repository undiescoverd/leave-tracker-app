import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, HttpStatus } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase';
import { EmailService } from '@/lib/email/service';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/api/errors';
import { invalidateOnLeaveRequestChange } from '@/lib/cache/cache-invalidation';
import { apiCache } from '@/lib/cache/cache-manager';

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
    const { data: pendingRequestsData, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        user:users!user_id (
          id,
          name,
          email
        )
      `)
      .eq('status', 'PENDING');

    if (fetchError) {
      throw new Error(`Failed to fetch pending requests: ${fetchError.message}`);
    }

    const pendingRequests = pendingRequestsData || [];

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

    // Transaction-like safety: Verify count hasn't changed before updating
    const { count: currentPendingCount, error: countError } = await supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    if (countError) {
      throw new Error(`Failed to verify pending count: ${countError.message}`);
    }

    if (currentPendingCount !== pendingRequests.length) {
      throw new ValidationError('Request state changed during processing. Please refresh and try again.');
    }

    // Update all pending requests to approved
    const updateData = {
      status: 'APPROVED' as const,
      approved_by: admin.name || admin.email,
      approved_at: new Date().toISOString()
    };
    const { error: updateError } = await supabaseAdmin
      .from('leave_requests')
      // @ts-expect-error - Supabase type inference issue with update
      .update(updateData)
      .eq('status', 'PENDING');

    if (updateError) {
      throw new Error(`Failed to update requests: ${updateError.message}`);
    }

    // Create TOIL entries for any TOIL requests that were approved
    const toilRequests = pendingRequests.filter((req: any) => req.type === 'TOIL');
    for (const toilRequest of toilRequests) {
      try {
        // Get current user balance for audit trail
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('toil_balance')
          .eq('id', toilRequest.user_id)
          .single();

        if (!userError && user) {
          const previousBalance = (user as any).toil_balance || 0;
          const hours = toilRequest.hours || 0;
          const newBalance = previousBalance + hours;

          // Create TOIL entry for audit trail
          const { error: createEntryError } = await supabaseAdmin
            .from('toil_entries')
            .insert({
              user_id: toilRequest.user_id,
              date: toilRequest.start_date,
              type: 'OVERTIME', // Default type for approved requests
              hours: hours,
              reason: toilRequest.comments || '',
              approved: true,
              approved_by: admin.id,
              approved_at: new Date().toISOString(),
              previous_balance: previousBalance,
              new_balance: newBalance,
            } as any);

          if (!createEntryError) {
            // Update user's TOIL balance
            await supabaseAdmin
              .from('users')
              .update({
                toil_balance: newBalance,
              } as any)
              .eq('id', toilRequest.user_id);
          } else {
            logger.error('Failed to create TOIL entry during bulk approval', {
              requestId: toilRequest.id,
              userId: toilRequest.user_id,
              error: createEntryError,
            });
          }
        }
      } catch (toilError) {
        logger.error('Error processing TOIL entry during bulk approval', {
          requestId: toilRequest.id,
          userId: toilRequest.user_id,
        }, toilError instanceof Error ? toilError : new Error(String(toilError)));
        // Continue processing other requests even if TOIL entry creation fails
      }
    }

    const updateResult = { count: pendingRequests.length };

    // Group requests by user for smart email batching
    // Convert snake_case to camelCase for processing
    const requestsByUser = pendingRequests.reduce((acc, request) => {
      const userId = request.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user: {
            id: request.user.id,
            name: request.user.name || 'Unknown User',
            email: request.user.email
          },
          requests: []
        };
      }
      acc[userId].requests.push({
        id: request.id,
        userId: request.user_id,
        type: request.type,
        startDate: new Date(request.start_date),
        endDate: new Date(request.end_date),
        status: request.status,
        createdAt: new Date(request.created_at),
        user: {
          id: request.user.id,
          name: request.user.name || 'Unknown User',
          email: request.user.email
        },
        days: calculateDays(new Date(request.start_date), new Date(request.end_date))
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

    // Invalidate caches for all affected users
    // This ensures all users' dashboards update immediately with their new balances
    const affectedUserIds = new Set<string>();
    for (const request of pendingRequests) {
      affectedUserIds.add(request.user_id);
      try {
        invalidateOnLeaveRequestChange(
          request.user_id,
          new Date(request.start_date),
          new Date(request.end_date)
        );
      } catch (cacheError) {
        logger.warn(`Cache invalidation failed for user ${request.user_id} during bulk approval:`, undefined, cacheError as Error);
      }
    }
    
    // Also clear all admin caches
    apiCache.clear();

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