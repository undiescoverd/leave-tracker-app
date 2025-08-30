import { NextRequest } from 'next/server';
import { apiSuccess, apiError, TypedApiError } from '@/lib/api/response';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-utils';

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        toilBalance: true,
        annualLeaveBalance: true,
        sickLeaveBalance: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    return apiSuccess({ users });

  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return apiError(error.message, (error as TypedApiError).statusCode);
    }
    return apiError('Internal server error', 500);
  }
}
