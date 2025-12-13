import { NextRequest } from 'next/server';
import { apiSuccess, apiError, TypedApiError } from '@/lib/api/response';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth-utils';

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, toil_balance, annual_leave_balance, sick_leave_balance')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    // Convert to camelCase for frontend
    const formattedUsers = (users || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      toilBalance: user.toil_balance,
      annualLeaveBalance: user.annual_leave_balance,
      sickLeaveBalance: user.sick_leave_balance,
    }));

    return apiSuccess({ users: formattedUsers });
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return apiError(error.message, (error as TypedApiError).statusCode);
    }
    return apiError('Internal server error', 500);
  }
}
