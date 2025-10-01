import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/prisma';
import { features } from '@/lib/features';
import { withAdminAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';

const toilApproveSchema = z.object({
  requestId: z.string().uuid('Invalid request ID format')
});

async function toilApproveHandler(req: NextRequest, context: { user: { id: string; email: string; name: string } }): Promise<NextResponse> {
  try {
    // Check if TOIL is enabled
    if (!features.TOIL_ENABLED || !features.TOIL_ADMIN_ENABLED) {
      return apiError('TOIL admin features are not enabled', 400);
    }

    const admin = context.user;
    
    // Get validated data from middleware
    const validatedData = (req as { validatedData?: { requestId: string } }).validatedData;
    if (!validatedData) {
      return apiError('Request validation failed', 400);
    }
    
    const { requestId } = validatedData;
    
    // Get the TOIL request
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { user: true }
    });

    if (!request || request.type !== 'TOIL') {
      return apiError('Invalid TOIL request', 400);
    }

    if (request.status !== 'PENDING') {
      return apiError('Request has already been processed', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update request status
      await tx.leaveRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' }
      });

      // Credit TOIL hours to user balance
      await tx.user.update({
        where: { id: request.userId },
        data: {
          toilBalance: {
            increment: request.hours || 0
          }
        }
      });

      // Create TOIL entry for audit trail
      const toilEntry = await tx.toilEntry.create({
        data: {
          userId: request.userId,
          date: request.startDate,
          type: 'OVERTIME', // Default type for approved requests
          hours: request.hours || 0,
          reason: request.comments || '',
          approved: true,
          approvedBy: admin.id,
          approvedAt: new Date()
        }
      });

      return toilEntry;
    });

    return apiSuccess({
      message: 'TOIL request approved and hours credited',
      entry: result
    });
  } catch (error) {
    console.error('TOIL approval error:', error);
    return apiError('Failed to approve TOIL request');
  }
}

// Apply comprehensive admin security with validation
export const POST = withCompleteSecurity(
  withAdminAuth(toilApproveHandler),
  {
    validateInput: true,
    schema: toilApproveSchema,
    sanitizationRule: 'general'
  }
);