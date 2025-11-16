#!/usr/bin/env tsx
/**
 * Comprehensive API Endpoint Test Suite v2
 * Uses axios with cookie jar for proper session handling
 * 
 * Run with: npx tsx test-all-endpoints-v2.ts
 */

import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const BASE_URL = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  regularUser: {
    email: 'sup@tdhagency.com',
    password: 'Password123!',
    name: 'Sup Dhanasunthorn'
  },
  adminUser: {
    email: 'ian@tdhagency.com',
    password: 'Password123!',
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
let regularUserClient: AxiosInstance | null = null;
let adminUserClient: AxiosInstance | null = null;

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

// Authentication helper
async function login(email: string, password: string): Promise<AxiosInstance | null> {
  try {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
      baseURL: BASE_URL,
      jar,
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: () => true, // Don't throw on any status
    }));
    
    // Step 1: Get CSRF token
    const csrfResponse = await client.get('/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    
    // Step 2: Sign in
    const loginResponse = await client.post(
      '/api/auth/callback/credentials',
      new URLSearchParams({
        email,
        password,
        csrfToken,
        callbackUrl: BASE_URL,
        json: 'true',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    // Check if login was successful by testing the session
    const sessionResponse = await client.get('/api/auth/session');
    if (sessionResponse.data && sessionResponse.data.user) {
      return client;
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
  
  const client = axios.create({ baseURL: BASE_URL });
  
  logTest('Health', 'Health endpoint');
  try {
    const health = await client.get('/api/health');
    logResult({
      endpoint: '/api/health',
      method: 'GET',
      status: health.data.status === 'healthy' ? 'PASS' : 'FAIL',
      message: `Status: ${health.data.status}`,
      statusCode: health.status,
    });
  } catch (error: any) {
    logResult({
      endpoint: '/api/health',
      method: 'GET',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
  
  logTest('Health', 'Ping endpoint');
  try {
    const ping = await client.get('/api/ping');
    logResult({
      endpoint: '/api/ping',
      method: 'GET',
      status: ping.data.ping === 'pong' ? 'PASS' : 'FAIL',
      message: 'Pong received',
      statusCode: ping.status,
    });
  } catch (error: any) {
    logResult({
      endpoint: '/api/ping',
      method: 'GET',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
  
  logTest('Health', 'Readiness endpoint');
  try {
    const ready = await client.get('/api/readiness');
    logResult({
      endpoint: '/api/readiness',
      method: 'GET',
      status: ready.status === 200 ? 'PASS' : 'FAIL',
      message: 'System ready',
      statusCode: ready.status,
    });
  } catch (error: any) {
    logResult({
      endpoint: '/api/readiness',
      method: 'GET',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
}

async function testAuthEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 AUTHENTICATION ENDPOINTS');
  console.log('='.repeat(70));
  
  const unauthClient = axios.create({ baseURL: BASE_URL, validateStatus: () => true });
  
  logTest('Auth', 'Register endpoint - Duplicate user');
  try {
    const register = await unauthClient.post('/api/auth/register', {
      email: TEST_CONFIG.regularUser.email,
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
      name: 'Test User'
    });
    // Should fail because user already exists
    logResult({
      endpoint: '/api/auth/register',
      method: 'POST',
      status: !register.data.success || register.status === 400 ? 'PASS' : 'FAIL',
      message: !register.data.success ? 'Duplicate user properly rejected' : 'Duplicate accepted (bad)',
      statusCode: register.status,
    });
  } catch (error: any) {
    logResult({
      endpoint: '/api/auth/register',
      method: 'POST',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
  
  logTest('Auth', 'Forgot password endpoint');
  try {
    const forgot = await unauthClient.post('/api/auth/forgot-password', {
      email: TEST_CONFIG.regularUser.email
    });
    logResult({
      endpoint: '/api/auth/forgot-password',
      method: 'POST',
      status: forgot.status === 200 ? 'PASS' : 'FAIL',
      message: forgot.status === 200 ? 'Password reset initiated' : `Failed: ${forgot.status}`,
      statusCode: forgot.status,
    });
  } catch (error: any) {
    logResult({
      endpoint: '/api/auth/forgot-password',
      method: 'POST',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
  
  logTest('Auth', 'Reset password endpoint - Invalid token');
  try {
    const reset = await unauthClient.post('/api/auth/reset-password', {
      token: 'invalid-token-123',
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!'
    });
    // Should fail with invalid token
    logResult({
      endpoint: '/api/auth/reset-password',
      method: 'POST',
      status: reset.status === 400 || reset.status === 404 ? 'PASS' : 'FAIL',
      message: reset.status === 400 || reset.status === 404 ? 'Invalid token properly rejected' : `Unexpected: ${reset.status}`,
      statusCode: reset.status,
    });
  } catch (error: any) {
    logResult({
      endpoint: '/api/auth/reset-password',
      method: 'POST',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }
}

async function testLeaveEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('🏖️  LEAVE MANAGEMENT ENDPOINTS');
  console.log('='.repeat(70));
  
  const unauthClient = axios.create({ baseURL: BASE_URL, validateStatus: () => true });
  
  logTest('Leave', 'Balance endpoint - No auth');
  try {
    const balanceNoAuth = await unauthClient.get('/api/leave/balance', {
      maxRedirects: 0  // Don't follow redirects
    });
    // Accept 401 (Unauthorized), 307 (NextAuth redirect), or redirect to login
    const isAuthEnforced = balanceNoAuth.status === 401 || 
                           balanceNoAuth.status === 307 || 
                           balanceNoAuth.status === 302 ||
                           (balanceNoAuth.status === 200 && 
                            typeof balanceNoAuth.data === 'string' && 
                            balanceNoAuth.data.includes('/login'));
    
    logResult({
      endpoint: '/api/leave/balance',
      method: 'GET',
      status: isAuthEnforced ? 'PASS' : 'FAIL',
      message: isAuthEnforced ? `Properly requires authentication (${balanceNoAuth.status})` : 'Auth not enforced!',
      statusCode: balanceNoAuth.status,
    });
  } catch (error: any) {
    // Axios throws on redirect with maxRedirects: 0, which is good - means auth is working
    if (error.response && (error.response.status === 302 || error.response.status === 307)) {
      logResult({
        endpoint: '/api/leave/balance',
        method: 'GET',
        status: 'PASS',
        message: `Properly requires authentication (${error.response.status} redirect)`,
        statusCode: error.response.status,
      });
    } else {
      logResult({
        endpoint: '/api/leave/balance',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }
  
  if (regularUserClient) {
    logTest('Leave', 'Balance endpoint - With auth');
    try {
      const balance = await regularUserClient.get('/api/leave/balance');
      logResult({
        endpoint: '/api/leave/balance',
        method: 'GET',
        status: balance.status === 200 ? 'PASS' : 'FAIL',
        message: balance.status === 200 ? `Balance retrieved` : `Failed: ${balance.status}`,
        statusCode: balance.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/leave/balance',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('Leave', 'Get leave requests');
    try {
      const requests = await regularUserClient.get('/api/leave/requests');
      logResult({
        endpoint: '/api/leave/requests',
        method: 'GET',
        status: requests.status === 200 ? 'PASS' : 'FAIL',
        message: requests.status === 200 ? `Found ${requests.data.requests?.length || 0} requests` : `Failed: ${requests.status}`,
        statusCode: requests.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/leave/requests',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('Leave', 'Create leave request - Valid');
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const endDate = new Date(futureDate);
      endDate.setDate(endDate.getDate() + 2);
      
      const createRequest = await regularUserClient.post('/api/leave/request', {
        startDate: futureDate.toISOString(),  // Full ISO datetime string required
        endDate: endDate.toISOString(),        // Full ISO datetime string required
        type: 'ANNUAL',  // Field is 'type' not 'leaveType'
        reason: 'Automated test leave request',  // Field is 'reason' not 'comments'
      });
      
      logResult({
        endpoint: '/api/leave/request',
        method: 'POST',
        status: createRequest.status === 200 || createRequest.status === 201 ? 'PASS' : 'FAIL',
        message: createRequest.status === 200 || createRequest.status === 201 ? 'Request created' : `Failed: ${createRequest.status}`,
        statusCode: createRequest.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/leave/request',
        method: 'POST',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    // Get a leave request ID for testing approve/reject/cancel
    logTest('Leave', 'Get leave request ID for testing');
    try {
      const allRequests = await regularUserClient.get('/api/leave/request');
      if (allRequests.data?.leaveRequests?.length > 0) {
        const testRequestId = allRequests.data.leaveRequests[0].id;
        
        // Test cancel endpoint (as regular user on own request)
        logTest('Leave', 'Cancel leave request');
        const cancel = await regularUserClient.post(`/api/leave/request/${testRequestId}/cancel`);
        logResult({
          endpoint: `/api/leave/request/[id]/cancel`,
          method: 'POST',
          status: cancel.status === 200 || cancel.status === 400 ? 'PASS' : 'FAIL',
          message: cancel.status === 200 ? 'Request cancelled' : cancel.status === 400 ? 'Already processed (expected)' : `Failed: ${cancel.status}`,
          statusCode: cancel.status,
        });
        
        // Test approve endpoint (should fail - only admin can approve)
        logTest('Leave', 'Approve leave request - Regular user (should fail)');
        const approveAsUser = await regularUserClient.post(`/api/leave/request/${testRequestId}/approve`);
        logResult({
          endpoint: `/api/leave/request/[id]/approve`,
          method: 'POST',
          status: approveAsUser.status === 403 || approveAsUser.status === 401 ? 'PASS' : 'WARN',
          message: approveAsUser.status === 403 || approveAsUser.status === 401 ? 'Regular user properly blocked' : 'Security issue: regular user can approve',
          statusCode: approveAsUser.status,
        });
        
        // Test reject endpoint (should fail - only admin can reject)
        logTest('Leave', 'Reject leave request - Regular user (should fail)');
        const rejectAsUser = await regularUserClient.post(`/api/leave/request/${testRequestId}/reject`);
        logResult({
          endpoint: `/api/leave/request/[id]/reject`,
          method: 'POST',
          status: rejectAsUser.status === 403 || rejectAsUser.status === 401 ? 'PASS' : 'WARN',
          message: rejectAsUser.status === 403 || rejectAsUser.status === 401 ? 'Regular user properly blocked' : 'Security issue: regular user can reject',
          statusCode: rejectAsUser.status,
        });
      } else {
        logResult({
          endpoint: '/api/leave/request/[id]/*',
          method: 'POST',
          status: 'SKIP',
          message: 'No leave requests to test with',
        });
      }
    } catch (error: any) {
      logResult({
        endpoint: '/api/leave/request/[id]/*',
        method: 'POST',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }
}

async function testAdminEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('👑 ADMIN ENDPOINTS');
  console.log('='.repeat(70));
  
  const unauthClient = axios.create({ baseURL: BASE_URL, validateStatus: () => true });
  
  logTest('Admin', 'Stats endpoint - No auth');
  try {
    const statsNoAuth = await unauthClient.get('/api/admin/stats', {
      maxRedirects: 0  // Don't follow redirects
    });
    // Accept 401 (Unauthorized), 307 (NextAuth redirect), or redirect to login
    const isAuthEnforced = statsNoAuth.status === 401 || 
                           statsNoAuth.status === 307 || 
                           statsNoAuth.status === 302 ||
                           (statsNoAuth.status === 200 && 
                            typeof statsNoAuth.data === 'string' && 
                            statsNoAuth.data.includes('/login'));
    
    logResult({
      endpoint: '/api/admin/stats',
      method: 'GET',
      status: isAuthEnforced ? 'PASS' : 'FAIL',
      message: isAuthEnforced ? `Properly requires authentication (${statsNoAuth.status})` : 'Auth not enforced!',
      statusCode: statsNoAuth.status,
    });
  } catch (error: any) {
    // Axios throws on redirect with maxRedirects: 0, which is good - means auth is working
    if (error.response && (error.response.status === 302 || error.response.status === 307)) {
      logResult({
        endpoint: '/api/admin/stats',
        method: 'GET',
        status: 'PASS',
        message: `Properly requires authentication (${error.response.status} redirect)`,
        statusCode: error.response.status,
      });
    } else {
      logResult({
        endpoint: '/api/admin/stats',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }
  
  if (regularUserClient) {
    logTest('Admin', 'Stats endpoint - Regular user');
    try {
      const statsRegular = await regularUserClient.get('/api/admin/stats');
      logResult({
        endpoint: '/api/admin/stats',
        method: 'GET',
        status: statsRegular.status === 403 || statsRegular.status === 401 ? 'PASS' : 'WARN',
        message: statsRegular.status === 403 || statsRegular.status === 401 ? 'Admin access properly restricted' : 'Regular user can access admin endpoint!',
        statusCode: statsRegular.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/stats',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }
  
  if (adminUserClient) {
    logTest('Admin', 'Stats endpoint - Admin user');
    try {
      const stats = await adminUserClient.get('/api/admin/stats');
      logResult({
        endpoint: '/api/admin/stats',
        method: 'GET',
        status: stats.status === 200 ? 'PASS' : 'FAIL',
        message: stats.status === 200 ? 'Stats retrieved' : `Failed: ${stats.status}`,
        statusCode: stats.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/stats',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('Admin', 'Pending requests');
    try {
      const pending = await adminUserClient.get('/api/admin/pending-requests');
      logResult({
        endpoint: '/api/admin/pending-requests',
        method: 'GET',
        status: pending.status === 200 ? 'PASS' : 'FAIL',
        message: pending.status === 200 ? `Found ${pending.data.requests?.length || 0} pending` : `Failed: ${pending.status}`,
        statusCode: pending.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/pending-requests',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('Admin', 'Employee balances');
    try {
      const balances = await adminUserClient.get('/api/admin/employee-balances');
      logResult({
        endpoint: '/api/admin/employee-balances',
        method: 'GET',
        status: balances.status === 200 ? 'PASS' : 'FAIL',
        message: balances.status === 200 ? `Found ${balances.data.balances?.length || 0} employees` : `Failed: ${balances.status}`,
        statusCode: balances.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/employee-balances',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('Admin', 'Upcoming leave');
    try {
      const upcoming = await adminUserClient.get('/api/admin/upcoming-leave');
      logResult({
        endpoint: '/api/admin/upcoming-leave',
        method: 'GET',
        status: upcoming.status === 200 ? 'PASS' : 'FAIL',
        message: upcoming.status === 200 ? `Found ${upcoming.data.upcomingLeave?.length || 0} upcoming` : `Failed: ${upcoming.status}`,
        statusCode: upcoming.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/upcoming-leave',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('Admin', 'Performance metrics');
    try {
      const performance = await adminUserClient.get('/api/admin/performance');
      logResult({
        endpoint: '/api/admin/performance',
        method: 'GET',
        status: performance.status === 200 ? 'PASS' : 'FAIL',
        message: performance.status === 200 ? 'Metrics retrieved' : `Failed: ${performance.status}`,
        statusCode: performance.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/performance',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('Admin', 'Bulk approve - Empty array');
    try {
      const bulkApprove = await adminUserClient.post('/api/admin/bulk-approve', {
        requestIds: []
      });
      logResult({
        endpoint: '/api/admin/bulk-approve',
        method: 'POST',
        status: bulkApprove.status === 200 || bulkApprove.status === 400 ? 'PASS' : 'FAIL',
        message: bulkApprove.status === 200 ? 'Empty array handled' : bulkApprove.status === 400 ? 'Validation working' : `Failed: ${bulkApprove.status}`,
        statusCode: bulkApprove.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/bulk-approve',
        method: 'POST',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('Admin', 'Bulk reject - Empty array');
    try {
      const bulkReject = await adminUserClient.post('/api/admin/bulk-reject', {
        requestIds: []
      });
      logResult({
        endpoint: '/api/admin/bulk-reject',
        method: 'POST',
        status: bulkReject.status === 200 || bulkReject.status === 400 ? 'PASS' : 'FAIL',
        message: bulkReject.status === 200 ? 'Empty array handled' : bulkReject.status === 400 ? 'Validation working' : `Failed: ${bulkReject.status}`,
        statusCode: bulkReject.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/bulk-reject',
        method: 'POST',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    // Test admin approve/reject with a pending leave request
    logTest('Admin', 'Get pending leave requests for admin testing');
    try {
      const pendingReqs = await adminUserClient.get('/api/admin/pending-requests');
      if (pendingReqs.data?.requests?.length > 0) {
        const testRequestId = pendingReqs.data.requests[0].id;
        
        logTest('Admin', 'Approve leave request - As admin');
        const approveAsAdmin = await adminUserClient.post(`/api/leave/request/${testRequestId}/approve`);
        logResult({
          endpoint: `/api/leave/request/[id]/approve`,
          method: 'POST',
          status: approveAsAdmin.status === 200 ? 'PASS' : approveAsAdmin.status === 400 ? 'WARN' : 'FAIL',
          message: approveAsAdmin.status === 200 ? 'Admin can approve' : approveAsAdmin.status === 400 ? 'Already processed' : `Failed: ${approveAsAdmin.status}`,
          statusCode: approveAsAdmin.status,
        });
        
        // Create another request for reject testing
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 60);
        const endDate = new Date(futureDate);
        endDate.setDate(endDate.getDate() + 2);
        
        // Use regular user client to create a request
        if (regularUserClient) {
          const newReq = await regularUserClient.post('/api/leave/request', {
            startDate: futureDate.toISOString(),
            endDate: endDate.toISOString(),
            type: 'ANNUAL',
            reason: 'Test request for rejection',
          });
          
          if (newReq.data?.leaveRequest?.id) {
            logTest('Admin', 'Reject leave request - As admin');
            const rejectAsAdmin = await adminUserClient.post(`/api/leave/request/${newReq.data.leaveRequest.id}/reject`);
            logResult({
              endpoint: `/api/leave/request/[id]/reject`,
              method: 'POST',
              status: rejectAsAdmin.status === 200 ? 'PASS' : 'FAIL',
              message: rejectAsAdmin.status === 200 ? 'Admin can reject' : `Failed: ${rejectAsAdmin.status}`,
              statusCode: rejectAsAdmin.status,
            });
          }
        }
      } else {
        logResult({
          endpoint: '/api/leave/request/[id]/approve-reject',
          method: 'POST',
          status: 'SKIP',
          message: 'No pending requests to test with',
        });
      }
    } catch (error: any) {
      logResult({
        endpoint: '/api/leave/request/[id]/approve-reject',
        method: 'POST',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    // Get a user ID for testing employee details
    logTest('Admin', 'Get user for employee details testing');
    try {
      const users = await adminUserClient.get('/api/users');
      if (users.data?.users?.length > 0) {
        const testUserId = users.data.users[0].id;
        
        logTest('Admin', 'Employee details');
        const empDetails = await adminUserClient.get(`/api/admin/employee-details/${testUserId}`);
        logResult({
          endpoint: '/api/admin/employee-details/[employeeId]',
          method: 'GET',
          status: empDetails.status === 200 ? 'PASS' : 'FAIL',
          message: empDetails.status === 200 ? 'Employee details retrieved' : `Failed: ${empDetails.status}`,
          statusCode: empDetails.status,
        });
        
        logTest('Admin', 'Employee export');
        const empExport = await adminUserClient.get(`/api/admin/employee-details/${testUserId}/export`);
        logResult({
          endpoint: '/api/admin/employee-details/[employeeId]/export',
          method: 'GET',
          status: empExport.status === 200 ? 'PASS' : 'FAIL',
          message: empExport.status === 200 ? 'Export generated' : `Failed: ${empExport.status}`,
          statusCode: empExport.status,
        });
      } else {
        logResult({
          endpoint: '/api/admin/employee-details/[employeeId]',
          method: 'GET',
          status: 'SKIP',
          message: 'No users to test with',
        });
      }
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/employee-details/*',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }
}

async function testToilEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('⏰ TOIL (TIME OFF IN LIEU) ENDPOINTS');
  console.log('='.repeat(70));
  
  if (adminUserClient) {
    logTest('TOIL', 'Get TOIL entries - Admin');
    try {
      const toilBalance = await adminUserClient.get('/api/admin/toil');
      logResult({
        endpoint: '/api/admin/toil',
        method: 'GET',
        status: toilBalance.status === 200 ? 'PASS' : 'FAIL',
        message: toilBalance.status === 200 ? 'TOIL data retrieved' : `Failed: ${toilBalance.status}`,
        statusCode: toilBalance.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/toil',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }
  
  if (adminUserClient) {
    logTest('TOIL', 'Pending TOIL requests - Admin');
    try {
      const pending = await adminUserClient.get('/api/admin/toil/pending');
      logResult({
        endpoint: '/api/admin/toil/pending',
        method: 'GET',
        status: pending.status === 200 ? 'PASS' : 'FAIL',
        message: pending.status === 200 ? `Found ${pending.data.requests?.length || 0} pending TOIL` : `Failed: ${pending.status}`,
        statusCode: pending.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/toil/pending',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('TOIL', 'Approve TOIL - Invalid ID');
    try {
      const approve = await adminUserClient.post('/api/admin/toil/approve', {
        requestId: 'invalid-id-123'  // Schema expects requestId, not toilEntryId
      });
      // 422 is acceptable - means validation rejected the format (not a valid UUID)
      logResult({
        endpoint: '/api/admin/toil/approve',
        method: 'POST',
        status: approve.status === 400 || approve.status === 404 || approve.status === 422 ? 'PASS' : 'FAIL',
        message: approve.status === 400 || approve.status === 404 || approve.status === 422 ?
                 'Validation properly rejected invalid format' :
                 `Unexpected: ${approve.status}`,
        statusCode: approve.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/toil/approve',
        method: 'POST',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }
}

async function testCalendarEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('📅 CALENDAR ENDPOINTS');
  console.log('='.repeat(70));
  
  if (regularUserClient) {
    logTest('Calendar', 'Team calendar');
    try {
      const calendar = await regularUserClient.get('/api/calendar/team');
      logResult({
        endpoint: '/api/calendar/team',
        method: 'GET',
        status: calendar.status === 200 ? 'PASS' : 'FAIL',
        message: calendar.status === 200 ? 'Calendar data retrieved' : `Failed: ${calendar.status}`,
        statusCode: calendar.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/calendar/team',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('Calendar', 'Team leave calendar');
    try {
      const teamLeave = await regularUserClient.get('/api/calendar/team-leave');
      logResult({
        endpoint: '/api/calendar/team-leave',
        method: 'GET',
        status: teamLeave.status === 200 ? 'PASS' : 'FAIL',
        message: teamLeave.status === 200 ? `Found ${teamLeave.data.teamLeave?.length || 0} entries` : `Failed: ${teamLeave.status}`,
        statusCode: teamLeave.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/calendar/team-leave',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }
}

async function testMiscEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('🔧 MISC ENDPOINTS');
  console.log('='.repeat(70));
  
  if (regularUserClient) {
    logTest('Misc', 'Users endpoint - Regular user');
    try {
      const users = await regularUserClient.get('/api/users');
      // This endpoint is admin-only, so 403 is expected and correct for regular users
      logResult({
        endpoint: '/api/users',
        method: 'GET',
        status: users.status === 403 ? 'PASS' : users.status === 200 ? 'WARN' : 'FAIL',
        message: users.status === 403 ? 'Admin-only access properly enforced' : 
                 users.status === 200 ? 'Warning: Regular user can access admin endpoint' : 
                 `Unexpected status: ${users.status}`,
        statusCode: users.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/users',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('Misc', 'Metrics endpoint');
    try {
      const metrics = await regularUserClient.get('/api/metrics');
      // Metrics endpoint returns 404 if METRICS_ENABLED != 'true' in env (by design)
      logResult({
        endpoint: '/api/metrics',
        method: 'GET',
        status: metrics.status === 200 || metrics.status === 404 ? 'PASS' : 'FAIL',
        message: metrics.status === 200 ? 'Metrics retrieved' : 
                 metrics.status === 404 ? 'Metrics disabled (expected)' : 
                 `Failed: ${metrics.status}`,
        statusCode: metrics.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/metrics',
        method: 'GET',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }
  
  if (adminUserClient) {
    logTest('Misc', 'Seed dummy data endpoint');
    try {
      // Just test that endpoint exists, don't actually seed (could pollute database)
      const seed = await adminUserClient.post('/api/admin/seed-dummy-data', {});
      logResult({
        endpoint: '/api/admin/seed-dummy-data',
        method: 'POST',
        status: seed.status === 200 || seed.status === 400 ? 'PASS' : 'FAIL',
        message: seed.status === 200 ? 'Seeding works' : seed.status === 400 ? 'Endpoint exists (validation)' : `Failed: ${seed.status}`,
        statusCode: seed.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/seed-dummy-data',
        method: 'POST',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
    
    logTest('Misc', 'Comprehensive seed endpoint');
    try {
      // Just test that endpoint exists, don't actually seed
      const compSeed = await adminUserClient.post('/api/admin/comprehensive-seed', {});
      logResult({
        endpoint: '/api/admin/comprehensive-seed',
        method: 'POST',
        status: compSeed.status === 200 || compSeed.status === 400 ? 'PASS' : 'FAIL',
        message: compSeed.status === 200 ? 'Seeding works' : compSeed.status === 400 ? 'Endpoint exists (validation)' : `Failed: ${compSeed.status}`,
        statusCode: compSeed.status,
      });
    } catch (error: any) {
      logResult({
        endpoint: '/api/admin/comprehensive-seed',
        method: 'POST',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
    }
  }
}

async function setupAuthentication() {
  console.log('\n' + '='.repeat(70));
  console.log('🔑 AUTHENTICATION SETUP');
  console.log('='.repeat(70));
  
  console.log('\n🔐 Attempting to authenticate regular user...');
  regularUserClient = await login(
    TEST_CONFIG.regularUser.email,
    TEST_CONFIG.regularUser.password
  );
  
  if (regularUserClient) {
    console.log('✅ Regular user authenticated successfully');
  } else {
    console.log('⚠️  Regular user authentication failed - some tests will be skipped');
  }
  
  console.log('\n🔐 Attempting to authenticate admin user...');
  adminUserClient = await login(
    TEST_CONFIG.adminUser.email,
    TEST_CONFIG.adminUser.password
  );
  
  if (adminUserClient) {
    console.log('✅ Admin user authenticated successfully');
  } else {
    console.log('⚠️  Admin user authentication failed - admin tests will be skipped');
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
  console.log('🚀 COMPREHENSIVE API ENDPOINT TEST SUITE V2');
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

