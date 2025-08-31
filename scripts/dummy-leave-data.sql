-- First, get the user IDs (replace these with actual IDs from your database)
-- You can get these by running: SELECT id, name, email FROM users WHERE role = 'USER';

-- Dummy leave requests for comprehensive testing
-- Replace 'USER_ID_1' and 'USER_ID_2' with actual user IDs

-- 2024 Historical Data (Approved) for User 1
INSERT INTO leave_requests (id, "userId", "startDate", "endDate", type, status, hours, comments, "approvedBy", "approvedAt", "createdAt", "updatedAt") VALUES
('dummy_001', 'USER_ID_1', '2024-01-15', '2024-01-19', 'ANNUAL', 'APPROVED', 40, 'New Year break', 'admin@tdh.co.uk', '2024-01-10 10:00:00', '2024-01-05 09:00:00', '2024-01-10 10:00:00'),
('dummy_002', 'USER_ID_1', '2024-03-12', '2024-03-13', 'SICK', 'APPROVED', 16, 'Flu symptoms', 'admin@tdh.co.uk', '2024-03-12 08:00:00', '2024-03-12 08:00:00', '2024-03-12 08:00:00'),
('dummy_003', 'USER_ID_1', '2024-05-20', '2024-05-24', 'ANNUAL', 'APPROVED', 40, 'Spring holiday', 'admin@tdh.co.uk', '2024-05-15 14:00:00', '2024-05-10 10:00:00', '2024-05-15 14:00:00'),
('dummy_004', 'USER_ID_1', '2024-07-08', '2024-07-10', 'UNPAID', 'APPROVED', 24, 'Family emergency', 'admin@tdh.co.uk', '2024-07-05 16:00:00', '2024-07-03 15:00:00', '2024-07-05 16:00:00'),
('dummy_005', 'USER_ID_1', '2024-08-12', '2024-08-23', 'ANNUAL', 'APPROVED', 80, 'Summer vacation', 'admin@tdh.co.uk', '2024-07-20 12:00:00', '2024-07-15 09:00:00', '2024-07-20 12:00:00'),
('dummy_006', 'USER_ID_1', '2024-10-14', '2024-10-14', 'SICK', 'APPROVED', 8, 'Doctor appointment', 'admin@tdh.co.uk', '2024-10-14 09:00:00', '2024-10-14 09:00:00', '2024-10-14 09:00:00'),
('dummy_007', 'USER_ID_1', '2024-12-23', '2024-12-31', 'ANNUAL', 'APPROVED', 56, 'Christmas holidays', 'admin@tdh.co.uk', '2024-11-15 10:00:00', '2024-11-10 14:00:00', '2024-11-15 10:00:00'),

-- 2025 Data for User 1 (mix of approved, pending, rejected)
('dummy_008', 'USER_ID_1', '2025-01-20', '2025-01-24', 'ANNUAL', 'APPROVED', 40, 'Winter break', 'admin@tdh.co.uk', '2025-01-15 11:00:00', '2025-01-10 10:00:00', '2025-01-15 11:00:00'),
('dummy_009', 'USER_ID_1', '2025-02-14', '2025-02-16', 'UNPAID', 'APPROVED', 24, 'Personal matters', 'admin@tdh.co.uk', '2025-02-10 13:00:00', '2025-02-05 09:00:00', '2025-02-10 13:00:00'),
('dummy_010', 'USER_ID_1', '2025-03-18', '2025-03-18', 'SICK', 'APPROVED', 8, 'Migraine', 'admin@tdh.co.uk', '2025-03-18 08:30:00', '2025-03-18 08:30:00', '2025-03-18 08:30:00'),
('dummy_011', 'USER_ID_1', '2025-04-07', '2025-04-11', 'ANNUAL', 'APPROVED', 40, 'Easter holidays', 'admin@tdh.co.uk', '2025-04-01 10:00:00', '2025-03-25 14:00:00', '2025-04-01 10:00:00'),
('dummy_012', 'USER_ID_1', '2025-06-16', '2025-06-18', 'UNPAID', 'APPROVED', 24, 'Wedding preparation', 'admin@tdh.co.uk', '2025-06-10 15:00:00', '2025-06-05 10:00:00', '2025-06-10 15:00:00'),
('dummy_013', 'USER_ID_1', '2025-07-21', '2025-07-25', 'ANNUAL', 'REJECTED', 40, 'Summer holiday', 'admin@tdh.co.uk', '2025-07-15 09:00:00', '2025-07-10 11:00:00', '2025-07-15 09:00:00'),
('dummy_014', 'USER_ID_1', '2025-09-15', '2025-09-19', 'ANNUAL', 'PENDING', 40, 'Autumn break', NULL, NULL, '2025-08-28 10:00:00', '2025-08-28 10:00:00'),
('dummy_015', 'USER_ID_1', '2025-10-28', '2025-10-31', 'ANNUAL', 'PENDING', 32, 'Half-term holiday', NULL, NULL, '2025-08-29 14:00:00', '2025-08-29 14:00:00'),
('dummy_016', 'USER_ID_1', '2025-11-25', '2025-11-26', 'UNPAID', 'PENDING', 16, 'Extended weekend', NULL, NULL, '2025-08-30 09:00:00', '2025-08-30 09:00:00'),
('dummy_017', 'USER_ID_1', '2025-12-22', '2025-12-31', 'ANNUAL', 'PENDING', 64, 'Christmas and New Year', NULL, NULL, '2025-08-30 10:00:00', '2025-08-30 10:00:00'),

