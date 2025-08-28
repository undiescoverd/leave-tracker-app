#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function resetPasswords() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Resetting user passwords to known values...');
    
    // Define users and their new passwords
    const userUpdates = [
      { email: 'senay@tdhagency.com', password: 'password123' },
      { email: 'ian@tdhagency.com', password: 'password123' },
      { email: 'sup@tdhagency.com', password: 'password123' },
      { email: 'luis@tdhagency.com', password: 'password123' },
      { email: 'test@example.com', password: 'test123' },
    ];
    
    for (const userData of userUpdates) {
      console.log(`\\n🔑 Updating password for ${userData.email}...`);
      
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      
      if (!user) {
        console.log(`⚠️  User ${userData.email} not found, skipping...`);
        continue;
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Update the user's password
      await prisma.user.update({
        where: { email: userData.email },
        data: { password: hashedPassword }
      });
      
      console.log(`✅ Password updated for ${userData.email}`);
      console.log(`   New password: ${userData.password}`);
      
      // Test the new password immediately
      const isValid = await bcrypt.compare(userData.password, hashedPassword);
      console.log(`   Password validation: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }
    
    console.log('\\n🎉 Password reset complete!');
    console.log('\\n📝 Login credentials:');
    console.log('   Admin users:');
    console.log('   - senay@tdhagency.com / password123');
    console.log('   - ian@tdhagency.com / password123');
    console.log('   Regular users:');
    console.log('   - sup@tdhagency.com / password123');
    console.log('   - luis@tdhagency.com / password123');
    console.log('   - test@example.com / test123');
    
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPasswords();