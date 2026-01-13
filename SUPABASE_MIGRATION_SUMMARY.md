# Supabase Account Migration - Summary & Next Steps

## 🎉 Migration Setup Complete!

All infrastructure and scripts have been prepared for migrating from your current Supabase account to a new account with separate dev and prod projects.

## 📊 What Has Been Done

### ✅ Phase 1: Account Setup (COMPLETE)
- [x] New Supabase account structure planned
- [x] Dev project created: `leave-tracker-dev` (koofwbtzrxvqmjlcstqo)
- [x] Prod project created: `leave-tracker-prod` (gnnyeoobrsdrdccupkcg)
- [x] API keys collected for both projects

### ✅ Phase 2: Code Infrastructure (COMPLETE)
- [x] Updated `src/lib/env.ts` to support new Supabase key naming
- [x] Verified `src/lib/supabase.ts` supports both old and new keys
- [x] Created `.env.development.local` for dev project configuration
- [x] Created `.env.production.local` for prod project configuration

### ✅ Phase 3: Migration Scripts (COMPLETE)
- [x] Created `scripts/migrate-supabase-data.ts` - Data migration tool
- [x] Created `scripts/validate-supabase-migration.ts` - Data validation tool
- [x] Added npm scripts to package.json:
  - `npm run migrate:data -- --target=dev/prod`
  - `npm run validate:migration -- --target=dev/prod`

### ✅ Phase 4: Documentation (COMPLETE)
- [x] Created `MIGRATION_EXECUTION_GUIDE.md` - Step-by-step execution instructions
- [x] Created `SCHEMA_APPLICATION_GUIDE.md` - Database schema setup guide
- [x] Created `VERCEL_ENVIRONMENT_SETUP.md` - Vercel configuration reference
- [x] Updated `DEPLOYMENT_GUIDE.md` with migration references

## 📋 What You Need to Do Next

Follow these steps **in order** to complete the migration:

### Step 1: Add Secret Keys ⏱️ ~5 minutes

1. Get dev secret key:
   - Go to https://supabase.com/dashboard
   - Select `leave-tracker-dev`
   - Settings → API → Copy `secret key`

2. Update `.env.development.local`:
   ```bash
   SUPABASE_SECRET_KEY="sb_secret_YOUR_DEV_KEY_HERE"
   ```

3. Get prod secret key:
   - Select `leave-tracker-prod`
   - Settings → API → Copy `secret key`

4. Update `.env.production.local`:
   ```bash
   SUPABASE_SECRET_KEY="sb_secret_YOUR_PROD_KEY_HERE"
   ```

### Step 2: Apply Database Schema ⏱️ ~15 minutes

Follow `SCHEMA_APPLICATION_GUIDE.md` to:

1. Apply migrations to **dev project**:
   - Open Supabase SQL Editor
   - Run migrations 001 → 004 in order
   - Verify tables created

2. Apply migrations to **prod project**:
   - Open Supabase SQL Editor
   - Run migrations 001 → 004 in order
   - Verify tables created

### Step 3: Migrate Data ⏱️ ~30 minutes

Follow `MIGRATION_EXECUTION_GUIDE.md` to:

1. **Dev migration**:
   ```bash
   # Dry run first (recommended)
   npm run migrate:data -- --target=dev --dry-run

   # Live migration
   npm run migrate:data -- --target=dev

   # Validate
   npm run validate:migration -- --target=dev
   ```

2. **Prod migration**:
   ```bash
   # Dry run first (recommended)
   npm run migrate:data -- --target=prod --dry-run

   # Live migration
   npm run migrate:data -- --target=prod

   # Validate
   npm run validate:migration -- --target=prod
   ```

### Step 4: Test Local Development ⏱️ ~15 minutes

1. Update your `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL="https://koofwbtzrxvqmjlcstqo.supabase.co"
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_yUuQZvH1zYdhnpji0n2GFA_r__0qVkS"
   SUPABASE_SECRET_KEY="[YOUR_DEV_SECRET_KEY]"
   ```

2. Restart development server:
   ```bash
   npm run dev:clean
   ```

3. Test all features:
   - User login
   - View/create leave requests
   - TOIL operations
   - Admin functions
   - Realtime updates

### Step 5: Update Vercel Environment Variables ⏱️ ~20 minutes

Follow `VERCEL_ENVIRONMENT_SETUP.md` to:

1. Update **Development** environment variables
2. Update **Production** environment variables
3. Trigger redeployment

### Step 6: Test Deployments ⏱️ ~30 minutes

1. Test preview deployment:
   ```bash
   git checkout -b test/new-supabase
   git push origin test/new-supabase
   # Test preview URL
   ```

2. Test production deployment:
   ```bash
   git checkout master
   git merge test/new-supabase
   git push origin master
   # Test production URL
   ```

## 📁 Files Created

### Configuration Files
- ✅ `.env.development.local` - Dev environment config (secret key needed)
- ✅ `.env.production.local` - Prod environment config (secret key needed)

### Migration Scripts
- ✅ `scripts/migrate-supabase-data.ts` - Data migration
- ✅ `scripts/validate-supabase-migration.ts` - Data validation

