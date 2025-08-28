#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testLogin() {
  console.log('🚀 Testing Login Flow...');
  
  // Test credentials from the database users
  const testCredentials = [
    { email: 'senay@tdhagency.com', password: 'password123' },
    { email: 'ian@tdhagency.com', password: 'password123' },
    { email: 'sup@tdhagency.com', password: 'password123' },
    { email: 'luis@tdhagency.com', password: 'password123' },
    { email: 'test@example.com', password: 'test123' },
  ];
  
  for (const creds of testCredentials) {
    console.log(`\n🔐 Testing login for: ${creds.email}`);
    
    try {
      // Test using the actual NextAuth endpoint
      const curlCommand = `curl -X POST "http://localhost:3001/api/auth/callback/credentials" \\
        -H "Content-Type: application/x-www-form-urlencoded" \\
        -d "email=${encodeURIComponent(creds.email)}&password=${encodeURIComponent(creds.password)}&redirect=false" \\
        -w "\\n%{http_code}\\n" -s -c cookies.txt`;
      
      const { stdout } = await execAsync(curlCommand);
      const lines = stdout.trim().split('\n');
      const httpCode = lines.pop();
      const response = lines.join('\n');
      
      console.log(`📊 Status: ${httpCode}`);
      console.log(`📝 Response: ${response}`);
      
      if (parseInt(httpCode) === 200 || parseInt(httpCode) === 302) {
        console.log(`✅ Login appears successful for ${creds.email}`);
        
        // Test accessing dashboard with session
        console.log('🏠 Testing dashboard access...');
        const dashboardCommand = `curl "http://localhost:3001/dashboard" -b cookies.txt -w "\\n%{http_code}\\n" -s`;
        const { stdout: dashResult } = await execAsync(dashboardCommand);
        const dashLines = dashResult.trim().split('\n');
        const dashCode = dashLines.pop();
        console.log(`📊 Dashboard Status: ${dashCode}`);
        
      } else {
        console.log(`❌ Login failed for ${creds.email}`);
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${creds.email}:`, error.message);
    }
  }
  
  // Clean up cookies file
  await execAsync('rm -f cookies.txt').catch(() => {});
}

testLogin().catch(console.error);