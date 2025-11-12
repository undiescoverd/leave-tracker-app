#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testLogin() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔐 Testing login credentials...\n');
    
    const email = 'ian@tdhagency.com';
    const testPasswords = [
      'Password123!',  // From seed file
      'password123!',  // Lowercase
      'Password123',   // Without exclamation
      'password',      // Simple
      'admin',         // Common
      '123456'         // Simple numbers
    ];
    
    const user = await prisma.user.findUnique({
      where: { email: email }
    });
    
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    
    console.log(`👤 User found: ${user.name} (${user.email})`);
    console.log(`🔐 Role: ${user.role}`);
    console.log(`📅 Created: ${user.createdAt.toISOString().split('T')[0]}\n`);
    
    console.log('🧪 Testing passwords...\n');
    
    for (const password of testPasswords) {
      try {
        const isValid = await bcrypt.compare(password, user.password);
        console.log(`Password: "${password}" - ${isValid ? '✅ VALID' : '❌ Invalid'}`);
        if (isValid) {
          console.log(`🎉 SUCCESS! Use this password: "${password}"`);
          break;
        }
      } catch (error) {
        console.log(`Password: "${password}" - ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n📋 Summary:');
    console.log('Email: ian@tdhagency.com');
    console.log('Name: Ian Vincent');
    console.log('Role: ADMIN');
    console.log('Default password from seed: Password123!');
    
  } catch (error) {
    console.error('❌ Error testing login:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();