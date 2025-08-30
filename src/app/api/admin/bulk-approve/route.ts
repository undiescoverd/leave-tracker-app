import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email/service';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();

    // Get all pending requests with user details
    const pendingRequests = await prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: true }
    });

    if (pendingRequests.length === 0) {
      return apiSuccess({ 
        message: 'No pending requests to approve',
        approved: 0,
        emailsSent: 0
      });
    }

    // Update all requests to approved
    const updateResult = await prisma.leaveRequest.updateMany({
      where: { status: 'PENDING' },
      data: {
        status: 'APPROVED',
        approvedBy: admin.name,
        approvedAt: new Date()
      }
    });

    // Group requests by user for smart email batching
    const requestsByUser = pendingRequests.reduce((acc, request) => {
      const userId = request.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: request.user,
          requests: []
        };
      }
      acc[userId].requests.push(request);
      return acc;
    }, {} as Record<string, { user: any; requests: any[] }>);

    // Send batched emails
    let emailsSent = 0;
    for (const userData of Object.values(requestsByUser)) {
      try {
        await EmailService.sendBulkApprovalNotification(
          userData.user.email,
          userData.user.name,
          userData.requests,
          admin.name
        );
        emailsSent++;
      } catch (emailError) {
        console.error(`Failed to send email to ${userData.user.email}:`, emailError);
      }
    }

    return apiSuccess({
      message: `Successfully approved ${updateResult.count} requests`,
      approved: updateResult.count,
      emailsSent,
      affectedUsers: Object.values(requestsByUser).map(u => u.user.name)
    });

  } catch (error) {
    console.error('Bulk approve error:', error);
    return apiError('Failed to bulk approve requests', 500);
  }
}