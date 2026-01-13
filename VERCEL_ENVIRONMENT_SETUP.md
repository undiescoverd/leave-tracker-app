# Vercel Environment Variables Setup Guide

Quick reference for setting up Vercel environment variables for the new Supabase dev/prod projects.

## Overview

After migrating to the new Supabase account with separate dev and prod projects, you need to update Vercel environment variables to ensure deployments connect to the correct Supabase projects.

## Accessing Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your project: `leave-tracker-app`
3. Click **Settings**
4. Click **Environment Variables** (left sidebar)

## Environment Variable Configuration

### Development Environment

These variables are used for **preview deployments** and **development branches**.

Click **"Add Another"** and set these variables with scope **Development**:

```bash
Variable Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://koofwbtzrxvqmjlcstqo.supabase.co
Scope: ✅ Development

Variable Name: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
Value: sb_publishable_yUuQZvH1zYdhnpji0n2GFA_r__0qVkS
Scope: ✅ Development

Variable Name: SUPABASE_SECRET_KEY
Value: [YOUR_DEV_SECRET_KEY_FROM_SUPABASE_DASHBOARD]
Scope: ✅ Development
```

### Production Environment

These variables are used for **production deployments** (main/master branch).

Click **"Add Another"** and set these variables with scope **Production**:

```bash
Variable Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://gnnyeoobrsdrdccupkcg.supabase.co
Scope: ✅ Production

Variable Name: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
Value: sb_publishable_-j7_edHNe-AUcBy1zTaUcw_HrmDDNHq
Scope: ✅ Production

Variable Name: SUPABASE_SECRET_KEY
Value: [YOUR_PROD_SECRET_KEY_FROM_SUPABASE_DASHBOARD]
Scope: ✅ Production
```

### Other Required Environment Variables

**IMPORTANT**: You must also set these existing environment variables (keep their current values):

#### All Environments (Development + Production + Preview)

```bash
# Authentication
NEXTAUTH_SECRET=[existing value or generate new for production]
NEXTAUTH_URL=[http://localhost:3000 for dev, production URL for prod]

# Email Configuration
RESEND_API_KEY=[existing value]
EMAIL_FROM=[onboarding@resend.dev for dev, noreply@tdhagency.com for prod]
EMAIL_REPLY_TO=[existing value]
ENABLE_EMAIL_NOTIFICATIONS=true

# Email Limits
EMAIL_RATE_LIMIT_PER_HOUR=50
EMAIL_RETRY_ATTEMPTS=3
EMAIL_TIMEOUT_MS=30000

# Feature Flags
NEXT_PUBLIC_TOIL_ENABLED=true
NEXT_PUBLIC_TOIL_REQUEST=true
NEXT_PUBLIC_TOIL_ADMIN=true
NEXT_PUBLIC_SICK_LEAVE=true

# Business Configuration
ANNUAL_LEAVE_ALLOWANCE=32
SICK_LEAVE_ALLOWANCE=10
TOIL_HOURS_ALLOWANCE=40

# UK Agent Configuration
UK_AGENT_EMAILS=sup@tdhagency.com,luis@tdhagency.com
UK_REQUIRE_COVERAGE=true

# Leave Request Rules
MAX_LEAVE_REQUEST_DAYS_AHEAD=365
MIN_LEAVE_REQUEST_DAYS_AHEAD=0
ALLOW_WEEKEND_LEAVE_REQUESTS=false
MAX_CONSECUTIVE_LEAVE_DAYS=21

# Monitoring (Production)
HEALTH_CHECK_TOKEN=[secure random token for production]
LOG_LEVEL=warn
METRICS_ENABLED=true
VERBOSE_LOGGING=false
```

## Step-by-Step Instructions

### Step 1: Backup Current Settings (Recommended)

Before making changes:

1. In Vercel Dashboard → Environment Variables
2. Take a screenshot or note down current Supabase variables
3. This allows easy rollback if needed

### Step 2: Update Supabase Variables

#### Option A: Edit Existing Variables (Recommended)

1. Find existing `NEXT_PUBLIC_SUPABASE_URL` variable
2. Click the **three dots** (⋯) → **Edit**
3. Update the value based on environment:
   - **Development**: `https://koofwbtzrxvqmjlcstqo.supabase.co`
   - **Production**: `https://gnnyeoobrsdrdccupkcg.supabase.co`
