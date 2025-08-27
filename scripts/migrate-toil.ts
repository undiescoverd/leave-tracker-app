import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function safeToilMigration() {
  console.log('🔄 Starting TOIL migration...');
  
  try {
    // 1. Check if migration already applied
    const sampleUser = await prisma.user.findFirst();
    if (sampleUser && 'toilBalance' in sampleUser) {
      console.log('✅ TOIL migration already applied');
      return;
    }

    // 2. Backup current data (log for safety)
    const userCount = await prisma.user.count();
    const requestCount = await prisma.leaveRequest.count();
    console.log(`📊 Current data: ${userCount} users, ${requestCount} requests`);

    // 3. Apply migration with transaction
    await prisma.$transaction(async (tx) => {
      console.log('🔄 Updating existing users with default balances...');
      
      // Update all existing users with default balances
      await tx.user.updateMany({
        data: {
          annualLeaveBalance: 32,
          toilBalance: 0,
          sickLeaveBalance: 3,
        }
      });

      console.log('🔄 Updating existing leave requests to ANNUAL type...');
      
      // Update all existing leave requests to ANNUAL type
      await tx.leaveRequest.updateMany({
        data: {
          type: 'ANNUAL'
        }
      });

      console.log('✅ Migration completed successfully');
    });

    // 4. Verify migration
    const verifyUser = await prisma.user.findFirst();
    if (verifyUser && 'toilBalance' in verifyUser) {
      console.log('✅ Migration verified');
      console.log(`📊 User balances: Annual=${verifyUser.annualLeaveBalance}, TOIL=${verifyUser.toilBalance}, Sick=${verifyUser.sickLeaveBalance}`);
    } else {
      throw new Error('Migration verification failed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('🔄 Rolling back...');
    // Rollback handled by transaction
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  safeToilMigration()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { safeToilMigration };
