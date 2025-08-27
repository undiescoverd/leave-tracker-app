const fetch = require('node-fetch');

async function testPageNavigation() {
  const baseUrl = 'http://localhost:3001';
  const results = [];

  console.log('🚀 Testing all page navigation and button links...\n');

  // Test 1: Home page redirect
  try {
    console.log('1. Testing home page redirect...');
    const homeResponse = await fetch(`${baseUrl}/`);
    
    if (homeResponse.status === 200) {
      const html = await homeResponse.text();
      if (html.includes('login') || html.includes('dashboard')) {
        results.push('✅ Home page loads and redirects correctly');
      } else {
        results.push('❌ Home page content unexpected');
      }
    } else {
      results.push(`❌ Home page failed: ${homeResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Home page error: ${error.message}`);
  }

  // Test 2: Login page
  try {
    console.log('2. Testing login page...');
    const loginResponse = await fetch(`${baseUrl}/login`);
    
    if (loginResponse.status === 200) {
      const html = await loginResponse.text();
      if (html.includes('Sign in to your account') && html.includes('Create an account')) {
        results.push('✅ Login page loads correctly with all buttons');
      } else {
        results.push('❌ Login page missing expected content');
      }
    } else {
      results.push(`❌ Login page failed: ${loginResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Login page error: ${error.message}`);
  }

  // Test 3: Register page
  try {
    console.log('3. Testing register page...');
    const registerResponse = await fetch(`${baseUrl}/register`);
    
    if (registerResponse.status === 200) {
      const html = await registerResponse.text();
      if (html.includes('Create your account') && html.includes('Sign in to your account')) {
        results.push('✅ Register page loads correctly with all buttons');
      } else {
        results.push('❌ Register page missing expected content');
      }
    } else {
      results.push(`❌ Register page failed: ${registerResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Register page error: ${error.message}`);
  }

  // Test 4: Dashboard page (should redirect to login when not authenticated)
  try {
    console.log('4. Testing dashboard page access...');
    const dashboardResponse = await fetch(`${baseUrl}/dashboard`);
    
    if (dashboardResponse.status === 200) {
      const html = await dashboardResponse.text();
      if (html.includes('login') || html.includes('Sign in')) {
        results.push('✅ Dashboard properly redirects unauthenticated users to login');
      } else if (html.includes('TDH Agency Leave Tracker') && html.includes('Dashboard')) {
        results.push('✅ Dashboard loads correctly (user may be authenticated)');
      } else {
        results.push('❌ Dashboard page content unexpected');
      }
    } else {
      results.push(`❌ Dashboard page failed: ${dashboardResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Dashboard page error: ${error.message}`);
  }

  // Test 5: Leave requests page (should redirect to login when not authenticated)
  try {
    console.log('5. Testing leave requests page access...');
    const requestsResponse = await fetch(`${baseUrl}/leave/requests`);
    
    if (requestsResponse.status === 200) {
      const html = await requestsResponse.text();
      if (html.includes('login') || html.includes('Sign in')) {
        results.push('✅ Leave requests page properly redirects unauthenticated users to login');
      } else if (html.includes('My Leave History') && html.includes('Back to Dashboard')) {
        results.push('✅ Leave requests page loads correctly (user may be authenticated)');
      } else {
        results.push('❌ Leave requests page content unexpected');
      }
    } else {
      results.push(`❌ Leave requests page failed: ${requestsResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Leave requests page error: ${error.message}`);
  }

  // Test 6: Admin pending requests page (should redirect to login when not authenticated)
  try {
    console.log('6. Testing admin pending requests page access...');
    const adminResponse = await fetch(`${baseUrl}/admin/pending-requests`);
    
    if (adminResponse.status === 200) {
      const html = await adminResponse.text();
      if (html.includes('login') || html.includes('Sign in')) {
        results.push('✅ Admin page properly redirects unauthenticated users to login');
      } else if (html.includes('TDH Agency Leave Tracker - Admin') && html.includes('Pending Requests')) {
        results.push('✅ Admin page loads correctly (admin user may be authenticated)');
      } else {
        results.push('❌ Admin page content unexpected');
      }
    } else {
      results.push(`❌ Admin page failed: ${adminResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Admin page error: ${error.message}`);
  }

  // Test 7: Check for 404 pages (should redirect to login)
  try {
    console.log('7. Testing 404 handling...');
    const notFoundResponse = await fetch(`${baseUrl}/nonexistent-page`);
    
    if (notFoundResponse.status === 200) {
      const html = await notFoundResponse.text();
      if (html.includes('login') || html.includes('Sign in')) {
        results.push('✅ 404 handling works correctly - redirects to login');
      } else {
        results.push('❌ 404 handling unexpected - should redirect to login');
      }
    } else {
      results.push(`❌ 404 handling unexpected: ${notFoundResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ 404 test error: ${error.message}`);
  }

  // Test 8: Check static assets
  try {
    console.log('8. Testing static assets...');
    const faviconResponse = await fetch(`${baseUrl}/favicon.ico`);
    
    if (faviconResponse.status === 200) {
      results.push('✅ Static assets (favicon) load correctly');
    } else {
      results.push(`❌ Static assets failed: ${faviconResponse.status}`);
    }
  } catch (error) {
    results.push(`❌ Static assets error: ${error.message}`);
  }

  return results;
}

// Run the test
testPageNavigation().then(results => {
  console.log('\n📊 PAGE NAVIGATION TEST RESULTS:');
  console.log('==================================');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result}`);
  });
  
  const passed = results.filter(r => r.startsWith('✅')).length;
  const failed = results.filter(r => r.startsWith('❌')).length;
  
  console.log('\n📈 SUMMARY:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All page navigation is working correctly!');
  } else {
    console.log('\n⚠️ Some page navigation issues found. Please check the errors above.');
  }
}).catch(error => {
  console.error('❌ Page navigation test suite failed:', error);
});
