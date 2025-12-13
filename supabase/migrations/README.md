# Supabase Migrations

This directory contains SQL migration files for setting up the database schema in Supabase.

## Migration Files

1. **001_initial_schema.sql** - Creates tables, enums, indexes, and helper functions
2. **002_row_level_security.sql** - Sets up Row Level Security (RLS) policies

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended for first-time setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the content of `001_initial_schema.sql`
5. Click **Run** to execute
6. Repeat steps 3-5 for `002_row_level_security.sql`

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

### Option 3: Manual SQL Execution

1. Connect to your Supabase PostgreSQL database
2. Execute each migration file in order:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f 001_initial_schema.sql
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f 002_row_level_security.sql
```

## Verifying Migrations

After applying migrations, verify the setup:

1. **Check Tables**:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
   Should return: `users`, `leave_requests`, `toil_entries`

2. **Check RLS Enabled**:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```
   All tables should have `rowsecurity = true`

3. **Check Policies**:
   ```sql
   SELECT tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public';
   ```
   Should return multiple policies for each table

## Important Notes

### Authentication Integration

The RLS policies use a custom `auth_user_id()` function that expects the user ID to be in JWT claims. When using NextAuth with Supabase:

1. You need to set the user ID in the JWT when users authenticate
2. Modify the `auth_user_id()` function if your JWT structure is different
3. Alternatively, use Supabase Auth instead of NextAuth

### Secret Key (Admin Access)

For operations that need to bypass RLS (user registration, password resets, admin operations):

1. Use the **Secret Key** (`SUPABASE_SECRET_KEY` - recommended) or legacy **Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`)
2. This is already configured in `src/lib/supabase.ts` as `supabaseAdmin`
3. **NEVER expose the secret key to the client** - it provides full database access and bypasses all RLS policies
4. The secret key format is `sb_secret_...` (new) or JWT-based `service_role` key (legacy)

## Rollback

To rollback migrations, you can drop the tables and enums:

```sql
-- Drop tables (cascades to foreign keys)
DROP TABLE IF EXISTS "toil_entries" CASCADE;
DROP TABLE IF EXISTS "leave_requests" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "ToilType";
DROP TYPE IF EXISTS "LeaveType";
DROP TYPE IF EXISTS "LeaveStatus";
DROP TYPE IF EXISTS "Role";

-- Drop functions
DROP FUNCTION IF EXISTS generate_cuid();
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS auth_user_id();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_owner(TEXT);
```

## Next Steps

After applying migrations:

1. Update environment variables with your Supabase credentials
2. Test the connection using the health check endpoint
3. Run the seed script to populate initial data
4. Verify RLS policies are working correctly

## Troubleshooting

### RLS Policies Not Working

If RLS policies are preventing legitimate access:

1. Check that `auth_user_id()` is returning the correct user ID
2. Verify JWT claims structure matches the function
3. Use secret key (or service role key) for operations that need to bypass RLS

### Migration Errors

If you encounter errors during migration:

1. Check PostgreSQL logs in Supabase dashboard
2. Verify no existing tables with the same names
3. Ensure you have necessary permissions
4. Run migrations in order (001, then 002)

## Schema Differences from Prisma

| Feature | Prisma | Supabase |
|---------|--------|----------|
| ID Generation | `cuid()` | Custom `generate_cuid()` function |
| Updated At | Middleware | Database trigger |
| Column Names | camelCase | snake_case |
| Timestamps | `DateTime` | `TIMESTAMPTZ` |
| Access Control | Application layer | Row Level Security (RLS) |
