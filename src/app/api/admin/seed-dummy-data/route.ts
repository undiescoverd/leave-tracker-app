import { apiSuccess, apiError } from '@/lib/api/response';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';

async function seedDummyDataHandler(req: NextRequest, context: { user: unknown }): Promise<NextResponse> {
  try {
    // Admin user is available in context if needed

    // Get existing users (non-admin)
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('role', 'USER');

    if (usersError || !users || users.length === 0) {
      return apiError('No regular users found', 400);
    }

    console.log(`Found ${users.length} users:`, users.map(u => u.name));

    // Clear existing leave requests for clean testing
    const userIds = users.map(u => u.id);

    await supabaseAdmin
      .from('leave_requests')
      .delete()
      .in('user_id', userIds);

    // Clear existing TOIL entries
    await supabaseAdmin
      .from('toil_entries')
      .delete()
      .in('user_id', userIds);

    let totalRequests = 0;

    // Generate dummy data for each user
    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const currentUser = users[userIndex];

      const requests = [
        // 2024 Historical Data (Approved)
        {
          user_id: currentUser.id,
          start_date: new Date('2024-01-15').toISOString(),
          end_date: new Date('2024-01-19').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40,
          comments: 'New Year break',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-01-10').toISOString(),
          created_at: new Date('2024-01-05').toISOString(),
          updated_at: new Date('2024-01-10').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2024-03-12').toISOString(),
          end_date: new Date('2024-03-13').toISOString(),
          type: 'SICK',
          status: 'APPROVED',
          hours: 16,
          comments: 'Flu symptoms',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-03-12').toISOString(),
          created_at: new Date('2024-03-12').toISOString(),
          updated_at: new Date('2024-03-12').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2024-05-20').toISOString(),
          end_date: new Date('2024-05-24').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40,
          comments: 'Spring holiday',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-05-15').toISOString(),
          created_at: new Date('2024-05-10').toISOString(),
          updated_at: new Date('2024-05-15').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2024-07-08').toISOString(),
          end_date: new Date('2024-07-10').toISOString(),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24,
          comments: 'Family emergency',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-07-05').toISOString(),
          created_at: new Date('2024-07-03').toISOString(),
          updated_at: new Date('2024-07-05').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2024-08-12').toISOString(),
          end_date: new Date('2024-08-23').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 80,
          comments: 'Summer vacation',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-07-20').toISOString(),
          created_at: new Date('2024-07-15').toISOString(),
          updated_at: new Date('2024-07-20').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2024-10-14').toISOString(),
          end_date: new Date('2024-10-14').toISOString(),
          type: 'SICK',
          status: 'APPROVED',
          hours: 8,
          comments: 'Doctor appointment',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-10-14').toISOString(),
          created_at: new Date('2024-10-14').toISOString(),
          updated_at: new Date('2024-10-14').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2024-12-23').toISOString(),
          end_date: new Date('2024-12-31').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 56,
          comments: 'Christmas holidays',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2024-11-15').toISOString(),
          created_at: new Date('2024-11-10').toISOString(),
          updated_at: new Date('2024-11-15').toISOString()
        },

        // 2025 Data (mix of approved, pending, rejected)
        {
          user_id: currentUser.id,
          start_date: new Date('2025-01-20').toISOString(),
          end_date: new Date('2025-01-24').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40,
          comments: 'Winter break',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-01-15').toISOString(),
          created_at: new Date('2025-01-10').toISOString(),
          updated_at: new Date('2025-01-15').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2025-02-14').toISOString(),
          end_date: new Date('2025-02-16').toISOString(),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24,
          comments: 'Personal matters',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-02-10').toISOString(),
          created_at: new Date('2025-02-05').toISOString(),
          updated_at: new Date('2025-02-10').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2025-03-18').toISOString(),
          end_date: new Date('2025-03-18').toISOString(),
          type: 'SICK',
          status: 'APPROVED',
          hours: 8,
          comments: 'Migraine',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-03-18').toISOString(),
          created_at: new Date('2025-03-18').toISOString(),
          updated_at: new Date('2025-03-18').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2025-04-07').toISOString(),
          end_date: new Date('2025-04-11').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40,
          comments: 'Easter holidays',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-04-01').toISOString(),
          created_at: new Date('2025-03-25').toISOString(),
          updated_at: new Date('2025-04-01').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2025-06-16').toISOString(),
          end_date: new Date('2025-06-18').toISOString(),
          type: 'UNPAID',
          status: 'APPROVED',
          hours: 24,
          comments: userIndex === 0 ? 'Wedding preparation' : 'House viewing',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-06-10').toISOString(),
          created_at: new Date('2025-06-05').toISOString(),
          updated_at: new Date('2025-06-10').toISOString()
        },

        // Pending requests for future
        {
          user_id: currentUser.id,
          start_date: new Date('2025-09-15').toISOString(),
          end_date: new Date('2025-09-19').toISOString(),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 40,
          comments: 'Autumn break',
          created_at: new Date('2025-08-28').toISOString(),
          updated_at: new Date('2025-08-28').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2025-10-28').toISOString(),
          end_date: new Date('2025-10-31').toISOString(),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 32,
          comments: 'Half-term holiday',
          created_at: new Date('2025-08-29').toISOString(),
          updated_at: new Date('2025-08-29').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2025-11-25').toISOString(),
          end_date: new Date('2025-11-26').toISOString(),
          type: 'UNPAID',
          status: 'PENDING',
          hours: 16,
          comments: userIndex === 0 ? 'Extended weekend' : 'Conference attendance',
          created_at: new Date('2025-08-30').toISOString(),
          updated_at: new Date('2025-08-30').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2025-12-22').toISOString(),
          end_date: new Date('2025-12-31').toISOString(),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 64,
          comments: 'Christmas and New Year',
          created_at: new Date('2025-08-30').toISOString(),
          updated_at: new Date('2025-08-30').toISOString()
        }
      ];

      // Add some rejected requests for variety
      if (userIndex === 0) {
        requests.push({
          user_id: currentUser.id,
          start_date: new Date('2025-07-21').toISOString(),
          end_date: new Date('2025-07-25').toISOString(),
          type: 'ANNUAL',
          status: 'REJECTED',
          hours: 40,
          comments: 'Summer holiday',
          approved_by: 'admin@tdh.co.uk',
          approved_at: new Date('2025-07-15').toISOString(),
          created_at: new Date('2025-07-10').toISOString(),
          updated_at: new Date('2025-07-15').toISOString()
        });
      }

      totalRequests += requests.length;
    }

    console.log(`📊 Template generated for ${users.length} users with ${totalRequests} total leave requests`);

    return apiSuccess({
      message: 'Dummy data template ready',
      users: users.map(u => ({ id: u.id, name: u.name })),
      totalRequestsPerUser: Math.floor(totalRequests / users.length),
      instructions: [
        '1. Use Supabase Studio to manually add the leave requests',
        '2. Use the template data structure shown in the console',
        '3. Or run SQL inserts with the provided user IDs'
      ]
    });

  } catch (error) {
    console.error('Seed data error:', error);
    return apiError('Failed to prepare dummy data', 500);
  }
}

// Apply comprehensive admin security
export const POST = withCompleteSecurity(
  withAdminAuth(seedDummyDataHandler),
  {
    validateInput: false, // Seed operation doesn't need input validation
    skipCSRF: false
  }
);
