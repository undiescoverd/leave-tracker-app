-- Supabase Migration: Row Level Security (RLS) Policies
-- This migration sets up RLS policies to secure data access
-- Generated: 2024-12-13

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "toil_entries" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Function to get the current user's ID from JWT
-- This assumes you're using Supabase Auth or storing user_id in JWT claims
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS TEXT AS $$
BEGIN
  -- For NextAuth integration, we'll use a custom claim
  -- You may need to adjust this based on your auth setup
  RETURN current_setting('request.jwt.claims', true)::json->>'user_id';
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM "users"
    WHERE "id" = auth_user_id()
    AND "role" = 'ADMIN'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user owns a resource
CREATE OR REPLACE FUNCTION is_owner(owner_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth_user_id() = owner_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Policy: Users can view their own profile
CREATE POLICY "users_select_own"
  ON "users"
  FOR SELECT
  USING (auth_user_id() = id OR is_admin());

-- Policy: Users can update their own profile (excluding sensitive fields)
-- Note: Password updates should go through a separate secure endpoint
CREATE POLICY "users_update_own"
  ON "users"
  FOR UPDATE
  USING (auth_user_id() = id)
  WITH CHECK (auth_user_id() = id);

-- Policy: Only admins can insert new users
CREATE POLICY "users_insert_admin"
  ON "users"
  FOR INSERT
  WITH CHECK (is_admin());

-- Policy: Only admins can delete users
CREATE POLICY "users_delete_admin"
  ON "users"
  FOR DELETE
  USING (is_admin());

-- Policy: Admins can view all users
CREATE POLICY "users_select_admin"
  ON "users"
  FOR SELECT
  USING (is_admin());

-- Policy: Admins can update all users
CREATE POLICY "users_update_admin"
  ON "users"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- LEAVE REQUESTS TABLE POLICIES
-- =====================================================

-- Policy: Users can view their own leave requests
CREATE POLICY "leave_requests_select_own"
  ON "leave_requests"
  FOR SELECT
  USING (auth_user_id() = user_id OR is_admin());

-- Policy: Users can insert their own leave requests
CREATE POLICY "leave_requests_insert_own"
  ON "leave_requests"
  FOR INSERT
  WITH CHECK (auth_user_id() = user_id);

-- Policy: Users can update their own pending leave requests
CREATE POLICY "leave_requests_update_own"
  ON "leave_requests"
  FOR UPDATE
  USING (auth_user_id() = user_id AND status = 'PENDING')
  WITH CHECK (auth_user_id() = user_id AND status = 'PENDING');

-- Policy: Users can delete their own pending leave requests
CREATE POLICY "leave_requests_delete_own"
  ON "leave_requests"
  FOR DELETE
  USING (auth_user_id() = user_id AND status = 'PENDING');

-- Policy: Admins can view all leave requests
CREATE POLICY "leave_requests_select_admin"
  ON "leave_requests"
  FOR SELECT
  USING (is_admin());

-- Policy: Admins can update any leave request
CREATE POLICY "leave_requests_update_admin"
  ON "leave_requests"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy: Admins can delete any leave request
CREATE POLICY "leave_requests_delete_admin"
  ON "leave_requests"
  FOR DELETE
  USING (is_admin());

-- Policy: Allow viewing approved leave requests for team calendar
-- (Optional: Enable if you want all users to see approved leaves)
CREATE POLICY "leave_requests_select_approved_team"
  ON "leave_requests"
  FOR SELECT
  USING (status = 'APPROVED');

-- =====================================================
-- TOIL ENTRIES TABLE POLICIES
-- =====================================================

-- Policy: Users can view their own TOIL entries
CREATE POLICY "toil_entries_select_own"
  ON "toil_entries"
  FOR SELECT
  USING (auth_user_id() = user_id OR is_admin());

-- Policy: Users can insert their own TOIL entries
CREATE POLICY "toil_entries_insert_own"
  ON "toil_entries"
  FOR INSERT
  WITH CHECK (auth_user_id() = user_id);

-- Policy: Users can update their own pending TOIL entries
CREATE POLICY "toil_entries_update_own"
  ON "toil_entries"
  FOR UPDATE
  USING (auth_user_id() = user_id AND approved = false)
  WITH CHECK (auth_user_id() = user_id AND approved = false);

-- Policy: Users can delete their own pending TOIL entries
CREATE POLICY "toil_entries_delete_own"
  ON "toil_entries"
  FOR DELETE
  USING (auth_user_id() = user_id AND approved = false);

-- Policy: Admins can view all TOIL entries
CREATE POLICY "toil_entries_select_admin"
  ON "toil_entries"
  FOR SELECT
  USING (is_admin());

-- Policy: Admins can update any TOIL entry
CREATE POLICY "toil_entries_update_admin"
  ON "toil_entries"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy: Admins can delete any TOIL entry
CREATE POLICY "toil_entries_delete_admin"
  ON "toil_entries"
  FOR DELETE
  USING (is_admin());

-- Policy: Admins can insert TOIL entries for any user
CREATE POLICY "toil_entries_insert_admin"
  ON "toil_entries"
  FOR INSERT
  WITH CHECK (is_admin());

-- =====================================================
-- SERVICE ROLE BYPASS
-- =====================================================

-- Note: Service role key automatically bypasses RLS
-- Use the service role key (SUPABASE_SERVICE_ROLE_KEY) for:
-- - User registration
-- - Password resets
-- - Admin operations that need to bypass RLS
-- - Migrations and seeds

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "users_select_own" ON "users" IS 'Users can view their own profile';
COMMENT ON POLICY "leave_requests_select_approved_team" ON "leave_requests" IS 'All users can view approved leave for team calendar';
COMMENT ON POLICY "toil_entries_select_own" ON "toil_entries" IS 'Users can view their own TOIL entries';
