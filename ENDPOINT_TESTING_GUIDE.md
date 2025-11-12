# Comprehensive API Endpoint Testing Guide

## Overview

The `test-all-endpoints.ts` script provides thorough testing of all API endpoints in the Leave Tracker application.

## What It Tests

### 🔍 Coverage (30+ endpoints)

1. **Health & Readiness** (3 endpoints)
   - `/api/health` - Application health status
   - `/api/ping` - Basic connectivity
   - `/api/readiness` - System readiness check

2. **Authentication** (4+ endpoints)
   - `/api/auth/register` - User registration
   - `/api/auth/signin` - Login validation
   - `/api/auth/forgot-password` - Password reset
   - `/api/auth/reset-password` - Password reset execution

3. **Leave Management** (6 endpoints)
   - `/api/leave/balance` - Get user leave balance
   - `/api/leave/requests` - List user's leave requests
   - `/api/leave/request` - Create/list leave requests
   - `/api/leave/request/[id]/cancel` - Cancel a request
   - `/api/leave/request/[id]/approve` - Approve a request (admin)
   - `/api/leave/request/[id]/reject` - Reject a request (admin)

4. **Admin Operations** (10+ endpoints)
   - `/api/admin/stats` - Dashboard statistics
   - `/api/admin/pending-requests` - Pending leave requests
   - `/api/admin/employee-balances` - All employee balances
   - `/api/admin/upcoming-leave` - Upcoming leave calendar
   - `/api/admin/performance` - Performance metrics
   - `/api/admin/bulk-approve` - Bulk approve requests
   - `/api/admin/bulk-reject` - Bulk reject requests
   - `/api/admin/employee-details/[id]` - Employee details
   - `/api/admin/seed-dummy-data` - Seed test data
   - `/api/admin/comprehensive-seed` - Comprehensive seeding

5. **TOIL (Time Off In Lieu)** (3 endpoints)
   - `/api/admin/toil` - TOIL balance management
   - `/api/admin/toil/pending` - Pending TOIL requests
   - `/api/admin/toil/approve` - Approve TOIL requests

6. **Calendar** (2 endpoints)
   - `/api/calendar/team` - Team calendar view
   - `/api/calendar/team-leave` - Team leave overview

7. **Miscellaneous** (2 endpoints)
   - `/api/metrics` - Application metrics
   - `/api/users` - User management

## Test Features

- ✅ **Authentication Testing** - Tests both regular and admin user access
- ✅ **Authorization Checks** - Verifies proper role-based access control
- ✅ **Validation Testing** - Tests invalid inputs and edge cases
- ✅ **Response Structure** - Validates response formats
- ✅ **Error Handling** - Ensures proper error responses
- ✅ **Status Code Checks** - Verifies correct HTTP status codes

## Setup

### 1. Configure Test Credentials

Edit `test-endpoints.config.json` (optional - defaults are in the script):

```json
{
  "baseUrl": "http://localhost:3000",
  "credentials": {
    "regularUser": {
      "email": "test@example.com",
      "password": "password123"
    },
    "adminUser": {
      "email": "admin@example.com",
      "password": "admin123"
    }
  }
}
```

### 2. Ensure Test Users Exist

Make sure you have test users in your database:

**Regular User:**
- Email: `test@example.com`
- Password: `password123`
- Role: `EMPLOYEE`

**Admin User:**
- Email: `admin@example.com`
- Password: `admin123`
- Role: `ADMIN`

You can create these users via:
- The registration page
- Database seeding scripts
- Direct database insertion

### 3. Start Your Application

```bash
npm run dev
# or
./start-dev.sh
```

Ensure it's running on `http://localhost:3000`

## Running the Tests

### Basic Usage

```bash
npx tsx test-all-endpoints.ts
```

### With Custom Configuration

Update the `TEST_CONFIG` object in `test-all-endpoints.ts` or create environment variables.

## Understanding Results

### Test Status Icons

- ✅ **PASS** - Test passed successfully
- ❌ **FAIL** - Test failed, needs attention
- ⚠️ **WARN** - Test passed but with concerns (e.g., weak validation)
- ⏭️ **SKIP** - Test was skipped (usually due to auth failure)

