import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api/response';
import { withAdminAuth } from '@/lib/middleware/auth.supabase';
import { withCompleteSecurity } from '@/lib/middleware/security';
import { AuthorizationError } from '@/lib/api/errors';
import { withErrorHandler, composeMiddleware, withPerformanceMonitoring } from '@/middleware/error-handler';
import { 
  apiCache, 
  userDataCache, 
  calendarCache, 
  leaveBalanceCache, 
  statsCache 
} from '@/lib/cache/cache-manager';
import { getQueryStats, detectNPlusOneQueries } from '@/lib/supabase-analytics';
import { logger } from '@/lib/logger';

async function getPerformanceMetrics(req: NextRequest, context: { user: { id: string; email: string; name: string; role: string } }) {
  const user = context.user;

  const { searchParams } = new URL(req.url);
  const includeDetails = searchParams.get('details') === 'true';

  // Cache statistics
  const cacheStats = {
    apiCache: apiCache.getEnhancedStats(),
    userDataCache: userDataCache.getEnhancedStats(),
    calendarCache: calendarCache.getEnhancedStats(),
    leaveBalanceCache: leaveBalanceCache.getEnhancedStats(),
    statsCache: statsCache.getEnhancedStats(),
  };

  // Calculate overall cache performance
  const totalCacheRequests = Object.values(cacheStats).reduce((sum, stats) => sum + stats.hits + stats.misses, 0);
  const totalCacheHits = Object.values(cacheStats).reduce((sum, stats) => sum + stats.hits, 0);
  const overallHitRate = totalCacheRequests > 0 ? totalCacheHits / totalCacheRequests : 0;

  // Database performance metrics
  const dbStats = getQueryStats();
  const nPlusOneWarnings = detectNPlusOneQueries(5);

  // System performance metrics
  const memoryUsage = process.memoryUsage();
  const systemStats = {
    uptime: process.uptime(),
    nodeVersion: process.version,
    memoryUsage: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
    },
  };

  // Performance insights and recommendations
  const insights: Array<{
    type: 'warning' | 'info' | 'error';
    category: 'cache' | 'database' | 'system';
    message: string;
    metric?: string;
  }> = [];

  // Cache insights
  if (overallHitRate < 0.7) {
    insights.push({
      type: 'warning',
      category: 'cache',
      message: `Overall cache hit rate is ${(overallHitRate * 100).toFixed(1)}%. Consider increasing cache TTL or reviewing caching strategy.`,
      metric: 'hit_rate',
    });
  }

  Object.entries(cacheStats).forEach(([cacheName, stats]) => {
    if (stats.evictions > stats.total * 0.5) {
      insights.push({
        type: 'warning',
        category: 'cache',
        message: `${cacheName} has high eviction rate (${stats.evictions}). Consider increasing cache size.`,
        metric: 'evictions',
      });
    }
  });

  // Database insights
  if (dbStats.averageDuration > 500) {
    insights.push({
      type: 'warning',
      category: 'database',
      message: `Average query duration is ${dbStats.averageDuration}ms. Consider query optimization.`,
      metric: 'query_duration',
    });
  }

  if (dbStats.slowQueries > 0) {
    insights.push({
      type: 'error',
      category: 'database',
      message: `${dbStats.slowQueries} slow queries detected in the last minute. Review query performance.`,
      metric: 'slow_queries',
    });
  }

  nPlusOneWarnings.forEach(warning => {
    insights.push({
      type: 'error',
      category: 'database',
      message: warning,
      metric: 'n_plus_one',
    });
  });

  // System insights
  if (systemStats.memoryUsage.heapUsed > 500) {
    insights.push({
      type: 'warning',
      category: 'system',
      message: `High memory usage detected: ${systemStats.memoryUsage.heapUsed}MB heap used.`,
      metric: 'memory_usage',
    });
  }

  const responseData = {
    summary: {
      overallStatus: insights.some(i => i.type === 'error') ? 'needs_attention' : 
                    insights.some(i => i.type === 'warning') ? 'good_with_warnings' : 'excellent',
      totalInsights: insights.length,
      criticalIssues: insights.filter(i => i.type === 'error').length,
      warnings: insights.filter(i => i.type === 'warning').length,
    },
    cache: {
      overallHitRate: Math.round(overallHitRate * 100),
      totalRequests: totalCacheRequests,
      totalHits: totalCacheHits,
      stats: cacheStats,
    },
    database: dbStats,
    system: systemStats,
    insights: insights.slice(0, includeDetails ? undefined : 10), // Limit insights unless details requested
    metadata: {
      generatedAt: new Date().toISOString(),
      requestedBy: user.id,
      includesDetails: includeDetails,
    },
  };

  // Log performance review
  logger.info('Performance metrics reviewed', {
    action: 'performance_review',
    resource: 'admin',
    metadata: {
      overallStatus: responseData.summary.overallStatus,
      criticalIssues: responseData.summary.criticalIssues,
      cacheHitRate: responseData.cache.overallHitRate,
      avgQueryTime: dbStats.averageDuration,
      memoryUsageMB: systemStats.memoryUsage.heapUsed,
    },
  });

  return apiSuccess(responseData);
}

