const fetch = require('node-fetch');

async function testAdminAPI() {
  console.log('🔍 Testing Admin API endpoints...\n');
  
  try {
    // Test the GET endpoint for leave requests
    console.log('1. Testing GET /api/leave/request...');
    const response = await fetch('http://localhost:3000/api/leave/request');
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ API call successful');
      console.log(`   📊 Found ${data.data?.leaveRequests?.length || data.leaveRequests?.length || 0} leave requests`);
    } else {
      console.log('   ❌ API call failed');
      const error = await response.text();
      console.log(`   Error: ${error}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
  
  console.log('\n🎯 Admin API test complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Make sure you\'re logged in as an admin user');
  console.log('2. Try accessing: http://localhost:3000/admin/pending-requests');
  console.log('3. The page should now load without the undefined error');
}

testAdminAPI().catch(console.error);
