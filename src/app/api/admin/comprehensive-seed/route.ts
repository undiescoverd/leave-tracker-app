import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';

import { supabaseAdmin } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';

interface AuthContext {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

async function comprehensiveSeedHandler(req: NextRequest, context: AuthContext): Promise<NextResponse> {
  try {
    const { user } = context;

    console.log('🚀 Starting comprehensive data seeding...');

    // Get existing users (non-admin)
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('role', 'USER');

    if (usersError || !users || users.length === 0) {
      return apiError('No regular users found', 400);
    }

    console.log(`📋 Found ${users.length} users:`, users.map(u => u.name));

    // Clear existing data for clean testing
    const userIds = users.map(u => u.id);

    await supabaseAdmin
      .from('leave_requests')
      .delete()
      .in('user_id', userIds);

    await supabaseAdmin
      .from('toil_entries')
      .delete()
      .in('user_id', userIds);

    console.log('🧹 Cleared existing leave and TOIL data');

    let totalRequests = 0;
    let totalToilEntries = 0;

    // Add comprehensive data for each user
    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const currentUser = users[userIndex];
      console.log(`\n👤 Processing ${currentUser.name}...`);

      // Note: 8 hours = 1 day conversion available if needed

      // 2024 Historical Data (All Approved)
      const historicalRequests = [
        {
          user_id: currentUser.id,
          start_date: new Date('2024-01-15').toISOString(),
          end_date: new Date('2024-01-19').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40,
          comments: 'New Year break',
          approved_by: user.id,
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
          approved_by: user.id,
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
          approved_by: user.id,
          approved_at: new Date('2024-05-15').toISOString(),
          created_at: new Date('2024-05-10').toISOString(),
          updated_at: new Date('2024-05-15').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2024-07-08').toISOString(),
          end_date: new Date('2024-07-10').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 24,
          comments: 'Family emergency',
          approved_by: user.id,
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
          approved_by: user.id,
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
          approved_by: user.id,
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
          approved_by: user.id,
          approved_at: new Date('2024-11-15').toISOString(),
          created_at: new Date('2024-11-10').toISOString(),
          updated_at: new Date('2024-11-15').toISOString()
        }
      ];

      // 2025 Current Year Data
      const currentYearRequests = [
        // Approved requests
        {
          user_id: currentUser.id,
          start_date: new Date('2025-01-20').toISOString(),
          end_date: new Date('2025-01-24').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 40,
          comments: 'Winter break',
          approved_by: user.id,
          approved_at: new Date('2025-01-15').toISOString(),
          created_at: new Date('2025-01-10').toISOString(),
          updated_at: new Date('2025-01-15').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2025-02-14').toISOString(),
          end_date: new Date('2025-02-16').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 24,
          comments: userIndex === 0 ? 'Personal matters' : 'Family commitment',
          approved_by: user.id,
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
          comments: userIndex === 0 ? 'Migraine' : 'Dental surgery',
          approved_by: user.id,
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
          approved_by: user.id,
          approved_at: new Date('2025-04-01').toISOString(),
          created_at: new Date('2025-03-25').toISOString(),
          updated_at: new Date('2025-04-01').toISOString()
        },
        {
          user_id: currentUser.id,
          start_date: new Date('2025-06-16').toISOString(),
          end_date: new Date('2025-06-18').toISOString(),
          type: 'ANNUAL',
          status: 'APPROVED',
          hours: 24,
          comments: userIndex === 0 ? 'Wedding preparation' : 'House viewing',
          approved_by: user.id,
          approved_at: new Date('2025-06-10').toISOString(),
          created_at: new Date('2025-06-05').toISOString(),
          updated_at: new Date('2025-06-10').toISOString()
        },

        // Pending requests (will show in pending requests dashboard)
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
          type: 'ANNUAL',
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
        currentYearRequests.push({
          user_id: currentUser.id,
          start_date: new Date('2025-07-21').toISOString(),
          end_date: new Date('2025-07-25').toISOString(),
          type: 'ANNUAL',
          status: 'PENDING',
          hours: 40,
          comments: 'Summer holiday - Coverage conflict',
          created_at: new Date('2025-07-10').toISOString(),
          updated_at: new Date('2025-07-15').toISOString()
        });
      }

      const allRequests = [...historicalRequests, ...currentYearRequests];

      // Bulk create leave requests
      const { error: leaveError } = await supabaseAdmin
        .from('leave_requests')
        .insert(allRequests);

      if (leaveError) {
        console.error(`  ❌ Error adding leave requests for ${currentUser.name}:`, leaveError);
        throw leaveError;
      }

      totalRequests += allRequests.length;
      console.log(`  ✅ Added ${allRequests.length} leave requests for ${currentUser.name}`);

      // Add TOIL entries
      const toilEntries = [
        // 2024 TOIL (approved)
        {
          user_id: currentUser.id,
          date: new Date('2024-02-10').toISOString(),
          type: 'WEEKEND_TRAVEL',
          hours: 4,
          reason: 'Weekend client site visit',
          approved: true,
          approved_by: user.id,
          approved_at: new Date('2024-02-12').toISOString(),
          created_at: new Date('2024-02-11').toISOString(),
          updated_at: new Date('2024-02-12').toISOString()
        },
        {
          user_id: currentUser.id,
          date: new Date('2024-06-15').toISOString(),
          type: 'OVERTIME',
          hours: userIndex === 0 ? 3 : 5,
          reason: userIndex === 0 ? 'Project deadline overtime' : 'Quarterly report overtime',
          approved: true,
          approved_by: user.id,
          approved_at: new Date('2024-06-16').toISOString(),
          created_at: new Date('2024-06-16').toISOString(),
          updated_at: new Date('2024-06-16').toISOString()
        },
        {
          user_id: currentUser.id,
          date: new Date('2024-09-22').toISOString(),
          type: 'TRAVEL_LATE_RETURN',
          hours: userIndex === 0 ? 2 : 3,
          reason: userIndex === 0 ? 'Late return from Birmingham site' : 'Late return from Leeds client',
          approved: true,
          approved_by: user.id,
          approved_at: new Date('2024-09-23').toISOString(),
          created_at: new Date('2024-09-23').toISOString(),
          updated_at: new Date('2024-09-23').toISOString()
        },
        // 2025 TOIL (approved)
        {
          user_id: currentUser.id,
          date: new Date('2025-01-25').toISOString(),
          type: 'AGENT_PANEL_DAY',
          hours: 8,
          reason: userIndex === 0 ? 'Agent panel Saturday session' : 'Saturday agent interviews',
          approved: true,
          approved_by: user.id,
          approved_at: new Date('2025-01-27').toISOString(),
          created_at: new Date('2025-01-26').toISOString(),
          updated_at: new Date('2025-01-27').toISOString()
        },
        {
          user_id: currentUser.id,
          date: new Date('2025-03-15').toISOString(),
          type: 'OVERTIME',
          hours: userIndex === 0 ? 4 : 2,
          reason: userIndex === 0 ? 'Emergency system maintenance' : 'System upgrade overtime',
          approved: true,
          approved_by: user.id,
          approved_at: new Date('2025-03-16').toISOString(),
          created_at: new Date('2025-03-16').toISOString(),
          updated_at: new Date('2025-03-16').toISOString()
        },
        // Pending TOIL entries (will show in TOIL pending dashboard)
        {
          user_id: currentUser.id,
          date: new Date('2025-08-20').toISOString(),
          type: 'WEEKEND_TRAVEL',
          hours: 4,
          reason: userIndex === 0 ? 'Weekend client emergency' : 'Client site emergency',
          approved: false,
          created_at: new Date('2025-08-21').toISOString(),
          updated_at: new Date('2025-08-21').toISOString()
        },
        {
          user_id: currentUser.id,
          date: new Date('2025-08-25').toISOString(),
          type: 'OVERTIME',
          hours: userIndex === 0 ? 6 : 3,
          reason: userIndex === 0 ? 'Server migration overtime' : 'End of month reporting',
          approved: false,
          created_at: new Date('2025-08-26').toISOString(),
          updated_at: new Date('2025-08-26').toISOString()
        }
      ];

      const { error: toilError } = await supabaseAdmin
        .from('toil_entries')
        .insert(toilEntries);

      if (toilError) {
        console.error(`  ❌ Error adding TOIL entries for ${currentUser.name}:`, toilError);
        throw toilError;
      }

      totalToilEntries += toilEntries.length;
      console.log(`  ✅ Added ${toilEntries.length} TOIL entries for ${currentUser.name}`);
    }

    // Now calculate and update proper balances for all users
    console.log('\n🔄 Calculating and updating user balances...');

    for (const currentUser of users) {
      // Calculate TOIL balance (approved earnings - used)
      const { data: approvedToil } = await supabaseAdmin
        .from('toil_entries')
        .select('hours')
        .eq('user_id', currentUser.id)
        .eq('approved', true);

      const approvedToilHours = (approvedToil || []).reduce((sum, entry) => sum + (entry.hours || 0), 0);

      const { data: usedToil } = await supabaseAdmin
        .from('leave_requests')
        .select('hours')
        .eq('user_id', currentUser.id)
        .eq('type', 'TOIL')
        .eq('status', 'APPROVED');

      const usedToilHours = (usedToil || []).reduce((sum, entry) => sum + (entry.hours || 0), 0);

      const toilBalance = approvedToilHours - usedToilHours;

      // Calculate annual leave used in 2025
      const { data: annualLeave } = await supabaseAdmin
        .from('leave_requests')
        .select('hours')
        .eq('user_id', currentUser.id)
        .eq('type', 'ANNUAL')
        .eq('status', 'APPROVED')
        .gte('start_date', new Date('2025-01-01').toISOString())
        .lte('start_date', new Date('2025-12-31').toISOString());

      const annualUsedHours = (annualLeave || []).reduce((sum, entry) => sum + (entry.hours || 0), 0);
      const annualUsed = Math.round(annualUsedHours / 8); // Convert hours to days
      const annualRemaining = 32 - annualUsed; // Assuming 32 days entitlement

      // Calculate sick leave used in 2025
      const { data: sickLeave } = await supabaseAdmin
        .from('leave_requests')
        .select('hours')
        .eq('user_id', currentUser.id)
        .eq('type', 'SICK')
        .eq('status', 'APPROVED')
        .gte('start_date', new Date('2025-01-01').toISOString())
        .lte('start_date', new Date('2025-12-31').toISOString());

      const sickUsedHours = (sickLeave || []).reduce((sum, entry) => sum + (entry.hours || 0), 0);
      const sickUsed = Math.round(sickUsedHours / 8); // Convert hours to days
      const sickRemaining = Math.max(0, 3 - sickUsed); // 3 days entitlement

      // Update user balances
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          toil_balance: toilBalance,
          annual_leave_balance: annualRemaining,
          sick_leave_balance: sickRemaining
        })
        .eq('id', currentUser.id);

