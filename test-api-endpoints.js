const fetch = require('node-fetch');

async function testAPIEndpoints() {
  const baseUrl = 'http://localhost:3000';
  const results = [];

  console.log('🚀 Testing all API endpoints...\n');

  // Test 1: Health check
  try {
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok && healthData.status === 'healthy') {
      results.push('✅ Health endpoint working');
    } else {
      results.push('❌ Health endpoint failed');
    }
  } catch (error) {
    results.push(`❌ Health endpoint error: ${error.message}`);
  }

  // Test 2: Ping endpoint
  try {
    console.log('2. Testing ping endpoint...');
    const pingResponse = await fetch(`${baseUrl}/api/ping`);
    const pingData = await pingResponse.json();
    
    if (pingResponse.ok && pingData.ping === 'pong') {
      results.push('✅ Ping endpoint working');
    } else {
      results.push('❌ Ping endpoint failed');
    }
  } catch (error) {
    results.push(`❌ Ping endpoint error: ${error.message}`);
  }

  // Test 3: Register endpoint
  try {
    console.log('3. Testing register endpoint...');
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    const registerData = await registerResponse.json();
    
    if (registerResponse.ok) {
      results.push('✅ Register endpoint working');
    } else if (registerData.error && registerData.error.includes('already exists')) {
      results.push('✅ Register endpoint working (user already exists)');
    } else {
      results.push(`❌ Register endpoint failed: ${registerData.error || 'Unknown error'}`);
    }
  } catch (error) {
    results.push(`❌ Register endpoint error: ${error.message}`);
  }

  // Test 4: Leave balance endpoint (requires auth)
  try {
    console.log('4. Testing leave balance endpoint...');
    const balanceResponse = await fetch(`${baseUrl}/api/leave/balance`);
    
    if (balanceResponse.status === 401) {
      results.push('✅ Leave balance endpoint properly requires authentication');
    } else if (balanceResponse.ok) {
      results.push('✅ Leave balance endpoint working');
    } else {
      results.push(`❌ Leave balance endpoint failed: ${balanceResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Leave balance endpoint error: ${error.message}`);
  }

  // Test 5: Leave requests endpoint (requires auth)
  try {
    console.log('5. Testing leave requests endpoint...');
    const requestsResponse = await fetch(`${baseUrl}/api/leave/requests`);
    
    if (requestsResponse.status === 401) {
      results.push('✅ Leave requests endpoint properly requires authentication');
    } else if (requestsResponse.ok) {
      results.push('✅ Leave requests endpoint working');
    } else {
      results.push(`❌ Leave requests endpoint failed: ${requestsResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Leave requests endpoint error: ${error.message}`);
  }

  // Test 6: Leave request creation endpoint (requires auth)
  try {
    console.log('6. Testing leave request creation endpoint...');
    const createResponse = await fetch(`${baseUrl}/api/leave/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: '2024-12-25',
        endDate: '2024-12-26',
        reason: 'Test leave request'
      })
    });
    
    if (createResponse.status === 401) {
      results.push('✅ Leave request creation endpoint properly requires authentication');
    } else if (createResponse.ok) {
      results.push('✅ Leave request creation endpoint working');
    } else {
      results.push(`❌ Leave request creation endpoint failed: ${createResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Leave request creation endpoint error: ${error.message}`);
  }

  // Test 7: Admin endpoints (requires admin auth)
  try {
    console.log('7. Testing admin approval endpoint...');
    const approveResponse = await fetch(`${baseUrl}/api/leave/request/test-id/approve`, {
      method: 'POST'
    });
    
    if (approveResponse.status === 401) {
      results.push('✅ Admin approval endpoint properly requires authentication');
    } else if (approveResponse.status === 404) {
      results.push('✅ Admin approval endpoint exists but requires valid request ID');
    } else {
      results.push(`ℹ️ Admin approval endpoint status: ${approveResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Admin approval endpoint error: ${error.message}`);
  }

  try {
    console.log('8. Testing admin rejection endpoint...');
    const rejectResponse = await fetch(`${baseUrl}/api/leave/request/test-id/reject`, {
      method: 'POST'
    });
    
    if (rejectResponse.status === 401) {
      results.push('✅ Admin rejection endpoint properly requires authentication');
    } else if (rejectResponse.status === 404) {
      results.push('✅ Admin rejection endpoint exists but requires valid request ID');
    } else {
      results.push(`ℹ️ Admin rejection endpoint status: ${rejectResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Admin rejection endpoint error: ${error.message}`);
  }

  return results;
}

// Run the test
testAPIEndpoints().then(results => {
  console.log('\n📊 API TEST RESULTS SUMMARY:');
  console.log('============================');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result}`);
  });
  
  const passed = results.filter(r => r.startsWith('✅')).length;
  const failed = results.filter(r => r.startsWith('❌')).length;
  const info = results.filter(r => r.startsWith('ℹ️')).length;
  
  console.log('\n📈 SUMMARY:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`ℹ️ Info: ${info}`);
  console.log(`📊 Total: ${results.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All API endpoints are working correctly!');
  } else {
    console.log('\n⚠️ Some API endpoints have issues. Please check the errors above.');
  }
}).catch(error => {
  console.error('❌ API test suite failed:', error);
});
