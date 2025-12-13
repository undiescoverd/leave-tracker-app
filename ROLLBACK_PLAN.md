# Rollback Plan - Supabase Migration

## Overview

This document outlines procedures for rolling back the Supabase migration if critical issues arise. The rollback plan is designed to minimize downtime and data loss.

## When to Rollback

Consider rollback if:
- **Critical Production Bug**: Data corruption or loss detected
- **Performance Degradation**: Response times > 3x baseline
- **Authentication Failures**: Users unable to login (> 50% failure rate)
- **Data Integrity Issues**: Incorrect balance calculations or missing data
- **Realtime Failures**: Complete realtime system failure

**Do NOT rollback for**:
- Minor bugs that don't affect core functionality
- Individual user issues (investigate first)
- Performance issues that can be optimized
- Cosmetic or UI issues

## Rollback Scenarios

### Scenario 1: Rollback During Deployment (Migration Not Complete)

**Timeline**: Migration in progress, no production traffic on Supabase yet

**Steps**:

1. **Halt Migration**
   ```bash
   # Stop any running migration scripts
   # Cancel deployment if in progress
   ```

2. **Keep Prisma Files Active**
   - No changes needed - original Prisma files still in place
   - Continue using `.env.local` with Prisma configuration

3. **Clean Up Partial Work**
   ```bash
   # Remove any `.supabase.ts` files that were created
   # Keep them for reference but don't deploy
   ```

4. **Document Learnings**
   - Record what went wrong
   - Update migration plan
   - Plan fixes before retry

**Expected Downtime**: 0 minutes (no production impact)

### Scenario 2: Rollback After Deployment (Production on Supabase)

**Timeline**: Production traffic on Supabase, issues discovered post-deployment

**Critical Steps** (execute in order):

#### Step 1: Switch Traffic Back to Prisma (10 minutes)

**On Vercel** (or your hosting provider):

1. **Update Environment Variables**:
   ```bash
   # In Vercel Dashboard → Settings → Environment Variables
   # Comment out Supabase variables (add # prefix):
   # NEXT_PUBLIC_SUPABASE_URL=https://...
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   # SUPABASE_SERVICE_ROLE_KEY=...

   # Add/restore Prisma variable:
   DATABASE_URL=postgresql://user:password@host/database
   ```

2. **Trigger Redeployment**:
   ```bash
   # Option A: Via dashboard
   # Vercel Dashboard → Deployments → Redeploy (latest Prisma version)

   # Option B: Via Git
   git revert <supabase-merge-commit-sha>
   git push origin master
   ```

3. **Verify Prisma Connection**:
   ```bash
   # Once deployed, test health endpoint:
   curl https://your-app.vercel.app/api/health

   # Should show Prisma connection:
   # "database": { "status": "connected", "details": { "provider": "Prisma (PostgreSQL)" } }
   ```

**Expected Downtime**: 5-10 minutes (time to redeploy)

#### Step 2: Restore Database from Backup (30-60 minutes)

**If Data Loss Occurred**:

1. **Identify Backup Point**:
   ```bash
   # Determine last known good state
   # Check Supabase Dashboard → Database → Backups
   # Or your Prisma database backup system
   ```

2. **Restore Prisma Database**:
   ```bash
   # Method 1: From pg_dump backup
   psql -h your-db-host -U your-db-user -d your-db-name < backup.sql

   # Method 2: From cloud provider backup (e.g., Heroku, Railway)
   # Follow provider-specific restore procedures
   ```

3. **Run Prisma Migrations** (if needed):
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Verify Data Integrity**:
   ```sql
   -- Check user count
   SELECT COUNT(*) FROM "User";

   -- Check recent leave requests
   SELECT * FROM "LeaveRequest" ORDER BY "createdAt" DESC LIMIT 10;

   -- Verify balances are reasonable
   SELECT email, "annualLeaveBalance", "toilBalance", "sickLeaveBalance"
   FROM "User"
   WHERE "annualLeaveBalance" < 0 OR "toilBalance" < 0;
   ```

**Expected Downtime**: 30-60 minutes (database restore time)

#### Step 3: Data Synchronization (if needed)

**If Data Created on Supabase Needs Migration Back**:

1. **Export Data from Supabase**:
   ```bash
   # In Supabase Dashboard → Table Editor
   # Export each table to CSV:
   # - users (created after migration)
   # - leave_requests (created after migration)
   # - toil_entries (created after migration)
   ```

