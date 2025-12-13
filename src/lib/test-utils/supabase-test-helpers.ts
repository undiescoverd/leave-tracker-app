/**
 * Supabase Test Utilities
 * Helpers for testing with Supabase in development and test environments
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const testSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const testSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!testSupabaseUrl || !testSupabaseKey) {
  throw new Error('Test Supabase credentials not configured');
}

export const testSupabase = createClient(testSupabaseUrl, testSupabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Create a test user with specified role
 */
export async function createTestUser(data: {
  email: string;
  name: string;
  password?: string;
  role?: 'USER' | 'ADMIN';
  annualLeaveBalance?: number;
  toilBalance?: number;
  sickLeaveBalance?: number;
}) {
  const {
    email,
    name,
    password = 'TestPassword123!',
    role = 'USER',
    annualLeaveBalance = 32,
    toilBalance = 0,
    sickLeaveBalance = 3,
  } = data;

  const hashedPassword = await bcrypt.hash(password, 10);

  const { data: user, error } = await testSupabase
    .from('users')
    .insert({
      email,
      name,
      password: hashedPassword,
      role,
      annual_leave_balance: annualLeaveBalance,
      toil_balance: toilBalance,
      sick_leave_balance: sickLeaveBalance,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return user;
}

/**
 * Create a test leave request
 */
export async function createTestLeaveRequest(data: {
  userId: string;
  startDate: Date;
  endDate: Date;
  type?: 'ANNUAL' | 'SICK' | 'TOIL';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason?: string;
  approvedBy?: string;
}) {
  const {
    userId,
    startDate,
    endDate,
    type = 'ANNUAL',
    status = 'PENDING',
    reason = 'Test leave request',
    approvedBy,
  } = data;

  const { data: leaveRequest, error } = await testSupabase
    .from('leave_requests')
    .insert({
      user_id: userId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      type,
      status,
      comments: reason,
      approved_by: approvedBy,
      approved_at: approvedBy ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test leave request: ${error.message}`);
  }

  return leaveRequest;
}

/**
 * Create a test TOIL entry
 */
export async function createTestToilEntry(data: {
  userId: string;
  date: Date;
  hours: number;
  approved?: boolean;
  approvedBy?: string;
  reason?: string;
  type?: 'TRAVEL_LATE_RETURN' | 'WEEKEND_TRAVEL' | 'AGENT_PANEL_DAY' | 'OVERTIME';
}) {
  const {
    userId,
    date,
    hours,
    approved = false,
    approvedBy,
    reason = 'Test TOIL entry',
    type = 'OVERTIME',
  } = data;

  const { data: toilEntry, error } = await testSupabase
    .from('toil_entries')
    .insert({
      user_id: userId,
      date: date.toISOString(),
      hours,
      type,
      approved,
      approved_by: approvedBy,
      reason,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test TOIL entry: ${error.message}`);
  }

  return toilEntry;
}

/**
 * Clean up test data for a specific user
 */
export async function cleanupTestUser(userId: string) {
  // Delete in order: leave_requests, toil_entries, then user
  await testSupabase.from('leave_requests').delete().eq('user_id', userId);
  await testSupabase.from('toil_entries').delete().eq('user_id', userId);
  await testSupabase.from('users').delete().eq('id', userId);
}

/**
 * Clean up all test data (use with caution!)
 */
export async function cleanupAllTestData() {
  // Delete all test users (those with email containing 'test')
  const { data: testUsers } = await testSupabase
    .from('users')
    .select('id')
    .ilike('email', '%test%');

  if (testUsers) {
    for (const user of testUsers) {
      await cleanupTestUser(user.id);
    }
  }
}

/**
 * Get user by email
 */
export async function getTestUserByEmail(email: string) {
  const { data: user, error } = await testSupabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get test user: ${error.message}`);
  }

  return user;
}

/**
 * Update user balance
 */
export async function updateTestUserBalance(
  userId: string,
  balances: {
    annualLeave?: number;
    toil?: number;
    sickLeave?: number;
  }
) {
  const updates: any = {};
  if (balances.annualLeave !== undefined) updates.annual_leave_balance = balances.annualLeave;
  if (balances.toil !== undefined) updates.toil_balance = balances.toil;
  if (balances.sickLeave !== undefined) updates.sick_leave_balance = balances.sickLeave;

  const { data, error } = await testSupabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update test user balance: ${error.message}`);
  }

  return data;
}

/**
 * Get all leave requests for a user
 */
export async function getTestUserLeaveRequests(userId: string) {
  const { data, error } = await testSupabase
    .from('leave_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get test user leave requests: ${error.message}`);
  }

  return data || [];
}

/**
 * Approve a leave request
 */
export async function approveTestLeaveRequest(requestId: string, approvedBy: string) {
  const { data, error } = await testSupabase
    .from('leave_requests')
    .update({
      status: 'APPROVED',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to approve test leave request: ${error.message}`);
  }

  return data;
}

/**
 * Reject a leave request
 */
export async function rejectTestLeaveRequest(requestId: string, rejectedBy: string, reason?: string) {
  const { data, error } = await testSupabase
    .from('leave_requests')
    .update({
      status: 'REJECTED',
      approved_by: rejectedBy, // Using same field for simplicity
      approved_at: new Date().toISOString(),
      comments: reason,
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to reject test leave request: ${error.message}`);
  }

  return data;
}

/**
 * Create a complete test scenario with user, leave requests, and TOIL
 */
export async function createTestScenario() {
  // Create test user
  const user = await createTestUser({
    email: 'test.user@example.com',
    name: 'Test User',
    password: 'TestPassword123!',
  });

  // Create pending leave request
  const pendingRequest = await createTestLeaveRequest({
    userId: user.id,
    startDate: new Date('2025-09-15'),
    endDate: new Date('2025-09-20'),
    type: 'ANNUAL',
    status: 'PENDING',
  });

  // Create approved leave request
  const approvedRequest = await createTestLeaveRequest({
    userId: user.id,
    startDate: new Date('2025-10-01'),
    endDate: new Date('2025-10-05'),
    type: 'ANNUAL',
    status: 'APPROVED',
    approvedBy: 'Admin',
  });

  // Create TOIL entry
  const toilEntry = await createTestToilEntry({
    userId: user.id,
    date: new Date('2025-08-15'),
    hours: 4,
    approved: true,
    approvedBy: 'Admin',
  });

  return {
    user,
    pendingRequest,
    approvedRequest,
    toilEntry,
    cleanup: () => cleanupTestUser(user.id),
  };
}

/**
 * Wait for realtime update (for testing realtime features)
 */
export function waitForRealtimeUpdate(timeoutMs: number = 5000): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, timeoutMs);
  });
}
