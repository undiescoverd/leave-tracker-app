const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function clearAllLeaveRequests() {
  try {
    console.log('Fetching all leave requests...');
    
    // First, get count of all leave requests
    const { count, error: countError } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting leave requests:', countError);
      return;
    }

    console.log(`Found ${count} leave request(s) to delete.`);

    if (count === 0) {
      console.log('No leave requests to delete. Database is already clean.');
      return;
    }

    // Delete all leave requests
    console.log('Deleting all leave requests...');
    const { data, error: deleteError } = await supabase
      .from('leave_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that's always true)

    if (deleteError) {
      console.error('Error deleting leave requests:', deleteError);
      return;
    }

    // Verify deletion
    const { count: remainingCount, error: verifyError } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true });

    if (verifyError) {
      console.error('Error verifying deletion:', verifyError);
      return;
    }

    console.log(`✅ Successfully deleted all leave requests.`);
    console.log(`   Remaining leave requests: ${remainingCount}`);
    console.log('   Database is now clean for testing.');

  } catch (error) {
    console.error('Error clearing leave requests:', error);
  }
}

clearAllLeaveRequests();

