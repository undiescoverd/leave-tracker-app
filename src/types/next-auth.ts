/**
 * Runtime helper functions for role-based access control
 * These functions provide centralized role checking logic
 */

// Re-export types from declaration file
export type { UserRole, AdminRole } from './next-auth.d';

// Type imports for function signatures
import type { UserRole, AdminRole } from './next-auth.d';

/**
 * Type guard to check if a role is any admin type
 * @param role - The user role to check
 * @returns true if role is ADMIN, TECH_ADMIN, or OWNER
 *
 * @example
 * if (isAdminRole(user.role)) {
 *   // User has admin permissions
 * }
 */
export function isAdminRole(role: UserRole | undefined): role is AdminRole {
  if (!role) return false;
  return role === "ADMIN" || role === "TECH_ADMIN" || role === "OWNER";
}

/**
 * Check if a role should hide the leave balance widget
 * TECH_ADMIN and OWNER don't take leave, so they don't see leave balance
 * @param role - The user role to check
 * @returns true if leave balance should be hidden
 *
 * @example
 * if (shouldHideLeaveBalance(user.role)) {
 *   // Don't render LeaveBalanceWidget
 * }
 */
export function shouldHideLeaveBalance(role: UserRole | undefined): boolean {
  if (!role) return false;
  return role === "TECH_ADMIN" || role === "OWNER";
}
