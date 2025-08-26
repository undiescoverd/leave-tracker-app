import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { AuthenticationError } from '@/lib/api/errors';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      throw new AuthenticationError('You must be logged in to view leave requests');
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    // Build query
    const where: any = { userId: user.id };
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    // Get leave requests
    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Calculate days for each request
    const requestsWithDays = leaveRequests.map(request => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      return {
        ...request,
        days,
      };
    });

    return apiSuccess(
      { 
        requests: requestsWithDays,
        total: requestsWithDays.length 
      },
      'Leave requests retrieved successfully'
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return apiError(error, error.statusCode);
    }
    return apiError('Internal server error');
  }
}
