const fetch = require('node-fetch');

async function testAuth() {
  console.log('🔐 Testing authentication...\n');
  
  const testUser = {
    email: 'senay.taormina@tdhagency.com',
    password: 'Password123!'
  };
  
  try {
    console.log(`Testing login for: ${testUser.email}`);
    
    // Test the credentials endpoint
    const response = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: testUser.email,
        password: testUser.password,
        redirect: 'false',
        json: 'true'
      })
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`Response body: ${responseText}`);
    
    if (response.ok) {
      console.log('✅ Login API call successful');
    } else {
      console.log('❌ Login API call failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing auth:', error.message);
  }
  
  console.log('\n🎯 Auth test complete!');
}

testAuth();
