# Supabase Migration Testing Guide

This guide covers testing strategies for validating the Supabase migration.

## Overview

The migration testing covers:
1. **Unit Tests** - Service layer functions
2. **Integration Tests** - API routes with database
3. **Realtime Tests** - Subscription functionality
4. **Manual Tests** - End-to-end user workflows
5. **Performance Tests** - Load and stress testing

## Setup

### Environment Configuration

Create `.env.test.local` for test environment:

```env
# Supabase Test Project (separate from production)
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_test_service_role_key

# Auth
NEXTAUTH_SECRET=test-secret-min-32-characters
NEXTAUTH_URL=http://localhost:3000

# Email (use test mode)
ENABLE_EMAIL_NOTIFICATIONS=false
```

### Test Database Setup

1. **Create Test Supabase Project**
   ```bash
   # Create a separate Supabase project for testing
   # Run migrations in test project
   ```

2. **Run Migrations**
   ```sql
   -- In Supabase SQL Editor
   -- Run: supabase/migrations/001_initial_schema.sql
   -- Run: supabase/migrations/002_row_level_security.sql
   ```

3. **Seed Test Data**
   ```bash
   npx tsx supabase/seed.supabase.ts
   ```

## Test Utilities

### Using Test Helpers

```typescript
import {
  createTestUser,
  createTestLeaveRequest,
  cleanupTestUser,
  createTestScenario,
} from '@/lib/test-utils/supabase-test-helpers';

// Create a test scenario
const scenario = await createTestScenario();

// Use test data
console.log('Test user:', scenario.user);
console.log('Pending request:', scenario.pendingRequest);

// Cleanup when done
await scenario.cleanup();
```

### Available Test Helpers

| Function | Purpose |
|----------|---------|
| `createTestUser()` | Create a test user with custom data |
| `createTestLeaveRequest()` | Create a leave request for testing |
| `createTestToilEntry()` | Create a TOIL entry |
| `cleanupTestUser()` | Remove test user and all related data |
| `cleanupAllTestData()` | Remove all test data (caution!) |
| `getTestUserByEmail()` | Find user by email |
| `updateTestUserBalance()` | Update user's leave balances |
| `approveTestLeaveRequest()` | Approve a leave request |
| `rejectTestLeaveRequest()` | Reject a leave request |
| `createTestScenario()` | Create complete test setup |

## Manual Testing Workflows

### 1. User Registration and Login

**Test**: New user can register and login

```bash
# Steps:
1. Navigate to /register
2. Fill form:
   - Email: test1@example.com
   - Name: Test User 1
   - Password: Password123!
3. Submit form
4. Verify:
   ✓ User created in Supabase users table
   ✓ Password is hashed (bcrypt)
   ✓ Default balances set (32, 0, 3)
   ✓ Role is USER
5. Login with same credentials
6. Verify:
   ✓ Successfully authenticated
   ✓ Redirected to dashboard
```

**Expected Results**:
- User record created with hashed password
- Default balances: 32 annual, 0 TOIL, 3 sick
- Can login and see dashboard

### 2. Create Leave Request

**Test**: User can create leave request

```bash
# Steps:
1. Login as regular user
2. Navigate to leave request form
3. Fill form:
   - Start Date: Tomorrow
   - End Date: +5 days
   - Type: Annual Leave
   - Reason: "Test vacation"
4. Submit request
5. Verify in Supabase:
   ✓ leave_requests table has new row
   ✓ status = 'PENDING'
   ✓ user_id matches current user
   ✓ dates are correct
```

**Expected Results**:
- Leave request created with PENDING status
- Appears in user's request list
- Admin can see in pending requests

### 3. Admin Approve Request

**Test**: Admin can approve pending leave request

```bash
# Steps:
1. Login as admin user
2. Navigate to admin panel
3. Find pending request
4. Click "Approve"
5. Verify:
   ✓ Status changes to APPROVED
   ✓ approved_by field set
   ✓ approved_at timestamp set
   ✓ User sees approval (manual check or realtime)
```

