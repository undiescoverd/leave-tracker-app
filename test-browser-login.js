#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testBrowserLogin() {
  console.log('🖥️ Testing Browser-Based Login...');
  
  try {
    // First, clear any existing session cookies
    console.log('\n=== Step 1: Clearing cookies ===');
    await execAsync('rm -f cookies.txt').catch(() => {});
    
    // Test 1: Get the login page and save cookies
    console.log('\n=== Step 2: Get Login Page ===');
    const { stdout: loginPage } = await execAsync('curl -c cookies.txt -b cookies.txt "http://localhost:3001/login" -s');
    console.log('✅ Login page accessed');
    
    // Test 2: Check initial session
    console.log('\n=== Step 3: Check Initial Session ===');
    const { stdout: initialSession } = await execAsync('curl -b cookies.txt "http://localhost:3001/api/auth/session" -s');
    console.log('📊 Initial Session:', JSON.parse(initialSession || 'null'));
    
    // Test 3: Get CSRF token
    console.log('\n=== Step 4: Get CSRF Token ===');
    const { stdout: csrfResponse } = await execAsync('curl -b cookies.txt "http://localhost:3001/api/auth/csrf" -s');
    console.log('🔒 CSRF Response:', JSON.parse(csrfResponse));
    const csrfToken = JSON.parse(csrfResponse).csrfToken;
    
    // Test 4: Perform login using the NextAuth.js signin endpoint
    console.log('\n=== Step 5: Attempt Login via NextAuth ===');
    
    // Use the NextAuth callback endpoint with proper form encoding
    const loginData = `email=senay%40tdhagency.com&password=password123&csrfToken=${encodeURIComponent(csrfToken)}&callbackUrl=%2Fdashboard&redirect=false`;
    
    const loginCommand = `curl -X POST "http://localhost:3001/api/auth/callback/credentials" \\
      -H "Content-Type: application/x-www-form-urlencoded" \\
      -H "Referer: http://localhost:3001/login" \\
      -b cookies.txt -c cookies.txt \\
      -d "${loginData}" \\
      -w "\\n%{http_code}\\n" -s`;
      
    console.log('📤 Sending login request...');
    const { stdout: loginResult } = await execAsync(loginCommand);
    const lines = loginResult.trim().split('\n');
    const httpCode = lines.pop();
    const response = lines.join('\n');
    
    console.log(`📊 Login HTTP Code: ${httpCode}`);
    console.log(`📝 Login Response: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);
    
    // Wait a moment for the session to be created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 5: Check session after login
    console.log('\n=== Step 6: Check Session After Login ===');
    const { stdout: postLoginSession } = await execAsync('curl -b cookies.txt "http://localhost:3001/api/auth/session" -s');
    const sessionData = JSON.parse(postLoginSession || 'null');
    console.log('📊 Post-Login Session:', sessionData);
    
    if (sessionData && sessionData.user) {
      console.log('✅ SUCCESS: User is authenticated!');
      console.log(`   User: ${sessionData.user.name} (${sessionData.user.email})`);
      console.log(`   Role: ${sessionData.user.role}`);
      
      // Test 6: Access dashboard
      console.log('\n=== Step 7: Test Dashboard Access ===');
      const { stdout: dashboardResult } = await execAsync('curl -b cookies.txt "http://localhost:3001/dashboard" -w "\\n%{http_code}\\n" -s');
      const dashLines = dashboardResult.trim().split('\n');
      const dashCode = dashLines.pop();
      console.log(`📊 Dashboard Status: ${dashCode}`);
      
      if (dashCode === '200') {
        console.log('✅ Dashboard accessible!');
      } else {
        console.log('❌ Dashboard not accessible');
      }
    } else {
      console.log('❌ FAILED: Session not created');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Cleanup
    await execAsync('rm -f cookies.txt').catch(() => {});
  }
}

testBrowserLogin().catch(console.error);