2. **Transform and Import to Prisma**:
   ```bash
   # Create migration script: scripts/supabase-to-prisma-import.ts

   # Transform data format:
   # - snake_case → camelCase
   # - Supabase UUIDs → Prisma IDs
   # - Timestamp formats

   # Import using Prisma Client:
   npx tsx scripts/supabase-to-prisma-import.ts
   ```

3. **Verify Data Sync**:
   ```bash
   # Compare record counts
   # Verify recent requests imported correctly
   # Check user balances match
   ```

**Expected Time**: 1-2 hours (manual data work)

### Scenario 3: Partial Rollback (Keep Some Supabase Features)

**Timeline**: Most features work, but roll back specific functionality

**Option A: Disable Realtime Features**

```typescript
// In components using realtime hooks
const { notifications } = useRealtimeNotifications({
  userId: user.id,
  enabled: false, // Disable realtime
});

// Revert to polling
useEffect(() => {
  const interval = setInterval(() => {
    fetchLeaveRequests();
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

**Option B: Disable Specific Routes**

```bash
# Rename route files to disable them
mv src/app/api/leave/balance/route.supabase.ts route.supabase.ts.disabled
# Use original Prisma route
mv src/app/api/leave/balance/route.ts.backup route.ts
```

**Expected Downtime**: 5 minutes (hotfix deployment)

## Rollback Checklist

Use this checklist during rollback execution:

### Pre-Rollback

- [ ] **Notify Stakeholders**
  - [ ] Alert users of maintenance window
  - [ ] Notify development team
  - [ ] Document issue in incident log

- [ ] **Capture Current State**
  - [ ] Screenshot Supabase dashboard
  - [ ] Export critical data to CSV
  - [ ] Backup current environment variables
  - [ ] Save error logs from production

- [ ] **Verify Backup Availability**
  - [ ] Confirm Prisma database backup exists
  - [ ] Verify backup recency (< 24 hours)
  - [ ] Test backup restoration in staging

### During Rollback

- [ ] **Switch Environment**
  - [ ] Update environment variables
  - [ ] Trigger redeployment
  - [ ] Verify deployment success

- [ ] **Database Restoration**
  - [ ] Restore Prisma database
  - [ ] Run migrations if needed
  - [ ] Verify data integrity

- [ ] **Health Checks**
  - [ ] Test /api/health endpoint
  - [ ] Verify user login
  - [ ] Test leave request creation
  - [ ] Verify admin approval workflow

### Post-Rollback

- [ ] **Verification**
  - [ ] All critical features working
  - [ ] Performance within normal range
  - [ ] No errors in logs
  - [ ] User feedback positive

- [ ] **Communication**
  - [ ] Notify users maintenance complete
  - [ ] Update status page
  - [ ] Internal team debrief

- [ ] **Documentation**
  - [ ] Document root cause
  - [ ] Record rollback timeline
  - [ ] Create incident report
  - [ ] Update migration plan

## Data Loss Prevention

### Continuous Backup Strategy

**Before Migration**:
```bash
# Schedule automatic backups
# Daily full backup of Prisma database
0 2 * * * pg_dump -h host -U user database > backup_$(date +\%Y\%m\%d).sql

# Keep 7 days of backups
# Automate cleanup of old backups
```

**During Migration**:
```bash
# Backup before each major step
pg_dump -h host -U user database > pre_migration_$(date +\%Y\%m\%d_\%H\%M).sql

# Export Supabase data regularly
# Supabase Dashboard → Database → Backups → Manual Backup
```

**After Migration**:
```bash
# Enable Supabase automatic backups (Pro plan)
# Or schedule manual exports
0 2 * * * curl "https://your-project.supabase.co/rest/v1/users?select=*" \
  -H "apikey: $SUPABASE_ANON_KEY" > users_backup.json
```

### Critical Data Export

**Essential Data to Export Before Rollback**:

1. **Users Created on Supabase**:
   ```sql
   SELECT * FROM users
   WHERE created_at > '2025-12-14 00:00:00'; -- Migration date
   ```

2. **Leave Requests Created on Supabase**:
   ```sql
   SELECT * FROM leave_requests
   WHERE created_at > '2025-12-14 00:00:00';
   ```

3. **Approved Requests (Balance Impact)**:
   ```sql
   SELECT * FROM leave_requests
   WHERE status = 'APPROVED'
   AND approved_at > '2025-12-14 00:00:00';
   ```

4. **Current User Balances**:
   ```sql
   SELECT id, email, annual_leave_balance, toil_balance, sick_leave_balance
   FROM users;
   ```

## Communication Templates

### User Notification (Maintenance Window)

**Subject**: Scheduled Maintenance - Leave Tracker App

**Body**:
```
Dear Team,

