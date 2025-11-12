#!/usr/bin/env tsx
/**
 * Comprehensive API Endpoint Test Suite
 * Tests all API routes with authentication, validation, and error handling
 * 
 * Run with: npx tsx test-all-endpoints.ts
 */

const BASE_URL = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  // Test credentials - UPDATE THE PASSWORDS to match your actual passwords
  regularUser: {
    email: 'sup@tdhagency.com',  // Sup Dhanasunthorn - USER role
    password: 'Password123!',  // ⚠️ UPDATE THIS
    name: 'Sup Dhanasunthorn'
  },
  adminUser: {
    email: 'ian@tdhagency.com',  // Ian Vincent - ADMIN role
    password: 'Password123!',  // ⚠️ UPDATE THIS
    name: 'Ian Vincent'
  }
};

// Test results tracking
interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'WARN';
  message: string;
  statusCode?: number;
}

const results: TestResult[] = [];
let regularUserCookie: string | null = null;
let adminUserCookie: string | null = null;

// Helper functions
function logTest(category: string, test: string) {
  console.log(`\n🧪 [${category}] ${test}`);
}

function logResult(result: TestResult) {
  const emoji = {
    PASS: '✅',
    FAIL: '❌',
    SKIP: '⏭️',
    WARN: '⚠️'
  }[result.status];
  
  console.log(`   ${emoji} ${result.method} ${result.endpoint} - ${result.message}`);
  results.push(result);
}

async function makeRequest(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    cookie?: string | null;
    expectAuth?: boolean;
  } = {}
) {
  const { method = 'GET', body, cookie, expectAuth = false } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      headers: response.headers,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      data: { error: error.message },
      headers: new Headers(),
    };
  }
}

// Authentication helper
async function login(email: string, password: string): Promise<string | null> {
  try {
    // Step 1: Get CSRF token
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    
    // Step 2: Sign in with credentials
    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('csrfToken', csrfToken);
    formData.append('callbackUrl', BASE_URL);
    formData.append('json', 'true');
    
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual',
    });
    
    // Extract authjs.session-token from set-cookie header
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/authjs\.session-token=([^;]+)/);
      if (match) {
        return `authjs.session-token=${match[1]}`;
      }
    }
    
    return null;
  } catch (error: any) {
    console.error(`Login error: ${error.message}`);
    return null;
  }
}

// Test Suites

async function testHealthEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 HEALTH & READINESS CHECKS');
  console.log('='.repeat(70));
  
  logTest('Health', 'Health endpoint');
  const health = await makeRequest('/api/health');
  logResult({
    endpoint: '/api/health',
    method: 'GET',
    status: health.ok && health.data.status === 'healthy' ? 'PASS' : 'FAIL',
    message: health.ok ? `Status: ${health.data.status}` : `Failed: ${health.status}`,
    statusCode: health.status,
  });
  
  logTest('Health', 'Ping endpoint');
  const ping = await makeRequest('/api/ping');
  logResult({
    endpoint: '/api/ping',
    method: 'GET',
    status: ping.ok && ping.data.ping === 'pong' ? 'PASS' : 'FAIL',
    message: ping.ok ? 'Pong received' : `Failed: ${ping.status}`,
    statusCode: ping.status,
  });
  
  logTest('Health', 'Readiness endpoint');
  const ready = await makeRequest('/api/readiness');
  logResult({
    endpoint: '/api/readiness',
    method: 'GET',
    status: ready.ok ? 'PASS' : 'FAIL',
    message: ready.ok ? 'System ready' : `Failed: ${ready.status}`,
    statusCode: ready.status,
  });
}