      if (updateError) {
        console.error(`  ❌ Error updating balances for ${currentUser.name}:`, updateError);
        throw updateError;
      }

      console.log(`  📊 Updated balances for ${currentUser.name}:`);
      console.log(`    • TOIL: ${toilBalance}h`);
      console.log(`    • Annual: ${annualUsed}/${32} used, ${annualRemaining} remaining`);
      console.log(`    • Sick: ${sickUsed}/3 used, ${sickRemaining} remaining`);
    }

    // Generate summary statistics
    const { count: pendingRequestsCount } = await supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    const { count: pendingToilCount } = await supabaseAdmin
      .from('toil_entries')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false);

    console.log('\n🎉 Comprehensive data seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`  • Total leave requests added: ${totalRequests}`);
    console.log(`  • Total TOIL entries added: ${totalToilEntries}`);
    console.log(`  • Pending leave requests: ${pendingRequestsCount || 0}`);
    console.log(`  • Pending TOIL entries: ${pendingToilCount || 0}`);

    return apiSuccess({
      message: 'Comprehensive dummy data added successfully',
      summary: {
        usersProcessed: users.length,
        totalLeaveRequests: totalRequests,
        totalToilEntries: totalToilEntries,
        pendingRequests: pendingRequestsCount || 0,
        pendingToilEntries: pendingToilCount || 0
      },
      users: users.map(u => u.name),
      nextSteps: [
        'Visit /admin/employee-balances to see updated balances',
        'Visit /admin/pending-requests to see pending requests',
        'Visit /admin/toil to see pending TOIL entries',
        'Click "View Details" on any employee to see comprehensive data',
        'Test the "Download Report" functionality'
      ]
    });

  } catch (error) {
    console.error('Comprehensive seed error:', error);
    return apiError('Failed to seed comprehensive data', 500);
  }
}

// Apply comprehensive admin security
export const POST = withCompleteSecurity(
  withAdminAuth(comprehensiveSeedHandler),
  {
    validateInput: false, // Seed operation doesn't need input validation
    skipCSRF: false
  }
);
