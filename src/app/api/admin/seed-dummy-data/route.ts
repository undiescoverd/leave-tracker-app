import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (user.role !== 'ADMIN') {
      return apiError('Unauthorized', 403);
    }

    // Get existing users (non-admin)
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true, email: true }
    });

    if (users.length === 0) {
      return apiError('No regular users found', 400);
    }

    console.log(`Found ${users.length} users:`, users.map(u => u.name));

    // Clear existing leave requests for clean testing
    await prisma.leaveRequest.deleteMany({
      where: { userId: { in: users.map(u => u.id) } }
    });

    // Clear existing TOIL entries
    await prisma.toilEntry.deleteMany({
      where: { userId: { in: users.map(u => u.id) } }
    });

    let totalRequests = 0;
    let totalToilEntries = 0;

    // Generate dummy data for each user
    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const currentUser = users[userIndex];
      
      const requests = [
        // 2024 Historical Data (Approved)
        {
          userId: currentUser.id,
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-19'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40,
          comments: 'New Year break',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-01-10'),
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-10')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-03-12'),
          endDate: new Date('2024-03-13'),
          type: 'SICK',
          status: 'APPROVED',
          hours: 16,
          comments: 'Flu symptoms',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-03-12'),
          createdAt: new Date('2024-03-12'),
          updatedAt: new Date('2024-03-12')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-05-20'),
          endDate: new Date('2024-05-24'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40,
          comments: 'Spring holiday',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-05-15'),
          createdAt: new Date('2024-05-10'),
          updatedAt: new Date('2024-05-15')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-07-08'),
          endDate: new Date('2024-07-10'),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24,
          comments: 'Family emergency',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-07-05'),
          createdAt: new Date('2024-07-03'),
          updatedAt: new Date('2024-07-05')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-08-12'),
          endDate: new Date('2024-08-23'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 80,
          comments: 'Summer vacation',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-07-20'),
          createdAt: new Date('2024-07-15'),
          updatedAt: new Date('2024-07-20')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-10-14'),
          endDate: new Date('2024-10-14'),
          type: 'SICK',
          status: 'APPROVED',
          hours: 8,
          comments: 'Doctor appointment',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-10-14'),
          createdAt: new Date('2024-10-14'),
          updatedAt: new Date('2024-10-14')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-12-23'),
          endDate: new Date('2024-12-31'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 56,
          comments: 'Christmas holidays',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-11-15'),
          createdAt: new Date('2024-11-10'),
          updatedAt: new Date('2024-11-15')
        },

        // 2025 Data (mix of approved, pending, rejected)
        {
          userId: currentUser.id,
          startDate: new Date('2025-01-20'),
          endDate: new Date('2025-01-24'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40,
          comments: 'Winter break',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-01-15'),
          createdAt: new Date('2025-01-10'),
          updatedAt: new Date('2025-01-15')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-02-14'),
          endDate: new Date('2025-02-16'),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24,
          comments: 'Personal matters',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-02-10'),
          createdAt: new Date('2025-02-05'),
          updatedAt: new Date('2025-02-10')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-03-18'),
          endDate: new Date('2025-03-18'),
          type: 'SICK',
          status: 'APPROVED',
          hours: 8,
          comments: 'Migraine',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-03-18'),
          createdAt: new Date('2025-03-18'),
          updatedAt: new Date('2025-03-18')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-04-07'),
          endDate: new Date('2025-04-11'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40,
          comments: 'Easter holidays',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-04-01'),
          createdAt: new Date('2025-03-25'),
          updatedAt: new Date('2025-04-01')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-06-16'),
          endDate: new Date('2025-06-18'),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24,
          comments: userIndex === 0 ? 'Wedding preparation' : 'House viewing',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-06-10'),
          createdAt: new Date('2025-06-05'),
          updatedAt: new Date('2025-06-10')
        },

        // Pending requests for future
        {
          userId: currentUser.id,
          startDate: new Date('2025-09-15'),
          endDate: new Date('2025-09-19'),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 40,
          comments: 'Autumn break',
          createdAt: new Date('2025-08-28'),
          updatedAt: new Date('2025-08-28')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-10-28'),
          endDate: new Date('2025-10-31'),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 32,
          comments: 'Half-term holiday',
          createdAt: new Date('2025-08-29'),
          updatedAt: new Date('2025-08-29')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-11-25'),
          endDate: new Date('2025-11-26'),
          type: 'UNPAID',
          status: 'PENDING',
          hours: 16,
          comments: userIndex === 0 ? 'Extended weekend' : 'Conference attendance',
          createdAt: new Date('2025-08-30'),
          updatedAt: new Date('2025-08-30')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-12-22'),
          endDate: new Date('2025-12-31'),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 64,
          comments: 'Christmas and New Year',
          createdAt: new Date('2025-08-30'),
          updatedAt: new Date('2025-08-30')
        }
      ];

      // Add some rejected requests for variety
      if (userIndex === 0) {
        requests.push({
          userId: currentUser.id,
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          type: 'ANNUAL',
          status: 'REJECTED',
          hours: 40,
          comments: 'Summer holiday',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-07-15'),
          createdAt: new Date('2025-07-10'),
          updatedAt: new Date('2025-07-15')
        });
      }

      totalRequests += requests.length;
    }

    console.log(`📊 Template generated for ${users.length} users with ${totalRequests} total leave requests`);
    
    return apiSuccess({
      message: 'Dummy data template ready',
      users: users.map(u => ({ id: u.id, name: u.name })),
      totalRequestsPerUser: Math.floor(totalRequests / users.length),
      instructions: [
        '1. Use Prisma Studio to manually add the leave requests',
        '2. Use the template data structure shown in the console',
        '3. Or run SQL inserts with the provided user IDs'
      ]
    });

  } catch (error) {
    console.error('Seed data error:', error);
    return apiError('Failed to prepare dummy data', 500);
  }
}