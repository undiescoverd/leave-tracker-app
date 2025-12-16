/**
 * Supabase Query Analytics and Performance Monitoring
 *
 * This module provides query monitoring capabilities for Supabase operations.
 * It tracks query metrics, detects performance issues, and provides analytics.
 */

import { logger } from '@/lib/logger';

interface QueryMetrics {
  table: string;
  operation: string;
  duration: number;
  timestamp: number;
}

class SupabaseQueryMonitor {
  private queries: QueryMetrics[] = [];
  private readonly maxQueries = 100;

  /**
   * Add a query to the monitoring system
   */
  addQuery(metrics: QueryMetrics) {
    this.queries.push(metrics);

    // Keep only the last N queries
    if (this.queries.length > this.maxQueries) {
      this.queries.shift();
    }

    // Log slow queries
    if (metrics.duration > 1000) {
      logger.warn('Slow database query detected', {
        action: 'slow_query',
        resource: 'database',
        metadata: {
          table: metrics.table,
          operation: metrics.operation,
          duration: `${metrics.duration}ms`,
          threshold: 'exceeded',
        }
      });
    }
  }

  /**
   * Get query statistics for the last minute
   */
  getStats() {
    const now = Date.now();
    const recentQueries = this.queries.filter(q => now - q.timestamp < 60000); // Last minute

    const byTable = recentQueries.reduce((acc, query) => {
      if (!acc[query.table]) {
        acc[query.table] = { count: 0, totalDuration: 0 };
      }
      acc[query.table].count++;
      acc[query.table].totalDuration += query.duration;
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number }>);

    return {
      totalQueries: recentQueries.length,
      slowQueries: recentQueries.filter(q => q.duration > 1000).length,
      averageDuration: recentQueries.length > 0
        ? Math.round(recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length)
        : 0,
      byModel: Object.entries(byTable).map(([table, stats]) => ({
        model: table,
        count: stats.count,
        averageDuration: Math.round(stats.totalDuration / stats.count),
      })),
    };
  }

  /**
   * Detect potential N+1 query patterns
   * Looks for the same query executed many times in a short period
   */
  detectNPlusOneQueries(threshold = 10): string[] {
    const now = Date.now();
    const recentQueries = this.queries.filter(q => now - q.timestamp < 5000); // Last 5 seconds

    const queryGroups = recentQueries.reduce((acc, query) => {
      const key = `${query.table}:${query.operation}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(query);
      return acc;
    }, {} as Record<string, QueryMetrics[]>);

    const warnings: string[] = [];

    Object.entries(queryGroups).forEach(([key, queries]) => {
      if (queries.length >= threshold) {
        warnings.push(`Potential N+1 query detected: ${key} executed ${queries.length} times in 5 seconds`);
      }
    });

    return warnings;
  }

  /**
   * Clear all query metrics (useful for testing or resets)
   */
  clear() {
    this.queries = [];
  }
}

// Singleton instance
const queryMonitor = new SupabaseQueryMonitor();

/**
 * Track a Supabase query and measure its performance
 *
 * Usage:
 * const result = await trackQuery('users', 'select', async () => {
 *   return await supabase.from('users').select('*');
 * });
 */
export async function trackQuery<T>(
  table: string,
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - start;

    // Record query metrics
    queryMonitor.addQuery({
      table,
      operation,
      duration,
      timestamp: Date.now(),
    });

    // Log query performance
    logger.performanceMetric(`supabase.${table}.${operation}`, duration, {
      table,
      operation,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    // Log failed queries
    logger.error('Supabase query failed', {
      action: 'db_query_error',
      resource: 'database',
      metadata: {
        table,
        operation,
        duration: `${duration}ms`,
      }
    }, error instanceof Error ? error : new Error(String(error)));

    throw error;
  }
}

/**
 * Get query monitoring statistics (used by performance route)
 */
export const getQueryStats = () => queryMonitor.getStats();

/**
 * Detect potential N+1 queries (used by performance route)
 */
export const detectNPlusOneQueries = (threshold?: number) => queryMonitor.detectNPlusOneQueries(threshold);

/**
 * Clear all query metrics
 */
export const clearQueryMetrics = () => queryMonitor.clear();

/**
 * Manual query tracking for specific operations
 * Use this when you want to track a query without using the trackQuery wrapper
 */
export const recordQuery = (table: string, operation: string, duration: number) => {
  queryMonitor.addQuery({
    table,
    operation,
    duration,
    timestamp: Date.now(),
  });
};
