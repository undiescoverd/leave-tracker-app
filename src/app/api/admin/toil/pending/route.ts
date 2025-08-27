import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { features } from '@/lib/features';
import { getPendingToilEntries } from '@/lib/services/toil.service';

export async function GET(request: NextRequest) {
  try {
    if (!features.TOIL_ENABLED) {
      return apiError('TOIL feature is not enabled', 400);
    }

    const session = await auth();
    if (!session?.user?.email) {
      throw new AuthenticationError('Authentication required');
    }

    // Check if user is admin
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      throw new AuthorizationError('Admin access required');
    }

    // Get pending TOIL entries
    const pendingEntries = await getPendingToilEntries();

    return apiSuccess({ 
      pendingEntries,
      count: pendingEntries.length
    });

  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return apiError(error.message, error.statusCode);
    }
    return apiError('Internal server error', 500);
  }
}
