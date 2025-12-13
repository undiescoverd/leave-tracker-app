-- Supabase Migration: Initial Schema
-- This migration converts the Prisma schema to Supabase SQL
-- Generated: 2024-12-13

-- =====================================================
-- ENUMS
-- =====================================================

-- Role enum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- LeaveStatus enum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- LeaveType enum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'TOIL', 'SICK');

-- ToilType enum
CREATE TYPE "ToilType" AS ENUM (
  'TRAVEL_LATE_RETURN',
  'WEEKEND_TRAVEL',
  'AGENT_PANEL_DAY',
  'OVERTIME'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "annual_leave_balance" DOUBLE PRECISION NOT NULL DEFAULT 32,
  "toil_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sick_leave_balance" DOUBLE PRECISION NOT NULL DEFAULT 3,
  "reset_token" TEXT,
  "reset_token_expiry" TIMESTAMPTZ
);

-- Leave Requests table
CREATE TABLE IF NOT EXISTS "leave_requests" (
  "id" TEXT PRIMARY KEY,
  "start_date" TIMESTAMPTZ NOT NULL,
  "end_date" TIMESTAMPTZ NOT NULL,
  "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
  "comments" TEXT,
  "type" "LeaveType" NOT NULL DEFAULT 'ANNUAL',
  "hours" DOUBLE PRECISION,
  "approved_by" TEXT,
  "approved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "user_id" TEXT NOT NULL,
  CONSTRAINT "leave_requests_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
);

-- TOIL Entries table
CREATE TABLE IF NOT EXISTS "toil_entries" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "date" TIMESTAMPTZ NOT NULL,
  "type" "ToilType" NOT NULL,
  "hours" DOUBLE PRECISION NOT NULL,
  "reason" TEXT NOT NULL,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "approved_by" TEXT,
  "approved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "adjustment_reason" TEXT,
  "previous_balance" DOUBLE PRECISION,
  "new_balance" DOUBLE PRECISION,
  CONSTRAINT "toil_entries_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS "users_role_created_at_idx" ON "users"("role", "created_at");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_reset_token_idx" ON "users"("reset_token");

-- Leave Requests table indexes
CREATE INDEX IF NOT EXISTS "leave_requests_user_id_status_idx" ON "leave_requests"("user_id", "status");
CREATE INDEX IF NOT EXISTS "leave_requests_start_date_end_date_idx" ON "leave_requests"("start_date", "end_date");
CREATE INDEX IF NOT EXISTS "leave_requests_status_created_at_idx" ON "leave_requests"("status", "created_at");
CREATE INDEX IF NOT EXISTS "leave_requests_type_status_idx" ON "leave_requests"("type", "status");
CREATE INDEX IF NOT EXISTS "leave_requests_user_id_type_status_idx" ON "leave_requests"("user_id", "type", "status");
CREATE INDEX IF NOT EXISTS "leave_requests_approved_by_approved_at_idx" ON "leave_requests"("approved_by", "approved_at");
CREATE INDEX IF NOT EXISTS "leave_requests_created_at_idx" ON "leave_requests"("created_at");

-- TOIL Entries table indexes
CREATE INDEX IF NOT EXISTS "toil_entries_user_id_date_idx" ON "toil_entries"("user_id", "date");
CREATE INDEX IF NOT EXISTS "toil_entries_approved_created_at_idx" ON "toil_entries"("approved", "created_at");
CREATE INDEX IF NOT EXISTS "toil_entries_user_id_approved_idx" ON "toil_entries"("user_id", "approved");
CREATE INDEX IF NOT EXISTS "toil_entries_type_approved_idx" ON "toil_entries"("type", "approved");
CREATE INDEX IF NOT EXISTS "toil_entries_approved_by_approved_at_idx" ON "toil_entries"("approved_by", "approved_at");

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON "leave_requests"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_toil_entries_updated_at
  BEFORE UPDATE ON "toil_entries"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to generate CUID-like IDs (similar to Prisma's default)
-- This uses UUID v4 as a substitute for CUID
CREATE OR REPLACE FUNCTION generate_cuid()
RETURNS TEXT AS $$
BEGIN
  RETURN 'c' || REPLACE(gen_random_uuid()::TEXT, '-', '');
END;
$$ LANGUAGE plpgsql;

-- Set default ID generation for tables
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT generate_cuid();
ALTER TABLE "leave_requests" ALTER COLUMN "id" SET DEFAULT generate_cuid();
ALTER TABLE "toil_entries" ALTER COLUMN "id" SET DEFAULT generate_cuid();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE "users" IS 'User accounts with authentication and leave balances';
COMMENT ON TABLE "leave_requests" IS 'Leave requests submitted by users';
COMMENT ON TABLE "toil_entries" IS 'Time off in lieu (TOIL) entries for tracking overtime';

COMMENT ON COLUMN "users"."annual_leave_balance" IS 'Remaining annual leave days';
COMMENT ON COLUMN "users"."toil_balance" IS 'Remaining TOIL hours';
COMMENT ON COLUMN "users"."sick_leave_balance" IS 'Remaining sick leave days';
COMMENT ON COLUMN "leave_requests"."hours" IS 'For TOIL requests, the number of hours being requested';
COMMENT ON COLUMN "toil_entries"."adjustment_reason" IS 'Reason for manual adjustments to TOIL balance';