We will be performing system maintenance on [Date] from [Time] to [Time].

During this time:
- The Leave Tracker App will be temporarily unavailable
- Existing leave requests will not be affected
- No data will be lost

The maintenance is expected to take [Duration]. We will notify you once the system is back online.

Thank you for your patience.

- IT Team
```

### Incident Report Template

**Incident**: Supabase Migration Rollback

**Date**: [Date and Time]

**Severity**: [Critical/High/Medium]

**Root Cause**:
- [Describe what went wrong]
- [Technical details]

**Impact**:
- Users affected: [Number/All]
- Downtime: [Duration]
- Data loss: [Yes/No - Details]

**Rollback Actions Taken**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Resolution Time**: [Total time from detection to resolution]

**Lessons Learned**:
- [What we learned]
- [What to improve]

**Action Items**:
- [ ] [Fix root cause]
- [ ] [Update migration plan]
- [ ] [Add monitoring]

## Testing Rollback (Recommended)

### Practice Rollback in Staging

Before production migration, practice rollback:

1. **Setup Staging Environment**:
   ```bash
   # Create staging Supabase project
   # Deploy staging application to Vercel (staging)
   # Migrate staging to Supabase
   ```

2. **Simulate Issues**:
   ```bash
   # Intentionally break something
   # Practice rollback procedure
   # Time each step
   ```

3. **Refine Procedure**:
   ```bash
   # Document actual times
   # Identify bottlenecks
   # Update rollback plan
   ```

4. **Train Team**:
   ```bash
   # Ensure 2+ team members can execute rollback
   # Document who has necessary access
   # Share credentials securely
   ```

## Rollback Decision Tree

```
Is the issue critical? (data loss, auth failure, >50% users affected)
├─ YES → Proceed with full rollback (Scenario 2)
└─ NO
   └─ Can it be fixed with a hotfix? (<1 hour)
      ├─ YES → Deploy hotfix, monitor
      └─ NO → Is it affecting core features?
         ├─ YES → Partial rollback (Scenario 3)
         └─ NO → Schedule fix for next release
```

## Emergency Contacts

**Critical Contacts** (maintain up-to-date):

- **Technical Lead**: [Name, Phone, Email]
- **Database Admin**: [Name, Phone, Email]
- **DevOps Engineer**: [Name, Phone, Email]
- **Product Owner**: [Name, Phone, Email]

**Service Contacts**:

- **Supabase Support**: support@supabase.com (Pro plan)
- **Vercel Support**: support@vercel.com
- **Database Provider**: [Your provider support]

## Post-Rollback Recovery Plan

After successful rollback:

### Week 1: Stabilization
- Monitor all metrics closely
- Gather user feedback
- Review error logs daily
- Document all issues

### Week 2: Root Cause Analysis
- Investigate what went wrong
- Identify gaps in testing
- Update migration plan
- Fix underlying issues

### Week 3: Planning
- Decide: Retry migration or stay on Prisma?
- If retry: Update migration plan
- If stay: Document decision

### Week 4: Communication
- Share learnings with team
- Update documentation
- Plan next steps

## Prevention for Next Attempt

If retrying migration after rollback:

1. **Enhanced Testing**:
   - Load testing before production
   - Longer staging period (2+ weeks)
   - Beta program with volunteer users

2. **Gradual Rollout**:
   - 10% of users first week
   - 50% of users second week
   - 100% if no issues

3. **Feature Flags**:
   - Implement feature toggles
   - Easy enable/disable without deployment

4. **Better Monitoring**:
   - Real-time alerting
   - Performance dashboards
   - User feedback mechanism

## Summary

**Rollback is Always an Option**

Remember:
- ✅ Rollback is a valid engineering decision
- ✅ User experience is priority #1
- ✅ Data integrity cannot be compromised
- ✅ It's better to rollback than force broken features

**Success Criteria for Retry**:
- All rollback issues documented and resolved
- Testing plan enhanced
- Team confident in approach
- Stakeholder approval obtained

---

**Last Updated**: December 2024
**Maintained By**: Development Team
**Review Frequency**: Before each major deployment
