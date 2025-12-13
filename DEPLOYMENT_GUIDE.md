# Deployment Guide - Supabase Migration

## Overview

This guide covers deploying the Leave Tracker App after the successful migration from Prisma to Supabase. The application now uses Supabase for database, authentication, and realtime features.

## Prerequisites

### Required Accounts
- [x] **Supabase Account** - https://supabase.com
- [x] **Vercel Account** (or preferred hosting provider)
- [x] **GitHub Account** (for CI/CD)

### Required Tools
- Node.js 18+ and npm/pnpm/yarn
- Git
- Supabase CLI (optional but recommended)

## Supabase Setup

### 1. Create Supabase Project

```bash
# Visit https://app.supabase.com
# Click "New Project"
# Enter:
#   - Project Name: leave-tracker-app (or your choice)
#   - Database Password: (generate strong password)
#   - Region: (choose closest to users)
#   - Click "Create new project"
```

### 2. Run Database Migrations

Navigate to SQL Editor in Supabase Dashboard:

```sql
-- Step 1: Run initial schema
-- Copy and paste contents of: supabase/migrations/001_initial_schema.sql
-- Execute

-- Step 2: Run RLS policies
-- Copy and paste contents of: supabase/migrations/002_row_level_security.sql
-- Execute

-- Step 3: Verify tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
-- Should show: users, leave_requests, toil_entries
```

### 3. Enable Realtime

In Supabase Dashboard:
1. Go to **Database** → **Replication**
2. Enable realtime for these tables:
   - [x] `users`
   - [x] `leave_requests`
   - [x] `toil_entries`
3. Save changes

### 4. Collect API Credentials

From Supabase Dashboard → **Settings** → **API**:

```bash
# Note these values (needed for environment variables):
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Security Note**:
- `ANON_KEY` is safe to expose publicly (client-side)
- `SERVICE_ROLE_KEY` must be kept secret (server-side only)

## Environment Configuration

### Development Environment

Create `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_random_32_char_string

# Optional: Email Notifications
ENABLE_EMAIL_NOTIFICATIONS=false
EMAIL_FROM=noreply@yourapp.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### Production Environment

**Vercel Deployment**:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables

2. Add these variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key
   SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
   NEXTAUTH_URL = https://your-app.vercel.app
   NEXTAUTH_SECRET = your_production_secret
   ```

3. Optional email variables if enabling notifications

4. Redeploy application

**Other Hosting Providers**:

Set the same environment variables in your hosting provider's dashboard:
- Railway: Settings → Variables
- Render: Environment → Environment Variables
- Netlify: Site settings → Build & deploy → Environment

## Database Seeding

### Initial Data Setup

After migrations are complete, seed the database with initial users:

```bash
# Install dependencies
npm install

# Run seed script
npx tsx supabase/seed.supabase.ts
```

This creates:
- 2 admin users (admin@example.com, manager@example.com)
- 2 regular users (john@example.com, jane@example.com)
- 4 sample leave requests
- Default password for all users: `Password123!`

**Production Seeding**:

For production, modify `supabase/seed.supabase.ts` to:
1. Use strong, unique passwords
2. Use real email addresses
3. Remove sample leave requests
4. Create actual admin accounts

### Manual User Creation

Alternatively, create users via Supabase Dashboard:

```sql
-- Create admin user
INSERT INTO users (email, name, password, role, annual_leave_balance, toil_balance, sick_leave_balance)
VALUES (
  'admin@yourcompany.com',
  'Admin User',
  '$2a$12$hashedPasswordHere', -- Use bcrypt to hash password
  'ADMIN',
  32,
  0,
  3
);
```

Generate hashed password:
```bash
# Using Node.js
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YourPassword', 12));"
```

## Application Deployment

### Vercel (Recommended)

**Quick Deploy**:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from local
cd /path/to/leave-tracker-app
vercel

# Follow prompts:
# - Link to existing project? (Y/N)
# - Project name?
# - Deploy to production? (Y)
```

**GitHub Integration**:

1. Push code to GitHub
2. Visit vercel.com → Import Project
3. Select repository
4. Configure environment variables
5. Deploy

**Automatic Deployments**:
- Push to `master` → Production deployment
- Push to other branches → Preview deployments

### Alternative Providers

**Railway**:
```bash
railway login
railway init
railway up
```

**Render**:
```bash
# Connect GitHub repo in Render dashboard
# Set build command: npm run build
# Set start command: npm start
```

**Netlify**:
```bash
netlify deploy --prod
```

## Post-Deployment Verification

### Health Check

Visit your deployed URL:
```bash
https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-14T...",
  "database": {
    "status": "connected",
    "details": {
      "provider": "Supabase (PostgreSQL)"
    }
  },
  "environment": {
    "node_version": "v18.x.x",
    "deployment_platform": "vercel"
  }
}
```

### Manual Testing Checklist

- [ ] **User Registration**
  - Navigate to `/register`
  - Create new account
  - Verify user appears in Supabase dashboard

- [ ] **User Login**
  - Navigate to `/login`
  - Login with created account
  - Verify dashboard loads

- [ ] **Leave Request Creation**
  - Create new leave request
  - Verify appears in Supabase `leave_requests` table
  - Verify status is `PENDING`

- [ ] **Admin Approval**
  - Login as admin user
  - Approve pending request
  - Verify status changes to `APPROVED`
  - Verify user's balance updated

- [ ] **Realtime Features** (if integrated)
  - Open two browser windows
  - Create request in one
  - Verify notification appears in other

- [ ] **Balance Calculations**
  - Note current balance
  - Approve 5-day leave
  - Verify balance reduced correctly

