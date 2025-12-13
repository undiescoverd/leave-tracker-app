import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@/lib/auth';

/**
 * GET /api/users/colleagues
 * Returns list of all users except the current user
 * Used for TOIL coverage selection
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401);
    }

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .neq('id', session.user.id)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch colleagues: ${error.message}`);
    }

    return apiSuccess({ users: users || [] });
  } catch (error) {
    console.error('Error fetching colleagues:', error);
    return apiError('Internal server error', 500);
  }
}
