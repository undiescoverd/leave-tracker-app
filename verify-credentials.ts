#!/usr/bin/env tsx
/**
 * Verify credentials work by checking directly with bcrypt
 */

import { prisma } from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function verifyCredentials() {
  console.log('🔍 Verifying credentials...\n');
  
  const testUsers = [
    { email: 'sup@tdhagency.com', password: 'Password123!' },
    { email: 'ian@tdhagency.com', password: 'Password123!' },
  ];
  
  for (const testUser of testUsers) {
    console.log(`Testing: ${testUser.email}`);
    
    try {
      const user = await prisma.user.findUnique({
        where: { email: testUser.email }
      });
      
      if (!user) {
        console.log('  ❌ User not found in database\n');
        continue;
      }
      
      console.log(`  ✅ User found: ${user.name} (${user.role})`);
      
      const isValid = await bcrypt.compare(testUser.password, user.password);
      
      if (isValid) {
        console.log(`  ✅ Password is CORRECT!\n`);
      } else {
        console.log(`  ❌ Password is WRONG!\n`);
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }
  
  await prisma.$disconnect();
}

verifyCredentials().catch(console.error);

