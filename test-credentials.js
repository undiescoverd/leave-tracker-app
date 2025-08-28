#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testCredentials() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing user credentials in database...');
    
    const testEmail = 'senay@tdhagency.com';
    const testPassword = 'password123';
    
    const user = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    
    if (!user) {
      console.log(`❌ User ${testEmail} not found`);
      return;
    }
    
    console.log(`✅ User found: ${user.name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.createdAt}`);
    
    // Test password
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log(`🔑 Password "${testPassword}" is ${isValid ? 'VALID ✅' : 'INVALID ❌'}`);
    
    if (isValid) {
      console.log('\\n🎯 Authentication should work for this user');
    } else {
      console.log('\\n❌ Password mismatch - this explains login failures');
    }
    
  } catch (error) {
    console.error('❌ Error testing credentials:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCredentials();