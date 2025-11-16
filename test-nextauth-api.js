// Test NextAuth API endpoint
const fetch = require('node-fetch');

async function testNextAuthAPI() {
  console.log('🧪 Testing NextAuth API endpoint...\n');
  
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const testUrl = `${baseUrl}/api/auth/providers`;
  
  try {
    console.log(`📡 Testing: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Status Text: ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ NextAuth API is responding');
      console.log('🔑 Available providers:', Object.keys(data));
      return true;
    } else {
      console.log('❌ NextAuth API error');
      const text = await response.text();
      console.log('📄 Response:', text);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Suggestion: Make sure your development server is running (npm run dev)');
    }
    
    return false;
  }
}

// Test session endpoint
async function testSessionEndpoint() {
  console.log('\n🔐 Testing session endpoint...');
  
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const sessionUrl = `${baseUrl}/api/auth/session`;
  
  try {
    const response = await fetch(sessionUrl);
    console.log(`📊 Session Status: ${response.status}`);
    
    if (response.ok) {
      const session = await response.json();
      console.log('✅ Session endpoint working');
      console.log('👤 Session data:', JSON.stringify(session, null, 2));
    } else {
      console.log('❌ Session endpoint error');
    }
    
  } catch (error) {
    console.log('❌ Session test error:', error.message);
  }
}

// Run tests
(async () => {
  const apiWorking = await testNextAuthAPI();
  if (apiWorking) {
    await testSessionEndpoint();
  }
  
  console.log('\n🔧 If issues persist, check:');
  console.log('1. Development server is running (npm run dev)');
  console.log('2. Port 3000 is not blocked');
  console.log('3. NextAuth version compatibility (currently using beta.29)');
  console.log('4. Browser console for more detailed errors');
})();