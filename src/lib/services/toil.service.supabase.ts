import { supabaseAdmin } from '@/lib/supabase';
import { findById, findOne, createRecord, updateRecord } from '@/lib/supabase-helpers';

/**
 * ToilType enum matching database
 */
export type ToilType = 'TRAVEL_LATE_RETURN' | 'WEEKEND_TRAVEL' | 'AGENT_PANEL_DAY' | 'OVERTIME';

/**
 * Contract-based TOIL calculation rules
 */
// const TOIL_RULES = {
//   TRAVEL_LATE_RETURN: {
//     '19:00': 1,  // 7pm = 1 hour
//     '20:00': 2,  // 8pm = 2 hours
//     '21:00': 3,  // 9pm = 3 hours
//     '22:00': 'next_day_1pm' // 10pm+ = 1pm start
//   },
//   WEEKEND_TRAVEL: 4, // Fixed 4 hours
//   AGENT_PANEL_DAY: 'next_day_1pm',
//   OVERTIME: 1 // 1:1 ratio for general overtime
// };

interface ToilEntry {
  id?: string;
  user_id: string;
  date: string;
  type: ToilType;
  hours: number;
  reason: string;
  approved: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  adjustment_reason?: string | null;
  previous_balance?: number | null;
  new_balance?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  toil_balance: number;
}

/**
 * Create a TOIL entry for an employee
 */
export async function createToilEntry(
  userId: string,
  data: {
    date: Date;
    type: ToilType;
    hours: number;
    reason: string;
  }
) {
  // Validate user exists and get their current balance
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  // Create TOIL entry (pending approval)
  const { data: toilEntry, error: createError } = await supabaseAdmin
    .from('toil_entries')
    .insert({
      user_id: userId,
      date: data.date.toISOString(),
      type: data.type,
      hours: data.hours,
      reason: data.reason,
      approved: false,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create TOIL entry: ${createError.message}`);
  }

  return toilEntry;
}

/**
 * Approve a TOIL entry and update balance
 * Note: Supabase doesn't have explicit transactions in JS client
 * We use sequential operations with error handling and rollback logic
 */
export async function approveToilEntry(
  toilEntryId: string,
  approvedBy: string
) {
  // Get the TOIL entry
  const { data: entry, error: entryError } = await supabaseAdmin
    .from('toil_entries')
    .select('*')
    .eq('id', toilEntryId)
    .single();

  if (entryError || !entry) {
    throw new Error('TOIL entry not found');
  }

  if (entry.approved) {
    throw new Error('TOIL entry already approved');
  }

  // Get current user balance for audit trail
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('toil_balance')
    .eq('id', entry.user_id)
    .single();

  if (userError || !user) {
    throw new Error('User not found');
  }

  const previousBalance = user.toil_balance;
  const newBalance = previousBalance + entry.hours;

  try {
    // Update entry as approved
    const { error: updateEntryError } = await supabaseAdmin
      .from('toil_entries')
      .update({
        approved: true,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        previous_balance: previousBalance,
        new_balance: newBalance,
      })
      .eq('id', toilEntryId);

    if (updateEntryError) {
      throw new Error(`Failed to update TOIL entry: ${updateEntryError.message}`);
    }

    // Update user's TOIL balance
    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({
        toil_balance: newBalance,
      })
      .eq('id', entry.user_id);

    if (updateUserError) {
      // Rollback: revert the TOIL entry update
      await supabaseAdmin
        .from('toil_entries')
        .update({
          approved: false,
          approved_by: null,
          approved_at: null,
          previous_balance: null,
          new_balance: null,
        })
        .eq('id', toilEntryId);

      throw new Error(`Failed to update user balance: ${updateUserError.message}`);
    }

    return entry;
  } catch (error) {
    // Error handling and rollback logic
    console.error('Error approving TOIL entry:', error);
    throw error;
  }
}

/**
 * Reject a TOIL entry
 */
export async function rejectToilEntry(
  toilEntryId: string,
  rejectedBy: string,
  reason?: string
) {
  const { data: entry, error: findError } = await supabaseAdmin
    .from('toil_entries')
    .select('*')
    .eq('id', toilEntryId)
    .single();

  if (findError || !entry) {
    throw new Error('TOIL entry not found');
  }

  if (entry.approved) {
    throw new Error('TOIL entry already approved');
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('toil_entries')
    .update({
      approved: false,
      approved_by: rejectedBy,
      approved_at: new Date().toISOString(),
      adjustment_reason: reason || 'Rejected by admin',
    })
    .eq('id', toilEntryId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to reject TOIL entry: ${updateError.message}`);
  }

  return updated;
}

/**
 * Calculate TOIL hours based on contract rules
 */
export function calculateToilHours(
  type: ToilType,
  returnTime?: string // Format: "HH:MM"
): number | string {
  switch (type) {
    case 'WEEKEND_TRAVEL':
      return 4;

    case 'TRAVEL_LATE_RETURN':
      if (!returnTime) throw new Error('Return time required for late travel');
      const hour = parseInt(returnTime.split(':')[0]);

      if (hour >= 22) return 'next_day_1pm';
      if (hour >= 21) return 3;
      if (hour >= 20) return 2;
      if (hour >= 19) return 1;
      return 0;

    case 'AGENT_PANEL_DAY':
      return 'next_day_1pm';

    case 'OVERTIME':
    default:
      return 1; // Default 1:1 ratio
  }
}

/**
 * Get TOIL entries for a user or all users (admin)
 */
export async function getToilEntries(userId?: string, includeUser = true) {
  let query = supabaseAdmin
    .from('toil_entries')
    .select(
      includeUser
        ? `
      *,
      user:users!toil_entries_user_id_fkey (
        name,
        email
      )
    `
        : '*'
    )
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch TOIL entries: ${error.message}`);
  }

  return data || [];
}

/**
 * Get pending TOIL entries (for admin approval)
 */
export async function getPendingToilEntries() {
  const { data, error } = await supabaseAdmin
    .from('toil_entries')
    .select(`
      *,
      user:users!toil_entries_user_id_fkey (
        name,
        email
      )
    `)
    .eq('approved', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending TOIL entries: ${error.message}`);
  }

  return data || [];
}

/**
 * Get TOIL balance for a user
 */
export async function getUserToilBalance(userId: string) {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('toil_balance')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  return user.toil_balance ?? 0;
}
