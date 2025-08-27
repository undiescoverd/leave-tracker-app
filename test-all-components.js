const fetch = require('node-fetch');

async function testAllComponents() {
  console.log('🧪 Testing All Components and API Endpoints');
  console.log('===========================================\n');

  const baseUrl = 'http://localhost:3000';
  let allTestsPassed = true;

  // Test 1: Health Check
  console.log('1. Testing Health Check...');
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Health check passed');
      console.log(`   📊 Status: ${data.status}`);
    } else {
      console.log('   ❌ Health check failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    allTestsPassed = false;
  }

  // Test 2: Authentication Status
  console.log('\n2. Testing Authentication Status...');
  try {
    const response = await fetch(`${baseUrl}/api/auth/session`);
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Auth session endpoint working');
      console.log(`   📊 Authenticated: ${!!data.user}`);
    } else {
      console.log('   ❌ Auth session failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Auth session error:', error.message);
    allTestsPassed = false;
  }

  // Test 3: Leave Requests API
  console.log('\n3. Testing Leave Requests API...');
  try {
    const response = await fetch(`${baseUrl}/api/leave/request`);
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Leave requests API working');
      console.log(`   📊 Found ${data.data?.leaveRequests?.length || data.leaveRequests?.length || 0} requests`);
    } else {
      console.log('   ❌ Leave requests API failed');
      const error = await response.text();
      console.log(`   Error: ${error}`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Leave requests API error:', error.message);
    allTestsPassed = false;
  }

  // Test 4: Leave Balance API
  console.log('\n4. Testing Leave Balance API...');
  try {
    const response = await fetch(`${baseUrl}/api/leave/balance`);
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Leave balance API working');
    } else {
      console.log('   ❌ Leave balance API failed (expected if not authenticated)');
    }
  } catch (error) {
    console.log('   ❌ Leave balance API error:', error.message);
  }

  // Test 5: Ping API
  console.log('\n5. Testing Ping API...');
  try {
    const response = await fetch(`${baseUrl}/api/ping`);
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Ping API working');
      console.log(`   📊 Response: ${data.message || 'pong'}`);
    } else {
      console.log('   ❌ Ping API failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Ping API error:', error.message);
    allTestsPassed = false;
  }

  // Test 6: Test Simple API
  console.log('\n6. Testing Test Simple API...');
  try {
    const response = await fetch(`${baseUrl}/api/test-simple`);
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Test simple API working');
      console.log(`   📊 Response: ${data.message || 'test'}`);
    } else {
      console.log('   ❌ Test simple API failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Test simple API error:', error.message);
    allTestsPassed = false;
  }

  // Test 7: Database Connection (via API)
  console.log('\n7. Testing Database Connection...');
  try {
    const response = await fetch(`${baseUrl}/api/leave/request`);
    if (response.ok) {
      console.log('   ✅ Database connection working (API responded)');
    } else {
      console.log('   ❌ Database connection failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Database connection error:', error.message);
    allTestsPassed = false;
  }

  // Test 8: Frontend Pages (basic connectivity)
  console.log('\n8. Testing Frontend Pages...');
  try {
    const response = await fetch(`${baseUrl}/login`);
    if (response.ok) {
      console.log('   ✅ Login page accessible');
    } else {
      console.log('   ❌ Login page failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Login page error:', error.message);
    allTestsPassed = false;
  }

  // Test 9: Admin Page (should redirect if not authenticated)
  console.log('\n9. Testing Admin Page...');
  try {
    const response = await fetch(`${baseUrl}/admin/pending-requests`);
    if (response.ok || response.status === 302) {
      console.log('   ✅ Admin page accessible (redirects if not authenticated)');
    } else {
      console.log('   ❌ Admin page failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Admin page error:', error.message);
    allTestsPassed = false;
  }

  // Test 10: Dashboard Page
  console.log('\n10. Testing Dashboard Page...');
  try {
    const response = await fetch(`${baseUrl}/dashboard`);
    if (response.ok || response.status === 302) {
      console.log('   ✅ Dashboard page accessible (redirects if not authenticated)');
    } else {
      console.log('   ❌ Dashboard page failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('   ❌ Dashboard page error:', error.message);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n📋 Test Summary');
  console.log('===============');
  if (allTestsPassed) {
    console.log('🎉 All critical tests passed!');
    console.log('✅ Your Leave Tracker app is working correctly');
  } else {
    console.log('⚠️  Some tests failed');
    console.log('🔧 Check the errors above and fix any issues');
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Login to test full functionality: http://localhost:3000/login');
  console.log('2. Use admin credentials to test admin features');
  console.log('3. Submit leave requests to test the complete workflow');
  console.log('4. Check admin panel for pending requests');
}

testAllComponents().catch(console.error);
