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

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build query
    const where: any = { userId: user.id };
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    // Get total count for pagination
    const totalCount = await prisma.leaveRequest.count({ where });

    // Get leave requests with pagination
    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
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
        // Fix: Map comments field to reason for frontend compatibility
        reason: request.comments || 'No reason provided',
        // Keep original comments field for admin functionality
        comments: request.comments,
      };
    });

    return apiSuccess({
      requests: requestsWithDays,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return apiError(error, error.statusCode as any);
    }
    return apiError('Internal server error');
  }
}
