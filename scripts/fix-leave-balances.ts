#!/usr/bin/env tsx

/**
 * Fix Leave Balances Script
 * Updates all users with correct annual leave (32 days) and sick leave (10 days) balances
 * Based on PRD specifications and UK employment standards
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLeaveBalances() {
  console.log('🔧 Fixing leave balances for all users...\n');

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
      const needsUpdate = 
        user.annualLeaveBalance !== 32 || 
        user.sickLeaveBalance !== 10 || 
        user.toilBalance === null;

      if (needsUpdate) {
        console.log(`🔄 Updating ${user.name} (${user.email}):`);
        console.log(`  - Annual Leave: ${user.annualLeaveBalance} → 32 days`);
        console.log(`  - Sick Leave: ${user.sickLeaveBalance} → 10 days`);
        console.log(`  - TOIL Balance: ${user.toilBalance ?? 'NULL'} → 0 hours\n`);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            annualLeaveBalance: 32,  // PRD specification
            sickLeaveBalance: 10,    // UK standard for talent agencies
            toilBalance: user.toilBalance ?? 0,  // Initialize if null
          }
        });

        updatedCount++;
      } else {
        console.log(`✅ ${user.name} (${user.email}) already has correct balances\n`);
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
    console.log('🎯 All users now have correct leave balances:');
    console.log('   - Annual Leave: 32 days (PRD specification)');
    console.log('   - Sick Leave: 10 days (UK agency standard)');
    console.log('   - TOIL Balance: Initialized to 0 hours');

  } catch (error) {
    console.error('❌ Error fixing leave balances:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixLeaveBalances().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});