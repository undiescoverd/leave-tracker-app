import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';

import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/middleware/auth';
import { withCompleteSecurity } from '@/lib/middleware/security';

interface AuthContext {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

async function comprehensiveSeedHandler(req: NextRequest, context: AuthContext): Promise<NextResponse> {
  try {
    const { user } = context;

    console.log('🚀 Starting comprehensive data seeding...');

    // Get existing users (non-admin)
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true, email: true }
    });

    if (users.length === 0) {
      return apiError('No regular users found', 400);
    }

    console.log(`📋 Found ${users.length} users:`, users.map(u => u.name));

    // Clear existing data for clean testing
    await prisma.leaveRequest.deleteMany({
      where: { userId: { in: users.map(u => u.id) } }
    });
    await prisma.toilEntry.deleteMany({
      where: { userId: { in: users.map(u => u.id) } }
    });
    console.log('🧹 Cleared existing leave and TOIL data');

    let totalRequests = 0;
    let totalToilEntries = 0;

    // Add comprehensive data for each user
    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const currentUser = users[userIndex];
      console.log(`\n👤 Processing ${currentUser.name}...`);

      // Note: 8 hours = 1 day conversion available if needed

      // 2024 Historical Data (All Approved)
      const historicalRequests = [
        {
          userId: currentUser.id,
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-19'),
          type: 'ANNUAL' as const,
          status: 'APPROVED' as const,
          hours: 40,
          comments: 'New Year break',
          approvedBy: user.id,
          approvedAt: new Date('2024-01-10'),
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-10')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-03-12'),
          endDate: new Date('2024-03-13'),
          type: 'SICK' as const,
          status: 'APPROVED' as const,
          hours: 16,
          comments: 'Flu symptoms',
          approvedBy: user.id,
          approvedAt: new Date('2024-03-12'),
          createdAt: new Date('2024-03-12'),
          updatedAt: new Date('2024-03-12')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-05-20'),
          endDate: new Date('2024-05-24'),
          type: 'ANNUAL' as const,
          status: 'APPROVED' as const,
          hours: 40,
          comments: 'Spring holiday',
          approvedBy: user.id,
          approvedAt: new Date('2024-05-15'),
          createdAt: new Date('2024-05-10'),
          updatedAt: new Date('2024-05-15')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-07-08'),
          endDate: new Date('2024-07-10'),
          type: 'ANNUAL' as const,
          status: 'APPROVED' as const,
          hours: 24,
          comments: 'Family emergency',
          approvedBy: user.id,
          approvedAt: new Date('2024-07-05'),
          createdAt: new Date('2024-07-03'),
          updatedAt: new Date('2024-07-05')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-08-12'),
          endDate: new Date('2024-08-23'),
          type: 'ANNUAL' as const,
          status: 'APPROVED' as const,
          hours: 80,
          comments: 'Summer vacation',
          approvedBy: user.id,
          approvedAt: new Date('2024-07-20'),
          createdAt: new Date('2024-07-15'),
          updatedAt: new Date('2024-07-20')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-10-14'),
          endDate: new Date('2024-10-14'),
          type: 'SICK' as const,
          status: 'APPROVED' as const,
          hours: 8,
          comments: 'Doctor appointment',
          approvedBy: user.id,
          approvedAt: new Date('2024-10-14'),
          createdAt: new Date('2024-10-14'),
          updatedAt: new Date('2024-10-14')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2024-12-23'),
          endDate: new Date('2024-12-31'),
          type: 'ANNUAL' as const,
          status: 'APPROVED' as const,
          hours: 56,
          comments: 'Christmas holidays',
          approvedBy: user.id,
          approvedAt: new Date('2024-11-15'),
          createdAt: new Date('2024-11-10'),
          updatedAt: new Date('2024-11-15')
        }
      ];

      // 2025 Current Year Data
      const currentYearRequests = [
        // Approved requests
        {
          userId: currentUser.id,
          startDate: new Date('2025-01-20'),
          endDate: new Date('2025-01-24'),
          type: 'ANNUAL' as const,
          status: 'APPROVED' as const,
          hours: 40,
          comments: 'Winter break',
          approvedBy: user.id,
          approvedAt: new Date('2025-01-15'),
          createdAt: new Date('2025-01-10'),
          updatedAt: new Date('2025-01-15')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-02-14'),
          endDate: new Date('2025-02-16'),
          type: 'ANNUAL' as const,
          status: 'APPROVED' as const,
          hours: 24,
          comments: userIndex === 0 ? 'Personal matters' : 'Family commitment',
          approvedBy: user.id,
          approvedAt: new Date('2025-02-10'),
          createdAt: new Date('2025-02-05'),
          updatedAt: new Date('2025-02-10')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-03-18'),
          endDate: new Date('2025-03-18'),
          type: 'SICK' as const,
          status: 'APPROVED' as const,
          hours: 8,
          comments: userIndex === 0 ? 'Migraine' : 'Dental surgery',
          approvedBy: user.id,
          approvedAt: new Date('2025-03-18'),
          createdAt: new Date('2025-03-18'),
          updatedAt: new Date('2025-03-18')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-04-07'),
          endDate: new Date('2025-04-11'),
          type: 'ANNUAL' as const,
          status: 'APPROVED' as const,
          hours: 40,
          comments: 'Easter holidays',
          approvedBy: user.id,
          approvedAt: new Date('2025-04-01'),
          createdAt: new Date('2025-03-25'),
          updatedAt: new Date('2025-04-01')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-06-16'),
          endDate: new Date('2025-06-18'),
          type: 'ANNUAL' as const,
          status: 'APPROVED' as const,
          hours: 24,
          comments: userIndex === 0 ? 'Wedding preparation' : 'House viewing',
          approvedBy: user.id,
          approvedAt: new Date('2025-06-10'),
          createdAt: new Date('2025-06-05'),
          updatedAt: new Date('2025-06-10')
        },

        // Pending requests (will show in pending requests dashboard)
        {
          userId: currentUser.id,
          startDate: new Date('2025-09-15'),
          endDate: new Date('2025-09-19'),
          type: 'ANNUAL' as const,
          status: 'PENDING' as const,
          hours: 40,
          comments: 'Autumn break',
          createdAt: new Date('2025-08-28'),
          updatedAt: new Date('2025-08-28')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-10-28'),
          endDate: new Date('2025-10-31'),
          type: 'ANNUAL' as const,
          status: 'PENDING' as const,
          hours: 32,
          comments: 'Half-term holiday',
          createdAt: new Date('2025-08-29'),
          updatedAt: new Date('2025-08-29')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-11-25'),
          endDate: new Date('2025-11-26'),
          type: 'ANNUAL' as const, // UNPAID not valid in schema
          status: 'PENDING' as const,
          hours: 16,
          comments: userIndex === 0 ? 'Extended weekend' : 'Conference attendance',
          createdAt: new Date('2025-08-30'),
          updatedAt: new Date('2025-08-30')
        },
        {
          userId: currentUser.id,
          startDate: new Date('2025-12-22'),
          endDate: new Date('2025-12-31'),
          type: 'ANNUAL' as const,
          status: 'PENDING' as const,
          hours: 64,
          comments: 'Christmas and New Year',
          createdAt: new Date('2025-08-30'),
          updatedAt: new Date('2025-08-30')
        }
      ];

      // Add some rejected requests for variety
      if (userIndex === 0) {
        currentYearRequests.push({
          userId: currentUser.id,
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          type: 'ANNUAL' as const,
          status: 'PENDING' as const,
          hours: 40,
          comments: 'Summer holiday - Coverage conflict',
          createdAt: new Date('2025-07-10'),
          updatedAt: new Date('2025-07-15')
        });
      }

      const allRequests = [...historicalRequests, ...currentYearRequests];

      // Bulk create leave requests
      await prisma.leaveRequest.createMany({
        data: allRequests
      });

      totalRequests += allRequests.length;
      console.log(`  ✅ Added ${allRequests.length} leave requests for ${currentUser.name}`);

      // Add TOIL entries
      const toilEntries = [
        // 2024 TOIL (approved)
        {
          userId: currentUser.id,
          date: new Date('2024-02-10'),
          type: 'WEEKEND_TRAVEL' as const,
          hours: 4,
          reason: 'Weekend client site visit',
          approved: true,
          approvedBy: user.id,
          approvedAt: new Date('2024-02-12'),
          createdAt: new Date('2024-02-11'),
          updatedAt: new Date('2024-02-12')
        },
        {
          userId: currentUser.id,
          date: new Date('2024-06-15'),
          type: 'OVERTIME' as const,
          hours: userIndex === 0 ? 3 : 5,
          reason: userIndex === 0 ? 'Project deadline overtime' : 'Quarterly report overtime',
          approved: true,
          approvedBy: user.id,
          approvedAt: new Date('2024-06-16'),
          createdAt: new Date('2024-06-16'),
          updatedAt: new Date('2024-06-16')
        },
        {
          userId: currentUser.id,
          date: new Date('2024-09-22'),
          type: 'TRAVEL_LATE_RETURN' as const,
          hours: userIndex === 0 ? 2 : 3,
          reason: userIndex === 0 ? 'Late return from Birmingham site' : 'Late return from Leeds client',
          approved: true,
          approvedBy: user.id,
          approvedAt: new Date('2024-09-23'),
          createdAt: new Date('2024-09-23'),
          updatedAt: new Date('2024-09-23')
        },
        // 2025 TOIL (approved)
        {
          userId: currentUser.id,
          date: new Date('2025-01-25'),
          type: 'AGENT_PANEL_DAY' as const,
          hours: 8,
          reason: userIndex === 0 ? 'Agent panel Saturday session' : 'Saturday agent interviews',
          approved: true,
          approvedBy: user.id,
          approvedAt: new Date('2025-01-27'),
          createdAt: new Date('2025-01-26'),
          updatedAt: new Date('2025-01-27')
        },
        {
          userId: currentUser.id,
          date: new Date('2025-03-15'),
          type: 'OVERTIME' as const,
          hours: userIndex === 0 ? 4 : 2,
          reason: userIndex === 0 ? 'Emergency system maintenance' : 'System upgrade overtime',
          approved: true,
          approvedBy: user.id,
          approvedAt: new Date('2025-03-16'),
          createdAt: new Date('2025-03-16'),
          updatedAt: new Date('2025-03-16')
        },
        // Pending TOIL entries (will show in TOIL pending dashboard)
        {
          userId: currentUser.id,
          date: new Date('2025-08-20'),
          type: 'WEEKEND_TRAVEL' as const,
          hours: 4,
          reason: userIndex === 0 ? 'Weekend client emergency' : 'Client site emergency',
          approved: false,
          createdAt: new Date('2025-08-21'),
          updatedAt: new Date('2025-08-21')
        },
        {
          userId: currentUser.id,
          date: new Date('2025-08-25'),
          type: 'OVERTIME' as const,
          hours: userIndex === 0 ? 6 : 3,
          reason: userIndex === 0 ? 'Server migration overtime' : 'End of month reporting',
          approved: false,
          createdAt: new Date('2025-08-26'),
          updatedAt: new Date('2025-08-26')
        }
      ];

      await prisma.toilEntry.createMany({
        data: toilEntries
      });

      totalToilEntries += toilEntries.length;
      console.log(`  ✅ Added ${toilEntries.length} TOIL entries for ${currentUser.name}`);
    }

    // Now calculate and update proper balances for all users
    console.log('\n🔄 Calculating and updating user balances...');
    
    for (const currentUser of users) {
      // Calculate TOIL balance (approved earnings - used)
      const approvedToilHours = await prisma.toilEntry.aggregate({
        where: {
          userId: currentUser.id,
          approved: true
        },
        _sum: { hours: true }
      });

      const usedToilHours = await prisma.leaveRequest.aggregate({
        where: {
          userId: currentUser.id,
          type: 'TOIL' as const,
          status: 'APPROVED'
        },
        _sum: { hours: true }
      });

      const toilBalance = (approvedToilHours._sum.hours || 0) - (usedToilHours._sum.hours || 0);

      // Calculate annual leave used in 2025
      const annualLeaveUsed2025 = await prisma.leaveRequest.aggregate({
        where: {
          userId: currentUser.id,
          type: 'ANNUAL' as const,
          status: 'APPROVED' as const,
          startDate: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31')
          }
        },
        _sum: { hours: true }
      });

      const annualUsed = Math.round((annualLeaveUsed2025._sum?.hours || 0) / 8); // Convert hours to days
      const annualRemaining = 32 - annualUsed; // Assuming 32 days entitlement

      // Calculate sick leave used in 2025
      const sickLeaveUsed2025 = await prisma.leaveRequest.aggregate({
        where: {
          userId: currentUser.id,
          type: 'SICK' as const,
          status: 'APPROVED' as const,
          startDate: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31')
          }
        },
        _sum: { hours: true }
      });

      const sickUsed = Math.round((sickLeaveUsed2025._sum?.hours || 0) / 8); // Convert hours to days
      const sickRemaining = Math.max(0, 3 - sickUsed); // 3 days entitlement

      // Update user balances
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          toilBalance: toilBalance,
          annualLeaveBalance: annualRemaining,
          sickLeaveBalance: sickRemaining
        }
      });

      console.log(`  📊 Updated balances for ${currentUser.name}:`);
      console.log(`    • TOIL: ${toilBalance}h`);
      console.log(`    • Annual: ${annualUsed}/${32} used, ${annualRemaining} remaining`);
      console.log(`    • Sick: ${sickUsed}/3 used, ${sickRemaining} remaining`);
    }

    // Generate summary statistics
    const pendingRequestsCount = await prisma.leaveRequest.count({
      where: { status: 'PENDING' }
    });

    const pendingToilCount = await prisma.toilEntry.count({
      where: { approved: false }
    });

    console.log('\n🎉 Comprehensive data seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`  • Total leave requests added: ${totalRequests}`);
    console.log(`  • Total TOIL entries added: ${totalToilEntries}`);
    console.log(`  • Pending leave requests: ${pendingRequestsCount}`);
    console.log(`  • Pending TOIL entries: ${pendingToilCount}`);

    return apiSuccess({
      message: 'Comprehensive dummy data added successfully',
      summary: {
        usersProcessed: users.length,
        totalLeaveRequests: totalRequests,
        totalToilEntries: totalToilEntries,
        pendingRequests: pendingRequestsCount,
        pendingToilEntries: pendingToilCount
      },
      users: users.map(u => u.name),
      nextSteps: [
        'Visit /admin/employee-balances to see updated balances',
        'Visit /admin/pending-requests to see pending requests',
        'Visit /admin/toil to see pending TOIL entries',
        'Click "View Details" on any employee to see comprehensive data',
        'Test the "Download Report" functionality'
      ]
    });

  } catch (error) {
    console.error('Comprehensive seed error:', error);
    return apiError('Failed to seed comprehensive data', 500);
  }
}

// Apply comprehensive admin security
export const POST = withCompleteSecurity(
  withAdminAuth(comprehensiveSeedHandler),
  { 
    validateInput: false, // Seed operation doesn't need input validation
    skipCSRF: false 
  }
);