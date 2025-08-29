import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth-utils';
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError } from '@/lib/api/errors';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    await requireAdmin();

    // Await the params Promise (Next.js 15 requirement)
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return apiError({
        code: 'INVALID_REQUEST',
        message: 'Request ID is required'
      }, 400);
    }

    // Find the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leaveRequest) {
      return apiError({
        code: 'NOT_FOUND',
        message: 'Leave request not found'
      }, 404);
    }

    // Check if already processed
    if (leaveRequest.status !== 'PENDING') {
      return apiError({
        code: 'INVALID_STATUS',
        message: 'Leave request has already been processed'
      }, 409);
    }

    // Update the leave request
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
    console.error('Error approving leave request:', error);
    
    if (error instanceof AuthenticationError || 
        error instanceof AuthorizationError || 
        error instanceof NotFoundError ||
        error instanceof ValidationError) {
      return apiError({ code: error.name, message: error.message }, 500);
    }
    
    return apiError({ 
      code: 'INTERNAL_ERROR', 
      message: 'Failed to approve request' 
    }, 500);
  }
}