#!/usr/bin/env tsx
/**
 * Comprehensive User Journey Test for Sup
 * Tests all features available to a regular USER role
 * 
 * Run with: npx tsx test-sup-user-journey.ts
 */

import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const BASE_URL = 'http://localhost:3000';

// Sup's credentials
const SUP_CREDENTIALS = {
  email: 'sup@tdhagency.com',
  password: 'Password123!',
  name: 'Sup Dhanasunthorn'
};

interface TestResult {
  feature: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

const results: TestResult[] = [];
let supClient: AxiosInstance | null = null;

function logResult(result: TestResult) {
  const emoji = {
    PASS: '✅',
    FAIL: '❌',
    SKIP: '⏭️'
  }[result.status];
  
  console.log(`   ${emoji} ${result.feature} - ${result.message}`);
  results.push(result);
  
  if (result.details) {
    console.log(`      Details:`, JSON.stringify(result.details, null, 2));
  }
}

async function login(): Promise<AxiosInstance | null> {
  try {
    console.log('\n🔐 Logging in as Sup...');
    const jar = new CookieJar();
    const client = wrapper(axios.create({
      baseURL: BASE_URL,
      jar,
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: () => true,
    }));
    
    // Get CSRF token
    const csrfResponse = await client.get('/api/auth/csrf');
    const csrfToken = csrfResponse.data.csrfToken;
    
    // Sign in
    const loginResponse = await client.post(
      '/api/auth/callback/credentials',
      new URLSearchParams({
        email: SUP_CREDENTIALS.email,
        password: SUP_CREDENTIALS.password,
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
    
    // Verify session
    const sessionResponse = await client.get('/api/auth/session');
    if (sessionResponse.data && sessionResponse.data.user) {
      console.log(`✅ Successfully logged in as ${sessionResponse.data.user.email}`);
      console.log(`   Role: ${sessionResponse.data.user.role}`);
      console.log(`   Name: ${sessionResponse.data.user.name || 'N/A'}`);
      return client;
    }
    
    console.log('❌ Login failed - no session found');
    return null;
  } catch (error: any) {
    console.error(`❌ Login error: ${error.message}`);
    return null;
  }
}

async function testDashboard() {
  console.log('\n📊 Testing Dashboard Access...');
  
  try {
    const dashboard = await supClient!.get('/dashboard', {
      maxRedirects: 0,
      validateStatus: () => true,
    });
    
    logResult({
      feature: 'Dashboard Page Access',
      status: dashboard.status === 200 ? 'PASS' : 'FAIL',
      message: `Status: ${dashboard.status}`,
      details: { statusCode: dashboard.status }
    });
  } catch (error: any) {
    logResult({
      feature: 'Dashboard Page Access',
      status: 'FAIL',
      message: `Error: ${error.message}`
    });
  }
}

async function testLeaveBalance() {
  console.log('\n💰 Testing Leave Balance...');
  
  try {
    const balance = await supClient!.get('/api/leave/balance');
    
    if (balance.status === 200) {
      const data = balance.data;
      logResult({
        feature: 'Get Leave Balance',
        status: 'PASS',
        message: `Balance retrieved successfully`,
        details: {
          annualLeave: data.annualLeaveBalance,
          toilHours: data.toilHours,
          sickLeave: data.sickLeaveBalance
        }
      });
    } else {
      logResult({
        feature: 'Get Leave Balance',
        status: 'FAIL',
        message: `Failed with status ${balance.status}`,
        details: balance.data
      });
    }
  } catch (error: any) {
    logResult({
      feature: 'Get Leave Balance',
      status: 'FAIL',
      message: `Error: ${error.message}`
    });
  }
}

async function testLeaveRequests() {
  console.log('\n📋 Testing Leave Requests...');
  
  try {
    // Get all leave requests
    const requests = await supClient!.get('/api/leave/requests');
    
    if (requests.status === 200) {
      const requestsList = requests.data.requests || [];
      logResult({
        feature: 'List Leave Requests',
        status: 'PASS',
        message: `Found ${requestsList.length} leave requests`,
        details: {
          count: requestsList.length,
          recentRequests: requestsList.slice(0, 3).map((r: any) => ({
            id: r.id,
            type: r.type,
            status: r.status,
            startDate: r.startDate,
            endDate: r.endDate
          }))
        }
      });
      
      // Try to get requests via alternative endpoint
      const altRequests = await supClient!.get('/api/leave/request');
      logResult({
        feature: 'Alternative Leave Requests Endpoint',
        status: altRequests.status === 200 ? 'PASS' : 'FAIL',
        message: altRequests.status === 200 ? 'Endpoint works' : `Failed: ${altRequests.status}`
      });
    } else {
      logResult({
        feature: 'List Leave Requests',
        status: 'FAIL',
        message: `Failed with status ${requests.status}`
      });
    }
  } catch (error: any) {
    logResult({
      feature: 'List Leave Requests',
      status: 'FAIL',
      message: `Error: ${error.message}`
    });
  }
}

async function testCreateLeaveRequest() {
  console.log('\n➕ Testing Create Leave Request...');
  
  try {
    // Create a future leave request
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const endDate = new Date(futureDate);
    endDate.setDate(endDate.getDate() + 2);
    
    const createRequest = await supClient!.post('/api/leave/request', {
      startDate: futureDate.toISOString(),
      endDate: endDate.toISOString(),
      type: 'ANNUAL',
      reason: 'Testing leave request creation from Sup user journey test'
    });
    
    if (createRequest.status === 200 || createRequest.status === 201) {
      const request = createRequest.data.leaveRequest || createRequest.data;
      logResult({
        feature: 'Create Leave Request',
        status: 'PASS',
        message: 'Leave request created successfully',
        details: {
          id: request.id,
          type: request.type,
          status: request.status,
          startDate: request.startDate,
          endDate: request.endDate,
          daysRequested: request.daysRequested
        }
      });
      
      // Test canceling the request
      if (request.id) {
        const cancelResponse = await supClient!.post(`/api/leave/request/${request.id}/cancel`);
        logResult({
          feature: 'Cancel Own Leave Request',
          status: cancelResponse.status === 200 ? 'PASS' : cancelResponse.status === 400 ? 'WARN' : 'FAIL',
          message: cancelResponse.status === 200 ? 'Request cancelled' : 
                   cancelResponse.status === 400 ? 'Already processed or can\'t cancel' :
                   `Failed: ${cancelResponse.status}`,
          details: { statusCode: cancelResponse.status }
        });
      }
    } else {
      logResult({
        feature: 'Create Leave Request',
        status: 'FAIL',
        message: `Failed with status ${createRequest.status}`,
        details: createRequest.data
      });
    }
  } catch (error: any) {
    logResult({
      feature: 'Create Leave Request',
      status: 'FAIL',
      message: `Error: ${error.message}`
    });
  }
}

async function testCalendarFeatures() {
  console.log('\n📅 Testing Calendar Features...');
  
  try {
    // Team calendar
    const teamCalendar = await supClient!.get('/api/calendar/team');
    logResult({
      feature: 'Team Calendar',
      status: teamCalendar.status === 200 ? 'PASS' : 'FAIL',
      message: teamCalendar.status === 200 ? 'Calendar data retrieved' : `Failed: ${teamCalendar.status}`,
      details: teamCalendar.status === 200 ? {
        entriesCount: teamCalendar.data.calendar?.length || 0
      } : undefined
    });
    
    // Team leave calendar
    const teamLeave = await supClient!.get('/api/calendar/team-leave');
    logResult({
      feature: 'Team Leave Calendar',
      status: teamLeave.status === 200 ? 'PASS' : 'FAIL',
      message: teamLeave.status === 200 ? 'Team leave data retrieved' : `Failed: ${teamLeave.status}`,
      details: teamLeave.status === 200 ? {
        entriesCount: teamLeave.data.teamLeave?.length || 0
      } : undefined
    });
  } catch (error: any) {
    logResult({
      feature: 'Calendar Features',
      status: 'FAIL',
      message: `Error: ${error.message}`
    });
  }
}

async function testAdminAccessRestriction() {
  console.log('\n🔒 Testing Admin Access Restrictions...');
  
  try {
    // Regular users should NOT be able to access admin endpoints
    const adminStats = await supClient!.get('/api/admin/stats', {
      validateStatus: () => true
    });
    
    logResult({
      feature: 'Admin Stats Access (Should be blocked)',
      status: (adminStats.status === 403 || adminStats.status === 401) ? 'PASS' : 'FAIL',
      message: (adminStats.status === 403 || adminStats.status === 401) ? 
               'Properly blocked from admin endpoint' : 
               `Security issue: Regular user can access admin (${adminStats.status})`,
      details: { statusCode: adminStats.status }
    });
    
    const pendingRequests = await supClient!.get('/api/admin/pending-requests', {
      validateStatus: () => true
    });
    
    logResult({
      feature: 'Admin Pending Requests Access (Should be blocked)',
      status: (pendingRequests.status === 403 || pendingRequests.status === 401) ? 'PASS' : 'FAIL',
      message: (pendingRequests.status === 403 || pendingRequests.status === 401) ? 
               'Properly blocked from admin endpoint' : 
               `Security issue: Regular user can access admin (${pendingRequests.status})`,
      details: { statusCode: pendingRequests.status }
    });
  } catch (error: any) {
    logResult({
      feature: 'Admin Access Restrictions',
      status: 'FAIL',
      message: `Error: ${error.message}`
    });
  }
}

async function testLeaveRequestValidation() {
  console.log('\n✅ Testing Leave Request Validation...');
  
  try {
    // Test invalid date range (end before start)
    const pastEndDate = new Date();
    const pastStartDate = new Date();
    pastStartDate.setDate(pastStartDate.getDate() + 5);
    pastEndDate.setDate(pastEndDate.getDate() + 3);
    
    const invalidDateRange = await supClient!.post('/api/leave/request', {
      startDate: pastStartDate.toISOString(),
      endDate: pastEndDate.toISOString(),
      type: 'ANNUAL',
      reason: 'Test invalid date range'
    }, {
      validateStatus: () => true
    });
    
    logResult({
      feature: 'Leave Request Validation (Invalid Dates)',
      status: (invalidDateRange.status === 400 || invalidDateRange.status === 422) ? 'PASS' : 'FAIL',
      message: (invalidDateRange.status === 400 || invalidDateRange.status === 422) ? 
               'Invalid date range properly rejected' : 
               `Validation not working (${invalidDateRange.status})`,
      details: { statusCode: invalidDateRange.status }
    });
    
    // Test missing required fields
    const missingFields = await supClient!.post('/api/leave/request', {
      type: 'ANNUAL'
      // Missing startDate, endDate, reason
    }, {
      validateStatus: () => true
    });
    
    logResult({
      feature: 'Leave Request Validation (Missing Fields)',
      status: (missingFields.status === 400 || missingFields.status === 422) ? 'PASS' : 'FAIL',
      message: (missingFields.status === 400 || missingFields.status === 422) ? 
               'Missing fields properly rejected' : 
               `Validation not working (${missingFields.status})`,
      details: { statusCode: missingFields.status }
    });
  } catch (error: any) {
    logResult({
      feature: 'Leave Request Validation',
      status: 'FAIL',
      message: `Error: ${error.message}`
    });
  }
}

async function testProfileAccess() {
  console.log('\n👤 Testing Profile Access...');
  
  try {
    const session = await supClient!.get('/api/auth/session');
    
    if (session.status === 200 && session.data.user) {
      logResult({
        feature: 'Session/Profile Information',
        status: 'PASS',
        message: 'Session data accessible',
        details: {
          email: session.data.user.email,
          name: session.data.user.name,
          role: session.data.user.role,
          id: session.data.user.id
        }
      });
    } else {
      logResult({
        feature: 'Session/Profile Information',
        status: 'FAIL',
        message: 'Could not retrieve session data'
      });
    }
  } catch (error: any) {
    logResult({
      feature: 'Session/Profile Information',
      status: 'FAIL',
      message: `Error: ${error.message}`
    });
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY - SUP USER JOURNEY');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;
  
  console.log(`\n✅ Passed:   ${passed}/${total}`);
  console.log(`❌ Failed:   ${failed}/${total}`);
  console.log(`⏭️  Skipped:  ${skipped}/${total}`);
  
  const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
  console.log(`\n📈 Success Rate: ${percentage}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`   • ${r.feature} - ${r.message}`);
      });
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Sup\'s user journey is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the failures above.');
  }
  
  console.log('='.repeat(70) + '\n');
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 SUP USER JOURNEY TEST SUITE');
  console.log('='.repeat(70));
  console.log(`\nTesting as: ${SUP_CREDENTIALS.name}`);
  console.log(`Email: ${SUP_CREDENTIALS.email}`);
  console.log(`Started at: ${new Date().toLocaleString()}`);
  console.log(`Testing against: ${BASE_URL}`);
  
  // Login
  supClient = await login();
  
  if (!supClient) {
    console.log('\n❌ Cannot proceed without authentication. Exiting.');
    process.exit(1);
  }
  
  // Run all tests
  await testDashboard();
  await testLeaveBalance();
  await testLeaveRequests();
  await testCreateLeaveRequest();
  await testCalendarFeatures();
  await testAdminAccessRestriction();
  await testLeaveRequestValidation();
  await testProfileAccess();
  
  // Print summary
  printSummary();
}

// Run the tests
runTests().catch(console.error);







