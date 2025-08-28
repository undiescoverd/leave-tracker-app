#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testWebLogin() {
  console.log('🌐 Testing Web Login Flow...');
  
  try {
    // Test 1: Get the login page to get cookies and CSRF
    console.log('\n=== TEST 1: Getting Login Page ===');
    const { stdout: loginPage } = await execAsync('curl -c cookies.txt -b cookies.txt "http://localhost:3001/login" -s');
    console.log('✅ Login page loaded');
    
    // Test 2: Get session endpoint to see current state
    console.log('\n=== TEST 2: Check Session State ===');
    const { stdout: sessionCheck } = await execAsync('curl -b cookies.txt "http://localhost:3001/api/auth/session" -s');
    console.log('📊 Session:', JSON.parse(sessionCheck || 'null'));
    
    // Test 3: Get CSRF token
    console.log('\n=== TEST 3: Get CSRF Token ===');
    const { stdout: csrfToken } = await execAsync('curl -b cookies.txt "http://localhost:3001/api/auth/csrf" -s');
    console.log('🔒 CSRF:', JSON.parse(csrfToken));
    
    // Test 4: Try login with proper form data and CSRF
    console.log('\n=== TEST 4: Attempt Login with CSRF ===');
    const csrf = JSON.parse(csrfToken).csrfToken;
    
    const loginCommand = `curl -X POST "http://localhost:3001/api/auth/callback/credentials" \\
      -H "Content-Type: application/x-www-form-urlencoded" \\
      -b cookies.txt -c cookies.txt \\
      -d "email=senay%40tdhagency.com&password=password123&csrfToken=${csrf}&callbackUrl=%2Fdashboard&redirect=false" \\
      -w "\\n%{http_code}\\n" -s`;
    
    const { stdout: loginResult } = await execAsync(loginCommand);
    const lines = loginResult.trim().split('\n');
    const httpCode = lines.pop();
    const response = lines.join('\n');
    
    console.log(`📊 Login Status: ${httpCode}`);
    console.log(`📝 Response: ${response}`);
    
    // Test 5: Check session after login
    console.log('\n=== TEST 5: Check Session After Login ===');
    const { stdout: newSession } = await execAsync('curl -b cookies.txt "http://localhost:3001/api/auth/session" -s');
    console.log('📊 New Session:', JSON.parse(newSession || 'null'));
    
    // Test 6: Try accessing dashboard
    console.log('\n=== TEST 6: Access Dashboard ===');
    const { stdout: dashboardResult } = await execAsync('curl -b cookies.txt "http://localhost:3001/dashboard" -w "\\n%{http_code}\\n" -s');
    const dashLines = dashboardResult.trim().split('\n');
    const dashCode = dashLines.pop();
    console.log(`📊 Dashboard Status: ${dashCode}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Cleanup
    await execAsync('rm -f cookies.txt').catch(() => {});
  }
}

testWebLogin().catch(console.error);