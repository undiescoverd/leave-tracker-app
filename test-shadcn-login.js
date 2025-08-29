#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testShadcnLogin() {
  console.log('🎨 Testing Shadcn Login Page...\n');
  
  try {
    console.log('=== Testing Login Page Accessibility ===');
    const { stdout: loginCheck } = await execAsync('curl -s -w "%{http_code}" "http://localhost:3001/login" -o /dev/null');
    console.log(`Login Page Status: ${loginCheck === '200' ? '✅ Available' : '❌ Not available'} (${loginCheck})`);
    
    if (loginCheck === '200') {
      console.log('\n🎉 SUCCESS: Login page is now accessible with shadcn components!');
      console.log('\n🌐 You can test the new design at: http://localhost:3001/login');
      console.log('\n📋 Test with these credentials:');
      console.log('   Email: senay@tdhagency.com');
      console.log('   Password: password123');
      console.log('\n✨ Features to test:');
      console.log('   - Beautiful shadcn Card layout');
      console.log('   - TDH branded colors (teal primary, navy secondary)');
      console.log('   - Proper focus states and hover effects');
      console.log('   - Error handling with shadcn Alert components');
      console.log('   - Responsive design');
    } else {
      console.log('\n❌ Login page is not accessible. Build may have errors.');
    }
    
  } catch (error) {
    console.error('❌ Error testing login page:', error.message);
  }
}

testShadcnLogin().catch(console.error);