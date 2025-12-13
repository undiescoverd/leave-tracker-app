import { SupabaseClient } from '@supabase/supabase-js';
import { handleSupabaseError } from './supabase';

/**
 * Helper functions for common Supabase query patterns
 * These utilities help maintain consistency and type safety across the application
 */

/**
 * Generic find by ID helper
 * Replaces Prisma's findUnique pattern
 *
 * @example
 * const user = await findById(supabase, 'users', userId);
 */
export async function findById<T>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  select: string = '*'
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found error
      return null;
    }
    throw handleSupabaseError(error);
  }

  return data as T;
}

/**
 * Generic find one helper with custom filter
 * Replaces Prisma's findFirst/findUnique patterns
 *
 * @example
 * const user = await findOne(supabase, 'users', 'email', 'user@example.com');
 */
export async function findOne<T>(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: any,
  select: string = '*'
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq(column, value)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found error
      return null;
    }
    throw handleSupabaseError(error);
  }

  return data as T;
}

/**
 * Generic find many helper
 * Replaces Prisma's findMany pattern
 *
 * @example
 * const requests = await findMany(supabase, 'leave_requests', { status: 'PENDING' });
 */
export async function findMany<T>(
  supabase: SupabaseClient,
  table: string,
  filters?: Record<string, any>,
  select: string = '*',
  orderBy?: { column: string; ascending?: boolean }
): Promise<T[]> {
  let query = supabase.from(table).select(select);

  // Apply filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  // Apply ordering
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  }

  const { data, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  return (data as T[]) || [];
}

/**
 * Generic create helper
 * Replaces Prisma's create pattern
 *
 * @example
 * const newUser = await createRecord(supabase, 'users', { email: 'new@example.com', name: 'New User' });
 */
export async function createRecord<T>(
  supabase: SupabaseClient,
  table: string,
  data: Partial<T>
): Promise<T> {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data as any)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  return result as T;
}

/**
 * Generic update helper
 * Replaces Prisma's update pattern
 *
 * @example
 * const updatedUser = await updateRecord(supabase, 'users', userId, { name: 'Updated Name' });
 */
export async function updateRecord<T>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  data: Partial<T>
): Promise<T> {
  const { data: result, error } = await supabase
    .from(table)
    .update(data as any)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  return result as T;
}

/**
 * Generic delete helper
 * Replaces Prisma's delete pattern
 *
 * @example
 * await deleteRecord(supabase, 'users', userId);
 */
export async function deleteRecord(
  supabase: SupabaseClient,
  table: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (error) {
    throw handleSupabaseError(error);
  }
}

/**
 * Generic count helper
 * Replaces Prisma's count pattern
 *
 * @example
 * const count = await countRecords(supabase, 'leave_requests', { status: 'PENDING' });
 */
export async function countRecords(
  supabase: SupabaseClient,
  table: string,
  filters?: Record<string, any>
): Promise<number> {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });

  // Apply filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  const { count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  return count || 0;
}

/**
 * Date range query helper
 * Useful for leave request queries
 *
 * @example
 * const requests = await findByDateRange(
 *   supabase,
 *   'leave_requests',
 *   'start_date',
 *   'end_date',
 *   new Date('2024-01-01'),
 *   new Date('2024-12-31')
 * );
 */
export async function findByDateRange<T>(
  supabase: SupabaseClient,
  table: string,
  startDateColumn: string,
  endDateColumn: string,
  rangeStart: Date,
  rangeEnd: Date,
  select: string = '*',
  additionalFilters?: Record<string, any>
): Promise<T[]> {
  let query = supabase
    .from(table)
    .select(select)
    .lte(startDateColumn, rangeEnd.toISOString())
    .gte(endDateColumn, rangeStart.toISOString());

  // Apply additional filters
  if (additionalFilters) {
    Object.entries(additionalFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  const { data, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  return (data as T[]) || [];
}

/**
 * Batch create helper
 * Replaces Prisma's createMany pattern
 *
 * @example
 * const newRecords = await createMany(supabase, 'leave_requests', [
 *   { user_id: '1', start_date: '2024-01-01', end_date: '2024-01-05' },
 *   { user_id: '2', start_date: '2024-02-01', end_date: '2024-02-05' }
 * ]);
 */
export async function createMany<T>(
  supabase: SupabaseClient,
  table: string,
  records: Partial<T>[]
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .insert(records as any[])
    .select();

  if (error) {
    throw handleSupabaseError(error);
  }

  return (data as T[]) || [];
}

/**
 * Batch update helper
 * For updating multiple records with same values
 *
 * @example
 * await updateMany(supabase, 'leave_requests', { status: 'CANCELLED' }, { user_id: userId });
 */
export async function updateMany(
  supabase: SupabaseClient,
  table: string,
  data: Record<string, any>,
  filters: Record<string, any>
): Promise<void> {
  let query = supabase.from(table).update(data);

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  });

  const { error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }
}

/**
 * Transaction helper using Supabase RPC
 * For complex operations that need atomicity
 *
 * Note: This requires creating PostgreSQL functions in Supabase
 * See migration plan for details on creating these functions
 *
 * @example
 * await executeRPC(supabase, 'approve_leave_request', { request_id: requestId });
 */
export async function executeRPC<T>(
  supabase: SupabaseClient,
  functionName: string,
  params?: Record<string, any>
): Promise<T> {
  const { data, error } = await supabase.rpc(functionName, params);

  if (error) {
    throw handleSupabaseError(error);
  }

  return data as T;
}

/**
 * Aggregate query helper
 * For SUM, AVG, COUNT operations
 *
 * @example
 * const totalHours = await aggregate(supabase, 'toil_entries', 'hours', 'sum', { user_id: userId });
 */
export async function aggregate(
  supabase: SupabaseClient,
  table: string,
  column: string,
  operation: 'sum' | 'avg' | 'count' | 'min' | 'max',
  filters?: Record<string, any>
): Promise<number> {
  // Note: Supabase doesn't have built-in aggregation in JS client
  // This would need to be implemented using PostgreSQL functions
  // For now, we'll fetch all records and calculate in JS
  const records = await findMany(supabase, table, filters, column);

  if (records.length === 0) return 0;

  const values = records.map((r: any) => Number(r[column]) || 0);

  switch (operation) {
    case 'sum':
      return values.reduce((sum, val) => sum + val, 0);
    case 'avg':
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return 0;
  }
}
