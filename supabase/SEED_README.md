# Supabase Seed Script

This directory contains the Supabase version of the database seed script.

## Prerequisites

1. **Supabase Project Setup**
   - Create a Supabase project at https://supabase.com
   - Run the migrations in `supabase/migrations/` to create the schema
   - Get your project URL and Service Role Key

2. **Environment Variables**
   Create a `.env.local` file with the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## Running the Seed Script

```bash
# Install dependencies if needed
npm install

# Run the Supabase seed script
npx tsx supabase/seed.supabase.ts
```

## What Gets Seeded

### Users (4 total)
1. **Senay Taormina** (senay@tdhagency.com) - ADMIN
2. **Ian Vincent** (ian@tdhagency.com) - ADMIN
3. **Sup Dhanasunthorn** (sup@tdhagency.com) - USER
4. **Luis Drake** (luis@tdhagency.com) - USER

**Default Password**: `Password123!`

### Leave Requests (4 total)
- 1 pending annual leave (Senay)
- 1 approved sick leave (Ian)
- 1 pending annual leave (Sup)
- 1 approved TOIL (Luis)

### User Balances
Each user is created with:
- **Annual Leave**: 32 days
- **TOIL Balance**: 0 hours
- **Sick Leave**: 3 days

## Features

### Upsert Logic
The script uses upsert logic (check-then-update or insert):
- If a user with the same email exists, it updates their data
- If not, it creates a new user
- This allows you to run the script multiple times safely

### Error Handling
- Graceful error handling for each user creation
- Continues processing even if individual operations fail
- Detailed logging for troubleshooting

### Leave Request Data
Sample leave requests are created to demonstrate:
- Different leave types (ANNUAL, SICK, TOIL)
- Different statuses (PENDING, APPROVED)
- Approved requests include approver name and timestamp

## Differences from Prisma Version

1. **Field Names**: Uses snake_case (e.g., `user_id`, `start_date`) instead of camelCase
2. **Timestamps**: Converted to ISO string format for Supabase
3. **Upsert**: Manual upsert logic (check-then-update/insert) vs Prisma's built-in upsert
4. **Count Queries**: Uses Supabase's count API instead of Prisma's count()
5. **Additional Fields**: Includes `reason` field for leave requests (required by schema)

## Troubleshooting

### "Missing Supabase credentials" Error
Ensure your `.env.local` file contains valid Supabase credentials.

### "relation does not exist" Error
Run the Supabase migrations first:
```bash
# Using Supabase CLI
supabase migration up

# Or manually execute SQL files in Supabase dashboard
```

### Permission Errors
Ensure you're using the **Service Role Key** (not the anon key) which bypasses Row Level Security for seeding operations.

## Next Steps

After seeding:
1. Log in to the app with any seeded user credentials
2. Test leave request functionality
3. Verify admin and user role permissions
4. Check leave balance calculations

## Related Files

- `supabase/migrations/001_initial_schema.sql` - Database schema
- `supabase/migrations/002_row_level_security.sql` - Security policies
- `prisma/seed.ts` - Original Prisma seed script (for comparison)
