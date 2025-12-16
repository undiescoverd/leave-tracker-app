/**
 * Reset All Leave Data Script
 * Clears all leave requests, TOIL entries, and resets user balances
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local FIRST
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

// Create Supabase admin client directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SECRET_KEY:', supabaseServiceKey);
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetAllLeaveData() {
  console.log('🗑️  Starting complete leave data reset...\n');

  try {
    // 1. Delete all leave requests
    console.log('1️⃣  Deleting all leave requests...');
    const { error: leaveError, count: leaveCount } = await supabaseAdmin
      .from('leave_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)

    if (leaveError) {
      throw new Error(`Failed to delete leave requests: ${leaveError.message}`);
    }
    console.log(`   ✅ Deleted leave requests\n`);

    // 2. Delete all TOIL entries
    console.log('2️⃣  Deleting all TOIL entries...');
    const { error: toilError, count: toilCount } = await supabaseAdmin
      .from('toil_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)

    if (toilError) {
      throw new Error(`Failed to delete TOIL entries: ${toilError.message}`);
    }
    console.log(`   ✅ Deleted TOIL entries\n`);

    // 3. Reset all user balances
    console.log('3️⃣  Resetting user balances to defaults...');
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .in('role', ['USER', 'ADMIN']);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    // Update each user's balance
    for (const user of users || []) {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          annual_leave_balance: 32,
          toil_balance: 0,
          sick_leave_balance: 3,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error(`   ⚠️  Failed to update ${user.email}:`, updateError.message);
      } else {
        console.log(`   ✅ Reset balances for ${user.name} (${user.email})`);
      }
    }

    // 4. Verify cleanup
    console.log('\n4️⃣  Verifying cleanup...');
    const { count: remainingLeave } = await supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact', head: true });

    const { count: remainingToil } = await supabaseAdmin
      .from('toil_entries')
      .select('*', { count: 'exact', head: true });

    console.log(`   📊 Leave requests remaining: ${remainingLeave || 0}`);
    console.log(`   📊 TOIL entries remaining: ${remainingToil || 0}`);
    console.log(`   📊 Users reset: ${users?.length || 0}`);

    console.log('\n✅ All leave data has been cleared successfully!');
    console.log('📝 All users have been reset to default balances:');
    console.log('   - Annual Leave: 32 days');
    console.log('   - TOIL: 0 hours');
    console.log('   - Sick Leave: 3 days\n');
  } catch (error) {
    console.error('\n❌ Error resetting leave data:', error);
    process.exit(1);
  }
}

// Run the script
resetAllLeaveData()
  .then(() => {
    console.log('🎉 Reset complete! Your app now has a clean slate.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
