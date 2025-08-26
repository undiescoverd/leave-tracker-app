import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { z } from 'zod';

const rejectSchema = z.object({
  adminComment: z.string().min(1, 'Comment is required for rejection')
});

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

    // Parse body
    const body = await request.json();
    const validation = rejectSchema.safeParse(body);
    
    if (!validation.success) {
      throw new ValidationError('Invalid request data', validation.error.flatten().fieldErrors);
    }

    // Get params in Next.js 15 style
    const { id } = await context.params;

    // Get the leave request
    const leaveRequest = await prisma.leave.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leaveRequest) {
      throw new NotFoundError('Leave request', id);
    }

    // Update status with comment
    const updated = await prisma.leave.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminComment: validation.data.adminComment,
        updatedAt: new Date()
      },
      include: { user: true }
    });

    return apiSuccess({
      message: 'Leave request rejected',
      request: updated
    });

  } catch (error) {
    if (error instanceof AuthenticationError || 
        error instanceof AuthorizationError || 
        error instanceof NotFoundError ||
        error instanceof ValidationError) {
      return apiError(error.toJSON(), error.statusCode);
    }
    return apiError({ 
      code: 'INTERNAL_ERROR', 
      message: 'Failed to reject request' 
    }, 500);
  }
}