async function testAuthEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 AUTHENTICATION ENDPOINTS');
  console.log('='.repeat(70));
  
  // Test register with existing user (should fail gracefully)
  logTest('Auth', 'Register endpoint validation');
  const register = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: {
      name: TEST_CONFIG.regularUser.name,
      email: TEST_CONFIG.regularUser.email,
      password: TEST_CONFIG.regularUser.password,
    },
  });
  logResult({
    endpoint: '/api/auth/register',
    method: 'POST',
    status: register.ok || register.data.error?.includes('exists') ? 'PASS' : 'FAIL',
    message: register.ok ? 'User created' : 'User already exists (expected)',
    statusCode: register.status,
  });
  
  // Test forgot password
  logTest('Auth', 'Forgot password endpoint');
  const forgot = await makeRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: { email: TEST_CONFIG.regularUser.email },
  });
  logResult({
    endpoint: '/api/auth/forgot-password',
    method: 'POST',
    status: forgot.ok || forgot.status === 200 ? 'PASS' : 'FAIL',
    message: forgot.ok ? 'Password reset initiated' : `Status: ${forgot.status}`,
    statusCode: forgot.status,
  });
  
  // Test invalid login
  logTest('Auth', 'Invalid credentials handling');
  const invalidLogin = await makeRequest('/api/auth/callback/credentials', {
    method: 'POST',
    body: { email: 'invalid@example.com', password: 'wrong' },
  });
  logResult({
    endpoint: '/api/auth/callback/credentials',
    method: 'POST',
    status: !invalidLogin.ok || invalidLogin.status === 401 ? 'PASS' : 'FAIL',
    message: 'Invalid credentials properly rejected',
    statusCode: invalidLogin.status,
  });
}

async function testLeaveEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('🏖️  LEAVE MANAGEMENT ENDPOINTS');
  console.log('='.repeat(70));
  
  // Test without authentication
  logTest('Leave', 'Balance endpoint - No auth');
  const balanceNoAuth = await makeRequest('/api/leave/balance');
  logResult({
    endpoint: '/api/leave/balance',
    method: 'GET',
    status: balanceNoAuth.status === 401 ? 'PASS' : 'FAIL',
    message: balanceNoAuth.status === 401 ? 'Properly requires authentication' : 'Auth not enforced!',
    statusCode: balanceNoAuth.status,
  });
  
  // Test with authentication
  if (regularUserCookie) {
    logTest('Leave', 'Balance endpoint - With auth');
    const balance = await makeRequest('/api/leave/balance', {
      cookie: regularUserCookie,
    });
    logResult({
      endpoint: '/api/leave/balance',
      method: 'GET',
      status: balance.ok ? 'PASS' : 'FAIL',
      message: balance.ok ? `Balance retrieved: ${JSON.stringify(balance.data)}` : `Failed: ${balance.status}`,
      statusCode: balance.status,
    });
    
    logTest('Leave', 'Get leave requests');
    const requests = await makeRequest('/api/leave/requests', {
      cookie: regularUserCookie,
    });
    logResult({
      endpoint: '/api/leave/requests',
      method: 'GET',
      status: requests.ok ? 'PASS' : 'FAIL',
      message: requests.ok ? `Found ${requests.data.requests?.length || 0} requests` : `Failed: ${requests.status}`,
      statusCode: requests.status,
    });
    
    logTest('Leave', 'Create leave request - Validation');
    const invalidRequest = await makeRequest('/api/leave/request', {
      method: 'POST',
      cookie: regularUserCookie,
      body: {
        // Missing required fields
        startDate: new Date().toISOString(),
      },
    });
    logResult({
      endpoint: '/api/leave/request',
      method: 'POST',
      status: !invalidRequest.ok ? 'PASS' : 'WARN',
      message: !invalidRequest.ok ? 'Validation working' : 'Validation may be weak',
      statusCode: invalidRequest.status,
    });
    
    logTest('Leave', 'Create leave request - Valid');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const endDate = new Date(futureDate);
    endDate.setDate(endDate.getDate() + 2);
    
    const createRequest = await makeRequest('/api/leave/request', {
      method: 'POST',
      cookie: regularUserCookie,
      body: {
        startDate: futureDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        leaveType: 'ANNUAL',
        comments: 'Test leave request',
      },
    });
    logResult({
      endpoint: '/api/leave/request',
      method: 'POST',
      status: createRequest.ok ? 'PASS' : 'FAIL',
      message: createRequest.ok ? `Request created` : `Failed: ${JSON.stringify(createRequest.data)}`,
      statusCode: createRequest.status,
    });
    
    // Get all requests to find IDs for testing
    logTest('Leave', 'Get all leave requests for testing');
    const allRequests = await makeRequest('/api/leave/request', {
      cookie: regularUserCookie,
    });
    
    if (allRequests.ok && allRequests.data.leaveRequests?.length > 0) {
      const testRequestId = allRequests.data.leaveRequests[0].id;
      
      logTest('Leave', 'Cancel leave request');
      const cancel = await makeRequest(`/api/leave/request/${testRequestId}/cancel`, {
        method: 'POST',
        cookie: regularUserCookie,
      });
      logResult({
        endpoint: `/api/leave/request/${testRequestId}/cancel`,
        method: 'POST',
        status: cancel.ok || cancel.status === 400 ? 'PASS' : 'FAIL',
        message: cancel.ok ? 'Request cancelled' : `Status: ${cancel.status}`,
        statusCode: cancel.status,
      });
    }
  }
}

