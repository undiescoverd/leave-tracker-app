#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking users in database...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
    
    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('💡 Run: npx prisma db seed');
    } else {
      console.log(`✅ Found ${users.length} users:\n`);
      users.forEach(user => {
        console.log(`📧 Email: ${user.email}`);
        console.log(`👤 Name: ${user.name}`);
        console.log(`🔐 Role: ${user.role}`);
        console.log(`📅 Created: ${user.createdAt.toISOString().split('T')[0]}`);
        console.log('---');
      });
    }
    
    // Check if ian@tdhagency.com exists specifically
    const ianUser = await prisma.user.findUnique({
      where: { email: 'ian@tdhagency.com' }
    });
    
    if (ianUser) {
      console.log('\n✅ Ian Vincent user found!');
      console.log(`   Email: ${ianUser.email}`);
      console.log(`   Name: ${ianUser.name}`);
      console.log(`   Role: ${ianUser.role}`);
    } else {
      console.log('\n❌ Ian Vincent user NOT found!');
      console.log('💡 The email should be: ian@tdhagency.com');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
