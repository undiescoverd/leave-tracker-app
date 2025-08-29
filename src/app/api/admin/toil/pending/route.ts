import { apiSuccess, apiError, HttpStatus } from '@/lib/api/response';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { features } from '@/lib/features';
import { getPendingToilEntries } from '@/lib/services/toil.service';
import { requireAdmin } from '@/lib/auth-utils';

export async function GET() {
  try {
    if (!features.TOIL_ENABLED) {
      return apiError('TOIL feature is not enabled', 400);
    }

    await requireAdmin();

    // Get pending TOIL entries
    const pendingEntries = await getPendingToilEntries();

    return apiSuccess({ 
      pendingEntries,
      count: pendingEntries.length
    });

  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return apiError(error.message, (error.statusCode as any) || HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return apiError('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
