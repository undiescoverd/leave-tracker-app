#!/usr/bin/env node

// Live TOIL Testing Script
// Tests the complete TOIL implementation

const BASE_URL = 'http://localhost:3000';

async function testToilImplementation() {
  console.log('🧪 Live TOIL Implementation Testing');
  console.log('=====================================\n');

  // Test 1: Health Check
  console.log('📋 Test 1: Health Check');
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Server is healthy:', healthData.status);
    console.log('✅ Database connected:', healthData.environment.hasDatabase);
    console.log('✅ Auth configured:', healthData.environment.hasAuth);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return;
  }

  console.log('\n📋 Test 2: Feature Flags Check');
  try {
    // Check if TOIL features are enabled by testing the UI
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();
    
    if (html.includes('TOIL') || html.includes('toil')) {
      console.log('✅ TOIL features detected in UI');
    } else {
      console.log('⚠️  TOIL features not visible in UI (may be disabled)');
    }
  } catch (error) {
    console.log('❌ UI check failed:', error.message);
  }

  console.log('\n📋 Test 3: API Endpoints Check');
  
  // Test TOIL admin API (should return 401 without auth)
  try {
    const toilResponse = await fetch(`${BASE_URL}/api/admin/toil`);
    if (toilResponse.status === 401) {
      console.log('✅ TOIL admin API requires authentication (correct)');
    } else if (toilResponse.status === 400) {
      console.log('✅ TOIL admin API exists but feature disabled');
    } else {
      console.log('⚠️  TOIL admin API status:', toilResponse.status);
    }
  } catch (error) {
    console.log('❌ TOIL admin API test failed:', error.message);
  }

  // Test users API (should return 401 without auth)
  try {
    const usersResponse = await fetch(`${BASE_URL}/api/users`);
    if (usersResponse.status === 401) {
      console.log('✅ Users API requires authentication (correct)');
    } else {
      console.log('⚠️  Users API status:', usersResponse.status);
    }
  } catch (error) {
    console.log('❌ Users API test failed:', error.message);
  }

  console.log('\n📋 Test 4: Environment Variables Check');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    console.log('✅ Environment loaded successfully');
    console.log('✅ Node environment:', data.environment.nodeEnv);
  } catch (error) {
    console.log('❌ Environment check failed:', error.message);
  }

  console.log('\n🎉 Live Testing Complete!');
  console.log('\n📋 Next Steps for Manual Testing:');
  console.log('1. Open http://localhost:3000 in your browser');
  console.log('2. Login as admin: senay.taormina@tdhagency.com');
  console.log('3. Navigate to /admin/toil to test TOIL management');
  console.log('4. Login as user: sup.dhanasunthorn@tdhagency.com');
  console.log('5. Check dashboard for TOIL balance display');
  console.log('6. Submit a TOIL leave request');
  console.log('\n🔧 If TOIL features are not visible:');
  console.log('- Check .env.local file has TOIL flags enabled');
  console.log('- Restart the server after changing environment variables');
}

testToilImplementation().catch(console.error);
