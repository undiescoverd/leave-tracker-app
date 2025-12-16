const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function createTestLeave() {
  try {
    // Get the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', 'senay@tdhagency.com')
      .single();

    if (userError || !user) {
      console.error('User not found');
      return;
    }

    // Create a test leave request
    const { data: leaveRequest, error: createError1 } = await supabase
      .from('leave_requests')
      .insert({
        start_date: new Date('2025-09-02').toISOString(),
        end_date: new Date('2025-09-03').toISOString(),
        status: 'PENDING',
        comments: 'Test calendar display',
        type: 'ANNUAL',
        user_id: user.id
      })
      .select()
      .single();

    if (createError1) {
      console.error('Error creating first leave request:', createError1);
    } else {
      console.log('Created test leave request:', leaveRequest);
    }

    // Create another one for a different date
    const { data: leaveRequest2, error: createError2 } = await supabase
      .from('leave_requests')
      .insert({
        start_date: new Date('2025-09-05').toISOString(),
        end_date: new Date('2025-09-05').toISOString(),
        status: 'APPROVED',
        comments: 'Another test leave',
        type: 'SICK',
        user_id: user.id
      })
      .select()
      .single();

    if (createError2) {
      console.error('Error creating second leave request:', createError2);
    } else {
      console.log('Created second test leave request:', leaveRequest2);
    }

  } catch (error) {
    console.error('Error creating test leave:', error);
  }
}

createTestLeave();