### Documentation
- ✅ `MIGRATION_EXECUTION_GUIDE.md` - Complete execution guide (⭐ START HERE)
- ✅ `SCHEMA_APPLICATION_GUIDE.md` - Schema setup guide
- ✅ `VERCEL_ENVIRONMENT_SETUP.md` - Vercel config reference
- ✅ `SUPABASE_MIGRATION_SUMMARY.md` - This file

### Modified Files
- ✅ `src/lib/env.ts` - Added new Supabase key support
- ✅ `DEPLOYMENT_GUIDE.md` - Added migration references
- ✅ `package.json` - Added migration npm scripts

## 🎯 Quick Start Checklist

Use this checklist to track your progress:

```markdown
Phase 1: Preparation
- [ ] Add dev secret key to .env.development.local
- [ ] Add prod secret key to .env.production.local

Phase 2: Schema Setup
- [ ] Apply migrations to dev project (001 → 004)
- [ ] Apply migrations to prod project (001 → 004)
- [ ] Verify tables in both projects

Phase 3: Data Migration
- [ ] Dry run migration to dev
- [ ] Live migration to dev
- [ ] Validate dev migration
- [ ] Dry run migration to prod
- [ ] Live migration to prod
- [ ] Validate prod migration

Phase 4: Local Testing
- [ ] Update .env.local with dev project
- [ ] Test local development
- [ ] Verify all features work

Phase 5: Deployment
- [ ] Update Vercel dev environment variables
- [ ] Update Vercel prod environment variables
- [ ] Test preview deployment
- [ ] Test production deployment

Phase 6: Cleanup
- [ ] Keep old Supabase project as backup (30 days)
- [ ] Update team documentation
- [ ] Monitor for issues (1 week)
```

## 🔧 Available Commands

### Data Migration
```bash
# Migrate to dev (dry run)
npm run migrate:data -- --target=dev --dry-run

# Migrate to dev (live)
npm run migrate:data -- --target=dev

# Migrate to prod (live)
npm run migrate:data -- --target=prod
```

### Data Validation
```bash
# Validate dev migration
npm run validate:migration -- --target=dev

# Validate prod migration (detailed)
npm run validate:migration -- --target=prod --detailed
```

### Development
```bash
# Start dev server (clean)
npm run dev:clean

# Type check
npm run typecheck

# Run tests
npm test
```

## 📚 Documentation Index

| Document | Purpose | When to Use |
|----------|---------|-------------|
| `MIGRATION_EXECUTION_GUIDE.md` | Complete step-by-step guide | ⭐ **Start here** |
| `SCHEMA_APPLICATION_GUIDE.md` | Database schema setup | When applying SQL migrations |
| `VERCEL_ENVIRONMENT_SETUP.md` | Environment variable config | When updating Vercel |
| `SUPABASE_MIGRATION_SUMMARY.md` | Overview and checklist | **This file** - quick reference |

## ⚠️ Important Notes

### Security
- **Never commit secret keys to git**
- Use different secret keys for dev and prod
- Keep old Supabase project as backup (30 days minimum)

### Rollback Plan
If issues occur, you can instantly rollback by:
1. Reverting `.env.local` to old Supabase credentials
2. Reverting Vercel environment variables
3. Old project remains active and unchanged

### Support
If you encounter issues:
1. Check the troubleshooting section in `MIGRATION_EXECUTION_GUIDE.md`
2. Run validation with `--detailed` flag for diagnostics
3. Review Supabase dashboard logs
4. Check Vercel deployment logs

## 🎓 Key Concepts

### Environment Separation
- **Dev Project** → Local development + Vercel preview deployments
- **Prod Project** → Vercel production deployments
- **Old Project** → Backup (do not delete for 30 days)

### Environment Variables
- **Publishable Key** → Client-side (safe to expose)
- **Secret Key** → Server-side only (NEVER expose)
- **Both Naming Conventions Supported**:
  - New: `PUBLISHABLE_KEY` / `SECRET_KEY` (recommended)
  - Legacy: `ANON_KEY` / `SERVICE_ROLE_KEY` (still works)

### Data Flow
```
Old Supabase Project
        ↓
  [Migration Script]
        ↓
Dev Project ← Local Dev
        ↓
Prod Project ← Vercel Production
```

## ✅ Success Criteria

Migration is complete when:
- [x] All setup scripts and docs created ← **DONE**
- [ ] Secret keys added to environment files
- [ ] Schema applied to dev and prod projects
- [ ] Data migrated and validated in both projects
- [ ] Local development works with new dev project
- [ ] Vercel deployments work with correct projects
- [ ] All tests pass
- [ ] Team notified of changes

## 📞 Next Steps

**Ready to begin?** Start with:

1. **Read**: `MIGRATION_EXECUTION_GUIDE.md`
2. **Add Keys**: Update `.env.development.local` and `.env.production.local`
3. **Apply Schema**: Follow `SCHEMA_APPLICATION_GUIDE.md`
4. **Migrate Data**: Run migration scripts
5. **Test**: Verify everything works
6. **Deploy**: Update Vercel and redeploy

---

**Estimated Total Time**: 2-3 hours
**Risk Level**: Low (old project remains as backup)
**Rollback Time**: < 5 minutes

**Questions?** Refer to the comprehensive guides or check the troubleshooting sections.

---

**Last Updated**: 2024-12-21
**Migration Version**: 1.0
**Status**: ✅ Infrastructure Ready - Awaiting Execution
