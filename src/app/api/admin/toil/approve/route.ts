import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase';
import { features } from '@/lib/features';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';

const toilApproveSchema = z.object({
  requestId: z.string().uuid('Invalid request ID format')
});

async function toilApproveHandler(req: NextRequest, context: { user: { id: string; email: string; name: string } }): Promise<NextResponse> {
  try {
    // Check if TOIL is enabled
    if (!features.TOIL_ENABLED || !features.TOIL_ADMIN_ENABLED) {
      return apiError('TOIL admin features are not enabled', 400);
    }

    const admin = context.user;
    
    // Get validated data from middleware
    const validatedData = (req as { validatedData?: { requestId: string } }).validatedData;
    if (!validatedData) {
      return apiError('Request validation failed', 400);
    }
    
    const { requestId } = validatedData;

    // Get the TOIL request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('leave_requests')
      .select('*, user:users!leave_requests_user_id_fkey(*)')
      .eq('id', requestId)
      .single();

    if (requestError || !request || (request as any).type !== 'TOIL') {
      return apiError('Invalid TOIL request', 400);
    }

    if ((request as any).status !== 'PENDING') {
      return apiError('Request has already been processed', 400);
    }

    // Get current user balance for audit trail
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('toil_balance')
      .eq('id', (request as any).user_id)
      .single();

    if (userError || !user) {
      return apiError('User not found', 404);
    }

    const previousBalance = (user as any).toil_balance;
    const newBalance = previousBalance + ((request as any).hours || 0);

    // Update request status
    const { error: updateRequestError } = await supabaseAdmin
      .from('leave_requests')
      .update({ status: 'APPROVED' } as any)
      .eq('id', requestId);

    if (updateRequestError) {
      console.error('Request update error:', updateRequestError);
      return apiError('Failed to approve request', 500);
    }

    // Create TOIL entry for audit trail
    const { data: toilEntry, error: createEntryError } = await supabaseAdmin
      .from('toil_entries')
      .insert({
        user_id: (request as any).user_id,
        date: (request as any).start_date,
        type: 'OVERTIME', // Default type for approved requests
        hours: (request as any).hours || 0,
        reason: (request as any).comments || '',
        approved: true,
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
        previous_balance: previousBalance,
        new_balance: newBalance,
      } as any)
      .select()
      .single();

    if (createEntryError) {
      // Rollback: revert request status
      await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'PENDING' } as any)
        .eq('id', requestId);

      console.error('TOIL entry creation error:', {
        error: createEntryError,
        message: createEntryError.message,
        details: createEntryError.details,
        hint: createEntryError.hint,
        code: createEntryError.code,
        insertData: {
          user_id: (request as any).user_id,
          date: (request as any).start_date,
          type: 'OVERTIME',
          hours: (request as any).hours || 0,
          reason: (request as any).comments || '',
          approved: true,
          approved_by: admin.id,
          approved_at: new Date().toISOString(),
          previous_balance: previousBalance,
          new_balance: newBalance,
        }
      });
      return apiError(`Failed to create TOIL entry: ${createEntryError.message}`, 500);
    }

    // Credit TOIL hours to user balance
    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({
        toil_balance: newBalance,
      } as any)
      .eq('id', (request as any).user_id);

    if (updateUserError) {
      // Rollback: delete TOIL entry and revert request status
      await supabaseAdmin
        .from('toil_entries')
        .delete()
        .eq('id', (toilEntry as any).id);

      await supabaseAdmin
        .from('leave_requests')
        .update({ status: 'PENDING' } as any)
        .eq('id', requestId);

      console.error('User balance update error:', updateUserError);
      return apiError('Failed to update user balance', 500);
    }

    const result = toilEntry;

    return apiSuccess({
      message: 'TOIL request approved and hours credited',
      entry: result
    });
  } catch (error) {
    console.error('TOIL approval error:', error);
    return apiError('Failed to approve TOIL request');
  }
}

// Apply comprehensive admin security with validation
export const POST = withCompleteSecurity(
  withAdminAuth(toilApproveHandler),
  {
    validateInput: true,
    schema: toilApproveSchema,
    sanitizationRule: 'general'
  }
);