**Expected Results**:
- Request status = APPROVED
- Approved metadata populated
- User notified (if realtime enabled)

### 4. Leave Balance Calculation

**Test**: Balance updates correctly after approval

```bash
# Steps:
1. Note user's current annual leave balance
2. Create and approve 5-day leave request
3. Check updated balance
4. Verify:
   ✓ Balance reduced by 5 days
   ✓ Calculation accounts for weekends
   ✓ UI shows updated balance
```

**Expected Results**:
- Balance decreases by working days only
- Weekends not counted
- UI reflects new balance

### 5. Realtime Notifications (if Phase 8 integrated)

**Test**: Real-time updates work correctly

```bash
# Steps:
1. Open two browser windows
2. Window 1: Login as regular user
3. Window 2: Login as admin
4. Window 1: Create leave request
5. Verify Window 2:
   ✓ Notification appears immediately
   ✓ Badge count updates
   ✓ Request appears in pending list
6. Window 2: Approve request
7. Verify Window 1:
   ✓ Notification appears
   ✓ Status updates to APPROVED
   ✓ No page refresh needed
```

**Expected Results**:
- Updates appear within 1-2 seconds
- No manual refresh required
- Both users see consistent state

## Integration Testing

### Testing API Routes

```typescript
// Example: Test leave request creation
import { POST } from '@/app/api/leave/request/route.supabase';
import { createTestUser } from '@/lib/test-utils/supabase-test-helpers';

describe('Leave Request API', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'api-test@example.com',
      name: 'API Test User',
    });
  });

  afterEach(async () => {
    await cleanupTestUser(testUser.id);
  });

  it('should create a leave request', async () => {
    const request = new Request('http://localhost:3000/api/leave/request', {
      method: 'POST',
      body: JSON.stringify({
        startDate: '2025-09-15',
        endDate: '2025-09-20',
        type: 'ANNUAL',
        reason: 'Vacation',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Mock authentication
    jest.mock('@/lib/auth', () => ({
      auth: () => Promise.resolve({
        user: { id: testUser.id, email: testUser.email },
      }),
    }));

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.leaveRequest.status).toBe('PENDING');
  });
});
```

### Testing Services

```typescript
import { getUserLeaveBalance } from '@/lib/services/leave.service.supabase';
import { createTestUser, updateTestUserBalance } from '@/lib/test-utils/supabase-test-helpers';

describe('Leave Balance Service', () => {
  it('should calculate correct leave balance', async () => {
    const user = await createTestUser({
      email: 'balance-test@example.com',
      name: 'Balance Test',
      annualLeaveBalance: 32,
    });

    const balance = await getUserLeaveBalance(user.id, 2025);

    expect(balance.annualLeave.total).toBe(32);
    expect(balance.annualLeave.available).toBe(32);
    expect(balance.annualLeave.used).toBe(0);

    await cleanupTestUser(user.id);
  });
});
```

## Performance Testing

