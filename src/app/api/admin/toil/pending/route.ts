import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { features } from '@/lib/features';
import { getPendingToilEntries } from '@/lib/services/toil.service';
import { withAdminAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';

async function getPendingToilHandler(
  req: NextRequest,
  context: { user: any }
): Promise<NextResponse> {
  try {
    if (!features.TOIL_ENABLED) {
      return apiError('TOIL feature is not enabled', 400);
    }

    const admin = context.user;

    // Get pending TOIL entries
    const pendingEntries = await getPendingToilEntries();

    return apiSuccess({ 
      pendingEntries,
      count: pendingEntries.length
    });

  } catch (error) {
    console.error('Pending TOIL error:', error);
    return apiError('Failed to fetch pending TOIL entries', 500);
  }
}

export const GET = withCompleteSecurity(
  withAdminAuth(getPendingToilHandler),
  { 
    validateInput: false, 
    skipCSRF: true 
  }
);