-- 2024 Historical Data (Approved) for User 2
('dummy_101', 'USER_ID_2', '2024-02-05', '2024-02-09', 'ANNUAL', 'APPROVED', 40, 'February break', 'admin@tdh.co.uk', '2024-02-01 10:00:00', '2024-01-25 09:00:00', '2024-02-01 10:00:00'),
('dummy_102', 'USER_ID_2', '2024-04-22', '2024-04-22', 'SICK', 'APPROVED', 8, 'Food poisoning', 'admin@tdh.co.uk', '2024-04-22 07:30:00', '2024-04-22 07:30:00', '2024-04-22 07:30:00'),
('dummy_103', 'USER_ID_2', '2024-06-10', '2024-06-14', 'ANNUAL', 'APPROVED', 40, 'Summer getaway', 'admin@tdh.co.uk', '2024-06-05 11:00:00', '2024-05-28 15:00:00', '2024-06-05 11:00:00'),
('dummy_104', 'USER_ID_2', '2024-08-19', '2024-08-21', 'UNPAID', 'APPROVED', 24, 'Moving house', 'admin@tdh.co.uk', '2024-08-15 13:00:00', '2024-08-10 10:00:00', '2024-08-15 13:00:00'),
('dummy_105', 'USER_ID_2', '2024-09-30', '2024-10-04', 'ANNUAL', 'APPROVED', 40, 'Autumn break', 'admin@tdh.co.uk', '2024-09-20 14:00:00', '2024-09-15 12:00:00', '2024-09-20 14:00:00'),
('dummy_106', 'USER_ID_2', '2024-11-11', '2024-11-11', 'SICK', 'APPROVED', 8, 'Medical appointment', 'admin@tdh.co.uk', '2024-11-11 08:00:00', '2024-11-11 08:00:00', '2024-11-11 08:00:00'),
('dummy_107', 'USER_ID_2', '2024-12-16', '2024-12-20', 'ANNUAL', 'APPROVED', 40, 'Pre-Christmas break', 'admin@tdh.co.uk', '2024-12-01 09:00:00', '2024-11-25 16:00:00', '2024-12-01 09:00:00'),

-- 2025 Data for User 2
('dummy_108', 'USER_ID_2', '2025-01-13', '2025-01-17', 'ANNUAL', 'APPROVED', 40, 'January break', 'admin@tdh.co.uk', '2025-01-08 12:00:00', '2025-01-03 10:00:00', '2025-01-08 12:00:00'),
('dummy_109', 'USER_ID_2', '2025-03-03', '2025-03-07', 'UNPAID', 'APPROVED', 40, 'Family commitment', 'admin@tdh.co.uk', '2025-02-25 14:00:00', '2025-02-20 09:00:00', '2025-02-25 14:00:00'),
('dummy_110', 'USER_ID_2', '2025-04-28', '2025-04-30', 'ANNUAL', 'APPROVED', 24, 'Long weekend', 'admin@tdh.co.uk', '2025-04-20 11:00:00', '2025-04-15 13:00:00', '2025-04-20 11:00:00'),
('dummy_111', 'USER_ID_2', '2025-05-12', '2025-05-12', 'SICK', 'APPROVED', 8, 'Dental surgery', 'admin@tdh.co.uk', '2025-05-12 07:00:00', '2025-05-12 07:00:00', '2025-05-12 07:00:00'),
('dummy_112', 'USER_ID_2', '2025-07-07', '2025-07-11', 'ANNUAL', 'APPROVED', 40, 'Mid-year break', 'admin@tdh.co.uk', '2025-07-01 10:00:00', '2025-06-25 14:00:00', '2025-07-01 10:00:00'),
('dummy_113', 'USER_ID_2', '2025-09-08', '2025-09-12', 'ANNUAL', 'PENDING', 40, 'September holiday', NULL, NULL, '2025-08-27 11:00:00', '2025-08-27 11:00:00'),
('dummy_114', 'USER_ID_2', '2025-10-20', '2025-10-22', 'UNPAID', 'PENDING', 24, 'Conference attendance', NULL, NULL, '2025-08-28 15:00:00', '2025-08-28 15:00:00'),
('dummy_115', 'USER_ID_2', '2025-11-17', '2025-11-21', 'ANNUAL', 'PENDING', 40, 'Late autumn break', NULL, NULL, '2025-08-29 09:00:00', '2025-08-29 09:00:00'),
('dummy_116', 'USER_ID_2', '2025-12-27', '2025-12-31', 'ANNUAL', 'PENDING', 40, 'Year-end holidays', NULL, NULL, '2025-08-30 12:00:00', '2025-08-30 12:00:00');

