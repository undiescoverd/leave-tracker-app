// Simple in-memory cache with TTL support
export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of items to store
}

export class CacheManager {
  private cache = new Map<string, CacheItem>();
  private readonly defaultTTL: number;
  private readonly maxSize: number;
  private accessOrder = new Map<string, number>(); // Track access order for LRU

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    // If cache is at max size, remove least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, item);
    this.accessOrder.set(key, Date.now());
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T>;
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // Update access time for LRU
    this.accessOrder.set(key, Date.now());
    return item.data;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove a specific key from the cache
   */
  delete(key: string): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
    };
  }

  /**
   * Clean up expired items
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Evict least recently used item
   */
  protected evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  /**
   * Calculate cache hit rate (simplified)
   */
  private calculateHitRate(): number {
    // This would need more sophisticated tracking in a real implementation
    // For now, just return a placeholder
    return 0;
  }
}

/**
 * Enhanced cache statistics with hit/miss tracking
 */
export interface CacheStats {
  total: number;
  active: number;
  expired: number;
  maxSize: number;
  hitRate: number;
  hits: number;
  misses: number;
  evictions: number;
}

/**
 * Cache warming strategies
 */
export interface CacheWarmingConfig {
  keys: string[];
  loader: (key: string) => Promise<any>;
  interval: number; // in milliseconds
}

// Enhanced CacheManager with statistics tracking
class EnhancedCacheManager extends CacheManager {
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private warmingConfigs: CacheWarmingConfig[] = [];

  /**
   * Get enhanced statistics
   */
  getEnhancedStats(): CacheStats {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [key, item] of (this as any).cache) {
      if (now - item.timestamp > item.ttl) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: (this as any).cache.size,
      active,
      expired,
      maxSize: (this as any).maxSize,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
    };
  }

  /**
   * Enhanced get with statistics tracking
   */
  get<T>(key: string): T | null {
    const item = super.get<T>(key);
    
    if (item === null) {
      this.misses++;
      return null;
    }

    this.hits++;
    return item;
  }

  /**
   * Enhanced eviction with tracking - overridden to add statistics
   */
  protected evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, time] of (this as any).accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      (this as any).cache.delete(oldestKey);
      (this as any).accessOrder.delete(oldestKey);
      this.evictions++;
    }
  }

  /**
   * Get or set with loader function (cache-aside pattern)
   */
  async getOrSet<T>(key: string, loader: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await loader();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Bulk get operation
   */
  getBulk<T>(keys: string[]): Map<string, T | null> {
    const results = new Map<string, T | null>();
    for (const key of keys) {
      results.set(key, this.get<T>(key));
    }
    return results;
  }

  /**
   * Bulk set operation
   */
  setBulk<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.data, entry.ttl);
    }
  }

  /**
   * Add cache warming configuration
   */
  addWarmingConfig(config: CacheWarmingConfig): void {
    this.warmingConfigs.push(config);
  }

  /**
   * Warm cache with predefined data
   */
  async warmCache(): Promise<void> {
    for (const config of this.warmingConfigs) {
      for (const key of config.keys) {
        if (!this.has(key)) {
          try {
            const data = await config.loader(key);
            this.set(key, data);
          } catch (error) {
            console.warn(`Failed to warm cache for key ${key}:`, error);
          }
        }
      }
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
}

// Create global cache instances with enhanced features
export const apiCache = new EnhancedCacheManager({
  ttl: 2 * 60 * 1000, // 2 minutes for API responses
  maxSize: 200, // Increased size for better hit rates
});

export const userDataCache = new EnhancedCacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes for user data
  maxSize: 100, // Increased size for better hit rates
});

export const calendarCache = new EnhancedCacheManager({
  ttl: 1 * 60 * 1000, // 1 minute for calendar data (more frequent updates)
  maxSize: 150, // Increased size for better hit rates
});

export const leaveBalanceCache = new EnhancedCacheManager({
  ttl: 10 * 60 * 1000, // 10 minutes for leave balances (less frequent updates)
  maxSize: 50, // Increased size for better hit rates
});

export const statsCache = new EnhancedCacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes for dashboard stats
  maxSize: 25, // Increased size for better hit rates
});

/**
 * Utility function for cache key generation
 */
export function createCacheKey(prefix: string, ...params: (string | number)[]): string {
  return `${prefix}:${params.join(':')}`;
}

/**
 * Cache invalidation utilities
 */
export const CacheInvalidator = {
  /**
   * Invalidate all user-related caches
   */
  invalidateUser(userId: string): void {
    const userPattern = `user:${userId}`;
    const balancePattern = `balance:${userId}`;
    
    // Clear user-specific caches
    [userDataCache, leaveBalanceCache, apiCache].forEach(cache => {
      const keys = Array.from((cache as any).cache.keys());
      keys.forEach((key) => {
        const keyStr = key as string;
        if (keyStr.includes(userPattern) || keyStr.includes(balancePattern)) {
          cache.delete(keyStr);
        }
      });
    });
  },

  /**
   * Invalidate calendar-related caches
   */
  invalidateCalendar(dateRange?: { start: Date; end: Date }): void {
    if (dateRange) {
      const start = dateRange.start.toISOString().split('T')[0];
      const end = dateRange.end.toISOString().split('T')[0];
      
      const keys = Array.from((calendarCache as any).cache.keys());
      keys.forEach((key) => {
        const keyStr = key as string;
        if (keyStr.includes('team-calendar') && (keyStr.includes(start) || keyStr.includes(end))) {
          calendarCache.delete(keyStr);
        }
      });
    } else {
      // Clear all calendar caches
      calendarCache.clear();
    }
  },

  /**
   * Invalidate stats caches
   */
  invalidateStats(): void {
    statsCache.clear();
  },

  /**
   * Invalidate all caches
   */
  invalidateAll(): void {
    [apiCache, userDataCache, calendarCache, leaveBalanceCache, statsCache].forEach(cache => {
      cache.clear();
    });
  },
};

/**
 * Cache warming utilities
 */
export const CacheWarmer = {
  /**
   * Setup common cache warming strategies
   */
  setupWarmingStrategies(): void {
    // Calendar cache warming - preload current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    calendarCache.addWarmingConfig({
      keys: [createCacheKey('team-calendar', currentYear, currentMonth)],
      loader: async (key) => {
        // This would call the calendar service
        return { events: [], eventsByDate: {} };
      },
      interval: 30 * 60 * 1000, // 30 minutes
    });
  },

  /**
   * Initialize cache warming
   */
  async initialize(): Promise<void> {
    this.setupWarmingStrategies();
    
    // Warm all caches
    await Promise.all([
      calendarCache.warmCache(),
      statsCache.warmCache(),
    ]);
  },
};

// Auto-cleanup expired items every 5 minutes
setInterval(() => {
  [apiCache, userDataCache, calendarCache, leaveBalanceCache, statsCache].forEach(cache => {
    const removed = cache.cleanup();
    if (removed > 0) {
      console.log(`Cleaned up ${removed} expired cache entries`);
    }
  });
}, 5 * 60 * 1000);