### Sample Output

```
🚀 COMPREHENSIVE API ENDPOINT TEST SUITE
========================================

Testing against: http://localhost:3000
Started at: 10/2/2025, 10:30:45 AM

🔑 AUTHENTICATION SETUP
========================================

🔐 Attempting to authenticate regular user...
✅ Regular user authenticated successfully

🔐 Attempting to authenticate admin user...
✅ Admin user authenticated successfully

📊 HEALTH & READINESS CHECKS
========================================

🧪 [Health] Health endpoint
   ✅ GET /api/health - Status: healthy

...

📊 TEST SUMMARY
========================================

✅ Passed:   45/50
❌ Failed:   2/50
⚠️  Warnings: 3/50
⏭️  Skipped:  0/50

📈 Success Rate: 90.0%
```

## Troubleshooting

### Authentication Fails

If authentication fails:

1. Check that test users exist in the database
2. Verify credentials in the script match your database
3. Check that your NextAuth configuration is correct
4. Look at `.env.local` for proper `NEXTAUTH_URL` and `NEXTAUTH_SECRET`

### Many Tests Skip

If many tests are skipped:
- Authentication likely failed
- Check the authentication setup output
- Verify the application is running on the correct port

### High Failure Rate

If many tests fail:
1. Check your application logs for errors
2. Verify database migrations are up to date
3. Ensure all dependencies are installed
4. Check that environment variables are set correctly

### Specific Endpoint Fails

For specific endpoint failures:
1. Check the error message in the output
2. Test the endpoint manually with curl or Postman
3. Check application logs during the test
4. Verify the endpoint implementation

## Customization

### Adding New Tests

To add tests for new endpoints:

1. Create a new test function:
```typescript
async function testNewFeatureEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('🆕 NEW FEATURE ENDPOINTS');
  console.log('='.repeat(70));
  
  logTest('NewFeature', 'Test description');
  const response = await makeRequest('/api/new-endpoint', {
    cookie: regularUserCookie,
  });
  logResult({
    endpoint: '/api/new-endpoint',
    method: 'GET',
    status: response.ok ? 'PASS' : 'FAIL',
    message: response.ok ? 'Success' : `Failed: ${response.status}`,
    statusCode: response.status,
  });
}
```

2. Call it from `runAllTests()`:
```typescript
await testNewFeatureEndpoints();
```

### Adjusting Test Data

Modify the test data in the test functions:

```typescript
const createRequest = await makeRequest('/api/leave/request', {
  method: 'POST',
  cookie: regularUserCookie,
  body: {
    startDate: '2025-12-25',
    endDate: '2025-12-26',
    leaveType: 'ANNUAL',
    comments: 'Christmas vacation',
  },
});
```

## Integration with CI/CD

You can integrate this into your CI/CD pipeline:

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npm run dev &
      - run: sleep 10 # Wait for server
      - run: npx tsx test-all-endpoints.ts
```

## Best Practices

1. **Run Before Deployment** - Always run this test suite before deploying
2. **Update Tests** - Keep tests updated when adding new endpoints
3. **Clean Test Data** - Ensure tests don't leave dirty data in production
4. **Separate Test DB** - Use a separate test database when possible
5. **Monitor Results** - Track test results over time to spot regressions

## Comparison with Other Test Scripts

### vs `test-api-endpoints.js`
- ✅ Covers 30+ endpoints vs 8 endpoints
- ✅ Tests authentication properly with sessions
- ✅ Tests validation and error handling
- ✅ Better organized and more maintainable

### vs Individual Test Scripts
- ✅ Single comprehensive test vs scattered scripts
- ✅ Consistent reporting format
- ✅ Full coverage in one run
- ✅ Better for CI/CD integration

## Next Steps

After running tests:

1. Review any failures and fix the underlying issues
2. Add tests for any new endpoints you create
3. Consider setting up automated testing in CI/CD
4. Share results with your team
5. Keep the test suite updated as your API evolves

---

**Last Updated:** October 2025
**Maintained By:** Development Team

