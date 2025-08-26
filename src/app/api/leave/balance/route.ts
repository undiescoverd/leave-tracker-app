import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { AuthenticationError } from '@/lib/api/errors';
import { getUserLeaveBalance } from '@/lib/services/leave.service';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new AuthenticationError('You must be logged in to view leave balance');
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Get user's leave balance for current year
    const balance = await getUserLeaveBalance(user.id, currentYear);

    return apiSuccess(balance);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return apiError(error, error.statusCode);
    }
    return apiError('Internal server error');
  }
}
