#!/usr/bin/env tsx

/**
 * Fix Leave Balances Script - Documentation Based
 * Updates all users with correct annual leave (32 days) as specified in PRD
 * Only sets values that are explicitly documented
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDocumentedLeaveBalances() {
  console.log('🔧 Fixing leave balances based on PRD documentation...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        annualLeaveBalance: true,
        sickLeaveBalance: true,
        toilBalance: true,
      }
    });

    console.log(`📊 Found ${users.length} users to update\n`);

    // Update each user
    let updatedCount = 0;
    
    for (const user of users) {
      const needsUpdate = user.annualLeaveBalance !== 32;

      if (needsUpdate) {
        console.log(`🔄 Updating ${user.name} (${user.email}):`);
        console.log(`  - Annual Leave: ${user.annualLeaveBalance} → 32 days (PRD documented)`);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            annualLeaveBalance: 32,  // PRD specification: "total annual leave entitlement (32 days)"
            // Only update documented values, leave sick/TOIL as they were
          }
        });

        updatedCount++;
      } else {
        console.log(`✅ ${user.name} (${user.email}) already has correct annual leave balance\n`);
      }
    }

    // Verify updates
    console.log('🔍 Verifying updates...\n');
    const verifyUsers = await prisma.user.findMany({
      select: {
        name: true,
        email: true,
        annualLeaveBalance: true,
        sickLeaveBalance: true,
        toilBalance: true,
      }
    });

    console.log('📋 Current user balances:');
    for (const user of verifyUsers) {
      console.log(`  ${user.name}: Annual=${user.annualLeaveBalance}, Sick=${user.sickLeaveBalance}, TOIL=${user.toilBalance}`);
    }

    console.log(`\n✅ Successfully updated ${updatedCount} users`);
    console.log('🎯 All users now have correct annual leave balance:');
    console.log('   - Annual Leave: 32 days (as specified in PRD)');
    console.log('   - Other leave types: Left as configured per individual requirements');

  } catch (error) {
    console.error('❌ Error fixing leave balances:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixDocumentedLeaveBalances().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});