### Performance Benchmarks

Test API response times:

```bash
# Install k6
brew install k6  # macOS
# or download from k6.io

# Run load test
k6 run load-test.js
```

Expected performance (from `TESTING_GUIDE.md`):
- GET /api/leave/balance: < 200ms
- POST /api/leave/request: < 300ms
- GET /api/admin/pending-requests: < 400ms

### Database Integrity

Run integrity checks in Supabase SQL Editor:

```sql
-- No orphaned leave requests
SELECT COUNT(*) FROM leave_requests lr
LEFT JOIN users u ON lr.user_id = u.id
WHERE u.id IS NULL;
-- Expected: 0

-- All users have balances
SELECT COUNT(*) FROM users
WHERE annual_leave_balance IS NULL
   OR toil_balance IS NULL
   OR sick_leave_balance IS NULL;
-- Expected: 0

-- Approved requests have approver
SELECT COUNT(*) FROM leave_requests
WHERE status = 'APPROVED'
AND (approved_by IS NULL OR approved_at IS NULL);
-- Expected: 0
```

## Monitoring & Maintenance

### Supabase Dashboard Monitoring

Monitor your application in Supabase Dashboard:

1. **Database** → **Table Editor**
   - View and edit data directly
   - Monitor row counts

2. **Database** → **Logs**
   - View query logs
   - Identify slow queries

3. **API** → **Logs**
   - Monitor API usage
   - Identify errors

4. **Storage** → **Usage**
   - Track database size
   - Plan for scaling

### Performance Monitoring

**Check Slow Queries**:
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%leave_requests%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Check Index Usage**:
```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename IN ('users', 'leave_requests', 'toil_entries')
ORDER BY idx_scan;
```

### Backup Strategy

**Automatic Backups** (Supabase Pro):
- Daily automatic backups
- 7-day retention
- Point-in-time recovery

**Manual Backups**:
```bash
# Export via Supabase Dashboard
# Database → Backups → Create Backup

# Or use pg_dump
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
```

### Scaling Considerations

**When to Scale**:
- Database size > 500MB
- > 1000 concurrent users
- Query response times > benchmarks

**Scaling Options**:
1. **Upgrade Supabase Plan**: Pro plan for better performance
2. **Database Optimization**: Add indexes, optimize queries
3. **Caching Layer**: Add Redis for frequently accessed data
4. **CDN**: Use Vercel Edge for static assets

## Troubleshooting

### Common Issues

**Issue**: "Failed to connect to Supabase"
```bash
# Solution: Verify environment variables
# Check NEXT_PUBLIC_SUPABASE_URL is correct
# Verify SUPABASE_SERVICE_ROLE_KEY is set
```

**Issue**: "Authentication failed"
```bash
# Solution: Check NextAuth configuration
# Verify NEXTAUTH_URL matches deployment URL
# Regenerate NEXTAUTH_SECRET if needed
```

**Issue**: "Realtime not working"
```bash
# Solution: Enable realtime in Supabase Dashboard
# Database → Replication → Enable for tables
# Check RLS policies allow SELECT
```

**Issue**: "Slow API responses"
```bash
# Solution: Check database indexes
# Run ANALYZE on tables in SQL Editor:
ANALYZE users;
ANALYZE leave_requests;
ANALYZE toil_entries;
```

### Error Logs

**View Server Logs**:
- Vercel: Dashboard → Deployments → View Function Logs
- Railway: Dashboard → Deployments → Logs
- Render: Dashboard → Logs

**View Supabase Logs**:
- Supabase Dashboard → Logs → Postgres Logs
- Filter by error level

### Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **NextAuth Docs**: https://next-auth.js.org
- **Vercel Support**: https://vercel.com/support

## Security Checklist

Pre-production security verification:

- [ ] **Environment Variables**
  - [ ] No secrets in client-side code
  - [ ] SERVICE_ROLE_KEY is server-side only
  - [ ] Production NEXTAUTH_SECRET is unique

- [ ] **Database Security**
  - [ ] RLS policies enabled on all tables
  - [ ] Policies tested for users and admins
  - [ ] No direct database access from client

- [ ] **Authentication**
  - [ ] Password hashing with bcrypt (12 rounds)
  - [ ] Session management secure
  - [ ] No hardcoded credentials

- [ ] **API Security**
  - [ ] Rate limiting configured
  - [ ] Input validation on all routes
  - [ ] SQL injection protection (parameterized queries)

- [ ] **HTTPS**
  - [ ] SSL certificate configured
  - [ ] All traffic over HTTPS
  - [ ] HSTS headers enabled

## Rollback Plan

If issues arise, see `ROLLBACK_PLAN.md` for detailed rollback procedures.

Quick rollback steps:
1. Switch environment variables back to Prisma
2. Redeploy previous version
3. Restore database from backup
4. Update DNS if needed

## Migration Complete! 🎉

Your Leave Tracker App is now running on Supabase with:
- ✅ Scalable PostgreSQL database
- ✅ Automatic authentication
- ✅ Real-time updates
- ✅ Row Level Security
- ✅ Cloud hosting ready
- ✅ Zero server management

**Next Steps**:
1. Monitor application performance
2. Gather user feedback
3. Implement additional features from Phase 8 (Realtime)
4. Scale as needed

**Documentation References**:
- `TESTING_GUIDE.md` - Comprehensive testing procedures
- `REALTIME_README.md` - Realtime features integration
- `MIGRATION_STATUS.md` - Complete migration history
- `ROLLBACK_PLAN.md` - Emergency rollback procedures
