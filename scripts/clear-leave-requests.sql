-- Clear all leave request data for testing
-- Run this script to remove all leave requests from the database

-- Delete all leave requests
DELETE FROM leave_requests;

-- Optional: Reset user balances to defaults if needed
-- Uncomment the lines below if you want to reset balances as well
-- UPDATE users SET 
--   annual_leave_balance = 32,
--   toil_balance = 0,
--   sick_leave_balance = 3;

-- Verify deletion
SELECT COUNT(*) as remaining_requests FROM leave_requests;

