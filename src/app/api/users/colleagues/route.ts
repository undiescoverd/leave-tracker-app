import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@/lib/auth.supabase';

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
      console.error('Supabase error fetching colleagues:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return apiError(
        `Failed to fetch colleagues: ${error.message}`,
        500,
        { supabaseError: error }
      );
    }

    return apiSuccess({ users: users || [] });
  } catch (error) {
    console.error('Error fetching colleagues:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Internal server error';
    
    return apiError(errorMessage, 500, {
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
}
