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
 * Format date to YYYY-MM-DD string
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get business days between two dates (same as calculateWorkingDays but different name for clarity)
 */
export function getBusinessDayCount(startDate: Date, endDate: Date): number {
  return calculateWorkingDays(startDate, endDate);
}