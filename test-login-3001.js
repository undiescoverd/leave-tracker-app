#!/usr/bin/env node

/**
 * Test Login Functionality
 * This script tests the login flow and dashboard access
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testApiEndpoint(endpoint, method = 'GET', body = null) {
  const url = `http://localhost:3001/api${endpoint}`;
  
  try {
    console.log(`\n🧪 Testing ${method} ${url}`);
    
    const curlCommand = body 
      ? `curl -X ${method} -H "Content-Type: application/json" -d '${JSON.stringify(body)}' "${url}" -w "\\n%{http_code}\\n" -s`
      : `curl -X ${method} "${url}" -w "\\n%{http_code}\\n" -s`;
    
    const { stdout } = await execAsync(curlCommand);
    const lines = stdout.trim().split('\n');
    const httpCode = lines.pop();
    const response = lines.join('\n');
    
    console.log(`📊 Status: ${httpCode}`);
    
    try {
      const parsed = JSON.parse(response);
      console.log(`📝 Response: ${JSON.stringify(parsed, null, 2)}`);
      return { status: parseInt(httpCode), data: parsed };
    } catch {
      console.log(`📝 Response: ${response}`);
      return { status: parseInt(httpCode), data: response };
    }
  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message);
    return { status: 500, error: error.message };
  }
}

async function testLogin() {
  console.log('🚀 Starting Login Flow Tests...');
  
  // Test 1: Check if server is running
  console.log('\n=== TEST 1: Server Health Check ===');
  await testApiEndpoint('/health');
  
  // Test 2: Get all users to see what accounts exist
  console.log('\n=== TEST 2: Available Users ===');
  const usersResult = await testApiEndpoint('/users');
  
  // Test 3: Test simple endpoint
  console.log('\n=== TEST 3: Test Simple Endpoint ===');
  await testApiEndpoint('/test-simple');
  
  // Test 4: Test session endpoint
  console.log('\n=== TEST 4: Session Check ===');
  await testApiEndpoint('/auth/session');
  
  console.log('\n✨ Login tests completed!');
}

// Run the tests
testLogin().catch(console.error);