4. Click **Save**
5. Repeat for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`

#### Option B: Delete and Recreate

1. Delete old Supabase variables (ones pointing to old project)
2. Add new variables as shown above
3. Ensure correct scopes are selected

### Step 3: Handle Legacy Variables

If you have these legacy variables, you can keep or delete them:

```bash
# These are deprecated but still supported
NEXT_PUBLIC_SUPABASE_ANON_KEY  (replaced by NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
SUPABASE_SERVICE_ROLE_KEY  (replaced by SUPABASE_SECRET_KEY)
DATABASE_URL  (no longer needed - we're fully on Supabase)
```

**Recommendation**: Delete legacy variables after confirming new ones work.

### Step 4: Verify Configuration

After updating variables:

1. Check you have **3 Supabase variables per environment**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`

2. Verify scopes are correct:
   - Development variables → ✅ Development
   - Production variables → ✅ Production

### Step 5: Trigger Redeployment

Environment variable changes don't automatically redeploy. You must trigger a new deployment:

#### Method 1: Via Vercel Dashboard
1. Go to **Deployments** tab
2. Find latest deployment
3. Click **three dots** (⋯) → **Redeploy**
4. Select **Use existing Build Cache** → **Redeploy**

#### Method 2: Via Git Push
```bash
# Create empty commit to trigger deploy
git commit --allow-empty -m "chore: update environment variables for new Supabase projects"
git push
```

## Getting Supabase Secret Keys

### Dev Project Secret Key

1. Go to https://supabase.com/dashboard
2. Select project: `leave-tracker-dev`
3. Click **Settings** (gear icon)
4. Click **API** (left sidebar)
5. Scroll to **Project API keys**
6. Find **`secret key`** (NOT anon/publishable key)
7. Click **Copy** (starts with `sb_secret_...`)

### Prod Project Secret Key

1. Go to https://supabase.com/dashboard
2. Select project: `leave-tracker-prod`
3. Click **Settings** (gear icon)
4. Click **API** (left sidebar)
5. Scroll to **Project API keys**
6. Find **`secret key`** (NOT anon/publishable key)
7. Click **Copy** (starts with `sb_secret_...`)

**⚠️ SECURITY WARNING**: Never commit secret keys to git or share publicly!

## Verification Checklist

After setup, verify everything is working:

### Development Deployment Verification

1. Push to a feature branch:
   ```bash
   git checkout -b test/verify-dev-supabase
   git push origin test/verify-dev-supabase
   ```

2. Open Vercel preview URL

3. Open browser DevTools → Network tab

4. Verify API calls go to: `koofwbtzrxvqmjlcstqo.supabase.co`

5. Test:
   - [ ] User login works
   - [ ] Can view leave requests
   - [ ] Can create new leave request
   - [ ] Realtime updates work

### Production Deployment Verification

1. Merge to main/master and push:
   ```bash
   git checkout master
   git merge test/verify-dev-supabase
   git push origin master
   ```

2. Open production URL

3. Open browser DevTools → Network tab

4. Verify API calls go to: `gnnyeoobrsdrdccupkcg.supabase.co`

5. Test same critical paths as dev

## Troubleshooting

### Issue: Deployment still uses old Supabase project

**Cause**: Environment variables not updated or deployment not redeployed

**Solution**:
1. Verify variables are set correctly in Vercel dashboard
2. Check the variable scope matches the environment
3. Trigger a new deployment (don't use cached build)

### Issue: "Missing environment variable" error in deployment logs

**Cause**: Variable name typo or not set for the correct environment

**Solution**:
1. Check Vercel deployment logs for exact variable name
2. Ensure variable exists with correct name (case-sensitive)
3. Verify scope includes the failing environment

### Issue: Secret key exposed in client-side code

**Cause**: Using `NEXT_PUBLIC_` prefix on secret key

**Solution**:
- Secret key must be: `SUPABASE_SECRET_KEY` (NO `NEXT_PUBLIC_` prefix)
- Publishable key should be: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (WITH `NEXT_PUBLIC_` prefix)

### Issue: Preview deployment uses production Supabase

**Cause**: Variable scope is set to "Production" instead of "Development"

**Solution**:
1. Edit the variable
2. Change scope to include "Development"
3. Redeploy preview branch

## Environment Variable Priority

Vercel applies environment variables in this order (later overrides earlier):

1. **.env** (committed to repo) - NEVER commit secrets here
2. **.env.local** (gitignored) - Local development only
3. **.env.development.local** (gitignored) - Local development only
4. **.env.production.local** (gitignored) - Local production testing only
5. **Vercel Dashboard** - Applied during deployment ← **YOU ARE HERE**

## Quick Reference Table

| Environment | Supabase Project | Project ID | Supabase URL |
|------------|-----------------|------------|--------------|
| Development | leave-tracker-dev | koofwbtzrxvqmjlcstqo | https://koofwbtzrxvqmjlcstqo.supabase.co |
| Production | leave-tracker-prod | gnnyeoobrsdrdccupkcg | https://gnnyeoobrsdrdccupkcg.supabase.co |

## Security Best Practices

✅ **DO**:
- Store secret keys only in Vercel environment variables
- Use different secret keys for dev and prod
- Limit access to Vercel project settings
- Rotate secret keys periodically

❌ **DON'T**:
- Commit secret keys to git
- Use same secret key for dev and prod
- Share secret keys in Slack/email
- Use `NEXT_PUBLIC_` prefix on secret keys

---

**Last Updated**: 2024-12-21
**Related Guides**: MIGRATION_EXECUTION_GUIDE.md, SCHEMA_APPLICATION_GUIDE.md
