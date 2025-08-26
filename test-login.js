const fetch = require('node-fetch');

async function testLogin() {
  console.log('🔐 Testing login functionality...\n');
  
  const testUsers = [
    { email: 'senay.taormina@tdhagency.com', name: 'Senay Taormina', role: 'ADMIN' },
    { email: 'ian.vincent@tdhagency.com', name: 'Ian Vincent', role: 'ADMIN' },
    { email: 'sup.dhanasunthorn@tdhagency.com', name: 'Sup Dhanasunthorn', role: 'USER' },
    { email: 'luis.drake@tdhagency.com', name: 'Luis Drake', role: 'USER' }
  ];

  for (const user of testUsers) {
    try {
      console.log(`Testing login for: ${user.name} (${user.email})`);
      
      const response = await fetch('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email,
          password: 'Password123!',
          redirect: 'false',
          json: 'true'
        })
      });

      if (response.ok) {
        console.log(`✅ Login successful for ${user.name}`);
      } else {
        console.log(`❌ Login failed for ${user.name}`);
      }
    } catch (error) {
      console.log(`❌ Error testing ${user.name}: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Login test complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Open your browser to: http://localhost:3000');
  console.log('2. You should be redirected to: http://localhost:3000/login');
  console.log('3. Use any of the test users above with password: Password123!');
  console.log('4. After login, you should be redirected to the dashboard');
  console.log('5. Click "My Leave History" to test the fixed functionality');
}

testLogin().catch(console.error);