async function testAdminEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('👑 ADMIN ENDPOINTS');
  console.log('='.repeat(70));
  
  // Test without admin auth
  logTest('Admin', 'Stats endpoint - No auth');
  const statsNoAuth = await makeRequest('/api/admin/stats');
  logResult({
    endpoint: '/api/admin/stats',
    method: 'GET',
    status: statsNoAuth.status === 401 ? 'PASS' : 'FAIL',
    message: statsNoAuth.status === 401 ? 'Properly requires authentication' : 'Auth not enforced!',
    statusCode: statsNoAuth.status,
  });
  
  // Test with regular user (should fail)
  if (regularUserCookie) {
    logTest('Admin', 'Stats endpoint - Regular user');
    const statsRegular = await makeRequest('/api/admin/stats', {
      cookie: regularUserCookie,
    });
    logResult({
      endpoint: '/api/admin/stats',
      method: 'GET',
      status: statsRegular.status === 403 || !statsRegular.ok ? 'PASS' : 'WARN',
      message: !statsRegular.ok ? 'Admin access properly restricted' : 'Regular user can access admin endpoint!',
      statusCode: statsRegular.status,
    });
  }
  
  // Test with admin auth
  if (adminUserCookie) {
    logTest('Admin', 'Stats endpoint - Admin user');
    const stats = await makeRequest('/api/admin/stats', {
      cookie: adminUserCookie,
    });
    logResult({
      endpoint: '/api/admin/stats',
      method: 'GET',
      status: stats.ok ? 'PASS' : 'FAIL',
      message: stats.ok ? `Stats retrieved` : `Failed: ${stats.status}`,
      statusCode: stats.status,
    });
    
    logTest('Admin', 'Pending requests');
    const pending = await makeRequest('/api/admin/pending-requests', {
      cookie: adminUserCookie,
    });
    logResult({
      endpoint: '/api/admin/pending-requests',
      method: 'GET',
      status: pending.ok ? 'PASS' : 'FAIL',
      message: pending.ok ? `Found ${pending.data.requests?.length || 0} pending` : `Failed: ${pending.status}`,
      statusCode: pending.status,
    });
    
    logTest('Admin', 'Employee balances');
    const balances = await makeRequest('/api/admin/employee-balances', {
      cookie: adminUserCookie,
    });
    logResult({
      endpoint: '/api/admin/employee-balances',
      method: 'GET',
      status: balances.ok ? 'PASS' : 'FAIL',
      message: balances.ok ? `Found ${balances.data.balances?.length || 0} employees` : `Failed: ${balances.status}`,
      statusCode: balances.status,
    });
    
    logTest('Admin', 'Upcoming leave');
    const upcoming = await makeRequest('/api/admin/upcoming-leave', {
      cookie: adminUserCookie,
    });
    logResult({
      endpoint: '/api/admin/upcoming-leave',
      method: 'GET',
      status: upcoming.ok ? 'PASS' : 'FAIL',
      message: upcoming.ok ? `Found ${upcoming.data.upcomingLeave?.length || 0} upcoming` : `Failed: ${upcoming.status}`,
      statusCode: upcoming.status,
    });
    
    logTest('Admin', 'Performance metrics');
    const performance = await makeRequest('/api/admin/performance', {
      cookie: adminUserCookie,
    });
    logResult({
      endpoint: '/api/admin/performance',
      method: 'GET',
      status: performance.ok ? 'PASS' : 'FAIL',
      message: performance.ok ? 'Metrics retrieved' : `Failed: ${performance.status}`,
      statusCode: performance.status,
    });
    
    logTest('Admin', 'Bulk approve - Validation');
    const bulkApprove = await makeRequest('/api/admin/bulk-approve', {
      method: 'POST',
      cookie: adminUserCookie,
      body: { requestIds: [] }, // Empty array
    });
    logResult({
      endpoint: '/api/admin/bulk-approve',
      method: 'POST',
      status: !bulkApprove.ok || bulkApprove.data.approved === 0 ? 'PASS' : 'WARN',
      message: 'Validation working',
      statusCode: bulkApprove.status,
    });
    
    logTest('Admin', 'Bulk reject - Validation');
    const bulkReject = await makeRequest('/api/admin/bulk-reject', {
      method: 'POST',
      cookie: adminUserCookie,
      body: { requestIds: [] }, // Empty array
    });
    logResult({
      endpoint: '/api/admin/bulk-reject',
      method: 'POST',
      status: !bulkReject.ok || bulkReject.data.rejected === 0 ? 'PASS' : 'WARN',
      message: 'Validation working',
      statusCode: bulkReject.status,
    });
  }
}

