const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function addDummyLeaveData() {
  console.log('🚀 Adding comprehensive dummy leave data...');

  try {
    // Get existing users (non-admin)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'USER');

    if (usersError) throw usersError;

    if (users.length === 0) {
      console.log('❌ No regular users found. Please create some users first.');
      return;
    }

    console.log(`📋 Found ${users.length} users:`, users.map(u => u.name).join(', '));

    // Clear existing leave requests for clean testing
    const { error: deleteError } = await supabase
      .from('leave_requests')
      .delete()
      .in('user_id', users.map(u => u.id));

    if (deleteError) console.error('Error clearing leave requests:', deleteError);
    else console.log('🧹 Cleared existing leave requests');

    // Generate dummy data for each user
    for (const user of users) {
      console.log(`\n👤 Adding data for ${user.name}...`);

      const requests = [];

      // 2024 Historical Data (Approved)
      requests.push(
        // January 2024 - Annual leave
        {
          user_id: user.id,
          start_date: new Date('2024-01-15').toISOString(),
          end_date: new Date('2024-01-19').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40, // 5 days
          comments: 'New Year break',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-01-10').toISOString(),
          created_at: new Date('2024-01-05').toISOString()
        },
        // March 2024 - Sick leave
        {
          user_id: user.id,
          start_date: new Date('2024-03-12').toISOString(),
          end_date: new Date('2024-03-13').toISOString(),
          type: 'SICK',
          status: 'APPROVED',
          hours: 16, // 2 days
          comments: 'Flu symptoms',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-03-12').toISOString(),
          created_at: new Date('2024-03-12').toISOString()
        },
        // May 2024 - Annual leave
        {
          user_id: user.id,
          start_date: new Date('2024-05-20').toISOString(),
          end_date: new Date('2024-05-24').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40, // 5 days
          comments: 'Spring holiday',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-05-15').toISOString(),
          created_at: new Date('2024-05-10').toISOString()
        },
        // July 2024 - Unpaid leave
        {
          user_id: user.id,
          start_date: new Date('2024-07-08').toISOString(),
          end_date: new Date('2024-07-10').toISOString(),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24, // 3 days
          comments: 'Family emergency',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-07-05').toISOString(),
          created_at: new Date('2024-07-03').toISOString()
        },
        // August 2024 - Annual leave (long holiday)
        {
          user_id: user.id,
          start_date: new Date('2024-08-12').toISOString(),
          end_date: new Date('2024-08-23').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 80, // 10 days
          comments: 'Summer vacation',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-07-20').toISOString(),
          created_at: new Date('2024-07-15').toISOString()
        },
        // October 2024 - Sick leave
        {
          user_id: user.id,
          start_date: new Date('2024-10-14').toISOString(),
          end_date: new Date('2024-10-14').toISOString(),
          type: 'SICK',
          status: 'APPROVED',
          hours: 8, // 1 day
          comments: 'Doctor appointment',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-10-14').toISOString(),
          created_at: new Date('2024-10-14').toISOString()
        },
        // December 2024 - Annual leave
        {
          user_id: user.id,
          start_date: new Date('2024-12-23').toISOString(),
          end_date: new Date('2024-12-31').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 56, // 7 days
          comments: 'Christmas holidays',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-11-15').toISOString(),
          created_at: new Date('2024-11-10').toISOString()
        }
      );

      // 2025 Data (Mix of approved, pending, and rejected)
      requests.push(
        // January 2025 - Annual leave (approved)
        {
          user_id: user.id,
          start_date: new Date('2025-01-20').toISOString(),
          end_date: new Date('2025-01-24').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40, // 5 days
          comments: 'Winter break',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-01-15').toISOString(),
          created_at: new Date('2025-01-10').toISOString()
        },
        // February 2025 - Unpaid leave (approved)
        {
          user_id: user.id,
          start_date: new Date('2025-02-14').toISOString(),
          end_date: new Date('2025-02-16').toISOString(),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24, // 3 days
          comments: 'Personal matters',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-02-10').toISOString(),
          created_at: new Date('2025-02-05').toISOString()
        },
        // April 2025 - Annual leave (approved)
        {
          user_id: user.id,
          start_date: new Date('2025-04-07').toISOString(),
          end_date: new Date('2025-04-11').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40, // 5 days
          comments: 'Easter holidays',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-04-01').toISOString(),
          created_at: new Date('2025-03-25').toISOString()
        },
        // June 2025 - Unpaid leave (approved)
        {
          user_id: user.id,
          start_date: new Date('2025-06-16').toISOString(),
          end_date: new Date('2025-06-18').toISOString(),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24, // 3 days
          comments: 'Wedding preparation',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-06-10').toISOString(),
          created_at: new Date('2025-06-05').toISOString()
        },
        // September 2025 - Annual leave (pending)
        {
          user_id: user.id,
          start_date: new Date('2025-09-15').toISOString(),
          end_date: new Date('2025-09-19').toISOString(),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 40, // 5 days
          comments: 'Autumn break',
          created_at: new Date('2025-08-28').toISOString()
        },
        // October 2025 - Annual leave (pending)
        {
          user_id: user.id,
          start_date: new Date('2025-10-28').toISOString(),
          end_date: new Date('2025-10-31').toISOString(),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 32, // 4 days
          comments: 'Half-term holiday',
          created_at: new Date('2025-08-29').toISOString()
        },
        // November 2025 - Unpaid leave (pending)
        {
          user_id: user.id,
          start_date: new Date('2025-11-25').toISOString(),
          end_date: new Date('2025-11-26').toISOString(),
          type: 'UNPAID',
          status: 'PENDING',
          hours: 16, // 2 days
          comments: 'Extended weekend',
          created_at: new Date('2025-08-30').toISOString()
        },
        // December 2025 - Annual leave (pending)
        {
          user_id: user.id,
          start_date: new Date('2025-12-22').toISOString(),
          end_date: new Date('2025-12-31').toISOString(),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 64, // 8 days
          comments: 'Christmas and New Year',
          created_at: new Date('2025-08-30').toISOString()
        }
      );

      // Add some rejected requests for variety
      if (user.email.includes('ian')) {
        requests.push({
          user_id: user.id,
          start_date: new Date('2025-07-21').toISOString(),
          end_date: new Date('2025-07-25').toISOString(),
          type: 'ANNUAL',
          status: 'REJECTED',
          hours: 40, // 5 days
          comments: 'Summer holiday',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-07-15').toISOString(),
          created_at: new Date('2025-07-10').toISOString()
        });
      }

      // Add some sick leave for 2025
      requests.push({
        user_id: user.id,
        start_date: new Date('2025-03-18').toISOString(),
        end_date: new Date('2025-03-18').toISOString(),
        type: 'SICK',
        status: 'APPROVED',
        hours: 8, // 1 day
        comments: 'Migraine',
        approved_by: 'admin@tdh.co.uk',
        approved_at: new Date('2025-03-18').toISOString(),
        created_at: new Date('2025-03-18').toISOString()
      });

      // Bulk create all requests for this user
      const { error: insertError } = await supabase
        .from('leave_requests')
        .insert(requests);

      if (insertError) console.error(`Error inserting leave requests for ${user.name}:`, insertError);
      else console.log(`  ✅ Added ${requests.length} leave requests for ${user.name}`);
    }

    // Add some TOIL entries as well
    console.log('\n⏰ Adding TOIL entries...');

    for (const user of users) {
      const toilEntries = [
        // 2024 TOIL entries (approved)
        {
          user_id: user.id,
          date: new Date('2024-02-10').toISOString(),
          type: 'WEEKEND_TRAVEL',
          hours: 4,
          reason: 'Weekend client site visit',
          approved: true,
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-02-12').toISOString(),
          created_at: new Date('2024-02-11').toISOString()
        },
        {
          user_id: user.id,
          date: new Date('2024-06-15').toISOString(),
          type: 'OVERTIME',
          hours: 3,
          reason: 'Project deadline overtime',
          approved: true,
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-06-16').toISOString(),
          created_at: new Date('2024-06-16').toISOString()
        },
        {
          user_id: user.id,
          date: new Date('2024-09-22').toISOString(),
          type: 'TRAVEL_LATE_RETURN',
          hours: 2,
          reason: 'Late return from Birmingham site',
          approved: true,
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-09-23').toISOString(),
          created_at: new Date('2024-09-23').toISOString()
        },
        // 2025 TOIL entries (mix of approved and pending)
        {
          user_id: user.id,
          date: new Date('2025-01-25').toISOString(),
          type: 'AGENT_PANEL_DAY',
          hours: 8,
          reason: 'Agent panel Saturday session',
          approved: true,
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-01-27').toISOString(),
          created_at: new Date('2025-01-26').toISOString()
        },
        {
          user_id: user.id,
          date: new Date('2025-03-15').toISOString(),
          type: 'OVERTIME',
          hours: 4,
          reason: 'Emergency system maintenance',
          approved: true,
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-03-16').toISOString(),
          created_at: new Date('2025-03-16').toISOString()
        },
        // Pending TOIL entries
        {
          user_id: user.id,
          date: new Date('2025-08-20').toISOString(),
          type: 'WEEKEND_TRAVEL',
          hours: 4,
          reason: 'Weekend client emergency',
          approved: false,
          created_at: new Date('2025-08-21').toISOString()
        },
        {
          user_id: user.id,
          date: new Date('2025-08-25').toISOString(),
          type: 'OVERTIME',
          hours: 6,
          reason: 'Server migration overtime',
          approved: false,
          created_at: new Date('2025-08-26').toISOString()
        }
      ];

      const { error: toilInsertError } = await supabase
        .from('toil_entries')
        .insert(toilEntries);

      if (toilInsertError) console.error(`Error inserting TOIL entries for ${user.name}:`, toilInsertError);
      else console.log(`  ✅ Added ${toilEntries.length} TOIL entries for ${user.name}`);
    }

    // Update TOIL balances based on approved entries
    for (const user of users) {
      // Get approved TOIL hours
      const { data: approvedToil, error: approvedError } = await supabase
        .from('toil_entries')
        .select('hours')
        .eq('user_id', user.id)
        .eq('approved', true);

      if (approvedError) console.error(`Error fetching approved TOIL for ${user.name}:`, approvedError);

      const approvedHours = (approvedToil || []).reduce((sum, entry) => sum + (entry.hours || 0), 0);

      // Get used TOIL hours
      const { data: usedToil, error: usedError } = await supabase
        .from('leave_requests')
        .select('hours')
        .eq('user_id', user.id)
        .eq('type', 'TOIL')
        .eq('status', 'APPROVED');

      if (usedError) console.error(`Error fetching used TOIL for ${user.name}:`, usedError);

      const usedHours = (usedToil || []).reduce((sum, entry) => sum + (entry.hours || 0), 0);

      const balance = approvedHours - usedHours;

      // Update user's TOIL balance
      const { error: updateError } = await supabase
        .from('users')
        .update({ toil_balance: balance })
        .eq('id', user.id);

      if (updateError) console.error(`Error updating TOIL balance for ${user.name}:`, updateError);
      else console.log(`  ✅ Updated TOIL balance for ${user.name}: ${balance}h`);
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
  }
}

addDummyLeaveData();