### Load Testing with k6

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  const baseUrl = 'http://localhost:3000/api';

  // Test leave balance endpoint
  const response = http.get(`${baseUrl}/leave/balance`, {
    headers: {
      'Authorization': 'Bearer test-token',
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Run with:
```bash
k6 run load-test.js
```

### Database Query Performance

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%leave_requests%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'leave_requests'
ORDER BY idx_scan;
```

## Security Testing

### Row Level Security (RLS)

```typescript
// Test that users can only access their own data
import { testSupabase } from '@/lib/test-utils/supabase-test-helpers';

describe('RLS Policies', () => {
  it('should prevent users from accessing other users data', async () => {
    const user1 = await createTestUser({
      email: 'user1@example.com',
      name: 'User 1',
    });

    const user2 = await createTestUser({
      email: 'user2@example.com',
      name: 'User 2',
    });

    // Create leave request for user1
    const request = await createTestLeaveRequest({
      userId: user1.id,
      startDate: new Date(),
      endDate: new Date(),
    });

    // Try to access user1's request as user2 (should fail)
    // This requires setting up Supabase auth properly in tests
    // ...

    await cleanupTestUser(user1.id);
    await cleanupTestUser(user2.id);
  });
});
```

## Realtime Testing

### Testing Subscriptions

```typescript
import { subscribeToUserLeaveRequests } from '@/lib/realtime/supabase-realtime';

describe('Realtime Subscriptions', () => {
  it('should receive updates when leave request changes', async (done) => {
    const user = await createTestUser({
      email: 'realtime-test@example.com',
      name: 'Realtime Test',
    });

    const request = await createTestLeaveRequest({
      userId: user.id,
      startDate: new Date(),
      endDate: new Date(),
    });

    // Subscribe to updates
    const subscription = subscribeToUserLeaveRequests(user.id, (change) => {
      if (change.type === 'UPDATE' && change.data.status === 'APPROVED') {
        expect(change.data.id).toBe(request.id);
        subscription.unsubscribe();
        cleanupTestUser(user.id);
        done();
      }
    });

    // Wait a moment for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update the request
    await approveTestLeaveRequest(request.id, 'Admin');
  }, 10000); // 10 second timeout for realtime
});
```

## Validation Checklist

### Pre-Deployment Checklist

- [ ] All migrated API routes return correct responses
- [ ] Row Level Security policies tested and working
- [ ] Leave balance calculations accurate
- [ ] TOIL calculations correct
- [ ] Email notifications work (if enabled)
- [ ] Realtime subscriptions functional
- [ ] Admin and user permissions enforced
- [ ] Password hashing secure (bcrypt)
- [ ] No SQL injection vulnerabilities
- [ ] Rate limiting functional
- [ ] Health check endpoint accessible
- [ ] Seed script works on fresh database
- [ ] Database migrations run successfully
- [ ] All environment variables configured

### Performance Benchmarks

Target benchmarks for API endpoints:

| Endpoint | Target Response Time |
|----------|---------------------|
| GET /api/leave/balance | < 200ms |
| POST /api/leave/request | < 300ms |
| GET /api/admin/pending-requests | < 400ms |
| PUT /api/leave/request/[id]/approve | < 300ms |
| Health check | < 100ms |

### Data Integrity Tests

```sql
-- Verify no orphaned leave requests
SELECT COUNT(*) FROM leave_requests lr
LEFT JOIN users u ON lr.user_id = u.id
WHERE u.id IS NULL;
-- Expected: 0

-- Verify all users have balances
SELECT COUNT(*) FROM users
WHERE annual_leave_balance IS NULL
   OR toil_balance IS NULL
   OR sick_leave_balance IS NULL;
-- Expected: 0

-- Verify approved requests have approver
SELECT COUNT(*) FROM leave_requests
WHERE status = 'APPROVED'
AND (approved_by IS NULL OR approved_at IS NULL);
-- Expected: 0
```

## Troubleshooting

### Common Issues

**Issue**: Test user creation fails
- **Solution**: Check Supabase RLS policies allow service role to insert
- **Solution**: Verify service role key is correct in .env.test.local

**Issue**: Realtime subscriptions not working
- **Solution**: Enable Realtime in Supabase dashboard
- **Solution**: Check RLS policies allow SELECT for realtime
- **Solution**: Verify websocket connection in browser devtools

**Issue**: Slow API responses
- **Solution**: Check database indexes are created
- **Solution**: Run `ANALYZE` on tables in Supabase SQL editor
- **Solution**: Review query plans for N+1 queries

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_KEY }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
        run: npm test

      - name: Run E2E tests
        run: npm run test:e2e
```

## Next Steps

After completing testing:
1. Document test results
2. Address any failing tests
3. Update test coverage metrics
4. Prepare deployment runbook
5. Plan production rollout

## Resources

- [Supabase Testing Docs](https://supabase.com/docs/guides/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [k6 Load Testing](https://k6.io/docs/)
- [Playwright E2E Testing](https://playwright.dev/)
