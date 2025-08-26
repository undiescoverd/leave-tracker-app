#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma';

async function getUserId() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: 'sup.dhanasunthorn@tdhagency.com'
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (user) {
      console.log('✅ Found user:', user);
      return user.id;
    } else {
      console.log('❌ User not found');
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

getUserId();
