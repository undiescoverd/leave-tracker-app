#!/usr/bin/env tsx

// Check current user role
// Run with: npx tsx scripts/check-user-role.ts

import { prisma } from '../src/lib/prisma';

async function checkUserRole() {
  try {
    // Get all users and their roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log("👥 All users and their roles:");
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    // Check if we have admin users
    const adminUsers = users.filter(user => user.role === 'ADMIN');
    console.log(`\n👑 Admin users: ${adminUsers.length}`);
    adminUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });

    // Check if we have regular users
    const regularUsers = users.filter(user => user.role === 'USER');
    console.log(`\n👤 Regular users: ${regularUsers.length}`);
    regularUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });

  } catch (error) {
    console.error("Error checking user roles:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRole();
