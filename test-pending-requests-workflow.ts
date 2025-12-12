/**
 * Test script for pending requests workflow
 * Tests the complete admin approve/reject functionality
 */

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
}

const results: TestResult[] = [];

function logTest(test: string) {
  console.log(`\n🧪 Testing: ${test}`);
}

function logResult(result: TestResult) {
  const icon = result.status === 'PASS' ? '✅' : '❌';
  console.log(`   ${icon} ${result.test} - ${result.message}`);
  results.push(result);
}

async function makeRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(`http://localhost:3002${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  return { response, data, ok: response.ok, status: response.status };
}

async function testWorkflow() {
  console.log('\n🚀 Testing Pending Requests Workflow\n');
  console.log('=' .repeat(60));

  let adminCookie = '';
  let regularUserCookie = '';
  let leaveRequestId = '';

  // 1. Login as regular user
  logTest('Regular user login');
  try {
    const login = await makeRequest('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'sup@tdhagency.com',
        password: 'Password123',
      }),
    });

    if (login.ok) {
      regularUserCookie = login.response.headers.get('set-cookie') || '';
      logResult({
        test: 'Regular user login',
        status: 'PASS',
        message: 'Logged in successfully',
      });
    } else {
      logResult({
        test: 'Regular user login',
        status: 'FAIL',
        message: `Failed: ${login.status}`,
      });
      return;
    }
  } catch (error: any) {
    logResult({
      test: 'Regular user login',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
    return;
  }

  // 2. Create a leave request as regular user
  logTest('Create leave request');
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const createRequest = await makeRequest('/api/leave/request', {
      method: 'POST',
      headers: {
        cookie: regularUserCookie,
      },
      body: JSON.stringify({
        startDate: tomorrow.toISOString(),
        endDate: dayAfter.toISOString(),
        type: 'ANNUAL',
        reason: 'Testing pending requests workflow',
      }),
    });

    if (createRequest.ok && createRequest.data.data?.id) {
      leaveRequestId = createRequest.data.data.id;
      logResult({
        test: 'Create leave request',
        status: 'PASS',
        message: `Created request ${leaveRequestId}`,
      });
    } else {
      logResult({
        test: 'Create leave request',
        status: 'FAIL',
        message: `Failed: ${createRequest.status}`,
      });
      return;
    }
  } catch (error: any) {
    logResult({
      test: 'Create leave request',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
    return;
  }

  // 3. Login as admin
  logTest('Admin login');
  try {
    const login = await makeRequest('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'ian@tdhagency.com',
        password: 'Password123',
      }),
    });

    if (login.ok) {
      adminCookie = login.response.headers.get('set-cookie') || '';
      logResult({
        test: 'Admin login',
        status: 'PASS',
        message: 'Logged in as admin',
      });
    } else {
      logResult({
        test: 'Admin login',
        status: 'FAIL',
        message: `Failed: ${login.status}`,
      });
      return;
    }
  } catch (error: any) {
    logResult({
      test: 'Admin login',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
    return;
  }

  // 4. Fetch pending requests
  logTest('Fetch pending requests');
  try {
    const pending = await makeRequest('/api/admin/pending-requests', {
      headers: {
        cookie: adminCookie,
      },
    });

    if (pending.ok) {
      const count = pending.data.data?.requests?.length || 0;
      const hasOurRequest = pending.data.data?.requests?.some((r: any) => r.id === leaveRequestId);

      logResult({
        test: 'Fetch pending requests',
        status: hasOurRequest ? 'PASS' : 'FAIL',
        message: hasOurRequest
          ? `Found ${count} pending requests (including test request)`
          : `Found ${count} pending requests but missing test request`,
      });
    } else {
      logResult({
        test: 'Fetch pending requests',
        status: 'FAIL',
        message: `Failed: ${pending.status}`,
      });
    }
  } catch (error: any) {
    logResult({
      test: 'Fetch pending requests',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }

  // 5. Fetch all requests
  logTest('Fetch all requests');
  try {
    const all = await makeRequest('/api/admin/all-requests', {
      headers: {
        cookie: adminCookie,
      },
    });

    if (all.ok) {
      const count = all.data.data?.requests?.length || 0;
      const hasOurRequest = all.data.data?.requests?.some((r: any) => r.id === leaveRequestId);

      logResult({
        test: 'Fetch all requests',
        status: hasOurRequest ? 'PASS' : 'FAIL',
        message: hasOurRequest
          ? `Found ${count} total requests (including test request)`
          : `Found ${count} total requests but missing test request`,
      });
    } else {
      logResult({
        test: 'Fetch all requests',
        status: 'FAIL',
        message: `Failed: ${all.status}`,
      });
    }
  } catch (error: any) {
    logResult({
      test: 'Fetch all requests',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }

  // 6. Approve the request
  logTest('Approve leave request');
  try {
    const approve = await makeRequest(`/api/leave/request/${leaveRequestId}/approve`, {
      method: 'POST',
      headers: {
        cookie: adminCookie,
      },
    });

    if (approve.ok) {
      logResult({
        test: 'Approve leave request',
        status: 'PASS',
        message: 'Request approved successfully',
      });
    } else {
      logResult({
        test: 'Approve leave request',
        status: 'FAIL',
        message: `Failed: ${approve.status} - ${approve.data.error?.message || approve.data.error}`,
      });
    }
  } catch (error: any) {
    logResult({
      test: 'Approve leave request',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }

  // 7. Verify request is no longer in pending
  logTest('Verify request removed from pending');
  try {
    const pending = await makeRequest('/api/admin/pending-requests', {
      headers: {
        cookie: adminCookie,
      },
    });

    if (pending.ok) {
      const hasOurRequest = pending.data.data?.requests?.some((r: any) => r.id === leaveRequestId);

      logResult({
        test: 'Verify request removed from pending',
        status: !hasOurRequest ? 'PASS' : 'FAIL',
        message: !hasOurRequest
          ? 'Request correctly removed from pending'
          : 'Request still in pending after approval',
      });
    } else {
      logResult({
        test: 'Verify request removed from pending',
        status: 'FAIL',
        message: `Failed: ${pending.status}`,
      });
    }
  } catch (error: any) {
    logResult({
      test: 'Verify request removed from pending',
      status: 'FAIL',
      message: `Error: ${error.message}`,
    });
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! The workflow is working correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the results above.\n');
  }
}

// Run the tests
testWorkflow().catch(console.error);
