# Schema Application Guide for New Supabase Projects

This guide walks you through applying the database schema to both dev and prod Supabase projects.

## Projects Information

### Dev Project
- **Project Name**: leave-tracker-dev
- **Project ID**: koofwbtzrxvqmjlcstqo
- **URL**: https://koofwbtzrxvqmjlcstqo.supabase.co

### Prod Project
- **Project Name**: leave-tracker-prod
- **Project ID**: gnnyeoobrsdrdccupkcg
- **URL**: https://gnnyeoobrsdrdccupkcg.supabase.co

## Step-by-Step Instructions

### Phase 1: Apply Schema to Dev Project

1. **Open Dev Project SQL Editor**
   - Go to https://supabase.com/dashboard
   - Select project: `leave-tracker-dev`
   - Navigate to: SQL Editor (left sidebar)

2. **Run Migration 001: Initial Schema**
   - Click "New Query"
   - Copy contents from: `supabase/migrations/001_initial_schema.sql`
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - **Verify**: Check for success message
   - **Expected**: Creates tables: `users`, `leave_requests`, `toil_entries`

3. **Run Migration 002: Row Level Security**
   - Click "New Query"
   - Copy contents from: `supabase/migrations/002_row_level_security.sql`
   - Paste into SQL Editor
   - Click "Run"
   - **Verify**: RLS policies created successfully
   - **Expected**: All tables have RLS enabled with appropriate policies

4. **Run Migration 003: Enable Realtime**
   - Click "New Query"
   - Copy contents from: `supabase/migrations/003_enable_realtime.sql`
   - Paste into SQL Editor
   - Click "Run"
   - **Verify**: Realtime enabled successfully
   - **Expected**: Tables added to `supabase_realtime` publication

5. **Run Migration 004: Expand Role Enum**
   - Click "New Query"
   - Copy contents from: `supabase/migrations/004_expand_role_enum.sql`
   - Paste into SQL Editor
   - Click "Run"
   - **Verify**: Role enum expanded successfully
   - **Expected**: Role enum now includes: USER, ADMIN, TECH_ADMIN, OWNER

6. **Verify Dev Schema**
   - Go to: Table Editor (left sidebar)
   - **Check tables exist**:
     - ✅ users
     - ✅ leave_requests
     - ✅ toil_entries
   - **Check Realtime**:
     - Navigate to: Database → Replication
     - Verify all 3 tables have realtime enabled

### Phase 2: Apply Schema to Prod Project

Repeat the exact same steps for the prod project:

1. **Switch to Prod Project**
   - Select project: `leave-tracker-prod`
   - Navigate to: SQL Editor

2. **Run All Migrations (001 → 004)**
   - Follow same steps as Dev Project
   - Run migrations in order: 001, 002, 003, 004
   - Verify each migration completes successfully

3. **Verify Prod Schema**
   - Check tables exist (same as dev)
   - Verify realtime enabled (same as dev)

## Verification Checklist

After applying to **both** projects:

### Database Structure
- [ ] Tables created: `users`, `leave_requests`, `toil_entries`
- [ ] Enums created: `Role`, `LeaveStatus`, `LeaveType`, `ToilType`
- [ ] Indexes created successfully
- [ ] Helper functions created: `generate_cuid()`, `update_updated_at_column()`
- [ ] Triggers created for `updated_at` columns

### Row Level Security
- [ ] RLS enabled on all tables
- [ ] User policies created (select, update, insert, delete)
- [ ] Admin policies created
- [ ] Team calendar policy created (approved leaves visible to all)

### Realtime
- [ ] `leave_requests` has REPLICA IDENTITY FULL
- [ ] `toil_entries` has REPLICA IDENTITY FULL
- [ ] `users` has REPLICA IDENTITY FULL
- [ ] All tables added to `supabase_realtime` publication

### Role Enum Expansion
- [ ] Role enum includes: USER, ADMIN, TECH_ADMIN, OWNER
- [ ] `is_admin()` function updated to include all admin types
- [ ] Default role is 'USER'

## Troubleshooting

### Common Issues

**Issue**: Migration fails with "relation already exists"
- **Solution**: Run `DROP TABLE IF EXISTS table_name CASCADE;` before re-running migration

**Issue**: Realtime publication error
- **Solution**: Verify `supabase_realtime` publication exists first:
  ```sql
  SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
  ```

**Issue**: RLS policies conflict
- **Solution**: Drop existing policies first:
  ```sql
  DROP POLICY IF EXISTS policy_name ON table_name;
  ```

**Issue**: Enum type already exists
- **Solution**: Drop and recreate (be careful with data):
  ```sql
  DROP TYPE IF EXISTS "Role" CASCADE;
  ```

## Next Steps

After successfully applying schema to both projects:

1. ✅ Run data migration scripts (Phase 3)
2. ✅ Create environment configuration files (Phase 4)
3. ✅ Test local development (Phase 7)
4. ✅ Update Vercel environment variables (Phase 5)
5. ✅ Deploy and test (Phase 7-8)

## Quick Verification Query

Run this in both dev and prod SQL Editors to verify everything:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'leave_requests', 'toil_entries');

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Check role enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'Role'::regtype
ORDER BY enumsortorder;
```

Expected results:
- 3 tables found
- All 3 tables have `rowsecurity = true`
- All 3 tables in realtime publication
- 4 role enum values: USER, ADMIN, TECH_ADMIN, OWNER
