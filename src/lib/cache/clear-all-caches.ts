/**
 * Utility to clear all caches - useful for debugging notification issues
 */

import { statsCache, userDataCache, apiCache } from '@/lib/cache/cache-manager';

export function clearAllCaches() {
  console.log('🧹 Clearing all caches...');
  
  // Clear all cache types
  statsCache.clear();
  userDataCache.clear();
  apiCache.clear();
  
  console.log('✅ All caches cleared');
  
  // Also clear browser localStorage if available
  if (typeof window !== 'undefined') {
    try {
      // Clear React Query cache from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('react-query') || key.startsWith('tanstack')) {
          localStorage.removeItem(key);
        }
      });
      console.log('✅ Browser localStorage cleared');
    } catch (error) {
      console.warn('Could not clear localStorage:', error);
    }
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearAllCaches = clearAllCaches;
  console.log('🔧 Debug function available: window.clearAllCaches()');
}
