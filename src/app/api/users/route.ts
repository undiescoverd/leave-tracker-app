import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new AuthenticationError('Authentication required');
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      throw new AuthorizationError('Admin access required');
    }

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
      return apiError(error.message, error.statusCode as any);
    }
    return apiError('Internal server error', 500);
  }
}
