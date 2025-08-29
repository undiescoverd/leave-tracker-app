import { userDataCache, calendarCache, apiCache } from './cache-manager';

export class CacheInvalidationService {
  /**
   * Invalidate user-specific leave data
   */
  static invalidateUserLeaveData(userId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();
    
    // Clear specific user balance cache
    const balanceKey = `leave-balance:${userId}:${currentYear}`;
    userDataCache.delete(balanceKey);
    
    // Clear user's leave requests cache
    // Note: This would need to match patterns used in the API
    const patterns = ['leave-requests-', 'user-requests-'];
    
    // Since we can't easily match patterns in our simple cache,
    // we'll clear all user data cache when leave data changes
    userDataCache.clear();
  }

  /**
   * Invalidate calendar data when leave requests change
   */
  static invalidateCalendarData(startDate?: Date, endDate?: Date) {
    if (startDate && endDate) {
      // Invalidate specific months affected by the date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      while (start <= end) {
        const year = start.getFullYear();
        const month = start.getMonth();
        const calendarKey = `team-calendar:${year}:${month}`;
        calendarCache.delete(calendarKey);
        
        // Move to next month
        start.setMonth(start.getMonth() + 1);
      }
    } else {
      // Clear all calendar cache if no specific dates provided
      calendarCache.clear();
    }
  }

  /**
   * Invalidate all leave-related caches
   */
  static invalidateAllLeaveData() {
    userDataCache.clear();
    calendarCache.clear();
    
    // Clear leave-related API cache entries
    // In a more sophisticated implementation, we'd have pattern matching
    apiCache.clear();
  }

  /**
   * Invalidate caches when a leave request is created/updated/deleted
   */
  static invalidateOnLeaveRequestChange(userId: string, startDate: Date, endDate: Date) {
    // Invalidate user's leave balance and requests
    this.invalidateUserLeaveData(userId);
    
    // Invalidate calendar data for affected months
    this.invalidateCalendarData(startDate, endDate);
    
    // Clear admin pending requests cache
    apiCache.delete('admin-pending-requests');
  }

  /**
   * Invalidate caches when TOIL data changes
   */
  static invalidateOnToilChange(userId: string) {
    this.invalidateUserLeaveData(userId);
    
    // Clear TOIL-specific cache entries
    const toilPatterns = ['toil-balance', 'toil-requests'];
    // For now, just clear user data cache
    userDataCache.clear();
  }
}

// Convenience functions for common invalidation scenarios
export const invalidateUserLeaveData = CacheInvalidationService.invalidateUserLeaveData;
export const invalidateCalendarData = CacheInvalidationService.invalidateCalendarData;
export const invalidateAllLeaveData = CacheInvalidationService.invalidateAllLeaveData;
export const invalidateOnLeaveRequestChange = CacheInvalidationService.invalidateOnLeaveRequestChange;
export const invalidateOnToilChange = CacheInvalidationService.invalidateOnToilChange;