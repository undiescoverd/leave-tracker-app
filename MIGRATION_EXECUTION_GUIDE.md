# Supabase Account Migration - Execution Guide

This guide provides step-by-step instructions to complete the Supabase account migration.

## Current Status

✅ **Phase 1 Complete**: New Supabase account created with dev and prod projects
✅ **Phase 2 Ready**: Schema migration files prepared
✅ **Phase 3 Ready**: Migration and validation scripts created
✅ **Phase 4 Complete**: Environment configuration files created
✅ **Phase 5 Ready**: Vercel configuration documented

## Prerequisites Checklist

Before proceeding, ensure you have:
- [x] Created new Supabase account
- [x] Created dev project: `leave-tracker-dev`
- [x] Created prod project: `leave-tracker-prod`
- [x] Collected publishable keys for both projects
- [x] Collected secret keys for both projects
- [x] Added secret keys to environment files

## Step-by-Step Execution

### STEP 1: Add Secret Keys to Environment Files

**Action Required**: Add your Supabase secret keys to the environment configuration files.

#### 1.1 Dev Environment

Edit `.env.development.local` and replace this line:

```bash
SUPABASE_SECRET_KEY="ADD_YOUR_DEV_SECRET_KEY_HERE"
```

With your actual dev project secret key:

```bash
SUPABASE_SECRET_KEY="sb_secret_YOUR_DEV_KEY_HERE"
```

**Where to find it:**
1. Go to https://supabase.com/dashboard
2. Select project: `leave-tracker-dev`
3. Settings → API
4. Copy the `secret key` (starts with `sb_secret_...`)

#### 1.2 Prod Environment

Edit `.env.production.local` and replace this line:

```bash
SUPABASE_SECRET_KEY="ADD_YOUR_PROD_SECRET_KEY_HERE"
```

With your actual prod project secret key:

```bash
SUPABASE_SECRET_KEY="sb_secret_YOUR_PROD_KEY_HERE"
```

**Where to find it:**
1. Go to https://supabase.com/dashboard
2. Select project: `leave-tracker-prod`
3. Settings → API
4. Copy the `secret key` (starts with `sb_secret_...`)

---

### STEP 2: Apply Database Schema to Both Projects

Follow the comprehensive guide in `SCHEMA_APPLICATION_GUIDE.md` to apply the database schema.

#### Quick Summary:

**For Dev Project:**
```bash
# 1. Open Supabase Dashboard → leave-tracker-dev → SQL Editor
# 2. Run migrations in order:
#    - supabase/migrations/001_initial_schema.sql
#    - supabase/migrations/002_row_level_security.sql
#    - supabase/migrations/003_enable_realtime.sql
#    - supabase/migrations/004_expand_role_enum.sql
# 3. Verify all tables created successfully
```

**For Prod Project:**
```bash
# 1. Open Supabase Dashboard → leave-tracker-prod → SQL Editor
# 2. Run same migrations in order (001 → 004)
# 3. Verify all tables created successfully
```

**Verification:**
Run this query in both projects to verify:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'leave_requests', 'toil_entries');

-- Should return 3 rows (users, leave_requests, toil_entries)
```

---

### STEP 3: Migrate Data to Dev Project

#### 3.1 Dry Run (Recommended)

First, run a dry run to see what will happen:

```bash
npm run migrate:data -- --target=dev --dry-run
```

This will:
- ✅ Connect to old and new projects
- ✅ Show how many records will be migrated
- ❌ NOT actually write any data

**Expected Output:**
```
🔄 Supabase Data Migration
========================
Source: https://cbnxzhxtbebattgojiaw.supabase.co
Target: https://koofwbtzrxvqmjlcstqo.supabase.co (dev)
Mode: DRY RUN

📊 Migrating table: users
──────────────────────────────────────────────────
✅ Fetched X rows from source
🔍 DRY RUN: Would insert X rows
...
```

#### 3.2 Live Migration to Dev

Once you're confident, run the actual migration:

```bash
npm run migrate:data -- --target=dev
```

**⚠️ WARNING**: This will DELETE all existing data in the dev project!

The script will:
1. Validate target schema
2. Wait 5 seconds for confirmation
3. Clear existing data
4. Migrate users → leave_requests → toil_entries
5. Verify migration

**Expected Duration**: 1-5 minutes (depending on data size)

#### 3.3 Validate Dev Migration

Run validation to ensure data integrity:

```bash
npm run validate:migration -- --target=dev
```

This will:
- ✅ Compare record counts
- ✅ Check for missing/extra records
- ✅ Validate foreign key integrity
- ✅ Verify RLS policies

**Expected Output:**
```
✅ users
   Source: X | Target: X
