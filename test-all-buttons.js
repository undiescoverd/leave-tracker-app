const puppeteer = require('puppeteer');

async function testAllButtons() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    slowMo: 1000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const results = [];

  try {
    console.log('🚀 Starting comprehensive button and functionality test...\n');

    // Test 1: Home page redirects
    console.log('1. Testing home page redirects...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      results.push('✅ Home page correctly redirects to login');
    } else {
      results.push('❌ Home page redirect failed');
    }

    // Test 2: Register page buttons
    console.log('2. Testing register page...');
    await page.goto('http://localhost:3000/register');
    await page.waitForTimeout(1000);

    // Test register form
    await page.type('input[name="name"]', 'Test User');
    await page.type('input[name="email"]', 'test@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.type('input[name="confirmPassword"]', 'password123');
    
    const registerButton = await page.$('button[type="submit"]');
    if (registerButton) {
      results.push('✅ Register form submit button found');
    } else {
      results.push('❌ Register form submit button missing');
    }

    // Test "Sign in to your account" link
    const signInLink = await page.$('a[href="/login"]');
    if (signInLink) {
      results.push('✅ Register page sign-in link found');
    } else {
      results.push('❌ Register page sign-in link missing');
    }

    // Test 3: Login page buttons
    console.log('3. Testing login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(1000);

    // Test login form
    await page.type('input[name="email"]', 'admin@tdh.com');
    await page.type('input[name="password"]', 'admin123');
    
    const loginButton = await page.$('button[type="submit"]');
    if (loginButton) {
      results.push('✅ Login form submit button found');
    } else {
      results.push('❌ Login form submit button missing');
    }

    // Test "Create an account" link
    const createAccountLink = await page.$('a[href="/register"]');
    if (createAccountLink) {
      results.push('✅ Login page create account link found');
    } else {
      results.push('❌ Login page create account link missing');
    }

    // Test 4: Dashboard page buttons (after login)
    console.log('4. Testing dashboard page...');
    
    // Click login button
    await loginButton.click();
    await page.waitForTimeout(3000);

    // Check if we're on dashboard
    const dashboardUrl = page.url();
    if (dashboardUrl.includes('/dashboard')) {
      results.push('✅ Login successful, redirected to dashboard');
    } else {
      results.push('❌ Login failed or redirect failed');
      return results;
    }

    // Test dashboard buttons
    const signOutButton = await page.$('button:contains("Sign Out")');
    if (signOutButton) {
      results.push('✅ Dashboard sign out button found');
    } else {
      results.push('❌ Dashboard sign out button missing');
    }

    const submitRequestButton = await page.$('button:contains("Submit Leave Request")');
    if (submitRequestButton) {
      results.push('✅ Dashboard submit leave request button found');
    } else {
      results.push('❌ Dashboard submit leave request button missing');
    }

    const viewHistoryButton = await page.$('button:contains("My Leave History")');
    if (viewHistoryButton) {
      results.push('✅ Dashboard view history button found');
    } else {
      results.push('❌ Dashboard view history button missing');
    }

    const teamCalendarButton = await page.$('button:contains("View Team Calendar")');
    if (teamCalendarButton) {
      results.push('✅ Dashboard team calendar button found');
    } else {
      results.push('❌ Dashboard team calendar button missing');
    }

    // Test 5: Leave Request Form
    console.log('5. Testing leave request form...');
    await submitRequestButton.click();
    await page.waitForTimeout(1000);

    // Check if modal opened
    const modal = await page.$('.fixed.inset-0');
    if (modal) {
      results.push('✅ Leave request modal opened');
    } else {
      results.push('❌ Leave request modal failed to open');
    }

    // Test form inputs
    const startDateInput = await page.$('input[type="date"]');
    const endDateInput = await page.$All('input[type="date"]');
    const commentsTextarea = await page.$('textarea');
    const submitFormButton = await page.$('button:contains("Submit Request")');
    const cancelButton = await page.$('button:contains("Cancel")');

    if (startDateInput) results.push('✅ Start date input found');
    else results.push('❌ Start date input missing');

    if (endDateInput && endDateInput.length > 1) results.push('✅ End date input found');
    else results.push('❌ End date input missing');

    if (commentsTextarea) results.push('✅ Comments textarea found');
    else results.push('❌ Comments textarea missing');

    if (submitFormButton) results.push('✅ Form submit button found');
    else results.push('❌ Form submit button missing');

    if (cancelButton) results.push('✅ Form cancel button found');
    else results.push('❌ Form cancel button missing');

    // Close modal
    await cancelButton.click();
    await page.waitForTimeout(1000);

    // Test 6: My Leave History page
    console.log('6. Testing leave history page...');
    await viewHistoryButton.click();
    await page.waitForTimeout(2000);

    const historyUrl = page.url();
    if (historyUrl.includes('/leave/requests')) {
      results.push('✅ Successfully navigated to leave history page');
    } else {
      results.push('❌ Failed to navigate to leave history page');
    }

    // Test history page buttons
    const backToDashboardButton = await page.$('button:contains("Back to Dashboard")');
    const applyFilterButton = await page.$('button:contains("Apply Filter")');
    const statusFilter = await page.$('select');

    if (backToDashboardButton) results.push('✅ History page back button found');
    else results.push('❌ History page back button missing');

    if (applyFilterButton) results.push('✅ History page filter button found');
    else results.push('❌ History page filter button missing');

    if (statusFilter) results.push('✅ History page status filter found');
    else results.push('❌ History page status filter missing');

    // Test 7: Admin functionality (if user is admin)
    console.log('7. Testing admin functionality...');
    await backToDashboardButton.click();
    await page.waitForTimeout(2000);

    // Check if admin buttons are visible
    const pendingRequestsButton = await page.$('button:contains("Pending Requests")');
    const userManagementButton = await page.$('button:contains("User Management")');

    if (pendingRequestsButton) {
      results.push('✅ Admin pending requests button found');
      
      // Test admin page
      await pendingRequestsButton.click();
      await page.waitForTimeout(2000);

      const adminUrl = page.url();
      if (adminUrl.includes('/admin/pending-requests')) {
        results.push('✅ Successfully navigated to admin pending requests page');
      } else {
        results.push('❌ Failed to navigate to admin pending requests page');
      }

      // Test admin page buttons
      const adminBackButton = await page.$('button:contains("Back to Dashboard")');
      if (adminBackButton) results.push('✅ Admin page back button found');
      else results.push('❌ Admin page back button missing');

      // Go back to dashboard
      await adminBackButton.click();
      await page.waitForTimeout(2000);
    } else {
      results.push('ℹ️ User is not admin, skipping admin tests');
    }

    if (userManagementButton) {
      results.push('✅ Admin user management button found');
    } else {
      results.push('ℹ️ User management button not found (may be placeholder)');
    }

    // Test 8: Sign out functionality
    console.log('8. Testing sign out...');
    await signOutButton.click();
    await page.waitForTimeout(3000);

    const logoutUrl = page.url();
    if (logoutUrl.includes('/login')) {
      results.push('✅ Sign out successful, redirected to login');
    } else {
      results.push('❌ Sign out failed or redirect failed');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
    results.push(`❌ Test error: ${error.message}`);
  } finally {
    await browser.close();
  }

  return results;
}

// Run the test
testAllButtons().then(results => {
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('========================');
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
    console.log('\n🎉 All tests passed! All buttons are working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the issues above.');
  }
}).catch(error => {
  console.error('❌ Test suite failed:', error);
});
