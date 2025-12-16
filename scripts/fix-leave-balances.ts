#!/usr/bin/env tsx

/**
 * Fix Leave Balances Script
 * Updates all users with correct annual leave (32 days) and sick leave (10 days) balances
 * Based on PRD specifications and UK employment standards
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function fixLeaveBalances() {
  console.log('🔧 Fixing leave balances for all users...\n');

  try {
    // Get all users
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, annual_leave_balance, sick_leave_balance, toil_balance');

    if (fetchError) throw fetchError;
    if (!users) throw new Error('No users found');

    console.log(`📊 Found ${users.length} users to update\n`);

    // Update each user
    let updatedCount = 0;

    for (const user of users) {
      const needsUpdate =
        user.annual_leave_balance !== 32 ||
        user.sick_leave_balance !== 10 ||
        user.toil_balance === null;

      if (needsUpdate) {
        console.log(`🔄 Updating ${user.name} (${user.email}):`);
        console.log(`  - Annual Leave: ${user.annual_leave_balance} → 32 days`);
        console.log(`  - Sick Leave: ${user.sick_leave_balance} → 10 days`);
        console.log(`  - TOIL Balance: ${user.toil_balance ?? 'NULL'} → 0 hours\n`);

        const { error: updateError } = await supabase
          .from('users')
          .update({
            annual_leave_balance: 32,  // PRD specification
            sick_leave_balance: 10,    // UK standard for talent agencies
            toil_balance: user.toil_balance ?? 0,  // Initialize if null
          })
          .eq('id', user.id);

        if (updateError) throw updateError;

        updatedCount++;
      } else {
        console.log(`✅ ${user.name} (${user.email}) already has correct balances\n`);
      }
    }

    // Verify updates
    console.log('🔍 Verifying updates...\n');
    const { data: verifyUsers, error: verifyError } = await supabase
      .from('users')
      .select('name, email, annual_leave_balance, sick_leave_balance, toil_balance');

    if (verifyError) throw verifyError;

    console.log('📋 Current user balances:');
    for (const user of verifyUsers || []) {
      console.log(`  ${user.name}: Annual=${user.annual_leave_balance}, Sick=${user.sick_leave_balance}, TOIL=${user.toil_balance}`);
    }

    console.log(`\n✅ Successfully updated ${updatedCount} users`);
    console.log('🎯 All users now have correct leave balances:');
    console.log('   - Annual Leave: 32 days (PRD specification)');
    console.log('   - Sick Leave: 10 days (UK agency standard)');
    console.log('   - TOIL Balance: Initialized to 0 hours');

  } catch (error) {
    console.error('❌ Error fixing leave balances:', error);
    process.exit(1);
  }
}

// Run the script
fixLeaveBalances().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});