const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if users exist
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });
      
      console.log('\n👥 Users in database:');
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
      });
    } else {
      console.log('❌ No users found in database');
      console.log('Running seed script...');
      
      // Run seed script
      const { execSync } = require('child_process');
      execSync('npm run db:seed', { stdio: 'inherit' });
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    
    if (error.message.includes('P1001')) {
      console.log('\n💡 Database connection issue detected.');
      console.log('Please check your .env file and database credentials.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