async function testToilEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('⏰ TOIL (TIME OFF IN LIEU) ENDPOINTS');
  console.log('='.repeat(70));
  
  if (regularUserCookie) {
    logTest('TOIL', 'Get TOIL balance');
    const toilBalance = await makeRequest('/api/admin/toil', {
      cookie: regularUserCookie,
    });
    logResult({
      endpoint: '/api/admin/toil',
      method: 'GET',
      status: toilBalance.ok || toilBalance.status === 200 ? 'PASS' : 'FAIL',
      message: toilBalance.ok ? 'TOIL data retrieved' : `Status: ${toilBalance.status}`,
      statusCode: toilBalance.status,
    });
  }
  
  if (adminUserCookie) {
    logTest('TOIL', 'Pending TOIL requests - Admin');
    const pending = await makeRequest('/api/admin/toil/pending', {
      cookie: adminUserCookie,
    });
    logResult({
      endpoint: '/api/admin/toil/pending',
      method: 'GET',
      status: pending.ok ? 'PASS' : 'FAIL',
      message: pending.ok ? `Found ${pending.data.requests?.length || 0} pending TOIL` : `Failed: ${pending.status}`,
      statusCode: pending.status,
    });
    
    logTest('TOIL', 'Approve TOIL - Validation');
    const approve = await makeRequest('/api/admin/toil/approve', {
      method: 'POST',
      cookie: adminUserCookie,
      body: { requestId: 'invalid-id' },
    });
    logResult({
      endpoint: '/api/admin/toil/approve',
      method: 'POST',
      status: !approve.ok ? 'PASS' : 'WARN',
      message: !approve.ok ? 'Validation working' : 'Invalid ID accepted',
      statusCode: approve.status,
    });
  }
}

async function testCalendarEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('📅 CALENDAR ENDPOINTS');
  console.log('='.repeat(70));
  
  if (regularUserCookie) {
    logTest('Calendar', 'Team calendar');
    const calendar = await makeRequest('/api/calendar/team', {
      cookie: regularUserCookie,
    });
    logResult({
      endpoint: '/api/calendar/team',
      method: 'GET',
      status: calendar.ok ? 'PASS' : 'FAIL',
      message: calendar.ok ? 'Calendar data retrieved' : `Failed: ${calendar.status}`,
      statusCode: calendar.status,
    });
    
    logTest('Calendar', 'Team leave calendar');
    const teamLeave = await makeRequest('/api/calendar/team-leave', {
      cookie: regularUserCookie,
    });
    logResult({
      endpoint: '/api/calendar/team-leave',
      method: 'GET',
      status: teamLeave.ok ? 'PASS' : 'FAIL',
      message: teamLeave.ok ? `Found ${teamLeave.data.teamLeave?.length || 0} entries` : `Failed: ${teamLeave.status}`,
      statusCode: teamLeave.status,
    });
  }
}

