-- ========================================
-- COMPLETE LEAVE DATA RESET SCRIPT
-- ========================================
-- This script clears ALL leave-related data and resets balances
-- Use this for a clean slate / fresh start
-- ========================================

BEGIN;

-- 1. Delete all leave requests (approved, pending, rejected, cancelled)
DELETE FROM leave_requests;

-- 2. Delete all TOIL entries
DELETE FROM toil_entries;

-- 3. Reset all user balances to defaults
UPDATE users SET
  annual_leave_balance = 32,  -- Default annual leave allowance
  toil_balance = 0,           -- Reset TOIL to 0
  sick_leave_balance = 3      -- Default sick leave allowance
WHERE role IN ('USER', 'ADMIN');

-- 4. Verify cleanup
SELECT
  (SELECT COUNT(*) FROM leave_requests) as leave_requests_count,
  (SELECT COUNT(*) FROM toil_entries) as toil_entries_count,
  (SELECT COUNT(*) FROM users WHERE annual_leave_balance = 32) as users_reset_count;

COMMIT;

-- Success message
SELECT 'All leave data cleared successfully! Users reset to default balances.' as status;
