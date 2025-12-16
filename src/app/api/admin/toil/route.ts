import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, HttpStatus } from '@/lib/api/response';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { requireAdmin, getAuthenticatedUser } from '@/lib/auth-utils.supabase';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { features } from '@/lib/features';
import {
  approveToilEntry,
  rejectToilEntry
} from '@/lib/services/toil.service.supabase';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';

// Schema for TOIL adjustment
const toilAdjustmentSchema = z.object({
  userId: z.string(),
  hours: z.number().positive('Hours must be positive'),
  reason: z.string().min(1, 'Reason is required'),
  type: z.enum(['TRAVEL_LATE_RETURN', 'WEEKEND_TRAVEL', 'AGENT_PANEL_DAY', 'OVERTIME']),
  date: z.string().datetime().optional().default(() => new Date().toISOString())
});

// Schema for TOIL approval/rejection
const toilActionSchema = z.object({
  toilEntryId: z.string(),
  reason: z.string().optional()
});

async function createToilHandler(
  req: NextRequest,
  context: { user: any }
): Promise<NextResponse> {
  try {
    // Check if TOIL is enabled
    if (!features.TOIL_ENABLED) {
      return apiError('TOIL feature is not enabled', 400);
    }

    // Admin from middleware
    const admin = context.user;

    const body = await req.json();
    const validation = toilAdjustmentSchema.safeParse(body);

    if (!validation.success) {
      return apiError('Invalid data', 400);
    }

    const { userId, hours, reason, type, date } = validation.data;

    // Get current user balance for audit trail
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('toil_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return apiError('User not found', 404);
    }

    const previousBalance = (user as any).toil_balance;
    const newBalance = previousBalance + hours;

    // Create TOIL entry (auto-approved for admin actions)
    const { data: toilEntry, error: createError } = await supabaseAdmin
      .from('toil_entries')
      .insert({
        user_id: userId,
        date: new Date(date).toISOString(),
        type,
        hours,
        reason,
        approved: true,
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
        previous_balance: previousBalance,
        new_balance: newBalance,
      } as any)
      .select()
      .single();

    if (createError) {
      console.error('TOIL entry creation error:', createError);
      return apiError('Failed to create TOIL entry', 500);
    }

    // Update user balance
    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({
        toil_balance: newBalance,
      } as any)
      .eq('id', userId);

    if (updateUserError) {
      // Rollback: delete the TOIL entry
      await supabaseAdmin
        .from('toil_entries')
        .delete()
        .eq('id', (toilEntry as any).id);

      console.error('User balance update error:', updateUserError);
      return apiError('Failed to update user balance', 500);
    }

    return apiSuccess({
      message: 'TOIL balance updated successfully',
      entry: toilEntry
    }, undefined, 201);

  } catch (error) {
    console.error('Create TOIL error:', error);
    return apiError('Failed to create TOIL entry', 500);
  }
}

// GET endpoint for TOIL entries
async function getToilHandler(
  req: NextRequest,
  context: { user: any }
): Promise<NextResponse> {
  try {
    if (!features.TOIL_ENABLED) {
      return apiError('TOIL feature is not enabled', 400);
    }

    const user = context.user;

    // Get TOIL entries based on role
    let query = supabaseAdmin
      .from('toil_entries')
      .select(`
        *,
        user:users!toil_entries_user_id_fkey (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (user.role !== 'ADMIN') {
      query = query.eq('user_id', user.id);
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error('Get TOIL entries error:', error);
      return apiError('Failed to fetch TOIL entries', 500);
    }

    return apiSuccess({ entries: entries || [] });

  } catch (error) {
    console.error('Get TOIL error:', error);
    return apiError('Failed to fetch TOIL entries', 500);
  }
}

// PATCH endpoint for approving/rejecting TOIL entries
async function patchToilHandler(
  req: NextRequest,
  context: { user: any }
): Promise<NextResponse> {
  try {
    if (!features.TOIL_ENABLED) {
      return apiError('TOIL feature is not enabled', 400);
    }

    const admin = context.user;

    const body = await req.json();
    const { action, ...data } = body;

    if (action === 'approve') {
      const validation = toilActionSchema.safeParse(data);
      if (!validation.success) {
        return apiError('Invalid data', 400);
      }

      const { toilEntryId } = validation.data;
      const entry = await approveToilEntry(toilEntryId, admin.id);

      return apiSuccess({
        message: 'TOIL entry approved successfully',
        entry
      });

    } else if (action === 'reject') {
      const validation = toilActionSchema.safeParse(data);
      if (!validation.success) {
        return apiError('Invalid data', 400);
      }

      const { toilEntryId, reason } = validation.data;
      const entry = await rejectToilEntry(toilEntryId, admin.id, reason);

      return apiSuccess({
        message: 'TOIL entry rejected successfully',
        entry
      });

    } else {
      return apiError('Invalid action', 400);
    }

  } catch (error) {
    console.error('PATCH TOIL error:', error);
    return apiError('Failed to process TOIL action', 500);
  }
}

// Export secured endpoints
export const POST = withCompleteSecurity(
  withAdminAuth(createToilHandler),
  {
    validateInput: true,
    schema: toilAdjustmentSchema,
    sanitizationRule: 'general'
  }
);

export const GET = withCompleteSecurity(
  withAdminAuth(getToilHandler),
  { 
    validateInput: false,
    skipCSRF: true 
  }
);

export const PATCH = withCompleteSecurity(
  withAdminAuth(patchToilHandler),
  {
    validateInput: true,
    schema: toilActionSchema,
    sanitizationRule: 'general'
  }
);
