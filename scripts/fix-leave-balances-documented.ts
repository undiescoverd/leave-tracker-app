#!/usr/bin/env tsx

/**
 * Fix Leave Balances Script - Documentation Based
 * Updates all users with correct annual leave (32 days) as specified in PRD
 * Only sets values that are explicitly documented
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

async function fixDocumentedLeaveBalances() {
  console.log('🔧 Fixing leave balances based on PRD documentation...\n');

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
      const needsUpdate = user.annual_leave_balance !== 32;

      if (needsUpdate) {
        console.log(`🔄 Updating ${user.name} (${user.email}):`);
        console.log(`  - Annual Leave: ${user.annual_leave_balance} → 32 days (PRD documented)`);

        const { error: updateError } = await supabase
          .from('users')
          .update({
            annual_leave_balance: 32,  // PRD specification: "total annual leave entitlement (32 days)"
            // Only update documented values, leave sick/TOIL as they were
          })
          .eq('id', user.id);

        if (updateError) throw updateError;

        updatedCount++;
      } else {
        console.log(`✅ ${user.name} (${user.email}) already has correct annual leave balance\n`);
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
    console.log('🎯 All users now have correct annual leave balance:');
    console.log('   - Annual Leave: 32 days (as specified in PRD)');
    console.log('   - Other leave types: Left as configured per individual requirements');

  } catch (error) {
    console.error('❌ Error fixing leave balances:', error);
    process.exit(1);
  }
}

// Run the script
fixDocumentedLeaveBalances().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});