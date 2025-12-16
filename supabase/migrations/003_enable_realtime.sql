-- Supabase Migration: Enable Realtime
-- This migration enables real-time subscriptions for live updates
-- Generated: 2024-12-14

-- =====================================================
-- ENABLE REALTIME REPLICATION
-- =====================================================

-- Enable realtime for leave_requests table
ALTER TABLE "leave_requests" REPLICA IDENTITY FULL;

-- Enable realtime for toil_entries table
ALTER TABLE "toil_entries" REPLICA IDENTITY FULL;

-- Enable realtime for users table (for balance updates)
ALTER TABLE "users" REPLICA IDENTITY FULL;

-- =====================================================
-- CONFIGURE REALTIME PUBLICATION
-- =====================================================

-- Add tables to the realtime publication
-- This allows clients to subscribe to changes on these tables
ALTER PUBLICATION supabase_realtime ADD TABLE "leave_requests";
ALTER PUBLICATION supabase_realtime ADD TABLE "toil_entries";
ALTER PUBLICATION supabase_realtime ADD TABLE "users";

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE "leave_requests" IS 'Leave requests with real-time updates enabled';
COMMENT ON TABLE "toil_entries" IS 'TOIL entries with real-time updates enabled';
COMMENT ON TABLE "users" IS 'User accounts with real-time balance updates enabled';
