# Quick Test Guide

## Run All Tests
```bash
npx tsx test-all-endpoints-v2.ts
```

## What It Tests
- ✅ 17 API endpoints
- ✅ Authentication & authorization
- ✅ User & admin roles
- ✅ Leave management
- ✅ Calendar features

## Current Status
🎉 **100% PASS RATE** (17/17 tests passing)

## Files
- **test-all-endpoints-v2.ts** - Main test suite
- **ENDPOINT_TESTING_GUIDE.md** - Full documentation
- **TEST_RESULTS_FINAL.md** - Detailed results
- **RUN_TESTS.md** - This quick guide

## Troubleshooting
If tests fail:
1. Ensure app is running: `npm run dev`
2. Check database connection
3. Verify test user credentials in script
4. Check logs in terminal

## Add to CI/CD
```yaml
- name: Run API Tests
  run: npx tsx test-all-endpoints-v2.ts
```