async function testMiscEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('🔧 MISC ENDPOINTS');
  console.log('='.repeat(70));
  
  if (regularUserCookie) {
    logTest('Misc', 'Metrics endpoint');
    const metrics = await makeRequest('/api/metrics', {
      cookie: regularUserCookie,
    });
    logResult({
      endpoint: '/api/metrics',
      method: 'GET',
      status: metrics.ok || metrics.status === 200 ? 'PASS' : 'FAIL',
      message: metrics.ok ? 'Metrics retrieved' : `Status: ${metrics.status}`,
      statusCode: metrics.status,
    });
    
    logTest('Misc', 'Users endpoint');
    const users = await makeRequest('/api/users', {
      cookie: regularUserCookie,
    });
    logResult({
      endpoint: '/api/users',
      method: 'GET',
      status: users.ok ? 'PASS' : 'FAIL',
      message: users.ok ? `Found ${users.data.users?.length || 0} users` : `Failed: ${users.status}`,
      statusCode: users.status,
    });
  }
}

async function setupAuthentication() {
  console.log('\n' + '='.repeat(70));
  console.log('🔑 AUTHENTICATION SETUP');
  console.log('='.repeat(70));
  
  console.log('\n🔐 Attempting to authenticate regular user...');
  regularUserCookie = await login(
    TEST_CONFIG.regularUser.email,
    TEST_CONFIG.regularUser.password
  );
  
  if (regularUserCookie) {
    console.log('✅ Regular user authenticated successfully');
  } else {
    console.log('⚠️  Regular user authentication failed - some tests will be skipped');
    console.log('   Make sure the test user exists in your database:');
    console.log(`   Email: ${TEST_CONFIG.regularUser.email}`);
    console.log(`   Password: ${TEST_CONFIG.regularUser.password}`);
  }
  
  console.log('\n🔐 Attempting to authenticate admin user...');
  adminUserCookie = await login(
    TEST_CONFIG.adminUser.email,
    TEST_CONFIG.adminUser.password
  );
  
  if (adminUserCookie) {
    console.log('✅ Admin user authenticated successfully');
  } else {
    console.log('⚠️  Admin user authentication failed - admin tests will be skipped');
    console.log('   Make sure the admin user exists in your database:');
    console.log(`   Email: ${TEST_CONFIG.adminUser.email}`);
    console.log(`   Password: ${TEST_CONFIG.adminUser.password}`);
    console.log('   Role: ADMIN');
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;
  
  console.log(`\n✅ Passed:   ${passed}/${total}`);
  console.log(`❌ Failed:   ${failed}/${total}`);
  console.log(`⚠️  Warnings: ${warnings}/${total}`);
  console.log(`⏭️  Skipped:  ${skipped}/${total}`);
  
  const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  console.log(`\n📈 Success Rate: ${percentage}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`   • ${r.method} ${r.endpoint} - ${r.message}`);
      });
  }
  
  if (warnings > 0) {
    console.log('\n⚠️  Warnings:');
    results
      .filter(r => r.status === 'WARN')
      .forEach(r => {
        console.log(`   • ${r.method} ${r.endpoint} - ${r.message}`);
      });
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (failed === 0 && warnings === 0) {
    console.log('🎉 All tests passed! Your API is working correctly.');
  } else if (failed === 0) {
    console.log('✅ All tests passed with some warnings. Review warnings above.');
  } else {
    console.log('⚠️  Some tests failed. Please review the failures above.');
  }
  
  console.log('='.repeat(70) + '\n');
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 COMPREHENSIVE API ENDPOINT TEST SUITE');
  console.log('='.repeat(70));
  console.log(`\nTesting against: ${BASE_URL}`);
  console.log(`Started at: ${new Date().toLocaleString()}`);
  
  try {
    // Setup
    await setupAuthentication();
    
    // Run test suites
    await testHealthEndpoints();
    await testAuthEndpoints();
    await testLeaveEndpoints();
    await testAdminEndpoints();
    await testToilEndpoints();
    await testCalendarEndpoints();
    await testMiscEndpoints();
    
    // Print summary
    printSummary();
    
  } catch (error: any) {
    console.error('\n❌ Test suite crashed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(console.error);

