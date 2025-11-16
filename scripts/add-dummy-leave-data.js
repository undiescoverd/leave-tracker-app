const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addDummyLeaveData() {
  console.log('🚀 Adding comprehensive dummy leave data...');

  try {
    // Get existing users (non-admin)
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, name: true, email: true }
    });

    if (users.length === 0) {
      console.log('❌ No regular users found. Please create some users first.');
      return;
    }

    console.log(`📋 Found ${users.length} users:`, users.map(u => u.name).join(', '));

    // Clear existing leave requests for clean testing
    await prisma.leaveRequest.deleteMany({
      where: { userId: { in: users.map(u => u.id) } }
    });
    console.log('🧹 Cleared existing leave requests');

    // Generate dummy data for each user
    for (const user of users) {
      console.log(`\n👤 Adding data for ${user.name}...`);
      
      const requests = [];

      // 2024 Historical Data (Approved)
      requests.push(
        // January 2024 - Annual leave
        {
          userId: user.id,
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-19'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40, // 5 days
          comments: 'New Year break',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-01-10'),
          createdAt: new Date('2024-01-05')
        },
        // March 2024 - Sick leave
        {
          userId: user.id,
          startDate: new Date('2024-03-12'),
          endDate: new Date('2024-03-13'),
          type: 'SICK',
          status: 'APPROVED',
          hours: 16, // 2 days
          comments: 'Flu symptoms',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-03-12'),
          createdAt: new Date('2024-03-12')
        },
        // May 2024 - Annual leave
        {
          userId: user.id,
          startDate: new Date('2024-05-20'),
          endDate: new Date('2024-05-24'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40, // 5 days
          comments: 'Spring holiday',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-05-15'),
          createdAt: new Date('2024-05-10')
        },
        // July 2024 - Unpaid leave
        {
          userId: user.id,
          startDate: new Date('2024-07-08'),
          endDate: new Date('2024-07-10'),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24, // 3 days
          comments: 'Family emergency',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-07-05'),
          createdAt: new Date('2024-07-03')
        },
        // August 2024 - Annual leave (long holiday)
        {
          userId: user.id,
          startDate: new Date('2024-08-12'),
          endDate: new Date('2024-08-23'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 80, // 10 days
          comments: 'Summer vacation',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-07-20'),
          createdAt: new Date('2024-07-15')
        },
        // October 2024 - Sick leave
        {
          userId: user.id,
          startDate: new Date('2024-10-14'),
          endDate: new Date('2024-10-14'),
          type: 'SICK',
          status: 'APPROVED',
          hours: 8, // 1 day
          comments: 'Doctor appointment',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-10-14'),
          createdAt: new Date('2024-10-14')
        },
        // December 2024 - Annual leave
        {
          userId: user.id,
          startDate: new Date('2024-12-23'),
          endDate: new Date('2024-12-31'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 56, // 7 days
          comments: 'Christmas holidays',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-11-15'),
          createdAt: new Date('2024-11-10')
        }
      );

      // 2025 Data (Mix of approved, pending, and rejected)
      requests.push(
        // January 2025 - Annual leave (approved)
        {
          userId: user.id,
          startDate: new Date('2025-01-20'),
          endDate: new Date('2025-01-24'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40, // 5 days
          comments: 'Winter break',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-01-15'),
          createdAt: new Date('2025-01-10')
        },
        // February 2025 - Unpaid leave (approved)
        {
          userId: user.id,
          startDate: new Date('2025-02-14'),
          endDate: new Date('2025-02-16'),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24, // 3 days
          comments: 'Personal matters',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-02-10'),
          createdAt: new Date('2025-02-05')
        },
        // April 2025 - Annual leave (approved)
        {
          userId: user.id,
          startDate: new Date('2025-04-07'),
          endDate: new Date('2025-04-11'),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40, // 5 days
          comments: 'Easter holidays',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-04-01'),
          createdAt: new Date('2025-03-25')
        },
        // June 2025 - Unpaid leave (approved)
        {
          userId: user.id,
          startDate: new Date('2025-06-16'),
          endDate: new Date('2025-06-18'),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24, // 3 days
          comments: 'Wedding preparation',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-06-10'),
          createdAt: new Date('2025-06-05')
        },
        // September 2025 - Annual leave (pending)
        {
          userId: user.id,
          startDate: new Date('2025-09-15'),
          endDate: new Date('2025-09-19'),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 40, // 5 days
          comments: 'Autumn break',
          createdAt: new Date('2025-08-28')
        },
        // October 2025 - Annual leave (pending)
        {
          userId: user.id,
          startDate: new Date('2025-10-28'),
          endDate: new Date('2025-10-31'),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 32, // 4 days
          comments: 'Half-term holiday',
          createdAt: new Date('2025-08-29')
        },
        // November 2025 - Unpaid leave (pending)
        {
          userId: user.id,
          startDate: new Date('2025-11-25'),
          endDate: new Date('2025-11-26'),
          type: 'UNPAID',
          status: 'PENDING',
          hours: 16, // 2 days
          comments: 'Extended weekend',
          createdAt: new Date('2025-08-30')
        },
        // December 2025 - Annual leave (pending)
        {
          userId: user.id,
          startDate: new Date('2025-12-22'),
          endDate: new Date('2025-12-31'),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 64, // 8 days
          comments: 'Christmas and New Year',
          createdAt: new Date('2025-08-30')
        }
      );

      // Add some rejected requests for variety
      if (user.email.includes('ian')) {
        requests.push({
          userId: user.id,
          startDate: new Date('2025-07-21'),
          endDate: new Date('2025-07-25'),
          type: 'ANNUAL',
          status: 'REJECTED',
          hours: 40, // 5 days
          comments: 'Summer holiday',
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-07-15'),
          createdAt: new Date('2025-07-10')
        });
      }

      // Add some sick leave for 2025
      requests.push({
        userId: user.id,
        startDate: new Date('2025-03-18'),
        endDate: new Date('2025-03-18'),
        type: 'SICK',
        status: 'APPROVED',
        hours: 8, // 1 day
        comments: 'Migraine',
        approvedBy: 'admin@tdh.co.uk',
        approvedAt: new Date('2025-03-18'),
        createdAt: new Date('2025-03-18')
      });

      // Bulk create all requests for this user
      await prisma.leaveRequest.createMany({
        data: requests
      });

      console.log(`  ✅ Added ${requests.length} leave requests for ${user.name}`);
    }

    // Add some TOIL entries as well
    console.log('\n⏰ Adding TOIL entries...');
    
    for (const user of users) {
      const toilEntries = [
        // 2024 TOIL entries (approved)
        {
          userId: user.id,
          date: new Date('2024-02-10'),
          type: 'WEEKEND_TRAVEL',
          hours: 4,
          reason: 'Weekend client site visit',
          approved: true,
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-02-12'),
          createdAt: new Date('2024-02-11')
        },
        {
          userId: user.id,
          date: new Date('2024-06-15'),
          type: 'OVERTIME',
          hours: 3,
          reason: 'Project deadline overtime',
          approved: true,
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-06-16'),
          createdAt: new Date('2024-06-16')
        },
        {
          userId: user.id,
          date: new Date('2024-09-22'),
          type: 'TRAVEL_LATE_RETURN',
          hours: 2,
          reason: 'Late return from Birmingham site',
          approved: true,
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2024-09-23'),
          createdAt: new Date('2024-09-23')
        },
        // 2025 TOIL entries (mix of approved and pending)
        {
          userId: user.id,
          date: new Date('2025-01-25'),
          type: 'AGENT_PANEL_DAY',
          hours: 8,
          reason: 'Agent panel Saturday session',
          approved: true,
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-01-27'),
          createdAt: new Date('2025-01-26')
        },
        {
          userId: user.id,
          date: new Date('2025-03-15'),
          type: 'OVERTIME',
          hours: 4,
          reason: 'Emergency system maintenance',
          approved: true,
          approvedBy: 'admin@tdh.co.uk',
          approvedAt: new Date('2025-03-16'),
          createdAt: new Date('2025-03-16')
        },
        // Pending TOIL entries
        {
          userId: user.id,
          date: new Date('2025-08-20'),
          type: 'WEEKEND_TRAVEL',
          hours: 4,
          reason: 'Weekend client emergency',
          approved: false,
          createdAt: new Date('2025-08-21')
        },
        {
          userId: user.id,
          date: new Date('2025-08-25'),
          type: 'OVERTIME',
          hours: 6,
          reason: 'Server migration overtime',
          approved: false,
          createdAt: new Date('2025-08-26')
        }
      ];

      await prisma.toilEntry.createMany({
        data: toilEntries
      });

      console.log(`  ✅ Added ${toilEntries.length} TOIL entries for ${user.name}`);
    }

    // Update TOIL balances based on approved entries
    for (const user of users) {
      const approvedToilHours = await prisma.toilEntry.aggregate({
        where: {
          userId: user.id,
          approved: true
        },
        _sum: {
          hours: true
        }
      });

      const usedToilHours = await prisma.leaveRequest.aggregate({
        where: {
          userId: user.id,
          type: 'TOIL',
          status: 'APPROVED'
        },
        _sum: {
          hours: true
        }
      });

      const balance = (approvedToilHours._sum.hours || 0) - (usedToilHours._sum.hours || 0);

      await prisma.user.update({
        where: { id: user.id },
        data: { toilBalance: balance }
      });

      console.log(`  ✅ Updated TOIL balance for ${user.name}: ${balance}h`);
    }

    console.log('\n🎉 Dummy data creation completed successfully!');
    console.log('\n📊 Summary of added data:');
    console.log('• Historical leave requests (2024): 7 per user');
    console.log('• Current year requests (2025): 8 per user');
    console.log('• Unpaid leave requests: 3 per user');
    console.log('• Pending requests: 4 per user');
    console.log('• TOIL entries: 7 per user');
    console.log('• Mix of approved, pending, and rejected status');

  } catch (error) {
    console.error('❌ Error adding dummy data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDummyLeaveData();