/**
 * Date utility functions for leave calculations
 */

/**
 * Calculate working days between two dates (excluding weekends)
 */
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let workingDays = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday (0) or Saturday (6)
}

/**
 * Format date to YYYY-MM-DD string using local date components (no timezone conversion)
 * This ensures consistent date formatting regardless of server timezone
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get business days between two dates (same as calculateWorkingDays but different name for clarity)
 */
export function getBusinessDayCount(startDate: Date, endDate: Date): number {
  return calculateWorkingDays(startDate, endDate);
}

/**
 * Convert a date to a UTC YYYY-MM-DD string key for consistent date lookups
 * This function ensures dates are always compared using UTC to avoid timezone issues.
 *
 * @param date - Date object (in any timezone)
 * @returns YYYY-MM-DD string in UTC
 */
export function toUTCDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse a YYYY-MM-DD date string to a Date object at noon UTC
 * Using noon avoids daylight saving time edge cases
 *
 * @param dateStr - YYYY-MM-DD format string
 * @returns Date object at noon UTC on that day
 */
export function parseUTCDateString(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00Z');
}

/**
 * Convert a local date (e.g., from a date picker) to its UTC date key
 * This handles the case where a user selects a date in their local timezone
 * but we need to match it against UTC-stored dates.
 *
 * For the UK timezone (which this app defaults to), we use local date components
 * to ensure Jan 19 in UK is matched as Jan 19, not shifted by timezone offset.
 *
 * @param date - Date object from local context (e.g., calendar picker)
 * @returns YYYY-MM-DD string representing the intended date
 */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}