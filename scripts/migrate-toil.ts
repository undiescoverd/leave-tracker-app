import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function safeToilMigration() {
  console.log('🔄 Starting TOIL migration...');

  try {
    // 1. Check if migration already applied
    const { data: sampleUser, error: sampleError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (sampleError && sampleError.code !== 'PGRST116') throw sampleError;

    if (sampleUser && 'toil_balance' in sampleUser) {
      console.log('✅ TOIL migration already applied');
      return;
    }

    // 2. Backup current data (log for safety)
    const { count: userCount, error: userCountError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: requestCount, error: requestCountError } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true });

    if (userCountError || requestCountError) {
      console.error('Error getting counts:', userCountError || requestCountError);
    }

    console.log(`📊 Current data: ${userCount || 0} users, ${requestCount || 0} requests`);

    // 3. Apply migration
    console.log('🔄 Updating existing users with default balances...');

    // Update all existing users with default balances
    const { error: updateUsersError } = await supabase
      .from('users')
      .update({
        annual_leave_balance: 32,
        toil_balance: 0,
        sick_leave_balance: 3,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all (dummy condition)

    if (updateUsersError) throw updateUsersError;

    console.log('🔄 Updating existing leave requests to ANNUAL type...');

    // Update all existing leave requests to ANNUAL type
    const { error: updateRequestsError } = await supabase
      .from('leave_requests')
      .update({ type: 'ANNUAL' })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all (dummy condition)

    if (updateRequestsError) throw updateRequestsError;

    console.log('✅ Migration completed successfully');

    // 4. Verify migration
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();

    if (verifyError) throw verifyError;

    if (verifyUser && 'toil_balance' in verifyUser) {
      console.log('✅ Migration verified');
      console.log(`📊 User balances: Annual=${verifyUser.annual_leave_balance}, TOIL=${verifyUser.toil_balance}, Sick=${verifyUser.sick_leave_balance}`);
    } else {
      throw new Error('Migration verification failed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
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