-- TOIL Entries for User 1
INSERT INTO toil_entries (id, "userId", date, type, hours, reason, approved, "approvedBy", "approvedAt", "createdAt", "updatedAt") VALUES
('toil_001', 'USER_ID_1', '2024-02-10', 'WEEKEND_TRAVEL', 4, 'Weekend client site visit', true, 'admin@tdh.co.uk', '2024-02-12 10:00:00', '2024-02-11 16:00:00', '2024-02-12 10:00:00'),
('toil_002', 'USER_ID_1', '2024-06-15', 'OVERTIME', 3, 'Project deadline overtime', true, 'admin@tdh.co.uk', '2024-06-16 09:00:00', '2024-06-16 08:00:00', '2024-06-16 09:00:00'),
('toil_003', 'USER_ID_1', '2024-09-22', 'TRAVEL_LATE_RETURN', 2, 'Late return from Birmingham site', true, 'admin@tdh.co.uk', '2024-09-23 10:00:00', '2024-09-23 09:00:00', '2024-09-23 10:00:00'),
('toil_004', 'USER_ID_1', '2025-01-25', 'AGENT_PANEL_DAY', 8, 'Agent panel Saturday session', true, 'admin@tdh.co.uk', '2025-01-27 11:00:00', '2025-01-26 17:00:00', '2025-01-27 11:00:00'),
('toil_005', 'USER_ID_1', '2025-03-15', 'OVERTIME', 4, 'Emergency system maintenance', true, 'admin@tdh.co.uk', '2025-03-16 08:00:00', '2025-03-16 07:30:00', '2025-03-16 08:00:00'),
('toil_006', 'USER_ID_1', '2025-08-20', 'WEEKEND_TRAVEL', 4, 'Weekend client emergency', false, NULL, NULL, '2025-08-21 08:00:00', '2025-08-21 08:00:00'),
('toil_007', 'USER_ID_1', '2025-08-25', 'OVERTIME', 6, 'Server migration overtime', false, NULL, NULL, '2025-08-26 09:00:00', '2025-08-26 09:00:00'),

-- TOIL Entries for User 2
('toil_101', 'USER_ID_2', '2024-03-20', 'WEEKEND_TRAVEL', 4, 'Emergency weekend call', true, 'admin@tdh.co.uk', '2024-03-22 14:00:00', '2024-03-21 18:00:00', '2024-03-22 14:00:00'),
('toil_102', 'USER_ID_2', '2024-07-30', 'OVERTIME', 5, 'Quarterly report overtime', true, 'admin@tdh.co.uk', '2024-08-01 10:00:00', '2024-07-31 19:00:00', '2024-08-01 10:00:00'),
('toil_103', 'USER_ID_2', '2024-11-28', 'TRAVEL_LATE_RETURN', 3, 'Late return from Leeds client', true, 'admin@tdh.co.uk', '2024-11-29 09:00:00', '2024-11-29 08:00:00', '2024-11-29 09:00:00'),
('toil_104', 'USER_ID_2', '2025-02-08', 'AGENT_PANEL_DAY', 8, 'Saturday agent interviews', true, 'admin@tdh.co.uk', '2025-02-10 12:00:00', '2025-02-09 17:30:00', '2025-02-10 12:00:00'),
('toil_105', 'USER_ID_2', '2025-05-22', 'OVERTIME', 2, 'System upgrade overtime', true, 'admin@tdh.co.uk', '2025-05-23 08:00:00', '2025-05-22 20:00:00', '2025-05-23 08:00:00'),
('toil_106', 'USER_ID_2', '2025-08-19', 'WEEKEND_TRAVEL', 4, 'Client site emergency', false, NULL, NULL, '2025-08-20 07:00:00', '2025-08-20 07:00:00'),
('toil_107', 'USER_ID_2', '2025-08-28', 'OVERTIME', 3, 'End of month reporting', false, NULL, NULL, '2025-08-29 18:30:00', '2025-08-29 18:30:00');

-- Instructions:
-- 1. Get actual user IDs by running: SELECT id, name, email FROM users WHERE role = 'USER';
-- 2. Replace 'USER_ID_1' and 'USER_ID_2' with the actual IDs
-- 3. Run this SQL in your database
-- 4. Update TOIL balances by running the calculation queries below

-- Update TOIL balances (run after inserting the data above)
-- UPDATE users SET "toilBalance" = 
--   (SELECT COALESCE(SUM(hours), 0) FROM toil_entries WHERE "userId" = users.id AND approved = true) -
--   (SELECT COALESCE(SUM(hours), 0) FROM leave_requests WHERE "userId" = users.id AND type = 'TOIL' AND status = 'APPROVED')
-- WHERE role = 'USER';