// Cache management endpoints
async function resetCacheStats(req: NextRequest, context: { user: { id: string; email: string; name: string; role: string } }) {
  const user = context.user;

  // Reset cache statistics
  [apiCache, userDataCache, calendarCache, leaveBalanceCache, statsCache].forEach(cache => {
    cache.resetStats();
  });

  logger.info('Cache statistics reset', {
    action: 'cache_stats_reset',
    resource: 'admin',
    metadata: {
      resetBy: user.id,
    },
  });

  return apiSuccess({ message: 'Cache statistics reset successfully' });
}

async function clearCaches(req: NextRequest, context: { user: { id: string; email: string; name: string; role: string } }) {
  const user = context.user;

  const { searchParams } = new URL(req.url);
  const cacheType = searchParams.get('type'); // 'all', 'api', 'user', 'calendar', etc.

  let clearedCaches: string[] = [];

  if (!cacheType || cacheType === 'all') {
    [apiCache, userDataCache, calendarCache, leaveBalanceCache, statsCache].forEach(cache => {
      cache.clear();
    });
    clearedCaches = ['api', 'userData', 'calendar', 'leaveBalance', 'stats'];
  } else {
    switch (cacheType) {
      case 'api':
        apiCache.clear();
        clearedCaches = ['api'];
        break;
      case 'user':
        userDataCache.clear();
        clearedCaches = ['userData'];
        break;
      case 'calendar':
        calendarCache.clear();
        clearedCaches = ['calendar'];
        break;
      case 'balance':
        leaveBalanceCache.clear();
        clearedCaches = ['leaveBalance'];
        break;
      case 'stats':
        statsCache.clear();
        clearedCaches = ['stats'];
        break;
      default:
        throw new Error(`Invalid cache type: ${cacheType}`);
    }
  }

  logger.info('Caches cleared', {
    action: 'cache_clear',
    resource: 'admin',
    metadata: {
      clearedCaches,
      clearedBy: user.id,
    },
  });

  return apiSuccess({ 
    message: `Successfully cleared ${clearedCaches.join(', ')} cache(s)`,
    clearedCaches 
  });
}

// Route handlers with different HTTP methods
export const GET = withCompleteSecurity(
  withAdminAuth(getPerformanceMetrics),
  { validateInput: false, skipCSRF: true }
);

export const POST = withCompleteSecurity(
  withAdminAuth((req: NextRequest, context: { user: { id: string; email: string; name: string; role: string } }) => {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'reset-stats':
        return resetCacheStats(req, context);
      case 'clear-cache':
        return clearCaches(req, context);
      default:
        throw new Error(`Invalid action: ${action}`);
    }
  }),
  { validateInput: false, skipCSRF: false }
);