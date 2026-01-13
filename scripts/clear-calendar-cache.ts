/**
 * Script to clear calendar cache
 * Run this after updating the date key format to ensure consistency
 */

import { calendarCache } from '@/lib/cache/cache-manager';

console.log('Clearing calendar cache...');
calendarCache.clear();
console.log('Calendar cache cleared successfully!');