✅ leave_requests
   Source: X | Target: X
✅ toil_entries
   Source: X | Target: X

✅ All validations PASSED
Migration is successful and data integrity is intact
```

---

### STEP 4: Migrate Data to Prod Project

Repeat the same process for the prod project:

#### 4.1 Dry Run
```bash
npm run migrate:data -- --target=prod --dry-run
```

#### 4.2 Live Migration
```bash
npm run migrate:data -- --target=prod
```

#### 4.3 Validate
```bash
npm run validate:migration -- --target=prod
```

---

### STEP 5: Update Local Development Environment

Update your local `.env.local` to use the NEW dev project:

```bash
# Backup current .env.local (optional)
cp .env.local .env.local.old-project

# Copy dev configuration to .env.local
cp .env.development.local .env.local
```

Or manually update `.env.local`:

```bash
# Update these three lines in .env.local:
NEXT_PUBLIC_SUPABASE_URL="https://koofwbtzrxvqmjlcstqo.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_yUuQZvH1zYdhnpji0n2GFA_r__0qVkS"
SUPABASE_SECRET_KEY="sb_secret_YOUR_DEV_KEY"
```

---

### STEP 6: Test Local Development

#### 6.1 Clean and Restart
```bash
npm run dev:clean
```

#### 6.2 Test Critical Paths

Open http://localhost:3000 and test:

- [ ] User login
- [ ] View leave requests
- [ ] Create new leave request
- [ ] Approve/reject leave (admin)
- [ ] TOIL operations
- [ ] Realtime updates (open in two tabs)

#### 6.3 Check Console for Errors

Monitor the terminal for any Supabase connection errors:

```bash
# Should see:
🔧 Environment Configuration:
- Environment: development
- Database: ✅ Connected
- Authentication: ✅ Configured
```

---

### STEP 7: Configure Vercel Environment Variables

#### 7.1 Development Environment

In Vercel Dashboard → Settings → Environment Variables → Development:

```bash
NEXT_PUBLIC_SUPABASE_URL = https://koofwbtzrxvqmjlcstqo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = sb_publishable_yUuQZvH1zYdhnpji0n2GFA_r__0qVkS
SUPABASE_SECRET_KEY = [YOUR_DEV_SECRET_KEY]

# Keep all other existing environment variables
NEXTAUTH_SECRET = [existing value]
NEXTAUTH_URL = [existing value]
RESEND_API_KEY = [existing value]
# ... etc
```

#### 7.2 Production Environment

In Vercel Dashboard → Settings → Environment Variables → Production:

```bash
NEXT_PUBLIC_SUPABASE_URL = https://gnnyeoobrsdrdccupkcg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = sb_publishable_-j7_edHNe-AUcBy1zTaUcw_HrmDDNHq
SUPABASE_SECRET_KEY = [YOUR_PROD_SECRET_KEY]

# IMPORTANT: Update these for production
NEXTAUTH_URL = https://your-production-url.vercel.app
NEXTAUTH_SECRET = [GENERATE_NEW_WITH: openssl rand -base64 32]

