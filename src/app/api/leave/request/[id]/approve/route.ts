import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { AuthenticationError, AuthorizationError, NotFoundError } from '@/lib/api/errors';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.email) {
      throw new AuthenticationError('Authentication required');
    }

    // Get user and check admin role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      throw new AuthorizationError('Admin access required');
    }

    // Get params in Next.js 15 style
    const { id } = await context.params;

    // Get the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leaveRequest) {
      throw new NotFoundError('Leave request', id);
    }

    // Update status
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        updatedAt: new Date()
      },
      include: { user: true }
    });

    return apiSuccess({
      message: 'Leave request approved successfully',
      request: updated
    });

  } catch (error) {
    if (error instanceof AuthenticationError || 
        error instanceof AuthorizationError || 
        error instanceof NotFoundError) {
      return apiError(error.toJSON(), error.statusCode);
    }
    return apiError({ 
      code: 'INTERNAL_ERROR', 
      message: 'Failed to approve request' 
    }, 500);
  }
}
