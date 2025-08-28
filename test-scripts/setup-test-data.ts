import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function setupTestData() {
  try {
    console.log('🔧 Setting up test data...');

    // Create test admin user
    const hashedPassword = await hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        password: hashedPassword,
        role: 'ADMIN'
      },
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Test Admin',
        role: 'ADMIN'
      }
    });

    // Create test regular user
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        password: await hash('test123', 10),
        name: 'Test User',
        role: 'USER'
      }
    });

    console.log('✅ Test data setup complete');
    console.log('Admin User ID:', adminUser.id);
    console.log('Test User ID:', testUser.id);

    return {
      adminId: adminUser.id,
      testUserId: testUser.id
    };
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData().catch(console.error);
