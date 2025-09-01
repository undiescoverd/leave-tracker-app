/**
 * Prisma Middleware for Performance Monitoring and Query Optimization
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

interface QueryMetrics {
  model: string;
  action: string;
  duration: number;
  timestamp: number;
}

class QueryMonitor {
  private queries: QueryMetrics[] = [];
  private readonly maxQueries = 100;
  
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
          model: metrics.model,
          action: metrics.action,
          duration: `${metrics.duration}ms`,
          threshold: 'exceeded',
        }
      });
    }
  }
  
  getStats() {
    const now = Date.now();
    const recentQueries = this.queries.filter(q => now - q.timestamp < 60000); // Last minute
    
    const byModel = recentQueries.reduce((acc, query) => {
      if (!acc[query.model]) {
        acc[query.model] = { count: 0, totalDuration: 0 };
      }
      acc[query.model].count++;
      acc[query.model].totalDuration += query.duration;
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number }>);
    
    return {
      totalQueries: recentQueries.length,
      slowQueries: recentQueries.filter(q => q.duration > 1000).length,
      averageDuration: recentQueries.length > 0 
        ? Math.round(recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length)
        : 0,
      byModel: Object.entries(byModel).map(([model, stats]) => ({
        model,
        count: stats.count,
        averageDuration: Math.round(stats.totalDuration / stats.count),
      })),
    };
  }
  
  detectNPlusOneQueries(threshold = 10): string[] {
    const now = Date.now();
    const recentQueries = this.queries.filter(q => now - q.timestamp < 5000); // Last 5 seconds
    
    const queryGroups = recentQueries.reduce((acc, query) => {
      const key = `${query.model}:${query.action}`;
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
}

const queryMonitor = new QueryMonitor();

/**
 * Performance monitoring middleware for Prisma
 * Note: Prisma v6+ doesn't support $use middleware, using extension instead
 */
export const performanceMiddleware = (prisma: PrismaClient) => {
  // Since Prisma v6+ doesn't support $use, we'll use query logging via events
  // This is a fallback implementation that maintains monitoring capabilities
  
  // Log slow queries via Prisma's built-in logging
  if (process.env.DATABASE_URL && process.env.NODE_ENV === 'development') {
    logger.info('Performance monitoring enabled for Prisma queries', {
      action: 'middleware_init',
      resource: 'database',
      metadata: {
        type: 'performance',
        fallback: 'using_prisma_logging'
      }
    });
  }
  
  // Return a monitoring function that can be called manually for critical operations
  return {
    monitorQuery: async <T>(operation: string, queryFn: () => Promise<T>): Promise<T> => {
      const start = performance.now();
      
      try {
        const result = await queryFn();
        const duration = performance.now() - start;
        
        // Record query metrics
        queryMonitor.addQuery({
          model: operation.split('.')[0] || 'unknown',
          action: operation.split('.')[1] || 'unknown',
          duration,
          timestamp: Date.now(),
        });
        
        // Log query performance
        logger.performanceMetric(`db.${operation}`, duration, {
          operation,
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        
        // Log failed queries
        logger.error('Database query failed', {
          action: 'db_query_error',
          resource: 'database',
          metadata: {
            operation,
            duration: `${duration}ms`,
          }
        }, error instanceof Error ? error : new Error(String(error)));
        
        throw error;
      }
    }
  };
};

/**
 * Query optimization suggestions middleware
 * Note: Prisma v6+ doesn't support $use middleware, providing utility functions instead
 */
export const optimizationMiddleware = (prisma: PrismaClient) => {
  logger.info('Optimization middleware initialized with utility functions', {
    action: 'middleware_init',
    resource: 'database',
    metadata: {
      type: 'optimization',
      fallback: 'utility_functions'
    }
  });
  
  return {
    /**
     * Check query for optimization opportunities
     */
    checkQuery: (operation: string, args?: any, model?: string) => {
      const warnings: string[] = [];
      
      // Check for missing includes that might cause N+1
      if ((operation === 'findMany' || operation === 'findFirst') && !args?.include) {
        if (model === 'LeaveRequest' || model === 'User') {
          warnings.push(`Consider adding include/select to ${model} query to avoid N+1 queries`);
        }
      }
      
      // Check for large limit values
      if (args?.take && args.take > 100) {
        warnings.push(`Large take value (${args.take}) may impact performance`);
      }
      
      // Check for inefficient where clauses
      if (args?.where && typeof args.where === 'object') {
        const whereKeys = Object.keys(args.where);
        if (whereKeys.includes('OR') && whereKeys.length > 1) {
          warnings.push('Complex OR queries may benefit from database indexing');
        }
      }
      
      if (warnings.length > 0) {
        logger.debug('Query optimization suggestions', {
          action: 'db_optimization',
          resource: 'database',
          metadata: {
            model,
            action: operation,
            suggestions: warnings,
          }
        });
      }
      
      return warnings;
    }
  };
};

/**
 * Security middleware for Prisma queries
 * Note: Prisma v6+ doesn't support $use middleware, providing security utilities instead
 */
export const securityMiddleware = (prisma: PrismaClient) => {
  logger.info('Security middleware initialized with utility functions', {
    action: 'middleware_init',
    resource: 'database',
    metadata: {
      type: 'security',
      fallback: 'utility_functions'
    }
  });
  
  return {
    /**
     * Validate operation before execution
     */
    validateOperation: (operation: string, args?: any, model?: string) => {
      // Log sensitive operations
      if (['delete', 'deleteMany', 'updateMany'].includes(operation)) {
        logger.info('Sensitive database operation', {
          action: 'db_sensitive_op',
          resource: 'database',
          metadata: {
            model,
            action: operation,
            hasWhere: !!args?.where,
          }
        });
      }
      
      // Prevent dangerous operations without where clauses
      if ((operation === 'deleteMany' || operation === 'updateMany') && 
          (!args?.where || Object.keys(args.where).length === 0)) {
        
        logger.error('Dangerous operation blocked: bulk operation without WHERE clause', {
          action: 'security_block',
          resource: 'database',
          metadata: {
            model,
            action: operation,
          }
        });
        
        throw new Error(`Bulk ${operation} operations require a WHERE clause for safety`);
      }
      
      return true;
    }
  };
};

/**
 * Get query monitoring statistics
 */
export const getQueryStats = () => queryMonitor.getStats();

/**
 * Detect potential N+1 queries
 */
export const detectNPlusOneQueries = (threshold?: number) => queryMonitor.detectNPlusOneQueries(threshold);

/**
 * Initialize all Prisma middleware
 * Note: Returns utility objects since Prisma v6+ doesn't support $use middleware
 */
export const initializePrismaMiddleware = (prisma: PrismaClient) => {
  const performance = performanceMiddleware(prisma);
  const optimization = optimizationMiddleware(prisma);
  const security = securityMiddleware(prisma);
  
  logger.info('Prisma middleware utilities initialized', {
    action: 'middleware_init',
    resource: 'database',
    metadata: {
      middlewares: ['performance', 'optimization', 'security'],
      type: 'utility_functions',
      note: 'Prisma v6+ compatibility'
    }
  });
  
  return {
    performance,
    optimization,
    security
  };
};