# Keep all other existing environment variables
RESEND_API_KEY = [existing value]
EMAIL_FROM = noreply@tdhagency.com
# ... etc
```

#### 7.3 Redeploy

After updating environment variables:

```bash
# Trigger redeploy via Vercel dashboard or:
git commit --allow-empty -m "redeploy: update Supabase configuration"
git push
```

---

### STEP 8: Test Vercel Deployments

#### 8.1 Test Preview Deployment (Dev)

1. Create a new branch:
   ```bash
   git checkout -b test/new-supabase-dev
   git push origin test/new-supabase-dev
   ```

2. Open the Vercel preview URL

3. Test the same critical paths as local development

4. Verify it's using the dev Supabase project:
   - Check browser DevTools → Network → look for `koofwbtzrxvqmjlcstqo.supabase.co`

#### 8.2 Test Production Deployment

1. Merge to main/master:
   ```bash
   git checkout master
   git merge test/new-supabase-dev
   git push origin master
   ```

2. Open the production URL

3. Test the same critical paths

4. Verify it's using the prod Supabase project:
   - Check browser DevTools → Network → look for `gnnyeoobrsdrdccupkcg.supabase.co`

---

## Troubleshooting

### Issue: Migration fails with "schema validation failed"

**Solution:**
- Ensure all migration SQL files were run in order (001 → 004)
- Check Supabase dashboard → Table Editor to verify tables exist
- Re-run migrations if needed

### Issue: "Missing SUPABASE_SECRET_KEY" error

**Solution:**
- Verify secret key is added to `.env.development.local` or `.env.production.local`
- Check there are no typos in the environment variable name
- Restart dev server after adding keys

### Issue: Data counts don't match in validation

**Solution:**
- Run validation with `--detailed` flag:
  ```bash
  npm run validate:migration -- --target=dev --detailed
  ```
- Check for specific missing/extra IDs
- Re-run migration if needed

### Issue: Local dev works but Vercel deployment fails

**Solution:**
- Verify Vercel environment variables are set correctly
- Check Vercel deployment logs for specific errors
- Ensure environment is set to correct tier (development vs production)

### Issue: Realtime not working

**Solution:**
- Verify migration `003_enable_realtime.sql` was run
- Check Supabase dashboard → Database → Replication
- Ensure all 3 tables have realtime enabled

---

## Rollback Plan

If you need to rollback to the old Supabase project:

### Quick Rollback (Local)

```bash
# Restore old .env.local
cp .env.local.old-project .env.local

# Or manually update:
NEXT_PUBLIC_SUPABASE_URL="https://cbnxzhxtbebattgojiaw.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_mevAUJgE18kaSCRs2a1Kng_f4es6wp5"
SUPABASE_SECRET_KEY="sb_secret_CWrhbPiAtA7K1EiAnyPoJg_S9EEhg6c"

# Restart
npm run dev:clean
```

### Rollback Vercel

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Update variables back to old Supabase project URLs/keys
3. Redeploy

---

## Success Criteria

✅ All items should be checked before considering migration complete:

**Schema:**
- [ ] All migrations applied to dev project
- [ ] All migrations applied to prod project
- [ ] Tables verified in both projects
- [ ] Realtime enabled on all tables

**Data:**
- [ ] Data migrated to dev project
- [ ] Data validated in dev project (counts match)
- [ ] Data migrated to prod project
- [ ] Data validated in prod project (counts match)

**Environment:**
- [ ] Local development using new dev project
- [ ] No errors in local dev console
- [ ] All features working locally

**Deployment:**
- [ ] Vercel development environment variables updated
- [ ] Vercel production environment variables updated
- [ ] Preview deployments tested and working
- [ ] Production deployment tested and working

**Cleanup:**
- [ ] Old Supabase project kept as backup (do not delete yet)
- [ ] Migration scripts tested and documented
- [ ] Team notified of changes

---

## Next Steps After Migration

1. **Monitor for 1 week**: Keep old Supabase project active as backup
2. **Update documentation**: Ensure all team docs reference new projects
3. **After 30 days**: Archive/delete old Supabase project if no issues
4. **Future migrations**: Keep migration scripts for reference

---

## Files Created/Modified

### New Files:
- ✅ `SCHEMA_APPLICATION_GUIDE.md` - Schema application instructions
- ✅ `MIGRATION_EXECUTION_GUIDE.md` - This file
- ✅ `.env.development.local` - Dev environment config
- ✅ `.env.production.local` - Prod environment config
- ✅ `scripts/migrate-supabase-data.ts` - Migration script
- ✅ `scripts/validate-supabase-migration.ts` - Validation script

### Modified Files:
- ✅ `src/lib/env.ts` - Added support for new Supabase key naming
- ✅ `package.json` - Added migration scripts

### Existing Files (No changes needed):
- ✅ `src/lib/supabase.ts` - Already supports both old and new keys
- ✅ `supabase/migrations/*.sql` - Ready to apply to new projects

---

## Support

If you encounter any issues during migration:

1. Check the troubleshooting section above
2. Review Supabase dashboard logs
3. Check Vercel deployment logs
4. Run validation scripts with `--detailed` flag for more info
5. Rollback if critical issues occur

---

**Last Updated**: 2024-12-21
**Migration Version**: 1.0
**Estimated Total Time**: 2-3 hours (including testing)
