import { NextRequest, NextResponse } from 'next/server';

/**
 * Cache header middleware for API responses
 * Provides appropriate cache headers based on endpoint and data type
 */

export interface CacheConfig {
  maxAge?: number; // in seconds
  staleWhileRevalidate?: number; // in seconds
  mustRevalidate?: boolean;
  private?: boolean;
  noStore?: boolean;
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // User data - moderate caching
  '/api/leave/balance': {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 600, // 10 minutes
    private: true,
  },
  
  // Admin data - shorter caching due to frequent changes
  '/api/admin/pending-requests': {
    maxAge: 120, // 2 minutes
    staleWhileRevalidate: 240, // 4 minutes
    private: true,
  },

  '/api/admin/all-requests': {
    maxAge: 120, // 2 minutes
    staleWhileRevalidate: 240, // 4 minutes
    private: true,
  },

  '/api/admin/stats': {
    maxAge: 180, // 3 minutes
    staleWhileRevalidate: 360, // 6 minutes
    private: true,
  },
  
  // Leave requests - moderate caching
  '/api/leave/requests': {
    maxAge: 240, // 4 minutes
    staleWhileRevalidate: 480, // 8 minutes
    private: true,
  },
  
  // Calendar data - short caching for real-time updates
  '/api/calendar': {
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 120, // 2 minutes
    private: true,
  },
  
  // User profile - longer caching
  '/api/users': {
    maxAge: 600, // 10 minutes
    staleWhileRevalidate: 1200, // 20 minutes
    private: true,
  },
  
  // Performance metrics - no caching
  '/api/admin/performance': {
    noStore: true,
  },
  
  // Health checks - short caching
  '/api/health': {
    maxAge: 30, // 30 seconds
    mustRevalidate: true,
  },
};

/**
 * Generate cache headers for a given endpoint
 */
export function generateCacheHeaders(endpoint: string, customConfig?: CacheConfig): Record<string, string> {
  const config = customConfig || CACHE_CONFIGS[endpoint];
  
  if (!config) {
    return {
      'Cache-Control': 'no-store',
    };
  }
  
  if (config.noStore) {
    return {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  }
  
  const cacheDirectives: string[] = [];
  
  // Base cache directive
  if (config.private) {
    cacheDirectives.push('private');
  } else {
    cacheDirectives.push('public');
  }
  
  // Max age
  if (config.maxAge) {
    cacheDirectives.push(`max-age=${config.maxAge}`);
  }
  
  // Stale while revalidate
  if (config.staleWhileRevalidate) {
    cacheDirectives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }
  
  // Must revalidate
  if (config.mustRevalidate) {
    cacheDirectives.push('must-revalidate');
  }
  
  return {
    'Cache-Control': cacheDirectives.join(', '),
    'X-Cache-Strategy': 'optimized',
  };
}

/**
 * Middleware to add cache headers to API responses
 */
export function withCacheHeaders(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  customConfig?: CacheConfig
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const response = await handler(req, context);
    
    // Get endpoint path
    const url = new URL(req.url);
    const endpoint = url.pathname;
    
    // Add cache headers
    const cacheHeaders = generateCacheHeaders(endpoint, customConfig);
    
    // Apply headers to response
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Add performance headers
    response.headers.set('X-Response-Time', Date.now().toString());
    
    return response;
  };
}

/**
 * Utility to invalidate cache for specific endpoints
 */
export function createCacheInvalidationHeaders(endpoints: string[]): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Cache-Invalidation': endpoints.join(','),
  };
}

/**
 * Check if a request should bypass cache
 */
export function shouldBypassCache(req: NextRequest): boolean {
  const url = new URL(req.url);
  
  // Bypass cache for admin actions that modify data
  if (req.method !== 'GET') {
    return true;
  }
  
  // Check for cache-busting query parameters
  if (url.searchParams.has('_t') || url.searchParams.has('nocache')) {
    return true;
  }
  
  // Check for no-cache headers
  const cacheControl = req.headers.get('cache-control');
  if (cacheControl && cacheControl.includes('no-cache')) {
    return true;
  }
  
  return false;
}

/**
 * Generate ETag for response content
 */
export function generateETag(content: string | Buffer): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return `"${hash}"`;
}

/**
 * Check if request has valid ETag
 */
export function isETagValid(req: NextRequest, etag: string): boolean {
  const ifNoneMatch = req.headers.get('if-none-match');
  return ifNoneMatch === etag;
}
