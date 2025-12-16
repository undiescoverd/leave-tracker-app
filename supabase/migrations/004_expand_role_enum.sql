-- Supabase Migration: Expand Role ENUM
-- Adds OWNER and TECH_ADMIN roles to the system
-- Generated: 2024-12-16

-- =====================================================
-- STEP 1: Create new ENUM type with expanded values
-- =====================================================
CREATE TYPE "Role_new" AS ENUM ('USER', 'ADMIN', 'TECH_ADMIN', 'OWNER');

COMMENT ON TYPE "Role_new" IS 'User roles: USER (employee), ADMIN (employee admin), TECH_ADMIN (technical admin), OWNER (business owner)';

-- =====================================================
-- STEP 2: Add temporary column with new type
-- =====================================================
ALTER TABLE "users"
  ADD COLUMN "role_new" "Role_new";

COMMENT ON COLUMN "users"."role_new" IS 'Temporary column for role migration';

-- =====================================================
-- STEP 3: Migrate existing data
-- Copy all existing role values to the new column
-- =====================================================
UPDATE "users"
  SET "role_new" = "role"::text::"Role_new";

-- Verify all rows were migrated
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "role_new" IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: Some users have NULL role_new values';
  END IF;
END $$;

-- =====================================================
-- STEP 4: Drop old column and rename new column
-- =====================================================
ALTER TABLE "users"
  DROP COLUMN "role";

ALTER TABLE "users"
  RENAME COLUMN "role_new" TO "role";

-- =====================================================
-- STEP 5: Set default and NOT NULL constraint
-- =====================================================
ALTER TABLE "users"
  ALTER COLUMN "role" SET DEFAULT 'USER';

ALTER TABLE "users"
  ALTER COLUMN "role" SET NOT NULL;

COMMENT ON COLUMN "users"."role" IS 'User role: determines permissions and UI visibility. Supports USER, ADMIN, TECH_ADMIN, and OWNER.';

-- =====================================================
-- STEP 6: Drop old ENUM type
-- =====================================================
DROP TYPE "Role";

-- =====================================================
-- STEP 7: Rename new ENUM type
-- =====================================================
ALTER TYPE "Role_new" RENAME TO "Role";

-- =====================================================
-- STEP 8: Migrate specific users to new roles
-- =====================================================

-- Senay becomes OWNER (business admin)
UPDATE "users"
  SET "role" = 'OWNER'
  WHERE "email" = 'senay@tdhagency.com';

-- Ian becomes TECH_ADMIN (technical admin)
UPDATE "users"
  SET "role" = 'TECH_ADMIN'
  WHERE "email" = 'ian@tdhagency.com';

-- Verify migrations
DO $$
DECLARE
  senay_role TEXT;
  ian_role TEXT;
BEGIN
  SELECT "role" INTO senay_role FROM "users" WHERE "email" = 'senay@tdhagency.com';
  SELECT "role" INTO ian_role FROM "users" WHERE "email" = 'ian@tdhagency.com';

  IF senay_role != 'OWNER' THEN
    RAISE WARNING 'Senay role migration may have failed. Current role: %', senay_role;
  END IF;

  IF ian_role != 'TECH_ADMIN' THEN
    RAISE WARNING 'Ian role migration may have failed. Current role: %', ian_role;
  END IF;
END $$;

-- =====================================================
-- STEP 9: Update is_admin() function to include all admin types
-- This function is used by RLS policies
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM "users"
    WHERE "id" = auth_user_id()
    AND "role" IN ('ADMIN', 'TECH_ADMIN', 'OWNER')
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin() IS 'Returns true if current user has any admin role (ADMIN, TECH_ADMIN, or OWNER)';

-- =====================================================
-- STEP 10: Recreate index on role column
-- =====================================================
DROP INDEX IF EXISTS "users_role_created_at_idx";
CREATE INDEX "users_role_created_at_idx" ON "users"("role", "created_at");

COMMENT ON INDEX "users_role_created_at_idx" IS 'Index for efficient role-based queries with creation date sorting';

-- =====================================================
-- STEP 11: Verification queries (for manual review)
-- =====================================================

-- Display role distribution
DO $$
DECLARE
  user_count INTEGER;
  admin_count INTEGER;
  tech_admin_count INTEGER;
  owner_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM "users" WHERE "role" = 'USER';
  SELECT COUNT(*) INTO admin_count FROM "users" WHERE "role" = 'ADMIN';
  SELECT COUNT(*) INTO tech_admin_count FROM "users" WHERE "role" = 'TECH_ADMIN';
  SELECT COUNT(*) INTO owner_count FROM "users" WHERE "role" = 'OWNER';

  RAISE NOTICE 'Role distribution:';
  RAISE NOTICE '  USER: %', user_count;
  RAISE NOTICE '  ADMIN: %', admin_count;
  RAISE NOTICE '  TECH_ADMIN: %', tech_admin_count;
  RAISE NOTICE '  OWNER: %', owner_count;
  RAISE NOTICE 'Total users: %', user_count + admin_count + tech_admin_count + owner_count;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 004_expand_role_enum completed successfully';
  RAISE NOTICE 'New roles added: TECH_ADMIN, OWNER';
  RAISE NOTICE 'is_admin() function updated to include all admin types';
  RAISE NOTICE '========================================';
END $$;
